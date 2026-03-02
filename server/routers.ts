import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { Router } from "express";
import authRoutes from "./routes/auth";
import { createTrpcContext } from "./trpc/context";
import { operacionalRouter } from "./trpc/routers/operacional";
import { rhRouter } from "./trpc/routers/rh";

export function createApiRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.use("/auth", authRoutes);
  router.use(
    "/trpc/rh",
    createExpressMiddleware({
      router: rhRouter,
      createContext: createTrpcContext,
    }),
  );
  router.use(
    "/trpc/operacional",
    createExpressMiddleware({
      router: operacionalRouter,
      createContext: createTrpcContext,
    }),
  );

  return router;
}
