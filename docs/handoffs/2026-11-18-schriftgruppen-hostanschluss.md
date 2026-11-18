# Schriftgruppen: ausgeschalteter Anschluss an den echten Host

Auftrag: Chris, Anschluss der Bestandsprodukte an die bestätigten Gruppen mit Claude; nichts live ohne sein „live“. Folgebranch ab PR257/286ff2d, eigener PR. [Claudes Bedingungen](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6971734035) sind Grundlage dieses Vorbereitungspakets. Keine neue fachliche Regel, Schriftliste oder Produktfreigabe.

## Konkreter Anschluss

Die belegte Startkette bleibt `start-r5.cjs` → `app.cjs` → `scripts/acryl-employee-entry.cjs` → `createAcrylEmployeeHost`. Die Startdateien sind **unverändert** und übergeben die neue Option nicht. Kein neuer Umgebungswert aktiviert sie.

Nur eine spätere geprüfte private Code-Komposition kann `fontConnection` an `createAcrylEmployeeHost` übergeben. Dieser reicht sie unter seinem bestehenden nativen Datenlock an `createShopifyTestRuntime` weiter. Dort bekommt `connect` genau die bereits erzeugte native Werkstatt, deren Datenverzeichnis, den tatsächlich aufgelösten Katalogpfad und den fertigen `createGalleryProductionShopifyRead`-Adapter. Der Adapter verwendet intern den schon für diese Laufzeit erzeugten Tokenanbieter. **Der Schriftanschluss erhält weder Token noch Anbieter**, kann keine Shopify-Mutation ausführen und öffnet keine zweite Datenbank.

`scripts/lib/font-connection-host.mjs` hält die feste Ziel-/Gruppen-/Pfadkonfiguration privat, prüft den Hostkontext und erstellt Dienst plus Dateiplan-Operator mit jeweils **fest `executionEnabled:false`**. Es gibt dafür keinen Parameter, Env-Schalter, HTTP-Endpunkt oder Listener. Das Objekt bleibt beim privaten aufrufenden Code, nicht am HTTP-Server. `connect` liest keine Shopdaten, erstellt keinen Plan und führt nichts aus. Nach dem Schließen des Besitzers ist der Operator ungültig; ein gerade laufender Shop-Lesevorgang darf danach keine Plandatei mehr anlegen. Der Anschluss schließt die Werkstatt nicht selbst.

Der konkrete, im Integrationstest ausgeführte Aufruf lautet:

```js
const fontConnection = createFontConnectionHost({
  tenantId, shopDomain, dataDirectory, katalogRoot, planDirectory, webRoots,
  targets: pilot.targets, approvedSets: groups.approvedSets
});
const server = await createAcrylEmployeeHost({
  legacyRelease, dataDirectory, env, customerIntegration, fontConnection
});
// Separater privater Aufruf; niemals automatisch beim Start:
const saved = await fontConnection.operator().plan({targetId: 'leuchtturm-12x8'});
// execute bleibt in diesem Kandidaten auch mit gültiger Datei gesperrt.
```

Das ist ein nachgewiesener Anschluss an den tatsächlichen Instanzbesitzer, **noch kein von außen bedienbarer Pilotlauf**. Auf dem laufenden Server wurde kein solcher Aufruf ausgeführt, kein Verzeichnis angelegt und kein Code eingespielt. Der spätere Auslöser braucht eine eigene Prüfung.

## Webverzeichnisse und private Ablage

Die Plesk-Aboansicht `gravuru-designwerkstatt.de`, ID14, führt acht Websites auf. Alle acht Dokumentenstämme sind aus den jeweiligen sichtbaren Einstellungen gelesen; die Dateidomain verwendet kein Node.js. [Vollständiger Nachweis](../measurements/2026-11-18-font-connection-webroots.json). Der vorgeschlagene Planordner bleibt `/var/www/vhosts/gravuru-designwerkstatt.de/private/font-connection-plans`, bisher nicht angelegt. Die vollständige Liste, nicht nur die App-Domain, ist als `webRoots` zu übergeben. Vor einem späteren Lauf Plesk-Liste und reale Pfade erneut prüfen.

## Zwei Auslösewege zur Entscheidung mit Claude

