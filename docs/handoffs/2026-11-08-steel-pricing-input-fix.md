# Edelstahl: fehlenden Logo-Aufpreis vollständig erhaltend korrigieren

Branch `dev/mika-steel-pricing-input-fix-20261108`, Basis `3a780000d44ae6f6671d8560c5b9ff919738ac91`. Nutzerauftrag: echten Warenkorb mit Größen, Befestigung und SVG-Logo prüfen; Logo12,99€. Kein freigegebener Konfi-Aufbau geändert. Parent übernimmt Veröffentlichung und echte Abnahme; dieser Unteragent hat nichts veröffentlicht.

## Ursache und unveränderte Daten

Echter Test: Retro2,90×60mm,B02, Variante58104613339516. Editor/gesicherter Entwurf30,47€, Shopify17,48€. App-eigenes Preis-Metafeld am Produkt16190784438652 hatte18.557UTF-8-Bytes. Shopify Functions liefern Metafelder über10.000Bytes nicht an die Function. [Offizielle Grenzen](https://shopify.dev/docs/api/functions/2026-04#limitations).

V2/Revision2 und V1/Revision1 haben jeweils404Varianten. **94 historische Preise unterscheiden sich** und bleiben exakt erhalten. Alle404IDs bilden nachweislich eine Folge mit Schritt32768; diese wird nur verlustfrei gespeichert. VorherSHA `76012d418f5c82b8f7c0c8339a0441f3fe41286aa903d287d84f00d169daf1ed`. Nachher **2.318Bytes**, SHA `6b0e4d19ba2f50e638637d03c6e8c0796f93f09d8d362bcf453b495d04a0eb46`. Vollständige Expansion aller IDs, Preise, Zuschläge, Mengenstaffeln und sonstigen Vertragsfelder vor/nach identisch.

## Gezielte Umsetzung

`pricing-storage.mjs` hält normale Variantentabellen weiter gültig. Nur geeignete Tabellen bekommen `variantSequence`: erste sichere ID, positiver ganzzahliger Schritt, geprüfte Breite1–6 und Festbreiten-Base36-Centwerte. Der echte Vertrag braucht Breite3. History referenziert die feste Revision über `variantsFromRevision`; `variantDeltas` erhält die94abweichenden Altpreise anhand disjunkter Indexbereiche. Keine veränderliche current-Referenz, keine Ketten. Der Publisher expandiert vollständig und prüft sämtliche Preise/Bereiche sowie die10.000-Byte-Grenze.

Die Function-Abfrage wechselt **nur** im Preis-Metafeld von `jsonValue` auf `value` (vorhandenes Schema: `Metafield.value: String!`). Ein Cache lebt nur innerhalb eines Aufrufs und verwendet den vollständigen Vertragsstring als Schlüssel. Andere Strings/Produkte/Revisionen bleiben getrennt. Ein Vertrag wird einmal geparst; historische Delta-Indizes einmal aufgelöst. Pro Zeile wird genau deren Preis in den unveränderten V1/V2-Rechenweg projiziert. Keine Formel, Rundung, Mengenstaffel oder Logo-Regel geändert. V3 aus neuerem Repository wird nicht mit veröffentlicht; Buildbasis ist der veröffentlichte V1/V2-Einstieg aus `1c3c61f` plus gezielte Resolver-/Adapteränderungen.

Fehlende Preisverträge und ungültige Referenzen lassen die Function-Ausführung fehlschlagen. Das ersetzt keinen echten Checkout-/Fehlerbehandlungstest. Normale unpersonalisierte Zeilen bleiben unverändert. Der enge CAS-Publisher verwendet den Encoder verbindlich; ein allgemeiner künftiger Edelstahl-Sync-Publisher muss ihn noch integrieren.

## Prüfungen und offene Leistungsgrenze

- **27 Node-Tests bestanden**, einschließlich vollständiger Cache-Identität, unabhängiger historischer ID-Folgen, CAS/Backup/Rollback und App-Modulerhalt.
- **14.140 Vergleiche** gegen echten privaten Export:404Varianten, beide Revisionen, Logos0/1/4, Motive/Fotos, Mengen1/10/20/50/99. Gemeldeter Logo-Fall exakt30,47€.
- WASM: drei gemischte Zeilen4,67Mio., sechs aktuelle4,66Mio., zehn gemischte8,94Mio. Instruktionen, jeweils unter11Mio.
- Menge20,50,99 innerhalb **einer** Zeile jeweils korrekt und etwa1,70Mio. Instruktionen. Stückzahl ist nicht Zahl verschiedener Warenkorbpositionen.
- **20 verschiedene Zeilen überschreiten weiter das Budget:** aktuell12,96Mio., historisch15,23Mio., gemischt14,99Mio. Preise stimmen, aber keine technische Freigabe großer Sammelwarenkörbe. Kein Kundenlimit eingebaut. Engineoptimierung separates Paket.
- 50/200Zeilen überschreiten zusätzlich128.000Byte Eingabe; vollständige Query/URLs können die Grenze früher erreichen.

[`compiled-proof.json`](../reviews/2026-11-08-steel-pricing-input/compiled-proof.json) meldet deshalb ehrlich `allWithinInstructionLimit:false`; der Prüflauf endet wegen der bekannten20Zeilen-Grenze mit Exit1. Parent akzeptiert den gezielten10Zeilen-geprüften Logo-Fix, keine allgemeine Skalierungsfreigabe. [`private-price-equivalence.json`](../reviews/2026-11-08-steel-pricing-input/private-price-equivalence.json) enthält nur Hashes/Zähler, keine Rohdaten.

## Eingefrorene Artefakte

- Vollständiges lokales App-Projekt: `work/shopify-compiler-20261105/steel-pricing-complete-20261108/project`.
- Function-Projekt: `work/shopify-compiler-20261105/steel-pricing-release-20261108/project`.
- WASM **20.977Bytes**, SHA `a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2`.
- CAS-Bundle `outputs/steel-shopify-20261108/repair-steel-pricing-sequence.bundle.mjs`,15.326Bytes,SHA `c44c705bdf3c2908d645ab7de3088d1da450dbdfa16caf737c1a84712dfbac70`. Installkommando daneben `.install-command.txt`:7.873Zeichen, SHA-Prüfung vor privatem0600-Neuschreiben, keine Zugangsdaten.

`prepare-steel-complete-project.mjs` rekonstruiert21Theme-Dateien aus aktiver Remote-Konfiguration (6Inline-Dateien) und15nachSHA/Größe verifizierten Assets. Beide Extension-UIDs und aktive englische Function-Lokalisierung erhalten. Frühere Function-only-Artefaktversion und Zwischenbuilds sind überholt und dürfen niemals veröffentlicht werden.

## Gesicherter Rollout durch Parent

**Stand nach Veröffentlichung am 08.11.2026:** Der Hauptagent hat die vollständige App-Version `1199363391489` unter `gravuru-2027-steel-pricing-input-20261108-v2` veröffentlicht und aktiv zurückgelesen. Vorher wurden alle 8 Remote-Module verglichen: 7 unverändert, in der Function ausschließlich Binary-Metadaten und der genehmigte Wechsel `jsonValue → value`. Die 21 Theme-Dateien, Scopes, URLs und Proxy-Einstellungen sind unverändert. Die [Prüfquittung](../reviews/2026-11-08-steel-pricing-input/app-preservation-receipt.json) entstand vor der Veröffentlichung und vermerkt deshalb `released:false`.

Die anschließende gesicherte Metafeld-Reparatur führte genau eine Mutation aus. Readback: 2.318 Bytes, erwarteter SHA `6b0e4d19ba2f50e638637d03c6e8c0796f93f09d8d362bcf453b495d04a0eb46`. Die private Original-Sicherung wurde vor dem Schreiben geprüft; [Reparaturquittung](../reviews/2026-11-08-steel-pricing-input/metafield-repair-receipt.json). Echte neue Warenkorbfälle mit Größen, Befestigung und Logo prüft der Hauptagent anschließend. Bis deren Nachweis gilt die Veröffentlichung allein nicht als Warenkorbabnahme.

Aktive Baseline `gravuru-2027-issue139-pricing-20261102-v1`,ID1191284113409. Zieltag `gravuru-2027-steel-pricing-input-20261108-v2`. Bestehende FunctionUID3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef, ThemeUIDa4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a. Keine Cart-Transform-Neuanlage.

1. Privates Originalmetafeld sichern; neuen CAS-Helfer zuerst `--mode preview` serverseitig prüfen. Exakter VorherSHA sowie App/Shop/Produkt fest verdrahtet.
2. Vollständiges Projekt mit bestehender CLI4.9.0 nur `--no-release --no-build` unter Zieltag hochladen. Keine Function-only-Version freigeben.
3. `stage-steel-pricing-preserved.mjs --mode verify-complete --cli <CLI-Paketpfad> --out <neuer Ordner>` liest aktive Version/Kandidaten. Alle7anderenModule müssen vollständig identisch sein. In der Function nur Binarymetadata und exakt ein Querywort `jsonValue→value` erlaubt. Keine Scopes/URL/Proxy/Themeänderung.
4. Parent prüft Readback, veröffentlicht vollständige kompatible App und führt Metafeld-CAS aus. Apply verlangt benannten Functionrelease und privaten Backupordner. Vor exakt einer Mutation: Originalbytesicherung0600, Readback, frischer compareDigest. Keine automatische Wiederholung bei Konflikt.
5. Neue echte Warenkorbfälle mit Größen/Befestigung/Logo sowie Menge prüfen. Bis dahin keine Live-Erfolgsaussage.

Ein früherer manifest-only-Stagingversuch wurde wegen fehlender Assetbytes abgewiesen; keine Version entstand. Der Weg ist jetzt gesperrt. Nur vollständig rekonstruiertes CLI-Bundle verwenden.

Rollback: `--mode restore --backup-file <private Originaldatei>` verlangt exakt unveränderten reparierten Feldstand und legt eine weitere Sicherung an. **Das restaurierte Original ist zu groß und enthält den Preisfehler.** Rückkehr zur alten App kann den stillen Aufpreisfehler wiederherstellen; bloßer Rollback bedeutet keine Verkaufsfreigabe. Keine Datenbanken/Bestellstände zurückkopieren.
