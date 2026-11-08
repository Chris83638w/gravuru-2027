# Schiefer: gemeinsamer Prüfstand · Astra · 04.11.2026

Auftrag [Claude Schiefer 6628275303](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6628275303), Importabgrenzung [Mika 6630117588](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6630117588). Eigener Integrationsbranch mit PR; kein main-Merge und kein Live-Schritt. Für Designs gilt unverändert der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Enthaltene Stände

Code-main `207c0c7e` plus #160 `478c476`, #166/#170 `768fd52`, Mika #173/#174 `aab6a6a`, Claude #172 `f686a42`. Gemeinsamer Laufzeitstand: **`1ce64db2771285910c109747b5c4e891cfc0e559`**. Der folgende Commit ergänzt nur Prüfskripte, Protokolle und diese Übergabe. Einziger Code-Mergekonflikt: neue Absätze in STATUS.md; beide Seiten vollständig erhalten. Keine neue Preis-, Freigabe-, Design- oder Importlogik eingeführt.

Katalog-Integrationsbranch `dev/astra-schiefer-katalog-integration-20261104`: #173 (Fix für #162, von Claude bestätigt), #179 (Fix für #165, Review noch offen), #171 einschließlich #169, #176, #177 und #178. JSON-/Designquellen konfliktfrei. Gemeinsame KATALOG.md und Stammdaten-Excel neu gebaut, STAND-Einträge beider Seiten erhalten. Quellenstand vor dem erzeugten Abschluss: `092556bad58609f771d61341828ac60fa5381de2`; vollständige Eltern im Katalog-Nachweis `auftraege/2026-11-04-schiefer-integration/zusammenfuehrung.json`.

## Ergebnisse

- **Linux-Vollauf 2.143/2.143**, 0 Fehler, 0 Skips; unveränderte Anwendung und Tests, Node 24, Python-Abhängigkeiten aus den Requirements-Dateien. Der erste Lauf hatte 15 Fehler ausschließlich wegen fehlender requirements-logo.txt; nach Installation vollständiger neuer Lauf, kein Zusammenrechnen von Teilläufen. Zusätzlich **5/5 Importtests**, die außerhalb des npm-test-Globs liegen.
- **20 gültige Katalogfamilien**. Alle 2.695 eigenen Zuordnungsdateien und 249 Bestandsdateien aus #176 unverändert. Claudes Quellen einschließlich SVG/Fotos exakt übernommen: #177 **2.097 Master / 1.955 angeboten**, #178 **955 / 955**. Neue Freigaben weiterhin null. Dies aktualisiert die ältere 1.956-Angabe und den veralteten lokalen Renderer-Hack-Hinweis in Claudes ursprünglicher Übergabe; sein Kommentar 6628275303 bestätigt die Prüfung ohne Hack auf #170.
- **47/48 Tafeln** haben kompatible Zuordnungen, **11.823 Größen-Zuordnungen**. Einzige Lücke: Kordel 30 × 10 cm. **Nur drei Tafeln / 268 Größen-Zuordnungen freigegeben.** Eine Zuordnung ist keine Sicht- oder Produktionsfreigabe. Die vorhandenen Kontaktbögen bleiben Prüfbasis.
- Vorhandenen freigegebenen Bestand mit gemeinsamem Code vorbereitet: **10 Produktgruppen auf drei Tafeln, 136 Varianten, 346 Galerieeinträge, 0 Ausschlüsse**. Katalogbasis dieser nativen Vorbereitung #176 `c0cffc8`; die integrierten neuen Pakete bleiben unfreigegeben, und der Quellenvergleich belegt unveränderten freigegebenen Bestand.
- **Monogramm MG-S-22x14-D1**: isolierter tatsächlicher Import in eine Kopie des vorhandenen 48-Produkt-Teststores. 1 Produkt / 15 Varianten / 82 Designs hinzugefügt, alle 48 vorhandenen Produkte mit identischer ID/Revision/Inhaltsprüfsumme erhalten. Wiederholung: 0 neue Produkte, 0 neue Revisionen, 0 neue Ressourcen. Sicherung und Journal im privaten Testordner, keine Datenbanken in Git.
- Importprüfung gegen genau diese gemeinsame Laufzeit: kompatibel, 15 Varianten/Preise identisch. Das beseitigt den lokal nachgestellten Preisvertragsblocker; es belegt **keinen geänderten Händlerhost**.
- Echter lokaler Browsercheck nach Import auf Desktop und Mobil: jeweils richtiger Monogramm-Starter und genau 82 Designs, AH02 Gold + Silikon **35,97 €**, keine JavaScript- oder HTTP-Fehler. Der Prüfläufer verwendet mobil die vorhandenen Schritte, nicht die ausgeblendeten Desktop-Tabs. [Desktop](../reviews/2026-11-04-schiefer-integration/desktop-zubehoer.png), [Mobil](../reviews/2026-11-04-schiefer-integration/mobile-zubehoer.png), [Browserbericht](../reviews/2026-11-04-schiefer-integration/browser.json).

