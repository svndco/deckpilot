@echo off
REM DeckPilot Build Script for Windows

setlocal enabledelayedexpansion

REM Get to the project root directory
cd /d "%~dp0.."

echo ================================
echo DeckPilot Complete Build Script
echo ================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found. Could not find project root.
    exit /b 1
)

REM 1. Build DeckPilot Electron App
echo.
echo ==== Building DeckPilot Electron Application ====
echo.

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo SUCCESS: Dependencies installed
echo.

echo Building Electron app...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build Electron app
    exit /b 1
)
echo SUCCESS: DeckPilot app built successfully
echo.

REM Check for output
if exist "release" (
    echo Built files:
    dir /b release\
    echo SUCCESS: DeckPilot build artifacts in .\release\
) else (
    echo WARNING: release directory not found
)

REM 2. Build Companion Module
echo.
echo ==== Building Companion Module ====
echo.

set COMPANION_DIR=companion-module-aelive-deckpilot

if not exist "%COMPANION_DIR%" (
    echo ERROR: Companion module directory not found at .\%COMPANION_DIR%
    exit /b 1
)

cd "%COMPANION_DIR%"

echo Installing companion module dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: Failed to install companion module dependencies
    cd ..
    exit /b 1
)
echo SUCCESS: Companion module dependencies installed
echo.

echo Building companion module...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build companion module
    cd ..
    exit /b 1
)
echo SUCCESS: TypeScript compiled
echo.

echo Packaging companion module...
call npx companion-module-build
if errorlevel 1 (
    echo ERROR: Failed to package companion module
    cd ..
    exit /b 1
)
echo SUCCESS: Module packaged
echo.

REM Check for the built tarball
if exist "aelive-deckpilot-1.0.0.tgz" (
    echo SUCCESS: Companion module tarball created: aelive-deckpilot-1.0.0.tgz
    
    REM Copy to release folder
    echo Copying companion module to release folder...
    if not exist "..\release" mkdir "..\release"
    copy aelive-deckpilot-1.0.0.tgz "..\release\" >nul
    echo SUCCESS: Companion module copied to .\release\aelive-deckpilot-1.0.0.tgz
) else (
    echo WARNING: Module tarball not found
)

cd ..

REM 3. Summary
echo.
echo ==== Build Summary ====
echo.

echo SUCCESS: DeckPilot Electron app built
echo   - Location: .\release\
if exist "release\*.exe" (
    for %%f in (release\*.exe) do echo   - EXE: %%f
)
if exist "release\*.zip" (
    for %%f in (release\*.zip) do echo   - ZIP: %%f
)

echo.
echo SUCCESS: Companion module built
echo   - Location: .\release\aelive-deckpilot-1.0.0.tgz
echo   - Original: .\companion-module-aelive-deckpilot\aelive-deckpilot-1.0.0.tgz

echo.
echo ==== Next Steps ====
echo.

echo 1. Install DeckPilot:
echo    - Run the installer from .\release\
echo.

echo 2. Install Companion Module:
echo    Run the install script:
echo    cd companion-module-aelive-deckpilot
echo    build_sl_mod.bat
echo.
echo    Or manually:
echo    - Extract aelive-deckpilot-1.0.0.tgz to:
echo      %%APPDATA%%\companion\modules\aelive-deckpilot-1.0.0\
echo.

echo 3. Restart Companion to load the new module

echo.
echo SUCCESS: Build complete!
echo.

pause
