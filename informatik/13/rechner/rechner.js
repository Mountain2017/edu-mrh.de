/*
 * Funktionsweise eines Rechners (Informatik 13) – kleine interaktive Bausteine der Stationsseiten
 *   (der Simulator selbst steht in registermaschine.js)
 *
 *   <ul class="quiz" data-quiz="a:Text A|b:Text B">       Auswahl-Quiz: je <li data-loesung="a"> eine Frage,
 *       <li data-loesung="a">… <span class="erkl-text">…</span></li>   Erklärung erscheint nach der Antwort
 *   <div data-busspiel> <div class="bs-fall" data-loesung="adr|steuer|daten"
 *        data-adr-wahl="…,…" data-daten-wahl="…,…"><h5>…</h5><p class="erkl-text">…</p></div> </div>
 *                                                         Bus-Spiel: Was liegt auf welchem Bus?
 *   <div data-sortieren><ol><li data-ph="…">…</li>…</ol></div>   Reihenfolge anklicken (Liste in richtiger Reihenfolge)
 *   <div class="lw" data-loesungsweg="…">                 Tipps stufenweise, Lösung nur durch Gedrückthalten
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
                    var ok = o[0] === loesung;
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

    // ---------- Bus-Spiel ----------
    function busspiel(box) {
        box.querySelectorAll('.bs-fall').forEach(function (fall) {
            var loesung = (fall.getAttribute('data-loesung') || '').split('|');
            var erklText = fall.querySelector('.erkl-text');
            if (erklText) erklText.hidden = true;
            var zeilen = h('div', { cls: 'bs-zeilen' });
            var felder = [];
            [['adr', 'Adressbus', fall.getAttribute('data-adr-wahl')],
             ['steuer', 'Steuerbus', 'lesen,schreiben'],
             ['daten', 'Datenbus', fall.getAttribute('data-daten-wahl')]].forEach(function (z) {
                var sel = h('select', { 'aria-label': z[1] }, [h('option', { value: '', text: '– wähle –' })]);
                String(z[2] || '').split(',').forEach(function (o) { o = o.trim(); if (o) sel.appendChild(h('option', { value: o, text: o })); });
                felder.push(sel);
                zeilen.appendChild(h('div', { cls: 'bs-zeile ' + z[0] }, [h('span', { text: z[1] }), sel]));
            });
            var pruef = h('button', { type: 'button', cls: 'knopf', text: 'Prüfen' });
            var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
            pruef.addEventListener('click', function () {
                var fehlt = felder.some(function (s) { return !s.value; });
                if (fehlt) { rueck.className = 'rueck neutral'; rueck.textContent = 'Wähle für jeden Bus etwas aus.'; return; }
                var falsch = [];
                felder.forEach(function (s, i) { if (s.value !== loesung[i]) falsch.push(['Adressbus', 'Steuerbus', 'Datenbus'][i]); });
                var ok = !falsch.length;
                fall.classList.toggle('richtig', ok);
                fall.classList.toggle('falsch', !ok);
                rueck.className = 'rueck ' + (ok ? 'ok' : 'nein');
                rueck.textContent = ok ? '✓ Richtig. ' + (erklText ? erklText.textContent : '') : '✗ Noch nicht richtig: ' + falsch.join(', ') + '. Überlege: Wer gibt die Adresse vor? In welche Richtung fließen die Daten?';
            });
            fall.appendChild(zeilen);
            fall.appendChild(h('div', { cls: 'knopfzeile' }, [pruef]));
            fall.appendChild(rueck);
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
                if (fertig) {
                    li.className = g.s.nr === i ? 'ok' : 'nein';
                    if (g.s.ph) li.appendChild(h('span', { cls: 'ph', text: g.s.ph }));
                }
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

    // ---------- Lösungsweg (wie Formale Sprachen 13 / Informatik 12) ----------
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
            teil.querySelectorAll('pre.asm').forEach(faerbeAsm);
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

    // ---------- Assembler-Listings einfärben: <pre class="asm" [data-adr]> ----------
    // data-adr: Adressen (Zellennummern) vorne anfügen, wie der Simulator sie vergibt
    var MNEMO = /\b(LOADI|LOAD|STORE|ADDI|ADD|SUBI|SUB|MULI|MUL|DIVI|DIV|MODI|MOD|CMPI|CMP|JMP|JEQ|JNE|JGT|JGE|JLT|JLE|HOLD)\b/g;
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function faerbeAsm(pre) {
        var mitAdr = pre.hasAttribute('data-adr'), adr = 0;
        var zeilen = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
        var breite = 2;
        pre.innerHTML = zeilen.map(function (z) {
            var k = z.indexOf(';'), code = k < 0 ? z : z.slice(0, k), kom = k < 0 ? '' : z.slice(k);
            var ohneMarke = code.replace(/^\s*[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*\s*:/, '');
            var befehl = /[A-Za-z]/.test(ohneMarke) && !/^\s*$/.test(ohneMarke);
            var html = esc(code).replace(/^(\s*)([A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*:)/, '$1<span class="m">$2</span>').replace(MNEMO, '<span class="k">$1</span>');
            html += kom ? '<span class="c">' + esc(kom).replace(/([①②③④⑤⑥])/g, '<span class="n">$1</span>') + '</span>' : '';
            if (mitAdr) {
                var a = befehl ? String(adr++) : '';
                while (a.length < breite) a = ' ' + a;
                html = '<span class="a">' + a + '  </span>' + html;
            }
            return html;
        }).join('\n');
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('pre.asm').forEach(faerbeAsm);
        document.querySelectorAll('[data-quiz]').forEach(quiz);
        document.querySelectorAll('[data-busspiel]').forEach(busspiel);
        document.querySelectorAll('[data-sortieren]').forEach(sortieren);
        document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg);
    });
})();
