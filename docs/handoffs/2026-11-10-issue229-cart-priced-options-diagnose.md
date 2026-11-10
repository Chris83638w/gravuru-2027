# #229: vier rote Zubehör-Warenkorbtests eingeordnet

10.11.2026, Mika/Codex; eigener Branch `dev/mika-cart229-20261110` auf Claude `8e394cd0e440b94ef3b1b2c08bd32c92c3b40dc5`. **Nur neue lokale Prüfungen und dieser Bericht. Kein Produktivcode, keine UI, kein Live-/Shopifyzugriff und keine bestehende Preisprüfung geändert.**

Auftrag: [Prioritätswechsel #229, Kommentar 6765906978](https://github.com/Chris83638w/gravuru-2027/issues/229#issuecomment-6765906978). Die nachfolgenden Claude-Kommentare wurden ebenfalls gelesen; laut Kommentar 6766553764 ist Paket 1a-2 inzwischen live. Dieser Bericht prüft lokale Gitstände, nicht diesen Live-Stand erneut.

## Ergebnis

**Ein Test-/Versionskonflikt mit einer echten, eng begrenzten Funktionslücke — kein durch Claudes Cache verursachter Preisfehler.** Die vier Tests verlangen den vorbereiteten V3-Vertrag für bezahlte Zusatz-Checkboxen. Der aktive Serververtrag unterstützt bewusst nur V1/V2. Alle vier scheitern schon beim Aufbau derselben Testfixture, bevor ihre eigentlichen Warenkorb-/Manipulationsassertionen laufen.

V3 fehlt nicht bloß in der Fixture: Bezahlte `profile.optionFields` sind auf dem geprüften aktuellen Kundenweg tatsächlich noch nicht bestellbar. Der Server weist sie strikt ab; die neuen Prüfungen zeigen **keine stillschweigende Berechnung nur des Grundpreises**. Daraus folgt weder eine pauschale Sperre aller Produkte noch eine erneute Freigabe bereits bestehender Preisstände.

## Reproduktion und genaue Ursache

Unveränderte Originaldatei `app/workshop/cart-priced-options.test.mjs`:

| Zeile | Testname | Ergebnis auf beiden Ständen |
|---|---|---|
| 30 | both confirmed slate base prices and all eight accessory combinations agree through editor, snapshot, attributes and checkout | Fehler im Fixture |
| 42 | tampered field amounts, false values, duplicates and unpriced paid fields are rejected before cart creation | Fehler im Fixture |
| 48 | app-owned prices must match the saved product and unsupported paid input kinds stay blocked | Fehler im Fixture |
| 55 | checkout accepts the explicit no-options marker and rejects missing, unknown, duplicate or browser-priced options | Fehler im Fixture |

Beide lokal ausgeführten Läufe: **0/4 bestanden, 4/4 fehlgeschlagen, 0 übersprungen**, jeweils `cart_personalization`, HTTP-Status 422. Vergleichsbasis `8ceb866be1ed7b85fd8b0813babe78a833b60d11`, Claude-Stand `8e394cd0e440b94ef3b1b2c08bd32c92c3b40dc5`.

1. Testzeile 14 setzt `schema: gravuru-personalization-pricing/v3` und `optionPrices`; Zeile 16 ruft `capturePersonalization` auf.
2. `app/workshop/cart-personalization.mjs:35` erlaubt nur V1/V2; der gemeinsame Guard wirft in Zeile 41. Auch eine leere Zubehörwahl erreicht deshalb die Testassertion nicht.
3. `personalizationForSnapshot` lehnt in derselben Datei, Zeile 79, einen positiven `fieldCents`- oder `backCents`-Betrag ab. Bloß die Testfixture von V3 auf V1 umzubenennen würde den fehlenden Anschluss nicht beheben.
4. Die Attribute-Funktion ab Zeile 123 enthält keine `_gravuru_options`-Ausgabe. Der vorbereitete Shopify-Quellkandidat dagegen enthält den V3-Zweig unter `ops/shopify/master-release/cart_transform_run.mjs:16–26`.
5. `git diff 8ceb866b 8e394cd0 -- app/workshop/cart-priced-options.test.mjs app/workshop/cart-personalization.mjs` ist leer.

Die Herkunft ist eindeutig: Commit **`16eda6117945ff6e13c828ea2bf7781a853285d6`** vom 08.11. („Pin exact active V2 pricing and projected variant start model“) entfernte die vorbereitete V3-Serverlogik, um die tatsächlich aktive V2-Preisstrecke zu erhalten. Die vier Kandidatentests blieben stehen. Der bereits vorhandene Test `cart-personalization.test.mjs:57` verlangt im Gegensatz dazu ausdrücklich die Ablehnung des nicht installierten V3-Vertrags.

Die historischen V3-Tests nennen 21,99/23,99 EUR. Das sind keine erneuten Produktpreisfreigaben. Sie werden in diesem Auftrag weder auf andere Preise angepasst noch zu grünen V1/V2-Erfolgstests umgedeutet.

## Neue enge Nachweise

`app/workshop/cart-priced-options-diagnostic.test.mjs`: **3/3 bestanden, 0 Fehler/Skips**, echte native Funktionen und temporäre In-Memory-SQLite, keine Netztransporte.

- Ein V3-Preistarif wird vor dem Schreiben einer Bindung oder eines Angebots abgewiesen: beide Tabellen bleiben leer.
- Derselbe V1-Grundtarif ohne Zusatzwahl ist gültig. Alle **sieben nicht leeren Kombinationen** der drei historischen Zubehör-Checkboxen werden korrekt im Editor berechnet, aber vor dem Speichern eines Warenkorbangebots mit 422 zurückgewiesen. Angebotszähler bleibt nach jedem Versuch null.
- Eine bezahlte `optionGroups`-Montagevariante bleibt gültig: native Auflösung → feste Variantenbindung → gespeichertes Angebot → Checkout-Transform ergeben jeweils denselben Preis. Eine falsche, günstigere Varianten-ID wird abgewiesen.

Zusätzlich unveränderte `cart-personalization.test.mjs` und `customer-vector-logo-pricing.test.mjs`: **22/22 bestanden, 0 Fehler/Skips**. Diese prüfen u. a. Fotoinklusion/Zusatzfoto, getrennte SVG-Logokosten, Motive, Mengenstaffeln und Rundung, alte Preisstände, feste gespeicherte Angebote, manipulierte Zählwerte, Wiederöffnung und simulierte Bestellannahme. Zusammen **25 positive gezielte Prüfungen**; die vier ursprünglichen V3-Erwartungstests bleiben bewusst unverändert rot. Keine Gesamtsuite oder aktuelle Live-Bestellung behauptet.

Reproduktion:

```powershell
node --test app/workshop/cart-priced-options.test.mjs
node --test app/workshop/cart-priced-options-diagnostic.test.mjs
node --test app/workshop/cart-personalization.test.mjs app/workshop/customer-vector-logo-pricing.test.mjs
```

Der erste Befehl soll auf beiden genannten Ständen die vier beschriebenen Fehler reproduzieren. Die letzten beiden prüfen die tatsächliche Freigabegrenze. Strukturierter lokaler Nachweis: `docs/reviews/2026-11-10-issue229-cart-priced-options/proof.json`.

## Konsequenz für die Produktkette #230

**Station 4 kann die bestehende Variantenstrecke benutzen.** Bereits bestätigte Befestigungen, Bohrungen und Klebebänder dürfen als echte `profile.optionGroups`/`familyFormats`-Ausführungen in den jeweiligen Shopify-Variantenpreis eingehen. Der Preisvertrag bindet den vollständigen Grundpreis dieser Variante; das braucht keine V3-Zubehör-Checkbox. Optionen und Beträge müssen trotzdem aus der aktuellen bestätigten Produktquelle stammen. Es werden hier keine neuen Kombinationen erzeugt oder bestätigt.

| Vorgang | Vorhandener Weg | Grenze |
|---|---|---|
| Form/Größe/Befestigung/Klebeband | native Ausführung → Shopify-Variantenpreis, V1/V2 | genaue Variantenbindung und Preisfreigabe erforderlich |
| Zusätzliches Motiv | getrennte Zählung im bestehenden Preisvertrag | 1,69 EUR nur nach dem jeweiligen Produktvertrag; Vorlagen-/Alle-Motive-Regel nicht verändern |
| Foto | vorhandener Upload-/Fotovertrag | 9,99 EUR und enthaltene Fotos aus der Produktrevision; kein automatisches Fotorecht auf Edelstahl |
| SVG-Logo | V2, separate Logozählung | 12,99 EUR im freigegebenen Stahl-Logomodul; Modul-/Materialrechte bleiben bestehen |
| Bezahlte dynamische Zusatz-Checkbox (`optionFields`) | Editor vorhanden, V3-Kandidat vorbereitet | aktueller Kundenserver weist ab; noch kein vollständiger aktiver V3-Weg |

Historischer Live-Beleg, ausdrücklich keine heutige Wiederholung: `docs/handoffs/2026-11-08-steel-pricing-input-fix.md:45` dokumentiert AB 12×8/K00 19,99 EUR, RE 15×10/KGL 26,98 EUR und Retro2 9×6/B02 mit SVG-Logo 30,47 EUR sowie korrekte Mengenänderung. Er zeigt, dass Montage als Variantenpreis und Logo als eigener V2-Zuschlag zusammen funktionieren können.

#230 wurde beim Audit bis Kommentar **6768691678** gelesen: Der Operator nennt inzwischen `bf8824c`/Acryl-v4 mit 77 Größen und 778 Kombinationen sowie einen gesonderten, noch bestätigungspflichtigen Edelstahl-Änderungsplan 80→77 Größen / 404→389 Varianten. Dieser Befund ist keine Freigabe des Plans. Keine dieser produktiven Daten wurde geändert.

## Kleinster nächster Schritt

1. Für den Pilot die bereits vorhandenen und bestätigten Variantenpreise nutzen; nicht zur Umgehung spontan Checkboxen in neue Varianten oder Preise umwandeln.
2. Die vier historischen V3-Erfolgstests als **Kandidatentests eines noch nicht installierten Vertragspakets** einordnen. Keine Skip-/Xfail-Kosmetik und keine abgeschwächte Preisprüfung. Die neuen Negativtests sichern die heutige aktive Grenze.
3. Soll Schiefer mit bezahlten unabhängigen Zubehör-Checkboxen verkauft werden, braucht es ein gesondert abgestimmtes V3-Paket: Backend, gespeicherter Preisvertrag, Attribute, tatsächlich eingesetzte Shopify-Function samt `value`-Decoder, unveränderte V1/V2-/Modul-/Historienprüfungen und echte Warenkorbabnahme. Nicht einfach den älteren V3-Kandidatencode in die aktuelle Datei kopieren.
4. Vor einer Verkaufsaussage je Linie aktuellen Preisvertrag und echte Testwarenkörbe prüfen. Dieser lokale Audit beweist die Ursache und den sicheren Abbruch, ersetzt aber weder Produktfreigaben noch Live-Abnahme.

Der verbindliche [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unberührt; dieser Auftrag enthält keine Designbearbeitung. Preis-/Modul-/Optionsbestätigung und versionierte Produkt-Excel nach #227 bleiben für jedes neue Produkt erforderlich.
