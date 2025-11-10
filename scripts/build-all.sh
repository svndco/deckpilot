#!/bin/bash
# DeckPilot Build Script
# Works on macOS and Linux (use build-all.bat for Windows)

set -e  # Exit on error

echo "================================"
echo "DeckPilot Complete Build Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}==== $1 ====${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Get to the project root directory
cd "$(dirname "$0")/.." || exit 1

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Could not find project root."
    exit 1
fi

# 1. Build DeckPilot Electron App
print_section "Building DeckPilot Electron Application"

echo "Installing dependencies..."
npm install
print_success "Dependencies installed"

echo "Building Electron app..."
npm run build
print_success "DeckPilot app built successfully"

# Check for output
if [ -d "release" ]; then
    echo ""
    echo "Built files:"
    ls -lh release/
    print_success "DeckPilot build artifacts in ./release/"
else
    print_error "Warning: release directory not found"
fi

# 2. Build Companion Module
print_section "Building Companion Module"

COMPANION_DIR="companion-module-aelive-deckpilot"

if [ ! -d "$COMPANION_DIR" ]; then
    print_error "Error: Companion module directory not found at ./$COMPANION_DIR"
    exit 1
fi

cd "$COMPANION_DIR"

echo "Installing companion module dependencies..."
npm install --legacy-peer-deps
print_success "Companion module dependencies installed"

echo "Building companion module..."
npm run build
print_success "TypeScript compiled"

echo "Packaging companion module..."
npx companion-module-build
print_success "Module packaged"

# Check for the built tarball
if [ -f "companion-module-svndco-deckpilot-0.0.2.tgz" ]; then
    print_success "Companion module tarball created: companion-module-svndco-deckpilot-0.0.2.tgz"
    
    # Copy to release folder
    echo "Copying companion module to release folder..."
    mkdir -p ../release
    cp companion-module-svndco-deckpilot-0.0.2.tgz ../release/
    print_success "Companion module copied to ./release/companion-module-svndco-deckpilot-0.0.2.tgz"
else
    print_error "Warning: Module tarball not found"
fi

cd ..

# 3. Summary
print_section "Build Summary"

echo "✓ DeckPilot Electron app built"
echo "  - Location: ./release/"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  - DMG: $(ls release/*.dmg 2>/dev/null || echo 'Not found')"
    echo "  - ZIP: $(ls release/*.zip 2>/dev/null || echo 'Not found')"
fi

echo ""
echo "✓ Companion module built"
echo "  - Location: ./release/companion-module-svndco-deckpilot-0.0.2.tgz"
echo "  - Original: ./companion-module-aelive-deckpilot/companion-module-svndco-deckpilot-0.0.2.tgz"

echo ""
print_section "Next Steps"

echo "1. Install DeckPilot:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   - Open ./release/DeckPilot-*.dmg and drag to Applications"
else
    echo "   - Install from ./release/"
fi

echo ""
echo "2. Install Companion Module:"
echo "   Run the install script:"
echo "   cd companion-module-aelive-deckpilot"
echo "   ./build_sl_mod"
echo ""
echo "   Or manually:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   mkdir -p ~/Library/Application\\ Support/companion/modules/companion-module-svndco-deckpilot-0.0.2"
    echo "   tar -xzf companion-module-svndco-deckpilot-0.0.2.tgz -C ~/Library/Application\\ Support/companion/modules/companion-module-svndco-deckpilot-0.0.2 --strip-components=1"
else
    echo "   mkdir -p ~/.companion/modules/companion-module-svndco-deckpilot-0.0.2"
    echo "   tar -xzf companion-module-svndco-deckpilot-0.0.2.tgz -C ~/.companion/modules/companion-module-svndco-deckpilot-0.0.2 --strip-components=1"
fi

echo ""
echo "3. Restart Companion to load the new module"

echo ""
print_success "Build complete!"
