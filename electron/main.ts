import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { AppState, IPC_CHANNELS, Recorder, DateFormat, CmndSettings } from '../shared/types'
import fs from 'fs/promises'
// WebSocket removed - using OSC only
import net from 'net'
import * as osc from 'osc'
import { CmndClient } from './cmnd-client'

const isDev = !app.isPackaged
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')
// Removed WebSocket - using OSC only

let mainWindow: BrowserWindow | null = null
let statusCheckInterval: NodeJS.Timeout | null = null
let broadcastInterval: NodeJS.Timeout | null = null
const HYPERDECK_PORT = 9993 // HyperDeck control port
const STATUS_CHECK_INTERVAL = 5000 // Check every 5 seconds
const BROADCAST_INTERVAL = 10000 // Broadcast to Companion every 10 seconds

// OSC client and listener
let oscPort: any = null
let oscListener: any = null

// cmnd client
let cmndClient: CmndClient | null = null

let appState: AppState = {
  recorders: [],
  currentTakes: {},
  takeHistory: [],
  templates: [
    {
      id: '1',
      name: 'Show',
      format: '{showName}',
      variables: ['showName']
    },
    {
      id: '2',
      name: 'Take',
      format: '{showName}_S{shot}_T{take}',
      variables: ['showName', 'shot', 'take']
    },
    {
      id: '3',
      name: 'Custom',
      format: '',
      variables: []
    }
  ],
  predefinedTakes: [],
  showName: '',
  dateFormat: 'YYYYMMDD',
  oscSettings: {
    enabled: true,  // Global OSC enable/disable
    listenerPort: 8012,  // Default port for incoming OSC commands
    listenerEnabled: true  // Enable OSC listener by default
  },
  cmndSettings: {
    enabled: false,  // cmnd integration disabled by default
    hubUrl: 'ws://localhost:5000/ws'
  }
}

async function loadState() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    appState = JSON.parse(data)
    
    // Ensure we have a valid date format
    if (!appState.dateFormat) {
      appState.dateFormat = 'YYYYMMDD'
    }
    
    // Ensure oscSettings exists with listener defaults
    if (!appState.oscSettings) {
      appState.oscSettings = {
        enabled: true,
        listenerPort: 8012,
        listenerEnabled: true
      }
      needsSave = true
    } else {
      // Migrate existing settings to add listener options
      if (appState.oscSettings.listenerPort === undefined) {
        appState.oscSettings.listenerPort = 8012
        needsSave = true
      }
      if (appState.oscSettings.listenerEnabled === undefined) {
        appState.oscSettings.listenerEnabled = true
        needsSave = true
      }
    }
    
    // Migrate existing recorders to ensure they have shot/take numbers
    let needsSave = false
    appState.recorders.forEach((recorder) => {
      if (recorder.format.type === 'take-based') {
        if (!recorder.shotNumber) {
          recorder.shotNumber = 1
          needsSave = true
        }
        if (!recorder.takeNumber) {
          recorder.takeNumber = 1
          needsSave = true
        }
      }
    })
    
    // Migrate old template formats to new format
    if (appState.templates) {
      const broadcast = appState.templates.find(t => t.id === '1')
      if (broadcast && (broadcast.name === 'Broadcast' || broadcast.name === 'Date')) {
        broadcast.name = 'Show'
        broadcast.format = '{showName}'
        broadcast.variables = ['showName']
        needsSave = true
      }
      
      const takeBased = appState.templates.find(t => t.id === '2')
      if (takeBased) {
        if (takeBased.format.includes('Scene') || takeBased.name === 'Show_S#_T#') {
          takeBased.name = 'Take'
          takeBased.format = '{showName}_S{shot}_T{take}'
          takeBased.variables = ['showName', 'shot', 'take']
          needsSave = true
        }
      }
      
      // Add Custom template if it doesn't exist
      const customTemplate = appState.templates.find(t => t.id === '3')
      if (!customTemplate) {
        appState.templates.push({
          id: '3',
          name: 'Custom',
          format: '',
          variables: []
        })
        needsSave = true
      }
    }
    
    if (needsSave) {
      await saveState()
    }
  } catch (error) {
    // Config doesn't exist yet, use default state
    console.log('No saved config found, using defaults')
  }
}

async function saveState() {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(appState, null, 2))
  } catch (error) {
    console.error('Failed to save state:', error)
  }
}

