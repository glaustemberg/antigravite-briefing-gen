import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Plus, FolderOpen, Settings, LayoutDashboard,
  ChevronRight, Upload, Sparkles, Download, Copy, Check,
  Trash2, Edit3, X, Menu, Users, Clock, Zap, Search,
  AlertCircle, Save, Eye, ArrowLeft, ArrowRight, File,
  Key, ExternalLink, Mic, MicOff
} from 'lucide-react'
import { getClients, saveClient, deleteClient, getBriefings, saveBriefing, deleteBriefing, getBriefingsByClient, getSettings, saveSettings } from './utils/storage'
import { extractTextFromFile, formatFileSize, fileToBase64 } from './utils/fileParser'
import { generateBriefing, extractFieldsFromFiles } from './utils/geminiAPI'
import { exportBriefingPDF, copyToClipboard, exportBriefingTXT, exportBriefingHTML } from './utils/exportPDF'
import { BRIEFING_SECTIONS, createEmptyBriefingData, calculateCompleteness, getSectionCompleteness } from './utils/briefingModel'

// ===== SPEECH RECOGNITION =====
function useSpeech() {
  const [listening, setListening] = useState(false)
  const [activeKey, setActiveKey] = useState(null)
  const recRef = useRef(null)

  const start = useCallback((key, onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Reconhecimento de voz não disponível. Use Chrome ou Edge.')
      return
    }
    if (recRef.current) recRef.current.abort()
    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => { setListening(true); setActiveKey(key) }
    rec.onend = () => { setListening(false); setActiveKey(null) }
    rec.onerror = () => { setListening(false); setActiveKey(null) }
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      onResult(text)
    }
    recRef.current = rec
    rec.start()
  }, [])

  const stop = useCallback(() => { recRef.current?.stop() }, [])

  return { listening, activeKey, start, stop }
}

function MicButton({ fieldKey, speech, onResult }) {
  const isActive = speech.activeKey === fieldKey && speech.listening
  return (
    <button
      type="button"
      className={`mic-btn${isActive ? ' mic-active' : ''}`}
      onClick={() => isActive ? speech.stop() : speech.start(fieldKey, onResult)}
      title={isActive ? 'Parar gravação' : 'Clique para falar'}
    >
      {isActive ? <MicOff size={13} /> : <Mic size={13} />}
      {isActive ? 'Gravando...' : 'Falar'}
    </button>
  )
}

