import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiRouter } from "../routers";
import { invokeInMemory } from "../test/inMemoryHttp";

const allowedEmail = (prefix: string) => `${prefix}@mlservicoseco.com.br`;

describe("auth routes (in-memory http)", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use("/api", createApiRouter());
  });

  afterAll(() => {
    // Nothing to cleanup; no open sockets are created.
  });

  it("registers valid users and blocks disallowed domain", async () => {
    const ok = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip: "10.0.0.10",
      body: {
        email: allowedEmail("admin.register"),
        password: "senha-segura-123",
        name: "Admin Register",
        acceptTerms: true,
      },
    });

    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ email: allowedEmail("admin.register"), role: "admin" });

    const blocked = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip: "10.0.0.10",
      body: {
        email: "user@gmail.com",
        password: "senha-segura-123",
        name: "Email Bloqueado",
        acceptTerms: true,
      },
    });

    expect(blocked.status).toBe(403);
  });

  it("authenticates and returns profile with /me", async () => {
    const email = allowedEmail("profile.user");
    const ip = "10.0.0.20";

    const created = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: {
        email,
        password: "senha-segura-123",
        name: "Profile User",
        acceptTerms: true,
      },
    });
    expect(created.status).toBe(201);

    const login = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip,
      body: {
        email,
        password: "senha-segura-123",
      },
    });

    expect(login.status).toBe(200);
    const token = (login.body as { token?: string })?.token;
    expect(typeof token).toBe("string");

    const me = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/me",
      ip,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email, name: "Profile User", role: "admin" });
    expect(me.body).not.toHaveProperty("password");
  });

  it("enforces admin access for user listing", async () => {
    const adminEmail = allowedEmail("access.admin");
    const userEmail = allowedEmail("access.user");

    const adminRegister = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip: "10.0.0.30",
      body: {
        email: adminEmail,
        password: "senha-segura-123",
        name: "Access Admin",
        acceptTerms: true,
      },
    });
    expect(adminRegister.status).toBe(201);

    const userRegister = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip: "10.0.0.30",
      body: {
        email: userEmail,
        password: "senha-segura-123",
        name: "Access User",
        acceptTerms: true,
      },
    });
    expect(userRegister.status).toBe(201);

    const adminLogin = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip: "10.0.0.30",
      body: {
        email: adminEmail,
        password: "senha-segura-123",
      },
    });
    const userLogin = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip: "10.0.0.31",
      body: {
        email: userEmail,
        password: "senha-segura-123",
      },
    });

    const adminToken = (adminLogin.body as { token?: string })?.token;
    const userToken = (userLogin.body as { token?: string })?.token;

    const forbidden = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/users",
      ip: "10.0.0.31",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(forbidden.status).toBe(403);

    const allowed = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/users",
      ip: "10.0.0.30",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body)).toBe(true);
    expect((allowed.body as unknown[]).length).toBe(2);
  });

  it("locks account after repeated failed login attempts", async () => {
    const email = allowedEmail("locked.user");
    const ip = "10.0.0.40";

    const created = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: {
        email,
        password: "senha-segura-123",
        name: "Locked User",
        acceptTerms: true,
      },
    });
    expect(created.status).toBe(201);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const wrongPassword = await invokeInMemory(app, {
        method: "POST",
        url: "/api/auth/login",
        ip,
        body: {
          email,
          password: "senha-incorreta",
        },
      });
      expect(wrongPassword.status).toBe(401);
    }

    const blocked = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip,
      body: {
        email,
        password: "senha-segura-123",
      },
    });

    expect(blocked.status).toBe(429);
    expect(String((blocked.body as { error?: string })?.error || "").toLowerCase()).toContain("bloqueada");
  });

  it("rate limits repeated login attempts from same client", async () => {
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await invokeInMemory(app, {
        method: "POST",
        url: "/api/auth/login",
        ip: "10.0.0.99",
        body: {
          email: allowedEmail("unknown.user"),
          password: "senha-qualquer",
        },
      });
      statuses.push(response.status);
    }

    expect(statuses.some((status) => status === 429)).toBe(true);
  });
});
