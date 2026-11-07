# Zakeke-Recherche für Gravurus Designstrecke und Shop-Anbindung

Stand: 8. November 2026. Recherche: offizielle Zakeke-Hilfe und technische Dokumentation; für allgemeines Browser-Ladeverhalten ergänzend MDN. Keine Anmeldung, kein Zugriff auf Kontodaten, keine Änderungen in Zakeke, Shopify oder am Konfigurator. Dieser Bericht ist ein Architekturvorschlag, kein Nachweis einer bereits umgesetzten Anbindung. Der inhaltlich eingefrorene Konfi-Stand R15 bleibt durch diese Recherche unberührt.

Aktuelle Vorgabe aus dem Hauptchat: **Edelstahl-Türschilder sind der erste Pilot, einschließlich aller vorhandenen Formen und der passenden Größen/Befestigungen.** Das Profil muss später auch bedrucktes Acryl, Füße und Wandhalter abbilden. Foto wird nur bei dafür geeigneten Produkten angeboten. R15 darf nach Freigabe in `main`; Änderungen am gemeinsamen Konfi nimmt ausschließlich Mika in Abstimmung mit dem Nutzer vor. Andere KIs bearbeiten nur bestätigte produktbezogene Daten. Die folgenden Schiefer-/Hundebeispiele erläutern frühere Anforderungen und ersetzen diesen neuen Pilot nicht.

## Ergebnis für Mika

**Die gewünschte Arbeitsweise ist sinnvoll:** Designs einmal in der Galerie verwalten, zu Designgruppen zusammenstellen, zulässige Materialien/Größen/Ausführungen über bestätigte Produktgruppen-Vorlagen festlegen und daraus Shop-Angebote erzeugen oder gezielt aktualisieren. Der Klick auf ein Produktbild muss eine eindeutige Startdesign-ID übertragen. Das Foto selbst sollte die Vorlage nicht durch Bilderkennung bestimmen.

Zakeke liefert gute Vorbilder für die Trennung von Produkt, Vorlage, Gestaltungswerkzeugen, Bibliotheken und Produktionsdaten. Seine dokumentierten Funktionen sind aber nicht gleichbedeutend mit einer vollständigen, bidirektionalen Spiegelung des Shops. Insbesondere sind Kopieren einer Vorlage, Speichern eines Kundenentwurfs, Aktualisieren einer Galerievorlage und Synchronisieren eines Shop-Angebots vier unterschiedliche Vorgänge.

**Meine Empfehlung:** Den bestehenden eigenen Konfi weiterverwenden. Für die nächste Arbeitsphase die Verwaltungs- und Veröffentlichungsstrecke vervollständigen, statt parallel einen zweiten Konfigurator oder eine Zakeke-Anbindung einzuführen. Zakeke dient als belegte Referenz für Abläufe. Neue UI-Ideen werden vorgeschlagen und mit Mika besprochen; sie werden durch diesen Bericht nicht beauftragt.

## 1. Was genau geprüft wurde

