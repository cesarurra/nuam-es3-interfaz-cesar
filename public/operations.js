// Cliente CRUD: no reemplaza autorización, auditoría ni persistencia del servidor.
(function (root) {
  'use strict';
  function recordPath(id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Identificador de registro inválido.');
    return '/records/' + encodeURIComponent(id);
  }
  function canEdit(user, record) {
    return Boolean(user?.role === 'broker' && user.tenantId && record?.tenantId === user.tenantId);
  }
  function confirmedRecord(data) {
    if (!data || typeof data.id !== 'string' || !Number.isSafeInteger(data.version) || data.version < 1) {
      throw new Error('El servidor no entregó una confirmación válida. Revisa el listado antes de reintentar.');
    }
    recordPath(data.id);
    return data;
  }
  function createOperations(api, getUser) {
    function requireBroker() {
      if (getUser()?.role !== 'broker') throw new Error('Inicia sesión como corredor para modificar calificaciones.');
    }
    return {
      async get(id) {
        requireBroker();
        const data = confirmedRecord(await api.request(recordPath(id)));
        if (data.id !== id || (!canEdit(getUser(), data) && data.tenantId !== 'BOLSA')) throw new Error('No puedes abrir este registro.');
        return data;
      },
      async save(draft, editing = null) {
        requireBroker();
        if (editing && !canEdit(getUser(), editing)) throw new Error('No puedes modificar registros de otro origen.');
        if (editing) confirmedRecord(editing);
        // No se copia tenantId ni origin desde el borrador: los decide el servidor.
        const { instrument, year, market, sequence, paymentDate, registered, amounts, factors } = draft;
        const payload = { instrument, year, market, sequence, paymentDate, registered, amounts, factors };
        if (editing) payload.version = editing.version;
        return confirmedRecord(await api.request(editing ? recordPath(editing.id) : '/records', {
          method: editing ? 'PUT' : 'POST', body: payload,
        }));
      },
      async remove(record) {
        requireBroker();
        if (!canEdit(getUser(), record)) throw new Error('Solo puedes eliminar registros de tu corredora.');
        confirmedRecord(record);
        const response = await api.request(recordPath(record.id), { method: 'DELETE', body: { version: record.version } });
        if (response?.ok !== true) throw new Error('No se confirmó la eliminación. Revisa el listado antes de reintentar.');
      },
    };
  }
  const exported = { recordPath, canEdit, confirmedRecord, createOperations };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.NuamOperations = exported;
})(globalThis);
