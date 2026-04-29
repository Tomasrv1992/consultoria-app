// render-static.js — Generate static HTML preview of La Dentisteria WP theme.
//
// Reads patterns/, parts/, and content/, strips WordPress block markup
// (<!-- wp:* -->) and PHP block headers, renders Markdown, and writes a
// drag-drop-ready static site to clients/la-dentisteria/preview-static/.
//
// Run from clients/la-dentisteria/:
//   npm install && npm run render

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const THEME_DIR = path.join(ROOT, 'wp-theme');
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'preview-static');

const SERVICIO_SLUGS = [
  'ortodoncia-medellin',
  'odontologia-estetica-medellin',
  'cirugia-maxilofacial-medellin',
  'implantes-dentales-medellin',
];

const PAGE_SLUGS = ['nosotros', 'contacto', 'agendar-cita'];

const PATTERN_SLUGS = [
  'hero',
  'servicios-destacados',
  'pilares',
  'nosotros-teaser',
  'internacional-banner',
  'testimonios-placeholder',
  'blog-teaser',
  'cta-final',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripWPMarkup(html) {
  return html
    // Strip an opening PHP block (pattern files start with <?php ... ?>).
    .replace(/^<\?php[\s\S]*?\?>\s*/m, '')
    // Strip every wp:* block comment, opening, closing, or self-closing,
    // with or without attribute JSON.
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
    // Strip plain HTML comments left behind (e.g. theme notes).
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // Trim leading/trailing whitespace.
    .replace(/^\s+|\s+$/g, '');
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(filePath, contents) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function rmDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

// The WP site-header part references <!-- wp:site-title /--> and
// <!-- wp:navigation /--> blocks which only render inside WordPress.
// For the static preview we hand-write the equivalent HTML.
function buildHeaderHtml() {
  return `<header class="wp-block-group site-header has-beige-background-color has-background" style="padding-top:18px;padding-right:36px;padding-bottom:18px;padding-left:36px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;border-bottom:1px solid var(--wp--preset--color--line)">
  <div class="wp-block-group site-logo">
    <a href="/" class="wp-block-site-title" style="font-family:var(--wp--preset--font-family--serif);font-size:20px;text-transform:uppercase;letter-spacing:0.04em;color:var(--wp--preset--color--ink);text-decoration:none">LA DENTISTERÍA</a>
    <p class="logo-tag has-small-font-size" style="font-size:9px;letter-spacing:0.05em;color:var(--wp--preset--color--ink-soft);margin:0">by ClaraVilla</p>
  </div>
  <nav class="main-nav" style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;display:flex;gap:14px;align-items:center">
    <a href="/servicios/" style="color:var(--wp--preset--color--ink);text-decoration:none">Servicios</a>
    <a href="/nosotros/" style="color:var(--wp--preset--color--ink);text-decoration:none">Nosotros</a>
    <a href="/contacto/" style="color:var(--wp--preset--color--ink);text-decoration:none">Contacto</a>
    <a href="/agendar-cita/" style="background:var(--wp--preset--color--teal);color:var(--wp--preset--color--beige);padding:9px 18px;border-radius:999px;text-decoration:none;font-size:10px;font-weight:600">Agendar cita</a>
  </nav>
</header>`;
}

async function loadFooter() {
  const raw = await readText(path.join(THEME_DIR, 'parts', 'footer.html'));
  return stripWPMarkup(raw);
}

async function loadPattern(slug) {
  const raw = await readText(path.join(THEME_DIR, 'patterns', `${slug}.php`));
  return stripWPMarkup(raw);
}

async function loadServicio(slug) {
  const raw = await readText(
    path.join(CONTENT_DIR, 'servicios', `${slug}.md`)
  );
  const { data, content } = matter(raw);
  const bodyHtml = marked.parse(content);
  return { ...data, slug: data.slug || slug, bodyHtml };
}

async function loadPage(slug) {
  const raw = await readText(path.join(CONTENT_DIR, 'pages', `${slug}.md`));
  const { data, content } = matter(raw);
  const bodyHtml = marked.parse(content);
  return { ...data, slug: data.slug || slug, bodyHtml };
}

// ---------------------------------------------------------------------------
// HTML shell
// ---------------------------------------------------------------------------

function escapeAttr(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function htmlShell({ title, description, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter+Tight:wght@400..700&display=swap">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
${bodyHtml}
<script defer src="/assets/js/whatsapp-contextual.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Page renderers
// ---------------------------------------------------------------------------

function renderServicioHero(servicio) {
  return `<section class="wp-block-group servicio-hero has-beige-background-color has-background" style="padding-top:80px;padding-right:36px;padding-bottom:60px;padding-left:36px">
  <p class="section-label">Servicio</p>
  <h1 style="font-size:clamp(36px, 5vw, 60px);line-height:1.05">${servicio.title}</h1>
  <div class="smile-curve" style="margin-top:24px;margin-left:0"></div>
</section>`;
}

function renderServicioContent(servicio) {
  return `<section class="wp-block-group servicio-content" style="padding-top:60px;padding-right:36px;padding-bottom:60px;padding-left:36px;max-width:760px;margin-left:auto;margin-right:auto">
${servicio.bodyHtml}
</section>`;
}

function renderArchiveHero() {
  return `<section class="wp-block-group servicios-archive-hero has-beige-background-color has-background" style="padding-top:80px;padding-right:36px;padding-bottom:60px;padding-left:36px">
  <p class="section-label">Servicios</p>
  <h1>Todas nuestras especialidades.</h1>
  <p class="lede" style="margin-top:14px;font-size:16px;color:var(--wp--preset--color--ink-soft)">Cobertura integral de odontología para adultos. Cada especialidad a cargo de quien sabe.</p>
</section>`;
}

function renderArchiveCards(servicios) {
  const cards = servicios
    .map(
      (s) => `        <div class="wp-block-group servicio-card has-background" style="background:#ffffff;border:1px solid var(--wp--preset--color--line);border-radius:8px;padding:28px 24px">
          <h3 style="font-size:24px"><a href="/servicios/${s.slug}/">${s.title}</a></h3>
          <p style="font-size:13px;color:var(--wp--preset--color--ink-soft)">${s.excerpt || ''}</p>
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600"><a href="/servicios/${s.slug}/" style="color:var(--wp--preset--color--teal)">Conocer más →</a></p>
        </div>`
    )
    .join('\n');
  return `<section class="wp-block-group has-beige-background-color has-background" style="padding-top:60px;padding-right:36px;padding-bottom:60px;padding-left:36px">
  <div class="wp-block-columns" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:18px">
${cards}
  </div>
</section>`;
}

function renderPageWrap(page) {
  return `<main class="wp-block-group" style="max-width:1180px;margin-left:auto;margin-right:auto;padding:80px 36px 60px">
  <h1>${page.title}</h1>
${page.bodyHtml}
</main>`;
}

// ---------------------------------------------------------------------------
// Asset copy
// ---------------------------------------------------------------------------

async function copyAssets() {
  const pairs = [
    ['assets/css/tokens.css', 'assets/css/tokens.css'],
    ['assets/css/main.css', 'assets/css/main.css'],
    ['assets/js/whatsapp-contextual.js', 'assets/js/whatsapp-contextual.js'],
    ['assets/img/logo.png', 'assets/img/logo.png'],
  ];
  for (const [src, dest] of pairs) {
    await copyFile(path.join(THEME_DIR, src), path.join(OUT_DIR, dest));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Idempotent: blow away any prior build first.
  await rmDir(OUT_DIR);
  await ensureDir(OUT_DIR);

  // Load shared building blocks.
  const headerHtml = buildHeaderHtml();
  const footerHtml = await loadFooter();

  const patterns = {};
  for (const slug of PATTERN_SLUGS) {
    patterns[slug] = await loadPattern(slug);
  }

  const servicios = [];
  for (const slug of SERVICIO_SLUGS) {
    servicios.push(await loadServicio(slug));
  }

  const pages = {};
  for (const slug of PAGE_SLUGS) {
    pages[slug] = await loadPage(slug);
  }

  const written = [];

  // 1) Home.
  {
    const bodyHtml = [
      headerHtml,
      patterns['hero'],
      patterns['servicios-destacados'],
      patterns['pilares'],
      patterns['nosotros-teaser'],
      patterns['internacional-banner'],
      patterns['testimonios-placeholder'],
      patterns['blog-teaser'],
      patterns['cta-final'],
      footerHtml,
    ].join('\n');
    const html = htmlShell({
      title: 'La Dentistería | Odontología Integral en Medellín',
      description:
        'Clínica dental boutique en Centro Comercial Parque Fabricato, Medellín. Odontología integral para adultos.',
      bodyHtml,
    });
    const out = path.join(OUT_DIR, 'index.html');
    await writeFile(out, html);
    written.push('index.html');
  }

  // 2) Servicios hub.
  {
    const bodyHtml = [
      headerHtml,
      renderArchiveHero(),
      renderArchiveCards(servicios),
      patterns['cta-final'],
      footerHtml,
    ].join('\n');
    const html = htmlShell({
      title: 'Servicios | La Dentistería Medellín',
      description:
        'Conoce todas nuestras especialidades odontológicas en Centro Comercial Parque Fabricato.',
      bodyHtml,
    });
    const out = path.join(OUT_DIR, 'servicios', 'index.html');
    await writeFile(out, html);
    written.push('servicios/index.html');
  }

  // 3) Each servicio.
  for (const servicio of servicios) {
    const bodyHtml = [
      headerHtml,
      renderServicioHero(servicio),
      renderServicioContent(servicio),
      patterns['cta-final'],
      footerHtml,
    ].join('\n');
    const html = htmlShell({
      title:
        servicio.seo_title ||
        `${servicio.title} | La Dentistería`,
      description: servicio.seo_description || servicio.excerpt || '',
      bodyHtml,
    });
    const out = path.join(
      OUT_DIR,
      'servicios',
      servicio.slug,
      'index.html'
    );
    await writeFile(out, html);
    written.push(`servicios/${servicio.slug}/index.html`);
  }

  // 4) Each page (no cta-final injected — pages tend to close themselves).
  for (const slug of PAGE_SLUGS) {
    const page = pages[slug];
    const bodyHtml = [headerHtml, renderPageWrap(page), footerHtml].join('\n');
    const html = htmlShell({
      title: page.seo_title || `${page.title} | La Dentistería`,
      description: page.seo_description || page.excerpt || '',
      bodyHtml,
    });
    const out = path.join(OUT_DIR, slug, 'index.html');
    await writeFile(out, html);
    written.push(`${slug}/index.html`);
  }

  // 5) Assets.
  await copyAssets();

  // 6) Log.
  console.log(`✓ Rendered ${written.length} pages to preview-static/:`);
  for (const w of written) {
    console.log(`    ${w}`);
  }
  console.log('');
  console.log('  Preview locally:');
  console.log('    cd clients/la-dentisteria/preview-static');
  console.log('    npx serve -p 8000');
  console.log('    # Open http://localhost:8000');
  console.log('');
  console.log('  Deploy:');
  console.log(
    '    Drag preview-static/ folder to https://app.netlify.com/drop'
  );
}

main().catch((err) => {
  console.error('✗ Render failed:', err);
  process.exit(1);
});
