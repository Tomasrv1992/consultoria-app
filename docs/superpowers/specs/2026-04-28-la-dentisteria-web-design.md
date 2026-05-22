# Spec — Sitio web de La Dentisteria

Fecha: 2026-04-28
Cliente: La Dentisteria (clínica dental boutique, Centro Comercial Parque Fabricato, Bello/Medellín)
Dominio: ladentisteriacv.com
Mercado primario: adultos en Medellín y Valle de Aburrá
Mercado secundario: turismo dental EE.UU./Canadá

Investigación SEO de referencia: [docs/superpowers/research/2026-04-28-la-dentisteria-seo.md](../research/2026-04-28-la-dentisteria-seo.md)

---

## 1. Objetivo

Construir el sitio web público de La Dentisteria como herramienta de captación. El sitio debe:

- Posicionar la clínica orgánicamente para los 3-4 servicios prioritarios en Google Medellín
- Generar leads cualificados vía WhatsApp y formulario de agendamiento
- Captar tráfico de turismo dental en inglés
- Permitir al cliente actualizar contenido por su cuenta (blog, textos, fotos)

No-objetivos (fuera de alcance):
- E-commerce, pagos online, área de pacientes con sesión
- Agendamiento online en tiempo real con calendario sincronizado (en V2 se evaluará)
- Mostrar precios públicos
- Mencionar a Clara Villa o "Clara Villa Diseño de Sonrisa" en copy del sitio
- Reclamar tenure de "30+ años" — La Dentisteria como marca tiene máximo 3 años

## 2. Decisiones de marca y posicionamiento

| Decisión | Valor |
| --- | --- |
| Nombre de marca | La Dentisteria |
| Logo | Logo provisto tal cual (incluye tag "by ClaraVilla") |
| Posicionamiento | Odontología integral para adultos · "lujo a precio justo" |
| Headline hero | "Una sonrisa que cuenta tu historia." |
| Tono | Editorial, cálido, sereno; honesto sin claims temporales |
| Idioma primario | Español (es-CO) |
| Idioma secundario | Inglés (en, para turismo dental) |

**Pilares de confianza confirmados** (los únicos que se usan en copy):
1. Equipo de especialistas (sin nombres de odontólogos individuales)
2. Ubicación (Centro Comercial Parque Fabricato, fácil acceso)
3. Atención personalizada
4. Cobertura integral (todas las especialidades bajo un mismo techo)
5. Testimonios (a futuro, cuando existan con consentimiento)

**Pilares descartados explícitamente:** tecnología/equipos específicos, certificaciones, antes/después, claims de tenure, página de equipo individual.

## 3. Identidad visual

### 3.1 Paleta
| Token | Hex | Uso |
| --- | --- | --- |
| `--beige` | `#F1E8DA` | Fondo dominante |
| `--beige-deep` | `#E8DCC4` | Fondo de secciones alternas (pilares, blog) |
| `--teal` | `#0E6B6B` | CTAs, acentos, curva-sonrisa, números |
| `--teal-deep` | `#114848` | Sección Pacientes Internacionales (banner) |
| `--ink` | `#1a1a1a` | Tipografía principal, footer |
| `--ink-soft` | `#5a5a5a` | Texto secundario, ledes |
| `--line` | `#d8ccb6` | Bordes sutiles entre cards y secciones |

Acento dorado opcional (`#E8C9A0`) reservado para sección internacional como guiño cálido.

### 3.2 Tipografía
- **Display/headlines:** DM Serif Display (Google Fonts) — pesos 400 normal y 400 italic
- **Body/UI:** Inter Tight (Google Fonts) — pesos 400, 500, 600, 700

Patrones tipográficos:
- H1 hero: 76px desktop / 44px mobile, line-height 1.0, italic en el segundo verso
- H2 secciones: 44px desktop / 28px mobile, italic en remates
- Section labels: Inter Tight 11px uppercase letterspacing 0.2em, color teal
- Body: Inter Tight 13-16px