async function checkRecorderStatus(recorder: Recorder): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 3000) // 3 second timeout

    socket.on('connect', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function getRecorderCodec(recorder: Recorder): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let data = ''

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(null)
    }, 3000)

    socket.on('data', (chunk) => {
      data += chunk.toString()

      // Look for codec in the response
      // HyperDeck returns format like "file format: QuickTimeProResHQ"
      const match = data.match(/file format:\s*QuickTime([\w]+)/i)
      if (match) {
        clearTimeout(timeout)
        socket.destroy()
        resolve(match[1]) // Returns "ProResHQ", "ProRes", etc.
      } else if (data.includes('DNx')) {
        const dnxMatch = data.match(/file format:\s*DNx([\w]+)/i)
        if (dnxMatch) {
          clearTimeout(timeout)
          socket.destroy()
          resolve('DNx' + dnxMatch[1])
        }
      }
    })

    socket.on('connect', () => {
      // Query the file format
      socket.write('configuration\n')
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(null)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function setRecorderCodec(recorder: Recorder, codec: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let success = false

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 3000)

    // Convert our codec names to HyperDeck format
    const codecMap: Record<string, string> = {
      'ProRes422HQ': 'QuickTimeProResHQ',
      'ProRes422': 'QuickTimeProRes',
      'ProRes422LT': 'QuickTimeProResLT',
      'ProRes422Proxy': 'QuickTimeProResProxy',
      'DNxHD220': 'DNxHD220',
      'DNxHD145': 'DNxHD145',
      'DNxHD45': 'DNxHD45'
    }

    const hyperdeckCodec = codecMap[codec]
    if (!hyperdeckCodec) {
      clearTimeout(timeout)
      resolve(false)
      return
    }

    socket.on('data', (chunk) => {
      const response = chunk.toString()
      // HyperDeck responds with "200 ok" on success
      if (response.includes('200')) {
        success = true
        clearTimeout(timeout)
        socket.destroy()
        resolve(true)
      }
    })

    socket.on('connect', () => {
      // Send codec change command
      socket.write(`configuration: file format: ${hyperdeckCodec}\n`)
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function getRecorderTransportInfo(recorder: Recorder): Promise<{ timecode: string | null; status: string | null }> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let data = ''

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({ timecode: null, status: null })
    }, 3000)

    socket.on('data', (chunk) => {
      data += chunk.toString()

      // Look for transport info in response
      // Format: "status: record" or "status: preview" or "status: stopped" or "status: play"
      // Format: "display timecode: 01:00:00:00"
      const statusMatch = data.match(/status:\s*(\w+)/i)
      const timecodeMatch = data.match(/display timecode:\s*([\d:]+)/i)

      if (statusMatch || timecodeMatch) {
        clearTimeout(timeout)
        socket.destroy()
        resolve({
          timecode: timecodeMatch ? timecodeMatch[1] : null,
          status: statusMatch ? statusMatch[1].toLowerCase() : null
        })
      }
    })

    socket.on('connect', () => {
      // Query transport info
      socket.write('transport info\n')
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve({ timecode: null, status: null })
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function sendTransportCommand(recorder: Recorder, command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let success = false

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 3000)

    socket.on('data', (chunk) => {
      const response = chunk.toString()
      // HyperDeck responds with "200 ok" on success
      if (response.includes('200')) {
        success = true
        clearTimeout(timeout)
        socket.destroy()
        resolve(true)
      }
    })

    socket.on('connect', () => {
      // Send the transport command
      socket.write(command + '\n')
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function getClipList(recorder: Recorder): Promise<any[]> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let data = ''

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve([])
    }, 5000)

    socket.on('data', (chunk) => {
      data += chunk.toString()

      // HyperDeck returns clip list in format:
      // 205 clips info:
      // 1: Clip1.mov 00:05:23:12
      // 2: Clip2.mov 00:03:45:00
      if (data.includes('205 clips info:')) {
        clearTimeout(timeout)
        socket.destroy()

        const lines = data.split('\n')
        const clips: any[] = []

        for (const line of lines) {
          // Match pattern: "1: ClipName.mov 00:05:23:12"
          const match = line.match(/^(\d+):\s*(.+?)\s+(\d{2}:\d{2}:\d{2}:\d{2})$/)
          if (match) {
            clips.push({
              id: parseInt(match[1]),
              name: match[2].trim(),
              duration: match[3]
            })
          }
        }

        resolve(clips)
      }
    })

    socket.on('connect', () => {
      socket.write('clips get\n')
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve([])
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function gotoClip(recorder: Recorder, clipId: number): Promise<boolean> {
  return sendTransportCommand(recorder, `goto: clip id: ${clipId}`)
}

async function playClip(recorder: Recorder, clipId: number): Promise<boolean> {
  return sendTransportCommand(recorder, `play: clip id: ${clipId}`)
}

async function gotoTimecode(recorder: Recorder, timecode: string): Promise<boolean> {
  return sendTransportCommand(recorder, `goto: timecode: ${timecode}`)
}

async function setVideoInput(recorder: Recorder, input: string): Promise<boolean> {
  // HyperDeck protocol: "configuration: video input: SDI" or "configuration: video input: HDMI"
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let success = false

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 3000)

    socket.on('data', (chunk) => {
      const response = chunk.toString()
      // HyperDeck responds with "200 ok" on success
      if (response.includes('200')) {
        success = true
        clearTimeout(timeout)
        socket.destroy()
        resolve(true)
      }
    })

    socket.on('connect', () => {
      // Send video input change command
      socket.write(`configuration: video input: ${input}\n`)
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

async function transportPlay(recorder: Recorder): Promise<boolean> {
  return sendTransportCommand(recorder, 'play')
}

async function transportStop(recorder: Recorder): Promise<boolean> {
  return sendTransportCommand(recorder, 'stop')
}

async function checkAllRecordersStatus(): Promise<void> {
  const statusChecks = appState.recorders.map(async (recorder) => {
    const isOnline = await checkRecorderStatus(recorder)
    recorder.online = isOnline
    recorder.lastChecked = Date.now()

    // Also poll the codec, timecode, and transport status if online
    if (isOnline) {
      const codec = await getRecorderCodec(recorder)
      if (codec) {
        // Convert HyperDeck codec back to our format
        const codecMap: Record<string, string> = {
          'ProResHQ': 'ProRes422HQ',
          'ProRes': 'ProRes422',
          'ProResLT': 'ProRes422LT',
          'ProResProxy': 'ProRes422Proxy',
          'DNxHD220': 'DNxHD220',
          'DNxHD145': 'DNxHD145',
          'DNxHD45': 'DNxHD45'
        }
        recorder.recordingQuality = codecMap[codec] || codec
      }

      // Get transport info (timecode and status)
      const transportInfo = await getRecorderTransportInfo(recorder)
      if (transportInfo.timecode) {
        recorder.timecode = transportInfo.timecode
      }
      if (transportInfo.status) {
        recorder.transportStatus = transportInfo.status as 'play' | 'record' | 'preview' | 'stopped'
      }
    } else {
      // Clear transport info if offline
      recorder.timecode = undefined
      recorder.transportStatus = undefined
    }
  })

  await Promise.all(statusChecks)

  // Send updated state to renderer
  if (mainWindow) {
    mainWindow.webContents.send('state-updated', appState)
  }

  // OSC will be sent when take names are set
}

function startStatusChecking(): void {
  // Initial check
  checkAllRecordersStatus()
  
  // Set up interval
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
  statusCheckInterval = setInterval(checkAllRecordersStatus, STATUS_CHECK_INTERVAL)
}

function formatDate(format: DateFormat): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'YYYYMMDD':
      return `${year}${month}${day}`
    case 'MMDDYYYY':
      return `${month}${day}${year}`
    case 'DDMMYYYY':
      return `${day}${month}${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYYMMDDHHmm':
      return `${year}${month}${day}${hours}${minutes}`
    case 'YYYYMMDD-HHmm':
      return `${year}${month}${day}-${hours}${minutes}`
    case 'YYYYMMDD_HHmm':
      return `${year}${month}${day}_${hours}${minutes}`
    case 'YYYY-MM-DD-HHmm':
      return `${year}-${month}-${day}-${hours}${minutes}`
    case 'HHmmss':
      return `${hours}${minutes}${seconds}`
    default:
      return `${year}${month}${day}`
  }
}

function initOSC() {
  oscPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 0,
    metadata: true
  })

  oscPort.on('ready', () => {
    console.log('OSC port is ready')
  })

  oscPort.on('error', (error: any) => {
    console.error('OSC port error:', error)
  })

  oscPort.open()
  console.log('OSC client initialized')
}

function initOSCListener() {
  if (oscListener) {
    console.log('Closing existing OSC listener...')
    try {
      oscListener.close()
    } catch (e) {
      console.error('Error closing OSC listener:', e)
    }
    oscListener = null
  }

  const listenerEnabled = appState.oscSettings?.listenerEnabled !== false
  const listenerHost = appState.oscSettings?.listenerHost || '0.0.0.0'
  const listenerPort = appState.oscSettings?.listenerPort || 8012

  if (!listenerEnabled) {
    console.log('OSC listener disabled in settings')
    return
  }

  console.log(`Initializing OSC listener on ${listenerHost}:${listenerPort}...`)
  
  oscListener = new osc.UDPPort({
    localAddress: listenerHost,
    localPort: listenerPort,
    metadata: true
  })

  oscListener.on('message', (oscMsg: any) => {
    console.log('Received OSC:', oscMsg.address, oscMsg.args)
    handleOSCCommand(oscMsg)
  })

  oscListener.on('ready', () => {
    console.log(`OSC listener ready on ${listenerHost}:${listenerPort}`)
  })

  oscListener.on('error', (error: any) => {
    console.error('OSC listener error:', error)
    // Try to recover by reinitializing after a delay
    setTimeout(() => {
      console.log('Attempting to restart OSC listener...')
      initOSCListener()
    }, 5000)
  })

  oscListener.open()
}

// cmnd Integration
function initCmnd() {
  if (!appState.cmndSettings || !appState.cmndSettings.enabled) {
    console.log('⚠️  cmnd integration disabled')
    return
  }

  console.log('🚀 Initializing cmnd client...')
  cmndClient = new CmndClient(appState.cmndSettings)

  // Set callback to provide recorder data for metrics
  cmndClient.setGetRecordersCallback(() => appState.recorders)

  // Set command handler
  cmndClient.setCommandHandler(handleCmndCommand)

  // Connect to cmndHub
  cmndClient.connect()
}

async function handleCmndCommand(command: string, params: any): Promise<any> {
  console.log(`📥 Handling cmnd command: ${command}`, params)

  switch (command) {
    case 'set_take_name':
      if (!params.recorderId || !params.takeName) {
        throw new Error('Missing recorderId or takeName parameter')
      }
      return await setRecorderTakeName(params.recorderId, params.takeName)

    case 'increment_take':
      if (!params.recorderId) {
        throw new Error('Missing recorderId parameter')
      }
      return await incrementRecorderTake(params.recorderId)

    case 'increment_shot':
      if (!params.recorderId) {
        throw new Error('Missing recorderId parameter')
      }
      return await incrementRecorderShot(params.recorderId)

    case 'start_recording':
      if (!params.recorderId) {
        throw new Error('Missing recorderId parameter')
      }
      return await startRecording(params.recorderId)

    case 'stop_recording':
      if (!params.recorderId) {
        throw new Error('Missing recorderId parameter')
      }
      return await stopRecording(params.recorderId)

    case 'get_recorders':
      return appState.recorders.map(r => ({
        id: r.id,
        name: r.name,
        ipAddress: r.ipAddress,
        online: r.online,
        transportStatus: r.transportStatus,
        diskSpaceGB: r.diskSpaceGB
      }))

    case 'get_status':
      return {
        recorders: appState.recorders.length,
        online: appState.recorders.filter(r => r.online).length,
        recording: appState.recorders.filter(r => r.transportStatus === 'record').length
      }

    default:
      throw new Error(`Unknown command: ${command}`)
  }
}

async function startRecording(recorderId: string): Promise<any> {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) {
    throw new Error(`Recorder not found: ${recorderId}`)
  }

  const success = await sendTransportCommand(recorder, 'record')
  return { success, recorderId, command: 'record' }
}

async function stopRecording(recorderId: string): Promise<any> {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) {
    throw new Error(`Recorder not found: ${recorderId}`)
  }

  const success = await sendTransportCommand(recorder, 'stop')
  return { success, recorderId, command: 'stop' }
}

async function incrementRecorderTake(recorderId: string): Promise<number> {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) {
    throw new Error(`Recorder not found: ${recorderId}`)
  }

  if (recorder.takeNumber !== undefined) {
    recorder.takeNumber++
    await saveState()
    broadcastToRenderer('state-updated', appState)
    return recorder.takeNumber
  }

  throw new Error('Recorder does not have take numbering enabled')
}

async function incrementRecorderShot(recorderId: string): Promise<number> {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) {
    throw new Error(`Recorder not found: ${recorderId}`)
  }

  if (recorder.shotNumber !== undefined) {
    recorder.shotNumber++
    recorder.takeNumber = 1 // Reset take number
    await saveState()
    broadcastToRenderer('state-updated', appState)
    return recorder.shotNumber
  }

  throw new Error('Recorder does not have shot numbering enabled')
}

async function setRecorderTakeName(recorderId: string, takeName: string): Promise<any> {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) {
    throw new Error(`Recorder not found: ${recorderId}`)
  }

  // Update current take
  appState.currentTakes[recorderId] = takeName

  // Send to HyperDeck if online
  if (recorder.online) {
    const success = await sendHyperDeckTakeName(recorder, takeName)
    if (!success) {
      throw new Error('Failed to send take name to HyperDeck')
    }
  }

  // Broadcast via OSC if enabled
  if (oscPort && appState.oscSettings?.enabled) {
    broadcastTakeToOSC(recorder, takeName)
  }

  await saveState()
  broadcastToRenderer('state-updated', appState)

  return { success: true, recorderId, takeName }
}

async function sendHyperDeckTakeName(recorder: Recorder, takeName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let success = false

    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 3000)

    socket.on('data', (chunk) => {
      const response = chunk.toString()
      if (response.includes('200')) {
        success = true
        clearTimeout(timeout)
        socket.destroy()
        resolve(true)
      }
    })

    socket.on('connect', () => {
      socket.write(`disk select: slot id: 1\n`)
      setTimeout(() => {
        socket.write(`disk select: video filename: ${takeName}\n`)
      }, 100)
    })

    socket.on('error', () => {
      clearTimeout(timeout)
      resolve(false)
    })

    socket.connect(HYPERDECK_PORT, recorder.ipAddress)
  })
}

function sanitizeOSCName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_')
}

function handleOSCCommand(oscMsg: any) {
  // Command format: /deckpilot/{recorderName}/{action}
  // Examples:
  //   /deckpilot/HYPER_41/setTake
  //   /deckpilot/all/setAll
  
  const parts = oscMsg.address.split('/')
  if (parts.length < 4 || parts[1] !== 'deckpilot') {
    console.log('Invalid OSC command format:', oscMsg.address)
    return
  }

  const target = parts[2]  // recorder name (sanitized) or 'all'
  const action = parts[3]  // 'setTake' or 'setAll'

  if (action === 'setTake' && target !== 'all') {
    // Set take for a specific recorder - find by sanitized name
    const recorder = appState.recorders.find(r => sanitizeOSCName(r.name) === target)
    if (recorder) {
      const takeName = generateTakeName(recorder)
      setTakeInternal(recorder.id, takeName, true)
      sendTakeResponse(recorder, takeName)
    } else {
      console.log(`Recorder not found with name: ${target}`)
    }
  } else if (action === 'setAll' || (action === 'setTake' && target === 'all')) {
    // Set take for all recorders
    appState.recorders.forEach(recorder => {
      if (recorder.enabled) {
        const takeName = generateTakeName(recorder)
        setTakeInternal(recorder.id, takeName, false)
        sendTakeResponse(recorder, takeName)
      }
    })
    
    // Send a single 'all' trigger event for UI
    if (mainWindow) {
      console.log('Sending osc-triggered event for all recorders')
      mainWindow.webContents.send('osc-triggered', { recorderId: 'all', timestamp: Date.now() })
    }
  } else {
    console.log('Unknown OSC command:', action)
  }
}

function generateTakeName(recorder: Recorder): string {
  const template = recorder.selectedTemplate || '1'
  let parts: string[] = []

  // Default include settings if not set (for backwards compatibility)
  const includeShow = recorder.includeShow !== false  // Default true
  const includeDate = recorder.includeDate !== false  // Default true
  const includeShotTake = recorder.includeShotTake !== false  // Default true
  const includeCustom = recorder.includeCustom !== false  // Default true

  // Template 1: Show (show name + date)
  if (template === '1') {
    if (includeShow && appState.showName) parts.push(appState.showName)
    if (includeDate && appState.dateFormat) {
      const date = formatDate(appState.dateFormat)
      parts.push(date)
    }
  }
  // Template 2: Take (show + date + shot + custom + take)
  else if (template === '2') {
    if (includeShow && appState.showName) parts.push(appState.showName)
    if (includeDate && appState.dateFormat) {
      const date = formatDate(appState.dateFormat)
      parts.push(date)
    }
    if (includeShotTake && recorder.shotNumber !== undefined) {
      parts.push(`S${String(recorder.shotNumber).padStart(2, '0')}`)
    }
    if (includeCustom && recorder.customText) {
      parts.push(recorder.customText)
    }
    if (includeShotTake && recorder.takeNumber !== undefined) {
      parts.push(`T${String(recorder.takeNumber).padStart(2, '0')}`)
    }
  }
  // Template 3: Custom (just custom text)
  else if (template === '3') {
    if (includeCustom && recorder.customText) {
      parts.push(recorder.customText)
    }
  }

  return parts.join('_') || 'TAKE'
}

function setTakeInternal(recorderId: string, takeName: string, fromOSC: boolean = false) {
  // Update internal state
  appState.currentTakes[recorderId] = takeName

  // Add to history
  appState.takeHistory.unshift({
    id: Date.now().toString() + '_' + recorderId,
    name: takeName,
    timestamp: Date.now(),
    recorderId
  })

  // Keep only last 100 takes
  if (appState.takeHistory.length > 100) {
    appState.takeHistory = appState.takeHistory.slice(0, 100)
  }

  // Increment take number for Take mode (template 2)
  const recorder = appState.recorders.find(r => r.id === recorderId)
  const isTakeMode = recorder?.selectedTemplate === '2'
  if (recorder && isTakeMode) {
    recorder.takeNumber = (recorder.takeNumber || 1) + 1
  }

  saveState()

  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('state-updated', appState)

    // Send OSC trigger event
    if (fromOSC) {
      console.log(`Sending osc-triggered event for recorder: ${recorderId}`)
      mainWindow.webContents.send('osc-triggered', { recorderId, timestamp: Date.now() })
    }
  }
}

function sendTakeResponse(recorder: Recorder, takeName: string) {
  // Send response back to Companion with take metadata
  const sanitizedRecorderName = recorder.name.replace(/[^a-zA-Z0-9]/g, '_')
  const responseAddress = `/deckpilot/${sanitizedRecorderName}`
  
  const targetHost = appState.oscSettings?.sendHost || '127.0.0.1'
  const targetPort = appState.oscSettings?.companionPort || 8014
  
  if (oscPort && targetPort && appState.oscSettings?.enabled) {
    try {
      console.log(`Sending OSC to Companion at ${targetHost}:${targetPort}`)
      console.log(`  Address: ${responseAddress}`)
      console.log(`  Take: ${takeName}`)
      console.log(`  Shot: ${recorder.shotNumber || 1}`)
      console.log(`  Take#: ${recorder.takeNumber || 1}`)
      
      oscPort.send({
        address: responseAddress,
        args: [
          { type: 's', value: takeName },
          { type: 'i', value: recorder.shotNumber || 1 },
          { type: 'i', value: recorder.takeNumber || 1 },
          { type: 's', value: recorder.name || recorder.id }
        ]
      }, targetHost, targetPort)
      
      console.log('OSC sent successfully to Companion module')
    } catch (error) {
      console.error('Failed to send OSC to Companion:', error)
    }
  }
}

// Removed unused sendOSC function

function sendTakeToCompanion(recorderId: string, takeName: string) {
  // Find recorder
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return
  
  const recorderName = recorder.name || recorderId

  // Use global OSC settings - single Companion module port
  const targetHost = appState.oscSettings?.sendHost || '127.0.0.1'
  const targetPort = appState.oscSettings?.companionPort || 8014
  const enabled = appState.oscSettings?.enabled !== false

  if (oscPort && targetPort && enabled) {
    try {
      // Sanitize recorder name for OSC address (no spaces or special chars)
      const sanitizedRecorderName = recorderName.replace(/[^a-zA-Z0-9]/g, '_')
      const oscAddress = `/deckpilot/${sanitizedRecorderName}`
      
      console.log(`Sending OSC to Companion at ${targetHost}:${targetPort}`)
      console.log(`  Address: ${oscAddress}`)
      console.log(`  Take: ${takeName}`)
      console.log(`  Shot: ${recorder.shotNumber || 1}`)
      console.log(`  Take#: ${recorder.takeNumber || 1}`)
      
      oscPort.send({
        address: oscAddress,
        args: [
          { type: 's', value: takeName },
          { type: 'i', value: recorder.shotNumber || 1 },
          { type: 'i', value: recorder.takeNumber || 1 },
          { type: 's', value: recorder.name || recorder.id }
        ]
      }, targetHost, targetPort)
      console.log('OSC sent successfully to Companion module')
    } catch (error) {
      console.error('Failed to send OSC to Companion:', error)
    }
  } else {
    console.log('OSC not sent:', !oscPort ? 'OSC client not initialized' : !targetPort ? 'OSC port not configured' : 'OSC disabled in settings')
  }
}

// All WebSocket Companion communication removed - OSC only

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 1050,
    alwaysOnTop: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, dist is next to dist-electron in the app bundle
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
  return appState
})

ipcMain.handle(IPC_CHANNELS.ADD_RECORDER, async (_, recorder: Recorder) => {
  // Initialize shot and take numbers if not set
  if (!recorder.shotNumber) recorder.shotNumber = 1
  if (!recorder.takeNumber) recorder.takeNumber = 1
  
  // Check initial status
  recorder.online = await checkRecorderStatus(recorder)
  recorder.lastChecked = Date.now()
  
  appState.recorders.push(recorder)
  saveState()
  
  // Broadcast the new recorder to Companion immediately
  setTimeout(() => {
    const takeName = appState.currentTakes[recorder.id] || generateTakeName(recorder)
    sendTakeResponse(recorder, takeName)
  }, 100)
  
  return appState.recorders
})

ipcMain.handle(IPC_CHANNELS.REMOVE_RECORDER, (_, recorderId: string) => {
  appState.recorders = appState.recorders.filter(r => r.id !== recorderId)
  delete appState.currentTakes[recorderId]
  saveState()
  return appState.recorders
})

ipcMain.handle(IPC_CHANNELS.UPDATE_RECORDER, async (_, recorder: Recorder) => {
  const index = appState.recorders.findIndex(r => r.id === recorder.id)
  if (index !== -1) {
    const oldRecorder = appState.recorders[index]

    // Check status if IP changed
    if (oldRecorder.ipAddress !== recorder.ipAddress) {
      recorder.online = await checkRecorderStatus(recorder)
      recorder.lastChecked = Date.now()
    }

    // Send codec change command if recording quality changed
    if (oldRecorder.recordingQuality !== recorder.recordingQuality && recorder.recordingQuality) {
      if (recorder.online) {
        const success = await setRecorderCodec(recorder, recorder.recordingQuality)
        if (success) {
          console.log(`Successfully changed codec to ${recorder.recordingQuality} for ${recorder.name}`)
        } else {
          console.log(`Failed to change codec for ${recorder.name}`)
        }
      } else {
        console.log(`Recorder ${recorder.name} is offline, cannot change codec`)
      }
    }

    appState.recorders[index] = recorder
    saveState()
  }
  return appState.recorders
})

ipcMain.handle(IPC_CHANNELS.SET_TAKE_NAME, (_, recorderId: string, takeName: string) => {
  appState.currentTakes[recorderId] = takeName
  appState.takeHistory.unshift({
    id: Date.now().toString(),
    name: takeName,
    timestamp: Date.now(),
    recorderId
  })
  // Keep only last 100 takes
  if (appState.takeHistory.length > 100) {
    appState.takeHistory = appState.takeHistory.slice(0, 100)
  }
  saveState()
  
  // Send OSC to Companion
  sendTakeToCompanion(recorderId, takeName)
  
  return appState.currentTakes
})

ipcMain.handle(IPC_CHANNELS.GET_TAKE_HISTORY, () => {
  return appState.takeHistory
})

ipcMain.handle(IPC_CHANNELS.SET_SHOW_NAME, (_, showName: string) => {
  appState.showName = showName
  saveState()
  return appState.showName
})

ipcMain.handle(IPC_CHANNELS.SET_DATE_FORMAT, (_, dateFormat: DateFormat) => {
  console.log('Setting date format to:', dateFormat)
  appState.dateFormat = dateFormat
  saveState()
  console.log('appState.dateFormat is now:', appState.dateFormat)
  return appState.dateFormat
})

ipcMain.handle(IPC_CHANNELS.GET_FORMATTED_DATE, () => {
  console.log('Getting formatted date with format:', appState.dateFormat)
  const result = formatDate(appState.dateFormat || 'YYYYMMDD')
  console.log('Formatted date result:', result)
  return result
})

ipcMain.handle(IPC_CHANNELS.SET_RECORDER_SHOT_NUMBER, (_, recorderId: string, shotNumber: number) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (recorder) {
    const oldShotNumber = recorder.shotNumber
    recorder.shotNumber = shotNumber
    
    // Reset take to 1 if shot number changed
    if (oldShotNumber !== shotNumber) {
      recorder.takeNumber = 1
    }
    
    saveState()
    mainWindow?.webContents.send('state-updated', appState)
  }
  return { shotNumber: recorder?.shotNumber, takeNumber: recorder?.takeNumber }
})

ipcMain.handle(IPC_CHANNELS.SET_RECORDER_TAKE_NUMBER, (_, recorderId: string, takeNumber: number) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (recorder) {
    recorder.takeNumber = takeNumber
    saveState()
  }
  return recorder?.takeNumber
})

ipcMain.handle(IPC_CHANNELS.INCREMENT_RECORDER_SHOT, (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (recorder) {
    recorder.shotNumber = (recorder.shotNumber || 1) + 1
    recorder.takeNumber = 1 // Reset take number when shot increments
    saveState()
    return { shotNumber: recorder.shotNumber, takeNumber: recorder.takeNumber }
  }
  return null
})

ipcMain.handle(IPC_CHANNELS.INCREMENT_RECORDER_TAKE, (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (recorder) {
    recorder.takeNumber = (recorder.takeNumber || 1) + 1
    saveState()
    return recorder.takeNumber
  }
  return null
})

ipcMain.handle(IPC_CHANNELS.SET_OSC_SETTINGS, (_, oscSettings) => {
  console.log('Main process - received OSC settings:', oscSettings)
  appState.oscSettings = oscSettings
  console.log('Main process - appState.oscSettings now:', appState.oscSettings)
  saveState()
  console.log('Main process - state saved')
  
  // Reinitialize OSC with new settings
  if (oscPort) {
    oscPort.close()
  }
  if (oscSettings.enabled) {
    initOSC()
  }
  
  // Reinitialize OSC listener with new settings
  initOSCListener()
  
  console.log('Main process - returning:', appState.oscSettings)
  return appState.oscSettings
})

ipcMain.handle(IPC_CHANNELS.SET_CMND_SETTINGS, (_, cmndSettings: CmndSettings) => {
  console.log('Main process - received cmnd settings:', cmndSettings)
  appState.cmndSettings = cmndSettings
  saveState()

  // Initialize or update cmnd client
  if (!cmndClient && cmndSettings.enabled) {
    initCmnd()
  } else if (cmndClient) {
    cmndClient.updateSettings(cmndSettings)
  }

  return appState.cmndSettings
})

ipcMain.handle(IPC_CHANNELS.EXPORT_SHOW, async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Show File',
      defaultPath: `${appState.showName || 'show'}_${formatDate('YYYYMMDD')}.json`,
      filters: [
        { name: 'DeckPilot Show Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'Export canceled' }
    }

    // Export the entire app state
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: appState
    }

    await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2))
    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('Export failed:', error)
    return { success: false, message: `Export failed: ${error}` }
  }
})

