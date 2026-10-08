/*
 * Formale Sprachen (Informatik 13) – interaktive Aufgaben der Stationsseiten
 *
 *   1.1  <ul data-detektiv>        Fehler-Detektiv: Syntax-, Semantikfehler oder korrekt?
 *        <div data-satzbau>        Satzbaukasten: Syntax prüft der Rechner, Sinn nur du
 *   1.2  <div data-tastatur>       Alphabet-Tastatur: Wörter, Länge, leeres Wort
 *        <div data-wortmenge>      Wie viele Wörter der Länge n gibt es? (|A|^n)
 *        <div data-sprachpruefer>  L1, L2, L3 über a–z mit Suchaufträgen
 *        <div data-mengenbild>     L ⊆ A* ⊆ alle Zeichenketten als Mengenbild
 *        <div data-smileyregeln>   Erst die Regeln legen die Sprache der Smileys fest
 *   alle <div class="lw" data-loesungsweg="…">  Tipps stufenweise, Lösung nur durch Gedrückthalten
 *   (Werkzeuge zu 1.3 und 1.4: grammatik.js, zu 1.5: automaten.js)
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser, nichts wird gespeichert.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';

    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(c); });
        return e;
    }
    function svgEl(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }
    function leeren(e) { while (e.firstChild) e.removeChild(e.firstChild); }
    // Zeichenkette als Kacheln; leeres Wort als ε
    function kacheln(ziel, wort) {
        leeren(ziel);
        if (wort.length === 0) { ziel.appendChild(h('span', { cls: 'leer', text: 'ε (leeres Wort)' })); return; }
        Array.from(wort).forEach(function (z) { ziel.appendChild(h('span', { text: z === ' ' ? '␣' : z })); });
    }
    function zeigeWort(w) { return w.length === 0 ? 'ε' : w; }
    function badge(ok) { return h('span', { cls: 'badge ' + (ok ? 'ja' : 'nein'), text: ok ? '✓' : '✗' }); }

    // =====================================================================
    // 1.1 Fehler-Detektiv
    // <li data-loesung="syntax|semantik|korrekt" data-gebiet="…"><span class="ausdruck">…</span><span class="erkl-text">…</span></li>
    // =====================================================================
    var WAHL = [['syntax', 'Syntaxfehler'], ['semantik', 'Semantikfehler'], ['korrekt', 'korrekt']];

    function detektiv(liste) {
        var faelle = Array.from(liste.querySelectorAll('li'));
        var stand = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Alle zurücksetzen' });
        liste.parentNode.insertBefore(h('div', { cls: 'knopfzeile' }, [stand, neu]), liste.nextSibling);

        function zaehle() {
            var richtig = faelle.filter(function (li) { return li.classList.contains('richtig'); }).length;
            var bearbeitet = faelle.filter(function (li) { return li.classList.contains('richtig') || li.classList.contains('falsch'); }).length;
            stand.textContent = richtig + ' von ' + faelle.length + ' richtig' + (bearbeitet < faelle.length ? ' (' + (faelle.length - bearbeitet) + ' noch offen)' : '') +
                (richtig === faelle.length ? ' – stark, alle erkannt! 🎉' : '');
        }

        faelle.forEach(function (li) {
            var ausdruck = li.querySelector('.ausdruck');
            var text = li.querySelector('.erkl-text');
            var erkl = h('p', { cls: 'erkl', 'aria-live': 'polite' });
            var wahl = h('div', { cls: 'wahl', role: 'group', 'aria-label': 'Einordnung' });
            WAHL.forEach(function (w) {
                var b = h('button', { type: 'button', 'data-w': w[0], text: w[1] });
                b.addEventListener('click', function () {
                    wahl.querySelectorAll('button').forEach(function (x) { x.classList.toggle('gewaehlt', x === b); });
                    var ok = w[0] === li.getAttribute('data-loesung');
                    li.classList.toggle('richtig', ok);
                    li.classList.toggle('falsch', !ok);
                    erkl.textContent = (ok ? 'Richtig. ' : 'Nicht ganz. ') + (ok ? text.textContent : 'Schau noch einmal: Stimmt schon die Form, oder nur die Bedeutung nicht?');
                    zaehle();
                });
                wahl.appendChild(b);
            });
            text.hidden = true;
            var fall = h('div', { cls: 'fall' }, [h('span', { cls: 'gebiet', text: li.getAttribute('data-gebiet') }), ausdruck, wahl]);
            li.insertBefore(fall, li.firstChild);
            li.appendChild(erkl);
        });
        neu.addEventListener('click', function () {
            faelle.forEach(function (li) {
                li.classList.remove('richtig', 'falsch');
                li.querySelectorAll('.wahl button').forEach(function (b) { b.classList.remove('gewaehlt'); });
                li.querySelector('.erkl').textContent = '';
            });
            zaehle();
        });
        zaehle();
    }

    // =====================================================================
    // 1.1 Satzbaukasten
    //   Regeln: Satz = Subjekt Verb Objekt.  Subjekt = "Der" NomenM | "Die" NomenF.
    //           Objekt = "den" NomenM | "die" NomenF.
    // =====================================================================
    var WOERTER = [
        { w: 'Der', art: 'art', fall: 'nomM' }, { w: 'Die', art: 'art', fall: 'nomF' },
        { w: 'den', art: 'art', fall: 'akkM' }, { w: 'die', art: 'art', fall: 'akkF' },
        { w: 'Hund', art: 'nomen', gen: 'M' }, { w: 'Schüler', art: 'nomen', gen: 'M' }, { w: 'Knochen', art: 'nomen', gen: 'M' },
        { w: 'Katze', art: 'nomen', gen: 'F' }, { w: 'Lehrerin', art: 'nomen', gen: 'F' }, { w: 'Klausur', art: 'nomen', gen: 'F' },
        { w: 'Zeitung', art: 'nomen', gen: 'F' }, { w: 'Maus', art: 'nomen', gen: 'F' },
        { w: 'frisst', art: 'verb' }, { w: 'schreibt', art: 'verb' }, { w: 'liest', art: 'verb' }, { w: 'jagt', art: 'verb' }, { w: 'korrigiert', art: 'verb' }
    ];
    function wortInfo(w) { return WOERTER.filter(function (x) { return x.w === w; })[0]; }

    // liefert { ok, fehler, regel } – prüft nur die Form, nie den Sinn
    function pruefeSatz(satz) {
        var t = satz.map(wortInfo);
        if (t.length === 0) return { ok: false, fehler: 'Noch kein Wort gelegt.', regel: '' };
        function teil(i, erwartet, regel) { return { ok: false, fehler: erwartet, regel: regel, stelle: i }; }
        if (t[0].art !== 'art' || (t[0].fall !== 'nomM' && t[0].fall !== 'nomF'))
            return teil(0, 'Der Satz muss mit „Der“ oder „Die“ beginnen (Subjekt).', 'Subjekt');
        if (!t[1]) return teil(1, 'Nach dem Artikel fehlt ein Nomen.', 'Subjekt');
        if (t[1].art !== 'nomen') return teil(1, '„' + t[1].w + '“ ist kein Nomen: Nach dem Artikel muss ein Nomen stehen.', 'Subjekt');
        if ((t[0].fall === 'nomM') !== (t[1].gen === 'M'))
            return teil(1, '„' + t[0].w + ' ' + t[1].w + '“ passt nicht zusammen: Artikel und Nomen müssen im Geschlecht übereinstimmen.', 'Subjekt');
        if (!t[2]) return teil(2, 'Nach dem Subjekt fehlt das Verb.', 'Satz');
        if (t[2].art !== 'verb') return teil(2, 'An dritter Stelle muss ein Verb stehen, nicht „' + t[2].w + '“.', 'Satz');
        if (!t[3]) return teil(3, 'Nach dem Verb fehlt das Objekt („den …“ oder „die …“).', 'Objekt');
        if (t[3].art !== 'art' || (t[3].fall !== 'akkM' && t[3].fall !== 'akkF'))
            return teil(3, 'Das Objekt beginnt mit „den“ oder „die“, nicht mit „' + t[3].w + '“.', 'Objekt');
        if (!t[4]) return teil(4, 'Nach „' + t[3].w + '“ fehlt ein Nomen.', 'Objekt');
        if (t[4].art !== 'nomen') return teil(4, '„' + t[4].w + '“ ist kein Nomen.', 'Objekt');
        if ((t[3].fall === 'akkM') !== (t[4].gen === 'M'))
            return teil(4, '„' + t[3].w + ' ' + t[4].w + '“ passt nicht zusammen: Artikel und Nomen müssen im Geschlecht übereinstimmen.', 'Objekt');
        if (t.length > 5) return teil(5, 'Nach dem Objekt ist der Satz zu Ende. „' + t[5].w + '“ ist zu viel.', 'Satz');
        return { ok: true, fehler: '', regel: '' };
    }

    function satzbau(box) {
        var vorrat = box.querySelector('.kacheln');
        var zeile = box.querySelector('.satzzeile');
        var syn = box.querySelector('.syn .inhalt');
        var sem = box.querySelector('.sem .inhalt');
        var ziele = box.querySelectorAll('.ziele li');
        var regeln = box.querySelectorAll('[data-regel]');
        var satz = [], sinn = null;

        WOERTER.forEach(function (x) {
            var b = h('button', { type: 'button', cls: 'kachel ' + x.art, text: x.w });
            b.addEventListener('click', function () { if (satz.length < 8) { satz.push(x.w); sinn = null; zeige(); } });
            vorrat.appendChild(b);
        });
        box.querySelector('[data-zurueck]').addEventListener('click', function () { satz.pop(); sinn = null; zeige(); });
        box.querySelector('[data-leeren]').addEventListener('click', function () { satz = []; sinn = null; zeige(); });

        function erreiche(nr, text) {
            var li = ziele[nr];
            if (!li || li.classList.contains('erreicht')) return;
            li.classList.add('erreicht');
            li.appendChild(h('span', { cls: 'beleg', text: text }));
        }

        function zeige() {
            leeren(zeile);
            if (satz.length === 0) zeile.appendChild(h('span', { cls: 'platzhalter', text: 'Klicke oben auf Wörter …' }));
            satz.forEach(function (w, i) {
                var b = h('button', { type: 'button', cls: 'kachel ' + wortInfo(w).art, text: w, title: 'Wort entfernen' });
                b.addEventListener('click', function () { satz.splice(i, 1); sinn = null; zeige(); });
                zeile.appendChild(b);
            });
            var r = pruefeSatz(satz);
            var text = satz.join(' ') + (satz.length ? '.' : '');
            regeln.forEach(function (e) { e.classList.toggle('aktiv', !r.ok && r.regel === e.getAttribute('data-regel')); });
            leeren(syn); leeren(sem);
            if (satz.length === 0) {
                syn.appendChild(h('p', { text: 'Der Prüfer wartet auf einen Satz.' }));
                sem.appendChild(h('p', { text: '–' }));
                return;
            }
            syn.appendChild(h('p', { cls: 'rueck ' + (r.ok ? 'ok' : 'nein'), text: r.ok ? '✓ Syntaktisch korrekt: Alle Regeln sind erfüllt.' : '✗ Syntaxfehler: ' + r.fehler }));
            if (!r.ok) {
                sem.appendChild(h('p', { text: 'Ist der Satz trotzdem verständlich? Ein Mensch errät oft, was gemeint ist. Ein Computer bricht bei einem Syntaxfehler ab.' }));
                if (satz.length >= 3) erreiche(0, text);
                return;
            }
            sem.appendChild(h('p', { text: 'Die Regeln sagen nichts über den Sinn. Entscheide du: Ergibt der Satz Sinn?' }));
            var ja = h('button', { type: 'button', cls: 'knopf' + (sinn === true ? ' aktiv' : ''), text: 'sinnvoll' });
            var nein = h('button', { type: 'button', cls: 'knopf' + (sinn === false ? ' aktiv' : ''), text: 'Unsinn (Semantikfehler)' });
            ja.addEventListener('click', function () { sinn = true; erreiche(2, text); zeige(); });
            nein.addEventListener('click', function () { sinn = false; erreiche(1, text); zeige(); });
            sem.appendChild(h('div', { cls: 'knopfzeile' }, [ja, nein]));
        }
        zeige();
    }

    // =====================================================================
    // 1.2 Alphabete
    // =====================================================================
    var ALPHABETE = {
        A1: { name: 'A₁', zeichen: ['0', '1'] },
        A2: { name: 'A₂', zeichen: 'abcdefghijklmnopqrstuvwxyz'.split('') },
        A3: { name: 'A₃', zeichen: [':', ';', '-', ')', '(', 'D', 'P', '*'] },
        ABC: { name: '{a, b, c}', zeichen: ['a', 'b', 'c'] }
    };
    function istWortUeber(wort, zeichen) {
        return Array.from(wort).every(function (z) { return zeichen.indexOf(z) >= 0; });
    }

    // ---------- Alphabet-Tastatur ----------
    function tastatur(box) {
        var wahl = box.querySelectorAll('[data-alphabet]');
        var tasten = box.querySelector('.tasten');
        var anzeige = box.querySelector('.zk');
        var laenge = box.querySelector('.laenge');
        var feld = box.querySelector('input');
        var ueber = box.querySelector('.ueber');
        var aktuell = 'A1', wort = '';

        function baueTasten() {
            leeren(tasten);
            ALPHABETE[aktuell].zeichen.forEach(function (z) {
                var b = h('button', { type: 'button', text: z, 'aria-label': 'Zeichen ' + z });
                b.addEventListener('click', function () { if (wort.length < 24) { wort += z; zeige(); } });
                tasten.appendChild(b);
            });
            var weg = h('button', { type: 'button', cls: 'steuer', text: '⌫ letztes' });
            weg.addEventListener('click', function () { wort = Array.from(wort).slice(0, -1).join(''); zeige(); });
            var alles = h('button', { type: 'button', cls: 'steuer', text: 'leeren' });
            alles.addEventListener('click', function () { wort = ''; zeige(); });
            tasten.appendChild(weg); tasten.appendChild(alles);
            wahl.forEach(function (k) { k.classList.toggle('aktiv', k.getAttribute('data-alphabet') === aktuell); });
        }
        function zeige() {
            kacheln(anzeige, wort);
            laenge.textContent = '|' + zeigeWort(wort) + '| = ' + Array.from(wort).length;
            if (document.activeElement !== feld) feld.value = wort;
            leeren(ueber);
            ueber.appendChild(h('span', { text: 'Wort über …' }));
            ['A1', 'A2', 'A3'].forEach(function (k) {
                var ok = istWortUeber(wort, ALPHABETE[k].zeichen);
                ueber.appendChild(h('span', { cls: 'badge ' + (ok ? 'ja' : 'nein'), text: ALPHABETE[k].name + (ok ? ' ✓' : ' ✗') }));
            });
        }
        wahl.forEach(function (k) {
            k.addEventListener('click', function () { aktuell = k.getAttribute('data-alphabet'); baueTasten(); });
        });
        feld.addEventListener('input', function () { wort = feld.value.slice(0, 24); zeige(); });
        baueTasten(); zeige();
    }

    // ---------- Wortmengen-Zähler ----------
    function alleWoerter(zeichen, n) {
        var liste = [''];
        for (var i = 0; i < n; i++) {
            var neu = [];
            liste.forEach(function (w) { zeichen.forEach(function (z) { neu.push(w + z); }); });
            liste = neu;
        }
        return liste;
    }

    function wortmenge(box) {
        var alphabetWahl = box.querySelector('[data-wm-alphabet]');
        var nWahl = box.querySelector('[data-wm-n]');
        var tipp = box.querySelector('[data-wm-tipp]');
        var los = box.querySelector('[data-wm-los]');
        var rueck = box.querySelector('.wm-rueck');
        var liste = box.querySelector('.wm-liste');
        var tabelle = box.querySelector('.wm-tab');
        var gezaehlt = {};   // pro Alphabet: Länge -> Anzahl

        function tabelleZeigen() {
            var k = alphabetWahl.value, daten = gezaehlt[k] || {};
            leeren(tabelle);
            var kopf = h('tr', {}, [h('th', { text: 'Länge n' })]);
            var zeile = h('tr', {}, [h('th', { text: 'Anzahl über ' + ALPHABETE[k].name })]);
            for (var n = 0; n <= 4; n++) {
                kopf.appendChild(h('th', { text: String(n) }));
                zeile.appendChild(h('td', { text: daten[n] !== undefined ? String(daten[n]) : '?' }));
            }
            tabelle.appendChild(kopf); tabelle.appendChild(zeile);
        }
        function erzeuge() {
            var k = alphabetWahl.value, n = parseInt(nWahl.value, 10);
            var zeichen = ALPHABETE[k].zeichen;
            var woerter = alleWoerter(zeichen, n);
            var geschaetzt = parseInt(tipp.value, 10);
            leeren(liste);
            var max = 256;
            woerter.slice(0, max).forEach(function (w) { liste.appendChild(h('code', { text: zeigeWort(w) })); });
            if (woerter.length > max) liste.appendChild(h('span', { text: '… und ' + (woerter.length - max) + ' weitere' }));
            var satz = 'Über ' + ALPHABETE[k].name + ' (' + zeichen.length + ' Zeichen) gibt es ' + woerter.length + ' Wörter der Länge ' + n + '.';
            if (isNaN(geschaetzt)) {
                rueck.className = 'wm-rueck rueck neutral';
                rueck.textContent = satz + ' Tipp: Schätze vorher, dann lernst du mehr!';
            } else if (geschaetzt === woerter.length) {
                rueck.className = 'wm-rueck rueck ok';
                rueck.textContent = 'Richtig geschätzt! ' + satz;
            } else {
                rueck.className = 'wm-rueck rueck nein';
                rueck.textContent = 'Du hast ' + geschaetzt + ' geschätzt. ' + satz + ' Vergleiche mit der Anzahl für n − 1: Wie viele Möglichkeiten kommen pro Stelle dazu?';
            }
            gezaehlt[k] = gezaehlt[k] || {};
            gezaehlt[k][n] = woerter.length;
            tabelleZeigen();
            tipp.value = '';
        }
        los.addEventListener('click', erzeuge);
        tipp.addEventListener('keydown', function (e) { if (e.key === 'Enter') erzeuge(); });
        alphabetWahl.addEventListener('change', function () { leeren(liste); rueck.className = 'wm-rueck'; rueck.textContent = ''; tabelleZeigen(); });
        tabelleZeigen();
    }

    // ---------- Sprach-Prüfer L1, L2, L3 ----------
    var SPRACHEN_A2 = [
        { name: 'L₁', text: 'Länge ≤ 4', test: function (w) { return w.length <= 4; } },
        { name: 'L₂', text: 'beginnt mit b', test: function (w) { return w.charAt(0) === 'b'; } },
        { name: 'L₃', text: 'enthält inf', test: function (w) { return w.indexOf('inf') >= 0; } }
    ];
    var AUFTRAEGE = [
        function (w, d) { return d[0] && !d[1] && !d[2]; },          // nur in L1
        function (w, d) { return d[0] && d[1] && !d[2]; },           // L1 und L2, nicht L3
        function (w, d) { return !d[0] && d[1] && d[2]; },           // L2 und L3, nicht L1
        function (w, d) { return d[0] && d[1] && d[2]; },            // alle drei
        function (w, d) { return !d[0] && !d[1] && !d[2]; },         // keine
        function (w) { return w === ''; }                            // kürzestes Wort in L1: ε
    ];

    function sprachpruefer(box) {
        var feld = box.querySelector('input');
        var anzeige = box.querySelector('.zk');
        var grid = box.querySelector('.pruef-grid');
        var meldung = box.querySelector('.sp-meldung');
        var ziele = box.querySelectorAll('.ziele li');

        function pruefe(benutzt) {
            var w = feld.value.trim();
            kacheln(anzeige, w);
            leeren(grid);
            if (!istWortUeber(w, ALPHABETE.A2.zeichen)) {
                meldung.className = 'sp-meldung rueck nein';
                meldung.textContent = '„' + w + '“ ist kein Wort über A₂: Erlaubt sind nur die Kleinbuchstaben a bis z (ohne ä, ö, ü, ß). Also gehört es auch zu keiner Sprache über A₂.';
                return;
            }
            meldung.className = 'sp-meldung rueck neutral';
            meldung.textContent = 'Das Wort ' + zeigeWort(w) + ' hat die Länge ' + w.length + '.';
            var drin = SPRACHEN_A2.map(function (s) { return s.test(w); });
            SPRACHEN_A2.forEach(function (s, i) {
                grid.appendChild(h('div', { cls: drin[i] ? 'drin' : 'draussen' }, [
                    h('strong', { text: s.name + (drin[i] ? '  ✓ gehört dazu' : '  ✗ gehört nicht dazu') }),
                    h('small', { text: s.text })
                ]));
            });
            if (!benutzt) return;
            AUFTRAEGE.forEach(function (f, i) {
                var li = ziele[i];
                if (li && !li.classList.contains('erreicht') && f(w, drin)) {
                    li.classList.add('erreicht');
                    li.appendChild(h('span', { cls: 'beleg', text: 'gefunden: ' + zeigeWort(w) }));
                }
            });
        }
        feld.addEventListener('input', function () { pruefe(true); });
        pruefe(false);
    }

    // ---------- Mengenbild: L ⊆ A* ⊆ alle Zeichenketten ----------
    var ALLTAG = {
        plz: {
            name: 'Postleitzahlen', alphabet: '{0, 1, …, 9}', zeichen: '0123456789'.split(''),
            regel: 'genau fünf Ziffern', test: /^[0-9]{5}$/,
            beispiele: ['83278', '824377', '8327a', '99999', ''],
            semantik: function (w) { return /^(99999|00000)$/.test(w) ? 'Die Syntax stimmt, aber diese Postleitzahl ist nicht vergeben: ein Semantikfehler. Die formale Sprache prüft nur die Form.' : ''; }
        },
        bin: {
            name: 'Binärzahlen ohne führende Null', alphabet: '{0, 1}', zeichen: ['0', '1'],
            regel: '„0“ allein oder eine 1 gefolgt von beliebig vielen Nullen und Einsen', test: /^(0|1[01]*)$/,
            beispiele: ['1011', '0011', '0', '1021', ''],
            semantik: function () { return ''; }
        },
        datum: {
            name: 'Datum TT.MM.JJJJ', alphabet: '{0, 1, …, 9, .}', zeichen: '0123456789.'.split(''),
            regel: 'zwei Ziffern, Punkt, zwei Ziffern, Punkt, vier Ziffern', test: /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/,
            beispiele: ['29.09.2026', '29..092026', '29.09.26', '34.07.2026', '29-09-2026'],
            semantik: function (w) {
                var m = /^([0-9]{2})\.([0-9]{2})\.([0-9]{4})$/.exec(w);
                if (!m) return '';
                var t = +m[1], mo = +m[2], j = +m[3];
                var tage = [31, (j % 4 === 0 && (j % 100 !== 0 || j % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                if (mo < 1 || mo > 12 || t < 1 || t > tage[mo - 1])
                    return 'Die Form stimmt (das Wort gehört zu L), aber diesen Tag gibt es nicht: ein Semantikfehler. Man könnte die Regeln strenger machen, dann wäre es ein Syntaxfehler.';
                return '';
            }
        }
    };
    // feste Plätze je Bereich, damit mehrere Wörter nebeneinander Platz haben
    var PLAETZE = {
        L: [[330, 190], [285, 220], [375, 222], [300, 165], [360, 165], [330, 245]],
        A: [[180, 150], [480, 150], [170, 250], [490, 250], [220, 90], [440, 90]],
        aussen: [[60, 40], [590, 45], [60, 300], [590, 300], [330, 322], [40, 170]]
    };

    function mengenbild(box) {
        var wahl = box.querySelector('select');
        var feld = box.querySelector('input');
        var knopf = box.querySelector('[data-mb-los]');
        var beispiele = box.querySelector('.beispiele');
        var svg = box.querySelector('svg');
        var info = box.querySelector('.mb-info');
        var eingetragen = [];

        function bereich(w, s) {
            if (!istWortUeber(w, s.zeichen)) return 'aussen';
            return s.test.test(w) ? 'L' : 'A';
        }
        function zeichne() {
            var s = ALLTAG[wahl.value];
            leeren(svg);
            svgEl('rect', { x: 4, y: 4, width: 652, height: 332, rx: 18, 'class': 'alle' }, svg);
            svgEl('text', { x: 20, y: 24, fill: '#475569' }, svg, 'alle Zeichenketten (mit beliebigen Zeichen)');
            svgEl('ellipse', { cx: 330, cy: 185, rx: 250, ry: 125, 'class': 'astern' }, svg);
            svgEl('text', { x: 330, y: 80, fill: '#0369a1', 'text-anchor': 'middle' }, svg, 'A* = alle Wörter über ' + s.alphabet);
            svgEl('ellipse', { cx: 330, cy: 205, rx: 110, ry: 72, 'class': 'lsprache' }, svg);
            svgEl('text', { x: 330, y: 146, fill: '#15803d', 'text-anchor': 'middle' }, svg, 'L: ' + s.name);
            var zaehler = { L: 0, A: 0, aussen: 0 };
            eingetragen.forEach(function (w) {
                var b = bereich(w, s);
                var p = PLAETZE[b][zaehler[b]++ % PLAETZE[b].length];
                svgEl('circle', { cx: p[0], cy: p[1], r: 7, 'class': 'punkt' }, svg);
                svgEl('text', { x: p[0], y: p[1] - 13, 'text-anchor': 'middle', 'class': 'punkt-text' }, svg, zeigeWort(w));
            });
        }
        function eintragen(w) {
            var s = ALLTAG[wahl.value];
            eingetragen = eingetragen.filter(function (x) { return x !== w; });
            eingetragen.push(w);
            if (eingetragen.length > 6) eingetragen.shift();
            zeichne();
            var b = bereich(w, s), text;
            if (b === 'aussen') text = zeigeWort(w) + ' ist nicht einmal ein Wort über ' + s.alphabet + ': Es enthält Zeichen, die im Alphabet fehlen.';
            else if (b === 'A') text = zeigeWort(w) + ' ist ein Wort über ' + s.alphabet + ', gehört aber nicht zu L. Regel: ' + s.regel + '.';
            else text = zeigeWort(w) + ' gehört zu L. Regel: ' + s.regel + '.';
            var sem = b === 'L' ? s.semantik(w) : '';
            info.className = 'mb-info rueck ' + (b === 'L' ? 'ok' : (b === 'A' ? 'neutral' : 'nein'));
            info.textContent = text + (sem ? ' ' + sem : '');
        }
        function beispielKnoepfe() {
            leeren(beispiele);
            ALLTAG[wahl.value].beispiele.forEach(function (w) {
                var b = h('button', { type: 'button', text: zeigeWort(w) });
                b.addEventListener('click', function () { feld.value = w; eintragen(w); });
                beispiele.appendChild(b);
            });
        }
        knopf.addEventListener('click', function () { eintragen(feld.value.trim()); });
        feld.addEventListener('keydown', function (e) { if (e.key === 'Enter') eintragen(feld.value.trim()); });
        wahl.addEventListener('change', function () {
            eingetragen = []; info.className = 'mb-info'; info.textContent = ''; feld.value = '';
            beispielKnoepfe(); zeichne();
        });
        beispielKnoepfe(); zeichne();
    }

    // ---------- Smiley-Regelwerk ----------
    var SMILEY_TESTS = [':)', ':-)', ';D', ':-P', ')-:', ':-', ';*', ':--)', 'DP', ':(', '(-:', '8-)', ':-):-)', '=)'];

    function smileyregeln(box) {
        var form = box.querySelector('form');
        var tbody = box.querySelector('tbody');
        var stand = box.querySelector('.sr-stand');
        var feld = box.querySelector('[data-sr-eigen]');
        var eigenErg = box.querySelector('.sr-eigen');
        var meinung = {};

        function esc(z) { return z.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); }
        function klasse(name) {
            var z = Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return esc(i.value); });
            return z.length ? '[' + z.join('') + ']' : null;
        }
        function regel() {
            var augen = klasse('augen'), mund = klasse('mund');
            if (!augen || !mund) return null;
            var nase = { keine: '', eine: '-?', viele: '-*' }[form.querySelector('input[name="nase"]:checked').value];
            var eins = augen + nase + mund;
            if (form.querySelector('[name="spiegel"]').checked) eins = '(?:' + eins + '|' + mund + nase + augen + ')';
            var alles = form.querySelector('[name="folge"]').checked ? '(?:' + eins + ')+' : eins;
            return new RegExp('^' + alles + '$');
        }
        function zeige() {
            var r = regel();
            leeren(tbody);
            var gleich = 0, bewertet = 0;
            SMILEY_TESTS.forEach(function (w) {
                var ok = r ? r.test(w) : false;
                var tr = h('tr');
                tr.appendChild(h('td', { cls: 'wort', text: w }));
                var td = h('td', { cls: 'meins' });
                [['ja', '✓'], ['nein', '✗']].forEach(function (m) {
                    var b = h('button', { type: 'button', text: m[1], 'aria-label': w + (m[0] === 'ja' ? ' ist ein Smiley' : ' ist kein Smiley') });
                    if (meinung[w] === m[0]) b.className = 'gewaehlt-' + m[0];
                    b.addEventListener('click', function () { meinung[w] = m[0]; zeige(); });
                    td.appendChild(b); td.appendChild(document.createTextNode(' '));
                });
                tr.appendChild(td);
                tr.appendChild(h('td', {}, [badge(ok)]));
                if (meinung[w]) {
                    bewertet++;
                    if ((meinung[w] === 'ja') === ok) gleich++; else tr.className = 'abweichung';
                }
                tbody.appendChild(tr);
            });
            if (!r) stand.textContent = 'Wähle mindestens ein Auge und einen Mund, sonst ist die Sprache leer.';
            else if (bewertet === 0) stand.textContent = 'Entscheide zuerst in der Spalte „Du“, dann stelle die Regeln ein.';
            else stand.textContent = 'Regeln und deine Meinung stimmen bei ' + gleich + ' von ' + bewertet + ' Wörtern überein.' +
                (gleich === bewertet && bewertet === SMILEY_TESTS.length ? ' Perfekt: Deine Regeln beschreiben genau deine Sprache.' : ' Gelb markiert: Hier weichen sie ab.');
            eigen();
        }
        function eigen() {
            var w = feld.value.trim(), r = regel();
            if (!w) { eigenErg.textContent = ''; return; }
            var ok = r ? r.test(w) : false;
            eigenErg.className = 'sr-eigen rueck ' + (ok ? 'ok' : 'nein');
            eigenErg.textContent = w + (ok ? ' gehört nach deinen Regeln zur Sprache.' : ' gehört nach deinen Regeln nicht zur Sprache.');
        }
        form.addEventListener('change', zeige);
        form.addEventListener('submit', function (e) { e.preventDefault(); });
        feld.addEventListener('input', eigen);
        box.querySelector('[data-sr-blatt]').addEventListener('click', function () {
            form.querySelectorAll('input[type="checkbox"]').forEach(function (i) {
                i.checked = (i.name === 'augen' && ':;'.indexOf(i.value) >= 0) || (i.name === 'mund' && ')(DP*'.indexOf(i.value) >= 0);
            });
            form.querySelector('input[name="nase"][value="eine"]').checked = true;
            zeige();
        });
        zeige();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-detektiv]').forEach(detektiv);
        document.querySelectorAll('[data-satzbau]').forEach(satzbau);
        document.querySelectorAll('[data-tastatur]').forEach(tastatur);
        document.querySelectorAll('[data-wortmenge]').forEach(wortmenge);
        document.querySelectorAll('[data-sprachpruefer]').forEach(sprachpruefer);
        document.querySelectorAll('[data-mengenbild]').forEach(mengenbild);
        document.querySelectorAll('[data-smileyregeln]').forEach(smileyregeln);
    });
})();

/* ==========================================================================
   Lösungsweg (alle Stationen): Tipps stufenweise, Lösung nur durch Gedrückthalten
     <div class="lw" data-loesungsweg="Aufgabe 3: RGB-Code">
       <template data-stufe="Tipp 1">…</template>
       <template data-stufe="Lösung" data-halten>…</template>
     </div>
   Der Inhalt steht in <template>: nicht sichtbar, nicht über die Suche zu finden.
   Nach dem Einblenden meldet das Ereignis „fs-eingeblendet“ den neuen Inhalt,
   damit z. B. grammatik.js darin Syntaxdiagramme zeichnen kann.
   (Wie datenstrukturen.js in Informatik 12.)
   ========================================================================== */
