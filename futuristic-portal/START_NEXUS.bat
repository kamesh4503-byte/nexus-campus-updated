@echo off
cd /d "%~dp0"
title Nexus Campus Launcher
echo ==========================================
echo        NEXUS CAMPUS - STARTING
echo ==========================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python and enable "Add Python to PATH".
  pause
  exit /b 1
)
echo Installing/checking requirements...
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Could not install requirements.
  pause
  exit /b 1
)
echo.
echo Starting Nexus Campus at http://localhost:5500
start "Nexus Campus Server" /min cmd /c "cd /d ""%~dp0"" && python server.py"
timeout /t 2 /nobreak >nul
start "" "http://localhost:5500/admin.html"
echo Admin page opened in your browser.
echo Default local admin password: nexus-admin-2026
timeout /t 3 /nobreak >nul
exit
