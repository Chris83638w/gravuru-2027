# Bestandskonfigurator an die vorhandene Werkstatt anbinden

Stand: 21.10.2026. Ergebnis des autorisierten Schnittstellenabgleichs zwischen der lokalen September-Oberfläche mit Ergänzungen bis 16.10. und dem aktuellen Entwicklungsstand von Gravuru 2027.

Die bestehende Oberfläche und ihre Funktionen bleiben erhalten. Der vorhandene Plesk-Dienst und seine privaten Datenbestände werden weiterverwendet. Eine zweite Checkout-Datenbank oder ein zweiter Server ist nicht vorgesehen. Dieser Abgleich enthält keine Anwendungsänderung, Installation, Veröffentlichung oder Datenmigration.

## Verbindliche Preisentscheidung

Mikail bestätigt am 21.10.2026: **Die neuen Staffelpreise gelten.** Damit ist die frühere Regel „15 Prozent auf das zweite identische Exemplar einschließlich aller Aufpreise“ ersetzt. Durch diesen Abgleich wurden weder lokale Preise noch Shopify-Einstellungen geändert. Die tatsächliche Aktivierung der Staffel im Shop ist noch nicht geprüft.

| Zuordnung gemäß Katalog | Mindestmenge und Rabatt |
| --- | --- |
| Gedenktafeln und Tiergedenktafeln | 2 Stück: 6 Prozent; 3 Stück: 10 Prozent |
| Brettchen, Schlüsselanhänger, Boxen-/Pferdeschilder sowie Themen Firmen-/Hinweisschilder | 5 Stück: 5 Prozent; 10 Stück: 10 Prozent; 25 Stück: 15 Prozent |
| Edelstahl-/Acryl-Türschilder sowie Hausnummern | 3 Stück: 5 Prozent; 5 Stück: 10 Prozent; 10 Stück: 15 Prozent |

Die höchste erreichte Stufe gilt für alle Exemplare derselben Konfiguration. Rabattbasis: Grundpreis, Befestigung/Optionen, zusätzliche Motive, ausgefüllte kostenpflichtige Zusatzfelder und gestaltete Rückseite. Foto-/Logoaufschläge werden anschließend ohne Staffelrabatt addiert. Der rabattierte Betrag wird pro Stück kaufmännisch auf ganze Cent gerundet, danach mit der Menge multipliziert.

Priorität: Unterkategorie vor Größe vor Familie vor erster passender Linien-/Themenvorgabe. Eine leere Liste bedeutet ausdrücklich keine Staffel. Enthält eine Staffel einen offenen Wert, wird sie weder gerechnet noch angezeigt. Keine automatische Staffelzuordnung allein anhand des Materials und keine produktübergreifende Zusammenzählung ableiten.

