@echo off
REM Lance l'agent en mode 100% portable (Python portable + moteur d'IA
REM llama.cpp portable), sans rien installer sur cette machine.
REM Voir PORTABLE_BUILD.md pour assembler ce dossier au prealable.
setlocal
cd /d "%~dp0"

if not exist "python\python.exe" (
    echo Python portable introuvable dans "python\".
    echo Suis les instructions de PORTABLE_BUILD.md avant de relancer.
    pause
    exit /b 1
)

if not exist "config.yaml" (
    echo config.yaml introuvable. Copie config.example.yaml vers config.yaml
    echo et adapte-le ^(voir PORTABLE_BUILD.md, etape 5^) avant de relancer.
    pause
    exit /b 1
)

REM Garde le navigateur Playwright range dans le dossier "python\" plutot
REM que dans le profil Windows de l'utilisateur (portabilite).
set PLAYWRIGHT_BROWSERS_PATH=0

python\python.exe src\gui.py
if errorlevel 1 pause
