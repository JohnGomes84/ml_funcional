import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .email("Email inválido")
  .max(320, "Email muito longo");

const passwordField = z
  .string()
  .min(8, "A senha deve ter entre 8 e 64 caracteres")
  .max(64, "A senha deve ter entre 8 e 64 caracteres");

export const registerBodySchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().max(120).optional(),
  acceptTerms: z.boolean(),
});

export const loginBodySchema = z.object({
  email: emailField,
  password: z.string().min(1, "Senha obrigatória"),
});

export const updateRoleBodySchema = z.object({
  role: z.enum(["admin", "user"]),
});

export const paginationQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => Number(value ?? 50)),
  offset: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => Number(value ?? 0)),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;
