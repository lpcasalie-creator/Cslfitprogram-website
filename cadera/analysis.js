import { SECTIONS, SIDES } from './tests.js';
import { THRESHOLDS } from './config.js';
import { PROTOCOL_LIBRARY } from './protocols.js';

const SIDE_NAME = { R: 'derecha', L: 'izquierda' };

export function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function val(data, sec, item, side) {
  return data?.[sec]?.[item]?.[side] ?? '';
}

export function asymmetryPct(r, l) {
  if (r === null || l === null) return null;
  const max = Math.max(r, l);
  if (max === 0) return 0;
  return (Math.abs(r - l) / max) * 100;
}

export function yBalanceComposite(data, athlete, side) {
  const ll = num(side === 'R' ? athlete?.leg_length_r : athlete?.leg_length_l);
  const a = num(val(data, 'functional', 'ybal_ant', side));
  const pm = num(val(data, 'functional', 'ybal_pm', side));
  const pl = num(val(data, 'functional', 'ybal_pl', side));
  if (!ll || a === null || pm === null || pl === null) return null;
  return ((a + pm + pl) / (3 * ll)) * 100;
}

export function addAbdRatio(data, side) {
  const add = num(val(data, 'strength', 'add', side));
  const abd = num(val(data, 'strength', 'abd', side));
  if (add === null || !abd) return null;
  return add / abd;
}

// Devuelve { findings: [{key, level, text}], composite: {R,L}, ratio: {R,L} }
export function analyze(data, athlete) {
  const findings = [];
  const add = (key, level, text) => findings.push({ key, level, text });
  const secById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  // ROM: déficit vs referencia y asimetría
  for (const item of secById.rom.items) {
    const r = num(val(data, 'rom', item.id, 'R'));
    const l = num(val(data, 'rom', item.id, 'L'));
    for (const [side, v] of [['R', r], ['L', l]]) {
      if (v !== null && item.ref && v < item.ref) {
        add(`rom.${item.id}.deficit`, 'warn', `${item.label} ${SIDE_NAME[side]}: ${v}° (ref. ${item.ref}°)`);
      }
    }
    const asym = asymmetryPct(r, l);
    if (asym !== null && asym > THRESHOLDS.asymmetryPct) {
      add(`rom.${item.id}.asym`, 'warn', `Asimetría en ${item.label.toLowerCase()}: ${asym.toFixed(0)}% (D ${r}° / I ${l}°)`);
    }
  }

  // Fuerza: asimetría y ratio ADD/ABD
  for (const item of secById.strength.items) {
    const r = num(val(data, 'strength', item.id, 'R'));
    const l = num(val(data, 'strength', item.id, 'L'));
    const asym = asymmetryPct(r, l);
    if (asym !== null && asym > THRESHOLDS.asymmetryPct) {
      const weak = r < l ? 'derecho' : 'izquierdo';
      add(`strength.${item.id}.asym`, 'alert', `${item.label}: ${asym.toFixed(0)}% de asimetría, déficit lado ${weak} (D ${r} / I ${l} kg)`);
    }
  }
  const ratio = { R: addAbdRatio(data, 'R'), L: addAbdRatio(data, 'L') };
  for (const side of ['R', 'L']) {
    if (ratio[side] !== null && ratio[side] < THRESHOLDS.addAbdRatioMin) {
      add('strength.addabd.low', 'alert', `Ratio ADD/ABD ${SIDE_NAME[side]}: ${ratio[side].toFixed(2)} (mín. ${THRESHOLDS.addAbdRatioMin})`);
    }
  }

  // Tests especiales
  for (const item of secById.special.items) {
    for (const side of ['R', 'L']) {
      const v = val(data, 'special', item.id, side);
      if (v.startsWith('Positivo')) add(`special.${item.id}.pos`, 'alert', `${item.label} ${SIDE_NAME[side]}: ${v}`);
    }
  }

  // Funcionales
  const ar = num(val(data, 'functional', 'ybal_ant', 'R'));
  const al = num(val(data, 'functional', 'ybal_ant', 'L'));
  if (ar !== null && al !== null && Math.abs(ar - al) > THRESHOLDS.yBalanceAntCm) {
    add('functional.ybal_ant.asym', 'warn', `Y-Balance anterior: diferencia ${Math.abs(ar - al).toFixed(1)} cm (> ${THRESHOLDS.yBalanceAntCm} cm)`);
  }
  const composite = { R: yBalanceComposite(data, athlete, 'R'), L: yBalanceComposite(data, athlete, 'L') };
  for (const side of ['R', 'L']) {
    if (composite[side] !== null && composite[side] < THRESHOLDS.yBalanceCompositeMin) {
      add('functional.ybal_comp.low', 'warn', `Y-Balance composite ${SIDE_NAME[side]}: ${composite[side].toFixed(1)}% (mín. ${THRESHOLDS.yBalanceCompositeMin}%)`);
    }
  }
  for (const side of ['R', 'L']) {
    const v = val(data, 'functional', 'sls', side);
    if (v === 'Pobre') add('functional.sls.poor', 'alert', `Single-leg squat ${SIDE_NAME[side]}: control pobre`);
    else if (v === 'Moderado') add('functional.sls.poor', 'warn', `Single-leg squat ${SIDE_NAME[side]}: control moderado`);
  }

  // Dolor
  for (const item of secById.pain.items) {
    for (const side of ['R', 'L']) {
      const v = num(val(data, 'pain', item.id, side));
      if (v !== null && v >= THRESHOLDS.painEva) {
        add(`pain.${item.id}.high`, v >= 7 ? 'alert' : 'warn', `${item.label} ${SIDE_NAME[side]}: ${v}/10`);
      }
    }
  }

  return { findings, composite, ratio };
}

// Genera el texto de protocolo a partir de los hallazgos (sin duplicar ejercicios).
export function buildProtocol(findings) {
  const seen = new Set();
  const lines = [];
  for (const f of findings) {
    const exercises = (PROTOCOL_LIBRARY[f.key] || []).filter((e) => !seen.has(e));
    if (!exercises.length) continue;
    exercises.forEach((e) => seen.add(e));
    lines.push(`# ${f.text}`, ...exercises.map((e) => `- ${e}`), '');
  }
  return lines.join('\n').trim();
}

export function countFilled(data) {
  let n = 0;
  for (const s of SECTIONS) for (const i of s.items) for (const side of SIDES) if (val(data, s.id, i.id, side.id) !== '') n++;
  return n;
}
