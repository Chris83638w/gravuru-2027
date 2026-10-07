# Testlieferung – 07.10.2026

**Lokale technische Lieferung, keine vollständige Server-/Shopify-/Maschinenabnahme.** Nur synthetische Beispiele, keine Kundendaten oder Schlüssel.

- [Produktserien-Vorlage](produktserie.xlsx): neue Spalten `font_profile`, `motif_profile`, `production_profile_id`, `production_profile_revision`; siehe [Bedienung und Prüfung](../../docs/dashboard-20261004/EXCEL-PROFILE-20261007.md).
- [Ausführungsgruppen-Vorlage](ausfuehrungen.xlsx): vorhandene Vorlage unverändert mitgeliefert.
- [Aktuelles Installationspaket · 25,9 MiB](../plesk-private-test-profiles-20261007/gravuru-2027-private-test.zip) · [SHA-256 und Quellstand](../plesk-private-test-profiles-20261007/README.md). Diese aktualisierte Fassung enthält die Excel-Profile.
- [Plesk-Installation und Betrieb](../../ops/plesk/README.md): zuerst vorhandenen Testbereich prüfen, getrennte Pfade/Node 24+/Python 3.11+/Cairo/Einzelprozess bestätigen, Paket entpacken, `plesk:prepare`, `plesk:check`, nur Test-App neu starten. Die größere Projektsicherung ist kein Installationspaket.

## Synthetische PDF-Proben

| Vorlage | Roland kombiniert | Mimaki Farbe | Mimaki Weiß |
| --- | --- | --- | --- |
| Acryl 150 × 200 mm | [PDF](drucktests/Acryl-Test-roland-pdf.pdf) | [PDF](drucktests/Acryl-Test-mimaki-pdf.pdf) | [PDF](drucktests/Acryl-Test-mimaki-white-pdf.pdf) |
| Form 80 × 60 mm | [PDF](drucktests/Transparent-roland-pdf.pdf) | [PDF](drucktests/Transparent-mimaki-pdf.pdf) | [PDF](drucktests/Transparent-mimaki-white-pdf.pdf) |

Das jeweilige Mimaki-Paar seitenbezogen mit identischem Ursprung **1:1** überlagern; nicht auf sichtbare Objekte beschneiden/zentrieren oder erneut spiegeln. Mimaki-Weiß enthält `RDG_WHITE` und CutContour; der RIP muss Weiß ausdrücklich passend zuordnen. Farb-PDF ohne `RDG_WHITE`; Roland kombiniert CMYK, Vektortexte, Vektorweiß und CutContour. Kein Text als Bitmap, keine Fontobjekte, keine Bildobjekte in der reinen Weiß-PDF. Fotos bleiben Raster. Maße, Quellen, Weiß- und Konturpfade sowie SHA-256 stehen in den benachbarten `.pdf.json`-Prüfdateien. Alle PDFs ohne Reparatur lesbar.

Diese Dateien stammen aus dem aktuellen gesicherten Backend-Ausgabepfad mit synthetischem Foto und Namen. PDF 1.7, kein gemessenes Maschinen-ICC. Nicht mit den historisch bestätigten privaten Corel-PDF-1.3-Proben gleichsetzen; diese Dateien stehen hier nicht zur Verfügung. Im echten RIP bleiben Import, Deckungsgleichheit, Weißdruck, Konturzuweisung, Spiegelung und Material-/Farbwirkung physisch zu bestätigen. Keine Produktionsauslösung durch diese Lieferung.

## Noch notwendiger Anschluss

In dieser Laufzeit fehlt Browsersteuerung mit Plesk-Anmeldung. Der Nutzer hat inzwischen den Link `https://gravuru.highspeed.cloud/admin/domain/list?context=domains` geteilt; das belegt noch keinen Testbereich und überträgt keine angemeldete Sitzung. Die sichtbaren Domain-/Subdomainnamen sind als nächster einzelner Bedienungsschritt angefragt. Die bereits angefragte manuelle Prüfung lautet: unter `https://gravuru.highspeed.cloud:8443` → **Websites & Domains** vorhandene Testbereiche, Node 24+, Python/Cairo und unterstützten Einzelprozessbetrieb bestätigen. Danach nur diesen Testbereich nach Installationsanleitung einrichten. Adresse und nicht geheime Ergebnisfelder von `plesk:prepare`/`plesk:check` mitteilen; keine Passwörter im Chat.

