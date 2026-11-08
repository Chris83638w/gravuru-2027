# Edelstahl-Türschilder – geprüfter Anschlussstand

Stand: 08.11.2026. Ziel: bestehendes Shopify-Produkt `16190784438652`, keine Duplikate, freigegebene R15-Oberfläche beibehalten.

## Gesichert und geprüft

- Vollständige private Serversicherung abgeschlossen: sechs SQLite-Sicherungen, Laufzeitarchiv und Einstiegspunkt. Integrität und Prüfsummen bestätigt; [Sicherungsbeleg](server-backup-receipt.json). Keine Datenbanken oder Zugangsdaten in GitHub.
- 8 Katalogfamilien, 80 Größen, 404 zulässige Variantenkombinationen. Die bestehende Oberfläche fasst Ellipse und Oval unter einem der 7 Formreiter zusammen; alle 80 Größen bleiben eindeutig erreichbar. Alle nativen Einzelpreise stimmen mit den Shopify-Varianten überein.
- 15 normale Türschild-Originale statt leerer Starttafel. Start: Familie Rosenberg, abgerundetes Rechteck 12 × 8 cm, ohne Befestigung, 19,99 €.
- Foto deaktiviert, SVG-Logo mit 12,99 € Aufpreis. Originaldesigns und gemeinsame Schrift-/Grundplattenreferenzen bleiben erhalten.
- Isolierter R15-Anschluss auf dem tatsächlichen Server-Grundstand vorbereitet: [PR #197](https://github.com/Chris83638w/gravuru-2027/pull/197). 306 gezielte Tests bestanden.
- Eigene Shopify-App und bestehender V2-Aufpreisvertrag mit allen 404 Varianten geprüft. Aktive CartTransform-Einstellung über die eigene App bestätigt: `172523900`, `blockOnFailure: true`. [Prüfbeleg](cart-transform-server-proof.json). Das bestätigt die Einstellung, nicht den bereitgestellten Funktionscode oder einen erfolgreichen Checkout.
- Lokaler Browsernachweis auf Desktop und 390 × 844 px: Form/Größe/Befestigung, Retrofit-Form 2, SVG-Dateiauswahl, Logoübernahme, Preiszusammenfassung und native Warenkorbvorbereitung.
- Konkreter Preisnachweis: Retro 2, 9 × 6 cm (14,99 €) + zwei Bohrlöcher (2,49 €) + Logo (12,99 €) = **30,47 €**. Die native Vorbereitung und Konfigurationsspeicherung waren erfolgreich; der anschließende echte Shopify-Aufruf war im lokalen Prüfstand ausdrücklich gesperrt.

## Auf dem Server übernommen

- Vollständige Serverprüfung vor dem Schreiben bestanden; native Produktrevision 3 angelegt und alle 404 bestehenden Bindungen auf diese Revision gesetzt. Keine neuen Shopify-Produkte, keine Änderung der Preise oder Produktionsfreigabe. [Übernahmebeleg](native-apply-receipt.json).
- Aktivierungsdatei behält alle bisherigen Einstellungen und verweist ausschließlich auf die gesonderte, geprüfte Laufzeitkopie. Plesk-Neustart durchgeführt; Anwendungsantwort HTTP 200 beobachtet. Die vorherige Startdatei und Laufzeit bleiben gesichert. [Aktivierungsbeleg](runtime-activation-receipt.json).
- Hauptproduktbild aus Original TAE-V2A-8x5-D1 übernommen: Familie Rosenberg auf AB 12 × 8 cm ohne Befestigung. Altes Bild erhalten. [Medienbeleg](main-image-readback.json).
- Produktspezifischer Einstieg einschließlich aller 404 Varianten in [PR #198](https://github.com/Chris83638w/gravuru-2027/pull/198), 72 Tests und unabhängiger Variantentest bestanden. Ein zusätzlicher, ausschließlich auf dieses Produkt begrenzter Kaufbutton-Schutz verhindert den direkten Kauf einer unpersonalisierten Variante bei ausgefallenem JavaScript.

## Shopify-Prüfvorschau und echter Servernachweis

- Produktspezifischen Einstieg in der unveröffentlichten Theme-Kopie `190984126844`, „Gravuru Edelstahl-Konfi Prüfvorschau 08.11.2026“, übernommen und auf der tatsächlichen Shopify-Produktvorschau geprüft. Genau eine Änderung in `templates/product.konfi.json`; nur dieses Produkt betroffen. R15 öffnet eingebettet, „Zurück zum Produkt“ schließt die Einbettung wieder.
- Bestehende Variante `58104606556540` auf Position 1 gesetzt: AB 12 × 8 cm / K00 für 19,99 €. Produktseite, Hauptbild und Konfi stimmen überein. Alle 404 IDs, SKUs und Einzelpreise erhalten. Vollständiger Vorher-/Nachher-Vergleich in PR #198 unter `docs/reviews/2026-11-08-steel-default-variant/`.
- Desktop und mobile Browsergröße 390 × 844 px geprüft: Form/Größe/Befestigung, Logo statt Foto, richtige Startgestaltung und 19,99 €. Dies ist Browserprüfung, kein Test auf einem physischen Handy. [Desktop-Nachweis](shopify-embedded-r15-desktop.png).
- SVG-Dateiauswahl, tatsächliche Serververarbeitung, Gravurvorschau und Übernahme erfolgreich. Testname „Test Edelstahl“ gesetzt. Bestellzusammenfassung: 19,99 € Grundpreis + 12,99 € Logo = **32,98 €**.
- Plesk-Neustart abgeschlossen; tatsächlicher signierter Shopify-Einstieg und SVG-Verarbeitung bestätigen die Aktivierung. [Anschließender Browsernachweis](runtime-browser-verification.json). Der ursprüngliche Aktivierungsbeleg behält seinen damaligen `restartPending`-Wert; der zweite Beleg dokumentiert den Abschluss.
- Echter Warenkorbversuch erreicht die gespeicherte Gestaltung und den Shopify-Aufruf. Shopify meldet **„Kann Variante nicht finden“**, während das Produkt weiterhin `DRAFT` und unveröffentlicht ist. **Kein erfolgreicher Shopify-Warenkorb oder Checkout, keine bezahlte Bestellung.** [Nachweis](actual-cart-draft-proof.json).
- Abschließende Shopify-Leseprüfung: `DRAFT`, 404 Varianten, neues Hauptbild, richtige erste Variante. Veröffentlichtes Theme weiterhin mit ursprünglicher Prüfsumme. [Abschlussprüfung](final-shopify-readback.json).

## Noch vor dem Verkaufsstart

1. Nutzer prüft die geöffnete Shopify-Prüfvorschau.
2. Nach Freigabe Produkt kontrolliert veröffentlichen und das geprüfte Theme manuell aktivieren. Vor einem vollständigen Theme-Wechsel aktuelle Theme-Änderungen vergleichen; die Vorschau ist eine Kopie zum Stand dieses Tests.
3. Anschließend den echten Warenkorb-/Checkout-Pfad mit Grundpreis, Logo-Aufpreis, Befestigung und Größenwechsel prüfen. Keine Verkaufsbereitschaft behaupten, bevor dieser Nachweis erfolgreich ist.

Die automatische Sicherheitsprüfung des Shopify-Connectors hat den direkten Schreibzugriff auf die veröffentlichte Theme-Datei abgelehnt und ein unveröffentlichtes Theme mit manueller Veröffentlichung verlangt. Dieser Block wurde nicht umgangen. Die vorbereitete Änderung liegt vollständig in der Theme-Kopie; das veröffentlichte Theme blieb unverändert.

Das Produkt bleibt unveröffentlichter Shopify-Entwurf. Serverumschaltung und Einbettung sind erfolgt; Verkaufsfreigabe und erfolgreicher Checkout noch nicht bestätigt.

## Übergabe für andere KIs

Freigegebener Konfigurator-Aufbau bleibt geschützt. Nur produktbezogene Daten/zulässige Ausführungen bearbeiten; Änderungen an Bedienung oder Layout ausschließlich nach Abstimmung mit Mika und dem Nutzer. Keine parallelen Schreibläufe auf die 404 Bindungen. PR #196 dokumentiert Optionen und Nachweise, PR #197 die isolierte Laufzeit, PR #198 den produktspezifischen Shopify-Einstieg. Kein Main-Merge aus abweichender Galerie-Ancestry.
