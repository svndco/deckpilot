// Shared types between Electron app and Companion module

export interface Clip {
  id: number
  name: string
  duration?: string
}

export interface Recorder {
  id: string
  name: string
  ipAddress: string
  format: RecorderFormat
  enabled: boolean
  shotNumber?: number
  takeNumber?: number
  online?: boolean
  lastChecked?: number
  selectedTemplate?: string
  customText?: string  // Custom text for this recorder
  recordingQuality?: string  // HyperDeck recording codec/quality
  timecode?: string  // Current timecode from HyperDeck
  transportStatus?: 'play' | 'record' | 'preview' | 'stopped'  // Transport status
  diskSpaceGB?: number  // Remaining disk space in GB
  recordingTimeMinutes?: number  // Estimated remaining recording time in minutes
  clips?: Clip[]  // Available clips on the recorder
}

export interface RecorderFormat {
  type: 'broadcast' | 'take-based' | 'custom'
  template: string  // e.g., "{showName} - {date}" or "Scene {scene} - Take {take}"
}

export interface Take {
  id: string
  name: string
  timestamp: number
  recorderId?: string
  metadata?: Record<string, string>
}

export interface TakeTemplate {
  id: string
  name: string
  format: string
  variables: string[]  // e.g., ['scene', 'take', 'shot']
}

export type DateFormat = 'YYYYMMDD' | 'MMDDYYYY' | 'DDMMYYYY' | 'YYYY-MM-DD' | 'YYYYMMDDHHmm' | 'YYYYMMDD-HHmm' | 'YYYYMMDD_HHmm' | 'YYYY-MM-DD-HHmm' | 'HHmmss'

export interface OscSettings {
  enabled: boolean  // Global enable/disable for OSC
  sendHost?: string  // Companion module IP (default: 127.0.0.1)
  companionPort?: number  // Single port for Companion module (default: 8014)
  listenerHost?: string  // IP address to bind listener to (default: 0.0.0.0 for all interfaces)
  listenerPort?: number  // Port for DeckPilot to listen for incoming OSC commands (default: 8012)
  listenerEnabled?: boolean  // Enable/disable OSC listener
}

export interface AppState {
  recorders: Recorder[]
  currentTakes: Record<string, string>  // recorderId -> takeName
  takeHistory: Take[]
  templates: TakeTemplate[]
  predefinedTakes: string[]
  showName?: string
  dateFormat?: DateFormat
  oscSettings?: OscSettings
}

// IPC Channel names for Electron
export const IPC_CHANNELS = {
  GET_STATE: 'get-state',
  UPDATE_RECORDER: 'update-recorder',
  ADD_RECORDER: 'add-recorder',
  REMOVE_RECORDER: 'remove-recorder',
  SET_TAKE_NAME: 'set-take-name',
  GET_TAKE_HISTORY: 'get-take-history',
  SAVE_STATE: 'save-state',
  COMPANION_RECORD_TRIGGERED: 'companion-record-triggered',
  SET_SHOW_NAME: 'set-show-name',
  SET_DATE_FORMAT: 'set-date-format',
  GET_FORMATTED_DATE: 'get-formatted-date',
  SET_RECORDER_SHOT_NUMBER: 'set-recorder-shot-number',
  SET_RECORDER_TAKE_NUMBER: 'set-recorder-take-number',
  INCREMENT_RECORDER_SHOT: 'increment-recorder-shot',
  INCREMENT_RECORDER_TAKE: 'increment-recorder-take',
  SET_OSC_SETTINGS: 'set-osc-settings',
  EXPORT_SHOW: 'export-show',
  IMPORT_SHOW: 'import-show',
  TRANSPORT_PLAY: 'transport-play',
  TRANSPORT_STOP: 'transport-stop',
  TRANSPORT_PREV: 'transport-prev',
  TRANSPORT_NEXT: 'transport-next',
  GET_CLIPS: 'get-clips',
  GOTO_CLIP: 'goto-clip',
  PLAY_CLIP: 'play-clip',
  GOTO_TIMECODE: 'goto-timecode'
} as const

// WebSocket message types for Companion integration
export interface CompanionMessage {
  type: 'update-variable' | 'record-triggered' | 'get-take'
  recorderId?: string
  takeName?: string
  data?: any
}