ipcMain.handle(IPC_CHANNELS.IMPORT_SHOW, async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Show File',
      filters: [
        { name: 'DeckPilot Show Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'Import canceled' }
    }

    const fileContent = await fs.readFile(result.filePaths[0], 'utf-8')
    const importData = JSON.parse(fileContent)

    // Validate imported data
    if (!importData.data || !importData.version) {
      return { success: false, message: 'Invalid show file format' }
    }

    // Import the data
    const importedState: AppState = importData.data

    // Ensure required fields exist
    if (!importedState.recorders || !importedState.templates) {
      return { success: false, message: 'Invalid show file: missing required data' }
    }

    // Merge or replace state
    appState = {
      ...importedState,
      // Reset online status for all recorders
      recorders: importedState.recorders.map(r => ({ ...r, online: false, lastChecked: undefined }))
    }

    await saveState()

    // Notify renderer of updated state
    if (mainWindow) {
      mainWindow.webContents.send('state-updated', appState)
    }

    // Restart status checking with new recorders
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
    }
    startStatusChecking()

    return { success: true, filePath: result.filePaths[0] }
  } catch (error) {
    console.error('Import failed:', error)
    return { success: false, message: `Import failed: ${error}` }
  }
})

ipcMain.handle(IPC_CHANNELS.NEW_SHOW, async () => {
  try {
    // Reset state to defaults while keeping templates and OSC settings
    appState = {
      recorders: [],  // Clear all recorders
      currentTakes: {},  // Clear current takes
      takeHistory: [],  // Clear history
      templates: appState.templates,  // Keep templates
      predefinedTakes: [],  // Clear predefined takes
      showName: '',  // Reset show name to blank
      dateFormat: appState.dateFormat || 'YYYYMMDD',  // Keep date format
      oscSettings: appState.oscSettings  // Keep OSC settings
    }

    // Also reset shot/take numbers in any new recorders to 1
    // (but since we cleared recorders, they'll be added fresh with defaults)

    await saveState()

    // Notify renderer of updated state
    if (mainWindow) {
      mainWindow.webContents.send('state-updated', appState)
    }

    // Stop status checking since we have no recorders
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }

    return { success: true }
  } catch (error) {
    console.error('New show failed:', error)
    return { success: false, message: `New show failed: ${error}` }
  }
})

