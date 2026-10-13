# Kopierauftrag: Designer A, B oder C

Den folgenden Text einfügen und genau **eine** Auftragskarte aus `STARTAUFTRAEGE.md` oder einen eigenen konkreten Auftrag anhängen.

```text
Nutze Product Design für genau den unten angehängten Gravuru-Designauftrag.
Lies GEMEINSAME-REGELN.md und design/product-design/START.md. Verwende die
angegebene bestehende Vorlage. Lade keine komplette Projektgeschichte.

Prüfe zuerst, ob Product Design, die bearbeitbare Originaldatei und die
benötigten Ressourcen erreichbar sind. Falls etwas fehlt: den konkreten
fehlenden Zugriff nennen, keinen funktionslosen Ersatz als fertig ausgeben.

Arbeite in einem eigenen privaten Ordner mit der Auftrags-ID. Das Original,
gemeinsame Regeln und andere Aufträge bleiben unverändert. Nutze den vorhandenen
scripts/product-design-session.py für Arbeitskopie und Prüfungen, sofern die
Vorlage dort registriert ist. Ergänze keinen zweiten Generator.

Beachte die freigegebenen Ebenen aus meiner Auftragskarte. Neue Fotodateien,
neue Ebenen, Maskenänderungen und Größen-/Formwechsel benötigen den passenden
Änderungsumfang; nicht einfach Prüfungen abschalten. Formwechsel erfordern
bewusste Layoutanpassung und eine neue sichtbare Prüfung.

Setze das Design um. Verwende Product Design, falls ein neues Bildmotiv
beauftragt ist; keine eigenen Generierungs-API-Aufrufe. Bei bloßen Text- oder
Farbvarianten verwende die bestehenden Bilddateien unverändert.

Prüfe technisch und betrachte die gerenderte Vorschau. Benutze die richtige
Werkstatt-Schriftdarstellung, keine unbemerkten Ersatzfonts. Nenne Grenzen
des vorhandenen Prüfwerkzeugs und noch nicht erfolgte Prüfungen.

Liefere ein Ergebnis-ZIP mit der vollständigen Arbeitskopie (source.svg,
design.svg, assets/, contour.svg, BRIEF.md, job.json), dem unveränderten
technischen Prüfbericht samt geprüfter SVG, einer Vorschau und ERGEBNIS.md.
ERGEBNIS.md nennt Auftrags-ID, Referenz, Maße, geänderte Ebenen, Prüfsummen,
sichtbare Prüfung und offene Punkte. Ergebnisstatus zunächst zur_pruefung.
Keine Werkstattübernahme, Veröffentlichung oder Fertigungsfreigabe behaupten.

Meine Auftragskarte folgt:
```

## Befehle für den ausführenden Agenten

Aus dem entpackten Paket oder passenden Repository-Verzeichnis ausführen. Den privaten Ausgabeort an den tatsächlichen Arbeitsbereich anpassen. Dieser konkrete Befehl gilt ausschließlich für die erste Beispielkarte ACR-001.

```bash
python3 scripts/product-design-session.py start \
  --reference acryl-18 \
  --source private/references/acryl-18/source.svg \
  --out /workspace/gravuru-designjobs/ACR-001 \
  --request 'Nur die Namen in Anna & Ben ändern. Alle anderen Elemente und Bilder erhalten.' \
  --change-layer layer-6

python3 scripts/product-design-session.py check /workspace/gravuru-designjobs/ACR-001
```

Zwischen `start` und `check` liegt die tatsächliche Gestaltung der Arbeitskopie. Der Helfer schreibt keine gewünschten Namen selbst. ACR-002/003 brauchen die Ebenenfreigaben aus ihren eigenen Karten und andere Ausgabeordner. Einen vorhandenen Auftragsordner nicht überschreiben: dessen Status prüfen und fortsetzen oder für einen neuen Auftrag eine neue ID verwenden.
