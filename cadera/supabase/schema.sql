-- CSL Cadera: esquema para Supabase.
-- Ejecutar en SQL Editor. Cada coach solo ve sus propios atletas y evaluaciones (RLS).

create table if not exists public.athletes (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  birthdate     date,
  sex           text check (sex in ('F', 'M', 'X')),
  sport         text,
  dominant_side text check (dominant_side in ('R', 'L')),
  leg_length_r  numeric(5,1),
  leg_length_l  numeric(5,1),
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  athlete_id  uuid not null references public.athletes (id) on delete cascade,
  date        date not null default current_date,
  data        jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists athletes_coach_idx on public.athletes (coach_id);
create index if not exists assessments_athlete_idx on public.assessments (athlete_id, date desc);

alter table public.athletes enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "coach owns athletes" on public.athletes;
create policy "coach owns athletes" on public.athletes
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "coach owns assessments" on public.assessments;
create policy "coach owns assessments" on public.assessments
  for all using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.athletes a where a.id = athlete_id and a.coach_id = auth.uid())
  );
