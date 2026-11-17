const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDecimal, normalizeVector, sumFactors, validateMetadata, validateCalculation, exampleAmounts, columns } = require('../public/factor-form');
const zero = () => Object.fromEntries(columns.map(i => [i, '0']));
const metadata = () => ({ instrument: ' demo-cesar ', year: '2026', market: 'Chile', sequence: '1', paymentDate: '2026-11-17', registered: false });

test('F01: coma decimal y ceros se normalizan sin Float y con 8 decimales', () => {
  assert.equal(normalizeDecimal('0,12345678'), '0.12345678');
  assert.equal(normalizeDecimal('999999999999999999.00000001'), '999999999999999999.00000001');
  assert.equal(normalizeDecimal(' 10 '), '10.00000000');
});
test('F02: formato inválido y factor mayor a uno se rechazan', () => {
  for (const value of ['1.000.000', '-1', '1e3', '', '0.000000001', 1]) assert.throws(() => normalizeDecimal(value));
  assert.throws(() => normalizeDecimal('1.00000001', 'Factor', true));
});
test('F03: se conservan los 30 montos 8–37 y el ejemplo HDU', () => {
  const result = normalizeVector(exampleAmounts(), 'Monto');
  assert.equal(Object.keys(result).length, 30);
  assert.equal(result[8], '192770580.00000000');
  assert.equal(result[30], '15837333.00000000');
  assert.equal(result[37], '0.00000000');
});
test('F04: suma visual usa 8–16 y detecta exactamente una centésima de millonésima extra', () => {
  const f = zero(); f[8] = '0.52277431'; f[9] = '0.17400052'; f[11] = '0.30322517'; f[34] = '0.7';
  assert.deepEqual(sumFactors(f), { sum: '1.00000000', exceeds: false });
  f[10] = '0.00000001'; assert.deepEqual(sumFactors(f), { sum: '1.00000001', exceeds: true });
});
test('F05: metadatos aceptan instrumento no inscrito y normalizan instrumento', () => {
  const r = validateMetadata(metadata()); assert.equal(r.instrument, 'DEMO-CESAR'); assert.equal(r.registered, false);
});
test('F06: metadatos inválidos no generan borrador listo para enviar', () => {
  for (const patch of [{ paymentDate: '2026-02-30' }, { instrument: '<script>' }, { year: '1999' }, { sequence: '0' }, { market: 'Otro' }, { registered: 'false' }]) {
    assert.throws(() => validateMetadata({ ...metadata(), ...patch }));
  }
});
test('F07: respuesta de cálculo se valida sin inventar fórmula para 34–37', () => {
  const response = { total: '368745318.00000000', factors: zero(), warnings: [] };
  response.factors[8] = '0.52277431';
  const result = validateCalculation(response);
  assert.equal(result.factors[8], '0.52277431');
  assert.equal(Object.hasOwn(result.factors, 34), false);
});
test('F08: respuesta mal formada, total cero o factores ausentes se rechazan', () => {
  for (const response of [null, { total: '0.00000000', factors: zero() }, { total: '10.00000000', factors: {} }, { total: 10, factors: zero() }]) {
    assert.throws(() => validateCalculation(response));
  }
});
