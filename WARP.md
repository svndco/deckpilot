# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**DeckPilot** is a professional Electron-based desktop application for managing shot/take names on Blackmagic HyperDeck recorders. It integrates with Bitfocus Companion via OSC for Stream Deck control and provides real-time status monitoring of multiple recorders.

**Key Features:**
- Multi-recorder management with independent shot/take numbering
- Three template modes: Show (simple), Take (structured), Custom (freeform)
- Bidirectional OSC communication with Companion
- Real-time HyperDeck status monitoring (online/offline, timecode, transport status, codec)
- Per-recorder configuration with history tracking

## Build Commands

### Development
```bash
npm install                    # Install dependencies
npm run electron:dev           # Run in development mode (Vite + Electron with hot reload)
npm run dev                    # Start Vite dev server only
```

### Production Build
```bash
npm run build                  # Full production build (TypeScript + Vite + Electron + electron-builder)
npm run build:electron         # Build Electron main process only (node electron/build.js)
./scripts/build-all.sh         # Build both app and Companion module (macOS/Linux)
scripts/build-all.bat          # Build both app and Companion module (Windows)
```

### Companion Module
```bash
cd companion-module-aelive-deckpilot
npm install --legacy-peer-deps
npm run build
npx companion-module-build
./build_sl_mod                 # Install module to Companion automatically
```

### Build Artifacts
All builds output to `./release/`:
- **macOS**: `.dmg` installer and `.zip` portable
- **Windows**: `.exe` installer and `.zip` portable
- **Companion Module**: `aelive-deckpilot-1.0.0.tgz`

## Architecture

### High-Level Structure

**Electron Multi-Process Architecture:**
- **Main Process** (`electron/main.ts`): Manages application lifecycle, IPC, OSC communication, HyperDeck telnet protocol (port 9993), file system state persistence
- **Renderer Process** (`src/`): React UI with Zustand-like state management via IPC bridge
- **Preload Script** (`electron/preload.ts`): Secure IPC bridge between main and renderer

**Key Directories:**
```
deckpilot/
├── electron/                    # Main process
│   ├── main.ts                 # OSC, HyperDeck protocol, IPC handlers, state management
│   ├── preload.ts              # IPC API bridge
│   └── build.js                # esbuild script for main process
├── src/                        # React renderer
│   ├── components/             # React components (RecorderList, TakeInput, Settings, PlaybackView, CueView)
│   ├── App.tsx                 # Main app with view routing (take-control/play/cue)
│   └── App.css                 # Dark theme styles
├── shared/                     # Shared TypeScript types
│   └── types.ts                # AppState, Recorder, IPC_CHANNELS, OscSettings, etc.
├── companion-module-aelive-deckpilot/  # Companion module (separate TypeScript project)
└── public/                     # Static assets
```

### Critical Architectural Patterns

**1. State Management:**
- Main process holds canonical `AppState` (recorders, takes, history, templates, OSC settings)
- Persisted to `config.json` in userData directory (platform-specific)
- Renderer syncs via IPC: `getState()`, `onStateUpdated()` listener
- All mutations go through IPC handlers → main process → `saveState()` → broadcast to renderer

**2. Communication Flows:**

**OSC Bidirectional:**
- **Outgoing** (DeckPilot → Companion): Single port (default 8014), address pattern `/deckpilot/{recorder_name}`, args: `[takeName, shotNum, takeNum, recorderName]`
- **Incoming** (Companion → DeckPilot): Single listener port (default 8012), commands: `/deckpilot/{recorder}/setTake` or `/deckpilot/all/setAll`
- **Sanitization**: Recorder names in OSC paths replace all non-alphanumeric chars with underscores (`HYPER-41` → `HYPER_41`)
- **Transport State**: NOT sent via OSC - use Blackmagic HyperDeck Companion module for accurate transport state from hardware

**HyperDeck Protocol:**
- Telnet on port 9993 (standard HyperDeck control port)
- Polling every 5 seconds: connection status, `transport info` for timecode/status, `configuration` for codec
- Commands: `play`, `stop`, `record`, `goto: clip id: N`, `goto: timecode: HH:MM:SS:FF`

**3. Take Name Generation:**
- Template 1 (Show): `{showName}_{date}`
- Template 2 (Take): `{showName}_{date}_S{shot}_T{take}_{customText}` (auto-increments take, resets take when shot increments)
- Template 3 (Custom): `{customText}`
- Date formats: 9 options (YYYYMMDD, YYYY-MM-DD, YYYYMMDDHHmm, HHmmss, etc.)
- Generation happens in main process (`generateTakeName()` function)

**4. UI Views:**
- **Take Control View**: Selected recorder, shot/take number controls, template selection, take name input with history
- **Play View**: Per-recorder cards with clip selector, transport controls (stop/play-pause/next/record), timecode navigation, current/next take display, recorder management (add/edit/delete)
- **Cue View**: Unified table of all clips from all recorders with cue numbers, sortable columns (Cue/Clip Name/Recorder/Duration), play/stop actions per clip