Für anschließende automatisierte HTTPS-Prüfungen den separaten Testbenutzer und das Testpasswort sicher als angeforderte persönliche Cloud-Umgebungsvariablen `GRAVURU_TEST_USERNAME` und `GRAVURU_TEST_PASSWORD` binden; `GRAVURU_TEST_ORIGIN` ist die bestätigte Adresse. Persönlicher Tresor → Umgebungsvariable → Umgebung `gravuru-2027`; dieselben Namen müssen unter deren Umgebungsvariablen ausdrücklich angefordert sein. Keine Plesk- oder Live-Shopify-Schlüssel dafür verwenden. Eine Plesk-Variableneingabe allein bindet nichts an die Cloud-Aufgabe.

Erst nach echtem Serverstart sind HTTPS/TLS, anonymer Passwortschutz, private Dateisperren und Datenerhalt nach **manuellem Neustart dieser Test-App** abnehmbar. Ein funktionierender Testlink ist derzeit nicht bestätigt.

Shopify bleibt ein eigener Anschluss: Das private Plesk-Paket aktiviert weder Shop-Login noch Warenkorb/Webhooks. Erforderlich sind bestehendes App-Secret sicher am Testprozess, bestätigtes HTTPS-Ziel, authentifizierter API-Zugriff samt freigegebenen Testvarianten und ein bestätigter Testzahlungsweg ohne Belastung/Produktion. Öffentlich erreichbare signierte Webhooks und Kundenkonto-Anmeldung benötigen die gesonderte Laufzeitintegration; ein Secret allein schaltet sie nicht frei. Vor jeder Änderung an URL/Weiterleitungen/Abonnements der laufenden App: konkrete Werte und alten Stand sichern, Änderung mit Rückweg vorlegen und Freigabe abwarten. Keine zweite Shopify-App erzeugen, keine globalen Zahlungs-/Servereinstellungen ändern.

Der Nutzer bestätigt: Für Drive existiert noch kein OAuth-Zugang/Google-Cloud-Projekt. Der eigene Drive-Dienst bleibt offen. Für den automatisierten KI-Designassistenten der App fehlen Anbieter und Kostenobergrenzen; die Rückfrage betraf kostenpflichtige API-Aufträge, nicht normale Entwicklung oder Unterstützung in diesem Chat. Es wurde kein Anbieter gewählt und kein KI-Auftrag ausgelöst. Reale Anmeldung, Testbestellung, Drive-/KI-Dienst und physischer Druck sind keine bestandenen Prüfungen.


## Abnahmestand nach Bereich

| Bereich | Vorliegender Beleg | Auf dem echten Testserver |
| --- | --- | --- |
| Dashboard, bestehender Konfigurator, Design-/Motivbearbeitung, Fotos, Texte, Entwürfe | [Bestandene Cloud-Browserabnahme](../../docs/dashboard-20261004/CLOUD-BROWSER-ABNAHME-20261007.md), aktuelle Änderungen zusätzlich gezielt geprüft | Offen |
| Gespeicherte Excel-Serien und Ausführungsgruppen | [Vorhandene Abnahme](../../docs/dashboard-20261004/GESPEICHERTE-EXCEL-ABNAHME-20261007.md); Profilimport neu geprüft | Offen |
| Ordner-/ZIP-Import und Korrektur | [Ordner](../../docs/dashboard-20261004/DESIGN-ORDNERIMPORT-20261007.md), [ZIP](../../docs/dashboard-20261004/DESIGN-ZIPIMPORT-20261007.md); keine unveränderten Gesamtabnahmen wiederholt | Offen |
| Kaufgebundene Dateifreigabe | [Synthetische Abnahme](../../docs/dashboard-20261004/TEST-DATEIFREIGABE-ABNAHME-20261007.md) | Reale Shopify-Kundenanmeldung/Bestellung offen |
| Roland-/Mimaki-Dateien | Neue synthetische PDF-Lieferung technisch geprüft | Serverexport sowie reale RIP-/Maschinen-/ICC-Abnahme offen |
| Installation, Passwortschutz, private Dateien, Neustart | [Aktuelles ZIP entpackt geprüft](../../docs/dashboard-20261004/plesk-profile-package-20261007/report.json), Headerproxy nur lokal simuliert | HTTPS/Passenger/Serverdaten noch nicht geprüft |
