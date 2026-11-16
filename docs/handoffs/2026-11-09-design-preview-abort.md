# Veraltete Designvorschauen beim Optionswechsel abbrechen

Isolierte Basis `a143acbc30c9e128c2c5f950bbb882ad740e1f96`, Branch `dev/mika-design-preview-abort-20261109`. Keine Liveänderung.

Beim Wechsel von Größe, Form oder Befestigung wurden alte Galeriekarten bereits verworfen. Zwei laufende Vorschauabrufe belegten jedoch weiter die beiden verfügbaren Plätze, bis sie vollständig geantwortet hatten. Dadurch warteten die passenden neuen Vorschaubilder auf nicht mehr benötigte Bilder.

Genau drei bestehende Produktionsdateien geändert:

- `app/configurator/variant-m/product-design-gallery.mjs`: pro aktivem Abruf ein AbortController; echter Options-/Themenwechsel sowie pagehide beenden alte Abrufe und leeren deren Warteschlange. Neue Karten können sofort zwei Abrufe beginnen. Späte Antworten, Fehler und finally-Aufrufe der alten Generation dürfen weder neue Karten ändern noch deren Plätze freigeben.
- `app/workshop/ui/shop-design-switch.mjs`: vorhandener Gateway reicht das Signal durch; aktive Editor-/Produktprüfung bleibt bestehen.
- `app/workshop/ui/shop-entry-client.mjs`: öffentliche Bildanfrage und authentifizierter Vorschau-Fallback erhalten dasselbe Signal. Nach Abbruch wird kein privater Fallback gestartet. Signierte Zielwerte bleiben im Body, Sitzungsschlüssel ausschließlich im bisherigen Header.

Keine neue Route, kein sichtbarer Umbau, keine Preis-/Kontur-/Designänderung. Vorwärmen bleibt bei höchstens drei aktuellen Startbildern und zwei parallelen Abrufen. Unveränderte Optionen lösen keinen Abbruch aus. Kein Vorladen aller Größen. Browser-Abbruch beendet nicht rückwirkend eine auf dem Server bereits laufende synchrone Berechnung.

## Nachweis

**42/42 gezielte Tests bestanden, 0 übersprungen.** Aufruf: `node --test app/configurator/variant-m/first-panel-preload.test.mjs app/configurator/variant-m/gallery-pager.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/shop-design-switch.test.mjs`.

Neue Verhaltensfälle verwenden den echten Galerie-Installationshandler in einer kleinen DOM-/VM-Probe: beide alten Abrufe hängen, Optionswechsel bricht ab, neue Abrufe starten sofort, alte späte Erfüllung/Ablehnung kann keine aktuelle Kapazität freigeben, genau drei neue Bilder werden vorbereitet. Weitere neue Fälle prüfen pagehide, Signaldurchreichung durch den aktiven Gateway sowie Abbruch zwischen öffentlichem 404 und privatem Fallback. Bestehende Save-Data-, Paging-, Session-, Produktwechsel-, Fotoübernahme- und Warenkorbtests bleiben grün. Syntaxprüfung der drei Dateien und `git diff --check` bestanden.

Root hat die drei Produktionsdiffs unabhängig gelesen und keinen Befund gemeldet. Eine echte Browser-/Netzwerkabnahme und Veröffentlichung übernimmt Root getrennt.

## Paket und Rücknahme

Das [Dateimanifest](../reviews/2026-11-09-design-preview-abort/patch-manifest.json) enthält die drei vorherigen und neuen SHA-256. Lokale Einzelfiles und Baseline unter `outputs/design-preview-abort-20261109/package/` beziehungsweise `baseline/`. Vor Übernahme aktive Pins erneut vergleichen; die Konfi-Datei ist Bestandteil des bestehenden Kundenbundles und muss mit dem unveränderten aktiven Buildverfahren neu gebaut werden. Keine anderen lokalen Styles oder Produktdateien mitnehmen.

Rücknahme durch Wiederherstellen dieser drei vorherigen Dateien und des vorherigen Kundenbundles beziehungsweise Rückwechsel zur gesicherten Runtime. Keine Datenmigration und kein Bestellstand betroffen.
