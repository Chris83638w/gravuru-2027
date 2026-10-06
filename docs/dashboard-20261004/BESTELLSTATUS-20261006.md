# Bestellstatus im Dashboard – 06.10.2026

Branch `task/order-status-20261006`, Basis `95788388cb853a7a76c3bb2ff723e334be25caa4`. Umsetzung in der vorhandenen Cloud. Keine Shop-/Servermutation oder Veröffentlichung; ausschließlich frische synthetische Datenbanken.

## Verhalten

Das vorhandene Testbestell-Dashboard zeigt neben dem ursprünglichen Positionswert den später gemeldeten Status: bezahlt, teilweise erstattet, erstattet oder storniert. Eine Stornierung und der Zahlungsstand werden getrennt angezeigt. Bei widersprüchlichen Meldungen mit identischer Änderungszeit ist eine Prüfung erforderlich. Gestaltung, Originalmedien, Menge, ursprünglicher Preis und Bestellposition werden nicht überschrieben.

Eingang über die bestehende signaturgeprüfte Route `/api/workshop/order-webhook`: `orders/paid` sowie neu `orders/updated` und `orders/cancelled`. Nur bestätigter Shop/API-Stand, HMAC über unveränderte Bytes, EUR und ausdrücklich `test: true`. Die Statusprojektion verwendet Shop-Änderungszeiten statt Empfangsreihenfolge; ein später zugestelltes älteres Ereignis setzt eine Erstattung nicht zurück. Status vor Zahlungszustellung bleibt erhalten. Ereignisse sind unveränderlich und gegen widersprüchliche Wiederverwendung der Ereignis-ID gesichert. Es werden nur minimale Statusmetadaten gespeichert, keine Payloads, Kontaktdaten oder Tokens.

Die Erstattung wird hier als **Bestellstatus** übernommen, nicht als bereits zugeordnete Rückzahlung einer einzelnen Position. `refunds/create` ist kein bestätigter Zahlungsausgang und wird nicht als solcher behandelt. Keine Erstattungen ausgelöst. Kunden-Downloads und Fertigungsfreigabe bleiben gesperrt; bestehende private Produktentwürfe können weiterhin aus der Gestaltung vorbereitet werden.

## Prüfung

- 16 gezielte Bestell-/Übernahmetests bestanden, 0 Fehler/Skips; darunter vier neue Fälle für Teil-/Vollerstattung, Storno, widersprüchliche/verspätete Meldungen, Neustart, Signatur, Live-Ablehnung, unveränderte Quelldaten und datensparsame Speicherung.
- Cloud-Check 06.10.2026, 12:15:06–12:16:47 Europe/Berlin: **296 Tests bestanden, 0 Fehler/Skips**, Python/Referenzen erfolgreich; Build **76 Ressourcen/1 Modell**. [Bericht](bestellstatus-cloud-20261006.json).
- Tatsächlicher Chromium-Browserlauf 12:15:47–12:15:52 Europe/Berlin: bezahlt → teilweise erstattet → erstattet → storniert; Aktualisieren/Neuladen und ältere nachgelieferte Nachricht. Unveränderte Bestellposition und Snapshot-SHA geprüft. Desktop 1440, Handy 390 und Tablet 768, keine JavaScript-Fehler. Mobil zunächst überbreiten Preistext gefunden und Umbruch korrigiert; abschließender Lauf bestanden. [Bericht](bestellstatus-browser-20261006.json), [Handyansicht](bestellstatus-mobil-20261006.png).

## Quellen und Grenzen

Offizielle Shopify-Dokumentation über den Shopify-Dev-Skill gelesen: [Webhook-Themen und Payloads, API 2026-07](https://shopify.dev/docs/api/admin-rest/2026-07/resources/webhook), [Ereigniszuordnung](https://shopify.dev/docs/apps/build/events/migrate-from-webhooks). Keine neue Shopify-API-Verbindung konfiguriert oder Webhook-Abonnements angelegt.

Echte Test-Store-/App-Zustellung, gehostete Händleranmeldung, authentifizierte Kundenkonto-Downloads, positionsbezogene Erstattungsbeträge und Maschinen-/ICC-Abnahme bleiben offen. Dies ist eine technisch und im Browser geprüfte Erweiterung der isolierten Teststrecke, keine echte Zahlung oder abgeschlossene Shop-Integration.

## Begleitende Corel-Druckprobe

Nutzer meldete bei der zusätzlichen kombinierten Corel-Testdatei einen beschädigten Import. Ghostscript reproduzierte `/typecheck`, während MuPDF die Datei ohne Warnung las: die vorherige Prüfung mit nur einem Leser reichte nicht. Die unveränderte ursprüngliche 300-dpi-Roland-PDF bestand Ghostscript.

Neue kombinierte `Roland-Pia-Rafael-Corel-PDF13-Vektorweiss.pdf`: PDF 1.3 ohne optionale Anzeigeebenen, Softmasks oder Transparenzgruppen; Farbe + echte RDG_WHITE-Vektorflächen + CutContour in einer Datei. Textpfade erhalten. Halbtransparente Farbpixel sind in dieser separaten Kompatibilitätsprobe gegen Weiß verrechnet, freie Flächen per Vektorclip ausgespart. Keine Änderung der Originalquellen oder des regulären Exporters. MuPDF ohne Reparatur/Warnung und Ghostscript mit `-dPDFSTOPONERROR` bestanden; identische MuPDF-Darstellung zur vorherigen Kompatibilitätsprobe. SHA-256 `2a5f60faded9bb1c6d0ac0c6fc896cb2778dfd8a34bcff4042bb151cb65f0552`, 5232717 Bytes, 150 × 200 mm, ungespiegelt. Datei privat außerhalb Git unter `/workspace/gravuru-druckproben-foto-20261006/` bereitgestellt. **Corel-/RIP-Abnahme durch Nutzer noch offen.** Vorige EINE-DATEI-Testfassung nicht weiterempfehlen.

Nächster Schritt: Ergebnis der Corel-Probe übernehmen und die tatsächliche Shopify-Test-App-Verbindung abnehmen, sobald sie bereitsteht. Keine automatische Live-Freigabe aus dem bestehenden lesenden Connectorzugang ableiten.
