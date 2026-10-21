/* W-Seminar "Time" – data-refine.html (viable data 2: refine).
   Uses window.VD from viable-data.js; reads the pilot CSVs in data/.
   The refinement log stays in this browser (localStorage 'wsRefineLog'). */
(function () {
    'use strict';
    var VD = window.VD, $ = VD.$, h = VD.h, esc = VD.esc, fmt = VD.fmt, S = VD.stats;

    function failed(box) { return function () { if (box) box.innerHTML = '<p class="small">The pilot data could not be loaded. Open the page via the web server (not as a file) – or use the Python cells below.</p>'; }; }

    /* ------------------------------------------------------------ α lab */
    (function alphaLab() {
        var box = $('alpha-lab'); if (!box) return;
        var TEXT = {
            tp1: 'I often feel I don’t have enough time for my schoolwork.', tp2: 'My days feel rushed.',
            tp3: 'I usually have time to relax in the evening.', tp4: 'I feel stressed and tired in the morning.',
            tp5: 'Deadlines often catch me by surprise.', tp6: 'I sometimes have more to do than I can manage.'
        };
        var ITEMS = Object.keys(TEXT), use = {}, rev = {};
        ITEMS.forEach(function (k) { use[k] = true; rev[k] = false; });
        VD.csv('data/survey-pilot.csv').then(function (rows) {
            var raw = {};
            ITEMS.forEach(function (k) { raw[k] = rows.map(function (r) { return +r[k]; }); });
            var ui = {};
            ITEMS.forEach(function (k) {
                var row = h('div', 'arow', null, box);
                var l1 = h('label', null, null, row), c1 = h('input', null, null, l1); c1.type = 'checkbox'; c1.checked = true; l1.appendChild(document.createTextNode('use'));
                var l2 = h('label', null, null, row), c2 = h('input', null, null, l2); c2.type = 'checkbox'; l2.appendChild(document.createTextNode('reverse'));
                h('div', 'it', '<b>' + k + '</b>' + esc(TEXT[k]), row);
                var right = h('div', null, null, row), bar = h('div', 'bar', null, right), fill = h('i', null, null, bar), rv = h('div', 'rv', '', right);
                c1.setAttribute('aria-label', 'use ' + k); c2.setAttribute('aria-label', 'reverse ' + k);
                c1.addEventListener('change', function () { use[k] = c1.checked; update(); });
                c2.addEventListener('change', function () { rev[k] = c2.checked; update(); });
                ui[k] = { row: row, fill: fill, rv: rv };
            });
            function col(k) { return rev[k] ? raw[k].map(function (v) { return 6 - v; }) : raw[k]; }
            function update() {
                var on = ITEMS.filter(function (k) { return use[k]; });
                var a = S.alpha(on.map(col));
                var out = $('alpha-out'), verdict = $('alpha-verdict');
                out.textContent = on.length < 2 ? 'α = –' : 'α = ' + fmt(a) + ' with ' + on.length + ' items';
                var v = on.length < 2 ? ['', 'Use at least two items.'] : a >= .8 ? ['var(--ok)', 'good'] : a >= .7 ? ['var(--ok)', 'acceptable'] : a >= .6 ? ['var(--warn)', 'questionable – look at the items'] : ['var(--bad)', 'poor – the items don’t measure one thing'];
                verdict.textContent = v[1]; verdict.style.color = v[0];
                if (on.length >= 4 && a >= .8) verdict.textContent += ' – target reached. Which items did you change, and how would you explain why in your method chapter?';
                ITEMS.forEach(function (k) {
                    var others = on.filter(function (o) { return o !== k; });
                    var u = ui[k];
                    u.row.classList.toggle('off', !use[k]);
                    if (!others.length) { u.rv.textContent = ''; u.fill.style.width = 0; return; }
                    var rest = raw[k].map(function (_, i) { return others.reduce(function (s, o) { return s + col(o)[i]; }, 0); });
                    var r = S.r(col(k), rest);
                    u.fill.style.left = (r >= 0 ? 50 : 50 + r * 50) + '%';
                    u.fill.style.width = Math.abs(r) * 50 + '%';
                    u.fill.style.background = r >= .3 ? 'var(--ok)' : r >= 0 ? 'var(--warn)' : 'var(--bad)';
                    u.rv.textContent = 'item–rest r ' + fmt(r);
                    u.fill.parentNode.setAttribute('data-tip', k + ': correlation with the other ' + others.length + ' items = ' + fmt(r));
                });
            }
            update();
        }).catch(failed(box));
    })();

    /* ------------------------------------------------------------ item map */
    (function itemMap() {
        var svg = $('imap'); if (!svg) return;
        var TEXT = [
            'I ___ (finish) my homework. Can I go out now?', 'We ___ (visit) London last summer.', '___ you ever ___ (be) to Scotland?',
            'Yesterday I ___ (see) a great film.', 'He ___ (not / call) me yet.', 'When ___ you ___ (start) learning English?',
            'I ___ (live) here since 2019. – key: “have lived”', 'She ___ (just / leave) – you missed her.', 'By the time we arrived, the film ___ (already / start).',
            'They ___ (move) to Berlin in 2015.', 'How long ___ you ___ (know) Sam?', 'This is the best book I ___ ever ___ (read).'
        ];
        var X = function (p) { return 46 + p * 360; }, Y = function (d) { return 150 - d / .8 * 125; };
        VD.csv('data/test-pilot.csv').then(function (rows) {
            var items = TEXT.map(function (_, i) { return rows.map(function (r) { return +r['q' + (i + 1)]; }); });
            VD.svgEl('rect', { x: X(.2), y: Y(.8), width: X(.8) - X(.2), height: Y(.3) - Y(.8), fill: '#ecfdf5', rx: 6 }, svg);
            VD.svgEl('text', { x: X(.5), y: Y(.8) + 14, 'text-anchor': 'middle', style: 'fill:#059669;font-weight:600' }, svg).textContent = 'good items';
            [0, .2, .4, .6, .8, 1].forEach(function (p) { VD.svgEl('text', { x: X(p), y: 292, 'text-anchor': 'middle' }, svg).textContent = p.toFixed(1); });
            [-.8, -.4, 0, .4, .8].forEach(function (d) {
                VD.svgEl('line', { x1: X(0), x2: X(1), y1: Y(d), y2: Y(d), stroke: d === 0 ? '#b9bdd0' : '#eef0f7' }, svg);
                VD.svgEl('text', { x: X(0) - 6, y: Y(d) + 4, 'text-anchor': 'end' }, svg).textContent = d.toFixed(1);
            });
            VD.svgEl('text', { x: X(1), y: 278, 'text-anchor': 'end' }, svg).textContent = 'difficulty p (share right) →';
            VD.svgEl('text', { x: 4, y: 12 }, svg).textContent = '↑ discrimination';
            var btns = [];
            items.forEach(function (v, i) {
                var p = S.mean(v), rest = rows.map(function (_, j) { return items.reduce(function (s, it, k) { return k === i ? s : s + it[j]; }, 0); });
                var d = p > 0 && p < 1 ? S.r(v, rest) : NaN;
                var good = p >= .2 && p <= .8 && d >= .3;
                var verdict = p > .9 ? 'Too easy: almost everyone solves it, so it separates nobody.'
                    : p < .1 ? 'Too hard: nobody solved it – no variance, no discrimination. And it needs the past perfect, which is not part of the blueprint.'
                    : d < 0 ? 'Negative discrimination: the strongest students got it “wrong”. Look at the key – “have been living” is correct, too.'
                    : d < .3 ? 'Weak discrimination: borderline. Check the wording.' : 'Works: medium difficulty, good discrimination.';
                var g = VD.svgEl('g', { class: 'pt', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': 'q' + (i + 1) }, svg);
                var y = isNaN(d) ? Y(0) : Y(d);
                VD.svgEl('circle', { cx: X(p), cy: y, r: 11, fill: good ? '#0f8f84' : '#c26a06', stroke: '#fff', 'stroke-width': 2 }, g);
                VD.svgEl('text', { x: X(p), y: y }, g).textContent = i + 1;
                function pick() {
                    btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
                    g.setAttribute('aria-pressed', 'true');
                    $('item-info').innerHTML = '<b>q' + (i + 1) + '</b> <i style="font-family:var(--serif)">' + esc(TEXT[i]) + '</i><br>p = ' + fmt(p) + ', discrimination = ' + (isNaN(d) ? 'not defined' : fmt(d)) + '<br>' + verdict;
                }
                g.addEventListener('click', pick);
                g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
                btns.push(g);
            });
        }).catch(failed($('item-info')));
    })();

    /* ------------------------------------------------------------ coding: confusion matrix */
    (function confusion() {
        var box = $('cm'); if (!box) return;
        var CATS = ['will', 'going_to', 'gonna', 'prog', 'none'];
        Promise.all([VD.csv('data/coding-round1.csv'), VD.csv('data/coding-round2.csv')]).then(function (rounds) {
            function show(k) {
                var rows = rounds[k], n = rows.length, m = {};
                CATS.forEach(function (a) { m[a] = {}; CATS.forEach(function (b) { m[a][b] = 0; }); });
                rows.forEach(function (r) { m[r.coder_a][r.coder_b]++; });
                var agree = rows.filter(function (r) { return r.coder_a === r.coder_b; }).length / n;
                var chance = CATS.reduce(function (s, c) {
                    return s + rows.filter(function (r) { return r.coder_a === c; }).length / n * rows.filter(function (r) { return r.coder_b === c; }).length / n;
                }, 0);
                var kappa = (agree - chance) / (1 - chance);
                var html = '<table class="dt cm"><thead><tr><th>A ↓ · B →</th>' + CATS.map(function (c) { return '<th class="num">' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
                CATS.forEach(function (a) {
                    html += '<tr><th>' + a + '</th>' + CATS.map(function (b) {
                        var v = m[a][b], cls = a === b ? 'num diag' : v ? 'num off-hot' : 'num';
                        return '<td class="' + cls + '">' + (v || '') + '</td>';
                    }).join('') + '</tr>';
                });
                box.innerHTML = html + '</tbody></table>';
                $('cm-text').innerHTML = 'Agreement ' + Math.round(agree * 100) + ' %, by chance ' + Math.round(chance * 100) + ' %, <b>κ = ' + fmt(kappa) + '</b>. ' +
                    (k === 0 ? 'Red cells: disagreements. Most involve <code>going_to</code>, <code>prog</code> and <code>none</code>.' : 'With the new decision rule, only two disagreements are left.');
            }
            var tabs = $('cm-tabs'), btns = ['Round 1', 'Round 2 (new rule)'].map(function (label, k) {
                var b = h('button', 'pill', label, tabs); b.type = 'button';
                b.addEventListener('click', function () { btns.forEach(function (x, j) { x.setAttribute('aria-pressed', j === k ? 'true' : 'false'); }); show(k); });
                return b;
            });
            btns[0].click();
        }).catch(failed(box));
    })();

    /* ------------------------------------------------------------ fix quiz */
    var FIX = ['reword the item', 'drop the item', 'clarify instruction / codebook', 'change the procedure'].map(function (l) { return { label: l, c: '#c26a06' }; });
    if ($('fix-quiz')) VD.quiz($('fix-quiz'), [
        { t: 'Almost everyone ticks 5 for “I sometimes have more to do than I can manage”.', a: 0, fb: 'Ceiling effect. A stronger wording (“most days”) spreads the answers. Dropping is possible, but you would lose part of the construct.' },
        { t: '“I feel stressed and tired in the morning” hardly correlates with the other items. A pilot comment: “that’s two questions”.', a: [0, 1], fb: 'Split it into two items (and keep the one that fits) – or drop it. Both are fine if you explain why.' },
        { t: 'Two pilot participants wrote 210 and 165 as their estimate of a 3-minute wait.', a: 2, fb: 'The unit was unclear. Rewrite the instruction with an example (“2 min 40 s”). Converting the pilot values is fine – but prevent it in the main study.' },
        { t: 'Participants rate the fast and the slow music as almost equally fast.', a: 3, fb: 'The manipulation is too weak. Choose music with a much bigger tempo difference and pilot the ratings again.' },
        { t: 'Coders keep disagreeing whether “I’m leaving” talks about the future.', a: 2, fb: 'Add a decision rule with examples to the codebook (future time marker → prog, otherwise none), then run a second agreement round.' },
        { t: 'Nobody solves the item that needs the past perfect – which your test isn’t about.', a: 1, fb: 'It measures something outside the blueprint (validity). Drop it or replace it with an item from the blueprint.' },
        { t: 'A survey planned for 10 minutes takes most pilot students 25 minutes.', a: [1, 3], fb: 'Cut the items that add least (α barely drops without them) – long surveys produce careless answers at the end. Shortening the procedure is also a good answer.' }
    ], FIX, $('fix-score'));

    /* ------------------------------------------------------------ refinement log */
    (function log() {
        var box = $('log-rows'); if (!box) return;
        var KEY = 'wsRefineLog';
        var rows = VD.store(KEY) || [{ saw: '', changed: '', why: '' }];
        var COLS = [['saw', 'What I saw in the pilot', 'tp6: all 24 ticked 4 or 5'], ['changed', 'What I changed', '“sometimes” → “most days”'], ['why', 'Why', 'ceiling effect: no variance, no information']];
        function save() { VD.store(KEY, rows); $('log-saved').textContent = 'Saved in this browser.'; }
        function render() {
            box.innerHTML = '';
            var head = h('div', 'logrow field', null, box);
            COLS.forEach(function (c) { h('label', null, esc(c[1]), head); });
            h('span', null, '', head);
            rows.forEach(function (r, i) {
                var line = h('div', 'logrow field', null, box);
                COLS.forEach(function (c) {
                    var ta = h('textarea', null, null, line); ta.rows = 2; ta.value = r[c[0]] || ''; ta.placeholder = i === 0 ? c[2] : '';
                    ta.setAttribute('aria-label', c[1] + ', row ' + (i + 1));
                    ta.addEventListener('input', function () { r[c[0]] = ta.value; save(); });
                });
                var del = h('button', 'pill', '✕', line); del.type = 'button'; del.setAttribute('aria-label', 'Delete row ' + (i + 1));
                del.addEventListener('click', function () { rows.splice(i, 1); if (!rows.length) rows.push({ saw: '', changed: '', why: '' }); save(); render(); });
            });
        }
        render();
        $('log-add').addEventListener('click', function () { rows.push({ saw: '', changed: '', why: '' }); save(); render(); box.querySelector('.logrow:last-child textarea').focus(); });
        $('log-download').addEventListener('click', function () {
            var out = ['REFINEMENT LOG – W-Seminar "Time"', 'saved ' + new Date().toLocaleDateString('en-GB'), ''];
            rows.forEach(function (r, i) { out.push((i + 1) + '. Saw: ' + (r.saw || '') + '\n   Changed: ' + (r.changed || '') + '\n   Why: ' + (r.why || '')); out.push(''); });
            var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'refinement-log.txt';
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
        $('log-clear').addEventListener('click', function () {
            if (!confirm('Delete your refinement log in this browser?')) return;
            rows = [{ saw: '', changed: '', why: '' }]; VD.store(KEY, null); render(); $('log-saved').textContent = 'Deleted.';
        });
    })();
})();
