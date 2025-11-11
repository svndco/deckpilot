import { SomeCompanionConfigField } from '@companion-module/base'

export interface ShotLoaderConfig {
  oscAddressPrefix: string
  oscReceiveHost: string
  oscReceivePort: number
  deckpilotHost: string
  deckpilotPort: number
}

export function getConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'static-text',
      id: 'oscInfo',
      width: 12,
      label: 'Receive OSC from DeckPilot',
      value: 'Configure where this module listens for OSC messages from DeckPilot.'
    },
    {
      type: 'textinput',
      id: 'oscReceiveHost',
      label: 'Receive IP Address',
      width: 6,
      default: '0.0.0.0',
      required: true,
      tooltip: 'IP to bind to (0.0.0.0 = all interfaces, 127.0.0.1 = localhost only)'
    },
    {
      type: 'number',
      id: 'oscReceivePort',
      label: 'Receive Port',
      width: 6,
      default: 8014,
      min: 1024,
      max: 65535,
      required: true,
      tooltip: 'Port to listen on for OSC from DeckPilot (must match DeckPilot\'s OSC output port)'
    },
    {
      type: 'textinput',
      id: 'oscAddressPrefix',
      label: 'OSC Address Prefix',
      width: 6,
      default: '/deckpilot/',
      required: true,
      tooltip: 'OSC address prefix (e.g., /deckpilot/). Full address will be {prefix}{recorder_name}'
    },
    {
      type: 'static-text',
      id: 'sendInfo',
      width: 12,
      label: 'Send Commands to DeckPilot',
      value: 'Configure where to send OSC commands to control DeckPilot.'
    },
    {
      type: 'textinput',
      id: 'deckpilotHost',
      label: 'DeckPilot Host',
      width: 6,
      default: '127.0.0.1',
      required: true,
      tooltip: 'IP address where DeckPilot is running'
    },
    {
      type: 'number',
      id: 'deckpilotPort',
      label: 'DeckPilot OSC Port',
      width: 6,
      default: 8012,
      min: 1024,
      max: 65535,
      required: true,
      tooltip: 'Port DeckPilot listens on for commands (default: 8012)'
    }
  ]
}
