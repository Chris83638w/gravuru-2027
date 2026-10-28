# Kunden-Konfigurator: UX-Zwischenstand vom 28.10.2026

Codex/Astra. Branch: `dev/konfi-ux-20261028-astra`. Basis: `main f200509ea106445f4dc86238ac99404b9d0cbca2`; beim Abschluss erneut unverändert gelesen. Dies ist ein **Entwurfsstand zur Prüfung**, kein Merge, kein Deploy und kein Live-Warenkorbtest. Der Commit mit diesem Bericht enthält den dokumentierten Quellstand.

## Verbindliche Entscheidungen

Chris bestätigt: Schieberegler als Ausführungen-Icon, Handy-Leiste M2 direkt unter dem Schild, Abschlussüberblick mit „Jetzt in den Warenkorb“, **jedes sichtbare Motiv 169 Cent einschließlich Vorlagenmotiv**, 50 Zeichen je Zeile. Zur Designauswahl: „von allen Formen und Größen die Designs“. Die Informationsbeschreibungen erstellt Astra aus den tatsächlichen Produktdaten. Dokumentiert in [Issue #40](https://github.com/Chris83638w/gravuru-2027/issues/40).

## Umgesetzt

| Bereich / Auftragspunkte | Ergebnis |
| --- | --- |
| Stil (11, 14–16, 20) | Gemeinsame helle Knöpfe, 44-px-Ziele, Chevron, Ausrichtungsreihe, Schieberegler. Befestigungs-Icons aus tatsächlicher Befestigungsart und Bohrgeometrie. Native Auswahlliste bleibt als interne Ereignisquelle verborgen. |
| Rahmen (3–5, 7, 12–14, 22, 25) | Werkzeugreihe außerhalb der Platte, kompakte Überschrift und Wiederherstellungs-Pille, sticky Vorschau, kompakter Preis-/Mengenbereich, Staffel in Preisdetails, größerer Vollbildbereich. Shop-Einstieg bestätigt seine fertige innere Oberfläche über den bestehenden, herkunftsgeprüften Nachrichtenpfad; erst dann werden doppelte äußere Leisten verborgen. |
| Text (6, 18–24) | Einstellungen unmittelbar unter der aktiven Zeile; beim Verlassen geschlossen. Sprechende Feldnamen aus dem unveränderten Vorlagentext. Zähler erst ab 80 Prozent; Pflichtfeldhinweis nach Verlassen oder Abschluss. Helle Textleiste mit echtem Schriftnamen als Glyphenpfad, F/K, Ausrichten, Größe, Drehung und Papierkorb. Direkte Löschung optionaler Elemente mit Rückgängig; Pflichtfelder bleiben geschützt. Schriftübertragung mit „Alle auswählen“. |
| Motive (1, 8–10, 17) | Darstellung auf tatsächliche Plattenkontur begrenzt; Randbegrenzung berücksichtigt Rundrechteck und Ellipse zusätzlich zu freien Konturen. Serverprüfung bleibt aktiv. Lesbare Kacheln, mobil drei Spalten. Semantische Suche z. B. Wasser → Anker, Leuchtturm, Fisch, Muschel. Erklärungen zu Material, Größe, Befestigung, Schrift, Motivpreis und Foto aus dem Produktstand. |
| Textimport (2) | SVG: mehrere kompatible Textzeilen innerhalb derselben ausdrücklich markierten Textebene werden ein Feld; ungeeignete Mischgruppen werden gemeldet. PDF: zusammengehörige Zeilen werden anhand des ursprünglichen PDF-Textblocks und Glyphenpositionen gruppiert; getrennte Blöcke bleiben getrennt. Originale Glyphenpfade bleiben erhalten. |
| Designauswahl (26, teilweise) | Optionaler Importmodus berücksichtigt alle freigegebenen, kompatiblen Ziel-Designs statt nur des bisherigen Unterkategorie-Themas. Freigabe, Form, Seitenverhältnis, Foto- und Größenprüfung bleiben erhalten. Produktübergreifende Galerie siehe offene Abgrenzung unten. |

## Neue Produktstände und Preise

Die Regel ist **versioniert**, kein Laufzeit-Override bestehender Bestellungen: `config.motifCharge='all'`, `extraMotifCents=169`, `textRules.maxCharsPerLine=50`. Ohne Kennzeichen bleibt die vorherige Regel erhalten. Die gemeinsame Quote liefert zusätzlich `chargedMotifs`; gesicherter Warenkorbsnapshot und Preisbindung prüfen diese Zahl. Es gibt keine zweite Preisberechnung im UI.

`scripts/customer-ux-proposal.mjs` liest ausschließlich einen lokalen Produktexport. Ohne `--output` nur Zähler, mit `--output` ausschließlich eine neue Vorschlagsdatei (kein Überschreiben, keine Datenbank/API). Konkreter Probelauf mit maximal 2 GB Node-Speicher und einer unveränderten D8-Exportkopie: **1 Produkt, 1 bereit, 0 gesperrt**. Eine neue Vorschlagsdatei wurde lokal erzeugt; kein Import. D8 im Vorschau-Speicher: 19,99 € + 1 Vorlagenmotiv 1,69 € = **21,68 €**. Das ist kein Nachweis einer bereits veröffentlichten Shopify-Preisbindung.

Für neue Katalogvorschläge aktiviert `scripts/katalog-import.mjs --kunden-ux-20261028` dieselbe Regel und `designSelection='all-approved'`. Ohne diesen Schalter bleibt der bestehende Importweg unverändert. Der Schalter darf erst nach Prüfung des erzeugten Produktstandes und der Shopify-Preisbindung bereitgestellt werden.

## Nachweise

Echte Editor-Laufzeit, echte D8-Platte, Originalschriften und Motivressourcen aus einer bereits vorhandenen Shop-Exportkopie vom 27.10.; lokal isolierter Server. Keine freie Skizze. Desktop 1440 × 900, emulierte iPhone-Größe 390 × 844 (kein physischer iPhone-/Safari-Nachweis). Bilder und Bildunterschriften: [Vorschaugalerie](konfi-ux-20261028-astra/README.md).

Sichtbar bedient: Text auswählen; optionale Vornamen löschen (6 → 5 Ebenen); Rückgängig (wieder 6, Text unverändert); Papierkorb am Pflicht-Nachnamen gesperrt; Pflichtfeldmeldung erst nach Verlassen. Motivsuche Wasser findet 21 Treffer einschließlich Ankern, Leuchttürmen und Fischen; Meerschweinchen wird nicht über die semantische Teilwortsuche eingeschlossen. Foto-Bearbeitungs-/Verschiebeschutz bleibt erhalten und ist in den betroffenen UI-Tests geprüft. Kein neuer Foto-Upload oder Live-Bestelltest in diesem Paket.

| Prüfung | Ergebnis |
| --- | --- |
| Vollauf variant-m auf Basis main, gleiche Windows-Umgebung | 342 Tests: 329 grün, 13 fehlgeschlagen |
| Vollauf variant-m nach Änderung | 350 Tests: 339 grün, 11 fehlgeschlagen, keine übersprungen |
| Vertrags-/Motiv-/Rand-/Warenkorbschutz, gezielt | 52/52 grün |
| Katalog-Konvertierung und Import | 33/33 grün |
| PDF-Design-Konverter inklusive neuem echten zweizeiligen PDF | 11/11 grün, keine übersprungen |
| Warenkorbsnapshot, Textlimits, Shop-Einstieg/Client und Produktmodell | 63/63 grün |
| Vorschlagsplan: Originale unverändert, ungültige Produktstände gesperrt | 1/1 grün |
| Nach letzter Motiv-CSS-Korrektur: Build-/SVG-CSS-Prüfungen | 8/8 grün |
| Editor-Build | 76 Originalressourcen geprüft, 97 Module, 10 Styles; Bundle 408f0908326ee07d |

Die Einzelgruppen überschneiden sich und dürfen nicht zu einer Gesamtzahl addiert werden. Zwei bereits auf main fehlgeschlagene extrahierte UI-Tests benötigen aktuelle Handler-Abhängigkeiten im Testport; ergänzt, keine Assertion entfernt. Vier Shop-Einstiegs-Clienttests importieren temporäre Module jetzt mit `pathToFileURL` statt einem Windows-Pfad als ESM-URL.

Elf verbleibende Vollauf-Fehler **auch auf main reproduziert**: sechs PDF-/Kontur-Exportfälle starten `python3` über den Windows-Store-Alias nicht; ein vorhandener Motivplatzsuche-Quelltextcheck, ein vorhandener Bohrloch-Hinweis-Quelltextcheck und drei Sitzungsschutzfälle schlagen ebenfalls schon auf main fehl. Die letzten fünf sind **nicht pauschal als Umgebungsfehler** eingestuft. Linux-Vollauf noch offen. Für den separat ausgeführten PDF-Konverter wurden PyMuPDF/Pillow nur in lokale Testabhängigkeiten installiert; keine Abhängigkeiten, Schriften oder Kundendaten eingecheckt.

Reproduktionskommandos (jeweils im Repo):

~~~sh
node --test app/configurator/variant-m/*.test.mjs
node --test app/configurator/variant-m/contract.test.mjs app/configurator/variant-m/edge-clamp.test.mjs app/configurator/variant-m/customer-tools.test.mjs app/workshop/cart-personalization.test.mjs
node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-import.test.mjs
node --test app/workshop/design-converter.test.mjs
node --test app/workshop/cart-personalization.test.mjs app/workshop/theme-limits.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/shop-entry.test.mjs app/workshop/product-model.test.mjs
node --test app/workshop/customer-ux-policy.test.mjs
node --test app/configurator/variant-m/bundle.test.mjs app/configurator/variant-m/nested-svg-css.test.mjs
node app/configurator/variant-m/build.mjs
node --max-old-space-size=2048 scripts/customer-ux-proposal.mjs --input produkt-export.json
~~~

## Offen / nächster Schritt für Claude

1. [Issue #40](https://github.com/Chris83638w/gravuru-2027/issues/40): Chris will Designs aller Formen und Größen. Die breitere Auswahl kompatibler Freigabeziele ist vorbereitet. Eine Galerie auch **inkompatibler** Ziele mit anschließendem Wechsel zum anderen Hauptprodukt ist noch nicht implementiert: dafür müssen Produktbindung, Größe, Preis und Foto/Entwurf bewusst gewechselt werden. Nicht durch Abschalten der Paket-M-Zielprüfung ersetzen. Vor Abschluss dieses Punktes den geplanten Kundenweg festlegen.
2. Aktueller Katalog-main konnte in dieser Sitzung über den Connector nicht gelesen werden (404). Keine Aussage zur aktuellen Anzahl dort freigegebener Ziele; keine Katalogdaten geändert. Die D8-Vorschau zeigt deshalb weiterhin den tatsächlich vorhandenen einen Designstand. Weitere Designs werden nicht erfunden.
3. Linux-Vollauf und die fünf bestehenden nicht-Python-Fehler bewerten. Geänderte Preis-/Snapshotregeln besonders prüfen. Shop-Einbettung mit Claudes `dev/konfi-ios-sicherheit-20261028-claude` abgleichen, insbesondere `completion.mjs`, `shop-entry-page.mjs` und `shop-embed.mjs`.
4. Chris prüft die 1:1-Bilder. Danach neue Produktrevision samt Preisbindung kontrolliert vorbereiten. Kein Merge ohne Abnahme; Live erst mit ausdrücklich auf dieses Paket bezogener Freigabe („Ja, Du darfst … bereitstellen und die App neu starten.“).

Nicht behauptet: vollständige produktübergreifende Designgalerie, kompletter Werkstatt-Vollauf, physischer iPhone-Test, neue Live-Bestellabnahme oder Veröffentlichung.
