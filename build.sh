#!/bin/bash
# DeckPilot Interactive Build Script

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_section() { echo -e "\n${BLUE}==== $1 ====${NC}\n"; }

increment_version() {
    CURRENT=$(grep '"version":' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    MAJOR=$(echo $CURRENT | cut -d. -f1)
    MINOR=$(echo $CURRENT | cut -d. -f2)
    PATCH=$(echo $CURRENT | cut -d. -f3)
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    
    # Update all version locations
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" companion-module-svndco-deckpilot/package.json
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" companion-module-svndco-deckpilot/manifest.json
    sed -i '' "s/version-[0-9.]*-blue/version-$NEW_VERSION-blue/" README.md
    
    echo -e "${YELLOW}Version: $CURRENT → $NEW_VERSION${NC}"
}

build_electron() {
    print_section "Building Electron App"
    increment_version
    npm install
    npm run build
    print_success "Electron app built in ./release/"
}

build_companion() {
    print_section "Building Companion Module"
    increment_version
    cd companion-module-svndco-deckpilot
    npm install --legacy-peer-deps
    npm run build
    npx companion-module-build
    mkdir -p ../release
    cp svndco-deckpilot-*.tgz ../release/ 2>/dev/null || true
    print_success "Companion module built"
    cd ..
}

install_companion() {
    print_section "Installing Companion Module"
    cd companion-module-svndco-deckpilot
    TARBALL=$(ls svndco-deckpilot-*.tgz 2>/dev/null | head -n1)
    if [ -z "$TARBALL" ]; then
        print_error "No tarball found. Build first."
        cd ..
        return 1
    fi
    # Use constant module ID, not versioned name
    MODULE_ID="svndco-deckpilot"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        COMPANION_DIR="$HOME/Library/Application Support/companion/modules"
    else
        COMPANION_DIR="$HOME/.companion/modules"
    fi
    TARGET="$COMPANION_DIR/$MODULE_ID"
    rm -rf "$TARGET" 2>/dev/null || true
    mkdir -p "$TARGET"
    tar -xzf "$TARBALL" -C "$TARGET" --strip-components=1
    print_success "Installed to: $TARGET"
    print_warning "RESTART COMPANION to load module"
    cd ..
}

while true; do
    CURRENT_VERSION=$(grep '"version":' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}DeckPilot Build Menu${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}\n"
    echo "1) Build Electron App"
    echo "2) Build Companion Module"
    echo "3) Build Both"
    echo "4) Install Companion Module"
    echo "5) Build Companion + Install"
    echo "6) Build All + Install Companion"
    echo "0) Exit"
    echo ""
    read -p "Select: " choice
    
    case $choice in
        1) build_electron; read -p "Press Enter..." ;;
        2) build_companion; read -p "Press Enter..." ;;
        3) build_electron; build_companion; read -p "Press Enter..." ;;
        4) install_companion; read -p "Press Enter..." ;;
        5) build_companion; install_companion; read -p "Press Enter..." ;;
        6) build_electron; build_companion; install_companion; read -p "Press Enter..." ;;
        0) echo "Goodbye!"; exit 0 ;;
        *) print_error "Invalid option"; read -p "Press Enter..." ;;
    esac
done
