import { INICIO } from '../utils/inicioTheme';
import TermTag from './TermTag';
import { CalendarIcon, FireIcon } from './Icons';

// Pantalla trabada del estado crítico: el plan no entra como está y obliga a
// decidir antes de seguir. Reutiliza los datos ya calculados (progress + cp);
// no recalcula nada.
export default function LockedPlan({ plan, progress, cp, onReprogram, onAcceptDebt }) {
  const missParts = [];
  if (cp.gymMissing > 0)   missParts.push(<span key="g">{cp.gymMissing} <TermTag>GIMNASIO</TermTag></span>);
  if (cp.indivMissing > 0) missParts.push(<span key="i">{cp.indivMissing} <TermTag>INDIVIDUAL</TermTag></span>);

  return (
    <div className="page-content" style={{ background: INICIO.bg, minHeight: '100%' }}>
      <div style={{ height: 3, background: INICIO.barCritical }} />

      <div style={{ padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontFamily: INICIO.mono, color: INICIO.bronze, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {plan.name} · Semana {cp.weekNum}
          </span>
          <span style={{
            fontFamily: INICIO.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            color: INICIO.criticalLight, border: `1px solid ${INICIO.critical}`,
            borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase',
          }}>
            Crítico
          </span>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: INICIO.textMain, letterSpacing: '-0.02em', lineHeight: 1.12 }}>
          El plan no cierra como está.
        </div>

        <div style={{ fontSize: 14.5, color: INICIO.textSoft, lineHeight: 1.5, marginTop: 12 }}>
          Te {missParts.length === 1 ? 'falta' : 'faltan'}{' '}
          {missParts.map((p, i) => <span key={i}>{i > 0 ? ' + ' : ''}{p}</span>)}{' '}
          esta semana y {cp.daysLeft === 1 ? 'queda 1 día' : `quedan ${cp.daysLeft} días`}. No entran.
        </div>

        {/* Progreso general del plan */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: INICIO.mono, color: INICIO.textSofter, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Plan
            </span>
            <span style={{ fontSize: 12, color: INICIO.textSoft }}>
              {progress.completedSessions}/{progress.effTotal || '?'} sesiones
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: '#23252D', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress.pct}%`, background: INICIO.barBronze, borderRadius: 99 }} />
          </div>
        </div>

        {/* Caminos */}
        <div style={{ fontSize: 11, fontFamily: INICIO.mono, color: INICIO.textSofter, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '28px 0 12px' }}>
          Elegí un camino
        </div>

        <button
          onClick={onReprogram}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            background: INICIO.card, border: `1px solid ${INICIO.bronze}`, borderRadius: INICIO.radius,
            padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
          }}
        >
          <span style={{ color: INICIO.bronze, flexShrink: 0 }}><CalendarIcon size={22} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: INICIO.textMain }}>Reprogramar</span>
            <span style={{ display: 'block', fontSize: 12.5, color: INICIO.textSofter, marginTop: 2 }}>
              Corro el final o bajo el objetivo a algo real.
            </span>
          </span>
        </button>

        <button
          onClick={onAcceptDebt}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            background: INICIO.card, border: `1px solid ${INICIO.critical}`, borderRadius: INICIO.radius,
            padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ color: INICIO.criticalLight, flexShrink: 0 }}><FireIcon size={20} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: INICIO.textMain }}>Asumir la deuda</span>
            <span style={{ display: 'block', fontSize: 12.5, color: INICIO.textSofter, marginTop: 2 }}>
              Sigo igual. La semana siguiente arranca cargada.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
