import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import db from "../database/connection";

const resolveJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET e obrigatorio em producao");
  }
  return "dev-only-insecure-secret";
};

const JWT_SECRET = resolveJwtSecret();

type JwtPayload = {
  userId: number;
};

type UserContext = {
  id: number;
  role: "admin" | "user";
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: UserContext | null;
};

export function createTrpcContext(opts: CreateExpressContextOptions): TrpcContext {
  const authHeader = opts.req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return { req: opts.req, res: opts.res, user: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userRow = db
      .prepare("SELECT id, role FROM users WHERE id = ?")
      .get(decoded.userId) as UserContext | undefined;

    if (!userRow) {
      return { req: opts.req, res: opts.res, user: null };
    }

    return { req: opts.req, res: opts.res, user: userRow };
  } catch {
    return { req: opts.req, res: opts.res, user: null };
  }
}
