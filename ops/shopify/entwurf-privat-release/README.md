# Entwurfsnachweis unter privatem Schlüssel – Folgefassung beider Funktionen (vorbereitet, nicht veröffentlicht)

Chris, 21.11.2026, 15:22 Uhr: Die Zeilenangabe „Bearbeitbarer Entwurf: gravuru:proof_…“ soll für Kunden nicht mehr sichtbar sein. Ablauf, Reihenfolge und Rückweg stehen in der [Übergabe](../../../docs/handoffs/2026-11-21-entwurf-privat.md).

Dieser Ordner ist die Quelle der Folgefassung von Preisfunktion (`preis/src`, Handle `gravuru-personalization-price`) und Kassenprüfung (`pruefung/src`, Handle `gravuru-checkout-guard`). Grundlage ist Datei für Datei die aktive Fassung in `../einzelsperre-release/`. Geändert sind genau drei Dinge:

1. Beide Eingabeabfragen lesen zusätzlich `designPrivate: attribute(key: "_gravuru_entwurf")`.
2. `master-release/cart_transform_run.mjs` (in beiden Ordnern gleich) setzt `withDesignReference` vor die unveränderte Prüfung: Der Nachweis gilt unter dem privaten oder dem sichtbaren Schlüssel. Tragen beide einen Wert und sind die Werte verschieden, wird die Position abgewiesen wie jede andere ungültige (kein Preis, an der Kasse gesperrt).
3. Sonst nichts. Alle übrigen Dateien sind bytegleich zur aktiven Fassung; das prüft `entwurf-privat-release.test.mjs`.

Hier liegt keine Wasm-Datei und keine App- oder Versionskennung. Gebaut wird mit der Shopify-CLI (zuletzt 4.9.0, `@shopify/shopify_function` 2.0.1, siehe `../einzelsperre-release/bundle.json`).

- `pruefe-wasm.mjs`: vergleicht die gebauten Dateien Fall für Fall mit dieser Quelle und liest die Anweisungszähler (Grenze 11 Mio.).
- `../entwurf-privat-version.mjs`: vergleicht den Shopify-Kandidaten mit der aktiven Version (nur die zwei Funktionen: neue Abfrage, neue Datei).

Prüfen: `node --test ops/shopify/entwurf-privat-release/entwurf-privat-release.test.mjs ops/shopify/entwurf-privat-version.test.mjs`.
