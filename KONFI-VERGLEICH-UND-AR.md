# Wettbewerbsvergleich und AR für die Master-Version

Stand: 30.09.2026. Ergänzung zum [Master-Bauplan](NEUE-WERKSTATT-PLAN.md). Auftrag: fehlende oder zu wenig ausgearbeitete Funktionen anhand anderer Konfiguratoren erkennen und AR-Raumansichten bewerten. Dies ist eine dokumentengestützte Recherche, kein praktischer Vergleich bezahlter Anbieterzugänge. Anbieterangaben können vom Tarif, Zusatzmodul und Shopsystem abhängen. Keine Umsatzversprechen der Anbieter übernommen.

> Aktuelle Entscheidung vom 30.09.2026: Das neue eigenständige Projekt heißt **Gravuru 2027** (`Chris83638w/gravuru-2027`). Zunächst genügt eine hochwertige 2D-Vorschau. **AR wird auf später verschoben.** Frühere AR-Pilotempfehlungen sind kein aktueller Umsetzungsauftrag. Herkunftsangaben und bisherige Prüfergebnisse unten beziehen sich auf das alte Projekt. Siehe [START_HERE.md](START_HERE.md).
## Ergebnis

Die geplante Werkstatt deckt bereits wichtige Grundlagen ab. Die wesentlichen Ergänzungen liegen in der gesamten Kunden- und Fertigungsstrecke: dauerhaftes Speichern, Wiederaufnahme und Nachbestellung, Komponentenbestand, kundenbezogene Serienbestellungen, mehrere Gestaltungsflächen, eindeutige Fertigungsfreigaben und eine belastbare Produktionswarteschlange. Vorhandene Teilfunktionen nicht als fehlend neu bauen; die Umsetzungstiefe muss jeweils geprüft werden.

AR ist für Wand-/Türschilder und aufgestellte Acrylbilder sinnvoll. Empfehlung: jetzt die nötigen Geometrie-, Material-, Zubehör- und Ansichtsreferenzen in der Architektur vorsehen. Einen begrenzten Pilot für Tisch und Wand nach Stabilisierung von Variante/Design/Speicherung entwickeln. Den gesamten Konfigurator nicht von einem sofort perfekten AR-Ergebnis abhängig machen. Eine Umsetzung ist mit diesem Vergleich noch nicht erfolgt.

## Belegter Funktionsvergleich

„Teilweise“ bedeutet: konkrete Bausteine sind vorhanden, aber die gesamte Strecke wurde nicht verifiziert. „Geplant“ bedeutet Anforderung im Master-Bauplan, keine fertige Funktion. „Nicht nachgewiesen“ bedeutet im geprüften lokalen Teilbestand nicht bestätigt; keine Aussage, dass im gesamten Repository niemals etwas dazu existiert.

