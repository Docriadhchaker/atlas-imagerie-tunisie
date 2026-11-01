-- MVP: atomic versioned publications. The normalized future model is in schema.sql.
begin;
create table if not exists public.atlas_snapshots (
  id text primary key,
  dataset jsonb not null check (jsonb_typeof(dataset) = 'object'),
  governorates jsonb not null check (jsonb_typeof(governorates) = 'array'),
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  check (dataset ?& array['is_demo','title','version','updated_on','observations','populations','coverage']),
  check (dataset->>'is_demo' = 'false')
);
alter table public.atlas_snapshots enable row level security;
revoke all on public.atlas_snapshots from public, anon, authenticated;
grant select on public.atlas_snapshots to anon, authenticated;
drop policy if exists atlas_public_snapshots on public.atlas_snapshots;
create policy atlas_public_snapshots on public.atlas_snapshots
  for select to anon, authenticated using (published = true);
comment on table public.atlas_snapshots is 'Public documentary snapshots, with sources and uncertainty. Browser access is read-only.';
commit;
