import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "../../database/connection";
import { userService } from "../../db";
import { adminProcedure, createTrpcRouter, protectedProcedure, publicProcedure } from "../trpc";

const normalizeCpf = (value: string) => value.replace(/\D/g, "");

const cpfField = z
  .string()
  .trim()
  .transform(normalizeCpf)
  .refine((value) => /^\d{11}$/.test(value), "CPF deve conter 11 digitos");

const employeeInputSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  cpf: cpfField,
  employmentType: z.enum(["CLT", "PJ"]).default("CLT"),
  status: z.enum(["active", "inactive"]).default("active"),
});

const employeesListInputSchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional();

const employeeUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string().trim().min(3).max(120).optional(),
  cpf: cpfField.optional(),
  employmentType: z.enum(["CLT", "PJ"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const rhRouter = createTrpcRouter({
  health: publicProcedure.query(() => ({
    module: "rh",
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  users: adminProcedure.query(() => userService.listUsers()),

  metrics: protectedProcedure.query(() => {
    const totalUsers = userService.countUsers();
    const admins = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number })
      .count;
    const withConsent = (
      db.prepare("SELECT COUNT(*) as count FROM users WHERE consent_at IS NOT NULL").get() as { count: number }
    ).count;
    const totalEmployees = (db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number }).count;

    return {
      totalUsers,
      admins,
      usersWithoutConsent: Math.max(totalUsers - withConsent, 0),
      totalEmployees,
    };
  }),

  employees: protectedProcedure.input(employeesListInputSchema).query(({ input }) => {
    const search = input?.search?.trim();
    const status = input?.status;
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;

    const clauses: string[] = [];
    const params: Array<string | number> = [];

    if (search) {
      const normalizedCpfSearch = normalizeCpf(search);
      clauses.push("(full_name LIKE ? OR cpf LIKE ?)");
      params.push(`%${search}%`, `%${normalizedCpfSearch || search}%`);
    }
    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const total = db
      .prepare(`SELECT COUNT(*) as count FROM employees ${whereSql}`)
      .get(...params) as { count: number };
    const items = db
      .prepare(
        `SELECT id, full_name, cpf, employment_type, status, created_at
         FROM employees
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    return { items, total: total.count, limit, offset };
  }),

  createEmployee: adminProcedure.input(employeeInputSchema).mutation(({ input }) => {
    let result: { lastInsertRowid: number | bigint };
    try {
      result = db
        .prepare("INSERT INTO employees (full_name, cpf, employment_type, status) VALUES (?, ?, ?, ?)")
        .run(input.fullName, input.cpf, input.employmentType, input.status);
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nao foi possivel cadastrar colaborador" });
    }

    return db
      .prepare("SELECT id, full_name, cpf, employment_type, status, created_at FROM employees WHERE id = ?")
      .get(result.lastInsertRowid);
  }),

  updateEmployee: adminProcedure.input(employeeUpdateInputSchema).mutation(({ input }) => {
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
    if (input.employmentType !== undefined) {
      updates.push("employment_type = ?");
      values.push(input.employmentType);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (updates.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum campo para atualizar" });
    }

    try {
      const result = db.prepare(`UPDATE employees SET ${updates.join(", ")} WHERE id = ?`).run(...values, input.id);
      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador nao encontrado" });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nao foi possivel atualizar colaborador" });
    }

    return db
      .prepare("SELECT id, full_name, cpf, employment_type, status, created_at FROM employees WHERE id = ?")
      .get(input.id);
  }),

  deleteEmployee: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => {
      const result = db.prepare("DELETE FROM employees WHERE id = ?").run(input.id);
      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador nao encontrado" });
      }
      return { success: true };
    }),
});
