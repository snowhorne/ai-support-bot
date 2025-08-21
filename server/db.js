// server/db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// Ensure the data directory exists (works locally and on Render)
await fs.mkdir(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'db.json');
const adapter = new JSONFile(dbPath);

// Explicit defaults per your spec
export const db = new Low(adapter, { conversations: {} });

// Initialize DB and ensure shape
await db.read();
if (!db.data || typeof db.data !== 'object') {
  db.data = { conversations: {} };
}
if (!db.data.conversations || typeof db.data.conversations !== 'object') {
  db.data.conversations = {};
}
// Write once to guarantee file exists
await db.write();

console.log(`[db] Using LowDB at: ${dbPath}`);
