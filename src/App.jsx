import { useState, useRef } from 'react';
import Hoy from './pages/Hoy';
import Semana from './pages/Semana';
import Calendario from './pages/Calendario';
import Rutinas from './pages/Rutinas';
import Lab from './pages/Lab';
import Catalogo from './pages/Catalogo';
import Partidos from './pages/Partidos';
import Historial from './pages/Historial';
import {
  HomeIcon, BallIcon, TrophyIcon, MoreHorizIcon,
  ChevronRight, EditIcon, BodyIcon, FireIcon,
} from './components/Icons';

const BOTTOM_TABS = [
  { id: 'inicio',   label: 'Inicio',   Icon: HomeIcon },
  { id: 'entreno',  label: 'Entreno',  Icon: BallIcon },
  { id: 'partidos', label: 'Partidos', Icon: TrophyIcon },
  { id: 'mas',      label: 'Más',      Icon: MoreHorizIcon },
];

const ENTRENO_TABS = [
  { id: 'semana',      label: 'Semana' },
  { id: 'calendario',  label: 'Calendario' },
  { id: 'rutinas',     label: 'Rutinas' },
];

const MAS_ITEMS = [
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
    id: 'historial',
    icon: <FireIcon size={22} />,
    title: 'Historial',
    sub: 'Tu progreso y respaldo de datos',
  },
];

export default function App() {
  const [mainTab, setMainTab]               = useState('inicio');
  const [entrenoTab, setEntrenoTab]         = useState('semana');
  const [masView, setMasView]               = useState(null); // null | 'lab' | 'catalogo' | 'historial'
  const [labRoutine, setLabRoutine]         = useState(null);
  const [labReturnToRutinas, setLabReturnToRutinas] = useState(false);
  const [pendingNav, setPendingNav]         = useState(null);
  const labIsDirtyRef = useRef(false);

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
    setMasView(null);
    if (labReturnToRutinas) {
      setMainTab('entreno');
      setEntrenoTab('rutinas');
    }
  }

  function applyNav({ tab, view = null, subTab = null }) {
    setMainTab(tab);
    setMasView(view);
    if (subTab) setEntrenoTab(subTab);
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
                background: '#E8F5E9', color: '#1B5E20',
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
      {mainTab === 'inicio' && <Hoy />}

      {mainTab === 'entreno' && (
        <div>
          <div className="sub-tabs-bar">
            {ENTRENO_TABS.map(t => (
              <div
                key={t.id}
                className={`sub-tab-item${entrenoTab === t.id ? ' active' : ''}`}
                onClick={() => setEntrenoTab(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>
          {entrenoTab === 'semana'     && <Semana />}
          {entrenoTab === 'calendario' && <Calendario />}
          {entrenoTab === 'rutinas'    && (
            <Rutinas
              onEdit={(routine) => goToLab(routine, true)}
              onNew={() => goToLab(null, true)}
            />
          )}
        </div>
      )}

      {mainTab === 'partidos' && <Partidos />}

      {mainTab === 'mas' && masView === null     && renderMasMenu()}
      {mainTab === 'mas' && masView === 'lab'     && (
        <Lab
          routine={labRoutine}
          onDone={labDone}
          onDirtyChange={(dirty) => { labIsDirtyRef.current = dirty; }}
        />
      )}
      {mainTab === 'mas' && masView === 'catalogo'  && <Catalogo onBack={() => setMasView(null)} />}
      {mainTab === 'mas' && masView === 'historial'  && <Historial onBack={() => setMasView(null)} />}

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

      {/* Unsaved changes dialog */}
      {pendingNav && (
        <div className="modal-overlay" onClick={cancelLeave}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
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
          </div>
        </div>
      )}
    </div>
  );
}
