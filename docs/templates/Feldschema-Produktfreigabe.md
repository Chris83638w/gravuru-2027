# Produktfreigabe – Leervorlage und Feldschema v1

Datei: **Produktfreigabe-Vorlage.xlsx**, erstellt am 09.11.2026. Eine Datei gehört zu **einem Produkt** und enthält **alle seine Varianten**. Die Datei erzeugt, ändert oder veröffentlicht kein Produkt. Kein automatischer XLSX-Importer wurde mit dieser Vorlage implementiert.

## Vier Arbeitsblätter

| Blatt / Tabelle | Inhalt und Schlüssel |
|---|---|
| **Freigabe / ProduktStammdaten** | Feldschlüssel in A, Wert in C, Klärungsstand in D. Produkt-ID, Produktgruppe, Dateiversion, bisherige Produktrevision, Bearbeiter/Zeit, Mandant/Shop, vorhandene Shopify-Produkt-ID, Original-Designgruppe/Revision, Startdesign/Hauptproduktbild, EUR, Preis-/Steuerkontext, Quellen, Quell-Fingerabdruck, Änderungsbeschreibung sowie die sechs unten genannten festen Dienstreferenzen. IDs werden als Text erhalten. |
| **Freigabe / ProduktFreigaben** | Bereich, ausdrückliche Entscheidung, bestätigende Person, Zeit, genaue Dateiversion und vorhandener planHash, Referenz auf den externen Beleg. Module, Optionen, Preise, Designs, Anlage/Änderung und Veröffentlichung sind getrennte Entscheidungen. |
| **Freigabe / ProduktNachweise** | Konfi-Profil/Revision, Produkt-/Variantenbindungen, Ausblendung, Preise, Warenkorb, Geräteprüfung, Sicherung/Rückweg. Status und Beleg bleiben offen, bis tatsächlich geprüft. |
| **Module / ProduktModule** | Die vorhandenen Schlüssel `options`, `designs`, `text`, `motifs`, `photo`, `logo`, `colors`; Wunschstatus `an/aus/offen`, technische Verfügbarkeit, Variantenbezug, Konfiguration, Preisreferenz, Quelle und Bestätigung. Zusätzliche Leerzeilen nehmen **neue Modulwünsche** auf. |
| **Varianten / ProduktVarianten** | Eindeutiger Variantenschlüssel, Form, Material, genaue Größe und Maße in mm, feste Optionswerte, Grundpreis, feste Aufpreise, berechneter Variantenpreis, vorhandene Shopify-Varianten-ID, Quelle und Bestätigung. Jede echte Verkaufskombination steht genau einmal. Keine automatischen Kreuzprodukte. |
| **Optionen / ProduktOptionen** | Eine Zeile je `(Variantenschlüssel, Optionsgruppe, Wertschlüssel)`: Bezeichnung, Zulässigkeit, Aufpreis, Abrechnungseinheit, Standard, Konfiguration/Begründung, Quelle und Bestätigung. Form, Größe und Material werden über die **konkrete Variante** eindeutig begrenzt. |

Die gelben Felder sind Eingaben. **Leer und „offen“ bedeuten unbekannt**, niemals `0`, `false` oder eine Freigabe. Nur EUR und die sieben bekannten Modulschlüssel sind vorbelegt. Es sind keine Beispielprodukte, Preise, Shopify-IDs oder bestätigten Entscheidungen enthalten. Zusätzliche Zeilen innerhalb der jeweiligen Excel-Tabelle ergänzen; bei Varianten die Formel der Spalte J mitführen.

### Feste Referenzen auf vorhandene Dienste

