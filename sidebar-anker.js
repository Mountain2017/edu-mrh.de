/*
 * Sprungmarken in der Seitenleiste für Seiten mit normal scrollenden Abschnitten
 *
 * embed/script.js fängt jeden Klick auf ".sidebar-menu a" mit href="#…" ab und
 * springt nur zu Abschnitten mit der Klasse "content-section" (Tab-Modus). Auf
 * Seiten ohne solche Abschnitte (z. B. Stationsseiten) läuft der Klick ins Leere.
 * Dieses Skript übernimmt solche Klicks vorher (Capture-Phase) und scrollt zum Ziel.
 * Seiten im Tab-Modus bleiben unberührt.
 *
 * Einbinden direkt nach embed/script.js:
 *   <script defer src="/sidebar-anker.js"></script>
 */
(function () {
    'use strict';

    // Platz für die fixierte Navbar, damit Überschriften nicht darunter verschwinden
    document.documentElement.style.scrollPaddingTop = '80px';

    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('.sidebar-menu a[href^="#"], .js-nav-link[href^="#"]');
        if (!link) return;
        var id = decodeURIComponent(link.getAttribute('href').slice(1));
        var ziel = id && document.getElementById(id);
        if (!ziel || ziel.classList.contains('content-section')) return;   // Tab-Modus: embed/script.js übernimmt

        e.preventDefault();
        e.stopPropagation();
        ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.pushState) history.pushState(null, '', '#' + id);

        document.querySelectorAll('.sidebar-menu a').forEach(function (a) {
            a.classList.toggle('active', a === link);
        });
        // Auf dem Handy die Seitenleiste nach dem Sprung schließen
        var sidebar = document.querySelector('.sidebar');
        if (sidebar && window.matchMedia('(max-width: 768px)').matches) {
            sidebar.classList.remove('active', 'open');
        }
    }, true);
})();
