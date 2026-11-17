# Shopify-Anbindung des neuen Konfigurators

Alles in diesem Ordner ist **vorbereitet und lokal getestet, aber nicht im Shop eingespielt**.

| Teil | Datei | Zweck |
|---|---|---|
| Knopf auf der Produktseite | `theme/gravuru-konfi-knopf.liquid` | Ein Baustein für alle Produkte mit `custom.customization_id` |
| Warenkorbzeile | `theme/gravuru-konfi-warenkorbzeile.liquid` | Bild der Gestaltung, sichtbare Angaben, Link „Bearbeiten“ |
| Preisfunktion | `funktion/rust` (Programm `preis`), Eingabe `funktion/preis.graphql` | Setzt den Stückpreis aus Variantenpreis + unterschriebenem Aufpreis, dann Mengenstaffel |
| Kassenprüfung | `funktion/rust` (Programm `pruefung`), Eingabe `funktion/pruefung.graphql` | Sperrt an der Kasse nur Zeilen ohne gültige Gestaltung |
| Referenzlogik | `funktion/logik.mjs` | Dieselben Regeln in JavaScript; Grundlage für Tests und Test-Shop |

## Was sich gegenüber heute ändert

- **Kein Preisvertrag je Produkt mehr** (Metafeld mit 10-kB-Grenze). Der Variantenpreis kommt aus Shopify selbst,
  der Aufpreis aus der unterschriebenen Zeilenangabe `_gravuru_preis`.
- **Keine Zähler mehr, denen blind vertraut wird.** Ändert jemand die Zeilenangaben, passt die Unterschrift nicht
  mehr und die Zeile wird an der Kasse gesperrt – nicht erst nach der Zahlung entdeckt.
- **Rust statt JavaScript.** Die Prüfung je Zeile kostet in JavaScript sehr viele Rechenschritte; die bisherige
  Funktion kam bei 15 Gestaltungen an Shopifys Grenze. Wie viele Rechenschritte die Rust-Fassung braucht, ist
  **noch nicht gemessen** (dafür ist Shopifys `function-runner` nötig).

## Vor einem Release zu erledigen

1. Eingabeabfragen gegen das aktuelle Funktionsschema prüfen (`cost.amountPerQuantity`, `shop.localTime`,
   Metafeld `$app:konfi_schluessel`). Die Feldnamen sind nach bestem Wissen gesetzt, aber nicht gegen Shopify geprüft.
2. `shopify.extension.toml` für beide Funktionen anlegen (Ziel und Exportname wie in
   `ops/shopify/einzelsperre-release/pruefung/shopify.extension.toml`) und mit `shopify app function run` testen.
   Die Programme lesen JSON von der Standardeingabe und schreiben JSON auf die Standardausgabe.
3. Geheimen Schlüssel einmal erzeugen und an zwei Stellen hinterlegen: Umgebungsvariable `GRAVURU_SCHLUESSEL`
   des Servers und App-Metafeld `konfi_schluessel` des Shops. Nie ins Repository.
4. App-Proxy `/apps/konfigurator/api/*` auf `<Server>/api/*` zeigen lassen.
5. Rechenschritte mit 1, 15 und 40 Gestaltungen messen und hier eintragen.

## Bauen und prüfen

```bash
cd funktion/rust
cargo build --release
cargo build --release --target wasm32-wasip1
```

```bash
node --test test/*.test.mjs
```

Der Test `funktion-rust.test.mjs` vergleicht die Rust-Fassung über 200 zufällige Warenkörbe mit der Referenzlogik.
