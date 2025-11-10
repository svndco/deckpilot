# DeckPilot Build Scripts

This folder contains utility scripts for building and maintaining DeckPilot.

## Scripts

### `build-all.sh` / `build-all.bat`
Complete build script that compiles both the DeckPilot Electron app and the Companion module.

**Usage:**
```bash
# macOS/Linux
./scripts/build-all.sh

# Windows
scripts\build-all.bat
```

**What it does:**
1. Installs dependencies for main app
2. Builds DeckPilot Electron application
3. Installs dependencies for Companion module
4. Builds and packages Companion module
5. Copies all build artifacts to `./release/`

**Output:** All files in `./release/` folder

---

### `clean.sh`
Cleanup script that removes all build artifacts and temporary files.

**Usage:**
```bash
./scripts/clean.sh
```

**What it does:**
1. Removes build outputs (dist, dist-electron, release)
2. Removes node_modules from main app and companion module
3. Removes system files (.DS_Store, Thumbs.db, etc.)
4. Removes temporary files (*.tmp, *.temp)
5. Asks for confirmation before proceeding

**Note:** You'll need to run the build script again after cleaning.

---

## Requirements

- Node.js 18+ or 22+
- npm
- macOS: Xcode Command Line Tools
- Windows: Visual Studio Build Tools

## Workflow

### Initial Build
```bash
./scripts/build-all.sh
```

### Clean and Rebuild
```bash
./scripts/clean.sh
./scripts/build-all.sh
```

### Development
For development with hot reload, use from the project root:
```bash
npm run electron:dev
```

---

See the **Build from Source** section in the main `README.md` for detailed build documentation.
