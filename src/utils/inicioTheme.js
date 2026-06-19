// Identidad visual de la pantalla de Inicio: oscura, seria, exigente.
// Paleta compartida por Hoy, la pantalla trabada (LockedPlan) y donde haga falta,
// para no repetir los hex sueltos.
export const INICIO = {
  bg:           '#14151A', // fondo de la pantalla (casi negro)
  card:         '#181A20', // cards/cajas internas
  border:       '#2F323B', // borde 0.5px de las cards
  radius:       18,

  bronze:       '#C9A24B', // acento principal (oro apagado)
  bronzeDim:    '#8A6D2E', // fin del gradiente bronce
  critical:     '#A8392E', // acento crítico (rojo ladrillo)
  criticalLight:'#D4655A',
  criticalDim:  '#6E241C', // fin del gradiente crítico

  textMain:     '#FFFFFF', // texto principal
  textSoft:     '#C5C8D0', // texto de apoyo
  textSofter:   '#B5B8C0', // texto de apoyo (más tenue legible)
  green:        '#5DCAA5', // solo tildes de completado

  mono:         'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',

  // Barra fina superior (3px)
  barBronze:    'linear-gradient(90deg, #C9A24B, #8A6D2E)',
  barCritical:  'linear-gradient(90deg, #A8392E, #6E241C)',
};