// ===== APP =====
export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [briefings, setBriefings] = useState([])
  const [settings, setSettingsState] = useState({})

  // Refresh data from localStorage
  const refreshData = useCallback(() => {
    setClients(getClients())
    setBriefings(getBriefings())
    setSettingsState(getSettings())
  }, [])

  useEffect(() => { refreshData() }, [refreshData])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new', label: 'Novo Briefing', icon: Plus },
    { id: 'briefings', label: 'Meus Briefings', icon: FolderOpen },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ]

  const handleNavigate = (p) => { setPage(p); setSidebarOpen(false) }

  return (
    <div className="app-layout">
      {/* Mobile toggle */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu size={20} />
      </button>
      {sidebarOpen && <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo-icon.svg" alt="Antigravite" className="sidebar-logo-img" />
          <div className="sidebar-title-block">
            <span className="sidebar-title">ANTIGRAVITE</span>
            <span className="sidebar-subtitle">Briefing Generator</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => handleNavigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <img src="/logo-full.svg" alt="Antigravite" style={{ width: '100%', opacity: 0.5, filter: 'brightness(2)' }} />
          <div style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            v1.0 · Powered by Gemini AI
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {page === 'dashboard' && <DashboardPage clients={clients} briefings={briefings} onNavigate={handleNavigate} />}
        {page === 'new' && <NewBriefingPage clients={clients} settings={settings} onRefresh={refreshData} onNavigate={handleNavigate} />}
        {page === 'briefings' && <BriefingsPage briefings={briefings} clients={clients} onRefresh={refreshData} onNavigate={handleNavigate} />}
        {page === 'clients' && <ClientsPage clients={clients} briefings={briefings} onRefresh={refreshData} />}
        {page === 'settings' && <SettingsPage settings={settings} onSave={(s) => { saveSettings(s); setSettingsState(getSettings()) }} />}
      </main>
    </div>
  )
}

// ===== DASHBOARD =====
function DashboardPage({ clients, briefings, onNavigate }) {
  const recentBriefings = briefings.slice(0, 5)
  const thisMonth = briefings.filter(b => {
    const d = new Date(b.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral dos seus briefings e clientes</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><FileText size={20} /></div>
          <div className="stat-value">{briefings.length}</div>
          <div className="stat-label">Total de Briefings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold"><Clock size={20} /></div>
          <div className="stat-value">{thisMonth.length}</div>
          <div className="stat-label">Este Mês</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Users size={20} /></div>
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Clientes</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('new')}>
          <Plus size={20} /> Criar Novo Briefing
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('clients')}>
          <Users size={20} /> Gerenciar Clientes
        </button>
      </div>

      {/* Recent Briefings */}
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-header">
          <h3 className="card-title">Briefings Recentes</h3>
          {briefings.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('briefings')}>
              Ver todos <ChevronRight size={14} />
            </button>
          )}
        </div>
        {recentBriefings.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>Nenhum briefing ainda</h3>
            <p>Crie seu primeiro briefing para começar!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {recentBriefings.map(b => (
              <div key={b.id} className="client-item" onClick={() => onNavigate('briefings')}>
                <div className="client-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                  <FileText size={16} />
                </div>
                <div className="client-info">
                  <div className="client-name">{b.title || 'Sem título'}</div>
                  <div className="client-meta">{b.clientName || 'Sem cliente'} · {new Date(b.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <span className="badge badge-primary">{b.completeness || 0}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ===== NEW BRIEFING =====
function NewBriefingPage({ clients, settings, onRefresh, onNavigate }) {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState(createEmptyBriefingData())
  const [freeText, setFreeText] = useState('')
  const [files, setFiles] = useState([])
  const [filesContent, setFilesContent] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [searchClient, setSearchClient] = useState('')
  const speech = useSpeech()
  const [images, setImages] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractedCount, setExtractedCount] = useState(0)

  const steps = [
    { label: 'Cliente', icon: Users },
    { label: 'Informações', icon: Edit3 },
    { label: 'Documentos', icon: Upload },
    { label: 'Gerar com IA', icon: Sparkles },
    { label: 'Resultado', icon: Eye },
  ]

  // Handle file drop — images go to base64 state, documents to text extraction
  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])

  const handleFiles = async (newFiles) => {
    const fileArr = Array.from(newFiles)
    setFiles(prev => [...prev, ...fileArr])

    const newTexts = []
    const newImgs = []

    for (const f of fileArr) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (IMAGE_EXTS.has(ext)) {
        try { newImgs.push({ name: f.name, src: await fileToBase64(f) }) } catch {}
      } else {
        newTexts.push({ name: f.name, text: await extractTextFromFile(f) })
      }
    }

    if (newImgs.length) setImages(prev => [...prev, ...newImgs])

    if (newTexts.length) {
      const allTexts = [...filesContent, ...newTexts]
      setFilesContent(allTexts)
      if (settings.geminiApiKey) autoExtract(allTexts)
    }
  }

  const autoExtract = async (texts) => {
    setExtracting(true)
    setExtractedCount(0)
    try {
      const extracted = await extractFieldsFromFiles(settings.geminiApiKey, texts)
      const keys = Object.keys(extracted).filter(k => extracted[k] && String(extracted[k]).trim())
      if (keys.length) {
        setFormData(prev => {
          const next = { ...prev }
          for (const k of keys) {
            if (!next[k] || !String(next[k]).trim()) next[k] = String(extracted[k])
          }
          return next
        })
        setExtractedCount(keys.length)
      }
    } catch {}
    setExtracting(false)
  }

  const removeFile = (idx) => {
    const name = files[idx]?.name
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setFilesContent(prev => prev.filter(fc => fc.name !== name))
    setImages(prev => prev.filter(img => img.name !== name))
  }

  // Update form field
  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Select client
  const handleSelectClient = (client) => {
    setSelectedClient(client)
    updateField('cliente', client.name)
  }

  // Generate briefing
  const handleGenerate = async () => {
    const apiKey = settings.geminiApiKey
    if (!apiKey) {
      onNavigate('settings')
      return
    }

    setGenerating(true)
    setError('')
    setGeneratedText('')

    try {
      const clientHistory = selectedClient ? `
Cliente: ${selectedClient.name}
Segmento: ${selectedClient.segment || 'N/A'}
Contato: ${selectedClient.contact || 'N/A'}
Notas: ${selectedClient.notes || 'N/A'}
      `.trim() : ''

      const result = await generateBriefing(apiKey, {
        formData,
        freeText,
        filesContent,
        clientHistory,
      })

      setGeneratedText(result)
      setStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Save briefing
  const handleSave = () => {
    const briefing = saveBriefing({
      title: formData.titulo || 'Briefing sem título',
      clientId: selectedClient?.id,
      clientName: selectedClient?.name || formData.cliente || 'Sem cliente',
      formData,
      freeText,
      generatedText,
      completeness: calculateCompleteness(formData),
    })
    onRefresh()
    return briefing
  }

  // Export PDF
  const handleExportPDF = async () => {
    await exportBriefingPDF(generatedText, formData.titulo || 'Briefing')
  }

  // Export TXT
  const handleExportTXT = () => exportBriefingTXT(generatedText, formData.titulo || 'Briefing')

  // Export HTML
  const handleExportHTML = () => exportBriefingHTML(generatedText, formData.titulo || 'Briefing', images)

  // Copy text
  const handleCopy = async () => {
    await copyToClipboard(generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchClient.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <h1>Novo Briefing</h1>
        <p>Preencha as informações e gere o briefing com IA</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`stepper-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
              onClick={() => i <= step && setStep(i)}
            >
              <div className="step-number">
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`step-connector ${i < step ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Client Selection */}
      {step === 0 && (
        <div className="card" style={{ cursor: 'default' }}>
          <div className="card-header">
            <h3 className="card-title">Selecione o Cliente</h3>
          </div>

          <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-tertiary)' }} />
            <input
              className="form-input"
              placeholder="Buscar cliente..."
              value={searchClient}
              onChange={e => setSearchClient(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          {filteredClients.length === 0 && clients.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>Nenhum cliente cadastrado</h3>
              <p>Você pode prosseguir sem selecionar um cliente ou cadastrar um primeiro.</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-md)' }}>Nenhum resultado para "{searchClient}"</p>
          ) : (
            <div className="client-list">
              {filteredClients.map(c => (
                <div
                  key={c.id}
                  className={`client-item ${selectedClient?.id === c.id ? 'selected' : ''}`}
                  onClick={() => handleSelectClient(c)}
                >
                  <div className="client-avatar">{c.name.charAt(0).toUpperCase()}</div>
                  <div className="client-info">
                    <div className="client-name">{c.name}</div>
                    <div className="client-meta">{c.segment || 'Sem segmento'}</div>
                  </div>
                  {selectedClient?.id === c.id && <Check size={16} style={{ color: 'var(--success)' }} />}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Pular <ChevronRight size={14} />
            </button>
            <button className="btn btn-primary" onClick={() => setStep(1)} disabled={!selectedClient}>
              Próximo <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Form — iterate through sections */}
      {step === 1 && (
        <div>
          {BRIEFING_SECTIONS.map(section => (
            <div key={section.id} className="card" style={{ cursor: 'default', marginBottom: 'var(--space-lg)' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <span style={{ color: 'var(--accent-primary)', marginRight: 8 }}>{section.number}.</span>
                  {section.title}
                </h3>
                <span className="badge badge-primary">{getSectionCompleteness(section, formData)}%</span>
              </div>

              {section.fields.map(field => (
                <div key={field.key} className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{field.label}{field.required && <span className="required">*</span>}</span>
                    {(field.type === 'textarea' || field.type === 'text') && (
                      <MicButton
                        fieldKey={field.key}
                        speech={speech}
                        onResult={(text) => updateField(field.key, (formData[field.key] ? formData[field.key] + ' ' : '') + text)}
                      />
                    )}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="form-textarea"
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={e => updateField(field.key, e.target.value)}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="form-select"
                      value={formData[field.key] || ''}
                      onChange={e => updateField(field.key, e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={e => updateField(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="completeness-bar">
                <div className="completeness-fill" style={{ width: `${getSectionCompleteness(section, formData)}%` }} />
              </div>
            </div>
          ))}

          {/* Free text notes */}
          <div className="card" style={{ cursor: 'default', marginBottom: 'var(--space-lg)' }}>
            <div className="card-header">
              <h3 className="card-title">📝 Notas Livres do Atendimento</h3>
              <MicButton
                fieldKey="freeText"
                speech={speech}
                onResult={(text) => setFreeText(prev => prev ? prev + ' ' + text : text)}
              />
            </div>
            <textarea
              className="form-textarea"
              style={{ minHeight: 200 }}
              placeholder="Cole aqui qualquer informação adicional, anotações da reunião, e-mails do cliente, observações do account..."
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>
              <ArrowLeft size={14} /> Voltar
            </button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Próximo: Documentos <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: File Upload */}
      {step === 2 && (
        <div className="card" style={{ cursor: 'default' }}>
          <div className="card-header">
            <h3 className="card-title">📎 Upload de Documentos</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
            Envie documentos que contenham informações sobre o projeto. A IA vai analisar o conteúdo para enriquecer o briefing.
          </p>

          <div
            className="dropzone"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('active') }}
            onDragLeave={e => e.currentTarget.classList.remove('active')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('active'); handleFiles(e.dataTransfer.files) }}
            onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg'; inp.onchange = e => handleFiles(e.target.files); inp.click() }}
          >
            <Upload className="dropzone-icon" size={48} />
            <div className="dropzone-text">Arraste e solte arquivos aqui ou clique para selecionar</div>
            <div className="dropzone-hint">Documentos: PDF, DOCX, TXT, MD, CSV · Imagens: JPG, PNG, GIF, WEBP, SVG</div>
          </div>

          {files.length > 0 && (
            <>
              <div className="file-list">
                {files.map((f, idx) => {
                  const ext = f.name.split('.').pop().toLowerCase()
                  const isImg = IMAGE_EXTS.has(ext)
                  const imgData = images.find(i => i.name === f.name)
                  return (
                    <div key={idx} className="file-item">
                      {isImg && imgData
                        ? <img src={imgData.src} alt={f.name} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        : <File size={16} className="file-item-icon" />
                      }
                      <span className="file-item-name">{f.name}</span>
                      <span className="file-item-size">{formatFileSize(f.size)}</span>
                      <X size={14} className="file-item-remove" onClick={() => removeFile(idx)} />
                    </div>
                  )
                })}
              </div>
              {extracting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--accent-glow)', borderRadius: 8, fontSize: 'var(--text-sm)', color: 'var(--accent-tertiary)', marginTop: 10 }}>
                  <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Analisando documentos e extraindo campos com IA...
                </div>
              )}
              {!extracting && extractedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-soft)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, fontSize: 'var(--text-sm)', color: 'var(--success)', marginTop: 10 }}>
                  <Check size={15} />
                  <strong>{extractedCount} campos</strong> preenchidos automaticamente — revise na aba Informações
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> Voltar
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Próximo: Gerar com IA <Sparkles size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate with AI */}
      {step === 3 && (
        <div>
          {/* Summary before generation */}
          <div className="card" style={{ cursor: 'default', marginBottom: 'var(--space-lg)' }}>
            <div className="card-header">
              <h3 className="card-title">📋 Resumo das Informações</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Cliente:</span>
                <strong style={{ marginLeft: 8 }}>{selectedClient?.name || formData.cliente || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Projeto:</span>
                <strong style={{ marginLeft: 8 }}>{formData.titulo || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Campos preenchidos:</span>
                <strong style={{ marginLeft: 8 }}>{calculateCompleteness(formData)}%</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Documentos:</span>
                <strong style={{ marginLeft: 8 }}>{files.length} arquivo(s)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Notas livres:</span>
                <strong style={{ marginLeft: 8 }}>{freeText ? `${freeText.length} caracteres` : 'Nenhuma'}</strong>
              </div>
            </div>
          </div>

          {!settings.geminiApiKey && (
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-gold)' }}>
                <Key size={16} />
                <span>Nenhuma API Key configurada. A geração com IA não funcionará.</span>
              </div>
              <button
                onClick={() => onNavigate('settings')}
                style={{ background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Configurar agora
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--error-soft)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)', color: 'var(--error)', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                {error}
              </div>
              {error.toLowerCase().includes('api key') && (
                <button
                  onClick={() => onNavigate('settings')}
                  style={{ background: 'var(--error)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Ir para Configurações
                </button>
              )}
            </div>
          )}

          <div className="ai-generate-section">
            <Sparkles size={40} style={{ color: 'var(--accent-tertiary)', marginBottom: 'var(--space-md)' }} />
            <h3>Gerar Briefing com Inteligência Artificial</h3>
            <p>
              A IA vai combinar todas as informações fornecidas — formulário, notas do atendimento,
              documentos e histórico do cliente — para gerar um briefing completo e profissional.
            </p>
            <button
              className="btn-ai"
              onClick={handleGenerate}
              disabled={generating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {generating ? (
                <>
                  <span className="loading-spinner" />
                  Gerando briefing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Gerar Briefing Agora
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              <ArrowLeft size={14} /> Voltar
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && generatedText && (
        <div>
          <div className="briefing-preview">
            <div className="briefing-preview-header">
              <h2>{formData.titulo || 'Briefing Gerado'}</h2>
              <div className="briefing-preview-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportTXT} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <FileText size={14} /> TXT
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportHTML} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <ExternalLink size={14} /> HTML
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportPDF} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <Download size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="briefing-section">
              <div className="briefing-section-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {generatedText}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>
              <ArrowLeft size={14} /> Voltar e Regenerar
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-success" onClick={() => { handleSave(); onNavigate('briefings') }}>
                <Save size={14} /> Salvar Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ===== BRIEFINGS LIST =====
function BriefingsPage({ briefings, clients, onRefresh, onNavigate }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const filtered = briefings.filter(b =>
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.clientName || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este briefing?')) {
      deleteBriefing(id)
      onRefresh()
      if (selected?.id === id) setSelected(null)
    }
  }

  const handleCopy = async (text) => {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPDF = async (b) => {
    await exportBriefingPDF(b.generatedText || '', b.title || 'Briefing')
  }

  if (selected) {
    return (
      <>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{selected.title || 'Briefing'}</h1>
            <p>{selected.clientName || 'Sem cliente'} · {new Date(selected.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="briefing-preview">
          <div className="briefing-preview-header">
            <h2>{selected.title || 'Briefing'}</h2>
            <div className="briefing-preview-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(selected.generatedText)} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleExportPDF(selected)} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="briefing-section">
            <div className="briefing-section-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {selected.generatedText || 'Nenhum texto gerado para este briefing.'}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>Meus Briefings</h1>
        <p>Todos os briefings gerados</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-tertiary)' }} />
          <input
            className="form-input"
            placeholder="Buscar briefing..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          <Plus size={16} /> Novo Briefing
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ cursor: 'default' }}>
          <div className="empty-state">
            <FolderOpen size={48} />
            <h3>Nenhum briefing encontrado</h3>
            <p>Crie um novo briefing para começar</p>
            <button className="btn btn-primary" onClick={() => onNavigate('new')}>
              <Plus size={16} /> Criar Briefing
            </button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map(b => (
            <div key={b.id} className="card" onClick={() => setSelected(b)} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="card-title" style={{ fontSize: 'var(--text-base)', marginBottom: 4 }}>{b.title || 'Sem título'}</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {b.clientName || 'Sem cliente'}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleDelete(b.id) }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <span className="badge badge-primary">{b.completeness || 0}% completo</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ===== CLIENTS =====
function ClientsPage({ clients, briefings, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', segment: '', contact: '', email: '', notes: '' })

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', segment: '', contact: '', email: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, segment: c.segment || '', contact: c.contact || '', email: c.email || '', notes: c.notes || '' })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    saveClient(editing ? { ...editing, ...form } : form)
    onRefresh()
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClient(id)
      onRefresh()
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Clientes</h1>
        <p>Gerencie sua base de clientes</p>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="card" style={{ cursor: 'default' }}>
          <div className="empty-state">
            <Users size={48} />
            <h3>Nenhum cliente cadastrado</h3>
            <p>Adicione clientes para associá-los aos briefings</p>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {clients.map(c => {
            const clientBriefings = getBriefingsByClient(c.id)
            return (
              <div key={c.id} className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, minWidth: 0 }}>
                    <div className="client-avatar">{c.name.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="card-title" style={{ fontSize: 'var(--text-base)' }}>{c.name}</h3>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{c.segment || 'Sem segmento'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                  {c.contact && <div>👤 {c.contact}</div>}
                  {c.email && <div>✉️ {c.email}</div>}
                  <div style={{ marginTop: 4 }}>
                    <span className="badge badge-primary">{clientBriefings.length} briefing(s)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div className="form-group">
                <label className="form-label">Segmento</label>
                <input className="form-input" value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} placeholder="Ex: Tecnologia, Varejo, Saúde..." />
              </div>
              <div className="form-group">
                <label className="form-label">Contato Principal</label>
                <input className="form-input" value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Nome do contato" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações sobre o cliente" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
                <Save size={14} /> {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ===== SETTINGS =====
function SettingsPage({ settings, onSave }) {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    onSave({ geminiApiKey: apiKey })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Configure sua integração com IA e preferências do sistema</p>
      </div>

      <div className="card" style={{ cursor: 'default', maxWidth: 640, border: !settings.geminiApiKey ? '1px solid rgba(245,158,11,0.4)' : undefined }}>
        {!settings.geminiApiKey && (
          <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-gold)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            <AlertCircle size={16} />
            API Key não configurada — a geração com IA está desativada.
          </div>
        )}

        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} style={{ color: 'var(--accent-gold)' }} />
            API Key do Google Gemini
          </h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
          Para gerar briefings com IA, você precisa de uma API key gratuita do Google AI Studio.
          É rápido, gratuito e não precisa de cartão de crédito.
        </p>

        <div className="form-group">
          <label className="form-label">Gemini API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{ paddingRight: 80 }}
              autoFocus={!settings.geminiApiKey}
            />
            <button
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', right: 4, top: 4 }}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Obtenha sua chave grátis em</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-primary)', fontWeight: 500 }}>
              aistudio.google.com/apikey <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!apiKey.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: !apiKey.trim() ? 0.5 : 1 }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Salvo com sucesso!' : 'Salvar API Key'}
        </button>
      </div>

      <div className="card" style={{ cursor: 'default', maxWidth: 640, marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <h3 className="card-title">ℹ️ Sobre</h3>
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p><strong>Briefing Generator v1.0</strong></p>
          <p>Plataforma inteligente para equipes de atendimento de agências criarem briefings profissionais com IA.</p>
          <p style={{ marginTop: 'var(--space-md)' }}>
            🔒 Seus dados são armazenados localmente no navegador (localStorage).
            <br />
            🤖 Geração de briefings powered by Google Gemini AI.
          </p>
        </div>
      </div>
    </>
  )
}
