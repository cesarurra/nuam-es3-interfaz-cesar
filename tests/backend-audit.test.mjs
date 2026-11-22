import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function startServer() {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

test("auditoria registra operaciones y aisla eventos por corredor o rol auditor", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  // Sin sesion -> 401
  const sinSesion = await fetch(`${baseUrl}/api/audit`);
  assert.equal(sinSesion.status, 401);

  // Login Corredor A
  const loginA = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "DemoNuam2026!" })
  });
  const { csrf } = await loginA.json();
  const cookieA = (loginA.headers.get("set-cookie") || "").split(";")[0];

  // Crear registro genera evento RECORD_CREATE
  const amounts = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 8, "0.00000000"]));
  amounts[8] = "100.00000000";
  const factors = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 8, "0.00000000"]));
  factors[8] = "1.00000000";

  const createRes = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieA,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({
      instrument: "AUD-TEST",
      year: "2026",
      market: "Chile",
      sequence: "7",
      paymentDate: "2026-11-17",
      registered: true,
      amounts,
      factors
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  // Eliminar registro genera evento RECORD_DELETE
  const delRes = await fetch(`${baseUrl}/api/records/${created.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieA,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({ version: created.version })
  });
  assert.equal(delRes.status, 200);

  // Corredor A ve sus eventos
  const auditA = await fetch(`${baseUrl}/api/audit`, {
    headers: { Cookie: cookieA }
  });
  assert.equal(auditA.status, 200);
  const eventsA = await auditA.json();
  assert.ok(eventsA.some((e) => e.action === "RECORD_CREATE" && e.targetId === created.id));
  assert.ok(eventsA.some((e) => e.action === "RECORD_DELETE" && e.targetId === created.id));
  assert.ok(eventsA.every((e) => e.tenantId === "tenant-a"));

  // Corredor B no ve eventos de Corredor A
  const loginB = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "corredor.b@demo.local", password: "DemoNuam2026!" })
  });
  const cookieB = (loginB.headers.get("set-cookie") || "").split(";")[0];
  const auditB = await fetch(`${baseUrl}/api/audit`, {
    headers: { Cookie: cookieB }
  });
  const eventsB = await auditB.json();
  assert.ok(!eventsB.some((e) => e.targetId === created.id));

  // Auditor puede consultar eventos de auditoria
  const loginAud = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "auditor@demo.local", password: "DemoNuam2026!" })
  });
  const cookieAud = (loginAud.headers.get("set-cookie") || "").split(";")[0];
  const auditAll = await fetch(`${baseUrl}/api/audit`, {
    headers: { Cookie: cookieAud }
  });
  assert.equal(auditAll.status, 200);
  const eventsAll = await auditAll.json();
  assert.ok(eventsAll.some((e) => e.action === "RECORD_DELETE" && e.targetId === created.id));
});
