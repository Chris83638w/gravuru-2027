## Aktuell: Getrennter Plesk-Testbereich eingerichtet, Installation läuft – 07.10.2026

Plesk-Browserzugang ist jetzt authentifiziert. Vorhandene Bereiche geprüft; neue separate Subdomain **test-2027.gravuru-designwerkstatt.de** (Site 19) angelegt, DNS und gültiges HTTPS bestätigt. Die bestehende Werkstatt und ihre Daten wurden nicht geändert. Tatsächlich aktiv: LiteSpeed 6.3.7, Plesk 18.0.81, Node 24.21.0, Python 3.12.14 und libcairo.

Zwei konkret vor Ort erkannte Hostingunterschiede behoben: LiteSpeed übernimmt nur den äußeren geschützten Listener; Plesk-npm-Skripte und App lesen eine getrennte Konfiguration aus einer privaten Datei (0700/0600, keine Geheimnisse im Git/ZIP). Quellcommit **47ffda076a870bf1085f16a3449dfc2cece7655c**, bisheriger Produktstand vollständig erhalten. [Aktuelles Installationspaket](deliverables/plesk-private-test-hosted-20261007/README.md), **25,9 MiB**, SHA-256 `b41590bb66e211594979e857bab843a1824f9941f6891973b1410612fe031785`.

**5 neue Node-Prüfungen und 5 gezielte Paketgruppen PASS**, einschließlich simulierter LiteSpeed-Übernahme, echter privater Konfigurationsdatei ohne App-Variablen, Imports, Zugriffsschutz und Neustart. Alle manifestierten Dateien des neuen Pakets auf dem Server unverändert bestätigt. Neue private Daten-/Python-Pfade angelegt; Installation läuft noch. Test-App bis erfolgreichem Vorabcheck deaktiviert; kein fertiger App-Link oder echte Server-Gesamtabnahme behauptet.

**Nächster konkreter Schritt:** `plesk:prepare` abschließen, `plesk:check`, nur Test-App starten und tatsächliches HTTPS-/Passwort-/Prozess-/Neustartverhalten abnehmen. Shopify-/Drive-/KI-Anschluss und physische Druckabnahme bleiben offen. Keine Produktionsumschaltung, keine globalen Serveränderungen, keine SSH/VPN/API-Schleife. Frühere Aussagen über fehlende Browseranmeldung sind überholt.

## Aktuell: Plesk-Browserweg bestätigt, sichere Anmeldung fehlt – 07.10.2026

**Korrektur der bisherigen Zugangseinschätzung:** Chromium/Playwright in dieser Cloud kann die Plesk-Anmeldeseite tatsächlich bedienen. Auf `https://gravuru.highspeed.cloud:8443` über vorgesehenen Proxy mit gültiger TLS-Prüfung **HTTP 200**, Plesk Obsidian 18.0.81; der Nutzerlink ohne Port liefert 404. Keine Verbindung zur bereits angemeldeten Nutzersitzung. Keine Serveränderung.

**Nächster erforderlicher Schritt:** bestehende Plesk-Anmeldedaten ausschließlich sicher als angeforderte persönliche Laufzeitvariablen `GRAVURU_PLESK_USERNAME` und `GRAVURU_PLESK_PASSWORD` für `gravuru-2027` binden. Cloud-Revision 36 meldet keine Bindungen. Danach kann die vorhandene Browsersteuerung zuerst Testbereiche und Servervoraussetzungen prüfen und die bereits freigegebene separate Testinstanz einrichten. Kein erneutes Erfragen technischer Serverdaten beim Nutzer nötig, sobald Anmeldung verfügbar. [Prüfnachweis und sichere Einbindung](docs/dashboard-20261004/PLESK-BROWSERZUGANG-20261007.md).

Produktcode, Installationspaket und lokale Abnahmen bleiben unverändert; echte Server-/Shopify-/Maschinenabnahme weiterhin offen. SSH/VPN/API-Einrichtung bleibt zurückgestellt. Die folgenden älteren Hinweise auf fehlende Browsersteuerung sind damit ersetzt.

## Aktuell: Aktualisiertes Installationspaket lokal abgenommen – 07.10.2026

Neuer Produkt-/Quellcommit **`2c46b7fc3b93a6d9f601a37b3c46ee881f38bec3`**, Branch `feat/excel-profile-assignments-20261007`, bereits auf GitHub gesichert. Enthält Stand a2af162, ZIP-Import und die neue Excel-/Formprofilbindung. [Aktuelles Installationspaket](deliverables/plesk-private-test-profiles-20261007/README.md): **25,9 MiB**, SHA-256 `9d08a8bba5a6ddb7de5ea6adeee523ab4778e296415ebb0b752e9bbea25ddca0`. [Excel-Vorlagen, sechs synthetische PDFs, Bedienung und Abnahmestand](deliverables/testabnahme-20261007/README.md).

Produktpaket: **50 gezielte Node-Prüfungen und 5 neue Browsergruppen bestanden**. Aktualisiertes ZIP zusätzlich tatsächlich entpackt: **5 lokale Paketprüfgruppen PASS**, darunter prepare/check/Cairo, Schutzgrenzen, SQLite und Neustart ohne Duplikate. Keine echte HTTPS-/Plesk-/Passenger-Abnahme; keine physische Maschinenfreigabe.

**Nächster zwingender Schritt:** manuelle Plesk-Bedienung unter Websites & Domains: zuerst vorhandenen geeigneten Testbereich und Servervoraussetzungen bestätigen, dann nur diesen Bereich nach `ops/plesk/README.md` einrichten. Kein angemeldeter Browserzugriff oder bestätigter Testlink in dieser Laufzeit. Danach sichere Testzugangsbindung und neue echte Serverabnahme. SSH/VPN/API-Einrichtung bleibt zurückgestellt. Drive noch nicht eingerichtet (Nutzer bestätigt); KI-Anbieter/Kostenrahmen unentschieden, keine kostenpflichtigen Aufträge. Reale Shopify-Anmeldung/Varianten-/Warenkorb-/Bestell-/Kundenkontostrecke offen; Änderungen an laufender App erst konkret mit Rückweg freigeben lassen. Keine Live-Veröffentlichung oder Serveränderung erfolgt.

## Aktuell: Excel-Profilzuordnungen und lokale Testlieferung – 07.10.2026

Branch `feat/excel-profile-assignments-20261007`, Basis **`a2af162edd3a1dfa2106212c9f4b76c7ae351b70`** erhalten. ZIP-/Ordner-/Excel-Wiederaufnahme unverändert fortgeführt. Optionale Schrift-/Motiv- und feste Fertigungsprofilzuordnung im Serienimport; geänderte Auswahlrevisionen verlangen erneute Prüfung. Formprodukte mit ausdrücklicher Profilregel, serverseitig begrenzter Kundenauswahl und eingefrorener Auswahl je Produkt-/Entwurfsstand. Keine Migration.

**50 gezielte Node-Prüfungen (6 neu), 5 neue Browsergruppen PASS**, Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. Zwei sichtbare Nachweise gesichtet. Sechs synthetische aktuelle Roland-/Mimaki-PDFs und beide Excel-Vorlagen bereit. [Umfang und Nachweise](docs/dashboard-20261004/EXCEL-PROFILE-20261007.md) · [Testlieferung und offene Anschlussbedingungen](deliverables/testabnahme-20261007/README.md).

**Nächster konkreter Schritt:** aktualisiertes privates Installationspaket aus diesem Quellstand erstellen und verifizieren; parallel auf notwendige Plesk-Bedienung warten. Kein Plesk-Testhost/HTTPS-Link bestätigt; keine Serverprüfung, reale Shopify-Testbestellung oder physische Druckabnahme behauptet. Einrichtung nur der getrennten Testinstanz ist jetzt freigegeben; SSH/VPN/Plesk-API bleiben zurückgestellt. Drive-Autorisierung und KI-Anbieter/Kostenrahmen angefragt. Keine Live-Veröffentlichung, keine Änderung der laufenden App oder Werkstatt.

## Aktuell: Privates Plesk-Testpaket vorbereitet – 07.10.2026

Auf Wunsch des Nutzers jetzt Upload über den vorhandenen Plesk-Dateimanager vorbereiten; keine weitere SSH-/VPN-/Plesk-API-Einrichtung. Branch `feat/plesk-private-test-package-20261007`, unveränderte Produktbasis **`74a1e8b61b564b1fa9421b153d3d7da7c7999b0a`**, Paket-Laufzeitcommit **`ec4ecf105c94576008bf477080a6f3689da68f19`**. ZIP-Import, gemeinsame Quellordner und alle neueren Produktänderungen enthalten. [Testpaket mit SHA-256](deliverables/plesk-private-test-20261007/) · [Konkrete Plesk-Anleitung](ops/plesk/README.md).

Eigener HTTPS-Teststart mit separatem Testpasswort, exaktem Host-/Origin-/Proxy-Protokollschutz und vorhandener CSRF-Prüfung. Eigene gekennzeichnete Daten-/Python-Verzeichnisse; zweite App-Instanz vor Datenbanköffnung gesperrt. Shopify-Transport und echte Anmeldung bleiben ausgeschaltet. Ein entpacktes Paket mit fünf gezielten Prüfgruppen lokal bestanden: Schutzgrenzen, Python/Cairo, SVG-/Excel-/SQLite-Bedienung und Neustart ohne Duplikate. Desktop/390 ohne Überlauf oder JavaScript-Fehler. [Prüfbericht und Grenzen](docs/dashboard-20261004/PLESK-TESTPAKET-20261007.md).

**Nächster konkreter Schritt:** Person mit Plesk-Browserzugriff bestätigt für eine getrennte Test-Subdomain Node 24+, Python 3.11+/venv/pip/Cairo und einen einzelnen App-Prozess, richtet HTTPS sowie getrennte Pfade ein, lädt das Paket hoch und führt `plesk:prepare`, `plesk:check` und die neue Hosting-Abnahme aus. Plesk/Passenger, DNS/Zertifikat und Zielserverrechte hier nicht geprüft. Keine Serveränderung, neue Cloud-Umgebung, Live-Veröffentlichung oder Shopify-App-Änderung. SSH/VPN bleiben zurückgestellt; echte Shopify-Anbindung weiterhin offene Folgeaufgabe. Das unabhängige Excel-Profilpaket bleibt für die anschließende Produktentwicklung offen.

## Aktuell: Gemeinsame Design-Quellordner in Excel umgesetzt – 07.10.2026

Branch `feat/design-source-settings-20261007`, bestätigte GitHub-Basis **`dfd8c0f59a04a205a23dfb0c86d7a9850ca868f9`** einschließlich ZIP-Import und ergänzender Übergabe. Offene Anforderung aus G27-07 geschlossen: gemeinsamen Quellordner einmal im optionalen Blatt **Einstellungen** hinterlegen; je Produkt-/Designzeile mit `design_folder` überschreiben. Exakte aufgelöste Pfade vor Übernahme sichtbar. Vorhandene Tabellen, private Originale und gespeicherte Prüfungen bleiben nutzbar; keine Migration. Vorlage, Prüfbericht, Korrekturdatei und private Wiederaufnahme ergänzt.

**13 gezielte Node-Tests bestanden (5 neu), neuer Browserablauf mit 5 Prüfgruppen PASS.** Default/Abweichung/Auswahlwurzel, echte ZIP-Zuordnung, Originalbytes/SHA, Wiederaufnahme ohne ZIP, Korrektur ohne Duplikate, unzulässige Einstellungen vor Upload, CSV und ausgelieferte Excel-Vorlage geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler; zwei Screenshots gesichtet. Acht bestehende Tests ausschließlich wegen Änderungen am gemeinsamen Planer/Bericht ausgeführt. [Bedienung, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-QUELLORDNER-20261007.md).

Nächster unabhängiger Anschluss aus der Excel-Anforderung: ausdrückliche Schrift-/Motivprofilzuordnungen je Produktzeile an die vorhandene Profilauflösung anschließen (bisher nur Master-/Kategorieübernahme im Serienimport). Vor Umsetzung beide Produkttypen und Vererbungsregeln gezielt abgleichen, keine neuen Profile erfinden. Drive benötigt eigene App-Autorisierung, KI Provider-/Kostenfestlegung. Plesk pausiert; echte Shopify-Anbindung einschließlich HTTPS-Testbackend/Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung, Hostingänderung oder Änderung der laufenden Werkstatt.

## Aktuell: ZIP-Designquelle umgesetzt – 07.10.2026

Branch `feat/design-zip-import-20261007`, Produktbasis **`dd42faf55df44686d3b6185807c35497ceba8df0`** plus ergänzende Übergabe **`dc941043c7184dfe6775c3e995989a8c70b13fd6`**. Übergabe gelesen und erhalten, kein älterer Produktstand übernommen. ZIP bewusst auswählen, exakte Archivpfade in Excel zuordnen, nur referenzierte SVG/PDF-Dateien nach Prüfung hochladen. Vorhandene private Originalablage und Produktprüfung wiederverwendet. Begrenzte Entpackung, Größen-/CRC-/Headerprüfung; unsichere, doppelte oder kollidierende Referenzen und beschädigte Archive blockiert. Excel-Vorlage aktualisiert.

10 gezielte Node-Tests (7 neu) und neuer Browserablauf mit 5 Prüfgruppen bestanden. SVG, Unicode-Pfade, PDF-Seite 2, Originalbytes, Wiederaufnahme ohne ZIP, Korrektur und Wiederholung ohne Duplikate geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. [Bedienung, Formate, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-ZIPIMPORT-20261007.md).

Lokale Datei-/Ordner-/ZIP-Quellen fertig. Nächster offener Quellenanschluss: eigene autorisierte Google-Drive-Anbindung mit Datei-IDs und revisionsgebundener Originalkopie; Chat-Connector ersetzt sie nicht. KI benötigt Provider-/Kostenfestlegung. Plesk bleibt pausiert; echte Shopify-Anbindung samt HTTPS-Testbackend und Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung oder Änderung der laufenden Werkstatt.

## Ergänzende Chat-Übergabe – 07.10.2026

[Gesammelte Entscheidungen, aktueller Einstieg und Dateiinventar](docs/dashboard-20261004/UEBERGABE-NEUER-CHAT-20261007.md). Produktbasis: `dd42faf55df44686d3b6185807c35497ceba8df0` (Ordnerimport fertig); nächstes Paket: ZIP-Designquelle. Plesk pausiert, echte Shopify-Anbindung offen. Diese Ergänzung ändert keine Produktfunktionen. Bei neuerem Arbeitsstand nur ergänzend lesen, nicht zurücksetzen.

## Aktuell: Design-Ordner im Serienimport umgesetzt – 07.10.2026

Branch `feat/design-folder-import-20261007`, bestätigte GitHub-Basis **`72b70416ecf16040b19ab774b43f5f5a67d5680d`**. Nächstes offenes unabhängiges Funktionspaket aus G27-07: lokalen Design-Ordner bewusst auswählen und SVG/PDF über genaue relative Unterordnerpfade zuordnen. Gleichnamige Dateien bleiben getrennt; nur referenzierte Dateien werden beim Prüfen hochgeladen. Vorhandene Konvertierung, Produktprüfung und private Originalablage wiederverwendet; keine Migration. Excel-Vorlage/Generator ergänzt.

29 gezielte Node-Tests (5 neu) und neuer Browserablauf mit 5 Prüfgruppen bestanden. Originalbytes, feste Quellzuordnung, gesicherte Pfade, gezielte Korrektur, Wiederaufnahme und Konflikt bei späterer lokaler Änderung geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. [Bedienung, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-ORDNERIMPORT-20261007.md).

Nächstes unabhängiges Teilpaket: ZIP als bewusst ausgewählte Designquelle mit denselben Pfad-/Quellenregeln und begrenzter Entpackung. Plesk bleibt pausiert; echte Shopify-Anbindung samt HTTPS-Testbackend und Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung oder Änderungen an der laufenden Werkstatt.

## Aktuell: Test-Dateifreigabe und Widerruf sichtbar abgenommen – 07.10.2026

Branch `test/customer-file-grants-ui-20261007`, bestätigte GitHub-Basis **`cc2e7d8812a4c2036e3f381e918707660e77bc1e`** (Excel-Paket). Als nächstes unabhängiges Paket die bestehende Händlerbedienung der kaufgebundenen Test-Dateifreigaben im Browser geprüft: PDF-Standard und Wiederholschutz, ausdrückliches ZIP, fehlende Weißdatei, Widerruf/Neuöffnen, Positionswechsel mit verspäteter Antwort und Sperre nach synthetischer Erstattung. Richtiger Kunde erhält identische Dateibytes, fremdes Konto nicht; ursprüngliche Bestellung bleibt erhalten. Produktcode unverändert.

Fünf gezielte Ablaufgruppen PASS, Desktop/390/768 ohne Überlauf und JavaScript-Fehler, zwei Screenshots gesichtet. Ausschließlich synthetische Händler-/Kundentokens, Testbestellungen und Zugriffsprüfdateien; keine echte Shopify-Anmeldung oder neue Druckabnahme. [Prüfbericht und Grenzen](docs/dashboard-20261004/TEST-DATEIFREIGABE-ABNAHME-20261007.md).

Plesk-Einrichtung bleibt pausiert. Echte Shopify-Appanmeldung, geschütztes HTTPS-Testbackend, reale Testvariantenbindung und Testbestellung sind weiterhin offene Folgeaufgaben. Der nächste reale Anschluss benötigt diese Voraussetzungen; keine Live-Veröffentlichung und keine Änderungen an der laufenden Werkstatt.

