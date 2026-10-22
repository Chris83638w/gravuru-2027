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

## Prüfgrenzen

Die eingebettete Shopify-App bleibt in der gesteuerten Chrome-Ansicht leer, obwohl die Werkstatt-HTML-Seite mit HTTP 200 und dem richtigen Titel ausgeliefert wird. Der vollständige Browserablauf ist deshalb noch nicht abgenommen. Echte abgeschlossene Testbestellungen für 2 und 3 Exemplare sind noch nicht bestätigt.

Die vorhandene Foto-Testgestaltung der Produktrevision 5 wurde als unveränderte Quelle für den serverseitigen Mengenvergleich verwendet. Zwei echte Shopify-Warenkörbe wurden über den gemeinsamen ID-basierten Warenkorbdienst erstellt und zurückgeprüft: 62,00 € für 2 und 89,04 € für 3 Exemplare, jeweils ohne Versand. Das Originalfoto ist in beiden gesicherten neuen Prüfständen byteidentisch erhalten; der historische Prüfstand bleibt unverändert. Die Berechnung und die von Shopify zurückgelesenen Zeilenpreise stimmen überein. Es wurde noch keine Bestellung abgeschlossen. Dieser Servernachweis ersetzt die noch offene Browserprüfung nicht.

Formprodukte behalten ihren vorhandenen Preisvertrag. Variable Foto-/Motivaufschläge und Staffelpreise dieser Formprodukte sind noch nicht allgemein ergänzt. Fertigungsfreigaben und öffentliche Aktivierung bleiben getrennte Aufgaben.

## Nächster Schritt

Die beiden echten Shopify-Warenkörbe auf Rücklesepreise, unveränderte Originalfotos und feste Konfigurationsstände prüfen. Anschließend Checkout ausschließlich im Testmodus abschließen und den Bestelleingang samt unveränderlichem Prüfstand kontrollieren. Die offene Chrome-/Einbettungsprüfung separat beheben und tatsächlich im Browser abnehmen.

