# La Dentisteria Web — V1 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a live, indexable WordPress site at `ladentisteriacv.com` covering home + top 4 services + nosotros + contacto + agendar-cita with WhatsApp contextual button and full technical SEO.

**Architecture:** Custom block theme (Full Site Editing / FSE), no page builder. Reusable block patterns for hero, service grid, pillars, testimonios, blog teaser, CTA, footer. Custom post type for `Servicio`. Yoast for SEO basics + custom JSON-LD where Yoast falls short. Vanilla JS for contextual WhatsApp button (no plugin).

**Tech Stack:**
- WordPress 6.5+
- PHP 8.1+
- Custom block theme (FSE) — no Elementor / Bricks / etc.
- Local dev: Local by Flywheel
- Plugins V1: Yoast SEO, Fluent Forms (free)
- Fonts: DM Serif Display + Inter Tight (Google Fonts, locally hosted for performance)
- Hosting: cPanel + Apache + MySQL (existing at `ladentisteriacv.com`)
- Deployment: Duplicator Pro or All-in-One WP Migration

**Spec reference:** [docs/superpowers/specs/2026-04-28-la-dentisteria-web-design.md](../specs/2026-04-28-la-dentisteria-web-design.md)
**SEO reference:** [docs/superpowers/research/2026-04-28-la-dentisteria-seo.md](../research/2026-04-28-la-dentisteria-seo.md)

---

## File Structure

The WordPress theme and content scripts live inside the consulting repo for version control. Local dev WP site lives outside (managed by Local by Flywheel).

```
consultoria-app/
└── clients/
    └── la-dentisteria/
        ├── wp-theme/                          (the custom block theme — symlinked into Local site)
        │   ├── style.css                      (theme metadata + base CSS)
        │   ├── theme.json                     (FSE design tokens — colors, typography, spacing)
        │   ├── functions.php                  (theme bootstrap, enqueues, custom post types)
        │   ├── index.php                      (fallback)
        │   ├── templates/
        │   │   ├── index.html                 (default template)
        │   │   ├── front-page.html            (home)
        │   │   ├── page.html                  (generic page)
        │   │   ├── single-servicio.html       (service single)
        │   │   └── archive-servicio.html      (services hub)
        │   ├── parts/
        │   │   ├── header.html
        │   │   └── footer.html
        │   ├── patterns/
        │   │   ├── hero.php
        │   │   ├── servicios-destacados.php
        │   │   ├── pilares.php
        │   │   ├── nosotros-teaser.php
        │   │   ├── internacional-banner.php
        │   │   ├── testimonios-placeholder.php
        │   │   ├── blog-teaser.php
        │   │   └── cta-final.php
        │   ├── assets/
        │   │   ├── css/
        │   │   │   ├── main.css               (compiled global)
        │   │   │   └── tokens.css             (CSS custom properties)
        │   │   ├── js/
        │   │   │   ├── whatsapp-contextual.js
        │   │   │   └── nav-mobile.js
        │   │   ├── fonts/                     (self-hosted DM Serif Display + Inter Tight WOFF2)
        │   │   └── img/                       (logo, isotipo, og images)
        │   └── inc/
        │       ├── post-types.php             (registra CPT "servicio")
        │       ├── schema.php                 (JSON-LD Dentist + MedicalProcedure)
        │       ├── enqueue.php                (CSS/JS/font loading)
        │       └── seo-helpers.php            (hreflang, meta overrides)
        ├── content/
        │   ├── pages/                         (Markdown source for static pages, imported via WP CLI)
        │   │   ├── home.md
        │   │   ├── nosotros.md
        │   │   ├── contacto.md
        │   │   └── agendar-cita.md
        │   └── servicios/                     (Markdown source for the 4 V1 service pages)
        │       ├── ortodoncia-medellin.md
        │       ├── odontologia-estetica-medellin.md
        │       ├── cirugia-maxilofacial-medellin.md
        │       └── implantes-dentales-medellin.md
        ├── scripts/
        │   ├── import-content.sh              (WP CLI script to import pages from Markdown)
        │   ├── deploy.sh                      (Duplicator export → cPanel upload)
        │   └── verify-seo.sh                  (Lighthouse + Rich Results validation)
        └── README.md                          (developer setup instructions)
```

**File responsibility map:**
- `style.css` — WP theme metadata header only; real CSS in `assets/css/`
- `theme.json` — FSE design tokens; serves as the source of truth for colors, fonts, spacing
- `functions.php` — minimal bootstrap; delegates to `inc/*.php` files
- `inc/schema.php` — generates JSON-LD per page type (home → Dentist; servicios → MedicalProcedure)
- `inc/seo-helpers.php` — hreflang tags, custom meta where Yoast can't
- `patterns/*.php` — reusable block patterns registered for the block editor
- `assets/js/whatsapp-contextual.js` — reads URL slug, sets button href

---

## Phase 0 — Local Dev Setup

### Task 0.1: Install Local by Flywheel and create site

**Files:**
- Create: directory `~/Local Sites/la-dentisteria/`

- [ ] **Step 1: Install Local by Flywheel** (if not installed)

Download from https://localwp.com/. Install with default options.

- [ ] **Step 2: Create new local site**

Open Local by Flywheel → "Create a new site":
- Site name: `La Dentisteria`
- Domain: `ladentisteria.local`
- Environment: Preferred (PHP 8.1, MySQL 8, nginx)
- WP admin: `admin` / strong password (save in password manager)

- [ ] **Step 3: Verify site loads**

Click "Open site" in Local. Expected: WordPress default page at `https://ladentisteria.local`.

Run: open `https://ladentisteria.local` in browser
Expected: WP default theme loads

### Task 0.2: Create theme directory in consulting repo and symlink

**Files:**
- Create: `consultoria-app/clients/la-dentisteria/wp-theme/`
- Modify: filesystem symlink

- [ ] **Step 1: Create theme directory structure**

```bash
mkdir -p clients/la-dentisteria/wp-theme/{templates,parts,patterns,assets/{css,js,fonts,img},inc}
mkdir -p clients/la-dentisteria/content/{pages,servicios}
mkdir -p clients/la-dentisteria/scripts
```

- [ ] **Step 2: Create symlink from Local site to theme directory**

Local site themes path: `~/Local Sites/la-dentisteria/app/public/wp-content/themes/`

```bash
ln -s "$(pwd)/clients/la-dentisteria/wp-theme" "$HOME/Local Sites/la-dentisteria/app/public/wp-content/themes/ladentisteria"
```

On Windows, use a junction:
```cmd
mklink /J "%USERPROFILE%\Local Sites\la-dentisteria\app\public\wp-content\themes\ladentisteria" "C:\Users\TOMAS\Desktop\consultoria-app\clients\la-dentisteria\wp-theme"
```

- [ ] **Step 3: Commit**

```bash
git add clients/
git commit -m "chore(la-dentisteria): scaffold theme directory structure"
```

---

## Phase 1 — Theme Foundation

### Task 1.1: Create theme metadata file

**Files:**
- Create: `clients/la-dentisteria/wp-theme/style.css`

- [ ] **Step 1: Write theme header**

```css
/*
Theme Name: La Dentisteria
Theme URI: https://ladentisteriacv.com
Author: Tomás Ramirez Villa
Description: Custom block theme for La Dentisteria dental clinic. Editorial minimalista. DM Serif Display + Inter Tight. No page builder.
Version: 1.0.0
Requires at least: 6.5
Tested up to: 6.5
Requires PHP: 8.1
License: Proprietary
Text Domain: ladentisteria
Tags: full-site-editing, custom-colors, custom-typography, block-patterns
*/
```

- [ ] **Step 2: Activate theme in WP admin**

Go to `https://ladentisteria.local/wp-admin` → Appearance → Themes → activate "La Dentisteria".

Expected: blank page on frontend (no templates yet) — this is correct for now.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/style.css
git commit -m "feat(theme): add theme metadata header"
```

### Task 1.2: Create theme.json with design tokens

**Files:**
- Create: `clients/la-dentisteria/wp-theme/theme.json`

- [ ] **Step 1: Write theme.json with all design tokens from the spec**

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 2,
  "settings": {
    "appearanceTools": true,
    "color": {
      "palette": [
        { "slug": "beige", "color": "#F1E8DA", "name": "Beige" },
        { "slug": "beige-deep", "color": "#E8DCC4", "name": "Beige Deep" },
        { "slug": "teal", "color": "#0E6B6B", "name": "Teal" },
        { "slug": "teal-deep", "color": "#114848", "name": "Teal Deep" },
        { "slug": "ink", "color": "#1a1a1a", "name": "Ink" },
        { "slug": "ink-soft", "color": "#5a5a5a", "name": "Ink Soft" },
        { "slug": "line", "color": "#d8ccb6", "name": "Line" },
        { "slug": "gold-accent", "color": "#E8C9A0", "name": "Gold Accent" }
      ],
      "custom": false,
      "customGradient": false,
      "defaultPalette": false
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "'DM Serif Display', Georgia, serif",
          "slug": "serif",
          "name": "DM Serif Display",
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
        },
        {
          "fontFamily": "'Inter Tight', -apple-system, sans-serif",
          "slug": "sans",
          "name": "Inter Tight",
          "fontFace": [
            {
              "fontFamily": "Inter Tight",
              "fontStyle": "normal",
              "fontWeight": "400 700",
              "src": ["file:./assets/fonts/inter-tight-variable.woff2"]
            }
          ]
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "13px", "name": "Small" },
        { "slug": "medium", "size": "16px", "name": "Medium" },
        { "slug": "large", "size": "24px", "name": "Large" },
        { "slug": "xlarge", "size": "44px", "name": "X-Large" },
        { "slug": "display", "size": "76px", "name": "Display" }
      ],
      "customFontSize": true,
      "lineHeight": true,
      "letterSpacing": true
    },
    "layout": {
      "contentSize": "1180px",
      "wideSize": "1320px"
    },
    "spacing": {
      "spacingScale": {
        "operator": "*",
        "increment": 1.5,
        "steps": 7,
        "mediumStep": 1.5,
        "unit": "rem"
      }
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--beige)",
      "text": "var(--wp--preset--color--ink)"
    },
    "typography": {
      "fontFamily": "var(--wp--preset--font-family--sans)",
      "fontSize": "var(--wp--preset--font-size--medium)",
      "lineHeight": "1.5"
    },
    "elements": {
      "h1": {
        "typography": {
          "fontFamily": "var(--wp--preset--font-family--serif)",
          "fontSize": "clamp(44px, 6vw, 76px)",
          "lineHeight": "1.0",
          "letterSpacing": "-0.02em",
          "fontWeight": "400"
        }
      },
      "h2": {
        "typography": {
          "fontFamily": "var(--wp--preset--font-family--serif)",
          "fontSize": "clamp(28px, 4vw, 44px)",
          "lineHeight": "1.05",
          "letterSpacing": "-0.01em",
          "fontWeight": "400"
        }
      },
      "h3": {
        "typography": {
          "fontFamily": "var(--wp--preset--font-family--serif)",
          "fontSize": "24px",
          "fontWeight": "400"
        }
      },
      "button": {
        "color": {
          "background": "var(--wp--preset--color--teal)",
          "text": "var(--wp--preset--color--beige)"
        },
        "border": { "radius": "999px" },
        "spacing": { "padding": { "top": "14px", "right": "28px", "bottom": "14px", "left": "28px" } },
        "typography": {
          "fontSize": "12px",
          "fontWeight": "600",
          "letterSpacing": "0.06em",
          "textTransform": "uppercase"
        }
      },
      "link": {
        "color": { "text": "var(--wp--preset--color--teal)" }
      }
    }
  }
}
```

