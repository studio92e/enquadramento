@echo off
rem Abre o Enquadramento: liga o servidor local e abre o Chrome na pagina.
cd /d "%~dp0"
powershell -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 4747 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Minimized -FilePath node -ArgumentList '--use-system-ca','server.js' -WorkingDirectory '%~dp0.' }"
timeout /t 2 /nobreak >nul
start "" chrome "http://localhost:4747"
