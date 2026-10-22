@echo off
cd /d "%~dp0"
py -3 -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>&1
if not errorlevel 1 (
  py -3 cdr_bridge.py --send --report 7x2-ergebnis.json
) else (
  python -c "import sys; sys.exit(sys.version_info < (3,10))" >nul 2>&1
  if errorlevel 1 (
    echo Python 3.10 oder neuer fehlt. Bitte Python installieren und erneut starten.
  ) else (
    python cdr_bridge.py --send --report 7x2-ergebnis.json
  )
)
pause
