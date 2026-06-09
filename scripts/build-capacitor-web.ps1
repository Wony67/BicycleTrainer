$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root "www"

if (Test-Path $www) {
  Remove-Item -LiteralPath $www -Recurse -Force
}

New-Item -ItemType Directory -Path $www | Out-Null

$assets = @(
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "service-worker.js",
  "version.json",
  "icon.svg",
  ".nojekyll"
)

foreach ($asset in $assets) {
  Copy-Item -LiteralPath (Join-Path $root $asset) -Destination (Join-Path $www $asset)
}

Write-Host "Prepared Capacitor web assets in $www"
