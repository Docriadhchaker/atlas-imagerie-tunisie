// All health and population values below are deliberately fictitious.
// Real governorate geometry is kept separate, with its original provenance.
import fs from 'node:fs';
const path = new URL('../public/data/', import.meta.url);
const geometry = JSON.parse(fs.readFileSync(new URL('tunisia-governorates.geojson', path), 'utf8'));
const governorates = geometry.features.map(f => ({ code: f.properties.shapeISO, name: f.properties.shapeName === 'El Kef' ? 'Le Kef' : f.properties.shapeName }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
fs.writeFileSync(new URL('governorates.json', path), JSON.stringify(governorates, null, 2));
const provenance = { observed_on: '2025-12-31', source: 'Jeu de démonstration fictif — Atlas Imagerie',
  source_reference: 'DEMO-LOCAL-001', verification: 'example', is_demo: true,
  note: 'Exemple inventé pour tester l’interface. Ne décrit aucun établissement ni équipement réel.' };
const sites = [
  ['01', 'Établissement exemple · Tunis A', 'Hôpital fictif', 'public', 'TN-11', 36.810, 10.155, 3, 2],
  ['02', 'Établissement exemple · Tunis B', 'Clinique fictive', 'private', 'TN-11', 36.790, 10.200, 2, 1],
  ['03', 'Établissement exemple · Ariana', 'Centre fictif', 'private', 'TN-12', 36.880, 10.190, 1, 1],
  ['04', 'Établissement exemple · Bizerte', 'Hôpital fictif', 'public', 'TN-23', 37.270, 9.870, 1, 0],
  ['05', 'Établissement exemple · Nabeul', 'Clinique fictive', 'private', 'TN-21', 36.450, 10.730, 1, 0],
  ['06', 'Établissement exemple · Sousse A', 'Hôpital fictif', 'public', 'TN-51', 35.830, 10.600, 2, 1],
  ['07', 'Établissement exemple · Sousse B', 'Clinique fictive', 'private', 'TN-51', 35.860, 10.570, 1, 1],
  ['08', 'Établissement exemple · Monastir', 'Hôpital fictif', 'public', 'TN-52', 35.760, 10.810, 1, 1],
  ['09', 'Établissement exemple · Sfax A', 'Hôpital fictif', 'public', 'TN-61', 34.740, 10.730, 2, 1],
  ['10', 'Établissement exemple · Sfax B', 'Centre fictif', 'private', 'TN-61', 34.780, 10.750, 1, 1],
  ['11', 'Établissement exemple · Kairouan', 'Hôpital fictif', 'public', 'TN-41', 35.670, 10.100, 1, 0],
  ['12', 'Établissement exemple · Gabès', 'Hôpital fictif', 'public', 'TN-81', 33.890, 10.090, 1, 0],
];
const observations = sites.flatMap(([id, name, type, sector, gov, lat, lng, ct, mri]) => [['CT', ct], ['MRI', mri]]
  .filter(([, count]) => count > 0).map(([equipment_type, equipment_count]) => ({ ...provenance,
    id: `demo-${id}-${equipment_type}`, facility_id: `demo-site-${id}`, facility_name: name, facility_type: type, sector,
    governorate_code: gov, delegation: null, latitude: lat, longitude: lng, equipment_type, equipment_count, functional_status: 'unknown' })));
const populations = [['TN-11', 1000000], ['TN-12', 600000], ['TN-23', 500000], ['TN-21', 800000], ['TN-51', 700000],
  ['TN-52', 550000], ['TN-61', 950000], ['TN-41', 500000], ['TN-81', 400000], ['TN-83', 150000]]
  .map(([governorate_code, population]) => ({ ...provenance, governorate_code, population, note: 'Population fictive pour tester les ratios. Aucune valeur démographique réelle.' }));
const coverage = governorates.flatMap(g => ['CT', 'MRI'].flatMap(equipment_type => ['public', 'private'].map(sector => ({
  ...provenance, governorate_code: g.code, equipment_type, sector,
  status: g.code === 'TN-83' ? 'verified_absent' : ['TN-31', 'TN-33', 'TN-42', 'TN-71'].includes(g.code)
    || observations.some(o => o.governorate_code === g.code) ? 'not_recorded' : 'no_data',
  note: g.code === 'TN-83' ? 'Scénario fictif d’absence vérifiée, sans aucune affirmation sur la réalité à Tataouine.' : provenance.note,
}))));
const dataset = { version: '1.0', title: 'Démonstration locale · aucune donnée sanitaire réelle', is_demo: true, updated_on: '2026-11-01', observations, populations, coverage };
fs.writeFileSync(new URL('demo.json', path), JSON.stringify(dataset, null, 2));
const fields = Object.keys(observations[0]);
const quote = x => '"' + String(x ?? '').replaceAll('"', '""') + '"';
fs.writeFileSync(new URL('observations.example.csv', path), '\uFEFF' + [fields.join(','), ...observations.map(o => fields.map(f => quote(o[f])).join(','))].join('\r\n'));
console.log(`Créé : ${governorates.length} gouvernorats, ${sites.length} sites fictifs, ${observations.length} observations fictives.`);
