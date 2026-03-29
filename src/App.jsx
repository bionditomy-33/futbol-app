import { useState, useRef } from 'react';
import Hoy from './pages/Hoy';
import Semana from './pages/Semana';
import Rutinas from './pages/Rutinas';
import Lab from './pages/Lab';
import Catalogo from './pages/Catalogo';
import Partidos from './pages/Partidos';
import Historial from './pages/Historial';

const TABS = [
  { id: 'hoy',      label: 'HOY' },
  { id: 'semana',   label: 'SEMANA' },
  { id: 'rutinas',  label: 'RUTINAS' },
  { id: 'lab',      label: 'LAB' },
  { id: 'catalogo', label: 'CATALOGO' },
  { id: 'partidos', label: 'PARTIDOS' },
  { id: 'historial',label: 'HISTORIAL' },
];

export default function App() {
  const [tab, setTab] = useState('hoy');
  const [labRoutine, setLabRoutine] = useState(null);
  const [pendingTab, setPendingTab] = useState(null); // tab esperando confirmación
  const labIsDirtyRef = useRef(false); // ref para evitar re-renders

  function goToLab(routine = null) {
    setLabRoutine(routine);
    setTab('lab');
  }

  function labDone() {
    labIsDirtyRef.current = false;
    setLabRoutine(null);
    setTab('rutinas');
  }

  function handleTabClick(id) {
    if (id === 'lab') {
      // Ir al Lab siempre: si ya estamos en Lab con cambios, preguntar
      if (tab === 'lab' && labIsDirtyRef.current) {
        setPendingTab('lab-new'); // quiere abrir Lab limpio
      } else {
        goToLab(null);
      }
      return;
    }

    if (tab === 'lab' && labIsDirtyRef.current) {
      setPendingTab(id);
    } else {
      setTab(id);
    }
  }

  function confirmLeave() {
    labIsDirtyRef.current = false;
    if (pendingTab === 'lab-new') {
      goToLab(null);
    } else {
      setTab(pendingTab);
    }
    setPendingTab(null);
  }

  function cancelLeave() {
    setPendingTab(null);
  }

  return (
    <div className="app-container">
      {/* Tab bar */}
      <nav className="tabs-bar">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`tab-item${tab === t.id ? ' active' : ''}`}
            onClick={() => handleTabClick(t.id)}
          >
            {t.label}
          </div>
        ))}
      </nav>

      {/* Pages */}
      {tab === 'hoy'      && <Hoy />}
      {tab === 'semana'   && <Semana />}
      {tab === 'rutinas'  && (
        <Rutinas
          onEdit={(routine) => goToLab(routine)}
          onNew={() => goToLab(null)}
        />
      )}
      {tab === 'lab' && (
        <Lab
          routine={labRoutine}
          onDone={labDone}
          onDirtyChange={(dirty) => { labIsDirtyRef.current = dirty; }}
        />
      )}
      {tab === 'catalogo'  && <Catalogo />}
      {tab === 'partidos'  && <Partidos />}
      {tab === 'historial' && <Historial />}

      {/* Diálogo: cambios sin guardar */}
      {pendingTab && (
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
