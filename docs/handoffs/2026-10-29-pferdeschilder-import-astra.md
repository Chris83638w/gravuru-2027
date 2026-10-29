# Pferdeschilder: Importkorrektur für Motivrechte und Konturen

Stand: 29.10.2026, Codex/Astra. Aufgabenbranch `dev/pferdeschilder-import-20261029`, Basis Code-`main` `915c102a7bd2720a8bb27805149ed79264559dc3`. Dieser Aufgabenbranch enthält den geprüften Code und den reproduzierbaren Importlauf. Kein Livezugriff, keine Bereitstellung, kein Shopify-Schreiben.

## Auftrag und fachliche Quellen

- [Issue #63, Nachricht 1](https://github.com/Chris83638w/gravuru-2027/issues/63#issuecomment-6503763870): Edelstahl-Pferdeschilder, jedes einzelne Motiv für Kunden löschbar und ersetzbar. [Erste technische Übergabe](https://github.com/Chris83638w/gravuru-2027/issues/63#issuecomment-6504557220) benennt die beiden Importfehler `delete/replace=false` und Füllflächen aus offenen Gravurkonturen.
- Nutzer im Chat am 29.10.2026: „Die 5 Muster passen, mach mit allen weiter. Erst mal Boxenschilder mit Name und Abstammung, eigene Designs je Pferderasse später.“ Dokumentiert auch in der [Fortsetzung von Issue #63](https://github.com/Chris83638w/gravuru-2027/issues/63#issuecomment-6505195435).
- Fortsetzungsauftrag im selben Chat: „Mach mit der technischen Übernahme weiter: Katalogkennungen vergeben und die Importfehler beheben. Nichts live schalten. mach weitere designs für die jeweiligen Formen und Größen“.
- [Issue #63, Randentscheidung](https://github.com/Chris83638w/gravuru-2027/issues/63#issuecomment-6505367510): Gravuren bis zum Rand, Gestaltungsrand 0 mm. Ein randlaufender Rahmen darf daher nicht wegen voller Hüllbox als Plattenfläche verschwinden.
- [AGENTS.md](../../AGENTS.md): einzelne Motive sind austausch-/löschbar; ganze als Einheit verkaufte Druckdesigns bleiben getrennt behandelt. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt für die Kataloggestaltung maßgeblich. Keine neuen Preis-, Loch- oder Freigaberegeln.

## Änderungen

- `app/workshop/katalog-convert.mjs`: normale Motiv- und Dekorationsebenen erhalten `customerEditable=true`, `replace=true`, `delete=true`. `movable` steuert weiter unabhängig Bewegung und Skalierung. Hilfsebenen bleiben gesperrt; Pflichttexte, Foto- und Artwork-Regeln bleiben bestehen.
- Gravur ersetzt allein die Farbe durch `currentColor`: explizites `fill="none"`, Konturbreite, `fill-rule="evenodd"` und vorhandene Pfaddeckkraft bleiben erhalten. Explizite Nullwerte bleiben Null. Negative Strichbreiten und Deckkraft außerhalb 0–1 werden mit Quellenfehler gemeldet.
- Die alte Corel-Flächenerkennung überspringt nur noch ein einzelnes deckendes Rechteck mit vier expliziten geraden Seiten ohne Kontur, dessen Maße die Platte füllen. Volle Hüllbox allein genügt nicht: Rahmen, Dreiecke und transparente Motive bleiben erhalten. Benannte technische Ebenen wie `platte` und `kontur` bleiben wie bisher ausgeschlossen.
- `app/configurator/variant-m/local-pilot.mjs`: die eng begrenzte Prüfung eingebetteter Gravurpfade erlaubt zusätzlich numerische Deckkraft 0–1. Fremde Attribute, externe Farben/URLs und Ereignisattribute werden dadurch nicht erlaubt.
- `app/workshop/katalog-convert.test.mjs`: Regressionen prüfen tatsächliches Löschen und Ersetzen über `validateProductDesign`, weiterhin feste Geometrie, geschützte Guides, Pfadattribute bis ins gültige Produktdokument, Skalierung der Strichbreite und Randrahmen. Bestehende Corel-Flächenfixture bleibt gültig.

## Ausgeführte Prüfungen

Windows, Node `v24.19.0`: **74 gezielte Tests bestanden** (59 Import-/Rechteprüfungen plus 15 Ressourcenprüfungen). Die erste Ressourcen-Serverprobe wurde beim lokalen Zugriff auf `127.0.0.1` mit `EACCES` blockiert; derselbe unveränderte Ressourcenlauf bestand anschließend mit lokal erlaubtem Testserver **15/15**. Ein anfänglicher temporärer Datei-Renamefehler verschwand mit dem Prüf-Temp-Verzeichnis im Checkout.

```powershell
$env:TEMP=(Resolve-Path .test-tmp).Path
$env:TMP=$env:TEMP
node --test app/workshop/katalog-convert.test.mjs app/workshop/katalog-source.test.mjs app/workshop/katalog-import.test.mjs app/workshop/katalog-linien.test.mjs app/configurator/variant-m/element-rights.test.mjs app/configurator/variant-m/lazy-resources.test.mjs
node --test app/configurator/variant-m/lazy-resources.test.mjs
node app/configurator/variant-m/build.mjs
git diff --check
```

Build erfolgreich: 76 Ressourcen geprüft, 113 Module, 14 Styles, Paket 1.194.581 Bytes. `git diff --check` ohne Befund. Kein vollständiger Testsuitenlauf behauptet. Die Tests verwenden ausschließlich lokale Fixtures und lokale Prüfprodukte.

## Katalogschema für die technische Übernahme

`readDesignFolder` liest `designs/<Serie>/<Kennung>/design.svg` und `design.json`; ein zusätzlicher `index.json` dient der Dokumentation, nicht der Importsteuerung. Erforderliche Zuordnung je konkreter Fassung:

```json
{
  "id": "BESTEHENDES-FORMPRAEFIX-GROESSE-DNUMMER",
  "name": "Boxenschild – Gestaltungsname",
  "plateMm": [120, 80],
  "themes": ["pferdeschilder"],
  "fonts": ["EXAKTE_QUELLSCHRIFT"],
  "material": "edelstahl",
  "process": "engraving",
  "form": "rechteck",
  "sizes": ["EXAKTER_SCHLUESSEL_DER_FAMILIENGROESSE"],
  "movable": true,
  "fields": {
    "text-name": {"required": false, "maxLength": 40, "maxLines": 1, "label": "Pferdename"}
  },
  "ziele": [{"familie": "steel-door-signs", "freigabe": null}]
}
```

Beispielwerte ersetzen; keine neue Kennung aus dieser Dokumentation übernehmen. `form` für abgerundete Rechtecke lautet `rechteck abgerundete ecken`, für Ovale `oval`. Explizite `sizes` verhindern Vermischung gleichproportionaler Formen. `fields` erlaubt pro tatsächlicher Textebene nur `required`, `maxLength`, `maxLines`, `locked`, `label`; keine zusätzlichen Rechtefelder. Die originale Schrift muss als Glyphenressource vorhanden sein. Die Musterfreigabe ist keine technische Zielfreigabe; `ziele[].freigabe=null` hält diese offen.

## Vollständiger Kataloglauf und sichtbare Prüfung

`scripts/check-box-sign-import.mjs` liest die 200 echten SVG-/JSON-Ordner über readDesignFolder und den korrigierten Importer. Es prüft eindeutige IDs, offene Freigaben, exakte Größenbindung, Quellenrevision/Konturkennung/Geometriehash, Ebenenzahl, Name+Abstammung, prepareConfig, customerLayoutIssue sowie Lösch-/Austauschrechte. Es erzeugt nur review-bundle.json und import-check.json im angegebenen lokalen Ausgabeordner; keine Datenbank-/Netzwerkzugriffe. Der Motiv-Austauschtest im Stapellauf prüft Rechte; die oben genannten Regressionen prüfen zusätzlich tatsächliche Produktvalidierung.

**200/200 bestanden, 0 Warnungen, 0 Layoutprobleme**, unabhängig nachgeprüft. 44 echte native Konfiguratoransichten, keine JavaScript-/Ladefehler; vier kleinste Formvarianten für alle acht Designs, vier größte zusätzlich für die drei neuen. Alle Profile reviewOnly/local-review, Bestellungen und Produktion deaktiviert. Familien-Katalogbau erfolgreich: 11 Familien, 11 PDFs/PNGs, Excel acht Tabellen. [Katalogbericht und Bilder](https://github.com/Chris83638w/gravuru-katalog./blob/dev/pferdeschilder-20261029-astra-gravuru/auftraege/2026-10-29-pferdeschilder-astra/technik/README.md).

```text
node scripts/check-box-sign-import.mjs --katalog=<Katalog-Repo> --manifest=auftraege/2026-10-29-pferdeschilder-astra/katalog-zuordnung.json --fonts=<Glyphen-fonts.json> --out=<Prüfordner>
python scripts/build-katalog.py --katalog <Katalog-Repo>
```

fonts.json ist sharedResources.fonts aus dem katalogseitigen review-bundle.json. Das Prüfbundle ist ein lokaler Nachweis, kein Produktivimportformat.

## Abgrenzung und nächster Schritt

D74–D78 beruhen auf den fünf bestätigten Mustern, D79–D81 sind neue Vorschläge. Alle 200 technischen Freigaben bleiben null. Die ältere AB-Familie hat pauschale R5-Radien; dieser Prüflauf bindet explizit die Originalkonturen der aktuellen Serie (Hash, Revision, contourId). Vor einem späteren Produktimport muss der Operator diese Serienbindung übernehmen; kein stiller Ersatz durch Familien-R5. Bestehende Familien und Produkte wurden nicht geändert.

Nächster Schritt: neue Kontaktbögen sichten, technische Serien-/Familienbindung und reale Gravurprobe abnehmen. Kein Merge nach main, Deployment, Shopify-Schreiben oder Neustart durch diesen Auftrag.

Nach Abgleich mit dem aktuellen main erneut 74/74 Tests und Build bestanden. Sechs repräsentative Konfiguratoransichten erneut erfasst: keine Ladefehler, pixelgleich mit den vorhandenen Kontaktbögen. Neue parallele Statusabschnitte bleiben erhalten.

## Nutzerkorrektur: ausgefüllte Beispieldaten

Alle 200 Katalogfassungen verwenden jetzt 32 unterschiedliche fiktive Pferdedatensätze. scripts/apply-box-sign-samples.mjs liest die expliziten Daten aus dem Katalog und ersetzt ausschließlich Texte/zugehörige Metadaten; Motive werden vor/nach byteinhaltlich über den SVG-Parser verglichen. Der Prüflauf kontrolliert vollständige Feldrollen und tatsächliche Werte, keine sichtbaren Platzhalter. D76 enthält auch Besitzer-/Tierarztkontakt. 200/200 gültig, 44 aktuelle Konfiguratoransichten, Familienkatalog erneut gebaut. Keine Schrift-/Geometrie-/Freigabeänderung und nichts live.

## Layoutüberarbeitung mit Sol

## 29.10.2026 · Codex / Sol · Größere Namen und Motive

Alle 200 Boxenschildfassungen neu angeordnet; Namen um 12–78.3 % größer, Motive proportional vergrößert, weniger Leerraum. 32 unterschiedliche Beispieldatensätze / 1.000 Texte erhalten. 200 gültige native Konfigurationen, keine Warnungen/Konturprobleme/Textüberschneidungen; 44 aktuelle Konfiguratoransichten. Katalogbau erfolgreich. Freigaben offen, nichts live.

Reproduzierbares Skript: scripts/refine-box-sign-layouts.mjs; Ausgangsbundle aus Katalogcommit 81a6a6a. Bericht im Katalog: auftraege/2026-10-29-pferdeschilder-astra/technik/LAYOUT-UEBERARBEITUNG.md.
