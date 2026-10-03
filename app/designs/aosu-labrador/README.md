# Labrador – bearbeitbare Variante-M-Vorlage

Status: lokale Konfiguratorvorschau, nicht auf Shopify veröffentlicht.

**Aktualisierung zur gemeinsamen Arbeitsgrundlage:** [Portable Einrichtung und Start](SETUP.md). Runtimebibliotheken und drei benötigte Bilder liegen jetzt im Repository. Der Start liest vorhandene Gestaltungsressourcen und benötigt weder das Vollarchiv noch fontTools. Die folgenden ursprünglichen Builder-Hinweise beschreiben den vorherigen Testaufbau; maßgeblich für den aktuellen Start ist SETUP.md. [Ressourcenliste](RESOURCE-INVENTORY.csv), [Rechte und Grenzen](RIGHTS-AND-DEPENDENCIES.md), [getrennte Werkstattquellen](../../continuation/werkstatt-source-20260923/README.md).

Für Codex und künftige Automatisierung: [vollständiger Workflow und Übergabe](../../PROJECT/KONFIGURATOR-DESIGN-WORKFLOW.md).

Nächster abgestimmter Einstieg: [ausführlicher KI-Arbeitsauftrag für unseren Builder](../../PROJECT/BUILDER-ARBEITSAUFTRAG-CODEX.md). Zuerst analysieren und Fragen klären, noch keine pauschale Umsetzung oder Veröffentlichung.

Referenz: review/aosu-upgrade-2026-09-21, Commit 4f9db01e679c37a97d05ccc379cd92369df8630d.
Die Referenzdateien bleiben unverändert. Eigener Arbeitsbranch: design/aosu-labrador-2026-09-23.

## Gestaltung

- AOSU Pro V8P1AX11, 160 × 280 mm; technisches Bohrbild aus profile-source.json.
- Edelstahl 1,5 mm, schwarzes Acryl 3 mm, umlaufender 10-mm-Rahmen als Vorauswahl.
- Ausgefüllter Labrador, Familie, Müller, 22 als vier einzeln bearbeitbare Elemente.
- Echte Michroma-Konturen einschließlich Umlauten; Text bleibt editierbar.
- Rahmen, Materialfarbe und Befestigungsoptionen bleiben wählbar.
- Die Klingel ist eine feste Modellreferenz und nicht Teil der Lieferung.

## Dateien

design.json: native Designobjekte, keine abgeflachte Grafik.
motif.json und assets/labrador-solid.svg: gefüllte Außenkontur aus bestehendem Gravuru-Motiv Labrador_04; Herkunftsschlüssel im JSON.
assets/michroma-vectors.json.gz: komprimierte Laufzeitkonturen. Unkomprimiertes JSON dient der Prüfung.
assets/Michroma-Regular.ttf und Michroma-OFL.txt: Schriftquelle und Lizenz.
Schriftquelle: https://github.com/google/fonts/tree/main/ofl/michroma

build-preview.py baut ausschließlich eine lokale Prüfkopie der Variante M. .preview ist vom Git-Stand ausgeschlossen. Die dort verwendeten bestehenden Bibliotheken werden gezielt aus dem unveränderten Vollarchiv gelesen. Für den Builder wird fontTools benötigt; dessen lokaler Werkstattpfad ist im Script angegeben.

## Browserprüfung am 23.09.2026

Bestanden: Initialvorlage, Michroma-Umlaut, Text ändern und zurücksetzen, Schriftgröße 12 → 13 → 12 mm, Labrador verschieben, vergrößern und löschen, ausgeschaltete Hilfslinien. Der Kaufbutton ist in dieser lokalen Vorschau deaktiviert.

## Noch offen vor Veröffentlichung

Eigenes Shopify-Produkt mit SEO und passenden Medien anlegen, eigene Produkt-/Variantenkennungen zuordnen; bestehende AOSU-IDs nicht für dieses neue Produkt übernehmen. Vorlagenpaket in den produktbezogenen Katalog einbinden und Entwurf-Speichern/-Laden, Fertigungsexport und Warenkorb dort prüfen. Die bestehende vollständige Bibliotheksladeweise wurde durch diesen Designauftrag nicht umgebaut; PageSpeed ist nicht als bestanden erklärt.
