const ServiceZone = require('../models/ServiceZone');

// Approximate locality centers for map pins
const HYDERABAD_ZONES = [
  { name: 'West Hyderabad', lat: 17.4239, lng: 78.3421 },
  { name: 'East Hyderabad', lat: 17.385, lng: 78.55 },
  { name: 'North Hyderabad', lat: 17.5, lng: 78.48 },
  { name: 'South Hyderabad', lat: 17.32, lng: 78.48 },
  { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
  { name: 'Hitech City', lat: 17.4483, lng: 78.3915 },
  { name: 'Madhapur', lat: 17.4486, lng: 78.3908 },
  { name: 'Kondapur', lat: 17.4615, lng: 78.3562 },
  { name: 'Jubilee Hills', lat: 17.4327, lng: 78.407 },
  { name: 'Banjara Hills', lat: 17.414, lng: 78.435 },
  { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
  { name: 'Kukatpally', lat: 17.4948, lng: 78.3996 },
  { name: 'Miyapur', lat: 17.4968, lng: 78.356 },
  { name: 'Financial District', lat: 17.414, lng: 78.341 },
  { name: 'Tolichowki', lat: 17.396, lng: 78.423 },
  { name: 'Mehdipatnam', lat: 17.393, lng: 78.439 },
  { name: 'Uppal', lat: 17.401, lng: 78.56 },
  { name: 'LB Nagar', lat: 17.35, lng: 78.55 },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedZones() {
  for (const zone of HYDERABAD_ZONES) {
    const slug = slugify(zone.name);
    await ServiceZone.updateOne(
      { slug },
      {
        $set: {
          name: zone.name,
          city: 'Hyderabad',
          slug,
          lat: zone.lat,
          lng: zone.lng,
          isCustom: false,
        },
      },
      { upsert: true }
    );
  }
  const count = await ServiceZone.countDocuments({ city: 'Hyderabad', isCustom: false });
  console.log(`Service zones ready (${count} Hyderabad presets with map pins)`);
}

module.exports = { seedZones, HYDERABAD_ZONES, slugify };
