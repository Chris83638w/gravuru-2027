# Gezielte Frontend-Korrektur zur Operatorabnahme

11.11.2026, Bezug: #168, Kommentar 6806309873. Nur die zugewiesenen vier Dateien im Kandidaten bearbeitet; kein Staging, Commit, Push oder Servereingriff. Übrige Runtime unverändert.

**1. Fehlende Oberfläche:** `installProductDesignGallery({config:doorbellFixture()})` führt in den nativen Galeriepfad. Dieser griff bisher vor jeder DOM-Prüfung auf `r.querySelector` zu und warf bei fehlendem Root einen Fehler. `native-design-search.mjs` beendet die Installation nun vor Browserzugriffen, wenn kein abfragbarer Root oder kein synchronisierbarer Editor vorhanden ist. Fehlendes Panel/Galerie bleibt ebenfalls ein No-op. Ein fehlendes Argument wird sicher unterstützt.

Die Regression ruft die tatsächlichen Installer auf: vollständig ohne DOM, ohne Root, mit unvollständigem Root, ohne Editor und ohne gemountete Galerie. Kein Fetch, keine Synchronisation und kein Suchhook wird dabei erzeugt. Der vorhandene echte Such-/Leeren-/Abbruch-/Sichtbarkeitstest bleibt grün. Der Doorbell-Test belegt zusätzlich unveränderte Konfiguration.

**2. Foto und SVG:** Kein fehlender SVG-Einstieg und deshalb keine Änderung an `ux.mjs`. Die bestehende Verdrahtung ist:

- Zeile 145: getrennte Schaltflächen `photo-upload` und `logo-upload`, abhängig von den jeweiligen Modulfreigaben; Dateityp des zunächst aktiven Fotoeingangs `vectorLogos&&!photoEnabled ? VECTOR_LOGO_ACCEPT : PHOTO_ACCEPT`.
- Zeile 392: Jeder Klick setzt `uploadKind` und prüft `uploadAllowed`. Der Logo-Button schaltet denselben Dateidialog ausdrücklich auf `.svg,image/svg+xml`; Foto auf JPG/PNG/WebP. Ersetzen übernimmt die vorhandene Uploadart.
- Zeile 410: `acceptCustomerFiles` schickt SVG-Logos in `acceptVectorLogos`; Fotos behalten die vorhandene Bildnormalisierung und den Foto-Importer. Zeile 460 ruft diesen Dispatcher beim Dateiwechsel auf.

Der alte Test wertete die Dateityp-Expression ohne den inzwischen benötigten Parameter `photoEnabled` aus und unterstellte jedem Vektorlogo-Produkt einen reinen SVG-Eingang. Er prüft nun drei tatsächlich erlaubte Fälle: nur Foto, nur SVG, Foto+SVG. Eine zusätzliche Regression führt die echten aus `ux.mjs` gelesenen Button- und Dispatcherblöcke aus: korrekte Freigaben, getrennte MIME-Auswahl, Ersetzen, Foto-Normalisierung und SVG-Dispatch ohne Fotoverarbeitung. Beide Wege bleiben bei Hauptacryl verfügbar; reine SVG-Produkte erhalten keinen Foto-Buttonzugriff.

## Prüfung und Übergabe

```sh
node --test app/configurator/variant-m/native-design-search.test.mjs app/configurator/variant-m/doorbell-presentation.test.mjs app/configurator/variant-m/photo-upload.test.mjs
```

**16/16 bestanden, 0 übersprungen.** `node --check native-design-search.mjs` sowie `git diff --check` auf den vier Dateien ohne Befund. Log: `operator-followup-frontend-tests.log`. Vollständige Dateihashes und Basis-HEAD: `operator-followup-frontend.json`.

Runtimeänderung ausschließlich `app/configurator/variant-m/native-design-search.mjs`; die anderen drei Dateien sind Tests. Root übernimmt Review/Commit und den erneuten Build. Die ausführbaren lokalen Handlerprüfungen sind kein neuer Browser-, Server- oder Warenkorbnachweis.
