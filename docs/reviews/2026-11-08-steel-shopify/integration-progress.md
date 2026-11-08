# Edelstahl-Türschilder – geprüfter Anschlussstand

Stand: 08.11.2026. Ziel: bestehendes Shopify-Produkt `16190784438652`, keine Duplikate, freigegebene R15-Oberfläche beibehalten.

## Aktueller Live-Stand: Veröffentlichung erfolgt, Logo-Aufpreis noch fehlerhaft

Der Nutzer hat die geprüfte Theme-Kopie `190984126844` veröffentlicht; die Leseprüfung bestätigt `MAIN`. Das bestehende Produkt `16190784438652` ist `ACTIVE` und ausschließlich im Onlineshop veröffentlicht (Publikation `291556688252`). [Veröffentlichungsbeleg](live-cart-product-release.json). Die weiter unten dokumentierten `DRAFT`-/Vorschauzustände sind historische Prüfstände vor dieser Veröffentlichung.

Die tatsächlichen Shopify-Warenkorbtests ergeben:

| Fall | Auswahl | Soll | Ist | Ergebnis |
| --- | --- | ---: | ---: | --- |
| 1 | Abgerundetes Rechteck, 12 × 8 cm, K00 ohne Bohrung | 19,99 € | 19,99 € | Preis und Warenkorbeintrag bestanden |
| 2 | Rechteck, 15 × 10 cm, KGL selbstklebend für glatte Untergründe | 26,98 € | 26,98 € | Preis bestanden; zunächst fehlerhafte Textzuordnung inzwischen korrigiert und live nachgeprüft |
| 3 | Retro 2, 9 × 6 cm, B02 zwei Bohrlöcher, ein SVG-Logo | 30,47 € | 17,48 € | Nicht bestanden: 12,99 € Logo-Aufpreis fehlen |

Nachweise: [Fälle 1 und 2](cart-live-cases-1-2.json), [Bild Fall 1](cart-live-case-1.png), [Bild Fall 2](cart-live-case-2.png), [Fehler Fall 3](cart-live-case-3-failed.json), [vollständiger Warenkorb](cart-live-case-3-full.png). Die [Konfi-Bestellübersicht](logo-live-order-review.png) zeigt den vorgesehenen Logo-Aufpreis; das ersetzt keinen korrekten Shopify-Warenkorbpreis. Es wurde keine Bestellung bezahlt oder abgeschlossen.

### Zwei gezielte Anschlusskorrekturen, kein Layoutumbau

