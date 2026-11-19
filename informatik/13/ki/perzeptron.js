/*
 * KI Stationen 4 bis 6 – Perzeptron, Zusammenschalten, Trainieren (braucht ki.js und ki-daten.js)
 *
 *   <div data-perzeptron [data-satz="esels-adelie|zuegel-adelie|xor|weide"] [data-start="w0,w1,w2"] [data-satzwahl]></div>
 *        Perzeptron-Labor: Regler für w0, w1, w2; Gerade w0 + w1·x1 + w2·x2 = 0 mit Gewichtsvektor;
 *        Delta-Lernregel Schritt für Schritt, je Epoche oder bis fehlerfrei (höchstens 100 Epochen)
 *   <div data-zaun [data-level="0"]></div>
 *        Zaun-Baukasten (Station 5): Grenz-Neuronen ziehen, Ausgabeneuron UND/ODER bzw. eigene Gewichte; Level
 *   <div data-training></div>
 *        Trainings-Labor (Station 6): 98 Trainings- und 42 Testpunkte (Monde), Rauschen, k-NN mit k = 1 … 25 als Modell
 *   <div data-schuld></div>
 *        Wackel-Experiment (Station 6): ein Gewicht des Dreiecksnetzes verändern, Fehlerkurve mit Stufe bzw. Sigmoid
 *
 * Schreibweise wie in Klasse 11: z = w0 · 1 + w1 · x1 + w2 · x2, Ausgabe 1, wenn z ≥ 0, sonst 0;
 * Lernregel Δwi = η · (Ziel − Ausgabe) · xi (mit x0 = 1).
 */
