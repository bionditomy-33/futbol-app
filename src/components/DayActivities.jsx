import { useState } from 'react';
import { ACT_COLORS } from '../utils/colors';
import { XIcon, TrashIcon, CheckIcon, PlayIcon, GymIcon, BallIcon, ShieldIcon, TrophyIcon } from './Icons';
import ExerciseGroupedList from './ExerciseGroupedList';

const ACT_ICONS = { gym: GymIcon, indiv: BallIcon, arsenal: ShieldIcon, match: TrophyIcon };

// Columna izquierda de la card: icono de actividad en círculo + horario fuerte
function CardLeft({ type, time, c }) {
  const Icon = ACT_ICONS[type];
  return (
    <div className="hoy-card-left">
      <div className="hoy-card-icon" style={{ background: c.sub }}>
        <Icon size={17} />
      </div>
      <div className="hoy-card-time" style={{ color: c.title }}>{time}</div>
    </div>
  );
}

const PHASE_COLORS = ['var(--navy-600)', 'var(--emerald-600)', 'var(--amber-600)', 'var(--gray-mid)'];

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function GapIndicator({ gapMins }) {
  const hrs = (gapMins / 60).toFixed(1).replace('.0', '');
  return (
    <div className="hoy-gap">
      <div className="hoy-gap-line" />
      <span className="hoy-gap-label">~{hrs} hs</span>
    </div>
  );
}

// ── Botón "No hice" / estado salteado, reutilizable ──────────────────────────
function SkipControl({ skipped, color, onSkip }) {
  if (skipped) {
    return (
      <button
        className="act-status-pill act-status-skip"
        onClick={onSkip}
        aria-label="Marcar como no hecho, tocá para deshacer"
      >
        <XIcon size={11} />
        <span>No hecho</span>
        <span className="act-undo">Deshacer</span>
      </button>
    );
  }
  return (
    <button
      className="act-btn-skip"
      onClick={onSkip}
      style={{ color }}
    >
      No hice
    </button>
  );
}

function ConfirmDelete({ onCancel, onDelete }) {
  return (
    <div style={{ margin: '6px 0', padding: '8px 10px', background: 'rgba(220,38,38,0.07)', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 600, marginBottom: 6 }}>Actividad completada. ¿Eliminar?</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancelar</button>
        <button onClick={onDelete} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '8px 0', borderRadius: 6, border: 'none', background: 'var(--red-600)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar</button>
      </div>
    </div>
  );
}

