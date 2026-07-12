@echo off
title Push All Sites to GitHub (HTTPS)
echo =======================================================
echo  Updating Remotes to HTTPS and Pushing to GitHub...
echo =======================================================
echo.

set CURRENT_DIR=%~dp0
set PARENT_DIR=%CURRENT_DIR%..\

:: 1. Push Portfolio
echo [1/3] Pushing Portfolio Showcase -> https://github.com/zerokung14123/oracat.git
cd /d "%PARENT_DIR%oracat-portfolio"
git remote set-url origin https://github.com/zerokung14123/oracat.git 2>nul || git remote add origin https://github.com/zerokung14123/oracat.git
git branch -M main
git push -f -u origin main
echo.

:: 2. Push Manager
echo [2/3] Pushing Manager Dashboard -> https://github.com/zerokung14123/oracatback.git
cd /d "%PARENT_DIR%oracat-manager"
git remote set-url origin https://github.com/zerokung14123/oracatback.git 2>nul || git remote add origin https://github.com/zerokung14123/oracatback.git
git branch -M main
git push -f -u origin main
echo.

:: 3. Push Backend
echo [3/3] Pushing Backend Express API -> https://github.com/zerokung14123/oracatapi.git
cd /d "%PARENT_DIR%oracat-backend"
git remote set-url origin https://github.com/zerokung14123/oracatapi.git 2>nul || git remote add origin https://github.com/zerokung14123/oracatapi.git
git branch -M main
git push -f -u origin main
echo.

echo =======================================================
echo  Push Complete!
echo =======================================================
pause
