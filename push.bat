@echo off
echo Staging changes...
git add .
echo Committing changes...
set /p msg="Enter commit message (default: Update): "
if "%msg%"=="" set msg=Update
git commit -m "%msg%"
echo Pushing to GitHub...
git push origin main
echo Done!
pause
