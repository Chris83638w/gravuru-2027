# Gravuru: mehrere Designs parallel erstellen

Version 1 · 13.10.2026 · Die Anleitung selbst startet keine Agenten und implementiert keine Kontextdatenbank.

Der [erste parallele Durchlauf](test-run-01.json) wurde anschließend auf Nutzerauftrag ausgeführt: drei Designer und ein unabhängiger Prüfer, drei geprüfte Varianten. Weitere Aufträge erhalten neue IDs oder einen eindeutig getrennten neuen Durchlauf; bestehende Ergebnisse nicht überschreiben.

Wir verwenden ein gemeinsames Designrezept, getrennte Aufträge und eigene Arbeitskopien. Product Design gestaltet. Der vorhandene Helfer bereitet die Dateien vor und prüft die unveränderten Teile. Du musst weder JSON schreiben noch Skripte selbst ausführen.

## 1. Einen gemeinsamen Arbeitsbereich verwenden

In **Codex** das bestehende Gravuru-Projekt verwenden; bei einem neuen Projekt das Repository `Chris83638w/gravuru-2027` zuordnen. Die Team-Anleitung liegt im Branch `task/product-design-recipe-20261013` unter `design/product-design/team/`. Nicht einen älteren `main`-Stand als aktuellen Arbeitsstand voraussetzen. Aktuelle Änderungen nicht zurücksetzen.

Alternativ den **Work-Bereich** verwenden, in dem Product Design verfügbar ist. Ein normaler ChatGPT-Chat genügt laut Plugin-Anleitung nicht. Product Design muss in jedem Designer-Chat verfügbar sein; die bloße Erwähnung des Namens installiert es nicht.

Das bereitgestellte private ZIP enthält die Anleitungen, den bestehenden Helfer und die vorhandene Acrylvorlage. Im gemeinsamen Arbeitsbereich bereitstellen. Falls ein neuer Chat einen eigenen Cloud-Arbeitsbereich hat, ihm dasselbe ZIP als Datei mitgeben. Ein Chatname, ein Projektname oder ein Link auf einen privaten Pfad überträgt keine Dateien.

Wenn das Projekt gemeinsame Anweisungen unterstützt, dort den Inhalt aus [GEMEINSAME-REGELN.md](GEMEINSAME-REGELN.md) einfügen. Andernfalls die Datei in jedem Chat zusammen mit dem Rollenauftrag bereitstellen. Ein Agent muss ihre tatsächliche Lesbarkeit bestätigen.

## 2. Diese fünf Chats anlegen

Über „Neuer Chat“ im gewählten Arbeitsbereich anlegen, entsprechend benennen und den passenden kopierfertigen Auftrag aus der Tabelle einfügen:

| Chatname | Aufgabe | Auftrag |
| --- | --- | --- |
| 00 · Design-Koordination | Aufträge und Quellen zuordnen, Ergebnisse sammeln | [00-KOORDINATION.md](00-KOORDINATION.md) |
| 01 · Designer A | Ein eigenes Design bearbeiten | [01-DESIGNER.md](01-DESIGNER.md) + erste Karte aus [STARTAUFTRAEGE.md](STARTAUFTRAEGE.md) |
| 02 · Designer B | Zweites eigenes Design bearbeiten | Dieselbe Designer-Anweisung + zweite Karte |
| 03 · Designer C | Drittes eigenes Design bearbeiten | Dieselbe Designer-Anweisung + dritte Karte |
| 04 · Design-Prüfung | Fertige Ergebnisse unabhängig prüfen | [02-PRUEFUNG.md](02-PRUEFUNG.md) |

Die ersten drei Aufträge sind **Beispiele**, die du so starten oder durch eigene Themen ersetzen kannst. Sie verwenden dieselbe bereits untersuchte Acrylgrundlage. Für Edelstahl, Schiefer und weitere Produktlinien bekommt jeder Auftrag seine eigene überprüfte Familienvorlage; Acrylvorgaben werden nicht übertragen.

Du kannst alle drei Designer-Aufträge nacheinander absenden, ohne jeweils auf das Ergebnis zu warten. Ob die App sie gleichzeitig ausführt, hängt von ihren Limits ab. Getrennte Chats sind nicht automatisch miteinander verbunden: Ohne einen nachweislich gemeinsamen Dateispeicher gibst du die Ergebnis-ZIPs an die Koordination und Prüfung weiter.

