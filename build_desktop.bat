@echo off
setlocal enabledelayedexpansion

echo =============================================
echo   CampusOS: Reproducible Desktop Build System
echo =============================================

rem 1. Check Python
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    set "PYINSTALLER_EXE=.venv\Scripts\pyinstaller.exe"
) else (
    set "PYTHON_EXE=python"
    set "PYINSTALLER_EXE=pyinstaller"
)

echo.
echo [1/4] Running backend verification tests...
set "PYTHONPATH=."
%PYTHON_EXE% -m pytest backend\tests -v
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend tests failed. Aborting build.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Building frontend production bundle...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed. Aborting build.
    cd ..
    exit /b %ERRORLEVEL%
)
cd ..

echo.
set "PYTHONPATH=."
%PYINSTALLER_EXE% --name campusos-backend --onefile --clean --paths . --collect-all backend --collect-all uvicorn --collect-all fastapi --collect-all pydantic --collect-all sqlalchemy --add-data "frontend\dist;frontend/dist" backend\desktop_entry.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] PyInstaller packaging failed.
    exit /b %ERRORLEVEL%
)

copy /Y "dist\campusos-backend.exe" "frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-msvc.exe" >nul
copy /Y "dist\campusos-backend.exe" "frontend\src-tauri\binaries\campusos-backend-x86_64-pc-windows-gnu.exe" >nul

echo.
echo [4/4] Checking Tauri desktop build...
where cargo >nul 2>nul
if %ERRORLEVEL% equ 0 (
    cd frontend
    call npx tauri build
    cd ..
) else (
    echo Note: Local MSVC Cargo not in PATH. Full MSI/EXE release packaging runs via GitHub Actions.
)

echo.
echo =============================================
echo   CampusOS Desktop Build Completed!
echo =============================================
echo Run local desktop application: launch_desktop.bat
