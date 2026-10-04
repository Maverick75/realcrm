const express = require('express');
const mongoose = require('mongoose');
const AgentReview = require('../models/AgentReview');
const AgentProfile = require('../models/AgentProfile');
const Requirement = require('../models/Requirement');
const auth = require('../middleware/auth');
const { requireRole, normalizeRole } = require('../middleware/roles');

const router = express.Router({ mergeParams: true });

router.use(auth);

async function recomputeAgentRating(agentId) {
  const oid = new mongoose.Types.ObjectId(String(agentId));
  const stats = await AgentReview.aggregate([
    { $match: { agent: oid } },
    {
      $group: {
        _id: '$agent',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const avg = stats[0] ? Math.round(stats[0].ratingAvg * 10) / 10 : 0;
  const count = stats[0]?.ratingCount || 0;

  let profile = await AgentProfile.findOne({ user: agentId });
  if (!profile) {
    profile = await AgentProfile.create({ user: agentId });
  }
  profile.ratingAvg = avg;
  profile.ratingCount = count;
  await profile.save();
  return { ratingAvg: avg, ratingCount: count };
}

async function canReviewAgent(user, agentId, requirementId) {
  if (normalizeRole(user) === 'admin') return true;
  if (!requirementId) return false;

  const requirement = await Requirement.findById(requirementId);
  if (!requirement) return false;
  if (String(requirement.assignedAgent || '') !== String(agentId)) return false;

  const uid = String(user._id);
  return (
    String(requirement.createdBy) === uid ||
    String(requirement.leadGenerator || '') === uid
  );
}

router.get('/', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const agentId = req.params.id;
    const reviews = await AgentReview.find({ agent: agentId })
      .populate('author', 'name email')
      .populate('requirement', 'status listingType')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch reviews' });
  }
});

router.post('/', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const agentId = req.params.id;
    const { rating, comment, requirement } = req.body;
    const score = Number(rating);

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5' });
    }
    if (String(agentId) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot review yourself' });
    }

    const allowed = await canReviewAgent(req.user, agentId, requirement);
    if (!allowed) {
      return res.status(403).json({
        message:
          'Only admin or the lead generator can review the serving agent on an assigned requirement',
      });
    }

    const review = await AgentReview.findOneAndUpdate(
      {
        author: req.user._id,
        agent: agentId,
        requirement: requirement || null,
      },
      {
        author: req.user._id,
        agent: agentId,
        requirement: requirement || null,
        rating: score,
        comment: comment || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('author', 'name email')
      .populate('requirement', 'status listingType');

    const aggregates = await recomputeAgentRating(review.agent);

    res.status(201).json({ review, ...aggregates });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already reviewed this agent for this lead' });
    }
    res.status(500).json({ message: err.message || 'Failed to save review' });
  }
});

module.exports = router;
