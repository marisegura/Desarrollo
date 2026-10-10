// API de tareas sobre Supabase (REST/PostgREST). La usan server.js (local) y api/index.js (Vercel).
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const PRIOS = ['alta', 'media', 'baja'];

// Llamada a la tabla public.tasks.
async function db(method, query = '', body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Faltan SUPABASE_URL / SUPABASE_KEY');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Formato que espera el frontend: { id, text, done, cat, due, prio }.
const toClient = r => ({ id: r.id, text: r.text, done: r.done, cat: r.cat, due: r.due || '', prio: r.prio });

const sendJson = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

const readBody = req => new Promise(resolve => {
  // Vercel puede entregar el body ya parseado.
  if (req.body !== undefined) {
    if (typeof req.body === 'object') return resolve(req.body);
    try { return resolve(JSON.parse(req.body || '{}')); } catch { return resolve(null); }
  }
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve(null); } });
});

async function handleApi(req, res, pathname) {
  const parts = pathname.split('/').filter(Boolean); // ['api','tasks', id?]
  if (parts[1] !== 'tasks' || parts.length > 3) return sendJson(res, { error: 'No encontrado' }, 404);
  const id = parts[2];
  if (id !== undefined && !/^\d+$/.test(id)) return sendJson(res, { error: 'Id inválido' }, 400);

  if (req.method === 'GET' && !id) {
    const rows = await db('GET', '?select=*&order=id.asc');
    return sendJson(res, rows.map(toClient));
  }

  if (req.method === 'POST' && !id) {
    const data = await readBody(req);
    if (!data || !String(data.text ?? '').trim()) return sendJson(res, { error: 'Texto requerido' }, 400);
    const [row] = await db('POST', '', {
      text: String(data.text).trim(),
      done: false,
      cat: String(data.cat ?? '').trim(),
      due: data.due ? String(data.due) : null,
      prio: PRIOS.includes(data.prio) ? data.prio : 'media',
    });
    return sendJson(res, toClient(row), 201);
  }

  if (req.method === 'PUT' && id) {
    const data = await readBody(req);
    if (!data) return sendJson(res, { error: 'Petición inválida' }, 400);
    const changes = {};
    if ('text' in data) changes.text = String(data.text).trim();
    if ('done' in data) changes.done = Boolean(data.done);
    if ('cat' in data) changes.cat = String(data.cat ?? '').trim();
    if ('due' in data) changes.due = data.due ? String(data.due) : null;
    if ('prio' in data && PRIOS.includes(data.prio)) changes.prio = data.prio;
    const rows = Object.keys(changes).length
      ? await db('PATCH', `?id=eq.${id}`, changes)
      : await db('GET', `?id=eq.${id}&select=*`);
    if (!rows.length) return sendJson(res, { error: 'No encontrada' }, 404);
    return sendJson(res, toClient(rows[0]));
  }

  if (req.method === 'DELETE') {
    await db('DELETE', id ? `?id=eq.${id}` : '?done=eq.true');
    return sendJson(res, { ok: true });
  }

  sendJson(res, { error: 'Método no permitido' }, 405);
}

// Envuelve handleApi con manejo de errores (se registra el detalle en el log del servidor).
const apiHandler = (req, res, pathname) =>
  handleApi(req, res, pathname).catch(err => {
    console.error(err);
    sendJson(res, { error: 'Error interno' }, 500);
  });

module.exports = { apiHandler };
