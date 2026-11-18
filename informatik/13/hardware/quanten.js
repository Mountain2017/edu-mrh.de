/*
 * Exkurs Hardware (Informatik 13) – Quantencomputer: Qubit-Zeiger, Quanten-Werkbank, adiabatisches Labor
 *
 *   <div data-qubit></div>          Ein Qubit als Zeiger im Kreis (reelle Amplituden α, β), Gatter als Spiegelungen,
 *                                   Messen und 1000-mal Messen
 *   <div data-qsim data-qubits="2" data-spalten="8" data-start="bell" data-beispiele="bell,grover"
 *        [data-gatter="H,X,Z,CNOT,CZ"] [data-orakel] [data-id="…"]></div>
 *                                   Quantenschaltung bauen und simulieren (Zustandsvektor mit reellen Amplituden),
 *                                   Qiskit-Code, Messen; data-orakel = Deutsch-Spiel mit geheimer Funktion U_f
 *   <div data-adiabat></div>        Busaufteilung als Energielandschaft (3 Spins), Spektrum H(s) = (1−s)·H₀ + s·H_P,
 *                                   echte Schrödinger-Zeitentwicklung (RK4) schnell gegen langsam
 *
 * Vereinfachung: Alle Amplituden sind reell (H, X, Z, CNOT, CZ, U_f erzeugen keine komplexen Zahlen).
 * Basiszustände werden als |q0 q1 q2⟩ geschrieben (q0 links). Keine Abhängigkeiten.
 */
