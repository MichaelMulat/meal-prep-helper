-- Meal Prep Helper: tables mirrored from the local Dexie database (src/lib/db.ts).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.
--
-- Every row belongs to the signed-in user (row-level security). Deletes are soft
-- (`deleted = true`) so other devices learn about them; `updated_at` is set by the
-- server and drives incremental pulls.

create table if not exists public.recipes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id uuid not null,
  name text not null default '',
  region text not null default '',
  flavors text[] not null default '{}',
  minutes integer not null default 0,
  meals text[] not null default '{}',
  ingredients text[] not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.pantry (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id uuid not null,
  name text not null default '',
  quantity numeric not null default 0,
  unit text not null default '',
  category text not null default 'Other',
  expires date,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.plan (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null, -- 'YYYY-MM-DD|slot'
  date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  recipe_id uuid not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, key)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['recipes', 'pantry', 'plan'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before insert or update on public.%I
         for each row execute function public.touch_updated_at()', t);

    execute format('create index if not exists %I on public.%I (user_id, updated_at)', t || '_user_updated_idx', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    -- Live updates between devices.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
