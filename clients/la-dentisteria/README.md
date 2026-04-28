# La Dentisteria — WordPress Site

Custom WordPress block theme for La Dentisteria dental clinic. Built for ladentisteriacv.com.

## Local development setup

1. Install Local by Flywheel: https://localwp.com/
2. Create a new site:
   - Site name: La Dentisteria
   - Domain: ladentisteria.local
   - Environment: PHP 8.1, MySQL 8, nginx
3. Symlink this theme into the Local site:
   ```cmd
   :: Windows (run as admin)
   mklink /J "%USERPROFILE%\Local Sites\la-dentisteria\app\public\wp-content\themes\ladentisteria" "C:\Users\TOMAS\Desktop\consultoria-app\clients\la-dentisteria\wp-theme"
   ```
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
4. Restore the `fontFace` arrays in `theme.json` for both families (see git history of theme.json before commit f4c6c8c for the original arrays — or reconstruct using the file paths above).
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

## Spec & plan reference

- Design spec: `docs/superpowers/specs/2026-04-28-la-dentisteria-web-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-28-la-dentisteria-web-v1.md`
- SEO research: `docs/superpowers/research/2026-04-28-la-dentisteria-seo.md`
