# Konfi: Zielbild Variante C und Schriftenauswahl

## Aktueller Auftrag vom 18.11.2026

Chris: „diese 5 Sekunden Regel gibt es nicht. Variante C ist das beispiel. Beim Fancy Product Designer geht es auch viel schneller.“ Damit entfällt die zuvor fälschlich als verbindlich behandelte 5-Sekunden-Abnahme. Weiter reale ganze Wege messen; keine neue Sekundenzahl erfinden. Prio-Konfi bleibt optisch und in der Bedienung unverändert. Vorbereitete Ressourcen möglichst von Shopify/CDN, unnötige Serverwartezeiten aus Interaktionen entfernen. Fancy Product Designer ist ein Erfahrungsvergleich des Nutzers, ohne unsere Vergleichsmessung.

Chris ergänzt: „zeig mir auch nochmal alle Schriftarten. Wir werden ein paar entfernen. Zudem sollen die Schriftarten erst später nachgeladen werden.“ Die Übersicht ist fertig; **keine Entfernung gewählt oder ausgeführt**. Alte Bestellstände, Preise und Bindungen bleiben unverändert. Keine neue Live-Freigabe.

## Auswahlübersicht

[PDF: alle 93 Schriftarten auf sieben Seiten](2026-11-18-konfi-schriften/Alle-93-Schriftarten.pdf). Die ersten 84 Nummern bleiben erhalten; neun zusätzliche Konfi-Schriften folgen als 85–93. Beide Gruppen jeweils alphabetisch. Nummern entsprechen der lokalen HTML-Auswahlhilfe. Die frühere 84er-PDF bleibt als Katalog-Teilmenge für bereits versandte Links erhalten. Markieren in der Hilfe erzeugt nur eine Merkliste und schreibt nicht in Katalog oder Shop.

Quelle: [schriften.json im Katalog, fester Commit 8236b8b](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/schriften/schriften.json). 84 Einträge, 80 vorhandene Original-TTF/OTF-Dateien. Keine System-/Ersatzschrift als echte Probe ausgegeben. Vier Dateien fehlen: Ashley Marie, Daniel Black, Soulmate, Standlist. Bei Standlist ist Ashley bereits als Ersatz im Katalog dokumentiert; die Übersicht zeigt trotzdem keine Ashley-Probe unter falschem Namen. Sonderzeichen aus den Originaldateien geprüft und fehlende separat vermerkt. Das ist keine neue Freigabe oder Sperre von Schriften. Die 84 Katalogeinträge sind nicht mit den 57 eingebetteten Schriften des einen gemessenen Produkts gleichzusetzen.



**Vollständigkeitsabgleich mit der Konfi-Bibliothek:** Die 30 Namen aus den ausgelieferten Laufzeitpaketen (Code 9d00b05, app/designs/aosu-labrador/runtime, katalog + gravuru-entwurf-fonts) enthalten neun Namen außerhalb der 84er-Katalogliste: Cutive Mono, Lora Italic, Merriweather, Nunito, Open Sans, Poppins, Roboto Mono, Source Code Pro, Ubuntu. Diese stehen zusätzlich auf Blatt 7. Ihre Proben sind aus den echten regular-Schriftkonturen der Laufzeit gerendert, keine neu heruntergeladenen oder ersetzten Fonts. Gesamt 93 Namen, 89 echte Proben, vier fehlende Dateien. Fettschnitte innerhalb derselben Familie sind kein zusätzlicher Auswahleintrag. Das belegt die Vereinigung von Katalog und ausgelieferter Bibliothek, nicht dass jedes einzelne Produkt alle 93 anbietet.

## Nachprüfung der Originalzeichen

[Claudes Sichtprüfung](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6967289323) fand fehlende Umlaut-Punkte. Astra hat darauf **alle 80 Original-TTF/OTF-Dateien** geprüft: Unicode-Zuordnung, leere Konturen und mit aufgelösten Komponenten verglichene Konturen Ä/A, Ö/O, Ü/U sowie ä/a, ö/o, ü/u. Ergebnis: **09 Ashley, 54 Minimalist, 80 Sunflower und 81 Sweetie zeichnen sämtliche sechs Umlaute exakt wie die Grundbuchstaben.** Die Ursache liegt in den Dateien, nicht im PDF-Rendering. Die reine Unicode-Zuordnung hatte diese Qualitätsfehler noch nicht erkannt. 76 weitere Dateien haben keine solche identische Umlautkontur; das ist keine vollständige visuelle Qualitätsgarantie sämtlicher Zeichen.

[Prüfbeleg](2026-11-18-konfi-schriften/glyphen-pruefung.json). In den vier betroffenen Schriften fehlt zusätzlich ß, in Ashley auch €. Arvo fehlt €, Homage fehlen ß und €. Keine leeren Konturen im geprüften Grundzeichensatz der vorhandenen Zuordnungen. Die Euroform von Sunflower/Sweetie ist visuell auffällig und auf den Proben markiert; keine automatische Reparatur/Ersetzung/Sperre. PDF und HTML enthalten jetzt die Hinweise. Eine Aussage darüber, ob die Laufzeit diese vier Originaldateien später ergänzt, ist damit noch nicht geprüft. Die alte 84er-PDF ist eine überholte Vorfassung; bitte die ergänzte 93er-PDF verwenden.

