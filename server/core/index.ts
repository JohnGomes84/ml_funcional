import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "../database/schema";
import { createApiRouter } from "../routers";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (isProduction) {
      throw new Error("CORS_ORIGIN e obrigatorio em producao");
    }
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = resolveCorsOrigins();

const corsConfig: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow server-to-server and health checks without Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!isProduction || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS blocked by policy"));
  },
};

app.use(cors(corsConfig));
app.use(express.json());
app.use("/api", createApiRouter());

initializeDatabase();

const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
