# Issue 139: einheitlicher Start bis zur fertigen Oberfläche

Neu angelegt: 2 · überarbeitet: 8 · gesamt live: 10 (vorherige Produktwellen; in diesem Paket keine Shopänderung).

Quelle: Claude-Kommentar [6589176539](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6589176539), R16/3.37 und bestehender PR 153. Referenzdateien bleiben unverändert. Das Paket enthält keine neue Preis-, Größen-, Rechte- oder Produktionsregel.

## Umsetzung und sichtbarer Nachweis

[Vorher-/Nachher-Bildfolge](2026-11-03-issue139-startansicht/startvergleich.png): gleiche isolierte D24-Konfiguration, Chrome, CPU 4×, 9 Mbit/s, 150 ms. Vorher weißer Ladezustand, alter grüner Zwischenstand und doppelter Kopf; danach dunkler Kopf, Produktname, Startdesign, Fortschritt und direkter Wechsel zur fertigen Oberfläche.

Die alte äußere Überschrift/Einleitung wird beim Build entfernt. Der native Editor und seine Kompatibilitätssteuerung werden außerhalb des Dokuments initialisiert. Erst nach Aufbau von UX, neutralem Stil, Layout und Galerie setzt der neue attach-Schritt das Element in die Seite ein. Das ist kein CSS-Deckel über einem angeschlossenen alten Editor. Der Browser-Audit zeichnet genau zwei Initialisierungen auf: zuerst disconnected ohne Layout, dann connected mit fertigem Layout und neuer Shell. Historischer prepare/finish-Code und interne Kompatibilitätsknoten existieren weiterhin: die vollständige Produktmodultrennung ist damit ausdrücklich NICHT erledigt.

Der Shop-Host behält seine Ladeansicht bis zur geprüften gravuru-ux-ready-Nachricht desselben Fensters und Origins. Fehler zeigen einen verständlichen Hinweis mit Rückweg. Das Startbild verwendet den bestehenden signierten Galerie-Ziel-/Vorschaupfad; keine zweite Renderinglogik. Der Vorabruf des Editor-HTML entfällt: im Audit genau eine Editor-Navigation.

## Prüfung

- 195 betroffene Linux-Tests bestanden, 0 Fehler; Protokoll im Ordner. Zusätzlich neuer Test: Startvorschau ist an Produkt und Sitzung gebunden, fremde Sitzung wird abgewiesen; kein Warenkorbzugriff.
- Echte Edelstahl-D24-/Acryl-D8-Modelle im isolierten Kundenweg: Text „Koch“, B02 und Acrylfarbe Anthrazit bleiben beim Designwechsel erhalten. Preise 82,48 € bzw. 17,48 €, Galerie 40 Karten / ca. 52 KB, keine JavaScript-Fehler.
- [Funkklingel AOSU](2026-11-03-issue139-startansicht/funkklingel.png): vier Dropdowns Format/Position/Rahmen/Farbe, fünf Befestigungskacheln. Echter veröffentlichter Modellstand mit dessen gelesenen Ressourcen, isolierter Testserver ohne Schreibschnittstelle. Kein Live-Nachweis dieser Änderung. Ausführungsdaten separat im Browserbericht; Bild zeigt den oberen Teil der scrollbaren Auswahl.
- Kandidaten-Bildfolge: ready-Nachricht bei 4,72 s, erster fertiger Bildschirm in der Aufzeichnung bei 5,19 s. Diese lokale Netz-Drosselung ist keine Je-Linie-Live-Abnahme.

## Messskript und Live-Bestand

Das bestehende scripts/konfi-messen.cjs bleibt Messweg einschließlich CPU 4× bei --handy. Seine Bereitschaftsprüfung wurde korrigiert: am ersten Handy-Schritt heißt die bedienbare Schaltfläche „Weiter“, am Desktop stehen Gestaltungsreiter bereit. Der alte Text „Gestaltung fertig“ war deshalb kein verlässlicher Messpunkt. Nun werden das fertige Layout sowie ein sichtbarer aktiver Gestaltungsreiter bzw. Weiter-/Abschlussknopf verlangt. Ein noch wegen Pflichtfeldern gesperrter Warenkorbknopf verhindert keine Messung der bedienbaren Gestaltung. Die Änderung wird für Vorher und Nachher gleich verwendet. Der lokale Adapter wählt ausschließlich die vorhandene Chrome-Installation für Playwright; keine weitere Messmethode.

Die geprüften öffentlichen Gedenktafel- und Grabstecker-Produktseiten haben keinen sichtbaren data-gravuru-start-Einstieg: gedenktafel-fuer-hunde-220x140, hunde-gedenktafel-schiefer-fotogravur-personalisiert-30x20, grabstecker-edelstahl-lebensbaum-personalisiert. Sichtbarkeit eines Produktes belegt daher keine native Kundenstrecke. Für diese Linien bleibt die geforderte Live-Ladezeitabnahme offen.

Die abschließenden Live-Messungen liefen nacheinander mit demselben Skriptstand (SHA-256 im [Rohbericht](2026-11-03-issue139-startansicht/live-messung/summary.json)), ohne parallele Browserprüfungen. Keine dieser Messungen prüft den noch unveröffentlichten Kandidaten.

| Live-Produkt | Desktop | Handy (CPU 4×) | Universal-Modell |
|---|---:|---:|---:|
| Edelstahl D8 12×8 | 14,1 s | 44,0 s | 30.469 KB |
| Acryl D8 12×8 | 14,4 s | 46,8 s | 30.349 KB |
| AOSU-Funkklingel | 4,9 s | 14,8 s | 129 KB |
| Hunde-Gedenktafel 30×20 | kein Einstieg | kein Einstieg | nicht messbar |

Damit sind die Zielwerte am gegenwärtigen Live-Stand nicht erfüllt. Einzelne frühere Diagnosemessungen sind nicht als Abnahme übernommen.

## Weiter offen

Vollständige Produktmodultrennung einschließlich neutralem prepare/finish und getrennten Gerätemodulen; Gedenktafel-/Grabstecker-Ausführung; R6–R8 aktuelle Sicht-/Warenkorbnachweise; Zielwerte Desktop ≤4 s / Handy ≤6 s je Linie. Insbesondere die Funkklingel liegt im isolierten gedrosselten Lauf noch über dem Ziel. Keine Performance-Abnahme, kein Merge, kein Deployment, kein neuer Bulk-Lauf. Claude prüft das Modulregister vor Merge; danach folgen Bulk-Pipeline und Navigation gemäß #139.
