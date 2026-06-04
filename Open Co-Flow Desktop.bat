@echo off
REM Open Co-Flow as an Electron desktop application.
REM This shortcut is for Windows users who prefer double-clicking.

cd /d "%~dp0"
echo Opening Co-Flow Electron desktop prototype...
echo This is not the browser preview mode.

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 pause && exit /b 1
)

echo Resetting local demo database...
call npm run seed
if errorlevel 1 pause && exit /b 1

echo Starting Electron desktop app...
call npm start
pause
