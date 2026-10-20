/* Auswertung Online-Check (generisch für alle Checks aus build_check.py).

   Eingabe (nur lokal im Browser gelesen):
   Liegt zentral unter /checks/auswertung/ (für alle Checks, Ordner per .htaccess geschützt).
   - Schlüsseldatei material/<check>-key.json (format 2): Fragen, IDs, Lösungen, Notenschlüssel
   - Ergebnisdateien der Schüler:innen (check-engine.js): Auslosung (draw), Antworten, Quittung
   Ausgabe: Tabelle, CSV und je Person ein Bericht über genau zwei A4-Seiten
   (mit Textblöcken vier, falls zwei Seiten nur mit sehr kleiner Schrift reichen)
   (Druckdialog → „Als PDF speichern“): Punkte, Notenpunkte mit Notenschlüssel,
   dann alle Aufgaben in der Reihenfolge und Anordnung, die die Person gesehen hat,
   mit eigener Antwort, richtiger Lösung und Punkten.

   Bewertung: single = alles oder nichts; multi = max(0, richtige − falsche Kreuze)
   ÷ Zahl der richtigen Optionen × Punkte; match = gleicher Anteil je Zeile;
   jeweils auf 0,5 gerundet. Notenpunkte: höchste Stufe, deren Prozentgrenze
   erreicht ist. Die Seite enthält selbst keine Fragen und keine Lösungen.
   Textblöcke (Schlüssel: "passages", Auslosung: draw[i].ps): Der Text steht im
   Bericht einmal kompakt mit Zeilennummern vor seinen Aufgaben. */
