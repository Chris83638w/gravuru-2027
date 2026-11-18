# R15 und Studio am selben Edelstahl-Design

Stand 18. November 2026. Chris hat den isolierten Vergleich freigegeben. Der zweite Account bestätigte acht Integrationstests des bisherigen Studio-Stands sowie die Struktur und Maße der Musterdateien. Er meldete, dass im Pilot ein offener Zahlungsstatus eine Werkstattdatei zuließ. [Gegenprüfung](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6981214396) · [Testumfang](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6980847915)

## Ergebnis am selben Artikel

Geprüft wurden zwei bestehende Heimathafen-Designs auf rechteckigem Edelstahl, 90 × 60 mm, ohne Befestigung, Menge eins. In beiden Systemen wurde jeweils das Namensfeld auf „Müller“ geändert. Die zwei R15-Prüfstände und Studio übernahmen dieselben sechs Textfelder mit Originalschrift und Position. Der R15-Preis und die Referenzvariante in Shopify lagen bei 10,99 €. Der lokale Studio-Warenkorb zeigte denselben Preis.

| Gravurmotiv | Gemeinsame dunkle Bildpunkte | Gesamtheit dunkler Bildpunkte in beiden Ausgaben |
| --- | ---: | ---: |
| Hochzeitsschild mit Anker | 18.628 | 18.628 |
| Familienschild mit Leuchtturm | 35.168 | 35.168 |

Je Design wurden das native Gravur-SVG aus der R15-Werkstatt und das aus der lokalen Studio-Testbestellung exportierte SVG mit demselben Renderer bei 900 × 600 Pixel verglichen. Erfasst sind alle Punkte mit Grauwert unter 160 auf weißer Fläche. Die separate Schnittkontur wurde für diesen Gravurvergleich ausgeblendet. Beide R15-Stände lieferten je Motiv bytegleiche Gravur-SVGs. Der zusätzliche Studio-PDF-Test bestätigte für das Familienschild 90 × 60 mm, 25 Gestaltungspfade und eine überdruckende Sonderfarbe `CutContour` mit 0,1 mm Strichbreite. Der Rastervergleich allein erteilt keine Maschinenfreigabe.

| System | Erreichter Prüfpunkt |
| --- | --- |
| R15, Stände `9af3a1ac` und `1c6b6df` | Ursprüngliche Produktkonfiguration, Preisprüfung, Personalisierung und native Gravurausgabe. Die konkrete Heimathafen-Quelle trägt eine lokale Prüfbindung. Für den späteren Acryl-Versuch mit direktem Designwechsel gibt es keine Edelstahl-Messreihe. |
| gravuru Studio | Dasselbe Design durch Import, Kundenansicht und lokalen Testwarenkorb bis zur Datei geprüft. Erneut erreichten alle 20 gemessenen Browserwege die korrekte Position. |
| Variante C | Variante, Maße, Befestigung und Preis im verbundenen Shopify-Shop lesend verifiziert. Ein Durchlauf mit denselben zwei Vorlagen am gemeinsamen Shopify-Testendpunkt steht aus. |
| Fancy Product Designer und Zakeke | Beide Installationen im verbundenen Shop bestätigt. Kein gemessener Durchlauf mit derselben freigegebenen Produktbindung. |

Der zweite Account konnte die Browserzeit wegen seiner Chromium-Startumgebung nicht unabhängig nachmessen. Der lokale Wiederholungslauf auf dem korrigierten Studio-Stand ergab im gedrosselten Mobilprofil die folgenden Mediane. Öffnen bis bedienbar lag kalt bei 1,629 s und warm bei 0,458 s. Der Vorlagenwechsel dauerte jeweils 0,048 s, der letzte Klick bis zur richtigen lokalen Warenkorbposition 0,829 s bzw. 0,814 s. Vorlagenwechsel und Texteingabe lösten bei diesem Artikel in keinem Lauf eine Netzanfrage aus. Die R15- und Anbieterzeiten aus anderen Produkten eignen sich nicht als Gegenwerte. [Einzelmessungen dieser Wiederholung](../../app/personalisierungsstudio/tests/measurements-gegenpruefung-2026-11-18.json)

## Antworten auf die fünf Befunde

