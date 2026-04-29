<?php
/**
 * JSON-LD schema generation.
 * Outputs Dentist on home/contacto, MedicalProcedure on service pages.
 * Yoast handles WebSite/Organization basics; we add the medical-specific layer.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'wp_head', function() {
    if ( is_front_page() || is_page( 'contacto' ) ) {
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
        'image'     => get_template_directory_uri() . '/assets/img/logo.png',
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
            'latitude'  => 6.3399,
            'longitude' => -75.5566,
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
    return '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
}

function ladent_schema_medical_procedure(): string {
    $title       = get_the_title();
    $description = get_the_excerpt();

    $data = [
        '@context'         => 'https://schema.org',
        '@type'            => 'MedicalProcedure',
        '@id'              => get_permalink() . '#procedure',
        'name'             => $title,
        'description'      => wp_strip_all_tags( $description ),
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
