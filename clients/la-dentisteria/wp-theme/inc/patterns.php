<?php
/**
 * Block pattern category registration.
 * Patterns themselves live in /patterns/*.php (registered by WP automatically).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', function() {
    register_block_pattern_category( 'ladent', [ 'label' => 'La Dentisteria' ] );
} );
