# Shop-Warenkorb: mobiler Anschluss und echter Hausmotiv-Test

Stand: 26.10.2026, Codex/Astra. Basis `main 13c0159406a2217479fea7a20cabf4acda60694b`.
Branch: `dev/shop-warenkorb-nachtrag-20261026-astra`.

Chris hat Fehlerbehebung, echten Produkt-/Hausmotivtest bis in den Warenkorb sowie PR, Merge und Bereitstellung ausdrücklich erlaubt. Keine Zahlung.

## Bestätigter Fehler und Korrektur

Unter 768 px verschob `mobile-steps.mjs` immer den alten `.fk-buy-button` in den Schritt „Prüfen“. Im öffentlichen Shop-Einstieg ist dieser lokale Knopf deaktiviert; der tatsächliche `[data-shop-cart]` blieb im geschlossenen Desktopdialog. Zusätzlich wurde der alte Hinweis „Lokaler Prüfstand · Bestellung noch nicht verbunden“ kopiert.

Mobile verwendet jetzt denselben vorhandenen Shopknopf samt Handler und Status wie Desktop. Es gibt keinen zweiten Speicher-/Warenkorbweg. Der echte Status wird verschoben, damit asynchrone Fortschritts- und Fehlermeldungen auch ohne Editor-Synchronisierung sichtbar bleiben. Beim Zurückwechseln bleiben Position, Listener und laufender Zustand erhalten. Nicht verbundene Vorschauen bleiben gesperrt; bestehende Commerce-Anbindungen behalten ihren Knopf.

Der Shopknopf erhält dieselbe kontrastreiche Darstellung wie andere Hauptaktionen im neutralen Design. Keine Änderung an Preisen, Produktkennungen, Schriftprüfung, Datenbankschema oder Katalog.

## Echte Shopprüfung vor dieser Korrektur

Normale [Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-abger-ecken-v2a-personalisiert-leuchtturm-12x8) → „Jetzt personalisieren“ → Name „Test Haus“ → Bibliotheksmotiv „Haus“ hinzufügen → Desktopabschluss → „In den Warenkorb“ → normaler Shopify-Warenkorb `/cart`.

- Produkt `16077798965628`, Variante `57265913332092`, „Ohne Bohrung“, 120 × 80 mm, Menge 1, **19,99 €**.
- Echte importierte D8-Vorlage mit Ashley/Cinzel/Raleway und zusätzlichem Haus `import-b56d5711a75f34c1fa8d9c30`.
- Warenkorb zeigte Design, Format, Gravurtext „Test Haus …“ und Bearbeiten-URL. Readback über Shop-Warenkorbtool bestätigte genau eine Position und 19,99 €.
- Beim Wiederöffnen blieb die Gestaltung mit sieben Ebenen und sichtbarem Haus erhalten.
- Der in PR #29 gemeldete 422-Schriftfehler trat in dieser konkreten Browserfolge **nicht** auf. Deshalb keine pauschale Freigabe unbekannter Schriften und keine Behauptung, die frühere Ursache damit behoben zu haben.
- Die Motivbibliothek brauchte beim ersten Laden deutlich länger; erst nach dem Laden war das Haus auswählbar.
- Theme zeigt weiterhin das Standardproduktbild und die Bearbeiten-Adresse als Rohtext. Die Theme-Snippet-Installation gehört zu Claudes offenem Anschluss; diese PR ändert das Theme nicht.

![Echter Warenkorb](shop-warenkorb-nachtrag-20261026/desktop-warenkorb.png)

![Gestaltung mit zusätzlichem Haus nach Wiederöffnen](shop-warenkorb-nachtrag-20261026/gespeichert-mit-haus.png)

## Prüfungen der Korrektur

