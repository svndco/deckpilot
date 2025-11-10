import { useState, useEffect } from 'react'
import './CueView.css'

interface Clip {
  id: number
  name: string
  duration?: string
}

interface Recorder {
  id: string
  name: string
  ipAddress: string
  online?: boolean
  clips?: Clip[]
}

interface CueEntry {
  cueNumber: number
  recorderId: string
  recorderName: string
  clip: Clip
  online: boolean
}

interface CueViewProps {
  recorders: Recorder[]
}

export default function CueView({ recorders }: CueViewProps) {
  const [cueEntries, setCueEntries] = useState<CueEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'cue' | 'name' | 'recorder' | 'duration'>('cue')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    // Aggregate all clips from all recorders and assign cue numbers
    const entries: CueEntry[] = []
    let cueNumber = 1
    recorders.forEach(recorder => {
      if (recorder.clips && recorder.clips.length > 0) {
        recorder.clips.forEach(clip => {
          entries.push({
            cueNumber: cueNumber++,
            recorderId: recorder.id,
            recorderName: recorder.name,
            clip,
            online: recorder.online || false
          })
        })
      }
    })
    setCueEntries(entries)
  }, [recorders])

  const filteredEntries = cueEntries.filter(entry => 
    entry.clip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.recorderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.cueNumber.toString().includes(searchTerm)
  )

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let compare = 0
    if (sortBy === 'cue') {
      compare = a.cueNumber - b.cueNumber
    } else if (sortBy === 'name') {
      compare = a.clip.name.localeCompare(b.clip.name)
    } else if (sortBy === 'recorder') {
      compare = a.recorderName.localeCompare(b.recorderName)
    } else if (sortBy === 'duration') {
      const aDur = a.clip.duration || ''
      const bDur = b.clip.duration || ''
      compare = aDur.localeCompare(bDur)
    }
    return sortAsc ? compare : -compare
  })

  const handleSort = (column: 'cue' | 'name' | 'recorder' | 'duration') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(column)
      setSortAsc(true)
    }
  }

  const handlePlayClip = async (recorderId: string, clipId: number) => {
    try {
      await window.electronAPI.gotoClip?.(recorderId, clipId)
      await window.electronAPI.transportPlay?.(recorderId)
    } catch (err) {
      console.error('Failed to play clip:', err)
    }
  }

  const handleStopClip = async (recorderId: string) => {
    try {
      await window.electronAPI.transportStop?.(recorderId)
    } catch (err) {
      console.error('Failed to stop clip:', err)
    }
  }

  return (
    <div className="cue-view">
      <div className="cue-header">
        <h2>Cue</h2>
        <div className="cue-stats">
          <span className="stat-item">{cueEntries.length} cues</span>
          <span className="stat-item">{recorders.length} recorders</span>
        </div>
      </div>

      <div className="cue-controls">
        <input
          type="text"
          className="cue-search"
          placeholder="Search cues, takes, or recorders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="cue-table-container">
        <table className="cue-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('cue')} className="sortable">
                Cue {sortBy === 'cue' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('name')} className="sortable">
                Clip Name {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('recorder')} className="sortable">
                Recorder {sortBy === 'recorder' && (sortAsc ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('duration')} className="sortable">
                Duration {sortBy === 'duration' && (sortAsc ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td className="cue-number-cell" style={{ opacity: 0.5 }}>-</td>
                <td className="take-name-cell" style={{ opacity: 0.5 }}>No cue available</td>
                <td>
                  <div className="recorder-cell">
                    <span className="status-dot offline" />
                    No Recorder
                  </div>
                </td>
                <td className="duration-cell">-</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn play-btn" disabled title="Play">▶</button>
                    <button className="action-btn stop-btn" disabled title="Stop">⏹</button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry, idx) => (
                <tr key={`${entry.recorderId}-${entry.clip.id}-${idx}`}>
                  <td className="cue-number-cell">{entry.cueNumber}</td>
                  <td className="take-name-cell">{entry.clip.name}</td>
                  <td>
                    <div className="recorder-cell">
                      <span className={`status-dot ${entry.online ? 'online' : 'offline'}`} />
                      {entry.recorderName}
                    </div>
                  </td>
                  <td className="duration-cell">{entry.clip.duration || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn play-btn"
                        onClick={() => handlePlayClip(entry.recorderId, entry.clip.id)}
                        disabled={!entry.online}
                        title="Play"
                      >
                        ▶
                      </button>
                      <button
                        className="action-btn stop-btn"
                        onClick={() => handleStopClip(entry.recorderId)}
                        disabled={!entry.online}
                        title="Stop"
                      >
                        ⏹
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
