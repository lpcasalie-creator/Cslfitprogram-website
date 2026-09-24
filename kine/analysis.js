// Motor de análisis genérico: lee la definición declarativa de cada región (regions/*.js).
import { THRESHOLDS } from './config.js';

export const SIDES = [
  { id: 'R', label: 'D' },
  { id: 'L', label: 'I' },
];
const SIDE_NAME = { R: 'derecha', L: 'izquierda' };

export function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// `side` es 'R' | 'L' para ítems bilaterales y 'v' para ítems de un solo valor.
export function val(data, sec, item, side) {
  return data?.[sec]?.[item]?.[side] ?? '';
}

export const itemType = (sec, item) => item.type || sec.type;
export const itemKind = (sec, item) => item.kind || sec.kind;
export const itemUnit = (sec, item) => item.unit ?? sec.unit ?? '';
export const sideKeys = (item) => (item.single ? ['v'] : ['R', 'L']);

export function asymmetryPct(r, l) {
  if (r === null || l === null) return null;
  const max = Math.max(r, l);
  return max === 0 ? 0 : (Math.abs(r - l) / max) * 100;
}

// Asimetría (sin lado afectado) o LSI (con lado afectado D/I). Null si no aplica.
export function symmetry(sec, item, r, l, affected) {
  const kind = itemKind(sec, item);
  if (item.single || item.inverse || itemType(sec, item) !== 'number') return null;
  if (!['rom', 'strength', 'performance'].includes(kind)) return null;
  if (r === null || l === null) return null;
  if (affected === 'R' || affected === 'L') {
    const inv = affected === 'R' ? r : l;
    const uninv = affected === 'R' ? l : r;
    if (!uninv) return null;
    const value = (inv / uninv) * 100;
    return { type: 'LSI', value, flag: value < THRESHOLDS.lsiMin };
  }
  const value = asymmetryPct(r, l);
  return { type: 'Asim', value, flag: value > THRESHOLDS.asymmetryPct };
}

export function analyze(region, data, patient) {
  const findings = [];
  const add = (key, level, text) => findings.push({ key, level, text });
  const affected = data?.context?.affected || '';

  for (const sec of region.sections) {
    for (const item of sec.items) {
      const type = itemType(sec, item);
      const kind = itemKind(sec, item);
      const u = itemUnit(sec, item);
      const unit = !u || u === '°' || u === '%' ? u : ` ${u}`;
      const key = `${sec.id}.${item.id}`;
      const where = (s) => (s === 'v' ? '' : ` ${SIDE_NAME[s]}`);

      if (type === 'select') {
        for (const s of sideKeys(item)) {
          const v = val(data, sec.id, item.id, s);
          if (!v) continue;
          const level = item.flags?.[v] || (v.startsWith('Positivo') ? 'alert' : null);
          if (level) add(`${key}.pos`, level, `${item.label}${where(s)}: ${v}`);
        }
        continue;
      }

      for (const s of sideKeys(item)) {
        const v = num(val(data, sec.id, item.id, s));
        if (v === null) continue;
        if (item.ref !== undefined && (item.inverse ? v > item.ref : v < item.ref)) {
          add(`${key}.deficit`, 'warn', `${item.label}${where(s)}: ${v}${unit} (ref. ${item.ref}${unit})`);
        }
        if (kind === 'pain' && v >= THRESHOLDS.painEva) {
          add(`${key}.high`, v >= 7 ? 'alert' : 'warn', `${item.label}${where(s)}: ${v}/10`);
        }
        if (item.flagAbove !== undefined && v >= item.flagAbove) {
          add(`${key}.high`, 'alert', `${item.label}${where(s)}: ${v}${unit} (umbral ${item.flagAbove}${unit})`);
        }
      }

      const r = num(val(data, sec.id, item.id, 'R'));
      const l = num(val(data, sec.id, item.id, 'L'));
      const sym = symmetry(sec, item, r, l, affected);
      if (sym?.flag) {
        const level = kind === 'strength' ? 'alert' : 'warn';
        const detail = sym.type === 'LSI'
          ? `LSI ${sym.value.toFixed(0)}% (afectado ${affected === 'R' ? r : l} / sano ${affected === 'R' ? l : r}${unit})`
          : `${sym.value.toFixed(0)}% de asimetría (D ${r} / I ${l}${unit})`;
        add(`${key}.asym`, level, `${item.label}: ${detail}`);
      }
    }
  }

  const derived = region.derived ? region.derived(data || {}, patient) : { metrics: [], findings: [] };
  findings.push(...derived.findings);
  return { findings, metrics: derived.metrics };
}

// Texto de protocolo a partir de los hallazgos. Los hallazgos sin ejercicios asociados
// quedan como encabezado para que el profesional complete.
export function buildProtocol(region, findings) {
  const seen = new Set();
  const lines = [];
  for (const f of findings) {
    const exercises = (region.protocols?.[f.key] || []).filter((e) => !seen.has(e));
    exercises.forEach((e) => seen.add(e));
    lines.push(`# ${f.text}`, ...exercises.map((e) => `- ${e}`), '');
  }
  return lines.join('\n').trim();
}

export function countFilled(region, data) {
  let n = 0;
  for (const sec of region.sections) {
    for (const item of sec.items) for (const s of sideKeys(item)) if (val(data, sec.id, item.id, s) !== '') n++;
  }
  return n;
}
