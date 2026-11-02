import { publicAsset } from '../data/paths';
import { useEffect, useRef, useState } from 'react';
import { FileUp, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { importDataFile } from '../data/importFile';
import type { Dataset, Governorate } from '../domain/model';
export default function ImportDialog({ governorates, onApply, onClose }: { governorates: Governorate[]; onApply: (d: Dataset) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [data, setData] = useState<Dataset | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); const readVersion = useRef(0);
  useEffect(() => { dialog.current?.showModal(); return () => { readVersion.current++; }; }, []);
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} aria-labelledby="import-title">
    <div className="dialog-heading"><div className="eyebrow">DONNÉES LOCALES</div><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
    <h2 id="import-title">Modifier mon aperçu</h2>
    <p>Le fichier remplace les données dans cet onglet uniquement. Rien n’est envoyé à Supabase. Recharger la page rétablit l’inventaire publié.</p>
    <label className="file-drop"><FileUp size={26} /><strong>Choisir un CSV, un Excel (.xlsx) ou un JSON</strong><span>Maximum 5 Mo · validation avant affichage</span><input aria-label="Fichier de données" type="file" accept=".json,.csv,.xlsx" onChange={async e => {
      const version = ++readVersion.current;
      setError(''); setData(null); const file = e.target.files?.[0]; setLoading(!!file); if (!file) return;
      try { const result = await importDataFile(file, governorates); if (version === readVersion.current) setData(result); }
      catch (e) { if (version === readVersion.current) setError((e as Error).message); }
      finally { if (version === readVersion.current) setLoading(false); }
    }} /></label>
    <p className="fine">CSV / Excel : observations par établissement, avec les colonnes du modèle ; seule la première feuille Excel est lue. Populations et couverture restent inconnues. JSON : jeu complet. Les données fictives et réelles doivent rester séparées.</p>
    <p className="fine">Modèles fictifs : <a className="text-link" href={window.__ATLAS_LOCAL__ ? './public/data/observations.example.csv' : publicAsset('/data/observations.example.csv')} download>CSV ↗</a> · <a className="text-link" href={window.__ATLAS_LOCAL__ ? './public/data/observations.example.xlsx' : publicAsset('/data/observations.example.xlsx')} download>Excel (.xlsx) ↗</a></p>
    {loading && <p role="status">Lecture et validation du fichier…</p>}
    {error && <p className="import-error" role="alert"><AlertCircle size={18} />{error}</p>}
    {data && <div className="import-valid" role="status"><CheckCircle2 size={20} /><div><strong>{data.observations.length} observations valides</strong><br />{data.is_demo ? 'Jeu fictif' : 'Jeu réel déclaré par le fichier · vérifier les sources avant usage'} · {data.populations.length} populations</div></div>}
    <div className="dialog-actions"><button className="button secondary" onClick={onClose}>Annuler</button><button className="button primary" disabled={!data || loading} onClick={() => { if (data) onApply(data); }}>Afficher mon aperçu</button></div>
  </dialog>;
}
