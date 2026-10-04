function fallbackCaption(facts) {
  const price = `₹${Number(facts.price || 0).toLocaleString('en-IN')}`;
  const caption = [
    `${facts.title} in ${facts.zone || facts.city}`,
    `${facts.bhk ? `${facts.bhk} BHK ` : ''}${facts.type} for ${facts.listingType}`,
    `Price: ${price}`,
    facts.notes || 'Premium listing — DM for visit.',
    '',
    '#HyderabadRealEstate #Property #RealEstateIndia #HomeForSale #HyderabadHomes',
  ].join('\n');
  const script = [
    `Hook: Looking for a ${facts.type} in ${facts.zone || 'Hyderabad'}?`,
    `Body: ${facts.bhk ? `${facts.bhk} BHK, ` : ''}${price} — ${facts.listingType}.`,
    'CTA: Comment VISIT or DM now.',
  ].join('\n');
  return { caption, script, provider: 'fallback' };
}

/**
 * Generate caption/script using the agent's own OpenAI API key.
 * @param {object} property
 * @param {{ apiKey?: string, model?: string, allowFallback?: boolean }} options
 */
async function generatePropertyCaption(property, options = {}) {
  const facts = {
    title: property.title,
    type: property.type,
    listingType: property.listingType,
    bhk: property.bhk,
    price: property.price,
    areaSqft: property.areaSqft,
    zone: property.zone?.name || '',
    city: property.zone?.city || 'Hyderabad',
    address: property.address,
    notes: property.notes,
    agency: property.agent?.name,
  };

  const apiKey = options.apiKey || '';
  const model = options.model || 'gpt-4o-mini';

  if (!apiKey) {
    if (options.allowFallback) {
      return fallbackCaption(facts);
    }
    const err = new Error(
      'Add your OpenAI API key in Profile so caption generation uses your own credits.'
    );
    err.code = 'OPENAI_KEY_MISSING';
    throw err;
  }

  const prompt = `You are a real-estate social media copywriter for Hyderabad agents.
Given this property JSON, return ONLY valid JSON with keys:
- caption: Instagram Reel caption under 2100 chars, engaging, include 5-10 hashtags
- script: 3 short spoken lines for the reel (hook, body, CTA)

Property:
${JSON.stringify(facts, null, 2)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'Return only JSON. No markdown.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `OpenAI error: ${response.status}`;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.error?.message || message;
    } catch {
      message = `${message} ${errText}`.trim();
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    caption: String(parsed.caption || '').slice(0, 2200),
    script: String(parsed.script || ''),
    provider: 'openai',
    model,
  };
}

module.exports = { generatePropertyCaption };
