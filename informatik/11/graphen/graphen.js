/*
 * Graphen (Informatik 11) – interaktive Elemente der Stationsseiten
 *
 *   Graphen.zeichne(svg, graph, optionen)  zeichnet einen Graphen als SVG
 *   Begriffe-Explorer (3.1)                 <div data-explorer>
 *   Adjazenzmatrix-Werkstatt (3.2)          <div data-werkstatt>
 *   Breitensuche Schritt für Schritt (3.3)  <div data-bfs>
 *   Dijkstra (3.4): Routenplaner, Werkstatt, Kartenrätsel – siehe unten
 *   Lösungsweg (alle)                       <div data-loesungsweg="…"> mit <template data-stufe>
 *
 * graph = { knoten: { id: { x, y, name } }, kanten: [ { a, b, gewicht } ] }
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var zaehler = 0;

    function el(name, attrs, eltern) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (eltern) eltern.appendChild(e);
        return e;
    }

    // Punkt auf dem Rand eines Knotens in Richtung (dx, dy)
    function rand(k, dx, dy, opt) {
        var len = Math.hypot(dx, dy) || 1;
        if (opt.form === 'kreis') {
            return { x: k.x - dx / len * (opt.radius + 3), y: k.y - dy / len * (opt.radius + 3) };
        }
        var hw = opt.breite / 2 + 3, hh = opt.hoehe / 2 + 3;
        var t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
        return { x: k.x - dx * t, y: k.y - dy * t };
    }

    /*
     * optionen: gerichtet (bool), gewichte (bool), form ('rechteck' | 'kreis'),
     *           hlKanten / hlKnoten (Listen), fehlKanten (Liste [a, b]),
     *           klassen ({ knoten: 'klasse' }), kantenKlasse (Funktion kante -> 'klasse'),
     *           einheit (Text hinter dem Gewicht, z. B. ' km'),
     *           pfeil (feste Pfeilgröße in Pixeln, unabhängig von der Kantendicke)
     * Eine Kante mit beide: true wird als Doppelpfeil gezeichnet.
     * Jeder Knoten ist ein <g class="knoten" data-id="…">.
     */
    function zeichne(svg, graph, optionen) {
        var opt = Object.assign({ form: 'rechteck', breite: 108, hoehe: 34, radius: 22,
            gerichtet: false, gewichte: false, hlKanten: [], hlKnoten: [], fehlKanten: [],
            klassen: {}, kantenKlasse: null, einheit: '', pfeil: 0 }, optionen);
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var id = 'pfeil' + (++zaehler);
        var defs = el('defs', {}, svg);
        [['', '#64748b'], ['-hl', '#d97706']].forEach(function (f) {
            var m = el('marker', opt.pfeil ? { id: id + f[0], viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse',
                markerWidth: opt.pfeil, markerHeight: opt.pfeil, orient: 'auto-start-reverse' } : { id: id + f[0], viewBox: '0 0 10 10', refX: 9, refY: 5,
                markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
            el('path', { d: 'M0,0 L10,5 L0,10 z', fill: f[1] }, m);
        });

        var ebeneKanten = el('g', {}, svg);
        var ebeneKnoten = el('g', {}, svg);

        function istHl(k) {
            return opt.hlKanten.some(function (h) {
                return (h[0] === k.a && h[1] === k.b) || (h[0] === k.b && h[1] === k.a);
            });
        }

        graph.kanten.forEach(function (k) {
            var A = graph.knoten[k.a], B = graph.knoten[k.b];
            var hl = istHl(k);
            var cls = 'kante' + (hl ? ' hl' : '') + (opt.kantenKlasse ? ' ' + (opt.kantenKlasse(k) || '') : '');
            if (k.a === k.b) {
                // Schlinge
                var r = opt.form === 'kreis' ? opt.radius : opt.hoehe / 2;
                el('path', { 'class': cls, d: 'M' + (A.x - 10) + ',' + (A.y - r) +
                    ' C' + (A.x - 40) + ',' + (A.y - r - 55) + ' ' + (A.x + 40) + ',' + (A.y - r - 55) +
                    ' ' + (A.x + 10) + ',' + (A.y - r - 2),
                    'marker-end': opt.gerichtet ? 'url(#' + id + (hl ? '-hl' : '') + ')' : '' }, ebeneKanten);
                return;
            }
            var dx = B.x - A.x, dy = B.y - A.y;
            var p1 = rand(A, -dx, -dy, opt), p2 = rand(B, dx, dy, opt);
            var attrs = { 'class': cls, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
            if (opt.gerichtet || k.gerichtet) {
                attrs['marker-end'] = 'url(#' + id + (hl ? '-hl' : '') + ')';
                if (k.beide) attrs['marker-start'] = attrs['marker-end'];
            }
            el('line', attrs, ebeneKanten);
            if (opt.gewichte && k.gewicht !== undefined) {
                var t = el('text', { 'class': 'gewicht', x: (A.x + B.x) / 2 + (dy ? 10 : 0),
                    y: (A.y + B.y) / 2 - (dx ? 10 : 0) }, ebeneKanten);
                t.textContent = (k.gewicht < 0 ? '−' + (-k.gewicht) : k.gewicht) + opt.einheit;
            }
        });

        opt.fehlKanten.forEach(function (f) {
            var A = graph.knoten[f[0]], B = graph.knoten[f[1]];
            el('line', { 'class': 'kante fehlt', x1: A.x, y1: A.y, x2: B.x, y2: B.y }, ebeneKanten);
        });

        Object.keys(graph.knoten).forEach(function (kid) {
            var k = graph.knoten[kid];
            var cls = 'knoten' + (opt.hlKnoten.indexOf(kid) !== -1 ? ' hl' : '') + (k.start ? ' start' : '') +
                (opt.klassen[kid] ? ' ' + opt.klassen[kid] : '');
            var g = el('g', { 'class': cls, 'data-id': kid }, ebeneKnoten);
            if (opt.form === 'kreis') {
                el('circle', { cx: k.x, cy: k.y, r: opt.radius }, g);
            } else {
                el('rect', { x: k.x - opt.breite / 2, y: k.y - opt.hoehe / 2, width: opt.breite,
                    height: opt.hoehe, rx: 8 }, g);
            }
            var t = el('text', { x: k.x, y: k.y }, g);
            t.textContent = k.name || kid;
        });
    }

    // ------------------------------------------------------------------
    // Begriffe-Explorer (3.1): Dörfer-Graph mit Pfaden, Zyklus, Richtung, Gewicht
    // ------------------------------------------------------------------
    var DOERFER = {
        knoten: {
            A: { x: 440, y: 45, name: 'Altdorf' },
            W: { x: 130, y: 85, name: 'Weiler' },
            F: { x: 500, y: 180, name: 'Fischbach' },
            Z: { x: 290, y: 180, name: 'Ziegelstein' },
            N: { x: 100, y: 285, name: 'Neustadt' },
            B: { x: 430, y: 300, name: 'Burg' },
            R: { x: 260, y: 350, name: 'Rain' }
        },
        // Richtung a -> b gilt im gerichteten Modus
        kanten: [
            { a: 'A', b: 'W', gewicht: 12 }, { a: 'F', b: 'A', gewicht: 10 },
            { a: 'W', b: 'F', gewicht: 25 }, { a: 'W', b: 'Z', gewicht: 5 },
            { a: 'Z', b: 'F', gewicht: 8 },  { a: 'Z', b: 'N', gewicht: 25 },
            { a: 'B', b: 'Z', gewicht: 30 }, { a: 'F', b: 'B', gewicht: 15 },
            { a: 'N', b: 'R', gewicht: 20 }, { a: 'B', b: 'R', gewicht: 10 }
        ]
    };

    function kantenAus(folge) {
        var k = [];
        for (var i = 0; i + 1 < folge.length; i++) k.push([folge[i], folge[i + 1]]);
        return k;
    }

    var MODI = {
        start: { text: '<p>Wähle oben einen Begriff. Der Graph zeigt dir ein Beispiel dazu.</p>' +
            '<p>Die Dörfer sind die Knoten, die Straßen die Kanten.</p>' },
        pfad: { folge: ['N', 'Z', 'W', 'F', 'Z', 'B'],
            text: '<p><strong>Ein Pfad:</strong> Neustadt → Ziegelstein → Weiler → Fischbach → Ziegelstein → Burg.</p>' +
                '<p>Aufeinanderfolgende Knoten sind durch Kanten verbunden, keine Kante wird doppelt benutzt.</p>' +
                '<p>🤔 Welcher Knoten kommt zweimal vor?</p>' },
        einfach: { folge: ['A', 'W', 'Z', 'N', 'R'],
            text: '<p><strong>Ein einfacher Pfad:</strong> Altdorf → Weiler → Ziegelstein → Neustadt → Rain.</p>' +
                '<p>Was ist hier anders als beim Pfad davor?</p>' +
                '<p>🤔 Wie lang ist dieser Pfad, wenn man die Kanten zählt?</p>' },
        zyklus: { folge: ['W', 'Z', 'F', 'W'],
            text: '<p><strong>Ein Zyklus:</strong> Weiler → Ziegelstein → Fischbach → Weiler.</p>' +
                '<p>Ein Graph, der mindestens einen Zyklus enthält, heißt <em>zyklisch</em>, sonst <em>azyklisch</em>.</p>' +
                '<p>🤔 Findest du einen Zyklus mit vier Knoten?</p>' },
        keinpfad: { fehlt: [['A', 'B']],
            text: '<p><strong>Kein Pfad:</strong> Altdorf → Burg.</p>' +
                '<p>Zwischen Altdorf und Burg gibt es keine Kante. Trotzdem kommt man von Altdorf nach Burg.</p>' +
                '<p>🤔 Wie? Gibt es in diesem Graphen zwei Dörfer, zwischen denen es überhaupt keinen Pfad gibt?</p>' },
        gerichtet: { gerichtet: true,
            text: '<p><strong>Gerichtet:</strong> Jetzt sind alle Straßen Einbahnstraßen. Eine Kante (A, B) darf man nur von A nach B entlanggehen.</p>' +
                '<p>Von Weiler aus kommt man immer noch überall hin.</p>' +
                '<p>🤔 Und von Rain aus? Ist der Graph <em>stark</em> oder nur <em>schwach</em> zusammenhängend?</p>' },
        gewichtet: { gewichte: true,
            text: '<p><strong>Gewichtet:</strong> An den Kanten stehen Fahrzeiten in Minuten.</p>' +
                '<p>Die Länge eines Pfades ist jetzt die Summe der Gewichte, nicht mehr die Anzahl der Kanten.</p>' +
                '<p>🤔 Wie lang ist Altdorf → Weiler → Ziegelstein → Neustadt → Rain jetzt?</p>' }
    };

    function explorer(box) {
        var svg = box.querySelector('svg');
        var text = box.querySelector('.explorer-text');
        var knoepfe = box.querySelectorAll('[data-modus]');
        function zeige(name) {
            var m = MODI[name];
            var folge = m.folge || [];
            zeichne(svg, DOERFER, { gerichtet: !!m.gerichtet, gewichte: !!m.gewichte,
                hlKanten: kantenAus(folge), hlKnoten: folge, fehlKanten: m.fehlt || [] });
            text.innerHTML = m.text;
            knoepfe.forEach(function (k) {
                k.setAttribute('aria-pressed', k.getAttribute('data-modus') === name ? 'true' : 'false');
            });
        }
        knoepfe.forEach(function (k) {
            k.addEventListener('click', function () {
                var name = k.getAttribute('data-modus');
                zeige(k.getAttribute('aria-pressed') === 'true' ? 'start' : name);
            });
        });
        zeige('start');
    }

    // ------------------------------------------------------------------
    // Adjazenzmatrix-Werkstatt (3.2)
    // ------------------------------------------------------------------
    var NAMEN = ['A', 'B', 'C', 'D', 'E'];
    var POS = NAMEN.map(function (_, i) {
        var w = -Math.PI / 2 + i * 2 * Math.PI / NAMEN.length;
        return { x: 170 + 120 * Math.cos(w), y: 160 + 120 * Math.sin(w) };
    });

    function leer() {
        return NAMEN.map(function () { return NAMEN.map(function () { return false; }); });
    }

    function graphAusMatrix(m) {
        var g = { knoten: {}, kanten: [] };
        NAMEN.forEach(function (n, i) { g.knoten[n] = { x: POS[i].x, y: POS[i].y, name: n }; });
        for (var i = 0; i < NAMEN.length; i++) {
            for (var j = i; j < NAMEN.length; j++) {
                if (i === j) {
                    if (m[i][i]) g.kanten.push({ a: NAMEN[i], b: NAMEN[i] });
                } else if (m[i][j] && m[j][i]) {
                    g.kanten.push({ a: NAMEN[i], b: NAMEN[j] });
                } else if (m[i][j]) {
                    g.kanten.push({ a: NAMEN[i], b: NAMEN[j], gerichtet: true });
                } else if (m[j][i]) {
                    g.kanten.push({ a: NAMEN[j], b: NAMEN[i], gerichtet: true });
                }
            }
        }
        return g;
    }

    function notation(m) {
        var e = [];
        for (var i = 0; i < NAMEN.length; i++) {
            for (var j = 0; j < NAMEN.length; j++) {
                if (!m[i][j]) continue;
                if (i < j && m[j][i]) e.push('{' + NAMEN[i] + ', ' + NAMEN[j] + '}');
                else if (!(i > j && m[j][i])) e.push('(' + NAMEN[i] + ', ' + NAMEN[j] + ')');
            }
        }
        return 'V = {' + NAMEN.join(', ') + '}\nE = {' + e.join(', ') + '}';
    }

    function zufallsMatrix(ungerichtet) {
        var m = leer();
        var anzahl = 0;
        while (anzahl < 5) {
            var i = Math.floor(Math.random() * NAMEN.length);
            var j = Math.floor(Math.random() * NAMEN.length);
            if (i === j || m[i][j]) continue;
            m[i][j] = true;
            if (ungerichtet) m[j][i] = true;
            anzahl++;
        }
        return m;
    }

    function werkstatt(box) {
        var svg = box.querySelector('svg');
        var tabelle = box.querySelector('.matrix');
        var ausgabe = box.querySelector('.notation');
        var ergebnis = box.querySelector('.pruef-ergebnis');
        var symmetrisch = box.querySelector('[data-symmetrisch]');
        var aufgabeText = box.querySelector('.werkstatt-aufgabe');
        var pruefen = box.querySelector('[data-pruefen]');
        var modusKnoepfe = box.querySelectorAll('[data-wmodus]');
        var m = leer();
        var ziel = null, modus = 'frei';

        // Matrix aufbauen
        var kopf = '<tr><th scope="col">von \\ nach</th>' +
            NAMEN.map(function (n) { return '<th scope="col">' + n + '</th>'; }).join('') + '</tr>';
        var zeilen = NAMEN.map(function (n, i) {
            return '<tr><th scope="row">' + n + '</th>' + NAMEN.map(function (n2, j) {
                return '<td' + (i === j ? ' class="diagonale"' : '') + '><button type="button" data-i="' + i +
                    '" data-j="' + j + '" aria-pressed="false" aria-label="Kante von ' + n + ' nach ' + n2 +
                    '">O</button></td>';
            }).join('') + '</tr>';
        }).join('');
        tabelle.innerHTML = kopf + zeilen;

        function aktualisieren() {
            tabelle.querySelectorAll('button').forEach(function (b) {
                var an = m[+b.getAttribute('data-i')][+b.getAttribute('data-j')];
                b.setAttribute('aria-pressed', an ? 'true' : 'false');
                b.textContent = an ? 'X' : 'O';
            });
            if (modus === 'frei') {
                zeichne(svg, graphAusMatrix(m), { form: 'kreis' });
                ausgabe.textContent = notation(m);
            }
        }

        function setzeModus(neu) {
            modus = neu;
            ergebnis.textContent = '';
            ergebnis.className = 'pruef-ergebnis';
            modusKnoepfe.forEach(function (k) {
                k.setAttribute('aria-pressed', k.getAttribute('data-wmodus') === neu ? 'true' : 'false');
            });
            m = leer();
            if (neu === 'frei') {
                ziel = null;
                pruefen.hidden = true;
                svg.style.display = '';
                aufgabeText.textContent = 'Klicke in die Matrix: Jedes X ist eine Kante von der Zeile zur Spalte. Der Graph zeichnet sich mit.';
            } else {
                ziel = zufallsMatrix(Math.random() < 0.5);
                pruefen.hidden = false;
                if (neu === 'bild') {
                    svg.style.display = '';
                    zeichne(svg, graphAusMatrix(ziel), { form: 'kreis' });
                    ausgabe.textContent = 'Übertrage den Graphen in die Matrix und prüfe dann.';
                    aufgabeText.textContent = 'Rätsel: Welche Adjazenzmatrix gehört zu diesem Graphen? Ein Strich ohne Pfeil gilt in beide Richtungen.';
                } else {
                    svg.style.display = 'none';
                    ausgabe.textContent = notation(ziel);
                    aufgabeText.textContent = 'Rätsel: Übertrage G = (V, E) in die Matrix. {A, B} steht für eine ungerichtete Kante, (A, B) nur für A → B.';
                }
            }
            aktualisieren();
        }

        tabelle.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            var i = +b.getAttribute('data-i'), j = +b.getAttribute('data-j');
            m[i][j] = !m[i][j];
            if (symmetrisch.checked) m[j][i] = m[i][j];
            ergebnis.textContent = '';
            aktualisieren();
        });

        box.querySelector('[data-leeren]').addEventListener('click', function () {
            m = leer();
            ergebnis.textContent = '';
            aktualisieren();
        });

        pruefen.addEventListener('click', function () {
            var fehler = 0;
            for (var i = 0; i < NAMEN.length; i++) {
                for (var j = 0; j < NAMEN.length; j++) if (m[i][j] !== ziel[i][j]) fehler++;
            }
            if (fehler === 0) {
                ergebnis.textContent = '✔ Richtig! Neues Rätsel über den Knopf oben.';
                ergebnis.className = 'pruef-ergebnis ok';
            } else {
                ergebnis.textContent = '✘ ' + fehler + (fehler === 1 ? ' Eintrag stimmt' : ' Einträge stimmen') + ' noch nicht.';
                ergebnis.className = 'pruef-ergebnis falsch';
            }
        });

        modusKnoepfe.forEach(function (k) {
            k.addEventListener('click', function () { setzeModus(k.getAttribute('data-wmodus')); });
        });
        setzeModus('frei');
    }

    // ------------------------------------------------------------------
    // Breitensuche Schritt für Schritt (3.3): Feuerwerks-Graph von Blatt 3.3
    // Ablauf wie im Java-Projekt: holen, markieren, ausgeben, Nachbarn anstellen
    // ------------------------------------------------------------------
    var FEUERWERK = {
        knoten: {
            A: { x: 330, y: 150 }, B: { x: 470, y: 70 }, C: { x: 220, y: 70 }, D: { x: 530, y: 190 },
            E: { x: 250, y: 250 }, F: { x: 120, y: 150 }, G: { x: 370, y: 330 }, H: { x: 130, y: 330 },
            I: { x: 30, y: 90 }, J: { x: 250, y: 400 }
        },
        kanten: [
            { a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'A', b: 'D' }, { a: 'A', b: 'E' }, { a: 'B', b: 'D' },
            { a: 'C', b: 'F' }, { a: 'E', b: 'F' }, { a: 'E', b: 'H' }, { a: 'E', b: 'G' }, { a: 'F', b: 'I' },
            { a: 'H', b: 'J' }, { a: 'G', b: 'J' }
        ]
    };

    function nachbarn(graph, k) {
        var n = [];
        graph.kanten.forEach(function (e) {
            if (e.a === k) n.push(e.b);
            if (e.b === k) n.push(e.a);
        });
        return n.sort();
    }

    function bfsAnimation(box) {
        var svg = box.querySelector('svg');
        var auswahl = box.querySelector('[data-bfs-start]');
        var text = box.querySelector('.bfs-text');
        var zustand;

        Object.keys(FEUERWERK.knoten).sort().forEach(function (k) {
            var o = document.createElement('option');
            o.value = o.textContent = k;
            auswahl.appendChild(o);
        });

        function zeige(meldung) {
            var klassen = {};
            zustand.warteschlange.forEach(function (k) { klassen[k] = 'wartend'; });
            zustand.besucht.forEach(function (k) { klassen[k] = 'besucht'; });
            if (zustand.aktuell) klassen[zustand.aktuell] = 'aktuell';
            zeichne(svg, FEUERWERK, { form: 'kreis', radius: 22, klassen: klassen, hlKanten: zustand.baum });
            text.innerHTML = '<p>' + meldung + '</p>' +
                '<p><strong>Warteschlange:</strong> ' + (zustand.warteschlange.join(' ') || '(leer)') + '</p>' +
                '<p><strong>Reihenfolge:</strong> ' + (zustand.besucht.join(' ') || '–') + '</p>';
        }

        function neu() {
            zustand = { warteschlange: [auswahl.value], besucht: [], aktuell: null, baum: [], schritt: 0 };
            zeige('Start: ' + auswahl.value + ' steht in der Warteschlange. Klicke auf „Schritt“.');
        }

        function schritt() {
            if (!zustand.warteschlange.length) {
                zeige('Die Warteschlange ist leer: Die Breitensuche ist fertig.');
                return false;
            }
            var akt = zustand.warteschlange.shift();
            zustand.aktuell = akt;
            zustand.besucht.push(akt);
            zustand.schritt++;
            var neuDazu = [];
            nachbarn(FEUERWERK, akt).forEach(function (n) {
                if (zustand.besucht.indexOf(n) === -1 && zustand.warteschlange.indexOf(n) === -1) {
                    zustand.warteschlange.push(n);
                    zustand.baum.push([akt, n]);
                    neuDazu.push(n);
                }
            });
            zeige('Schritt ' + zustand.schritt + ': <strong>' + akt + '</strong> vorne aus der Warteschlange geholt und markiert. ' +
                (neuDazu.length ? 'Hinten angestellt: ' + neuDazu.join(', ') + '.' :
                    'Keine neuen Nachbarn (alle schon besucht oder in der Warteschlange).'));
            return true;
        }

        box.querySelector('[data-bfs-schritt]').addEventListener('click', schritt);
        box.querySelector('[data-bfs-alles]').addEventListener('click', function () { while (schritt()) { /* weiter */ } });
        box.querySelector('[data-bfs-neu]').addEventListener('click', neu);
        auswahl.addEventListener('change', neu);
        neu();
    }

    // ------------------------------------------------------------------
    // Statische Beispielgraphen: <svg data-graph="name">
    // ------------------------------------------------------------------
    var BEISPIELE = {
        folgen: {
            graph: {
                knoten: {
                    Leon: { x: 110, y: 60 }, Letifa: { x: 330, y: 40 }, Luise: { x: 420, y: 150 },
                    Hamza: { x: 250, y: 220 }, Sabine: { x: 80, y: 200 }
                },
                kanten: [
                    { a: 'Leon', b: 'Letifa', gerichtet: true, beide: true },
                    { a: 'Letifa', b: 'Luise', gerichtet: true },
                    { a: 'Leon', b: 'Luise', gerichtet: true },
                    { a: 'Leon', b: 'Hamza', gerichtet: true, beide: true },
                    { a: 'Hamza', b: 'Luise', gerichtet: true }
                ]
            },
            optionen: { breite: 96 }
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-explorer]').forEach(explorer);
        document.querySelectorAll('[data-werkstatt]').forEach(werkstatt);
        document.querySelectorAll('[data-bfs]').forEach(bfsAnimation);
        document.querySelectorAll('svg[data-graph]').forEach(function (svg) {
            var b = BEISPIELE[svg.getAttribute('data-graph')];
            if (b) zeichne(svg, b.graph, b.optionen);
        });
    });

    window.Graphen = { zeichne: zeichne };
})();

