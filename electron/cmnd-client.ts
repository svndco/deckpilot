import WebSocket from 'ws'
import { randomUUID } from 'crypto'
import { hostname, platform } from 'os'
import { CmndSettings, Recorder } from '../shared/types'

interface CmndMessage {
  type: string
  [key: string]: any
}

export class CmndClient {
  private ws: WebSocket | null = null
  private settings: CmndSettings
  private authenticated: boolean = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private metricsInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private getRecordersCallback: (() => Recorder[]) | null = null
  private commandHandler: ((command: string, params: any) => Promise<any>) | null = null

  constructor(settings: CmndSettings) {
    this.settings = {
      ...settings,
      nodeId: settings.nodeId || randomUUID(),
      hubUrl: settings.hubUrl || 'ws://localhost:5000/ws'
    }
  }

  /**
   * Set callback to get current recorders for metrics
   */
  setGetRecordersCallback(callback: () => Recorder[]) {
    this.getRecordersCallback = callback
  }

  /**
   * Set callback to handle commands from cmndHub
   */
  setCommandHandler(handler: (command: string, params: any) => Promise<any>) {
    this.commandHandler = handler
  }

  /**
   * Connect to cmndHub
   */
  connect() {
    if (!this.settings.enabled || !this.settings.hubUrl) {
      console.log('⚠️  cmnd integration disabled')
      return
    }

    try {
      console.log(`🔌 Connecting to cmndHub: ${this.settings.hubUrl}`)
      this.ws = new WebSocket(this.settings.hubUrl)

      this.ws.on('open', () => {
        console.log('✅ Connected to cmndHub')
        this.authenticate()
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg: CmndMessage = JSON.parse(data.toString())
          this.handleMessage(msg)
        } catch (error) {
          console.error('❌ Error processing cmnd message:', error)
        }
      })

      this.ws.on('error', (error) => {
        console.error('❌ cmndHub WebSocket error:', error)
      })

      this.ws.on('close', () => {
        console.log('📴 Disconnected from cmndHub')
        this.authenticated = false
        this.stopHeartbeat()
        this.stopMetrics()

        // Attempt reconnection
        if (this.settings.enabled) {
          console.log('🔄 Reconnecting to cmndHub in 5 seconds...')
          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, 5000)
        }
      })
    } catch (error) {
      console.error('❌ Failed to connect to cmndHub:', error)
    }
  }

  /**
   * Disconnect from cmndHub
   */
  disconnect() {
    console.log('📴 Disconnecting from cmndHub...')
    this.stopHeartbeat()
    this.stopMetrics()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.authenticated = false
  }

  /**
   * Send authentication message
   */
  private authenticate() {
    const authMsg: CmndMessage = {
      type: 'auth',
      node_id: this.settings.nodeId,
      hostname: hostname(),
      platform: platform(),
      version: '0.0.24', // DeckPilot version
      metadata: {
        type: 'deckpilot',
        ...this.settings.metadata
      }
    }

    if (this.settings.showId) {
      authMsg.show_id = this.settings.showId
    }

    this.send(authMsg)
    console.log('🔐 Authentication sent to cmndHub')
  }

  /**
   * Handle messages from cmndHub
   */
  private handleMessage(msg: CmndMessage) {
    switch (msg.type) {
      case 'auth_ok':
        this.onAuthOk(msg)
        break

      case 'command':
        this.onCommand(msg)
        break

      default:
        console.log(`⚠️  Unknown cmnd message type: ${msg.type}`)
    }
  }

  /**
   * Handle successful authentication
   */
  private onAuthOk(msg: CmndMessage) {
    this.authenticated = true
    console.log(`✅ Authenticated with cmndHub: ${msg.message}`)
    this.startHeartbeat()
    this.startMetrics()
  }

  /**
   * Handle command from cmndHub
   */
  private async onCommand(msg: CmndMessage) {
    console.log(`📥 Received command from cmndHub: ${msg.command}`)

    try {
      let result: any = null

      if (this.commandHandler) {
        result = await this.commandHandler(msg.command, msg.params || {})
      } else {
        throw new Error('No command handler registered')
      }

      // Send result back to hub
      this.send({
        type: 'command_result',
        command_id: msg.command_id,
        node_id: this.settings.nodeId,
        success: true,
        result
      })
    } catch (error: any) {
      console.error(`❌ Command execution failed:`, error)

      this.send({
        type: 'command_result',
        command_id: msg.command_id,
        node_id: this.settings.nodeId,
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Start sending heartbeat messages
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return

    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: 'heartbeat',
        node_id: this.settings.nodeId,
        timestamp: new Date().toISOString()
      })
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Start sending metrics
   */
  private startMetrics() {
    if (this.metricsInterval) return

    // Send metrics immediately
    this.sendMetrics()

    // Then every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.sendMetrics()
    }, 30000)
  }

  /**
   * Stop metrics
   */
  private stopMetrics() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
  }

  /**
   * Collect and send metrics
   */
  private sendMetrics() {
    const recorders = this.getRecordersCallback ? this.getRecordersCallback() : []

    const onlineRecorders = recorders.filter(r => r.online).length
    const totalRecorders = recorders.length
    const recordingRecorders = recorders.filter(r => r.transportStatus === 'record').length

    // Calculate total disk space across all recorders
    const totalDiskSpace = recorders.reduce((sum, r) => sum + (r.diskSpaceGB || 0), 0)

    this.send({
      type: 'metrics',
      node_id: this.settings.nodeId,
      timestamp: new Date().toISOString(),
      metrics: {
        recorders_total: totalRecorders,
        recorders_online: onlineRecorders,
        recorders_recording: recordingRecorders,
        total_disk_space_gb: totalDiskSpace.toFixed(2)
      }
    })
  }

  /**
   * Send message to cmndHub
   */
  private send(message: CmndMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Update settings and reconnect if needed
   */
  updateSettings(newSettings: CmndSettings) {
    const wasEnabled = this.settings.enabled
    const urlChanged = newSettings.hubUrl !== this.settings.hubUrl

    this.settings = {
      ...newSettings,
      nodeId: newSettings.nodeId || this.settings.nodeId || randomUUID()
    }

    if (!wasEnabled && newSettings.enabled) {
      // Enabling cmnd
      this.connect()
    } else if (wasEnabled && !newSettings.enabled) {
      // Disabling cmnd
      this.disconnect()
    } else if (wasEnabled && newSettings.enabled && urlChanged) {
      // URL changed, reconnect
      this.disconnect()
      setTimeout(() => this.connect(), 1000)
    }
  }

  /**
   * Get current node ID
   */
  getNodeId(): string {
    return this.settings.nodeId || ''
  }
}
