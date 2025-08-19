// server/db.js

import { JSONFile } from 'lowdb/node';
import { Low } from 'lowdb';

const adapter = new JSONFile('db.json');
const db = new Low(adapter);

await db.read();

// ✅ Set default structure if db.json is empty
db.data ||= { conversations: [] };

await db.write();

export default db;
