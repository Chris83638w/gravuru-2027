# Unabhängiger Review der Variantenauswahl über Position 250

11.11.2026. Rein lesender Review des isolierten Folgepatches zu `af6fd986c735d97bddc974261398ab8c4e88e00b`. Keine App-/Test-/Theme-/Serveränderung durch den Reviewer, keine zusätzliche Testsuite. Geprüft: `app/workshop/ui/shop-embed.mjs`, zugehöriger Diff in `shop-product-presentation.test.mjs`, bestehender nativer Start-/Bindingvertrag und die vorhandenen Theme-/Testbelege.

## Bestätigter Umfang

- Eine syntaktisch gültige, vom eigenen Liquid-Produkt gelieferte Startvariante bleibt außerhalb der ersten 250 IDs erhalten. Die Liste wird nicht vergrößert. Der reale lokale 808er Inventarbeleg enthält Variante `58104626479484` auf Position 331; der vorhandene isolierte Nachweis erhält diese ID sowohl beim direkten Start als auch nach einem eigenen Formularwechsel.
- Ein explizit fremder `data-product-id`-Besitzer schlägt bekannte IDs und die gemerkte Formularidentität. Ohne Produktmarker muss das Formular zuerst über eine bekannte bzw. die vom eigenen Liquid-Produkt gelieferte Auswahl identifiziert sein. Neue unbekannte Formulare erweitern die Auswahl nicht allein durch eine beliebige gültige ID. Gleichrangig widersprüchliche Hauptformulare übernehmen keine neue ID.
- `startHref` akzeptiert neben der bekannten Liste nur die eigene Liquid-Startauswahl und die intern gemerkte, eindeutig gelesene Auswahl. Ungeprüfte URL-Argumente erweitern diese Menge nicht. Die R15-Präsentation behält ihre vollständige geprüfte Liste, Hauptbild-Vorauswahl und gezielte bekannte URL-Auswahl; unbekannte R15-IDs bleiben ausgeschlossen.
- Vorwärmung und Seitenrückfall verwenden denselben Produkt-/Variantenlink. Die bestehenden Nachrichten-/Origin-/Tokenprüfungen, Ticketfristen, Preisberechnung, Cart-Übernahme und serverseitige Registry-/Tenant-/Store-/Freigabe-/Revisionsprüfungen sind außerhalb des Diffs und unverändert. Keine neue Geschäftsregel oder Preislogik.
- Der Autor belegt 15 Präsentationstests, einen vorhandenen globalen Embed-Test und zwei gezielte Server-Negativtests, zusammen 18 erfolgreich. Logs gelesen; kein eigener Wiederholungslauf. Der erste lokale Serverlauf scheiterte an Loopback-EACCES; der gesondert erlaubte Lauf prüft beide Fälle erfolgreich. Diese lokalen Prüfungen sind kein Livebrowser- oder Kaufnachweis.

## Paketbeleg und Abschluss

Beide Scratch-Dateihashes stimmen mit `over250-patch-manifest.json`; die Gegenstücke im Candidate entsprechen beim Review weiterhin den unveränderten af6-Ausgangsbytes. Patch SHA-256: `459de9b6478b1919532df84f29b4e281ff4a8bbf83dc17003fc680197cf4f9cb`.

Den gezielt abgefragten Minimalist-Sticky-Fall hat der Autor direkt am aktiven Theme abgeglichen: `snippets/sticky-atc-bar.liquid`, MD5 `e2cbf5d10160489b067a86595602f7c8`. Das Minimalist-Element besitzt laut diesem Quellrückbeleg in Zeilen 19–21 bereits `class="sticky-atc-bar …"`; sein Button verweist in Zeile 56 auf das Hauptformular, ohne eigenes Produktformular. Der normale Zweig besitzt in Zeilen 82–84 `class="sticky-atc-bar__inner …"` und ein eigenes Formular mit `class="sticky-atc-bar__form …"`. Der bestehende Klassenselektor erfasst beide. Dieser Theme-Auszug wurde vom Autor gelesen und als konkreter Reviewrückbeleg übermittelt, nicht vom Reviewer erneut live abgefragt.

**Kein verbleibender Fehler im eng geprüften Patchumfang.** Der Folgepatch erhält die Auswahlgrenzen und bestehende serverseitige Autorität. Eine tatsächlich ausgelieferte Fassung bzw. die Bedienung im Livebrowser wird damit nicht behauptet.

Der anschließend gespeicherte konkrete Theme-Lesebeleg `over250-sticky-theme-evidence.json` wurde ebenfalls gelesen; ID, MD5 und die genannten Zeilen stimmen mit dem Rückbeleg überein. Der reale lokale ID-331-Nachweis liegt in `over250-patch-real-data-check.mjs` und `over250-real-data-check.log`.
