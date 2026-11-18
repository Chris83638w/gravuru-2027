# Schriftgruppen: privater Wartungsaufruf B

Auftrag: Chris, Bestandsprodukte an die bestätigten Schriftgruppen anschließen, direkt mit Claude; nichts live ohne „live“. PR258 basiert auf PR257/286ff2d, nicht main. Keine neue Schriftliste, Preisregel oder Verkaufsfreigabe.

## Entscheidung und Umfang

[Claude wählt Weg B](https://github.com/Chris83638w/gravuru-2027/pull/258#issuecomment-6971984610): eigener privater Einmal-Befehl bei gestoppter App. Weg A ist verworfen. `acryl-employee-host.mjs` ist gegenüber der PR-Basis wieder **bytegleich**, ebenso beide Startdateien. Es gibt keinen Kunden-Endpunkt oder Startauftrag. Die native Laufzeitdatei erhält einen kleinen privaten Haken und lädt den vorhandenen Shopify-Leseadapter zusätzlich; diese Datei muss im später geprüften Laufzeitpaket enthalten sein. Das wird nicht als bytegleiche gesamte Laufzeit bezeichnet.

Pflichtbefund erledigt: `gallery-production-shopify-read.mjs` erlaubt nur die beiden exakten Texte `GALLERY_SYNC_OPERATIONS.product` und `.variants`. Ein erlaubter Abfragename mit fremdem Inhalt (Bestellungen, Kunden, Schema) wird vor Tokenabruf/Netz abgewiesen. Bestehender gezielter Freigabeschreiber bleibt separat eingeschränkt. Der Schriftanschluss bekommt ausschließlich den fertigen Leser, niemals Token oder Tokenanbieter.

## Ruhende native Werkstatt

Der normale Werkstattstart würde AI-Aufträge umstellen und Export-/AI-Intervalle starten. [Mit Claude abgestimmter früher Wartungszweig](https://github.com/Chris83638w/gravuru-2027/pull/258#issuecomment-6972072418): `maintenanceOnly:true` wird ausschließlich im privaten Aufruf per Code gesetzt. Standard bleibt false, kein Env-Schalter.

Vor dem Zweig laufen dieselben Ressourcen-, Schrift-, Profil- und Repository-Konstruktoren mit derselben Validierung und Metadatenbildung. Danach wird nur der vorhandene Kunden-/Bindungsspeicher als Datenbaustein zusammengesetzt, ohne seine Kundenoberfläche herauszugeben. Zurück kommen genau sieben Teile plus Schließen: `tenantId`, `repository`, `profiles`, `fonts`, `productionProfiles`, `orderIntake`, `sessionContext`, `close`. Keine zweite Preis-/Prüflogik, kein Seedprodukt, Katalog-Worker, Export-Worker, AI-Dienst, Vorschau-Server oder Webhook-Handler. Die vorhandenen drei Datenbankdateien müssen bereits existieren. `build()` und die daraus gelesenen Modell-/Seed-Daten bleiben identisch zum Normalstart; der private Aufruf erreicht sie erst unter der nativen Sperre. Damit wird kein möglicherweise veraltetes Modellpaket als Ersatz für den normalen Ressourcenaufbau verwendet.

Der Wartungsmodus verwendet dieselben Datenbank-Anpassungen wie diese Codeversion. Deshalb darf er den Bestand **nur aus genau dem Codeverzeichnis öffnen, auf das der geprüfte App-Einstieg verweist**. Es ist keine Möglichkeit, neue Migrationen an der noch alten Live-App vorbeizuschieben.

## Sperre, Befehle und Planfreigabe

`scripts/font-connection-maintenance.mjs` ist ein explizites CLI, kein App-Einstieg. Seine private JSON-Konfiguration enthält feste Pfade, Ziele/Gruppen und standardmäßig `approvedPlanSha:null`; keine Geheimnisse und keinen allgemeinen Ein-Schalter. Eine schematisch vollständige [Vorlage mit echten gelesenen Pfaden](../plans/2026-11-18-font-maintenance-config.example.json) liegt bei. Sie referenziert zur Dokumentation noch den beobachteten Live-Stand **9af3a1ac**. Der neue Wartungscode muss diesen abweichenden Stand abweisen. Erst nach Freigabe/Einspielung desselben Kandidaten werden Einstiegspfad und Prüfsumme anhand des tatsächlichen Stands neu festgelegt.

```text
node scripts/font-connection-maintenance.mjs --config /PRIVATER/PFAD/font-maintenance.json plan leuchtturm-12x8
node scripts/font-connection-maintenance.mjs --config /PRIVATER/PFAD/font-maintenance.json execute <ausdrücklich-freigegebene-SHA>
```

Das sind **zwei getrennte Befehle**. Der zweite funktioniert nur, wenn exakt diese SHA im geprüften privaten Lauf als `approvedPlanSha` festgelegt ist. Jede andere, auch gültige Plan-Datei bleibt gesperrt. Eine Freigabe wird nicht aus dem ersten Befehl oder verstrichener Zeit abgeleitet. Das Eintragen einer echten produktiven Freigabe setzt Chris' konkretes „live“ voraus. Auf diesem Server wurde keine Konfiguration angelegt und kein Wartungsbefehl gestartet.

Planen kann ausdrücklich `--restore-revision 4` und/oder `--recovery-sha <alter-Beleg>` erhalten. Der gespeicherte vollständige Beleg wird eingelesen; die bereits geprüften Herkunfts-/Historienregeln aus PR257 bleiben maßgeblich. Keine Kombination `plan+execute`, keine automatische Wiederholung, kein automatischer Neustart. Ausgabe nur Phase, SHA, Produkt-/Zielkennung, Revisionen und erhaltener Freigabestatus; keine Zugangsdaten oder Kundeninhalte. CLI-Fehler liefern nur einen Fehlercode.

Ablauf im Prozess:

1. Argumente/Konfiguration prüfen; die tatsächliche `lock.mjs` gegen ihre bekannte Prüfsumme prüfen. Dann **dieselbe Sperre** aus dem bestehenden Legacy-Verzeichnis für das native Datenverzeichnis anfordern. Bei belegter Sperre endet der Befehl vor Runtime-Konfiguration, Datenbanköffnung, Ordnererzeugung, Paketbau oder Netzaufruf.
2. Unter Sperre den App-Einstieg samt SHA, Codeverzeichnis, nativen Datenpfad, Legacy-Verzeichnis, Katalogpfad und Python-Pfad prüfen. Erst danach die vorhandene private Runtime-Konfiguration laden; Python-/Shopidentität müssen passen. Vor der nativen Öffnung werden wie im bestehenden Händlerstart der bestätigte Python-Pfad, ein leerer PYTHONPATH und die private Dateimaske gesetzt; am programmatischen Ende wird der vorherige Prozesskontext auch bei Fehlern wiederhergestellt. Keine neue Installation oder Zugangsdaten.
3. Nur `createShopifyTestRuntime(..., {maintenanceOnly:true, fontConnection})` öffnen, ohne Legacy-Host oder Kundenintegration. Der Haken erhält genau die hier geöffnete native Werkstatt und deren begrenzten Leser.
4. Einen Plan speichern oder die eine freigegebene SHA ausführen. Beide Dienst-/Operator-Gates sind nur für den exakt gepinnten Ausführungslauf offen, im Planlauf immer geschlossen. Vor Dateizugriff und Schreiben gelten die bisherigen vollständigen Plan-/Shop-/Bindungsprüfungen.
5. Native Werkstatt schließen, **danach** den Lockprozess beenden und dessen Ende abwarten. Lockverlust/Abbruch sperrt den privaten Operator auch während einer laufenden Shopabfrage. Bei einem Schließfehler oder einem fehlgeschlagenen Konstruktor, der noch keinen Besitzer seiner geöffneten Speicher zurückgegeben hat, wird die Sperre nicht vorzeitig freigegeben; das Einmal-CLI beendet seinen Prozess, damit dessen Ressourcen und die Lock-Pipe vom Betriebssystem geschlossen werden. Die Lockdatei wird nie gelöscht.

## Reale Serverbelege, ausschließlich gelesen

[Pfade und Lock-Prüfsumme](../measurements/2026-11-18-font-maintenance-paths.json):

- Native Daten: `/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data`.
- Tatsächlich verwendetes Legacy-Verzeichnis: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-combined-id-20261022-v1/legacy`.
- `ops/plesk/lock.mjs`: SHA256 `5991c860d0079259bda1b184a0b89e4162824e4b31b4cdf531b537a91e70fb75`, bytegleich zum geprüften Repo-Modul.
- Python für diese Sperre: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-python311/bin/python`.
- Katalog: `/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102`.

Aus `app.cjs` wurden ausschließlich diese nicht geheimen Pfadwerte gelesen; aus der privaten Konfiguration nur der Python-Pfad. Keine Zugangsdaten ausgegeben, keine App importiert/gestartet. [Alle acht Dokumentenstämme](../measurements/2026-11-18-font-connection-webroots.json) wurden in Plesk gelesen und physisch bestätigt. Der Planordner `/var/www/vhosts/gravuru-designwerkstatt.de/private/font-connection-plans` liegt außerhalb sämtlicher acht und existiert weiterhin nicht.

## Tests und Vergleich

[121 gezielte Fälle](../measurements/2026-11-18-font-maintenance-tests.json): 115 bestanden, 0 fehlgeschlagen, 6 unter Windows übersprungen (fünf bestehende POSIX-/Symlink-Fälle und eine echte Linux-fcntl-Gegenprobe). Nach abschließender Einstieg-/Lock-Code-Prüfung die neun betroffenen Befehlsfälle erneut grün (einschließlich zusätzlichem Abbruch mit fehlgeschlagenem idempotentem Schließen; insgesamt 122 unterschiedliche Fälle, 116 bestanden, sechs übersprungen); Linux-Gegenprobe bleibt für Claude. Der Leser-Fix wurde zusätzlich gegen Galerie-/Modul-/Aktivierungsfälle geprüft: 36 bestanden, zwei bestehende Fälle ohne private 404-Kandidatendatei übersprungen. Der normale native 404-Varianten-Anschluss gehört zu den 115 bestandenen Fällen und benötigt keine private Datei.

Nachgewiesen: falsche/fehlende Planfreigabe vor Lock/DB abgewiesen; zweiter gültiger Plan trotz Freigabe des ersten gesperrt; Reihenfolge Lock → Konfiguration → native Öffnung → ein Aufruf → Schließen → Freigeben; Code-/Startfehler, Lockverlust und Abbruch ohne automatischen Folgeversuch; geänderte Einstiegsdatei oder fremder Codepfad vor nativer Öffnung abgewiesen. Die Linux-Probe benutzt die echte `lockTestData`-Funktion, zwei Prozesse, sauberes Ende und SIGKILL; sie muss zusätzlich im konkreten Server-Dateisystem an isolierten Daten geprüft werden.

Der echte native Laufzeittest sät einen wartenden Exportauftrag sowie laufende AI-Einzel-/Stapelaufträge. Öffnen, Planen und Schließen erhalten deren Zeilen vollständig; jeder Versuch, ein Intervall anzulegen, würde den Test fehlschlagen lassen. Kein Vorschau-Server/Webhook, kein verbleibender Timer. Der Normalmodus bleibt der Standard und behält seine bisherige API. Windows bildet in diesem Test nur POSIX-Modusbits nach; die verfügbare Schriftliste ist ausdrücklich synthetisch. Echte TTF-/Glyphenprüfung ist keine Behauptung dieses Tests.

Vergleich im selben synthetischen Profil: vor/nach Wartungsplanung unveränderte Produktrevision und AI-/Exportzeilen, 0 Hintergrundintervalle, eine reine Produktlesung, keine Ausführung. Laufzeit im Messbeleg. Der frühere A-Vergleich ist durch diesen B-Nachweis ersetzt. Das ist **keine** gemessene Live-Unterbrechung, Handygeschwindigkeit oder Server-RSS-Verbesserung; diese Punkte bleiben offen.

## Claudes Linux-Review und Nacharbeit

[Review auf 5b6d1a5](https://github.com/Chris83638w/gravuru-2027/pull/258#issuecomment-6972826584): echter Linux-Locktest grün, Galerie-/Modul-/Leserfälle 38/38. Ganze Werkstatt-/Skript-Suite: 2.112 Fälle am Head gegen 2.096 auf der abgenommenen Basis; neben den zwei neuen Fixture-Rechtefehlern dieselben 188 Fehlschläge auf beiden Ständen. Die einzeln angesehenen Fälle betreffen fehlende Druck-/Gravurausgabe in Claudes Umgebung; nicht alle 188 wurden einzeln untersucht. Keine Behauptung einer vollständig grünen Gesamtsuite.

P1 behoben: native Testablage ausdrücklich 0700, produktive Schutzprüfung unverändert. P2 behoben: auch `GRAVURU_KATALOG` und `GRAVURU_PYTHON` müssen als feste Werte im geprüften App-Einstieg genau passen. Gegenproben mit jeweils falschem Pfad und trotzdem passender Einstiegs-Prüfsumme scheitern vor Konfigurations-/DB-Öffnung. Modellbau/Seed bleiben wie im Normalstart; bestätigter Python, leerer PYTHONPATH und private Dateimaske wie im Händlerstart. Bei teilweise fehlgeschlagenem Konstruktor bleibt die Sperre bis zum CLI-Prozessende. Abschließend 11/12 betroffene Fälle lokal grün, 0 fehlgeschlagen, eine echte Linux-Probe unter Windows übersprungen. [Claude nimmt b0baaee ab](https://github.com/Chris83638w/gravuru-2027/pull/258#issuecomment-6972983893): 106/106 gezielte Fälle unter Linux, 0 übersprungen, beide Pflichtpunkte und die drei Nachträge bestätigt. Eigene Gegenproben mit echter Sperre/Einstiegsprüfung weisen falschen Katalog, falsches Python, veränderten Einstieg und belegte Sperre vor Konfigurationslesung/Planablage ab. Keine offene Code-Nacharbeit.

Für den Einspielplan: die Kundenhostdatei ist nur gegenüber der PR-Basis bytegleich. Die Abweichung zu Live 9af3a1ac stammt bereits aus 726787b0 der bestehenden Kette und muss zusammen mit den übrigen Vorgängern eingespielt/geprüft werden.

## Generalprobe und Einspielplan, noch nicht ausgeführt

1. Claudes unabhängiges Review dieses B-Kandidaten, besonders Leser, früher Wartungszweig, Linux-Locks und ausschließlich SHA-gebundene Ausführung.
2. Generalprobe zugleich als Wiederherstellungsprobe an einer **privaten konsistenten Kopie ohne App-Stopp** vorbereiten. Das vorhandene `snapshot-merchant-data.py` verlangt die exklusive laufzeitweite Sperre und ist dafür ungeeignet. Keine einfachen Kopien laufender SQLite-Dateien. Online-Sicherungsweg muss zusammengehörige Datenbanken/WAL-Stände sowie Katalog/Ressourcen nachweislich erhalten; Verfahren noch offen, nicht als vorhandene Funktion behauptet. Keine Serverkopie bisher erstellt.
3. Sicherung in einen getrennten privaten Bereich zurückspielen; Integrität, Tabellen-/Bestandszähler, Profile, alte Entwürfe/Bestellungen und Originalressourcen vergleichen. Dort exakt denselben Kandidatencode und dieselbe Lockdatei-Logik verwenden. Native Öffnung bei belegter Sperre in beiden Richtungen und nach hartem Abbruch prüfen.
4. Katalog-PR192/Poppins und Herkunft der vorhandenen 16er-Liste auf der Kopie vorbereiten, bestätigte 29er-Liste über den bestehenden Backendweg synchronisieren. Kein globaler Standard und keine Produktbindung durch diese Vorarbeit. Der Merge des Katalog-PR ist nicht von Astra veranlasst; kein stilles Übernehmen in den Live-Katalog.
5. Auf der Kopie Plan, Ausführung der exakt freigegebenen Test-SHA, Wiederholung/Abbruchbehandlung und Rückweg durchspielen. Gesamten Stopp-/Start-/Schließablauf und Speicherbedarf messen. Zusätzlich prüfen, ob Plan-SHA der konsistenten Kopie und des gleichen Bestands bei gleichen Abhängigkeiten übereinstimmen. Erst bei Nachweis könnte das erste Live-Wartungsfenster entfallen; derzeit keine solche Behauptung.
6. Chris erhält den konkreten geprüften Ablauf und gemessene Unterbrechung. Produktiv erst nach seinem „live“: genaue Codefolge #255 → #256 → #257 → #258, passender Katalogstand, konsistente Sicherung, derselbe installierte Code für App und Wartung. Die Vorlage muss auf diesen belegten Einstieg/SHA aktualisiert werden. Dann gegebenenfalls zwei getrennte Wartungsfenster (Plan, später Ausführung); keine erfundene Dauer.
7. Pilot bleibt Leuchtturm 12×8/R4 mit exakt fünf Varianten. Keine Sammelveröffentlichung der 1.071 Produkte und keine neue Verkaufsfreigabe der 98 bisher nicht freigegebenen Themenprodukte. Claude prüft anschließend Schriftwahl/Designschriften, Text, Speichern/Wiederöffnen und vollständigen Warenkorbweg im gleichen Handy-/Netzprofil; Oberfläche/Bedienung bleiben erhalten. Zielbild Variante C, keine 5-Sekunden-Regel.

Rückweg: vor Datenänderung bisherigen Code-/Katalogstand verwenden; nach Profil-/Schemaänderung nur den an der Kopie geprüften Rückweg. Nach Produktbindung neuen geprüften `restoreRevision`-Plan auf den wirklich früher gebundenen Stand, keine alte DB über neue Kundenbestellungen kopieren. Ein Abbruch kann eine eigene ungebundene Revision hinterlassen; alter Kundenstand bleibt gebunden. Wiederanlauf ausschließlich mit dem vollständigen gespeicherten Plan gemäß PR257. Defekte Plandateien nicht überschreiben/löschen, nur nach Rückmeldung an Chris getrennt archivieren. Keine automatische Löschung; die 45 Tage für Kundenentwürfe werden nicht auf Prüfbelege übertragen.

Genau nächster Schritt nach Codeabnahme: gemeinsam mit Claude den konkreten Online-Kopierlauf mit gemeinsamem Pin-Fenster, WAL-Überwachung, Zeit-/Speichergrenzen und Wiederherstellungsprüfung an der privaten Kopie vorbereiten. Kein Merge, Deploy, Server-Schreibzugriff oder Live-Wartungslauf.
