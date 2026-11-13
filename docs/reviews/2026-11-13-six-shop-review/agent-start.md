> Zentraler Auftrag: [GitHub-Issue #238](https://github.com/Chris83638w/gravuru-2027/issues/238). Stand: 13.11.2026. Neuere Kommentare im Issue vor Arbeitsbeginn prüfen.

# Auftrag: Neue Produkte und Designs für Gravuru

## Ziel

Du übernimmst als eigener KI-Agent die Entwicklung neuer Gravuru-Produkte und neuer Designs bis zur vollständigen, sichtbaren Freigabevorlage. Liefere konkrete Dateien und geprüfte Ergebnisse. Arbeite selbstständig, kommuniziere kurz auf Deutsch und frage bereits entschiedene Punkte nicht erneut ab.

Dieser Auftrag richtet einen eigenen Arbeitsbereich ein. Die konkreten neuen Produkte, Materialien, Größen oder Designserien werden je Teilauftrag festgelegt; erfinde keinen Produktumfang. Der laufende Abschluss der sieben Türschild-Produkte in #230 bleibt bei Astra und Claude.

## Verbindlicher Einstieg

1. Lies dieses Issue einschließlich der neuesten Kommentare.
2. Lies im [Projekt gravuru-2027](https://github.com/Chris83638w/gravuru-2027) die jüngste passende Übergabe in `docs/handoffs/`, den aktuellen `STATUS.md`, `AGENTS.md`, `ENTSCHEIDUNGEN.md`, `START_HERE.md` und das betreffende Paket in `UMSETZUNGSPAKETE.md`.
3. Für jedes Design gilt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Lies auch die passenden Materialreferenzen und Original-Produktakten. Katalogdaten gehören in das Katalog-Repository.
4. Prüfe tatsächlichen Branch, Commit und Freigaben. Ein alter Bericht oder eine lokale Arbeitskopie beweist keinen installierten oder freigegebenen Stand.
5. Stimme Überschneidungen mit Astra/Claude direkt über die GitHub-Issues ab. Einstieg: [#168](https://github.com/Chris83638w/gravuru-2027/issues/168), [#230](https://github.com/Chris83638w/gravuru-2027/issues/230), [#233](https://github.com/Chris83638w/gravuru-2027/issues/233). Keine parallelen Änderungen an denselben Produkten oder Dateien.

## Arbeitsbereich

Arbeite in einem eigenen Ordner **Neue-Produkte-und-Designs** und pro Teilauftrag auf einem eigenen Aufgabenbranch, beispielsweise `dev/produkt-<thema>-<datum>`. Ein konkreter Teilauftrag bekommt ein eigenes Unterverzeichnis:

```text
Neue-Produkte-und-Designs/
  START.md
  AUFTRAG-VORLAGE.md
  auftraege/<datum>-<thema>/
    auftrag.md
    quellen/
    entwuerfe/
    freigabe/
    import/
    pruefung/
    UEBERGABE.md
```

Originale unverändert aufbewahren. Bestehende fremde Änderungen nicht zurücksetzen. Keine Zugangsdaten, Kunden-/Bestelldaten oder lokalen Datenbanken ins Repository aufnehmen.

## Ablauf für neue Produkte

- Erstelle zuerst eine vollständige Produktübersicht aus den Originaldateien, Excel-Akten und bestätigten Entscheidungen: Material, Stärke, Maße, Kontur, Bohrungen, Befestigungen/Zubehör, Farben, Gestaltungsmöglichkeiten, Foto-/Logo-Upload, Grundpreise und Aufpreise.
- Dokumentiere Herkunft und Version der Angaben. Maße in mm, Geldwerte in ganzen Cent. Steuerbehandlung, Motivkosten, Mengenrabatte und Zubehör nicht von anderen Produkten übernehmen, wenn dafür keine gültige Vorgabe besteht.
- Kläre tatsächlich fehlende Produktentscheidungen gesammelt. Keine Eigenschaften, Produktionsverfahren, Lieferzeiten oder Materialqualitäten erfinden.
- Bereite das gesamte Produktpaket vor: Hauptbilder, vollständige Verkaufstexte, SEO-Titel/-Beschreibung, Handle, Bild-Alttexte, Variantenmatrix, Konfigurator-/Katalogzuordnung und reproduzierbaren Importplan.
- Bestehende Produkt- und Varianten-IDs sowie bestätigte Preise erhalten. Produktanlage und Änderungen nur per Skript, API oder Import. Innerhalb einer erteilten Schreibfreigabe zunächst ausschließlich als **DRAFT** anlegen.
- Preis, Geometrie, Vorschau und Produktionsdaten müssen denselben versionierten Produktstand verwenden. Keine zweite, abweichende Fachlogik für den Import bauen.

## Ablauf für neue Designs

- **Motiv** bedeutet einzelnes Gestaltungselement; **Design** bedeutet gesamte Gestaltung einer Platte.
- Passende Katalogvorlagen nach Design-Master übernehmen: bei passender Größe 1:1, andernfalls als starke Referenz. Freigegebene Schriften verwenden und innerhalb einer Serie variieren. Ein vorhandenes Motiv nicht verlieren, verzerren oder ungefragt austauschen.
- Material, Kontur und Größen getrennt behandeln. Originale Materialreferenzen und bestätigte Geometrie bewahren. Nicht automatisch jede Gestaltung zentrieren.
- **Zuerst eindeutig bezeichnete PNG/JPG-Entwürfe zeigen. Erst nach Bildfreigabe die endgültigen SVG-/Katalogdaten erstellen.** Die abschließende Designabnahme erfolgt mit Ansichten 1:1 aus dem echten Konfigurator und der Vorlage daneben.
- Shop-Hauptbild, Konfigurator-Startdesign und einzelne Designvorlagen sind drei getrennte Entscheidungen. Eine Freigabe für ein Hauptbild ändert keine Konfiguratorvorlage.
- Produktionsdateien von Szenen, Schatten, Bediengriffen und Vorschauhilfen trennen. Keine Fertigungsreife behaupten, solange die nötigen Prüfungen fehlen.

## Prüfungen und Freigabe

Prüfe passend zum Teilauftrag:
- Vollständigkeit und Zuordnung der Produkt-/Varianten-/Design-IDs; nach Schreibzugriffen vollständiges Zurücklesen und Soll-Ist-Vergleich.
- Originalmaße, Konturen, Bohrungen, Material, Schriften und Motive.
- Darstellung und Bedienung auf PC und Handy.
- Variantenwahl, Grund-/Aufpreise, Mengenrabatte und erlaubte Uploads.
- Tatsächlichen Konfigurator- und Warenkorbweg, soweit der Produktstatus ihn zulässt.

Unterscheide lokale Tests, Simulationen, echte Host-/Shoptests und offene Sperren. Ein DRAFT-bedingt abgelehnter Warenkorb ist kein bestandener Kaufweg. Keine Veröffentlichung als eigenmächtigen Testumweg und keine Testbestellung ohne ausdrücklichen Auftrag.

Zeige dem Nutzer **ein zusammenhängendes Freigabepaket**: alle Bilder mit eindeutigen IDs, vollständige Texte, Preise/Optionen, Prüfergebnisse und verbleibende offene Punkte. Der Nutzer soll genau erkennen, was er freigibt.

**Nur der Nutzer erteilt die Freigabe. Kein Publish/ACTIVE, kein Merge und keine produktive Umschaltung ohne ausdrücklich passende Zustimmung. Bereits erteilte Freigaben gelten innerhalb ihres konkreten Umfangs weiter.**

## Abschluss jedes Teilauftrags

- Ergebnisse mit Quellen, Prüfsummen und Versionsstand auf dem Aufgabenbranch sichern.
- `STATUS.md` und eine Übergabe unter `docs/handoffs/<datum>-<thema>.md` aktualisieren.
- Im zugehörigen Issue kurz dokumentieren: fertig/offen, Commit/PR, ausgeführte Prüfungen, Freigabestatus und genau nächster Schritt.
- Claude/Astra direkt den konkreten GitHub-Link übergeben. Dem Nutzer ebenfalls direkte Links und sichtbare Ergebnisse liefern.

## Erster Schritt des neuen Agenten

Lies die genannten Quellen und melde das klar abgegrenzte erste Arbeitspaket. Wenn noch kein konkretes Produkt oder Design beauftragt ist, frage einmal gesammelt nach Produkt/Serie, vorhandenen Quellen und gewünschtem Umfang. Danach mit Quellenprüfung und Entwürfen beginnen – keine neue Komplettplanung des Gesamtprojekts.
