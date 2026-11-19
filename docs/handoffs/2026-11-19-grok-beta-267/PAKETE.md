# Teilpakete V0

| Paket | Stand | Ort | Wirkung |
| --- | --- | --- | --- |
| P0 Warenkorb nur Vorschau | gebaut, lokal geprüft | `app/workshop/beta-267-cart.mjs`, `scripts/beta-267-demo.mjs` | Zwei Positionen derselben Variante, eigene Bilder, kein Bearbeiten |
| P0 Ablehnung | gebaut | dasselbe Buch `acceptOrder` | falscher Preis, fremde ID, alte Revision, unbezahlt, storniert, vertauschte oder veränderte Vorschau |
| P0 Fertigungskette | gebaut | `app/workshop/beta-267-e2e.test.mjs` | Text, Foto, Optionen, Review, SVG, Raster-PDF, Warenkorb |
| P1-a Profilkopie | gebaut | `doorbell-selection.mjs` | eine gespeicherte Profilberechnung, Rückgabe immer als eigene Kopie; geänderte Vorlage trifft nicht den Speicher |
| P1-b Checkout-Bild | gebaut, Schalter aus | `beta-267-checkout-preview.mjs`, `shop-entry.mjs` | bei `checkoutPreviewFirst: true` kein Warten auf Shopify, wenn die persönliche PNG schon da ist |
| P1-d Seitenmodule | gebaut | `shop-entry.mjs` | ETag, bei Wiederholung 304, HTML weiter `no-store` |
| P1-c weniger Warenkorb-Runden | offen | — | nicht in V0 |
| P1-e Schriften erst bei Bedarf | offen | — | die 11 Schriften werden weiterhin früh geladen |
| P1-f Tippen | offen | — | keine Änderung an der Eingabeverzögerung |
| P1-g Cookie-Banner | offen, Freigabe | Theme/Consentmo | nicht angefasst |
| Theme-Schnipsel | Vorschlag, nicht verdrahtet | `ops/shopify/theme-block/snippets/gravuru-warenkorb-nur-vorschau.liquid` | ersetzt den Bearbeiten-Schnipsel erst nach Freigabe |

Der alte Schnipsel `gravuru-warenkorb-bearbeiten.liquid` bleibt auf diesem Branch unverändert. Solange das Theme ihn ausliefert, zeigt der echte Shop weiter „Bearbeiten“. Die Screenshots stammen aus dem lokalen Prüfstand, nicht aus dem Theme.

## Preisquelle

Die gezeigte 54,98 € sind `quote()` auf `doorbellFixture`: Format 16×28 mit 4999 Cent plus Befestigung SIL mit 499 Cent. Das ist der vorhandene synthetische Fixture-Preis, kein Live-Shop-Preis und keine neue Preistabelle. Foto-Aufpreis in diesem Fixture ist 0 Cent. Der Test schaltet nur das vorhandene Feld `photo.enabled` ein, damit Foto, Text und Optionen in einer Kette laufen. Das ist keine Freigabe, Fotos auf der echten Funkklingel zu erlauben.

## Herkunft

Die drei Wartepunkte stammen aus der eigenen Messung in Issue-Kommentar 7008115794. Sie wurden hier erneut am Code geprüft. Aus PR #268 wurde kein Diff übernommen.
