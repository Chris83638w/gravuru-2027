# Echte HTTPS-Testabnahme · 07.10.2026

## Zugang und Umfang

**Testinstanz:** https://test-2027.gravuru-designwerkstatt.de/werkstatt/

Die neue Instanz liegt getrennt von der laufenden Werkstatt auf dem vorhandenen Plesk-Server. Testbenutzer: `gravuru-test`. Das unabhängig erzeugte Testpasswort liegt ausschließlich in Plesk unter **Dateien → Basisverzeichnis → private → gravuru-2027-test-config.json → `GRAVURU_TEST_PASSWORD`**. Dort sicher übernehmen, beispielsweise in den eigenen Passwortmanager; nicht in Chat, Git oder ZIP kopieren. Die Plesk-Anmeldung ist ein anderer Zugang. Die Datei und ihr Elternordner sind nur für den Anwendungseigentümer zugänglich (0600/0700).

[Aktuelles Installationspaket](../../deliverables/plesk-private-test-accepted-20261007/README.md), Quellcommit **`e157a865327aea859d8e9e91cd6c04cd6a87c8ff`**, 27.193.061 Bytes, SHA-256 `d3f99c19c101eab2b7059accbad4fd13fd64a4dbc3d3c03cf372b0898a087ae4`. Alle 361 manifestierten Dateien der Installation sind gegen dieses ZIP verifiziert. Private Konfiguration, Datenbanken und Originaluploads wurden beim Update nicht ersetzt.

Dies ist eine technische Abnahme der hier aufgeführten synthetischen Testabläufe. Die vollständige Shopify-Bestellstrecke, physische Maschinenfreigabe, Drive und kostenpflichtige KI sind nicht abgeschlossen.

## Tatsächlich eingerichteter Betrieb

