// Etapa 1: navegación de la interfaz. No simula sesiones ni operaciones del servidor.
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
