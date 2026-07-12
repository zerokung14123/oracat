@echo off
title Oracat - Development Environment
cd /d "%~dp0"

echo =======================================================
echo           Oracat Development Environment
echo =======================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo Please install Node.js version 20 or higher and try again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists in root or subdirectories
set MISSING_DEPS=0
if not exist "node_modules" set MISSING_DEPS=1
if not exist "backend\node_modules" set MISSING_DEPS=1
if not exist "portfolio\node_modules" set MISSING_DEPS=1
if not exist "manager\node_modules" set MISSING_DEPS=1

if %MISSING_DEPS%==1 (
    echo [INFO] Missing dependencies detected. Installing all packages...
    echo This may take a few minutes...
    echo.
    call npm run install-all
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependency installation failed!
        echo Please resolve the issues above and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)

echo =======================================================
echo Starting development servers...
echo - Backend:   http://localhost:5000
echo - Portfolio: http://localhost:3000
echo - Manager:   http://localhost:3001
echo =======================================================
echo.

call npm run dev

pause
