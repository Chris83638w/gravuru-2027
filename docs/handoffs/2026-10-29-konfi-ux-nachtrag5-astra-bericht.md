# Nachtrag 5 – Zoom vereinfachen

Stand: Codex / Astra, 29.10.2026. Änderung auf [PR #43](https://github.com/Chris83638w/gravuru-2027/pull/43), Branch `dev/konfi-zoom-fokus-20261028-astra`, ausgehend von `b5243df48`. Auftrag: [Nachtrag 5](https://github.com/Chris83638w/gravuru-2027/blob/dev/konfi-ux-nachtrag-20261028-claude/docs/handoffs/2026-10-29-konfi-ux-nachtrag5-astra.md). Keine Veröffentlichung, kein Merge, keine Live-Aktion.

## Ergebnis

- Handy: Antippen, Textfeldfokus und Doppeltippen verändern den Zoom nicht. Keine Fokus-Pille. Doppeltippen auf Text wird für die vorhandene Textbearbeitung durchgelassen. Vergrößern ausschließlich mit zwei Fingern; Textgröße, Objektgeometrie und Fotobeschnitt bleiben dabei unverändert. Nach manuellem Zoom setzt auch eine Abwahl die Ansicht nicht zurück. Der weiße Knopf „Ganzes Schild“ erscheint nur oberhalb von 100 %.
- Desktop: senkrechte weiße 44-px-Pille rechts, vertikal mittig. +, Regler 100–400 %, −, Prozentzahl; Rückkehrsymbol nur oberhalb von 100 %. Dunkelgraue Spur #2f3437. Die Spur bleibt beim Einblenden des Rückkehrknopfs gleich lang (im Browser vor/nach 100→101 % jeweils 132 px; echtes Ziehen bis 251 % bestätigt). Mausrad zoomt weiter zur Mausposition, Regler und Anzeige laufen mit. Waagerechte Leiste und Doppelklick-Zoom entfallen.
- Die Bühne reserviert rechts 60 px. Platte, Material- und Acrylebenen werden als Ansicht gemeinsam etwas kleiner eingepasst. Beide Maßangaben bleiben bei 100 % sichtbar. Vergrößerte Ebenen und Auswahlgriffe werden vor dem Reglerbereich abgeschnitten; der Balken liegt auch im Vollbild nie über dem Schild. Die Lupe bleibt innerhalb dieser Ansichtsfläche. Physische Millimeter, Produktionsdaten und gespeicherte Objekte werden nicht skaliert.
- Lupe, Einrasten und mm-Hilfen aus Nachtrag 4 bleiben erhalten. Die alte automatische Fokusberechnung und ihre Ereignisbehandlung wurden entfernt.

## Prüfungen am neuen Stand

Windows / Node 24.20.0:

| Prüfung | Ergebnis |
|---|---:|
| Gezielte Zoom-/Geometrie-/Lupe-Tests | 33/33 bestanden |
| Vollauf variant-m | 414/420 bestanden, dieselben 6 Windows-/Python-Fehler, kein Skip |
| Vergleich zu bisherigem PR #43 | vorher 412/418, keine neue Fehlerkennung |
| Separate lokale Kombination mit PR #42 | 148/148 gezielte Tests bestanden, kein Skip |
| Einzelner und kombinierter Editor-Build | erfolgreich, je 110 Module / 14 Styles |

Einzelbundle: `editor-f4762ac8afaac612.mjs`; kombinierter Build: `editor-2670d91e03cce893.mjs`. Nach dem Vollauf wurde nur CSS nachgebessert: Schiebeknopf zentriert und Platz für den Rückkehrknopf dauerhaft reserviert, damit sich die Reglerspur beim ersten Ziehen nicht verkürzt. Nach der letzten Korrektur beide Builds erneut erstellt und die unveränderte Spur vor/nach echter Browserbedienung sowie die betroffenen 100-%-Bilder geprüft. Die sechs unveränderten Fehler betreffen die vorhandenen PDF-/ZIP-/Python-Ausführungstests (lokaler Python-Aufruf endet mit 9009). Ihr exakter Namensvergleich steht in [tests.json](konfi-zoom-einfach-20261029-astra/tests.json). Der Editor-Vollauf wird nicht als grün bezeichnet. Werkstatt-Vollauf aus Nachtrag 4 nicht nochmals wiederholt; keine Werkstattdatei geändert, Galerie-/Shop-/Order-Integration in den 148 Kombinationstests erneut geprüft.

Neue Assertions prüfen insbesondere: kein Fokus durch Auswahl/Eingabefeld, kein freier Doppeltipp oder Doppelklick-Zoom, unveränderte Daten bei Pinch einschließlich Foto, Bereich 100–400 %, Regler/Mausrad/Knöpfe synchron, exakte reservierte Desktopfläche und gemeinsames Clipping aller Ebenen bei 100/180/400 %. Bestehende Sicherheitsprüfungen für abgebrochene Objektgesten und späte Touch-/Pointer-Ereignisse bleiben aktiv. Keine Tests gestrichen oder neue Skips eingeführt; alte Fokus-/Doppeltipp-Sollwerte durch die ausdrücklich geänderte Vorgabe ersetzt.

## Bilder und Grenzen des Nachweises

[Bildübersicht](konfi-zoom-einfach-20261029-astra/README.md) und [DOM-Messungen](konfi-zoom-einfach-20261029-astra/browser-checks.json): gebauter lokaler Editor mit historischem D8-Testmodell und Originalressourcen. Chrome-Viewport **1440×900**, **390×664**, **375×548**. Desktop normal und Vollbild jeweils 100 % / 180 %, Handy jeweils Pinch / Lupe mit „15 mm zum Rand“, zusätzlich Rückkehr und Doppeltipp geprüft. Pinch 100→150 % lässt die interne Schriftgröße 10,32 mm und sämtliche gespeicherten Objekte identisch. Ein Tippen bleibt bei 100 %. Nach „Ganzes Schild“ 100 % und kein Rückkehrknopf. Preis/Schrittleiste bleiben in beiden Handygrößen sichtbar.

Touch- und Dragzustände wurden mit einem lokalen synthetischen Prüfharness ausgelöst; Bilder zeigen die echte Browserdarstellung. Dies ist **kein physischer iPhone-/Safari-Test** und kein neuer Live-Shop-/Warenkorbtest. Keine Fontdateien, Testserver, Datenbanken oder Kundenuploads im Commit; Textdateien mit LF.

## Übergabe an Claude

PR #42 bleibt unverändert bei `bfbd9188`. Laut Claudes Nachtrag 5 waren die bisherigen #42/#43-Stände zusammen unter Linux **1801/1801 grün** und 1:1 auf dem Händlerhost sichtbar geprüft. Diese Abnahme gilt für den vorherigen Stand; sie wird nicht als Prüfung der heutigen Änderungen ausgegeben. Die historischen offenen Punkte im Nachtrag-4-Bericht bleiben als damaliger Stand erhalten und werden durch diese neue Übergabe aktualisiert.

Noch prüfen: neuer Linux-Vollauf, echte iPhone-13-/SE-Safari-Gesten (Pinch auf Text/Foto, Textdoppeltipp zum Bearbeiten, „Ganzes Schild“), Desktop-Regler/Mausrad sowie Lupe/mm auf dem kombinierten Stand. Beim Zusammenführen beide STATUS-Absätze von #42 und #43 erhalten. Anschließend gemeinsam bereitstellen ausschließlich nach Chris’ ausdrücklichem Satz. D8-Preisvertrags-/1,69-€-Probelauf bleibt getrennt; hier keine Preis- oder Cart-Transform-Änderung.
