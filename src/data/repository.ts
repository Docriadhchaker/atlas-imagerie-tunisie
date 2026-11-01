import { publicAsset } from './paths';
import type { Dataset, Governorate, Observation, Population, Coverage, Provenance } from '../domain/model';

export interface DataRepository { load(): Promise<{ dataset: Dataset; governorates: Governorate[] }> }
// Local implementation of the same contract used by the Supabase adapter.
export const localRepository: DataRepository = {
  async load() {
    if (window.__ATLAS_LOCAL__) {
      const { dataset, governorates } = window.__ATLAS_LOCAL__;
      validateDataset(dataset, governorates);
      return { dataset, governorates };
    }
    const responses = await Promise.all([fetch(publicAsset('/data/inventory2024.json')), fetch(publicAsset('/data/governorates.json'))]);
    if (responses.some(r => !r.ok)) throw new Error('Impossible de charger les fichiers de données locaux.');
    const [dataset, governorates] = await Promise.all(responses.map(r => r.json()));
    validateDataset(dataset, governorates);
    return { dataset, governorates };
  },
};

function fail(message: string): never { throw new Error(message); }
function text(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) fail(`Champ obligatoire : ${field}.`);
}
function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Date invalide ; format attendu AAAA-MM-JJ.');
}
function provenance(row: Provenance) {
  text(row.source, 'source'); text(row.source_reference, 'source_reference'); date(row.observed_on);
  if (!['verified', 'unverified', 'example'].includes(row.verification)) fail('Niveau de vérification invalide.');
  if (typeof row.is_demo !== 'boolean' || typeof row.note !== 'string') fail('is_demo et note doivent être renseignés.');
  if (row.is_demo !== (row.verification === 'example')) fail('Une donnée fictive doit porter le niveau example.');
}
export function validateDataset(data: Dataset, governorates: Governorate[]): void {
  if (!data || !Array.isArray(data.observations) || !Array.isArray(data.populations) || !Array.isArray(data.coverage)) fail('Structure JSON invalide.');
  text(data.title, 'title'); text(data.version, 'version'); date(data.updated_on);
  if (typeof data.is_demo !== 'boolean') fail('is_demo doit être un booléen.');
  const codes = new Set(governorates.map(g => g.code));
  const keys = new Set<string>(); const ids = new Set<string>(); const sites = new Map<string, string>();
  for (const [index, r] of data.observations.entries()) {
    try {
      if (!r || typeof r !== 'object') fail('Observation invalide.');
      provenance(r);
      for (const field of ['id', 'facility_id', 'facility_name', 'facility_type'] as const) text(r[field], field);
      if (!codes.has(r.governorate_code)) fail('Code de gouvernorat inconnu.');
      if (!['CT', 'MRI'].includes(r.equipment_type) || !['public', 'private'].includes(r.sector)) fail('Type ou secteur invalide.');
      if (!Number.isInteger(r.equipment_count) || r.equipment_count < 1) fail('Le nombre doit être un entier positif ; les absences vont dans coverage.');
      if (!['operational', 'non_operational', 'unknown'].includes(r.functional_status)) fail('Statut fonctionnel invalide.');
      if (r.delegation !== null && typeof r.delegation !== 'string') fail('Délégation invalide.');
      const noCoords = r.latitude === null && r.longitude === null;
      if (!noCoords && !(typeof r.latitude === 'number' && typeof r.longitude === 'number' && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)
        && r.latitude >= 30 && r.latitude <= 38 && r.longitude >= 7 && r.longitude <= 12)) fail('Coordonnées manquantes par paire ou hors de la zone tunisienne.');
      const key = `${r.facility_id}:${r.equipment_type}:${r.observed_on}`;
      if (keys.has(key) || ids.has(r.id)) fail('Doublon de site/type/date ou identifiant.');
      keys.add(key); ids.add(r.id);
      const site = JSON.stringify([r.facility_name, r.facility_type, r.sector, r.governorate_code, r.delegation, r.latitude, r.longitude]);
      if (sites.has(r.facility_id) && sites.get(r.facility_id) !== site) fail('Informations de site contradictoires pour le même facility_id.');
      sites.set(r.facility_id, site);
    } catch (e) { fail(`Observation ${index + 1} : ${(e as Error).message}`); }
  }
  const popKeys = new Set<string>(); const coverageKeys = new Set<string>();
  for (const p of data.populations as Population[]) {
    provenance(p);
    if (!codes.has(p.governorate_code) || !Number.isInteger(p.population) || p.population <= 0) fail('Population invalide.');
    const key = `${p.governorate_code}:${p.observed_on}`;
    if (popKeys.has(key)) fail('Population en doublon pour le même territoire et la même date.');
    popKeys.add(key);
  }
  for (const c of data.coverage as Coverage[]) {
    provenance(c);
    if (!codes.has(c.governorate_code) || !['CT', 'MRI'].includes(c.equipment_type) || !['public', 'private'].includes(c.sector)
      || !['no_data', 'not_recorded', 'verified_absent'].includes(c.status)) fail('Couverture invalide.');
    if (c.status === 'verified_absent' && c.verification === 'unverified') fail('Une absence vérifiée exige une vérification.');
    const key = `${c.governorate_code}:${c.equipment_type}:${c.sector}:${c.observed_on}`;
    if (coverageKeys.has(key)) fail('Couverture en doublon.');
    coverageKeys.add(key);
    if (c.status === 'verified_absent' && data.observations.some(o => o.governorate_code === c.governorate_code
      && o.equipment_type === c.equipment_type && o.sector === c.sector && o.observed_on === c.observed_on)) fail('Absence et présence contradictoires à la même date.');
  }
  const all: Provenance[] = [...data.observations, ...data.populations, ...data.coverage];
  if (data.territorial_counts) {
    if (!Array.isArray(data.territorial_counts)) fail('Inventaire territorial invalide.');
    const territorialKeys = new Set<string>();
    for (const r of data.territorial_counts) {
      provenance(r);
      if (!codes.has(r.governorate_code) || !['CT','MRI'].includes(r.equipment_type) || !['public','private'].includes(r.sector)
        || !Number.isInteger(r.equipment_count) || r.equipment_count < 0) fail('Ligne territoriale invalide.');
      const key = `${r.governorate_code}:${r.equipment_type}:${r.sector}:${r.observed_on}`;
      if (territorialKeys.has(key)) fail('Doublon territorial.');
      territorialKeys.add(key);
    }
    all.push(...data.territorial_counts);
  }
  if (data.facility_evidence) {
    if (!Array.isArray(data.facility_evidence)) fail('Dossiers documentaires invalides.');
    for (const r of data.facility_evidence) {
      if (!r || !r.id || !r.facility_id || !r.facility_name || !['CT','MRI'].includes(r.equipment_type)
        || (r.sector !== null && !['public','private'].includes(r.sector)) || r.is_demo !== false
        || (r.governorate_code !== null && !codes.has(r.governorate_code))) fail('Dossier documentaire invalide.');
      const noCoords = r.latitude === null && r.longitude === null;
      if (!noCoords && !(typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.latitude >= 30 && r.latitude <= 38 && r.longitude >= 7 && r.longitude <= 12 && !!r.location_source)) fail('La localisation documentaire doit être sourcée.');
      text(r.source, 'source'); text(r.source_reference, 'source_reference');
    }
  }
  if (all.some(r => r.is_demo !== data.is_demo)) fail('Ne pas mélanger les données fictives et réelles dans un même jeu.');
}
export async function loadBundledDataset(name: 'demo' | 'inventory2024'): Promise<Dataset> {
  const embedded = window.__ATLAS_LOCAL__?.datasets?.[name];
  if (embedded) return embedded;
  const response = await fetch(publicAsset(`/data/${name}.json`));
  if (!response.ok) throw new Error('Impossible de charger ce jeu local.');
  return response.json();
}