/* ==========================================================================
   Dijkstra (3.4) – alles wie auf Blatt 3.4:
   orange = aktuell besuchter Knoten, blau = fertig, Schritt k = der k-te Knoten
   wird orange; Karten W O R L D aus Aufgabe 3.

     <div data-route></div>                     Routenplaner zum Freibad (Aufgabe 1)
     <div data-dj="freibad,deutschland" data-dj-modus="zeigen | rechnen | beide"></div>
                                                Werkstatt: Vorführung Schritt für Schritt
                                                und/oder Trainer „Selbst rechnen“
                                                (Graphen siehe DJ_GRAPHEN; zeigen: n heißt:
                                                die Vorführung stoppt nach Schritt n)
     <div data-reihenfolge="WORLD"> Karten als <button data-b="W">, Erfolg als
       <template data-erfolg> </div>            Kartenrätsel (Aufgabe 3)
   ========================================================================== */
(function () {
    'use strict';

    var INF = Infinity;
    var SVG_NS = 'http://www.w3.org/2000/svg';

    function K(a, b, w, gerichtet) { return { a: a, b: b, gewicht: w, gerichtet: !!gerichtet }; }

    var DJ_GRAPHEN = {
        freibad: {
            titel: 'Freibad (Aufgabe 2)', start: 'H', ziel: 'F', zeigen: 2, form: 'kreis', vb: '0 0 620 390',
            knoten: {
                H: { x: 80, y: 195, lab: [-44, 0] }, K: { x: 340, y: 325, lab: [0, 42] },
                W: { x: 235, y: 75, lab: [0, -40] }, E: { x: 445, y: 75, lab: [0, -40] },
                F: { x: 560, y: 195, lab: [0, 42] }
            },
            kanten: [K('H', 'W', 9), K('H', 'K', 2), K('W', 'E', 5), K('W', 'K', 5), K('K', 'E', 12), K('E', 'F', 3), K('K', 'F', 15)]
        },
        deutschland: {
            titel: 'Paketdienst (Aufgabe 4)', start: 'Frankfurt', ziel: 'München', zeigen: 0, form: 'rechteck',
            breite: 104, vb: '0 0 700 420', einheit: '',
            knoten: {
                Frankfurt: { x: 320, y: 60 }, Mannheim: { x: 100, y: 115 }, 'Würzburg': { x: 480, y: 130 },
                Karlsruhe: { x: 150, y: 250 }, Erfurt: { x: 620, y: 45 }, Augsburg: { x: 330, y: 320 },
                'Nürnberg': { x: 620, y: 245 }, 'München': { x: 540, y: 375, lab: [0, -30] }
            },
            kanten: [K('Frankfurt', 'Mannheim', 85), K('Frankfurt', 'Würzburg', 119), K('Würzburg', 'Erfurt', 193),
                K('Würzburg', 'Nürnberg', 109), K('Würzburg', 'Augsburg', 150), K('Mannheim', 'Karlsruhe', 70),
                K('Karlsruhe', 'Augsburg', 230), K('Augsburg', 'München', 80), K('Nürnberg', 'München', 170)]
        },
        rad: {
            titel: 'Übung 1: Radtour', start: 'A', ziel: 'F', form: 'kreis', vb: '0 0 620 390',
            knoten: {
                A: { x: 70, y: 195 }, B: { x: 230, y: 75 }, C: { x: 230, y: 315 },
                D: { x: 410, y: 75 }, E: { x: 410, y: 315 }, F: { x: 560, y: 195 }
            },
            kanten: [K('A', 'B', 4), K('A', 'C', 2), K('B', 'C', 1), K('B', 'D', 5), K('C', 'D', 8), K('C', 'E', 10),
                K('D', 'E', 2), K('D', 'F', 6), K('E', 'F', 3)]
        },
        einbahn: {
            titel: 'Einbahnstraßen (gerichtet)', start: 'S', ziel: 'Z', form: 'kreis', vb: '0 0 620 390',
            knoten: {
                S: { x: 70, y: 195 }, A: { x: 230, y: 75 }, B: { x: 230, y: 315 },
                C: { x: 410, y: 75 }, D: { x: 410, y: 315 }, Z: { x: 560, y: 195 }
            },
            kanten: [K('S', 'A', 7, true), K('S', 'B', 2, true), K('B', 'A', 3, true), K('A', 'C', 4, true),
                K('B', 'D', 9, true), K('A', 'D', 2, true), K('D', 'Z', 3, true), K('C', 'Z', 6, true), K('C', 'D', 1, true)]
        },
        negativ: {
            titel: 'Negative Kante', start: 'A', ziel: 'C', form: 'kreis', vb: '0 0 620 390',
            knoten: { A: { x: 90, y: 195 }, B: { x: 310, y: 70 }, C: { x: 530, y: 195 }, D: { x: 310, y: 320 } },
            kanten: [K('A', 'B', 1, true), K('B', 'C', 1, true), K('A', 'D', 4, true), K('D', 'C', -3, true)],
            ende: 'Aber Achtung: Der Weg A → D → C hat die Länge 4 + (−3) = 1. Das ist kürzer als 2! ' +
                'Als D an der Reihe war, war C schon fertig und wurde nicht mehr verändert.'
        },
        insel: {
            titel: 'Zwei Inseln (nicht zusammenhängend)', start: 'A', form: 'kreis', vb: '0 0 620 390',
            knoten: { A: { x: 80, y: 190 }, B: { x: 230, y: 80 }, C: { x: 230, y: 300 }, D: { x: 450, y: 110 }, E: { x: 550, y: 280 } },
            kanten: [K('A', 'B', 3), K('A', 'C', 5), K('B', 'C', 1), K('D', 'E', 2)]
        }
    };

    // Zufallsgraph: feste Knoten, zufällige Kanten (ohne Überkreuzung) und Gewichte 1–12
    var Z_POS = { A: [70, 195], B: [210, 70], C: [210, 320], D: [340, 195], E: [470, 70], F: [470, 320], G: [600, 195] };
    var Z_KANDIDATEN = [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['C', 'D'], ['B', 'E'], ['C', 'F'],
        ['D', 'E'], ['D', 'F'], ['E', 'G'], ['F', 'G'], ['D', 'G']];

    function zufallsGraph() {
        var g;
        do {
            g = { titel: 'Zufallsgraph', start: 'A', ziel: 'G', form: 'kreis', vb: '0 0 670 390', knoten: {}, kanten: [] };
            Object.keys(Z_POS).forEach(function (n) { g.knoten[n] = { x: Z_POS[n][0], y: Z_POS[n][1] }; });
            Z_KANDIDATEN.forEach(function (p) {
                if (Math.random() < 0.75) g.kanten.push(K(p[0], p[1], 1 + Math.floor(Math.random() * 12)));
            });
        } while (g.kanten.length < 8 || erreichbar(g, 'A').length < 7);
        return g;
    }

    function ids(g) { return Object.keys(g.knoten); }
    function fmt(x) { return x === INF ? '∞' : (x < 0 ? '−' + (-x) : String(x)); }
    function name(g, n) { return g.knoten[n].name || n; }
    function summand(x) { return x < 0 ? '(' + fmt(x) + ')' : fmt(x); }
    function enthaelt(liste, x) { return liste.indexOf(x) !== -1; }

    // Nachbarn von u (gerichtete Kanten nur in Pfeilrichtung), sortiert wie die Tabellenspalten
    function nachbarn(g, u) {
        var reihe = ids(g), aus = [];
        g.kanten.forEach(function (k) {
            if (k.a === u) aus.push({ v: k.b, w: k.gewicht });
            else if (k.b === u && !k.gerichtet) aus.push({ v: k.a, w: k.gewicht });
        });
        return aus.sort(function (x, y) { return reihe.indexOf(x.v) - reihe.indexOf(y.v); });
    }

    function erreichbar(g, s) {
        var gesehen = [s], i = 0;
        while (i < gesehen.length) {
            nachbarn(g, gesehen[i++]).forEach(function (x) { if (!enthaelt(gesehen, x.v)) gesehen.push(x.v); });
        }
        return gesehen;
    }

    function kantePasst(k, p) {
        return p && ((k.a === p[0] && k.b === p[1]) || (!k.gerichtet && k.a === p[1] && k.b === p[0]));
    }

    function wegZu(vorg, s, z) {
        var weg = [z];
        while (weg[0] !== s && vorg[weg[0]]) weg.unshift(vorg[weg[0]]);
        return weg[0] === s ? weg : null;
    }

    function klon(z) { return JSON.parse(JSON.stringify(z, function (k, v) { return v === INF ? '∞' : v; }), function (k, v) { return v === '∞' ? INF : v; }); }

    // ------------------------------------------------------------------
    // Der Algorithmus als Folge von Bildern (für die Vorführung)
    // ------------------------------------------------------------------
    function verlauf(g) {
        var reihe = ids(g), s = g.start;
        var z = { dist: {}, vorg: {}, fertig: [], aktuell: null, zeilen: [], schritt: 0, pruef: [], jetzt: null, weg: [] };
        reihe.forEach(function (n) { z.dist[n] = n === s ? 0 : INF; });
        var bilder = [];
        function bild(text, art) { var b = klon(z); b.text = text; b.art = art; bilder.push(b); }

        bild('<p><b class="karte-b">W</b> Startknoten ist <b>' + name(g, s) + '</b>.</p><p><b class="karte-b">O</b> ' + name(g, s) +
            ' erhält die Pfadlänge 0.</p><p><b class="karte-b">R</b> Alle anderen Knoten erhalten die Pfadlänge ∞.</p>', 'start');

        for (;;) {
            var offen = reihe.filter(function (n) { return !enthaelt(z.fertig, n) && z.dist[n] < INF; });
            if (!offen.length) break;
            var u = offen.reduce(function (m, n) { return z.dist[n] < z.dist[m] ? n : m; });
            z.schritt++;
            z.aktuell = u;
            var nb = nachbarn(g, u);
            var zuPruefen = nb.filter(function (x) { return !enthaelt(z.fertig, x.v); });
            z.pruef = zuPruefen.map(function (x) { return [u, x.v]; });
            var zeile = { aktuell: u, fertig: z.fertig.slice(), werte: {} };
            reihe.forEach(function (n) { zeile.werte[n] = { wert: z.dist[n], alt: [], vorher: z.dist[n] }; });
            z.zeilen.push(zeile);
            var andere = offen.filter(function (n) { return n !== u; });
            bild('<p class="dj-schritt">Schritt ' + z.schritt + '</p><p><b class="karte-b">L</b> ' +
                (z.schritt === 1 ? 'Nur der Startknoten hat eine Pfadlänge kleiner als ∞: <b>' + name(g, u) + '</b> wird orange.' :
                    'Unter den noch nicht fertigen Knoten hat <b>' + name(g, u) + '</b> die kleinste Pfadlänge (' + fmt(z.dist[u]) + ')' +
                    (andere.length ? ', die anderen: ' + andere.map(function (n) { return name(g, n) + ' ' + fmt(z.dist[n]); }).join(', ') : '') +
                    '. ' + name(g, u) + ' wird orange.') + '</p><p>' +
                (zuPruefen.length ? 'Direkte Kanten zu nicht fertigen Nachbarn (dick): ' + zuPruefen.map(function (x) { return name(g, x.v); }).join(', ') + '.' :
                    'Keine direkte Kante zu einem nicht fertigen Knoten.') + '</p>', 'waehlen');

            nb.forEach(function (x) {
                var neu = z.dist[u] + x.w;
                z.jetzt = [u, x.v];
                if (enthaelt(z.fertig, x.v)) {
                    if (neu < z.dist[x.v]) {
                        bild('<p class="dj-schritt">Schritt ' + z.schritt + '</p><p class="dj-warn">⚠️ Kante ' + name(g, u) + ' → ' + name(g, x.v) + ' (' + fmt(x.w) + '): ' +
                            fmt(z.dist[u]) + ' + ' + summand(x.w) + ' = ' + fmt(neu) + ' wäre kleiner als ' + fmt(z.dist[x.v]) + '. Aber ' + name(g, x.v) +
                            ' ist schon fertig (blau) und wird nicht mehr verändert.</p>', 'warnung');
                    }
                    z.jetzt = null;
                    return;
                }
                var alt = z.dist[x.v], text;
                if (neu < alt) {
                    if (alt < INF) zeile.werte[x.v].alt.push(alt);
                    z.dist[x.v] = neu;
                    z.vorg[x.v] = u;
                    zeile.werte[x.v].wert = neu;
                    text = fmt(z.dist[u]) + ' + ' + summand(x.w) + ' = ' + fmt(neu) + ' &lt; ' + fmt(alt) + ': <b>' + name(g, x.v) + '</b> bekommt die Pfadlänge <b>' + fmt(neu) + '</b>' +
                        (alt < INF ? ' (alte Länge durchstreichen).' : '.');
                } else {
                    text = fmt(z.dist[u]) + ' + ' + summand(x.w) + ' = ' + fmt(neu) + ' ist nicht kleiner als ' + fmt(alt) + ': keine Änderung.';
                }
                bild('<p class="dj-schritt">Schritt ' + z.schritt + '</p><p><b class="karte-b">L</b> Kante ' + name(g, u) + (g.kanten.some(function (k) { return k.gerichtet; }) ? ' → ' : ' – ') +
                    name(g, x.v) + ' (' + fmt(x.w) + '):</p><p>' + text + '</p>', 'pruefen');
            });
            z.jetzt = null;
            z.pruef = [];
            z.fertig.push(u);
            z.aktuell = null;
            bild('<p class="dj-schritt">Schritt ' + z.schritt + '</p><p><b class="karte-b">D</b> <b>' + name(g, u) + '</b> ist fertig (blau). Seine Pfadlänge ' + fmt(z.dist[u]) +
                ' ändert sich nicht mehr. ' + (z.fertig.length < reihe.length ? 'Weiter mit dem nächsten Schritt.' : '') + '</p>', 'fertig');
        }

        var rest = reihe.filter(function (n) { return !enthaelt(z.fertig, n); });
        var text = '<p><b>Fertig!</b> ' + (rest.length ? 'Alle erreichbaren Knoten sind blau. <b>' + rest.map(function (n) { return name(g, n); }).join(', ') +
            '</b> ' + (rest.length === 1 ? 'ist' : 'sind') + ' von ' + name(g, g.start) + ' aus nicht erreichbar und ' + (rest.length === 1 ? 'behält' : 'behalten') + ' die Pfadlänge ∞.' :
            'Alle Knoten sind blau.') + '</p>';
        if (g.ziel && z.dist[g.ziel] < INF) {
            var weg = wegZu(z.vorg, g.start, g.ziel);
            z.weg = [];
            for (var i = 0; i + 1 < weg.length; i++) z.weg.push([weg[i], weg[i + 1]]);
            text += '<p>' + (g.ende ? 'Weg laut Algorithmus' : 'Kürzester Weg') + ' von ' + name(g, g.start) + ' nach ' + name(g, g.ziel) + ' (grün): <b>' +
                weg.map(function (n) { return name(g, n); }).join(' – ') + '</b>, Länge ' + fmt(z.dist[g.ziel]) + '.</p>' +
                '<p class="dj-klein">Den Weg liest man rückwärts ab: ' + name(g, g.ziel) + ' bekam seine Pfadlänge zuletzt über ' + name(g, weg[weg.length - 2]) + ', dieser über … usw.</p>';
        }
        if (g.ende) text += '<p class="dj-warn">' + g.ende + '</p>';
        bild(text, 'ende');
        return bilder;
    }

    // ------------------------------------------------------------------
    // Zeichnen: Graph mit Farben, Pfadlängen an den Knoten, Tabelle
    // ------------------------------------------------------------------
    function zeichneZustand(svg, g, z, klickbar) {
        var reihe = ids(g);
        var klassen = {};
        reihe.forEach(function (n) { klassen[n] = 'dj-offen'; });
        z.fertig.forEach(function (n) { klassen[n] = 'dj-fertig'; });
        if (z.aktuell) klassen[z.aktuell] = 'dj-aktuell';
        (klickbar || []).forEach(function (n) { klassen[n] += ' dj-klickbar'; });
        svg.setAttribute('viewBox', g.vb);
        window.Graphen.zeichne(svg, g, {
            form: g.form, breite: g.breite || 100, hoehe: 34, radius: 24, gewichte: true, klassen: klassen, pfeil: 22,
            einheit: g.einheit || '',
            kantenKlasse: function (k) {
                if (kantePasst(k, z.jetzt)) return 'dj-jetzt';
                if ((z.weg || []).some(function (p) { return kantePasst(k, p); })) return 'dj-weg';
                if ((z.pruef || []).some(function (p) { return kantePasst(k, p); })) return 'dj-pruef';
                return '';
            }
        });
        // Pfadlängen an die Knoten schreiben
        // durchgestrichene/neue Werte nur während eines Schritts der Vorführung
        var letzte = z.zeilen.length ? z.zeilen[z.zeilen.length - 1] : null;
        var zeile = z.aktuell && letzte && letzte.aktuell === z.aktuell && letzte.werte[z.aktuell].vorher !== undefined ? letzte : null;
        var mx = 0, my = 0;
        reihe.forEach(function (n) { mx += g.knoten[n].x / reihe.length; my += g.knoten[n].y / reihe.length; });
        var ebene = document.createElementNS(SVG_NS, 'g');
        svg.appendChild(ebene);
        reihe.forEach(function (n) {
            var k = g.knoten[n], lab = k.lab;
            if (!lab) {
                if (g.form === 'rechteck') lab = [0, k.y < my ? -30 : 30];
                else {
                    var dx = k.x - mx, dy = k.y - my, l = Math.hypot(dx, dy) || 1;
                    lab = [dx / l * 42, dy / l * 42];
                }
            }
            var t = document.createElementNS(SVG_NS, 'text');
            t.setAttribute('class', 'dj-wert');
            t.setAttribute('x', k.x + lab[0]);
            t.setAttribute('y', k.y + lab[1]);
            var alt = zeile ? zeile.werte[n].alt : [];
            alt.forEach(function (a) {
                var s = document.createElementNS(SVG_NS, 'tspan');
                s.setAttribute('class', 'alt');
                s.textContent = fmt(a);
                t.appendChild(s);
                t.appendChild(document.createTextNode(' '));
            });
            var w = document.createElementNS(SVG_NS, 'tspan');
            if (zeile && z.dist[n] !== zeile.werte[n].vorher) w.setAttribute('class', 'neu');
            w.textContent = fmt(z.dist[n]);
            t.appendChild(w);
            ebene.appendChild(t);
            // Streichlinie selbst zeichnen (text-decoration ist in SVG kaum sichtbar)
            Array.prototype.forEach.call(t.querySelectorAll('.alt'), function (s) {
                var b = s.getBBox();
                var l = document.createElementNS(SVG_NS, 'line');
                l.setAttribute('class', 'dj-strich');
                l.setAttribute('x1', b.x - 1);
                l.setAttribute('x2', b.x + b.width + 1);
                l.setAttribute('y1', b.y + b.height * 0.55);
                l.setAttribute('y2', b.y + b.height * 0.55);
                ebene.appendChild(l);
            });
        });
    }

    function zelle(g, r, n) {
        var cls = r.aktuell === n ? 'dj-a' : (enthaelt(r.fertig, n) ? 'dj-f' : '');
        var v = r.werte[n];
        var inhalt = v.alt.map(function (a) { return '<s>' + fmt(a) + '</s> '; }).join('') +
            (v.alt.length ? '<b class="neu">' + fmt(v.wert) + '</b>' : fmt(v.wert));
        return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + inhalt + '</td>';
    }

    function tabelle(g, zeilen, eingabe) {
        var reihe = ids(g);
        var h = '<table class="dj-tab"><caption>Knoten und Pfadlänge ausgehend von ' + name(g, g.start) + '</caption><thead><tr><th scope="col">Schritt</th>' +
            reihe.map(function (n) { return '<th scope="col">' + name(g, n) + '</th>'; }).join('') + '</tr></thead><tbody>';
        zeilen.forEach(function (r, i) {
            h += '<tr><th scope="row">' + (i + 1) + '</th>' + reihe.map(function (n) { return zelle(g, r, n); }).join('') + '</tr>';
        });
        if (eingabe) {
            h += '<tr class="dj-eingabe"><th scope="row">' + (zeilen.length + 1) + '</th>' + reihe.map(function (n) {
                if (n === eingabe.aktuell) return '<td class="dj-a">' + fmt(eingabe.dist[n]) + '</td>';
                if (enthaelt(eingabe.fertig, n)) return '<td class="dj-f">' + fmt(eingabe.dist[n]) + '</td>';
                return '<td><input type="text" inputmode="numeric" autocomplete="off" data-n="' + n + '" placeholder="' + fmt(eingabe.dist[n]) +
                    '" aria-label="Pfadlänge von ' + name(g, n) + ' (leer lassen: bleibt ' + fmt(eingabe.dist[n]) + ')"></td>';
            }).join('') + '</tr>';
        }
        if (!zeilen.length && !eingabe) {
            h += '<tr><td colspan="' + (reihe.length + 1) + '" class="dj-leer">Noch kein Schritt: Die Tabelle füllt sich Zeile für Zeile.</td></tr>';
        }
        return h + '</tbody></table>';
    }

    function legende() {
        return '<p class="dj-legende"><span class="l-akt">aktuell besucht</span><span class="l-fer">fertig</span><span class="l-off">noch nicht fertig</span>' +
            '<span class="l-pruef">Kante wird geprüft</span><span class="l-weg">kürzester Weg</span></p>';
    }

    // ------------------------------------------------------------------
    // Werkstatt: Zeigen (Vorführung) und Selbst rechnen (Trainer)
    // ------------------------------------------------------------------
    function werkstatt(box) {
        var liste = (box.getAttribute('data-dj') || 'freibad').split(',').map(function (s) { return s.trim(); });
        var modi = box.getAttribute('data-dj-modus') || 'beide';
        box.classList.add('dj');
        box.innerHTML =
            '<div class="dj-kopf werkstatt-knoepfe">' +
            (liste.length > 1 ? '<label>Graph <select data-dj-graph></select></label>' : '') +
            (modi === 'beide' ? '<span class="dj-modi" role="group" aria-label="Modus"><button type="button" data-modus="zeigen">👀 Zeigen</button>' +
                '<button type="button" data-modus="rechnen">✍️ Selbst rechnen</button></span>' : '') +
            '<button type="button" data-dj-zufall hidden>🎲 Neuer Zufallsgraph</button></div>' +
            '<div class="dj-haupt"><div class="dj-bild"><svg class="graph-svg" role="img" aria-label="Graph"></svg>' + legende() + '</div>' +
            '<div class="dj-seite"><div class="dj-text" aria-live="polite"></div><div class="dj-steuer werkstatt-knoepfe"></div></div></div>' +
            '<div class="tab-scroll dj-tabelle"></div>';
        var svg = box.querySelector('svg'), text = box.querySelector('.dj-text'), steuer = box.querySelector('.dj-steuer');
        var tab = box.querySelector('.dj-tabelle'), auswahl = box.querySelector('[data-dj-graph]');
        var zufallKnopf = box.querySelector('[data-dj-zufall]');
        var modusKnoepfe = box.querySelectorAll('[data-modus]');
        var g, modus = modi === 'rechnen' ? 'rechnen' : 'zeigen', bilder, pos, t;

        if (auswahl) {
            liste.forEach(function (id) {
                var o = document.createElement('option');
                o.value = id;
                o.textContent = id === 'zufall' ? 'Zufallsgraph' : DJ_GRAPHEN[id].titel;
                auswahl.appendChild(o);
            });
            auswahl.addEventListener('change', function () { ladeGraph(auswahl.value); });
        }
        modusKnoepfe.forEach(function (k) {
            k.addEventListener('click', function () { if (!k.disabled) { modus = k.getAttribute('data-modus'); neu(); } });
        });
        zufallKnopf.addEventListener('click', function () { g = zufallsGraph(); neu(); });

        function ladeGraph(id) {
            g = id === 'zufall' ? zufallsGraph() : DJ_GRAPHEN[id];
            zufallKnopf.hidden = id !== 'zufall';
            var zeigbar = g.zeigen !== 0;
            modusKnoepfe.forEach(function (k) {
                if (k.getAttribute('data-modus') === 'zeigen') {
                    k.disabled = !zeigbar;
                    k.title = zeigbar ? '' : 'Für diesen Graphen gibt es keine Vorführung: Rechne selbst.';
                }
            });
            if (!zeigbar && modus === 'zeigen') modus = 'rechnen';
            neu();
        }

        function neu() {
            modusKnoepfe.forEach(function (k) { k.setAttribute('aria-pressed', k.getAttribute('data-modus') === modus ? 'true' : 'false'); });
            svg.setAttribute('aria-label', 'Graph ' + (g.titel || '') + ', Start ' + name(g, g.start));
            if (modus === 'zeigen') starteZeigen(); else starteRechnen();
        }

        // ----- Zeigen -----
        function starteZeigen() {
            bilder = verlauf(g);
            if (g.zeigen) {
                var stopp = -1;
                bilder.forEach(function (b, i) { if (stopp < 0 && b.art === 'fertig' && b.schritt === g.zeigen) stopp = i; });
                if (stopp >= 0 && stopp < bilder.length - 1) {
                    bilder = bilder.slice(0, stopp + 1);
                    var b = klon(bilder[stopp]);
                    b.art = 'stopp';
                    b.text = '<p class="dj-schritt">Ab Schritt ' + (g.zeigen + 1) + ' bist du dran!</p><p>Rechne die weiteren Schritte auf dem Blatt. ' +
                        'Kontrollieren kannst du sie mit <b>✍️ Selbst rechnen</b>.</p>';
                    bilder.push(b);
                }
            }
            pos = 0;
            steuer.innerHTML = '<button type="button" data-z="zurueck">◀ Zurück</button><button type="button" data-z="weiter">Weiter ▶</button>' +
                '<button type="button" data-z="schritt">Ganzer Schritt ⏭</button><button type="button" data-z="ende">Bis zum Ende ⏩</button>' +
                '<button type="button" data-z="neu">↺ Neu</button><span class="dj-zaehler" aria-hidden="true"></span>';
            steuer.querySelector('[data-z="zurueck"]').addEventListener('click', function () { geheZu(pos - 1); });
            steuer.querySelector('[data-z="weiter"]').addEventListener('click', function () { geheZu(pos + 1); });
            steuer.querySelector('[data-z="schritt"]').addEventListener('click', function () {
                var i = pos + 1;
                while (i < bilder.length - 1 && ['fertig', 'ende', 'stopp'].indexOf(bilder[i].art) === -1) i++;
                geheZu(i);
            });
            steuer.querySelector('[data-z="ende"]').addEventListener('click', function () { geheZu(bilder.length - 1); });
            steuer.querySelector('[data-z="neu"]').addEventListener('click', function () { geheZu(0); });
            geheZu(0);
        }

        function geheZu(i) {
            pos = Math.max(0, Math.min(bilder.length - 1, i));
            var b = bilder[pos];
            zeichneZustand(svg, g, b);
            text.innerHTML = b.text;
            tab.innerHTML = tabelle(g, b.zeilen);
            steuer.querySelector('[data-z="zurueck"]').disabled = pos === 0;
            ['weiter', 'schritt', 'ende'].forEach(function (z) { steuer.querySelector('[data-z="' + z + '"]').disabled = pos === bilder.length - 1; });
            steuer.querySelector('.dj-zaehler').textContent = (pos + 1) + ' / ' + bilder.length;
        }

        // ----- Selbst rechnen -----
        function starteRechnen() {
            var reihe = ids(g);
            t = { dist: {}, vorg: {}, fertig: [], aktuell: g.start, zeilen: [], phase: 'eingeben', fehler: 0, weg: [] };
            reihe.forEach(function (n) { t.dist[n] = n === g.start ? 0 : INF; });
            zeigeRechnen('<p class="dj-schritt">Schritt 1</p><p><b class="karte-b">W O R</b> Start ist <b>' + name(g, g.start) + '</b> mit Pfadlänge 0, alle anderen haben ∞. ' +
                name(g, g.start) + ' ist orange.</p><p>Trage in die Zeile unter der Tabelle ein, welche Pfadlängen sich über ' + name(g, g.start) +
                ' ändern. Leere Felder behalten ihren Wert (grau).</p>');
        }

        function erwartet() {
            var e = {};
            ids(g).forEach(function (n) { e[n] = t.dist[n]; });
            nachbarn(g, t.aktuell).forEach(function (x) {
                if (enthaelt(t.fertig, x.v)) return;
                var neu = t.dist[t.aktuell] + x.w;
                if (neu < e[x.v]) e[x.v] = neu;
            });
            return e;
        }

        function zustandRechnen() {
            var pruef = t.phase === 'eingeben' ? nachbarn(g, t.aktuell).filter(function (x) { return !enthaelt(t.fertig, x.v); })
                .map(function (x) { return [t.aktuell, x.v]; }) : [];
            return { dist: t.dist, fertig: t.fertig, aktuell: t.phase === 'eingeben' ? t.aktuell : null, zeilen: t.zeilen, pruef: pruef, jetzt: null, weg: t.weg };
        }

        function zeigeRechnen(meldung) {
            var offen = ids(g).filter(function (n) { return !enthaelt(t.fertig, n); });
            zeichneZustand(svg, g, zustandRechnen(), t.phase === 'waehlen' ? offen : []);
            text.innerHTML = meldung;
            tab.innerHTML = tabelle(g, t.zeilen, t.phase === 'eingeben' ? { aktuell: t.aktuell, fertig: t.fertig, dist: t.dist } : null);
            steuer.innerHTML = '';
            if (t.phase === 'eingeben') {
                knopf('✔ Prüfen', pruefeZeile);
                tab.querySelectorAll('input').forEach(function (inp) {
                    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') pruefeZeile(); });
                });
                var erstes = tab.querySelector('input');
                if (erstes && box.contains(document.activeElement)) erstes.focus();
            } else if (t.phase === 'waehlen') {
                var p = document.createElement('span');
                p.className = 'dj-frage';
                p.textContent = 'Nächster Knoten:';
                steuer.appendChild(p);
                offen.forEach(function (n) { knopf(name(g, n), function () { waehle(n); }); });
                knopf('keiner mehr erreichbar', function () { waehle(null); });
            } else if (t.phase === 'weg') {
                steuer.innerHTML = '<label class="dj-weg-eingabe">Weg <input type="text" autocomplete="off" placeholder="z. B. ' +
                    ids(g).slice(0, 3).map(function (n) { return name(g, n); }).join(' ') + ' …"></label>';
                var inp = steuer.querySelector('input');
                inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') pruefeWeg(inp.value); });
                knopf('✔ Prüfen', function () { pruefeWeg(inp.value); });
                if (box.contains(document.activeElement)) inp.focus();
            } else {
                knopf('↺ Noch einmal', starteRechnen);
                if (!zufallKnopf.hidden) knopf('🎲 Neuer Zufallsgraph', function () { g = zufallsGraph(); neu(); });
            }
        }

        function knopf(beschriftung, aktion) {
            var k = document.createElement('button');
            k.type = 'button';
            k.textContent = beschriftung;
            k.addEventListener('click', aktion);
            steuer.appendChild(k);
            return k;
        }

        function lies(s, vorher) {
            s = String(s).trim().replace('−', '-');
            if (s === '') return vorher;
            if (/^(∞|inf|unendlich|u|oo)$/i.test(s)) return INF;
            var z = Number(s.replace(',', '.'));
            return isFinite(z) && s !== '' ? z : NaN;
        }

        function pruefeZeile() {
            var e = erwartet(), falsch = 0, felder = tab.querySelectorAll('input');
            felder.forEach(function (inp) {
                var n = inp.getAttribute('data-n');
                var ok = lies(inp.value, t.dist[n]) === e[n];
                inp.classList.toggle('ok', ok);
                inp.classList.toggle('falsch', !ok);
                inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
                if (!ok) falsch++;
            });
            if (falsch) {
                t.fehler++;
                text.innerHTML = '<p class="dj-warn">' + falsch + (falsch === 1 ? ' Eintrag stimmt' : ' Einträge stimmen') + ' noch nicht (rot).</p>' +
                    '<p>Tipp: Für jeden Nachbarn über eine dicke Kante: Pfadlänge von ' + name(g, t.aktuell) + ' + Kantengewicht. ' +
                    'Nur wenn das <em>kleiner</em> ist als der bisherige Wert, wird er ersetzt.</p>';
                return;
            }
            var zeile = { aktuell: t.aktuell, fertig: t.fertig.slice(), werte: {} };
            ids(g).forEach(function (n) {
                var alt = [];
                if (e[n] < t.dist[n]) {
                    if (t.dist[n] < INF) alt.push(t.dist[n]);
                    t.vorg[n] = t.aktuell;
                }
                zeile.werte[n] = { wert: e[n], alt: alt };
            });
            t.zeilen.push(zeile);
            t.dist = e;
            var u = t.aktuell;
            t.fertig.push(u);
            if (t.fertig.length === ids(g).length) return ende('<p>✔ Richtig! <b class="karte-b">D</b> ' + name(g, u) + ' ist fertig (blau).</p>');
            t.phase = 'waehlen';
            zeigeRechnen('<p>✔ Richtig! <b class="karte-b">D</b> ' + name(g, u) + ' ist jetzt fertig (blau).</p>' +
                '<p class="dj-schritt">Schritt ' + (t.zeilen.length + 1) + '</p><p><b class="karte-b">L</b> Welcher Knoten wird als Nächstes orange? Klicke ihn an.</p>');
        }

        function waehle(v) {
            var offen = ids(g).filter(function (n) { return !enthaelt(t.fertig, n); });
            var min = Math.min.apply(null, offen.map(function (n) { return t.dist[n]; }));
            if (v === null) {
                if (min === INF) return ende('<p>✔ Richtig: Die übrigen Knoten (' + offen.map(function (n) { return name(g, n); }).join(', ') +
                    ') sind nicht erreichbar und behalten ∞.</p>');
                t.fehler++;
                text.innerHTML = '<p class="dj-warn">Doch: Mindestens ein Knoten, der noch nicht fertig ist, hat eine Pfadlänge kleiner als ∞.</p>';
                return;
            }
            if (min === INF) {
                t.fehler++;
                text.innerHTML = '<p class="dj-warn">' + name(g, v) + ' hat die Pfadlänge ∞: Er ist (noch) nicht erreichbar. Gibt es überhaupt noch einen erreichbaren Knoten?</p>';
                return;
            }
            if (t.dist[v] !== min) {
                t.fehler++;
                text.innerHTML = '<p class="dj-warn">' + name(g, v) + ' ist noch nicht dran.</p><p>Wähle unter den Knoten, die noch nicht fertig (blau) sind, den mit der <em>kleinsten</em> Pfadlänge.</p>';
                return;
            }
            t.aktuell = v;
            t.phase = 'eingeben';
            var dick = nachbarn(g, v).some(function (x) { return !enthaelt(t.fertig, x.v); });
            zeigeRechnen('<p>✔ Richtig: ' + name(g, v) + ' hat die kleinste Pfadlänge (' + fmt(min) + ') und wird orange.</p>' +
                '<p class="dj-schritt">Schritt ' + (t.zeilen.length + 1) + '</p><p><b class="karte-b">L</b> ' + (dick ?
                    'Prüfe die dicken Kanten und trage die neuen Pfadlängen ein. Leere Felder behalten ihren Wert.' :
                    name(g, v) + ' hat keine Kante zu einem Knoten, der noch nicht fertig ist. Hier ändert sich nichts: Klicke auf Prüfen.') + '</p>');
        }

        function ende(meldung) {
            if (g.ziel && g.ziel !== g.start && t.dist[g.ziel] < INF) {
                t.phase = 'weg';
                zeigeRechnen(meldung + '<p><b>Alle Pfadlängen stehen fest.</b> Wie verläuft der kürzeste Weg von ' + name(g, g.start) + ' nach ' + name(g, g.ziel) +
                    ' (Länge ' + fmt(t.dist[g.ziel]) + ')? Gib die Knoten der Reihe nach ein.</p><p class="dj-klein">Tipp: Lies rückwärts. Über welchen Knoten bekam ' +
                    name(g, g.ziel) + ' seine endgültige Pfadlänge?</p>');
            } else {
                schluss(meldung);
            }
        }

        function normal(s) {
            return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
        }

        function pruefeWeg(eingabe) {
            var reihe = ids(g);
            var teile = String(eingabe).split(/[\s,;–\-→>]+/).filter(Boolean);
            var weg = teile.map(function (w) {
                var gefunden = reihe.filter(function (n) { return normal(n) === normal(w) || normal(name(g, n)) === normal(w); });
                return gefunden.length ? gefunden[0] : null;
            });
            var fehler = '';
            if (weg.length < 2 || weg.some(function (n) { return n === null; })) fehler = 'Ich erkenne nicht alle Knoten. Trenne sie mit Leerzeichen.';
            else if (weg[0] !== g.start) fehler = 'Der Weg muss bei ' + name(g, g.start) + ' beginnen.';
            else if (weg[weg.length - 1] !== g.ziel) fehler = 'Der Weg muss bei ' + name(g, g.ziel) + ' enden.';
            var laenge = 0;
            if (!fehler) {
                for (var i = 0; i + 1 < weg.length && !fehler; i++) {
                    var kante = nachbarn(g, weg[i]).filter(function (x) { return x.v === weg[i + 1]; })[0];
                    if (!kante) fehler = 'Zwischen ' + name(g, weg[i]) + ' und ' + name(g, weg[i + 1]) + ' gibt es keine (passende) Kante.';
                    else laenge += kante.w;
                }
            }
            if (!fehler && laenge !== t.dist[g.ziel]) fehler = 'Diesen Weg gibt es, aber er ist ' + fmt(laenge) + ' lang. Der kürzeste ist ' + fmt(t.dist[g.ziel]) + ' lang.';
            if (fehler) {
                t.fehler++;
                text.querySelectorAll('.dj-warn').forEach(function (p) { p.remove(); });
                text.insertAdjacentHTML('beforeend', '<p class="dj-warn">' + fehler + '</p>');
                return;
            }
            t.weg = [];
            for (var j = 0; j + 1 < weg.length; j++) t.weg.push([weg[j], weg[j + 1]]);
            schluss('<p>✔ Richtig! Der kürzeste Weg ist <b>' + weg.map(function (n) { return name(g, n); }).join(' – ') + '</b> (grün), Länge ' + fmt(laenge) + '.</p>');
        }

        function schluss(meldung) {
            t.phase = 'fertig';
            zeigeRechnen(meldung + '<p><b>Geschafft!</b> ' + (t.fehler ? 'Fehlversuche: ' + t.fehler + '.' : 'Ohne einen einzigen Fehler. 🎉') + '</p>');
        }

        svg.addEventListener('click', function (e) {
            var k = e.target.closest('g.knoten');
            if (k && modus === 'rechnen' && t && t.phase === 'waehlen' && !enthaelt(t.fertig, k.getAttribute('data-id'))) waehle(k.getAttribute('data-id'));
        });

        ladeGraph(liste[0]);
    }

    // ------------------------------------------------------------------
    // Routenplaner zum Freibad (Aufgabe 1)
    // ------------------------------------------------------------------
    var KARTE = {
        knoten: {
            H: { x: 85, y: 195, name: '🏠 Haus' }, W: { x: 240, y: 70, name: '🌲 Wald' }, E: { x: 460, y: 70, name: '🍦 Eisdiele' },
            K: { x: 340, y: 330, name: '⛪ Kirche' }, F: { x: 545, y: 200, name: '🏊 Freibad' }
        },
        kanten: DJ_GRAPHEN.freibad.kanten
    };

    function routenplaner(box) {
        box.classList.add('route');
        box.innerHTML = '<div class="werkstatt-knoepfe" role="group" aria-label="Aufgabe"><button type="button" data-ra="a">a) kürzester Weg</button>' +
            '<button type="button" data-ra="b">b) Samstag: über den Wald</button></div>' +
            '<div class="dj-haupt"><div class="dj-bild"><svg class="graph-svg" viewBox="0 0 630 380" role="img" aria-label="Karte mit Haus, Wald, Eisdiele, Kirche und Freibad"></svg></div>' +
            '<div class="dj-seite"><div class="dj-text" aria-live="polite"></div><div class="dj-steuer werkstatt-knoepfe"></div>' +
            '<div class="route-versuche"></div></div></div>';
        var svg = box.querySelector('svg'), text = box.querySelector('.dj-text'), steuer = box.querySelector('.dj-steuer');
        var versucheBox = box.querySelector('.route-versuche');
        var route, aufgabe = 'a', versuche = { a: [], b: [] };

        function laenge(r) {
            var l = 0;
            for (var i = 0; i + 1 < r.length; i++) {
                l += KARTE.kanten.filter(function (k) { return kantePasst(k, [r[i], r[i + 1]]); })[0].gewicht;
            }
            return l;
        }
        function nachbarnVon(n) { return nachbarn(KARTE, n).map(function (x) { return x.v; }); }
        function txt(r) { return r.map(function (n) { return KARTE.knoten[n].name.replace(/^\S+ /, ''); }).join(' → '); }

        function zeige(meldung) {
            var letzter = route[route.length - 1], fertig = letzter === 'F' && route.length > 1;
            var klassen = {};
            if (!fertig) nachbarnVon(letzter).forEach(function (n) { klassen[n] = 'dj-klickbar'; });
            var hl = [];
            for (var i = 0; i + 1 < route.length; i++) hl.push([route[i], route[i + 1]]);
            window.Graphen.zeichne(svg, KARTE, { breite: 118, hoehe: 40, gewichte: true, einheit: ' km', hlKanten: hl, hlKnoten: route, klassen: klassen });
            text.innerHTML = '<p><b>Route:</b> ' + txt(route) + '</p><p><b>Länge:</b> ' + laenge(route) + ' km</p>' + (meldung || '');
            steuer.innerHTML = '';
            if (!fertig) {
                var s = document.createElement('span');
                s.className = 'dj-frage';
                s.textContent = 'Weiter nach:';
                steuer.appendChild(s);
                nachbarnVon(letzter).forEach(function (n) { knopf(KARTE.knoten[n].name, function () { gehe(n); }); });
            }
            knopf('◀ Zurück', function () { if (route.length > 1) { route.pop(); zeige(); } }).disabled = route.length < 2;
            knopf('↺ Neu', neu);
            versucheBox.innerHTML = versuche[aufgabe].length ? '<p><b>Deine Versuche:</b></p><ul>' + versuche[aufgabe].map(function (v) {
                return '<li>' + v + '</li>';
            }).join('') + '</ul>' : '';
        }

        function knopf(b, f) {
            var k = document.createElement('button');
            k.type = 'button';
            k.textContent = b;
            k.addEventListener('click', f);
            steuer.appendChild(k);
            return k;
        }

        function gehe(n) {
            route.push(n);
            if (n !== 'F') return zeige();
            var l = laenge(route), m;
            if (aufgabe === 'b' && route.indexOf('W') === -1) {
                m = '<p class="dj-warn">Felix muss am Samstag erst noch in den Wald!</p>';
            } else if (l === 15) {
                m = '<p class="dj-ok">✔ Kürzer geht es nicht!</p><p>Aber woher weißt du das sicher? Hast du alle anderen Wege ausprobiert?</p>';
            } else {
                m = '<p class="dj-warn">Am Freibad! Es gibt aber noch einen kürzeren Weg' + (aufgabe === 'b' ? ' über den Wald' : '') + '.</p>';
            }
            var eintrag = txt(route) + ': ' + l + ' km';
            if (versuche[aufgabe].indexOf(eintrag) === -1) versuche[aufgabe].push(eintrag);
            zeige(m);
        }

        function neu() {
            route = ['H'];
            box.querySelectorAll('[data-ra]').forEach(function (k) { k.setAttribute('aria-pressed', k.getAttribute('data-ra') === aufgabe ? 'true' : 'false'); });
            zeige('<p>' + (aufgabe === 'a' ? 'Klicke Ort für Ort an, bis du am Freibad bist.' : 'Am Samstag muss Felix zuerst in den Wald, dann ins Freibad.') + '</p>');
        }

        box.querySelectorAll('[data-ra]').forEach(function (k) {
            k.addEventListener('click', function () { aufgabe = k.getAttribute('data-ra'); neu(); });
        });
        svg.addEventListener('click', function (e) {
            var k = e.target.closest('g.knoten');
            if (!k) return;
            var n = k.getAttribute('data-id'), letzter = route[route.length - 1];
            if (!(letzter === 'F' && route.length > 1) && nachbarnVon(letzter).indexOf(n) !== -1) gehe(n);
        });
        neu();
    }

    // ------------------------------------------------------------------
    // Kartenrätsel (Aufgabe 3): Karten in die richtige Reihenfolge bringen
    // ------------------------------------------------------------------
    function kartenraetsel(box) {
        var loesung = box.getAttribute('data-reihenfolge').split('');
        var karten = Array.prototype.slice.call(box.querySelectorAll('button[data-b]'));
        var erfolg = box.querySelector('template[data-erfolg]');
        var reihe = document.createElement('ol');
        reihe.className = 'kr-reihe';
        reihe.setAttribute('aria-label', 'Deine Reihenfolge');
        var knoepfe = document.createElement('div');
        knoepfe.className = 'werkstatt-knoepfe';
        knoepfe.innerHTML = '<button type="button" data-kr="pruefen">✔ Prüfen</button><button type="button" data-kr="neu">↺ Neu</button>';
        var meldung = document.createElement('div');
        meldung.className = 'kr-meldung';
        meldung.setAttribute('aria-live', 'polite');
        var ausgabe = document.createElement('div');
        box.appendChild(reihe);
        box.appendChild(knoepfe);
        box.appendChild(meldung);
        box.appendChild(ausgabe);
        var gewaehlt = [];

        function zeige() {
            reihe.innerHTML = '';
            for (var i = 0; i < loesung.length; i++) {
                var li = document.createElement('li');
                var b = gewaehlt[i];
                if (b) {
                    var k = document.createElement('button');
                    k.type = 'button';
                    k.className = 'kr-platz voll';
                    k.innerHTML = '<span class="kr-b">' + b + '</span>';
                    k.setAttribute('aria-label', 'Platz ' + (i + 1) + ': Karte ' + b + ' (zum Entfernen klicken)');
                    k.addEventListener('click', (function (stelle) { return function () { gewaehlt.splice(stelle, 1); meldung.textContent = ''; zeige(); }; })(i));
                    li.appendChild(k);
                } else {
                    li.innerHTML = '<span class="kr-platz">' + (i + 1) + '</span>';
                }
                reihe.appendChild(li);
            }
            karten.forEach(function (k) {
                var drin = gewaehlt.indexOf(k.getAttribute('data-b')) !== -1;
                k.disabled = drin;
                k.setAttribute('aria-pressed', drin ? 'true' : 'false');
            });
        }

        karten.forEach(function (k) {
            k.addEventListener('click', function () {
                if (gewaehlt.length < loesung.length) gewaehlt.push(k.getAttribute('data-b'));
                meldung.textContent = '';
                zeige();
            });
        });
        knoepfe.querySelector('[data-kr="neu"]').addEventListener('click', function () {
            gewaehlt = [];
            meldung.textContent = '';
            meldung.className = 'kr-meldung';
            ausgabe.innerHTML = '';
            zeige();
        });
        knoepfe.querySelector('[data-kr="pruefen"]').addEventListener('click', function () {
            if (gewaehlt.length < loesung.length) {
                meldung.textContent = 'Lege zuerst alle ' + loesung.length + ' Karten.';
                meldung.className = 'kr-meldung';
                return;
            }
            var richtig = gewaehlt.filter(function (b, i) { return b === loesung[i]; }).length;
            if (richtig === loesung.length) {
                meldung.textContent = '✔ Hello ' + loesung.join('') + '! Trag das Lösungswort auf dem Blatt ein.';
                meldung.className = 'kr-meldung ok';
                if (erfolg && !ausgabe.firstChild) ausgabe.appendChild(document.importNode(erfolg.content, true));
            } else {
                meldung.textContent = richtig + ' von ' + loesung.length + ' Karten liegen an der richtigen Stelle. Tipp: Was muss feststehen, bevor man die kleinste Pfadlänge suchen kann?';
                meldung.className = 'kr-meldung falsch';
            }
        });
        zeige();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-route]').forEach(routenplaner);
        document.querySelectorAll('[data-dj]').forEach(werkstatt);
        document.querySelectorAll('[data-reihenfolge]').forEach(kartenraetsel);
    });

    window.Graphen.dijkstra = { graphen: DJ_GRAPHEN, verlauf: verlauf };
})();

