const GRAPH = 'https://graph.facebook.com/v19.0';

async function graphGet(path, params = {}) {
  const url = new URL(`${GRAPH}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph GET failed ${res.status}`);
  }
  return data;
}

async function graphPost(path, body = {}) {
  const url = `${GRAPH}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph POST failed ${res.status}`);
  }
  return data;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Publish a Reel to Instagram via Content Publishing API.
 * videoUrl must be a publicly reachable HTTPS URL.
 */
async function publishReel({ igUserId, accessToken, videoUrl, caption }) {
  if (!igUserId || !accessToken) {
    throw new Error('Instagram account is not connected');
  }
  if (!videoUrl) {
    throw new Error('A public video URL is required to publish a Reel');
  }

  const container = await graphPost(`/${igUserId}/media`, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption || '',
    share_to_feed: true,
    access_token: accessToken,
  });

  const creationId = container.id;
  let status = 'IN_PROGRESS';
  let attempts = 0;
  while (attempts < 30 && status !== 'FINISHED') {
    await sleep(2000);
    const st = await graphGet(`/${creationId}`, {
      fields: 'status_code',
      access_token: accessToken,
    });
    status = st.status_code;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Instagram media processing failed: ${status}`);
    }
    attempts += 1;
  }

  if (status !== 'FINISHED') {
    throw new Error('Timed out waiting for Instagram to process the video');
  }

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: accessToken,
  });

  return { reelId: published.id, creationId };
}

async function exchangeCodeForToken(code, redirectUri) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be configured');
  }

  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const shortRes = await fetch(tokenUrl);
  const shortData = await shortRes.json();
  if (!shortRes.ok || shortData.error) {
    throw new Error(shortData.error?.message || 'Failed to exchange OAuth code');
  }

  const longUrl = new URL(`${GRAPH}/oauth/access_token`);
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', appId);
  longUrl.searchParams.set('client_secret', appSecret);
  longUrl.searchParams.set('fb_exchange_token', shortData.access_token);

  const longRes = await fetch(longUrl);
  const longData = await longRes.json();
  if (!longRes.ok || longData.error) {
    throw new Error(longData.error?.message || 'Failed to get long-lived token');
  }

  return longData.access_token;
}

async function resolveInstagramBusinessAccount(userAccessToken) {
  const pages = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account',
    access_token: userAccessToken,
  });

  const page = (pages.data || []).find((p) => p.instagram_business_account?.id);
  if (!page) {
    throw new Error(
      'No Facebook Page with a linked Instagram Business account was found for this user'
    );
  }

  const igId = page.instagram_business_account.id;
  const ig = await graphGet(`/${igId}`, {
    fields: 'id,username',
    access_token: page.access_token || userAccessToken,
  });

  return {
    facebookPageId: page.id,
    pageAccessToken: page.access_token || userAccessToken,
    instagramUserId: ig.id,
    instagramUsername: ig.username || '',
  };
}

module.exports = {
  publishReel,
  exchangeCodeForToken,
  resolveInstagramBusinessAccount,
};
