import { Building2, MapPin, X } from 'lucide-react';
import type { FacilityEvidence, Governorate } from '../domain/model';
import { EQUIPMENT_LABELS, SECTOR_LABELS } from '../domain/model';
export default function EvidenceDetails({ rows, governorates, onClose }: { rows: FacilityEvidence[]; governorates: Governorate[]; onClose: () => void }) {
  const site = rows[0];
  return <section className="detail-content"><div className="detail-eyebrow"><span className="eyebrow">DOSSIER DOCUMENTAIRE RÉEL</span><button onClick={onClose} className="icon-button" aria-label="Fermer le dossier"><X size={18} /></button></div>
    <div className="detail-icon"><Building2 size={25} /></div><h2>{site.facility_name}</h2>
    <p className="location"><MapPin size={15} />{governorates.find(g => g.code === site.governorate_code)?.name ?? 'Gouvernorat à confirmer'} · {site.sector ? SECTOR_LABELS[site.sector] : 'Secteur à confirmer'}</p>
    <div className="method-note"><p>Les preuves ci-dessous ne sont pas additionnées aux totaux territoriaux de 2024. Quantité actuelle et fonctionnement actuel non établis.</p></div>
    {rows.map(r => <article className="source-card" key={r.id}><strong>{EQUIPMENT_LABELS[r.equipment_type]} · {r.evidence_status}</strong><p>Période de la preuve : {r.observation_period ?? 'non précisée'}</p><p>Publication : {r.source_date ?? 'non datée'}</p><p>{r.source}</p><p className="fine">{r.confidence}</p><p className="fine">{r.note}</p><a className="text-link" href={r.source_reference} target="_blank" rel="noreferrer">Consulter cette preuve ↗</a>
      {r.location_source && <p className="fine">Position représentative du site lorsqu’elle est affichée ; ce n’est pas la position d’une machine. <a href={r.location_source} target="_blank" rel="noreferrer">Source de localisation ↗</a></p>}
    </article>)}
  </section>;
}