| Feld | Eingabezelle | Verbindliche Herkunft |
|---|---|---|
| `plan_id` | `Freigabe!C23` | Echte ID des bestehenden Anlage-/Synchronisierungsplans |
| `plan_hash` | `Freigabe!C24` | Unverändert übernommener `planHash` dieses Dienstes |
| `template_id` | `Freigabe!C25` | Feste Produktgruppen-Template-ID |
| `template_revision` | `Freigabe!C26` | Feste bestätigte Template-Revision |
| `module_profile_id` | `Freigabe!C27` | ID des vorhandenen Modulprofils |
| `module_profile_revision` | `Freigabe!C28` | Feste geprüfte Modulprofilrevision |

Diese Referenzen ersetzen keine der vorhandenen Dienste, deren Verträge, Revisionsprüfungen oder Bestätigungen. Der Quell-Fingerabdruck allein genügt nicht. **Der Hash der gesamten XLSX und ihr eigentlicher Freigabebeleg liegen außerhalb der XLSX**; in der Datei steht nur die Referenz auf diesen Beleg. Eine Selbsthash-Formel wird nicht verwendet.

## Preise und Sichtbarkeit

- Der Variantenpreis ist `Grundpreis + feste Aufpreise`. Solange einer der beiden Beträge fehlt, bleibt das Ergebnis leer. Ein fester Aufpreis von `0,00` muss ausdrücklich eingetragen und bestätigt werden.
- Preisquelle, **Brutto/Netto**, Steuersatz, Steuergebiet und zeitliche Gültigkeit müssen im Feld `tax_context` ausdrücklich dokumentiert werden. Diese Werte sind in der Leervorlage offen; die Vorlage nimmt keinen Steuersatz an.
- Ein Optionsbetrag mit Abrechnung **„im Variantenpreis enthalten“** wird nicht nochmals addiert. Zusätzliche variable Leistungen haben eine ausdrücklich bestätigte Einheit, etwa je Produkt, Stück, Motiv, Foto oder Logo. Die bestehende native Preislogik bleibt maßgeblich.
- Kein Foto möglich: gesamter Foto-Reiter aus. Keine Bohrung möglich: die entsprechenden Werte ausblenden. **Bohrlöcher sind eine Untergruppe von `options`, kein neuer Modulschlüssel.** Eine Gruppe ohne zulässige Werte entfällt; keine deaktivierten Restbuttons. Erlaubte Alternativen bleiben sichtbar.
- Neue Modulwünsche sind zulässig, aber zunächst Anforderungen. Sie erhalten keinen erfundenen Laufzeitschlüssel und keine technische Freigabe durch einen Excel-Eintrag. Bestehende Designs werden beim Abschalten eines Moduls nicht still gelöscht; Konflikte müssen vor Anlage geklärt werden.
- Variantenabhängige Modulgrenzen und freie Konfigurationsnotizen sind Anforderungen, keine ausführbaren Bedingungen. Die tatsächliche Ausblendung und serverseitige Zulässigkeitsprüfung bleiben ein ausdrücklicher Abnahmepunkt.

## Geplanter deterministischer JSON-/API-Weg

Dies ist ein **Vorschlag für eine spätere Ablage-/Exportkonvention**, kein vorhandener Importer. Die Bezeichnung `gravuru-product-approval/v1` ist ausdrücklich nur für eine mögliche Referenzablage vorgeschlagen, **kein neuer verbindlicher Runtimevertrag**. Für Anlage, Prüfung, Bestätigung und Synchronisierung bleiben die vorhandenen Dienste und Produktgruppen-/Modulprofil-/Planverträge maßgeblich.