/** RFC4180-style parser: quoted separators, escaped quotes, CRLF and multiline cells. */
export function parseCsv(input: string): Record<string, string>[] {
  const source = input.replace(/^\uFEFF/, '');
  const delimiter = source.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); if (row.some(c => c.trim())) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) fail('CSV invalide : guillemet non fermé.');
  row.push(cell); if (row.some(c => c.trim())) rows.push(row);
  const headers = rows.shift()?.map(c => c.trim());
  if (!headers || new Set(headers).size !== headers.length) fail('En-têtes CSV manquants ou dupliqués.');
  return rows.map((values, i) => {
    if (values.length !== headers.length) fail(`Ligne CSV ${i + 2} : nombre de colonnes incorrect.`);
    return Object.fromEntries(headers.map((h, index) => [h, values[index].trim()]));
  });
}
export function importDataset(content: string, filename: string, governorates: Governorate[]): Dataset {
  let dataset: Dataset;
  if (filename.toLowerCase().endsWith('.csv')) {
    const rows = parseCsv(content);
    if (!rows.length) fail('Le CSV ne contient aucune observation.');
    const observations = rows.map(r => {
      if (!['true', 'false'].includes(r.is_demo)) fail('is_demo doit valoir true ou false.');
      return { ...r, latitude: r.latitude ? Number(r.latitude) : null, longitude: r.longitude ? Number(r.longitude) : null,
        delegation: r.delegation || null, equipment_count: r.equipment_count ? Number(r.equipment_count) : NaN,
        is_demo: r.is_demo === 'true', functional_status: r.functional_status || 'unknown', note: r.note ?? '' } as Observation;
    });
    dataset = { version: '1.0', title: filename, is_demo: observations.some(o => o.is_demo), updated_on: new Date().toISOString().slice(0, 10),
      observations, populations: [], coverage: [] };
  } else if (filename.toLowerCase().endsWith('.json')) dataset = JSON.parse(content.replace(/^\uFEFF/, ''));
  else fail('Choisissez un fichier .json ou .csv.');
  validateDataset(dataset!, governorates);
  return dataset!;
}