| Punkt | A: privater Aufruf im Host | B: eigener Wartungsaufruf bei gestoppter App |
| --- | --- | --- |
| Besitz | Dieselbe bereits unter Lock geöffnete native Werkstatt, wie in diesem PR getestet. | Eigener Prozess nur unter **demselben** `ops/plesk/lock.mjs`-Lock des nativen Datenverzeichnisses; erst nach erfolgreicher Sperre öffnen. Kein gleichzeitiger Besitzer. Noch nicht gebaut. |
| Auslösen | Ohne zusätzlichen privaten Bedienkanal müsste ein geprüfter Einmal-Aufruf im privaten Code eingebunden werden. Ein ungeschützter Startauftrag ist ungeeignet. | Expliziter privater Befehl für `plan`, getrennt `execute <geprüfte SHA>`. Kein Server-HTTP-Endpunkt nötig. |
| Neustarts | Für Code-Aufrufe getrennte Aktivierungs-/Neustartphasen für Plan und Ausführung; mit anschließendem Entfernen des Aufrufs ggf. weitere. Ein exakter Ablauf ist noch auszuwählen. | Normalerweise zwei Wartungsfenster: App stoppen → Plan → Besitzer schließen → App starten; später dasselbe für Ausführung. Einspielung/Synchronisierung kann zusätzliche Neustarts erfordern. |
| Ungeplanter Neustart | Darf **niemals** einen Auftrag erneut auslösen. Ohne dauerhaft gesicherten Einmalauftrag/Abschlussstatus nicht zur Aktivierung geeignet. In diesem PR gibt es keinen solchen Auftrag. | Kein Autostart. OS gibt Lock nach Prozessende frei. Vor App-Neustart Prozessende und Sperrenfreigabe verifizieren, nicht eine Lockdatei löschen. |
| Abbruch | Vor Speicherung keine neue Produktrevision. Nach Produktrevision/vor Bindungswechsel eventuell eigene ungebundene Revision; alter Kundenstand bleibt gebunden. | Derselbe bereits geprüfte Plan-/Journal-Wiederanlauf aus PR257. Auch nach Unterbrechung keine zweite schreibende Instanz öffnen. |
| Rückweg | Ausgangseinstieg wiederherstellen; bereits gebundene Daten über geprüften `restoreRevision`-Plan zurückführen. | Wartungsprozess beenden, bisherigen Einstieg starten; Datenrückweg ebenfalls über neuen geprüften Rückwegplan. |
| Unterbrechungsdauer | **Nicht gemessen.** Kein Sekundenversprechen. Benötigt Generalprobe mit privater konsistenter Datenkopie und vollständigem Start-/Stop-/Sicherungsablauf. | **Nicht gemessen.** Gleiche Generalprobe plus tatsächliche Linux-Lock-Gegenprobe (App hält Lock → Wartung scheitert vor DB-Öffnung und umgekehrt). |

Technischer Vorschlag: **B zuerst prüfen**, weil der Prüfplan nicht allein zum Auslösen einen Kundenstartauftrag benötigt. Keine Umsetzung des zweiten Wegs vor Claudes Auswahl. Die Tabelle bestätigt keine Live-Unterbrechung; Chris erhält vorher den gemessenen Ablauf und den konkreten Freigabeumfang.

## Einspielplan, noch nicht ausgeführt

