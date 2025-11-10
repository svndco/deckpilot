import { Recorder } from '@shared/types'
import { useState, useEffect } from 'react'
import './PlaybackView.css'

interface PlaybackViewProps {
  recorders: Recorder[]
  selectedRecorder: string | null
  onSelectRecorder: (recorderId: string) => void
  onAddRecorder: (recorder: Recorder) => void
  onRemoveRecorder: (recorderId: string) => void
  onUpdateRecorder: (recorder: Recorder) => void
  currentTakes: Record<string, string>
  showName: string
  dateFormat: any
  oscTriggered?: { recorderId: string; timestamp: number } | null
}

export default function PlaybackView({
  recorders,
  onAddRecorder,
  onRemoveRecorder,
  onUpdateRecorder,
  currentTakes,
  showName,
  oscTriggered
}: PlaybackViewProps) {
  const [editingTimecode, setEditingTimecode] = useState<string | null>(null)
  const [timecodeInput, setTimecodeInput] = useState<string>('')
  const [selectedClips, setSelectedClips] = useState<Record<string, number>>({})
  const [inputSources, setInputSources] = useState<Record<string, string>>({})
  const [zoom, setZoom] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [editingRecorder, setEditingRecorder] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({
    name: '',
    ipAddress: '',
    recordingQuality: 'ProRes422HQ',
    selectedTemplate: '2'
  })
  const [editForm, setEditForm] = useState({
    name: '',
    ipAddress: '',
    recordingQuality: 'ProRes422HQ'
  })

  // Load clips for online recorders
  useEffect(() => {
    recorders.forEach(recorder => {
      if (recorder.online && (!recorder.clips || recorder.clips.length === 0)) {
        window.electronAPI.getClips(recorder.id)
      }
    })
  }, [recorders])

  const handleTimecodeClick = (recorderId: string, currentTimecode: string) => {
    setEditingTimecode(recorderId)
    setTimecodeInput(currentTimecode)
  }

  const handleTimecodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimecodeInput(e.target.value)
  }

  const handleTimecodeSubmit = async (recorderId: string) => {
    const result = await window.electronAPI.gotoTimecode(recorderId, timecodeInput)
    if (result.success) {
      console.log('Timecode jog successful:', timecodeInput)
    } else {
      console.error('Failed to jog to timecode:', result.message)
    }
    setEditingTimecode(null)
  }

  const handleTimecodeBlur = (recorderId: string) => {
    if (timecodeInput.match(/^\d{2}:\d{2}:\d{2}:\d{2}$/)) {
      handleTimecodeSubmit(recorderId)
    } else {
      setEditingTimecode(null)
    }
  }

  const handleTimecodeKeyDown = (e: React.KeyboardEvent, recorderId: string) => {
    if (e.key === 'Enter') {
      handleTimecodeSubmit(recorderId)
    } else if (e.key === 'Escape') {
      setEditingTimecode(null)
    }
  }

  const handleClipChange = async (recorderId: string, clipId: number) => {
    setSelectedClips({ ...selectedClips, [recorderId]: clipId })
    if (clipId > 0) {
      const result = await window.electronAPI.gotoClip(recorderId, clipId)
      if (result.success) {
        console.log(`Goto clip ${clipId} successful`)
      } else {
        console.error('Failed to goto clip:', result.message)
      }
    }
  }

  const handlePlay = async (recorderId: string) => {
    const result = await window.electronAPI.transportPlay(recorderId)
    if (!result.success) {
      console.error('Failed to play:', result.message)
    }
  }

  const handleStop = async (recorderId: string) => {
    const result = await window.electronAPI.transportStop(recorderId)
    if (!result.success) {
      console.error('Failed to stop:', result.message)
    }
  }


  const handleNext = async (recorderId: string) => {
    const result = await window.electronAPI.transportNext(recorderId)
    if (!result.success) {
      console.error('Failed to go to next clip:', result.message)
    }
  }

  const handleRecord = async (recorderId: string) => {
    // Record functionality would go here
    console.log('Record button clicked for', recorderId)
  }

  const handleToggleInput = (recorderId: string) => {
    const sources = ['SDI', 'HDMI', 'Component']
    const currentSource = inputSources[recorderId] || 'SDI'
    const currentIndex = sources.indexOf(currentSource)
    const nextIndex = (currentIndex + 1) % sources.length
    const nextSource = sources[nextIndex]
    
    setInputSources(prev => ({ ...prev, [recorderId]: nextSource }))
    
    // TODO: Send command to HyperDeck to change input
    console.log(`Changing ${recorderId} input to ${nextSource}`)
  }

  const handleAddRecorder = () => {
    const newRecorder: Recorder = {
      id: Date.now().toString(),
      name: addForm.name,
      ipAddress: addForm.ipAddress,
      format: { type: 'take-based', template: '' },
      enabled: true,
      shotNumber: 1,
      takeNumber: 1,
      recordingQuality: addForm.recordingQuality,
      selectedTemplate: addForm.selectedTemplate
    }
    onAddRecorder(newRecorder)
    setAddForm({
      name: '',
      ipAddress: '',
      recordingQuality: 'ProRes422HQ',
      selectedTemplate: '2'
    })
    setShowAddForm(false)
  }

  const handleEdit = (recorder: Recorder) => {
    setEditingRecorder(recorder.id)
    setEditForm({
      name: recorder.name,
      ipAddress: recorder.ipAddress,
      recordingQuality: recorder.recordingQuality || 'ProRes422HQ'
    })
    setDropdownOpen(null)
  }

  const handleSaveEdit = () => {
    if (!editingRecorder) return
    const recorder = recorders.find(r => r.id === editingRecorder)
    if (recorder) {
      onUpdateRecorder({
        ...recorder,
        name: editForm.name,
        ipAddress: editForm.ipAddress,
        recordingQuality: editForm.recordingQuality
      })
    }
    setEditingRecorder(null)
  }

  const handleCancelEdit = () => {
    setEditingRecorder(null)
  }

  const generateNextTake = (recorder: Recorder, showName: string): string => {
    const template = recorder.selectedTemplate || '1'
    let parts: string[] = []

    if (template === '1') {
      // Show template
      if (showName) parts.push(showName)
      // Date would be current date (not shown in preview)
    } else if (template === '2') {
      // Take template
      if (showName) parts.push(showName)
      // Date would be current date (not shown in preview)
      if (recorder.shotNumber !== undefined) {
        parts.push(`S${String(recorder.shotNumber).padStart(2, '0')}`)
      }
      if (recorder.customText) {
        parts.push(recorder.customText)
      }
      if (recorder.takeNumber !== undefined) {
        parts.push(`T${String(recorder.takeNumber).padStart(2, '0')}`)
      }
    } else if (template === '3') {
      // Custom template
      if (recorder.customText) {
        parts.push(recorder.customText)
      }
    }

    return parts.join('_') || 'TAKE'
  }

  return (
    <div className="playback-view">
      <div className="playback-header">
        <div>
          <h2>Playback Control</h2>
          <p className="playback-description">Control playback on your HyperDeck recorders</p>
        </div>
        <button
          className="playback-add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add Recorder"
        >
          {showAddForm ? '×' : '+'}
        </button>
      </div>

      {showAddForm && (
        <div className="playback-add-form">
          <input
            type="text"
            placeholder="Recorder Name (e.g., HYPER-41)"
            value={addForm.name}
            onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="text"
            placeholder="HyperDeck IP Address"
            value={addForm.ipAddress}
            onChange={e => setAddForm(prev => ({ ...prev, ipAddress: e.target.value }))}
          />
          <div className="input-with-label">
            <span className="input-label">Codec:</span>
            <select
              value={addForm.recordingQuality}
              onChange={e => setAddForm(prev => ({ ...prev, recordingQuality: e.target.value }))}
            >
              <option value="ProRes422HQ">ProRes 422 HQ</option>
              <option value="ProRes422">ProRes 422</option>
              <option value="ProRes422LT">ProRes 422 LT</option>
              <option value="ProRes422Proxy">ProRes 422 Proxy</option>
              <option value="DNxHD220">DNxHD 220</option>
              <option value="DNxHD145">DNxHD 145</option>
              <option value="DNxHD45">DNxHD 45</option>
            </select>
          </div>
          <div className="form-actions">
            <button onClick={handleAddRecorder} disabled={!addForm.name || !addForm.ipAddress}>Add Recorder</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="playback-grid" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {recorders.map(recorder => (
          <div key={recorder.id} className="player-card">
            <div className="player-header">
              <div className="player-title">
                <span className={`status-indicator ${recorder.online ? 'online' : 'offline'}`}>
                  {recorder.online ? '●' : '○'}
                </span>
                <h3>{recorder.name}</h3>
              </div>
              <div className="player-actions">
                <button
                  className="player-menu"
                  onClick={() => setDropdownOpen(dropdownOpen === recorder.id ? null : recorder.id)}
                  title="Options"
                >
                  ⋯
                </button>
                {dropdownOpen === recorder.id && (
                  <div className="player-dropdown">
                    <button onClick={() => handleEdit(recorder)}>
                      Edit
                    </button>
                    <button onClick={() => {
                      if (confirm(`Remove recorder "${recorder.name}"?`)) {
                        onRemoveRecorder(recorder.id)
                        setDropdownOpen(null)
                      }
                    }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {editingRecorder === recorder.id ? (
              <div className="player-edit-form">
                <input
                  type="text"
                  placeholder="Recorder Name"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="IP Address"
                  value={editForm.ipAddress}
                  onChange={e => setEditForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                />
                <div className="input-with-label">
                  <span className="input-label">Codec:</span>
                  <select
                    value={editForm.recordingQuality}
                    onChange={e => setEditForm(prev => ({ ...prev, recordingQuality: e.target.value }))}
                  >
                    <option value="ProRes422HQ">ProRes 422 HQ</option>
                    <option value="ProRes422">ProRes 422</option>
                    <option value="ProRes422LT">ProRes 422 LT</option>
                    <option value="ProRes422Proxy">ProRes 422 Proxy</option>
                    <option value="DNxHD220">DNxHD 220</option>
                    <option value="DNxHD145">DNxHD 145</option>
                    <option value="DNxHD45">DNxHD 45</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button onClick={handleSaveEdit}>Save</button>
                  <button onClick={handleCancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="player-body">
              <div className="player-timecode-row">
                <div className="player-timecode">
                  <span className="timecode-label">TIMECODE</span>
                  {editingTimecode === recorder.id ? (
                    <input
                      type="text"
                      className="timecode-input"
                      value={timecodeInput}
                      onChange={handleTimecodeChange}
                      onBlur={() => handleTimecodeBlur(recorder.id)}
                      onKeyDown={(e) => handleTimecodeKeyDown(e, recorder.id)}
                      placeholder="00:00:00:00"
                      autoFocus
                      disabled={recorder.transportStatus === 'record'}
                    />
                  ) : (
                    <span
                      className="timecode-display"
                      onClick={() => recorder.transportStatus !== 'record' && handleTimecodeClick(recorder.id, recorder.timecode || '00:00:00:00')}
                      style={{ cursor: recorder.transportStatus !== 'record' ? 'pointer' : 'default' }}
                      title={recorder.transportStatus !== 'record' ? 'Click to edit' : ''}
                    >
                      {recorder.timecode || '--:--:--:--'}
                    </span>
                  )}
                </div>
                <button
                  className="input-toggle-compact"
                  onClick={() => handleToggleInput(recorder.id)}
                  disabled={!recorder.online}
                  title="Toggle input source"
                >
                  {inputSources[recorder.id] || 'SDI'}
                </button>
              </div>

              <div className="player-takes">
                <div className="take-row">
                  <span className="take-label">CLIP:</span>
                  <select
                    className="clip-select"
                    value={selectedClips[recorder.id] || 0}
                    onChange={(e) => handleClipChange(recorder.id, parseInt(e.target.value))}
                    disabled={!recorder.online}
                  >
                    <option value={0}>Select clip...</option>
                    {recorder.clips && recorder.clips.length > 0 ? (
                      recorder.clips.map(clip => (
                        <option key={clip.id} value={clip.id}>
                          {clip.id}: {clip.name} {clip.duration ? `(${clip.duration})` : ''}
                        </option>
                      ))
                    ) : (
                      <option disabled>No clips available</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="player-controls">
                <button 
                  className={`player-btn stop-btn ${recorder.transportStatus === 'stopped' ? 'active' : ''}`}
                  disabled={!recorder.online}
                  title="Stop"
                  onClick={() => handleStop(recorder.id)}
                >
                  ⏹
                </button>
                <button 
                  className={`player-btn play-btn ${recorder.transportStatus === 'play' ? 'active' : ''}`}
                  disabled={!recorder.online}
                  title={recorder.transportStatus === 'play' ? 'Pause' : 'Play'}
                  onClick={() => recorder.transportStatus === 'play' ? handleStop(recorder.id) : handlePlay(recorder.id)}
                >
                  {recorder.transportStatus === 'play' ? '⏸' : '▶'}
                </button>
                <button 
                  className="player-btn next-btn" 
                  disabled={!recorder.online}
                  title="Next Clip"
                  onClick={() => handleNext(recorder.id)}
                >
                  ⏭
                </button>
                <button 
                  className={`player-btn record-btn ${recorder.transportStatus === 'record' ? 'active' : ''}`}
                  disabled={!recorder.online}
                  title="Record"
                  onClick={() => handleRecord(recorder.id)}
                >
                  ⏺
                </button>
              </div>

              <div className="player-info">
                <div className="info-row take-row">
                  <span className="info-label">Current:</span>
                  {(oscTriggered?.recorderId === recorder.id || oscTriggered?.recorderId === 'all') && (
                    <svg className="osc-trigger-indicator" key={oscTriggered.timestamp} width="12" height="12" viewBox="0 0 12 12">
                      <circle cx="6" cy="6" r="5" fill="none" stroke="#ff0000" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="31.4" />
                    </svg>
                  )}
                  <span 
                    className="info-value take-current" 
                    data-full-text={currentTakes[recorder.id] || 'No take set'}
                    title={currentTakes[recorder.id] || 'No take set'}
                  >
                    {currentTakes[recorder.id] || 'No take set'}
                  </span>
                </div>
                <div className="info-row take-row">
                  <span className="info-label">Next:</span>
                  <span 
                    className="info-value take-next" 
                    data-full-text={generateNextTake(recorder, showName)}
                    title={generateNextTake(recorder, showName)}
                  >
                    {generateNextTake(recorder, showName)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">IP:</span>
                  <span className="info-value">{recorder.ipAddress}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Codec:</span>
                  <span className="info-value">{recorder.recordingQuality || 'Unknown'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Shot #:</span>
                  <span className="info-value">{recorder.shotNumber || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Take #:</span>
                  <span className="info-value">{recorder.takeNumber || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Custom:</span>
                  <span className="info-value">{recorder.customText || '-'}</span>
                </div>
              </div>
            </div>
            )}
          </div>
        ))}
      </div>

      {recorders.length === 0 && (
        <div className="playback-empty">
          <p>No recorders configured</p>
          <p className="empty-hint">Switch to MONITOR to add recorders</p>
        </div>
      )}

      <div className="zoom-controls">
        <button 
          className="zoom-btn"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          disabled={zoom <= 0.5}
          title="Zoom Out"
        >
          −
        </button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button 
          className="zoom-btn"
          onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
          disabled={zoom >= 1.5}
          title="Zoom In"
        >
          +
        </button>
        <button 
          className="zoom-btn reset"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
          title="Reset Zoom"
        >
          ⟲
        </button>
      </div>
    </div>
  )
}
