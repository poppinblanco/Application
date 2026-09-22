@echo off
REM Lance l'interface graphique de l'agent (Windows).
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Environnement virtuel introuvable. Lancement de l'installation...
    py -3 -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
    call .venv\Scripts\playwright install chromium firefox
)

call .venv\Scripts\python src\gui.py
pause
