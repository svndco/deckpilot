import { AppState, Recorder, Take, DateFormat } from '@shared/types'

declare global {
  interface Window {
    electronAPI: {
      getState: () => Promise<AppState>
      addRecorder: (recorder: Recorder) => Promise<Recorder[]>
      removeRecorder: (recorderId: string) => Promise<Recorder[]>
      updateRecorder: (recorder: Recorder) => Promise<Recorder[]>
      setTakeName: (recorderId: string, takeName: string) => Promise<Record<string, string>>
      getTakeHistory: () => Promise<Take[]>
      setShowName: (showName: string) => Promise<string>
      setDateFormat: (dateFormat: DateFormat) => Promise<DateFormat>
      getFormattedDate: () => Promise<string>
      setRecorderShotNumber: (recorderId: string, shotNumber: number) => Promise<{shotNumber: number, takeNumber: number}>
      setRecorderTakeNumber: (recorderId: string, takeNumber: number) => Promise<number | undefined>
      incrementRecorderShot: (recorderId: string) => Promise<{ shotNumber: number; takeNumber: number } | null>
      incrementRecorderTake: (recorderId: string) => Promise<number | null>
      setOscSettings: (oscSettings: any) => Promise<any>
      exportShow: () => Promise<{ success: boolean; filePath?: string; message?: string }>
      importShow: () => Promise<{ success: boolean; filePath?: string; message?: string }>
      newShow: () => Promise<{ success: boolean; message?: string }>
      transportPlay: (recorderId: string) => Promise<{ success: boolean; message: string }>
      transportStop: (recorderId: string) => Promise<{ success: boolean; message: string }>
      transportPrev: (recorderId: string) => Promise<{ success: boolean; message: string }>
      transportNext: (recorderId: string) => Promise<{ success: boolean; message: string }>
      getClips: (recorderId: string) => Promise<{ success: boolean; clips: any[]; message?: string }>
      gotoClip: (recorderId: string, clipId: number) => Promise<{ success: boolean; message: string }>
      playClip: (recorderId: string, clipId: number) => Promise<{ success: boolean; message: string }>
      gotoTimecode: (recorderId: string, timecode: string) => Promise<{ success: boolean; message: string }>
      setVideoInput: (recorderId: string, input: string) => Promise<{ success: boolean; message: string }>
      setRecorderTemplateSettings: (recorderId: string, settings: { includeShow?: boolean; includeDate?: boolean; includeShotTake?: boolean; includeCustom?: boolean }) => Promise<{ success: boolean }>
      onStateUpdated: (callback: (state: AppState) => void) => () => void
      onOscTriggered: (callback: (data: { recorderId: string; timestamp: number }) => void) => () => void
    }
  }
}

export {}
