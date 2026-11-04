# Konfi: Motivauswahl, mobile Reiter und Warenkorbprüfung

Auftrag Mikail, 04.11.2026: „Weiter, mach die Motivauswahl und die Handynavigation wie in Astras neuem Konfi fertig und teste den Warenkorb. Stimm dich mit Astra 1 ab, damit nichts doppelt gemacht wird.“

**Abschluss:** gemeinsam mit Astras #176 bereitgestellt. Funktionsstand **def626c**, Merge **fcfebb6** enthält Astras **87ba78e** unverändert. Aktiver Stand **private/mika-konfi-motive-navigation-20261104**, Bundle **editor-b93acc5ae85f90c3.mjs**. [Auslieferungsnachweis](konfi-motive-navigation/release-verification.json). Monogramm-Warenkorb bleibt wegen DRAFT ohne Erfolg; keine Bestellung ausgelöst.

## Quellen und Zuständigkeit

- UI-Vorlage: #161, `db4f4a4efdd411e8d28aec2d126e488a1b9b0c48`, `prototypes/produktprofile`. Ein Kategorie-Dropdown, Bestseller zuerst, 18 Motive plus 18 je Nachladen, dieselben Produktreiter auf dem Handy.
- Motivpreis: Mikails ausdrückliche Vorgabe im Chat, 169 Cent für jedes zusätzlich eingefügte Motiv; native Preisberechnung und geprüfte Shopify-Bindung bleiben unverändert.
- Originaldesigns/-motive folgen weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Kein neues Design, keine neue Katalogfreigabe.
- Astra 1 entwickelte ausschließlich den Sticky-/Vorschau-Fix in `modern-layout.css`, ich die Motivauswahl und mobilen Reiter. Seine Rückmeldung [#48/6635498106](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6635498106) lag vor der Aktivierung vor. Daraufhin wurde #176/87ba78e unverändert integriert, gemeinsam geprüft und der aktive Stand in [6635647949](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6635647949) zurückgemeldet. Keine doppelte Umsetzung des Vorschau-Fixes.

## Umsetzung

`motif-browser-model.mjs` filtert ausschließlich erlaubte Originalmotive und die vorhandene thematische Bestseller-Auswahl. `modern-motif-browser.mjs` verwendet die native Suche, Kategorieauswahl und Motivbuttons. Die alte zweite Kategorie-Auswahl samt Dialog/Swipe-Handler entfällt. 721 Motive bleiben über „Alle Kategorien“ erreichbar; Monogramm startet mit 49 thematischen Empfehlungen, davon zunächst 18 sichtbar. Eine explizit leere Produktauswahl bleibt leer.

`modern-mobile-navigation.mjs` zeigt die vorhandenen Reiter Ausführungen, Designs, Text, Motive und gegebenenfalls Foto. Es versetzt die vorhandene Preis-/Mengenleiste in die mobile Bildschirmhülle; beim Wechsel zum Desktop kehrt sie zurück. Originale Ereignisbehandlung, Prüfungen, Mengenberechnung und Warenkorb-Übergabe bleiben erhalten. Fokus/Korrektur wechselt zum passenden Reiter, Tastaturhöhe wird berücksichtigt. Keine zweite Preislogik, kein neuer Checkout.

Die Abschlussübersicht verwendet `resolvedOptions` und `optionFieldEntries`. Versteckte Abstandshalter-Farben erscheinen nicht mehr doppelt bei „Ohne Bohrung“.

## Prüfung und Grenzen

- 45/45 gezielte Prüfungen auf dem separaten Serverstand erfolgreich; nach Integration zusätzlich 41/41 mobile Prüfungen und gemeinsamer Build erfolgreich. Zusätzlich 16/16 lokale Workflow-/Usability-Prüfungen. Die Läufe enthalten Überschneidungen und werden nicht als 86 unterschiedliche Tests ausgewiesen. Die alten Mobile-Tests prüfen weiter die wiederverwendeten Hilfsfunktionen; sie sind kein alleiniger Nachweis der neuen Reiteroberfläche.
- Tatsächliche lokale Browserbedienung mit 82 Originaldesigns: Bestseller 18 → 36; Wechsel auf alle 721 Motive; Kategorie Hunde + Suche Haus liefert keine fremden Hausmotive; Zurücksetzen funktioniert. Ein Motiv 21,99 → 23,68 €, Menge zwei → 47,36 €. Fehlender eigener Text führt zum Textreiter; überlappende Gestaltung bleibt zur Prüfung geöffnet. Gültiger Entwurf öffnet die Abschlussübersicht, ohne fälschliche Farboptionen.
- Desktop/390×844: gleiche Reiter, sichtbare Preis-/Mengenleiste und Abschlussknopf. Nach Astras Integration: beim Scrollen der Motivliste auf 1.246 px bleibt die Vorschau bei y=54/Höhe 338. Drei Motivspalten. Zusätzlich 375×548 mit Textwerkzeug: Vorschau y=54/Höhe 274, Bemaßung endet bei y=296 innerhalb der Vorschau (Ende y=328), Warenkorbknopf vollständig bei y=496–538. Geräteansicht anschließend zurückgesetzt. Bilder: [Desktop](konfi-motive-navigation/motifs-desktop-local.png), [Handy](konfi-motive-navigation/mobile-375-local.png), [Abschlussübersicht](konfi-motive-navigation/review-local.png).
- **Echter Shopify-Ajax-Test, 15:51:17 UTC:** `POST /cart/add.js`, Variante `58117933433212`, Menge 1, isolierter Warenkorb ohne vorhandene Kundensitzung. HTTP **422**, „Warenkorb-Fehler / Kann Variante nicht finden“. Shopify-Readback bestätigt Produkt `16192353829244` als **DRAFT**, 15 gebundene Varianten, Motivpreis 169 Cent. Kein erfolgreicher Warenkorb/Checkout, kein Kauf, keine Produktveröffentlichung. Rohbeleg: `konfi-motive-navigation/cart-check.json`.
- Frischer Einstieg aus der Shopify-Produktvorschau erreicht den App-Host, die iframe-Dokumentantwort bleibt in meiner Browsersteuerung hängen. Auch der normale veröffentlichte Leuchtturm-Link öffnet hier zwar das Shop-Dialogfenster, erreicht in meiner Steuerung aber die Ladezeit-Meldung. Astra übernimmt seine unabhängige Shop-Prüfung; deren Ergebnis bleibt gesondert zu belegen. Lokale Bilder gelten ausdrücklich nicht als Online-Endabnahme. Das bekannte Silikon-Aufpreisproblem ist ebenfalls nicht als gelöst ausgewiesen.

## Bereitstellung

Aktiver Stand: `private/mika-konfi-motive-navigation-20261104`, Bundle `editor-b93acc5ae85f90c3.mjs`. Quelle: r2-Laufzeit; elf eigene geänderte/neue Dateien sowie Astras Layoutdatei vor/nach Anwendung per Hash geprüft. Alle anderen Hostdateien bleiben erhalten; dieses UI-Paket ändert keine Produkt-/Datenrevisionen. `modern-layout.css` entspricht exakt Astras Datei: `656c3acef495dc29fce441f55b8fb9933d478409d9580e33dfdbba6bf04f506f`.

Aktivierung nach erneutem Startup-/Dateihashvergleich, ausschließlich Laufzeitpfad geändert, anschließend Plesk-Neustart. Aktueller Startup-SHA `b9cf0241494f7799c1f5a1718ea50137387f35393089550210a98c295333c558`. HTML, Bundle und beide CSS-Dateien antworten HTTP 200; HTML referenziert das neue Bundle, CSS-Hashes stimmen. Die erste HTTP-Abfrage unmittelbar während des Neustarts lieferte vorübergehend 503; anschließender vollständiger Readback erfolgreich.

Rückweg: alte r2-Laufzeit erhalten; Startdatei vor Aktivierung in `private/mika-schiefer-import-20261104/motif-navigation-app.cjs.before` gesichert. Ein Rückweg muss vorher auf zwischenzeitliche fremde Änderungen prüfen. Keine Datenbank zurückspielen.

Nächster gemeinsamer Schritt: Astras unabhängige Shop-Prüfung an der normalen veröffentlichten Leuchtturm-Produktseite zurücklesen. Monogramm vor einem erfolgreichen Warenkorb-/Checkoutnachweis regulär zur Bestellung freigeben; Motiv- und Silikon-Zuschlag vollständig abnehmen. DRAFT/Produktionsfreigaben nicht zum Erzwingen eines grünen Tests umgehen.
