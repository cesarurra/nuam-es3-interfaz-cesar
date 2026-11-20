import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function startServer() {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return { server, baseUrl };
}

test("flujo sesion, CSRF, aislamiento corredor A/B y rol auditor", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  // 1. /api/me sin sesion -> 401
  const meSinSesion = await fetch(`${baseUrl}/api/me`);
  assert.equal(meSinSesion.status, 401);

  // 2. Login incorrecto -> 401 generico
  const loginMalo = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "malapassword" })
  });
  assert.equal(loginMalo.status, 401);

  // 3. Login correcto Corredor A
  const loginA = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "DemoNuam2026!" })
  });
  assert.equal(loginA.status, 200);
  const dataA = await loginA.json();
  const cookieA = (loginA.headers.get("set-cookie") || "").split(";")[0];
  assert.equal(dataA.user.role, "broker");
  assert.equal(dataA.user.tenantId, "tenant-a");

  // 4. Escritura con CSRF invalido -> 403
  const borrarSinCsrf = await fetch(`${baseUrl}/api/records/rec-a-1`, {
    method: "DELETE",
    headers: {
      Cookie: cookieA,
      "X-CSRF-Token": "token-falso"
    }
  });
  assert.equal(borrarSinCsrf.status, 403);

  // 5. Corredor B intenta leer registro de Corredor A -> 403
  const loginB = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "corredor.b@demo.local", password: "DemoNuam2026!" })
  });
  const cookieB = (loginB.headers.get("set-cookie") || "").split(";")[0];
  const leerDeA = await fetch(`${baseUrl}/api/records/rec-a-1`, {
    headers: { Cookie: cookieB }
  });
  assert.equal(leerDeA.status, 403);

  // 6. Auditor intenta leer registro financiero -> 403
  const loginAud = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "auditor@demo.local", password: "DemoNuam2026!" })
  });
  const cookieAud = (loginAud.headers.get("set-cookie") || "").split(";")[0];
  const leerAud = await fetch(`${baseUrl}/api/records/rec-a-1`, {
    headers: { Cookie: cookieAud }
  });
  assert.equal(leerAud.status, 403);

  // 7. Logout invalida cookie
  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: "POST",
    headers: {
      Cookie: cookieA,
      "X-CSRF-Token": dataA.csrf
    }
  });
  assert.equal(logoutRes.status, 200);
});
