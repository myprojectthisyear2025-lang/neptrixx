/** Private R2 photos; decode/re-encode strips metadata and rejects disguised files. */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { fail } from './errors.js';
sharp.cache({ memory: 32 }); sharp.concurrency(1);
let client;
function r2() {
  return client ||= new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
}
export async function photoBytes(buffer, purpose) {
  let image;
  try {
    const source = sharp(buffer, { limitInputPixels: 40000000, animated: false });
    const meta = await source.metadata();
    if (!['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) fail(400, 'Choose a JPEG, PNG, or WebP photo.');
    image = await source.rotate().resize({ width: purpose === 'avatar' ? 512 : 2048,
      height: purpose === 'avatar' ? 512 : 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { fail(400, 'This photo cannot be opened. Choose a JPEG, PNG, or WebP photo.'); }
  return image;
}
export async function putPhoto(userId, purpose, buffer) {
  const Body = await photoBytes(buffer, purpose);
  const Key = `support/${userId}/${purpose}/${randomUUID()}.webp`;
  await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key, Body, ContentType: 'image/webp' }));
  return Key;
}
export async function photoUrl(key) {
  return key ? getSignedUrl(r2(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }), { expiresIn: 900 }) : '';
}
export async function removePhoto(key) {
  if (key) await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}
