import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
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
        <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
          Algo salió mal
        </div>
        <div style={{ fontSize: 14, color: 'var(--gray-mid)', marginBottom: 32, maxWidth: 300, lineHeight: 1.5 }}>
          La app encontró un error inesperado. Recargala para continuar; tus datos están guardados en la nube.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--emerald-800)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '14px 28px',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', letterSpacing: '-0.01em',
          }}
        >
          Recargar app
        </button>
      </div>
    );
  }
}
