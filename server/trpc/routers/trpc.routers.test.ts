import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { operacionalRouter } from "./operacional";
import { rhRouter } from "./rh";

const adminContext = {
  req: {} as never,
  res: {} as never,
  user: { id: 1, role: "admin" as const },
};

const userContext = {
  req: {} as never,
  res: {} as never,
  user: { id: 2, role: "user" as const },
};

const anonymousContext = {
  req: {} as never,
  res: {} as never,
  user: null,
};

describe("rh router", () => {
  it("returns public health", async () => {
    const caller = rhRouter.createCaller(anonymousContext);
    const result = await caller.health();

    expect(result.module).toBe("rh");
    expect(result.status).toBe("ok");
  });

  it("blocks protected calls without auth", async () => {
    const caller = rhRouter.createCaller(anonymousContext);

    await expect(caller.employees()).rejects.toBeInstanceOf(TRPCError);
  });

  it("creates and lists employees as admin", async () => {
    const caller = rhRouter.createCaller(adminContext);

    const created = await caller.createEmployee({
      fullName: "Ana Silva",
      cpf: "12345678901",
      employmentType: "CLT",
      status: "active",
    });

    expect(created).toMatchObject({
      full_name: "Ana Silva",
      cpf: "12345678901",
      employment_type: "CLT",
      status: "active",
    });

    const listed = await caller.employees({ search: "Ana", limit: 10, offset: 0 });
    expect(listed.total).toBe(1);
    expect(Array.isArray(listed.items)).toBe(true);
  });

  it("restricts users list to admin", async () => {
    const caller = rhRouter.createCaller(userContext);
    await expect(caller.users()).rejects.toBeInstanceOf(TRPCError);
  });

  it("normalizes cpf and blocks duplicates with punctuation variations", async () => {
    const caller = rhRouter.createCaller(adminContext);

    await caller.createEmployee({
      fullName: "Joana Braga",
      cpf: "123.456.789-01",
      employmentType: "PJ",
      status: "active",
    });

    await expect(
      caller.createEmployee({
        fullName: "Joana Braga 2",
        cpf: "12345678901",
        employmentType: "PJ",
        status: "active",
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    const listed = await caller.employees({ search: "123.456.789-01", limit: 10, offset: 0 });
    const firstEmployee = listed.items[0] as { cpf?: string } | undefined;
    expect(listed.total).toBe(1);
    expect(firstEmployee?.cpf).toBe("12345678901");
  });
});

describe("operacional router", () => {
  it("allows protected call for regular authenticated user", async () => {
    const caller = operacionalRouter.createCaller(userContext);
    const result = await caller.security();

    expect(result).toHaveProperty("lockedUsers");
    expect(result).toHaveProperty("usersWithFailedAttempts");
  });

  it("prevents deleting worker with allocations", async () => {
    const caller = operacionalRouter.createCaller(adminContext);
    const worker = (await caller.createWorker({
      fullName: "Carlos Souza",
      cpf: "98765432100",
      status: "available",
    })) as { id: number };

    await caller.createAllocation({
      workerId: worker.id,
      clientName: "Cliente XPTO",
      workDate: "2026-03-02",
    });

    await expect(caller.deleteWorker({ id: worker.id })).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects invalid allocation dates", async () => {
    const caller = operacionalRouter.createCaller(adminContext);
    const worker = (await caller.createWorker({
      fullName: "Larissa Teixeira",
      cpf: "987.654.321-00",
      status: "available",
    })) as { id: number };

    await expect(
      caller.createAllocation({
        workerId: worker.id,
        clientName: "Cliente Zeta",
        workDate: "2026-02-31",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });
});
