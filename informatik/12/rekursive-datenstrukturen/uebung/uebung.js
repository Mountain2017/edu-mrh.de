/*
 * Übung zur 1. Schulaufgabe (Rekursive Datenstrukturen, Informatik 12) – Prüfstände
 *
 *   FIFO-Tabelle   <div data-fifo> … <tr data-rueck="P1" data-inhalt="P2, P3" [data-hinweis="…"]>
 *                  mit zwei <input> je Zeile; „leer“, „-“ oder ein leeres Feld gelten als leere Schlange.
 *   Bausteine      <div data-parsons="F,B,H"> mit <button data-id="A"> je Baustein in .pa-vorrat,
 *                  <ol class="pa-programm"> als Ziel. Klick: Baustein ans Ende bzw. zurück.
 *   Wahr/Falsch    <ul data-wf> mit <li data-w="w|f">Aussage<span class="wf-erkl">Begründung</span></li>
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

    function norm(s) {
        return (s || '').toLowerCase().replace(/[\s„“"'()]/g, '').replace(/;/g, ',').replace(/→|->/g, ',');
    }
    function istLeer(s) {
        return s === '' || s === 'leer' || s === '-' || s === '–' || s === '—' || s === 'nichts' || s === '{}' || s === '[]';
    }
    function knopf(text, klasse) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        if (klasse) b.className = klasse;
        return b;
    }

    // ---------------------------------------------------------------- FIFO-Tabelle
    function fifo(box) {
        var zeilen = Array.prototype.slice.call(box.querySelectorAll('tr[data-rueck]'));
        var leiste = document.createElement('div');
        leiste.className = 'zw-knoepfe';
        var pruefen = knopf('Prüfen', 'zw-haupt');
        var leeren = knopf('Leeren');
        var rueck = document.createElement('p');
        rueck.className = 'ue-rueck';
        rueck.setAttribute('aria-live', 'polite');
        leiste.appendChild(pruefen);
        leiste.appendChild(leeren);
        box.appendChild(leiste);
        box.appendChild(rueck);

        pruefen.addEventListener('click', function () {
            var richtig = 0, gesamt = 0, hinweise = [];
            zeilen.forEach(function (tr) {
                var felder = tr.querySelectorAll('input');
                var sollR = norm(tr.getAttribute('data-rueck'));
                var sollI = norm(tr.getAttribute('data-inhalt'));
                var istR = norm(felder[0].value), istI = norm(felder[1].value);
                var okR = istR === sollR;
                var okI = istLeer(sollI) ? istLeer(istI) : istI === sollI;
                [[felder[0], okR], [felder[1], okI]].forEach(function (p) {
                    gesamt++;
                    if (p[1]) richtig++;
                    p[0].classList.toggle('ok', p[1]);
                    p[0].classList.toggle('falsch', !p[1]);
                });
                if ((!okR || !okI) && tr.getAttribute('data-hinweis') && hinweise.length < 2) {
                    hinweise.push(tr.getAttribute('data-hinweis'));
                }
            });
            rueck.textContent = richtig + ' von ' + gesamt + ' Feldern richtig.' +
                (richtig === gesamt ? ' Alles stimmt!' : (hinweise.length ? ' Tipp: ' + hinweise.join(' ') : ''));
            rueck.className = 'ue-rueck ' + (richtig === gesamt ? 'gut' : 'offen');
        });
        leeren.addEventListener('click', function () {
            box.querySelectorAll('input').forEach(function (f) { f.value = ''; f.classList.remove('ok', 'falsch'); });
            rueck.textContent = '';
            rueck.className = 'ue-rueck';
        });
    }

    // ---------------------------------------------------------------- Bausteine ordnen
    function parsons(box) {
        var loesung = box.getAttribute('data-parsons').split(',');
        var vorrat = box.querySelector('.pa-vorrat');
        var programm = box.querySelector('.pa-programm');
        var bausteine = Array.prototype.slice.call(vorrat.querySelectorAll('button[data-id]'));
        var leiste = document.createElement('div');
        leiste.className = 'zw-knoepfe';
        var pruefen = knopf('Prüfen', 'zw-haupt');
        var zurueck = knopf('Zurücksetzen');
        var rueck = document.createElement('p');
        rueck.className = 'ue-rueck';
        rueck.setAttribute('aria-live', 'polite');
        leiste.appendChild(pruefen);
        leiste.appendChild(zurueck);
        box.appendChild(leiste);
        box.appendChild(rueck);

        function folge() {
            return Array.prototype.map.call(programm.querySelectorAll('li'), function (li) { return li.getAttribute('data-id'); });
        }
        function einruecken() {
            var tiefe = 0;
            programm.querySelectorAll('li').forEach(function (li) {
                var code = li.textContent.replace(/^[A-Z]\s*/, '').trim();
                if (code.charAt(0) === '}') tiefe = Math.max(0, tiefe - 1);
                li.style.marginLeft = (tiefe * 1.6) + 'rem';
                if (code.charAt(code.length - 1) === '{') tiefe++;
            });
        }
        bausteine.forEach(function (b) {
            b.addEventListener('click', function () {
                var li = document.createElement('li');
                li.setAttribute('data-id', b.getAttribute('data-id'));
                li.innerHTML = b.innerHTML;
                li.tabIndex = 0;
                li.title = 'Klicken: zurück in den Vorrat';
                function weg() { li.remove(); b.disabled = false; einruecken(); rueck.textContent = ''; }
                li.addEventListener('click', weg);
                li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); weg(); } });
                programm.appendChild(li);
                b.disabled = true;
                einruecken();
                rueck.textContent = '';
            });
        });
        pruefen.addEventListener('click', function () {
            var ist = folge();
            var fremd = ist.filter(function (id) { return loesung.indexOf(id) < 0; });
            var vorne = 0;
            while (vorne < ist.length && vorne < loesung.length && ist[vorne] === loesung[vorne]) vorne++;
            var text;
            if (vorne === loesung.length && ist.length === loesung.length) {
                text = 'Richtig! Lies die Methode noch einmal und vergleiche sie mit dem Sequenzdiagramm.';
            } else if (fremd.length) {
                text = 'Mindestens ein Baustein gehört nicht in die Methode. Vergleiche jede Zeile mit dem Sequenzdiagramm.';
            } else if (ist.length < loesung.length) {
                text = 'Die ersten ' + vorne + ' Bausteine stimmen, es fehlen noch Bausteine.';
            } else {
                text = 'Die ersten ' + vorne + ' Bausteine stimmen. Danach passt die Reihenfolge nicht.';
            }
            rueck.textContent = text;
            rueck.className = 'ue-rueck ' + (text.indexOf('Richtig') === 0 ? 'gut' : 'offen');
        });
        zurueck.addEventListener('click', function () {
            programm.innerHTML = '';
            bausteine.forEach(function (b) { b.disabled = false; });
            rueck.textContent = '';
            rueck.className = 'ue-rueck';
        });
    }

    // ---------------------------------------------------------------- Wahr oder falsch
    function wahrFalsch(liste) {
        var items = Array.prototype.slice.call(liste.querySelectorAll('li[data-w]'));
        var stand = document.createElement('p');
        stand.className = 'ue-rueck';
        stand.setAttribute('aria-live', 'polite');
        liste.parentNode.insertBefore(stand, liste.nextSibling);
        function zaehlen() {
            var beantwortet = items.filter(function (li) { return li.classList.contains('beantwortet'); });
            var gut = beantwortet.filter(function (li) { return li.classList.contains('ok'); }).length;
            stand.textContent = beantwortet.length ? gut + ' von ' + beantwortet.length + ' beantworteten Aussagen richtig eingeschätzt.' : '';
        }
        items.forEach(function (li) {
            var erkl = li.querySelector('.wf-erkl');
            var leiste = document.createElement('span');
            leiste.className = 'wf-knoepfe';
            [['w', 'wahr'], ['f', 'falsch']].forEach(function (paar) {
                var b = knopf(paar[1]);
                b.addEventListener('click', function () {
                    var ok = paar[0] === li.getAttribute('data-w');
                    li.classList.add('beantwortet');
                    li.classList.toggle('ok', ok);
                    li.classList.toggle('falsch', !ok);
                    if (erkl) {
                        erkl.hidden = false;
                        erkl.setAttribute('data-urteil', (ok ? 'Richtig: ' : 'Nicht ganz: ') + 'Die Aussage ist ' + (li.getAttribute('data-w') === 'w' ? 'wahr.' : 'falsch.'));
                    }
                    zaehlen();
                });
                leiste.appendChild(b);
            });
            if (erkl) { erkl.hidden = true; li.insertBefore(leiste, erkl); } else { li.appendChild(leiste); }
        });
    }

    function start() {
        document.querySelectorAll('[data-fifo]').forEach(fifo);
        document.querySelectorAll('[data-parsons]').forEach(parsons);
        document.querySelectorAll('[data-wf]').forEach(wahrFalsch);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
