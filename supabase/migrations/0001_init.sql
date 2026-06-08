-- Enums
create type prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
create type prayer_status as enum ('not_yet', 'on_time', 'late', 'missed');
create type habit_type as enum ('boolean', 'count');

-- updated_at trigger function
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'star',
  type habit_type not null default 'boolean',
  target int,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create trigger habits_updated_at before update on habits
  for each row execute function set_updated_at();

-- habit_logs
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  value int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, habit_id, date)
);
create trigger habit_logs_updated_at before update on habit_logs
  for each row execute function set_updated_at();

-- prayer_logs
create table prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  prayer prayer_name not null,
  status prayer_status not null default 'not_yet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, prayer)
);
create trigger prayer_logs_updated_at before update on prayer_logs
  for each row execute function set_updated_at();

-- Row-Level Security
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table prayer_logs enable row level security;

create policy "own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habit_logs" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own prayer_logs" on prayer_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
