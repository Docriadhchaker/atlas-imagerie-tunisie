import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import TerritoryDetails from '../src/components/TerritoryDetails';
import { filterEvidence, territoryIndicators } from '../src/domain/indicators';
import { DEFAULT_FILTERS } from '../src/domain/model';
import type { Dataset, Governorate } from '../src/domain/model';
const dataset:Dataset=JSON.parse(readFileSync(new URL('../public/data/inventory2024.json',import.meta.url),'utf8'));
const governorates:Governorate[]=JSON.parse(readFileSync(new URL('../public/data/governorates.json',import.meta.url),'utf8'));
test('Au clic sur Médenine, le panneau affiche ses dossiers sans exiger de points géographiques',()=>{
 const filters={...DEFAULT_FILTERS,governorate:'TN-82'};
 const html=renderToStaticMarkup(<TerritoryDetails dataset={dataset} filters={filters} governorates={governorates}
  territories={territoryIndicators(dataset,governorates,filters)} evidence={filterEvidence(dataset.facility_evidence!,filters)}
  verifiedOnly={false} onSite={()=>{}} />);
 assert.match(html,/Hôpital régional de Zarzis/);
 assert.match(html,/Polyclinique Arij Midoun Djerba/);
 assert.match(html,/Hôpital régional de Médenine/);
 assert.match(html,/sans coordonnées/);
 assert.match(html,/Scanner CT<\/th><td>6<\/td><td>10<\/td><td><strong>16<\/strong>/);
 assert.match(html,/IRM<\/th><td>1<\/td><td>4<\/td><td><strong>5<\/strong>/);
});
test('Le panneau explique le masquage des totaux et garde les dossiers de Médenine accessibles',()=>{
 const filters={...DEFAULT_FILTERS,governorate:'TN-82'};
 const counted={...dataset,territorial_counts:[]};
 const html=renderToStaticMarkup(<TerritoryDetails dataset={dataset} filters={filters} governorates={governorates}
  territories={territoryIndicators(counted,governorates,filters)} evidence={filterEvidence(dataset.facility_evidence!,filters)}
  verifiedOnly={true} onSite={()=>{}} />);
 assert.match(html,/Les totaux sont masqués/);
 assert.match(html,/Scanner CT<\/th><td>—<\/td><td>—<\/td>/);
 assert.match(html,/Hôpital régional de Zarzis/);
});
test('Le panneau signale le mode fictif plutôt que laisser croire à un inventaire réel vide',()=>{
 const demo:Dataset=JSON.parse(readFileSync(new URL('../public/data/demo.json',import.meta.url),'utf8'));
 const filters={...DEFAULT_FILTERS,governorate:'TN-82'};
 const html=renderToStaticMarkup(<TerritoryDetails dataset={demo} filters={filters} governorates={governorates}
  territories={territoryIndicators(demo,governorates,filters)} evidence={[]}
  verifiedOnly={false} onSite={()=>{}} />);
 assert.match(html,/Le jeu fictif est actif/);
 assert.match(html,/ne décrivent pas la réalité/);
});
