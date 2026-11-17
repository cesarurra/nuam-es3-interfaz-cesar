const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildQuery, validateRecords, createLoader } = require('../public/records');
const record = { id: 'r1', instrument: 'EJEMPLO', year: '2026', market: 'Chile', sum: '1.00000000', updatedAt: '2026-11-17T18:00:00Z' };

test('L01: filtros se codifican sin permitir parámetros inyectados', () => {
  const query = new URLSearchParams(buildQuery({ instrument: 'ACME&year=2000', market: 'Perú', year: '2026' }));
  assert.equal(query.get('q'), 'ACME&year=2000');
  assert.equal(query.get('year'), '2026');
  assert.equal(query.get('market'), 'Perú');
  assert.equal(buildQuery(), '');
});
test('L02: ejercicio, mercado y longitud inválidos se rechazan', () => {
  for (const values of [{ year: '1999' }, { year: '202x' }, { market: 'Otro' }, { instrument: 'a'.repeat(41) }]) {
    assert.throws(() => buildQuery(values));
  }
});
test('L03: listado y decimales se conservan; respuesta mal formada no se presenta como vacía', () => {
  assert.deepEqual(validateRecords([record]), [record]);
  assert.deepEqual(validateRecords([]), []);
  for (const data of [{}, [null], [{ ...record, sum: 1 }], [{ ...record, updatedAt: 'no-fecha' }]]) {
    assert.throws(() => validateRecords(data));
  }
});
test('L04: carga vacía, correcta y fallida producen estados distintos', async () => {
  const states = [];
  const loader = createLoader({ request: async () => [] }, s => states.push(s));
  await loader.load({});
  assert.deepEqual(states.map(s => s.status), ['loading', 'empty']);
  const success = [];
  await createLoader({ request: async () => [record] }, s => success.push(s)).load({});
  assert.equal(success.at(-1).status, 'ready');
  const failed = [];
  await createLoader({ request: async () => { const e = new Error('Sesión vencida'); e.status = 401; throw e; } }, s => failed.push(s)).load({});
  assert.equal(failed.at(-1).status, 'error');
  assert.equal(failed.at(-1).statusCode, 401);
});
test('L05: una respuesta antigua no reemplaza los filtros nuevos', async () => {
  const pending = [], states = [];
  const loader = createLoader({ request: () => new Promise(resolve => pending.push(resolve)) }, s => states.push(s));
  const first = loader.load({ instrument: 'ANTIGUO' });
  const second = loader.load({ instrument: 'NUEVO' });
  pending[1]([{ ...record, instrument: 'NUEVO' }]); await second;
  pending[0]([{ ...record, instrument: 'ANTIGUO' }]); await first;
  assert.equal(states.at(-1).records[0].instrument, 'NUEVO');
});
test('L06: cancelar al cerrar sesión descarta una respuesta pendiente', async () => {
  let resolve;
  const states = [];
  const loader = createLoader({ request: () => new Promise(r => resolve = r) }, s => states.push(s));
  const pending = loader.load({}); loader.cancel(); resolve([record]); await pending;
  assert.deepEqual(states.map(s => s.status), ['loading']);
});
