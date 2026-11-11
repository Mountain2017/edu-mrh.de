/*
 * Übung zur 1. Schulaufgabe (Rekursive Datenstrukturen, Informatik 12) – Schnellcheck
 *
 *   Wahr/Falsch   <ul data-wf> mit <li data-w="w|f">Aussage<span class="wf-erkl">Begründung</span></li>
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

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
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = paar[1];
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
        document.querySelectorAll('[data-wf]').forEach(wahrFalsch);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
