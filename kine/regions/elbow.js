import { painSection, POS_NEG } from './common.js';

export default {
  id: 'elbow',
  name: 'Codo',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°)',
      kind: 'rom', type: 'number', unit: '°', min: -20, max: 170, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 150 },
        { id: 'ext_def', label: 'Déficit de extensión', ref: 0, inverse: true },
        { id: 'pron', label: 'Pronación', ref: 80 },
        { id: 'sup', label: 'Supinación', ref: 80 },
      ],
    },
    {
      id: 'strength', title: 'Fuerza', subtitle: 'Dinamometría (kg)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 150, step: 0.1,
      items: [
        { id: 'grip', label: 'Prensión (grip)' },
        { id: 'pain_free_grip', label: 'Prensión sin dolor (PFG)' },
        { id: 'flex', label: 'Flexores de codo' },
        { id: 'ext', label: 'Extensores de codo' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'cozen', label: 'Cozen', options: POS_NEG },
        { id: 'mill', label: 'Mill', options: POS_NEG },
        { id: 'golfer', label: 'Epicondilalgia medial', options: POS_NEG },
        { id: 'valgus', label: 'Estrés en valgo', options: POS_NEG },
        { id: 'moving_valgus', label: 'Moving valgus', options: POS_NEG },
        { id: 'varus', label: 'Estrés en varo', options: POS_NEG },
        { id: 'tinel_cubital', label: 'Tinel cubital', options: POS_NEG },
      ],
    },
    painSection(),
  ],
  protocols: {},
};
