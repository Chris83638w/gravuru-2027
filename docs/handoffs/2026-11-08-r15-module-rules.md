# R15: gemeinsame Modulregeln ohne Layoutumbau

08.11.2026 · ausschließlich lokal vorbereitet. Kein Server-/Shopify-Schreibzugriff und keine neue Produktrevision durch diesen Auftrag.

## Ergebnis und verbindlicher Umfang

Der freigegebene R15-Konfigurator kann denselben versionierten Modulvertrag wie die private Verwaltung aus PR213 lesen. Ausführungen, Designs, Texte, Motive, Fotos, Logos und Farbwahl werden in der vorhandenen Oberfläche angeboten und zusätzlich beim Speichern und bei der Preisprüfung durchgesetzt. Ein Profil kann vorhandene native Fähigkeiten einschränken; es kann keine Edelstahl-Fotos oder Farbgravur freischalten. Vorhandene Designs werden nicht entfernt. Altprodukte ohne Modulprofil behalten ihre bisherigen Regeln.

Quelle der Fachregeln: Mikails ausdrücklicher Auftrag vom 08.11.2026, denselben Konfi über schaltbare Module für unterschiedliche Produktgruppen zu verwenden; bestätigte Edelstahlregeln: kein Foto, SVG-Logo 12,99 EUR, unveränderte Formen/Größen/Befestigungen. `ENTSCHEIDUNGEN.md` 1.1–1.4 beschreibt denselben gemeinsamen Kern. Zusätzliche Produktoptionen werden hier weder erfunden noch bestätigt.

Eigener Branch `dev/mika-r15-module-rules-20261108`, Prüfbasiskommit `16eda61`. Diese Basis kombiniert die bereits aktiven Korrekturen #204–#211; die aktive V1/V2-Warenkorbquelle und das Startmodell aus #205 wurden exakt übernommen. Referenz für die Modulregeln: PR213 `a71b3eb4bfdbb02a8d6b811c9f188fefcac72f06`.

Die zehn vorhandenen zu ändernden Quellen stimmen vor dem Patch mit den gespeicherten Live-Hashes überein; Root hat diese Pins während der Vorbereitung erneut am Server bestätigt (`outputs/r15-module-rules-20261108/live-pins-before.json`). Die beiden neuen Moduldateien fehlen dort erwartungsgemäß. Neun weitere aktive Quellen – Pointer, PNG, Präsentation/Vorschau, Cart und Varianten-Startmodell – sind im Paketmanifest als unverändert geschützt.

## Genau zwölf Runtime-Dateien

| Datei | Änderung |
|---|---|
| `variant-m/module-profile.mjs` (neu) | Vollständiger Profilvertrag und native Fähigkeitsgrenzen. |
| `variant-m/module-runtime.mjs` (neu) | Gemeinsame Reiter- und Entwurfsregeln. |
| `variant-m/contract.mjs` | Vorbereitung, Validierung, Quote und SVG-Logofreigabe lesen denselben Vertrag. |
| `variant-m/customer-rights.mjs` | Vorhandene Rechtewächter berücksichtigen Modulrechte. |
| `variant-m/element-rights.mjs` | Inhalt, Ersetzen, zusätzliche Elemente und Farben werden passend eingeschränkt. |
| `variant-m/logo-upload.mjs` | SVG-Upload benötigt zusätzlich das Logomodul. |
| `variant-m/ux-model.mjs` | Foto-/Logo-Angebot berücksichtigt die Module. |
| `variant-m/ux.mjs` | Vorhandene Werkzeuge respektieren Freigaben; kein Layoutumbau. |
| `workshop/cart-personalization.mjs` | Preisstand speichert den Vertrag; V2 mit ausdrücklich abgeschaltetem Logo bleibt bei null Logos gültig. |
| `workshop/shop-entry.mjs` | Direkter Designparameter umgeht keine gesperrte Designwahl. |
| `workshop/shop-design-gallery.mjs` | Liste, Auswahl und Vorschau respektieren die Quellfreigabe. |
| `workshop/shop-preparation.mjs` | Aufpreisbedarf passt zu Modulen; ursprüngliche kostenpflichtige Motive/Rasterlogos bleiben berücksichtigt. |

Die ersten acht Pfade liegen unter `app/configurator/`, die letzten vier unter `app/`. Vollständige Pfade und Vorher-/Nachher-SHA-256 stehen in `docs/reviews/2026-11-08-r15-module-rules/patch-manifest.json`.

Aus PR213 ausdrücklich **nicht** übernommen: Galeriewerkbank, allgemeine Vorbereitungs-/Snapshotoptimierung und V3-Preisschema. Der Legacy-Reiterfallback bleibt ohne Profil „Text“. Keine CSS-, `demo.mjs`-, Produkt-, Preis-, Motiv-, Font- oder Designänderung. Alle bestehenden Pointer-/PNG-/Vorschau-/Cart-Rückwegkorrekturen bleiben erhalten.

