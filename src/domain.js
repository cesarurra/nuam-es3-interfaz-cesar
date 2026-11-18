/**
 * Módulo de Dominio y Cálculo Tributario - NUAM
 * Responsable: Nibaldo Zepeda
 * Etapa N1: Definición de estructura, rangos de factores y llave de negocio.
 * Etapa N2: Representación decimal exacta (BigInt escalado 10^8) y validaciones.
 */

// Rango completo de columnas tributarias según estándar DJ1948 / NUAM (30 claves)
const FACTOR_KEYS = Array.from({ length: 30 }, (_, i) => String(i + 8)); // '8' a '37'
const SUM_RULE_KEYS = ['8', '9', '10', '11', '12', '13', '14', '15', '16']; // Regla suma <= 1.0
const DENOMINATOR_KEYS = Array.from({ length: 12 }, (_, i) => String(i + 8)); // '8' a '19'
const MANUAL_FACTOR_KEYS = ['34', '35', '36', '37']; // Factores ingresados manualmente

// Constantes de precisión financiera (8 decimales exactos sin punto flotante)
const SCALE_DECIMALS = 8;
const SCALE_FACTOR = 100000000n; // 10^8

class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}

/**
 * Convierte un valor numérico o texto en BigInt escalado por 10^8.
 * Rechaza negativos, notación exponencial (ej. 1e-5) y exceso de 8 decimales.
 */
function parseDecimal(raw, fieldName = 'valor') {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return 0n;
  }

  const str = String(raw).trim().replace(',', '.');

  // Validar estrictamente formato decimal no negativo con máximo 8 decimales (sin notación científica)
  if (!/^\d+(\.\d{1,8})?$/.test(str)) {
    throw new DomainError(
      `Formato decimal inválido en ${fieldName}: "${raw}". Debe ser no negativo con máximo 8 decimales.`,
      400
    );
  }

  const [intPart, fracPart = ''] = str.split('.');
  const paddedFrac = fracPart.padEnd(SCALE_DECIMALS, '0');
  return BigInt(intPart) * SCALE_FACTOR + BigInt(paddedFrac);
}

/**
 * Formatea un BigInt escalado a su representación canónica de texto con 8 decimales.
 * Ejemplo: 12345678n -> "0.12345678"
 */
function formatDecimal(scaledBigInt) {
  if (typeof scaledBigInt !== 'bigint' || scaledBigInt < 0n) {
    throw new DomainError('Valor interno inválido para formateo decimal.', 500);
  }
  const intPart = scaledBigInt / SCALE_FACTOR;
  const fracPart = (scaledBigInt % SCALE_FACTOR).toString().padStart(SCALE_DECIMALS, '0');
  return `${intPart.toString()}.${fracPart}`;
}

/**
 * Valida que un factor individual (incluidos los manuales 34-37) esté entre 0 y 1 inclusive.
 */
function validateSingleFactor(raw, keyName) {
  const scaled = parseDecimal(raw, `Factor ${keyName}`);
  if (scaled < 0n || scaled > SCALE_FACTOR) {
    throw new DomainError(
      `El Factor ${keyName} (${formatDecimal(scaled)}) debe estar entre 0.00000000 y 1.00000000.`,
      400
    );
  }
  return scaled;
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
  SCALE_FACTOR,
  DomainError,
  parseDecimal,
  formatDecimal,
  validateSingleFactor,
  key
};