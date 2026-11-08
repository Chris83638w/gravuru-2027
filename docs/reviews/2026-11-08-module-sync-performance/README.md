# Native binding performance and immutable-snapshot proof

Date: 2026-11-08. Scope: server-side data preparation and exact Shopify-ID binding only. No customer layout, pricing rules, source designs, live database or Shopify writes changed by this work.

## Measured complete bank

The isolated test used the backed-up native-normalized candidate SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`: 251 existing originals, 80 sizes, 8 forms and 404 binding combinations. Every variant's price/options were compared against the previously recorded native verification prices.

| Phase | Time |
|---|---:|
| Full native preparation of 404 variants | 1.100 s |
| Actual checker.check, five batches covering all 404 | 2.835 s |
| All 404 writes followed by injected late failure and complete rollback | 5.943 s |
| Retry of all 404 writes and native catalog approval after rollback | 5.932 s |
| Exact-ID resolution of all 404 active bindings | 0.141 s |

The 60-second freshness limit is unchanged. These are initial local wall-clock measurements on synthetic IDs in a newly created temporary SQLite database, before the final REPLACE/read-only hardening; they are not network/server latency claims. The test explicitly checks that the read lock is released during the simulated Shopify await. The separate live-source-plus-overlay acceptance uses `GRAVURU_BINDING_RUNTIME` and is performed by the operator-package reviewer. Its stricter transition test also exercises previously existing heads, externally checked plans before the transaction, and an actual idempotent replay after successful activation.

The final independent acceptance used the exact 119-module live-source snapshot with only the eight performance deltas mechanically transplanted (overlay manifest SHA256 `5a3ba3beff633a8202b2953ce0e929209df485bf45db9c47e64f1567db3a15b7`). It passed after the final guards, including 404 existing bindings and unchanged historical pricing contracts:

| Final live-source counterpart | Time |
|---|---:|
| Cold baseline preparation | 2.050 s |
| Complete 404-revision transition followed by late rollback | 28.296 s |
| 404-revision transition plus native approval | 29.027 s |
| Actual idempotent replay after success | 6.374 s |

The replay created **zero** bindings and changed **zero** assignment heads. All 404 previous bindings, all 404 previous pricing contracts, and the earlier product revision remained unchanged. Plans were checked before the write transaction, and the existing 60-second evidence limit passed without changing the clock or deadline. The additional raw checks after writes account for the increase over the earlier timings. `native-transition-404-report.json` records this final independent result; no live or Shopify write was performed in either acceptance.

## Mechanism and safeguards

- Product preparation validates the complete document once, makes a detached deeply frozen snapshot, and reuses the existing native selection/quote logic for each variant during one synchronous callback. Public calls outside that callback retain normal validation. No client-controlled skip-validation flag exists.
- Binding read phases before/after a network await are separate transactions. Only the adapter's proven deeply immutable records can reuse document digests. Mutable/custom adapters retain ordinary full validation.
- The large fixed SQL document is parsed/hashed once per product revision within a locked phase. Every variant still checks head, archive, status, SQL source identity, ownership, options, cents, expected assignment revision and evidence age. After each SQL write epoch (`total_changes`), the raw document and metadata are read again and compared byte-for-byte before any cached result is reused.
- Lightweight revision reads require BOTH exact native immutable UPDATE and DELETE trigger definitions plus enabled recursive triggers, which make SQLite REPLACE execute the existing DELETE blocker. The connection setting is scoped and restored. Schema/setting changes invalidate a cached record; an OFF → REPLACE → ON attempt is detected by the write-epoch raw check. Unknown/legacy schemas and same-name conditional/no-op triggers use the complete document guard.
- Read-only registries use a read transaction, never BEGIN IMMEDIATE, and cannot replace the original writable adapter reader with a temporary audit connection.
- Each writing batch has its own read phase inside the encompassing transaction. Earlier writes are visible to later phases. All 404 assignments and final native approval are committed together; a failure after assignment 404 leaves zero new bindings or heads.
- Pricing contracts, historical revisions and prior customer snapshots remain immutable. No global mutable document cache was added.

## Verification

- 68 existing adapter/plan/store tests passed before additional regression cases.
- Final targeted store/check/batch/snapshot run: **67/67 passed**, including same-connection mutation, archive, foreign/stale source, CAS, trigger removal, same-name `WHEN 0` trigger, REPLACE with recursive triggers ON, disabling recursive triggers, OFF → REPLACE → ON, read-only batch reads, closed-audit-reader reuse, rollback, expiry, source changes around network await, detached results and scope cleanup.
- The initial full-bank acceptance above passed (1 test, 404 exact price comparisons, rollback and retry).
- Representative existing model tests passed for native acrylic (28 combinations), slate preparation, doorbell (120 combinations), steel specimens, and acrylic families (162 sizes / 630 combinations). Missing Pillow/python3 test-environment support was supplied only in the previously approved isolated Python venv; the affected family/specimen tests then passed 6/6.
- `source-sha256.json` pins the eight implementation modules. `full-bank-report.json` contains the initial measured local proof; `native-transition-404-report.json` contains the final independent live-source proof after all guards.

Reproduce the full-bank acceptance from this worktree with `node --test app/workshop/shop-product-binding-full-bank.test.mjs`. It explicitly skips when the separately backed-up source files are absent. Set `GRAVURU_BINDING_RUNTIME` to an independently prepared runtime root to exercise that runtime against the same candidate. Regular mutation and existing product tests do not require these local source artifacts.

## Integration boundary

The shared module-sync factory uses `registry.resolveMany`, `registry.withReadSnapshot`, and the native catalog `approvals` bulk read. The live operator package must transplant these performance deltas onto its exact verified live source, not import the separate module-management branch wholesale. UI files and the live customer deployment are outside this change.
