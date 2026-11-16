# Minimaler Folgepatch für die Startvorauswahl

Nur Vorschlag, **nicht implementiert**. `af6fd98` bleibt unter Operatorabnahme unverändert. Reproduktion: `main-variants-over250-review.md` und `main-variants-over250-proof.json` (6 gezielte Fälle, keine Live-/DB-Schreibzugriffe).

**Kleinste Dateigruppe:** `app/workshop/ui/shop-embed.mjs` und `app/workshop/shop-product-presentation.test.mjs`. Bestehende globale Embed-Prüfung in `shop-entry-client.test.mjs` zusätzlich gezielt ausführen; dort nur bei tatsächlich nötiger Fixture-Ergänzung ändern. Kein Theme-, Backend-, Preis- oder Warenkorbpatch erforderlich, um diese Vorauswahl zu korrigieren.

## Konkrete Änderung

1. `pageConfig()`: Die syntaktisch gültige `raw.variantId` stammt im aktiven Footer direkt von `product.selected_or_first_available_variant.id` desselben Produktobjekts. Sie muss als aktuelle Auswahl erhalten bleiben, auch wenn sie nicht in den ersten 250 `raw.variants` vorkommt. Listenlänge/Formatprüfung unverändert; kein Auffüllen mit erfundenen IDs und keine Erweiterung auf 808/2048. Ist die ausgewählte ID ungültig, bestehender sicherer Rückfall wie bisher.
2. `productForms()/currentVariant()`: Ein Formular mit **explizit passender Produktzugehörigkeit** darf seine aktuelle gültige Varianten-ID auch außerhalb der Teilliste liefern. Die aktive Theme-Datei `sections/main-product.liquid:38–42` belegt bereits `<product-info id="MainProduct-…" data-product-id="{{ product.id }}">`; `snippets/buy-buttons.liquid:43–54` erzeugt darin das Produktformular und `[name="id"]` aus demselben Produkt. Diese vorhandene nächstliegende Produktzuordnung verwenden. Explizit fremde Produktzugehörigkeit immer ausschließen; ohne solchen Beleg den bisherigen bekannten-ID-Fallback erhalten. Haupt-Kaufformular vor Ratenzahlungs-/Sticky-Kopien priorisieren, wie im vorhandenen R15-Zweig; bei widersprüchlichen gleichrangigen Hauptformularen keine unbestätigte neue Auswahl übernehmen.
3. `startHref()`: Neben der bekannten Teilliste nur die erhaltene aktuelle Liquid-Auswahl und die zuletzt aus einem eindeutig zugeordneten eigenen Formular gelesene aktuelle Auswahl akzeptieren. Letztere kann als interne WeakMap-Information geführt werden. **Keine beliebige fremde ID aus Aufrufargument oder `?variant=` pauschal akzeptieren.** Dadurch bleiben auch Vorwärmung und Klick beim selben aktuellen Paar aus Produkt/Variante. R15-Darstellung/404er Manifest und deren gezielte URL-Vorauswahl unverändert.

Der Browser bestimmt damit lediglich eine Startanfrage. Syntaktisch gültig oder dem eigenen Formular zugeordnet bedeutet **nicht** serverseitig freigegeben: Die unveränderte signierte Startstrecke muss das vollständige Paar aus Shopify-Produkt und -Variante weiterhin über genau eine aktive Registry-Zuordnung mit passendem Store, Mandanten, Produktstand und Freigabe bestätigen. Unbekannte/fremde Varianten bleiben dort 404/409; keine Zuordnung wird vom Browser erzeugt. Preis und Warenkorb stammen weiterhin aus gespeichertem Entwurf und nativer Bindung.

## Benötigte gezielte Regressionen

- 250er Teilliste + tatsächliche ausgewählte ID 331: `pageConfig → currentVariant → startHref` erhält ID 331, ohne die Teilliste zu vergrößern.
- Formularwechsel von einer bekannten auf eine weitere ID außerhalb der Liste, unter passendem `product-info[data-product-id]`: Startlink und Ticket enthalten die neue ID; spätere Rückwahl der ersten Variante funktioniert.
- Fremde Produktempfehlung mit eigener Produktkennung; gleicher/anderer ID-Wert; veraltete Sticky- und Ratenzahlungsfelder: kein Übernehmen ihrer Auswahl. Fehlende oder widersprüchliche Produktzuordnung erweitert den bekannten-ID-Bereich nicht.
- Ungültige ID, fremdes beliebiges Argument an `startHref`, wiederholter/ungeprüfter URL-Parameter: keine Umleitung auf eine unbestätigte Auswahl. Bestehende Eingabe- und Rückwegvalidierung bleibt bestehen.
- Vorhandene Edelstahl-R15-Fälle mit 404 IDs, Startbild-Vorauswahl, bewusster späterer Auswahl und Rücksprung ohne Fenster bleiben grün.
- Ein enger vorhandener Server-Negativtest für unbekanntes/fremdes Produkt-Varianten-Paar muss weiterhin ablehnen. Der bereits erfolgreiche isolierte ID-331-Cartnachweis muss unverändert bleiben; keine breite Suite.

**Theme-Lesebeleg:** MAIN `190984126844`, `sections/main-product.liquid` MD5 `793d3db4bce6e0877034d89a06ca8015`; `snippets/buy-buttons.liquid` MD5 `a8e22ebd9c0fc50a1ed6c643f486d8eb`. Nur lesend über Shopify abgefragt. Die tatsächlich ausgelieferte JS-Fassung bleibt wegen HTTP 403 vom Operator abzugleichen.

**Besonderheit des konkreten Hauptprodukts:** Der derzeitige falsche Rückfall auf `58104615666044` ist „Rechteck · 8 × 2 cm / Schwarz / Ohne Bohrung“ und gehört zu den 30 Bestandsvarianten außerhalb des v9-Hauptprodukts. Je nach noch festzulegender tatsächlicher Bindungsfortschreibung kann damit später ein älterer Produktstand oder ein abgewiesener Start entstehen. Das ist eine Folgeoption, kein hier nachgewiesenes Liveverhalten; die Start-ID muss deshalb im Piloten ausdrücklich kontrolliert werden.
