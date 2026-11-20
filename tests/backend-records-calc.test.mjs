import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function startServer() {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

test("GET /api/records filtra por tenant de sesion y parametros q/market/year", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const loginA = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "DemoNuam2026!" })
  });
  assert.equal(loginA.status, 200);
  const cookieA = (loginA.headers.get("set-cookie") || "").split(";")[0];

  const listAll = await fetch(`${baseUrl}/api/records`, {
    headers: { Cookie: cookieA }
  });
  assert.equal(listAll.status, 200);
  const rows = await listAll.json();
  const demoRow = rows.find((item) => item.instrument === "DEMO-CESAR");
  assert.ok(demoRow);
  assert.equal(demoRow.sum, "1.00000000");

  const filtered = await fetch(`${baseUrl}/api/records?q=DEMO&market=Chile&year=2026`, {
    headers: { Cookie: cookieA }
  });
  assert.equal(filtered.status, 200);
  const filteredRows = await filtered.json();
  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].instrument, "DEMO-CESAR");

  const noMatch = await fetch(`${baseUrl}/api/records?q=NO-EXISTE`, {
    headers: { Cookie: cookieA }
  });
  assert.equal(noMatch.status, 200);
  assert.deepEqual(await noMatch.json(), []);
});

test("POST /api/calculate exige CSRF y calcula total y factores en decimales de 8 cifras", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const loginA = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cesar@demo.local", password: "DemoNuam2026!" })
  });
  const { csrf } = await loginA.json();
  const cookieA = (loginA.headers.get("set-cookie") || "").split(";")[0];

  const sinCsrf = await fetch(`${baseUrl}/api/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieA
    },
    body: JSON.stringify({ amounts: { 8: "100.00000000" } })
  });
  assert.equal(sinCsrf.status, 403);

  const calc = await fetch(`${baseUrl}/api/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieA,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({
      amounts: {
        8: "192770580.00000000",
        9: "64161878.00000000",
        11: "111812860.00000000",
        25: "71298705.00000000",
        30: "15837333.00000000"
      }
    })
  });
  assert.equal(calc.status, 200);
  const data = await calc.json();
  assert.equal(data.total, "368745318.00000000");
  assert.equal(data.factors["8"], "0.52277431");
  assert.equal(Object.hasOwn(data.factors, "34"), false);
});
