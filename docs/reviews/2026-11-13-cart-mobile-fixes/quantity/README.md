# Warenkorb-Rückkehr: Menge und Schraubenkopf

Lokale Basis `d8bf96da2da814c62af43f4adf32b9732bcaf7b0`, drei eng begrenzte Änderungen im Kandidatencheckout. Keine Bereitstellung, Shopify-/Servermutation oder Commit. Claudes inzwischen installierter Galeriefix `ff1f1ca` und `contract.mjs` werden nicht verändert. Vor Übernahme muss der Operator die drei Dateien mit seiner aktuellen Laufzeitbasis abgleichen.

## Befund und Korrektur der Menge

Claudes echter Bericht [#1686833537396](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6833537396), [README@6dd50ed0](https://github.com/Chris83638w/gravuru-2027/blob/6dd50ed0/ops/plesk/warenkorb-20261112/README.md), Gitblob `ae41ecfa00f89ea445fb2db58ac752cf3c2547e3`: Nach fehlgeschlagener Shopifyübergabe der DRAFT-Produkte stellt „Zurück zur Gestaltung“ Text/Motiv/Logo/Befestigung wieder her, Menge jedoch 1.

Der Zwischenseitenknopf führt `history.back()` aus (`app/workshop/ui/theme-cart-ui.mjs:6`). Wird die Editorseite dabei neu aufgebaut, greift ihr lokaler Sitzungsschutz. Der Adapter initialisiert die Menge getrennt von der Gestaltung mit 1 (`adapter.mjs:42`); der bisherige Sitzungspayload in `ux.mjs:355` und `session-guard.mjs` enthielt lediglich Draft und Uploadreferenzen. `saveDraft`/`restoreDraft` enthalten bewusst keine Bestellmenge. Damit kann die vollständige Gestaltung zurückkehren, während die Menge neu startet. Das ist vom eigentlichen Warenkorb-Bearbeiten-Link zu unterscheiden: `cart-edit.mjs:70–71` übernimmt bereits die Mengenangabe aus der privaten gespeicherten Revision. Dieser Serverpfad bleibt unverändert.

Korrektur: bestehender Sitzungsschutz erhält ein optionales Mengenfeld (ganze Zahl 1–99, dieselbe vorhandene Grenze wie quote/Shopübergabe). Reine Mengenänderung löst die vorhandene entprellte Speicherung aus; pagehide führt weiterhin flush aus. Bei Wiederherstellung setzt die UX den Wert und löst denselben input-Event wie der bestehende Cart-Edit-Pfad aus. Dadurch übernimmt auch die private Adaptervariable den Wert, und die vorhandene Preisberechnung läuft. Alte Sitzungen ohne Mengenfeld ergeben 1. Ungültige Zwischenwerte überschreiben keine gültige Sicherung. Keine Schema-/Preis-/Server-Draftänderung.

Geändert: `app/configurator/variant-m/session-guard.mjs`, `ux.mjs`, `session-guard.test.mjs`. Baseline- und End-SHAs in `baseline-pins.json`/`checks.json`; vollständiger Diff `quantity-return.patch`.

## Ergänzung nach unabhängigem CartEdit-Review

Der Review fand vor Commit ein echtes Rennen: `installRefinements → installWorkflow → installCompletion` startet `installCartEdit` ohne Await; danach folgen weitere asynchrone Schritte, bevor die lokale Recovery läuft. Eine schnell geladene Serverrevision konnte deshalb von der lokalen Sitzung überschrieben werden. Der erste Mengenpatch war hierfür noch keine abschließende Abnahme.

Die UX verwendet jetzt den vorhandenen Parser `cartEditParams(location.search)`. Bei einem syntaktisch gültigen ausdrücklichen Bearbeitungsauftrag überspringt sie alle drei automatischen lokalen Schritte: Ressourcen-Vorladen, Upload-Recovery und Draft-/Mengen-Recovery. Dies gilt unabhängig davon, ob die private Serverantwort früh oder spät eintrifft. Authentifizierung, Versions-/Dokumentprüfung, Fehleranzeige und Servermenge bleiben vollständig im vorhandenen `installCartEdit`-Pfad. Ein syntaktisch ungültiger Link sperrt die lokale Recovery nicht. Anschließend bleibt der Sitzungsschutz für weitere gültige Änderungen aktiv. Der neue Parserimport ändert `cart-edit.mjs` nicht.

Drei zusätzliche Regressionen nutzen den echten `installCartEdit` mit einem privaten Token-/Request-Port und nativer `readDraft`-Prüfung: Serverstand „Server“/Menge 3 vor oder nach lokaler Recovery gegen gespeicherten Stand „Lokal“/Menge 10 sowie ungültige Edit-URL. In beiden gültigen Fällen gibt es null lokale Ressourcen-/Uploadrestore-Aufrufe und keine lokale Fotoübernahme; im ungültigen Fall werden lokale Gestaltung, Menge 10 und Uploadreferenz wiederhergestellt. Der vorhandene gewöhnliche Rückkehrfall 10 und Altsitzungsfall 1 bleiben grün. Kein echter Browser- oder Serverlauf.

Der erste Zusatzlauf war 11/13: Die bisherige Test-Speicherfixture besaß noch keine Standardmethoden `length`/`key()`, die der echte private CartEdit-Tokenleser benötigt. Diese Fixture wurde vervollständigt; keine Runtime-Zugriffsprüfung wurde abgeschwächt. Danach 13/13 bestanden. Beide Logs sind getrennt erhalten.

## Schrauben: bestätigtes Maß unverändert

`ENTSCHEIDUNGEN.md:107`, Regel 3.39, Entscheidung 03.11.: „der Kopf ist 5mm groß“, Rückfrage überall → „prima, 5mm“. Das ersetzt 3,6/4,5 mm aus Regel 3.19. `mounting-dimensions.mjs:2` enthält 5 mm; `spacer-cap.mjs:19–22` zeichnet genau dieses Maß. Der Kommentar oberhalb nennt noch veraltete 4,5 mm, ist jedoch keine laufende Maßvorgabe. `option-media.mjs:91–95` ruft `screwHead()` ohne vergrößernden Parameter auf. Der gemeinsame Wert `mountingPreview.diameter:12` betrifft Abstandshalter und wird vom Schraubenrenderer nicht ausgewertet.

Zusätzlich rein lesend beide echten v9-5×2-Quellen über `selectedProfile(...,{mounting:"B02S"})` und `screwPreview` ausgewertet (`screw-measurement.json`): Acryl und Edelstahl 50 × 20 mm, je zwei Bohrungen bei (4,10)/(46,10) mm, Lochdurchmesser 4 mm; je zwei Schraubenköpfe 5 mm. Das sind 25 % der 20-mm-Schildhöhe und 10 % der 50-mm-Breite. Keine Geometrieänderung. Preis-/Lochdaten bleiben originalquellengebunden; Befestigungsmaße werden nicht aus dem Eindruck der Bildschirmvergrößerung abgeleitet.

Konkrete Empfehlung: keine optische Verkleinerung. Die fachliche Größe passt. Dies belegt den nativen SVG-Aufbau, nicht eine neue Livebrowser-Pixelmessung. Schraubenköpfe bleiben als Vorschau-Guide außerhalb der Gravur-/Produktionsgeometrie.

## Prüfung und Grenze

`node --test app/configurator/variant-m/session-guard.test.mjs`: 13/13 grün, 0 Skip (finaler Lauf `session-guard-cart-edit-tests.log`). Der ursprüngliche 10/10-Lauf allein deckte den nachfolgend beschriebenen CartEdit-Vorrangkonflikt nicht ab. Enthalten sind tatsächliche native Draftvalidierung sowie aus den echten UX-/Adapterdateien geladene Handler mit deterministischen DOM-Ports: Menge 10 → pagehide → Wiederöffnung 10, ältere Sitzung ohne Feld → 1, gültige Grenzen 1/99, ungültige Werte/letzten gültigen Speicher erhalten. Bestehende Draft-, Upload-, Fremd-/Ablauf-/Designtransferfälle bleiben grün. Drei Syntaxchecks und `git diff --check` grün. Erster Testlauf 9/10: ein zu langer neuer Fixturetext wurde erwartungsgemäß von der nativen Draftvalidierung vor dem Speichern abgewiesen; kurzer gültiger Text „Alt“ korrigiert nur die Fixture. Erstlog separat erhalten.

Kein echter Shopifywarenkorb- oder Mobiltest wurde hier durchgeführt. Nach gesonderter Codeübernahme ist Claudes genau derselbe öffentliche Rückweg mit Menge 10 erneut sichtbar zu prüfen. Dieser Fix hebt die Veröffentlichungssperre der DRAFT-Produkte nicht auf und behauptet keinen erfolgreichen Shopify-Kaufweg. Texte, Bilder, Pläne und Excelakten bleiben unverändert.
