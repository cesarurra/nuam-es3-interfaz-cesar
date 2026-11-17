// Presentación y validación de formato. La fórmula y la validación definitiva pertenecen al backend.
(function (root) {
  'use strict';
  const columns = Array.from({ length: 30 }, (_, i) => i + 8);
  const scale = 100000000n;

  function normalizeDecimal(value, label = 'Valor', factor = false) {
    if (typeof value !== 'string') throw new Error(`${label}: se requiere un decimal en texto.`);
    const normalized = value.trim().replace(',', '.');
    if (!/^(0|[1-9]\d{0,17})(\.\d{1,8})?$/.test(normalized)) {
      throw new Error(`${label}: usa un valor no negativo, sin miles y con hasta ocho decimales.`);
    }
    const [integer, fraction = ''] = normalized.split('.');
    const units = BigInt(integer) * scale + BigInt(fraction.padEnd(8, '0'));
    if (factor && units > scale) throw new Error(`${label}: el factor no puede superar 1.`);
    return `${integer}.${fraction.padEnd(8, '0')}`;
  }

  function normalizeVector(values, label, factor = false) {
    return Object.fromEntries(columns.map(i => [i, normalizeDecimal(values[i], `${label} ${i}`, factor)]));
  }

  function sumFactors(values) {
    let units = 0n;
    for (let i = 8; i <= 16; i++) units += BigInt(normalizeDecimal(values[i], `Factor ${i}`, true).replace('.', ''));
    return { sum: `${units / scale}.${String(units % scale).padStart(8, '0')}`, exceeds: units > scale };
  }

  function validateMetadata(values) {
    const instrument = String(values.instrument || '').trim().toUpperCase();
    if (!/^[A-Z0-9._-]{1,40}$/.test(instrument)) throw new Error('Instrumento: usa de 1 a 40 letras, números, puntos, guiones o guion bajo.');
    if (!/^20\d{2}$/.test(values.year)) throw new Error('Ejercicio: año entre 2000 y 2099.');
    if (!['Chile', 'Perú', 'Colombia'].includes(values.market)) throw new Error('Mercado inválido.');
    if (!/^[1-9]\d{0,5}$/.test(values.sequence)) throw new Error('Secuencia: entero entre 1 y 999999.');
    const date = values.paymentDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Fecha de pago inválida.');
    if (typeof values.registered !== 'boolean') throw new Error('Indica si el instrumento está inscrito.');
    return { ...values, instrument };
  }

  function validateCalculation(data) {
    if (!data || typeof data.total !== 'string' || !/^\d+\.\d{8}$/.test(data.total) || BigInt(data.total.replace('.', '')) === 0n) {
      throw new Error('El servidor devolvió un total de cálculo inválido.');
    }
    const factors = {};
    for (let i = 8; i <= 33; i++) {
      // Puede exceder 1: se muestra para revisión; la validación de guardado lo rechazará.
      factors[i] = normalizeDecimal(data.factors?.[i], `Resultado del factor ${i}`);
    }
    return { total: data.total, factors, warnings: Array.isArray(data.warnings) ? data.warnings.filter(v => typeof v === 'string') : [] };
  }

  function exampleAmounts() {
    return Object.assign(Object.fromEntries(columns.map(i => [i, '0'])), {
      8: '192770580', 9: '64161878', 11: '111812860', 25: '71298705', 30: '15837333',
    });
  }

  function mount({ api, getUser, document = root.document }) {
    const element = id => document.getElementById(id);
    const form = element('qualification-form');
    const message = element('factor-message');
    const calculateButton = element('calculate-factors');
    let revision = 0;
    for (const i of columns) {
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row'; heading.textContent = i; row.append(heading);
      for (const kind of ['amount', 'factor']) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.id = `${kind}-${i}`; input.inputMode = 'decimal'; input.maxLength = 30;
        input.value = input.defaultValue = kind === 'factor' ? '0.00000000' : '0';
        input.setAttribute('aria-label', `${kind === 'amount' ? 'Monto' : 'Factor'} ${i}`);
        input.addEventListener('input', () => {
          revision++;
          if (kind === 'factor') updateSum();
          else { element('calculated-total').textContent = 'Pendiente de recalcular'; message.textContent = 'Cambiaste montos. Solicita el cálculo nuevamente.'; }
        });
        cell.append(input); row.append(cell);
      }
      const rule = document.createElement('td');
      rule.textContent = i <= 33 ? 'Calculado y editable' : 'Ingreso manual'; row.append(rule);
      element('factor-inputs').append(row);
    }

    function read(kind) { return Object.fromEntries(columns.map(i => [i, element(`${kind}-${i}`).value])); }
    function updateSum() {
      try {
        const result = sumFactors(read('factor'));
        element('calculated-sum').textContent = result.sum.replace('.', ',');
        if (result.exceeds) message.textContent = 'La suma de factores 8–16 supera 1. Revisa los valores antes de guardar.';
      } catch (error) {
        element('calculated-sum').textContent = 'Revisar formato'; message.textContent = error.message;
      }
    }

    async function calculate() {
      calculateButton.disabled = true; calculateButton.textContent = 'Calculando…';
      try {
        if (!getUser()) throw new Error('Inicia sesión antes de solicitar el cálculo.');
        const amounts = normalizeVector(read('amount'), 'Monto');
        const submittedRevision = revision;
        const result = validateCalculation(await api.request('/calculate', { method: 'POST', body: { amounts } }));
        if (submittedRevision !== revision) throw new Error('Los valores cambiaron durante la consulta. Vuelve a calcular para no sobrescribir tus cambios.');
        for (let i = 8; i <= 33; i++) element(`factor-${i}`).value = result.factors[i];
        // Los manuales 34–37 se conservan, no se reemplazan por ceros del servidor.
        element('calculated-total').textContent = result.total.replace('.', ',');
        message.textContent = result.warnings.join(' ') || 'Cálculo recibido. Revisa los factores; aún no se ha guardado ningún registro.';
        updateSum();
      } catch (error) { message.textContent = error.message; }
      finally { calculateButton.disabled = false; calculateButton.textContent = 'Calcular factores'; }
    }

    function reset() {
      revision++; form.reset();
      const today = new Date();
      element('qualification-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      element('calculated-total').textContent = 'Sin calcular';
      element('calculated-sum').textContent = '0,00000000';
      message.textContent = 'Ingresa los montos y solicita el cálculo al servidor.';
    }

    element('fill-example').addEventListener('click', () => {
      revision++;
      for (const [i, amount] of Object.entries(exampleAmounts())) element(`amount-${i}`).value = amount;
      element('calculated-total').textContent = 'Pendiente de calcular';
      message.textContent = 'Ejemplo del HDU cargado. Presiona Calcular factores.';
    });
    calculateButton.addEventListener('click', calculate);
    element('reset-qualification').addEventListener('click', reset);
    form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
    reset();
    return {
      reset,
      getDraft() {
        const metadata = validateMetadata({
          instrument: element('qualification-instrument').value,
          year: element('qualification-year').value,
          market: element('qualification-market').value,
          sequence: element('qualification-sequence').value,
          paymentDate: element('qualification-date').value,
          registered: element('qualification-registered').value === 'true',
        });
        return { ...metadata, amounts: normalizeVector(read('amount'), 'Monto'), factors: normalizeVector(read('factor'), 'Factor', true) };
      },
    };
  }

  const exported = { columns, normalizeDecimal, normalizeVector, sumFactors, validateMetadata, validateCalculation, exampleAmounts, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.NuamFactorForm = exported;
})(globalThis);
