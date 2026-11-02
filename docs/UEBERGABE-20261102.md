# Übergabe 02.11.2026 – Neue Gestaltung + Sonderanfertigung zum Selbstgestalten (Issue 135)

Account: Claude als Operator. Branch `dev/manufaktur-20261102` in `gravuru-2027` (eigenständige Manufaktur-App, nicht mit `main` mischen).

## Stand
- **Quellstand gesichert:** Server-Sicherung `claude-quellstand-20261102.zip` (Plesk, `gravuru-manufaktur-app/`). Alle 13 Dateien des Manifests `20261030-1` SHA-256-identisch, 11 öffentliche Werkstatt-Dateien live identisch → kein Drift seit 30.10. Commit `baseline-20261030-1`.
- **Release `20261102-1`:** 41 Dateien, Manifest `docs/release-20261102-1-manifest.json` (je Datei `before`/`after`-Hash), Paket `manufaktur-release-20261102-1.tar.gz`.
- **Noch nicht live.** Veröffentlichung nur nach Freigabe durch Chris.

## Was neu ist
1. Design-System 2026-11 (Website + Konfigurator): Fraunces/Manrope lokal (OFL), Farben Tinte #15211c, Grün #1f6b50, Mint #98d1b8 aus dem Logo, dunkler Kopf mit Originallogo überall gleich.
2. Seiten: Startseite (Hero, vier Einstiege in den Konfigurator, Ablauf, Leistungen, Region, CTA), Übersichten, Detailseiten, Kontakt, Fußbereich. KI-Illustrationen tragen auf jeder Bildgröße ein Etikett „KI-Illustration“.
3. Konfigurator: Startauswahl mit vier Wegen (Gravur, Farbdruck, Zuschnitt, **Sonderanfertigung**), Reiter nicht mehr über dem Inhalt, Werkstatt-Ansichten im neuen Farbschema, Logo-Upload-Schaltfläche lesbar.
4. **Sonderanfertigung selbst gestalten** (`/konfigurator?bearbeitung=sonder`): Kunde wählt Material (Edelstahl, Stahl, Acrylglas, Glas, Stein, Leder, Papier/Pappe, Anderes, Noch unsicher), Bearbeitung (Gravur, Farbdruck, Zuschnitt, Acryl biegen), Materialbereitstellung, Form und Maße der Gestaltungsfläche (20–600 mm), Beschreibung → gestaltet mit demselben Editor → fragt mit Dateien an. In der Anfrage stehen alle Angaben (Material, Bereitstellung, Gestaltung, Zusammenfassung). Kein Mitarbeiterlink nötig; der Mitarbeiterlink-Ablauf bleibt unverändert (auch für Sonderanfertigungen geprüft).
   - Quellen der Auswahl: Leistungsseiten (Materialien/Bearbeitungen) und bisheriges Anfrageformular (Bereitstellung, Dateien); Größenlimit aus `plate-geometry`. Keine Preise, keine neuen Sperren.
   - Keine Datenbankänderung (Konfiguration liegt im bestehenden JSON-Feld der Anfrage).
5. Texte (CMS) auf Selbstgestaltung umgestellt über `scripts/apply-customer-copy-20261102.mjs` (prüft vorher, ändert nur unveränderte Felder, legt Sicherung an).

## Prüfungen (lokal, Nachbau mit gespiegelten öffentlichen Inhalten)
- Produktionsbuild inkl. TypeScript bestanden (`scripts/build-production.cjs`).
- Bestehende Prüfskripte bestanden: check-configurator, check-acrylic-thickness, check-print-backing, check-acrylic-default, check-spacers, check-address, check-enquiry-address, check-doorbell-models. Neu: `check-custom-production.mjs` bestanden.
- Browserabläufe (Playwright): Sonderanfertigung Desktop + Handy 390 px bis zur gespeicherten Anfrage; Gravur-Ablauf Acryl 400 × 200 mit „4 → 400“-Eingabe ohne Fokusverlust bis zur gespeicherten Anfrage; Kundenlink (gespeichert/gelesen) für Sonderanfertigung.
- **Nicht geprüft:** echtes iPhone/Android, Barrierefreiheits-Abnahme, Lighthouse/Core Web Vitals, Mailversand live.

## Offen / nächster Schritt
- Freigabe Chris → Veröffentlichung (siehe unten), danach Liveprüfung und Screenshots.
- Handy: Beim Text-/Motiv-Reiter liegt die Plattenvorschau oberhalb (Knopf „Entwurf ansehen ↑“). Verbesserung (z. B. mitlaufende Mini-Vorschau) erst nach echtem Gerätetest entscheiden.
- Separates Repository `gravuru-manufaktur` anlegen und diesen Branch dorthin umziehen (Anlage braucht Chris’ Freigabe).
- Beobachtung: In automatisierten Chromium-Läufen lieferte der Server für `/_next/static/chunks/app/(site)/%5Bsection%5D/…` gelegentlich 404 (Seiten zeigten dann „This page couldn’t load“). In Chris’ echtem Chrome lud dieselbe Datei mit 200. Nach dem Release erneut prüfen.

## Veröffentlichung (nach Freigabe)
1. Private Sicherung (`scripts/backup-production.mjs`) und Ausgangshashes gegen `before` im Manifest prüfen.
2. Paket nach `gravuru-manufaktur-app/` entpacken (nur die 41 Dateien; keine .env, DB, Medien).
3. Build in separatem Verzeichnis: `NEXT_BUILD_DIR=.next-20261102 node scripts/build-production.cjs`, bei Erfolg `.next` tauschen (alte statische Hash-Dateien behalten).
4. Neustart: `touch tmp/restart.txt`.
5. Texte: `node --env-file=.env scripts/apply-customer-copy-20261102.mjs` (Prüfung) → `… --apply`.
6. Liveprüfung: Startseite, Konfigurator (4 Wege), Sonderanfertigung bis Prüfschritt, Kontakt; Hashes der öffentlichen Dateien.
7. Rollback: Vorher-Dateien aus `baseline-20261030-1` (Git) bzw. Sicherung zurück, alten `.next` zurück, Neustart; Texte über die automatisch angelegte Sicherung in `work/customer-copy-backups/`.