## Nachladen: was tatsächlich schon vorhanden ist

[Claude-Befund und vorhandene Messung](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6967192620), von Astra gegen die genannten Module gelesen:

- 'shop-entry.mjs', 'shop-start-model.mjs', 'shop-model-slim.mjs': Kundenmodell für gewöhnliche Produkte wird projiziert; Schriften als inhaltsadressierte Einzeldateien, gespeicherte Produktdaten bleiben vollständig.
- 'lazy-resources.mjs': Startressourcen, einzelne Schriftwahl, Designs und geladene Entwürfe haben bereits Nachladewege. Ein Objekt erhält die Schrift erst nach deren Laden. Keine neue Ersatzschrift oder Layoutänderung erforderlich.
- 'background-loading.mjs': nach Bedienbarkeit höchstens zwei empfohlene Schriften optional im Hintergrund; Datensparmodus überspringt dies. Andere Schriften bei Bedarf. Nicht pauschal alle 84 zum Start.
- Im vorhandenen Acryl-Lauf laut Claude: Kundenmodell 189 KB ohne eingebettete Schriften; zwei Startschriften, anschließend zwei weitere. Das ist kein Nachweis für jeden Produkttyp.
- Ausnahmen gezielt berücksichtigen: Mehrgrößen-/Konturprodukte benötigen auch Schriften synchron wechselbarer Formatvorlagen, 'hydrateContourFonts'; Funkklingel hat einen eigenen Startpfad. Vor Änderungen prüfen, keine pauschale Reduktion auf ein Design erzwingen.

[Claude hat die Produktarten gezielt nachgeprüft](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6967234634): feste Größe lädt den projizierten Start; Familien mit Größenwahl (außer dem Modus alle Größen) behalten alle Produktdesigns; Konturformen brauchen die Konturen aller im Modell erhaltenen Designs, bei allen Größen je eine Vorlage pro Format. Funkklingeln behalten teilweise eingebettete Schriften und beim kalten Vergleichskatalog zunächst alle. Edelstahl und Schiefer sind keine eigenen Ladepfade, sondern folgen Profil/Form/Größenwahl. Die konkrete Zuordnung und Dateimengen einzelner Produkte sind noch nicht gemessen. Daher keine pauschale Behauptung, dass bei sämtlichen Produkten nur die Startschrift lädt. Claude hat die Präzisierungen zu durchschnittlichen Schriftgrößen und zur nicht isoliert bewiesenen Blockade übernommen; lokale CDN-Vorbereitung verlangt laut seiner Bestätigung keine weitere grundsätzliche Freigabe.

Es ist **kein neuer Lader gebaut** worden. Die Schriften kommen derzeit vom eigenen Server, nicht vom Shopify-CDN. Die 24 MB Schriftkonturen im serverseitigen Produktdokument und vollständigen Fertigungspaket verschwinden durch Browser-Nachladen nicht.

## Weiterarbeit und Grenzen

Shopify-CDN bleibt innerhalb des beauftragten Zielbilds vorzubereiten: unveränderliche Dateien und Hash-Zuordnung, gezielte vertrauenswürdige Quelle, Integritätsprüfung, vorhandener eigener Dateipfad als Rückfall; technische Datei-/CORS-Möglichkeiten prüfen. Keine produktive Änderung der Sicherheitsrichtlinie oder Auslieferung ohne Live-Freigabe. Statische Auslieferung am App-Prozess vorbei ist eine mögliche Zwischenstufe, noch nicht umgesetzt oder als wirksam gemessen. Keine bloß neue feste Wartezeit für Schriften einführen.

Nach der Schriftauswahl konkrete betroffene Designs ermitteln; Ersatz oder Herausnahme nur dort klären, wo tatsächlich nötig. Keine Bestellstände umschreiben. 24.047.954/57 Bytes ist ein Durchschnitt, keine behauptete Einsparung jeder einzelnen Schrift. Eine langsame Dateianfrage allein beweist keine Prozessblockade. Der Font-Dateicache bis 96 MiB und vollständige Vergleichsstrings sind Speicher-Kandidaten; tatsächliche Füllstände/Heap-Anteile nicht gemessen.

## Prüfung dieser Dokumentationsrunde

84 eindeutige Katalognamen plus neun zusätzliche Laufzeitnamen, 80 Originaldateien und neun Konturproben erfolgreich gerendert; sieben Seiten ohne verzerrte Schriftproben. HTML-Suche und Merkliste im Browser geprüft, Testmarkierung zurückgenommen. PDF erneut geöffnet und alle sieben Seiten gerendert. **44/44 vorhandene gezielte Tests bestanden:** lazy-resources, preload-queue, font-display, shop-model-slim und shop-start-model. Keine produktive Schrift- oder Runtimeänderung. 'git diff --check'. Keine neue Laufzeit-Vorher-/Nachher-Messung nötig, da Laufzeit unverändert; bisherige Zahlen unverändert in PR #255.

