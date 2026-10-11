# gravuru Salbei – Shopify-Theme-Pilot

Stand: 11.10.2026. Ein Shop für das gesamte Sortiment, später wiederverwendbar für weitere Shopify-Shops. Dies ist ein entwickelter Theme-Pilot; Shopify-Import und visuelle Browserabnahme sind noch offen. Kein bestehendes Theme wurde geändert oder veröffentlicht.

## Inhalt

- Vollständige Dawn-Basis, fest auf Shopify/dawn Commit `258f00f64365e2018ca4c62778a6bf55a5d3cd18` gesetzt. Shopify-Lizenz in `theme/LICENSE.md` und `theme/assets/dawn-license.txt` erhalten. Kein Code aus Hyper oder Prestige übernommen.
- Eine Primärfarbe: Salbei `#354C3B`, neutrale Flächen und Cormorant/Assistant aus Shopifys Schriftwahl. Typografie und Farben sind im Theme-Editor einstellbar.
- Startseite mit einem Titelbild und drei Themenkacheln. Alle sieben Produktwelten sind im Mega-Menü erreichbar.
- Eigenes Mega-Menü mit drei Spalten, optionalem Materialbild, Shopify-Menüzuordnungen oder einzeln bearbeitbaren Links. Native Links, Formulare und aufklappbare Menüs bleiben ohne eigenes JavaScript benutzbar.
- Native Dawn-Kollektions-, Such-, Warenkorb- und Kundenkontoseiten. Eigene Produktsektion auf Dawn mit Variantenwahl und vorsichtigem Einstieg in die vorhandene gravuru-Produktbindung.
- Sprachwahl für tatsächlich veröffentlichte Shop-Sprachen; eigene Systemtexte für DE, EN, FR, NL, ES, IT und TR. Die Übersetzung von Katalog und redaktionellen Theme-Inhalten sowie Veröffentlichung der Sprachen erfolgen separat.
- Bearbeitbarer B2B-Einstieg. Firmenfreigaben, Kataloge, Mengenstaffeln, Zahlungsbedingungen und Zugriffsregeln sind noch nicht eingerichtet oder geprüft.

## Im Shopify-Editor selbst ändern

1. **Theme-Einstellungen → gravuru – Design:** Primärfarbe und neutrale Flächen ändern. **Typografie** wählt Überschriften- und Textschrift.
2. **Kopfzeile → gravuru – Kopfzeile:** Logo/Markenname, Sprachwahl, B2B-Ziel und Mega-Menü-Bild einstellen. Navigationsblöcke umsortieren. Pro Spalte ein vorhandenes Shopify-Menü auswählen oder die enthaltenen Mega-Menü-Linkblöcke bearbeiten und einer Kollektion zuordnen.
3. **Startseite → gravuru – Titelbild:** Bild, Überschrift, Beschreibung und Buttonziel ändern. **Themenwelten:** Bilder, Titel, Kollektionen und Reihenfolge ändern; neue Kacheln hinzufügen oder entfernen. Zusätzliche Dawn-Sections lassen sich regulär hinzufügen.
4. **Produkte → Standardprodukt / salbei:** vorhandene Produktdaten und Medien pflegen, Blöcke in der Produktsektion umsortieren. Die Personalisierung muss mit dem bestehenden Konfigurator separat abgenommen werden.

## Paket verwenden

`gravuru-salbei-0.1.0.zip` ist für **Onlineshop → Themes → Theme hinzufügen → ZIP-Datei hochladen** vorgesehen. Als unveröffentlichtes Theme prüfen. Danach im Editor Produktbilder, Navigation, Übersetzungen, App-Einbindungen und Kontoziele kontrollieren. Das Paket wurde strukturell geprüft, aber noch nicht von Shopify importiert; eine akzeptierte Installation wird damit nicht behauptet.

Alle fünf mitgelieferten PNG-Motive sind eigens erzeugte Entwurfsillustrationen und keine bestätigten Produktfotos. Für den Shop freigegebene Bilder über die Bildauswahl einsetzen. Diese nutzt responsive Shopify-CDN-Größen; die mitgelieferten PNG-Fallbacks sind noch nicht für die endgültige Ladezeit optimiert.

## Konfigurator und Checkout

Die neue Produktsektion erkennt `gravuru.configurator.enabled` und die vorhandene `gravuru_workbench`-Bindung. Für so gebundene Produkte wird der native Direktkauf in dieser Sektion ausgeblendet. Ein vorhandener HTTPS-Vorschaulink wird nur bei `manifest.customerEnabled == true` angeboten. Andernfalls erscheint ein Verfügbarkeitshinweis. Es wird kein eigener Preis, kein Warenkorbvertrag und keine neue Produktionsfreigabe erfunden.

Das ist keine serverseitige Kaufsperre und noch keine vollständige Konfiguratorintegration. Andere/alte Produktbindungen, App-Blöcke, Vorschau-URL-Vertrag, Variantenübergabe, Warenkorb und Bestellung müssen mit dem bestehenden System geprüft werden. Die aktuelle öffentliche Checkout-Freigabe und Fertigungsfreigabe bleiben separate Schritte. Vor dem Live-Einsatz auch Datenschutz-/Consent- und sonstige benötigte App-Einbindungen im neuen Theme prüfen.

## Entwicklung und Nachweis

- `configure_theme.py`: bewusster Neuaufbau der Pilot-Konfiguration aus der lokalen Dawn-Basis; überschreibt eigene redaktionelle Einstellungen. Nicht gegen ein bereits vom Händler bearbeitetes Theme ausführen.
- `finalize_theme.py`: anschließend ausführen; ergänzt sprachabhängige interne Links und den deutschen Footertext.
- `node validate_theme.mjs`: strukturelle JSON-/Schema-/Referenzprüfung.
- `node --check theme/assets/gravuru-salbei.js`: JavaScript-Syntaxprüfung.
- `python package_theme.py`: ZIP und vollständiges SHA-256-Dateimanifest erstellen; temporäre Übertragungsdateien werden nicht eingepackt.
- `design-qa.md` und `theme_validation_report.md`: tatsächlich ausgeführte Prüfungen und offene Grenzen.
- Auf dem Aufgabenbranch ist ein begrenzter GitHub-Prüflauf vorgesehen, der den offiziellen Shopify Theme Check ausführt. Er veröffentlicht oder installiert kein Theme.

Nächster Schritt: ZIP als neues unveröffentlichtes Theme importieren, Shopify Theme Check sowie Desktop-/Mobil- und Editorabläufe prüfen; anschließend bestehende Konfiguratorstrecke, B2B und Übersetzungen verbinden und abnehmen.
