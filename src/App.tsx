import { configuredRepository, remoteData } from './data/configuredRepository';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Building2, Check, ChevronDown, Cross, Database, Info, Map, MapPin, RotateCcw, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import MapView, { type MapMetric } from './components/MapView';
import ImportDialog from './components/ImportDialog';
import EvidenceDetails from './components/EvidenceDetails';
import TerritoryDetails from './components/TerritoryDetails';
import { loadBundledDataset } from './data/repository';
import { displayCount, filterEvidence, filterObservations, number, territoryIndicators } from './domain/indicators';
import { DEFAULT_FILTERS, EQUIPMENT_LABELS, SECTOR_LABELS, STATUS_LABELS } from './domain/model';
import type { Dataset, Equipment, Filters, Governorate, Observation, Sector, TerritoryIndicator } from './domain/model';

const dateLabel = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
function exportCsv(rows: TerritoryIndicator[], demo: boolean) {
  const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = [['gouvernorat', 'scanner_ct', 'statut_ct', 'irm', 'statut_irm', 'public', 'prive', 'total_recense', 'pour_100000', 'statut', 'population_date', 'donnees_fictives', 'date_inventaire', 'verification', 'source_inventaire'],
    ...rows.map(t => [t.name, displayCount(t.ct, t.ctStatus), STATUS_LABELS[t.ctStatus], displayCount(t.mri, t.mriStatus), STATUS_LABELS[t.mriStatus], t.status === 'no_data' ? null : t.publicCount,
      t.status === 'no_data' ? null : t.privateCount, t.status === 'no_data' ? null : t.total, t.density, STATUS_LABELS[t.status], t.population?.observed_on, demo, t.observed_on, t.verification, t.source_reference])]
    .map(row => row.map(quote).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = demo ? 'indicateurs-FICTIFS.csv' : 'indicateurs-recenses.csv'; link.click(); URL.revokeObjectURL(url);
}

function SiteDetails({ rows, governorates, onClose }: { rows: Observation[]; governorates: Governorate[]; onClose: () => void }) {
  const site = rows[0];
  return <section className="detail-content" aria-label="Fiche établissement"><div className="detail-eyebrow"><span className="eyebrow">FICHE ÉTABLISSEMENT</span><button onClick={onClose} className="icon-button" aria-label="Fermer la fiche"><X size={18} /></button></div>
    <div className="detail-icon"><Building2 size={25} /></div><h2>{site.facility_name}</h2>
    <div className="detail-tags"><span className={`sector-tag ${site.sector}`}>{SECTOR_LABELS[site.sector]}</span>{site.is_demo && <span className="demo-tag">Fictif</span>}</div>
    <p className="location"><MapPin size={15} />{governorates.find(g => g.code === site.governorate_code)?.name}{site.delegation ? ` · ${site.delegation}` : ''}</p>
    <dl className="facts"><div><dt>Type de structure</dt><dd>{site.facility_type}</dd></div><div><dt>Délégation</dt><dd>{site.delegation ?? 'Non renseignée'}</dd></div></dl>
    <h3>Équipements recensés</h3><div className="site-equipment">{rows.map(r => <div key={r.id}><span className={`equipment-dot ${r.equipment_type.toLowerCase()}`} />{EQUIPMENT_LABELS[r.equipment_type]}<strong>{r.equipment_count}</strong></div>)}</div>
    <p className="fine">Selon les filtres actifs. Les types non affichés ne sont pas présumés absents.</p>
    {rows.map(r => <div className="source-card" key={r.id}><strong>{EQUIPMENT_LABELS[r.equipment_type]} · {dateLabel(r.observed_on)}</strong><p>{r.source}</p><span className="fine">Référence : {r.source_reference}</span>
      {/^https?:\/\//i.test(r.source_reference) && <a className="text-link" target="_blank" rel="noreferrer" href={r.source_reference}>Consulter la source ↗</a>}
      <p className="fine">Vérification : {r.verification === 'example' ? 'exemple fictif' : r.verification === 'verified' ? 'vérifiée selon le fichier' : 'non vérifiée'}<br />Fonctionnement : {r.functional_status === 'unknown' ? 'inconnu' : r.functional_status === 'operational' ? 'déclaré fonctionnel' : 'déclaré non fonctionnel'}</p><p className="fine">{r.note}</p></div>)}
  </section>;
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null); const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loadError, setLoadError] = useState(''); const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedSite, setSelectedSite] = useState<string | null>(null); const [metric, setMetric] = useState<MapMetric>('count');
  const [showImport, setShowImport] = useState(false); const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dataOrigin, setDataOrigin] = useState(remoteData ? 'Supabase · lecture seule' : 'Fichiers JSON');
  useEffect(() => { configuredRepository.load().then(({ dataset, governorates }) => { setDataset(dataset); setGovernorates(governorates); }).catch(e => setLoadError(e.message)); }, []);
  const observations = useMemo(() => dataset ? filterObservations(dataset.observations, filters) : [], [dataset, filters]);
  const countedDataset = useMemo(() => dataset && verifiedOnly && dataset.territorial_counts ? { ...dataset, territorial_counts: dataset.territorial_counts.filter(r => r.verification === 'verified') } : dataset, [dataset, verifiedOnly]);
  const territories = useMemo(() => countedDataset ? territoryIndicators(countedDataset, governorates, filters) : [], [countedDataset, governorates, filters]);
  const documentary = !!dataset?.territorial_counts;
  const imported = dataOrigin === 'Fichier importé dans cet onglet';
  const evidence = useMemo(() => dataset ? filterEvidence(dataset.facility_evidence ?? [], filters) : [], [dataset, filters]);
  const mapPoints = useMemo(() => [...observations, ...evidence.filter(r => r.latitude !== null && r.longitude !== null)], [observations, evidence]);
  const totalCt = territories.reduce((sum,t) => sum + t.ct, 0);
  const totalMri = territories.reduce((sum,t) => sum + t.mri, 0);
  const totalsUnknown = territories.every(t => t.status === 'no_data');
  const facilityCount = new Set([...observations, ...evidence].map(o => o.facility_id)).size;
  const covered = territories.filter(t => t.total > 0).length;
  const siteRows = observations.filter(o => o.facility_id === selectedSite);
  const selectedEvidence = evidence.filter(o => o.facility_id === selectedSite);
  const unknownCoords = new Set(observations.filter(o => o.latitude === null).map(o => o.facility_id)).size;
  const switchDataset = async (name: 'demo' | 'inventory2024') => { try { setDataset(name === 'inventory2024' ? (await configuredRepository.load()).dataset : await loadBundledDataset(name)); setDataOrigin(name === 'demo' ? 'Démonstration locale' : remoteData ? 'Supabase · lecture seule' : 'Fichiers JSON'); setLoadError(''); setFilters(DEFAULT_FILTERS); setSelectedSite(null); setVerifiedOnly(false); setQuery(''); } catch(e) { setLoadError((e as Error).message); } };
  const updateGov = (governorate: string) => { setFilters(f => ({ ...f, governorate })); setSelectedSite(null); };
  const toggle = (key: 'equipment' | 'sectors', value: Equipment | Sector) => {
    setSelectedSite(null); setFilters(f => {
      if (key === 'equipment') { const v = value as Equipment; return { ...f, equipment: f.equipment.includes(v) ? f.equipment.filter(x => x !== v) : [...f.equipment, v] }; }
      const v = value as Sector; return { ...f, sectors: f.sectors.includes(v) ? f.sectors.filter(x => x !== v) : [...f.sectors, v] };
    });
  };
  return <>
    <header className="header"><a className="brand" href="#" aria-label="Atlas Imagerie accueil" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="brand-symbol"><Cross size={22} strokeWidth={1.7} /></span><span>atlas<span className="brand-light">imagerie</span><small>TUNISIE</small></span></a>
      <nav aria-label="Navigation principale"><button className="active" onClick={() => document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Map size={16} />Explorer la carte</button></nav>
      <span className="local-badge"><span />{window.__ATLAS_LOCAL__ || location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'Version locale' : 'Version publique'}</span>
    </header>
    {dataset?.is_demo && <div className="demo-banner"><Info size={15} /><span><strong>Données de démonstration.</strong> Établissements, équipements et populations fictifs. Aucune conclusion sanitaire ne peut en être tirée.</span></div>}
    <main>
      <section className="intro"><div><div className="eyebrow"><span className="tiny-line" /> OBSERVATOIRE TERRITORIAL</div><h1>L’imagerie médicale,<br /><em>territoire par territoire.</em></h1><p>Explorer la répartition des scanners et IRM en Tunisie.<br className="desktop-break" /> Rendre les données lisibles, leurs limites aussi.</p></div><div className="intro-meta"><span className="outline-badge"><Database size={14} />{dataset?.is_demo ? 'JEU FICTIF' : documentary ? 'INVENTAIRE 2024' : 'APERÇU LOCAL'}</span><p>{dataset ? <>{dataset.snapshot_label ?? `Jeu chargé · ${dateLabel(dataset.updated_on)}`}<br /><span>CT & IRM · {governorates.length} gouvernorats</span></> : 'Chargement des données…'}</p></div></section>
      {dataset && <section className="dataset-controls" aria-label="Sources affichées"><label>Jeu de données <select aria-label="Jeu de données" value={imported ? 'preview' : dataset.is_demo ? 'demo' : 'inventory2024'} onChange={e => switchDataset(e.target.value as 'demo' | 'inventory2024')}><option value="inventory2024">Inventaire 2024</option><option value="demo">Exemples fictifs</option>{imported && <option value="preview" disabled>Mon aperçu importé</option>}</select></label>{documentary && <label className="source-filter"><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />Sources vérifiées uniquement</label>}</section>}
      {loadError && <div className="error-page" role="alert">{loadError}<button className="button secondary" onClick={() => location.reload()}>Réessayer</button></div>}
      {!dataset && !loadError && <p role="status" className="loading">Chargement de la carte…</p>}
      {dataset && <>
        <section className="stats-grid" aria-label="Indicateurs du périmètre filtré" aria-live="polite">
          <article className="stat-card"><span className="stat-title"><span className="equipment-dot ct" /> Scanners CT recensés</span><div>{totalsUnknown ? '—' : totalCt}<span>équipements</span></div><p>{dataset.is_demo ? 'Quantités fictives · démonstration' : documentary ? 'Inventaire au 31 décembre 2024' : 'Dernières observations disponibles'}</p></article>
          <article className="stat-card"><span className="stat-title"><span className="equipment-dot mri" /> IRM recensées</span><div>{totalsUnknown ? '—' : totalMri}<span>équipements</span></div><p>{dataset.is_demo ? 'Quantités fictives · démonstration' : documentary ? 'Inventaire au 31 décembre 2024' : 'Dernières observations disponibles'}</p></article>
          <article className="stat-card"><span className="stat-title"><Building2 size={16} /> {documentary ? 'Sites documentés (partiel)' : 'Établissements recensés'}</span><div>{facilityCount}<span>sites</span></div><p>{documentary ? 'Dossiers distincts · hors calcul des totaux' : 'Secteurs et équipements sélectionnés'}</p></article>
          <article className="stat-card accent"><span className="stat-title"><MapPin size={16} /> {documentary ? 'Territoires avec un inventaire' : 'Territoires avec une observation'}</span><div>{documentary ? territories.filter(t => t.status !== 'no_data').length : covered}<span>/ {territories.length} gouvernorats</span></div><p>{documentary ? 'Millésime 2024' : 'Présence recensée ≠ couverture exhaustive'}</p></article>
        </section>
        <section className="workspace" aria-label="Exploration cartographique">
          <aside className="filters-panel"><div className="filter-heading"><h2><SlidersHorizontal size={16} />Filtres</h2><button title="Réinitialiser les filtres" aria-label="Réinitialiser les filtres" className="icon-button" onClick={() => { setFilters(DEFAULT_FILTERS); setSelectedSite(null); setQuery(''); }}><RotateCcw size={15} /></button></div>
            <fieldset><legend>Équipement</legend>{(['CT', 'MRI'] as Equipment[]).map(type => <label className="check-row" key={type}><input type="checkbox" checked={filters.equipment.includes(type)} onChange={() => toggle('equipment', type)} /><span className="checkbox-mark"><Check size={11} /></span><span className={`equipment-dot ${type.toLowerCase()}`} />{EQUIPMENT_LABELS[type]}</label>)}</fieldset>
            <fieldset><legend>Secteur</legend>{(['public', 'private'] as Sector[]).map(sector => <label className="check-row" key={sector}><input type="checkbox" checked={filters.sectors.includes(sector)} onChange={() => toggle('sectors', sector)} /><span className="checkbox-mark"><Check size={11} /></span>{SECTOR_LABELS[sector]}<span className="sector-shape" data-private={sector === 'private'} /></label>)}</fieldset>
            <label className="select-label" htmlFor="governorate">Gouvernorat</label><div className="select-wrap"><select id="governorate" value={filters.governorate} onChange={e => updateGov(e.target.value)}><option value="">Toute la Tunisie</option>{governorates.map(g => <option key={g.code} value={g.code}>{g.name}</option>)}</select><ChevronDown size={14} /></div>
            <div className="filter-note"><Info size={16} /><p>Les filtres s’appliquent à la carte, aux indicateurs et au tableau.</p></div>
            <div className="data-local"><span className="eyebrow">SOURCE ACTIVE</span><strong>{dataset.is_demo ? 'Démonstration locale' : documentary ? 'Inventaire 2024' : dataset.title}</strong><span>{dataset.is_demo ? 'Aucune donnée sanitaire réelle' : documentary ? 'Totaux au 31/12/2024' : 'Fichier importé dans cet onglet'}</span><button onClick={() => setShowImport(true)}><Upload size={14} />Importer CSV / Excel / JSON</button></div>
          </aside>
          <div className="map-panel"><div className="map-toolbar"><span><span className="live-dot" />Tunisie <span className="muted">/ {filters.governorate ? governorates.find(g => g.code === filters.governorate)?.name : 'Vue nationale'}</span></span><div className="metric-switch" role="group" aria-label="Indicateur de coloration"><button aria-pressed={metric === 'count'} onClick={() => setMetric('count')}>Nombre</button><button aria-pressed={metric === 'density'} onClick={() => setMetric('density')}>/ 100 000</button><button aria-pressed={metric === 'coverage'} onClick={() => setMetric('coverage')}>Présence</button></div></div>
            <div className="map-wrapper"><MapView equipment={filters.equipment} territories={territories} observations={mapPoints} inventoryLabel={documentary ? 'Inventaire 2024' : undefined} metric={metric} governorate={filters.governorate} selectedSite={selectedSite} onGovernorate={updateGov} onSite={setSelectedSite} />
              <div className="map-label">MER MÉDITERRANÉE</div><div className="map-corner-label">{dataset.is_demo ? 'CARTE DE DÉMONSTRATION' : documentary ? 'INVENTAIRE 2024' : 'INVENTAIRE RECENSÉ'}<br /><span>Cliquer sur un point ou un territoire</span></div>
              {(!filters.equipment.length || !filters.sectors.length) && <div className="map-empty">Sélectionnez au moins un équipement et un secteur.</div>}
            </div>
            <div className="map-legend"><div className="legend-line"><strong>{metric === 'count' ? 'Équipements recensés' : metric === 'density' ? 'Équipements / 100 000 hab.' : 'Présence recensée'}</strong>{metric === 'coverage' ? <span><i style={{ background: '#5a9e87' }} />Au moins un</span> : <span className="scale"><i style={{ background: '#a7cbbb' }} /><i style={{ background: '#5a9e87' }} /><i style={{ background: '#236a57' }} /><i style={{ background: '#103f39' }} />{metric === 'count' ? '1–3 · 4–6 · 7–12 · 13+' : '>0–1 · >1–2 · >2–4 · >4'}</span>}</div><div className="legend-status"><span><i className="legend-absent" />{documentary ? 'Zéro déclaré dans la source' : 'Absence vérifiée'}</span><span><i className="legend-not-recorded" />Non recensé</span><span><i className="legend-unknown" />{metric === 'density' ? 'Donnée ou ratio indisponible' : 'Aucune donnée'}</span></div><div className="legend-point"><span><i className="point-ct" />CT</span><span><i className="point-mri" />IRM</span><span><i className="point-mixed" />CT + IRM</span><span>● public · ◆ privé</span>{documentary && <span>Points localisés : inventaire partiel</span>}</div></div>
          </div>
          <aside className="insight-panel">{siteRows.length ? <SiteDetails rows={siteRows} governorates={governorates} onClose={() => setSelectedSite(null)} /> : selectedEvidence.length ? <EvidenceDetails rows={selectedEvidence} governorates={governorates} onClose={() => setSelectedSite(null)} /> : <TerritoryDetails dataset={dataset} filters={filters} governorates={governorates} territories={territories} evidence={evidence} verifiedOnly={verifiedOnly} onSite={setSelectedSite} />}</aside>
        </section>
        {unknownCoords > 0 && <p className="fine">{unknownCoords} site(s) sans coordonnées : inclus dans les totaux et disponibles dans la liste, mais non positionnés sur la carte.</p>}
        <section className="table-section"><div className="section-heading"><div><div className="eyebrow">COMPARER LES TERRITOIRES</div><h2>Les gouvernorats en chiffres<span>{territories.length}</span></h2></div><button className="button secondary" onClick={() => exportCsv(territories, dataset.is_demo)}><ArrowDownToLine size={15} />Exporter le tableau</button></div>
          <div className="table-tools"><label className="search-box"><Search size={16} /><input aria-label="Rechercher un gouvernorat" placeholder="Rechercher un gouvernorat…" value={query} onChange={e => setQuery(e.target.value)} /></label><span>{dataset.is_demo ? 'Valeurs fictives' : documentary ? 'Inventaire 2024' : 'Valeurs recensées'} · filtres actifs</span></div>
          <div className="table-scroll"><table><caption className="sr-only">Équipements recensés par gouvernorat dans le périmètre filtré</caption><thead><tr><th>Gouvernorat</th><th>Scanners CT</th><th>IRM</th><th>Public / Privé</th><th>/ 100 000 hab.</th><th>État de l’information</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{territories.filter(t => t.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).map(t => <tr key={t.code}><td><button className="territory-button" onClick={() => updateGov(t.code)}>{t.name}</button></td><td>{filters.equipment.includes('CT') ? <span title={STATUS_LABELS[t.ctStatus]}>{displayCount(t.ct, t.ctStatus)}</span> : 'Filtré'}</td><td>{filters.equipment.includes('MRI') ? <span title={STATUS_LABELS[t.mriStatus]}>{displayCount(t.mri, t.mriStatus)}</span> : 'Filtré'}</td><td>{t.total || t.status === 'verified_absent' || t.status === 'source_zero' ? `${t.publicCount} / ${t.privateCount}` : '—'}</td><td>{t.density != null ? number(t.density) : '—'}</td><td><span className={`status-tag ${t.status}`}><i />{t.verification === 'unverified' ? (t.status === 'source_zero' ? 'Zéro déclaré en 2024' : 'Recensé en 2024') : STATUS_LABELS[t.status]}</span></td><td><button className="icon-button" aria-label={`Voir ${t.name} sur la carte`} onClick={() => { updateGov(t.code); document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div>
          {!territories.some(t => t.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))) && <p className="empty-results">Aucun gouvernorat ne correspond à cette recherche.</p>}
          <p className="table-note"><Info size={14} />« — » = information inconnue. « 0 » = zéro déclaré dans la source. Les quantités correspondent au millésime indiqué ; le statut fonctionnel est précisé lorsqu’il est documenté.</p>
        </section>
        {documentary && <section className="facility-list"><details><summary><Building2 size={16} />Dossiers d’établissements réels · collecte partielle <span>{facilityCount} sites <ChevronDown size={15} /></span></summary><p className="fine evidence-list-note">Présences déclarées, usages historiques et projets sont distingués dans chaque fiche. Ces dossiers ne sont pas ajoutés aux totaux de l’inventaire.</p><div>{[...new Set(evidence.map(r => r.facility_id))].map(id => { const site=evidence.find(r => r.facility_id===id)!; return <button key={id} onClick={() => {setSelectedSite(id);document.querySelector('.workspace')?.scrollIntoView({behavior:'smooth'});}}><span>{site.facility_name}<small>{site.sector ? SECTOR_LABELS[site.sector] : 'Secteur à confirmer'} · {governorates.find(g => g.code===site.governorate_code)?.name ?? 'Gouvernorat à confirmer'} · {site.latitude===null ? 'sans point localisé' : 'position approximative sourcée'}</small></span><ArrowUpRight size={15}/></button>; })}</div></details></section>}
        {!documentary && <section className="facility-list"><details><summary><Building2 size={16} />Liste des établissements du périmètre <span>{facilityCount} sites <ChevronDown size={15} /></span></summary><div>{[...new Set(observations.map(o => o.facility_id))].map(id => { const site = observations.find(o => o.facility_id === id)!; return <button key={id} onClick={() => { setSelectedSite(id); document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth' }); }}><span>{site.facility_name}<small>{SECTOR_LABELS[site.sector]} · {governorates.find(g => g.code === site.governorate_code)?.name}{site.latitude === null ? ' · localisation inconnue' : ''}</small></span><ArrowUpRight size={15} /></button>; })}{facilityCount === 0 && <p>Aucun établissement recensé dans ce périmètre.</p>}</div></details></section>}
      </>}
      <footer><span>atlas imagerie <span>· Tunisie</span></span><p>Atlas imagerie · {dataset?.is_demo ? 'Données fictives' : documentary ? 'Inventaire 2024' : 'Aperçu importé'} · {dataOrigin}</p><span className="footer-motto">Observer. Comprendre. Documenter.</span></footer>
    </main>
    {showImport && <ImportDialog governorates={governorates} onClose={() => setShowImport(false)} onApply={d => { setDataset(d); setDataOrigin('Fichier importé dans cet onglet'); setFilters(DEFAULT_FILTERS); setVerifiedOnly(false); setSelectedSite(null); setShowImport(false); setQuery(''); }} />}
  </>;
}
