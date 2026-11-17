// Etapa 3: consulta de datos; permisos y filtros definitivos permanecen en el backend.
(function (root) {
  'use strict';
  function buildQuery({ instrument = '', market = '', year = '' } = {}) {
    instrument = String(instrument).trim();
    year = String(year).trim();
    if (instrument.length > 40) throw new Error('El instrumento admite hasta 40 caracteres.');
    if (market && !['Chile', 'Perú', 'Colombia'].includes(market)) throw new Error('Selecciona un mercado válido.');
    if (year && !/^20\d{2}$/.test(year)) throw new Error('El ejercicio debe ser un año entre 2000 y 2099.');
    const query = new URLSearchParams();
    if (instrument) query.set('q', instrument);
    if (market) query.set('market', market);
    if (year) query.set('year', year);
    return query.toString();
  }
  function validateRecords(data) {
    if (!Array.isArray(data)) throw new Error('El servidor no devolvió un listado válido.');
    for (const item of data) {
      if (!item || typeof item.id !== 'string' || typeof item.instrument !== 'string'
        || typeof item.year !== 'string' || typeof item.market !== 'string'
        || typeof item.sum !== 'string' || !/^(0|1)\.\d{8}$/.test(item.sum)
        || !Number.isFinite(Date.parse(item.updatedAt))) {
        throw new Error('El servidor devolvió una calificación con datos incompletos.');
      }
    }
    return data;
  }
  function createLoader(api, onChange) {
    let generation = 0;
    return {
      cancel() { generation++; },
      async load(filters) {
        const current = ++generation;
        try {
          const query = buildQuery(filters);
          onChange({ status: 'loading', records: [] });
          const records = validateRecords(await api.request('/records' + (query ? '?' + query : '')));
          if (current === generation) onChange({ status: records.length ? 'ready' : 'empty', records });
        } catch (error) {
          if (current === generation) onChange({ status: 'error', records: [], message: error.message, statusCode: error.status });
        }
      },
    };
  }
  const exported = { buildQuery, validateRecords, createLoader };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.NuamRecords = exported;
})(globalThis);
