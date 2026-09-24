# CSL Cadera

PWA de evaluación de cadera para coaches. Sin build: HTML + ES modules, se sirve como estático en `/cadera/`.

## Qué hace
- Fichas de atletas (lado dominante, largo de pierna para Y-Balance).
- Evaluación bilateral: ROM (goniometría), fuerza isométrica (dinamometría), Thomas, FABER, FADIR, Ober, Y-Balance, single-leg squat y EVA.
- Análisis en vivo: déficit vs referencia, asimetrías D/I, ratio ADD/ABD, composite Y-Balance.
- Protocolo sugerido a partir de los hallazgos (editable antes de guardar).
- Evolución entre evaluaciones e informe imprimible / PDF con marca CSL-Fit.
- Instalable (manifest + service worker).

## Personalizar
| Archivo | Qué editar |
|---|---|
| `config.js` | Credenciales Supabase y umbrales de análisis |
| `tests.js` | Tests, rangos y referencias de ROM |
| `protocols.js` | Ejercicios por hallazgo (contenido semilla, reemplazar) |

Al cambiar archivos del shell, sube `CACHE` en `sw.js` (`csl-cadera-v2`, …) para forzar la actualización en dispositivos instalados.

## Backend (Supabase)
Sin credenciales la app corre en **modo local** (localStorage, con export/import JSON en Ajustes).

1. Crear proyecto en supabase.com.
2. SQL Editor → ejecutar `supabase/schema.sql` (tablas + RLS: cada coach ve solo sus datos).
3. Authentication → URL Configuration: agregar `https://cslfitprogram.com/cadera/` como Site URL / Redirect URL.
4. Pegar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `config.js`.

El login es por magic link al email. La anon key es pública por diseño; la seguridad la da RLS.

## Desarrollo local
```
python3 -m http.server 8000   # desde la raíz del repo
# abrir http://localhost:8000/cadera/
```
