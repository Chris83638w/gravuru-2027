# Original-Fotomaske, Werkstattnavigation und Testkauf · 11.10.2026

Quellstand **9b77eb16d8ec7453f58590becf66d829ffe9f2c8**, Version **0.1.0-recovery.20261010+9b77eb16d8ec**, ist auf dem getrennten Händlerhost `https://app-2027.gravuru-designwerkstatt.de` veröffentlicht. Gedenktafel **Revision 5** mit allen neun Preisbindungen und echter Shopify-Testbestellung geprüft. Die bisherige Kundenwerkstatt und Site 14/19 bleiben unverändert.

Arbeitsumgebung: tatsächlich bereitgestellte verwaltete Cloud-Laufzeit, Anbieterkennung `cloud`, Zustand `running/connected`; kein konkreter Infrastrukturbetreiber daraus abgeleitet. Arbeitsverzeichnis `/workspace/gravuru-restored`, Branch `task/live-release-20261010`, Repository `Chris83638w/gravuru-2027`. Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` ist weiterhin Vorfahr; neuere Historie erhalten. Code und Installationspaket zunächst mit Dokumentationsstand `f2f47ef` in allen drei Sicherungsbranches nachgewiesen. Abschließende Nachweise werden mit einem weiteren Dokumentationscommit gesichert.

## Korrekturen und Bedienung

Die aufbereitete Gedenktafel verlor die Bildmaske aus `GT-S-2_2.PDF`: ein neues Foto wurde rechteckig dargestellt. PDF-/SVG-Aufbereitung bewahrt jetzt Clips, Transformationen und weiche Masken als unveränderliche eigene Ressource. Fotoaustausch, Vorschau, Kundenvertrag und technisches Ausgabepaket verwenden dieselbe Maskenreferenz. Keine Kontur wird aus Bildpixeln nachgezeichnet. Der native Export setzt PDF-Helligkeitsmasken in Alpha um und ignoriert ausschließlich unbenutzte SVG-Definitionen. Andere nicht unterstützte aktive Masken werden ausdrücklich abgewiesen.

Revision 5 ergänzt gegenüber Revision 4 ausschließlich die Original-Fotomaske und verständliche Elementnamen (Kontur, Lebensdaten, Foto, Name); siehe `product-diff.json`. Foto, vollständige Cormorant-Garamond-Schrift, Inhalte, Geometrie, Preise und Kundenrechte bleiben erhalten. Revisionen 1–4 und frühere Bestellungen werden nicht umgeschrieben. Die vollständige Schrift entspricht der ausdrücklichen Nutzerwahl anstelle der unvollständigen PDF-Schrift.

In Shopify → Apps → Gravuru Konfigurator neu laden → Produkte → Gedenktafel öffnen. Texte, Motive und Fotofeld im Händlereditor auswählen und bearbeiten; über Kundenansicht den Fotoersatz und Kundeneingaben prüfen. Schriften und Gruppen sind über Verwaltung → Profile erreichbar. Die Händlergestaltung ist von den freigegebenen Kundenrechten getrennt. Die Auswahlmarkierung gehört ausschließlich zur Bedienung und nicht zur Produktionsdatei.

Elementnamen sind bearbeitbar. Hauptnavigation: Produkte, Mastervorlagen, Stapelverarbeitung, Bestellungen; Profile und Zusatzwerkzeuge unter Verwaltung. Verbindungsanzeige aus der tatsächlichen Sitzung; Testbestellanzeige aus gespeicherten Positionen. Die Produktkarte unterscheidet den festgelegten Händler-Teststand von der noch offenen öffentlichen Shop-Freigabe.

## Durchgeführte Prüfungen

- **654 Regressionstests bestanden**, 0 Fehler, 0 übersprungen. Der zunächst auf 180 Sekunden begrenzte Gesamtlauf wurde nach dieser Diagnose mit Parallelität 4 vollständig ausgeführt (222 Sekunden).
- Gezielte Maskenprüfung: Originalimport, geschützte Kundenrechte, unveränderliches Paket, eingebettete Ausgabe und tatsächliche Pixel des eingesetzten Cairo-Renderers. Teilmengen überschneiden sich mit der Regression.
- Vollständiger Händler-Browserablauf bestanden: Schriftupload/Gruppen und Wiederöffnen, Masteranlage, Materialaustausch, Hinzufügen/Ersetzen/Verschieben mit Maus und Touch, getrennte Kundenrechte, Rückgängig/Wiederholen, PDF-Text-/Fotoänderung, Speichern/Wiederöffnen und Kundensicherung. Browseranmeldung synthetisch; siehe `merchant-browser.json`.
- Tatsächliche Original-PDF in privater Datenbankkopie: Händlertext geändert, gespeichert und wieder geöffnet; Kundenfoto ersetzt und Entwurf gesichert. Zu langer Text korrekt abgewiesen, gültige Korrektur gespeichert. Keine JavaScript-Fehler. Zwei bei Navigation abgebrochene Vorschaubildanfragen sind keine nachgewiesenen fehlenden Dateien.
- Navigation und Profile bei 1440 × 1000 sowie 390 × 844 geprüft, ohne horizontalen Überlauf, fehlende Ressourcen oder Konsolenfehler. Profilupload erreichbar; Master-Link öffnet die richtige Ansicht.
- M01/M02 mit tatsächlicher Übersicht und Editor sichtbar verglichen; siehe `design-qa.md` im Repository. Zwei reale Konfigurationen statt sechs illustrativer Beispielkarten; Schieferprodukt statt Acrylbeispiel. Keine pixelgleiche Umsetzung aller historischen Vorlagen behauptet.
- Technische Gravur-PDF aus privater Revision-5-Kopie erzeugt und sichtbar geprüft: ursprüngliche Kreuzmaske mit synthetischem Foto, Texte und Kontur erhalten. Keine Maschinenfreigabe.
- ZIP getrennt installiert; Laufzeit, Authentifizierungsgrenzen, Aktivierung, Testbestellkonfiguration, signierter Eingang und Wiederholschutz nach Neustart mit synthetischen Daten geprüft.
- **401 Serverdateien** gegen das Manifest geprüft. **25 HTTPS-Prüfungen** nach abschließendem Neustart bestanden: Seiten, neue Ressourcen mit identischen Hashes, Shopify-Kontext und CSP; anonyme geschützte API-/Webhook-Aufrufe erhalten weiterhin 401.
- Tatsächlicher Serverstand vor Übernahme mit der geprüften Revision 4 verglichen; ausschließlich sechs freigegebene Änderungen übernommen. Alle neun Varianten/Fotoaufpreise lesend mit Shopify abgeglichen und Revision 5 festgelegt.
- **Echter Shopify-Warenkorb und Testkauf:** genau ein `cartCreate`, Wiederholung ohne zweiten Netzwerkaufruf. Produkt mit einem Foto 3.298 Cent, Versand 499 Cent, insgesamt **37,97 EUR**. Testgateway sichtbar geprüft; Kauf genau einmal abgeschickt, Bestätigung angezeigt. Unabhängiger Admin-Abruf bestätigt `test: true`, Gateway `bogus`, `PAID`, `UNFULFILLED`; genau ein signierter Zahlungseingang und eine zugeordnete Position mit Revision 5. Keine echte Abbuchung; `productionReady: false`, `customerDownloadAllowed: false`. Siehe `shopify-test-order.json`.

## Installation und Wiederanlauf

[Versioniertes ZIP, Prüfsumme und Installationsablauf](../../../../deliverables/merchant-template-r5-20261011/README.md). 27.273.126 Byte, 401 Manifestdateien plus Manifest. SHA-256 **23c26fc573654bc2965cb8f7ee17ecf5f587bb63c44c99a7d4a11618afcb4ab5**. Keine Datenbanken, Kundendaten oder Geheimnisse im Paket.

Nach Deaktivieren/Aktivieren von Site 20 lieferte der Webserver zunächst 503; die direkte Node-Laufzeitprüfung bestand, und kein anderer Händlerprozess hielt die Datensperre. Die ausschließlich für Site 20 neu gesetzte Startdatei `start-r5.cjs` beseitigte die Störung. Sie leitet nun dauerhaft mit `require('./app.cjs');` an den atomar verwalteten Release-Einstieg weiter. Dadurch bleiben künftige Änderungen von `app.cjs` wirksam. Weiterleitungsdatei Modus 0640; private Konfiguration und Daten unverändert geschützt. Neustart und alle HTTPS-Prüfungen danach bestanden. Die genaue interne Webserverursache ist nicht abschließend bewiesen; siehe `server-start.json`.

Bei künftigen Installationen die aktuelle Plesk-Startdatei beachten; den Weiterleiter erhalten. Keine globale Webserveränderung oder Änderung anderer Sites vorgenommen. Ein unverändert wiederholter fehlgeschlagener Aktivierungs-/Schreibaufruf wurde vermieden. Fehlgeschlagene oder unvollständige Backup-Versuche werden nicht als Sicherung gezählt.

## Private Sicherung

Vor Aktivierung: vorherige Laufzeit, Startdatei, Konfiguration und alle drei SQLite-Datenbanken konsistent gesichert. Nach Produktübernahme weitere konsistente Sicherung vor Festlegung des Testwarenkorbs. Die frühere lokale Cloud-Sicherung stimmt mit dem Aktivierungsbackup überein. Originalzeilen in 46 Tabellen geprüft; einzige erlaubte Änderung einer bestehenden Produktkopfzeile: Revision 4 → 5 und Änderungszeit. Historische Revisionen, Bestellungen, Ressourcen und Profile erhalten.

Nach Testkauf wurden alle drei Datenbanken erneut konsistent auf dem Server gesichert und zusätzlich privat in dieser Cloud abgelegt: **41.881.600 Byte**, Dateigrößen, SHA-256 und SQLite-Integrität für jede Datei bestätigt. Erneuter Vergleich aller 46 Tabellen bestanden; das Originalfoto im unveränderlichen Bestellpaket ist byteidentisch und die Paketprüfsumme stimmt. Nachweise: `server-backup.json` und `private-backup-verified.json`. Originalfotos, Original-PDFs, Bestellkennungen, private Checkout-/Entwurfszugänge, Test-Screenshots, Datenbanken und Geheimnisse bleiben außerhalb GitHub.

## Noch offen

- Neue öffentliche Kunden-/Checkout-Strecke und allgemeine Produktübertragung/Veröffentlichung. Der geprüfte Weg ist derzeit der Händler-Testkauf für die ausdrücklich festgelegte Revision 5; Speichern einer neuen Revision schaltet deren Kauf nicht automatisch frei.
- Eigene autorisierte Google-Drive-Anbindung samt Quellordner fehlt. Eine Chat-Verbindung ersetzt sie nicht.
- Nutzer fragt OpenAI als KI-Anbieter an; Angabe „100“ wurde als Budgetobergrenze von 100 EUR/Monat erläutert. Noch keine API-Anbindung, Kostenkontrolle oder kostenpflichtige Aktivierung. API-Abrechnung getrennt vom ChatGPT-Abo; Schlüssel später geschützt serverseitig. Geplante Entwürfe: Motive/Bilder erzeugen oder bearbeiten; anschließende Prüfung von Maßen, Texten, Kundenrechten und Produktionsdaten bleibt erforderlich. Eine Budgetwarnung allein ist keine harte Ausgabensperre.
- Tatsächliche Material-/Maschinen-/ICC-Abnahme; keine Fertigungsfreigabe aus technischen PDF-Tests ableiten.
- Automatisierte reale Shopify-Nutzeranmeldung nicht geprüft; der Nutzer hat den App-Zugang bestätigt. Browserregression nutzt synthetische Identität.
- Nicht erreichbare historische Cloud-/Windows-Dateien, nicht angehängte Aufgabendateien und Commit `c64c197` bleiben gemäß [Herkunftsbericht](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) nicht verfügbar. Nicht als gesichert darstellen und fehlgeschlagene Zugriffe nicht unverändert wiederholen.
