# Varianten im Dashboard zuordnen – 06.10.2026

Branch `task/shop-variant-mapping-20261006`, Basis `8b4bacf38e39a3a3b4285115c10c96252e1322a3`. Vorhandene Cloud-Arbeitsumgebung, eigenes Worktree. Keine Veröffentlichung, Shopify-Schreibzugriffe oder privaten Daten.

## Ergebnis

Die bestehende Seite **Shop vorbereiten** verbindet jetzt die Ausführungen eines vorbereiteten Produkts gemeinsam mit vorhandenen Shopify-Varianten-IDs. Beim Acrylprodukt stehen alle 28 Kombinationen mit den Preisen aus demselben versionierten Modell wie im Konfigurator bereit. Ein Kundenentwurf ist für diese Grundzuordnung nicht mehr erforderlich. Ein späterer gesicherter Kundenentwurf verwendet weiterhin die vorhandene, streng geprüfte Bestellübergabe.

Shop-Domain und numerische Varianten-IDs eintragen, gemeinsam speichern. Leere Zeilen bleiben unverändert. Bestehende Zuordnungen erscheinen nach Neuladen schreibgeschützt. Wiederholtes Speichern erzeugt keine Duplikate. Geänderte Zuordnungen benötigen einen neuen Produktstand; historische Bindungen und Bestellungen bleiben erhalten. Preiswerte nimmt der Server ausschließlich aus dem gespeicherten Produktstand, nicht aus Browserfeldern. Unvollständige, archivierte oder inzwischen geänderte Produktstände werden abgewiesen. Ein Fehler in einer Zeile nimmt alle neuen Zuordnungen dieses Vorgangs zurück.

Die Oberfläche kennzeichnet ausdrücklich: **Shoppreise noch nicht online geprüft; nichts an Shopify gesendet.** Dies ist eine lokale Vorbereitung, kein Beweis dafür, dass eingetragene IDs tatsächlich im Shop existieren oder dort denselben Preis haben. Zusätzliche kostenpflichtige Kundenelemente benötigen weiterhin eine bestätigte Aufpreisbindung.

## Prüfungen

- 18 gezielte Tests (`node --test app/workshop/shop-preparation.test.mjs app/workshop/order-intake.test.mjs app/workshop/acrylic-order.test.mjs`), alle bestanden. Vier neue Fälle für sämtliche 28 Preise, wiederholtes Speichern, vollständiges Zurückrollen, doppelte/falsche IDs, Fremdpreisfelder, erhaltene Revisionen, CSRF und Versionskonflikte.
- `node scripts/cloud-check.mjs`, 06.10.2026 **12:33:09–12:34:54 Europe/Berlin**: **300 Tests bestanden, 0 Fehler, 0 Skips**, Python-/Referenzprüfung bestanden, Build **76 Ressourcen / 1 Modell**. [Bericht](shop-varianten-cloud-20261006.json).
- `PYTHONPATH=.local-data/python python3 scripts/check-shop-variant-mapping.py`, **12:34:10–12:34:19 Europe/Berlin**: 28 Zuordnungen über echte Chromium-Bedienung gespeichert, nach Neuladen erhalten, Wiederholung mit 0 neuen Datensätzen, doppelte Eingaben ohne Teilbestand abgewiesen. Gesicherter Acrylentwurf groß/Eiche/Wand mit 3697 Cent pro Stück und Menge 2 an die bestehende Angebotsstrecke übergeben (7394 Cent); kein Shop-Aufruf und keine Zahlung. Desktop 1440, Handy 390 und Tablet 768 ohne Seitenüberlauf oder JavaScript-Fehler. Die breite Variantentabelle ist auf kleinen Displays horizontal scrollbar. Der erste Browserprüflauf verwendete fälschlich ein nicht vorhandenes Gesamtpreisfeld in der Testassertion; korrigiert auf tatsächliche Angebotsfelder Menge × Einzelpreis, abschließender Lauf bestanden. [Bericht](shop-varianten-browser-20261006.json).
- [Desktopansicht](shop-varianten-desktop-20261006.png), [Handyansicht](shop-varianten-mobil-20261006.png). Ausschließlich synthetische Produkte und IDs.

## Dateien und Grenzen

Implementierung: `order-intake.mjs`, `http.mjs`, `ui/shop-preparation.html`, `ui/shop-preparation-ui.mjs`. Nachweise: `shop-preparation.test.mjs`, `scripts/check-shop-variant-mapping.py` und diese Dokumentation. Keine privaten Datenbanken oder Bilder übernommen.

Der bestehende Muster-Link enthält weiterhin kein interaktives Werkstatt-Backend. Echte Varianten-/Preisabfrage, Test-App-Anbindung, Kundenkonto-Downloads, private dauerhafte Datenablage und Maschinenabnahme bleiben eigene offene Voraussetzungen. Die neue kombinierte Corel-PDF-1.3-Probe bleibt beim Nutzer zur Prüfung; kein Testergebnis vorweggenommen.

Nächster Schritt: Mit bestätigter Test-App-Verbindung die eingetragenen Varianten und Preise gegen den tatsächlichen Shop abgleichen; sobald der Nutzer sein Corel-Ergebnis meldet, dieses separat in die Druckstrecke übernehmen. Keine Live-Freigabe aus lokalen Tests ableiten.
