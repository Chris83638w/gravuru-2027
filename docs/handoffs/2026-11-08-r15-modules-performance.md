# Freigegebenen R15-Aufbau, sichtbares Nachladen und Modulschalter zusammenführen

## Gesicherter Stand und Grenze

Isolierter Branch `dev/mika-r15-modules-performance-20261108` auf
`c76e2a79f358bf0a38da45771745b7d76559bf3b` (PR216, einschließlich Queuekorrektur).
Darauf sind ausschließlich die zwölf Kunden-/Server-Moduldateien aus `9b3afc0`
und die Cross-Realm-Korrektur `b7f37874e41c56027ac8b76f952f0cb6050a2016`
übernommen. Es gab nur einen Dokumentkonflikt in STATUS; beide Codeüberschneidungen
in `ux.mjs` und `shop-entry.mjs` behalten die Performance- und Moduländerungen.

Kein Main-Merge, kein Server-/Shopify-Zugriff und keine Profilzuordnung durch
diesen Agenten. Die privaten Ausführungsschalter bleiben aus. Dieser Stand ist
eine vorbereitete gemeinsame Laufzeit, keine Behauptung einer Live-Aktivierung.

## Unverändert

- Freigegebene Demo, beide Vorschauwege, Touch-/Pointerbehandlung, Ansichtszoom,
  Zurücksetzen, Kundenaufbau und sämtliche CSS-Dateien sind byteidentisch zur Basis.
- Sichtbare Font-/Motivkarten laden mit höchstens zwei gleichzeitigen Abrufen;
  alle sichtbaren Karten werden abgearbeitet. Die begrenzte Warmup-Liste bleibt erhalten.
- Die echte r4-Quelle (SHA256
  `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`)
  bleibt unverändert: 251 Originaldesigns, acht Formen, 80 Größen und 404 native
  Größen-/Befestigungspreise für beide Logo-Profile. Kein Binding und keine
  historische Bestellung wurde durch diese Vorbereitung geschrieben.
- Ohne explizites Modulprofil gilt weiterhin die vorhandene native Produktfreigabe.
  Mit Profil gelten dieselben geprüften Modulschalter in Kundensicht und
  serverseitiger Entwurfs-/Preisprüfung. Ein deaktiviertes Modul erteilt keine
  zusätzlichen Produktionsrechte und entfernt keine Originaldesigns.

## Prüfungen

Build erfolgreich: 154 Module, 16 Styles; Bibliotheken bleiben 30 Schriftdateien
und 703 Motivdateien zum einzelnen Nachladen. Gezielt 274 Fälle in 24 Testdateien:
272 bestanden im ersten Lauf. Zwei Tests hatten veraltete Annahmen: das Reset-DOM-
Fixture fehlte `append()` aus dem bereits freigegebenen Basisstand; ein Quellcode-
Verdrahtungstest erwartete den Text-Handler ohne den neuen Modulguard. Nur diese
Tests wurden angepasst. Anschließend beide betroffenen Testdateien mit 19/19
Fällen grün. Damit sind sämtliche 274 unterschiedlichen Fälle erfolgreich
geprüft; es wurde keine unnötige komplette Wiederholung durchgeführt.

Enthalten: echte r4-Daten-/Preisgleichheit, native Modulrechte und Ablehnung
manipulierter Aufrufe, Cross-Realm-JSON/Abweisung fremder Prototypen, Logo-Upload,
Galerie-/Variantenwechsel, Warenkorb-/PNG-/R15-Rückweg, Mobile-Demo,
Touch-/Vorschau-/Resetlogik, sichtbare Ressourcen und begrenztes Vorladen.
Es handelt sich um lokale Tests, keinen Browser- oder Live-Nachweis dieses
kombinierten Standes. Vollständige lokale Logs liegen in
`outputs/r15-modules-performance-20261108/`.

## Paket und kontrollierte Wiederaufnahme

`scripts/package-r15-modules-performance.mjs` erzeugt ein explizites
Zwölf-Datei-Delta mit Vorhersicherungen, SHA256-Manifest und rein lesendem
Prüfer. Zielbasis ist c76e2a7; niemals das alte Modulpaket auf eine neue
Performance-Laufzeit kopieren. Ebenso niemals einen ganzen isolierten Build
über die laufende Kundenlaufzeit legen: bekannte abweichende Live-CSS bleibt
unberührt. Das Manifest belegt die unveränderten geschützten Dateien zur Basis.

1. Root gleicht aktive bzw. vorbereitete Zielbasis mit den zwölf Vorher-SHAs ab
   und sichert sie. `verify.mjs --before <runtime>` schreibt nichts.
2. Nur die zwölf `files/`-Quellen in die gesicherte separate Laufzeit übernehmen;
   `verify.mjs --after <runtime>` prüfen und dort den bestehenden Build ausführen.
3. Vor Freigabe Handy/PC prüfen: Touch erneut auswählen, beide Vorschau-Buttons,
   sichtbare Karten/Fontdialog, ohne Profil unveränderte R15-Sicht, mit isolierten
   Testprofilen Logo ein/aus, unveränderte Preise sowie Warenkorb und Bearbeiten.
4. Erst nach Root-Abnahme kontrolliert veröffentlichen. Eine konkrete produktive
   Profilzuweisung ist ein eigener bestätigter Schritt. Bestehende private
   Schreibschalter bleiben bis dahin ausgeschaltet.
5. Rücknahme: bisherige Laufzeit wieder wählen oder die zehn Vorherdateien aus
   `backup/` wiederherstellen und die zwei ausschließlich neu hinzugekommenen
   Moduldateien entfernen; ausschließlich den zuvor geprüften Zielpfad verwenden,
   erneut bauen. Keine Datenbank-/Shopify-Rücknahme nötig, da dieses Paket nichts
   daran ändert. Kundencache erst nach tatsächlichem Build mit neuem Bundle lösen.

Der getrennte produktive Schreibadapter bleibt Draft PR214 mit eigenen
Bestätigungs-, CAS-, Preis- und Wiederaufnahmeprüfungen; seine Gates sind nicht
Bestandteil einer automatischen Freischaltung dieses Kundenpakets.
