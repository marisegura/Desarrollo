// Servidor del gestor de tareas: archivos estáticos + API JSON en localhost.
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 8000;
const STATIC = path.join(__dirname, 'static');
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

const loadTasks = () => {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
};
const saveTasks = tasks => {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
};

const sendJson = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

const readBody = req => new Promise(resolve => {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve(null); } });
});

const PRIOS = ['alta', 'media', 'baja'];

async function handleApi(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean); // ['api','tasks', id?]
  if (parts[1] !== 'tasks' || parts.length > 3) return sendJson(res, { error: 'No encontrado' }, 404);
  const id = parts[2];

  if (req.method === 'GET' && !id) return sendJson(res, loadTasks());

  if (req.method === 'POST' && !id) {
    const data = await readBody(req);
    if (!data || !String(data.text ?? '').trim()) return sendJson(res, { error: 'Texto requerido' }, 400);
    const tasks = loadTasks();
    const task = {
      id: tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1,
      text: String(data.text).trim(),
      done: false,
      cat: String(data.cat ?? '').trim(),
      due: String(data.due ?? ''),
      prio: PRIOS.includes(data.prio) ? data.prio : 'media',
    };
    tasks.push(task);
    saveTasks(tasks);
    return sendJson(res, task, 201);
  }

  if (req.method === 'PUT' && id) {
    const data = await readBody(req);
    if (!data) return sendJson(res, { error: 'Petición inválida' }, 400);
    const tasks = loadTasks();
    const task = tasks.find(t => String(t.id) === id);
    if (!task) return sendJson(res, { error: 'No encontrada' }, 404);
    for (const k of ['text', 'done', 'cat', 'due', 'prio']) if (k in data) task[k] = data[k];
    saveTasks(tasks);
    return sendJson(res, task);
  }

  if (req.method === 'DELETE') {
    const tasks = loadTasks();
    saveTasks(id ? tasks.filter(t => String(t.id) !== id) : tasks.filter(t => !t.done));
    return sendJson(res, { ok: true });
  }

  sendJson(res, { error: 'Método no permitido' }, 405);
}

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

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch(() => sendJson(res, { error: 'Error interno' }, 500));
  } else if (req.method === 'GET') {
    serveStatic(req, res, pathname);
  } else {
    res.writeHead(405); res.end();
  }
}).listen(PORT, HOST, () => {
  console.log(`Gestor de tareas en http://localhost:${PORT}  (Ctrl+C para detener)`);
});
