@echo off
setlocal

rem Run from this script's directory so paths work when launched from Explorer.
cd /d "%~dp0"

git rev-parse --show-toplevel >nul 2>&1
if errorlevel 1 (
    echo Error: this folder is not inside a Git repository.
    goto :failed
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Error: no Git remote named "origin" is configured.
    goto :failed
)

for /f "delims=" %%B in ('git branch --show-current') do set "branch=%%B"
if not defined branch (
    echo Error: Git is in detached HEAD state. Switch to a branch before pushing.
    goto :failed
)

git add -A
if errorlevel 1 (
    echo Error: could not stage changes.
    goto :failed
)

git diff --cached --quiet
if errorlevel 1 goto :commit
echo No staged changes to commit.
goto :push

:commit
set "msg="
set /p "msg=Commit message (default: Update): "
if not defined msg set "msg=Update"

git commit -m "%msg%"
if errorlevel 1 (
    echo Error: commit failed. Nothing was pushed.
    goto :failed
)

:push
echo Pushing branch "%branch%" to origin...
git push -u origin "%branch%"
if errorlevel 1 (
    echo Error: push failed. Check your GitHub authentication, repository write access, and remote URL.
    goto :failed
)

echo Push completed successfully.
pause
exit /b 0

:failed
pause
exit /b 1
