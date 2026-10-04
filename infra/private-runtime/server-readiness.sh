#!/usr/bin/env bash
# Read-only prerequisite inventory for the existing Gravuru server.
# Run ONLY on an explicitly authorized server, without sudo.
# No environment dump, credential files, databases, installation or writes.
set -u
printf '%s\n' 'Gravuru server prerequisites (read-only; this does not certify persistence)'
printf 'UTC: '; date -u '+%Y-%m-%dT%H:%M:%SZ'
printf 'OS: '; uname -s
printf 'Architecture: '; uname -m
if command -v node >/dev/null 2>&1; then
  node -p 'JSON.stringify({node:process.version,node24OrNewer:Number(process.versions.node.split(".")[0])>=24})'
  node -e 'try { require("node:sqlite"); console.log("node:sqlite available") } catch { console.log("node:sqlite unavailable"); process.exitCode=1 }' 2>/dev/null
else
  printf '%s\n' 'Node: unavailable'
fi
if command -v python3 >/dev/null 2>&1; then
  PYTHONDONTWRITEBYTECODE=1 python3 -B - <<'PY'
import sys, importlib.metadata
print('Python:', '.'.join(map(str, sys.version_info[:3])))
try:
    version = importlib.metadata.version('PyMuPDF')
    print('PyMuPDF:', version, 'matches required 1.28.2:', version == '1.28.2')
except importlib.metadata.PackageNotFoundError:
    print('PyMuPDF: unavailable in this Python environment')
PY
else
  printf '%s\n' 'Python3: unavailable'
fi
for executable in age systemctl nginx; do
  if command -v "$executable" >/dev/null 2>&1; then
    printf '%s: command available (no authority or configuration implied)\n' "$executable"
  else
    printf '%s: command unavailable\n' "$executable"
  fi
done
backup_parent=/gravuru-manufaktur-app
if [ -d "$backup_parent" ]; then
  printf '%s\n' 'Documented backup parent exists; no contents read.'
  stat -c 'Parent mode: %a' -- "$backup_parent"
  [ ! -r "$backup_parent" ] || printf '%s\n' 'Parent readable by current process.'
  [ ! -w "$backup_parent" ] || printf '%s\n' 'Parent writable by current process (no write performed).'
  df -Pk -- "$backup_parent" | awk 'NR==2 {print "Filesystem size/free KiB:", $2, $4}'
else
  printf '%s\n' 'Documented backup parent not visible in this login context.'
fi
printf '%s\n' 'Still requires operator verification: durable private path, private authentication for two users, service management, independent backup/restore, supported Cloud access. A successful inventory does not authorize deployment.'
