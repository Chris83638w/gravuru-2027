# PR214: gesonderte Schlussprüfung des Aktivierungsadapters

Basis: `57f6f70bc79eeb4f0d1655e80792b5d9fdd59db7` (PR214), separater Review-Zweig `review/mika-module-activation-20261108`. Einzige Produktionskorrektur: `app/workshop/shop-product-binding-store.mjs`. Keine Änderung an Kundenoberfläche, Serverkonfiguration, Shopify, Profilzuordnungen oder Live-Datenbanken. Ein zweiter unabhängiger Agent prüft die enge Korrektur; eine menschliche Abnahme wird damit nicht behauptet.

## Ausgangsfehler

Der erste aktuelle 251/404-Lauf scheiterte beim abschließenden neuen Logo-an-Plan an `shop_binding_freshness` (`scripts/lib/gallery-production-activation.test.mjs`, vormals Zeile76). Der native Persist-Batch überschritt den unveränderten 60-Sekunden-Prüfbeleg. Die Prüfung beendete den Vorgang mit `conflict`; der Test erwartete `completed`. Die Schutzfrist wurde weder erhöht noch entfernt. Der aktuelle Abschlussstand nach der gezielten Korrektur steht in `review-proof.json` und den finalen Logs; der erste Fehler bleibt als Nachweis erhalten.

Sechs gezielte Tests wurden tatsächlich ausgeführt: **5 bestanden, 1 fehlgeschlagen, 0 übersprungen**. Der große Ablauf hatte Logo-aus, verlorene Shop-Antwort, Neustart, absichtlichen Fehler nach allen 404 Köpfen, atomaren Rollback, Reconcile und idempotente Wiederholung erfolgreich durchlaufen. Erst die fachliche Rücknahme als neue Logo-an-Revision scheiterte. Die abschließenden Gleichheitsprüfungen nach dieser Rücknahme wurden deshalb in diesem Lauf nicht mehr erreicht; historische grüne Nachweise werden nicht als aktueller Erfolg ausgegeben.

Die beiden weiteren Adapterfälle (enge Release-Schreibrechte/Token-Await und tatsächliche Source-/Target-Änderung nach Transport-Await) bestanden. Drei gesonderte Fälle für alte bezahlte Bestellarchive, konkurrierende Pläne und Journalabbruch nach atomarer Aktivierung bestanden ebenfalls.

## Abschlussstand nach Korrektur

**Lokale technische Abnahme bestanden: 39 unterschiedliche gezielte Fälle, 0 fehlgeschlagen, 0 übersprungen.** 33 Storefälle und drei Archiv-/Konkurrenz-/Journalfälle wurden auf der endgültigen Datei ausgeführt. Der vollständige 251/404-Adapterlauf bestand alle drei Fälle einschließlich der vorher gescheiterten neuen Logo-an-Revision und sämtlicher abschließender Design-/Ressourcen-/Preis-/Historienvergleiche.

| Tatsächliche atomare Phase | Ergebnis | Dauer |
|---|---|---:|
| Fehler nach allen 404 Köpfen und Katalogfreigabe | erwarteter Konflikt, vollständiger Rollback | 39.637,5742 ms |
| Wiederaufnahme, Logo aus | completed | 38.807,8512 ms |
| Neuer bestätigter Plan, Logo wieder an | completed | 45.669,9550 ms |

Alle Phasen nutzten weiterhin den unveränderten 60-Sekunden-Beleg. Der ganze mehrteilige Adaptertest dauerte335.704,7626 ms. Der Ergebnisaufbau las431 statt830 vollständige Rohbelege.

Präzise Testgrenze: Der große Szenariotest wurde mit Store-SHA `64946ee74847cbe40981049f85bddc718b486b9151bf20060ef515e876e01e32` gestartet. Danach kamen ausschließlich zusätzliche Rückfälle bei TEMP-Schattenobjekten und expliziten Head-Indizes hinzu; der native Standardpfad blieb gleich. Diese letzten Rückfälle und der gesamte33er-Storesatz wurden gegen den finalen Store geprüft. Ein identischer großer Wiederholungslauf auf dem finalen Hash wird nicht behauptet. Der unabhängige Reviewer bestätigte den finalen Code und vier eigene SQL-Gegenproben plus elf bestehende enge Tests; diese werden nicht zum39er-Zähler addiert.

