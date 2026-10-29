/* ==========================================================================
   Station 6: Listen – Werkzeuge der Stationsseite (nur 6-listen.html)
   --------------------------------------------------------------------------
   <div data-listen-labor></div>
       Listen-Labor: eine Liste „einkauf“ mit Snap!-Blöcken verändern und
       abfragen. Ansicht „Fächer“ (Feld/Array) oder „Kette“ (verkettete Liste),
       zu jeder Operation der Aufwand in beiden Speicherarten.
   <div data-durchlauf></div>
       Durchlauf-Tafel: „für jedes Element von punkte“ Schritt für Schritt,
       mit den Variablen Element und summe und einer Ablauftabelle.
   Keine Daten verlassen den Browser; es wird nichts gespeichert.
   ========================================================================== */
(function () {
    'use strict';

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (html !== undefined) { e.innerHTML = html; }
        return e;
    }
    function esc(t) {
        return String(t).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function slot(t) { return '<span class="slot">' + esc(t) + '</span>'; }

    /* ------------------------------------------------------------ Labor */
    var BEISPIEL = ['Milch', 'Brot', 'Äpfel'];
    var MAX = 10;

    function labor(root) {
        var liste = BEISPIEL.slice();
        var ansicht = 'faecher';
        var markiert = {};          // Stelle (1-basiert) -> CSS-Klasse

        root.innerHTML =
            '<div class="ll-kopf">' +
            '  <div class="ll-ansicht" role="group" aria-label="Ansicht">' +
            '    <button type="button" data-ansicht="faecher" class="aktiv">🗄️ Fächer (Feld)</button>' +
            '    <button type="button" data-ansicht="kette">🔗 Kette (verkettet)</button>' +
            '  </div>' +
            '  <span class="ll-laenge"></span>' +
            '</div>' +
            '<div class="ll-buehne"><span class="ll-name">einkauf</span><div class="ll-liste" aria-live="polite"></div></div>' +
            '<div class="ll-eingaben">' +
            '  <label>Wert <input type="text" class="ll-wert" value="Tee" maxlength="12"></label>' +
            '  <label>Stelle <input type="number" class="ll-stelle" value="2" min="1" max="11" step="1"></label>' +
            '</div>' +
            '<div class="ll-gruppe"><span class="ll-gruppe-titel">Befehle – verändern die Liste</span>' +
            '  <button type="button" class="blk blk-lists" data-op="add">füge <span class="slot ll-w"></span> zu einkauf hinzu</button>' +
            '  <button type="button" class="blk blk-lists" data-op="insert">füge <span class="slot ll-w"></span> als <span class="slot ll-s"></span> in einkauf ein</button>' +
            '  <button type="button" class="blk blk-lists" data-op="replace">ersetze Element <span class="slot ll-s"></span> in einkauf durch <span class="slot ll-w"></span></button>' +
            '  <button type="button" class="blk blk-lists" data-op="delete">entferne <span class="slot ll-s"></span> aus einkauf</button>' +
            '</div>' +
            '<div class="ll-gruppe"><span class="ll-gruppe-titel">Reporter – fragen nur nach, die Liste bleibt gleich</span>' +
            '  <button type="button" class="blk blk-lists blk-rep" data-op="item">Element <span class="slot ll-s"></span> von einkauf</button>' +
            '  <button type="button" class="blk blk-lists blk-rep" data-op="length">Länge von einkauf</button>' +
            '  <button type="button" class="blk blk-lists blk-bool" data-op="contains">einkauf enthält <span class="slot ll-w"></span></button>' +
            '  <button type="button" class="blk blk-lists blk-rep" data-op="index">Index von <span class="slot ll-w"></span> in einkauf</button>' +
            '</div>' +
            '<div class="ll-gruppe ll-neu">' +
            '  <button type="button" class="btn btn-outline btn-sm" data-op="reset">↺ Beispielliste</button>' +
            '  <button type="button" class="btn btn-outline btn-sm" data-op="leer">∅ leere Liste</button>' +
            '</div>' +
            '<div class="ll-ausgabe" aria-live="polite"><p class="ll-meldung">Klicke auf einen Block. Die Liste oben verändert sich so, wie sie es in Snap! tun würde.</p></div>';

        var q = function (s) { return root.querySelector(s); };
        var wertIn = q('.ll-wert'), stelleIn = q('.ll-stelle');

        function wert() { return wertIn.value.trim(); }
        function stelle() { return Number(stelleIn.value); }
        function ganz(i) { return Math.floor(i) === i; }

        function slotsAktualisieren() {
            root.querySelectorAll('.ll-w').forEach(function (s) { s.textContent = wert() || '…'; });
            root.querySelectorAll('.ll-s').forEach(function (s) { s.textContent = stelleIn.value || '…'; });
        }

        function zeichnen() {
            var box = q('.ll-liste');
            box.innerHTML = '';
            box.className = 'll-liste ' + ansicht;
            q('.ll-laenge').textContent = 'Länge: ' + liste.length;
            if (ansicht === 'kette') { box.appendChild(el('span', 'll-anfang', 'Anfang ➜')); }
            if (!liste.length) {
                box.appendChild(el('span', 'll-leer', ansicht === 'kette' ? '∅ (kein Glied)' : 'leer – kein einziges Fach belegt'));
            }
            liste.forEach(function (v, k) {
                var i = k + 1;
                var fach = el('div', 'll-fach' + (markiert[i] ? ' ' + markiert[i] : ''));
                fach.innerHTML = '<span class="ll-nr">' + i + '</span><span class="ll-wert-anz">' + esc(v) + '</span>';
                if (ansicht === 'kette') {
                    fach.innerHTML += '<span class="ll-zeiger">' + (i < liste.length ? 'nächstes ➜' : 'Ende ∅') + '</span>';
                }
                box.appendChild(fach);
                if (ansicht === 'kette' && i < liste.length) { box.appendChild(el('span', 'll-pfeil', '➜')); }
            });
        }

        function melden(block, ergebnis, aufwand, fehler) {
            var a = q('.ll-ausgabe');
            var h = '<div class="ll-zeile">' + block + (ergebnis !== undefined ? ' <span class="ll-ergebnis">' + ergebnis + '</span>' : '') + '</div>';
            if (fehler) { h += '<p class="ll-fehler">' + fehler + '</p>'; }
            if (aufwand) {
                h += '<div class="ll-aufwand"><div><strong>🗄️ Fächer:</strong> ' + aufwand[0] + '</div>' +
                     '<div><strong>🔗 Kette:</strong> ' + aufwand[1] + '</div></div>';
            }
            a.innerHTML = h;
        }
        function schritte(n) { return n === 1 ? '1 Schritt' : n + ' Schritte'; }
        function elemente(k) { return k === 1 ? '1 Element rückt' : k + ' Elemente rücken'; }
        function laufen(s) { return s === 1 ? 'direkt am Anfang' : (s - 1) + '× vom Anfang aus weitergehen'; }

        function blockHtml(op, w, s) {
            switch (op) {
            case 'add': return '<span class="blk blk-lists">füge ' + slot(w) + ' zu einkauf hinzu</span>';
            case 'insert': return '<span class="blk blk-lists">füge ' + slot(w) + ' als ' + slot(s) + ' in einkauf ein</span>';
            case 'replace': return '<span class="blk blk-lists">ersetze Element ' + slot(s) + ' in einkauf durch ' + slot(w) + '</span>';
            case 'delete': return '<span class="blk blk-lists">entferne ' + slot(s) + ' aus einkauf</span>';
            case 'item': return '<span class="blk blk-lists blk-rep">Element ' + slot(s) + ' von einkauf</span>';
            case 'length': return '<span class="blk blk-lists blk-rep">Länge von einkauf</span>';
            case 'contains': return '<span class="blk blk-lists blk-bool">einkauf enthält ' + slot(w) + '</span>';
            case 'index': return '<span class="blk blk-lists blk-rep">Index von ' + slot(w) + ' in einkauf</span>';
            case 'reset': return '<span class="blk blk-variables">setze einkauf auf</span> <span class="blk blk-lists blk-rep">Liste ' + BEISPIEL.map(slot).join(' ') + '</span>';
            case 'leer': return '<span class="blk blk-variables">setze einkauf auf</span> <span class="blk blk-lists blk-rep">Liste</span>';
            }
            return '';
        }

        function ausfuehren(op) {
            var w = wert(), s = stelle(), n = liste.length, i;
            var b = blockHtml(op, w || '…', stelleIn.value || '…');
            markiert = {};
            var brauchtWert = /^(add|insert|replace|contains|index)$/.test(op);
            var brauchtStelle = /^(insert|replace|delete|item)$/.test(op);
            if (brauchtWert && !w) { melden(b, undefined, null, 'Trag oben bei „Wert“ etwas ein.'); return zeichnen(); }
            if (brauchtStelle) {
                var maxStelle = op === 'insert' ? n + 1 : n;
                if (!ganz(s) || s < 1 || s > maxStelle) {
                    var f = n === 0 && op !== 'insert'
                        ? 'Die Liste ist leer – es gibt gar keine Stelle.'
                        : 'Stelle ' + esc(stelleIn.value || '?') + ' gibt es hier nicht: erlaubt ' + (maxStelle === 1 ? 'ist nur 1' : 'sind 1 bis ' + maxStelle) + '.';
                    if (op === 'item') { f += ' Snap! meldet dann keinen Fehler, sondern liefert ein leeres Ergebnis. Andere Sprachen (z. B. Java) brechen hier mit einem Fehler ab.'; }
                    else { f += ' Das Labor führt den Befehl deshalb nicht aus.'; }
                    melden(b, op === 'item' ? '➜ <em>(leer)</em>' : undefined, null, f);
                    return zeichnen();
                }
            }
            if ((op === 'add' || op === 'insert') && n >= MAX) {
                melden(b, undefined, null, 'Im Labor passen höchstens ' + MAX + ' Elemente in die Liste (in Snap! viel mehr). Entferne erst etwas.');
                return zeichnen();
            }

            switch (op) {
            case 'add':
                liste.push(w); markiert[n + 1] = 'neu';
                melden(b, undefined, [
                    '1 Schritt – ins nächste freie Fach hinter dem letzten schreiben.',
                    '1 Schritt – neues Glied ans Ende hängen (die Kette merkt sich, wo ihr Ende ist).']);
                break;
            case 'insert':
                liste.splice(s - 1, 0, w);
                markiert[s] = 'neu';
                for (i = s + 1; i <= n + 1; i++) { markiert[i] = 'verschoben'; }
                melden(b, undefined, [
                    s === n + 1 ? '1 Schritt – hinten ist frei, es wird nur geschrieben.'
                                : schritte(n - s + 2) + ' – ' + elemente(n - s + 1) + ' ein Fach nach hinten, dann wird geschrieben. Alle dahinter bekommen eine neue Nummer.',
                    s === n + 1 && n > 0 ? '1 Schritt – wie „hinzufügen“: neues Glied ans gemerkte Ende hängen.'
                                         : schritte(s) + ' – ' + laufen(s) + ', dann zwei Zeiger umhängen. Niemand muss umziehen.']);
                break;
            case 'replace':
                liste[s - 1] = w; markiert[s] = 'neu';
                melden(b, undefined, [
                    '1 Schritt – Fach ' + s + ' direkt öffnen und überschreiben.',
                    schritte(s) + ' – ' + laufen(s) + ', dann überschreiben.']);
                break;
            case 'delete':
                var weg = liste.splice(s - 1, 1)[0];
                for (i = s; i <= n - 1; i++) { markiert[i] = 'verschoben'; }
                melden(b, '<span class="ll-weg">„' + esc(weg) + '“ ist weg</span>', [
                    s === n ? '1 Schritt – das letzte Fach wird einfach geleert.'
                            : schritte(n - s) + ' – ' + elemente(n - s) + ' ein Fach nach vorne, damit keine Lücke bleibt.',
                    schritte(s) + ' – ' + laufen(s) + ', dann ' + (s === 1 ? 'den Anfang auf das zweite Glied setzen.' : 'den Zeiger am Glied davor auf das übernächste umhängen.')]);
                break;
            case 'item':
                markiert[s] = 'gelesen';
                melden(b, '➜ ' + esc(liste[s - 1]), [
                    '1 Schritt – Fach ' + s + ' liegt an bekannter Stelle im Speicher und wird direkt geöffnet.',
                    schritte(s) + ' – vom Anfang aus abzählen: ' + Array.apply(null, { length: s }).map(function (_, k) { return k + 1; }).join(' ➜ ') + '.']);
                break;
            case 'length':
                melden(b, '➜ ' + n, [
                    '1 Schritt – die Länge wird mitgezählt.',
                    '1 Schritt – die Länge wird mitgezählt.']);
                break;
            case 'contains':
            case 'index':
                var pos = liste.indexOf(w) + 1;
                for (i = 1; i <= (pos || n); i++) { markiert[i] = 'gelesen'; }
                var gesucht = pos ? schritte(pos) + ' – von vorne nachsehen, bis „' + esc(w) + '“ gefunden ist.'
                                  : schritte(Math.max(1, n)) + ' – alles durchsehen, ohne Treffer.';
                melden(b, op === 'contains' ? '➜ ' + (pos ? 'wahr' : 'falsch') : '➜ ' + pos + (pos ? '' : ' <em>(0 = nicht enthalten)</em>'),
                       [gesucht, gesucht + ' Beim Suchen sind beide gleich schnell.']);
                break;
            case 'reset':
                liste = BEISPIEL.slice();
                melden(b);
                break;
            case 'leer':
                liste = [];
                melden(b, undefined, null, 'Auch die leere Liste ist eine Liste – mit Länge 0.');
                break;
            }
            zeichnen();
        }

        root.addEventListener('click', function (e) {
            var a = e.target.closest('[data-ansicht]');
            if (a) {
                ansicht = a.getAttribute('data-ansicht');
                root.querySelectorAll('[data-ansicht]').forEach(function (x) { x.classList.toggle('aktiv', x === a); });
                zeichnen();
                return;
            }
            var b = e.target.closest('[data-op]');
            if (b) { ausfuehren(b.getAttribute('data-op')); }
        });
        wertIn.addEventListener('input', slotsAktualisieren);
        stelleIn.addEventListener('input', slotsAktualisieren);
        slotsAktualisieren();
        zeichnen();
    }

    /* ------------------------------------------------------- Durchlauf */
    var PUNKTE = [12, 7, 15, 9, 11];

    function durchlauf(root) {
        // Schritte: 0 = setze summe, dann je Element zwei Schritte (Element holen, summe ändern), zuletzt sagen
        var schritt = -1, timer = null;
        var letzter = 1 + 2 * PUNKTE.length;

        root.innerHTML =
            '<div class="dl-grid">' +
            '  <div class="dl-code">' +
            '    <div class="dl-z" data-z="0"><span class="blk blk-variables">setze summe auf ' + slot(0) + '</span></div>' +
            '    <div class="dl-z" data-z="1"><span class="blk blk-lists">für jedes ' + slot('Element') + ' von ' + slot('punkte') + '</span></div>' +
            '    <div class="dl-z dl-innen" data-z="2"><span class="blk blk-variables">ändere summe um ' + slot('Element') + '</span></div>' +
            '    <div class="dl-z" data-z="3"><span class="blk blk-looks">sage ' + slot('summe') + '</span></div>' +
            '  </div>' +
            '  <div class="dl-zustand">' +
            '    <div class="dl-liste"></div>' +
            '    <div class="dl-vars">' +
            '      <div class="dl-var"><span>Element</span><b class="dl-element">–</b></div>' +
            '      <div class="dl-var"><span>summe</span><b class="dl-summe">–</b></div>' +
            '    </div>' +
            '    <p class="dl-text"></p>' +
            '  </div>' +
            '</div>' +
            '<div class="snap-actions">' +
            '  <button type="button" class="btn btn-primary btn-sm" data-dl="schritt">Schritt ▶</button>' +
            '  <button type="button" class="btn btn-outline btn-sm" data-dl="play">▶▶ Abspielen</button>' +
            '  <button type="button" class="btn btn-outline btn-sm" data-dl="reset">⏮ Von vorn</button>' +
            '</div>' +
            '<table class="vorhersage dl-tabelle"><thead><tr><th>Durchgang</th><th>Element</th><th>summe danach</th></tr></thead><tbody></tbody></table>';

        var q = function (s) { return root.querySelector(s); };

        function zustand(k) {
            // liefert {zeile, nr (Durchgang), element, summe, text}
            if (k < 0) { return { zeile: -1, nr: 0, element: null, summe: null, text: 'Klicke auf „Schritt“. Jeder Klick führt genau einen Block aus.' }; }
            if (k === 0) { return { zeile: 0, nr: 0, element: null, summe: 0, text: 'summe beginnt bei 0 – sonst würde ein alter Wert mitgezählt.' }; }
            if (k === letzter) {
                var s = PUNKTE.reduce(function (a, b) { return a + b; }, 0);
                return { zeile: 3, nr: PUNKTE.length, element: PUNKTE[PUNKTE.length - 1], summe: s, text: 'Die Liste ist zu Ende, die Schleife ist fertig. Die Figur sagt ' + s + '.' };
            }
            var nr = Math.ceil(k / 2), holen = k % 2 === 1;
            var summe = PUNKTE.slice(0, holen ? nr - 1 : nr).reduce(function (a, b) { return a + b; }, 0);
            return {
                zeile: holen ? 1 : 2, nr: nr, element: PUNKTE[nr - 1], summe: summe,
                text: holen ? 'Durchgang ' + nr + ': Die Variable Element bekommt den Wert an Stelle ' + nr + '.'
                            : 'summe wird um ' + PUNKTE[nr - 1] + ' größer.'
            };
        }

        function zeichnen() {
            var z = zustand(schritt);
            root.querySelectorAll('.dl-z').forEach(function (x) { x.classList.toggle('aktiv', Number(x.getAttribute('data-z')) === z.zeile); });
            var l = q('.dl-liste');
            l.innerHTML = '<span class="dl-name">punkte</span>';
            PUNKTE.forEach(function (p, k) {
                var c = 'dl-fach';
                if (z.nr && k + 1 < z.nr) { c += ' fertig'; }
                if (z.nr === k + 1 && schritt > 0 && schritt < letzter) { c += ' aktiv'; }
                if (schritt === letzter) { c += ' fertig'; }
                l.appendChild(el('div', c, '<span class="ll-nr">' + (k + 1) + '</span><span>' + p + '</span>'));
            });
            q('.dl-element').textContent = z.element === null ? '–' : z.element;
            q('.dl-summe').textContent = z.summe === null ? '–' : z.summe;
            q('.dl-text').textContent = z.text;
            var tb = q('.dl-tabelle tbody');
            tb.innerHTML = '';
            for (var nr = 1; nr <= PUNKTE.length; nr++) {
                var fertig = schritt >= 2 * nr;
                var tr = el('tr', nr === z.nr && schritt < letzter && schritt > 0 ? 'aktiv' : '');
                tr.innerHTML = '<td>' + nr + '</td><td>' + (schritt >= 2 * nr - 1 ? PUNKTE[nr - 1] : '') + '</td><td>' +
                    (fertig ? PUNKTE.slice(0, nr).reduce(function (a, b) { return a + b; }, 0) : '') + '</td>';
                tb.appendChild(tr);
            }
            q('[data-dl="schritt"]').disabled = schritt >= letzter;
        }

        function stop() { clearInterval(timer); timer = null; q('[data-dl="play"]').textContent = '▶▶ Abspielen'; }

        root.addEventListener('click', function (e) {
            var b = e.target.closest('[data-dl]');
            if (!b) { return; }
            var a = b.getAttribute('data-dl');
            if (a === 'schritt') { stop(); if (schritt < letzter) { schritt++; } }
            else if (a === 'reset') { stop(); schritt = -1; }
            else if (a === 'play') {
                if (timer) { stop(); }
                else {
                    if (schritt >= letzter) { schritt = -1; }
                    b.textContent = '⏸ Anhalten';
                    timer = setInterval(function () {
                        schritt++;
                        zeichnen();
                        if (schritt >= letzter) { stop(); }
                    }, 1100);
                }
            }
            zeichnen();
        });
        zeichnen();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-listen-labor]').forEach(labor);
        document.querySelectorAll('[data-durchlauf]').forEach(durchlauf);
    });
})();
