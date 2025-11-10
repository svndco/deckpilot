# Deck Pilot - OSC Command Reference

## Overview

Deck Pilot uses OSC (Open Sound Control) for bidirectional communication with Bitfocus Companion. This allows you to trigger take name updates from Stream Deck buttons and receive feedback about current take names.

## Port Configuration

### Incoming Commands (Companion → Deck Pilot)
- **Default Port**: 8012
- **Configurable in**: Settings → OSC Listener Port
- **Purpose**: Receive commands to set take names

### Outgoing Feedback (Deck Pilot → Companion)
- **Default Port**: 8013 (configurable per recorder)
- **Configurable in**: Monitor view → Edit Recorder → OSC Client port
- **Purpose**: Send take name updates and status to Companion module
- **Format**: `/ae/deckpilot/{recorder_name}`

### Companion Module Feedback Port
- **Default Port**: 8014
- **Configurable in**: Settings → Feedback Port (Companion Module)
- **Purpose**: Send general status updates to Companion module
- **Format**: Various status messages

## Incoming OSC Commands

### Set Take for Specific Recorder

**Address**: `/deckpilot/{RECORDER_NAME}/setTake`

**Arguments**: None

**Example**:
```
/deckpilot/HYPER_41/setTake
```

**Behavior**:
- Generates take name based on the recorder's current template and settings
- Increments take number if in Take mode (Template 2)
- Sends take name to the HyperDeck
- Sends OSC feedback to Companion
- Shows red flash overlay in Monitor view

**Recorder Name Sanitization**:
- All non-alphanumeric characters (including hyphens) are replaced with underscores
- `HYPER-41` becomes `HYPER_41`
- `Camera 1` becomes `Camera_1`
- `Deck #3` becomes `Deck__3`
- **Important**: Always use underscores in OSC addresses, even if the recorder name displays with hyphens in the UI

### Set Take for All Recorders

**Address**: `/deckpilot/all/setAll`

**Arguments**: None

**Example**:
```
/deckpilot/all/setAll
```

**Behavior**:
- Sets takes for all enabled recorders
- Each recorder uses its own template and settings
- Increments take numbers for recorders in Take mode
- Shows red flash overlay on all recorder cards in Monitor view

## Outgoing OSC Messages (Feedback)

### Take Name Update (Per-Recorder)

**Address**: `/ae/deckpilot/{RECORDER_NAME}`

**Arguments**:
- `[0]` (string): Take name

**Sent To**: Each recorder's configured OSC port

**Example**:
```
Address: /ae/deckpilot/HYPER_41
Args: ["ShowName_20251110_S01_T03"]
```

### Take Response (with metadata)

**Address**: `/deckpilot/response/{RECORDER_NAME}`

**Arguments**:
- `[0]` (string): Take name
- `[1]` (int): Shot number
- `[2]` (int): Take number  
- `[3]` (string): Recorder name

**Sent To**: Each recorder's configured OSC port

**Example**:
```
Address: /deckpilot/response/HYPER_41
Args: ["ShowName_20251110_S01_T03", 1, 3, "HYPER-41"]
```

## Companion Module Setup

### 1. Configure Companion OSC Listener

In Companion Settings → OSC tab:
- Set **OSC RX Port**: 8014 (or your Deck Pilot Feedback Port)
- Enable **OSC Listener**: ✓

### 2. Create Triggers for Each Recorder

For each recorder, create a trigger:

**Trigger Condition**: OSC message received at `/ae/deckpilot/HYPER_41`

**Trigger Action**: Set custom variable `hyper41_take` to `$(osc:latest_received_args)`

**Example for multiple recorders**:
- `/ae/deckpilot/HYPER_41` → variable `hyper41_take`
- `/ae/deckpilot/HYPER_42` → variable `hyper42_take`
- `/ae/deckpilot/Camera_1` → variable `camera1_take`

### 3. Create Stream Deck Buttons

**Set Take Button** (single recorder):
- **Text**: `Set Take\n$(internal:custom_hyper41_take)`
- **Action**: Generic OSC → Send `/deckpilot/HYPER_41/setTake` to 127.0.0.1:8012

