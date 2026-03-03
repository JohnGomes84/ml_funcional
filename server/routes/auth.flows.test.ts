import express from "express";
import { beforeAll, describe, expect, it } from "vitest";
import { createApiRouter } from "../routers";
import { invokeInMemory } from "../test/inMemoryHttp";

const domain = "mlservicoseco.com.br";
const email = (value: string) => `${value}@${domain}`;

describe("auth flow parity (ps1 -> vitest)", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use("/api", createApiRouter());
  });

  it("executes full auth/admin flow", async () => {
    const ip = "10.1.1.1";

    const health = await invokeInMemory(app, {
      method: "GET",
      url: "/api/health",
      ip,
    });
    expect(health.status).toBe(200);

    const badDomain = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: "x@gmail.com", password: "12345678", name: "Bad", acceptTerms: true },
    });
    expect(badDomain.status).toBe(403);

    const weak = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("weak"), password: "123", name: "Weak", acceptTerms: true },
    });
    expect(weak.status).toBe(400);

    const noTerms = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("noterms"), password: "12345678", name: "NoTerms", acceptTerms: false },
    });
    expect(noTerms.status).toBe(400);

    const adminReg = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("admin"), password: "Admin12345", name: "Admin", acceptTerms: true },
    });
    expect(adminReg.status).toBe(201);

    const dupReg = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("admin"), password: "Admin12345", name: "Admin", acceptTerms: true },
    });
    expect(dupReg.status).toBe(400);

    const user1Reg = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("user1"), password: "User12345", name: "User One", acceptTerms: true },
    });
    expect(user1Reg.status).toBe(201);

    const user2Reg = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/register",
      ip,
      body: { email: email("user2"), password: "User12345", name: "User Two", acceptTerms: true },
    });
    expect(user2Reg.status).toBe(201);

    const user2Login = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip: "10.1.1.2",
      body: { email: email("user2"), password: "User12345" },
    });
    expect(user2Login.status).toBe(200);
    const user2Token = (user2Login.body as { token?: string })?.token;
    expect(typeof user2Token).toBe("string");

    const userForbidden = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/users",
      ip: "10.1.1.2",
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    expect(userForbidden.status).toBe(403);

    for (let i = 1; i <= 5; i += 1) {
      const wrong = await invokeInMemory(app, {
        method: "POST",
        url: "/api/auth/login",
        ip: "10.1.1.3",
        body: { email: email("user1"), password: "wrong-pass" },
      });
      expect(wrong.status).toBe(401);
    }

    const locked = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip: "10.1.1.3",
      body: { email: email("user1"), password: "User12345" },
    });
    expect(locked.status).toBe(429);

    const adminLogin = await invokeInMemory(app, {
      method: "POST",
      url: "/api/auth/login",
      ip: "10.1.1.4",
      body: { email: email("admin"), password: "Admin12345" },
    });
    expect(adminLogin.status).toBe(200);
    const adminToken = (adminLogin.body as { token?: string })?.token;
    expect(typeof adminToken).toBe("string");

    const me = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/me",
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(me.status).toBe(200);

    const usersList = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/users",
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(usersList.status).toBe(200);

    const users = (usersList.body || []) as Array<{ id: number; email: string; role: "admin" | "user" }>;
    const adminUser = users.find((user) => user.email === email("admin"));
    const user1 = users.find((user) => user.email === email("user1"));
    expect(adminUser).toBeDefined();
    expect(user1).toBeDefined();

    const demoteLastAdmin = await invokeInMemory(app, {
      method: "PATCH",
      url: `/api/auth/users/${adminUser!.id}/role`,
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: "user" },
    });
    expect(demoteLastAdmin.status).toBe(400);

    const invalidRole = await invokeInMemory(app, {
      method: "PATCH",
      url: `/api/auth/users/${user1!.id}/role`,
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: "owner" },
    });
    expect(invalidRole.status).toBe(400);

    const promote = await invokeInMemory(app, {
      method: "PATCH",
      url: `/api/auth/users/${user1!.id}/role`,
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { role: "admin" },
    });
    expect(promote.status).toBe(200);

    const audit = await invokeInMemory(app, {
      method: "GET",
      url: "/api/auth/audit-logs?limit=20&offset=0",
      ip: "10.1.1.4",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(audit.status).toBe(200);
    expect(Array.isArray(audit.body)).toBe(true);
  });
});
