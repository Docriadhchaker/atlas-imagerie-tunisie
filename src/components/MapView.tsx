import { publicAsset } from '../data/paths';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Equipment, TerritoryIndicator } from '../domain/model';
import { STATUS_LABELS } from '../domain/model';
import { number } from '../domain/indicators';
import { equipmentSummary } from './mapSummary';
export type MapMetric = 'count' | 'density' | 'coverage';
const colors = ['#e0ede6', '#a7cbbb', '#5a9e87', '#236a57', '#103f39'];
export function territoryColor(t: TerritoryIndicator, metric: MapMetric) {
  if (t.total === 0) return t.status === 'verified_absent' ? '#d5ddd0' : t.status === 'not_recorded' || t.status === 'source_zero' ? '#f1ecdf' : '#e4e8e7';
  if (metric === 'coverage') return '#5a9e87';
  const value = metric === 'density' ? t.density : t.total;
  if (value === null) return '#e4e8e7';
  const breaks = metric === 'density' ? [0, 1, 2, 4] : [0, 3, 6, 12];
  return colors[breaks.filter(b => value > b).length];
}
interface Props {
  territories: TerritoryIndicator[]; isDemo: boolean; metric: MapMetric;
  governorate: string; selectedSite: string | null;
  inventoryLabel?: string;
  equipment: Equipment[];
  onGovernorate: (code: string) => void;
}
export default function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null); const shapes = useRef<L.GeoJSON | null>(null);
  const geometry = useRef<FeatureCollection<Geometry> | null>(null);
  const regionPopup = useRef<{ code: string; popup: L.Popup } | null>(null);
  const current = useRef(props); current.current = props;
  const error = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const instance = L.map(container.current!, { zoomControl: false, attributionControl: true, minZoom: 5, maxZoom: 13, scrollWheelZoom: false });
    instance.fitBounds([[30.1, 7.3], [37.6, 11.6]], { padding: [12, 12] });
    instance.attributionControl.setPrefix('');
    instance.attributionControl.addAttribution('Limites : geoBoundaries · OSM / Wambacher · ODbL 1.0 · 2017');
    L.control.zoom({ position: 'topright' }).addTo(instance);
    const home = new L.Control({ position: 'topright' });
    home.onAdd = () => {
      const button = L.DomUtil.create('button', 'map-home'); button.type = 'button'; button.textContent = '⌖';
      button.title = 'Recentrer sur la Tunisie'; button.setAttribute('aria-label', button.title);
      L.DomEvent.disableClickPropagation(button);
      button.onclick = () => instance.fitBounds([[30.1, 7.3], [37.6, 11.6]], { padding: [12, 12] }); return button;
    };
    home.addTo(instance); map.current = instance;
    let cancelled = false;
    const loadGeometry = window.__ATLAS_LOCAL__ ? Promise.resolve(window.__ATLAS_LOCAL__.geometry)
      : fetch(publicAsset('/data/tunisia-governorates.geojson')).then(r => { if (!r.ok) throw Error(); return r.json(); });
    loadGeometry.then(data => {
      if (!cancelled) { geometry.current = data; redraw(); }
    }).catch(() => { if (error.current) error.current.textContent = 'Impossible de charger les limites géographiques locales.'; });
    const resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(container.current!);
    return () => { cancelled = true; resize.disconnect(); instance.remove(); map.current = null; shapes.current = null; geometry.current = null; regionPopup.current = null; };
  }, []);
  function summaryCard(name: string, territory: TerritoryIndicator | undefined) {
    const p = current.current;
    const card = document.createElement('div'); card.className = 'territory-map-summary';
    const title = document.createElement('strong'); title.className = 'territory-map-title'; title.textContent = name; card.append(title);
    const counts = document.createElement('div'); counts.className = 'territory-map-counts';
    for (const row of equipmentSummary(territory, p.equipment)) {
      const item = document.createElement('div'); item.className = `territory-map-equipment ${row.type.toLowerCase()}`;
      const label = document.createElement('span'); label.textContent = row.label;
      const value = document.createElement('strong'); value.textContent = row.value;
      item.append(label, value); counts.append(item);
    }
    card.append(counts);
    const note = document.createElement('small');
    note.textContent = p.inventoryLabel ?? (p.isDemo ? 'Exemple fictif · ne décrit pas le parc réel' : 'Équipements recensés · filtres actifs');
    card.append(note);
    if (!territory || territory.status === 'no_data') {
      const missing = document.createElement('small'); missing.textContent = 'Données indisponibles ou masquées par les filtres.'; card.append(missing);
    } else if (territory.status === 'source_zero' || territory.status === 'not_recorded') {
      const status = document.createElement('small'); status.textContent = STATUS_LABELS[territory.status]; card.append(status);
    }
    if (territory?.density != null) {
      const density = document.createElement('small'); density.textContent = `${number(territory.density)} équipement(s) / 100 000 hab. · filtres actifs`; card.append(density);
    }
    return card;
  }
  function redraw() {
    if (!map.current || !geometry.current) return;
    const p = current.current;
    shapes.current?.remove();
    shapes.current = L.geoJSON(geometry.current, {
      style: feature => {
        const code = feature?.properties?.shapeISO;
        const t = p.territories.find(t => t.code === code);
        return { color: p.governorate === code ? '#143f37' : '#fff', weight: p.governorate === code ? 2.5 : 1.2,
          fillColor: t ? territoryColor(t, p.metric) : '#e4e8e7', fillOpacity: t ? .96 : .32,
          dashArray: t?.status === 'not_recorded' ? '3 3' : undefined };
      },
      onEachFeature: (feature, layer) => {
        const code = feature.properties.shapeISO;
        const t = p.territories.find(t => t.code === code);
        // One region card, opened on click. A hover card would reopen on the
        // replacement layer after redraw and overlap the persistent popup.
        layer.on('click', (event: L.LeafletMouseEvent) => {
          const popup = L.popup({ className: 'territory-popup', minWidth: 220, maxWidth: 280 })
            .setLatLng(event.latlng).setContent(summaryCard(feature.properties.shapeName, t)).openOn(map.current!);
          regionPopup.current = { code, popup };
          current.current.onGovernorate(code);
        });
      },
    }).addTo(map.current);
    const opened = regionPopup.current;
    if (opened?.popup.isOpen()) {
      if (opened.code === p.governorate && !p.selectedSite) {
        const territory = p.territories.find(t => t.code === opened.code);
        opened.popup.setContent(summaryCard(territory?.name ?? p.governorate, territory));
      } else { opened.popup.close(); regionPopup.current = null; }
    }
  }
  useEffect(redraw, [props.territories, props.isDemo, props.metric, props.governorate, props.selectedSite, props.inventoryLabel, props.equipment]);
  useEffect(() => {
    if (!map.current || !props.governorate || !shapes.current) return;
    shapes.current.eachLayer(layer => {
      const feature = (layer as L.Polygon).feature;
      if (feature?.type === 'Feature' && feature.properties.shapeISO === props.governorate) map.current?.fitBounds((layer as L.Polygon).getBounds(), { padding: [45, 45], maxZoom: 9 });
    });
  }, [props.governorate]);
  return <><div ref={container} className="map-canvas" aria-label="Carte interactive des gouvernorats de Tunisie" /><div ref={error} role="alert" className="map-error" /></>;
}
