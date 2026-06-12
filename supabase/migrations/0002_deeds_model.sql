-- Clean up old test tables
drop table if exists prayer_logs cascade;
drop table if exists habit_logs cascade;
drop table if exists habits cascade;
drop type if exists prayer_name cascade;
drop type if exists prayer_status cascade;
drop type if exists habit_type cascade;

-- 1. deed_definitions (Global templates catalog)
create table deed_definitions (
  id text primary key,
  name text not null,
  type text not null, -- boolean | measured
  default_schedule text not null, -- daily | weekdays | etc.
  payload text -- JSON metadata
);

-- 2. sections
create table sections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  deleted_at text, -- YYYY-MM-DD
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- 3. dhikrs
create table dhikrs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  target int, -- Independent counter target
  created_at text not null, -- YYYY-MM-DD
  deleted_at text, -- YYYY-MM-DD
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- 4. deeds
create table deeds (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  definition_id text references deed_definitions(id) on delete set null,
  section_id text not null references sections(id) on delete cascade,
  name text not null,
  type text not null, -- boolean | measured
  schedule text not null, -- daily | weekdays | etc.
  created_at text not null, -- YYYY-MM-DD
  sort_order int not null default 0,
  deleted_at text, -- YYYY-MM-DD
  linked_dhikr_id text references dhikrs(id) on delete set null,
  target int, -- Scorecard deed target
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

-- 5. deed_logs
create table deed_logs (
  id text primary key, -- 'date:deed_id'
  user_id uuid not null references auth.users(id) on delete cascade,
  deed_id text not null references deeds(id) on delete cascade,
  date text not null,
  status text not null default 'not_yet',
  value int,
  note text, -- Habit notes
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, deed_id)
);

-- 6. dhikr_logs
create table dhikr_logs (
  id text primary key, -- 'date:dhikr_id'
  user_id uuid not null references auth.users(id) on delete cascade,
  dhikr_id text not null references dhikrs(id) on delete cascade,
  date text not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, dhikr_id)
);

-- Row-Level Security
alter table sections enable row level security;
alter table dhikrs enable row level security;
alter table deeds enable row level security;
alter table deed_logs enable row level security;
alter table dhikr_logs enable row level security;

create policy "own sections" on sections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own dhikrs" on dhikrs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own deeds" on deeds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own deed_logs" on deed_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own dhikr_logs" on dhikr_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
