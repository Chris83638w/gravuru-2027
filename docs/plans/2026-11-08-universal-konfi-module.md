# Ein Konfi, wiederverwendbare Module und bestätigte Produktgruppen-Vorlagen

Stand 08.11.2026, Mika/Codex. Fachliche Grundlage: Mikails aktuelle Nachricht zu Gedenktafeln mit/ohne Foto, Türschildern mit/ohne Logo, Funkklingelschildern und UV-Druck sowie die bereits bestätigten Regeln in [PRIO-KONFI.md](../../PRIO-KONFI.md). Diese Datei beschreibt den vereinbarten Zielaufbau und einen Code-Audit, keine bereits veröffentlichte Modulverwaltung. Bestehende Designs folgen unverändert dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Verbindliches Ziel

Ein gemeinsamer freigegebener Editor auf Handy und PC. Neue Angebote aus vorhandenen Modulen benötigen Einstellungen und Produktdaten, keinen neuen Editor-Fork und keine kopierten Kundenoberflächen. Im Backend heißen die wiederverwendbaren Zusammenstellungen „Konfi-Vorlagen“ bzw. „Produktgruppen-Vorlagen“. Ein Shopify-Konnektor verbindet alle geeigneten Vorlagen mit dem Shop; einzelne Konnektoren pro Produktgruppe sind nicht erforderlich.

Modulbibliothek: Text/Schriften, Motive, Foto, Logo, Farbe sowie Ausführungen. Ausführungen verwenden wiederverwendbare Auswahlfelder für Material, Form, Größe, Befestigung und Zubehör, einschließlich bestätigter Füße, Sockel, Wandhalterungen und LED-Optionen. Es gelten ausschließlich ausdrücklich bestätigte Möglichkeiten und Preise; die vom Nutzer genannten Beispiele sind keine vollständigen Produktregeln.

Eine Vorlage referenziert Modulfreigaben und Einstellungen, Designgruppe und Startdesign, Schrift-/Motiv-/Farbprofile, Material-/Formressourcen, gültige Ausführungen mit Preisen sowie das passende Fertigungsverfahren. Ein Angebot verweist auf diese Vorlage und das Design seines Hauptproduktbilds. Ressourcen bleiben gemeinsam gespeichert; Varianten- und Vorschaubilder sind keine neuen Konfiguratoren.

## So soll die Verwaltung funktionieren

1. Produktgruppe und passende bestehende Konfi-Vorlage wählen oder deren Einstellungen als neue Vorlage übernehmen.
2. Module gezielt einschalten oder ausschalten. Foto und Logo sind unabhängig; zulässige Dateitypen und Aufpreise gehören zum Modulprofil.
3. Designgruppe, Startdesign, erlaubte Materialien/Formen/Größen und sämtliche Befestigungen/Zubehör aus den bestehenden Quellen zuordnen.
4. Vollständige Möglichkeiten, Preise und betroffene Angebote anzeigen. Vor jeder Neuanlage muss Mikail den konkreten Stand bestätigen. Änderungen nach der Bestätigung machen diese für den veränderten Plan ungültig.
5. Kundenansicht prüfen und bewusst mit Shopify synchronisieren. Ein erneuter Lauf aktualisiert dieselben Angebotsbindungen und erzeugt keine Duplikate.

Speichern allein veröffentlicht nicht. Alte Bestellungen behalten ihre unveränderlichen Design-, Modul-, Ressourcen- und Preisstände. Entwürfe und neue veröffentlichte Revisionen bleiben getrennt.

## Wichtige Unterscheidungen

- „Design ohne Foto“ ist eine Eigenschaft der Vorlage. „Foto-Upload ausgeschaltet“ ist eine Produktregel. Die beiden dürfen nicht verwechselt werden; bestehende Ohne-Foto-Designs dürfen bislang teilweise zusätzliche bezahlte Fotos erhalten.
- Ein Vorlagenmotiv bleibt Teil des Designs, auch wenn das Hinzufügen weiterer Motive ausgeschaltet wird. Bestehende Gestaltungen nicht still verändern oder Elemente entfernen.
- Ein ausgeschaltetes Modul wird nicht angeboten, darf keine neuen Uploads annehmen und erzeugt keinen neuen Aufpreis. Das muss auch auf dem Server gelten, nicht nur durch Ausblenden eines Reiters.
- Passt ein Design nicht zu den gewählten Modulen oder dem Verfahren, muss die Verwaltung den Konflikt vor der Freigabe zeigen, statt den Entwurf unbemerkt umzubauen.
- UV-Druck braucht neben der Farbwahl ein passendes Druck-/Fertigungsprofil. Eine Farbpalette allein macht eine Gravurvorlage noch nicht produktionsfähig für UV-Druck.
- Eine neue Befestigungsoption innerhalb vorhandener Auswahlbausteine ist eine Datenänderung. Eine wirklich neue Bearbeitungsfunktion benötigt einmalig Entwicklung als wiederverwendbares Modul; sie darf anschließend von vielen Vorlagen genutzt werden.

