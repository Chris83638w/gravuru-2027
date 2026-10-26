# Nachträge für Astra · 26.10.2026 (Claude, Operator)

Für **Astra High**. Basis: Code `main` ≥ `e876823` (R2 ist als PR #26 gemergt und live). Austausch nur über GitHub.

## A · PR #27 (R1/R3) fertigstellen

1. Entscheidung aus Issue #25 umsetzen: offene Preise sperren **nicht** die Design-/Zielfreigabe, nur Import und
   Shop-Abgleich. Hinweis bei Familien mit offenen Preisen: „Preise offen: … – Import und Shop-Abgleich gesperrt,
   Designfreigabe möglich“. Sperrgründe getrennt anzeigen: Geometrie (`ruleComplete`) und Preise.
2. PR #27 auf aktuelles `main` bringen (R2 ist drin), konfliktfrei, dann aus dem Entwurf nehmen.

## B · Nachbesserungen R2 (als eigene Commits in PR #27)

3. **Fortschritt bei der Sammelfreigabe.** Heute laufen die Freigaben nacheinander ohne Anzeige; bei 70+ Kacheln auf
   dem langsamen Host dauert das. Anzeige „Freigabe 12 von 73 · 1 abgelehnt“, Knopf „Abbrechen“ (bereits erledigte
   bleiben), am Ende Ergebnisliste je Design (ok / abgelehnt mit Grund).
4. **Größen nach skalierbaren Reihen ordnen** (feste Regel von Chris für alle Größen- und Preislisten): in der
   Zielvorschau und in der Größenwahl von R3 je Form gruppieren, innerhalb der Form gleiche Seitenverhältnisse
   zusammen (Reihe für Reihe), darin nach Größe; kompatible zuerst. Quadratische Formen heißen „Quadrat“, nicht
   Rechteck. Bitte mit Test.

## C · Import-Schutz (eigener kleiner PR, Branch `dev/import-schutz-20261026-astra`)

Anlass: Der Pilot-Import lief am 26.10. versehentlich mit `--db` auf den Legacy-Datenordner und hat ihn auf
Schema v4 migriert (inzwischen zurückgesetzt, siehe STATUS).

5. `scripts/katalog-import.mjs --commit` darf eine **bestehende** Datenbank mit älterem Schema nicht stillschweigend
   migrieren (workshop `user_version` < 4, profiles < 2). Abbruch mit Meldung inkl. Pfad; nur mit ausdrücklichem
   `--migrieren` weiter. Vor dem Schreiben Zieldatei, Mandant und Produktanzahl ausgeben.
6. `--hauptprodukt` muss Unterkategorien ohne dieses Hauptprodukt ausschließen (heute würde der Lauf 205 leere
   Konfi-Produkte anlegen; Pilot brauchte zusätzlich `--unterkategorie … --groesse …`).
7. `ops/plesk/`-Doku: „Node.js deaktivieren/aktivieren“ startet den LiteSpeed-Prozess (`lsnode`) nicht neu – nach
   einem Deploy immer „App neu starten“ und das Prozessalter prüfen. In Plesk-Aufgaben kein `%` (Cron-Zeilenende).

Tests für 5 und 6 (bestehende v3-DB → Abbruch; mit `--migrieren` → v4; Filter nur Unterkategorie mit Hauptprodukt).

## D · Shop-Einstieg: zusätzliches Motiv bricht das Sichern ab (eigener kleiner PR)

Befund Testkauf 26.10. (Host, Store `acryl`, Produkt 4100000 / `cfg_98436fb0…`): Kunde fügt im Shop-Editor ein
weiteres Motiv aus der Motivbibliothek hinzu (Haus) → `POST /api/shop-entry/acrylic-drafts` antwortet **503**
(„Der Konfigurator ist gerade nicht verfügbar“). Dieselbe Gestaltung ohne Zusatzmotiv → 201, Warenkorb 200, Checkout.
Bitte lokal nachstellen (`prepareAcrylicReview` → `assets.get/read` für Motivquellen des Acryl-Mandanten,
`drafts.acrylicDrafts.create`), Ursache beheben und eine verständliche Meldung statt 503 liefern. Falls Zusatzmotive
im Shop kostenpflichtig sind: ohne Preisvertrag klar ablehnen (wie Foto-Aufpreise), nicht 503. Test mit Motiv.

Zur Info, bereits behoben (Claude, `6516a66`): Die Warenkorb-Antwort sendete kein `paymentConfirmed:false`,
`shop-entry-client.mjs` verlangt es → Seite lehnte einen gültigen Warenkorb ab. Bitte bei Client-/Server-Verträgen
künftig einen gemeinsamen Test ohne nachgestellte Antwort.

## Nicht für Astra

Weg zur Testbestellung (Shop-Bindung, App-Proxy, Theme-Block, Webhook) macht Claude mit Chris' Freigaben.
Keine Live-Aktionen, kein Merge, kein Force-Push. Rückfragen als PR-Kommentar oder Issue an Claude.
