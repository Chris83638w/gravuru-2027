# Zwei geprüfte private Sicherungen und gemeinsamer ID-Prüfanschluss

Fortsetzung auf `task/universelle-konfi-anbindung-20261022`, Ausgangscommit
`4d660594b21560f048fcadcd9a4683661471c81b`. Der vorherige
[Anschlussbericht](2026-10-22-universelle-konfigurator-anbindung.md) bleibt als
Ausgangsbefund erhalten. Dieses Dokument aktualisiert dessen Sicherungsstand.

## Tatsächlich erledigte Sicherung

Beide laufenden Datenbestände wurden am 22.10.2026 unter gemeinsamer Wartungspause
mit dem vorhandenen SQLite-Backupverfahren getrennt gesichert. Der ursprüngliche
Anwendungseinstieg wurde bytegleich wiederhergestellt; beide Runtime-Sperren
waren anschließend wieder gehalten. Die beiden privaten Session-APIs verlangten
erneut Anmeldung, die Acryl-Oberflächendatei antwortete mit HTTP 200.

Das private Paket wurde auf den Rechner des Nutzers heruntergeladen und mit einer
unabhängigen Server-Prüfsumme verglichen. Es enthält sechs SQLite-Sicherungen,
beide tatsächlich installierten Quellstände, statische Ressourcen, Startdateien
und ein Manifest mit allen Einzeldateihashes. Zugangskonfiguration und laufende
WAL-/SHM-Dateien wurden nicht aufgenommen. Drei regenerierbare Python-Caches
wurden bewusst ausgelassen. Keine Datenbanken, Kundendateien oder privaten
Wiederherstellungsberichte werden mit diesem GitHub-Paket übertragen.

Prüfung auf dem Nutzerrechner: ZIP-CRC und alle Dateihashes bestanden; beide Stores
in neue, getrennte Testordner wiederhergestellt. Alle sechs Datenbanken bestanden
`integrity_check`, `foreign_key_check` und die geprüften Quellen-/Revisionsbezüge.
Originalsnapshot und Wiederherstellung blieben bytegleich. Auch die zusätzlichen
Korrektur- und Variantenprüfungen bestanden.

- Legacy: 31 Produkte und 3 Master, 94 Produktrevisionen, 102 Designoriginale, 1 gespeichertes
  Materialoriginal, 16 Prüfstände.
- Acryl: 798 Produkte und 1 Master, 3991 Produktrevisionen, 90 Designoriginale, 161 Konturen,
  7 Korrekturrevisionen zu 7 Designzuordnungen, 1 Variantengruppe mit 5 Revisionen
  und 798 aktuellen Mitgliedschaften.
- Acht historische Materialoriginale und ihr Referenzarchiv wurden zusätzlich
  lokal gefunden, gegen die tatsächlichen Herkunftsnachweise geprüft und privat
  mitgesichert. Keine Neuerzeugung von Materialbildern.

Der Legacy-Zusatzprüfer musste an das belegte ältere Einmandanten-Schema angepasst
werden. Der ursprüngliche Fehlbericht wurde beibehalten, ein neuer Erfolgsbericht
separat gespeichert. Keine Datenmigration oder Änderung von Statuswerten.

Ein vollständiger Appstart aus der Sicherung ist weiterhin **nicht nachgewiesen**:
Die unveränderte Serverhülle setzt Linux/POSIX und gesonderte Zugangskonfiguration
voraus. Datenwiederherstellung und laufender Originalhost wurden geprüft, nicht
ein neuer vollständiger Ersatzserver. Ältere lokale Datenbestände außerhalb der
zwei aktuellen Stores sind damit nicht automatisch mitgeprüft.

## Neuer Anschlussbaustein

`shop-product-binding-adapter.mjs` verbindet den bestehenden ID-Planer mit bereits
geöffneten Werkstattinstanzen. Er öffnet keine zusätzliche Datenbank und führt
keine Migration aus. Shop, Mandant und Store kommen aus dem Serverkontext.
Grundpreis und Ausführungen kommen unverändert aus `prepareShopProduct`;
Fertigungsprofile aus der vorhandenen Profilauflösung. Beide Produktschemata
werden unterstützt; es gibt keine Beschränkung auf Acryl und keinen zweiten
Preis- oder Geometriealgorithmus.

