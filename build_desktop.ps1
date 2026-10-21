# CampusOS Desktop Build Script (Windows)
# Builds standalone backend sidecar, frontend production bundle, and desktop package.
param(
    [string]$AppVersion = "",
    [switch]$SkipInstaller = $false
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CampusOS: Reproducible Desktop Build System" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot

# Resolve application version
if (-not $AppVersion -and $env:CAMPUSOS_VERSION) {
    $AppVersion = $env:CAMPUSOS_VERSION -replace '^v', ''
}
if (-not $AppVersion -and $env:GITHUB_REF_NAME) {
    if ($env:GITHUB_REF_NAME -match '^v?(\d+\.\d+\.\d+.*)$') {
        $AppVersion = $Matches[1]
    }
}
if (-not $AppVersion -and (Test-Path "$RootDir\frontend\src-tauri\tauri.conf.json")) {
    try {
        $tauriConf = Get-Content "$RootDir\frontend\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
        $AppVersion = $tauriConf.version
    } catch {}
}
if (-not $AppVersion) {
    $AppVersion = "1.0.0"
}
$env:CAMPUSOS_VERSION = $AppVersion
Set-Content -Path "$RootDir\backend\app\version.py" -Value "# Auto-generated during desktop build`r`n__version__ = '$AppVersion'" -Encoding utf8
$InstallerName = "CampusOS_${AppVersion}_Setup.exe"
$InstallerPath = "$RootDir\dist\$InstallerName"
# Remove any existing target installer to avoid retaining stale artifacts on early failure (BLD-01)
if (Test-Path $InstallerPath) {
    Remove-Item -Path $InstallerPath -Force -ErrorAction SilentlyContinue
}
Write-Host "Target Version: $AppVersion (Installer: dist\$InstallerName)`n" -ForegroundColor Cyan

# Step 1: Python environment and backend test execution
Write-Host "`n[1/5] Verifying Python backend dependencies..." -ForegroundColor Yellow
$PythonExe = "$RootDir\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}
& $PythonExe -m pip install -r "$RootDir\backend\requirements.txt" --quiet

Write-Host "Running backend automated verification tests..." -ForegroundColor Yellow
$env:PYTHONPATH = $RootDir
& $PythonExe -m pytest "$RootDir\backend\tests" -v
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend test suite failed. Aborting build."
}

# Step 2: Build frontend production bundle
Write-Host "`n[2/5] Building frontend production bundle..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed. Aborting build."
}
Set-Location $RootDir

# Step 3: Package standalone FastAPI backend executable with PyInstaller
Write-Host "`n[3/5] Packaging FastAPI backend with PyInstaller..." -ForegroundColor Yellow
$PyInstallerExe = "$RootDir\.venv\Scripts\pyinstaller.exe"
if (-not (Test-Path $PyInstallerExe)) {
    $PyInstallerExe = "pyinstaller"
}

New-Item -ItemType Directory -Force -Path "$RootDir\frontend\src-tauri\binaries" | Out-Null
$env:PYTHONPATH = "$RootDir"
& $PyInstallerExe --name campusos-backend --onefile --clean `
    --paths "$RootDir" `
    --collect-all backend `
    --collect-all uvicorn `
    --collect-all fastapi `
    --collect-all pydantic `
    --collect-all sqlalchemy `
    --add-data "$RootDir\frontend\dist;frontend/dist" `
    "$RootDir\backend\desktop_entry.py"

if ($LASTEXITCODE -ne 0) {
    Write-Error "PyInstaller packaging failed."
}

# Copy sidecar binary with MSVC and GNU triples
Copy-Item "$RootDir\dist\campusos-backend.exe" -Destination "$RootDir\frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-msvc.exe" -Force
Copy-Item "$RootDir\dist\campusos-backend.exe" -Destination "$RootDir\frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-gnu.exe" -Force
Write-Host "Standalone backend sidecar created at dist\campusos-backend.exe" -ForegroundColor Green

# Step 4: Build Native Launcher & NSIS Windows Installer
Write-Host "`n[4/5] Building Native Windows Launcher and NSIS Installer..." -ForegroundColor Yellow

$LauncherPath = "$RootDir\dist\CampusOS.exe"
# Remove stale launcher binary to prevent packaging an obsolete executable
if (Test-Path $LauncherPath) {
    Remove-Item -Path $LauncherPath -Force -ErrorAction SilentlyContinue
}

