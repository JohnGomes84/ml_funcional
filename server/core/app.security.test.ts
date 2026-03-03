import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { invokeInMemory } from "../test/inMemoryHttp";

const ORIGINAL_ENV = { ...process.env };

function withEnv<T>(
  overrides: Partial<Record<"NODE_ENV" | "CORS_ORIGIN" | "TRUST_PROXY", string | undefined>>,
  run: () => T,
): T {
  const keys = Object.keys(overrides) as Array<keyof typeof overrides>;
  const previous: Partial<Record<keyof typeof overrides, string | undefined>> = {};

  for (const key of keys) {
    previous[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("core app security/cors", () => {
  it("applies security headers and allows configured origin", async () => {
    const app = withEnv(
      {
        NODE_ENV: "production",
        CORS_ORIGIN: "https://app.exemplo.com",
        TRUST_PROXY: "1",
      },
      () => createApp(),
    );

    const response = await invokeInMemory(app, {
      method: "GET",
      url: "/api/health",
      headers: { Origin: "https://app.exemplo.com" },
    });

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.exemplo.com");
  });

  it("normalizes trailing slash in CORS origin configuration", async () => {
    const app = withEnv(
      {
        NODE_ENV: "production",
        CORS_ORIGIN: "https://app.exemplo.com/",
        TRUST_PROXY: "1",
      },
      () => createApp(),
    );

    const response = await invokeInMemory(app, {
      method: "GET",
      url: "/api/health",
      headers: { Origin: "https://app.exemplo.com" },
    });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.exemplo.com");
  });

  it("blocks disallowed origins in production", async () => {
    const app = withEnv(
      {
        NODE_ENV: "production",
        CORS_ORIGIN: "https://app.exemplo.com",
        TRUST_PROXY: "1",
      },
      () => createApp(),
    );

    await expect(
      invokeInMemory(app, {
        method: "GET",
        url: "/api/health",
        headers: { Origin: "https://invasor.exemplo.com" },
      }),
    ).rejects.toThrow("CORS blocked by policy");
  });

  it("requires CORS_ORIGIN in production", () => {
    expect(() =>
      withEnv(
        {
          NODE_ENV: "production",
          CORS_ORIGIN: undefined,
          TRUST_PROXY: "1",
        },
        () => createApp(),
      ),
    ).toThrow("CORS_ORIGIN e obrigatorio em producao");
  });

  it("allows arbitrary origin in development when CORS_ORIGIN is absent", async () => {
    const app = withEnv(
      {
        NODE_ENV: "development",
        CORS_ORIGIN: undefined,
        TRUST_PROXY: undefined,
      },
      () => createApp(),
    );

    const response = await invokeInMemory(app, {
      method: "GET",
      url: "/api/health",
      headers: { Origin: "http://localhost:3000" },
    });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});
