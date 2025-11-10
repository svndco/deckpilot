import { SomeCompanionConfigField } from '@companion-module/base'

export interface ShotLoaderConfig {
  oscAddressPrefix: string
  oscReceivePort: number
}

export function getConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'static-text',
      id: 'oscInfo',
      width: 12,
      label: 'OSC Configuration',
      value: 'This module receives OSC messages from the DeckPilot application.'
    },
    {
      type: 'number',
      id: 'oscReceivePort',
      label: 'OSC Receive Port',
      width: 6,
      default: 8014,
      min: 1024,
      max: 65535,
      required: true,
      tooltip: 'Port this module listens on for OSC messages from Electron app'
    },
    {
      type: 'textinput',
      id: 'oscAddressPrefix',
      label: 'OSC Address Prefix',
      width: 6,
      default: '/deckpilot/',
      required: true,
      tooltip: 'OSC address prefix (e.g., /deckpilot/). Full address will be {prefix}{recorder_name}'
    }
  ]
}
