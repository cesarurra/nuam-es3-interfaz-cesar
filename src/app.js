import http from "node:http";
import crypto from "node:crypto";
import {
  createSessionStore,
  isValidCsrf,
  verifyPassword
} from "./auth.js";
import { createMemoryStore } from "./store.js";

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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      if (raw.length > 2_000_000) {
        reject(new Error("Cuerpo demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function parseDecimalToUnits(value, label, { maxOne = false } = {}) {
  if (typeof value !== "string") {
    throw new Error(`${label} debe enviarse como texto decimal.`);
  }
  const normalized = value.trim().replace(",", ".");
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,8})?$/.test(normalized)) {
    throw new Error(`${label} tiene un formato decimal inválido.`);
  }
  const [intPart, fracPart = ""] = normalized.split(".");
  const units = BigInt(intPart) * SCALE + BigInt(fracPart.padEnd(8, "0"));
  if (maxOne && units > SCALE) {
    throw new Error(`${label} no puede superar 1.`);
  }
  return units;
}

function formatUnits(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const intPart = abs / SCALE;
  const fracPart = String(abs % SCALE).padStart(8, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

function divideAndRound8(numeratorUnits, denominatorUnits) {
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

function validateRecordPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Cuerpo JSON inválido.");
  }

  const instrument = String(body.instrument || "").trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,40}$/.test(instrument)) {
    throw new Error("Instrumento inválido.");
  }

  const year = String(body.year || "").trim();
  if (!/^20\d{2}$/.test(year)) {
    throw new Error("Ejercicio inválido (debe estar entre 2000 y 2099).");
  }

  const market = String(body.market || "").trim();
  if (!VALID_MARKETS.has(market)) {
    throw new Error("Mercado inválido.");
  }

  const sequence = String(body.sequence || "").trim();
  if (!/^[1-9]\d{0,5}$/.test(sequence)) {
    throw new Error("Secuencia inválida (entero entre 1 y 999999).");
  }

  const paymentDate = String(body.paymentDate || "").trim();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) ||
    !Number.isFinite(Date.parse(paymentDate)) ||
    new Date(paymentDate).toISOString().slice(0, 10) !== paymentDate
  ) {
    throw new Error("Fecha de pago inválida.");
  }

  if (typeof body.registered !== "boolean") {
    throw new Error("Indica si el instrumento está inscrito.");
  }

  if (!body.amounts || typeof body.amounts !== "object" || Array.isArray(body.amounts)) {
    throw new Error("Debes enviar los montos de las columnas 8–37.");
  }

  if (!body.factors || typeof body.factors !== "object" || Array.isArray(body.factors)) {
    throw new Error("Debes enviar los factores de las columnas 8–37.");
  }

  const amounts = {};
  const factorUnitsMap = {};
  const factors = {};

  for (const col of COLUMNS) {
    const amtUnits = parseDecimalToUnits(body.amounts[col] ?? "0", `Monto ${col}`);
    amounts[col] = formatUnits(amtUnits);

    const facUnits = parseDecimalToUnits(body.factors[col] ?? "0.00000000", `Factor ${col}`, {
      maxOne: true
    });
    factorUnitsMap[col] = facUnits;
    factors[col] = formatUnits(facUnits);
  }

  let total8To19 = 0n;
  for (let col = 8; col <= 19; col++) {
    total8To19 += parseDecimalToUnits(amounts[col], `Monto ${col}`);
  }
  if (total8To19 <= 0n) {
    throw new Error("El total de montos 8–19 debe ser mayor que cero.");
  }

  let sum8To16 = 0n;
  for (let col = 8; col <= 16; col++) {
    sum8To16 += factorUnitsMap[col];
  }
  if (sum8To16 > SCALE) {
    throw new Error("La suma de factores 8–16 supera 1.");
  }

  return {
    instrument,
    year,
    market,
    sequence,
    paymentDate,
    registered: body.registered,
    amounts,
    factors
  };
}

