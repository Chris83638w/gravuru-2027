# Umsetzung „Konfi neu“ – Pakete aus dem Benchmark vom 19.10.2026

Branch: `dev/konfi-neu-20261019` (abgezweigt von `task/steel-master-data-20261016`, Commit `81bdd4b`). Nichts davon geht nach `main` oder auf den Händlerhost ohne Freigabe „installieren“. Grundlage: [KONFI-BENCHMARK-20261019.md](KONFI-BENCHMARK-20261019.md) (Anforderungen Ü, A, V, E, B, S).

Arbeitsregeln je Paket: eigener Branch `dev/konfi-neu-K<n>`, Tests mit `node --test` für jede neue Regel, keine Änderung an `legacy-reference/`, keine neuen Abhängigkeiten ohne Grund, Fehlertexte deutsch, Maße in mm, Preise in Cent. Vorhandenes nicht neu erfinden (`contract.mjs`, `element-rights.mjs`, `processing-profiles.mjs`, `production-profiles.mjs`, `order-intake.mjs`, `acrylic-draft-store.mjs`, `storefront-cart.mjs`).

| Paket | Anforderungen | Kernmodule | Welle |
| --- | --- | --- | --- |
| K1 Themen-Limits und Pflichtfelder | Ü2.2, Ü3.1, Ü3.2 | `app/workshop/theme-limits.mjs` (neu), `variant-m/contract.mjs`, `variant-m/direct-editing.mjs`, `customer-tools.mjs` | 1 |
| K2 Element-Rechte serverseitig | Ü2.1 (P2-7) | `variant-m/contract.mjs`, `element-rights.mjs`, `server.mjs`, `workshop/http.mjs` | 1 |
| K3 Guide-Ebenen, Spiegelung, Auflösungs-Hinweis | Ü6.1, Ü7.2, Ü5.1, Ü5.2 | `variant-m/print-export-model.mjs`, `print-export.mjs`, `workshop/output-specification.mjs`, `acrylic-photo-resolution.mjs` | 1 |
| K4 Fertigungspaket mit Summary | Ü7.1 | `workshop/print-delivery.mjs`, `review-package.mjs`, `output-specification.mjs` | 1 |
| K5 Freigabeprozess | Ü7.3, B4 | `workshop/order-status.mjs`, `order-intake.mjs`, `http.mjs`, `ui/orders-ui.mjs` | 1 |
| K6 Kleine Pflichtkorrekturen | E2, E3, E4 | `variant-m/usability.mjs` (Rand), `order-intake.mjs` (Einzelposition), `workshop/font-library.mjs`/`font-import.py` (Glyphen) | 1 |
| K7 Sitzungsschutz und Konto-Entwürfe | Ü8.1, Ü8.2 | `variant-m/ux.mjs` (localStorage), `workshop/acrylic-draft-store.mjs` → `customer-draft-store.mjs`, `http.mjs` | 2 |
| K8 Warenkorb-Edit mit Revision | Ü9.1 | `workshop/draft-cart-handoff.mjs`, `storefront-cart.mjs`, `cart-personalization.mjs` | 2 |
| K9 Design-Galerie je Thema, Direktlink | Ü10.1, Ü10.2, V4 | `variant-m/workflow.mjs`, `customer-tools.mjs`, `ux.mjs` | 2 |
| K10 Verfahrensprofil | Ü1.1, Ü1.2 | `platform/.../processing-profiles.mjs`, `workshop/product-families.mjs`, `variant-m/usability-model.mjs`, `ux.mjs` | 2 |
| K11 Mobile-first | Ü13.1 | `variant-m/ux.css`, `refinements.mjs`, `usability.css` | 2 |
| K12 Katalog-Anbindung | V1, V2, V3, V5, B1 | `workshop/catalog.mjs`, `product-families.mjs`, `scripts/build-katalog.py`, neu `workshop/katalog-source.mjs` | 3 |
| K13 Mandantenfähigkeit | S1, S2 | neu `workshop/tenant.mjs`, alle `CREATE TABLE` in `workshop/*.mjs` | 3 |
| K14 Staffel, bedingte Optionen, Flächen | Ü11, Ü12, Ü15 | `product-families.mjs`, `contract.mjs` (`quote`, `resolvedOptions`) | 4 (P2) |

Zusammenführung: Pakete werden nach bestandenen Tests in `dev/konfi-neu-20261019` gemergt; Konflikte löst der Master-Operator. Abnahme je Welle: `npm test` grün, `STATUS.md` fortgeschrieben.

Nicht Code, aber Pflicht vor Verkaufsstart (E1): P1-Fixes installieren, echter Shopify-Klickablauf mit Testzahlung.
