# R15: Text und Motiv nach Abwahl erneut auswählen

## Auftrag und Sicherung

Mikail meldete am 08.11.2026 im Edelstahl-Kundenkonfi: Nach dem Hinzufügen lassen sich Motive und Texte am Handy nicht mehr auswählen oder ziehen. Root reproduzierte im echten R15: neues Motiv zunächst auswählbar/ziehbar, danach freie Platte antippen, erneute Auswahl wirkungslos. Auch ein anschließender Mausklick war betroffen. Die Seite war vor dem PNG-Patch geladen; dieser ist daher nicht die Ursache.

Isolierte Basis: `7b8bc287012140cb3aba05f2aadbbe52248c6a55` (PR206 auf PR204), Branch `dev/mika-r15-pointer-reselect-20261108`. Einzige geänderte Laufzeitdatei: `app/configurator/variant-m/view-zoom.mjs`. Vorher-SHA256 `9bab289e11f9fc610ac44b83f161e3fc8f7305002ac14523929d7e95ea270856`, exakt zum vorhandenen Live-Manifest. Sicherung: `outputs/r15-pointer-reselect-20261108/backup/view-zoom.mjs`.

## Fehlerpfad und eng begrenzte Korrektur

Der Ansichtsregler beobachtet auch einfache Berührungen der freien Platte. Bei 100 % übernimmt er diese nicht und fordert keine eigene Pointer-Capture an. Die native Abwahl zeichnet das SVG neu und entfernt damit gegebenenfalls den ursprünglichen Touch-Zielknoten. Endet die Berührung außerhalb des Editor-Hosts, erreicht ihr Ende den bisherigen Host-Listener nicht. Die gespeicherte Pointer-ID bleibt stehen. Die nächste einzelne Berührung wird als zweite Berührung eingestuft; der Schutz gegen Zweifinger-Gesten kann dann auch spätere Auswahlversuche unterdrücken.

Die Korrektur beobachtet `pointerup`, `pointercancel` und `lostpointercapture` zusätzlich am Dokument in der Capture-Phase. Sie beendet ausschließlich bereits durch diesen Editor verfolgte Pointer, deren Ende außerhalb des Hosts ankommt. Sie erzeugt keine Auswahl, verändert keine Geometrie, konsumiert keine fremden Ereignisse und greift nicht in innerhalb des Hosts beendete native Ziehgesten ein. Eine Übergabe der Capture an den nativen Zieh-Layer bleibt aktiv. Beim Verlassen der Seite werden die zusätzlichen Listener entfernt; nach Wiederherstellung aus dem Browser-Zurück-Cache werden sie genau einmal wieder angemeldet.

Keine Änderung an Aufbau, CSS, Beschriftungen, Preisen, Vorlagen, Freigaben, Zoomregler, Fotozuschnitt oder SVG-PNG-Einbettung. Kein automatisches Vergrößern mit Fingern oder Mausrad aktiviert. Es werden keine Designs bearbeitet; der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert maßgeblich.

## Nachweis

- Neuer Regressionstest ruft den tatsächlichen `installViewZoom`-Adapter auf: freie Platte berühren, Ende nach SVG-Zielwechsel am Dokument, dann Text/Motiv erneut berühren. Vor der Korrektur rot mit `preventDefault=true` beim nächsten Einzel-Touch; danach grün für Ende, Abbruch und verlorene Capture.
- Schutztest: normale Endereignisse innerhalb des Hosts bleiben dessen nativen Handlern überlassen; fremde Pointer bleiben unberührt; eigene Capture wird bei externem Abbruch freigegeben; Listener werden bei `pagehide` entfernt.
- Capture-Übergabe und zwei vollständige BFCache-Zyklen separat geprüft; keine doppelten oder nach Rückkehr fehlenden Listener.
- 29/29 gezielte Tests grün: `view-zoom.test.mjs`, `view-zoom-model.test.mjs`, einschließlich bestehender Foto-/Touch-/Zweifinger-/Reglerfälle. Designzustand bleibt unverändert.
- Build grün: 151 Module, 16 Stylesheets; lokales Kernbundle `/_bundle/editor-be1fa6403c213c2d.mjs`. Dies ist nur ein lokaler Buildnachweis, kein Live-Bundle.
- `git diff --check` sauber. Browser-Nachprüfung des korrigierten Stands durch Root noch erforderlich; lokale Event-Port-Tests ersetzen keine echte Handyabnahme.

## Aktivierung und Rückweg

Keine Live-Schreibzugriffe durch diesen Agenten. Root prüft den Einzeldateidiff. Vor Übernahme muss der aktive Server genau die obige Vorher-SHA liefern. Nur diese eine Quelldatei patchen und den bestehenden aktiven Runtime-Baum neu bauen. Nicht das lokal erzeugte Bundle übertragen: bekannte separate R15-Änderungen in `option-media.mjs`, `family-formats.mjs` und `design-reset.mjs` sowie Serverkorrekturen müssen erhalten bleiben.

Der bestehende `createShopifyTestRuntime()`-Start baut über `app/configurator/variant-m/build.mjs` die `.preview/editor.html` und gehashte `.preview/bundle/`-Dateien. Einmal kontrolliert neu starten, keine Glob-Löschung. Mit frischer Editor-Navigation den neuen `/_acryl-bundle/editor-<hash>.mjs` verifizieren; die Editor-HTML kann 300 Sekunden privat im Browsercache liegen.

Reale Nachprüfung: Text und Motiv auswählen, ziehen, auf freie Platte tippen, beide wieder auswählen/ziehen; mehrere Wiederholungen mit Touch und Maus, außerhalb des Produkts loslassen, zwei Finger dürfen keine Größenänderung erzeugen. Danach Foto-/Logo- und Warenkorbpfad unverändert prüfen, soweit berührt.

Rücknahme: ausschließlich gesicherte `view-zoom.mjs` zurückstellen und im aktiven Runtime-Baum neu bauen. Keine Konfiguration, Bestellung oder Preisrevision ändern.