function splitCsvLine(line, delimiter) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvRows(csvText) {
  if (typeof csvText !== "string") {
    throw new Error("Debes enviar contenido CSV en texto.");
  }
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) {
    throw new Error("El archivo CSV está vacío.");
  }

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("No hay filas válidas en el CSV.");
  }

  const firstLine = lines[0];
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  const firstFields = splitCsvLine(firstLine, delimiter).map((f) => f.toLowerCase());
  const hasHeader =
    firstFields[0] === "instrument" ||
    firstFields[0] === "instrumento" ||
    firstFields.includes("year") ||
    firstFields.includes("ejercicio");

  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (dataLines.length === 0) {
    throw new Error("El CSV no contiene registros de datos.");
  }

  return dataLines.map((line, idx) => {
    const lineNumber = hasHeader ? idx + 2 : idx + 1;
    const cols = splitCsvLine(line, delimiter);
    if (cols.length < 6) {
      throw new Error(`Fila ${lineNumber}: faltan columnas obligatorias.`);
    }

    const [instrument, year, market, sequence, paymentDate, registeredRaw, ...rest] = cols;
    const regNormalized = String(registeredRaw || "").trim().toLowerCase();
    let registered;
    if (["true", "1", "si", "sí"].includes(regNormalized)) {
      registered = true;
    } else if (["false", "0", "no"].includes(regNormalized)) {
      registered = false;
    } else {
      throw new Error(`Fila ${lineNumber}: valor de inscripción inválido.`);
    }

    const amounts = {};
    const factors = {};

    for (let i = 0; i < COLUMNS.length; i++) {
      const colNum = COLUMNS[i];
      const rawAmt = rest[i];
      if (rawAmt === undefined || rawAmt === "") {
        throw new Error(`Fila ${lineNumber}: falta monto ${colNum}.`);
      }
      amounts[colNum] = rawAmt;

      const rawFac = rest[COLUMNS.length + i];
      if (rawFac !== undefined && rawFac !== "") {
        factors[colNum] = rawFac;
      }
    }

    let computedFactors = factors;
    if (Object.keys(factors).length === 0) {
      computedFactors = calculateFactorsFromAmounts(amounts).factors;
    } else {
      for (const colNum of COLUMNS) {
        if (computedFactors[colNum] === undefined) {
          computedFactors[colNum] = "0.00000000";
        }
      }
    }

    return {
      lineNumber,
      payload: validateRecordPayload({
        instrument,
        year,
        market,
        sequence,
        paymentDate,
        registered,
        amounts,
        factors: computedFactors
      })
    };
  });
}

