// Estado vacío unificado: icono de línea fina en círculo, mensaje corto y CTA.
export default function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      {title && <div className="empty-state-title">{title}</div>}
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
