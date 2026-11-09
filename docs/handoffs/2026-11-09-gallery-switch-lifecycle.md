# Galerie-Vorschauen während des Designwechsels pausieren

Isolierter Folgekandidat auf `64291020`, Branch `dev/mika-gallery-switch-lifecycle-20261109`. Nicht live. Kein Umbau der Oberfläche, keine Änderungen an Text-/Fotoübernahme, Optionen, Preisen, Designinhalten oder Produktdaten. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unberührt.

## Befund und enger Eingriff

Die bisherige Galerie setzte beim Auswählen nur ihre Bediensperre. Zwei laufende Vorschauladevorgänge, die Warteschlange, der Sichtbarkeitsbeobachter und der verzögerte erste Bildabruf konnten während `design-switch → model → resources → iframe ready` weiterarbeiten. Eine reine Modulprobe bestätigte: Solange `choose()` wartet, startet der alte Gateway weiterhin eine Vorschauanfrage. Die vorige iframe-Seite bleibt für „Zurück“ erhalten; deshalb löst der vorhandene `pagehide`-Abbruch diesen Fall nicht.

Genau zwei Produktionsdateien:

- `app/workshop/ui/shop-design-switch.mjs`: Der bestehende private Gateway meldet, ob sein Frame Vorschaubilder laden darf. Vor dem Wechsel wird die vorige Galerie pausiert. Die neue Galerie darf ihre Liste lesen, lädt Bilder aber erst nach `gravuru-ux-ready`. Nach Fehler wird die vorige Galerie fortgesetzt, nach Erfolg bleibt sie pausiert. „Zurück“ pausiert den entfernten Frame und aktiviert den wieder sichtbaren vorherigen Frame.
- `app/configurator/variant-m/product-design-gallery.mjs`: Pause trennt den Beobachter, bricht laufende Browserabrufe ab und verwirft deren Warteschlange. Eine eigene Vorschau-Generation verwirft verspätete Ergebnisse und schützt neue Ladeplätze. Fertige Blob-Bilder bleiben erhalten. Wiederaufnahme beobachtet nur fehlende Bilder neu; spekulativ bleiben es höchstens die ursprünglichen drei, mit höchstens zwei gleichzeitigen Abrufen. Save-Data bleibt berücksichtigt. Bei einem älteren Gateway fehlt nur die frameübergreifende Meldung; der lokale Wechsel pausiert trotzdem bis zum Abschluss.

## Nachweise

24/24 gezielte Tests, keine übersprungen: [Pins und Zusammenfassung](../reviews/2026-11-09-gallery-switch-lifecycle/proof.json), [Laufprotokoll](../reviews/2026-11-09-gallery-switch-lifecycle/tests.log).

```powershell
node --test app/configurator/variant-m/first-panel-preload.test.mjs app/workshop/shop-design-switch.test.mjs app/configurator/variant-m/gallery-pager.test.mjs
```

Geprüft wurden Pause vor der ersten Wechselanfrage, keine alten Observer-/Idle-Abrufe, ignorierte verspätete Antworten, sofort nutzbare neue Ladeplätze, erhaltene fertige Bilder, Wiederaufnahme nach Lade- und Übernahmefehler, „Zurück“, Candidate-Lesen vor Ready ohne Bildabruf, Save-Data, unveränderte Foto-/Options-/Warenkorbkontextübernahme und die bestehenden Seiten-/Generationsregeln.

Zusätzlich wurde der Kandidat `6c310120d48daef12b16e9568916a62ecd278597` in einem eigenen Chrome-Tab über CUA geprüft: **12/12 sichtbare Browserprüfungen grün**, einschließlich wartendem Wechsel, absichtlichem Modellfehler, erfolgreichem Wechsel und dem echten Zurück-Button. [Browserereignisse und Ergebnisse](../reviews/2026-11-09-gallery-switch-lifecycle/browser-evidence.json) und [Startanleitung](../reviews/2026-11-09-gallery-switch-lifecycle/browser-proof.md). Beide unveränderten Produktionsmodule liefen im Browser, mit synthetischen lokalen Karten und verzögerten HTTP-Antworten. Das ist eine abgegrenzte Lebenszyklusprüfung, keine Live-Shop-, vollständige R15-Gestaltungs- oder Handyhardware-Abnahme.

Abbrechen des Browserabrufs garantiert **keinen** Abbruch einer bereits begonnenen serverseitigen Renderarbeit. Das Paket verhindert neue konkurrierende Vorschauabrufe; es verspricht keine Gesamtladezeit. Produktive Aktivierung und reale Laufzeitmessung bleiben Roots eigener Schritt.

## Übernahme und Rückweg

Root prüft beide aktiven Basishashes, übernimmt die zwei Quellen in den kombinierten Stand und baut die Kundenpakete neu. Aktuelle aktive Styles und andere Korrekturen müssen erhalten bleiben. Vor Veröffentlichung im Browser einmal Design wechseln, absichtlich fehlgeschlagenen Wechsel prüfen und über „Zurück“ zur erhaltenen Gestaltung gehen: fertige Bilder bleiben, fehlende werden nachgeladen. Es gibt keine Datenmigration.

Rücknahme: beide gesicherten vorherigen Quellen gemeinsam wiederherstellen, Kundenpakete mit demselben überprüften Verfahren neu bauen. Keine Produkt-/Bestellstände oder Fotodateien ändern/löschen. Dieser Folgekandidat ist unabhängig vom engen Server-Modellnachweis und darf dessen Veröffentlichung nicht blockieren.