ipcMain.handle(IPC_CHANNELS.TRANSPORT_PLAY, async (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await sendTransportCommand(recorder, 'play')
  return { success, message: success ? 'Play command sent' : 'Failed to send play command' }
})

ipcMain.handle(IPC_CHANNELS.TRANSPORT_STOP, async (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await sendTransportCommand(recorder, 'stop')
  return { success, message: success ? 'Stop command sent' : 'Failed to send stop command' }
})

ipcMain.handle(IPC_CHANNELS.TRANSPORT_PREV, async (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await sendTransportCommand(recorder, 'goto: clip id: -1')
  return { success, message: success ? 'Previous clip command sent' : 'Failed to send previous command' }
})

ipcMain.handle(IPC_CHANNELS.TRANSPORT_NEXT, async (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await sendTransportCommand(recorder, 'goto: clip id: +1')
  return { success, message: success ? 'Next clip command sent' : 'Failed to send next command' }
})

ipcMain.handle(IPC_CHANNELS.GET_CLIPS, async (_, recorderId: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, clips: [], message: 'Recorder not found' }
  
  const clips = await getClipList(recorder)
  // Store clips in recorder state
  recorder.clips = clips
  
  // Send updated state to renderer
  if (mainWindow) {
    mainWindow.webContents.send('state-updated', appState)
  }
  
  return { success: true, clips }
})

