/*
 * KI Station 1 – „Sei die KI“: drei Lernarten zum Selbstspielen (braucht ki.js)
 *
 *   <div data-sei-ki="ueberwacht"></div>     12 beschriftete Wesen ansehen, dann 10 neue einordnen (Rückmeldung je Wesen)
 *   <div data-sei-ki="unueberwacht"></div>   16 Wesen ohne Namen in Gruppen sortieren (keine Rückmeldung)
 *   <div data-bandit></div>                  drei Automaten, 30 Züge, danach spielt ein Agent (ε-greedy)
 *   <div data-gitterwelt></div>              Roboter lernt per Belohnung den Weg zum Akku (Q-Lernen)
 *
 * Die Wesen sind fest vorgegeben (gleich für alle), damit die Klasse ihre Ergebnisse vergleichen kann.
 * Regel der Glimme und Zorks: ab 3 Zacken ist es ein Zork. Die Farbe ist in den Lernbeispielen eine Falle
 * (Zorks meist warm, Glimme meist kalt), in den Testwesen nicht.
 */
(function () {
    'use strict';
    var h = KI.h;

    // ---------- Wesen zeichnen ----------
    // w = {form: 'rund'|'eckig', ton: Farbton 0–360, zacken: 0–5, augen: 1–3, g: Größe 0.8–1.15}
    function wesenSVG(w, groesse) {
        var g = w.g || 1, cx = 40, cy = 48, r = 20 * g;
        var koerper = 'hsl(' + w.ton + ',70%,58%)', dunkel = 'hsl(' + w.ton + ',60%,32%)';
        var s = '<svg viewBox="0 0 80 80" width="' + (groesse || 72) + '" height="' + (groesse || 72) + '" aria-hidden="true">';
        // Beine
        s += '<line x1="' + (cx - 8) + '" y1="' + (cy + r - 2) + '" x2="' + (cx - 10) + '" y2="' + (cy + r + 9) + '" stroke="' + dunkel + '" stroke-width="3" stroke-linecap="round"/>';
        s += '<line x1="' + (cx + 8) + '" y1="' + (cy + r - 2) + '" x2="' + (cx + 10) + '" y2="' + (cy + r + 9) + '" stroke="' + dunkel + '" stroke-width="3" stroke-linecap="round"/>';
        // Zacken oben
        for (var i = 0; i < w.zacken; i++) {
            var t = w.zacken === 1 ? 0 : (i / (w.zacken - 1) - .5) * 1.5;
            var bx = cx + Math.sin(t) * r * .9, by = cy - Math.cos(t) * r * .9;
            var sx = cx + Math.sin(t) * (r + 13), sy = cy - Math.cos(t) * (r + 13);
            var nx = Math.cos(t) * 5, ny = Math.sin(t) * 5;
            s += '<polygon points="' + (bx - nx).toFixed(1) + ',' + (by - ny).toFixed(1) + ' ' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' ' + (bx + nx).toFixed(1) + ',' + (by + ny).toFixed(1) + '" fill="' + dunkel + '"/>';
        }
        // Körper
        if (w.form === 'eckig') s += '<rect x="' + (cx - r) + '" y="' + (cy - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" rx="4" fill="' + koerper + '" stroke="' + dunkel + '" stroke-width="2"/>';
        else s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + koerper + '" stroke="' + dunkel + '" stroke-width="2"/>';
        // Augen
        var ax = w.augen === 1 ? [0] : w.augen === 2 ? [-7, 7] : [-10, 0, 10];
        ax.forEach(function (d) {
            s += '<circle cx="' + (cx + d) + '" cy="' + (cy - 4) + '" r="5" fill="#fff" stroke="' + dunkel + '" stroke-width="1"/><circle cx="' + (cx + d + 1) + '" cy="' + (cy - 3) + '" r="2.2" fill="#0f172a"/>';
        });
        s += '<path d="M' + (cx - 6) + ' ' + (cy + 8) + ' q6 5 12 0" stroke="' + dunkel + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
        return s + '</svg>';
    }
    KI.wesenSVG = wesenSVG;
    function W(form, ton, zacken, augen, g) { return { form: form, ton: ton, zacken: zacken, augen: augen, g: g || 1 }; }
    var WARM = [8, 22, 34], KALT = [196, 214, 232];
    function istZork(w) { return w.zacken >= 3; }

    var LERNEN = [
        W('rund', WARM[0], 3, 2), W('rund', KALT[0], 0, 2), W('eckig', WARM[1], 4, 1), W('eckig', KALT[1], 1, 3),
        W('rund', WARM[2], 5, 2, 1.1), W('rund', KALT[2], 2, 1), W('eckig', WARM[0], 3, 3, .9), W('rund', KALT[1], 1, 2, 1.1),
        W('rund', WARM[1], 4, 3), W('eckig', KALT[0], 0, 1), W('eckig', KALT[2], 3, 2), W('rund', WARM[2], 2, 2, .9)
    ];
    var TESTEN = [
        W('eckig', WARM[1], 1, 2), W('rund', KALT[0], 4, 1), W('rund', WARM[0], 0, 3), W('eckig', KALT[2], 5, 2),
        W('eckig', KALT[1], 2, 2), W('rund', WARM[2], 3, 1), W('eckig', WARM[0], 2, 3), W('rund', KALT[1], 3, 3, 1.1),
        W('rund', KALT[2], 1, 1, .9), W('eckig', WARM[1], 5, 2)
    ];

    // ---------- Überwacht ----------
    function ueberwacht(box) {
        var punkte = 0, nr = 0;
        box.classList.add('werk', 'seiki');
        box.appendChild(h('h4', { text: 'Runde 1: Lernen mit Lehrer' }));
        box.appendChild(h('p', { html: 'Auf dem Planeten Zirkon leben <strong>Glimme</strong> und <strong>Zorks</strong>. Präge dir die 12 Beispiele ein: Jedes trägt seinen Namen. Danach kommen 10 neue Wesen, die du einordnen sollst.' }));
        var galerie = h('div', { cls: 'wesen-galerie' });
        LERNEN.forEach(function (w) {
            var k = h('figure', { cls: 'wesen-karte ' + (istZork(w) ? 'zork' : 'glimm') });
            k.innerHTML = wesenSVG(w) + '<figcaption>' + (istZork(w) ? 'Zork' : 'Glimm') + '</figcaption>';
            galerie.appendChild(k);
        });
        box.appendChild(galerie);
        var start = h('button', { type: 'button', cls: 'knopf voll', text: 'Ich bin bereit: Test starten' });
        var testBereich = h('div', { cls: 'seiki-test' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [start]));
        box.appendChild(testBereich);
        start.addEventListener('click', function () {
            galerie.classList.add('verdeckt');
            start.disabled = true;
            punkte = 0; nr = 0;
            naechstes();
        });
        function naechstes() {
            testBereich.textContent = '';
            if (nr >= TESTEN.length) {
                var fazit = h('div', { cls: 'rueck ' + (punkte >= 8 ? 'ok' : 'neutral') });
                fazit.innerHTML = '<strong>' + punkte + ' von 10 richtig.</strong> Welche Regel hast du benutzt? Schreib sie auf (Blatt 1, Aufgabe 2), bevor du weiterliest.';
                testBereich.appendChild(fazit);
                var nochmal = h('button', { type: 'button', cls: 'knopf', text: 'Beispiele wieder zeigen und neu testen' });
                nochmal.addEventListener('click', function () { galerie.classList.remove('verdeckt'); start.disabled = false; testBereich.textContent = ''; });
                testBereich.appendChild(h('div', { cls: 'knopfzeile' }, [nochmal]));
                return;
            }
            var w = TESTEN[nr];
            var karte = h('figure', { cls: 'wesen-karte gross' });
            karte.innerHTML = wesenSVG(w, 110) + '<figcaption>Wesen ' + (nr + 1) + ' von 10</figcaption>';
            var g = h('button', { type: 'button', cls: 'knopf', text: 'Glimm' }), z = h('button', { type: 'button', cls: 'knopf', text: 'Zork' });
            var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
            function antwort(zork) {
                g.disabled = z.disabled = true;
                var ok = zork === istZork(w);
                if (ok) punkte++;
                rueck.className = 'rueck ' + (ok ? 'ok' : 'nein');
                rueck.textContent = (ok ? '✓ Richtig, ' : '✗ Falsch, ') + 'das ist ein ' + (istZork(w) ? 'Zork' : 'Glimm') + '.';
                karte.className = 'wesen-karte gross ' + (istZork(w) ? 'zork' : 'glimm');
                var weiter = h('button', { type: 'button', cls: 'knopf voll', text: nr < 9 ? 'Nächstes Wesen' : 'Auswertung' });
                weiter.addEventListener('click', function () { nr++; naechstes(); });
                testBereich.appendChild(h('div', { cls: 'knopfzeile' }, [weiter]));
                weiter.focus();
            }
            g.addEventListener('click', function () { antwort(false); });
            z.addEventListener('click', function () { antwort(true); });
            testBereich.appendChild(h('div', { cls: 'seiki-frage' }, [karte, h('div', {}, [h('p', { text: 'Glimm oder Zork?' }), h('div', { cls: 'knopfzeile' }, [g, z]), rueck])]));
        }
    }

    // ---------- Unüberwacht ----------
    var SAMMLUNG = (function () {
        var rnd = KI.zufall(7), out = [], toene = [12, 120, 220];
        for (var i = 0; i < 16; i++) {
            out.push(W(rnd() < .5 ? 'rund' : 'eckig', toene[i % 3] + Math.round(rnd() * 16 - 8), Math.floor(rnd() * 5), 1 + Math.floor(rnd() * 3), .85 + rnd() * .3));
        }
        return KI.mischen(out, KI.zufall(3));
    })();
    function unueberwacht(box) {
        box.classList.add('werk', 'seiki');
        box.appendChild(h('h4', { text: 'Runde 2: Lernen ohne Lehrer' }));
        box.appendChild(h('p', { html: 'Eine Forscherin bringt 16 Wesen von einem unbekannten Mond mit. Niemand weiß, welche Arten es dort gibt. <strong>Sortiere sie in Gruppen, die dir sinnvoll erscheinen</strong>: Tippe ein Wesen an, dann eine Gruppe. Wie viele Gruppen du bildest, entscheidest du.' }));
        var lager = h('div', { cls: 'wesen-galerie klein' });
        var gruppenBox = h('div', { cls: 'gruppen' });
        var plus = h('button', { type: 'button', cls: 'knopf', text: '+ neue Gruppe' });
        var fertig = h('button', { type: 'button', cls: 'knopf voll', text: 'Fertig: Was habe ich gemacht?' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Alles zurück' });
        var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        box.appendChild(lager);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [plus, fertig, neu]));
        box.appendChild(gruppenBox);
        box.appendChild(rueck);
        var gewaehlt = null, gruppen = [];
        var karten = SAMMLUNG.map(function (w, i) {
            var k = h('button', { type: 'button', cls: 'wesen-karte', 'aria-label': 'Wesen ' + (i + 1) });
            k.innerHTML = wesenSVG(w, 56);
            k.wesen = w;
            k.addEventListener('click', function () {
                if (gewaehlt === k) { k.classList.remove('gewaehlt'); gewaehlt = null; return; }
                if (gewaehlt) gewaehlt.classList.remove('gewaehlt');
                gewaehlt = k; k.classList.add('gewaehlt');
            });
            lager.appendChild(k);
            return k;
        });
        function neueGruppe() {
            var nr = gruppen.length;
            var g = h('div', { cls: 'gruppe', style: '--f:' + KI.farbe.cluster(nr) });
            var kopf = h('button', { type: 'button', cls: 'gruppe-kopf', text: 'Gruppe ' + String.fromCharCode(65 + nr) + ' ← hierher' });
            var inhalt = h('div', { cls: 'gruppe-inhalt' });
            kopf.addEventListener('click', function () {
                if (!gewaehlt) { rueck.className = 'rueck neutral'; rueck.textContent = 'Tippe zuerst ein Wesen an.'; return; }
                gewaehlt.classList.remove('gewaehlt');
                inhalt.appendChild(gewaehlt);
                gewaehlt = null; rueck.textContent = ''; rueck.className = 'rueck';
            });
            g.appendChild(kopf); g.appendChild(inhalt);
            g.inhalt = inhalt;
            gruppen.push(g);
            gruppenBox.appendChild(g);
        }
        neueGruppe(); neueGruppe();
        plus.addEventListener('click', function () { if (gruppen.length < 6) neueGruppe(); });
        neu.addEventListener('click', function () {
            karten.forEach(function (k) { lager.appendChild(k); k.classList.remove('gewaehlt'); });
            gruppenBox.textContent = ''; gruppen = []; neueGruppe(); neueGruppe(); rueck.textContent = ''; rueck.className = 'rueck';
        });
        fertig.addEventListener('click', function () {
            var offen = lager.children.length;
            if (offen) { rueck.className = 'rueck neutral'; rueck.textContent = 'Es liegen noch ' + offen + ' Wesen oben. Ordne alle zu.'; return; }
            var zeilen = [];
            var merkmale = [['Form', function (w) { return w.form; }], ['Farbe', function (w) { return w.ton < 60 ? 'rot' : w.ton < 170 ? 'grün' : 'blau'; }], ['Zacken', function (w) { return w.zacken; }], ['Augen', function (w) { return w.augen; }]];
            var reinheit = merkmale.map(function (m) {
                // Wie gut erklärt das Merkmal die Gruppen? Anteil Wesen, deren Merkmalswert in ihrer Gruppe am häufigsten ist
                var treffer = 0;
                gruppen.forEach(function (g) {
                    var zaehler = {};
                    Array.prototype.forEach.call(g.inhalt.children, function (k) { var v = m[1](k.wesen); zaehler[v] = (zaehler[v] || 0) + 1; });
                    var max = 0; Object.keys(zaehler).forEach(function (v) { max = Math.max(max, zaehler[v]); });
                    treffer += max;
                });
                return [m[0], treffer];
            });
            gruppen.forEach(function (g, i) {
                if (!g.inhalt.children.length) return;
                zeilen.push('Gruppe ' + String.fromCharCode(65 + i) + ': ' + g.inhalt.children.length + ' Wesen');
            });
            var best = reinheit.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
            rueck.className = 'rueck neutral';
            rueck.innerHTML = zeilen.join(' · ') + '<br>Passung je Merkmal (wie viele Wesen in ihrer Gruppe den häufigsten Wert haben, von 16): ' +
                reinheit.map(function (r) { return r[0] + ' ' + r[1]; }).join(', ') + '.<br><strong>Du hast vermutlich vor allem nach „' + best[0] + '“ sortiert.</strong> Vergleiche mit deinem Nachbarn: Habt ihr dieselben Gruppen? Wer hat recht?';
        });
    }

    // ---------- Bestärkend: drei Automaten ----------
    function bandit(box) {
        var ZUEGE = 30, chancen, gezogen, gewinn, zugNr, verlauf;
        box.classList.add('werk', 'seiki');
        box.appendChild(h('h4', { text: 'Runde 3: Lernen durch Belohnung' }));
        box.appendChild(h('p', { html: 'Drei Automaten, jeder zahlt mit einer anderen (geheimen) Wahrscheinlichkeit einen Punkt aus. Du hast <strong>30 Züge</strong>. Niemand sagt dir, welcher Automat der beste ist. Du bekommst nur die Belohnung.' }));
        var reihe = h('div', { cls: 'automaten' });
        var stand = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Neues Spiel' });
        var agentBox = h('div', { cls: 'agent', hidden: '' });
        box.appendChild(reihe);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [stand, neu]));
        box.appendChild(rueck);
        box.appendChild(agentBox);
        var knoepfe = [];
        ['🍒', '🔔', '⭐'].forEach(function (sym, i) {
            var b = h('button', { type: 'button', cls: 'automat' });
            b.innerHTML = '<span class="sym">' + sym + '</span><span class="name">Automat ' + 'ABC'[i] + '</span><span class="zaehl"></span>';
            b.addEventListener('click', function () { ziehe(i); });
            reihe.appendChild(b);
            knoepfe.push(b);
        });
        function start() {
            chancen = KI.mischen([.25, .5, .7]);
            gezogen = [0, 0, 0]; gewinn = [0, 0, 0]; zugNr = 0; verlauf = [];
            knoepfe.forEach(function (b) { b.disabled = false; b.classList.remove('treffer', 'niete'); });
            rueck.textContent = ''; rueck.className = 'rueck'; agentBox.hidden = true;
            zeige();
        }
        function zeige() {
            knoepfe.forEach(function (b, i) { b.querySelector('.zaehl').textContent = gezogen[i] ? gewinn[i] + ' von ' + gezogen[i] : '–'; });
            stand.textContent = 'Zug ' + zugNr + ' von ' + ZUEGE + ' · Punkte: ' + (gewinn[0] + gewinn[1] + gewinn[2]);
        }
        function ziehe(i) {
            if (zugNr >= ZUEGE) return;
            var treffer = Math.random() < chancen[i];
            gezogen[i]++; if (treffer) gewinn[i]++; zugNr++; verlauf.push(i);
            knoepfe.forEach(function (b) { b.classList.remove('treffer', 'niete'); });
            void knoepfe[i].offsetWidth;
            knoepfe[i].classList.add(treffer ? 'treffer' : 'niete');
            zeige();
            if (zugNr === ZUEGE) ende();
        }
        function ende() {
            knoepfe.forEach(function (b) { b.disabled = true; });
            var best = chancen.indexOf(Math.max.apply(null, chancen));
            var anteil = verlauf.slice(15).filter(function (i) { return i === best; }).length;
            rueck.className = 'rueck neutral';
            rueck.innerHTML = 'Die geheimen Chancen waren: A ' + Math.round(chancen[0] * 100) + ' %, B ' + Math.round(chancen[1] * 100) + ' %, C ' + Math.round(chancen[2] * 100) + ' %. ' +
                'In deinen letzten 15 Zügen hast du ' + anteil + '-mal den besten Automaten gewählt. Wann hast du aufgehört auszuprobieren? Hättest du länger probieren sollen?';
            agentZeigen();
        }
        function agentZeigen() {
            agentBox.hidden = false;
            agentBox.textContent = '';
            agentBox.appendChild(h('h5', { text: 'Jetzt spielt ein lernender Agent (1000 Spiele zu je 30 Zügen)' }));
            agentBox.appendChild(h('p', { html: 'Strategie <em>ε-gierig</em>: Meistens nimmt er den Automaten mit der bisher besten Quote (ausnutzen), mit Wahrscheinlichkeit ε einen zufälligen (ausprobieren).' }));
            var r = h('div', { cls: 'regler' }), inp = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '0.1', id: 'eps-' + Math.random().toString(36).slice(2) }), out = h('output');
            r.appendChild(h('label', { for: inp.id, text: 'ε (Neugier)' })); r.appendChild(inp); r.appendChild(out);
            var erg = h('div', { cls: 'anzeige' });
            agentBox.appendChild(r); agentBox.appendChild(erg);
            function rechne() {
                var eps = +inp.value; out.textContent = eps.toFixed(2).replace('.', ',');
                var rnd = KI.zufall(42), summe = 0, bestAnteil = 0, best = chancen.indexOf(Math.max.apply(null, chancen));
                for (var s = 0; s < 1000; s++) {
                    var n = [0, 0, 0], g = [0, 0, 0];
                    for (var t = 0; t < ZUEGE; t++) {
                        var a;
                        if (rnd() < eps || t < 3) a = t < 3 ? t : Math.floor(rnd() * 3);
                        else { var q = [0, 1, 2].map(function (i) { return n[i] ? g[i] / n[i] : 1; }); a = q.indexOf(Math.max.apply(null, q)); }
                        var tr = rnd() < chancen[a]; n[a]++; if (tr) g[a]++;
                        summe += tr ? 1 : 0; if (a === best) bestAnteil++;
                    }
                }
                erg.textContent = 'Durchschnitt: ' + (summe / 1000).toFixed(1).replace('.', ',') + ' Punkte pro Spiel (du: ' + (gewinn[0] + gewinn[1] + gewinn[2]) + ')\n' +
                    'bester Automat gewählt: ' + Math.round(bestAnteil / 300) + ' % der Züge\nzum Vergleich: immer der beste Automat = ' + (ZUEGE * Math.max.apply(null, chancen)).toFixed(1).replace('.', ',') + ' Punkte, zufällig = ' + (ZUEGE * (chancen[0] + chancen[1] + chancen[2]) / 3).toFixed(1).replace('.', ',') + ' Punkte';
            }
            inp.addEventListener('input', rechne);
            rechne();
        }
        neu.addEventListener('click', start);
        start();
    }

    // ---------- Gitterwelt (Q-Lernen) ----------
    function gitterwelt(box) {
        var B = 5, H = 5, START = [0, 4], ZIEL = [4, 0], LOCH = [[3, 1], [1, 3]], WAND = [[1, 1], [2, 1], [3, 3]];
        var AKT = [[0, -1, '↑'], [1, 0, '→'], [0, 1, '↓'], [-1, 0, '←']];
        var ALPHA = .5, GAMMA = .9, EPS = .2, Q, episoden, rnd = KI.zufall(5);
        box.classList.add('werk', 'seiki');
        box.appendChild(h('h4', { text: 'Bonus: Ein Roboter lernt seinen Weg' }));
        box.appendChild(h('p', { html: 'Der Roboter 🤖 soll zum Akku 🔋. Er kennt den Plan nicht. Er bekommt <strong>+10 Punkte am Akku</strong>, <strong>−10 Punkte im Loch</strong>, sonst nichts. Jede Runde (Episode) läuft er los, merkt sich für jedes Feld und jede Richtung, was sie ihm am Ende eingebracht hat, und verbessert seine Strategie. Pfeile zeigen die Richtung, die er auf jedem Feld gerade für die beste hält; je grüner, desto mehr Belohnung erwartet er.' }));
        var gitter = h('div', { cls: 'gitter', role: 'grid', 'aria-label': 'Gitterwelt 5 mal 5' });
        var stand = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        var eins = h('button', { type: 'button', cls: 'knopf', text: '1 Episode zeigen' });
        var hundert = h('button', { type: 'button', cls: 'knopf voll', text: '+100 Episoden' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Vergessen (neu)' });
        box.appendChild(gitter);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [eins, hundert, neu, stand]));
        var zellen = [];
        for (var y = 0; y < H; y++) for (var x = 0; x < B; x++) {
            var z = h('div', { cls: 'zelle', role: 'gridcell' });
            gitter.appendChild(z); zellen.push(z);
        }
        function gleich(a, b) { return a[0] === b[0] && a[1] === b[1]; }
        function istIn(p, liste) { return liste.some(function (q) { return gleich(p, q); }); }
        function schritt(p, a) {
            var n = [p[0] + AKT[a][0], p[1] + AKT[a][1]];
            if (n[0] < 0 || n[1] < 0 || n[0] >= B || n[1] >= H || istIn(n, WAND)) n = p;
            var r = gleich(n, ZIEL) ? 10 : istIn(n, LOCH) ? -10 : 0;
            return { p: n, r: r, ende: r !== 0 };
        }
        function q(p) { return Q[p[1] * B + p[0]]; }
        function wahl(p, eps) {
            if (rnd() < eps) return Math.floor(rnd() * 4);
            var v = q(p), m = Math.max.apply(null, v), kand = [];
            v.forEach(function (x, i) { if (x === m) kand.push(i); });
            return kand[Math.floor(rnd() * kand.length)];
        }
        function episode(aufzeichnen) {
            var p = START.slice(), weg = [p], n = 0;
            while (n++ < 60) {
                var a = wahl(p, EPS), s = schritt(p, a);
                var ziel = s.ende ? s.r : s.r + GAMMA * Math.max.apply(null, q(s.p));
                q(p)[a] += ALPHA * (ziel - q(p)[a]);
                p = s.p; weg.push(p);
                if (s.ende) break;
            }
            episoden++;
            return aufzeichnen ? weg : null;
        }
        function zeichne(roboter) {
            zellen.forEach(function (z, i) {
                var p = [i % B, Math.floor(i / B)];
                z.className = 'zelle'; z.textContent = ''; z.style.background = '';
                if (istIn(p, WAND)) { z.classList.add('wand'); return; }
                if (gleich(p, ZIEL)) { z.textContent = '🔋'; z.classList.add('ziel'); }
                else if (istIn(p, LOCH)) { z.textContent = '🕳️'; z.classList.add('loch'); }
                else {
                    var v = q(p), m = Math.max.apply(null, v);
                    if (m > 0.01) {
                        z.style.background = 'rgba(22,163,74,' + Math.min(.7, m / 12).toFixed(2) + ')';
                        z.textContent = AKT[v.indexOf(m)][2];
                    } else if (m < -0.01) z.style.background = 'rgba(220,38,38,.15)';
                }
                if (roboter && gleich(p, roboter)) { z.textContent = '🤖'; z.classList.add('robo'); }
                else if (gleich(p, START) && !z.textContent) z.textContent = '·';
            });
            stand.textContent = 'Episoden: ' + episoden;
        }
        function reset() { Q = []; for (var i = 0; i < B * H; i++) Q.push([0, 0, 0, 0]); episoden = 0; zeichne(START); }
        var laeuft = false;
        eins.addEventListener('click', function () {
            if (laeuft) return;
            laeuft = true;
            var weg = episode(true), i = 0;
            (function tick() {
                zeichne(weg[i]);
                if (++i < weg.length) setTimeout(tick, 140); else laeuft = false;
            })();
        });
        hundert.addEventListener('click', function () { if (laeuft) return; for (var i = 0; i < 100; i++) episode(false); zeichne(START); });
        neu.addEventListener('click', function () { if (!laeuft) reset(); });
        reset();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-sei-ki="ueberwacht"]').forEach(ueberwacht);
        document.querySelectorAll('[data-sei-ki="unueberwacht"]').forEach(unueberwacht);
        document.querySelectorAll('[data-bandit]').forEach(bandit);
        document.querySelectorAll('[data-gitterwelt]').forEach(gitterwelt);
    });
})();