/* ==========================================================================
   Lösungsweg (wie in informatik/12/rekursive-datenstrukturen/datenstrukturen.js):
   Tipps stufenweise, Lösung nur durch Gedrückthalten
     <div class="lw" data-loesungsweg="Aufgabe 4a">
       <template data-stufe="Tipp 1">…</template>
       <template data-stufe="Lösung" data-halten>…</template>
     </div>
   ========================================================================== */
(function () {
    'use strict';

    var HALTEZEIT = 1500;

    function loesungsweg(box) {
        var titel = box.getAttribute('data-loesungsweg') || '';
        var stufen = Array.prototype.slice.call(box.querySelectorAll('template[data-stufe]'));
        if (!stufen.length) return;
        var kopf = document.createElement('div');
        kopf.className = 'lw-kopf';
        kopf.textContent = '💡 Hilfe' + (titel ? ': ' + titel : '');
        var inhalt = document.createElement('div');
        inhalt.className = 'lw-inhalt';
        var knoepfe = document.createElement('div');
        knoepfe.className = 'lw-knoepfe';
        box.appendChild(kopf);
        box.appendChild(inhalt);
        box.appendChild(knoepfe);
        var stand = 0;

        function zeigeStufe(i) {
            var t = stufen[i];
            var teil = document.createElement('div');
            teil.className = 'lw-stufe' + (t.hasAttribute('data-halten') ? ' lw-loesung' : '');
            var marke = document.createElement('div');
            marke.className = 'lw-marke';
            marke.textContent = t.getAttribute('data-stufe');
            teil.appendChild(marke);
            teil.appendChild(document.importNode(t.content, true));
            inhalt.appendChild(teil);
            stand = i + 1;
            baueKnoepfe();
        }

        function zuruecksetzen() {
            inhalt.textContent = '';
            stand = 0;
            baueKnoepfe();
        }

        function baueKnoepfe() {
            knoepfe.textContent = '';
            if (stand < stufen.length) {
                var t = stufen[stand];
                var k = document.createElement('button');
                k.type = 'button';
                if (t.hasAttribute('data-halten')) {
                    k.className = 'lw-knopf lw-halten';
                    k.innerHTML = '<span class="lw-fortschritt"></span><span class="lw-text"></span>';
                    k.querySelector('.lw-text').textContent = t.getAttribute('data-stufe') + ' zeigen: gedrückt halten';
                    k.setAttribute('aria-label', t.getAttribute('data-stufe') + ' zeigen (Taste oder Maus ' + (HALTEZEIT / 1000) + ' Sekunden gedrückt halten)');
                    haltenAktivieren(k, function () { zeigeStufe(stand); });
                } else {
                    k.className = 'lw-knopf';
                    k.textContent = t.getAttribute('data-stufe') + ' zeigen';
                    k.addEventListener('click', function () { zeigeStufe(stand); });
                }
                knoepfe.appendChild(k);
            }
            if (stand > 0) {
                var weg = document.createElement('button');
                weg.type = 'button';
                weg.className = 'lw-knopf lw-weg';
                weg.textContent = 'wieder ausblenden';
                weg.addEventListener('click', zuruecksetzen);
                knoepfe.appendChild(weg);
            }
        }

        baueKnoepfe();
    }

    function haltenAktivieren(knopf, fertig) {
        var timer = null, balken = knopf.querySelector('.lw-fortschritt');
        function start(e) {
            if (timer) return;
            if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (e && e.type === 'keydown') e.preventDefault();
            balken.style.transition = 'width ' + HALTEZEIT + 'ms linear';
            balken.style.width = '100%';
            timer = setTimeout(function () { timer = null; fertig(); }, HALTEZEIT);
        }
        function stopp() {
            if (!timer) return;
            clearTimeout(timer);
            timer = null;
            balken.style.transition = 'width .2s';
            balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg);
    });
})();
