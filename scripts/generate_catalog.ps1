# Generates .tmp/catalog.html from scripts/manifest.json so user can open it in browser and Save as PDF
Param()
$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Resolve-Path (Join-Path $scriptRoot '..')
$manifestPath = Join-Path $scriptRoot 'manifest.json'
if(-not (Test-Path $manifestPath)){
  Write-Error "Manifest not found: $manifestPath"
  exit 1
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$tmpDir = Join-Path $root '.tmp'
if(-not (Test-Path $tmpDir)){ New-Item -ItemType Directory -Path $tmpDir | Out-Null }
$outHtml = Join-Path $tmpDir 'catalog.html'

function ToFileUrl([string]$p){
  if(-not $p) { return '' }
  $resolved = $null
  # try as given
  try{ $resolved = Resolve-Path -LiteralPath $p -ErrorAction Stop }
  catch{
    # try joining with root
    $candidate = Join-Path $root $p
    try{ $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction Stop }catch{
      # try normalize slashes
      $candidate2 = ($candidate -replace '/','\\')
      try{ $resolved = Resolve-Path -LiteralPath $candidate2 -ErrorAction Stop }catch{ $resolved = $null }
    }
  }
  if(-not $resolved){ return '' }
  $path = $resolved.ProviderPath -replace '\\','/'
  if($env:OS -like '*Windows*'){ return 'file:///' + $path } else { return 'file://' + $path }
}

function EscapeHtml([string]$s){ if(-not $s){return ''}; return ($s -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' -replace '"','&quot;') }

$html = @"
<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Galeri Katalog</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#222;background:#fff;margin:24px}
  .cover{display:flex;flex-direction:column;align-items:center;justify-content:center;height:220px}
  .cover h1{font-size:36px;margin:0}
  .cover p{color:#666}
  .category{page-break-inside:avoid;margin:32px 0}
  .category h2{margin:8px 0 12px;font-size:18px;border-bottom:1px solid #ddd;padding-bottom:6px}
  .thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .thumb{border:1px solid #eee;padding:6px;display:flex;flex-direction:column;align-items:center}
  .thumb img{max-width:100%;height:220px;object-fit:cover}
  .meta{font-size:12px;color:#555;margin-top:6px}
  footer{position:fixed;left:24px;right:24px;bottom:12px;font-size:11px;color:#999}
  @media print{.cover{height:140px}} 
</style>
</head>
<body>
<div class='cover'>
  <h1>Galeri Katalog</h1>
  <p>Oluşturuldu: $(Get-Date -Format 'g')</p>
</div>
"@

$i = 0
foreach($cat in ($manifest.categories | ForEach-Object { $_ } )){
  $i++
  $name = ($cat.name -replace '\\','/')
  $html += "<section class='category'><h2>" + (EscapeHtml $name) + "</h2><div class='thumbs'>`n"
  foreach($img in ($cat.images | ForEach-Object { $_ } )){
    $fileUrl = ToFileUrl $img
    if([string]::IsNullOrEmpty($fileUrl)){ continue }
    $base = [System.IO.Path]::GetFileName($img)
    $html += '<div class="thumb"><img src="' + $fileUrl + '" alt=""><div class="meta">' + (EscapeHtml $base) + '</div></div>`n'
  }
  $html += "</div></section>`n"
}

$html += '<footer>Galeri Katalog — ' + (Get-Date -Format 'd') + '</footer></body></html>'

Set-Content -Path $outHtml -Value $html -Encoding UTF8
Write-Host "Written: $outHtml"
