# Shopify-Anbindung des neuen Konfigurators

Alles in diesem Ordner ist **vorbereitet und lokal getestet, aber nicht im Shop eingespielt**.

| Teil | Datei | Zweck |
|---|---|---|
| Knopf auf der Produktseite | `theme/gravuru-konfi-knopf.liquid` | Ein Baustein für alle Produkte mit `custom.customization_id` |
| Warenkorbzeile | `theme/gravuru-konfi-warenkorbzeile.liquid` | Bild der Gestaltung, sichtbare Angaben, Link „Bearbeiten“ |
| Preisfunktion (Erweiterung) | `erweiterung/gravuru-konfi-preis/` | Setzt den Stückpreis aus Variantenpreis + unterschriebenem Aufpreis (mit Währungskurs), dann Mengenstaffel |
| Kassenprüfung (Erweiterung) | `erweiterung/gravuru-konfi-pruefung/` | Sperrt an der Kasse nur Zeilen ohne gültige Gestaltung; im Warenkorb nie |
| Rechenkern | `funktion/rust` | Die Regeln in Rust, von beiden Erweiterungen benutzt; dazu zwei kleine Programme `preis`/`pruefung` für den Kreuztest |
| Referenzlogik | `funktion/logik.mjs`, `funktion/zufall.mjs` | Dieselben Regeln in JavaScript und der Erzeuger für Zufalls-Warenkörbe; Grundlage für Tests und Test-Shop |
| Prüffälle | `erweiterung/fixtures/`, erzeugt von `erweiterung/fixtures-erzeugen.mjs` | 150 Warenkörbe mit dem Ergebnis der Referenz |

## Was sich gegenüber heute ändert

- **Kein Preisvertrag je Produkt mehr** (Metafeld mit 10-kB-Grenze). Der Variantenpreis kommt aus Shopify selbst,
  der Aufpreis aus der unterschriebenen Zeilenangabe `_gravuru_preis`.
- **Keine Zähler mehr, denen blind vertraut wird.** Ändert jemand die Zeilenangaben, passt die Unterschrift nicht
  mehr und die Zeile wird an der Kasse gesperrt – nicht erst nach der Zahlung entdeckt.
- **Rust statt JavaScript.** Die Prüfung je Zeile kostet in JavaScript sehr viele Rechenschritte; die bisherige
  Funktion kam bei 15 Gestaltungen an Shopifys Grenze. Wie viele Rechenschritte die Rust-Fassung braucht, ist
  **noch nicht gemessen** (dafür ist Shopifys `function-runner` nötig).

## Stand der Erweiterungen (17.11.2026)

| | Preis | Kassenprüfung |
|---|---|---|
| Ziel | `cart.transform.run` | `cart.validations.generate.run` |
| Export in der Wasm-Datei (geprüft) | `cart_transform_run` | `cart_validations_generate_run` |
| Größe | 78.237 Byte | 71.342 Byte |
| Schema | echtes Shopify-Schema 2026-07 (aus der bestehenden Erweiterung im Repo `gravuru-shopify`) | **handgeschriebener Ausschnitt** – vor Release ersetzen |
| Vergleich mit der Referenz | 150 Warenkörbe, 151 Preisänderungen gleich | 150 Warenkörbe, 540 Sperrtexte gleich |

Was das **nicht** belegt: Die Erweiterungen sind nie von Shopify ausgeführt worden. Der Test läuft auf dem
Rechner, nicht in Shopifys Umgebung.

Bekannte Bedingungen von Shopify (Quelle: shopify.dev, Cart Transform Function API, gelesen 17.11.2026):

- Preisänderungen je Zeile (`lineUpdate`) gehen nur in Entwicklungs-Shops und Shopify Plus. Der Shop ist laut
  `docs/sicherung/2026-11-16-gesamtstand.md` Shopify Plus.
- **Je App und Shop ist höchstens eine Preisfunktion möglich.** Die bestehende App hat bereits
  `gravuru-personalization-price`. Die neue kann also nicht daneben in derselben App laufen: Test nur in einem
  Entwicklungs-Shop oder mit einer eigenen Test-App; im echten Shop wäre es ein Austausch, kein Zusatz.

## Vor einem Release zu erledigen

1. In `erweiterung/gravuru-konfi-pruefung/` das Schema durch das echte ersetzen: `shopify app function schema`.
   Nicht gegen Shopify geprüft sind dort `Input.shop` und `Shop.localTime`; fehlen sie, braucht die
   Kassenprüfung das Datum auf anderem Weg (dann bleibt die Ablaufprüfung allein bei der Preisfunktion).
   In der Preisfunktion sind alle benutzten Felder durch das echte Schema belegt.
2. Beide Ordner in den Ordner `extensions/` der Shopify-App legen (der Rechenkern `funktion/rust` muss
   mitkommen, die Erweiterungen verweisen mit `../../funktion/rust` darauf) und mit `shopify app function run`
   testen. Die `uid` trägt Shopify CLI beim ersten `shopify app dev` selbst ein.
3. Geheimen Schlüssel einmal erzeugen und an zwei Stellen hinterlegen: Umgebungsvariable `GRAVURU_SCHLUESSEL`
   des Servers und App-Metafeld `konfi_schluessel` des Shops. Nie ins Repository.
4. App-Proxy `/apps/konfigurator/api/*` auf `<Server>/api/*` zeigen lassen.
5. Rechenschritte mit 1, 15 und 40 Gestaltungen messen und hier eintragen. Aus dieser Arbeitsumgebung nicht
   möglich: Shopifys `function-runner` liegt auf GitHub, der Abruf wird hier abgewiesen (HTTP 403).

## Bauen und prüfen

```bash
cd funktion/rust
cargo build --release
```

```bash
node erweiterung/fixtures-erzeugen.mjs
```

```bash
cd erweiterung/gravuru-konfi-preis
cargo test
cargo build --release --target wasm32-unknown-unknown
```

```bash
cd erweiterung/gravuru-konfi-pruefung
cargo test
cargo build --release --target wasm32-unknown-unknown
```

```bash
node --test test/*.test.mjs
```

Der Test `funktion-rust.test.mjs` vergleicht die Rust-Fassung über 200 zufällige Warenkörbe mit der Referenzlogik.
