@echo off
setlocal
echo ==========================================
echo Starting MyClass Project (Frontend + API)
echo ==========================================

:: Ensure MongoDB service is running
echo Checking MongoDB service...
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
echo MongoDB service not found. Please install or start MongoDB and try again.
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