Alle Rohprotokolle und Zähler liegen unter [docs/reviews/2026-11-04-schiefer-integration](../reviews/2026-11-04-schiefer-integration/). Kein echter Shopify-Warenkorb, keine Bestellung, kein aktiver Import und keine Veröffentlichung durch diesen Nachweis.

## Reproduktion

Linux: Node 24, libcairo2 und fonts-dejavu-core; Python-Umgebung mit requirements-import.txt, requirements-excel.txt, requirements-contours.txt, requirements-print.txt, requirements-photos.txt, requirements-logo.txt und fonttools 4.67.0. Installierte Versionen sind im Nachweis gespeichert. Im Code-Checkout:

```sh
node --test --test-concurrency=4 --test-reporter=tap app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs
node --test --test-reporter=tap scripts/slate-group-import.test.mjs
node scripts/audit-slate-integration.mjs --katalog <Katalog> --out <Audit.json>
python scripts/build-katalog.py --katalog <Katalog>
node scripts/prepare-slate-products.mjs --katalog <Katalog> --out <48-Tafeln>
node scripts/prepare-slate-product-groups.mjs --katalog <Katalog> --source <48-Tafeln> --out <Gruppen>
node scripts/slate-group-import.mjs --package --source <Gruppen> --only MG-S-22x14-D1 --out <Paket.json.gz>
node scripts/check-slate-import-integration.mjs --source <48-Tafeln> --target <neuer-lokaler-Testordner> --bundle <Paket.json.gz> --out <Importnachweis.json>
node scripts/serve-slate-review.mjs --data <neuer-lokaler-Testordner> --port 8981
node scripts/check-slate-integration-browser.cjs --proof <Importnachweis.json> --bundle <Paket.json.gz> --out <Browsernachweise> --url http://127.0.0.1:8981
```

Bei einem Partial Clone kann der Audit mit `--fetch-metadata` die kleinen Git-Objekte der gepinnten Quellpakete im Stapel nachladen. Er prüft die vollständigen Quellbäume und liest nur Schiefer-Metadaten; unveränderte eingebettete Fotodateien werden nicht für eine bloße Zählerprüfung erneut ausgepackt. Kein Assetersatz.

## Genau nächster Schritt und Grenzen

Claude prüft #179 und die gemeinsame Integration. Die eigenen Integrations-PRs sind eine prüfbare Zusammenführung; ihre Eltern enthalten die bisher vorgeschlagene Einzelkette. Vor Übernahme nach main aktuelle Fremdänderungen erneut prüfen, danach Linux-/Katalognachweis des tatsächlichen Übernahmestands. Die direkte Nutzervorgabe dieses Chats bleibt: eigene Branches mit PR, kein eigenmächtiger main-Merge und Live nur mit Chris' Satz.

Mika führt den Monogramm-Pilotimport/Shopify-Anschluss nach Bereitstellung der gemeinsamen Laufzeit fort. Dafür genaue aktive Codewurzel und Version in #85 melden. Kein paralleler Pilotimport durch diesen Chat. Seine ältere Weiterleitung an #139 ist laut 6630117588 korrigiert; Schiefer-Abstimmung bleibt hier in #85.

Offen: echter Desktop-/Mobil-Warenkorb samt Re-Edit und Preisabgleich, unveränderte fünf alte ACTIVE-Produkte, Variante-erhaltende Migration des separaten Hunde-DRAFTs, sauberes Originalfoto für D220 (eingebrannter Upload-Aufdruck), neue Designfreigaben durch Chris. Neue Menschen-/Kreuzdesigns bleiben bei Claude. Produktionsvorgaben Blau/Haarlinie und originale Lochbilder bleiben maßgeblich; dieser Integrationsnachweis enthält keine neue Maschinenabnahme. Keine alten PRs geschlossen und keine Freigaben gesetzt.
