@echo off
title Force Push to GitHub - TeenmaoFoto
echo =======================================================
echo Force pushing TeenmaoFoto codebase to:
echo https://github.com/zerokung14123/oracat
echo =======================================================
echo.
"C:\Program Files\Git\cmd\git.exe" push -f -u origin main
echo.
echo =======================================================
echo Complete. If you saw success messages above, your code is on GitHub!
echo =======================================================
pause
