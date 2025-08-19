import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

// Create adapter and database
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { conversations: {} });

// Read existing data if file exists
await db.read();

// Ensure defaults if file is empty
db.data ||= { conversations: {} };

// Write defaults back if needed
await db.write();

export default db;
