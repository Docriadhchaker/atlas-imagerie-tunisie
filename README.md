# Atlas Imagerie · Tunisie

Application de cartographie descriptive des scanners CT et IRM, utilisable en local ou sur GitHub Pages. Le chargement Supabase est optionnel et en lecture seule. Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour la configuration publique. La vue par défaut affiche un **inventaire documentaire 2024 à confirmer** couvrant les 24 gouvernorats ; la copie tierce de la Carte sanitaire n’a pas été authentifiée à l’original ministériel. Les populations proviennent du RGPH 2024 de l’INS, source primaire vérifiée. Le sélecteur permet de revenir aux exemples fictifs, conservés séparément. Les limites géographiques proviennent de geoBoundaries (géographie 2017, ODbL 1.0).

## Enrichissement documentaire

- `public/data/inventory2024.json` : 96 cellules territoriales (24 gouvernorats × CT/IRM × public/privé), 24 populations INS, dossiers d’établissements.
- Les totaux 2024 sont **transcrits d’une copie tierce non authentifiée** : 212 CT et 73 IRM. L’interface affiche « Inventaire 2024 » et conserve les références dans les fiches. Les niveaux de vérification restent dans les données, l’export et le filtre « Sources vérifiées uniquement ». Ce n’est pas un inventaire du parc fonctionnel en 2026. La page « Données & méthode » a été retirée de l’interface publique ; cette documentation technique reste dans le dépôt.
- Les dossiers d’établissements documentent des présences déclarées, usages historiques, mises en service, projets ou pannes. Ils ne sont jamais additionnés aux agrégats 2024.
- Les points géographiques sont des positions représentatives d’emprises hospitalières OSM explicitement identifiées, pas la position des machines. Chaque point garde sa source distincte. Aucun centre de gouvernorat ni centre de viewport de carte n’est utilisé comme adresse d’établissement.
- Un zéro imprimé est « zéro déclaré dans la source », jamais une absence actuelle vérifiée.
- `scripts/build-inventory-data.py` reconstruit la projection locale à partir du corpus de recherche. Les extraits structurés de recherche sont conservés dans `data/research/` et leurs sources restent attachées aux observations. Aucun PDF tiers intégral n’est redistribué. Les exports de travail sont générés dans `work/research-exports/`.

## Démarrer sous Windows

**Ouverture sans serveur :** ouvrir `Atlas-Imagerie-local.html` dans un navigateur. La carte, l’inventaire, les exemples fictifs et les styles sont intégrés au fichier ; aucun serveur n’est nécessaire. Cette version utilise le même code que l’application Vite. L’import CSV/Excel/JSON et les filtres fonctionnent en mémoire. Après modification des sources ou du dataset, la régénérer avec `npm.cmd run build:local`.

Prérequis : Node.js 22.12+ (testé avec 22.19).

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvrir http://127.0.0.1:5173. Le serveur écoute uniquement sur la boucle locale. Arrêter avec Ctrl+C dans le terminal qui le lance.

Vous pouvez aussi double-cliquer `Lancer-local.cmd`. Il ouvre le terminal nécessaire à l’application et affiche l’adresse. Aucun compte ni service distant n’est créé. Si l’environnement d’exécution de l’agent isole la boucle locale, ce lancement depuis votre session Windows permet la vérification visuelle dans votre navigateur.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Après installation, la carte et les données fonctionnent sans service de tuiles, CDN ou police distante. Les liens de provenance externes ne sont ouverts que sur demande. Dépendances et limites ont été téléchargées pour le développement, sans création de compte.

## Organisation

- `src/components/MapView.tsx` : carte Leaflet et points d’établissements.
- `src/components/ImportDialog.tsx` : validation et aperçu avant remplacement en mémoire.
- `src/data/repository.ts` : chargement local, contrat de remplacement futur, validation et import CSV.
- `src/data/importFile.ts` : lecture locale CSV/JSON/Excel et conversion des cellules Excel vers le même contrat de validation.
- `src/domain/model.ts` : types métier.
- `src/domain/indicators.ts` : filtres, dernière observation et indicateurs descriptifs.
- `src/App.tsx` : interface et orchestration.
- `public/data/` : sources locales.
- `supabase/schema.sql` : proposition de schéma futur, non exécutée, RLS activée sans politique permissive.
- `tests/` : vérifications des calculs, imports et cas d’information manquante.

## Fichiers de données

| Fichier | Contenu |
| --- | --- |
| `public/data/demo.json` | 12 sites fictifs, 20 observations, 10 populations fictives et scénarios de couverture |
| `public/data/observations.example.csv` | Les 20 observations fictives au format plat |
| `public/data/observations.example.xlsx` | Les mêmes 20 observations fictives, avec dates et nombres Excel |
| `public/data/governorates.json` | Identifiants et noms des 24 gouvernorats, dérivés des limites |
| `public/data/tunisia-governorates.geojson` | Limites geoBoundaries simplifiées |
| `public/data/boundaries.metadata.json` | Métadonnées originales : source, licence, millésime, URL du téléchargement versionné |