### 3.3 Sistema de UI
- Botón primario: pill (border-radius 999px), teal sólido, texto beige, padding 14×28
- Botón secundario: pill, transparente, borde y texto ink
- Cards de servicios: fondo blanco, borde `--line`, radius 8px, hover translateY -3px
- Curva-sonrisa: 110×18px, border-bottom 2px teal, radius 50% — usar como elemento decorativo en hero y debajo de algunos H2

### 3.4 Logo
Usar logo provisto en PNG (`Logo La Dentistería.png`). El tag "by ClaraVilla" permanece visible. Para el footer, usar la misma versión. Para el isotipo (favicon, redes), usar `Isotipo Dentisteria.png` (D circular teal).

## 4. Arquitectura de información

### 4.1 Sitemap

```
/                                          (home)
/servicios/                                (hub listado)
/servicios/ortodoncia-medellin/            ⭐ top 3, slug con ciudad
/servicios/odontologia-estetica-medellin/  ⭐
/servicios/cirugia-maxilofacial-medellin/  ⭐
/servicios/implantes-dentales-medellin/    ⭐ ticket alto, slug con ciudad
/servicios/odontologia-general/
/servicios/periodoncia/
/servicios/endodoncia/
/servicios/rehabilitacion-oral/
/servicios/blanqueamiento-dental/
/nosotros/
/pacientes-internacionales/
/blog/
/blog/[slug-articulo]/
/contacto/
/agendar-cita/
/en/                                       (espejo en inglés con sitemap propio)
```

Decisión: NO crear `/equipo/` ni páginas individuales por especialista (Tomás lo descartó).

### 4.2 Mapeo URL → keyword principal

| URL | Keyword primario | Volumen mensual estimado |
| --- | --- | --- |
| `/` | "La Dentisteria Medellín" (branded) | — |
| `/servicios/ortodoncia-medellin/` | ortodoncia Medellín | 2,400-3,600 |
| `/servicios/odontologia-estetica-medellin/` | diseño de sonrisa Medellín | 1,600-2,400 |
| `/servicios/cirugia-maxilofacial-medellin/` | cirugía maxilofacial Medellín | 390-590 |
| `/servicios/implantes-dentales-medellin/` | implantes dentales Medellín | 1,300-1,900 |
| `/servicios/blanqueamiento-dental/` | blanqueamiento dental Medellín | 720-1,000 |
| `/servicios/endodoncia/` | endodoncia Medellín | 200-400 |
| `/pacientes-internacionales/` | dental tourism Medellin | — |
| `/en/` | dental tourism Colombia | 1,900-2,900 |

## 5. Diseño del home (aprobado)

Secciones en orden de scroll:

1. **Nav sticky** — logo izquierda, links nav derecha, CTA "Agendar cita" persistente
2. **Hero** — H1 storytelling + curva-sonrisa + sub uppercase + 2 CTAs (primario "Agenda tu valoración" + secundario "Conoce nuestros servicios")
3. **Servicios destacados** — 3 cards (Ortodoncia · Diseño de Sonrisa · Cirugía Maxilofacial) con número grande italic, título, copy 2 líneas, "Conocer más →". Botón "Ver todos los servicios" abajo
4. **Pilares** — fondo `--beige-deep`. 4 columnas con ícono geométrico (◆ ◐ ◇ ◯) + título + 1 línea: Equipo especialista, Ubicación céntrica, Atención personalizada, Cobertura integral
5. **Sobre nosotros** — split 2 columnas: foto del consultorio + texto "Conocemos a Medellín. Conocemos sus sonrisas." (sin años, mensaje "clínica boutique para adultos") + CTA secundario
6. **Pacientes Internacionales** — banner full-width fondo `--teal-deep` con texto en inglés, accent dorado en label, CTA primario invertido (beige sobre teal)
7. **Testimonios** — 3 cards placeholder honestos: "Pronto compartiremos historias…", borde dashed para indicar estado pendiente. Cuando existan testimonios reales, reemplazar
8. **Blog teaser** — fondo `--beige-deep`. 3 cards con thumbnail (gradient placeholder), meta uppercase teal, título, copy 1 línea. Cada card link a artículo
9. **CTA final** — fondo `--beige`, headline grande "Una valoración inicial cambia todo.", lede, 3 botones-canal (WhatsApp verde, Llamar, Email)
10. **Footer** — fondo `--ink`, 4 columnas: brand+tag+descripción / Servicios / Empresa / Contacto NAP completo. Bottom: copyright + privacy
11. **Botón WhatsApp** — flotante bottom-right, círculo verde 56px, sticky, en todas las páginas