- Gezielt: `node --test app/configurator/variant-m/mobile-steps.test.mjs app/configurator/variant-m/shop-cart.test.mjs app/configurator/variant-m/cart-edit.test.mjs app/configurator/variant-m/acrylic-draft-client.test.mjs` → **21/21 bestanden**.
- Vollauf aller `app/configurator/variant-m/*.test.mjs`: vorher **289 / 281 bestanden / 8 fehlgeschlagen**, nachher **292 / 284 bestanden / dieselben 8 fehlgeschlagen**, keine übersprungen.
- Vorher-Vergleich: unveränderter PR-#29-Quellstand, dessen Konfigurator-Dateien mit aktuellem main identisch sind (main änderte danach nur STATUS und workshop/konfis.test.mjs).
- Acht identische Fehlernamen: zwei Bundle-Dateiumbenennungen mit Windows `EPERM`, ein Kontur-PDF-Test und fünf Druck-/ZIP-Tests in der vorhandenen Python-/Ausführungsumgebung. Kein neuer Fehler. Dieser Lauf ist **kein Werkstatt-Vollauf**; dort wird in dieser PR nichts geändert.
- Drei neue Tests prüfen echte Knotenverschiebung mit erhaltenen Listenern, laufende Status-/Fehleranzeige beim Größenwechsel sowie weiterhin gesperrte lokale Vorschau und bestehende Commerce-Anbindung.
- Lokale Browserprüfung bei 390 × 844 und 1280 × 900: echte D8-Editoroberfläche mit den geänderten Modulen; Warenkorbknopf aktiv; Sicherungsfortschritt und gezielt ausgelöster lokaler Fehler sichtbar; Desktopdialog nach Größenwechsel weiterhin bedienbar. Der lokale Speicherdienst war absichtlich simuliert und schrieb keinen Shop-Warenkorb.

![Lokale mobile Bedienprüfung](shop-warenkorb-nachtrag-20261026/mobile-local.png)

## Übergabe und Abgrenzung

Live-Abnahme der mobilen Korrektur nach Merge/Bereitstellung wird im PR ergänzt. Der oben dokumentierte echte Desktop-Warenkorb wurde bereits auf dem zuvor laufenden Stand erreicht.

Claudes weiteren PR-#29-Nachträge F1/F3/F4 und die `hasOwn`-Absicherung bleiben separat offen; diese eng begrenzte Korrektur behauptet deren Abschluss nicht. Der ursprüngliche Schriftbefund benötigt bei erneutem Auftreten die konkrete fehlschlagende Objekt-/Schriftauswahl.

## Live-Nachweis nach PR #30 (26.10.2026)

PR #30 ist als `d103019b6dc0eb29413345a83af17036ce021055` gemergt und auf app-2027 bereitgestellt. Vorher: Sicherung von Acryl-Daten und aller drei SQLite-Datenbanken mit SQLite-Backup-API und `PRAGMA quick_check = ok`, außerdem Sicherung von Startdatei, vorheriger Codekennung und fünf vorhandenen Arbeitskopie-Abweichungen. Sicherungsordner: `private/sicherung-shop-cart-20261026-astra` unter dem Vhost. Keine Datenbankmigration, kein Katalogimport, keine Änderung der älteren Werkstattdaten.

Bereitstellung mit eigenem Git-Index, Abbruch bei Überschneidung eingehender und lokaler Änderungen, anschließend Hashvergleich der erhaltenen Dateien und Vergleich der vier geänderten Konfigurator-Dateien gegen den Merge-Commit. Plesk **App neu starten** ausgeführt; neuer mobiler Abschluss anschließend im echten Shop geprüft.

### Ergebnis am echten Produkt

- Produkt `16077798965628`, Variante `57265913332092`, 120 × 80 mm, Ohne Bohrung, Menge 1, **19,99 EUR**.
- Startdesign `katalog-TAE-V2A-8x5-D8`, Text **Test Haus**, zusätzlich echtes Bibliotheksmotiv **Haus** (`import-b56d5711a75f34c1fa8d9c30`), insgesamt sieben Elemente.
- Desktoplauf vor Bereitstellung erfolgreich (siehe bestehende Screenshots). Nach Bereitstellung: **390 × 844** im Browser, echter mobiler Warenkorbknopf, sichtbarer Fortschritt, Weiterleitung in den normalen Shopify-Warenkorb.
- Mobile Konfiguration `konfig_986b20b8-d903-4f29-a2c4-0713de1658d4`, zunächst Revision 1. Im selben Tab erneut aus dem Warenkorb geöffnet: Status bestätigt ausdrücklich die vom Server geladene Revision 1. Erneut gespeichert: **Revision 2**, weiterhin **genau eine Position / 19,99 EUR**, also bestehende Position ersetzt und keine Dublette angelegt.
- Die separate Testposition des früheren Desktoplaufs wurde entfernt. Keine Bestellung und keine Zahlung ausgelöst.
- Der früher gemeldete 422-Schriftfehler wurde mit Ashley, Cinzel, Raleway und diesem echten Hausmotiv nicht reproduziert. Keine Schriftprüfung gelockert; daraus folgt keine Aussage zu jedem anderen Produkt.

