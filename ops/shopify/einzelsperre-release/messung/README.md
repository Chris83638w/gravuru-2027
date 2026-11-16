# Messbelege Einzelsperre (#239 F05)

- `anweisungen.mjs`: Anweisungszähler mit dem offiziellen function-runner (Shopify CLI 4.9.0). Gemessen werden die vorherige aktive Logik (Nachbau `3c82b825…`), die Live-Preisfunktion B (`8b33937d…`) und die Kassen-Prüfung (`93b5f15c…`). Eingaben stammen aus der echten Protokoll-Eingabe vom 15.11. Die Ergebnisse stehen in `ergebnisse-20261116.json`.
- `aequivalenz.sh` und `aequivalenz-shim.mjs`: Die Preistests vom Stand 2abfd92 laufen durch beide Fassungen. Ergebnis 16.11.: 3.926 gültige Eingaben ergeben identische Ausgaben, 41 abgewiesene Eingaben sind sauber isoliert. Einziger Fehlschlag ist der V3-Test, der auch an der aktiven Fassung scheitert, weil V3 nicht live ist.

| Gleiche Gestaltungen | vorher aktiv | live B | Kassen-Prüfung |
|---|---:|---:|---:|
| 1 | 1,76 Mio. | 1,82 Mio. | 1,86 Mio. |
| 10 | 7,68 Mio. | 7,80 Mio. | 7,59 Mio. |
| 14 | 10,31 Mio. | 10,45 Mio. | 10,13 Mio. |
| 15 | 10,97 Mio. | **11,11 Mio.** | 10,76 Mio. |
| 16 | 11,63 Mio. | 11,78 Mio. | 11,40 Mio. |
| echte Eingabe (3 Zeilen, 2 ungültig) | abgewiesen | 3,19 Mio. | 3,33 Mio. |
| 20 gemischt | abgewiesen | 12,55 Mio. | 12,72 Mio. |

Die Grenze liegt bei 11 Mio. Anweisungen. Live B schafft 14 verschiedene Gestaltungen, vorher waren es 15. Echte Produktmischungen (FPD, Zubehör, mehrere Preisverträge) sind nicht gemessen.
