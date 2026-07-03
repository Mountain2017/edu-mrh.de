/**
 * ==========================================================
 * edu-mrh.de – Basis-Bedienelemente (controls.js)
 * ==========================================================
 * Garantiert auf JEDER Seite – egal wie individuell sie gestaltet ist –
 * die Mindest-Bedienelemente: Zurück, Startseite und Impressum.
 *
 * Einbindung (eine Zeile, direkt vor </body> oder im <head> mit defer):
 *
 *   <script defer src="https://edu-mrh.de/controls.js"></script>
 *
 * Das Skript ist vollständig eigenständig (eigenes CSS, keine
 * Abhängigkeiten) und erkennt vorhandene Elemente: Hat die Seite bereits
 * einen Impressum-Link oder einen Übersicht-/Zurück-Button (z. B. weil sie
 * auf der Standard-Vorlage basiert), wird das jeweilige Element NICHT
 * doppelt eingefügt. Seiten mit vollständiger Standard-Navigation bleiben
 * also unverändert.
 *
 * Anpassung über data-Attribute am <script>-Tag (alle optional):
 *   data-back="…"       Ziel des Zurück-Buttons (Standard: Browser-Verlauf,
 *                       sonst übergeordneter Ordner)
 *   data-home="…"       Ziel des Startseiten-Buttons (Standard: Seitenwurzel)
 *   data-impressum="…"  Ziel des Impressum-Links
 *                       (Standard: https://edu-mrh.de/contribute.html#impressum)
 *   data-position="left" | "right"   Ecke unten links/rechts (Standard: left)
 */

(function () {
    'use strict';

    var script = document.currentScript || (function () {
        var s = document.getElementsByTagName('script');
        return s[s.length - 1];
    })();
    var cfg = (script && script.dataset) || {};

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    ready(function () {
        // ---- Vorhandene Bedienelemente erkennen -------------------------
        var links = document.querySelectorAll('a[href]');
        var hasImpressum = false;
        var hasBack = false;
        for (var i = 0; i < links.length; i++) {
            var href = (links[i].getAttribute('href') || '').toLowerCase();
            var text = (links[i].textContent || '').toLowerCase();
            if (href.indexOf('impressum') !== -1 || text.indexOf('impressum') !== -1) {
                hasImpressum = true;
            }
            if (text.indexOf('übersicht') !== -1 || text.indexOf('zurück') !== -1 ||
                links[i].hasAttribute('data-edu-back')) {
                hasBack = true;
            }
        }
        if (hasImpressum && hasBack) return; // Seite ist bereits vollständig

        // ---- Ziele bestimmen --------------------------------------------
        var impressumUrl = cfg.impressum || 'https://edu-mrh.de/contribute.html#impressum';
        var homeUrl = cfg.home ||
            (location.protocol === 'file:' ? null : location.origin + '/');

        function goBack() {
            if (cfg.back) {
                location.href = cfg.back;
                return;
            }
            var sameSiteReferrer = document.referrer &&
                document.referrer.indexOf(location.host) !== -1;
            if (sameSiteReferrer && history.length > 1) {
                history.back();
            } else {
                // übergeordneter Ordner als Rückfallebene
                var path = location.pathname.replace(/\/[^/]*$/, '/');
                location.href = path === location.pathname ? '../' : path;
            }
        }

        // ---- Eigenes, isoliertes Styling --------------------------------
        var style = document.createElement('style');
        style.textContent =
            '.edu-controls{position:fixed;bottom:14px;' +
            (cfg.position === 'right' ? 'right' : 'left') + ':14px;' +
            'z-index:99990;display:flex;gap:6px;font-family:system-ui,-apple-system,' +
            '"Segoe UI",Roboto,sans-serif;font-size:13px;line-height:1;}' +
            '.edu-controls a,.edu-controls button{display:inline-flex;align-items:center;' +
            'gap:5px;padding:8px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.15);' +
            'background:rgba(255,255,255,.92);color:#1f2937;text-decoration:none;' +
            'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);backdrop-filter:blur(4px);' +
            'font:inherit;transition:transform .15s ease,box-shadow .15s ease;}' +
            '.edu-controls a:hover,.edu-controls button:hover{transform:translateY(-1px);' +
            'box-shadow:0 4px 12px rgba(0,0,0,.2);background:#fff;}' +
            '@media print{.edu-controls{display:none;}}';
        document.head.appendChild(style);

        // ---- Elemente einfügen -------------------------------------------
        var bar = document.createElement('nav');
        bar.className = 'edu-controls';
        bar.setAttribute('aria-label', 'Basis-Navigation');

        if (!hasBack) {
            var back = document.createElement('button');
            back.type = 'button';
            back.innerHTML = '&#8592; Zurück';
            back.setAttribute('aria-label', 'Zurück zur vorherigen Seite');
            back.addEventListener('click', goBack);
            bar.appendChild(back);

            if (homeUrl) {
                var home = document.createElement('a');
                home.href = homeUrl;
                home.innerHTML = '&#127891;';
                home.title = 'Zur Startseite';
                home.setAttribute('aria-label', 'Zur Startseite');
                bar.appendChild(home);
            }
        }

        if (!hasImpressum) {
            var imp = document.createElement('a');
            imp.href = impressumUrl;
            imp.textContent = 'Impressum';
            bar.appendChild(imp);
        }

        document.body.appendChild(bar);
    });
})();
