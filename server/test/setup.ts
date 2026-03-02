import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";
import { afterAll, beforeAll, beforeEach } from "vitest";

const testsDir = path.join(process.cwd(), "tmp", "tests");
if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
}

process.env.DB_PATH = path.join(testsDir, "server.test.db");
process.env.JWT_SECRET = "test-secret";

let db: Database.Database;

beforeAll(async () => {
  const { initializeDatabase } = await import("../database/schema");
  const connectionModule = await import("../database/connection");
  db = connectionModule.default;
  initializeDatabase();
});

beforeEach(() => {
  db.exec(`
    DELETE FROM allocations;
    DELETE FROM workers;
    DELETE FROM employees;
    DELETE FROM audit_logs;
    DELETE FROM users;
  `);
});

afterAll(() => {
  db?.close();
});
