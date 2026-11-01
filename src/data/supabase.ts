import type { Dataset, Governorate } from '../domain/model';
import { validateDataset, type DataRepository } from './repository';

/** A published snapshot is read atomically: counts and provenance stay together. */
export function createSupabaseRepository(url: string, publishableKey: string, request: typeof fetch = fetch): DataRepository {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.pathname !== '/') throw new Error('URL Supabase HTTPS invalide.');
  if (!publishableKey.startsWith('sb_publishable_')) throw new Error('Utilisez uniquement une clé Supabase publishable, jamais une clé secrète.');
  return {
    async load() {
      const api = new URL('/rest/v1/atlas_snapshots', endpoint);
      api.search = new URLSearchParams({ select: 'dataset,governorates', id: 'eq.inventory2024', published: 'eq.true', limit: '1' }).toString();
      const response = await request(api, { headers: { apikey: publishableKey, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Données Supabase indisponibles (${response.status}). Réessayez ultérieurement.`);
      const rows: { dataset: Dataset; governorates: Governorate[] }[] = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1 || !Array.isArray(rows[0].governorates)) throw new Error('Aucun jeu publié disponible dans Supabase.');
      validateDataset(rows[0].dataset, rows[0].governorates);
      return rows[0];
    },
  };
}
