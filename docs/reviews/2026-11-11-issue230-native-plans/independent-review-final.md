# Unabhängiger Abschlussreview – #230 B, lokaler Lauf v6

11.11.2026 · Prüfer `search_preview` · ausschließlich lesend gegen `work/product-plans-run-v6`.

**Sieben echte persistierte native Planpaare nachgewiesen; alle geprüften Identitäten und Preise stimmen.** Das sind weiterhin **unbestätigte lokale Prüfpläne**. Alle sieben enthalten offene fachliche Punkte und `valid:false`; kein Plan ist als ausführungs- oder veröffentlichungsbereit abgenommen.

## Unabhängig ausgeführte Prüfungen

- SQLite nur mit `readOnly:true` geöffnet: **7 Quellprodukte, 7 gespeicherte Pläne, 0 Bestätigungen, 0 Ausführungen**.
- Für jedes Paar: exportiertes Plan-JSON = gespeicherter Plan, nativer Planhash korrekt, Quelldokument = gespeicherte Revision, Vorlagenhash/Revision und Planquellen korrekt, Excel-SHA im `creationKey` enthalten. Alle Prüfungen bestanden. Die sechs kleinen Planprodukte wurden nach Anwendung ihres tatsächlich gespeicherten und gepinnten cmp-Modulprofils mit der Quelle verglichen. Die Modulprofil-IDs, Revisionen und Hashes stimmen mit SQLite und Plan überein; nur die vorgesehene Moduleinschränkung verändert die kompilierte Quelle.
- **823 Variantenpreise** unabhängig mit der unveränderten Excel-Extraktion verglichen: Hauptacryl 778, Acryl klein je 10, Stahl klein je 5. **0 Abweichungen**. Optionskombinationen je Plan eindeutig.
- Rang 0 steht vor Rang 1 in jeder Designbank und jedem Format. Die doppelte Katalog-ID `TRE-V2A-7x2-D34` erscheint nur einmal und behält Rang 0.
- Sechs kleine Produkte verweisen auf ein tatsächlich gespeichertes natives Motivprofil mit genau den bestätigten **13 Motiv-IDs**. Profilrevision, gespeicherte Auswahlmetadaten und Katalog-IDs stimmen überein. `schmetterlinge-1.svg` ist ausgeschlossen; eingebettete Original-Motivressourcen bleiben gegenüber der vorherigen nativen Quellkonvertierung identisch.
- Keine zirkuläre „Station 3 fehlt“-Frage mehr in den fachlichen `openQuestions`. Die native Bestätigungs-/Ausführungskette schützt dies bereits gesondert.

Belege: `review-v6.json`, `review-v6-details.json`. Reproduktion: `review-persisted-plans.mjs` und `review-final-details.mjs`.

## Korrigierte Befunde aus dem Review

1. **Katalogzählung:** 1.298 Listenzeilen sind 1.297 eindeutige IDs. Das Hauptprodukt hat 1.217 Zeilen / 1.216 IDs, davon 1.205 nativ übernommen. Zwei IDs sind im Katalog absichtlich ausgeblendet; neun bestehen die nativen Kontur-/Randprüfungen nicht. Die vorhandenen Ausblendungen bleiben erhalten.
2. Die Rangsortierung bewahrt bei der doppelten D34 die erste Zeile mit Rang 0.
3. Katalog-HEAD und saubere versionierte Quellen werden vor dem Quellbau geprüft; unbekannte Quelldateien werden dort zurückgewiesen.
4. Datenbankzähler werden tatsächlich aus den nativen Tabellen gelesen.
5. Fehlende Bestätigung wird nicht selbst zum fachlichen Planhindernis gemacht.

## Verbleibende Grenzen

- Die vorgeschlagenen Startdesigns, offenen Module sowie weitere ausdrücklich offene Excel-Angaben sind keine erfundenen Nutzerentscheidungen. Sie stehen weiter im jeweiligen Plan.
- Der Anschluss der automatischen Motivplatzierung für Kleinformate ist noch offen. Das gespeicherte 13-Motivprofil belegt die Auswahl, keine fertig geprüfte Kundenbedienung.
- Neun Hauptproduktdesigns brauchen eine gesonderte Lösung bzw. Sichtentscheidung zu den nativen Rand-/Konturbefunden. Es wurde keine Gestaltung verändert.
- Das Motiv-Auswahlprofil steht in `profileAssignments` als Profil-ID; seine Revision wird separat durch die gespeicherten Metadaten und das Paket belegt. Der Produktplanservice prüft solche Bibliotheksrevisionen bei `confirm` nicht selbst wie seine gesonderten Modulprofile. **Vor einer späteren Ausführung daher das beigelegte Profil und seine Revision/Prüfsumme erneut vergleichen.** Dieser Review behauptet keine zusätzliche Laufzeitsicherung.
- Keine Server-, Shopify-, Bindungs- oder Kundenänderung. Kein Render-/Browser-/Warenkorbnachweis in diesem Review.


## Ergänzung v6: präziser Modulvorschlag

Die sechs Kleinproduktpläne enthalten jetzt echte, nach ID/Revision/Hash gebundene cmp-Modulprofile: Optionen, Designs, Text und Motive an; Foto, Logo und freie Farbwahl aus. Das ist ein ausdrücklich unbestätigter Vorschlag. Die native Stahlquelle kann Logo weiterhin als Fähigkeit besitzen; der konkrete Plan schaltet es korrekt aus. Hauptacryl bleibt im vorhandenen Quellenstand mit Foto an und Logo aus. Fachliche offene Fragen und valid:false bleiben erhalten.

Reproduktion mit expliziten Pfaden (neue Ausgabedateien verwenden):

```text
node review-persisted-plans.mjs FINALER_LAUF NEUER_REVIEW_JSON CODE_REPO
node review-final-details.mjs FINALER_LAUF KATALOG_REPO CODE_REPO ERSTER_QUELLENLAUF NEUER_DETAIL_REVIEW_JSON
```

Der erste Quellenlauf bezeichnet die initiale native Konvertierung (in dieser Sitzung v3), bevor Rangsortierung, Auswahlprofil und Modulprofil ergänzt wurden. Für eine externe Reproduktion diesen Quellenlauf erneut erzeugen. Die Skripte benötigen das separat gepinnte Code-Repo; eine vollständige Runtime muss nicht im Prüfarchiv liegen. Die 14 Negativprüfungen des Autors wurden in diesem unabhängigen Review nicht als eigene Testausführung gezählt.