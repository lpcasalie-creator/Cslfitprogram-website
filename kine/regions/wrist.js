import { painSection, POS_NEG } from './common.js';

export default {
  id: 'wrist',
  name: 'Muñeca y mano',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Goniometría (°)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 120, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 80 },
        { id: 'ext', label: 'Extensión', ref: 70 },
        { id: 'rad', label: 'Desviación radial', ref: 20 },
        { id: 'uln', label: 'Desviación cubital', ref: 30 },
      ],
    },
    {
      id: 'strength', title: 'Fuerza', subtitle: 'Dinamometría (kg)',
      kind: 'strength', type: 'number', unit: 'kg', min: 0, max: 120, step: 0.1,
      items: [
        { id: 'grip', label: 'Prensión (grip)' },
        { id: 'key_pinch', label: 'Pinza lateral' },
        { id: 'tip_pinch', label: 'Pinza pulpejo-pulpejo' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'phalen', label: 'Phalen', options: POS_NEG },
        { id: 'tinel', label: 'Tinel carpiano', options: POS_NEG },
        { id: 'finkelstein', label: 'Finkelstein', options: POS_NEG },
        { id: 'watson', label: 'Watson (escafoides)', options: POS_NEG },
        { id: 'tfcc', label: 'TFCC load / ulnar grind', options: POS_NEG },
      ],
    },
    painSection(),
  ],
  protocols: {},
};
