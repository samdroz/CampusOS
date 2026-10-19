# CampusOS Local Desktop Application Launcher
# Starts the standalone backend executable, verifies health handshake, and opens native app window.

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  CampusOS: Local-First Desktop Application" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Select Backend Executable
$BackendExe = "$RootDir\dist\campusos-backend.exe"
$UseScriptFallback = $false
if (-not (Test-Path $BackendExe)) {
    Write-Host "Standalone executable not found, using local Python entrypoint..." -ForegroundColor Yellow
    $UseScriptFallback = $true
}

$Port = 18420
$BackendUrl = "http://127.0.0.1:$Port"
$CurrentPid = $PID

Write-Host "`nStarting CampusOS backend sidecar on $BackendUrl..." -ForegroundColor Yellow

$BackendProcess = $null
if ($UseScriptFallback) {
    $PythonExe = "$RootDir\.venv\Scripts\python.exe"
    if (-not (Test-Path $PythonExe)) { $PythonExe = "python" }
    $env:PYTHONPATH = $RootDir
    $BackendProcess = Start-Process -FilePath $PythonExe `
        -ArgumentList "$RootDir\backend\desktop_entry.py", "--port", "$Port", "--parent-pid", "$CurrentPid" `
        -PassThru -NoNewWindow
} else {
    $BackendProcess = Start-Process -FilePath $BackendExe `
        -ArgumentList "--port", "$Port", "--parent-pid", "$CurrentPid" `
        -PassThru -NoNewWindow
}

# 2. Wait for Health Check Handshake
Write-Host "Waiting for backend health check handshake..." -ForegroundColor Yellow
$HealthUrl = "$BackendUrl/api/health"
$IsHealthy = $false

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 400
    try {
        $response = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response -and $response.status -eq "healthy") {
            $IsHealthy = $true
            break
        }
    } catch {
        # continue waiting
    }
}

if (-not $IsHealthy) {
    Write-Host "[ERROR] Backend startup handshake timed out." -ForegroundColor Red
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force
    }
    exit 1
}

Write-Host "Backend online and verified healthy!" -ForegroundColor Green

# 3. Launch Desktop Window
Write-Host "Launching CampusOS desktop window..." -ForegroundColor Cyan

$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgePath)) {
    $EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$AppWindow = $null
if (Test-Path $EdgePath) {
    $AppWindow = Start-Process -FilePath $EdgePath -ArgumentList "--app=$BackendUrl/", "--window-size=1280,820" -PassThru
} else {
    # Fallback to default browser
    Start-Process $BackendUrl
}

Write-Host "CampusOS is running. Close the desktop window to shut down." -ForegroundColor Green

# 4. Wait for user to exit and cleanly terminate backend
try {
    if ($AppWindow) {
        $AppWindow.WaitForExit()
    } else {
        Read-Host "Press Enter to exit CampusOS..."
    }
} finally {
    Write-Host "`nShutting down CampusOS backend..." -ForegroundColor Yellow
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force
    }
    Write-Host "CampusOS cleanly stopped." -ForegroundColor Green
}
