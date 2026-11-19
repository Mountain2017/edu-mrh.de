/*
 * KI Stationen 2 und 3 – k-nächste Nachbarn und k-Means (braucht ki.js und ki-daten.js)
 *
 *   <div data-knn [data-satz="pinguine|kredit"] [data-merkmale="schnabellaenge,schnabeltiefe"] [data-k="3"]
 *        [data-normiert="ja|nein"] [data-wahl]></div>
 *        k-NN-Labor: Klick setzt einen neuen Punkt, die k nächsten Nachbarn stimmen ab.
 *        data-wahl: Auswahl der Merkmale und Schalter „normieren“ anzeigen; data-satz="kredit": Fairness-Prüfung
 *   <div data-kmeans [data-satz="pinguine|haufen|monde|ring|xor|zwoelf"] [data-merkmale="…"] [data-k="3"] [data-satzwahl]
 *        [data-start="C,H,J" | "0,200,300"]></div>   (data-start: Knopf „Start wie auf dem Blatt“, Punktnamen oder Nummern)
 *        k-Means-Labor: Zentren zufällig oder per Klick setzen, ① zuordnen, ② verschieben, Streuung, Kreuztabelle
 *   <div data-ellbogen [data-satz] [data-merkmale]></div>   Streuung für k = 1 … 8 (je bestes von 10 Starts)
 *
 * Abstände werden im normierten Raum gerechnet (jedes Merkmal auf [0, 1]), außer im k-NN-Labor mit „normieren“ aus.
 * Streuung = Summe der quadrierten Abstände aller Punkte zu ihrem Zentrum (im normierten Raum).
 */
