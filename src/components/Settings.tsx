import { useState } from 'react'
import { OscSettings, CmndSettings } from '@shared/types'
import './Settings.css'

interface SettingsProps {
  oscSettings: OscSettings
  cmndSettings?: CmndSettings
  onSave: (settings: OscSettings) => void
  onSaveCmnd: (settings: CmndSettings) => void
  onClose: () => void
}

export default function Settings({ oscSettings, cmndSettings, onSave, onSaveCmnd, onClose }: SettingsProps) {
  // OSC settings
  const [enabled, setEnabled] = useState(oscSettings.enabled)
  const [sendHost, setSendHost] = useState(oscSettings.sendHost || '127.0.0.1')
  const [companionPort, setCompanionPort] = useState(oscSettings.companionPort || 8014)
  const [listenerEnabled, setListenerEnabled] = useState(oscSettings.listenerEnabled !== false)
  const [listenerHost, setListenerHost] = useState(oscSettings.listenerHost || '0.0.0.0')
  const [listenerPort, setListenerPort] = useState(oscSettings.listenerPort || 8012)

  // cmnd settings
  const [cmndEnabled, setCmndEnabled] = useState(cmndSettings?.enabled || false)
  const [hubUrl, setHubUrl] = useState(cmndSettings?.hubUrl || 'ws://localhost:5000/ws')
  const [nodeId, setNodeId] = useState(cmndSettings?.nodeId || '')
  const [showId, setShowId] = useState(cmndSettings?.showId || '')

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function handleSave() {
    const oscSettingsData: OscSettings = {
      enabled,
      sendHost,
      companionPort,
      listenerEnabled,
      listenerHost,
      listenerPort
    }

    const cmndSettingsData: CmndSettings = {
      enabled: cmndEnabled,
      hubUrl,
      nodeId: nodeId || undefined,
      showId: showId || undefined
    }

    console.log('Settings component - calling onSave with:', oscSettingsData, cmndSettingsData)
    onSave(oscSettingsData)
    onSaveCmnd(cmndSettingsData)
    onClose()
  }

  async function handleExport() {
    setStatusMessage(null)
    const result = await window.electronAPI.exportShow()
    if (result.success) {
      setStatusMessage({ type: 'success', message: `Show exported successfully to ${result.filePath}` })
    } else {
      setStatusMessage({ type: 'error', message: result.message || 'Export failed' })
    }
  }

  async function handleImport() {
    setStatusMessage(null)
    const result = await window.electronAPI.importShow()
    if (result.success) {
      setStatusMessage({ type: 'success', message: `Show imported successfully from ${result.filePath}` })
      // Close settings after import to show the new state
      setTimeout(() => {
        onClose()
      }, 2000)
    } else {
      setStatusMessage({ type: 'error', message: result.message || 'Import failed' })
    }
  }

  async function handleNewShow() {
    if (confirm('Create a new show? This will clear all current recorders, takes, and history.')) {
      setStatusMessage(null)
      const result = await window.electronAPI.newShow()
      if (result.success) {
        setStatusMessage({ type: 'success', message: 'New show created successfully' })
        // Close settings after a short delay to show the new state
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setStatusMessage({ type: 'error', message: result.message || 'New show creation failed' })
      }
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <h3>OSC Configuration</h3>
          
          <div className="setting-row">
            <label>
              <input 
                type="checkbox" 
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enable OSC
            </label>
          </div>

          <div className="setting-row">
            <div className="input-with-inline-label">
              <span className="inline-label">Companion Module:</span>
              <div className="osc-client-inputs">
                <input 
                  type="text" 
                  value={sendHost}
                  onChange={(e) => setSendHost(e.target.value)}
                  placeholder="127.0.0.1"
                  disabled={!enabled}
                  className="inline-input"
                />
                <span className="osc-separator">:</span>
                <input 
                  type="number"
                  value={companionPort}
                  onChange={(e) => setCompanionPort(parseInt(e.target.value) || 8014)}
                  placeholder="8014"
                  disabled={!enabled}
                  min="1024"
                  max="65535"
                  className="inline-input-port"
                />
              </div>
            </div>
            <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
              Single port for sending all recorder updates to Companion module (one module instance handles all recorders)
            </small>
          </div>

          <hr style={{ margin: '20px 0', borderColor: '#444' }} />
          
          <h3>OSC Listener (Incoming Commands)</h3>
          
          <div className="setting-row">
            <label>
              <input 
                type="checkbox" 
                checked={listenerEnabled}
                onChange={(e) => setListenerEnabled(e.target.checked)}
              />
              Enable OSC Listener
            </label>
          </div>

          <div className="setting-row">
            <div className="input-with-inline-label">
              <span className="inline-label">Listener Address:</span>
              <div className="osc-client-inputs">
                <input 
                  type="text" 
                  value={listenerHost}
                  onChange={(e) => setListenerHost(e.target.value)}
                  placeholder="0.0.0.0"
                  disabled={!listenerEnabled}
                  className="inline-input"
                />
                <span className="osc-separator">:</span>
                <input 
                  type="number"
                  value={listenerPort}
                  onChange={(e) => setListenerPort(parseInt(e.target.value) || 8012)}
                  placeholder="8012"
                  disabled={!listenerEnabled}
                  min="1024"
                  max="65535"
                  className="inline-input-port"
                />
              </div>
            </div>
            <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
              Address and port for DeckPilot to receive OSC commands from Companion (0.0.0.0 = all interfaces)
            </small>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#1e1e1e',
            border: '1px solid #3d3d3d',
            borderRadius: '4px'
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#b0b0b0' }}>Supported OSC Commands</h4>
            <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '4px' }}>
                <code style={{ color: '#4ec9b0', background: '#252525', padding: '1px 4px', borderRadius: '2px', fontSize: '9px' }}>
                  /deckpilot/&#123;recorderId&#125;/setTake
                </code> — Set take for specific recorder
              </div>
              <div style={{ marginBottom: '4px' }}>
                <code style={{ color: '#4ec9b0', background: '#252525', padding: '1px 4px', borderRadius: '2px', fontSize: '9px' }}>
                  /deckpilot/all/setAll
                </code> — Set takes for all recorders
              </div>
              <div style={{ marginTop: '6px', fontSize: '9px', color: '#666' }}>
                Note: Use underscores for hyphens (HYPER-41 → HYPER_41)
              </div>
            </div>
          </div>

          <hr style={{ margin: '20px 0', borderColor: '#444' }} />

          <h3>cmnd Integration</h3>

          <div className="setting-row">
            <label>
              <input
                type="checkbox"
                checked={cmndEnabled}
                onChange={(e) => setCmndEnabled(e.target.checked)}
              />
              Enable cmnd Integration
            </label>
            <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
              Connect DeckPilot to cmndHub for centralized monitoring and control
            </small>
          </div>

          <div className="setting-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div>
                <label style={{ color: '#b0b0b0', fontSize: '12px' }}>Hub WebSocket URL</label>
                <input
                  type="text"
                  value={hubUrl}
                  onChange={(e) => setHubUrl(e.target.value)}
                  placeholder="ws://localhost:5000/ws"
                  disabled={!cmndEnabled}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: cmndEnabled ? '#2d2d2d' : '#1a1a1a',
                    border: '1px solid #3d3d3d',
                    borderRadius: '4px',
                    color: cmndEnabled ? '#fff' : '#666',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#b0b0b0', fontSize: '12px' }}>Node ID (optional)</label>
                <input
                  type="text"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  placeholder="Auto-generated if empty"
                  disabled={!cmndEnabled}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: cmndEnabled ? '#2d2d2d' : '#1a1a1a',
                    border: '1px solid #3d3d3d',
                    borderRadius: '4px',
                    color: cmndEnabled ? '#fff' : '#666',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#b0b0b0', fontSize: '12px' }}>Show ID (optional)</label>
                <input
                  type="text"
                  value={showId}
                  onChange={(e) => setShowId(e.target.value)}
                  placeholder="Link to cmndHub show"
                  disabled={!cmndEnabled}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: cmndEnabled ? '#2d2d2d' : '#1a1a1a',
                    border: '1px solid #3d3d3d',
                    borderRadius: '4px',
                    color: cmndEnabled ? '#fff' : '#666',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: '#1e1e1e',
            border: '1px solid #3d3d3d',
            borderRadius: '4px'
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#b0b0b0' }}>Supported Commands from cmndHub</h4>
            <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.6' }}>
              <div><code style={{ color: '#4ec9b0' }}>set_take_name</code> — Update recorder take name</div>
              <div><code style={{ color: '#4ec9b0' }}>start_recording</code> — Start recording on recorder</div>
              <div><code style={{ color: '#4ec9b0' }}>stop_recording</code> — Stop recording on recorder</div>
              <div><code style={{ color: '#4ec9b0' }}>increment_take</code> — Increment take number</div>
              <div><code style={{ color: '#4ec9b0' }}>increment_shot</code> — Increment shot number</div>
              <div><code style={{ color: '#4ec9b0' }}>get_recorders</code> — Get all recorders status</div>
              <div><code style={{ color: '#4ec9b0' }}>get_status</code> — Get DeckPilot status</div>
            </div>
          </div>

          <hr style={{ margin: '20px 0', borderColor: '#444' }} />

          <h3>Show File Management</h3>
          
          <div className="setting-row">
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                onClick={handleNewShow}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#7a2d7a',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                New Show
              </button>
              <button 
                onClick={handleExport}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#0078d4',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Export Show
              </button>
              <button 
                onClick={handleImport}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#16825d',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Import Show
              </button>
            </div>
          </div>

          {statusMessage && (
            <div style={{
              padding: '10px',
              marginTop: '10px',
              background: statusMessage.type === 'success' ? '#1e4d2b' : '#4d1e1e',
              border: `1px solid ${statusMessage.type === 'success' ? '#2d7a44' : '#7a2d2d'}`,
              borderRadius: '4px',
              fontSize: '12px',
              color: statusMessage.type === 'success' ? '#90ee90' : '#ff6b6b'
            }}>
              {statusMessage.message}
            </div>
          )}

          <small style={{ color: '#888', marginTop: '8px', display: 'block' }}>
            New Show clears all data and starts fresh. Export saves all show data. Import restores a previously saved show file.
          </small>
          
          <hr style={{ margin: '20px 0', borderColor: '#444' }} />
          
          <h3>About</h3>
          
          <div style={{
            padding: '16px',
            background: '#1e1e1e',
            border: '1px solid #3d3d3d',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
              Deck Pilot v.002
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              Take Management for HyperDeck
            </div>
            <div style={{ fontSize: '12px', color: '#b0b0b0', lineHeight: '1.6' }}>
              Made by <span style={{ color: '#0078d4', fontWeight: '600' }}>SVND.co</span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Written by Jeremy Allen
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '12px' }}>
              © 2024 SVND.co. All rights reserved.
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
