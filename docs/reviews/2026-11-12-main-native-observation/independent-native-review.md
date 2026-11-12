# Unabhängiger Review der echten Hauptprodukt-Beobachtung

12.11.2026. [Operatorbericht #168 · 6817439434](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817439434) vollständig frisch gelesen; Herkunft `dev/claude-db-sicherung-20261111@ae9adb23`. Ausschließlich Quell-/Belegprüfung, keine Tests, Konstruktoren oder Serveraufrufe ausgeführt.

**Kein kritischer Anschlussfehler gefunden.** Die drei lokalen Dateien stimmen mit den veröffentlichten Bytehashes überein:

| Datei | SHA-256 |
|---|---|
| observation.json | `4577f555e1ee270f225d60ef68ebfceca973246309b675022139dc7ef3d23ec3` |
| main-update-review.json | `d980417e45469b4d34f2fbd9abff746cf6cdbe7864e67b2f416fc2561f7ad8d8` |
| uo-beobachtung.mjs | `f540c4de1a8bc22ce2989da0d978b01a1d3d7cbdc69b897114da533eefa1bd5e` |

Auch alle 15 im Anschlussskript festgelegten Quellpins stimmen bytegenau mit dem lokalen Integrationskandidaten überein. Der Skripthash ist genau der beobachtete `nativeValidatorSourceSha256`.

## Tatsächliche Verdrahtung und Aussagegrenze

Das Skript kopiert die drei zusammengehörigen Sicherungsdateien in ein neu anzulegendes Arbeitsverzeichnis. Seed aus dem Editorbau, `workshopCatalog(seed.universal.localResources)`, Fontbibliothek und `registerFonts(fonts.list())` entsprechen der nativen Initialisierung. Sein Validator entspricht dem Nicht-Formprodukt-Zweig von `app/workshop/http.mjs:156`: `validateProductDocument` → Ressourcenauflösung → Assetprüfung → Fertigungsauflösung. Er weist Formprodukte ausdrücklich ab. Die vollständigen nativen Metadaten, `productOverview` und derselbe `guardedMetadataSnapshot`-Callback sind im Repository und im Adaptercontext verbunden. Kein abgeschwächter Schema-/Identitätsvalidator.

Damit sind tatsächliche native Kopienvalidierung, Ressourcenauflösung und Metadatenerfassung des unveränderten Zieles `ae09cbf6…e407` / Binding `f0bb7d95…d285` belegt. Reviewhash: `8e8814cabbddb0354e0af029e1bdb09f0a668f69af03dd056792a99c6b7d517d`. Kopf blieb R1/draft. `prepare` und `verify` sind kein Update-, Replay-, Rollback- oder Livefreigabenachweis; diese wurden laut Bericht nicht ausgeführt.

## Kein Widerspruch zwischen Kategorienerfolg und altem Pending

Der frühere Vergleichshelfer setzt `readyForImport:false` stets als Literal (`compare-main-target-copy.mjs:153`), unabhängig vom Modulregisterbefund. Das neue `categoryComparisonPassed:true` bezieht sich ausdrücklich auf dessen erfolgreiche Identitäts-/Abdeckungs- und Kategorienmerkmale sowie den gepinnten Dateihash. Es erklärt nicht den ganzen älteren Bericht zur Importfreigabe.

Der fehlende `cmp_*`-Registerpin wurde **nicht nachträglich als vorhanden bewiesen**. Das ist aber für diesen direkten identitätserhaltenden Hauptprodukt-Updateweg keine fehlende Laufzeitressource: `config.moduleProfile` enthält Schema, ID, Revision und alle sieben booleschen Modulschalter. `module-profile.mjs` validiert diesen vollständigen Snapshot und seine nativen Material-/Quellrechte. Der tatsächliche Workshopvalidator und der direkte `repository.importBatch`-Updateweg laden kein cmp-Register nach.

Anders der Gruppenplanweg: `product-group-templates.mjs:125–130` verlangt über `pinnedModule` die echte Modulbibliothek; `currentPlan:188–194` prüft deren aktuellen Revisions-/Hashpin. Dort bleibt ein fehlender Serverregisterpin eine echte Grenze. Kein solcher Guard wird hier umgangen, und kein lokaler v9-PGP wird als serverbestätigter Gruppenplan ausgegeben.

`resourcePins.profiles:[]` betrifft Fonts/Motive/Farben/Bestseller und bedeutet keine verwendeten Override-Referenzen; es ist kein cmp-Pin. Beide Kategorien bleiben im Produkt in der bestätigten Reihenfolge erhalten. `categoryAssignments.present:false` bedeutet nur fehlende Kategoriezuordnungen in den nativen Ressourceneinstellungen. `productionProfile:null` bestätigt keinen zugewiesenen Fertigungsprofilverweis; der Reader prüft ausdrücklich dessen Abwesenheit. Es ist kein eigenständiger Fertigungsfreigabenachweis.

## Angekündigter isolierter Kopienpilot

[Astra #168 · 6817507620](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817507620) wurde frisch gelesen. Das dort beschriebene Vorgehen ist eine zulässige Integrationsprüfung im bestehenden Arbeitsauftrag: echter Review und echte finale v7-Bytes, unveränderter `executeApprovedUpdate`, synthetischer eindeutig beschrifteter Testentscheid ausschließlich im Speicher, kein erfundener Nutzerwortlaut im `approval-evidence`-CLI und keine produktive approval.json. Keine neue fachliche Freigabe entsteht dadurch.

Die wirksame Grenze ist die tatsächliche technische Pfadisolation, nicht allein der Testactor: sämtliche beschreibbaren Repository-/Profil-/Assetverbindungen müssen auf vorab geprüfte, neu erzeugte Wegwerfkopien zeigen; Netzsperre und unveränderte Quellhashes bleiben erforderlich. Der Test darf keine Live-App/context-Injektion oder gelockerten Ziel-/Revisionsguard verwenden. Update plus identischer Replay und gezielter Driftabbruch liefern nur einen ausdrücklich als Kopientest markierten Beleg. Für einen Insert-/Rollbacknachweis muss der Driftfall wieder an einer eigenen Ausgangskopie mit R1 und leerem betreffendem Importjournal beginnen, damit er nicht bloß den Replaypfad prüft.

Zum Zeitpunkt dieses Reviews liegt hierfür die Ablaufbeschreibung, noch kein hier geprüfter konkreter Pilotquelltext oder finaler v7-Dateihash vor. Das ist eine präzise Beleggrenze, kein zusätzlicher Zustimmungsbedarf und keine Forderung nach einer erweiterten Testsuite.
