# ID-Anbindung und Preisstand – 22.10.2026

Ergänzung zu `ID-ANBINDUNG-20261022.md`. Ausgangscommit der Schnittstellenquellen: `2c454cf28fa5837001208d6a801ea04aea3267ff`, Aufgabenbranch `task/universelle-konfi-anbindung-20261022`. Kein Merge nach main.

## Tatsächlich ausgeführt

- Kombinierter Testhost mit den vorhandenen, getrennten Legacy- und Acryl-Datenbeständen aktiviert. Keine Datenbank durch eine neue leere Datenbank ersetzt.
- Neun Legacy-Varianten und eine ausdrücklich ausgewählte Acryl-Variante über echte Shopify-Produkt- und Varianten-IDs gebunden. Die Schnittstelle unterstützt weitere explizite Zuordnungen; nicht alle Shop-Produkte sind damit bereits einzeln angebunden.
- Shopify-App-Version `gravuru-2027-ids-tier-20261022-v1` freigegeben und zurückgelesen, Version `1177374556161`. Alle sieben Module vorhanden. 19 Theme-Dateien, Berechtigungen und Webhooks unverändert. Es wurde keine zweite Cart-Transform-Instanz erstellt.
- Testprodukt `16138083107196`: Produktrevision 5 → 6, Preisvertrag 30 → 31, neun Variantenbindungen und ID-Zuordnungsrevisionen 1 → 2. Frühere Produkt-, Preis- und Bindungsbelege bleiben erhalten.
- Staffel dieses Gedenk-Testprodukts: ab 2 Exemplaren 6 %, ab 3 Exemplaren 10 % auf den vollständigen Stückpreis einschließlich Foto, Motiv und Befestigung. Einmalige Rundung je Stück in Cent; anschließend Multiplikation mit der Menge. Keine Übertragung dieser Staffel auf andere Kategorien.
- Gemeinsame lokale Sicherung beider Datenbestände und Wiederherstellungsprüfung bereits vorhanden. Zusätzlich vor dieser Umstellung drei Legacy-Datenbanken über SQLite-Backup gesichert und mit Integritäts- und Fremdschlüsselprüfung kontrolliert. Private Sicherungen, Fotos, Konfigurationen und Quittungen bleiben außerhalb von GitHub.

## Korrigierte Wartungsprüfung

Ein lesender SQLite-Zugriff auf eine WAL-Sicherung kann eine leere `-wal`-Datei und einen 32-KiB-`-shm`-Index hinterlassen. Die bisherige Prüfung verlangte exakt vier Ordnerdateien und brach deshalb vor der Produktänderung mit `snapshot_members` ab.

`snapshot-members.mjs` akzeptiert ausschließlich die vier Originaldateien und diese genau begrenzten Hilfsdateien. Nicht leere WAL-Dateien, fremde Dateien, fehlende Originale, Verzeichnisse/Symlinks und ungültige SHM-Dateien werden abgewiesen. Die SHA-256-Prüfung aller drei gesicherten Datenbanken bleibt bestehen. Acht lokale Tests bestanden; dieselben acht Tests bestanden auf dem Server vor der Fortsetzung.

Die Serverfortsetzung verwendet zusätzliche Wartungsdateien mit dem Suffix `-fixed`; Originalquellen und erste Fehlversuchsquittungen bleiben erhalten. Die hier bereitgestellten kanonischen Wartungsquellen enthalten dieselbe Korrektur. Wartung nur mit geprüfter Sicherung, festem Plan, erwarteten Revisionen und geschlossener laufender Anwendung ausführen. Kein automatisches Wiederholen einer unklaren Shopify-Mutation.

## Echte Testbestellungen und automatische Übernahme

Die folgenden Bestellungen wurden im Chrome-Checkout mit dem ausdrücklich angezeigten Test Payment Gateway abgeschlossen, anschließend direkt über die Shopify Admin API und lesend in der Werkstattdatenbank geprüft:

| Menge | Bestellung | Shopify-ID | Stückpreis inkl. Foto und Staffel | Artikel gesamt | Versand | Bestellsumme |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | #1024 | 13745774461308 | 31,00 € | 62,00 € | 4,99 € | 66,99 € |
| 3 | #1025 | 13745779016060 | 29,68 € | 89,04 € | 0,00 € | 89,04 € |