(function () {
    'use strict';

    var HALTEZEIT = 1500;

    function loesungsweg(box) {
        var titel = box.getAttribute('data-loesungsweg') || '';
        var stufen = Array.prototype.slice.call(box.querySelectorAll('template[data-stufe]'));
        if (!stufen.length) return;
        var kopf = document.createElement('div');
        kopf.className = 'lw-kopf';
        kopf.textContent = '💡 Hilfe' + (titel ? ': ' + titel : '');
        var inhalt = document.createElement('div');
        inhalt.className = 'lw-inhalt';
        var knoepfe = document.createElement('div');
        knoepfe.className = 'lw-knoepfe';
        box.appendChild(kopf);
        box.appendChild(inhalt);
        box.appendChild(knoepfe);
        var stand = 0;

        function zeigeStufe(i) {
            var t = stufen[i];
            var teil = document.createElement('div');
            teil.className = 'lw-stufe' + (t.hasAttribute('data-halten') ? ' lw-loesung' : '');
            var marke = document.createElement('div');
            marke.className = 'lw-marke';
            marke.textContent = t.getAttribute('data-stufe');
            teil.appendChild(marke);
            teil.appendChild(document.importNode(t.content, true));
            inhalt.appendChild(teil);
            document.dispatchEvent(new CustomEvent('fs-eingeblendet', { detail: teil }));
            stand = i + 1;
            baueKnoepfe();
        }

        function zuruecksetzen() {
            inhalt.textContent = '';
            stand = 0;
            baueKnoepfe();
        }

        function baueKnoepfe() {
            knoepfe.textContent = '';
            if (stand < stufen.length) {
                var t = stufen[stand];
                var k = document.createElement('button');
                k.type = 'button';
                if (t.hasAttribute('data-halten')) {
                    k.className = 'lw-knopf lw-halten';
                    k.innerHTML = '<span class="lw-fortschritt"></span><span class="lw-text"></span>';
                    k.querySelector('.lw-text').textContent = t.getAttribute('data-stufe') + ' zeigen: gedrückt halten';
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
                var weg = document.createElement('button');
                weg.type = 'button';
                weg.className = 'lw-knopf lw-weg';
                weg.textContent = 'wieder ausblenden';
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
            clearTimeout(timer);
            timer = null;
            balken.style.transition = 'width .2s';
            balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg);
    });
})();
