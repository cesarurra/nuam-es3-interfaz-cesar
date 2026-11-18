/**
 * Módulo de Dominio y Cálculo Tributario - NUAM
 * Responsable: Nibaldo Zepeda
 * Etapa N1: Definición de estructura, rangos de factores y llave de negocio.
 */

// Rango completo de columnas tributarias según estándar DJ1948 / NUAM (30 claves)
const FACTOR_KEYS = Array.from({ length: 30 }, (_, i) => String(i + 8)); // '8' a '37'
const SUM_RULE_KEYS = ['8', '9', '10', '11', '12', '13', '14', '15', '16']; // Regla suma <= 1.0
const DENOMINATOR_KEYS = Array.from({ length: 12 }, (_, i) => String(i + 8)); // '8' a '19'
const MANUAL_FACTOR_KEYS = ['34', '35', '36', '37']; // Factores ingresados manualmente

class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}

/**
 * Genera la llave de negocio única para aislamiento Multi-tenant.
 * Formato: tenantId|ejercicio|mercado|instrumentoNormalizado|secuencia
 */
function key(record) {
  if (!record || !record.tenantId) {
    throw new DomainError('El registro debe incluir tenantId válido.', 400);
  }
  const tenant = String(record.tenantId).trim();
  const year = String(record.year || '').trim();
  const market = String(record.market || '').trim().toUpperCase();
  const instrument = String(record.instrument || '').trim().toUpperCase();
  const sequence = String(record.sequence || '').trim();

  if (!year || !market || !instrument || !sequence) {
    throw new DomainError('Faltan campos obligatorios para construir la llave de negocio.', 400);
  }

  return `${tenant}|${year}|${market}|${instrument}|${sequence}`;
}

module.exports = {
  FACTOR_KEYS,
  SUM_RULE_KEYS,
  DENOMINATOR_KEYS,
  MANUAL_FACTOR_KEYS,
  DomainError,
  key
};