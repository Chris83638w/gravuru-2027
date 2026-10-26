# Paket R · Sammelzuordnung, Hauptprodukte im Dashboard, Sammelfreigabe · 26.10.2026

Für **Astra High** (Codex, GPT-5, Reasoning high). Auftraggeber: Claude (Operator), freigegeben von Chris am 26.10.2026.
Basis: Code `main` (≥ dem Commit dieses Auftrags), Katalog `main` (≥ Zielmigration von Claude, siehe STATUS).
Branch in beiden Repositories: `dev/paket-r-20261026-astra`. PR an Claude. Austausch nur über GitHub
(Übergaben, Issues, PR-Kommentare), Chris 25.10.: „nein immer über github, da muss euer austausch sein“.

## Wunsch von Chris (26.10.2026, wörtlich)

> „gibt es nicht die möglichkeit, dass wir alle designs auf der neuen Struktur einmal einspielen und dann dem Material
> mit Unterkategorie zuordnen? Ich wähle ein Design als Hauptprodukt und sage dann das und das Design als Auswahl für
> Acrylglas AA und AS sowie Edelstahl und Druck?“

Die Zielmigration („einmal einspielen“) macht Claude. Paket R baut die Bedienung dafür.

## Bestehendes Modell – nicht ändern

- **Material/Verfahren = Ziel** (Familie) je Design mit eigener Freigabe (`design.json.ziele`, Paket M).
  Materialwechsel ergibt **keine Variante**, nur ein Ziel (Kennungsregel im Katalog-README).
- **Unterkategorie = Thema** (`design.json.themes`, `linien/<linie>.json → subcategories[].themeId`).
- **Hauptprodukt** = `subcategories[].mainProducts[]` mit `id, name, startDesign, sizesOffered, externalIds, status`
  (Validierung `app/workshop/katalog-source.mjs`).
- **Designauswahl im Konfigurator** entsteht automatisch: alle freigegebenen Designs mit passendem Thema, Ziel und
  kompatibler Größe (`app/workshop/katalog-import.mjs`, `themed` und `a.sizes`). „Das und das Design als Auswahl“
  heißt also: Thema und Ziel zuordnen. **Keine Designlisten je Produkt** einführen.
- Freigabe nur nach Sichtprüfung der Zielvorschau; der Server prüft Passung und Prüfsumme beim Schreiben erneut
  (`patchDesignWithTargetReview`). Fehlende Schriften und „passt nicht“ sperren weiter.

## R1 · Viele Designs auf einmal zuordnen

- Tabelle und Kacheln: eigener Modus **„Zuordnen“** mit Mehrfachauswahl (getrennt von der Freigabe-Auswahl),
  „alle sichtbaren auswählen“ für den aktuellen Filter.
- Aktion **„Materialien hinzufügen“**: vorhandene Familien, gruppiert nach Linie. Unvollständige Familien
  (`ruleComplete`, z. B. Preise fehlen) sind wählbar, aber mit Hinweis „Familie unvollständig: … – Freigabe und Import
  bleiben gesperrt“.
- Vor dem Schreiben eine Vorschau mit Zählern: Designs × Familien; je Paar „kompatible Größen vorhanden“
  (`assignTargetSeries`) oder „keine passende Größe – Variante nötig“. **Nur kompatible Paare werden angelegt**, die
  anderen stehen im Ergebnis mit Grund.
- Aktion **„Unterkategorien (Themen) setzen“**: hinzufügen und entfernen für die Auswahl.
- Server: Sammel-Endpunkt mit höchstens 500 Designs je Aufruf, je Design eine eigene Transaktion über den vorhandenen
  Schreibweg (`zieleHinzufuegen`, `themes`), Ergebnis je Design (ok / abgelehnt mit Grund), Änderungsprotokoll, CSRF und
  Sitzungsakteur wie heute. Ziele hinzufügen setzt bestehende Freigaben nicht zurück und erteilt keine Freigabe.

## R2 · Sammelfreigabe über Zielkacheln

- Neue Ansicht **„Zielprüfung“**: ein Ziel (Familie) wählen plus Filter (Linie, Thema, Status, nur Startdesigns).
  Kachelraster mit der echten Zielvorschau (`targetDesignPreview`, Standardgröße = erste kompatible Größe), Status
  passt / prüfen / passt nicht und den Befunden.
- Seitenweise (z. B. 24 je Seite), begrenzte Parallelität der Vorschauabrufe, Zwischenspeicher je Prüfsumme.
- Eine Kachel gilt erst als gesehen, wenn ihr Bild geladen **und** sichtbar war.
- Knopf **„Alle gesehenen mit ‚passt‘ freigeben“** mit Bestätigung und Anzahl. „prüfen“ nur einzeln nach Öffnen,
  „passt nicht“ nie. Der Server prüft jedes Design einzeln erneut; Ergebnis je Design.
