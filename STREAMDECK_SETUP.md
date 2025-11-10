# Stream Deck Integration with DeckPilot

This guide explains how to set up Stream Deck buttons to trigger DeckPilot actions and use the response data.

## Overview

DeckPilot now supports **bidirectional OSC communication**, enabling Stream Deck buttons to:
1. Trigger "Set Take" or "Set All" commands in DeckPilot
2. Receive metadata (take name, shot number, take number) back from DeckPilot
3. Use that metadata for HyperDeck recording with proper filenames

## DeckPilot Configuration

### 1. Configure OSC Listener
In DeckPilot Settings:
- **Enable OSC Listener**: ✓ Checked (default)
- **Listener Port**: `8012` (default)

### 2. Configure Per-Recorder OSC Output
For each recorder, ensure OSC settings are configured:
- **OSC Host**: `127.0.0.1` (Companion IP)
- **OSC Port**: Unique port per recorder (e.g., `8013`, `8015`, `8016`)

## Companion Module Setup

### 1. Create DeckPilot Module Instance(s)
Create one Companion module instance per recorder:

**Instance 1** (for HYPER-41):
- Module: Generic OSC
- Connection name: "DeckPilot-HD41"
- OSC Listener Port: `8013`
- OSC Address Pattern: `/deckpilot/response/HYPER_41` (or `/deckpilot/*` to accept all)

**Instance 2** (for HYPER-42):
- Module: Generic OSC
- Connection name: "DeckPilot-HD42"
- OSC Listener Port: `8015`
- OSC Address Pattern: `/deckpilot/response/HYPER_42`

### 2. Create Variables
Each DeckPilot module instance should expose these variables:
- `takeName` - Full take name (e.g., "SHOW_S01_T03")
- `shotNumber` - Shot number (integer)
- `takeNumber` - Take number (integer)
- `recorderName` - Recorder name

## OSC Command Reference

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
**Address:** Sent to each recorder's configured OSC port (e.g., `8013`, `8015`)

**Format:** `/deckpilot/response/{RECORDER_NAME}`

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
- Filename: `$(DeckPilot-HD41:takeName)`
- (Use the variable from your DeckPilot module instance)

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
- Filename: `$(DeckPilot-HD41:takeName)`

**Step 4: Start Recording HD42**
- Action: HyperDeck - Record
- Instance: HyperDeck-42
- Filename: `$(DeckPilot-HD42:takeName)`

**Step 5: Start Recording HD43**
- Action: HyperDeck - Record
- Instance: HyperDeck-43
- Filename: `$(DeckPilot-HD43:takeName)`

### Example 3: Set Take Display Button

**Button Type:** Display button (shows take name)

**Feedback:**
- Text: `$(DeckPilot-HD41:takeName)`
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
- Verify Companion module OSC port matches recorder's configured output port
- Check Companion logs for incoming OSC messages
- Ensure OSC address pattern matches (e.g., `/deckpilot/response/*`)

### Recording Starts Before Take Name Updates
- Increase delay between steps (try 200-300ms)
- Add HyperDeck preroll to compensate
- Check network latency with ping tests

### Take Numbers Not Incrementing
- Ensure recorder format is set to "Take-based" in DeckPilot
- Check that shot/take numbers are configured
- Verify OSC command is using correct recorder ID

## Advanced: Custom Companion Module

For more advanced integration, you can create a custom Companion module that:
1. Maintains a persistent connection to DeckPilot
2. Provides custom actions like "Set Take & Record"
3. Handles timing automatically
4. Provides status feedback

This is recommended if you need:
- Sub-100ms response times
- Complex multi-recorder workflows
- Automatic error handling and retries
