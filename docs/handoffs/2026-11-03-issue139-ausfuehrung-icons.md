# Issue 139 – Ausführung wieder mit Icon-Kacheln

Quelle: Chris-Zitat in Claude-Kommentar [6589326864](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6589326864), ENTSCHEIDUNGEN.md auf main b53be6a, 3.37/R16. Bildkacheln sind Standard; Dropdowns bleiben der produktbezogenen Auswahl mit vielen Möglichkeiten vorbehalten. Keine neue Preis-, Material- oder Befestigungsregel.

`family-formats-ui.mjs` zeigt Befestigung und variable Größe als Kacheln statt Dropdowns. Die Befestigungssymbole stammen aus dem bestehenden neutralen `option-media.mjs`, einschließlich tatsächlicher Bohrungen/Schrauben. „Ohne Befestigung“ (K00) steht zuerst, ohne gespeicherte Optionen umzusortieren. Aufpreise stammen aus der ausgewählten Familienvariante. Farbkacheln zeigen die Materialfarbe dieser Variante. Eine feste Shopgröße erhält weiterhin keine Größen-/Formauswahl. Funkklingel-Darstellung nicht geändert.

41 Linux-Tests bestanden: Familienformate einschließlich neuem R16-Test für Stahl/Schwarz/Anthrazit, bisherige Funkklingel-Darstellung, Designwechsel und Produktschnitt. Build erfolgreich. Die Auswahl benutzt weiterhin denselben `uxChangeOption`-Weg und die zentrale Preisprüfung.

Mobile Browserprüfung mit echten öffentlich ausgelieferten Modellen in einem isolierten Kandidaten:

| Produkt | Ergebnis |
|---|---|
| Edelstahl D24, 30×20 | Sieben Icon-Kacheln, K00 zuerst/ausgewählt. B02: 82,48 €. Nach Wechsel der Vorlage bleiben „Koch“ und B02 erhalten. Keine Browserfehler. |
| Acryl D8, 12×8, Schwarz/Anthrazit | Fünf Befestigungskacheln und zwei Farbkacheln. B02 + Anthrazit: 17,48 €. Nach Wechsel der Vorlage bleiben „Koch“, B02 und Anthrazit erhalten. Keine Browserfehler. |

Screenshots und Messprotokolle: [Edelstahl](2026-11-03-issue139-ausfuehrung-icons/edelstahl.png), [Acryl](2026-11-03-issue139-ausfuehrung-icons/acryl.png), [gewählte Acrylfarbe](2026-11-03-issue139-ausfuehrung-icons/acryl-auswahl.png). Dies sind Kandidatenansichten, keine live veröffentlichte Änderung. Die Netzwerk-/CPU-Messung dieser Funktionsprüfung ersetzt nicht die vorgeschriebene Ladezeitabnahme mit konfi-messen.cjs.

Die von Claude verlangte vollständige Screenshot-Serie aller Linien ist noch offen: Gedenktafel, Grabstecker (nur Größe), Funkklingel (Dropdowns). Ebenso offen bleiben vollständige Modultrennung, neutraler Start ohne alte Oberfläche und die Veröffentlichung des gemeinsamen PR 153. Keine neuen Shopprodukte in diesem Schritt.
