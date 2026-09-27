/*
 * Graphen (Informatik 11) – interaktive Elemente der Stationsseiten
 *
 *   Graphen.zeichne(svg, graph, optionen)  zeichnet einen Graphen als SVG
 *   Begriffe-Explorer (3.1)                 <div data-explorer>
 *   Adjazenzmatrix-Werkstatt (3.2)          <div data-werkstatt>
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
     *           hlKanten / hlKnoten (Listen), fehlKanten (Liste [a, b])
     * Eine Kante mit beide: true wird als Doppelpfeil gezeichnet.
     */
    function zeichne(svg, graph, optionen) {
        var opt = Object.assign({ form: 'rechteck', breite: 108, hoehe: 34, radius: 22,
            gerichtet: false, gewichte: false, hlKanten: [], hlKnoten: [], fehlKanten: [],
            klassen: {} }, optionen);
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var id = 'pfeil' + (++zaehler);
        var defs = el('defs', {}, svg);
        [['', '#64748b'], ['-hl', '#d97706']].forEach(function (f) {
            var m = el('marker', { id: id + f[0], viewBox: '0 0 10 10', refX: 9, refY: 5,
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
            var cls = 'kante' + (hl ? ' hl' : '');
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
                t.textContent = k.gewicht;
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
            var g = el('g', { 'class': cls }, ebeneKnoten);
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