### Comportamiento mobile (no diseñado en mockup pero requerido)
- Nav colapsa a hamburger; CTA "Agendar cita" pasa a botón fijo bottom o se mantiene en menú
- Hero H1 reduce a 44px
- Grids de 3-4 columnas pasan a 1 columna (servicios, blog) o 2×2 (pilares)
- Sobre nosotros pasa a stacking vertical con foto arriba
- Botón WhatsApp se mantiene visible

## 6. WhatsApp contextual

Botón flotante presente en todas las páginas. Mensaje preset cambia según ruta:

| Ruta | Mensaje preset |
| --- | --- |
| `/` y secciones genéricas | "Hola, me gustaría agendar una valoración en La Dentistería." |
| `/servicios/ortodoncia-medellin/` | "Hola, quiero información sobre ortodoncia." |
| `/servicios/odontologia-estetica-medellin/` | "Hola, quiero información sobre diseño de sonrisa." |
| `/servicios/cirugia-maxilofacial-medellin/` | "Hola, quiero información sobre cirugía maxilofacial." |
| `/servicios/implantes-dentales-medellin/` | "Hola, quiero información sobre implantes dentales." |
| `/servicios/[otro]/` | "Hola, quiero información sobre [nombre del servicio]." |
| `/pacientes-internacionales/` y todo `/en/` | "Hi, I'm interested in dental treatment at La Dentistería." |

Implementación: JS lee URL, mapea a mensaje, construye `wa.me/573044269079?text=<encoded>`. Número: **+57 304 426 9079**.

## 7. SEO técnico (no negociable desde el día 1)

Las recomendaciones detalladas viven en el informe de SEO. Decisiones clave que el sitio DEBE implementar:

- **Schema JSON-LD:**
  - Home y `/contacto/`: schema `Dentist` (subtipo de `MedicalBusiness`) con `address`, `geo`, `openingHoursSpecification`, `priceRange`, `medicalSpecialty`, `availableService`, `aggregateRating` (cuando haya reviews)
  - Cada `/servicios/[slug]/`: schema `MedicalProcedure` + `Service` anidado dentro de `Dentist`
  - Cada artículo de blog: `MedicalWebPage` o `Article` con `author`
- **Hreflang** en todas las páginas con tags `es-co`, `en`, `x-default` (apuntando a versión española)
- **Canonical** self-canonical en cada página
- **Sitemap segmentado:** `sitemap-pages.xml`, `sitemap-servicios.xml`, `sitemap-blog.xml`, indexados desde `sitemap_index.xml`
- **robots.txt:** disallow `/wp-admin/`, `/agendar-cita/gracias/`, parámetros UTM; allow resto; declarar sitemap
- **Title pattern:** `[Servicio] en Medellín | [Beneficio diferencial] | La Dentisteria` (50-60 chars)
- **Meta description pattern:** `[Servicio + ciudad]. [Diferencial]. [CTA].` (150-155 chars)
- **H1 pattern páginas servicio:** keyword principal + ciudad (ej. "Ortodoncia en Medellín")
- **Alt text imágenes:** descriptivo + keyword cuando aplique
- **Images:** WebP, lazy-load, dimensiones explícitas, srcset
- **Core Web Vitals:** target LCP <2.5s, CLS <0.1, INP <200ms en mobile

## 8. Tech stack y entrega

**Plataforma:** WordPress sobre cPanel (hosting ya provisionado en `ladentisteriacv.com`).

Razón: el cliente editará contenido por su cuenta (blog, textos, fotos). WordPress es el estándar de la industria odontológica colombiana y tiene panel familiar para asistentes administrativos.

