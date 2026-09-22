# Agent de remplissage de formulaires (Windows, IA locale)

Programme Windows qui lit des documents (PDF, Word, Excel) dans un dossier
local ou un lecteur reseau connecte en VPN, en extrait les informations
utiles grace a une IA **open source executee 100% en local** (aucune donnee
envoyee sur internet), puis remplit et valide automatiquement des
formulaires : PDF, Word/Excel, pages web (Chrome/Firefox/Edge) ou
applications Windows natives.

## Cas d'usage : travail a distance sur un dossier partage (VPN)

Ce programme est fait pour tourner sur **ton poste Windows** pendant que tu
travailles a distance : le dossier `source_folder` peut etre un lecteur
reseau que tu montes via ton VPN d'entreprise (lettre mappee type `Z:\...`
ou chemin UNC `\\serveur\partage\...`). Une fois le VPN connecte :

- en **mode automatique** (voir plus bas), l'agent verifie ce dossier partage
  toutes les X secondes et traite tout nouveau document des qu'il est depose
  (par toi ou par un collegue) ;
- si la connexion VPN tombe, l'agent ne plante pas : il journalise un
  avertissement et reessaie automatiquement des que le dossier redevient
  accessible.

## Ce que fait le programme

1. **Surveille** un dossier (ex: `Z:\Documents\A_traiter`, monte via ton VPN).
2. **Analyse** chaque document avec une IA locale (Ollama) pour en extraire
   les champs definis dans `config.yaml` (nom, date, montant, etc.).
3. **Valide** ces valeurs (champ obligatoire, format attendu) avant toute
   ecriture.
4. **Remplit** le formulaire cible :
   - PDF avec champs de formulaire (AcroForm)
   - Modele Word (`{{placeholder}}`) ou Excel (cellules mappees)
   - Formulaire web : ouvre une page dans le navigateur, remplit les
     champs, soumet, verifie le message de confirmation, ferme la page
   - Application Windows native : ouvre/relie la fenetre, remplit les
     champs via l'automatisation Windows (UI Automation), ferme la fenetre
5. **Journalise** tout dans `logs/agent.log` et dans l'interface graphique.

Important : ce programme se limite a **analyser et pre-remplir** les champs.
Si ton entreprise dispose deja d'un outil qui deplace automatiquement les
documents traites vers un dossier "Traites" (comme decrit par certains
utilisateurs), cet agent n'interfere pas avec ca : il lit dans
`source_folder` et ecrit le resultat rempli dans `output_folder`, sans
toucher ni deplacer le document source original.

## Connexion au site (formulaire web derriere un login)

Si le formulaire cible est une page web qui necessite de se connecter
(identifiant/mot de passe), l'agent ne stocke jamais ce mot de passe. Il
garde a la place ta **session de navigateur** dans un dossier local
(`browser_profile/` par defaut, jamais envoye nulle part) :

1. Au tout premier lancement, l'agent ouvre une fenetre de navigateur vide.
2. Tu te connectes **manuellement**, une seule fois, comme d'habitude.
3. Tant que tu ne te deconnectes pas et que la session ne s'expire pas cote
   serveur, tous les lancements suivants (traitement unique, surveillance
   continue, pas-a-pas) reutilisent cette session automatiquement -- plus
   besoin de te reconnecter.

Si le site te deconnecte a nouveau (session expiree), reconnecte-toi une
fois manuellement dans la fenetre ouverte par l'agent, comme la premiere
fois. Pour repartir d'une session vierge a chaque lancement, mets
`browser.profile_dir` a `""` dans `config.yaml`.

Un mode de secours "vision d'ecran" (`src/automation/screen_agent.py`) existe
pour les cas ou aucune des methodes ci-dessus n'est possible (logiciel sans
API d'automatisation) : il prend une capture d'ecran, demande a un modele de
vision local ou se trouve un champ, puis clique/tape a cet endroit. Il
demande une confirmation avant chaque action par defaut, car il agit
reellement sur la souris/le clavier.

## Limites importantes (a lire avant de commencer)

