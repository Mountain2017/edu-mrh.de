/* W-Seminar "Time" – data-evaluate.html (viable data 3: evaluate).
   Uses window.VD from viable-data.js; the permutation demo reads data/experiment-main.csv. */
(function () {
    'use strict';
    var VD = window.VD, $ = VD.$, h = VD.h, fmt = VD.fmt, S = VD.stats, el = VD.svgEl;

    /* ------------------------------------------------------------ hero: Anscombe's quartet */
    (function anscombe() {
        var box = $('anscombe'); if (!box) return;
        var X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], X4 = [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8];
        var SETS = [
            [X, [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]],
            [X, [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
            [X, [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]],
            [X4, [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]]
        ];
        var sx = function (v) { return 14 + (v - 3) / 17 * 192; }, sy = function (v) { return 136 - (v - 2) / 12 * 120; };
        SETS.forEach(function (s, k) {
            var svg = el('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'Dataset ' + (k + 1) + ', r = ' + fmt(S.r(s[0], s[1])) }, box);
            var f = S.fit(s[0], s[1]);
            el('line', { x1: sx(3), y1: sy(f.intercept + 3 * f.slope), x2: sx(20), y2: sy(f.intercept + 20 * f.slope), stroke: '#d9ab2f', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
            s[0].forEach(function (x, i) { el('circle', { cx: sx(x), cy: sy(s[1][i]), r: 4.5, fill: '#7aa2ff', stroke: '#171a3f', 'stroke-width': 1.5 }, svg); });
            el('text', { x: 10, y: 16 }, svg).textContent = ['I', 'II', 'III', 'IV'][k] + '   r = ' + fmt(S.r(s[0], s[1]));
        });
    })();

    /* ------------------------------------------------------------ permutation test */
    (function perm() {
        var dots = $('perm-dots'); if (!dots) return;
        VD.csv('data/experiment-main.csv').then(function (rows) {
            var a = rows.filter(function (r) { return r.condition === 'fast'; }).map(function (r) { return +r.estimate; });
            var b = rows.filter(function (r) { return r.condition === 'slow'; }).map(function (r) { return +r.estimate; });
            var pool = a.concat(b), labels = pool.map(function (_, i) { return i < a.length ? 0 : 1; });
            var observed = S.mean(b) - S.mean(a), diffs = [], rand = S.rnd(42);
            var X = function (v) { return 40 + (v - 1) / 5 * 470; };
            function drawDots() {
                dots.innerHTML = '';
                [1, 2, 3, 4, 5, 6].forEach(function (v) { el('text', { x: X(v), y: 146, 'text-anchor': 'middle' }, dots).textContent = v + ' min'; });
                ['fast', 'slow'].forEach(function (name, g) {
                    var y = 50 + g * 66;
                    el('text', { x: 0, y: y + 4, class: 'lab2' }, dots).textContent = name;
                    var vals = pool.filter(function (_, i) { return labels[i] === g; });
                    var seen = {};
                    vals.forEach(function (v) {
                        var k = v.toFixed(2); seen[k] = (seen[k] || 0) + 1;
                        el('circle', { cx: X(v), cy: y + 8 - seen[k] * 6, r: 3.5, fill: VD.SERIES[g * 2], 'fill-opacity': .8, stroke: '#fff', 'stroke-width': 1 }, dots);
                    });
                    var m = S.mean(vals);
                    el('line', { x1: X(m), x2: X(m), y1: y - 40, y2: y + 14, stroke: '#1c1e33', 'stroke-width': 2 }, dots);
                });
            }
            function shuffle() {
                for (var i = labels.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = labels[i]; labels[i] = labels[j]; labels[j] = t; }
                var ma = [], mb = [];
                pool.forEach(function (v, i) { (labels[i] ? mb : ma).push(v); });
                diffs.push(S.mean(mb) - S.mean(ma));
            }
            function drawHist() {
                var svg = $('perm-hist'); svg.innerHTML = '';
                var lo = -.8, hi = .8, k = 32, w = (hi - lo) / k, counts = new Array(k).fill(0);
                diffs.forEach(function (d) { var i = Math.floor((d - lo) / w); if (i >= 0 && i < k) counts[i]++; });
                var max = Math.max(1, Math.max.apply(null, counts));
                var X2 = function (v) { return 20 + (v - lo) / (hi - lo) * 480; };
                counts.forEach(function (c, i) {
                    if (!c) return;
                    var hgt = c / max * 110, mid = lo + (i + .5) * w, far = Math.abs(mid) >= Math.abs(observed);
                    el('rect', { x: X2(lo + i * w) + 1, y: 130 - hgt, width: 480 / k - 2, height: hgt, rx: 2, fill: far ? '#b91c1c' : '#4b5563', 'fill-opacity': far ? .9 : .45, 'data-tip': fmt(lo + i * w) + ' to ' + fmt(lo + (i + 1) * w) + ' min: ' + c }, svg);
                });
                el('line', { x1: 20, x2: 500, y1: 130, y2: 130, stroke: '#b9bdd0' }, svg);
                [-.8, -.4, 0, .4, .8].forEach(function (v) { el('text', { x: X2(v), y: 146, 'text-anchor': 'middle' }, svg).textContent = (v > 0 ? '+' : '') + v.toFixed(1); });
                [observed, -observed].forEach(function (o, i) {
                    el('line', { x1: X2(o), x2: X2(o), y1: 10, y2: 132, stroke: '#0f8f84', 'stroke-width': 2, 'stroke-dasharray': i ? '4 4' : null }, svg);
                });
                el('text', { x: X2(observed) + 4, y: 20, class: 'lab2' }, svg).textContent = 'real difference ' + fmt(observed);
                el('text', { x: 260, y: 166, 'text-anchor': 'middle' }, svg).textContent = 'difference slow − fast after shuffling (minutes)';
                var extreme = diffs.filter(function (d) { return Math.abs(d) >= Math.abs(observed) - 1e-9; }).length;
                $('perm-text').innerHTML = diffs.length
                    ? diffs.length + ' shuffles. ' + extreme + ' of them (' + (100 * extreme / diffs.length).toFixed(1) + ' %) produced a difference at least as large as the real one (red). <b>p ≈ ' + (extreme / diffs.length).toFixed(3) + '</b>.' + (diffs.length >= 1000 ? (extreme / diffs.length < .05 ? ' Chance alone rarely does this.' : ' Chance does this quite often.') : '')
                    : 'Real difference: slow − fast = ' + fmt(observed) + ' minutes. Shuffle the labels and watch what chance can do.';
            }
            function go(n) { for (var i = 0; i < n; i++) shuffle(); drawDots(); drawHist(); }
            $('perm-1').addEventListener('click', function () { go(1); });
            $('perm-100').addEventListener('click', function () { go(100); });
            $('perm-1000').addEventListener('click', function () { go(1000); });
            $('perm-reset').addEventListener('click', function () { diffs = []; labels = pool.map(function (_, i) { return i < a.length ? 0 : 1; }); drawDots(); drawHist(); });
            drawDots(); drawHist();
        }).catch(function () { $('perm-text').textContent = 'The data could not be loaded – open the page via the web server, or use the Python cell below.'; });
    })();

    /* ------------------------------------------------------------ guess r */
    (function guess() {
        var svg = $('guess-svg'); if (!svg) return;
        var slider = $('guess-r'), data = null, round = 0, total = 0, done = 0;
        function make() {
            var rand = S.rnd(1000 + round * 31 + Math.floor(Math.random() * 1e6)), target = Math.round((rand() * 1.9 - .95) * 20) / 20, n = 40 + Math.floor(rand() * 60);
            var x = [], y = [];
            for (var i = 0; i < n; i++) { var a = S.gauss(rand), e = S.gauss(rand); x.push(a); y.push(target * a + Math.sqrt(1 - target * target) * e); }
            data = { x: x, y: y, r: S.r(x, y), checked: false };
            svg.innerHTML = '';
            var sx = function (v) { return 150 + v * 40; }, sy = function (v) { return 110 - v * 32; };
            el('rect', { x: 10, y: 6, width: 280, height: 208, fill: '#fff', stroke: '#e8eaf2', rx: 8 }, svg);
            x.forEach(function (v, i) { el('circle', { cx: Math.max(14, Math.min(286, sx(v))), cy: Math.max(10, Math.min(210, sy(y[i]))), r: 3.5, fill: '#2563eb', 'fill-opacity': .7, stroke: '#fff', 'stroke-width': 1 }, svg); });
            $('guess-text').textContent = 'Move the slider to your guess, then check.' + (done ? ' Average miss so far: ' + (total / done).toFixed(2) + '.' : '');
            round++;
        }
        slider.addEventListener('input', function () { $('guess-out').textContent = (+slider.value).toFixed(2); });
        $('guess-go').addEventListener('click', function () {
            if (!data || data.checked) return;
            data.checked = true;
            var miss = Math.abs(+slider.value - data.r); total += miss; done++;
            $('guess-text').innerHTML = 'Real r = <b>' + fmt(data.r) + '</b> (n = ' + data.x.length + '), your guess ' + (+slider.value).toFixed(2) + '. ' +
                (miss < .1 ? 'Excellent.' : miss < .2 ? 'Close.' : 'Most people overestimate weak correlations and underestimate strong ones.') + ' Average miss after ' + done + ' plot' + (done > 1 ? 's' : '') + ': ' + (total / done).toFixed(2) + '.';
        });
        $('guess-new').addEventListener('click', make);
        make();
    })();

    /* ------------------------------------------------------------ explorer: why r ≈ 0 */
    (function explore() {
        var tabs = $('ex-tabs'); if (!tabs) return;
        function gen(seed, n, f) { var rand = S.rnd(seed), x = [], y = []; for (var i = 0; i < n; i++) { var p = f(rand); x.push(+p[0].toFixed(2)); y.push(+p[1].toFixed(2)); } return { x: x, y: y }; }
        var G = S.gauss;
        var SC = [
            { label: 'Real link', xl: 'hours of sleep', yl: 'concentration score', d: function () { return gen(3, 120, function (r) { var a = 7 + G(r) * .8; return [a, 50 + (a - 7) * 6 + G(r) * 5]; }); },
              t: 'For comparison: a clear link with 120 people. Now look at what can hide it.' },
            { label: 'Too few people', xl: 'hours of sleep', yl: 'concentration score', d: function () { return gen(8, 8, function (r) { var a = 7 + G(r) * .8; return [a, 50 + (a - 7) * 2.5 + G(r) * 6]; }); },
              t: 'The same kind of link, a bit weaker – with only 8 people. r jumps around from sample to sample; with 8 people almost anything can come out. Collect more data or report the result as inconclusive.' },
            { label: 'Restricted range', xl: 'hours of sleep (only 6.8–7.2 h)', yl: 'concentration score', d: function () { var g = gen(3, 400, function (r) { var a = 7 + G(r) * .8; return [a, 50 + (a - 7) * 6 + G(r) * 5]; }), x = [], y = []; g.x.forEach(function (v, i) { if (v >= 6.8 && v <= 7.2 && x.length < 60) { x.push(v); y.push(g.y[i]); } }); return { x: x, y: y }; },
              t: 'The same population as “real link” – but you only asked people who sleep 6.8 to 7.2 hours. Without variation in x, nothing can vary with it. Make sure your sample covers the whole range.' },
            { label: 'U-shape', xl: 'arousal (calm → excited)', yl: 'performance', d: function () { return gen(12, 100, function (r) { var a = r() * 10; return [a, 80 - Math.pow(a - 5, 2) * 2.4 + G(r) * 6]; }); },
              t: 'A strong link – but not a straight line: medium arousal is best (Yerkes–Dodson). r only measures straight-line links. Always plot; compare the low, middle and high groups.' },
            { label: 'Groups cancel out', xl: 'minutes of music while waiting', yl: 'estimated wait (min)', d: function () { return gen(8, 100, function (r) { var a = r() * 10, g = r() < .5; return [a, g ? 2.4 + a * .14 + G(r) * .35 : 4.6 - a * .14 + G(r) * .35]; }); },
              t: 'Two subgroups with opposite trends – say, people who like the music and people who don’t. Together: r ≈ 0. Split by plausible subgroups (and plan them in advance).' },
            { label: 'Noisy measure', xl: 'time pressure, one unreliable item', yl: 'hours of sleep', d: function () { return gen(5, 120, function (r) { var t = G(r); return [3 + t * .4 + G(r) * 2.2, 7.5 - t * .4 + G(r) * .3]; }); },
              t: 'The real link is strong, but the measure of x is mostly noise (one vague item). Unreliable measures make every correlation weaker. Use a scale with good α.' },
            { label: 'Outlier', xl: 'hours of sleep', yl: 'estimated wait (min)', d: function () { var g = gen(12, 30, function (r) { var a = 7 + G(r) * .7; return [a, 3 + (a - 7) * .5 + G(r) * .3]; }); g.x.push(4); g.y.push(6.5); g.x.push(4.2); g.y.push(6.1); return g; },
              t: 'Two extreme cases (someone who slept 4 hours and estimated 6 minutes) pull r far away from the pattern of everyone else. Check outliers: typo? different situation? Report r with and without them – and Spearman ρ.' }
        ];
        var btns = SC.map(function (s, k) {
            var b = h('button', 'pill', s.label, tabs); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { show(k); });
            return b;
        });
        function show(k) {
            btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
            var s = SC[k], d = s.d(), box = $('ex-chart');
            box.innerHTML = '';
            VD.chart(box, 'scatter', { x: d.x, y: d.y, line: true, title: s.label, xlabel: s.xl, ylabel: s.yl });
            $('ex-text').textContent = s.t;
        }
        show(0);
    })();
})();
