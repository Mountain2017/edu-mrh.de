/*
 * KI Stationen 7 und 8 – neuronale Netze (braucht ki.js)
 *
 *   <div data-aktivierung></div>          Aktivierungsfunktionen im Vergleich (Stufe, Sigmoid, tanh, ReLU, linear), Regler für z
 *   <div data-vorwaerts></div>            Vorwärts-Rechner: 2-2-1-Netz mit Sigmoid (Gewichte wie auf Blatt 7), Eingaben 0/1, Schritte ① ②
 *   <div data-abstieg="1d|2d"></div>      Gradientenabstieg: Kugel auf der Kostenkurve (1d) bzw. auf Höhenlinien zweier Gewichte (2d)
 *   <div data-rueckwaerts></div>          Backpropagation Schritt für Schritt am 2-2-1-Netz, dann Training auf XOR
 *   <div data-spielplatz></div>           Netz-Spielplatz: Daten, Schichten, Neuronen, Aktivierung, Lernrate, Rauschen, Trainingsanteil
 *
 * Gemeinsame Rechnung: KI.Netz (vollständig verbundene Schichten, Ausgabe Sigmoid, Kosten = mittlerer quadratischer Fehler,
 * Gradientenabstieg über alle Trainingsdaten je Schritt). Schreibweise wie in Station 7 und im Python-Code:
 * z = w0 + Σ wi · xi, a = f(z); Kosten K = 1/n · Σ (y − Ziel)².
 */
