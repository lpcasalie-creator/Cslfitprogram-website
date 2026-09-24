import { painSection, POS_NEG } from './common.js';

export default {
  id: 'lumbar',
  name: 'Columna lumbar',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Inclinometría (°) y Schober (cm)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 120, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 60, single: true },
        { id: 'ext', label: 'Extensión', ref: 25, single: true },
        { id: 'lat', label: 'Inclinación lateral', ref: 25 },
        { id: 'rot', label: 'Rotación', ref: 30 },
        { id: 'schober', label: 'Schober modificado (cm)', ref: 5, single: true, unit: 'cm', step: 0.5 },
      ],
    },
    {
      id: 'endurance', title: 'Resistencia de tronco', subtitle: 'Tiempo de sostén (s)',
      kind: 'performance', type: 'number', unit: 's', min: 0, max: 600, step: 1,
      items: [
        { id: 'sorensen', label: 'Biering-Sørensen', single: true },
        { id: 'flexor', label: 'Flexores (McGill)', single: true },
        { id: 'side_plank', label: 'Side plank' },
      ],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'slr', label: 'SLR (Lasègue)', options: POS_NEG },
        { id: 'slump', label: 'Slump', options: POS_NEG },
        { id: 'crossed_slr', label: 'SLR cruzado', options: POS_NEG },
        { id: 'prone_instab', label: 'Inestabilidad en prono', options: POS_NEG, single: true },
        { id: 'faber_si', label: 'FABER (SI)', options: POS_NEG },
        { id: 'thigh_thrust', label: 'Thigh thrust (SI)', options: POS_NEG },
      ],
    },
    {
      id: 'scores', title: 'Cuestionarios', subtitle: 'Puntaje',
      kind: 'score', type: 'number', unit: '%', min: 0, max: 100, step: 1,
      items: [{ id: 'odi', label: 'Oswestry (ODI %)', single: true, flagAbove: 21 }],
    },
    painSection(),
  ],
  protocols: {},
};