1. Exakte freigegebene Commitkette sichern: bestehender Live-Kandidat 9af3a1ac; Code-Pakete #255 → #256 → #257 → dieser Vorbereitungskandidat. Keinen dieser Branches durch `main` ersetzen und keine zusätzlichen Änderungen unbemerkt übernehmen. Katalog-PR192/Poppins bleibt eine eigene Abhängigkeit, kein von Astra veranlasster Merge.
2. Private konsistente Sicherung von nativer Werkstatt, Profilen, Ressourcen und allen zugehörigen Bestell-/Bindungs-/Journalständen, Katalogstand, Einstiegsdateien sowie vorhandenen vollständigen Prüfplänen. **Nicht** eine laufende SQLite-Datei ohne WAL/Transaktionskonsistenz kopieren. Verfahren und Wiederherstellung an separater Kopie prüfen; Integrität, Zähler und historische Entwürfe/Bestellungen vergleichen. Erst dann Dauer/Ablauf vorlegen.
3. Isolierter Kandidat: bestehende 16er-Profilherkunft prüfen/übernehmen, bestätigte 29er-Liste samt Poppins über den vorhandenen Backendweg synchronisieren. Keine Produktbindung oder globale Standardzuordnung dabei. PR256-Schema-Rückweg vorher an der Kopie prüfen. Das Ändern einer Profilquelle ist noch kein Produktanschluss.
4. Frischen Pilotplan für Leuchtturm 12×8, R4 und genau fünf belegte Varianten erstellen, privat dauerhaft speichern und erneut lesen. Plan prüft Shoppreise und vorhandene Zusatzpreisverträge. Jede Abweichung wird untersucht, nicht durch neue Annahmen freigegeben. Claude prüft den vollständigen Plan; Chris' „live“ ist Voraussetzung für produktive Ausführung.
5. Ausführung nur über den noch auszuwählenden und geprüften privaten Weg. Keine Sammelveröffentlichung der 1.071 Produkte, keine neue Freigabe der 98 bislang nicht freigegebenen Themenprodukte. Nach dem Lauf Bindungsrevision, fünf Preise, Zusatzpreise und Verkaufsfreigabe erneut belegen.
6. Claude prüft am selben Handy-/Netzprofil den gesamten Kundenweg mit unveränderter Oberfläche, Schriftwahl einschließlich Designschriften, Text, Speichern/Wiederöffnen und Warenkorb. Erst danach weitere konkret bestätigte Produkte. Das übergeordnete Ziel bleibt Variante C, kein erfundenes 5-Sekunden-Kriterium.

Rückweg pro Stufe: vor einer Datenänderung vorherigen Code-/Katalogstand verwenden. Nach Herkunft/Synchronisierung nur den dafür geprüften Schema-/Profilsicherungsweg; nach Produktbindung bevorzugt neue geprüfte Rückweg-Revision auf den nachweislich früher gebundenen Stand. Kein pauschales Zurückkopieren alter Datenbanken über zwischenzeitliche Kundenbestellungen. Bei einem unklaren Zustand zuerst stoppen und Bestand lesen. Eine defekte Plan-Datei wird nicht überschrieben oder automatisch gelöscht; nur nach Rückmeldung an Chris getrennt archivieren/umbenennen und Vorgang nachvollziehbar wiederherstellen.

## Prüfungen und Grenzen

47 gezielte Tests bestanden, keiner übersprungen: fünf neue Host-/Lebenszyklusfälle, neun bestehende Host-/Routingfälle, 23 Anschluss-/Operatorfälle und zehn bestehende Produktionsanschluss-/Privatkonfigurationsfälle. Zusätzlich Laufzeitkonfiguration: 18 bestanden, fünf bestehende POSIX-/Symlink-Prüfungen unter Windows übersprungen; diese Grenze ist keine Linux-Freigabe.

Der neue Hosttest verwendet den echten `createAcrylEmployeeHost`, die echte native Laufzeit und Datenbanken, den echten begrenzten Leser sowie den privaten Anschluss. Unbeteiligte Legacy-Laufzeit und Linux-Lockprozess sind Test-Stellvertreter; unter Windows wird nur die POSIX-Modusinformation der isolierten Verzeichnisse nachgebildet. Der echte Linux-Lock bleibt für Weg B gesondert nachzuweisen. Keine echten Zugangsdaten und keine Shopify-Netzverbindung.

[Vergleich im selben isolierten Profil](../measurements/2026-11-18-font-host-comparison.json): bestehender Einstieg ohne Anschluss gegen explizit übergebenen ausgeschalteten Anschluss; gleicher HTTP-Rückfall 404, keine Netzwerkzugriffe, kein Planverzeichnis und keine Ausführung. Startzeiten und Speicherstände sind als einzelne synthetische Beobachtung aufgezeichnet; warmer zweiter Durchlauf und Speicherbereinigung erlauben **keine** Aussage zur Livebeschleunigung oder zum höheren Server-RSS. Beides bleibt im Performance-Auftrag offen.

Reproduktion:
```text
node --test scripts/lib/font-connection-host.test.mjs app/workshop/acryl-font-host.test.mjs app/workshop/acryl-host-routing.test.mjs app/workshop/font-group-connection.test.mjs scripts/lib/gallery-production-connection.test.mjs scripts/lib/gallery-production-private-settings.test.mjs
node --test app/workshop/shopify-runtime-config.test.mjs
```

Genau nächster Schritt: Claudes unabhängige Prüfung dieses ausgeschalteten Kandidaten, Auswahl des privaten Auslösewegs und isolierte Generalprobe vor einer Live-Anfrage. Keine Liveänderung und kein Merge.
