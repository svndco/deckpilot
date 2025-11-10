import { useState } from 'react'
import { Recorder, RecorderFormat } from '@shared/types'
import './MonitorView.css'

interface MonitorViewProps {
  recorders: Recorder[]
  currentTakes: Record<string, string>
  selectedRecorder: string | null
  onSelectRecorder: (recorderId: string) => void
  onAddRecorder: (recorder: Recorder) => void
  onRemoveRecorder: (recorderId: string) => void
  onUpdateRecorder: (recorder: Recorder) => void
  oscTriggered?: {recorderId: string, timestamp: number} | null
  showName?: string
  dateFormat?: string
}

function generateNextTake(recorder: Recorder, showName?: string): string {
  let parts: string[] = []

  if (showName) parts.push(showName)

  // Add date if needed (simplified, actual date would come from system)
  // For now, just show placeholder

  if (recorder.shotNumber !== undefined) {
    parts.push(`S${recorder.shotNumber.toString().padStart(2, '0')}`)
  }

  if (recorder.customText) {
    parts.push(recorder.customText)
  }

  if (recorder.takeNumber !== undefined) {
    parts.push(`T${recorder.takeNumber.toString().padStart(2, '0')}`)
  }

  return parts.join('_') || 'No preview'
}

export default function MonitorView({
  recorders,
  currentTakes,
  onAddRecorder,
  onRemoveRecorder,
  onUpdateRecorder,
  oscTriggered,
  showName
}: MonitorViewProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRecorder, setEditingRecorder] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [newRecorder, setNewRecorder] = useState({
    name: '',
    ipAddress: '',
    formatType: 'broadcast' as RecorderFormat['type'],
    oscHost: '127.0.0.1',
    oscPort: '8013'
  })
  const [editForm, setEditForm] = useState({
    name: '',
    ipAddress: '',
    oscHost: '',
    oscPort: '',
    recordingQuality: ''
  })

  function handleAdd() {
    if (newRecorder.name && newRecorder.ipAddress) {
      const recorder: Recorder = {
        id: Date.now().toString(),
        name: newRecorder.name,
        ipAddress: newRecorder.ipAddress,
        format: {
          type: newRecorder.formatType,
          template: ''
        },
        enabled: true,
        shotNumber: 1,
        takeNumber: 1,
        oscHost: newRecorder.oscHost,
        oscPort: parseInt(newRecorder.oscPort)
      }
      onAddRecorder(recorder)
      setNewRecorder({ name: '', ipAddress: '', formatType: 'broadcast', oscHost: '127.0.0.1', oscPort: '8013' })
      setShowAddForm(false)
    }
  }

  function handleEdit(recorder: Recorder) {
    setEditingRecorder(recorder.id)
    setEditForm({
      name: recorder.name,
      ipAddress: recorder.ipAddress,
      oscHost: recorder.oscHost || '127.0.0.1',
      oscPort: (recorder.oscPort || 8013).toString(),
      recordingQuality: recorder.recordingQuality || 'ProRes422HQ'
    })
    setDropdownOpen(null)
    setShowAddForm(false) // Close add form if open
  }

  function handleSaveEdit() {
    const recorder = recorders.find(r => r.id === editingRecorder)
    if (!recorder || !editForm.name.trim() || !editForm.ipAddress.trim()) return

    const updatedRecorder: Recorder = {
      ...recorder,
      name: editForm.name.trim(),
      ipAddress: editForm.ipAddress.trim(),
      oscHost: editForm.oscHost.trim() || '127.0.0.1',
      oscPort: parseInt(editForm.oscPort) || 8013,
      recordingQuality: editForm.recordingQuality || 'ProRes422HQ'
    }

    onUpdateRecorder(updatedRecorder)
    setEditingRecorder(null)
  }

  function handleCancelEdit() {
    setEditingRecorder(null)
    setEditForm({ name: '', ipAddress: '', oscHost: '', oscPort: '', recordingQuality: '' })
  }

  return (
    <div className="monitor-view">
      <div className="monitor-header">
        <div>
          <h2>Monitor</h2>
          <p className="monitor-description">View all recorders and their current take names</p>
        </div>
        <button
          className="monitor-add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add Recorder"
        >
          {showAddForm ? '×' : '+'}
        </button>
      </div>

      {showAddForm && (
        <div className="monitor-add-form">
          <h3 style={{ margin: '0 0 12px 0', color: '#ffffff' }}>Add Recorder</h3>
          <input
            type="text"
            placeholder="Recorder name"
            value={newRecorder.name}
            onChange={e => setNewRecorder(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="text"
            placeholder="IP Address (HyperDeck)"
            value={newRecorder.ipAddress}
            onChange={e => setNewRecorder(prev => ({ ...prev, ipAddress: e.target.value }))}
          />
          <input
            type="text"
            placeholder="OSC Host (Companion)"
            value={newRecorder.oscHost}
            onChange={e => setNewRecorder(prev => ({ ...prev, oscHost: e.target.value }))}
          />
          <input
            type="text"
            placeholder="OSC Port"
            value={newRecorder.oscPort}
            onChange={e => setNewRecorder(prev => ({ ...prev, oscPort: e.target.value }))}
          />
          <select
            value={newRecorder.formatType}
            onChange={e => setNewRecorder(prev => ({ ...prev, formatType: e.target.value as RecorderFormat['type'] }))}
          >
            <option value="broadcast">Broadcast</option>
            <option value="take-based">Take-Based</option>
            <option value="custom">Custom</option>
          </select>
          <div className="form-actions">
            <button onClick={handleAdd}>Add</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {editingRecorder && (
        <div className="monitor-add-form">
          <h3 style={{ margin: '0 0 12px 0', color: '#ffffff' }}>Edit Recorder</h3>
          <div className="input-with-label">
            <span className="input-label">Name:</span>
            <input
              type="text"
              placeholder="Recorder name"
              value={editForm.name}
              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="input-with-label">
            <span className="input-label">OSC Client:</span>
            <div className="osc-client-inputs">
              <input
                type="text"
                placeholder="IP Address"
                value={editForm.ipAddress}
                onChange={e => setEditForm(prev => ({ ...prev, ipAddress: e.target.value }))}
              />
              <span className="osc-separator">:</span>
              <input
                type="text"
                placeholder="Port"
                value={editForm.oscPort}
                onChange={e => setEditForm(prev => ({ ...prev, oscPort: e.target.value }))}
              />
            </div>
          </div>
          <div className="input-with-label">
            <span className="input-label">OSC Host:</span>
            <input
              type="text"
              placeholder="OSC Host (Companion)"
              value={editForm.oscHost}
              onChange={e => setEditForm(prev => ({ ...prev, oscHost: e.target.value }))}
            />
          </div>
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
      )}

      <div className="monitor-grid">
        {recorders.map(recorder => {
          const nextTake = generateNextTake(recorder, showName)
          const statusBorderClass = recorder.transportStatus ? `status-border-${recorder.transportStatus}` : ''

          return (
          <div key={recorder.id} className={`monitor-card ${statusBorderClass}`}>
              <div className="monitor-card-header">
                <div className="monitor-card-title">
                  <span className={`status-indicator ${recorder.online ? 'online' : 'offline'}`}>
                    {recorder.online ? '●' : '○'}
                  </span>
                  <h3>{recorder.name}</h3>
                </div>
                <div className="monitor-card-actions">
                  <button
                    className="monitor-card-menu"
                    onClick={() => setDropdownOpen(dropdownOpen === recorder.id ? null : recorder.id)}
                    title="Options"
                  >
                    ⋯
                  </button>
                  {dropdownOpen === recorder.id && (
                    <div className="monitor-card-dropdown">
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

              <div className="monitor-card-body">
              <div className="monitor-info-row">
                <span className="monitor-label">IP Address:</span>
                <span className="monitor-value">{recorder.ipAddress}</span>
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Timecode:</span>
                <span className="monitor-value" style={{ fontFamily: 'monospace' }}>
                  {recorder.timecode || '--:--:--:--'}
                </span>
              </div>

              <div className="monitor-info-row monitor-take-row">
                <span className="monitor-label">Current Take:</span>
                <span className="monitor-value take-name">
                  {currentTakes[recorder.id] || 'No take set'}
                </span>
                {oscTriggered && (oscTriggered.recorderId === 'all' || oscTriggered.recorderId === recorder.id) && (
                  <div className="monitor-osc-flash" />
                )}
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Next Take:</span>
                <span className="monitor-value" style={{ color: '#ffa500', fontWeight: '600' }}>
                  {nextTake}
                </span>
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Shot #:</span>
                <span className="monitor-value">{recorder.shotNumber || '-'}</span>
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Take #:</span>
                <span className="monitor-value">{recorder.takeNumber || '-'}</span>
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Custom Text:</span>
                <span className="monitor-value">{recorder.customText || '-'}</span>
              </div>

              <div className="monitor-info-row">
                <span className="monitor-label">Codec:</span>
                <span className="monitor-value">{recorder.recordingQuality || 'Not Set'}</span>
              </div>
            </div>

            <div className="monitor-card-footer">
              <div className="monitor-osc-info">
                <span>OSC: {recorder.oscHost}:{recorder.oscPort}</span>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {recorders.length === 0 && (
        <div className="monitor-empty">
          <p>No recorders configured</p>
          <p className="monitor-empty-hint">Switch to TAKE CONTROL to add recorders</p>
        </div>
      )}
    </div>
  )
}
