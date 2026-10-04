const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    default: null,
  },
  type: {
    type: String,
    enum: ['Call', 'Email', 'Meeting', 'FollowUp', 'SiteVisit', 'WhatsApp'],
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  nextFollowUpAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

module.exports = mongoose.model('Interaction', interactionSchema);
