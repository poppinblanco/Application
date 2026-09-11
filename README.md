# Raïssa Coiffure — Application mobile (CRM hors ligne)

Application web installable sur téléphone (PWA), 100% hors ligne : aucune connexion internet, aucun compte,
aucune carte bancaire nécessaire pour l'utiliser. Remplace l'ancien carnet HTML par une interface moderne
tout en gardant le même principe : toutes les données restent sur votre appareil.

## Fonctionnalités

- **Tableau de bord** : revenu du mois, rendez-vous à venir, taux horaire moyen, alertes stock bas / factures impayées
- **Clientes** : recherche, tags/filtres, fiche détaillée (historique, notes, photos/vidéos, appel/SMS/email/itinéraire en un tap)
- **Pipeline clientes** : suivi commercial par statut (prospect / active / inactive) avec revenu par étape
- **Catalogue de prestations** : liste de vos prestations à prix fixe, réutilisable en un tap sur chaque rendez-vous
- **Gestion de stock** : mèches et produits avec seuil d'alerte, décompte automatique à chaque prestation terminée
- **Devis & Factures** : documents numérotés (D-2026-0001, F-2026-0001), lignes détaillées, conversion devis → facture, export PDF professionnel
- **Rendez-vous** : liste à venir/historique groupé par jour/semaine/mois, prix, durée, coût produits, photos, avec bascule Liste/Calendrier directement dans l'onglet Agenda
- **Email groupé** : préparez un message (objet + texte) et envoyez-le à vos clientes par segment (prospects/actives/inactives) ou à des adresses libres ; l'application ouvre votre appli email habituelle avec les destinataires en copie cachée — aucun envoi automatique, aucun serveur
- **Carte** : localisation des clientes et interventions (OpenStreetMap, gratuit, sans clé), géolocalisation de votre position, itinéraire — nécessite internet uniquement au moment d'afficher la carte ou de localiser une adresse
- **Statistiques** : revenu mensuel en graphique, taux horaire réel après charges, classement des clientes
- **Reçus PDF** : génération en un clic pour chaque prestation terminée, entièrement hors ligne
- **Pense-bête** : notes avec date et statut fait/à faire
- **Import** : reprise des données de l'ancien export JSON (clientes + rendez-vous)
- **Installable** : "Ajouter à l'écran d'accueil" sur iPhone/Android, fonctionne comme une vraie app, y compris en avion/sans réseau

## Architecture

- **Frontend** : React + Vite, PWA (installable, service worker, fonctionne hors ligne)
- **Données** : `localStorage` (clientes, rendez-vous, notes, réglages)
- **Photos/vidéos** : `IndexedDB` (capacité bien supérieure à `localStorage`, évite le problème de l'ancien
  fichier JSON de 170 Mo)
- **Carte** : Leaflet + OpenStreetMap (gratuit, aucune clé API, nécessite internet uniquement pour charger la carte)
- **PDF** : généré directement dans le navigateur (jsPDF), aucun serveur

Aucun compte, aucune inscription, aucune carte bancaire. Tout tourne uniquement sur votre téléphone.

⚠️ **Important** : comme avec l'ancien carnet, il n'y a **aucune sauvegarde automatique dans le cloud**. Si vous
changez de téléphone ou désinstallez l'application, les données sont perdues sauf si vous les avez exportées.
Pensez à faire régulièrement **Plus → Réglages → Exporter mes données**, surtout avant de changer d'appareil.

## 1. Lancer l'application en local

```bash
npm install
npm run dev
```

Ouvrez l'URL affichée. L'application s'ouvre directement sur le tableau de bord, sans connexion requise.

## 2. Importer vos données existantes

Allez dans **Plus → Importer des données**, sélectionnez votre fichier d'export JSON de l'ancien carnet
(clientes + rendez-vous). Les photos ne sont pas reprises automatiquement (elles étaient stockées en base64
dans l'ancien fichier) : rajoutez-les au fur et à mesure depuis chaque fiche.

## 3. Installer l'application sur votre téléphone

Il faut d'abord héberger l'application quelque part en HTTPS (une PWA ne s'installe pas depuis un simple
fichier local) — voir l'étape 4 pour un hébergement gratuit. Une fois en ligne :

- **iPhone (Safari)** : ouvrez le lien → bouton Partager → "Sur l'écran d'accueil"
- **Android (Chrome)** : ouvrez le lien → menu ⋮ → "Ajouter à l'écran d'accueil" / "Installer l'application"

Une fois installée, l'application fonctionne ensuite entièrement hors connexion (sauf pour la carte).

## 4. Héberger gratuitement (GitHub Pages)

Ce dépôt inclut un workflow GitHub Actions (`.github/workflows/deploy.yml`) qui publie automatiquement
l'application sur GitHub Pages à chaque envoi sur la branche `main` :

1. Sur GitHub, allez dans **Settings → Pages** de ce dépôt → **Source : GitHub Actions**.
2. Fusionnez cette branche sur `main` (ou déclenchez le workflow manuellement depuis l'onglet **Actions**).
3. Votre application sera disponible à une adresse du type `https://<votre-compte>.github.io/Application/`.

Aucun compte supplémentaire, aucune carte bancaire : uniquement votre compte GitHub existant.

## Notes

- La géolocalisation ("Ma position" sur la carte) utilise l'API du navigateur — une autorisation sera
  demandée la première fois.
- Le géocodage d'adresses (transformer une adresse en point sur la carte) utilise Nominatim
  (OpenStreetMap), gratuit mais nécessite internet au moment de l'enregistrement de l'adresse.
- Si le stockage de l'appareil est plein, un message vous invite à exporter vos données ; supprimez au
  besoin d'anciennes photos depuis les fiches concernées.
