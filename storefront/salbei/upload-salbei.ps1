# Run in a normal PowerShell window. Never publishes or overwrites a live theme.
[CmdletBinding()]
param([switch]$PrepareOnly)

$ErrorActionPreference = 'Stop'
$salbeiStore = 'gravuru-design.myshopify.com'
$salbeiName = 'gravuru Salbei Entwicklung 2026-10-11'
$salbeiRoot = $PSScriptRoot
$salbeiZip = Join-Path $salbeiRoot 'gravuru-salbei-0.1.0.zip'
$salbeiExpectedHash = '2d783ef0e69d639a1bf79b03f73f24b27a19de19fad1cf22632e5e869930e99c'

if ((Get-FileHash -LiteralPath $salbeiZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $salbeiExpectedHash) {
    throw 'Das ZIP stimmt nicht mit dem geprueften Paket ueberein. Upload abgebrochen.'
}

$salbeiUploadPath = Join-Path $salbeiRoot ('upload-theme-' + [guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath $salbeiZip -DestinationPath $salbeiUploadPath
$salbeiManifest = Get-Content -LiteralPath (Join-Path $salbeiRoot 'theme-manifest.json') -Raw | ConvertFrom-Json
$salbeiFiles = @(Get-ChildItem -LiteralPath $salbeiUploadPath -File -Recurse)
if ($salbeiFiles.Count -ne $salbeiManifest.Count) { throw 'Dateianzahl im Upload stimmt nicht.' }
foreach ($salbeiEntry in $salbeiManifest) {
    $salbeiFile = Join-Path $salbeiUploadPath $salbeiEntry.path
    if ((Get-FileHash -LiteralPath $salbeiFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $salbeiEntry.sha256) {
        throw ('Dateipruefung fehlgeschlagen: ' + $salbeiEntry.path)
    }
}
Write-Host ('Paket geprueft: ' + $salbeiFiles.Count + ' Dateien; ' + $salbeiUploadPath)
if ($PrepareOnly) { return }

$salbeiCli = Get-Command shopify.cmd -ErrorAction SilentlyContinue
if (-not $salbeiCli) { $salbeiCli = Get-Command shopify -ErrorAction SilentlyContinue }
if (-not $salbeiCli) { throw 'Shopify CLI nicht gefunden. Installation: npm install -g @shopify/cli' }

Write-Host ('Ziel: ' + $salbeiStore + '. Falls verlangt, Shopify-Anmeldung im Browser abschliessen.')
$salbeiListOutput = & $salbeiCli.Source theme list --store $salbeiStore --json
if ($LASTEXITCODE -ne 0) { throw 'Shopify-Themeliste nicht erreichbar. Kein Upload ausgefuehrt.' }
$salbeiList = ($salbeiListOutput -join [Environment]::NewLine) | ConvertFrom-Json
# Refuse an ambiguous response or a same-name existing theme; retries cannot overwrite it.
if ($salbeiList -is [array]) { $salbeiThemes = @($salbeiList) }
elseif ($null -ne $salbeiList.themes) { $salbeiThemes = @($salbeiList.themes) }
else { throw 'Unerwartete Shopify-Antwort. Kein Upload ausgefuehrt.' }
$salbeiExisting = @($salbeiThemes | Where-Object { $_.name -eq $salbeiName })
if ($salbeiExisting.Count -gt 0) {
    $salbeiExisting | Select-Object id, name, role | Format-Table
    Write-Host 'Ein Theme mit diesem Namen existiert bereits. Es wurde nicht veraendert.'
    return
}

Write-Host ('Erstelle unveroeffentlichtes Theme: ' + $salbeiName)
& $salbeiCli.Source theme push --store $salbeiStore --path $salbeiUploadPath --unpublished --theme $salbeiName --strict --json
if ($LASTEXITCODE -ne 0) { throw 'Shopify meldet einen Uploadfehler. Ausgabe oben pruefen; ein eventuell teilweise angelegtes Theme nicht veroeffentlichen.' }
Write-Host 'Upload beendet. Editor- und Vorschau-Link stehen in der Shopify-Ausgabe oben.'
