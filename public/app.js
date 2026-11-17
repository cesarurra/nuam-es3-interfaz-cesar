// Interfaz reconstruida con asistencia de IA. El servidor decide sesión, permisos y datos.
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
  activeUser = user;
  if (user) loadRecords();
  else {
    factorEditor.reset();
    recordsLoader.cancel();
    renderRecords({ status: 'signed-out', records: [] });
  }
}

let activeUser = null;
const filtersForm = document.getElementById('record-filters');
const recordsLoader = NuamRecords.createLoader(api, renderRecords);

function readFilters() {
  return {
    instrument: document.getElementById('filter-instrument').value,
    market: document.getElementById('filter-market').value,
    year: document.getElementById('filter-year').value,
  };
}

function loadRecords() {
  if (activeUser) return recordsLoader.load(readFilters());
  renderRecords({ status: 'signed-out', records: [] });
}

function renderRecords(state) {
  const body = document.getElementById('records-body');
  const table = document.getElementById('records-table');
  const status = document.getElementById('records-state');
  body.replaceChildren();
  table.hidden = state.status !== 'ready';
  table.setAttribute('aria-busy', String(state.status === 'loading'));
  document.getElementById('retry-records').hidden = state.status !== 'error';
  document.getElementById('records-count').textContent = state.status === 'ready' ? `${state.records.length} registros encontrados` : '';
  const messages = {
    loading: 'Consultando calificaciones…',
    empty: 'No se encontraron calificaciones con estos filtros.',
    'signed-out': 'Inicia sesión para consultar tus calificaciones.',
    ready: 'Listado actualizado.',
    error: state.message,
  };
  status.textContent = messages[state.status];
  if (state.status === 'error' && state.statusCode === 401) {
    activeUser = null;
    document.getElementById('session-label').textContent = 'Sin sesión';
    logoutButton.hidden = true;
    form.hidden = false;
  }
  for (const item of state.records) {
    const row = document.createElement('tr');
    const date = new Date(item.updatedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    const values = [
      `${item.instrument} / ${item.sequence ?? '—'}`,
      item.year, item.market,
      `${item.origin || 'Sin origen'} · ${item.source || 'Sin fuente'}`,
      item.sum.replace('.', ','), date,
    ];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
}

filtersForm.addEventListener('submit', event => { event.preventDefault(); loadRecords(); });
document.getElementById('clear-filters').addEventListener('click', () => { filtersForm.reset(); loadRecords(); });
document.getElementById('retry-records').addEventListener('click', loadRecords);
document.querySelector('[data-view="calificaciones"]').addEventListener('click', loadRecords);

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

const factorEditor = NuamFactorForm.mount({ api, getUser: () => activeUser });

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
