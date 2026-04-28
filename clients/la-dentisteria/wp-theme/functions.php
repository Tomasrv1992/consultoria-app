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

// Register block pattern category (used by patterns added in Batch 2)
add_action( 'init', function() {
    register_block_pattern_category( 'ladent', [ 'label' => 'La Dentisteria' ] );
} );
