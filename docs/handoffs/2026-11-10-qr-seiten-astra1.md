# Übergabe 10.11.2026: QR-Seiten (Andenken + Geschenkideen) an Astra 1

Von: Claude als Operator · An: Astra 1 (Codex) · Basis: `main` 76269aa · Branch für die Umsetzung: `dev/qr-seiten-20261110`

## Zweck

Ein QR-Code auf dem Produkt führt zu einer Online-Seite mit Fotos und Text. Zwei Typen: `erinnerung` (Andenken) und `geschenk` (Geschenkideen). Der Auftrag stammt von Chris (10.11.2026) und ist gewollt als **eigener Dienst**, damit Konfi, Preise und Shop unberührt bleiben.

## Verbindlich lesen (in dieser Reihenfolge)

1. `AGENTS.md` (Prio-Konfi-Regel, Produktworkflow, Fachlogik vor dem Programmieren)
2. [docs/plans/QR-SEITEN-20261110.md](../plans/QR-SEITEN-20261110.md): der Bauplan mit Fachregeln samt Quelle, Technik und Paketschnitt
3. `ENTSCHEIDUNGEN.md` (Bei Widerspruch gilt der neueste Eintrag)

Der Design-Master gilt für Gravur- und Druckdesigns auf Platten, nicht für die Aufmachung dieser Web-Seiten. Für deren Optik gilt: neutrales Grundgerüst, keine alten `--gv-`-Tokens, nicht Poppins/Inter (Chris 25.10.2026 im Chat, noch nicht im Entscheidungsregister), finale Farben und Schriften folgen mit dem neuen Design System.

## Stand

- Fertig: Bauplan und diese Übergabe (nur Dokumentation).
- **Nicht** begonnen: jede Zeile Code. Es gibt keinen Dienst, keinen Test, keinen Host.
- Nichts an Konfi, Shopify, Preisen, Server oder bestehenden Produktbindungen geändert.

## Grenzen (nicht verhandelbar)

- Nur neue Dateien unter `app/seiten-dienst/` (und Tests daneben). Keine Änderung an `app/configurator/`, `app/workshop/`, `package.json`-Skripten außer einem neuen Eintrag für den eigenen Testlauf.
- Regeln ohne Quelle (siehe Plan Abschnitt 3, „Offen“) **nicht** als Kundenregel einbauen, sondern als Konfiguration oder melden und rückfragen.
- Keine neue Abhängigkeit außer der einen QR-Bibliothek; Wahl begründen. Fehlt `node:sqlite` auf dem Zielhost: melden.
- Keine Datenbanken, Uploads, Tokens oder Kundendaten im Repo. Keine Veröffentlichung, kein Deployment, kein Shopify-Zugriff.
- Ein Paket nach dem anderen, in dieser Reihenfolge: P1 → P2 → (Stopp, Claude holt Chris-Entscheidungen) → P3 → P4.

## Genau nächster Schritt

**P1:** Dienstgerüst `app/seiten-dienst/` mit Datenmodell (`seiten`, `fotos`, `ereignisse`), Code-Vergabe (10 Zeichen, Crockford-Base32 ohne verwechselbare Zeichen, Kollisionsprüfung), Bearbeiten-Token (≥ 128 Bit, nur als Hash gespeichert), `qrSvg(url)` und `config.mjs` mit den technischen Startwerten. Gezielte Tests laufen mit `node --test app/seiten-dienst/*.test.mjs`. Danach `STATUS.md` knapp fortschreiben und das Ergebnis in dieser Datei unter „Ergebnis P1“ ergänzen (Commit, Prüfungen, offene Grenzen).

## Freigaben von Chris, die noch fehlen

Gesammelt im Issue „Entscheidung 10.11.2026: QR-Seiten …“ (Label `entscheidung`): Domain, Laufzeit, Aufpreis, Pilotprodukte, Rechtstexte. **P1 und P2 brauchen keine davon.** Für P3 und alles danach werden Domain und Laufzeit gebraucht. Eine Aktivierung im Shop braucht zusätzlich die Bestätigung nach dem Produktworkflow vom 09.11.2026 und liegt bei Mika/Konfi.

## Ergebnis P1

_(von Astra 1 auszufüllen)_
