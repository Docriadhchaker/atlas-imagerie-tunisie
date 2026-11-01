-- Creates a temporary draft in a transaction and always rolls it back.
-- Expected as anon: draft_visible=0, published_visible=1, can_insert/update/delete=false.
begin;
insert into public.atlas_snapshots(id, dataset, governorates, published)
select 'atlas-rls-verification', dataset, governorates, false
from public.atlas_snapshots where id='inventory2024';
set local role anon;
select
  (select count(*) from public.atlas_snapshots where id='atlas-rls-verification') as draft_visible,
  (select count(*) from public.atlas_snapshots where id='inventory2024') as published_visible,
  has_table_privilege('anon','public.atlas_snapshots','INSERT') as can_insert,
  has_table_privilege('anon','public.atlas_snapshots','UPDATE') as can_update,
  has_table_privilege('anon','public.atlas_snapshots','DELETE') as can_delete;
rollback;
