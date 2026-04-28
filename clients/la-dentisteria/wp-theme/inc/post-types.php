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
            'name'               => 'Servicios',
            'singular_name'      => 'Servicio',
            'add_new_item'       => 'Agregar nuevo servicio',
            'edit_item'          => 'Editar servicio',
            'new_item'           => 'Nuevo servicio',
            'view_item'          => 'Ver servicio',
            'search_items'       => 'Buscar servicios',
            'not_found'          => 'No se encontraron servicios',
            'not_found_in_trash' => 'No hay servicios en la papelera',
            'all_items'          => 'Todos los servicios',
            'menu_name'          => 'Servicios',
        ],
        'public'              => true,
        'show_in_menu'        => true,
        'show_in_rest'        => true,
        'has_archive'         => 'servicios',
        'rewrite'             => [ 'slug' => 'servicios', 'with_front' => false ],
        'menu_icon'           => 'dashicons-smiley',
        'supports'            => [ 'title', 'editor', 'thumbnail', 'excerpt', 'page-attributes', 'custom-fields' ],
        'menu_position'       => 5,
    ] );

} );
