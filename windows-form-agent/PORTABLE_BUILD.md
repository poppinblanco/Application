# Assembler le paquet portable (sans installation, sans droits admin)

Ce guide sert a construire **une seule fois**, sur un PC avec un acces
internet normal (ex: ton PC personnel), un dossier autonome contenant tout
ce qu'il faut pour faire tourner l'agent -- IA locale comprise -- sans
jamais installer quoi que ce soit sur le PC final (celui du travail). Une
fois assemble, tu copies simplement tout le dossier sur une cle USB et tu
lances `run_portable.bat` sur le PC verrouille.

Rien de ce qui suit n'ecrit dans le Registre Windows ni dans
`Program Files` : tout reste dans ce dossier `windows-form-agent/`.

## Ce qu'il te faut avant de commencer

- Un PC Windows avec un acces internet normal (pas le PC du travail).
- Environ 5 a 8 Go d'espace disque libre.
- Une cle USB (8 Go minimum) pour transferer le resultat.

## Etape 1 -- Python portable (aucune installation)

1. Va sur https://www.python.org/downloads/windows/
2. Telecharge la version **"Windows embeddable package (64-bit)"** pour une
   version recente de Python 3.11 ou 3.12 (fichier `python-3.1x.x-embed-amd64.zip`).
3. Extrais tout le contenu de ce zip dans `windows-form-agent/python/`
   (le dossier doit contenir directement `python.exe`, pas un sous-dossier).
4. Dans ce dossier `python/`, ouvre le fichier qui se termine par `._pth`
   (ex: `python311._pth`) avec le Bloc-notes. Trouve la ligne
   `#import site` et enleve le `#` du debut (elle doit devenir `import site`).
   Sans cette etape, pip ne fonctionnera pas.
5. Telecharge https://bootstrap.pypa.io/get-pip.py et place-le dans
   `windows-form-agent/python/`.
6. Ouvre une invite de commandes dans `windows-form-agent/python/` et lance :
   ```
   python.exe get-pip.py
   ```
7. Toujours dans ce dossier, installe les dependances du programme :
   ```
   python.exe -m pip install -r ..\requirements.txt
   ```

## Etape 2 -- Navigateur (Playwright), sans telechargement separe a gerer

Toujours depuis `windows-form-agent/python/`, avec la meme invite de
commandes, lance :
```
set PLAYWRIGHT_BROWSERS_PATH=0
python.exe -m playwright install chromium
```
`PLAYWRIGHT_BROWSERS_PATH=0` force Playwright a ranger le navigateur
directement a cote de ses propres fichiers (dans `python/`), au lieu de le
mettre dans ton profil Windows -- indispensable pour que tout reste
portable dans ce dossier.

## Etape 3 -- Moteur d'IA local portable (llama.cpp)

1. Va sur https://github.com/ggml-org/llama.cpp/releases
2. Dans la derniere version publiee, cherche dans "Assets" un fichier pour
   Windows 64 bits, sans GPU (le nom contient generalement "win" et "x64",
   par exemple quelque chose comme `llama-<version>-bin-win-cpu-x64.zip` --
   le nom exact change d'une version a l'autre, prends celui qui correspond
   a un usage CPU standard, pas "cuda" sauf si tu as une carte graphique
   NVIDIA recente et veux l'utiliser).
3. Extrais le contenu de ce zip dans `windows-form-agent/llamacpp/`.
4. Verifie que le fichier `llama-server.exe` se trouve bien directement
   dans `windows-form-agent/llamacpp/llama-server.exe` (pas dans un
   sous-dossier -- deplace-le si besoin, ou adapte `llamacpp.server_path`
   dans `config.yaml` en consequence).

## Etape 4 -- Le modele d'IA (fichier .gguf)

1. Va sur https://huggingface.co/models et cherche par exemple
   **"Llama 3.2 3B Instruct GGUF"** (ou "1B" pour un modele plus leger et
   plus rapide sur un PC modeste).
2. Choisis un depot propose par un "quantizer" reconnu (ex: recherche
   "bartowski" dans les resultats, tres utilise pour ce type de fichiers).
3. Telecharge la version **Q4_K_M** (bon compromis qualite/taille/vitesse,
   generalement 2 a 3 Go pour un modele 3B).
4. Renomme le fichier telecharge en `model.gguf` et place-le dans
   `windows-form-agent/models/model.gguf`.
   (Tu peux garder le nom d'origine si tu preferes : dans ce cas, adapte
   `llamacpp.model_path` dans `config.yaml`.)

## Etape 5 -- Configuration

1. Copie `config.example.yaml` vers `config.yaml`.
2. Ouvre `config.yaml` et change :
   ```yaml
   ai_engine: "llamacpp"
   ```
3. Verifie la section `llamacpp:` (les valeurs par defaut correspondent a
   la structure de dossiers ci-dessus, a adapter uniquement si tu as
   renomme des fichiers) :
   ```yaml
   llamacpp:
     server_path: "llamacpp/llama-server.exe"
     model_path: "models/model.gguf"
     host: "127.0.0.1"
     port: 8080
     context_size: 4096
     auto_start: true
   ```
4. Adapte `source_folder`, `output_folder`, `archive_folder` et le(s)
   `jobs:` selon ton besoin (voir le README principal).

## Etape 6 -- Lancer

Double-clique sur `run_portable.bat` (a la racine de `windows-form-agent/`).
Au premier lancement, le demarrage du moteur d'IA peut prendre 10 a 30
secondes (chargement du modele en memoire) : c'est normal, l'interface
graphique s'ouvre des que c'est pret.

## Structure finale attendue

```
windows-form-agent/
  python/                  Python portable + dependances + Chromium
  llamacpp/
    llama-server.exe       Moteur d'IA portable
  models/
    model.gguf             Modele d'IA local
  src/                     Code du programme (deja fourni)
  config.yaml              Ta configuration
  run_portable.bat         Lanceur (deja fourni)
```

## Transferer sur le PC du travail

1. Copie tout le dossier `windows-form-agent/` sur la cle USB.
2. Sur le PC du travail, copie-le depuis la cle vers un dossier local
   (ou lance-le directement depuis la cle si l'ecriture sur le disque
   local est aussi restreinte).
3. Double-clique sur `run_portable.bat`.

Si Windows affiche un avertissement de securite a la premiere execution
("Editeur inconnu"), c'est normal pour un executable non signe -- clique
sur "Plus d'infos" puis "Executer quand meme" si l'option est proposee. Si
meme cela est bloque par une politique de securite, aucune version de ce
programme (portable ou non) ne pourra fonctionner sur ce poste precis --
dans ce cas, une solution basee sur Power Automate (deja approuve dans
ton entreprise) est la meilleure alternative.

## Limite connue

Le mode "vision d'ecran" (secours, decrit dans le README principal) n'est
pas disponible avec le moteur llama.cpp portable dans cette version -- il
necessite un modele de vision, ce qui n'est pas requis pour ton usage
(formulaire web avec champs identifies par selecteurs). Le reste du
programme (lecture de documents, extraction de champs, remplissage web,
mode pas-a-pas, arret d'urgence, etc.) fonctionne a l'identique.