## Prüfung dieses konkreten Pakets

- **237/237 Tests in 19 Dateien, null Fehler/Skips**, 13,18 Sekunden: Modulregeln, native Fähigkeiten, Logo an/aus, gefälschte Entwürfe, V1/V2/Historie, direkter Galerie-/Einstiegszugriff, tatsächlicher Modulgraph/Allowlist, Pointer, große Vorschau, PNG, Cart-Bearbeitung und native Produktvorbereitung.
- Reale unveränderte r4-Datei mit SHA `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`: beide Logo-Profile erhalten **251 Designs, acht Formen, 80 Größen, alle 404 Optionskombinationen und sämtliche Grundpreise**. Startdesign bleibt `katalog-TAE-V2A-8x5-D1`. Datei und Quellobjekt nach der Prüfung unverändert. Kein Import, keine Produktanlage.
- Build erfolgreich: 153 Module, 16 Styles, `editor-e27682e70d9aff3a.mjs`, gzip 481.365 Bytes. Dies ist ein lokales Prüfartefakt; kein Vollruntime-/Bundle-Upload vorgesehen.
- Zwei ältere VM-Testanker auf die neuen Modulbedingungen angepasst, nicht die Sollwerte. Zusätzlicher echter Handlerfall belegt den unveränderten Legacy-Fallback und die gesperrte Reiterwahl. V3 wird ausdrücklich weiterhin abgewiesen.
- Unabhängiger Review durch `module_contract`: zwölf Nachher-Hashes und neun geschützte Quellen exakt; keine Blocker. Zusätzlich direkte SVG-Preview-/Medienprüfung bei Logo aus und unvollständigem Profil vor Konvertierung abgewiesen; Legacy bleibt erlaubt.
- `git diff --check` sauber. Eine erneute echte Mobil-/Desktop-/Shopify-Abnahme dieses Pakets steht noch aus; vorherige R15-Livebelege ersetzen diese nicht.

Reproduktion: der konsolidierte Aufruf steht in `docs/reviews/2026-11-08-r15-module-rules/test-command.ps1`. `GRAVURU_REAL_STEEL_DOCUMENT` zeigt auf die private, exakt gehashte r4-Datei; sie wird nicht eingecheckt. Konturtests verwenden den vorhandenen Python-Interpreter mit Projektabhängigkeiten.

## Paket und sichere Übernahme

Lokale Paketablage: `outputs/r15-module-rules-20261108/`. Dort liegen Sicherung der zehn Vorherquellen, Manifest, Testprotokoll und Sourcepaket. Vor jeder Übernahme alle aktiven Pins frisch vergleichen und Sicherung ergänzen; bei irgendeiner Abweichung abbrechen. Ausschließlich die zwölf aufgeführten Quellen übernehmen und **im tatsächlich aktiven R15-Baum** neu bauen. Die bekannte liveabweichende `demo.css` bleibt unbedingt erhalten. Den lokalen Prüfbaum oder sein fertiges Bundle niemals vollständig auf den Server kopieren.

Zunächst bleibt Produkt r4 ohne Modulprofil aktiv. Private Verwaltung und Kundenruntime sind unterschiedliche Prozesse; erst nach Kundenprüfung darf eine bestätigte Modulproduktrevision gebunden werden. Dieser Patch allein veröffentlicht kein Profil und schaltet kein Produkt um.

## Rücknahme

Vor einer erstmals veröffentlichten Modulrevision: die zehn frisch gesicherten Dateien und den vorherigen generierten Editor/Bundle-Verweis wiederherstellen; zwei neue, dann nicht referenzierte Module können gezielt entfernt werden. Kontrollierter Neustart, frischer R15-Aufruf und Cart-Rückweg prüfen. Keine Datenbank zurückkopieren und keine Warenkörbe löschen.

Nach Veröffentlichung eines Modulprofils **kein blinder Downgrade auf den alten profilunkundigen Leser**: gespeicherte Entwürfe und Preisstände benötigen den Vertrag weiterhin. Eine fachliche Rücknahme erfolgt dann als neue geprüfte Produkt-/Bindungsrevision; historische Stände bleiben unverändert und kompatible Leser bleiben verfügbar.

Nächster Schritt: unabhängiger Review des gehashten Pakets durch Root, danach getrennte Entscheidung über kontrollierte Übernahme und tatsächliche Mobil-/Desktop-/Cart-Abnahme. Die private Verwaltung bleibt bis dahin ohne Kundenschreibaktivierung.
