# Übergabe: Acryl-Werkstatt, Produktkatalog und neuer Kundenkonfigurator

Stand: 22.10.2026. Auftrag von Chris: Katalogstruktur in der Werkstatt anlegen und Katalog abgleichen; den vollständigen Arbeitsstand für eine andere KI nach GitHub stellen. **Kundenanbindung ist ausdrücklich für den neuen Konfigurator zurückgestellt. Keine Freigabe zur Veröffentlichung der Artikel.**

## Hier beginnen

- Codebasis: Remote-Commit bf5c059f13e0868d7c554616b7c35ff7a328ae62 auf dev/konfi-neu-20261019. Dieser Übergabe-Branch enthält zusätzlich die gesamte Acryl-Arbeit und die neue Katalogübersicht. Neuere parallele Konfigurator-Arbeit erst vergleichen, nicht überschreiben.
- Katalog: https://github.com/Chris83638w/gravuru-katalog./tree/task/katalog-struktur-20261022 – struktur.json, serien/ und KATALOG.md. Die Serien enthalten exakte Konturen und SKU/Produkt-Revisionszuordnung; niemals auf ein Rechteck/Ellipse reduzieren.
- Arbeitsoberfläche: /werkstatt/katalog/; Acryl-Galerie: /werkstatt/acryl/. Die Katalogseite wurde am 22.10.2026 installiert; Mitarbeiterzugang: https://admin.shopify.com/store/gravuru-design/apps/gravuru-konfigurator/werkstatt/katalog/ .
- Bestehende Shopify-App: https://admin.shopify.com/store/gravuru-design/apps/gravuru-konfigurator/werkstatt/acryl/ . Der Serverstand vor dieser Katalogerweiterung wurde am 22.10. mit realem Shopify-Browser geprüft.

## Quellen und reproduzierbarer Stand

[manifest.json](../../handoff/acryl-20261022/manifest.json) beschreibt den vollständigen lokalen Acryl-Quellstand. [source-snapshot.json.gz](../../handoff/acryl-20261022/source-snapshot.json.gz) enthält 798 Produktdokumente, 40 Designquellen, 160 Konturen und 12 verwendete Schriften – keine Datenbanken, Zugangsdaten, Bestellungen oder Kundendaten. Gemeinsame Korrekturen auf dem Server sind maßgeblich und können neuer sein.

Mit Node 24: `node scripts/read-acryl-source-snapshot.mjs` prüft alle Bausteine und Produktprüfsummen. Optional einen noch nicht vorhandenen Ausgabepfad angeben; dann wird ein lesbares JSON erzeugt. Das Werkzeug schreibt niemals in eine Werkstatt-Datenbank.

Vor einer Migration aktuelle Daten auf dem Server sichern und lesen. Lokalen Snapshot nicht über eine laufende Datenbank spielen. Produkt-/Gruppen-/Design-/Konturkennungen und Revisionen erhalten.

## Verbindliche Produktkennungen

- Acryl Shopify-Hauptprodukt: gid://shopify/Product/16175627665788, Status DRAFT, 798 Varianten. Handle acryl-tuerschilder-schwarz-anthrazit-2027.
- Interne Gruppe: variants_ebc11a46-9d5c-43be-87f0-366e75e2668f, Revision 5.
- Standard Schwarz: cfg_d8bc2048-2f32-4e54-9134-7a0e8cfd38e0, Revision 5, SKU TS-Acryl-RE-150X100-T30-SW-K00, 18,99 EUR.
- Standard Anthrazit: cfg_81380430-04a9-44f1-b604-5ef7c4f4cb91, Revision 5. Farben SW/AN sind Auswahloptionen mit gleichem Preis. Beide 3 mm.
- 79 Form-/Größenkombinationen, 40 Designs; 399 identische Preispaare. Je nach kleiner Form nicht jedes Design zulässig: Mindesttextgröße 3 mm, gültige Designlisten aus der konkreten Variante verwenden.
- Interne cfg-Kennungen sind **keine Shopify Variant IDs**. Die aktuelle Shopify-Variante exakt per SKU lesen, auf Eindeutigkeit prüfen und persistiert zuordnen; nicht aus Reihenfolge ableiten.
- Vier aktuelle Hunde-Gedenktafeln: 16168868348284 (D220), 16168869429628 (D207), 16168869659004 (D215), 16168869724540 (D212), je 48 Varianten/16 Designs/DRAFT. Sechs ältere 9-Varianten-Entwürfe bleiben separat im Katalog. Archivierter Regenbogenartikel 16168869888380 bleibt archiviert; D222 bleibt Designauswahl.
- Neue Edelstahlserie: 399 lokal vorbereitete Varianten, Gruppe variants_5500718d-0f63-4e9c-b29e-32956336ef4f Revision 5; keine pauschale Zuordnung zu älteren Shopify-Stahlartikeln.

## Katalog und Hauptproduktlogik

11 aktive Produktlinien, 48 Unterkategorien; Türklingeln zurückgestellt. Struktur: Produktlinie → Unterkategorie → Hauptprodukt → Ausführungen. Pro Unterkategorie gewünschte Hauptproduktzahl, pro Produkt Startdesign/SEO/Hauptbild. Alle passenden Designs bleiben im Konfigurator zur Auswahl. Geplante Anzahlen sind keine automatischen Shopify-Schreibaufträge.

