<?php
/**
 * Title: Hero — Storytelling
 * Slug: ladentisteria/hero
 * Categories: ladent
 * Description: Hero section with headline, smile curve, subtitle, dual CTAs.
 */
?>
<!-- wp:group {"tagName":"section","className":"hero","style":{"spacing":{"padding":{"top":"110px","bottom":"100px","left":"36px","right":"36px"}}},"backgroundColor":"beige","layout":{"type":"constrained"}} -->
<section class="wp-block-group hero has-beige-background-color has-background" style="padding-top:110px;padding-right:36px;padding-bottom:100px;padding-left:36px">

  <!-- wp:heading {"level":1,"textAlign":"center","style":{"typography":{"fontSize":"clamp(44px, 6vw, 76px)","lineHeight":"1.0","letterSpacing":"-0.02em","fontWeight":"400"}}} -->
  <h1 class="has-text-align-center" style="font-size:clamp(44px, 6vw, 76px);font-weight:400;letter-spacing:-0.02em;line-height:1.0">Una sonrisa<br><em>que cuenta tu historia.</em></h1>
  <!-- /wp:heading -->

  <!-- wp:html -->
  <div class="smile-curve"></div>
  <!-- /wp:html -->

  <!-- wp:paragraph {"align":"center","className":"hero-sub","style":{"typography":{"fontSize":"13px","textTransform":"uppercase","letterSpacing":"0.18em","fontWeight":"500"},"color":{"text":"var:preset|color|ink-soft"},"spacing":{"margin":{"bottom":"36px"}}}} -->
  <p class="has-text-align-center hero-sub" style="margin-bottom:36px;font-size:13px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase">Odontología integral · Parque Fabricato · Medellín</p>
  <!-- /wp:paragraph -->

  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button {"className":"btn-primary"} -->
    <div class="wp-block-button btn-primary"><a class="wp-block-button__link wp-element-button" href="/agendar-cita/">Agenda tu valoración</a></div>
    <!-- /wp:button -->
    <!-- wp:button {"className":"btn-secondary","style":{"color":{"background":"transparent","text":"var:preset|color|ink"},"border":{"width":"1px","color":"var:preset|color|ink"}}} -->
    <div class="wp-block-button btn-secondary"><a class="wp-block-button__link wp-element-button" href="/servicios/" style="border-color:var(--wp--preset--color--ink);border-width:1px;color:var(--wp--preset--color--ink);background:transparent">Conoce nuestros servicios</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->

</section>
<!-- /wp:group -->
