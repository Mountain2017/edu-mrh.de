/*
 * Spezielle Relativitätstheorie (Physik 11) – Bausteine der Stationsseiten
 *   (die Simulationen stehen in simulationen.js)
 *
 *   <ul class="quiz" data-quiz="a:Text A|b:Text B">        Auswahl-Quiz: je <li data-loesung="a"> eine Frage,
 *       <li data-loesung="a">… <span class="erkl-text">…</span></li>    Erklärung erscheint nach der Antwort
 *   <div data-sortieren><ol><li data-ph="…">…</li>…</ol></div>   Reihenfolge anklicken (Liste in richtiger Reihenfolge)
 *   <div class="lw" data-loesungsweg="…">                  Tipps stufenweise, Lösung nur durch Gedrückthalten
 *       <template data-stufe="Tipp 1">…</template> … <template data-stufe="Lösung" data-halten>…</template>
 *   <div class="vorhersage" data-vorhersage="s2-rennen" data-optionen="A|B|gleich">Frage</div>
 *   <div data-nach="s2-rennen">…</div>                      erscheint erst, wenn die Vorhersage abgegeben ist
 *       (data-frei statt data-optionen: freier Text, mindestens 15 Zeichen)
 *   <div data-plan="4"></div>                               Plan-Karte, Stand nach Station 4 (wächst von 1 bis 5)
 *   <div data-annahmen="3"></div>                           Annahmen-Tafel A1–A4, Stand nach Station 3
 *   <div data-fertig="3"></div>                             „Station erledigt“ (Häkchen auf der Übersicht:
 *                                                           <div class="station-card" data-station="3">)
 *
 * Alles bleibt im Browser (localStorage: relVh:…, relAnnahmen, relFertig). Keine Abhängigkeiten;
 * Formeln rendert KaTeX aus /embed/katex/, wenn es eingebunden ist.
 */
