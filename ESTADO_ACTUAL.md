# Estado actual de la app — Entrenamiento de fútbol

> Última actualización: 2026-03-27

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 |
| Build tool | Vite 8 |
| Estilos | Tailwind CSS 4 + CSS custom (index.css) |
| Tipografía | Outfit (Google Fonts) + system fallback |
| Estado global | Custom hook con singleton + localStorage |
| Backend | Ninguno — todo client-side |
| Persistencia | localStorage del navegador |

---

## Estructura de archivos

```
futbol-app/
├── index.html                  # Entry point, importa fuente Outfit
├── src/
│   ├── App.jsx                 # Raíz: tab bar + routing entre páginas
│   ├── main.jsx                # Monta React en #root
│   ├── index.css               # Sistema de estilos completo (variables CSS, clases)
│   │
│   ├── pages/
│   │   ├── Hoy.jsx             # Dashboard del día de hoy
│   │   ├── Semana.jsx          # Vista semanal + detalle de día
│   │   ├── Rutinas.jsx         # Listado + vista detallada de rutinas
│   │   ├── Lab.jsx             # Editor de rutinas (crear / editar)
│   │   ├── Catalogo.jsx        # Catálogo de ejercicios (CRUD)
│   │   └── Historial.jsx       # Historial de actividad + métricas
│   │
│   ├── components/
│   │   ├── DayEditor.jsx       # Editor reutilizable de un día (cualquier fecha)
│   │   ├── ExercisePicker.jsx  # Modal para elegir ejercicio del catálogo
│   │   └── Icons.jsx           # Librería de íconos SVG inline
│   │
│   ├── store/
│   │   └── useStore.js         # Estado global: singleton + listeners + localStorage
│   │
│   ├── data/
│   │   └── initialData.js      # Catálogo y rutinas iniciales (seed data)
│   │
│   └── utils/
│       └── dates.js            # Helpers de fechas (formato, semana, etc.)
```

---

## Modelo de datos

Todo persiste en **localStorage** con cuatro claves independientes.

### `catalog` — Catálogo de ejercicios

```js
{
  "Nombre de categoría": [
    {
      id: "bm-1",          // string único
      name: "Inside Foot U",
      link: "https://..." // opcional, URL de video
    },
    ...
  ],
  ...
}
```

Categorías pre-cargadas (8): Movilidad, Ball Mastery, Primer Toque Aereo, Dribbling - Close Control, Dribbling - Velocidad, Definicion, Tecnica - Pase, Primer Toque con Pared.

Total inicial: ~71 ejercicios. El catálogo es completamente editable en runtime.

---

### `routines` — Rutinas de entrenamiento

```js
[
  {
    id: "r-1",             // "r-{timestamp}" para las creadas por el usuario
    name: "Tecnica Pura",
    subtitle: "Pase y primer toque",
    duration: "~50 min",
    phases: [
      {
        phase: "Calentamiento corporal",  // nombre de la fase
        time: "8 min",                    // texto libre, opcional
        note: "...",                      // nota/indicación general, opcional
        exercises: [
          {
            ref: "mov-1",   // id del ejercicio en el catálogo
            series: "1",    // texto libre
            reps: "10 reps" // texto libre
          }
        ]
      },
      ...
    ]
  }
]
```

**Fases fijas** (siempre presentes, no eliminables desde el Lab):
1. `"Calentamiento corporal"` — movilidad y activación física sin pelota
2. `"Calentamiento con balon"` — ball mastery, juggling, primer toque suave
3. `"Sesion principal"` — bloque principal de la sesión

**Fases extra (custom)**: el usuario puede agregar fases adicionales con nombre libre; estas sí son eliminables.

**Migración automática**: al iniciar, si en localStorage existen rutinas con los nombres viejos (`"Movilidad"`, `"Calentamiento"`, `"Entrenamiento"`), se renombran automáticamente a los nuevos y se guardan.

Rutinas iniciales pre-cargadas (3): Tecnica Pura, Regate + Velocidad, Definicion.

---

### `schedule` — Planificación

```js
{
  "2026-03-27": "r-1",   // dateStr (YYYY-MM-DD) → routineId
  "2026-03-28": "r-2",
  ...
}
```

Un día puede tener asignada una sola rutina, o no tener nada (descanso).

---

### `history` — Historial de actividad

```js
{
  "2026-03-27": {
    done: true,              // true = entrenamiento marcado como completado
    routineId: "r-1",        // qué rutina se completó
    completed: {
      "tp-1": true,          // ejerciseId → completado o no
      "tp-2": false,
      ...
    },
    gym: true,               // fue al gimnasio ese día (independiente de la rutina)
    notes: "Texto libre..."  // notas del día
  },
  ...
}
```

El campo `gym` es independiente: puede ser `true` aunque `done` sea `false` (día sin rutina pero fue al gym).

