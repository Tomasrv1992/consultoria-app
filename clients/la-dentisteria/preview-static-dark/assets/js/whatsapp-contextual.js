/**
 * Contextual WhatsApp button.
 * Reads URL slug, sets the button href with a route-specific preset message.
 * Phone: +57 304 426 9079 → wa.me/573044269079
 */

(function () {
  'use strict';

  const PHONE = '573044269079';

  const DEFAULT_ES = 'Hola, me gustaría agendar una valoración en La Dentistería.';
  const DEFAULT_EN = 'Hi, I\'m interested in dental treatment at La Dentistería.';

  const SERVICE_MESSAGES = {
    'ortodoncia-medellin':           'Hola, quiero información sobre ortodoncia.',
    'odontologia-estetica-medellin': 'Hola, quiero información sobre diseño de sonrisa.',
    'cirugia-maxilofacial-medellin': 'Hola, quiero información sobre cirugía maxilofacial.',
    'implantes-dentales-medellin':   'Hola, quiero información sobre implantes dentales.',
    'odontologia-general':           'Hola, quiero información sobre odontología general.',
    'periodoncia':                   'Hola, quiero información sobre periodoncia.',
    'endodoncia':                    'Hola, quiero información sobre endodoncia.',
    'rehabilitacion-oral':           'Hola, quiero información sobre rehabilitación oral.',
    'blanqueamiento-dental':         'Hola, quiero información sobre blanqueamiento dental.',
  };

  function buildMessage() {
    const path = window.location.pathname;

    // English routes (per spec §6: /pacientes-internacionales/ is targeted at
    // English-speaking dental tourism visitors, even though the page title is Spanish).
    if (path.startsWith('/en/') || path.includes('/pacientes-internacionales/')) {
      return DEFAULT_EN;
    }

    // Service routes
    const serviceMatch = path.match(/\/servicios\/([^\/]+)/);
    if (serviceMatch && SERVICE_MESSAGES[serviceMatch[1]]) {
      return SERVICE_MESSAGES[serviceMatch[1]];
    }

    return DEFAULT_ES;
  }

  function createButton() {
    const message = encodeURIComponent(buildMessage());
    const href = `https://wa.me/${PHONE}?text=${message}`;

    const btn = document.createElement('a');
    btn.href = href;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'wa-float';
    btn.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    `;
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }
})();