| Thema | Öffentlich dokumentiertes Vergleichsbeispiel | Unser Stand / gezielte Ergänzung |
| --- | --- | --- |
| Entwürfe später fortsetzen | [Fancy Product Designer: Save Design](https://fancyproductdesigner.com/features/online-designer-app/) | **Teilweise:** Schaltfläche vorhanden, lokale Hilfe bezeichnet Kundenkonto-Anbindung ausdrücklich als noch nicht eingerichtet. Dauerhafte Entwürfe und Wiederherstellung einschließlich Originalfotos fertigstellen. |
| Teilen und Nachbestellen | [Zakeke: Save & Share](https://www.zakeke.com/features/), [Re-order API](https://docs-develop.zakeke.com/docs/API/Integration/Visual-Product-Customizer/order-registration-customizer) | **Nicht durchgehend nachgewiesen:** private Freigabelinks, „Kopie bearbeiten“ und versionierte Nachbestellung ergänzen; aktueller Preis muss neu geprüft werden. |
| Verknüpfte Texte/Farben | [Fancy Product Designer: Text Content Linking / Color Linking](https://fancyproductdesigner.com/features/online-designer-app/) | **Geplant/zu erweitern:** gemeinsam verwendete Namen oder Akzentfarben einmal ändern; Inhalt und Farbe getrennt verknüpfen, mit optionaler Einzelabweichung. |
| Intelligente Textanpassung | [Customily: Text customization](https://www.customily.com/our-features) | **Teilweise vorhanden:** `workflow.mjs` und Tests enthalten automatische Einpassung. Material-/verfahrenabhängige Mindestgröße, fehlende Glyphen und lange Namen zusätzlich abnehmen. Nicht nochmals neu erfinden. |
| Bedingte Optionen | [Kickflip: Advanced logic](https://gokickflip.com/ecommerce-product-configurator) | **Teilweise/geplant:** bestehende Regeln bewahren; auf Material, Form, Größe, Befestigung, Design und Kundenfelder ausdehnen. |
| Komponentenbestand | [Kickflip: Inventory management](https://gokickflip.com/features/inventory-management) | **Nicht nachgewiesen:** gemeinsame Sockel-/Halterungsbestände unabhängig vom Motiv führen. Verfügbarkeit und Lieferzeit erneut vor Warenkorbabschluss prüfen. |
| Kunden-Serien mit Einzeldaten | [Kickflip: Sell in bulk](https://gokickflip.com/features/sell-in-bulk) | **Neue Ergänzung:** z. B. 100 Mitarbeiterschilder mit verschiedenen Namen, ein Design, optional Staffelpreis. Eigenständiger Kundenablauf neben unserem Verwaltungsimport von 100 Produkten. |
| Mehrere Gestaltungsflächen | [Customily: Multi-area print support](https://www.customily.com/our-features) | **Nicht als gemeinsame Strecke nachgewiesen:** Vorder-/Rückseite, mehrere Teile oder Sets mit Flächen-IDs und getrennten Produktionsdateien modellieren. Physischer Rückseitendruck ist nicht dasselbe wie zwei frei gestaltbare Seiten. |
| Zentrale Produktionsübersicht | [Customily: Orders dashboard / Bulk print file downloads](https://www.customily.com/our-features) | **Teilweise/geplant:** Auftragspositionen, Freigabestatus, Fehler, erneuter Export und Sammeldownload vereinheitlichen. |
| Produktionsbögen | [Zakeke: Advanced Print Files Builder](https://zakeke.zendesk.com/hc/en-us/articles/27433964761244-Advanced-Print-Files-Builder) | **Nicht nachgewiesen:** später Teile auf Maschinen-/Materialbögen anordnen, mit Abständen, Faserrichtung und eindeutiger Auftragsreferenz. Kein ungeprüftes Stapeln verschiedener Fertigungsprofile. |
| Bildbearbeitung und KI | [Fancy Product Designer: Masken, QR, KI](https://fancyproductdesigner.com/features/online-designer-app/) | **Teilweise/geplant:** vorhandene Bildwerkzeuge übernehmen; KI-Ergebnis separat speichern und vor Übernahme zeigen. Funktionsfreigabe und Kostenlimits je Produkt/Job. |
| Angebote, Sprachen, Währungen | [Kickflip: Builder-Funktionen](https://gokickflip.com/drag-and-drop-product-configurator) | **Nicht durchgehend nachgewiesen:** Angebote für größere Firmenaufträge einplanen; deutsche Basis zuerst, Übersetzungs- und Preiseinheiten von Anfang an trennen. |
| Personalisierte 3D-/AR-Ansicht | [Zakeke: 3D Preview and AR](https://zakeke.zendesk.com/hc/en-us/articles/360011939619-3D-Preview-and-Augmented-Reality) | **Neu:** aktuelle Kundengestaltung auf echter Produktgeometrie mit passendem Zubehör; realistische 2D-Szene allein ist noch kein 3D-Modell. |

Die Empfehlungen in der rechten Spalte sind unser fachlicher Ableitungs- und Planungsstand, keine Behauptung über zusätzliche Funktionen der Anbieter.

## Weitere Ergänzungen aus unserem konkreten Vorhaben

Diese Punkte sind eigene Anforderungen und keine behauptete vollständige Funktionsliste eines Wettbewerbers:

### Vor Verkaufsstart nötig

- **Bildqualität:** effektive Auflösung nach Kundenzuschnitt und Endgröße prüfen. Vorschaubild und Produktionsoriginal getrennt halten. Hochskalieren ist kein Beweis für neue Bilddetails.
- **Textqualität:** Überlauf, fehlende Zeichen, Schriftpfade und Mindestlinienstärke prüfen. Keine Namen automatisch korrigieren; Schreibweisen bleiben Kundenentscheidung.
- **Fertigung:** Beschnitt, Sicherheitsabstand, Bohrungen, Schnitttoleranz und gegebenenfalls Fräs-/Laserzugabe je Profil. Geometrische Fertigungszugaben sind nicht automatisch Bestandteil der sichtbaren Produktmaße.
- **Bestellvorschau:** finale Gestaltung mit Größe, Material und Zubehör vor Abschluss anzeigen; Produktminiatur und Design-ID in Bestellung/Verwaltung. Sonderaufträge können eine explizite Korrekturfreigabe verlangen.
- **Produktionszustände:** bezahlt/freigegeben → Ausgabe läuft → fertig oder Fehler → in Fertigung. Auftragsänderung/Storno vor Fertigung berücksichtigen. Wiederholte externe Ereignisse dürfen keinen zweiten Produktionsauftrag erzeugen.
- **Bestand und Lieferzeit:** konkrete Variante/Zubehör verfügbar; Rohmaterialbestand zunächst bewusst einfach führen. Ein automatischer Zuschnitt aus Restplatten wäre ein eigenes späteres Optimierungsmodul.
- **Dauerhafte Entwürfe:** Speichern und Wiederherstellen einschließlich Uploads; klarer Gast-/Kontoablauf. Speicherung darf nicht nur behauptet werden, wenn der Stand an einer offenen Browserseite hängt.
- **Berechtigungen und Historie:** Produktpflege, Freigabe und Fertigung getrennt berechtigbar. Änderungen und Wiederherstellung nachvollziehbar. Gelöschte Vorlagen dürfen alte Bestellungen nicht unlesbar machen.
- **Performance und Bedienung:** große Bibliotheken gezielt laden, mobile Tastatur und Zurücknavigation prüfen, Eingaben bei Netzabbrüchen erhalten. Kundengestaltung soll ohne laufende KI-Anfragen funktionieren.

### Danach ausbauen

- Kundenserien per Namensliste/CSV/Excel, Stückzahlen je Zeile, Staffelpreise und Summenprüfung. Verwaltungs-Stapelimport bleibt getrennt.
- Wiederbestellung und private Teilung mit klaren Lese-/Bearbeitungsrechten; nachträgliche Änderung erzeugt eine Kopie oder neue Version.
- Mehrere Flächen und Sets, automatisch verknüpfte Inhalte/Farben, zusätzliche gewerblich sinnvolle Elemente wie QR-Codes. QR-Code muss im späteren Produktionsmaß lesbar bleiben.
- Angebotsablauf für individuelle Formen und größere Stückzahlen; verbindliche Preise erst aus geprüfter Konfiguration.
- Auswertung ohne Kundentext-/Fotoinhalte: Abbrüche, problematische Schritte, fehlgeschlagene Uploads/Exporte, Ladezeiten, AR-Nutzung und erfolgreiche Rückkehr.
- Produktionsbögen, Maschinenwarteschlange und Wiederholungsfertigung nach Material/Profil. Vorher Einzelpositionsausgabe stabilisieren.

### Bewusst optional

Kalender, Kartenmotive, zusätzliche KI-Effekte und weitere Verkaufskanäle erst nach Sortimentbedarf. Solche Funktionen dürfen die Pflichtstrecke aus korrekter Konfiguration, Preis, Bestellung und Fertigung nicht überladen. Schmuck-/Bekleidungsanprobe und andere fachfremde Spezialfunktionen sind kein Ziel nur wegen einer Wettbewerberliste.

## AR: Kundennutzen und Ablauf

Empfehlung für den Button: **„Bei dir zuhause ansehen“**. Im ersten Pilot Kunde gestaltet im normalen Editor und startet anschließend die Raumansicht mit genau diesem Stand.

1. Aktuelle Gestaltung, Größe, Material und gewähltes Zubehör werden gesichert und als AR-Darstellung vorbereitet.
2. Kunde wählt eine passende Platzierung: Schild an Wand/Tür oder Acrylbild auf Tisch/Sideboard. Sind Sockel und Wandhalterung bestellt, ist der Ansichtsmodus unabhängig von der Kaufmenge wählbar.
3. Auf unterstütztem Smartphone wird die Umgebung erfasst und das Produkt in der vorgesehenen Größe platziert. Kunde bewegt und dreht es, ohne unbemerkt den Maßstab zu ändern.
4. „Gestaltung ändern“ führt zurück in den Editor. Nach Änderungen wird der neue Stand in AR neu geöffnet. Vollständige Textbearbeitung innerhalb jeder geräteeigenen AR-Ansicht ist keine Voraussetzung des Piloten.
5. Bei fehlender Unterstützung oder verweigerter Kamerafreigabe bleibt die normale Produktansicht nutzbar. Optional später 3D-Drehansicht oder Raumfoto-Montage anbieten; eine Fotomontage ist keine Live-AR-Ansicht.

Shopify dokumentiert AR-Ausgabe über Quick Look auf iOS und Scene Viewer auf Android sowie einen gesonderten „View in your space“-Button. Ein 3D-Produktmedium allein stellt aber noch keine automatische Verbindung zu den Kundeneingaben unseres Editors her. [Shopify: AR-Unterstützung](https://shopify.dev/docs/storefronts/themes/product-merchandising/media/support-media), [Shopify: Medienbedienung](https://shopify.dev/docs/storefronts/themes/product-merchandising/media/media-ux).

## AR: Technische Leitplanken

Vorgeschlagene Architektur, noch keine Implementierung:

- **Geometrie wiederverwenden:** geschlossene Formkontur mit Stärke zu einem Körper aufbauen, Innenausschnitte berücksichtigen. Physische Maße in mm bleiben die Quelle; 3D-Einheiten explizit umrechnen.
- **Vorlagen statt 100 Einzelmodelle:** pro Produktfamilie passende Modellbausteine und pro Zubehörform einen geprüften Sockel/Halter. Designs und Kundenwerte werden als abgeleitete Oberflächendarstellung aufgebracht. Unterschiedliche Geometrien oder Sockelmaße erfordern trotzdem passende Modellvarianten.
- **Materialdarstellung getrennt:** Acryltransparenz, Metalloberfläche und Holzmaserung an echten Referenzen abstimmen. Ein schönes gerendertes Verkaufsbild enthält keine verlässliche vollständige 3D-Geometrie.
- **Einstecktiefe:** Platte im gewählten Sockel korrekt positionieren; Gesamtstandhöhe aus echten Abmessungen und Einstecktiefe ableiten. Der unsichtbare Bereich bleibt technisch vorhanden.
- **Versionsbindung:** Modellgeometrie, Variante, Designstand, Text/Fotos/Farben, Material und Zubehör ergeben gemeinsam den Darstellungsstand. Modellcache darf keine fremden Kundenfotos wiederverwenden.
- **Personalisierter Export:** ein GLB und eine geeignete iOS-Ausgabe, üblicherweise USDZ, müssen die tatsächliche Auswahl enthalten. Darstellungsauflösung kann kleiner sein; Originale und Vektor-/CMYK-Fertigung bleiben unverändert hochwertig.
- **Modusgrenzen ernst nehmen:** Modell- und Texturänderungen sind je AR-Modus unterschiedlich übertragbar. Scene Viewer lädt die Modell-URL erneut; Änderungen nur im Browser werden dadurch nicht automatisch übernommen. Quick Look unterstützt nicht jede Materialänderung identisch. Deshalb tatsächlichen Auswahlstand exportieren und auf beiden Plattformen prüfen. [model-viewer: Material-/Szenenänderungen](https://modelviewer.dev/examples/scenegraph/).
- **Platzierung und Maßstab:** Wandplatzierung und gesperrter Maßstab sind in model-viewer vorgesehen. WebXR benötigt HTTPS und bei Einbettung passende Freigabe im iframe. Unterstützung erkennen, statt aus dem Handymodell pauschal Erfolg abzuleiten. [model-viewer: AR-Modi](https://modelviewer.dev/examples/augmentedreality/).
- **Kundenmedien:** personalisierte Dateien in eigener geschützter Ablage, temporäre schwer erratbare Zugriffsmöglichkeiten für den jeweiligen Viewer, definierte Löschfristen. Kein Hochladen privater Gestaltung in die allgemein öffentliche Shopify-Dateibibliothek. Shopify bezeichnet diesen Bereich ausdrücklich als öffentlich zugängliche Ablage. [Shopify: Produktmedien](https://help.shopify.com/en/manual/products/product-media).
- **Keine KI pro Kamerabild:** Größenänderung, Texturübernahme und Modellzusammenbau deterministisch durchführen. KI nur bei ausdrücklich beauftragter Gestaltung oder Asseterstellung einsetzen.

## Ehrliche Grenzen und Pilotabnahme

AR hilft bei Größenwirkung und Platzierung. Es ist weder eine verbindliche Raumvermessung noch ein farbverbindlicher Druckproof. Einschätzung für unser Vorhaben: transparente Acrylkanten, Brechung, echte Spiegelungen, Gravurkontrast und Verdeckung durch Gegenstände werden je Gerät unterschiedlich glaubwürdig. Diese Qualität darf nicht ohne echte Gerätetests zugesagt werden. Auch Wand-/Türerkennung muss an realen Flächen geprüft werden.

Vorgeschlagener Pilot:

- Ein Wandschild in zwei Größen, mit tatsächlicher Kontur und Stärke.
- Ein Acrylbild in beiden bestätigten Größen mit einem massiven und einem flachen Sockel; danach weitere Materialien/Sockel hinzufügen.
- Ein aktuelles unterstütztes iPhone und Android-Gerät, zusätzlich Desktop ohne AR und ein Gerät ohne AR-Unterstützung.
- Nach Text-, Foto-, Farb-, Größen- und Sockelwechsel zeigt die Raumansicht den neuen Stand, ohne altes Musterbild oder falsche Skalierung.
- Bei Wandansicht korrekte Orientierung; beim Aufstellen Kontaktfläche und Sockelposition plausibel. Für Acryl bleibt Text von vorn lesbar; Produktionsspiegelung wird nicht nochmals in die sichtbare Vorderansicht übernommen.
- Abbruch, fehlende Kamerafreigabe, abgelaufene Modelldatei und Rückkehr zum Editor verlieren keine Gestaltung.
- Ladestatus, Ladezeit, Dateigröße und Fehler auf echter Mobilverbindung messen. Ziele nach dem ersten Modell festlegen; keine unbelegten Performanceversprechen.
- Produkt- und Produktionsausgabe sind auch bei AR-Ausfall weiterhin nutzbar.

## Quellen- und Prüfgrenzen

Offizielle Anbieter- und Entwicklerseiten wurden am 30.09.2026 gelesen. Features sind dokumentiert, aber weder Tarifverfügbarkeit noch Qualität jedes Konkurrenzprodukts wurden praktisch geprüft. Keine Behauptung vollständiger Gleichwertigkeit oder Vollständigkeit aller am Markt vorhandenen Funktionen.

Lokaler Abgleich unter anderem mit `configurator/variant-m/help.mjs`, `ux.mjs`, `workflow.mjs`, zugehörigen Einpassungstests und dem vorherigen Master-Audit. Neuer konkreter Prüfpunkt: Die allgemeine Foto-Hilfe in `ux.mjs` nennt einen pauschalen Zuschlag, während Produkte abweichende Inklusiv-/Preisregeln haben. Hilfetexte künftig aus derselben aktiven Produktregel ableiten. Keine neuen Laufzeitänderungen oder AR-Tests in diesem Recherchelauf.

Diese Ergänzungen sind Empfehlungen zur Master-Version. Die Frage nach AR ist noch keine Freigabe für kostenpflichtige Dienste, neue Cloudkonten oder einen sofortigen vollständigen AR-Ausbau.
