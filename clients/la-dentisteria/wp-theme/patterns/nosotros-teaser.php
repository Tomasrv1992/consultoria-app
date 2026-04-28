<?php
/**
 * Title: Nosotros teaser
 * Slug: ladentisteria/nosotros-teaser
 * Categories: ladent
 * Description: 2-column split: photo placeholder + text intro about the clinic.
 */
?>
<!-- wp:group {"tagName":"section","className":"nosotros-section","style":{"spacing":{"padding":{"top":"90px","right":"36px","bottom":"90px","left":"36px"}}},"backgroundColor":"beige","layout":{"type":"constrained"}} -->
<section class="wp-block-group nosotros-section has-beige-background-color has-background" style="padding:90px 36px">

  <!-- wp:columns {"verticalAlignment":"center","style":{"spacing":{"blockGap":{"top":"60px","left":"60px"}}}} -->
  <div class="wp-block-columns are-vertically-aligned-center">

    <!-- wp:column {"verticalAlignment":"center"} -->
    <div class="wp-block-column is-vertically-aligned-center">
      <!-- wp:html -->
      <div class="nosotros-photo" aria-label="Foto del consultorio (placeholder)"></div>
      <!-- /wp:html -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"verticalAlignment":"center"} -->
    <div class="wp-block-column is-vertically-aligned-center">
      <!-- wp:paragraph {"className":"section-label"} -->
      <p class="section-label">Sobre nosotros</p>
      <!-- /wp:paragraph -->
      <!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"clamp(28px, 4vw, 40px)"}}} -->
      <h2 style="font-size:clamp(28px, 4vw, 40px)">Conocemos a Medellín.<br><em>Conocemos sus sonrisas.</em></h2>
      <!-- /wp:heading -->
      <!-- wp:paragraph {"style":{"typography":{"fontSize":"15px","lineHeight":"1.7"},"color":{"text":"var:preset|color|ink-soft"},"spacing":{"margin":{"top":"18px","bottom":"28px"}}}} -->
      <p style="margin-top:18px;margin-bottom:28px;font-size:15px;line-height:1.7;color:var(--wp--preset--color--ink-soft)">La Dentistería nace para que la odontología deje de sentirse fría. Somos una clínica boutique en Parque Fabricato donde cada paciente recibe tiempo, escucha y un plan a medida. Sin afán. Sin lenguaje técnico vacío. Sin presión.</p>
      <!-- /wp:paragraph -->
      <!-- wp:buttons -->
      <div class="wp-block-buttons">
        <!-- wp:button {"className":"btn-secondary","style":{"color":{"background":"transparent","text":"var:preset|color|ink"},"border":{"width":"1px","color":"var:preset|color|ink"}}} -->
        <div class="wp-block-button btn-secondary"><a class="wp-block-button__link wp-element-button" href="/nosotros/" style="border-color:var(--wp--preset--color--ink);border-width:1px;color:var(--wp--preset--color--ink);background:transparent">Conoce nuestra clínica</a></div>
        <!-- /wp:button -->
      </div>
      <!-- /wp:buttons -->
    </div>
    <!-- /wp:column -->

  </div>
  <!-- /wp:columns -->

</section>
<!-- /wp:group -->
