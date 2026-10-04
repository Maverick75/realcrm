const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['Apartment', 'Villa', 'Plot', 'Commercial'],
    required: true,
  },
  listingType: {
    type: String,
    enum: ['Sale', 'Rent', 'Lease'],
    required: true,
  },
  bhk: {
    type: Number,
    default: null,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  areaSqft: {
    type: Number,
    default: null,
  },
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceZone',
    required: true,
  },
  address: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Draft', 'Available', 'Hold', 'Sold'],
    default: 'Available',
  },
  notes: {
    type: String,
    default: '',
  },
  listedViaAgent: {
    type: Boolean,
    default: false,
  },
  viaAgentNote: {
    type: String,
    default: '',
  },
  // Public HTTPS URLs (AWS S3) for owner listing photos
  images: {
    type: [String],
    default: [],
  },
  termsText: {
    type: String,
    default: '',
  },
  termsAcceptedAt: {
    type: Date,
    default: null,
  },
  termsVersion: {
    type: String,
    default: '',
  },
  videoPath: {
    type: String,
    default: '',
  },
  videoUrl: {
    type: String,
    default: '',
  },
  generatedCaption: {
    type: String,
    default: '',
  },
  generatedScript: {
    type: String,
    default: '',
  },
  lastInstagramReelId: {
    type: String,
    default: '',
  },
  lastInstagramPostedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Property', propertySchema);
