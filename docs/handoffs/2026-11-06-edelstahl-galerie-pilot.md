# Edelstahlpilot: native Galerieübernahme und sichere Wiederlieferung

Auftrag Chris, 06.11.2026: alle Materialien in einer nach Material/Thema sortierten Galerie; zunächst normale Edelstahl-Türschilder und Rohlinge. Drei Karten nebeneinander, nur die Konfi-Fassung; direkt verschieben/speichern, Kommentare und Freigaben behalten. Claude liefert automatisiert, Astra übernimmt die Galerie, Mika den vollständigen Kunden-Konfi mit Rückspeicherung. [Zentraler Mika-Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683765158).

## Quellen und verbindliche Regeln

- Chris, aktueller Chat: Originale aus der neuen Struktur 1:1, dokumentierte Ersatzschriften erlaubt; Material-/Themensortierung, drei Karten, keine manuelle Anlage. Seine vollständige Unterkategorienliste folgt. Keine erfundene Sollmenge.
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) und Lieferform 2: getrennte editierbare Texte/Motive/Fotofelder, stabile Original-IDs, Originalherkunft. Rohlinge sind Geometrien, keine erfundenen Textdesigns.
- Katalog PR #183, Lieferung `5e0c3f151bbbb9cdae08e0562561014f727b40fe`, Quellbasis `3c6051fbbc7904969948950fae12cae2ae663f30`, Verzeichnis `auftraege/2026-11-06-gesamtuebergabe-designs-rohlinge`.
- Maße, Kontur, Preise und Befestigungen stammen aus `familien/edelstahl/steel-door-signs.json`; Themen aus der Linie, Schriftersatz aus `schriften/ersatz-tuerschilder.json`. Alle verwendeten Quellen sind zusätzlich gegen die Git-Blobs der Quellbasis, des im Bericht genannten Zwischenstands und des Lieferstands geprüft.
- Historische Katalogfreigaben sind nur `sourceApproval`. Neue Galerie-Bestätigungen erteilt Chris; alle Vorlagen bleiben unveröffentlicht und nicht bestellbar.

## Ergebnis und Datenweg

`prepare-steel-review-pilot.mjs` liest das Referenzmanifest, prüft 500 Dateien und 101 Design-/Rohlingversionen, konvertiert drei Schriftdateien und verwendet die bestehenden nativen Katalog-/Familienkonverter. 28 Originale mit 56 Texten und 14 Motiven werden zu 146 passenden Formatfassungen in 73 Festformatprodukten. Keine Fotoobjekte im Edelstahlpilot. Proportionales `contain:true` entspricht dem vorhandenen Zielrenderer; Texte werden nicht neu umgebrochen, Motive nicht verzerrt. Original-SVG/JSON bleiben bytegleich im Paket. Die neutrale native Edelstahltextur ist eingebettet; 73 WebP-Rohlinge sind gesondert zugeordnet.

Neue Hülle: `gravuru-design-original-review/v1`; alte Schieferpakete bleiben lesbar. Explizite `target.productKey` und `target.nativeDesignId` erhalten die Zuordnung auch bei Original-IDs mit Komma. Material, tatsächliche Abmessungen, Quellidentität und native Designs bleiben geprüft. Bestehende Schiefer-Freigabeschlüssel bleiben byteidentisch.

`extend-design-review.mjs` erweitert ausschließlich eine getrennte, offline verwendete Prüfablage. Alte Produktköpfe werden nie mit Katalogbaselines überschrieben. Neue Produkte werden atomar importiert, das Mapping zuletzt atomar ersetzt. Wiederlieferung vergleicht den vollständigen ursprünglichen Hashindex und die tatsächliche Existenz der gemappten Produkte; identische Lieferung ist ein No-op, geänderte IDs/Quellen sind Konflikte. Ein veränderter Font mit unverändertem Manifest kann nicht als identische Lieferung durchgehen.

Galerie: Material und Themen kombinierbar, eine Karte je Original auch bei mehreren Themen, bei Edelstahl kleinste tatsächliche Fläche als Startformat. Rohlinge separat nach Material/Form. Dokumentierte fehlende Lieferproben stehen an den betroffenen Karten. Gültige Rücksprunganker haben Vorrang vor alten Scrollpositionen; ohne gültigen Anker bleibt die bisherige Position erhalten.

## Ausgeführte Prüfung

