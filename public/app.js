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
  if (activeUser?.id !== user?.id) factorEditor.reset();
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
let editingRecord = null;
let pendingDelete = null;
let writeBusy = false;
let editorRequest = 0;
const operations = NuamOperations.createOperations(api, () => activeUser);
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
    editingRecord = null;
    factorEditor.reset();
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
    const actions = document.createElement('td');
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'button secondary table-action';
    edit.textContent = NuamOperations.canEdit(activeUser, item) ? 'Editar' : 'Usar referencia';
    edit.addEventListener('click', () => openRecord(item.id));
    if (activeUser?.role === 'broker') actions.append(edit);
    if (NuamOperations.canEdit(activeUser, item)) {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'button secondary table-action'; remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => requestDelete(item)); actions.append(remove);
    }
    row.append(actions);
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
  if (writeBusy) return;
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

function announce(text) {
  const node = document.getElementById('workspace-message');
  node.textContent = text; node.hidden = false;
}

function resetEditorTitle() {
  editorRequest++;
  editingRecord = null;
  document.getElementById('title-nueva').textContent = 'Nueva calificación';
  document.getElementById('save-qualification').textContent = 'Guardar calificación';
}

const factorEditor = NuamFactorForm.mount({ api, getUser: () => activeUser, onSubmit: saveQualification, onReset: resetEditorTitle });

for (const link of document.querySelectorAll('#new-qualification, [data-view="nueva"]')) {
  link.addEventListener('click', event => {
    if (writeBusy) { event.preventDefault(); return; }
    factorEditor.reset();
  });
}

async function openRecord(id) {
  if (writeBusy) return;
  const userId = activeUser?.id;
  const requestId = ++editorRequest;
  try {
    const record = await operations.get(id);
    if (userId !== activeUser?.id || requestId !== editorRequest || writeBusy) return;
    factorEditor.load(record);
    editingRecord = NuamOperations.canEdit(activeUser, record) ? record : null;
    document.getElementById('title-nueva').textContent = editingRecord ? 'Editar calificación' : 'Crear versión local de Bolsa';
    document.getElementById('save-qualification').textContent = editingRecord ? 'Guardar cambios' : 'Guardar versión local';
    window.location.hash = 'nueva';
    document.getElementById('qualification-instrument').focus();
  } catch (error) { announce(error.message); }
}

async function saveQualification() {
  if (writeBusy) return;
  const button = document.getElementById('save-qualification');
  let controls = [];
  try {
    const draft = factorEditor.getDraft();
    writeBusy = true;
    controls = [...document.querySelectorAll('#qualification-form input, #qualification-form select, #qualification-form button')].map(node => [node, node.disabled]);
    for (const [node] of controls) node.disabled = true;
    logoutButton.disabled = true; button.textContent = 'Guardando…';
    const saved = await operations.save(draft, editingRecord);
    factorEditor.reset();
    document.getElementById('record-filters').reset();
    announce(`Calificación ${saved.instrument || draft.instrument} guardada. Verifica el registro en el listado.`);
    window.location.hash = 'calificaciones';
    await loadRecords();
  } catch (error) {
    factorEditor.setMessage(error.status === 409 ? `${error.message} El borrador se conserva; vuelve al listado para revisar la versión vigente.` : error.message);
  } finally {
    for (const [node, wasDisabled] of controls) node.disabled = wasDisabled;
    logoutButton.disabled = false; writeBusy = false;
    button.textContent = editingRecord ? 'Guardar cambios' : 'Guardar calificación';
  }
}

function requestDelete(record) {
  if (writeBusy) return;
  pendingDelete = record;
  document.getElementById('delete-description').textContent = `Se eliminará ${record.instrument}, ejercicio ${record.year}, secuencia ${record.sequence}.`;
  document.getElementById('delete-message').hidden = true;
  document.getElementById('delete-dialog').showModal();
}

document.getElementById('cancel-delete').addEventListener('click', () => {
  if (!writeBusy) { pendingDelete = null; document.getElementById('delete-dialog').close(); }
});
document.getElementById('delete-dialog').addEventListener('cancel', event => { if (writeBusy) event.preventDefault(); });
document.getElementById('confirm-delete').addEventListener('click', async () => {
  if (writeBusy || !pendingDelete) return;
  writeBusy = true;
  const target = pendingDelete;
  const button = document.getElementById('confirm-delete');
  button.disabled = true; document.getElementById('cancel-delete').disabled = true; logoutButton.disabled = true;
  try {
    await operations.remove(target);
    pendingDelete = null; document.getElementById('delete-dialog').close();
    if (editingRecord?.id === target.id) factorEditor.reset();
    announce(`Se eliminó ${target.instrument}.`);
    await loadRecords();
  } catch (error) {
    const node = document.getElementById('delete-message'); node.textContent = error.message; node.hidden = false;
  } finally {
    writeBusy = false; button.disabled = false;
    document.getElementById('cancel-delete').disabled = false; logoutButton.disabled = false;
  }
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