**Decisiones de implementación pendientes** (se cierran en el plan):
- Tema: custom theme vs page builder vs block theme (FSE) — afecta editabilidad y rendimiento
- Plugin de SEO: Yoast vs Rank Math
- Plugin de schema: incluido en SEO plugin vs Schema Pro vs JSON-LD manual
- Plugin de multilingüe: Polylang (gratis, suficiente) vs WPML (premium)
- Plugin de formularios: Gravity Forms vs Fluent Forms vs WPForms
- Caché/performance: WP Rocket vs LiteSpeed Cache (depende del servidor)
- Botón WhatsApp: plugin existente (Click to Chat, Floating Chat) vs componente custom (recomendado por flexibilidad contextual)

**Despliegue:** Tomás solicita acompañamiento para el despliegue final a cPanel. Plan tentativo:
1. Desarrollo local (Local by Flywheel o XAMPP)
2. Configuración WP + tema + plugins
3. Migración a cPanel vía Softaculous (instalación limpia) + import de contenido (export/import WP)
4. Configuración SSL (Let's Encrypt en cPanel)
5. Verificación NAP, schema, sitemap, GSC, GBP

## 9. Quick wins externos al sitio (paralelos al desarrollo)

Acciones que el cliente debe ejecutar en paralelo, fuera del scope de "construir el sitio" pero críticas para el éxito:

1. Reclamar y optimizar Google Business Profile (categoría primaria "Dentista", 25+ fotos)
2. Listar/optimizar perfil en Doctoralia.co y TopDoctors.com.co con NAP consistente
3. Auditar NAP en Páginas Amarillas, Facebook, Instagram, Waze, Apple Maps
4. Registrar dominios defensivos `ladentisteria.com.co` y `ladentisteria.co` con 301 al principal
5. Diseñar proceso de solicitud de reseñas post-tratamiento (SMS 24-48h con link a GBP)

## 10. Métricas de éxito (T1, primeros 90 días post-lanzamiento)

- Top 20 orgánico para "ortodoncia Medellín" y "diseño de sonrisa Medellín"
- Top 3 en pack local de Maps para Bello/Norte de Medellín
- 40+ reviews nuevas en GBP, rating ≥ 4.7
- 200-500 visitas orgánicas/mes
- 5-10 leads orgánicos cualificados/mes (WhatsApp + formulario)
- Core Web Vitals "Good" en mobile (Search Console)

## 11. Activos que aporta el cliente

Confirmados disponibles en `C:\Users\TOMAS\Desktop\La Dentisteria\`:
- `Logo La Dentistería.png` (logo principal)
- `Isotipo Dentisteria.png` (isotipo D circular)
- `Presentación Manual de Marca Minimalista Beige.pdf` (manual de marca)
- 6 fotos profesionales en `FOTOS/` (DSC0xxxx.jpg)
- `Creacion de pagina web.docx` (brief con copy por servicio)
- `INFORMACION GENERAL LA DENTISTERIA.docx` (datos operativos + cPanel)

Activos pendientes de aportar:
- Foto del consultorio en alta (idealmente exterior + interior + sala de espera)
- Foto neutra del equipo (sin nombres, ambiental)
- Logo en SVG (si existe; si no, vectorizamos desde PNG)
- Texto definitivo de "Sobre nosotros" sin referencias a Clara Villa ni "30 años"
- Lista definitiva de especialidades con copy revisado (sin Clara Villa)

## 12. Decisiones cerradas (no reabrir sin razón fuerte)

- ✅ Marca: "La Dentisteria", separada de Clara Villa
- ✅ Logo: tal cual con "by ClaraVilla"
- ✅ Visual direction: Editorial Minimalista
- ✅ Tipografía: DM Serif Display + Inter Tight
- ✅ Arquitectura: multi-página con `/en/` espejo
- ✅ Sin página `/equipo/`
- ✅ Slugs `-medellin` solo en top 4 servicios estrella
- ✅ Tech stack: WordPress sobre cPanel
- ✅ Dominio: `ladentisteriacv.com` (sin migración)
- ✅ WhatsApp: contextual por ruta, número 304 426 9079
- ✅ Hero headline: "Una sonrisa que cuenta tu historia."
- ✅ Pilares de confianza: equipo, ubicación, atención, cobertura, testimonios
- ✅ Sin claims temporales de tenure
