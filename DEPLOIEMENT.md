# Publication de l’atlas

Dépôt : `Docriadhchaker/atlas-imagerie-tunisie`. Domaine choisi : `atlas.riadhchaker.com`.

## GitHub Pages

La source Pages doit être **GitHub Actions**. Le workflow teste, compile et publie `dist/` après chaque push sur `main`.

Variables de dépôt (Settings → Secrets and variables → Actions → Variables) :

| Variable | Valeur |
| --- | --- |
| `PAGES_BASE_PATH` | `/atlas-imagerie-tunisie/` pour l’URL github.io ; `/` pour le domaine personnalisé |
| `SUPABASE_URL` | URL publique du projet Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Clé `sb_publishable_…` uniquement, visible dans le navigateur |

Sans configuration Supabase, l’application utilise le snapshot JSON versionné. Avec une configuration complète, les échecs Supabase sont affichés explicitement, sans substitution silencieuse. Une clé secrète n’est jamais autorisée.

## Supabase

Pour ce MVP, `atlas_snapshots` conserve une publication JSON atomique : chiffres, provenance, états de vérification et gouvernorats restent cohérents. Ce choix facilite la migration des fichiers locaux. `supabase/schema.sql` reste une proposition de normalisation ultérieure et ne doit pas être exécuté pour ce déploiement.

1. Régénérer les fichiers SQL : `node scripts/prepare-supabase.mjs`.
2. Exécuter `supabase/install.sql` dans un projet Supabase autorisé. Il crée uniquement `atlas_snapshots`, sa politique de lecture des lignes publiées, puis charge le snapshot `inventory2024`.
3. Vérifier avec la clé publishable que le snapshot est lisible, qu’un brouillon ne l’est pas et qu’aucune écriture anonyme n’est autorisée.
4. Renseigner les deux variables GitHub publiques et relancer le workflow Pages.

Les rôles navigateur `anon` et `authenticated` n’ont que SELECT. Les imports CSV/JSON de l’interface restent en mémoire ; une mise à jour permanente se fait par le processus de validation puis le SQL régénéré. Aucun compte administrateur ni mot de passe de base n’est embarqué dans le site.

## Domaine

Dans le DNS de `riadhchaker.com`, ajouter uniquement :

| Type | Nom | Cible |
| --- | --- | --- |
| CNAME | `atlas` | `docriadhchaker.github.io` |

Configurer `atlas.riadhchaker.com` dans Settings → Pages → Custom domain. Mettre `PAGES_BASE_PATH=/`, relancer la publication puis activer HTTPS lorsque GitHub a délivré le certificat. Ne pas modifier les enregistrements du domaine principal ni ceux du guide.

Documentation : [Vite / GitHub Pages](https://vite.dev/guide/static-deploy), [domaines GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [sécurité API Supabase](https://supabase.com/docs/guides/api/securing-your-api).
