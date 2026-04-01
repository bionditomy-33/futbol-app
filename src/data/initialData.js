export const INITIAL_CATALOG = {
  "Movilidad": [
    { id: "mov-1", name: "Rutina de movilidad", link: "https://www.youtube.com/watch?v=7cL5j4pOn80" }
  ],
  "Ball Mastery": [
    { id: "bm-1", name: "Inside Foot U", link: "https://www.youtube.com/watch?v=U3N_qXaqrtI" },
    { id: "bm-2", name: "Outside Foot U" },
    { id: "bm-3", name: "Inside Foot V Cut" },
    { id: "bm-4", name: "Outside Foot V Cut" },
    { id: "bm-5", name: "Alternate Foot V Cut" },
    { id: "bm-6", name: "L Drag U" },
    { id: "bm-7", name: "Sole Square" }
  ],
  "Primer Toque Aereo": [
    { id: "pta-1", name: "Inside Two touch" },
    { id: "pta-2", name: "Inside One touch" },
    { id: "pta-3", name: "Toque cordones y toque interno" },
    { id: "pta-4", name: "Toque interno y toque cordones" },
    { id: "pta-5", name: "Cordones uno y uno" },
    { id: "pta-6", name: "Rodilla y cordones (uno y uno)" },
    { id: "pta-7", name: "Rodilla y toque con pierna contrario" },
    { id: "pta-8", name: "Pecho, rodilla, cara interna" },
    { id: "pta-9", name: "Pecho, cara interna" },
    { id: "pta-10", name: "Cara externa y toque pierna contraria" }
  ],
  "Dribbling - Close Control": [
    { id: "dcc-1", name: "Toques Externos" },
    { id: "dcc-2", name: "Pie a pie" },
    { id: "dcc-3", name: "Pisada y toque externo" },
    { id: "dcc-4", name: "Pisada y toque interno" },
    { id: "dcc-5", name: "Pisada con doble toque" },
    { id: "dcc-6", name: "Elastica interna con parada" },
    { id: "dcc-7", name: "Pie a pie con salida externa" },
    { id: "dcc-8", name: "Bicicleta" },
    { id: "dcc-9", name: "Cuadrados en movimientos" },
    { id: "dcc-10", name: "Inside Foot V Cut" }
  ],
  "Dribbling - Velocidad": [
    { id: "dv-1", name: "Conduccion Zigzag a una pierna", link: "https://www.youtube.com/watch?v=feA7KafbwdQ&t=326s" },
    { id: "dv-2", name: "Zigzag sin conos intermedios" },
    { id: "dv-3", name: "Shuttles" },
    { id: "dv-4", name: "Figura 8" },
    { id: "dv-5", name: "Diagonal dribbling" },
    { id: "dv-6", name: "Free dribbling" }
  ],
  "Definicion": [
    { id: "def-1", name: "Tiro con empeine (estatico)" },
    { id: "def-2", name: "Tiro tras conduccion" },
    { id: "def-3", name: "Control y tiro" },
    { id: "def-4", name: "Tiro con pierna inhabil" },
    { id: "def-5", name: "Definicion tras recorte" },
    { id: "def-6", name: "Volea frontal" },
    { id: "def-7", name: "Media vuelta y tiro" }
  ],
  "Tecnica - Pase": [
    { id: "tp-1", name: "One Touch Passing", link: "https://www.tiktok.com/@jakobfootball10/video/7601204523004136726" },
    { id: "tp-2", name: "Two Touch Passing" },
    { id: "tp-3", name: "90 Passes" },
    { id: "tp-4", name: "Inside Touch" },
    { id: "tp-5", name: "Outside Touch" },
    { id: "tp-6", name: "Open Inside Touch" }
  ],
  "Primer Toque con Pared": [
    { id: "ptcp-1", name: "Touch and outside push", link: "https://www.youtube.com/watch?v=ud84rp3Vphs" },
    { id: "ptcp-2", name: "Inside directional touches" },
    { id: "ptcp-3", name: "Inside outside push" },
    { id: "ptcp-4", name: "One touch, two touch" },
    { id: "ptcp-5", name: "Inside outside roll" },
    { id: "ptcp-6", name: "One-touch angles" },
    { id: "ptcp-7", name: "Back foot pulls" },
    { id: "ptcp-8", name: "Check in, check out" },
    { id: "ptcp-9", name: "Short, short, long" },
    { id: "ptcp-10", name: "Short, long, long" }
  ]
};

export const INITIAL_ROUTINES = [
  {
    id: "r-1",
    name: "Tecnica Pura",
    subtitle: "Pase y primer toque",
    duration: "~50 min",
    phases: [
      {
        phase: "Activacion - Bloque Agilidad",
        time: "8 min",
        note: "",
        exercises: [
          { ref: "mov-1", series: "1", reps: "" }
        ]
      },
      {
        phase: "Bloque Entrenamiento Principal",
        time: "5 min",
        note: "Juggling y free dribbling 5 mins",
        exercises: []
      },
      {
        phase: "Vuelta a la calma",
        time: "30-35 min",
        note: "",
        exercises: [
          { ref: "tp-1", series: "1", reps: "150 c/u" },
          { ref: "tp-2", series: "1", reps: "100 c/u" },
          { ref: "tp-3", series: "1", reps: "75 reps" },
          { ref: "tp-4", series: "1", reps: "75 reps" },
          { ref: "tp-5", series: "1", reps: "75 reps" },
          { ref: "tp-6", series: "1", reps: "75 reps" }
        ]
      }
    ]
  },
  {
    id: "r-2",
    name: "Regate + Velocidad",
    subtitle: "Conduccion y velocidad",
    duration: "~60 min",
    phases: [
      {
        phase: "Activacion - Bloque Agilidad",
        time: "8 min",
        note: "",
        exercises: [
          { ref: "mov-1", series: "1", reps: "" }
        ]
      },
      {
        phase: "Bloque Entrenamiento Principal",
        time: "10 min",
        note: "",
        exercises: [
          { ref: "dv-1", series: "3", reps: "3 rep por pie" },
          { ref: "dv-2", series: "3", reps: "3 rep por pie" }
        ]
      },
      {
        phase: "Vuelta a la calma",
        time: "45 min",
        note: "",
        exercises: [
          { ref: "dv-3", series: "3", reps: "3 reps ida/vuelta por pie" },
          { ref: "dv-4", series: "3", reps: "5 reps por pie" },
          { ref: "dv-5", series: "3", reps: "5 reps por pie" },
          { ref: "dv-6", series: "3", reps: "5 idas y vueltas" }
        ]
      }
    ]
  },
  {
    id: "r-3",
    name: "Definicion",
    subtitle: "Finalizacion y definicion",
    duration: "~60 min",
    phases: [
      {
        phase: "Activacion - Bloque Agilidad",
        time: "8 min",
        note: "",
        exercises: [
          { ref: "mov-1", series: "1", reps: "" }
        ]
      },
      {
        phase: "Bloque Entrenamiento Principal",
        time: "10 min",
        note: "",
        exercises: []
      },
      {
        phase: "Vuelta a la calma",
        time: "45 min",
        note: "",
        exercises: []
      }
    ]
  }
];
