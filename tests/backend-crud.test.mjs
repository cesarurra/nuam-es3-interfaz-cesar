import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function startServer() {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

function samplePayload(overrides = {}) {
  const amounts = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 8, "0.00000000"]));
  amounts[8] = "100.00000000";
  const factors = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 8, "0.00000000"]));
  factors[8] = "1.00000000";
  return {
    instrument: "NUEVO-ACT",
    year: "2026",
    market: "Chile",
    sequence: "10",
    paymentDate: "2026-11-17",
    registered: true,
    tenantId: "BOLSA",
    origin: "Bolsa",
    amounts,
    factors,
    ...overrides
  };
}

test("CRUD completo, versionado 409 y proteccion de referencia BOLSA", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "DemoNuam2026!" })
  });
  const { csrf } = await login.json();
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

  // 1. Crear registro (201) ignora tenantId/origin del cliente y asigna version 1
  const createdRes = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify(samplePayload())
  });
  assert.equal(createdRes.status, 201);
  const created = await createdRes.json();
  assert.equal(created.tenantId, "tenant-a");
  assert.equal(created.origin, "Corredor");
  assert.equal(created.version, 1);

  // 2. Actualizar con version vigente -> version 2
  const putOk = await fetch(`${baseUrl}/api/records/${created.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify(samplePayload({ version: 1, sequence: "11" }))
  });
  assert.equal(putOk.status, 200);
  const updated = await putOk.json();
  assert.equal(updated.version, 2);

  // 3. Actualizar con version antigua (1) -> 409
  const putConflict = await fetch(`${baseUrl}/api/records/${created.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify(samplePayload({ version: 1, sequence: "12" }))
  });
  assert.equal(putConflict.status, 409);

  // 4. Referencia BOLSA se puede leer (200) pero no editar ni borrar (403)
  const bolsaGet = await fetch(`${baseUrl}/api/records/ref-bolsa-1`, {
    headers: { Cookie: cookie }
  });
  assert.equal(bolsaGet.status, 200);

  const bolsaDel = await fetch(`${baseUrl}/api/records/ref-bolsa-1`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({ version: 1 })
  });
  assert.equal(bolsaDel.status, 403);

  // 5. Eliminar registro propio con version vigente (2) -> 200
  const delOk = await fetch(`${baseUrl}/api/records/${created.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({ version: 2 })
  });
  assert.equal(delOk.status, 200);
  assert.deepEqual(await delOk.json(), { ok: true });
});
