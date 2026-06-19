import { INICIO } from '../utils/inicioTheme';

// Resalta los términos clave del dominio ("GIMNASIO" / "INDIVIDUAL") en cualquier
// parte de la pantalla: bronce, monospace, mayúsculas, un poco más chico que el
// texto que lo rodea. Tiene que destacarse siempre del resto.
export default function TermTag({ children, style }) {
  return (
    <span style={{
      color: INICIO.bronze,
      fontFamily: INICIO.mono,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontSize: '0.86em',
      fontWeight: 600,
      ...style,
    }}>
      {children}
    </span>
  );
}
