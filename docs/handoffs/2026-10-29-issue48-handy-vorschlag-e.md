# Issue #48 – Teil E: Vorschlag für mehr Platz auf dem Handy

29.10.2026, Codex/Astra. **Entscheidungsvorlage, keine Umsetzung und keine Freigabe.** Aufbauend auf Teil D / [PR #58](https://github.com/Chris83638w/gravuru-2027/pull/58). Auftrag: [Nachricht 6](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6497400984); Preisentscheidung aus Nachricht 7 und Bohrlochentscheidung aus Nachricht 10 gelten. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt verbindlich.

## Empfohlene Anordnung

Die Vorschau startet groß. Sobald der Kunde im Bedienfeld scrollt, verkleinert sie sich auf etwa 120 px. Beim Tippen bleibt eine kleine, nicht interaktive Gesamtvorschau über dem aktiven Feld sichtbar. Sie zeigt auch den übrigen Text, damit Zeilen nicht isoliert beurteilt werden. Ein Antippen verlässt den Schreibmodus und öffnet die große Ansicht; ein ungespeicherter Text geht dabei nicht verloren.

Oben eine 44 px hohe Kopfzeile mit Zurück, kurzem Produkttitel und Menü. Werkzeugfunktionen bleiben erreichbar. Unten eine 56 px hohe Zeile: Schrittauswahl links, Gesamtpreis mittig, Weiter rechts. Bei 375 px passen vier einzelne Schrittknöpfe samt Preis und Weiter nicht mit je 44 px Touchfläche in eine Zeile. Deshalb ein 44 px breiter Schrittknopf mit aktuellem Schritt (z. B. 2/4), der die vollständige Schrittauswahl öffnet. **Dieser Kompromiss braucht Chris' Entscheidung.** Kein Schrumpfen der Berührungsflächen.

| Zustand | 375 × 548 | 390 × 664 |
| --- | --- | --- |
| Einstieg | Kopf 44, Vorschau ca. 220, Abschlussleiste 56; übriger Raum für Optionen | Kopf 44, Vorschau ca. 260, Abschlussleiste 56 |
| Bedienfeld gescrollt | Vorschau ca. 120; mindestens rund 300 px für Inhalt vor Innenabständen/Safe Area | Vorschau ca. 120; mindestens rund 410 px für Inhalt vor Innenabständen/Safe Area |
| Tastatur offen | Tatsächlich verfügbare Höhe aus visualViewport; kleine Vorschau im Textbereich. Kein automatischer Sprung zur großen Platte | Gleiche Regel, keine feste angenommene Tastaturhöhe |

Die vorhandene Schriftleiste und die Schriftoptionen direkt unter dem Textfeld bleiben funktional vollständig. Ob die obere Leiste im Schreibmodus anders angeordnet werden darf, entscheidet Chris; keine eigenmächtige Reduktion der Schriftwahl. Desktop bleibt bei großer Vorschau links, Bedienfeld rechts und Abschlussbereich unten.

## Inhalt und Verhalten

| Punkt | Vorschlag | Verbindliche Grenze / Abnahme |
| --- | --- | --- |
| Feldnamen | Beschriftung aus festen customerFields/fieldKey-Metadaten: Überschrift, Vornamen, Nachname, Adresse, Spruch. Neue freie Felder zunächst Zusatztext 1, 2 …; Beispiel als Platzhalter statt Beschriftung aus Eingabe. | Keine Bedeutungen aus aktuellen Kundentexten ableiten. Fehlende Quellen im Dashboard ergänzen, nicht erfinden. Bestehende Pflicht-/Beispieltextprüfung bleibt. |
| Optionale Leerzeile | Nach Verlassen einer bewusst geleerten optionalen Zeile Vorschau anbieten: Freiraum schließen. Rückgängig möglich. | Kein automatisches Umsortieren beim Tippen, keine Verschiebung eines Motivs, keine Änderung des Masters. Gruppenregeln aus dem Design nötig; Pflichtfelder nie entfernen. |
| Mindestschrift je Zeile | Zeilenregel im Design, mindestens Produkt-/Verfahrensgrenze. Passt der Text nicht mehr: Text zu lang – bitte kürzen. | Keine neue Mindesthöhe schätzen, keine beliebige Verkleinerung. Eingabe bewahren und Zeile markieren; Produktion prüft dieselbe Regel. |
| Fett/Kursiv | Bei als Schreibschrift klassifizierten Fonts ausblenden. Andere Schriften nur mit freigegebenem vorhandenem Schnitt. | Erst nach verlässlichen Schriftmetadaten und Chris' Entscheidung (#50), keine Namensheuristik. Alle freigegebenen Schriften bleiben wählbar. |
| Motiveinstieg | 8–12 tatsächlich passende Motive in drei Spalten, dazu Kein Motiv und Alle Motive. Standard Ersetzen; Hinzufügen ausdrücklich. | Produkt-/Themenfreigabe und eingebettete Vorlagenrechte aus D bleiben. Keine erfundenen Bestseller. Motive nicht verzerren. |
| Suche | Normalisierte Tags, Wortanfänge und vorsichtige Tippfehlertoleranz. Exakte Treffer zuerst; kleine Ergebnisliste statt aller Motive. Suchen schließt Tastatur. | Nur erlaubte Bibliothek. Suchergebnis nach Kategorien nachvollziehbar; keine semantisch fremden Treffer als passend ausgeben. Karten/Bedienfläche mindestens 44 px, Namen lesbar. |
| Befestigung | Je Kachel eine belegte kurze Zeile zu geeignetem Untergrund und enthaltenem Zubehör; längere Hilfe über ⓘ. | Preise/Lochgeometrie nur aus Excel/Familie. Glatt +2,99 €, rau +3,99 €, B02 +2,49 €, B02S +2,69 €, B04 +2,89 €, B04S +3,09 €. Keine Klebekraft-/Eignungsversprechen ohne Quelle; keine neuen Texte gegen vorhandene Daten. |
| Menge | Rabatt-Hinweis direkt an der Menge, wenn der gültige Preisvertrag eine Staffel enthält; nächster Schwellenwert und tatsächlicher Preis. | Keine Rabattstaffel erfinden. Ohne Staffel kein Werbehinweis. Menge/Preis/Shopify-Vertrag identisch. |

## Reihenfolge nach Entscheidung

1. Kopf/Abschlusszeile und platzsparende Vorschau als separat schaltbare lokale Variante, unveränderte Funktionen aus D.
2. Feste Feldmetadaten und optionale Leerzeilen mit Rückweg; Größenregeln mit Serverprüfung.
3. Motiveinstieg/Suche, belegte Befestigungshinweise, vorhandene Mengenstaffeln.
4. Schriftklassifikation/Leistenanordnung nur nach ausdrücklicher Entscheidung von Chris.

## Abnahmeplan

- Echter Safari/WebKit und Chrome: 375 × 548, 390 × 664 sowie Desktop; reale Tastaturhöhe, Hoch-/Querformat, Zoom, längere Texte. Keine verdeckten Felder/Schritt-/Preisflächen.
- Schrift ändern über Feld und Plattenleiste; Fokus erhalten, Dialog schließen/übernehmen, vorherige Gestaltung bleibt.
- Schritte, Menge und alle Befestigungen bis Übersicht und freigegebenem Warenkorbtest; Preis bleibt unverändert korrekt.
- Optionales Feld leeren → Vorschlag ansehen → übernehmen → rückgängig; Motividentität, Format und Kennungen bleiben.
- Gravur/Druck unterscheiden; kein Lochhinweis, keine Aussparung im Produktionsmotiv.
- Ausgangsbilder sind die echten Screenshots aus [Teil D](2026-10-29-issue48-kundenbedienung-bericht.md). Für E gibt es noch keine echte Oberfläche und deshalb keine als umgesetzt ausgegebenen Nachherbilder. Nach Zustimmung lokale Variante mit 1:1-Bildern vor weiterer Umsetzung.

## Entscheidungen für Chris

- Empfohlen: unten ein Schrittknopf mit 2/4 statt vier kleiner Knöpfe, damit Preis und Weiter in eine Zeile passen.
- Empfohlen: Vorschau erst beim Scrollen verkleinern; im Schreibmodus kleine Gesamtvorschau, komplette Schriftbedienung behalten.
- Optionales Layout erst nach bewusstem Verlassen der geleerten Zeile und mit sichtbarem Rückweg ändern.
- Schriftklassifikation und Änderung der oberen Werkzeugleiste separat nach #50 freigeben.

Keine Live-Aktion, keine Shopify-/Katalogänderung, kein Merge.
