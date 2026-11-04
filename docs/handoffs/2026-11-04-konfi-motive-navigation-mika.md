# Konfi: Motivauswahl, mobile Reiter und Warenkorbprüfung

Auftrag Mikail, 04.11.2026: „Weiter, mach die Motivauswahl und die Handynavigation wie in Astras neuem Konfi fertig und teste den Warenkorb. Stimm dich mit Astra 1 ab, damit nichts doppelt gemacht wird.“

## Quellen und Zuständigkeit

- UI-Vorlage: #161, `db4f4a4efdd411e8d28aec2d126e488a1b9b0c48`, `prototypes/produktprofile`. Ein Kategorie-Dropdown, Bestseller zuerst, 18 Motive plus 18 je Nachladen, dieselben Produktreiter auf dem Handy.
- Motivpreis: Mikails ausdrückliche Vorgabe im Chat, 169 Cent für jedes zusätzlich eingefügte Motiv; native Preisberechnung und geprüfte Shopify-Bindung bleiben unverändert.
- Originaldesigns/-motive folgen weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Kein neues Design, keine neue Katalogfreigabe.
- Astra 1 besitzt den Sticky-/Vorschau-Fix in `modern-layout.css`, angekündigt in [#48/6634755016](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6634755016). Diese Datei bleibt bytegleich. Meine getrennte Umsetzung ist in [6634834752](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6634834752), [6635192135](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6635192135) und [6635436159](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6635436159) gemeldet. Noch keine Rückmeldung/Fix-Übernahme behauptet.

## Umsetzung

`motif-browser-model.mjs` filtert ausschließlich erlaubte Originalmotive und die vorhandene thematische Bestseller-Auswahl. `modern-motif-browser.mjs` verwendet die native Suche, Kategorieauswahl und Motivbuttons. Die alte zweite Kategorie-Auswahl samt Dialog/Swipe-Handler entfällt. 721 Motive bleiben über „Alle Kategorien“ erreichbar; Monogramm startet mit 49 thematischen Empfehlungen, davon zunächst 18 sichtbar. Eine explizit leere Produktauswahl bleibt leer.

`modern-mobile-navigation.mjs` zeigt die vorhandenen Reiter Ausführungen, Designs, Text, Motive und gegebenenfalls Foto. Es versetzt die vorhandene Preis-/Mengenleiste in die mobile Bildschirmhülle; beim Wechsel zum Desktop kehrt sie zurück. Originale Ereignisbehandlung, Prüfungen, Mengenberechnung und Warenkorb-Übergabe bleiben erhalten. Fokus/Korrektur wechselt zum passenden Reiter, Tastaturhöhe wird berücksichtigt. Keine zweite Preislogik, kein neuer Checkout.

Die Abschlussübersicht verwendet `resolvedOptions` und `optionFieldEntries`. Versteckte Abstandshalter-Farben erscheinen nicht mehr doppelt bei „Ohne Bohrung“.

## Prüfung und Grenzen

- 45/45 gezielte Prüfungen auf dem separaten Serverstand erfolgreich, Build erfolgreich. Zusätzlich 16/16 lokale Workflow-/Usability-Prüfungen. Die alten Mobile-Tests prüfen weiter die wiederverwendeten Hilfsfunktionen; sie sind kein alleiniger Nachweis der neuen Reiteroberfläche.
- Tatsächliche lokale Browserbedienung mit 82 Originaldesigns: Bestseller 18 → 36; Wechsel auf alle 721 Motive; Kategorie Hunde + Suche Haus liefert keine fremden Hausmotive; Zurücksetzen funktioniert. Ein Motiv 21,99 → 23,68 €, Menge zwei → 47,36 €. Fehlender eigener Text führt zum Textreiter; überlappende Gestaltung bleibt zur Prüfung geöffnet. Gültiger Entwurf öffnet die Abschlussübersicht, ohne fälschliche Farboptionen.
- Desktop/390×844: gleiche Reiter, sichtbare Preis-/Mengenleiste und Abschlussknopf. Die bestehende nicht feststehende Vorschau ist weiterhin Astras gesonderter Fix; hier nicht als erledigt ausgewiesen.
- **Echter Shopify-Ajax-Test, 15:51:17 UTC:** `POST /cart/add.js`, Variante `58117933433212`, Menge 1, isolierter Warenkorb ohne vorhandene Kundensitzung. HTTP **422**, „Warenkorb-Fehler / Kann Variante nicht finden“. Shopify-Readback bestätigt Produkt `16192353829244` als **DRAFT**, 15 gebundene Varianten, Motivpreis 169 Cent. Kein erfolgreicher Warenkorb/Checkout, kein Kauf, keine Produktveröffentlichung. Rohbeleg: `konfi-motive-navigation/cart-check.json`.
- Frischer Einstieg aus der Shopify-Produktvorschau erreicht den App-Host, die iframe-Dokumentantwort bleibt in meiner Browsersteuerung hängen. Lokale Bilder gelten ausdrücklich nicht als Online-Endabnahme. Das bekannte Silikon-Aufpreisproblem ist ebenfalls nicht als gelöst ausgewiesen.

## Bereitstellung

Vorbereiteter Stand: `private/mika-konfi-motive-navigation-20261104`, Bundle `editor-460fe62d8f2c3ad0.mjs`. Quelle: aktive r2-Laufzeit; elf geänderte/neue Dateien vor/nach Anwendung per Hash geprüft. Alle anderen Hostdateien und die gemeinsame Datenbank bleiben erhalten. `modern-layout.css`: `d29234f8a50358873fed48073e4161468cc21576258042acfddda1e87391a69b`.

Die Aktivierung darf ausschließlich den Laufzeitpfad wechseln, nachdem der Startup-Hash erneut zum vorbereiteten Stand passt. Bei einer parallelen Astra-Aktivierung abbrechen und dessen aktuelle Quelle einbeziehen. Daten- und Produktrevisionen werden durch dieses UI-Paket nicht geändert. Letzte Auslieferung und Nachweis werden separat ergänzt.

Nächster gemeinsamer Schritt: Astras Vorschau-Fix in den aktuellen Stand integrieren und mobil scrollen/eingeben prüfen. Danach den Warenkorb am tatsächlich bestellbaren Produkt samt Motiv- und Silikon-Zuschlag vollständig abnehmen; DRAFT/Produktionsfreigaben nicht zum Erzwingen eines grünen Tests umgehen.
