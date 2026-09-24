import * as store from './store.js';
import { THRESHOLDS, REPORT_FOOTER } from './config.js';
import { REGIONS, REGION_BY_ID } from './regions/index.js';
import {
  analyze, buildProtocol, symmetry, num, val, itemType, itemUnit, sideKeys, countFilled,
} from './analysis.js';

const $app = document.getElementById('app');
let user = null;
const evoRegion = {}; // región seleccionada en la tabla de evolución, por paciente

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toLocaleDateString('sv-SE');
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmt = (n, d = 0) => (n === null || n === undefined ? '—' : Number(n).toFixed(d));
const age = (b) => {
  if (!b) return null;
  const d = new Date(`${b}T12:00:00`), n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};
const weeksBetween = (from, to) => (from && to ? Math.floor((new Date(to) - new Date(from)) / (7 * 864e5)) : null);
const SEX = { F: 'Femenino', M: 'Masculino', X: 'Otro' };
const AFFECTED = { '': '—', R: 'Derecho', L: 'Izquierdo', B: 'Bilateral', NA: 'No aplica' };
const regionName = (id) => REGION_BY_ID[id]?.name || id;

function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = `toast${isError ? ' error' : ''}`;
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 3000);
}

function go(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}

function header(title, back) {
  return `
    <header class="topbar">
      ${back ? `<a class="back" href="${back}" aria-label="Volver">‹</a>` : '<span class="brand">CSL<span>·</span>KINE</span>'}
      <h1>${esc(title)}</h1>
      <a class="icon-btn" href="#/settings" aria-label="Ajustes">⚙</a>
    </header>`;
}