Quellen: [bestätigte Vorgaben](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/quantity-tier-defaults.json), [Katalogprioritäten](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/katalog-convert.mjs#L297), [Preisberechnung](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/configurator/variant-m/contract.mjs#L207), [Entscheidung vom 20.10.](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/docs/plans/STAFFEL-SHOP-BESTAND-20261019.md).

## Gelesene und geprüfte Stände

- Neues Repository: Chris83638w/gravuru-2027.
- Branch: dev/konfi-neu-20261019.
- Am Anfang des Abgleichs direkt auf GitHub bestätigter Commit: **bf5c059f13e0868d7c554616b7c35ff7a328ae62**, Commitdatum 21.10.2026, 10:37:44 UTC.
- Historische lokale Grundlage: gravuru-shopify, task/konfigurator-bedienung-20260927, d299ddfa139971130ec59996cc6365709435d3e5.
- Lokaler Updateordner: work/konfigurator-update-bis-20261016; Vorschau Port 8966. Einzelne Ergänzungen stammen aus Referenz 3128472e9e692b1e293764b104245289f3e8ca85. Das ist kein vollständiger Checkout des neuen Repositories.
- main bleibt älter und wurde nicht als Entwicklungsquelle verwendet.

STATUS.md enthält historische Abschnitte mit inzwischen überholtem „nicht gemergt“ und offenen Staffelwerten. GitHub-Vergleiche bestätigen: Backend-Commit 64320f7e3e9b5614c66e8e82d6055d9e86603644 und Foto-/Lade-Commit 5956af3dd9dc83f2076ad18c154dad24cb267081 sind Vorfahren des gelesenen Entwicklungsstands.

## Heutige lesende Laufzeitprüfung

| Prüfung | Ergebnis |
| --- | --- |
| Lokale Vorschau GET /models.json | HTTP 200; sechs Prüfmodelle |
| Bestehender Händlerhost https://app-2027.gravuru-designwerkstatt.de/werkstatt/ | HTTP 200 |
| Derselbe Host GET /api/workshop/session ohne Anmeldung | HTTP 401; geschützter Zugriff bleibt gesperrt |
| Öffentliches /workshop-ui/workshop-shell.mjs | HTTP 200; Git-Blob-SHA1 a7ea48a386938efa6b3d7ac39134770d0acfdb5c stimmt mit gelesener GitHub-Datei überein |
| Öffentliches /workshop-ui/workshop-shell.css | HTTP 200; Blob bffe742bdfc3ea293de6cdd86406f4c13c2c64b6 weicht von GitHub-Blob 2f906ff0daabd515cbc9f04fb2df628c9dec39e1 ab |

Damit ist „alle neuen Teile sind noch nicht installiert“ zu pauschal. Es ist jedoch auch keine vollständige Installation des Entwicklungscommits bewiesen. Für den exakten installierten Release sind der geschützte Versions-/Manifeststand und die Laufzeitkonfiguration noch abzugleichen. Die anonyme Prüfung liest keine privaten Entwürfe, Kunden, Bestellungen oder Datenbanken.

Der dokumentierte echte Shopify-Testkauf vom 11.10. ist historische Evidenz: Testgateway, eine zugeordnete bezahlte Testposition, keine Fertigungsfreigabe. Er wurde heute nicht wiederholt. [Nachweis](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/docs/releases/20261011/template-r5/shopify-test-order.json).

## Anschlussmatrix

Die lokalen Pfade beziehen sich auf den genannten Updateordner.

| Bereich | Lokaler Bestand | Vorhandener neuer Vertrag und erforderlicher Übergang |
| --- | --- | --- |
| Sichtbarer Abschluss | configurator/variant-m/completion.mjs:22 enthält deaktivierten Warenkorbknopf und Testhinweis | Erst nach erfolgreich gesichertem Entwurf, verbindlichem Angebot und funktionsfähiger Kundengrenze anschließen; Oberfläche erhalten |
| HTTP | server.mjs:20–26 bietet optionale Workbench, danach nur GET/HEAD; CSP connect-src self | Vorhandenen Backenddienst mit passender Kundensitzung verwenden; keine externe URL in die lokale Vorschau einschleusen und Schutzprüfungen nicht aufheben |
| Alter Checkoutclient | checkout-client.mjs erwartet /api/customer-checkout/session, upload, submit; nur im Test verwendet | Alter Vertrag ist nicht austauschbar mit /api/workshop/acrylic-drafts, Prüfstand, Angebot und Warenkorbrevision |
| Produktbindung | Vier Materialdemos mit local-* und Preis 0; AOSU mit null-Produkt-/Variantenbindung; Schiefer mit historischer 300x200-Quelle und publishedRevision null | Feste cfg_-Produktrevision samt Geometrie, Optionen, Designs, Verfahrensprofil und Preisen aus der Werkstatt laden |
| Gestaltung | Zwei lokale Formate: gravuru-customer-design/v2 und gravuru-universal-customer-draft/v1 | Explizit in den validierten nativen Eingabevertrag übersetzen; keine bloße Änderung der Schemabezeichnung |
| Fotos | Original und bearbeitetes Bild im Browser vorhanden; Freistellwunsch remove/keep | Vorhandene native Sicherung media mit Original/Edited verwenden, Wunsch am Objekt bewahren |
| Fotobearbeitung | photoEdit und Abmessungen bleiben im lokalen files-Eintrag; alter Checkout überträgt sie nicht | Vollständige Wiederöffnung von Ausschnitt, Drehung, Spiegelung und Farbe gesondert abnehmen; reine Bilddateisicherung ist kein Nachweis |
| Preise | Lokale Berechnung ohne neue Mengenstaffel, Zusatzfelder oder Rückseiten | Versionierte Serverberechnung bleibt maßgeblich; neue Staffelentscheidung übernehmen, alten Zweitexemplar-Helper nicht aktivieren |
| Datenhaltung | Alter Store würde customer-checkout.sqlite verwenden | Bestehende private Entwurfs-/Prüfstands-/Angebotsstores nutzen; keine parallele Bestellablage |
| Warenkorbbearbeitung | Keine bestehende Konfigurations-/Warenkorbzeilenrevision im lokalen Client | Neue konfig_-Kennung und Revision führen; bekannte Warenkorbposition ersetzen statt duplizieren |

## Vorhandene Serversequenz

1. Produkt aus GET /api/workshop/customer-model/cfg_…?revision=n beziehungsweise /models.json?configuration=…&revision=n beziehen. Eine Varianten-Gruppe kann zuvor über /api/workshop/variants/variants_…/select aufgelöst werden.
2. Gestaltung mit fester Produktrevision sichern: POST /api/workshop/acrylic-drafts, Eingabe productId, productRevision, designId, objects, options, quantity, media, preview.
3. Bearbeiten eines bestehenden Entwurfs benötigt dessen privaten Token X-Gravuru-Draft und expectedRevision. Ein Versionskonflikt wird abgewiesen.
4. Server erstellt den unveränderlichen Prüfstand mit Geometrie-/Rechteprüfung, Preis, Dateien und Prüfsummen.
5. Gespeicherte Zuordnung von Produktrevision und Optionen zur Shopify-Variante erzeugt ein Angebot mit offerId und offerToken.
6. Vorhandenes Übergabejournal und Storefront-Transport verwenden; unklaren Versand nicht automatisch wiederholen.
7. Für Änderungen aus dem Warenkorb konfig_-Kennung und Revision übernehmen und die gespeicherte Zeile ersetzen. Eine fremde oder unbekannte Zeile darf nicht übernommen werden.

Quellen: [HTTP-Routen](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/http.mjs#L315), [native Sicherung](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/acrylic-review.mjs#L27), [Handoff](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/draft-cart-handoff.mjs), [Warenkorbrevisionen](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/cart-edit-revision.mjs).

## Konkrete Anschlusslücken

1. **Öffentliche Kundengrenze fehlt im gelesenen allgemeinen Weg.** Auf dem Händlerhost verlangen normale Werkstatt-Schreibzugriffe Händlersitzung und CSRF. Der vorhandene merchant-test-cart ist auf eine feste Gedenktafelrevision und neun Varianten beschränkt; cart-http-gate erlaubt test-only. Kontoentwürfe über App Proxy sind ein separater Zugriff, keine Freigabe dieser Bestellstrecke. Eine allgemeine Kundenanbindung muss diese vorhandenen Dienste hinter einer geeigneten Kundenberechtigung verwenden. Händlerzugang und Produktionsblocker dürfen nicht umgangen werden.
2. **Shopify-Staffel muss dieselbe Rechnung bestätigen.** Bei fester Basisvariante sperrt der Vertrag ab der ersten Staffelstufe. Der gespeicherte Personalisierungsvertrag kennt Grundpreis, Motive und Fotos; zusätzliche Feld-/Rückseitenpreise fehlen darin. Eine konfigurierte CartTransform-Kennung beweist noch keinen passenden Shoppreis. Abgleich gegen den tatsächlichen Shoppreis bleibt Pflicht.
3. **Vier Materialdemos sind keine verkaufsfähigen Produkte.** Holz ist zudem in der nativen Review-Zulassung nicht enthalten. Acrylgravur benötigt eine echte passende Produktkonfiguration. Die fünf Verfahrensprofile ersetzen keine Produktdaten.
4. **AOSU bleibt ein eigener Modellfall.** Edelstahlträger, Acrylauflage, Klingelposition, Befestigung und 40 Ausführungen erhalten. Native Pakete führen die getrennte Fertigungsausgabe als offenen Blocker.
5. **Fotobearbeitung vollständig erhalten.** Original, Ergebnis, Wunsch und Bearbeitungsparameter müssen nach Speichern/Laden dieselbe Gestaltung ergeben. Keine automatische Freistellung und kein neuer Photoroom-Anschluss.
6. **Abweichende Bohrlochregel.** Der neue native Review protokolliert auch bloße Textnähe mit Aussage, der Kunde sei gewarnt worden. In diesem Chat gilt ausdrücklich nur die mechanische Prüfung. Den widersprechenden Vermerk nicht ungeprüft übernehmen; echte mechanische Prüfung erhalten.
7. **Quellfehler im Commerce-Pfad.** app/configurator/variant-m/commerce.mjs:31 ruft optionFieldEntries auf, ohne Import oder lokale Deklaration. Bei Anschluss dieses Pfads beheben und gezielt prüfen. Nicht in diesem Abgleich geändert.

Belege: [Hostschutz](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/shopify-admin-host.mjs), [Testbegrenzung](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/merchant-test-cart.mjs#L20), [Preisgrenzen](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/cart-personalization.mjs), [Basispreis-Sperre](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/configurator/variant-m/commerce-model.mjs#L24), [Review-Regeln](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/acrylic-review.mjs#L79), [Commerce-Aufruf](https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/configurator/variant-m/commerce.mjs#L31).

## Begrenzter nächster Umsetzungsschritt

Zuerst die tatsächliche Serverversion und eine bestehende, unterstützte Schiefer-Produktrevision lesend identifizieren. Die aktuelle lokale 300x200-Vorlage darf nicht still auf die 220x140-Gedenktafel gelegt werden.

Darauf einen getrennten Adapter für Produktladung und private Entwurfssicherung vorbereiten. Dieser verwendet die vorhandene UI und die vorhandenen Serverdienste, ohne den neueren Editor über die September-Oberfläche zu kopieren. Zunächst unveröffentlichter Test mit synthetischem Text/Foto und den echten Produktregeln. Vor Warenkorbanschluss Kundenzugriff sowie Shop-Preisvertrag vollständig schließen.

Abnahmefälle:
- Identische Maße, Bohrbilder, Acryl-/Klingelpositionen und Befestigungen vor/nach Laden.
- Texte, zusätzliche Motive, Ebenenrechte, Farben, Undo/Redo und bisheriger Designwechsel bleiben nutzbar.
- Originalfoto, bearbeitete Fassung, Bearbeitungsparameter und Freistellwunsch nach Wiederaufnahme identisch.
- Jede Staffel direkt unter, auf und über der Schwelle; Varianten-/Befestigungswechsel; Fotoaufschlag nach Rabatt; Rundungsfall 19,90 Euro minus 5 Prozent ergibt 18,91 Euro.
- Serverpreis, Shopify-Warenkorbpreis und Bestelleingang stimmen überein; Warenkorbbearbeitung ersetzt dieselbe Zeile ohne Duplikat.
- Fremder Entwurf, veraltete Revision, offenes Preisfeld und unklarer Versand werden abgefangen.
- Keine Übernahme späterer UI-Regeln gegen die hier bestätigten Vorgaben.

## Umfang dieser Übergabe

Ausgeführt: gezielter Quellabgleich, GitHub-Branch-/Commitprüfung, Vorfahrenvergleich, lokale Modellauskunft, anonyme HTTPS-Erreichbarkeit/Schutzprüfung und Vergleich zweier öffentlicher Dateien.

Nicht ausgeführt: Anwendungscode ändern, Daten migrieren, Kundenentwürfe anlegen, Warenkorbmutation, Testkauf, Serverneustart, Produktveröffentlichung oder neue Regressionstests. Die in älteren STATUS-Abschnitten gemeldeten Testzahlen gelten für deren jeweilige Prüfstände und sind kein neuer Testlauf dieses Abgleichs.

Diese Datei sichert die Anschlussentscheidung für die zentrale Koordination und andere KI-Chats. Sie synchronisiert keine Chats automatisch.
