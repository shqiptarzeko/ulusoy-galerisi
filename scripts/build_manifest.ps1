# Yeni klasor yapısına gore manifest.json olustur
# Her leaf klasordeki fotolar numerik sırayla eklenir (1.jpeg kapak foto olur)
param(
    [string]$AssetsPath = "c:\Users\tikky\Desktop\ulusoy\assets",
    [string]$ManifestPath = "c:\Users\tikky\Desktop\ulusoy\scripts\manifest.json"
)

$IMAGE_EXT = @('.jpg','.jpeg','.png','.webp','.avif')
$allDirs = Get-ChildItem -LiteralPath $AssetsPath -Recurse -Directory

$categories = [System.Collections.Generic.List[object]]::new()

foreach ($dir in $allDirs) {
    $files = @(Get-ChildItem -LiteralPath $dir.FullName -File | Where-Object { $IMAGE_EXT -contains $_.Extension.ToLower() })
    if ($files.Count -eq 0) { continue }

    # Numerik sırala: 1.jpeg, 2.jpeg, ... oncelikli; geri kalan alfabetik
    $sorted = $files | Sort-Object {
        $n = 0
        if ([int]::TryParse([IO.Path]::GetFileNameWithoutExtension($_.Name), [ref]$n)) { $n } else { 9999 }
    }, Name

    $relDir = $dir.FullName.Substring($AssetsPath.Length + 1) -replace '\\','/'
    $imgs = @($sorted | ForEach-Object { "assets/$relDir/$($_.Name)" })

    $cat = [ordered]@{
        name   = $relDir
        images = $imgs
    }
    $categories.Add($cat)
}

$manifest = [ordered]@{ categories = $categories.ToArray() }
$json = $manifest | ConvertTo-Json -Depth 10
# BOM olmadan UTF-8 kaydet
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($ManifestPath, $json, $utf8NoBom)

Write-Host "✓ Manifest olusturuldu: $ManifestPath"
Write-Host "✓ Toplam kategori: $($categories.Count)"
if ($categories.Count -gt 0) {
    Write-Host "  Ornek: $($categories[0].name) => $($categories[0].images.Count) fotograf, ilk: $($categories[0].images[0])"
}
