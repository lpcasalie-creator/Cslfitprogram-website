// Batería de evaluación de cadera. Todos los ítems se registran por lado (D / I).
// `ref` = valor de referencia editable para ROM (se marca déficit si el valor queda por debajo).
export const SECTIONS = [
  {
    id: 'rom',
    title: 'Rango de movimiento',
    subtitle: 'Goniometría (°)',
    type: 'number', unit: '°', min: 0, max: 180, step: 1,
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
    id: 'strength',
    title: 'Fuerza isométrica',
    subtitle: 'Dinamometría (kg)',
    type: 'number', unit: 'kg', min: 0, max: 200, step: 0.1,
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
    id: 'special',
    title: 'Tests especiales',
    subtitle: 'Resultado por lado',
    type: 'select',
    items: [
      { id: 'thomas', label: 'Thomas', options: ['Negativo', 'Positivo – iliopsoas', 'Positivo – recto femoral', 'Positivo – TFL / banda IT'] },
      { id: 'faber', label: 'FABER (Patrick)', options: ['Negativo', 'Positivo – dolor anterior', 'Positivo – dolor posterior / SI', 'Positivo – limitación'] },
      { id: 'fadir', label: 'FADIR', options: ['Negativo', 'Positivo'] },
      { id: 'ober', label: 'Ober', options: ['Negativo', 'Positivo'] },
    ],
  },
  {
    id: 'functional',
    title: 'Funcionales',
    subtitle: 'Y-Balance (cm) y control en single-leg squat',
    type: 'mixed',
    items: [
      { id: 'ybal_ant', label: 'Y-Balance anterior', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
      { id: 'ybal_pm', label: 'Y-Balance posteromedial', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
      { id: 'ybal_pl', label: 'Y-Balance posterolateral', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
      { id: 'sls', label: 'Single-leg squat', type: 'select', options: ['Bueno', 'Moderado', 'Pobre'] },
    ],
  },
  {
    id: 'pain',
    title: 'Dolor',
    subtitle: 'EVA 0–10',
    type: 'number', unit: '', min: 0, max: 10, step: 1,
    items: [
      { id: 'rest', label: 'EVA en reposo' },
      { id: 'activity', label: 'EVA en actividad / entrenamiento' },
    ],
  },
];

export const SIDES = [
  { id: 'R', label: 'D' },
  { id: 'L', label: 'I' },
];

export function itemType(section, item) {
  return item.type || section.type;
}
