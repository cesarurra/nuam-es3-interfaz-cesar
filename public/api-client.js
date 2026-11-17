// Cliente de API asistido por IA. Los permisos y las credenciales los valida el backend.
(function (root) {
  'use strict';
  function validateCredentials(email, password) {
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error('Ingresa un correo electrónico válido.');
    }
    if (typeof password !== 'string' || !password.length || password.length > 128) {
      throw new Error('Ingresa una contraseña de hasta 128 caracteres.');
    }
    return { email: email.trim(), password };
  }

  function createClient(fetchImplementation = root.fetch.bind(root)) {
    let csrf = '';
    async function request(route, options = {}) {
      if (!route.startsWith('/') || route.startsWith('//')) throw new Error('Ruta de API inválida.');
      const method = options.method || 'GET';
      const headers = { 'Accept': 'application/json' };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (!['GET', 'HEAD'].includes(method) && csrf) headers['X-CSRF-Token'] = csrf;
      let response;
      try {
        response = await fetchImplementation('/api' + route, {
          method, headers, credentials: 'same-origin',
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        throw new Error('No se pudo conectar con el servidor. Revisa que esté ejecutándose e intenta nuevamente.');
      }
      let data;
      try { data = await response.json(); }
      catch { throw new Error('El servidor devolvió una respuesta no válida.'); }
      if (!response.ok) {
        if (response.status === 401) csrf = '';
        const error = new Error(typeof data?.error === 'string' ? data.error : 'La operación no pudo completarse.');
        error.status = response.status;
        throw error;
      }
      return data;
    }
    function acceptSession(data) {
      if (!data?.user || typeof data.user.name !== 'string' || typeof data.csrf !== 'string' || !data.csrf) {
        throw new Error('El servidor no entregó una sesión válida.');
      }
      csrf = data.csrf;
      return data.user;
    }
    return {
      request,
      async login(email, password) {
        const credentials = validateCredentials(email, password);
        return acceptSession(await request('/login', { method: 'POST', body: credentials }));
      },
      async me() { return acceptSession(await request('/me')); },
      async logout() { await request('/logout', { method: 'POST', body: {} }); csrf = ''; },
    };
  }
  const exported = { createClient, validateCredentials };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.NuamAPI = exported;
})(globalThis);
