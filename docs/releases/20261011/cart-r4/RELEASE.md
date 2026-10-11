# Bearbeitbare Gedenktafel: Testbestellung mit Foto · 11.10.2026

Der Händler-Testkauf ist jetzt ausdrücklich an Gedenktafel **Revision 4** gebunden. Vorher war ausschließlich die historische Revision 2 zugelassen, sodass die neu bearbeitbare Gestaltung keinen Testwarenkorb öffnen konnte. Speichern neuer Produktrevisionen verschiebt diese Festlegung nicht automatisch.

Quellstand **971c57dea37488926026919f6ab410c43a28e5ff**, Version **0.1.0-recovery.20261010+971c57dea374**, auf dem getrennten Händlerhost `https://app-2027.gravuru-designwerkstatt.de`. Arbeitsverzeichnis `/workspace/gravuru-restored`, Aufgabenbranch `task/live-release-20261010`, Repository `Chris83638w/gravuru-2027`. Die neuere Historie einschließlich Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleibt erhalten.

## Bedienung

Shopify → Apps → Gravuru Konfigurator neu laden → Produkte → Gedenktafel → Kundenansicht. Eigenes Foto einsetzen, die Texte gestalten und den Stand sichern. Für die geprüfte Produktrevision erscheint der Händler-Testwarenkorb; anschließend lässt sich der Test-Checkout öffnen. Nach dem Ändern der Gestaltung erneut sichern. Der Testkauf ist keine öffentliche Checkout- oder Fertigungsfreigabe.

Der Fotopreis wurde nicht geändert: Grundausführung ohne Befestigung 2.299 Cent, ein hochgeladenes Foto 999 Cent, zusammen **3.298 Cent**. Die vorhandene Konfiguration enthält kein kostenloses Foto. Versand im ausgeführten Test: 499 Cent, Bestellgesamtwert **3.797 Cent**.

## Tatsächliche Prüfung

- Eigene Shopify-App las Preisrevision 30; alle neun vorhandenen Varianten einschließlich Optionsnamen, Grundpreisen und Foto-/Motivaufpreisen passen. Shopify-Produkt und Preisfunktion wurden dabei nicht verändert.
- 44 gezielte Node-Tests bestanden; anschließend neun Laufzeitprüfungen mit der tatsächlichen privaten Revisionsfestlegung. Testmengen überschneiden sich. Zugriff bleibt an JWT, Ursprung, CSRF und privaten Entwurf gebunden; Preis-/Variantenüberschreibungen, veraltete Stände, unerwartete Produktionsblocker und wiederholte unsichere Übertragungen bleiben gesperrt.
- Tatsächliche Revision 4 in privater Kopie: alle neun Ausführungen mit hochgeladenem Originalbild, korrekten Fotoaufpreisen, unveränderlichem Prüfstand, Wiederholschutz und synthetisch signiertem Bestelleingang bestanden. Quellenkopien unverändert. Diese Warenkorbantworten waren simuliert.
- Neues ZIP getrennt installiert und gestartet. Paketaktivierung, Testbestelleingang und Wiederholung nach Neustart mit synthetischen Daten bestanden.
- Auf Plesk 399 Paketdateien nachgeprüft. 20 echte HTTPS-Prüfungen bestanden: Seiten/Editorressourcen, Shopify-Kontext, CSP und geschützte API-/Webhook-Endpunkte. Keine automatisierte echte Nutzeranmeldung behauptet; der Nutzer hatte bestätigt, die App öffnen zu können.
- **Echter Shopify-Warenkorb:** genau ein `cartCreate`, 3.298 Cent, Referenz auf den gespeicherten Entwurf, ein Foto. Wiederholung verwendete denselben Warenkorb ohne zweiten Netzwerkaufruf.
- **Echte Shopify-Testbestellung:** sichtbares Test-Zahlungsgateway, Testkarte 1, Gesamtbetrag 37,97 EUR, Bestätigung im Checkout. Unabhängiger Admin-Abruf: `test: true`, Gateway `bogus`, `PAID`, `UNFULFILLED`. Genau ein signierter Zahlungseingang und eine zugeordnete Position mit Revision 4 / 3.298 Cent. Keine echte Abbuchung; `productionReady: false`, `customerDownloadAllowed: false`.

## Sicherung und Installationspaket

[ZIP, Prüfsumme und Installationsablauf](../../../../deliverables/merchant-cart-r4-20261011/README.md). Archiv SHA-256 **2060089b9a154ab563bad9c812b0e2b7750b692cf4bd63344804989722aedb10**, 27.268.520 Byte. Das Paket enthält Code und Ressourcen, keine privaten Datenbanken oder Geheimnisse.

Vor Aktivierung alle drei Datenbanken mit SQLite-Backup/Integritätsprüfung, private Konfiguration, Startdatei und vorherige Laufzeit gesichert. Aktivierungsbeleg dokumentiert die erwartete vorherige Startdatei und den atomaren Wechsel. Neun neue Preisbindungen ergänzt; vorhandene Produktrevisionen, Kunden-/Bestelldaten und Ressourcen nicht überschrieben. 46 Tabellen vor Abschluss des Checkouts auf unveränderte ursprüngliche Zeilen geprüft.

Private Kunden-/Bestellkennungen, Entwurfszugänge, Checkout-Links, Originalbilder, Test-Checkout-Screenshots, Geheimnisse und Datenbanken bleiben außerhalb Git. Die bereits vorhandene private Cloud-Sicherung stimmt mit dem vollständigen Aktivierungsbackup überein. Nach dem tatsächlichen Testkauf wurden alle drei Datenbanken erneut auf dem Server gesichert und zusätzlich privat in dieser Cloud abgelegt: 34.500.608 Byte, SHA-256 und SQLite-Integrität für jede Datei bestätigt. Alle ursprünglichen Zeilen in 46 Tabellen bleiben erhalten. Das Originalfoto im unveränderlichen Bestellpaket ist byteidentisch, die Paketprüfsumme stimmt. Siehe `server-backup.json` und `private-backup-verified.json`.

## Aufgetretene Unterbrechungen

Der erste lesende Server-Prüfaufruf hatte keinen expliziten privaten Konfigurationspfad. Er stoppte vor dem Shopify-Zugriff; der korrigierte Aufruf war erfolgreich. Beim ersten Download des privaten Warenkorbergebnisses fehlte das lokale Zielverzeichnis; nach dessen geschützter Anlage wurde die Datei gespeichert. Der erste abschließende Backup-Helfer mit 30 Sekunden Prozesslimit hinterließ eine unvollständige dritte Kopie samt Journal. Dieser Teilstand wird nicht als Sicherung gewertet; der Ersatzlauf verwendet ein neues Verzeichnis, inkrementelles SQLite-Backup und einen unabhängig laufenden Prozess. Keine unveränderte Wiederholung eines fehlgeschlagenen Schreibvorgangs und kein zweiter Testkauf.

## Offene Grenzen

Öffentliche neue Kundenstrecke, Fertigungs-/Maschinenabnahme sowie Drive/KI-Anbindungen sind weiterhin offen. Die alte Kundenwerkstatt und Site 14/19 wurden nicht verändert. Nicht erreichbare historische Cloud-/Windows-Dateien, nicht angehängte Aufgabendateien und Commit `c64c197` bleiben gemäß [Herkunftsbericht](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) nicht verfügbar. Diese Freigabe betrifft ausschließlich den geprüften Händler-Testweg für Revision 4.