**5. IPC Channels:**
All defined in `shared/types.ts` as `IPC_CHANNELS` const:
- State operations: `GET_STATE`, `ADD_RECORDER`, `UPDATE_RECORDER`, `REMOVE_RECORDER`
- Take operations: `SET_TAKE_NAME`, `SET_SHOW_NAME`, `SET_DATE_FORMAT`, `GET_TAKE_HISTORY`
- Shot/Take counters: `SET_RECORDER_SHOT_NUMBER`, `INCREMENT_RECORDER_SHOT`, `INCREMENT_RECORDER_TAKE`
- Transport: `TRANSPORT_PLAY`, `TRANSPORT_STOP`, `TRANSPORT_NEXT`, `GET_CLIPS`, `GOTO_CLIP`, `GOTO_TIMECODE`
- Config: `SET_OSC_SETTINGS`, `EXPORT_SHOW`, `IMPORT_SHOW`

### Type System

All shared types in `shared/types.ts`:
- `Recorder`: id, name, ipAddress, format, online status, shot/takeNumbers, OSC settings (host/port), timecode, transportStatus, clips
- `AppState`: recorders array, currentTakes map, takeHistory, templates, showName, dateFormat, oscSettings
- `OscSettings`: enabled, sendHost, companionPort (for responses), listenerHost, listenerPort, listenerEnabled
- `TakeTemplate`: id, name, format string, variables array
- `DateFormat`: union type of 9 date format strings

## Development Notes

### Testing OSC
Use `test-osc.js` in root to send test OSC commands:
```bash
node test-osc.js
```

### Configuration Location
- **macOS**: `~/Library/Application Support/deckpilot/config.json`
- **Windows**: `%APPDATA%/deckpilot/config.json`
- **Linux**: `~/.config/deckpilot/config.json`

### HyperDeck Connection Testing
Port 9993 must be accessible. Check status with:
```bash
nc -zv <hyperdeck-ip> 9993
```

### Path Aliases
Both main and renderer use TypeScript path aliases:
- `@/*` → `src/*` (renderer only)
- `@shared/*` → `shared/*` (both main and renderer)

Configured in:
- `tsconfig.json` (renderer)
- `vite.config.ts` (Vite resolver)
- `electron/build.js` (main process uses `@shared` alias resolution)

### Debugging
- Development mode opens DevTools automatically
- Main process logs to terminal
- OSC messages logged with prefix `Received OSC:` or `Sending OSC:`
- HyperDeck responses logged for codec/transport queries

### State Migration
`loadState()` in `electron/main.ts` handles automatic migration for:
- Adding shot/take numbers to existing recorders
- Adding OSC settings to recorders without them (sequential port assignment starting at 8013)
- Converting old template formats to new (Broadcast → Show, Scene → Shot)
- Adding Custom template if missing

### Common Gotchas

**1. OSC Recorder Name Mismatch:**
Always sanitize recorder names for OSC paths: `recorder.name.replace(/[^a-zA-Z0-9]/g, '_')`. Both DeckPilot and Companion module must use the same sanitization.

**2. Take Auto-Increment:**
Only happens in Template 2 (Take mode) and only after `SET_TAKE_NAME` IPC call, not on manual number changes

**3. Shot Number Changes Reset Take:**
When shot number changes, take number resets to 1 (see `SET_RECORDER_SHOT_NUMBER` handler)

**4. WebSocket Removed:**
Old versions used WebSocket for Companion. Now **OSC-only**. No WebSocket code should be added.

**5. Electron Builder:**
Build config in `package.json` under `build` key. Output to `release/` dir. Uses `dist/` (renderer) and `dist-electron/` (main).

**6. Companion Module Build:**
Uses `companion-module-build` CLI. Requires `--legacy-peer-deps` for npm install. Output is `.tgz` tarball.

**7. Two OSC Ports (Not Per-Recorder):**
Port 8014 (DeckPilot → Companion) and port 8012 (Companion → DeckPilot). Recorder identity is in the OSC address path, not port number. No per-recorder port configuration needed.

**8. BMD Module Integration:**
DeckPilot works alongside the Blackmagic HyperDeck Companion module. Use BMD module for transport state/control (accurate hardware state). Use DeckPilot module for take names, shot/take numbers, and metadata only.

## Companion Module Integration

The `companion-module-aelive-deckpilot/` directory is a separate TypeScript project that creates a Bitfocus Companion module.

**Key Responsibilities:**
- Listen for OSC from DeckPilot on configurable port (default 8014)
- Expose per-recorder variables: `{recorder}_take`, `{recorder}_shot_num`, `{recorder}_take_num`
- Variables update when OSC messages received from DeckPilot
- Works alongside BMD HyperDeck module (BMD provides transport state, DeckPilot provides metadata)

**Installation:**
Module must be extracted to Companion's modules directory and Companion restarted. Use `build_sl_mod` script for automatic installation.

## Related Documentation

For detailed OSC command reference, see:
- `OSC_COMMANDS.md`: Complete OSC protocol documentation
- `OSC_CONFIGURATION.md`: Setup guide for Companion integration
- `STREAMDECK_SETUP.md`: Stream Deck button configuration examples