`scripts/create-demo.mjs` permet de régénérer la démonstration ; il ne recherche aucune donnée réelle.

## Import local

Le bouton **Importer CSV / Excel / JSON** ouvre un fichier de l’ordinateur, sans transmission. Après validation et clic sur **Afficher mon aperçu**, il remplace le jeu dans cet onglet seulement. Un rechargement rétablit l’inventaire publié (Supabase si configuré, sinon `inventory2024.json`). L’import n’effectue aucune écriture Supabase et ne modifie pas les autres visiteurs. Taille maximale : 5 Mo.

Excel : format `.xlsx`, première feuille seulement, mêmes en-têtes que le CSV. Le modèle téléchargeable est entièrement fictif. Les dates Excel, nombres et booléens sont reconnus ; les en-têtes et la provenance sont validés avant affichage. Les anciens formats `.xls` doivent être enregistrés en `.xlsx`. Le lecteur `read-excel-file` est chargé à la demande et traite le fichier dans le navigateur. `python scripts/create-excel-example.py` régénère le modèle à partir du CSV et la fixture de test sans source.

JSON : même enveloppe que `demo.json` (`version`, `title`, `is_demo`, `updated_on`, `observations`, `populations`, `coverage`), avec extensions optionnelles `territorial_counts` et `facility_evidence` illustrées par `inventory2024.json`. CSV : en-têtes de `observations.example.csv`, séparateur virgule ou point-virgule, UTF-8, guillemets possibles. Le CSV charge uniquement les observations : population et couverture restent inconnues. Les lignes sont des quantités par **site + type + date**, et non des appareils individuels. Une quantité inconnue ne peut pas être importée comme 1 : elle reste dans les dossiers documentaires, hors inventaire quantifié.

Champs des observations : `id`, `facility_id`, `facility_name`, `facility_type`, `sector` (`public`/`private`), `governorate_code` (`TN-11`…), `delegation`, `latitude`, `longitude`, `equipment_type` (`CT`/`MRI`), `equipment_count` (entier positif), `functional_status` (`operational`/`non_operational`/`unknown`), `observed_on` (AAAA-MM-JJ), `source`, `source_reference`, `verification` (`verified`/`unverified`/`example`), `note`, `is_demo` (booléen).

Coordonnées : null par paire si inconnues. Pas de point fictif pour une adresse inconnue. Ces sites restent dans les indicateurs et la liste des établissements. Les bornes de coordonnées sont un contrôle grossier de zone, pas une validation géographique fine.

Les observations vérifiées sont **déclarées** telles par le fichier ; l’application ne vérifie pas la source. Un fichier ne peut pas mélanger exemples et données réelles. Les imports invalides sont rejetés sans changer le jeu affiché.

## Méthode et limites

- Dernière observation par site/type, sans addition des années historiques. Pas d’extrapolation à la date courante. La fiche conserve la date utilisée.
- Les totaux sont des **équipements recensés**, y compris statut fonctionnel inconnu ou non fonctionnel. Ils ne représentent pas le nombre actuellement en service.
- La population est la dernière disponible par gouvernorat. Les millésimes peuvent différer ; les fiches les affichent. Population manquante : ratio non calculé.
- Présence recensée : au moins un équipement dans la sélection.
- Absence vérifiée : preuves explicites de couverture pour **tous** les types et secteurs sélectionnés. L’exemple à Tataouine est fictif et ne décrit aucune réalité locale.
- Aucune donnée : au moins une partie de la sélection n’est pas documentée.
- Aucun équipement recensé dans la source : périmètre documenté mais absence non prouvée.
- « — » n’est jamais converti en zéro. Zéro uniquement pour une absence vérifiée dans les données.
- La carte et le tableau suivent les mêmes filtres. Les points sont regroupés par site ; couleur CT/IRM/mixte et forme public/privé.
- Le découpage de 2017 n’est pas certifié à jour ni une source administrative tunisienne officielle. Source [geoBoundaries](https://www.geoboundaries.org/api/current/gbOpen/TUN/ADM1/), [licence ODbL](https://opendatacommons.org/licenses/odbl/1-0/), [OSM](https://www.openstreetmap.org/copyright).
- Aucun score de besoin, temps de trajet, seuil normatif ni recommandation d’autorisation.

## Publication et suite

La publication utilise le workflow `.github/workflows/pages.yml`. Les instructions et la migration exécutable se trouvent dans [DEPLOIEMENT.md](DEPLOIEMENT.md). Le domaine retenu est `atlas.riadhchaker.com`.

La licence du code reste à choisir par l’auteur ; l’absence de licence ne constitue pas une autorisation générale de réutilisation. Les sources de données et le fond ODbL gardent leurs droits et attributions propres.

Priorités : authentifier la copie de l’inventaire ministériel, documenter le parc fonctionnel et dater les mises à jour. Les scores de besoin et l’aide aux autorisations restent hors MVP.

Stack : React, TypeScript, Vite et [Leaflet 1.9.4](https://leafletjs.com/download), icônes Lucide. Pas de backend requis pour le MVP.