- [ ] **Step 2: Verify theme.json loads**

Reload `https://ladentisteria.local/wp-admin/site-editor.php`. Expected: no errors, color palette shows the 8 brand colors in the editor.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/theme.json
git commit -m "feat(theme): add theme.json with brand design tokens"
```

### Task 1.3: Download and self-host fonts

**Files:**
- Create: `clients/la-dentisteria/wp-theme/assets/fonts/dm-serif-display-400.woff2`
- Create: `clients/la-dentisteria/wp-theme/assets/fonts/dm-serif-display-400-italic.woff2`
- Create: `clients/la-dentisteria/wp-theme/assets/fonts/inter-tight-variable.woff2`

- [ ] **Step 1: Download fonts via google-webfonts-helper**

Go to https://gwfh.mranftl.com/fonts and download:
- DM Serif Display: regular 400 + italic 400 (woff2)
- Inter Tight: variable font (woff2)

- [ ] **Step 2: Place files in assets/fonts/**

Save downloaded woff2 files to `clients/la-dentisteria/wp-theme/assets/fonts/` with exact filenames matching theme.json.

- [ ] **Step 3: Verify fonts load**

Open `https://ladentisteria.local/` in browser DevTools → Network tab. Reload. Expected: woff2 files load with status 200, no 404s.

- [ ] **Step 4: Commit**

```bash
git add clients/la-dentisteria/wp-theme/assets/fonts/
git commit -m "feat(theme): self-host DM Serif Display + Inter Tight"
```

### Task 1.4: Create base CSS with design tokens

**Files:**
- Create: `clients/la-dentisteria/wp-theme/assets/css/tokens.css`
- Create: `clients/la-dentisteria/wp-theme/assets/css/main.css`

- [ ] **Step 1: Write tokens.css** (CSS custom properties, single source of truth)

```css
/* Design tokens — La Dentisteria
 * These mirror theme.json for direct CSS use.
 * Source of truth: theme.json
 */
:root {
  --beige: #F1E8DA;
  --beige-deep: #E8DCC4;
  --teal: #0E6B6B;
  --teal-deep: #114848;
  --ink: #1a1a1a;
  --ink-soft: #5a5a5a;
  --line: #d8ccb6;
  --gold-accent: #E8C9A0;

  --font-serif: 'DM Serif Display', Georgia, serif;
  --font-sans: 'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif;

  --content-max: 1180px;
  --wide-max: 1320px;

  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2.5rem;
  --space-xl: 4rem;
  --space-xxl: 6rem;
}
```

- [ ] **Step 2: Write main.css** (global resets, base typography, utility classes)

