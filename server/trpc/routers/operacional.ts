import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "../../database/connection";
import { auditService } from "../../db";
import { adminProcedure, createTrpcRouter, protectedProcedure, publicProcedure } from "../trpc";

const workerInputSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  cpf: z.string().trim().min(11).max(14),
  status: z.enum(["available", "unavailable"]).default("available"),
});

const workerUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string().trim().min(3).max(120).optional(),
  cpf: z.string().trim().min(11).max(14).optional(),
  status: z.enum(["available", "unavailable"]).optional(),
});

const workersListInputSchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.enum(["available", "unavailable"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional();

const allocationInputSchema = z.object({
  workerId: z.number().int().positive(),
  clientName: z.string().trim().min(2).max(120),
  workDate: z.string().trim().min(10).max(10),
});

const allocationUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  workerId: z.number().int().positive().optional(),
  clientName: z.string().trim().min(2).max(120).optional(),
  workDate: z.string().trim().min(10).max(10).optional(),
});

const allocationsListInputSchema = z
  .object({
    search: z.string().trim().optional(),
    workerId: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional();

export const operacionalRouter = createTrpcRouter({
  health: publicProcedure.query(() => ({
    module: "operacional",
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  security: protectedProcedure.query(() => {
    const lockedUsersRows = db
      .prepare("SELECT locked_until FROM users WHERE locked_until IS NOT NULL")
      .all() as Array<{ locked_until: string }>;
    const now = Date.now();
    const lockedUsers = lockedUsersRows.filter((row) => {
      const parsed = new Date(row.locked_until).getTime();
      return Number.isFinite(parsed) && parsed > now;
    }).length;
    const usersWithFailedAttempts = (
      db.prepare("SELECT COUNT(*) as count FROM users WHERE failed_attempts > 0").get() as { count: number }
    ).count;

    return { lockedUsers, usersWithFailedAttempts };
  }),

  workers: protectedProcedure.input(workersListInputSchema).query(({ input }) => {
    const search = input?.search?.trim();
    const status = input?.status;
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (search) {
      clauses.push("(full_name LIKE ? OR cpf LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db.prepare(`SELECT COUNT(*) as count FROM workers ${whereSql}`).get(...params) as { count: number };
    const items = db
      .prepare(
        `SELECT id, full_name, cpf, status, created_at
         FROM workers
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return { items, total: total.count, limit, offset };
  }),

  createWorker: adminProcedure.input(workerInputSchema).mutation(({ input }) => {
    let result: { lastInsertRowid: number | bigint };
    try {
      result = db
        .prepare("INSERT INTO workers (full_name, cpf, status) VALUES (?, ?, ?)")
        .run(input.fullName, input.cpf, input.status);
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nao foi possivel cadastrar diarista" });
    }

    return db.prepare("SELECT id, full_name, cpf, status, created_at FROM workers WHERE id = ?").get(result.lastInsertRowid);
  }),

  updateWorker: adminProcedure.input(workerUpdateInputSchema).mutation(({ input }) => {
    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (input.fullName !== undefined) {
      updates.push("full_name = ?");
      values.push(input.fullName);
    }
    if (input.cpf !== undefined) {
      updates.push("cpf = ?");
      values.push(input.cpf);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (updates.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum campo para atualizar" });
    }

    try {
      const result = db.prepare(`UPDATE workers SET ${updates.join(", ")} WHERE id = ?`).run(...values, input.id);
      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Diarista nao encontrado" });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nao foi possivel atualizar diarista" });
    }

    return db.prepare("SELECT id, full_name, cpf, status, created_at FROM workers WHERE id = ?").get(input.id);
  }),

  deleteWorker: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => {
      const hasAllocations = (
        db.prepare("SELECT COUNT(*) as count FROM allocations WHERE worker_id = ?").get(input.id) as { count: number }
      ).count;
      if (hasAllocations > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nao e possivel excluir diarista com alocacoes vinculadas",
        });
      }

      const result = db.prepare("DELETE FROM workers WHERE id = ?").run(input.id);
      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Diarista nao encontrado" });
      }
      return { success: true };
    }),

  allocations: protectedProcedure.input(allocationsListInputSchema).query(({ input }) => {
    const search = input?.search?.trim();
    const workerId = input?.workerId;
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (search) {
      clauses.push("(a.client_name LIKE ? OR w.full_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (workerId) {
      clauses.push("a.worker_id = ?");
      params.push(workerId);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM allocations a
         INNER JOIN workers w ON w.id = a.worker_id
         ${whereSql}`,
      )
      .get(...params) as { count: number };
    const items = db
      .prepare(
        `SELECT a.id, a.worker_id, w.full_name as worker_name, a.client_name, a.work_date, a.created_at
         FROM allocations a
         INNER JOIN workers w ON w.id = a.worker_id
         ${whereSql}
         ORDER BY a.id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return { items, total: total.count, limit, offset };
  }),

  createAllocation: adminProcedure.input(allocationInputSchema).mutation(({ input }) => {
    const workerExists = db.prepare("SELECT id FROM workers WHERE id = ?").get(input.workerId) as
      | { id: number }
      | undefined;
    if (!workerExists) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Worker nao encontrado" });
    }

    let result: { lastInsertRowid: number | bigint };
    try {
      result = db
        .prepare("INSERT INTO allocations (worker_id, client_name, work_date) VALUES (?, ?, ?)")
        .run(input.workerId, input.clientName, input.workDate);
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nao foi possivel cadastrar alocacao" });
    }

    return db
      .prepare(
        "SELECT a.id, a.worker_id, w.full_name as worker_name, a.client_name, a.work_date, a.created_at FROM allocations a INNER JOIN workers w ON w.id = a.worker_id WHERE a.id = ?",
      )
      .get(result.lastInsertRowid);
  }),

  updateAllocation: adminProcedure.input(allocationUpdateInputSchema).mutation(({ input }) => {
    if (input.workerId !== undefined) {
      const workerExists = db.prepare("SELECT id FROM workers WHERE id = ?").get(input.workerId) as
        | { id: number }
        | undefined;
      if (!workerExists) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Worker nao encontrado" });
      }
    }

    const updates: string[] = [];
    const values: Array<string | number> = [];
    if (input.workerId !== undefined) {
      updates.push("worker_id = ?");
      values.push(input.workerId);
    }
    if (input.clientName !== undefined) {
      updates.push("client_name = ?");
      values.push(input.clientName);
    }
    if (input.workDate !== undefined) {
      updates.push("work_date = ?");
      values.push(input.workDate);
    }
    if (updates.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum campo para atualizar" });
    }

    const result = db.prepare(`UPDATE allocations SET ${updates.join(", ")} WHERE id = ?`).run(...values, input.id);
    if (result.changes === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
    }

    return db
      .prepare(
        "SELECT a.id, a.worker_id, w.full_name as worker_name, a.client_name, a.work_date, a.created_at FROM allocations a INNER JOIN workers w ON w.id = a.worker_id WHERE a.id = ?",
      )
      .get(input.id);
  }),

  deleteAllocation: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => {
      const result = db.prepare("DELETE FROM allocations WHERE id = ?").run(input.id);
      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alocacao nao encontrada" });
      }
      return { success: true };
    }),

  audit: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      return auditService.list({ limit, offset });
    }),
});
