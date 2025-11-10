#!/bin/bash
# DeckPilot Cleanup Script
# Removes all build artifacts and temporary files

set -e

echo "================================"
echo "DeckPilot Cleanup Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_section() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# Get to the project root directory
cd "$(dirname "$0")/.." || exit 1

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Could not find project root."
    exit 1
fi

echo "This will remove:"
echo "  - Build outputs (dist, dist-electron, release)"
echo "  - Node modules"
echo "  - Companion module build artifacts"
echo "  - System files (.DS_Store, Thumbs.db)"
echo "  - Temporary files"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
print_section "Cleaning DeckPilot build artifacts..."

# Remove build directories
if [ -d "dist" ]; then
    rm -rf dist
    print_success "Removed dist/"
fi

if [ -d "dist-electron" ]; then
    rm -rf dist-electron
    print_success "Removed dist-electron/"
fi

if [ -d "release" ]; then
    rm -rf release
    print_success "Removed release/"
fi

# Remove node_modules
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "Removed node_modules/"
fi

# Remove system files
find . -name ".DS_Store" -type f -delete 2>/dev/null && print_success "Removed .DS_Store files" || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null && print_success "Removed Thumbs.db files" || true
find . -name "Desktop.ini" -type f -delete 2>/dev/null && print_success "Removed Desktop.ini files" || true

# Remove temporary files
find . -name "*.tmp" -type f -delete 2>/dev/null && print_success "Removed *.tmp files" || true
find . -name "*.temp" -type f -delete 2>/dev/null && print_success "Removed *.temp files" || true

print_section "Cleaning Companion module artifacts..."

COMPANION_DIR="companion-module-aelive-deckpilot"
if [ -d "$COMPANION_DIR" ]; then
    cd "$COMPANION_DIR"
    
    # Remove build directories
    if [ -d "dist" ]; then
        rm -rf dist
        print_success "Removed companion dist/"
    fi
    
    if [ -d "pkg" ]; then
        rm -rf pkg
        print_success "Removed companion pkg/"
    fi
    
    # Remove node_modules
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_success "Removed companion node_modules/"
    fi
    
    # Remove tarball
    if [ -f "aelive-deckpilot-1.0.0.tgz" ]; then
        rm -f aelive-deckpilot-1.0.0.tgz
        print_success "Removed companion tarball"
    fi
    
    cd ..
fi

echo ""
print_success "Cleanup complete!"
echo ""
print_warning "To rebuild, run: ./scripts/build-all.sh"