## Aktuell: Gespeicherte Excel-Serien und Ausführungsgruppen abgenommen – 07.10.2026

Branch `test/saved-excel-resume-20261007`, bestätigte Basis `79c570061141c8c432e90962c19ed8845cad62b5`. Beide Importarten im Browser mit echten Excel-Dateien geprüft: Speichern/Wiederöffnen, Teilübernahme, verlorene Serverantwort, Prozess-/SQLite-Neustart, gezielte Korrektur und Wiederholung ohne Duplikate. Designs, Varianten, Produktstände und erfolgreiche Geschwister unverändert erhalten. Revisionskonflikte ausdrücklich in Excel korrigiert; Entfernen einer Prüfung löscht keine Produkte/Gruppen.

Ein Bedienfehler in beiden Importoberflächen behoben: Nach fehlgeschlagenem Öffnen bleibt der alte Prüfplan jetzt gesperrt, bis erneut erfolgreich geprüft wurde; Eingaben bleiben erhalten. Zwei gezielte Browserläufe PASS, sieben Ablaufgruppen, Desktop/390/768, keine JavaScript-Fehler. Keine Wiederholung der allgemeinen Abnahmen oder Backend-Lastprüfungen. [Prüfbericht, Befehle und Screenshots](docs/dashboard-20261004/GESPEICHERTE-EXCEL-ABNAHME-20261007.md).

Plesk-Einrichtung auf Nutzerwunsch pausiert. Echte Shopify-Appanmeldung, HTTPS-Testbackend, Testvariantenbindung und Testbestellung bleiben offen. Keine Live-Veröffentlichung. Nächstes unabhängiges vereinbartes Paket: Händlerbedienung der kaufgebundenen Test-Dateifreigabe und Widerruf sichtbar mit synthetischer Anmeldung abnehmen; keine echte Kundenkontoanbindung behaupten.

## Aktuell: Positionsbezogene Erstattungsanzeige umgesetzt – 07.10.2026

Fortsetzung ausschließlich in dieser Aufgabe auf `task/order-line-refunds-20261007`, Basis `c19cbd8606258860848608938965536286d90519`; übernommener Neuaufbau und Browserabnahme `0202493f715d53316eb893e94fb672c4ac8eeb04` bleiben erhalten. Das Testbestell-Dashboard zeigt jetzt gemeldete Erstattungsmengen, Warenwerte und Steueranteile je Position. Fehlende/ältere/widersprüchliche Angaben werden kenntlich gemacht; doppelte/verspätete Nachrichten summieren nichts zusätzlich. Kein berechneter Auszahlungserfolg. Ursprüngliche Bestell-/Produktionsstände unverändert; betroffene Kunden-Dateifreigaben bleiben gesperrt.

39 unterschiedliche gezielte Node-Prüfungen bestanden (12 neu), neue Browserprüfung Desktop/390/768 ohne JavaScript-Fehler; Fixture-Build 76 Ressourcen/1 Modell/461440 Editor-Bytes. Keine Wiederholung der allgemeinen Browserabnahme. [Änderungen, Befehle, Screenshots und Grenzen](docs/dashboard-20261004/POSITIONSERSTATTUNGEN-20261007.md).

Nutzerergänzung: Der Shopify-Connector konnte im alten Chat am 07.10. authentifiziert Shop-/Produkt-/Variantendaten lesen; keine Testvariante zugeordnet und nichts im Shop geändert. Dies ersetzt keine Anmeldung unseres App-Prozesses. Plesk/HTTPS-Testbackend und sichere Laufzeitbindung bleiben offen; nur abhängige Arbeit pausiert. Keine Live-Veröffentlichung. Nächster unabhängiger Schritt: gespeicherte Excel-Serien/Ausführungsgruppen mit gezielter Fehlerkorrektur sichtbar abnehmen.

## Aktuell: Übergabe übernommen, fünf Browserabläufe bestanden – 07.10.2026

Die vorhandene Zielinstanz hat den Remote-Stand `task/cloud-runtime-handoff-20261007` auf **`8b2d3885e684425d43ccada3045b65ffabfb7806`** übernommen und per Remote-Abgleich bestätigt. Alter Branch `work` unverändert erhalten, keine ungesicherten Änderungen vorhanden gewesen. Der Neuaufbau unter `app/` ist maßgeblich; nicht bei G27-01 anfangen.

Fortsetzung auf **`test/cloud-browser-acceptance-20261007`**: Loopback-Listener und Chromium funktionieren. Fünf aktuelle Browserabläufe bestanden: Versionsvergleich/Profil-Auswirkung/Zuordnungen mit Abbrechen und Speichern; Dashboard zum bestehenden Acryl-Konfigurator mit festem Revisionslink; Fotozuschnitt/Graustufen mit Originalerhalt; private Kundenentwürfe unter Ladefehlern; getrennte Mimaki-PDFs und Ebenenvorschau. Desktop/390/768 Pixel, Versionsdialog zusätzlich Touch-Emulation. Keine JavaScript-Fehler, Fixture-Builds 76 Ressourcen/1 Modell/461440 Editor-Bytes. Keine Produktcodeänderung. Neues Prüfskript, Berichte und fünf gesichtete Screenshots: [Cloud-Browser-Abnahme](docs/dashboard-20261004/CLOUD-BROWSER-ABNAHME-20261007.md).

Nur temporäre synthetische Daten, Loopback-/Host-/Origin-/CSRF-Schutz geprüft; keine gehostete Händleranmeldung. `shopify:check` meldet fehlende Felder `GRAVURU_SHOPIFY_CLIENT_SECRET`, `GRAVURU_SHOPIFY_APP_ORIGIN`, `GRAVURU_PRIVATE_DATA_DIR`. Kein geschützter Handy-Vorschau-Link verfügbar, keine Live-Veröffentlichung. Nächster Schritt: zusätzliche Nutzerübergabe und sichere bestehende App-/Testshop-Anbindung samt privater Ablage, danach reale authentifizierte Testbestellstrecke. Physischer Touch- und RIP-/Maschinen-/ICC-Nachweis bleiben offen. Historische Nachweise folgen.

## Historisch: Sicherung und Übergabe an vorhandene funktionierende Cloud-Aufgabe – 07.10.2026

Die zuvor nur lokal bestätigten Druckprüfungen sind jetzt auf GitHub gesichert: Branch `test/dashboard-print-acceptance-20261007`, Remote-Commit **`d1bc7ffbf61b708899fee1c9a74cc15c9fb6f746`**, Vergleich `identical`. Sein Git-Baum `3533dce4ab42e36a7e5df070d0c7e01ea333c798` stimmt exakt mit dem lokalen Prüfstand überein. Produktcode unverändert; beide Testpakete vom 06./07.10. erhalten.

Die vom Nutzer benannte vorhandene Zielaufgabe **„gravuru-2027 NEU“ (`01a115b2-0173-7419-9c03-1af745f5c07c`)** hat GitHub/Shopify per HTTPS erreicht. Dort liegt noch der alte Commit `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b` auf `work`; die dortige Aussage „neue App noch nicht implementiert“ gilt nur für diesen alten Checkout. Nicht bei G27-01 neu anfangen. Sie nutzt dieselbe Umgebungskonfiguration, aber eine neuere Version und andere Instanz als dieser alte Chat mit Proxyfehler. Kein belegter Accountfehler. [Verbindliche Fortsetzung, Grenzen und einmaliger Übergabeauftrag](docs/dashboard-20261004/CLOUD-FORTSETZUNG-20261007.md). Übergabebranch `task/cloud-runtime-handoff-20261007`; die tatsächliche Fortsetzung im Zielchat ist noch nicht bestätigt. Kein verfügbares Werkzeug zum direkten Nachrichtensenden an den Zielchat. Nächster Schritt dort: aktuellen Übergabestand übernehmen und geschützte sichtbare Dashboard-/Konfigurator-Abnahme mit synthetischen Daten durchführen, soweit Werkzeuge verfügbar. Keine neue Umgebung oder Serverplanung.

Für diese Übergabe nur Dokumentdiffs, Archiv-/Secretmusterprüfung und Remote-Abgleich durchgeführt; keine neuen fachlichen Tests, keine Produkt- oder Liveänderungen. Die folgenden Ausführungsnachweise bleiben historisch erhalten.

## Nachweis: Dashboard bis Druckdatei in wiederaufgenommener Cloud geprüft – 07.10.2026

Branch **`test/dashboard-print-acceptance-20261007`**, Produktcode unverändert auf bestätigtem GitHub-Stand **`f28dfc032c6d374d7d0967fe8eb8f37895d2a8f2`**. Der wiederhergestellte Checkout enthielt bereits den lokalen Prüfcommit `b86e4994b9c650638b2c83dbdcfaa01d9473e62b` vom 06.10.; dessen Remote-Testbranch war nicht abrufbar (404). Seine Dateien bleiben erhalten und werden mit dieser Abnahme gesichert. Frühere Ergebnisse wurden nicht als neue Ausführung ausgegeben.

**Heute ausgeführt: drei zusammenhängende Abläufe bestanden, 0 Fehler/Skips.** PDF-Design auf freier Form mit Kundentext/Graustufen-Prüfbild; vollflächiger Druck mit 1 mm Farbüberdruck und Spiegelung; bestehender Acryl-Konfigurator mit Fotoersatz, Eiche, Wandhalterung und zwei Stück. Danach den Acryltest ergänzt und erneut bestanden: gebundenes Fertigungsprofil nach Sicherung, aber vor dem ersten Export auf 600 dpi/kein Weiß/Spiegelung geändert und archiviert. Die gesicherte Ausgabe behält 300 dpi, motivbezogenes Vektor-Weiß und ursprüngliche Spiegelung. Produkt-/Gestaltungsänderungen sowie Neustart verändern alte Pakete und PDFs nicht. Keine Produktcodekorrektur erforderlich.

Befehle: `GRAVURU_FLOW_OUTPUT_DIR=/workspace/artifacts/dashboard-print-acceptance-20261007 node --test --test-isolation=none app/workshop/dashboard-print-flow.test.mjs`; anschließend derselbe Befehl mit `--test-name-pattern='existing acrylic'` für den erweiterten Fall. `npm run build`: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. ZIP-Inhalt und alle PDF-SHA-256 erneut geprüft; `git diff --check` erfolgreich. Drei unterschiedliche Abläufe, nicht vier addierte Tests. HTTP-Handler im Prozess, temporäre private SQLite-Datenbanken, echte Konverter/Ausgabe-Warteschlange; keine Browserautomation.

[Neun aktuelle Test-PDFs als ZIP](docs/dashboard-20261004/dashboard-print-acceptance-20261007.zip) · [Aktueller Prüfbericht](docs/dashboard-20261004/dashboard-print-acceptance-20261007.json). 391713 Bytes, SHA-256 `1198f5039c949db12ea5192e2e1b2683ae991ebcedd902f5be028f86173e9dc3`. Ausschließlich synthetische Prüfgrafiken, keine Kundenfotos, Tokens oder Datenbanken. Je Testfall Roland kombiniert sowie Mimaki Farbe/Kontur und separates Vektor-Weiß/Kontur. Beide Mimaki-Konturen identisch; Weiß-PDF ohne Rasterbilder. Texte als Pfade, CMYK-Raster, Löcher/Ausschnitte frei. PDF-Vorschauen aller drei Roland-Ausgaben mit PyMuPDF gerendert und angesehen. Hintergrundweiß der Bildschirmdarstellung ist kein flächiger Weißdruck.

**Offen:** echte Dashboard-/Touch-Bedienung, Shopify-Testbestellung, gemessenes ICC-Profil und reale Corel-/RIP-/Maschinenabnahme. Keine Live-Veröffentlichung. Nächster externer Schritt: passendes PDF-Paar im RIP maßhaltig überlagern und Testdruck prüfen; ZIP-Bediennotiz beschreibt die erwarteten Konturen, Weißflächen und Spiegelung. Dies kann unabhängig vom Laptopzugang zur Cloud später erfolgen. Historische Zwischenstände folgen.

## Historisch: Durchgängige Dashboard-/Konfigurator-Druckprüfung – 06.10.2026

Branch **`test/dashboard-print-flow-20261006`**, bestätigter Produktcode-Stand **`f28dfc032c6d374d7d0967fe8eb8f37895d2a8f2`**. Drei neue zusammenhängende Integrationstests bestanden: (1) PDF-Design auf freier Form mit transparenten Bereichen, Kundentext und Graustufenfoto; (2) vollflächiger Farbdruck mit 1 mm Überdruck und horizontaler Spiegelung; (3) vorhandener Acryl-Konfigurator mit Fotoersatz, Eiche, Wandhalterung und zwei Stück. Keine Produktcodeänderung nötig. Neuer Test: `app/workshop/dashboard-print-flow.test.mjs`.

Die Tests benutzen die echten HTTP-Serverhandler im Prozess, echte PDF-/SVG-Konverter, private temporäre SQLite-Datenbanken, Fotoaufbereitung und Ausgabe-Warteschlange. Ohne Listening-Socket und ohne Browserbedienung. Produktanlage/Import, Revisionskonflikt, gesperrtes Feld/Designelement, fehlendes Pflichtfoto, privater Entwurfszugriff, Kundentext/Fotobeschnitt, Originaldatei-Hashes, idempotenter Prüfstand und Exportauftrag, CSRF beim Download sowie Neustart mit wartendem Auftrag geprüft. Produkt-/Kundenänderungen nach der Sicherung verändern weder das alte Paket noch die heruntergeladenen PDFs. Für das Acrylbeispiel 3097 Cent je Stück, 6194 Cent für zwei Stück und 7 mm Einsteckbereich bestätigt.

PDF-Prüfung mit PyMuPDF: Dokument ohne Reparatur lesbar, 300 dpi als gespeicherte Exportvorgabe, DeviceCMYK-Rasteranteile, Textpfade ohne eingebettete Schrift, Vektor-RDG_WHITE und CutContour. Mimaki erhält zwei getrennte PDFs mit identischen Schnittpfaden; die Weißdatei enthält keine Bilder. Leere Stellen/Loch/Ausschnitt bleiben transparent, die Weißmaske folgt der Gestaltung. 1 mm Farbüberdruck nur beim randfüllenden Beispiel, ohne Weißüberdruck. Spiegelung am asymmetrischen Loch geprüft. Graustufen anhand der CMYK-Schwarzseparation geprüft – neutrale RGB-Anzeigewerte wären wegen der PDF-Farbumrechnung kein geeigneter Nachweis.

**Ausgeführt:** `GRAVURU_FLOW_OUTPUT_DIR=/workspace/artifacts/dashboard-print-flow-20261006 node --test --test-isolation=none app/workshop/dashboard-print-flow.test.mjs` für die beiden Formabläufe und gezielt `--test-name-pattern='existing acrylic'` für den anschließend ergänzten Acrylablauf; zusammen **3 unterschiedliche Tests bestanden, 0 offene Fehler/Skips**. `npm run build`: **76 Ressourcen, 1 Modell, 461440 Editor-Bytes**. Syntax und `git diff --check` erfolgreich. Frühere Testzahlen sind keine neue Gesamtabnahme. Während der Testerstellung wurden die Python-String-Übergabe und die Graustufen-Prüfmethode korrigiert; kein daraus abgeleiteter Produktfehler.

[Neun synthetische Test-PDFs als ZIP](docs/dashboard-20261004/dashboard-print-flow-20261006.zip) · [Messwerte und SHA-256](docs/dashboard-20261004/dashboard-print-flow-20261006.json). ZIP enthält drei Testfälle mit jeweils Roland-PDF sowie Mimaki-Farb- und Weiß-PDF und eine Bediennotiz. Keine privaten Fotos, Secrets, Entwurfstokens oder Datenbanken. Die farbigen Prüfgrafiken sind bewusst synthetisch.

**Offen:** reale sichtbare Dashboard-/Touch-Abnahme, Shopify-Testbestellung und Maschinen-/RIP-Prüfung. Generisches DeviceCMYK ist kein gemessenes ICC-Profil; technische PDFs sind keine Fertigungsfreigabe. Kein Deployment. Nächster konkreter Abnahmeschritt: die passende PDF-Paarung aus dem ZIP in Corel/RIP öffnen und Deckung, Vektor-Weiß und Außenkontur prüfen; echte Druckprobe separat bestätigen. Historische Zwischenstände folgen.

## Historisch: Auswirkungen von Profilen und Zuordnungen vor dem Speichern – 06.10.2026

Branch **`task/profile-impact-preview-20261006`**, bestätigte GitHub-Basis **`3f0572542878971ee29945234a915f0ab2b929fe`**. Beim Bearbeiten eines vorhandenen Schrift-, Motiv-, Farb- oder Bestsellerprofils zeigt das Dashboard vor dem Speichern die wirksam zugeordneten Produkte/Master, ihren Stand und die Auswahl vorher/nachher. Standard, geordnete Kategorien, eigene Produktzuordnungen und bewusst leere Auswahlen verwenden dieselbe bestehende Auflösung. Auswirkungen einer Motiveinschränkung auf Bestseller werden mit angezeigt. Archive sind markiert; Formprodukte nutzen diese Auswahlprofile nicht. Dieselbe Vorschau ist auch beim Speichern von Standard-/Kategoriezuordnungen eingebaut. Sie unterscheidet geänderte Auswahl von geänderter Herkunft derselben Auswahl und blendet durch eigene Produktzuordnungen abgeschirmte Produkte aus. Zurück/Escape verwirft die Eingaben nicht.

