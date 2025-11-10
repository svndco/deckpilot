# companion-module-aelive-deckpilot

Companion module for DeckPilot - HyperDeck recorder take name management

## Configuration

- **WebSocket Port**: Port for Electron app connection (default: 8765)
- **Auto Reconnect**: Automatically reconnect if connection is lost

## Features

- Set take names for HyperDeck recorders
- Increment take numbers automatically
- Apply templates with variables
- Real-time sync with Electron app

## Variables

- `show_name` - Current show name
- `recorder_count` - Number of connected recorders
- `all_takes` - All current take names
- `recorder_{id}_take` - Take name for specific recorder
- `recorder_{id}_ip` - IP address for specific recorder
