/** Decode and re-encode checks for private photos, plus push endpoint/config input boundaries. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { photoBytes } from '../support/storage.js';
import { validEndpoint } from '../support/push.js';
import { config } from '../support/config.js';
test('photo pipeline strips metadata, limits dimensions, and outputs WebP', async () => {
  const source = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#456789' } })
    .jpeg().withMetadata({ exif: { IFD0: { Artist: 'Sensitive metadata' } } }).toBuffer();
  const result = await photoBytes(source, 'avatar'); const meta = await sharp(result).metadata();
  assert.equal(meta.format, 'webp'); assert.ok(meta.width <= 512); assert.equal(meta.exif, undefined);
});
test('non-image and SVG uploads are rejected', async () => {
  await assert.rejects(() => photoBytes(Buffer.from('not a photo'), 'chat'));
  await assert.rejects(() => photoBytes(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), 'chat'));
});
test('push endpoints reject private addresses, credentials, and untrusted hosts', () => {
  for (const value of ['https://127.0.0.1/a', 'http://fcm.googleapis.com/a', 'https://evil.example/a', 'https://user@fcm.googleapis.com/a', 'https://fcm.googleapis.com:8443/a']) assert.equal(validEndpoint(value), false);
  assert.equal(validEndpoint('https://fcm.googleapis.com/fcm/send/example'), true);
  assert.equal(validEndpoint('https://web.push.apple.com/example'), true);
});
test('hosted startup rejects missing config instead of silently using placeholders', () => {
  assert.throws(() => config({ CLIENT_ORIGIN: 'http://localhost:5173' }), /HTTPS/);
  assert.throws(() => config({ CLIENT_ORIGIN: 'https://neptrixx.com' }), /MONGODB_URI/);
});