ipcMain.handle(IPC_CHANNELS.GOTO_CLIP, async (_, recorderId: string, clipId: number) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await gotoClip(recorder, clipId)
  return { success, message: success ? `Goto clip ${clipId} command sent` : 'Failed to goto clip' }
})

ipcMain.handle(IPC_CHANNELS.PLAY_CLIP, async (_, recorderId: string, clipId: number) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await playClip(recorder, clipId)
  return { success, message: success ? `Play clip ${clipId} command sent` : 'Failed to play clip' }
})

ipcMain.handle(IPC_CHANNELS.GOTO_TIMECODE, async (_, recorderId: string, timecode: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await gotoTimecode(recorder, timecode)
  return { success, message: success ? `Goto timecode ${timecode} command sent` : 'Failed to goto timecode' }
})

ipcMain.handle(IPC_CHANNELS.SET_VIDEO_INPUT, async (_, recorderId: string, input: string) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false, message: 'Recorder not found' }
  
  const success = await setVideoInput(recorder, input)
  return { success, message: success ? `Video input changed to ${input}` : 'Failed to change video input' }
})

ipcMain.handle(IPC_CHANNELS.SET_RECORDER_TEMPLATE_SETTINGS, async (_, recorderId: string, settings: { includeShow?: boolean; includeDate?: boolean; includeShotTake?: boolean; includeCustom?: boolean }) => {
  const recorder = appState.recorders.find(r => r.id === recorderId)
  if (!recorder) return { success: false }
  
  // Update recorder settings
  recorder.includeShow = settings.includeShow
  recorder.includeDate = settings.includeDate
  recorder.includeShotTake = settings.includeShotTake
  recorder.includeCustom = settings.includeCustom
  
  await saveState()
  
  return { success: true }
})

function broadcastAllRecordersToCompanion() {
  // Send current state of all recorders to Companion
  if (!oscPort || !appState.oscSettings?.enabled) return
  
  console.log('Broadcasting all recorders to Companion...')
  appState.recorders.forEach(recorder => {
    const takeName = appState.currentTakes[recorder.id] || generateTakeName(recorder)
    sendTakeResponse(recorder, takeName)
  })
}

app.whenReady().then(async () => {
  await loadState()
  createWindow()
  initOSC()
  initOSCListener()
  initCmnd()
  startStatusChecking()
  
  // Broadcast all recorders to Companion after a short delay (to ensure OSC is ready)
  setTimeout(() => {
    broadcastAllRecordersToCompanion()
  }, 2000)
  
  // Set up periodic broadcast to Companion (in case Companion restarts)
  broadcastInterval = setInterval(() => {
    broadcastAllRecordersToCompanion()
  }, BROADCAST_INTERVAL)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
  if (broadcastInterval) {
    clearInterval(broadcastInterval)
  }
  if (oscPort) {
    oscPort.close()
  }
  if (oscListener) {
    oscListener.close()
  }
})