`shop-product-binding-check.mjs` prüft ausdrücklich angefragte ProductGIDs und
VariantGIDs über die vorhandene `inspectVariants`-Leseschnittstelle. Produkt,
Revision, Optionen, Preis und Elternprodukt müssen zusammenpassen. Während der
Netzwerkabfrage geänderte Produkt-, Profil- oder Bindungsdaten werden erkannt.
Bestehende widersprüchliche Zuordnungen werden nicht überschrieben.

Der neue geschützte Endpunkt lautet:

`POST /api/workshop/shop-product-bindings/check`

Er liegt hinter der vorhandenen Händleranmeldung und CSRF-Prüfung. Zulässig ist
nur `{selections:[{shopifyProductId,shopifyVariantId,productId,productRevision,options}]}`,
mit höchstens 100 Zuordnungen und höchstens 64 KiB Requestgröße. Browserseitige
Preise, Shop-Belege, Store-/Mandantenangaben und Profilkonfigurationen werden
abgelehnt. Der Server muss `shopBindingRead:{storeId,reader}` ausdrücklich
konfigurieren; `reader` ist die bereits vorhandene, serverseitig erzeugte
Admin-Leseschnittstelle. Standardmäßig bleibt die Funktion nicht eingerichtet.
Keine Mitarbeiterroute wird als Kundenroute freigegeben.

Ergebnisse sind ausschließlich `private-read-only-check`, `written:false`,
`shopifyWrites:false`, `publicAccess:false`, `checkoutEnabled:false`.
`id-plan-ready` bedeutet nur, dass ein privater Zuordnungsplan geprüft werden konnte.
Es ist keine Aktivierung, Shopveröffentlichung, Fertigungs- oder Checkoutfreigabe.
Nach der Nutzerentscheidung vom 22.10.2026 werden ID-Zuordnung und Fertigungsfreigabe
getrennt: Ein noch nicht zugeordnetes Fertigungsprofil darf den privaten ID-Plan
nicht verhindern. Der Check nutzt ausschließlich serverseitig den Zweck
`id-binding`; `profile-bound` bleibt der strikte Standard des bisherigen Planers.
Ein tatsächlich vorhandener, aber ungültiger Profilverweis bleibt ein Fehler.
Fehlende Vorgaben werden ausdrücklich als ausstehende Profilzuordnung gemeldet;
`productionReady` bleibt in allen Fällen `false`. Vollständigkeit gilt ausschließlich für
die angefragten Varianten, nicht automatisch für den gesamten Katalog.

Die bestehende Benutzeroberfläche, die beiden Editoren, Produktdokumente,
Korrekturen, Original-IDs, Preise und historische Bindungen werden nicht ersetzt.
Dieser Quellstand wurde noch nicht auf dem Server installiert; Shopify wurde
durch diesen Anschlussbaustein nicht geändert.

## Gegen tatsächliche Sicherungsdaten geprüft

Der zusätzliche Offline-Abgleich nutzte ausschließlich unveränderliche Lesezugriffe
auf die sechs wiederhergestellten Datenbanken, ohne Runtime-Konstruktoren,
Migrationen oder Shopify-Aufrufe. Alle 829 Produkte ließen sich über die bestehende
`prepareShopProduct`-Logik vorbereiten: 31 Legacy-Produkte mit 834 Ausführungszeilen
und 798 Acrylprodukte mit je einer festen Ausführung. Pro Produkt wurde eine echte
Auswahl durch den Adapter geprüft. Vier Master sind zusätzlich enthalten.

