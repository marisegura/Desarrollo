// Servidor local del gestor de tareas: archivos estáticos + API (datos en Supabase).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { apiHandler } = require('./lib/api');

const PORT = process.env.PORT || 8000;
const STATIC = path.join(__dirname, 'static');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname);
  const file = path.normalize(path.join(STATIC, rel));
  if (!file.startsWith(STATIC + path.sep)) { res.writeHead(403); return res.end('Prohibido'); }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
}

const onRequest = (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith('/api/')) {
    apiHandler(req, res, pathname);
  } else if (req.method === 'GET') {
    serveStatic(req, res, pathname);
  } else {
    res.writeHead(405); res.end();
  }
};

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('Aviso: faltan SUPABASE_URL y/o SUPABASE_KEY en el archivo .env');
}

// Escucha en IPv4 e IPv6 de loopback: "localhost" puede resolver a cualquiera de las dos.
let started = false;
for (const host of ['127.0.0.1', '::1']) {
  const server = http.createServer(onRequest);
  server.on('error', err => {
    if (host === '127.0.0.1') {
      console.error(err.code === 'EADDRINUSE'
        ? `El puerto ${PORT} está ocupado. Prueba con otro: $env:PORT=3001; npm start`
        : err.message);
      process.exit(1);
    } // IPv6 no disponible: se ignora
  });
  server.listen(PORT, host, () => {
    if (!started) {
      started = true;
      console.log(`Gestor de tareas en http://localhost:${PORT}  (Ctrl+C para detener)`);
    }
  });
}
