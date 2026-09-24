-- CSL Kine: esquema para Supabase.
-- Ejecutar en SQL Editor. Cada profesional solo ve sus propios pacientes y evaluaciones (RLS).

create table if not exists public.patients (
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

-- region: id del módulo (hip, knee, shoulder, ankle, lumbar, cervical, elbow, wrist, …)
-- data: resultados de la batería + contexto clínico + protocolo (jsonb, definido por cada región)
create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  region      text not null,
  date        date not null default current_date,
  data        jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists patients_coach_idx on public.patients (coach_id);
create index if not exists assessments_patient_idx on public.assessments (patient_id, region, date desc);

alter table public.patients enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "owner patients" on public.patients;
create policy "owner patients" on public.patients
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "owner assessments" on public.assessments;
create policy "owner assessments" on public.assessments
  for all using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid()
    and exists (select 1 from public.patients p where p.id = patient_id and p.coach_id = auth.uid())
  );
