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

// Variant: 'beige' (default) or 'dark'.
const VARIANT = process.env.VARIANT || 'beige';
const FALLBACK_FILE =
  VARIANT === 'dark' ? 'wp-fallback-dark.css' : 'wp-fallback.css';
const OUT_DIR = path.join(
  ROOT,
  VARIANT === 'dark' ? 'preview-static-dark' : 'preview-static'
);

const SERVICIO_SLUGS = [
  'ortodoncia-medellin',
  'odontologia-estetica-medellin',
  'cirugia-maxilofacial-medellin',
  'implantes-dentales-medellin',
];

const PAGE_SLUGS = ['nosotros', 'contacto', 'agendar-cita'];

// Secondary services not yet rendered with full pages (V1.1) — listed in the
// archive hub so visitors see the complete coverage offering.
const SECONDARY_SERVICES = [
  { name: 'Odontología General', desc: 'Limpieza, controles, profilaxis y prevención.' },
  { name: 'Periodoncia', desc: 'Tratamiento de encías y enfermedad periodontal.' },
  { name: 'Endodoncia', desc: 'Tratamientos de conducto con tecnología de precisión.' },
  { name: 'Rehabilitación Oral', desc: 'Coronas, puentes y reconstrucciones complejas.' },
  { name: 'Blanqueamiento Dental', desc: 'En consultorio y supervisado en casa.' },
];

// Stub pages referenced by patterns (blog teaser, internacional banner) but
// not part of V1 scope. Render minimal "próximamente" pages so menu/CTA
// clicks don't 404.
const STUB_PAGES = [
  {
    slug: 'blog',
    title: 'Blog',
    seo_title: 'Blog | La Dentistería Medellín',
    seo_description:
      'Próximamente: artículos sobre cuidado dental, tratamientos y bienestar oral.',
    body: '<p>Estamos preparando contenido sobre cuidado dental, tratamientos y bienestar oral.</p><p>Mientras tanto, si tenés una pregunta específica, escribinos por WhatsApp y te orientamos directamente.</p>',
  },
  {
    slug: 'pacientes-internacionales',
    title: 'International Patients',
    seo_title:
      'International Patients | Dental Care in Medellín | La Dentistería',
    seo_description:
      'Coming soon: dedicated information for international patients seeking dental care in Medellín.',
    body: '<p><strong>Coming soon.</strong> We are preparing detailed information for international patients including treatment timelines, cost comparisons, logistics, and English-speaking specialists.</p><p>If you are planning a dental visit to Medellín, write to us on WhatsApp and we will help you plan ahead.</p>',
  },
];

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
// For the static preview we hand-write the equivalent HTML, using the
// real logo PNG. The logo file already includes "LA DENTISTERÍA" wordmark
// + curve + "by ClaraVilla" tag, so no separate text is needed.
//
// Dark variant: invert the logo with a CSS filter so it reads on dark bg.
function buildHeaderHtml() {
  const logoFilter =
    VARIANT === 'dark' ? 'filter:invert(1) hue-rotate(180deg);' : '';
  return `<header class="wp-block-group site-header has-beige-background-color has-background" style="padding-top:18px;padding-right:36px;padding-bottom:18px;padding-left:36px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;border-bottom:1px solid var(--wp--preset--color--line)">
  <a href="/" class="site-logo" style="display:flex;align-items:center;text-decoration:none">
    <img src="/assets/img/logo.png" alt="La Dentistería" style="height:48px;width:auto;display:block;${logoFilter}">
  </a>
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
  <link rel="stylesheet" href="/assets/css/wp-fallback.css">
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
  <div class="wp-block-columns servicios-grid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:18px">
${cards}
  </div>
</section>`;
}

function renderSecondaryServicesList() {
  const items = SECONDARY_SERVICES.map(
    (s) => `      <div class="secondary-service" style="padding:22px 0;border-top:1px solid var(--wp--preset--color--line)">
        <h3 style="font-size:18px;margin:0 0 4px">${s.name}</h3>
        <p style="font-size:13px;color:var(--wp--preset--color--ink-soft);margin:0">${s.desc}</p>
      </div>`
  ).join('\n');
  return `<section class="wp-block-group has-beige-deep-background-color has-background" style="padding-top:80px;padding-right:36px;padding-bottom:80px;padding-left:36px">
  <p class="section-label">Más especialidades</p>
  <h2 style="margin-bottom:32px">Cobertura integral<br><em>bajo un mismo techo.</em></h2>
  <div style="max-width:760px;margin-left:auto;margin-right:auto">
${items}
  </div>
  <p style="text-align:center;margin-top:40px;font-size:13px;color:var(--wp--preset--color--ink-soft)">¿Buscás algo específico? Escribinos y te orientamos.</p>
</section>`;
}