## Blocker und Eingrenzung

`shop-product-binding-store.mjs:252–254` prüft die Zeit **am Ende eines tatsächlichen Persist-Batches**, nach dessen Variantenprüfung und Schreibarbeit. `gallery-shop-sync.mjs` holt nach dem verifizierten Release unmittelbar vor `activation.activate` nochmals einen Remote-Beleg. `gallery-shop-sync-activation.mjs` reicht dessen `readAt` unverändert an alle fünf Bindungsbatches weiter. Damit ist die lange anfängliche Test-/Datenbankvorbereitung nicht unmittelbar Ursache des abgelaufenen Belegs: Der echte atomare Aktivierungsabschnitt überschritt diese Frist.

Der gesamte mehrteilige große Fall dauerte 664.574,6761 ms; die komplette Adapterdatei 690.346,5211 ms. Diese Werte sind keine Einzelbatch- oder Serverlatenz. Die aktuelle lokale Maschinenlast kann beitragen, wurde aber nicht als Ursache bewiesen. Eine Änderung der Frist oder ein blindes Wiederholen wäre kein Nachweis einer Behebung.

Getrennte Messung nur innerhalb der echten `withBindingTransaction`: **57.873 ms**, davon **36.092 ms für 830 vollständige Rohlesungen**; dabei rund9,87 Milliarden Dokumentzeichen nach JavaScript übertragen. `revisionStamp` liest nach jeder eigenen Schreibepoche das 12-MB-Rohdokument erneut, um unter anderem OFF→REPLACE→ON sicher zu erkennen. Dieselbe Revision wurde nach jedem nativen Bindungscallback und nochmals in der direkt folgenden Ergebnisaufbereitung nach internen Head-Schreiboperationen vollständig gelesen. Testinitialisierung und Planvorbereitung liegen außerhalb dieser Messung.

Ein versuchter vollständiger SQL-Bytevergleich verringerte die JS-Übertragung, aber nicht ausreichend die Laufzeit (60.365 ms, Fristabbruch). Er wurde vollständig verworfen und ist nicht Bestandteil des Patches.

## Eng begrenzte Korrektur

Die endgültigen Rückgabedaten werden erst nach den internen Head-Schreiboperationen eines synchronen Batches gesammelt aufgebaut. Alle Prüfungen nach jedem Preis-/Bindungscallback bleiben an Ort und Stelle; jede Ergebniszeile wird weiterhin in derselben Transaktion und vor der unveränderten Fristprüfung validiert. Reihenfolge, CAS, vollständige Rohdaten-/Metadatenvergleiche, Immutable-/REPLACE-/`recursive_triggers`-Kontrollen bleiben erhalten.

Die Verschiebung gilt ausschließlich für exakt bekannte native Tabellen und Trigger. Haupt- und TEMP-Schema werden geprüft, gebunden an beide Schema-Versionen. Fremde Trigger, gleichnamige TEMP-Objekte, andere Tabellen-DDL und eigene explizite Indizes auf den Headtabellen behalten den vorherigen unmittelbaren vollständigen Prüfpfad. Dies verhindert, dass ein Head-Trigger ein Produkt kurzzeitig archiviert und ein späterer Callback dies vor einer verzögerten Prüfung verschleiert. Der unabhängige Reviewer reproduzierte diesen Randfall; normale/TEMP-Trigger, TEMP-Schatten-Tabelle und Expression-Index mit SQL-Funktion sind dauerhaft negativ getestet.