Die Vorschau ist lesend. Das Dashboard sendet beim anschließenden Speichern einen Prüfwert; veränderte Produkte, Zuordnungen oder wirksame Profilstände machen ihn ungültig und verlangen eine erneute Vorschau. Bestehende API-Aufrufer ohne Prüfwert behalten ihre bisherige revisionengesicherte Speicherfunktion. Historische Produkt-/Profilstände und Bestellstände werden nicht geändert. Fehlende alte Katalogeinträge lassen sich im bearbeiteten Profil gezielt durch gültige Einträge ersetzen; normale Auflösung akzeptiert fehlende Ressourcen weiterhin nicht.

**37 unterschiedliche gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell (461440 Editor-Bytes).** Ausgeführt: `node --test --test-isolation=none app/workshop/profile-impact.test.mjs app/workshop/profile-library.test.mjs app/workshop/shopify-admin-host.test.mjs`, Syntaxprüfungen beider UI-Module, `npm run build` und `git diff --check`. Echte temporäre SQLite-Datenbanken und realer HTTP-Handler im Prozess, synthetische Daten. Abgedeckt sind zusätzlich Zuordnungswechsel, Vererben/Leer, zwischenzeitlich geänderte Zielprofile und unveränderte Einstellungsrevision vor Bestätigung. Kein neuer Browser-/Touch-Nachweis, keine reale Shopify-Verbindung und kein Deployment.

Neue Module: `app/workshop/profile-impact.mjs`, `profile-impact.test.mjs`, `ui/profile-impact-ui.mjs`; vorhandene Profilbibliothek, HTTP-Routen und Profilseite gezielt ergänzt. Keine Migration, privaten Daten oder zusätzlichen Zugänge nötig. Maximal 100 Produktzeilen und 20 Auswahleinträge je Liste werden sichtbar dargestellt; die Gesamtzahlen bleiben ausgewiesen, die Prüfung selbst berücksichtigt alle.

**Nächster Abnahmeschritt:** In einer ausführbaren geschützten Vorschau Profil ändern, Kategorie-/Standardzuordnung ändern, jeweils abbrechen und anschließend bewusst speichern; unveränderte Eingaben und korrekte betroffene Produktliste prüfen. Die bekannte Listener-/Browsergrenze ist nicht aufgehoben. Historische Zwischenstände folgen.

## Historisch: Gespeicherte Produktstände vergleichen – 06.10.2026

Branch **`task/product-revision-compare-20261006`**, bestätigte GitHub-Basis **`f1ef6976906d1eba8e40ffea3cb0a98d3b4fff20`**. In der Acryl-Werkstatt unter „Gespeicherte Stände“ und im Formprodukt beim Ansehen eines historischen Standes gibt es jetzt **„Mit aktuellem Stand vergleichen“**. Das Fenster zeigt die beiden exakten Revisionsnummern und Änderungen an Produktdaten, Texten, Preisen, Elementrechten sowie gesicherten Profil-/Fertigungszuordnungen. Kein automatisches Übernehmen oder Zurücksetzen; ungespeicherte Eingaben gehören ausdrücklich nicht zum Vergleich. Das bisherige Wechseln eines Formproduktstandes behält seine Rückfrage bei ungespeicherten Eingaben.

**41 gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell (461440 Editor-Bytes).** Reale temporäre SQLite-Datenbanken, synthetische Produktdaten und tatsächlicher HTTP-Handler im Prozess. Geprüft: stabile Element-IDs, hinzugefügt/entfernt/umgeordnet, unveränderte Historie, historische Profilbindung, ungültige/fehlende Revisionen, Zugriff ohne Händlersitzung, Fremd-Host/Origin, Auslieferung beider neuen UI-Dateien. Große Inhalte bleiben zusammengefasst, höchstens 200 Änderungen werden angezeigt; eine längere Liste wird ausdrücklich gekennzeichnet. Vergleich ausschließlich gespeicherter Produktstände einschließlich ihrer Metadaten, keine Prüfung externer Quelldateien, aktueller Shop-Daten oder Bestellungen.

Dateien: `app/workshop/product-revision-compare.mjs`, zugehöriger Test, gemeinsame UI `revision-compare-ui.mjs`/`revision-compare.css`, Einbindung in beide vorhandenen Editoren und geschützten HTTP-Handler. Keine Datenbankmigration und keine private Datei im Commit.

Ausgeführt:

```sh
node --test --test-isolation=none app/workshop/product-revision-compare.test.mjs app/workshop/repository.test.mjs app/workshop/shopify-admin-host.test.mjs
node --check app/workshop/ui/revision-compare-ui.mjs
node --check app/workshop/ui/app.mjs
node --check app/workshop/ui/form-product-ui.mjs
npm run build
git diff --check
```

**Grenze:** Keine neue Browser-/Touch-Abnahme, kein Deployment. Die bestehende veröffentlichte Testseite wird durch diesen GitHub-Stand nicht verändert. Nächster Abnahmeschritt: In einer ausführbaren geschützten Vorschau beide Vergleichseinstiege öffnen, Scrollen/Schließen/Fokus prüfen und bestätigen, dass ein ungespeicherter Acryl-Entwurf erhalten bleibt. Die bereits dokumentierte Laufzeitblockade für Listener/Browser ist durch diese Tests nicht aufgehoben. Historische Zwischenstände folgen.

## Historisch: Ausführungsgruppen aus Excel wiederaufnehmen – 06.10.2026

Branch **`task/variant-import-resume-20261006`**, bestätigte GitHub-Basis **`2828939c24f83115e56392f312e89b87fc7ebec8`**. Auch die vorhandene Ausführungsgruppen-Ansicht kann geprüfte Tabellen privat speichern, frisch wieder öffnen und gezielte Excel-Korrekturen samt allen zugehörigen Varianten herunterladen. Produktserien und Ausführungsgruppen bleiben getrennt; beide verwenden dieselbe geprüfte Speicherfunktion. Preise, Maße und Designs kommen weiterhin aus den unveränderten gespeicherten Produktständen.

