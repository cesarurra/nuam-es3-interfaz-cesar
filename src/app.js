import http from "node:http";
import {
  createSessionStore,
  hashPassword,
  isValidCsrf,
  verifyPassword
} from "./auth.js";

const COOKIE_NAME = "nuam_sid";

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const map = new Map();
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      map.set(key, decodeURIComponent(val));
    }
  }
  return map;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      if (raw.length > 1_000_000) {
        reject(new Error("Cuerpo demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on("error", reject);
  });
}

function buildCookie(name, value, { maxAgeSec = 28800 } = {}) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

function clearCookie(name) {
  return `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function sessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId
  };
}

export function createApp({ storage = "firestore", setupRequired = false } = {}) {
  const sessions = createSessionStore();
  const demoPasswordHash = hashPassword("DemoNuam2026!");

  const users = new Map([
    [
      "cesar@demo.local",
      {
        id: "u-broker-a",
        name: "Corredor A",
        email: "cesar@demo.local",
        role: "broker",
        tenantId: "tenant-a",
        passwordHash: demoPasswordHash
      }
    ],
    [
      "corredor.b@demo.local",
      {
        id: "u-broker-b",
        name: "Corredor B",
        email: "corredor.b@demo.local",
        role: "broker",
        tenantId: "tenant-b",
        passwordHash: demoPasswordHash
      }
    ],
    [
      "auditor@demo.local",
      {
        id: "u-auditor-1",
        name: "Auditor",
        email: "auditor@demo.local",
        role: "auditor",
        tenantId: "tenant-audit",
        passwordHash: demoPasswordHash
      }
    ]
  ]);

  const records = new Map([
    [
      "rec-a-1",
      {
        id: "rec-a-1",
        tenantId: "tenant-a",
        instrument: "DEMO-CESAR",
        version: 1,
        amounts: { "8": "100.00000000" },
        factors: { "8": "1.00000000" }
      }
    ]
  ]);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1:3000");
    const pathname = url.pathname;
    const method = req.method || "GET";
    const cookies = parseCookies(req);
    const session = sessions.get(cookies.get(COOKIE_NAME));

    if (method === "GET" && pathname === "/api/status") {
      return sendJson(res, 200, { setupRequired, storage });
    }

    if (method === "POST" && pathname === "/api/login") {
      const body = await readJsonBody(req);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
        return sendJson(res, 400, { error: "Credenciales invalidas" });
      }
      const user = users.get(body.email.trim().toLowerCase());
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        return sendJson(res, 401, { error: "Correo o contrasena incorrectos" });
      }
      const created = sessions.create(user);
      return sendJson(
        res,
        200,
        {
          user: sessionUser(user),
          csrf: created.csrfToken
        },
        { "Set-Cookie": buildCookie(COOKIE_NAME, created.token) }
      );
    }

    if (!session) {
      return sendJson(res, 401, { error: "No autenticado" });
    }

    if (method === "GET" && pathname === "/api/me") {
      return sendJson(res, 200, {
        user: session.user,
        csrf: session.csrfToken
      });
    }

    if (method === "POST" && pathname === "/api/logout") {
      sessions.destroy(cookies.get(COOKIE_NAME));
      return sendJson(
        res,
        200,
        { ok: true },
        { "Set-Cookie": clearCookie(COOKIE_NAME) }
      );
    }

    const matchRecord = pathname.match(/^\/api\/records\/([^/]+)$/);
    if (matchRecord) {
      const recordId = matchRecord[1];
      const record = records.get(recordId);
      if (!record) {
        return sendJson(res, 404, { error: "Registro no encontrado" });
      }

      if (session.user.role === "auditor") {
        return sendJson(res, 403, { error: "El rol auditor no accede a detalle financiero" });
      }

      if (record.tenantId !== session.user.tenantId) {
        return sendJson(res, 403, { error: "Sin permiso para operar sobre este corredor" });
      }

      if (method === "GET") {
        return sendJson(res, 200, record);
      }

      if (method === "PUT" || method === "DELETE") {
        const csrfHeader = req.headers["x-csrf-token"];
        if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
          return sendJson(res, 403, { error: "Token CSRF invalido" });
        }
        if (method === "DELETE") {
          records.delete(recordId);
          return sendJson(res, 200, { ok: true });
        }
        return sendJson(res, 200, record);
      }
    }

    return sendJson(res, 404, { error: "Ruta no encontrada" });
  });
}
