# Sicherung Serverstand 11.11.2026 (Live-Laufzeit gravuru 2027)

Reine Sicherung, kein Einbau. Abstimmung: Issue #168.

- **Laufzeitordner auf dem Server:** `private/mika-r15-resume-20261108-v1/` (gestartet über `gravuru-2027-merchant/app.cjs`).
- **Basis dieses Zweigs:** `dev/claude-paket1c-katalog-arbeiter-20261110` @ `ac10e6c` (PR #237).
- **Vergleich:** 539 Code-Dateien (ohne Tests) per SHA-256 gegen `ac10e6c`: `app/workshop` 205, `app/workshop/ui` 116, `app/configurator/variant-m` 175, `mobile-demo` 17, `platform/.../models` 26. Nicht verglichen: `scripts/`, Tests, Bilddateien.
- **Ergebnis:** 18 Dateien weichen ab, 1 ist zusätzlich. Mit diesen 19 Dateien entspricht der Zweig in den verglichenen Ordnern dem Server.
- **Prüfung:** Größe und vollständiger SHA-256 jeder Datei am 11.11.2026 gegen 20:20 MEZ direkt am Server gelesen (Plesk-Dateimanager, nur lesend) und mit dem hier eingecheckten Inhalt verglichen: 19 von 19 gleich.
- **Herkunft:** 6 Fassungen lagen bereits als Blobs im Repository; 13 wurden vom Server übertragen (eine Bündeldatei, Inhalt gegen die Server-Hashes geprüft).
- **Geheimnisse:** Mustersuche in den 13 übertragenen Dateien (Shopify-/GitHub-/AWS-Schlüssel, private Schlüssel, Passwort-Zuweisungen, Bearer-Token, E-Mail-Adressen): 0 Treffer. Keine Datenbank- oder Bestellinhalte.

## Gruppe 1 – Codex „Acrylglasbilder“ (Server-Zeitstempel 10.11.2026, 14:45 / 17:10), bisher in keinem Git-Zweig

| Datei | Bytes | SHA-256 | Quelle | gegenüber `ac10e6c` |
|---|---|---|---|---|
| `app/workshop/batch.mjs` | 17500 | `07b1ea062561485c6ecfca5ed3f34d9237c42f7a71e0ea8b2f69ab1079c18b78` | Server-Übertragung | weicht ab |
| `app/workshop/product-model.mjs` | 14953 | `1993bc362715e9a7736d6ad6d170a4a111ec607f3bdcce207d6fd5e2bdc9cb65` | Server-Übertragung | weicht ab |
| `app/workshop/shop-entry.mjs` | 63920 | `ab2dfbcf308ac8aff54f5753d3f7914b7b210aa1a2b00a41a431cc8662d6fcbb` | Server-Übertragung | weicht ab |
| `app/workshop/shop-preparation.mjs` | 8516 | `4410b6a61593efcb4a6539cb65c53139ed957d0879943e1ff946563ea0bee6c4` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/acrylic-scene.css` | 5009 | `372bf868189a5b07bde21905035a06ea30c6f283aa567ea16b9701f4264b5e6e` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/acrylic-scene.mjs` | 17125 | `9dc52c5e3023da9aa3674a8a09442cff87fbab278efe56f1f89b8f0b086e0586` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/contract.mjs` | 39787 | `c8a6eb14ef56b0d9565728708d93ccc9362b5bcc3d53fc80b1b6be092dc98393` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/scalable-size-state.mjs` | 4178 | `149e44ad34fa4f07d25f4e2b7c078b43297163ffcb1607da875d5e364f707257` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/ux.mjs` | 80552 | `a0018174ebde933edc8fa83c0559efcb2d98c704719380ecbd7c9217e2200ed6` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/workshop-review.mjs` | 9400 | `4248d5521f9d943f95f32647bdedc5a913437dc0260c97f0a9d924dcdeed5a1e` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/scalable-acrylic-scene.mjs` | 3724 | `e83864e3dc1bb5881ce368c7244820c0b1eeb5c2d0e1661786289f85b02f73c4` | Server-Übertragung | zusätzlich |

## Gruppe 2 – R15-Paket vom 9.11.2026, 00:01 (weicht von Commit `8ceb866` ab)

| Datei | Bytes | SHA-256 | Quelle | gegenüber `ac10e6c` |
|---|---|---|---|---|
| `app/workshop/design-target-rules.mjs` | 8045 | `21d03fb82245f0afc6cfac06d9380720a2e9c7d8b7c839a0657b183b1992c3fb` | Git-Blob | weicht ab |
| `app/workshop/design-targets.mjs` | 16435 | `cf778d17754debf1f868acac0dff70e3d3f10ff4bdbf816e08f0e6832695d202` | Server-Übertragung | weicht ab |
| `app/workshop/katalog-family-formats.mjs` | 15512 | `bd85fd8b7f9b8a68d2319a0e9574dd34b747b42007dd000c61ce7f1fc5e1d6aa` | Git-Blob | weicht ab |
| `app/workshop/product-preview.mjs` | 8210 | `ee6924c400b5b8471f6764d38e2d653f38520200c5959264e65db831aaaaad07` | Git-Blob | weicht ab |
| `app/configurator/variant-m/family-formats.mjs` | 15710 | `183d00d611042e2c2d9f6097787859656388adcc6ef92ae52c3c6498e4deb210` | Git-Blob | weicht ab |
| `app/configurator/variant-m/modern-navigation.css` | 16050 | `1fc314b7c23e2f67b2315e5dac27555674b45a467dcd56b8a53958847c9a55ce` | Git-Blob | weicht ab |
| `app/configurator/variant-m/option-media.mjs` | 7943 | `48821e6157517ef403e7edb6932da8eca3692705f82f7ddeca473404e4b58db0` | Server-Übertragung | weicht ab |
| `app/configurator/variant-m/view-zoom.css` | 2762 | `ce31226dbc655204b04f5a90926f6d280db974e62d40252b20d828967232ea14` | Git-Blob | weicht ab |

## Nicht Teil dieser Sicherung

- `gravuru-2027-merchant/app.cjs` (Startdatei mit Schaltern; Sicherungskopie liegt auf dem Server in `private/claude-paket1a-20261110/`).
- Datenbanken, Katalog-Arbeitsverzeichnis, Protokolle, Zugangsdaten.
