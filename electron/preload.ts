import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, Recorder, AppState, Take, DateFormat } from '../shared/types'

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getState: (): Promise<AppState> => ipcRenderer.invoke(IPC_CHANNELS.GET_STATE),

  addRecorder: (recorder: Recorder): Promise<Recorder[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_RECORDER, recorder),

  removeRecorder: (recorderId: string): Promise<Recorder[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_RECORDER, recorderId),

  updateRecorder: (recorder: Recorder): Promise<Recorder[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_RECORDER, recorder),

  setTakeName: (recorderId: string, takeName: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_TAKE_NAME, recorderId, takeName),

  getTakeHistory: (): Promise<Take[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TAKE_HISTORY),

  setShowName: (showName: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SHOW_NAME, showName),

  setDateFormat: (dateFormat: DateFormat): Promise<DateFormat> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_DATE_FORMAT, dateFormat),

  getFormattedDate: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_FORMATTED_DATE),

  setRecorderShotNumber: (recorderId: string, shotNumber: number): Promise<number | undefined> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_RECORDER_SHOT_NUMBER, recorderId, shotNumber),

  setRecorderTakeNumber: (recorderId: string, takeNumber: number): Promise<number | undefined> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_RECORDER_TAKE_NUMBER, recorderId, takeNumber),

  incrementRecorderShot: (recorderId: string): Promise<{ shotNumber: number; takeNumber: number } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.INCREMENT_RECORDER_SHOT, recorderId),

  incrementRecorderTake: (recorderId: string): Promise<number | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.INCREMENT_RECORDER_TAKE, recorderId),

  setOscSettings: (oscSettings: any): Promise<any> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_OSC_SETTINGS, oscSettings),

  exportShow: (): Promise<{ success: boolean; filePath?: string; message?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SHOW),

  importShow: (): Promise<{ success: boolean; filePath?: string; message?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SHOW),

  transportPlay: (recorderId: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSPORT_PLAY, recorderId),

  transportStop: (recorderId: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSPORT_STOP, recorderId),

  transportPrev: (recorderId: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSPORT_PREV, recorderId),

  transportNext: (recorderId: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSPORT_NEXT, recorderId),

  getClips: (recorderId: string): Promise<{ success: boolean; clips: any[]; message?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CLIPS, recorderId),

  gotoClip: (recorderId: string, clipId: number): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.GOTO_CLIP, recorderId, clipId),

  playClip: (recorderId: string, clipId: number): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.PLAY_CLIP, recorderId, clipId),

  gotoTimecode: (recorderId: string, timecode: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.GOTO_TIMECODE, recorderId, timecode),

  onStateUpdated: (callback: (state: AppState) => void) => {
    const listener = (_event: any, state: AppState) => callback(state)
    ipcRenderer.on('state-updated', listener)
    return () => ipcRenderer.removeListener('state-updated', listener)
  },

  onOscTriggered: (callback: (data: { recorderId: string; timestamp: number }) => void) => {
    const listener = (_event: any, data: { recorderId: string; timestamp: number }) => callback(data)
    ipcRenderer.on('osc-triggered', listener)
    return () => ipcRenderer.removeListener('osc-triggered', listener)
  }
})

// Type definitions for window.electronAPI
export interface ElectronAPI {
  getState: () => Promise<AppState>
  addRecorder: (recorder: Recorder) => Promise<Recorder[]>
  removeRecorder: (recorderId: string) => Promise<Recorder[]>
  updateRecorder: (recorder: Recorder) => Promise<Recorder[]>
  setTakeName: (recorderId: string, takeName: string) => Promise<Record<string, string>>
  getTakeHistory: () => Promise<Take[]>
  setShowName: (showName: string) => Promise<string>
  setDateFormat: (dateFormat: DateFormat) => Promise<DateFormat>
  getFormattedDate: () => Promise<string>
  setRecorderShotNumber: (recorderId: string, shotNumber: number) => Promise<number | undefined>
  setRecorderTakeNumber: (recorderId: string, takeNumber: number) => Promise<number | undefined>
  incrementRecorderShot: (recorderId: string) => Promise<{ shotNumber: number; takeNumber: number } | null>
  incrementRecorderTake: (recorderId: string) => Promise<number | null>
  setOscSettings: (oscSettings: any) => Promise<any>
  exportShow: () => Promise<{ success: boolean; filePath?: string; message?: string }>
  importShow: () => Promise<{ success: boolean; filePath?: string; message?: string }>
  transportPlay: (recorderId: string) => Promise<{ success: boolean; message: string }>
  transportStop: (recorderId: string) => Promise<{ success: boolean; message: string }>
  transportPrev: (recorderId: string) => Promise<{ success: boolean; message: string }>
  transportNext: (recorderId: string) => Promise<{ success: boolean; message: string }>
  getClips: (recorderId: string) => Promise<{ success: boolean; clips: any[]; message?: string }>
  gotoClip: (recorderId: string, clipId: number) => Promise<{ success: boolean; message: string }>
  playClip: (recorderId: string, clipId: number) => Promise<{ success: boolean; message: string }>
  gotoTimecode: (recorderId: string, timecode: string) => Promise<{ success: boolean; message: string }>
  onStateUpdated: (callback: (state: AppState) => void) => () => void
  onOscTriggered: (callback: (data: { recorderId: string; timestamp: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
