# OmniCode installer for Windows.
# Requires: PowerShell 5.1+, Node.js >= 22
#
# Usage:
#   irm https://github.com/edgyarmati/omnicode/releases/latest/download/install.ps1 | iex
#   # or pin a version:
#   $env:OMNICODE_VERSION = '0.1.0'; irm ... | iex

$ErrorActionPreference = 'Stop'

$RepoSlug = 'edgyarmati/omnicode'
$Version = if ($env:OMNICODE_VERSION) { $env:OMNICODE_VERSION } else { '0.1.0' }
$DataDir = if ($env:OMNICODE_DATA_DIR) {
  $env:OMNICODE_DATA_DIR
} elseif ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA 'OmniCode'
} else {
  Join-Path $HOME '.local\share\omnicode'
}
$BinDir = if ($env:OMNICODE_BIN_DIR) {
  $env:OMNICODE_BIN_DIR
} elseif ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA 'OmniCode\bin'
} else {
  Join-Path $HOME '.local\bin'
}
$MinimumNodeMajor = 22

# ── Check Node.js ────────────────────────────────────────────────────────────

$nodeExe = $null
try {
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
}
catch {
  Write-Error @"

Node.js $MinimumNodeMajor+ is required but not found.

Install Node.js:
  - Download from https://nodejs.org
  - Or: winget install OpenJS.NodeJS.LTS

Then rerun this installer.
"@
  exit 1
}

$nodeVersion = (node -v) -replace '^v', ''
$nodeMajor = $nodeVersion.Split('.')[0]
if ([int]$nodeMajor -lt $MinimumNodeMajor) {
  Write-Error "Node.js $MinimumNodeMajor+ is required, but found v$nodeVersion. Please upgrade."
  exit 1
}

# ── Download and extract ─────────────────────────────────────────────────────

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("omnicode-install-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
  $AssetUrl = "https://github.com/$RepoSlug/releases/download/v$Version/omnicode-$Version.tar.gz"
  $ArchivePath = Join-Path $TempDir 'omnicode.tar.gz'

  Write-Host "==> Downloading OmniCode v$Version"
  try {
    Invoke-WebRequest -Uri $AssetUrl -OutFile $ArchivePath
  }
  catch {
    Write-Error "Download failed. Check that v$Version exists at $AssetUrl"
    exit 1
  }

  Write-Host "==> Extracting to $DataDir"
  tar -xzf $ArchivePath -C $TempDir

  $SrcDir = Join-Path $TempDir "omnicode-$Version"
  if (-not (Test-Path $SrcDir)) {
    Write-Error "Unexpected archive layout - expected omnicode-$Version/ inside tarball"
    exit 1
  }

  # Remove previous lib, replace with new
  $LibDir = Join-Path $DataDir 'lib'
  if (Test-Path $LibDir) {
    Remove-Item -Recurse -Force $LibDir
  }
  Copy-Item -Recurse -Force $SrcDir $LibDir
  Write-Host "    Installed to $LibDir"

  # ── Create wrapper scripts ──────────────────────────────────────────────────

  # .cmd wrapper
  $CmdWrapper = Join-Path $BinDir 'omnicode.cmd'
  $EntryJs = Join-Path $LibDir 'bin\omnicode.js'
  @"
@echo off
node "$EntryJs" %*
"@ | Set-Content -Path $CmdWrapper -Encoding ASCII
  Write-Host "    Created launcher at $CmdWrapper"

  # PowerShell wrapper (so `omnicode` also works in PowerShell)
  $Ps1Wrapper = Join-Path $BinDir 'omnicode.ps1'
  @"
node "$EntryJs" @args
"@ | Set-Content -Path $Ps1Wrapper -Encoding ASCII

  # ── Verify ──────────────────────────────────────────────────────────────────

  if (-not (node --check $EntryJs 2>`$null)) {
    Write-Error 'Launcher script has syntax errors. Something went wrong with the install.'
    exit 1
  }

  Write-Host ''
  Write-Host "==> OmniCode v$Version installed successfully"
  Write-Host ''
  Write-Host 'Next step:'
  Write-Host '  omnicode'
  Write-Host ''
  $omnicodeCmd = Get-Command omnicode -ErrorAction SilentlyContinue
  if (-not $omnicodeCmd) {
    Write-Host "Add $BinDir to your PATH if not already there."
    Write-Host "  `$env:PATH = `"$BinDir;`$(`$env:PATH)`""
  }
}
finally {
  if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
  }
}