**47 unterschiedliche gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Belegt sind 97 erhaltene Gruppen plus gezielte Korrektur von drei Gruppen, Wiederholung ohne Duplikate, Revisions-/Archivkonflikte, unveränderte Produktdaten und authentifizierte Downloads. [Umfang, Befehle und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md#ausfuehrungsgruppen-excel-und-wiederaufnahme).

Keine Veröffentlichung und keine reale Browserabnahme. Neue private Tabelle `variant_batch_jobs` in derselben `workshop.sqlite`; kein zusätzlicher Server und keine neue Datenbankdatei. Nächster Abnahmeschritt bleibt die sichtbare Bedienprüfung beider Importansichten in einer ausführbaren geschützten Vorschau. Die aktuelle Runtime besitzt weiterhin keine konfigurierten App-Secrets; das blockierte diese Codearbeit nicht. Historische Zwischenstände folgen.

## Aktuell: Private Serienprüfung speichern und wiederaufnehmen – 06.10.2026

Branch **`task/batch-resume-20261006`**, GitHub-Basis **`336c9d74ff2d580e0670bce559eaa6449bcd4e0b`**. Zusätzlich zum Excel-Prüfbericht kann die bestehende Serienansicht geprüfte Importdaten privat speichern, auflisten, erneut öffnen und bewusst entfernen. Beim Öffnen wird ein neuer Prüfplan aus dem aktuellen Produktstand erstellt. Bereits ausgeführte Zeilen werden aus dem dauerhaften Importjournal erkannt, auch wenn die ursprüngliche Browserantwort verloren ging. Gespeicherte Designverknüpfungen funktionieren nach Neustart ohne erneutes Hochladen, solange dieselbe private Ablage vorhanden ist.

**34 unterschiedliche gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echte temporäre SQLite-Datenbanken und echte SVG-Quelle; Händler-/CSRF-/Origin-/Hostschutz im Prozess geprüft. [Bedienung, Speichermodell und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md#wiederaufnahme-im-dashboard-zweiter-teilschritt).

Kein Deployment und keine neue visuelle Browserabnahme. Speicherung erfolgt in einer zusätzlichen Tabelle der privaten `workshop.sqlite`, nicht in Git oder einem öffentlichen Snapshot. Dies macht die Cloud-VM nicht zu einer dauerhaften gemeinsamen Datenablage. Nächster Abnahmeschritt: gespeicherte Serie in der geschützten Dashboard-Vorschau öffnen und Bedienung prüfen, sobald die Vorschau ausführbar ist. Die Codearbeit benötigte keinen Laptop, keine neuen Secrets und keine weitere Nutzerentscheidung. Historische Zwischenstände folgen.

## Aktuell: Excel-Prüfbericht und gezielte Fehlerkorrektur – 06.10.2026

Branch **`task/batch-correction-20261006`**, GitHub-Basis **`4976bee6fa1785d23f8476c4bcb2b30b3261c0a3`**. Die bestehende Serienansicht bietet jetzt einen vollständigen Excel-Prüfbericht und eine separate Korrekturdatei nur für fehlerhafte Produktzeilen einschließlich ihrer Designzuordnungen. Der Server prüft beim Download erneut; keine Produktänderung durch den Export. Masterstand, Importschlüssel und erwartete Revision bleiben erhalten. Private Designbilder dieser Ansicht verwenden nun ebenfalls den authentifizierten Medienabruf.

**15 unterschiedliche gezielte Prüfungen bestanden, 0 offene Fehler/Skips; Build 76 Ressourcen/1 Modell.** Belegt: 97 erfolgreiche Produkte bleiben nach Neustart erhalten, die drei korrigierten Zeilen ergänzen nur drei Produkte; wiederholter Import erzeugt keine Duplikate. [Bedienung, Prüfungen und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md).

Keine neue Nutzerentscheidung für dieses Paket nötig. Keine Veröffentlichung oder reale Browserabnahme; GitHub-Sicherung allein aktualisiert die gehostete Vorschau nicht. Die Datei ermöglicht Wiederaufnahme durch erneutes Auswählen, ist noch kein dauerhaft gespeicherter Importauftrag im Dashboard. Nächster eigenständig umsetzbarer Dashboard-Schritt: private Importauftrag-Historie mit erneutem Prüfplan nach Wiederaufnahme. Shopify-Zugänge und Druckabnahme bleiben separat offen. Historische Zwischenstände folgen.

## Aktuell: Private Händlerbilder und ausführbarer Teststart – 06.10.2026

Branch **`task/merchant-runtime-20261006`**, GitHub-Basis **`2104489fb9dea722081e847be60728e9ade6128c`**. Private Produkt-/Design-/Konturvorschauen laden im Händlerdashboard jetzt mit frischem Shopify-Token; Bildwechsel, entfernte Elemente und abgebrochene Antworten sind abgesichert. Ursprüngliche SVG-Bytes bleiben erhalten. Separater `npm run shopify:test`-Einstieg mit vorgeschalteter `npm run shopify:check`-Prüfung; keine automatische Aktivierung im normalen Start.

**58 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Die öffentliche Client-ID der bestehenden App wurde direkt von Shopify gelesen und fest zugeordnet. [Teststart, genaue sichere Bereitstellung und Grenzen](docs/dashboard-20261004/SHOPIFY-TESTSTART-20261006.md). Eine leere private Testablage außerhalb des Projekt-Checkouts ist vorbereitet. Kein Restore und kein dauerhafter gemeinsamer Datenbestand.

**Aktueller externer Blocker für den echten Händlertest:** geschützter App-Client-Schlüssel und bestätigter HTTPS-Origin fehlen dieser Laufzeit. `shopify:check` meldet genau diese beiden Felder, wenn die vorbereitete Testablage angegeben wird. Für eine tatsächliche Produktanlage ist zusätzlich der Admin-API-Zugang nötig. Keine reale Einbettungsabnahme oder Veröffentlichung erfolgt. Kundenkonto/öffentliche Kundenstrecke, Produktmedien/-updates, Drive-/KI-Dienste und Produktionsabnahmen bleiben offen; das Gesamtprojekt ist noch nicht abgeschlossen. Historische Zwischenstände folgen.

## Aktuell: Vorbereiteter Shopify-Händlerstart – 06.10.2026

Branch **`task/shopify-admin-bootstrap-20261006`**, GitHub-Basis **`a4ccb954cfe3d35bac680a6d3cca2d81adc5dabf`**. Der bestehende Server unterstützt jetzt ausdrücklich konfigurierten `embedded-test`-Betrieb für einen festen Shop/HTTPS-Origin mit App-Bridge-Start, passender Händler-Sitzungsprüfung und exakter CSP-Einbettungsfreigabe. Excel-/Dateilinks verwenden den authentifizierten Händler-Request statt unautorisierter Browsernavigation. Fehlende App Bridge führt nicht zu anonymen API-Anfragen. Der Standardscriptstart bleibt unverändert.

**75 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Synthetische HTTP-Aufrufe im Prozess, keine reale Shopify-Browserabnahme. [Anschlussfelder und verbleibende Voraussetzungen](docs/dashboard-20261004/SHOPIFY-HAENDLERSTART-20261006.md). Kein Deployment, keine neue App, keine Änderung der vorhandenen App-URL. Für die weitere Codearbeit ist gerade keine Nutzeraktion nötig; vor echter Integration müssen sichere Runtime-Zugänge und die Zieladresse bestätigt sein. Private Bild-/SVG-Unterressourcen, öffentliche Kundenrouten und Kundenkonto-Erweiterung sind noch nicht vollständig angeschlossen. Historische Stände folgen.

## Aktuell: Shopify-Entwurfsübertragung mit Wiederholschutz – 06.10.2026

Branch **`task/shop-draft-transfer-20261006`**, GitHub-Basis **`88d1536dc1411ee4ea9f4633a9fe4b00089834cb`**. Die Produktvorbereitung kann bei ausdrücklich eingerichteter Händleranbindung Titel, SEO und alle gespeicherten Grundausführungen als Shopify-Entwurf übertragen. Private Übertragungsaufzeichnung verhindert doppelte Anlage; nach unklaren Antworten erfolgt nur ein lesender Abgleich. Geprüfte Shopify-Varianten werden den unveränderten lokalen Preisen/Optionen zugeordnet. Neue Schaltflächen in der bestehenden Produktvorbereitung; standardmäßig deaktiviert.

**58 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Beide GraphQL-Operationen gegen das Shopify-Schema validiert. Shopantworten waren synthetisch; **keine echte Produktanlage oder visuelle Abnahme**. [Vertrag, Nachweise und Grenzen](docs/dashboard-20261004/SHOP-ENTWURFSUEBERTRAGUNG-20261006.md).

Noch offen: sicherer Runtime-Appzugang und Host-/Kundenkontoanschluss, Produktbilder und Aktualisierung bestehender Shopprodukte, individuelle Aufpreise, Drive-/KI-Anwendungsdienste und reale Endabnahme. Die Domainfreigabe allein liefert keine App-Anmeldung. Keine neue Umgebung oder Serverplanung. Folgende Einträge sind historische Zwischenstände; insbesondere deren Aussage „Produktübertragung nicht implementiert“ ist für den oben beschriebenen Teilumfang überholt.

## Aktuell: Anmeldung und kaufgebundene Testdateien integriert – 06.10.2026

Branch **`task/integrated-finish-20261006`**, GitHub-Basis **`548a69e0e4e1e1baeedf3ad03655bbff1b209852`**. Getrennte Shopify-Händler-/Kunden-Sitzungsprüfung, private Kundenbindung aus signierten Testzahlungen, widerrufbare Dateifreigabe mit festem SHA und Kundenkonto-Dateiliste/Download. Erstattung/Storno/fremdes Konto/geänderte Datei sperren den Zugriff. Der bestehende Bestellbildschirm enthält Ausgabe-/Formatwahl und Widerruf; Händler-Requests nutzen frische App-Bridge-Token, wenn der Host sie bereitstellt. Standardvorschau weiterhin ohne reale Shopify-Anbindung.

**82 gezielte Fälle bestanden; 1 bestehender Sockettest scheitert an `listen EPERM`; 0 Skips. Build: 76 Ressourcen/1 Modell.** Neue HTTP-Grenzen im Prozess mit synthetischen Nachrichten geprüft. **Keine visuelle Abnahme, echte Shopify-Zahlung oder Livefreigabe.** [Zusammenhängender Stand, Anschlussvertrag, genaue Prüfungen und offene Arbeiten](docs/dashboard-20261004/INTEGRIERTER-ABSCHLUSS-20261006.md).

**Gesamtprojekt noch nicht abgeschlossen:** sichere echte App-/Hostanbindung, Kundenkonto-Erweiterung und öffentliche Kundenrouten; tatsächliche Shopify-Produktübertragung, Drive-/KI-Dienste; vollständige Referenzserie und Maschinen-/ICC-Abnahme; dauerhafte private Betriebsablage. Das sind teils weitere Codearbeiten, teils externe Voraussetzungen. Nächster Integrationsschritt ist die bestehende App an den geprüften Testvertrag anzuschließen, sobald der sichere Runtime-Appzugang verfügbar ist. Keine neue Umgebung/Serverplanung. Nachfolgende Abschnitte sind historische Zwischenstände.

## Aktuell: Ausdrücklich aktivierbarer HTTP-Warenkorbanschluss – 06.10.2026

Branch **`task/cart-http-gate-20261006`**, GitHub-Basis **`6b944c1bab2d6219e5a585c3d979bd5eec8bf1b7`**. Der private Form-/Acryl-Warenkorbanschluss ist jetzt über einen kontrollierten POST-Handler erreichbar, sofern eine ausdrückliche serverseitige Testanbindung eingerichtet wird. Die Standardvorschau bleibt deaktiviert. Host/Origin/CSRF, privater Entwurfszugang, unveränderliches Angebot, aktive Produktfreigabe und ein vertrauenswürdiger Käuferkontext werden geprüft. **41 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Prüfumfang und Konfigurationsvertrag](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Vorschauzugriff erneut geprüft: lokaler Listener weiterhin `EPERM`; aktuelle Laufzeit weiterhin eingeschränkte Paketmanager-Netzfreigaben, keine konfigurierten Laufzeit-Secrets/Identitäten. Keine neue Umgebung eingerichtet. HTTP-Handler einschließlich äußerem Host-/Origin-Schutz im Prozess mit synthetischen Shopantworten geprüft, keine echte Shopify-Anfrage. Noch offen: sichtbare Vorschauabnahme und sichere reale Testanbindung. Der Käuferkontext darf nicht durch frei übermittelte Browser-IP-Header ersetzt werden. Keine Liveänderungen, kein Merge. Historische Abschnitte folgen.

## Aktuell: Private Acrylentwürfe am vorhandenen Sichern-Button – 06.10.2026

Branch **`task/acrylic-private-drafts-20261006`**, GitHub-Basis **`4fe1cf6b59f22ea25393b7b0d5d8860e74c2339c`**. Acryl hat jetzt eine private persistierte Entwurfszuordnung mit unveränderlichen Revisionen. Der bestehende Sichern-Button legt diesen Entwurf an und speichert spätere Änderungen als neue Revision. Originalfotos und bestehende Prüfarchive bleiben bytegleich erhalten. Derselbe Warenkorbanschluss prüft jetzt auch die Acryl-Zugriffsberechtigung und den aktuellen Prüfstand. **53 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Details und tatsächliche Prüfgrenzen](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Nicht veröffentlicht und noch nicht visuell im Browser abgenommen. Der neue HTTP-Handler wurde mit echten Requests als Streams, echter SQLite-Datenbank und echter Fotoprüfung geprüft, ohne Netzwerklistener. Zugriffstoken bleiben im Browser-Tab (sessionStorage), private Inhalte ausschließlich im privaten Paket; kein automatischer Zugriff von einem anderen Gerät/Konto. Maschinen-/Bestellblocker werden weiter beachtet. Nächster Schritt: sichtbare Prüfung dieses Sicherungsablaufs in der verfügbaren geschützten Vorschau und kontrollierter Anschluss des Warenkorbhandlers mit bestätigter Laufzeit-Appanbindung. Keine neue Umgebung oder Serverplanung. Nachfolgende Abschnitte sind historische Zwischenstände.

## Aktuell: Privater Entwurfszugriff vor Warenkorbübergabe – 06.10.2026

Branch **`task/cart-draft-access-20261006`**, GitHub-Basis **`20f970dbda089f037ed8f35d38fbc69ad27da475`**. Der neue serverseitige Anschluss prüft den privaten Entwurfszugang, den aktuellen gespeicherten Prüfstand und das bestehende Angebot vor Versand und vor Rückgabe der Checkout-Adresse. Fremde, geänderte, abgelaufene oder bereits bestellte Angebote sind gesperrt. Preise/Varianten/Mengen kommen ausschließlich aus der gespeicherten Bindung. **40 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Keine neue vollständige Testsuite, Browserabnahme oder echte Shopify-Bestellung. [Prüfumfang und Anschlussgrenzen](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Der Anschluss unterstützt zunächst gespeicherte Form-Kundenentwürfe mit privatem Zugriffstoken. Acryl-Prüfstände benötigen noch die entsprechende dauerhafte Entwurfszuordnung; kein Ersatz durch bloßes Wissen einer Prüfstand-ID. Noch kein öffentlicher HTTP-/UI-Anschluss und keine Shopify-Kundenkontoanmeldung. Nächster Schritt: diese Entwurfszuordnung für Acryl ergänzen, danach den kontrollierten HTTP-Anschluss mit bestehendem Host-/Origin-/CSRF-Schutz und bestätigtem Käuferkontext anbinden. Dafür müssen derzeit keine Passwörter geschickt werden. Nachfolgende Abschnitte dokumentieren historische Zwischenstände.

## Aktuell: Privates Journal für Warenkorbübergaben – 06.10.2026

Branch **`task/cart-handoff-journal-20261006`**, Basis **`b8a82328e127901d95dbbc269a9f4c30ec7d2fb1`**. Neuer serverseitiger Wiederholschutz in derselben privaten Kundenentwurfs-Datenbank: bestätigtes Ergebnis wiederverwenden, parallele Zugriffe sperren, unklare/abgebrochene Vorgänge auch nach Neustart nicht erneut senden. Keine neue Kundenroute oder automatische Bestellfreigabe. **18 neue Prüfungen und 6 bestehende Bestellregressionen bestanden; Build 76 Ressourcen/1 Modell.** HTTP-Regressionen sind in dieser laufenden Sandbox durch `listen EPERM` blockiert; kein neuer vollständiger 355-Test-Nachweis. [Umfang und nächste Anbindung](docs/dashboard-20261004/WARENKORB-JOURNAL-20261006.md).

Shopify-App über verbundenen Connector lesend bestätigt: **Gravuru Konfigurator**, App-ID **423276544001**, Shop **gravuru-design.myshopify.com**. „Gravuru 2027 – Cloud – Mikail“ ist der Chatname. Die veröffentlichte neue Cloud-Konfiguration wurde vom Nutzer bestätigt; diese bisherige Aufgabe meldete bei der letzten Prüfung weiterhin Paketmanager-Freigaben. Browseranmeldung und Connector ersetzen keine Laufzeit-App-Authentifizierung. Nächster Schritt: authentifizierten Handler mit gespeichertem Angebot/Entwurfszugriff verbinden; echten Netzwerk-/Appzugriff in der aktualisierten Aufgabe prüfen. Keine Liveänderung, neue Umgebung, private Daten in Git oder Merge. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsamer Abschlussabgleich und Storefront-Transport – 06.10.2026

Branch **`task/completion-pass-20261006`**, Basis **`4b296b28e2d2c7b6f76e82c98589188c40d2af30`**. Dashboard-/Kundenentwürfe gegen verlorene Eingaben und verspätete Antworten abgesichert, Fotoeditor erhält die verfügbare Originalauflösung des Zuschnitts, Excel verarbeitet gültige Zeilen trotz einzelner Datumsfehler. Neuer serverseitiger Storefront-Warenkorbtransport mit Preis-/Variantenprüfung, festen Zielen, Timeout und ohne automatische Wiederholung; noch ohne App-/UI-Anschluss. **355 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Vier echte synthetische Browserabläufe auf Desktop/Handy/Tablet bestanden. [Gesamtstand, Nachweise und genaue Grenzen](docs/dashboard-20261004/ABSCHLUSSABGLEICH-20261006.md).

**Gesamtprojekt noch nicht vollständig abgeschlossen.** Echte Händler-/Kundenanmeldung, authentifizierte Bestellannahme und kaufgebundene PDF-Downloads benötigen noch Implementierung und sichere App-/Betriebsanbindung. Ebenso offen: reale Shopify-Produktübertragung, Drive-/KI-Dienst, vollständige Originaldesignserie und Maschinen-/ICC-Abnahme. Historische Vorbereitungen sind keine echte Bestellung. Der bekannte Shopify-Link bezeichnet ein Schieferprodukt, keine App. **Nächster Anschluss: bestehende konkrete Shopify-Test-App per Name/Verwaltungslink identifizieren; keine Secretwerte im Chat.** Originalarchiv 13–18 auf GitHub bestätigt, Binärabruf hier blockiert; 1–12 darin nicht enthalten. Kein neuer Serverplan und keine pauschale erneute Uploadanforderung.

Keine Veröffentlichung, echte Shopbestellung, privaten Daten in Git oder Merge. Nachfolgende Abschnitte sind historische Nachweise; bei abweichenden offenen Punkten gilt dieser aktuelle Abgleich.

## Aktuell: Verwendung von Fertigungsprofilen sichtbar – 06.10.2026

Branch `task/production-profile-usage-20261006`, Basis `8f2a0539923d5f2e9adb7914b095ce1464be382e`. **Fertigungsprofile → Verwendung in Produkten** zeigt aktuelle und intern aktivierte Produktstände samt gebundener Profilrevision, einschließlich archivierter Master. Neue Profilrevisionen ändern keine bestehenden Zuordnungen. Direkter Link zum aktuellen Acryl-/Formprodukteditor; historische Bestellungen/Prüfstände ausdrücklich außerhalb der Liste. **322 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/FERTIGUNGSPROFIL-VERWENDUNG-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Reale Corel-/Mimaki-Druckabnahme und bestätigte Fertigungsvorgaben bleiben offen; nächster externer Schritt ist das Ergebnis der bereitgestellten PDFs zur konkreten Datei zu dokumentieren. Tatsächliche Shop-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Vollständiger und filterbarer Prüfverlauf – 06.10.2026

Branch `task/output-check-history-20261006`, Basis `7ca26dfcbdecd4301c72b05004e0d7fb3cf434ca`. Unter **Ausgaben** ältere Prüfvermerke nachladen und nach PDF/Weiß-PDF sowie Import/Druckprobe filtern. Frühere 200-Einträge-Grenze aufgehoben; neue Einträge beim Blättern erzeugen keine Duplikate oder Lücken. Erfassungsformular bleibt erhalten, Ausgabewechsel setzt Kontext zurück. **321 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; neuer Browserablauf und bestehender Journalablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERLAUF-20261006.md).

Keine Veröffentlichung oder reale Maschinenabnahme; PDFs und bestehende Einträge unverändert. Nächster externer Schritt: tatsächliches Corel-/Mimaki-Import-/Druckergebnis der bereitgestellten Dateien dokumentieren. Shop-Bestellstrecke, dauerhafte private Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gesicherte Ausgabeeinstellungen vergleichen – 06.10.2026

Branch `task/output-specification-20261006`, Basis `962d10c4725a74e3725818731dcf9819375c813d`. Unter **Ausgaben** zeigt der neue Vergleich die angeforderten und im Erstellungsnachweis gespeicherten Einstellungen einschließlich Spiegelung, Weiß und effektivem Überdruck. Fester Profilstand und Abweichungen sichtbar; fehlende historische Angaben bleiben ausdrücklich unbekannt. PDF-Erzeugung und vorhandene Druckdateien unverändert. **319 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-EINSTELLUNGEN-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Nächste externe Abnahme: reales Corel-/Mimaki-Import-/Probedruckergebnis der bereitgestellten Dateien im Prüfjournal festhalten. Echte Test-App-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Alte fehlgeschlagene Ausgaben ohne Wiederholungsschleife – 06.10.2026

Branch `task/obsolete-output-recovery-20261006`, Basis `56a7467b4407455f2870066a3cd31916c08875bb`. Alte fehlgeschlagene Ausgabeversionen erhalten unter **Ausgaben** die Aktion **Mit aktueller Ausgabeversion neu anlegen**. Gesicherte Gestaltung und Einstellungen bleiben erhalten; alter Auftrag/Verlauf unverändert, Wiederholung ohne Duplikate, Bestellbezug erhalten. Neue PDF ausdrücklich erneut prüfen. **316 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/AUSGABE-NEUANLAGE-20261006.md).

Keine automatische Neuberechnung bestehender Dateien, keine Veröffentlichung oder Maschinenfreigabe. Aktuelle fehlgeschlagene Aufträge behalten ihren normalen Wiederholweg. Nächste externe Abnahme: reales Import-/Probedruckergebnis der bereitgestellten Dateien und bestätigte Fertigungsvorgaben dokumentieren. Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Fertigungsprofil bei Bestellgestaltung → Produkt erhalten – 06.10.2026

Branch `task/order-product-profile-20261006`, Basis `928c071ec8a777e10494ba1bbe2d8698735629ea`. Neue Acrylproduktentwürfe aus gesicherten Bestellungen übernehmen jetzt den festen Fertigungsprofilstand, statt auf Standardwerte zurückzufallen. Referenzen und Hash geprüft; neuere Profile nicht automatisch übernommen. Private Kundenbilder, ursprüngliche Bestellung und Shopbindungen bleiben unverändert. **315 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/BESTELLPRODUKT-PROFIL-20261006.md).

Keine Veröffentlichung, echte Zahlung oder Maschinenfreigabe. Bereits zuvor angelegte Produktentwürfe werden nicht nachträglich verändert. Nächste externe Abnahme: reales Import-/Probedruckergebnis und bestätigte Fertigungsvorgaben dokumentieren; echte Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gespeicherte Gravur-PDF direkt ansehen – 06.10.2026

Branch `task/engraving-pdf-preview-20261006`, Basis `d7bf81fed4bad7a381eb4a43e0bdc4ce545d0d78`. Unter **Ausgaben → Gravur-PDF ansehen** wird die tatsächliche gesicherte Raster-/Vektorgravur auf Weiß dargestellt, einschließlich PDF-Prüfsumme. Keine zusätzliche Spiegelung, Umfärbung oder Änderung der Datei; Schnittkontur bleibt separat. **314 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Gravur-Browserablauf und Druckvorschau-Regression Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/GRAVUR-PDF-VORSCHAU-20261006.md).

Synthetische technische Abnahme, keine reale Probegravur oder Veröffentlichung. Vorhandene Druck-/Weißvorschau erhalten. Nächster fachlicher Schritt: reale Import-/Maschinenprüfung der gesicherten Dateien dokumentieren; bestätigte Maschinen-/Materialprofile separat hinterlegen. Echte Shop-/Betriebsabnahme bleibt offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Feste Fertigungsprofile auch für native Acrylprodukte – 06.10.2026

Branch `task/acrylic-production-profiles-20261006`, Basis `ece60315a8b016c5f6b741bfd6a226508ea0b13e`. Unter **Fertigung** einen passenden Profilstand auswählen und mit dem Acrylprodukt speichern. Neue gesicherte Gestaltungen übernehmen diesen festen Stand samt Druck-/Gravurvorgaben; spätere Profiländerungen ersetzen ihn nicht automatisch. Alte Produktrevisionen und Ausgaben bleiben erhalten. **313 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/ACRYL-FERTIGUNGSPROFILE-20261006.md).

Prüfung mit synthetischen Profilen/Daten, keine reale Maschinenfreigabe oder Veröffentlichung. Weiß-PDF vektoriell mit RDG_WHITE und CutContour bestätigt; bisherige private Corel-Dateien per SHA unverändert. Nächster fachlicher Schritt: reales Import-/Probedruckergebnis zu den bereitgestellten Dateien im Prüfprotokoll erfassen und bestätigte Fertigungsvorgaben hinterlegen. Echte Shop-/Betriebsabnahme separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Prüfvermerke zur konkreten Ausgabedatei – 06.10.2026

Branch `task/output-check-journal-20261006`, Basis `26907140e0de3486e8a7bf04368913d7d556b146`. Unter **Ausgaben** können Dateiimport und Probedruck/Probegravur getrennt zur konkreten PDF-SHA dokumentiert werden. Unveränderlicher Verlauf, Wiederholschutz und Korrekturen als neue Einträge; PDFs, Aufträge und Berechtigungen bleiben unverändert. **310 Tests bestanden, 0 Fehler/Skips; Build 76/1; tatsächlicher Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERMERKE-20261006.md).

Nur synthetische Prüfvermerke zur technischen Abnahme. Keine echte Maschinenprüfung behauptet, kein Deploy/Shopify-Schreibzugriff. Neue private Corel-Testdateien unverändert; deren Nutzerabnahme steht aus. Nächster fachlicher Anschluss: gespeicherte Fertigungsprofile auch dem nativen Acrylprodukt zuordnen (bisher nur Formprodukte); keine Ersatz-Druckparameter erfinden. Externe Betriebs-/Shop-Abnahme separat offen. Nachfolgende Nachweise sind historisch.

## Aktuell: Bestellposition direkt mit ihren Ausgaben verbunden – 06.10.2026

Branch `task/order-output-complete-20261006`, Basis `b64494f3fec7e46af9f5e9f12473b2d066e86294` einschließlich Vektor-/Mimaki-Konturkorrektur. Testbestellung → gesicherte Gestaltung → Ausgabe → PDF/ZIP mit erhaltenem Bestellbezug. Dateien gehören zur festen Prüfstand-ID; andere Gestaltung desselben Produkts ausgeschlossen. Storno/Erstattung sichtbar, Originale und Berechtigungen unverändert. **307 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/BESTELLUNG-AUSGABEN-20261006.md).

Keine Veröffentlichung, echte Shopify-Anfrage oder private DB verwendet. Neue Corel-Testdateien als direkte Vektortexte und Mimaki-RDG_WHITE samt Kontur technisch geprüft; realer Import-/Drucktest steht aus. Nächste Betriebsabnahme: bestätigte Test-App-Verbindung und sicher erreichbares dauerhaftes Backend. Keine erneute Cloud-Migration oder allgemeine Serverplanung. Nachfolgende Nachweise sind historisch.

## Aktuell: Vektor-Texte und Mimaki-Außenkontur – 06.10.2026

Branch `task/pdf-vector-contour-fix-20261006`, Basis `8745c9873942647796927d5680b9eb66ee14510e`. Texte als zusammengesetzte Vektorpfade ohne zusätzliche Text-Formhüllen; Mimaki-Weißdatei enthält nun auch die maßgleiche CutContour. Neue private PDF-1.3-Testdateien bereitgestellt, normale Backend-Rezepte v5/v3 korrigiert; ältere gespeicherte Ausgaben erhalten. **306 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet und MuPDF/Ghostscript bestanden.** [Dateinachweis und Grenzen](docs/dashboard-20261004/PDF-VEKTOREN-KONTUR-20261006.md).

