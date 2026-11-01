-- FUTURE MIGRATION ONLY. No connection and no project is created by this file.
-- Code schema stores the MVP's count observations, not a registry of individual machines.
begin;
create table public.governorates (
  code text primary key, name text not null
);
create table public.facilities (
  id text primary key, name text not null, facility_type text not null,
  sector text not null check (sector in ('public','private')),
  governorate_code text not null references public.governorates,
  delegation text, latitude double precision, longitude double precision,
  check ((latitude is null) = (longitude is null)),
  check (latitude between -90 and 90), check (longitude between -180 and 180)
);
create table public.equipment_types (code text primary key, label text not null);
insert into public.equipment_types values ('CT','Scanner CT'),('MRI','IRM');
create table public.sources (
  id uuid primary key default gen_random_uuid(), title text not null,
  reference text not null, note text not null default ''
);
create table public.observations (
  id text primary key, facility_id text not null references public.facilities,
  equipment_type text not null references public.equipment_types,
  equipment_count integer not null check (equipment_count > 0), observed_on date not null,
  source_id uuid not null references public.sources,
  verification text not null check (verification in ('verified','unverified','example')),
  functional_status text not null default 'unknown' check (functional_status in ('operational','non_operational','unknown')),
  is_demo boolean not null default false, note text not null default '',
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  unique (facility_id,equipment_type,observed_on),
  check (is_demo = (verification = 'example'))
);
create table public.populations (
  id uuid primary key default gen_random_uuid(), governorate_code text not null references public.governorates,
  population bigint not null check (population > 0), observed_on date not null,
  source_id uuid not null references public.sources,
  verification text not null check (verification in ('verified','unverified','example')),
  is_demo boolean not null default false, note text not null default '',
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  unique(governorate_code,observed_on), check (is_demo = (verification = 'example'))
);
create table public.coverage (
  id uuid primary key default gen_random_uuid(), governorate_code text not null references public.governorates,
  equipment_type text not null references public.equipment_types,
  sector text not null check (sector in ('public','private')),
  status text not null check (status in ('no_data','not_recorded','verified_absent')),
  observed_on date not null, source_id uuid not null references public.sources,
  verification text not null check (verification in ('verified','unverified','example')),
  is_demo boolean not null default false, note text not null default '',
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  unique(governorate_code,equipment_type,sector,observed_on),
  check (is_demo = (verification = 'example')),
  check (status <> 'verified_absent' or verification <> 'unverified')
);
-- Territorial counts are never added to site observations; they are a distinct snapshot layer.
create table public.territorial_counts (
  id uuid primary key default gen_random_uuid(), governorate_code text not null references public.governorates,
  equipment_type text not null references public.equipment_types,
  sector text not null check (sector in ('public','private')),
  equipment_count integer not null check (equipment_count >= 0), observed_on date not null,
  source_id uuid not null references public.sources,
  verification text not null check (verification in ('verified','unverified','example')),
  is_demo boolean not null default false, note text not null default '',
  publication_status text not null default 'draft' check (publication_status in ('draft','published')),
  unique(governorate_code,equipment_type,sector,observed_on,source_id),
  check (is_demo = (verification = 'example'))
);
create table public.facility_evidence (
  id text primary key, facility_id text references public.facilities,
  equipment_type text not null references public.equipment_types,
  evidence_status text not null, observation_period text,
  source_id uuid not null references public.sources, source_date text,
  confidence text not null, note text not null default '', location_source text,
  publication_status text not null default 'draft' check (publication_status in ('draft','published'))
);
-- Fail closed until a later, reviewed migration adds limited read policies and admin writes.
alter table public.governorates enable row level security;
alter table public.facilities enable row level security;
alter table public.equipment_types enable row level security;
alter table public.sources enable row level security;
alter table public.observations enable row level security;
alter table public.populations enable row level security;
alter table public.coverage enable row level security;
alter table public.territorial_counts enable row level security;
alter table public.facility_evidence enable row level security;
commit;