// ---------- Router ----------
const routes = [
  [/^#?\/?$/, viewPatients],
  [/^#\/patient\/new$/, () => viewPatientForm(null)],
  [/^#\/patient\/([\w-]+)\/edit$/, (id) => viewPatientForm(id)],
  [/^#\/patient\/([\w-]+)\/assess$/, viewRegionPicker],
  [/^#\/patient\/([\w-]+)\/assess\/(\w+)$/, (id, region) => viewAssessment(null, id, region)],
  [/^#\/patient\/([\w-]+)$/, viewPatient],
  [/^#\/assessment\/([\w-]+)$/, (id) => viewAssessment(id)],
  [/^#\/report\/([\w-]+)$/, viewReport],
  [/^#\/settings$/, viewSettings],
];

async function render() {
  if (store.mode === 'cloud' && !user) return viewLogin();
  const hash = location.hash || '#/';
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      try {
        await fn(...m.slice(1));
      } catch (err) {
        console.error(err);
        $app.innerHTML = `${header('Error', '#/')}<main><p class="empty">${esc(err.message || err)}</p></main>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  go('#/');
}

// ---------- Login ----------
function viewLogin() {
  $app.innerHTML = `
    <main class="login">
      <div class="brand big">CSL<span>·</span>KINE</div>
      <p class="muted">Evaluación kinésica y biomecánica</p>
      <form id="login" class="card">
        <label>Email<input type="email" name="email" required autocomplete="email" /></label>
        <button class="btn primary" type="submit">Enviar link de acceso</button>
      </form>
    </main>`;
  document.getElementById('login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await store.signIn(e.target.email.value.trim());
      toast('Revisa tu email para entrar');
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------- Pacientes ----------
async function viewPatients() {
  const patients = await store.listPatients();
  $app.innerHTML = `
    ${header('Pacientes')}
    <main>
      ${store.mode === 'local' ? '<p class="banner">Modo local: los datos quedan solo en este dispositivo. Configura Supabase para sincronizar.</p>' : ''}
      <div class="toolbar">
        <input type="search" id="q" placeholder="Buscar paciente…" />
        <a class="btn primary" href="#/patient/new">+ Paciente</a>
      </div>
      <ul class="list" id="list">
        ${patients.map((p) => `
          <li data-name="${esc(p.name.toLowerCase())}">
            <a href="#/patient/${p.id}">
              <strong>${esc(p.name)}</strong>
              <span class="muted">${[p.sport, age(p.birthdate) ? `${age(p.birthdate)} años` : null].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</span>
            </a>
          </li>`).join('')}
      </ul>
      ${patients.length ? '' : '<p class="empty">Aún no tienes pacientes. Crea el primero para empezar a evaluar.</p>'}
    </main>`;
  document.getElementById('q').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#list li').forEach((li) => { li.hidden = !li.dataset.name.includes(q); });
  };
}

async function viewPatientForm(id) {
  const p = id ? await store.getPatient(id) : {};
  if (id && !p) return go('#/');
  const opt = (value, label, current) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  $app.innerHTML = `
    ${header(id ? 'Editar paciente' : 'Nuevo paciente', id ? `#/patient/${id}` : '#/')}
    <main>
      <form id="f" class="card form">
        <label>Nombre<input name="name" required value="${esc(p.name)}" /></label>
        <div class="row">
          <label>Fecha de nacimiento<input type="date" name="birthdate" value="${esc(p.birthdate)}" /></label>
          <label>Sexo<select name="sex"><option value="">—</option>${Object.entries(SEX).map(([k, v]) => opt(k, v, p.sex)).join('')}</select></label>
        </div>
        <div class="row">
          <label>Deporte / actividad<input name="sport" value="${esc(p.sport)}" placeholder="CrossFit, running, fútbol…" /></label>
          <label>Lado dominante<select name="dominant_side"><option value="">—</option>${opt('R', 'Derecho', p.dominant_side)}${opt('L', 'Izquierdo', p.dominant_side)}</select></label>
        </div>
        <div class="row">
          <label>Largo pierna D (cm)<input type="number" step="0.5" min="0" name="leg_length_r" value="${esc(p.leg_length_r)}" /></label>
          <label>Largo pierna I (cm)<input type="number" step="0.5" min="0" name="leg_length_l" value="${esc(p.leg_length_l)}" /></label>
        </div>
        <p class="hint">Largo de pierna (EIAS a maléolo medial): se usa para el composite del Y-Balance.</p>
        <label>Antecedentes / notas<textarea name="notes" rows="3" placeholder="Cirugías, lesiones previas, comorbilidades…">${esc(p.notes)}</textarea></label>
        <div class="actions">
          ${id ? '<button type="button" class="btn danger" id="del">Eliminar</button>' : ''}
          <button class="btn primary" type="submit">Guardar</button>
        </div>
      </form>
    </main>`;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const saved = await store.savePatient({ ...p, ...Object.fromEntries(new FormData(f)) });
    toast('Paciente guardado');
    go(`#/patient/${saved.id}`);
  };
  document.getElementById('del')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${p.name} y todas sus evaluaciones?`)) return;
    await store.deletePatient(id);
    toast('Paciente eliminado');
    go('#/');
  });
}

async function viewPatient(id) {
  const [p, list] = await Promise.all([store.getPatient(id), store.listAssessments(id)]);
  if (!p) return go('#/');
  const facts = [
    p.sport,
    age(p.birthdate) ? `${age(p.birthdate)} años` : null,
    SEX[p.sex],
    p.dominant_side ? `Dominante ${p.dominant_side === 'R' ? 'D' : 'I'}` : null,
  ].filter(Boolean);

  const regionsWithHistory = [...new Set(list.map((x) => x.region))]
    .filter((r) => REGION_BY_ID[r] && list.filter((x) => x.region === r).length > 1);
  if (!regionsWithHistory.includes(evoRegion[id])) evoRegion[id] = regionsWithHistory[0];

  $app.innerHTML = `
    ${header(p.name, '#/')}
    <main>
      <section class="card">
        <div class="card-head">
          <div>
            <p class="muted">${facts.map(esc).join(' · ') || 'Sin datos'}</p>
            ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ''}
          </div>
          <a class="btn ghost" href="#/patient/${id}/edit">Editar</a>
        </div>
      </section>
      <div class="toolbar">
        <h2>Evaluaciones</h2>
        <a class="btn primary" href="#/patient/${id}/assess">+ Evaluación</a>
      </div>
      ${list.length ? `
        <ul class="list">
          ${list.map((x) => {
            const region = REGION_BY_ID[x.region];
            if (!region) return '';
            const { findings } = analyze(region, x.data, p);
            const alerts = findings.filter((f) => f.level === 'alert').length;
            const n = findings.length;
            const dx = x.data?.context?.diagnosis;
            return `
              <li><a href="#/assessment/${x.id}">
                <strong>${esc(region.name)} <span class="muted small">· ${fmtDate(x.date)}</span></strong>
                <span class="muted">${dx ? `${esc(dx)} · ` : ''}${countFilled(region, x.data)} registros ·
                  <span class="${alerts ? 'tag alert' : n ? 'tag warn' : 'tag ok'}">${n} ${n === 1 ? 'hallazgo' : 'hallazgos'}</span>
                </span>
              </a></li>`;
          }).join('')}
        </ul>
        <div id="evo"></div>
      ` : '<p class="empty">Sin evaluaciones todavía.</p>'}
    </main>`;

  const renderEvo = () => {
    const $evo = document.getElementById('evo');
    if (!$evo || !regionsWithHistory.length) return;
    const region = REGION_BY_ID[evoRegion[id]];
    $evo.innerHTML = `
      <div class="toolbar">
        <h2>Evolución</h2>
        ${regionsWithHistory.length > 1 ? `<select id="evo-region" class="compact">${regionsWithHistory.map((r) => `<option value="${r}" ${r === region.id ? 'selected' : ''}>${esc(regionName(r))}</option>`).join('')}</select>` : `<span class="muted">${esc(region.name)}</span>`}
      </div>
      ${evolutionTable(region, list.filter((x) => x.region === region.id), p)}`;
    document.getElementById('evo-region')?.addEventListener('change', (e) => { evoRegion[id] = e.target.value; renderEvo(); });
  };
  renderEvo();
}

function evolutionTable(region, list, patient) {
  const cols = list.slice(0, 5).reverse();
  const rows = [];
  for (const sec of region.sections) {
    const numeric = sec.items.filter((i) => itemType(sec, i) === 'number');
    const block = [];
    for (const item of numeric) {
      for (const s of sideKeys(item)) {
        const values = cols.map((x) => num(val(x.data, sec.id, item.id, s)));
        if (values.every((v) => v === null)) continue;
        const digits = (item.step ?? sec.step) < 1 ? 1 : 0;
        const higherIsBetter = !item.inverse && sec.kind !== 'pain' && sec.kind !== 'score';
        block.push(`<tr><td>${esc(item.label)}${s === 'v' ? '' : ` ${s === 'R' ? 'D' : 'I'}`}</td>${values.map((v, i) => {
          const prev = i > 0 ? values[i - 1] : null;
          const delta = v !== null && prev !== null ? v - prev : null;
          const good = delta && (delta > 0) === higherIsBetter;
          return `<td>${fmt(v, digits)}${delta ? `<small class="${good ? 'up' : 'down'}">${delta > 0 ? '+' : ''}${fmt(delta, digits)}</small>` : ''}</td>`;
        }).join('')}</tr>`);
      }
    }
    if (block.length) rows.push(`<tr class="group"><th colspan="${cols.length + 1}">${esc(sec.title)}</th></tr>`, ...block);
  }
  const metricsByCol = cols.map((x) => analyze(region, x.data, patient).metrics);
  const metricRows = [];
  (metricsByCol[0] || []).forEach((m, mi) => {
    for (const s of ['R', 'L']) {
      const values = metricsByCol.map((ms) => ms[mi]?.[s] ?? null);
      if (values.every((v) => v === null)) continue;
      metricRows.push(`<tr><td>${esc(m.label)} ${s === 'R' ? 'D' : 'I'}</td>${values.map((v) => `<td>${fmt(v, m.digits)}${v !== null ? m.unit || '' : ''}</td>`).join('')}</tr>`);
    }
  });
  if (metricRows.length) rows.push(`<tr class="group"><th colspan="${cols.length + 1}">Índices</th></tr>`, ...metricRows);
  return `
    <div class="table-wrap">
      <table class="evo">
        <thead><tr><th></th>${cols.map((x) => `<th>${fmtDate(x.date)}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

// ---------- Selección de región ----------
async function viewRegionPicker(patientId) {
  const p = await store.getPatient(patientId);
  if (!p) return go('#/');
  $app.innerHTML = `
    ${header('Nueva evaluación', `#/patient/${patientId}`)}
    <main>
      <p class="muted center">${esc(p.name)} · Elige la región</p>
      <div class="region-grid">
        ${REGIONS.map((r) => `<a class="region-card" href="#/patient/${patientId}/assess/${r.id}">${esc(r.name)}</a>`).join('')}
      </div>
    </main>`;
}

// ---------- Evaluación (crear / editar) ----------
async function viewAssessment(id, patientId, regionId) {
  let x;
  if (id) {
    x = await store.getAssessment(id);
    if (!x) return go('#/');
    patientId = x.patient_id;
    regionId = x.region;
  } else {
    x = { patient_id: patientId, region: regionId, date: today(), data: {}, notes: '' };
  }
  const region = REGION_BY_ID[regionId];
  const patient = await store.getPatient(patientId);
  if (!patient || !region) return go(patient ? `#/patient/${patientId}` : '#/');
  const data = structuredClone(x.data || {});
  const ctx = data.context || {};
  let protocolEdited = Boolean(data.protocol);

  $app.innerHTML = `
    ${header(region.name, `#/patient/${patientId}`)}
    <main>
      <p class="muted center">${esc(patient.name)}</p>
      <form id="f">
        <section class="card">
          <h3>Contexto clínico</h3>
          <div class="row">
            <label>Fecha evaluación<input type="date" name="date" required value="${esc(x.date)}" /></label>
            <label>Lado afectado<select name="ctx.affected">${Object.entries(AFFECTED).map(([k, v]) => `<option value="${k}" ${ctx.affected === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          </div>
          <label>Motivo de consulta<input name="ctx.complaint" value="${esc(ctx.complaint)}" /></label>
          <label>Diagnóstico médico<input name="ctx.diagnosis" value="${esc(ctx.diagnosis)}" placeholder="Ej. reconstrucción LCA con injerto HTH" /></label>
          <div class="row">
            <label>Mecanismo de lesión<input name="ctx.mechanism" value="${esc(ctx.mechanism)}" /></label>
            <label>Fecha lesión / cirugía<input type="date" name="ctx.injury_date" value="${esc(ctx.injury_date)}" /></label>
          </div>
          <p class="hint">Con lado afectado D o I, la simetría se calcula como LSI (afectado / sano) con mínimo ${THRESHOLDS.lsiMin}%.</p>
        </section>
        ${region.sections.map((sec) => sectionCard(sec, data)).join('')}
        <section class="card">
          <h3>Observaciones</h3>
          <textarea name="notes" rows="3" placeholder="Hallazgos cualitativos, compensaciones, análisis de movimiento…">${esc(x.notes)}</textarea>
        </section>
        <section class="card" id="analysis"></section>
        <section class="card">
          <div class="card-head">
            <h3>Protocolo</h3>
            <button type="button" class="btn ghost small" id="regen">Regenerar</button>
          </div>
          <textarea name="protocol" id="protocol" rows="10" placeholder="Se genera a partir de los hallazgos. Edítalo libremente."></textarea>
        </section>
        <div class="actions sticky">
          ${id ? '<button type="button" class="btn danger" id="del">Eliminar</button>' : ''}
          ${id ? `<a class="btn ghost" href="#/report/${id}">Informe</a>` : ''}
          <button class="btn primary" type="submit">Guardar</button>
        </div>
      </form>
    </main>`;

  const f = document.getElementById('f');
  const $protocol = document.getElementById('protocol');
  $protocol.value = data.protocol || '';

  const readForm = () => {
    for (const sec of region.sections) {
      data[sec.id] = {};
      for (const item of sec.items) {
        data[sec.id][item.id] = {};
        for (const s of sideKeys(item)) data[sec.id][item.id][s] = f.elements[`${sec.id}.${item.id}.${s}`].value;
      }
    }
    data.context = {};
    for (const el of f.elements) if (el.name?.startsWith('ctx.')) data.context[el.name.slice(4)] = el.value;
  };

  const refresh = () => {
    readForm();
    const affected = data.context.affected;
    const result = analyze(region, data, patient);
    document.getElementById('analysis').innerHTML = analysisHTML(result);
    f.querySelectorAll('[data-symhead]').forEach((th) => { th.textContent = affected === 'R' || affected === 'L' ? 'LSI' : 'Asim'; });
    f.querySelectorAll('[data-sym]').forEach((cell) => {
      const [s, i] = cell.dataset.sym.split('.');
      const sec = region.sections.find((z) => z.id === s);
      const item = sec.items.find((z) => z.id === i);
      const sym = symmetry(sec, item, num(val(data, s, i, 'R')), num(val(data, s, i, 'L')), affected);
      cell.textContent = sym ? `${sym.value.toFixed(0)}%` : '';
      cell.classList.toggle('flag', Boolean(sym?.flag));
    });
    f.querySelectorAll('[data-ref]').forEach((input) => {
      const v = num(input.value);
      const ref = Number(input.dataset.ref);
      input.classList.toggle('below', v !== null && (input.dataset.inverse ? v > ref : v < ref));
    });
    if (!protocolEdited) $protocol.value = buildProtocol(region, result.findings);
  };

  f.addEventListener('input', (e) => {
    if (e.target === $protocol) protocolEdited = true;
    else refresh();
  });
  document.getElementById('regen').onclick = () => {
    if (protocolEdited && $protocol.value.trim() && !confirm('¿Reemplazar el protocolo editado?')) return;
    protocolEdited = false;
    refresh();
  };
  refresh();

  f.onsubmit = async (e) => {
    e.preventDefault();
    readForm();
    data.protocol = $protocol.value;
    const saved = await store.saveAssessment({ ...x, date: f.date.value, notes: f.notes.value, data });
    toast('Evaluación guardada');
    go(`#/assessment/${saved.id}`);
  };
  document.getElementById('del')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    await store.deleteAssessment(id);
    toast('Evaluación eliminada');
    go(`#/patient/${patientId}`);
  });
}

function sectionCard(sec, data) {
  const hasSym = sec.items.some((i) => ['rom', 'strength', 'performance'].includes(i.kind || sec.kind) && itemType(sec, i) === 'number' && !i.single);
  const hasRef = sec.items.some((i) => i.ref !== undefined || i.flagAbove !== undefined);
  return `
    <section class="card">
      <h3>${esc(sec.title)} <small class="muted">${esc(sec.subtitle || '')}</small></h3>
      <table class="grid">
        <thead><tr><th></th><th>D</th><th>I</th>${hasRef ? '<th>Ref</th>' : ''}${hasSym ? '<th data-symhead>Asim</th>' : ''}</tr></thead>
        <tbody>
          ${sec.items.map((item) => {
            const type = itemType(sec, item);
            const cfg = { ...sec, ...item };
            const unit = itemUnit(sec, item);
            const field = (s, label) => {
              const name = `${sec.id}.${item.id}.${s}`;
              const v = val(data, sec.id, item.id, s);
              const aria = `${esc(item.label)} ${label}`;
              if (type === 'select') {
                return `<select name="${name}" aria-label="${aria}"><option value="">—</option>${item.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
              }
              return `<input type="number" inputmode="decimal" name="${name}" aria-label="${aria}" min="${cfg.min ?? ''}" max="${cfg.max ?? ''}" step="${cfg.step ?? 'any'}" value="${esc(v)}" ${item.ref !== undefined ? `data-ref="${item.ref}"` : ''} ${item.inverse ? 'data-inverse="1"' : ''} />`;
            };
            const cells = item.single
              ? `<td colspan="2">${field('v', '')}</td>`
              : `<td>${field('R', 'D')}</td><td>${field('L', 'I')}</td>`;
            const ref = item.ref !== undefined ? `${item.inverse ? '≤' : ''}${item.ref}` : item.flagAbove !== undefined ? `<${item.flagAbove}` : '';
            return `
              <tr>
                <th scope="row">${esc(item.label)}${item.unit && item.unit !== sec.unit ? ` <small class="muted">(${esc(unit)})</small>` : ''}</th>
                ${cells}
                ${hasRef ? `<td class="muted">${ref}</td>` : ''}
                ${hasSym ? `<td class="asym" data-sym="${sec.id}.${item.id}"></td>` : ''}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </section>`;
}

function analysisHTML({ findings, metrics }) {
  return `
    <h3>Análisis</h3>
    ${metrics.length ? `<div class="metrics">
      ${metrics.map((m) => `<div class="metric"><span class="muted">${esc(m.label)}</span><strong>D ${fmt(m.R, m.digits)}${m.R !== null ? m.unit || '' : ''} · I ${fmt(m.L, m.digits)}${m.L !== null ? m.unit || '' : ''}</strong></div>`).join('')}
    </div>` : ''}
    ${findings.length ? `
      <ul class="findings">
        ${findings.map((fd) => `<li class="${fd.level}">${esc(fd.text)}</li>`).join('')}
      </ul>` : '<p class="muted">Sin hallazgos con los datos ingresados.</p>'}`;
}

// ---------- Informe imprimible ----------
async function viewReport(id) {
  const x = await store.getAssessment(id);
  if (!x) return go('#/');
  const region = REGION_BY_ID[x.region];
  const p = await store.getPatient(x.patient_id);
  const result = analyze(region, x.data, p);
  const ctx = x.data?.context || {};
  const affected = ctx.affected;
  const weeks = weeksBetween(ctx.injury_date, x.date);

  const tables = region.sections.map((sec) => {
    const rows = sec.items.filter((i) => sideKeys(i).some((s) => val(x.data, sec.id, i.id, s) !== ''));
    if (!rows.length) return '';
    return `
      <h3>${esc(sec.title)} <small>${esc(sec.subtitle || '')}</small></h3>
      <table class="report-table">
        <thead><tr><th></th><th>Derecha</th><th>Izquierda</th><th>Ref</th><th>${affected === 'R' || affected === 'L' ? 'LSI' : 'Asimetría'}</th></tr></thead>
        <tbody>${rows.map((i) => {
          const unit = itemUnit(sec, i);
          const show = (v) => (v === '' ? '—' : esc(v));
          if (i.single) {
            return `<tr><th scope="row">${esc(i.label)}</th><td colspan="2">${show(val(x.data, sec.id, i.id, 'v'))}${unit && val(x.data, sec.id, i.id, 'v') !== '' ? ` ${esc(unit)}` : ''}</td><td>${i.ref ?? (i.flagAbove !== undefined ? `<${i.flagAbove}` : '')}</td><td></td></tr>`;
          }
          const r = val(x.data, sec.id, i.id, 'R'), l = val(x.data, sec.id, i.id, 'L');
          const sym = symmetry(sec, i, num(r), num(l), affected);
          return `<tr><th scope="row">${esc(i.label)}</th><td>${show(r)}</td><td>${show(l)}</td><td>${i.ref !== undefined ? `${i.inverse ? '≤' : ''}${i.ref}` : ''}</td>
            <td class="${sym?.flag ? 'flag' : ''}">${sym ? `${sym.value.toFixed(0)}%` : ''}</td></tr>`;
        }).join('')}</tbody>
      </table>`;
  }).join('');

  const ctxRows = [
    ['Lado afectado', affected ? AFFECTED[affected] : ''],
    ['Motivo de consulta', ctx.complaint],
    ['Diagnóstico médico', ctx.diagnosis],
    ['Mecanismo de lesión', ctx.mechanism],
    ['Fecha lesión / cirugía', ctx.injury_date ? `${fmtDate(ctx.injury_date)}${weeks !== null && weeks >= 0 ? ` (${weeks} semanas)` : ''}` : ''],
  ].filter(([, v]) => v);

  $app.innerHTML = `
    <div class="no-print">${header('Informe', `#/assessment/${id}`)}</div>
    <main class="report">
      <div class="report-head">
        <div class="brand big">CSL<span>·</span>FIT</div>
        <div>
          <h1>Evaluación de ${esc(region.name.toLowerCase())}</h1>
          <p><strong>${esc(p.name)}</strong> · ${fmtDate(x.date)}${p.sport ? ` · ${esc(p.sport)}` : ''}${age(p.birthdate) ? ` · ${age(p.birthdate)} años` : ''}</p>
        </div>
      </div>
      ${ctxRows.length ? `<table class="report-table ctx"><tbody>${ctxRows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${tables}
      ${result.metrics.some((m) => m.R !== null || m.L !== null) ? `
        <h3>Índices</h3>
        <table class="report-table"><tbody>
          ${result.metrics.map((m) => `<tr><th scope="row">${esc(m.label)}</th><td>D ${fmt(m.R, m.digits)}${m.R !== null ? m.unit || '' : ''}</td><td>I ${fmt(m.L, m.digits)}${m.L !== null ? m.unit || '' : ''}</td></tr>`).join('')}
        </tbody></table>` : ''}
      <h3>Hallazgos</h3>
      ${result.findings.length ? `<ul class="findings">${result.findings.map((fd) => `<li class="${fd.level}">${esc(fd.text)}</li>`).join('')}</ul>` : '<p>Sin hallazgos relevantes.</p>'}
      ${x.notes ? `<h3>Observaciones</h3><p class="pre">${esc(x.notes)}</p>` : ''}
      ${x.data?.protocol ? `<h3>Protocolo</h3><div class="pre">${esc(x.data.protocol)}</div>` : ''}
      <footer class="report-foot">${esc(REPORT_FOOTER)}</footer>
      <div class="actions no-print"><button class="btn primary" id="print">Imprimir / PDF</button></div>
    </main>`;
  document.getElementById('print').onclick = () => window.print();
}

// ---------- Ajustes ----------
function viewSettings() {
  $app.innerHTML = `
    ${header('Ajustes', '#/')}
    <main>
      <section class="card">
        <h3>Cuenta</h3>
        <p class="muted">${store.mode === 'cloud' ? `Sesión: ${esc(user?.email)}` : 'Modo local (sin Supabase configurado)'}</p>
        ${store.mode === 'cloud' ? '<button class="btn ghost" id="logout">Cerrar sesión</button>' : ''}
      </section>
      ${store.mode === 'local' ? `
      <section class="card">
        <h3>Respaldo</h3>
        <p class="muted">Exporta tus datos para respaldarlos o moverlos a otro dispositivo.</p>
        <div class="actions left">
          <button class="btn ghost" id="export">Exportar JSON</button>
          <label class="btn ghost">Importar JSON<input type="file" id="import" accept="application/json" hidden /></label>
        </div>
      </section>` : ''}
      <section class="card">
        <h3>Umbrales globales</h3>
        <ul class="plain">
          <li>Asimetría (sin lado afectado): &gt; ${THRESHOLDS.asymmetryPct}%</li>
          <li>LSI mínimo (con lado afectado): ${THRESHOLDS.lsiMin}%</li>
          <li>Dolor EVA: ≥ ${THRESHOLDS.painEva}</li>
        </ul>
        <p class="hint">Se editan en <code>kine/config.js</code>. Cada región (tests, referencias, índices y ejercicios) se edita en <code>kine/regions/</code>.</p>
      </section>
      <section class="card">
        <h3>Regiones</h3>
        <p class="muted">${REGIONS.map((r) => esc(r.name)).join(' · ')}</p>
      </section>
    </main>`;
  document.getElementById('logout')?.addEventListener('click', async () => { await store.signOut(); });
  document.getElementById('export')?.addEventListener('click', () => {
    const blob = new Blob([store.exportLocal()], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `csl-kine-${today()}.json` });
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.getElementById('import')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !confirm('Esto reemplaza todos los datos locales. ¿Continuar?')) return;
    try {
      store.importLocal(await file.text());
      toast('Datos importados');
      go('#/');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------- Arranque ----------
async function start() {
  try {
    await store.init();
    user = await store.getUser();
  } catch (err) {
    $app.innerHTML = `<main><p class="empty">No se pudo conectar: ${esc(err.message)}</p></main>`;
    return;
  }
  store.onAuthChange((u) => {
    const changed = Boolean(u) !== Boolean(user);
    user = u;
    if (changed) render();
  });
  window.addEventListener('hashchange', render);
  render();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

start();