Die einfache Batchmessung verringerte die atomare Phase auf **45.246 ms** und **431 statt830 Rohlesungen**. Der endgültige Szenariotest prüft zusätzlich die strenge Schema-Fallback-Grenze. Die finalen Phasenmessungen liegen in `activation-phases-final.json`. Alle Zeiten sind lokale Windows-Messungen, keine Serverlatenz-Zusage. Bei unbekannten Schemaerweiterungen greift absichtlich der alte sichere Pfad; dieser kann weiterhin die unveränderte Fristsperre erreichen.

`scripts/lib/gallery-activation-probe.mjs` ist ausschließlich ein lokaler Testhelfer. Kein Produktionsmodul importiert ihn. Er misst SQL-Zähler und native Transaktionsdauer ohne Produkt-/Kundendaten auszugeben. Die optionale Variable `GRAVURU_ACTIVATION_PROBE_OUTPUT` speichert diese Messungen. Der echte r4-Inhalt wird in der isolierten Fixture als lokale Revision1 angelegt; dies ist keine Kopie der produktiven Datenbank.

## Geprüfte Grenzen

| Thema | Konkrete Absicherung |
|---|---|
| Bestätigung | `createGalleryModuleSync` erzwingt die gespeicherte Bestätigung zu genau Plan-ID und Plan-SHA. Profilrevision, Registry und Quellstand werden erneut gelesen; eine alte Zustimmung ersetzt keine Prüfung des aktuellen Inhalts. |
| Letzter Schreibzeitpunkt | Quelle, Profil, Registry, Zielrevision/-hash und aktive Bindung werden nach dem letzten Shop-Lese-Await geprüft. Der Release-Anschluss wiederholt dieselbe synchrone Prüfung nach dem Token-Await unmittelbar vor dem Request. |
| Konkurrierende Vorgänge | Eigene Operations-Lease plus dauerhafte Zielzuordnung im Journal. Ein unklarer Shop-Schreibversuch gibt das Ziel nicht allein wegen Zeitablaufs frei. Native Anfügung und Shop-Metafeld verwenden Versions-/Compare-Digest-Vergleiche. |
| Native Freigabe | Alle 404 Variantenbindungen und die Katalogfreigabe liegen in einer nativen Transaktion. Ein Fehler nach der letzten Bindung und Freigabe muss sämtliche neuen Köpfe zurückrollen. |
| Wiederaufnahme | Ungebundene, exakt zum Journal passende Anhänge werden wiedererkannt. Ein akzeptierter Shop-Release mit verlorener Antwort wird gelesen und nicht ungeprüft erneut geschrieben. Ein erneuter Aufruf eines abgeschlossenen Vorgangs ist idempotent. |
| Rücknahme | Logo wieder einschalten ist ein neuer bestätigter Plan und eine neue native Revision. Alte Revisionen, Bindungen, Zusatzpreisverträge und Bestellpakete werden nicht überschrieben. |
| Umfang | Native Ziel-Fassade akzeptiert nur die feste Fähigkeitsquelle oder deren exakt validierte Modulprojektion. Der Shop-Schreibanschluss erlaubt nur `GallerySyncRelease` für das feste bestehende Produkt und `gravuru.gallery_release`; keine Preise, Varianten, Bilder, Produktanlage oder beliebige GraphQL-Mutation. |
| Schreibschalter | `executionEnabled` und `writesEnabled` bleiben standardmäßig aus. Der Zielanschluss ist dann eine echte SQLite-Leseverbindung. Der Adapter verleiht dem Browser keine zusätzlichen Verbindungs- oder Schreibrechte. |

## Echte Quelle und isolierte Simulation

Der vollständige Test verwendet die unveränderte native r4-Quelldatei `candidate-product-document.live-normalized.compact.json`, SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 11.906.263 Bytes. Sie enthält 251 Originaldesigns, 80 Formate und die 404 bestehenden Ausführungen. Die Datei wird nur gelesen. Temporäre native SQLite-Speicher, Shop-IDs, Token und die Shopify-Antworten sind isolierte Testdaten; es findet kein externer Shop-/Serverzugriff statt.

