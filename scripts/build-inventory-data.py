"""Build the local documentary layer. No inferred machines, coordinates or dates."""
import csv
import json
from pathlib import Path
import shutil

APP=Path(__file__).resolve().parent.parent
ROOT=APP
WORK=APP/'data/research'
DATA=APP/'public/data'
REPORT=APP/'work/research-exports'
REPORT.mkdir(parents=True,exist_ok=True)
load=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
territorial=load(WORK/'round2-territorial.json')
governorates=load(DATA/'governorates.json')
codes={g['name']:g['code'] for g in governorates}
codes['Gabes']=codes['Gabès']; codes['Manouba']=codes['Manouba'] if 'Manouba' in codes else codes['La Manouba']

# INS primary report, Bilan démographique RGPH 2024, general table PDF p.15.
# These are the 6 November census values, NOT July population estimates.
population_values=[
 ('Bizerte',607388),('Béja',311417),('Jendouba',404352),('Le Kef',237686),
 ('Tunis',1075306),('Ariana',668552),('Ben Arous',722828),('Manouba',418354),('Nabeul',863172),('Zaghouan',201065),
 ('Sousse',762281),('Monastir',599769),('Mahdia',449985),('Kasserine',492741),('Kairouan',600803),('Siliana',216242),
 ('Sfax',1047468),('Gafsa',388776),('Sidi Bouzid',489991),('Tozeur',120036),
 ('Gabes',410847),('Médenine',537255),('Tataouine',162654),('Kébili',183201),
]
assert sum(v for _,v in population_values)==11972169
ins_url='https://www.ins.tn/sites/default/files-ftp3/files/2025-05/Bilan%20D%C3%A9mographique_0.pdf'
populations=[{'governorate_code':codes[name],'population':value,'observed_on':'2024-11-06',
 'source':'INS — RGPH 2024, Bilan démographique, mai 2025, tableau général PDF p.15',
 'source_reference':ins_url,'verification':'verified','is_demo':False,
 'note':'Recensement au 6 novembre 2024. Valeur du tableau général p.15. Les pages monographiques contiennent quelques écarts minimes, conservés dans la note méthodologique.'}
 for name,value in population_values]
counts=[]
source_url=territorial['sources'][0]['url']
for row in territorial['rows']:
 counts.append({k:row[k] for k in ['governorate_code','equipment_type','sector','equipment_count','observed_on']} | {
  'source':'Carte sanitaire Tunisie 2024, attribuée au ministère — copie tierce NON AUTHENTIFIÉE, tableau 45',
  'source_reference':source_url,'verification':'unverified','is_demo':False,
  'note':'Copie accessible sur Scribd, authenticité non confrontée à l’original. DE/DRCPS attribuées comme producteurs. Inventaire au 31/12/2024, fonctionnement actuel inconnu. Zéro imprimé = zéro déclaré, pas absence vérifiée.'})
assert len(counts)==96
for equip,sector,expected in [('CT','public',55),('CT','private',157),('MRI','public',21),('MRI','private',52)]:
 assert sum(r['equipment_count'] for r in counts if r['equipment_type']==equip and r['sector']==sector)==expected

old_raw=load(WORK/'01_donnees_brutes.json')['records']
old_groups=load(WORK/'02_donnees_consolidees.json')['records']
group_for_evidence={e:g for g in old_groups for e in g['evidence_ids']}
evidence=[]
for r in old_raw:
 if not r.get('facility_name'): continue
 g=group_for_evidence[r['id']]
 evidence.append({'id':r['id'],'facility_id':g['facility_id'],'facility_name':g['facility_name'],
  'facility_type':g.get('facility_type'),'sector':g.get('sector'),'governorate_code':g.get('governorate_code'),
  'latitude':None,'longitude':None,'equipment_type':r['equipment_type'],
  'evidence_status':r.get('equipment_status','mention documentaire'),
  'observation_period':r.get('observation_period') or r.get('observation_date'),
  'source':r['source_title'],'source_reference':r['source_url'],'source_date':r.get('source_date'),
  'confidence':r.get('confidence','unknown'),'note':r.get('uncertainty',''),'is_demo':False})

# New rounds remain in their original full form for audit, and receive a UI projection
# only when an agent supplies the explicit map_evidence contract.
for name in ['private','public']:
 p=WORK/f'round2-{name}.json'
 if p.exists():
  result=load(p)
  evidence.extend(result.get('map_evidence',[]))
for e in evidence:
 if e['facility_id']=='PUB-hopitalregionaldukef': e['facility_id']='public-kef-regional'
 if e['facility_id']=='PUB-hopitalregionaldetataouine': e['facility_id']='public-tataouine'
 # A provider map viewport is not an explicit position of its hospital marker.
 # Keep this candidate in the research proof, but do not display it as a site point.
 if e.get('coordinate_precision') == 'approximate_provider_map_center':
  e['latitude']=None; e['longitude']=None
  e['note']+=' Point non affiché : centre de viewport distinct de coordonnées de site confirmées.'

geo_path=WORK/'geolocalisations_sourcees.json'
if geo_path.exists():
 locations={r['facility_id']:r for r in load(geo_path)}
 for e in evidence:
  location=locations.get(e['facility_id'])
  if location:
   e.update({k:location[k] for k in ['latitude','longitude','location_source','coordinate_precision']})
   e['note']+=' '+location['note']
for e in evidence:
 assert e.get('latitude') is None or e.get('location_source'),e['id']

dataset={'version':'1.1','title':'Inventaire documentaire 2024 · copie à confirmer','is_demo':False,
 'updated_on':'2026-11-01','snapshot_label':'Inventaire au 31 décembre 2024',
 'source_notice':'Équipements : copie tierce attribuée à la Carte sanitaire 2024, non authentifiée à l’original. Ces chiffres ne certifient pas le parc actuel ni les appareils fonctionnels. Population : source primaire INS vérifiée.',
 'source_url':source_url,'observations':[],'populations':populations,'coverage':[],
 'territorial_counts':counts,'facility_evidence':evidence}
(DATA/'inventory2024.json').write_text(json.dumps(dataset,ensure_ascii=False,indent=2),encoding='utf8')
for label,rows in [('inventaire_territorial_2024',counts),('population_rgph2024',populations),('dossiers_etablissements',evidence)]:
 (REPORT/f'{label}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 with (REPORT/f'{label}.csv').open('w',encoding='utf-8-sig',newline='') as f:
  fields=list(dict.fromkeys(k for r in rows for k in r))
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
for p in WORK.glob('round2-*'):
 if p.suffix in ['.json','.md']: shutil.copyfile(p,REPORT/p.name)
print(json.dumps({'territories':len(governorates),'territorial_cells':len(counts),'population_total':sum(p['population'] for p in populations),'evidence_rows':len(evidence),'localized_sites':len({r['facility_id'] for r in evidence if r.get('latitude') is not None})}))