Beide: `test=true`, `PAID`, `UNFULFILLED`. Jede Bestellung wurde automatisch über den authentifizierten Shopify-Zahlungseingang als genau eine Werkstattposition aufgenommen. Produktrevision 6, Konfigurations-ID und Konfigurationsrevision entsprechen dem jeweiligen Warenkorb. Gespeichertes Prüfstandpaket per SHA-256 geprüft; Originalfoto im Paket byteidentisch mit der vorhandenen ursprünglichen Testgestaltung. `productionReady=false` und `customerDownloadAllowed=false` bleiben gesetzt. Keine echte Zahlung, Fertigung oder Versendung ausgelöst.

Die vorhandene Foto-Testgestaltung der Produktrevision 5 wurde über den bestehenden ID-basierten Warenkorbdienst in neue unveränderliche Prüfstände für Revision 6 überführt. Gestaltung und Originalfoto blieben erhalten; die ursprüngliche Revision wurde nicht überschrieben. Das ist ein echter Checkout- und Bestelleingangsnachweis, aber noch kein vollständiger Durchlauf des eingebetteten Browsereditors.

## Gefundener und behobener Zustellungsfehler

Die ersten Preis-Testbestellungen #1022 (3 Stück) und #1023 (2 Stück) wurden bereits von Shopify bestätigt, ihre ursprünglichen Zustellungen jedoch mit HTTP 422 abgewiesen: Das bisherige Feldfilter-Abonnement übermittelte `line_items.product_id` nicht. Die neue feste Produkt-/Varianten-Zuordnung verlangt diese ID zu Recht.

Das vorhandene Abonnement `2149402706300` wurde nach Sicherung und erneuter Prüfung ausschließlich um dieses Feld ergänzt. ID, Zieladresse, `test:true`-Filter, API-Version und übrige Felder bleiben erhalten. Keine zweite Subscription und keine Lockerung der Produkt-, Preis-, HMAC- oder Revisionsprüfung. Danach wurden #1024 und #1025 mit neuen Prüfständen als vollständige Abnahme erzeugt. Die ersten Tests bleiben als nachvollziehbare Vorgeschichte erhalten.

`upgrade-order-webhook-fields.mjs` sichert den Vorzustand über einen vorgeschriebenen Callback, liest vor der Mutation erneut und bestätigt das Ergebnis durch Rücklesen. Unbekannte Vorzustände, konkurrierende Änderungen und unklare vorherige Versuche werden nicht blind überschrieben. 15 lokale Tests bestanden (10 Legacy-Vertragstests einschließlich tatsächlicher Feldprojektion und 5 Upgrade-Tests); die 5 Upgrade-Tests bestanden zusätzlich auf dem Server. [Offizielle API für das Aktualisieren einer vorhandenen Subscription](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/webhookSubscriptionUpdate).

## Verbleibende Prüfgrenzen

Die eingebettete Shopify-App bleibt in der gesteuerten Chrome-Ansicht leer, obwohl die Werkstatt-HTML-Seite mit HTTP 200 und dem richtigen Titel ausgeliefert wird. Der vollständige Browserablauf vom Editor bis zum Warenkorb ist deshalb noch nicht abgenommen. Die Shopify-Checkouts selbst sind in Chrome erfolgreich geprüft. Die fehlende Browserprüfung wird nicht durch den serverseitigen Vorbereitungsweg ersetzt.

Formprodukte behalten ihren vorhandenen Preisvertrag. Variable Foto-/Motivaufschläge und Staffelpreise dieser Formprodukte sind noch nicht allgemein ergänzt. Fertigungsfreigaben und öffentliche Aktivierung bleiben getrennte Aufgaben.

## Nächster Schritt

Die offene Chrome-/Einbettungsprüfung beheben und den vorhandenen Editor mit Foto, Änderungen, Wiederöffnen und Warenkorb im Browser abnehmen. Danach weitere konkrete Produkt-/Varianten-IDs anhand ihrer eigenen Preisverträge zuordnen. Neun Legacy-Varianten und eine Acryl-Variante sind derzeit gebunden; die zwei abgeschlossenen Bestellungen betreffen das Gedenk-Pilotprodukt, nicht die vollständige Abnahme aller Produkte.

Private Abschlussnachweise und die beiden bestellten Prüfstandpakete ergänzen die zuvor auf dem Nutzerrechner geprüfte Gesamtsicherung. Das Abschlussarchiv ist keine neue Vollsicherung sämtlicher aktueller Datenbanken. Keine Checkout-Tokens, Fotos, privaten Datenbanken oder Zugangsdaten in GitHub. Für die Wiederherstellung weiterhin vollständige private Quellpakete, Datensicherung und vorhandene Serverkonfiguration gemeinsam verwenden; ein Git-Clone allein enthält die privaten Daten nicht.
