import { useState, useRef, useMemo } from 'react';
import { useStore } from './store/useStore';
import { useToday } from './hooks/useToday';
import { getDatesBetween } from './utils/plans';
import Hoy from './pages/Hoy';
import Planes from './pages/Planes';
import Semana from './pages/Semana';
import Calendario from './pages/Calendario';
import Rutinas from './pages/Rutinas';
import Lab from './pages/Lab';
import Catalogo from './pages/Catalogo';
import Partidos from './pages/Partidos';
import Historial from './pages/Historial';
import SemanaTipo from './pages/SemanaTipo';
import PlanDetail from './pages/PlanDetail';
import {
  HomeIcon, BallIcon, TrophyIcon, MoreHorizIcon,
  ChevronRight, EditIcon, BodyIcon, FireIcon, StarIcon, CalendarIcon,
} from './components/Icons';
import AnimatedModal from './components/AnimatedModal';
import PlanCelebration from './components/PlanCelebration';

const BOTTOM_TABS = [
  { id: 'inicio',        label: 'Inicio',        Icon: HomeIcon },
  { id: 'calendario',   label: 'Calendario',    Icon: CalendarIcon },
  { id: 'entrenamiento', label: 'Entrenamiento', Icon: BallIcon },
  { id: 'mas',          label: 'Más',           Icon: MoreHorizIcon },
];

const CALENDARIO_TABS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes',    label: 'Mes' },
];

const MAS_ITEMS = [
  {
    id: 'rutinas',
    icon: <BallIcon size={22} />,
    title: 'Rutinas',
    sub: 'Tus rutinas de entrenamiento',
  },
  {
    id: 'lab',
    icon: <EditIcon size={22} />,
    title: 'Lab',
    sub: 'Crear y editar rutinas',
  },
  {
    id: 'catalogo',
    icon: <BodyIcon size={22} />,
    title: 'Catálogo',
    sub: 'Ejercicios y categorías',
  },
  {
    id: 'partidos',
    icon: <TrophyIcon size={22} />,
    title: 'Partidos',
    sub: 'Registro de partidos jugados',
  },
  {
    id: 'historial',
    icon: <FireIcon size={22} />,
    title: 'Historial',
    sub: 'Tu progreso y respaldo de datos',
  },
  {
    id: 'planes',
    icon: <StarIcon size={22} />,
    title: 'Planes',
    sub: 'Objetivos y metas personales',
  },
  {
    id: 'semana-tipo',
    icon: <CalendarIcon size={22} />,
    title: 'Semana tipo',
    sub: 'Planificación semanal habitual',
  },
];