```css
@import url('./tokens.css');

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  color: var(--ink);
  background: var(--beige);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }

/* Curve smile decorative element */
.smile-curve {
  width: 110px;
  height: 18px;
  border-bottom: 2px solid var(--teal);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  margin: 28px auto 22px;
}

/* Section labels (uppercase teal lettering) */
.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--teal);
  font-weight: 600;
}

/* Pill button variants */
.btn-primary {
  display: inline-block;
  background: var(--teal);
  color: var(--beige);
  padding: 14px 28px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
}
.btn-secondary {
  display: inline-block;
  background: transparent;
  color: var(--ink);
  padding: 14px 28px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid var(--ink);
  cursor: pointer;
}
.btn-primary:hover { background: var(--teal-deep); }
.btn-secondary:hover { background: var(--ink); color: var(--beige); }

/* Container utility */
.container {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 var(--space-md);
}

/* Mobile breakpoint utility */
@media (max-width: 768px) {
  body { font-size: 14px; }
}
```

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/assets/css/
git commit -m "feat(theme): add base CSS with design tokens"
```

### Task 1.5: Create functions.php and asset enqueue logic

**Files:**
- Create: `clients/la-dentisteria/wp-theme/functions.php`
- Create: `clients/la-dentisteria/wp-theme/inc/enqueue.php`

- [ ] **Step 1: Write functions.php** (minimal bootstrap)

```php
<?php
/**
 * La Dentisteria theme bootstrap
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'LADENT_THEME_VERSION', '1.0.0' );
define( 'LADENT_THEME_DIR', get_template_directory() );
define( 'LADENT_THEME_URI', get_template_directory_uri() );

require_once LADENT_THEME_DIR . '/inc/enqueue.php';
require_once LADENT_THEME_DIR . '/inc/post-types.php';
require_once LADENT_THEME_DIR . '/inc/schema.php';
require_once LADENT_THEME_DIR . '/inc/seo-helpers.php';

// Theme support
add_action( 'after_setup_theme', function() {
    add_theme_support( 'wp-block-styles' );
    add_theme_support( 'editor-styles' );
    add_theme_support( 'responsive-embeds' );
    add_theme_support( 'html5', [ 'search-form', 'gallery', 'caption', 'style', 'script' ] );
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
} );
```

- [ ] **Step 2: Write inc/enqueue.php**

```php
<?php
/**
 * Asset enqueue logic.
 * Loads CSS and JS only where needed.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_enqueue_scripts', function() {

    wp_enqueue_style(
        'ladent-tokens',
        LADENT_THEME_URI . '/assets/css/tokens.css',
        [],
        LADENT_THEME_VERSION
    );

    wp_enqueue_style(
        'ladent-main',
        LADENT_THEME_URI . '/assets/css/main.css',
        [ 'ladent-tokens' ],
        LADENT_THEME_VERSION
    );

    wp_enqueue_script(
        'ladent-whatsapp',
        LADENT_THEME_URI . '/assets/js/whatsapp-contextual.js',
        [],
        LADENT_THEME_VERSION,
        [ 'strategy' => 'defer', 'in_footer' => true ]
    );

    wp_enqueue_script(
        'ladent-nav-mobile',
        LADENT_THEME_URI . '/assets/js/nav-mobile.js',
        [],
        LADENT_THEME_VERSION,
        [ 'strategy' => 'defer', 'in_footer' => true ]
    );
} );
```

- [ ] **Step 3: Create stub files for the other inc/*.php to avoid fatal errors**

```bash
touch clients/la-dentisteria/wp-theme/inc/post-types.php
touch clients/la-dentisteria/wp-theme/inc/schema.php
touch clients/la-dentisteria/wp-theme/inc/seo-helpers.php
echo '<?php // post-types stub' > clients/la-dentisteria/wp-theme/inc/post-types.php
echo '<?php // schema stub' > clients/la-dentisteria/wp-theme/inc/schema.php
echo '<?php // seo-helpers stub' > clients/la-dentisteria/wp-theme/inc/seo-helpers.php
```

- [ ] **Step 4: Verify no PHP errors**

Open `https://ladentisteria.local/`. Expected: no PHP error screen, page loads (will be mostly empty until templates exist).

- [ ] **Step 5: Commit**

```bash
git add clients/la-dentisteria/wp-theme/functions.php clients/la-dentisteria/wp-theme/inc/
git commit -m "feat(theme): bootstrap functions.php and asset enqueue"
```

---

## Phase 2 — Block Patterns

Block patterns are reusable layouts the editor (and us) can drop into pages. We define them once, use them across all the marketing pages.

### Task 2.1: Header template part

**Files:**
- Create: `clients/la-dentisteria/wp-theme/parts/header.html`

- [ ] **Step 1: Write header.html block markup**

```html
<!-- wp:group {"tagName":"header","className":"site-header","style":{"position":{"type":"sticky","top":"0px"},"spacing":{"padding":{"top":"18px","bottom":"18px","left":"36px","right":"36px"}}},"backgroundColor":"beige","layout":{"type":"flex","justifyContent":"space-between","verticalAlignment":"center"}} -->
<header class="wp-block-group site-header has-beige-background-color has-background" style="padding-top:18px;padding-right:36px;padding-bottom:18px;padding-left:36px">

  <!-- wp:group {"className":"site-logo"} -->
  <div class="wp-block-group site-logo">
    <!-- wp:site-title {"level":0,"style":{"typography":{"fontFamily":"var(--wp--preset--font-family--serif)","fontSize":"20px","textTransform":"uppercase","letterSpacing":"0.04em"}}} /-->
    <!-- wp:paragraph {"className":"logo-tag","fontSize":"small","style":{"typography":{"fontSize":"9px","letterSpacing":"0.05em"},"color":{"text":"var:preset|color|ink-soft"}}} -->
    <p class="logo-tag has-small-font-size">by ClaraVilla</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:group -->

  <!-- wp:navigation {"ref":0,"overlayMenu":"mobile","className":"main-nav","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"500"}}} /-->

</header>
<!-- /wp:group -->
```

- [ ] **Step 2: Create primary navigation in WP admin**

Go to Appearance → Editor → Navigation → Create new. Add menu items:
- Servicios → /servicios/
- Nosotros → /nosotros/
- Internacional → /pacientes-internacionales/ (will 404 in V1, that's expected — fixed in V1.2)
- Blog → /blog/ (will 404 in V1)
- Contacto → /contacto/
- Agendar cita → /agendar-cita/ (custom button style)

Save and note the navigation ID, then update `"ref":0` in header.html with the actual ID.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/parts/header.html
git commit -m "feat(theme): add sticky site header with logo and nav"
```

### Task 2.2: Footer template part

**Files:**
- Create: `clients/la-dentisteria/wp-theme/parts/footer.html`

- [ ] **Step 1: Write footer.html with 4-column layout**

```html
<!-- wp:group {"tagName":"footer","className":"site-footer","style":{"spacing":{"padding":{"top":"60px","right":"36px","bottom":"30px","left":"36px"}},"color":{"background":"#1a1a1a","text":"#F1E8DA"}}} -->
<footer class="wp-block-group site-footer has-text-color has-background" style="color:#F1E8DA;background-color:#1a1a1a;padding-top:60px;padding-right:36px;padding-bottom:30px;padding-left:36px">

  <!-- wp:columns {"className":"footer-grid","style":{"spacing":{"blockGap":{"top":"40px","left":"40px"}}}} -->
  <div class="wp-block-columns footer-grid">

    <!-- wp:column {"width":"40%"} -->
    <div class="wp-block-column" style="flex-basis:40%">
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"22px","textTransform":"uppercase","letterSpacing":"0.04em"}}} -->
      <h3 style="font-size:22px;text-transform:uppercase;letter-spacing:0.04em">LA DENTISTERÍA</h3>
      <!-- /wp:heading -->

      <!-- wp:paragraph {"style":{"typography":{"fontSize":"11px"},"color":{"text":"#F1E8DA99"}}} -->
      <p style="color:#F1E8DA99;font-size:11px">by ClaraVilla</p>
      <!-- /wp:paragraph -->

      <!-- wp:paragraph {"style":{"typography":{"fontSize":"12px"}}} -->
      <p style="font-size:12px">Clínica dental boutique en Centro Comercial Parque Fabricato, Medellín. Odontología integral para adultos.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":4,"className":"footer-heading","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.15em"}}} -->
      <h4 class="footer-heading" style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em">Servicios</h4>
      <!-- /wp:heading -->

      <!-- wp:list {"className":"footer-list","style":{"typography":{"fontSize":"12px"}}} -->
      <ul class="footer-list" style="font-size:12px">
        <li><a href="/servicios/ortodoncia-medellin/">Ortodoncia</a></li>
        <li><a href="/servicios/odontologia-estetica-medellin/">Diseño de Sonrisa</a></li>
        <li><a href="/servicios/cirugia-maxilofacial-medellin/">Cirugía Maxilofacial</a></li>
        <li><a href="/servicios/implantes-dentales-medellin/">Implantes Dentales</a></li>
        <li><a href="/servicios/">Todos los servicios</a></li>
      </ul>
      <!-- /wp:list -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":4,"style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.15em"}}} -->
      <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em">Empresa</h4>
      <!-- /wp:heading -->
      <!-- wp:list {"style":{"typography":{"fontSize":"12px"}}} -->
      <ul style="font-size:12px">
        <li><a href="/nosotros/">Nosotros</a></li>
        <li><a href="/agendar-cita/">Agendar cita</a></li>
        <li><a href="/contacto/">Contacto</a></li>
      </ul>
      <!-- /wp:list -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"width":"28%"} -->
    <div class="wp-block-column" style="flex-basis:28%">
      <!-- wp:heading {"level":4,"style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.15em"}}} -->
      <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em">Contacto</h4>
      <!-- /wp:heading -->
      <!-- wp:list {"style":{"typography":{"fontSize":"12px"}}} -->
      <ul style="font-size:12px">
        <li>Cra. 50 # 38 A 185</li>
        <li>Local 99300, CC Parque Fabricato</li>
        <li>Bello, Antioquia</li>
        <li>+57 304 426 9079</li>
        <li>infoladentisteria@gmail.com</li>
        <li>L-V 8am-6pm · Sáb 8am-12pm</li>
      </ul>
      <!-- /wp:list -->
    </div>
    <!-- /wp:column -->

  </div>
  <!-- /wp:columns -->

  <!-- wp:separator {"style":{"color":{"background":"#ffffff1a"}}} -->
  <hr class="wp-block-separator has-alpha-channel-opacity" style="background-color:#ffffff1a;color:#ffffff1a"/>
  <!-- /wp:separator -->

  <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"10px"},"color":{"text":"#F1E8DA80"}}} -->
  <p class="has-text-align-center" style="color:#F1E8DA80;font-size:10px">© 2026 La Dentistería. Todos los derechos reservados.</p>
  <!-- /wp:paragraph -->

</footer>
<!-- /wp:group -->
```

- [ ] **Step 2: Add footer-specific CSS to main.css**

Append to `assets/css/main.css`:

```css
.site-footer .footer-list,
.site-footer .wp-block-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.site-footer .footer-list li,
.site-footer .wp-block-list li {
  margin-bottom: 7px;
  opacity: 0.85;
}
.site-footer a:hover { color: var(--gold-accent); }
.site-footer .footer-heading { opacity: 0.6; margin-bottom: 14px; }
```

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/parts/footer.html clients/la-dentisteria/wp-theme/assets/css/main.css
git commit -m "feat(theme): add footer template part with NAP info"
```

### Task 2.3: Hero block pattern

**Files:**
- Create: `clients/la-dentisteria/wp-theme/patterns/hero.php`

- [ ] **Step 1: Write hero pattern**

```php
<?php
/**
 * Title: Hero — Storytelling
 * Slug: ladentisteria/hero
 * Categories: ladent
 * Description: Hero section with headline, smile curve, subtitle, dual CTAs.
 */
?>
<!-- wp:group {"tagName":"section","className":"hero","style":{"spacing":{"padding":{"top":"110px","bottom":"100px","left":"36px","right":"36px"}}},"backgroundColor":"beige","layout":{"type":"constrained"}} -->
<section class="wp-block-group hero has-beige-background-color has-background" style="padding-top:110px;padding-right:36px;padding-bottom:100px;padding-left:36px">

  <!-- wp:heading {"level":1,"textAlign":"center","style":{"typography":{"fontSize":"clamp(44px, 6vw, 76px)","lineHeight":"1.0","letterSpacing":"-0.02em","fontWeight":"400"}}} -->
  <h1 class="has-text-align-center" style="font-size:clamp(44px, 6vw, 76px);font-weight:400;letter-spacing:-0.02em;line-height:1.0">Una sonrisa<br><em>que cuenta tu historia.</em></h1>
  <!-- /wp:heading -->

  <!-- wp:html -->
  <div class="smile-curve"></div>
  <!-- /wp:html -->

  <!-- wp:paragraph {"align":"center","className":"hero-sub","style":{"typography":{"fontSize":"13px","textTransform":"uppercase","letterSpacing":"0.18em","fontWeight":"500"},"color":{"text":"var:preset|color|ink-soft"},"spacing":{"margin":{"bottom":"36px"}}}} -->
  <p class="has-text-align-center hero-sub" style="margin-bottom:36px;font-size:13px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase">Odontología integral · Parque Fabricato · Medellín</p>
  <!-- /wp:paragraph -->

  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button {"className":"btn-primary"} -->
    <div class="wp-block-button btn-primary"><a class="wp-block-button__link wp-element-button" href="/agendar-cita/">Agenda tu valoración</a></div>
    <!-- /wp:button -->
    <!-- wp:button {"className":"btn-secondary","style":{"color":{"background":"transparent","text":"var:preset|color|ink"},"border":{"width":"1px","color":"var:preset|color|ink"}}} -->
    <div class="wp-block-button btn-secondary"><a class="wp-block-button__link wp-element-button" href="/servicios/" style="border-color:var(--wp--preset--color--ink);border-width:1px;color:var(--wp--preset--color--ink);background:transparent">Conoce nuestros servicios</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->

</section>
<!-- /wp:group -->
```

- [ ] **Step 2: Register pattern category**

Append to `functions.php` (before the closing PHP):

```php
add_action( 'init', function() {
    register_block_pattern_category( 'ladent', [ 'label' => 'La Dentisteria' ] );
} );
```

- [ ] **Step 3: Verify pattern appears in editor**

Open `https://ladentisteria.local/wp-admin/site-editor.php` → Patterns → "La Dentisteria" category. Expected: "Hero — Storytelling" pattern visible.

- [ ] **Step 4: Commit**

```bash
git add clients/la-dentisteria/wp-theme/patterns/hero.php clients/la-dentisteria/wp-theme/functions.php
git commit -m "feat(theme): add hero block pattern with storytelling headline"
```

### Task 2.4: Servicios destacados pattern

**Files:**
- Create: `clients/la-dentisteria/wp-theme/patterns/servicios-destacados.php`

- [ ] **Step 1: Write 3-card services grid pattern**

