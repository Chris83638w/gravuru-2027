# #230 B: sieben Excel-Akten geprüft, native Pläne noch gesperrt

Stand 11.11.2026, Codex/Mika. Aufgabenbranch `dev/mika-product-plans-230b-20261110`, unveränderte private Planservice-Basis `f4645189c3dd8e5ba6f2aa2a3c11c16c604f33d5`. Ausschließlich lokale Prüfroutine, Tests und Belege. Keine Änderung unter `app/`, kein Serverzugriff, keine native Quellregistrierung, keine Bestätigung, Ausführung, Bindung oder Shopifyaktion.

**Ergebnis: 7 exakt zugeordnete Excel-Akten, 823 analysierte Verkaufskombinationen, aber 0 echte native Planpaare.** `planId` und `planHash` bleiben in allen sieben Ergebnissen ausdrücklich `null`. Der Auftrag ist hinsichtlich der sieben freigabefähigen Pläne noch nicht erfüllt. Ein Hash des Excel-Abgleichs darf nicht als nativer `planHash` bezeichnet werden.

Die aktuellen Operator-Grenzen wurden erneut gelesen: [B-Auftrag](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772867984), [A bleibt beim Operator](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772914392), [bestätigte Schnellstraße](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6773693287), [lokaler B/C-Probelauf](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6774617558). Die Schnellstraße bestätigt das Verfahren; sie bestätigt keine noch nicht vorhandenen Produktpläne.

## Exakte Eingaben und Ergebnisse

Excelquelle: `dev/claude-kette-pilot-acryl-20261110`, Commit `bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd`. Jede unveränderte XLSX wurde per Git-Blob gelesen und gegen ihren SHA-256 in der Extraktion geprüft. Vollständige SHA-256 stehen im JSON, nicht nur in dieser Übersicht.

| Excel in `docs/produktfreigaben/` | Größen | Analyse-Kombinationen | Nativer Plan |
|---|---:|---:|---|
| Tuerschild-Acrylglas-3mm_v4.xlsx | 77 | 778 | ID/Hash fehlen |
| Tuerschild-Acrylglas-3mm-5x2_v2.xlsx | 1 | 10 | ID/Hash fehlen |
| Tuerschild-Acrylglas-3mm-6x2_v2.xlsx | 1 | 10 | ID/Hash fehlen |
| Tuerschild-Acrylglas-3mm-8x2_v2.xlsx | 1 | 10 | ID/Hash fehlen |
| Tuerschild-Edelstahl-5x2_v1.xlsx | 1 | 5 | ID/Hash fehlen |
| Tuerschild-Edelstahl-6x2_v1.xlsx | 1 | 5 | ID/Hash fehlen |
| Tuerschild-Edelstahl-8x2_v1.xlsx | 1 | 5 | ID/Hash fehlen |

Eingabeextraktion von Agent `module_contract`, Commit `7681c37d823d5db2461d196eca9ca4b05e2ca127`; unverändert komprimiert beigepackt unter `docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz`. SHA-256 des entpackten JSON: `2218e5d9e6917016e59526781e2f57c650c59b449f00f979d6a0d0605bfb61e9`. Die frühere vorläufige CRLF-Fassung hatte einen anderen Hash und wird vom Runner korrekt abgelehnt.

Ergebnis: `docs/reviews/2026-11-10-issue230-b/plan-readiness.json`, SHA-256 `ee92f8d4827a11978d705e01f4299f5ffe006591cbee6107c742c76f2b2fea12`. Das ist ein **Bereitschaftsbericht**, keine native Produktplanantwort. Er enthält je Excel Quellenlücken, abweichende Referenzen und unveränderte Bestätigungsstände. Die Excel-Dateien wurden nicht bearbeitet. Formeln in Variantenspalte J besitzen keine gespeicherten Ergebnisse; die 823 Summen sind explizite Cent-Arithmetik aus den vorhandenen Preiszellen, keine behauptete Excel-Neuberechnung. Feste Options-JSON in Spalte G sind leer.

## Warum der bestehende Planservice noch keine echten Pläne liefern kann

In allen sieben Akten steht `Freigabe!C11 = nicht vorhanden (Neuanlage)`. Die Zellen C23–C28 für Plan, Vorlage und Modulprofil einschließlich Revisionen sind leer. C7 ist nur eine vorgeschlagene Arbeitskennung. Keine aktuelle native `productId`/numerische Revision/Dokumenthash-Zuordnung liegt vor.

Der unveränderte Service `createProductGroupTemplates` in `app/workshop/product-group-templates.mjs` ist **quellengebunden**:

