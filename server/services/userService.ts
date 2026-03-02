import db from "../database/connection";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  email: string;
  password: string;
  name: string | null;
  role: "admin" | "user";
  consent_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class UserService {
  async createUser(
    email: string,
    password: string,
    name?: string,
    role?: "admin" | "user",
    consentAt?: string | null,
  ): Promise<Omit<User, "password">> {
    const normalizedEmail = normalizeEmail(email);
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      throw new Error("Email já cadastrado");
    }

    const userCount = this.countUsers();
    const finalRole = role || (userCount === 0 ? "admin" : "user");

    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, role, consent_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(normalizedEmail, hashedPassword, name || null, finalRole, consentAt || null);

    return {
      id: result.lastInsertRowid as number,
      email: normalizedEmail,
      name: name || null,
      role: finalRole,
      consent_at: consentAt || null,
      failed_attempts: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
    };
  }

  findByEmail(email: string): User | undefined {
    const normalizedEmail = normalizeEmail(email);
    return db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as User | undefined;
  }

  findById(id: number): Omit<User, "password"> | undefined {
    return db
      .prepare("SELECT id, email, name, role, consent_at, failed_attempts, locked_until, created_at FROM users WHERE id = ?")
      .get(id) as Omit<User, "password"> | undefined;
  }

  listUsers(): Array<Omit<User, "password">> {
    return db
      .prepare(
        "SELECT id, email, name, role, consent_at, failed_attempts, locked_until, created_at FROM users ORDER BY id ASC",
      )
      .all() as Array<Omit<User, "password">>;
  }

  updateRole(id: number, role: "admin" | "user"): Omit<User, "password"> | undefined {
    if (role === "user") {
      const current = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as { role?: string } | undefined;
      if (current?.role === "admin") {
        const adminCountRow = db
          .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
          .get() as { count: number };

        if ((adminCountRow.count || 0) <= 1) {
          throw new Error("Não é permitido remover o último administrador");
        }
      }
    }

    const result = db
      .prepare("UPDATE users SET role = ? WHERE id = ?")
      .run(role, id);

    if (result.changes === 0) {
      return undefined;
    }

    return this.findById(id);
  }

  recordFailedLogin(userId: number, maxAttempts: number, lockMinutes: number) {
    const row = db
      .prepare("SELECT failed_attempts FROM users WHERE id = ?")
      .get(userId) as { failed_attempts?: number } | undefined;

    const attempts = (row?.failed_attempts || 0) + 1;
    const shouldLock = attempts >= maxAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + lockMinutes * 60 * 1000).toISOString()
      : null;

    db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").run(
      attempts,
      lockedUntil,
      userId,
    );
  }

  resetLoginFailures(userId: number) {
    db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").run(userId);
  }

  countUsers(): number {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count || 0;
  }
}
