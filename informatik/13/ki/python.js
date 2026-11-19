/*
 * KI-Sequenz (Informatik 13) – Python-Zellen im Browser (braucht ki.js; Python läuft in py-worker.js)
 *
 *   <div class="py" data-py="eindeutige-id" data-titel="…" data-files="data/xor.csv data/pinguine.csv">
 *       <div class="py-idea"> Idee, Schritte in Worten, „Achte auf“ </div>
 *       <script type="text/plain"> Code </script>
 *   </div>
 *   Jede Zelle bekommt vor dem Code eine .py-idea-Box (Pflicht in dieser Sequenz).
 *   Der Code ist bearbeitbar; Änderungen bleiben je id im localStorage ('kiPy:<id>').
 *   Jede Zelle läuft für sich (eigener Namensraum); Hilfsfunktionen stehen deshalb in jeder Zelle.
 *   Diagramme aus Python: import ki → ki.linie, ki.streu, ki.region, ki.balken, ki.tabelle, ki.ziffern.
 *   Pyodide-Ort: https://edu-mrh.de/embed/pyodide/, für lokale Tests <script src="python.js" data-pyodide="/_pyodide_test/">.
 */
(function () {
    'use strict';
    var SKRIPT = document.currentScript;
    var PY_BASE = (SKRIPT && SKRIPT.dataset.pyodide) || 'https://edu-mrh.de/embed/pyodide/';
    var h = KI.h, zahl = KI.zahl;
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // ---------- Diagramme ----------
    var FARBEN = ['#1d4ed8', '#d97706', '#16a34a', '#dc2626', '#9333ea', '#0891b2'];
    function grenzen(werte) {
        var w = werte.filter(function (v) { return v !== null && isFinite(v); });
        var a = Math.min.apply(null, w), b = Math.max.apply(null, w);
        if (a === b) { a -= 1; b += 1; }
        var r = b - a; return [a - r * .05, b + r * .05];
    }
    function zeichne(box, art, spec) {
        var fig = h('figure', { cls: 'py-fig' });
        if (spec.titel) fig.appendChild(h('figcaption', { text: spec.titel }));
        box.appendChild(fig);
        if (art === 'linie') {
            var namen = Object.keys(spec.reihen), alle = [];
            namen.forEach(function (n) { alle = alle.concat(spec.reihen[n]); });
            var welt = new KI.Punktwelt(fig, { x: grenzen(spec.x), y: grenzen(alle), xName: spec.xname, yName: spec.yname, breite: 520, hoehe: 280, info: false });
            namen.forEach(function (n, k) {
                var r = spec.reihen[n];
                for (var i = 1; i < r.length; i++) if (r[i] !== null && r[i - 1] !== null) welt.linie(spec.x[i - 1], r[i - 1], spec.x[i], r[i], { farbe: FARBEN[k % FARBEN.length], breite: 2.2 });
                if (r.length < 40) r.forEach(function (v, i) { if (v !== null) welt.punkt(spec.x[i], v, { farbe: FARBEN[k % FARBEN.length], r: 3 }); });
            });
            if (namen.length > 1 || namen[0] !== (spec.yname || 'Wert')) fig.appendChild(h('div', { cls: 'legende', html: namen.map(function (n, k) { return '<span style="--f:' + FARBEN[k % FARBEN.length] + '">' + esc(n) + '</span>'; }).join('') }));
        } else if (art === 'streu' || art === 'region') {
            var b = spec.bereich || [0, 1];
            var welt2 = new KI.Punktwelt(fig, { x: b, y: b, xName: spec.xname, yName: spec.yname, breite: 400, hoehe: 380, info: false });
            if (art === 'region') {
                var g = spec.gitter, n = g.length;
                welt2.region(function (x, y) {
                    var i = Math.min(n - 1, Math.max(0, Math.floor((x - b[0]) / (b[1] - b[0]) * n))), j = Math.min(n - 1, Math.max(0, Math.floor((y - b[0]) / (b[1] - b[0]) * n)));
                    var v = g[j][i]; if (v === null) return null;
                    v = Math.max(0, Math.min(1, v));
                    return 'rgba(' + Math.round(37 + (220 - 37) * v) + ',' + Math.round(99 + (38 - 99) * v) + ',' + Math.round(235 + (38 - 235) * v) + ',.28)';
                }, n);
            }
            (spec.punkte || []).forEach(function (p, i) {
                var k = spec.klassen ? spec.klassen[i] : 0;
                welt2.punkt(p[0], p[1], { farbe: KI.farbe.klasse(k), form: k ? 'quadrat' : 'kreis', r: 3.4 });
            });
        } else if (art === 'balken') {
            var w = spec.werte, max = Math.max.apply(null, w.concat([0])), min = Math.min.apply(null, w.concat([0]));
            var welt3 = new KI.Punktwelt(fig, { x: [0, w.length], y: [min, max * 1.08 || 1], xName: spec.xname, yName: spec.yname, breite: 520, hoehe: 260, info: false, raster: false });
            var c = welt3.ctx;
            w.forEach(function (v, i) {
                var x0 = welt3.px(i + .15), x1 = welt3.px(i + .85), y0 = welt3.py(0), y1 = welt3.py(v);
                c.fillStyle = FARBEN[0]; c.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
                c.fillStyle = '#334155'; c.font = '11px system-ui, sans-serif'; c.textAlign = 'center';
                c.fillText(spec.namen[i], (x0 + x1) / 2, welt3.H - welt3.rand.u + 28);
            });
        } else if (art === 'tabelle') {
            var t = '<div class="tab-scroll"><table class="ki-tab">';
            if (spec.kopf) t += '<tr>' + spec.kopf.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr>';
            spec.zeilen.forEach(function (z) { t += '<tr>' + z.map(function (v) { return '<td>' + esc(typeof v === 'number' ? zahl(Math.round(v * 10000) / 10000) : v) + '</td>'; }).join('') + '</tr>'; });
            fig.insertAdjacentHTML('beforeend', t + '</table></div>');
        } else if (art === 'ziffern') {
            var reihe = h('div', { cls: 'ziffern' });
            spec.bilder.forEach(function (bild, k) {
                var cv = h('canvas', { width: 64, height: 64, 'aria-label': 'Ziffernbild ' + (spec.namen ? spec.namen[k] : k) }), cx = cv.getContext('2d');
                for (var i = 0; i < 64; i++) { var g2 = Math.round(255 - bild[i] / 16 * 255); cx.fillStyle = 'rgb(' + g2 + ',' + g2 + ',' + g2 + ')'; cx.fillRect((i % 8) * 8, Math.floor(i / 8) * 8, 8, 8); }
                reihe.appendChild(h('figure', {}, [cv, spec.namen ? h('figcaption', { text: spec.namen[k] }) : null]));
            });
            fig.appendChild(reihe);
        }
    }

    // ---------- Zellen ----------
    var worker = null, zustand = 'aus', laeuft = null, zellen = {};
    var HINWEISE = [
        [/IndentationError|TabError/, function () { return 'Einrückung: Zeilen in einem for, if oder def brauchen 4 Leerzeichen mehr als die Zeile darüber, innerhalb eines Blocks gleich viele.'; }],
        [/NameError: name '([^']*)'/, function (m) { return '„' + esc(m[1]) + '“ ist nicht definiert. Tippfehler? Jede Zelle läuft für sich: Eine Variable aus einer anderen Zelle gibt es hier nicht.'; }],
        [/ZeroDivisionError/, function () { return 'Division durch 0: eine leere Liste?'; }],
        [/OverflowError: math range error/, function () { return 'math.exp mit einer sehr großen Zahl. Ist die Lernrate zu groß, laufen die Gewichte davon.'; }],
        [/IndexError/, function () { return 'Ein Index außerhalb der Liste. Stimmen die Längen der Listen (Zahl der Eingaben, Neuronen, Gewichte)?'; }],
        [/No module named '(numpy|matplotlib|pandas|sklearn|torch)'/, function (m) { return esc(m[1]) + ' gibt es auf dieser Seite nicht, nur die Standardbibliothek und ki (Diagramme). Am eigenen Rechner: siehe „Python einrichten“.'; }],
        [/SyntaxError/, function () { return 'Prüfe Klammern, Anführungszeichen und den Doppelpunkt am Ende von for-, if- und def-Zeilen.'; }],
        [/TypeError/, function () { return 'Ein Wert hat den falschen Typ, z. B. eine Liste, wo eine Zahl erwartet wird. Lies die letzte Zeile der Fehlermeldung genau.'; }]
    ];
    function aufraeumen(msg) {
        var z = String(msg).split('\n'), i = -1;
        for (var k = 0; k < z.length; k++) if (/File "<exec>"/.test(z[k])) { i = k; break; }
        return (i >= 0 ? ['Traceback (most recent call last):'].concat(z.slice(i)) : z).join('\n').trim();
    }
    function holeWorker() {
        if (worker) return worker;
        worker = new Worker('py-worker.js?base=' + encodeURIComponent(PY_BASE));
        zustand = 'laden';
        worker.onmessage = nachricht;
        worker.onerror = function (e) { if (laeuft) fertig(laeuft, false, 'Python konnte nicht gestartet werden (' + (e.message || 'Worker-Fehler') + '). Seite neu laden.'); beende(); };
        return worker;
    }
    function beende() { if (worker) worker.terminate(); worker = null; zustand = 'aus'; }
    function nachricht(e) {
        var m = e.data, c = m.id ? zellen[m.id] : laeuft;
        if (m.type === 'status') { if (laeuft) laeuft.status.textContent = m.text; return; }
        if (m.type === 'ready') { zustand = 'bereit'; if (laeuft) laeuft.status.textContent = 'läuft …'; return; }
        if (!c) return;
        if (m.type === 'out') {
            var last = c.ausgabe.lastElementChild;
            if (!last || last.tagName !== 'PRE' || last.classList.contains('err') !== !!m.err) { last = h('pre', { cls: m.err ? 'err' : '' }); c.ausgabe.appendChild(last); }
            last.textContent += m.text;
        } else if (m.type === 'plot') zeichne(c.ausgabe, m.kind, m.spec);
        else if (m.type === 'done') fertig(c, m.ok, m.error);
    }
    function fertig(c, ok, fehler) {
        c.status.textContent = '';
        if (!ok && fehler) {
            c.ausgabe.appendChild(h('pre', { cls: 'err', text: aufraeumen(fehler) }));
            for (var i = 0; i < HINWEISE.length; i++) { var mm = String(fehler).match(HINWEISE[i][0]); if (mm) { c.ausgabe.appendChild(h('div', { cls: 'tipp', html: '<strong>Hinweis:</strong> ' + HINWEISE[i][1](mm) })); break; } }
        } else if (ok && !c.ausgabe.querySelector('pre, figure')) c.ausgabe.appendChild(h('p', { style: 'font-size:.88rem;color:var(--gray)', text: 'Fertig, ohne Ausgabe. Mit print(…) zeigst du ein Ergebnis an.' }));
        c.zeit.textContent = ok ? '(' + ((Date.now() - c.start) / 1000).toFixed(1).replace('.', ',') + ' s)' : '';
        laeuft = null;
        Object.keys(zellen).forEach(function (k) { zellen[k].start_.disabled = false; zellen[k].stopp.hidden = true; });
    }
    function starte(c) {
        if (laeuft) return;
        laeuft = c; c.start = Date.now();
        c.aus.classList.add('zeigen'); c.ausgabe.innerHTML = ''; c.zeit.textContent = '';
        c.status.textContent = zustand === 'bereit' ? 'läuft …' : 'Python wird gestartet …';
        Object.keys(zellen).forEach(function (k) { zellen[k].start_.disabled = true; });
        c.stopp.hidden = false;
        holeWorker().postMessage({ type: 'run', id: c.id, code: c.ta.value, files: c.dateien });
    }
    function zelle(el) {
        var id = el.getAttribute('data-py'), quelle = el.querySelector('script[type="text/plain"]');
        var orig = (quelle ? quelle.textContent : '').replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
        var dateien = (el.getAttribute('data-files') || '').split(/\s+/).filter(Boolean).map(function (p) { return { name: p.split('/').pop(), url: new URL(p, location.href).href, pfad: p }; });
        var leiste = h('div', { cls: 'py-bar' });
        leiste.appendChild(h('span', { cls: 'ttl', text: el.getAttribute('data-titel') || 'Python' }));
        if (dateien.length) leiste.appendChild(h('span', { cls: 'files', html: dateien.map(function (f) { return '<a href="' + esc(f.pfad) + '" download>' + esc(f.name) + '</a>'; }).join(' · ') }));
        var geaendert = h('span', { cls: 'py-edited' });
        var start_ = h('button', { type: 'button', cls: 'run', text: '▶ Ausführen', title: 'Ausführen (Strg + Enter)' });
        var stopp = h('button', { type: 'button', text: '■ Stopp' }); stopp.hidden = true;
        var zurueck = h('button', { type: 'button', text: 'Zurücksetzen' });
        var kopie = h('button', { type: 'button', text: 'Kopieren' });
        [geaendert, start_, stopp, zurueck, kopie].forEach(function (x) { leiste.appendChild(x); });
        el.insertBefore(leiste, el.firstChild);
        var idee = el.querySelector('.py-idea');
        if (idee) el.insertBefore(idee, leiste.nextSibling);
        var ta = h('textarea', { cls: 'py-code', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Python-Code: ' + (el.getAttribute('data-titel') || id) + '. Strg + Enter führt aus, Escape und dann Tab verlässt den Editor.' });
        el.appendChild(ta);
        var gespeichert = KI.speicher.lies('kiPy:' + id, null);
        ta.value = typeof gespeichert === 'string' ? gespeichert : orig;
        function groesse() { ta.rows = Math.min(36, ta.value.split('\n').length + 1); }
        function markiere() { var g = ta.value !== orig; geaendert.textContent = g ? 'geändert' : ''; zurueck.disabled = !g; }
        groesse(); markiere();
        var aus = h('div', { cls: 'py-out', 'aria-live': 'polite' }), status = h('div', { cls: 'status' }), zeit = h('span', { cls: 'py-zeit' }), ausgabe = h('div');
        aus.appendChild(status); aus.appendChild(ausgabe); aus.appendChild(zeit);
        el.appendChild(aus);
        var c = { id: id, ta: ta, dateien: dateien, aus: aus, ausgabe: ausgabe, status: status, zeit: zeit, start_: start_, stopp: stopp };
        zellen[id] = c;
        var escape = false;
        ta.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { escape = true; return; }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); starte(c); return; }
            if (e.key === 'Tab' && !escape && !e.shiftKey) {
                e.preventDefault();
                var s = ta.selectionStart, en = ta.selectionEnd;
                ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
                ta.selectionStart = ta.selectionEnd = s + 4; ta.dispatchEvent(new Event('input')); return;
            }
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                var p = ta.selectionStart, anf = ta.value.lastIndexOf('\n', p - 1) + 1, ein = ta.value.slice(anf, p).match(/^ */)[0];
                if (/:\s*$/.test(ta.value.slice(anf, p))) ein += '    ';
                if (ein) { e.preventDefault(); ta.value = ta.value.slice(0, p) + '\n' + ein + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 1 + ein.length; ta.dispatchEvent(new Event('input')); }
            }
            escape = false;
        });
        ta.addEventListener('input', function () { groesse(); markiere(); KI.speicher.schreib('kiPy:' + id, ta.value === orig ? null : ta.value); });
        start_.addEventListener('click', function () { starte(c); });
        stopp.addEventListener('click', function () { if (laeuft !== c) return; beende(); fertig(c, false, null); ausgabe.appendChild(h('p', { style: 'font-size:.88rem', text: 'Gestoppt. Beim nächsten Ausführen startet Python neu.' })); });
        zurueck.addEventListener('click', function () { if (!confirm('Zelle auf den ursprünglichen Code zurücksetzen? Deine Änderungen gehen verloren.')) return; ta.value = orig; KI.speicher.schreib('kiPy:' + id, null); groesse(); markiere(); });
        kopie.addEventListener('click', function () {
            var ok = function () { kopie.textContent = 'Kopiert'; setTimeout(function () { kopie.textContent = 'Kopieren'; }, 1500); };
            if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(ok, function () { ta.select(); }); else ta.select();
        });
    }
    KI.python = { starte: function (id) { if (zellen[id]) starte(zellen[id]); } };
    document.addEventListener('DOMContentLoaded', function () { document.querySelectorAll('.py[data-py]').forEach(zelle); });
})();
