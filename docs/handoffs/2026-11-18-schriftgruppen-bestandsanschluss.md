# Bestandsprodukte an Schriftgruppen anschließen

18.11.2026 · Astra mit Claude · eigener Folgebranch ab PR #256 / `2cb93c6`, nicht main. **Vorbereitet, nichts live.**

## Auftrag und Regeln mit Quelle

Chris: „Die Zuordnung passt. Mach mit Claude direkt weiter mit dem Anschluss der Bestandsprodukte an die Schriftgruppen. Nichts live ohne mein ‚live‘.“ [Auftrag dokumentiert](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6970260595).

- Bestätigtes 8→5-Mapping und 29 Standardschriften für Tür & Familie, Hausnummer & Firma, Andenken & Hochzeit: [Bestandsbericht](2026-11-18-schriftgruppen-bestand-zuordnung.md), versionierte [Gruppenauswahl](../plans/2026-11-18-font-connection-groups.json). Designschriften kommen hinzu; keine feste 32er-/35er-Grenze.
- Gleiches Aussehen und gleiche Bedienung, Preise/Prüfungen/Bindungen erhalten: Nutzerauftrag #254. Nur `profileAssignments.fonts` darf sich im Dokument ändern.
- Bestehende Bestellfreigabe fortführen, keine neue Verkaufsfreigabe ableiten: [Claudes Prüfung der vorhandenen Wege](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6970578645).
- Fehlende historische Profilmetadaten sind kein neuer fachlicher Ausschluss. Die vorhandenen Rückfälle aus `http.mjs` und `acrylic-review.mjs` bestimmen den vorher wirksamen Stand. Jede zusätzlich wirksam werdende Motiv-/Farb-/Bestseller-/Fertigungszuordnung stoppt diesen Eintrag. Vorhandene sonstige Metadaten gehen nicht verloren.
- Zwei Gruppeninhalte, allgemeine Türschild-Zuordnungen und gemischte Revisionen bleiben ausdrücklich offen; keine Namenserkennung oder globale Standardschriftenregel.

## Konkreter Serverbestand

Plesk, native Datenbank `acryl-employee-20261021-v1/data`, nur lesende SQLite-Verbindungen. Fünf getrennte Lesungen mit je höchstens 50 Paaren, anschließend gezielte Zusatzlesungen; kein konsistenter Sicherungssatz. Abfragen hatten ein 30-Sekunden-Limit. Die anfängliche zu große Lesung wurde nach exakter PID-/Skripthash-Prüfung beendet, Prozessende bestätigt. Kein App-Neustart.

[Einzelnachweis aller 249 Paare](../measurements/2026-11-18-font-connection-inventory.json): 248 Konfigurationen, 248 gespeicherte Shopify-Produktkennungen, 16.725 Varianten. Keine Behauptung aktueller Sichtbarkeit im Shopify-Shop.

| Gruppe/Fall | Revision-Paare | Behandlung |
| --- | ---: | --- |
| Tür & Familie, aus Katalogthema | 11 | 10 mit Katalogfreigabe, 1 ohne; Zuordnung bestätigt |
| Andenken & Hochzeit, aus Katalogthema | 102 | 5 mit Katalogfreigabe, 97 ohne; Zuordnung bestätigt |
| Funkklingeln | 126 | Eigener Bestellweg/Importbelege, keine Schriftgruppe bestätigt |
| Allgemeine kleine Türschilder | 6 | Vorschlag Tür & Familie, noch keine Übernahme |
| Allgemeines großes Edelstahl-Türschild | 1 | Eigener Vorschlag, noch keine Übernahme |
| Allgemeines großes Acryl-Türschild | 2 | Ein Produkt mit R1/R2-Mischbindung, gesondert klären |
| Altes Formprodukt | 1 | Eigener Konfi-Weg |

Alle 113 Themenpaare: Metadaten `{}`, vier Zuordnungen `inherit`, kein Fertigungsprofilverweis im Dokument. Einstellungen weiterhin Revision 1, alle Standards `inherit`, keine Kategorien; keine Fertigungsprofile. Dadurch ist der bestehende unbeschränkte Rückfall für die drei anderen Auswahlarten belegbar. Vor jedem tatsächlichen Speichern wird er erneut geprüft.

Die 97 nicht freigegebenen Andenken haben `familyFormats.source.shopProduct`; das eine nicht freigegebene Monogramm nicht. Der Einstieg verlangt laut Code bei diesem Merkmal eine Katalogfreigabe. Eine tatsächliche Kunden-/Bestellprobe oder Prüfung der laufenden Serveroption `catalogLiveOrders` ist damit nicht ersetzt. Beim Schriftanschluss bleiben alle 98 ohne neue Freigabe.

