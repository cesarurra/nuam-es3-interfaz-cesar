// Servidor de archivos para desarrollar la interfaz. No implementa la API de Ignacio.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
};
const port = Number(process.env.PORT || 3001);

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
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