Nutzer meldete Bitmap-Gruppen in Corel; die frühere PDF-Struktur enthielt Vektorpfade in Form-XObjects. Neue direkte Pfade technisch geprüft; tatsächlicher Corel-/Mimaki-Import bleibt ausstehend. Kein Deploy. Nächster unabhängiger Code-Schritt: erhaltene Bestell-/Ausgaben-Verknüpfung fertigstellen. Nachfolgende Nachweise sind historisch.

## Aktuell: Farbe und Weiß aus der gespeicherten PDF prüfen – 06.10.2026

Branch `task/dashboard-plate-preview-20261006`, Basis `ff8b4c5bb6a6eefd5879281126553f56eb051c3a`. Unter **Ausgaben** lassen sich Farbe und Weiß getrennt auf transparentem Karohintergrund ansehen. Quelle ist die tatsächlich gesicherte PDF, bei Mimaki die jeweilige separate Datei; Quellen-SHA sichtbar. Kein Weiß-Button bei Ausgabe ohne Weiß, kein altes Bild nach Auftragswechsel. PDFs/ZIPs bleiben unverändert. **304 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Handy/Tablet/Desktop bestanden.** [Nachweis und sichtbare Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKEBENEN-20261006.md).

In der vorhandenen Cloud implementiert und geprüft, nicht veröffentlicht. Keine Maschinen-/ICC-Freigabe oder echte Shop-Verbindung daraus ableiten. Nächster Schritt: Mimaki-Importergebnis des Nutzers übernehmen und bei Bedarf mit der gespeicherten Druckebene vergleichen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Mimaki-Trennung im Dashboard – 06.10.2026

Branch `task/dashboard-print-separations-20261006`, Basis `6ca4df1c7dd82a669eb72eca0348d72b9f35d3b1`. Neue Ausgabeaufträge liefern Mimaki-Farbe ohne RDG_WHITE und reine RDG_WHITE-Vektoren getrennt, beide einzeln im Prüfstand/unter „Ausgaben“ und im ZIP. Texte je Eingabe gruppiert; alte gespeicherte Dateien bleiben unverändert. **301 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet sowie MuPDF/Ghostscript bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKTRENNUNG-20261006.md).

In der vorhandenen Cloud umgesetzt und geprüft, kein Deploy oder Shop-Schreibzugriff. Nutzerfreigabe betrifft weiterhin die konkrete frühere Roland-PDF-1.3-Probe; der reguläre Renderer erhält PDF-1.7-Transparenzen. Nächster Schritt: Mimaki-/Corel-Test der bereitgestellten Dateien übernehmen; automatische Ausgabe bei Bedarf im selben Importer vergleichen. Echte Maschinen-/ICC-Abnahme, Backend-Hosting und Shop-Verbindung bleiben separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Roland bestätigt, Mimaki getrennt – 06.10.2026

Branch `task/print-separations-20261006`, Basis `9a05d1b0d4641ae2a395493ae7a87cc5190964f5`. Nutzer bestätigt die korrigierte PDF als für Roland gut. Vier Texteingaben in einer neuen Kopie zu je einem Vektorobjekt zusammengefasst; Mimaki erhält zwei separate Dateien: nur RDG_WHITE-Vektoren sowie CMYK-Farbe ohne RDG_WHITE. Quelle erhalten, Formate und Platzierung identisch. **Alle drei Dateien mit MuPDF/Ghostscript geprüft; Farbansichten bei 150/300 dpi pixelidentisch.** [Nachweis und Ablauf](docs/dashboard-20261004/COREL-MIMAKI-TRENNDATEIEN-20261006.md).

Private PDFs außerhalb Git bereitgestellt. Separate reproduzierbare Nachverarbeitung, noch keine Änderung des Dashboard-Downloads. Nächster Schritt: Mimaki-/Corel-Gruppierungsabnahme, dann bestätigte Ausgabe in den normalen Download integrieren. App-Tests/Build nicht wiederholt; vorherige 300/0/0 und 76/1 bleiben historische Ergebnisse. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsame Varianten-Zuordnung – 06.10.2026

Branch `task/shop-variant-mapping-20261006`, Basis `8b4bacf38e39a3a3b4285115c10c96252e1322a3`. In **Shop vorbereiten** lassen sich jetzt alle 28 Acryl-Ausführungen zusammen vorhandenen Varianten-IDs zuordnen. Serverpreise aus gespeichertem Produktstand, gemeinsames Speichern mit vollständigem Zurückrollen bei Fehler, erhaltene historische Bindungen und Anschluss an gesicherte Kundenentwürfe. **300 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/SHOP-VARIANTENZUORDNUNG-20261006.md).

Nur lokale Vorbereitung mit synthetischen Daten: Variantenexistenz und Shoppreise noch nicht online bestätigt; nichts an Shopify gesendet oder veröffentlicht. Nächster Schritt: echte Varianten-/Preisprüfung nach bestätigter Test-App-Anbindung. Corel-Probe bleibt unabhängig beim Nutzer zur Abnahme. Nachfolgende Abschnitte sind historische Nachweise.

## Aktuell: Spätere Bestellstatusmeldungen – 06.10.2026

Branch `task/order-status-20261006`, Basis `95788388cb853a7a76c3bb2ff723e334be25caa4`. Dashboard zeigt Teil-/Vollerstattung und Storno zusätzlich zum unveränderten ursprünglichen Bestellstand; verspätete Meldungen und Wiederholungen geprüft. **296 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Handyansicht](docs/dashboard-20261004/BESTELLSTATUS-20261006.md).

Nur signierte synthetische Testereignisse, keine Shop-Mutation oder Veröffentlichung. Positionsbezogene Rückzahlungen, echte Test-App-Zustellung und Kunden-Downloads bleiben offen. Neue kombinierte Corel-PDF-1.3-Probe besteht MuPDF und Ghostscript; Nutzerabnahme steht aus. Frühere EINE-DATEI-Kompatibilitätsprobe hatte einen reproduzierbaren Lesefehler und ist ersetzt. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Importfarbe und RDG_WHITE-Vektorregel – 06.10.2026

Branch `task/acrylic-import-tint-20261006`, Basis `e70aeb2b10bc7d441bebfa4509205a655a7fb283`. Eingefärbte SVG-/PDF-Importe jetzt auch in der nativen Ausgabe mit erhaltener Transparenz. **292 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser/Desktop/Handy/Tablet bestanden.** RDG_WHITE verbindlich immer Vektor und echte Sonderfarbe, zusätzlich gezielt geprüft. [Nachweis, Foto-Druckproben und offene Importdiagnose](docs/dashboard-20261004/ACRYL-IMPORTFARBE-WEISSVEKTOR-20261006.md).

Keine Veröffentlichung. Nutzer-Probedruck meldet ein Weißproblem; PDF-Struktur ist Vektor, konkreter Corel-/RIP-Import noch ungeklärt. Nächster Schritt: separate RDG_WHITE-Vektordatei im betroffenen Programm vergleichen. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Sichtprüfung und Excel direkt verfügbar – 06.10.2026

Branch `docs/dashboard-review-pack-20261006`, geprüfter Produktcode `f9f1fba6bb5560183c25ddc15b7d97f898eb5290`. Frische Aufnahmen der tatsächlichen Cloud-Oberfläche mit synthetischen Daten: Produktübersicht, Acryl-Editor, Excel, Prüfstand, Bildqualität und Gravur. [PDF, HTML, Excel und genaue Grenzen](docs/dashboard-20261004/DASHBOARD-SICHTPRUEFUNG-20261006.md).

Browseraufnahme am 06.10.2026 um 11:20 Uhr Europe/Berlin erfolgreich, keine JavaScript-Fehler; Build 76 Ressourcen/1 Modell. Die 289 Tests des vorherigen Pakets wurden nicht erneut ausgeführt. Produktcode unverändert. Kein Deploy: Der bestehende private Muster-Link ist weiterhin Site-Version 12 und enthält kein Werkstatt-Backend. Für interaktiven Dashboard-Zugriff fehlt in dieser Aufgabe eine authentifizierte Browser-/Portfreigabe der bestehenden Node-/SQLite-/Python-Laufzeit; nicht durch eine statische Nachbildung ersetzen. Shopify-/Maschinenabnahme bleiben separat offen. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Fotofenster-Abdeckung im Dashboard – 06.10.2026

Branch `task/acrylic-photo-coverage-20261006`, Basis `537730a2ac659f2d8cd244d5efa1037a0e07ef5c` (Remote bestätigt). Neue Acryl-Prüfstände zeigen pro Foto, ob seine Bildfläche die tatsächliche Maske vollständig abdeckt. Rechteck, Kreis, Ellipse und Bogen einschließlich Fotozoom, Versatz und Drehung geprüft. Bewusst freie Stellen bleiben erlaubt; keine Exportblockade, automatische Verschiebung oder neue Druck-Überlappungswarnung.

**289 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Beide Browserfälle (vollständig bedeckt/teilweise frei) mit PDF/ZIP auf Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-FOTOFENSTER-20261006.md).

Abdeckung betrifft die Bildfläche, nicht transparente Pixel innerhalb der Datei. Alte Prüfstände bleiben unverändert. Keine Veröffentlichung oder privaten Daten. Nächste externe Abnahme bleibt die bestätigte Shopify-Test-App-Anbindung und reale Maschinenprobe. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Bildauflösung im Acryl-Prüfstand – 06.10.2026

Branch `task/acrylic-photo-quality-20261006`, Basis `ef36ab0106be85baae2eef58997cb02e8792461b` (Remote bestätigt). Das Dashboard zeigt die Pixeldichte hochgeladener Bilder in ihrer gespeicherten Platzierung, einschließlich Plattengröße, Zoom und bearbeiteter Bildfassung. Unter 300 dpi gibt es einen konkreten Hinweis; höherer Export-dpi-Wert ersetzt keine fehlenden Bilddetails. Werte sind im Prüfstand/ZIP gesichert. Alte Stände und Originalbilder bleiben unverändert.

**286 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung Desktop/Handy/Tablet mit Anzeige, PDF/ZIP und Wiederholungsdownload bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BILDAUFLOESUNG-20261006.md).

Prüfung der verfügbaren Pixel, keine automatische Schärfeprüfung; Beispielbilder/importierte Designquellen nicht bewertet. Kein Deploy oder privater Datenbestand. Reale Shopify-Test-App-Anbindung und Maschinenabnahme bleiben externe Voraussetzungen. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Acryl-Gravur aus dem gesicherten Prüfstand – 06.10.2026

Branch `task/acrylic-engraving-output-20261006`, Basis `f5ea76d2fa266d37dfe5d4d2569fd33dc92bc1cf` (Remote bestätigt). Das vorhandene Dashboard erzeugt jetzt auch aus nativen Acryl-Gravurständen eine Graustufen-PDF für Fotos oder eine Vektor-PDF für reine Pfade. Standard 300 dpi, ohne Druckweiß; Schnittkontur separat im ZIP. Helle Gravur-Vorschaufarben werden für Schrift und Bibliotheksmotive als schwarze Gravurflächen ausgegeben. Originalfotos und eingefrorene Gestaltung bleiben erhalten.

**283 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung mit PDF/ZIP, Fehlerfall Foto im Vektormodus und Wiederholungsdownload auf Desktop/Handy/Tablet bestanden. [Nachweis und Beispiel](docs/dashboard-20261004/ACRYL-GRAVUR-AUS-PRUEFSTAND-20261006.md).

Die frühere Sperre der nativen Acryl-Gravurausgabe ist damit aufgehoben. Technische Prüfung mit synthetischen Daten; keine Laserparameter-/Probegravurfreigabe, echte Shopify-Zahlung oder Veröffentlichung. Nächster externer Schritt bleibt die bestätigte Test-Store-/App-Anbindung; reale Maschinenabnahme separat. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Acryl-Bestellgestaltung als neuer Produktentwurf – 06.10.2026

Branch `task/acrylic-order-product-20261006`, Basis `5f97ce4a964b4e80907bd4a4608c53d4599fcdcf` (Remote bestätigt). Im Dashboard: Testbestellung → Gestaltung als neues Produkt → Vorschau → privater Acrylentwurf im vorhandenen Editor. Layout/Farben/Schriftgestaltung und Löschungen bleiben erhalten; standardmäßig ursprüngliche Beispieltexte, Kundentexte nur ausdrücklich. Kundenfotos/Logos und Uploaddaten werden entfernt. Bestellung, Ausgangsprodukt und Shopbindungen bleiben unverändert; Wiederholung erzeugt keinen Doppelentwurf.

**280 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserablauf einschließlich neuem Produkt Desktop/Handy/Tablet geprüft. [Nachweis, Bilder und Verlauf der vier Pakete](docs/dashboard-20261004/ACRYL-BESTELLUNG-NEUES-PRODUKT-20261006.md).

Damit technisch lokal geprüft: bestehender Acryl-Konfi → fester Prüfstand → CMYK-PDF/ZIP → lokale Variantenbindung → signierte synthetische Testbestellung → neuer privater Produktentwurf. **Keine echte Shopify-Zahlung/Kundenkontofreigabe, kein Live-Deploy und keine Maschinen-/ICC-Abnahme.** Nächste externe Voraussetzung: bestätigte Test-Store-/App-Anbindung mit passenden Acrylvarianten; bekannter Schieferartikel bleibt unberührt. Private Bestände wurden nicht verwendet. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Native Acryl-Bestellübergabe lokal geprüft – 06.10.2026

Branch `task/acrylic-order-handoff-20261006`, Basis `a6d4e18a50d0b5ee97dde1ee0231c81f59274e54`. Gesicherte Acryl-Ausführung und Menge jetzt im Dashboard an die vorgesehene Shop-Variante binden und Übergabe lokal prüfen. Optionen/Revisionspreis unveränderlich; gleich teure andere Ausführungen und falsche Mengen werden abgewiesen. Signierte synthetische Testbestellung übernimmt 36,97 € × 2 = 73,94 € samt festem Stand; Wiederholung bleibt ohne Doppelbestellung.

**278 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echte Dashboardbedienung Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BESTELLUEBERGABE-20261006.md). Keine echte Shopify-Anfrage, Zahlung, Veröffentlichung oder Kundenfreigabe. Nur neue synthetische Datenbanken; private Bestände unverändert.

Nächster Code-Schritt: native Acrylgestaltung aus Testbestellung als neuen privaten Produktentwurf übernehmen, ohne Kundenfotos. Reale Store-/App-Anbindung und ICC-/Maschinenabnahme bleiben offen. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Gleiche Acrylpreise in Konfi und Commerce-Zuordnung – 06.10.2026

Branch `task/acrylic-commerce-prices-20261006`, Basis `91541d6d331cb976196942b7c3ea2feb75117a4c` (Remote bestätigt). Die Commerce-Prüfung verwendet jetzt die bestehende versionierte Kalkulation statt einer zweiten Summe der Optionspreise. Damit werden große Sockel korrekt mit +100 Cent berücksichtigt: große Platte/Eiche/Wandhalterung **36,97 €**. Veraltete Preisbindungen werden auch direkt vor der Auswahl abgewiesen; Zusatzmotive/-fotos bleiben ohne bestätigte Aufpreis-Anbindung gesperrt.

**275 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell**, Cloud-Check 06.10.2026, 10:17–10:18 Uhr Europe/Berlin. [Prüfbericht](docs/dashboard-20261004/acryl-commerce-preise-cloud-report.json). Fünf gezielte neue Tests prüfen alle 28 Kombinationen, Mengen, geänderte Preisrevisionen, generische Produkte und gesperrte Aufpreise. Keine Shop-Verbindung oder Mutation; kein neuer Kundendialog. Nächster Schritt: native Acryl-Prüfstände in die lokale Warenkorb-/Testbestellprüfung übernehmen. Die folgenden Abschnitte sind historische Nachweise.

## Aktuell: Acryl-PDF aus dem unveränderlichen Prüfstand – 06.10.2026

Branch `task/acrylic-snapshot-output-20261006`, Basis `7b071fc64c6604affbdb5190bb1814d3ebf38427`. Dashboard-Prüfstand erzeugt native Acryl-PDF serverseitig aus gesicherten Textpfaden, Design- und Fotoquellen. Standard: PDF, 300 dpi, CMYK, RDG_WHITE nur unter Druck, keine Randzugabe; Mimaki/ZIP optional. Konturdownload, Vollfläche mit optionalem 1-mm-Rand und einmalige Spiegelung geprüft. Originalfoto und alte Ausgabe bleiben erhalten.

**270 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser Desktop/Handy/Tablet mit bearbeitetem Foto, beiden Exporten und Vergleich zur Konfi-Gestaltung bestanden; bisherige Formprodukt-/Testbestellstrecke erneut bestanden. [Nachweis und PDF-Vorschau](docs/dashboard-20261004/ACRYL-FERTIGUNG-AUS-PRUEFSTAND-20261006.md).

**Grenzen:** technische generische CMYK-Prüfung, noch keine ICC-/RIP-/Maschinenfreigabe oder echte Shopify-Bestellung. Native Acrylgravur und ausdrücklich nicht unterstützte Elementtypen werden abgewiesen. Keine Veröffentlichung; private Bestände bleiben außerhalb Git. Nächster Schritt: Preisparität der Acryl-Commerce-Zuordnung, danach native Bestellübergabe. Die folgenden Abschnitte sind historische Paketnachweise; die frühere Sperre der Acryl-Druck-PDF ist durch dieses Paket aufgehoben.

