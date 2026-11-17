// Servidor de archivos para desarrollar la interfaz. No implementa la API de Ignacio.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
  '/api-client.js': ['api-client.js', 'text/javascript'],
  '/records.js': ['records.js', 'text/javascript'],
  '/factor-form.js': ['factor-form.js', 'text/javascript'],
  '/operations.js': ['operations.js', 'text/javascript'],
};
const port = Number(process.env.PORT || 3001);
// Proxy local hacia el módulo del backend. No duplica su lógica de autenticación.
const apiOrigin = new URL(process.env.API_ORIGIN || 'http://127.0.0.1:3000');
if (apiOrigin.protocol !== 'http:' || apiOrigin.hostname !== '127.0.0.1' || apiOrigin.port === String(port)) {
  throw new Error('API_ORIGIN debe apuntar al backend HTTP local 127.0.0.1 en otro puerto.');
}

function proxyAPI(req, res) {
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Origen no permitido.' }));
    return;
  }
  const headers = { ...req.headers, host: apiOrigin.host };
  if (headers.origin) headers.origin = apiOrigin.origin;
  const source = new URL(req.url, 'http://localhost');
  const target = new URL(apiOrigin.origin);
  target.pathname = source.pathname;
  target.search = source.search;
  const upstream = http.request(target, { method: req.method, headers, timeout: 15000 }, response => {
    res.writeHead(response.statusCode, { ...response.headers, 'Cache-Control': 'no-store' });
    response.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('Tiempo de espera agotado.')));
  upstream.on('error', () => {
    if (res.headersSent) { res.end(); return; }
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'El servidor de autenticación no está disponible. Inicia el backend del equipo en el puerto configurado.' }));
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
}

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  if (new URL(req.url, 'http://localhost').pathname.startsWith('/api/')) {
    proxyAPI(req, res);
    return;
  }
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Recurso no disponible.');
    return;
  }
  try {
    const content = await fs.readFile(path.join(__dirname, 'public', file[0]));
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No se pudo cargar la interfaz.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Interfaz Nuam · http://127.0.0.1:${port}`);
});
