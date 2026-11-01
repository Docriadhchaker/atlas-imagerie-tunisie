# Vérification de la première version locale

Date : 1 novembre 2026.

## Résumé sur la carte : CT et IRM séparés

Le survol et le clic sur un gouvernorat montrent désormais deux quantités distinctes : « Scanners CT » et « IRM ». Le clic ouvre une fiche flottante conservée lors du filtrage et du zoom, avec millésime et qualification de la source. Pour Médenine, les valeurs documentaires attendues sont 16 CT et 5 IRM ; le total combiné ne les remplace plus. Les types décochés sont omis et les quantités inconnues restent « — ». **24 tests passent**, compilation et fichier autonome régénérés ; aucun contrôle visuel supplémentaire par l’agent n’est revendiqué.

## Correction du panneau au clic sur Médenine

Le panneau territorial n’affichait pas directement les dossiers nominatifs, qui restaient dans une liste repliée sous le tableau. Les coordonnées inconnues empêchaient également l’accès par des points de carte. La fiche territoriale affiche maintenant les dossiers sans dépendre de leur géolocalisation et présente les chiffres par type/secteur. Elle explique le mode fictif et le masquage volontaire des totaux non authentifiés.

Un test de rendu du panneau sélectionné de Médenine échouait sur l’absence de Zarzis avant correction, puis passe avec les trois noms et les valeurs CT 6/10/16, IRM 1/4/5. Les cas filtre de confiance et jeu fictif sont également testés. Total : **22 tests réussis**, compilation et version autonome régénérées. Les nombres restent les déclarations documentaires 2024 à confirmer ; aucune donnée sanitaire n’a été inventée ou changée.

## Mise à jour documentaire après essai utilisateur

L’utilisateur a confirmé que l’UI lui convient. La version autonome est maintenant régénérée avec l’inventaire documentaire 2024 à confirmer et le sélecteur de démonstration. **19 tests passent**, y compris sommes territoriales, qualification des zéros, absence de double compte, masquage des chiffres non authentifiés, provenance et appartenance territoriale des quatre points sourcés. La compilation TypeScript/Vite et la génération du HTML autonome réussissent. Aucun contrôle visuel supplémentaire par l’agent n’est revendiqué.

Le nouveau jeu contient 96 cellules territoriales, 24 populations primaires INS et 97 preuves documentaires ; quatre emprises hospitalières OSM fournissent des positions représentatives sourcées. Les totaux d’équipements restent non authentifiés à l’original et ne sont pas certifiés actuels.

## Réalisé

- Installation locale des dépendances depuis le registre npm.
- `npm.cmd run build` : compilation TypeScript et génération Vite réussies.
- `npm.cmd test` : 11 tests réussis : intégrité du dataset, totaux CT/IRM, sites distincts, filtres, densités, états inconnus/absence/non-recensé, couverture partielle, historique, dates et doublons, CSV, chargement autonome sans réseau.
- Vérification HTTP avec Vite et client HTTP dans la même session : réponse **200** pour `/`, `/src/App.tsx`, `/data/demo.json`, `/data/tunisia-governorates.geojson`.
- Données de démonstration : 24 gouvernorats réels, 12 sites fictifs, 20 observations fictives, 17 scanners fictifs et 9 IRM fictives.

## Limite de vérification

Le navigateur de contrôle et les autres sessions n’ont pas pu joindre le serveur de développement via la boucle locale, malgré son démarrage réussi. Un serveur test et un client dans la même session communiquent normalement. La limitation apparaît liée à l’isolation de l’environnement d’exécution ; sa cause système n’a pas été établie.

Le rendu visuel, les interactions cartographiques dans un navigateur réel et les dimensions mobiles **restent à vérifier**. Ils ne sont pas déclarés validés par les tests de logique métier. La tentative de démarrage détaché via `Start-Process` a été refusée par le contrôle automatique d’approbation, qui indique qu’une approbation est nécessaire mais désactivée pour cette catégorie. Aucun réglage système n’a été modifié.

## Vérification depuis la session utilisateur

Une version autonome `Atlas-Imagerie-local.html` contient le même code, les styles, les observations et la géométrie. Elle peut être ouverte directement, sans serveur ni terminal. La compilation `npm.cmd run build:local` la régénère. L’outil de navigation de l’agent refuse le protocole `file:` ; aucune tentative de contournement ou modification de sécurité n’a été effectuée. Le rendu reste non vérifié par l’agent.

1. Double-cliquer `Lancer-local.cmd` et garder le terminal ouvert.
2. Ouvrir http://127.0.0.1:5173.
3. Vérifier la bannière fictive, les 17 CT, 9 IRM et 12 sites de démonstration.
4. Filtrer Scanner CT + Public + Tunis : 3 scanners fictifs, 1 site et ratio fictif 0,3 / 100 000.
5. Cliquer un point : vérifier fiche, quantité, source et date ; tester l’ouverture depuis la liste d’établissements.
6. Comparer Tozeur (aucune donnée), Béja (non recensé dans la source fictive) et Tataouine (scénario fictif d’absence vérifiée).
7. Réinitialiser les filtres, changer la coloration, tester recherche et export du tableau.
8. Importer le CSV d’exemple : 20 observations, aucun ratio ni preuve d’absence importés ; recharger pour revenir au jeu complet.
9. Réduire la fenêtre à environ 390 px : vérifier empilement des panneaux, filtres accessibles et tableau à défilement horizontal.

GitHub : aucun push. Supabase : aucun projet ni connexion. Déploiement : aucun.
