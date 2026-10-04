const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for S3 image storage`);
  }
  return value;
}

function getS3Config() {
  const bucket = requiredEnv('S3_BUCKET_NAME');
  const region = process.env.AWS_REGION || 'ap-south-1';
  const accessKeyId =
    process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY are required for S3 image storage'
    );
  }

  return { bucket, region, accessKeyId, secretAccessKey };
}

let client;

function getClient() {
  if (client) return client;
  const { region, accessKeyId, secretAccessKey } = getS3Config();
  client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function publicUrlForKey(key) {
  const { bucket, region } = getS3Config();
  const base = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function keyFromPublicUrl(url) {
  if (!url) return null;
  const clean = String(url).split('?')[0];
  const base = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (base && clean.startsWith(`${base}/`)) {
    return clean.slice(base.length + 1);
  }

  try {
    const { bucket, region } = getS3Config();
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const parsed = new URL(clean);
    if (parsed.hostname === host || parsed.hostname === `${bucket}.s3.amazonaws.com`) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    }
    // path-style: s3.region.amazonaws.com/bucket/key
    if (
      parsed.hostname === `s3.${region}.amazonaws.com` ||
      parsed.hostname === 's3.amazonaws.com'
    ) {
      const parts = parsed.pathname.replace(/^\//, '').split('/');
      if (parts[0] === bucket) return decodeURIComponent(parts.slice(1).join('/'));
    }
  } catch {
    return null;
  }
  return null;
}

function buildListingImageKey({ ownerId, listingId, originalName }) {
  const safe = String(originalName || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `listings/${ownerId}/${listingId}/${Date.now()}-${safe}`;
}

function buildInventoryImageKey({ agentId, propertyId, originalName }) {
  const safe = String(originalName || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `inventory/${agentId}/${propertyId}/${Date.now()}-${safe}`;
}

async function uploadListingImage({ buffer, contentType, key }) {
  const { bucket } = getS3Config();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return publicUrlForKey(key);
}

async function deleteObjectByUrl(url) {
  const key = keyFromPublicUrl(url);
  if (!key || !(key.startsWith('listings/') || key.startsWith('inventory/'))) {
    return false;
  }
  const { bucket } = getS3Config();
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  return true;
}

async function deleteObjectsByUrls(urls = []) {
  for (const url of urls) {
    try {
      await deleteObjectByUrl(url);
    } catch (err) {
      console.warn('S3 delete failed:', err.message);
    }
  }
}

module.exports = {
  buildListingImageKey,
  buildInventoryImageKey,
  uploadListingImage,
  deleteObjectByUrl,
  deleteObjectsByUrls,
  keyFromPublicUrl,
  publicUrlForKey,
};