(function () {
    'use strict';
    var h = KI.h, zahl = KI.zahl;
    function r3(v) { return Math.round(v * 1000) / 1000; }
    function z3(v) { return zahl(r3(v)).replace('-', '−'); }

    var AKT = {
        stufe: { name: 'Stufe', f: function (z) { return z >= 0 ? 1 : 0; }, d: function () { return 0; } },
        sigmoid: { name: 'Sigmoid', f: function (z) { return 1 / (1 + Math.exp(-z)); }, d: function (z) { var s = 1 / (1 + Math.exp(-z)); return s * (1 - s); } },
        tanh: { name: 'tanh', f: function (z) { return Math.tanh(z); }, d: function (z) { var t = Math.tanh(z); return 1 - t * t; } },
        relu: { name: 'ReLU', f: function (z) { return z > 0 ? z : 0; }, d: function (z) { return z > 0 ? 1 : 0; } },
        linear: { name: 'linear (keine)', f: function (z) { return z; }, d: function () { return 1; } }
    };
    KI.AKT = AKT;

    // ---------- Netz: vollständig verbundene Schichten ----------
    function Netz(groessen, akt, seed) {
        var rnd = KI.zufall(seed || 1);
        this.g = groessen; this.akt = akt || 'sigmoid';
        this.W = []; this.b = [];
        for (var l = 1; l < groessen.length; l++) {
            var s = Math.sqrt(2 / (groessen[l - 1] + groessen[l])) * 1.6, Wl = [], bl = [];
            for (var j = 0; j < groessen[l]; j++) {
                var zeile = [];
                for (var i = 0; i < groessen[l - 1]; i++) zeile.push((rnd() * 2 - 1) * s * 1.7);
                Wl.push(zeile); bl.push((rnd() * 2 - 1) * .3);
            }
            this.W.push(Wl); this.b.push(bl);
        }
    }
    Netz.prototype.f = function (l) { return l === this.W.length - 1 ? AKT.sigmoid : AKT[this.akt]; };
    Netz.prototype.vorwaerts = function (x) {
        var a = [x], zs = [];
        for (var l = 0; l < this.W.length; l++) {
            var z = [], n = [], f = this.f(l);
            for (var j = 0; j < this.W[l].length; j++) {
                var s = this.b[l][j];
                for (var i = 0; i < a[l].length; i++) s += this.W[l][j][i] * a[l][i];
                z.push(s); n.push(f.f(s));
            }
            zs.push(z); a.push(n);
        }
        return { a: a, z: zs };
    };
    Netz.prototype.aus = function (x) { var r = this.vorwaerts(x); return r.a[r.a.length - 1][0]; };
    Netz.prototype.kosten = function (daten) { var s = 0, self = this; daten.forEach(function (p) { var y = self.aus(p.x); s += (y - p.ziel) * (y - p.ziel); }); return s / daten.length; };
    Netz.prototype.genauigkeit = function (daten) { var ok = 0, self = this; daten.forEach(function (p) { if ((self.aus(p.x) >= .5 ? 1 : 0) === p.ziel) ok++; }); return ok / daten.length; };
    // Backpropagation: Gradienten der Kosten für ein Beispiel (delta = Schuld des Neurons)
    Netz.prototype.gradient = function (x, ziel) {
        var r = this.vorwaerts(x), L = this.W.length, delta = [], gW = [], gb = [];
        var y = r.a[L][0];
        delta[L - 1] = [2 * (y - ziel) * AKT.sigmoid.d(r.z[L - 1][0])];
        for (var l = L - 2; l >= 0; l--) {
            delta[l] = [];
            for (var j = 0; j < this.W[l].length; j++) {
                var s = 0;
                for (var k = 0; k < this.W[l + 1].length; k++) s += this.W[l + 1][k][j] * delta[l + 1][k];
                delta[l].push(s * this.f(l).d(r.z[l][j]));
            }
        }
        for (var l2 = 0; l2 < L; l2++) {
            gW.push(this.W[l2].map(function (zeile, j) { return zeile.map(function (w, i) { return delta[l2][j] * r.a[l2][i]; }); }));
            gb.push(delta[l2].slice());
        }
        return { gW: gW, gb: gb, delta: delta, r: r };
    };
    Netz.prototype.schritt = function (daten, eta) {
        var self = this, sW = this.W.map(function (Wl) { return Wl.map(function (z) { return z.map(function () { return 0; }); }); }), sb = this.b.map(function (bl) { return bl.map(function () { return 0; }); });
        daten.forEach(function (p) {
            var g = self.gradient(p.x, p.ziel);
            g.gW.forEach(function (Wl, l) { Wl.forEach(function (z, j) { z.forEach(function (v, i) { sW[l][j][i] += v; }); sb[l][j] += g.gb[l][j]; }); });
        });
        var n = daten.length;
        this.W.forEach(function (Wl, l) { Wl.forEach(function (z, j) { z.forEach(function (v, i) { z[i] -= eta * sW[l][j][i] / n; }); self.b[l][j] -= eta * sb[l][j] / n; }); });
    };
    KI.Netz = Netz;

    function regler(name, min, max, wert, schritt, fmt) {
        var id = 'r' + Math.random().toString(36).slice(2), inp = h('input', { type: 'range', id: id, min: min, max: max, step: schritt, value: wert }), out = h('output');
        fmt = fmt || function (v) { return zahl(+v); };
        out.textContent = fmt(wert);
        inp.addEventListener('input', function () { out.textContent = fmt(inp.value); });
        return { box: h('div', { cls: 'regler' }, [h('label', { for: id, html: name }), inp, out]), inp: inp, out: out };
    }

    // ---------- Aktivierungsfunktionen ----------
    function aktivierung(box) {
        var wahl = { stufe: true, sigmoid: true, tanh: false, relu: true, linear: false };
        var FAR = { stufe: '#334155', sigmoid: '#16a34a', tanh: '#9333ea', relu: '#d97706', linear: '#94a3b8' };
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Aktivierungsfunktionen im Vergleich' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var welt = new KI.Punktwelt(links, { x: [-5, 5], y: [-1.5, 3], xName: 'Nettoeingabe z', yName: 'Ausgabe f(z)', breite: 460, hoehe: 320, info: false });
        var zR = regler('z', -5, 5, 1, .1);
        rechts.appendChild(zR.box);
        var schalter = h('div', { cls: 'knopfzeile' });
        Object.keys(AKT).forEach(function (k) {
            var cb = h('input', { type: 'checkbox' }); cb.checked = wahl[k];
            cb.addEventListener('change', function () { wahl[k] = cb.checked; zeichne(); });
            schalter.appendChild(h('label', { style: 'display:inline-flex;gap:.3rem;align-items:center;font-size:.9rem;color:' + FAR[k] + ';font-weight:700' }, [cb, AKT[k].name]));
        });
        rechts.appendChild(schalter);
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        rechts.appendChild(anzeige);
        function zeichne() {
            welt.leeren();
            welt.linie(-5, 0, 5, 0, { farbe: '#94a3b8', breite: 1 }); welt.linie(0, -1.5, 0, 3, { farbe: '#94a3b8', breite: 1 });
            var z = +zR.inp.value, zeilen = [];
            Object.keys(AKT).forEach(function (k) {
                if (!wahl[k]) return;
                var A = AKT[k], alt = null;
                for (var x = -5; x <= 5.0001; x += .05) {
                    var y = A.f(x);
                    if (alt && !(k === 'stufe' && alt[1] !== y)) welt.linie(alt[0], alt[1], x, y, { farbe: FAR[k], breite: 2.6 });
                    alt = [x, y];
                }
                welt.punkt(z, A.f(z), { farbe: FAR[k], r: 5 });
                zeilen.push(A.name + ': f(' + zahl(z) + ') = ' + z3(A.f(z)) + ',  Steigung ' + z3(A.d(z)));
            });
            welt.linie(z, -1.5, z, 3, { farbe: '#cbd5e1', breite: 1, strich: [4, 3] });
            anzeige.textContent = zeilen.join('\n');
        }
        zR.inp.addEventListener('input', zeichne);
        zeichne();
    }

    // ---------- Vorwärts-Rechner (Gewichte wie auf Blatt 7) ----------
    var XOR_W = { h1: [-2, 4, 4], h2: [6, -4, -4], y: [-6, 4, 4] };
    function netzSVG(werte, opt) {
        // werte: {x1, x2, h1, h2, y, z1, z2, zy}; opt.schuld: {y, h1, h2} (Breite der Schuld-Pfeile)
        opt = opt || {};
        function k(t) { return t === undefined || t === null ? '?' : zahl(r3(t)).replace('-', '−'); }
        var s = '<svg class="netzbild" viewBox="0 0 640 260" role="img" aria-label="Netz mit Eingaben x1, x2, verdeckten Neuronen h1, h2 und Ausgabe y">';
        var kanten = [[90, 70, 300, 70, opt.w && opt.w.h1[1]], [90, 70, 300, 190, opt.w && opt.w.h2[1]], [90, 190, 300, 70, opt.w && opt.w.h1[2]], [90, 190, 300, 190, opt.w && opt.w.h2[2]], [340, 70, 530, 130, opt.w && opt.w.y[1]], [340, 190, 530, 130, opt.w && opt.w.y[2]]];
        kanten.forEach(function (e) { s += '<line x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '" stroke="#94a3b8" stroke-width="2"/>'; });
        if (opt.schuld) {
            var sc = opt.schuld, m = Math.max(Math.abs(sc.y || 0), Math.abs(sc.h1 || 0), Math.abs(sc.h2 || 0)) || 1;
            [[530, 130, 340, 70, sc.h1], [530, 130, 340, 190, sc.h2]].forEach(function (e) {
                if (e[4] === undefined) return;
                s += '<line x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '" stroke="#dc2626" stroke-opacity=".55" stroke-width="' + (2 + 12 * Math.abs(e[4]) / m).toFixed(1) + '" stroke-linecap="round"/>';
            });
        }
        var gw = opt.w || XOR_W;
        s += '<g font-size="13" font-weight="700" fill="#b45309">' +
            '<text x="180" y="60">' + k(gw.h1[1]) + '</text><text x="140" y="112">' + k(gw.h2[1]) + '</text><text x="140" y="158">' + k(gw.h1[2]) + '</text><text x="180" y="212">' + k(gw.h2[2]) + '</text>' +
            '<text x="430" y="88">' + k(gw.y[1]) + '</text><text x="430" y="182">' + k(gw.y[2]) + '</text></g>';
        function knoten(x, y, name, wert, fill, rand, unter) {
            return '<circle cx="' + x + '" cy="' + y + '" r="34" fill="' + fill + '" stroke="' + rand + '" stroke-width="2.5"/><text x="' + x + '" y="' + (y - 6) + '" text-anchor="middle" font-size="14">' + name + '</text>' +
                '<text x="' + x + '" y="' + (y + 14) + '" text-anchor="middle" font-size="15" font-weight="700">' + k(wert) + '</text>' + (unter ? '<text x="' + x + '" y="' + (y + 52) + '" text-anchor="middle" font-size="12" fill="#475569">' + unter + '</text>' : '');
        }
        s += knoten(60, 70, 'x₁', werte.x1, '#f1f5f9', '#334155') + knoten(60, 190, 'x₂', werte.x2, '#f1f5f9', '#334155');
        s += knoten(320, 70, 'h₁', werte.h1, '#dbeafe', '#1d4ed8', werte.z1 !== undefined ? 'z = ' + k(werte.z1) + ', w₀ = ' + k(gw.h1[0]) : 'w₀ = ' + k(gw.h1[0]));
        s += knoten(320, 190, 'h₂', werte.h2, '#dbeafe', '#1d4ed8', werte.z2 !== undefined ? 'z = ' + k(werte.z2) + ', w₀ = ' + k(gw.h2[0]) : 'w₀ = ' + k(gw.h2[0]));
        s += knoten(560, 130, 'y', werte.y, '#fee2e2', '#dc2626', werte.zy !== undefined ? 'z = ' + k(werte.zy) + ', w₀ = ' + k(gw.y[0]) : 'w₀ = ' + k(gw.y[0]));
        return s + '</svg>';
    }
    function sig(z) { return 1 / (1 + Math.exp(-z)); }
    function vorwaerts(box) {
        var x = [1, 0], stufe = 0;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Vorwärts-Rechner: Forward Propagation mit Sigmoid' }));
        var wahl = h('div', { cls: 'knopfzeile' });
        [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (e) {
            var b = h('button', { type: 'button', cls: 'knopf', text: 'x = (' + e[0] + ' | ' + e[1] + ')' });
            b.addEventListener('click', function () { x = e; stufe = 0; zeige(); wahl.querySelectorAll('button').forEach(function (q) { q.classList.toggle('aktiv', q === b); }); });
            wahl.appendChild(b);
        });
        box.appendChild(wahl);
        var bild = h('div'), rechnung = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var b1 = h('button', { type: 'button', cls: 'knopf voll', text: '① verdeckte Schicht' }), b2 = h('button', { type: 'button', cls: 'knopf voll', text: '② Ausgabeschicht' }), b0 = h('button', { type: 'button', cls: 'knopf', text: 'von vorn' });
        box.appendChild(bild); box.appendChild(h('div', { cls: 'knopfzeile' }, [b1, b2, b0])); box.appendChild(rechnung);
        function zeige() {
            var W = XOR_W, z1 = W.h1[0] + W.h1[1] * x[0] + W.h1[2] * x[1], z2 = W.h2[0] + W.h2[1] * x[0] + W.h2[2] * x[1];
            var h1 = sig(z1), h2 = sig(z2), zy = W.y[0] + W.y[1] * h1 + W.y[2] * h2, y = sig(zy);
            var v = { x1: x[0], x2: x[1] };
            var t = 'Eingabe x = (' + x[0] + ' | ' + x[1] + '). Klicke ① und ②.';
            if (stufe >= 1) {
                v.z1 = z1; v.h1 = h1; v.z2 = z2; v.h2 = h2;
                t = '① z₁ = ' + z3(W.h1[0]) + ' + ' + zahl(W.h1[1]) + ' · ' + x[0] + ' + ' + zahl(W.h1[2]) + ' · ' + x[1] + ' = ' + z3(z1) + '   h₁ = σ(' + z3(z1) + ') = ' + z3(h1) +
                    '\n   z₂ = ' + z3(W.h2[0]) + ' − ' + zahl(-W.h2[1]) + ' · ' + x[0] + ' − ' + zahl(-W.h2[2]) + ' · ' + x[1] + ' = ' + z3(z2) + '   h₂ = σ(' + z3(z2) + ') = ' + z3(h2);
            }
            if (stufe >= 2) {
                v.zy = zy; v.y = y;
                t += '\n② z = ' + z3(W.y[0]) + ' + ' + zahl(W.y[1]) + ' · ' + z3(h1) + ' + ' + zahl(W.y[2]) + ' · ' + z3(h2) + ' = ' + z3(zy) + '   y = σ(' + z3(zy) + ') = ' + z3(y) +
                    '\n   Ziel (XOR): ' + (x[0] !== x[1] ? 1 : 0) + ' → Fehler y − Ziel = ' + z3(y - (x[0] !== x[1] ? 1 : 0));
            }
            bild.innerHTML = netzSVG(v);
            rechnung.textContent = t;
            b1.disabled = stufe >= 1; b2.disabled = stufe !== 1;
        }
        b1.addEventListener('click', function () { stufe = 1; zeige(); });
        b2.addEventListener('click', function () { stufe = 2; zeige(); });
        b0.addEventListener('click', function () { stufe = 0; zeige(); });
        wahl.children[2].classList.add('aktiv');
        zeige();
    }

    // ---------- Gradientenabstieg ----------
    function abstieg(box) {
        var art = box.getAttribute('data-abstieg') || '1d';
        box.classList.add('werk');
        if (art === '2d') return abstieg2d(box);
        // Kostenkurve mit einem lokalen und einem globalen Minimum
        function K(w) { return .05 * Math.pow(w, 4) - .25 * Math.pow(w, 3) - .1 * w * w + 1.0 * w + 2.2; }
        function dK(w) { return .2 * Math.pow(w, 3) - .75 * w * w - .2 * w + 1.0; }
        var w = -2.2, spur = [];
        box.appendChild(h('h4', { text: 'Gradientenabstieg: im Nebel bergab' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var welt = new KI.Punktwelt(links, { x: [-3, 5.5], y: [-1, 6], xName: 'Gewicht w', yName: 'Kosten K(w)', breite: 460, hoehe: 320, info: false });
        var eta = regler('Lernrate η', .01, 1.2, .1, .01, function (v) { return zahl(+(+v).toFixed(2)); });
        var start = regler('Start w', -3, 5, -2.2, .1);
        var b1 = h('button', { type: 'button', cls: 'knopf voll', text: 'Ein Schritt' }), b10 = h('button', { type: 'button', cls: 'knopf', text: '10 Schritte' }), b0 = h('button', { type: 'button', cls: 'knopf', text: 'Neustart' });
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        [eta.box, start.box, h('div', { cls: 'knopfzeile' }, [b1, b10, b0]), anzeige].forEach(function (x) { rechts.appendChild(x); });
        function zeichne(info) {
            welt.leeren();
            var alt = null;
            for (var x = -3; x <= 5.5; x += .05) { var y = K(x); if (alt) welt.linie(alt[0], alt[1], x, y, { farbe: '#1d4ed8', breite: 2.5 }); alt = [x, y]; }
            spur.forEach(function (p, i) { if (i) welt.linie(spur[i - 1], K(spur[i - 1]), p, K(p), { farbe: '#d97706', breite: 1.5, strich: [3, 3] }); welt.punkt(p, K(p), { farbe: '#fcd34d', r: 3 }); });
            var m = dK(w);
            welt.linie(w - .8, K(w) - .8 * m, w + .8, K(w) + .8 * m, { farbe: '#dc2626', breite: 2 });
            welt.punkt(w, K(w), { farbe: '#d97706', r: 8, rand: '#0f172a', randBreite: 1.5 });
            anzeige.textContent = 'w = ' + z3(w) + '   K(w) = ' + z3(K(w)) + '\nSteigung K′(w) = ' + z3(m) + '\nRegel: w_neu = w − η · K′(w) = ' + z3(w) + ' − ' + zahl(+eta.inp.value) + ' · (' + z3(m) + ') = ' + z3(w - eta.inp.value * m) + (info ? '\n' + info : '');
        }
        function schritt() {
            var neu = w - eta.inp.value * dK(w);
            if (!isFinite(neu) || Math.abs(neu) > 50) { zeichne('Die Kugel ist aus dem Bild gesprungen: Die Lernrate ist zu groß.'); w = 50; return false; }
            spur.push(w); w = neu; return true;
        }
        b1.addEventListener('click', function () { if (schritt()) zeichne(); });
        b10.addEventListener('click', function () { for (var i = 0; i < 10; i++) if (!schritt()) return; zeichne(); });
        b0.addEventListener('click', function () { w = +start.inp.value; spur = []; zeichne(); });
        start.inp.addEventListener('input', function () { w = +start.inp.value; spur = []; zeichne(); });
        zeichne();
    }
    function abstieg2d(box) {
        // Kosten zweier Gewichte: länglicher Kessel K(a, b) = 0,5·(a − 2)² + 4·(b − 1)² + 0,5
        function K(a, b) { return .5 * (a - 2) * (a - 2) + 4 * (b - 1) * (b - 1) + .5; }
        function grad(a, b) { return [(a - 2), 8 * (b - 1)]; }
        var p = [-2.5, 2.6], spur = [];
        box.appendChild(h('h4', { text: 'Gradientenabstieg mit zwei Gewichten (Höhenlinien)' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var welt = new KI.Punktwelt(links, { x: [-3, 5], y: [-1.5, 3.5], xName: 'Gewicht w₁', yName: 'Gewicht w₂', breite: 460, hoehe: 360, info: false, raster: false });
        var eta = regler('Lernrate η', .02, .3, .1, .01, function (v) { return zahl(+(+v).toFixed(2)); });
        var b1 = h('button', { type: 'button', cls: 'knopf voll', text: 'Ein Schritt' }), b10 = h('button', { type: 'button', cls: 'knopf', text: '10 Schritte' }), b0 = h('button', { type: 'button', cls: 'knopf', text: 'Neustart' });
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        [eta.box, h('div', { cls: 'knopfzeile' }, [b1, b10, b0]), anzeige].forEach(function (x) { rechts.appendChild(x); });
        rechts.appendChild(h('p', { style: 'font-size:.88rem;color:var(--gray)', text: 'Je dunkler, desto höher die Kosten. Klicke ins Bild, um woanders zu starten.' }));
        welt.beiKlick(function (a, b) { p = [a, b]; spur = []; zeichne(); });
        function zeichne() {
            welt.leeren();
            welt.region(function (a, b) { var v = K(a, b), stufe = Math.floor(Math.log(v) * 3); return 'hsl(220,60%,' + Math.max(25, 96 - stufe * 6) + '%)'; }, 70);
            spur.forEach(function (q, i) { var n = spur[i + 1] || p; welt.linie(q[0], q[1], n[0], n[1], { farbe: '#d97706', breite: 2 }); welt.punkt(q[0], q[1], { farbe: '#fcd34d', r: 3 }); });
            welt.punkt(2, 1, { farbe: '#16a34a', form: 'stern', r: 8 });
            welt.punkt(p[0], p[1], { farbe: '#d97706', r: 7, rand: '#0f172a', randBreite: 1.5 });
            var g = grad(p[0], p[1]);
            anzeige.textContent = '(w₁ | w₂) = (' + z3(p[0]) + ' | ' + z3(p[1]) + ')   K = ' + z3(K(p[0], p[1])) + '\nGradient (Steigung je Gewicht) = (' + z3(g[0]) + ' | ' + z3(g[1]) + ')\nSchritt: jedes Gewicht um −η · seine Steigung';
        }
        function schritt() { var g = grad(p[0], p[1]); spur.push(p.slice()); p = [p[0] - eta.inp.value * g[0], p[1] - eta.inp.value * g[1]]; if (Math.abs(p[1]) > 100) p[1] = Math.sign(p[1]) * 100; }
        b1.addEventListener('click', function () { schritt(); zeichne(); });
        b10.addEventListener('click', function () { for (var i = 0; i < 10; i++) schritt(); zeichne(); });
        b0.addEventListener('click', function () { p = [-2.5, 2.6]; spur = []; zeichne(); });
        zeichne();
    }

    // ---------- Backpropagation Schritt für Schritt ----------
    var XOR_DATEN = [{ x: [0, 0], ziel: 0 }, { x: [0, 1], ziel: 1 }, { x: [1, 0], ziel: 1 }, { x: [1, 1], ziel: 0 }];
    function rueckwaerts(box) {
        var netz, stufe, beispiel = 1, eta;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Backpropagation: die Schuld rückwärts verteilen' }));
        var bild = h('div'), text = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var bs = ['① vorwärts', '② Fehler am Ausgang', '③ Schuld rückwärts', '④ Gewichte anpassen'].map(function (t, i) { var b = h('button', { type: 'button', cls: 'knopf voll', text: t }); b.addEventListener('click', function () { stufe = i + 1; zeige(); }); return b; });
        var bNeu = h('button', { type: 'button', cls: 'knopf', text: 'neues Netz (zufällige Gewichte)' });
        var bTrain = h('button', { type: 'button', cls: 'knopf', text: '500 Trainingsschritte auf allen 4 XOR-Beispielen' });
        var verlauf = h('div');
        var etaR = regler('Lernrate η', .1, 5, 2, .1);
        box.appendChild(bild); box.appendChild(h('div', { cls: 'knopfzeile' }, bs)); box.appendChild(text);
        box.appendChild(etaR.box); box.appendChild(h('div', { cls: 'knopfzeile' }, [bNeu, bTrain])); box.appendChild(verlauf);
        var kurve = [];
        function neu(seed) {
            netz = new Netz([2, 2, 1], 'sigmoid', seed);
            stufe = 0; kurve = [netz.kosten(XOR_DATEN)]; verlauf.textContent = '';
        }
        function gw() { return { h1: [netz.b[0][0], netz.W[0][0][0], netz.W[0][0][1]], h2: [netz.b[0][1], netz.W[0][1][0], netz.W[0][1][1]], y: [netz.b[1][0], netz.W[1][0][0], netz.W[1][0][1]] }; }
        function zeige() {
            var p = XOR_DATEN[beispiel], g = netz.gradient(p.x, p.ziel), r = g.r, y = r.a[2][0];
            var v = { x1: p.x[0], x2: p.x[1] }, opt = { w: gw() }, t = 'Beispiel x = (' + p.x[0] + ' | ' + p.x[1] + '), Ziel ' + p.ziel + '. Kosten über alle 4 Beispiele: K = ' + z3(netz.kosten(XOR_DATEN));
            if (stufe >= 1) { v.h1 = r.a[1][0]; v.h2 = r.a[1][1]; v.y = y; v.z1 = r.z[0][0]; v.z2 = r.z[0][1]; v.zy = r.z[1][0]; t += '\n① vorwärts: h₁ = ' + z3(v.h1) + ', h₂ = ' + z3(v.h2) + ', y = ' + z3(y); }
            if (stufe >= 2) t += '\n② Fehler am Ausgang: y − Ziel = ' + z3(y - p.ziel) + ' (Kosten dieses Beispiels (y − Ziel)² = ' + z3((y - p.ziel) * (y - p.ziel)) + ')';
            if (stufe >= 3) {
                opt.schuld = { y: g.delta[1][0], h1: g.delta[0][0], h2: g.delta[0][1] };
                t += '\n③ Schuld (δ) des Ausgangs: ' + z3(g.delta[1][0]) + '; zurück über die Gewichte ' + z3(netz.W[1][0][0]) + ' und ' + z3(netz.W[1][0][1]) +
                    ':\n   δ(h₁) = ' + z3(g.delta[0][0]) + ', δ(h₂) = ' + z3(g.delta[0][1]) + '  (je größer das Gewicht, desto mehr Schuld; dicke rote Linie = viel Schuld)';
            }
            if (stufe >= 4) {
                eta = +etaR.inp.value;
                var vorher = netz.kosten(XOR_DATEN);
                g.gW.forEach(function (Wl, l) { Wl.forEach(function (z, j) { z.forEach(function (d, i) { netz.W[l][j][i] -= eta * d; }); netz.b[l][j] -= eta * g.gb[l][j]; }); });
                t += '\n④ jedes Gewicht: w_neu = w − η · δ · (Eingang des Gewichts). Kosten über alle 4 Beispiele: ' + z3(vorher) + ' → ' + z3(netz.kosten(XOR_DATEN));
                opt.w = gw(); stufe = 0;
                beispiel = (beispiel + 1) % 4;
                t += '\nWeiter mit dem nächsten Beispiel: x = (' + XOR_DATEN[beispiel].x[0] + ' | ' + XOR_DATEN[beispiel].x[1] + ')';
            }
            bild.innerHTML = netzSVG(v, opt);
            text.textContent = t;
            bs.forEach(function (b, i) { b.disabled = i !== stufe; });
        }
        bNeu.addEventListener('click', function () { neu(Math.floor(Math.random() * 1e6)); zeige(); });
        bTrain.addEventListener('click', function () {
            for (var i = 0; i < 500; i++) { netz.schritt(XOR_DATEN, +etaR.inp.value); if (i % 10 === 9) kurve.push(netz.kosten(XOR_DATEN)); }
            stufe = 0; zeige();
            verlauf.textContent = '';
            var cw = new KI.Punktwelt(verlauf, { x: [0, (kurve.length - 1) * 10], y: [0, Math.max(.3, Math.max.apply(null, kurve))], xName: 'Trainingsschritte', yName: 'Kosten', breite: 460, hoehe: 220, info: false });
            kurve.forEach(function (k, i) { if (i) cw.linie((i - 1) * 10, kurve[i - 1], i * 10, k, { farbe: '#16a34a', breite: 2.2 }); });
            verlauf.appendChild(h('p', { style: 'font-size:.9rem', text: 'Ausgaben jetzt: ' + XOR_DATEN.map(function (p) { return '(' + p.x[0] + '|' + p.x[1] + ') → ' + z3(netz.aus(p.x)); }).join(', ') + '. Bleibt die Kurve hängen, steckt das Netz in einem lokalen Minimum: neues Netz probieren.' }));
        });
        neu(7); zeige();
    }

    // ---------- Netz-Spielplatz ----------
    function spielDaten(name, n, rauschen, seed) {
        var rnd = KI.zufall(seed), out = [];
        function g() { var u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
        for (var i = 0; i < n; i++) {
            var x, y, k, t;
            if (name === 'kreis') { var r = rnd() < .5 ? rnd() * .22 : .3 + rnd() * .18, a = rnd() * 2 * Math.PI; x = .5 + r * Math.cos(a); y = .5 + r * Math.sin(a); k = r < .26 ? 1 : 0; }
            else if (name === 'xor') { x = rnd(); y = rnd(); k = (x > .5) !== (y > .5) ? 1 : 0; }
            else if (name === 'monde') { k = i % 2; t = Math.PI * rnd(); x = k ? .57 - .25 * Math.cos(t) : .32 + .25 * Math.cos(t); y = k ? .58 - .25 * Math.sin(t) : .42 + .25 * Math.sin(t); }
            else if (name === 'spirale') { k = i % 2; t = rnd() * 2.6 * Math.PI; var rr = .04 + t / (2.6 * Math.PI) * .42; x = .5 + rr * Math.cos(t + k * Math.PI); y = .5 + rr * Math.sin(t + k * Math.PI); }
            else { x = rnd(); y = rnd(); k = (x - .3) * (x - .3) + (y - .7) * (y - .7) < .03 || (x - .7) * (x - .7) + (y - .3) * (y - .3) < .03 ? 1 : 0; }
            out.push({ x: [x + rauschen * .05 * g(), y + rauschen * .05 * g()], ziel: k });
        }
        return out;
    }
    function spielplatz(box) {
        var netz, train, test, epoche = 0, laeuft = false, kurveTr = [], kurveTe = [], timer = null;
        box.classList.add('werk', 'spielplatz');
        box.appendChild(h('h4', { text: 'Netz-Spielplatz' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var selD = h('select', { 'aria-label': 'Daten' });
        [['kreis', 'Kern im Ring'], ['xor', 'XOR'], ['monde', 'zwei Monde'], ['spirale', 'Spirale'], ['inseln', 'zwei Inseln']].forEach(function (o) { selD.appendChild(h('option', { value: o[0], text: o[1] })); });
        var selA = h('select', { 'aria-label': 'Aktivierungsfunktion' });
        ['sigmoid', 'tanh', 'relu', 'linear'].forEach(function (k) { selA.appendChild(h('option', { value: k, text: AKT[k].name })); });
        selA.value = 'tanh';
        var schichten = regler('verdeckte Schichten', 0, 3, 1, 1, function (v) { return v; });
        var neuronen = regler('Neuronen je Schicht', 1, 8, 4, 1, function (v) { return v; });
        var eta = regler('Lernrate η', .05, 3, .8, .05, function (v) { return zahl(+(+v).toFixed(2)); });
        var rausch = regler('Rauschen', 0, 10, 1, 1, function (v) { return v; });
        var anteil = regler('Trainingsanteil', 10, 90, 50, 10, function (v) { return v + ' %'; });
        var bStart = h('button', { type: 'button', cls: 'knopf voll', text: '▶ Trainieren' }), bReset = h('button', { type: 'button', cls: 'knopf', text: 'Neu (Gewichte und Daten)' });
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'Daten:' }), selD, h('span', { text: 'Aktivierung:' }), selA]));
        [schichten, neuronen, eta, rausch, anteil].forEach(function (r) { rechts.appendChild(r.box); });
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [bStart, bReset]));
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' }), kurve = h('div'), neuro = h('div', { cls: 'spiel-neuronen' });
        rechts.appendChild(anzeige); rechts.appendChild(kurve);
        var welt = new KI.Punktwelt(links, { x: [0, 1], y: [0, 1], xName: 'x1', yName: 'x2', breite: 440, hoehe: 420, info: false });
        links.appendChild(h('div', { cls: 'legende', html: '<span style="--f:#2563eb">Klasse 0</span><span class="quadrat" style="--f:#dc2626">Klasse 1</span><span>hohl = Testdaten</span>' }));
        links.appendChild(h('div', { style: 'font-size:.85rem;color:var(--gray);margin-top:.4rem', text: 'Was die Neuronen der ersten verdeckten Schicht „sehen“:' }));
        links.appendChild(neuro);
        function aufbauen() {
            var daten = spielDaten(selD.value, 240, +rausch.inp.value, 5), gem = KI.mischen(daten, KI.zufall(6)), n = Math.round(240 * anteil.inp.value / 100);
            train = gem.slice(0, n); test = gem.slice(n);
            var g = [2]; for (var i = 0; i < +schichten.inp.value; i++) g.push(+neuronen.inp.value); g.push(1);
            netz = new Netz(g, selA.value, Math.floor(Math.random() * 1e6));
            epoche = 0; kurveTr = []; kurveTe = [];
            zeichne(true);
        }
        function zeichne(alles) {
            welt.leeren();
            welt.region(function (x, y) { var v = netz.aus([x, y]); return 'rgba(' + Math.round(37 + 183 * v) + ',' + Math.round(99 - 61 * v) + ',' + Math.round(235 - 197 * v) + ',.25)'; }, 36);
            train.forEach(function (p) { welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), form: p.ziel ? 'quadrat' : 'kreis', r: 3.3 }); });
            test.forEach(function (p) { welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), r: 3.8, hohl: true }); });
            var kt = netz.kosten(train), ke = netz.kosten(test);
            anzeige.textContent = 'Epoche ' + epoche + '   Netz: ' + netz.g.join('–') + ' (' + gewichtsZahl() + ' Gewichte)\nKosten Training ' + zahl(kt, 3) + ' · Test ' + zahl(ke, 3) + '\nrichtig Training ' + Math.round(100 * netz.genauigkeit(train)) + ' % · Test ' + Math.round(100 * netz.genauigkeit(test)) + ' %';
            if (alles || epoche % 20 === 0) { zeichneKurve(); zeichneNeuronen(); }
        }
        function gewichtsZahl() { var s = 0; for (var l = 1; l < netz.g.length; l++) s += netz.g[l] * (netz.g[l - 1] + 1); return s; }
        function zeichneKurve() {
            kurve.textContent = '';
            if (kurveTr.length < 2) return;
            var max = Math.max(.05, Math.max.apply(null, kurveTr.concat(kurveTe)));
            var cw = new KI.Punktwelt(kurve, { x: [0, kurveTr.length * 10], y: [0, max], xName: 'Epochen', yName: 'Kosten', breite: 420, hoehe: 190, info: false });
            for (var i = 1; i < kurveTr.length; i++) { cw.linie((i - 1) * 10, kurveTr[i - 1], i * 10, kurveTr[i], { farbe: '#334155', breite: 2 }); cw.linie((i - 1) * 10, kurveTe[i - 1], i * 10, kurveTe[i], { farbe: '#d97706', breite: 2 }); }
            kurve.appendChild(h('div', { cls: 'legende', html: '<span style="--f:#334155">Kosten Training</span><span style="--f:#d97706">Kosten Test</span>' }));
        }
        function zeichneNeuronen() {
            neuro.textContent = '';
            if (netz.W.length < 2) { neuro.appendChild(h('span', { style: 'font-size:.85rem', text: 'keine verdeckte Schicht: Das Netz ist ein einzelnes Neuron.' })); return; }
            var f = AKT[netz.akt];
            netz.W[0].forEach(function (w, j) {
                var cv = h('canvas', { width: 56, height: 56, title: 'Neuron ' + (j + 1) }), c = cv.getContext('2d');
                for (var a = 0; a < 14; a++) for (var b = 0; b < 14; b++) {
                    var x = (a + .5) / 14, y = 1 - (b + .5) / 14, v = f.f(netz.b[0][j] + w[0] * x + w[1] * y);
                    v = netz.akt === 'tanh' ? (v + 1) / 2 : netz.akt === 'relu' || netz.akt === 'linear' ? Math.max(0, Math.min(1, v / 2)) : v;
                    c.fillStyle = 'rgb(' + Math.round(37 + 183 * v) + ',' + Math.round(99 - 61 * v) + ',' + Math.round(235 - 197 * v) + ')';
                    c.fillRect(a * 4, b * 4, 4, 4);
                }
                neuro.appendChild(cv);
            });
        }
        function takt() {
            for (var i = 0; i < 10; i++) { netz.schritt(train, +eta.inp.value); epoche++; }
            kurveTr.push(netz.kosten(train)); kurveTe.push(netz.kosten(test));
            zeichne(false);
            if (epoche >= 3000) stopp();
        }
        function stopp() { laeuft = false; clearInterval(timer); timer = null; bStart.textContent = '▶ Trainieren'; zeichneKurve(); zeichneNeuronen(); }
        bStart.addEventListener('click', function () {
            if (laeuft) { stopp(); return; }
            laeuft = true; bStart.textContent = '⏸ Anhalten';
            timer = setInterval(takt, 30);
        });
        bReset.addEventListener('click', function () { stopp(); aufbauen(); });
        [selD, selA].forEach(function (s) { s.addEventListener('change', function () { stopp(); aufbauen(); }); });
        [schichten, neuronen, rausch, anteil].forEach(function (r) { r.inp.addEventListener('change', function () { stopp(); aufbauen(); }); });
        aufbauen();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-aktivierung]').forEach(aktivierung);
        document.querySelectorAll('[data-vorwaerts]').forEach(vorwaerts);
        document.querySelectorAll('[data-abstieg]').forEach(abstieg);
        document.querySelectorAll('[data-rueckwaerts]').forEach(rueckwaerts);
        document.querySelectorAll('[data-spielplatz]').forEach(spielplatz);
    });
})();