function renderPageWrap(page) {
  // For agendar-cita, inject a "preview mode" notice above the form section
  // so Clara doesn't expect the form to actually submit during preview.
  const previewNotice =
    page.slug === 'agendar-cita'
      ? `  <aside style="background:var(--wp--preset--color--beige-deep);border-left:3px solid var(--wp--preset--color--teal);padding:18px 22px;margin:0 0 32px;border-radius:0 6px 6px 0">
    <p style="margin:0;font-size:13px;color:var(--wp--preset--color--ink-soft)"><strong style="color:var(--wp--preset--color--ink)">Vista previa.</strong> El formulario aún no envía mensajes — escribinos directamente por <a href="https://wa.me/573044269079?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20valoraci%C3%B3n%20en%20La%20Dentister%C3%ADa." target="_blank" rel="noopener noreferrer" style="font-weight:600;color:var(--wp--preset--color--teal)">WhatsApp</a> o llamando al <a href="tel:+573044269079" style="font-weight:600;color:var(--wp--preset--color--teal)">+57 304 426 9079</a>.</p>
  </aside>\n`
      : '';
  return `<main class="wp-block-group" style="max-width:1180px;margin-left:auto;margin-right:auto;padding:80px 36px 60px">
  <h1>${page.title}</h1>
${previewNotice}${page.bodyHtml}
</main>`;
}

function renderStubPage(stub) {
  return `<main class="wp-block-group" style="max-width:760px;margin-left:auto;margin-right:auto;padding:140px 36px 100px;text-align:center">
  <p class="section-label">${stub.slug === 'blog' ? 'Blog' : 'International'}</p>
  <h1 style="margin-bottom:24px">${stub.title}</h1>
  <div class="smile-curve" style="margin:0 auto 32px"></div>
  <div style="font-size:16px;color:var(--wp--preset--color--ink-soft);max-width:560px;margin-left:auto;margin-right:auto">${stub.body}</div>
  <div style="margin-top:48px"><a href="https://wa.me/573044269079" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:var(--wp--preset--color--teal);color:var(--wp--preset--color--beige);padding:14px 28px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none">Escríbenos por WhatsApp</a></div>
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
    ['assets/img/consultorio.jpg', 'assets/img/consultorio.jpg'],
  ];
  for (const [src, dest] of pairs) {
    await copyFile(path.join(THEME_DIR, src), path.join(OUT_DIR, dest));
  }
  // wp-fallback.css lives next to this script (preview-only shim, not part of the WP theme).
  // The variant determines which file is loaded; both end up at the same destination
  // path (/assets/css/wp-fallback.css) so the htmlShell <link> tag is variant-agnostic.
  await copyFile(
    path.join(__dirname, FALLBACK_FILE),
    path.join(OUT_DIR, 'assets/css/wp-fallback.css')
  );
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

  // 2) Servicios hub (4 star services as cards + 5 secondary as list).
  {
    const bodyHtml = [
      headerHtml,
      renderArchiveHero(),
      renderArchiveCards(servicios),
      renderSecondaryServicesList(),
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
    page.slug = slug;
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

  // 4.5) Stub pages — /blog/ and /pacientes-internacionales/ are linked from
  // patterns (blog teaser, internacional banner) but are out of V1 scope.
  // Render minimal "próximamente" pages so visitors don't hit 404s.
  for (const stub of STUB_PAGES) {
    const bodyHtml = [headerHtml, renderStubPage(stub), footerHtml].join('\n');
    const html = htmlShell({
      title: stub.seo_title,
      description: stub.seo_description,
      bodyHtml,
    });
    const out = path.join(OUT_DIR, stub.slug, 'index.html');
    await writeFile(out, html);
    written.push(`${stub.slug}/index.html`);
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
