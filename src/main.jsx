import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// ── ErrorBoundary para evitar pantalla blanca ──
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[BetterPrompter] Error capturado:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#0a0a0a', color: '#eee', minHeight: '100dvh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', padding: 40,
        }}>
          <div style={{ maxWidth: 500, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
              Algo salio mal
            </h1>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              Hubo un error al cargar BetterPrompter.
              Revisa la consola del navegador (F12) para mas detalles.
            </p>
            <pre style={{
              background: '#1a1a1a', borderRadius: 8, padding: 16,
              fontSize: 12, color: '#ff6b6b', textAlign: 'left',
              overflow: 'auto', maxHeight: 200, marginBottom: 20,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {this.state.error.message}
              {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#00ff88', color: '#000', border: 'none',
                padding: '12px 32px', borderRadius: 8, fontSize: 14,
                fontWeight: 500, cursor: 'pointer',
              }}
            >
              Recargar pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Global error handler ──
window.onerror = (msg, source, line, col, err) => {
  console.error('[BetterPrompter] Error global:', msg, { source, line, col, err });
};

window.addEventListener('unhandledrejection', (e) => {
  console.error('[BetterPrompter] Promesa no manejada:', e.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);
