import { EventEmitter } from "node:events";
import type express from "express";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS";

export type InMemoryRequest = {
  method: HttpMethod;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
};

export type InMemoryResponse = {
  status: number;
  headers: Record<string, unknown>;
  body: unknown;
  rawBody: string;
};

type AppWithHandle = {
  handle: (req: express.Request, res: express.Response, next: (error?: unknown) => void) => void;
};

function createHeadersMap(input?: Record<string, string>) {
  const normalized = new Map<string, unknown>();
  for (const [name, value] of Object.entries(input || {})) {
    normalized.set(name.toLowerCase(), value);
  }
  return normalized;
}

export async function invokeInMemory(app: express.Express, request: InMemoryRequest): Promise<InMemoryResponse> {
  return new Promise<InMemoryResponse>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const headersMap = createHeadersMap(request.headers);
    const clientIp = request.ip || "10.10.10.10";

    const req = new EventEmitter() as express.Request;
    Object.assign(req, {
      method: request.method,
      url: request.url,
      originalUrl: request.url,
      headers: Object.fromEntries(headersMap),
      body: request.body,
      query: {},
      params: {},
      connection: { remoteAddress: clientIp },
      socket: { remoteAddress: clientIp },
      ip: clientIp,
      protocol: "http",
      secure: false,
      httpVersion: "1.1",
      httpVersionMajor: 1,
      httpVersionMinor: 1,
    });

    const res = new EventEmitter() as express.Response;
    Object.assign(res, {
      statusCode: 200,
      statusMessage: "OK",
      locals: {},
      headersSent: false,
      writableEnded: false,
      setHeader(name: string, value: unknown) {
        headersMap.set(name.toLowerCase(), value);
      },
      getHeader(name: string) {
        return headersMap.get(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(headersMap);
      },
      removeHeader(name: string) {
        headersMap.delete(name.toLowerCase());
      },
      hasHeader(name: string) {
        return headersMap.has(name.toLowerCase());
      },
      writeHead(statusCode: number, maybeHeaders?: Record<string, unknown>) {
        this.statusCode = statusCode;
        if (maybeHeaders && typeof maybeHeaders === "object") {
          for (const [name, value] of Object.entries(maybeHeaders)) {
            this.setHeader(name, value);
          }
        }
        return this;
      },
      write(chunk: unknown) {
        if (chunk !== undefined) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        return true;
      },
      end(chunk?: unknown) {
        if (chunk !== undefined) {
          this.write(chunk);
        }

        this.headersSent = true;
        this.writableEnded = true;
        (res as unknown as EventEmitter).emit("finish");

        const rawBody = Buffer.concat(chunks).toString("utf8");
        const contentType = String(this.getHeader("content-type") || "").toLowerCase();

        let parsedBody: unknown = rawBody;
        if (!rawBody) {
          parsedBody = null;
        } else if (contentType.includes("application/json")) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            parsedBody = rawBody;
          }
        }

        resolve({
          status: this.statusCode,
          headers: this.getHeaders(),
          body: parsedBody,
          rawBody,
        });

        return this;
      },
    });

    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${request.method} ${request.url}`));
    }, 5000);

    const originalEnd = res.end.bind(res);
    res.end = ((chunk?: unknown) => {
      clearTimeout(timeout);
      return originalEnd(chunk);
    }) as express.Response["end"];

    (app as unknown as AppWithHandle).handle(req, res, (error?: unknown) => {
      clearTimeout(timeout);
      if (error) {
        reject(error);
        return;
      }

      if (!res.headersSent) {
        resolve({ status: 404, headers: {}, body: null, rawBody: "" });
      }
    });
  });
}
