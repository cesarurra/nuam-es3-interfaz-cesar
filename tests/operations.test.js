const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canEdit, listAction, recordPath, createOperations } = require('../public/operations');
const { validateDraft, exampleAmounts, columns } = require('../public/factor-form');
const user = { id: 'a', role: 'broker', tenantId: 'A' };
const record = { id: 'registro-1', version: 2, tenantId: 'A' };
const draft = () => ({ instrument: 'DEMO', year: '2026', market: 'Chile', sequence: '1', paymentDate: '2026-11-17', registered: true, amounts: exampleAmounts(), factors: Object.fromEntries(columns.map(i => [i, i === 8 ? '1' : '0'])) });

test('C01: alta usa POST y omite tenant/origen/version suministrados por cliente', async () => {
  let call;
  const service = createOperations({ request: async (...args) => { call = args; return record; } }, () => user);
  await service.save({ ...draft(), tenantId: 'BOLSA', origin: 'Bolsa', version: 100 });
  assert.equal(call[0], '/records'); assert.equal(call[1].method, 'POST');
  assert.equal(Object.hasOwn(call[1].body, 'tenantId'), false);
  assert.equal(Object.hasOwn(call[1].body, 'origin'), false);
  assert.equal(Object.hasOwn(call[1].body, 'version'), false);
});
test('C02: edición y eliminación incluyen versión vigente', async () => {
  const calls = [];
  const service = createOperations({ request: async (...args) => { calls.push(args); return args[1].method === 'DELETE' ? { ok: true } : record; } }, () => user);
  await service.save(draft(), record); await service.remove(record);
  assert.equal(calls[0][1].method, 'PUT'); assert.equal(calls[0][1].body.version, 2);
  assert.equal(calls[1][1].method, 'DELETE'); assert.deepEqual(calls[1][1].body, { version: 2 });
});
test('C03: UI bloquea edición/eliminación de otro corredor o Bolsa; auditor no escribe', async () => {
  const service = createOperations({ request: () => assert.fail('No debe invocarse') }, () => user);
  for (const tenantId of ['B', 'BOLSA']) {
    assert.equal(canEdit(user, { ...record, tenantId }), false);
    await assert.rejects(service.save(draft(), { ...record, tenantId }));
    await assert.rejects(service.remove({ ...record, tenantId }));
  }
  await assert.rejects(createOperations({}, () => ({ role: 'auditor' })).save(draft()));
});
test('C04: lectura propia y de Bolsa; identificadores inseguros se rechazan', async () => {
  for (const tenantId of ['A', 'BOLSA']) {
    assert.equal((await createOperations({ request: async () => ({ ...record, tenantId }) }, () => user).get(record.id)).tenantId, tenantId);
  }
  for (const id of ['../privado', '', 'id/otro', '//otro']) assert.throws(() => recordPath(id));
  await assert.rejects(createOperations({ request: async () => ({ ...record, tenantId: 'B' }) }, () => user).get(record.id));
});
test('C05: error de conflicto no se oculta ni se convierte en guardado exitoso', async () => {
  const error = new Error('Versión cambió'); error.status = 409;
  const service = createOperations({ request: async () => { throw error; } }, () => user);
  await assert.rejects(service.save(draft(), record), e => e === error);
});
test('C06: respuesta vacía no confirma ni guardado ni eliminación', async () => {
  const service = createOperations({ request: async () => ({}) }, () => user);
  await assert.rejects(service.save(draft()), /confirmación válida/);
  await assert.rejects(service.remove(record), /No se confirmó/);
});
test('C07: borrador se valida con exactitud y bloquea suma inválida o total cero', () => {
  const valid = validateDraft(draft()); assert.equal(valid.factors[8], '1.00000000');
  assert.equal(Object.keys(valid.amounts).length, 30);
  assert.throws(() => validateDraft({ ...draft(), factors: { ...draft().factors, 9: '0.00000001' } }), /supera 1/);
  assert.throws(() => validateDraft({ ...draft(), amounts: Object.fromEntries(columns.map(i => [i, '0'])) }), /mayor que cero/);
});
test('C08: borrar sin versión válida no envía una petición', async () => {
  const service = createOperations({ request: () => assert.fail('No debe invocarse') }, () => user);
  await assert.rejects(service.remove({ ...record, version: undefined }), /confirmación válida/);
});

test('C09: acciones en listados de Ignacio y listados con tenantId', () => {
  assert.equal(listAction(user, { origin: 'Corredor' }), 'edit');
  assert.equal(listAction(user, { origin: 'Bolsa' }), 'reference');
  assert.equal(listAction(user, { tenantId: 'A' }), 'edit');
  assert.equal(listAction(user, { tenantId: 'B', origin: 'Corredor' }), null);
  assert.equal(listAction(user, { tenantId: 'BOLSA' }), 'reference');
  assert.equal(listAction(user, {}), null);
  assert.equal(listAction({ role: 'auditor' }, { origin: 'Corredor' }), null);
  assert.equal(canEdit(user, { origin: 'Corredor' }), false);
});
