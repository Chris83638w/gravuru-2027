@echo off
cd /d "%~dp0"
set "CDR_BRIDGE_TOKEN_ARG="
if exist "cdr-bridge-token.txt" set "CDR_BRIDGE_TOKEN_ARG=--token-file cdr-bridge-token.txt"
py -3 -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>&1
if not errorlevel 1 (
  py -3 cdr_bridge.py %CDR_BRIDGE_TOKEN_ARG% --send --report 7x2-ergebnis.json
) else (
  python -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>&1
  if errorlevel 1 (
    echo Python 3.10 oder neuer fehlt. Bitte Python installieren und erneut starten.
  ) else (
    python cdr_bridge.py %CDR_BRIDGE_TOKEN_ARG% --send --report 7x2-ergebnis.json
  )
)
pause
