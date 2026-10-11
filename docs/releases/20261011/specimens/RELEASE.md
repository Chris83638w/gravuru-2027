# Vorhandene Muster übernehmen · 11.10.2026

Veröffentlicht auf dem Händlerhost: Quellstand `732850e06919b7bbae1656c2de02b4144d65d6cb`, Version `0.1.0-recovery.20261010+732850e06919`. AOSU/Labrador und Edelstahl/Heimathafen als Master und Produktkopie angelegt. Vorhandenes Acryl „Unser Anfang“ und dessen Produktkopie bleiben unverändert.

## Inhalt

- AOSU/Labrador: originale 160 × 280 mm, vier einzeln editierbare Elemente, vollständige Michroma-Schrift, Klingelbild, Stahloberfläche, vier Rahmen, zwei Acrylfarben, fünf Befestigungen. Originalausschnitte und Montagegeometrie erhalten; alte Shopify-Variantenbindungen entfernt. 40 Preise aus der bestehenden Logik: 4.999 Cent plus Befestigung.
- Edelstahl: zwei erhaltene 90 × 60 mm Heimathafen-Designs, Leuchtturm und Anker, jeweils drei native Texte plus Motiv. Bestehende Fonts und SVG-Transformationen erhalten. Das Charlotte-Groner-Foto ist als Originalreferenz v4 separat sichtbar; keine identische native Gestaltung dafür gefunden.
- Je ein zusätzlicher Master und eine bearbeitbare Produktkopie. Erneuter Import erzeugt nichts neu und erhält eigene Bearbeitungen. Bestehende drei Produkte/Revisionen bleiben erhalten.
- Varianten im Händlereditor, native Schriftprüfung und Kundenübergabe für beide Materialmodelle ergänzt. Speichern erhielt dieselbe 16-MB-Grenze wie Anlage und Vorschau; zuvor lehnte es den 2-MB überschreitenden AOSU-Datensatz ab.

## Prüfung

62 bestehende Regressionstests und eine zusätzliche Ende-zu-Ende-Quellenprüfung bestanden. Letztere prüft alle 40 AOSU-Preise, unveränderte Originalausschnitte, ungültige technische Änderungen, wiederholte Übernahme nach Bearbeitung, gesicherte Kundengestaltung sowie maßhaltige Edelstahl-Ausgabequellen.

Browser: 95 authentifizierte API-Anfragen an echte lokale Laufzeit; synthetische Shopify-Sitzung und simuliertes HTTPS. Beide Muster geöffnet, Text geändert, per Maus verschoben, gespeichert, neu geladen und Kundengestaltung gesichert. Desktop-Sichtprüfung und mobile Ansicht erfasst. Keine echte neue Shopify-Anmeldung damit behauptet.

Private aktuelle Datenkopie: Originalzeilen aller 49 Tabellen unverändert; drei vorhandene Produktstände erhalten, zwei Master und zwei Produktkopien hinzugefügt, Wiederholung ohne Duplikate. Alle SQLite-Prüfungen bestanden. Testzugänge synthetisch; private Daten bleiben außerhalb Git.

## Grenzen

Neue Muster sind Händlerentwürfe, keine veröffentlichten Shopify-Verkaufsartikel. Die getrennte technische Ausgabe für den zweilagigen AOSU-Aufbau wird noch angebunden; eine falsche einlagige Kontur/Gravur ist gesperrt. Stahl kann als technische Gravurgestaltung geprüft werden; reale Maschinen-/Materialabnahme steht aus. Alte Kundenwerkstatt, Shopartikel, Testzahlung und KI-Konfiguration bleiben unverändert. Für diese Übernahme werden keine KI-Aufrufe ausgeführt.

## Veröffentlichung

417 Paketdateien auf dem Server geprüft. Aktivierung mit gesicherter vorheriger Laufzeit und drei privaten SQLite-Sicherungen. Der erste Importversuch wurde von der noch laufenden Sicherungssperre abgewiesen; nach bestätigtem Sicherungsabschluss wurde importiert. Alle drei bisherigen Produktrevisionen sind unverändert. Originalquellen der neuen Motive serverseitig gegen SHA-256 geprüft.

Ein aktiver neuer Händlerprozess seit 17:04:02 UTC bestätigt; 11 HTTPS-Prüfungen bestanden, Oberfläche bytegleich, nicht angemeldete API-Zugriffe weiterhin abgewiesen. Keine neue echte Händleranmeldung im Browser automatisiert; die Nutzerbestätigung der Verbindung aus dem vorigen Paket bleibt ein gesonderter Nachweis.

- AOSU-Produkt: `cfg_bdb17aec-beb9-4b1c-9a34-260602d661b8`, Master `cfg_d8ac86e1-a8ec-4fff-918d-63c474293e28`.
- Edelstahl-Produkt: `cfg_0483b058-e47a-4727-ac65-3560ee3dc975`, Master `cfg_d555df63-6f0e-4295-bfa2-7fe1fd5860cd`.
- Jeweils Revision 1. Vorhandener Acrylmaster „Acrylglasbild · Unser Anfang“ und Produkt „Acrylgladbild Design 2“ unverändert.

Keine neue KI-Anfrage; bisher 34 Cent unter unveränderter 100-EUR-Grenze. Private Konfiguration, Startweiterleiter, bisherige Kundenwerkstatt und Shopify-Artikel unverändert.

## Abschließende Sicherung

Alle Originalzeilen in 49 Tabellen auf dem Server unverändert. Drei SQLite-Sicherungen anschließend privat in die Cloud kopiert: insgesamt 57.962.496 Byte, je SHA-256 und SQLite-Integrität geprüft, Ordner 0700/Dateien 0600. Das Plesk-Kommando zur Sicherung überschritt die HTTP-Wartezeit; sein fertiger Sicherungsbeleg wurde anschließend separat gelesen und geprüft, der Sicherungslauf wurde nicht doppelt gestartet. Code, Originalreferenz, Nachweise und Installationspaket auf GitHub einschließlich `backup/account-recovery-20261010`; private Daten bleiben außerhalb Git.

Nächster fachlicher Schritt: die importierten Muster weitergestalten; bei AOSU den getrennten Fertigungsexport anbinden und erst danach die neuen Shopify-Verkaufsbindungen abnehmen. Die flache Charlotte-Groner-v4 bleibt eine klar bezeichnete Referenz.
