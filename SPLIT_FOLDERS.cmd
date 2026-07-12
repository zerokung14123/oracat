@echo off
title Split Projects into Standalone Directories
echo =======================================================
echo  Splitting TeenmaoFoto into Standalone Projects...
echo =======================================================
echo.

set CURRENT_DIR=%~dp0
set PARENT_DIR=%CURRENT_DIR%..\

echo Source: %CURRENT_DIR%
echo Target Parent: %PARENT_DIR%
echo.

:: 1. Split Backend
echo [1/3] Copying Backend API...
robocopy "%CURRENT_DIR%backend" "%PARENT_DIR%oracat-backend" /E /XD node_modules /XF database.sqlite > nul
echo Creating .gitignore for Backend...
(
echo .env
echo .env.*
echo node_modules/
echo database.sqlite
echo *.log
echo *.tmp
echo .DS_Store
) > "%PARENT_DIR%oracat-backend\.gitignore"

:: 2. Split Portfolio
echo [2/3] Copying Portfolio Client...
robocopy "%CURRENT_DIR%portfolio" "%PARENT_DIR%oracat-portfolio" /E /XD node_modules dist > nul
echo Creating .gitignore for Portfolio...
(
echo .env
echo .env.*
echo node_modules/
echo dist/
echo *.log
echo *.tmp
echo .DS_Store
) > "%PARENT_DIR%oracat-portfolio\.gitignore"

:: 3. Split Manager
echo [3/3] Copying Manager Dashboard...
robocopy "%CURRENT_DIR%manager" "%PARENT_DIR%oracat-manager" /E /XD node_modules dist > nul
echo Creating .gitignore for Manager...
(
echo .env
echo .env.*
echo node_modules/
echo dist/
echo *.log
echo *.tmp
echo .DS_Store
) > "%PARENT_DIR%oracat-manager\.gitignore"

echo.
echo =======================================================
echo  Initializing Git Repositories...
echo =======================================================
echo.

:: Init Git for Backend
echo Initing Backend Git...
cd /d "%PARENT_DIR%oracat-backend"
git init > nul
git add . > nul
git commit -m "Initial commit - Standalone Backend API" > nul

:: Init Git for Portfolio
echo Initing Portfolio Git...
cd /d "%PARENT_DIR%oracat-portfolio"
git init > nul
git add . > nul
git commit -m "Initial commit - Standalone Portfolio Showcase" > nul

:: Init Git for Manager
echo Initing Manager Git...
cd /d "%PARENT_DIR%oracat-manager"
git init > nul
git add . > nul
git commit -m "Initial commit - Standalone Manager Dashboard" > nul

echo.
echo =======================================================
echo  Success! Standalone directories created:
echo  1. %PARENT_DIR%oracat-backend
echo  2. %PARENT_DIR%oracat-portfolio
echo  3. %PARENT_DIR%oracat-manager
echo.
echo  Each folder is now an independent Git repository!
echo =======================================================
pause