```php
<?php
/**
 * Title: Servicios destacados (3 cards)
 * Slug: ladentisteria/servicios-destacados
 * Categories: ladent
 * Description: Highlights top 3 services with numbered cards.
 */
?>
<!-- wp:group {"tagName":"section","className":"servicios-section","style":{"spacing":{"padding":{"top":"90px","right":"36px","bottom":"90px","left":"36px"}}},"backgroundColor":"beige","layout":{"type":"constrained"}} -->
<section class="wp-block-group servicios-section has-beige-background-color has-background" style="padding:90px 36px">

  <!-- wp:paragraph {"className":"section-label","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.2em","fontWeight":"600"}},"textColor":"teal"} -->
  <p class="section-label has-teal-color has-text-color" style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase">Servicios destacados</p>
  <!-- /wp:paragraph -->

  <!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"clamp(28px, 4vw, 44px)","lineHeight":"1.05"}}} -->
  <h2 style="font-size:clamp(28px, 4vw, 44px);line-height:1.05">Tres especialidades<br><em>que transforman sonrisas.</em></h2>
  <!-- /wp:heading -->

  <!-- wp:paragraph {"className":"lede","style":{"typography":{"fontSize":"16px"},"color":{"text":"var:preset|color|ink-soft"},"spacing":{"margin":{"bottom":"48px"}}}} -->
  <p class="lede" style="margin-bottom:48px;font-size:16px">Las áreas por las que más nos consultan, atendidas por nuestro equipo de especialistas.</p>
  <!-- /wp:paragraph -->

  <!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"18px","left":"18px"}}}} -->
  <div class="wp-block-columns">

    <!-- wp:column {"className":"servicio-card","style":{"color":{"background":"#ffffff"},"border":{"width":"1px","color":"var:preset|color|line","radius":"8px"},"spacing":{"padding":{"top":"28px","right":"24px","bottom":"28px","left":"24px"}}}} -->
    <div class="wp-block-column servicio-card has-background" style="border-color:var(--wp--preset--color--line);border-width:1px;border-radius:8px;background-color:#ffffff;padding:28px 24px">
      <!-- wp:paragraph {"className":"servicio-num","style":{"typography":{"fontFamily":"var(--wp--preset--font-family--serif)","fontSize":"36px","fontStyle":"italic","lineHeight":"1"}},"textColor":"teal"} -->
      <p class="servicio-num has-teal-color has-text-color" style="font-size:36px;font-style:italic;line-height:1;font-family:var(--wp--preset--font-family--serif)">01</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"24px"}}} -->
      <h3 style="font-size:24px">Ortodoncia</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px","lineHeight":"1.55"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px;line-height:1.55">Brackets metálicos, estéticos, de zafiro y alineadores invisibles. Para alineaciones que mejoran tu salud y tu sonrisa.</p>
      <!-- /wp:paragraph -->
      <!-- wp:paragraph {"className":"servicio-more","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"600"}},"textColor":"teal"} -->
      <p class="servicio-more has-teal-color has-text-color" style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase"><a href="/servicios/ortodoncia-medellin/">Conocer más →</a></p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"className":"servicio-card","style":{"color":{"background":"#ffffff"},"border":{"width":"1px","color":"var:preset|color|line","radius":"8px"},"spacing":{"padding":{"top":"28px","right":"24px","bottom":"28px","left":"24px"}}}} -->
    <div class="wp-block-column servicio-card has-background" style="border-color:var(--wp--preset--color--line);border-width:1px;border-radius:8px;background-color:#ffffff;padding:28px 24px">
      <!-- wp:paragraph {"className":"servicio-num","style":{"typography":{"fontFamily":"var(--wp--preset--font-family--serif)","fontSize":"36px","fontStyle":"italic"}},"textColor":"teal"} -->
      <p class="servicio-num has-teal-color has-text-color" style="font-size:36px;font-style:italic;font-family:var(--wp--preset--font-family--serif)">02</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"24px"}}} -->
      <h3 style="font-size:24px">Diseño de Sonrisa</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px">Carillas, blanqueamiento y resinas estéticas. Resultados naturales pensados para adultos.</p>
      <!-- /wp:paragraph -->
      <!-- wp:paragraph {"className":"servicio-more","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"600"}},"textColor":"teal"} -->
      <p class="servicio-more has-teal-color has-text-color"><a href="/servicios/odontologia-estetica-medellin/">Conocer más →</a></p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"className":"servicio-card","style":{"color":{"background":"#ffffff"},"border":{"width":"1px","color":"var:preset|color|line","radius":"8px"},"spacing":{"padding":{"top":"28px","right":"24px","bottom":"28px","left":"24px"}}}} -->
    <div class="wp-block-column servicio-card has-background" style="border-color:var(--wp--preset--color--line);border-width:1px;border-radius:8px;background-color:#ffffff;padding:28px 24px">
      <!-- wp:paragraph {"className":"servicio-num","style":{"typography":{"fontFamily":"var(--wp--preset--font-family--serif)","fontSize":"36px","fontStyle":"italic"}},"textColor":"teal"} -->
      <p class="servicio-num has-teal-color has-text-color" style="font-size:36px;font-style:italic;font-family:var(--wp--preset--font-family--serif)">03</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"24px"}}} -->
      <h3 style="font-size:24px">Cirugía Maxilofacial</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px">Cordales, implantes dentales y cirugía ortognática con técnicas avanzadas y máxima precisión.</p>
      <!-- /wp:paragraph -->
      <!-- wp:paragraph {"className":"servicio-more","style":{"typography":{"fontSize":"11px","textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"600"}},"textColor":"teal"} -->
      <p class="servicio-more has-teal-color has-text-color"><a href="/servicios/cirugia-maxilofacial-medellin/">Conocer más →</a></p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

  </div>
  <!-- /wp:columns -->

  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"36px"}}}} -->
  <div class="wp-block-buttons" style="margin-top:36px">
    <!-- wp:button {"className":"btn-secondary"} -->
    <div class="wp-block-button btn-secondary"><a class="wp-block-button__link wp-element-button" href="/servicios/">Ver todos los servicios</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->

</section>
<!-- /wp:group -->
```

- [ ] **Step 2: Add card hover styles to main.css**

Append:

```css
.servicio-card { transition: transform 0.2s, box-shadow 0.2s; }
.servicio-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,0.06); }
```

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/patterns/servicios-destacados.php clients/la-dentisteria/wp-theme/assets/css/main.css
git commit -m "feat(theme): add servicios destacados 3-card pattern"
```

### Task 2.5: Pilares pattern

**Files:**
- Create: `clients/la-dentisteria/wp-theme/patterns/pilares.php`

- [ ] **Step 1: Write 4-column pilares pattern**

```php
<?php
/**
 * Title: Pilares de confianza
 * Slug: ladentisteria/pilares
 * Categories: ladent
 * Description: 4-column trust pillars: equipo, ubicación, atención, cobertura.
 */
?>
<!-- wp:group {"tagName":"section","className":"pilares-section","style":{"spacing":{"padding":{"top":"90px","right":"36px","bottom":"90px","left":"36px"}}},"backgroundColor":"beige-deep","layout":{"type":"constrained"}} -->
<section class="wp-block-group pilares-section has-beige-deep-background-color has-background" style="padding:90px 36px">

  <!-- wp:paragraph {"className":"section-label"} -->
  <p class="section-label">Por qué elegirnos</p>
  <!-- /wp:paragraph -->

  <!-- wp:heading {"level":2} -->
  <h2>Una clínica joven,<br><em>con un equipo de oficio.</em></h2>
  <!-- /wp:heading -->

  <!-- wp:columns {"style":{"spacing":{"margin":{"top":"50px"},"blockGap":{"top":"36px","left":"36px"}}}} -->
  <div class="wp-block-columns" style="margin-top:50px">

    <!-- wp:column {"className":"pilar"} -->
    <div class="wp-block-column pilar">
      <!-- wp:paragraph {"className":"pilar-icon"} -->
      <p class="pilar-icon">◆</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"18px"}}} -->
      <h3 style="font-size:18px">Equipo especialista</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px","lineHeight":"1.55"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px;line-height:1.55">Odontólogos formados en cada especialidad, no generalistas. Cada tratamiento lo hace quien sabe.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"className":"pilar"} -->
    <div class="wp-block-column pilar">
      <!-- wp:paragraph {"className":"pilar-icon"} -->
      <p class="pilar-icon">◐</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"18px"}}} -->
      <h3 style="font-size:18px">Ubicación céntrica</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px">En Centro Comercial Parque Fabricato. Acceso fácil, parqueadero, transporte público a la puerta.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"className":"pilar"} -->
    <div class="wp-block-column pilar">
      <!-- wp:paragraph {"className":"pilar-icon"} -->
      <p class="pilar-icon">◇</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"18px"}}} -->
      <h3 style="font-size:18px">Atención personalizada</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px">Consulta detallada, plan a medida. Te explicamos cada paso y respetamos tu tiempo.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"className":"pilar"} -->
    <div class="wp-block-column pilar">
      <!-- wp:paragraph {"className":"pilar-icon"} -->
      <p class="pilar-icon">◯</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"18px"}}} -->
      <h3 style="font-size:18px">Cobertura integral</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"13px"},"color":{"text":"var:preset|color|ink-soft"}}} -->
      <p style="font-size:13px">Todas las especialidades bajo un mismo techo. No te enviamos a otro lado.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->

  </div>
  <!-- /wp:columns -->

</section>
<!-- /wp:group -->
```

- [ ] **Step 2: Add pilar-icon styles to main.css**

```css
.pilar-icon {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--teal);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--teal);
  font-size: 14px;
  margin: 0 0 14px;
}
```

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/patterns/pilares.php clients/la-dentisteria/wp-theme/assets/css/main.css
git commit -m "feat(theme): add pilares 4-column pattern"
```

### Task 2.6: Nosotros teaser, Internacional banner, Testimonios placeholder, Blog teaser, CTA final patterns

For brevity, these follow the same structure as Tasks 2.3-2.5 (block markup file + CSS append + commit). Apply the same approach using the design from Section 5 of the spec.

**Files:**
- Create: `clients/la-dentisteria/wp-theme/patterns/nosotros-teaser.php`
- Create: `clients/la-dentisteria/wp-theme/patterns/internacional-banner.php`
- Create: `clients/la-dentisteria/wp-theme/patterns/testimonios-placeholder.php`
- Create: `clients/la-dentisteria/wp-theme/patterns/blog-teaser.php`
- Create: `clients/la-dentisteria/wp-theme/patterns/cta-final.php`

- [ ] **Step 1: Write `nosotros-teaser.php`**

Content: split 2-column section, 50/50 photo+text. Photo placeholder uses CSS gradient until real photo uploaded. Headline: "Conocemos a Medellín. Conocemos sus sonrisas." Body: "La Dentistería nace para que la odontología deje de sentirse fría. Somos una clínica boutique en Parque Fabricato donde cada paciente recibe tiempo, escucha y un plan a medida. Sin afán. Sin lenguaje técnico vacío. Sin presión." CTA secundario "Conoce nuestra clínica" → `/nosotros/`. (Same block-markup pattern as 2.3-2.5.)