---

## Estado global — `useStore.js`

Implementado como **singleton con listeners**. Un módulo-nivel `state` object es compartido entre todas las instancias del hook. Cada componente que llama `useStore()` se registra como listener y se re-renderiza cuando el estado cambia.

### Acciones disponibles

| Acción | Descripción |
|--------|-------------|
| `assignRoutine(dateStr, routineId)` | Asigna una rutina a un día |
| `removeSchedule(dateStr)` | Quita la rutina de un día (descanso) |
| `getDay(dateStr)` | Devuelve el historial de un día (con defaults si no existe) |
| `updateDay(dateStr, patch)` | Actualiza campos del historial de un día |
| `toggleExercise(dateStr, exerciseId)` | Alterna el checkmark de un ejercicio |
| `completeDay(dateStr, routineId)` | Marca el día como completado |
| `uncompleteDay(dateStr)` | Reabre un día completado |
| `saveRoutine(routine)` | Crea o actualiza una rutina |
| `deleteRoutine(id)` | Elimina rutina y la quita del schedule |
| `duplicateRoutine(id)` | Clona una rutina con nuevo id y nombre "(copia)" |
| `addExercise(category, exercise)` | Agrega ejercicio al catálogo |
| `editExercise(id, patch)` | Edita nombre/link de un ejercicio |
| `deleteExercise(id)` | Elimina ejercicio del catálogo |
| `addCategory(name)` | Crea categoría vacía en el catálogo |
| `deleteCategory(name)` | Elimina categoría (solo si está vacía) |
| `isExerciseUsed(id)` | Devuelve true si el ejercicio está en alguna rutina |

---

## Componentes — descripción detallada

### `App.jsx`
Raíz de la aplicación. Maneja la navegación por tabs (6 tabs) y el estado `labRoutine` para saber si el Lab está creando una rutina nueva o editando una existente. Pasa callbacks `onEdit` y `onNew` a Rutinas, y `routine` + `onDone` al Lab.

---

### `pages/Hoy.jsx` — Dashboard del día de hoy
**Siempre muestra el día actual.** No se puede navegar a otros días desde acá (para eso está Semana).

Contenido:
- **Header**: nombre del día y fecha completa
- **Stats rápidos** (3 cards): Racha de días consecutivos entrenados, completados de la semana actual (X/Y), % de cumplimiento del mes
- **Mini calendario semanal**: 7 días de lun a dom, cada uno con un punto de color (verde=completado, rojo=perdido, amarillo=pendiente con rutina, gris=sin nada)
- **DayEditor** para el día de hoy (ver más abajo)
- **Próximo entrenamiento**: busca los próximos 14 días con rutina asignada
- **Frase motivacional**: 25 frases hardcodeadas, rota por día del año

---

### `components/DayEditor.jsx` — Editor de día (compartido)
Componente reutilizable que maneja la edición completa de **cualquier fecha** (hoy o días pasados). Usado por `Hoy.jsx` y por `Semana.jsx` cuando se abre el detalle de un día.

Estados internos:
- `showSelector`: booleano para mostrar/ocultar el selector de rutina

Flujo según estado del día:
1. **Sin rutina, sin completar** → botón "Asignar rutina" → abre selector
2. **Con rutina, sin completar** → muestra nombre, progreso, fases con ejercicios checkeable; botón "Cambiar" → abre selector; botón "Completar entrenamiento"
3. **Completado** → banner de completado con resumen; botón "Reabrir entrenamiento"

El **selector de rutina** incluye siempre:
- Opción "Sin rutina / Descanso" (limpia el día) al tope
- Lista de todas las rutinas disponibles

El **toggle de gym** aparece siempre, independientemente de si hay rutina o no, y en cualquier estado (incluso completado).

Las **notas** del día también siempre visibles.

---

### `pages/Semana.jsx` — Vista semanal
Muestra la semana completa (lunes a domingo) con navegación entre semanas.

- **Navegación**: flechas anterior/siguiente + label contextual ("Esta semana", "Semana pasada", "Hace 2 semanas", etc.) + botón "Volver a hoy" cuando no estás en la semana actual
- **Métricas de la semana**: % cumplimiento, completados/planificados, racha
- **Tarjetas de días**: cada día muestra estado (Completado/Pendiente/Planificado/No hecho/Descanso), nombre de la rutina asignada, badge de Gym si fue ese día
- **Todos los días son clickeables** (pasados, presente y futuros). Al tocar uno, abre la vista de detalle con `DayEditor` para esa fecha, con un header que muestra el día y un botón de volver.

---

### `pages/Rutinas.jsx` — Listado de rutinas
Lista todas las rutinas creadas. Para cada una muestra nombre, subtítulo, duración, cantidad de ejercicios, categorías usadas y un resumen de fases.

