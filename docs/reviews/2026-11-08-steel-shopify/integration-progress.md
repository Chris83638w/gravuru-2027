# Edelstahl-Türschilder – geprüfter Anschlussstand

Stand: 08.11.2026. Bestehendes Shopify-Produkt `16190784438652`, keine Duplikate, freigegebene R15-Oberfläche beibehalten.

## Aktueller Live-Stand: Warenkorb mit Größen, Befestigung und Logo bestanden

Der Nutzer hat Theme `190984126844` veröffentlicht; `MAIN` bestätigt. Das bestehende Produkt ist `ACTIVE`, ausschließlich im Onlineshop (Publikation `291556688252`). [Veröffentlichungsbeleg](live-cart-product-release.json). App-Version `1199363391489`, Tag `gravuru-2027-steel-pricing-input-20261108-v2`, ist aktiv. [Bereinigter Versionsnachweis](app-versions-after-price-fix-sanitized.json). Frühere DRAFT- und Fehlernachweise bleiben historische Beobachtungen.

| Fall | Auswahl und Testname | Soll | Ist | Ergebnis |
| --- | --- | ---: | ---: | --- |
| 1 | Abgerundetes Rechteck, 12 × 8 cm, K00 ohne Bohrung, „Test Eins“ | 19,99 € | 19,99 € | Bestanden |
| 2 | Rechteck, 15 × 10 cm, KGL selbstklebend für glatte Untergründe, „Test Zwei“ | 26,98 € | 26,98 € | Bestanden |
| 3 | Retro 2, 9 × 6 cm, B02 zwei Bohrlöcher, ein SVG-Logo, „Test Drei“ | 30,47 € | 30,47 € | Bestanden einschließlich 12,99 € Logo-Aufpreis |
| Summe | Drei verschiedene personalisierte Zeilen, je Menge 1 | 77,44 € | 77,44 € | Bestanden |
| Menge 2 | Logo-Zeile und Gesamtkorb | 60,94 € / 107,91 € | 60,94 € / 107,91 € | Bestanden |
| Menge 1 und Neuladen | Gesamtkorb | 77,44 € | 77,44 € | Bestanden |

[Ergebnisbeleg](cart-retest-result.json), [geprüfter Warenkorb-Screenshot](cart-retest-final-viewport.png), [Menge-2-Screenshot](cart-retest-quantity-two.png). „Familie“ und zusammengesetzte Namen bleiben erhalten. Alle drei eigenen Testpositionen anschließend gezielt entfernt; leerer Warenkorb beobachtet. [Bereinigungsbeleg](cart-retest-cleanup-sanitized.json). **Keine Bestellung bezahlt oder abgeschlossen, keine Werkstatt-/Produktionsfreigabe.**

### Zwei gezielte Anschlusskorrekturen, kein Layoutumbau

