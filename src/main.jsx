import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../PromptStudioCanvas.js'
import '../index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[PromptStudio] Uncaught error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030307', color: '#f0f0fa', fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem' }}>
          <div style={{ maxWidth: '520px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '0.75rem', color: '#7c6af7' }}>PROMPT STUDIO — Başlatma Hatası</h1>
            <p style={{ fontSize: '0.85rem', color: '#a0a0b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Uygulama başlatılırken bir hata oluştu. Tarayıcı konsolunu kontrol edin.
            </p>
            <pre style={{ background: '#0a0a16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', fontSize: '0.75rem', color: '#f43f5e', textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem', background: '#7c6af7', color: 'white', border: 'none', borderRadius: '99px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.05em' }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
