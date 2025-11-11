import { InstanceBase, runEntrypoint, InstanceStatus, CompanionVariableDefinition, CompanionActionDefinitions, CompanionFeedbackDefinitions, SomeCompanionConfigField } from '@companion-module/base'
import * as osc from 'osc'
import { getActions } from './actions'
import { getFeedbacks } from './feedbacks'
import { getVariableDefinitions, updateVariables } from './variables'
import { ShotLoaderConfig, getConfigFields } from './config'

interface RecorderData {
  id: string
  name: string
  takeName: string
  ipAddress: string
  shotNumber?: number
  takeNumber?: number
  transportState?: 'play' | 'stop' | 'record' | 'next' | 'prev'
}

class ShotLoaderInstance extends InstanceBase<ShotLoaderConfig> {
  private oscPort: any = null
  private recorders: Map<string, RecorderData> = new Map()
  private showName: string = ''
  public config: ShotLoaderConfig = {
    oscAddressPrefix: '/deckpilot/',
    oscReceiveHost: '0.0.0.0',
    oscReceivePort: 8014,
    deckpilotHost: '127.0.0.1',
    deckpilotPort: 8012
  }

  constructor(internal: unknown) {
    super(internal)
  }

  async init(config: ShotLoaderConfig): Promise<void> {
    this.config = config
    this.updateStatus(InstanceStatus.Connecting)

    // Initialize OSC listener
    this.initOSC()

    // Set up actions, feedbacks, and variables
    this.setActionDefinitions(getActions(this))
    this.setFeedbackDefinitions(getFeedbacks(this))
    this.setVariableDefinitions(getVariableDefinitions())
    updateVariables(this, this.recorders, this.showName, this.config)

    this.updateStatus(InstanceStatus.Ok, 'Listening for OSC messages')
  }

  async destroy(): Promise<void> {
    this.log('debug', 'Destroying instance')

    if (this.oscPort) {
      this.oscPort.close()
      this.oscPort = null
    }
  }
  async configUpdated(config: ShotLoaderConfig): Promise<void> {
    this.config = config

    // Restart OSC if port changed
    if (this.oscPort) {
      this.oscPort.close()
      this.oscPort = null
    }

    this.initOSC()

    // Update variables with new config (OSC addresses may have changed)
    updateVariables(this, this.recorders, this.showName, this.config)
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return getConfigFields()
  }

  private initOSC(): void {
    try {
      this.oscPort = new osc.UDPPort({
        localAddress: this.config.oscReceiveHost,
        localPort: this.config.oscReceivePort,
        metadata: true
      })

      this.oscPort.on('ready', () => {
        this.log('info', `OSC listener ready on port ${this.config.oscReceivePort}`)
        this.log('info', `Filtering OSC addresses with prefix: ${this.config.oscAddressPrefix}`)
      })

      this.oscPort.on('message', (oscMsg: any) => {
        this.handleOSCMessage(oscMsg)
      })

      this.oscPort.on('error', (error: any) => {
        this.log('error', `OSC port error: ${error}`)
      })

      this.oscPort.open()
    } catch (error) {
      this.log('error', `Failed to initialize OSC listener: ${error}`)
    }
  }