115 Paare besitzen leere Metadaten, 126 nur Klingel-Importbelege, ein Formprodukt besitzt `form/readiness/productionProfile`, sieben `profiles/productionProfile`. Bei den sechs Kleinformaten ist das Motivprofil bereits im Dokument **und** in den gespeicherten Profilquellen vorhanden. Es wird nicht als unbelegter oder wirkungsloser Motivstand behandelt. Importpräfix aller sechs: `product-group`. Die Zuordnung Tür & Familie ist ein eigener Vorschlag aus Produktart/Katalogbeleg, kein eindeutig vorhandenes Thema.

Acryl-Sonderfall `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0`, Shopify `16190784602492`: 30 Varianten auf R1, 778 auf R2, Head R2. Der bestehende Aktivierungsdienst weist die Mischbindung ab. Keine automatische Zusammenführung. Vor einer eigenen Vorlage: R1/R2-Differenz, Herkunft/Zeitpunkt der 30 Varianten sowie vollständige Preis-/Ausführungsdeckung prüfen.

Nur aggregierte Kundenbestandszahlen dokumentiert: 100 Acrylentwürfe, 16 Formentwürfe, 31 zum Lesezeitpunkt nicht abgelaufene Angebote, getrennte Snapshots. „Entwurf vorhanden“ bedeutet nicht „offen“. Keine Kundennamen, Inhalte, Tokens oder Bestellkennungen erhoben.

## Implementierung

`font-group-connection.mjs` verarbeitet genau ein ausdrücklich zugeordnetes Produkt je Plan. Keine Kategorienschleife, keine Produktneuanlage und kein automatischer Lauf. Private Host-Fabrik: `scripts/lib/font-group-connection.mjs`. Kein HTTP-Endpunkt/Startup-Aufruf; `executionEnabled` ist standardmäßig `false`, Shopify-Schreibtransport bleibt aus.

1. Alle vorhandenen Varianten müssen dieselbe gebundene Revision, Ausführungen und Preise vollständig abdecken. Für jeden Vorwärtsplan ist `reviewedRevision` verpflichtend. Archiviertes Produkt, Formprodukt und Funkklingel werden mit Grund abgewiesen. Ein abweichender Head benötigt den unten beschriebenen exakten Wiederanlaufbeleg.
2. Katalogliste und verwaltetes Herkunftsprofil müssen synchronisiert sein und exakt der bestätigten Auswahl entsprechen. Kein Namens-Matching auf freie Profile.
3. Dokument aus der gebundenen Revision kopieren, nur Schriftzuordnung ersetzen, native Validierung und Shopvorbereitung erneut vergleichen.
4. Vorhandene vollständige Profilmetadaten streng vergleichen, ausgenommen Schriftquellen/-auswahl und den wirkungslosen Einstellungszähler `settingsRevision`. Die tatsächlichen anderen Auswahlen, Quellen, Warnungen und das Fertigungsprofil bleiben geprüft. Bei fehlenden alten Profilmetadaten exakt die vorhandenen wirksamen Rückfälle vergleichen. Sonstige Belege erhalten.
5. Privat gespeicherter Prüfplan enthält Hashes, feste Revision, erwartete Variantenstände, Profilstand und geprüfte Preisverträge. Er ist ein Operator-Artefakt, **kein Authentifizierungstoken** und darf nicht aus Kunden-HTTP-Eingaben kommen. `execute` leitet die Schriftzuordnung erneut aus bestätigtem Set/Herkunftsprofil oder der unveränderlichen `restoreRevision` her; ein neu gehashter fremder Plan kann die Gruppenprüfung nicht umgehen.
6. Neue Revision über vorhandenes `importBatch`-Journal, genau einmal. `expectedMetadata` vergleicht die tatsächlich berechneten Metadaten innerhalb der Schreibtransaktion; bei Abweichung wird der ganze Import zurückgerollt. Vor dem Schreiben werden Quelle/Bindungen/Profil erneut geprüft.
7. Bestehende `createGallerySyncActivation`, ausdrücklich `approvalMode:'preserve'`: Varianten einschließlich Zusatzpreise und fortgeführter Bestellfreigabe in derselben Transaktion. Gemischte Freigabedeckung stoppt ausdrücklich. Der Schriftanschluss vergleicht jeden neu erfassten Zusatzpreisvertrag exakt mit dem bisherigen, einschließlich seiner Revision; auch ein gleich teurer neuer Vertrag wird nicht nebenbei übernommen. Ein vorher nicht freigegebenes Produkt bleibt nicht freigegeben. Der tatsächliche Bindungsplaner prüft bereits in `plan` und in `execute` **vor dem Speichern** frische Shopify-Preise, Identitäten, Ausführungen und bestehende Bindungen am aktuellen unveränderten kaufmännischen Produktstand. Bestehende Galerie-/Modulabläufe behalten ihren bisherigen Standardmodus.
8. Für den Bindungsvergleich wird der vorhandene nur lesende Registry-Modus durch `orderIntake.idBindings` weitergereicht. So fordert eine Lesung während des Produkt-Schreiblocks keinen zweiten Schreiblock an. Die Bindungsschreibprüfungen bleiben unverändert.

