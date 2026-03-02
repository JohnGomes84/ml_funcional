import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "server", "database", "data.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enforce foreign key constraints
try {
  db.pragma("foreign_keys = ON");
} catch {
  // Ignore pragma errors if running on older SQLite builds
}

export default db;
