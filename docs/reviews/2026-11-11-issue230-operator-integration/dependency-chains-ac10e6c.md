# Statische Importketten zu Dateien ohne ac10e6c-Pendant

Quelle 64e026e8fd15b129a16cc97189b28506aa9e8ac2; Vergleich ac10e6cee00469591514dcb4fa477b0547a54c48. Jede Kette beginnt in einer der 28 B/C-Runtimedateien. Testdateien sind keine Runtime-Einstiegspunkte. Nicht sämtliche 120 von Claude genannten nur-v8-Dateien sind allein für die 28 Module notwendig. Nicht abgedeckt: dynamische URLs, CSS-/Build-Entrypoints, Serverdatei-Abweichungen.

## app/configurator/variant-m/design-search-control.mjs (C-material)

- `app/configurator/variant-m/design-search-control.mjs`
- `app/configurator/variant-m/design-search-control.mjs → app/configurator/variant-m/design-search.mjs`

## app/configurator/variant-m/design-search.mjs (C-material)

- `app/configurator/variant-m/design-search.mjs`

## app/configurator/variant-m/native-design-search.mjs (C-material)

- `app/configurator/variant-m/native-design-search.mjs`
- `app/configurator/variant-m/native-design-search.mjs → app/configurator/variant-m/design-search-control.mjs`
- `app/configurator/variant-m/native-design-search.mjs → app/configurator/variant-m/design-search.mjs`

## app/configurator/variant-m/product-design-gallery.mjs (C-material)

- `app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/design-search-control.mjs`
- `app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/native-design-search.mjs`
- `app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/design-search-control.mjs → app/configurator/variant-m/design-search.mjs`

## app/configurator/variant-m/ux.mjs (B)

- `app/configurator/variant-m/ux.mjs → app/configurator/variant-m/gallery-workbench.mjs`
- `app/configurator/variant-m/ux.mjs → app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/design-search-control.mjs`
- `app/configurator/variant-m/ux.mjs → app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/native-design-search.mjs`
- `app/configurator/variant-m/ux.mjs → app/configurator/variant-m/product-design-gallery.mjs → app/configurator/variant-m/design-search-control.mjs → app/configurator/variant-m/design-search.mjs`

## app/workshop/http.mjs (C-material)

- `app/workshop/http.mjs → app/workshop/configurator-module-http.mjs`
- `app/workshop/http.mjs → app/workshop/configurator-module-http.mjs → app/workshop/configurator-module-profiles.mjs`
- `app/workshop/http.mjs → app/workshop/configurator-module-http.mjs → app/workshop/product-group-templates.mjs`
- `app/workshop/http.mjs → app/workshop/design-assets.mjs → app/workshop/gallery-photo-media.mjs`
- `app/workshop/http.mjs → app/workshop/design-dashboard.mjs → app/workshop/subcategory-materials.mjs`

## app/workshop/shop-design-gallery.mjs (C-material)

- `app/workshop/shop-design-gallery.mjs → app/configurator/variant-m/design-search.mjs`

## app/workshop/shop-entry.mjs (C-material)

- `app/workshop/shop-entry.mjs → app/workshop/shop-design-gallery.mjs → app/configurator/variant-m/design-search.mjs`
- `app/workshop/shop-entry.mjs → app/workshop/acrylic-review.mjs → app/workshop/doorbell-artwork.mjs → app/workshop/design-assets.mjs → app/workshop/gallery-photo-media.mjs`

