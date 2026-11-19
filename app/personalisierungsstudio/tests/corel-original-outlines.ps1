param(
    [Parameter(Mandatory)][string]$DesignJson,
    [Parameter(Mandatory)][hashtable]$FontFiles
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
$design = Get-Content -LiteralPath $DesignJson -Raw -Encoding UTF8 | ConvertFrom-Json
$fields = @($design.texts | Where-Object { !$_.hint })
foreach ($group in ($fields | Group-Object font)) {
    $family = $group.Name
    if (!$FontFiles.ContainsKey($family)) { throw "Originaldatei für $family fehlt." }
    $file = (Resolve-Path -LiteralPath $FontFiles[$family]).Path
    $face = [Windows.Media.GlyphTypeface]::new([uri]::new($file))
    if ($face.FamilyNames.Values -cnotcontains $family) { throw "Schriftname und Originaldatei unterscheiden sich für $family." }
    $characters = [Collections.Generic.HashSet[int]]::new()
    foreach ($field in $group.Group) {
        $value = $field.text
        for ($i = 0; $i -lt $value.Length; $i++) {
            $code = [char]::ConvertToUtf32($value, $i)
            if (![char]::IsWhiteSpace($value, $i)) { $null = $characters.Add($code) }
            if ($code -gt 65535) { $i++ }
        }
    }
    $outlines = 0
    foreach ($code in $characters) {
        $glyph = [uint16]0
        if ($face.CharacterToGlyphMap.TryGetValue($code, [ref]$glyph) -and $glyph -ne 0) {
            $geometry = $face.GetGlyphOutline($glyph, 1000, 1000)
            if (!$geometry.IsEmpty() -and $geometry.GetArea() -gt 0) { $outlines++ }
        }
    }
    [pscustomobject]@{
        Design = $design.id
        Font = $family
        Sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        TextFields = $group.Count
        Characters = $characters.Count
        Outlines = $outlines
        Missing = $characters.Count - $outlines
    }
    if ($outlines -ne $characters.Count) { throw "Unvollständige Zeichenkonturen für $family." }
}
