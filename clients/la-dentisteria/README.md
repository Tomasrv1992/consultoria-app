# La Dentisteria — WordPress Site

Custom WordPress block theme for La Dentisteria dental clinic. Built for ladentisteriacv.com.

## Local development setup

1. Install Local by Flywheel: https://localwp.com/
2. Create a new site:
   - Site name: La Dentisteria
   - Domain: ladentisteria.local
   - Environment: PHP 8.1, MySQL 8, nginx
3. Symlink this theme into the Local site:
   ```powershell
   # Windows (PowerShell, run as Administrator due to Local Sites perms)
   New-Item -ItemType Junction `
     -Path "$env:USERPROFILE\Local Sites\la-dentisteria\app\public\wp-content\themes\ladentisteria" `
     -Target "C:\Users\TOMAS\Desktop\consultoria-app\clients\la-dentisteria\wp-theme"
   ```
   (cmd alternative: `mklink /J "%USERPROFILE%\Local Sites\la-dentisteria\app\public\wp-content\themes\ladentisteria" "C:\Users\TOMAS\Desktop\consultoria-app\clients\la-dentisteria\wp-theme"`)
   ```bash
   # macOS/Linux
   ln -s "$(pwd)/clients/la-dentisteria/wp-theme" "$HOME/Local Sites/la-dentisteria/app/public/wp-content/themes/ladentisteria"
   ```
4. Activate "La Dentisteria" theme in wp-admin → Appearance → Themes.

## Fonts

**Current (dev):** Google Fonts CDN — loaded via `wp_enqueue_style` in `inc/enqueue.php` with `<link rel="preconnect">` hints in `<head>`. Parallel fetch, no `@import` blocking.

**Production swap to self-hosted (better Core Web Vitals):**

1. Visit https://gwfh.mranftl.com/fonts
2. Download:
   - DM Serif Display: regular 400 + italic 400 (woff2)
   - Inter Tight: variable font (woff2)
3. Place files in `assets/fonts/` with these exact filenames:
   - `dm-serif-display-400.woff2`
   - `dm-serif-display-400-italic.woff2`
   - `inter-tight-variable.woff2`
4. Restore the `fontFace` arrays in `theme.json` for both families. Add inside each family object (after `name`):

   For DM Serif Display:
   ```json
   "fontFace": [
     {
       "fontFamily": "DM Serif Display",
       "fontStyle": "normal",
       "fontWeight": "400",
       "src": ["file:./assets/fonts/dm-serif-display-400.woff2"]
     },
     {
       "fontFamily": "DM Serif Display",
       "fontStyle": "italic",
       "fontWeight": "400",
       "src": ["file:./assets/fonts/dm-serif-display-400-italic.woff2"]
     }
   ]
   ```

   For Inter Tight:
   ```json
   "fontFace": [
     {
       "fontFamily": "Inter Tight",
       "fontStyle": "normal",
       "fontWeight": "400 700",
       "src": ["file:./assets/fonts/inter-tight-variable.woff2"]
     }
   ]
   ```
5. Remove the `ladent-google-fonts` `wp_enqueue_style` call from `inc/enqueue.php`.
6. Remove the `wp_head` preconnect hints for `fonts.googleapis.com` and `fonts.gstatic.com`.

## Project structure

```
wp-theme/
├── style.css                  Theme metadata
├── theme.json                 Design tokens (FSE)
├── functions.php              Bootstrap
├── templates/                 Page templates
├── parts/                     Header/footer template parts
├── patterns/                  Reusable block patterns
├── assets/
│   ├── css/                   Stylesheets
│   ├── js/                    Scripts
│   └── fonts/                 Self-hosted fonts (download separately)
└── inc/                       PHP includes (CPT, schema, SEO)
```

## Post-import setup (one-time, after running import-content.sh)

After the import script populates the `servicio` CPT entries and the 3 pages, four manual GUI steps are still required for V1 to render correctly:

### 1. Flush rewrite rules

The `servicio` CPT registers URL pattern `/servicios/[slug]/`. WordPress doesn't auto-flush rewrites on theme activation; without this step every service URL returns 404.

Settings → Permalinks → click "Save Changes" (no edits). Done.

### 2. Assemble the home page from patterns

`templates/front-page.html` only renders `<post-content>`. The home's hero / servicios / pilares / etc. are all block patterns — they need to be inserted into a static page.

1. Pages → Add New → title "Inicio" (or any name), publish.
2. Open the page in the block editor.
3. Click `+` → Patterns → "La Dentisteria" category.
4. Insert these patterns in order:
   1. Hero — Storytelling
   2. Servicios destacados (3 cards)
   3. Pilares de confianza
   4. Nosotros teaser
   5. Internacional banner
   6. Testimonios (placeholder)
   7. Blog teaser
   8. CTA final — Reserva tu valoración
5. Update.
6. Settings → Reading → "Your homepage displays" → "A static page" → Homepage: Inicio.

### 3. Create the primary navigation

`parts/header.html` uses `<wp:navigation>` which auto-resolves to the most recent menu created in the editor. Create one:

1. Appearance → Editor → Navigation → Add new.
2. Add menu items: Servicios (`/servicios/`), Nosotros (`/nosotros/`), Internacional (`/pacientes-internacionales/` — placeholder until V1.2), Blog (`/blog/` — placeholder until V1.1), Contacto (`/contacto/`), Agendar cita (`/agendar-cita/`).
3. Save.

### 4. Required plugins

Install + activate from the Plugins admin:

- **Yoast SEO** — handles WebSite/Organization JSON-LD, sitemap_index.xml (declared in our robots.txt), title tag templates, breadcrumbs.
- **Fluent Forms** (free version is enough for V1) — used by `/agendar-cita/` form embed (Phase 7).

After Yoast install, run its first-time configuration wizard:
- Site type: Healthcare/Dental
- Organization name: La Dentisteria
- Persona: organization (not personal)

For each of the 4 service pages, set Yoast SEO box's:
- SEO title (from MD frontmatter `seo_title`)
- Meta description (from MD frontmatter `seo_description`)
- Focus keyphrase (from MD frontmatter `keyword_primary`)

### 5. Verify schema in production

Once the theme is deployed and content is up:
- Submit `https://ladentisteriacv.com/sitemap_index.xml` to [Google Search Console](https://search.google.com/search-console)
- Test the home page at the [Rich Results Test](https://search.google.com/test/rich-results) — should detect `Dentist`
- Test a service page (e.g., `https://ladentisteriacv.com/servicios/ortodoncia-medellin/`) — should detect `MedicalProcedure`
- Validate hreflang at the [International Targeting report](https://search.google.com/search-console) once verified.

## Spec & plan reference

- Design spec: `docs/superpowers/specs/2026-04-28-la-dentisteria-web-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-28-la-dentisteria-web-v1.md`
- SEO research: `docs/superpowers/research/2026-04-28-la-dentisteria-seo.md`
