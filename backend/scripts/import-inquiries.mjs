/** Optional idempotent import of the uploaded website's historical JSON inquiry records. */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { Inquiry } from '../models/Inquiry.js';
try {
  const records = JSON.parse(await readFile(new URL('../data/inquiries.json', import.meta.url), 'utf8'));
  if (!Array.isArray(records)) throw new Error('Expected a JSON array of inquiries.');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'neptrixx' });
  let count = 0;
  for (const record of records) {
    if (!record.id) continue;
    const { _id, ...data } = record;
    const result = await Inquiry.updateOne({ id: record.id }, { $setOnInsert: data }, { upsert: true });
    count += result.upsertedCount;
  }
  console.log(`Imported ${count} historical inquiries; existing records were kept.`);
} finally { await mongoose.disconnect(); }