1. `sourceLookup`/`sourceView` lesen einen tatsächlich registrierten Produktdatensatz über `repository.get(productId, {revision})` und dessen aktuelle Registry-Zuordnung.
2. `draft`/`create` speichern eine echte `gravuru-product-group-template/v1` mit Quelle, Material, Familie, Größe, Optionen und gegebenenfalls versioniertem Modulprofil. Neue Optionswerte oder Preise dürfen nicht aus freiem Text erfunden werden.
3. `plan` bindet diese Referenzen, Angebot-Fingerprint und Dokumenthashes in `gravuru-product-group-creation-plan/v1`. Erst diese gespeicherte Antwort enthält `pgp_…` und den nativen `planHash`.

Die Excel allein ist kein zulässiges Ersatz-Repository. Eine flüchtige Testquelle mit erfundener ID würde zwar einen synthetischen Plan erzeugen, der später in der echten Verwaltung nicht wieder geprüft werden kann. Deshalb wurde sie nicht für die sieben Ergebnisse eingesetzt.

**Vorhandener reiner Neuanlage-Vorgänger:** `planFamilyFormats(katalog, lineId, subcategoryId, options)` in `app/workshop/katalog-family-formats.mjs` erzeugt bereits `{config, report}` ohne DB-/Shopwrites; `makeProductDocument` verpackt die Konfiguration. Dieser Pfad kann die vollständigen nativen Quellpakete vorbereiten. Er ersetzt aber keine registrierte Quellrevision und keinen `ProductGroupTemplate.plan`. Historische feste Acryl-12×8-/6×2-Schnitte, N39 (`configurationPlanned=false`), `acryl3-rear`-Testfixtures sowie die anderen 18 frisch importierten Acrylprodukte sind keine nachgewiesenen Quellen dieser sieben Angebote.

## Belegte Abweichungen vor einer Quellpaket-Vorbereitung

- Katalogpin ist `8236b8bfab7322447ec46661c116fa526331af3d`. Die Excel nennt noch `3c6051f…` und D1–D73/Übernahme offen. Der gepinnte Auftrag `auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json` enthält 1.298 Originale: 1.217 Hauptgruppe und je 27 für 5×2, 6×2, 8×2; 751 mit Rang 0, 547 mit Rang 1. Reihenfolge Rang 0 vor 1 geprüft; keine Kundensortierung geändert. Das ist eine Original-Liste, keine pauschale Größen-/Materialfreigabe.
- Alle abgeglichenen Basispreise passen. Acryl-Schrauben im Katalog stehen jedoch weiterhin auf **299/339 Cent**; die ausdrücklich bestätigte Excel verlangt **269/329 Cent**. Der Lauf findet im Hauptprodukt 79 betroffene Größen-/Befestigungszeilen je Farbe, zusätzlich je eine je Kleinformat/Farbe. Die Linie hat leere Preisüberschreibungen. Der vorhandene Paketvorläufer würde diese veralteten Katalogaufpreise ohne dokumentierte Korrektur übernehmen. Die bestätigten 269/329 Cent sind nicht erneut anzufragen; sie müssen im geprüften Quellpaket korrekt hinterlegt sein.
- Alle drei Stahlkleinformate stimmen bei Basis- und Befestigungspreisen mit dem gepinnten Katalog überein: 799/879/949 Cent ohne Befestigung. Acryl klein: 699/799/849 Cent.
- Kleinmotive: 14 vorhandene Dateien minus `schmetterlinge-1.svg` ergeben exakt 13; einzelne Dateihashes sind im Bericht. `schmetterling-1.svg` bleibt enthalten. Laut [Entscheidung 17:16](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772716646) rechts/links neben Text; Striche dürfen mittig oder mit versetztem Text liegen. Diese neuere Entscheidung wurde nicht heimlich in die alten XLSX geschrieben.
- Katalog-PR187 war beim Quellencheck offen (Head `69bf6448fb2bde47b2da3e1616f854786f1f65ee`), nicht Teil des gepinnten main. Kleine Originalfassungen mit Motivtausch/offener Sichtprüfung dürfen nicht ungeprüft als freigegebene Quellen gelten.
- `colors=an` in der Excel bezeichnet Schwarz/Anthrazit als Materialauswahl. Daraus folgt keine Freigabe des freien UV-Farbeditors. Bestehende Materialoptionen und `moduleProfile.modules.colors` sind fachlich getrennt.
- Bestätigte Foto-/Logo-/Motivpreise sind 999/1299/169 Cent. Diese vorhandenen gesonderten Preiswege sind von der nicht verkaufsfähigen freien V3-Zubehörcheckbox zu unterscheiden. Befestigung/Klebeband können bestehende Variantenpreise nutzen; es ist nicht die gesamte Variantenstrecke defekt.

## Edelstahl: ausschließlich Änderungsvergleich 80→77

