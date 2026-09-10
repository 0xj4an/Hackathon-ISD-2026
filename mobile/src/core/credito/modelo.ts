// GENERADO por data/cartera-sintetica.mjs. No editar a mano.
//
// Scorecard entrenado sobre una cartera SINTETICA de 3000 solicitantes con
// semilla 20260910. No hay datos reales de clientes. Las metricas de abajo
// son sobre el holdout de 600 casos que el entrenamiento no vio.
//
// AUC 0.723 · KS 0.379 · mora de la cartera 13.27%

export type DefinicionBin =
  | { clase: "categorica"; valores: string[] }
  | { clase: "numerica"; cortes: number[] };

export type Modelo = {
  semilla: number;
  n: number;
  variables: string[];
  descartadas: string[];
  bins: Record<string, DefinicionBin>;
  woe: Record<string, number[]>;
  iv: Record<string, number>;
  puntos: Record<string, number[]>;
  coeficientes: Record<string, number>;
  intercepto: number;
  bandas: { A: number; B: number; C: number; D: number };
  metricas: { auc: number; ks: number; mora_cartera: number };
};

export const MODELO: Modelo = {
  "semilla": 20260910,
  "n": 3000,
  "variables": [
    "tipo",
    "antiguedad",
    "deuda_ing",
    "monto_ing",
    "meses_extracto",
    "saldo_ing"
  ],
  "descartadas": [],
  "bins": {
    "tipo": {
      "clase": "categorica",
      "valores": [
        "asalariado",
        "jubilado",
        "independiente",
        "otro"
      ]
    },
    "antiguedad": {
      "clase": "numerica",
      "cortes": [
        24,
        60
      ]
    },
    "deuda_ing": {
      "clase": "numerica",
      "cortes": [
        0.05,
        0.15,
        0.3
      ]
    },
    "monto_ing": {
      "clase": "numerica",
      "cortes": [
        0.3,
        0.8,
        1.5
      ]
    },
    "meses_extracto": {
      "clase": "numerica",
      "cortes": [
        0.5,
        3,
        6
      ]
    },
    "saldo_ing": {
      "clase": "numerica",
      "cortes": [
        0.05,
        0.5
      ]
    }
  },
  "woe": {
    "tipo": [
      0.34317442133041964,
      0.8400991861954635,
      -0.19473714613872734,
      -1.0080884839498445
    ],
    "antiguedad": [
      -0.18456901180493748,
      -0.1718746706339872,
      0.17125427415908953
    ],
    "deuda_ing": [
      0.7055629366784825,
      0.5914141760276966,
      0.02252896730743488,
      -0.47675511741379306
    ],
    "monto_ing": [
      0.32178577762385085,
      0.342587747329272,
      0.04563268641160415,
      -0.3217419734972513
    ],
    "meses_extracto": [
      -0.3804966807504748,
      0.16416112218263804,
      0.29397693728618535,
      1.077744986069554
    ],
    "saldo_ing": [
      -0.35616038415158696,
      0.657008989041109,
      0.9505926441131326
    ]
  },
  "iv": {
    "tipo": 0.24518119996829396,
    "antiguedad": 0.0301499047457828,
    "deuda_ing": 0.2413500174965112,
    "monto_ing": 0.07415607370549632,
    "meses_extracto": 0.3094028165606172,
    "saldo_ing": 0.30367458680368087
  },
  "puntos": {
    "tipo": [
      101,
      116,
      84,
      59
    ],
    "antiguedad": [
      85,
      85,
      95
    ],
    "deuda_ing": [
      112,
      109,
      91,
      75
    ],
    "monto_ing": [
      99,
      99,
      91,
      82
    ],
    "meses_extracto": [
      84,
      93,
      95,
      109
    ],
    "saldo_ing": [
      84,
      101,
      105
    ]
  },
  "coeficientes": {
    "tipo": -1.064739327032379,
    "antiguedad": -1.0393391620219827,
    "deuda_ing": -1.0834829422778014,
    "monto_ing": -0.9130941054636948,
    "meses_extracto": -0.601815527518665,
    "saldo_ing": -0.5576796852173671
  },
  "intercepto": -1.8614083537768042,
  "bandas": {
    "A": 579,
    "B": 555,
    "C": 535,
    "D": 511
  },
  "metricas": {
    "auc": 0.7233,
    "ks": 0.3795,
    "mora_cartera": 0.1327
  }
};
