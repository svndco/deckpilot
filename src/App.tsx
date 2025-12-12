import { useState, useEffect, useCallback } from 'react'
import './App.css'
import RecorderList from './components/RecorderList'
import TakeInput from './components/TakeInput'
import Settings from './components/Settings'
import PlaybackView from './components/PlaybackView'
import CueView from './components/CueView'
import { AppState, Recorder, DateFormat } from '../shared/types'
import packageJson from '../package.json'

function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [selectedRecorder, setSelectedRecorder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [customTextState, setCustomTextState] = useState<{
    customText: string
    includeCustom: boolean
    setCustomText: (text: string) => void
  } | null>(null)
  const [oscTriggered, setOscTriggered] = useState<{recorderId: string, timestamp: number} | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [currentView, setCurrentView] = useState<'take-control' | 'play' | 'cue'>('play')

  useEffect(() => {
    loadState()

    // Listen for state updates from main process
    const removeStateListener = window.electronAPI.onStateUpdated?.((updatedState: AppState) => {
      setState(updatedState)
    })

    // Listen for OSC trigger events
    const removeOscListener = window.electronAPI.onOscTriggered((data: { recorderId: string; timestamp: number }) => {
      setOscTriggered(data)
      setTimeout(() => setOscTriggered(null), 700)
    })

    return () => {
      if (removeStateListener) removeStateListener()
      if (removeOscListener) removeOscListener()
    }
  }, [])

  async function loadState() {
    try {
      const appState = await window.electronAPI.getState()
      setState(appState)
      if (appState.recorders.length > 0 && !selectedRecorder) {
        setSelectedRecorder(appState.recorders[0].id)
      }
    } catch (error) {
      console.error('Failed to load state:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecorder(recorder: Recorder) {
    const updatedRecorders = await window.electronAPI.addRecorder(recorder)
    setState(prev => prev ? { ...prev, recorders: updatedRecorders } : null)
  }

  async function handleRemoveRecorder(recorderId: string) {
    const updatedRecorders = await window.electronAPI.removeRecorder(recorderId)
    setState(prev => prev ? { ...prev, recorders: updatedRecorders } : null)
    if (selectedRecorder === recorderId) {
      setSelectedRecorder(updatedRecorders[0]?.id || null)
    }
  }

  async function handleUpdateRecorder(recorder: Recorder) {
    const updatedRecorders = await window.electronAPI.updateRecorder(recorder)
    setState(prev => prev ? { ...prev, recorders: updatedRecorders } : null)
  }

  async function handleSetTakeName(takeName: string) {
    if (!selectedRecorder) return
    const updatedTakes = await window.electronAPI.setTakeName(selectedRecorder, takeName)
    setState(prev => prev ? { ...prev, currentTakes: updatedTakes } : null)
  }

  async function handleSetAllTakes() {
    if (!state || !currentRecorder) return
    
    // Get the current template to apply to all recorders
    const template = state.templates.find(t => t.id === currentRecorder.selectedTemplate)
    if (!template) return
    
    const isTakeMode = currentRecorder.selectedTemplate === '2'
    
    // Generate and set take names for all recorders based on their individual settings
    const updatedTakes: Record<string, string> = {}
    const updatedRecorders = [...state.recorders]
    
    for (let i = 0; i < updatedRecorders.length; i++) {
      const recorder = updatedRecorders[i]
      
      // Build the take name using each recorder's unique settings
      let parts: string[] = []
      if (state.showName) parts.push(state.showName)
      if (state.dateFormat) {
        const date = await window.electronAPI.getFormattedDate()
        parts.push(date)
      }
      if (recorder.shotNumber !== undefined) parts.push(`S${recorder.shotNumber.toString().padStart(2, '0')}`)
      if (recorder.customText) parts.push(recorder.customText)
      if (recorder.takeNumber !== undefined) parts.push(`T${recorder.takeNumber.toString().padStart(2, '0')}`)
      
      const takeName = parts.join('_')
      updatedTakes[recorder.id] = takeName
      await window.electronAPI.setTakeName(recorder.id, takeName)
      
      // Increment take number if in Take mode
      if (isTakeMode) {
        const newTakeNumber = await window.electronAPI.incrementRecorderTake(recorder.id)
        if (newTakeNumber !== null) {
          updatedRecorders[i] = { ...recorder, takeNumber: newTakeNumber }
        }
      }
    }
    
    setState(prev => prev ? { 
      ...prev, 
      currentTakes: { ...prev.currentTakes, ...updatedTakes },
      recorders: updatedRecorders
    } : null)
  }

  async function handleSetShowName(showName: string) {
    await window.electronAPI.setShowName(showName)
    setState(prev => prev ? { ...prev, showName } : null)
  }

  async function handleSetDateFormat(dateFormat: DateFormat) {
    await window.electronAPI.setDateFormat(dateFormat)
    setState(prev => prev ? { ...prev, dateFormat } : null)
  }

  async function handleSetRecorderShotNumber(recorderId: string, shotNumber: number) {
    const result = await window.electronAPI.setRecorderShotNumber(recorderId, shotNumber)
    setState(prev => {
      if (!prev) return null
      const updatedRecorders = prev.recorders.map(r =>
        r.id === recorderId ? { ...r, shotNumber: result.shotNumber, takeNumber: result.takeNumber } : r
      )
      return { ...prev, recorders: updatedRecorders }
    })
  }

  async function handleSetRecorderTakeNumber(recorderId: string, takeNumber: number) {
    await window.electronAPI.setRecorderTakeNumber(recorderId, takeNumber)
    setState(prev => {
      if (!prev) return null
      const updatedRecorders = prev.recorders.map(r =>
        r.id === recorderId ? { ...r, takeNumber } : r
      )
      return { ...prev, recorders: updatedRecorders }
    })
  }

  async function handleSetRecorderCustomText(recorderId: string, customText: string) {
    const updatedRecorders = state?.recorders.map(r =>
      r.id === recorderId ? { ...r, customText } : r
    )
    if (updatedRecorders) {
      setState(prev => prev ? { ...prev, recorders: updatedRecorders } : null)
      await window.electronAPI.updateRecorder(updatedRecorders.find(r => r.id === recorderId)!)
    }
  }

  async function handleIncrementRecorderShot(recorderId: string) {
    const result = await window.electronAPI.incrementRecorderShot(recorderId)
    if (result) {
      setState(prev => {
        if (!prev) return null
        const updatedRecorders = prev.recorders.map(r =>
          r.id === recorderId ? { ...r, shotNumber: result.shotNumber, takeNumber: result.takeNumber } : r
        )
        return { ...prev, recorders: updatedRecorders }
      })
    }
  }

  async function handleIncrementRecorderTake(recorderId: string) {
    const takeNumber = await window.electronAPI.incrementRecorderTake(recorderId)
    if (takeNumber !== null) {
      setState(prev => {
        if (!prev) return null
        const updatedRecorders = prev.recorders.map(r =>
          r.id === recorderId ? { ...r, takeNumber } : r
        )
        return { ...prev, recorders: updatedRecorders }
      })
    }
  }

  async function handleSaveOscSettings(oscSettings: any) {
    await window.electronAPI.setOscSettings(oscSettings)
    setState(prev => prev ? { ...prev, oscSettings } : null)
  }

  async function handleSaveCmndSettings(cmndSettings: any) {
    await window.electronAPI.setCmndSettings(cmndSettings)
    setState(prev => prev ? { ...prev, cmndSettings } : null)
  }

  const handleCustomTextStateChange = useCallback((customText: string, includeCustom: boolean, setCustomText: (text: string) => void) => {
    setCustomTextState({ customText, includeCustom, setCustomText })
  }, [])

  const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
    { value: 'YYYYMMDD', label: 'YYYYMMDD', example: '20251103' },
    { value: 'MMDDYYYY', label: 'MMDDYYYY', example: '11032025' },
    { value: 'DDMMYYYY', label: 'DDMMYYYY', example: '03112025' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2025-11-03' },
    { value: 'YYYYMMDDHHmm', label: 'YYYYMMDDHHmm', example: '202511031430' },
    { value: 'YYYYMMDD-HHmm', label: 'YYYYMMDD-HHmm', example: '20251103-1430' },
    { value: 'YYYYMMDD_HHmm', label: 'YYYYMMDD_HHmm', example: '20251103_1430' },
    { value: 'YYYY-MM-DD-HHmm', label: 'YYYY-MM-DD-HHmm', example: '2025-11-03-1430' },
    { value: 'HHmmss', label: 'HHmmss (Time Only)', example: '143045' }
  ]

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!state) {
    return <div className="error">Failed to load application state</div>
  }

  const currentRecorder = state.recorders.find(r => r.id === selectedRecorder)

  return (
    <div className="app">
      <header className="app-header">
        <h1 style={{ marginLeft: '10px' }}>Deck Pilot <span style={{ fontSize: '0.5em', opacity: 0.7 }}>v{packageJson.version}</span></h1>
        <div className="header-buttons">
          <div className="view-tabs">
            <span
              className={`view-tab ${currentView === 'take-control' ? 'active' : ''}`}
              onClick={() => setCurrentView('take-control')}
            >
              TAKE
            </span>
            <span
              className={`view-tab ${currentView === 'play' ? 'active' : ''}`}
              onClick={() => setCurrentView('play')}
            >
              PLAY
            </span>
            <span
              className={`view-tab ${currentView === 'cue' ? 'active' : ''}`}
              onClick={() => setCurrentView('cue')}
            >
              CUE
            </span>
          </div>
          <button className="settings-menu-btn" onClick={() => setShowSettings(true)} title="Settings">
            ⋮
          </button>
        </div>
      </header>

      {currentView === 'cue' ? (
        <CueView
          recorders={state.recorders}
        />
      ) : currentView === 'play' ? (
        <PlaybackView
          recorders={state.recorders}
          selectedRecorder={selectedRecorder}
          onSelectRecorder={setSelectedRecorder}
          onAddRecorder={handleAddRecorder}
          onRemoveRecorder={handleRemoveRecorder}
          onUpdateRecorder={handleUpdateRecorder}
          currentTakes={state.currentTakes}
          showName={state.showName || ''}
          dateFormat={state.dateFormat}
          oscTriggered={oscTriggered}
        />
      ) : (
        <>
          <section className="show-name-section">
        <div className="config-row">
          <label htmlFor="show-name">Show Name:</label>
          <input
            id="show-name"
            type="text"
            value={state.showName || ''}
            onChange={(e) => handleSetShowName(e.target.value)}
            placeholder="Enter show name..."
          />
        </div>
        <div className="config-row">
          <label htmlFor="date-format">Date Format:</label>
          <select
            id="date-format"
            value={state.dateFormat || 'YYYYMMDD'}
            onChange={(e) => handleSetDateFormat(e.target.value as DateFormat)}
          >
            {dateFormatOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <main className="app-main">
        <section className="recorder-section">
          <h2>Recorders</h2>
          <RecorderList
            recorders={state.recorders}
            selectedRecorder={selectedRecorder}
            onSelectRecorder={setSelectedRecorder}
            hideActions={true}
          />
        </section>

        {currentRecorder && (
          <section className="take-section">
            <h2>Take Name - {currentRecorder.name}</h2>
            <div className="take-section-header">
              <div className="header-controls">
                <div className="number-control">
                  <label htmlFor="shot-number">Shot #:</label>
                  <div className="number-input-group">
                    <button onClick={() => handleSetRecorderShotNumber(currentRecorder.id, Math.max(1, (currentRecorder.shotNumber || 1) - 1))}>−</button>
                    <input
                      id="shot-number"
                      type="number"
                      min="1"
                      value={currentRecorder.shotNumber || 1}
                      onChange={(e) => handleSetRecorderShotNumber(currentRecorder.id, Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button onClick={() => handleIncrementRecorderShot(currentRecorder.id)}>+</button>
                  </div>
                </div>
                <div className="number-control">
                  <label htmlFor="take-number">Take #:</label>
                  <div className="number-input-group">
                    <button onClick={() => handleSetRecorderTakeNumber(currentRecorder.id, Math.max(1, (currentRecorder.takeNumber || 1) - 1))}>−</button>
                    <input
                      id="take-number"
                      type="number"
                      min="1"
                      value={currentRecorder.takeNumber || 1}
                      onChange={(e) => handleSetRecorderTakeNumber(currentRecorder.id, Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button onClick={() => handleIncrementRecorderTake(currentRecorder.id)}>+</button>
                  </div>
                </div>
                {customTextState && (
                  <div className="custom-text-control">
                    <label htmlFor="custom-text">Text:</label>
                    <input
                      id="custom-text"
                      type="text"
                      className="custom-text-field"
                      placeholder="Enter custom text..."
                      value={currentRecorder.customText || ''}
                      onChange={(e) => {
                        handleSetRecorderCustomText(currentRecorder.id, e.target.value)
                        customTextState.setCustomText(e.target.value)
                      }}
                      disabled={!customTextState.includeCustom}
                      style={{ opacity: customTextState.includeCustom ? 1 : 0.5 }}
                    />
                  </div>
                )}
              </div>
            </div>
            <TakeInput
              recorderId={currentRecorder.id}
              currentTake={state.currentTakes[selectedRecorder || ''] || ''}
              history={state.takeHistory.filter(t => !t.recorderId || t.recorderId === selectedRecorder)}
              templates={state.templates}
              predefinedTakes={state.predefinedTakes}
              onSetTakeName={handleSetTakeName}
              onSetAllTakes={handleSetAllTakes}
              showName={state.showName}
              dateFormat={state.dateFormat}
              shotNumber={currentRecorder.shotNumber}
              takeNumber={currentRecorder.takeNumber}
              onIncrementTake={() => handleIncrementRecorderTake(currentRecorder.id)}
              selectedTemplate={currentRecorder.selectedTemplate || '1'}
              onTemplateChange={(templateId: string) => {
                handleUpdateRecorder({ ...currentRecorder, selectedTemplate: templateId })
              }}
              customText={currentRecorder.customText || ''}
              onCustomTextStateChange={handleCustomTextStateChange}
              oscTriggered={oscTriggered !== null && (oscTriggered.recorderId === 'all' || oscTriggered.recorderId === currentRecorder.id)}
              includeShow={currentRecorder.includeShow}
              includeDate={currentRecorder.includeDate}
              includeShotTake={currentRecorder.includeShotTake}
              includeCustom={currentRecorder.includeCustom}
            />
          </section>
        )}
      </main>
        </>
      )}

      {showSettings && (
        <Settings
          oscSettings={state.oscSettings || {
            enabled: true,
            sendHost: '127.0.0.1',
            companionPort: 8014,
            listenerPort: 8012,
            listenerEnabled: true
          }}
          cmndSettings={state.cmndSettings || {
            enabled: false,
            hubUrl: 'ws://localhost:5000/ws'
          }}
          onSave={handleSaveOscSettings}
          onSaveCmnd={handleSaveCmndSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
