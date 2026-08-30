// Script para crear las tablas en Supabase via Management API
// Ejecutar con: node create-tables.mjs
// Requiere: SUPABASE_MANAGEMENT_TOKEN (Personal Access Token)
// Obtenlo en: https://supabase.com/dashboard/account/tokens

import https from 'https'

const PROJECT_REF = 'jklhajnugwivwjcdcwvh'
// Pega aquí tu Personal Access Token de Supabase
const MGMT_TOKEN  = process.env.SUPABASE_PAT ?? ''

if (!MGMT_TOKEN) {
  console.error('❌ Falta SUPABASE_PAT. Ejecútalo así:')
  console.error('   set SUPABASE_PAT=tu_token && node create-tables.mjs')
  process.exit(1)
}

const SQL = `
-- TABLA: clients
create table if not exists public.clients (
  id          text primary key,
  code        text not null,
  name        text not null,
  company     text not null,
  email       text not null,
  phone       text default '',
  status      text not null default 'Activo',
  created_at  timestamptz not null default now()
);

-- TABLA: sales
create table if not exists public.sales (
  id          text primary key,
  code        text not null,
  client_id   text references public.clients(id) on delete set null,
  product     text not null,
  quantity    integer not null default 1,
  unit_price  numeric not null default 0,
  amount      numeric not null default 0,
  date        text not null,
  status      text not null default 'Pendiente',
  created_at  timestamptz not null default now()
);

-- TABLA: datasets (almacena JSON completo del archivo subido)
create table if not exists public.datasets (
  id             text primary key,
  name           text not null,
  extension      text not null,
  size_bytes     bigint not null default 0,
  created_at     timestamptz not null default now(),
  tables         jsonb not null default '[]',
  total_rows     integer not null default 0,
  total_columns  integer not null default 0
);

-- Habilitar RLS (Row Level Security) - acceso libre para pruebas
alter table public.clients  enable row level security;
alter table public.sales     enable row level security;
alter table public.datasets  enable row level security;

-- Políticas: cualquier usuario autenticado puede operar
create policy if not exists "clients_auth_all"  on public.clients  for all using (auth.role() = 'authenticated');
create policy if not exists "sales_auth_all"    on public.sales    for all using (auth.role() = 'authenticated');
create policy if not exists "datasets_auth_all" on public.datasets for all using (auth.role() = 'authenticated');
`

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const options = {
      hostname: 'api.supabase.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

console.log('\n🗄️  Creando tablas en Supabase...')

const result = await post(
  `/v1/projects/${PROJECT_REF}/database/query`,
  { query: SQL },
  MGMT_TOKEN,
)

if (result.status === 200 || result.status === 201) {
  console.log('✅ Tablas creadas correctamente.')
} else {
  console.error('❌ Error:', result.status, JSON.stringify(result.body, null, 2))
}