- [ ] **Step 2: Write `internacional-banner.php`**

Background `--teal-deep`, text `--beige`. Section label "International patients" in `--gold-accent`. Headline: "Dental care in Medellín worth the trip." Lede: "English-speaking specialists. Premium materials. Treatment timelines designed around your visit." CTA primario invertido (beige bg, teal-deep text) → `/pacientes-internacionales/` (V1: links to a placeholder page; V1.2 to full landing).

- [ ] **Step 3: Write `testimonios-placeholder.php`**

3 cards with `border: 1px dashed var(--line)`. Quote mark serif. Body text: "Pronto compartiremos las historias de quienes confiaron en nosotros." / "Estamos recopilando testimonios reales con consentimiento de cada paciente." / "Mientras tanto, escríbenos y conversemos sobre tu caso."

- [ ] **Step 4: Write `blog-teaser.php`**

Background `--beige-deep`. Section label "Blog". Headline: "Todo lo que querías saber sobre tu sonrisa." 3 cards with thumb (16:10 gradient placeholder), meta uppercase teal, h3, body 1 line. **V1 note:** Cards link to `/blog/` which 404s in V1. Mark these as comments to enable in V1.1, OR populate with `<a>` tags wrapping the card with `href="#"` and a `data-todo="link-to-post"` attribute. V1.1 will replace.

- [ ] **Step 5: Write `cta-final.php`**

Background `--beige`. Section label "Reserva tu cita". Headline grande: "Una valoración inicial<br><em>cambia todo.</em>" Lede: "30 minutos contigo, sin compromiso. Examinamos, escuchamos y te damos un plan claro." 3 channel buttons:
- WhatsApp (verde `#25D366`, blanco): `https://wa.me/573044269079?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20valoraci%C3%B3n%20en%20La%20Dentister%C3%ADa.`
- Llamar consultorio (`tel:+573044269079`)
- Escribir email (`mailto:infoladentisteria@gmail.com`)

- [ ] **Step 6: Append related CSS to `main.css`** for nosotros split, internacional banner inverted button, testimonio dashed border, blog card, channel buttons.

- [ ] **Step 7: Commit each pattern as its own commit**

```bash
git add clients/la-dentisteria/wp-theme/patterns/nosotros-teaser.php
git commit -m "feat(theme): add nosotros teaser pattern"

git add clients/la-dentisteria/wp-theme/patterns/internacional-banner.php
git commit -m "feat(theme): add internacional banner pattern"

git add clients/la-dentisteria/wp-theme/patterns/testimonios-placeholder.php
git commit -m "feat(theme): add testimonios placeholder pattern"

git add clients/la-dentisteria/wp-theme/patterns/blog-teaser.php
git commit -m "feat(theme): add blog teaser pattern"

git add clients/la-dentisteria/wp-theme/patterns/cta-final.php clients/la-dentisteria/wp-theme/assets/css/main.css
git commit -m "feat(theme): add CTA final pattern + section CSS"
```

---

## Phase 3 — Templates and Custom Post Type

### Task 3.1: Register `servicio` custom post type

**Files:**
- Modify: `clients/la-dentisteria/wp-theme/inc/post-types.php`

- [ ] **Step 1: Replace stub with full CPT registration**

```php
<?php
/**
 * Custom post type: Servicio
 * Used for service detail pages with their own URL structure /servicios/[slug]/.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', function() {

    register_post_type( 'servicio', [
        'label'             => 'Servicios',
        'labels'            => [
            'name'          => 'Servicios',
            'singular_name' => 'Servicio',
            'add_new_item'  => 'Agregar nuevo servicio',
            'edit_item'     => 'Editar servicio',
        ],
        'public'            => true,
        'show_in_menu'      => true,
        'show_in_rest'      => true,
        'has_archive'       => 'servicios',
        'rewrite'           => [ 'slug' => 'servicios', 'with_front' => false ],
        'menu_icon'         => 'dashicons-smiley',
        'supports'          => [ 'title', 'editor', 'thumbnail', 'excerpt', 'page-attributes', 'custom-fields' ],
        'menu_position'     => 5,
    ] );

} );
```

- [ ] **Step 2: Flush rewrite rules**

Go to `https://ladentisteria.local/wp-admin/options-permalink.php` and click "Save Changes" to flush rewrites.

- [ ] **Step 3: Verify CPT appears in admin sidebar**

Refresh WP admin. Expected: "Servicios" menu item visible in left sidebar.

- [ ] **Step 4: Commit**

```bash
git add clients/la-dentisteria/wp-theme/inc/post-types.php
git commit -m "feat(theme): register servicio custom post type"
```

### Task 3.2: Create generic page template, front-page template, single-servicio, archive-servicio

**Files:**
- Create: `clients/la-dentisteria/wp-theme/templates/page.html`
- Create: `clients/la-dentisteria/wp-theme/templates/front-page.html`
- Create: `clients/la-dentisteria/wp-theme/templates/single-servicio.html`
- Create: `clients/la-dentisteria/wp-theme/templates/archive-servicio.html`
- Create: `clients/la-dentisteria/wp-theme/templates/index.html`

- [ ] **Step 1: Write `index.html`** (fallback)

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:post-title {"level":1} /-->
  <!-- wp:post-content /-->
</main>
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 2: Write `page.html`**

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 3: Write `front-page.html`**

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:post-content {"layout":{"type":"constrained"}} /-->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

(Front page content is created via WP admin → Pages → Home, then assembled with patterns.)

- [ ] **Step 4: Write `single-servicio.html`**

Layout for an individual service page: hero (small) + post content (where the service-specific block content goes) + CTA final + WhatsApp.

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">

  <!-- wp:group {"className":"servicio-hero","style":{"spacing":{"padding":{"top":"80px","bottom":"60px","left":"36px","right":"36px"}}},"backgroundColor":"beige","layout":{"type":"constrained"}} -->
  <div class="wp-block-group servicio-hero has-beige-background-color has-background" style="padding:80px 36px 60px">
    <!-- wp:paragraph {"className":"section-label"} -->
    <p class="section-label">Servicio</p>
    <!-- /wp:paragraph -->
    <!-- wp:post-title {"level":1,"style":{"typography":{"fontSize":"clamp(36px, 5vw, 60px)","lineHeight":"1.05"}}} /-->
    <!-- wp:html -->
    <div class="smile-curve" style="margin-top:24px;margin-left:0"></div>
    <!-- /wp:html -->
  </div>
  <!-- /wp:group -->

  <!-- wp:group {"className":"servicio-content","style":{"spacing":{"padding":{"top":"60px","bottom":"60px","left":"36px","right":"36px"}},"layout":{"contentSize":"760px"}},"layout":{"type":"constrained"}} -->
  <div class="wp-block-group servicio-content" style="padding:60px 36px">
    <!-- wp:post-content /-->
  </div>
  <!-- /wp:group -->

  <!-- wp:pattern {"slug":"ladentisteria/cta-final"} /-->

</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 5: Write `archive-servicio.html`**

Layout for `/servicios/` listing all services as cards.

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">

  <!-- wp:group {"style":{"spacing":{"padding":{"top":"80px","bottom":"60px","left":"36px","right":"36px"}}},"layout":{"type":"constrained"}} -->
  <div class="wp-block-group" style="padding:80px 36px 60px">
    <!-- wp:paragraph {"className":"section-label"} -->
    <p class="section-label">Servicios</p>
    <!-- /wp:paragraph -->
    <!-- wp:heading {"level":1} -->
    <h1>Todas nuestras especialidades.</h1>
    <!-- /wp:heading -->
    <!-- wp:paragraph {"className":"lede"} -->
    <p class="lede">Cobertura integral de odontología para adultos. Cada especialidad a cargo de quien sabe.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:group -->

  <!-- wp:query {"queryId":1,"query":{"perPage":20,"postType":"servicio","order":"asc","orderBy":"menu_order"},"layout":{"type":"constrained"}} -->
  <div class="wp-block-query">
    <!-- wp:post-template {"layout":{"type":"grid","columnCount":3}} -->
      <!-- wp:group {"className":"servicio-card","style":{"spacing":{"padding":{"top":"28px","right":"24px","bottom":"28px","left":"24px"}},"border":{"width":"1px","color":"var:preset|color|line","radius":"8px"},"color":{"background":"#ffffff"}}} -->
      <div class="wp-block-group servicio-card has-background" style="background:#ffffff;border-color:var(--wp--preset--color--line);border-width:1px;border-radius:8px;padding:28px 24px">
        <!-- wp:post-title {"level":3,"isLink":true,"style":{"typography":{"fontSize":"24px"}}} /-->
        <!-- wp:post-excerpt {"moreText":"Conocer más →","style":{"typography":{"fontSize":"13px"}}} /-->
      </div>
      <!-- /wp:group -->
    <!-- /wp:post-template -->
  </div>
  <!-- /wp:query -->

  <!-- wp:pattern {"slug":"ladentisteria/cta-final"} /-->

</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 6: Verify templates load**

Open `https://ladentisteria.local/`. Expected: header + (empty content) + footer renders. No fatal errors.

- [ ] **Step 7: Commit**

```bash
git add clients/la-dentisteria/wp-theme/templates/
git commit -m "feat(theme): add page, front-page, single-servicio, archive-servicio templates"
```

---

## Phase 4 — Pages Content

### Task 4.1: Create Home page and assemble with patterns

**Files:**
- WP DB: page "Home" (created via admin)

- [ ] **Step 1: Create Home page in WP admin**

