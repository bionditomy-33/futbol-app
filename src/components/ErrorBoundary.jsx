import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset() {
    try { localStorage.clear(); } catch { /* nada */ }
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100dvh',
        padding: '32px 24px', background: '#fff', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#263238', marginBottom: 8 }}>
          Algo salió mal
        </div>
        <div style={{ fontSize: 14, color: '#78909C', marginBottom: 32, maxWidth: 300, lineHeight: 1.5 }}>
          La app encontró un error inesperado. Podés resetear los datos para volver a usarla.
        </div>
        <button
          onClick={this.handleReset}
          style={{
            background: '#1B5E20', color: '#fff', border: 'none',
            borderRadius: 12, padding: '14px 28px',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', letterSpacing: '-0.01em',
          }}
        >
          Resetear app
        </button>
        <div style={{ fontSize: 12, color: '#B0BEC5', marginTop: 12 }}>
          Esto borrará todos los datos locales
        </div>
      </div>
    );
  }
}
