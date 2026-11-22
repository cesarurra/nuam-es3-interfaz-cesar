import crypto from "node:crypto";

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function createSessionStore({ ttlMs = 1000 * 60 * 60 * 8 } = {}) {
  const sessions = new Map();

  function create(user) {
    const token = crypto.randomBytes(32).toString("hex");
    const csrfToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = Date.now() + ttlMs;
    sessions.set(token, {
      token,
      csrfToken,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });
    return { token, csrfToken, expiresAt };
  }

  function get(token) {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session;
  }

  function destroy(token) {
    if (token) {
      sessions.delete(token);
    }
  }

  return { create, get, destroy };
}

export function isValidCsrf(session, headerValue) {
  if (!session || typeof headerValue !== "string" || !headerValue) {
    return false;
  }
  const a = Buffer.from(session.csrfToken, "utf8");
  const b = Buffer.from(headerValue, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
