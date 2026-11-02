import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importDataFile } from '../src/data/importFile';
import { importDataset } from '../src/data/repository';
import type { Governorate } from '../src/domain/model';

const governorates: Governorate[] = JSON.parse(readFileSync(new URL('../public/data/governorates.json', import.meta.url), 'utf8'));
const file = (relative: string, name: string) => new File([new Uint8Array(readFileSync(new URL(relative, import.meta.url)))], name);

test('Le modèle Excel conserve les observations CSV, dates, nombres, booléens et provenance', async () => {
  const excel = await importDataFile(file('../public/data/observations.example.xlsx', 'exemple.XLSX'), governorates);
  const csv = importDataset(readFileSync(new URL('../public/data/observations.example.csv', import.meta.url), 'utf8'), 'exemple.csv', governorates);
  assert.equal(excel.title, 'exemple.XLSX');
  assert.deepEqual(excel.observations, csv.observations);
  assert.equal(excel.observations.length, 20);
  assert.equal(excel.is_demo, true);
  assert.deepEqual(excel.populations, []);
  assert.deepEqual(excel.coverage, []);
});

test('Un classeur sans source est refusé par la même validation que les CSV', async () => {
  await assert.rejects(importDataFile(file('./fixtures/observations-missing-source.xlsx', 'sans-source.xlsx'), governorates), /source/);
});

test('Un classeur corrompu et un ancien format Excel ont des erreurs explicites', async () => {
  await assert.rejects(importDataFile(new File(['pas un classeur'], 'invalide.xlsx'), governorates), /Impossible de lire ce classeur Excel/);
  await assert.rejects(importDataFile(new File(['ancien format'], 'ancien.xls'), governorates), /format .xlsx/);
});

test('La limite de taille est vérifiée avant toute lecture du fichier', async () => {
  const oversized = { name: 'lourd.xlsx', size: 5_000_001, text: async () => { throw new Error('Lecture interdite'); }, arrayBuffer: async () => { throw new Error('Lecture interdite'); } };
  await assert.rejects(importDataFile(oversized, governorates), /dépasse 5 Mo/);
});

test('Les imports CSV et JSON restent acceptés par le lecteur de fichiers', async () => {
  const csv = await importDataFile(file('../public/data/observations.example.csv', 'exemple.csv'), governorates);
  const json = await importDataFile(file('../public/data/demo.json', 'exemple.json'), governorates);
  assert.deepEqual(csv.observations, json.observations);
  assert.equal(json.is_demo, true);
});