function recordKey(item) {
  return `${item.tenantId}::${item.instrument}::${item.year}::${item.market}::${item.sequence}`;
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

export function createApp({
  storage = "firestore",
  setupRequired = false,
  store = createMemoryStore()
} = {}) {
  const sessions = createSessionStore();

  async function logAudit(entry) {
    await store.appendAudit(entry);
  }

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
      const normalizedEmail = body.email.trim().toLowerCase();
      const user = await store.findUserByEmail(normalizedEmail);
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        await logAudit({
          action: "LOGIN_FAILED",
          actorId: user ? user.id : null,
          actorRole: user ? user.role : null,
          tenantId: user ? user.tenantId : null,
          targetId: null,
          detail: "Intento de inicio de sesión rechazado."
        });
        return sendJson(res, 401, { error: "Correo o contraseña incorrectos." });
      }
      const created = sessions.create(user);
      await logAudit({
        action: "LOGIN",
        actorId: user.id,
        actorRole: user.role,
        tenantId: user.tenantId,
        targetId: null,
        detail: "Inicio de sesión correcto."
      });
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
      await logAudit({
        action: "LOGOUT",
        actorId: session.user.id,
        actorRole: session.user.role,
        tenantId: session.user.tenantId,
        targetId: null,
        detail: "Cierre de sesión."
      });
      return sendJson(
        res,
        200,
        { ok: true },
        { "Set-Cookie": clearCookie(COOKIE_NAME) }
      );
    }

    if (method === "GET" && pathname === "/api/audit") {
      const allEvents = await store.listAudit();
      const visibleEvents =
        session.user.role === "auditor"
          ? allEvents
          : allEvents.filter((evt) => evt.tenantId === session.user.tenantId);
      return sendJson(res, 200, visibleEvents);
    }

    if (method === "POST" && pathname === "/api/import") {
      if (session.user.role !== "broker") {
        await logAudit({
          action: "FORBIDDEN",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId: session.user.tenantId,
          targetId: null,
          detail: "Intento de importar CSV sin rol de corredor."
        });
        return sendJson(res, 403, { error: "Solo un corredor puede importar registros." });
      }
      const csrfHeader = req.headers["x-csrf-token"];
      if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
        return sendJson(res, 403, { error: "Token CSRF inválido." });
      }

      const contentType = String(req.headers["content-type"] || "");
      let csvText = "";
      if (contentType.includes("application/json")) {
        const body = await readJsonBody(req);
        if (!body || typeof body.csv !== "string") {
          return sendJson(res, 400, { error: "Debes enviar el campo csv como texto." });
        }
        csvText = body.csv;
      } else {
        csvText = await readRawBody(req);
      }

      let parsedRows;
      try {
        parsedRows = parseCsvRows(csvText);
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }

      const tenantId = session.user.tenantId;
      const existingRecords = await store.listRecords();
      const created = [];
      const errors = [];

      for (const item of parsedRows) {
        const duplicate = existingRecords.some(
          (existing) => recordKey(existing) === recordKey({ ...item.payload, tenantId })
        );
        if (duplicate) {
          errors.push({
            line: item.lineNumber,
            status: 409,
            error: `Llave duplicada para ${item.payload.instrument}/${item.payload.sequence}.`
          });
          continue;
        }

        const id = `rec-${crypto.randomUUID()}`;
        const record = await store.createRecord({
          id,
          tenantId,
          ...item.payload,
          origin: "Corredor",
          source: "CSV",
          version: 1,
          updatedAt: new Date().toISOString()
        });
        existingRecords.push(record);
        created.push(record);
      }

      if (created.length === 0) {
        const firstStatus = errors[0]?.status === 409 ? 409 : 400;
        return sendJson(res, firstStatus, {
          error: errors[0]?.error || "No se pudo importar ninguna fila.",
          imported: 0,
          created: [],
          errors
        });
      }

      await logAudit({
        action: "RECORD_IMPORT",
        actorId: session.user.id,
        actorRole: session.user.role,
        tenantId,
        targetId: null,
        detail: `Importados ${created.length} registros por CSV (errores: ${errors.length}).`
      });

      return sendJson(res, 201, {
        imported: created.length,
        created,
        errors
      });
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

      const allRecords = await store.listRecords();
      const filtered = allRecords
        .filter((item) => item.tenantId === session.user.tenantId || item.tenantId === "BOLSA")
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

    if (method === "POST" && pathname === "/api/records") {
      if (session.user.role !== "broker") {
        await logAudit({
          action: "FORBIDDEN",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId: session.user.tenantId,
          targetId: null,
          detail: "Intento de crear registro sin rol de corredor."
        });
        return sendJson(res, 403, { error: "Solo un corredor puede crear registros." });
      }
      const csrfHeader = req.headers["x-csrf-token"];
      if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
        return sendJson(res, 403, { error: "Token CSRF inválido." });
      }
      const body = await readJsonBody(req);
      try {
        const validated = validateRecordPayload(body);
        const tenantId = session.user.tenantId;
        const existingRecords = await store.listRecords();
        const duplicate = existingRecords.some(
          (existing) => recordKey(existing) === recordKey({ ...validated, tenantId })
        );
        if (duplicate) {
          await logAudit({
            action: "CONFLICT",
            actorId: session.user.id,
            actorRole: session.user.role,
            tenantId,
            targetId: null,
            detail: `Llave duplicada para ${validated.instrument}/${validated.sequence}.`
          });
          return sendJson(res, 409, { error: "Ya existe un registro con esa llave para este corredor." });
        }

        const id = `rec-${crypto.randomUUID()}`;
        const createdRecord = await store.createRecord({
          id,
          tenantId,
          ...validated,
          origin: "Corredor",
          source: "Manual",
          version: 1,
          updatedAt: new Date().toISOString()
        });
        await logAudit({
          action: "RECORD_CREATE",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId,
          targetId: id,
          detail: `Creado ${createdRecord.instrument} (${createdRecord.year}/${createdRecord.sequence}) v1.`
        });
        return sendJson(res, 201, createdRecord);
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }

    const matchRecord = pathname.match(/^\/api\/records\/([^/]+)$/);
    if (matchRecord) {
      const recordId = matchRecord[1];
      const record = await store.getRecordById(recordId);
      if (!record) {
        return sendJson(res, 404, { error: "Registro no encontrado." });
      }

      if (session.user.role === "auditor") {
        await logAudit({
          action: "FORBIDDEN",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId: session.user.tenantId,
          targetId: recordId,
          detail: "Auditor intentó acceder a detalle/operación financiera."
        });
        return sendJson(res, 403, { error: "El rol auditor no accede a detalle ni escritura financiera." });
      }

      if (method === "GET") {
        if (record.tenantId !== session.user.tenantId && record.tenantId !== "BOLSA") {
          await logAudit({
            action: "FORBIDDEN",
            actorId: session.user.id,
            actorRole: session.user.role,
            tenantId: session.user.tenantId,
            targetId: recordId,
            detail: "Intento de leer registro de otro corredor."
          });
          return sendJson(res, 403, { error: "Sin permiso para consultar este registro." });
        }
        return sendJson(res, 200, record);
      }

      if (record.tenantId !== session.user.tenantId) {
        await logAudit({
          action: "FORBIDDEN",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId: session.user.tenantId,
          targetId: recordId,
          detail: "Intento de modificar o eliminar registro ajeno o de referencia."
        });
        return sendJson(res, 403, { error: "Sin permiso para modificar o eliminar este registro." });
      }

      const csrfHeader = req.headers["x-csrf-token"];
      if (!isValidCsrf(session, Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader)) {
        return sendJson(res, 403, { error: "Token CSRF inválido." });
      }

      if (method === "PUT") {
        const body = await readJsonBody(req);
        if (!body || !Number.isSafeInteger(body.version) || body.version < 1) {
          return sendJson(res, 400, { error: "Debes indicar la versión vigente del registro." });
        }
        if (body.version !== record.version) {
          await logAudit({
            action: "CONFLICT",
            actorId: session.user.id,
            actorRole: session.user.role,
            tenantId: record.tenantId,
            targetId: recordId,
            detail: `Conflicto de versión en PUT (enviada ${body.version}, vigente ${record.version}).`
          });
          return sendJson(res, 409, { error: "Conflicto de versión: el registro fue modificado." });
        }
        try {
          const validated = validateRecordPayload(body);
          const existingRecords = await store.listRecords();
          const duplicate = existingRecords.some(
            (existing) =>
              existing.id !== record.id &&
              recordKey(existing) === recordKey({ ...validated, tenantId: record.tenantId })
          );
          if (duplicate) {
            await logAudit({
              action: "CONFLICT",
              actorId: session.user.id,
              actorRole: session.user.role,
              tenantId: record.tenantId,
              targetId: recordId,
              detail: "Conflicto por llave duplicada al actualizar."
            });
            return sendJson(res, 409, { error: "Ya existe otro registro con esa llave." });
          }

          const nextVersion = record.version + 1;
          const updatedRecord = await store.updateRecord({
            ...record,
            ...validated,
            tenantId: record.tenantId,
            origin: record.origin,
            version: nextVersion,
            updatedAt: new Date().toISOString()
          });
          await logAudit({
            action: "RECORD_UPDATE",
            actorId: session.user.id,
            actorRole: session.user.role,
            tenantId: record.tenantId,
            targetId: recordId,
            detail: `Actualizado ${updatedRecord.instrument} a v${nextVersion}.`
          });
          return sendJson(res, 200, updatedRecord);
        } catch (error) {
          return sendJson(res, 400, { error: error.message });
        }
      }

      if (method === "DELETE") {
        const body = await readJsonBody(req);
        if (!body || !Number.isSafeInteger(body.version) || body.version < 1) {
          return sendJson(res, 400, { error: "Debes indicar la versión vigente para eliminar." });
        }
        if (body.version !== record.version) {
          await logAudit({
            action: "CONFLICT",
            actorId: session.user.id,
            actorRole: session.user.role,
            tenantId: record.tenantId,
            targetId: recordId,
            detail: `Conflicto de versión en DELETE (enviada ${body.version}, vigente ${record.version}).`
          });
          return sendJson(res, 409, { error: "Conflicto de versión: no se puede eliminar con versión antigua." });
        }
        await store.deleteRecord(recordId);
        await logAudit({
          action: "RECORD_DELETE",
          actorId: session.user.id,
          actorRole: session.user.role,
          tenantId: record.tenantId,
          targetId: recordId,
          detail: `Eliminado ${record.instrument} (${record.year}/${record.sequence}).`
        });
        return sendJson(res, 200, { ok: true });
      }
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  });
}
