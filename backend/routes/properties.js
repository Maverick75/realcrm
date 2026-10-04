const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const { requireRole, normalizeRole } = require('../middleware/roles');
const AgentProfile = require('../models/AgentProfile');
const { generatePropertyCaption } = require('../services/captionLlm');
const { publishReel } = require('../services/instagramPublish');
const { getAgentIgCredentials } = require('../services/instagramCredentials');
const { decryptToken } = require('../services/tokenCrypto');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
});

function publicBaseUrl(req) {
  return (
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    `${req.protocol}://${req.get('host')}`
  ).replace(/\/$/, '');
}

function canAccessProperty(user, property) {
  if (normalizeRole(user) === 'admin') return true;
  if (!property.agent) return false;
  return String(property.agent._id || property.agent) === String(user._id);
}

router.use(auth);

router.get('/', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const filter =
      normalizeRole(req.user) === 'admin'
        ? req.query.agentId
          ? { agent: req.query.agentId }
          : { agent: { $ne: null } }
        : { agent: req.user._id };

    const properties = await Property.find(filter)
      .populate('zone', 'name city slug lat lng')
      .populate('agent', 'name email')
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch properties' });
  }
});

router.get('/:id', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('zone', 'name city slug lat lng')
      .populate('agent', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!canAccessProperty(req.user, property)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch property' });
  }
});

router.post('/', requireRole('agent'), async (req, res) => {
  try {
    const { title, type, listingType, bhk, price, areaSqft, zone, address, status, notes } =
      req.body;
    if (!title || !type || !listingType || price == null || !zone) {
      return res.status(400).json({
        message: 'title, type, listingType, price, and zone are required',
      });
    }
    if (!['Sale', 'Rent', 'Lease'].includes(listingType)) {
      return res.status(400).json({ message: 'listingType must be Sale, Rent, or Lease' });
    }

    const property = await Property.create({
      agent: req.user._id,
      owner: null,
      title,
      type,
      listingType,
      bhk: bhk != null && bhk !== '' ? Number(bhk) : null,
      price: Number(price),
      areaSqft: areaSqft != null && areaSqft !== '' ? Number(areaSqft) : null,
      zone,
      address,
      status,
      notes,
    });

    const populated = await Property.findById(property._id)
      .populate('zone', 'name city slug lat lng')
      .populate('agent', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create property' });
  }
});

router.put('/:id', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!canAccessProperty(req.user, property)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fields = [
      'title',
      'type',
      'listingType',
      'bhk',
      'price',
      'areaSqft',
      'zone',
      'address',
      'status',
      'notes',
      'videoUrl',
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (['bhk', 'price', 'areaSqft'].includes(field)) {
          property[field] =
            req.body[field] === '' || req.body[field] == null
              ? field === 'price'
                ? property.price
                : null
              : Number(req.body[field]);
        } else {
          property[field] = req.body[field];
        }
      }
    });

    await property.save();
    const populated = await Property.findById(property._id)
      .populate('zone', 'name city slug lat lng')
      .populate('agent', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update property' });
  }
});

router.post(
  '/:id/video',
  requireRole('agent', 'admin'),
  upload.single('video'),
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (!canAccessProperty(req.user, property)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'video file is required' });
      }

      property.videoPath = req.file.filename;
      property.videoUrl = `${publicBaseUrl(req)}/uploads/videos/${req.file.filename}`;
      await property.save();

      const populated = await Property.findById(property._id)
        .populate('zone', 'name city slug lat lng')
        .populate('agent', 'name email');
      res.json(populated);
    } catch (err) {
      res.status(500).json({ message: err.message || 'Video upload failed' });
    }
  }
);

router.post('/:id/generate-caption', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('zone', 'name city slug')
      .populate('agent', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!canAccessProperty(req.user, property)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Always bill the property owner's OpenAI key (agent's own credits)
    const ownerId = property.agent._id || property.agent;
    const ownerProfile = await AgentProfile.findOne({ user: ownerId }).select(
      '+openaiApiKeyEnc openaiModel'
    );
    const apiKey = ownerProfile?.openaiApiKeyEnc
      ? decryptToken(ownerProfile.openaiApiKeyEnc)
      : '';

    const result = await generatePropertyCaption(property, {
      apiKey,
      model: ownerProfile?.openaiModel || 'gpt-4o-mini',
      allowFallback: false,
    });
    property.generatedCaption = result.caption;
    property.generatedScript = result.script;
    await property.save();

    res.json({
      caption: result.caption,
      script: result.script,
      provider: result.provider,
      model: result.model,
      property,
    });
  } catch (err) {
    const status = err.code === 'OPENAI_KEY_MISSING' ? 400 : 500;
    res.status(status).json({ message: err.message || 'Caption generation failed' });
  }
});

router.post('/:id/publish-reel', requireRole('agent'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('zone', 'name city slug')
      .populate('agent', 'name email');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.agent._id || property.agent) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const creds = await getAgentIgCredentials(req.user._id);
    if (!creds) {
      return res.status(400).json({
        message: 'Connect Instagram on your Profile before publishing a Reel',
      });
    }

    const caption = req.body.caption || property.generatedCaption || property.title;
    const videoUrl = req.body.videoUrl || property.videoUrl;
    if (!videoUrl) {
      return res.status(400).json({
        message:
          'Upload a video clip first. Meta requires a publicly reachable HTTPS video URL.',
      });
    }
    if (!String(videoUrl).startsWith('https://') && process.env.ALLOW_HTTP_VIDEO !== 'true') {
      return res.status(400).json({
        message:
          'Instagram requires an HTTPS public video URL. Set PUBLIC_API_URL to your https tunnel (e.g. ngrok) and re-upload the video.',
      });
    }

    const published = await publishReel({
      igUserId: creds.igUserId,
      accessToken: creds.accessToken,
      videoUrl,
      caption,
    });

    property.generatedCaption = caption;
    property.lastInstagramReelId = published.reelId;
    property.lastInstagramPostedAt = new Date();
    await property.save();

    res.json({
      message: 'Reel published',
      reelId: published.reelId,
      creationId: published.creationId,
      property,
    });
  } catch (err) {
    console.error('publish-reel error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to publish Reel' });
  }
});

router.delete('/:id', requireRole('agent', 'admin'), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (!canAccessProperty(req.user, property)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await property.deleteOne();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete property' });
  }
});

module.exports = router;
