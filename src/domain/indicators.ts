import type { Dataset, Filters, Governorate, Observation, TerritoryIndicator, TerritoryStatus, Equipment, FacilityEvidence } from './model';

export function latestObservations(rows: Observation[]): Observation[] {
  const latest = new Map<string, Observation>();
  for (const row of rows) {
    const key = `${row.facility_id}:${row.equipment_type}`;
    if (!latest.has(key) || latest.get(key)!.observed_on < row.observed_on) latest.set(key, row);
  }
  return [...latest.values()];
}
export function filterObservations(rows: Observation[], filters: Filters): Observation[] {
  return latestObservations(rows).filter(row => filters.equipment.includes(row.equipment_type)
    && filters.sectors.includes(row.sector) && (!filters.governorate || row.governorate_code === filters.governorate));
}

export function territoryIndicators(data: Dataset, governorates: Governorate[], filters: Filters): TerritoryIndicator[] {
  if (data.territorial_counts) return aggregateIndicators(data, governorates, filters);
  const rows = filterObservations(data.observations, { ...filters, governorate: '' });
  return governorates.filter(g => !filters.governorate || g.code === filters.governorate).map(g => {
    const own = rows.filter(r => r.governorate_code === g.code);
    const sum = (predicate: (o: Observation) => boolean) => own.filter(predicate).reduce((a, b) => a + b.equipment_count, 0);
    const statusFor = (types: Equipment[]): TerritoryStatus => {
      if (sum(o => types.includes(o.equipment_type)) > 0) return 'observed';
      const statuses = types.flatMap(type => filters.sectors.map(sector => {
        const evidence = data.coverage.filter(c => c.governorate_code === g.code && c.equipment_type === type && c.sector === sector)
          .sort((a, b) => b.observed_on.localeCompare(a.observed_on))[0];
        // Missing evidence or an empty selection can never establish absence.
        return evidence?.status ?? 'no_data';
      }));
      if (!statuses.length || statuses.includes('no_data')) return 'no_data';
      if (statuses.every(s => s === 'verified_absent')) return 'verified_absent';
      return 'not_recorded';
    };
    const total = sum(() => true);
    const population = data.populations.filter(p => p.governorate_code === g.code)
      .sort((a, b) => b.observed_on.localeCompare(a.observed_on))[0];
    const status = statusFor(filters.equipment);
    return { ...g, ct: sum(o => o.equipment_type === 'CT'), mri: sum(o => o.equipment_type === 'MRI'), total,
      publicCount: sum(o => o.sector === 'public'), privateCount: sum(o => o.sector === 'private'),
      facilities: new Set(own.filter(o => o.equipment_count > 0).map(o => o.facility_id)).size,
      status, ctStatus: statusFor(['CT']), mriStatus: statusFor(['MRI']), population,
      density: population && (total > 0 || status === 'verified_absent') ? total / population.population * 100_000 : null };
  });
}
function aggregateIndicators(data: Dataset, governorates: Governorate[], filters: Filters): TerritoryIndicator[] {
  return governorates.filter(g => !filters.governorate || filters.governorate === g.code).map(g => {
    const latest = new Map<string, NonNullable<Dataset['territorial_counts']>[number]>();
    for (const row of data.territorial_counts!) {
      if (row.governorate_code !== g.code) continue;
      const key = `${row.equipment_type}:${row.sector}`;
      if (!latest.has(key) || latest.get(key)!.observed_on < row.observed_on) latest.set(key, row);
    }
    const selected = [...latest.values()].filter(r => filters.equipment.includes(r.equipment_type) && filters.sectors.includes(r.sector));
    const sum = (predicate: (r: typeof selected[number]) => boolean) => selected.filter(predicate).reduce((a, r) => a + r.equipment_count, 0);
    const statusFor = (types: Equipment[]): TerritoryStatus => {
      const scoped = selected.filter(r => types.includes(r.equipment_type));
      if (scoped.some(r => r.equipment_count > 0)) return 'observed';
      const expected = types.length * filters.sectors.length;
      return expected > 0 && scoped.length === expected ? 'source_zero' : 'no_data';
    };
    const total = sum(() => true); const status = statusFor(filters.equipment);
    const complete = filters.equipment.length * filters.sectors.length === selected.length && selected.length > 0;
    const population = data.populations.filter(p => p.governorate_code === g.code).sort((a,b) => b.observed_on.localeCompare(a.observed_on))[0];
    return { ...g, ct: sum(r => r.equipment_type === 'CT'), mri: sum(r => r.equipment_type === 'MRI'), total,
      publicCount: sum(r => r.sector === 'public'), privateCount: sum(r => r.sector === 'private'), facilities: 0,
      status, ctStatus: statusFor(['CT']), mriStatus: statusFor(['MRI']), population,
      density: complete && population ? total / population.population * 100_000 : null,
      source_reference: selected[0]?.source_reference, observed_on: selected[0]?.observed_on,
      verification: selected.some(r => r.verification === 'unverified') ? 'unverified' : selected[0]?.verification };
  });
}
export function filterEvidence(rows: FacilityEvidence[], filters: Filters) {
  return rows.filter(r => filters.equipment.includes(r.equipment_type)
    && (r.sector ? filters.sectors.includes(r.sector) : filters.sectors.length === 2)
    && (!filters.governorate || r.governorate_code === filters.governorate));
}
export const number = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
export function displayCount(count: number, status: TerritoryStatus) {
  return count > 0 || status === 'verified_absent' || status === 'source_zero' ? String(count) : '—';
}
