import { painSection, QUALITY, Y_BALANCE_ITEMS, yBalanceComposite, ratio, SIDE_NAME } from './common.js';

// Umbrales propios de cadera (editables).
const T = { addAbdRatioMin: 0.8, yBalanceAntCm: 4, yBalanceCompositeMin: 94 };

export default {
  id: 'hip',
  name: 'Cadera',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 180, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 120 },
        { id: 'ext', label: 'Extensión', ref: 20 },
        { id: 'abd', label: 'Abducción', ref: 45 },
        { id: 'add', label: 'Aducción', ref: 30 },
        { id: 'ri', label: 'Rotación interna (90° flex)', ref: 45 },
        { id: 're', label: 'Rotación externa (90° flex)', ref: 45 },
      ],
    },
    {
      id: 'strength', title: 'Fuerza isométrica', subtitle: 'Dinamometría (kg)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 200, step: 0.1,
      items: [
        { id: 'abd', label: 'Abductores' },
        { id: 'add', label: 'Aductores' },
        { id: 'ext', label: 'Extensores' },
        { id: 'flex', label: 'Flexores' },
        { id: 'ri', label: 'Rotadores internos' },
        { id: 're', label: 'Rotadores externos' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'thomas', label: 'Thomas', options: ['Negativo', 'Positivo – iliopsoas', 'Positivo – recto femoral', 'Positivo – TFL / banda IT'] },
        { id: 'faber', label: 'FABER (Patrick)', options: ['Negativo', 'Positivo – dolor anterior', 'Positivo – dolor posterior / SI', 'Positivo – limitación'] },
        { id: 'fadir', label: 'FADIR', options: ['Negativo', 'Positivo'] },
        { id: 'ober', label: 'Ober', options: ['Negativo', 'Positivo'] },
      ],
    },
    {
      id: 'functional', title: 'Funcionales', subtitle: 'Y-Balance (cm) y control motor',
      kind: 'performance',
      items: [
        ...Y_BALANCE_ITEMS,
        { id: 'sls', label: 'Single-leg squat', type: 'select', kind: 'test', ...QUALITY },
      ],
    },
    painSection(),
  ],

  derived(data, patient) {
    const findings = [];
    const addAbd = { R: ratio(data, 'strength', 'add', 'abd', 'R'), L: ratio(data, 'strength', 'add', 'abd', 'L') };
    const comp = { R: yBalanceComposite(data, patient, 'R'), L: yBalanceComposite(data, patient, 'L') };
    for (const s of ['R', 'L']) {
      if (addAbd[s] !== null && addAbd[s] < T.addAbdRatioMin) {
        findings.push({ key: 'derived.addabd.low', level: 'alert', text: `Ratio ADD/ABD ${SIDE_NAME[s]}: ${addAbd[s].toFixed(2)} (mín. ${T.addAbdRatioMin})` });
      }
      if (comp[s] !== null && comp[s] < T.yBalanceCompositeMin) {
        findings.push({ key: 'derived.ybal_comp.low', level: 'warn', text: `Y-Balance composite ${SIDE_NAME[s]}: ${comp[s].toFixed(1)}% (mín. ${T.yBalanceCompositeMin}%)` });
      }
    }
    const ar = data?.functional?.ybal_ant?.R, al = data?.functional?.ybal_ant?.L;
    if (ar && al && Math.abs(ar - al) > T.yBalanceAntCm) {
      findings.push({ key: 'derived.ybal_ant.diff', level: 'warn', text: `Y-Balance anterior: diferencia ${Math.abs(ar - al).toFixed(1)} cm (> ${T.yBalanceAntCm} cm)` });
    }
    return {
      metrics: [
        { label: 'Ratio ADD/ABD', R: addAbd.R, L: addAbd.L, digits: 2 },
        { label: 'Y-Balance composite', R: comp.R, L: comp.L, digits: 1, unit: '%' },
      ],
      findings,
    };
  },

  // Hallazgo → ejercicios. Contenido semilla: reemplázalo por tus progresiones.
  protocols: {
    'rom.flex.deficit': ['Rock-back en cuadrupedia', 'Flexión de cadera activa en supino con banda'],
    'rom.ext.deficit': ['Estiramiento de flexores en half-kneeling con retroversión', 'Couch stretch'],
    'rom.abd.deficit': ['Aductor rock-back (frog)', 'Cossack squat asistido'],
    'rom.add.deficit': ['Estiramiento de glúteo medio / TFL en decúbito lateral'],
    'rom.ri.deficit': ['90/90 con transiciones activas', 'Rotación interna activa en sedente (lift-offs)'],
    'rom.re.deficit': ['90/90 énfasis pierna delantera', 'Pigeon activo'],
    'derived.addabd.low': ['Copenhagen plank (progresión corta → larga)', 'Aducción isométrica con balón'],
    'strength.abd.asym': ['Side-lying hip abduction', 'Monster walk / lateral walk con banda'],
    'strength.ext.asym': ['Hip thrust unilateral', 'RDL unilateral'],
    'strength.add.asym': ['Copenhagen plank unilateral'],
    'strength.flex.asym': ['Flexión de cadera en supino con banda', 'Psoas march'],
    'strength.ri.asym': ['Rotación interna isométrica en 90/90'],
    'strength.re.asym': ['Clamshell con banda', 'Rotación externa isométrica en 90/90'],
    'special.thomas.pos': ['Estiramiento de flexores en half-kneeling', 'Movilidad de recto femoral (couch stretch)'],
    'special.ober.pos': ['Movilidad de TFL con foam roller', 'Fortalecimiento de glúteo medio'],
    'special.faber.pos': ['Revisar origen del dolor antes de cargar movilidad en RE'],
    'special.fadir.pos': ['Evitar rangos finales en flexión + RI con carga', 'Considerar derivación / imagenología'],
    'derived.ybal_ant.diff': ['Step-down anterior controlado', 'Split squat con pausa'],
    'derived.ybal_comp.low': ['Reach drills en Y (progresión de alcance)', 'Balance unipodal con perturbación'],
    'functional.sls.pos': ['Single-leg squat a cajón con feedback de valgo', 'Step-down lateral'],
    'pain.activity.high': ['Ajustar volumen / intensidad de entrenamiento', 'Monitorear respuesta 24 h post sesión'],
    'pain.rest.high': ['Dolor en reposo: priorizar evaluación médica antes de progresar carga'],
  },
};
