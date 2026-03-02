import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();

export const createTrpcRouter = t.router;
export const publicProcedure = t.procedure;

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token nao fornecido ou invalido" });
  }

  return next({ ctx });
});

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token nao fornecido ou invalido" });
  }

  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao administrador" });
  }

  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(requireAuth);
export const adminProcedure = t.procedure.use(requireAdmin);