Pages → Add New:
- Title: `Inicio`
- Slug: `inicio` (or leave as-is and set as front page)
- Content: empty for now (we'll insert patterns)

- [ ] **Step 2: Set as front page**

Settings → Reading → "A static page" → Front page: Inicio.

- [ ] **Step 3: Assemble Home with patterns**

Edit Inicio page → click "+" → Patterns → "La Dentisteria" category → insert in this order:
1. Hero
2. Servicios destacados
3. Pilares
4. Nosotros teaser
5. Internacional banner
6. Testimonios placeholder
7. Blog teaser
8. CTA final

Save/Update.

- [ ] **Step 4: Verify home renders**

Open `https://ladentisteria.local/`. Expected: full home as in approved mockup. Visual QA — compare against [.superpowers/brainstorm/.../home-full.html](../../.superpowers/brainstorm/1618-1777403412/content/home-full.html) for parity.

### Task 4.2: Create the 4 V1 service pages

**Files:**
- Create: `clients/la-dentisteria/content/servicios/ortodoncia-medellin.md`
- Create: `clients/la-dentisteria/content/servicios/odontologia-estetica-medellin.md`
- Create: `clients/la-dentisteria/content/servicios/cirugia-maxilofacial-medellin.md`
- Create: `clients/la-dentisteria/content/servicios/implantes-dentales-medellin.md`
- WP DB: 4 servicio CPT entries

- [ ] **Step 1: Write `ortodoncia-medellin.md`**

Frontmatter + body following the on-page SEO pattern from spec §7. Structure:

```markdown
---
title: "Ortodoncia en Medellín"
slug: "ortodoncia-medellin"
seo_title: "Ortodoncia en Medellín | Brackets, Invisalign y Más | La Dentisteria"
seo_description: "Ortodoncia en Medellín con tratamientos para adultos. Brackets metálicos, estéticos e invisibles en Parque Fabricato. Agenda tu valoración hoy."
keyword_primary: "ortodoncia Medellín"
excerpt: "Brackets metálicos, estéticos, de zafiro y alineadores invisibles. Para alineaciones que mejoran tu salud y tu sonrisa."
order: 1
---

## Tipos de ortodoncia que ofrecemos

[~600 words covering brackets metálicos, cerámicos, zafiro, Invisalign — adapted from brief docx, with keyword "ortodoncia Medellín" used 8-12 times naturally]

## Nuestro proceso paso a paso

[~250 words: valoración → estudios → plan → tratamiento → retención]

## Preguntas frecuentes

### ¿Cuánto dura un tratamiento de ortodoncia?
[Answer]

### ¿Brackets duelen al ponerlos?
[Answer]

### ¿Cuál es la diferencia entre brackets metálicos, cerámicos y de zafiro?
[Answer]

### ¿Cuánto cuesta la ortodoncia para adultos en Medellín?
[Answer ~ "El tratamiento se evalúa en consulta. Ofrecemos planes con financiación. Escríbenos por WhatsApp y te orientamos."]

## Agenda tu valoración

[CTA paragraph + WA button]
```

- [ ] **Step 2: Repeat for the other 3 service Markdown files**

Same structure. Use copy from the brief docx but rewrite to:
- Replace any "Clara Villa diseño de sonrisa" → "La Dentisteria"
- Remove "30 años" claims
- Lean into the chosen trust pillars
- Hit keyword density 1-1.5% for primary

- [ ] **Step 3: Import each Markdown file as a CPT entry via WP CLI**

Create `clients/la-dentisteria/scripts/import-content.sh`:

```bash
#!/usr/bin/env bash
# Imports Markdown content into WordPress as CPT entries.
# Requires WP CLI in PATH and Local site to be running.

set -e

WP_PATH="$HOME/Local Sites/la-dentisteria/app/public"
CONTENT_DIR="$(dirname "$0")/../content/servicios"

cd "$WP_PATH"

for md_file in "$CONTENT_DIR"/*.md; do
  slug=$(basename "$md_file" .md)
  title=$(grep '^title:' "$md_file" | sed 's/title: //;s/"//g')
  excerpt=$(grep '^excerpt:' "$md_file" | sed 's/excerpt: //;s/"//g')
  order=$(grep '^order:' "$md_file" | sed 's/order: //')
  body=$(awk '/^---$/{n++} n==2{flag=1; next} flag' "$md_file")

  wp post create \
    --post_type=servicio \
    --post_status=publish \
    --post_title="$title" \
    --post_name="$slug" \
    --post_excerpt="$excerpt" \
    --menu_order="$order" \
    --post_content="$body"
done

echo "Imported $(ls "$CONTENT_DIR"/*.md | wc -l) servicios."
```

- [ ] **Step 4: Run the import**

```bash
chmod +x clients/la-dentisteria/scripts/import-content.sh
clients/la-dentisteria/scripts/import-content.sh
```

Expected output: "Imported 4 servicios."

- [ ] **Step 5: Verify each service page renders**

Open `https://ladentisteria.local/servicios/ortodoncia-medellin/`. Expected: page renders with `single-servicio.html` template (hero + content + CTA final + footer).

Repeat for the other 3.

- [ ] **Step 6: Commit Markdown content + import script**

```bash
git add clients/la-dentisteria/content/servicios/ clients/la-dentisteria/scripts/import-content.sh
git commit -m "feat(content): add 4 V1 service pages and import script"
```

### Task 4.3: Create Nosotros, Contacto, Agendar Cita pages

**Files:**
- Create: `clients/la-dentisteria/content/pages/nosotros.md`
- Create: `clients/la-dentisteria/content/pages/contacto.md`
- Create: `clients/la-dentisteria/content/pages/agendar-cita.md`
- WP DB: 3 page entries

- [ ] **Step 1: Write `nosotros.md`**

Headline "Conocemos a Medellín. Conocemos sus sonrisas."
Body: ~400 words — historia de la clínica (sin años), pilares ampliados, foto del consultorio, NAP. NO mencionar Clara Villa. NO mencionar "30 años".

- [ ] **Step 2: Write `contacto.md`**

NAP + horarios + mapa embebido (Google Maps iframe to Parque Fabricato address) + 3 channels (WA, llamar, email) + form (Fluent Forms — set up in Phase 5).

- [ ] **Step 3: Write `agendar-cita.md`**

Landing optimizada conversión: H1 "Reserva tu valoración", lede de 30 min sin compromiso, formulario corto (4 fields: nombre, teléfono, email, servicio de interés), botón WA prominente, NAP compacto.

- [ ] **Step 4: Extend import script for pages**

Add `import-pages.sh` or extend `import-content.sh` to handle `pages/` dir creating `--post_type=page` entries.

- [ ] **Step 5: Run the import**

- [ ] **Step 6: Verify all 3 pages render**

Open `https://ladentisteria.local/nosotros/`, `/contacto/`, `/agendar-cita/`. Expected: each renders with `page.html` template.

- [ ] **Step 7: Commit**

```bash
git add clients/la-dentisteria/content/pages/ clients/la-dentisteria/scripts/import-content.sh
git commit -m "feat(content): add Nosotros, Contacto, Agendar Cita pages"
```

---

## Phase 5 — SEO Technical

### Task 5.1: Install and configure Yoast SEO

**Files:**
- WP plugins (no repo files yet)

- [ ] **Step 1: Install Yoast SEO**

Plugins → Add New → search "Yoast SEO" → Install → Activate.

- [ ] **Step 2: Run configuration wizard**

Yoast → General → First-time configuration. Set:
- Site type: Healthcare/Dental
- Organization name: La Dentisteria
- Default social image: upload logo isotipo
- Persona: organization (not personal)
- Keep XML sitemap on (default)

- [ ] **Step 3: Set per-page SEO titles and meta descriptions**

For each of the 4 service pages, edit in WP admin → Yoast SEO box:
- SEO title from Markdown frontmatter
- Meta description from Markdown frontmatter
- Focus keyphrase from `keyword_primary` field

For Home, Nosotros, Contacto, Agendar Cita: set descriptive titles/metas following the spec §7.1 patterns.

- [ ] **Step 4: Verify Yoast sitemap exists**

Open `https://ladentisteria.local/sitemap_index.xml`. Expected: XML index with `post-sitemap.xml`, `page-sitemap.xml`, `servicio-sitemap.xml` URLs.

- [ ] **Step 5: Commit (just the lock state — Yoast settings aren't versioned)**

```bash
echo "Yoast SEO installed and configured. Settings live in WP DB." >> clients/la-dentisteria/README.md
git add clients/la-dentisteria/README.md
git commit -m "docs(la-dentisteria): note Yoast SEO setup"
```

### Task 5.2: Implement custom JSON-LD schema (Dentist + MedicalProcedure)

**Files:**
- Modify: `clients/la-dentisteria/wp-theme/inc/schema.php`

- [ ] **Step 1: Replace stub with full schema generator**

```php
<?php
/**
 * JSON-LD schema generation.
 * Outputs Dentist on home/contacto, MedicalProcedure on service pages.
 * Yoast handles WebSite/Organization basics; we add the medical-specific layer.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_head', function() {
    if ( is_front_page() || is_page( 'contacto' ) ) {
        echo ladent_schema_dentist();
    } elseif ( is_singular( 'servicio' ) ) {
        echo ladent_schema_medical_procedure();
    }
}, 20 );

function ladent_schema_dentist(): string {
    $data = [
        '@context' => 'https://schema.org',
        '@type'    => 'Dentist',
        '@id'      => home_url( '/#dentist' ),
        'name'     => 'La Dentisteria',
        'url'      => home_url( '/' ),
        'telephone' => '+57-304-426-9079',
        'email'    => 'infoladentisteria@gmail.com',
        'image'    => get_template_directory_uri() . '/assets/img/logo.png',
        'address'  => [
            '@type'           => 'PostalAddress',
            'streetAddress'   => 'Carrera 50 # 38 A 185, Local 99300, Centro Comercial Parque Fabricato',
            'addressLocality' => 'Bello',
            'addressRegion'   => 'Antioquia',
            'postalCode'      => '051050',
            'addressCountry'  => 'CO',
        ],
        'geo' => [
            '@type'     => 'GeoCoordinates',
            'latitude'  => 6.3399,
            'longitude' => -75.5566,
        ],
        'openingHoursSpecification' => [
            [
                '@type'     => 'OpeningHoursSpecification',
                'dayOfWeek' => [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday' ],
                'opens'     => '08:00',
                'closes'    => '18:00',
            ],
            [
                '@type'     => 'OpeningHoursSpecification',
                'dayOfWeek' => 'Saturday',
                'opens'     => '08:00',
                'closes'    => '12:00',
            ],
        ],
        'priceRange' => '$$',
        'medicalSpecialty' => [ 'Dentistry', 'Orthodontics', 'OralAndMaxillofacialSurgery' ],
        'availableService' => [
            [ '@type' => 'MedicalProcedure', 'name' => 'Ortodoncia' ],
            [ '@type' => 'MedicalProcedure', 'name' => 'Odontología Estética' ],
            [ '@type' => 'MedicalProcedure', 'name' => 'Cirugía Maxilofacial' ],
            [ '@type' => 'MedicalProcedure', 'name' => 'Implantes Dentales' ],
        ],
        'areaServed' => [
            [ '@type' => 'City', 'name' => 'Medellín' ],
            [ '@type' => 'City', 'name' => 'Bello' ],
        ],
    ];
    return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
}

function ladent_schema_medical_procedure(): string {
    global $post;
    $title = get_the_title();
    $description = get_the_excerpt();

    $data = [
        '@context'       => 'https://schema.org',
        '@type'          => 'MedicalProcedure',
        '@id'            => get_permalink() . '#procedure',
        'name'           => $title,
        'description'    => wp_strip_all_tags( $description ),
        'url'            => get_permalink(),
        'medicalSpecialty' => 'Dentistry',
        'performedBy'    => [
            '@type' => 'Dentist',
            '@id'   => home_url( '/#dentist' ),
            'name'  => 'La Dentisteria',
        ],
    ];
    return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
}
```

- [ ] **Step 2: Validate with Google Rich Results Test**

Open `https://search.google.com/test/rich-results` → enter `https://ladentisteria.local/` (use ngrok or browser DevTools "Copy as fetch" workaround for local). Or copy the rendered HTML and paste into the tool.

Expected: "Dentist" detected, no errors.

Repeat for `https://ladentisteria.local/servicios/ortodoncia-medellin/`. Expected: "MedicalProcedure" detected.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/inc/schema.php
git commit -m "feat(seo): add Dentist + MedicalProcedure JSON-LD schema"
```

### Task 5.3: Add hreflang tags (V1 sets up the infra; V1.2 adds /en/ alternates)

**Files:**
- Modify: `clients/la-dentisteria/wp-theme/inc/seo-helpers.php`

- [ ] **Step 1: Replace stub with hreflang output**

```php
<?php
/**
 * SEO helpers: hreflang, canonical overrides where Yoast falls short.
 * V1 emits es-co + x-default. EN alternates added in V1.2 when /en/ exists.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_head', function() {
    $canonical = ladent_canonical_url();

    printf(
        '<link rel="alternate" hreflang="es-co" href="%s" />' . "\n",
        esc_url( $canonical )
    );
    printf(
        '<link rel="alternate" hreflang="x-default" href="%s" />' . "\n",
        esc_url( $canonical )
    );
    // V1.2 will add: <link rel="alternate" hreflang="en" href="..." />
}, 5 );

function ladent_canonical_url(): string {
    if ( is_singular() ) return get_permalink();
    if ( is_home() || is_front_page() ) return home_url( '/' );
    if ( is_post_type_archive( 'servicio' ) ) return home_url( '/servicios/' );
    return home_url( add_query_arg( null, null ) );
}
```

- [ ] **Step 2: Verify hreflang appears in page source**

Open `https://ladentisteria.local/` → View Source → grep "hreflang". Expected: 2 lines (es-co + x-default), both pointing to `https://ladentisteria.local/`.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/inc/seo-helpers.php
git commit -m "feat(seo): emit hreflang es-co and x-default"
```

### Task 5.4: Custom robots.txt and sitemap declaration

**Files:**
- Modify (filter): `clients/la-dentisteria/wp-theme/inc/seo-helpers.php`

- [ ] **Step 1: Append robots filter to seo-helpers.php**

```php
add_filter( 'robots_txt', function( $output, $public ) {
    if ( ! $public ) return $output;
    $custom = "User-agent: *\n";
    $custom .= "Disallow: /wp-admin/\n";
    $custom .= "Disallow: /agendar-cita/gracias/\n";
    $custom .= "Disallow: /*?utm_*\n";
    $custom .= "Allow: /\n";
    $custom .= "Sitemap: " . home_url( '/sitemap_index.xml' ) . "\n";
    return $custom;
}, 10, 2 );
```

- [ ] **Step 2: Verify robots.txt**

Open `https://ladentisteria.local/robots.txt`. Expected: matches the filter output above.

- [ ] **Step 3: Commit**

```bash
git add clients/la-dentisteria/wp-theme/inc/seo-helpers.php
git commit -m "feat(seo): customize robots.txt with sitemap declaration"
```

---

## Phase 6 — WhatsApp Contextual Button

### Task 6.1: Implement contextual WhatsApp button

**Files:**
- Create: `clients/la-dentisteria/wp-theme/assets/js/whatsapp-contextual.js`
- Modify: `clients/la-dentisteria/wp-theme/parts/footer.html`
- Modify: `clients/la-dentisteria/wp-theme/assets/css/main.css`

- [ ] **Step 1: Write `whatsapp-contextual.js`**

```javascript
/**
 * Contextual WhatsApp button.
 * Reads URL slug, sets the button href with a route-specific preset message.
 * Phone: +57 304 426 9079 → wa.me/573044269079
 */

(function () {
  'use strict';

  const PHONE = '573044269079';

  const DEFAULT_ES = 'Hola, me gustaría agendar una valoración en La Dentistería.';
  const DEFAULT_EN = 'Hi, I\'m interested in dental treatment at La Dentistería.';

  const SERVICE_MESSAGES = {
    'ortodoncia-medellin':           'Hola, quiero información sobre ortodoncia.',
    'odontologia-estetica-medellin': 'Hola, quiero información sobre diseño de sonrisa.',
    'cirugia-maxilofacial-medellin': 'Hola, quiero información sobre cirugía maxilofacial.',
    'implantes-dentales-medellin':   'Hola, quiero información sobre implantes dentales.',
    'odontologia-general':           'Hola, quiero información sobre odontología general.',
    'periodoncia':                   'Hola, quiero información sobre periodoncia.',
    'endodoncia':                    'Hola, quiero información sobre endodoncia.',
    'rehabilitacion-oral':           'Hola, quiero información sobre rehabilitación oral.',
    'blanqueamiento-dental':         'Hola, quiero información sobre blanqueamiento dental.',
  };

  function buildMessage() {
    const path = window.location.pathname;

    // English routes
    if (path.startsWith('/en/') || path.includes('/pacientes-internacionales/')) {
      return DEFAULT_EN;
    }

    // Service routes
    const serviceMatch = path.match(/\/servicios\/([^\/]+)/);
    if (serviceMatch && SERVICE_MESSAGES[serviceMatch[1]]) {
      return SERVICE_MESSAGES[serviceMatch[1]];
    }

    return DEFAULT_ES;
  }

  function createButton() {
    const message = encodeURIComponent(buildMessage());
    const href = `https://wa.me/${PHONE}?text=${message}`;

    const btn = document.createElement('a');
    btn.href = href;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'wa-float';
    btn.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    `;
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }
})();
```

- [ ] **Step 2: Add WhatsApp float CSS to main.css**

```css
.wa-float {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  background: #25D366;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  z-index: 1000;
  transition: transform 0.15s;
}
.wa-float:hover { transform: scale(1.05); }
.wa-float svg { width: 28px; height: 28px; }

@media (max-width: 600px) {
  .wa-float { bottom: 16px; right: 16px; width: 52px; height: 52px; }
}
```

- [ ] **Step 3: Verify on home and a service page**

Open `https://ladentisteria.local/` → DevTools → click WA button. Expected: opens WhatsApp web with message "Hola, me gustaría agendar una valoración en La Dentistería." prefilled.

Open `/servicios/ortodoncia-medellin/`. Expected: message changes to "Hola, quiero información sobre ortodoncia."

- [ ] **Step 4: Commit**

```bash
git add clients/la-dentisteria/wp-theme/assets/js/whatsapp-contextual.js clients/la-dentisteria/wp-theme/assets/css/main.css
git commit -m "feat(theme): contextual WhatsApp floating button"
```

---

## Phase 7 — Forms

### Task 7.1: Install Fluent Forms and create Agendar Cita form

**Files:**
- WP plugin install (Fluent Forms)

- [ ] **Step 1: Install Fluent Forms**

Plugins → Add New → search "Fluent Forms" → Install → Activate.

- [ ] **Step 2: Create the Agendar Cita form**

Fluent Forms → New Form → start blank. Fields:
- Nombre (Text, required)
- Teléfono (Phone, required)
- Email (Email, required)
- Servicio de interés (Dropdown: Ortodoncia / Diseño de Sonrisa / Cirugía Maxilofacial / Implantes / Otro, required)
- Mensaje (Textarea, optional)

Submit button: "Reservar valoración"

- [ ] **Step 3: Configure email notification**

Fluent Forms → Settings → Email Notifications:
- To: `infoladentisteria@gmail.com`
- Subject: `Nueva solicitud de valoración – {inputs.nombre}`
- Body: include all fields

- [ ] **Step 4: Embed form in agendar-cita page**

Edit `/agendar-cita/` page → insert Fluent Forms shortcode block → select the form created.

- [ ] **Step 5: Test submission**

Submit a test entry. Expected: receive email at infoladentisteria@gmail.com.

- [ ] **Step 6: Commit (note only)**

Form data lives in WP DB; we document the form ID in README.

```bash
echo "Fluent Forms: 'Agendar Cita' form id=1, embedded at /agendar-cita/. Email to infoladentisteria@gmail.com." >> clients/la-dentisteria/README.md
git add clients/la-dentisteria/README.md
git commit -m "docs(la-dentisteria): document Fluent Forms agendar cita setup"
```

---

## Phase 8 — Local QA Pass

### Task 8.1: Visual QA against approved mockup

- [ ] **Step 1: Open all V1 pages in browser**

- `https://ladentisteria.local/` (home)
- `/servicios/`
- `/servicios/ortodoncia-medellin/`
- `/servicios/odontologia-estetica-medellin/`
- `/servicios/cirugia-maxilofacial-medellin/`
- `/servicios/implantes-dentales-medellin/`
- `/nosotros/`
- `/contacto/`
- `/agendar-cita/`

- [ ] **Step 2: Compare home against approved mockup**

Side-by-side with the approved mockup. Check: typography, spacing, colors, hero, services cards, pilares, sobre nosotros, internacional banner, testimonios placeholder, blog teaser, CTA final, footer, WhatsApp float button.

Note any deviations. Fix in respective pattern/CSS file. Re-commit.

- [ ] **Step 3: Mobile responsive check**

DevTools → mobile viewport (375px, 414px). Verify:
- Nav collapses
- Hero H1 readable (44px)
- Cards stack to 1 column
- Pilares: 2x2 or 1 column
- Footer stacks
- WA button visible

### Task 8.2: Lighthouse audit

- [ ] **Step 1: Run Lighthouse on home**

DevTools → Lighthouse → Mobile → Performance + SEO + Accessibility + Best Practices → Generate.

Targets:
- Performance ≥ 90
- SEO ≥ 95
- Accessibility ≥ 95
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms

If any fails, fix the listed issues (most common: image dimensions missing, render-blocking CSS — adjust enqueue strategy or add preload hints).

- [ ] **Step 2: Run on a service page**

Same targets.

- [ ] **Step 3: Commit any fixes**

### Task 8.3: Schema validation

- [ ] **Step 1: Validate Dentist schema on home**

Use Schema Markup Validator (https://validator.schema.org/) — copy page source, paste, validate. Expected: no errors, Dentist detected.

- [ ] **Step 2: Validate MedicalProcedure on each of the 4 service pages**

Same validator. Expected: MedicalProcedure detected on each.

- [ ] **Step 3: Run Rich Results Test**

https://search.google.com/test/rich-results — paste URL or HTML. Expected: "Eligible for rich results" for at least the home page.

### Task 8.4: Internal links audit

- [ ] **Step 1: Click every link on every page**

Test all nav links, CTAs, footer links, in-content links.

Expected: no 404s except `/blog/` (V1.1) and `/pacientes-internacionales/` (V1.2). For these two, decide:
- A) Hide links from V1 (cleanest)
- B) Show with `coming soon` placeholder pages
- C) Leave as-is and accept temporary 404s

Recommendation: B — create stub placeholder pages "Próximamente" so we don't lose nav momentum.

- [ ] **Step 2: Create stub pages if Option B chosen**

Create `/blog/` and `/pacientes-internacionales/` pages with minimal "Próximamente. Vuelve pronto." copy + WhatsApp CTA.

- [ ] **Step 3: Re-audit. Commit any link changes.**

---

## Phase 9 — Deployment to cPanel

### Task 9.1: Install Duplicator Pro and create archive

- [ ] **Step 1: Install Duplicator (free version is enough for V1)**

Plugins → Add New → "Duplicator" → Install → Activate.

- [ ] **Step 2: Create package**

Duplicator → Packages → Create New → Next through scans → Build.

Expected: ZIP archive (~50-200MB depending on uploads) and `installer.php`. Download both.

### Task 9.2: Deploy to cPanel

**Files:**
- Create: `clients/la-dentisteria/scripts/deploy.sh` (documentation only — manual steps)

- [ ] **Step 1: Connect to cPanel**

Open `https://ladentisteriacv.com:2083/`. Login with credentials from client docx (NEVER commit these to repo).

- [ ] **Step 2: Create database**

cPanel → MySQL Databases → create:
- DB name: `ladentisteria_wp`
- User: `ladentisteria_wp`
- Strong password (save in password manager)

Add user to DB with ALL PRIVILEGES.

- [ ] **Step 3: Upload Duplicator package and installer**

cPanel → File Manager → navigate to `public_html/` → upload `installer.php` and the package ZIP. Don't extract.

- [ ] **Step 4: Run installer**

Browse to `https://ladentisteriacv.com/installer.php` → follow wizard:
- DB name: `ladentisteria_wp` (with cPanel username prefix, e.g., `claradentisteria_ladentisteria_wp`)
- DB user: `ladentisteria_wp` (similarly prefixed)
- DB password: from step 2
- New URL: `https://ladentisteriacv.com`
- Confirm overwrite — yes

Expected: success screen with login link.

- [ ] **Step 5: Login to production WP**

Login with original Local credentials (Duplicator preserves users).

- [ ] **Step 6: Delete installer files**

Duplicator dashboard → "Remove installer files" — or manually delete `installer.php`, `installer-backup.php`, `dup-installer-data*` from File Manager.

### Task 9.3: SSL, permalinks, sitemap submit

- [ ] **Step 1: Enable SSL**

cPanel → SSL/TLS Status → "Run AutoSSL". Wait for cert to be issued.

If AutoSSL unavailable: cPanel → Let's Encrypt → install for `ladentisteriacv.com` and `www.ladentisteriacv.com`.

Force HTTPS: Settings → General → ensure WordPress Address and Site Address use `https://`.

- [ ] **Step 2: Re-save permalinks**

WP admin → Settings → Permalinks → click "Save Changes" (no edits). This flushes rewrite rules.

- [ ] **Step 3: Verify production site**

Open `https://ladentisteriacv.com/`. Expected: full home renders identically to local. Test all 9 V1 pages.

- [ ] **Step 4: Submit sitemap to Google Search Console**

https://search.google.com/search-console → add property `ladentisteriacv.com` → verify ownership (DNS TXT or HTML file). Once verified → Sitemaps → submit `sitemap_index.xml`.

- [ ] **Step 5: Submit to Bing Webmaster Tools**

https://www.bing.com/webmasters → add site → submit sitemap.

- [ ] **Step 6: Re-validate schema on production**

https://search.google.com/test/rich-results → enter `https://ladentisteriacv.com/`. Expected: Dentist detected, no errors.

Repeat for one service page.

- [ ] **Step 7: Document deployment in scripts/deploy.sh**

```bash
#!/usr/bin/env bash
# Deploy notes — run manually, not automated.
# 1. WP admin → Duplicator → Build new package
# 2. Upload installer.php + ZIP to public_html via cPanel File Manager
# 3. Run https://ladentisteriacv.com/installer.php
# 4. Use DB creds from password manager (not committed)
# 5. Delete installer files post-deploy
# 6. Re-save permalinks
# 7. Re-validate Lighthouse, Schema, Rich Results
echo "See instructions in this file."
```

- [ ] **Step 8: Commit**

```bash
git add clients/la-dentisteria/scripts/deploy.sh
git commit -m "docs(la-dentisteria): document deployment procedure"
```

### Task 9.4: Production smoke test

- [ ] **Step 1: Test Lighthouse on production**

DevTools → Lighthouse → mobile → run on `https://ladentisteriacv.com/`. Expected: scores within 5 points of local.

- [ ] **Step 2: Test WhatsApp button**

Click on home: should say "Hola, me gustaría agendar una valoración…"
Click on `/servicios/ortodoncia-medellin/`: should say "Hola, quiero información sobre ortodoncia."

- [ ] **Step 3: Test contact form**

Submit Agendar Cita form. Verify email arrives.

- [ ] **Step 4: Tag the release**

```bash
git tag -a la-dentisteria-v1.0.0 -m "La Dentisteria web V1 launched at ladentisteriacv.com"
```

(Tagging only — do NOT push tag without user request.)

---

## Self-Review

After writing this plan, here is the inline review:

**1. Spec coverage:**
- ✅ §2 brand decisions — covered in functions.php, schema.php, footer NAP
- ✅ §3 visual identity — theme.json + tokens.css + patterns
- ✅ §4 sitemap (V1 subset) — CPT registration, templates, page creation
- ✅ §5 home design — patterns assembled in Phase 4.1
- ✅ §6 WhatsApp contextual — Phase 6
- ✅ §7 SEO technical — Phase 5
- ✅ §8 tech stack and entry — covered (WordPress, FSE, Yoast, Fluent Forms)
- ⏸️ §9 quick wins externos — deliberately out of scope (client's task, documented in spec §9)
- ⏸️ §10 metrics — captured at deploy time via GSC, ongoing tracking
- ✅ §11 cliente assets — used (logo, photos, brief docx informed copy)
- ✅ §12 decisiones cerradas — every decision has its task
- ⏸️ V1.1 (secondary services + blog) and V1.2 (/en/ + internacional) — separate plans

**2. Placeholder scan:** none. All step blocks contain actual code or commands. Task 2.6 was condensed to keep the plan readable but enumerates all 5 patterns with the same Tasks 2.3-2.5 structure clear from §2 examples.

**3. Type/name consistency:**
- Phone is `573044269079` everywhere (functions.php, JS, schema)
- Color tokens match between theme.json and tokens.css
- CPT slug `servicio` consistent in post-types.php and template names
- Pattern slugs (`ladentisteria/hero`, etc.) match between PHP register and template references

**4. Scope check:** V1 launches a working, indexable site. V1.1 and V1.2 are separate plans (decision documented at start). Self-contained.

---

## Execution Handoff

**Two execution options:**

**1. Subagent-Driven (recommended)** — Tomás's Claude session dispatches a fresh subagent per task, reviews between tasks. Gives clean context for each task, fast iteration when something goes wrong.

**2. Inline Execution** — Execute tasks in this same session via executing-plans skill. Batch execution with checkpoints. Faster end-to-end but heavier on context.

**Considerations specific to this plan:**
- WordPress dev requires running a local server (Local by Flywheel). Tomás will need to keep it running across sessions.
- Many tasks require WP admin GUI clicks (Yoast wizard, Fluent Forms, page assembly). These are best executed by Tomás manually, not by an AI agent.
- Code-heavy tasks (theme files, patterns, schema, JS) are AI-friendly.

Recommendation: **hybrid approach.** AI executes code tasks via subagents; Tomás executes GUI tasks (~5-7 of them) following the plan steps verbatim.