Der große Fall prüft Logo aus → verlorene Shop-Antwort → Neustart → Fehler nach sämtlichen 404 Köpfen → atomarer Rollback → Reconcile → idempotenter erneuter Aufruf → Logo an als neue Revision. Familienbank, Ressourcen und Elementrechte werden tief verglichen; alle Varianten-IDs/Optionen/Grundpreise sowie bisherige Zusatzpreisverträge bleiben identisch.

Der zusätzliche Bestelltest erzeugt eine synthetische bereits bezahlte Position und vergleicht danach die gespeicherte Bestellzeile, das Kundenmanifest und die Produktionspaket-Bytes. Das ist ein gezielter Bestellarchivnachweis, keine echte Kundenbestellung.

## Ausgeführte Befehle

```powershell
$env:GRAVURU_PYTHON='<vorhandener lokaler Python-Pfad>'
$env:GRAVURU_MODULE_NATIVE_CANDIDATE='<absolute gepinnte r4-Datei>'
node --test scripts/lib/gallery-production-activation.test.mjs
node --test app/workshop/shop-product-binding-store.test.mjs
node --test --test-name-pattern='real repositories \+ binding registry|two identical pre-created plans|failure after atomic activation' app/workshop/gallery-shop-sync.test.mjs
git diff --check
```

Vollständige Testlogs und SHA-Liste stehen neben diesem Bericht. Die ersten beiden Logs bleiben als historische Fehler-/Eingrenzungsbelege erhalten. Finale Logs: `activation-final-tests.log`3/3, `batch-guard-tests.log`33/33, `history-concurrency-final-tests.log`3/3. Keine breite Suite wurde wiederholt.

## Präzise Grenzen der Freigabe

Shopify und SQLite bilden keine gemeinsame Transaktion. Der Ablauf sichert diesen Übergang mit dauerhaftem Journal, Compare-Digest, anschließendem Rücklesen und atomarer nativer Aktivierung ab. Bei unklarer Antwort bleibt die alte aktive Bindung bestehen, bis der gespeicherte Vorgang eindeutig abgeglichen ist. Ein Konflikt oder unklarer Vorgang darf nicht durch neues Journal, pauschalen Retry oder Datenbank-Rückkopie übergangen werden.

Die 60-Sekunden-Frischeprüfung für Remote-Nachweise bleibt unverändert. Die Gesamtdauer des mehrteiligen Windows-Szenariotests ist keine Aussage über die spätere Serverlatenz.

Nicht blockierende Betriebsgrenze: `openProductionModuleTarget` liest höchstens 12.000 historische Bindungszeilen der ausdrücklich verbundenen Varianten. Bei vollständigen 404er-Generationen passen damit höchstens 29 Generationen; die 30. wird mit `module_target_history_bound` abgewiesen. Es gibt keinen löschenden oder ungesicherten Fallback. Für den ersten kontrollierten Profilwechsel ist dies kein Blocker, vor langfristig häufigen Wechseln braucht es eine gesonderte gezielte Skalierungsprüfung. Dieses Review ändert den Grenzwert nicht.

Vor einer tatsächlichen Zuordnung bleiben nötig: aktuellen Cache und Kunden-Modulgates auf derselben R15-Basis integrieren, privat mit ausgeschalteten Schreibschaltern mounten, echte gespeicherte Profil-IDs und vorhandenes Journal verwenden, frischen 251/404-Preis-/Identitätsbeleg erstellen, konkreten Änderungsplan vorzeigen und bestätigen lassen. Erst danach entscheidet Root über eine kontrollierte Ausführung und prüft den Kunden-/Warenkorbweg. Diese Review-Arbeit selbst aktiviert kein Profil.

Das kleine Runtimepaket enthält nur den Store, seine Vorherdatei und das genaue Hashmanifest; keine komplette alte Runtime. Bei abweichendem Vorherhash gezielt zusammenführen. Solange keine fachliche Aktivierung ausgeführt wurde, kann die gesicherte Vorherdatei zurückgesetzt werden. Eine bereits erfolgte Profiländerung wird ausschließlich durch einen neuen bestätigten Plan als neue Revision zurückgenommen, niemals durch Überschreiben alter Datenbanken/Bestellstände.
