# DeckPilot

A professional shot/take name management application for Blackmagic HyperDeck recorders with OSC integration for Bitfocus Companion.

![Version](https://img.shields.io/badge/version-0.0.24-blue.svg)

## Features

### Core Functionality
- **Multi-Recorder Management** - Add and manage multiple HyperDeck recorders simultaneously
- **Flexible Take Naming** - Three template modes:
  - **Show Template**: Simple show name format
  - **Take Template**: Structured format with shot and take numbers (e.g., `ShowName_S01_T01`)
  - **Custom Template**: Freeform text input
- **Shot/Take Counters** - Independent shot and take numbering per recorder with auto-increment
- **Date Format Options** - 9 different date format options for take names
- **Take History** - Automatic history tracking with dropdown access to previous takes
- **Real-time Status** - Live connection status monitoring for all recorders

### OSC Integration
- **Bitfocus Companion Support** - Bidirectional OSC communication with custom DeckPilot module
- **Unified Port Architecture** - All recorders share ports 8012 (incoming) and 8014 (outgoing)
- **Per-Recorder Variables** - Automatic variable creation for each recorder's take data
- **Stream Deck Ready** - Full integration with Stream Deck buttons and triggers
- **Configurable Settings** - Adjustable OSC host, ports, and listener options

### User Interface
- **Clean Dark Theme** - Professional, easy-to-read interface
- **Floating Window** - Always-on-top option for quick access
- **Settings Access** - Click the AE logo to access OSC configuration
- **Persistent State** - All settings and history saved automatically

## Installation

### Download Pre-built
1. Download the latest release from the releases page
2. Install the DMG (macOS) or installer for your platform
3. Launch DeckPilot

### Build from Source

#### Quick Start - Interactive Build Menu

**macOS / Linux:**
```bash
./build.sh
```

**Windows:**
```cmd
build.bat
```

The interactive menu offers:
1. Build Electron App
2. Build Companion Module
3. Build Both
4. Install Companion Module
5. Build Companion + Install
6. Build All + Install Companion

**Note:** Version numbers auto-increment on each build (0.0.12 → 0.0.13, etc.)

#### What Gets Built

After running the build script, you'll find in `./release/`:

**DeckPilot Application:**
- **macOS**: `DeckPilot-0.0.2-arm64.dmg` (installer), `DeckPilot-0.0.2-arm64-mac.zip` (portable)
- **Windows**: `DeckPilot-Setup-0.0.2.exe` (installer), `DeckPilot-0.0.2-win.zip` (portable)

**Companion Module:**
- `companion-module-svndco-deckpilot-0.0.2.tgz` - Ready to install in Companion

#### Manual Build Steps

If you prefer to build components separately:

**DeckPilot App Only:**
```bash
npm install
npm run build
```

**Companion Module Only:**
```bash
cd companion-module-svndco-deckpilot
npm install --legacy-peer-deps
npm run build
npx companion-module-build
```

**Development Mode:**
```bash
npm run electron:dev  # Hot reload development
```

#### Build Requirements

**All Platforms:**
- Node.js 18+ or 22+
- npm

**macOS:**
- Xcode Command Line Tools

**Windows:**
- Visual Studio Build Tools
- Windows SDK

#### Installing the Companion Module

**Option 1: Automatic (Recommended)**
Use the build menu:
```bash
./build.sh  # Select option 5: Build Companion + Install
```

This automatically installs the module to the correct Companion directory.

**Option 2: Manual**

*macOS:*
```bash
mkdir -p ~/Library/Application\ Support/companion/modules/svndco-deckpilot
tar -xzf companion-module-svndco-deckpilot/svndco-deckpilot-*.tgz -C ~/Library/Application\ Support/companion/modules/svndco-deckpilot --strip-components=1
```

*Windows:*
```cmd
mkdir %APPDATA%\companion\modules\svndco-deckpilot
tar -xzf companion-module-svndco-deckpilot\svndco-deckpilot-*.tgz -C %APPDATA%\companion\modules\svndco-deckpilot --strip-components=1
```

**Important:** 
- Restart Companion completely after installing the module
- To update: If you already have a DeckPilot connection, open its settings and select the new version from the dropdown

#### Version Management

Versions auto-increment with each build. The build script updates:
- Main app `package.json`
- Companion module `package.json` and `manifest.json`
- README.md version badge

All builds output to `./release/` directory.

## Usage

### Adding Recorders
1. Click "+ Add Recorder" button
2. Enter recorder name (e.g., "HYPER-41")
3. Enter IP address (e.g., "192.168.1.100")
4. Select format template (Show, Take, or Custom)
5. Click "Add"

### Setting Take Names
1. Select a recorder from the list
2. Choose template (Show/Take/Custom)
3. For Take template:
   - Set shot number (increments automatically or manually)
   - Set take number (increments with each take)
4. Enter or select take name
5. Take name is automatically sent to the recorder and via OSC

### OSC Configuration
1. Click the Settings button in the top-right corner
2. Configure settings:
   - **Enable OSC**: Toggle OSC functionality
   - **OSC Host**: Companion IP address (default: 127.0.0.1)
   - **OSC Port**: Companion module port (default: 8014)
   - **OSC Listener Port**: Incoming command port (default: 8012)
3. Click "Save"

### Companion Integration

**DeckPilot includes a custom Companion module** that automatically handles OSC communication and creates variables for each recorder.

#### Quick Setup

1. **Install the DeckPilot Companion Module** (see installation instructions above)
2. **Add DeckPilot connection** in Companion:
   - Module: **DeckPilot** (by svndco)
   - OSC Listener Port: `8014`
3. **Use variables** in your Stream Deck buttons:
   - `$(deckpilot:HYPER_41_take)` - Full take name
   - `$(deckpilot:HYPER_41_shot_num)` - Shot number
   - `$(deckpilot:HYPER_41_take_num)` - Take number

#### OSC Ports
- **Port 8012**: Incoming commands (Companion → DeckPilot)
- **Port 8014**: Outgoing feedback (DeckPilot → Companion module)
- All recorders share the same ports; individual recorders are identified by name in OSC paths

**For detailed setup instructions, see:**
- **[OSC_CONFIGURATION.md](OSC_CONFIGURATION.md)** - Start here! Network setup and module installation
- **[OSC_COMMANDS.md](OSC_COMMANDS.md)** - Complete OSC protocol reference and command formats
- **[STREAMDECK_SETUP.md](STREAMDECK_SETUP.md)** - Stream Deck button examples and workflows

## Configuration Files

Configuration is stored in:
- **macOS**: `~/Library/Application Support/deckpilot/config.json`
- **Windows**: `%APPDATA%/deckpilot/config.json`
- **Linux**: `~/.config/deckpilot/config.json`

## Project Structure

```
deckpilot/
├── electron/           # Electron main process
│   ├── main.ts        # Main process, OSC handling, IPC
│   ├── preload.ts     # Preload script for IPC bridge
│   └── build.js       # Build script
├── src/               # React application
│   ├── components/    # React components
│   │   ├── RecorderList.tsx
│   │   ├── TakeInput.tsx
│   │   └── Settings.tsx
│   ├── App.tsx        # Main App component
│   ├── App.css        # Styles
│   └── main.tsx       # React entry point
├── shared/            # Shared TypeScript types
│   └── types.ts       # Type definitions
└── public/            # Static assets
```

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run electron:dev` - Run Electron app in development mode
- `npm run build` - Build production app (DMG/installer)
- `npm run build:electron` - Build Electron main process only

### Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **OSC** - Open Sound Control for Companion integration

## Documentation

For detailed information, see:

- **[OSC_COMMANDS.md](OSC_COMMANDS.md)** - Complete OSC protocol reference, command formats, and examples
- **[STREAMDECK_SETUP.md](STREAMDECK_SETUP.md)** - Stream Deck button configuration and workflows
- **[OSC_CONFIGURATION.md](OSC_CONFIGURATION.md)** - Network configuration and setup guide
- **[WARP.md](WARP.md)** - Development guide for AI assistants (architecture, patterns, build commands)

## Troubleshooting

### OSC Messages Not Sending
1. Check OSC is enabled in Settings
2. Verify DeckPilot Companion module is installed and connection shows green
3. Check OSC port is set to 8014 in both DeckPilot settings and Companion module config
4. Check firewall settings aren't blocking UDP ports 8012 and 8014
5. Review Companion logs for incoming OSC messages

### Recorders Not Connecting
1. Verify IP addresses are correct
2. Ensure recorders are on the same network
3. Check recorder status indicators (green = online)
4. HyperDeck control port 9993 must be accessible

### Settings Not Saving
1. Restart the application
2. Check file permissions in application support directory
3. Review console logs for errors (View > Toggle Developer Tools)

## Roadmap

- [x] HyperDeck protocol integration for direct recorder control
- [x] Timecode display and sync
- [ ] Multi-camera take synchronization
- [ ] Export take logs to CSV/Excel
- [ ] Custom keyboard shortcuts
- [ ] Predefined take lists

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
