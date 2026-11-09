# Öffentliche Originalvorschauen: unveränderliches Modell wiederverwenden

Stand: lokal fertig und unabhängig geprüft, noch nicht veröffentlicht. Basis `4afd1a2b27e43efba2e1bd4f03119ff52b9e0bc6`, Branch `dev/mika-public-preview-model-read-20261109`. Keine Änderung an Oberfläche, Designs, Preisen, Produktrevisionen oder Bestellungen. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert maßgeblich; dieses Paket gestaltet nichts um.

## Enges Ergebnis

Ein bereits vorbereitetes öffentliches SVG liest bislang eine eigene Kopie des vollständigen Produktmodells und berechnet dessen Fingerabdruck erneut. Bei der echten Stahlbank sind das rund 12 MB. Der native Vorschau-Leseweg verwendet jetzt die bereits vorhandene, auf acht Modelle begrenzte interne Ablage. Er friert ihre private Modellkopie vollständig ein und berechnet den identischen Fingerabdruck einmal pro Modellidentität.

Jeder Bildabruf prüft weiterhin die aktuelle native Zuordnung, Mandant, Archiv-/Sperrstatus, Produktrevision, Dokumenthash, Optionen, Preisbindung und Freigabe. Die Optimierung speichert keine Freigabeentscheidung. Normale Modellaufrufe liefern unverändert eigene veränderbare Kopien. Ohne nativen Provider sowie bei veränderlichen oder nur oberflächlich eingefrorenen Modellen bleibt die vollständige Neuberechnung bestehen. Vorbereitung, Warmmanifest und private Galerie bleiben fachlich unverändert.

Genau drei Produktionsdateien:

- `app/workshop/http.mjs`: privater unveränderlicher Modellnachweis, gleiche begrenzte Ablage; LRU-Verdrängung innerhalb einer synchronen Anfrage abgefangen.
- `app/workshop/public-design-previews.mjs`: optionaler Nachweis ausschließlich beim direkten Bildlesen; vollständige Unveränderlichkeit vor Wiederverwendung prüfen.
- `app/workshop/shop-entry.mjs`: nativen Provider verbinden, bisherigen Weg für andere Werkstätten erhalten.

## Prüfung und gemessene Grenze

[Exakte Vorher-/Nachher-Hashes und Messwerte](../reviews/2026-11-09-public-preview-model-read/proof.json), [Testprotokoll](../reviews/2026-11-09-public-preview-model-read/final-tests.log).

20/20 gezielte Tests, keine übersprungen: unveränderte Modellbytes, tiefe Unveränderlichkeit, normale bearbeitbare Kopien, feste Revisionen, Veröffentlichung, Pause, LRU-Verdrängung, Widerruf, Mandanten-/Preis-/Bindungswechsel, veränderlicher Provider und Legacy-Fallback. Der unabhängige Reviewer `module_backend` bestätigte zusätzlich mit einer eigenen Gegenprobe die Ablehnung eines veränderten Kindobjekts unter eingefrorener Wurzel. Keine breite Suite oder Liveabnahme behauptet.

```powershell
node --test app/workshop/public-preview-model.test.mjs app/workshop/public-design-previews.test.mjs app/workshop/customer-read-scope.test.mjs
```

Die lokale HTTP-Probe nutzt die echte r4-Bank (251 Designs, 80 Größen, 404 Kombinationen; 11.906.263 Bytes, SHA `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`), native Werkstatt/Registry und temporäre SQLite-Dateien. Shopidentität und Freigabeantwort sind synthetisch; keine produktive Datenbank und kein Netzgeschwindigkeitsnachweis. Private Reproduktion: `outputs/public-preview-model-read-20261109/measure.mjs`, `PROOF_MODE=baseline` beziehungsweise `candidate`.

Vorher sechs Bildabrufe: **239/236/271/234/234/233 ms**. Finale Fassung: **244/158/159/201/154/157 ms**. Der erste Abruf berechnet und prüft den Modellnachweis, warme Abrufe sparen meist etwa 70–110 ms; ein Ausreißer liegt bei 201 ms. Große Modellkopie und wiederholter Modellhash entfallen warm. Exakt drei Renderaufrufe während ausdrücklicher Vorbereitung, keiner beim Bildabruf; dieselben SVG-Bytes. Der signierte Start blieb ungefähr gleich (rund 247/249 ms).

Das löst weder langsame Übertragung noch private Renderaufträge oder die gesamte Designwechselkette. Root maß servernah drei parallele öffentliche SVGs in 768/1330/1941 ms; der Kundenbrowser brauchte teils 5–14 s. Diese unterschiedliche Verbindung und Warteschlange darf nicht als lokal nachgewiesene Einsparung ausgegeben werden.

## Übernahme und Rücknahme

Root prüft vor der Veröffentlichung die drei aktiven Dateihashes gegen `proof.json`, sichert genau diese Dateien separat und übernimmt nur dieses Paket. Den vorherigen Elf-Dateien-Installer nicht erneut verwenden. Keine Datenbank-/Shopify-Mutation und kein Kundenbundle-Build erforderlich: nur Serverquellen, danach bestehende Laufzeit neu starten. Geschützte CSS und fremde Laufzeitkorrekturen bleiben unberührt.

Danach bestehende drei vorbereitete URLs sowie Freigabeentzug prüfen und echte Laufzeiten vergleichen. Bei Abweichung die drei vorher gesicherten Serverdateien gemeinsam zurückspielen und dieselbe Laufzeit neu starten. Weder Produktstände noch Cache-/Bestelldaten löschen. Aktuelle öffentliche URLs bleiben nur gültig, wenn vollständige Modell-/Renderer-/Bindungsidentität unverändert ist; bestehende begrenzte Startvorbereitung bleibt zuständig.