## Aktuell: Acryl-Konfi → unveränderlicher Werkstattprüfstand – 06.10.2026

Branch `task/acrylic-review-handoff-20261006`, Basis `8cb741d67fb867faefc70f97117a5f741fc5b705` (Remote bestätigt). Im bestehenden Acryl-Konfi nach „Gestaltung fertig“ jetzt „Für die Werkstattprüfung sichern“: natives Design, unveränderte Originalbilder, bearbeitete Bildfassung, Produktrevision, Schrift-/Motivquellen, Ausführung, Geometrie und serverberechneter Preis. Dashboard zeigt die gesicherte Gestaltung und Ausführung; ZIP/Originalfotos herunterladbar. Spätere Bearbeitungen bleiben getrennt, Wiederholungen erzeugen keine Doppelstände. Keine Umwandlung in ein Formprodukt.

**269 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser mit synthetischem Foto/Text und großer Platte/Eiche/Wandhalterung: 36,97 €, 7 mm Einstecktiefe, Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-WERKSTATT-UEBERGABE-20261006.md).

**Grenzen:** Die gespeicherte PNG ist eine Browserreferenz, keine serverseitig reproduzierte Fertigungsdatei. Ausgabeaufträge und Shopify-Warenkorb sind für diese neue Acryl-Snapshotart ausdrücklich gesperrt; vorhandene Formprodukt-Ausgaben bleiben erhalten. Keine Veröffentlichung oder echte Bestellung. Private Daten liegen ausschließlich in der laufenden privaten Cloud-Aufgabe; GitHub sichert Code und synthetischen Nachweis, nicht eine dauerhafte gemeinsame Kundendatenbank. Nächster Code-Schritt: native Acryl-Fertigungsausgabe aus dem eingefrorenen Stand anbinden, ohne den älteren RGB-Commerce-Export als CMYK-Produktion auszugeben. Echte Shopify-App-Bindung und Maschinenabnahme separat offen. Folgende Abschnitte sind historische Nachweise.

## Aktuell: Gemeinsamer Konfi-Einstieg bis PDF/ZIP geprüft – 06.10.2026

Branch `task/konfi-form-completion-20261006`, Basis `3ddb7c4d6ba26f686a74bec0f680cec6b1354f36`. Formprodukte und Ausführungsgruppen öffnen jetzt den gemeinsamen Konfigurator-Einstieg mit Vorschau, Bearbeitungsreitern und integrierter Ausführungswahl. Vorhandener Acryl-Editor erhalten und erneut geprüft. Durchgehend: Excel → Kunde → unveränderlicher Werkstattprüfstand → Roland-PDF/Mimaki-ZIP → synthetische Testbestellung → neuer Produktentwurf ohne Kundenfoto. **268 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Gesamtnachweis, Bilder und genaue Grenzen](docs/dashboard-20261004/KONFI-GESAMTABLAUF-20261006.md).

Shopify-Link aus dem anderen Chat wiedergefunden und lesend bestätigt: `gravuru-design.myshopify.com`, Produkt `16138521641340` ist eine Schiefer-Grabtafel im Entwurf mit sieben Varianten. Nicht mit dem Acrylmuster gleichsetzen. Die Adresse fehlt nicht mehr. **Noch keine echte Shop-/Maschinenabnahme:** Testziel/App-Anbindung, Acryl-Warenkorbparität, Kundenkonto und reale Fertigungsprofile bleiben offen. Keine Shopify-Mutation, Veröffentlichung oder private Daten in Git. Nächster externer Schritt: konkretes Testziel und App-Anbindung freigeben; keine erneute Migrationsplanung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Bestehenden Konfi angebunden geprüft – 06.10.2026

Branch `task/existing-konfi-binding-20261006`, Basis `84f649eab669486428c9450483605bbfd459660b`. Acryl-Dashboard öffnet den bestehenden Kundenkonfigurator; beide Editor-Vorschaulinks jetzt auf die gespeicherte Revision festgelegt und bei ungespeicherten Änderungen verborgen. Echter Browserlauf mit Dashboardänderung, späterer Revision und Neuladen des alten Links bestanden; Desktop/Handy/Tablet, keine JavaScript-Fehler. Fixture-Build **76 Ressourcen/1 Modell**. Die **268 Tests** des vorigen Pakets sind ein historischer Nachweis und wurden hier nicht wiederholt. [Prüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-BESTEHENDER-KONFI.md).

**Nächster Schritt:** Freie Formprodukte in den vorhandenen Konfigurator einbinden; ihre bisherige separate Kunden-Testansicht ist dafür noch keine Abnahme. Danach durchgehender Kundenentwurf → Werkstatt → PDF/ZIP. Muster Acrylglasbild und separate Testseite unverändert; keine Veröffentlichung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Excel bis Kundenkonfigurator zusammenhängend geprüft – 06.10.2026

Branch `task/excel-customer-flow-20261006`, Basis `e57a7defee4ff8e554f4f17c5beb0442120e224b`. Echte XLSX-/SVG-/PDF-Importe → drei Formprodukte → Design-Excel-Update → Gruppe aus Produktkatalog → alle drei Kundenausführungen, Texte speichern/neuladen und Designs wechseln. Spätere Preis-/Designänderung übernimmt ein alter Gruppenlink nicht still. Gefundene PDF-Rundungsabweichung bei maßgleicher Platzierung korrigiert, Originalmaß unverändert. **268 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender Browserlauf Desktop/Handy/Tablet bestanden.** [Ergebnis, Bilder und wiederholbarer Ablauf](docs/dashboard-20261004/DASHBOARD-EXCEL-KUNDENABLAUF.md).

Nächster Schritt: Kundenentwurf → Werkstattprüfstand → PDF/ZIP-Ausgabe zusammenhängend abnehmen. Nur synthetische Prüfdaten; keine echte Bestellung oder Fertigungsfreigabe. Keine Veröffentlichung, kein Merge/PR; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Designzuordnungen aus Excel bearbeiten – 06.10.2026

Branch `task/design-excel-export-20261006`, Basis `a06bab0cb0f3ec1eb1ef220992f4d39d1e6aa2e8`. Produktserien exportiert vorhandene Formprodukte mit Designnamen, IDs und Standardauswahl. Ohne neue Grafik bleiben Original, Platzierung, Kundenfelder und Rechte erhalten. Unveränderte Formprodukte werden übersprungen; Konflikte und Wiederaufnahme bleiben geprüft. **267 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echter Download/Bearbeitung/Reimport, Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNZUORDNUNGEN-EXPORT.md).

Nächster Schritt: Tabellenablauf Produktanlage → Designzuordnung → Ausführungsgruppe → Kundenkonfigurator zusammenhängend prüfen. Keine privaten Bestände verwendet, keine Veröffentlichung, kein Merge/PR. Separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungen als ausgefüllte Excel bearbeiten – 06.10.2026

Branch `task/variant-excel-export-20261006`, Basis `61903f9ae655116f3c8b8e7ae774a7f19c0e96ea`. Ausführungen → Excel-Zuordnung exportiert ausgewählte Gruppen samt festen Produktständen und zusätzlicher Produktliste. Herunterladen → bearbeiten → prüfen → übernehmen im Browser geprüft; unveränderte Gruppen werden ohne neue Revision übersprungen. **263 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet geprüft.** [Bedienung, Installation und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXPORT.md).

Neue Python-Anforderung für dynamische XLSX: `python3 -m pip install --target .local-data/python -r app/workshop/requirements-excel.txt`. Nächster Schritt: Designzuordnungen aus bestehenden Formprodukten für den Tabellenabgleich bereitstellen, ohne private Bilddateien oder Kundeninhalte zu exportieren. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; bisherige Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Ausführungsgruppen per Excel zuordnen – 06.10.2026

Branch `task/variant-excel-20261006`, Basis `35e3cae6b34d6ef0daee099e0ada0f81bb63358d`. Neue XLSX-Vorlage mit **Gruppen**, **Varianten**, **Anleitung** und Oberfläche unter Ausführungen → Excel-Zuordnung. Vorschau, explizite Teilübernahme, gezielte Updates und Wiederaufnahme ohne doppelte Gruppen. Feste Produktrevisionen; ungenannte Ausführungen bleiben erhalten. **259 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echter Excel-Upload/Download und Browserprüfung Desktop/Handy/Tablet bestanden.** [Vorlage, Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXCEL.md).

Nächster Schritt: vorhandene Gruppen und Produktreferenzen als befüllbare Excel-Datei exportieren, damit IDs/Revisionen nicht abgetippt werden müssen. Dieser Import verwendet bereits gespeicherte Produkte; keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Größen-/Materialausführungen verbinden – 06.10.2026

Branch `task/form-variants-20261006`, Basis `67205fa26b8b48fa02f5a0e3959a3f1dcddc91ed`. Backend verbindet vorbereitete freie Formprodukte zu einer gemeinsamen Kundenauswahl mit Standardausführung. Jede Größe/Materialkombination verweist ausdrücklich auf ihre Produktrevision mit passender Kontur, Bohrungen, Preis und Designs. Historie, Konflikte und Archivierung geprüft; alte Gruppenlinks übernehmen spätere Preise nicht still. **254 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserprüfung Desktop/Handy/Tablet einschließlich Kundenwechsel und Konflikt.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN.md).

Nächster Schritt: Excel-Kindtabelle an diese geprüfte Ausführungszuordnung anschließen (noch offen). Keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte dokumentieren historische Pakete.

## Aktuell: Mehrere Designs je Formprodukt per Excel – 06.10.2026

Branch `task/batch-design-sheet-20261006`, Basis `d24d8297d8a751f7961d6b4c989b092783dca3a1`. Optionales Blatt **Designs** verbindet mehrere SVG/PDF-Seiten mit einer Produktzeile, ergänzt/ersetzt gezielte Designs und wählt ein Standarddesign. Bis 30 Designs pro Formprodukt; unberührte Kundenfelder/Rechte bleiben erhalten. Fehler blockieren das betroffene Produkt; Wiederholung und Updates bleiben revisionsgeschützt. **249 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echte XLSX mit SVG und zwei PDF-Seiten, Desktop/Handy/Tablet und Kunden-Designwechsel geprüft.** [Bedienung, Aufnahmen und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNTABELLE.md).

Nächster Schritt: separate Varianten-Kindtabelle mit expliziten Material-/Maßkombinationen und passender Designzuordnung. Keine automatische Variantenanlage durch diese Designzeilen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestände; bestehende separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Aktuell: Vorhandene Produkte per Excel/CSV aktualisieren – 06.10.2026

Branch `task/batch-update-20261006`, Basis `5dc75f9e84db992e139cfc17ce43527601e07ea3`. Serienimport unterstützt ausdrücklich `action=update` mit Produkt-ID und erwartetem Stand. Leere Felder behalten Bestand; eigene Geometrie/Designrechte bleiben erhalten, kein Master wird neu darüberkopiert. Neue Revision unter gleicher ID; Wiederholung und zwischenzeitliche Bearbeitung gegen Überschreiben geschützt. **245 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte 22-Spalten-XLSX in Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-TABELLENAKTUALISIERUNG.md).

Nächster Schritt: offene Varianten-/Designzuordnung aus separaten Tabellen mit dem bestehenden Modell abgleichen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestandsdaten. Folgende Abschnitte sind historische Paketnachweise.

## Aktuell: Materialgerechte Gravur für Edelstahl, Holz und Leder – 06.10.2026

Branch `task/material-engraving-preview-20261006`, Basis `725a7c62b9be6536f9bdd2cd502547424228e867`. Vorhandene fünf Materialreferenzen erneut angesehen; Gravur wirkt auf Edelstahl dunkel/neutral, auf Eiche/Buche/Kirsche/Leder dunkelbraun, abgestuft nach Quellhelligkeit/Alpha. Druck bewahrt Originalfarben. Backend, Produktkarten, Kundenbearbeitung und unveränderliche Ausgaben geprüft. **241 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Vergleichsbild und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALGRAVUR.md).

Nächster Schritt: verbliebene Dashboard-Import-/Variantenabläufe mit dem dokumentierten Soll abgleichen. Schiefer-Rohlingreferenz, reale Maschinenprobe und echte Shopify-Teststrecke bleiben separat offen. Keine Veröffentlichung oder Änderung privater Bestände. Die folgenden Abschnitte sind historische Paketnachweise.

## Aktuell: Helle Acrylgravur statt Druckfarben – 06.10.2026

Branch `task/acrylic-engraving-preview-20261006`, Basis `150aa8ea5344f8577686b1ffdff5d40b8e77851f`. Gemeinsame Materialvorschau zeigt bei Gravur helle Acrylwirkung entsprechend Quellhelligkeit/Alpha; Druck behält Originalfarben. Weiße und transparente Quellbereiche bleiben ohne Gravur, Fotoabstufungen erhalten. Backend-/Kundenansicht einschließlich direkter Texteingabe geprüft; Originale und technische Ausgabe unverändert. **239 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Vergleichsbilder, Tonwertprüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-ACRYLGRAVUR-VORSCHAU.md).

Historischer nächster Schritt: weitere Materialgravuren; im Paket oben abgeglichen. Reale Laser-/RIP-Probe und echte Shopify-Teststrecke bleiben offen. Kein Publish/Deploy oder Merge; bisherige separate Testseite nicht aktualisiert. Nachfolgende Pakete sind historische Nachweise.

## Aktuell: Matte UV-Aufdruckansicht und glänzender Hinterdruck – 06.10.2026

Branch `task/uv-print-surface-20261006`, Basis `0a0a7bf3d018ed00e687227724bf57810181298a`. Im Formprodukt-Backend ist die Druckansicht wählbar: vorne matt mit dezenten Druckpunkten oder hinter klarem Acryl mit Glasreflexion. Speichern/Neuladen und Kundenansicht geprüft. Vorhandene Produktstände bleiben erhalten; reine Vorschauwahl ohne Änderung von Druckparametern oder Spiegelung. **237 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Bilder und Nachweis](docs/dashboard-20261004/DASHBOARD-UV-DRUCKANSICHT.md).

Die Fragen zu Matt/Hochglanz und „UV-Markern“ sind geklärt. Historischer nächster Schritt: Acrylgravurvorschau; im Paket vom 06.10.2026 oben umgesetzt. Keine Veröffentlichung, kein Eingriff in private Bestände. Frühere Paketabschnitte darunter sind historische Nachweise.

## Aktuell: Formserien und vollflächiger Farbdruck – 05.10.2026

Branch `task/form-batch-20261005`, Basis `fdbb5be293a0517767d2f0f20a56b6b2b0281620`. Freie Formmaster jetzt im bestehenden Excel-/CSV-Serienimport: Material, Stärke, Verfahren, Szene, genaue Kontur und Kundenrechte vererben; Grundpreis und SVG/PDF-Design je Zeile zuordnen. Prüfen, partielle Anlage und Wiederaufnahme ohne Duplikate; direkte Formeditorlinks und mobile Ergebniskarten. **235 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Excel-/Browserprüfung Desktop/Handy/Tablet.** Vollflächige Farb-PDF mit Weiß, Bohrung und optionalem Außenrandüberdruck zusätzlich geprüft. [Ergebnis und farbiges Prüfbeispiel](docs/dashboard-20261004/DASHBOARD-FORMSERIEN.md).

Historischer nächster Schritt; am 06.10.2026 beantwortet und umgesetzt: matte Vorderdruckansicht mit feinen UV-Druckpunkten, glänzender Hinterdruck durch klares Acryl. Keine Veröffentlichung oder Maschinenfreigabe. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Acrylmaterialien und Szenen für Formprodukte – 05.10.2026

Branch `task/form-material-scenes-20261005`, Basis `a407c4114f3914d26f3a58baa8de4628a96161b0`. Klares/satiniertes/anthrazitfarbenes/schwarzes Acryl als dokumentierte 2D-Näherung; persistente Backend-Szenenauswahl und Kante aus tatsächlicher Produktstärke. Dieselbe Ansicht in Backend, Kunde, Vollbild, Produktkarte und Prüfstand. Produktübersicht lädt wieder (veraltetes Symbolziel korrigiert); Navigation ohne Seitenüberlauf. Geometrie/Bohrungen unverändert; Szene und Material bleiben aus der Druckdatei. **231 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet und Transparenzpixel geprüft.** [Ergebnis, Materialherkunft, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-MATERIAL-SZENEN.md).

Keine Maschinen-/Livefreigabe; keine Veröffentlichung. Schiefer-Rohling und echte freigegebene Produktszenen für freie Formen bleiben offen. Nächster unabhängiger Schritt: weitere Material-/Form- und Stapelabläufe im Dashboard. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

## Aktuell: Eigene Texte und Motive in Formprodukten – 05.10.2026

Branch `task/form-added-elements-20261005`, Basis `5dd07c49da473c309281d6203e600ecca9577f4d` (Produktcode `0265ed5ad83c05fd3d7569ccb522b75e8b464e94`). Kunden ergänzen eigene Texte und Motive aus der vorhandenen Bibliothek; freie Platzsuche, Farben/Drehung, direkte Bearbeitung, Löschen/Rückgängig und revisionsgeschütztes Speichern. Backend-Freigaben je Design, unveränderliche Prüfstände und PDF-/Vorlagenübernahme angeschlossen. **229 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und Touch geprüft.** [Ergebnis, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-EIGENE-ELEMENTE.md).

