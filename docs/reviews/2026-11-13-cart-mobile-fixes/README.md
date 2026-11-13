# Prüfbelege: Menge und Handyvorschau

Lokale Korrekturen, noch kein Einbau. [Übergabe und Datei-Umfang](../../handoffs/2026-11-13-cart-mobile-fixes.md).

- `quantity/`: unverändertes Autorenpaket mit Basispins, finalen 13/13 Prüfungen, ursprünglichen Fehl-/Zwischenläufen und Patch. Die historische Quellenbasis d8bf96d bleibt im Autorenbeleg erhalten; der zwischenzeitliche Commit 1104811 enthält ausschließlich Auftragsdokumente.
- `mobile/`: unverändertes Autorenpaket mit drei Quelldateipins, finalen 5/5 Prüfungen und Patch. Frühere Zwischenstände werden nicht als finale Abnahme ausgegeben.
- `quantity-independent-review.md` und `mobile-independent-review.md`: unabhängige abschließende Quellen-/Hashreviews, ohne unnötige Wiederholung bestandener Tests.
- `browser-review.md` und `screenshots/`: Roots tatsächlicher lokaler Browsernachweis, getrennt von den Autorenprüfungen und von den früheren echten Shop-Proxy-Befunden.
- `local-build-proof.json`: tatsächlicher lokaler Build mit v9-Testdaten und synthetischen Bindungen. Keine Liveinstallation.

Die Originale dieser Belege bleiben unverändert im Arbeitsbereich. Ein Gesamtmanifest pinnt die fertige Kopie; die jeweiligen Autorenmanifeste beziehen sich weiterhin auf ihre eigenen Unterordner.
