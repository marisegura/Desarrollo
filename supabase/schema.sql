-- Esquema de la base de datos para el gestor de tareas (Supabase / PostgreSQL)
-- Cómo usar: Supabase > SQL Editor > pega este archivo > Run.

-- Tabla de tareas. Equivale al JSON local { id, text, done, cat, due, prio }.
create table if not exists public.tasks (
  id        bigint generated always as identity primary key,
  text      text        not null check (char_length(trim(text)) > 0),
  done      boolean     not null default false,
  cat       text        not null default '',
  due       date,                       -- null si la tarea no tiene fecha
  prio      text        not null default 'media' check (prio in ('alta', 'media', 'baja')),
  created_at timestamptz not null default now()
);

-- Índices útiles para filtrar/ordenar en la UI.
create index if not exists tasks_done_idx on public.tasks (done);
create index if not exists tasks_prio_idx on public.tasks (prio);
create index if not exists tasks_due_idx  on public.tasks (due);

-- Seguridad a nivel de fila (RLS).
alter table public.tasks enable row level security;

-- Política abierta para desarrollo local con la clave anon.
-- ⚠️ En producción deberías restringir esto por usuario (auth.uid()).
-- Se borra primero para que el script se pueda ejecutar varias veces sin error.
drop policy if exists "tasks: acceso completo (dev)" on public.tasks;
create policy "tasks: acceso completo (dev)"
  on public.tasks
  for all
  using (true)
  with check (true);
