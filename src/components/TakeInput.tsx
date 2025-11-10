import { useState, useRef, useEffect, useCallback } from 'react'
import { Take, TakeTemplate } from '@shared/types'
import './TakeInput.css'

interface TakeInputProps {
  currentTake: string
  history: Take[]
  templates: TakeTemplate[]
  predefinedTakes: string[]
  onSetTakeName: (takeName: string) => void
  onSetAllTakes?: () => void
  showName?: string
  dateFormat?: string
  shotNumber?: number
  takeNumber?: number
  onIncrementTake?: () => void
  selectedTemplate?: string | null
  onTemplateChange?: (templateId: string) => void
  customText?: string
  onCustomTextStateChange?: (customText: string, includeCustom: boolean, setCustomText: (text: string) => void) => void
  oscTriggered?: boolean
}

export default function TakeInput({
  currentTake,
  history,
  templates,
  predefinedTakes,
  onSetTakeName,
  onSetAllTakes,
  showName,
  dateFormat,
  shotNumber,
  takeNumber,
  onIncrementTake,
  selectedTemplate: selectedTemplateProp,
  onTemplateChange,
  customText: customTextProp = '',
  onCustomTextStateChange,
  oscTriggered = false
}: TakeInputProps) {
  const [inputValue, setInputValue] = useState(currentTake)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(selectedTemplateProp || '1')
  const [includeShow, setIncludeShow] = useState(true)
  const [includeDate, setIncludeDate] = useState(true)
  const [includeShotTake, setIncludeShotTake] = useState(false)
  
  // Separate includeShow/includeDate/includeShotTake/includeCustom for each template
  const getTemplateSettings = (templateId: string) => {
    const showKey = `includeShow_${templateId}`
    const dateKey = `includeDate_${templateId}`
    const shotTakeKey = `includeShotTake_${templateId}`
    const customKey = `includeCustom_${templateId}`
    
    const savedShow = localStorage.getItem(showKey)
    const savedDate = localStorage.getItem(dateKey)
    const savedShotTake = localStorage.getItem(shotTakeKey)
    const savedCustom = localStorage.getItem(customKey)
    
    // For Custom template (id='3'), default includeCustom to true if never set
    const customDefault = templateId === '3' && savedCustom === null ? true : savedCustom === 'true'
    
    return {
      includeShow: savedShow === null ? true : savedShow === 'true',
      includeDate: savedDate === null ? true : savedDate === 'true',
      includeShotTake: savedShotTake === 'true',
      includeCustom: customDefault
    }
  }
  
  const [includeCustom, setIncludeCustom] = useState(() => {
    return getTemplateSettings(selectedTemplate || '1').includeCustom
  })
  const [customText, setCustomText] = useState(customTextProp)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync customText with prop changes
  useEffect(() => {
    setCustomText(customTextProp)
  }, [customTextProp])

  // Notify parent of custom text state
  useEffect(() => {
    if (onCustomTextStateChange) {
      onCustomTextStateChange(customText, includeCustom, setCustomText)
    }
  }, [customText, includeCustom, onCustomTextStateChange])

  useEffect(() => {
    setInputValue(currentTake)
  }, [currentTake])
  
  // Save selected template to localStorage and load its specific settings
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem('selectedTemplate', selectedTemplate)
      
      // Load the settings for this template
      const settings = getTemplateSettings(selectedTemplate)
      setIncludeShow(settings.includeShow)
      setIncludeDate(settings.includeDate)
      setIncludeShotTake(settings.includeShotTake)
      setIncludeCustom(settings.includeCustom)
    }
  }, [selectedTemplate])
  
  // Save includeShow to localStorage when it changes (per template)
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem(`includeShow_${selectedTemplate}`, includeShow.toString())
    }
  }, [includeShow, selectedTemplate])
  
  // Save includeDate to localStorage when it changes (per template)
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem(`includeDate_${selectedTemplate}`, includeDate.toString())
    }
  }, [includeDate, selectedTemplate])
  
  // Save includeShotTake to localStorage when it changes (per template)
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem(`includeShotTake_${selectedTemplate}`, includeShotTake.toString())
    }
  }, [includeShotTake, selectedTemplate])
  
  // Save includeCustom to localStorage when it changes (per template)
  useEffect(() => {
    if (selectedTemplate) {
      localStorage.setItem(`includeCustom_${selectedTemplate}`, includeCustom.toString())
    }
  }, [includeCustom, selectedTemplate])

  const applyTemplate = useCallback(async (template: TakeTemplate, autoSave = false) => {
    let parts: string[] = []
    
    // Build parts array in order: Show, Shot#, Custom Text, Take#
    if (includeShow) parts.push('{showName}')
    if (includeDate) parts.push('{date}')
    if (includeShotTake && shotNumber !== undefined) parts.push('S{shot}')
    if (includeCustom && customText) parts.push(customText)
    if (includeShotTake && takeNumber !== undefined) parts.push('T{take}')
    
    // Handle Custom template
    if (template.id === '3') {
      const formattedName = parts.length > 0 ? parts.join('_') : ''
      let result = formattedName
      
      if (showName && includeShow) {
        result = result.replace('{showName}', showName)
      }
      if (includeDate && result.includes('{date}')) {
        const date = await window.electronAPI.getFormattedDate()
        result = result.replace('{date}', date)
      }
      if (includeShotTake) {
        if (shotNumber !== undefined) {
          result = result.replace('{shot}', shotNumber.toString().padStart(2, '0'))
        }
        if (takeNumber !== undefined) {
          result = result.replace('{take}', takeNumber.toString().padStart(2, '0'))
        }
      }
      
      setInputValue(result)
      setSelectedTemplate(template.id)
      return
    }
    
    let formattedName = template.format
    
    // Modify format based on checkboxes
    if (template.id === '1') {
      // Show template
      if (includeShow && includeDate) {
        formattedName = '{showName} - {date}'
      } else if (includeShow) {
        formattedName = '{showName}'
      } else if (includeDate) {
        formattedName = '{date}'
      } else {
        formattedName = ''
      }
    } else if (template.id === '2') {
      // Take template - Order: Show, Shot#, Custom Text, Take#
      let parts: string[] = []
      if (includeShow) parts.push('{showName}')
      if (includeDate) parts.push('{date}')
      if (shotNumber !== undefined) parts.push('S{shot}')
      if (includeCustom && customText) parts.push(customText)
      if (takeNumber !== undefined) parts.push('T{take}')
      formattedName = parts.join('_')
    }
    
    // Replace variables with actual values
    if (showName) {
      formattedName = formattedName.replace('{showName}', showName)
    }
    
    // Get formatted date from backend
    if (formattedName.includes('{date}')) {
      const date = await window.electronAPI.getFormattedDate()
      formattedName = formattedName.replace('{date}', date)
    }
    
    // Replace shot and take numbers
    if (shotNumber !== undefined) {
      formattedName = formattedName.replace('{shot}', shotNumber.toString().padStart(2, '0'))
      formattedName = formattedName.replace('{scene}', shotNumber.toString())
    }
    if (takeNumber !== undefined) {
      formattedName = formattedName.replace('{take}', takeNumber.toString().padStart(2, '0'))
    }
    
    setInputValue(formattedName)
    setSelectedTemplate(template.id)
    
    // Auto-save when re-applying due to format changes
    if (autoSave) {
      onSetTakeName(formattedName)
    }
  }, [showName, dateFormat, shotNumber, takeNumber, includeShow, includeDate, includeShotTake, includeCustom, customText, onSetTakeName])

  // Re-apply template when shot or take numbers change (for Take template only)
  useEffect(() => {
    if (selectedTemplate === '2') {
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        applyTemplate(template, false) // Update preview only, don't auto-save
      }
    }
  }, [shotNumber, takeNumber])
  
  // Re-apply template when checkboxes or dateFormat changes
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        applyTemplate(template, false) // Update preview but don't auto-save
      }
    }
  }, [includeShow, includeDate, includeShotTake, includeCustom, customText, dateFormat])

  function handleSubmit() {
    if (inputValue.trim()) {
      onSetTakeName(inputValue.trim())
      
      // Auto-increment take number if using Take template
      if (selectedTemplate === '2' && onIncrementTake) {
        onIncrementTake()
      }
    }
  }

  function handleSelectFromHistory(take: Take) {
    setInputValue(take.name)
    setShowDropdown(false)
    onSetTakeName(take.name)
  }

  function handleSelectPredefined(takeName: string) {
    setInputValue(takeName)
    setShowDropdown(false)
    onSetTakeName(takeName)
  }

  // Filter history and predefined takes based on input
  const filteredHistory = history
    .filter(t => t.name && t.name.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 10)

  const filteredPredefined = predefinedTakes
    .filter(name => name && name.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 5)

  return (
    <div className="take-input">
      <div className="take-input-main">
        {currentTake && (
          <div className="current-take">
            Current: <strong>{currentTake}</strong>
          </div>
        )}

        <div className="input-wrapper">
        <div className="input-with-label">
          <span className="input-label">Next:</span>
          <input
            ref={inputRef}
            type="text"
            className="take-name-input"
            placeholder="Enter take name..."
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setShowDropdown(true)
              // Keep template selected even when manually editing
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSubmit()
                setShowDropdown(false)
              } else if (e.key === 'Escape') {
                setShowDropdown(false)
              }
            }}
          />
        </div>
        <button className="set-btn" onClick={handleSubmit}>
          Set Take
        </button>
        {onSetAllTakes && (
          <button className="set-all-btn" onClick={onSetAllTakes}>
            Set All
          </button>
        )}
      </div>

      <div className="template-and-checkbox-column">
        <div className="template-buttons">
          {templates.filter(template => template.id !== '3').map(template => (
            <button
              key={template.id}
              className={`template-btn ${selectedTemplate === template.id ? 'active' : ''}`}
              onClick={async () => {
                await applyTemplate(template, false)
                setSelectedTemplate(template.id)
                localStorage.setItem('selectedTemplate', template.id)
                onTemplateChange?.(template.id)
              }}
            >
              {template.name}
            </button>
          ))}
        </div>
        <div className="checkbox-group-below">
          <span className="checkbox-label">ON:</span>
          <div className="checkbox-stack">
            <label className="template-checkbox">
              <input 
                type="checkbox" 
                checked={includeShow}
                onChange={(e) => setIncludeShow(e.target.checked)}
              />
              <span>Show</span>
            </label>
            <label className="template-checkbox">
              <input 
                type="checkbox"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
              />
              <span>Date</span>
            </label>
            <label className="template-checkbox">
              <input 
                type="checkbox"
                checked={includeShotTake}
                onChange={(e) => setIncludeShotTake(e.target.checked)}
              />
              <span>Shot/Take</span>
            </label>
            <label className="template-checkbox">
              <input 
                type="checkbox"
                checked={includeCustom}
                onChange={(e) => setIncludeCustom(e.target.checked)}
              />
              <span>Custom</span>
            </label>
          </div>
        </div>
      </div>

      {showDropdown && (filteredHistory.length > 0 || filteredPredefined.length > 0) && (
        <div className="dropdown">
          {filteredPredefined.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-header">Predefined</div>
              {filteredPredefined.map(name => (
                <div
                  key={name}
                  className="dropdown-item"
                  onClick={() => handleSelectPredefined(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}

          {filteredHistory.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-header">Recent</div>
              {filteredHistory.map(take => (
                <div
                  key={take.id}
                  className="dropdown-item"
                  onClick={() => handleSelectFromHistory(take)}
                >
                  <span>{take.name}</span>
                  <span className="dropdown-time">
                    {new Date(take.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* OSC trigger flash indicator */}
        {oscTriggered && (
          <div className="osc-flash" />
        )}
      </div>

      {history.length > 0 && (
        <div className="recent-takes">
          <div className="recent-header">Recent Takes</div>
          <div className="recent-list">
            {history.slice(0, 5).map(take => (
              <div
                key={take.id}
                className="recent-item"
                onClick={() => handleSelectFromHistory(take)}
              >
                <span className="recent-name">{take.name}</span>
                <span className="recent-time">
                  {new Date(take.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
