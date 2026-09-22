@echo off
REM Construit un executable Windows autonome (dist\AgentFormulaires.exe).
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    py -3 -m venv .venv
    call .venv\Scripts\pip install -r requirements.txt
)

call .venv\Scripts\pip install pyinstaller
call .venv\Scripts\pyinstaller --noconfirm --onefile --windowed ^
    --name AgentFormulaires ^
    --add-data "config.example.yaml;." ^
    src\gui.py

echo.
echo Executable genere dans dist\AgentFormulaires.exe
pause
