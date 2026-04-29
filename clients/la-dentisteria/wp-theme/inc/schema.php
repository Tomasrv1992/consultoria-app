<?php
/**
 * JSON-LD schema generation.
 * Outputs Dentist on home/contacto, MedicalProcedure on service pages.
 * Yoast handles WebSite/Organization basics; we add the medical-specific layer.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_head', function() {
    // is_page('contacto') matches by slug or title; we explicitly check slug
    // so renaming the title (e.g., "Contáctanos") doesn't silently drop schema.
    if ( is_front_page() || ( is_page() && get_post_field( 'post_name' ) === 'contacto' ) ) {
        echo ladent_schema_dentist();
    } elseif ( is_singular( 'servicio' ) ) {
        echo ladent_schema_medical_procedure();
    }
}, 20 );

function ladent_schema_dentist(): string {
    $data = [
        '@context'  => 'https://schema.org',
        '@type'     => 'Dentist',
        '@id'       => home_url( '/#dentist' ),
        'name'      => 'La Dentisteria',
        'url'       => home_url( '/' ),
        'telephone' => '+57-304-426-9079',
        'email'     => 'infoladentisteria@gmail.com',
        'address'   => [
            '@type'           => 'PostalAddress',
            'streetAddress'   => 'Carrera 50 # 38 A 185, Local 99300, Centro Comercial Parque Fabricato',
            'addressLocality' => 'Bello',
            'addressRegion'   => 'Antioquia',
            'postalCode'      => '051050',
            'addressCountry'  => 'CO',
        ],
        'geo' => [
            '@type'     => 'GeoCoordinates',
            'latitude'  => 6.3370,
            'longitude' => -75.5550,
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
        // V1: aggregateRating omitted intentionally — Schema.org requires real review counts.
        // V1.2 TODO: pull rating from Google Business Profile API once reviews exist.
        'priceRange'       => '$$',
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

    // Conditional: only emit image if file exists (prevents 404s in schema validators)
    $logo_path = LADENT_THEME_DIR . '/assets/img/logo.png';
    if ( file_exists( $logo_path ) ) {
        $data['image'] = LADENT_THEME_URI . '/assets/img/logo.png';
    }

    return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
}

function ladent_schema_medical_procedure(): string {
    $title       = get_the_title();
    // Strip tags AND escape closing </script> sequences (defense-in-depth)
    $description = str_replace( '</', '<\/', wp_strip_all_tags( get_the_excerpt() ) );

    $data = [
        '@context'         => 'https://schema.org',
        '@type'            => 'MedicalProcedure',
        '@id'              => get_permalink() . '#procedure',
        'name'             => $title,
        'description'      => $description,
        'url'              => get_permalink(),
        'medicalSpecialty' => 'Dentistry',
        'performedBy'      => [
            '@type' => 'Dentist',
            '@id'   => home_url( '/#dentist' ),
            'name'  => 'La Dentisteria',
        ],
    ];
    return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
}