function GymCard({ act, onDone, onSkip, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const c = ACT_COLORS.gym;
  const skipped = act.skipped && !act.done;
  return (
    <div className={`hoy-card${skipped ? ' is-skipped' : ''}`} style={{ background: c.bg }}>
      <CardLeft type="gym" time={act.time} c={c} />
      <div className="hoy-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div className="hoy-card-title" style={{ color: c.title }}>Gimnasio</div>
          {onDelete && (
            <button onClick={() => act.done ? setConfirmDel(true) : onDelete()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px 0 2px 4px', lineHeight: 0 }} aria-label="Eliminar">
              <TrashIcon size={13} />
            </button>
          )}
        </div>
        {confirmDel && <ConfirmDelete onCancel={() => setConfirmDel(false)} onDelete={onDelete} />}
        {act.done ? (
          <button className="act-status-pill act-status-done" style={{ background: c.sub }} onClick={onDone}>
            <CheckIcon size={11} /> <span>Hecho</span> <span className="act-undo">Deshacer</span>
          </button>
        ) : (
          <div className="act-actions">
            <button className="act-btn-done" style={{ background: c.sub }} onClick={onDone}>
              Marcar hecho
            </button>
            <SkipControl skipped={skipped} color={c.sub} onSkip={onSkip} />
          </div>
        )}
      </div>
    </div>
  );
}

function IndivCard({ act, routines, history, todayKey, onStart, onSkip, onPreview, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const c = ACT_COLORS.indiv;
  const r = routines.find(r => r.id === act.routineId);
  const title = r ? r.name : 'Entrenamiento individual';
  const sub = r
    ? [r.phases?.length > 0 ? `${r.phases.length} fases` : '', r.duration ? `~${r.duration}` : ''].filter(Boolean).join(' · ')
    : '';
  const exIds = r ? new Set(r.phases?.flatMap(p => p.exercises?.map(e => e.ref) || []) || []) : new Set();
  const totalEx = exIds.size;
  const doneEx = Object.entries(history[todayKey]?.completed || {}).filter(([id, done]) => done && exIds.has(id)).length;
  const started = doneEx > 0;
  const skipped = act.skipped && !act.done;

  return (
    <div className={`hoy-card${skipped ? ' is-skipped' : ''}`} style={{ background: c.bg }}>
      <CardLeft type="indiv" time={act.time} c={c} />
      <div className="hoy-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div className="hoy-card-title" style={{ color: c.title }}>{title}</div>
          {onDelete && (
            <button onClick={() => act.done ? setConfirmDel(true) : onDelete()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px 0 2px 4px', lineHeight: 0 }} aria-label="Eliminar">
              <TrashIcon size={13} />
            </button>
          )}
        </div>
        {sub && <div className="hoy-card-sub" style={{ color: c.sub }}>{sub}</div>}
        {confirmDel && <ConfirmDelete onCancel={() => setConfirmDel(false)} onDelete={onDelete} />}
        {totalEx > 0 && !act.done && (
          <div className="hoy-progress">
            <div className="hoy-progress-fill" style={{ width: `${(doneEx / totalEx) * 100}%`, background: c.sub }} />
          </div>
        )}
        {act.done ? (
          <div className="hoy-done-badge" style={{ color: c.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckIcon size={11} /><span style={{ color: c.sub }}>Completado{totalEx > 0 ? ` · ${doneEx}/${totalEx}` : ''}</span>
          </div>
        ) : (
          <div className="act-actions">
            {onStart && (
              <button className="act-btn-start" style={{ background: c.sub }} onClick={onStart}>
                <PlayIcon size={10} /> {started ? 'Continuar' : 'Empezar'}
              </button>
            )}
            {r && onPreview && (
              <button className="act-btn-ghost" style={{ borderColor: c.sub, color: c.sub }} onClick={onPreview}>
                Ver
              </button>
            )}
            {onSkip && <SkipControl skipped={skipped} color={c.sub} onSkip={onSkip} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ArsenalCard({ act, onDelete }) {
  const c = ACT_COLORS.arsenal;
  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <CardLeft type="arsenal" time={act.time} c={c} />
      <div className="hoy-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div className="hoy-card-title" style={{ color: c.title }}>Arsenal — Entrenamiento</div>
          {onDelete && (
            <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px 0 2px 4px', lineHeight: 0 }} aria-label="Eliminar">
              <TrashIcon size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ act }) {
  const c = ACT_COLORS.match;
  const label = act.match?.competition || 'Partido';
  const opponent = act.match?.opponent ? `vs ${act.match.opponent}` : '';
  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <CardLeft type="match" time={act.time} c={c} />
      <div className="hoy-card-body">
        <div className="hoy-card-title" style={{ color: c.title }}>{label}</div>
        {opponent && <div className="hoy-card-sub" style={{ color: c.sub }}>{opponent}</div>}
      </div>
    </div>
  );
}

export function ActivityCard({ act, routines, history, todayKey, onGymDone, onSkip, onStart, onPreview, onDelete }) {
  const del = onDelete ? () => onDelete(act.type) : undefined;
  if (act.type === 'gym')     return <GymCard    act={act} onDone={onGymDone} onSkip={onSkip ? () => onSkip('gym') : undefined} onDelete={del} />;
  if (act.type === 'indiv')   return <IndivCard  act={act} routines={routines} history={history} todayKey={todayKey} onStart={onStart} onSkip={onSkip ? () => onSkip('indiv') : undefined} onPreview={onPreview ? () => onPreview(act.routineId) : undefined} onDelete={del} />;
  if (act.type === 'arsenal') return <ArsenalCard act={act} onDelete={del} />;
  if (act.type === 'match')   return <MatchCard  act={act} />;
  return null;
}

// ── Lista de actividades de un día con separadores de tiempo ─────────────────
export function ActivityList({ acts, ...handlers }) {
  return acts.map((act, i) => {
    const prev = acts[i - 1];
    const gapMins = prev ? timeToMins(act.time) - timeToMins(prev.time) : 0;
    return (
      <div key={`${act.type}-${i}`}>
        {gapMins > 120 && <GapIndicator gapMins={gapMins} />}
        <ActivityCard act={act} {...handlers} />
      </div>
    );
  });
}

export function RoutinePreviewModal({ routine, exerciseMap, catalog, catLinks, onClose }) {
  if (!routine) return null;
  const totalEx = routine.phases.reduce((s, p) => s + p.exercises.length, 0);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.2 }}>{routine.name}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 3 }}>{routine.duration} · {totalEx} ejercicios</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 4, lineHeight: 0 }} aria-label="Cerrar">
            <XIcon size={18} />
          </button>
        </div>
        {routine.phases.map((phase, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PHASE_COLORS[i] || 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {phase.phase}
            </div>
            <ExerciseGroupedList
              exercises={phase.exercises}
              catalog={catalog}
              exerciseMap={exerciseMap}
              catLinks={catLinks}
              mode="read"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
