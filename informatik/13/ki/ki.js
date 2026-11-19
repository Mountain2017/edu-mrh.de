/*
 * Künstliche Intelligenz (Informatik 13) – gemeinsame Bausteine aller Stationsseiten
 * Thematische Werkzeuge stehen in lernarten.js, cluster.js, perzeptron.js, netz.js, architekturen.js, ethik.js, wissen.js.
 *
 *   <ul class="quiz" data-quiz="a:Text A|b:Text B">     Auswahl-Quiz: je <li data-loesung="a">…<span class="erkl-text">…</span></li>
 *                                                       (eigene Optionen je Frage: <li data-wahl="x:X|y:Y">)
 *   <div data-sortieren><ol><li>…</li></ol></div>       Reihenfolge anklicken (Liste in richtiger Reihenfolge)
 *   <div class="lw" data-loesungsweg="Titel">           Tipps stufenweise: <template data-stufe="Tipp 1">…</template>,
 *                                                       zuletzt <template data-stufe="Lösung" data-halten> (1,5 s gedrückt halten)
 *   <div class="vorhersage" data-vorhersage="id" data-wahl="a:Text|b:Text"><h4>Frage</h4></div>
 *   <div data-nach="id">…</div>                         gesperrt, bis die Vorhersage „id“ abgegeben ist (?offen hebt alle Sperren auf)
 *   <div data-niveau-wahl></div>                        Umschalter gA/eA (localStorage 'kiNiveau', ?niveau=ea|ga);
 *                                                       setzt body.niveau-ga / body.niveau-ea (CSS: .nur-ea, .nur-ga, .nur-ea-karte)
 *
 * JavaScript-Schnittstelle für die Werkzeug-Dateien: window.KI
 *   KI.h(tag, attrs, kinder), KI.mischen(a, rnd), KI.zufall(seed) → Funktion [0, 1)
 *   KI.farbe.art(code), KI.farbe.cluster(i), KI.farbe.klasse(k)
 *   new KI.Punktwelt(element, {x: [min, max], y: [min, max], xName, yName, breite, hoehe, raster})
 *       .leeren() .region(fn(x, y) → Farbe|null, schritte) .punkt(x, y, {farbe, r, form, rand, text})
 *       .linie(x1, y1, x2, y2, {farbe, breite, strich}) .gerade(w1, w2, b, opt)  (w1·x + w2·y + b = 0)
 *       .pfeil(x1, y1, x2, y2, opt) .text(x, y, s, opt) .beiKlick(fn(x, y, ereignis)) .beiZiehen(start, zug, ende)
 *       .info(text)
 *   KI.speicher.lies(schluessel, standard) / .schreib(schluessel, wert)   (localStorage, Fehler werden geschluckt)
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

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
    function zufall(seed) {
        var a = (seed >>> 0) || 1;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function mischen(a, rnd) {
        rnd = rnd || Math.random;
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function optionen(s) {
        return String(s || '').split('|').map(function (p) {
            var k = p.indexOf(':');
            return k < 0 ? [p.trim(), p.trim()] : [p.slice(0, k).trim(), p.slice(k + 1).trim()];
        }).filter(function (o) { return o[0]; });
    }
    var speicher = {
        lies: function (k, std) { try { var v = localStorage.getItem(k); return v === null ? std : JSON.parse(v); } catch (e) { return std; } },
        schreib: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat/gesperrt */ } }
    };
    var CLUSTER = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
    var farbe = {
        art: function (a) { return { Adelie: '#ea580c', Zuegel: '#9333ea', Esels: '#0e7490' }[a] || '#64748b'; },
        artName: function (a) { return { Adelie: 'Adéliepinguin', Zuegel: 'Zügelpinguin', Esels: 'Eselspinguin' }[a] || a; },
        cluster: function (i) { return i < 0 ? '#94a3b8' : CLUSTER[i % CLUSTER.length]; },
        klasse: function (k) { return k ? '#dc2626' : '#2563eb'; },
        alpha: function (hex, a) {
            var n = parseInt(hex.slice(1), 16);
            return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
        }
    };

    // ---------- Punktwelt: Streudiagramm auf einem Canvas ----------
    function Punktwelt(el, opt) {
        opt = opt || {};
        this.el = el;
        this.xb = opt.x || [0, 1];
        this.yb = opt.y || [0, 1];
        this.xName = opt.xName || '';
        this.yName = opt.yName || '';
        this.B = opt.breite || 480;
        this.H = opt.hoehe || 400;
        this.rand = { l: opt.yName ? 54 : 30, r: 14, o: 14, u: opt.xName ? 46 : 26 };
        this.raster = opt.raster !== false;
        el.classList.add('pw');
        this.canvas = h('canvas', { width: this.B, height: this.H, role: 'img', 'aria-label': opt.label || 'Streudiagramm' });
        el.appendChild(this.canvas);
        this.infoZeile = h('div', { cls: 'pw-info', 'aria-live': 'polite' });
        if (opt.info !== false) el.appendChild(this.infoZeile);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.B * dpr; this.canvas.height = this.H * dpr;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        this.leeren();
    }
    Punktwelt.prototype.px = function (x) { return this.rand.l + (x - this.xb[0]) / (this.xb[1] - this.xb[0]) * (this.B - this.rand.l - this.rand.r); };
    Punktwelt.prototype.py = function (y) { return this.H - this.rand.u - (y - this.yb[0]) / (this.yb[1] - this.yb[0]) * (this.H - this.rand.o - this.rand.u); };
    Punktwelt.prototype.wx = function (px) { return this.xb[0] + (px - this.rand.l) / (this.B - this.rand.l - this.rand.r) * (this.xb[1] - this.xb[0]); };
    Punktwelt.prototype.wy = function (py) { return this.yb[0] + (this.H - this.rand.u - py) / (this.H - this.rand.o - this.rand.u) * (this.yb[1] - this.yb[0]); };
    function schoeneSchritte(a, b) {
        var spanne = b - a, roh = spanne / 5, p = Math.pow(10, Math.floor(Math.log10(roh))), m = roh / p;
        var s = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
        var out = [];
        for (var v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) out.push(Math.round(v * 1e6) / 1e6);
        return out;
    }
    Punktwelt.prototype.leeren = function () {
        var c = this.ctx, self = this;
        c.clearRect(0, 0, this.B, this.H);
        c.fillStyle = '#fff'; c.fillRect(0, 0, this.B, this.H);
        c.font = '12px system-ui, sans-serif';
        c.strokeStyle = '#e2e8f0'; c.fillStyle = '#64748b'; c.lineWidth = 1;
        var xs = schoeneSchritte(this.xb[0], this.xb[1]), ys = schoeneSchritte(this.yb[0], this.yb[1]);
        xs.forEach(function (v) {
            var x = self.px(v);
            if (self.raster) { c.beginPath(); c.moveTo(x, self.rand.o); c.lineTo(x, self.H - self.rand.u); c.stroke(); }
            c.textAlign = 'center'; c.fillText(String(v).replace('.', ','), x, self.H - self.rand.u + 15);
        });
        ys.forEach(function (v) {
            var y = self.py(v);
            if (self.raster) { c.beginPath(); c.moveTo(self.rand.l, y); c.lineTo(self.B - self.rand.r, y); c.stroke(); }
            c.textAlign = 'right'; c.fillText(String(v).replace('.', ','), self.rand.l - 5, y + 4);
        });
        c.strokeStyle = '#475569'; c.lineWidth = 1.5;
        c.strokeRect(this.rand.l, this.rand.o, this.B - this.rand.l - this.rand.r, this.H - this.rand.o - this.rand.u);
        c.fillStyle = '#334155'; c.font = '600 13px system-ui, sans-serif';
        if (this.xName) { c.textAlign = 'center'; c.fillText(this.xName, (this.rand.l + this.B - this.rand.r) / 2, this.H - 8); }
        if (this.yName) {
            c.save(); c.translate(14, (this.rand.o + this.H - this.rand.u) / 2); c.rotate(-Math.PI / 2);
            c.textAlign = 'center'; c.fillText(this.yName, 0, 0); c.restore();
        }
        return this;
    };
    Punktwelt.prototype.region = function (fn, schritte) {
        // fn(x, y) → CSS-Farbe oder null; färbt den Hintergrund in schritte × schritte Kacheln
        schritte = schritte || 60;
        var c = this.ctx, x0 = this.rand.l, y0 = this.rand.o, w = this.B - this.rand.l - this.rand.r, hh = this.H - this.rand.o - this.rand.u;
        var dx = w / schritte, dy = hh / schritte;
        for (var i = 0; i < schritte; i++) for (var j = 0; j < schritte; j++) {
            var f = fn(this.wx(x0 + (i + .5) * dx), this.wy(y0 + (j + .5) * dy));
            if (f) { c.fillStyle = f; c.fillRect(x0 + i * dx, y0 + j * dy, dx + .6, dy + .6); }
        }
        c.strokeStyle = '#475569'; c.lineWidth = 1.5; c.strokeRect(x0, y0, w, hh);
        return this;
    };
    Punktwelt.prototype.punkt = function (x, y, o) {
        o = o || {};
        var c = this.ctx, X = this.px(x), Y = this.py(y), r = o.r || 4.5;
        c.beginPath();
        if (o.form === 'quadrat') c.rect(X - r, Y - r, 2 * r, 2 * r);
        else if (o.form === 'dreieck') { c.moveTo(X, Y - r * 1.25); c.lineTo(X + r * 1.15, Y + r * .85); c.lineTo(X - r * 1.15, Y + r * .85); c.closePath(); }
        else if (o.form === 'kreuz') { c.moveTo(X - r, Y - r); c.lineTo(X + r, Y + r); c.moveTo(X + r, Y - r); c.lineTo(X - r, Y + r); }
        else if (o.form === 'stern') {
            for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r * 1.2; c[i ? 'lineTo' : 'moveTo'](X + rr * Math.cos(a), Y + rr * Math.sin(a)); }
            c.closePath();
        } else c.arc(X, Y, r, 0, 2 * Math.PI);
        if (o.form === 'kreuz') { c.strokeStyle = o.farbe || '#334155'; c.lineWidth = o.breite || 2.5; c.stroke(); }
        else {
            if (o.hohl) { c.fillStyle = '#fff'; c.fill(); }
            else { c.fillStyle = o.farbe || '#334155'; c.fill(); }
            c.strokeStyle = o.rand || (o.hohl ? o.farbe : 'rgba(255,255,255,.85)'); c.lineWidth = o.randBreite || (o.hohl ? 2.2 : 1); c.stroke();
        }
        if (o.text) { c.fillStyle = o.textFarbe || '#0f172a'; c.font = '700 12px system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(o.text, X + r + 3, Y - r - 1); }
        return this;
    };
    Punktwelt.prototype.linie = function (x1, y1, x2, y2, o) {
        o = o || {};
        var c = this.ctx;
        c.save();
        c.beginPath(); c.rect(this.rand.l, this.rand.o, this.B - this.rand.l - this.rand.r, this.H - this.rand.o - this.rand.u); c.clip();
        c.beginPath(); c.moveTo(this.px(x1), this.py(y1)); c.lineTo(this.px(x2), this.py(y2));
        c.strokeStyle = o.farbe || '#0f172a'; c.lineWidth = o.breite || 2; c.setLineDash(o.strich || []); c.stroke();
        c.restore();
        return this;
    };
    Punktwelt.prototype.gerade = function (w1, w2, b, o) {
        // Punkte mit w1·x + w2·y + b = 0
        var x0 = this.xb[0], x1 = this.xb[1], y0 = this.yb[0], y1 = this.yb[1];
        if (Math.abs(w2) > 1e-9 && Math.abs(w2) >= Math.abs(w1) * (y1 - y0) / (x1 - x0) * 0.01) {
            var mx = x0 - (x1 - x0), Mx = x1 + (x1 - x0);
            return this.linie(mx, -(w1 * mx + b) / w2, Mx, -(w1 * Mx + b) / w2, o);
        }
        if (Math.abs(w1) > 1e-9) { var x = -b / w1; return this.linie(x, y0 - (y1 - y0), x, y1 + (y1 - y0), o); }
        return this;
    };
    Punktwelt.prototype.pfeil = function (x1, y1, x2, y2, o) {
        o = o || {};
        var c = this.ctx, X1 = this.px(x1), Y1 = this.py(y1), X2 = this.px(x2), Y2 = this.py(y2), a = Math.atan2(Y2 - Y1, X2 - X1), s = o.spitze || 10;
        c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X2, Y2);
        c.strokeStyle = o.farbe || '#0f172a'; c.lineWidth = o.breite || 2.5; c.setLineDash(o.strich || []); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(X2, Y2); c.lineTo(X2 - s * Math.cos(a - .4), Y2 - s * Math.sin(a - .4)); c.lineTo(X2 - s * Math.cos(a + .4), Y2 - s * Math.sin(a + .4)); c.closePath();
        c.fillStyle = o.farbe || '#0f172a'; c.fill();
        return this;
    };
    Punktwelt.prototype.text = function (x, y, s, o) {
        o = o || {};
        var c = this.ctx;
        c.font = (o.font || '600 13px system-ui, sans-serif'); c.fillStyle = o.farbe || '#0f172a'; c.textAlign = o.ausrichtung || 'left';
        if (o.hinterlegt) {
            var w = c.measureText(s).width, X = this.px(x), Y = this.py(y);
            var lx = o.ausrichtung === 'center' ? X - w / 2 : o.ausrichtung === 'right' ? X - w : X;
            c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(lx - 3, Y - 13, w + 6, 18); c.fillStyle = o.farbe || '#0f172a';
        }
        c.fillText(s, this.px(x), this.py(y));
        return this;
    };
    Punktwelt.prototype.info = function (t) { this.infoZeile.textContent = t || ''; return this; };
    Punktwelt.prototype.weltPunkt = function (e) {
        var r = this.canvas.getBoundingClientRect();
        var px = (e.clientX - r.left) * this.B / r.width, py = (e.clientY - r.top) * this.H / r.height;
        return { x: this.wx(px), y: this.wy(py), innen: px >= this.rand.l && px <= this.B - this.rand.r && py >= this.rand.o && py <= this.H - this.rand.u };
    };
    Punktwelt.prototype.beiKlick = function (fn) {
        var self = this;
        this.el.classList.add('klickbar');
        this.canvas.addEventListener('click', function (e) { var p = self.weltPunkt(e); if (p.innen) fn(p.x, p.y, e); });
        return this;
    };
    Punktwelt.prototype.beiZiehen = function (start, zug, ende) {
        var self = this, aktiv = false;
        this.el.classList.add('klickbar');
        this.canvas.addEventListener('pointerdown', function (e) {
            var p = self.weltPunkt(e);
            if (!p.innen) return;
            aktiv = start(p.x, p.y, e) !== false;
            if (aktiv) { self.canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
        });
        this.canvas.addEventListener('pointermove', function (e) { if (aktiv) { var p = self.weltPunkt(e); zug(p.x, p.y, e); } });
        ['pointerup', 'pointercancel'].forEach(function (t) {
            self.canvas.addEventListener(t, function (e) { if (aktiv) { aktiv = false; if (ende) ende(e); } });
        });
        return this;
    };

    // ---------- Auswahl-Quiz ----------
    function quiz(liste) {
        var standard = optionen(liste.getAttribute('data-quiz'));
        var faelle = Array.prototype.slice.call(liste.children);
        var stand = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Alle zurücksetzen' });
        liste.parentNode.insertBefore(h('div', { cls: 'knopfzeile' }, [stand, neu]), liste.nextSibling);
        function zaehle() {
            var r = faelle.filter(function (li) { return li.classList.contains('richtig'); }).length;
            var b = faelle.filter(function (li) { return li.classList.contains('richtig') || li.classList.contains('falsch'); }).length;
            stand.textContent = b ? r + ' von ' + faelle.length + ' richtig' + (b < faelle.length ? ' (' + (faelle.length - b) + ' offen)' : r === faelle.length ? ' – alles richtig!' : '') : '';
        }
        faelle.forEach(function (li) {
            var loesung = li.getAttribute('data-loesung');
            var ops = li.hasAttribute('data-wahl') ? optionen(li.getAttribute('data-wahl')) : standard;
            var erklText = li.querySelector('.erkl-text');
            var inhalt = Array.prototype.slice.call(li.childNodes).filter(function (n) { return n !== erklText; });
            var fall = h('div', { cls: 'fall' });
            inhalt.forEach(function (n) { fall.appendChild(n); });
            var wahl = h('div', { cls: 'wahl', role: 'group' });
            var erkl = h('p', { cls: 'erkl', 'aria-live': 'polite' });
            erkl.hidden = true;
            ops.forEach(function (o) {
                var b = h('button', { type: 'button', 'data-w': o[0], text: o[1] });
                b.addEventListener('click', function () {
                    Array.prototype.forEach.call(wahl.children, function (x) { x.classList.toggle('gewaehlt', x === b); });
                    var ok = loesung.split(',').indexOf(o[0]) >= 0;
                    li.classList.toggle('richtig', ok);
                    li.classList.toggle('falsch', !ok);
                    erkl.hidden = false;
                    erkl.textContent = (ok ? '✓ ' : '✗ Nicht ganz. ') + (erklText ? erklText.textContent : '');
                    zaehle();
                });
                wahl.appendChild(b);
            });
            fall.appendChild(wahl);
            li.textContent = '';
            li.appendChild(fall);
            li.appendChild(erkl);
            if (erklText) { erklText.hidden = true; li.appendChild(erklText); }
        });
        neu.addEventListener('click', function () {
            faelle.forEach(function (li) {
                li.classList.remove('richtig', 'falsch');
                li.querySelectorAll('.wahl button').forEach(function (b) { b.classList.remove('gewaehlt'); });
                li.querySelector('.erkl').hidden = true;
            });
            zaehle();
        });
    }

    // ---------- Reihenfolge ----------
    function sortieren(box) {
        var ol = box.querySelector('ol');
        var schritte = Array.prototype.slice.call(ol.children).map(function (li, i) { return { nr: i, html: li.innerHTML }; });
        ol.remove();
        var quelle = h('ul', { cls: 'sort-liste' }), ziel = h('ol', { cls: 'sort-ziel', 'aria-live': 'polite' });
        var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Neu mischen' });
        var zurueck = h('button', { type: 'button', cls: 'knopf', text: 'Letzten Schritt zurück' });
        var gewaehlt = [];
        box.appendChild(h('div', { cls: 'sort-box' }, [h('div', {}, [h('strong', { text: 'Schritte (gemischt)' }), quelle]), h('div', {}, [h('strong', { text: 'Deine Reihenfolge' }), ziel])]));
        box.appendChild(h('div', { cls: 'knopfzeile' }, [zurueck, neu]));
        box.appendChild(rueck);
        function aufbauen() {
            gewaehlt = [];
            quelle.textContent = '';
            mischen(schritte).forEach(function (s) {
                var b = h('button', { type: 'button' });
                b.innerHTML = s.html;
                b.addEventListener('click', function () { gewaehlt.push({ s: s, knopf: b }); b.disabled = true; zeige(); });
                quelle.appendChild(h('li', {}, [b]));
            });
            zeige();
        }
        function zeige() {
            ziel.textContent = '';
            var fertig = gewaehlt.length === schritte.length;
            gewaehlt.forEach(function (g, i) {
                var li = h('li');
                li.innerHTML = g.s.html;
                if (fertig) li.className = g.s.nr === i ? 'ok' : 'nein';
                ziel.appendChild(li);
            });
            if (fertig) {
                var r = gewaehlt.filter(function (g, i) { return g.s.nr === i; }).length;
                rueck.className = 'rueck ' + (r === schritte.length ? 'ok' : 'nein');
                rueck.textContent = r === schritte.length ? '✓ Alles in der richtigen Reihenfolge.' : r + ' von ' + schritte.length + ' Schritten stehen an der richtigen Stelle. Nimm Schritte mit „Letzten Schritt zurück“ wieder heraus.';
            } else { rueck.className = 'rueck'; rueck.textContent = ''; }
            zurueck.disabled = !gewaehlt.length;
        }
        zurueck.addEventListener('click', function () { var g = gewaehlt.pop(); if (g) g.knopf.disabled = false; zeige(); });
        neu.addEventListener('click', aufbauen);
        aufbauen();
    }

    // ---------- Lösungsweg ----------
    var HALTEZEIT = 1500;
    function loesungsweg(box) {
        var titel = box.getAttribute('data-loesungsweg') || '';
        var stufen = Array.prototype.slice.call(box.querySelectorAll('template[data-stufe]'));
        if (!stufen.length) return;
        var kopf = h('div', { cls: 'lw-kopf', text: '💡 Hilfe' + (titel ? ': ' + titel : '') });
        var inhalt = h('div', { cls: 'lw-inhalt' });
        var knoepfe = h('div', { cls: 'lw-knoepfe' });
        box.appendChild(kopf); box.appendChild(inhalt); box.appendChild(knoepfe);
        var stand = 0;
        function zeigeStufe(i) {
            var t = stufen[i];
            var teil = h('div', { cls: 'lw-stufe' + (t.hasAttribute('data-halten') ? ' lw-loesung' : '') }, [h('div', { cls: 'lw-marke', text: t.getAttribute('data-stufe') })]);
            teil.appendChild(document.importNode(t.content, true));
            inhalt.appendChild(teil);
            stand = i + 1;
            baueKnoepfe();
        }
        function zuruecksetzen() { inhalt.textContent = ''; stand = 0; baueKnoepfe(); }
        function baueKnoepfe() {
            knoepfe.textContent = '';
            if (stand < stufen.length) {
                var t = stufen[stand], k = h('button', { type: 'button' });
                if (t.hasAttribute('data-halten')) {
                    k.className = 'lw-knopf lw-halten';
                    k.appendChild(h('span', { cls: 'lw-fortschritt' }));
                    k.appendChild(h('span', { cls: 'lw-text', text: t.getAttribute('data-stufe') + ' zeigen: gedrückt halten' }));
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
                var weg = h('button', { type: 'button', cls: 'lw-knopf lw-weg', text: 'wieder ausblenden' });
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
            clearTimeout(timer); timer = null;
            balken.style.transition = 'width .2s';
            balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    // ---------- Vorhersage vor Beobachtung ----------
    var OFFEN = /[?&]offen\b/.test(location.search);
    function vorhersage(box) {
        var id = box.getAttribute('data-vorhersage');
        var schluessel = 'kiVorhersage:' + location.pathname + ':' + id;
        var wahl = h('div', { cls: 'wahl', role: 'group' });
        var rueck = h('p', { cls: 'erkl', 'aria-live': 'polite', style: 'margin:.3rem 0 0;font-size:.92rem' });
        box.appendChild(wahl); box.appendChild(rueck);
        var gespeichert = speicher.lies(schluessel, null);
        function freigeben() {
            document.querySelectorAll('[data-nach="' + id + '"]').forEach(function (n) { n.classList.remove('gesperrt'); n.removeAttribute('aria-hidden'); });
            document.dispatchEvent(new CustomEvent('ki-freigabe', { detail: id }));
        }
        optionen(box.getAttribute('data-wahl')).forEach(function (o) {
            var b = h('button', { type: 'button', 'data-w': o[0], text: o[1] });
            if (gespeichert === o[0]) b.classList.add('gewaehlt');
            b.addEventListener('click', function () {
                Array.prototype.forEach.call(wahl.children, function (x) { x.classList.toggle('gewaehlt', x === b); });
                speicher.schreib(schluessel, o[0]);
                rueck.textContent = 'Deine Vorhersage ist notiert. Jetzt ausprobieren!';
                freigeben();
            });
            wahl.appendChild(b);
        });
        if (gespeichert !== null || OFFEN) freigeben();
    }

    // ---------- Niveau gA / eA ----------
    function niveauLesen() {
        var m = /[?&]niveau=(ea|ga)\b/.exec(location.search);
        if (m) { speicher.schreib('kiNiveau', m[1]); return m[1]; }
        return speicher.lies('kiNiveau', 'ga');
    }
    function niveauSetzen(n) {
        document.body.classList.toggle('niveau-ea', n === 'ea');
        document.body.classList.toggle('niveau-ga', n !== 'ea');
        document.querySelectorAll('[data-niveau-wahl] button').forEach(function (b) { b.classList.toggle('aktiv', b.getAttribute('data-n') === n); b.setAttribute('aria-pressed', b.getAttribute('data-n') === n); });
        document.querySelectorAll('[data-niveau-text]').forEach(function (el) {
            el.textContent = el.getAttribute(n === 'ea' ? 'data-ea' : 'data-ga') || '';
        });
    }
    function niveauWahl(box) {
        var w = h('div', { cls: 'niveau-wahl', role: 'group', 'aria-label': 'Anforderungsniveau' });
        [['ga', 'grundlegend (gA)'], ['ea', 'erhöht (eA)']].forEach(function (o) {
            var b = h('button', { type: 'button', 'data-n': o[0], text: o[1] });
            b.addEventListener('click', function () { speicher.schreib('kiNiveau', o[0]); niveauSetzen(o[0]); });
            w.appendChild(b);
        });
        box.appendChild(w);
    }

    // ---------- Datensätze (ki-daten.js) ----------
    // KI.datensatz('pinguine', ['schnabellaenge', 'schnabeltiefe']) → {punkte: [{w: [roh…], n: [normiert…], art}], merkmale, min, max}
    // KI.datensatz('xor') → Punkte mit w = n = [x, y] und klasse; 'kredit' zusätzlich gruppe
    var MERKMALE = {
        schnabellaenge: { name: 'Schnabellänge', einheit: 'mm', i: 2 },
        schnabeltiefe: { name: 'Schnabeltiefe', einheit: 'mm', i: 3 },
        flossenlaenge: { name: 'Flossenlänge', einheit: 'mm', i: 4 },
        gewicht: { name: 'Gewicht', einheit: 'g', i: 5 }
    };
    function datensatz(name, merkmale) {
        var D = window.KI_DATEN || {}, punkte;
        if (name === 'pinguine') {
            merkmale = merkmale || ['schnabellaenge', 'schnabeltiefe'];
            punkte = D.pinguine.map(function (z) { return { w: merkmale.map(function (m) { return z[MERKMALE[m].i]; }), art: z[0], insel: z[1] }; });
        } else {
            merkmale = merkmale || ['x', 'y'];
            punkte = (D[name] || []).map(function (z) { return { w: [z[0], z[1]], klasse: z[2], gruppe: z[3] }; });
        }
        var d = merkmale.length, min = [], max = [];
        for (var j = 0; j < d; j++) {
            min.push(Math.min.apply(null, punkte.map(function (p) { return p.w[j]; })));
            max.push(Math.max.apply(null, punkte.map(function (p) { return p.w[j]; })));
        }
        punkte.forEach(function (p) { p.n = p.w.map(function (v, j) { return max[j] > min[j] ? (v - min[j]) / (max[j] - min[j]) : 0; }); });
        return { name: name, punkte: punkte, merkmale: merkmale, min: min, max: max };
    }
    function merkmalName(m, mitEinheit) {
        var M = MERKMALE[m];
        return M ? M.name + (mitEinheit ? ' (' + M.einheit + ')' : '') : m;
    }
    function zahl(v, stellen) { return (stellen === undefined ? String(v) : v.toFixed(stellen)).replace('.', ','); }

    window.KI = {
        h: h, mischen: mischen, zufall: zufall, optionen: optionen, speicher: speicher, farbe: farbe,
        Punktwelt: Punktwelt, haltenAktivieren: haltenAktivieren,
        datensatz: datensatz, MERKMALE: MERKMALE, merkmalName: merkmalName, zahl: zahl
    };

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-niveau-wahl]').forEach(niveauWahl);
        niveauSetzen(niveauLesen());
        document.querySelectorAll('[data-nach]').forEach(function (n) { if (!OFFEN) { n.classList.add('gesperrt'); n.setAttribute('aria-hidden', 'true'); } });
        document.querySelectorAll('[data-vorhersage]').forEach(vorhersage);
        document.querySelectorAll('[data-quiz]').forEach(quiz);
        document.querySelectorAll('[data-sortieren]').forEach(sortieren);
        document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg);
    });
})();
