# Prio R15 mit der schnellen Technik von Variante C · Übergabe · 20.11.2026 (Claude)

Gestaltung und Design-Aufträge folgen dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Dieses Paket ändert keine Designs.

## Zweck und Auftrag

Chris hat mir am 20.11.2026 die technische Gesamtverantwortung für „Prio R15 als Master + schnelle Variante-C-Technik“ übertragen: [Auftrag in #265](https://github.com/Chris83638w/gravuru-2027/issues/265#issuecomment-7033770336), im Chat um 10:47 Uhr bestätigt mit „astra ist fertig. Prüfe was du überhaupt noch machen musst und setze es dann wie angegeben um. Du kannst es selbst programmieren, weil du der stärkste bist“.

Für dieses Thema ersetzt der Auftrag die Regel, dass den gemeinsamen Prio-Kern nur Mika mit Mikail ändert. Ich arbeite auf einem eigenen Zweig. Nichts ist aufgespielt.

Zur Freigabe: Chris schrieb um 10:05 Uhr „du kannst es direkt live setzen“ und um 10:06 Uhr „nein wir warten auf astra“. Ich lese das so: Testfassungen dürfen als eigener Testlink auf das echte System, der Kundenweg bleibt beim heutigen Prio, bis Chris selbst getestet und „live“ gesagt hat. So steht es auch im Auftrag.

## Stand

- Zweig `dev/claude-prio-c-20261120`, abgezweigt vom Live-Stand `2bd7bd8e` (`dev/astra-r15-live-267-20261119`).
- Stufe 1 ist gebaut und geprüft: Designwechsel im Gerät für Türschilder mit allen Größen.
- Nicht aufgespielt. Ich habe keinen Serverzugang.

## Was nicht mehr zu tun war

- **Test „Variante C → Edelstahl-Türschild → Shopify-Warenkorb“:** von Astra geliefert (Zweig `dev/astra-isolierter-variante-c-warenkorb-267`, Commit `17fbedf4`, geschützter Testlink). Nicht doppelt gebaut. Ich habe keinen Beta-Zugang und habe den Link nicht geöffnet; Astras Nachweis ist für mich ein fremder Bericht.
- **Astras vier Tempo-Änderungen vom 19.11.:** stecken schon im Live-Stand (`8a3d6c86`, `3b3b4626`, `44543823`, `5de3ce84`). Geprüft durch Übertragen der vier Commits auf `2bd7bd8e`: drei ergeben keine Änderung mehr, der vierte kollidiert nur mit seiner bereits eingebauten Fassung.

## Entscheidung: Weg A

Die C-Technik kommt in den Prio. Drei Gründe:

1. Variante C und Prio nutzen denselben Baustein `gravuru-configurator`. Bei den Funkklingeln wechselt der Prio das Design schon im Gerät.
2. In Variante C sind Bestellung, Preise, Motive und Logo abgeschaltet (`MASTER.md` im Repo `gravuru-shopify`). Weg B hieße, alle Prio-Funktionen und die gesicherte Warenkorb- und Fertigungsstrecke auf dem alten Stand neu zu bauen.
3. Die Zeit geht an einer benennbaren Stelle verloren, siehe Befund.

## Befund: warum der Designwechsel langsam war

Am 20.11. im Live-Shop nur lesend nachgesehen, Edelstahl-Türschild (Werkstattprodukt `cfg_ac514214…`, Stand 4, Format 12 × 8 cm):

- Die Designauswahl zeigt 21 Designs. Alle gehören zum selben Produkt, zum selben Stand und zur selben Shopify-Variante.
- Das geladene Modell hat 321 kB und enthält nur das Startdesign. So ist es entschieden (ENTSCHEIDUNGEN 4.42, Chris 03.11.2026: weitere Designs laden beim Klick).
- Beim Klick auf ein anderes Design lief bisher: Serveraufruf `design-switch` mit neuer Sitzung, neues Modell (wieder 321 kB), Ressourcen, dann ein vollständiger zweiter Editor in einem neuen Rahmen (`app/workshop/ui/shop-design-switch.mjs`, `choose`).
- Die Modelle für zwei Designs unterscheiden sich nur in den Design-Teilen: `profile.designs`, `familyFormats.designs` (15 Vorlagen, je rund 1 kB), `familyFormats.formats[].variants[].designIds`, `workshopElementRights` und die Angaben zum Startdesign. Alles andere ist zeichengleich.

Variante C hat alle Designs im Gerät und zeichnet beim Wechsel nur neu.

## Stufe 1: Designwechsel im Gerät

Beim Klick auf ein Design desselben Produktstands holt der Editor das Modell dieses Designs mit der bestehenden Sitzung, nimmt nur die Design-Teile in das laufende Modell auf und wählt das Design im laufenden Editor. Es gibt keine neue Sitzung, keinen Serveraufruf `design-switch` und keinen zweiten Editor. Ein schon geholtes Design wechselt danach ohne Netz.

| Datei | Änderung |
| --- | --- |
| `app/configurator/variant-m/design-adoption.mjs` (neu) | Vereinigt die Design-Teile zweier Modelle desselben Produktstands. Jede andere Abweichung (Preis, Material, Befestigung, Geometrie, Formate, Rechte) führt zur Ablehnung, das laufende Modell bleibt dann unverändert. |
| `app/configurator/variant-m/adapter.mjs` | Anschluss `el.uxAdoptDesignModel`; die Designliste des Formats wird danach neu gebildet. |
| `app/configurator/variant-m/product-design-gallery.mjs` | Karten desselben Produktstands: Design nachholen, Schriften und Motive nachladen, im Editor wählen. |
| `app/workshop/ui/shop-design-switch.mjs` | `loadDesign`: Modell eines weiteren Designs derselben Sitzung nur lesen; Produkt, Stand und Variante müssen übereinstimmen. |

Unverändert bleiben: der Server, die Sitzung, Preis und Variante, das Speichern, der Warenkorb, die Bestell- und Fertigungsstrecke, das Prio-Layout. Texte wandern wie bisher mit (dieselbe Funktion `chooseDesign` wie bei den Funkklingeln).

**Rückweg:** Scheitert das Nachholen oder weicht irgendetwas ab, greift der bisherige Wechsel über den Server.

**Bearbeiten aus dem Warenkorb:** Ein Entwurf aus dem Warenkorb ist auf dem Server fest an sein Design gebunden (`acrylic_draft_identity` in `shop-entry.mjs`). Dort wird nichts nachgeholt, es bleibt beim bisherigen Wechsel mit neuem Editor. Im normalen Ablauf legt der Editor je Design einen eigenen Entwurf an (`acrylic-draft-client.mjs`, Schlüssel aus Produkt, Stand und Design).

**Fachlogik:** Das Paket legt keine Regel, keine Sperre, keinen Preis und keinen Standardwert fest. „Laden beim Klick“ (4.42) bleibt.

## Prüfungen

- **Neue Tests:** `app/workshop/design-adoption.test.mjs` (4) und `app/workshop/shop-design-switch-adoption.test.mjs` (3). Die Modelle im Test kommen aus derselben Verkleinerung wie im Shop (`shopStartModel`) mit echten Katalogmaßen und -preisen. Geprüft: Das nachgeholte Design entspricht in jedem Format dem vollständigen Produkt, der Preis ist gleich, ein Größenwechsel findet es, elf Arten von Abweichung werden abgelehnt.
- **Gezielte bestehende Tests** zu Galerie, Designwechsel, Startmodell, Ablauf und Paketbau: 65 von 65 bestanden (mit den neuen).
- **Bedienprüfung am echten Edelstahl-Türschild** (Skript `geraetewechsel.mjs` im Nachweisordner): Der Server ist der Live-Server. Nur in meinem Browser habe ich das Hauptpaket des Editors und `shop-design-switch.mjs` durch den Bau aus meinem Zweig ersetzt. Vorher geprüft: Die Live-Dateien sind zeichengleich mit dem Bau aus `2bd7bd8e`, mein Bau unterscheidet sich nur im Hauptpaket. Kein Speichern, kein Warenkorb, keine Bestellung.
- **Gegenprobe** zu Preis, späterer Änderung, Fertigungsdateien, manipulierten Zustellungen und Storno: Ergebnis wie am Live-Stand.
- **Gesamtsuite** (`node --test app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`): Live-Stand `2bd7bd8e` 2755 Tests, 2747 bestanden, 4 fehlgeschlagen, 4 übersprungen. Mein Stand `6375be57` 2761 Tests, 2753 bestanden, dieselben 4 fehlgeschlagen, 4 übersprungen. Die sechs zusätzlichen Tests sind die neuen. Die vier Fehlschläge gab es schon vorher („Werkstatt einheitlich …“ und drei Tests zur Fotoauflösung). Die Absicherung für das Bearbeiten aus dem Warenkorb kam danach dazu und ist mit einem siebten Test, den gezielten Tests und einem weiteren Bedienlauf geprüft.

### Ergebnis der Bedienprüfung

Je ein Lauf, keine Messreihe. Das Handyprofil ist eine Simulation (390 × 844, Rechenleistung ÷ 4, 150 ms, 1,6/0,75 Mbit/s). Geschwindigkeit und Bedienung testet Chris selbst.

| Schritt | PC bisher | PC neu | Handyprofil bisher | Handyprofil neu | Ergebnis |
| --- | --- | --- | --- | --- | --- |
| Zweites Design wählen | 2,09 s | 0,66 s | 6,27 s | 1,74 s | gleich |
| Drittes Design wählen | 1,81 s | 1,74 s | 5,69 s | 1,65 s | gleich |
| Zurück zum ersten Design | 1,94 s | 0,11 s | 5,34 s | 0,50 s | gleich |
| Noch einmal das zweite Design | 1,88 s | 0,10 s | 6,68 s | 0,63 s | gleich |
| Größe wechseln | 0,08 s | 0,08 s | 0,34 s | 0,41 s | gleich |
| Größe zurück | 0,08 s | 0,06 s | 0,33 s | 0,35 s | gleich |

„Gleich“ heißt: gleiches Design, gleiche Texte (der eigene Name „Koch“ wandert mit), gleiche Lage, Schrift und Größe wie beim bisherigen Wechsel. Bisher entstand je Wechsel ein neuer Editor, neu keiner. Kein Seitenfehler, kein Schreibzugriff.

Die Zeit bis zum offenen Editor ist in diesem Vergleich nicht aussagekräftig: Im ersetzten Lauf kommt das Hauptpaket unkomprimiert aus meinem Rechner. Am Start ändert Stufe 1 nichts.

![Prio am Handy nach dem Wechsel im Gerät](2026-11-20-prio-c-technik-claude/bilder/01-prio-handy.png)

## Ein sichtbarer Unterschied

Nach einem Wechsel über den Server erschien in der Designauswahl der Knopf „← Zur vorherigen Gestaltung“. Nach einem Wechsel im Gerät erscheint er nicht, so wie heute schon bei den Funkklingeln. Zurück führt die Rückgängig-Taste des Editors; geprüft: Sie stellt das vorherige Design mit dem eigenen Text wieder her. Ob der eigene Knopf zusätzlich bleiben soll, entscheidet Chris.

## Grenzen

- Stufe 1 gilt für Produkte mit allen Größen in einem Produkt (heute das Edelstahl-Türschild). Andere Galerie-Produkte, zum Beispiel mit fester Größe oder mit Fotofeldern, nutzen weiter den bisherigen Weg.
- Beim ersten Wechsel zu einem Design wird weiter das Modell mit 321 kB geholt. Eine schlanke Antwort nur mit den Design-Teilen (rund 16 kB) und das Vorladen sichtbarer Karten sind der nächste Schritt; das braucht eine kleine Serveränderung.
- Geprüft am Edelstahl-Türschild im Format 12 × 8 cm mit drei Designs und einem Größenwechsel. Nicht geprüft: alle 21 Designs, alle 80 Formate, Motive in Designs, echtes Handy.
- Start des Editors und „In den Warenkorb“ sind noch nicht angefasst.
- **Speichern und Warenkorb nach einem Wechsel im Gerät habe ich nicht ausgeführt**, weil ich im Live-Shop nichts schreibe. Begründung, warum es gleich bleibt: Sitzung und Produktzuordnung sind dieselben wie vor dem Wechsel, der Server prüft beim Speichern Produkt und Stand der Sitzung und das Design gegen das vollständige Produkt, und der Editor legt je Design einen eigenen Entwurf an. Das ist eine Herleitung aus dem gelesenen Code, kein Nachweis. Der Nachweis gehört auf den Beta-Server: zwei Gestaltungen nach einem Wechsel im Gerät in den Warenkorb legen, Preis, Bild und Artikelnummer ablesen.
- Beobachtung ohne Einordnung: Zwischen 11:10 und 11:40 Uhr kam bei meinen Abrufen dreimal eine unvollständige Antwort (zweimal wurde der Editor in 120 s nicht bereit, einmal lieferte das Hauptpaket 12.149 statt 1.403.777 Zeichen bei Status 200). 28 weitere Abrufe waren in Ordnung. Die Ursache kann in meiner Umgebung liegen, die Abrufe laufen über einen Zwischenrechner.

## Nächster Schritt

1. Astra stellt den genannten Commit als getrennten Testpfad auf den Beta-Server. Chris testet selbst.
2. Stufe 2: schlanke Antwort und Vorladen, damit auch der erste Wechsel ohne Wartezeit läuft.
3. Stufe 3: Start des Editors. Stufe 4: Wartezeit bei „In den Warenkorb“.

## Freigaben, die fehlen

- „live“ von Chris nach eigenem Test. Bis dahin bleibt der Kundenweg beim heutigen Prio.
- Entscheidung zum Knopf „← Zur vorherigen Gestaltung“.
