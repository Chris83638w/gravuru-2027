# Mandanten-Inventur (K13, S1/S2) · 19.10.2026

Grundlage: [Benchmark, Abschnitt „Backend-Verwaltung und Abo-Modell“](KONFI-BENCHMARK-20261019.md#backend-verwaltung-und-abo-modell), Paket K13 im [Umsetzungsplan](UMSETZUNG-KONFI-NEU-20261019.md). Nur Architektur: kein Abo-Modell, kein Shopify-Billing, kein Onboarding. gravuru ist Mandant 1 (`DEFAULT_TENANT='gravuru'` in `app/workshop/tenant.mjs`).

## 1. Tabellen (`CREATE TABLE` in `app/workshop/*.mjs`)

Stand nach K13. „Anweisungen“ = SQL-Literale mit SELECT/INSERT/UPDATE/DELETE an `prepare(`; „mit `tenant_id`“ = Literal nennt die Spalte (Rest: begründete Ausnahmen, siehe Abschnitt 3).

| Modul | Tabellen | Anweisungen | mit `tenant_id` |
| --- | --- | --- | --- |
| `repository.mjs` | products, product_revisions, import_items | 16 | 16 |
| `product-catalog.mjs` | product_catalog | 7 | 3 (+4 über Konstante `search`) |
| `product-families.mjs` | product_families, product_family_revisions | 9 | 9 |
| `production-profiles.mjs` | manufacturing_profiles, manufacturing_profile_revisions | 6 | 6 |
| `profile-library.mjs` | profiles, profile_revisions, profile_library_settings, profile_settings_revisions | 15 | 13 (+2 Schema) |
| `form-variants.mjs` | form_variant_sets, form_variant_revisions, form_variant_imports, form_variant_members | 11 | 11 |
| `form-customer-store.mjs` | form_customer_drafts, form_customer_revisions, form_customer_photos, form_review_snapshots, acrylic_review_requests, form_print_proofs | 20 | 20 |
| `export-jobs.mjs` | form_export_jobs, form_export_events | 20 | 19 (+1 Schema) |
| `output-checks.mjs` | export_output_checks | 7 | 7 |
| `order-intake.mjs` | form_shop_bindings, form_shop_binding_personalization, form_offer_personalization, form_shop_binding_selections, form_order_offers, form_order_events, form_order_customers, form_order_lines, form_order_line_errors | 35 | 35 |
| `order-status.mjs` | form_order_status_events, form_order_refund_reports | 5 | 5 |
| `production-release.mjs` | production_release_events | 7 | 6 (+1 Schema) |
| `customer-downloads.mjs` | customer_file_grants, customer_file_revocations | 7 | 7 |
| `shop-draft-transfer.mjs` | shop_draft_transfers | 4 | 4 |
| `cart-handoff-journal.mjs` | storefront_cart_handoffs | 3 | 3 |
| `cart-configuration.mjs` | cart_configurations, cart_configuration_revisions | 10 | 10 |
| `acrylic-draft-store.mjs` | acrylic_customer_drafts, acrylic_customer_revisions | 4 | 4 |
| `customer-draft-store.mjs` | customer_drafts, customer_draft_photos | 14 | 14 |
| `font-library.mjs` | workshop_fonts | 4 | 4 |
| `design-assets.mjs` | design_sources, design_assets, material_surfaces, photo_example_sources | 11 | 8 (+3 `design_sources`) |
| `contours.mjs` | form_contours | 4 | 4 |
| `ai-design-jobs.mjs` | ai_design_jobs | 16 | 16 |
| `ai-batch-jobs.mjs` | ai_design_batches, ai_design_batch_items | 17 | 17 |
| `import-job-store.mjs` | batch_jobs, variant_batch_jobs (`${table}`) | 6 | 6 |
| `tenant.mjs` (neu) | tenants, tenant_settings | – | Mandanten-Register selbst |

Summe: 58 Werkstatt-Tabellen + 2 Register-Tabellen; 57 Tabellen tragen `tenant_id TEXT NOT NULL DEFAULT 'gravuru'` (Ausnahme `design_sources`), 258 Anweisungen, davon 247 mit `tenant_id` im Literal, 11 begründete Ausnahmen.

**Migration bestehender Datenbanken (idempotent, nichts wird gelöscht):** `ensureTenantColumn` hängt die Spalte per `ALTER TABLE … ADD COLUMN` an (Altzeilen = `gravuru`) und legt `<tabelle>_tenant` an. Neu aufgebaut, weil Primärschlüssel je Mandant eindeutig sein müssen (vom Händler gewählte Kennungen): `import_items` (PK `tenant_id,import_key`, repository `user_version` 3 → 4), `form_variant_imports` (PK `tenant_id,import_key`), `product_families`/`product_family_revisions` (PK `tenant_id,id` bzw. `tenant_id,family_id,revision`), `profile_library_settings`/`profile_settings_revisions` (bisher Einzelzeile `id=1`, jetzt je Mandant; Profilbibliothek `user_version` 1 → 2).

**Primärschlüssel geprüft:** Zufalls-IDs (`cfg_`, `draft_`, `proof_`, `job_`, `orderline_`, `binding_`, `offer_`, `konfig_`, `mfg_`, `prf_`, `variants_`, `air_`, `aib_`, `imp_`, `grant_`, `cdraft_`, `adraft_`) bleiben global eindeutig. Shopify-bezogene Schlüssel `(shop,event_id)`, `(shop,order_id)`, `(shop,order_id,line_id)` sind über den Shop bereits je Mandant eindeutig. Inhaltsadressierte Schlüssel (SHA-256 von Schrift, Kontur, Design, Oberfläche) liegen über `tenantKey(tenant,hash)` im Schlüsselraum des Mandanten; für gravuru unverändert (bestehende Verweise bleiben gültig).

## 2. Shop-Zugang (Tokens, Shop-Domain, Storefront)

| Stelle | Liest | Mandantenbezug nach K13 |
| --- | --- | --- |
| `shopify-runtime-config.mjs` | `SHOPIFY_IDENTITY` (Shop `gravuru-design.myshopify.com`, Client-ID, öffentlich), Env `GRAVURU_SHOPIFY_CLIENT_SECRET`, `…_SHOP_DOMAIN`, `…_CLIENT_ID`, `…_APP_ORIGIN`, `…_ADMIN_ACCESS_TOKEN`, `…_DRAFT_TRANSFER`, `GRAVURU_PRIVATE_DATA_DIR` | Quelle der Shop-Domain des Standardmandanten (Seed). Neu: `tenantSettings` mit Secret-**Namen** (`clientSecretRef`, `adminTokenRef`, `storefrontApiVersion`) → `tenant_settings`. Akzeptiert weiterhin nur den gravuru-Shop (Einzelshop-Testlaufzeit). |
| `shopify-session.mjs` | Session-JWT (`dest`, `iss`, `aud`) gegen feste `shopDomain`/`clientId`/`secret` | unverändert; je Mandant ein eigener Prüfer (Werkstatt je Mandant). |
| `shopify-app-proxy.mjs` | App-Proxy-Signatur, Parameter `shop` | unverändert; je Mandant eigener Prüfer. |
| `shopify-order-webhook.mjs` | Header `x-shopify-shop-domain`, HMAC mit festem Secret | **nicht umgestellt** (siehe Abschnitt 4): Handler hängt am `orderIntake` des Standardmandanten. Die Route `/api/workshop/order-webhook` in `http.mjs` wählt den Mandanten bereits über den Header. |
| `storefront-transport.mjs` | `shopDomain`, `apiVersion`, `privateToken` aus übergebener Konfiguration, Endpunkt `https://<shop>/api/<version>/graphql.json` | unverändert; Konfiguration kommt je Mandant aus `createWorkshop`/`tenantOptions`. Einstellung `storefrontEndpoint` in `tenant_settings` vorbereitet. |
| `shopify-admin-host.mjs` | `config.shopDomain`, `clientId`, App-Origin; CSP/`frame-ancestors` auf den Shop | unverändert (Einzelshop-Host). |
| `shopify-draft-token.mjs`, `shop-draft-transfer.mjs` | Admin-Token bzw. Client-Credentials für `shopDomain` | Journal je Mandant; Konfiguration je Mandant. |
| `http.mjs` | `shopifySessions.shopDomain`, `appProxy.shopDomain`, `shopDrafts.config.shopDomain`, `orderWebhook` | Mandant einmal je Request (`tenantFromRequest`), dann Werkstatt dieses Mandanten. |

## 3. Ausnahmen im Grep-Test (`tenant.test.mjs`)

- `product-catalog.mjs`: `… ${from} WHERE ${search|where}` – Filter steht in der Konstante `search` (`p.tenant_id=?`), `from` verbindet `c.tenant_id=p.tenant_id`.
- `FROM sqlite_master` (profile-library, export-jobs, production-release): Schema-Abfragen, keine Mandantendaten.
- `design_sources` (design-assets): gemeinsamer inhaltsadressierter Byte-Speicher; Zugriff nur über eine mandantengefilterte Zeile in `design_assets`/`photo_example_sources`.

## 4. Bewusst offen

- `shopify-order-webhook.mjs` (Pfad `/webhooks/shopify/orders-paid`): ein Handler je Laufzeit für den gravuru-Shop. Für weitere Mandanten muss er per `x-shopify-shop-domain` die Werkstatt und das Webhook-Secret des Mandanten wählen; erst mit der Shopify-App (S3).
- `shopify-runtime-config.mjs`/`shopify-admin-host.mjs`: Einzelshop-Testlaufzeit; Mehrshop-Installation (OAuth je Shop, Token-Ablage nur als Secret-Referenz) gehört zu S3.
- Mitgelieferte Bibliothek (`catalog.mjs`: 721 Motive, Schriften, `../designs/…`, Edelstahl-Oberfläche) ist für alle Mandanten sichtbar. Mastervorlage und mitgelieferte Familien bekommt nur gravuru. Trennung „Designpaket-Option“ ist S2-Rest (P3) und braucht vorher die Lizenzprüfung.
- Dateiablage: Uploads, Prüfstandpakete und Fotos liegen heute als BLOB in SQLite (mandantengefiltert), nicht als Dateien. `tenantDataPath(<data>,<mandant>,…)` ist der Resolver für künftige Dateiablagen; den Altpfad `<data>/…` kennt er nur für gravuru.
- Technische Bezeichner mit „gravuru“ bleiben (Schemas `gravuru-*/vN`, Header `X-Gravuru-*`, Positions-Eigenschaften `_gravuru_*`, Env `GRAVURU_*`, GraphQL-Operationsnamen): Teil des App-Protokolls und gespeicherter Stände. White-Label (S6) ist P3.