Eine zunächst fehlende optionale Original-Motivdatei in der lokalen Teilkopie
verursachte einen vorläufigen Acrylfehler. Die Datei wurde unverändert aus dem
gepinnten GitHub-Stand ergänzt. Der anschließende vollständige Lauf war erfolgreich;
es gab keine Reparatur oder Änderung der gespeicherten Motive oder Produkte.
Die vorläufigen privaten Diagnostikberichte bleiben als solche erhalten.

Legacy besitzt 2295 bestehende Bindungen/Ausführungszuordnungen, Acryl bisher keine.
In beiden Stores bestehen derzeit keine versionierten Fertigungsprofile und keine
Produktverweise darauf. Das ist kein Verlust der fünf Konfiguratorvarianten.
Alle Datenbank- und benannten Quellhashes blieben vor und nach dem Lauf identisch.
Dieser Offline-Lauf ist kein neuer Shopify- oder Checkoutnachweis.

## Bestätigter Ablauf für Fertigungsvorgaben

Der Nutzer möchte diese beim Erstellen der Unterkategorien festlegen. Vereinbartes
Ziel: Vorgaben zentral wiederverwenden, einer Unterkategorie als Standard zuordnen,
passend zu Material, tatsächlicher Stärke und Verfahren auf Produkte übernehmen
und begründete Ausnahmen pro Produkt zulassen. Bereits bestellte Stände dürfen
sich durch spätere Vorlagenänderungen nicht verändern.

Die automatische Vererbung und die entsprechende Bedienoberfläche sind noch
nicht implementiert. Es werden weder Profile erfunden noch vorhandene Produkt-
oder Bestellrevisionen rückwirkend geändert. Shopify-ID-Zuordnung und Testbestellungen
sollen unabhängig von dieser späteren Fertigungsfreigabe geprüft werden können.

## Noch offene Umsetzung

1. Den privaten Prüfanschluss mit eindeutigem Store und vorhandenem Admin-Leser
   in der Testhülle konfigurieren; zuerst eine konkrete Form- und eine native
   Ausführung prüfen. Dabei aktuelle Shopify-Belege erneut abrufen.
2. Die bestätigte Zuordnung über Unterkategorien separat umsetzen. Tatsächlich
   passende Fertigungsprofile vor der Fertigungsfreigabe prüfen und zuordnen.
   Die fünf Oberflächen-/Materialvarianten sind keine vorhandenen versionierten
   Fertigungsprofile. Maschinen-/ICC-Freigaben nicht erfinden; gespeicherte
   Designkorrekturen beim Erzeugen neuer Produktrevisionen erhalten. Fehlende
   Maschinenkalibrierung nicht als Voraussetzung eines Shopify-ID-Tests behandeln.
3. Für operatives Speichern die vorhandene `bind`/`bindVariants`-Transaktion
   erweitern: Produkthead innerhalb derselben Transaktion erneut prüfen und
   expliziten aktiven Store-/Bindingstand festlegen. Keine Auswahl nach „erster“
   oder „neuester“ Datenbankzeile. Bisher speichert `form_shop_bindings` keine
   Shopify-ProductGID; die Elternzuordnung braucht deshalb einen eigenen
   bestätigten Nachweis. Kein zweites Optionsregister neben den vorhandenen
   `form_shop_binding_selections`.
4. Kundenberechtigung, Warenkorbbearbeitung beider Editoren, vollständige
   Preisstaffel, Bestelleingang und gesperrte Testfertigung anschließend wie im
   vorherigen Anschlussbericht abnehmen. Kein abgeschlossener Checkoutnachweis
   durch dieses Paket.

## Plattformbeleg

Die vorhandene Admin-Leseschnittstelle bleibt bei der ausdrücklich konfigurierten
Version 2026-07. ProductVariant liefert Produktbezug, Varianten-ID und Preis;
`read_products` ist die dokumentierte Leseberechtigung. Quelle:
[Shopify ProductVariant 2026-07](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/ProductVariant).
Keine zusätzlichen Berechtigungen, neue API-Version oder neue Schreibschnittstelle.

## Prüfungen

