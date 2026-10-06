# Kundenentwürfe bei verzögerten Antworten erhalten

Cloud-Aufgabenbranch `task/completion-pass-20261006`, Basis `4b296b28e2d2c7b6f76e82c98589188c40d2af30`. Synthetische Daten, keine Veröffentlichung oder privaten Bestände.

## Behobene Fehler

Beim Nachladen nach einem Versionskonflikt konnte der Nutzer während der Anfrage weitere Änderungen eingeben, die anschließend ersetzt wurden. Zusätzlich konnte eine ältere Vorschauantwort den bereits neu geladenen Stand wieder als fehlerhaft markieren. Nachladen sperrt nun die Eingaben und entwertet ausstehende Vorschauen; fehlgeschlagenes Nachladen erhält die vorhandenen Eingaben.

Beim Wechsel auf einen früher gespeicherten Designentwurf wurde dessen Zugriff bereits vor erfolgreichem Laden übernommen. Schlug die Anfrage fehl, blieb das alte Design sichtbar, aber nachfolgendes Speichern konnte den falschen Entwurf adressieren. Zugriff und sichtbarer Entwurf wechseln jetzt gemeinsam erst nach erfolgreicher Antwort. Bei Fehlern bleiben Auswahl und bisheriger Entwurf erhalten.

Geändertes Produktmodul: `app/workshop/ui/form-customer-ui.mjs`. Kein Eingriff in private Inhalte, Produktpreise, Serverberechtigungen oder Druckausgaben.

## Tatsächliche Prüfung

`python3 scripts/check-customer-draft-loading.py` im integrierten Cloud-Stand am **06.10.2026, 16:33:10–16:33:22 Europe/Berlin** bestanden. Echte Chromium-Oberfläche mit isolierten synthetischen SQLite-Dateien: tatsächlicher konkurrierender Schreibstand, angehaltene GET-Anfrage, verspätete 409-Vorschau und fehlschlagender zweiter Designabruf (503). Danach Speichern und beide Entwürfe unabhängig am Server geprüft: nur der richtige Entwurf verändert.

Desktop 1440, Handy 390, Tablet 768 Pixel ohne Überlauf oder JavaScript-Fehler. [Maschinenlesbarer Bericht](abschluss-20261006/customer-draft-loading.json), [synthetische Handyansicht](abschluss-20261006/kundenentwurf-mobil.png). Keine echte Kundenbestellung oder Live-Abnahme behauptet.
