$ErrorActionPreference = 'Stop'

$RepoSlug = 'edgyarmati/omnicode'
$Version = if ($env:OMNICODE_VERSION) { $env:OMNICODE_VERSION } else { '0.1.0' }
$InstallDir = if ($env:OMNICODE_INSTALL_DIR) {
  $env:OMNICODE_INSTALL_DIR
} elseif ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA 'OmniCode\bin'
} else {
  Join-Path $HOME 'AppData\Local\OmniCode\bin'
}

function Get-PlatformArch {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    'ARM64' { 'arm64'; break }
    default { 'x64' }
  }
}

function Get-AssetUrl {
  $arch = Get-PlatformArch
  $asset = "omnicode-$Version-windows-$arch.zip"
  return "https://github.com/$RepoSlug/releases/download/v$Version/$asset"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("omnicode-install-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
  $AssetUrl = Get-AssetUrl
  $ArchivePath = Join-Path $TempDir 'omnicode.zip'
  $ExtractDir = Join-Path $TempDir 'extract'

  Write-Host "==> Downloading OmniCode from $AssetUrl"
  Invoke-WebRequest -Uri $AssetUrl -OutFile $ArchivePath

  Write-Host "==> Extracting OmniCode into $InstallDir"
  Expand-Archive -Path $ArchivePath -DestinationPath $ExtractDir -Force
  Copy-Item (Join-Path $ExtractDir 'omnicode.exe') (Join-Path $InstallDir 'omnicode.exe') -Force

  try {
    & (Join-Path $InstallDir 'omnicode.exe') --help | Out-Null
  }
  catch {
    Write-Warning 'Native launcher verification failed. Falling back to npm/npx bootstrap path.'
    if (Get-Command npx -ErrorAction SilentlyContinue) {
      npx omnicode@latest setup
      Write-Host '==> OmniCode installed through fallback bootstrap'
      return
    }
    throw 'OmniCode native launcher failed and npx is not available for fallback bootstrap.'
  }

  Write-Host '==> OmniCode installed successfully'
  Write-Host ''
  Write-Host 'Next step:'
  Write-Host '  omnicode'
  Write-Host ''
  Write-Host "If PowerShell cannot find omnicode yet, add $InstallDir to PATH."
}
finally {
  if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
  }
}