/api/workshop/catalog-structure (GET/PATCH) ist hinter Händleranmeldung, Herkunftsschutz und CSRF. Neue Tabelle catalog_structure_settings speichert append-only pro Mandant mit Versionsprüfung; keine Änderungen an Produktdokumenten. Auf dem isolierten Mitarbeiterhost lautet der API-Prefix /api/workshop/acryl/. Gleichzeitige Änderungen werden mit 409 zurückgewiesen.

Shopifystatus in struktur.json ist ein datierter Abgleich bekannter Produkte, keine laufende Vollinventur. Die aktuelle Acryl-Galerie prüft den realen Shopify-Stand separat. Grün erfordert nachgewiesenen veröffentlichten Designstand; Blau erfordert einen bestätigten Unterschied zum veröffentlichten Stand. ACTIVE allein beweist das nicht.

## Noch fertigzustellen mit dem neuen Konfigurator

1. Neue Konfiguratorversion/Branch und ihre Schnittstelle mit dem Mitarbeiterstand vergleichen. Bestehende Änderungen nicht blind ersetzen.
2. Produkt/Variante → interne Konfiguration samt Revision → zulässige Designauswahl verbinden. Serverkorrekturen übernehmen, unveränderlichen Gestaltungs-Snapshot erzeugen.
3. Warenkorb anhand echter Shopify Variant ID, geprüftem Preis, Menge und eindeutigem Snapshotbezug. Keine Autorisierung oder Vertrauensentscheidung aus veränderbaren Kundenfeldern ableiten.
4. Bestellnachricht authentifizieren und idempotent verarbeiten; Bestellposition eindeutig an gespeicherten Snapshot, Produktrevision und Fertigungsausgabe binden.
5. Fertigungsdateien gegen Kontur, Größe, Bohrungen, Gravur-/Druckprofil und tatsächliche Korrektur prüfen. Keine reine Screenshot-Abnahme als Fertigungsfreigabe.
6. Echte Testbestellung einschließlich zwei unterschiedlicher Gestaltungen derselben Variante, Mehrmengen, Wiederholungsnachricht, Fehlerfall und Storno prüfen. Danach konkrete Freigabe von Chris zum Veröffentlichen einholen.

Vorhandene Anknüpfungspunkte: app/workshop/http.mjs, form-customer-store.mjs, form-shop-bindings.mjs, cart-*.mjs, order-*.mjs, export-*.mjs. Genauere Dateinamen im Repository suchen. Die bestehende Infrastruktur ist kein Nachweis einer abgeschlossenen Kundenintegration dieser Serie; canPublish bleibt false.

## Server und Rückweg

Bisherige Werkstatt bleibt separat: /var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-merchant. Acryl-Paket: private/acryl-employee-20261021-v1 (release/ und data/). Vorheriger Release: private/gravuru-merchant-release-d18bc6c. Start über app.cjs und scripts/acryl-employee-entry.cjs, Node 24.22.0.

ACTIVATED.json und rollback/COMPLETE.json sind aktuelle Installations-/Sicherungsnachweise. RESTORED.json ist ein historischer Zwischenstand. Vier Statusdateien wurden zusätzlich unter status-fix-20261022 gesichert. Schlüssel bleiben ausschließlich in privater Serverkonfiguration. Keine Schlüssel im Repository; nur vorhandene autorisierte Anmeldung verwenden.

## Abnahme dieser Erweiterung

Neun gezielte Tests für Katalog/Team bestanden (Node 24): atomare Speicherung, Versionskonflikte, Mandantentrennung, unveränderte Produktdaten, Zugriff/Herkunft/CSRF, Routen und bestehende Acryl-Hauptproduktlogik. Lokaler Browsertest bestanden: Anzahl speichern, zwei Unterkategorien zuordnen, Neuladen, Suche nach Hunde-/Katzenprodukten. Zwei im Sichttest gefundene Dialogfehler wurden behoben und nachgeprüft. Serverinstallation am 22.10.2026 um 04:33 UTC abgeschlossen. Zehn Dateien rückgeprüft: alle SHA-256 stimmen; vorherige Werkstatt-Datenbank vollständig gesichert (258.023.424 Byte). Katalog/Galerie/JS HTTP 200; Zugangsschutz 401/403 bestanden. Chris bestätigt die sichtbare Katalogseite mit 11 Produktlinien und 48 Unterkategorien. Die Browsersteuerung zeigt bei neuen Shopify-Einbettungen teilweise eine leere Ansicht; dies ist separat von der erfolgreichen Server- und Nutzersichtprüfung dokumentiert. [Installationsnachweis](2026-10-22-katalog-installation.json).


## Veröffentlicht auf GitHub

Beide Übergabezweige heißen `task/katalog-struktur-20261022`. Der vollständige Code- und Quellstand wurde in Commit 6091f83b05c55bb6cd1cf66fecfed32ef6af8d6a rückgeprüft (76 Dateien), der Katalog in 48a1a89b33756aa79a4e1f2b08d589483dedbaf7 (21 Dateien). Dieser Nachtrag ergänzt nur Dokumentation. Die Hauptzweige und parallele Konfiguratorarbeiten wurden nicht überschrieben.

Server-Rückweg: private/acryl-employee-20261021-v1/catalog-structure-20261022 enthält APPLIED.json, PREPARED.json, MANIFEST.before.json, die vorherigen Code-Dateien und workshop.sqlite. Vor einem Rücksetzen aktuelle Mitarbeiteränderungen sichern; die gesicherte Datenbank nicht pauschal über neue Änderungen schreiben. Keine Zugangsdaten oder privaten Datenbanken auf GitHub.
