#!/bin/bash
# Voraussetzungen: Node 24, Playwright (NODE_MODULES_DIR), Chrome (CHROME_PATH), optional HTTPS_PROXY. Ergebnisse nach $OUT.
HIER="$(cd "$(dirname "$0")" && pwd)"; export OUT="${OUT:-$HIER/out}"; mkdir -p "$OUT"
: "${NODE_MODULES_DIR:?NODE_MODULES_DIR setzen}" "${CHROME_PATH:?CHROME_PATH setzen}"
# Serielle Messreihe für Issue #267 (Phase A). Jeder Lauf in frischem Browser; Ergebnisse in out/messung.jsonl.
R=klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert
T=tuerschild-edelstahl-form-und-groesse-selbst-waehlen
F=familienschild-acryl-baum-12x8-personalisiert
run(){ echo "[$(date -u +%H:%M:%S)] $*"; timeout 290 node "$HIER/messung.mjs" "$@" > /dev/null 2>>$OUT/lauf.err || echo "  -> Abbruch/Fehler $?"; sleep 4; }
echo "BLOCK 1 mobil kalt mit Warenkorb"
for i in 1 2 3; do s=""; [ $i = 1 ] && s=1
  run $R mobil kalt $i --cart ${s:+--shots=R-mobil}
  run $T mobil kalt $i --cart ${s:+--shots=T-mobil}
  run $F mobil kalt $i --cart ${s:+--shots=F-mobil}
done
echo "BLOCK 2 Referenz in Prio-Darstellung, mobil kalt, ohne Warenkorb"
for i in 1 2 3; do s=""; [ $i = 1 ] && s=1; run $R mobil kalt $i --prio ${s:+--shots=Rp-mobil}; done
echo "BLOCK 3 mobil warm, ohne Warenkorb"
for i in 1 2 3; do run $R mobil warm $i; run $T mobil warm $i; done
echo "BLOCK 4 Desktop kalt mit Warenkorb"
for i in 1 2 3; do s=""; [ $i = 1 ] && s=1; run $R desktop kalt $i --cart ${s:+--shots=R-desktop}; run $T desktop kalt $i --cart ${s:+--shots=T-desktop}; done
echo "BLOCK 5 Desktop warm, ohne Warenkorb"
for i in 1 2 3; do run $R desktop warm $i; run $T desktop warm $i; done
echo "FERTIG $(date -u +%H:%M:%S)"
