const express = require('express');
const Interaction = require('../models/Interaction');
const Customer = require('../models/Customer');
const Requirement = require('../models/Requirement');
const auth = require('../middleware/auth');
const { normalizeRole } = require('../middleware/roles');

const router = express.Router();

const ALLOWED_TYPES = ['Call', 'Email', 'Meeting', 'FollowUp', 'SiteVisit', 'WhatsApp'];

router.use(auth);

async function canAccessCustomer(user, customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) return { ok: false, status: 404, message: 'Customer not found' };

  if (normalizeRole(user) === 'admin') {
    return { ok: true, customer };
  }
  if (String(customer.owner) === String(user._id)) {
    return { ok: true, customer };
  }
  if (String(customer.assignedAgent || '') === String(user._id)) {
    return { ok: true, customer };
  }

  const linked = await Requirement.exists({
    customer: customerId,
    $or: [
      { createdBy: user._id },
      { leadGenerator: user._id },
      { assignedAgent: user._id },
    ],
  });
  if (linked) return { ok: true, customer };

  return { ok: false, status: 403, message: 'Not authorized' };
}

router.get('/:customerId', async (req, res) => {
  try {
    const access = await canAccessCustomer(req.user, req.params.customerId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const filter = { customer: req.params.customerId };
    if (req.query.requirement) {
      filter.requirement = req.query.requirement;
    }

    const interactions = await Interaction.find(filter)
      .populate('createdBy', 'name')
      .populate('requirement', 'status listingType')
      .sort({ date: -1 });
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch interactions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer, type, notes, date, requirement, nextFollowUpAt } = req.body;
    if (!customer || !type) {
      return res.status(400).json({ message: 'Customer and type are required' });
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        message: `type must be one of: ${ALLOWED_TYPES.join(', ')}`,
      });
    }

    const access = await canAccessCustomer(req.user, customer);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    if (requirement) {
      const reqDoc = await Requirement.findById(requirement);
      if (!reqDoc || String(reqDoc.customer) !== String(customer)) {
        return res.status(400).json({ message: 'requirement does not belong to this customer' });
      }
      if (nextFollowUpAt) {
        reqDoc.nextFollowUpAt = nextFollowUpAt;
        await reqDoc.save();
      }
    }

    const interaction = await Interaction.create({
      customer,
      requirement: requirement || null,
      type,
      notes: notes || '',
      date: date || Date.now(),
      nextFollowUpAt: nextFollowUpAt || null,
      createdBy: req.user._id,
    });

    const populated = await Interaction.findById(interaction._id)
      .populate('createdBy', 'name')
      .populate('requirement', 'status listingType');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create interaction' });
  }
});

module.exports = router;
