@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.12 ou plus recent est necessaire.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd install --no-fund --no-audit
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Atlas Imagerie - demonstration locale fictive
echo Adresse : http://127.0.0.1:5173
echo Gardez cette fenetre ouverte. Ctrl+C pour arreter.
echo.
call npm.cmd run dev
pause