- 79 gezielte Node-Tests: 33 Import/Paket/Material/HTTP-Tests, 42 bestehende Freigabe/Übersicht/Inline/Galerie-Regressionen, 4 Rücksprungtests. Keine Skips im realen Pilotpakettest.
- 11 SQLite-Snapshot-Tests, einschließlich beider Paketschemas und Freigabehistorie.
- Isolierter echter Import: 73 neue Produkte, 28 neue Originale. Gesamt 108 Produkte, 353 Originale, 261 bearbeitbare Originale, 523 native Ziele, 73 separate Rohlinge. 624 Prüfeinträge inklusive 101 weiterhin offener alter Quellen.
- Alle 35 alten Produktköpfe, 41 Altrevisionen und 35 alte Mappingzeilen unverändert; Kommentar-, Freigabe- und Profildateihashes identisch.
- Alle 146 Stahlziele mit echtem nativem SVG und gültigem Freigabefingerprint. Komma-ID und TO15×8 bei 150×80 ausdrücklich geprüft.
- Ausschließlich in der Testkopie: Text von `TRE-V2A-8x3,5-D66` um 1 mm verschoben, Revision 1→2, nach erneutem Öffnen identisch. Zwei synthetische Freigaben: betroffene Vorlage wird geändert, Partnerdesign derselben Produktgruppe bleibt bestätigt.
- Danach identische Wiederlieferung: 0 Neuanlagen, kein neuer Ausgabeordner, alle 108 Köpfe und 115 Revisionen inklusive Teständerung sowie Kommentare/Freigaben erhalten. [Import-/Erhaltungsnachweis](../reviews/2026-11-06-edelstahl-pilot/import-proof.json).
- Echte HTML-Ausgabe mit realem Mapping: 28 Stahlkarten, 73 Rohlingkarten, 146 Ziele; sechs Themenfilter ohne doppelte Originalkarten, alle 28 Standardformate nach tatsächlicher Fläche. Alle 325 Schieferkarten bei identischen Testzuständen bytegleich. [UI-Nachweis](../reviews/2026-11-06-edelstahl-pilot/ui-contract-proof.json).
- Chrome auf der getrennten Kopie: drei Stahlkarten, geladene Materialansichten, `TAE-V2A-8x5-D3` direkt geöffnet, Text per Pfeiltaste um 1 mm verschoben, „Gespeichert · Stand 2“, neu geladen und wieder geöffnet. Anschließend separate Rohlingansicht/Form Rund mit fünf Rohlingen geprüft. Diese zusätzliche Browseränderung folgt zeitlich auf den oben dokumentierten Wiederimporttest. [Inline-Speichern](../reviews/2026-11-06-edelstahl-pilot/inline-saved.png), [Rohlinge](../reviews/2026-11-06-edelstahl-pilot/rohlinge.png).

Windows verweigerte anfangs atomare Dateiumbenennungen und Test-Unterordner im eingeschränkten Prozess. Die betreffenden Tests liefen danach in separaten temporären Testdaten erfolgreich. Der lokale Browserprüfserver brauchte ebenfalls einen zugänglichen lokalen Prozess. Keine Schutzregel, kein Anwendungstest und keine Hashprüfung abgeschaltet.

## Reproduzieren

Quellcheckout auf den genannten Liefercommit setzen; Git-Textkonvertierung darf die Quellbytes nicht verändern. Bei Windows zunächst die Referenzdateien bytegenau aus den Git-Blobs extrahieren. Keine Katalogdatei inhaltlich korrigieren.

```text
node scripts/prepare-steel-review-pilot.mjs --katalog <separate-source-checkout> --out <new-steel-package>
node scripts/extend-design-review.mjs --base <current-private-gallery> --addon <new-steel-package> --data <offline-private-data-copy> --gallery-out <new-combined-gallery>
node scripts/serve-slate-review.mjs --data <offline-private-data-copy> --gallery <new-combined-gallery> --port 9002
```

Die genaue CLI des Vorbereiters ist im Skript hinterlegt. Für Fontkonvertierung benötigt er die vorhandene Python-Umgebung mit FontTools. Private Paket-/Testdaten stehen außerhalb Git. Vor jedem Hostimport einen frischen Snapshot der tatsächlichen Hostdaten erstellen; **niemals diese bearbeitete Testdatenkopie hochladen**. Wiederholung verwendet die neue kombinierte Galerie als `--base`; bestehendes Ausgabeverzeichnis wird nicht überschrieben.

## Offene Grenzen und nächste Schritte

1. [Claude-Korrekturen](https://github.com/Chris83638w/gravuru-katalog./pull/183#issuecomment-6683532442): README-Hashindex veraltet; B02S-Lieferprobe der kleinsten TO15×8-D1/D3 fehlt. Der bekannte README-Fall wird nur für exakt die beiden geprüften Hashes als Dokumentationsfehler berichtet; keine Daten-/Assetausnahme. Andere Hashfehler brechen ab. 502 von 503 Indexeinträgen stimmen, sämtliche 500 Datenreferenzen stimmen.
2. Historischer Größenkey `GR-ES-OV-300X159P9-T15` hat in Familie, Manifest und Kontur tatsächlich 300×160 mm. Immer Quellmaße, niemals aus dem Key abgeleitete Werte verwenden. Rund-Herkunftsverweise und alte Reihenindizes bleiben dokumentiert offen.
3. **Kein Edelstahl-Hostimport in diesem Paket.** Die private Online-Galerie bleibt beim bisherigen Schieferstand. Vor Aktivierung: neues Laufzeitpaket, frischer Hostsnapshot, additiver Import auf dessen getrennte Kopie, vollständiger Erhaltungsnachweis und private Site-19-Prüfung. Nur der neue Commit enthält die materialfähige Schema-/Runtime-Allowlist.
4. Mika: vollständiger Kundenkonfi mit Rückspeicherung der ausgewählten nativen Vorlage, Fotos/Rezepte und Rechte. Bestehendes „Für die Werkstattprüfung sichern“ erzeugt einen getrennten Prüfstand. Der Editor-Rücksprung für Komma-Original-IDs muss Original-ID statt abgeschnittenem nativen Slug verwenden. [Vollständiger Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683765158).
5. Chris' Unterkategorienliste fehlt noch; kein Vollständigkeitsversprechen. 73 Pilotrohlinge sind nicht der vollständige Edelstahlkatalog.
6. [Claude kann weitere Stapel nach dem geprüften Schema liefern](https://github.com/Chris83638w/gravuru-katalog./pull/183#issuecomment-6684007254). Dies ist eine technische Bestätigung, keine Bild-/Produktions-/Shopfreigabe.

Eigener Aufgabenbranch auf PR #180; kein main-Merge, keine Shopify-Änderung, keine neuen echten Nutzerfreigaben. Der andere Astra-1-Chat koordiniert main; Kunden-Live bleibt an Chris' ausdrücklichen Satz gebunden.