**Set All Takes Button**:
- **Text**: `SET ALL`
- **Action**: Generic OSC → Send `/deckpilot/all/setAll` to 127.0.0.1:8012

## Templates and Take Name Formatting

### Template 1: Show
**Format**: `{showName}_{date}`

**Example**: `MyShow_20251110`

**Use Case**: Simple broadcast recording with show name and date

### Template 2: Take
**Format**: `{showName}_{date}_S{shot}_T{take}_{customText}`

**Example**: `MyShow_20251110_S01_T03_WIDE`

**Use Case**: Multi-take production with shot and take tracking

**Auto-increment**: Take number increments automatically after each take

### Template 3: Custom
**Format**: `{customText}`

**Example**: `Interview_John_Smith`

**Use Case**: Freeform take names

## Recorder Configuration

Each recorder can be configured independently:

### Per-Recorder Settings
- **Template**: Show, Take, or Custom mode
- **Shot Number**: Manual or auto-increment
- **Take Number**: Auto-increments in Take mode
- **Custom Text**: Additional text for take names
- **OSC Host**: Companion IP (usually 127.0.0.1)
- **OSC Port**: Unique port for this recorder's feedback

### Global Settings
- **Show Name**: Applied to all recorders using Show or Take templates
- **Date Format**: 9 different formats (YYYYMMDD, YYYY-MM-DD, etc.)
- **OSC Listener**: Enable/disable incoming commands
- **Feedback Port**: Port for module-level feedback

## Example Workflows

### Multi-Camera Live Production

**Setup**:
- 3 HyperDecks: HYPER-41, HYPER-42, HYPER-43
- All in Take mode (Template 2)
- OSC ports: 8013, 8014, 8015

**Workflow**:
1. Press "Set All" button on Stream Deck
2. OSC command sent: `/deckpilot/all/setAll` → 127.0.0.1:8012
3. All recorders receive take: `ShowName_20251110_S01_T01`
4. Take numbers increment: T01 → T02
5. Companion displays updated take names on buttons
6. Press "Next Shot" to increment shot number (S01 → S02)
7. Take numbers reset to T01

### Interview Recording

**Setup**:
- 2 HyperDecks: Camera_1 (Wide), Camera_2 (Close)
- Both in Show mode (Template 1)

**Workflow**:
1. Set show name: "Interview_Series"
2. Press individual "Set Take" buttons for each camera
3. Both cameras get: `Interview_Series_20251110`
4. No auto-increment, same take name for entire interview

## Troubleshooting

### Commands not working
- Check OSC Listener is enabled in Settings
- Verify Listener Port is 8012 (or your configured port)
- Check Companion is sending to correct IP:port (127.0.0.1:8012)
- Look at Deck Pilot logs for "Received OSC:" messages

### Feedback not showing in Companion
- Verify Companion OSC RX Port matches Deck Pilot Feedback Port
- Check triggers are created for correct OSC paths
- Ensure recorder names are sanitized (hyphens → underscores)
- Test with Companion's OSC viewer to see incoming messages

### Wrong recorder responding
- Check recorder name sanitization: all hyphens and special characters become underscores
- Verify OSC path uses underscores: `/deckpilot/HYPER_41/setTake` (not `HYPER-41`)
- Each recorder must have unique name

### Monitor view not showing flash
- Flash only appears when OSC command is received
- Duration: 1 second
- Check "osc-triggered" events in console logs

## Technical Details

### HyperDeck Communication
- **Protocol**: Telnet
- **Port**: 9993
- **Polling Interval**: 5 seconds
- **Status Checks**: Online/offline, timecode, transport status, codec

### OSC Message Format
- **Protocol**: UDP
- **Library**: node-osc
- **Address Pattern**: `/path/to/command`
- **Arguments**: Typed (string, int, float)

### Status Monitoring
Deck Pilot continuously monitors:
- Recorder online/offline status
- Current timecode
- Transport status (record/play/preview/stopped)
- Recording codec
- Disk space (upcoming feature)

Updates are sent to the UI every 5 seconds.