- **Internet Explorer n'est pas supporte.** Microsoft a officiellement
  retire ce navigateur le 15 juin 2022 : il ne recoit plus aucune mise a
  jour de securite, et les outils d'automatisation modernes (Playwright,
  Selenium 4+) ne le pilotent plus du tout. Utilise **Chrome**, **Edge** ou
  **Firefox** (configurable dans `config.yaml`, cle `browser.channel`).
- **Le mode "vision d'ecran"** est un filet de securite, pas la methode
  principale : les modeles de vision open source actuels (LLaVA, etc.) sont
  moins fiables qu'une automatisation basee sur de vrais identifiants de
  champs (AcroForm, selecteurs CSS, Automation ID). A reserver aux cas sans
  alternative, et a toujours superviser au debut.
- **Aucune sauvegarde cloud** : tout tourne en local. Pense a sauvegarder
  `config.yaml` et les modeles de formulaires.
- Ce depot fournit une **base fonctionnelle** couvrant les briques
  demandees (lecture, IA locale, remplissage, validation, navigateur,
  applications Windows, vision d'ecran). Chaque nouveau type de formulaire
  necessite d'ajouter un `job` dans `config.yaml` avec ses champs et son
  mapping.

## Installation (Windows)

1. Installer [Python 3.11+](https://www.python.org/downloads/) (cocher
   "Add Python to PATH" pendant l'installation).
2. Installer [Ollama](https://ollama.com) (IA open source locale), puis
   telecharger au moins un modele :
   ```
   ollama pull llama3.2
   ollama pull llava
   ```
3. Copier `config.example.yaml` vers `config.yaml` et adapter :
   - `source_folder` / `output_folder` (chemin local ou lecteur reseau
     monte via ton VPN, ex: `Z:\Documents\A_traiter`)
   - la liste des `jobs` (un job = un type de document source + un
     formulaire cible + les champs a extraire/valider)
4. Double-cliquer sur `run.bat` : il cree un environnement Python isole
   (`.venv`), installe les dependances et les navigateurs Playwright au
   premier lancement, puis ouvre l'interface graphique.

## Mode pas-a-pas (recommande pour commencer)

Avant de faire confiance a la chaine 100% automatique, utilise ce mode pour
verifier document par document que l'IA extrait les bonnes valeurs :

1. Dans l'interface graphique, choisis un job precis dans la liste (pas
   "(tous les jobs)").
2. Clique sur **"Charger et analyser le 1er document"**.
3. L'agent analyse le premier document trouve et affiche dans un tableau
   chaque champ attendu, la valeur extraite par l'IA, et son statut
   (`OK` ou le detail d'une erreur de format/champ manquant) -- sans rien
   remplir ni soumettre.
4. Tu decides :
   - **Double-clique sur une valeur** dans le tableau pour la corriger si
     l'IA s'est trompee (voir "Corriger une erreur de l'IA" ci-dessous).
   - **"Remplir et valider ce document"** : remplit le formulaire cible avec
     ces valeurs, puis passe automatiquement au document suivant.
   - **"Ignorer ce document"** : passe au suivant sans rien faire (utile si
     tu reperes une erreur et preferes corriger le document source avant).
   - **"Arreter le mode pas-a-pas"** : stoppe la revue a tout moment (et
     interrompt immediatement un remplissage en cours, arret d'urgence).

Une fois que tu as verifie sur plusieurs documents que l'extraction est
fiable pour un job donne, tu peux passer au mode automatique en chaine
ci-dessous pour ne plus avoir a valider chaque document manuellement.

## Corriger une erreur de l'IA (et l'aider pour la prochaine fois)

L'IA locale ne retient rien d'un lancement a l'autre : sans aide, elle
referait la meme erreur sur un document similaire. Pas besoin de tenir un
journal d'erreurs a part : dans le **mode pas-a-pas**, double-clique
directement sur une valeur incorrecte dans le tableau, saisis la bonne
valeur, puis clique sur "Remplir et valider ce document" comme d'habitude.

Cette correction est automatiquement enregistree dans `examples/<nom_du_job>.json`
(un fichier par job, cree tout seul) et sera fournie a l'IA comme exemple
lors des prochaines analyses de ce meme job -- elle peut ainsi eviter de
refaire la meme erreur sur des documents au format proche. Les 5 exemples
les plus recents sont utilises a chaque analyse (les plus anciens sont
progressivement oublies, jusqu'a 20 conserves au total par job).

Ce n'est pas de l'apprentissage automatique (le modele lui-meme ne change
pas) : c'est un aide-memoire que l'IA relit a chaque fois, limite mais
simple et transparent -- tu peux ouvrir ces fichiers `.json` a tout moment
pour voir exactement ce qui a ete enregistre, ou en supprimer un si besoin.

## Limite quotidienne de documents

Tu peux fixer un nombre maximum de documents que l'agent a le droit de
remplir par jour, tous modes confondus (traitement unique, surveillance
continue, pas-a-pas) :

- Dans `config.yaml`, cle `daily_limit` (ex: `daily_limit: 200`). Laisse
  vide ou supprime la ligne pour ne pas avoir de limite.
- Dans l'interface graphique, champ **"Limite de documents par jour"** en
  haut de la fenetre (modifiable a tout moment, prend effet au prochain
  demarrage d'un mode).
- En ligne de commande : `--daily-limit 200`.

Une fois la limite atteinte, l'agent arrete de remplir de nouveaux documents
(le mode surveillance continue reste actif mais n'agit plus, pret a
reprendre) et le compteur repart automatiquement a zero le lendemain. Le
nombre de documents deja remplis aujourd'hui s'affiche en temps reel dans
l'interface graphique.

## Mode automatique (surveillance continue du dossier partage)

C'est le mode a utiliser pour le travail a distance : une fois demarre, plus
besoin de relancer l'agent a chaque nouveau document.

- **Interface graphique** : bouton "Demarrer la surveillance continue".
  L'agent tourne alors en tache de fond, verifie le dossier partage toutes
  les `interval_seconds` (reglable dans `config.yaml`, section `watch`), et
  journalise chaque document traite. Bouton "Arreter la surveillance" pour
  stopper proprement.
- **Ligne de commande** :
  ```
  .venv\Scripts\python src\main.py --watch
  .venv\Scripts\python src\main.py --watch --dry-run   REM sans remplir/soumettre, pour tester
  ```

Chaque document deja traite est memorise (dossier `.state/`, local a la
machine) pour ne pas etre retraite au cycle suivant, sauf s'il est modifie
ou remplace sur le dossier partage.

## Lancer une seule fois (sans surveillance continue)

```
.venv\Scripts\python src\main.py --dry-run        REM analyse + validation seulement
.venv\Scripts\python src\main.py --job demande_remboursement
.venv\Scripts\python src\main.py                  REM tous les jobs, remplissage reel
```

## Construire un .exe autonome

```
build_exe.bat
```

Genere `dist\AgentFormulaires.exe` (necessite qu'Ollama tourne sur la
machine qui execute l'exe).

## Structure du projet

```
windows-form-agent/
  config.example.yaml     Configuration d'exemple a copier/adapter
  requirements.txt
  run.bat                 Lance l'interface graphique
  build_exe.bat           Construit l'executable Windows
  src/
    config.py             Chargement de config.yaml
    main.py                Orchestrateur (CLI) + boucle de surveillance continue
    gui.py                 Interface graphique (Tkinter)
    ai/ollama_client.py    Appels a l'IA locale (texte + vision)
    documents/             Lecture PDF/Word/Excel + extraction de champs via IA
    forms/                 Remplissage et validation de formulaires PDF/Word/Excel
    automation/
      browser.py           Formulaires web (Playwright : Chrome/Edge/Firefox)
      desktop.py           Applications Windows natives (pywinauto)
      screen_agent.py       Mode de secours vision d'ecran
    utils/                  Logs, acces aux dossiers locaux/reseau, suivi des documents traites (.state/)
```

## Prochaines etapes possibles

- Ajouter un mapping de champs par glisser-deposer dans l'interface (au lieu
  d'editer `config.yaml` a la main).
- Rapport recapitulatif (documents traites/en erreur) exportable en PDF/CSV.
- Demarrage automatique de la surveillance a l'ouverture de l'application
  (au lieu de cliquer sur "Demarrer" a chaque fois).
