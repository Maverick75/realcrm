const express = require('express');
const Customer = require('../models/Customer');
const Interaction = require('../models/Interaction');
const Requirement = require('../models/Requirement');
const auth = require('../middleware/auth');
const { normalizeRole } = require('../middleware/roles');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const role = normalizeRole(req.user);
    const filter =
      role === 'admin'
        ? {}
        : {
            $or: [{ owner: req.user._id }, { assignedAgent: req.user._id }],
          };
    const customers = await Customer.find(filter)
      .populate('owner', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch customers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('assignedAgent', 'name email');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const role = normalizeRole(req.user);
    const allowed =
      role === 'admin' ||
      String(customer.owner._id) === String(req.user._id) ||
      String(customer.assignedAgent?._id || '') === String(req.user._id);
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch customer' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, status, notes } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const customer = await Customer.create({
      name,
      email,
      phone,
      status,
      notes,
      owner: req.user._id,
    });

    const populated = await customer.populate([
      { path: 'owner', select: 'name email' },
      { path: 'assignedAgent', select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create customer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const role = normalizeRole(req.user);
    if (role !== 'admin' && String(customer.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fields = ['name', 'email', 'phone', 'status', 'notes', 'assignedAgent'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    await customer.save();
    const populated = await customer.populate([
      { path: 'owner', select: 'name email' },
      { path: 'assignedAgent', select: 'name email' },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update customer' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    if (normalizeRole(req.user) !== 'admin' && String(customer.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Interaction.deleteMany({ customer: customer._id });
    await Requirement.deleteMany({ customer: customer._id });
    await customer.deleteOne();
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete customer' });
  }
});

module.exports = router;
