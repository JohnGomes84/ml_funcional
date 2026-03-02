import db from "../database/connection";

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.login_failed"
  | "auth.domain_blocked"
  | "auth.register_failed";

export class AuditService {
  log(params: {
    userId?: number;
    email?: string;
    action: AuditAction;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, email, action, success, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.userId || null,
      params.email || null,
      params.action,
      params.success ? 1 : 0,
      params.ip || null,
      params.userAgent || null,
    );
  }

  list(params?: { limit?: number; offset?: number }) {
    const limit = Math.min(params?.limit || 50, 200);
    const offset = params?.offset || 0;
    return db
      .prepare(
        "SELECT id, user_id, email, action, success, ip, user_agent, created_at FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?",
      )
      .all(limit, offset);
  }
}
