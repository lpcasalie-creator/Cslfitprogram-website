# CSL Kine

PWA de evaluación kinésica y biomecánica por región articular, para profesionales de
kinesiología, traumatología y análisis de movimiento. Sin build: HTML + ES modules,
se sirve como estático en `/kine/`.

## Qué hace
- Fichas de pacientes (lado dominante, largo de pierna para Y-Balance).
- Evaluación por región: hombro, codo, muñeca/mano, columna cervical, columna lumbar, cadera, rodilla, tobillo/pie.
- Contexto clínico: lado afectado, motivo, diagnóstico, mecanismo, fecha de lesión/cirugía (semanas post).
- Análisis en vivo: déficit vs referencia, asimetría D/I o **LSI** (afectado/sano) si hay lado afectado,
  tests especiales positivos, EVA, cuestionarios (ODI, NDI) e índices propios de cada región
  (ADD/ABD, I/Q, RE/RI, GIRD, composite Y-Balance).
- Protocolo generado desde los hallazgos (editable), evolución por región e informe imprimible / PDF.
- Instalable (manifest + service worker).

## Estructura
| Archivo | Qué contiene |
|---|---|
| `config.js` | Supabase, umbrales globales (asimetría, LSI, EVA) y pie del informe |
| `regions/*.js` | Una región por archivo: secciones, tests, referencias, índices derivados y protocolos |
| `regions/common.js` | Formato de sección documentado + bloques reutilizables (dolor, Y-Balance, ratios) |
| `regions/index.js` | Registro de regiones (orden en el selector) |
| `analysis.js` | Motor genérico que interpreta las regiones |

**Agregar o especializar una región:** editar/crear su archivo en `regions/` siguiendo el formato de
`common.js` y registrarlo en `regions/index.js`. Los hallazgos generan claves
`seccion.item.deficit|asym|pos|high` (o `derived.*`) que se mapean a ejercicios en `protocols`.

Referencias, umbrales y protocolos vienen con valores por defecto: **validarlos clínicamente** antes de usar.

Al cambiar archivos del shell, sube `CACHE` en `sw.js` (`csl-kine-v2`, …) y agrega los archivos nuevos a `SHELL`.

## Backend (Supabase)
Sin credenciales la app corre en **modo local** (localStorage, con export/import JSON en Ajustes).

1. Crear proyecto en supabase.com.
2. SQL Editor → ejecutar `supabase/schema.sql` (tablas + RLS: cada profesional ve solo sus datos).
3. Authentication → URL Configuration: agregar `https://cslfitprogram.com/kine/` como Site URL / Redirect URL.
4. Pegar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `config.js`.

## Desarrollo local
```
python3 -m http.server 8000   # desde la raíz del repo
# abrir http://localhost:8000/kine/
```