  private handleOSCMessage(oscMsg: any): void {
    const address = oscMsg.address as string

    // Only process messages matching our configured prefix
    if (!address.startsWith(this.config.oscAddressPrefix)) {
      return // Ignore messages not matching our prefix
    }

    // Extract recorder name and check if it's a transport message
    const remainder = address.substring(this.config.oscAddressPrefix.length)
    
    // Check if this is a transport message
    if (remainder.includes('/transport')) {
      // Transport message: /deckpilot/{recorder}/transport
      const recorderName = remainder.split('/transport')[0]
      const transportCommand = oscMsg.args && oscMsg.args[0] ? oscMsg.args[0].value : ''
      
      if (!transportCommand) {
        return
      }
      
      this.log('debug', `Transport OSC received: ${address} = ${transportCommand}`)
      
      // Find recorder by sanitized name
      let recorder = Array.from(this.recorders.values()).find(r => {
        const sanitizedName = r.name.replace(/[^a-zA-Z0-9]/g, '_')
        return sanitizedName === recorderName
      })
      
      if (recorder) {
        recorder.transportState = transportCommand as 'play' | 'stop' | 'record' | 'next' | 'prev'
      } else {
        // Create new recorder if we haven't seen it
        const newId = recorderName.toLowerCase()
        const displayName = recorderName.replace(/_/g, '-')
        recorder = {
          id: newId,
          name: displayName,
          takeName: '',
          ipAddress: 'Unknown',
          shotNumber: 1,
          takeNumber: 1,
          transportState: transportCommand as 'play' | 'stop' | 'record' | 'next' | 'prev'
        }
        this.recorders.set(newId, recorder)
        this.log('info', `New recorder discovered via transport OSC: ${displayName}`)
      }
      
      // Update variables and actions
      updateVariables(this, this.recorders, this.showName, this.config)
      this.setActionDefinitions(getActions(this))
      this.checkFeedbacks()
      return
    }
    
    // Regular take name message: /deckpilot/{recorder}
    const recorderName = remainder

    // Get the take name and metadata from arguments
    const takeName = oscMsg.args && oscMsg.args[0] ? oscMsg.args[0].value : ''
    const shotNumber = oscMsg.args && oscMsg.args[1] ? oscMsg.args[1].value : 1
    const takeNumber = oscMsg.args && oscMsg.args[2] ? oscMsg.args[2].value : 1
    const ipAddress = oscMsg.args && oscMsg.args[3] ? oscMsg.args[3].value : 'Unknown'

    if (!takeName) {
      return
    }

    this.log('debug', `OSC received: ${address} = ${takeName} (Shot: ${shotNumber}, Take: ${takeNumber})`)

    // Find or create recorder by name
    let recorder = Array.from(this.recorders.values()).find(r => {
      const sanitizedName = r.name.replace(/[^a-zA-Z0-9]/g, '_')
      return sanitizedName === recorderName
    })

    if (!recorder) {
      // Create a new recorder entry if we haven't seen this one before
      // Use the sanitized recorder name as the ID (lowercase, underscores)
      const newId = recorderName.toLowerCase()
      const displayName = recorderName.replace(/_/g, '-') // Convert underscores to hyphens for display
      recorder = {
        id: newId,
        name: displayName,
        takeName: takeName,
        ipAddress: ipAddress,
        shotNumber: shotNumber,
        takeNumber: takeNumber
      }
      this.recorders.set(newId, recorder)
      this.log('info', `New recorder discovered via OSC: ${displayName}`)
    } else {
      // Update existing recorder
      recorder.takeName = takeName
      recorder.shotNumber = shotNumber
      recorder.takeNumber = takeNumber
      if (ipAddress !== 'Unknown') {
        recorder.ipAddress = ipAddress
      }
    }

    // Update variables and actions
    updateVariables(this, this.recorders, this.showName, this.config)
    this.setActionDefinitions(getActions(this))
    this.checkFeedbacks()
  }


  private handleStateUpdate(data: any): void {
    this.recorders.clear()

    if (data.showName !== undefined) {
      this.showName = data.showName
    }

    if (data.recorders && Array.isArray(data.recorders)) {
      data.recorders.forEach((recorder: any) => {
        this.recorders.set(recorder.id, {
          id: recorder.id,
          name: recorder.name,
          takeName: data.currentTakes?.[recorder.id] || '',
          ipAddress: recorder.ipAddress,
          shotNumber: recorder.shotNumber,
          takeNumber: recorder.takeNumber
        })
      })
    }

    updateVariables(this, this.recorders, this.showName, this.config)
    this.checkFeedbacks()
  }

  private handleRecorderUpdate(recorder: any): void {
    const existing = this.recorders.get(recorder.id)
    this.recorders.set(recorder.id, {
      id: recorder.id,
      name: recorder.name,
      takeName: existing?.takeName || '',
      ipAddress: recorder.ipAddress,
      shotNumber: recorder.shotNumber,
      takeNumber: recorder.takeNumber
    })

    updateVariables(this, this.recorders, this.showName, this.config)
  }

  private handleRecorderRemoved(recorderId: string): void {
    this.recorders.delete(recorderId)
    updateVariables(this, this.recorders, this.showName, this.config)
  }

  private handleTakeUpdate(data: { recorderId: string; takeName: string }): void {
    const recorder = this.recorders.get(data.recorderId)
    if (recorder) {
      recorder.takeName = data.takeName
      updateVariables(this, this.recorders, this.showName, this.config)
      this.checkFeedbacks()
    }
  }


  public getRecorders(): Map<string, RecorderData> {
    return this.recorders
  }

  public getTakeName(recorderId: string): string {
    return this.recorders.get(recorderId)?.takeName || ''
  }
}

runEntrypoint(ShotLoaderInstance, [])

export = ShotLoaderInstance