Bestehender Chat laut Nutzer wieder erreichbar; Sicherung und ausführliche Übergabe bleiben erhalten. Keine neue Umgebung oder Veröffentlichung. Nächste unabhängige Arbeit: verbleibende Material-/Szenendarstellung. Echte Shopify-Teststrecke und Maschinenabnahme bleiben offen; angefragte Store-Adresse laut Nutzer bereits in anderem Chat, hier nicht lesbar. Folgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Projektzusammenfassung und vorsorgliche Sicherung – 05.10.2026

Nach einer vom Nutzer gemeldeten Chat-/Linkstörung ist der bestehende Chat laut dessen Rückmeldung wieder da. Wir arbeiten hier weiter; kein neuer Chat oder neue Cloud-Umgebung angelegt. [Detaillierte Projektübergabe mit allen Entscheidungen, offenen Punkten und Startanleitung](docs/chat-recovery-20261005/MIKAIL-PROJEKTUEBERGABE.md), [Sicherungsübersicht](docs/chat-recovery-20261005/README-ZUERST.md). Dokumentbranch `docs/chat-recovery-mika-20261005`, Produktbasis `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` auf `task/form-direct-edit-20261005`, per Git frisch bestätigt. Keine Produktänderung und kein neuer Testlauf; letzter dokumentierter Nachweis bleibt 226/0/0, Build 76/1. Private Datenbanken/Browserentwürfe sind nicht Bestandteil der Quellcodesicherung. Die angefragte Shopify-Adresse wurde laut Nutzer bereits in einem anderen Chat angegeben; der genaue Wert ist hier nicht verfügbar. Nachfolgend frühere Paketabschlüsse.

## Aktueller gesicherter Arbeitsstand – 05.10.2026

Branch `task/form-direct-edit-20261005`, GitHub-Basis `2c932f013332f827ec7471aab1b8bbb42186ae6a`. Direkte Text-/Fotobearbeitung für Formprodukte mit großer Gesamtvorschau, ganzen Schrift-mm, Farbpunkten, Auswahlgriffen, expliziter Löschfreigabe, Abbrechen und Touch. Edelstahl erhalten; Eiche/Buche/Kirsche/Leder als separat abgeleitete leere Materialvorschauen ergänzt. **Cloud-Check: 226 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und echte Touch-Eingaben geprüft.** [Bedienung, Bilder, Prüfungen und Restumfang](docs/dashboard-20261004/DASHBOARD-DIREKTBEARBEITUNG-ABSCHLUSS.md).

Der Branch enthält die bisherige Verwaltung, Ausgabe- und synthetische Testbestellstrecke einschließlich Produktentwurf aus Bestellgestaltung. **Keine Live-/Maschinenfreigabe:** Echter Shopify-Checkout/Kundenkonto benötigt bestätigten Entwicklungsstore und sichere App-Anbindung; danach reale RIP-/Maschinenprobe. Weitere Formprodukt-Motive, Materialansichten/Szenen und vollständige UV-Originale bleiben im verlinkten Restumfang ausdrücklich offen. Keine neue Serverplanung, keine Veröffentlichung, keine privaten Daten in Git. Nächste nötige Nutzerangabe für den echten Shoptest: ausschließlich dessen `…myshopify.com`-Adresse. Die folgenden Abschnitte sind historische Pakete.

## Aktuell: Produktentwurf aus Bestellgestaltung – 05.10.2026

Branch `task/order-product-drafts-20261005`, GitHub-Basis `7786a685bb8d4e876805a5196f88280abdca601c`. In Testbestellungen lässt sich eine gesicherte Formprodukt-Gestaltung nach Vorschau als eigener Produktentwurf übernehmen: Layout, Farben, Schriftgrößen, Feldrechte und entfernte Felder bleiben erhalten. Beispieltexte wahlweise aus der Vorlage oder ausdrücklich aus der Gestaltung; Kundenfotos werden zu austauschbaren Fotobereichen. Originalprodukt und Bestellung bleiben unverändert; wiederholtes Anlegen erzeugt kein Duplikat. **222 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und Öffnen des Produkteditors.** [Nachweis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRODUKT-AUS-BESTELLUNG.md).

Geprüft mit synthetischen signierten Testpositionen, keine echte Shopify-Bestellung. Neuer Entwurf bleibt privat und ohne Shop-Verknüpfung. Weitere Materialdarstellung und Acryl-Parität sind unabhängig weiterzuführen; tatsächlicher Shopify-Test wartet auf die bestätigte Store-Anbindung. Maschinen: Roland mit VersaWorks bestätigt, genauer Mimaki-RIP weiterhin offen. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Warenkorb-Übergabe im Backend – 05.10.2026

Branch `task/checkout-handoff-20261005`, GitHub-Basis `0785d0fe7bfe2f6266996382b09220139ddfd642`. Gesicherte Formprodukt-Gestaltungen können jetzt ohne Shell einer Shop-Variante zugeordnet und für den Test-Warenkorb vorbereitet werden. Feste Revision, Preis und Menge; private Gestaltung bleibt außerhalb des Warenkorbs. **219 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und nachfolgender Produktänderung.** [Nachweis und Aufnahme](docs/dashboard-20261004/DASHBOARD-WARENKORB-UEBERGABE.md).

**Nutzerbestätigung:** Roland LEF-200 und MO-240 mit VersaWorks. Für Mimaki 2513 EX sagte der Nutzer „die von Mimaki“; genauer Name und Version bleiben offen. RasterLink ist nicht als bestätigt eingetragen. Auswahlhilfe ohne Änderung vorhandener Profilstände.

Die Übergabe wurde lokal vorbereitet und ihr GraphQL-Schema geprüft; kein Warenkorb an einen Shop gesendet. Für die echte Teststrecke fehlen bestätigter Entwicklungsstore und dessen Anbindung. Nächster externer Schritt: nur dessen `…myshopify.com`-Adresse nennen; keine Zugangsdaten im Chat. Kundenkonto-Kaufberechtigung und Maschinenabnahme bleiben offen. Frühere Abschnitte sind historische Pakete.

## Aktuell: Signierte Testbestellungen – 05.10.2026

Branch `task/order-intake-20261005`, GitHub-Basis `a06d821bd5389016d92d0ff0087c7f066c4f864a`. Neue Backend-Ansicht für unveränderliche Testpositionen mit festem Formprodukt-, Preis- und Prüfstand. Empfang prüft die Signatur der Originalnachricht, Shop, Variante, Menge und serverseitigen Preis; mehrfache Zustellung dupliziert keine Position. **215 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserprüfung Desktop/Mobil/Tablet inklusive Produktänderung und PDF-Download.** [Nachweis und Grenzen](docs/dashboard-20261004/DASHBOARD-TESTBESTELLUNGEN.md).

**Nur synthetische, signierte Testnachrichten geprüft; keine echte Shopify-Testbestellung.** Empfang standardmäßig deaktiviert, Live-Bestellungen gesperrt. Keine Kundenkonto-Downloadberechtigung oder Maschinenfreigabe. Nächster Schritt: Entwicklungsstore zuordnen und den tatsächlichen Test-Checkout anbinden; weitere unabhängige Dashboard-Arbeiten bleiben möglich. Store-Adresse und RIP-Namen sind angefragt, keine Zugangsdaten. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Shop-Vorbereitung und Umfangsabgleich – 05.10.2026

Branch `task/dashboard-readiness-20261005`, GitHub-Basis `82db3b5798ae9b27443e041f94c4517fd3b2f0a7`. Werkstatt → Shop vorbereiten zeigt feste Produktstände, Designs, SEO und Ausführungen mit bestehenden Preisregeln (28 Acrylkombinationen). JSON-Übergabe ohne Übertragung an Shopify. Formprodukte: Seitentitel/Kurzbeschreibung speichern; historische Preise bleiben unverändert. **211 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet einschließlich nachfolgender SEO-Bedienprüfung.** [Ergebnis und ehrlicher Umfangsabgleich](docs/dashboard-20261004/DASHBOARD-SHOPVORBEREITUNG.md).

**Nächster Schritt:** authentifizierte Bestellübernahme und unveränderliche Positionen vorbereiten. Echte Shopify-Testbestellung, Kaufberechtigung im Kundenkonto und Maschinenabnahme sind noch offen. Weitere Materialableitungen/UV-Originale stehen separat im Abgleich; das Gesamtprojekt ist nicht als vollständig abgenommen bezeichnet. Kein externer Dashboard-Publish, kein Live-Systemzugriff. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Gravurausgabe – 05.10.2026

Branch `task/form-engraving-20261005`, GitHub-Basis `6a23acc56a7f98f629107dd4f8769a901a2af164`. Gesicherte Formprodukte: Graustufenraster aus Originalfotos oder echte Vektorformen/Schriftpfade, ohne Druckweiß. Standard PDF/300 dpi, Kontur separat im optionalen ZIP; einmalige Spiegelung, Profilvorgaben und persistente Ausgabeaufträge. Rasterbilder werden im Vektormodus ausdrücklich abgelehnt. **208 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-/ZIP-Download.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-GRAVURPRUEFUNG.md).

**Nächster Schritt:** verbleibende Dashboard-, Kunden- und Bestellabläufe abgleichen und fortsetzen. Reale RIP-/ICC-/Material-/Maschinenabnahme fehlt; keine Produktionsfreigabe. Die drei genannten Druckmaschinen ersetzen kein Gravurmaschinenprofil. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Persistente Ausgabeaufträge – 05.10.2026

Branch `task/export-queue-20261005`, GitHub-Basis `720d0d1243375109cc237dac4ef9d7d87e416f0a`. Werkstatt → Ausgaben: Status, Verlauf, Wiederholung nach Fehler und gesicherter PDF-/ZIP-Download. Druckaufträge laufen nach Verlassen der Browserseite weiter; dieselbe private Datenbank erhält sie über Prozessneustarts. Doppelte Anforderungen und verspätete alte Ergebnisse überschreiben keine Ausgabe. **204 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet einschließlich PDF und ZIP geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-AUSGABEAUFTRAEGE.md).

**Nächster Schritt:** Gravurausgabe ohne Druckweiß an dieselben unveränderlichen Prüfstände anbinden; danach weitere Dashboard-/Bestellabläufe. Maschinen bekannt: Roland LEF-200, Roland MO-240, Mimaki 2513 EX; RIP-/ICC-/Maschinenabnahme offen. Keine Bestellung, dauerhafte gemeinsame Ablage oder externe Dashboard-Veröffentlichung behauptet. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Versionierte Fertigungsprofile – 05.10.2026

Branch `task/production-profiles-20261005`, GitHub-Basis `62243a23ad8734a28c30f9f9552dfe0f1730b865`. Werkstatt → Fertigungsprofile: Druck-/Gravurvorgaben erstellen, ändern, historische Stände ansehen, kopieren und archivieren. Formprodukte binden eine feste Profilrevision passend zu Verfahren, Material und tatsächlicher Stärke. Prüfstände übernehmen Profilinhalt und Prüfsumme unveränderlich; die Druckausgabe startet mit diesen gesicherten Vorgaben. **201 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; vollständiger Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-Download geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-FERTIGUNGSPROFILE.md).

**Bestätigte Maschinen (Nutzer, 05.10.):** Roland LEF-200, Roland MO-240, Mimaki 2513 EX. RIP-Software, konkrete Material-/ICC-Profile und reale Maschinenabnahme sind noch nicht benannt beziehungsweise bereitgestellt. Keine automatisch freigegebenen Maschinenprofile. **Nächster Schritt:** Persistente Ausgabeaufträge mit Status, Fehleranzeige und Wiederaufnahme; danach Gravurausgabe. Das Gesamtprojekt wird gemäß Nutzerauftrag weitergeführt. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Schriftpfade in der technischen Druck-PDF – 05.10.2026

Branch `task/form-vector-text-20261005`, GitHub-Basis `886a7573b91f7c25edbe491205435af8e2401416`. Explizite Textfelder gesicherter Formprodukte erscheinen jetzt als echte CMYK-Vektorpfade mit identischen Weißkonturen in der Prüf-PDF. Reihenfolge zu Fotos, Mehrzeiligkeit, vorhandene Schriftform, Kursivtransformation und einmalige Spiegelung bleiben erhalten. 300 dpi bleibt der Bildstandard; Schriftpfade sind davon unabhängig. Rezept v2 bewahrt zuvor gespeicherte v1-Dateien. **199 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tabletprüfung und PDF-/ZIP-Downloads.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-SCHRIFTPFADE.md).

**Nächster Schritt:** Versioniertes Fertigungsprofilmodell an den festen Prüfstand anbinden, ohne reale ICC-/Maschinenparameter zu erfinden. Importierte Designquellen (einschließlich darin fest enthaltener Schrift) und Fotos sind weiterhin gerastert; Gravurausgabe und Maschinenfreigabe bleiben offen. Kein externer Dashboard-Publish, keine Änderung des gesicherten Acrylmusters. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Technische Druckprüfung für Formprodukte – 05.10.2026

Branch `task/form-print-proof-20261005`, GitHub-Basis `2b2d75a2ecf1061275feffa76c7da9f90a3d9ba0`. Gesicherte Gestaltungen erhalten im Backend eine technische PDF-Ausgabe: CMYK/300 dpi, Roland `RDG_WHITE` oder Mimaki-Vektorweiß, standardmäßig nur unter bedruckten Elementen, optionaler 1-mm-Überdruck bei Außenrandkontakt und einmalige Rückseitenspiegelung. Originalfotos, freie Außenkontur und Bohrungen bleiben maßgeblich. PDF oder ZIP mit Originalen; erzeugte Varianten bleiben unveränderlich gespeichert. **197 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserdownloads auf Desktop sowie Mobil-/Tabletprüfung.** [Ergebnis, Installation und Aufnahmen](docs/dashboard-20261004/DASHBOARD-DRUCKPRUEFUNG.md).

**Grenze:** technische Prüfung, keine Produktionsfreigabe. Farbgestaltung einschließlich Text ist in dieser PDF gerastert; Schriftpfade bleiben im gesicherten SVG. Weiß/Schnittkontur sind Vektoren. ICC-/Maschinenfreigabe und Gravurausgabe fehlen weiterhin. **Nächster Schritt:** Schrift-/Designvektoren in der Druckausgabe erhalten und das versionierte Fertigungsprofil daran anbinden. Keine erfundenen Maschinenparameter. Kein externer Dashboard-Publish; Acrylmuster erhalten. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Unveränderliche Prüfstände im Backend – 05.10.2026

Branch `task/form-production-snapshots-20261005`, GitHub-Basis `280c773c72b55aefecdc0d5d6680fdd0cd07d663`. Gespeicherte Formprodukt-Kundenentwürfe können jetzt unveränderlich für die Werkstattprüfung gesichert werden. Neue Backend-Übersicht mit fester Gestaltung, Produkt-/Entwurfsrevision, Preis, Originalen, Prüfsummen und klaren Fertigungshindernissen. Downloads: reine 1:1-Kontur-PDF, vollständiges Prüfpaket und Originalfotos separat als ZIP. **194 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tablet-Browserprüfung einschließlich Downloads.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRUEFSTAENDE.md).

**Nächster Schritt:** Produktionsprofilmodell und technische Druck-/Gravur-Ausgabe an den festen Prüfstand anbinden; vorhandene Acryl-Exportmodule verwenden und freie Konturen ausdrücklich unterstützen. Reale Maschinen-/ICC-Freigaben, Zahlung/Shopify-Bestellbindung und gehostete Kunden-/Operatoranmeldung bleiben offen. Prüfstände sind keine Bestellungen oder druckfertigen PDFs. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Aktuell: Formprodukt-Kundenentwürfe und echte Übersichtsvorschauen – 05.10.2026

Branch `task/form-customer-editor-20261005`, GitHub-Basis `cb878ffaaf1f794f2aadb226b47dcc0f4f2091b6`. Gespeicherte Formprodukte öffnen jetzt einen eigenen privaten Kundenentwurf: Text/Schrift/ganze mm, Foto-Upload, Verschieben hinter festem Ausschnitt, Zoom/Drehung/Graustufen, Rückgängig und revisionsgeschütztes Speichern. Feldrechte werden serverseitig geprüft. Übersichtskarten zeigen das gespeicherte Design auf der vorhandenen Materialoberfläche. **193 Gesamttests bestanden; danach betroffene Prüfungen und echte Cloud-Browserabläufe erfolgreich. Build 76 Ressourcen/1 Modell.** [Umfang, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-FORMKUNDEN.md).

**Nächster Schritt:** Kundenentwurf mit unveränderlichem Bestell-/Produktionsstand verbinden; vorhandene Produktionsmodule wiederverwenden. Produktive Kundenanmeldung, Aufbewahrung und reale Maschinen-/Farbprofile bleiben offen. Die neue Ansicht läuft im geschützten Cloud-Entwicklungsserver; kein neuer extern erreichbarer Dashboard-Link und keine Shopveröffentlichung. Acrylmuster bleibt erhalten. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Designs und Kundenfelder für Formprodukte – 05.10.2026

Branch `task/dashboard-form-designs-20261005`, GitHub-Basis `34bb395cfacba140a486bb987c8f90a98a90a736`. Bestehende SVG/PDF-Dateiablage für freie Formprodukte wiederverwendet: mehrere Designvorlagen, Originalmaß/proportionales Einpassen, Standarddesign, Textfelder mit vorhandenen Schriftpfaden/ganzen mm und explizite Fotobereiche. Material-/Designvorschau hält Originalkontur und Bohrungen frei. Gemeinsame Revisionen, Historie und Kopien bleiben erhalten. **191 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserprüfung Desktop/Mobil/Tablet.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-FORMDESIGNS.md).