Ein Fehler nach dem Speichern, aber vor der Aktivierung kann eine neue **ungebundene** Revision hinterlassen. Der alte Kundenstand bleibt aktiv; derselbe gespeicherte Plan setzt bei unveränderten Abhängigkeiten exakt an dieser Revision fort. Ändert sich etwa die bestätigte Schriftliste, wird mit `plan({targetId, recoveryPlan: alterPlan})` ein neuer Prüfplan erstellt. Jede ungebundene Zwischenrevision muss durch den vollständigen ursprünglichen Plan, seinen Hash, den atomar geschriebenen Importjournaleintrag sowie unveränderliche Vorher-/Nachher-Dokumente und Metadaten belegt sein. Verschachtelte `recoveryPlan`-Belege decken mehrere Abbrüche ab; ein bloßes Journalpräfix reicht nicht. Fremde/manuelle Zwischenstände stoppen. Prüfpläne daher privat dauerhaft zum Vorgang aufbewahren. Kein neuer Journalspeicher, keine Schemaänderung.

Privater Ablageort für den später freigegebenen Operatorlauf: `/var/www/vhosts/gravuru-designwerkstatt.de/private/font-connection-plans/<sha256>.json`, außerhalb des Webverzeichnisses. Vor `execute` muss der ausführende Operator den **vollständigen** zurückgegebenen Plan dort speichern, wieder einlesen und genau diese Fassung ausführen; den Ordner in die private Sicherung aufnehmen. Fehlender/abweichender Wiederanlaufplan stoppt, es wird kein Ersatzbeleg aus dem heutigen Head erfunden. Dies ist die Ausführungsanleitung, kein bereits angelegter Serverordner oder Hintergrunddienst. Die 45-Tage-Regel für Kundenentwürfe gilt nicht automatisch für diese Prüfbelege; keine automatische Löschung eingebaut.

Rückweg: neuer Plan mit `restoreRevision`, gegebenenfalls zusätzlich `recoveryPlan`, weitere Revision mit der früheren **wirksamen** Schriftzuordnung und gleicher Aktivierungsweg. Historische Revisionen und Angebote werden nicht umgeschrieben. Ein inzwischen gesetzter Schriftstandard oder eine geänderte frühere Profilliste kann den Rückweg blockieren, wenn `inherit`/Profilverweis damit eine andere Schriftauswahl ergäbe. Es wird keine historische Auswahl durch heutige Einstellungen ersetzt. Bloßes Ändern und Zurückstellen der Einstellungen bei gleicher Wirkung blockiert Folgeanschluss und Rückweg nicht mehr.

