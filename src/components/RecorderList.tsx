import { useState } from 'react'
import { Recorder, RecorderFormat } from '@shared/types'
import './RecorderList.css'

interface RecorderListProps {
  recorders: Recorder[]
  selectedRecorder: string | null
  onSelectRecorder: (recorderId: string) => void
  onAddRecorder?: (recorder: Recorder) => void
  onRemoveRecorder?: (recorderId: string) => void
  onUpdateRecorder?: (recorder: Recorder) => void
  hideActions?: boolean
}

export default function RecorderList({
  recorders,
  selectedRecorder,
  onSelectRecorder,
  onAddRecorder,
  onRemoveRecorder,
  onUpdateRecorder,
  hideActions = false
}: RecorderListProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRecorder, setEditingRecorder] = useState<string | null>(null)
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
    oscPort: ''
  })

  function handleAdd() {
    if (!newRecorder.name.trim() || !newRecorder.ipAddress.trim()) return
    if (!onAddRecorder) return

    const recorder: Recorder = {
      id: Date.now().toString(),
      name: newRecorder.name,
      ipAddress: newRecorder.ipAddress,
      format: {
        type: newRecorder.formatType,
        template: newRecorder.formatType === 'broadcast'
          ? '{showName} - {date}'
          : 'Scene {scene} - Take {take}'
      },
      enabled: true,
      oscHost: newRecorder.oscHost || '127.0.0.1',
      oscPort: parseInt(newRecorder.oscPort) || 8013
    }

    onAddRecorder(recorder)
    setNewRecorder({ name: '', ipAddress: '', formatType: 'broadcast', oscHost: '127.0.0.1', oscPort: '8013' })
    setShowAddForm(false)
  }

  function handleEdit(recorder: Recorder) {
    setEditingRecorder(recorder.id)
    setEditForm({
      name: recorder.name,
      ipAddress: recorder.ipAddress,
      oscHost: recorder.oscHost || '127.0.0.1',
      oscPort: (recorder.oscPort || 8013).toString()
    })
  }

  function handleSaveEdit(recorder: Recorder) {
    if (!editForm.name.trim() || !editForm.ipAddress.trim()) return
    if (!onUpdateRecorder) return

    const updatedRecorder: Recorder = {
      ...recorder,
      name: editForm.name.trim(),
      ipAddress: editForm.ipAddress.trim(),
      oscHost: editForm.oscHost.trim() || '127.0.0.1',
      oscPort: parseInt(editForm.oscPort) || 8013
    }

    onUpdateRecorder(updatedRecorder)
    setEditingRecorder(null)
  }

  function handleCancelEdit() {
    setEditingRecorder(null)
    setEditForm({ name: '', ipAddress: '', oscHost: '', oscPort: '' })
  }

  return (
    <div className="recorder-list">
      <div className="recorder-items">
        {recorders.map(recorder => (
          editingRecorder === recorder.id ? (
            <div key={recorder.id} className="recorder-item editing">
              <div className="status-indicator">
                <div 
                  className={`status-dot ${recorder.online ? 'online' : 'offline'}`}
                  title={recorder.online ? 'Online' : 'Offline'}
                />
              </div>
              <div className="recorder-edit-form">
                <input
                  type="text"
                  placeholder="Recorder name"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  placeholder="IP Address (HyperDeck)"
                  value={editForm.ipAddress}
                  onChange={e => setEditForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  placeholder="OSC Host (Companion)"
                  value={editForm.oscHost}
                  onChange={e => setEditForm(prev => ({ ...prev, oscHost: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  placeholder="OSC Port"
                  value={editForm.oscPort}
                  onChange={e => setEditForm(prev => ({ ...prev, oscPort: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="edit-actions">
                  <button 
                    className="save-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveEdit(recorder)
                    }}
                    title="Save"
                  >
                    ✓
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelEdit()
                    }}
                    title="Cancel"
                  >
                    ✕
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onRemoveRecorder && confirm(`Remove recorder "${recorder.name}"?`)) {
                        onRemoveRecorder(recorder.id)
                        setEditingRecorder(null)
                      }
                    }}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={recorder.id}
              className={`recorder-item ${recorder.id === selectedRecorder ? 'selected' : ''}`}
              onClick={() => onSelectRecorder(recorder.id)}
            >
              <div className="status-indicator">
                <div 
                  className={`status-dot ${recorder.online ? 'online' : 'offline'}`}
                  title={recorder.online ? 'Online' : 'Offline'}
                />
              </div>
              <div className="recorder-info">
                <div className="recorder-name">{recorder.name}</div>
                <div className="recorder-ip">{recorder.ipAddress}</div>
              </div>
              {!hideActions && (
                <button
                  className="recorder-edit"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(recorder)
                  }}
                  title="Edit"
                >
                  ⋯
                </button>
              )}
            </div>
          )
        ))}
      </div>

      {!hideActions && (
        showAddForm ? (
          <div className="add-recorder-form">
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
        ) : (
          <button className="add-recorder-btn" onClick={() => setShowAddForm(true)}>
            + Add Recorder
          </button>
        )
      )}
    </div>
  )
}
