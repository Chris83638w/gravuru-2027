# Mobile Demo R6 – Sicherung und gezielte Korrekturen

## Auftrag und Grenze

Mikail, 07.11.2026: Ausführung in die Fußleiste; Foto-Symbol soll die Dateiauswahl
öffnen; Vergrößern eines Elements am oberen linken Rand ermöglichen; Schriftwahl
in der mobilen Texteingabe sofort sichtbar. Den sonst ausdrücklich gelobten
Aufbau erhalten. Nur getrennte Demo, kein Main-Merge, kein Kunden-Live/Shop.

## Sicherung VOR der Änderung

- Branch: `dev/mika-mobile-demo-20261107`, Draft PR #193.
- Ausgangscommit: `6886a8d3a201790decd13a8c504dbd542ff29e08`.
- Git-Archiv: `checkpoints/mobile-demo-r6-20261107/before-r6-6886a8d3.zip`
  relativ zum lokalen Workspace `lie` (außerhalb des Worktrees).
- SHA-256: `ed5e510b292e18067f0d98349a4b03c49ccd9d95e78d8ae9a605fbf1d0eefffd`.
- Dies ist eine Quellstand-Sicherung, keine Datenbank-/Shop-Sicherung.
- R5-Paket und öffentlicher R5-Link bleiben als vorheriger Prüfstand erhalten.
  Bei Veröffentlichung wird ausschließlich `/konfi-demo/mobil-20261107-r6/` neu
  hinzugefügt; das geprüfte Veröffentlichungswerkzeug sichert vorher privat die
  geschützten Hostdateien und vergleicht sämtliche bisherigen öffentlichen Dateien.

## Genau diese Änderungen

1. Fußleiste: Ausführung, Designs, Text, Motive, Foto, Warenkorb. Ausführung öffnet
   das bestehende Optionsmodul; keine Optionen oder Preise neu erfunden.
2. Foto: obere Abkürzung und unteres Foto-Symbol lösen im selben Klick den
   vorhandenen Dateidialog aus. Die untere Aktion öffnete in R5 nur das Panel;
   das konnte im Browser reproduziert werden. Native Rechte, Datei-/Preisprüfung
   und Vier-Dateien-Grenze bleiben zuständig. Bei erreichtem Limit bleiben
   vorhandene Bilder über das Panel zugänglich.
3. Textansicht: nur im schmalen Hochformat ohne Bildschirmtastatur wird leerer
   Vorschauabstand eingespart. 90px-Textfeld, 16px-Eingabeschrift und 44px-Tasten
   bleiben erhalten. Schriftwahl vollständig sichtbar bei 390×708 und 360×640.
4. Demo-Eckengröße: native Randplatzierung vor positionsabhängigem Text-Autofit.
   So wird das gerade vergrößerte Textelement nicht sofort wieder verkleinert.
   Die ursprüngliche Größenberechnung, Konturgrenze, Originaldaten, Masken und
   Undo bleiben erhalten. Keine native Engine-Datei geändert.

Der neue Adapter wird mit seinen nativen relativen Modulimporten ins Demopaket
aufgenommen. Ein dabei im Browser entdeckter Fehler des Paket-URL-Umschreibens
ist gezielt korrigiert: `../../platform/...` bleibt relativ; nur echte Root-URLs
erhalten das Demo-Präfix. Die CSS-Regel für verborgene Footer-Werkzeuge gewinnt
jetzt zuverlässig gegen deren allgemeine Darstellung.

## Prüfung

- 50 automatisierte Tests: Adapter, Texteditor, 12 Rand-/Skalierungsfälle,
  Paket/URL-Isolation und additive Veröffentlichung. Prüfprotokoll bei den
  Demo-Reviews; keine Aussage über einen realen Handytest.
- Browser mit Touch-Simulation: Foto unten öffnet Dateidialog, PNG wird vollständig
  eingefügt (29,98 €), Löschen stellt 19,99 € wieder her.
- Ausführung öffnet native Größen/Befestigungen/Zubehör; 30×20 ergibt24,99 €,
  Rückkehr22×14 ergibt19,99 €.
- „Murmel“ links oben: Eckgriff vergrößert Schrift36→59, ein Undo stellt36 wieder her.
- Schriftwahl bei360×640: Unterkante539, Preisleiste beginnt550 (11px Abstand).
- Tastatur-Simulation390×430: Eingabefeld269,5–360,5, Fußleiste ab382, 16px Schrift.
- Desktop1440×900: sechs Footeraktionen in derselben Zeile, Optionen weiter
  im bestehenden rechten Bereich. Physisches Android/iOS noch durch Mikail prüfen.

Veröffentlichungsnachweise und endgültiger Link werden nach Hostprüfung ergänzt.
Die unveränderten Anschluss-/Galerieentscheidungen stehen weiterhin in
`2026-11-07-mika-gesamtstand-mobile-demo-und-anbindung.md`.
