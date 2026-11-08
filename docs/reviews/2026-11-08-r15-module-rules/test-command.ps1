param(
 [Parameter(Mandatory=$true)][string]$SteelDocument,
 [Parameter(Mandatory=$true)][string]$Python,
 [string]$Node = 'node'
)
$ErrorActionPreference = 'Stop'
$env:GRAVURU_REAL_STEEL_DOCUMENT = (Resolve-Path -LiteralPath $SteelDocument).Path
$env:GRAVURU_PYTHON = (Resolve-Path -LiteralPath $Python).Path
Push-Location (Resolve-Path (Join-Path $PSScriptRoot '../../..'))
try {
 & $Node --test app/configurator/variant-m/module-profile.test.mjs app/configurator/variant-m/module-runtime.test.mjs app/configurator/variant-m/logo-upload.test.mjs app/workshop/cart-personalization.test.mjs app/workshop/shop-entry.test.mjs app/workshop/shop-design-gallery.test.mjs app/configurator/mobile-demo/demo.test.mjs app/configurator/variant-m/view-zoom.test.mjs app/configurator/variant-m/preview-uploads.test.mjs app/configurator/variant-m/ui-event-regressions.test.mjs app/configurator/variant-m/shop-cart.test.mjs app/configurator/variant-m/native-overlay.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/theme-cart-flow.test.mjs app/workshop/shop-design-gallery-variant.test.mjs app/workshop/shop-preparation.test.mjs app/workshop/slate-shop-preparation.test.mjs app/configurator/variant-m/element-rights.test.mjs app/workshop/r15-module-bank.test.mjs
 if ($LASTEXITCODE -ne 0) { throw 'R15 module regression failed.' }
} finally { Pop-Location }
