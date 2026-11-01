import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSupabaseRepository } from '../src/data/supabase';
const dataset = JSON.parse(readFileSync(new URL('../public/data/inventory2024.json', import.meta.url), 'utf8'));
const governorates = JSON.parse(readFileSync(new URL('../public/data/governorates.json', import.meta.url), 'utf8'));

test('Supabase charge une publication cohérente avec toutes ses réserves, sans écriture', async () => {
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/rest/v1/atlas_snapshots');
    assert.equal(url.searchParams.get('published'), 'eq.true');
    assert.equal(url.searchParams.get('id'), 'eq.inventory2024');
    assert.equal(init?.method, undefined);
    assert.deepEqual(init?.headers, { apikey: 'sb_publishable_test', Accept: 'application/json' });
    return Response.json([{ dataset, governorates }]);
  };
  const loaded = await createSupabaseRepository('https://example.supabase.co', 'sb_publishable_test', request).load();
  assert.equal(loaded.dataset.territorial_counts?.length, 96);
  assert.ok(loaded.dataset.territorial_counts?.every(r => r.verification === 'unverified'));
  assert.equal(loaded.dataset.source_notice, dataset.source_notice);
});
test('Supabase refuse les clés secrètes et les destinations non HTTPS', () => {
  assert.throws(() => createSupabaseRepository('https://example.supabase.co', 'sb_secret_test'), /publishable/);
  assert.throws(() => createSupabaseRepository('http://example.supabase.co', 'sb_publishable_test'), /HTTPS/);
});
test('Une panne ou une publication absente ne déclenche aucun repli silencieux sur les fichiers', async () => {
  await assert.rejects(createSupabaseRepository('https://example.supabase.co', 'sb_publishable_test', async () => new Response('', { status: 503 })).load(), /503/);
  await assert.rejects(createSupabaseRepository('https://example.supabase.co', 'sb_publishable_test', async () => Response.json([])).load(), /Aucun jeu/);
});
