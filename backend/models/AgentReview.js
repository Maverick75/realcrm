const mongoose = require('mongoose');

const agentReviewSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

agentReviewSchema.index(
  { author: 1, agent: 1, requirement: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('AgentReview', agentReviewSchema);
