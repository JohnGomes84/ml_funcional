import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { auditService, userService } from "../db";
import {
  loginBodySchema,
  paginationQuerySchema,
  registerBodySchema,
  updateRoleBodySchema,
} from "../schema";

const router = Router();
const resolveJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório em produção");
  }
  return "dev-only-insecure-secret";
};
const JWT_SECRET = resolveJwtSecret();
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "mlservicoseco.com.br").toLowerCase();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isAllowedEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use("/login", authLimiter);
router.use("/register", authLimiter);

router.post("/register", async (req, res) => {
  try {
    const parsed = registerBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Dados inválidos" });
    }

    const { password, name, acceptTerms } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    if (!isAllowedEmail(email)) {
      auditService.log({
        email,
        action: "auth.domain_blocked",
        success: false,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(403).json({ error: "Email não autorizado para cadastro" });
    }

    if (!acceptTerms) {
      return res.status(400).json({ error: "É necessário aceitar os termos e a política de privacidade" });
    }

    const consentAt = new Date().toISOString();
    const user = await userService.createUser(email, password, name, undefined, consentAt);
    auditService.log({
      userId: user.id,
      email: user.email,
      action: "auth.register",
      success: true,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(201).json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao registrar";
    auditService.log({
      email: typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : undefined,
      action: "auth.register_failed",
      success: false,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(400).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Dados inválidos" });
    }

    const password = parsed.data.password;
    const email = normalizeEmail(parsed.data.email);

    if (!isAllowedEmail(email)) {
      auditService.log({
        email,
        action: "auth.domain_blocked",
        success: false,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(403).json({ error: "Email não autorizado para login" });
    }

    const user = userService.findByEmail(email);
    if (!user) {
      auditService.log({
        email,
        action: "auth.login_failed",
        success: false,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(429).json({ error: "Conta temporariamente bloqueada. Tente novamente mais tarde." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      userService.recordFailedLogin(user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      auditService.log({
        userId: user.id,
        email,
        action: "auth.login_failed",
        success: false,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    userService.resetLoginFailures(user.id);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    auditService.log({
      userId: user.id,
      email,
      action: "auth.login",
      success: true,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao autenticar";
    return res.status(500).json({ error: message });
  }
});

router.get("/me", authMiddleware, (req: AuthRequest, res) => {
  const user = userService.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }
  return res.json(user);
});

router.get("/users", authMiddleware, requireAdmin, (_req, res) => {
  const users = userService.listUsers();
  return res.json(users);
});

router.patch("/users/:id/role", authMiddleware, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateRoleBodySchema.safeParse(req.body);

  if (!id || !parsed.success) {
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  try {
    const updated = userService.updateRole(id, parsed.data.role);
    if (!updated) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar papel";
    return res.status(400).json({ error: message });
  }
});

router.get("/audit-logs", authMiddleware, requireAdmin, (req, res) => {
  const parsed = paginationQuerySchema.safeParse(req.query);
  const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  const logs = auditService.list({ limit, offset });
  return res.json(logs);
});

export default router;