Die neuen lokalen Handy-Screenshots werden wegen der sichtbaren Namen-/Adressfelder nicht an GitHub übertragen.

### Verbleibende Anzeigeprobleme und Übergabe an Claude

1. **Das veröffentlichte Theme zeigt noch das Standardproduktbild statt der zusätzlichen Entwurfsvorschau und den Bearbeiten-Link als Rohadresse.** Quelle direkt über Shopify Admin API gelesen: Theme `185833718140`, Name `gravuru-shopify-theme/production`, Rolle MAIN. `sections/main-cart.liquid` und `sections/cart-drawer.liquid` überspringen Eigenschaften mit führendem Unterstrich. Damit ist `_Entwurf` unsichtbar. Das bereits vorhandene Repo-Snippet `gravuru-warenkorb-bearbeiten.liquid` ist im Theme nicht installiert/eingebunden.
2. Vorbereiteter Integrationspatch: `ops/shopify/theme-block/patches/20261026-cart-preview.patch`. Er bindet das vorhandene Snippet unterhalb des Produkttitels im Hauptwarenkorb und im Drawer ein und unterdrückt nur bei vorhandener Gravuru-Konfigurationskennung und Revision die doppelte rohe Bearbeiten-Eigenschaft. Standardproduktbild und übrige Eigenschaften bleiben erhalten. **Noch nicht im Theme installiert oder dort visuell geprüft.** Der Shopify-Connector erlaubt Theme-Dateischreibzugriffe nur für unveröffentlichte Themes; keine Umgehung dieser Grenze.
3. Ausgangsstände MD5: `sections/main-cart.liquid = e653c987ec228b80353a8754be5f5566`; `sections/cart-drawer.liquid = 445189ac2e8c73c81c40fe3010873c37`. `git apply --check` gegen beide frisch gelesenen Dateien erfolgreich. Der Shopify-Liquid-Validator startet lokal nicht, weil dem gebündelten Skill `@shopify/theme-check-common` fehlt; **keine erfolgreiche Liquid-Validierung behauptet**. Vor Theme-Übernahme in einer unveröffentlichten Kopie validieren und Vorschau/Link in Hauptwarenkorb und Drawer prüfen. Das bestehende Snippet zusätzlich nach `snippets/gravuru-warenkorb-bearbeiten.liquid` kopieren.
4. Kleiner vorhandener Beschriftungsfehler beim Wiederöffnen: Der Knopf bleibt zunächst „In den Warenkorb“, obwohl der Kontext bereits „Warenkorb aktualisieren“ ist. Die Aktualisierung selbst wurde erfolgreich mit Revision 2 und unveränderter Positionszahl nachgewiesen. Quelle: `installCartEdit` ruft `api.el.sync()` vor dem Setzen von `api.el.cartEdit` auf; eine spätere Synchronisierung korrigiert den Text. Separat berichtigt werden sollte die Reihenfolge und ein Test, der den Kontext beim Sync prüft.

### Testzähler

Gezielt **21/21**. Alle Konfigurator-Tests vorher **281 bestanden / 8 fehlgeschlagen / 289 gesamt**, nachher **284 bestanden / 8 dieselben fehlgeschlagen / 292 gesamt**. Die acht unveränderten Windows-Umgebungsfehler sind im Abschnitt oben beschrieben. Kein neuer Workshop-Vollauf und kein Linux-Vollauf für diesen Nachtrag behauptet.
