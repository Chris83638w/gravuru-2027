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
- Ausführung öffnet native Größen/Befestigungen/Zubehör; 30×20 ergibt 24,99 €,
  Rückkehr zu 22×14 ergibt 19,99 €.
- „Murmel“ links oben: Eckgriff vergrößert Schrift 36→59, ein Undo stellt 36 wieder her.
- Schriftwahl bei 360×640: Unterkante 539, Preisleiste beginnt bei 550 (11px Abstand).
- Tastatur-Simulation 390×430: Eingabefeld 269,5–360,5, Fußleiste ab 382, 16px Schrift.
- Desktop 1440×900: sechs Footeraktionen in derselben Zeile, Optionen weiter
  im bestehenden rechten Bereich. Physisches Android/iOS noch durch Mikail prüfen.

## Veröffentlicht und zurückgeprüft

- [R6 – 22×14 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r6/22x14.html?fresh=1)
- [R6 – 30×20 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r6/30x20.html?fresh=1)
- Paket-Quellcommit: `cb7edcebd672744ede652aa697e2ba3e4e65e7ed`.
- Manifest-SHA256: `3c5a76ce4b6cdee08db310a9ae52090ef3f7a5cee8005efb3d26b9d48a78fd94`.
- ZIP: 83.330.264 Bytes, SHA256 `6264ab1efb30d71ff87f236c1520c17c8a904a3c57ae3169b2e90ff3a9392dfe`.
- Nur neuer R6-Ordner. Alle **4067 vorherigen öffentlichen Dateien** sowie die
  vier geschützten Originaldateien nachher hashgleich. Kein Neustart, Routerwechsel,
  Shopify-, Galerie- oder Datenbankschreiben.
- Vorherige Originaldateien und Inventar privat gesichert unter
  `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r6-before-publication`.
- Neun öffentliche HTTP-Stichproben: 200, gzip, no-store/noindex und passende
  Manifest-Hashes. Keine Aussage über Handy-Ladezeiten.
- Öffentliche Browserprüfung bei 390×708: Schriftwahl vollständig sichtbar
  (542,31–586,31px, Preisleiste ab 618px), Foto-Fußleistensymbol öffnet Dateiauswahl,
  Testbild eingefügt mit 29,98 €, gelöscht zurück auf 19,99 €; Ausführung zeigt
  die vorhandenen Größen, Befestigungen und Zubehör. Screenshots und JSON-Belege
  unter [Demo-Reviews](../reviews/2026-11-07-mobile-demo/).

Die lokalen Eck-/Tastaturprüfungen stammen aus C3; alle 2006 Nutzdateien sind
hashgleich mit dem Release. Die öffentlichen Nachprüfungen sind oben getrennt
benannt. Physischer Android-/iOS-Test bleibt offen. Kein echter Checkout.

Die unveränderten Anschluss-/Galerieentscheidungen stehen weiterhin in
`2026-11-07-mika-gesamtstand-mobile-demo-und-anbindung.md`.