Historischer nativer R4-Beleg: `outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json`, SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`. Kein frischer Live-Iststand behauptet.

Verglichen mit der unveränderten Änderungs-MD aus demselben Excel-Commit: exakt `GR-ES-RE-50X20-T15`, `…60X20…`, `…80X20…`, je fünf Befestigungen. Damit 80→77 Größen und 404→389 Varianten. Alle 15 historischen Shopify-Variant-IDs/SKUs und Centpreise sind erhalten; historische Einzelpreis-Summe 16.783 Cent. Startformat bleibt AB 120×80/Edelstahl. Keine Löschung, neue SKU, Änderung alter Bestellungen oder Warenkörbe wurde ausgeführt. Vor Umsetzung sind ein frischer Bindungsstand, eine Historien-/Umleitungsstrategie und die ausdrückliche Freigabe dieses Änderungsplans erforderlich.

## Genau nächster Schritt und noch benötigte Entscheidungen

1. Operator versieht eine nächste Excel-Version mit dem tatsächlichen Designgruppen-/Katalogpin und den bereits entschiedenen 13 Motiven. Bereits bestätigte Preise bleiben bestätigt.
2. Noch ausdrücklich entscheiden: Logo-Modul im Acryl-Hauptprodukt (Preis bestätigt, Modulstatus nur Vorschlag), Foto/Logo in den sechs Kleinformaten, endgültiges Startdesign/Startformat, offene Zuordnung der Bestandsreihe TAS-A sowie gegebenenfalls Mengenstaffel/Steuerkontext aus den als Vorschlag markierten Zellen. Keine neue Formauswahl/UI daraus ableiten. Designzuordnungen einschließlich PR187-Sichtprüfung zuerst belegen.
3. Vollständige echte Quellpakete auf vorhandenem `planFamilyFormats`-Pfad vorbereiten: 77 Größen im Hauptprodukt, drei getrennte Kleinformate, bestätigte Schraubenpreise, erlaubte Module/Motive/Materialien und alle Original-/Ressourcenrechte. Bestehende feste D8/D10-/798er-Produkte bleiben unberührt. Danach native Validierung und Kontaktbogen aus dem echten Konfi.
4. Der fehlende **technische Vorgängerschritt** ist eine tatsächliche, ausschließlich private Quellregistrierung plus reale Registry-/Profil-/Vorlagenrevisionen. Dieser Lauf hat sie nicht ausgeführt. Dafür muss der Operator den zuständigen bestehenden Register-/Importpfad und die review-only Freigabe festlegen; kein neuer Kundenkonfi ist nötig.
5. Danach kann `planExistingTemplate` aus dem beigefügten Script den bestehenden Service verwenden. Die Excel-SHA steckt im `creationKey`; gespeichertes ID-/Hash-Paar wird zurückgelesen. Noch keine Bestätigung/Ausführung. Die sieben konkreten Paare plus Kontaktbögen gehen gemeinsam zur Station-3-Stapelfreigabe.

Das ist **noch kein fertig angeschlossener Excel→Neuanlage-Automat**. Die Lücke ist die sichere Konstruktion/Registrierung der autoritativen Quellen aus den konkreten Produktakten, nicht eine weitere Oberfläche und nicht ein neu zu codierender Konfigurator.

## Reproduktion und Nachweise

Vom Aufgabenbaum aus, mit vorhandenem Katalog-Repo (dessen Arbeitsbaum bleibt unverändert):

```powershell
$nodeExe = 'C:/Users/Mikail Erdem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
& $nodeExe --test scripts/issue230-product-plan-audit.test.mjs
& $nodeExe scripts/issue230-product-plan-audit.mjs `
  docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz `
  . ../gravuru-katalog `
  ../../outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json `
  ../../outputs/issue230-product-plans-20261110/new-readiness.json
```

Die referenzierten Git-Objekte müssen vorhanden sein; fehlende Objekte werden nicht durch andere Stände ersetzt. Das Ziel muss neu sein (`wx`, kein Überschreiben). Der normale Runner öffnet keine SQLite, ruft keine API auf und schreibt nur die neue Ergebnisdatei. Die Planfunktion ist ein expliziter Anschlusshelper für den später gelieferten echten Service, kein automatischer Import.

4/4 gezielte Tests grün, Log `docs/reviews/2026-11-10-issue230-b/tests.txt`: sieben reale fehlende Quellen, Manipulations-/Scope-Abweisung, vorhandener nativer Planservice mit ausschließlich synthetischer In-memory-Testquelle samt Excel-Paarung und 0 Bestätigungen/Ausführungen, widersprüchliche Rückleseantwort. Diese Testpläne wurden nicht als Produktnachweis ausgegeben. Vollständiger Auditlauf beendet sich erfolgreich mit `actualNativePlans:0`, `blockedBeforePlan:7`.

Alle späteren Designarbeiten folgen unverändert dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Keine Designänderung in diesem Paket.