1. **Textzuordnung bei Formwechsel – korrigiert:** Ein zusammengesetzter Name wie „Test Eins“ wurde beim Wechsel AB → RE auf verschiedene Textfelder verteilt. Die Korrektur in [PR #199](https://github.com/Chris83638w/gravuru-2027/pull/199), finaler Stand `32b81163e42dcddc239d700973d7aa9a6deac158`, erhält die semantische Feldzuordnung. 65 gezielte Tests bestanden. Die isolierte Serverübernahme ist erfolgt; bestehende Abweichungen des tatsächlichen Serverstands wurden erhalten. Neuer Editor-Baustein `editor-1bea892b2cd23111.mjs`, vorheriger Baustein erhalten. [Serverbeleg](text-fix-server-receipt.json). Der anschließende echte Test über die Shopify-Produktseite bestätigt AB → RE: **„Test Eins“ und „Familie“ bleiben vollständig und richtig zugeordnet**. [Live-Prüfbeleg](text-switch-live-proof.json), [Screenshot](text-switch-live-proof.png).
2. **Logo-Aufpreis in Shopify – noch offen, keine Korrektur veröffentlicht:** Der gemessene Preisvertrag ist 18.557 Bytes groß und enthält den aktuellen V2-Vertrag (Revision 2, 404 Varianten) sowie den historischen V1-Vertrag (Revision 1, ebenfalls 404 Varianten). Damit überschreitet er die 10.000-Byte-Grenze für Shopify Functions. [Authentischer Servermessbeleg](pricing-function-input-diagnostic.json). Shopify dokumentiert, dass größere Metafield-Werte für Functions als `null` erscheinen: [Metafield limits](https://shopify.dev/docs/apps/build/metafields/metafield-limits).

   Der erste Erhaltungs-/Stagingversuch ist fehlgeschlagen: fehlendes WASM-Asset und ungültige Theme-Bundle-Verzeichnisse. **Keine Release-Freigabe, aktive App-Version v1 unverändert. Das alte inaktive Function-Artefakt `1199344418817` darf niemals veröffentlicht werden.** Die erste rein lesende Verdichtungsprüfung hat ebenfalls korrekt gestoppt: aktueller und historischer Vertrag unterscheiden sich in 94 Preisen; eine bloß gemeinsam referenzierte Variantenliste passt nicht verlustfrei unter 10.000 Bytes. Dabei wurden keine Preisverträge verändert.

   Die neue verlustfreie Planung bewahrt die unveränderlichen Revisionen über gruppierte Preisabweichungen. Sie reduziert den echten Vertrag von 18.557 auf **9.944 Bytes**; **8.484 Preisvergleiche bestanden**. Das ist ein geprüfter Plan, noch kein Live-Erfolg. Neues WASM-Artefakt, vollständiges Staging, kontrollierte Veröffentlichung, Vertragsübernahme und echter Logo-Warenkorbtest stehen aus. Die Plesk-Sitzung ist abgelaufen; erneute Anmeldung wurde angefragt.

Die frühere vollständige private Sicherung unter `/private/mika-steel-shopify-backup-20261108-v1` bleibt erhalten. Ein zusätzlicher umfassender Sicherungsversuch unter `/private/mika-steel-shopify-backup-20261108-cart-fixes` wurde nach 120 Sekunden abgebrochen und ist **unvollständig**. Die gezielte Sicherung der ersetzten Textdateien unter `/private/mika-steel-shopify-backup-20261108-cart-text-patch` ist dagegen bestätigt; [Übernahmebeleg mit Sicherungsort und Dateiprüfsummen](text-fix-server-receipt.json). Keine privaten Sicherungsinhalte liegen in diesem Repository.

Für die unveränderte Übernahme der bereits veröffentlichten App-Ressourcen ist zusätzlich `/private/mika-steel-theme-assets-20261108.json.gz` gesichert: **4.133.788 Bytes**, SHA-256 `07897a1e5b1662ad7bae901333783aae27e7b745199d24030baf4edfbcf31f24`. Das Archiv enthält 14 exakt veröffentlichte Assets; das 15. Asset stimmt mit der Repository-Datei mit LF-Zeilenenden überein. Diese gezielte Asset-Sicherung ersetzt keine vollständige Serversicherung. Der Erhaltungsplan betrifft acht App-Module, sieben davon unverändert; ein erfolgreicher Release daraus ist noch nicht nachgewiesen.

Offen bleiben der korrigierte echte Logo-Warenkorbpreis, der abschließende Checkout-Nachweis und die Entfernung der drei synthetischen Testpositionen aus dem Prüf-Warenkorb. Die freigegebene R15-Oberfläche wurde für diese Prüfung nicht umgebaut. **Veröffentlichung ist erfolgt; vollständige Verkaufsbereitschaft ist noch nicht nachgewiesen.**

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

## Historischer Freigabepfad und aktuelle nächste Schritte

Die Nutzerprüfung, manuelle Theme-Veröffentlichung und kontrollierte Produktveröffentlichung sind inzwischen erfolgt. Als Nächstes:

1. Textkorrektur ist gesichert, übernommen und AB → RE live bestanden. Den erhaltenen Stand beim weiteren Logo-Test unverändert beibehalten.
2. Nach Wiederherstellung des Serverzugangs neues WASM mit verlustfreier Historienauflösung bauen und Staging vollständig prüfen. Nur den neuen geprüften Stand freigeben; das alte inaktive Artefakt `1199344418817` niemals veröffentlichen. Kompakten 9.944-Byte-Preisvertrag kontrolliert übernehmen; alle historischen Preise und Revisionen erhalten.
3. Warenkorb mit Größe, Befestigung und SVG-Logo erneut prüfen: insbesondere Fall 3 muss 30,47 € ergeben. Anschließend Checkout-Übergabe prüfen und nur die eigenen Testpositionen entfernen. Keine Verkaufsbereitschaft behaupten, bevor diese Nachweise erfolgreich sind.

Die automatische Sicherheitsprüfung des Shopify-Connectors hatte den direkten Schreibzugriff auf die veröffentlichte Theme-Datei abgelehnt und ein unveröffentlichtes Theme mit manueller Veröffentlichung verlangt. Dieser Block wurde nicht umgangen. Die vorbereitete Änderung wurde anschließend vom Nutzer über Shopify veröffentlicht.

Das Produkt ist jetzt veröffentlicht; erfolgreiche vollständige Preisberechnung und Checkout-Abnahme sind wegen der oben beschriebenen offenen Fehler noch nicht bestätigt.

## Übergabe für andere KIs

Freigegebener Konfigurator-Aufbau bleibt geschützt. Nur produktbezogene Daten/zulässige Ausführungen bearbeiten; Änderungen an Bedienung oder Layout ausschließlich nach Abstimmung mit Mika und dem Nutzer. Keine parallelen Schreibläufe auf die 404 Bindungen. PR #196 dokumentiert Optionen und Nachweise, PR #197 die isolierte Laufzeit, PR #198 den produktspezifischen Shopify-Einstieg. Kein Main-Merge aus abweichender Galerie-Ancestry.
