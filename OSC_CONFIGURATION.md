# OSC Configuration Guide

> **Quick Links:** [OSC Commands Reference](OSC_COMMANDS.md) | [Stream Deck Setup](STREAMDECK_SETUP.md) | [Main README](README.md)

## Overview
DeckPilot supports **bidirectional OSC communication** with Bitfocus Companion:
- **Outgoing**: DeckPilot sends take metadata to the DeckPilot Companion module (all recorders → port 8014)
- **Incoming**: DeckPilot listens for OSC commands from Companion to trigger actions like "Set Take" or "Set All" (port 8012)

## Architecture

### Unified OSC Ports
DeckPilot uses two unified OSC ports for all recorders:
- **Port 8012**: Incoming commands (Companion → DeckPilot)
- **Port 8014**: Outgoing feedback (DeckPilot → Companion Module)

All recorders share these ports. Individual recorders are identified by their name in the OSC address path.

### Communication Protocol
- **OSC-only** communication (no WebSocket)
- UDP-based for reliability and simplicity
- Automatic recorder name sanitization (hyphens → underscores in OSC paths)
- Works alongside Blackmagic HyperDeck Companion module

## Configuration

### DeckPilot Settings

#### Global OSC Settings
In DeckPilot Settings:

**Incoming (Listener)**:
- **OSC Listener Enabled**: ✓ Checked (default)
- **Listener Port**: `8012` (receives commands from Companion)

**Outgoing (Feedback)**:
- **OSC Host**: `127.0.0.1` (Companion IP)
- **OSC Port**: `8014` (sends to DeckPilot Companion module)

#### Adding Recorders
When adding a recorder:
- **Recorder Name**: Display name (e.g., "HYPER-41")
- **IP Address**: The HyperDeck's IP address (e.g., `10.10.10.41`)
- **Format/Template**: Show, Take, or Custom

**No per-recorder OSC configuration needed** - all recorders share the global OSC settings.

> **Next Steps:** See [OSC_COMMANDS.md](OSC_COMMANDS.md) for command reference or [STREAMDECK_SETUP.md](STREAMDECK_SETUP.md) for button examples.

### Companion Module Setup

#### 1. Install the DeckPilot Module

```bash
cd companion-module-aelive-deckpilot
npm install --legacy-peer-deps
npm run build
npx companion-module-build
./build_sl_mod  # Auto-installs to Companion
```

Restart Companion after installation.

#### 2. Add DeckPilot Connection

1. In Companion, add new connection: **DeckPilot** (by aelive)
2. Configure:
   - **Connection Name**: "DeckPilot"
   - **OSC Listener Port**: `8014`
3. Connection should show green status

**That's it!** One module instance handles all recorders. Variables are created automatically for each recorder as OSC messages arrive.

## How It Works

1. When you set a take in DeckPilot (via UI or OSC command)
2. DeckPilot sends OSC message to `127.0.0.1:8014`
3. Message format: `/deckpilot/{RECORDER_NAME}` with 4 arguments:
   - Take name (string)
   - Shot number (int)
   - Take number (int)
   - Recorder name (string)
4. DeckPilot Companion module receives it and creates/updates variables:
   - `{RECORDER_NAME}_take`
   - `{RECORDER_NAME}_shot_num`
   - `{RECORDER_NAME}_take_num`
5. Variables are immediately available in Companion buttons and triggers

## Variables

The DeckPilot Companion module creates variables automatically:

**For recorder "HYPER-41"**:
- `$(deckpilot:HYPER_41_take)` - Full take name
- `$(deckpilot:HYPER_41_shot_num)` - Shot number  
- `$(deckpilot:HYPER_41_take_num)` - Take number

**For recorder "Camera 1"** (sanitized to "Camera_1"):
- `$(deckpilot:Camera_1_take)`
- `$(deckpilot:Camera_1_shot_num)`
- `$(deckpilot:Camera_1_take_num)`

Variables appear as soon as the first OSC message is received for that recorder.

## OSC Listener (Incoming Commands)

### Configuration
DeckPilot can receive OSC commands from Companion (e.g., Stream Deck buttons).

**Settings:**
- **OSC Listener Enabled**: Enable/disable incoming OSC commands (default: enabled)
- **OSC Listener Port**: Port for DeckPilot to listen on (default: `8012`)

### Supported Commands

#### 1. Set Take (Single Recorder)
Triggers a take for a specific recorder and sends back metadata.

**OSC Address:** `/deckpilot/{recorderId}/setTake`

**Example:** `/deckpilot/recorder123/setTake`

**Note:** Recorder names with hyphens must use underscores (e.g., `HYPER-41` → `HYPER_41`)

**Response:** DeckPilot will:
1. Generate a take name based on the recorder's format
2. Increment the take number (if in Take mode)
3. Send OSC message to `127.0.0.1:8014`

**Response Format:** `/deckpilot/{RECORDER_NAME}`
- Arg 0 (string): Take name (e.g., "SHOW_S01_T03")
- Arg 1 (int): Shot number
- Arg 2 (int): Take number
- Arg 3 (string): Recorder name

#### 2. Set All Takes
Triggers takes for all enabled recorders simultaneously.

**OSC Address:** `/deckpilot/all/setAll`

**Response:** Same as above, but sent to each recorder's Companion instance

### Use Case: Stream Deck Multi-Step Button

**Goal:** Set take in DeckPilot, then start HyperDeck recording with the take name

**Setup:**
1. **Step 1**: Send OSC to DeckPilot
   - Target: `127.0.0.1:8012`
   - Address: `/deckpilot/recorder123/setTake`
   
2. **Step 2**: Wait (100-200ms delay to allow OSC response)

3. **Step 3**: Start HyperDeck recording
   - Use Companion variable from DeckPilot's response
   - Variable example: `$(deckpilot:takeName)`

**Note:** Add 2-5 seconds of preroll in HyperDeck settings to compensate for timing delays.

> **More Examples:** See [STREAMDECK_SETUP.md](STREAMDECK_SETUP.md) for complete Stream Deck button configurations.

## Troubleshooting

**DeckPilot not sending OSC**
- Check OSC is enabled in DeckPilot Settings
- Verify OSC Host is `127.0.0.1` and Port is `8014`
- Look for "Sending OSC:" messages in DeckPilot logs

**Variables not appearing in Companion**
- Verify DeckPilot Companion module is installed and enabled
- Check module OSC Listener Port is set to `8014`
- Ensure module connection shows green status
- Trigger a take in DeckPilot to send initial OSC message
- Check Companion logs for messages at `/deckpilot/{recorder_name}`

**Wrong variable names**
- Recorder names are automatically sanitized for variables
- Hyphens, spaces, and special characters become underscores
- "HYPER-41" → `HYPER_41_take`
- "Camera 1" → `Camera_1_take`
