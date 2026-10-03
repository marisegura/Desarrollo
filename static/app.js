const PRIO_ORDER = { alta: 0, media: 1, baja: 2 };
let tasks = [];
let filter = 'all';
let catFilter = '';
let editingId = null;

const $ = id => document.getElementById(id);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

async function api(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(res.status);
    $('error').hidden = true;
    return await res.json();
  } catch {
    $('error').hidden = false;
    return null;
  }
}

async function reload() {
  const data = await api('GET', '/api/tasks');
  if (data) tasks = data;
  render();
}

async function update(t, changes) {
  const updated = await api('PUT', `/api/tasks/${t.id}`, changes);
  if (updated) Object.assign(t, updated);
  render();
}

function formatDate(s) {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function sorted(arr) {
  return [...arr].sort((a, b) =>
    a.done - b.done ||
    PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio] ||
    (a.due || '9999').localeCompare(b.due || '9999'));
}

function renderCats() {
  const cats = [...new Set(tasks.map(t => t.cat).filter(Boolean))].sort();
  $('cats').replaceChildren(...cats.map(c => new Option(c)));
  const sel = $('catFilter');
  sel.replaceChildren(new Option('Todas las categorías', ''), ...cats.map(c => new Option(c, c)));
  if (!cats.includes(catFilter)) catFilter = '';
  sel.value = catFilter;
}

function taskItem(t) {
  const li = document.createElement('li');
  li.className = `p-${t.prio}` + (t.done ? ' done' : '');

  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = t.done;
  cb.onchange = () => update(t, { done: cb.checked });
  li.append(cb);

  const body = document.createElement('div');
  body.className = 'body';

  if (editingId === t.id) {
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'edit'; inp.value = t.text;
    let finished = false;
    const finish = ok => {
      if (finished) return;
      finished = true;
      const v = inp.value.trim();
      editingId = null;
      if (ok && v && v !== t.text) update(t, { text: v });
      else render();
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    };
    inp.onblur = () => finish(true);
    body.append(inp);
    li.append(body);
    setTimeout(() => inp.focus(), 0);
    return li;
  }

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = t.text;
  body.append(title);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const addTag = (text, cls = '') => {
    const s = document.createElement('span');
    s.className = 'tag ' + cls; s.textContent = text; meta.append(s);
  };
  if (t.cat) addTag('# ' + t.cat);
  if (t.due) addTag('📅 ' + formatDate(t.due), !t.done && t.due < today() ? 'overdue' : '');
  if (meta.children.length) body.append(meta);
  li.append(body);

  const edit = document.createElement('button');
  edit.className = 'icon'; edit.textContent = '✎'; edit.title = 'Editar';
  edit.onclick = () => { editingId = t.id; render(); };
  const del = document.createElement('button');
  del.className = 'icon del'; del.textContent = '×'; del.title = 'Eliminar';
  del.onclick = async () => {
    if (await api('DELETE', `/api/tasks/${t.id}`)) await reload();
  };
  li.append(edit, del);
  return li;
}

function render() {
  renderCats();
  const visible = sorted(tasks.filter(t =>
    (filter === 'all' || (filter === 'done') === t.done) &&
    (!catFilter || t.cat === catFilter)));
  const list = $('list');
  list.replaceChildren();
  if (!visible.length) {
    const li = document.createElement('li');
    li.className = 'empty'; li.textContent = 'No hay tareas';
    list.append(li);
  }
  visible.forEach(t => list.append(taskItem(t)));

  const pending = tasks.filter(t => !t.done).length;
  $('count').textContent = `${pending} pendiente${pending === 1 ? '' : 's'}`;
  document.querySelectorAll('#filters button').forEach(b =>
    b.classList.toggle('active', b.dataset.f === filter));
}

$('form').onsubmit = async e => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  const created = await api('POST', '/api/tasks', {
    text, cat: $('cat').value.trim(), due: $('due').value, prio: $('prio').value,
  });
  if (created) {
    $('text').value = ''; $('due').value = '';
    await reload();
  }
  $('text').focus();
};
$('filters').onclick = e => {
  if (e.target.dataset.f) { filter = e.target.dataset.f; render(); }
};
$('catFilter').onchange = e => { catFilter = e.target.value; render(); };
$('clear').onclick = async () => {
  if (await api('DELETE', '/api/tasks')) await reload();
};

reload();
