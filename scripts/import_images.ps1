param(
    [string]$Source = 'C:\Users\tikky\Desktop\Dikey Format Fotolar',
    [string]$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\.."),
    [string]$DestRelative = 'assets',
    [string]$ManifestPath = "$PSScriptRoot\manifest.json"
)

$SourcePath = (Resolve-Path -Path $Source -ErrorAction Stop).Path
$WorkspaceRoot = (Resolve-Path -Path $WorkspaceRoot).Path
$DestRoot = Join-Path $WorkspaceRoot $DestRelative

Write-Host "Source: $SourcePath"
Write-Host "Destination: $DestRoot"

if (-not (Test-Path $DestRoot)) {
    New-Item -ItemType Directory -Path $DestRoot -Force | Out-Null
}

$categories = @()

# Scan all subdirectories and treat each directory as its own category (relative to source)
Get-ChildItem -Path $SourcePath -Directory -Recurse | ForEach-Object {
    $dirPath = $_.FullName
    $relDir = $dirPath.Substring($SourcePath.Length).TrimStart('\')
    if ([string]::IsNullOrWhiteSpace($relDir)) { $relDir = $_.Name }

    $catDest = Join-Path $DestRoot $relDir
    if (-not (Test-Path $catDest)) { New-Item -ItemType Directory -Path $catDest -Force | Out-Null }

    $images = Get-ChildItem -Path $dirPath -File | Where-Object { $_.Extension -in '.jpg','.jpeg','.png','.webp','.avif' }
    if ($images.Count -eq 0) { return }

    $relPaths = @()
    foreach ($img in $images) {
        $destFile = Join-Path $catDest $img.Name
        Copy-Item -Path $img.FullName -Destination $destFile -Force
        $rel = Join-Path $DestRelative (Join-Path $relDir $img.Name)
        $rel = $rel -replace '\\\\','/'
        $relPaths += $rel
    }

    $categories += @{ name = $relDir; images = $relPaths }
}

# If there were no subdirectories (single-level), fall back to top-level directories
if ($categories.Count -eq 0) {
    Get-ChildItem -Path $SourcePath -Directory | ForEach-Object {
        $catName = $_.Name
        $catSource = $_.FullName
        $catDest = Join-Path $DestRoot $catName
        if (-not (Test-Path $catDest)) { New-Item -ItemType Directory -Path $catDest -Force | Out-Null }

        $images = Get-ChildItem -Path $catSource -Recurse -File | Where-Object { $_.Extension -in '.jpg','.jpeg','.png','.webp','.avif' }
        $relPaths = @()
        foreach ($img in $images) {
            $destFile = Join-Path $catDest $img.Name
            Copy-Item -Path $img.FullName -Destination $destFile -Force
            $rel = Join-Path $DestRelative (Join-Path $catName $img.Name)
            $rel = $rel -replace '\\\\','/'
            $relPaths += $rel
        }

        $categories += @{ name = $catName; images = $relPaths }
    }
}

$manifest = @{ categories = $categories }
$manifestJson = $manifest | ConvertTo-Json -Depth 10
Set-Content -Path $ManifestPath -Value $manifestJson -Encoding UTF8

Write-Host "Manifest oluşturuldu: $ManifestPath"
Write-Host "Kategoriler: $($categories.Count)"
Write-Host "Tamamlandı."