// Configuración de CSL Cadera.
// Sin credenciales de Supabase la app funciona en modo local (datos en este dispositivo).
// Para sincronizar entre dispositivos: crea un proyecto en supabase.com, ejecuta
// supabase/schema.sql y pega aquí la URL y la anon key (Project Settings → API).
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Umbrales de análisis. Son valores por defecto editables: ajústalos a tu criterio clínico.
export const THRESHOLDS = {
  asymmetryPct: 10,        // % de diferencia D/I que se marca como asimetría (ROM y fuerza)
  addAbdRatioMin: 0.8,     // ratio fuerza aductores/abductores bajo el cual se marca
  yBalanceAntCm: 4,        // diferencia D/I en alcance anterior del Y-Balance (cm)
  yBalanceCompositeMin: 94, // composite score (% largo de pierna)
  painEva: 3,              // EVA desde el cual se marca dolor
};
