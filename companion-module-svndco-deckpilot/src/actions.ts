import { CompanionActionDefinitions, CompanionActionEvent, InstanceBase } from '@companion-module/base'
import { ShotLoaderConfig } from './config'
import * as osc from 'osc'

interface ShotLoaderInstance extends InstanceBase<ShotLoaderConfig> {
  getRecorders: () => Map<string, any>
  config: ShotLoaderConfig
}

export function getActions(instance: ShotLoaderInstance): CompanionActionDefinitions {
  const recorders = instance.getRecorders()
  const recorderChoices = Array.from(recorders.values()).map(recorder => ({
    id: recorder.id,
    label: recorder.name
  }))

  return {
    setTake: {
      name: 'Set Take Name',
      options: [
        {
          type: 'dropdown',
          label: 'Recorder',
          id: 'recorder',
          default: recorderChoices[0]?.id || '',
          choices: recorderChoices
        }
      ],
      callback: async (event: CompanionActionEvent) => {
        const recorderId = event.options.recorder as string
        const recorder = recorders.get(recorderId)
        
        if (!recorder) {
          instance.log('warn', `Recorder ${recorderId} not found`)
          return
        }
        
        // Sanitize recorder name for OSC path
        const sanitizedName = recorder.name.replace(/[^a-zA-Z0-9]/g, '_')
        const address = `/deckpilot/${sanitizedName}/setTake`
        
        sendOSC(instance, address, [])
      }
    },
    setAllTakes: {
      name: 'Set All Takes',
      options: [],
      callback: async (event: CompanionActionEvent) => {
        sendOSC(instance, '/deckpilot/all/setAll', [])
      }
    }
  }
}

function sendOSC(instance: ShotLoaderInstance, address: string, args: any[]): void {
  try {
    const udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: 0, // Random port for sending
      metadata: true
    })

    udpPort.open()

    udpPort.on('ready', () => {
      udpPort.send({
        address: address,
        args: args
      }, instance.config.deckpilotHost, instance.config.deckpilotPort)
      
      instance.log('debug', `Sent OSC: ${address} to ${instance.config.deckpilotHost}:${instance.config.deckpilotPort}`)
      
      // Close after sending
      setTimeout(() => udpPort.close(), 100)
    })

    udpPort.on('error', (error: any) => {
      instance.log('error', `OSC send error: ${error}`)
    })
  } catch (error) {
    instance.log('error', `Failed to send OSC: ${error}`)
  }
}