(function () {
    'use strict';
    var h = KI.h, zahl = KI.zahl;

    function stufe(z) { return z >= 0 ? 1 : 0; }
    function netto(w, x) { return w[0] + w[1] * x[0] + w[2] * x[1]; }
    function r2(v) { return Math.round(v * 1000) / 1000; }
    function z_(v) { return zahl(r2(v)).replace('-', '−'); }
    function term(v, x) { v = r2(v); return (v < 0 ? ' − ' : ' + ') + zahl(Math.abs(v)) + ' · ' + x; }

    var SAETZE = {
        'esels-adelie': { titel: 'Esels (1) gegen Adélie (0)', x: 'Schnabeltiefe (normiert)', y: 'Flossenlänge (normiert)', eins: 'Esels' },
        'zuegel-adelie': { titel: 'Zügel (1) gegen Adélie (0)', x: 'Schnabellänge (normiert)', y: 'Schnabeltiefe (normiert)', eins: 'Zuegel' },
        'xor': { titel: 'XOR (erfunden)', x: 'x1', y: 'x2' },
        'weide': { titel: 'Weide (Dreieck, erfunden)', x: 'x1', y: 'x2' }
    };
    function lade(name) {
        var S = SAETZE[name];
        if (name === 'esels-adelie' || name === 'zuegel-adelie') {
            var merk = name === 'esels-adelie' ? ['schnabeltiefe', 'flossenlaenge'] : ['schnabellaenge', 'schnabeltiefe'];
            var ds = KI.datensatz('pinguine', merk);
            var andere = name === 'esels-adelie' ? 'Esels' : 'Zuegel';
            return ds.punkte.filter(function (p) { return p.art === 'Adelie' || p.art === andere; })
                .map(function (p) { return { x: [r2(p.n[0]), r2(p.n[1])], ziel: p.art === S.eins ? 1 : 0, art: p.art }; });
        }
        return KI.datensatz(name).punkte.map(function (p) { return { x: p.w, ziel: p.klasse }; });
    }
    function farbe(p) { return p.art ? KI.farbe.art(p.art) : KI.farbe.klasse(p.ziel); }
    function form(p) { return p.art ? (p.art === 'Adelie' ? 'kreis' : p.art === 'Esels' ? 'quadrat' : 'dreieck') : (p.ziel ? 'quadrat' : 'kreis'); }
    function regler(name, min, max, wert, schritt) {
        var id = 'r' + Math.random().toString(36).slice(2), inp = h('input', { type: 'range', id: id, min: min, max: max, step: schritt, value: wert }), out = h('output', { text: zahl(+wert, 2) });
        return { box: h('div', { cls: 'regler' }, [h('label', { for: id, html: name }), inp, out]), inp: inp, out: out };
    }

    // ---------- Perzeptron-Labor ----------
    function labor(box) {
        var satz = box.getAttribute('data-satz') || 'esels-adelie';
        var start = (box.getAttribute('data-start') || '0,0,0').split(',').map(Number);
        var daten, welt, w = start.slice(), zeiger = 0, epochen = 0, verlauf = [];
        box.classList.add('werk');
        var titel = h('h4');
        box.appendChild(titel);
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var sel = null;
        if (box.hasAttribute('data-satzwahl')) {
            sel = h('select');
            Object.keys(SAETZE).forEach(function (k) { var o = h('option', { value: k, text: SAETZE[k].titel }); if (k === satz) o.selected = true; sel.appendChild(o); });
            rechts.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'Daten:' }), sel]));
        }
        var R = [regler('w<sub>0</sub> (Bias)', -10, 10, w[0], 0.05), regler('w<sub>1</sub>', -10, 10, w[1], 0.05), regler('w<sub>2</sub>', -10, 10, w[2], 0.05)];
        R.forEach(function (r) { rechts.appendChild(r.box); });
        var eta = h('select');
        ['0.1', '0.5', '1'].forEach(function (v) { eta.appendChild(h('option', { value: v, text: 'η = ' + v.replace('.', ',') })); });
        var bSchritt = h('button', { type: 'button', cls: 'knopf voll', text: 'Ein Lernschritt' });
        var bEpoche = h('button', { type: 'button', cls: 'knopf', text: 'Eine Epoche' });
        var bFertig = h('button', { type: 'button', cls: 'knopf', text: 'Bis fehlerfrei' });
        var bNull = h('button', { type: 'button', cls: 'knopf', text: 'Neustart' });
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [eta, bSchritt, bEpoche]));
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [bFertig, bNull]));
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var rechnung = h('div', { cls: 'anzeige', 'aria-live': 'polite', style: 'margin-top:.4rem' });
        rechts.appendChild(anzeige); rechts.appendChild(rechnung);
        var leg = h('div', { cls: 'legende' });

        function aufbauen() {
            if (sel) satz = sel.value;
            daten = lade(satz);
            titel.textContent = 'Perzeptron-Labor: ' + SAETZE[satz].titel;
            links.textContent = '';
            welt = new KI.Punktwelt(links, { x: [0, 1], y: [0, 1], xName: SAETZE[satz].x, yName: SAETZE[satz].y, breite: 480, hoehe: 440 });
            links.appendChild(leg);
            var eins = SAETZE[satz].eins;
            leg.innerHTML = eins ? '<span style="--f:' + KI.farbe.art(eins) + '">' + KI.farbe.artName(eins) + ': Ziel 1</span><span style="--f:#ea580c">Adéliepinguin: Ziel 0</span><span>schwarzer Ring = falsch eingeordnet</span>'
                : '<span class="quadrat" style="--f:#dc2626">Klasse 1</span><span style="--f:#2563eb">Klasse 0</span><span>schwarzer Ring = falsch eingeordnet</span>';
            zeiger = 0; epochen = 0; verlauf = [];
            rechnung.textContent = 'Die Lernregel korrigiert bei jedem Schritt den nächsten falsch eingeordneten Punkt.';
            zeichne();
        }
        function setzeRegler() { R.forEach(function (r, i) { r.inp.value = Math.max(-10, Math.min(10, w[i])); r.out.textContent = zahl(w[i], 2); }); }
        function fehler() { return daten.filter(function (p) { return stufe(netto(w, p.x)) !== p.ziel; }).length; }
        function zeichne(markiert) {
            welt.leeren();
            welt.region(function (x, y) { return stufe(netto(w, [x, y])) ? 'rgba(220,38,38,.10)' : 'rgba(37,99,235,.08)'; }, 40);
            daten.forEach(function (p) {
                var falsch = stufe(netto(w, p.x)) !== p.ziel;
                welt.punkt(p.x[0], p.x[1], { farbe: farbe(p), form: form(p), r: 3.6, rand: falsch ? '#0f172a' : null, randBreite: falsch ? 1.8 : 1 });
            });
            var n2 = w[1] * w[1] + w[2] * w[2];
            if (n2 > 1e-9) {
                welt.gerade(w[1], w[2], w[0], { farbe: '#0f172a', breite: 2.5 });
                var t = (w[0] + w[1] * .5 + w[2] * .5) / n2, px = .5 - t * w[1], py = .5 - t * w[2], l = Math.sqrt(n2);
                if (px > -.1 && px < 1.1 && py > -.1 && py < 1.1) {
                    welt.pfeil(px, py, px + .16 * w[1] / l, py + .16 * w[2] / l, { farbe: '#b45309', breite: 3 });
                    welt.text(px + .19 * w[1] / l, py + .19 * w[2] / l, 'w', { farbe: '#b45309', font: '700 15px system-ui, sans-serif', ausrichtung: 'center' });
                }
            }
            if (markiert) welt.punkt(markiert.x[0], markiert.x[1], { farbe: 'rgba(0,0,0,0)', r: 10, rand: '#b45309', randBreite: 3, hohl: true });
            var f = fehler();
            anzeige.textContent = 'z = ' + z_(w[0]) + term(w[1], 'x1') + term(w[2], 'x2') + '\nAusgabe 1 (rote Seite), wenn z ≥ 0\nfalsch eingeordnet: ' + f + ' von ' + daten.length +
                (epochen ? '\nEpochen: ' + epochen + ' · Fehler je Epoche: ' + verlauf.slice(-12).join(', ') : '');
        }
        function schritt(zeigen) {
            // nächsten falsch eingeordneten Punkt ab dem Zeiger suchen und korrigieren
            for (var k = 0; k < daten.length; k++) {
                var i = (zeiger + k) % daten.length, p = daten[i], o = stufe(netto(w, p.x));
                if (o !== p.ziel) {
                    var e = +eta.value, d = p.ziel - o, z = netto(w, p.x), alt = w.slice();
                    w[0] += e * d; w[1] += e * d * p.x[0]; w[2] += e * d * p.x[1];
                    zeiger = (i + 1) % daten.length;
                    if (zeigen) {
                        var ds = d > 0 ? '1' : '(−1)';
                        rechnung.textContent = 'Punkt x = (' + zahl(p.x[0]) + ' | ' + zahl(p.x[1]) + '), Ziel ' + p.ziel + '\n' +
                            'z = ' + z_(z) + ' → Ausgabe ' + o + ' → Fehler (Ziel − Ausgabe) = ' + (d > 0 ? '+1' : '−1') + '\n' +
                            'Δw0 = ' + zahl(e) + ' · ' + ds + ' · 1 = ' + z_(e * d) + '   → w0 = ' + z_(w[0]) + '\n' +
                            'Δw1 = ' + zahl(e) + ' · ' + ds + ' · ' + zahl(p.x[0]) + ' = ' + z_(e * d * p.x[0]) + '   → w1 = ' + z_(w[1]) + '\n' +
                            'Δw2 = ' + zahl(e) + ' · ' + ds + ' · ' + zahl(p.x[1]) + ' = ' + z_(e * d * p.x[1]) + '   → w2 = ' + z_(w[2]);
                        setzeRegler(); zeichne(p);
                    }
                    return true;
                }
            }
            if (zeigen) { rechnung.textContent = 'Kein Punkt ist falsch eingeordnet: Die Lernregel ändert nichts mehr.'; zeichne(); }
            return false;
        }
        function epoche() {
            // jeder Punkt einmal der Reihe nach (wie in Klasse 11)
            var f = 0, e = +eta.value;
            daten.forEach(function (p) {
                var o = stufe(netto(w, p.x));
                if (o !== p.ziel) { f++; var d = p.ziel - o; w[0] += e * d; w[1] += e * d * p.x[0]; w[2] += e * d * p.x[1]; }
            });
            epochen++; verlauf.push(f);
            return f;
        }
        bSchritt.addEventListener('click', function () { schritt(true); });
        bEpoche.addEventListener('click', function () { var f = epoche(); rechnung.textContent = 'Epoche ' + epochen + ': ' + f + ' Korrekturen.'; setzeRegler(); zeichne(); });
        bFertig.addEventListener('click', function () {
            var n = 0, f;
            do { f = epoche(); n++; } while (f > 0 && n < 100);
            rechnung.textContent = f === 0 ? 'Fehlerfrei nach ' + epochen + ' Epochen.' : 'Nach 100 weiteren Epochen immer noch ' + fehler() + ' Fehler. Die Lernregel hört nicht auf zu korrigieren: Die Daten lassen sich mit einer Geraden nicht fehlerfrei trennen.';
            setzeRegler(); zeichne();
        });
        bNull.addEventListener('click', function () { w = start.slice(); setzeRegler(); zeiger = 0; epochen = 0; verlauf = []; zeichne(); rechnung.textContent = 'Gewichte zurückgesetzt.'; });
        R.forEach(function (r, i) { r.inp.addEventListener('input', function () { w[i] = +r.inp.value; r.out.textContent = zahl(w[i], 2); zeichne(); }); });
        if (sel) sel.addEventListener('change', aufbauen);
        aufbauen();
    }

    KI.perzeptron = { stufe: stufe, netto: netto, lade: lade };

    // ---------- Zaun-Baukasten (Station 5) ----------
    function erzeugt(name) {
        var rnd = KI.zufall(name === 'streifen' ? 21 : 22), out = [];
        while (out.length < 140) {
            var x = rnd(), y = rnd(), k;
            if (name === 'streifen') { if (Math.abs(x - .35) < .03 || Math.abs(x - .65) < .03) continue; k = x > .35 && x < .65 ? 1 : 0; }
            else {
                var a = x > .12 && x < .42 && y > .55 && y < .88, b = x > .58 && x < .88 && y > .12 && y < .45;
                var nah = function (v, lo, hi) { return Math.abs(v - lo) < .025 || Math.abs(v - hi) < .025; };
                if ((nah(x, .12, .42) && y > .5 && y < .93) || (nah(y, .55, .88) && x > .07 && x < .47) || (nah(x, .58, .88) && y > .07 && y < .5) || (nah(y, .12, .45) && x > .53 && x < .93)) continue;
                k = a || b ? 1 : 0;
            }
            out.push({ x: [r2(x), r2(y)], ziel: k });
        }
        return out;
    }
    var LEVEL = [
        { name: 'streifen', titel: '1 Streifen', auftrag: 'Die roten Punkte liegen in einem senkrechten Streifen. Zäune ihn mit zwei Grenzen ein.', modus: 'und', start: 1, ziel: 1 },
        { name: 'weide', titel: '2 Weide (Dreieck)', auftrag: 'Die Schafe (rot) stehen auf einer dreieckigen Weide. Wie viele gerade Zäune brauchst du?', modus: 'und', start: 1, ziel: 1 },
        { name: 'xor', titel: '3 XOR', auftrag: 'Rot liegt links oben und rechts unten, blau in den anderen Ecken. Das kann ein Perzeptron allein nicht. Mit zwei Grenzen und UND geht es.', modus: 'und', start: 1, ziel: 1 },
        { name: 'inseln', titel: '4 Zwei Inseln', auftrag: 'Zwei getrennte Inseln. Mit UND allein geht das nicht. Bilde zwei Gruppen von Grenzen (A und B): Das Netz sagt 1, wenn alle Grenzen von A ODER alle Grenzen von B 1 sagen.', modus: 'gruppen', start: 2, ziel: 1 },
        { name: 'ring', titel: '5 Kern im Ring', auftrag: 'Ein runder Kern (rot) in einem Ring (blau). Gerade Zäune können keinen Kreis bilden. Wie nah kommst du heran, und mit wie vielen Grenzen?', modus: 'und', start: 3, ziel: .97 }
    ];
    function zaun(box) {
        var stufeNr = +(box.getAttribute('data-level') || 0), daten, welt, neuronen = [], modus = 'und', probe = null, ziehen = null;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Zaun-Baukasten: Perzeptronen zusammenschalten' }));
        var levelZeile = h('div', { cls: 'knopfzeile' });
        var levelKnoepfe = LEVEL.map(function (L, i) { var b = h('button', { type: 'button', cls: 'knopf', text: L.titel }); b.addEventListener('click', function () { starte(i); }); levelZeile.appendChild(b); return b; });
        box.appendChild(levelZeile);
        var auftrag = h('p', { cls: 'tipp', style: 'margin:.3rem 0 .6rem' });
        box.appendChild(auftrag);
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var plus = h('button', { type: 'button', cls: 'knopf', text: '+ Grenze' });
        var modusSel = h('select', { 'aria-label': 'Ausgabeneuron' });
        [['und', 'Ausgabe: UND (alle Grenzen sagen 1)'], ['oder', 'Ausgabe: ODER (mindestens eine)'], ['gruppen', 'Ausgabe: (alle von A) ODER (alle von B)']].forEach(function (o) { modusSel.appendChild(h('option', { value: o[0], text: o[1] })); });
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [plus, modusSel]));
        var liste = h('div', { cls: 'zaun-liste' });
        var stand = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        var netzBox = h('div');
        var fp = h('div', { cls: 'anzeige', 'aria-live': 'polite', text: 'Tippe einen Punkt im Diagramm an (nicht auf einen Griff): Dann siehst du die Forward Propagation für diesen Punkt.' });
        rechts.appendChild(liste); rechts.appendChild(stand); rechts.appendChild(netzBox); rechts.appendChild(fp);
        welt = new KI.Punktwelt(links, { x: [0, 1], y: [0, 1], xName: 'x1', yName: 'x2', breite: 460, hoehe: 440 });
        links.appendChild(h('div', { cls: 'legende', html: '<span class="quadrat" style="--f:#dc2626">Ziel 1 (innen)</span><span style="--f:#2563eb">Ziel 0 (außen)</span><span>Griffe ● ziehen, Pfeil = 1-Seite</span>' }));

        function gewichte(n) {
            var dx = n.q[0] - n.p[0], dy = n.q[1] - n.p[1], l = Math.hypot(dx, dy) || 1;
            var w1 = -dy / l * 10 * n.seite, w2 = dx / l * 10 * n.seite;
            return [r2(-(w1 * n.p[0] + w2 * n.p[1])), r2(w1), r2(w2)];
        }
        function gruppen() { return [0, 1].map(function (g) { return neuronen.filter(function (n) { return n.gruppe === g; }); }); }
        function vorwaerts(x) {
            var hs = neuronen.map(function (n) { var w = gewichte(n); return { z: netto(w, x), a: stufe(netto(w, x)) }; });
            var anz = hs.length, summe = hs.reduce(function (s, e) { return s + e.a; }, 0), aus, zText;
            if (!anz) return { hs: hs, aus: 0, z: -1, text: 'keine Grenze' };
            if (modus === 'und') { var z = summe - (anz - .5); aus = stufe(z); zText = 'z = ' + summe + ' − ' + zahl(anz - .5) + ' = ' + zahl(r2(z)); }
            else if (modus === 'oder') { var z2 = summe - .5; aus = stufe(z2); zText = 'z = ' + summe + ' − 0,5 = ' + zahl(z2); }
            else {
                var gs = gruppen(), teil = gs.map(function (g) {
                    if (!g.length) return 0;
                    var s = g.reduce(function (t, n) { return t + hs[neuronen.indexOf(n)].a; }, 0);
                    return stufe(s - (g.length - .5));
                });
                aus = stufe(teil[0] + teil[1] - .5);
                zText = 'UND(A) = ' + teil[0] + ', UND(B) = ' + teil[1] + ' → ODER: z = ' + (teil[0] + teil[1]) + ' − 0,5';
            }
            return { hs: hs, aus: aus, text: zText };
        }
        function starte(i) {
            stufeNr = i;
            var L = LEVEL[i];
            levelKnoepfe.forEach(function (b, j) { b.classList.toggle('aktiv', j === i); });
            auftrag.textContent = L.auftrag;
            daten = L.name === 'streifen' || L.name === 'inseln' ? erzeugt(L.name) : lade(L.name);
            modus = L.modus; modusSel.value = modus;
            neuronen = [];
            for (var k = 0; k < L.start; k++) neuronen.push({ p: [.2 + .15 * k, .15], q: [.3 + .15 * k, .85], seite: 1, gruppe: k % 2 });
            probe = null;
            aktualisiere();
        }
        function aktualisiere() {
            zeichne(); baueListe(); netzbild();
            var ok = daten.filter(function (p) { return vorwaerts(p.x).aus === p.ziel; }).length, anteil = ok / daten.length, L = LEVEL[stufeNr];
            stand.className = 'rueck ' + (anteil >= L.ziel ? 'ok' : 'neutral');
            stand.textContent = ok + ' von ' + daten.length + ' Punkten richtig (' + Math.round(100 * anteil) + ' %) mit ' + neuronen.length + ' Grenz-Neuron' + (neuronen.length === 1 ? '' : 'en') + '.' + (anteil >= L.ziel ? ' ✓ Geschafft!' + (stufeNr < LEVEL.length - 1 ? ' Weiter mit Level ' + (stufeNr + 2) + '.' : '') : '');
            if (probe) zeigeFP();
        }
        function zeichne() {
            welt.leeren();
            welt.region(function (x, y) { return vorwaerts([x, y]).aus ? 'rgba(220,38,38,.13)' : 'rgba(37,99,235,.06)'; }, 46);
            daten.forEach(function (p) { var f = vorwaerts(p.x).aus !== p.ziel; welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), form: p.ziel ? 'quadrat' : 'kreis', r: 3.4, rand: f ? '#0f172a' : null, randBreite: f ? 1.8 : 1 }); });
            neuronen.forEach(function (n, i) {
                var w = gewichte(n), f = modus === 'gruppen' ? (n.gruppe ? '#9333ea' : '#16a34a') : '#0f172a';
                welt.gerade(w[1], w[2], w[0], { farbe: f, breite: 2.2 });
                var mx = (n.p[0] + n.q[0]) / 2, my = (n.p[1] + n.q[1]) / 2, l = Math.hypot(w[1], w[2]);
                welt.pfeil(mx, my, mx + .08 * w[1] / l, my + .08 * w[2] / l, { farbe: '#b45309', breite: 2.5, spitze: 8 });
                welt.text(mx - .05 * w[1] / l, my - .05 * w[2] / l, 'h' + (i + 1), { farbe: f, font: '700 13px system-ui, sans-serif', ausrichtung: 'center', hinterlegt: true });
                [n.p, n.q].forEach(function (g) { welt.punkt(g[0], g[1], { farbe: '#fff', r: 6, rand: f, randBreite: 2.5, hohl: true }); });
            });
            if (probe) welt.punkt(probe[0], probe[1], { farbe: '#fde047', form: 'stern', r: 9, rand: '#0f172a', randBreite: 1.5 });
        }
        function baueListe() {
            liste.textContent = '';
            neuronen.forEach(function (n, i) {
                var w = gewichte(n);
                var zeile = h('div', { cls: 'zaun-zeile' }, [h('strong', { text: 'h' + (i + 1) }), h('code', { text: 'z = ' + zahl(w[0]).replace('-', '−') + term(w[1], 'x1') + term(w[2], 'x2') })]);
                var seite = h('button', { type: 'button', cls: 'mini', text: '⇄ Seite' });
                seite.addEventListener('click', function () { n.seite *= -1; aktualisiere(); });
                zeile.appendChild(seite);
                if (modus === 'gruppen') {
                    var gr = h('button', { type: 'button', cls: 'mini', text: 'Gruppe ' + (n.gruppe ? 'B' : 'A') });
                    gr.addEventListener('click', function () { n.gruppe = 1 - n.gruppe; aktualisiere(); });
                    zeile.appendChild(gr);
                }
                var weg = h('button', { type: 'button', cls: 'mini', text: '✕', 'aria-label': 'Grenze h' + (i + 1) + ' entfernen' });
                weg.addEventListener('click', function () { neuronen.splice(i, 1); aktualisiere(); });
                zeile.appendChild(weg);
                liste.appendChild(zeile);
            });
        }
        function netzbild() {
            var n = neuronen.length, H = Math.max(170, 46 * n + 40), gs = gruppen();
            var s = '<svg class="netzbild" viewBox="0 0 520 ' + H + '" role="img" aria-label="Netzdiagramm: Eingabeschicht, verdeckte Schicht mit ' + n + ' Neuronen, Ausgabe">';
            var ein = [H / 2 - 40, H / 2 + 40], ver = [], ausY = H / 2;
            for (var i = 0; i < n; i++) ver.push(n === 1 ? H / 2 : 30 + i * (H - 60) / (n - 1));
            var zwischen = modus === 'gruppen' ? [H / 2 - 45, H / 2 + 45] : [];
            ver.forEach(function (y) { ein.forEach(function (e) { s += '<line x1="62" y1="' + e + '" x2="198" y2="' + y + '" stroke="#94a3b8" stroke-width="1.5"/>'; }); });
            if (modus === 'gruppen') {
                neuronen.forEach(function (nn, i) { s += '<line x1="222" y1="' + ver[i] + '" x2="318" y2="' + zwischen[nn.gruppe] + '" stroke="' + (nn.gruppe ? '#9333ea' : '#16a34a') + '" stroke-width="1.5"/>'; });
                zwischen.forEach(function (y) { s += '<line x1="342" y1="' + y + '" x2="438" y2="' + ausY + '" stroke="#94a3b8" stroke-width="1.5"/>'; });
            } else ver.forEach(function (y) { s += '<line x1="222" y1="' + y + '" x2="438" y2="' + ausY + '" stroke="#94a3b8" stroke-width="1.5"/>'; });
            ['x1', 'x2'].forEach(function (t, i) { s += '<circle cx="50" cy="' + ein[i] + '" r="16" fill="#f1f5f9" stroke="#334155" stroke-width="2"/><text x="50" y="' + (ein[i] + 5) + '" text-anchor="middle" font-size="13">' + t + '</text>'; });
            ver.forEach(function (y, i) { var f = modus === 'gruppen' ? (neuronen[i].gruppe ? '#9333ea' : '#16a34a') : '#1d4ed8'; s += '<circle cx="210" cy="' + y + '" r="15" fill="#dbeafe" stroke="' + f + '" stroke-width="2"/><text x="210" y="' + (y + 5) + '" text-anchor="middle" font-size="12">h' + (i + 1) + '</text>'; });
            zwischen.forEach(function (y, g) { s += '<circle cx="330" cy="' + y + '" r="16" fill="#fff" stroke="' + (g ? '#9333ea' : '#16a34a') + '" stroke-width="2"/><text x="330" y="' + (y + 4) + '" text-anchor="middle" font-size="10">UND ' + (g ? 'B' : 'A') + '</text>'; });
            s += '<circle cx="450" cy="' + ausY + '" r="18" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/><text x="450" y="' + (ausY + 4) + '" text-anchor="middle" font-size="10">' + (modus === 'und' ? 'UND' : 'ODER') + '</text>';
            s += '<g font-size="11" fill="#475569" text-anchor="middle"><text x="50" y="' + (H - 6) + '">Eingabeschicht</text><text x="' + (modus === 'gruppen' ? 270 : 210) + '" y="' + (H - 6) + '">verdeckte Schicht' + (modus === 'gruppen' ? 'en' : '') + '</text><text x="455" y="' + (H - 6) + '">Ausgabeschicht</text></g></svg>';
            var w0 = modus === 'und' ? '−' + zahl(n - .5) : '−0,5';
            netzBox.innerHTML = s + '<p style="font-size:.85rem;color:var(--gray);margin:.2rem 0 .5rem">Ausgabeneuron: alle Gewichte 1, Bias w<sub>0</sub> = ' + w0 + (modus === 'gruppen' ? ' (UND je Gruppe: w0 = −(Zahl der Grenzen − 0,5), dann ODER)' : '') + '.</p>';
        }
        function zeigeFP() {
            var r = vorwaerts(probe);
            fp.textContent = 'Forward Propagation für x = (' + zahl(r2(probe[0])) + ' | ' + zahl(r2(probe[1])) + ')\n' +
                r.hs.map(function (e, i) { return '① h' + (i + 1) + ': z = ' + zahl(r2(e.z)).replace('-', '−') + ' → ' + e.a; }).join('\n') +
                '\n② Ausgabe: ' + r.text + ' → ' + r.aus + (r.aus ? ' (innen)' : ' (außen)');
        }
        welt.beiZiehen(function (x, y) {
            // Griff in der Nähe? (Abstand in Weltkoordinaten)
            var best = null, bd = .035;
            neuronen.forEach(function (n) { ['p', 'q'].forEach(function (k) { var d = Math.hypot(n[k][0] - x, n[k][1] - y); if (d < bd) { bd = d; best = { n: n, k: k }; } }); });
            if (best) { ziehen = best; return true; }
            probe = [x, y]; zeichne(); zeigeFP();
            return false;
        }, function (x, y) {
            if (!ziehen) return;
            ziehen.n[ziehen.k] = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
            var n = ziehen.n; if (Math.hypot(n.p[0] - n.q[0], n.p[1] - n.q[1]) < .02) return;
            zeichne();
        }, function () { ziehen = null; aktualisiere(); });
        plus.addEventListener('click', function () {
            if (neuronen.length >= 10) return;
            var a = Math.PI * neuronen.length * .37;
            neuronen.push({ p: [.5 + .3 * Math.cos(a), .5 + .3 * Math.sin(a)], q: [.5 + .3 * Math.cos(a + 1.2), .5 + .3 * Math.sin(a + 1.2)], seite: 1, gruppe: neuronen.length % 2 });
            aktualisiere();
        });
        modusSel.addEventListener('change', function () { modus = modusSel.value; aktualisiere(); });
        starte(stufeNr);
    }

    // ---------- Trainings-Labor (Station 6): Trainings- und Testdaten, Über- und Unteranpassung ----------
    function training(box) {
        var basis = lade('monde'), daten, train, test, welt, chart;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Trainings-Labor: auswendig lernen oder verallgemeinern?' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var kR = regler('k (Nachbarn)', 1, 25, 1, 1), rR = regler('Rauschen', 0, 30, 10, 1);
        kR.out.textContent = '1'; rR.out.textContent = '10 %';
        rechts.appendChild(kR.box); rechts.appendChild(rR.box);
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        rechts.appendChild(anzeige);
        var chartBox = h('div');
        rechts.appendChild(chartBox);
        welt = new KI.Punktwelt(links, { x: [0, 1], y: [0, 1], xName: 'x1', yName: 'x2', breite: 460, hoehe: 420 });
        links.appendChild(h('div', { cls: 'legende', html: '<span style="--f:#2563eb">Training Klasse 0</span><span class="quadrat" style="--f:#dc2626">Training Klasse 1</span><span>hohl = Testdaten (nicht zum Lernen benutzt)</span>' }));
        function knn(menge, x, k, ohne) {
            var l = [];
            menge.forEach(function (p, i) { if (i !== ohne) l.push([(p.x[0] - x[0]) * (p.x[0] - x[0]) + (p.x[1] - x[1]) * (p.x[1] - x[1]), p.ziel]); });
            l.sort(function (a, b) { return a[0] - b[0]; });
            var s = 0; for (var i = 0; i < k; i++) s += l[i][1];
            return 2 * s > k ? 1 : 2 * s < k ? 0 : l[0][1];
        }
        function aufbauen() {
            var rnd = KI.zufall(31), quote = +rR.inp.value / 100;
            daten = basis.map(function (p) { return { x: p.x, ziel: rnd() < quote ? 1 - p.ziel : p.ziel }; });
            var gemischt = KI.mischen(daten, KI.zufall(32));
            train = gemischt.slice(0, 98); test = gemischt.slice(98);
            chart = [];
            for (var k = 1; k <= 25; k++) chart.push([k, guete(train, k), guete(test, k, true)]);
        }
        function guete(menge, k, istTest) {
            var ok = 0;
            menge.forEach(function (p) { if (knn(train, p.x, k) === p.ziel) ok++; });
            return ok / menge.length;
        }
        function zeichne() {
            var k = +kR.inp.value;
            welt.leeren();
            welt.region(function (x, y) { return knn(train, [x, y], k) ? 'rgba(220,38,38,.12)' : 'rgba(37,99,235,.07)'; }, 44);
            train.forEach(function (p) { welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), form: p.ziel ? 'quadrat' : 'kreis', r: 3.5 }); });
            test.forEach(function (p) { welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), r: 4.5, hohl: true }); });
            var c = chart[k - 1];
            anzeige.textContent = 'k = ' + k + ': richtig auf den Trainingsdaten ' + Math.round(100 * c[1]) + ' %, auf den Testdaten ' + Math.round(100 * c[2]) + ' %';
            chartBox.textContent = '';
            var cw = new KI.Punktwelt(chartBox, { x: [0, 26], y: [.5, 1], xName: 'k', yName: 'richtig', breite: 420, hoehe: 230, info: false });
            chart.forEach(function (e, i) {
                if (i) { cw.linie(chart[i - 1][0], chart[i - 1][1], e[0], e[1], { farbe: '#334155', breite: 2 }); cw.linie(chart[i - 1][0], chart[i - 1][2], e[0], e[2], { farbe: '#d97706', breite: 2.5 }); }
            });
            cw.linie(k, .5, k, 1, { farbe: '#94a3b8', breite: 1, strich: [4, 3] });
            cw.punkt(k, c[1], { farbe: '#334155', r: 4.5 }); cw.punkt(k, c[2], { farbe: '#d97706', r: 4.5 });
            chartBox.appendChild(h('div', { cls: 'legende', html: '<span style="--f:#334155">Trainingsdaten</span><span style="--f:#d97706">Testdaten</span>' }));
        }
        kR.inp.addEventListener('input', function () { kR.out.textContent = kR.inp.value; zeichne(); });
        rR.inp.addEventListener('input', function () { rR.out.textContent = rR.inp.value + ' %'; aufbauen(); zeichne(); });
        aufbauen(); zeichne();
    }

    // ---------- Wackel-Experiment (Station 6): Fehler in Abhängigkeit von einem Gewicht ----------
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function schuld(box) {
        var daten = lade('weide'), weich = false;
        var W = [[-3.25, 0, 10], [-0.894, 8.944, -4.472], [8.05, -8.944, -4.472]];   // h1 unten (zu hoch), h2 links, h3 rechts
        var wahl = [0, 0];
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Wackel-Experiment: Wer ist schuld, und in welche Richtung?' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var sel = h('select', { 'aria-label': 'Gewicht zum Wackeln' });
        [['0,0', 'h1 (unterer Zaun): Bias w0'], ['1,0', 'h2 (linker Zaun): Bias w0'], ['0,2', 'h1: Gewicht w2'], ['2,1', 'h3 (rechter Zaun): Gewicht w1']].forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
        var R = regler('Wert', -10, 10, W[0][0], 0.05);
        var weichBox = h('input', { type: 'checkbox' });
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'Gewicht:' }), sel]));
        rechts.appendChild(R.box);
        rechts.appendChild(h('label', { style: 'display:flex;gap:.4rem;align-items:center;font-size:.93rem;margin:.3rem 0' }, [weichBox, 'weiche Stufe (Sigmoid) statt Stufe']));
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var kurve = h('div');
        rechts.appendChild(anzeige); rechts.appendChild(kurve);
        var welt = new KI.Punktwelt(links, { x: [0, 1], y: [0, 1], xName: 'x1', yName: 'x2', breite: 440, hoehe: 400 });
        function ausgabe(x) {
            var hs = W.map(function (w) { var z = netto(w, x); return weich ? sigmoid(z) : stufe(z); });
            var z = hs[0] + hs[1] + hs[2] - 2.5;
            return weich ? sigmoid(6 * z) : stufe(z);
        }
        function fehler() {
            // Stufe: Anteil falsch eingeordneter Punkte; Sigmoid: mittlerer quadratischer Fehler (Kosten)
            var s = 0;
            daten.forEach(function (p) { var y = ausgabe(p.x); s += weich ? (y - p.ziel) * (y - p.ziel) : (y !== p.ziel ? 1 : 0); });
            return s / daten.length;
        }
        function zeichne() {
            welt.leeren();
            welt.region(function (x, y) { var a = ausgabe([x, y]); return 'rgba(220,38,38,' + (a * .22).toFixed(3) + ')'; }, 44);
            daten.forEach(function (p) { var f = Math.round(ausgabe(p.x)) !== p.ziel; welt.punkt(p.x[0], p.x[1], { farbe: KI.farbe.klasse(p.ziel), form: p.ziel ? 'quadrat' : 'kreis', r: 3.4, rand: f ? '#0f172a' : null, randBreite: f ? 1.8 : 1 }); });
            W.forEach(function (w, i) { welt.gerade(w[1], w[2], w[0], { farbe: i === wahl[0] ? '#b45309' : '#0f172a', breite: i === wahl[0] ? 3 : 1.8 }); });
            var alt = W[wahl[0]][wahl[1]], werte = [];
            for (var v = -10; v <= 10.001; v += .1) { W[wahl[0]][wahl[1]] = v; werte.push([v, fehler()]); }
            W[wahl[0]][wahl[1]] = alt;
            var f = fehler(), max = Math.max.apply(null, werte.map(function (e) { return e[1]; }));
            kurve.textContent = '';
            var cw = new KI.Punktwelt(kurve, { x: [-10, 10], y: [0, Math.max(.05, Math.ceil(max * 20) / 20)], xName: 'Wert des Gewichts', yName: weich ? 'Kosten' : 'Fehleranteil', breite: 420, hoehe: 230, info: false });
            werte.forEach(function (e, i) { if (i) cw.linie(werte[i - 1][0], werte[i - 1][1], e[0], e[1], { farbe: weich ? '#16a34a' : '#334155', breite: 2.5 }); });
            cw.punkt(alt, f, { farbe: '#b45309', r: 6, rand: '#0f172a' });
            // Steigung an der aktuellen Stelle (Differenzenquotient)
            W[wahl[0]][wahl[1]] = alt + .05; var f2 = fehler(); W[wahl[0]][wahl[1]] = alt - .05; var f1 = fehler(); W[wahl[0]][wahl[1]] = alt;
            var steig = (f2 - f1) / .1;
            anzeige.textContent = (weich ? 'Kosten (mittlerer quadratischer Fehler): ' + zahl(f, 4) : 'falsch eingeordnet: ' + Math.round(f * daten.length) + ' von ' + daten.length) +
                '\nÄnderung, wenn das Gewicht um 0,1 wächst: ' + (Math.abs(f2 - f1) < 1e-9 ? 'keine. Die Kurve ist hier flach, man weiß nicht, in welche Richtung man drehen soll.' : (f2 > f1 ? 'der Fehler steigt → Gewicht verkleinern' : 'der Fehler sinkt → Gewicht vergrößern') + (weich ? ' (Steigung ' + zahl(steig, 3) + ')' : ''));
        }
        sel.addEventListener('change', function () { wahl = sel.value.split(',').map(Number); R.inp.value = W[wahl[0]][wahl[1]]; R.out.textContent = zahl(W[wahl[0]][wahl[1]], 2); zeichne(); });
        R.inp.addEventListener('input', function () { W[wahl[0]][wahl[1]] = +R.inp.value; R.out.textContent = zahl(+R.inp.value, 2); zeichne(); });
        weichBox.addEventListener('change', function () { weich = weichBox.checked; zeichne(); });
        zeichne();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-perzeptron]').forEach(labor);
        document.querySelectorAll('[data-zaun]').forEach(zaun);
        document.querySelectorAll('[data-training]').forEach(training);
        document.querySelectorAll('[data-schuld]').forEach(schuld);
    });
})();
