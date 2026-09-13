/* ==========================================================================
   Algorithmik mit Snap! (Informatik 11, spätbeginnend) – gemeinsame Konfiguration
   --------------------------------------------------------------------------
   Wird von allen Seiten des Ordners eingebunden. Enthält:
   - die Adresse der selbst gehosteten Snap!-Umgebung (Workflow deploy-snap.yml)
   - die Liste der Snap!-Vorlagen (projekte/*.xml) mit Titel und Station
   - Hilfsfunktionen, um eine Vorlage direkt in Snap! zu öffnen

   Öffnen einer Vorlage: Die XML-Datei wird geladen und als URL-Anker
   (#open:…) an Snap! übergeben. Das funktioniert lokal, auf edu-mrh.de und
   – falls die selbst gehostete Umgebung einmal nicht erreichbar ist – auch
   mit der externen Snap!-Seite in Berkeley (nur nach ausdrücklichem Klick,
   siehe Datenschutzhinweis in snap-ide.html).
   ========================================================================== */
(function () {
    'use strict';

    var SNAP_URL     = 'https://edu-mrh.de/embed/snap/edu-snap.html';
    var SNAP_PROBE   = 'https://edu-mrh.de/embed/snap/img/snap-icon-96.png';
    // Für die lokale Vorschau: localStorage['edu-snap-url'] = 'http://localhost:8765/edu-snap.html'
    // (ein lokaler Snap!-Klon mit edu-snap.html) leitet auf diese Adresse um.
    try {
        var override = localStorage.getItem('edu-snap-url');
        if (override) {
            SNAP_URL = override;
            SNAP_PROBE = override.replace(/[^\/]*$/, '') + 'img/snap-icon-96.png';
        }
    } catch (ignored) {}
    var EXTERNAL_URL = 'https://snap.berkeley.edu/snap/snap.html';

    var PROJECTS = {
        '0-start':                 { station: 0, title: 'Hallo Snap!' },
        '1-sequenz':               { station: 1, title: 'Sequenz' },
        '1-sequenz-loesung':       { station: 1, title: 'Sequenz – Lösung', solution: true },
        '2-variablen':             { station: 2, title: 'Variablen' },
        '2-variablen-loesung':     { station: 2, title: 'Variablen – Lösung', solution: true },
        '3-bedingungen':           { station: 3, title: 'Bedingungen' },
        '3-bedingungen-loesung':   { station: 3, title: 'Bedingungen – Lösung', solution: true },
        '4-wiederholung':          { station: 4, title: 'Wiederholung' },
        '4-wiederholung-loesung':  { station: 4, title: 'Wiederholung – Lösung', solution: true },
        '5-funktionen':            { station: 5, title: 'Funktionen' },
        '5-funktionen-loesung':    { station: 5, title: 'Funktionen – Lösung', solution: true },
        '6-quiz-start':            { station: 6, title: 'Projekt: Quiz (Starter)' },
        '6-zeichenroboter-start':  { station: 6, title: 'Projekt: Zeichenroboter (Starter)' },
        '6-textabenteuer-start':   { station: 6, title: 'Projekt: Textabenteuer (Starter)' }
    };

    var STATIONS = [
        { id: 0, file: '0-start.html',        title: 'Start: Was ist ein Algorithmus?', icon: '🚀' },
        { id: 1, file: '1-sequenz.html',      title: 'Sequenz',                       icon: '➡️' },
        { id: 2, file: '2-variablen.html',    title: 'Variablen & Datentypen',        icon: '📦' },
        { id: 3, file: '3-bedingungen.html',  title: 'Bedingte Anweisung',            icon: '🔀' },
        { id: 4, file: '4-wiederholung.html', title: 'Wiederholung',                  icon: '🔁' },
        { id: 5, file: '5-funktionen.html',   title: 'Funktionen',                    icon: '🧩' },
        { id: 6, file: '6-projekt.html',      title: 'Projekt',                       icon: '🏗️' }
    ];

    // Basis-URL des Ordners informatik/11/algorithmik/ – unabhängig davon,
    // ob eine Seite im Ordner selbst oder in arbeitsblaetter/ liegt.
    function baseUrl() {
        var s = document.currentScript || document.querySelector('script[src*="snap-config.js"]');
        var src = s ? s.getAttribute('src') : 'snap-config.js';
        return new URL(src, location.href).href.replace(/[^\/]*$/, '');
    }
    var BASE = baseUrl();

    function projectFileUrl(id) { return BASE + 'projekte/' + id + '.xml'; }
    function ideUrl(id)         { return BASE + 'snap-ide.html?p=' + encodeURIComponent(id); }

    // Lädt die Vorlage und liefert die fertige Snap!-URL (#open:…)
    function snapOpenUrl(id, snapBase) {
        return fetch(projectFileUrl(id)).then(function (r) {
            if (!r.ok) { throw new Error('Vorlage nicht gefunden: ' + id); }
            return r.text();
        }).then(function (xml) {
            return (snapBase || SNAP_URL) + '#open:' + encodeURIComponent(xml);
        });
    }

    // Prüft, ob die selbst gehostete Snap!-Umgebung erreichbar ist (Bild-Sonde,
    // funktioniert auch ohne CORS, z. B. bei lokaler Vorschau).
    function probeSelfHosted() {
        return new Promise(function (resolve) {
            var img = new Image();
            var done = false;
            var finish = function (ok) { if (!done) { done = true; resolve(ok); } };
            img.onload  = function () { finish(true); };
            img.onerror = function () { finish(false); };
            setTimeout(function () { finish(false); }, 6000);
            img.src = SNAP_PROBE + '?t=' + Date.now();
        });
    }

    window.EDU_SNAP = {
        SNAP_URL: SNAP_URL,
        EXTERNAL_URL: EXTERNAL_URL,
        PROJECTS: PROJECTS,
        STATIONS: STATIONS,
        BASE: BASE,
        projectFileUrl: projectFileUrl,
        ideUrl: ideUrl,
        snapOpenUrl: snapOpenUrl,
        probeSelfHosted: probeSelfHosted
    };
})();
