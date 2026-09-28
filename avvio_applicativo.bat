@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creazione virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERRORE: impossibile creare il virtual environment.
        echo Verifica che Python sia installato e presente nel PATH.
        pause
        exit /b 1
    )
)

call ".venv\Scripts\activate.bat"

echo Installazione/aggiornamento dipendenze...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERRORE: installazione delle dipendenze fallita.
    pause
    exit /b 1
)

echo.
echo Avvio dell'applicativo...
python pineapple-api.py

pause