Acciones por rutina:
- **Ver** (ojo): abre `RutinaDetail` — vista de solo lectura con las fases y ejercicios en colores
- **Editar** (lápiz): navega al Lab con la rutina precargada
- **Copiar**: duplica la rutina con el sufijo "(copia)"
- **Borrar**: doble confirmación (primer click muestra "¿Seguro?", segundo borra)

**RutinaDetail** (componente local dentro de Rutinas.jsx): vista detallada con fases coloreadas por tipo (verde/amarillo/azul/gris), íconos por fase, ejercicios numerados con series/reps y botón Video cuando tiene link.

---

### `pages/Lab.jsx` — Editor de rutinas
Formulario para crear o editar rutinas.

- **Campos generales**: Nombre (obligatorio), Subtítulo, Duración
- **Fases fijas** con color según tipo:
  - "Calentamiento corporal" → fondo verde claro, borde verde
  - "Calentamiento con balon" → fondo amarillo claro, borde amarillo
  - "Sesion principal" → fondo azul claro, borde azul
- **Fases custom**: botón "Agregar seccion extra" → pide nombre → crea fase con estilo gris; las custom son eliminables, las 3 fijas no
- Por fase: campo de tiempo, nota, lista de ejercicios (con series/reps editables, botones subir/bajar/eliminar), botón "Agregar ejercicio" que abre `ExercisePicker`
- Botones: Cancelar (vuelve a Rutinas sin guardar) y Guardar/Crear

---

### `pages/Catalogo.jsx` — Catálogo editable
Lista todas las categorías y ejercicios. Cada categoría es colapsable y tiene un color distintivo.

Funcionalidades:
- **Agregar ejercicio**: botón en el header → formulario con nombre, categoría (selector de existentes o crear nueva), link de video opcional
- **Crear categoría nueva**: desde el mismo formulario de agregar ejercicio
- **Editar ejercicio**: botón lápiz → formulario inline (nombre + link)
- **Eliminar ejercicio**: botón papelera → confirmación inline; si el ejercicio está en uso en alguna rutina, muestra aviso "En uso" antes de confirmar
- **Eliminar categoría**: solo aparece el botón de eliminar en categorías vacías (sin ejercicios)

---

### `pages/Historial.jsx` — Historial de actividad
Muestra toda la actividad registrada, ordenada de más reciente a más antigua.

Incluye días donde:
- `done === true` (entrenamiento completado), O
- `gym === true` (fue al gym aunque no haya completado rutina)

Métricas del mes actual (3 cards):
- % de cumplimiento (entrenamientos completados / planificados)
- Entrenamientos completados del mes
- Días de gym del mes

Cada entrada muestra: nombre de la rutina (o "Solo gimnasio"), día y fecha, badges de tipo ("Entreno ✓" en verde y/o "Gym" en azul), cantidad de ejercicios completados, notas.

---

### `components/ExercisePicker.jsx` — Selector de ejercicio
Modal bottom-sheet para elegir un ejercicio del catálogo al editar una rutina en el Lab.

- Buscador de texto libre (filtra por nombre en tiempo real)
- Categorías con color distintivo; colapsables cuando no hay búsqueda activa; abiertas automáticamente al buscar
- Cada ejercicio tiene botón "+" para agregar y botón "Video" si tiene link
- Hover con color de la categoría

---

### `components/Icons.jsx` — Íconos SVG
Librería de íconos SVG inline. Todos aceptan prop `size`. Íconos disponibles:

`CheckIcon`, `PlayIcon`, `PlusIcon`, `ChevronDown`, `ChevronUp`, `ChevronLeft`, `TrashIcon`, `EditIcon`, `EyeIcon`, `CopyIcon`, `ArrowUpIcon`, `ArrowDownIcon`, `XIcon`, `GymIcon`, `CalendarIcon`, `CheckCircleIcon`, `FireIcon`, `BodyIcon`, `BallIcon`, `StarIcon`

---

### `utils/dates.js` — Helpers de fechas
Funciones utilitarias:

| Función | Descripción |
|---------|-------------|
| `toDateStr(date)` | Date → `"YYYY-MM-DD"` |
| `todayStr()` | Hoy como `"YYYY-MM-DD"` |
| `getWeekDays(date)` | Array de 7 Date (lun a dom de la semana que contiene `date`) |
| `formatDate(dateStr)` | `"Jueves, 27 de marzo 2026"` |
| `formatDateShort(dateStr)` | `"Jue 27/3"` |
| `getDayName(dateStr)` | `"Jueves"` |
| `getMonthYear(dateStr)` | `"marzo 2026"` |
| `daysInMonth(year, month)` | Cantidad de días en el mes |

---

## Sistema visual

