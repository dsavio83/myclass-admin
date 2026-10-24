@echo off
echo ==========================================
echo Stopping MyClass Project
echo ==========================================

echo.
echo [1/2] Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2/2] Stopping Backend (Port 5001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001 ^| findstr LISTENING') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Project stopped.
pause