## Tatsächlich vorhandene Grundlagen und Lücken

Read-only geprüft in `work/steel-product-entry-20261108`, `work/steel-pricing-input-fix-20261108` und dem getrennten `work/konfi-sync-20261106`; keine Live-Verwaltung oder Serververöffentlichung in dieser Prüfung.

| Baustein | Belegt im Code | Noch zu vereinheitlichen |
| --- | --- | --- |
| Foto / Logo | `variant-m/ux.mjs` und `contract.mjs`: Sichtbarkeit, Prüfung und Preis | SVG-Regeln hängen noch ausdrücklich an Edelstahlgravur und 12,99 €; Freigaben müssen aus bestätigtem Profil kommen, ohne Sicherheitsprüfungen zu umgehen |
| Text / Motive | `element-rights.mjs`: Hinzufügerechte, Elementrechte und Serverprüfung | Gemeinsame Modulschalter und passende Reitersichtbarkeit; Text/Motive stehen teilweise fest in der Navigation |
| Bibliotheken | `workshop/profile-library.mjs`, `product-profile-assignments.mjs`: Schriften, Motive, Farben, Bestseller; Vererben/leere Auswahl/Überschreiben | Diese Bibliothek ist noch kein vollständiger Foto-/Logo-/Ausführungs-Moduleditor |
| Verfahren / Farbe | `workshop/process-profiles.mjs`: Druckfarben und monochrome Gravur, Serverprüfung | Vorhandene Verfahren sind feste geprüfte Profile; nicht beliebig durch einen unbestätigten Schalter erweitern |
| Produktoptionen | `workshop/katalog-family-formats.mjs`: datenbasierte Optionsgruppen | Fest codierte Familienregeln wie Fotoverbot und Logo-Zuordnung in bestätigte Produktprofile überführen |
| Sockel / Wand | `variant-m/acrylic-product.mjs`: Größen, Sockel, Wandhalterung und Preise | Feste IDs/Listen und Spezialmodell; LED und beliebige weitere Füße noch nicht universell angebunden |
| Anlagebestätigung | `workshop/product-group-templates.mjs` im Sync-Arbeitszweig: bestätigte konkrete Anlagepläne, Konflikte und Wiederholbarkeit | Modulfreigaben und die gemeinsame Runtime durchgehend an denselben Plan anschließen |
| Design-Synchronisierung | `workshop/gallery-shop-sync-native.mjs` im Sync-Arbeitszweig: Design-/Ressourcenzuordnung, Konflikt bei nicht erlaubten Fotos | Mit neuer Profilrevision verbinden; vorhandenen Sync nicht parallel neu bauen |

## Nächstes abgegrenztes Paket und Abnahme

Zuerst „Edelstahl-Türschild mit Logo“ und „Edelstahl-Türschild ohne Logo“ als zwei Profile **desselben** Editors in einer getrennten Testumgebung nachweisen. Der aktuell veröffentlichte Konfi-Aufbau bleibt dabei unverändert. Keine neuen Live-Angebote oder Produktoptionen aus dieser Planungsnachricht ableiten.

Abnahme: identischer Editor-Code; Logo ein/aus ausschließlich aus gespeicherten Produktdaten; ausgeschalteter Upload serverseitig abgewiesen; Preis, Kundenansicht und Shopify verwenden dieselbe bestätigte Profilrevision; kein neues Produkt beim erneuten Synchronisieren; vorhandene Originaldesigns und alte Bestellungen bleiben erhalten. Der bereits bestätigte Logo-Aufpreis 12,99 € gilt für den bestehenden Edelstahl-Piloten, nicht automatisch für andere Gruppen.

Danach Foto-Profile für Gedenktafeln, bestätigte Funkklingel-Ausführungen und UV-/Acryl-/LED-Profile schrittweise mit derselben Strecke abnehmen. Aktivierte Module laden ihre nötigen Ressourcen nach; ausgeschaltete Module sollen keine unnötigen Bibliotheken laden. Konkrete Modul- und Optionsfreigaben je Gruppe bleiben vor Anlage erforderlich.

Diese Runde ändert ausschließlich Dokumentation. Keine Runtime-, Layout-, Shopify-, Preis- oder Designänderung.
