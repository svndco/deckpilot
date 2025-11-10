# DeckPilot

Control HyperDeck recorder take names from Companion.

## Configuration

**WebSocket Port** (default: 8765)
The port to connect to the DeckPilot Electron app.

**Auto Reconnect** (default: enabled)
Automatically reconnect if connection is lost.

## Actions

- **Set Take Name** - Set the take name for a specific recorder
- **Increment Take Number** - Auto-increment the last number in the take name
- **Apply Template** - Apply a template with variables (e.g., "Scene {scene} - Take {take}")

## Variables

- `$(aelive-deckpilot:show_name)` - Current show name
- `$(aelive-deckpilot:recorder_count)` - Number of connected recorders
- `$(aelive-deckpilot:all_takes)` - All current take names
- `$(aelive-deckpilot:recorder_{id}_take)` - Take name for specific recorder
- `$(aelive-deckpilot:recorder_{id}_ip)` - IP address for specific recorder

## Feedbacks

- **Take Name is Set** - Indicator when take name is configured for a recorder
- **Take Name Matches** - Check if take name matches expected value

## Setup

1. Launch the DeckPilot Electron app
2. Add recorders to the app
3. The module will automatically connect via WebSocket
4. Use actions to control take names from Companion buttons
