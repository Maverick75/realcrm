const mongoose = require('mongoose');

const agentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  agencyName: {
    type: String,
    trim: true,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  yearsExperience: {
    type: Number,
    default: 0,
    min: 0,
  },
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  zones: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceZone',
    },
  ],
  onboardingComplete: {
    type: Boolean,
    default: false,
  },
  instagramUserId: {
    type: String,
    default: '',
  },
  instagramUsername: {
    type: String,
    default: '',
  },
  facebookPageId: {
    type: String,
    default: '',
  },
  metaAccessTokenEnc: {
    type: String,
    default: '',
    select: false,
  },
  // Per-agent OpenAI key so caption/script generation bills their own credits
  openaiApiKeyEnc: {
    type: String,
    default: '',
    select: false,
  },
  openaiModel: {
    type: String,
    default: 'gpt-4o-mini',
    trim: true,
  },
  instagramConnectedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

agentProfileSchema.pre('save', function touchUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AgentProfile', agentProfileSchema);
