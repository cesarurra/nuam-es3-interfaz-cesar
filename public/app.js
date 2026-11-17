// Etapas 1 y 2. Autenticación solamente mediante respuesta del backend, sin sesión ficticia.
const screens = {
  calificaciones: 'Calificaciones',
  nueva: 'Nueva calificación',
  acceso: 'Acceso',
};

function renderNavigation() {
  const requested = window.location.hash.slice(1);
  const current = Object.hasOwn(screens, requested) ? requested : 'calificaciones';

  for (const panel of document.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== current;
  }
  for (const link of document.querySelectorAll('[data-view]')) {
    if (link.dataset.view === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  document.getElementById('breadcrumb').textContent = screens[current];
  document.title = `${screens[current]} · Nuam`;
}

window.addEventListener('hashchange', renderNavigation);
renderNavigation();

const api = NuamAPI.createClient();
const form = document.getElementById('login-form');
const message = document.getElementById('login-message');
const loginButton = document.getElementById('login-submit');
const logoutButton = document.getElementById('logout');

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle('success', success);
  message.hidden = false;
}

function showUser(user) {
  document.getElementById('session-label').textContent = user ? user.name : 'Sin sesión';
  logoutButton.hidden = !user;
  form.hidden = Boolean(user);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginButton.textContent = 'Ingresando…';
  message.hidden = true;
  try {
    const user = await api.login(document.getElementById('email').value, document.getElementById('password').value);
    showUser(user);
    showMessage('Sesión iniciada correctamente.', true);
    window.location.hash = 'calificaciones';
  } catch (error) {
    showMessage(error.message);
  } finally {
    document.getElementById('password').value = '';
    loginButton.disabled = false;
    loginButton.textContent = 'Iniciar sesión';
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await api.logout();
    showUser(null);
    message.hidden = true;
    window.location.hash = 'acceso';
  } catch (error) {
    // Conservar el estado visible si el servidor no confirmó el cierre.
    window.location.hash = 'acceso';
    showMessage(error.message);
  } finally { logoutButton.disabled = false; }
});

(async function restoreSession() {
  const status = document.getElementById('connection-status');
  try {
    const info = await api.request('/status');
    status.textContent = info.setupRequired
      ? 'El servidor está disponible. Falta preparar las cuentas en el módulo del backend.'
      : 'Servidor de autenticación disponible.';
    try { showUser(await api.me()); }
    catch (error) {
      showUser(null);
      if (error.status !== 401) status.textContent = error.message;
    }
  } catch (error) { status.textContent = error.message; }
})();