Abschließend 118 lokale Tests bestanden: 29 Planer-, 30 Prüfdienst-, 15 Adapter-,
13 bestehende Commerce-/Options-/Warenkorbbearbeitungs- und 31 HTTP-Tests. Die nach
der Nutzerentscheidung betroffenen 74 Planer-/Prüfdienst-/Adapterfälle wurden
gemeinsam erneut erfolgreich ausgeführt, ebenso die 31 HTTP-Fälle. Ein dabei
erkannter abweichender Fehlercode im strikten Standard wurde im Code korrigiert;
der bestehende Adaptertest blieb unverändert. Keine übersprungenen Integrationstests.
Die HTTP-Tests nutzen echte lokale Anfragen
mit synthetischen Daten und Sitzungen; alle geprüften Anwendungstabellen der drei
Testdatenbanken blieben bei der ID-Prüfung unverändert.

Die vollständigen Sicherungs-/Restorewerkzeuge, Tests und Betriebsanleitungen
liegen separat in der privaten Übergabe beim Nutzer. Private Sicherungen und
Ergebnisberichte werden ebenfalls nicht auf GitHub veröffentlicht.

Reproduzierbare Testdateien (Node 24; für die vorhandenen Excel-Tests
`GRAVURU_PYTHON` auf Python mit `openpyxl` setzen):

- `app/workshop/shop-product-binding-plan.test.mjs`
- `app/workshop/shop-product-binding-check.test.mjs`
- `app/workshop/shop-product-binding-adapter.test.mjs`
- `app/workshop/http.test.mjs`
- `app/workshop/shopify-admin-host.test.mjs`
- `app/workshop/shop-product-binding-http.test.mjs`
- `app/configurator/variant-m/commerce.test.mjs`
- `app/configurator/variant-m/option-fields.test.mjs`
- `app/configurator/variant-m/cart-edit.test.mjs`

Aufruf jeweils mit `node --test --test-concurrency=1` und den genannten Dateien.
Die 122 lokal nachgeholten unveränderten Testabhängigkeiten sind im
`BINDING-ADAPTER-DEPENDENCY-ACQUISITION.json` auf Commit `4d660594…` belegt.
Das Repository enthält diese Originalquellen bereits. Es wurden keine
Materialbilder, Motivbibliotheken oder Editoroberflächen durch neue ersetzt.

## Vollständiger Umfang dieses Quellpakets

- Anbindung: `shop-product-binding-plan.mjs`, `shop-product-binding-adapter.mjs`,
  `shop-product-binding-check.mjs`, zugehörige drei Tests und beide
  `SHOP-PRODUCT-BINDING-*.txt`-Anleitungen unter `app/workshop/`.
- HTTP: begrenzte Ergänzung in `app/workshop/http.mjs` und der neue
  `shop-product-binding-http.test.mjs`; bestehende Routen bleiben erhalten.
- Sicherung/Restore und Offline-Bestandsprüfung: vollständige Werkzeuge,
  Testquellen und Anweisungen sind privat beim Nutzer erhalten. Sie sind bewusst
  kein Bestandteil dieses GitHub-Commits. Die automatische Freigabeprüfung hat
  den Upload von Sicherungs-/Serverbetriebsanleitungen abgelehnt; es wird keine
  alternative Veröffentlichung dieser Inhalte vorgenommen.
- Dokumentation: dieser Bericht und der Herkunftsnachweis der unveränderten
  lokalen Testabhängigkeiten. Die vorhandene `STATUS.md` bleibt auf GitHub
  unverändert: Die automatische Freigabeprüfung hat einen erneuten Upload ihrer
  umfangreichen historischen Betriebsinformationen abgelehnt. Dieser datierte
  Bericht ist deshalb der maßgebliche neue Einstieg für das aktuelle Paket.

Keine Datenbank, kein Sicherungsarchiv, keine Kundenfotos, privaten Prüfberichte,
Zugangskonfigurationen, Tokens oder lokalen Testlogs im Quellpaket. Kein Merge
nach main, keine neue Serverinstallation, keine Shopify-Produktänderung und keine
öffentliche Checkoutaktivierung durch diesen Commit.
