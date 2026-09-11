# Raïssa Coiffure — Application mobile (CRM)

Application web installable sur téléphone (PWA) pour gérer la clientèle, les rendez-vous,
la carte des interventions et le budget d'une activité de coiffure/tresses à domicile.
Remplace l'ancien carnet HTML hors-ligne par une application connectée en ligne, avec
photos hébergées, rappels par email et synchronisation entre appareils.

## Fonctionnalités

- **Tableau de bord** : revenu du mois, rendez-vous à venir, taux horaire moyen, activité récente
- **Clientes** : recherche, tags/filtres, fiche détaillée (historique, notes, photos, appel/SMS/email/itinéraire en un tap)
- **Rendez-vous** : liste à venir/historique groupé par jour/semaine/mois, prix, durée, coût produits, photos
- **Calendrier** : vue mensuelle avec points de couleur par statut
- **Carte** : localisation des clientes et interventions (OpenStreetMap, gratuit, sans clé), géolocalisation de votre position, itinéraire
- **Statistiques** : revenu mensuel en graphique, taux horaire réel après charges, classement des clientes
- **Pense-bête** : notes avec date et statut fait/à faire
- **Rappels par email** : récapitulatif automatique des rendez-vous des prochaines 24h (via EmailJS, gratuit)
- **Import** : reprise des données de l'ancien export JSON (clientes + rendez-vous)
- **Installable** : "Ajouter à l'écran d'accueil" sur iPhone/Android, fonctionne comme une vraie app

## Architecture

- **Frontend** : React + Vite, PWA (installable, service worker)
- **Base de données** : Firebase Firestore (temps réel, gratuit)
- **Photos** : Firebase Storage (gratuit jusqu'à 5 Go)
- **Authentification** : Firebase Auth (email/mot de passe, un seul compte pour vous)
- **Carte** : Leaflet + OpenStreetMap (gratuit, aucune clé API)
- **Emails** : EmailJS (gratuit jusqu'à 200 emails/mois, envoyés depuis le navigateur, aucun serveur nécessaire)

Tout est gratuit et ne nécessite aucune carte bancaire.

## 1. Créer votre projet Firebase (gratuit)

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com) et connectez-vous avec un compte Google.
2. Cliquez **Ajouter un projet**, donnez-lui un nom (ex. `raissa-crm`), continuez avec les options par défaut.
3. Dans le menu de gauche : **Compilation > Authentication** → **Commencer** → activez **Adresse e-mail/Mot de passe**.
   - Onglet **Users** → **Ajouter un utilisateur** → entrez votre email et un mot de passe : ce sera votre identifiant de connexion à l'application.
4. **Compilation > Firestore Database** → **Créer une base de données** → mode **production** → choisissez une région (ex. `eur3 (europe-west)`).
5. **Compilation > Storage** → **Commencer** → mode **production** → même région.
6. Dans **Paramètres du projet** (icône ⚙️ en haut à gauche) → onglet **Général** → section **Vos applications** → cliquez l'icône **Web** (`</>`) → donnez un nom → **Enregistrer l'application**.
7. Copiez les valeurs affichées (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## 2. Configurer l'application

```bash
cp .env.example .env
```

Ouvrez `.env` et collez les valeurs récupérées à l'étape 1 :

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 3. Sécuriser vos données

Depuis un terminal, connectez-vous et déployez les règles de sécurité (elles limitent l'accès à votre seul
compte connecté) :

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # choisissez votre projet
firebase deploy --only firestore:rules,storage:rules
```

## 4. Lancer l'application en local

```bash
npm install
npm run dev
```

Ouvrez l'URL affichée, connectez-vous avec l'email/mot de passe créés à l'étape 1.

## 5. Importer vos données existantes

Une fois connecté, allez dans **Plus → Importer des données**, sélectionnez votre fichier d'export JSON de
l'ancien carnet (clientes + rendez-vous). Les photos ne sont pas reprises automatiquement (elles étaient
stockées en base64 dans l'ancien fichier) : rajoutez-les au fur et à mesure depuis chaque fiche, elles seront
hébergées proprement sur Firebase Storage.

## 6. Rappels par email (optionnel)

1. Créez un compte gratuit sur [emailjs.com](https://www.emailjs.com).
2. **Email Services** → ajoutez votre service email (Gmail, Outlook...).
3. **Email Templates** → créez un template avec les variables `{{to_email}}`, `{{subject}}`, `{{message}}`.
4. **Account > General** → copiez votre **Public Key**.
5. Ajoutez dans `.env` :
   ```
   VITE_EMAILJS_SERVICE_ID=...
   VITE_EMAILJS_TEMPLATE_ID=...
   VITE_EMAILJS_PUBLIC_KEY=...
   VITE_REMINDER_EMAIL=votre-email@exemple.com
   ```
6. Un récapitulatif des rendez-vous des prochaines 24h est envoyé automatiquement à la première ouverture
   de l'application chaque jour (désactivable dans **Réglages**), et à tout moment via le bouton
   "Envoyer le récapitulatif maintenant".

   ⚠️ Limite du gratuit sans serveur : l'envoi ne se déclenche que lorsque vous ouvrez l'application (pas de
   cron serveur gratuit sans carte bancaire). Ouvrez l'app le matin pour recevoir votre récapitulatif du jour.

## 7. Installer l'application sur votre téléphone

Une fois déployée en ligne (étape 8) :
- **iPhone (Safari)** : ouvrez le lien → bouton Partager → "Sur l'écran d'accueil"
- **Android (Chrome)** : ouvrez le lien → menu ⋮ → "Ajouter à l'écran d'accueil" / "Installer l'application"

## 8. Déployer en ligne (gratuit)

```bash
npm run build
firebase deploy --only hosting
```

L'URL fournie (`https://<votre-projet>.web.app`) est votre application, accessible depuis votre téléphone
partout où il y a internet.

## Notes

- Les données sont désormais en ligne (Firestore) et synchronisées en temps réel : toute modification
  apparaît immédiatement sur tous vos appareils connectés au même compte.
- La géolocalisation utilise l'API du navigateur (bouton "Ma position" sur la carte) — le téléphone
  demandera une autorisation la première fois.
- Le géocodage d'adresses utilise Nominatim (OpenStreetMap), gratuit mais à usage raisonnable (pas
  d'envoi massif de requêtes).
