# Konkrete Root-Abnahme des integrierten Kundenpatches

Gesichert in [Draft PR220](https://github.com/Chris83638w/gravuru-2027/pull/220),
Produktionscommit `39e3e494f051247fc41655f20f1c4fa4566ea108`, gestapelt auf PR219.

Dieses Dokument ist eine Prüfanleitung, kein behaupteter Browser-/Live-Nachweis.
Eine produktive Profilzuweisung ist weiterhin nicht erfolgt und nicht Teil des
reinen Runtimepatches. Alle Tests zunächst auf getrenntem Prüfstand mit echten
gesicherten Quelldaten und isolierten Entwürfen/Profilen durchführen.

## 1. Integrität vor dem Start

- Zielbasis c7710dec / Kundenstand e9c36ce feststellen. Aktuelle Kundenwrapper,
  zwölf betroffene Quellen und Bundle sichern, keine aktive CSS ersetzen.
- Paket-SHA und Manifest gegen `package-receipt.json` prüfen. Danach
  `node verify.mjs --package`, `node verify.mjs --before <Prüfruntime>`.
  Jede Abweichung ist ein Konflikt, kein Anlass zum Überschreiben.
- Nur zwölf `files/`-Quellen übernehmen; `node verify.mjs --after <Prüfruntime>`.
  Im Prüfbaum den vorhandenen Build ausführen. Die Manifest-Schutzliste belegt
  69 Dateien zur Gitbasis; bekannte Live-CSS zusätzlich anhand tatsächlicher
  Vorherdateien unverändert prüfen.
- Falls Cacheänderungen inzwischen integriert wurden, deren zusätzliche
  `shop-entry`-/Galerieprüfungen mit den Modulguards fachlich zusammenführen,
  neu testen und neu pinnen; dieses Paket gilt dann nicht unverändert.

## 2. Ohne Profil: bestehender R15 muss identisch bleiben

Auf Desktop und mobilem Prüfviewport dasselbe Startdesign öffnen. Tabs,
rechte Werkzeugspalte, Checkout, zentrierte Aktionsgruppe, Produkt-Rückweg,
Plus-/Vorschausymbol, Vollansicht und deren freie Doppeltippfläche prüfen.
Ein kleines Motiv mehrfach auswählen/verschieben; Zoom, Rückgängig und
bestätigtes Zurücksetzen prüfen. Keine Daten zurücksetzen, um Sichtfehler zu verdecken.

Font-/Motivdialog öffnen; sichtbare Karten laden begrenzt nach. Erste drei
Designkarten und sechs zulässige Motive werden vorbereitet wie vor dem Patch.
Form/Größe/Befestigung wechseln, anderes passendes Design wählen. Keine
zusätzlichen Module oder unpassenden Designs dürfen erscheinen.

## 3. Isolierte Modulprofile: gleicher Konfi und dieselbe Bank

Beide tatsächlichen freigegebenen Stahlprofildefinitionen verwenden,
keine neue produktive ID/Zuordnung erfinden. Quelle r4-SHA
`2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`.

| Prüfstand | Erwartung |
|---|---|
| Edelstahl mit Logo | Foto fehlt, SVG-Logo vorhanden; Logo +12,99 EUR. |
| Edelstahl ohne Logo | Foto und Logo fehlen; direkter Upload-/Preis-/Speicheraufruf kann Logo nicht wieder freischalten. |
| Bestehende geeignete Fotovorlage | Foto nur bei vorhandener nativer Freigabe; Hochladen/Masken/Entfernen wie bisher. |
| Foto aus | Nur kompatible Vorlage ohne vorhandene Fotofelder zulassen. Inkompatibles Profil wird erklärt abgewiesen; Original nicht gelöscht. |
| Ungültiges/unvollständiges Profil | Fehler vor Gestaltung/Preis/Upload; kein stiller Fallback auf eingeschaltete Module. |

251 Designs, acht Formen, 80 Größen, 404 Optionen und Grundpreise müssen für
beide Stahlprofile gleich bleiben. Pflichttext darf nicht durch versteckte
Textbearbeitung ein unbestellbares Produkt erzeugen. Profilschalter sind
zusätzliche Grenzen, keine neuen Produktionsrechte.

## 4. Warenkorb und unveränderliche Altstände

Im isolierten Shop-/Prüfablauf kleine und große Größe, zwei unterschiedliche
Befestigungen, SVG-Logo hinzufügen/entfernen und Preis prüfen. Ein gültiges SVG
mit abweichenden Außenmaßen/ViewBox verwenden; gespeicherte v1-Ausgabe wieder
öffnen. Warenkorb-Bearbeiten muss R15 behalten und Größe, Befestigung, Design,
Texte und Logo wiederherstellen. Vorhandene Zeile aktualisieren statt duplizieren.

Alte profilfreie Entwürfe und gespeicherte V2-Zusatzpreisverträge weiter lesen.
Historische Bestell-/Prüfstandsrevisionen und Produktionsartefakte nicht schreiben.
Ein erfolgreicher Prüf-Warenkorb ist keine bezahlte Bestellung.

## 5. Erst danach: separater bestätigter PR214-Plan

Die Runtimefreigabe weist noch kein Profil zu. PR214 auf derselben privaten
Registry/Bibliothek und demselben Journal zunächst mit beiden Gates aus mounten.
Frischen lesenden Plan für ausdrücklich ausgewähltes Produkt und Profil zeigen:
Profil-ID/Revision, Quelle r4, aktueller Zielkopf, 251/404-Erhalt, Zusatzpreise,
konkrete Moduländerungen. Nutzer bestätigt diese Zuordnung. Aktivierung erst
danach durch Root mit frischem Backup und geprüftem Writer, nicht durch diesen
Agenten. Unterbrochene Vorgänge über Journal/Reconcile fortführen.

Nach einer Profilaktivierung keinen alten profilunkundigen Leser zurückrollen.
Fachliche Rücknahme als neue bestätigte Revision; alte Bestellungen erhalten.
