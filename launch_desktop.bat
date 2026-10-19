@echo off
setlocal
echo =============================================
echo   CampusOS: Local-First Desktop Application
echo =============================================

powershell -ExecutionPolicy Bypass -File "%~dp0launch_desktop.ps1"
