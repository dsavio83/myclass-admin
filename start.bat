@echo off
setlocal
echo ==========================================
echo Starting MyClass Project (Frontend + API)
echo ==========================================

:: Check if using MongoDB Atlas cloud database
findstr /i "mongodb+srv" api\.env >nul 2>&1
if %errorlevel% equ 0 (
    echo Using MongoDB Atlas Cloud Database.
    goto :db_ready
)

:: Ensure local MongoDB service is running
echo Checking local MongoDB service...
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 goto :no_db_service

for /f "tokens=4" %%a in ('sc query MongoDB ^| findstr /i "STATE"') do set STATE=%%a
if /i "%STATE%" equ "RUNNING" goto :db_ready

echo Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 goto :db_start_failed
echo MongoDB service started.
goto :db_ready

:no_db_service
echo Local MongoDB service not found. If using cloud database, ensure MONGODB_URI is set in api\.env.
pause
exit /b 1

:db_start_failed
echo Failed to start MongoDB service. Start it manually in the Services app and try again.
pause
exit /b 1

:db_ready
echo.
echo Starting Frontend and Backend servers...
echo.

:: Start Both Servers
npm run dev:all

echo.
echo Both servers are running.
echo Frontend: http://localhost:3001
echo Backend API: http://localhost:5001
echo.
pause
endlocal
