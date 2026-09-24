// Configuración de CSL Kine.
// Sin credenciales de Supabase la app funciona en modo local (datos en este dispositivo).
// Para sincronizar entre dispositivos: crea un proyecto en supabase.com, ejecuta
// supabase/schema.sql y pega aquí la URL y la anon key (Project Settings → API).
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Umbrales globales de análisis. Valores por defecto editables: ajústalos a tu criterio clínico.
// Los umbrales propios de cada articulación están en su archivo dentro de regions/.
export const THRESHOLDS = {
  asymmetryPct: 10, // % de diferencia D/I que se marca como asimetría (sin lado afectado definido)
  lsiMin: 90,       // Limb Symmetry Index mínimo (%) cuando hay lado afectado definido
  painEva: 3,       // EVA desde el cual se marca dolor (≥ 7 se marca como alerta)
};

// Pie de página del informe imprimible.
export const REPORT_FOOTER = 'Luis Casali · CF-L3 · CCFT · USAW L1 · HYROX Official Coach · @luis_casali';
