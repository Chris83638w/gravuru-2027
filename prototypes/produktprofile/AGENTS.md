# Prototype Instructions

## Chris' review scope, 03.11.2026

One existing Master, product-specific capabilities and option groups. No production deployment from this study. Neutral UI, no green/beige theme. Remove dark header; product back left, shared tools centered, save right. Image-only designs with magnifier in image. Motif search before category (Bestseller initially), three columns and inline More. No photo tab when disallowed; no options tab when no choices. Memorial mounting includes silicone; stand and spray are independent. All product rules, prices and geometry must come from authoritative sources before production integration. The five fixtures are visual examples, not product approvals.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Chris' correction, 03.11.2026 (latest)

Center Fullscreen / Undo / Redo / Help / Layers over the canvas itself, not the full viewport. Back to product sits at the left edge of this same row, Save draft at its right edge. Remove the extra product title/details and two-checkmark draft status. Keep a slimmer coloured footer with In den Warenkorb. Canvas should remain nearly as large as the previous Master (only a minimal fit margin); scale dimensions and artwork together and reset to a deterministic 100% fit. Keep every existing motif category, Bestseller only as initial selection. Preserve original descriptive names and artwork, never generate Motif-1 labels. Retain option icon tiles, not plain radio placeholders. Product fixture choices remain illustrative, not authoritative production bindings.

## Visual direction correction, 03.11.2026

Chris considers the current presentation old-fashioned and asks for a more modern configurator. Improve typography, spacing, visual hierarchy and grouping while preserving the toolbar positions, large canvas, original motifs, categories, option icons and slim cart footer above. The Manufaktur homepage feedback was pasted into the wrong chat and is explicitly excluded from this work. Homepage concept images are not references or approvals for the configurator.

## Topic-specific motifs, 03.11.2026

The initially selected Bestseller list must match the product topic: remembrance motifs such as crosses for memorials, home-related motifs for door signs. Bind this explicitly in the product profile; do not infer from its title or material. Retain all individual categories and original names/artwork. Prototype picks are curated examples, not verified sales rankings. Do not fill missing topic assignments with unrelated global motifs.

Chris additionally requires separate remembrance recommendations for humans and animals. Both use explicit product-profile assignments. Shared motifs remain allowed; neither theme restricts the full category library. Keep the existing dog example with animal remembrance, not the human fixture. Do not invent a human portrait.
