import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_FILTERS } from '../src/domain/model';
import type { Dataset, Governorate } from '../src/domain/model';
import { displayCount, territoryIndicators } from '../src/domain/indicators';
import { validateDataset } from '../src/data/repository';
import { equipmentSummary } from '../src/components/mapSummary';
const data: Dataset = JSON.parse(readFileSync(new URL('../public/data/inventory2024.json', import.meta.url), 'utf8'));
const govs: Governorate[] = JSON.parse(readFileSync(new URL('../public/data/governorates.json', import.meta.url), 'utf8'));
test('Inventaire documentaire : 24 gouvernorats, 96 cellules et données réelles séparées du fictif', () => {
  assert.doesNotThrow(() => validateDataset(data, govs));
  assert.equal(data.territorial_counts?.length, 96);
  assert.equal(data.is_demo, false);
  assert.ok(data.territorial_counts?.every(r => r.verification === 'unverified' && r.is_demo === false));
  assert.equal(data.populations.reduce((sum,p) => sum+p.population,0),11972169);
  assert.ok(data.populations.every(p => p.verification==='verified' && p.observed_on==='2024-11-06'));
});
test('Les totaux transcrits correspondent aux sommes des tableaux documentaires', () => {
  const all=territoryIndicators(data,govs,DEFAULT_FILTERS);
  assert.equal(all.reduce((s,t)=>s+t.ct,0),212);
  assert.equal(all.reduce((s,t)=>s+t.mri,0),73);
  assert.equal(all.reduce((s,t)=>s+t.publicCount,0),76);
  assert.equal(all.reduce((s,t)=>s+t.privateCount,0),209);
  assert.ok(all.every(t=>t.status==='observed'));
});
test('Un zéro de la source n’est pas une absence vérifiée et son ratio reste descriptif', () => {
  const t=territoryIndicators(data,govs,{equipment:['MRI'],sectors:['public','private'],governorate:'TN-83'})[0];
  assert.equal(t.mri,0);assert.equal(t.status,'source_zero');assert.equal(t.density,0);
  assert.equal(displayCount(0,t.status),'0');assert.equal(t.verification,'unverified');
});
test('Masquer les données non authentifiées produit de l’inconnu, jamais des absences', () => {
  const filtered={...data,territorial_counts:data.territorial_counts!.filter(r=>r.verification==='verified')};
  const all=territoryIndicators(filtered,govs,DEFAULT_FILTERS);
  assert.ok(all.every(t=>t.status==='no_data' && t.density===null && displayCount(t.ct,t.ctStatus)==='—'));
});
test('Les preuves par établissement et les observations ne sont pas ajoutées aux agrégats', () => {
  const demo:Dataset=JSON.parse(readFileSync(new URL('../public/data/demo.json',import.meta.url),'utf8'));
  const changed={...data,observations:demo.observations};
  assert.equal(territoryIndicators(changed,govs,DEFAULT_FILTERS).reduce((s,t)=>s+t.total,0),285);
});
test('Les localisations affichées sont sourcées et aucune n’est un centre de viewport', () => {
  const placed=data.facility_evidence!.filter(e=>e.latitude!==null);
  assert.ok(placed.length>0);
  assert.ok(placed.every(e=>e.location_source?.startsWith('https://www.openstreetmap.org/way/')));
  assert.ok(data.facility_evidence!.filter(e=>e.facility_id==='REAL-CARTHAGE').every(e=>e.latitude===null && e.longitude===null));
});
test('Une cellule territoriale en doublon est refusée à l’import', () => {
  const duplicate=structuredClone(data);duplicate.territorial_counts!.push(duplicate.territorial_counts![0]);
  assert.throws(()=>validateDataset(duplicate,govs),/Doublon territorial/);
});
test('Les points sourcés se trouvent dans le gouvernorat qui leur est attribué', () => {
  const geometry=JSON.parse(readFileSync(new URL('../public/data/tunisia-governorates.geojson',import.meta.url),'utf8'));
  const inside=(x:number,y:number,ring:number[][])=>{
    let result=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i], [xj,yj]=ring[j];
      if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) result=!result;
    }
    return result;
  };
  for(const site of data.facility_evidence!.filter(e=>e.latitude!==null)){
    const feature=geometry.features.find((f:{properties:{shapeISO:string}})=>f.properties.shapeISO===site.governorate_code);
    const polygons=feature.geometry.type==='Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    assert.ok(polygons.some((polygon:number[][][])=>inside(site.longitude!,site.latitude!,polygon[0]) && !polygon.slice(1).some(hole=>inside(site.longitude!,site.latitude!,hole))),site.facility_name);
  }
});
test('La carte distingue les 16 scanners et les 5 IRM de Médenine',()=>{
  const territory=territoryIndicators(data,govs,{...DEFAULT_FILTERS,governorate:'TN-82'})[0];
  assert.deepEqual(equipmentSummary(territory,['CT','MRI']),[
    {type:'CT',label:'Scanners CT',value:'16'},{type:'MRI',label:'IRM',value:'5'},
  ]);
  assert.deepEqual(equipmentSummary(territory,['MRI']),[{type:'MRI',label:'IRM',value:'5'}]);
});
test('La carte affiche un tiret pour une quantité inconnue, sans inventer un zéro',()=>{
  assert.deepEqual(equipmentSummary(undefined,['CT','MRI']).map(r=>r.value),['—','—']);
});
