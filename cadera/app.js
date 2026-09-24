import * as store from './store.js';
import { SECTIONS, SIDES, itemType } from './tests.js';
import { THRESHOLDS } from './config.js';
import { analyze, buildProtocol, asymmetryPct, num, val, countFilled } from './analysis.js';

const $app = document.getElementById('app');
let user = null;

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
const SEX = { F: 'Femenino', M: 'Masculino', X: 'Otro' };
const SIDE_LABEL = { R: 'Derecha', L: 'Izquierda' };

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
      ${back ? `<a class="back" href="${back}" aria-label="Volver">‹</a>` : '<span class="brand">CSL<span>·</span>CADERA</span>'}
      <h1>${esc(title)}</h1>
      <a class="icon-btn" href="#/settings" aria-label="Ajustes">⚙</a>
    </header>`;
}

// ---------- Router ----------
const routes = [
  [/^#?\/?$/, viewAthletes],
  [/^#\/athlete\/new$/, () => viewAthleteForm(null)],
  [/^#\/athlete\/([\w-]+)\/edit$/, (id) => viewAthleteForm(id)],
  [/^#\/athlete\/([\w-]+)\/assess$/, (id) => viewAssessment(null, id)],
  [/^#\/athlete\/([\w-]+)$/, viewAthlete],
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
      <div class="brand big">CSL<span>·</span>CADERA</div>
      <p class="muted">Evaluación de cadera para coaches</p>
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

// ---------- Lista de atletas ----------
async function viewAthletes() {
  const athletes = await store.listAthletes();
  $app.innerHTML = `
    ${header('Atletas')}
    <main>
      ${store.mode === 'local' ? '<p class="banner">Modo local: los datos quedan solo en este dispositivo. Configura Supabase para sincronizar.</p>' : ''}
      <div class="toolbar">
        <input type="search" id="q" placeholder="Buscar atleta…" />
        <a class="btn primary" href="#/athlete/new">+ Atleta</a>
      </div>
      <ul class="list" id="list">
        ${athletes.map((a) => `
          <li data-name="${esc(a.name.toLowerCase())}">
            <a href="#/athlete/${a.id}">
              <strong>${esc(a.name)}</strong>
              <span class="muted">${[a.sport, age(a.birthdate) ? `${age(a.birthdate)} años` : null].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</span>
            </a>
          </li>`).join('')}
      </ul>
      ${athletes.length ? '' : '<p class="empty">Aún no tienes atletas. Crea el primero para empezar a evaluar.</p>'}
    </main>`;
  document.getElementById('q').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#list li').forEach((li) => { li.hidden = !li.dataset.name.includes(q); });
  };
}

// ---------- Formulario de atleta ----------
async function viewAthleteForm(id) {
  const a = id ? await store.getAthlete(id) : {};
  if (id && !a) return go('#/');
  const opt = (value, label, current) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  $app.innerHTML = `
    ${header(id ? 'Editar atleta' : 'Nuevo atleta', id ? `#/athlete/${id}` : '#/')}
    <main>
      <form id="f" class="card form">
        <label>Nombre<input name="name" required value="${esc(a.name)}" /></label>
        <div class="row">
          <label>Fecha de nacimiento<input type="date" name="birthdate" value="${esc(a.birthdate)}" /></label>
          <label>Sexo<select name="sex"><option value="">—</option>${Object.entries(SEX).map(([k, v]) => opt(k, v, a.sex)).join('')}</select></label>
        </div>
        <div class="row">
          <label>Deporte / disciplina<input name="sport" value="${esc(a.sport)}" placeholder="CrossFit, HYROX, Weightlifting…" /></label>
          <label>Lado dominante<select name="dominant_side"><option value="">—</option>${opt('R', 'Derecho', a.dominant_side)}${opt('L', 'Izquierdo', a.dominant_side)}</select></label>
        </div>
        <div class="row">
          <label>Largo pierna D (cm)<input type="number" step="0.5" min="0" name="leg_length_r" value="${esc(a.leg_length_r)}" /></label>
          <label>Largo pierna I (cm)<input type="number" step="0.5" min="0" name="leg_length_l" value="${esc(a.leg_length_l)}" /></label>
        </div>
        <p class="hint">El largo de pierna (EIAS a maléolo medial) se usa para el composite del Y-Balance.</p>
        <label>Antecedentes / notas<textarea name="notes" rows="3">${esc(a.notes)}</textarea></label>
        <div class="actions">
          ${id ? '<button type="button" class="btn danger" id="del">Eliminar</button>' : ''}
          <button class="btn primary" type="submit">Guardar</button>
        </div>
      </form>
    </main>`;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const saved = await store.saveAthlete({ ...a, ...Object.fromEntries(new FormData(f)) });
    toast('Atleta guardado');
    go(`#/athlete/${saved.id}`);
  };
  document.getElementById('del')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${a.name} y todas sus evaluaciones?`)) return;
    await store.deleteAthlete(id);
    toast('Atleta eliminado');
    go('#/');
  });
}

// ---------- Ficha de atleta ----------
async function viewAthlete(id) {
  const [a, list] = await Promise.all([store.getAthlete(id), store.listAssessments(id)]);
  if (!a) return go('#/');
  const facts = [
    a.sport,
    age(a.birthdate) ? `${age(a.birthdate)} años` : null,
    SEX[a.sex],
    a.dominant_side ? `Dominante ${a.dominant_side === 'R' ? 'D' : 'I'}` : null,
  ].filter(Boolean);

  $app.innerHTML = `
    ${header(a.name, '#/')}
    <main>
      <section class="card">
        <div class="card-head">
          <div>
            <p class="muted">${facts.map(esc).join(' · ') || 'Sin datos'}</p>
            ${a.notes ? `<p class="notes">${esc(a.notes)}</p>` : ''}
          </div>
          <a class="btn ghost" href="#/athlete/${id}/edit">Editar</a>
        </div>
      </section>
      <div class="toolbar">
        <h2>Evaluaciones</h2>
        <a class="btn primary" href="#/athlete/${id}/assess">+ Evaluación</a>
      </div>
      ${list.length ? `
        <ul class="list">
          ${list.map((x) => {
            const { findings } = analyze(x.data, a);
            const alerts = findings.filter((f) => f.level === 'alert').length;
            return `
              <li><a href="#/assessment/${x.id}">
                <strong>${fmtDate(x.date)}</strong>
                <span class="muted">${countFilled(x.data)} registros ·
                  <span class="${alerts ? 'tag alert' : findings.length ? 'tag warn' : 'tag ok'}">${findings.length} ${findings.length === 1 ? 'hallazgo' : 'hallazgos'}</span>
                </span>
              </a></li>`;
          }).join('')}
        </ul>
        ${list.length > 1 ? evolutionTable(list, a) : ''}
      ` : '<p class="empty">Sin evaluaciones todavía.</p>'}
    </main>`;
}

function evolutionTable(list, athlete) {
  const cols = list.slice(0, 5).reverse();
  const rows = [];
  for (const sec of SECTIONS.filter((s) => s.id === 'rom' || s.id === 'strength')) {
    rows.push(`<tr class="group"><th colspan="${cols.length + 1}">${sec.title} (${sec.unit})</th></tr>`);
    for (const item of sec.items) {
      for (const side of SIDES) {
        const values = cols.map((x) => num(val(x.data, sec.id, item.id, side.id)));
        if (values.every((v) => v === null)) continue;
        rows.push(`<tr><td>${esc(item.label)} ${side.label}</td>${values.map((v, i) => {
          const prev = i > 0 ? values[i - 1] : null;
          const delta = v !== null && prev !== null ? v - prev : null;
          const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
          return `<td>${fmt(v, sec.id === 'strength' ? 1 : 0)}${delta ? `<small class="${cls}">${delta > 0 ? '+' : ''}${fmt(delta, sec.id === 'strength' ? 1 : 0)}</small>` : ''}</td>`;
        }).join('')}</tr>`);
      }
    }
  }
  const comps = cols.map((x) => analyze(x.data, athlete).composite);
  if (comps.some((c) => c.R !== null || c.L !== null)) {
    rows.push(`<tr class="group"><th colspan="${cols.length + 1}">Y-Balance composite (%)</th></tr>`);
    for (const side of SIDES) rows.push(`<tr><td>Composite ${side.label}</td>${comps.map((c) => `<td>${fmt(c[side.id], 1)}</td>`).join('')}</tr>`);
  }
  return `
    <h2>Evolución</h2>
    <div class="table-wrap">
      <table class="evo">
        <thead><tr><th></th>${cols.map((x) => `<th>${fmtDate(x.date)}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

// ---------- Evaluación (crear / editar) ----------
async function viewAssessment(id, athleteId) {
  let x;
  if (id) {
    x = await store.getAssessment(id);
    if (!x) return go('#/');
    athleteId = x.athlete_id;
  } else {
    x = { athlete_id: athleteId, date: today(), data: {}, notes: '' };
  }
  const athlete = await store.getAthlete(athleteId);
  if (!athlete) return go('#/');
  const data = structuredClone(x.data || {});
  let protocolEdited = Boolean(data.protocol);

  $app.innerHTML = `
    ${header(id ? 'Evaluación' : 'Nueva evaluación', `#/athlete/${athleteId}`)}
    <main>
      <p class="muted center">${esc(athlete.name)}</p>
      <form id="f">
        <section class="card">
          <label>Fecha<input type="date" name="date" required value="${esc(x.date)}" /></label>
        </section>
        ${SECTIONS.map((sec) => sectionCard(sec, data)).join('')}
        <section class="card">
          <h3>Observaciones</h3>
          <textarea name="notes" rows="3" placeholder="Hallazgos cualitativos, compensaciones, contexto…">${esc(x.notes)}</textarea>
        </section>
        <section class="card" id="analysis"></section>
        <section class="card">
          <div class="card-head">
            <h3>Protocolo</h3>
            <button type="button" class="btn ghost small" id="regen">Regenerar</button>
          </div>
          <textarea name="protocol" id="protocol" rows="10" placeholder="Se genera a partir de los hallazgos. Puedes editarlo."></textarea>
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
    for (const sec of SECTIONS) {
      data[sec.id] = {};
      for (const item of sec.items) {
        data[sec.id][item.id] = {};
        for (const side of SIDES) data[sec.id][item.id][side.id] = f.elements[`${sec.id}.${item.id}.${side.id}`].value;
      }
    }
  };

  const refresh = () => {
    readForm();
    const result = analyze(data, athlete);
    document.getElementById('analysis').innerHTML = analysisHTML(result);
    f.querySelectorAll('[data-asym]').forEach((cell) => {
      const [s, i] = cell.dataset.asym.split('.');
      const a = asymmetryPct(num(val(data, s, i, 'R')), num(val(data, s, i, 'L')));
      cell.textContent = a === null ? '' : `${a.toFixed(0)}%`;
      cell.classList.toggle('flag', a !== null && a > THRESHOLDS.asymmetryPct);
    });
    f.querySelectorAll('[data-ref]').forEach((input) => {
      const v = num(input.value);
      input.classList.toggle('below', v !== null && v < Number(input.dataset.ref));
    });
    if (!protocolEdited) $protocol.value = buildProtocol(result.findings);
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
    go(`#/athlete/${athleteId}`);
  });
}