1. **Textzuordnung:** [PR #199](https://github.com/Chris83638w/gravuru-2027/pull/199), Stand `32b81163e42dcddc239d700973d7aa9a6deac158`, erhält die Feldzuordnung beim Formwechsel. 65 Tests bestanden. Isolierte Serverübernahme mit vorheriger Dateisicherung abgeschlossen; bestehende Serverabweichungen erhalten. Neuer Editor `editor-1bea892b2cd23111.mjs`, alter Baustein erhalten. [Serverbeleg](text-fix-server-receipt.json). AB → RE erhält „Test Eins“ und „Familie“ live vollständig: [Prüfbeleg](text-switch-live-proof.json), [Screenshot](text-switch-live-proof.png).
2. **Logo-Aufpreis:** [PR #200](https://github.com/Chris83638w/gravuru-2027/pull/200), Code `2abfd92`, Dokumentation `4d2f5be`. Preisvertrag verlustfrei **18.557 → 2.318 Bytes**; 94 abweichende historische Preise und unveränderliche Revisionen erhalten. Nach vollständiger privater Vertragsicherung genau **eine** vergleichsgesicherte Metafield-Mutation. Nachher-SHA-256 `6b0e4d19ba2f50e638637d03c6e8c0796f93f09d8d362bcf453b495d04a0eb46`. [Live-Übernahmebeleg](pricing-repair-live-receipt.json).

Vollständiger Vergleich aller acht App-Module: sieben unverändert. Nur Function-WASM und Eingabe `pricing.jsonValue` → `pricing.value` geändert; Theme-Dateien, Scopes, Proxy und URLs unverändert. [Vergleich vor Freigabe](final-complete-app-stage-audit.json). Dessen `released: false` beschreibt den Stagingzeitpunkt; der [spätere Versionsnachweis](app-versions-after-price-fix-sanitized.json) bestätigt die Aktivierung. Finales WASM: 20.977 Bytes, SHA-256 `a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2`.

Alle acht Katalogformen, 80 Größen und 404 Preiszuordnungen bleiben erhalten. Sieben vorhandene Formschaltflächen fassen EL/OV als Oval zusammen. Kein Produktaufbau, freigegebenes Design oder gemeinsames Layout geändert.

### Verbleibende Last- und Prüfgrenzen

- **Viele verschiedene Konfigurationen:** Das veröffentlichte WASM besteht lokal zehn gemischte Zeilen mit **8.937.352** Instruktionen. 20 aktuelle Zeilen benötigen **12.959.105**, 20 historische **15.230.050**, 20 gemischte **14.992.773**; alle überschreiten Shopifys 11-Millionen-Budget. Die Dreizeilen-Warenkorbprüfung ist bestanden, 20 unterschiedliche Konfigurationen sind damit ausdrücklich nicht freigegeben. [Exakter WASM-Belastungsnachweis](pricing-release-final-wasm-proof.json).
- **Stückzahl ist nicht Zeilenzahl:** Mengen 20, 50 und 99 derselben Logo-Konfiguration in einer Zeile lokal bestanden (je 1.697.644 Instruktionen). Live Menge 2 mit 60,94 € und Rückkehr auf Menge 1 geprüft.
- **Eingabegröße:** Unabhängige Messung mit endgültigem Vertrag: 20/50/200 synthetische Zeilen ergeben 55.520/138.740/554.940 Bytes. Mit allen optionalen Query-Feldern als `null` und realistisch langen IDs: 58.430/146.000/583.850 Bytes. 50 und 200 überschreiten die 128.000-Byte-Grenze bereits vor Ausführung; Cache löst diese Grenze nicht. Tatsächliche Attribute/URLs können größer sein. [Messung](pricing-input-size-audit.json), [Shopify-Grenzen](https://shopify.dev/docs/api/functions/latest). Keine neue Kundenbegrenzung eingebaut.
- **Dateiauswahl:** SVG-Upload über denselben direkt geöffneten Konfi-Einstieg funktioniert. Das Browserwerkzeug lief bei Dateiauswahl im verschachtelten Shopify-Modal in einen Timeout; kein nachgewiesener Kundenfehler. Direkter Upload, Verarbeitung und Logo-Abrechnung nachgewiesen, Werkzeuggrenze getrennt festgehalten.
- **Abnahmeumfang:** Warenkorb und Preise getestet; keine bezahlte Bestellung, kein vollständiger Bestell-/Produktionslauf, keine Werkstatt-/Produktionsfreigabe.

### Sicherungen und erhaltene Fehlerhistorie

Die vollständige ursprüngliche private Sicherung `/private/mika-steel-shopify-backup-20261108-v1` bleibt erhalten. Zusätzlicher umfassender Versuch `/private/mika-steel-shopify-backup-20261108-cart-fixes`: nach 120 Sekunden abgebrochen, **weiterhin unvollständig**. Gezielte Textdateisicherung `/private/mika-steel-shopify-backup-20261108-cart-text-patch` bestätigt. Der komplette vorherige Preisvertrag wurde vor der Mutation privat gesichert, Sicherungs-SHA-256 `5a6a393bd5a3f9a7130c0d55e2b35a8f1ef63ef5d49dc4e22d5772585fd5809a` im [Übernahmebeleg](pricing-repair-live-receipt.json). Gezielte Sicherungen machen den abgebrochenen Vollsicherungsversuch nicht nachträglich vollständig.

App-Ressourcen zusätzlich unter `/private/mika-steel-theme-assets-20261108.json.gz` gesichert: 4.133.788 Bytes, SHA-256 `07897a1e5b1662ad7bae901333783aae27e7b745199d24030baf4edfbcf31f24`. 14 exakt veröffentlichte Assets; das 15. stimmt mit der Repository-Datei mit LF-Zeilenenden überein. Keine privaten Archive, Rohverträge, Zugangsdaten oder signierten URLs in GitHub.

Erster Logo-Livetest: 17,48 € statt 30,47 €. [Damals beobachteter Fehler](cart-live-case-3-failed.json), [Warenkorb](cart-live-case-3-full.png), [Fälle 1/2](cart-live-cases-1-2.json), [Konfi-Übersicht](logo-live-order-review.png). Der damalige 18.557-Byte-Vertrag lag über der 10.000-Byte-Metafield-Grenze: [Originalmessung](pricing-function-input-diagnostic.json). Erstes Staging und erster Verdichtungsversuch ohne Release/Mutation gestoppt. **Altes inaktives Artefakt `1199344418817` niemals veröffentlichen.** Die 9.944-Byte-Zwischenplanung ist durch die endgültige 2.318-Byte-Lösung ersetzt. Plesk war nach erneuter Navigation erreichbar; der Nutzer hatte mit dem vorhandenen Login recht. Kein offener Anmeldebedarf.
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

## Historischer Stand: Shopify-Prüfvorschau vor der Veröffentlichung

Die folgenden Nachweise bleiben als damalige Beobachtungen erhalten. Der aktuelle `ACTIVE`-/`MAIN`-Stand und die echten Warenkorbergebnisse stehen oben.

- Produktspezifischen Einstieg in der unveröffentlichten Theme-Kopie `190984126844`, „Gravuru Edelstahl-Konfi Prüfvorschau 08.11.2026“, übernommen und auf der tatsächlichen Shopify-Produktvorschau geprüft. Genau eine Änderung in `templates/product.konfi.json`; nur dieses Produkt betroffen. R15 öffnet eingebettet, „Zurück zum Produkt“ schließt die Einbettung wieder.
- Bestehende Variante `58104606556540` auf Position 1 gesetzt: AB 12 × 8 cm / K00 für 19,99 €. Produktseite, Hauptbild und Konfi stimmen überein. Alle 404 IDs, SKUs und Einzelpreise erhalten. Vollständiger Vorher-/Nachher-Vergleich in PR #198 unter `docs/reviews/2026-11-08-steel-default-variant/`.
- Desktop und mobile Browsergröße 390 × 844 px geprüft: Form/Größe/Befestigung, Logo statt Foto, richtige Startgestaltung und 19,99 €. Dies ist Browserprüfung, kein Test auf einem physischen Handy. [Desktop-Nachweis](shopify-embedded-r15-desktop.png).
- SVG-Dateiauswahl, tatsächliche Serververarbeitung, Gravurvorschau und Übernahme erfolgreich. Testname „Test Edelstahl“ gesetzt. Bestellzusammenfassung: 19,99 € Grundpreis + 12,99 € Logo = **32,98 €**.
- Plesk-Neustart abgeschlossen; tatsächlicher signierter Shopify-Einstieg und SVG-Verarbeitung bestätigen die Aktivierung. [Anschließender Browsernachweis](runtime-browser-verification.json). Der ursprüngliche Aktivierungsbeleg behält seinen damaligen `restartPending`-Wert; der zweite Beleg dokumentiert den Abschluss.
- Echter Warenkorbversuch erreicht die gespeicherte Gestaltung und den Shopify-Aufruf. Shopify meldet **„Kann Variante nicht finden“**, während das Produkt weiterhin `DRAFT` und unveröffentlicht ist. **Kein erfolgreicher Shopify-Warenkorb oder Checkout, keine bezahlte Bestellung.** [Nachweis](actual-cart-draft-proof.json).
- Abschließende Shopify-Leseprüfung: `DRAFT`, 404 Varianten, neues Hauptbild, richtige erste Variante. Veröffentlichtes Theme weiterhin mit ursprünglicher Prüfsumme. [Abschlussprüfung](final-shopify-readback.json).

## Aktuelle nächste Schritte und Abnahmegrenzen

Die beauftragte Warenkorbprüfung mit Größen, Befestigung und Logo ist einschließlich Menge 2, erneutem Laden und Bereinigung bestanden. Keine bezahlte oder abgeschlossene Bestellung und **keine Werkstatt-/Produktionsfreigabe**. Ein vollständiger Bestell-/Produktionslauf ist nicht behauptet.

Als nächstes gesondertes Paket ist die bekannte Lastgrenze für viele verschiedene Konfigurationen zu beheben. Dafür zuerst eine Lösung vorlegen; keine neue Kundenbegrenzung oder Bedienänderung ohne Abstimmung einbauen. Nicht behaupten, 20 verschiedene personalisierte Warenkorbzeilen seien unterstützt.

Der Shopify-Connector hatte direkten Schreibzugriff auf das veröffentlichte Theme abgelehnt. Dieser Block wurde nicht umgangen: Die vorbereitete Theme-Kopie wurde vom Nutzer manuell veröffentlicht. Die spätere Logo-Preisreparatur änderte weder Theme-Dateien noch den freigegebenen Konfi-Aufbau.
## Übergabe für andere KIs

Freigegebener Konfigurator-Aufbau bleibt geschützt. Nur produktbezogene Daten/zulässige Ausführungen bearbeiten; Änderungen an Bedienung oder Layout ausschließlich nach Abstimmung mit Mika und dem Nutzer. Keine parallelen Schreibläufe auf die 404 Bindungen. PR #196 dokumentiert Optionen und Nachweise, PR #197 die isolierte Laufzeit, PR #198 den produktspezifischen Shopify-Einstieg. Kein Main-Merge aus abweichender Galerie-Ancestry.
