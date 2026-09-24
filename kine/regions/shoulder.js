import { painSection, POS_NEG, ratio, SIDE_NAME } from './common.js';

// Umbrales propios de hombro (editables).
const T = { erIrRatioMin: 0.66, girdDeg: 20, totalArcDiffDeg: 5 };

export default {
  id: 'shoulder',
  name: 'Hombro',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 200, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 180 },
        { id: 'ext', label: 'Extensión', ref: 60 },
        { id: 'abd', label: 'Abducción', ref: 180 },
        { id: 're', label: 'Rotación externa (90° abd)', ref: 90 },
        { id: 'ri', label: 'Rotación interna (90° abd)', ref: 70 },
        { id: 'hadd', label: 'Aducción horizontal', ref: 45 },
      ],
    },
    {
      id: 'strength', title: 'Fuerza isométrica', subtitle: 'Dinamometría (kg)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 150, step: 0.1,
      items: [
        { id: 're', label: 'Rotadores externos' },
        { id: 'ri', label: 'Rotadores internos' },
        { id: 'abd', label: 'Abductores' },
        { id: 'flex', label: 'Flexores' },
        { id: 'ext', label: 'Extensores' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'neer', label: 'Neer', options: POS_NEG },
        { id: 'hawkins', label: 'Hawkins-Kennedy', options: POS_NEG },
        { id: 'jobe', label: 'Jobe (empty can)', options: ['Negativo', 'Positivo – dolor', 'Positivo – debilidad'] },
        { id: 'drop_arm', label: 'Drop arm', options: POS_NEG },
        { id: 'belly', label: 'Belly press / Lift-off', options: POS_NEG },
        { id: 'speed', label: 'Speed', options: POS_NEG },
        { id: 'obrien', label: "O'Brien", options: POS_NEG },
        { id: 'apprehension', label: 'Aprehensión / Relocalización', options: POS_NEG },
      ],
    },
    {
      id: 'functional', title: 'Funcionales', subtitle: 'Upper Quarter Y-Balance (cm) y CKCUEST',
      kind: 'performance', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5,
      items: [
        { id: 'uqyb_med', label: 'UQ Y-Balance medial' },
        { id: 'uqyb_il', label: 'UQ Y-Balance inferolateral' },
        { id: 'uqyb_sl', label: 'UQ Y-Balance superolateral' },
        { id: 'ckcuest', label: 'CKCUEST (toques / 15 s)', single: true, unit: 'toques', step: 1 },
      ],
    },
    painSection(),
  ],

  derived(data) {
    const findings = [];
    const erIr = { R: ratio(data, 'strength', 're', 'ri', 'R'), L: ratio(data, 'strength', 're', 'ri', 'L') };
    for (const s of ['R', 'L']) {
      if (erIr[s] !== null && erIr[s] < T.erIrRatioMin) {
        findings.push({ key: 'derived.erir.low', level: 'alert', text: `Ratio RE/RI ${SIDE_NAME[s]}: ${erIr[s].toFixed(2)} (mín. ${T.erIrRatioMin})` });
      }
    }
    const n = (s, id) => {
      const v = data?.rom?.[id]?.[s];
      return v === '' || v == null ? null : Number(v);
    };
    const arc = { R: null, L: null };
    for (const s of ['R', 'L']) if (n(s, 're') !== null && n(s, 'ri') !== null) arc[s] = n(s, 're') + n(s, 'ri');
    const riR = n('R', 'ri'), riL = n('L', 'ri');
    if (riR !== null && riL !== null && Math.abs(riR - riL) >= T.girdDeg) {
      const side = riR < riL ? 'derecha' : 'izquierda';
      const arcDiff = arc.R !== null && arc.L !== null ? Math.abs(arc.R - arc.L) : null;
      const pathologic = arcDiff !== null && arcDiff > T.totalArcDiffDeg;
      findings.push({
        key: 'derived.gird',
        level: pathologic ? 'alert' : 'warn',
        text: `GIRD ${side}: ${Math.abs(riR - riL)}° de déficit de RI${arcDiff !== null ? `, diferencia de arco total ${arcDiff}°` : ''}`,
      });
    }
    return {
      metrics: [
        { label: 'Ratio RE/RI', R: erIr.R, L: erIr.L, digits: 2 },
        { label: 'Arco total rotacional', R: arc.R, L: arc.L, digits: 0, unit: '°' },
      ],
      findings,
    };
  },

  protocols: {},
};