1. Die benannten Excel-Tabellen lesen, keine Zellpositionen erraten. Leere Vorlagenzeilen ohne Identität und ohne Fachinhalt ignorieren; eine teilweise gefüllte Zeile ohne Schlüssel als Fehler melden. `offen` bleibt unbekannt. Quellen/IDs niemals erfinden.
2. `product` enthält genau die aufgeführten Stammdaten. `modules` enthält die bekannten Schlüssel und die bestätigten Wunschwerte; `newModuleRequests` erhält beschreibende Wünsche getrennt. `variants` wird nach Variantenschlüssel, `options` nach dem dreiteiligen Schlüssel sortiert. Doppelte Schlüssel oder unbekannte Variantenreferenzen werden abgewiesen.
3. Feste Optionswerte in Varianten-Spalte G sind ein JSON-Objekt aus `Gruppenschlüssel: Wertschlüssel` beziehungsweise ausdrücklich bestätigten Wertschlüssel-Arrays für Mehrfachwahl. Keine freie Textinterpretation und keine Zusatzschlüssel zulassen. Alle Werte müssen zu vorhandenen zulässigen Optionszeilen passen. Die vollständig leere feste Auswahl wird erst nach Bestätigung als `{}` eingetragen.
4. Geldwerte exakt in **ganze Cent** überführen; fehlende Werte bleiben `null`. Mehr als zwei Nachkommastellen nicht still runden. Maße als bestätigte Dezimalwerte in mm erhalten. Der Variantenpreis wird aus seinen zwei Eingaben neu berechnet; ein manuell überschriebenes Ergebnis darf nicht übernommen werden. Freitext, Quellen und Konfiguration werden unverändert als beschreibende Strings exportiert, **nicht** als Code ausgeführt.
5. Die noch zu bestätigende strukturierte Steuer-/Modul-/Optionskonfiguration wird vor der nativen Kompilierung ausdrücklich aufgelöst und geprüft. Aus einem freien Satz darf der Export weder eine Steuerregel noch eine Fähigkeitsfreigabe ableiten. Der native Produktcompiler und die vorhandene Preislogik prüfen das Ergebnis; keine parallele Preis-Engine aus Excel bauen.
6. Eine optionale JSON-Referenzablage kann `product`, `modules`, `newModuleRequests`, `variants`, `options`, `sources` und die festen Dienstreferenzen enthalten. Für einen reproduzierbaren Ablagehash Objektfelder lexikografisch sortieren, fachliche Reihenfolge ausdrücklich als Daten erhalten, UTF-8 und ein festes Zahlenformat verwenden. Ein solcher Ablagehash **ersetzt niemals den vorhandenen `planHash`**. Dateiversion, SHA-256 der unveränderten XLSX, echte Plan-ID/planHash, Template-/Modulprofil-ID und Revisionen sowie Person/Zeit/Zustimmung werden im **externen Freigabebeleg** gemeinsam festgehalten. Das vermeidet den Selbsthash-Zirkelschluss.
7. Änderungen im vorhandenen Dienst als konkrete Vorschau zeigen. Mikail bestätigt **Module, Optionen und Preise dieses echten Plans vor jeder Neuanlage**. Die API bindet die Bestätigung gemäß vorhandenem Vertrag an Mandant/Shop, Produkt-/Quellrevision, feste Profil-/Template-Revisionen und Zielrevision. Bei inzwischen veränderter Quelle, Profil, Preis oder Zielbindung erneut planen und bestätigen. Ein in Excel getippter Name ersetzt keine authentifizierte Bestätigung.
8. Erst danach die vorhandenen Anlage-/Synchronisierungswege nutzen. Bestehende Produkt-/Varianten-IDs gezielt beibehalten; kein Duplikat, keine ungefragte Löschung. Veröffentlichung ist ein separater bestätigter Schritt. Lauf-ID, Ergebnisbindungen, Prüfbelege und Rückweg in dieselbe Produktakte zurücktragen.

Empfohlener Dateiname je bestätigtem Stand: `Produktfreigabe_<produkt-schluessel>_v<revision>.xlsx`. Frühere freigegebene Dateien bleiben unverändert. Änderungen invalidieren die betroffenen Freigaben und erhalten eine neue Dateiversion. Keine Zugangsschlüssel, Kundenuploads oder Bestelldaten in dieser Referenz speichern.

Designquelle bleibt der [verbindliche Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); diese Vorlage verändert keine Designs und setzt keine neue Gestaltungsvorgabe.
