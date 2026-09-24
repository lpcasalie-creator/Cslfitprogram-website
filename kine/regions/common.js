// Bloques reutilizables entre regiones.
//
// Formato de una sección:
//   { id, title, subtitle, kind, type, unit, min, max, step, items: [...] }
//   kind: 'rom' | 'strength' | 'performance' | 'test' | 'pain' | 'score'
//     rom         → déficit vs `ref` + asimetría/LSI (advertencia)
//     strength    → asimetría/LSI (alerta)
//     performance → asimetría/LSI (advertencia)
//     test        → select; opción que empieza con "Positivo" = alerta, o mapa `flags`
//     pain        → EVA ≥ THRESHOLDS.painEva
//     score       → cuestionarios; se marca si supera `flagAbove`
//   type: 'number' | 'select'
//
// Propiedades de ítem (sobrescriben las de la sección):
//   ref        valor de referencia; se marca déficit si el valor queda bajo ref
//   inverse    true → se marca si el valor queda SOBRE ref (ej. déficit de extensión)
//   single     true → un solo valor (sin lado), ej. flexión lumbar
//   flagAbove  se marca si el valor es ≥ flagAbove
//   options    opciones del select
//   flags      { 'Opción': 'warn' | 'alert' } para selects que no usan "Positivo"

export const POS_NEG = ['Negativo', 'Positivo'];

export function painSection() {
  return {
    id: 'pain',
    title: 'Dolor',
    subtitle: 'EVA 0–10',
    kind: 'pain', type: 'number', unit: '', min: 0, max: 10, step: 1,
    items: [
      { id: 'rest', label: 'EVA en reposo' },
      { id: 'activity', label: 'EVA en actividad / carga' },
    ],
  };
}

export const QUALITY = {
  options: ['Bueno', 'Moderado', 'Pobre'],
  flags: { Moderado: 'warn', Pobre: 'alert' },
};

// Composite del Y-Balance (tren inferior) normalizado al largo de pierna del paciente.
export function yBalanceComposite(data, patient, side, sec = 'functional') {
  const ll = Number(side === 'R' ? patient?.leg_length_r : patient?.leg_length_l);
  const get = (id) => data?.[sec]?.[id]?.[side];
  const vals = ['ybal_ant', 'ybal_pm', 'ybal_pl'].map((id) => get(id)).map((v) => (v === '' || v == null ? null : Number(v)));
  if (!ll || vals.some((v) => v === null || !Number.isFinite(v))) return null;
  return ((vals[0] + vals[1] + vals[2]) / (3 * ll)) * 100;
}

export const Y_BALANCE_ITEMS = [
  { id: 'ybal_ant', label: 'Y-Balance anterior', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
  { id: 'ybal_pm', label: 'Y-Balance posteromedial', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
  { id: 'ybal_pl', label: 'Y-Balance posterolateral', type: 'number', unit: 'cm', min: 0, max: 200, step: 0.5 },
];

// Ratio entre dos ítems de fuerza de un mismo lado.
export function ratio(data, sec, num, den, side) {
  const n = Number(data?.[sec]?.[num]?.[side]);
  const d = Number(data?.[sec]?.[den]?.[side]);
  if (data?.[sec]?.[num]?.[side] === '' || !d || !Number.isFinite(n)) return null;
  return n / d;
}

export const SIDE_NAME = { R: 'derecha', L: 'izquierda' };
