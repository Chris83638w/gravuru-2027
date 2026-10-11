# PowerShell 5.1 compatible helpers. Loading this file never contacts Shopify.
function ConvertFrom-SalbeiCliOutput {
    param([AllowEmptyString()][string]$Text)

    # Shopify/npm may print notices before the final JSON document.
    $clean = $Text -replace ([char]27 + '\[[0-?]*[ -/]*[@-~]'), ''
    foreach ($start in [regex]::Matches($clean, '(?m)^\s*(?=[\[{])')) {
        $candidate = $clean.Substring($start.Index).Trim()
        try {
            # A wrapper preserves empty and one-item arrays in Windows PowerShell.
            $wrapped = ConvertFrom-Json -InputObject ('{"payload":' + $candidate + '}') -ErrorAction Stop
            return $wrapped
        }
        catch { continue }
    }
    throw 'Keine vollstaendige JSON-Antwort von Shopify erhalten.'
}

function ConvertFrom-SalbeiThemeList {
    param([AllowEmptyString()][string]$Text)

    $payload = (ConvertFrom-SalbeiCliOutput -Text $Text).payload
    if ($payload -is [array]) { $themes = $payload }
    elseif ($null -ne $payload -and $payload.themes -is [array]) { $themes = $payload.themes }
    else { throw 'Unerwartetes Format der Shopify-Themeliste.' }
    foreach ($theme in $themes) {
        if ([string]$theme.id -notmatch '^[1-9][0-9]*$' -or
            $theme.name -isnot [string] -or [string]::IsNullOrWhiteSpace($theme.name) -or
            $theme.role -isnot [string] -or [string]::IsNullOrWhiteSpace($theme.role)) {
            throw 'Unvollstaendiger Eintrag in der Shopify-Themeliste.'
        }
    }
    return [pscustomobject]@{ Themes = @($themes) }
}

function Get-SalbeiThemeList {
    param([string]$Cli, [string]$Store)

    for ($attempt = 1; $attempt -le 2; $attempt++) {
        $outputLines = & $Cli theme list --store $Store --json
        if ($LASTEXITCODE -ne 0) {
            $outputLines | Out-Host
            throw 'Shopify-Themeliste nicht erreichbar. Kein Upload ausgefuehrt.'
        }
        try { return ConvertFrom-SalbeiThemeList -Text ($outputLines -join [Environment]::NewLine) }
        catch {
            if ($attempt -eq 2) {
                $outputLines | Out-Host
                throw 'Auch die zweite Abfrage lieferte keine gueltige Themeliste. Kein Upload ausgefuehrt.'
            }
            Write-Host 'Noch keine gueltige Themeliste (z. B. nach CLI-Update). Frage einmal erneut ab ...'
        }
    }
}

function Confirm-SalbeiThemePush {
    param([AllowEmptyString()][string]$Text, [string]$Store, [string]$Name)

    $theme = (ConvertFrom-SalbeiCliOutput -Text $Text).payload.theme
    if ($null -eq $theme -or [string]$theme.id -notmatch '^[1-9][0-9]*$' -or
        $theme.name -ne $Name -or $theme.shop -ne $Store -or $theme.role -ne 'unpublished' -or
        $theme.warning -or $theme.errors -or
        [string]::IsNullOrWhiteSpace($theme.editor_url) -or [string]::IsNullOrWhiteSpace($theme.preview_url)) {
        throw 'Shopify hat keinen vollstaendigen, fehlerfreien Upload als unveroeffentlichtes Theme bestaetigt.'
    }
    return $theme
}