export default function App() {
  const { isReady, loadError, plans, history, routines, completePlan, clearWeekSchedule } = useStore();
  const [mainTab, setMainTab]                     = useState('inicio');
  const [calendarioTab, setCalendarioTab]         = useState('semana');
  const [masView, setMasView]                     = useState(null);
  const [labRoutine, setLabRoutine]               = useState(null);
  const [labReturnToRutinas, setLabReturnToRutinas] = useState(false);
  const [pendingNav, setPendingNav]               = useState(null);
  const [semanaEditToday, setSemanaEditToday]     = useState(false);
  const labIsDirtyRef = useRef(false);
  const [cleanupPrompt, setCleanupPrompt] = useState(null);
  const [planCelebration, setPlanCelebration] = useState(null);
  const TODAY = useToday();

  // Must be before any early return — React hooks must always be called unconditionally
  const activePlan = useMemo(
    () => (plans || []).find(p => p.status !== 'completed' && TODAY >= p.startDate && TODAY <= p.endDate),
    [plans, TODAY]
  );

  if (!isReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F5F7F5' }}>
        <div style={{ color: '#78909C', fontSize: 14, fontFamily: 'inherit' }}>Cargando...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F5F7F5', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#263238', textAlign: 'center' }}>
          Error al cargar los datos
        </div>
        <div style={{ fontSize: 13, color: '#78909C', textAlign: 'center' }}>
          No se pudo conectar con la base de datos. Verificá tu conexión e intentá de nuevo.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1D3461', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const isInLab = mainTab === 'mas' && masView === 'lab';

  function goToLab(routine = null, fromRutinas = false) {
    labIsDirtyRef.current = false;
    setLabRoutine(routine);
    setLabReturnToRutinas(fromRutinas);
    setMainTab('mas');
    setMasView('lab');
  }

  function labDone() {
    labIsDirtyRef.current = false;
    setLabRoutine(null);
    if (labReturnToRutinas) {
      setMainTab('mas');
      setMasView('rutinas');
    } else {
      setMasView(null);
    }
  }

  function applyNav({ tab, view = null, subTab = null }) {
    setMainTab(tab);
    setMasView(view);
    if (subTab) setCalendarioTab(subTab);
  }

  function navigateTo(payload) {
    if (isInLab && labIsDirtyRef.current) {
      setPendingNav(payload);
    } else {
      applyNav(payload);
    }
  }

  function handleBottomTabClick(id) {
    navigateTo({ tab: id, view: null });
  }

  function confirmLeave() {
    labIsDirtyRef.current = false;
    applyNav(pendingNav);
    setPendingNav(null);
  }

  function cancelLeave() {
    setPendingNav(null);
  }

  function renderEntrenamientoTab() {
    if (activePlan) {
      return (
        <PlanDetail
          plan={activePlan}
          history={history}
          routines={routines}
          onComplete={(id, rating, notes) => {
            const p = plans.find(pl => pl.id === id);
            completePlan(id, rating, notes);
            setPlanCelebration({ planName: p?.name || '' });
            setTimeout(() => {
              setPlanCelebration(null);
              if (p?.autoApplied && p?.weekTemplateId) {
                setCleanupPrompt({ planId: id, planName: p.name, dates: getDatesBetween(p.startDate, p.endDate) });
              }
            }, 1800);
          }}
          onEdit={() => { setMainTab('mas'); setMasView('planes'); }}
          onStartToday={() => { setSemanaEditToday(true); setMainTab('calendario'); setCalendarioTab('semana'); }}
        />
      );
    }

    return (
      <div className="page-content">
        {/* Hero motivante */}
        <div className="plan-hero" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <div className="plan-hero-week">Tu camino</div>
          <div className="plan-hero-name">Empezá un plan</div>
          <div className="plan-hero-obj" style={{ maxWidth: 300 }}>
            Marcá un objetivo, seguí tu progreso semana a semana y mirá cuánto avanzás.
          </div>
          <button
            className="btn"
            style={{ marginTop: 18, background: 'white', color: 'var(--navy-800)', fontWeight: 800, padding: '13px 24px', position: 'relative', zIndex: 1 }}
            onClick={() => { setMainTab('mas'); setMasView('planes'); }}
          >
            Crear mi plan
          </button>
        </div>

        <div style={{ padding: '16px 16px 24px' }}>
          {(routines || []).length > 0 && (
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F4F3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>Mis rutinas</span>
                <button
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#1D3461', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => { setMainTab('mas'); setMasView('rutinas'); }}
                >
                  Ver todas
                </button>
              </div>
              {(routines || []).slice(0, 4).map(r => (
                <div
                  key={r.id}
                  style={{ padding: '12px 16px', borderBottom: '1px solid #F0F4F3', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D3461', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#263238', fontWeight: 500 }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMasMenu() {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Más</h1>
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MAS_ITEMS.map(item => (
            <button
              key={item.id}
              className="press"
              onClick={() => {
                if (item.id === 'lab') goToLab(null, false);
                else setMasView(item.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'white', border: '1px solid #E8ECEB',
                borderRadius: 14, padding: '16px', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', width: '100%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#E8EDF5', color: '#0A1628',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#263238' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#78909C', marginTop: 2 }}>{item.sub}</div>
              </div>
              <ChevronRight size={16} style={{ color: '#B0BEC5', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">

      {/* Pages */}
      {mainTab === 'inicio' && (
        <Hoy
          onGoToDesafios={() => { setMainTab('mas'); setMasView('planes'); }}
          onGoToEntreno={() => { setSemanaEditToday(true); setMainTab('calendario'); setCalendarioTab('semana'); }}
        />
      )}

      {mainTab === 'calendario' && (
        <div>
          <div className="sub-tabs-bar">
            {CALENDARIO_TABS.map(t => (
              <div
                key={t.id}
                className={`sub-tab-item${calendarioTab === t.id ? ' active' : ''}`}
                onClick={() => setCalendarioTab(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>
          {calendarioTab === 'semana' && <Semana editToday={semanaEditToday} onConsumed={() => setSemanaEditToday(false)} />}
          {calendarioTab === 'mes'    && <Calendario />}
        </div>
      )}

      {mainTab === 'entrenamiento' && renderEntrenamientoTab()}

      {mainTab === 'mas' && masView === null        && renderMasMenu()}
      {mainTab === 'mas' && masView === 'lab'       && (
        <Lab
          routine={labRoutine}
          onDone={labDone}
          onDirtyChange={(dirty) => { labIsDirtyRef.current = dirty; }}
        />
      )}
      {mainTab === 'mas' && masView === 'rutinas'   && (
        <Rutinas
          onEdit={(routine) => goToLab(routine, true)}
          onNew={() => goToLab(null, true)}
          onBack={() => setMasView(null)}
        />
      )}
      {mainTab === 'mas' && masView === 'catalogo'  && <Catalogo   onBack={() => setMasView(null)} />}
      {mainTab === 'mas' && masView === 'partidos'  && <Partidos   onBack={() => setMasView(null)} />}
      {mainTab === 'mas' && masView === 'historial' && <Historial  onBack={() => setMasView(null)} />}
      {mainTab === 'mas' && masView === 'planes'    && <Planes     onBack={() => setMasView(null)} />}
      {mainTab === 'mas' && masView === 'semana-tipo' && <SemanaTipo onBack={() => setMasView(null)} />}

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {BOTTOM_TABS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`bottom-nav-item${mainTab === id ? ' active' : ''}`}
            onClick={() => handleBottomTabClick(id)}
          >
            <Icon size={22} />
            <span className="bottom-nav-label">{label}</span>
          </div>
        ))}
      </nav>

      {/* Plan completion celebration */}
      {planCelebration && <PlanCelebration planName={planCelebration.planName} />}

      {/* Cleanup prompt after plan completion */}
      <AnimatedModal open={!!cleanupPrompt} onClose={() => setCleanupPrompt(null)} sheetStyle={{ padding: '24px 20px 32px' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
          Actividades del plan
        </div>
        <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
          ¿Querés limpiar las actividades del plan{' '}
          <strong style={{ color: '#263238' }}>"{cleanupPrompt?.planName}"</strong> del calendario o mantenerlas?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCleanupPrompt(null)}>
            Mantener
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { clearWeekSchedule(cleanupPrompt.dates); setCleanupPrompt(null); }}>
            Limpiar
          </button>
        </div>
      </AnimatedModal>

      {/* Unsaved changes dialog */}
      <AnimatedModal open={!!pendingNav} onClose={cancelLeave} sheetStyle={{ padding: '24px 20px 32px' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
          Cambios sin guardar
        </div>
        <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
          Si salís ahora se pierden los cambios que hiciste en la rutina.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={cancelLeave}>
            Quedarme
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={confirmLeave}>
            Salir sin guardar
          </button>
        </div>
      </AnimatedModal>
    </div>
  );
}
