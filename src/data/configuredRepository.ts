import { localRepository, type DataRepository } from './repository';
import { createSupabaseRepository } from './supabase';

const url = import.meta.env?.VITE_SUPABASE_URL?.trim() ?? '';
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const standalone = typeof window !== 'undefined' && !!window.__ATLAS_LOCAL__;
export const remoteData = !standalone && !!(url || key);
export const configuredRepository: DataRepository = {
  async load() {
    if (!remoteData) return localRepository.load();
    if (!url || !key) throw new Error('Configuration Supabase incomplète : URL et clé publishable requises.');
    return createSupabaseRepository(url, key).load();
  },
};
