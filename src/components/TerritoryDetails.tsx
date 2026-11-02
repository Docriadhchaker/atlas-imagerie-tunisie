import { ArrowRight, Building2, Focus, Info, ShieldCheck } from 'lucide-react';
import type { Dataset, Equipment, Filters, Governorate, TerritoryIndicator, FacilityEvidence, Sector } from '../domain/model';
import { EQUIPMENT_LABELS, SECTOR_LABELS, STATUS_LABELS } from '../domain/model';
import { number } from '../domain/indicators';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
export interface TerritoryDetailsProps {
 dataset: Dataset; filters: Filters; governorates: Governorate[]; territories: TerritoryIndicator[];
 evidence: FacilityEvidence[]; verifiedOnly: boolean; onSite:(id:string)=>void;
}
export default function TerritoryDetails({dataset,filters,governorates,territories,evidence,verifiedOnly,onSite}:TerritoryDetailsProps){
 const documentary=!!dataset.territorial_counts;
 const selected=!!filters.governorate;
 const pub=territories.reduce((sum,t)=>sum+t.publicCount,0);
 const total=territories.reduce((sum,t)=>sum+t.total,0);
 const totalsUnknown=territories.every(t=>t.status==='no_data');
 const siteIds=[...new Set(evidence.map(e=>e.facility_id))];
 const displayCell=(type:Equipment,sector:Sector)=>{
   if(!filters.equipment.includes(type)||!filters.sectors.includes(sector)) return 'Filtré';
   const row=dataset.territorial_counts?.filter(r=>r.governorate_code===filters.governorate && r.equipment_type===type && r.sector===sector)
     .sort((a,b)=>b.observed_on.localeCompare(a.observed_on))[0];
   if(!row || (verifiedOnly && row.verification!=='verified')) return '—';
   return String(row.equipment_count);
 };
 return <section className="detail-content" aria-label={selected?'Fiche du gouvernorat':'Vue nationale'}>
   <span className="eyebrow">LECTURE DU TERRITOIRE</span>
   <h2>{selected?governorates.find(g=>g.code===filters.governorate)?.name:'Une vue d’ensemble'}</h2>
   <p className="insight-description">{selected?(documentary?'Inventaire 2024 et dossiers d’établissements':STATUS_LABELS[territories[0]?.status??'no_data']):'Comprendre la répartition, sans masquer les données manquantes.'}</p>
   {selected && documentary && <>
     <div className="territory-inventory"><h3>Équipements recensés · 2024</h3><p className="fine">Inventaire au 31 décembre 2024</p>
       <table aria-label="Équipements par type et secteur"><thead><tr><th>Type</th><th>Public</th><th>Privé</th><th>Total</th></tr></thead><tbody>
         {(['CT','MRI'] as Equipment[]).map(type=>{
           const publicValue=displayCell(type,'public'), privateValue=displayCell(type,'private');
           const values=[publicValue,privateValue].filter(v=>v!=='Filtré');
           const count=values.length && values.every(v=>v!=='—')?String(values.reduce((s,v)=>s+Number(v),0)):'—';
           return <tr key={type}><th scope="row">{EQUIPMENT_LABELS[type]}</th><td>{publicValue}</td><td>{privateValue}</td><td><strong>{count}</strong></td></tr>;
         })}
       </tbody></table>
       {verifiedOnly && <p className="territory-explanation"><Info size={14}/>Les totaux sont masqués par le filtre « Sources vérifiées uniquement ». Cela ne signifie pas une absence d’équipement.</p>}
     </div>
     <div className="territory-sites"><h3><Building2 size={15}/>Dossiers disponibles <span>{siteIds.length}</span></h3>
       {siteIds.length>0?<>
         <p className="fine">Consultez les dossiers ci-dessous pour voir les informations et les sources de chaque établissement.</p>
         {siteIds.map(id=>{
           const rows=evidence.filter(e=>e.facility_id===id), site=rows[0];
           const latest=[...rows].sort((a,b)=>(b.source_date??'').localeCompare(a.source_date??''))[0];
           return <button key={id} className="territory-site-button" onClick={()=>onSite(id)}>
             <strong>{site.facility_name}</strong>
             <span>{site.sector?SECTOR_LABELS[site.sector]:'Secteur à confirmer'} · {[...new Set(rows.map(r=>EQUIPMENT_LABELS[r.equipment_type]))].join(' / ')}</span>
             <span>{latest.evidence_status}</span><span className="text-link">Consulter les preuves <ArrowRight size={12}/></span>
           </button>;
         })}
       </>:<p className="fine">Aucun dossier nominatif pour les filtres actifs. Les totaux territoriaux restent consultables ci-dessus.</p>}
     </div>
   </>}
   {selected && dataset.is_demo && <p className="territory-explanation"><Info size={14}/>Le jeu fictif est actif. Ses zones vides ne décrivent pas la réalité : choisissez « Inventaire 2024 » au-dessus de la carte.</p>}
   <div className="distribution"><span>Répartition des équipements</span><div className="distribution-bar">{total>0 && <><i style={{width:`${pub/total*100}%`}}/><i style={{width:`${(total-pub)/total*100}%`}}/></>}</div><div><span><i/>Public <strong>{totalsUnknown?'—':pub}</strong></span><span><i/>Privé <strong>{totalsUnknown?'—':total-pub}</strong></span></div></div>
   {selected && <div className="territory-ratio"><span>Équipements / 100 000 habitants</span><strong>{territories[0]?.density!=null?number(territories[0].density):'—'}</strong><p className="fine">{territories[0]?.population?`Population ${dataset.is_demo?'fictive':'déclarée'} : ${number(territories[0].population.population)} · ${dateLabel(territories[0].population.observed_on)}`:'Population non disponible : aucun ratio calculé.'}</p></div>}
   {documentary && <div className="source-card"><strong>Sources · 2024</strong><p>Équipements au 31 décembre 2024 : Carte sanitaire 2024, tableau 45 · copie consultée.</p><p className="fine">Population : INS, RGPH au 6 novembre 2024. Les dossiers d’établissements restent distincts des totaux territoriaux.</p><a href={dataset.source_url} target="_blank" rel="noreferrer" className="text-link">Consulter la copie source ↗</a><a href="https://www.ins.tn/sites/default/files-ftp3/files/2025-05/Bilan%20D%C3%A9mographique_0.pdf" target="_blank" rel="noreferrer" className="text-link">Population INS ↗</a></div>}
   {!selected && <div className="click-hint"><Focus size={23}/><h3>Explorez un territoire</h3><p>Cliquez sur un gouvernorat pour consulter les chiffres par type et secteur, ainsi que les dossiers d’établissements disponibles.</p></div>}
   <div className="method-note"><ShieldCheck size={18}/><p>{dataset.is_demo?'Les scénarios d’absence et de présence sont eux aussi fictifs.':'Une absence dans un fichier ne prouve pas une absence d’équipement.'}</p></div>
 </section>;
}
