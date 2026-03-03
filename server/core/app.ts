import express from "express";
import cors from "cors";
import { initializeDatabase } from "../database/schema";
import { createApiRouter } from "../routers";

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function resolveCorsOrigins(isProduction: boolean): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (isProduction) {
      throw new Error("CORS_ORIGIN e obrigatorio em producao");
    }
    return [];
  }

  return raw
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function resolveTrustProxy(isProduction: boolean): boolean | number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) {
    return isProduction ? 1 : false;
  }

  if (raw === "true") return true;
  if (raw === "false") return false;

  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return raw;
}

const securityHeadersMiddleware: express.RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
};

export function createApp(): express.Express {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = resolveCorsOrigins(isProduction);
  const trustProxy = resolveTrustProxy(isProduction);
  const jsonBodyLimit = process.env.JSON_BODY_LIMIT?.trim() || "1mb";

  const corsConfig: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS blocked by policy"));
    },
  };

  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(cors(corsConfig));
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use("/api", createApiRouter());

  initializeDatabase();

  return app;
}
