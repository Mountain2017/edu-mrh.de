/*
 * Escape Room „Die Tiefen von Sternenstaub“ (Informatik 12, Station 2.5 Tiefensuche)
 *
 *   <div id="escape"></div>   Spielfeld (Karte der Räume, Räume, Zeit, Tipps, Urkunde)
 *   Das Finale (Raum 7) nutzt die Online-IDE in <section id="finale"> unter dem Spielfeld
 *   (Projekt-ID i12-25-tiefensuche). Bis Raum 7 erreicht ist, trägt sie die Klasse es-gesperrt.
 *
 * Räume: 1 Fackelschein (Regel, Nebel) · 2 Der rote Faden (Aufrufstapel) · 3 Der Kreisgang
 * (besucht, Baum vs. Graph) · 4 Die Steintafel (Adjazenzmatrix) · 5 Das Code-Schloss ·
 * 6 Zwei Wege (Tiefen- vs. Breitensuche) · 7 Tageslicht (Java).
 * Stand in localStorage 'tsEscape' (nur dieses Gerät). ?offen öffnet alle Räume (für Lehrkräfte).
 * Die Lösungswörter stehen nicht im Klartext im Code (nur als Zeichencodes).
 */
(function () {
    'use strict';
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var SPEICHER = 'tsEscape';
    var STRAFE = 120;          // Sekunden je Fackel-Tipp

    // ---------- Hilfen ----------
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
    function s(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }
    function knopf(text, cls, fn) {
        var b = h('button', { type: 'button', cls: 'es-knopf' + (cls ? ' ' + cls : ''), text: text });
        if (fn) b.addEventListener('click', fn);
        return b;
    }
    function wort(codes) { return String.fromCharCode.apply(null, codes); }
    function lese() { try { return JSON.parse(localStorage.getItem(SPEICHER)) || null; } catch (e) { return null; } }
    function schreibe(z) { try { localStorage.setItem(SPEICHER, JSON.stringify(z)); } catch (e) { /* privat */ } }
    function zeit(sek) { sek = Math.max(0, Math.round(sek)); var m = Math.floor(sek / 60), r = sek % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
    function meldung(box) {
        var p = h('p', { cls: 'es-meldung', 'aria-live': 'polite' });
        box.appendChild(p);
        return function (t, art) { p.textContent = t || ''; p.className = 'es-meldung' + (art ? ' ' + art : ''); };
    }

    // ---------- Graphen ----------
    function Graph(n, kanten, lage) {
        this.n = n; this.lage = lage; this.kanten = kanten;
        this.adja = [];
        for (var i = 0; i < n; i++) { this.adja.push([]); for (var j = 0; j < n; j++) this.adja[i].push(false); }
        var self = this;
        kanten.forEach(function (k) { self.adja[k[0]][k[1]] = true; self.adja[k[1]][k[0]] = true; });
    }
    Graph.prototype.nachbarn = function (k) { var a = []; for (var i = 0; i < this.n; i++) if (this.adja[k][i]) a.push(i); return a; };
    // Schritte der Tiefensuche: { art: 'betreten'|'zurueck', k, stapel }
    Graph.prototype.tiefensuche = function (start, ziel) {
        var besucht = [], stapel = [], schritte = [], self = this, fertig = false;
        (function rek(k) {
            besucht[k] = true; stapel.push(k);
            schritte.push({ art: 'betreten', k: k, stapel: stapel.slice() });
            if (k === ziel) { fertig = true; return true; }
            for (var i = 0; i < self.n; i++) {
                if (self.adja[k][i] && !besucht[i]) { if (rek(i)) return true; }
            }
            stapel.pop();
            schritte.push({ art: 'zurueck', k: k, stapel: stapel.slice() });
            return false;
        })(start);
        return schritte;
    };
    Graph.prototype.breitensuche = function (start, ziel) {
        var q = [start], gesehen = [start], reihe = [], eltern = {};
        while (q.length) {
            var k = q.shift(); reihe.push(k);
            if (k === ziel) break;
            for (var i = 0; i < this.n; i++) if (this.adja[k][i] && gesehen.indexOf(i) < 0) { gesehen.push(i); q.push(i); eltern[i] = k; }
        }
        return { reihe: reihe, eltern: eltern };
    };

    // Karte zeichnen. opt: sichtbar(k), klasse(k), text(k), unter(k), kanteSichtbar(a,b), kanteKlasse(a,b), klick(k), breite, hoehe
    function karte(svg, g, opt) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute('viewBox', '0 0 ' + (opt.breite || 600) + ' ' + (opt.hoehe || 400));
        var kanten = s('g', {}, svg), knoten = s('g', {}, svg);
        g.kanten.forEach(function (kk) {
            var a = kk[0], b = kk[1];
            if (opt.kanteSichtbar && !opt.kanteSichtbar(a, b)) return;
            var pa = g.lage[a], pb = g.lage[b];
            s('line', { x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], 'class': 'es-gang ' + (opt.kanteKlasse ? opt.kanteKlasse(a, b) || '' : '') }, kanten);
        });
        for (var k = 0; k < g.n; k++) {
            if (opt.sichtbar && !opt.sichtbar(k)) continue;
            var p = g.lage[k];
            var gr = s('g', { 'class': 'es-hoehle ' + (opt.klasse ? opt.klasse(k) || '' : '') + (opt.klick ? ' klickbar' : ''), transform: 'translate(' + p[0] + ',' + p[1] + ')' }, knoten);
            s('circle', { r: 26 }, gr);
            s('text', { y: opt.unter && opt.unter(k) ? -4 : 1, 'class': 'es-nr' }, gr, opt.text ? opt.text(k) : String(k));
            if (opt.unter && opt.unter(k)) s('text', { y: 13, 'class': 'es-unter' }, gr, opt.unter(k));
            if (opt.klick) {
                gr.setAttribute('tabindex', '0');
                gr.setAttribute('role', 'button');
                gr.setAttribute('aria-label', 'Höhle ' + k);
                (function (k) {
                    gr.addEventListener('click', function () { opt.klick(k); });
                    gr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.klick(k); } });
                })(k);
            }
        }
    }
    function neueKarte(eltern, kl) {
        var wrap = h('div', { cls: 'es-karte' + (kl ? ' ' + kl : '') });
        var svg = s('svg', { 'class': 'es-svg', role: 'img', 'aria-label': 'Höhlenkarte' });
        wrap.appendChild(svg);
        eltern.appendChild(wrap);
        return svg;
    }
    function fadenAnzeige(stapel, ziel) {
        ziel.textContent = '';
        ziel.appendChild(h('span', { cls: 'es-faden-titel', text: '🧶 Faden:' }));
        if (!stapel.length) ziel.appendChild(h('span', { cls: 'es-faden-leer', text: '(aufgewickelt)' }));
        stapel.forEach(function (k, i) {
            if (i) ziel.appendChild(h('span', { cls: 'es-faden-strich', text: '—' }));
            ziel.appendChild(h('span', { cls: 'es-faden-knoten' + (i === stapel.length - 1 ? ' oben' : ''), text: String(k) }));
        });
    }

    // =====================================================================
    //  Raum 1: Fackelschein – die Regel der Tiefensuche im Nebel
    // =====================================================================
    var G1 = new Graph(7, [[0, 1], [0, 4], [1, 2], [1, 3], [3, 5], [4, 5], [4, 6]],
        [[90, 80], [260, 70], [460, 60], [400, 200], [110, 250], [270, 320], [80, 360]]);
    var W1 = [76, 65, 84, 69, 82, 78, 69];   // Buchstaben in Besuchsreihenfolge
    function raum1(box, geloest) {
        var schritte = G1.tiefensuche(0), nr, fehler, buchstaben;
        var reihe = schritte.filter(function (x) { return x.art === 'betreten'; }).map(function (x) { return x.k; });
        var zeichen = {};
        reihe.forEach(function (k, i) { zeichen[k] = String.fromCharCode(W1[i]); });
        var regel = h('div', { cls: 'es-regel' }, [
            h('strong', { text: 'Die Regel der Höhlenforscher' }),
            h('ol', {}, [
                h('li', { text: 'Markiere jede Höhle, die du betrittst, mit Kreide.' }),
                h('li', { text: 'Gibt es einen Gang zu einer unmarkierten Höhle, nimm den zur Höhle mit der kleinsten Nummer.' }),
                h('li', { text: 'Gibt es keinen (Sackgasse), geh am Faden zurück in die Höhle, aus der du gekommen bist.' })
            ])
        ]);
        box.appendChild(regel);
        var svg = neueKarte(box);
        var faden = h('div', { cls: 'es-faden' });
        var inschrift = h('p', { cls: 'es-inschrift' });
        box.appendChild(faden); box.appendChild(inschrift);
        var msg = meldung(box);
        box.appendChild(h('div', { cls: 'es-knoepfe' }, [knopf('Von vorn', '', neu)]));
        function neu() { nr = 0; fehler = 0; buchstaben = zeichen[0]; msg(''); zeige(); }
        function zustand() {
            var besucht = {}, aktuell = null, stapel = [];
            for (var i = 0; i <= nr; i++) { var x = schritte[i]; if (x.art === 'betreten') besucht[x.k] = true; stapel = x.stapel; }
            aktuell = stapel.length ? stapel[stapel.length - 1] : 0;
            return { besucht: besucht, aktuell: aktuell, stapel: stapel };
        }
        function zeige() {
            var z = zustand();
            var sichtbar = {};
            Object.keys(z.besucht).forEach(function (k) { sichtbar[k] = true; G1.nachbarn(+k).forEach(function (n) { sichtbar[n] = true; }); });
            karte(svg, G1, {
                breite: 560, hoehe: 420,
                sichtbar: function (k) { return !!sichtbar[k]; },
                kanteSichtbar: function (a, b) { return z.besucht[a] || z.besucht[b]; },
                kanteKlasse: function (a, b) { var i = z.stapel.indexOf(a), j = z.stapel.indexOf(b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1 ? 'faden' : ''; },
                klasse: function (k) { return (k === z.aktuell ? 'hier ' : '') + (z.besucht[k] ? 'besucht' : 'nebel'); },
                unter: function (k) { return z.besucht[k] ? zeichen[k] : ''; },
                klick: fertig() ? null : klick
            });
            fadenAnzeige(z.stapel, faden);
            inschrift.innerHTML = '';
            inschrift.appendChild(h('span', { text: '🪨 Wandinschriften in Besuchsreihenfolge: ' }));
            inschrift.appendChild(h('strong', { cls: 'es-code', text: buchstaben || '…' }));
        }
        function fertig() { return nr >= schritte.length - 1; }
        function klick(k) {
            var z = zustand();
            var naechster = schritte[nr + 1];
            var ziel = naechster.art === 'betreten' ? naechster.k : naechster.stapel[naechster.stapel.length - 1];
            if (k === ziel) {
                nr++;
                if (naechster.art === 'betreten') buchstaben += zeichen[k];
                msg(naechster.art === 'betreten' ? 'Höhle ' + k + ' betreten, Kreidezeichen gesetzt.' : 'Sackgasse verlassen: zurück am Faden in Höhle ' + k + '.', 'gut');
                var danach = schritte[nr + 1];
                if (!danach || (danach.art === 'zurueck' && danach.stapel.length === 0)) {
                    nr = schritte.length - 1;
                    zeige();
                    msg('Alle Höhlen erkundet und zurück am Eingang! ' + fehler + (fehler === 1 ? ' Regelverstoß.' : ' Regelverstöße.'), 'gut');
                    geloest({ text: 'Die Inschrift lautet ' + buchstaben + '.' });
                    return;
                }
            } else {
                fehler++;
                var unbesucht = G1.nachbarn(z.aktuell).filter(function (n) { return !z.besucht[n]; });
                var t;
                if (z.besucht[k] && z.stapel.indexOf(k) < 0) t = 'In Höhle ' + k + ' ist schon ein Kreidezeichen. Dort warst du schon, und der Faden führt nicht dorthin zurück.';
                else if (!G1.adja[z.aktuell][k] && k !== z.aktuell) t = 'Von Höhle ' + z.aktuell + ' führt kein Gang zu Höhle ' + k + '.';
                else if (unbesucht.length && k !== unbesucht[0]) t = 'Es gibt einen Gang zu einer unmarkierten Höhle mit kleinerer Nummer: ' + unbesucht[0] + '.';
                else if (!unbesucht.length) t = 'Sackgasse: Von Höhle ' + z.aktuell + ' aus gibt es keine unmarkierte Höhle mehr. Zurück geht es nur am Faden: zu Höhle ' + z.stapel[z.stapel.length - 2] + '.';
                else t = 'Das verstößt gegen die Regel.';
                msg('Regelverstoß! ' + t, 'schlecht');
            }
            zeige();
        }
        neu();
    }

    // =====================================================================
    //  Raum 2: Der rote Faden – der Aufrufstapel
    // =====================================================================
    var G2 = new Graph(6, [[0, 1], [0, 4], [1, 2], [1, 3], [3, 5], [4, 5]],
        [[90, 80], [260, 70], [450, 60], [290, 210], [100, 290], [340, 330]]);
    function raum2(box, geloest) {
        var schritte = G2.tiefensuche(0), nr = 0;
        var raster = h('div', { cls: 'es-raster' });
        var links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts);
        box.appendChild(raster);
        var svg = neueKarte(links);
        var info = h('p', { cls: 'es-info' });
        links.appendChild(info);
        var code = h('pre', { cls: 'es-code-block' });
        var ZEILEN = ['tiefensuche(k):', '   markiere k                        ①', '   für jede Höhle i = 0, 1, 2, …:   ③', '      wenn Gang zu i und i unmarkiert: ④', '         tiefensuche(i)              ⑤', '   zurück (Aufruf endet)             ⑥'];
        rechts.appendChild(h('h4', { cls: 'es-klein', text: 'Die Regel als Methode' }));
        rechts.appendChild(code);
        rechts.appendChild(h('h4', { cls: 'es-klein', text: 'Aufrufstapel = Faden' }));
        var stapelBox = h('div', { cls: 'es-stapel' });
        rechts.appendChild(stapelBox);
        var zurueckK = knopf('◀', '', function () { if (nr > 0) { nr--; zeige(); } });
        zurueckK.setAttribute('aria-label', 'Schritt zurück');
        var weiterK = knopf('Schritt ▶', 'haupt', function () { if (nr < schritte.length - 1) { nr++; zeige(); } });
        box.appendChild(h('div', { cls: 'es-knoepfe' }, [zurueckK, weiterK, knopf('Von vorn', '', function () { nr = 0; zeige(); })]));
        // Schloss mit drei Fragen
        var f1 = h('input', { type: 'number', min: '0', max: '9', cls: 'es-ziffer', 'aria-label': 'Antwort 1' });
        var f2 = h('input', { type: 'number', min: '0', max: '9', cls: 'es-ziffer', 'aria-label': 'Antwort 2' });
        var f3 = h('input', { type: 'number', min: '0', max: '9', cls: 'es-ziffer', 'aria-label': 'Antwort 3' });
        box.appendChild(h('div', { cls: 'es-schloss' }, [
            h('strong', { text: '🔒 Zahlenschloss: Beobachte den Faden und beantworte die drei Fragen.' }),
            h('ol', {}, [
                h('li', {}, ['In welcher Höhle endet der erste Aufruf (erste Sackgasse)? ', f1]),
                h('li', {}, ['Wie viele Aufrufe stehen höchstens gleichzeitig auf dem Stapel? ', f2]),
                h('li', {}, ['tiefensuche(4) endet. Welcher Aufruf ist danach wieder aktiv? tiefensuche( ', f3, ' )'])
            ]),
            knopf('Schloss öffnen', 'haupt', pruefe)
        ]));
        var msg = meldung(box);
        function zeige() {
            var x = schritte[nr], besucht = {};
            for (var i = 0; i <= nr; i++) if (schritte[i].art === 'betreten') besucht[schritte[i].k] = true;
            var st = x.stapel, akt = st.length ? st[st.length - 1] : null;
            karte(svg, G2, {
                breite: 540, hoehe: 380,
                klasse: function (k) { return (k === akt ? 'hier ' : '') + (besucht[k] ? 'besucht' : ''); },
                kanteKlasse: function (a, b) { var i = st.indexOf(a), j = st.indexOf(b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1 ? 'faden' : ''; }
            });
            var zeile = x.art === 'betreten' ? 1 : 5;
            code.textContent = '';
            ZEILEN.forEach(function (z, i) { code.appendChild(h('span', { cls: i === zeile ? 'an' : '', text: z + '\n' })); });
            stapelBox.textContent = '';
            if (!st.length) stapelBox.appendChild(h('p', { cls: 'es-leer', text: 'Stapel leer: Die Suche ist fertig.' }));
            st.forEach(function (k, i) {
                var r = h('div', { cls: 'es-rahmen' + (i === st.length - 1 ? ' oben' : '') }, [h('code', { text: 'tiefensuche(' + k + ')' }), h('span', { text: i === st.length - 1 ? 'aktiv' : 'wartet' })]);
                r.style.marginLeft = (i * 0.7) + 'rem';
                stapelBox.appendChild(r);
            });
            info.textContent = x.art === 'betreten'
                ? 'Aufruf tiefensuche(' + x.k + '): Höhle ' + x.k + ' wird markiert. Der Faden wird um ein Stück länger.'
                : 'tiefensuche(' + x.k + ') findet keinen unmarkierten Nachbarn mehr und endet ⑥. Der Faden wird aufgewickelt' + (st.length ? ': weiter in tiefensuche(' + st[st.length - 1] + ').' : '. Fertig!');
            weiterK.disabled = nr >= schritte.length - 1;
            zurueckK.disabled = nr === 0;
        }
        function pruefe() {
            var a = [+f1.value, +f2.value, +f3.value];
            var richtig = [2, 5, 5];
            var ok = a.filter(function (v, i) { return v === richtig[i] && String([f1, f2, f3][i].value) !== ''; }).length;
            if (ok === 3) {
                msg('Klick! Das Schloss springt auf.', 'gut');
                geloest({ text: 'Code 255' });
            } else msg(ok + ' von 3 Rädchen greifen. Schau dir den Stapel noch einmal Schritt für Schritt an.', 'schlecht');
        }
        zeige();
    }

    // =====================================================================
    //  Raum 3: Der Kreisgang – warum Kreide nötig ist
    // =====================================================================
    var G3 = new Graph(5, [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4]],
        [[90, 90], [280, 60], [210, 230], [390, 260], [510, 140]]);
    function echoWeg(n) {
        // Echo merkt sich nur, woher er gerade kommt: kleinster Nachbar außer dem vorigen
        var weg = [0], vorher = -1, k = 0;
        for (var i = 0; i < n; i++) {
            var nb = G3.nachbarn(k).filter(function (x) { return x !== vorher; });
            var w = nb.length ? nb[0] : vorher;
            vorher = k; k = w; weg.push(k);
        }
        return weg;
    }
    function raum3(box, geloest) {
        var weg = echoWeg(30), nr = 0, timer = null, teil = 1;
        box.appendChild(h('p', { text: 'Echo, ein Geist, folgt fast derselben Regel wie du: immer zur Nachbarhöhle mit der kleinsten Nummer. Aber Echo hat keine Kreide. Er weiß nur, aus welcher Höhle er gerade kommt, und geht dort nicht sofort wieder hin.' }));
        var svg = neueKarte(box);
        var zaehler = h('p', { cls: 'es-info' });
        box.appendChild(zaehler);
        var abspielen = knopf('▶ Echo beobachten', 'haupt', function () {
            if (timer) { clearInterval(timer); timer = null; abspielen.textContent = '▶ Echo beobachten'; return; }
            abspielen.textContent = '⏸ Anhalten';
            timer = setInterval(function () { if (nr < weg.length - 1) { nr++; zeige(); } else { clearInterval(timer); timer = null; abspielen.textContent = '▶ Echo beobachten'; } }, 600);
        });
        box.appendChild(h('div', { cls: 'es-knoepfe' }, [abspielen, knopf('Von vorn', '', function () { nr = 0; zeige(); })]));
        var teile = h('div', { cls: 'es-teile' });
        box.appendChild(teile);
        var msg = meldung(box);
        function zeige() {
            var hier = weg[nr], besuche = {};
            for (var i = 0; i <= nr; i++) besuche[weg[i]] = (besuche[weg[i]] || 0) + 1;
            karte(svg, G3, {
                breite: 600, hoehe: 320,
                klasse: function (k) { return (k === hier ? 'hier geist ' : '') + (besuche[k] ? 'besucht' : ''); },
                unter: function (k) { return besuche[k] ? besuche[k] + '×' : ''; },
                kanteKlasse: function (a, b) { return nr > 0 && ((weg[nr - 1] === a && hier === b) || (weg[nr - 1] === b && hier === a)) ? 'faden' : ''; }
            });
            zaehler.textContent = 'Schritt ' + nr + ': Echo ist in Höhle ' + hier + '. Weg bisher: ' + weg.slice(0, nr + 1).join(' → ');
        }
        function frage(text, optionen, richtig, erkl, weiter) {
            var f = h('div', { cls: 'es-frage' }, [h('p', { text: text })]);
            var ok = h('div', { cls: 'es-optionen' });
            optionen.forEach(function (o, i) {
                var b = h('button', { type: 'button', text: o });
                b.addEventListener('click', function () {
                    if (richtig.indexOf(i) >= 0) {
                        b.classList.add('richtig');
                        ok.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
                        f.appendChild(h('p', { cls: 'es-erkl', text: erkl }));
                        weiter();
                    } else { b.classList.add('falsch'); b.disabled = true; msg('Nicht ganz. Beobachte Echo noch einmal.', 'schlecht'); }
                });
                ok.appendChild(b);
            });
            f.appendChild(ok);
            teile.appendChild(f);
        }
        frage('1. Echo steht in Höhle 2 und kommt aus Höhle 1. Wohin geht er als Nächstes?', ['zu Höhle 0', 'zu Höhle 1', 'zu Höhle 3'], [0],
            'Höhle 0 ist die kleinste Nummer, und aus 0 kommt er nicht gerade. Danach 1, dann 2, dann wieder 0: Echo läuft im Kreis 0 → 1 → 2 → 0 … und erreicht 3 und 4 nie.', function () {
            frage('2. Was hätte Echo gerettet? (Es gibt genau eine richtige Antwort.)', [
                'Jede betretene Höhle markieren und nur in unmarkierte Höhlen weitergehen.',
                'Immer zur Höhle mit der größten Nummer gehen.',
                'Nach 100 Schritten aufhören.',
                'Nie zweimal hintereinander denselben Gang nehmen.'], [0],
                'Genau das tun besucht[k] = true und die Bedingung !besucht[i]. In einem Graphen kann es Kreise geben. Ohne Markierung kann die Suche endlos im Kreis laufen.', function () {
                frage('3. Beim Binärbaum (Station 2.3) hat niemand Kreide gebraucht. Warum?', [
                    'Weil ein Baum weniger Knoten hat.',
                    'Weil die Verweise nur nach unten zeigen: Es gibt keine Kreise, jeden Knoten erreicht man auf genau einem Weg.',
                    'Weil Binärbäume sortiert sind.'], [1],
                    'Ein Baum ist ein Graph ohne Kreise. Die Rekursion läuft nur zu den Kindern und kommt nie zu einem Knoten zurück, den sie schon hatte.', function () {
                    frage('4. Die Tiefensuche in einem Baum: Jeder Knoten ist dran, bevor seine Kinder besucht werden. Welche Traversierung ist das?', ['Inorder', 'Preorder', 'Postorder'], [1],
                        'Preorder: erst der Knoten, dann der linke, dann der rechte Teilbaum. Der Wanderer aus 2.3 hat also schon eine Tiefensuche gemacht!', function () {
                        msg('Die Tür im Kreisgang öffnet sich.', 'gut');
                        geloest({ text: 'Losung: PREORDER' });
                    });
                });
            });
        });
        zeige();
    }

    // =====================================================================
    //  Raum 4: Die Steintafel – Adjazenzmatrix lesen
    // =====================================================================
    var G4 = new Graph(7, [[0, 4], [0, 6], [2, 4], [2, 5], [1, 4], [1, 3], [3, 6], [3, 5]],
        [[80, 190], [370, 70], [370, 330], [520, 200], [220, 70], [520, 330], [220, 320]]);
    function raum4(box, geloest) {
        var soll = G4.tiefensuche(0).filter(function (x) { return x.art === 'betreten'; }).map(function (x) { return x.k; });
        var eingabe = [], markiert = {}, aufgedeckt = false;
        box.appendChild(h('p', { text: 'Ein X in Zeile k, Spalte i heißt: Von Höhle k führt ein Gang zu Höhle i. Tippe unten die Höhlen in der Reihenfolge an, in der du sie zum ersten Mal betrittst. Die Karte daneben erscheint erst, wenn die Reihenfolge stimmt.' }));
        var raster = h('div', { cls: 'es-raster' });
        var links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts);
        box.appendChild(raster);
        var tafel = h('table', { cls: 'es-tafel' });
        links.appendChild(h('div', { cls: 'es-tafel-wrap' }, [tafel]));
        links.appendChild(h('p', { cls: 'es-fuss', text: 'Tipp: Klicke eine Zeile an, um sie hervorzuheben. Häkchen = besucht (Kreide).' }));
        var svg = neueKarte(rechts, 'verdeckt');
        var reihe = h('p', { cls: 'es-inschrift' });
        box.appendChild(reihe);
        var tasten = h('div', { cls: 'es-tasten' });
        for (var k = 0; k < G4.n; k++) {
            (function (k) { tasten.appendChild(knopf(String(k), 'taste', function () { tippe(k); })); })(k);
        }
        box.appendChild(tasten);
        box.appendChild(h('div', { cls: 'es-knoepfe' }, [knopf('⌫ Löschen', '', function () { eingabe.pop(); zeige(); }), knopf('Prüfen', 'haupt', pruefe)]));
        var msg = meldung(box);
        var zeileAn = -1;
        function baueTafel() {
            tafel.textContent = '';
            var kopf = h('tr', {}, [h('th', { text: 'adja' })]);
            for (var i = 0; i < G4.n; i++) kopf.appendChild(h('th', { text: String(i) }));
            kopf.appendChild(h('th', { text: '✓' }));
            tafel.appendChild(h('thead', {}, [kopf]));
            var tb = h('tbody');
            for (var z = 0; z < G4.n; z++) {
                (function (z) {
                    var tr = h('tr', { cls: z === zeileAn ? 'an' : '' }, [h('th', { text: String(z) })]);
                    for (var sp = 0; sp < G4.n; sp++) tr.appendChild(h('td', { cls: G4.adja[z][sp] ? 'x' : '', text: G4.adja[z][sp] ? 'X' : 'O' }));
                    var cb = h('input', { type: 'checkbox', 'aria-label': 'Höhle ' + z + ' besucht' });
                    cb.checked = !!markiert[z];
                    cb.addEventListener('click', function (e) { e.stopPropagation(); markiert[z] = cb.checked; });
                    tr.appendChild(h('td', {}, [cb]));
                    tr.addEventListener('click', function () { zeileAn = zeileAn === z ? -1 : z; baueTafel(); });
                    tb.appendChild(tr);
                })(z);
            }
            tafel.appendChild(tb);
        }
        function zeige() {
            reihe.innerHTML = '';
            reihe.appendChild(h('span', { text: 'Deine Reihenfolge: ' }));
            reihe.appendChild(h('strong', { cls: 'es-code', text: eingabe.length ? eingabe.join(' – ') : '…' }));
            karte(svg, G4, {
                breite: 600, hoehe: 400,
                klasse: function (k) { return aufgedeckt ? 'besucht' : ''; },
                unter: function (k) { return aufgedeckt ? (soll.indexOf(k) + 1) + '.' : ''; }
            });
        }
        function tippe(k) { if (eingabe.length < G4.n && !aufgedeckt) { eingabe.push(k); zeige(); } }
        function pruefe() {
            for (var i = 0; i < soll.length; i++) {
                if (eingabe[i] !== soll[i]) {
                    if (i === 0) { msg('Die Suche beginnt in Höhle 0.', 'schlecht'); return; }
                    if (eingabe[i] === undefined) { msg('Die ersten ' + i + ' Höhlen stimmen. Es fehlen noch welche.', 'schlecht'); return; }
                    msg('Die ersten ' + i + ' Höhlen stimmen, an Stelle ' + (i + 1) + ' nicht. Schau in die Zeile der Höhle, in der du gerade stehst, von links nach rechts: das erste X zu einer unbesuchten Höhle. Gibt es keins, geh zurück.', 'schlecht');
                    return;
                }
            }
            aufgedeckt = true;
            svg.parentNode.classList.remove('verdeckt');
            zeige();
            msg('Die Steintafel leuchtet auf, und die Karte erscheint!', 'gut');
            geloest({ text: 'Reihenfolge ' + soll.join(' – ') });
        }
        baueTafel();
        zeige();
    }

    // =====================================================================
    //  Raum 5: Das Code-Schloss
    // =====================================================================
    var SCHLOSS = [
        { nr: '①', vor: '   ', nach: ';', soll: 1, optionen: ['besucht[i] = true', 'besucht[aktuellerKnoten] = true', 'besucht[aktuellerKnoten] = false'] },
        { nr: '②', vor: '   if (', nach: ') {', soll: 2, optionen: ['adja[aktuellerKnoten][zielKnoten]', 'besucht[zielKnoten]', 'aktuellerKnoten == zielKnoten'] },
        { zeilen: ['      return true;', '   }'] },
        { nr: '③', vor: '   ', nach: ' {', soll: 0, optionen: ['for (int i = 0; i < anzKnoten; i++)', 'for (int i = 0; i <= anzKnoten; i++)', 'while (!warteschlange.isEmpty())'] },
        { nr: '④', vor: '      if (', nach: ') {', soll: 3, optionen: ['adja[aktuellerKnoten][i] || !besucht[i]', 'adja[i][i] && !besucht[i]', 'besucht[i]', 'adja[aktuellerKnoten][i] && !besucht[i]'] },
        { nr: '⑤', vor: '         if (', nach: ') {', soll: 1, optionen: ['tiefensucheRekursiv(aktuellerKnoten, zielKnoten, besucht)', 'tiefensucheRekursiv(i, zielKnoten, besucht)', 'tiefensucheRekursiv(i + 1, zielKnoten, besucht)'] },
        { zeilen: ['            return true;', '         }', '      }', '   }'] },
        { nr: '⑥', vor: '   ', nach: ';', soll: 2, optionen: ['return true', 'warteschlange.poll()', 'return false'] }
    ];
    function raum5(box, geloest) {
        var versuche = 0;
        box.appendChild(h('p', { text: 'Vor dem letzten Gang hängt ein Schloss mit sechs Zahnrädern. Auf ihnen steht der Code der Methode, die dich rausbringt. Stelle jedes Rad richtig ein. Die Nummern ①–⑥ sind dieselben wie im Java-Projekt und auf dem Blatt.' }));
        var pre = h('div', { cls: 'es-schlosscode' });
        pre.appendChild(h('div', { cls: 'es-cz', text: 'boolean tiefensucheRekursiv(int aktuellerKnoten, int zielKnoten, boolean[] besucht) {' }));
        var selects = [];
        SCHLOSS.forEach(function (z) {
            if (z.zeilen) { z.zeilen.forEach(function (t) { pre.appendChild(h('div', { cls: 'es-cz', text: t })); }); return; }
            var sel = h('select', { 'aria-label': 'Zahnrad ' + z.nr });
            sel.appendChild(h('option', { value: '', text: '– wählen –' }));
            z.optionen.forEach(function (o, i) { sel.appendChild(h('option', { value: String(i), text: o })); });
            selects.push({ sel: sel, z: z });
            pre.appendChild(h('div', { cls: 'es-cz' }, [h('span', { text: z.vor }), sel, h('span', { text: z.nach + '   // ' + z.nr })]));
        });
        pre.appendChild(h('div', { cls: 'es-cz', text: '}' }));
        box.appendChild(h('div', { cls: 'es-schlosscode-wrap' }, [pre]));
        box.appendChild(h('div', { cls: 'es-knoepfe' }, [knopf('Schloss drehen', 'haupt', pruefe)]));
        var msg = meldung(box);
        function pruefe() {
            versuche++;
            var ok = 0;
            selects.forEach(function (x) {
                var r = x.sel.value !== '' && +x.sel.value === x.z.soll;
                if (r) ok++;
                x.sel.classList.remove('falsch', 'richtig');
                if (versuche >= 3) x.sel.classList.add(r ? 'richtig' : 'falsch');
            });
            if (ok === selects.length) {
                selects.forEach(function (x) { x.sel.disabled = true; x.sel.classList.add('richtig'); });
                msg('Alle sechs Zahnräder greifen ineinander. Das Schloss fällt herunter!', 'gut');
                geloest({ text: 'Code-Schloss offen' });
            } else {
                msg(ok + ' von ' + selects.length + ' Zahnrädern greifen.' + (versuche >= 3 ? ' Rot markierte Räder stehen noch falsch.' : ' Nach dem dritten Versuch zeigt das Schloss, welche Räder klemmen.'), 'schlecht');
            }
        }
    }

    // =====================================================================
    //  Raum 6: Zwei Wege – Tiefensuche gegen Breitensuche
    // =====================================================================
    var G6 = new Graph(8, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 7], [0, 5], [5, 6], [6, 7], [1, 6]],
        [[70, 200], [190, 90], [320, 50], [450, 70], [550, 150], [180, 320], [340, 230], [550, 310]]);
    function raum6(box, geloest) {
        var tiefe = G6.tiefensuche(0, 7).filter(function (x) { return x.art === 'betreten'; }).map(function (x) { return x.k; });
        var tiefeWeg = G6.tiefensuche(0, 7).slice(-1)[0].stapel;
        var bs = G6.breitensuche(0, 7);
        var breiteWeg = [7]; while (breiteWeg[0] !== 0) breiteWeg.unshift(bs.eltern[breiteWeg[0]]);
        var phase = 'tiefe', eingabe = [], fehler = 0;
        box.appendChild(h('p', { text: 'Zwei Forschende suchen von Höhle 0 aus den Ausgang (Höhle 7). Tilda macht Tiefensuche wie du. Bruno macht Breitensuche wie in Klasse 11: Er nimmt die nächste Höhle aus seiner Warteschlange und stellt ihre unbesuchten Nachbarn hinten an (kleinste Nummer zuerst). Klicke für beide die Höhlen in Besuchsreihenfolge an, bis Höhle 7 erreicht ist.' }));
        var auftrag = h('p', { cls: 'es-auftrag' });
        box.appendChild(auftrag);
        var svg = neueKarte(box);
        var reihe = h('p', { cls: 'es-inschrift' });
        box.appendChild(reihe);
        var fragen = h('div', { cls: 'es-teile' });
        box.appendChild(fragen);
        var msg = meldung(box);
        function zeige() {
            auftrag.innerHTML = phase === 'tiefe' ? '<strong>🕯️ Tilda (Tiefensuche):</strong> In welcher Reihenfolge betritt sie die Höhlen?'
                : phase === 'breite' ? '<strong>🌊 Bruno (Breitensuche):</strong> In welcher Reihenfolge nimmt er die Höhlen aus der Warteschlange?'
                : '<strong>Beide sind am Ausgang.</strong> Gelb: Tildas Weg (Faden). Blau: Brunos Weg.';
            karte(svg, G6, {
                breite: 620, hoehe: 380,
                klasse: function (k) { return (eingabe.indexOf(k) >= 0 ? 'besucht ' : '') + (k === 7 ? 'ausgang' : ''); },
                unter: function (k) { return k === 7 ? 'Ausgang' : ''; },
                kanteKlasse: function (a, b) {
                    if (phase !== 'fertig') return '';
                    function auf(w) { for (var i = 0; i < w.length - 1; i++) if ((w[i] === a && w[i + 1] === b) || (w[i] === b && w[i + 1] === a)) return true; return false; }
                    return (auf(tiefeWeg) ? 'faden ' : '') + (auf(breiteWeg) ? 'welle' : '');
                },
                klick: phase === 'fertig' ? null : klick
            });
            reihe.innerHTML = '';
            reihe.appendChild(h('span', { text: (phase === 'breite' ? 'Bruno: ' : 'Tilda: ') }));
            reihe.appendChild(h('strong', { cls: 'es-code', text: eingabe.length ? eingabe.join(' – ') : '…' }));
        }
        function klick(k) {
            var soll = phase === 'tiefe' ? tiefe : bs.reihe;
            if (k === soll[eingabe.length]) {
                eingabe.push(k);
                msg('');
                if (eingabe.length === soll.length) {
                    if (phase === 'tiefe') { msg('Tilda ist am Ausgang. Jetzt Bruno!', 'gut'); phase = 'breite'; eingabe = []; }
                    else { phase = 'fertig'; eingabe = []; msg('Beide sind draußen. Vergleiche die Wege!', 'gut'); stelleFragen(); }
                }
            } else {
                fehler++;
                msg(phase === 'tiefe' ? 'Nicht ' + k + '. Tilda geht immer so tief wie möglich: von der aktuellen Höhle zur unbesuchten Nachbarhöhle mit der kleinsten Nummer.'
                    : 'Nicht ' + k + '. Bruno arbeitet seine Warteschlange von vorne ab: Erst kommen alle Nachbarn von 0 dran, dann deren Nachbarn …', 'schlecht');
            }
            zeige();
        }
        function stelleFragen() {
            var antworten = {};
            function frage(id, text, optionen, richtig) {
                var f = h('div', { cls: 'es-frage' }, [h('p', { text: text })]);
                var sel = h('select', { 'aria-label': text });
                sel.appendChild(h('option', { value: '', text: '– wählen –' }));
                optionen.forEach(function (o, i) { sel.appendChild(h('option', { value: String(i), text: o })); });
                sel.addEventListener('change', function () { antworten[id] = +sel.value === richtig && sel.value !== ''; });
                f.appendChild(sel);
                fragen.appendChild(f);
            }
            frage('a', 'Wie viele Gänge hat Tildas Weg vom Eingang zum Ausgang (gelb)?', ['3', '4', '5', '6'], 2);
            frage('b', 'Wie viele Gänge hat Brunos Weg (blau)?', ['3', '4', '5', '6'], 0);
            frage('c', 'Welche Suche findet immer einen Weg mit den wenigsten Gängen?', ['Tiefensuche', 'Breitensuche', 'beide'], 1);
            frage('d', 'Bruno merkt sich die nächsten Höhlen in einer …', ['Warteschlange (Queue)', 'Liste, sortiert', 'Stapel'], 0);
            frage('e', 'Tildas Faden ist ein Stapel. In Java entsteht er durch …', ['die Warteschlange', 'die rekursiven Aufrufe (Aufrufstapel)', 'die Adjazenzmatrix'], 1);
            fragen.appendChild(knopf('Tür öffnen', 'haupt', function () {
                var ok = ['a', 'b', 'c', 'd', 'e'].filter(function (x) { return antworten[x]; }).length;
                if (ok === 5) { msg('Die schwere Tür gleitet zur Seite. Dahinter: ein schmaler Gang nach oben …', 'gut'); geloest({ text: 'Tiefensuche 5 Gänge, Breitensuche 3 Gänge' }); }
                else msg(ok + ' von 5 Antworten stimmen.', 'schlecht');
            }));
        }
        zeige();
    }

    // =====================================================================
    //  Raum 7: Tageslicht – das Finale in Java
    // =====================================================================
    var WORT = [84, 65, 71, 69, 83, 76, 73, 67, 72, 84];
    function raum7(box, geloest) {
        box.appendChild(h('p', {}, [knopf('↓ Zum Terminal: Java-Projekt unter dem Spielfeld', 'haupt', function () {
            var f = document.getElementById('finale');
            if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })]));
        var ein = h('input', { type: 'text', cls: 'es-wort', 'aria-label': 'Lösungswort', autocomplete: 'off', placeholder: 'Lösungswort' });
        box.appendChild(h('div', { cls: 'es-schloss es-ausgang' }, [
            h('strong', { text: '🚪 Die letzte Tür: Gib das Wort ein, das dein Programm ausgibt.' }),
            h('div', { cls: 'es-knoepfe' }, [ein, knopf('Öffnen', 'haupt', pruefe)])
        ]));
        var msg = meldung(box);
        ein.addEventListener('keydown', function (e) { if (e.key === 'Enter') pruefe(); });
        function pruefe() {
            if (ein.value.trim().toUpperCase() === wort(WORT)) { msg('Licht! Du bist draußen.', 'gut'); geloest({ text: 'Lösungswort ' + wort(WORT) }); }
            else msg('Die Tür rührt sich nicht. Gibt dein Programm wirklich dieses Wort aus? Der Coach unter der IDE hilft.', 'schlecht');
        }
    }

    // =====================================================================
    //  Spielrahmen
    // =====================================================================
    var RAEUME = [
        { titel: 'Fackelschein', icon: '🔥', fn: raum1, story: 'Ein Erdrutsch hat den Eingang verschüttet. Du stehst in Höhle 0 der Höhlenwelt von Sternenstaub, die das Team gerade testet. Deine Fackel leuchtet nur bis zu den nächsten Höhlen. In jeder Höhle steht ein Buchstabe an der Wand.', auftrag: 'Erkunde alle Höhlen nach der Regel der Höhlenforscher und komm am Faden zurück zum Eingang. Klicke die Höhle an, in die du als Nächstes gehst.',
          tipps: ['Am Anfang hat Höhle 0 zwei Gänge: zu 1 und zu 4. Die kleinste unmarkierte Nummer gewinnt.', 'In einer Sackgasse ist der einzige erlaubte Zug: zurück zur Höhle, die im Faden davor steht (die vorletzte Zahl).'],
          erkenntnis: '<strong>Das war eine Tiefensuche.</strong> Du gehst immer so <em>tief</em> wie möglich in den Graphen hinein und erst in einer Sackgasse zurück zur letzten Höhle mit unbesuchten Nachbarn. Dieses Zurückgehen heißt <strong>Backtracking</strong>. Die Kreide merkt sich, wo du schon warst.',
          blatt: 'Notiere auf dem Blatt (Raum 1): die Regel in einem Satz und das Wort an der Wand.' },
        { titel: 'Der rote Faden', icon: '🧶', fn: raum2, story: 'In der nächsten Ebene hat jemand die Regel als Methode in den Fels geritzt. Daneben hängt dein Faden und ein Zahlenschloss.', auftrag: 'Gehe die Tiefensuche Schritt für Schritt durch und beobachte, wie der Faden wächst und schrumpft. Dann öffne das Zahlenschloss.',
          tipps: ['Der erste Aufruf, der endet, ist der in der ersten Sackgasse. Von Höhle 2 aus gibt es keinen unmarkierten Nachbarn.', 'Zähle die Aufrufe, wenn der Stapel am höchsten ist (bei Höhle 4). Und wenn ein Aufruf endet, ist der darunter wieder aktiv.'],
          erkenntnis: '<strong>Der Faden ist der Aufrufstapel</strong> aus Station 1.5: Weitergehen ist ein rekursiver Aufruf <code>tiefensuche(i)</code>, zurückgehen heißt, dass ein Aufruf endet (<code>return</code>). Der Aufruf, der zuletzt begonnen hat, endet als Erster.',
          blatt: 'Notiere auf dem Blatt (Raum 2), was der Faden in Java ist und was Weitergehen und Zurückgehen bedeuten.' },
        { titel: 'Der Kreisgang', icon: '👻', fn: raum3, story: 'Ein kalter Luftzug. In dieser Ebene irrt Echo umher, ein Geist ohne Kreide. Seit Jahrhunderten sucht er den Weg zu Höhle 4.', auftrag: 'Beobachte Echo und beantworte die vier Fragen der Tür.',
          tipps: ['Starte die Beobachtung und achte auf die Zähler unter den Höhlen. Welche Höhlen besucht Echo immer wieder?', 'Echo braucht ein Gedächtnis für alle Höhlen, nicht nur für die letzte. Und ein Baum hat keine Kreise.'],
          erkenntnis: '<strong>Graphen können Kreise haben.</strong> Darum braucht die Tiefensuche ein Gedächtnis: <code>boolean[] besucht</code>. Ein Baum ist ein Graph ohne Kreise. Dort ist die Tiefensuche einfach die <strong>Preorder</strong> aus Station 2.3, ganz ohne Markierung.',
          blatt: 'Notiere auf dem Blatt (Raum 3), warum besucht nötig ist und was die Tiefensuche im Baum ist.' },
        { titel: 'Die Steintafel', icon: '🪨', fn: raum4, story: 'Dunkelheit. Statt einer Karte findest du eine Steintafel voller X und O. Du erkennst sie wieder: So hat der Graph in Klasse 11 im Speicher ausgesehen.', auftrag: 'Führe die Tiefensuche ab Höhle 0 nur mit der Adjazenzmatrix aus und gib die Reihenfolge der betretenen Höhlen ein.',
          tipps: ['Zeile 0: Das erste X steht in Spalte 4. Also geht es von 0 zuerst nach 4. Hake Höhle 0 und 4 als besucht ab.', 'Zeile 4: X bei 0 (besucht), 1, 2. Weiter nach 1. In einer Sackgasse gehst du zur vorigen Höhle zurück und liest deren Zeile weiter.'],
          erkenntnis: '<strong>Die Nachbarn von Höhle k stehen in Zeile k der Adjazenzmatrix:</strong> alle i mit <code>adja[k][i] == true</code>. Die for-Schleife prüft i = 0, 1, 2, … der Reihe nach. Darum kommt die kleinste Nummer zuerst dran.',
          blatt: 'Notiere auf dem Blatt (Raum 4) die Reihenfolge und wie man in der Matrix die Nachbarn findet.' },
        { titel: 'Das Code-Schloss', icon: '⚙️', fn: raum5, story: 'Vor dir ein schweres Gitter mit sechs Zahnrädern. Wer die Methode kennt, kommt durch.', auftrag: 'Stelle die sechs Zahnräder so ein, dass die Methode tiefensucheRekursiv entsteht.',
          tipps: ['① markiert die Höhle, in der du gerade bist, ⑤ ruft die Suche für den Nachbarn i auf. Eine Warteschlange braucht die Tiefensuche nicht.', '③ läuft über alle Höhlen ohne Index-Fehler (kleiner als, nicht kleiner gleich). ④ braucht einen Gang UND eine unbesuchte Höhle. Erst nach der Schleife steht fest: Sackgasse, also return false.'],
          erkenntnis: '<strong>Das ist die Tiefensuche in Java.</strong> ① markieren, ② Ziel prüfen, ③ alle Höhlen durchgehen, ④ Nachbar und unbesucht?, ⑤ dort rekursiv weitersuchen und einen Erfolg sofort weitergeben, ⑥ Sackgasse: false. Genau diese Zeilen brauchst du gleich im Finale.',
          blatt: 'Übertrage den Code auf das Blatt (Raum 5).' },
        { titel: 'Zwei Wege', icon: '🌊', fn: raum6, story: 'Fast geschafft: Vor dem Ausgang verzweigt sich das Höhlensystem. Zwei andere Forschende sind auch hier unterwegs.', auftrag: 'Sage für Tilda (Tiefensuche) und Bruno (Breitensuche) die Besuchsreihenfolge voraus und vergleiche ihre Wege.',
          tipps: ['Tilda: 0, dann 1 (kleinste Nummer), dann immer weiter in die Tiefe. Bruno: zuerst alle Nachbarn von 0 (also 1 und 5), dann die Nachbarn von 1 …', 'Brunos Weg zum Ausgang: Von 7 aus zurück zu der Höhle, die 7 in die Warteschlange gestellt hat, und so weiter bis 0.'],
          erkenntnis: '<strong>Tiefensuche und Breitensuche</strong> finden beide jede erreichbare Höhle. Die Breitensuche (Klasse 11) arbeitet mit einer <strong>Warteschlange</strong> und findet immer einen Weg mit den wenigsten Gängen. Die Tiefensuche arbeitet mit einem <strong>Stapel</strong> (in Java: dem Aufrufstapel der Rekursion) und findet irgendeinen Weg.',
          blatt: 'Notiere auf dem Blatt (Raum 6) den Vergleich.' },
        { titel: 'Tageslicht', icon: '☀️', fn: raum7, story: 'Ein schmaler Gang führt nach oben. Hier liegt das echte Höhlensystem von Sternenstaub mit zehn Höhlen. Nur ein Programm, das die Tiefensuche beherrscht, findet den Weg von Höhle 0 zum Ausgang (Höhle 9). Die Buchstaben auf dem Weg ergeben das Wort, das die letzte Tür öffnet.', auftrag: 'Programmiere die Tiefensuche (TODO 1 bis 3) und starte das Programm.',
          tipps: ['Übertrage die Zeilen ① bis ⑥ aus dem Code-Schloss (Raum 5) in die Methode tiefensucheRekursiv. Der Coach unter der IDE zeigt, was noch fehlt.', 'Reihenfolge im Code: besucht[aktuellerKnoten] = true; dann knoten[aktuellerKnoten].betreten(); dann die Zielprüfung, dann die for-Schleife mit if und rekursivem Aufruf, zuletzt return false.'],
          erkenntnis: '<strong>Geschafft!</strong> Deine Methode durchsucht einen Graphen mit Adjazenzmatrix rekursiv in die Tiefe, markiert besuchte Knoten, geht in Sackgassen zurück und meldet einen gefundenen Weg nach oben weiter.',
          blatt: 'Notiere auf dem Blatt das Lösungswort.' }
    ];

    function spiel(box) {
        var z = lese() || { raum: 0, geloest: {}, tipps: {}, start: null, ende: null, team: '' };
        var offen = /[?&]offen\b/.test(location.search);
        var aktiv = Math.min(z.raum, RAEUME.length - 1);
        box.textContent = '';
        // Kopf: Zeit, Tipps, Karte der Räume
        var kopf = h('div', { cls: 'es-kopf' });
        var uhr = h('span', { cls: 'es-uhr', text: '⏱ 0:00' });
        var tippZahl = h('span', { cls: 'es-chip' });
        kopf.appendChild(h('div', { cls: 'es-kopf-zeile' }, [uhr, tippZahl, knopf('Neu starten', 'klein', function () {
            if (window.confirm('Escape Room auf diesem Gerät neu starten? Zeit und Fortschritt werden gelöscht. (Der Code in der IDE bleibt erhalten.)')) { schreibe(null); location.reload(); }
        })]));
        var pfad = h('ol', { cls: 'es-pfad' });
        kopf.appendChild(pfad);
        box.appendChild(kopf);
        var buehne = h('div', { cls: 'es-buehne' });
        box.appendChild(buehne);

        function speichern() { schreibe(z); }
        function tippsGesamt() { var n = 0; Object.keys(z.tipps).forEach(function (k) { n += z.tipps[k]; }); return n; }
        function sekunden() {
            if (!z.start) return 0;
            return ((z.ende || Date.now()) - z.start) / 1000 + tippsGesamt() * STRAFE;
        }
        setInterval(function () { uhr.textContent = '⏱ ' + zeit(sekunden()); }, 1000);

        function zeigePfad() {
            pfad.textContent = '';
            RAEUME.forEach(function (r, i) {
                var frei = offen || i <= z.raum;
                var li = h('li', { cls: (z.geloest[i] ? 'geloest ' : '') + (i === aktiv ? 'aktiv ' : '') + (frei ? '' : 'zu') });
                var b = h('button', { type: 'button', title: frei ? r.titel : 'noch verschlossen' }, [h('span', { cls: 'es-pfad-icon', text: frei ? r.icon : '🔒' }), h('span', { cls: 'es-pfad-name', text: (i + 1) + ' ' + r.titel })]);
                b.disabled = !frei;
                b.addEventListener('click', function () { aktiv = i; zeigeRaum(); });
                li.appendChild(b);
                pfad.appendChild(li);
            });
            var fin = document.getElementById('finale');
            if (fin) fin.classList.toggle('es-gesperrt', !(offen || z.raum >= RAEUME.length - 1));
            tippZahl.textContent = '🔦 ' + tippsGesamt() + (tippsGesamt() === 1 ? ' Tipp' : ' Tipps') + ' (je +2 min)';
        }

        function zeigeStart() {
            buehne.textContent = '';
            var name = h('input', { type: 'text', cls: 'es-wort', placeholder: 'Teamname (optional)', 'aria-label': 'Teamname', maxlength: '40' });
            buehne.appendChild(h('div', { cls: 'es-raum es-start' }, [
                h('h2', { text: '🕳️ Die Tiefen von Sternenstaub' }),
                h('p', { text: 'Sternenstaub bekommt eine Höhlenwelt, und das Server-Team testet sie von innen. Mitten im Test bebt der Boden: Der Eingang ist verschüttet. Sieben Räume liegen zwischen dir und dem Tageslicht. Jeder Raum hat ein Rätsel, und jedes Rätsel bringt dir ein Stück der Tiefensuche bei.' }),
                h('ul', {}, [
                    h('li', { text: 'Arbeitet allein oder zu zweit. Die Zeit läuft ab dem Start, jeder Fackel-Tipp kostet 2 Minuten.' }),
                    h('li', { text: 'Nach jedem Raum zeigt dir eine Erkenntnis-Karte, was du gerade gelernt hast. Halte das auf dem Blatt 2.5 fest.' }),
                    h('li', { text: 'Im letzten Raum programmierst du in Java. Dein Fortschritt bleibt auf diesem Gerät gespeichert.' })
                ]),
                h('div', { cls: 'es-knoepfe' }, [name, knopf('Expedition starten', 'haupt', function () {
                    z.start = Date.now(); z.team = name.value.trim().slice(0, 40); speichern(); zeigePfad(); zeigeRaum();
                })])
            ]));
        }

        function zeigeRaum() {
            zeigePfad();
            var r = RAEUME[aktiv];
            buehne.textContent = '';
            var raum = h('section', { cls: 'es-raum', 'aria-labelledby': 'es-raum-titel' });
            raum.appendChild(h('div', { cls: 'es-raum-nr', text: 'Raum ' + (aktiv + 1) + ' von ' + RAEUME.length }));
            raum.appendChild(h('h2', { id: 'es-raum-titel', text: r.icon + ' ' + r.titel }));
            raum.appendChild(h('p', { cls: 'es-story', text: r.story }));
            raum.appendChild(h('p', { cls: 'es-auftrag' }, [h('strong', { text: 'Auftrag: ' }), r.auftrag]));
            var feld = h('div', { cls: 'es-feld' });
            raum.appendChild(feld);
            // Tipps
            var tippBox = h('div', { cls: 'es-tipps' });
            var genutzt = z.tipps[aktiv] || 0;
            function baueTipps() {
                tippBox.textContent = '';
                for (var i = 0; i < genutzt; i++) tippBox.appendChild(h('p', { cls: 'es-tipp', text: '🔦 ' + r.tipps[i] }));
                if (genutzt < r.tipps.length && !z.geloest[aktiv]) {
                    tippBox.appendChild(knopf('🔦 Fackel-Tipp ' + (genutzt + 1) + ' (+2 min)', 'klein', function () {
                        genutzt++; z.tipps[aktiv] = genutzt; speichern(); baueTipps(); zeigePfad();
                    }));
                }
            }
            baueTipps();
            raum.appendChild(tippBox);
            var erkenntnis = h('div', { cls: 'es-erkenntnis', hidden: '' });
            raum.appendChild(erkenntnis);
            buehne.appendChild(raum);
            function erkenntnisZeigen(info) {
                erkenntnis.hidden = false;
                erkenntnis.innerHTML = '';
                erkenntnis.appendChild(h('div', { cls: 'es-erk-titel', text: '💡 Erkenntnis' + (info && info.text ? ' · ' + info.text : '') }));
                erkenntnis.appendChild(h('p', { html: r.erkenntnis }));
                erkenntnis.appendChild(h('p', { cls: 'es-blatt', text: '📝 ' + r.blatt }));
                if (aktiv < RAEUME.length - 1) {
                    erkenntnis.appendChild(knopf('Weiter in Raum ' + (aktiv + 2) + ' →', 'haupt', function () { aktiv++; zeigeRaum(); window.scrollTo({ top: box.offsetTop - 70, behavior: 'smooth' }); }));
                } else {
                    erkenntnis.appendChild(urkunde());
                }
            }
            r.fn(feld, function (info) {
                if (!z.geloest[aktiv]) {
                    z.geloest[aktiv] = info && info.text ? info.text : true;
                    z.raum = Math.max(z.raum, aktiv + 1);
                    if (aktiv === RAEUME.length - 1 && !z.ende) z.ende = Date.now();
                    speichern();
                    zeigePfad();
                    baueTipps();
                }
                erkenntnisZeigen(info);
            });
            if (z.geloest[aktiv]) erkenntnisZeigen({ text: typeof z.geloest[aktiv] === 'string' ? z.geloest[aktiv] : '' });
        }

        function urkunde() {
            var t = tippsGesamt();
            var u = h('div', { cls: 'es-urkunde' }, [
                h('div', { cls: 'es-urk-titel', text: '☀️ Entkommen!' }),
                h('p', { text: (z.team ? 'Team „' + z.team + '“ hat' : 'Du hast') + ' die Tiefen von Sternenstaub verlassen.' }),
                h('p', { cls: 'es-urk-zeit', text: 'Zeit: ' + zeit(sekunden()) + ' (davon ' + t + (t === 1 ? ' Tipp' : ' Tipps') + ' = ' + (t * 2) + ' min Aufschlag)' }),
                h('p', { text: 'Gelernt: Tiefensuche von Hand · Aufrufstapel · besucht-Feld · Adjazenzmatrix · Tiefensuche in Java · Vergleich mit der Breitensuche' })
            ]);
            u.appendChild(knopf('🖨 Urkunde drucken', 'klein', function () { window.print(); }));
            return u;
        }

        zeigePfad();
        if (!z.start && !offen) zeigeStart();
        else { if (!z.start) { z.start = Date.now(); } zeigeRaum(); }
    }

    function start() {
        var box = document.getElementById('escape');
        if (box) spiel(box);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
