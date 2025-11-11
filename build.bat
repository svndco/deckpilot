@echo off
REM DeckPilot Interactive Build Script for Windows
setlocal enabledelayedexpansion
cd /d "%~dp0"

:menu
cls
echo ================================
echo DeckPilot Build Menu
echo ================================
echo.
echo 1) Build Electron App
echo 2) Build Companion Module
echo 3) Build Both
echo 4) Install Companion Module
echo 5) Build Companion + Install
echo 6) Build All + Install Companion
echo 0) Exit
echo.
set /p choice="Select: "

if "%choice%"=="1" goto build_electron
if "%choice%"=="2" goto build_companion
if "%choice%"=="3" goto build_both
if "%choice%"=="4" goto install_companion
if "%choice%"=="5" goto build_companion_install
if "%choice%"=="6" goto build_all_install
if "%choice%"=="0" goto exit
echo Invalid option
pause
goto menu

:build_electron
echo.
echo ==== Building Electron App ====
echo.
call npm install
call npm run build
echo SUCCESS: Electron app built in .\release\
pause
goto menu

:build_companion
echo.
echo ==== Building Companion Module ====
echo.
cd companion-module-svndco-deckpilot
call npm install --legacy-peer-deps
call npm run build
call npx companion-module-build
if not exist "..\release" mkdir "..\release"
copy svndco-deckpilot-*.tgz "..\release\" >nul 2>&1
echo SUCCESS: Companion module built
cd ..
pause
goto menu

:build_both
call :build_electron
call :build_companion
goto menu

:install_companion
echo.
echo ==== Installing Companion Module ====
echo.
cd companion-module-svndco-deckpilot
for %%f in (svndco-deckpilot-*.tgz) do set TARBALL=%%f
if "%TARBALL%"=="" (
    echo ERROR: No tarball found. Build first.
    cd ..
    pause
    goto menu
)
set MODULE_NAME=%TARBALL:.tgz=%
set COMPANION_DIR=%APPDATA%\companion\modules
set TARGET=%COMPANION_DIR%\%MODULE_NAME%
if exist "%TARGET%" rd /s /q "%TARGET%"
mkdir "%TARGET%"
tar -xzf "%TARBALL%" -C "%TARGET%" --strip-components=1
echo SUCCESS: Installed to %TARGET%
echo WARNING: RESTART COMPANION to load module
cd ..
pause
goto menu

:build_companion_install
call :build_companion
call :install_companion
goto menu

:build_all_install
call :build_electron
call :build_companion
call :install_companion
goto menu

:exit
echo Goodbye!
exit /b 0