Geprüft wurden öffentliche Dokumentationen, keine angemeldete Zakeke-Verwaltung. Der genannte Link `/en/Admin/ai-creative-tools/studio` ist kein hinreichender Beleg für Produktverwaltung oder Massenimport. Die Hilfe verortet Produkte unter **Customizable Products**, Regeln unter **Commerce Rules**, Schriften unter **Libraries** und Vorlagen/Motive unter **Customization Experience**. Einige ältere Anleitungen verwenden noch **Tools**. Die Umbenennungen sind in den offiziellen Backoffice-Änderungen beschrieben. [Backoffice-Änderungen Juli 2026](https://zakeke.zendesk.com/hc/en-us/articles/28477656423196-Product-Update-July-2026)

Die November-Veröffentlichung beschreibt zusätzlich einen KI-Assistenten für Produktkonfigurationen mit Vorschau und Bestätigung. Das ist ein dokumentierter Produktstand, aber kein von uns ausgeführter oder auf Genauigkeit geprüfter Import. Die Terminologie „AI Agents Studio“ umfasst laut Abrechnung außerdem Bild-, Video- und 3D-Werkzeuge; daraus folgt keine automatische Übernahme unserer Designbögen in vollständig bearbeitbare Vorlagen. [November-Änderungen](https://zakeke.zendesk.com/hc/en-us/articles/31152312817180-Product-Update-November-2026), [AI-Werkzeuge und Abrechnung](https://zakeke.zendesk.com/hc/en-us/articles/31154048227740-AI-Credits-and-Billing)

Quellen sind nachfolgend unmittelbar verlinkt. „Für uns“ und „Vorschlag“ kennzeichnen eigene Schlussfolgerungen. API-Funktionen sind anhand veröffentlichter Schnittstellen beschrieben; sie wurden nicht mit einem Konto ausgeführt.

## 2. Produkt, Ausführung und Design sauber auseinanderhalten

### Dokumentierter Zakeke-Ansatz

Ein „Customizable Product“ ist normalerweise eine Konfiguration zu einem bereits existierenden Shop-Produkt. Ein in Zakeke frei angelegtes Produkt muss für den Shop ebenfalls zugeordnet werden. Die Struktur lautet Produkt → Variante → Seite → Gestaltungsfläche. Speichern als Entwurf und Veröffentlichen sind getrennte Aktionen. [Produkt einrichten](https://zakeke.zendesk.com/hc/en-us/articles/360026668693-Create-a-customizable-product)

„Printing Methods“ bestimmen verfügbare Werkzeuge und Produktionsausgabe. Ein Profil kann mehreren Produkten, Varianten oder Seiten zugewiesen werden. Schriften und Uploadmöglichkeiten lassen sich darüber einschränken. Preise und manche Zusatzfunktionen werden separat konfiguriert. [Printing Methods](https://zakeke.zendesk.com/hc/en-us/articles/360016836099-Printing-Methods)

### Für uns: ein System mit wenigen wiederverwendbaren Bausteinen

| Baustein | Enthält | Beispiel, kein neuer Freigabebeschluss |
| --- | --- | --- |
| Grundplatte | Materialdarstellung, Form, Referenzbild/Geometrie | Schiefer, Rechteck |
| Größenprofil | Echte Breite/Höhe, zulässige Gestaltung, Maßstabsregeln | 220 × 140 mm oder 300 × 200 mm |
| Ausführungsprofil | Befestigung, Zubehör, Abhängigkeiten und Aufpreise | Bereits bestätigte Optionen dieser Produktgruppe |
| Werkzeugprofil | Text, Motive, Fotos/Logos und jeweilige Regeln | Dieselben bewährten Module |
| Design | Bearbeitbare Elemente, Schriften, Positionen, Original-ID, Revision | Bruno, Semi oder eine andere freigegebene Vorlage |
| Designgruppe | Zugehörige Designs und deren Eignung | Andenken → Hunde → ohne Foto |
| Shop-Angebot | Produktseite, Varianten, Startdesign, Bilder und Shop-ID | Angebot mit Semi als Hauptbild |
| Kundenkonfiguration | Konkrete Kundengestaltung und gewählte Optionen | Ein einzelner Warenkorbartikel |

Damit muss ein neues Design keine neue Grundplatte und keine neue Kopie der Schriftdateien mitbringen. Ein neues Material ist trotzdem mehr als ein anderer Hintergrund: Es kann andere Fertigungsregeln, Maße, Befestigungen, Farben und Preise benötigen.

**Korrektur einer früheren Vereinfachung:** Häufig ändert sich pro Produktgruppe vor allem die Ausführung. Das genügt aber nicht als universelle Regel. Material, reale Geometrie, Produktionsverfahren und erlaubte Gestaltung müssen ebenfalls passend hinterlegt sein. Die Bedienmodule können identisch bleiben, während ihre Daten und zulässigen Optionen variieren.

## 3. Designgruppen und Startdesign vom Hauptproduktbild

### Was Zakeke nachweislich kann

Vorlagen gehören dort zu einem konkreten Produkt, lassen sich kategorisieren und als Standard für alle oder bestimmte Varianten festlegen. Einzelne Texte, Bilder und Masken besitzen getrennte Bearbeitungsrechte, etwa für Bewegen, Größe, Löschen oder Ersetzen. Auch reine Vorschau-Elemente ohne Produktionsausgabe sind vorgesehen. [Pre-designed Templates](https://zakeke.zendesk.com/hc/en-us/articles/360016320114-Pre-designed-Templates)

Für Shopify dokumentiert Zakeke Direktlinks mit einer Vorlagen-ID. Die UI-Schnittstelle kann eine Startvorlage laden und sichtbare Vorlagenkategorien über Referenzschlüssel filtern. Das ist ein eindeutiges Mapping und keine Erkennung des Bildinhalts. [Direktlink zur Vorlage](https://zakeke.zendesk.com/hc/en-us/articles/4839839434140-Set-a-direct-URL-for-a-pre-designed-template), [Customizer UI API](https://docs.zakeke.com/docs/API/Integration/Visual-Product-Customizer/customizer-UI-API)

Zwischen Produkten dokumentiert die Hilfe das **Duplizieren** von Vorlagen. Sie belegt keine gemeinsame Mastervorlage, deren spätere Bearbeitung automatisch alle Kopien aktualisiert. Auch Produktkonfigurationen können kopiert werden; die Hilfe nennt dafür Einschränkungen, etwa zwischen Verkaufskanälen. [Duplizieren von Produkten und Vorlagen](https://zakeke.zendesk.com/hc/en-us/articles/360021646919-Duplicating-Customizable-Products-and-or-Pre-designed-Templates)

### Für uns: Mikas Beispiel direkt abbilden

1. Eine Gruppe „Andenken Hunde ohne Foto“ verweist auf die freigegebenen Originaldesigns. Die endgültige Anzahl wird aus dem freigegebenen Katalog ermittelt; Gesprächsbeispiele „40“ und „43“ sind kein Ersatz für diese Prüfung.
2. Jedes Shop-Angebot erhält ausdrücklich `designGroupId` und `startDesignId`. Ein Angebot mit „Semi“ als Hauptbild startet mit Semi.
3. Das Hauptproduktbild wird aus **derselben freigegebenen Designrevision** erzeugt, die der Konfi lädt. Sonst können Bild und Konfi trotz richtiger ID auseinanderlaufen.
4. Im Konfi werden nur die für Zielgruppe, Material und Form geeigneten Designs angezeigt.
5. Ein Design kann in mehreren Angeboten vorkommen. Diese Angebote referenzieren dasselbe Original, ohne die bearbeitbare Quelldatei zu vervielfältigen.

**Verkaufsentscheidung separat halten:** Eine Designgruppe erzwingt weder ein einziges Shopify-Produkt noch ein eigenes Produkt pro Design. Für gezielt anklickbare Hauptbilder können mehrere Angebote sinnvoll sein; intern bleiben die Designs und Grundplatten trotzdem gemeinsam verwaltet. Welche Verkaufsseiten entstehen, sollte in der Importvorschau sichtbar sein.

## 4. Grundplatten, skalierbare Größen und Bohrlöcher

Zakekes normale Produkte verwenden reale Gestaltungsflächen; frei veränderbare Maße werden als eigener Produkttyp behandelt. Dieser unterstützt Größenbereiche und optional feste Seitenverhältnisse. **Resizable Products können laut Hilfe keine normalen Varianten haben**; vordefinierte Größen werden dort über Presets angeboten. Das ist eine Zakeke-Einschränkung, keine Vorgabe für unseren eigenen Konfi. [Resizable Products](https://zakeke.zendesk.com/hc/en-us/articles/14234024887964-Resizable-products)

Für normale Varianten dokumentiert Zakeke jeweils eigene Produktbilder und Gestaltungsflächen. Das passt als Vorbild für Form-/Größenkombinationen mit abweichender Geometrie. Attribute wie Größe und Material kommen beim Import zunächst aus dem Shop. Nachträgliche Shop-Änderungen werden laut aktueller Variantenhilfe nicht immer automatisch übernommen. [Varianten einrichten](https://zakeke.zendesk.com/hc/en-us/articles/360015501299-Variants-Detailed-guide-on-setting-them-up-for-your-customizable-product)

Für uns empfehle ich echte freigegebene Größenprofile mit gemeinsamem Grundplatten-Asset:

- 9 × 6 cm und 30 × 20 cm haben beide das Seitenverhältnis 3:2. Ein geeignetes Grundbild kann für beide verwendet werden.
- 22 × 14 cm hat etwa 1,571:1; 30 × 20 cm hat 1,5:1. Diese beiden Formate sind nicht exakt proportional. Blindes Strecken würde Formen und Motive verändern. Nötig sind eine passende Plattengeometrie und eine geprüfte Layoutanpassung.
- Lochdurchmesser, Randabstand und Abstandhalterdurchmesser werden in realen Maßen gespeichert. Ein 4-mm-Loch wirkt bei gleich großer Bildschirmdarstellung auf einer 90-mm-Platte relativ größer als auf einer 300-mm-Platte. Das ist die Folge des richtigen Maßstabs, kein Ersatz für ihn.
- Die Lochmaske wird aus Geometrie und gewählter Ausführung erzeugt. Material, Form und sichtbare Kanten müssen dabei glaubwürdig bleiben. Ein Grundfoto genügt nicht automatisch für unterschiedliche Oberflächen, Perspektiven oder wesentlich andere Formen.
- Grundplatte, Befestigungsvorschau und Kundenmotiv bleiben getrennte Ebenen. Die Grundplatte wird nicht versehentlich als Gravur ausgegeben.

Zakeke trennt ebenfalls Produktdarstellung und Produktionsfläche; seine technische Importbeschreibung kennt Hintergrundbilder, physikalischen Maßstab sowie Rechteck-, Ellipsen-, Masken- und PDF-Flächen. Das bestätigt das Grundprinzip, nicht die konkrete Wiederverwendung unserer Dateien. [CSV v3: Seiten und Flächen](https://docs.zakeke.com/docs/API/Integration/Connecting-Product/CSV-v3-method)

## 5. Gemeinsame Schriften, Motive und Uploads

Zakeke besitzt eine zentrale Schriftverwaltung, unterstützt eigene TTF-/OTF-Dateien und ZIP-Uploads sowie die Auswahl erlaubter Schriften über Profile. Die Hilfe empfiehlt ausdrücklich Produktionsprüfungen und weist auf Unterschiede bei Schriftdateien, Stilen und Ausgabedarstellung hin. Das Vorhandensein eines Fontnamens genügt also nicht für ein identisches Ergebnis. [Fonts](https://zakeke.zendesk.com/hc/en-us/articles/360016443533-Fonts)

Motivbibliotheken lassen sich in Kategorien organisieren, mehreren Produkten zuordnen, gesammelt bearbeiten und bepreisen. Nicht zugeordnete Motive sind dort grundsätzlich überall sichtbar. Die Anleitung enthält widersprüchliche Aussagen zur Änderbarkeit von Standardkategorien; daraus leite ich keine belastbare Regel für diese Sonderfälle ab. [Image and Clipart Gallery](https://zakeke.zendesk.com/hc/en-us/articles/360007632300-Image-and-Clipart-Gallery)

Für uns:

- Eine Asset-ID pro Datei, Inhaltshash gegen identische Duplikate und eine feste Version. Gleicher Fontname bei unterschiedlichen Dateien darf nicht stillschweigend zusammengeführt werden.
- Designreferenzen speichern Schriftfamilie, Stil und konkrete Assetversion. Originalschrift und bearbeitbare Texte bleiben erhalten.
- Motive zentral verwalten, aber produktbezogen ausdrücklich erlauben. Nicht versehentlich durch fehlende Zuordnung alles freischalten.
- Kundenfotos getrennt von Katalogassets behandeln. Originaldatei, gewählter Zuschnitt und Maske getrennt speichern; die Originaldatei bleibt vollständig.
- Fotos/Motive/Logos werden über denselben bewährten Editor bedient. Änderungen an Rechten werden nicht aus Zakekes Standardvorgaben übernommen. Insbesondere Mikas gewünschtes Verschieben, Vergrößern und Löschen bleibt maßgeblich.

### Ladeverhalten: Produktseite zuerst, Konfi gezielt vorbereiten

**Dokumentierter Zakeke-Befund:** Die Hilfe empfiehlt kleine Produktdarstellungen und beschreibt standardmäßig eine Reduktion auf 1024 × 1024 Pixel; Grundbilder fließen nicht in die Produktionsdatei ein. Eine öffentliche Zusage, dass sämtliche Fonts und Motive erst bedarfsgesteuert geladen oder auf der Shopify-Produktseite gezielt vorgewärmt werden, habe ich in den geprüften Quellen nicht gefunden. Wir sollten deshalb kein konkretes Lazyloading-Verhalten von Zakeke behaupten. [Seiten und Bildgröße](https://zakeke.zendesk.com/hc/en-us/articles/360009494599-Side-s)

**Eigene Empfehlung für Gravuru:**

1. Produktseite zuerst vollständig nutzbar machen: Hauptbild, Preis, Auswahl, Startknopf.
2. Danach nur den wahrscheinlichen Start vorbereiten: Konfi-Kern, Produktprofil, Grundplatte, Startdesign und dessen tatsächlich benötigte Schriftstile. Auf schwacher Verbindung oder bei Datensparwunsch weniger vorladen.
3. Beim Öffnen sofort die richtige Gestaltung anzeigen. Schriften müssen bereit sein, bevor verbindliche Textmaße berechnet werden; kein falsches Einpassen auf Basis einer Ersatzschrift.
4. Motiv- und Designbibliothek zunächst als kleine Metadatenliste und sichtbare Vorschaubilder laden. Originalgrafik erst bei Auswahl, weitere Vorschauen beim Scrollen. Seltene Bearbeitungsfunktionen bei Bedarf laden.
5. Dieselben versionierten Asset-URLs und passende Cache-Regeln verwenden. Ob Vorladen auf der Shop-Seite im späteren Konfi tatsächlich wiederverwendet wird, muss mit dessen realen Domains, Credentials und Browser-Caches gemessen werden; es ist nicht automatisch garantiert.

MDN dokumentiert bedarfsgesteuertes Nachladen, Aufteilung von JavaScript und nachgeladene Bild-/Iframe-Ressourcen. `preload` lädt dagegen mit höherer Priorität frühzeitig herunter und ist deshalb gezielt für unmittelbar benötigte Dateien zu verwenden. Ressourcentyp und CORS-Modus müssen zum späteren Abruf passen. [Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading), [Preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload)

Prüfung vor einer Optimierung: kalt/warm, Handy/PC, direkt/über Produktseite; Antwortzeit des Servers, Übertragungsmenge, doppelte Abrufe, Cachetreffer, Zeitpunkt der korrekten Schrift und Zeit bis zur ersten möglichen Bearbeitung. Dieser Bericht enthält keine gemessenen Ladezeiten und beauftragt keinen Umbau des eingefrorenen Konfis.

## 6. Produktgruppen-Vorlagen mit Bestätigung vor dem Anlegen

Zakeke trennt sichtbare Varianten von „Extra Options“ für nicht visuelle Zusatzwünsche. Solche Optionssets können Preise und Bedingungen enthalten. Sie verändern laut Dokumentation die Produktdarstellung nicht. Deshalb wären sichtbare Bohrungen oder Abstandhalter keine ausreichende Anwendung einer bloßen Extra-Option. [Extra Options](https://zakeke.zendesk.com/hc/en-us/articles/25246484297116-Extra-Options)

Für unsere Verwaltung braucht jede Produktgruppe ein bestätigtes Profil. Die Beispiele Klebeband, Bohrungen oder Ständer werden nicht zu einer abschließenden Liste gemacht. Die Bestätigung sollte umfassen:

| Vor dem Anlegen bestätigen | Zweck |
| --- | --- |
| Materialien und Produktionsverfahren | Welche Kombinationen sind tatsächlich lieferbar? |
| Formen und Größen | Echte Maße, freigegebene Skalierungen, Grundplattenreferenz |
| Befestigungen, Zubehör und Farben | Vollständige Liste einschließlich gegenseitiger Ausschlüsse |
| Eignung je Material/Größe | Eine Option darf nicht auf jede Variante durchgereicht werden |
| Basispreise und Aufpreise | Nachvollziehbare Preisregeln und gültige Währung |
| Designgruppe und Startdesigns | Passende Gestaltung pro Angebot |
| Kundenseitig erlaubte Bearbeitung | Bestehende Freigaben erhalten, Ausnahmen ausdrücklich prüfen |
| Produktionsausgabe | Maße, Dateityp, Fotoverarbeitung, Sperr-/Randbereiche |

Für den aktuellen Edelstahl-Pilot wird jede vorhandene Form aus dem Bestand erfasst. „Alle Formen“ bedeutet nicht, alle Größen mit allen Befestigungen blind zu kombinieren: Jede tatsächlich angebotene Kombination benötigt eine gültige Zuordnung. Beim späteren Acrylprofil kommen Druckverfahren, Füße/Wandhalter und Fotoeignung als Daten hinzu. Der gemeinsame Foto-Tab bleibt bei nicht geeigneten Produkten verborgen; dafür wird ein bestätigtes Fähigkeitsmerkmal im Profil verwendet, keine Sonderversion des Editors.

Technischer Vorschlag: Die Freigabe bezieht sich auf eine bestimmte Profilrevision. Ändert sich eine relevante Option, verfällt die Freigabe für diese neue Revision. Die bisher veröffentlichte Revision bleibt bis zur nächsten bewussten Veröffentlichung aktiv. Ein vollständiges, bereits bestätigtes Profil wird beim nächsten Import angezeigt und wieder bestätigt; unbekannte Werte werden nicht geraten.

Das schützt sowohl vor unpassenden Auswahlmöglichkeiten als auch davor, bei jeder neuen Vorlage wieder den gesamten Konfi umzubauen.

## 7. Schnell anlegen: Tabellen → Prüfung → Importauftrag

Die aktuelle Zakeke-CSV-v3-Schnittstelle dokumentiert Massenanlage und Aktualisierung über stabile Referenzschlüssel, Hintergrundaufträge und Ergebnisstatus. Derselbe Import kann wiederholt werden, ohne erneut dieselben Entitäten anzulegen. Ein Backoffice-Assistent nutzt dasselbe Format. Listen und übermittelte Seiten-/Flächensätze können vorhandene Sätze ersetzen; Teilfehler sind möglich. Die alte CSV-v2-Dokumentation ist als veraltet markiert. [CSV Import v3](https://docs.zakeke.com/docs/API/Integration/Connecting-Product/CSV-v3-method), [Legacy-Abgrenzung](https://docs.zakeke.com/docs/API/Integration/Connecting-Product/CSV-method)

Zakekes „Product Catalog API“ ist dagegen eine Schnittstelle, die der Integrator für seinen eigenen Katalog bereitstellt, damit Zakeke Produkte und Optionen abfragen kann. Sie ist nicht einfach ein universeller Endpunkt zum Schreiben unseres Shopify-Katalogs. [Product Catalog API](https://docs.zakeke.com/docs/API/Integration/Connecting-Product/Products_Catalog_API)

**Für uns ist ein wiederholbarer Importdienst der schnellste tragfähige Weg.** Ein Skript kann ihn zunächst ausführen; dieselbe Logik kann später hinter „Importieren“ in der Verwaltung liegen. Shell ist dabei das Startwerkzeug, die API die Verbindung und die vorhandenen Tabellen die Datenquelle. Das sind ergänzende Teile, keine konkurrierenden Alternativen.

Vorgeschlagener Ablauf:

1. Tabellen einlesen und Spalten eindeutig zuordnen.
2. Originaldesigns, Rohlinge, Fonts und Preise über stabile IDs verbinden.
3. Unbekannte Werte, fehlende Dateien und widersprüchliche Kombinationen gesammelt melden.
4. Produktgruppen-Profil mit allen Optionen zur Bestätigung zeigen.
5. Eine Vorschau der entstehenden Angebote und Varianten erzeugen: neu, geändert, unverändert, blockiert.
6. Erst nach Bestätigung Entwürfe anlegen; Ergebnis pro Angebot speichern.
7. Fehlgeschlagene Einträge gezielt wiederholen, erfolgreiche nicht nochmals duplizieren.

Bei Designbögen ist ein Bildausschnitt allein kein vollständig bearbeitbares Design. Text, Font, Motiv und Position müssen als getrennte Elemente vorliegen oder kontrolliert rekonstruiert werden. Bereits vorhandene korrekte Originaldateien haben Vorrang; erneutes manuelles Abzeichnen würde unnötig Zeit und Genauigkeit kosten.

## 8. Galerie bearbeiten und mit dem Shop synchronisieren

### Nachweisbare Grenzen bei Zakeke

Der dokumentierte Bild-/Namensabgleich zieht Änderungen **aus dem Shop nach Zakeke**. Eine Bildänderung in Zakeke aktualisiert ausdrücklich nicht das Shop-Bild. Das ist keine vollständige bidirektionale Synchronisierung. [Bild und Name synchronisieren](https://zakeke.zendesk.com/hc/en-us/articles/10472925754268-Sync-product-image-and-name-with-e-commerce)

Die Designs API kann Kundendesigns auslesen, kopieren, Produktionsdateien abrufen und Vorlagenvorschauen auf Varianten erzeugen. Sie kann auch eine neue Kundenkonfiguration aus Vorlage und Variante erzeugen. Die veröffentlichte Endpunktliste belegt aber keine allgemeine API zum Aktualisieren aller bearbeitbaren Galerievorlagen. Ein gemeinsamer Template-Code an mehreren Produkten ist noch kein Nachweis gemeinsamer Speicherung. [Designs API](https://docs.zakeke.com/docs/API/designs-API)

Zakekes Shopify-Hilfe zur nachträglichen Änderung von Attributen ist auf Januar 2023 datiert und nennt starke Einschränkungen. Sie muss vor einer tatsächlichen Zakeke-Migration erneut praktisch geprüft werden. Sie wird hier ausdrücklich nicht als Aussage über alle heutigen Shopify-APIs behandelt. [Änderung bestehender Varianten](https://zakeke.zendesk.com/hc/en-us/articles/360014743800-Editing-the-attributes-variants-of-the-product-in-your-store-after-a-product-has-been-published-as-a-customizable-product)

### Für uns: genau Mikas gewünschter Knopf

**Galerie bearbeiten → Speichern → Vorschau prüfen → Synchronisieren.**

Das Speichern muss zunächst in genau dieselbe Galerievorlage zurückführen: Original-ID erhalten, neue Revision anlegen, Vorschau aktualisieren, Schnellbearbeitung neu laden und Freigabestatus zur neuen Revision passend anzeigen. „Für die Werkstattprüfung sichern“ bleibt ein anderer Zweck; es ersetzt diese Rückspeicherung nicht.

Der anschließende Synchronisationsdialog sollte zeigen:

- Welche Shop-Angebote von dieser Designrevision betroffen sind.
- Welche Hauptbilder, Startdesigns, Beschreibungen oder Variantenpreise geändert werden sollen.
- Was seit dem letzten Abgleich im Shop selbst verändert wurde.
- Welche Änderungen übernommen werden und welche blockiert sind.

Empfohlene Zuständigkeit: Unsere Verwaltung führt Designs, Produktgruppen, Gestaltungsregeln und zugeordnete Produktdaten. Shopify führt Bestellungen und Bestände. Für Titel, Beschreibungen, Preise und Medien wird ausdrücklich festgelegt, welche Felder unsere Verwaltung verwaltet. Eine Shop-Änderung an einem solchen Feld löst eine Konfliktanzeige aus, keine stille Überschreibung.

„Synchronisieren“ bedeutet dann: den bestätigten aktuellen Stand in die zugeordneten Angebote übertragen. Es bedeutet nicht, einen vollständigen Shop im Browser nachzubauen oder bei jeder Änderung neue Produkte zu erstellen. Alte Warenkörbe und Bestellungen behalten ihre konkrete Designrevision.

## 9. Warenkorb und Produktion gehören zur Anbindung

Zakeke dokumentiert für Shopify zwei eigene Warenkorbverfahren: standardmäßig eine nicht gelistete personalisierte Produktkopie oder das Originalprodukt mit separatem Aufpreisartikel. Die Varianten unterscheiden sich bei Vorschaubild, Preisverhalten und zusätzlicher Anpassung. Bearbeitung aus dem Warenkorb benötigt dort eigenen Code. Diese Aussagen beschreiben Zakekes Integration; sie sind keine pauschale Grenze aller Shopify-Lösungen. [Shopify-Warenkorbverhalten](https://zakeke.zendesk.com/hc/en-us/articles/360013667339-Add-to-Cart-behaviour-Shopify)

Die Bestellregistrierung ist in der API ein eigener Schritt: Erst die registrierte Bestellung löst die Produktionsdateien aus. Die Shop-Bestellung bleibt bestehen und wird um die Individualisierung ergänzt. [Order Registration](https://docs.zakeke.com/docs/API/Integration/Visual-Product-Customizer/order-registration-customizer)

Zakeke erzeugt Ausgabe je Gestaltungsfläche und liefert auch Originaluploads sowie eine Bestellzusammenfassung. DXF enthält laut Hilfe keine Rasterfotos. Für unsere Fotogravur darf deshalb ein erfolgreich erzeugtes DXF nicht als Beweis vollständiger Produktion gelten. [Produktionsdateien und Bestellungen](https://zakeke.zendesk.com/hc/en-us/articles/360016291573-Print-Ready-Files-Orders)

Für uns muss ein kaufbarer Pilot mindestens beweisen:

1. Richtige Variante, Material, Größe und Befestigung im Warenkorb.
2. Basispreis plus bestätigte Aufpreise entspricht dem Checkout; Menge und Entfernen erzeugen keine falschen Zuschläge.
3. Personalisierte Vorschau und Rückkehr zum gespeicherten Entwurf funktionieren.
4. Bestellung enthält einen unveränderlichen Gestaltungsstand einschließlich Originaluploads, Masken und Fontversionen.
5. Produktionsdatei hat die tatsächlichen Maße; Texte, Motive und Fotos erscheinen vollständig und passend zum gewählten Verfahren.
6. Wiederholte Webhooks oder Rückmeldungen erzeugen keine doppelte Produktion; Fehler bleiben sichtbar und können erneut verarbeitet werden.

Wichtige Lehre aus konkreten Zakeke-Fehlerfällen: Das Löschen/Neuanlegen von Varianten oder Flächen kann bestehende Kundenentwürfe verwaisen lassen. Auch gelöschte Entwürfe können noch im Shop-Warenkorb liegen. **Für uns deshalb Versionen erhalten statt bestehende Referenzen zu ersetzen.** [Orders Error Guide](https://zakeke.zendesk.com/hc/en-us/articles/22995675178524-Orders-Error-Guide)

Zakeke weist beim manuellen Bearbeiten von Produktionsdateien zudem darauf hin, dass die vorherigen Dateien überschrieben werden. Für Gravuru empfehle ich ausdrücklich eine nachvollziehbare neue Produktionsrevision mit Rückgriff auf den vorigen Stand. [Edit Print-Ready Files](https://zakeke.zendesk.com/hc/en-us/articles/4403452302098-Edit-Print-Ready-Files)

## 10. Reihenfolge für unsere nächste Arbeitsphase

| Priorität | Konkretes Ergebnis | Abnahmekriterium |
| --- | --- | --- |
| 0 | Aktuellen Stand sichern und Zuständigkeiten festhalten | R15 und bestehende Daten wiederherstellbar; keine parallele UI-Änderung |
| 1 | Bestehende Galerie-Rückspeicherung prüfen | Bearbeiten speichert dieselbe Original-ID mit neuer Revision; Karte, Vorschau und Freigabe passen |
| 2 | Einen vollständigen Gruppen-Datensatz vorbereiten | Edelstahl-Türschilder mit allen vorhandenen Formen und jeweils bestätigten Größen/Befestigungen; keine erfundenen Optionen |
| 3 | Produktgruppen-Vorlage zur Bestätigung zeigen | Materialien, Größen, Befestigung, Zubehör, Preise und Ausnahmen vollständig sichtbar |
| 4 | Importvorschau und Testentwürfe | Keine Duplikate bei Wiederholung; klare Liste blockierter Einträge |
| 5 | Startdesign und Bildbindung prüfen | Alle ausgewählten Hauptbilder öffnen die passende freigegebene Vorlage |
| 6 | Gezielten Sync prüfen | Nur bestätigte Felder ändern sich; parallele Änderungen werden erkannt |
| 7 | Warenkorb bis Produktionsdatei testen | Preis, Optionen, Darstellung und Fertigungsmaß stimmen |
| 8 | Erst danach weitere Gruppen übernehmen | Gleiches Verfahren mit neu bestätigtem Profil, ohne neuen Konfi-Kern |

Dieser Bericht legt keine neue Live-Veröffentlichung fest. Freigaben und tatsächlicher Entwicklungsstand werden im Hauptchat bewertet. Ein Drei-Stunden-Ziel ist nur für einen bereits vollständig vorbereiteten Pilotdatensatz belastbar, nicht pauschal für die gesamte neue Verwaltungsstrecke.

## 11. Was wir übernehmen sollten — und was noch offen ist

**Sofort als Plan übernehmen:** klare Datenbausteine, zentrale Bibliotheken, passende Designgruppen, explizite Startdesign-IDs, bestätigte Produktgruppen-Profile, wiederholbare Importe, Vorschau vor Veröffentlichung und getrennte Kunden-/Produktionsrevisionen.

**Nicht ungeprüft übernehmen:** Produktkopien pro Kundenbestellung, stilles Überschreiben von Produktionsdateien, automatische neue Motivpakete, beliebige frei skalierbare Maße oder KI-Erkennung als Ersatz für Original-ID und Layoutdaten.

Offen und vor Umsetzung konkret zu prüfen:

- Welcher Teil der eigenen Galerie-Rückspeicherung und des Sync-Dienstes bereits im aktuellen Branch vorhanden und nachweislich getestet ist. Dieser Bericht führt kein Repository-Audit durch.
- Welche Katalogvorlagen tatsächlich freigegeben sind und welche gemeinsam nutzbaren Grundplatten/Fonts bereits referenziert werden.
- Welche Felder Shopify künftig selbst verwalten soll und welche die Galerie vorgibt.
- Wie aktuelle Warenkorb-Aufpreise, Bildvorschauen und Produktionsdateien im eigenen System technisch verbunden sind; sie dürfen nicht durch eine neue Katalogstrecke umgangen werden.
- Ob eine gruppenweite Designänderung sofort alle zugeordneten Angebote erhalten soll oder einzelne Angebote auf einer älteren freigegebenen Revision bleiben dürfen. Empfehlung: Auswahl in der Sync-Vorschau.

Für eine spätere tatsächliche Zakeke-Integration wären außerdem Accountberechtigungen, Tarif-/API-Verfügbarkeit und das reale Verhalten der dokumentierten Funktionen zu testen. Das ist hier nicht geschehen und für das vorgeschlagene eigene System auch kein Startblocker.

## 12. Sicherung und dauerhafte Arbeitsgrundlage

Diese MD-Datei sichert die Recherche und Empfehlungen, nicht Datenbank, Uploads oder Serverzustand. Für eine umfassende Sicherung braucht es getrennt:

- einen wiederherstellbaren Code-Stand;
- Export der Produktgruppen, Designgruppen, Originaldesigns, Revisionen und Shopify-Zuordnungen;
- Manifest der referenzierten Grundplatten, Schriften, Motive und Masken mit Prüfsummen;
- gesicherte Originaldateien und für Bestellungen relevante unveränderliche Konfigurationen;
- eine kurze „Aktueller Stand“-Datei mit aktivem Branch/PR, Demo-Version, bestätigten Vorgaben, offenen Punkten und zuletzt geprüftem Warenkorb-/Produktionsstand.

Empfehlung für die Erinnerung: Eine knappe zentrale Statusdatei plus ein Entscheidungsprotokoll und verlinkte ausführliche Berichte. Jeder Eintrag trennt **beschlossen**, **umgesetzt**, **getestet** und **veröffentlicht**. So werden alte Gesprächsvorschläge nicht versehentlich als neue Freigabe behandelt. GitHub kann diese Dokumente versionieren; ein reines Markdown-Protokoll ersetzt die tatsächliche Datensicherung nicht.
