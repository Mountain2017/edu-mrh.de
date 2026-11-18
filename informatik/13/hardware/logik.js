/*
 * Exkurs Hardware (Informatik 13) – Logikgatter, Schaltungs-Werkstatt, Übertragswelle
 *
 *   <span class="sym" data-symbol="AND"></span>    Gattersymbol in der gewählten Norm (AND, OR, XOR, NOT,
 *                                                  NAND, NOR, XNOR, HA, VA, MUX)
 *   <div class="norm-wahl"></div>                  Umschalter DIN/IEC ↔ US (ANSI), gemerkt in localStorage 'hwNorm'
 *   <div class="ws" data-werkstatt="ha"></div>     Schaltungs-Werkstatt; Wert = Aufgabe aus AUFGABEN (unten)
 *        data-werkstatt="frei" data-ein="A,B,C" data-aus="Y"   freie Werkstatt mit eigenen Ein-/Ausgängen
 *        data-id="…"                               Speicherplatz (Standard: Aufgabenname)
 *   <div data-ripple="8"></div>                    Übertragswelle im n-Bit-Ripple-Carry-Addierer
 *
 * Bedienung der Werkstatt: Bauteil aus der Leiste holen, ziehen; Ausgang (rechts am Gatter) mit
 * Eingang (links) verbinden: vom einen Anschluss zum anderen ziehen oder beide nacheinander antippen.
 * Draht oder Bauteil antippen → „Auswahl löschen“ (oder Entf-Taste). Offene Eingänge zählen als 0.
 * Der Stand wird je Werkstatt im localStorage gespeichert. Keine Abhängigkeiten.
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
    function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function schreib(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privat */ } }

    // ---------- Norm (DIN/IEC oder US) ----------
    var norm = lies('hwNorm') === 'ansi' ? 'ansi' : 'iec';
    var normHoerer = [];
    function setzeNorm(n) { norm = n; schreib('hwNorm', n); normHoerer.forEach(function (f) { f(); }); }

    // ---------- Bauteile ----------
    var TYPEN = {
        AND:  { ein: 2, aus: 1, iec: '&',  f: function (a) { return [a[0] & a[1]]; } },
        OR:   { ein: 2, aus: 1, iec: '≥1', f: function (a) { return [a[0] | a[1]]; } },
        XOR:  { ein: 2, aus: 1, iec: '=1', f: function (a) { return [a[0] ^ a[1]]; } },
        NOT:  { ein: 1, aus: 1, iec: '1', neg: true, f: function (a) { return [1 - a[0]]; } },
        NAND: { ein: 2, aus: 1, iec: '&',  neg: true, f: function (a) { return [1 - (a[0] & a[1])]; } },
        NOR:  { ein: 2, aus: 1, iec: '≥1', neg: true, f: function (a) { return [1 - (a[0] | a[1])]; } },
        XNOR: { ein: 2, aus: 1, iec: '=1', neg: true, f: function (a) { return [1 - (a[0] ^ a[1])]; } },
        HA:   { block: 'HA', ein: ['A', 'B'], aus: ['S', 'C'], f: function (a) { return [a[0] ^ a[1], a[0] & a[1]]; } },
        VA:   { block: 'VA', ein: ['A', 'B', 'Cin'], aus: ['S', 'Cout'], f: function (a) { var x = a[0] + a[1] + a[2]; return [x & 1, x >> 1]; } },
        MUX:  { block: 'MUX', ein: ['0', '1', 'S'], aus: ['Y'], f: function (a) { return [a[2] ? a[1] : a[0]]; } },
        NULL: { konst: 0, ein: 0, aus: 1, f: function () { return [0]; } },
        EINS: { konst: 1, ein: 0, aus: 1, f: function () { return [1]; } }
    };
    var ANZEIGE = { NULL: '0', EINS: '1' };
    function anzahl(x) { return typeof x === 'number' ? x : x.length; }

    function geo(t) {
        var T = TYPEN[t];
        if (T.konst !== undefined) return { w: 46, h: 30, ein: [], aus: [15] };
        if (T.block) {
            var n = Math.max(T.ein.length, T.aus.length), hh = 24 * n + 14;
            return { w: 84, h: hh, ein: T.ein.map(function (_, i) { return 19 + i * 24 + (n - T.ein.length) * 12; }),
                aus: T.aus.map(function (_, j) { return Math.round(hh * (j + 1) / (T.aus.length + 1)); }) };
        }
        return { w: 70, h: 50, ein: T.ein === 1 ? [25] : [15, 35], aus: [25] };
    }

    // zeichnet ein Bauteil in lokale Koordinaten (0,0 = links oben) in die Gruppe g
    function zeichneTeil(g, t, n) {
        var T = TYPEN[t], G = geo(t);
        G.ein.forEach(function (y) { s('line', { x1: 0, y1: y, x2: n === 'ansi' && !T.block ? 15 : 12, y2: y, 'class': 'stummel' }, g); });
        if (T.konst !== undefined) {
            s('rect', { x: 2, y: 2, width: 30, height: 26, rx: 6, 'class': 'koerper' }, g);
            s('text', { x: 17, y: 20, 'text-anchor': 'middle', 'class': 'label' }, g).textContent = ANZEIGE[t];
            s('line', { x1: 32, y1: 15, x2: 46, y2: 15, 'class': 'stummel' }, g);
            return;
        }
        if (T.block) {
            s('rect', { x: 12, y: 2, width: G.w - 24, height: G.h - 4, rx: 4, 'class': 'koerper' }, g);
            s('text', { x: G.w / 2, y: G.h / 2 + 5, 'text-anchor': 'middle', 'class': 'label' }, g).textContent = T.block;
            T.ein.forEach(function (name, i) { s('text', { x: 15, y: G.ein[i] + 3.5, 'class': 'label klein' }, g).textContent = name; });
            T.aus.forEach(function (name, j) {
                s('text', { x: G.w - 15, y: G.aus[j] + 3.5, 'text-anchor': 'end', 'class': 'label klein' }, g).textContent = name;
                s('line', { x1: G.w - 12, y1: G.aus[j], x2: G.w, y2: G.aus[j], 'class': 'stummel' }, g);
            });
            return;
        }
        var neg = !!T.neg, rechts;
        if (n === 'iec') {
            s('rect', { x: 12, y: 2, width: 44, height: 46, 'class': 'koerper' }, g);
            s('text', { x: 34, y: 30, 'text-anchor': 'middle', 'class': 'label' }, g).textContent = T.iec;
            rechts = 56;
        } else {
            var basis = t.replace(/^N(?=AND|OR)/, '').replace(/^XNOR$/, 'XOR');
            if (t === 'NOT') { s('path', { d: 'M14,6 L52,25 L14,44 Z', 'class': 'koerper' }, g); rechts = 52; }
            else if (basis === 'AND') { s('path', { d: 'M12,3 H36 A22,22 0 0 1 36,47 H12 Z', 'class': 'koerper' }, g); rechts = 58; }
            else if (basis === 'OR') { s('path', { d: 'M10,3 Q22,25 10,47 Q40,47 58,25 Q40,3 10,3 Z', 'class': 'koerper' }, g); rechts = 58; }
            else {
                s('path', { d: 'M15,3 Q27,25 15,47 Q42,47 58,25 Q42,3 15,3 Z', 'class': 'koerper' }, g);
                s('path', { d: 'M8,3 Q20,25 8,47', fill: 'none', 'class': 'stummel' }, g);
                rechts = 58;
            }
        }
        if (neg) { s('circle', { cx: rechts + 4, cy: 25, r: 4, 'class': 'koerper' }, g); rechts += 8; }
        if (rechts < 70) s('line', { x1: rechts, y1: 25, x2: 70, y2: 25, 'class': 'stummel' }, g);
    }

    // ---------- Symbole im Text ----------
    function symbol(span) {
        var t = span.getAttribute('data-symbol');
        if (!TYPEN[t]) return;
        function malen() {
            var G = geo(t);
            span.textContent = '';
            var svg = s('svg', { viewBox: '-2 -2 ' + (G.w + 4) + ' ' + (G.h + 4), role: 'img', 'aria-label': t + '-Gatter (' + (norm === 'iec' ? 'DIN/IEC' : 'US') + ')', 'class': 'ws-svg-sym' });
            svg.style.width = (G.w + 4) + 'px';
            svg.style.height = (G.h + 4) + 'px';
            var g = s('g', {}, svg);
            g.setAttribute('style', 'fill:#fff;stroke:#1e293b;stroke-width:2.2');
            zeichneTeil(g, t, norm);
            g.querySelectorAll('text').forEach(function (x) { x.setAttribute('style', 'stroke:none;fill:#0f172a;font:700 15px system-ui,sans-serif'); });
            g.querySelectorAll('.klein').forEach(function (x) { x.setAttribute('style', 'stroke:none;fill:#334155;font:600 10px system-ui,sans-serif'); });
            span.appendChild(svg);
        }
        malen();
        normHoerer.push(malen);
    }
    function normWahl(box) {
        var b1 = h('button', { type: 'button', cls: 'knopf', text: 'DIN/IEC (Europa)' });
        var b2 = h('button', { type: 'button', cls: 'knopf', text: 'US (ANSI)' });
        function zeige() { b1.classList.toggle('aktiv', norm === 'iec'); b2.classList.toggle('aktiv', norm === 'ansi'); }
        b1.addEventListener('click', function () { setzeNorm('iec'); });
        b2.addEventListener('click', function () { setzeNorm('ansi'); });
        box.appendChild(h('span', { cls: 'klein', text: 'Schaltzeichen:' }));
        box.appendChild(b1); box.appendChild(b2);
        zeige();
        normHoerer.push(zeige);
    }

    // ---------- Aufgaben der Werkstatt ----------
    function summe(namen, e) { return namen.reduce(function (z, n, i) { return z + (e[n] << (namen.length - 1 - i)); }, 0); }
    var A4 = ['A3', 'A2', 'A1', 'A0'], B4 = ['B3', 'B2', 'B1', 'B0'];
    var AUFGABEN = {
        erkunden: { titel: 'Gatter erkunden', auftrag: 'Hole ein Gatter, verbinde A und B mit seinen Eingängen und den Ausgang mit Y. Schalte A und B um und lege die Wahrheitstabelle an.',
            ein: ['A', 'B'], aus: ['Y'], teile: ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR'] },
        ha: { titel: 'Halbaddierer', auftrag: 'Baue eine Schaltung, die zwei Bits addiert: S ist die Summenstelle, C der Übertrag (1 + 1 = 10₂, also S = 0, C = 1).',
            ein: ['A', 'B'], aus: ['S', 'C'], teile: ['AND', 'OR', 'XOR', 'NOT'], min: 2,
            f: function (e) { return [e.A ^ e.B, e.A & e.B]; } },
        va: { titel: 'Volladdierer', auftrag: 'Addiere drei Bits: A, B und den Übertrag Cin aus der Stelle rechts davon. Tipp: Zwei Halbaddierer und ein weiteres Gatter genügen.',
            ein: ['A', 'B', 'Cin'], aus: ['S', 'Cout'], teile: ['HA', 'AND', 'OR', 'XOR', 'NOT'], min: 3,
            f: function (e) { var x = e.A + e.B + e.Cin; return [x & 1, x >> 1]; } },
        add4: { titel: '4-Bit-Addierer', auftrag: 'Verbinde vier Volladdierer zu einem Addierer für zwei 4-Bit-Zahlen A = A3A2A1A0 und B = B3B2B1B0. C4 ist der Übertrag aus der höchsten Stelle.',
            ein: ['A0', 'B0', 'A1', 'B1', 'A2', 'B2', 'A3', 'B3'], aus: ['S0', 'S1', 'S2', 'S3', 'C4'], teile: ['VA', 'HA', 'NULL'], min: 4,
            f: function (e) { var x = summe(A4, e) + summe(B4, e); return [x & 1, (x >> 1) & 1, (x >> 2) & 1, (x >> 3) & 1, (x >> 4) & 1]; },
            zahlen: function (e) { var a = summe(A4, e), b = summe(B4, e), x = summe(['C4', 'S3', 'S2', 'S1', 'S0'], e);
                return 'A = ' + bin(a, 4) + '₂ = ' + a + '   B = ' + bin(b, 4) + '₂ = ' + b + '   Ergebnis C4 S3 S2 S1 S0 = ' + bin(x, 5) + '₂ = ' + x; } },
        mux: { titel: 'Multiplexer (Weiche)', auftrag: 'Y soll den Wert von A durchlassen, wenn S = 0 ist, und den Wert von B, wenn S = 1 ist.',
            ein: ['A', 'B', 'S'], aus: ['Y'], teile: ['AND', 'OR', 'NOT'], min: 4,
            f: function (e) { return [e.S ? e.B : e.A]; } },
        gleich: { titel: 'Vergleicher', auftrag: 'G soll genau dann 1 sein, wenn die 2-Bit-Zahlen A1A0 und B1B0 gleich sind.',
            ein: ['A1', 'A0', 'B1', 'B0'], aus: ['G'], teile: ['AND', 'OR', 'NOT', 'XOR', 'NOR', 'XNOR'], min: 3,
            f: function (e) { return [e.A1 === e.B1 && e.A0 === e.B0 ? 1 : 0]; } },
        mehrheit: { titel: 'Mehrheitsentscheider', auftrag: 'Drei Personen stimmen ab (1 = ja). M soll 1 sein, wenn mindestens zwei mit Ja stimmen.',
            ein: ['A', 'B', 'C'], aus: ['M'], teile: ['AND', 'OR', 'NOT'], min: 4,
            f: function (e) { return [e.A + e.B + e.C >= 2 ? 1 : 0]; } },
        'nand-not': { titel: 'Nur NAND: NICHT', auftrag: 'Baue ein NICHT-Gatter nur aus NAND-Gattern.', ein: ['A'], aus: ['Y'], teile: ['NAND'], min: 1,
            f: function (e) { return [1 - e.A]; } },
        'nand-and': { titel: 'Nur NAND: UND', auftrag: 'Baue ein UND-Gatter nur aus NAND-Gattern.', ein: ['A', 'B'], aus: ['Y'], teile: ['NAND'], min: 2,
            f: function (e) { return [e.A & e.B]; } },
        'nand-or': { titel: 'Nur NAND: ODER', auftrag: 'Baue ein ODER-Gatter nur aus NAND-Gattern. Tipp: A ∨ B = ¬(¬A ∧ ¬B).', ein: ['A', 'B'], aus: ['Y'], teile: ['NAND'], min: 3,
            f: function (e) { return [e.A | e.B]; } },
        'nand-xor': { titel: 'Nur NAND: XOR', auftrag: 'Für Profis: Baue ein XOR-Gatter nur aus NAND-Gattern. Es geht mit vier.', ein: ['A', 'B'], aus: ['Y'], teile: ['NAND'], min: 4,
            f: function (e) { return [e.A ^ e.B]; } },
        addsub2: { titel: 'Addier-Subtrahier-Werk (2 Bit)', auftrag: 'Ist SUB = 0, soll E1E0 = A + B sein, ist SUB = 1, dann A − B (jeweils nur die letzten 2 Bit). Nutze den Trick aus der Station: B mit XOR umdrehen, Übertrag-Eingang auf 1.',
            ein: ['SUB', 'A1', 'A0', 'B1', 'B0'], aus: ['E1', 'E0'], teile: ['VA', 'XOR', 'NOT', 'NULL', 'EINS'], min: 4,
            f: function (e) { var a = summe(['A1', 'A0'], e), b = summe(['B1', 'B0'], e), x = (e.SUB ? a - b : a + b) & 3; return [x >> 1, x & 1]; },
            zahlen: function (e) { var a = summe(['A1', 'A0'], e), b = summe(['B1', 'B0'], e), x = summe(['E1', 'E0'], e);
                return 'A = ' + a + '   B = ' + b + '   ' + (e.SUB ? 'A − B' : 'A + B') + ' → E = ' + bin(x, 2) + '₂ = ' + x + ' (als 2-Bit-Zweierkomplement: ' + (x >= 2 ? x - 4 : x) + ')'; } }
    };
    function bin(x, n) { var t = x.toString(2); while (t.length < n) t = '0' + t; return t; }

    // ---------- Werkstatt ----------
    var VB = 900;
    function werkstatt(box) {
        var art = box.getAttribute('data-werkstatt') || 'frei';
        var A = AUFGABEN[art] || {
            titel: 'Freie Werkstatt', auftrag: '',
            ein: (box.getAttribute('data-ein') || 'A,B,C').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
            aus: (box.getAttribute('data-aus') || 'Y').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
            teile: ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR', 'HA', 'VA', 'MUX', 'NULL', 'EINS']
        };
        if (box.hasAttribute('data-titel')) A.titel = box.getAttribute('data-titel');
        var schluessel = 'hwWs-' + (box.getAttribute('data-id') || art);
        var VH = Math.max(380, 56 * Math.max(A.ein.length, A.aus.length) + 50);
        var st = { teile: [], draehte: [], ein: A.ein.map(function () { return 0; }) };
        var naechsteId = 1, auswahl = null, wartet = null, zug = null;

        try {
            var alt = JSON.parse(lies(schluessel) || 'null');
            if (alt && alt.teile) {
                st.teile = alt.teile.filter(function (t) { return TYPEN[t.t] && A.teile.indexOf(t.t) >= 0; });
                var ids = {};
                st.teile.forEach(function (t) { ids[t.id] = 1; var n = +String(t.id).replace(/\D/g, ''); if (n >= naechsteId) naechsteId = n + 1; });
                st.draehte = (alt.draehte || []).filter(function (d) { return (ids[d.a.g] || /^in\d+$/.test(d.a.g)) && (ids[d.b.g] || /^out\d+$/.test(d.b.g)); });
                if (alt.ein && alt.ein.length === A.ein.length) st.ein = alt.ein.map(function (v) { return v ? 1 : 0; });
            }
        } catch (e) { /* neu beginnen */ }
        function speichern() { schreib(schluessel, JSON.stringify(st)); }

        // Gerüst
        box.textContent = '';
        var normBox = h('div', { cls: 'norm-wahl' });
        box.appendChild(h('div', { cls: 'ws-kopf' }, [h('h4', { text: '🔧 ' + A.titel }), normBox]));
        if (A.auftrag) box.appendChild(h('p', { cls: 'ws-auftrag', text: A.auftrag }));
        var palette = h('div', { cls: 'ws-palette' }, [h('span', { cls: 'klein', text: 'Bauteil holen:' })]);
        A.teile.forEach(function (t) {
            var b = h('button', { type: 'button', cls: 'teil', text: ANZEIGE[t] ? 'Konstante ' + ANZEIGE[t] : t });
            b.addEventListener('click', function () { neuesTeil(t); });
            palette.appendChild(b);
        });
        box.appendChild(palette);
        var svg = s('svg', { viewBox: '0 0 ' + VB + ' ' + VH, 'class': 'ws-svg', tabindex: '0', role: 'application',
            'aria-label': 'Arbeitsfläche: ' + A.titel + '. Bauteile ziehen, Anschlüsse verbinden.' });
        box.appendChild(h('div', { cls: 'ws-flaeche' }, [svg]));
        var schalterZeile = h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: 'Eingänge:' })]);
        var einKnoepfe = A.ein.map(function (name, k) {
            var b = h('button', { type: 'button', cls: 'bit', 'aria-pressed': 'false' });
            b.addEventListener('click', function () { st.ein[k] ^= 1; speichern(); malen(); });
            schalterZeile.appendChild(h('span', {}, [name + ' ', b]));
            return b;
        });
        box.appendChild(schalterZeile);
        var zahlen = h('div', { cls: 'ws-zahlen', 'aria-live': 'polite' });
        box.appendChild(zahlen);
        var bLoesch = h('button', { type: 'button', cls: 'knopf', text: 'Auswahl löschen' });
        var bLeer = h('button', { type: 'button', cls: 'knopf', text: 'Alles leeren' });
        var bTab = h('button', { type: 'button', cls: 'knopf', text: 'Wahrheitstabelle' });
        var bPruef = A.f ? h('button', { type: 'button', cls: 'knopf voll', text: 'Prüfen' }) : null;
        var info = h('span', { cls: 'ws-info' });
        box.appendChild(h('div', { cls: 'ws-leiste' }, [bPruef, bTab, bLoesch, bLeer, info]));
        var ergebnis = h('div', { cls: 'ws-ergebnis', 'aria-live': 'polite' });
        box.appendChild(ergebnis);
        normWahl(normBox);
        normHoerer.push(function () { malen(); });

        // Geometrie der Anschlüsse
        function pinY(k, n) { return Math.round(VH * (k + 1) / (n + 1)); }
        function ports() {
            var p = [];
            A.ein.forEach(function (_, k) { p.push({ g: 'in' + k, k: 'aus', i: 0, x: 84, y: pinY(k, A.ein.length) }); });
            A.aus.forEach(function (_, k) { p.push({ g: 'out' + k, k: 'ein', i: 0, x: VB - 84, y: pinY(k, A.aus.length) }); });
            st.teile.forEach(function (t) {
                var G = geo(t.t);
                G.ein.forEach(function (y, i) { p.push({ g: t.id, k: 'ein', i: i, x: t.x, y: t.y + y }); });
                G.aus.forEach(function (y, i) { p.push({ g: t.id, k: 'aus', i: i, x: t.x + G.w, y: t.y + y }); });
            });
            return p;
        }
        function portPos(g, k, i) {
            var p = ports().filter(function (q) { return q.g === g && q.k === k && q.i === i; })[0];
            return p || { x: 0, y: 0 };
        }
        function teil(id) { return st.teile.filter(function (t) { return t.id === id; })[0]; }

        function neuesTeil(t) {
            var G = geo(t), n = st.teile.length;
            var x = 150 + (n % 5) * 125, y = 24 + (Math.floor(n / 5) % 4) * 95 + (n % 2) * 18;
            st.teile.push({ id: 'g' + (naechsteId++), t: t, x: Math.min(x, VB - 170 - G.w), y: Math.min(y, VH - G.h - 4) });
            auswahl = { art: 'teil', id: st.teile[st.teile.length - 1].id };
            speichern(); malen(); ergebnis.textContent = '';
        }

        // Simulation: Gauß-Seidel-Durchläufe bis zur Ruhe
        function zuleitungen() {
            var z = {};
            st.draehte.forEach(function (d) { z[d.b.g + ':' + d.b.i] = d.a; });
            return z;
        }
        function auswerten(ein) {
            var z = zuleitungen(), werte = {};
            st.teile.forEach(function (t) { werte[t.id] = []; for (var j = 0; j < anzahl(TYPEN[t.t].aus); j++) werte[t.id].push(0); });
            function wert(q) {
                if (!q) return 0;
                if (/^in\d+$/.test(q.g)) return ein[+q.g.slice(2)] || 0;
                return werte[q.g] ? werte[q.g][q.i] : 0;
            }
            var stabil = false;
            for (var r = 0; r < st.teile.length + 3; r++) {
                var neu = false;
                st.teile.forEach(function (t) {
                    var T = TYPEN[t.t], e = [];
                    for (var i = 0; i < anzahl(T.ein); i++) e.push(wert(z[t.id + ':' + i]));
                    var a = T.f(e);
                    a.forEach(function (v, j) { if (werte[t.id][j] !== v) { werte[t.id][j] = v; neu = true; } });
                });
                if (!neu) { stabil = true; break; }
            }
            return { aus: A.aus.map(function (_, k) { return wert(z['out' + k + ':0']); }), wert: wert, z: z, stabil: stabil };
        }
        function offeneEingaenge() {
            var z = zuleitungen(), n = 0;
            st.teile.forEach(function (t) { for (var i = 0; i < anzahl(TYPEN[t.t].ein); i++) if (!z[t.id + ':' + i]) n++; });
            return n;
        }

        // Zeichnen
        function pfad(x1, y1, x2, y2) {
            var dx = Math.max(30, Math.abs(x2 - x1) / 2);
            return 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
        }
        function malen() {
            var R = auswerten(st.ein);
            svg.textContent = '';
            var lDraht = s('g', {}, svg), lTeile = s('g', {}, svg), lPins = s('g', {}, svg);
            // Eingänge
            A.ein.forEach(function (name, k) {
                var y = pinY(k, A.ein.length), v = st.ein[k];
                var g = s('g', { 'class': 'pin ein' + (v ? ' eins' : ''), 'data-pin': k }, lPins);
                s('text', { x: 6, y: y + 5, 'class': 'name' }, g).textContent = name;
                s('rect', { x: 38, y: y - 15, width: 36, height: 30, rx: 7 }, g);
                s('text', { x: 56, y: y + 5, 'text-anchor': 'middle', 'class': 'wert' }, g).textContent = v;
                s('line', { x1: 74, y1: y, x2: 84, y2: y, 'class': 'stummel' }, g);
                s('circle', { cx: 84, cy: y, r: 5, 'class': 'port' + (v ? ' eins' : '') + (portGleich(wartet, 'in' + k, 'aus', 0) ? ' wartet' : '') }, g);
            });
            // Ausgänge
            A.aus.forEach(function (name, k) {
                var y = pinY(k, A.aus.length), v = R.aus[k];
                var g = s('g', { 'class': 'pin aus' + (v ? ' eins' : '') }, lPins);
                s('circle', { cx: VB - 84, cy: y, r: 5, 'class': 'port' + (v ? ' eins' : '') + (portGleich(wartet, 'out' + k, 'ein', 0) ? ' wartet' : '') }, g);
                s('line', { x1: VB - 84, y1: y, x2: VB - 70, y2: y, 'class': 'stummel' }, g);
                s('circle', { cx: VB - 54, cy: y, r: 15, 'class': 'lampe-svg' }, g);
                s('text', { x: VB - 54, y: y + 5, 'text-anchor': 'middle', 'class': 'wert' }, g).textContent = v;
                s('text', { x: VB - 34, y: y + 5, 'class': 'name' }, g).textContent = name;
            });
            // Bauteile
            st.teile.forEach(function (t) {
                var G = geo(t.t), T = TYPEN[t.t];
                var g = s('g', { 'class': 'gatter' + (T.block ? ' block' : '') + (auswahl && auswahl.art === 'teil' && auswahl.id === t.id ? ' gewaehlt' : '') + (zug && zug.id === t.id ? ' ziehen' : ''),
                    transform: 'translate(' + t.x + ',' + t.y + ')' }, lTeile);
                s('rect', { x: 0, y: 0, width: G.w, height: G.h, fill: 'transparent' }, g);
                zeichneTeil(g, t.t, norm);
                G.ein.forEach(function (y, i) {
                    var q = R.z[t.id + ':' + i], v = R.wert(q);
                    s('circle', { cx: 0, cy: y, r: 4.5, 'class': 'port' + (v ? ' eins' : '') + (q ? '' : ' offen') + (portGleich(wartet, t.id, 'ein', i) ? ' wartet' : '') }, g);
                });
                G.aus.forEach(function (y, j) {
                    var v = R.wert({ g: t.id, i: j });
                    s('circle', { cx: G.w, cy: y, r: 4.5, 'class': 'port' + (v ? ' eins' : '') + (portGleich(wartet, t.id, 'aus', j) ? ' wartet' : '') }, g);
                });
            });
            // Drähte
            st.draehte.forEach(function (d, n) {
                var a = portPos(d.a.g, 'aus', d.a.i), b = portPos(d.b.g, 'ein', d.b.i), v = R.wert(d.a);
                var p = pfad(a.x, a.y, b.x, b.y);
                s('path', { d: p, 'class': 'draht' + (v ? ' eins' : '') + (auswahl && auswahl.art === 'draht' && auswahl.n === n ? ' gewaehlt' : '') }, lDraht);
                s('path', { d: p, 'class': 'draht-treffer', 'data-draht': n }, lDraht);
            });
            if (zug && zug.art === 'draht') s('path', { d: pfad(zug.von.x, zug.von.y, zug.pt.x, zug.pt.y), 'class': 'temp' }, svg);
            // Schalter unter der Fläche
            einKnoepfe.forEach(function (b, k) { b.textContent = st.ein[k]; b.classList.toggle('an', !!st.ein[k]); b.setAttribute('aria-pressed', st.ein[k] ? 'true' : 'false'); });
            var e = {};
            A.ein.forEach(function (n, k) { e[n] = st.ein[k]; });
            A.aus.forEach(function (n, k) { e[n] = R.aus[k]; });
            zahlen.textContent = A.zahlen ? A.zahlen(e) : '';
            var off = offeneEingaenge();
            info.textContent = st.teile.length + ' Bauteil' + (st.teile.length === 1 ? '' : 'e') + (off ? ' · ' + off + ' offene Eingänge (= 0)' : '') + (R.stabil ? '' : ' · ⚠ Rückkopplung schwingt');
            bLoesch.disabled = !auswahl;
        }
        function portGleich(p, g, k, i) { return p && p.g === g && p.k === k && p.i === i; }

        // Zeiger → SVG-Koordinaten
        function punkt(ev) {
            var m = svg.getScreenCTM();
            if (!m) return { x: 0, y: 0 };
            var p = svg.createSVGPoint();
            p.x = ev.clientX; p.y = ev.clientY;
            p = p.matrixTransform(m.inverse());
            return { x: p.x, y: p.y };
        }
        function portBei(pt) {
            var best = null, bd = 15;
            ports().forEach(function (p) { var d = Math.hypot(p.x - pt.x, p.y - pt.y); if (d < bd) { bd = d; best = p; } });
            return best;
        }
        function teilBei(pt) {
            for (var i = st.teile.length - 1; i >= 0; i--) {
                var t = st.teile[i], G = geo(t.t);
                if (pt.x >= t.x + 6 && pt.x <= t.x + G.w - 6 && pt.y >= t.y && pt.y <= t.y + G.h) return t;
            }
            return null;
        }
        function pinBei(pt) {
            for (var k = 0; k < A.ein.length; k++) {
                var y = pinY(k, A.ein.length);
                if (pt.x >= 30 && pt.x <= 78 && Math.abs(pt.y - y) <= 18) return k;
            }
            return -1;
        }
        function passt(p, q) { return p && q && p.k !== q.k && p.g !== q.g; }
        function verbinde(p, q) {
            var a = p.k === 'aus' ? p : q, b = p.k === 'aus' ? q : p;
            st.draehte = st.draehte.filter(function (d) { return !(d.b.g === b.g && d.b.i === b.i); });
            st.draehte.push({ a: { g: a.g, i: a.i }, b: { g: b.g, i: b.i } });
            speichern(); ergebnis.textContent = '';
        }

        svg.addEventListener('pointerdown', function (ev) {
            if (ev.button > 0) return;
            var pt = punkt(ev), port = portBei(pt);
            svg.focus({ preventScroll: true });
            if (port) {
                if (wartet && passt(wartet, port)) { verbinde(wartet, port); wartet = null; malen(); return; }
                zug = { art: 'draht', von: port, pt: pt, start: pt };
                svg.setPointerCapture(ev.pointerId);
                malen(); return;
            }
            var k = pinBei(pt);
            if (k >= 0) { st.ein[k] ^= 1; speichern(); malen(); return; }
            var t = teilBei(pt);
            if (t) {
                zug = { art: 'teil', id: t.id, dx: pt.x - t.x, dy: pt.y - t.y, start: pt, bewegt: false };
                st.teile.splice(st.teile.indexOf(t), 1); st.teile.push(t);   // nach vorn
                svg.setPointerCapture(ev.pointerId);
                malen(); return;
            }
            var dn = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-draht');
            if (dn !== null && dn !== undefined && dn !== '') { auswahl = { art: 'draht', n: +dn }; wartet = null; malen(); return; }
            auswahl = null; wartet = null; malen();
        });
        svg.addEventListener('pointermove', function (ev) {
            if (!zug) return;
            var pt = punkt(ev);
            if (zug.art === 'teil') {
                var t = teil(zug.id), G = geo(t.t);
                if (Math.hypot(pt.x - zug.start.x, pt.y - zug.start.y) > 3) zug.bewegt = true;
                t.x = Math.round(Math.max(96, Math.min(VB - 100 - G.w, pt.x - zug.dx)));
                t.y = Math.round(Math.max(2, Math.min(VH - G.h - 2, pt.y - zug.dy)));
            } else zug.pt = pt;
            malen();
        });
        function loslassen(ev) {
            if (!zug) return;
            var pt = punkt(ev), z = zug;
            zug = null;
            if (z.art === 'teil') {
                if (!z.bewegt) auswahl = { art: 'teil', id: z.id };
                speichern();
            } else {
                var ziel = portBei(pt);
                if (ziel && passt(z.von, ziel)) { verbinde(z.von, ziel); wartet = null; }
                else if (Math.hypot(pt.x - z.start.x, pt.y - z.start.y) < 8) wartet = portGleich(wartet, z.von.g, z.von.k, z.von.i) ? null : z.von;
                else wartet = null;
            }
            malen();
        }
        svg.addEventListener('pointerup', loslassen);
        svg.addEventListener('pointercancel', function () { zug = null; malen(); });
        svg.addEventListener('keydown', function (ev) {
            if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); loeschen(); }
            if (ev.key === 'Escape') { wartet = null; auswahl = null; malen(); }
        });
        function loeschen() {
            if (!auswahl) return;
            if (auswahl.art === 'teil') {
                var id = auswahl.id;
                st.teile = st.teile.filter(function (t) { return t.id !== id; });
                st.draehte = st.draehte.filter(function (d) { return d.a.g !== id && d.b.g !== id; });
            } else st.draehte.splice(auswahl.n, 1);
            auswahl = null; speichern(); malen(); ergebnis.textContent = '';
        }
        bLoesch.addEventListener('click', loeschen);
        bLeer.addEventListener('click', function () {
            if (st.teile.length && !window.confirm('Alle Bauteile und Drähte entfernen?')) return;
            st.teile = []; st.draehte = []; auswahl = null; wartet = null; speichern(); malen(); ergebnis.textContent = '';
        });

        // Wahrheitstabelle und Prüfung
        function alleFaelle(fn) {
            var n = A.ein.length;
            for (var m = 0; m < (1 << n); m++) {
                var ein = A.ein.map(function (_, k) { return (m >> (n - 1 - k)) & 1; });
                fn(ein, auswerten(ein));
            }
        }
        function tabelle(markiere) {
            var tab = h('table', { cls: 'wt' });
            var kopf = h('tr');
            A.ein.forEach(function (n) { kopf.appendChild(h('th', { text: n })); });
            A.aus.forEach(function (n, j) { kopf.appendChild(h('th', { cls: j ? '' : 'trenn', text: n })); });
            if (markiere) kopf.appendChild(h('th', { cls: 'trenn', text: 'soll' }));
            tab.appendChild(kopf);
            var fehler = 0, schwingt = false;
            alleFaelle(function (ein, R) {
                if (!R.stabil) schwingt = true;
                var tr = h('tr');
                if (ein.every(function (v, k) { return v === st.ein[k]; })) tr.className = 'akt';
                ein.forEach(function (v) { tr.appendChild(h('td', { cls: v ? 'eins' : '', text: v })); });
                R.aus.forEach(function (v, j) { tr.appendChild(h('td', { cls: (j ? '' : 'trenn ') + (v ? 'eins' : ''), text: v })); });
                if (markiere) {
                    var e = {};
                    A.ein.forEach(function (n, k) { e[n] = ein[k]; });
                    var soll = A.f(e), ok = soll.every(function (v, j) { return v === R.aus[j]; });
                    if (!ok) { fehler++; tr.className = 'falsch'; }
                    tr.appendChild(h('td', { cls: 'trenn', text: ok ? '✓' : soll.join(' ') }));
                }
                tab.appendChild(tr);
            });
            return { tab: tab, fehler: fehler, schwingt: schwingt };
        }
        bTab.addEventListener('click', function () {
            ergebnis.textContent = '';
            var T = tabelle(false);
            ergebnis.appendChild(h('div', { cls: 'ws-tab-scroll' }, [T.tab]));
        });
        if (bPruef) bPruef.addEventListener('click', function () {
            ergebnis.textContent = '';
            var T = tabelle(true), n = 1 << A.ein.length, r;
            if (T.schwingt) r = h('div', { cls: 'rueck nein', text: '⚠ Deine Schaltung hat eine Rückkopplung, die nicht zur Ruhe kommt. In einem Schaltnetz läuft jedes Signal nur von links nach rechts.' });
            else if (T.fehler) r = h('div', { cls: 'rueck nein', text: '✗ ' + T.fehler + ' von ' + n + ' Fällen stimmen noch nicht (rot markiert, rechts steht das Soll). ' + (offeneEingaenge() ? 'Prüfe auch die offenen Eingänge (rot gestrichelt).' : '') });
            else {
                var gross = st.teile.length;
                r = h('div', { cls: 'rueck ok', text: '✓ Alle ' + n + ' Fälle stimmen! Du hast ' + gross + ' Bauteil' + (gross === 1 ? '' : 'e') + ' gebraucht.' +
                    (A.min && gross > A.min ? ' Es geht auch mit ' + A.min + '. Findest du den Weg?' : A.min ? ' Kürzer geht es nicht.' : '') });
            }
            ergebnis.appendChild(r);
            ergebnis.appendChild(h('div', { cls: 'ws-tab-scroll' }, [T.tab]));
        });

        malen();
    }

    // ---------- Übertragswelle ----------
    function ripple(box) {
        var n = Math.max(2, Math.min(16, +box.getAttribute('data-ripple') || 8));
        var a = [], b = [], c = [], timer = null, takt = 0;
        for (var i = 0; i < n; i++) { a.push(0); b.push(0); }
        for (i = 0; i <= n; i++) c.push(0);
        function maj(x, y, z) { return (x & y) | (x & z) | (y & z); }
        function endCarry() { var r = [0]; for (var i = 0; i < n; i++) r.push(maj(a[i], b[i], r[i])); return r; }
        function zahl(v) { return v.reduce(function (z, x, i) { return z + (x << i); }, 0); }
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Die Übertragswelle im ' + n + '-Bit-Addierer' }));
        function bitZeile(name, arr) {
            var z = h('div', { cls: 'wert-zeile' }, [h('span', { cls: 'lbl', text: name })]);
            var bits = h('span', { cls: 'bits' }), zahlS = h('span', { cls: 'zahl' });
            var kn = [];
            for (var i = n - 1; i >= 0; i--) (function (i) {
                var k = h('button', { type: 'button', cls: 'bit', 'aria-label': name + ' Bit ' + i });
                k.addEventListener('click', function () { if (timer) return; arr[i] ^= 1; zeigen(); });
                kn[i] = k; bits.appendChild(k);
            })(i);
            z.appendChild(bits); z.appendChild(zahlS);
            box.appendChild(z);
            return function () { kn.forEach(function (k, i) { k.textContent = arr[i]; k.classList.toggle('an', !!arr[i]); }); zahlS.textContent = '= ' + zahl(arr); };
        }
        var zeigeA = bitZeile('A', a), zeigeB = bitZeile('B', b);
        var kette = h('div', { cls: 'ripple-kette', 'aria-live': 'off' });
        box.appendChild(kette);
        var stufen = [];
        for (i = 0; i < n; i++) {
            var st = h('div', { cls: 'ripple-stufe' }, [h('div', { cls: 'klein', text: 'VA ' + i }), h('div', { cls: 's' }), h('div', { cls: 'c' })]);
            stufen.push(st); kette.appendChild(st);
        }
        var status = h('div', { cls: 'rueck neutral', 'aria-live': 'polite' });
        var bStart = h('button', { type: 'button', cls: 'knopf voll', text: '▶ Neue Eingaben anlegen' });
        var bSchlimm = h('button', { type: 'button', cls: 'knopf', text: 'Schlimmster Fall laden' });
        var bLeicht = h('button', { type: 'button', cls: 'knopf', text: 'Harmloser Fall laden' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [bStart, bSchlimm, bLeicht]));
        box.appendChild(status);
        function zeigen() {
            zeigeA(); zeigeB();
            var fertig = endCarry(), summeJetzt = [], summeEnde = [];
            stufen.forEach(function (st, i) {
                var sj = a[i] ^ b[i] ^ c[i], se = a[i] ^ b[i] ^ fertig[i];
                summeJetzt.push(sj); summeEnde.push(se);
                st.children[1].textContent = sj;
                st.children[1].className = 's' + (sj !== se ? ' falsch' : '');
                st.children[2].textContent = 'Cin ' + c[i];
                st.children[2].className = 'c' + (c[i] ? ' eins' : '');
                st.classList.toggle('rechnet', !!timer && (c[i + 1] !== fertig[i + 1] || sj !== se));
            });
            return { jetzt: zahl(summeJetzt) + (c[n] << n), ende: zahl(summeEnde) + (fertig[n] << n), stabil: c.every(function (v, i) { return v === fertig[i]; }) };
        }
        function schritt() {
            var neu = c.slice();
            for (var i = 0; i < n; i++) neu[i + 1] = maj(a[i], b[i], c[i]);
            c = neu; takt++;
            var z = zeigen();
            status.textContent = 'Nach ' + takt + ' Stufenlaufzeit' + (takt === 1 ? '' : 'en') + ': am Ausgang steht ' + z.jetzt + (z.stabil ? ' ✓ stabil, richtig ist ' + z.ende + '.' : ' (falsch, die Übertragswelle läuft noch …)');
            if (z.stabil) { clearInterval(timer); timer = null; zeigen(); bStart.disabled = false;
                status.textContent += ' Gesamt: ' + takt + ' Stufen ≈ ' + (2 * takt) + ' Gatterlaufzeiten.'; }
        }
        bStart.addEventListener('click', function () {
            if (timer) return;
            takt = 0; bStart.disabled = true;
            var z = zeigen();
            if (z.stabil) { status.textContent = 'Die Überträge stimmen schon (nichts zu tun). Ändere A oder B und starte erneut.'; bStart.disabled = false; return; }
            status.textContent = 'Neue Eingaben liegen an. Die Überträge sind noch die alten …';
            timer = setInterval(schritt, 600);
            zeigen();
        });
        function laden(x, y) {
            if (timer) return;
            for (var i = 0; i < n; i++) { a[i] = (x >> i) & 1; b[i] = (y >> i) & 1; }
            zeigen(); status.textContent = 'Geladen: ' + x + ' + ' + y + '. Starte mit „Neue Eingaben anlegen“.';
        }
        bSchlimm.addEventListener('click', function () { c = c.map(function () { return 0; }); laden((1 << n) - 1, 1); });
        bLeicht.addEventListener('click', function () { c = c.map(function () { return 0; }); laden(0x55 & ((1 << n) - 1), 0x22 & ((1 << n) - 1)); });
        zeigen();
        status.textContent = 'Schalte Bits um und starte. Jede Stufe braucht etwa 2 Gatterlaufzeiten, bis ihr Übertrag feststeht.';
    }

    window.hwWerkstatt = werkstatt;   // für werkstatt.html (Ein-/Ausgänge wechseln)
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.sym[data-symbol]').forEach(symbol);
        document.querySelectorAll('.norm-wahl:empty').forEach(normWahl);
        document.querySelectorAll('[data-werkstatt]').forEach(werkstatt);
        document.querySelectorAll('[data-ripple]').forEach(ripple);
    });
})();
