const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient, validateCredentials } = require('../public/api-client');
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('A01: correo inválido y contraseña vacía se rechazan antes de llamar a la API', async () => {
  const client = createClient(() => { throw new Error('No debe invocarse'); });
  await assert.rejects(client.login('incorrecto', 'algo'), /correo/);
  await assert.rejects(client.login('a@example.com', ''), /contraseña/);
  assert.equal(validateCredentials(' a@example.com ', ' clave ').password, ' clave ');
});
test('A02: acceso envía JSON y cookies del mismo origen; no autentica sin respuesta válida', async () => {
  let call;
  const client = createClient(async (...args) => { call = args; return response({ user: { name: 'Corredor A' }, csrf: 'token-servidor' }); });
  assert.equal((await client.login('a@example.com', 'prueba')).name, 'Corredor A');
  assert.equal(call[0], '/api/login');
  assert.equal(call[1].credentials, 'same-origin');
  assert.deepEqual(JSON.parse(call[1].body), { email: 'a@example.com', password: 'prueba' });
});
test('A03: error 401 conserva mensaje y no convierte rechazo en éxito', async () => {
  const client = createClient(async () => response({ error: 'Credenciales incorrectas.' }, 401));
  await assert.rejects(client.login('a@example.com', 'incorrecta'), e => e.status === 401 && e.message === 'Credenciales incorrectas.');
});
test('A04: caída de red presenta un mensaje sin detalles internos', async () => {
  const client = createClient(async () => { throw new Error('detalle-interno'); });
  await assert.rejects(client.me(), /No se pudo conectar/);
});
test('A05: cierre envía CSRF obtenido del servidor y después lo descarta', async () => {
  const calls = [];
  const client = createClient(async (...args) => { calls.push(args); return response(args[0] === '/api/login' ? { user: { name: 'A' }, csrf: 'csrf-real' } : { ok: true }); });
  await client.login('a@example.com', 'prueba');
  await client.logout();
  assert.equal(calls[1][1].headers['X-CSRF-Token'], 'csrf-real');
  await client.request('/calculate', { method: 'POST', body: {} });
  assert.equal(calls[2][1].headers['X-CSRF-Token'], undefined);
});
test('A06: sesión inválida y respuestas que no son JSON se rechazan', async () => {
  await assert.rejects(createClient(async () => response({ user: { name: 'A' } })).me(), /sesión válida/);
  await assert.rejects(createClient(async () => ({ ok: true, json: async () => { throw new Error(); } })).me(), /respuesta no válida/);
});
test('A07: me restaura usuario y token para la siguiente escritura', async () => {
  let last;
  const client = createClient(async (...args) => { last = args; return response({ user: { name: 'A' }, csrf: 'restaurado' }); });
  await client.me();
  await client.request('/records', { method: 'POST', body: {} });
  assert.equal(last[1].headers['X-CSRF-Token'], 'restaurado');
});
test('A08: rutas externas no se usan para enviar credenciales', async () => {
  const client = createClient(() => { throw new Error('No debe invocarse'); });
  await assert.rejects(client.request('https://externo.example'), /Ruta/);
  await assert.rejects(client.request('//externo.example'), /Ruta/);
});