(function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    var W2 = Math.SQRT1_2;
    function s(tag, attrs, eltern) {
        var e = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (eltern) eltern.appendChild(e);
        return e;
    }
    function st(tag, attrs, text, eltern) { var e = s(tag, attrs, eltern); e.textContent = text; return e; }
    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else if (k === 'html') e.innerHTML = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function zahl(x, n) { var v = Math.abs(x) < 5e-10 ? 0 : x; return v.toFixed(n === undefined ? 2 : n).replace('.', ','); }
    function prozent(p) { return (Math.round(p * 1000) / 10).toString().replace('.', ',') + ' %'; }
    function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function schreib(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privat */ } }
    function bits(i, n) { var t = i.toString(2); while (t.length < n) t = '0' + t; return t; }

    // ================= Ein Qubit als Zeiger =================
    function qubit(box) {
        var al = 1, be = 0, spiegel = null, spiegelZeit = 0;
        box.classList.add('qb');
        var svg = s('svg', { viewBox: '0 0 300 300', 'class': 'hw-svg qb-svg', role: 'img', 'aria-label': 'Qubit als Zeiger im Einheitskreis' });
        var werte = h('div', { cls: 'qb-werte', 'aria-live': 'polite' });
        var balken = h('div', { cls: 'qb-balken' });
        var meldung = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        var hist = h('div', { cls: 'qb-balken' });
        function knopf(text, fn, cls) { var b = h('button', { type: 'button', cls: 'knopf ' + (cls || ''), text: text }); b.addEventListener('click', fn); return b; }
        var vorein = h('div', { cls: 'knopfzeile' }, [h('span', { cls: 'klein', text: 'Zustand:' }),
            knopf('|0⟩', function () { setze(1, 0); }), knopf('|1⟩', function () { setze(0, 1); }),
            knopf('|+⟩', function () { setze(W2, W2); }), knopf('|−⟩', function () { setze(W2, -W2); })]);
        var gatter = h('div', { cls: 'knopfzeile' }, [h('span', { cls: 'klein', text: 'Gatter:' }),
            knopf('X', function () { gatterAnw('X'); }), knopf('Z', function () { gatterAnw('Z'); }), knopf('H', function () { gatterAnw('H'); })]);
        var messen = h('div', { cls: 'knopfzeile' }, [knopf('📏 Messen', messe, 'voll'), knopf('1000-mal neu vorbereiten und messen', tausend)]);
        box.appendChild(h('div', { cls: 'zwei-spalten gleich' }, [
            h('div', {}, [svg, h('p', { cls: 'klein', text: 'Ziehe die Pfeilspitze oder nutze die Knöpfe.' })]),
            h('div', {}, [vorein, gatter, werte, balken, messen, meldung, hist])]));
        function setze(a, b) { var n = Math.hypot(a, b) || 1; al = a / n; be = b / n; meldung.textContent = ''; meldung.className = 'rueck'; malen(); }
        function gatterAnw(g) {
            var a = al, b = be;
            if (g === 'X') { al = b; be = a; spiegel = 45; }
            if (g === 'Z') { be = -b; spiegel = 0; }
            if (g === 'H') { al = (a + b) * W2; be = (a - b) * W2; spiegel = 22.5; }
            spiegelZeit = Date.now();
            meldung.className = 'rueck neutral';
            meldung.textContent = g === 'X' ? 'X spiegelt den Zeiger an der 45°-Linie: |0⟩ und |1⟩ tauschen (wie NICHT).'
                : g === 'Z' ? 'Z spiegelt an der waagrechten Achse: Das Vorzeichen von β kippt. Die Wahrscheinlichkeiten bleiben gleich, aber der Zustand ist ein anderer!'
                : 'H spiegelt an der 22,5°-Linie: Aus |0⟩ wird |+⟩, aus |1⟩ wird |−⟩ und umgekehrt.';
            malen();
            setTimeout(malen, 1300);
        }
        function messe() {
            var r = Math.random() < al * al ? 0 : 1;
            al = r ? 0 : 1; be = r ? 1 : 0;
            meldung.className = 'rueck neutral';
            meldung.textContent = 'Gemessen: ' + r + '. Der Zustand ist jetzt |' + r + '⟩. Die Überlagerung ist zerstört; misst du noch einmal, kommt sicher wieder ' + r + '.';
            malen();
        }
        function tausend() {
            var n0 = 0;
            for (var i = 0; i < 1000; i++) if (Math.random() < al * al) n0++;
            hist.textContent = '';
            hist.appendChild(h('strong', { cls: 'klein', text: '1000 Messungen an frisch vorbereiteten Qubits:' }));
            [[0, n0], [1, 1000 - n0]].forEach(function (z) {
                hist.appendChild(h('div', { cls: 'qb-b' }, [h('span', { text: 'Ergebnis ' + z[0] }), h('div', { cls: 'bar ' + (z[0] ? 'eins' : 'null'), style: 'width:' + (z[1] / 10) + '%' }), h('span', { text: z[1] + '×' })]));
            });
        }
        var C = 150, R = 110;
        function malen() {
            svg.textContent = '';
            s('line', { x1: 20, y1: C, x2: 280, y2: C, 'class': 'achse' }, svg);
            s('line', { x1: C, y1: 20, x2: C, y2: 280, 'class': 'achse' }, svg);
            s('circle', { cx: C, cy: C, r: R, 'class': 'kreis' }, svg);
            st('text', { x: 284, y: C - 6, 'text-anchor': 'end', 'font-size': 15, 'font-weight': 700, fill: '#1d4ed8' }, '|0⟩', svg);
            st('text', { x: 16, y: C - 6, 'font-size': 13, fill: '#64748b' }, '−|0⟩', svg);
            st('text', { x: C + 6, y: 30, 'font-size': 15, 'font-weight': 700, fill: '#c2410c' }, '|1⟩', svg);
            st('text', { x: C + 6, y: 280, 'font-size': 13, fill: '#64748b' }, '−|1⟩', svg);
            if (spiegel !== null && Date.now() - spiegelZeit < 1200) {
                var w = spiegel / 180 * Math.PI;
                s('line', { x1: C - 135 * Math.cos(w), y1: C + 135 * Math.sin(w), x2: C + 135 * Math.cos(w), y2: C - 135 * Math.sin(w), stroke: '#16a34a', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }, svg);
                st('text', { x: C + 120 * Math.cos(w), y: C - 120 * Math.sin(w) - 8, 'font-size': 11, fill: '#15803d', 'font-weight': 700 }, 'Spiegel', svg);
            }
            var x = C + R * al, y = C - R * be;
            s('line', { x1: x, y1: y, x2: x, y2: C, 'class': 'proj1' }, svg);
            s('line', { x1: x, y1: y, x2: C, y2: y, 'class': 'proj0' }, svg);
            s('line', { x1: C, y1: C, x2: x, y2: y, 'class': 'zeiger' }, svg);
            s('circle', { cx: x, cy: y, r: 11, 'class': 'griff' }, svg);
            werte.innerHTML = '|ψ⟩ = <b>' + zahl(al) + '</b>·|0⟩ + <b>' + zahl(be) + '</b>·|1⟩<br>α = ' + zahl(al) + ', β = ' + zahl(be) + ', α² + β² = 1';
            balken.textContent = '';
            [[0, al * al], [1, be * be]].forEach(function (z) {
                balken.appendChild(h('div', { cls: 'qb-b' }, [h('span', { text: 'P(' + z[0] + ')' }), h('div', { cls: 'bar ' + (z[0] ? 'eins' : 'null'), style: 'width:' + (z[1] * 100) + '%' }), h('span', { text: prozent(z[1]) })]));
            });
        }
        var zieht = false;
        function ziehe(ev) {
            var m = svg.getScreenCTM(); if (!m) return;
            var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; p = p.matrixTransform(m.inverse());
            var dx = p.x - C, dy = C - p.y, n = Math.hypot(dx, dy);
            if (n < 5) return;
            var w = Math.atan2(dy, dx), raster = Math.PI / 72;
            w = Math.round(w / raster) * raster;
            al = Math.cos(w); be = Math.sin(w);
            if (Math.abs(al) < 1e-9) al = 0; if (Math.abs(be) < 1e-9) be = 0;
            meldung.textContent = ''; meldung.className = 'rueck';
            malen();
        }
        svg.addEventListener('pointerdown', function (ev) { zieht = true; svg.setPointerCapture(ev.pointerId); ziehe(ev); });
        svg.addEventListener('pointermove', function (ev) { if (zieht) ziehe(ev); });
        svg.addEventListener('pointerup', function () { zieht = false; });
        svg.addEventListener('pointercancel', function () { zieht = false; });
        malen();
    }

    // ================= Quanten-Werkbank =================
    var BEISPIELE = {
        muenze: { n: 1, titel: 'Quantenmünze', spalten: [['H']] },
        hh: { n: 1, titel: 'Zweimal H', spalten: [['H'], ['H']] },
        hzh: { n: 1, titel: 'H, Z, H', spalten: [['H'], ['Z'], ['H']] },
        zwei: { n: 2, titel: 'Zwei Münzen', spalten: [['H', 'H']] },
        bell: { n: 2, titel: 'Verschränkung (Bell)', spalten: [['H', null], ['C1', 'X0']] },
        deutsch: { n: 2, titel: 'Deutsch-Algorithmus', spalten: [[null, 'X'], ['H', 'H'], ['U', 'U2'], ['H', null]] },
        grover: { n: 2, titel: 'Grover: Suche |11⟩', spalten: [['H', 'H'], ['C1', 'Z0'], ['H', 'H'], ['X', 'X'], ['C1', 'Z0'], ['X', 'X'], ['H', 'H']] },
        ghz: { n: 3, titel: 'Drei verschränkt (GHZ)', spalten: [['H', null, null], ['C1', 'X0', null], [null, 'C2', 'X1']] }
    };
    // Kurzschrift: 'H','X','Z' | 'C<ziel>' Steuerpunkt | 'X<steuer>','Z<steuer>' gesteuertes Ziel | 'U','U2' Orakel
    function zelle(code) {
        if (!code) return null;
        var m = /^([CXZ])(\d)$/.exec(code);
        if (m) return m[1] === 'C' ? { g: 'C', t: +m[2] } : { g: m[1], c: +m[2] };
        return { g: code };
    }
    var ORAKEL = [
        { f: [0, 0], name: 'konstant: f(x) = 0', art: 'konstant' },
        { f: [1, 1], name: 'konstant: f(x) = 1', art: 'konstant' },
        { f: [0, 1], name: 'ausgeglichen: f(x) = x', art: 'ausgeglichen' },
        { f: [1, 0], name: 'ausgeglichen: f(x) = NICHT x', art: 'ausgeglichen' }
    ];

    function qsim(box) {
        var orakelModus = box.hasAttribute('data-orakel');
        var n = Math.max(1, Math.min(3, +box.getAttribute('data-qubits') || 2));
        if (orakelModus) n = 2;
        var S = Math.max(2, Math.min(12, +box.getAttribute('data-spalten') || 8));
        var werkzeuge = (box.getAttribute('data-gatter') || 'H,X,Z,CNOT,CZ').split(',').map(function (x) { return x.trim(); });
        if (orakelModus && werkzeuge.indexOf('U') < 0) werkzeuge.push('U');
        if (n < 2) werkzeuge = werkzeuge.filter(function (w) { return w !== 'CNOT' && w !== 'CZ' && w !== 'U'; });
        var beispiele = (box.getAttribute('data-beispiele') || '').split(',').map(function (x) { return x.trim(); }).filter(function (k) { return BEISPIELE[k] && BEISPIELE[k].n === n; });
        var schluessel = 'hwQs-' + (box.getAttribute('data-id') || (box.getAttribute('data-start') || 'frei') + n);
        var spalten = [], werkzeug = werkzeuge[0], wartet = null, ansicht = S, orakel = null, abfragen = 0;
        function leer() { spalten = []; for (var k = 0; k < S; k++) { var c = []; for (var q = 0; q < n; q++) c.push(null); spalten.push(c); } }
        function laden(key) {
            leer();
            BEISPIELE[key].spalten.forEach(function (col, k) { if (k < S) col.forEach(function (code, q) { if (q < n) spalten[k][q] = zelle(code); }); });
            ansicht = S; wartet = null;
        }
        leer();
        try {
            var alt = JSON.parse(lies(schluessel) || 'null');
            if (alt && alt.length === S && alt[0].length === n) spalten = alt;
            else if (BEISPIELE[box.getAttribute('data-start')]) laden(box.getAttribute('data-start'));
        } catch (e) { leer(); }
        function speichern() { schreib(schluessel, JSON.stringify(spalten)); }
        function neuesOrakel() { orakel = ORAKEL[Math.floor(Math.random() * 4)]; abfragen = 0; }
        if (orakelModus) neuesOrakel();

        box.classList.add('qs');
        box.textContent = '';
        box.appendChild(h('div', { cls: 'qs-kopf' }, [h('h4', { text: orakelModus ? '🕵️ Orakel-Detektiv' : '⚛️ Quanten-Werkbank' }), h('span', { cls: 'klein', text: n + ' Qubit' + (n > 1 ? 's' : '') + ', alle starten in |0⟩' })]));
        var palette = h('div', { cls: 'qs-palette' }, [h('span', { cls: 'klein', text: 'Werkzeug:' })]);
        var NAMEN = { H: 'H', X: 'X', Z: 'Z', CNOT: '●─⊕ CNOT', CZ: '●─● CZ', U: 'U_f (Orakel)', weg: '🧽 entfernen' };
        var wKn = {};
        werkzeuge.concat(['weg']).forEach(function (w) {
            var b = h('button', { type: 'button', cls: w === 'U' ? 'orakel' : '', text: NAMEN[w] || w, title: w });
            b.addEventListener('click', function () { werkzeug = w; wartet = null; malen(); });
            wKn[w] = b; palette.appendChild(b);
        });
        box.appendChild(palette);
        {
            var bz = h('div', { cls: 'qs-palette' }, [h('span', { cls: 'klein', text: 'Laden:' })]);
            beispiele.forEach(function (k) {
                var b = h('button', { type: 'button', text: BEISPIELE[k].titel });
                b.addEventListener('click', function () { laden(k); speichern(); hist.textContent = ''; ergebnis.textContent = ''; malen(); });
                bz.appendChild(b);
            });
            var bLeer = h('button', { type: 'button', text: 'leere Schaltung' });
            bLeer.addEventListener('click', function () { leer(); speichern(); hist.textContent = ''; ergebnis.textContent = ''; malen(); });
            bz.appendChild(bLeer);
            box.appendChild(bz);
        }
        var hinweis = h('div', { cls: 'qs-hinweis klein', 'aria-live': 'polite' });
        box.appendChild(hinweis);
        var raster = h('div', { cls: 'qs-schaltung', style: 'grid-template-columns: auto repeat(' + S + ', 3rem) auto' });
        box.appendChild(h('div', { cls: 'qs-scroll' }, [raster]));
        var ampBox = h('div', { cls: 'qs-amp' }), ampTitel = h('h5');
        var code = h('pre', { cls: 'qs-code' });
        var ergebnis = h('div', { cls: 'qs-ergebnis', 'aria-live': 'polite' });
        var hist = h('div', { cls: 'qs-hist' });
        var b1 = h('button', { type: 'button', cls: 'knopf voll', text: '▶ 1-mal ausführen und messen' });
        var b1000 = h('button', { type: 'button', cls: 'knopf', text: '1000-mal ausführen' });
        var messBox = h('div', { cls: 'qs-box' }, [h('h5', { text: '📏 Messen (wie am echten Gerät)' }), h('div', { cls: 'knopfzeile' }, [b1, b1000]), ergebnis, hist]);
        var orakelBox = null;
        if (orakelModus) {
            var rate = h('div', { cls: 'rueck', 'aria-live': 'polite' });
            var bK = h('button', { type: 'button', cls: 'knopf', text: 'Ich tippe: konstant' });
            var bA = h('button', { type: 'button', cls: 'knopf', text: 'Ich tippe: ausgeglichen' });
            var bNeu = h('button', { type: 'button', cls: 'knopf', text: '🎲 neues geheimes Orakel' });
            function tipp(art) {
                var ok = art === orakel.art;
                rate.className = 'rueck ' + (ok ? 'ok' : 'nein');
                rate.textContent = (ok ? '✓ Richtig! ' : '✗ Leider falsch. ') + 'Das Orakel war ' + orakel.name + '. Du hast es ' + abfragen + '-mal befragt.' +
                    (ok && abfragen === 1 ? ' Mit nur einer Abfrage: Das schafft kein klassischer Rechner sicher!' : abfragen > 1 ? ' Schaffst du es mit genau einer Abfrage?' : '');
            }
            bK.addEventListener('click', function () { tipp('konstant'); });
            bA.addEventListener('click', function () { tipp('ausgeglichen'); });
            bNeu.addEventListener('click', function () { neuesOrakel(); rate.className = 'rueck'; rate.textContent = 'Neues Orakel gewählt. Es ist geheim.'; hist.textContent = ''; ergebnis.textContent = ''; malen(); });
            orakelBox = h('div', { cls: 'qs-box' }, [h('h5', { text: '🕵️ Deine Entscheidung' }), h('p', { cls: 'klein', text: 'U_f wendet eine geheime Funktion f an: |x, y⟩ → |x, y XOR f(x)⟩. Finde heraus, ob f konstant ist (f(0) = f(1)) oder ausgeglichen (f(0) ≠ f(1)). Jede Ausführung zählt als eine Abfrage.' }),
                h('div', { cls: 'knopfzeile' }, [bK, bA, bNeu]), rate]);
        }
        box.appendChild(h('div', { cls: 'qs-unten' }, [
            h('div', { cls: 'qs-box' }, [ampTitel, ampBox]),
            h('div', {}, [messBox, orakelBox])]));
        box.appendChild(h('details', {}, [h('summary', { text: 'So sähe das Programm in Qiskit (Python) aus' }), code]));

        // Simulation
        function mask(q) { return 1 << (n - 1 - q); }
        function wende(sv, col) {
            col.forEach(function (c, q) {
                if (!c) return;
                var m = mask(q), i, j, a, b;
                if (c.g === 'H' && c.c === undefined) {
                    for (i = 0; i < sv.length; i++) if (!(i & m)) { j = i | m; a = sv[i]; b = sv[j]; sv[i] = (a + b) * W2; sv[j] = (a - b) * W2; }
                } else if (c.g === 'X') {
                    var cm = c.c === undefined ? 0 : mask(c.c);
                    for (i = 0; i < sv.length; i++) if (!(i & m) && (cm === 0 || (i & cm))) { j = i | m; a = sv[i]; sv[i] = sv[j]; sv[j] = a; }
                } else if (c.g === 'Z') {
                    var zm = c.c === undefined ? 0 : mask(c.c);
                    for (i = 0; i < sv.length; i++) if ((i & m) && (zm === 0 || (i & zm))) sv[i] = -sv[i];
                } else if (c.g === 'U' && orakel) {
                    var neu = sv.map(function () { return 0; });
                    for (i = 0; i < sv.length; i++) {
                        var x = (i & mask(0)) ? 1 : 0;
                        neu[orakel.f[x] ? i ^ mask(1) : i] += sv[i];
                    }
                    for (i = 0; i < sv.length; i++) sv[i] = neu[i];
                }
            });
        }
        function zustand(bis) {
            var sv = []; for (var i = 0; i < (1 << n); i++) sv.push(i === 0 ? 1 : 0);
            for (var k = 0; k < bis; k++) wende(sv, spalten[k]);
            return sv;
        }
        function hatOrakel(bis) { for (var k = 0; k < bis; k++) if (spalten[k].some(function (c) { return c && c.g === 'U'; })) return true; return false; }
        function stichprobe(sv) {
            var r = Math.random(), z = 0;
            for (var i = 0; i < sv.length; i++) { z += sv[i] * sv[i]; if (r < z) return i; }
            return sv.length - 1;
        }

        // Bearbeiten
        function entferne(k, q) {
            var c = spalten[k][q];
            if (!c) return;
            spalten[k][q] = null;
            if (c.g === 'C') spalten[k][c.t] = null;
            else if (c.c !== undefined) spalten[k][c.c] = null;
            else if (c.g === 'U' || c.g === 'U2') { spalten[k][0] = null; spalten[k][1] = null; }
        }
        function klick(k, q) {
            hist.textContent = ''; ergebnis.textContent = '';
            if (werkzeug === 'weg') { entferne(k, q); wartet = null; }
            else if (werkzeug === 'U') {
                spalten.forEach(function (col, kk) { col.forEach(function (c, qq) { if (c && (c.g === 'U' || c.g === 'U2')) entferne(kk, qq); }); });
                entferne(k, 0); entferne(k, 1);
                spalten[k][0] = { g: 'U' }; spalten[k][1] = { g: 'U2' };
            } else if (werkzeug === 'CNOT' || werkzeug === 'CZ') {
                if (wartet && wartet.k === k && wartet.q !== q) {
                    entferne(k, wartet.q); entferne(k, q);
                    spalten[k][wartet.q] = { g: 'C', t: q };
                    spalten[k][q] = { g: werkzeug === 'CNOT' ? 'X' : 'Z', c: wartet.q };
                    wartet = null;
                } else wartet = { k: k, q: q };
            } else { entferne(k, q); spalten[k][q] = { g: werkzeug }; wartet = null; }
            ansicht = S;
            speichern(); malen();
        }

        function malen() {
            Object.keys(wKn).forEach(function (w) { wKn[w].classList.toggle('aktiv', w === werkzeug); });
            hinweis.textContent = (werkzeug === 'CNOT' || werkzeug === 'CZ')
                ? (wartet ? 'Jetzt im selben Schritt das Ziel-Qubit antippen.' : 'Erst das steuernde Qubit antippen (Punkt), dann im selben Schritt das Ziel.')
                : werkzeug === 'U' ? 'Tippe auf einen Schritt: Das Orakel wirkt auf q0 (Eingang x) und q1 (Ausgang y). Es darf nur einmal vorkommen.'
                : werkzeug === 'weg' ? 'Tippe auf ein Gatter, um es zu entfernen.' : 'Tippe auf eine Stelle der Leitung, um ' + werkzeug + ' zu setzen.';
            raster.textContent = '';
            // Kopfzeile: Zustand nach Schritt k
            var start = h('span', { cls: 'qs-kopfzeile' + (ansicht === 0 ? ' akt' : ''), text: 'Start', role: 'button', tabindex: 0 });
            start.addEventListener('click', function () { ansicht = 0; malen(); });
            raster.appendChild(start);
            for (var k = 0; k < S; k++) (function (k) {
                var kz = h('span', { cls: 'qs-kopfzeile' + (ansicht === k + 1 ? ' akt' : ''), text: String(k + 1), role: 'button', tabindex: 0, title: 'Zustand nach Schritt ' + (k + 1) + ' zeigen' });
                kz.addEventListener('click', function () { ansicht = k + 1; malen(); });
                kz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ansicht = k + 1; malen(); } });
                raster.appendChild(kz);
            })(k);
            raster.appendChild(h('span'));
            for (var q = 0; q < n; q++) {
                raster.appendChild(h('span', { cls: 'qs-name', text: 'q' + q + ' |0⟩' }));
                for (k = 0; k < S; k++) (function (k, q) {
                    var c = spalten[k][q];
                    var z = h('div', { cls: 'qs-zelle' + (ansicht === k + 1 ? ' gewaehlt-spalte' : ''), role: 'button', tabindex: 0, 'aria-label': 'q' + q + ', Schritt ' + (k + 1) + (c ? ': ' + c.g : ': leer') });
                    z.addEventListener('click', function () { klick(k, q); });
                    z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klick(k, q); } });
                    // senkrechter Steg bei gesteuerten Gattern
                    var partner = null;
                    if (c && c.g === 'C') partner = c.t; else if (c && c.c !== undefined) partner = c.c;
                    var col = spalten[k], lo = n, hi = -1;
                    col.forEach(function (cc, qq) { if (cc && (cc.g === 'C' || cc.c !== undefined)) { lo = Math.min(lo, qq); hi = Math.max(hi, qq); } });
                    if (hi > lo && q >= lo && q <= hi) {
                        var steg = h('span', { cls: 'qs-steg' });
                        steg.style.top = q === lo ? '50%' : '0';
                        steg.style.bottom = q === hi ? '50%' : '0';
                        z.appendChild(steg);
                    }
                    if (c && (c.g === 'U' || c.g === 'U2')) {
                        var steg2 = h('span', { cls: 'qs-steg' });
                        steg2.style.top = c.g === 'U' ? '50%' : '0'; steg2.style.bottom = c.g === 'U' ? '0' : '50%';
                        steg2.style.width = '2.2rem'; steg2.style.left = 'calc(50% - 1.1rem)'; steg2.style.transform = 'none'; steg2.style.background = '#0f172a';
                        z.appendChild(steg2);
                        z.appendChild(h('span', { cls: 'qs-g U', text: c.g === 'U' ? 'U_f x' : 'U_f y' }));
                    } else if (c && c.g === 'C') z.appendChild(h('span', { cls: 'qs-punkt' }));
                    else if (c && c.g === 'X' && c.c !== undefined) z.appendChild(h('span', { cls: 'qs-g ziel-x', text: '⊕' }));
                    else if (c && c.g === 'Z' && c.c !== undefined) z.appendChild(h('span', { cls: 'qs-punkt' }));
                    else if (c) z.appendChild(h('span', { cls: 'qs-g ' + c.g, text: c.g }));
                    else if (wartet && wartet.k === k && wartet.q === q) z.appendChild(h('span', { cls: 'qs-punkt wartet' }));
                    raster.appendChild(z);
                })(k, q);
                raster.appendChild(h('span', { cls: 'qs-messung', text: '📏 → Bit ' + q }));
            }
            // Amplituden
            var verborgen = orakelModus && hatOrakel(ansicht);
            ampTitel.textContent = (ansicht === 0 ? 'Zustand am Start' : 'Zustand nach Schritt ' + ansicht) + ' (Amplituden)';
            ampBox.textContent = '';
            if (verborgen) {
                ampBox.appendChild(h('p', { cls: 'klein', html: '🔒 <strong>Verborgen:</strong> Nach dem Orakel zeigt dir die Simulation die Amplituden nicht mehr. Auch ein echter Quantencomputer verrät sie nie. Du erfährst nur Messergebnisse.' }));
            } else {
                var sv = zustand(ansicht);
                sv.forEach(function (a, i) {
                    var w = Math.min(50, Math.abs(a) * 50);
                    var bar = h('span', { cls: a < -1e-9 ? 'neg' : '' });
                    bar.style.width = w + '%';
                    bar.style.left = a < 0 ? (50 - w) + '%' : '50%';
                    ampBox.appendChild(h('div', { cls: 'qs-amp-zeile' }, [h('span', { text: '|' + bits(i, n) + '⟩' }), h('div', { cls: 'qs-amp-achse' }, [bar]), h('span', { text: (a > 1e-9 ? '+' : '') + zahl(a) }), h('span', { cls: 'p', text: prozent(a * a) })]));
                });
                ampBox.appendChild(h('p', { cls: 'klein', text: 'Balken nach rechts: positive Amplitude, nach links (rosa): negative. Rechts die Wahrscheinlichkeit = Amplitude². Tippe oben auf eine Schrittnummer, um den Zwischenstand zu sehen.' }));
            }
            // Qiskit-Code
            var z = ['<span class="k">from</span> qiskit <span class="k">import</span> QuantumCircuit', 'qc = QuantumCircuit(' + n + ')'];
            spalten.forEach(function (col, k) {
                col.forEach(function (c, q) {
                    if (!c) return;
                    if (c.g === 'C' || c.g === 'U2') return;
                    if (c.g === 'U') z.push('qc.append(orakel, [0, 1])   <span class="c"># geheime Funktion f, Schritt ' + (k + 1) + '</span>');
                    else if (c.c !== undefined) z.push('qc.' + (c.g === 'X' ? 'cx' : 'cz') + '(' + c.c + ', ' + q + ')' + '   <span class="c"># Schritt ' + (k + 1) + '</span>');
                    else z.push('qc.' + c.g.toLowerCase() + '(' + q + ')' + '   <span class="c"># Schritt ' + (k + 1) + '</span>');
                });
            });
            z.push('qc.measure_all()   <span class="c"># alle Qubits messen</span>');
            z.push('<span class="c"># Qiskit schreibt Ergebnisse rückwärts (q' + (n - 1) + ' … q0),</span>');
            z.push('<span class="c"># hier auf der Seite steht q0 immer links.</span>');
            code.innerHTML = z.join('\n');
        }
        function ausfuehren(mal) {
            var sv = zustand(S), zaehl = {};
            for (var i = 0; i < mal; i++) { var r = stichprobe(sv); zaehl[r] = (zaehl[r] || 0) + 1; }
            if (orakelModus && hatOrakel(S)) abfragen += mal;
            if (mal === 1) {
                var r1 = +Object.keys(zaehl)[0];
                ergebnis.textContent = 'Ergebnis: ' + bits(r1, n).split('').map(function (b, q) { return 'q' + q + '=' + b; }).join('  ');
                hist.textContent = '';
            } else {
                ergebnis.textContent = '';
                hist.textContent = '';
                for (var j = 0; j < (1 << n); j++) {
                    var c = zaehl[j] || 0;
                    hist.appendChild(h('div', { cls: 'qs-hist-zeile' }, [h('span', { text: bits(j, n) }), h('div', { cls: 'bar', style: 'width:' + (c / mal * 100) + '%' }), h('span', { text: c + '×' })]));
                }
            }
        }
        b1.addEventListener('click', function () { ausfuehren(1); });
        b1000.addEventListener('click', function () { ausfuehren(1000); });
        malen();
    }

    // ================= Adiabatisches Labor =================
    var PERS = ['Anna', 'Ben', 'Cem'];
    var PAARE = [[0, 1], [0, 2], [1, 2]];
    function eigenwerte(M) {
        var n = M.length, a = M.map(function (r) { return r.slice(); }), p, q, k;
        for (var runde = 0; runde < 60; runde++) {
            var off = 0;
            for (p = 0; p < n; p++) for (q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
            if (off < 1e-18) break;
            for (p = 0; p < n; p++) for (q = p + 1; q < n; q++) {
                if (Math.abs(a[p][q]) < 1e-14) continue;
                var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
                var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
                var c = 1 / Math.sqrt(t * t + 1), sn = t * c;
                for (k = 0; k < n; k++) { var akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - sn * akq; a[k][q] = sn * akp + c * akq; }
                for (k = 0; k < n; k++) { var apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - sn * aqk; a[q][k] = sn * apk + c * aqk; }
            }
        }
        var ev = []; for (p = 0; p < n; p++) ev.push(a[p][p]);
        return ev.sort(function (x, y) { return x - y; });
    }
    function adiabat(box) {
        var J = [1, -1, 1], hA = 0.5, T = 10, laeuft = false, pEnde = null, sJetzt = null;
        box.classList.add('ad');
        var OPT = [[1, 'Streit: verschiedene Busse'], [-1, 'Freunde: gleicher Bus'], [0, 'egal']];
        var paare = h('div', { cls: 'ad-paare' });
        PAARE.forEach(function (pr, k) {
            var sel = h('select', { 'aria-label': PERS[pr[0]] + ' und ' + PERS[pr[1]] });
            OPT.forEach(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === J[k]) op.selected = true; sel.appendChild(op); });
            sel.addEventListener('change', function () { J[k] = +sel.value; pEnde = null; cache = null; sJetzt = null; hist.textContent = ''; malen(); });
            paare.appendChild(h('div', { cls: 'ad-paar' }, [h('b', { text: PERS[pr[0]][0] + ' – ' + PERS[pr[1]][0] }), sel]));
        });
        var cb = h('input', { type: 'checkbox', checked: 'checked' });
        cb.addEventListener('change', function () { hA = cb.checked ? 0.5 : 0; pEnde = null; cache = null; sJetzt = null; hist.textContent = ''; malen(); });
        paare.appendChild(h('label', { cls: 'ad-paar' }, [cb, ' Anna möchte lieber in Bus 1 (kleiner Bonus)']));
        var land = h('div', { cls: 'ad-land' });
        var spek = s('svg', { viewBox: '0 0 420 260', 'class': 'hw-svg ad-svg', role: 'img', 'aria-label': 'Energieniveaus des Quantensystems während der Umformung' });
        var regler = h('input', { type: 'range', min: 0, max: 100, value: 60, 'aria-label': 'Laufzeit' });
        var tAnz = h('span', { cls: 'zahl' });
        var bLauf = h('button', { type: 'button', cls: 'knopf voll', text: '▶ Quantensystem langsam umformen' });
        var b100 = h('button', { type: 'button', cls: 'knopf', text: '100 Durchläufe messen' });
        var info = h('div', { cls: 'rueck neutral', 'aria-live': 'polite' });
        var hist = h('div', { cls: 'qs-hist' });
        box.appendChild(h('h4', { text: '🚌 Drei Personen, zwei Busse' }));
        box.appendChild(h('div', { cls: 'zwei-spalten gleich' }, [
            h('div', {}, [h('strong', { text: '1. Problem festlegen' }), paare, h('strong', { text: '2. Energielandschaft (klassisch berechnet)' }), land]),
            h('div', {}, [h('strong', { text: '3. Quantensystem umformen' }), spek,
                h('div', { cls: 'ad-regler' }, [h('label', { text: 'Laufzeit T:' }), regler, tAnz]),
                h('div', { cls: 'knopfzeile' }, [bLauf, b100]), info, hist])]));
        function tWert() { return Math.round(0.3 * Math.pow(50 / 0.3, regler.value / 100) * 10) / 10; }
        regler.addEventListener('input', function () { T = tWert(); tAnz.textContent = zahl(T, 1) + ' Zeiteinheiten'; });
        T = tWert(); tAnz.textContent = zahl(T, 1) + ' Zeiteinheiten';

        function energie(i) {
            var z = [0, 1, 2].map(function (p) { return (i >> (2 - p)) & 1 ? -1 : 1; });
            var e = 0;
            PAARE.forEach(function (pr, k) { e += J[k] * z[pr[0]] * z[pr[1]]; });
            return e - hA * z[0];
        }
        function hMatrix(sv) {
            var M = [];
            for (var i = 0; i < 8; i++) { M.push([]); for (var j = 0; j < 8; j++) {
                var d = i ^ j, v = 0;
                if (i === j) v = sv * energie(i);
                else if (d === 1 || d === 2 || d === 4) v = -(1 - sv);
                M[i].push(v);
            } }
            return M;
        }
        function malenLand() {
            var E = []; for (var i = 0; i < 8; i++) E.push(energie(i));
            var min = Math.min.apply(null, E), max = Math.max.apply(null, E);
            land.textContent = '';
            E.forEach(function (e, i) {
                var wer = [0, 1, 2].map(function (p) { return PERS[p][0] + ((i >> (2 - p)) & 1 ? '2' : '1'); }).join(' ');
                var best = Math.abs(e - min) < 1e-9;
                land.appendChild(h('div', { cls: 'ad-land-zeile' + (best ? ' best' : '') }, [
                    h('span', { cls: 'wer', text: wer }),
                    h('div', { cls: 'e', style: 'width:' + (8 + 92 * (e - min) / ((max - min) || 1)) + '%' }),
                    h('span', { text: zahl(e, 1) }),
                    h('span', { cls: 'p', text: pEnde ? prozent(pEnde[i]) : '' })]));
            });
            land.appendChild(h('p', { cls: 'klein', text: 'A1 B2 C1 heißt: Anna in Bus 1, Ben in Bus 2, Cem in Bus 1. Jeder erfüllte Wunsch senkt die Energie, jeder verletzte erhöht sie. Grün = beste Lösung(en) = tiefste Energie.' + (pEnde ? ' Rechts: Wahrscheinlichkeit am Ende des letzten Laufs.' : '') }));
            return { min: min, E: E };
        }
        var cache = null;
        function malenSpek() {
            spek.textContent = '';
            var N = 50, k;
            if (!cache) {
                cache = { werte: [] };
                for (k = 0; k <= N; k++) cache.werte.push(eigenwerte(hMatrix(k / N)));
            }
            var werte = cache.werte;
            var lo = Infinity, hi = -Infinity;
            werte.forEach(function (w) { w.forEach(function (x) { lo = Math.min(lo, x); hi = Math.max(hi, x); }); });
            var X = function (sv) { return 50 + sv * 350; }, Y = function (e) { return 225 - (e - lo) / ((hi - lo) || 1) * 200; };
            s('line', { x1: 50, y1: 230, x2: 400, y2: 230, stroke: '#334155' }, spek);
            s('line', { x1: 50, y1: 230, x2: 50, y2: 15, stroke: '#334155' }, spek);
            st('text', { x: 50, y: 248, 'text-anchor': 'middle' }, 's = 0', spek);
            st('text', { x: 400, y: 248, 'text-anchor': 'middle' }, 's = 1', spek);
            st('text', { x: 225, y: 248, 'text-anchor': 'middle' }, '→ Umformung', spek);
            st('text', { x: 6, y: 20 }, 'Energie', spek);
            st('text', { x: 56, y: 14, 'font-size': 10 }, 'Start: alle Aufteilungen überlagert', spek);
            st('text', { x: 398, y: 14, 'font-size': 10, 'text-anchor': 'end' }, 'Ende: Energie = Problem', spek);
            // Lücke zum ersten Niveau, das am Ende KEINE beste Lösung ist (gleich gute Lösungen dürfen zusammenlaufen)
            var Eende = werte[N], d = Eende.filter(function (x) { return x - Eende[0] < 1e-6; }).length;
            if (d > 7) d = 7;
            var minLuecke = Infinity, sLuecke = 0;
            werte.forEach(function (w, k) { if (k > 0 && k < N && w[d] - w[0] < minLuecke) { minLuecke = w[d] - w[0]; sLuecke = k / N; } });
            for (var l = 7; l >= 0; l--) {
                var linie = '';
                werte.forEach(function (w, k) { linie += (k ? 'L' : 'M') + X(k / N).toFixed(1) + ',' + Y(w[l]).toFixed(1); });
                s('path', { d: linie, 'class': 'niveau' + (l === 0 ? ' grund' : '') }, spek);
            }
            var wl = werte[Math.round(sLuecke * N)];
            s('line', { x1: X(sLuecke), y1: Y(wl[0]), x2: X(sLuecke), y2: Y(wl[d]), stroke: '#db2777', 'stroke-width': 2 }, spek);
            st('text', { x: X(sLuecke) + 4, y: (Y(wl[0]) + Y(wl[d])) / 2 + 4, fill: '#9d174d', 'font-size': 11 }, 'engste Lücke', spek);
            if (d > 1) st('text', { x: 398, y: Y(Eende[0]) - 6, 'text-anchor': 'end', fill: '#6b21a8', 'font-size': 10 }, d + ' gleich gute Lösungen', spek);
            if (sJetzt !== null) s('line', { x1: X(sJetzt), y1: 15, x2: X(sJetzt), y2: 230, 'class': 'marke' }, spek);
            return minLuecke;
        }
        var luecke = 0;
        function malen() { malenLand(); luecke = malenSpek(); }
        function lauf() {
            if (laeuft) return;
            laeuft = true; bLauf.disabled = true; b100.disabled = true; hist.textContent = '';
            var u = [], v = [], i;
            for (i = 0; i < 8; i++) { u.push(1 / Math.sqrt(8)); v.push(0); }
            var dt = Math.min(0.02, T / 300), schritte = Math.ceil(T / dt); dt = T / schritte;
            var proBild = Math.max(1, Math.ceil(schritte / 120)), k = 0;
            function mv(M, x) { return M.map(function (r) { var z = 0; for (var j = 0; j < 8; j++) z += r[j] * x[j]; return z; }); }
            function abl(t, uu, vv) { var M = hMatrix(Math.min(1, t / T)); return [mv(M, vv), mv(M, uu).map(function (x) { return -x; })]; }
            function add(x, y, f) { return x.map(function (a, j) { return a + f * y[j]; }); }
            function bild() {
                for (var r = 0; r < proBild && k < schritte; r++, k++) {
                    var t = k * dt;
                    var k1 = abl(t, u, v);
                    var k2 = abl(t + dt / 2, add(u, k1[0], dt / 2), add(v, k1[1], dt / 2));
                    var k3 = abl(t + dt / 2, add(u, k2[0], dt / 2), add(v, k2[1], dt / 2));
                    var k4 = abl(t + dt, add(u, k3[0], dt), add(v, k3[1], dt));
                    for (var j = 0; j < 8; j++) {
                        u[j] += dt / 6 * (k1[0][j] + 2 * k2[0][j] + 2 * k3[0][j] + k4[0][j]);
                        v[j] += dt / 6 * (k1[1][j] + 2 * k2[1][j] + 2 * k3[1][j] + k4[1][j]);
                    }
                }
                pEnde = u.map(function (a, j) { return a * a + v[j] * v[j]; });
                sJetzt = Math.min(1, k / schritte);
                malen();
                if (k < schritte) { requestAnimationFrame(bild); return; }
                laeuft = false; bLauf.disabled = false; b100.disabled = false;
                var R = malenLand(), pBest = 0;
                R.E.forEach(function (e, j) { if (Math.abs(e - R.min) < 1e-9) pBest += pEnde[j]; });
                info.className = 'rueck ' + (pBest > .9 ? 'ok' : 'nein');
                info.textContent = 'Am Ende landet das System mit ' + prozent(pBest) + ' in einer besten Lösung. ' + (pBest > .9
                    ? 'Langsam genug: Das System ist im Grundzustand geblieben (adiabatisch).'
                    : 'Zu schnell für die engste Lücke (' + zahl(luecke) + '): Das System ist teilweise auf höhere Niveaus „gesprungen“. Wähle ein größeres T.');
            }
            requestAnimationFrame(bild);
        }
        bLauf.addEventListener('click', lauf);
        b100.addEventListener('click', function () {
            if (!pEnde) { info.className = 'rueck neutral'; info.textContent = 'Erst einmal umformen (▶), dann messen.'; return; }
            var z = {}, i, r, acc;
            for (var m = 0; m < 100; m++) { r = Math.random(); acc = 0; for (i = 0; i < 8; i++) { acc += pEnde[i]; if (r < acc) break; } i = Math.min(i, 7); z[i] = (z[i] || 0) + 1; }
            hist.textContent = '';
            hist.appendChild(h('strong', { cls: 'klein', text: '100 Durchläufe, je eine Messung am Ende:' }));
            Object.keys(z).sort(function (a, b) { return z[b] - z[a]; }).forEach(function (k) {
                var wer = [0, 1, 2].map(function (p) { return PERS[p][0] + ((k >> (2 - p)) & 1 ? '2' : '1'); }).join(' ');
                hist.appendChild(h('div', { cls: 'qs-hist-zeile' }, [h('span', { text: wer }), h('div', { cls: 'bar', style: 'width:' + z[k] + '%' }), h('span', { text: z[k] + '×' })]));
            });
        });
        malen();
        info.textContent = 'Das Quantensystem startet im einfachsten Grundzustand (alle Aufteilungen gleich stark überlagert) und wird langsam in die Energielandschaft des Problems umgeformt. Stell T ein und starte.';
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-qubit]').forEach(qubit);
        document.querySelectorAll('[data-qsim]').forEach(qsim);
        document.querySelectorAll('[data-adiabat]').forEach(adiabat);
    });
})();
