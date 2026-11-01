import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterObservations, territoryIndicators } from '../src/domain/indicators';
import { importDataset, localRepository, parseCsv, validateDataset } from '../src/data/repository';
import { DEFAULT_FILTERS } from '../src/domain/model';
import type { Dataset, Governorate } from '../src/domain/model';
const demo: Dataset = JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8'));
const govs: Governorate[] = JSON.parse(readFileSync(new URL('../public/data/governorates.json', import.meta.url), 'utf8'));
test('Le jeu fictif valide respecte les références des 24 gouvernorats', () => {
  assert.doesNotThrow(() => validateDataset(demo, govs)); assert.equal(govs.length, 24);
});
test('Les totaux nationaux ne multiplient pas les sites CT + IRM', () => {
  const rows = filterObservations(demo.observations, DEFAULT_FILTERS);
  assert.equal(rows.filter(o => o.equipment_type === 'CT').reduce((a, b) => a + b.equipment_count, 0), 17);
  assert.equal(rows.filter(o => o.equipment_type === 'MRI').reduce((a, b) => a + b.equipment_count, 0), 9);
  assert.equal(new Set(rows.map(o => o.facility_id)).size, 12);
});
test('Filtres combinés et ratio sur un exemple calculé indépendamment', () => {
  const t = territoryIndicators(demo, govs, { equipment: ['CT'], sectors: ['public'], governorate: 'TN-11' })[0];
  assert.equal(t.ct, 3); assert.equal(t.mri, 0); assert.equal(t.facilities, 1); assert.equal(t.density, .3);
});
test('Inconnu, non recensé et absence vérifiée restent distincts', () => {
  const all = territoryIndicators(demo, govs, DEFAULT_FILTERS);
  assert.equal(all.find(t => t.code === 'TN-72')?.status, 'no_data');
  assert.equal(all.find(t => t.code === 'TN-31')?.status, 'not_recorded');
  assert.equal(all.find(t => t.code === 'TN-83')?.status, 'verified_absent');
  assert.equal(all.find(t => t.code === 'TN-83')?.density, 0);
  assert.equal(all.find(t => t.code === 'TN-31')?.density, null);
});
test('Une preuve d’absence sur un seul secteur ne couvre pas les deux', () => {
  const data = structuredClone(demo);
  data.coverage = data.coverage.filter(c => !(c.governorate_code === 'TN-83' && c.sector === 'private'));
  assert.equal(territoryIndicators(data, govs, DEFAULT_FILTERS).find(t => t.code === 'TN-83')?.status, 'no_data');
  assert.equal(territoryIndicators(data, govs, { ...DEFAULT_FILTERS, sectors: ['public'] }).find(t => t.code === 'TN-83')?.status, 'verified_absent');
});
test('Sans population ni sélection, aucun ratio ni absence présumée', () => {
  const data = { ...demo, populations: [] };
  assert.ok(territoryIndicators(data, govs, DEFAULT_FILTERS).every(t => t.density === null));
  assert.ok(territoryIndicators(demo, govs, { ...DEFAULT_FILTERS, equipment: [] }).every(t => t.status === 'no_data' && t.density === null));
});
test('Une observation historique du même appareil ne double pas le total', () => {
  const rows = [...demo.observations, { ...demo.observations[0], id: 'older', equipment_count: 9, observed_on: '2020-01-01' }];
  const selected = filterObservations(rows, { ...DEFAULT_FILTERS, governorate: 'TN-11', equipment: ['CT'], sectors: ['public'] });
  assert.equal(selected.length, 1); assert.equal(selected[0].equipment_count, 3);
});
test('Import refuse doublon, date impossible, mélange réel/fictif et absence contradictoire', () => {
  const duplicate = structuredClone(demo); duplicate.observations.push({ ...duplicate.observations[0], id: 'duplicate' });
  assert.throws(() => validateDataset(duplicate, govs), /Doublon/);
  const badDate = structuredClone(demo); badDate.observations[0].observed_on = '2025-02-30';
  assert.throws(() => validateDataset(badDate, govs), /Date invalide/);
  const mixed = structuredClone(demo); mixed.observations[0].is_demo = false; mixed.observations[0].verification = 'unverified';
  assert.throws(() => validateDataset(mixed, govs), /mélanger/);
  const conflict = structuredClone(demo); conflict.coverage.find(c => c.governorate_code === 'TN-11' && c.equipment_type === 'CT' && c.sector === 'public')!.status = 'verified_absent';
  assert.throws(() => validateDataset(conflict, govs), /contradictoires/);
});
test('CSV : guillemets, virgules et retours à la ligne sont conservés', () => {
  assert.deepEqual(parseCsv('a,b\r\n"texte, cité","sur\ndeux lignes"\r\n'), [{ a: 'texte, cité', b: 'sur\ndeux lignes' }]);
  assert.throws(() => parseCsv('a,b\n"incomplet,b'), /non fermé/);
});
test('Le CSV exemple est importable sans inventer population ni couverture', () => {
  const content = readFileSync(new URL('../public/data/observations.example.csv', import.meta.url), 'utf8');
  const imported = importDataset(content, 'example.csv', govs);
  assert.equal(imported.observations.length, 20); assert.equal(imported.populations.length, 0); assert.equal(imported.coverage.length, 0);
});
test('La version autonome charge les données intégrées sans aucune requête réseau', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { __ATLAS_LOCAL__: { dataset: demo, governorates: govs } } });
  globalThis.fetch = async () => { throw new Error('La version autonome ne doit pas appeler le réseau'); };
  try {
    const loaded = await localRepository.load();
    assert.equal(loaded.dataset.observations.length, 20);
    assert.equal(loaded.governorates.length, 24);
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
