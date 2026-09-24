import { painSection, POS_NEG, Y_BALANCE_ITEMS, yBalanceComposite, SIDE_NAME } from './common.js';

// Umbrales propios de tobillo (editables).
const T = { yBalanceCompositeMin: 94 };

export default {
  id: 'ankle',
  name: 'Tobillo y pie',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°) y WBLT (cm)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 90, step: 1,
      items: [
        { id: 'df', label: 'Dorsiflexión', ref: 20 },
        { id: 'pf', label: 'Plantiflexión', ref: 50 },
        { id: 'inv', label: 'Inversión', ref: 35 },
        { id: 'ev', label: 'Eversión', ref: 15 },
        { id: 'wblt', label: 'Weight-bearing lunge test (cm)', unit: 'cm', step: 0.5 },
      ],
    },
    {
      id: 'strength', title: 'Fuerza', subtitle: 'Dinamometría (kg) y heel raise (reps)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 200, step: 0.1,
      items: [
        { id: 'pf', label: 'Flexores plantares' },
        { id: 'df', label: 'Dorsiflexores' },
        { id: 'inv', label: 'Inversores' },
        { id: 'ev', label: 'Eversores' },
        { id: 'heel_raise', label: 'Heel raise unipodal (reps)', unit: 'reps', step: 1 },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'ant_drawer', label: 'Cajón anterior', options: POS_NEG },
        { id: 'talar_tilt', label: 'Talar tilt', options: POS_NEG },
        { id: 'squeeze', label: 'Squeeze (sindesmosis)', options: POS_NEG },
        { id: 'kleiger', label: 'Rotación externa (Kleiger)', options: POS_NEG },
        { id: 'thompson', label: 'Thompson', options: POS_NEG },
        { id: 'windlass', label: 'Windlass', options: POS_NEG },
      ],
    },
    {
      id: 'functional', title: 'Funcionales', subtitle: 'Y-Balance (cm) y equilibrio',
      kind: 'performance',
      items: [
        ...Y_BALANCE_ITEMS,
        { id: 'balance', label: 'Apoyo unipodal ojos cerrados (s)', type: 'number', unit: 's', min: 0, max: 120, step: 1 },
      ],
    },
    painSection(),
  ],

  derived(data, patient) {
    const findings = [];
    const comp = { R: yBalanceComposite(data, patient, 'R'), L: yBalanceComposite(data, patient, 'L') };
    for (const s of ['R', 'L']) {
      if (comp[s] !== null && comp[s] < T.yBalanceCompositeMin) {
        findings.push({ key: 'derived.ybal_comp.low', level: 'warn', text: `Y-Balance composite ${SIDE_NAME[s]}: ${comp[s].toFixed(1)}% (mín. ${T.yBalanceCompositeMin}%)` });
      }
    }
    return { metrics: [{ label: 'Y-Balance composite', R: comp.R, L: comp.L, digits: 1, unit: '%' }], findings };
  },

  protocols: {},
};