(function () {
    'use strict';

    /* Texte im Bericht (Sprache aus der Schlüsseldatei: "lang") */
    var REP = {
        en: {
            task: 'Task', text: 'Text', p: 'P', points: 'points', np: 'grade points', of: 'of', page: 'page', receipt: 'receipt', time: 'time',
            handed: 'handed in', scale: 'Grade scale', npRow: 'NP', ptsRow: 'from', all: 'Select all that apply.',
            next: 'Next step: {np} NP from {pts} P ({diff} P more).', top: 'Highest grade point reached.',
            okSel: 'your answer – correct', badSel: 'your answer – wrong', miss: 'correct answer you did not choose',
            mkOk: '✓', mkBad: '✗', mkMiss: '✓ correct', noAnswer: 'no answer', correctIs: '→ ',
            calcMulti: '({tp} right − {fp} wrong) ÷ {n} correct × {pts} P = {res} P',
            calcMatch: '{r} of {n} rows right × {pts} P = {res} P', rounded: ' (rounded to 0.5)'
        },
        de: {
            task: 'Aufgabe', text: 'Text', p: 'P', points: 'Punkte', np: 'Notenpunkte', of: 'von', page: 'Seite', receipt: 'Quittung', time: 'Zeit',
            handed: 'abgegeben', scale: 'Notenschlüssel', npRow: 'NP', ptsRow: 'ab', all: 'Kreuze alle zutreffenden an.',
            next: 'Nächste Stufe: {np} NP ab {pts} P (noch {diff} P).', top: 'Höchste Notenpunktzahl erreicht.',
            okSel: 'deine Antwort – richtig', badSel: 'deine Antwort – falsch', miss: 'richtige Antwort, nicht gewählt',
            mkOk: '✓', mkBad: '✗', mkMiss: '✓ richtig', noAnswer: 'keine Antwort', correctIs: '→ ',
            calcMulti: '({tp} richtig − {fp} falsch) ÷ {n} richtige × {pts} P = {res} P',
            calcMatch: '{r} von {n} Zeilen richtig × {pts} P = {res} P', rounded: ' (auf 0,5 gerundet)'
        }
    };
    var FS_MAX = 10.5, FS_MIN = 7, FS_STEP = 0.25;   // Schriftgröße im Bericht (pt), wird angepasst bis 2 Seiten passen

    var KEY = null, RESULTS = [], FILES = {}, ROWS = [];
    var $ = function (id) { return document.getElementById(id); };

    /* ---------------------------------------------------------------- Helfer */
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(code) { return String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
    function half(x) { return Math.round(x * 2) / 2; }
    function fmt(p) { return String(half(p)).replace('.', ','); }
    function pc1(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function when(ts) { var d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
    function sha(s) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
            return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        });
    }
    function receipt(r) {   // gleiche Formel wie check-engine.js (ab rv 2 mit Kurs, Zeitzuschlag, Start)
        var parts = r.rv === 2 ? [norm(KEY.startCode), KEY.check, r.name, r.kurs, r.zeitzuschlag || 0, r.startedAt, r.submittedAt, JSON.stringify(r.answers || {})]
            : [norm(KEY.startCode), KEY.check, r.name, r.submittedAt, JSON.stringify(r.answers || {})];
        return sha(parts.join('|')).then(function (x) { return x.slice(0, 8).toUpperCase(); });
    }
    /* Zeit: erlaubt = Minuten × (1 + Zuschlag); Dauer aus Start/Abgabe (ältere Dateien ohne Kurs/Zuschlag) */
    function allowed(r) { return KEY.minutes * (1 + (r.zeitzuschlag || 0) / 100); }
    function took(r) { return (r.submittedAt - r.startedAt) / 60000; }
    function mmss(min) { var s = Math.max(0, Math.round(min * 60)); return Math.floor(s / 60) + ':' + pad(s % 60); }
    function late(r) { return took(r) > allowed(r) + 0.5; }
    function download(name, text, type) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: type }));
        a.download = name; document.body.appendChild(a); a.click(); a.remove();
    }

    /* ---------------------------------------------------------------- Bewertung */
    function evaluate(k, ans) {
        var e = { points: 0, max: k.points };
        if (k.type === 'single') {
            e.points = ans === k.correct ? k.points : 0;
        } else if (k.type === 'multi') {
            ans = Array.isArray(ans) ? ans : [];
            e.tp = ans.filter(function (a) { return k.correct.indexOf(a) >= 0; }).length;
            e.fp = ans.length - e.tp; e.n = k.correct.length;
            e.raw = Math.max(0, e.tp - e.fp) / e.n * k.points;
            e.points = half(e.raw);
        } else {
            ans = ans && typeof ans === 'object' ? ans : {};
            e.n = Object.keys(k.correct).length;
            e.r = Object.keys(k.correct).filter(function (r) { return ans[r] === k.correct[r]; }).length;
            e.raw = e.r / e.n * k.points;
            e.points = half(e.raw);
        }
        e.state = e.points >= k.points ? 'st-full' : e.points > 0 ? 'st-part' : 'st-zero';
        return e;
    }
    function steps() {   // [{np, pct, min}] absteigend; min = kleinste Punktzahl (0,5er-Schritte) für diese Stufe
        return KEY.scale.map(function (s) {
            return { pct: s[0], np: s[1], min: Math.ceil(s[0] / 100 * KEY.max * 2 - 1e-9) / 2 };
        }).sort(function (a, b) { return b.np - a.np; });
    }
    function grade(pts) {
        var st = steps();
        for (var i = 0; i < st.length; i++) if (pts >= st[i].min) return { np: st[i].np, next: i > 0 ? st[i - 1] : null };
        return { np: 0, next: st[st.length - 1] };
    }

    /* ---------------------------------------------------------------- Dateien lesen */
    function addFiles(list) {
        Promise.all(Array.prototype.map.call(list, function (f) {
            return f.text().then(function (t) {
                var j; try { j = JSON.parse(t); } catch (e) { return { file: f.name, err: 'keine JSON-Datei' }; }
                return { file: f.name, json: j };
            });
        })).then(function (read) {
            var msgs = [];
            read.forEach(function (x) {
                if (x.err) { msgs.push(esc(x.file) + ': ' + x.err); return; }
                var j = x.json;
                if (j.items && j.startCode) {
                    if (j.format !== 2) { msgs.push(esc(x.file) + ': Schlüsseldatei im alten Format – bitte mit build_check.py neu erzeugen.'); return; }
                    if (KEY && KEY.check !== j.check) RESULTS = [];
                    KEY = j;
                } else if (j.draw && j.answers !== undefined) {
                    var id = JSON.stringify([j.name, j.submittedAt, j.answers, j.receipt]);
                    if (FILES[id]) { msgs.push(esc(x.file) + ': schon geladen'); return; }
                    FILES[id] = true;
                    RESULTS.push({ file: x.file, r: j });
                } else msgs.push(esc(x.file) + ': weder Schlüssel- noch Ergebnisdatei');
            });
            $('status').innerHTML = (KEY ? 'Schlüssel: <b>' + esc(KEY.title) + '</b> (Build ' + esc(KEY.build) + ', ' + KEY.max + ' P) · ' : '<span class="bad">Noch keine Schlüsseldatei.</span> ') +
                RESULTS.length + ' Ergebnisdatei(en)' + (msgs.length ? '<br><span class="bad">' + msgs.join('<br>') + '</span>' : '');
            if (KEY && RESULTS.length) score();
        });
    }

    function score() {
        Promise.all(RESULTS.map(function (x) {
            var r = x.r;
            if (r.check !== KEY.check) return { file: x.file, r: r, err: 'gehört zu einem anderen Check (' + esc(r.check) + ')' };
            if (r.build !== KEY.build) return { file: x.file, r: r, err: 'passt nicht zu dieser Schlüsseldatei (anderer Build ' + esc(r.build || '–') + ')' };
            var missing = r.draw.filter(function (d) { return !KEY.items[d.id]; });
            if (missing.length) return { file: x.file, r: r, err: 'unbekannte Aufgaben ' + missing.map(function (d) { return esc(d.id); }).join(', ') };
            var ev = r.draw.map(function (d) { return evaluate(KEY.items[d.id], (r.answers || {})[d.id]); });
            var pts = ev.reduce(function (a, e) { return a + e.points; }, 0);
            return receipt(r).then(function (rc) {
                return { file: x.file, r: r, ev: ev, pts: pts, pct: pts / KEY.max * 100, g: grade(pts), ok: rc === r.receipt };
            });
        })).then(function (rows) {
            rows.sort(function (a, b) {
                return String(a.r.kurs || '').localeCompare(String(b.r.kurs || ''), 'de', { numeric: true }) ||
                    String(a.r.name || '').localeCompare(String(b.r.name || ''), 'de');
            });
            ROWS = rows;
            table(); reports();
        });
    }

    /* ---------------------------------------------------------------- Tabelle + CSV */
    function table() {
        var good = ROWS.filter(function (x) { return !x.err; });
        var names = {}; good.forEach(function (x) { names[x.r.name] = (names[x.r.name] || 0) + 1; });
        var h = '<tr><th>Kurs</th><th>Name</th><th>Punkte</th><th>%</th><th>NP</th><th>je Aufgabe</th><th>abgegeben</th><th>Zeitzuschlag</th><th>Dauer / erlaubt</th><th>Quittung</th><th></th></tr>';
        ROWS.forEach(function (x, i) {
            if (x.err) { h += '<tr class="err"><td>' + esc(x.r.kurs || '') + '</td><td>' + esc(x.r.name || x.file) + '</td><td colspan="9">' + esc(x.file) + ': ' + x.err + '</td></tr>'; return; }
            h += '<tr><td>' + esc(x.r.kurs || '–') + '</td><td>' + esc(x.r.name) + (names[x.r.name] > 1 ? ' <span class="warn">doppelt?</span>' : '') + '</td>' +
                '<td class="num">' + fmt(x.pts) + ' / ' + KEY.max + '</td><td class="num">' + pc1(x.pct) + '</td><td class="num"><b>' + x.g.np + '</b></td>' +
                '<td class="per">' + x.ev.map(function (e) { return fmt(e.points); }).join(' · ') + '</td>' +
                '<td>' + when(x.r.submittedAt) + '</td><td class="num">' + (x.r.zeitzuschlag ? '<b>+' + x.r.zeitzuschlag + ' %</b>' : '–') + '</td>' +
                '<td class="num">' + mmss(took(x.r)) + ' / ' + mmss(allowed(x.r)) + (late(x.r) ? ' <span class="warn" title="länger als erlaubt (Browser zwischendurch geschlossen?)">!</span>' : '') + '</td>' +
                '<td>' + (x.ok ? esc(x.r.receipt) + ' ✓' : '<span class="warn">verändert?</span>') + '</td>' +
                '<td><button class="btn small ghost" data-one="' + i + '">PDF</button></td></tr>';
        });
        $('table').innerHTML = h;
        var avgP = good.reduce(function (a, x) { return a + x.pts; }, 0) / (good.length || 1);
        var avgN = good.reduce(function (a, x) { return a + x.g.np; }, 0) / (good.length || 1);
        $('summary').textContent = good.length + ' Abgabe(n) · Ø ' + pc1(avgP) + ' von ' + KEY.max + ' P · Ø ' + pc1(avgN) + ' NP';
        $('out').hidden = false;
        Array.prototype.forEach.call(document.querySelectorAll('[data-one]'), function (b) {
            b.addEventListener('click', function () { printOnly(+b.dataset.one); });
        });
    }
    function csv() {
        var first = ROWS.filter(function (x) { return !x.err; })[0];
        // feste Spalten zuerst (Excel-Mappe „Prüfungsabgaben“ liest Quittung, Punkte, max, NP), Aufgaben am Ende
        var head = ['Kurs', 'Name', 'Quittung', 'Punkte', 'max', 'Prozent', 'NP', 'Zeitzuschlag (%)', 'Dauer (min)', 'erlaubt (min)', 'abgegeben', 'Quittung ok']
            .concat(first ? first.ev.map(function (e, i) { return 'A' + (i + 1); }) : []);
        var lines = [head.join(';')];
        ROWS.forEach(function (x) {
            if (x.err) { lines.push([x.r.kurs || '', x.r.name || x.file, x.r.receipt || '', 'Fehler: ' + x.err.replace(/<[^>]+>/g, '')].join(';')); return; }
            lines.push([x.r.kurs || '', x.r.name, x.r.receipt || '', fmt(x.pts), KEY.max, pc1(x.pct), x.g.np, x.r.zeitzuschlag || 0, pc1(took(x.r)), pc1(allowed(x.r)),
                when(x.r.submittedAt), x.ok ? 'ok' : 'prüfen'].concat(x.ev.map(function (e) { return fmt(e.points); })).join(';'));
        });
        download(KEY.check + '_auswertung.csv', '﻿' + lines.join('\n') + '\n', 'text/csv;charset=utf-8');
    }

    /* ---------------------------------------------------------------- Bericht je Person */
    function L() { return REP[(KEY.lang || 'en').slice(0, 2)] || REP.en; }

    function headBlock(x) {
        var t = L(), st = steps(), g = x.g;
        var npRow = '<th class="rowlab">' + t.npRow + '</th>', ptRow = '<td class="rowlab">' + t.ptsRow + '</td>';
        st.forEach(function (s) {
            var here = s.np === g.np ? ' class="here"' : '';
            npRow += '<th' + here + '>' + s.np + '</th>'; ptRow += '<td' + here + '>' + fmt(s.min) + '</td>';
        });
        var next = g.next ? fill(t.next, { np: g.next.np, pts: fmt(g.next.min), diff: fmt(g.next.min - x.pts) }) : t.top;
        var chips = x.ev.map(function (e, i) { return '<span class="r-chip ' + e.state + '">' + (i + 1) + ': ' + fmt(e.points) + '/' + fmt(e.max) + '</span>'; }).join('');
        return '<div class="r-head"><div class="r-kick">' + esc(KEY.subtitle) + '</div>' +
            '<div class="r-when">' + t.handed + ' ' + when(x.r.submittedAt) + ' · ' + t.time + ' ' + mmss(took(x.r)) + ' / ' + mmss(allowed(x.r)) +
            (x.r.zeitzuschlag ? ' (+' + x.r.zeitzuschlag + ' %)' : '') + '<br>' + t.receipt + ' ' + esc(x.r.receipt || '–') + '</div>' +
            '<div class="r-title">' + esc(KEY.title) + '</div><div class="r-name">' + esc(x.r.name) + (x.r.kurs ? ' <span class="r-kurs">· ' + esc(x.r.kurs) + '</span>' : '') + '</div></div>' +
            '<div class="r-sum"><div class="r-np"><b>' + g.np + '</b><span>' + t.np + '</span></div><div class="r-right">' +
            '<div class="r-pts"><b>' + fmt(x.pts) + ' / ' + fmt(KEY.max) + '</b> ' + t.points + ' · ' + pc1(x.pct) + ' %</div>' +
            '<table class="r-scale" aria-label="' + t.scale + '"><tr>' + npRow + '</tr><tr>' + ptRow + '</tr></table>' +
            '<div class="r-next">' + next + '</div><div class="r-tasks">' + chips + '</div></div></div>';
    }
    function legendBlock() {
        var t = L();
        return '<div class="r-legend"><span><i style="background:var(--ok-bg);border:.3mm solid var(--ok)"></i>' + t.mkOk + ' ' + t.okSel + '</span>' +
            '<span><i style="background:var(--bad-bg);border:.3mm solid var(--bad)"></i>' + t.mkBad + ' ' + t.badSel + '</span>' +
            '<span><i style="border:.45mm dashed var(--ok)"></i>' + t.miss + '</span></div>';
    }
    function itemBlock(x, n) {
        var t = L(), d = x.r.draw[n], k = KEY.items[d.id], e = x.ev[n], a = (x.r.answers || {})[d.id];
        var rounded = e.raw != null && Math.abs(e.raw - e.points) > 1e-9 ? t.rounded : '';
        var calc = k.type === 'multi' ? fill(t.calcMulti, { tp: e.tp, fp: e.fp, n: e.n, pts: fmt(k.points), res: fmt(e.points) }) + rounded
            : k.type === 'match' ? fill(t.calcMatch, { r: e.r, n: e.n, pts: fmt(k.points), res: fmt(e.points) }) + rounded : '';
        var h = '<div class="r-it ' + e.state + '"><div class="r-prompt"><span class="r-ith"><span class="r-calc">' + calc + '</span>' +
            '<span class="r-ip">' + fmt(e.points) + ' / ' + fmt(e.max) + ' ' + t.p + '</span></span>' +
            '<b class="r-n">' + t.task + ' ' + (n + 1) + '</b> ' + k.prompt + '</div>';
        if (k.type === 'single' || k.type === 'multi') {
            var byId = {}; k.options.forEach(function (o) { byId[o.id] = o; });
            var right = k.type === 'single' ? [k.correct] : k.correct, mine = k.type === 'single' ? (a ? [a] : []) : (Array.isArray(a) ? a : []);
            if (k.type === 'multi') h += '<div class="r-hint">' + t.all + '</div>';
            h += '<ul class="r-opts">';
            d.order.forEach(function (oid) {
                var o = byId[oid]; if (!o) return;
                var sel = mine.indexOf(oid) >= 0, ok = right.indexOf(oid) >= 0;
                var cls = sel ? (ok ? 'sel ok' : 'sel bad') : (ok ? 'miss' : '');
                var mk = sel ? (ok ? t.mkOk : t.mkBad) : (ok ? t.mkMiss : '');
                h += '<li class="o ' + cls + '"><span class="box ' + (k.type === 'single' ? 'radio' : 'check') + '"></span><span>' + o.text + '</span><span class="mk">' + mk + '</span></li>';
            });
            h += '</ul>';
        } else {
            var rows = {}, cats = {};
            k.rows.forEach(function (r) { rows[r.id] = r; });
            k.categories.forEach(function (c) { cats[c.id] = c.label; });
            a = a && typeof a === 'object' ? a : {};
            h += '<table class="r-match">';
            d.order.forEach(function (rid) {
                var r = rows[rid]; if (!r) return;
                var mine = a[rid], ok = mine === k.correct[rid];
                h += '<tr class="' + (ok ? 'ok' : 'bad') + '"><td>' + r.text + '</td>' +
                    '<td class="a"><span class="mk">' + (ok ? t.mkOk : t.mkBad) + '</span>' +
                    (mine ? '<span class="sel">' + esc(cats[mine] || mine) + '</span>' : '<span class="none">' + t.noAnswer + '</span>') +
                    (ok ? '' : ' <span class="fix">' + t.correctIs + esc(cats[k.correct[rid]]) + '</span>') + '</td></tr>';
            });
            h += '</table>';
        }
        return h + '</div>';
    }

    function textBlock(ps, n) {
        var p = (KEY.passages || {})[ps], no = 0;
        if (!p) return '';
        var h = '<div class="r-text"><div class="r-tt"><b>' + L().text + ' ' + n + '</b> ' + esc(p.title) + (p.byline ? ' <span>' + esc(p.byline) + '</span>' : '') + '</div><div class="r-lines">';
        p.paras.forEach(function (para) {
            para.forEach(function (l, i) {
                no++;
                h += '<div class="ln' + (i === 0 && no > 1 ? ' np' : '') + '"><i>' + (no % 5 === 0 ? no : '') + '</i><span>' + l + '</span></div>';
            });
        });
        return h + '</div></div>';
    }

    function sheet(rep) {
        var s = document.createElement('div');
        s.className = 'sheet';
        s.innerHTML = '<div class="body"></div><div class="foot"><span></span><span></span></div>';
        rep.appendChild(s);
        return s.querySelector('.body');
    }
    function over(body) { return body.scrollHeight > body.clientHeight + 1; }
    /* Blöcke auf Seiten verteilen; Rückgabe: Zahl der Seiten (bei limit: Abbruch, sobald überschritten) */
    function layout(rep, blocks, fs, two, limit) {
        rep.innerHTML = '';
        rep.style.setProperty('--fs', fs + 'pt');
        rep.classList.toggle('two', two);
        var body = sheet(rep), pages = 1;
        for (var i = 0; i < blocks.length; i++) {
            var tmp = document.createElement('div'); tmp.innerHTML = blocks[i];
            var el = tmp.firstChild; body.appendChild(el);
            if (over(body) && body.children.length > 1) {
                body.removeChild(el);
                if (limit && pages >= limit) return pages + 1;
                body = sheet(rep); pages++; body.appendChild(el);
            }
        }
        return pages;
    }
    function fitReport(x) {
        var rep = document.createElement('section');
        rep.className = 'rep';
        $('mess').appendChild(rep);
        var blocks = [headBlock(x) + '', legendBlock()], texts = 0;
        x.ev.forEach(function (e, i) {
            var ps = x.r.draw[i].ps;
            if (ps && (i === 0 || x.r.draw[i - 1].ps !== ps)) { var tb = textBlock(ps, ++texts); if (tb) blocks.push(tb); }
            blocks.push(itemBlock(x, i));
        });
        blocks[0] = '<div>' + blocks[0] + '</div>';   // Kopf als ein Block
        var sizes = [];
        for (var f = FS_MAX; f >= FS_MIN - 1e-9; f -= FS_STEP) sizes.push(Math.round(f * 100) / 100);
        function fits(fs, two, max) { return layout(rep, blocks, fs, two, max) <= max; }
        function search(two, max) {   // größte passende Schrift (Binärsuche über die absteigende Liste)
            var lo = 0, hi = sizes.length - 1, best = -1;
            while (lo <= hi) { var mid = (lo + hi) >> 1; if (fits(sizes[mid], two, max)) { best = mid; hi = mid - 1; } else lo = mid + 1; }
            return best;
        }
        var best = search(false, 2), two = false;
        if (best < 0 || sizes[best] < 8.5) {   // lieber Optionen zweispaltig als sehr kleine Schrift
            var b2 = search(true, 2);
            if (b2 >= 0 && (best < 0 || sizes[b2] > sizes[best] + 0.5)) { best = b2; two = true; }
        }
        if (KEY.passages && (best < 0 || sizes[best] < 8)) {   // mit Texten: lieber 4 lesbare Seiten
            var b4 = search(false, 4);
            if (b4 >= 0) { best = b4; two = false; }
        }
        var pages;
        if (best >= 0) pages = layout(rep, blocks, sizes[best], two, 0);
        else { pages = layout(rep, blocks, FS_MIN, true, 0); x.tooLong = true; }
        while (rep.querySelectorAll('.sheet').length < 2 || rep.querySelectorAll('.sheet').length % 2) {
            sheet(rep).innerHTML = '';
        }
        var all = rep.querySelectorAll('.sheet'), t = L();
        Array.prototype.forEach.call(all, function (s, i) {
            var f = s.querySelectorAll('.foot span');
            f[0].textContent = KEY.title + ' · ' + x.r.name;
            f[1].textContent = t.page + ' ' + (i + 1) + ' / ' + all.length;
        });
        x.pages = all.length;
        return rep;
    }
    function reports() {
        var druck = $('druck'); druck.innerHTML = '';
        var good = ROWS.filter(function (x) { return !x.err; });
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
            good.forEach(function (x) { var rep = fitReport(x); rep.dataset.i = ROWS.indexOf(x); druck.appendChild(rep); });
            var long = good.filter(function (x) { return x.tooLong; });
            if (long.length) $('summary').insertAdjacentHTML('beforeend', ' <span class="warn">· mehr als 2 Seiten: ' + long.map(function (x) { return esc(x.r.name); }).join(', ') + '</span>');
        });
    }
    function printOnly(i) {
        var reps = document.querySelectorAll('#druck .rep');
        Array.prototype.forEach.call(reps, function (r) { r.classList.toggle('this', +r.dataset.i === i); });
        document.body.classList.add('only');
        window.print();
    }
    window.addEventListener('afterprint', function () { document.body.classList.remove('only'); });

    /* ---------------------------------------------------------------- Bedienung */
    $('files').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    var drop = $('drop');
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) { e.preventDefault(); if (e.target !== drop && !drop.contains(e.target) && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    $('pdf-all').addEventListener('click', function () { document.body.classList.remove('only'); window.print(); });
    $('csv').addEventListener('click', csv);
    $('reset').addEventListener('click', function () {
        KEY = null; RESULTS = []; FILES = {}; ROWS = [];
        $('table').innerHTML = ''; $('druck').innerHTML = ''; $('status').textContent = ''; $('out').hidden = true;
    });
})();
