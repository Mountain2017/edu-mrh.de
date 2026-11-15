/*
 * Spezielle Relativitätstheorie (Physik 11) – Simulationen der Stationsseiten
 *
 *   <div data-sim="zug"></div>        Station 1: Ballwurf im Zug, Kamera Bahnsteig (S) / Zug (S′)
 *   <div data-sim="rennen"></div>     Station 2: Wettschwimmen im Fluss (quer gegen längs)
 *   <div data-sim="aether"></div>     Station 2: Interferometer drehen, Erwartung gegen Messung 1887
 *   <div data-sim="lampe"></div>      Station 3: Signal aus der Wagenmitte (Bälle oder Licht), Kamera S / S′
 *   <div data-sim="lichtuhr"></div>   Station 4: zwei Lichtuhren (Bea, Zoe), Kamera S / S′, Messwerte
 *   <div data-sim="gamma"></div>      Station 4: γ-Explorer mit Alltagsgeschwindigkeiten
 *   <div data-sim="myonen"></div>     Station 5: Myonen vom Berg zum Meer (Zählraten wie Frisch/Smith 1963)
 *   <div data-sim="gps"></div>        Station 6: GPS-Rechner (prüft die eigene Rechnung)
 *
 * Feste Farben: Bahnsteig-System S (Bea) blau, Zug-System S′ (Zoe) orange, Licht gelb.
 * Reines Canvas, keine Bibliotheken, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';
    var BLAU = '#2563eb', ORANGE = '#ea580c', LICHT = '#ca8a04', GRAU = '#64748b', DUNKEL = '#0f172a', C = 299792458;

    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'html') e.innerHTML = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function fmt(x, n) { return x.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }).replace('-', '−'); }
    function sig(x, n) { return Number(x.toPrecision(n)).toLocaleString('de-DE', { maximumSignificantDigits: n }); }
    function zehner(x, n) {            // 4,2 · 10⁻¹⁴
        if (x === 0) return '0';
        var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
        var hoch = String(e).replace(/-/g, '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; });
        return fmt(m, n) + ' · 10' + hoch;
    }
    function rahmen(box, titel, hoehe) {
        box.classList.add('sim');
        var leiste = h('div', { cls: 'knopfzeile' });
        var cv = h('canvas', { width: '720', height: String(hoehe), role: 'img', 'aria-label': titel });
        var info = h('div', { cls: 'sim-info', 'aria-live': 'polite' });
        box.appendChild(h('h4', { text: titel })); box.appendChild(leiste); box.appendChild(cv); box.appendChild(info);
        return { cv: cv, ctx: cv.getContext('2d'), leiste: leiste, info: info, B: 720, H: hoehe };
    }
    function knopf(text, fn, cls) {
        var b = h('button', { type: 'button', cls: 'knopf' + (cls ? ' ' + cls : ''), text: text });
        b.addEventListener('click', fn);
        return b;
    }
    function umschalter(titel, ops, start, fn) {       // ops: [[wert, Text, Klasse]]
        var el = h('span', { cls: 'gruppe', role: 'group', 'aria-label': titel }, [h('span', { text: titel })]);
        var wert = start, knoepfe = [];
        ops.forEach(function (o) {
            var b = knopf(o[1], function () { wert = o[0]; zeige(); fn(wert); }, o[2] || '');
            b.setAttribute('data-w', o[0]); knoepfe.push(b); el.appendChild(b);
        });
        function zeige() { knoepfe.forEach(function (b) { var an = b.getAttribute('data-w') === String(wert); b.classList.toggle('aktiv', an); b.setAttribute('aria-pressed', an ? 'true' : 'false'); }); }
        zeige();
        return { el: el, wert: function () { return wert; } };
    }
    function regler(titel, min, max, schritt, start, zeigeWert, fn) {
        var inp = h('input', { type: 'range', min: String(min), max: String(max), step: String(schritt), value: String(start), 'aria-label': titel });
        var out = h('output', { text: zeigeWert(start) });
        inp.addEventListener('input', function () { out.textContent = zeigeWert(parseFloat(inp.value)); fn(parseFloat(inp.value)); });
        return { el: h('label', { cls: 'regler' }, [h('span', { text: titel }), inp, out]), wert: function () { return parseFloat(inp.value); } };
    }
    function uhr(schritt) {             // Animationsschleife mit Start/Pause
        var an = false, letzte = 0;
        function tick(t) {
            if (!an) return;
            var dt = Math.max(0, Math.min(0.05, (t - letzte) / 1000)); letzte = t;
            schritt(dt);
            requestAnimationFrame(tick);
        }
        return {
            start: function () { if (an) return; an = true; letzte = performance.now(); requestAnimationFrame(tick); },
            stopp: function () { an = false; },
            laeuft: function () { return an; }
        };
    }
    function figur(ctx, x, y, farbe, name) {           // Strichfigur, Füße bei (x, y)
        ctx.save(); ctx.strokeStyle = farbe; ctx.fillStyle = farbe; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y - 44, 7, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y - 37); ctx.lineTo(x, y - 16); ctx.moveTo(x, y - 16); ctx.lineTo(x - 7, y); ctx.moveTo(x, y - 16); ctx.lineTo(x + 7, y);
        ctx.moveTo(x - 9, y - 28); ctx.lineTo(x + 9, y - 28); ctx.stroke();
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, x, y - 56);
        ctx.restore();
    }
    function text(ctx, s, x, y, farbe, stil, aus) {
        ctx.save(); ctx.fillStyle = farbe || DUNKEL; ctx.font = stil || '13px sans-serif'; ctx.textAlign = aus || 'left'; ctx.fillText(s, x, y); ctx.restore();
    }
    function pfeil(ctx, x1, y1, x2, y2, farbe, breite) {
        var w = Math.atan2(y2 - y1, x2 - x1), l = 9;
        ctx.save(); ctx.strokeStyle = farbe; ctx.fillStyle = farbe; ctx.lineWidth = breite || 2.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - l * Math.cos(w - 0.4), y2 - l * Math.sin(w - 0.4)); ctx.lineTo(x2 - l * Math.cos(w + 0.4), y2 - l * Math.sin(w + 0.4)); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    function boden(ctx, B, y, versatz) {               // Bahnsteig mit Pfosten, um versatz verschoben
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, y, B, 6);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
        var start = ((versatz % 90) + 90) % 90;
        for (var x = start - 90; x < B + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); ctx.stroke(); }
    }
    function wagen(ctx, x, y, b, hh) {                  // Wagen: linke untere Ecke (x, y)
        ctx.save(); ctx.fillStyle = 'rgba(234,88,12,.08)'; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3;
        ctx.fillRect(x, y - hh, b, hh); ctx.strokeRect(x, y - hh, b, hh);
        ctx.fillStyle = '#475569';
        ctx.beginPath(); ctx.arc(x + 30, y + 5, 8, 0, 7); ctx.arc(x + b - 30, y + 5, 8, 0, 7); ctx.fill();
        ctx.restore();
    }

    // ======================================================================
    // Station 1: Ballwurf im Zug
    // ======================================================================
    function zug(box) {
        var r = rahmen(box, 'Zug-Labor: derselbe Wurf, zwei Kameras', 300), ctx = r.ctx;
        var M = 13, g = 9.81, uy = 6;                  // 1 m = 13 px
        var v = 12, ux = 0, t = 0, kam = 'S', spur = [], fertig = false;
        var kamera = umschalter('Kamera:', [['S', 'steht am Bahnsteig (Bea)', 's'], ['Z', 'fährt im Zug mit (Zoe)', 'z']], 'S', function (w) { kam = w; spur = []; neu(); });
        var wurf = umschalter('Zoe wirft:', [['0', 'senkrecht hoch'], ['4', 'nach vorn (4 m/s)'], ['-4', 'nach hinten (4 m/s)']], '0', function (w) { ux = parseFloat(w); neu(); });
        var tempo = regler('Zug-Geschwindigkeit v', 0, 20, 1, 12, function (x) { return fmt(x, 0) + ' m/s'; }, function (x) { v = x; neu(); });
        var lauf = uhr(function (dt) {
            t += dt * 0.6;
            var T = 2 * uy / g;
            if (t >= T) { t = T; fertig = true; lauf.stopp(); }
            zeichne();
        });
        r.leiste.appendChild(kamera.el); r.leiste.appendChild(wurf.el); r.leiste.appendChild(tempo.el);
        r.leiste.appendChild(knopf('▶ Werfen', function () { neu(); lauf.start(); }));
        function neu() { lauf.stopp(); t = 0; spur = []; fertig = false; zeichne(); }
        function zeichne() {
            var B = r.B, yB = 250, zugX0 = kam === 'S' ? 40 : 230, vers = kam === 'S' ? 0 : -v * t * M;
            var zugX = zugX0 + (kam === 'S' ? v * t * M : 0);
            ctx.clearRect(0, 0, B, r.H);
            boden(ctx, B, yB + 14, vers);
            figur(ctx, 600 + vers + (kam === 'S' ? 0 : 0), yB + 14, BLAU, 'Bea');
            wagen(ctx, zugX, yB, 260, 170);
            figur(ctx, zugX + 70, yB, ORANGE, 'Zoe');
            var bx = zugX + 85 + ux * t * M, by = yB - 30 - (uy * t - g * t * t / 2) * M;
            spur.push([bx, by]);
            ctx.strokeStyle = '#be123c'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath();
            spur.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#be123c'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill();
            text(ctx, kam === 'S' ? 'Kamera steht am Bahnsteig: System S' : 'Kamera fährt mit: System S′', 12, 20, kam === 'S' ? BLAU : ORANGE, 'bold 14px sans-serif');
            if (kam === 'S' && v > 0) pfeil(ctx, zugX + 265, yB - 150, zugX + 265 + 3 * v, yB - 150, ORANGE);
            if (kam === 'Z' && v > 0) pfeil(ctx, 600 + vers, yB - 60, 600 + vers - 3 * v, yB - 60, BLAU);
            var uS = ux + v;
            r.info.innerHTML = '<table><tr><th>Waagrechte Geschwindigkeit des Balls</th><th></th></tr>' +
                '<tr><td><span class="sZ">im Zug-System S′ (Zoe misst):</span></td><td class="zahl">u′ = ' + fmt(ux, 0) + ' m/s</td></tr>' +
                '<tr><td><span class="sS">im Bahnsteig-System S (Bea misst):</span></td><td class="zahl">u = ' + fmt(uS, 0) + ' m/s</td></tr>' +
                '<tr><td>Flugdauer (beide Uhren):</td><td class="zahl">' + (fertig ? fmt(2 * uy / g, 2) + ' s' : '…') + '</td></tr></table>';
        }
        zeichne();
    }

    // ======================================================================
    // Station 2: Wettschwimmen im Fluss
    // ======================================================================
    function rennen(box) {
        var r = rahmen(box, 'Wettschwimmen: quer gegen längs', 330), ctx = r.ctx;
        var L = 220, c = 110, beta = 0.6, t = 0, wellen = 0;      // px, px/s
        var tempo = regler('Strömung v', 0, 0.9, 0.1, 0.6, function (x) { return fmt(x, 1) + ' · c'; }, function (x) { beta = x; neu(); });
        var lauf = uhr(function (dt) {
            t += dt; wellen += dt * beta * c;
            if (t > Math.max(zeiten().A, zeiten().B) + 0.3) lauf.stopp();
            zeichne();
        });
        r.leiste.appendChild(tempo.el);
        r.leiste.appendChild(knopf('▶ Start', function () { neu(); lauf.start(); }));
        function zeiten() {
            var v = beta * c;
            return { A: 2 * L / Math.sqrt(c * c - v * v), B: 2 * L * c / (c * c - v * v), ruhe: 2 * L / c };
        }
        function neu() { lauf.stopp(); t = 0; zeichne(); }
        function zeichne() {
            var B = r.B, z = zeiten(), v = beta * c, x0 = 130, yU = 290, i;
            ctx.clearRect(0, 0, B, r.H);
            ctx.fillStyle = '#86efac'; ctx.fillRect(0, yU, B, 40); ctx.fillRect(0, 30, B, 40);
            ctx.fillStyle = '#e0f2fe'; ctx.fillRect(0, 70, B, yU - 70);
            ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5;
            for (i = 0; i < 26; i++) {
                var wx2 = ((i * 97 + wellen) % (B + 40)) - 20, wy2 = 82 + (i * 53) % (yU - 95);
                ctx.beginPath(); ctx.moveTo(wx2, wy2); ctx.lineTo(wx2 + 14, wy2); ctx.stroke();
            }
            if (v > 0) { pfeil(ctx, 560, 100, 560 + 60 * beta + 20, 100, '#0284c7', 3); text(ctx, 'Strömung v', 560, 90, '#0284c7', 'bold 13px sans-serif'); }
            // Bojen
            ctx.fillStyle = DUNKEL;
            [[x0, yU], [x0, yU - L], [x0 + L, yU]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill(); });
            text(ctx, 'Start', x0 - 8, yU + 20, DUNKEL, 'bold 13px sans-serif', 'right');
            text(ctx, 'Boje quer', x0 - 10, yU - L + 4, ORANGE, 'bold 13px sans-serif', 'right');
            text(ctx, 'Boje längs', x0 + L, yU + 20, BLAU, 'bold 13px sans-serif', 'center');
            text(ctx, 'beide Strecken: gleiche Länge L', x0 + 12, yU - L / 2, GRAU, '12px sans-serif');
            // A quer (orange)
            var vq = Math.sqrt(c * c - v * v), tA = Math.min(t, z.A), sA = vq * tA, yA = sA <= L ? yU - sA : yU - (2 * L - sA);
            ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(x0, yA, 9, 0, 7); ctx.fill();
            text(ctx, 'A', x0, yA + 4, '#fff', 'bold 11px sans-serif', 'center');
            // B längs (blau)
            var tHin = L / (c + v), tB = Math.min(t, z.B), xB = tB <= tHin ? x0 + (c + v) * tB : x0 + L - (c - v) * (tB - tHin);
            ctx.fillStyle = BLAU; ctx.beginPath(); ctx.arc(xB, yU - 14, 9, 0, 7); ctx.fill();
            text(ctx, 'B', xB, yU - 10, '#fff', 'bold 11px sans-serif', 'center');
            // Dreieck: wohin A zielen muss
            var dx = 470, dy = 280, s = 150;
            ctx.lineWidth = 3;
            ctx.strokeStyle = BLAU; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + s * beta, dy); ctx.stroke();
            ctx.strokeStyle = ORANGE; ctx.beginPath(); ctx.moveTo(dx + s * beta, dy); ctx.lineTo(dx + s * beta, dy - s * Math.sqrt(1 - beta * beta)); ctx.stroke();
            ctx.strokeStyle = LICHT; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + s * beta, dy - s * Math.sqrt(1 - beta * beta)); ctx.stroke();
            text(ctx, 'A schwimmt mit c schräg gegen die Strömung,', 400, 125, GRAU, '12px sans-serif');
            text(ctx, 'damit sie quer ankommt:', 400, 141, GRAU, '12px sans-serif');
            text(ctx, 'c', dx + s * beta / 2 - 16, dy - s * Math.sqrt(1 - beta * beta) / 2, LICHT, 'bold 14px sans-serif');
            text(ctx, 'v', dx + s * beta / 2, dy + 16, BLAU, 'bold 14px sans-serif', 'center');
            text(ctx, '√(c² − v²)', dx + s * beta + 8, dy - s * Math.sqrt(1 - beta * beta) / 2, ORANGE, 'bold 14px sans-serif');
            text(ctx, 'Beide schwimmen relativ zum Wasser gleich schnell (c).', 12, 22, DUNKEL, 'bold 14px sans-serif');
            var endeA = t >= z.A, endeB = t >= z.B;
            r.info.innerHTML = '<table><tr><td><span class="sZ">A (quer und zurück):</span></td><td class="zahl">' + (endeA ? fmt(z.A, 2) + ' s' : '…') + '</td>' +
                '<td><span class="sS">B (längs und zurück):</span></td><td class="zahl">' + (endeB ? fmt(z.B, 2) + ' s' : '…') + '</td></tr>' +
                '<tr><td>ohne Strömung bräuchten beide:</td><td class="zahl">' + fmt(z.ruhe, 2) + ' s</td><td>' + (endeA && endeB ? (beta === 0 ? 'Gleichstand.' : '<strong>A gewinnt</strong>, Vorsprung ' + fmt(z.B - z.A, 2) + ' s.') : '') + '</td><td></td></tr></table>';
        }
        zeichne();
    }

    // ======================================================================
    // Station 2: Interferometer drehen (Erwartung gegen Messung 1887)
    // ======================================================================
    function aether(box) {
        var r = rahmen(box, 'Das Experiment von Michelson und Morley (1887)', 300), ctx = r.ctx;
        var winkel = 0, modus = 'erwartet';
        var AMP = { erwartet: 0.2, gemessen: 0.005 };       // Verschiebung in Streifenbreiten (±), erwartet insgesamt 0,4
        var wahl = umschalter('Zeige:', [['erwartet', 'Vorhersage mit Ätherwind'], ['gemessen', 'Messung 1887']], 'erwartet', function (w) { modus = w; zeichne(); });
        var dreh = regler('Apparat drehen', 0, 360, 5, 0, function (x) { return fmt(x, 0) + '°'; }, function (x) { winkel = x; zeichne(); });
        r.leiste.appendChild(wahl.el); r.leiste.appendChild(dreh.el);
        function versch(w, m) { return AMP[m] * Math.cos(2 * w * Math.PI / 180); }
        function zeichne() {
            var B = r.B, i;
            ctx.clearRect(0, 0, B, r.H);
            // Apparat
            var cx = 120, cy = 160, a = winkel * Math.PI / 180;
            ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(cx, cy, 95, 0, 7); ctx.fill();
            for (i = 0; i < 5; i++) pfeil(ctx, 20, 70 + i * 45, 50, 70 + i * 45, '#cbd5e1', 2);
            text(ctx, 'vermuteter Ätherwind', 14, 50, GRAU, '12px sans-serif');
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a);
            ctx.strokeStyle = LICHT; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(80, 0); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke();
            ctx.strokeStyle = DUNKEL; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(80, -12); ctx.lineTo(80, 12); ctx.moveTo(-12, -80); ctx.lineTo(12, -80); ctx.stroke();
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(9, -9); ctx.stroke();
            ctx.fillStyle = LICHT; ctx.beginPath(); ctx.arc(-80, 0, 6, 0, 7); ctx.fill();
            ctx.fillStyle = DUNKEL; ctx.fillRect(-7, 60, 14, 8);
            ctx.restore();
            text(ctx, 'Lichtquelle, zwei Arme mit Spiegeln, Schirm', cx, 275, GRAU, '12px sans-serif', 'center');
            // Streifen
            var sx = 250, sb = 200, sy = 60, sh = 80, d = versch(winkel, modus), px;
            for (px = 0; px < sb; px++) {
                var hell = 0.5 + 0.5 * Math.cos(2 * Math.PI * (px / 40 - d));
                var gw = Math.round(40 + 215 * hell);
                ctx.fillStyle = 'rgb(' + gw + ',' + Math.round(gw * 0.85) + ',' + Math.round(gw * 0.25) + ')';
                ctx.fillRect(sx + px, sy, 1, sh);
            }
            ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 80, sy - 8); ctx.lineTo(sx + 80, sy + sh + 8); ctx.stroke();
            text(ctx, 'Schirm: Streifenmuster', sx, sy - 14, DUNKEL, 'bold 13px sans-serif');
            text(ctx, 'rote Marke = Lage bei 0°', sx, sy + sh + 24, '#be123c', '12px sans-serif');
            text(ctx, 'Verschiebung: ' + fmt(d - versch(0, modus), 2).replace('-', '−') + ' Streifenbreiten', sx, sy + sh + 44, DUNKEL, 'bold 13px sans-serif');
            // Diagramm
            var gx = 490, gy = 160, gb = 210, gh = 90;
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy + gh); ctx.moveTo(gx, gy); ctx.lineTo(gx + gb, gy); ctx.stroke();
            text(ctx, 'Verschiebung beim Drehen', gx, 40, DUNKEL, 'bold 13px sans-serif');
            text(ctx, '+0,2', gx - 6, gy - 76, GRAU, '11px sans-serif', 'right'); text(ctx, '−0,2', gx - 6, gy + 84, GRAU, '11px sans-serif', 'right');
            text(ctx, '0°', gx, gy + gh + 16, GRAU, '11px sans-serif', 'center'); text(ctx, '360°', gx + gb, gy + gh + 16, GRAU, '11px sans-serif', 'center');
            function kurve(m, farbe, strich) {
                ctx.strokeStyle = farbe; ctx.lineWidth = 2.5; ctx.setLineDash(strich); ctx.beginPath();
                for (var w = 0; w <= 360; w += 5) { var X = gx + gb * w / 360, Y = gy - versch(w, m) * 400; if (w) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
                ctx.stroke(); ctx.setLineDash([]);
            }
            kurve('erwartet', '#7c3aed', [6, 4]);
            if (modus === 'gemessen') kurve('gemessen', '#be123c', []);
            text(ctx, '- - Vorhersage', gx + 8, gy + gh + 34, '#7c3aed', 'bold 12px sans-serif');
            if (modus === 'gemessen') text(ctx, '— Messung', gx + 120, gy + gh + 34, '#be123c', 'bold 12px sans-serif');
            ctx.fillStyle = modus === 'gemessen' ? '#be123c' : '#7c3aed'; ctx.beginPath(); ctx.arc(gx + gb * winkel / 360, gy - d * 400, 5, 0, 7); ctx.fill();
            r.info.innerHTML = modus === 'erwartet'
                ? 'Vorhersage: Beim Drehen um 90° tauschen die Arme ihre Rolle (längs ↔ quer). Das Muster müsste sich insgesamt um etwa <strong>0,4 Streifenbreiten</strong> verschieben.'
                : 'Messung: Die Verschiebung blieb unter <strong>0,01 Streifenbreiten</strong>, in jeder Richtung, zu jeder Tages- und Jahreszeit. Der Apparat hätte einen 40-mal kleineren Effekt als den erwarteten noch gezeigt.';
        }
        zeichne();
    }

    // ======================================================================
    // Station 3: Signal aus der Wagenmitte
    // ======================================================================
    function lampe(box) {
        var r = rahmen(box, 'Signal aus der Wagenmitte: Wann kommt es an den Türen an?', 300), ctx = r.ctx;
        var art = 'ball', kam = 'Z', beta = 0.5, t = 0, HL = 150, cs = 120;     // halbe Wagenlänge px, Signalgeschwindigkeit px/s
        var signal = umschalter('Signal:', [['ball', 'zwei Bälle (klassisch)'], ['licht', 'Lichtblitz']], 'ball', function (w) { art = w; neu(); });
        var kamera = umschalter('System:', [['Z', 'Zug S′ (Zoe)', 'z'], ['S', 'Bahnsteig S (Bea)', 's']], 'Z', function (w) { kam = w; neu(); });
        var tempo = regler('Zug v', 0.1, 0.8, 0.1, 0.5, function (x) { return fmt(x, 1) + ' · Signaltempo'; }, function (x) { beta = x; neu(); });
        var lauf = uhr(function (dt) { t += dt; if (t > ende() + 0.6) lauf.stopp(); zeichne(); });
        r.leiste.appendChild(signal.el); r.leiste.appendChild(kamera.el); r.leiste.appendChild(tempo.el);
        r.leiste.appendChild(knopf('▶ Auslösen', function () { neu(); lauf.start(); }));
        // Geschwindigkeiten im gewählten System: Wagen vw, Signal nach hinten sh, nach vorn sv
        function lage() {
            var v = beta * cs;
            if (kam === 'Z') return { vw: 0, sh: -cs, sv: cs };
            if (art === 'ball') return { vw: v, sh: v - cs, sv: v + cs };
            return { vw: v, sh: -cs, sv: cs };
        }
        function ankunft() { var l = lage(); return { hinten: HL / (l.vw - l.sh), vorn: HL / (l.sv - l.vw) }; }
        function ende() { var a = ankunft(); return Math.max(a.hinten, a.vorn); }
        function neu() { lauf.stopp(); t = 0; zeichne(); }
        function zeichne() {
            var B = r.B, l = lage(), a = ankunft(), yB = 235;
            var mitte0 = kam === 'Z' ? 360 : 200, mitte = mitte0 + l.vw * t, vers = kam === 'Z' ? -beta * cs * t : 0;
            ctx.clearRect(0, 0, B, r.H);
            boden(ctx, B, yB + 14, vers);
            figur(ctx, 620 + vers, yB + 14, BLAU, 'Bea');
            wagen(ctx, mitte - HL, yB, 2 * HL, 130);
            figur(ctx, mitte, yB, ORANGE, 'Zoe');
            ctx.fillStyle = LICHT; ctx.fillRect(mitte - 5, yB - 128, 10, 10);
            var xh = Math.max(mitte - HL, mitte0 + l.sh * Math.min(t, a.hinten)), xv = Math.min(mitte + HL, mitte0 + l.sv * Math.min(t, a.vorn)), ys = yB - 85;
            var farbe = art === 'licht' ? LICHT : '#be123c';
            if (t > 0) {
                ctx.strokeStyle = farbe; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
                ctx.beginPath(); ctx.moveTo(mitte0, ys); ctx.lineTo(xh, ys); ctx.moveTo(mitte0, ys); ctx.lineTo(xv, ys); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(xh, ys, 7, 0, 7); ctx.arc(xv, ys, 7, 0, 7); ctx.fill();
                if (kam === 'S') { ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mitte0, yB - 140); ctx.lineTo(mitte0, yB + 14); ctx.stroke(); text(ctx, 'hier wurde ausgelöst', mitte0, yB - 146, GRAU, '11px sans-serif', 'center'); }
            }
            function tuer(x, zeit, name, aus) {
                var da = t >= zeit;
                ctx.fillStyle = da ? '#16a34a' : '#94a3b8'; ctx.fillRect(x - 4, yB - 130, 8, 130);
                text(ctx, name, x, yB - 160, DUNKEL, 'bold 12px sans-serif', aus);
                text(ctx, da ? 't = ' + fmt(zeit, 2) + ' s' : 't = …', x, yB - 144, da ? '#166534' : GRAU, 'bold 12px sans-serif', aus);
            }
            tuer(mitte - HL, a.hinten, 'Tür hinten', 'center'); tuer(mitte + HL, a.vorn, 'Tür vorn', 'center');
            text(ctx, kam === 'S' ? 'Uhren des Bahnsteig-Systems S' : 'Uhren des Zug-Systems S′', 12, 20, kam === 'S' ? BLAU : ORANGE, 'bold 14px sans-serif');
            text(ctx, 't = ' + fmt(Math.min(t, ende()), 2) + ' s', B - 12, 20, DUNKEL, 'bold 14px sans-serif', 'right');
            if (kam === 'S') pfeil(ctx, mitte + HL + 8, yB - 60, mitte + HL + 8 + 60 * beta, yB - 60, ORANGE);
            var gleich = Math.abs(a.hinten - a.vorn) < 1e-9;
            var fertig = t >= ende();
            r.info.innerHTML = (kam === 'S'
                ? 'Im System S: Signal nach hinten mit <span class="zahl">' + fmt(Math.abs(l.sh) / cs, 1) + '</span>, nach vorn mit <span class="zahl">' + fmt(l.sv / cs, 1) + '</span> (in Einheiten des Signaltempos), der Wagen fährt mit ' + fmt(beta, 1) + '. '
                : 'Im System S′: Der Wagen ruht, beide Signale sind gleich schnell. ') +
                (fertig ? '<strong>' + (gleich ? 'Beide Türen werden gleichzeitig erreicht.' : 'Die hintere Tür wird zuerst erreicht (' + fmt(a.hinten, 2) + ' s gegen ' + fmt(a.vorn, 2) + ' s).') + '</strong>' : '');
        }
        zeichne();
    }

    // ======================================================================
    // Station 4: Lichtuhren
    // ======================================================================
    function lichtuhr(box) {
        var r = rahmen(box, 'Zwei gleiche Lichtuhren: eine bei Bea, eine bei Zoe', 320), ctx = r.ctx;
        var kam = 'S', beta = 0.6, t = 0, cs = 260, HO = 120, T0 = 2 * HO / cs, spur = [], runde = 0;
        var kamera = umschalter('System:', [['S', 'Bahnsteig S (Bea)', 's'], ['Z', 'Zug S′ (Zoe)', 'z']], 'S', function (w) { kam = w; neu(); });
        var tempo = regler('Zug v', 0, 0.9, 0.1, 0.6, function (x) { return fmt(x, 1) + ' · c'; }, function (x) { beta = x; neu(); });
        var lauf = uhr(function (dt) { t += dt * 0.6; zeichne(); });
        var start = knopf('▶ Start', function () { if (lauf.laeuft()) { lauf.stopp(); start.textContent = '▶ Weiter'; } else { lauf.start(); start.textContent = '⏸ Pause'; } });
        r.leiste.appendChild(kamera.el); r.leiste.appendChild(tempo.el); r.leiste.appendChild(start);
        r.leiste.appendChild(knopf('↺ Zurück', neu));
        function gamma() { return 1 / Math.sqrt(1 - beta * beta); }
        function neu() { lauf.stopp(); start.textContent = '▶ Start'; t = 0; spur = []; runde = 0; zeichne(); }
        function zack(phase) { var p = phase % 1; return p < 0.5 ? p * 2 : 2 - p * 2; }     // 0 unten, 1 oben
        function eineUhr(x, yU, periode, farbe, name, mitSpur) {
            var yO = yU - HO, ph = t / periode, ticks = Math.floor(ph), ly = yU - zack(ph) * HO;
            ctx.strokeStyle = farbe; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 22, yU); ctx.lineTo(x + 22, yU); ctx.moveTo(x - 22, yO); ctx.lineTo(x + 22, yO); ctx.stroke();
            ctx.lineWidth = 1; ctx.strokeStyle = '#cbd5e1'; ctx.strokeRect(x - 26, yO - 4, 52, HO + 8);
            if (mitSpur) {
                spur.push([x, ly]);
                ctx.strokeStyle = LICHT; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath();
                spur.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]);
            }
            ctx.fillStyle = LICHT; ctx.beginPath(); ctx.arc(x, ly, 7, 0, 7); ctx.fill();
            text(ctx, name, x, yO - 28, farbe, 'bold 13px sans-serif', 'center');
            text(ctx, ticks + ' Ticks', x, yO - 12, DUNKEL, 'bold 13px sans-serif', 'center');
            return ticks;
        }
        function zeichne() {
            var B = r.B, g = gamma(), yU = 280, v = beta * cs;
            ctx.clearRect(0, 0, B, r.H);
            var weg = v * t, breite = B - 160, xBew0 = 60;
            var neueRunde = Math.floor(weg / breite);
            if (neueRunde !== runde) { runde = neueRunde; spur = []; }
            var xb = weg % breite;
            boden(ctx, B, yU + 26, kam === 'S' ? 0 : -weg);
            if (kam === 'S') {
                eineUhr(640, yU, T0, BLAU, 'Beas Uhr (ruht)', false);
                eineUhr(xBew0 + xb, yU, g * T0, ORANGE, 'Zoes Uhr (fährt)', true);
                if (beta > 0) pfeil(ctx, xBew0 + xb + 34, yU - 60, xBew0 + xb + 34 + 50 * beta, yU - 60, ORANGE);
            } else {
                eineUhr(80, yU, T0, ORANGE, 'Zoes Uhr (ruht)', false);
                eineUhr(B - 60 - xb, yU, g * T0, BLAU, 'Beas Uhr (fährt)', true);
                if (beta > 0) pfeil(ctx, B - 60 - xb - 34, yU - 60, B - 60 - xb - 34 - 50 * beta, yU - 60, BLAU);
            }
            text(ctx, kam === 'S' ? 'Gemessen im Bahnsteig-System S' : 'Gemessen im Zug-System S′', 12, 20, kam === 'S' ? BLAU : ORANGE, 'bold 14px sans-serif');
            // Messwerte: Spiegelabstand 1,5 m, also Eigen-Tick 10 ns
            // gerundetes c = 3,00 · 10⁸ m/s wie auf dem Blatt, damit der Eigen-Tick genau 10 ns beträgt
            var hM = 1.5, cR = 3e8, tick0 = 2 * hM / cR * 1e9, tick = g * tick0, lichtweg = cR * tick * 1e-9, fahrweg = beta * cR * tick * 1e-9;
            var bewegt = kam === 'S' ? 'Zoes' : 'Beas', ruht = kam === 'S' ? 'Beas' : 'Zoes';
            r.info.innerHTML = '<table><tr><th>Ein Tick (hin und zurück), Spiegelabstand 1,5 m</th><th>Lichtweg</th><th>Dauer</th></tr>' +
                '<tr><td>' + ruht + ' Uhr (ruht in diesem System)</td><td class="zahl">' + fmt(2 * hM, 2) + ' m</td><td class="zahl">' + fmt(tick0, 2) + ' ns</td></tr>' +
                '<tr><td>' + bewegt + ' Uhr (fährt mit ' + fmt(beta, 1) + ' c, legt dabei ' + fmt(fahrweg, 2) + ' m zurück)</td><td class="zahl">' + fmt(lichtweg, 2) + ' m</td><td class="zahl">' + fmt(tick, 2) + ' ns</td></tr></table>';
        }
        zeichne();
    }

    // ======================================================================
    // Station 4: γ-Explorer
    // ======================================================================
    function gammaExplorer(box) {
        var r = rahmen(box, 'γ-Explorer: Wie stark ist der Effekt?', 260), ctx = r.ctx;
        // [Name, v in m/s] oder [Name, null, 1 − β]
        var FAELLE = [['Fußgängerin 5 km/h', 5 / 3.6], ['ICE 300 km/h', 300 / 3.6], ['Verkehrsflugzeug 900 km/h', 250], ['GPS-Satellit 3,87 km/s', 3870],
            ['ISS 7,66 km/s', 7660], ['Erde um die Sonne 29,8 km/s', 29800], ['Elektron in alter Bildröhre 0,3 c', 0.3 * C], ['Myon aus der Höhenstrahlung 0,995 c', 0.995 * C], ['Proton im LHC', null, 9e-9]];
        var beta = 0.6, einsMinus = 0.4, name = '';
        var schieber = regler('v frei wählen', 0, 0.99, 0.01, 0.6, function (x) { return fmt(x, 2) + ' · c'; }, function (x) { beta = x; einsMinus = 1 - x; name = ''; zeichne(); });
        var sel = h('select', { 'aria-label': 'Beispiel wählen' }, [h('option', { value: '', text: '– Beispiel aus dem Alltag wählen –' })]);
        FAELLE.forEach(function (f, i) { sel.appendChild(h('option', { value: String(i), text: f[0] })); });
        sel.addEventListener('change', function () {
            if (sel.value === '') return;
            var f = FAELLE[parseInt(sel.value, 10)];
            if (f[1] === null) { einsMinus = f[2]; beta = 1 - f[2]; } else { beta = f[1] / C; einsMinus = 1 - beta; }
            name = f[0]; zeichne();
        });
        r.leiste.appendChild(sel); r.leiste.appendChild(schieber.el);
        function werte() {
            // γ − 1 für kleine β über die Näherung β²/2 (sonst verschluckt die Gleitkommazahl den Effekt)
            var q = einsMinus * (1 + beta);                 // 1 − β², auch nahe c genau
            var g = 1 / Math.sqrt(q);
            var gm1 = beta < 1e-3 ? beta * beta / 2 + 3 * Math.pow(beta, 4) / 8 : g - 1;
            return { g: g, gm1: gm1 };
        }
        function zeichne() {
            var B = r.B, w = werte(), x0 = 60, y0 = 220, gb = 620, gh = 180, gmax = 8, i;
            ctx.clearRect(0, 0, B, r.H);
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 - gh); ctx.lineTo(x0, y0); ctx.lineTo(x0 + gb, y0); ctx.stroke();
            for (i = 1; i <= gmax; i++) { var gy = y0 - gh * (i - 0) / gmax; text(ctx, String(i), x0 - 8, gy + 4, GRAU, '11px sans-serif', 'right'); ctx.strokeStyle = '#f1f5f9'; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + gb, gy); ctx.stroke(); }
            for (i = 0; i <= 10; i += 2) text(ctx, fmt(i / 10, 1) + ' c', x0 + gb * i / 10, y0 + 16, GRAU, '11px sans-serif', 'center');
            text(ctx, 'γ', x0 - 30, y0 - gh + 6, DUNKEL, 'bold 15px sans-serif'); text(ctx, 'v', x0 + gb + 12, y0 + 4, DUNKEL, 'bold 14px sans-serif');
            ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3; ctx.beginPath();
            for (var b = 0; b <= 0.992; b += 0.004) { var G = 1 / Math.sqrt(1 - b * b), X = x0 + gb * b, Y = y0 - gh * Math.min(G, gmax) / gmax; if (b) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
            ctx.stroke();
            ctx.strokeStyle = '#be123c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + gb, y0); ctx.lineTo(x0 + gb, y0 - gh); ctx.stroke(); ctx.setLineDash([]);
            text(ctx, 'v = c', x0 + gb - 4, y0 - gh + 2, '#be123c', 'bold 12px sans-serif', 'right');
            var mx = x0 + gb * Math.min(beta, 1), my = y0 - gh * Math.min(w.g, gmax) / gmax;
            ctx.fillStyle = '#be123c'; ctx.beginPath(); ctx.arc(mx, my, 7, 0, 7); ctx.fill();
            if (w.g > gmax) text(ctx, 'γ liegt weit über dem Diagramm ↑', mx - 12, my + 22, '#be123c', 'bold 12px sans-serif', 'right');
            var proTag = w.gm1 * 86400, proJahr = w.gm1 * 365.25 * 86400;
            function dauer(s) {
                if (s < 1e-6) return sig(s * 1e9, 3) + ' ns';
                if (s < 1e-3) return sig(s * 1e6, 3) + ' µs';
                if (s < 1) return sig(s * 1e3, 3) + ' ms';
                if (s < 3600) return sig(s, 3) + ' s';
                if (s < 86400 * 2) return sig(s / 3600, 3) + ' h';
                return sig(s / 86400, 3) + ' Tage';
            }
            r.info.innerHTML = '<table><tr><td>' + (name ? '<strong>' + name + '</strong>' : 'frei gewählt') + '</td><td class="zahl">v = ' + (beta < 0.01 ? zehner(beta, 2) : einsMinus < 1e-4 ? '0,999 999 991' : fmt(beta, 3)) + ' · c</td></tr>' +
                '<tr><td>Lorentzfaktor</td><td class="zahl">γ = ' + (w.g > 100 ? sig(w.g, 3) : w.gm1 < 1e-3 ? '1 + ' + zehner(w.gm1, 1) : fmt(w.g, 3)) + '</td></tr>' +
                '<tr><td>Eine bewegte Uhr geht nach in 1 Tag um</td><td class="zahl">' + (w.g > 2 ? 'mehr als den halben Tag' : dauer(proTag)) + '</td></tr>' +
                '<tr><td>… in 1 Jahr um</td><td class="zahl">' + (w.g > 2 ? 'mehr als das halbe Jahr' : dauer(proJahr)) + '</td></tr></table>';
        }
        zeichne();
    }

    // ======================================================================
    // Station 5: Myonen
    // ======================================================================
    function myonen(box) {
        var r = rahmen(box, 'Myonen-Labor: vom Berggipfel bis zum Meer', 340), ctx = r.ctx;
        var N = 563, HOEHE = 1917, BETA = 0.995, THALB = 1.523, G = 1 / Math.sqrt(1 - BETA * BETA);      // m, µs
        var modus = 'klassisch', sys = 'E', t = 0, teilchen = [], dauerAnim = 5, zaehler = 0;
        var wahlM = umschalter('Rechnung:', [['klassisch', 'ohne Relativität'], ['rel', 'mit Relativität']], 'klassisch', function (w) { modus = w; sysWahl.el.style.visibility = w === 'rel' ? 'visible' : 'hidden'; neu(); });
        var sysWahl = umschalter('System:', [['E', 'Erde S (Bea)', 's'], ['M', 'Myon S′ (Zoe)', 'z']], 'E', function (w) { sys = w; neu(); });
        sysWahl.el.style.visibility = 'hidden';
        var lauf = uhr(function (dt) { t += dt; if (t >= dauerAnim) { t = dauerAnim; lauf.stopp(); } zeichne(); });
        r.leiste.appendChild(wahlM.el); r.leiste.appendChild(sysWahl.el);
        r.leiste.appendChild(knopf('▶ 563 Myonen starten', function () { neu(); lauf.start(); }));
        function lage() {
            // Flugzeit und Halbwertszeit im betrachteten System (µs), Strecke (m)
            var flug = HOEHE / (BETA * C) * 1e6;
            if (modus === 'klassisch') return { flug: flug, halb: THALB, strecke: HOEHE };
            if (sys === 'E') return { flug: flug, halb: THALB * G, strecke: HOEHE };
            return { flug: flug / G, halb: THALB, strecke: HOEHE / G };
        }
        function neu() {
            lauf.stopp(); t = 0; teilchen = [];
            var l = lage();
            for (var i = 0; i < N; i++) teilchen.push({ x: 0.06 + 0.88 * Math.random(), tod: -Math.log(Math.random()) * l.halb / Math.LN2 });
            zaehler = teilchen.filter(function (p) { return p.tod > l.flug; }).length;
            zeichne();
        }
        function zeichne() {
            var B = r.B, l = lage(), yO = 50, yU = 300, fx = 250, fb = 300, anteil = t / dauerAnim, zeit = anteil * l.flug;
            ctx.clearRect(0, 0, B, r.H);
            var myonSicht = modus === 'rel' && sys === 'M';
            // Skalierung: im Myon-System ist die Strecke kürzer gezeichnet
            var hoehePx = (yU - yO) * (myonSicht ? Math.max(0.12, 1 / G * 1.2) : 1);
            var oben, unten;
            if (myonSicht) { oben = 170 - hoehePx * anteil; unten = oben + hoehePx; }
            else { oben = yO; unten = yU; }
            // Berg / Strecke
            ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(40, unten); ctx.lineTo(140, oben); ctx.lineTo(240, unten); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#bae6fd'; ctx.fillRect(fx - 10, unten, fb + 20, 8);
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(140, oben); ctx.lineTo(fx + fb + 10, oben); ctx.stroke(); ctx.setLineDash([]);
            text(ctx, 'Gipfel', 140, oben - 6, DUNKEL, 'bold 12px sans-serif', 'center');
            text(ctx, 'Meereshöhe', fx + fb + 16, unten + 8, DUNKEL, 'bold 12px sans-serif');
            text(ctx, 'Strecke Gipfel–Meer in diesem System: ' + fmt(l.strecke, 0) + ' m', 12, 40, myonSicht ? ORANGE : BLAU, 'bold 13px sans-serif');
            if (myonSicht) { pfeil(ctx, 140, unten + 30, 140, unten + 8, BLAU); text(ctx, 'Berg rast auf die Myonen zu', 150, unten + 26, BLAU, '12px sans-serif'); }
            // Myonen
            var yM = myonSicht ? 170 : oben + (unten - oben) * anteil, leben = 0;
            teilchen.forEach(function (p) {
                var da = p.tod > zeit;
                if (da) leben++;
                var py = da ? yM : (myonSicht ? 170 : oben + (unten - oben) * (p.tod / l.flug));
                var px = fx + fb * p.x;
                ctx.fillStyle = da ? '#7c3aed' : 'rgba(148,163,184,.45)';
                ctx.fillRect(px - 1.5, py - 1.5 + (da ? ((p.x * 977) % 9) - 4 : 0), 3, 3);
            });
            text(ctx, modus === 'klassisch' ? 'Rechnung ohne Relativität' : (sys === 'E' ? 'Gemessen im Erd-System S' : 'Gemessen im Myon-System S′'), 12, 20, modus === 'klassisch' ? DUNKEL : (sys === 'E' ? BLAU : ORANGE), 'bold 14px sans-serif');
            text(ctx, 'Uhr dieses Systems: ' + fmt(zeit, 2) + ' µs', B - 12, 20, DUNKEL, 'bold 13px sans-serif', 'right');
            text(ctx, 'noch da: ' + leben, B - 12, 40, '#7c3aed', 'bold 14px sans-serif', 'right');
            var fertig = t >= dauerAnim;
            r.info.innerHTML = '<table><tr><td>Flugzeit in diesem System</td><td class="zahl">' + fmt(l.flug, 2) + ' µs</td><td>Halbwertszeit der Myonen in diesem System</td><td class="zahl">' + fmt(l.halb, 2) + ' µs</td></tr>' +
                '<tr><td>am Gipfel gezählt (pro Stunde)</td><td class="zahl">563</td><td>' + (fertig ? '<strong>unten angekommen (dieser Lauf)</strong>' : 'unten angekommen') + '</td><td class="zahl">' + (fertig ? zaehler : '…') + '</td></tr></table>' +
                (fertig ? '<p style="margin:.3rem 0 0">Wirklich gemessen wurden auf Meereshöhe <strong>etwa 410 pro Stunde</strong> (Frisch und Smith, 1963). Jeder Lauf würfelt neu: Der Zerfall ist Zufall, nur die Halbwertszeit liegt fest.</p>' : '');
        }
        neu();
    }

    // ======================================================================
    // Station 6: GPS-Rechner
    // ======================================================================
    function gps(box) {
        box.classList.add('sim');
        box.appendChild(h('h4', { text: 'GPS-Rechner: Prüfe deine Rechnung' }));
        function feld(titel, einheit) {
            var inp = h('input', { type: 'text', inputmode: 'decimal', size: '8', 'aria-label': titel });
            return { el: h('p', { style: 'margin:.4rem 0' }, [h('label', {}, [titel + ' ', inp, ' ' + einheit])]), wert: function () { return parseFloat(inp.value.replace(',', '.')); } };
        }
        var v = 3870, gm1 = v * v / (2 * C * C), proTag = gm1 * 86400 * 1e6, art = 45.7, netto = art - proTag, fehler = netto * 1e-6 * C / 1000;
        var a = feld('a) Die Satellitenuhr geht durch ihre Bewegung pro Tag nach um', 'µs');
        var b = feld('c) Ortsfehler nach einem Tag ohne Korrektur (mit der Gesamtabweichung aus b)', 'km');
        var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        var mehr = h('div', { cls: 'sim-info' }); mehr.hidden = true;
        var pruef = knopf('Prüfen', function () {
            var wa = a.wert(), wb = b.wert(), okA = Math.abs(wa - proTag) / proTag < 0.08, okB = Math.abs(wb - fehler) / fehler < 0.1;
            if (isNaN(wa)) { rueck.className = 'rueck neutral'; rueck.textContent = 'Trage zuerst dein Ergebnis für a) ein.'; return; }
            if (!okA) {
                rueck.className = 'rueck nein';
                rueck.textContent = wa === 0 || wa < 0.01 ? '✗ Dein Taschenrechner hat γ = 1 ausgegeben? Dann nutze die Näherung γ − 1 ≈ v²/(2c²).' : Math.abs(wa - proTag * 2) / proTag < 0.2 ? '✗ Fast: Hast du den Faktor ½ in der Näherung vergessen?' : '✗ Noch nicht. Rechne γ − 1 ≈ v²/(2c²) mit v = 3870 m/s und multipliziere mit den 86 400 Sekunden eines Tages.';
                return;
            }
            mehr.hidden = false;
            mehr.innerHTML = '<table><tr><td>γ − 1 ≈ v²/(2c²)</td><td class="zahl">' + zehner(gm1, 2) + '</td></tr>' +
                '<tr><td>Bewegung (spezielle Relativitätstheorie)</td><td class="zahl">−' + fmt(proTag, 1) + ' µs pro Tag</td></tr>' +
                '<tr><td>schwächere Schwerkraft in 20 200 km Höhe (allgemeine Relativitätstheorie)</td><td class="zahl">+' + fmt(art, 1) + ' µs pro Tag</td></tr>' +
                '<tr><td><strong>zusammen</strong></td><td class="zahl">+' + fmt(netto, 1) + ' µs pro Tag</td></tr></table>';
            if (isNaN(wb)) { rueck.className = 'rueck ok'; rueck.textContent = '✓ a) stimmt. Unten siehst du die ganze Bilanz. Rechne damit c) aus.'; return; }
            rueck.className = 'rueck ' + (okB ? 'ok' : 'nein');
            rueck.textContent = okB ? '✓ Beides richtig: Ohne Korrektur läge dein Standort nach einem Tag um rund ' + fmt(fehler, 1) + ' km daneben.' : '✓ a) stimmt. ✗ c) noch nicht: Ortsfehler = Lichtgeschwindigkeit · Zeitfehler (Zeit in Sekunden, Ergebnis in km).';
        });
        box.appendChild(a.el); box.appendChild(b.el); box.appendChild(h('div', { cls: 'knopfzeile' }, [pruef])); box.appendChild(rueck); box.appendChild(mehr);
    }

    var SIMS = { zug: zug, rennen: rennen, aether: aether, lampe: lampe, lichtuhr: lichtuhr, gamma: gammaExplorer, myonen: myonen, gps: gps };
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-sim]').forEach(function (box) {
            var f = SIMS[box.getAttribute('data-sim')];
            if (f) f(box);
        });
    });
})();
