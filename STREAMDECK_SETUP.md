# Stream Deck Integration with DeckPilot

> **Quick Links:** [OSC Configuration](OSC_CONFIGURATION.md) | [OSC Commands](OSC_COMMANDS.md) | [Main README](README.md)

This guide explains how to set up Stream Deck buttons to trigger DeckPilot actions and use the response data.

**First Time Setup?** Start with [OSC_CONFIGURATION.md](OSC_CONFIGURATION.md) to install the module and configure ports.

## Overview

DeckPilot now supports **bidirectional OSC communication**, enabling Stream Deck buttons to:
1. Trigger "Set Take" or "Set All" commands in DeckPilot
2. Receive metadata (take name, shot number, take number) back from DeckPilot
3. Use that metadata for HyperDeck recording with proper filenames

## DeckPilot Configuration

### 1. Configure OSC Listener (Incoming Commands)
In DeckPilot Settings:
- **Enable OSC Listener**: ✓ Checked (default)
- **Listener Port**: `8012` (default) - receives commands from Companion

### 2. Configure OSC Output (Outgoing Feedback)
In DeckPilot Settings:
- **OSC Host**: `127.0.0.1` (Companion IP)
- **OSC Port**: `8014` (default) - sends take metadata to DeckPilot Companion module

**Note**: All recorders share the same output port. Individual recorders are identified by their name in the OSC address path.

## Companion Module Setup

### 1. Install DeckPilot Companion Module

1. Build the module (see main README):
   ```bash
   cd companion-module-svndco-deckpilot
   npm install --legacy-peer-deps
   npm run build
   npx companion-module-build
   ./build_sl_mod  # Auto-installs to Companion
   ```

2. Restart Companion completely

3. Add a **DeckPilot** connection in Companion:
   - Module: **DeckPilot** (by svndco)
   - Connection name: "DeckPilot"
   - OSC Listener Port: `8014` (must match DeckPilot's OSC output port)

### 2. Available Variables

The DeckPilot module automatically creates variables for each recorder:

**Per-Recorder Variables** (e.g., for recorder named "HYPER-41"):
- `$(deckpilot:HYPER_41_take)` - Full take name (e.g., "SHOW_S01_T03")
- `$(deckpilot:HYPER_41_shot_num)` - Shot number (integer)
- `$(deckpilot:HYPER_41_take_num)` - Take number (integer)

**Note**: Recorder names are sanitized - hyphens and special characters become underscores.

## OSC Command Reference

> **Complete Reference:** See [OSC_COMMANDS.md](OSC_COMMANDS.md) for full command documentation and examples.

### Commands TO DeckPilot
**Address:** `127.0.0.1:8012` (DeckPilot listener port)

#### Set Take (Single Recorder)
```
/deckpilot/{recorderId}/setTake
```
Example: `/deckpilot/recorder123/setTake`

**Note:** Recorder names with hyphens must use underscores (e.g., `HYPER-41` → `HYPER_41`)

#### Set All Takes
```
/deckpilot/all/setAll
```

### Responses FROM DeckPilot
**Address:** Sent to `127.0.0.1:8014` (DeckPilot module's listener port)

**Format:** `/deckpilot/{RECORDER_NAME}`

**Arguments:**
- Arg 0 (string): Take name (e.g., "SHOW_S01_T03")
- Arg 1 (int): Shot number
- Arg 2 (int): Take number
- Arg 3 (string): Recorder name

## Stream Deck Button Examples

### Example 1: Single Recorder Record Button

**Button Type:** Multi-step button

**Step 1: Trigger DeckPilot Set Take**
- Action: Generic OSC - Send Message
- Target: `127.0.0.1:8012`
- OSC Path: `/deckpilot/recorder123/setTake`
- Arguments: (none)

**Step 2: Wait**
- Action: Delay
- Duration: `150ms` (adjust based on your network)

**Step 3: Start Recording**
- Action: HyperDeck - Record
- Filename: `$(deckpilot:HYPER_41_take)`
- (Use the variable from the DeckPilot module)

### Example 2: Record All HyperDecks

**Button Type:** Multi-step button

**Step 1: Trigger Set All**
- Action: Generic OSC - Send Message
- Target: `127.0.0.1:8012`
- OSC Path: `/deckpilot/all/setAll`

**Step 2: Wait**
- Action: Delay
- Duration: `200ms`

**Step 3: Start Recording HD41**
- Action: HyperDeck - Record
- Instance: HyperDeck-41
- Filename: `$(deckpilot:HYPER_41_take)`

**Step 4: Start Recording HD42**
- Action: HyperDeck - Record
- Instance: HyperDeck-42
- Filename: `$(deckpilot:HYPER_42_take)`

**Step 5: Start Recording HD43**
- Action: HyperDeck - Record
- Instance: HyperDeck-43
- Filename: `$(deckpilot:HYPER_43_take)`

### Example 3: Set Take Display Button

**Button Type:** Display button (shows take name)

**Feedback:**
- Text: `$(deckpilot:HYPER_41_take)`
- Updates automatically when DeckPilot sends new take

**Press Action:**
- Action: Generic OSC - Send Message
- Target: `127.0.0.1:8012`
- OSC Path: `/deckpilot/recorder123/setTake`

## Timing Considerations

### Network Latency
- **OSC Round-trip**: Typically 10-50ms on local network
- **Recommended delay**: 100-200ms between DeckPilot command and HyperDeck action

### Recording Preroll
To ensure you don't miss any content:
1. Configure **HyperDeck preroll** (2-5 seconds recommended)
2. This gives time for:
   - OSC command to DeckPilot
   - DeckPilot to process and respond
   - Companion to update variables
   - HyperDeck to receive record command

### Testing
1. Test with longer delays first (500ms)
2. Monitor Companion logs for OSC message arrival
3. Gradually reduce delay until you find the sweet spot
4. Add safety margin (e.g., if 100ms works, use 150ms)

## Troubleshooting

### DeckPilot Not Receiving Commands
- Check OSC Listener is enabled in DeckPilot settings
- Verify listener port matches what Stream Deck is sending to (default: 8012)
- Check firewall settings on local machine

### Variables Not Updating in Companion
- Verify DeckPilot module OSC port is set to `8014` (matches DeckPilot's output)
- Check Companion logs for incoming OSC messages
- Ensure DeckPilot module instance is connected (green status)
- Verify recorder names are sanitized correctly (hyphens → underscores)

### Recording Starts Before Take Name Updates
- Increase delay between steps (try 200-300ms)
- Add HyperDeck preroll to compensate
- Check network latency with ping tests

### Take Numbers Not Incrementing
- Ensure recorder format is set to "Take-based" in DeckPilot
- Check that shot/take numbers are configured
- Verify OSC command is using correct recorder ID

## DeckPilot Companion Module Features

The included DeckPilot Companion module (`companion-module-svndco-deckpilot`) provides:

1. **Automatic Variable Creation**: Variables are created automatically for each recorder as OSC messages arrive
2. **Real-time Updates**: Variables update immediately when takes are set in DeckPilot
3. **Multi-Recorder Support**: Handles unlimited recorders on a single OSC port (8014)
4. **Name Sanitization**: Automatically handles recorder name sanitization for variable names
5. **Integration with BMD Module**: Works alongside the Blackmagic HyperDeck module for transport control

### Best Practices
- Use the **DeckPilot module** for take names, shot/take numbers, and metadata
- Use the **Blackmagic HyperDeck module** for transport state and control (play/stop/record)
- Combine both modules for complete HyperDeck + take name workflows
