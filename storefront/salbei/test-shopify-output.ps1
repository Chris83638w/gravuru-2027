# Offline regression checks; no packages, login or network required.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'shopify-output.ps1')
$script:checks = 0
function Assert-That([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:checks++
}
function Assert-Rejected([scriptblock]$Action, [string]$Message) {
    $rejected = $false
    try { & $Action | Out-Null } catch { $rejected = $true }
    Assert-That $rejected $Message
}

$single = '[{"id":123,"name":"Salbei","role":"unpublished"}]'
$upgrade = "changed 49 packages in 19s`n23 packages are looking for funding`n  run npm fund for details."
Assert-Rejected { ConvertFrom-SalbeiThemeList $upgrade } 'Update-only stdout must not count as a theme list.'
Assert-That ((ConvertFrom-SalbeiThemeList $single).Themes.Count -eq 1) 'Single-item array was lost.'
Assert-That ((ConvertFrom-SalbeiThemeList '[]').Themes.Count -eq 0) 'Empty array was lost.'
Assert-That ((ConvertFrom-SalbeiThemeList ('{"themes":' + $single + '}')).Themes.Count -eq 1) 'Wrapped list failed.'
$prefixed = $upgrade + "`n" + [char]27 + '[32m' + $single + [char]27 + '[0m'
Assert-That ((ConvertFrom-SalbeiThemeList $prefixed).Themes[0].id -eq 123) 'Notice/ANSI-prefixed JSON failed.'
$pretty = "CLI notice`n[`n  {`"id`":123,`"name`":`"Salbei`",`"role`":`"main`"},`n  {`"id`":456,`"name`":`"Test`",`"role`":`"unpublished`"}`n]"
Assert-That ((ConvertFrom-SalbeiThemeList $pretty).Themes.Count -eq 2) 'Multiline theme list failed.'
foreach ($invalid in @('null', '{}', '{"themes":null}', '[{}]', '[{"id":123,"name":"Salbei"}]', '[{"id":123')) {
    Assert-Rejected { ConvertFrom-SalbeiThemeList $invalid } ('Invalid list accepted: ' + $invalid)
}

function Invoke-FixtureCli {
    Assert-That (($args -join ' ') -eq 'theme list --store example.myshopify.com --json') 'Retry invoked an unexpected command.'
    $response = $script:responses[$script:calls]
    $script:calls++
    $global:LASTEXITCODE = $response.ExitCode
    $response.Text
}
$script:calls = 0
$script:responses = @(@{ ExitCode = 0; Text = $upgrade }, @{ ExitCode = 0; Text = $single })
$result = Get-SalbeiThemeList -Cli Invoke-FixtureCli -Store example.myshopify.com
Assert-That ($script:calls -eq 2 -and $result.Themes[0].id -eq 123) 'Read-only retry after update did not recover.'
$script:calls = 0
$script:responses = @(@{ ExitCode = 0; Text = $upgrade }, @{ ExitCode = 0; Text = 'not JSON' })
Assert-Rejected { Get-SalbeiThemeList -Cli Invoke-FixtureCli -Store example.myshopify.com } 'Repeated invalid output was accepted.'
Assert-That ($script:calls -eq 2) 'Retry must be bounded to two list calls.'
$script:calls = 0
$script:responses = @(@{ ExitCode = 1; Text = $single })
Assert-Rejected { Get-SalbeiThemeList -Cli Invoke-FixtureCli -Store example.myshopify.com } 'Nonzero CLI exit was accepted.'
Assert-That ($script:calls -eq 1) 'Nonzero CLI exit must not be retried.'

$push = '{"theme":{"id":123,"name":"Salbei","role":"unpublished","shop":"example.myshopify.com","editor_url":"https://example.myshopify.com/admin/themes/123/editor","preview_url":"https://example.myshopify.com/?preview_theme_id=123"}}'
Assert-That ((Confirm-SalbeiThemePush $push example.myshopify.com Salbei).id -eq 123) 'Valid push was rejected.'
Assert-Rejected { Confirm-SalbeiThemePush $upgrade example.myshopify.com Salbei } 'Update-only output must not claim upload success.'
Assert-Rejected { Confirm-SalbeiThemePush ($push.Replace('unpublished', 'main')) example.myshopify.com Salbei } 'Live theme response was accepted.'
Assert-Rejected { Confirm-SalbeiThemePush $push other.myshopify.com Salbei } 'Wrong shop was accepted.'
Assert-Rejected { Confirm-SalbeiThemePush $push example.myshopify.com Other } 'Wrong theme name was accepted.'
Assert-Rejected { Confirm-SalbeiThemePush ($push.Replace('"id":123', '"warning":"Pushed with errors","id":123')) example.myshopify.com Salbei } 'Partial upload warning was accepted.'
Assert-Rejected { Confirm-SalbeiThemePush ($push.Replace('"id":123', '"errors":{"assets/test.css":"failed"},"id":123')) example.myshopify.com Salbei } 'Partial upload errors were accepted.'

$parseTokens = $null
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'upload-salbei.ps1'), [ref]$parseTokens, [ref]$parseErrors)
Assert-That ($parseErrors.Count -eq 0) 'Uploader has a PowerShell syntax error.'
Write-Host ('PASS: ' + $script:checks + ' checks on PowerShell ' + $PSVersionTable.PSVersion)
