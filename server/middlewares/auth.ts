import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../database/connection";

const resolveJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório em produção");
  }
  return "dev-only-insecure-secret";
};
const JWT_SECRET = resolveJwtSecret();

export interface AuthRequest extends Request {
  userId?: number;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const row = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as { role?: string } | undefined;

  if (!row || row.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador" });
  }

  return next();
};
