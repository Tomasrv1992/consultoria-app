<?php
/**
 * Asset enqueue logic.
 * Loads CSS, JS, and Google Fonts (parallel, with preconnect hints).
 *
 * Font strategy: dev uses Google Fonts CDN (parallel-fetched, preconnected).
 * Production swap to self-hosted woff2: download fonts to assets/fonts/ per README,
 * remove the 'ladent-google-fonts' enqueue, restore fontFace arrays in theme.json.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_enqueue_scripts', function() {

    // Google Fonts (parallel fetch — better than @import in CSS)
    wp_enqueue_style(
        'ladent-google-fonts',
        'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter+Tight:wght@400..700&display=swap',
        [],
        null
    );

    wp_enqueue_style(
        'ladent-tokens',
        LADENT_THEME_URI . '/assets/css/tokens.css',
        [ 'ladent-google-fonts' ],
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

// Preconnect hints for Google Fonts (saves DNS+TLS round trips)
add_action( 'wp_head', function() {
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
}, 1 );
