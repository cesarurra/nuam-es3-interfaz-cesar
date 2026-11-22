/**
 * Módulo de Persistencia y Almacenamiento - NUAM
 * Responsable: Nibaldo Zepeda
 * Etapa N4: Capa de persistencia, aislamiento multi-tenant y transacciones.
 */

const { key } = require('./domain');

/**
 * Crea o inicializa una tienda de datos en memoria / archivo local para pruebas y desarrollo.
 */
function createStore(initialData = {}) {
  const users = new Map(Object.entries(initialData.users || {
    'cesar@demo.local': { id: 'u1', name: 'César Urra', role: 'broker', tenantId: '96855000-1', passwordHash: '...' },
    'corredor.b@demo.local': { id: 'u2', name: 'Corredor B', role: 'broker', tenantId: '99999999-9', passwordHash: '...' },
    'auditor@demo.local': { id: 'u3', name: 'Auditor General', role: 'auditor', tenantId: 'SYSTEM', passwordHash: '...' }
  }));

  const records = new Map(Object.entries(initialData.records || {}));
  const auditLogs = [];

  return {
    kind: 'memory-store',
    
    // Leer estado actual de manera segura mediante callback
    read(callback) {
      return callback({
        users: Array.from(users.values()),
        records: Array.from(records.values()),
        audit: [...auditLogs]
      });
    },

    // Ejecutar transacciones atómicas (guardar cambios y auditoría juntos)
    transaction(mutatorFn) {
      const draftState = {
        records: new Map(records),
        audit: [...auditLogs]
      };

      try {
        const result = mutatorFn(draftState);
        
        // Si todo sale bien, aplicamos los cambios al estado oficial
        records.clear();
        for (const [k, v] of draftState.records.entries()) {
          records.set(k, v);
        }
        
        auditLogs.length = 0;
        auditLogs.push(...draftState.audit);

        return result;
      } catch (err) {
        // En caso de error, la transacción se revierte automáticamente (rollback)
        throw err;
      }
    },

    close() {
      // Limpieza de recursos si aplica
    }
  };
}

module.exports = {
  createStore
};