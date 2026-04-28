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
