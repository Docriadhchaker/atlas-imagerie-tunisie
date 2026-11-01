import { publicAsset } from '../data/paths';
import { useEffect, useRef, useState } from 'react';
import { FileUp, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { importDataset } from '../data/repository';
import type { Dataset, Governorate } from '../domain/model';
export default function ImportDialog({ governorates, onApply, onClose }: { governorates: Governorate[]; onApply: (d: Dataset) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [data, setData] = useState<Dataset | null>(null); const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="import-dialog" onCancel={onClose} aria-labelledby="import-title">
    <div className="dialog-heading"><div className="eyebrow">DONNÉES LOCALES</div><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>
    <h2 id="import-title">Tester un autre jeu de données</h2>
    <p>Le fichier remplace le jeu affiché uniquement dans cet onglet. Aucun envoi ni sauvegarde distante. Un rechargement rétablit la démonstration.</p>
    <label className="file-drop"><FileUp size={26} /><strong>Choisir un fichier JSON ou CSV</strong><span>Maximum 5 Mo · validation avant affichage</span><input aria-label="Fichier de données" type="file" accept=".json,.csv" onChange={async e => {
      setError(''); setData(null); const file = e.target.files?.[0]; if (!file) return;
      try { if (file.size > 5_000_000) throw Error('Le fichier dépasse 5 Mo.'); setData(importDataset(await file.text(), file.name, governorates)); }
      catch (e) { setError((e as Error).message); }
    }} /></label>
    <p className="fine">JSON : observations, populations et couverture. CSV : observations seules ; populations et couverture restent inconnues. Un fichier mixant données fictives et réelles est refusé.</p>
    <a className="text-link" href={window.__ATLAS_LOCAL__ ? './public/data/observations.example.csv' : publicAsset('/data/observations.example.csv')} download>Télécharger un CSV d’exemple fictif ↗</a>
    {error && <p className="import-error" role="alert"><AlertCircle size={18} />{error}</p>}
    {data && <div className="import-valid" role="status"><CheckCircle2 size={20} /><div><strong>{data.observations.length} observations valides</strong><br />{data.is_demo ? 'Jeu fictif' : 'Jeu réel déclaré par le fichier · vérifier les sources avant usage'} · {data.populations.length} populations</div></div>}
    <div className="dialog-actions"><button className="button secondary" onClick={onClose}>Annuler</button><button className="button primary" disabled={!data} onClick={() => { if (data) onApply(data); }}>Afficher ce jeu</button></div>
  </dialog>;
}
