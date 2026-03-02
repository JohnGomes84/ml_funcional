import db from "./connection";

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      consent_at DATETIME,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT,
      action TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      ip TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasRole = columns.some((column) => column.name === "role");
  if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  }

  const hasConsent = columns.some((column) => column.name === "consent_at");
  if (!hasConsent) {
    db.exec("ALTER TABLE users ADD COLUMN consent_at DATETIME");
  }

  const hasFailed = columns.some((column) => column.name === "failed_attempts");
  if (!hasFailed) {
    db.exec("ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0");
  }

  const hasLocked = columns.some((column) => column.name === "locked_until");
  if (!hasLocked) {
    db.exec("ALTER TABLE users ADD COLUMN locked_until DATETIME");
  }

  console.log("Banco de dados inicializado (tabela users).");
}