function sectionCard(sec, data) {
  const showAsym = sec.type === 'number' || sec.type === 'mixed';
  const showRef = sec.items.some((i) => i.ref);
  return `
    <section class="card">
      <h3>${esc(sec.title)} <small class="muted">${esc(sec.subtitle)}</small></h3>
      <table class="grid">
        <thead><tr><th></th><th>D</th><th>I</th>${showRef ? '<th>Ref</th>' : ''}${showAsym ? '<th>Asim</th>' : ''}</tr></thead>
        <tbody>
          ${sec.items.map((item) => {
            const type = itemType(sec, item);
            const cfg = { ...sec, ...item };
            const cell = (side) => {
              const name = `${sec.id}.${item.id}.${side.id}`;
              const v = val(data, sec.id, item.id, side.id);
              if (type === 'select') {
                return `<select name="${name}" aria-label="${esc(item.label)} ${side.label}"><option value="">—</option>${item.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
              }
              return `<input type="number" inputmode="decimal" name="${name}" aria-label="${esc(item.label)} ${side.label}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${esc(v)}" ${item.ref ? `data-ref="${item.ref}"` : ''} />`;
            };
            return `
              <tr>
                <th scope="row">${esc(item.label)}</th>
                <td>${cell(SIDES[0])}</td>
                <td>${cell(SIDES[1])}</td>
                ${showRef ? `<td class="muted">${item.ref ?? ''}</td>` : ''}
                ${showAsym ? `<td class="asym" ${type === 'number' ? `data-asym="${sec.id}.${item.id}"` : ''}></td>` : ''}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </section>`;
}

