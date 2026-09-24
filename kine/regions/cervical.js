import { painSection, POS_NEG } from './common.js';

export default {
  id: 'cervical',
  name: 'Columna cervical',
  sections: [
    {
      id: 'rom', title: 'Rango de movimiento', subtitle: 'Inclinometría / CROM (°)',
      kind: 'rom', type: 'number', unit: '°', min: 0, max: 120, step: 1,
      items: [
        { id: 'flex', label: 'Flexión', ref: 50, single: true },
        { id: 'ext', label: 'Extensión', ref: 60, single: true },
        { id: 'lat', label: 'Inclinación lateral', ref: 45 },
        { id: 'rot', label: 'Rotación', ref: 80 },
        { id: 'frt', label: 'Flexión-rotación (C1-C2)', ref: 40 },
      ],
    },
    {
      id: 'endurance', title: 'Resistencia', subtitle: 'Tiempo de sostén (s)',
      kind: 'performance', type: 'number', unit: 's', min: 0, max: 300, step: 1,
      items: [{ id: 'dnf', label: 'Flexores profundos (DNF)', single: true }],
    },
    {
      id: 'special', title: 'Tests especiales', subtitle: 'Resultado por lado',
      kind: 'test', type: 'select',
      items: [
        { id: 'spurling', label: 'Spurling', options: POS_NEG },
        { id: 'distraction', label: 'Distracción', options: POS_NEG, single: true },
        { id: 'ultt1', label: 'ULTT1 (mediano)', options: POS_NEG },
        { id: 'sharp_purser', label: 'Sharp-Purser', options: POS_NEG, single: true },
      ],
    },
    {
      id: 'scores', title: 'Cuestionarios', subtitle: 'Puntaje',
      kind: 'score', type: 'number', unit: '%', min: 0, max: 100, step: 1,
      items: [{ id: 'ndi', label: 'Neck Disability Index (%)', single: true, flagAbove: 30 }],
    },
    painSection(),
  ],
  protocols: {},
};
