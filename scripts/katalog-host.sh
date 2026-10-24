#!/bin/bash
# Katalog auf dem Händlerhost (Paket D, Chris 24.10.2026: Option A – Dashboard-Änderungen gehen per eigenem
# Schreibschlüssel nur für das Katalog-Repo zurück nach GitHub, auf den Branch host/werkstatt; Claude prüft und merged).
#
# Aufbau:  Plesk-Git zieht GitHub → $H/git/gravuru-katalog.git (Nur-Lese-Schlüssel „katalog“, Bereitstellung aus).
#          Arbeitskopie $H/private/gravuru-katalog = normaler git-Klon dieses Plesk-Repos; die Werkstatt liest und
#          schreibt hier (GRAVURU_KATALOG). Zurück nach GitHub nur über `save` mit dem Schlüssel in $H/private/katalog-push.
#
#   katalog-host.sh init     einmalig: Schreibschlüssel erzeugen (falls fehlt), Arbeitskopie klonen, öffentlichen Schlüssel zeigen
#   katalog-host.sh status   Stand + geänderte Dateien (Dashboard-Änderungen)
#   katalog-host.sh save     Änderungen committen und nach GitHub host/werkstatt pushen (kein Force, nie auf main)
#   katalog-host.sh update   GitHub-main holen und vorspulen – nur wenn nichts ungesichert ist (sonst erst save)
#
# Nach init läuft der Abgleich nur noch über den Remote „github“ mit dem eigenen Schlüssel (der Deploy-Key mit
# Schreibrecht kann auch lesen). Das Plesk-Repo dient nur als schnelle Klonquelle: Plesk holt es mit einem eigenen
# Schlüssel, ein normales `git fetch` im Benutzer-Shell würde den Schlüssel des Code-Repos nehmen und scheitern.
# Nach einem Merge von host/werkstatt bitte mit Merge-Commit (nicht squash/rebase), damit `update` vorspulen kann.
set -euo pipefail
H=${GRAVURU_HOST_HOME:-/var/www/vhosts/gravuru-designwerkstatt.de}
BARE=$H/git/gravuru-katalog.git
WT=$H/private/gravuru-katalog
KEYDIR=$H/private/katalog-push
KEY=$KEYDIR/id_ed25519
GITHUB=${GRAVURU_KATALOG_GITHUB:-git@github.com:Chris83638w/gravuru-katalog..git}  # Tests: lokales Ziel setzen, nie GitHub
BRANCH=host/werkstatt
push_ssh="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KEYDIR/known_hosts"
g(){ git -C "$WT" "$@"; }
gh_fetch(){ GIT_SSH_COMMAND="$push_ssh" g fetch -q github main; }

case "${1:-status}" in
 init)
  [ -d "$BARE" ] || { echo "Plesk-Repo fehlt: $BARE"; exit 1; }
  if [ -e "$WT/.git" ]; then echo "Arbeitskopie existiert schon: $WT"; else
   if [ -d "$WT" ] && [ -n "$(ls -A "$WT")" ]; then echo "Abbruch: $WT ist nicht leer und kein git-Klon."; exit 1; fi
   git clone -q "$BARE" "$WT"
  fi
  g config user.name "Werkstatt app-2027 (Dashboard)"
  g config user.email "werkstatt@app-2027.gravuru-designwerkstatt.de"
  g config core.autocrlf false
  g remote get-url github >/dev/null 2>&1 || g remote add github "$GITHUB"
  mkdir -p "$KEYDIR"; chmod 700 "$KEYDIR"
  [ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -C "app-2027 katalog push" -f "$KEY"
  echo "Öffentlicher Schlüssel (GitHub → gravuru-katalog. → Deploy keys, Schreibrecht):"; cat "$KEY.pub"
  ssh-keygen -lf "$KEY.pub"
  g log --oneline -1
  ;;
 status)
  g log --oneline -1
  n=$(g status --porcelain | wc -l); echo "Ungesicherte Änderungen: $n"; g status --short | head -50
  if g rev-parse -q --verify github/main >/dev/null; then
   echo "Commits über GitHub-main (Stand letzter Abgleich): $(g rev-list --count github/main..HEAD)"; fi
  ;;
 save)
  if [ -z "$(g status --porcelain)" ]; then echo "Nichts zu sichern."; else
   g add -A
   files=$(g diff --cached --name-only | wc -l)
   g commit -q -m "Dashboard-Änderungen vom Händlerhost ($files Dateien, $(date -u +%Y-%m-%dT%H:%MZ))" -m "Gesichert mit scripts/katalog-host.sh save; Protokoll in den _aenderungen.jsonl der betroffenen Ordner."
  fi
  # Alles, was lokal über GitHub-main hinausgeht, nach host/werkstatt (vorspulen, kein Force).
  gh_fetch
  if [ -n "$(g log --oneline github/main..HEAD)" ]; then
   GIT_SSH_COMMAND="$push_ssh" g push -q github "HEAD:refs/heads/$BRANCH"
   echo "Gepusht nach $BRANCH:"; g log --oneline github/main..HEAD | head -20
  else echo "Kein Commit über main hinaus – nichts gepusht."; fi
  ;;
 update)
  if [ -n "$(g status --porcelain)" ]; then echo "Abbruch: ungesicherte Dashboard-Änderungen – erst 'save'."; g status --short | head -20; exit 1; fi
  gh_fetch
  g merge -q --ff-only github/main || { echo "Abbruch: kein Vorspulen möglich (host/werkstatt noch nicht gemerged?)."; exit 1; }
  g log --oneline -1
  ;;
 *) echo "Aufruf: $0 init|status|save|update"; exit 2;;
esac