### Paleta de colores
| Variable | Valor | Uso |
|----------|-------|-----|
| `--green-dark` | `#1B5E20` | Tab bar, botones primarios, accentos fuertes |
| `--green-main` | `#2E7D32` | Hover de botones, textos positivos |
| `--green-mid` | `#4CAF50` | Checkboxes, progress bar, borde fase corporal |
| `--green-light` | `#E8F5E9` | Fondo fase "Calentamiento corporal" |
| `--yellow-main` | `#FFC107` | Borde fase "Calentamiento con balon" |
| `--yellow-light` | `#FFF8E1` | Fondo fase "Calentamiento con balon" |
| `--blue-main` | `#1976D2` | Borde fase "Sesion principal" |
| `--blue-light` | `#E3F2FD` | Fondo fase "Sesion principal", badge gym |
| `--red-main` | `#EF5350` | Errores, eliminar, días perdidos |
| `--text-primary` | `#263238` | Texto principal |
| `--text-secondary` | `#78909C` | Texto secundario, labels |

### Clases CSS reutilizables principales
`.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-full`, `.badge`, `.badge-green`, `.badge-red`, `.badge-blue`, `.badge-yellow`, `.badge-gray`, `.input`, `.phase-block`, `.phase-corporal`, `.phase-balon`, `.phase-principal`, `.phase-extra`, `.metrics-row`, `.metric-card`, `.modal-overlay`, `.modal-sheet`, `.day-card`, `.exercise-item`, `.checkbox-custom`, `.progress-bar`, `.form-group`, `.form-label`, `.page-header`, `.page-title`, `.mini-cal-day`, `.frase-card`

---

## Features completos y funcionando

### Rutinas
- [x] Crear rutina (nombre, subtítulo, duración)
- [x] Editar rutina existente
- [x] Duplicar rutina
- [x] Eliminar rutina (con doble confirmación)
- [x] Ver rutina en detalle (solo lectura, con colores por fase)
- [x] 3 fases fijas con colores e íconos diferenciados
- [x] Agregar fases custom (nombre libre, eliminables)
- [x] Agregar/reordenar/eliminar ejercicios por fase
- [x] Configurar series y reps por ejercicio

### Catálogo
- [x] Ver todos los ejercicios agrupados por categoría
- [x] Agregar ejercicio (nombre, categoría, link)
- [x] Crear nueva categoría al agregar ejercicio
- [x] Editar nombre y link de un ejercicio
- [x] Eliminar ejercicio (con aviso si está en uso en alguna rutina)
- [x] Eliminar categoría vacía
- [x] Búsqueda de ejercicios en el ExercisePicker

### Planificación (Schedule)
- [x] Asignar rutina a cualquier día (pasado, presente o futuro)
- [x] Cambiar la rutina de un día (selector incluye "Sin rutina / Descanso")
- [x] Quitar rutina de un día (dejarlo como descanso)
- [x] Navegación entre semanas en la vista Semana

### Tracking de entrenamiento
- [x] Marcar ejercicios como completados (checkbox) — cualquier día
- [x] Progress bar con porcentaje de ejercicios hechos
- [x] Completar el entrenamiento del día
- [x] Reabrir un entrenamiento completado
- [x] Registrar notas del día
- [x] Editar días pasados (desde Semana → detalle del día)

### Gym tracking (independiente)
- [x] Marcar gym en cualquier día, con o sin rutina asignada
- [x] El toggle de gym siempre visible (no depende de la rutina)
- [x] Gym visible en las tarjetas de la vista Semana
- [x] Días de solo-gym aparecen en el Historial
- [x] Métrica de "Días gym" en el Historial separada de los entrenamientos

### Dashboard (Hoy)
- [x] Saludo con día y fecha completa
- [x] Racha de días consecutivos entrenados
- [x] Stats de la semana actual (completados/planificados)
- [x] % de cumplimiento del mes
- [x] Mini calendario semanal con indicadores de color
- [x] Próximo entrenamiento programado (busca 14 días adelante)
- [x] Frase motivacional diaria (25 frases, rota por día del año)

### Historial
- [x] Listado de actividad (entrenamientos + días de gym) ordenado por fecha
- [x] Métricas del mes: % cumplimiento, entrenamientos, días de gym
- [x] Diferenciación visual entre "Entreno" y "Gym" con badges de color

### Migración de datos
- [x] Al iniciar, renombra automáticamente fases con nombres viejos en localStorage

### Persistencia
- [x] Todo se guarda en localStorage automáticamente al modificar
- [x] Funciona offline completamente

---

## Lo que NO está implementado

- Backend / sincronización en la nube
- Autenticación / multi-usuario
- Notificaciones / recordatorios
- Exportar / importar datos
- Estadísticas avanzadas (gráficos de progreso temporal, etc.)
- Links de video para la mayoría de los ejercicios del catálogo inicial (solo 5 tienen link)
- PWA / instalación en homescreen (aunque funciona en el navegador del celular)
