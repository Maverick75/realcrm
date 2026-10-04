const express = require('express');
const ServiceZone = require('../models/ServiceZone');
const auth = require('../middleware/auth');
const { slugify } = require('../seed/zones');

const router = express.Router();

router.use(auth);

router.get('/', async (_req, res) => {
  try {
    const zones = await ServiceZone.find().sort({ city: 1, name: 1 });
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch zones' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, city } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Zone name is required' });
    }
    const zoneCity = (city || 'Hyderabad').trim();
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let i = 1;
    while (await ServiceZone.findOne({ slug })) {
      slug = `${baseSlug}-${i++}`;
    }
    const zone = await ServiceZone.create({
      name: name.trim(),
      city: zoneCity,
      slug,
      isCustom: true,
    });
    res.status(201).json(zone);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create zone' });
  }
});

module.exports = router;
