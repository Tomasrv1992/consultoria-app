<?php
/**
 * SEO helpers: hreflang tags + custom robots.txt.
 *
 * V1 emits es-co + x-default. V1.2 will add EN alternates when /en/ exists.
 * Yoast handles canonical URLs; we layer hreflang on top via wp_head.
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

/**
 * Resolves the canonical URL for hreflang emission.
 * Pages, posts, services → permalink. Home → home_url. Servicios archive → /servicios/.
 * Anything else → current request URL.
 */
function ladent_canonical_url(): string {
    if ( is_singular() ) {
        return get_permalink();
    }
    if ( is_home() || is_front_page() ) {
        return home_url( '/' );
    }
    if ( is_post_type_archive( 'servicio' ) ) {
        return home_url( '/servicios/' );
    }
    return home_url( add_query_arg( null, null ) );
}

/**
 * Customize robots.txt with explicit disallows and sitemap declaration.
 * WordPress applies this filter when serving /robots.txt (only if not blocked by privacy setting).
 */
add_filter( 'robots_txt', function( $output, $public ) {
    if ( ! $public ) return $output;

    $custom  = "User-agent: *\n";
    $custom .= "Disallow: /wp-admin/\n";
    $custom .= "Disallow: /agendar-cita/gracias/\n";
    $custom .= "Disallow: /*?utm_*\n";  // prevent UTM-tagged duplicates from being indexed
    $custom .= "Allow: /\n";
    $custom .= "Sitemap: " . home_url( '/sitemap_index.xml' ) . "\n";

    return $custom;
}, 10, 2 );
