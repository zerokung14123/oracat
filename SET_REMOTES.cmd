@echo off
title Configure Git Remotes and Commit
echo =======================================================
echo  Setting Up Git Remotes and Commit...
echo =======================================================
echo.

set CURRENT_DIR=%~dp0
set PARENT_DIR=%CURRENT_DIR%..\

:: Set local user configurations to ensure commit works without global variables
set GIT_USER=zerokung14123
set GIT_EMAIL=sosli@LAPTOP-MS944I11

:: 1. Portfolio (Frontend)
echo [1/3] Configuring Portfolio (Frontend Client) -> git@github.com:zerokung14123/oracat.git
cd /d "%PARENT_DIR%oracat-portfolio"
git remote remove origin 2>nul
git remote add origin git@github.com:zerokung14123/oracat.git
git config user.name "%GIT_USER%"
git config user.email "%GIT_EMAIL%"
git add .
git commit -m "Initial commit - Standalone Portfolio Showcase"
echo.

:: 2. Manager (Backend / Dashboard)
echo [2/3] Configuring Manager (Dashboard Web) -> git@github.com:zerokung14123/oracatback.git
cd /d "%PARENT_DIR%oracat-manager"
git remote remove origin 2>nul
git remote add origin git@github.com:zerokung14123/oracatback.git
git config user.name "%GIT_USER%"
git config user.email "%GIT_EMAIL%"
git add .
git commit -m "Initial commit - Standalone Manager Dashboard"
echo.

:: 3. Backend (API)
echo [3/3] Configuring Backend (API Server) -> git@github.com:zerokung14123/oracatapi.git
cd /d "%PARENT_DIR%oracat-backend"
git remote remove origin 2>nul
git remote add origin git@github.com:zerokung14123/oracatapi.git
git config user.name "%GIT_USER%"
git config user.email "%GIT_EMAIL%"
git add .
git commit -m "Initial commit - Standalone Backend Express API"
echo.

echo =======================================================
echo  Setup Complete! Remotes are set and files are committed.
echo  You can now push each repository by running:
echo  "git push -u origin main" in their respective folders.
echo =======================================================
pause
