import { JSONFilePreset } from 'lowdb/node';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

// Initialize with defaults to prevent "missing default data"
const db = await JSONFilePreset(dbPath, { conversations: {} });

export default db;
