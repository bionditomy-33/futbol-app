// Overlay de festejo al completar un plan (se muestra ~1.8s y se descarta solo
// desde el componente padre).
export default function PlanCelebration({ planName }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,150,105,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 300, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ fontSize: 80, marginBottom: 20, animation: 'checkPop 0.4s ease' }}>✅</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>¡Plan completado!</div>
      {planName && (
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>{planName}</div>
      )}
    </div>
  );
}
