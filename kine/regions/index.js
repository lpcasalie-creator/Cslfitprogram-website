// Registro de regiones. Para agregar una nueva: crear su archivo y sumarlo aquí.
import shoulder from './shoulder.js';
import elbow from './elbow.js';
import wrist from './wrist.js';
import cervical from './cervical.js';
import lumbar from './lumbar.js';
import hip from './hip.js';
import knee from './knee.js';
import ankle from './ankle.js';

export const REGIONS = [shoulder, elbow, wrist, cervical, lumbar, hip, knee, ankle];
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
