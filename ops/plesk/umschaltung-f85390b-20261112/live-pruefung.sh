#!/bin/bash
# Lesende Prüfung des Live-Konfi über den echten Shopify-Proxy. Gibt nie das Sitzungstoken aus.
# Aufruf: live-pruefung.sh <label> <product> <variant> <back-path> [nativ|legacy]
B=https://gravuru-design.myshopify.com; A=https://app-2027.gravuru-designwerkstatt.de
L=$1; P=$2; V=$3; BACK=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$4"); ART=${5:-nativ}
H=$(curl -sS -o /dev/null -D - --max-time 60 "$B/apps/konfigurator/start?product=$P&variant=$V&back=$BACK&ui=prio-r15")
CODE=$(echo "$H" | head -1 | tr -d '\r'); LOC=$(echo "$H" | grep -i '^location:' | tr -d '\r' | sed -E 's/^[Ll]ocation: *//')
TOK=$(echo "$LOC" | sed -nE 's/.*#s=([A-Za-z0-9_.-]+).*/\1/p'); ZIEL=$(echo "$LOC" | sed -E 's/#.*//; s/\?.*//')
echo "$L start: $CODE -> ${ZIEL} tokenlen=${#TOK} query=$(echo "$LOC" | grep -c '?')"
[ -z "$ZIEL" ] && exit 1
case "$ZIEL" in http*) U=$ZIEL;; *) U=$B$ZIEL;; esac
curl -sS -o /tmp/lp_$L.html --max-time 60 -w "$L seite http=%{http_code} bytes=%{size_download} total=%{time_total}\n" "$U"
grep -oE '(src|href)="[^"]+\.(js|css|mjs)[^"]*"' /tmp/lp_$L.html | sed -E 's/^(src|href)="//; s/"$//' | sort -u | head -12 > /tmp/lp_$L.assets
N=0; OK=0; while read -r a; do case "$a" in http*) AU=$a;; /*) AU=$A$a;; *) AU=$(dirname "$U/x")/$a;; esac; c=$(curl -sS -o /dev/null --max-time 60 -w '%{http_code}' "$AU"); N=$((N+1)); [ "$c" = 200 ] && OK=$((OK+1)); done < /tmp/lp_$L.assets
echo "$L assets: $OK/$N mit 200"
[ "$ART" = legacy ] && exit 0
g(){ curl -sS -o /tmp/lp_$L_$1.bin --max-time 180 -H "X-Gravuru-Shop-Session: $TOK" -H "Origin: $A" -w "$L $1 http=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} bytes=%{size_download}\n" "$A/api/shop-entry/$2"; }
g modell model; g galerie design-gallery; g seite2 'design-gallery?page=2'; g suche 'design-gallery?q=herz'
python3 - "$L" <<'PY'
import json,sys
L=sys.argv[1]
for n in ('galerie','seite2','suche'):
    try:
        d=json.load(open(f'/tmp/lp_{n}.bin'))
        k=d.get('cards') or d.get('items') or d.get('designs') or []
        print(L,n,'schluessel',sorted(d.keys())[:8],'karten',len(k),'gesamt',d.get('total',d.get('count')))
    except Exception as e: print(L,n,'nicht lesbar',type(e).__name__)
PY