Ein koordinierender Agent kann stattdessen Unteragenten starten, wenn du ihn ausdrücklich damit beauftragst und die Umgebung das unterstützt. Dafür optional an seinen Auftrag anhängen: „Starte die drei Designer-Aufträge parallel als Unteragenten. Prüfe zuerst, dass jeder Product Design und seine Quelldateien verwenden kann. Sammle die Ergebnisse und übergib sie zur unabhängigen Prüfung.“ Keine parallelen Designer zusätzlich starten, wenn dieselben Aufträge schon in eigenen Chats laufen.

## 3. So beginnt jeder Designer

Der Agent prüft Plugin, Rezept und Originalquelle, legt eine private Arbeitskopie unter seiner Auftrags-ID an und arbeitet ausschließlich dort. Er verwendet die bestehenden Dateien. Im Startpaket liegt die Vorlage unter `private/references/acryl-18/source.svg`.

Ausgegeben werden eine bearbeitbare SVG, Vorschau, Ressourcen, kurzer Änderungsnachweis und Prüfstatus. Kein Screenshot als Ersatz für eine bearbeitbare Datei. Formwechsel müssen sichtbar neu geprüft werden; der vorhandene Helfer passt Layouts nicht automatisch an.

## 4. So bekommst du mehrere fertige Designs

Der Prüfer erhält für jede Auftrags-ID das Ergebnis-ZIP und die dazugehörige Auftragskarte. Er prüft Originaltreue, gewünschte Änderungen, Maße, Texte, Fotofelder, Schriftzeichen und Darstellung. Die Koordination fasst zusammen: „geprüft“, „Korrektur nötig“ oder „blockiert“.

Du wählst anhand der Vorschauen. Eine technische Prüfung ist weder eine gestalterische Abnahme durch dich noch eine Import- oder Fertigungsfreigabe. Der spätere Werkstattimport bleibt ein eigener Auftrag.

## 5. Dauerhaften Kontext danach ergänzen

Für einen zusätzlichen Entwicklungsagenten ist [03-KONTEXTSPEICHER.md](03-KONTEXTSPEICHER.md) vorbereitet. Er erweitert das vorhandene Rezept um Speicherung und gezielten Kontextabruf. Dieser Auftrag ist **optional und noch nicht gestartet**. Die ersten parallelen Designaufträge können bereits mit den festen Dateien arbeiten.

Bis zur Datenbank schreibt ausschließlich die Koordination das gemeinsame Auftragsregister. Designer und Prüfer liefern eigene Ergebnisdateien. So überschreiben mehrere Chats nicht dieselbe Liste. Eine neue Regel wird nur mit belegter Nutzerbestätigung verbindlich.

## Modelle

Für die Designer zunächst das normale Modell verwenden, mit dem Product Design in deiner Umgebung funktioniert. Für die unabhängige Prüfung ein stärkeres Modell mit Bild- und Dateiverständnis wählen. Ein kleineres Modell kann später einfache Text-/Farbvarianten übernehmen, wenn es dieselben Prüfungen zuverlässig besteht. Es gibt noch keinen Vergleichstest, der ein bestimmtes kleines Modell für alle Gravuru-Aufträge freigibt. Die Verfügbarkeit der Werkzeuge ist ebenso wichtig wie das Modell.

## Grenzen des Startpakets

Das Paket enthält eine vorhandene bearbeitbare Rekonstruktion von Muster 18 und deren Vorschau, nicht alle ungefähr 18 damaligen Muster. Die dokumentierten Abweichungen zum ursprünglichen Produktmockup bleiben bestehen. Schriften liegen als Werkstatt-Glyphdaten vor, nicht als installierbare TTF/OTF. Ein Browser-Fallbackfont darf nicht als richtige Vorschau ausgegeben werden. Der Agent muss den vorhandenen Werkstatt-Renderer oder eine geprüfte Darstellung mit den vorhandenen Glyphen verwenden.

Der gemeinsame Kontext ist derzeit dateibasiert. Eine automatische Synchronisation zwischen Codex, ChatGPT und Claude oder ein globaler Plugin-Speicher wird damit nicht eingerichtet. Private Originale und Ergebnisse bleiben außerhalb Git; die allgemeinen Anweisungen und Werkzeuge können aus GitHub geladen werden.
