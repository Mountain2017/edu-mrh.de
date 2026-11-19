/*
 * KI Station 9 – Bild- und Sprach-KI (braucht ki.js)
 *
 *   <div data-filter></div>          Filter-Labor (Faltung wie in einem CNN): 16×16-Bild zeichnen, 3×3-Filter wählen
 *                                    oder selbst eintragen, Ausgabe (Merkmalskarte) ansehen, Rechnung je Feld
 *   <div data-sprachmodell></div>    Mini-Sprachmodell: zählt in einem Text, welches Wort auf welche Wörter folgt
 *                                    (1 bis 3 Wörter Kontext), sagt das nächste Wort mit Wahrscheinlichkeiten voraus, Temperatur
 *   <div data-attention></div>       Aufmerksamkeit: Welche Wörter beachtet „er“? (ausgedachte Gewichte zur Veranschaulichung)
 *
 * Der Lerntext des Sprachmodells ist für diese Seite geschrieben (CC BY-NC-SA 4.0 wie die Seite). Eigener Text bleibt im Browser.
 */
(function () {
    'use strict';
    var h = KI.h, zahl = KI.zahl;

    // ---------- Filter-Labor ----------
    var N = 16;
    var FILTER = {
        senkrecht: { name: 'senkrechte Kanten', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
        waagrecht: { name: 'waagrechte Kanten', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
        weich: { name: 'Weichzeichner', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], teiler: 9 },
        ecke: { name: 'Ecke oben links', k: [[2, 2, -1], [2, -1, -1], [-1, -1, -1]] },
        eigen: { name: 'eigener Filter', k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] }
    };
    var BILDER = {
        haus: ['................', '................', '.......##.......', '......####......', '.....######.....', '....########....', '...##########...', '....########....', '....##....##....', '....##....##....', '....##....##....', '....########....', '....########....', '................', '................', '................'],
        sieben: ['................', '................', '...##########...', '...##########...', '..........###...', '.........###....', '........###.....', '.......###......', '......###.......', '......###.......', '.....###........', '.....###........', '.....###........', '................', '................', '................'],
        kreuz: ['................', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '.##############.', '.##############.', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '................', '................']
    };
    function filterLabor(box) {
        var bild = [], filter = 'senkrecht', wahl = null;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Filter-Labor: Wie ein CNN Bilder „anschaut“' }));
        var leiste = h('div', { cls: 'knopfzeile' });
        var selB = h('select', { 'aria-label': 'Bild' });
        [['haus', 'Haus'], ['sieben', 'Ziffer 7'], ['kreuz', 'Kreuz'], ['leer', 'leer (selbst zeichnen)']].forEach(function (o) { selB.appendChild(h('option', { value: o[0], text: o[1] })); });
        var selF = h('select', { 'aria-label': 'Filter' });
        Object.keys(FILTER).forEach(function (k) { selF.appendChild(h('option', { value: k, text: FILTER[k].name })); });
        leiste.appendChild(h('span', { text: 'Bild:' })); leiste.appendChild(selB); leiste.appendChild(h('span', { text: 'Filter:' })); leiste.appendChild(selF);
        box.appendChild(leiste);
        var reihe = h('div', { cls: 'filter-reihe' });
        var ein = h('canvas', { width: 256, height: 256, cls: 'filter-bild', 'aria-label': 'Eingabebild 16 mal 16, zum Zeichnen klicken' });
        var kern = h('div', { cls: 'filter-kern' });
        var aus = h('canvas', { width: 224, height: 224, cls: 'filter-bild', 'aria-label': 'Ausgabe (Merkmalskarte) 14 mal 14' });
        reihe.appendChild(h('figure', {}, [ein, h('figcaption', { text: 'Eingabe 16 × 16 (zeichnen: klicken/ziehen)' })]));
        reihe.appendChild(h('figure', {}, [kern, h('figcaption', { text: 'Filter 3 × 3 (Gewichte)' })]));
        reihe.appendChild(h('figure', {}, [aus, h('figcaption', { text: 'Ausgabe 14 × 14 (rot = stark positiv, blau = negativ)' })]));
        box.appendChild(reihe);
        var rechnung = h('div', { cls: 'anzeige', 'aria-live': 'polite', text: 'Tippe ein Feld der Ausgabe an: Dann siehst du, wie es berechnet wird.' });
        box.appendChild(rechnung);
        var felder = [];
        for (var i = 0; i < 9; i++) {
            var f = h('input', { type: 'number', step: '1', 'aria-label': 'Filtergewicht ' + (i + 1) });
            f.addEventListener('input', function () { filter = 'eigen'; selF.value = 'eigen'; FILTER.eigen.k = [0, 1, 2].map(function (r) { return [0, 1, 2].map(function (c) { return +felder[r * 3 + c].value || 0; }); }); zeichne(); });
            felder.push(f); kern.appendChild(f);
        }
        function ladeBild(name) {
            bild = [];
            for (var r = 0; r < N; r++) { var z = []; for (var c = 0; c < N; c++) z.push(name !== 'leer' && BILDER[name][r][c] === '#' ? 1 : 0); bild.push(z); }
        }
        function falte(r, c) {
            var F = FILTER[filter], s = 0;
            for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) s += F.k[i][j] * bild[r + i][c + j];
            return s / (F.teiler || 1);
        }
        function zeichne() {
            var F = FILTER[filter];
            felder.forEach(function (f, i) { if (document.activeElement !== f) f.value = F.k[Math.floor(i / 3)][i % 3]; });
            var c1 = ein.getContext('2d');
            for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { c1.fillStyle = bild[r][c] ? '#0f172a' : '#fff'; c1.fillRect(c * 16, r * 16, 16, 16); }
            c1.strokeStyle = '#e2e8f0'; for (var g = 0; g <= N; g++) { c1.beginPath(); c1.moveTo(g * 16, 0); c1.lineTo(g * 16, 256); c1.stroke(); c1.beginPath(); c1.moveTo(0, g * 16); c1.lineTo(256, g * 16); c1.stroke(); }
            var max = 0, werte = [];
            for (var r2 = 0; r2 < N - 2; r2++) { werte.push([]); for (var c2 = 0; c2 < N - 2; c2++) { var v = falte(r2, c2); werte[r2].push(v); max = Math.max(max, Math.abs(v)); } }
            var c3 = aus.getContext('2d');
            werte.forEach(function (z, r3) { z.forEach(function (v, c4) { var a = max ? v / max : 0; c3.fillStyle = a >= 0 ? 'rgba(220,38,38,' + a.toFixed(3) + ')' : 'rgba(37,99,235,' + (-a).toFixed(3) + ')'; c3.clearRect(c4 * 16, r3 * 16, 16, 16); c3.fillRect(c4 * 16, r3 * 16, 16, 16); }); });
            c3.strokeStyle = '#e2e8f0'; for (var g2 = 0; g2 <= N - 2; g2++) { c3.beginPath(); c3.moveTo(g2 * 16, 0); c3.lineTo(g2 * 16, 224); c3.stroke(); c3.beginPath(); c3.moveTo(0, g2 * 16); c3.lineTo(224, g2 * 16); c3.stroke(); }
            if (wahl) {
                c1.strokeStyle = '#d97706'; c1.lineWidth = 3; c1.strokeRect(wahl[1] * 16, wahl[0] * 16, 48, 48); c1.lineWidth = 1;
                c3.strokeStyle = '#d97706'; c3.lineWidth = 3; c3.strokeRect(wahl[1] * 16, wahl[0] * 16, 16, 16); c3.lineWidth = 1;
                var teile = [];
                for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (bild[wahl[0] + i][wahl[1] + j] && F.k[i][j]) teile.push(zahl(F.k[i][j]) + ' · 1');
                rechnung.textContent = 'Feld (Zeile ' + (wahl[0] + 1) + ', Spalte ' + (wahl[1] + 1) + '): Filter auf das 3×3-Fenster legen, Gewicht mal Pixel, alles addieren' + (F.teiler ? ', durch ' + F.teiler + ' teilen' : '') + ':\n' +
                    (teile.length ? teile.join(' + ') : 'kein schwarzes Pixel mit Gewicht ≠ 0') + ' = ' + zahl(Math.round(falte(wahl[0], wahl[1]) * 100) / 100);
            }
        }
        var malen = null;
        function pixel(e) { var r = ein.getBoundingClientRect(); return [Math.floor((e.clientY - r.top) / r.height * N), Math.floor((e.clientX - r.left) / r.width * N)]; }
        ein.addEventListener('pointerdown', function (e) { var p = pixel(e); if (p[0] < 0 || p[0] >= N) return; malen = bild[p[0]][p[1]] ? 0 : 1; bild[p[0]][p[1]] = malen; ein.setPointerCapture(e.pointerId); zeichne(); e.preventDefault(); });
        ein.addEventListener('pointermove', function (e) { if (malen === null) return; var p = pixel(e); if (p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N) { bild[p[0]][p[1]] = malen; zeichne(); } });
        ['pointerup', 'pointercancel'].forEach(function (t) { ein.addEventListener(t, function () { malen = null; }); });
        ein.style.touchAction = 'none';
        aus.addEventListener('click', function (e) { var r = aus.getBoundingClientRect(); wahl = [Math.floor((e.clientY - r.top) / r.height * (N - 2)), Math.floor((e.clientX - r.left) / r.width * (N - 2))]; zeichne(); });
        selB.addEventListener('change', function () { ladeBild(selB.value); zeichne(); });
        selF.addEventListener('change', function () { filter = selF.value; zeichne(); });
        ladeBild('haus'); zeichne();
    }

    // ---------- Mini-Sprachmodell ----------
    var LERNTEXT = 'Der kleine Pinguin wohnt am Meer. Der kleine Pinguin hat Hunger. Er geht zum Wasser und sucht einen Fisch. ' +
        'Der große Pinguin wohnt auch am Meer. Der große Pinguin hat keinen Hunger, denn er hat schon einen Fisch gefangen. ' +
        'Am Morgen ist das Wasser kalt. Am Abend ist das Wasser ruhig. Der kleine Pinguin springt ins Wasser. Das Wasser ist kalt, aber der Fisch ist schnell. ' +
        'Der kleine Pinguin schwimmt dem Fisch hinterher. Der Fisch schwimmt schneller. Der kleine Pinguin gibt nicht auf. ' +
        'Am Ende fängt der kleine Pinguin einen Fisch. Er bringt den Fisch nach Hause. Der große Pinguin sagt: Gut gemacht, kleiner Pinguin. ' +
        'Am nächsten Morgen hat der kleine Pinguin wieder Hunger. Er geht wieder zum Wasser. Das Wasser ist ruhig und der Fisch ist langsam. ' +
        'Heute fängt der kleine Pinguin zwei Fische. Einen Fisch frisst er selbst, den anderen Fisch bringt er dem großen Pinguin. ' +
        'Der große Pinguin freut sich. Er sagt: Du bist ein guter Fischer. Der kleine Pinguin ist stolz. ' +
        'Am Abend sitzen die beiden Pinguine am Meer. Das Meer ist ruhig. Die Sonne geht unter. Der kleine Pinguin ist müde und schläft ein.';
    function woerter(text) { return (text.match(/[A-Za-zÄÖÜäöüß]+|[.,:!?]/g) || []); }
    function sprachmodell(box) {
        var modell = {}, n = 2, rnd = KI.zufall(9);
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Mini-Sprachmodell: Welches Wort kommt als Nächstes?' }));
        var ta = h('textarea', { cls: 'lm-text', rows: '5', 'aria-label': 'Lerntext des Sprachmodells' });
        ta.value = LERNTEXT;
        box.appendChild(h('details', {}, [h('summary', { text: 'Lerntext ansehen oder eigenen Text einfügen (bleibt in deinem Browser)' }), ta]));
        var kR = h('select', { 'aria-label': 'Kontextlänge' });
        [[1, '1 Wort Kontext'], [2, '2 Wörter Kontext'], [3, '3 Wörter Kontext']].forEach(function (o) { kR.appendChild(h('option', { value: o[0], text: o[1] })); });
        kR.value = '2';
        var tId = 't' + Math.random().toString(36).slice(2), temp = h('input', { type: 'range', id: tId, min: '0.1', max: '2', step: '0.1', value: '1' }), tOut = h('output', { text: '1' });
        var start = h('input', { type: 'text', value: 'Der kleine', 'aria-label': 'Anfang des Textes', size: '22' });
        var bWort = h('button', { type: 'button', cls: 'knopf voll', text: '+ nächstes Wort' }), bSatz = h('button', { type: 'button', cls: 'knopf', text: '+ 20 Wörter' }), bNeu = h('button', { type: 'button', cls: 'knopf', text: 'neu lernen' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [kR, bNeu]));
        box.appendChild(h('div', { cls: 'regler' }, [h('label', { for: tId, text: 'Temperatur' }), temp, tOut]));
        box.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'Anfang:' }), start, bWort, bSatz]));
        var vert = h('div', { cls: 'lm-vert', 'aria-live': 'polite' });
        var info = h('p', { style: 'font-size:.88rem;color:var(--gray)' });
        box.appendChild(vert); box.appendChild(info);
        function lerne() {
            n = +kR.value; modell = {};
            var w = woerter(ta.value);
            for (var i = n; i < w.length; i++) {
                var k = w.slice(i - n, i).join(' ').toLowerCase();
                modell[k] = modell[k] || {};
                modell[k][w[i]] = (modell[k][w[i]] || 0) + 1;
            }
            info.textContent = 'Gelernt aus ' + w.length + ' Wörtern und Satzzeichen: ' + Object.keys(modell).length + ' verschiedene Kontexte. Ein großes Sprachmodell lernt aus Billionen Wörtern und rechnet mit einem Netz statt mit einer Zähltabelle.';
            zeige();
        }
        function verteilung() {
            var w = woerter(start.value), k = w.slice(-n).join(' ').toLowerCase(), z = modell[k];
            if (!z || w.length < n) return { k: k, liste: [] };
            var T = +temp.value, summe = 0, liste = Object.keys(z).map(function (x) { var p = Math.pow(z[x], 1 / T); summe += p; return [x, p]; });
            liste.forEach(function (e) { e[1] /= summe; });
            liste.sort(function (a, b) { return b[1] - a[1]; });
            return { k: k, liste: liste };
        }
        function zeige() {
            var v = verteilung();
            vert.textContent = '';
            if (!v.liste.length) { vert.appendChild(h('p', { text: 'Den Kontext „' + v.k + '“ gibt es im Lerntext nicht. Das Modell weiß nicht weiter (ein großes Modell würde ähnliche Wörter erkennen).' })); return; }
            vert.appendChild(h('p', { html: 'Kontext: <strong>„' + v.k + '“</strong>. Wahrscheinlichkeiten für das nächste Wort:' }));
            v.liste.slice(0, 6).forEach(function (e) {
                vert.appendChild(h('div', { cls: 'lm-balken' }, [h('span', { text: e[0] }), h('div', { style: 'width:' + Math.max(2, Math.round(e[1] * 100)) + '%' }), h('b', { text: Math.round(e[1] * 100) + ' %' })]));
            });
        }
        function weiter() {
            var v = verteilung();
            if (!v.liste.length) return false;
            var r = rnd(), s = 0, wahl = v.liste[v.liste.length - 1][0];
            for (var i = 0; i < v.liste.length; i++) { s += v.liste[i][1]; if (r < s) { wahl = v.liste[i][0]; break; } }
            start.value = (start.value + (/[.,:!?]/.test(wahl) ? '' : ' ') + wahl).trim();
            return true;
        }
        bWort.addEventListener('click', function () { weiter(); zeige(); });
        bSatz.addEventListener('click', function () { for (var i = 0; i < 20; i++) if (!weiter()) break; zeige(); });
        bNeu.addEventListener('click', lerne);
        kR.addEventListener('change', lerne);
        temp.addEventListener('input', function () { tOut.textContent = zahl(+temp.value); zeige(); });
        start.addEventListener('input', zeige);
        lerne();
    }

    // ---------- Aufmerksamkeit ----------
    var SAETZE = [
        { text: 'Der Pinguin frisst den Fisch , weil er Hunger hat .', fokus: 7, gewichte: [.05, .62, .06, .02, .12, 0, .03, 0, .06, .04, 0] },
        { text: 'Der Pinguin frisst den Fisch nicht , weil er schlecht riecht .', fokus: 8, gewichte: [.03, .14, .05, .02, .58, .04, 0, .03, 0, .05, .06, 0] },
        { text: 'Die Bank am Ufer ist nass , weil der Fluss steigt .', fokus: 1, gewichte: [.04, 0, .06, .48, .06, .12, 0, .02, .04, .14, .04, 0] },
        { text: 'Die Bank gibt mir einen Kredit für das Haus .', fokus: 1, gewichte: [.05, 0, .14, .04, .06, .5, .03, .04, .14, 0] }
    ];
    function attention(box) {
        var nr = 0;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Aufmerksamkeit: Auf welche Wörter achtet ein Wort?' }));
        var leiste = h('div', { cls: 'knopfzeile' });
        SAETZE.forEach(function (s, i) { var b = h('button', { type: 'button', cls: 'knopf', text: 'Satz ' + (i + 1) }); b.addEventListener('click', function () { nr = i; zeige(); }); leiste.appendChild(b); });
        box.appendChild(leiste);
        var satz = h('div', { cls: 'att-satz', 'aria-live': 'polite' }), erkl = h('p');
        box.appendChild(satz); box.appendChild(erkl);
        box.appendChild(h('p', { style: 'font-size:.85rem;color:var(--gray)', text: 'Die Gewichte sind ausgedacht, um die Idee zu zeigen. In einem echten Transformer werden sie für jedes Wortpaar berechnet, in vielen „Köpfen“ und Schichten gleichzeitig.' }));
        function zeige() {
            var S = SAETZE[nr], w = S.text.split(' ');
            leiste.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('aktiv', i === nr); });
            satz.textContent = '';
            w.forEach(function (wort, i) {
                var g = S.gewichte[i] || 0, el = h('span', { cls: 'att-wort' + (i === S.fokus ? ' fokus' : ''), text: wort });
                if (i !== S.fokus) { el.style.background = 'rgba(217,119,6,' + Math.min(.9, g * 1.4).toFixed(2) + ')'; el.title = 'Gewicht ' + zahl(g); if (g > .3) el.style.color = '#fff'; }
                satz.appendChild(el);
            });
            var max = 0, best = 0; S.gewichte.forEach(function (g, i) { if (g > max) { max = g; best = i; } });
            erkl.innerHTML = 'Das Wort <strong>„' + w[S.fokus] + '“</strong> verteilt seine Aufmerksamkeit (Summe 100 %) auf die anderen Wörter. Am meisten: <strong>„' + w[best] + '“</strong> mit ' + Math.round(max * 100) + ' %. So „weiß“ das Netz an dieser Stelle, was gemeint ist.';
        }
        zeige();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-filter]').forEach(filterLabor);
        document.querySelectorAll('[data-sprachmodell]').forEach(sprachmodell);
        document.querySelectorAll('[data-attention]').forEach(attention);
    });
})();
