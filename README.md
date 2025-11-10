# DeckPilot

A professional shot/take name management application for Blackmagic HyperDeck recorders with OSC integration for Bitfocus Companion.

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)

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
- **Bitfocus Companion Support** - Send take names via OSC to Companion
- **Per-Recorder Addressing** - Unique OSC path for each recorder: `/ae/deckpilot/{recorder-name}`
- **Configurable Settings** - Adjustable IP, send port, and receive port
- **Enable/Disable** - Toggle OSC functionality as needed

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

#### Quick Start - Automated Build

**macOS / Linux:**
```bash
./scripts/build-all.sh
```

**Windows:**
```cmd
scripts\build-all.bat
```

That's it! Both scripts will:
1. Build the DeckPilot Electron application
2. Build the Companion module
3. Copy everything to the `./release/` folder

#### What Gets Built

After running the build script, you'll find in `./release/`:

**DeckPilot Application:**
- **macOS**: `DeckPilot-1.0.0-arm64.dmg` (installer), `DeckPilot-1.0.0-arm64-mac.zip` (portable)
- **Windows**: `DeckPilot-Setup-1.0.0.exe` (installer), `DeckPilot-1.0.0-win.zip` (portable)

**Companion Module:**
- `aelive-deckpilot-1.0.0.tgz` - Ready to install in Companion

#### Manual Build Steps

If you prefer to build components separately:

**DeckPilot App Only:**
```bash
npm install
npm run build
```

**Companion Module Only:**
```bash
cd companion-module-aelive-deckpilot
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
```bash
cd companion-module-aelive-deckpilot
./build_sl_mod
```

**Option 2: Manual**

*macOS:*
```bash
mkdir -p ~/Library/Application\ Support/companion/modules/aelive-deckpilot-1.0.0
tar -xzf release/aelive-deckpilot-1.0.0.tgz -C ~/Library/Application\ Support/companion/modules/aelive-deckpilot-1.0.0 --strip-components=1
```

*Windows:*
```cmd
mkdir %APPDATA%\companion\modules\aelive-deckpilot-1.0.0
tar -xzf release\aelive-deckpilot-1.0.0.tgz -C %APPDATA%\companion\modules\aelive-deckpilot-1.0.0 --strip-components=1
```

**Important:** Restart Companion completely after installing the module!

#### Clean Build

To remove all build artifacts:
```bash
./scripts/clean.sh  # Interactive cleanup
./scripts/build-all.sh  # Rebuild everything
```

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
1. Click the AE logo in the top-right corner
2. Configure settings:
   - **Enable OSC**: Toggle OSC functionality
   - **Send Host**: Companion IP address (default: 127.0.0.1)
   - **Send Port**: Companion OSC receive port (default: 8014)
   - **Receive Port**: This app's OSC port (default: 8015)
3. Click "Save"

### Companion Integration

#### OSC Message Format
- **Address**: `/ae/deckpilot/{recorder-name}`
- **Argument**: Take name (string)

**Important:** Recorder names are automatically sanitized for OSC addresses:
- Spaces and special characters are replaced with underscores
- Example: "Recorder 1" becomes `/ae/deckpilot/Recorder_1`
- Example: "HYPER-41" becomes `/ae/deckpilot/HYPER_41`

#### OSC Setup in Companion

1. **Configure Companion's OSC Listener:**
   - Go to Companion Settings → OSC tab
   - Set "OSC RX Port" to 8014 (or match your DeckPilot send port)

2. **Set up OSC Triggers for each recorder:**

**Example: For a recorder named "Recorder 1"**

1. Create a Trigger in Companion:
   - **Condition**: OSC message received at path `/ae/deckpilot/Recorder_1`
   - **Action**: Set custom variable `recorder1_take` to `$(osc:latest_received_args)`
2. Display the variable on a button: `$(internal:custom_recorder1_take)`

**For multiple recorders**, create a trigger for each:
- `/ae/deckpilot/Recorder_1` → variable `recorder1_take`
- `/ae/deckpilot/Recorder_2` → variable `recorder2_take`
- `/ae/deckpilot/HYPER_41` → variable `hyper41_take`

Each recorder sends to its own unique path, preventing conflicts.

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
    └── ae-logo.png    # Application logo
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

## Troubleshooting

### OSC Messages Not Sending
1. Check OSC is enabled in Settings (click AE logo)
2. Verify Companion IP and port match your setup
3. Ensure Companion's OSC listener is configured (Settings → OSC tab)
4. Check firewall settings aren't blocking UDP port
5. **Verify OSC address matches sanitized recorder name:**
   - Check the Electron app console logs for the actual OSC address being sent
   - Remember: spaces and special characters become underscores
   - Example: "My Recorder" sends to `/ae/deckpilot/My_Recorder`

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

- [ ] HyperDeck protocol integration for direct recorder control
- [ ] Timecode display and sync
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
