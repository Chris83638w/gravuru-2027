# R15-Tempo, Team B, 19.11.2026

Kurskorrektur: nur der bestehende Prio-Konfi. Der Fixture-Warenkorb aus `docs/handoffs/2026-11-19-grok-beta-267/` ist Historie.

## Patch

`cart/data` prüft Preis und Revision zuerst (`prepared.resolve`) und wartet nicht mehr auf Shopify `fileCreate`. Die beim Speichern angestoßene Datei wird nur angehängt, wenn sie schon fertig ist. Sonst bleibt die an die Revision gebundene Vorschau (`_gravuru_bild` bzw. PNG). Die Übergabe wird nicht ein zweites Mal aufgebaut. Der Access-Token in `shopify-draft-token.mjs` war schon zwischengespeichert; die gemessenen 1,8 s lagen innerhalb des blockierenden Bildwartens und fallen mit diesem Warten aus dem Klickweg.

Seitenmodule des Einstiegs antworten mit ETag (`public, max-age=300`). Das HTML bleibt `no-store`.

Nicht übernommen: Memo um `selectedDoorbellProfile`. Die eigene Prüfung von #268 zeigte nach der Profilwiederverwendung in `adapter.mjs` keinen zusätzlichen messbaren Gewinn, und eine geteilte Rückgabe bricht den Editor.

## Vorher, aus der Live-Aufnahme

`docs/measurements/2026-11-17-konfi-tempo-p1-1b/live-sanitized.json`, Ereignis `cart/data` um 14:32:38 UTC: gesamt 6664 ms, davon `checkout_image_wait` 3811 ms. Darin liegen `shopify_poll_wait` 2251 ms und `access_token` 1950 ms. `cart_prepare` 1373 ms und `cart_revalidate` 1081 ms laufen zusätzlich. Das sind die aufgezeichneten Latenzen, kein neuer Shop-Lauf.

Nachher, lokal, ohne Shopify: `app/workshop/shop-cart-preview.test.mjs` lässt ein Bild 2200 ms und 3400 ms brauchen. Die gesicherte Vorschau kehrt in allen drei Läufen in unter 100 ms zurück. Ein fehlendes Bild bleibt ein Fehler. `theme-cart-flow.test.mjs` lehnt eine geänderte Zuordnung und einen geänderten Preis weiterhin ab, bevor die Antwort geht.

## Alt-Lösung gegen R15

| Alt-Lösung / Quelle | Heutiger R15-Pfad | Ansatz | Nutzen oder Ablehnung |
| --- | --- | --- | --- |
| Variante C, Designwechsel gefühlt sofort. Renderer-Name `variant-c-funkklingel/v5` in `app/designs/aosu-labrador/SETUP.md`. Der schnelle Ring ist derselbe Editor `_merchant-acryl-editor.html`. | `selectedDoorbellProfile` in `doorbell-selection.mjs`, aufgerufen aus `contract.mjs`. Wechsel ohne Netz, Kosten in `structuredClone`. | Profil nicht noch einmal memoieren. | Abgelehnt. Prüfung von #268: nach 436 auf 63 Aufrufe kein zusätzlicher messbarer Gewinn. |
| Sichtbare Kacheln zuerst, höchstens 24 je Durchlauf. | Schon in `workflow.mjs` Zeilen 203–215. | Nichts Neues. | Bereits vorhanden. |
| Vorladen vor dem Klick, aus bei Datensparmodus. | `shop-warm.mjs` `savingData`, `shop-embed.mjs` etwa Zeile 296. | Nicht abschalten. | Der Datensparmodus lässt Karten leer, weil die Konturen nicht nachgeladen werden. |
| #268 `ac8e1384`: sichtbare Karte lädt ihre Kontur auch ohne Vorladen. | `doorbell-lazy-designs.mjs` hat diesen Beobachter auf diesem Branch nicht. | Nicht kopiert. | Gemessen war der Gewinn in der Prüfung von #268 (Handy, kalt, über 3 s auf etwa 22 ms). Er gehört in den geprüften #268-Patch, nicht ungeprüft hierher. |
| Früher Kundenexport und Bestellung #1017 aus dem Browser. | Fertigung aus dem gesicherten Prüfstand, `acrylic-artwork.mjs`. | Reihenfolge nicht zurückdrehen. | Abgelehnt. Der heutige Weg prüft den Bestand serverseitig. |
| Zakeke und FPD. | `PRIO-KONFI.md` Abschnitt 6, STATUS 18.11. | Keine Übernahme. | FPD ist ein Eindruck, keine Messung. Zakeke liefert keine Galerie-nach-Shop-Synchronisation. |
| Astra: zwei Bildprüfungen beim Speichern zusammenlegen, Erwartung einige Zehntelsekunden. Entwurf 6,2–6,3 s in 4 von 12 Fällen. | `acrylic-review.mjs` ruft `preparePhoto` für Original, Kundenbild und Referenz getrennt auf. `cart/data` wartet danach noch auf `checkout_image_wait`. | Die zwei Importe nicht anfassen. | Die Zehntelsekunden treffen nicht die 3811 ms Bildwarten im Klick. Ein gemeinsamer Importer müsste die PNG-Bytes unverändert lassen; das ist hier nicht nachgewiesen. |

## Herausforderung an Astras Reihenfolge

Die 6,2–6,3 s sind Entwurfsantworten beim Speichern, nicht `cart/data`. Vier von zwölf Fällen sind Ausreißer des Speicherwegs. Der belegte Mehrsekundenposten danach ist `checkout_image_wait` mit Poll und Token. Ihn aus dem Klick zu nehmen ändert die Bildbytes nicht und lässt `prepared.resolve()` vor der Antwort laufen. Ein zusammengelegter Fotoimport kann zusätzlich helfen, ersetzt diesen Schritt aber nicht.
