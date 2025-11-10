# SVND.co DeckPilot

Receive take names, shot numbers, and metadata from DeckPilot for Blackmagic HyperDeck recorders.

## Configuration

**OSC Receive Port** (default: 8014)
The port to listen for OSC messages from DeckPilot.

**OSC Address Prefix** (default: /deckpilot/)
The OSC address prefix to filter messages. Only messages starting with this prefix will be processed.

## Actions

This module is **receive-only**. Use DeckPilot to set take names, which will automatically update variables in this module.

To control DeckPilot from Companion, use OSC Send commands to:
- `/deckpilot/{recorder_name}/setTake` - Trigger take name generation for a specific recorder
- `/deckpilot/all/setAll` - Trigger take name generation for all recorders

## Variables

Variables are created automatically for each recorder that sends data:

- `$(deckpilot:{recorder}_take)` - Current take name for the recorder
- `$(deckpilot:{recorder}_shot_num)` - Current shot number
- `$(deckpilot:{recorder}_take_num)` - Current take number
- `$(deckpilot:{recorder}_ip)` - Recorder IP address

Example: For a recorder named "HYPER-41", variables will be:
- `$(deckpilot:hyper_41_take)`
- `$(deckpilot:hyper_41_shot_num)`
- `$(deckpilot:hyper_41_take_num)`
- `$(deckpilot:hyper_41_ip)`

Note: Hyphens and special characters in recorder names are converted to underscores in variable names.

## Setup

1. Install and launch DeckPilot
2. Add your HyperDeck recorders in DeckPilot
3. Configure OSC settings in DeckPilot to send to Companion (default port 8014)
4. Add this module instance in Companion
5. Variables will appear automatically when recorders send data (within 10 seconds)
6. Use the variables in your Companion buttons to display take information

## Integration with Blackmagic HyperDeck Module

This module works alongside the official Blackmagic HyperDeck Companion module:
- Use the **Blackmagic HyperDeck module** for transport control (play/stop/record) and accurate hardware state
- Use the **DeckPilot module** for take names, shot numbers, and metadata display

Both modules can control the same HyperDecks simultaneously.
