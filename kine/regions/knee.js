import { painSection, POS_NEG, QUALITY, Y_BALANCE_ITEMS, yBalanceComposite, ratio, SIDE_NAME } from './common.js';

// Umbrales propios de rodilla (editables).
const T = { hqRatioMin: 0.6, yBalanceCompositeMin: 94 };

export default {
  id: 'knee',
  name: 'Rodilla',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°)',
      kind: 'rom', type: 'number', unit: '°', min: -20, max: 170, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 135 },
        { id: 'ext_def', label: 'Déficit de extensión', ref: 0, inverse: true },
      ],
    },
    {
      id: 'effusion', title: 'Derrame', subtitle: 'Stroke test',
      kind: 'test', type: 'select',
      items: [
        { id: 'stroke', label: 'Stroke test', options: ['0', 'Trazas', '1+', '2+', '3+'], flags: { Trazas: 'warn', '1+': 'warn', '2+': 'alert', '3+': 'alert' } },
      ],
    },
    {
      id: 'strength', title: 'Fuerza isométrica', subtitle: 'Dinamometría (kg)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 250, step: 0.1,
      items: [
        { id: 'quad', label: 'Cuádriceps' },
        { id: 'ham', label: 'Isquiotibiales' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'lachman', label: 'Lachman', options: POS_NEG },
        { id: 'ant_drawer', label: 'Cajón anterior', options: POS_NEG },
        { id: 'pivot', label: 'Pivot shift', options: POS_NEG },
        { id: 'post_drawer', label: 'Cajón posterior', options: POS_NEG },
        { id: 'valgus', label: 'Estrés en valgo (30°)', options: POS_NEG },
        { id: 'varus', label: 'Estrés en varo (30°)', options: POS_NEG },
        { id: 'mcmurray', label: 'McMurray', options: POS_NEG },
        { id: 'thessaly', label: 'Thessaly', options: POS_NEG },
      ],
    },
    {
      id: 'functional', title: 'Funcionales', subtitle: 'Hop tests (cm), Y-Balance (cm) y control motor',
      kind: 'performance', type: 'number', unit: 'cm', min: 0, max: 1000, step: 1,
      items: [
        { id: 'single_hop', label: 'Single hop' },
        { id: 'triple_hop', label: 'Triple hop' },
        { id: 'crossover_hop', label: 'Crossover hop' },
        ...Y_BALANCE_ITEMS,
        { id: 'step_down', label: 'Step-down (calidad)', type: 'select', kind: 'test', ...QUALITY },
      ],
    },
    painSection(),
  ],

  derived(data, patient) {
    const findings = [];
    const hq = { R: ratio(data, 'strength', 'ham', 'quad', 'R'), L: ratio(data, 'strength', 'ham', 'quad', 'L') };
    const comp = { R: yBalanceComposite(data, patient, 'R'), L: yBalanceComposite(data, patient, 'L') };
    for (const s of ['R', 'L']) {
      if (hq[s] !== null && hq[s] < T.hqRatioMin) {
        findings.push({ key: 'derived.hq.low', level: 'alert', text: `Ratio I/Q ${SIDE_NAME[s]}: ${hq[s].toFixed(2)} (mín. ${T.hqRatioMin})` });
      }
      if (comp[s] !== null && comp[s] < T.yBalanceCompositeMin) {
        findings.push({ key: 'derived.ybal_comp.low', level: 'warn', text: `Y-Balance composite ${SIDE_NAME[s]}: ${comp[s].toFixed(1)}% (mín. ${T.yBalanceCompositeMin}%)` });
      }
    }
    return {
      metrics: [
        { label: 'Ratio isquios/cuádriceps', R: hq.R, L: hq.L, digits: 2 },
        { label: 'Y-Balance composite', R: comp.R, L: comp.L, digits: 1, unit: '%' },
      ],
      findings,
    };
  },

  protocols: {},
};