- Größenauswahl mit Form im Namen (Issue #24): „12 × 8 cm · Abgerundete Ecken R5“, gruppiert je Form, kompatible
  Größen zuerst. Gilt auch für die vorhandene Zielvorschau.

## R3 · Hauptprodukt im Dashboard anlegen

- Knopf **„Als Hauptprodukt anlegen“** an Zeile und Kachel, sobald das Design ein bestätigtes Ziel hat.
- Dialog: Linie (Linien, deren Familien Ziele des Designs sind), Unterkategorie (Unterkategorien der Linie, deren
  Thema das Design trägt; sonst Hinweis „Thema fehlt – erst zuordnen“), Größen (kompatible Größen der Familie,
  Mehrfachauswahl, Standard: alle einer Formgruppe), Name (Vorschlag nach dem Muster vorhandener Hauptprodukte der
  Linie, editierbar), Zielvorschau des Startdesigns.
- Kennung neuer Hauptprodukte: `<startDesign>-<Formgruppe>` mit „,“ → „_“ (Beispiel `TRE-V2A-8x3_5-D29-RE`), höchstens
  80 Zeichen, eindeutig in der Linie; sonst 409 „schon vorhanden“. `externalIds` bleibt leer (neues Shopify-Produkt
  entsteht erst beim Shop-Abgleich nach Chris' ausdrücklichem „ja“), `status` = „angelegt im Dashboard <Datum> von <Akteur>“.
- Schreiben transaktional in `linien/<linie>.json` mit Änderungsprotokoll und 409 bei Konflikt; die Datei muss danach
  die vorhandene Validierung bestehen. Löschen nur ohne `externalIds.shopifyProductId`.
- Das Dashboard zeigt weiterhin „Startdesign für N Hauptprodukte“.

## Nicht in diesem Paket

Keine Shopify-, Import- oder Live-Aktion, keine echten Freigaben, keine Änderung echter Katalogdaten (nur
Testkopien), keine neuen Familien oder Preise (Acryl-Türschilder 3 mm und Preise macht Claude mit Chris' Excel,
Druckfamilien sind Paket N), keine Designlisten je Produkt, keine Formvarianten (dafür bleibt „Für anderes Ziel
einpassen“).

## Prüfung und Abgabe

- Tests: Sammel-Endpunkte (CSRF, Grenzen, Teilfehler, Transaktion je Design, Protokoll), nur kompatible Paare,
  Freigabe nur für gesehene „passt“-Kacheln mit serverseitiger Neuprüfung, Hauptprodukt schreiben/ablehnen/löschen,
  Validierung der Linien-Datei, Größenbeschriftung mit Form.
- Windows-Vollauf mit Zählern und Rohlog; Browser Desktop und Handy-Emulation (Pixel 7) inklusive 100 Kacheln.
- Bericht `docs/handoffs/2026-10-2x-paket-r-bericht.md` mit Screenshots, Eintrag oben in `STATUS.md`. Kein Merge,
  kein Force-Push. Rückfragen als Kommentar im PR oder als Issue an Claude.

## Nachtrag 26.10.2026 · Befunde von Chris beim Prüfen · Reihenfolge

Chris prüft die Edelstahl-Designs je Form und skalierbarer Reihe (z. B. `edelstahl-gravur-oval-90x60`, Kacheln). Daraus:

1. **Kacheln zeigen die echte Plattenform.** Heute zeigt jede Kachel das Design auf einem weißen Rechteck, auch bei Oval
   ([Screenshot](paket-r/chris-oval-kacheln-ohne-kontur.png)). Chris: „Es wäre absolut hilfreich, wenn wir die ovale
   Kontur zumindest sehen. Sonst muss ich ja in jedes Design zur Prüfung reingehen.“ Kachelbild = Zielvorschau
   (Familie der Linie, erste kompatible Größe: Platte, Kontur, Bohrlöcher, Material). Das ist R2.
2. **Freigabe aller geprüften Designs einer Reihe auf einmal.** Heute muss für jedes Design einzeln die Zielvorschau
   geöffnet und „Auswählen“ gesetzt werden; es gibt kein „alle auswählen“. Mit R2 gilt eine geladene, sichtbare
   Zielkachel als gesehen; Knopf „Alle gesehenen mit ‚passt‘ freigeben“ (Server prüft jedes Design neu).
3. **Zurück aus „Bearbeiten“ ohne Neuladen.** Heute lädt „← Designs“ die ganze Übersicht neu
   ([Screenshot](paket-r/chris-bearbeiten-zurueck.png)). Zurück muss Linie, Reihe, Filter, Ansicht, Scrollposition und
   die geladenen Vorschauen behalten (z. B. Editor als Überlagerung oder Zustand im Verlauf plus Zwischenspeicher);
   nach dem Speichern nur die geänderte Kachel neu laden.

**Reihenfolge (Claude):** Zuerst ein eigener, kleiner PR mit R2 plus Punkt 3 und Issue #24, weil Chris gerade prüft
und freigibt. Danach R1 und R3. Fehlt für eine Form jede kompatible Designreihe (heute „Rund“: 0 Designs), zeigt die
Ansicht das ausdrücklich an.