(function () {
    'use strict';
    var h = KI.h, zahl = KI.zahl;
    var FORM = { Adelie: 'kreis', Zuegel: 'dreieck', Esels: 'quadrat' };

    function abstand2(a, b) { var s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; } return s; }
    function achse(ds, j) {
        var m = ds.merkmale[j];
        if (ds.name === 'kredit') return j ? 'Zahlungsverlauf (Index)' : 'Einkommen (Index)';
        return KI.MERKMALE[m] ? KI.merkmalName(m, true) : (j ? 'y' : 'x');
    }
    function bereich(ds, j) {
        var r = ds.max[j] - ds.min[j];
        if (ds.name !== 'pinguine') return [0, 1];
        return [Math.floor((ds.min[j] - r * .06) / 5) * 5, Math.ceil((ds.max[j] + r * .06) / 5) * 5];
    }
    function regler(name, min, max, wert, schritt) {
        var id = 'r' + Math.random().toString(36).slice(2), inp = h('input', { type: 'range', id: id, min: min, max: max, step: schritt || 1, value: wert }), out = h('output', { text: wert });
        var box = h('div', { cls: 'regler' }, [h('label', { for: id, text: name }), inp, out]);
        inp.addEventListener('input', function () { out.textContent = inp.value; });
        return { box: box, inp: inp, out: out };
    }
    function auswahl(optionen, wert) {
        var s = h('select');
        optionen.forEach(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === wert) op.selected = true; s.appendChild(op); });
        return s;
    }
    function farbePunkt(ds, p) {
        if (ds.name === 'pinguine') return KI.farbe.art(p.art);
        if (ds.name === 'kredit') return p.klasse ? '#16a34a' : '#dc2626';
        return KI.farbe.klasse(p.klasse);
    }
    function formPunkt(ds, p) {
        if (ds.name === 'pinguine') return FORM[p.art];
        if (ds.name === 'kredit') return p.gruppe === 'B' ? 'dreieck' : 'kreis';
        return p.klasse ? 'quadrat' : 'kreis';
    }
    function legende(ds) {
        if (ds.name === 'pinguine') return '<span style="--f:#ea580c">Adélie (Kreis)</span><span style="--f:#9333ea">Zügel (Dreieck)</span><span class="quadrat" style="--f:#0e7490">Esels (Quadrat)</span>';
        if (ds.name === 'kredit') return '<span style="--f:#16a34a">hat zurückgezahlt</span><span style="--f:#dc2626">hat nicht zurückgezahlt</span><span>Kreis = Gruppe A, Dreieck = Gruppe B</span>';
        return '';
    }
    function klasseName(ds, k) {
        if (ds.name === 'pinguine') return KI.farbe.artName(k);
        if (ds.name === 'kredit') return k ? 'zahlt zurück' : 'zahlt nicht zurück';
        return 'Klasse ' + k;
    }
    function etikett(ds, p) { return ds.name === 'pinguine' ? p.art : p.klasse; }

    // ---------- k-nächste Nachbarn ----------
    function knnVorhersage(ds, x, k, normiert, ohne) {
        var liste = [];
        ds.punkte.forEach(function (p, i) { if (i !== ohne) liste.push({ i: i, d: abstand2(normiert ? p.n : p.w, x) }); });
        liste.sort(function (a, b) { return a.d - b.d; });
        var nah = liste.slice(0, k), stimmen = {};
        nah.forEach(function (e) { var l = etikett(ds, ds.punkte[e.i]); stimmen[l] = (stimmen[l] || 0) + 1; });
        var best = null;
        // Mehrheit; bei Gleichstand entscheidet der nächste Nachbar unter den Gleichstehenden
        Object.keys(stimmen).forEach(function (l) { if (best === null || stimmen[l] > stimmen[best]) best = l; });
        var gleich = Object.keys(stimmen).filter(function (l) { return stimmen[l] === stimmen[best]; });
        if (gleich.length > 1) for (var j = 0; j < nah.length; j++) { var l = String(etikett(ds, ds.punkte[nah[j].i])); if (gleich.indexOf(l) >= 0) { best = l; break; } }
        return { nah: nah, stimmen: stimmen, klasse: best };
    }
    KI.knnVorhersage = knnVorhersage;

    function knn(box) {
        var satz = box.getAttribute('data-satz') || 'pinguine';
        var merk = (box.getAttribute('data-merkmale') || 'schnabellaenge,schnabeltiefe').split(',');
        var normiert = box.getAttribute('data-normiert') !== 'nein';
        var ds, welt, neu = null, regionen = false;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: satz === 'kredit' ? 'k-NN-Labor: Kredite' : 'k-NN-Labor: Welche Art ist der neue Pinguin?' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var leg = h('div', { cls: 'legende' });
        var k = regler('k', 1, 15, box.getAttribute('data-k') || 3);
        var regBox = h('input', { type: 'checkbox' });
        var steuer = h('div', {}, [k.box, h('label', { style: 'display:flex;gap:.4rem;align-items:center;font-size:.93rem;margin:.3rem 0' }, [regBox, 'Entscheidungsregionen zeigen (Mehrheit an jeder Stelle)'])]);
        var normBox = null, selX = null, selY = null;
        if (box.hasAttribute('data-wahl')) {
            var opts = Object.keys(KI.MERKMALE).map(function (m) { return [m, KI.merkmalName(m, true)]; });
            selX = auswahl(opts, merk[0]); selY = auswahl(opts, merk[1]);
            normBox = h('input', { type: 'checkbox' }); normBox.checked = normiert;
            steuer.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'x:' }), selX, h('span', { text: 'y:' }), selY]));
            steuer.appendChild(h('label', { style: 'display:flex;gap:.4rem;align-items:center;font-size:.93rem;margin:.3rem 0' }, [normBox, 'Merkmale normieren (jedes auf 0 bis 1)']));
        }
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite', text: 'Klicke in das Diagramm oder gib die Werte unten ein, um einen neuen Punkt zu setzen.' });
        var eX = h('input', { type: 'text', inputmode: 'decimal', size: '6', 'aria-label': 'x-Wert' }), eY = h('input', { type: 'text', inputmode: 'decimal', size: '6', 'aria-label': 'y-Wert' });
        var eOk = h('button', { type: 'button', cls: 'knopf', text: 'Punkt setzen' });
        eOk.addEventListener('click', function () {
            var x = parseFloat(eX.value.replace(',', '.')), y = parseFloat(eY.value.replace(',', '.'));
            if (isFinite(x) && isFinite(y)) { neu = [x, y]; zeichne(); }
        });
        rechts.appendChild(steuer);
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'x =' }), eX, h('span', { text: 'y =' }), eY, eOk]));
        rechts.appendChild(anzeige);
        var fair = null;
        if (satz === 'kredit') {
            var fk = h('button', { type: 'button', cls: 'knopf voll', text: 'Fairness prüfen: Wie oft liegt k-NN je Gruppe richtig?' });
            fair = h('div', { cls: 'anzeige', 'aria-live': 'polite' }); fair.hidden = true;
            rechts.appendChild(h('div', { cls: 'knopfzeile', style: 'margin-top:.6rem' }, [fk])); rechts.appendChild(fair);
            fk.addEventListener('click', pruefeFair);
        }
        function aufbauen() {
            if (selX) merk = [selX.value, selY.value];
            if (normBox) normiert = normBox.checked;
            ds = KI.datensatz(satz, satz === 'pinguine' ? merk : null);
            links.textContent = '';
            welt = new KI.Punktwelt(links, { x: bereich(ds, 0), y: bereich(ds, 1), xName: achse(ds, 0), yName: achse(ds, 1), breite: 500, hoehe: 420 });
            links.appendChild(leg); leg.innerHTML = legende(ds);
            welt.beiKlick(function (x, y) { neu = [x, y]; zeichne(); });
            zeichne();
        }
        function inRaum(w) { return normiert ? w.map(function (v, j) { return (v - ds.min[j]) / (ds.max[j] - ds.min[j]); }) : w; }
        function zeichne() {
            welt.leeren();
            var kk = +k.inp.value;
            if (regionen) {
                welt.region(function (x, y) {
                    var v = knnVorhersage(ds, inRaum([x, y]), kk, normiert).klasse;
                    return KI.farbe.alpha(ds.name === 'pinguine' ? KI.farbe.art(v) : farbePunkt(ds, { klasse: +v }), .16);
                }, 48);
            }
            var erg = neu ? knnVorhersage(ds, inRaum(neu), kk, normiert) : null;
            if (erg) erg.nah.forEach(function (e) { var p = ds.punkte[e.i]; welt.linie(neu[0], neu[1], p.w[0], p.w[1], { farbe: '#94a3b8', breite: 1.2 }); });
            ds.punkte.forEach(function (p) { welt.punkt(p.w[0], p.w[1], { farbe: farbePunkt(ds, p), form: formPunkt(ds, p), r: 3.6 }); });
            if (erg) {
                erg.nah.forEach(function (e) { var p = ds.punkte[e.i]; welt.punkt(p.w[0], p.w[1], { farbe: farbePunkt(ds, p), form: formPunkt(ds, p), r: 5.5, rand: '#0f172a', randBreite: 2 }); });
                var f = ds.name === 'pinguine' ? KI.farbe.art(erg.klasse) : farbePunkt(ds, { klasse: +erg.klasse });
                welt.punkt(neu[0], neu[1], { farbe: f, form: 'stern', r: 9, rand: '#0f172a', randBreite: 1.5 });
                var st = Object.keys(erg.stimmen).map(function (l) { return erg.stimmen[l] + '× ' + klasseName(ds, ds.name === 'pinguine' ? l : +l); }).join(', ');
                var e1 = erg.nah[0];
                anzeige.textContent = 'Neuer Punkt: ' + achse(ds, 0).split(' (')[0] + ' ' + zahl(+neu[0].toFixed(ds.name === 'pinguine' ? 1 : 2)) + ', ' + achse(ds, 1).split(' (')[0] + ' ' + zahl(+neu[1].toFixed(ds.name === 'pinguine' ? 1 : 2)) +
                    '\n' + (kk === 1 ? 'nächster Nachbar: ' : kk + ' nächste Nachbarn: ') + st + '\n→ Vorhersage: ' + klasseName(ds, ds.name === 'pinguine' ? erg.klasse : +erg.klasse) +
                    '\nAbstand zum nächsten Nachbarn: ' + zahl(Math.sqrt(e1.d), normiert ? 3 : 1) + (normiert ? ' (normiert)' : ' (in Originaleinheiten)');
            }
        }
        function pruefeFair() {
            var kk = +k.inp.value, st = { A: [0, 0, 0, 0], B: [0, 0, 0, 0] };
            ds.punkte.forEach(function (p, i) {
                var v = +knnVorhersage(ds, p.n, kk, true, i).klasse, s = st[p.gruppe];
                s[1]++; if (v === p.klasse) s[0]++;
                if (p.klasse === 1) { s[3]++; if (v === 0) s[2]++; }
            });
            fair.hidden = false;
            fair.textContent = 'Jede Person wird mit den übrigen Daten vorhergesagt (k = ' + kk + '):\n' +
                ['A', 'B'].map(function (g) { var s = st[g]; return 'Gruppe ' + g + ' (' + s[1] + ' Personen): ' + s[0] + ' richtig = ' + Math.round(100 * s[0] / s[1]) + ' %; abgelehnt, obwohl zurückgezahlt: ' + s[2] + ' von ' + s[3]; }).join('\n');
        }
        k.inp.addEventListener('input', zeichne);
        regBox.addEventListener('change', function () { regionen = regBox.checked; zeichne(); });
        [selX, selY, normBox].forEach(function (s) { if (s) s.addEventListener('change', function () { aufbauen(); }); });
        aufbauen();
    }

    // ---------- k-Means ----------
    function kmeansLauf(punkte, start) {
        var Z = start.map(function (z) { return z.slice(); }), A = null, schritte = 0;
        for (;;) {
            var neuA = punkte.map(function (p) { return naechstes(p, Z); });
            var gleich = A && neuA.every(function (a, i) { return a === A[i]; });
            A = neuA;
            if (gleich || schritte > 100) break;
            Z = zentren(punkte, A, Z);
            schritte++;
        }
        return { Z: Z, A: A, sse: streuung(punkte, A, Z), schritte: schritte };
    }
    function naechstes(p, Z) { var b = 0, bd = Infinity; Z.forEach(function (z, c) { var d = abstand2(p, z); if (d < bd) { bd = d; b = c; } }); return b; }
    function zentren(punkte, A, alt) {
        return alt.map(function (z, c) {
            var s = z.map(function () { return 0; }), n = 0;
            punkte.forEach(function (p, i) { if (A[i] === c) { n++; p.forEach(function (v, j) { s[j] += v; }); } });
            return n ? s.map(function (v) { return v / n; }) : z.slice();
        });
    }
    function streuung(punkte, A, Z) { var s = 0; punkte.forEach(function (p, i) { s += abstand2(p, Z[A[i]]); }); return s; }
    function zufallsStart(punkte, k, rnd) { return KI.mischen(punkte.map(function (p, i) { return i; }), rnd).slice(0, k).map(function (i) { return punkte[i].slice(); }); }
    KI.kmeans = { lauf: kmeansLauf, start: zufallsStart, streuung: streuung };

    var ZWOELF = [[1, 2], [2, 1], [2, 3], [3, 2], [7, 8], [8, 7], [8, 9], [9, 8], [6, 2], [8, 1], [9, 3], [5, 6]];
    function satzLaden(name, merk) {
        if (name === 'zwoelf') {
            var punkte = ZWOELF.map(function (z, i) { return { w: z, n: [z[0] / 10, z[1] / 10], name: 'ABCDEFGHIJKL'[i] }; });
            return { name: 'zwoelf', punkte: punkte, merkmale: ['x', 'y'], min: [0, 0], max: [10, 10] };
        }
        return KI.datensatz(name, name === 'pinguine' ? merk : null);
    }
    function rohAus(ds, n) { return n.map(function (v, j) { return ds.min[j] + v * (ds.max[j] - ds.min[j]); }); }

    function kmeans(box) {
        var satz = box.getAttribute('data-satz') || 'pinguine';
        var merk = (box.getAttribute('data-merkmale') || 'schnabellaenge,schnabeltiefe').split(',');
        var ds, welt, Z = [], A = null, naechster = 'start', iter = 0, setzen = false, spur = [], fertig = false, zeigeArt = false;
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'k-Means-Labor' }));
        var raster = h('div', { cls: 'werk-raster' }), links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var k = regler('k (Cluster)', 1, 8, box.getAttribute('data-k') || 3);
        var selSatz = null;
        if (box.hasAttribute('data-satzwahl')) {
            selSatz = auswahl([['pinguine', 'Pinguine'], ['haufen', 'ungleiche Haufen'], ['monde', 'zwei Monde'], ['ring', 'Ring um Kern'], ['zwoelf', '12 Punkte (Blatt)']], satz);
            rechts.appendChild(h('div', { cls: 'knopfzeile' }, [h('span', { text: 'Daten:' }), selSatz]));
        }
        rechts.appendChild(k.box);
        var bZuf = h('button', { type: 'button', cls: 'knopf', text: '🎲 Zentren zufällig' });
        var bSetz = h('button', { type: 'button', cls: 'knopf', text: '👆 Zentren selbst setzen' });
        var b1 = h('button', { type: 'button', cls: 'knopf voll', text: '① Zuordnen' });
        var b2 = h('button', { type: 'button', cls: 'knopf voll', text: '② Zentren verschieben' });
        var bLauf = h('button', { type: 'button', cls: 'knopf', text: '▶ bis zum Ende' });
        var b20 = h('button', { type: 'button', cls: 'knopf', text: '20-mal neu starten' });
        var artBox = h('input', { type: 'checkbox' });
        var bBlatt = null;
        if (box.hasAttribute('data-start')) {
            bBlatt = h('button', { type: 'button', cls: 'knopf', text: '📝 Start wie auf dem Blatt' });
            bBlatt.addEventListener('click', function () {
                if (selSatz && selSatz.value !== (box.getAttribute('data-satz') || 'pinguine')) { selSatz.value = box.getAttribute('data-satz'); aufbauen(); }
                var namen = box.getAttribute('data-start').split(',');
                zuruecksetzen(); setzen = false; bSetz.classList.remove('aktiv');
                k.inp.value = namen.length; k.out.textContent = namen.length;
                Z = namen.map(function (n) {
                    var i = isNaN(+n) ? ds.punkte.findIndex(function (p) { return p.name === n.trim(); }) : +n;
                    return ds.punkte[i].n.slice();
                });
                naechster = 'zuordnen'; zeichne();
            });
        }
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [bZuf, bSetz, bBlatt]));
        rechts.appendChild(h('div', { cls: 'knopfzeile' }, [b1, b2, bLauf]));
        var artZeile = h('label', { style: 'display:flex;gap:.4rem;align-items:center;font-size:.93rem;margin:.3rem 0' }, [artBox, 'wahre Art als Form zeigen (k-Means kennt sie nicht!)']);
        rechts.appendChild(artZeile);
        var anzeige = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var tabelle = h('div', { cls: 'tab-scroll' });
        rechts.appendChild(anzeige); rechts.appendChild(tabelle);
        rechts.appendChild(h('div', { cls: 'knopfzeile', style: 'margin-top:.5rem' }, [b20]));
        var statistik = h('div', { cls: 'anzeige', 'aria-live': 'polite' }); statistik.hidden = true;
        rechts.appendChild(statistik);

        function punkteN() { return ds.punkte.map(function (p) { return p.n; }); }
        function aufbauen() {
            if (selSatz) satz = selSatz.value;
            ds = satzLaden(satz, merk);
            links.textContent = '';
            var xb = ds.name === 'zwoelf' ? [0, 10] : bereich(ds, 0), yb = ds.name === 'zwoelf' ? [0, 10] : bereich(ds, 1);
            welt = new KI.Punktwelt(links, { x: xb, y: yb, xName: ds.name === 'zwoelf' ? 'x' : achse(ds, 0), yName: ds.name === 'zwoelf' ? 'y' : achse(ds, 1), breite: 500, hoehe: 420 });
            welt.beiKlick(function (x, y) {
                if (!setzen) return;
                Z.push([(x - ds.min[0]) / (ds.max[0] - ds.min[0]), (y - ds.min[1]) / (ds.max[1] - ds.min[1])]);
                if (Z.length >= +k.inp.value) { setzen = false; bSetz.classList.remove('aktiv'); naechster = 'zuordnen'; }
                zeichne();
            });
            artZeile.hidden = ds.name !== 'pinguine';
            zuruecksetzen();
        }
        function zuruecksetzen() { Z = []; A = null; iter = 0; spur = []; fertig = false; naechster = 'start'; tabelle.textContent = ''; zeichne(); }
        function zeichne() {
            welt.leeren();
            spur.forEach(function (s) { var a = rohAus(ds, s[0]), b = rohAus(ds, s[1]); welt.linie(a[0], a[1], b[0], b[1], { farbe: KI.farbe.cluster(s[2]), breite: 2, strich: [5, 4] }); });
            ds.punkte.forEach(function (p, i) {
                var f = A ? KI.farbe.cluster(A[i]) : '#94a3b8';
                welt.punkt(p.w[0], p.w[1], { farbe: f, form: zeigeArt && p.art ? FORM[p.art] : 'kreis', r: ds.name === 'zwoelf' ? 6 : 3.8, text: p.name });
            });
            Z.forEach(function (z, c) { var r = rohAus(ds, z); welt.punkt(r[0], r[1], { farbe: KI.farbe.cluster(c), form: 'kreuz', r: 9, breite: 4.5 }); welt.punkt(r[0], r[1], { farbe: '#0f172a', form: 'kreuz', r: 9, breite: 1.2 }); });
            var t;
            if (setzen) t = 'Klicke ' + (+k.inp.value - Z.length) + ' Zentren in das Diagramm.';
            else if (!Z.length) t = 'Setze zuerst ' + k.inp.value + ' Startzentren (zufällig oder selbst).';
            else if (fertig) t = 'Fertig nach ' + iter + ' Durchgängen: Beim Zuordnen hat sich nichts mehr geändert.';
            else if (naechster === 'zuordnen') t = 'Als Nächstes: ① jeden Punkt dem nächsten Zentrum zuordnen.';
            else t = 'Als Nächstes: ② jedes Zentrum in die Mitte (Mittelwert) seiner Punkte schieben.';
            if (A) t += '\nDurchgang ' + iter + ' · Streuung (Summe der quadrierten Abstände, normiert): ' + zahl(streuung(punkteN(), A, Z), 2);
            if (ds.name === 'zwoelf' && Z.length) t += '\nZentren: ' + Z.map(function (z, c) { var r = rohAus(ds, z); return 'Z' + (c + 1) + '(' + zahl(+r[0].toFixed(2)) + ' | ' + zahl(+r[1].toFixed(2)) + ')'; }).join('  ');
            anzeige.textContent = t;
            b1.disabled = !Z.length || setzen || fertig || naechster !== 'zuordnen';
            b2.disabled = !Z.length || setzen || fertig || naechster !== 'verschieben';
            bLauf.disabled = !Z.length || setzen || fertig;
            if (fertig && ds.name === 'pinguine') kreuztabelle(); else tabelle.textContent = '';
        }
        function zuordnen() {
            var neuA = punkteN().map(function (p) { return naechstes(p, Z); });
            var gleich = A && neuA.every(function (a, i) { return a === A[i]; });
            A = neuA;
            if (gleich) fertig = true; else naechster = 'verschieben';
        }
        function verschieben() {
            var alt = Z;
            Z = zentren(punkteN(), A, Z);
            alt.forEach(function (z, c) { spur.push([z, Z[c], c]); });
            iter++; naechster = 'zuordnen';
        }
        function kreuztabelle() {
            var arten = ['Adelie', 'Zuegel', 'Esels'], kk = Z.length;
            var html = '<table class="ki-tab"><tr><th>Cluster</th>' + arten.map(function (a) { return '<th class="zahl">' + KI.farbe.artName(a).replace('pinguin', '') + '</th>'; }).join('') + '</tr>';
            for (var c = 0; c < kk; c++) {
                html += '<tr><td><span style="color:' + KI.farbe.cluster(c) + ';font-weight:800">●</span> ' + (c + 1) + '</td>' + arten.map(function (a) {
                    return '<td class="zahl">' + ds.punkte.filter(function (p, i) { return A[i] === c && p.art === a; }).length + '</td>';
                }).join('') + '</tr>';
            }
            tabelle.innerHTML = html + '</table>';
        }
        bZuf.addEventListener('click', function () { zuruecksetzen(); Z = zufallsStart(punkteN(), +k.inp.value); naechster = 'zuordnen'; setzen = false; bSetz.classList.remove('aktiv'); zeichne(); });
        bSetz.addEventListener('click', function () { zuruecksetzen(); setzen = true; bSetz.classList.add('aktiv'); zeichne(); });
        b1.addEventListener('click', function () { zuordnen(); zeichne(); });
        b2.addEventListener('click', function () { verschieben(); zeichne(); });
        var timer = null;
        bLauf.addEventListener('click', function () {
            if (timer) return;
            timer = setInterval(function () {
                if (fertig || !Z.length) { clearInterval(timer); timer = null; return; }
                if (naechster === 'zuordnen') zuordnen(); else verschieben();
                zeichne();
            }, 350);
        });
        b20.addEventListener('click', function () {
            var kk = +k.inp.value, P = punkteN(), erg = {};
            for (var s = 0; s < 20; s++) {
                var r = kmeansLauf(P, zufallsStart(P, kk));
                var key = zahl(r.sse, 2); erg[key] = (erg[key] || 0) + 1;
            }
            var keys = Object.keys(erg).sort(function (a, b) { return parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')); });
            statistik.hidden = false;
            statistik.textContent = '20 Läufe mit k = ' + kk + ' und zufälligen Startzentren. Endstreuung (wie oft):\n' + keys.map(function (k2) { return k2 + '  (' + erg[k2] + '×)'; }).join('\n') +
                '\nVerschiedene Ergebnisse: ' + keys.length + (keys.length > 1 ? '. Man startet deshalb mehrmals und nimmt das Ergebnis mit der kleinsten Streuung.' : '');
        });
        artBox.addEventListener('change', function () { zeigeArt = artBox.checked; zeichne(); });
        k.inp.addEventListener('input', function () { zuruecksetzen(); });
        if (selSatz) selSatz.addEventListener('change', aufbauen);
        aufbauen();
    }

    // ---------- Ellbogen ----------
    function ellbogen(box) {
        var satz = box.getAttribute('data-satz') || 'pinguine';
        var merk = (box.getAttribute('data-merkmale') || 'schnabellaenge,schnabeltiefe').split(',');
        var ds = satzLaden(satz, merk), P = ds.punkte.map(function (p) { return p.n; });
        box.classList.add('werk');
        box.appendChild(h('h4', { text: 'Ellbogen-Diagramm: Streuung in Abhängigkeit von k' }));
        var werte = [];
        for (var kk = 1; kk <= 8; kk++) {
            var best = Infinity, rnd = KI.zufall(100 + kk);
            for (var s = 0; s < 10; s++) best = Math.min(best, kmeansLauf(P, zufallsStart(P, kk, rnd)).sse);
            werte.push(best);
        }
        var max = Math.ceil(werte[0] / 5) * 5;
        var welt = new KI.Punktwelt(box, { x: [0.5, 8.5], y: [0, max], xName: 'k (Zahl der Cluster)', yName: 'Streuung', breite: 460, hoehe: 280, info: false });
        werte.forEach(function (v, i) { if (i) welt.linie(i, werte[i - 1], i + 1, v, { farbe: '#1d4ed8', breite: 2.5 }); });
        werte.forEach(function (v, i) { welt.punkt(i + 1, v, { farbe: '#1d4ed8', r: 5 }); welt.text(i + 1, v + max * .04, zahl(v, 1), { ausrichtung: 'center', font: '600 11px system-ui, sans-serif' }); });
        box.appendChild(h('p', { style: 'font-size:.88rem;color:var(--gray);margin:.3rem 0 0', text: 'Je k das beste von 10 Läufen. Mit mehr Clustern sinkt die Streuung immer, bei k = Zahl der Punkte wäre sie 0. Gesucht ist der „Knick“: danach bringt ein weiteres Cluster nur noch wenig.' }));
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-knn]').forEach(knn);
        document.querySelectorAll('[data-kmeans]').forEach(kmeans);
        document.querySelectorAll('[data-ellbogen]').forEach(ellbogen);
    });
})();