$CscCandidates = @(
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$CscExe = $CscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $CscExe) {
    $cmd = Get-Command csc.exe -ErrorAction SilentlyContinue
    if ($cmd) { $CscExe = $cmd.Source }
}

if (-not $CscExe -or -not (Test-Path $CscExe)) {
    Write-Error "FATAL: C# compiler (csc.exe) not found in standard .NET Framework directories or PATH. Native launcher compilation cannot proceed."
    exit 1
}

Write-Host "Compiling native Windows launcher (dist\CampusOS.exe) using $CscExe..." -ForegroundColor Yellow
& $CscExe /target:winexe /win32icon:"$RootDir\frontend\src-tauri\icons\icon.ico" /out:"$LauncherPath" "$RootDir\launcher\Program.cs"
if ($LASTEXITCODE -ne 0) {
    Write-Error "FATAL: C# Launcher compilation failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}
if (-not (Test-Path $LauncherPath)) {
    Write-Error "FATAL: Native launcher dist\CampusOS.exe was not created."
    exit 1
}
Write-Host "Native launcher compiled successfully: dist\CampusOS.exe" -ForegroundColor Green

if (-not $SkipInstaller) {
    $MakensisCandidates = @(
        "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
        "$env:ProgramFiles\NSIS\makensis.exe",
        "$env:LOCALAPPDATA\NSIS\nsis-3.10\Bin\makensis.exe",
        "$env:LOCALAPPDATA\NSIS\nsis-3.10\makensis.exe",
        "$env:ChocolateyInstall\bin\makensis.exe"
    )
    $MakensisExe = $MakensisCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $MakensisExe) {
        $cmd = Get-Command makensis.exe -ErrorAction SilentlyContinue
        if ($cmd) { $MakensisExe = $cmd.Source }
    }
    if (-not $MakensisExe -and (Test-Path "$env:LOCALAPPDATA\NSIS")) {
        $found = Get-ChildItem -Path "$env:LOCALAPPDATA\NSIS" -Filter "makensis.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
        if ($found) { $MakensisExe = $found }
    }

    if (-not $MakensisExe -or -not (Test-Path $MakensisExe)) {
        Write-Error "FATAL: NSIS compiler (makensis.exe) not found in standard installation directories or PATH. Installer generation cannot proceed."
        exit 1
    }

    # Verify all required inputs exist prior to installer compilation
    $RequiredInputs = @(
        $LauncherPath,
        "$RootDir\dist\campusos-backend.exe",
        "$RootDir\frontend\dist\index.html",
        "$RootDir\frontend\src-tauri\icons\icon.ico",
        "$RootDir\installer\CampusOS.nsi"
    )
    foreach ($req in $RequiredInputs) {
        if (-not (Test-Path $req)) {
            Write-Error "FATAL: Required installer packaging input was not found: $req"
            exit 1
        }
    }

    Write-Host "Compiling Windows installer package ($InstallerName) using $MakensisExe..." -ForegroundColor Yellow
    Remove-Item -Path $InstallerPath -Force -ErrorAction SilentlyContinue
    & $MakensisExe "/DPRODUCT_VERSION=$AppVersion" "$RootDir\installer\CampusOS.nsi"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "FATAL: NSIS compilation failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
    if (-not (Test-Path $InstallerPath)) {
        Write-Error "FATAL: Expected installer $InstallerPath was not created."
        exit 1
    }
    Write-Host "Installer built successfully: dist\$InstallerName" -ForegroundColor Green
} else {
    Write-Host "Skipping NSIS installer creation (-SkipInstaller switch specified)." -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "  CampusOS Desktop Build Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
if (Test-Path $InstallerPath) {
    Write-Host "Installer package:              dist\$InstallerName"
    Write-Host "To test the installed app:      dist\$InstallerName"
} else {
    Write-Host "Installer package:              (Skipped via -SkipInstaller)"
}
Write-Host "Native launcher executable:     dist\CampusOS.exe"
Write-Host "Backend standalone executable:  dist\campusos-backend.exe"
Write-Host "Frontend production bundle:     frontend\dist\"
Write-Host "Desktop sidecar binary:         frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-msvc.exe"
Write-Host "To run the application locally: .\launch_desktop.ps1"
