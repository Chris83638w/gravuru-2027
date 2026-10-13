# Varianten erstellen, ohne die Grundlage neu zu bauen

Für den Nutzer genügt der kurze Auftrag aus [START.md](START.md). Die folgenden Befehle führt der Assistent aus. Python 3 genügt; der Helfer benötigt keine zusätzlichen Pakete, API-Zugänge oder laufende Werkstatt.

## Bestehende Vorlage weiterverwenden

Quelle privat aus dem in [references.json](references.json) registrierten Archiv bereitstellen. Den tatsächlichen Pfad übergeben; private Fotos und Arbeitskopien nicht ins Repository legen.

```bash
python3 scripts/product-design-session.py start \
  --source /privater/pfad/Pia-und-Rafael-150x200-editierbar.svg \
  --out /privater/pfad/designs/hochzeit-01 \
  --request 'Nur die Namen in Anna & Ben ändern. Alles andere beibehalten.' \
  --change-layer layer-6
```

Der neue Ordner enthält:

- `BRIEF.md`: kurzer Auftrag mit Maßen, Ebenen und erlaubten Änderungen.
- `source.svg`: unverändertes Original; nicht erneut vollständig in den Modellkontext laden.
- `design.svg`: bearbeitbare Arbeitskopie mit kurzen Bildverweisen.
- `assets/`: Foto und Motivbilder, nach Prüfsumme benannt und unverändert wiederverwendet.
- `contour.svg`: maßhaltige **Referenz für die Produktform**, getrennt von der Fotomaske und der Druckgrafik.
- `job.json`: Referenzstand und konkreter Änderungsumfang; kein Modelltraining.

Product Design bearbeitet die Arbeitskopie. Bei Bildänderungen die zugehörige Ebene zusätzlich mit `--change-image` freigeben. Neue Motivebenen brauchen `--allow-new-layers`. Eine neue Maske benötigt die ausdrücklich freigegebene `defs`-Ebene. Reihenfolge und bestehende Kundenfelder bleiben geschützt. Für größere strukturelle Änderungen ein neues geprüftes Rezept registrieren, statt Schutzprüfungen zu umgehen.

## Andere Form oder Größe

Zum Startbefehl beispielsweise `--shape circle --width-mm 200 --height-mm 200` hinzufügen. Unterstützte Konturreferenzen: `rectangle`, `rounded-rectangle` (mit `--radius-mm`), `circle`, `ellipse`, `arch`.

Der Helfer ändert die Zeichenfläche und stellt die Kontur bereit. **Er gestaltet die Elemente nicht automatisch neu, verzerrt keine Bilder und beschneidet nichts still.** Product Design passt die freigegebenen Ebenen an. Eine neue Produktform ist keine automatische Freigabe einer neuen Fotomaske oder eines neuen Importschemas.

## Prüfen

```bash
python3 scripts/product-design-session.py check /privater/pfad/designs/hochzeit-01
```

Der Check kontrolliert Original, physische Maße/viewBox, Konturreferenz, Ebenenreihenfolge, unveränderte Ebenen/Bilder, getrennte Kundenfelder und bekannte Schriftzuordnung. Eine geänderte Bilddatei unter altem Namen oder eine Änderung außerhalb des Auftrags wird abgewiesen.

Er erzeugt eine eigenständige SVG mit wieder eingebetteten Originalbildern und einen Bericht in `checked-<Prüfsumme>/`. Wiederholte Prüfung derselben Ausgabe ist möglich. Alte Prüfergebnisse bleiben erhalten. SVGs mit Skripten, externen Bildern, relativen Ausbrüchen oder ungeprüften Stilen werden abgewiesen.

**Getrennt offen:** visuelle Qualität, tatsächliche Textausdehnung/Überlappungen, Platzierung innerhalb einer freien Kontur, Importkompatibilität und Fertigungsfreigabe. Ein `PASS` bestätigt nur die im Bericht aufgezählten technischen Prüfungen. Der bestehende Importer bleibt für Einpassung, Ressourcenübernahme und Konfiguratorrechte zuständig. Es erfolgt weder Upload noch Veröffentlichung.

## Dauerhafter Kontext

`AGENTS.md` verweist auf `START.md`, damit neue Aufgaben in diesem Repository direkt mit den Regeln beginnen. `user-context.md` ist zusätzlich eine kompakte Kontextvorlage im Format des Product-Design-Plugins.

Der globale Speicher `$CODEX_HOME/state/plugins/product-design/` ist in der Cloud vom 13.10.2026 nicht beschreibbar. Dort wurde nichts gespeichert. In einem anderen Chat ohne dieses Repository muss das Rezept verfügbar gemacht werden. Keine versteckte Erinnerung, Gewichtsanpassung oder automatische Installation des Plugins wird behauptet.

## Referenztreue

Muster 18 ist eine konkret vorhandene **bearbeitbare historische Rekonstruktion**. Das damalige Produktmockup und diese Datei unterscheiden sich bei Foto, Namensschrift und Zweig. Das Rezept erfindet keine fehlenden Originalebenen. Die Registrierung dokumentiert Quelle und Prüfsummen. Weitere bestätigte Vorlagen können später einzeln ergänzt werden.
