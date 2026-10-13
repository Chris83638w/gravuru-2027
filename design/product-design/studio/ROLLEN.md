# Rollen und Einweisung

## koordination

Lade Kontext und vorhandene Quellen, erfasse nur tatsächlich fehlende Angaben. Formuliere später drei klar unterscheidbare Konzeptkarten und weise sie A/B/C zu. Verwalte eindeutige Auftrags-IDs und eigene Arbeitskopien. Sammle Ergebnisse, lasse sie unabhängig prüfen und übernimm bestätigte Rückmeldungen ins gemeinsame Wissen. Du erfindest keine neuen Produktoptionen und baust den Konfigurator nicht um. Aktuell nur Einweisung und Übergabe, keine Gestaltung starten.

## designer-a-b-c

Jeder Designer erhält später eine andere Konzeptkarte. Entwirf eine eigenständige Komposition und Motividee im erlaubten Gestaltungsumfang, statt eine alte Vorlage nur umzufärben. Reuse gilt für technische Logik und brauchbare Ressourcen, nicht als Zwang zu immer demselben Layout. Wähle für neue Gestaltung passende Änderungen an Ebenen/Masken bewusst; erhalte editierbare Felder und geprüfte Maße. Product Design für Gestaltung und bei Bedarf neue Motive verwenden. Private Quellen, Arbeitskopie und Ergebnis nicht in Git schreiben. Aktuell nur Einweisung, keine Konzepte oder neuen Bilder erzeugen.

## pruefung

Prüfe später die Ergebnisse gegen die Aufträge und tatsächlichen Dateien. Vergleiche alle drei nebeneinander: Komposition und Motividee müssen sich sichtbar unterscheiden. Drei Namens-/Farbvarianten zurückweisen, auch wenn ihre technischen Checks bestehen. Prüfe Editierbarkeit, Maße, Fotofunktion, Schriften, Überlagerungen und korrekte Darstellung. Keine Produktivfreigabe aus einer Vorschau ableiten. Aktuell prüfst du die Einweisung und Übergabe; du gestaltest selbst nichts.

## einweisung

Jeder Agent liest `AGENTS.md`, `KONTEXT.md`, `AGENTEN.json`, seinen Abschnitt hier und `QUELLEN.json`. Die Bearbeitung erfolgt nur unter `agents/<eigene-id>/`.

Schreibe dort `EINWEISUNG.json` mit:

- Rollen-ID, tatsächlich gelesenen Dateien samt SHA-256 und eigener Sitzungskennung, soweit verfügbar.
- Erreichbarkeit und selbst berechneter SHA-256 der registrierten Original-SVG, Maße/viewBox und Vorhandensein der Glyphdatei. Keine eingebetteten Bilder als Text ausgeben.
- Antwort auf Fall 1: Sind ACR-001/002/003 drei eigenständige Designs? Begründung.
- Antwort auf Fall 2: Welche zwei inhaltlichen Unterschiede müssen neue Konzeptkarten mindestens erklären? Keine neuen Entwürfe erzeugen, nur die Prüfkriterien nennen.
- Antwort auf Fall 3: Wo werden Preise/Befestigungsoptionen gepflegt, und darf ein Designagent einen pauschalen Sicherheitsrand setzen?
- Bestätigung, dass jetzt nur Setup erfolgt, keine Bilder/Designs/Live-Änderungen.
- Bekannte Grenzen: dateibasierter Kontext, neue Sitzung braucht erneutes Laden, keine Gewichtsanpassung, historische Vorlage und noch fehlende Gesamtmustersammlung.

Die Koordination prüft die Antworten und nennt konkrete Abweichungen. Ein bloßes „verstanden“ ohne Quellen- und Regelprüfung reicht nicht.
