# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, zero-dependency, 100% client-side web app that parses free-text bibliographic references and reformats them into APA, Vancouver/NLM, IEEE, Harvard, MLA, Chicago or AMA style, plus BibTeX/RIS export. No backend, no build step, no network calls — all parsing and formatting happens in the browser via regex heuristics.

## Running / developing

There is no build system, package manager, or test runner. This is intentional (matches the author's other zero-dependency local apps).

- **Open directly**: double-click `Normalizador-bibliografico.html` or open it via `file://`. The service worker is intentionally skipped on `file:` protocol (see bottom of the script), so this mode has no offline caching but needs none — everything is already local.
- **Serve locally to test the PWA/service-worker layer** (install prompt, offline caching, "add to dock"): the service worker only registers over `http(s)://`, so serve the folder, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/Normalizador-bibliografico.html`.
- **No linting or tests exist.** The riskiest code (the regex-based reference parser) has no automated regression coverage — verify parsing changes manually against a range of real references (APA/Vancouver/IEEE-style input, with/without DOI, with/without blank-line separation) before shipping.

## Architecture

Everything lives in one file, `Normalizador-bibliografico.html`: inline `<style>`, inline HTML, inline `<script>` (a single IIFE). There is no module system and no separate JS/CSS files to keep the app copy-paste/single-file distributable.

**Data flow**, all inside the IIFE in the `<script>` block:

1. `cut(raw)` splits the pasted textarea content into individual reference strings, using blank-line separation or a numbered-list/heading regex as a fallback.
2. `parse(raw)` turns each raw string into a reference object `{type, authors, year, title, source, publisher, volume, issue, pages, doi, url, pmid, isbn}` via a sequence of regex extractions (DOI → URL → PMID → ISBN → year+author/title split → volume/issue/pages → type inference).
3. Parsed references are held in the module-level `R` array (the single source of truth — the app has no other state).
4. `draw()` re-renders everything from `R`: the formatted output panel (`cite`/`bib`/`ris`, selected via module-level `V`), the status badge (counts + missing-field + duplicate warnings), and the editable per-reference `<details>` grid.
5. Per-style formatting is done by three renderer functions keyed off `r.type`/style: `cite(r,n,s)` (human-readable bibliography per citation style), `bib(r,n)` (BibTeX), `ris(r)` (RIS).
6. Editing a field in the grid and clicking "Actualizar resultado" (`#refresh`) writes the edited values back into `R` and calls `draw()` again — there is no live/reactive binding.

**Persistence**: session state (`{src, refs, style, sort}`) is saved to `localStorage['bibLocal']` only on explicit "Guardar sesión" click, and auto-loaded from it on page load. "Exportar sesión" / "Importar sesión" round-trip the same shape through a downloaded/uploaded `.json` file. There is no autosave — closing the tab without clicking Save loses unsaved work.

**PWA layer** (`manifest.webmanifest`, `sw.js`, icon files): makes the app installable ("Add to Dock"/home screen) when served over http(s). `sw.js` precaches a fixed asset list under a cache name that is version-stamped by hand (`normalizador-bibliografico-v1.2`) — **this string must be bumped on every release that changes cached assets**, or returning users keep getting the stale cached version indefinitely.

**Update-available flow**: `sw.js` does NOT call `self.skipWaiting()` on install — a newly deployed worker deliberately sits in the `waiting` state instead of taking over immediately. The page (bottom of the `<script>` block, after the help-modal code) watches `registration.waiting`/`updatefound` and, only when `navigator.serviceWorker.controller` is already set (i.e. this is a real update, not a first install), reveals the `#updBar` banner ("Actualización disponible"). Clicking `#updBtn` posts `'skipWaiting'` to the waiting worker; `sw.js`'s `message` listener calls `self.skipWaiting()` in response, which triggers `controllerchange` on the page and a one-time `location.reload()`. Keep the `navigator.serviceWorker.controller` guard when touching this code — without it, every first-time visitor sees a spurious "update available" banner.

**Versioning convention**: the visible app version lives in three places that must be kept in sync manually — the `.version b` banner text, the changelog block in the help modal, and the `sw.js` `CACHE` constant.

## Despliegue

La app se publica en GitHub Pages desde la rama `main` (raíz del repo): https://cjgaland.github.io/normalizador-bibliografico/

- `index.html` es solo un redirector a `Normalizador-bibliografico.html` (GitHub Pages exige `index.html` en la raíz). La fuente de verdad sigue siendo `Normalizador-bibliografico.html`; no dupliques lógica en `index.html`.
- Desplegar = hacer commit y `git push` a `main`; Pages reconstruye solo (tarda ~30-60 s). No hay CI ni build step.
- **Al publicar cambios que afecten a los assets cacheados, sube la versión del `CACHE` en `sw.js`** (y las otras dos referencias de versión descritas arriba), o los usuarios que ya instalaron la PWA seguirán viendo la versión vieja cacheada.

## Copias de seguridad locales

Sistema de respaldo local con rotación (carpeta `Backup/`, ignorada en git):

- Cada copia es una carpeta `Backup/Copia_Seguridad_NormalizadorBibliografico_DD_MM_YYYY-HH_MM` con el proyecto completo (rsync -a), excluyendo `Backup`, `.git` y datos personales/secretos (`*.csv`, `.env*`).
- Se conservan solo las **5 copias más recientes**; al crear una nueva se borra la más antigua.
- Disparadores: "Haz una copia" / "Copia de seguridad", o antes de desplegar/publicar una nueva versión.
- Script: skill personal `app-copia_seguridad` (`bash /Users/Trabajo/.claude/skills/app-copia_seguridad/scripts/copia_seguridad.sh --root "/Users/Trabajo/Desktop/Normalizador Bibliográfico" --name "NormalizadorBibliografico"`). `Backup/` está en `.gitignore`.
