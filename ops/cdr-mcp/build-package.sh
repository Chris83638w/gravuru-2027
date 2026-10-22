#!/usr/bin/env bash
# Baut das Plesk-Paket für den CDR-MCP-Server: App + portables libcdr (cdr2raw mit allen Bibliotheken
# und eigenem Loader, läuft damit auf jedem x86_64-Linux unabhängig von der Distribution).
# Voraussetzung auf der Baumaschine: Ubuntu/Debian mit `apt-get install libcdr-tools`.
#   ops/cdr-mcp/build-package.sh [ausgabeordner]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/deliverables/cdr-mcp}"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/gravuru-cdr-mcp"
mkdir -p "$PKG/vendor/libcdr/bin" "$PKG/vendor/libcdr/lib" "$PKG/vendor/libcdr/licenses" "$PKG/public"

cp "$ROOT/app/cdr-mcp/server.mjs" "$ROOT/app/cdr-mcp/source.mjs" "$ROOT/app/cdr-mcp/bridge.mjs" "$ROOT/app/cdr-mcp/cdr_engine.py" "$ROOT/app/cdr-mcp/app.cjs" "$ROOT/app/cdr-mcp/README.md" "$PKG/"
printf '{\n  "name": "gravuru-cdr-mcp",\n  "private": true,\n  "type": "commonjs",\n  "engines": {"node": ">=22"},\n  "scripts": {"start": "node app.cjs", "check": "node check.cjs"}\n}\n' > "$PKG/package.json"
cp "$ROOT/app/cdr-mcp/check.cjs" "$PKG/"
printf 'User-agent: *\nDisallow: /\n' > "$PKG/public/robots.txt"
cp "$ROOT/app/cdr-mcp/requirements.txt" "$PKG/"

BIN="$(command -v cdr2raw)"
cp "$BIN" "$PKG/vendor/libcdr/bin/cdr2raw"
LOADER=""
while read -r lib; do
  [ -f "$lib" ] || continue
  cp -L "$lib" "$PKG/vendor/libcdr/lib/"
  case "$(basename "$lib")" in ld-linux*) LOADER="$(basename "$lib")";; esac
done < <(ldd "$BIN" | awk '/=>/ {print $3} !/=>/ && /\// {print $1}')
[ -n "$LOADER" ] || { echo "Loader nicht gefunden" >&2; exit 1; }
cat > "$PKG/vendor/libcdr/cdr2raw" <<EOF
#!/bin/sh
# portables cdr2raw: eigener Loader + eigene Bibliotheken, nichts vom System
D="\$(cd "\$(dirname "\$0")" && pwd)"
exec "\$D/lib/$LOADER" --library-path "\$D/lib" "\$D/bin/cdr2raw" "\$@"
EOF
chmod 755 "$PKG/vendor/libcdr/cdr2raw" "$PKG/vendor/libcdr/bin/cdr2raw" "$PKG/vendor/libcdr/lib/$LOADER"
# Lizenzen der mitgelieferten Bibliotheken (MPL-2.0, LGPL, ICU, GPL-Ausnahme für libgcc/libstdc++)
for p in libcdr-0.1-1 libcdr-tools librevenge-0.0-0 liblcms2-2 zlib1g libicu74 libstdc++6 libgcc-s1 libc6; do
  [ -f "/usr/share/doc/$p/copyright" ] && cp "/usr/share/doc/$p/copyright" "$PKG/vendor/libcdr/licenses/$p.txt"
done
dpkg-query -W -f='${Package} ${Version}\n' libcdr-0.1-1 libcdr-tools librevenge-0.0-0 liblcms2-2 zlib1g libicu74 libstdc++6 libgcc-s1 libc6 > "$PKG/vendor/libcdr/VERSIONS.txt" 2>/dev/null || true

# Selbsttest des Bündels ohne Systembibliotheken
"$PKG/vendor/libcdr/cdr2raw" /dev/null >/dev/null 2>&1 || true
env -i "$PKG/vendor/libcdr/lib/$LOADER" --list --library-path "$PKG/vendor/libcdr/lib" "$PKG/vendor/libcdr/bin/cdr2raw" | grep -v "$PKG/vendor/libcdr/lib" | grep -v 'linux-vdso' && { echo "Bündel zieht noch Systembibliotheken" >&2; exit 1; } || true

COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unbekannt)"
( cd "$PKG" && find . -type f ! -name PACKAGE-MANIFEST.json ! -name PACKAGE-MANIFEST.sha256 -print0 | sort -z | xargs -0 sha256sum ) > "$PKG/PACKAGE-MANIFEST.sha256"
printf '{"package":"gravuru-cdr-mcp","sourceCommit":"%s","built":"%s"}\n' "$COMMIT" "$(date -u +%FT%TZ)" > "$PKG/PACKAGE-MANIFEST.json"
mkdir -p "$OUT"
ZIP="$OUT/gravuru-cdr-mcp-$(date +%Y%m%d)-$COMMIT.zip"
rm -f "$ZIP"; ( cd "$PKG" && zip -qr -X "$ZIP" . )
sha256sum "$ZIP" | awk '{print $1}' > "$ZIP.sha256"
echo "$ZIP ($(du -h "$ZIP" | cut -f1))"
