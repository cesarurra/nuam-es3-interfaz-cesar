import http from "node:http";
import {
  createSessionStore,
  hashPassword,
  isValidCsrf,
  verifyPassword
} from "./auth.js";

const COOKIE_NAME = "nuam_sid";
const SCALE = 100000000n;
const COLUMNS = Array.from({ length: 30 }, (_, i) => i + 8);
const VALID_MARKETS = new Set(["Chile", "Perú", "Colombia"]);

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

function parseDecimalToUnits(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} debe enviarse como texto decimal.`);
  }
  const normalized = value.trim().replace(",", ".");
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,8})?$/.test(normalized)) {
    throw new Error(`${label} tiene un formato decimal inválido.`);
  }
  const [intPart, fracPart = ""] = normalized.split(".");
  return BigInt(intPart) * SCALE + BigInt(fracPart.padEnd(8, "0"));
}

function formatUnits(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const intPart = abs / SCALE;
  const fracPart = String(abs % SCALE).padStart(8, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

function divideAndRound8(numeratorUnits, denominatorUnits) {
  // numeratorUnits y denominatorUnits están en escala 1e8; su cociente ya es adimensional,
  // por lo que multiplicamos por SCALE para expresarlo con 8 decimales.
  const scaled = numeratorUnits * SCALE;
  const quotient = scaled / denominatorUnits;
  const remainder = scaled % denominatorUnits;
  if (remainder * 2n >= denominatorUnits) {
    return quotient + 1n;
  }
  return quotient;
}

function calculateFactorsFromAmounts(rawAmounts) {
  if (!rawAmounts || typeof rawAmounts !== "object" || Array.isArray(rawAmounts)) {
    throw new Error("Debes enviar un objeto amounts válido.");
  }

  const amountUnits = {};
  for (const col of COLUMNS) {
    amountUnits[col] = parseDecimalToUnits(rawAmounts[col] ?? "0", `Monto ${col}`);
  }

  let totalUnits = 0n;
  for (let col = 8; col <= 19; col++) {
    totalUnits += amountUnits[col];
  }

  if (totalUnits <= 0n) {
    throw new Error("La suma de los montos 8–19 debe ser mayor que cero.");
  }

  const factors = {};
  for (let col = 8; col <= 33; col++) {
    factors[col] = formatUnits(divideAndRound8(amountUnits[col], totalUnits));
  }

  return {
    total: formatUnits(totalUnits),
    factors,
    warnings: []
  };
}

function computeSum8To16(record) {
  let sumUnits = 0n;
  for (let col = 8; col <= 16; col++) {
    sumUnits += parseDecimalToUnits(record.factors?.[col] ?? "0.00000000", `Factor ${col}`);
  }
  return formatUnits(sumUnits);
}

function toListItem(record) {
  return {
    id: record.id,
    instrument: record.instrument,
    sequence: record.sequence,
    year: record.year,
    market: record.market,
    origin: record.origin,
    source: record.source,
    sum: computeSum8To16(record),
    updatedAt: record.updatedAt
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

  const baseFactors = Object.fromEntries(COLUMNS.map((c) => [c, "0.00000000"]));
  baseFactors[8] = "0.52277431";
  baseFactors[9] = "0.17400052";
  baseFactors[11] = "0.30322517";

  const baseAmounts = Object.fromEntries(COLUMNS.map((c) => [c, "0.00000000"]));
  baseAmounts[8] = "192770580.00000000";
  baseAmounts[9] = "64161878.00000000";
  baseAmounts[11] = "111812860.00000000";
  baseAmounts[25] = "71298705.00000000";
  baseAmounts[30] = "15837333.00000000";

  const records = new Map([
    [
      "rec-a-1",
      {
        id: "rec-a-1",
        tenantId: "tenant-a",
        instrument: "DEMO-CESAR",
        sequence: "1",
        year: "2026",
        market: "Chile",
        origin: "Corredor",
        source: "Manual",
        paymentDate: "2026-11-17",
        registered: false,
        version: 1,
        amounts: { ...baseAmounts },
        factors: { ...baseFactors },
        updatedAt: "2026-11-17T18:00:00.000Z"
      }
    ],
    [
      "rec-b-1",
      {
        id: "rec-b-1",
        tenantId: "tenant-b",
        instrument: "OTRO-CORREDOR",
        sequence: "2",
        year: "2026",
        market: "Perú",
        origin: "Corredor",
        source: "Manual",
        paymentDate: "2026-11-17",
        registered: true,
        version: 1,
        amounts: { ...baseAmounts },
        factors: { ...baseFactors },
        updatedAt: "2026-11-17T18:05:00.000Z"
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
        return sendJson(res, 400, { error: "Credenciales inválidas." });
      }
      const user = users.get(body.email.trim().toLowerCase());
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        return sendJson(res, 401, { error: "Correo o contraseña incorrectos." });
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
      return sendJson(res, 401, { error: "No autenticado." });
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

    if (method === "GET" && pathname === "/api/records") {
      const q = (url.searchParams.get("q") || "").trim().toUpperCase();
      const market = (url.searchParams.get("market") || "").trim();
      const year = (url.searchParams.get("year") || "").trim();

      if (q.length > 40) {
        return sendJson(res, 400, { error: "El filtro de instrumento admite hasta 40 caracteres." });
      }
      if (market && !VALID_MARKETS.has(market)) {
        return sendJson(res, 400, { error: "Mercado inválido." });
      }
      if (year && !/^20\d{2}$/.test(year)) {
        return sendJson(res, 400, { error: "El ejercicio debe ser un año entre 2000 y 2099." });
      }

      const filtered = [...records.values()]
        .filter((item) => item.tenantId === session.user.tenantId)
        .filter((item) => (!q ? true : item.instrument.toUpperCase().includes(q)))
        .filter((item) => (!market ? true : item.market === market))
        .filter((item) => (!year ? true : item.year === year))
        .map(toListItem);

      return sendJson(res, 200, filtered);
    }

    if (method === "POST" && pathname === "/api/calculate") {
      const csrfHeader = req.headers["x-csrf-token"];
      if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
        return sendJson(res, 403, { error: "Token CSRF inválido." });
      }
      const body = await readJsonBody(req);
      if (!body) {
        return sendJson(res, 400, { error: "JSON inválido en la solicitud de cálculo." });
      }
      try {
        const result = calculateFactorsFromAmounts(body.amounts);
        return sendJson(res, 200, result);
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }

    const matchRecord = pathname.match(/^\/api\/records\/([^/]+)$/);
    if (matchRecord) {
      const recordId = matchRecord[1];
      const record = records.get(recordId);
      if (!record) {
        return sendJson(res, 404, { error: "Registro no encontrado." });
      }

      if (session.user.role === "auditor") {
        return sendJson(res, 403, { error: "El rol auditor no accede a detalle financiero." });
      }

      if (record.tenantId !== session.user.tenantId) {
        return sendJson(res, 403, { error: "Sin permiso para operar sobre este corredor." });
      }

      if (method === "GET") {
        return sendJson(res, 200, record);
      }

      if (method === "PUT" || method === "DELETE") {
        const csrfHeader = req.headers["x-csrf-token"];
        if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
          return sendJson(res, 403, { error: "Token CSRF inválido." });
        }
        if (method === "DELETE") {
          records.delete(recordId);
          return sendJson(res, 200, { ok: true });
        }
        return sendJson(res, 200, record);
      }
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  });
}