| Befund | Ergebnis und Konsequenz |
| --- | --- |
| A · Zahlungsstatus | Werkstatt-API und CLI fragen für jeden echten Dateiabruf den aktuellen Shopify-Auftrag ab. Die automatische Ausgabe setzt eine bezahlte, aktive, dem Entwurf zugeordnete Position mit positiver Menge voraus. Ein fehlgeschlagener Abruf, ausstehende Zahlung, Teilzahlung, Erstattung oder widersprüchlicher Zahlungsstand hält die Datei zurück. Das gilt auch für zwischengespeicherte Dateien. Bei laufender PDF-Erzeugung wird die lokale Positionsfreigabe unmittelbar vor Ausgabe erneut geprüft. Eine besondere Regel für Rechnungskauf oder Teilrückzahlungen braucht eine ausdrückliche Fachentscheidung. [Zahlungseingang der bestehenden Werkstatt](../../app/workshop/order-intake.mjs) · [Shopify-Statuswerte](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/OrderDisplayFinancialStatus) |
| B · Foto bei Wechsel | Die Stahlprobe ist fotolos. Studio kann in einem kompatiblen Testdesign das Originalfoto bei einem Vorlagenwechsel innerhalb derselben Variante und Revision erhalten. Für Schiefer gilt als Ziel: Original im selben Kundenentwurf halten, Platzierung und Skalierung separat speichern. Bei gleichem Rohling bleibt die gewählte Position erhalten. Bei Größenwechsel eine proportionale Platzierung vorschlagen und in der Vorschau anpassbar machen. Eine fotolose Ausführung blendet das Foto aus, bewahrt es im laufenden Entwurf für den Rückwechsel und exportiert allein die tatsächlich bestellte Gestaltung. Vor einem produktübergreifenden Übertrag die Zielbindung serverseitig prüfen. Freies Verschieben und Skalieren, der Variantenwechsel und die Persistenz dieses Modells sind noch umzusetzen und zu testen. |
| C · Schieferoptionen | Der bestätigte Stahlpreis gilt ausschließlich für den Stahlprüffall. Beim separaten Schiefertest gelten die freigegebenen Größen- und Zubehörpreise, feste Bohrungen je Befestigung, frei bewegliche Gestaltung und bestellbare Überlappung. Imprägnierung und Pflegespray nach Produktprofil prüfen. Den Acrylständer nur für Rechteck und Quadrat bis einschließlich 40 × 30 cm anbieten. Prüffall je mit und ohne Foto bis zur tatsächlichen Shopify-Position und Zeichnung abnehmen. [Regeln zur Gestaltung](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6976337481) · [Ständerregel](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6976844579) |
| D · Betrieb und Datenschutz | Zehn lokale Bestellpositionen in zwei simulierten Shops erzeugten parallel zehn unterscheidbare PDFs. Nach Schließen und Wiederöffnen der Datenbank lieferten alle Positionen exakt ihre ursprünglichen Dateien. Weiter offen sind Quoten pro Shop und Kunde, Verhalten bei anhaltender Last, Zugriff auf Fotos, Löschung ungenutzter Entwürfe einschließlich Originalbildern, Wiederanlauf im Zielbetrieb und reale Admin-Tokenrechte. Bestellgebundene Daten und unbestellte Entwürfe benötigen getrennte Regeln. |
| E · Import | Vollständig durchlaufen wurden die zwei unterstützten nativen rechteckigen Stahlvorlagen ohne Bohrung. Ein separates vorbereitendes SVG-Beispiel prüft ein Innenloch und eine rechteckige Fotozone. FPD- und erschlossene Corel-Quellen liefern zunächst Prüfberichte. Ein nativer Zakeke-Projektimport und komplexe Fotomasken bis zur Fertigung sind offen. |

## Technische Entscheidung

R15 bleibt der einzige Betriebsweg. Studio bleibt ein isolierter Vergleichskandidat. Die übereinstimmenden Gravuren belegen die Qualität der zwei Vorlagen. Für einen Nachfolger fehlen insbesondere ein vergleichbarer Kaufweg in Shopify und die fachliche Abnahme am Fotoprodukt. Vor dem späteren Wechsel bringt derselbe Test auch einen Rückweg mit sich: bestehende Bestellpositionen und ihre Zeichnungsrevisionen müssen im bisherigen System weiterhin abrufbar sein.

Die verbundene Shopify-Instanz ist kein als Entwicklungsshop markierter Shop. Das Dev-Dashboard verlangte eine Anmeldung. Der isolierte Test ist bereits freigegeben. Für die ausstehenden Läufe fehlt eine erreichbare Entwicklungs-Shop-Verbindung mit demselben Produkt, denselben Vorlagen und einem gemeinsamen Shopify-Warenkorb. Der nächste Lauf umfasst je fünf kalte und fünf warme Wege pro ausführbarem System, identische Mobil- und Netzbedingungen, Testbestellposition und Dateiabruf. Foto, Optionen und Preise erhalten einen separaten Durchlauf am geeigneten Produkt.

## Reproduzieren

Im Repository-Stamm mit Node 24 ausführen. `<r15-checkout>` ist ein vollständiger, unveränderter Checkout des gewünschten R15-Stands. Der Zeichenvergleich benötigt zusätzlich CairoSVG und Pillow.

~~~sh
node --test app/personalisierungsstudio/tests/studio.test.mjs
node app/personalisierungsstudio/tests/referenzprodukt.mjs <r15-checkout> <ausgabeordner>
python app/personalisierungsstudio/tests/vergleich-gravur.py <ausgabeordner>
~~~

[Studio-Probe mit SVG und PDF](2026-11-18-personalisierungsstudio.md) · [Entwurfs-PR #263](https://github.com/Chris83638w/gravuru-2027/pull/263)
