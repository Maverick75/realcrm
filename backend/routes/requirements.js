const express = require('express');
const Requirement = require('../models/Requirement');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const { requireRole, normalizeRole } = require('../middleware/roles');
const { matchAgentsForRequirement } = require('../services/matchEngine');

const router = express.Router();

router.use(auth);

function populateRequirement(query) {
  return query
    .populate('customer', 'name phone email status notes')
    .populate('preferredZones', 'name city slug')
    .populate('assignedAgent', 'name email')
    .populate('createdBy', 'name email')
    .populate('leadGenerator', 'name email');
}

function canAccessRequirement(user, requirement) {
  if (normalizeRole(user) === 'admin') return true;
  const uid = String(user._id);
  const ids = [
    requirement.createdBy?._id || requirement.createdBy,
    requirement.leadGenerator?._id || requirement.leadGenerator,
    requirement.assignedAgent?._id || requirement.assignedAgent,
  ]
    .filter(Boolean)
    .map(String);
  return ids.includes(uid);
}

function canEditRequirement(user, requirement) {
  if (normalizeRole(user) === 'admin') return true;
  const uid = String(user._id);
  const ids = [
    requirement.createdBy?._id || requirement.createdBy,
    requirement.leadGenerator?._id || requirement.leadGenerator,
  ]
    .filter(Boolean)
    .map(String);
  return ids.includes(uid);
}

function clampPercent(value, fallback) {
  if (value === '' || value == null) return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

router.get('/', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const filter =
      normalizeRole(req.user) === 'admin'
        ? {}
        : {
            $or: [
              { createdBy: req.user._id },
              { leadGenerator: req.user._id },
              { assignedAgent: req.user._id },
            ],
          };

    const requirements = await populateRequirement(
      Requirement.find(filter).sort({ createdAt: -1 })
    );
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch requirements' });
  }
});

router.post('/', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const {
      customer,
      customerPayload,
      listingType,
      propertyType,
      bhkMin,
      bhkMax,
      budgetMin,
      budgetMax,
      preferredZones,
      notes,
      commissionPercent,
      leadGenSharePercent,
      commissionNotes,
      nextFollowUpAt,
      buyerHappyNotes,
    } = req.body;

    if (!listingType) {
      return res.status(400).json({ message: 'listingType is required' });
    }
    if (!['Sale', 'Rent', 'Lease'].includes(listingType)) {
      return res.status(400).json({ message: 'listingType must be Sale, Rent, or Lease' });
    }

    let customerId = customer;
    if (!customerId && customerPayload?.name) {
      const created = await Customer.create({
        name: customerPayload.name,
        email: customerPayload.email,
        phone: customerPayload.phone,
        notes: customerPayload.notes,
        owner: req.user._id,
        status: 'Lead',
      });
      customerId = created._id;
    }
    if (!customerId) {
      return res.status(400).json({ message: 'customer or customerPayload is required' });
    }

    const requirement = await Requirement.create({
      customer: customerId,
      createdBy: req.user._id,
      leadGenerator: req.user._id,
      listingType,
      propertyType: propertyType || 'Any',
      bhkMin: bhkMin != null && bhkMin !== '' ? Number(bhkMin) : null,
      bhkMax: bhkMax != null && bhkMax !== '' ? Number(bhkMax) : null,
      budgetMin: budgetMin != null && budgetMin !== '' ? Number(budgetMin) : 0,
      budgetMax: budgetMax != null && budgetMax !== '' ? Number(budgetMax) : null,
      preferredZones: preferredZones || [],
      notes,
      commissionPercent: clampPercent(commissionPercent, 0),
      leadGenSharePercent: clampPercent(leadGenSharePercent, 50),
      commissionNotes: commissionNotes || '',
      nextFollowUpAt: nextFollowUpAt || null,
      buyerHappyNotes: buyerHappyNotes || '',
    });

    const populated = await populateRequirement(Requirement.findById(requirement._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create requirement' });
  }
});

router.put('/:id', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (!canEditRequirement(req.user, requirement)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fields = [
      'listingType',
      'propertyType',
      'bhkMin',
      'bhkMax',
      'budgetMin',
      'budgetMax',
      'preferredZones',
      'notes',
      'status',
      'commissionPercent',
      'leadGenSharePercent',
      'commissionNotes',
      'nextFollowUpAt',
      'buyerHappyNotes',
    ];
    fields.forEach((field) => {
      if (req.body[field] === undefined) return;
      if (['bhkMin', 'bhkMax', 'budgetMin', 'budgetMax'].includes(field)) {
        requirement[field] =
          req.body[field] === '' || req.body[field] == null
            ? field === 'budgetMin'
              ? 0
              : null
            : Number(req.body[field]);
      } else if (['commissionPercent', 'leadGenSharePercent'].includes(field)) {
        requirement[field] = clampPercent(req.body[field], requirement[field]);
      } else if (field === 'nextFollowUpAt') {
        requirement.nextFollowUpAt = req.body.nextFollowUpAt || null;
      } else {
        requirement[field] = req.body[field];
      }
    });

    await requirement.save();
    const populated = await populateRequirement(Requirement.findById(requirement._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update requirement' });
  }
});

router.get('/:id/matches', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id).populate(
      'preferredZones',
      'name city slug'
    );
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (!canAccessRequirement(req.user, requirement)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const matches = await matchAgentsForRequirement(requirement);
    if (matches.length && requirement.status === 'Open') {
      requirement.status = 'Matched';
      await requirement.save();
    }
    const populated = await populateRequirement(Requirement.findById(requirement._id));
    res.json({ requirement: populated, matches });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to match agents' });
  }
});

router.get('/:id', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const requirement = await populateRequirement(Requirement.findById(req.params.id));
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

    if (!canAccessRequirement(req.user, requirement)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(requirement);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch requirement' });
  }
});

router.post('/:id/assign', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ message: 'agentId is required' });

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    if (!canAccessRequirement(req.user, requirement)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    requirement.assignedAgent = agentId;
    requirement.status = 'Assigned';
    await requirement.save();

    await Customer.findByIdAndUpdate(requirement.customer, {
      assignedAgent: agentId,
      status: 'Contacted',
    });

    const populated = await populateRequirement(Requirement.findById(requirement._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to assign agent' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
    await requirement.deleteOne();
    res.json({ message: 'Requirement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete requirement' });
  }
});

module.exports = router;
