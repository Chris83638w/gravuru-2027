# Sichtprüfung 03.11.2026

Aktueller Korrekturstand: siehe Bericht, Abschnitt „Korrektur nach Chris’ Rückmeldung“. 14/14 Tests und Desktop/390×664/375×548 geprüft. Werkzeuggruppe mittig über Canvas, 751 px statt 562 px, Footer 58 px. Alle 47 Kategorien und 721 Originalmotive, Bestseller initial. Die nachstehenden Messwerte dokumentieren den überholten Erststand.

Quelle: Chris' Screenshots und seine letzten Änderungen, ergänzt durch lesende Ansichten des bestehenden Masters. [Vorher und Vorschlag gemeinsam](../../docs/handoffs/2026-11-03-produktprofile-vorschau/vergleich.html). Die Studie soll die Quelle bewusst weiterentwickeln; kein Anspruch auf pixelidentische Kopie einer alten Ansicht.

## Fünf geprüfte Bereiche

| Bereich | Ziel / Beobachtung |
|---|---|
| Aufbau und Platz | Dunkle Kopfzeile entfällt. Rückweg links, gemeinsame Werkzeuge mittig, Speichern rechts. Schild kleiner; 120-mm-Bemaßung und Footer im Desktop sichtbar. Optionsliste scrollt unabhängig. |
| Komponenten | Designbilder ohne Beschreibung und mit Lupe im Bild. Motive dreispaltig, Suche vor Kategorie, Mehr-anzeigen im selben Bereich. Befestigung/Ständer/Spray lassen sich gleichzeitig wählen. |
| Schrift und Hierarchie | Gut lesbare neutrale UI-Schrift, stärkere Buttontexte. Echte lokale Katalogschriften in den Original-SVGs. Schriftdateien ausgeschlossen vom Git-Stand. |
| Farbe, Bilder, Konturen | Neutralgrau, heller blaugrauer Footer, pinke Textauswahl. Originale für Stahl, Schiefer, AOSU und Motive; keine KI-Ersatzbilder. Kein zusätzlicher Rechteckrahmen um die abgerundete Platte. |
| Verhalten und kleine Displays | Vier Profilumschaltungen, Foto-/Logo-Sichtbarkeit, keine leeren Optionen, Zoomregler, Auswahl im Feld und Schild, Dialog-Lupe und Escape mit Fokusrückkehr. Chrome-Viewport 390×664 und 375×548. Keine Behauptung einer echten Safari-/Touch-/Tastaturabnahme. |

## Gefunden → korrigiert → nachgeprüft

1. Desktop: große Galerie streckte das Arbeitsraster und verdrängte die untere Bemaßung. Feste verfügbare Rasterhöhe und begrenzte Scrollfläche eingebaut; Galerie und Textansicht erneut aufgenommen, Bemaßung sichtbar.
2. Original-SVGs zeichneten zusätzlich die rechteckige Plattenhilfslinie. Nur diese Hilfslinie per CSS ausgeblendet; echte Motivpfade unverändert.
3. Lupe lag zunächst unter dem Bild. In die untere rechte Bildecke verschoben; Dialog öffnet und schließt per Escape, Fokus kehrt zur Lupe zurück.
4. Handy: ausgeblendete Buttonbeschriftungen entfernten zugängliche Namen. Explizite Bezeichnungen für Vollbild, Hilfe, Ebenen und Speichern ergänzt.
5. Handy 375: die haftende Schrittleiste konnte den unteren Teil des Preisbuttons überdecken. Footer über der Schrittleiste angeordnet; Screenshot erneut geprüft, kompletter Knopf sichtbar. Unterhalb liegender Inhalt bleibt durch Scrollen erreichbar.
6. Einige Originalmotive waren lediglich sehr dünne Trennlinien. Für den kleinen visuellen Beispielsatz durch andere vorhandene Originalmotive ersetzt, keine Pfade verändert oder neuen Motive erzeugt. Keine behauptete Bestseller-Zuordnung.

## Nachgemessene lokale Layoutwerte

Bei 375×548: Textleiste 73 CSS-px hoch (zwei Zeilen), kein horizontaler Seitenüberlauf. Startcanvas 245 px, Platte 262 px breit; nach Scrollen canvas 290 px und Platte 284 px. Preisleiste bleibt bei y=476, Höhe 72; Button vollständig darin. Das zeigt das gewünschte Wachstum, ersetzt aber keine spätere Abnahme des produktiven mobilen Scroll-/Tastaturverhaltens.

## Geprüfte Interaktionen

- Gedenktafel: Silikon, schwarzer Ständer und Spray gleichzeitig ausgewählt; alle drei Zustände bestätigt.
- Funkklingel: eigene Gruppen, kein Foto/Logo und keine Gedenktafel-Zubehörgruppen.
- Ohne Optionen: unmittelbar Designs, kein leerer Ausführungstab.
- Türschild: mehrzeiliges Spruchfeld und gemeinsame Textmarkierung; Originalschriften sichtbar.
- Design-Lupe: öffnet das Original; Escape schließt und stellt Fokus wieder her.
- Motive: „Mehr anzeigen“ erweitert sechs auf neun lokale Beispiele ohne neuen Tab/Dialog.

## Grenzen vor Übernahme

Kein neuer vollständiger Editor: freie Platzierung, echte Schriftwahl/-metriken, Preisvertrag, verbindliche Produktvarianten, Designtransfer und Logo-Konverter werden aus dem Master übernommen. Andere Designs behalten hier die Originaltexte im Bild, Eingaben bleiben nur im lokalen Entwurfszustand. Funkklingelfarben und Rahmen sind Auswahlmuster; Gedenktafel ist ein Optionsbeispiel. Alle Produkt-/Zubehörbilder und Maße benötigen vor produktiver Anbindung ihre vorhandenen autoritativen Bindungen. Kein vollständiger WCAG-, realer iPhone- oder Warenkorbtest dieser Studie. Noch keine visuelle Freigabe durch Chris. Keine Live-Änderung.

Vorher/Nachher-Kontaktansicht am Ende gemeinsam im Browser betrachtet: geringere Kopfzeilenhöhe, sichtbare Bemaßung und reine Designkacheln bestätigt; abweichende Desktop-Aufnahmehöhen ausdrücklich gekennzeichnet.