function analysisHTML({ findings, composite, ratio }) {
  const metric = (label, r, l, d, unit = '') => `
    <div class="metric"><span class="muted">${label}</span><strong>D ${fmt(r, d)}${unit} · I ${fmt(l, d)}${unit}</strong></div>`;
  return `
    <h3>Análisis</h3>
    <div class="metrics">
      ${metric('Ratio ADD/ABD', ratio.R, ratio.L, 2)}
      ${metric('Y-Balance composite', composite.R, composite.L, 1, '%')}
    </div>
    ${findings.length ? `
      <ul class="findings">
        ${findings.map((fd) => `<li class="${fd.level}">${esc(fd.text)}</li>`).join('')}
      </ul>` : '<p class="muted">Sin hallazgos con los datos ingresados.</p>'}`;
}

// ---------- Informe imprimible ----------
async function viewReport(id) {
  const x = await store.getAssessment(id);
  if (!x) return go('#/');
  const a = await store.getAthlete(x.athlete_id);
  const result = analyze(x.data, a);

  const tables = SECTIONS.map((sec) => {
    const rows = sec.items.filter((i) => SIDES.some((s) => val(x.data, sec.id, i.id, s.id) !== ''));
    if (!rows.length) return '';
    const isNum = (i) => itemType(sec, i) === 'number';
    return `
      <h3>${esc(sec.title)} <small>${esc(sec.subtitle)}</small></h3>
      <table class="report-table">
        <thead><tr><th></th><th>Derecha</th><th>Izquierda</th><th>Ref</th><th>Asimetría</th></tr></thead>
        <tbody>${rows.map((i) => {
          const r = val(x.data, sec.id, i.id, 'R'), l = val(x.data, sec.id, i.id, 'L');
          const asym = isNum(i) ? asymmetryPct(num(r), num(l)) : null;
          return `<tr><th scope="row">${esc(i.label)}</th><td>${esc(r || '—')}</td><td>${esc(l || '—')}</td><td>${i.ref ?? ''}</td>
            <td class="${asym !== null && asym > THRESHOLDS.asymmetryPct ? 'flag' : ''}">${asym === null ? '' : `${asym.toFixed(0)}%`}</td></tr>`;
        }).join('')}</tbody>
      </table>`;
  }).join('');

  $app.innerHTML = `
    <div class="no-print">${header('Informe', `#/assessment/${id}`)}</div>
    <main class="report">
      <div class="report-head">
        <div class="brand big">CSL<span>·</span>FIT</div>
        <div>
          <h1>Evaluación de cadera</h1>
          <p><strong>${esc(a.name)}</strong> · ${fmtDate(x.date)}${a.sport ? ` · ${esc(a.sport)}` : ''}${a.dominant_side ? ` · Dominante: ${SIDE_LABEL[a.dominant_side]}` : ''}</p>
        </div>
      </div>
      ${tables}
      <h3>Índices</h3>
      <table class="report-table">
        <tbody>
          <tr><th scope="row">Ratio ADD/ABD</th><td>D ${fmt(result.ratio.R, 2)}</td><td>I ${fmt(result.ratio.L, 2)}</td></tr>
          <tr><th scope="row">Y-Balance composite</th><td>D ${fmt(result.composite.R, 1)}%</td><td>I ${fmt(result.composite.L, 1)}%</td></tr>
        </tbody>
      </table>
      <h3>Hallazgos</h3>
      ${result.findings.length ? `<ul class="findings">${result.findings.map((fd) => `<li class="${fd.level}">${esc(fd.text)}</li>`).join('')}</ul>` : '<p>Sin hallazgos relevantes.</p>'}
      ${x.notes ? `<h3>Observaciones</h3><p class="pre">${esc(x.notes)}</p>` : ''}
      ${x.data?.protocol ? `<h3>Protocolo</h3><div class="pre">${esc(x.data.protocol)}</div>` : ''}
      <footer class="report-foot">
        Luis Casali · CF-L3 · CCFT · USAW L1 · HYROX Official Coach · @luis_casali
      </footer>
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
        <h3>Umbrales de análisis</h3>
        <ul class="plain">
          <li>Asimetría ROM / fuerza: &gt; ${THRESHOLDS.asymmetryPct}%</li>
          <li>Ratio ADD/ABD mínimo: ${THRESHOLDS.addAbdRatioMin}</li>
          <li>Y-Balance anterior: diferencia &gt; ${THRESHOLDS.yBalanceAntCm} cm</li>
          <li>Y-Balance composite mínimo: ${THRESHOLDS.yBalanceCompositeMin}%</li>
          <li>Dolor EVA: ≥ ${THRESHOLDS.painEva}</li>
        </ul>
        <p class="hint">Se editan en <code>cadera/config.js</code>. Referencias de ROM en <code>tests.js</code> y ejercicios en <code>protocols.js</code>.</p>
      </section>
    </main>`;
  document.getElementById('logout')?.addEventListener('click', async () => { await store.signOut(); });
  document.getElementById('export')?.addEventListener('click', () => {
    const blob = new Blob([store.exportLocal()], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `csl-cadera-${today()}.json` });
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
