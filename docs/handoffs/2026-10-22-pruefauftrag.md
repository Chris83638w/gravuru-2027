# Unabhängige Prüfung und Übernahme · 22.10.2026

Ziel: feststellen, welche Teile der bestehenden Gravuru-Strecke belastbar abgenommen sind, den offenen leeren App-Start eingrenzen und die noch fehlenden Produkt-/Preisverträge planen. Zunächst **lesend prüfen und Befunde melden**. Bestehende Funktionen, Originale und gespeicherte Gestaltung erhalten. Keine neue Gestaltung, kein Merge/Deployment oder Datenbankersatz allein wegen dieser Übergabe.

## Einstieg

1. `Chris83638w/gravuru-2027`, Branch `task/universelle-konfi-anbindung-20261022` lesen; aktuellen vollständigen SHA nennen. Ausgangsstand dieser Übergabe `b4d944e1409bc66647d582cc3d00710549d9d3f5`, danach Dokumentationscommit. Nicht auf `main` ausweichen.
2. `AGENTS.md`, `START_HERE.md`, aktive Umsetzungspakete, [Gesamtübergabe](2026-10-22-vollstaendige-uebergabe.md) und [Entscheidungen](2026-10-22-entscheidungen-und-funktionserhalt.md) lesen.
3. Privates Gesamtpaket vom Nutzer übernehmen. Größe/SHA und `TRANSFER-MANIFEST.json` prüfen. Vorhandene Originaldateien niemals überschreiben. `PRIVATE-UEBERNAHME.txt` gibt genaue Pfade und Übernahmefolge.
4. Drei Bestände getrennt halten: aktuelle Legacy-/Acryl-Sicherung vom 22.10. und historische lokale Werkstatt vom 23.09. Außerdem Datenzeitpunkt und späteren Quell-/Bestellstand unterscheiden.
5. Fehlenden GitHub-, privaten Datei-, Plesk- oder Shopify-Zugriff konkret nennen. Sitzungen sind nicht übertragbar und dürfen abgelaufen sein; gespeicherten Originaltab nicht zerstören.

## Abnahmematrix

| Priorität | Prüfpunkt | Vorhandener Beleg | Noch erforderlicher Nachweis |
| --- | --- | --- | --- |
| P1 | Direkter App-Start | Start-HTML 200; gespeicherter Editor nach manueller Navigation nutzbar; gesteuerte Dokumentantwort pausiert | Normalen Chrome-Start unabhängig von dieser Steuerungsblockade prüfen, Initialrequest/Redirect/Frame/JS-Start gezielt abgleichen. Kein dauerhafter Fix belegt |
| P1 | Vollständige aktuelle Wiederherstellung | Sechs konsistente Backup-DBs; neue Quellrekonstruktion, zwei Builds, 115 Tabellen erhalten | Frischer vollständiger Snapshot einschließlich späterer Bindungs-/Preis-/Bestelldaten und isolierter Linux/Plesk-Anwendungsstart mit getrennt übertragenem Zugang |
| P1 | IDs und Mandantengrenzen | Planer/Adapter/Register/Gatewaytests; neun Legacy- und eine Acryl-Variante | Weitere konkrete Produkte einzeln prüfen; keine fremde/veraltete cfg-/Varianten-/Storezuordnung zulassen |
| P1 | Vollständiger Pilot-Browserablauf | Gespeicherter Entwurf, Fotopreis 2/3 sichtbar; echte Shopify-Testbestellungen und Eingang | Frischer normaler Einstieg, Bearbeiten, Speichern/Wiederöffnen und gezieltes Ersetzen der bestehenden Cartzeile ohne Duplikat |
| P1 | Formpreise und Optionen | Bisheriger Festpreis bleibt; Katalog-Staffelvorgaben existieren | Allgemeiner Vertrag für Foto/Motive/Staffeln/Zusatzfelder/Rückseite soweit je Produkt angeboten. Nicht kostenlos durchreichen |
| P1 | Öffentlicher Kundeneinstieg | Private Händler-Testgrenze und geschützte Originale | Verkaufsfähiger öffentlicher Zugriff, Origin/Auth/CSRF, private Downloads und Bestellzuordnung gesondert abnehmen |
| P2 | Fotoerhalt | Originalhashes, gespeichert/bestellt, 15-MiB- und Linux-Prüfungen | Zuschnitt/Drehung/Spiegeln/Farbzustand/Freistellwunsch vollständig nach Wiederöffnung identisch; Fehlermeldung bei >15 MiB |
| P2 | Mechanik und Warnungen | Alte GV-Geometrieprüfungen; bestätigte Warnregeln | Druck ohne Überlagerungswarnung, Gravur mit ignorierbarem Hinweis; nur mechanische Bohrprobleme melden, kein falscher Kundenwarnvermerk |
| P2 | Bedienregression | Vollständige September-/Updatequellen und frühere Tests/Screenshots | Gezielter Vorher-Nachher-Abgleich aller Erhaltungsfälle aus Entscheidungsregister, Desktop/Mobil/Tastatur |
| P2 | Material/Befestigung | Originalinventare und einzelne echte Produktmodelle | Jede reale Produktfamilie mit echtem Material/Befestigungen statt Demo; fehlende Originalreferenzen offenlegen |
| P2 | Fertigungsprofile | Versionierter Vertrag; private ID-Prüfung kann fehlendes Profil ausweisen | Unterkategorie-Standard, Produktausnahme und spätere Produktionsfreigabe; echte Maschinendaten nicht raten |
| P2 | Last und Betrieb | Einzelprüfungen, Workerbegrenzung, bestehender Server | Isolierter repräsentativer Lasttest, Überwachung und Wiederanlauf; kein Lasttest gegen laufenden Shop ohne Abstimmung |