Claudes Review [B1–B3/P1–P2](https://github.com/Chris83638w/gravuru-2027/pull/257#issuecomment-6970925922) führte zu diesen Nacharbeiten. Zusätzliche Serverlesung: [Freigabedeckung](../measurements/2026-11-18-font-connection-approval-coverage.json). Alle 15 Themenprodukte mit bestehender Freigabe sind vollständig gedeckt, keine Teilfreigabe; Leuchtturm 5 freigegebene / 5 gebundene / 5 tatsächlich abgedeckte Varianten auf R4. Nur gelesen, nichts korrigiert oder erweitert.

## Tests und Vorher/Nachher

99 unterschiedliche gezielte Tests bestanden, 0 übersprungen: 21 Repository, 19 Schriftanschluss, 13 Galerie-Sync, 13 Modul-Sync, 31 Bestell-/Routing-/Bindungslistenfälle und 2 native Schrift-/Entwurfs-HTTP-Fälle. Sowohl die gemeinsame Modulaktivierung als auch der Schriftanschluss ausdrücklich im Modus `preserve` wurden mit 404 Varianten über mehrere 100er-Blöcke und einem Fehler nach dem letzten Block geprüft. Die native 404-Varianten-Fixture entsteht aus eingecheckten Daten ohne private Kandidatendatei. Der Host-Fabrik-Test verwendet einen synthetisch verfügbaren Schriftkatalog, keine Behauptung über echte Glyphendateien.

Geprüft: standardmäßig ausgeschaltet, reine Schriftänderung, unverändertes natives Kundenmodell außer notwendiger Schriftressource/Profilbeleg/Revisionskennung, historische leere Metadaten, Schutz anderer Profilwirkungen und Importbelege, fehlende Freigabe bleibt fehlend, neuer freigegebener Stand ohne Freigabelücke, veralteter Variantenstand ohne Teilbindung, spätes Freigabeversagen mit vollständigem Rollback, Wiederanlauf, Vorwärts-Rückweg, alter Kundenentwurf nach Wechsel weiterhin speicherbar und bis zur Bestellannahme verwendbar. Neue Gegenfälle: Preisabweichung vor/nach Plan ohne Speicherung, Listenänderung nach Abbruch mit explizitem Wiederanlaufbeleg, mehrere abgebrochene eigene Zwischenstände, fremder/manipulierter Zwischenstand, wirkungsgleich zurückgestellte Einstellungen, Teilfreigabe, neu gehashter fremder Vorwärts-/Rückwegplan, fehlende geprüfte Revision, Klingel/Formprodukt und tatsächliche private Host-Fabrik.

Die Fotoregression scheiterte zunächst am Windows-Python-Alias. Mit dem bereits vorhandenen gebündelten Python (`GRAVURU_PYTHON`) bestanden Galerie- und Modul-Suite vollständig; keine Fotologik geändert.

[Reproduzierbarer Vergleich](../measurements/2026-11-18-font-connection-roundtrip.json), gleicher isolierter Edelstahlartikel mit gleicher Gestaltung und fünf Varianten: gebundene Revision 1 → 2, Profilbegrenzung `null` → synthetische Liste Allura/Montserrat; SVG-, Konfigurations- und Preis-/Bindungshashes gleich, Bestellfreigabe bleibt erhalten, 0 Shopify-Schreibzugriffe. Nach Review-Korrekturen neu ausgeführt: Planung 189,2 ms, Anschluss 554,7 ms. Das ist **keine** Handy-/Netz-/Warenkorb-Messung und keine Abnahme der echten 29 Katalogdateien. Höherer Server-RSS und Kunden-Geschwindigkeit bleiben im übergeordneten Performance-Auftrag offen.

Reproduktion:
```text
node --test app/workshop/font-group-connection.test.mjs app/workshop/repository.test.mjs
node --test app/workshop/gallery-shop-sync.test.mjs app/workshop/gallery-module-sync.test.mjs
node --test app/workshop/order-intake.test.mjs app/workshop/order-intake-routing.test.mjs app/workshop/cross-store-order-intake.test.mjs app/workshop/order-intake.binding-list.test.mjs
node --test app/workshop/font-selection-draft-http.test.mjs
node tools/performance/font-connection-roundtrip.mjs <privater-Berichtspfad>
```

## Konkreter Pilot und nächste Schritte

[Pilotvorschlag mit fünf exakten Varianten](../plans/2026-11-18-font-connection-pilot.json): **Edelstahl-Türschild Leuchtturm 12×8 cm**, `cfg_98436fb0-886d-4af8-bc11-f45ef809684c`, gebunden/Head R4, Shopify `16077798965628`. Bestehende Katalogfreigabe und fünf Zusatzpreisverträge; aktuelle Variantenstände jeweils 3. Auswahl aus den 15 bereits freigegebenen Themenprodukten, kein zusätzliches Produkt freigeben.

Vor Ausführung: Claudes PR-Review, Poppins-Katalogabhängigkeit PR #192 im **Katalog-Repo**, bestätigte 29er-Liste samt Herkunftsprofil synchronisieren, frische private konsistente Sicherung/Wiederherstellungsprobe, aktuelle Varianten-/Preisbelege, konkret freigegebener Pilotplan. Chris’ ausdrückliches **„live“** bleibt erforderlich. Danach misst Claude den echten Weg einschließlich Schriftwahl, Text hinzufügen, Speichern/Wiederöffnen und Warenkorb. Erst anschließend weitere bestätigte Themenprodukte einzeln anschließen. Die allgemeinen Türschildvorschläge und die Acryl-Mischbindung brauchen eine gesonderte Vorlage, die zwei offenen Gruppen ihre tatsächliche Schriftauswahl.

Keine Live-Daten, Kataloglisten, Preise, Produkte oder laufende Anwendung geändert; kein Merge/Deploy.

Spätere Listenpflege wirkt erst nach einem neuen geprüften Produktanschluss. Ohne weitere Vorgabe gilt weiterhin Chris' einzelne „live“-Freigabe; keine automatische Folgesynchronisierung eingebaut. Ob später eine feste Freigaberegel gelten soll, bleibt als offene Entscheidung im Issue und ist keine neue Produkteigenschaft.
