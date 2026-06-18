import { useState } from 'react';
import { PauseIcon } from './Icons';

// Motivos rápidos para justificar un día/actividad. "Otro" habilita texto libre.
const EXCUSE_REASONS = ['Feriado', 'Lesión', 'Cerrado', 'Imprevisto', 'Otro'];

// Modal para marcar una actividad o un día como excepción ("justificado").
// El motivo es opcional: se puede confirmar sin elegir nada.
export default function ExcuseModal({ subtitle, onConfirm, onClose }) {
  const [reason, setReason] = useState(null);
  const [custom, setCustom] = useState('');
  const finalReason = reason === 'Otro' ? (custom.trim() || 'Otro') : reason;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'var(--gray-mid)', lineHeight: 0 }}><PauseIcon size={16} /></span>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Marcar como excepción</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 16 }}>{subtitle}</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Motivo <span style={{ textTransform: 'none', fontWeight: 500 }}>(opcional)</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {EXCUSE_REASONS.map(r => {
            const sel = reason === r;
            return (
              <button
                key={r}
                onClick={() => setReason(sel ? null : r)}
                style={{
                  padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: sel ? 700 : 500,
                  border: `1.5px solid ${sel ? 'var(--navy-600)' : 'var(--border-strong)'}`,
                  background: sel ? 'var(--navy-100)' : 'white',
                  color: sel ? 'var(--navy-600)' : 'var(--text-primary)',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {reason === 'Otro' && (
          <input
            className="input"
            placeholder="Escribí el motivo…"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            autoFocus
            style={{ marginBottom: 14 }}
          />
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onConfirm(finalReason || null)}>
            Justificar
          </button>
        </div>
      </div>
    </div>
  );
}