(function () {
    'use strict';

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
    function mischen(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function optionen(s) {
        return String(s || '').split('|').map(function (p) {
            var k = p.indexOf(':');
            return k < 0 ? [p.trim(), p.trim()] : [p.slice(0, k).trim(), p.slice(k + 1).trim()];
        }).filter(function (o) { return o[0]; });
    }
    function lies(key, standard) {
        try { var v = localStorage.getItem(key); return v === null ? standard : JSON.parse(v); } catch (e) { return standard; }
    }
    function schreibe(key, wert) { try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* privat: egal */ } }
    function mathe(el) {
        if (window.renderMathInElement) {
            window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
        }
    }

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
            var frage = h('div', { cls: 'frage' });
            inhalt.forEach(function (n) { frage.appendChild(n); });
            var wahl = h('div', { cls: 'wahl', role: 'group' });
            var erkl = h('p', { cls: 'erkl', 'aria-live': 'polite' });
            erkl.hidden = true;
            ops.forEach(function (o) {
                var b = h('button', { type: 'button', 'data-w': o[0], text: o[1] });
                b.addEventListener('click', function () {
                    Array.prototype.forEach.call(wahl.children, function (x) { x.classList.toggle('gewaehlt', x === b); });
                    var ok = o[0] === loesung;
                    li.classList.toggle('richtig', ok);
                    li.classList.toggle('falsch', !ok);
                    erkl.hidden = false;
                    erkl.textContent = ok ? '✓ ' + (erklText ? erklText.textContent : 'Richtig.') : '✗ Nicht ganz. Überlege noch einmal und probiere eine andere Antwort.';
                    zaehle();
                });
                wahl.appendChild(b);
            });
            li.textContent = '';
            li.appendChild(h('div', { cls: 'fall' }, [frage, wahl]));
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
        var schritte = Array.prototype.slice.call(ol.children).map(function (li, i) { return { nr: i, html: li.innerHTML, ph: li.getAttribute('data-ph') || '' }; });
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
                var b = h('button', { type: 'button', html: s.html });
                b.addEventListener('click', function () { gewaehlt.push({ s: s, knopf: b }); b.disabled = true; zeige(); });
                quelle.appendChild(h('li', {}, [b]));
            });
            mathe(quelle);
            zeige();
        }
        function zeige() {
            ziel.textContent = '';
            var fertig = gewaehlt.length === schritte.length;
            gewaehlt.forEach(function (g, i) {
                var li = h('li', { html: g.s.html });
                if (fertig) {
                    li.className = g.s.nr === i ? 'ok' : 'nein';
                    if (g.s.ph) li.appendChild(h('span', { cls: 'ph', text: g.s.ph }));
                }
                ziel.appendChild(li);
            });
            mathe(ziel);
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

    // ---------- Lösungsweg: Tipps stufenweise, Lösung nur durch Gedrückthalten ----------
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
            mathe(teil);
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

    // ---------- Vorhersage-Sperre: erst tippen, dann beobachten ----------
    function vorhersage(box) {
        var key = box.getAttribute('data-vorhersage');
        var nach = Array.prototype.slice.call(document.querySelectorAll('[data-nach="' + key + '"]'));
        var hinweis = h('div', { cls: 'gesperrt-hinweis', text: '🔒 Hier geht es weiter, sobald du oben deine Vorhersage abgegeben hast. Es gibt keine Punkte für „richtig“: Es zählt, dass du dich festlegst.' });
        if (nach.length) nach[0].parentNode.insertBefore(hinweis, nach[0]);
        var stand = h('p', { cls: 'vh-stand', 'aria-live': 'polite' });
        function setze(wert) {
            var offen = wert !== null && wert !== '';
            nach.forEach(function (n) { n.hidden = !offen; });
            hinweis.hidden = offen;
            stand.textContent = offen ? '✔ Deine Vorhersage ist gespeichert: „' + wert + '“. Jetzt prüfen!' : '';
        }
        var gespeichert = lies('relVh:' + key, null);
        // Für Lehrkräfte und zum Testen: Seite mit ?offen aufrufen, dann ist nichts gesperrt
        if (/[?&]offen\b/.test(location.search) && gespeichert === null) gespeichert = '(Ansicht ohne Sperre)';
        if (box.hasAttribute('data-frei')) {
            var feld = h('textarea', { rows: '2', style: 'width:100%', 'aria-label': 'Deine Vorhersage', placeholder: 'Schreibe in einem Satz, was du erwartest …' });
            if (gespeichert && gespeichert.charAt(0) !== '(') feld.value = gespeichert;
            var ok = h('button', { type: 'button', cls: 'knopf', text: 'Vorhersage festhalten' });
            ok.addEventListener('click', function () {
                var t = feld.value.trim();
                if (t.length < 15) { stand.textContent = 'Schreibe einen ganzen Satz (mindestens 15 Zeichen).'; return; }
                schreibe('relVh:' + key, t); setze(t);
            });
            box.appendChild(feld); box.appendChild(h('div', { cls: 'knopfzeile' }, [ok]));
        } else {
            var wahl = h('div', { cls: 'wahl', role: 'group' });
            optionen(box.getAttribute('data-optionen')).forEach(function (o) {
                var b = h('button', { type: 'button', text: o[1] });
                if (gespeichert === o[1]) b.classList.add('gewaehlt');
                b.addEventListener('click', function () {
                    Array.prototype.forEach.call(wahl.children, function (x) { x.classList.toggle('gewaehlt', x === b); });
                    schreibe('relVh:' + key, o[1]); setze(o[1]);
                });
                wahl.appendChild(b);
            });
            box.appendChild(wahl);
        }
        box.appendChild(stand);
        setze(gespeichert);
    }

    // ---------- Plan-Karte ----------
    function dreieck(n) {
        if (n < 2) return '<div class="offen-text">Das Bild zum Plan entsteht in Station 2 und bekommt in Station 4 seine endgültige Bedeutung.</div>';
        var licht = n >= 4;
        var hyp = licht ? 'c · Δt' : 'c · t';
        var unten = licht ? 'v · Δt' : 'v · t';
        var rechts = licht ? 'c · Δt₀' : 'Weg quer';
        var unter = licht
            ? '<text x="150" y="196" text-anchor="middle" font-size="13" fill="#0f172a">(c·Δt)² = (v·Δt)² + (c·Δt₀)²  →  Δt = γ · Δt₀</text><text x="150" y="216" text-anchor="middle" font-size="13" font-weight="700" fill="#115e59">γ = 1 / √(1 − v²/c²)   (immer ≥ 1)</text>'
            : '<text x="150" y="196" text-anchor="middle" font-size="13" fill="#0f172a">Wettschwimmen: schräg halten, um quer anzukommen</text><text x="150" y="216" text-anchor="middle" font-size="13" fill="#64748b">Dasselbe Dreieck kommt in Station 4 wieder.</text>';
        return '<svg viewBox="0 0 300 225" role="img" aria-label="Rechtwinkliges Dreieck: Hypotenuse ' + hyp + ', untere Kathete ' + unten + ', rechte Kathete ' + rechts + '">' +
            '<polygon points="30,160 250,160 250,30" fill="#fef9c3" stroke="none"/>' +
            '<line x1="30" y1="160" x2="250" y2="160" stroke="#2563eb" stroke-width="4"/>' +
            '<line x1="250" y1="160" x2="250" y2="30" stroke="#ea580c" stroke-width="4"/>' +
            '<line x1="30" y1="160" x2="250" y2="30" stroke="#ca8a04" stroke-width="4"/>' +
            '<path d="M235,160 v-15 h15" fill="none" stroke="#334155" stroke-width="1.5"/>' +
            '<text x="140" y="178" text-anchor="middle" font-size="15" font-weight="700" fill="#2563eb">' + unten + '</text>' +
            '<text x="258" y="100" font-size="15" font-weight="700" fill="#ea580c">' + (licht ? rechts : '') + '</text>' +
            (licht ? '' : '<text x="244" y="100" text-anchor="end" font-size="14" font-weight="700" fill="#ea580c">' + rechts + '</text>') +
            '<text x="125" y="82" text-anchor="middle" font-size="15" font-weight="700" fill="#ca8a04" transform="rotate(-30.6 125 82)">' + hyp + '</text>' +
            unter + '</svg>';
    }
    function plan(box) {
        var n = parseInt(box.getAttribute('data-plan'), 10) || 1;
        function li(nr, ab, neuBei, html, offenText) {
            var offen = n < ab;
            var e = h('li', { cls: offen ? 'offen' : (neuBei.indexOf(n) >= 0 ? 'neu' : '') });
            e.innerHTML = '<span class="pn">' + nr + '</span>' + (offen ? offenText : html);
            return e;
        }
        var regeln = n >= 2
            ? '<b>Zwei Grundregeln (Postulate):</b> P1: In jedem Inertialsystem gelten dieselben Naturgesetze. P2: Licht hat für alle dieselbe Geschwindigkeit c.'
            : '<b>Grundregel:</b> In jedem Inertialsystem laufen mechanische Vorgänge gleich ab (Relativitätsprinzip). <em>Eine zweite Regel kommt in Station 2.</em>';
        var s1 = n >= 3
            ? '<b>Systeme und Ereignisse festlegen.</b> Wer ist Bea (S), wer ist Zoe (S′), wie groß ist v? Welche <b>zwei Ereignisse</b> begrenzen den Vorgang (Was? Wo? Wann?)'
            : '<b>Systeme festlegen.</b> Wer ist Bea (S), wer ist Zoe (S′)? Mit welcher Geschwindigkeit v bewegen sie sich gegeneinander?';
        var s2 = n >= 5
            ? '<b>Das Eigen-System finden.</b> Zeit: Für wen passieren beide Ereignisse <b>am selben Ort</b>? Der misst die Eigenzeit Δt₀. Länge: Wer <b>ruht</b> relativ zum Gegenstand? Der misst die Eigenlänge L₀.'
            : '<b>Das Eigen-System finden.</b> Für wen passieren beide Ereignisse <b>am selben Ort</b> (eine einzige Uhr genügt)? Der misst die Eigenzeit Δt₀.';
        var s3 = n >= 5
            ? '<b>Mit γ umrechnen.</b> Alle anderen messen: Zeit <b>mal</b> γ (Δt = γ·Δt₀), Länge <b>durch</b> γ (L = L₀/γ, nur in Bewegungsrichtung).'
            : '<b>Mit γ umrechnen.</b> Alle anderen messen eine längere Zeit: Δt = γ·Δt₀.';
        var liste = h('ol', { cls: 'plan-schritte' }, [
            li('★', 1, [1, 2], regeln, ''),
            li('①', 1, [1, 3], s1, ''),
            li('②', 4, [4, 5], s2, '<b>Schritt ②</b> kommt in Station 4.'),
            li('③', 4, [4, 5], s3, '<b>Schritt ③</b> kommt in Station 4.')
        ]);
        var merk = n >= 5 ? 'Merke: Eigenzeit ist die kürzeste Zeit, Eigenlänge ist die größte Länge. Bei Alltagstempo ist γ praktisch 1, dann gilt die klassische Physik.'
            : n >= 4 ? 'Merke: Eigenzeit ist die kürzeste Zeit. Bei Alltagstempo ist γ praktisch 1.'
            : n >= 2 ? 'Offene Frage: Geschwindigkeit = Strecke : Zeit. Wenn c für alle gleich ist, was passiert dann mit Strecke und Zeit?'
            : 'Offene Frage: Gilt das auch für Licht?';
        box.className = 'plan';
        box.appendChild(h('div', { cls: 'plan-kopf' }, [h('span', { text: '🧭 Dein Plan für jede Relativitäts-Frage' }), h('small', { text: 'Stand nach Station ' + n + (n < 5 ? ' (wächst weiter)' : ' (vollständig)') })]));
        box.appendChild(h('div', { cls: 'plan-raster' }, [liste, h('div', { cls: 'plan-bild', html: dreieck(n) })]));
        box.appendChild(h('p', { cls: 'plan-merk', text: merk }));
    }

    // ---------- Annahmen-Tafel ----------
    var ANNAHMEN = [
        ['A1', 'Uhren gehen für alle gleich schnell.'],
        ['A2', 'Was für eine Person gleichzeitig passiert, passiert für alle gleichzeitig.'],
        ['A3', 'Ein Gegenstand ist für alle gleich lang.'],
        ['A4', 'Geschwindigkeiten addieren sich einfach: u = u′ + v.']
    ];
    var VERGLEICH = {
        1: 'Alle vier Annahmen gelten (bisher). Sie stecken unausgesprochen in jeder Rechnung der Mechanik aus Klasse 10.',
        2: 'A4: gefallen, jedenfalls für Licht (Michelson-Morley: kein Ätherwind; Doppelsterne und Pionen: kein c + v). A1 bis A3: wackeln, denn Geschwindigkeit = Strecke : Zeit. Wenn c für alle gleich ist, müssen Strecke oder Zeit vom Beobachter abhängen.',
        3: 'A2: gefallen (Lampe in der Wagenmitte: Für Zoe erreichen die Lichtsignale beide Türen gleichzeitig, für Bea die hintere zuerst, weil c in beiden Richtungen gleich ist). A1 und A3 wackeln weiter.',
        4: 'A1: gefallen (Lichtuhr: Die bewegte Uhr tickt für Bea langsamer, Δt = γ·Δt₀; bestätigt mit Atomuhren in Flugzeugen). A3 wackelt.',
        5: 'A3: gefallen (Myonen: Im Myon-System ist die Strecke um den Faktor γ kürzer, L = L₀/γ). A4 ist endgültig ersetzt durch die relativistische Addition, bei der nie mehr als c herauskommt.',
        7: 'Alle vier Annahmen sind gefallen, aber nicht wertlos: Für v ≪ c ist γ praktisch 1, dann stimmen sie auf viele Stellen genau. Die klassische Mechanik ist der Grenzfall für kleine Geschwindigkeiten.'
    };
    var ZIEL = { 1: [], 2: ['A4'], 3: ['A2'], 4: ['A1'], 5: ['A3', 'A4'], 7: [] };
    function annahmen(box) {
        var n = parseInt(box.getAttribute('data-annahmen'), 10) || 1;
        var daten = lies('relAnnahmen', {});
        box.className = 'annahmen';
        box.appendChild(h('div', { cls: 'annahmen-kopf', text: '📋 Annahmen-Tafel: Stand nach Station ' + n }));
        var tb = h('tbody');
        ANNAHMEN.forEach(function (a) {
            var d = daten[a[0]] || { s: 'gilt', n: '' };
            var sel = h('select', { 'aria-label': 'Status von ' + a[0] });
            [['gilt', 'gilt (bisher)'], ['wackelt', 'wackelt'], ['gefallen', 'gefallen']].forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
            sel.value = d.s; sel.className = d.s;
            var notiz = h('input', { type: 'text', 'aria-label': 'Beobachtung zu ' + a[0], placeholder: 'Welche Beobachtung zwingt dazu?', value: d.n || '' });
            function sichern() {
                sel.className = sel.value;
                var alle = lies('relAnnahmen', {});
                alle[a[0]] = { s: sel.value, n: notiz.value };
                schreibe('relAnnahmen', alle);
            }
            sel.addEventListener('change', sichern);
            notiz.addEventListener('change', sichern);
            tb.appendChild(h('tr', { cls: (ZIEL[n] || []).indexOf(a[0]) >= 0 ? 'ziel' : '' }, [h('td', { cls: 'nr', text: a[0] }), h('td', { text: a[1] }), h('td', {}, [sel]), h('td', {}, [notiz])]));
        });
        box.appendChild(h('table', {}, [h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: 'Alltagsannahme' }), h('th', { text: 'Status' }), h('th', { text: 'Begründung' })])]), tb]));
        var fuss = h('div', { cls: 'fuss' });
        var lw = h('div', { cls: 'lw lw-kurz', 'data-loesungsweg': '' });
        var t = document.createElement('template');
        t.setAttribute('data-stufe', 'Vergleichen'); t.setAttribute('data-halten', '');
        t.innerHTML = '<p>' + (VERGLEICH[n] || '') + '</p>';
        lw.appendChild(t);
        fuss.appendChild(h('p', { style: 'margin:0;font-size:.9rem', text: 'Setze den Status so, wie er nach dieser Station ist, und notiere die Beobachtung. Dein Stand wird auf diesem Gerät gespeichert und gilt für alle Stationen. Übertrage ihn ins Logbuch.' }));
        fuss.appendChild(lw);
        box.appendChild(fuss);
        loesungsweg(lw);
    }

    // ---------- Station erledigt ----------
    function fertig(box) {
        var nr = box.getAttribute('data-fertig');
        var liste = lies('relFertig', []);
        box.className = 'fertig-box';
        var text = h('p');
        var knopf = h('button', { type: 'button', cls: 'knopf' });
        function zeige() {
            var da = liste.indexOf(nr) >= 0;
            text.innerHTML = da ? '<strong>✓ Station ' + nr + ' ist als erledigt markiert.</strong> Trage sie im Logbuch ein und hole dir den Checkpoint bei deiner Lehrkraft.'
                : '<strong>Fertig?</strong> Selbsttest geschafft, Blatt ausgefüllt, Annahmen-Tafel und Plan-Karte ins Logbuch übertragen? Dann hake die Station ab und geh zum Checkpoint.';
            knopf.textContent = da ? 'Häkchen entfernen' : 'Station ' + nr + ' abhaken';
        }
        knopf.addEventListener('click', function () {
            liste = lies('relFertig', []);
            var i = liste.indexOf(nr);
            if (i >= 0) liste.splice(i, 1); else liste.push(nr);
            schreibe('relFertig', liste); zeige();
        });
        box.appendChild(text); box.appendChild(knopf);
        zeige();
    }

    document.addEventListener('DOMContentLoaded', function () {
        mathe(document.body);
        document.querySelectorAll('[data-quiz]').forEach(quiz);
        document.querySelectorAll('[data-sortieren]').forEach(sortieren);
        document.querySelectorAll('[data-plan]').forEach(plan);
        document.querySelectorAll('[data-annahmen]').forEach(annahmen);
        document.querySelectorAll('.lw[data-loesungsweg]').forEach(function (b) { if (!b.querySelector('.lw-knoepfe')) loesungsweg(b); });
        document.querySelectorAll('[data-vorhersage]').forEach(vorhersage);
        document.querySelectorAll('[data-fertig]').forEach(fertig);
        var erledigt = lies('relFertig', []);
        document.querySelectorAll('.station-card[data-station]').forEach(function (k) { k.classList.toggle('erledigt', erledigt.indexOf(k.getAttribute('data-station')) >= 0); });
    });
})();
