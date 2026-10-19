# CampusOS Desktop Build Script (Windows)
# Builds standalone backend sidecar, frontend production bundle, and desktop package.

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CampusOS: Reproducible Desktop Build System" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot

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
& $PyInstallerExe --name campusos-backend --onefile --clean `
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
$CscExe = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (Test-Path $CscExe) {
    Write-Host "Compiling native Windows launcher (dist\CampusOS.exe)..." -ForegroundColor Yellow
    & $CscExe /target:winexe /win32icon:"$RootDir\frontend\src-tauri\icons\icon.ico" /out:"$RootDir\dist\CampusOS.exe" "$RootDir\launcher\Program.cs"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "C# Launcher compilation failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
    if (-not (Test-Path "$RootDir\dist\CampusOS.exe")) {
        Write-Error "Native launcher dist\CampusOS.exe was not created."
        exit 1
    }
}

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

if ($MakensisExe -and (Test-Path $MakensisExe)) {
    Write-Host "Compiling Windows installer package using $MakensisExe..." -ForegroundColor Yellow
    Remove-Item -Path "$RootDir\dist\CampusOS_1.0.0_Setup.exe" -Force -ErrorAction SilentlyContinue
    & $MakensisExe "$RootDir\installer\CampusOS.nsi"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "NSIS compilation failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
    if (-not (Test-Path "$RootDir\dist\CampusOS_1.0.0_Setup.exe")) {
        Write-Error "Expected installer dist\CampusOS_1.0.0_Setup.exe was not created."
        exit 1
    }
    Write-Host "Installer built successfully: dist\CampusOS_1.0.0_Setup.exe" -ForegroundColor Green
} else {
    Write-Host "makensis.exe not found in standard directories or PATH. Skipping local NSIS installer generation." -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "  CampusOS Desktop Build Completed!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
if (Test-Path "$RootDir\dist\CampusOS_1.0.0_Setup.exe") {
    Write-Host "Installer package:              dist\CampusOS_1.0.0_Setup.exe"
    Write-Host "To test the installed app:      dist\CampusOS_1.0.0_Setup.exe"
} else {
    Write-Host "Installer package:              (Skipped - NSIS not found)"
}
Write-Host "Native launcher executable:     dist\CampusOS.exe"
Write-Host "Backend standalone executable:  dist\campusos-backend.exe"
Write-Host "Frontend production bundle:     frontend\dist\"
Write-Host "Desktop sidecar binary:         frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-msvc.exe"
Write-Host "To run the application locally: .\launch_desktop.ps1"
