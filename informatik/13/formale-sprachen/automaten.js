/*
 * Formale Sprachen (Informatik 13) – Werkzeuge zu 1.5 Endliche Automaten
 *
 *   <div data-automat-sim="lachen|zahlen|binaer" [data-tabelle="entdecken"]>
 *        Simulator: Eingabeband mit Lesekopf und RZK, Zustände und Pfeile leuchten beim Lesen auf.
 *        „Selbst verfolgen“: Du klickst den nächsten Zustand (bei nichtdeterministischen Automaten
 *        einen Weg nach dem anderen). „Vorführen“: Schritt für Schritt oder als Animation.
 *   <div data-automat-bau="option|wiederholung|smiley|zahlen|knobel|frei">
 *        Automaten-Baukasten: Zustände setzen, Pfeile ziehen, Übergangstabelle und Eigenschaften
 *        live, Wörter testen, Prüfstand mit Gegenbeispielsuche, Export als Java-Code fürs Projekt.
 *
 * Keine Abhängigkeiten. Eigene Automaten bleiben im Browser (localStorage).
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var RZ = 21;   // Radius eines Zustands

    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function s(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }
    function leeren(e) { while (e.firstChild) e.removeChild(e.firstChild); }
    function zeigeWort(w) { return w === '' ? 'ε' : w; }
    function speicherLesen(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function speicherSchreiben(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* privat */ } }
    function speicherLoeschen(k) { try { window.localStorage.removeItem(k); } catch (e) { /* privat */ } }
    var wenigBewegung = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function warte(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // =====================================================================
    // Modell
    //   { alphabet: 'ha', zustaende: [{ n: 'Z0', x, y, start, ende }], ue: [{ von, nach, z }],
    //     biegung: { 'Z0>Z2': 50 }, schleife: { Z2: 0 } }   (Winkel in Grad, 0 = rechts, -90 = oben)
    // =====================================================================
    function kopie(a) { return JSON.parse(JSON.stringify(a)); }
    function zustand(a, n) { return a.zustaende.filter(function (z) { return z.n === n; })[0]; }
    function startZustand(a) { return a.zustaende.filter(function (z) { return z.start; })[0]; }
    function alphabetVon(a) {
        if (a.alphabet) return a.alphabet.split('');
        var m = {};
        a.ue.forEach(function (u) { m[u.z] = true; });
        return Object.keys(m).sort();
    }
    function nachfolger(a, n, c) {
        return a.ue.filter(function (u) { return u.von === n && u.z === c; }).map(function (u) { return u.nach; });
    }
    function eigenschaften(a) {
        var alph = alphabetVon(a), det = true, detBsp = null, vollst = true, fehlt = [];
        a.zustaende.forEach(function (z) {
            alph.forEach(function (c) {
                var n = nachfolger(a, z.n, c).length;
                if (n > 1 && det) { det = false; detBsp = z.n + ' hat für „' + c + '“ ' + n + ' Pfeile'; }
                if (n === 0) { vollst = false; fehlt.push(z.n + '/' + c); }
            });
        });
        return { det: det, detBsp: detBsp, vollst: vollst, fehlt: fehlt, alphabet: alph };
    }
    // Mengen-Simulation (deterministisch und nichtdeterministisch)
    function lauf(a, wort) {
        var st = startZustand(a);
        var mengen = [st ? [st.n] : []], kanten = [];
        for (var i = 0; i < wort.length; i++) {
            var neu = [], k = [];
            mengen[i].forEach(function (n) {
                nachfolger(a, n, wort[i]).forEach(function (m) { if (neu.indexOf(m) < 0) neu.push(m); k.push(n + '>' + m); });
            });
            mengen.push(neu); kanten.push(k);
            if (!neu.length) break;
        }
        var letzte = mengen[mengen.length - 1];
        var ganz = mengen.length === wort.length + 1 && letzte.length > 0;
        return { mengen: mengen, kanten: kanten, abbruch: ganz ? null : mengen.length - 2,   // Index des Zeichens ohne Pfeil
                 akzeptiert: ganz && letzte.some(function (n) { return zustand(a, n).ende; }) };
    }
    function akzeptiert(a, wort) { return lauf(a, wort).akzeptiert; }
    // alle maximalen Wege (für „Selbst verfolgen“ bei nichtdeterministischen Automaten)
    function alleWege(a, wort) {
        var wege = [];
        (function gehe(pfad, i) {
            if (wege.length > 60) return;
            var n = pfad[pfad.length - 1];
            var nf = i < wort.length ? nachfolger(a, n, wort[i]) : [];
            if (i === wort.length || !nf.length) { wege.push(pfad.join(',') + (i < wort.length ? ',✗' : '')); return; }
            nf.forEach(function (m) { gehe(pfad.concat([m]), i + 1); });
        })([startZustand(a).n], 0);
        return wege;
    }

    // Beschriftung: Zeichen in Alphabet-Reihenfolge, Läufe ab 3 als „1–9“
    function beschriftung(zeichen, alph) {
        var sortiert = zeichen.slice().sort(function (x, y) {
            var a = alph.indexOf(x), b = alph.indexOf(y);
            return (a < 0 ? 999 + x.charCodeAt(0) : a) - (b < 0 ? 999 + y.charCodeAt(0) : b);
        });
        var teile = [], i = 0;
        while (i < sortiert.length) {
            var j = i;
            while (j + 1 < sortiert.length && /[0-9A-Za-z]/.test(sortiert[j]) && /[0-9A-Za-z]/.test(sortiert[j + 1]) &&
                   alph.indexOf(sortiert[j]) >= 0 && alph.indexOf(sortiert[j + 1]) === alph.indexOf(sortiert[j]) + 1) j++;
            teile.push(j - i >= 2 ? sortiert[i] + '–' + sortiert[j] : sortiert.slice(i, j + 1).join(', '));
            i = j + 1;
        }
        return teile.join(', ');
    }

    // =====================================================================
    // Zeichnen
    // =====================================================================
    function gruppen(a) {
        var m = {}, reihe = [];
        a.ue.forEach(function (u) {
            var k = u.von + '>' + u.nach;
            if (!m[k]) { m[k] = { von: u.von, nach: u.nach, zeichen: [], key: k }; reihe.push(m[k]); }
            if (m[k].zeichen.indexOf(u.z) < 0) m[k].zeichen.push(u.z);
        });
        return reihe;
    }
    function rich(winkel) { var r = winkel * Math.PI / 180; return { x: Math.cos(r), y: Math.sin(r) }; }

    // Geometrie eines Pfeils: { d, spitze: [x,y,winkel], lx, ly, laenge }
    function pfeilGeometrie(a, gr) {
        var p = zustand(a, gr.von), q = zustand(a, gr.nach);
        if (!p || !q) return null;
        if (gr.von === gr.nach) {
            var w = a.schleife && a.schleife[gr.von] !== undefined ? a.schleife[gr.von] : -90;
            var s0 = rich(w - 28), s1 = rich(w + 28), c0 = rich(w - 38), c1 = rich(w + 38), m = rich(w);
            var x0 = p.x + RZ * s0.x, y0 = p.y + RZ * s0.y, x3 = p.x + RZ * s1.x, y3 = p.y + RZ * s1.y;
            var cx0 = p.x + 3.3 * RZ * c0.x, cy0 = p.y + 3.3 * RZ * c0.y, cx1 = p.x + 3.3 * RZ * c1.x, cy1 = p.y + 3.3 * RZ * c1.y;
            return { d: 'M' + x0 + ',' + y0 + ' C' + cx0 + ',' + cy0 + ' ' + cx1 + ',' + cy1 + ' ' + x3 + ',' + y3,
                     spitze: [x3, y3, Math.atan2(y3 - cy1, x3 - cx1)],
                     lx: p.x + 2.95 * RZ * m.x, ly: p.y + 2.95 * RZ * m.y + 4 };
        }
        var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len, uy = dy / len, nx = uy, ny = -ux;
        var gegen = a.ue.some(function (u) { return u.von === gr.nach && u.nach === gr.von; });
        // läuft der gerade Pfeil durch einen anderen Zustand? Dann um ihn herum biegen.
        var verdeckt = a.zustaende.some(function (z) {
            if (z === p || z === q) return false;
            var t = ((z.x - p.x) * ux + (z.y - p.y) * uy);
            if (t <= 0 || t >= len) return false;
            var ax = p.x + t * ux - z.x, ay = p.y + t * uy - z.y;
            return Math.sqrt(ax * ax + ay * ay) < RZ + 10;
        });
        var b = a.biegung && a.biegung[gr.key] !== undefined ? a.biegung[gr.key] : (gegen ? 26 : verdeckt ? 34 : 0);
        if (!b) {
            var sx = p.x + RZ * ux, sy = p.y + RZ * uy, ex = q.x - RZ * ux, ey = q.y - RZ * uy;
            return { d: 'M' + sx + ',' + sy + ' L' + ex + ',' + ey, spitze: [ex, ey, Math.atan2(uy, ux)],
                     lx: (sx + ex) / 2 + nx * 11, ly: (sy + ey) / 2 + ny * 11 + 4 };
        }
        var mx = (p.x + q.x) / 2 + nx * b * 2, my = (p.y + q.y) / 2 + ny * b * 2;   // Kontrollpunkt
        function rand(z, kx, ky) { var vx = kx - z.x, vy = ky - z.y, l = Math.sqrt(vx * vx + vy * vy) || 1; return [z.x + RZ * vx / l, z.y + RZ * vy / l]; }
        var st = rand(p, mx, my), en = rand(q, mx, my);
        var tx = 0.25 * st[0] + 0.5 * mx + 0.25 * en[0], ty = 0.25 * st[1] + 0.5 * my + 0.25 * en[1];
        var sg = b > 0 ? 1 : -1;
        return { d: 'M' + st[0] + ',' + st[1] + ' Q' + mx + ',' + my + ' ' + en[0] + ',' + en[1],
                 spitze: [en[0], en[1], Math.atan2(en[1] - my, en[0] - mx)],
                 lx: tx + nx * 11 * sg, ly: ty + ny * 11 * sg + 4 };
    }

    // zeichnet den Automaten in die Gruppe g; opt: { aktiv: [n], leuchten: [key], auswahl, quelle, fang }
    function zeichneAutomat(a, g, opt) {
        opt = opt || {};
        leeren(g);
        var alph = alphabetVon(a), el = { zustand: {}, kante: {} };
        var kg = s('g', { 'class': 'au-kanten' }, g);
        gruppen(a).forEach(function (gr) {
            var geo = pfeilGeometrie(a, gr);
            if (!geo) return;
            var leuchtet = (opt.leuchten || []).indexOf(gr.key) >= 0;
            var e = s('g', { 'class': 'au-kante' + (leuchtet ? ' leuchtet' : '') + (opt.auswahl === 'k:' + gr.key ? ' gewaehlt' : ''), 'data-kante': gr.key }, kg);
            s('path', { d: geo.d, 'class': 'au-treffer' }, e);
            var pfad = s('path', { d: geo.d, 'class': 'au-linie' }, e);
            var x = geo.spitze[0], y = geo.spitze[1], w = geo.spitze[2];
            var l = 9, b = 4.6;
            var p1 = (x - l * Math.cos(w) + b * Math.sin(w)) + ',' + (y - l * Math.sin(w) - b * Math.cos(w));
            var p2 = (x - l * Math.cos(w) - b * Math.sin(w)) + ',' + (y - l * Math.sin(w) + b * Math.cos(w));
            s('polygon', { points: x + ',' + y + ' ' + p1 + ' ' + p2, 'class': 'au-spitze' }, e);
            var text = beschriftung(gr.zeichen, alph);
            var tb = Math.max(14, text.length * 8 + 6);
            s('rect', { x: geo.lx - tb / 2, y: geo.ly - 13, width: tb, height: 17, rx: 4, 'class': 'au-label-grund' }, e);
            s('text', { x: geo.lx, y: geo.ly, 'text-anchor': 'middle', 'class': 'au-label' }, e, text);
            el.kante[gr.key] = pfad;
        });
        var st = startZustand(a);
        if (st) {
            var sw = a.startWinkel !== undefined ? a.startWinkel : 180, r = rich(sw);
            var x0 = st.x + (RZ + 40) * r.x, y0 = st.y + (RZ + 40) * r.y, x1 = st.x + RZ * r.x, y1 = st.y + RZ * r.y;
            s('path', { d: 'M' + x0 + ',' + y0 + ' L' + x1 + ',' + y1, 'class': 'au-linie au-startpfeil' }, g);
            var wi = Math.atan2(y1 - y0, x1 - x0);
            s('polygon', { points: x1 + ',' + y1 + ' ' + (x1 - 9 * Math.cos(wi) + 4.6 * Math.sin(wi)) + ',' + (y1 - 9 * Math.sin(wi) - 4.6 * Math.cos(wi)) + ' ' +
                (x1 - 9 * Math.cos(wi) - 4.6 * Math.sin(wi)) + ',' + (y1 - 9 * Math.sin(wi) + 4.6 * Math.cos(wi)), 'class': 'au-spitze' }, g);
            if (Math.abs(r.x) > 0.5) s('text', { x: (x0 + x1) / 2, y: y0 - 7, 'text-anchor': 'middle', 'class': 'au-start' }, g, 'Start');
            else s('text', { x: x0 + 6, y: (y0 + y1) / 2 + 4, 'text-anchor': 'start', 'class': 'au-start' }, g, 'Start');
        }
        a.zustaende.forEach(function (z) {
            var cls = 'au-zustand';
            if ((opt.aktiv || []).indexOf(z.n) >= 0) cls += ' aktiv';
            if (opt.auswahl === 'z:' + z.n) cls += ' gewaehlt';
            if (opt.quelle === z.n) cls += ' quelle';
            if (opt.falsch === z.n) cls += ' falsch';
            var e = s('g', { 'class': cls, 'data-zustand': z.n }, g);
            s('circle', { cx: z.x, cy: z.y, r: RZ, 'class': 'au-kreis' }, e);
            if (z.ende) s('circle', { cx: z.x, cy: z.y, r: RZ - 4.5, 'class': 'au-innen' }, e);
            s('text', { x: z.x, y: z.y + 5, 'text-anchor': 'middle', 'class': 'au-name' }, e, z.n);
            el.zustand[z.n] = e;
        });
        return el;
    }
    // Ein Punkt fährt einen Pfeil entlang
    function fahre(svg, pfad, ms) {
        if (!pfad || wenigBewegung || !pfad.getTotalLength) return warte(ms * 0.4);
        return new Promise(function (fertig) {
            var punkt = s('circle', { r: 6, 'class': 'au-zug' }, svg);
            var laenge = pfad.getTotalLength(), t0 = null;
            function schritt(t) {
                if (t0 === null) t0 = t;
                var f = Math.min(1, (t - t0) / ms);
                var p = pfad.getPointAtLength(f * laenge);
                punkt.setAttribute('cx', p.x); punkt.setAttribute('cy', p.y);
                if (f < 1) requestAnimationFrame(schritt);
                else { if (punkt.parentNode) punkt.parentNode.removeChild(punkt); fertig(); }
            }
            requestAnimationFrame(schritt);
        });
    }
    function rahmen(a, rand) {
        var xs = a.zustaende.map(function (z) { return z.x; }), ys = a.zustaende.map(function (z) { return z.y; });
        var r = rand || 70;
        return [Math.min.apply(null, xs) - r - 10, Math.min.apply(null, ys) - r, Math.max.apply(null, xs) - Math.min.apply(null, xs) + 2 * r + 10, Math.max.apply(null, ys) - Math.min.apply(null, ys) + 2 * r];
    }

    // Übergangstabelle als HTML; zelle(z, c) liefert Text oder null (dann aus dem Automaten)
    function tabelle(a, zelle) {
        var alph = alphabetVon(a);
        var t = h('table', { cls: 'au-tab' });
        var kopf = h('tr', {}, [h('th', { text: '' })]);
        alph.forEach(function (c) { kopf.appendChild(h('th', { cls: 'mono', text: c })); });
        t.appendChild(kopf);
        a.zustaende.forEach(function (z) {
            var tr = h('tr', {}, [h('th', { text: z.n + (z.ende ? ' ◎' : '') })]);
            alph.forEach(function (c) {
                var inhalt = zelle ? zelle(z.n, c) : null;
                if (inhalt === null || inhalt === undefined) {
                    var nf = nachfolger(a, z.n, c);
                    inhalt = nf.length ? nf.join(', ') : '–';
                    tr.appendChild(h('td', { cls: nf.length > 1 ? 'mehrfach' : nf.length ? '' : 'leer', text: inhalt, 'data-zelle': z.n + '|' + c }));
                } else tr.appendChild(h('td', { cls: inhalt === '?' ? 'offen' : '', text: inhalt, 'data-zelle': z.n + '|' + c }));
            });
            t.appendChild(tr);
        });
        return t;
    }

    // =====================================================================
    // Automaten der Stationsseite (wie auf Blatt 1.5)
    // =====================================================================
    var AUTOMATEN = {
        lachen: {
            name: 'Lachen im Chat', beispiele: ['ha', 'haha', 'hah', 'haa', 'aha', ''],
            a: { alphabet: 'ha', zustaende: [{ n: 'Z0', x: 60, y: 70, start: true }, { n: 'Z1', x: 190, y: 70 }, { n: 'Z2', x: 320, y: 70, ende: true }],
                 ue: [{ von: 'Z0', nach: 'Z1', z: 'h' }, { von: 'Z1', nach: 'Z2', z: 'a' }, { von: 'Z2', nach: 'Z1', z: 'h' }] }
        },
        zahlen: {
            name: 'Ganze Zahlen', beispiele: ['-12', '-', '12-', '007', '0', '2026', '-0'],
            a: { alphabet: '-0123456789',
                 zustaende: [{ n: 'Z0', x: 60, y: 80, start: true }, { n: 'Z1', x: 200, y: 80 }, { n: 'Z2', x: 380, y: 80, ende: true }, { n: 'Z3', x: 60, y: 200, ende: true }],
                 ue: [{ von: 'Z0', nach: 'Z1', z: '-' }, { von: 'Z0', nach: 'Z3', z: '0' }]
                     .concat('123456789'.split('').map(function (c) { return { von: 'Z1', nach: 'Z2', z: c }; }))
                     .concat('123456789'.split('').map(function (c) { return { von: 'Z0', nach: 'Z2', z: c }; }))
                     .concat('0123456789'.split('').map(function (c) { return { von: 'Z2', nach: 'Z2', z: c }; })),
                 biegung: { 'Z0>Z2': 34 }, schleife: { Z2: 0 }, startWinkel: -90 }
        },
        binaer: {
            name: 'Ungerade Binärzahlen (nichtdeterministisch)', beispiele: ['1', '11', '101', '10', '110', '0'],
            a: { alphabet: '01', zustaende: [{ n: 'Z0', x: 60, y: 80, start: true }, { n: 'Z1', x: 190, y: 80 }, { n: 'Z2', x: 320, y: 80, ende: true }],
                 ue: [{ von: 'Z0', nach: 'Z1', z: '1' }, { von: 'Z1', nach: 'Z1', z: '0' }, { von: 'Z1', nach: 'Z1', z: '1' }, { von: 'Z1', nach: 'Z2', z: '1' }, { von: 'Z0', nach: 'Z2', z: '1' }],
                 biegung: { 'Z0>Z2': -38 } }
        }
    };

    // =====================================================================
    // Simulator
    // =====================================================================
    function simulator(box) {
        var art = box.getAttribute('data-automat-sim') || 'lachen';
        var vorlage = AUTOMATEN[art];
        var a = kopie(vorlage.a);
        var entdecken = box.getAttribute('data-tabelle') === 'entdecken';
        var det = eigenschaften(a).det;

        // Bedienung
        var feld = h('input', { type: 'text', cls: 'mono', maxlength: '16', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Eingabe', value: vorlage.beispiele[0] });
        var bsp = h('div', { cls: 'beispiele' });
        vorlage.beispiele.forEach(function (w) {
            var b = h('button', { type: 'button', text: zeigeWort(w) });
            b.addEventListener('click', function () { feld.value = w; neu(); });
            bsp.appendChild(b);
        });
        var modusName = 'au-modus-' + art + '-' + Math.random().toString(36).slice(2, 7);
        var mSelbst = h('input', { type: 'radio', name: modusName, value: 'selbst', checked: '' });
        var mZeigen = h('input', { type: 'radio', name: modusName, value: 'zeigen' });
        if (box.getAttribute('data-modus') === 'zeigen') { mZeigen.checked = true; mSelbst.checked = false; }
        var kNeu = h('button', { type: 'button', cls: 'knopf', text: '⏮ Neu starten' });
        var kSchritt = h('button', { type: 'button', cls: 'knopf voll', text: 'Schritt ▶' });
        var kAbspielen = h('button', { type: 'button', cls: 'knopf', text: '⏵ Abspielen' });
        var kAbbruch = h('button', { type: 'button', cls: 'knopf', text: '✋ kein passender Pfeil' });
        var kJa = h('button', { type: 'button', cls: 'knopf', text: 'ja' });
        var kNein = h('button', { type: 'button', cls: 'knopf', text: 'nein' });

        var bandEl = h('div', { cls: 'au-band', 'aria-live': 'polite' });
        var rzkEl = h('div', { cls: 'au-rzk' });
        var anzeige = h('div', { cls: 'au-anzeige' }, [h('small', { text: 'Aktuell' }), h('span', { cls: 'au-anzeige-z' })]);
        var svg = s('svg', { 'class': 'au-svg', role: 'img', 'aria-label': 'Zustandsübergangsdiagramm: ' + vorlage.name });
        var r = rahmen(a, 80);
        svg.setAttribute('viewBox', r.join(' '));
        svg.style.maxWidth = Math.round(r[2] * 1.6) + 'px';
        var g = s('g', {}, svg);
        var frage = h('div', { cls: 'au-frage', 'aria-live': 'polite' });
        var protokoll = h('p', { cls: 'au-protokoll mono' });
        var meldung = h('p', { cls: 'au-meldung', 'aria-live': 'polite' });
        var tabBox = h('div', { cls: 'au-tabbox' });
        var ergebnisse = h('table', { cls: 'au-ergebnisse' });
        var wegeEl = h('div', { cls: 'au-wege' });

        box.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Eingabe: ', feld]), h('span', { cls: 'hinweiszeile', text: 'Beispiele:' }), bsp]));
        box.appendChild(h('div', { cls: 'knopfzeile au-modi', role: 'radiogroup', 'aria-label': 'Modus' }, [
            h('label', {}, [mSelbst, ' 🎯 Selbst verfolgen']), h('label', {}, [mZeigen, ' ▶ Vorführen'])]));
        box.appendChild(h('div', { cls: 'au-maschine' }, [h('div', { cls: 'au-bandzeile' }, [bandEl, anzeige]), rzkEl]));
        box.appendChild(h('div', { cls: 'au-flaeche' }, [svg]));
        box.appendChild(frage);
        box.appendChild(h('div', { cls: 'knopfzeile au-steuer' }, [kNeu, kSchritt, kAbspielen, kAbbruch]));
        box.appendChild(meldung);
        box.appendChild(protokoll);
        if (!det) box.appendChild(wegeEl);
        box.appendChild(h('div', { cls: 'au-unten' }, [tabBox, h('div', { cls: 'tab-scroll' }, [ergebnisse])]));

        var wort, i, menge, pfad, fertig, laeuft = false, leuchten = [], falsch = null, fehlerZahl, gefunden = {};
        var entdeckt = {};
        function modus() { return mSelbst.checked ? 'selbst' : 'zeigen'; }
        function neu() {
            wort = feld.value.slice(0, 16);
            i = 0; fertig = false; leuchten = []; falsch = null; fehlerZahl = 0;
            var st = startZustand(a);
            menge = [st.n]; pfad = [st.n];
            meldung.className = 'au-meldung'; meldung.textContent = '';
            leeren(frage);
            zeige();
        }
        function zeige() {
            var el = zeichneAutomat(a, g, { aktiv: menge, leuchten: leuchten, falsch: falsch });
            // Band
            leeren(bandEl);
            if (!wort.length) bandEl.appendChild(h('span', { cls: 'au-feld leer', text: 'ε' }));
            Array.from(wort).forEach(function (c, k) {
                bandEl.appendChild(h('span', { cls: 'au-feld' + (k < i ? ' gelesen' : k === i && !fertig ? ' aktuell' : ''), text: c }));
            });
            rzkEl.textContent = 'RZK: ' + (i < wort.length ? wort.slice(i) : 'leer');
            anzeige.querySelector('.au-anzeige-z').textContent = menge.length ? menge.join(', ') : '–';
            protokoll.textContent = 'Weg: ' + pfad.map(function (x, k) { return k ? ' –' + wort[k - 1] + '→ ' + x : x; }).join('') + (fertig && fertig.abbruch ? ' –' + wort[i] + '→ ✗' : '');
            var sel = modus() === 'selbst';
            kSchritt.hidden = sel; kAbspielen.hidden = sel; kAbbruch.hidden = !sel;
            kSchritt.disabled = laeuft || !!fertig; kAbspielen.disabled = laeuft || !!fertig;
            kAbbruch.disabled = !!fertig || i >= wort.length || laeuft;
            // im Selbst-Modus sind alle Zustände anklickbar
            Object.keys(el.zustand).forEach(function (n) {
                var z = el.zustand[n];
                if (sel && !fertig && i < wort.length && !laeuft) {
                    z.classList.add('klickbar');
                    z.setAttribute('tabindex', '0'); z.setAttribute('role', 'button'); z.setAttribute('aria-label', 'nach ' + n);
                    z.addEventListener('click', function () { tippe(n); });
                    z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tippe(n); } });
                }
            });
            if (sel && !fertig && i < wort.length && !laeuft) {
                frage.className = 'au-frage aktiv';
                frage.textContent = 'Der Lesekopf steht auf „' + wort[i] + '“. ' + (det ? 'In welchen Zustand wechselt der Automat?' : 'Wähle einen möglichen Folgezustand') + ' Klicke ihn an – oder auf „kein passender Pfeil“.';
            } else if (sel && !fertig && i >= wort.length && !laeuft) {
                frage.className = 'au-frage aktiv';
                leeren(frage);
                frage.appendChild(document.createTextNode((wort.length ? 'Die Eingabe ist ganz gelesen. ' : 'Die Eingabe ist leer. ') + (det ? 'Gehört ' + zeigeWort(wort) + ' zur Sprache?' : 'Endet dieser Weg erfolgreich?') + ' '));
                frage.appendChild(kJa); frage.appendChild(kNein);
            } else if (!fertig) { frage.className = 'au-frage'; frage.textContent = ''; }
            zeigeTabelle();
        }
        function zeigeTabelle() {
            leeren(tabBox);
            if (!entdecken) return;
            tabBox.appendChild(h('div', { cls: 'fahrt-label', text: 'Übergangstabelle: füllt sich mit jedem beobachteten Schritt' }));
            var t = tabelle(a, function (z, c) { return entdeckt[z + '|' + c] || '?'; });
            tabBox.appendChild(h('div', { cls: 'tab-scroll' }, [t]));
        }
        function merkeEntdeckt(von, c, nach) { if (det) entdeckt[von + '|' + c] = nach || '–'; }
        function ende(abbruch) {
            fertig = { abbruch: abbruch };
            var akz = !abbruch && menge.some(function (n) { return zustand(a, n).ende; });
            meldung.className = 'au-meldung rueck ' + (akz ? 'ok' : 'nein');
            meldung.textContent = abbruch ? '✗ Abbruch: Für „' + wort[i] + '“ gibt es keinen passenden Pfeil. Die Eingabe wird abgelehnt.' :
                det || modus() === 'zeigen' ? (akz ? '✓ ' + zeigeWort(wort) + ' wird akzeptiert.' : '✗ ' + zeigeWort(wort) + ' wird abgelehnt.') :
                (akz ? '✓ Dieser Weg endet erfolgreich.' : '✗ Dieser Weg endet nicht erfolgreich.');
            leeren(frage); frage.className = 'au-frage';
            protokolliere(akz, abbruch);
            zeige();
        }
        function protokolliere(akz, abbruch) {
            if (det) {
                if (!ergebnisse.firstChild) ergebnisse.appendChild(h('tr', {}, [h('th', { text: 'Eingabe' }), h('th', { text: 'Zustände' }), h('th', { text: 'Ergebnis' })]));
                ergebnisse.appendChild(h('tr', {}, [h('td', { cls: 'mono', text: zeigeWort(wort) }), h('td', { text: pfad.join(', ') + (abbruch ? ', kein Pfeil' : '') }), h('td', { text: akz ? 'akzeptiert' : 'abgelehnt' })]));
                return;
            }
            if (modus() !== 'selbst') return;
            var key = pfad.join(',') + (abbruch ? ',✗' : '');
            gefunden[wort] = gefunden[wort] || {};
            gefunden[wort][key] = akz;
            var alle = alleWege(a, wort);
            leeren(wegeEl);
            wegeEl.appendChild(h('div', { cls: 'fahrt-label', text: 'Deine Wege für ' + zeigeWort(wort) + ': ' + Object.keys(gefunden[wort]).length + ' von ' + alle.length + ' gefunden' + (Object.keys(gefunden[wort]).length < alle.length ? '. Starte neu und nimm einen anderen Weg.' : '. Alle gefunden!') }));
            var ul = h('ul', {});
            Object.keys(gefunden[wort]).forEach(function (k) {
                ul.appendChild(h('li', { cls: 'mono', text: k.replace(/,✗$/, ',Abbruch').split(',').join(', ') + (gefunden[wort][k] ? '  ✓ erfolgreich' : '  ✗ nicht erfolgreich') }));
            });
            wegeEl.appendChild(ul);
        }
        // Selbst verfolgen
        function tippe(n) {
            if (fertig || laeuft || i >= wort.length) return;
            var c = wort[i], von = pfad[pfad.length - 1];
            var moegl = nachfolger(a, von, c);
            if (moegl.indexOf(n) < 0) {
                fehlerZahl++;
                falsch = n;
                meldung.className = 'au-meldung rueck nein';
                meldung.textContent = moegl.length ? 'Nicht ganz: Gibt es von ' + von + ' einen Pfeil mit „' + c + '“ nach ' + n + '? Schau genau, wohin die Pfeile mit „' + c + '“ führen.' :
                    'Nicht ganz: Suche bei ' + von + ' einen Pfeil mit der Beschriftung „' + c + '“. Gibt es überhaupt einen?';
                zeige(); falsch = null;
                return;
            }
            meldung.className = 'au-meldung'; meldung.textContent = '';
            uebergang(von, n);
        }
        function uebergang(von, n) {
            laeuft = true;
            leuchten = [von + '>' + n];
            zeige();
            var el = g.querySelector('[data-kante="' + von + '>' + n + '"] .au-linie');
            fahre(svg, el, 550).then(function () {
                merkeEntdeckt(von, wort[i], n);
                pfad.push(n); menge = [n]; i++;
                laeuft = false;
                if (modus() === 'zeigen' && i >= wort.length) { ende(false); return; }
                zeige();
            });
        }
        kAbbruch.addEventListener('click', function () {
            if (fertig || i >= wort.length) return;
            var von = pfad[pfad.length - 1], moegl = nachfolger(a, von, wort[i]);
            if (moegl.length) {
                fehlerZahl++;
                meldung.className = 'au-meldung rueck nein';
                meldung.textContent = 'Doch: Von ' + von + ' führt ein Pfeil mit „' + wort[i] + '“ weiter. Suche ihn!';
                return;
            }
            merkeEntdeckt(von, wort[i], null);
            ende(true);
        });
        function antwort(ja) {
            var akz = menge.some(function (n) { return zustand(a, n).ende; });
            if (ja !== akz) {
                fehlerZahl++;
                meldung.className = 'au-meldung rueck nein';
                meldung.textContent = 'Überleg noch einmal: Die Eingabe ist ganz gelesen. Worin unterscheidet sich ' + menge[0] + ' von den anderen Zuständen – oder eben nicht?';
                return;
            }
            ende(false);
        }
        kJa.addEventListener('click', function () { antwort(true); });
        kNein.addEventListener('click', function () { antwort(false); });
        // Vorführen
        function schritt() {
            if (fertig || laeuft) return Promise.resolve();
            if (i >= wort.length) { ende(false); return Promise.resolve(); }
            var c = wort[i];
            if (det) {
                var von = menge[0], nf = nachfolger(a, von, c);
                if (!nf.length) { merkeEntdeckt(von, c, null); ende(true); return Promise.resolve(); }
                return new Promise(function (fertigP) { uebergang(von, nf[0]); var t = setInterval(function () { if (!laeuft) { clearInterval(t); fertigP(); } }, 40); });
            }
            // nichtdeterministisch: alle Wege gleichzeitig
            var neuM = [], k = [];
            menge.forEach(function (n) { nachfolger(a, n, c).forEach(function (m) { if (neuM.indexOf(m) < 0) neuM.push(m); k.push(n + '>' + m); }); });
            if (!neuM.length) { ende(true); return Promise.resolve(); }
            laeuft = true; leuchten = k; zeige();
            var fahrten = k.map(function (key) { return fahre(svg, g.querySelector('[data-kante="' + key + '"] .au-linie'), 550); });
            return Promise.all(fahrten).then(function () {
                menge = neuM; pfad.push('{' + neuM.join(', ') + '}'); i++; laeuft = false;
                if (i >= wort.length) { ende(false); return; }
                zeige();
            });
        }
        kSchritt.addEventListener('click', function () { schritt(); });
        kAbspielen.addEventListener('click', function () {
            (function weiter() { if (fertig) return; schritt().then(function () { if (!fertig) setTimeout(weiter, 250); }); })();
        });
        kNeu.addEventListener('click', neu);
        feld.addEventListener('keydown', function (e) { if (e.key === 'Enter') neu(); });
        feld.addEventListener('change', neu);
        mSelbst.addEventListener('change', neu); mZeigen.addEventListener('change', neu);
        neu();
    }

    // =====================================================================
    // Automaten-Baukasten
    // =====================================================================
    var SMILEY = /^[:;]-?[)(DP*]$/;
    var BAU = {
        option: {
            titel: 'Baustein Option: ["a"] "b"', alphabet: 'ab', ref: function (w) { return /^a?b$/.test(w); }, maxLaenge: 5,
            tests: [['b', true], ['ab', true], ['a', false], ['aab', false], ['', false], ['bb', false]],
            a: { zustaende: [{ n: 'Z0', x: 110, y: 140, start: true }, { n: 'Z1', x: 270, y: 140 }, { n: 'Z2', x: 430, y: 140, ende: true }], ue: [] }
        },
        wiederholung: {
            titel: 'Baustein Wiederholung: "a" {"b"}', alphabet: 'ab', ref: function (w) { return /^ab*$/.test(w); }, maxLaenge: 6,
            tests: [['a', true], ['ab', true], ['abbb', true], ['b', false], ['aa', false], ['aba', false]],
            a: { zustaende: [{ n: 'Z0', x: 140, y: 160, start: true }, { n: 'Z1', x: 330, y: 160, ende: true }], ue: [] }
        },
        smiley: {
            titel: 'Aufgabe 4: Smileys', alphabet: ':;-)(DP*', maxLaenge: 4,
            ref: function (w) { return SMILEY.test(w); },
            tests: [[':)', true], [';-D', true], [':-*', true], [';P', true], [':--)', false], [':-', false], ['-)', false], [':)-', false], ['', false]],
            variante: { titel: 'Aufgabe 4c: Smileyfolge = Smiley {Smiley}', ref: function (w) { return /^([:;]-?[)(DP*])+$/.test(w); },
                        tests: [[':-);D', true], [';P:-(:*', true], [':)', true], [':);', false], [':):-', false], ['', false]] },
            a: { zustaende: [{ n: 'Z0', x: 80, y: 150, start: true }], ue: [] }
        },
        zahlen: {
            titel: 'Aufgabe 5: Ganze Zahlen mit Fangzustand', alphabet: '-0123456789', maxLaenge: 4, verlangtVollstaendig: true,
            ref: function (w) { return /^(0|-?[1-9][0-9]*)$/.test(w); },
            tests: [['-12', true], ['0', true], ['2026', true], ['-', false], ['12-', false], ['007', false], ['-0', false], ['', false]],
            a: (function () { var z = kopie(AUTOMATEN.zahlen.a); delete z.alphabet; z.zustaende.forEach(function (q) { q.x += 20; q.y += 40; }); return z; })()
        },
        knobel: {
            titel: 'Knobeln', varianten: {
                'lachen': { titel: 'Lachen mit Ausrufezeichen: ha, haha!, hahaha!!! …', alphabet: 'ha!', maxLaenge: 7, ref: function (w) { return /^(ha)+!*$/.test(w); },
                            tests: [['ha', true], ['haha!!', true], ['ha!ha', false], ['!', false], ['hah!', false]] },
                'gerade': { titel: 'Wörter über {a, b} mit einer geraden Anzahl a', alphabet: 'ab', maxLaenge: 8, ref: function (w) { return (w.match(/a/g) || []).length % 2 === 0; },
                            tests: [['', true], ['b', true], ['aa', true], ['abab', true], ['a', false], ['bab', false], ['aaab', false]] },
                'ungerade': { titel: 'Ungerade Binärzahlen, aber deterministisch', alphabet: '01', maxLaenge: 8, deterministisch: true, ref: function (w) { return /^1([01]*1)?$/.test(w); },
                              tests: [['1', true], ['11', true], ['101', true], ['10', false], ['011', false], ['', false]] },
                'uhrzeit': { titel: 'Uhrzeiten hh:mm von 00:00 bis 23:59', alphabet: '0123456789:', maxLaenge: 5, ref: function (w) { return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(w); },
                             tests: [['00:00', true], ['23:59', true], ['19:07', true], ['24:00', false], ['12:60', false], ['7:30', false], ['12:3', false]] },
                'durch3': { titel: 'Profis: Binärzahlen ohne führende Null, die durch 3 teilbar sind', alphabet: '01', maxLaenge: 9, ref: function (w) { return /^(0|1[01]*)$/.test(w) && parseInt(w, 2) % 3 === 0; },
                            tests: [['0', true], ['11', true], ['110', true], ['1001', true], ['1', false], ['10', false], ['011', false], ['111', false]] }
            },
            a: { zustaende: [{ n: 'Z0', x: 80, y: 150, start: true }], ue: [] }
        },
        frei: { titel: 'Freies Bauen', alphabet: '', a: { zustaende: [{ n: 'Z0', x: 80, y: 150, start: true }], ue: [] } }
    };

    function automatenBau(box) {
        var art = box.getAttribute('data-automat-bau') || 'frei';
        var auftrag = BAU[art];
        var variante = null;
        var schluessel = function () { return 'fs13-aut-' + art + (variante ? '-' + variante : ''); };
        function aufgabe() {
            if (art === 'knobel') return auftrag.varianten[variante];
            if (art === 'smiley' && vSchalter && vSchalter.checked) return Object.assign({}, auftrag, auftrag.variante);
            return auftrag;
        }
        var a, verlauf = [], modus = 'auswahl', auswahl = null, quelle = null, ziehen = null, laeuft = false, leuchten = [], aktiv = [];
        var vWahl = null, vSchalter = null;
        if (art === 'knobel') {
            vWahl = h('select', { 'aria-label': 'Knobelaufgabe' });
            Object.keys(auftrag.varianten).forEach(function (k) { vWahl.appendChild(h('option', { value: k, text: auftrag.varianten[k].titel })); });
            variante = vWahl.value;
        }
        function laden() {
            var roh = speicherLesen(schluessel());
            try { a = roh ? JSON.parse(roh) : kopie(auftrag.a); } catch (e) { a = kopie(auftrag.a); }
            if (!a.zustaende) a = kopie(auftrag.a);
            a.alphabet = (aufgabe().alphabet || '') || a.alphabet || '';
            verlauf = []; auswahl = null; quelle = null;
        }

        // Werkzeugleiste
        var modi = {}, leiste = h('div', { cls: 'au-leiste', role: 'toolbar', 'aria-label': 'Werkzeuge' });
        [['auswahl', '✋ Auswählen / Verschieben'], ['zustand', '◯ Zustand setzen'], ['pfeil', '→ Pfeil ziehen'], ['loeschen', '🗑 Löschen']].forEach(function (m) {
            var b = h('button', { type: 'button', cls: 'knopf', text: m[1] });
            b.addEventListener('click', function () { modus = m[0]; quelle = null; auswahl = null; zeige(); });
            modi[m[0]] = b; leiste.appendChild(b);
        });
        var kRueck = h('button', { type: 'button', cls: 'knopf', text: '↶ rückgängig' });
        var kReset = h('button', { type: 'button', cls: 'knopf', text: 'Zurücksetzen' });
        leiste.appendChild(kRueck); leiste.appendChild(kReset);

        var BREITE = 600, HOEHE = 300;
        var svg = s('svg', { 'class': 'au-svg au-editor', viewBox: '0 0 ' + BREITE + ' ' + HOEHE, role: 'application', 'aria-label': 'Zeichenfläche für den Automaten' });
        s('rect', { x: 0, y: 0, width: BREITE, height: HOEHE, 'class': 'au-grund' }, svg);
        var g = s('g', {}, svg);
        var hilfe = h('p', { cls: 'au-hilfe', 'aria-live': 'polite' });
        var panel = h('div', { cls: 'au-panel' });
        var tabBox = h('div', { cls: 'au-tabbox' });
        var eigenEl = h('div', { cls: 'au-eigen' });

        var testFeld = h('input', { type: 'text', cls: 'mono', maxlength: '20', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Wort testen' });
        var kTest = h('button', { type: 'button', cls: 'knopf voll', text: '▶ abspielen' });
        var testAus = h('p', { cls: 'au-meldung', 'aria-live': 'polite' });
        var bandEl = h('div', { cls: 'au-band' });
        var kPruefen = h('button', { type: 'button', cls: 'knopf voll', text: '✓ Prüfen' });
        var pruefAus = h('div', { cls: 'pruefstand' });
        var kJava = h('button', { type: 'button', cls: 'knopf', text: '☕ als Java-Code' });
        var javaAus = h('div', { cls: 'au-java' });

        var kopfTeile = [h('strong', { cls: 'au-auftrag', text: auftrag.titel })];
        if (vWahl) kopfTeile = [h('label', {}, ['Aufgabe: ', vWahl])];
        if (art === 'smiley') {
            vSchalter = h('input', { type: 'checkbox' });
            kopfTeile.push(h('label', { cls: 'au-variante' }, [vSchalter, ' Prüfstand für 4c (Smileyfolge)']));
        }
        box.appendChild(h('div', { cls: 'knopfzeile' }, kopfTeile));
        box.appendChild(leiste);
        box.appendChild(hilfe);
        box.appendChild(h('div', { cls: 'au-bau' }, [h('div', { cls: 'au-flaeche' }, [svg]), h('div', {}, [panel, eigenEl, tabBox])]));
        box.appendChild(h('div', { cls: 'au-testbox' }, [
            h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Wort testen: ', testFeld]), kTest]),
            bandEl, testAus,
            h('div', { cls: 'knopfzeile' }, [kPruefen, art === 'frei' ? null : h('span', { cls: 'hinweiszeile', text: 'Prüft Stichproben und sucht automatisch nach Gegenbeispielen.' }), kJava]),
            pruefAus, javaAus
        ]));
        if (art === 'frei') kPruefen.hidden = true;

        function merke() { verlauf.push(JSON.stringify(a)); if (verlauf.length > 50) verlauf.shift(); }
        function sichern() { speicherSchreiben(schluessel(), JSON.stringify(a)); }
        function freierName() { var k = 0; while (zustand(a, 'Z' + k)) k++; return 'Z' + k; }
        function punkt(ev) {
            var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
            var m = svg.getScreenCTM();
            return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
        }
        function zeige() {
            Object.keys(modi).forEach(function (m) { modi[m].classList.toggle('aktiv', m === modus); });
            kRueck.disabled = !verlauf.length;
            svg.setAttribute('data-modus', modus);
            zeichneAutomat(a, g, { auswahl: auswahl, quelle: quelle, leuchten: leuchten, aktiv: aktiv });
            hilfe.textContent = {
                auswahl: 'Klicke einen Zustand oder Pfeil an, um ihn zu bearbeiten. Zustände kannst du mit der Maus verschieben.',
                zustand: 'Klicke auf eine freie Stelle: Dort entsteht ein neuer Zustand.',
                pfeil: quelle ? 'Jetzt den Zielzustand anklicken (derselbe Zustand ergibt eine Schleife).' : 'Klicke zuerst den Zustand an, von dem der Pfeil ausgeht.',
                loeschen: 'Klicke einen Zustand oder Pfeil an, um ihn zu löschen.'
            }[modus];
            zeigePanel();
            zeigeInfo();
        }
        function zeigePanel() {
            leeren(panel);
            if (auswahl && auswahl.indexOf('z:') === 0) {
                var z = zustand(a, auswahl.slice(2));
                if (!z) { auswahl = null; return; }
                var name = h('input', { type: 'text', value: z.n, maxlength: '6', 'aria-label': 'Name des Zustands' });
                var ende = h('input', { type: 'checkbox' }); ende.checked = !!z.ende;
                var kStart = h('button', { type: 'button', cls: 'knopf', text: z.start ? '✓ Startzustand' : 'zum Startzustand machen' });
                kStart.disabled = !!z.start;
                var kWeg = h('button', { type: 'button', cls: 'knopf', text: '🗑 löschen' });
                name.addEventListener('change', function () {
                    var n = name.value.trim().replace(/\s+/g, '');
                    if (!n || zustand(a, n)) { name.value = z.n; return; }
                    merke();
                    a.ue.forEach(function (u) { if (u.von === z.n) u.von = n; if (u.nach === z.n) u.nach = n; });
                    z.n = n; auswahl = 'z:' + n; aenderung();
                });
                ende.addEventListener('change', function () { merke(); z.ende = ende.checked; aenderung(); });
                kStart.addEventListener('click', function () { merke(); a.zustaende.forEach(function (q) { q.start = q === z; }); aenderung(); });
                kWeg.addEventListener('click', function () { loescheZustand(z.n); });
                panel.appendChild(h('h5', { text: 'Zustand ' + z.n }));
                panel.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Name: ', name]), h('label', {}, [ende, ' Endzustand'])]));
                panel.appendChild(h('div', { cls: 'knopfzeile' }, [kStart, kWeg]));
            } else if (auswahl && auswahl.indexOf('k:') === 0) {
                var key = auswahl.slice(2), teile = key.split('>');
                var zeichen = a.ue.filter(function (u) { return u.von + '>' + u.nach === key; }).map(function (u) { return u.z; });
                if (!zeichen.length) { auswahl = null; return; }
                var f = h('input', { type: 'text', cls: 'mono', value: beschriftung(zeichen, alphabetVon(a)), 'aria-label': 'Zeichen am Pfeil' });
                var ok = h('button', { type: 'button', cls: 'knopf voll', text: 'übernehmen' });
                var weg = h('button', { type: 'button', cls: 'knopf', text: '🗑 Pfeil löschen' });
                function setze() {
                    var z = zeichenAus(f.value);
                    if (!z) return;
                    merke();
                    a.ue = a.ue.filter(function (u) { return u.von + '>' + u.nach !== key; });
                    z.forEach(function (c) { a.ue.push({ von: teile[0], nach: teile[1], z: c }); });
                    aenderung();
                }
                ok.addEventListener('click', setze);
                f.addEventListener('keydown', function (e) { if (e.key === 'Enter') setze(); });
                weg.addEventListener('click', function () { merke(); a.ue = a.ue.filter(function (u) { return u.von + '>' + u.nach !== key; }); auswahl = null; aenderung(); });
                panel.appendChild(h('h5', { text: 'Pfeil ' + teile[0] + ' → ' + teile[1] }));
                panel.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Zeichen: ', f]), ok, weg]));
                panel.appendChild(h('p', { cls: 'hinweiszeile', text: 'Mehrere Zeichen mit Komma trennen (a, b) oder als Bereich (0-9).' }));
            } else if (pfeilZiel) {
                var fz = h('input', { type: 'text', cls: 'mono', maxlength: '30', 'aria-label': 'Zeichen für den neuen Pfeil' });
                var okz = h('button', { type: 'button', cls: 'knopf voll', text: 'Pfeil anlegen' });
                var abb = h('button', { type: 'button', cls: 'knopf', text: 'abbrechen' });
                function neuerPfeil() {
                    var z = zeichenAus(fz.value);
                    if (!z) { fz.focus(); return; }
                    merke();
                    z.forEach(function (c) {
                        if (!a.ue.some(function (u) { return u.von === pfeilZiel[0] && u.nach === pfeilZiel[1] && u.z === c; })) a.ue.push({ von: pfeilZiel[0], nach: pfeilZiel[1], z: c });
                    });
                    pfeilZiel = null; quelle = null;
                    aenderung();
                }
                okz.addEventListener('click', neuerPfeil);
                fz.addEventListener('keydown', function (e) { if (e.key === 'Enter') neuerPfeil(); if (e.key === 'Escape') { pfeilZiel = null; quelle = null; zeige(); } });
                abb.addEventListener('click', function () { pfeilZiel = null; quelle = null; zeige(); });
                panel.appendChild(h('h5', { text: 'Neuer Pfeil ' + pfeilZiel[0] + ' → ' + pfeilZiel[1] }));
                panel.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Zeichen: ', fz]), okz, abb]));
                panel.appendChild(h('p', { cls: 'hinweiszeile', text: 'z. B. h · oder a, b · oder 1-9. Ein Pfeil darf mehrere Zeichen tragen.' }));
                setTimeout(function () { fz.focus(); }, 0);
            } else {
                panel.appendChild(h('p', { cls: 'hinweiszeile', text: 'Nichts ausgewählt.' }));
            }
        }
        var pfeilZiel = null;
        function zeichenAus(text) {
            var teile = text.split(/[\s,]+/).filter(Boolean), z = [];
            for (var k = 0; k < teile.length; k++) {
                var t = teile[k];
                var m = /^(.)(?:-|–|…)(.)$/.exec(t);
                if (m && m[2].charCodeAt(0) > m[1].charCodeAt(0)) {
                    for (var c = m[1].charCodeAt(0); c <= m[2].charCodeAt(0); c++) z.push(String.fromCharCode(c));
                } else Array.from(t).forEach(function (c) { z.push(c); });
            }
            z = z.filter(function (c, i) { return z.indexOf(c) === i; });
            var alph = aufgabe().alphabet;
            if (alph) {
                var fremd = z.filter(function (c) { return alph.indexOf(c) < 0; });
                if (fremd.length) { hilfe.textContent = '„' + fremd.join('“, „') + '“ gehört nicht zum Eingabealphabet {' + alph.split('').join(', ') + '}.'; return null; }
            }
            if (!z.length) { hilfe.textContent = 'Gib mindestens ein Zeichen an.'; return null; }
            return z;
        }
        function loescheZustand(n) {
            merke();
            var war = zustand(a, n);
            a.zustaende = a.zustaende.filter(function (z) { return z.n !== n; });
            a.ue = a.ue.filter(function (u) { return u.von !== n && u.nach !== n; });
            if (war && war.start && a.zustaende.length) a.zustaende[0].start = true;
            auswahl = null;
            aenderung();
        }
        var tabelleZeigen = !box.hasAttribute('data-tabelle-versteckt');
        function zeigeInfo() {
            leeren(tabBox); leeren(eigenEl);
            if (!a.zustaende.length) return;
            tabBox.appendChild(h('div', { cls: 'fahrt-label', text: 'Übergangstabelle' }));
            if (tabelleZeigen) tabBox.appendChild(h('div', { cls: 'tab-scroll' }, [tabelle(a)]));
            else {
                var kz = h('button', { type: 'button', cls: 'knopf', text: 'Tabelle zeigen (erst nach 5a)' });
                kz.addEventListener('click', function () { tabelleZeigen = true; zeigeInfo(); });
                tabBox.appendChild(kz);
            }
            var e = eigenschaften(a);
            var liste = h('ul', { cls: 'au-eigen-liste' });
            liste.appendChild(h('li', { cls: startZustand(a) ? 'ja' : 'nein', text: startZustand(a) ? 'Startzustand: ' + startZustand(a).n : 'Es fehlt ein Startzustand.' }));
            var enden = a.zustaende.filter(function (z) { return z.ende; }).map(function (z) { return z.n; });
            liste.appendChild(h('li', { cls: enden.length ? 'ja' : 'nein', text: enden.length ? 'Endzustände: ' + enden.join(', ') : 'Noch kein Endzustand (Zustand anklicken, „Endzustand“ ankreuzen).' }));
            liste.appendChild(h('li', { cls: e.det ? 'ja' : 'nein', text: e.det ? 'deterministisch' : 'nichtdeterministisch: ' + e.detBsp }));
            liste.appendChild(h('li', { cls: e.vollst ? 'ja' : 'nein', text: e.vollst ? 'vollständig' : 'nicht vollständig: ' + e.fehlt.length + ' leere Felder in der Tabelle' }));
            eigenEl.appendChild(liste);
        }
        function aenderung() { sichern(); leuchten = []; aktiv = []; pruefAus.textContent = ''; leeren(javaAus); zeige(); }

        // Zeigerereignisse auf der Zeichenfläche
        function zielVon(ev) {
            var z = ev.target.closest && ev.target.closest('[data-zustand]');
            if (z) return { typ: 'z', n: z.getAttribute('data-zustand') };
            var k = ev.target.closest && ev.target.closest('[data-kante]');
            if (k) return { typ: 'k', key: k.getAttribute('data-kante') };
            return null;
        }
        svg.addEventListener('pointerdown', function (ev) {
            if (laeuft) return;
            var t = zielVon(ev), p = punkt(ev);
            if (modus === 'zustand') {
                if (t && t.typ === 'z') { auswahl = 'z:' + t.n; modus = 'auswahl'; zeige(); return; }
                if (a.zustaende.length >= 12) { hilfe.textContent = 'Mehr als 12 Zustände passen hier nicht hin.'; return; }
                merke();
                a.zustaende.push({ n: freierName(), x: Math.round(Math.max(30, Math.min(BREITE - 30, p.x))), y: Math.round(Math.max(30, Math.min(HOEHE - 30, p.y))), start: !a.zustaende.length });
                aenderung();
                return;
            }
            if (modus === 'pfeil') {
                if (!t || t.typ !== 'z') return;
                if (!quelle) { quelle = t.n; zeige(); return; }
                pfeilZiel = [quelle, t.n];
                zeige();
                return;
            }
            if (modus === 'loeschen') {
                if (t && t.typ === 'z') loescheZustand(t.n);
                else if (t && t.typ === 'k') { merke(); a.ue = a.ue.filter(function (u) { return u.von + '>' + u.nach !== t.key; }); aenderung(); }
                return;
            }
            // Auswahl / Verschieben
            if (t && t.typ === 'z') {
                auswahl = 'z:' + t.n;
                var z = zustand(a, t.n);
                ziehen = { n: t.n, dx: p.x - z.x, dy: p.y - z.y, bewegt: false, vorher: JSON.stringify(a) };
                try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* alt */ }
                ev.preventDefault();
            } else if (t && t.typ === 'k') auswahl = 'k:' + t.key;
            else auswahl = null;
            zeige();
        });
        svg.addEventListener('pointermove', function (ev) {
            if (!ziehen) return;
            var p = punkt(ev), z = zustand(a, ziehen.n);
            z.x = Math.round(Math.max(25, Math.min(BREITE - 25, p.x - ziehen.dx)));
            z.y = Math.round(Math.max(25, Math.min(HOEHE - 25, p.y - ziehen.dy)));
            ziehen.bewegt = true;
            zeichneAutomat(a, g, { auswahl: auswahl });
        });
        function loslassen() {
            if (!ziehen) return;
            if (ziehen.bewegt) { verlauf.push(ziehen.vorher); sichern(); }
            ziehen = null;
            zeige();
        }
        svg.addEventListener('pointerup', loslassen);
        svg.addEventListener('pointercancel', loslassen);

        kRueck.addEventListener('click', function () { if (!verlauf.length) return; a = JSON.parse(verlauf.pop()); auswahl = null; quelle = null; pfeilZiel = null; aenderung(); });
        kReset.addEventListener('click', function () {
            if (!window.confirm('Den Automaten auf den Anfang zurücksetzen?')) return;
            merke(); speicherLoeschen(schluessel()); var alt = verlauf; laden(); verlauf = alt; aenderung();
        });
        if (vWahl) vWahl.addEventListener('change', function () { variante = vWahl.value; laden(); aenderung(); });
        if (vSchalter) vSchalter.addEventListener('change', function () { pruefAus.textContent = ''; });

        // Testen mit Animation
        function testen() {
            if (laeuft) return;
            var w = testFeld.value.slice(0, 20);
            if (!startZustand(a)) { testAus.className = 'au-meldung rueck nein'; testAus.textContent = 'Es gibt noch keinen Startzustand.'; return; }
            var r = lauf(a, w);
            laeuft = true;
            var k = 0;
            function band(pos, abbruch) {
                leeren(bandEl);
                if (!w.length) bandEl.appendChild(h('span', { cls: 'au-feld leer', text: 'ε' }));
                Array.from(w).forEach(function (c, j) { bandEl.appendChild(h('span', { cls: 'au-feld' + (j < pos ? ' gelesen' : j === pos ? (abbruch ? ' abbruch' : ' aktuell') : ''), text: c })); });
            }
            testAus.className = 'au-meldung'; testAus.textContent = '';
            function weiter() {
                aktiv = r.mengen[k] || [];
                band(k, r.abbruch === k && k < w.length);
                if (k >= r.kanten.length || !r.mengen[k + 1] || !r.mengen[k + 1].length) {
                    leuchten = [];
                    zeichneAutomat(a, g, { aktiv: aktiv });
                    laeuft = false;
                    testAus.className = 'au-meldung rueck ' + (r.akzeptiert ? 'ok' : 'nein');
                    testAus.textContent = r.akzeptiert ? '✓ ' + zeigeWort(w) + ' wird akzeptiert.' :
                        r.abbruch !== null ? '✗ ' + zeigeWort(w) + ' wird abgelehnt: Abbruch bei „' + w[r.abbruch] + '“, kein passender Pfeil.' :
                        '✗ ' + zeigeWort(w) + ' wird abgelehnt: Die Eingabe ist ganz gelesen, aber ' + (aktiv.length > 1 ? 'keiner der Zustände ' + aktiv.join(', ') + ' ist' : aktiv[0] + ' ist kein') + ' Endzustand.';
                    return;
                }
                leuchten = r.kanten[k];
                zeichneAutomat(a, g, { aktiv: aktiv, leuchten: leuchten });
                Promise.all(leuchten.map(function (key) { return fahre(svg, g.querySelector('[data-kante="' + key + '"] .au-linie'), 480); })).then(function () { k++; weiter(); });
            }
            weiter();
        }
        kTest.addEventListener('click', testen);
        testFeld.addEventListener('keydown', function (e) { if (e.key === 'Enter') testen(); });

        // Prüfstand mit Gegenbeispielsuche
        kPruefen.addEventListener('click', function () {
            var auf = aufgabe();
            leeren(pruefAus);
            pruefAus.appendChild(h('h5', { text: 'Prüfstand: ' + auf.titel }));
            if (!startZustand(a)) { pruefAus.appendChild(h('p', { cls: 'rueck nein', text: 'Es fehlt ein Startzustand.' })); return; }
            var tab = h('table', { cls: 'pruef-tab' });
            tab.appendChild(h('tr', {}, [h('th', { text: 'Wort' }), h('th', { text: 'soll' }), h('th', { text: 'dein Automat' }), h('th', { text: '' })]));
            var gut = 0;
            auf.tests.forEach(function (t) {
                var ist = akzeptiert(a, t[0]), passt = ist === t[1];
                if (passt) gut++;
                var wb = h('button', { type: 'button', cls: 'pruef-wort', text: zeigeWort(t[0]) });
                wb.addEventListener('click', function () { testFeld.value = t[0]; testen(); });
                tab.appendChild(h('tr', { cls: passt ? 'passt' : 'abweichung' }, [h('td', {}, [wb]), h('td', { text: t[1] ? 'akzeptieren' : 'ablehnen' }),
                    h('td', { text: ist ? 'akzeptiert' : 'lehnt ab' }), h('td', { text: passt ? '✓' : '✗' })]));
            });
            pruefAus.appendChild(h('div', { cls: 'tab-scroll' }, [tab]));
            // alle Wörter bis zur Länge maxLaenge
            var alph = auf.alphabet.split(''), gegen = [], gezaehlt = 0, grenze = 200000;
            var ebene = [''];
            for (var len = 0; len <= auf.maxLaenge && gegen.length < 3 && gezaehlt < grenze; len++) {
                if (len) { var neu = []; ebene.forEach(function (w) { alph.forEach(function (c) { neu.push(w + c); }); }); ebene = neu; }
                for (var j = 0; j < ebene.length && gegen.length < 3; j++) {
                    gezaehlt++;
                    var soll = auf.ref(ebene[j]), ist = akzeptiert(a, ebene[j]);
                    if (soll !== ist) gegen.push([ebene[j], soll]);
                }
            }
            var e = eigenschaften(a);
            var extra = [];
            if (auf.verlangtVollstaendig && !e.vollst) extra.push('Der Automat ist noch nicht vollständig (' + e.fehlt.length + ' leere Felder in der Tabelle).');
            if (auf.deterministisch && !e.det) extra.push('Verlangt ist ein deterministischer Automat: ' + e.detBsp + '.');
            if (gegen.length) {
                var p = h('div', { cls: 'rueck nein' }, [h('strong', { text: 'Gegenbeispiele gefunden: ' })]);
                gegen.forEach(function (gb, k) {
                    var b = h('button', { type: 'button', cls: 'pruef-wort', text: zeigeWort(gb[0]) });
                    b.addEventListener('click', function () { testFeld.value = gb[0]; testen(); });
                    p.appendChild(document.createTextNode(k ? ' · ' : ''));
                    p.appendChild(b);
                    p.appendChild(document.createTextNode(gb[1] ? ' gehört dazu, wird aber abgelehnt' : ' gehört nicht dazu, wird aber akzeptiert'));
                });
                pruefAus.appendChild(p);
            } else {
                pruefAus.appendChild(h('p', { cls: 'rueck ' + (extra.length ? 'neutral' : 'ok'), text: '✓ Alle ' + gezaehlt.toLocaleString('de-DE') + ' Wörter bis zur Länge ' + auf.maxLaenge + ' entscheidet dein Automat richtig.' +
                    (extra.length ? '' : ' Längere Wörter prüft der Prüfstand nicht: Überlege selbst, ob das immer so weitergeht.') }));
            }
            extra.forEach(function (t) { pruefAus.appendChild(h('p', { cls: 'rueck nein', text: t })); });
            pruefAus.appendChild(h('p', { cls: 'punkte', text: gut + ' von ' + auf.tests.length + ' Stichproben richtig.' }));
        });

        // Export für das Java-Projekt
        kJava.addEventListener('click', function () {
            leeren(javaAus);
            var e = eigenschaften(a), st = startZustand(a);
            if (!st) { javaAus.appendChild(h('p', { cls: 'rueck nein', text: 'Es fehlt ein Startzustand.' })); return; }
            if (!e.det) {
                javaAus.appendChild(h('p', { cls: 'rueck nein', text: 'Dieser Automat ist nichtdeterministisch (' + e.detBsp + '). In die Übergangstabelle des Projekts passt pro Feld aber nur ein Folgezustand. Warum ist das so – und was müsstest du ändern?' }));
                return;
            }
            var reihe = [st].concat(a.zustaende.filter(function (z) { return z !== st; }));
            var nr = {}; reihe.forEach(function (z, k) { nr[z.n] = k; });
            var alph = alphabetVon(a).join('');
            function jStr(t) { return '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
            function jChar(c) { return "'" + (c === "'" ? "\\'" : c === '\\' ? '\\\\' : c) + "'"; }
            var zeilen = ['// aus dem Automaten-Baukasten (edu-mrh.de): ' + aufgabe().titel,
                '// Zustände: ' + reihe.map(function (z) { return nr[z.n] + ' = ' + z.n; }).join(', ') + ' (Start ist immer 0)',
                'Automat automat = new Automat(' + reihe.length + ', ' + jStr(alph) + ');'];
            var mehr = false;
            gruppen(a).forEach(function (gr) {
                if (gr.zeichen.length === 1) zeilen.push('automat.uebergangHinzufuegen(' + nr[gr.von] + ', ' + jChar(gr.zeichen[0]) + ', ' + nr[gr.nach] + ');');
                else { mehr = true; zeilen.push('automat.uebergaengeHinzufuegen(' + nr[gr.von] + ', ' + jStr(gr.zeichen.join('')) + ', ' + nr[gr.nach] + ');'); }
            });
            reihe.forEach(function (z) { if (z.ende) zeilen.push('automat.setEndzustand(' + nr[z.n] + ');'); });
            zeilen.push('Automatenbild bild = new Automatenbild(automat);');
            zeilen.push('automat.tabelleAusgeben();');
            if (mehr) zeilen.splice(2, 0, '// uebergaengeHinzufuegen ist TODO 5 im Projekt (Selbst bauen a)');
            var pre = h('textarea', { cls: 'mono au-java-text', rows: String(Math.min(16, zeilen.length + 1)), readonly: '', 'aria-label': 'Java-Code' });
            pre.value = zeilen.join('\n');
            var kopier = h('button', { type: 'button', cls: 'knopf', text: '📋 kopieren' });
            kopier.addEventListener('click', function () {
                pre.select();
                var fertig = function () { kopier.textContent = '✓ kopiert'; };
                if (navigator.clipboard) navigator.clipboard.writeText(pre.value).then(fertig, function () { document.execCommand('copy'); fertig(); });
                else { document.execCommand('copy'); fertig(); }
            });
            javaAus.appendChild(h('p', { cls: 'hinweiszeile', text: 'In das Hauptprogramm des Projekts einfügen (unten auf der Seite):' }));
            javaAus.appendChild(pre);
            javaAus.appendChild(kopier);
        });

        laden();
        zeige();
    }

    // =====================================================================
    // Lösungsbilder (nur in gestuften Hilfen): <div data-automat-bild="smiley"></div>
    // =====================================================================
    var LOESUNGEN = {
        option: { zustaende: [{ n: 'Z0', x: 60, y: 70, start: true }, { n: 'Z1', x: 190, y: 70 }, { n: 'Z2', x: 320, y: 70, ende: true }],
                  ue: [{ von: 'Z0', nach: 'Z1', z: 'a' }, { von: 'Z1', nach: 'Z2', z: 'b' }, { von: 'Z0', nach: 'Z2', z: 'b' }], biegung: { 'Z0>Z2': -34 } },
        wiederholung: { zustaende: [{ n: 'Z0', x: 60, y: 90, start: true }, { n: 'Z1', x: 200, y: 90, ende: true }],
                        ue: [{ von: 'Z0', nach: 'Z1', z: 'a' }, { von: 'Z1', nach: 'Z1', z: 'b' }] },
        smiley: { alphabet: ':;-)(DP*', zustaende: [{ n: 'Z0', x: 60, y: 90, start: true }, { n: 'Z1', x: 190, y: 90 }, { n: 'Z2', x: 320, y: 90 }, { n: 'Z3', x: 450, y: 90, ende: true }],
                  ue: [':', ';'].map(function (c) { return { von: 'Z0', nach: 'Z1', z: c }; })
                      .concat([{ von: 'Z1', nach: 'Z2', z: '-' }])
                      .concat(')(DP*'.split('').map(function (c) { return { von: 'Z2', nach: 'Z3', z: c }; }))
                      .concat(')(DP*'.split('').map(function (c) { return { von: 'Z1', nach: 'Z3', z: c }; }))
                      .concat([':', ';'].map(function (c) { return { von: 'Z3', nach: 'Z1', z: c }; })),
                  biegung: { 'Z1>Z3': -40, 'Z3>Z1': -70 } },
        zahlen: (function () {
            var a = kopie(AUTOMATEN.zahlen.a);
            a.zustaende.push({ n: 'ZF', x: 380, y: 200 });
            var alle = '-0123456789'.split('');
            a.zustaende.forEach(function (z) {
                alle.forEach(function (c) { if (!nachfolger(a, z.n, c).length) a.ue.push({ von: z.n, nach: 'ZF', z: c }); });
            });
            a.schleife.ZF = 0;
            return a;
        })()
    };
    function loesungsbild(box) {
        if (box._fertig) return;
        box._fertig = true;
        var a = LOESUNGEN[box.getAttribute('data-automat-bild')];
        if (!a) return;
        var svg = s('svg', { 'class': 'au-svg', role: 'img', 'aria-label': 'Lösung: Zustandsübergangsdiagramm' });
        var rb = rahmen(a, 80);
        svg.setAttribute('viewBox', rb.join(' '));
        svg.style.maxWidth = Math.round(rb[2] * 1.4) + 'px';
        zeichneAutomat(a, s('g', {}, svg));
        box.classList.add('au-flaeche');
        box.appendChild(svg);
        if (box.hasAttribute('data-mit-tabelle')) box.appendChild(h('div', { cls: 'tab-scroll' }, [tabelle(a)]));
    }
    document.addEventListener('fs-eingeblendet', function (e) {
        if (e.detail && e.detail.querySelectorAll) Array.prototype.forEach.call(e.detail.querySelectorAll('[data-automat-bild]'), loesungsbild);
    });

    function sicher(f) { return function (el) { try { f(el); } catch (err) { el.appendChild(h('p', { cls: 'rueck nein', text: 'Werkzeug konnte nicht starten: ' + err.message })); } }; }
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-automat-sim]').forEach(sicher(simulator));
        document.querySelectorAll('[data-automat-bau]').forEach(sicher(automatenBau));
    });

    window.FSAutomaten = { lauf: lauf, eigenschaften: eigenschaften, alleWege: alleWege, AUTOMATEN: AUTOMATEN, beschriftung: beschriftung, LOESUNGEN: LOESUNGEN, BAU: BAU };
})();
