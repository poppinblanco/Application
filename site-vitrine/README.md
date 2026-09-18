# Site vitrine — Raïssa Coiffure

Site public pour présenter le salon, les tarifs, prendre rendez-vous, offrir une carte
cadeau et vendre en boutique. C'est un site 100% statique (HTML/CSS/JS), **indépendant**
de l'application privée (CRM) présente dans le reste de ce dépôt : il n'y touche pas et
peut être hébergé séparément.

Il n'y a pas de paiement en ligne ni d'agenda connecté (ça demanderait un compte
Stripe et un serveur). Les demandes de rendez-vous, commandes boutique et cartes
cadeaux arrivent par formulaire, à confirmer vous-même par téléphone/SMS.

## 1. Personnaliser le site

Tout se passe dans **`js/config.js`** : nom du salon, adresse, téléphone, horaires,
réseaux sociaux, prestations/tarifs, produits de la boutique, avis clients. Les
lignes marquées `// TODO` sont à remplacer par vos vraies informations.

Ajoutez vos photos dans `assets/photos/` puis indiquez leur nom dans `config.js`
(`business.photo`, ou `image` sur chaque produit).

## 2. Recevoir les demandes par e-mail proprement (recommandé)

Par défaut, les formulaires (rendez-vous, boutique, carte cadeau) ouvrent le
logiciel de messagerie du client avec un message pré-rempli vers votre adresse
(`business.email` dans `config.js`). Ça fonctionne, mais c'est moins fiable et
un peu daté.

Pour recevoir directement les demandes dans votre boîte mail, sans que la
cliente ait besoin d'un logiciel de messagerie configuré :

1. Créez un compte gratuit sur [formspree.io](https://formspree.io) (jusqu'à
   50 envois/mois gratuits).
2. Créez un formulaire, reliez-le à votre adresse e-mail.
3. Copiez l'URL du formulaire (ex. `https://formspree.io/f/abcdwxyz`) dans
   `js/config.js` → `formspreeEndpoint`.

## 3. Tester en local

Aucune installation nécessaire. Depuis ce dossier :

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## 4. Héberger gratuitement + nom de domaine personnel

**Option recommandée : Netlify** (gratuit, gère très simplement un nom de domaine
personnel) :

1. Créez un compte gratuit sur [netlify.com](https://www.netlify.com) (connexion
   possible avec votre compte GitHub).
2. "Add new site" → "Import an existing project" → choisissez ce dépôt GitHub.
3. Dans les réglages du site : **Base directory** = `site-vitrine`, **Build
   command** = (laisser vide), **Publish directory** = `site-vitrine`.
4. Netlify vous donne une adresse gratuite du type
   `raissa-coiffure.netlify.app` immédiatement.
5. Pour un nom de domaine personnel (ex. `raissacoiffure.fr`) : achetez le nom
   de domaine chez un registrar (OVH, Namecheap, Google Domains… en général
   10-15 €/an, ce n'est jamais gratuit), puis dans Netlify allez dans
   **Domain settings → Add custom domain** et suivez les instructions pour
   pointer votre domaine vers Netlify (le certificat HTTPS est généré
   automatiquement et gratuitement par Netlify).

**Alternative : GitHub Pages.** Ce dépôt a déjà un déploiement GitHub Pages
pour l'application privée (CRM) à la racine. On peut ajouter ce site vitrine
en plus, mais il seraît alors accessible à une sous-adresse (par ex.
`https://votre-compte.github.io/Application/site-vitrine/`), ce qui est
moins pratique si vous voulez que votre nom de domaine pointe directement
dessus. Netlify (ou Vercel / Cloudflare Pages, gratuits eux aussi) est donc
préférable pour ce site public.

## 5. Ce qui reste à faire avant publication

- [ ] Remplacer toutes les informations `// TODO` dans `js/config.js`
      (adresse réelle, téléphone, horaires, tarifs, produits)
- [ ] Ajouter vos vraies photos dans `assets/photos/`
- [ ] Remplacer les avis d'exemple par de vrais avis (avec l'accord des clientes)
- [ ] Créer un compte Formspree si vous voulez éviter le mailto (étape 2)
- [ ] Vérifier les mentions légales (nom, SIRET si auto-entrepreneur, adresse)
      à ajouter en pied de page si nécessaire

## 6. Déploiement Netlify connecté à ce dépôt

Le site est relié à Netlify (déploiement continu) avec la configuration suivante,
à vérifier dans **Project configuration → Developer settings** :

- **Repository** : `poppinblanco/Application`
- **Build settings → Base directory** : `site-vitrine`
- **Production branch** (dans Branches and deploy contexts) : la branche de
  travail actuelle, ex. `claude/coiffure-booking-shop-site-pqzxfc`, ou `main`
  une fois cette branche fusionnée.

Chaque nouveau commit poussé sur cette branche redéploie automatiquement le
site sur Netlify.
