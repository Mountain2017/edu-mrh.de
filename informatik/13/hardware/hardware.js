/*
 * Exkurs Hardware (Informatik 13) – interaktive Werkzeuge der Stationen E.1 bis E.5
 *   (Gatter und Werkstatt: logik.js, Quanten: quanten.js)
 *
 *   <div data-schalter="reihe|parallel|wechsel" data-name="UND"></div>   Schalter-Labor mit Lampe, Wahrheitstabelle
 *   <div data-dotierung></div>                     Siliziumgitter rein / n-dotiert / p-dotiert, Spannung anlegen
 *   <div data-mosfet></div>                        MOSFET-Querschnitt mit Gate-Spannung (n- und p-Kanal)
 *   <div data-cmos="not|nand|nor|bau"></div>       CMOS-Gatter auf Transistorebene; "bau" = Netze selbst wählen
 *   <div data-zk="4"></div>                        Zweierkomplement mit Zahlenrad
 *   <div data-alu></div>                           4-Bit-ALU mit Steuerleitungen, Multiplexer und Flags
 *   <div data-latch></div>                         Speicherglied (NOR-Latch) und Register mit Takt
 *   <div data-parallel></div>                      CPU gegen GPU: unabhängige und abhängige Arbeit
 *   <div data-systolisch></div>                    systolisches Array 3×3 (Matrixmultiplikation wie in einer TPU)
 *   <div data-stepper><div class="step" data-titel="…" data-icon="…" [data-art="klassisch|quanten"]>…</div>…</div>
 *                                                  Schrittfolge mit Kette zum Anklicken
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
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
    function bitKnopf(label, onclick) {
        var b = h('button', { type: 'button', cls: 'bit', 'aria-label': label });
        b.addEventListener('click', onclick);
        return b;
    }
    function setzeBit(b, v) { b.textContent = v; b.classList.toggle('an', !!v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }
    function bin(x, n) { var t = (x >>> 0).toString(2); while (t.length < n) t = '0' + t; return t.slice(-n); }
    function sichtbar(el, fn) {
        if (!('IntersectionObserver' in window)) { fn(true); return; }
        new IntersectionObserver(function (e) { fn(e[0].isIntersecting); }).observe(el);
    }

    // ================= Schalter-Labor =================
    var SCHALTUNGEN = {
        reihe: {
            lampe: function (a, b) { return a && b; },
            draehte: [
                ['M40,95 V30 H110', function (a, b) { return a && b; }], ['M150,30 H200', function (a, b) { return a && b; }],
                ['M240,30 H320 V94', function (a, b) { return a && b; }], ['M320,126 V175 H40 V105', function (a, b) { return a && b; }]
            ],
            schalter: [{ x1: 110, x2: 150, y: 30, n: 'A' }, { x1: 200, x2: 240, y: 30, n: 'B' }]
        },
        parallel: {
            lampe: function (a, b) { return a || b; },
            draehte: [
                ['M40,95 V30 H110', function (a, b) { return a || b; }], ['M110,30 H150', function (a) { return a; }], ['M190,30 H250', function (a) { return a; }],
                ['M110,30 V85 H150', function (a, b) { return b; }], ['M190,85 H250 V30', function (a, b) { return b; }],
                ['M250,30 H320 V94', function (a, b) { return a || b; }], ['M320,126 V175 H40 V105', function (a, b) { return a || b; }]
            ],
            schalter: [{ x1: 150, x2: 190, y: 30, n: 'A' }, { x1: 150, x2: 190, y: 85, n: 'B' }]
        },
        wechsel: {
            lampe: function (a, b) { return a === b; },
            draehte: [
                ['M40,95 V55 H100', function (a, b) { return a === b; }],
                ['M140,30 H240', function (a, b) { return !a && !b; }], ['M140,85 H240', function (a, b) { return a && b; }],
                ['M280,55 H320 V94', function (a, b) { return a === b; }], ['M320,126 V175 H40 V105', function (a, b) { return a === b; }]
            ],
            wechsler: [{ x: 100, ziel: 140, n: 'A' }, { x: 280, ziel: 240, n: 'B' }]
        }
    };
    function schalter(box) {
        var art = box.getAttribute('data-schalter') || 'reihe', S = SCHALTUNGEN[art];
        var name = box.getAttribute('data-name') || '';
        var a = 0, b = 0, gesehen = {};
        box.classList.add('werk');
        var svg = s('svg', { viewBox: '0 0 360 200', 'class': 'hw-svg sl-svg', role: 'img', 'aria-label': 'Stromkreis mit Batterie, zwei Schaltern A und B und einer Lampe' });
        var tab = h('table', { cls: 'wt' });
        tab.appendChild(h('tr', {}, [h('th', { text: 'A' }), h('th', { text: 'B' }), h('th', { cls: 'trenn', text: 'Lampe' })]));
        var zeilen = [];
        [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (z) {
            var tr = h('tr', {}, [h('td', { text: z[0] }), h('td', { text: z[1] }), h('td', { cls: 'trenn', text: '?' })]);
            zeilen.push(tr); tab.appendChild(tr);
        });
        var meldung = h('p', { cls: 'klein', 'aria-live': 'polite' });
        var kA = bitKnopf('Schalter A', function () { a ^= 1; malen(); });
        var kB = bitKnopf('Schalter B', function () { b ^= 1; malen(); });
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [
            h('div', {}, [svg, h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Schalter:' }), h('span', {}, ['A ', kA]), h('span', {}, ['B ', kB])])]),
            h('div', {}, [h('strong', { text: 'Was hast du beobachtet?' }), tab, meldung])
        ]));
        function malen() {
            svg.textContent = '';
            S.draehte.forEach(function (d) { s('path', { d: d[0], 'class': 'draht' + (d[1](a, b) ? ' strom' : '') }, svg); });
            // Batterie
            s('line', { x1: 24, y1: 95, x2: 56, y2: 95, stroke: '#0f172a', 'stroke-width': 4 }, svg);
            s('line', { x1: 32, y1: 105, x2: 48, y2: 105, stroke: '#0f172a', 'stroke-width': 7 }, svg);
            st('text', { x: 62, y: 98, 'font-size': 12, fill: '#334155' }, '+', svg);
            st('text', { x: 62, y: 114, 'font-size': 12, fill: '#334155' }, '−', svg);
            st('text', { x: 8, y: 140, 'font-size': 11, fill: '#475569' }, 'Batterie', svg);
            // Lampe
            var an = S.lampe(a, b);
            s('circle', { cx: 320, cy: 110, r: 16, fill: an ? '#fde047' : '#f1f5f9', stroke: an ? '#ca8a04' : '#64748b', 'stroke-width': 3 }, svg);
            s('path', { d: 'M309,99 L331,121 M331,99 L309,121', stroke: an ? '#a16207' : '#64748b', 'stroke-width': 2 }, svg);
            if (an) s('circle', { cx: 320, cy: 110, r: 26, fill: 'none', stroke: '#facc15', 'stroke-width': 3, opacity: .5 }, svg);
            st('text', { x: 343, y: 114, 'font-size': 12, fill: '#475569' }, 'Lampe', svg).setAttribute('text-anchor', 'end');
            // Schalter
            (S.schalter || []).forEach(function (sc) {
                var v = sc.n === 'A' ? a : b;
                var g = s('g', { 'class': 'schalter', tabindex: 0, role: 'button', 'aria-label': 'Schalter ' + sc.n + (v ? ' geschlossen' : ' offen') }, svg);
                s('rect', { x: sc.x1 - 6, y: sc.y - 34, width: sc.x2 - sc.x1 + 12, height: 46, fill: 'transparent', rx: 6 }, g);
                s('circle', { cx: sc.x1, cy: sc.y, r: 4, fill: '#0f172a' }, g);
                s('circle', { cx: sc.x2, cy: sc.y, r: 4, fill: '#0f172a' }, g);
                s('line', { x1: sc.x1, y1: sc.y, x2: v ? sc.x2 : sc.x2 - 6, y2: v ? sc.y : sc.y - 24, stroke: v ? '#ea580c' : '#0f172a', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
                st('text', { x: (sc.x1 + sc.x2) / 2, y: sc.y + 22, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#0f172a' }, sc.n, g);
                g.addEventListener('click', function () { if (sc.n === 'A') a ^= 1; else b ^= 1; malen(); });
                g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (sc.n === 'A') a ^= 1; else b ^= 1; malen(); } });
            });
            (S.wechsler || []).forEach(function (w) {
                var v = w.n === 'A' ? a : b;
                var g = s('g', { 'class': 'schalter', tabindex: 0, role: 'button', 'aria-label': 'Wechselschalter ' + w.n + ' in Stellung ' + v }, svg);
                var x0 = Math.min(w.x, w.ziel) - 8;
                s('rect', { x: x0, y: 18, width: 56, height: 80, fill: 'transparent' }, g);
                s('circle', { cx: w.x, cy: 55, r: 4, fill: '#0f172a' }, g);
                s('circle', { cx: w.ziel, cy: 30, r: 4, fill: '#0f172a' }, g);
                s('circle', { cx: w.ziel, cy: 85, r: 4, fill: '#0f172a' }, g);
                s('line', { x1: w.x, y1: 55, x2: w.ziel, y2: v ? 85 : 30, stroke: '#ea580c', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
                st('text', { x: w.x, y: 118, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#0f172a' }, w.n + ' = ' + v, g);
                g.addEventListener('click', function () { if (w.n === 'A') a ^= 1; else b ^= 1; malen(); });
                g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (w.n === 'A') a ^= 1; else b ^= 1; malen(); } });
            });
            if (S.wechsler) {
                st('text', { x: 190, y: 24, 'text-anchor': 'middle', 'font-size': 10, fill: '#64748b' }, 'Stellung 0', svg);
                st('text', { x: 190, y: 100, 'text-anchor': 'middle', 'font-size': 10, fill: '#64748b' }, 'Stellung 1', svg);
            }
            setzeBit(kA, a); setzeBit(kB, b);
            var k = a * 2 + b;
            gesehen[k] = an ? 1 : 0;
            zeilen.forEach(function (tr, i) {
                tr.classList.toggle('akt', i === k);
                var td = tr.lastChild;
                td.textContent = gesehen[i] === undefined ? '?' : gesehen[i] ? 'an (1)' : 'aus (0)';
                td.classList.toggle('eins', gesehen[i] === 1);
            });
            var n = Object.keys(gesehen).length;
            meldung.textContent = n < 4 ? 'Probiere alle vier Stellungen aus (' + n + ' von 4).' : name ? '✓ Alle Fälle gefunden. Diese Schaltung verhält sich wie ' + name + '.' : '✓ Alle Fälle gefunden.';
        }
        malen();
    }

    // ================= Dotierung =================
    function dotierung(box) {
        var modus = 'rein', feld = false, teilchen = [], laeuft = false, sicht = false;
        box.classList.add('werk');
        var W = 360, H = 250;
        var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'hw-svg dot-svg', role: 'img', 'aria-label': 'Siliziumgitter' });
        var lGitter = s('g', {}, svg), lTeil = s('g', {}, svg), lFeld = s('g', {}, svg);
        var text = h('p', { cls: 'klein', 'aria-live': 'polite' });
        var knoepfe = [['rein', 'Reines Silizium'], ['n', 'n-dotiert (Phosphor)'], ['p', 'p-dotiert (Bor)']].map(function (m) {
            var b = h('button', { type: 'button', cls: 'knopf', text: m[1] });
            b.addEventListener('click', function () { modus = m[0]; aufbauen(); });
            return b;
        });
        var bFeld = h('button', { type: 'button', cls: 'knopf', text: '🔋 Spannung anlegen' });
        bFeld.addEventListener('click', function () { feld = !feld; bFeld.classList.toggle('aktiv', feld); bFeld.textContent = feld ? '🔋 Spannung aus' : '🔋 Spannung anlegen'; zeichneFeld(); erklaeren(); });
        box.appendChild(h('div', { cls: 'knopfzeile' }, knoepfe.concat([bFeld])));
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [svg, text]));
        var DOT = [[1, 1], [3, 2]];
        function atomArt(i, j) {
            if (modus !== 'rein' && DOT.some(function (d) { return d[0] === i && d[1] === j; })) return modus === 'n' ? 'p' : 'b';
            return '';
        }
        function aufbauen() {
            knoepfe.forEach(function (b, i) { b.classList.toggle('aktiv', ['rein', 'n', 'p'][i] === modus); });
            lGitter.textContent = '';
            var i, j;
            for (j = 0; j < 4; j++) for (i = 0; i < 5; i++) {
                var x = 60 + i * 60, y = 35 + j * 60;
                if (i < 4) s('line', { x1: x, y1: y, x2: x + 60, y2: y, 'class': 'bindung' }, lGitter);
                if (j < 3) s('line', { x1: x, y1: y, x2: x, y2: y + 60, 'class': 'bindung' }, lGitter);
            }
            for (j = 0; j < 4; j++) for (i = 0; i < 5; i++) {
                var xx = 60 + i * 60, yy = 35 + j * 60, a = atomArt(i, j);
                s('circle', { cx: xx, cy: yy, r: 17, 'class': 'atom ' + a }, lGitter);
                st('text', { x: xx, y: yy + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#0f172a' }, a === 'p' ? 'P' : a === 'b' ? 'B' : 'Si', lGitter);
                // Bindungselektronen als Punkte
                [[1, 0], [0, 1]].forEach(function (r) {
                    if ((r[0] && i < 4) || (r[1] && j < 3)) {
                        var mx = xx + r[0] * 30, my = yy + r[1] * 30;
                        var fehlt = modus === 'p' && ((a === 'b' && r[0]) || (atomArt(i + r[0], j + r[1]) === 'b' && false));
                        s('circle', { cx: mx - r[1] * 4 - r[0] * 0, cy: my - r[0] * 4, r: 2.6, fill: '#1e3a8a' }, lGitter);
                        if (!fehlt) s('circle', { cx: mx + r[1] * 4, cy: my + r[0] * 4, r: 2.6, fill: '#1e3a8a' }, lGitter);
                    }
                });
            }
            teilchen = [];
            if (modus !== 'rein') DOT.forEach(function (d) {
                teilchen.push({ x: 60 + d[0] * 60 + 30, y: 35 + d[1] * 60 + (modus === 'n' ? 18 : 0), vx: Math.random() * 2 - 1, vy: Math.random() * 2 - 1 });
            });
            zeichneFeld(); erklaeren(); starte();
        }
        function zeichneFeld() {
            lFeld.textContent = '';
            if (!feld) return;
            st('text', { x: 14, y: 140, 'font-size': 22, 'font-weight': 800, fill: '#dc2626' }, '+', lFeld);
            st('text', { x: W - 26, y: 140, 'font-size': 22, 'font-weight': 800, fill: '#2563eb' }, '−', lFeld);
            st('text', { x: W / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#475569' }, 'Spannung: links Pluspol, rechts Minuspol', lFeld);
        }
        function erklaeren() {
            text.innerHTML = modus === 'rein'
                ? '<strong>Reines Silizium:</strong> Jedes Si-Atom hat 4 Außenelektronen und teilt sie mit seinen 4 Nachbarn (je 2 Punkte = eine Bindung). Alle Elektronen stecken in Bindungen fest. Es gibt fast keine beweglichen Ladungsträger, der Kristall leitet bei Raumtemperatur kaum.' + (feld ? ' <em>Auch mit Spannung fließt praktisch kein Strom.</em>' : '')
                : modus === 'n'
                    ? '<strong>n-dotiert:</strong> Phosphor (P) hat 5 Außenelektronen. Vier stecken in Bindungen, das fünfte ist nur schwach gebunden und wandert frei durch den Kristall (blauer Punkt, <strong>negativ</strong>). ' + (feld ? 'Mit Spannung driften die Elektronen zum <strong>Pluspol</strong>: Es fließt Strom.' : 'Ohne Spannung bewegen sie sich ziellos.')
                    : '<strong>p-dotiert:</strong> Bor (B) hat nur 3 Außenelektronen. Eine Bindung bleibt unvollständig: ein <strong>Loch</strong>. Ein Nachbarelektron kann hineinspringen, dann wandert das Loch weiter. Es verhält sich wie eine bewegliche <strong>positive</strong> Ladung (roter Kreis). ' + (feld ? 'Mit Spannung driften die Löcher zum <strong>Minuspol</strong>.' : '');
        }
        function schritt() {
            if (!laeuft) return;
            lTeil.textContent = '';
            teilchen.forEach(function (t) {
                t.vx += (Math.random() - .5) * .5; t.vy += (Math.random() - .5) * .5;
                t.vx *= .9; t.vy *= .9;
                if (feld) t.vx += modus === 'n' ? -.12 : .12;
                t.x += t.vx; t.y += t.vy;
                if (t.y < 25) { t.y = 25; t.vy = Math.abs(t.vy); }
                if (t.y > 225) { t.y = 225; t.vy = -Math.abs(t.vy); }
                if (feld) { if (t.x < 40) t.x = 320; if (t.x > 320) t.x = 40; }
                else { if (t.x < 50) { t.x = 50; t.vx = Math.abs(t.vx); } if (t.x > 310) { t.x = 310; t.vx = -Math.abs(t.vx); } }
                if (modus === 'n') s('circle', { cx: t.x, cy: t.y, r: 6, 'class': 'el' }, lTeil);
                else { s('circle', { cx: t.x, cy: t.y, r: 7, 'class': 'loch' }, lTeil); st('text', { x: t.x, y: t.y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#dc2626' }, '+', lTeil); }
            });
            requestAnimationFrame(schritt);
        }
        function starte() { if (!laeuft && sicht && teilchen.length) { laeuft = true; requestAnimationFrame(schritt); } if (!teilchen.length) { laeuft = false; lTeil.textContent = ''; } }
        sichtbar(box, function (v) { sicht = v; if (!v) laeuft = false; else starte(); });
        aufbauen();
    }

    // ================= MOSFET =================
    var VDD = 1.0, UTH = 0.35;
    function mosfet(box) {
        var typ = 'n', ug = 0, phase = 0, laeuft = false, sicht = false;
        box.classList.add('werk');
        var bN = h('button', { type: 'button', cls: 'knopf aktiv', text: 'n-Kanal (nMOS)' });
        var bP = h('button', { type: 'button', cls: 'knopf', text: 'p-Kanal (pMOS)' });
        var regler = h('input', { type: 'range', min: 0, max: 100, value: 0, 'aria-label': 'Gate-Spannung' });
        var anzeigeU = h('span', { cls: 'zahl' });
        var status = h('span', { cls: 'mos-status aus' });
        var svg = s('svg', { viewBox: '0 0 420 270', 'class': 'hw-svg', role: 'img', 'aria-label': 'Querschnitt durch einen MOSFET' });
        var kurve = s('svg', { viewBox: '0 0 220 150', 'class': 'hw-svg', role: 'img', 'aria-label': 'Kennlinie: Strom in Abhängigkeit von der Gate-Spannung' });
        var erkl = h('p', { cls: 'klein', 'aria-live': 'polite' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [bN, bP]));
        box.appendChild(h('div', { cls: 'mos-regler' }, [h('label', { text: 'Spannung am Gate U_G:' }), regler, anzeigeU, status]));
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [svg, h('div', {}, [kurve, erkl])]));
        bN.addEventListener('click', function () { typ = 'n'; bN.classList.add('aktiv'); bP.classList.remove('aktiv'); malen(); });
        bP.addEventListener('click', function () { typ = 'p'; bP.classList.add('aktiv'); bN.classList.remove('aktiv'); malen(); });
        regler.addEventListener('input', function () { ug = regler.value / 100 * VDD; malen(); });
        var lStatisch = s('g', {}, svg), lBeweg = s('g', {}, svg);
        function staerke() {   // 0 … 1
            var u = typ === 'n' ? ug - UTH : (VDD - UTH) - ug;
            return Math.max(0, Math.min(1, u / (VDD - UTH)));
        }
        function malen() {
            var k = staerke(), an = k > 0;
            anzeigeU.textContent = ug.toFixed(2).replace('.', ',') + ' V';
            status.className = 'mos-status ' + (an ? 'an' : 'aus');
            status.textContent = an ? 'leitet (Schalter zu)' : 'sperrt (Schalter offen)';
            var g = lStatisch;
            g.textContent = '';
            var subst = typ === 'n' ? '#fecdd3' : '#bfdbfe', wanne = typ === 'n' ? '#93c5fd' : '#fda4af';
            s('rect', { x: 20, y: 120, width: 380, height: 135, fill: subst, rx: 6 }, g);
            st('text', { x: 210, y: 246, 'text-anchor': 'middle', 'font-size': 12, fill: '#334155' }, typ === 'n' ? 'p-dotiertes Silizium (Substrat): bewegliche Löcher (+)' : 'n-dotiertes Silizium (Wanne): bewegliche Elektronen (−)', g);
            s('rect', { x: 40, y: 120, width: 95, height: 55, fill: wanne, rx: 8 }, g);
            s('rect', { x: 285, y: 120, width: 95, height: 55, fill: wanne, rx: 8 }, g);
            st('text', { x: 87, y: 154, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#0f172a' }, typ === 'n' ? 'n⁺' : 'p⁺', g);
            st('text', { x: 332, y: 154, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#0f172a' }, typ === 'n' ? 'n⁺' : 'p⁺', g);
            s('rect', { x: 135, y: 108, width: 150, height: 12, fill: '#e5e7eb', stroke: '#9ca3af' }, g);
            st('text', { x: 288, y: 101, 'font-size': 9, fill: '#475569' }, 'Oxid ↙', g);
            var gateFarbe = ug > .02 ? 'rgba(234,88,12,' + (0.35 + ug * .65) + ')' : '#475569';
            s('rect', { x: 135, y: 78, width: 150, height: 30, fill: gateFarbe, stroke: '#1e293b', rx: 3 }, g);
            st('text', { x: 210, y: 98, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff' }, 'Gate', g);
            // Anschlüsse
            s('rect', { x: 62, y: 104, width: 50, height: 16, fill: '#64748b' }, g);
            s('rect', { x: 308, y: 104, width: 50, height: 16, fill: '#64748b' }, g);
            s('line', { x1: 87, y1: 104, x2: 87, y2: 40, stroke: '#334155', 'stroke-width': 3 }, g);
            s('line', { x1: 333, y1: 104, x2: 333, y2: 40, stroke: '#334155', 'stroke-width': 3 }, g);
            s('line', { x1: 210, y1: 78, x2: 210, y2: 40, stroke: '#334155', 'stroke-width': 3 }, g);
            var uS = typ === 'n' ? '0 V' : '1 V', uD = typ === 'n' ? '1 V' : '0 V';
            st('text', { x: 87, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, 'Source (' + uS + ')', g);
            st('text', { x: 333, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, 'Drain (' + uD + ')', g);
            st('text', { x: 210, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#c2410c' }, 'Gate (' + ug.toFixed(2).replace('.', ',') + ' V)', g);
            // feste Mehrheitsträger im Substrat: werden unter dem Gate verdrängt
            var verdraengt = typ === 'n' ? ug > 0.12 : ug < VDD - 0.12;
            for (var i = 0; i < 14; i++) {
                var x = 40 + (i * 53) % 340, y = 190 + (i * 37) % 40;
                st('text', { x: x, y: y, 'font-size': 14, 'font-weight': 800, fill: typ === 'n' ? '#be123c' : '#1d4ed8' }, typ === 'n' ? '+' : '−', g);
            }
            for (i = 0; i < 5; i++) {
                if (!verdraengt) st('text', { x: 150 + i * 28, y: 135 + (i % 2) * 8, 'font-size': 14, 'font-weight': 800, fill: typ === 'n' ? '#be123c' : '#1d4ed8' }, typ === 'n' ? '+' : '−', g);
            }
            if (verdraengt && !an) st('text', { x: 210, y: 140, 'text-anchor': 'middle', 'font-size': 10, fill: '#475569' }, 'Verarmungszone: ' + (typ === 'n' ? 'Löcher' : 'Elektronen') + ' verdrängt', g);
            if (an) {
                s('rect', { x: 135, y: 120, width: 150, height: 4 + 10 * k, fill: typ === 'n' ? '#2563eb' : '#dc2626', opacity: .25 + .5 * k }, g);
                st('text', { x: 210, y: 150 + 8 * k, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: typ === 'n' ? '#1e3a8a' : '#7f1d1d' }, 'leitender ' + typ + '-Kanal', g);
            }
            kennlinie(k);
            erkl.innerHTML = typ === 'n'
                ? (an ? 'Die positive Gate-Spannung zieht <strong>Elektronen</strong> an die Oberfläche unter dem Gate. Ab der <strong>Schwellenspannung</strong> (hier 0,35 V) bilden sie einen leitenden Kanal zwischen Source und Drain: Strom fließt. Je höher U_G, desto mehr Elektronen, desto mehr Strom.'
                    : 'Unter dem Gate liegt p-Silizium. Zwischen den beiden n-Bereichen gibt es keinen durchgehenden Weg für Elektronen: Der Transistor <strong>sperrt</strong>. Durch das Oxid fließt nie Strom, das Gate wirkt nur über sein elektrisches Feld (daher „Feldeffekt“-Transistor).')
                : (an ? 'Beim pMOS ist alles umgekehrt: Liegt das Gate <strong>tief</strong> (nahe 0 V, also deutlich unter der Source mit 1 V), sammeln sich <strong>Löcher</strong> unter dem Gate und bilden einen p-Kanal. Der pMOS leitet bei Eingang 0.'
                    : 'Liegt das Gate hoch (nahe 1 V wie die Source), entsteht kein p-Kanal: Der pMOS <strong>sperrt</strong> bei Eingang 1. Ziehe den Regler nach links.');
            starte();
        }
        function kennlinie(k) {
            kurve.textContent = '';
            s('line', { x1: 30, y1: 125, x2: 210, y2: 125, stroke: '#334155', 'stroke-width': 1.5 }, kurve);
            s('line', { x1: 30, y1: 125, x2: 30, y2: 10, stroke: '#334155', 'stroke-width': 1.5 }, kurve);
            st('text', { x: 205, y: 117, 'text-anchor': 'end', 'font-size': 10 }, 'U_G in V', kurve);
            st('text', { x: 34, y: 14, 'font-size': 10 }, 'Strom', kurve);
            [0, .5, 1].forEach(function (u) { st('text', { x: 30 + u * 170, y: 138, 'text-anchor': 'middle', 'font-size': 9 }, String(u).replace('.', ','), kurve); });
            var d = '';
            for (var i = 0; i <= 50; i++) {
                var u = i / 50 * VDD, kk = typ === 'n' ? (u - UTH) : (VDD - UTH - u);
                var I = Math.pow(Math.max(0, kk / (VDD - UTH)), 2);
                d += (i ? 'L' : 'M') + (30 + u * 170).toFixed(1) + ',' + (125 - I * 105).toFixed(1);
            }
            s('path', { d: d, fill: 'none', stroke: typ === 'n' ? '#2563eb' : '#dc2626', 'stroke-width': 2.5 }, kurve);
            var ux = typ === 'n' ? UTH : VDD - UTH;
            s('line', { x1: 30 + ux * 170, y1: 125, x2: 30 + ux * 170, y2: 20, stroke: '#94a3b8', 'stroke-dasharray': '3 3' }, kurve);
            st('text', { x: 30 + ux * 170 + 3, y: 30, 'font-size': 9, fill: '#475569' }, 'Schwelle', kurve);
            s('circle', { cx: 30 + ug * 170, cy: 125 - k * k * 105, r: 5, fill: '#ea580c' }, kurve);
        }
        function bewegung() {
            if (!laeuft) return;
            var k = staerke();
            lBeweg.textContent = '';
            if (k > 0) {
                phase = (phase + 0.6 + 2.5 * k) % 150;
                var n = Math.round(3 + 9 * k);
                for (var i = 0; i < n; i++) {
                    var x = 135 + ((phase + i * 150 / n) % 150), y = 122 + (i % 3) * 3 * k;
                    if (typ === 'n') s('circle', { cx: x, cy: y + 2, r: 3.2, fill: '#1d4ed8' }, lBeweg);
                    else s('circle', { cx: 420 - x, cy: y + 2, r: 3.4, fill: '#fff', stroke: '#dc2626', 'stroke-width': 1.8 }, lBeweg);
                }
            }
            requestAnimationFrame(bewegung);
        }
        function starte() { if (!laeuft && sicht) { laeuft = true; requestAnimationFrame(bewegung); } }
        sichtbar(box, function (v) { sicht = v; if (!v) laeuft = false; else starte(); });
        malen();
    }

    // ================= CMOS-Gatter auf Transistorebene =================
    function cmos(box) {
        var art = box.getAttribute('data-cmos') || 'not';
        var a = 0, b = 0, pu = art === 'nor' ? 'reihe' : 'parallel', pd = art === 'nor' ? 'parallel' : 'reihe';
        var zweiEin = art !== 'not';
        box.classList.add('werk');
        var svg = s('svg', { viewBox: '0 0 420 330', 'class': 'hw-svg cmos-svg', role: 'img', 'aria-label': 'CMOS-Schaltung aus Transistoren' });
        var kA = bitKnopf('Eingang A', function () { a ^= 1; malen(); });
        var kB = bitKnopf('Eingang B', function () { b ^= 1; malen(); });
        var aus = h('div', { cls: 'cmos-ausgabe', 'aria-live': 'polite' });
        var tab = h('table', { cls: 'wt' });
        var rechts = h('div', {}, [h('strong', { text: 'Wahrheitstabelle' }), tab, aus]);
        var bedien = h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Eingänge:' }), h('span', {}, ['A ', kA]), zweiEin ? h('span', {}, ['B ', kB]) : null]);
        if (art === 'bau') {
            var wahl = function (titel, wert, setze) {
                var z = h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: titel })]);
                [['reihe', 'in Reihe'], ['parallel', 'parallel']].forEach(function (o) {
                    var k = h('button', { type: 'button', cls: 'knopf' + (wert() === o[0] ? ' aktiv' : ''), text: o[1] });
                    k.addEventListener('click', function () { setze(o[0]); z.querySelectorAll('.knopf').forEach(function (x) { x.classList.toggle('aktiv', x === k); }); malen(); });
                    z.appendChild(k);
                });
                return z;
            };
            pu = 'reihe'; pd = 'reihe';
            box.appendChild(wahl('Pull-up (pMOS):', function () { return pu; }, function (v) { pu = v; }));
            box.appendChild(wahl('Pull-down (nMOS):', function () { return pd; }, function (v) { pd = v; }));
        }
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [h('div', {}, [svg, bedien]), rechts]));

        function leitetPU(x, y) { return art === 'not' ? !x : pu === 'parallel' ? (!x || !y) : (!x && !y); }
        function leitetPD(x, y) { return art === 'not' ? !!x : pd === 'reihe' ? (x && y) : (x || y); }
        function ergebnis(x, y) {
            var u = leitetPU(x, y), d = leitetPD(x, y);
            return u && d ? 'K' : u ? 1 : d ? 0 : 'S';
        }
        function transistor(g, x, y, typ, name, wert, leitet, farbe) {
            s('line', { x1: x, y1: y, x2: x, y2: y + 14, 'class': 'leitung' + farbe }, g);
            s('line', { x1: x, y1: y + 46, x2: x, y2: y + 60, 'class': 'leitung' + farbe }, g);
            if (leitet) s('line', { x1: x, y1: y + 14, x2: x, y2: y + 46, 'class': 'kanal zu' }, g);
            else s('line', { x1: x, y1: y + 46, x2: x + 12, y2: y + 17, 'class': 'kanal offen' }, g);
            s('line', { x1: x - 9, y1: y + 15, x2: x - 9, y2: y + 45, 'class': 'gate' }, g);
            if (typ === 'p') { s('circle', { cx: x - 14, cy: y + 30, r: 4, fill: '#fff', stroke: '#0f172a', 'stroke-width': 2 }, g); s('line', { x1: x - 18, y1: y + 30, x2: x - 32, y2: y + 30, 'class': 'gate' }, g); }
            else s('line', { x1: x - 9, y1: y + 30, x2: x - 32, y2: y + 30, 'class': 'gate' }, g);
            st('text', { x: x - 36, y: y + 35, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 800, fill: wert ? '#ea580c' : '#475569' }, name + '=' + wert, g);
            st('text', { x: x + 15, y: y + 52, 'font-size': 10, fill: typ === 'p' ? '#b91c1c' : '#1d4ed8', 'font-weight': 700 }, typ + 'MOS', g);
        }
        function malen() {
            svg.textContent = '';
            var g = svg, u = leitetPU(a, b), d = leitetPD(a, b), r = ergebnis(a, b);
            var fu = u ? ' vdd' : '', fd = d ? ' gnd' : '';
            s('rect', { x: 60, y: 30, width: 260, height: 122, rx: 10, 'class': 'netz-p' }, g);
            s('rect', { x: 60, y: 168, width: 260, height: 128, rx: 10, 'class': 'netz-n' }, g);
            st('text', { x: 66, y: 46, 'font-size': 10, fill: '#991b1b', 'font-weight': 700 }, 'Pull-up-Netz', g);
            st('text', { x: 66, y: 290, 'font-size': 10, fill: '#1e3a8a', 'font-weight': 700 }, 'Pull-down-Netz', g);
            s('line', { x1: 50, y1: 25, x2: 370, y2: 25, stroke: '#dc2626', 'stroke-width': 5 }, g);
            st('text', { x: 372, y: 20, 'text-anchor': 'end', 'font-size': 11, fill: '#991b1b', 'font-weight': 700 }, 'VDD ≈ 1 V (logisch 1)', g);
            s('line', { x1: 50, y1: 305, x2: 370, y2: 305, stroke: '#2563eb', 'stroke-width': 5 }, g);
            st('text', { x: 372, y: 322, 'text-anchor': 'end', 'font-size': 11, fill: '#1e3a8a', 'font-weight': 700 }, 'GND = 0 V (logisch 0)', g);
            // Pull-up
            if (art === 'not') {
                s('line', { x1: 210, y1: 25, x2: 210, y2: 55, 'class': 'leitung' + fu }, g);
                transistor(g, 210, 55, 'p', 'A', a, !a, fu);
                s('line', { x1: 210, y1: 115, x2: 210, y2: 160, 'class': 'leitung' + fu }, g);
            } else if (pu === 'parallel') {
                [[170, 'A', a], [250, 'B', b]].forEach(function (t) {
                    s('line', { x1: t[0], y1: 25, x2: t[0], y2: 55, 'class': 'leitung' + (!t[2] ? fu : '') }, g);
                    transistor(g, t[0], 55, 'p', t[1], t[2], !t[2], !t[2] ? fu : '');
                    s('line', { x1: t[0], y1: 115, x2: t[0], y2: 135, 'class': 'leitung' + (!t[2] ? fu : '') }, g);
                });
                s('line', { x1: 170, y1: 135, x2: 250, y2: 135, 'class': 'leitung' + fu }, g);
                s('line', { x1: 210, y1: 135, x2: 210, y2: 160, 'class': 'leitung' + fu }, g);
            } else {
                s('line', { x1: 210, y1: 25, x2: 210, y2: 35, 'class': 'leitung' + fu }, g);
                transistor(g, 210, 35, 'p', 'A', a, !a, fu);
                transistor(g, 210, 95, 'p', 'B', b, !b, fu);
                s('line', { x1: 210, y1: 155, x2: 210, y2: 160, 'class': 'leitung' + fu }, g);
            }
            // Pull-down
            if (art === 'not') {
                s('line', { x1: 210, y1: 160, x2: 210, y2: 200, 'class': 'leitung' + fd }, g);
                transistor(g, 210, 200, 'n', 'A', a, !!a, fd);
                s('line', { x1: 210, y1: 260, x2: 210, y2: 305, 'class': 'leitung' + fd }, g);
            } else if (pd === 'reihe') {
                s('line', { x1: 210, y1: 160, x2: 210, y2: 176, 'class': 'leitung' + fd }, g);
                transistor(g, 210, 176, 'n', 'A', a, !!a, fd);
                transistor(g, 210, 236, 'n', 'B', b, !!b, fd);
                s('line', { x1: 210, y1: 296, x2: 210, y2: 305, 'class': 'leitung' + fd }, g);
            } else {
                s('line', { x1: 210, y1: 160, x2: 210, y2: 185, 'class': 'leitung' + fd }, g);
                s('line', { x1: 170, y1: 185, x2: 250, y2: 185, 'class': 'leitung' + fd }, g);
                [[170, 'A', a], [250, 'B', b]].forEach(function (t) {
                    s('line', { x1: t[0], y1: 185, x2: t[0], y2: 205, 'class': 'leitung' + (t[2] ? fd : '') }, g);
                    transistor(g, t[0], 205, 'n', t[1], t[2], !!t[2], t[2] ? fd : '');
                    s('line', { x1: t[0], y1: 265, x2: t[0], y2: 305, 'class': 'leitung' + (t[2] ? fd : '') }, g);
                });
            }
            // Ausgang
            s('line', { x1: 210, y1: 160, x2: 345, y2: 160, 'class': 'leitung', style: 'stroke:' + (r === 1 ? '#ea580c' : '#475569') }, g);
            s('circle', { cx: 210, cy: 160, r: 5, fill: '#0f172a' }, g);
            s('circle', { cx: 362, cy: 160, r: 17, fill: r === 1 ? '#fde047' : r === 0 ? '#e2e8f0' : '#ffe4e6', stroke: r === 1 ? '#ca8a04' : r === 0 ? '#94a3b8' : '#be123c', 'stroke-width': 3 }, g);
            st('text', { x: 362, y: 166, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800, fill: '#0f172a' }, r === 'K' ? '⚡' : r === 'S' ? '?' : String(r), g);
            st('text', { x: 362, y: 195, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, 'Y', g);
            setzeBit(kA, a); setzeBit(kB, b);
            // Tabelle
            tab.textContent = '';
            tab.appendChild(h('tr', {}, [h('th', { text: 'A' }), zweiEin ? h('th', { text: 'B' }) : null, h('th', { cls: 'trenn', text: 'Y' })]));
            var faelle = zweiEin ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0, 0], [1, 0]];
            var muster = '';
            faelle.forEach(function (f) {
                var y = ergebnis(f[0], f[1]);
                muster += y;
                var tr = h('tr', { cls: f[0] === a && (!zweiEin || f[1] === b) ? 'akt' : '' }, [h('td', { text: f[0] }), zweiEin ? h('td', { text: f[1] }) : null,
                    h('td', { cls: 'trenn' + (y === 1 ? ' eins' : ''), text: y === 'K' ? 'Kurzschluss!' : y === 'S' ? 'schwebt (?)' : y })]);
                tab.appendChild(tr);
            });
            var namen = { '10': 'NICHT', '1110': 'NAND', '1000': 'NOR' };
            aus.className = 'cmos-ausgabe ' + (r === 1 ? 'eins' : r === 0 ? 'null' : r === 'K' ? 'kurz' : 'schwebt');
            aus.textContent = r === 1 ? 'Y = 1: Das Pull-up-Netz leitet und verbindet den Ausgang mit VDD. Das Pull-down-Netz sperrt.'
                : r === 0 ? 'Y = 0: Das Pull-down-Netz leitet und verbindet den Ausgang mit GND. Das Pull-up-Netz sperrt.'
                : r === 'K' ? '⚡ Kurzschluss: Beide Netze leiten gleichzeitig. Strom fließt direkt von VDD nach GND, der Chip wird heiß, Y ist undefiniert.'
                : '? Keines der Netze leitet: Der Ausgang hängt in der Luft („schwebt“). Sein Wert ist zufällig.';
            if (art === 'bau') aus.textContent += namen[muster] ? '  ✓ Diese Kombination ergibt ein ' + namen[muster] + '-Gatter.' : '  ✗ Diese Kombination ist als Gatter unbrauchbar.';
        }
        malen();
    }

    // ================= Zweierkomplement =================
    function zk(box) {
        var n = 4, w = 0, schritt = '';
        box.classList.add('werk');
        var bits = h('span', { cls: 'bits' }), kn = [];
        for (var i = n - 1; i >= 0; i--) (function (i) {
            var k = bitKnopf('Bit ' + i + ' (Wert ' + (i === n - 1 ? '−8' : 1 << i) + ')', function () { w ^= (1 << i); schritt = ''; malen(); });
            kn[i] = k; bits.appendChild(h('span', { style: 'display:inline-flex;flex-direction:column;align-items:center;gap:2px' }, [k, h('small', { cls: 'klein', text: i === n - 1 ? '−8' : String(1 << i) })]));
        })(i);
        var uS = h('span', { cls: 'zahl' }), sS = h('span', { cls: 'zahl' });
        var bInv = h('button', { type: 'button', cls: 'knopf', text: '① alle Bits umdrehen' });
        var bPlus = h('button', { type: 'button', cls: 'knopf', text: '② +1' });
        var bZaehl = h('button', { type: 'button', cls: 'knopf', text: 'weiterzählen (+1)' });
        var info = h('div', { cls: 'rueck neutral', 'aria-live': 'polite' });
        var svg = s('svg', { viewBox: '0 0 260 260', 'class': 'hw-svg zk-svg', role: 'img', 'aria-label': 'Zahlenrad mit allen 4-Bit-Mustern' });
        svg.style.maxWidth = '300px';
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [
            h('div', {}, [
                h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Bitmuster:' }), bits]),
                h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'ohne Vorzeichen:' }), uS]),
                h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Zweierkomplement:' }), sS]),
                h('div', { cls: 'knopfzeile' }, [bInv, bPlus, bZaehl]), info]),
            svg]));
        function sw(x) { return x >= 8 ? x - 16 : x; }
        bInv.addEventListener('click', function () { var alt = w; w = (~w) & 15; schritt = 'Umgedreht: aus ' + sw(alt) + ' wird ' + sw(w) + '. Das ist ' + (sw(alt) === 0 ? '' : 'noch nicht') + ' das Negative, es fehlt genau 1. Drücke ②.'; malen(); });
        bPlus.addEventListener('click', function () { w = (w + 1) & 15; schritt = 'Plus 1 ergibt ' + sw(w) + '. Wenn du vorher ① gedrückt hast, ist das das Negative der Ausgangszahl.'; malen(); });
        bZaehl.addEventListener('click', function () { var alt = w; w = (w + 1) & 15; schritt = alt === 7 ? '⚠ Überlauf: 7 + 1 ergibt 1000₂, und das ist im Zweierkomplement −8! Das Rechenwerk meldet das mit dem Overflow-Bit O.' : alt === 15 ? 'Aus 1111₂ (−1) wird 0000₂ = 0: Das ist richtig, der Übertrag aus der höchsten Stelle fällt einfach weg.' : 'Weitergezählt: ' + sw(alt) + ' + 1 = ' + sw(w) + '.'; malen(); });
        function malen() {
            kn.forEach(function (k, i) { setzeBit(k, (w >> i) & 1); });
            uS.textContent = bin(w, 4) + '₂ = ' + w;
            sS.textContent = bin(w, 4) + '₂ = ' + sw(w) + (w >= 8 ? '   (−8 + ' + (w - 8) + ')' : '');
            info.textContent = schritt || 'Das höchste Bit zählt −8 statt +8. Beginnt ein Muster mit 1, ist die Zahl negativ.';
            svg.textContent = '';
            var cx = 130, cy = 130;
            for (var k = 0; k < 16; k++) {
                var a0 = (k - .5) / 16 * 2 * Math.PI - Math.PI / 2, a1 = (k + .5) / 16 * 2 * Math.PI - Math.PI / 2;
                var R = 120, r = 62;
                var d = 'M' + (cx + r * Math.cos(a0)) + ',' + (cy + r * Math.sin(a0)) + ' L' + (cx + R * Math.cos(a0)) + ',' + (cy + R * Math.sin(a0)) +
                    ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R * Math.cos(a1)) + ',' + (cy + R * Math.sin(a1)) + ' L' + (cx + r * Math.cos(a1)) + ',' + (cy + r * Math.sin(a1)) +
                    ' A' + r + ',' + r + ' 0 0 0 ' + (cx + r * Math.cos(a0)) + ',' + (cy + r * Math.sin(a0)) + ' Z';
                s('path', { d: d, 'class': 'seg', fill: k === w ? '#fdba74' : k >= 8 ? '#fce7f3' : '#e0f2fe' }, svg);
                var am = k / 16 * 2 * Math.PI - Math.PI / 2;
                st('text', { x: cx + 104 * Math.cos(am), y: cy + 104 * Math.sin(am) + 3, 'text-anchor': 'middle', 'font-size': 8.5, 'class': 'mono', fill: '#334155' }, bin(k, 4), svg);
                st('text', { x: cx + 78 * Math.cos(am), y: cy + 78 * Math.sin(am) + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: k >= 8 ? '#9d174d' : '#075985' }, String(sw(k)), svg);
            }
            var aw = w / 16 * 2 * Math.PI - Math.PI / 2;
            s('line', { x1: cx, y1: cy, x2: cx + 55 * Math.cos(aw), y2: cy + 55 * Math.sin(aw), 'class': 'zeiger' }, svg);
            s('circle', { cx: cx, cy: cy, r: 6, fill: '#0f172a' }, svg);
            s('line', { x1: cx + 58 * Math.cos(-Math.PI / 2 + 7.5 / 16 * 2 * Math.PI), y1: cy + 58 * Math.sin(-Math.PI / 2 + 7.5 / 16 * 2 * Math.PI), x2: cx + 124 * Math.cos(-Math.PI / 2 + 7.5 / 16 * 2 * Math.PI), y2: cy + 124 * Math.sin(-Math.PI / 2 + 7.5 / 16 * 2 * Math.PI), stroke: '#be123c', 'stroke-width': 3 }, svg);
        }
        malen();
    }

    // ================= ALU =================
    var OPS = [
        { k: 'ADD', code: '000', sub: 0, sel: '00', schreib: 1, rm: 'ADD x: A ← A + x' },
        { k: 'SUB', code: '001', sub: 1, sel: '00', schreib: 1, rm: 'SUB x: A ← A − x' },
        { k: 'CMP', code: '101', sub: 1, sel: '00', schreib: 0, rm: 'CMP x: rechnet A − x, ändert aber nur das Statusregister' },
        { k: 'AND', code: '010', sub: 0, sel: '01', schreib: 1, rm: '(in unserer Registermaschine nicht vorhanden, in echten Prozessoren schon)' },
        { k: 'OR', code: '011', sub: 0, sel: '10', schreib: 1, rm: '(in echten Prozessoren vorhanden)' },
        { k: 'XOR', code: '100', sub: 0, sel: '11', schreib: 1, rm: '(in echten Prozessoren vorhanden)' }
    ];
    function alu(box) {
        var A = 5, B = 3, op = OPS[0], verdeckt = false;
        box.classList.add('alu');
        function bitReihe(label, get, set) {
            var bits = h('span', { cls: 'bits' }), kn = [], z = h('span', { cls: 'zahl' });
            for (var i = 3; i >= 0; i--) (function (i) {
                var k = bitKnopf(label + ' Bit ' + i, function () { set(get() ^ (1 << i)); malen(); });
                kn[i] = k; bits.appendChild(k);
            })(i);
            box.appendChild(h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Operand ' + label + ':' }), bits, z]));
            return function () { kn.forEach(function (k, i) { setzeBit(k, (get() >> i) & 1); }); var v = get(); z.textContent = '= ' + v + (v >= 8 ? ' (mit Vorzeichen ' + (v - 16) + ')' : ''); };
        }
        var zA = bitReihe('A', function () { return A; }, function (v) { A = v; });
        var zB = bitReihe('B', function () { return B; }, function (v) { B = v; });
        var opsZ = h('div', { cls: 'alu-ops' }, [h('span', { cls: 'klein', text: 'Befehl vom Steuerwerk:' })]);
        var opKn = OPS.map(function (o) {
            var k = h('button', { type: 'button', cls: 'knopf', text: o.k });
            k.addEventListener('click', function () { op = o; malen(); });
            opsZ.appendChild(k);
            return k;
        });
        var cbV = h('input', { type: 'checkbox' });
        cbV.addEventListener('change', function () { verdeckt = cbV.checked; malen(); });
        opsZ.appendChild(h('label', { cls: 'klein', style: 'margin-left:auto' }, [cbV, ' Ergebnis verdecken (erst vorhersagen)']));
        box.appendChild(opsZ);
        var steuer = h('div', { cls: 'alu-steuer' });
        box.appendChild(steuer);
        var arith = h('div', { cls: 'alu-einheit' }), logik = h('div', { cls: 'alu-einheit' }), mux = h('div', { cls: 'alu-mux' });
        box.appendChild(h('div', { cls: 'alu-bild' }, [arith, logik, mux]));
        var rm = h('p', { cls: 'alu-rm' });
        box.appendChild(rm);
        function zeile(n, wert, cls) { return h('div', { cls: 'alu-zeile ' + (cls || '') }, [h('span', { cls: 'n', text: n }), h('span', { text: wert })]); }
        function malen() {
            zA(); zB();
            opKn.forEach(function (k, i) { k.classList.toggle('aktiv', OPS[i] === op); });
            box.classList.toggle('alu-verdeckt', verdeckt);
            var bE = op.sub ? (~B & 15) : B, c = [op.sub], sum = 0;
            for (var i = 0; i < 4; i++) {
                var x = (A >> i) & 1, y = (bE >> i) & 1;
                sum |= (x ^ y ^ c[i]) << i;
                c.push((x & y) | (x & c[i]) | (y & c[i]));
            }
            var und = A & B, oder = A | B, xo = A ^ B;
            var ar = op.sel === '00';
            var r = ar ? sum : op.sel === '01' ? und : op.sel === '10' ? oder : xo;
            var N = (r >> 3) & 1, Z = r === 0 ? 1 : 0, C = ar ? c[4] : 0, O = ar ? c[3] ^ c[4] : 0;
            steuer.innerHTML = '<b>Steuerleitungen:</b> <span>Opcode ' + op.code + '</span><span>SUB = ' + op.sub + '</span><span>Auswahl = ' + op.sel + '</span><span>Ergebnis übernehmen = ' + op.schreib + '</span>';
            arith.className = 'alu-einheit' + (ar ? ' gewaehlt' : '');
            arith.textContent = '';
            arith.appendChild(h('h5', { text: '➕ Addierwerk (rechnet immer)' }));
            arith.appendChild(zeile('A', bin(A, 4)));
            arith.appendChild(zeile('B XOR SUB', bin(bE, 4) + (op.sub ? '  (B umgedreht)' : '  (B unverändert)')));
            arith.appendChild(zeile('Überträge', c.slice().reverse().join(' ') + '  (c4 … c0, c0 = SUB)'));
            arith.appendChild(zeile('Summe', bin(sum, 4), 'alu-verdeck'));
            logik.className = 'alu-einheit' + (!ar ? ' gewaehlt' : '');
            logik.textContent = '';
            logik.appendChild(h('h5', { text: '🔣 Logikeinheit (rechnet auch immer)' }));
            logik.appendChild(zeile('A AND B', bin(und, 4), 'waehlbar alu-verdeck' + (op.sel === '01' ? ' gewaehlt' : '')));
            logik.appendChild(zeile('A OR B', bin(oder, 4), 'waehlbar alu-verdeck' + (op.sel === '10' ? ' gewaehlt' : '')));
            logik.appendChild(zeile('A XOR B', bin(xo, 4), 'waehlbar alu-verdeck' + (op.sel === '11' ? ' gewaehlt' : '')));
            mux.textContent = '';
            mux.appendChild(h('h5', { text: '🔀 Multiplexer: Auswahl ' + op.sel + ' lässt ' + (ar ? 'die Summe' : 'A ' + op.k + ' B') + ' durch' }));
            var erg = h('div', { cls: 'alu-verdeck' }, [zeile('Ergebnis', bin(r, 4) + ' = ' + r + (r >= 8 ? ' (mit Vorzeichen ' + (r - 16) + ')' : '') + (op.schreib ? '  → Akkumulator' : '  → wird verworfen'))]);
            mux.appendChild(erg);
            var fl = h('div', { cls: 'alu-flags alu-verdeck' });
            [['N', N, 'negativ'], ['Z', Z, 'null'], ['C', C, 'Übertrag'], ['O', O, 'Überlauf']].forEach(function (f) {
                fl.appendChild(h('span', { cls: 'alu-flag' + (f[1] ? ' an' : ''), title: f[2] }, [h('small', { text: f[0] + ' (' + f[2] + ')' }), h('span', { text: f[1] })]));
            });
            mux.appendChild(fl);
            if (verdeckt) {
                var bZ = h('button', { type: 'button', cls: 'knopf', text: 'Aufdecken' });
                bZ.addEventListener('click', function () { cbV.checked = false; verdeckt = false; malen(); });
                mux.appendChild(h('div', { cls: 'knopfzeile' }, [bZ]));
            }
            rm.innerHTML = 'In der Registermaschine: <code>' + op.rm + '</code>';
        }
        malen();
    }

    // ================= Speicherglied: NOR-Latch und Register =================
    function latch(box) {
        var S = 0, R = 0, Q = 0, Qb = 1, D = [0, 1, 1, 0], Reg = [0, 0, 0, 0];
        box.classList.add('werk');
        var svg = s('svg', { viewBox: '0 0 380 200', 'class': 'hw-svg', role: 'img', 'aria-label': 'Zwei rückgekoppelte NOR-Gatter (RS-Flipflop)' });
        var kS = bitKnopf('Setzen S', function () { S ^= 1; rechnen(); });
        var kR = bitKnopf('Rücksetzen R', function () { R ^= 1; rechnen(); });
        var info = h('div', { cls: 'rueck neutral', 'aria-live': 'polite' });
        box.appendChild(h('h4', { text: 'Ein Bit speichern: das RS-Flipflop' }));
        box.appendChild(h('div', { cls: 'zwei-spalten' }, [svg, h('div', {}, [
            h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'S (setzen):' }), kS]),
            h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'R (rücksetzen):' }), kR]), info])]));
        function rechnen() {
            for (var i = 0; i < 6; i++) { Q = 1 - (R | Qb); Qb = 1 - (S | Q); }
            setzeBit(kS, S); setzeBit(kR, R);
            info.className = 'rueck ' + (S && R ? 'nein' : 'neutral');
            info.textContent = S && R ? '⚠ S = R = 1 ist verboten: Beide Ausgänge werden 0. Lässt man beide gleichzeitig los, ist unklar, welcher Zustand bleibt.'
                : S ? 'S = 1 setzt Q auf 1. Schalte S wieder auf 0: Q bleibt 1!' : R ? 'R = 1 setzt Q auf 0. Schalte R wieder auf 0: Q bleibt 0.'
                : 'S = R = 0: Die Schaltung hält ihren Wert. Q = ' + Q + ' ist gespeichert, weil jeder Ausgang den anderen Eingang stützt.';
            malenL();
        }
        function farbe(v) { return v ? '#ea580c' : '#64748b'; }
        function nor(x, y, lbl) {
            s('rect', { x: x, y: y, width: 60, height: 60, fill: '#fff', stroke: '#1e293b', 'stroke-width': 2.5 }, svg);
            st('text', { x: x + 30, y: y + 36, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700 }, '≥1', svg);
            s('circle', { cx: x + 64, cy: y + 30, r: 4, fill: '#fff', stroke: '#1e293b', 'stroke-width': 2 }, svg);
        }
        function malenL() {
            svg.textContent = '';
            s('path', { d: 'M40,35 H150', fill: 'none', stroke: farbe(R), 'stroke-width': 3 }, svg);
            s('path', { d: 'M40,165 H150', fill: 'none', stroke: farbe(S), 'stroke-width': 3 }, svg);
            s('path', { d: 'M218,50 H305', fill: 'none', stroke: farbe(Q), 'stroke-width': 3 }, svg);
            s('path', { d: 'M218,150 H305', fill: 'none', stroke: farbe(Qb), 'stroke-width': 3 }, svg);
            s('path', { d: 'M260,50 V88 L120,112 V135 H150', fill: 'none', stroke: farbe(Q), 'stroke-width': 3 }, svg);
            s('path', { d: 'M260,150 V112 L120,88 V65 H150', fill: 'none', stroke: farbe(Qb), 'stroke-width': 3 }, svg);
            nor(150, 20); nor(150, 120);
            st('text', { x: 14, y: 40, 'font-size': 15, 'font-weight': 800 }, 'R=' + R, svg);
            st('text', { x: 14, y: 170, 'font-size': 15, 'font-weight': 800 }, 'S=' + S, svg);
            [[50, Q, 'Q'], [150, Qb, 'Q̄']].forEach(function (z) {
                s('circle', { cx: 325, cy: z[0], r: 16, fill: z[1] ? '#fde047' : '#e2e8f0', stroke: z[1] ? '#ca8a04' : '#94a3b8', 'stroke-width': 3 }, svg);
                st('text', { x: 325, y: z[0] + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800 }, String(z[1]), svg);
                st('text', { x: 348, y: z[0] + 5, 'font-size': 14, 'font-weight': 800 }, z[2], svg);
            });
        }
        rechnen();
        // Register mit Takt
        box.appendChild(h('h4', { text: 'Vier Bits mit Takt: ein Register', style: 'margin-top:1rem' }));
        box.appendChild(h('p', { cls: 'klein', text: 'Ein Register (z. B. der Akkumulator) besteht aus Flipflops, die nur bei der steigenden Taktflanke den Wert am Eingang D übernehmen. Ändere D: Q bleibt, bis der Takt kommt.' }));
        var dKn = [], qL = [];
        var dZ = h('span', { cls: 'bits' }), qZ = h('span', { cls: 'bits' });
        for (var i = 3; i >= 0; i--) (function (i) {
            var k = bitKnopf('D' + i, function () { D[i] ^= 1; zeigeReg(); });
            dKn[i] = k; dZ.appendChild(k);
            var l = h('span', { cls: 'lampe' }); qL[i] = l; qZ.appendChild(l);
        })(i);
        var bTakt = h('button', { type: 'button', cls: 'knopf voll', text: '⏱ Takt ↑' });
        var tInfo = h('span', { cls: 'klein', 'aria-live': 'polite' });
        bTakt.addEventListener('click', function () { Reg = D.slice(); tInfo.textContent = 'Taktflanke: Q hat D übernommen.'; zeigeReg(); });
        box.appendChild(h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Eingang D:' }), dZ]));
        box.appendChild(h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: '' }), bTakt, tInfo]));
        box.appendChild(h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'gespeichert Q:' }), qZ]));
        function zeigeReg() {
            dKn.forEach(function (k, i) { setzeBit(k, D[i]); });
            qL.forEach(function (l, i) { l.textContent = Reg[i]; l.classList.toggle('an', !!Reg[i]); });
            if (D.join() !== Reg.join() && tInfo.textContent.indexOf('wartet') < 0) tInfo.textContent = 'D hat sich geändert, Q wartet auf den Takt.';
        }
        zeigeReg();
    }

    // ================= CPU gegen GPU =================
    function parallel(box) {
        var aufgabe = 'bild', t = 0, timer = null;
        var CPU = { n: 8, dauer: 1 }, GPU = { n: 512, dauer: 4 };
        box.classList.add('werk');
        var wahl = h('div', { cls: 'knopfzeile' });
        var bBild = h('button', { type: 'button', cls: 'knopf aktiv', text: '🖼️ Bild aufhellen: 1024 unabhängige Pixel' });
        var bKette = h('button', { type: 'button', cls: 'knopf', text: '🔗 Zinseszins: 64 Jahre, jedes braucht das vorige' });
        var bStart = h('button', { type: 'button', cls: 'knopf voll', text: '▶ Start' });
        wahl.appendChild(bBild); wahl.appendChild(bKette); wahl.appendChild(bStart);
        box.appendChild(wahl);
        function bahn(titel, info) {
            var c = h('canvas', { width: 32, height: 32, 'aria-hidden': 'true' }), z = h('div', { cls: 'zeit' });
            return { el: h('div', { cls: 'bahn' }, [h('h5', { text: titel }), h('p', { cls: 'klein', text: info }), c, z]), c: c, z: z };
        }
        var bc = bahn('CPU: 8 starke Kerne', 'je Schritt 1 Zeiteinheit (hoher Takt, schlau)');
        var bg = bahn('GPU: 512 einfache Recheneinheiten', 'je Schritt 4 Zeiteinheiten (niedriger Takt, einfach)');
        box.appendChild(h('div', { cls: 'rennen' }, [bc.el, bg.el]));
        var fazit = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        box.appendChild(fazit);
        var N = function () { return aufgabe === 'bild' ? 1024 : 64; };
        function fertig(P, zeit) {
            if (aufgabe === 'bild') return Math.min(N(), Math.floor(zeit / P.dauer) * P.n);
            return Math.min(N(), Math.floor(zeit / P.dauer));
        }
        function gesamt(P) { return aufgabe === 'bild' ? Math.ceil(N() / P.n) * P.dauer : N() * P.dauer; }
        function zeichne(b, P) {
            var ctx = b.c.getContext('2d'), n = fertig(P, t);
            var seite = aufgabe === 'bild' ? 32 : 8;
            b.c.width = seite; b.c.height = seite;
            for (var p = 0; p < seite * seite; p++) {
                var x = p % seite, y = Math.floor(p / seite);
                var hell = Math.round(90 + 80 * Math.sin(x / seite * 3.1) * Math.cos(y / seite * 2.2));
                if (aufgabe === 'bild') ctx.fillStyle = p < n ? 'rgb(' + (hell + 85) + ',' + (hell + 60) + ',' + 60 + ')' : 'rgb(' + (hell / 3) + ',' + (hell / 3.5) + ',40)';
                else ctx.fillStyle = p < n ? '#16a34a' : '#cbd5e1';
                ctx.fillRect(x, y, 1, 1);
            }
            var fertigZ = n >= N();
            b.z.textContent = (fertigZ ? '✓ fertig nach ' + gesamt(P) : 'Zeit: ' + Math.min(t, gesamt(P)).toFixed(0)) + ' Zeiteinheiten';
        }
        function alles() { zeichne(bc, CPU); zeichne(bg, GPU); }
        function waehle(a) {
            aufgabe = a; t = 0; if (timer) { clearInterval(timer); timer = null; }
            bBild.classList.toggle('aktiv', a === 'bild'); bKette.classList.toggle('aktiv', a === 'kette');
            fazit.className = 'rueck'; fazit.textContent = ''; bStart.disabled = false; alles();
        }
        bBild.addEventListener('click', function () { waehle('bild'); });
        bKette.addEventListener('click', function () { waehle('kette'); });
        bStart.addEventListener('click', function () {
            t = 0; bStart.disabled = true; fazit.className = 'rueck'; fazit.textContent = '';
            var ende = Math.max(gesamt(CPU), gesamt(GPU));
            timer = setInterval(function () {
                t += 1; alles();
                if (t >= ende) {
                    clearInterval(timer); timer = null; bStart.disabled = false;
                    var c = gesamt(CPU), g = gesamt(GPU);
                    fazit.className = 'rueck neutral';
                    fazit.textContent = aufgabe === 'bild'
                        ? 'Die GPU ist ' + (c / g) + '-mal schneller: Jede ihrer Einheiten ist langsamer, aber 512 arbeiten gleichzeitig. Bei unabhängigen Daten zählt der Durchsatz.'
                        : 'Hier gewinnt die CPU (' + c + ' gegen ' + g + '): Jeder Schritt braucht das Ergebnis des vorigen, also kann immer nur eine Einheit arbeiten. Die 511 anderen GPU-Einheiten warten. Es zählt die Geschwindigkeit eines einzelnen Kerns.';
                }
            }, 25);
        });
        alles();
    }

    // ================= Systolisches Array =================
    function systolisch(box) {
        var n = 3, t = -1, A, B;
        box.classList.add('werk');
        function neu() {
            A = []; B = [];
            for (var i = 0; i < n; i++) { A.push([]); B.push([]); for (var j = 0; j < n; j++) { A[i].push(Math.floor(Math.random() * 4)); B[i].push(Math.floor(Math.random() * 4)); } }
            t = -1;
        }
        A = [[1, 2, 0], [0, 1, 3], [2, 1, 1]]; B = [[1, 0, 2], [3, 1, 0], [0, 2, 1]];
        var mats = h('div', { cls: 'wert-zeile' });
        var raster = h('div', { cls: 'sys-raster', style: 'grid-template-columns: repeat(' + (n + 1) + ', minmax(0, 1fr)); max-width: 30rem' });
        var info = h('div', { cls: 'rueck neutral', 'aria-live': 'polite' });
        var bVor = h('button', { type: 'button', cls: 'knopf voll', text: 'Takt ▶' });
        var bZur = h('button', { type: 'button', cls: 'knopf', text: '◀ zurück' });
        var bNeu = h('button', { type: 'button', cls: 'knopf', text: 'Neue Zahlen' });
        box.appendChild(mats);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [bZur, bVor, bNeu]));
        box.appendChild(raster); box.appendChild(info);
        bVor.addEventListener('click', function () { if (t < 3 * n - 2) t++; malen(); });
        bZur.addEventListener('click', function () { if (t > -1) t--; malen(); });
        bNeu.addEventListener('click', function () { neu(); malen(); });
        function matText(M, name) {
            return h('span', { style: 'display:inline-block;margin-right:1rem' }, [h('strong', { text: name + ' = ' }), h('span', { cls: 'zahl', text: '[' + M.map(function (r) { return r.join(' '); }).join(' | ') + ']' })]);
        }
        function malen() {
            mats.textContent = '';
            mats.appendChild(matText(A, 'A')); mats.appendChild(matText(B, 'B'));
            raster.textContent = '';
            raster.appendChild(h('div', { cls: 'sys-zelle leer' }));
            for (var j = 0; j < n; j++) {
                var rest = [];
                for (var k = n - 1; k >= 0; k--) if (k > t - j) rest.push(B[k][j]);
                for (var p = 0; p < Math.max(0, j - t - 1); p++) rest.push('·');   // Versatz: Spalte j startet j Takte später
                raster.appendChild(h('div', { cls: 'sys-zelle ein', html: 'B, Spalte ' + (j + 1) + '<br>' + (rest.length ? rest.join('<br>') : '–') + '<br>↓' }));
            }
            var aktiv = 0, C = [];
            for (var i = 0; i < n; i++) {
                var restA = [];
                for (k = n - 1; k >= 0; k--) if (k > t - i) restA.push(A[i][k]);
                for (var p2 = 0; p2 < Math.max(0, i - t - 1); p2++) restA.push('·');
                raster.appendChild(h('div', { cls: 'sys-zelle ein', html: 'A, Zeile ' + (i + 1) + '<br>' + (restA.length ? restA.join(' ') : '–') + ' →' }));
                C.push([]);
                for (j = 0; j < n; j++) {
                    var kk = t - i - j, acc = 0;
                    for (var m = 0; m <= Math.min(kk, n - 1); m++) acc += A[i][m] * B[m][j];
                    C[i].push(acc);
                    var an = kk >= 0 && kk < n;
                    if (an) aktiv++;
                    raster.appendChild(h('div', { cls: 'sys-zelle pe' + (an ? ' aktiv' : ''), html: (an ? '<span class="ab">' + A[i][kk] + ' · ' + B[kk][j] + '</span>' : '<span class="ab">wartet</span>') + '<br><span class="acc">' + acc + '</span>' }));
                }
            }
            var ende = 3 * n - 2;
            if (t < 0) info.textContent = 'Noch nichts passiert. Jede Rechenzelle (orange) multipliziert, was von links (A) und von oben (B) ankommt, addiert es zu ihrer Summe und reicht beide Zahlen an den rechten bzw. unteren Nachbarn weiter. Die Punkte · sind Takte Verzögerung: Zeile 2 und Spalte 2 starten einen Takt später, Zeile 3 und Spalte 3 zwei Takte.';
            else if (t < ende) info.textContent = 'Takt ' + (t + 1) + ' von ' + ende + ': ' + aktiv + ' Zellen rechnen gleichzeitig (' + aktiv + ' Multiplikationen und Additionen). Die Zahlen laufen wie eine Welle schräg durch das Feld.';
            else info.textContent = '✓ Fertig nach ' + ende + ' Takten. In den Zellen steht C = A · B = [' + C.map(function (r) { return r.join(' '); }).join(' | ') + ']. Ein einzelnes Rechenwerk bräuchte 27 Multiplikationen nacheinander und müsste jede Zahl mehrfach aus dem Speicher holen. Hier wird jede Zahl nur einmal geladen.';
            bVor.disabled = t >= ende; bZur.disabled = t < 0;
        }
        malen();
    }

    // ================= Schrittfolge =================
    function stepper(box) {
        var schritte = Array.prototype.slice.call(box.querySelectorAll(':scope > .step'));
        if (!schritte.length) return;
        box.classList.add('stepper');
        var kette = h('div', { cls: 'stepper-kette', role: 'tablist' }), akt = 0;
        var knoepfe = schritte.map(function (sch, i) {
            var art = sch.getAttribute('data-art') || '';
            var b = h('button', { type: 'button', role: 'tab', cls: art === 'quanten' ? 'q' : '', text: (i + 1) + ' ' + (sch.getAttribute('data-titel') || '') });
            b.addEventListener('click', function () { zeige(i); });
            kette.appendChild(b);
            var icon = sch.getAttribute('data-icon');
            var inhalt = Array.prototype.slice.call(sch.childNodes);
            sch.textContent = '';
            var titel = h('h5', { text: sch.getAttribute('data-titel') || '' });
            if (art) titel.appendChild(h('span', { cls: 'art ' + art, text: art === 'quanten' ? 'Quantenteil' : 'klassische Technik' }));
            var rechts = h('div', {}, [titel]);
            inhalt.forEach(function (n) { rechts.appendChild(n); });
            sch.appendChild(h('div', { cls: 'gross', text: icon || '•' }));
            sch.appendChild(rechts);
            return b;
        });
        box.insertBefore(kette, box.firstChild);
        var zur = h('button', { type: 'button', cls: 'knopf', text: '◀ zurück' });
        var vor = h('button', { type: 'button', cls: 'knopf voll', text: 'weiter ▶' });
        zur.addEventListener('click', function () { zeige(akt - 1); });
        vor.addEventListener('click', function () { zeige(akt + 1); });
        box.appendChild(h('div', { cls: 'knopfzeile', style: 'margin-top:.6rem' }, [zur, vor]));
        function zeige(i) {
            akt = Math.max(0, Math.min(schritte.length - 1, i));
            schritte.forEach(function (sch, k) { sch.hidden = k !== akt; });
            knoepfe.forEach(function (b, k) { b.classList.toggle('akt', k === akt); if (k <= akt) b.classList.add('gesehen'); b.setAttribute('aria-selected', k === akt ? 'true' : 'false'); });
            zur.disabled = akt === 0; vor.disabled = akt === schritte.length - 1;
        }
        zeige(0);
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-schalter]').forEach(schalter);
        document.querySelectorAll('[data-dotierung]').forEach(dotierung);
        document.querySelectorAll('[data-mosfet]').forEach(mosfet);
        document.querySelectorAll('[data-cmos]').forEach(cmos);
        document.querySelectorAll('[data-zk]').forEach(zk);
        document.querySelectorAll('[data-alu]').forEach(alu);
        document.querySelectorAll('[data-latch]').forEach(latch);
        document.querySelectorAll('[data-parallel]').forEach(parallel);
        document.querySelectorAll('[data-systolisch]').forEach(systolisch);
        document.querySelectorAll('[data-stepper]').forEach(stepper);
    });
})();