**Nächster Schritt:** Formprodukt-Kundenansicht mit tatsächlichem Foto-Upload und serverseitiger Durchsetzung der gespeicherten Feldrechte anbinden. Fotobereiche sind bislang Backend-Platzhalter, keine fertige Bestell- oder Fertigungsstrecke. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: Edelstahl-Oberfläche im Formprodukt – 05.10.2026

Branch `task/dashboard-material-preview-20261005`, GitHub-Basis `3d0d60480c283c19945ea8c534693f35830b5b19`. Materialansicht mit vorhandener reiner Edelstahlstruktur, umschaltbar zur Konturprüfung; originale Außenform und transparente Ausschnitte bleiben erhalten. Historische Stände berücksichtigen ihre Materialauswahl. Andere Materialien bleiben ausdrücklich ohne zugeordnete leere Oberfläche. **190 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet in Cloud-Chromium geprüft.** [Ansicht und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALANSICHT.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an Formprodukte binden; weitere vorhandene Materialreferenzen getrennt zu leeren Oberflächen aufbereiten und sichtbar prüfen. Keine neue Materialstärke/Herstellerfreigabe abgeleitet, keine Veröffentlichung. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formprodukte, Materialzuordnung und 1:1-Kontur-PDF – 05.10.2026

Branch `task/dashboard-form-products-20261005`, GitHub-Basis `7943804ad30a4e94e023c880d24ef9cec5d899a2`. Aus Konturvorlagen entstehen eigene Produktentwürfe in derselben Produktverwaltung, mit Material-/Stärkenangaben, eigenem Preis, unveränderlichen Revisionen, Historie/Kopie/Archiv und passender Vektor-Kontur-PDF. Acrylprodukte bleiben erhalten. **188 Gesamttests bestanden; anschließend 4 gezielte Formprodukt-/PDF-Tests bestanden. Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet tatsächlich geprüft.** [Ergebnis, Ansicht und PDF-Beispiel](docs/dashboard-20261004/DASHBOARD-FORMPRODUKTE.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an diese Formprodukte binden, ohne die Kontur zu verändern oder Gestaltungen zu verzerren. Formprodukte sind noch keine freigegebenen Kunden-/Fertigungsprodukte; Materialszene, Produktionsprofil und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte sind historische Pakete.

## Aktuell: Formkonturen importieren und prüfen – 05.10.2026

Branch `task/dashboard-contour-import-20261005`, Basis `138dc8bbc3dc7f742d40f86fa813fc706a41ec26` (M02-Varianten, über GitHub bestätigt). Werkstatt → Formkonturen: geschlossene SVG-/PDF-Außenform mit Innenausschnitten in tatsächlichen mm importieren, Vorschau und unverändertes Original sichern, gespeicherte Vorlagen erneut öffnen. Bestehende Designs/Produkte unverändert. **185 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet mit synthetischen Konturdateien geprüft.** [Ergebnis, Installationsbefehl und Bilder](docs/dashboard-20261004/DASHBOARD-KONTUREN.md).

**Nächster Schritt:** Konturvorlage in das versionierte Material-/Formproduktmodell einbinden und dieselbe Geometrie in 2D-Vorschau und Produktionskontur nutzen. Importbibliothek ist fertig; freie Produkt-/Fertigungsanbindung und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01 und M02-Variantensteuerung – 05.10.2026

Branch `task/dashboard-options-20261005`, Basis `092228adb0fbc6a14b0850cdeccee947c2c17a45` (M01-Karten/Verwaltungsaktionen, auf GitHub bestätigt). Zusätzlich in M02: verfügbare Größen, Sockel und Wandhalterungen samt Kunden-Startauswahl bearbeiten; gemeinsame Vorschau-/Preisauflösung und Revisionen. **177 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Backend → Speichern → echter Kundenkonfigurator in der bestehenden Cloud mit synthetischen Daten geprüft. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-VARIANTEN.md). Muster Acrylglasbild erhalten, kein Dashboard-Publish.

**Nächster Schritt:** Maßhaltiger SVG-/PDF-Konturimport im Material-/Formmodell, getrennt vom Designimport; Originalmaße und vorhandene Materialreferenzen erhalten. Shopify/Bestellstrecke und reale Fertigungsabnahme bleiben offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01-Karten und Verwaltungsaktionen – 05.10.2026

Branch `task/dashboard-m01-overview-20261005`, Basis `8227eb7db836de5e30779e42fdd7bd36cb1a68f4`. Große Produktkarten mit tatsächlichem Design und vollständiger Platte, Größen/Stand/Designanzahl, Kopieren und revisionsgeschützte Einzel-/Mehrfacharchivierung samt Wiederherstellung. M02 und Muster Acrylglasbild bleiben erhalten. **176 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Cloud-Browserprüfung Desktop/Mobil mit synthetischen Daten, einschließlich parallelem Speicherkonflikt. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-M01.md). Kein Dashboard-Publish.

**Nächster Schritt:** Verfügbare Acrylgrößen/Sockel und Startauswahl in M02 „Optionen & Preise“ über das bestehende Variantenmodell bearbeitbar machen. Shopify, weitere Materialadapter und echte Produktionsabnahme sind weiterhin offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M02-Produktbearbeitung – 05.10.2026

Branch `task/dashboard-m02-editor-20261005`, Basis `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4`. Große Entwurfsvorschau zwischen Bereichen/Elementen und Eigenschaften; Text/Schrift/mm/Farbe, Kundenrechte, Beispielfotoersatz und Uploadhinweis angebunden. Vorhandene Speicher-/Import-/Verlauffunktionen weiterverwendet. **175 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Desktop/Mobil mit synthetischen Daten in der bestehenden Cloud geprüft. [Ergebnis, Grenzen und Bilder](docs/dashboard-20261004/DASHBOARD-M02.md). Keine Dashboard-Veröffentlichung; Muster Acrylglasbild unverändert.

**Nächster Schritt:** M01-Produktkarten entsprechend der ausgewählten fotografischen Übersicht korrigieren. Die älteren „fertig“-Aussagen sind keine vollständige Dashboard-Abnahme.

## Schnellzugriff: Muster Acrylglasbild – 05.10.2026

[**Muster Acrylglasbild öffnen**](https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site/?model=acryl&v=0608ef1) · [Gesicherte Version und Übergabe](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Der aktuelle Konfiguratorstand ist als private Site-Version 12 archiviert. Entwicklungsbasis `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8`; nicht auf frühere Einstiege zurücksetzen. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

# Gravuru 2027 – Einstieg und Übergabe

## Aktuell: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Einstieg – 04.10.2026

**Ab jetzt ausschließlich Codex Cloud weiterentwickeln; GitHub sichert Code und Entscheidungen. Work ist für Gestaltung und Bilder vorgesehen, seine Cloud-Verknüpfung muss noch bestätigt werden.** Zuerst [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md), [STATUS.md](STATUS.md) und [AGENTS.md](AGENTS.md) lesen. Neue Mikail-Cloud-Abnahme (137/0/0, Build 76/1), Chris' isolierter Cloud-Restore und GitHub-Leseübergabe sind bestanden. [Restorebericht](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md) unverändert aus `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2` übernommen. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, Anbindung und visuelle App-Abnahme bleiben offen. Keine Produktionsfreigabe.

Fester Einstieg: »Gravuru 2027 – Cloud – Mikail«, `01a101bb-342f-750b-b481-82c3c3a5c072`. GitHub-Basis `infra/gravuru-2027-cloud-20261003`, Remote-HEAD `f7c3f24db55003c28fec5274dfc5df2736926b6b`; Dokumentübergabe separat auf `infra/cloud-only-handoff-20261004`. Cloud-Arbeitsweise und genau nächster Schritt stehen in CLOUD-AKTUELL.md. Die folgenden Abschnitte bleiben historische Nachweise und überstimmen diesen Einstieg nicht.

## Frühere Nachweise und ursprüngliche Übergabe

## Cloud-Übernahme geprüft (03.10.2026)

Aktueller normaler Quellbaum unter `app/` auf `infra/gravuru-2027-cloud-20261003`, übernommen aus dem SHA-256-geprüften Transportstand `3b2ac03d213ac913bcc61520b595f97dde6aa072`. Ausgangsbranch tatsächlich abgerufen: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`. Die folgenden älteren lokalen/GitHub-Aussagen sind historische Nachweise.

Frisches Verzeichnis in der bestehenden Linux-Cloud-Maschine: 215/215 Quelldateien identisch, vier Referenzarchive korrekt. Node 24.19.0, Python 3.12.14, PyMuPDF 1.28.2. `cloud-check.mjs` und separat `npm test`: jeweils 137 bestanden, 0 Fehler, 0 Skips; `npm run build`: 76 Ressourcen, ein Modell. Kundenkonfi, Editor, Werkstatt/Profile/Serien und Produkt-/Modell-API per HTTP geprüft; fremder Host/Origin und Schreiben ohne CSRF werden mit 403 abgewiesen. Keine Browserabnahme dieses Cloud-Laufs.

Nachweis: `CLOUD-VALIDIERUNG-20261003.md`, `CLOUD-SOURCE-COMPARISON.json`. Kein privater Datenbank-Restore; nur automatisch erzeugter synthetischer Entwicklungs-Master. Keine Produktivveröffentlichung, kein Main-Merge. Neu veröffentlichte Cloud-Maschine, zweiter Account, 24-Stunden-Laptop-aus-Test und vollständige private Sicherung bleiben NICHT GEPRÜFT. Nächster Schritt: Entwicklungsumgebung veröffentlichen und in einer neuen Aufgabe validieren; Datenmigration separat sicher vorbereiten.

Stand: 02.10.2026. **Aktueller Auftrag: vollständige, geprüfte Sicherung und Cloud-Übergabe ohne Datenverlust vorbereiten (CLOUD-UEBERGABE.md).** Ein tatsächlicher Cloud-Lauf ist noch nicht bestätigt. Auftraggeber: Mikail. Kurze deutsche Erläuterungen, sichtbare Ergebnisse und ehrliche Grenzen sind wichtig. Bereits festgelegte Produktangaben nicht erneut erfragen. Der Nutzer erwartet die vollständige Umsetzung und hat ausdrücklich zu wenig sichtbaren Fortschritt kritisiert. Zwischenstände nicht als Ende des Auftrags behandeln.

Aktueller Stand: 137 verschiedene Tests erfolgreich abgedeckt, einschließlich echter PDF-Konvertierung; Build mit 76 Ressourcen/einem Modell. Kundenprodukt `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` bleibt regulär bearbeitbar, Revision 10. Produktverwaltung, Kategorieprofile und XLSX-Stapelanlage bestehen. Neu: SVG/PDF ersetzt nach Vorschau genau ein ausgewähltes Design, Originaldateien und Revisionen bleiben gespeichert. Im Browser mit der vorhandenen Daria-PDF in einer separaten Kopie `cfg_a20d644c-1e4c-4158-8f7b-2be30049722b` geprüft. Importierte Vorlagen sind zunächst feste Grafiken; Kundenfelder werden nicht automatisch rekonstruiert. Der Excel-Stapelimport verknüpft jetzt Dateinamen/PDF-Seiten mit bis zu 100 Produktzeilen; Vorschau und echte Dreier-Testserie sind geprüft. Nächste Umsetzung: explizite Kundenfelder für importierte Designs; anschließend Material-/Form-/Bohrmodell. Shopify und Produktionsstrecke bleiben offen. Keine Wiederholung der abgeschlossenen Grundarbeiten und keine neue Sicherungssuche. Nach Rechnerneustart Anwendung laut `LOKAL-STARTEN.md` starten; URLs allein starten keinen Server.

**Zuerst den neuen Abschnitt in STATUS.md lesen.** Aktive Anwendung unter `app/` auf Branch `task/g27-02-workshop`. Einstieg: http://127.0.0.1:8961/werkstatt/. Historische G27-01-Angaben unten sind kein aktueller Funktionsumfang. G27-02-Basis liegt als ZIP in GitHub-Entwurfs-PR #1; die neuen Designimport-Änderungen vom 02.10. sind bislang lokal. Kein Cloud-Auftrag läuft.

## Maßgeblicher Projektstand

Das neue Projekt heißt **Gravuru 2027**. Repository: https://github.com/Chris83638w/gravuru-2027. Der alte Konfigurator dient als geprüfte Quelle und Vergleich. Keine blinde Kopie des gesamten Altbestands.

Neueste Entscheidung hat Vorrang vor früheren Vorschlägen: **2D genügt zunächst; AR ist auf später verschoben.** Eine 2D-Darstellung eines Wandbilds in einem eigenen Raumfoto kann später ohne Live-AR umgesetzt werden. Ein verlässlicher Maßstab einer solchen Fotomontage benötigt eine bekannte Referenzgröße; diese Funktion wurde noch nicht gebaut.

Die erste neue Kundenoberfläche ist lokal implementiert und geprüft. Aktive Dateien unter `app/`, Start über `LOKAL-STARTEN.md`, aktuelle Prüfung in `G27-01-PRUEFUNG.md`. Eingefrorene Referenzpakete mit 294 Dateien bleiben Herkunftsmaterial. Ein sichtbarer Button oder Screenshot beweist keine vollständige Bestellstrecke.

## Lesen und weiterarbeiten

1. `STATUS.md` und `AGENTS.md`: konkreter Fortschritt und Arbeitsregeln.
2. Aktives nächstes Paket **G27-02** in `UMSETZUNGSPAKETE.md`. `UEBERGABE-SOL-6.1.md` ist der historische Startauftrag; bereits erledigtes G27-01 nicht wiederholen.
3. `QUELLEN-UND-START.md`: Archive prüfen, Quellen gezielt öffnen, vorhandenen Build reproduzieren. `MATERIALREFERENZEN.md` sichert die Materialauswahl und ihre Grenzen.
4. Passende Abschnitte in `NEUE-WERKSTATT-PLAN.md` nachschlagen: bestätigte Anforderungen, Preise und Befunde. `KONFI-VERGLEICH-UND-AR.md` ist ergänzender Hintergrund, keine Pflicht zur erneuten Recherche; AR bleibt vertagt.

## Herkunft

- Altes Repository: `Chris83638w/gravuru-shopify`.
- Am 30.09.2026 geprüfter Quellbranch: `feat/variante-m-profile-20260924`, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`.
- Aufgabenbranch mit dokumentierter Planung: `task/acrylglas-konfigurator-20260929`.
- Letzter dokumentierter Vergleichsstand dort: `e34dffaa6f9c90edd2cfcce58fa1e08541731092`.
- Lokale alte Arbeitskopie: `C:/Users/Mikail Erdem/Documents/Codex/2026-09-29/wa/work/acrylic-konfi`.
- Die lokale Arbeitskopie enthält Acryl-Erweiterungen und Medien, die nicht vollständig in den alten GitHub-Commits stehen. Die ausgewählten Quellen und Ressourcen sind jetzt in den Referenzarchiven mit SHA-256-Manifest eingefroren. Das gesamte historische App-/Werkstattprojekt bleibt davon zu unterscheiden.
- Lokal gezeigte Basisansicht: `http://127.0.0.1:8951/?model=acryl`; Diskussionsansicht ergänzt `&review=1`. Lokale Adresse ist keine öffentliche Bereitstellung und keine Startgarantie auf einem anderen Rechner.

## Geprüfter Bestand und Grenzen

Historische Referenzprüfung: 19 Tests, 104 Ressourcen, 7 Modelle, 294 Dateiprüfsummen. **Aktuelle Anwendung: 137 Tests, 76 ausgewählte Ressourcen, ein Acrylmodell.** Fotozuordnung anhand eindeutiger Feldschlüssel und gemeinsame Acrylpreisregeln sind implementiert. Aktueller Umfang in `STATUS.md`; `G27-01-PRUEFUNG.md` beschreibt nur die erste Kundenoberfläche. Historische Befunde im Bauplan nicht als aktuellen Fehlerstand übernehmen.

Neue Produktverwaltung speichert in SQLite mit Revisionen/Metadaten und Migrationen. Bestehende historische Kundensitzungs-/Produktionsmodule sind noch nicht daran angeschlossen. PDF-/Druckausgaben, freier Konturimport, Produktion und Shopify benötigen ihre jeweiligen durchgehenden Abnahmen.

Zwölf Materialbilder für Edelstahl, Leder, Holz und Acryl wurden wiedergefunden und unverändert gesichert. Schieferbeispiele liegen ebenfalls vor, die reine Rohlingreferenz ist noch nicht eindeutig zugeordnet. Keine neuen Uploads pauschal verlangen. Endgültige Schriftarten, unbestätigte Materialstärken und freigegebene Maschinen-/Farbprofile bleiben offene Voraussetzungen; Details im Materialregister und Bauplan.

## Als Nächstes

G27-02: gemeinsames Modell für Material, Formkontur, Variante, Bohrbild, Design, Kundenfelder und Produktionsprofil samt Speicherung/Revisionen. Aktive Acrylregeln wiederverwenden. Druck und Gravur abdecken; Verwaltung und Stapelverarbeitung verwenden dieselben Regeln. Den Namen Gravuru 2027 konsequent verwenden. Aktueller lokaler Pilot: http://127.0.0.1:8961/?model=acryl. Git-Transportgrenzen in `STATUS.md` beachten.