## Nummern

| Nr. | Schrift | Originaldatei |
| ---: | --- | --- |
| 01 | Aldrich | vorhanden |
| 02 | Alex Brush | vorhanden |
| 03 | Alfa Slab One | vorhanden |
| 04 | Allura | vorhanden |
| 05 | Amatic SC | vorhanden |
| 06 | Antic Slab | vorhanden |
| 07 | Archivo Black | vorhanden |
| 08 | Arvo | vorhanden |
| 09 | Ashley | vorhanden |
| 10 | Ashley Marie | fehlt |
| 11 | Audiowide | vorhanden |
| 12 | Baby Boho Script | vorhanden |
| 13 | Bad Script | vorhanden |
| 14 | Baloo 2 | vorhanden |
| 15 | Bebas Neue | vorhanden |
| 16 | Bellefair | vorhanden |
| 17 | Bernardo Moda Contrast | vorhanden |
| 18 | Betsy Bailey | vorhanden |
| 19 | Caveat | vorhanden |
| 20 | Caviar Dreams | vorhanden |
| 21 | Chewy | vorhanden |
| 22 | Cinzel | vorhanden |
| 23 | Cinzel Decorative | vorhanden |
| 24 | Comfortaa | vorhanden |
| 25 | Comic Neue | vorhanden |
| 26 | Cookie | vorhanden |
| 27 | Cormorant Garamond | vorhanden |
| 28 | Courgette | vorhanden |
| 29 | Courier Prime | vorhanden |
| 30 | Dancing Script | vorhanden |
| 31 | Daniel | vorhanden |
| 32 | Daniel Black | fehlt |
| 33 | Days One | vorhanden |
| 34 | Desyrel | vorhanden |
| 35 | Dream Orphans | vorhanden |
| 36 | Fineliner Script | vorhanden |
| 37 | Fjalla One | vorhanden |
| 38 | Fredoka | vorhanden |
| 39 | Gloria Hallelujah | vorhanden |
| 40 | Great Vibes | vorhanden |
| 41 | Hello Georgia | vorhanden |
| 42 | Homage | vorhanden |
| 43 | Italianno | vorhanden |
| 44 | Josefin Sans | vorhanden |
| 45 | Kalam | vorhanden |
| 46 | Kaushan Script | vorhanden |
| 47 | Lato | vorhanden |
| 48 | Libre Baskerville | vorhanden |
| 49 | Lobster | vorhanden |
| 50 | Lora | vorhanden |
| 51 | Magnolia Script | vorhanden |
| 52 | MedievalSharp | vorhanden |
| 53 | Michroma | vorhanden |
| 54 | Minimalist | vorhanden |
| 55 | Montserrat | vorhanden |
| 56 | Montserrat Light | vorhanden |
| 57 | Oswald | vorhanden |
| 58 | Pacifico | vorhanden |
| 59 | Parisienne | vorhanden |
| 60 | Patrick Hand | vorhanden |
| 61 | Permanent Marker | vorhanden |
| 62 | Playfair Display | vorhanden |
| 63 | Poiret One | vorhanden |
| 64 | Poppins ExtraLight | vorhanden |
| 65 | Raleway | vorhanden |
| 66 | Righteous | vorhanden |
| 67 | Roboto Condensed | vorhanden |
| 68 | Roboto Slab | vorhanden |
| 69 | Rochester | vorhanden |
| 70 | Rock Salt | vorhanden |
| 71 | Rounded Elegance | vorhanden |
| 72 | Rye | vorhanden |
| 73 | Sacramento | vorhanden |
| 74 | Satisfy | vorhanden |
| 75 | Soulmate | fehlt |
| 76 | Special Elite | vorhanden |
| 77 | Standlist | fehlt |
| 78 | Stardos Stencil | vorhanden |
| 79 | Stylish | vorhanden |
| 80 | Sunflower | vorhanden |
| 81 | Sweetie | vorhanden |
| 82 | Tangerine | vorhanden |
| 83 | Uncial Antiqua | vorhanden |
| 84 | Zentenar Fraktur | vorhanden |
| 85 | Cutive Mono | Laufzeitkonturen |
| 86 | Lora Italic | Laufzeitkonturen |
| 87 | Merriweather | Laufzeitkonturen |
| 88 | Nunito | Laufzeitkonturen |
| 89 | Open Sans | Laufzeitkonturen |
| 90 | Poppins | Laufzeitkonturen |
| 91 | Roboto Mono | Laufzeitkonturen |
| 92 | Source Code Pro | Laufzeitkonturen |
| 93 | Ubuntu | Laufzeitkonturen |
