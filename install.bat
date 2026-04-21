@echo off
:: MCP-FFmpeg Installer - Double-click to run
:: Runs install.ps1 with Administrator privileges

echo.
echo ========================================
echo   MCP-FFmpeg Server Installer
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo Press any key to close...
pause >nul