- Neue Test-Subdomain, Plesk Site 19 in bestehendem Abonnement 14. Bestehende Bereiche zuerst geprüft; Live-Werkstatt, `ai`, `assistent` und `team` nicht übernommen.
- Plesk 18.0.81, LiteSpeed 6.3.7, Node.js 24.21.0. Der Server verwendet LiteSpeed; Passenger-Direktiven wurden nicht als wirksame LiteSpeed-Konfiguration ausgegeben.
- Private Python-Umgebung mit Python 3.11.16 aus `/opt/alt/python311/bin/python3`, SQLite und Cairo. Der zunächst in der Konsole verfügbare System-Python 3.12 ist in der Weblaufzeit nicht ausführbar; deshalb eigener unterstützter Alt-Python-Interpreter für diese Testinstanz. Keine Systeminstallation verändert.
- `npm run plesk:prepare` und `npm run plesk:check` auf dem Server jeweils mit Exitcode 0 abgeschlossen. Vorbereitungszeitlimit auf begrenzte 15 Minuten erhöht, nachdem die erste Installation an fünf Minuten abbrach. Kein erneuter vollständiger Installationslauf für spätere reine Code-/UI-Korrekturen.
- Anwendung: `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-2027-test`, Document Root ausschließlich `public`, Startdatei `app.cjs`.
- Private Daten: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-test-data`; Python: benachbart `gravuru-2027-test-python311`. Beide getrennt von Produktionsdaten und öffentlichem Webverzeichnis.
- Gültiges HTTPS-Zertifikat, vorgeschaltete Basic-Anmeldung, exakter Host-/Origin-Schutz, CSRF-Prüfung und `no-store`/`noindex`. TLS-Prüfung blieb aktiv.
- Genau ein laufender LiteSpeed-App-Prozess beobachtet. 20 parallele Leseaufrufe jeweils HTTP 200; zweiter Zugriff auf die Laufzeitsperre abgewiesen. Die Sperre bleibt aktiv. Keine globale Prozess-/Servereinstellung geändert.

## Tatsächliche Serverprüfungen

| Bereich | Ergebnis |
| --- | --- |
| Anonymer App-Zugriff | Status, API und Dashboard jeweils HTTP 401 |
| Private Dateipfade | `.env` HTTP 403 durch Webserver; Manifest, Programmdateien, private Pfade und Test-ZIP HTTP 404, auch angemeldet |
| Schutz vor fremden Requests | Fehlender CSRF-Token und fremde Origin jeweils HTTP 403 |
| Excel/ZIP | Drei Zeilen, zwei gültig und eine fehlende Quelldatei; gültige Produkte gespeichert, PDF-Seite 2 und Originalbytes geprüft |
| Wiederaufnahme/Korrektur | Ohne ZIP wieder geöffnet; nur Fehlerzeile exportiert/korrigiert; genau ein fehlendes Produkt ergänzt; Wiederholung ohne Duplikate oder Änderung früherer Produkte |
| Ordnerimport | Relative Unterordnerreferenz übernommen; genau ein weiteres synthetisches Produkt |
| Ausführungsgruppe | Zwei feste Produktrevisionen; Prüfung gespeichert/geöffnet/ausgeführt; Wiederholung ohne zweite Gruppe |
| Dashboard/Acryl-Konfigurator | Kopie bearbeiten, speichern, festen Revisionslink im vorhandenen Editor öffnen; Fotozuschnitt, Graustufen, Text und unveränderlichen Prüfstand erzeugen |
| Freie Gestaltung | Eigener Text, Motiv und Foto bearbeiten/speichern/wieder öffnen; fehlenden freien Platz korrekt ablehnen; Graustufen nach abgeschlossener Uploadprüfung dauerhaft gespeichert |
| Echter Neustart | Produkte, Revisionen, gespeicherte Importprüfungen, Gruppe und private Entwürfe erhalten; geöffnete Seite mit ungespeichertem Text kann nach Neustart ohne Neuladen genau einmal speichern |
| PDF-Ausgabe | Acryl 150 × 200 mm und Form 100 × 80 mm jeweils Roland kombiniert sowie Mimaki Farbe/Weiß; gespeicherter Download bytegleich wiederholbar |
| Bildschirmgrößen | 1440/390/768 Pixel; kein horizontaler Überlauf oder JavaScript-Fehler in den geprüften Abläufen |

[Maschinenlesbarer Serverbericht](hosted-acceptance-20261007/report.json), [PDF-Prüfwerte](hosted-acceptance-20261007/pdf-checks.json), [mobile Gestaltung](hosted-acceptance-20261007/form-design-390.png). Die PDF-Dateianalyse mit PyMuPDF/Ghostscript erfolgte lokal an den tatsächlich auf dem Server erzeugten und heruntergeladenen Dateien. Die erste große Acryl-Ressourcenladung überschritt 30 Sekunden; das bleibt ein beobachteter Erstladeaufwand, keine behauptete Geschwindigkeitsabnahme.

## Behobene Fehler und gezielte lokale Nachweise

1. LiteSpeed darf nur den äußeren geschützten Listener übernehmen; der innere Listener bleibt an Loopback gebunden.
2. Plesk-npm-Skripte und Webprozess erhalten dieselbe Konfiguration aus einer privaten Datei; Interpreter für die Weblaufzeit statt nur die Konsole gewählt.
3. Der Testproxy reicht `X-Gravuru-Draft` nach der Basic-Anmeldung weiter. Vorher erhielt ein berechtigter Entwurfsabruf HTTP 404; nach Korrektur HTTP 200. Falsche/fehlende Tokens bleiben gesperrt.
4. Automatisches LiteSpeed-Prozessende darf offene Formulare nicht durch wechselnde CSRF-Tokens entwerten. Token im privaten Teststart an Adresse/Benutzer/Passwort gebunden; Passwortwechsel invalidiert alte Anmeldung und Sitzung. Standardsitzung und Shopify-Sitzung unverändert.
5. Neu gerenderte Foto-Regler bleiben während der Uploadvorschau gesperrt. Vorher konnte eine schnelle Farbauswahl angezeigt, aber verworfen werden. Reproduzierbar vor Korrektur fehlgeschlagen, danach lokal und auf dem Server bestanden.

[Sieben Paketprüfgruppen](plesk-session-package-20261007/report.json) für die Laufzeit, drei passende HTTP-Prüfungen, [neuer Foto-Browsertest](hosted-acceptance-20261007/photo-busy-report.json) und [gezielter Entwurfs-/Konflikttest](hosted-acceptance-20261007/draft-loading-regression.json). Frühere breite Abnahmen unverändert übernommen. Das letzte ZIP verändert gegenüber dem geprüften Laufzeitpaket nur Fotobedienung und Anleitung; Manifest/CRC/Dateihashes und tatsächliche Serverdateien zusätzlich geprüft.

## Bedienung und Betrieb

1. Testlink öffnen, mit dem separaten Testzugang anmelden. Unter Produkte liegen ausdrücklich synthetisch benannte Beispiele. Für eigene Erprobung eine Kopie verwenden.
2. Produktserien: Vorlage ausfüllen, passenden Master wählen, lokale Datei/Ordner/ZIP bewusst auswählen, prüfen, Prüfung speichern und erst danach anwenden. Fehlerdatei enthält die gezielt zu korrigierenden Zeilen; stabile Importschlüssel erhalten.
3. Kundenansicht stets aus einem gespeicherten Produktstand öffnen. Entwurf speichern; die Sicherung zur Werkstattprüfung erzeugt einen neuen unveränderlichen Prüfstand, noch keine Bestellung.
4. Unter Prüfstände/Ausgaben die gewünschte Roland- oder Mimaki-Ausgabe erzeugen. Mimaki-Farb-/Weiß-Paar 1:1 mit identischem Ursprung verwenden, nicht unabhängig beschneiden oder nochmals spiegeln.
5. Neustart nur unter Plesk → Node.js **dieser Test-Subdomain** → App neu starten. Private Daten nicht löschen. Die Einzelsperre nicht entfernen.
6. Passwortänderung ausschließlich in der privaten Testkonfiguration, danach Test-App neu starten und Browser neu anmelden. Niemals Plesk-/Shopify-Passwort als Ersatz für den separaten Testzugang übernehmen.

## Shopify: neuer belegter Stand und verbleibender Anschluss

Der historisch genannte App-Schlüssel ist heute als reguläre Datei mit 0600 und passendem Eigentümer vorhanden. Ein eigener Node-Prozess auf dem Server hat ihn ausschließlich intern verwendet: Client-Credentials-Anmeldung **HTTP 200**, danach Admin GraphQL **HTTP 200, keine GraphQL-Fehler**. Shop `gravuru-design.myshopify.com`, App **Gravuru Konfigurator**, App-ID `423276544001` stimmen überein. Kein Connector als Ersatz verwendet, keine Tokenwerte ausgegeben oder in das Paket übernommen, keine Shopmutation gesendet. [Shopify-Verfahren](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant).

API-Version `2026-07` vom Server bestätigt. Vorhandene Berechtigungen umfassen Produkte, Dateien, Metaobjects, Veröffentlichungen und Cart Transforms; **`read_orders` fehlt**. Produkt-/Variantenkandidaten mit aktuellen Preisen konnten gelesen werden; keine Variante wurde zugeordnet. Der Shop ist **Shopify Plus, `partnerDevelopment: false`**. Ein Produktname mit „Test“ belegt weder einen sicheren Zahlungsweg noch ausgeschaltete Produktionsautomationen.

Der installierte private Paketstart meldet weiterhin korrekt **`shopifyConnected: false`**: Die erfolgreiche separate Leseprobe aktiviert keine eingebettete Händleranmeldung, Storefront-/Warenkorb-Anbindung, Webhooks oder Kundenkonto-Dateifreigabe. Es fehlen die ausdrückliche Testvariantenwahl, ein bestätigter Weg ohne Belastung/Produktionsauslösung und die Aktivierung der passenden Laufzeitintegration. Vor Änderung von App-Berechtigungen, App-URL, Redirects oder Webhooks zuerst konkrete Änderung mit gesichertem Altstand/Rückweg zur Freigabe vorlegen. Keine zweite App und keine globale Umstellung der Zahlungen.

Der Nutzer wurde nach einem bereits vorhandenen getrennten Testshop/Testzahlungsweg gefragt. Solange dieser Weg fehlt, keine echte Bestellung auslösen. Ein fehlendes App-Secret ist dagegen nicht länger der Blocker.

## Noch externe bzw. fachliche Abnahmen

- Reale Shopify-Testbestellung, signierte echte Bestellzuordnung und kaufgebundene Kunden-Dateifreigabe. Vorhandene synthetische Nachweise bleiben gültig.
- Die Acryl-Oberfläche „Im Kundenkonto speichern“ ist noch nicht an eine echte Kundenanmeldung angeschlossen. Der private Werkstatt-Prüfstand mit Originalfotos ist gesichert; automatisches Wiederladen eines Kundenkonto-Entwurfs im Acryl-Editor wurde nicht als bestanden ausgegeben. Form-Entwürfe wurden dagegen einschließlich Wiederöffnung geprüft.
- Physischer Roland-/Mimaki-RIP, Weiß-/Konturzuordnung, Spiegelung und Druck auf dem Material; freigegebene ICC-/Material-/Schriftprofile nicht erfinden.
- Eigene Google-Drive-Autorisierung: laut Nutzer noch kein Cloud-/OAuth-Projekt eingerichtet.
- KI-Designassistent der App: Anbieter und Kostenrahmen nicht entschieden; keine kostenpflichtige API-Nutzung gestartet.
- Physische Touch-/Geräte- und fotografische Licht-/Materialabnahme sind durch Browseremulation und synthetische PDF-Proben nicht ersetzt.

Die Produktivumschaltung bleibt eine gesonderte Freigabe. Keine Live-Werkstatt, Produktionsdatenbank, globalen Servereinstellungen oder bestehenden Shopify-App-Einstellungen verändert.
