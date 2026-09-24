// Capa de datos: Supabase si está configurado, localStorage si no.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const mode = SUPABASE_URL && SUPABASE_ANON_KEY ? 'cloud' : 'local';

const LS_KEY = 'csl-cadera-v1';
let sb = null;

export async function init() {
  if (mode !== 'cloud') return;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ---------- Auth ----------
export async function getUser() {
  if (mode === 'local') return { email: 'Modo local' };
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

export function onAuthChange(cb) {
  if (sb) sb.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
}

export async function signIn(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.href.split('#')[0] },
  });
  if (error) throw error;
}

export async function signOut() {
  if (sb) await sb.auth.signOut();
}

// ---------- Local ----------
function load() {
  try {
    const db = JSON.parse(localStorage.getItem(LS_KEY));
    if (db && Array.isArray(db.athletes) && Array.isArray(db.assessments)) return db;
  } catch { /* datos corruptos o storage bloqueado */ }
  return { athletes: [], assessments: [] };
}

function persist(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

function upsertLocal(list, row) {
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  return row;
}

export function exportLocal() {
  return JSON.stringify(load(), null, 2);
}

export function importLocal(json) {
  const db = JSON.parse(json);
  if (!Array.isArray(db.athletes) || !Array.isArray(db.assessments)) throw new Error('Archivo inválido');
  persist(db);
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- Atletas ----------
const ATHLETE_FIELDS = ['id', 'name', 'birthdate', 'sex', 'sport', 'dominant_side', 'leg_length_r', 'leg_length_l', 'notes'];

function cleanAthlete(a) {
  const row = {};
  for (const f of ATHLETE_FIELDS) row[f] = a[f] === '' || a[f] === undefined ? null : a[f];
  row.id ||= crypto.randomUUID();
  return row;
}

export async function listAthletes() {
  if (mode === 'local') return load().athletes.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return unwrap(await sb.from('athletes').select('*').order('name'));
}

export async function getAthlete(id) {
  if (mode === 'local') return load().athletes.find((a) => a.id === id) ?? null;
  return unwrap(await sb.from('athletes').select('*').eq('id', id).maybeSingle());
}

export async function saveAthlete(a) {
  const row = cleanAthlete(a);
  if (mode === 'local') {
    const db = load();
    upsertLocal(db.athletes, row);
    persist(db);
    return row;
  }
  return unwrap(await sb.from('athletes').upsert(row).select().single());
}

export async function deleteAthlete(id) {
  if (mode === 'local') {
    const db = load();
    db.athletes = db.athletes.filter((a) => a.id !== id);
    db.assessments = db.assessments.filter((x) => x.athlete_id !== id);
    persist(db);
    return;
  }
  unwrap(await sb.from('athletes').delete().eq('id', id));
}

// ---------- Evaluaciones ----------
function byDateDesc(a, b) {
  return b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || '');
}

export async function listAssessments(athleteId) {
  if (mode === 'local') return load().assessments.filter((x) => x.athlete_id === athleteId).sort(byDateDesc);
  return unwrap(await sb.from('assessments').select('*').eq('athlete_id', athleteId)
    .order('date', { ascending: false }).order('created_at', { ascending: false }));
}

export async function getAssessment(id) {
  if (mode === 'local') return load().assessments.find((x) => x.id === id) ?? null;
  return unwrap(await sb.from('assessments').select('*').eq('id', id).maybeSingle());
}

export async function saveAssessment(x) {
  const row = {
    id: x.id || crypto.randomUUID(),
    athlete_id: x.athlete_id,
    date: x.date,
    data: x.data || {},
    notes: x.notes || null,
  };
  if (mode === 'local') {
    const db = load();
    const prev = db.assessments.find((a) => a.id === row.id);
    row.created_at = prev?.created_at || new Date().toISOString();
    upsertLocal(db.assessments, row);
    persist(db);
    return row;
  }
  return unwrap(await sb.from('assessments').upsert(row).select().single());
}

export async function deleteAssessment(id) {
  if (mode === 'local') {
    const db = load();
    db.assessments = db.assessments.filter((x) => x.id !== id);
    persist(db);
    return;
  }
  unwrap(await sb.from('assessments').delete().eq('id', id));
}
