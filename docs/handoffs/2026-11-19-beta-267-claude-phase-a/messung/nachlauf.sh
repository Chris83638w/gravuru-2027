#!/bin/bash
# Voraussetzungen: Node 24, Playwright (NODE_MODULES_DIR), Chrome (CHROME_PATH), optional HTTPS_PROXY. Ergebnisse nach $OUT.
HIER="$(cd "$(dirname "$0")" && pwd)"; export OUT="${OUT:-$HIER/out}"; mkdir -p "$OUT"
: "${NODE_MODULES_DIR:?NODE_MODULES_DIR setzen}" "${CHROME_PATH:?CHROME_PATH setzen}"
# Nachläufe zu Issue #267: zwei Wiederholungen für n=3 und zwei Diagnoseläufe (Serverzeiten, Befestigung, Bearbeiten aus dem Warenkorb).
R=klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert
T=tuerschild-edelstahl-form-und-groesse-selbst-waehlen
S="$HIER"
run(){ echo "[$(date -u +%H:%M:%S)] $*"; timeout 290 node "$@" > /dev/null 2>>$OUT/lauf.err || echo "  -> Abbruch/Fehler $?"; sleep 4; }
run $S/messung.mjs $R mobil warm 4
run $S/messung.mjs $T desktop kalt 4 --cart
run $S/diagnose.mjs $R mobil kalt 1 --cart --mount --shots=diag-R-mobil
run $S/diagnose.mjs $T mobil kalt 1 --cart --mount --shots=diag-T-mobil
run $S/diagnose.mjs $R desktop kalt 1 --cart --shots=diag-R-desktop
echo "FERTIG $(date -u +%H:%M:%S)"