## Preise gezielt nachrechnen

Gedenk-Pilot: 2299 + 999 = 3298 Cent vor Staffel; 2 × round(3298 × 0,94) = 6200, 3 × round(3298 × 0,90) = 8904 Cent. Browserleiste, Detailansicht, verbindlicher Serverpreis, Shopify-Warenkorb und gespeicherter Bestelleingang müssen übereinstimmen. Versand gesondert behandeln. Menge unmittelbar unter/auf/über einer Kategorie-Schwelle, Foto/Motiv/Befestigung und Variantenwechsel prüfen. Alte Zweitexemplar-15-%-Logik darf nicht wieder aktiviert werden.

Vorhandene Zwei-/Drei-Stück-Testkäufe und der jüngste Foto-Testkauf sind Nachweise, keine Aufforderung zum erneuten Kauf. Wiederholungen nur bei tatsächlichen Änderungen oder offenen Nachweislücken. Keine reale Zahlung oder Fertigung auslösen. Produktionsblocker bleiben bestehen.

## Technische Prüfpunkte und Rückfall

- Gemeinsamen Anschluss an beide vorhandenen Stores prüfen; keine neue Bestell-Datenbank oder zweite Cart Transform.
- HMAC-Rohdaten, Produkt-ID im bestehenden Webhook-Feldfilter, wiederholsichere Auftragsannahme und getrennte Storetransaktionen prüfen. Frühere fehlgeschlagene Ersttests nicht blind nachträglich einspielen.
- Native Quelldateien und spätere Preis-/Fotopatches über Hashes abgleichen. Die alte große Quell-ZIP vor den Patches ist allein kein aktueller Release.
- Historische Installationsskripte enthalten erwartete alte Hashes/Revisionen. Nicht erneut ausführen oder Schutzprüfungen abschwächen. Rückfall nur mit passenden **Quellen und Datenzeitständen**, nie altes DB-Backup über neuere Bestellungen kopieren.
- Foto-/Konfigurationstokens nicht auslesen, in Logs übernehmen oder in URLs verschieben. Normaler neuer Tab übernimmt privaten sitzungsgebundenen Zugang nicht automatisch.
- Bei tatsächlichem Codefehler kleine gesonderte Änderung mit passendem Test vorbereiten. Vor Deployment konkrete Änderung, aktuelle Sicherung und überprüfbaren Rückfall benennen; bestehende Autorisierung und neue Konflikte unterscheiden.

## Erwartete Rückmeldung

Gelesener Commit; übernommene private Pakete/Hashes; tatsächlich ausgeführte Prüfschritte; Befunde mit Datei/Funktion und sichtbarer Auswirkung; als sicher/teilweise/offen eingestufte Punkte; ein begrenzter nächster Schritt. Keine pauschale Aussage „alles fertig“, solange Start, öffentliche Strecke, weitere Produktbindungen oder passende Preis-/Fertigungsvorgaben noch offen sind. Keine erneute Abfrage bereits beantworteter Farben, Rabattumfang, Photoroom, Serverwahl oder Warnregeln.
