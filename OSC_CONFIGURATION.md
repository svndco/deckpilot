# OSC Configuration Guide

## Overview
DeckPilot now supports **bidirectional OSC communication**:
- **Outgoing**: Each recorder sends OSC messages to its own dedicated Companion module instance
- **Incoming**: DeckPilot listens for OSC commands from Companion to trigger actions like "Set Take" or "Set All"

## Changes Made

### 1. Per-Recorder OSC Settings
Each recorder now has its own OSC host and port settings:
- **OSC Host**: IP address of Companion (default: `127.0.0.1`)
- **OSC Port**: Port number for that recorder's Companion module instance (default: `8013`, `8014`, `8015`, etc.)

### 2. WebSocket Removed
- All WebSocket communication has been removed
- Communication is now **OSC-only** (simpler and more reliable)
- No more port conflicts or connection issues

### 3. Configuration

#### Adding a New Recorder
When adding a recorder, you'll see these fields:
- **Recorder name**: Display name (e.g., "HYPER-41")
- **IP Address (HyperDeck)**: The HyperDeck's IP address
- **OSC Host (Companion)**: Companion's IP (usually `127.0.0.1`)
- **OSC Port**: Unique port for this recorder (e.g., `8013`, `8015`, `8016`)

#### Setting Up Multiple Recorders

**Example Setup:**
1. Recorder 1 (HYPER-41):
   - HyperDeck IP: `10.10.10.41`
   - OSC Host: `127.0.0.1`
   - OSC Port: `8013`

2. Recorder 2 (HYPER-42):
   - HyperDeck IP: `10.10.10.42`
   - OSC Host: `127.0.0.1`
   - OSC Port: `8015`

3. Recorder 3 (HYPER-43):
   - HyperDeck IP: `10.10.10.43`
   - OSC Host: `127.0.0.1`
   - OSC Port: `8016`

### 4. Companion Module Configuration

Each Companion module instance needs its own unique port:

1. **Instance 1** (for HYPER-41):
   - Connection name: "DP-HD41"
   - OSC Listener Port: `8013`
   - OSC Address Pattern: `/ae/deckpilot/HYPER_41` (or `/ae/deckpilot/*` to accept all)

2. **Instance 2** (for HYPER-42):
   - Connection name: "DP-HD42"
   - OSC Listener Port: `8015`
   - OSC Address Pattern: `/ae/deckpilot/HYPER_42` (or `/ae/deckpilot/*` to accept all)

3. **Instance 3** (for HYPER-43):
   - Connection name: "DP-HD43"
   - OSC Listener Port: `8016`
   - OSC Address Pattern: `/ae/deckpilot/HYPER_43` (or `/ae/deckpilot/*` to accept all)

## How It Works

1. When you set a take name in DeckPilot for a recorder
2. DeckPilot sends an OSC message to that recorder's configured host:port
3. The OSC message format: `/ae/deckpilot/{RECORDER_NAME}` with argument `takeName`
4. The corresponding Companion module receives it and updates its variables
5. Companion can then display the take name on buttons, use it in triggers, etc.

## Migration

Existing configurations will be automatically migrated:
- Recorders without OSC settings will get defaults (`127.0.0.1:8013`, `8014`, `8015`, etc.)
- Old global `sendPort` settings will be converted to the new format
- No manual intervention required

Note: DeckPilot was formerly known as AE Shot Loader.

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
2. Increment the take number
3. Send an OSC response to the recorder's configured Companion port

**Response Format:** `/deckpilot/response/{RECORDER_NAME}`
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

## Troubleshooting

**Error: "EADDRINUSE"**
- This means two Companion modules are trying to use the same port
- Make sure each module instance has a **unique** OSC port
- Check both the DeckPilot recorder settings AND the Companion module config

**OSC not received in Companion**
- Verify the port numbers match between DeckPilot and Companion
- Check that the Companion module shows "Ok" status (green)
- Look at the Companion log for incoming OSC messages
