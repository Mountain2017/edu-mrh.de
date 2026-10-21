/* W-Seminar "Time" – shared code of the viable-data sequence
   (data-design.html, data-refine.html, data-evaluate.html). Plain JS, no libraries.
   Everything stays in this browser (localStorage); Python runs locally (py-worker.js).

   Markup
   - Data-type tracks:  <div class="trackbar"></div> renders the type pills;
     <div class="track" data-track="survey"> … </div> shows only for the chosen type;
     <button class="tcard" data-pick="survey"> picks a type; elements with
     data-fits="survey test" get the class "mine" when the chosen type is listed.
   - Python cell:       <div class="py" data-py="unique-id" data-title="…" data-files="data/a.csv data/b.csv">
                            <script type="text/plain"> code </script></div>
     The code is editable; edits are kept per id in localStorage ('wsPy:<id>').
   - Own CSV:           <div class="py-upload"></div> → file appears in Python as my-data.csv.
   - The page script uses window.VD (quiz, spot, chart, csv, stats helpers). */
(function () {
    'use strict';

    var SCRIPT = document.currentScript;
    var PY_BASE = (SCRIPT && SCRIPT.dataset.pyodide) || 'https://edu-mrh.de/embed/pyodide/';
    document.documentElement.classList.add('js');

    var $ = function (id) { return document.getElementById(id); };
    var NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function h(tag, cls, html, parent) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined && html !== null) e.innerHTML = html;
        if (parent) parent.appendChild(e);
        return e;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function store(key, val) {
        try {
            if (val === undefined) { var raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
            if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
        } catch (e) { /* storage blocked: work in memory */ }
        return null;
    }
    function fmt(x, d) {
        if (x === null || x === undefined || isNaN(x)) return '–';
        var s = Number(x).toFixed(d === undefined ? 2 : d);
        return s === '-0.00' ? '0.00' : s;
    }
    var SERIES = ['#2563eb', '#c26a06', '#0f8f84', '#7c3aed', '#b83280'];

    /* ------------------------------------------------------------ stats + csv */
    var S = {
        mean: function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; },
        variance: function (v) { var m = S.mean(v); return v.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / (v.length - 1); },
        sd: function (v) { return Math.sqrt(S.variance(v)); },
        r: function (x, y) {
            var mx = S.mean(x), my = S.mean(y), sxy = 0, sxx = 0, syy = 0;
            for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
            return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : NaN;
        },
        fit: function (x, y) {
            var mx = S.mean(x), my = S.mean(y), sxy = 0, sxx = 0;
            for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); }
            var b = sxx ? sxy / sxx : 0; return { slope: b, intercept: my - b * mx };
        },
        quantile: function (v, q) {
            var s = v.slice().sort(function (a, b) { return a - b; }), pos = (s.length - 1) * q, lo = Math.floor(pos);
            return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
        },
        alpha: function (items) {
            var k = items.length; if (k < 2) return NaN;
            var tot = items[0].map(function (_, i) { return items.reduce(function (a, it) { return a + it[i]; }, 0); });
            var sv = items.reduce(function (a, it) { return a + S.variance(it); }, 0);
            return k / (k - 1) * (1 - sv / S.variance(tot));
        },
        rnd: function (seed) {   // small seeded generator, so demos are the same for everyone
            var s = seed >>> 0 || 1;
            return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
        },
        gauss: function (rand) { var u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    };
    function parseCSV(text) {
        var rows = [], row = [], cell = '', q = false;
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (q) {
                if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (c === '"') q = false; else cell += c;
            } else if (c === '"') q = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
            else cell += c;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        var head = rows.shift() || [];
        return rows.filter(function (r) { return r.length > 1 || r[0] !== ''; }).map(function (r) {
            var o = {}; head.forEach(function (k, j) { o[k] = r[j] === undefined ? '' : r[j]; }); return o;
        });
    }
    var csvCache = {};
    function loadCSV(url) {
        if (!csvCache[url]) csvCache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.text(); }).then(parseCSV);
        return csvCache[url];
    }

    /* ------------------------------------------------------------ tooltip */
    var tip = h('div', 'ttip', null, document.body);
    tip.setAttribute('role', 'status');
    function showTip(e, text) {
        tip.textContent = text; tip.style.display = 'block';
        var x = e.clientX + 14, y = e.clientY + 14, w = tip.offsetWidth, hh = tip.offsetHeight;
        if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
        if (y + hh > window.innerHeight - 8) y = e.clientY - hh - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }
    document.addEventListener('pointermove', function (e) {
        var t = e.target && e.target.closest && e.target.closest('[data-tip]');
        if (t) showTip(e, t.getAttribute('data-tip')); else tip.style.display = 'none';
    });
    document.addEventListener('scroll', function () { tip.style.display = 'none'; }, { passive: true });

    /* ------------------------------------------------------------ charts */
    function nice(lo, hi, n) {
        if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
        if (lo === hi) { lo -= 1; hi += 1; }
        var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / (n || 5))));
        var err = span / (n || 5) / step;
        if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
        var a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, ticks = [];
        for (var v = a; v <= b + step / 2; v += step) ticks.push(Math.round(v / step) * step);
        return { lo: a, hi: b, ticks: ticks, step: step };
    }
    function tickLabel(v, step) {
        var d = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
        return Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + 'K' : v.toFixed(d);
    }
    function frame(box, spec, opt) {
        var W = 600, H = opt.h || 300, m = { l: 54, r: 18, t: spec.title ? 34 : 14, b: spec.xlabel ? 50 : 34 };
        var wrap = h('figure', 'chart', null, box);
        wrap.style.margin = '.75rem 0 0';
        var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': spec.title || opt.kind + ' chart' }, wrap);
        if (spec.title) svgEl('text', { x: 0, y: 16, class: 'ttl' }, svg).textContent = spec.title;
        var f = { svg: svg, wrap: wrap, W: W, H: H, m: m, x0: m.l, x1: W - m.r, y0: H - m.b, y1: m.t };
        if (spec.xlabel) svgEl('text', { x: (f.x0 + f.x1) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axl' }, svg).textContent = spec.xlabel;
        if (spec.ylabel) svgEl('text', { x: 0, y: m.t - 8 + (spec.title ? 0 : 6), class: 'axl', transform: spec.title ? null : null }, svg).textContent = spec.ylabel;
        return f;
    }
    function yAxis(f, lo, hi) {
        var n = nice(lo, hi, 5);
        var sy = function (v) { return f.y0 - (v - n.lo) / (n.hi - n.lo) * (f.y0 - f.y1); };
        n.ticks.forEach(function (t) {
            svgEl('line', { x1: f.x0, x2: f.x1, y1: sy(t), y2: sy(t), class: 'grid' }, f.svg);
            svgEl('text', { x: f.x0 - 8, y: sy(t) + 4, 'text-anchor': 'end', class: 'ax' }, f.svg).textContent = tickLabel(t, n.step);
        });
        return sy;
    }
    function xAxisNum(f, lo, hi) {
        var n = nice(lo, hi, 6);
        var sx = function (v) { return f.x0 + (v - n.lo) / (n.hi - n.lo) * (f.x1 - f.x0); };
        n.ticks.forEach(function (t) {
            svgEl('text', { x: sx(t), y: f.y0 + 18, 'text-anchor': 'middle', class: 'ax' }, f.svg).textContent = tickLabel(t, n.step);
        });
        svgEl('line', { x1: f.x0, x2: f.x1, y1: f.y0, y2: f.y0, class: 'base' }, f.svg);
        return sx;
    }
    function bar(svg, x, w, yBase, yTop, color, tipText) {   // 4px rounded data end, square at the baseline
        var up = yTop <= yBase, hgt = Math.abs(yBase - yTop), r = Math.min(4, hgt, w / 2);
        var d = up
            ? 'M' + x + ',' + yBase + 'V' + (yTop + r) + 'Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yTop + ' ' + (x + w) + ',' + (yTop + r) + 'V' + yBase + 'Z'
            : 'M' + x + ',' + yBase + 'V' + (yTop - r) + 'Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yTop + ' ' + (x + w) + ',' + (yTop - r) + 'V' + yBase + 'Z';
        return svgEl('path', { d: d, fill: color, 'data-tip': tipText }, svg);
    }
    function legend(f, names) {
        if (names.length < 2) return;
        var lg = h('div', 'legend', null, f.wrap);
        names.forEach(function (n, i) { var s = h('span', null, null, lg); s.textContent = n; s.style.setProperty('--k', SERIES[i % SERIES.length]); });
    }
    function numbersOnly(v) { return v.filter(function (x) { return typeof x === 'number' && isFinite(x); }); }

    var CHARTS = {
        bars: function (box, s) {
            var vals = s.values.map(Number), f = frame(box, s, { kind: 'bar' });
            var lo = Math.min(0, Math.min.apply(null, vals)), hi = Math.max(0, Math.max.apply(null, vals));
            var sy = yAxis(f, lo, hi), n = vals.length, band = (f.x1 - f.x0) / n, w = Math.min(24, band * .6);
            var many = n > 14;
            vals.forEach(function (v, i) {
                var x = f.x0 + band * i + (band - w) / 2;
                bar(f.svg, x, w, sy(0), sy(v), SERIES[0], s.labels[i] + ': ' + fmt(v, Math.abs(v) < 10 ? 2 : 0));
                if (!many) svgEl('text', { x: x + w / 2, y: (v >= 0 ? sy(v) - 5 : sy(v) + 13), 'text-anchor': 'middle', class: 'lab' }, f.svg).textContent = +fmt(v, 2);
                if (!many || i % Math.ceil(n / 14) === 0) svgEl('text', { x: x + w / 2, y: f.y0 + 18, 'text-anchor': 'middle', class: 'ax' }, f.svg).textContent = s.labels[i];
            });
            svgEl('line', { x1: f.x0, x2: f.x1, y1: sy(0), y2: sy(0), class: 'base' }, f.svg);
        },
        hist: function (box, s) {
            var v = numbersOnly(s.values), f = frame(box, s, { kind: 'histogram' });
            if (!v.length) return;
            var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), k = Math.max(1, Math.min(40, s.bins || 10));
            if (lo === hi) { lo -= .5; hi += .5; }
            var wdt = (hi - lo) / k, counts = new Array(k).fill(0);
            v.forEach(function (x) { counts[Math.min(k - 1, Math.floor((x - lo) / wdt))]++; });
            var sy = yAxis(f, 0, Math.max.apply(null, counts)), sx = xAxisNum(f, lo, hi);
            counts.forEach(function (c, i) {
                var a = sx(lo + i * wdt) + 1, b = sx(lo + (i + 1) * wdt) - 1;
                if (c) bar(f.svg, a, Math.max(1, b - a), sy(0), sy(c), SERIES[0], fmt(lo + i * wdt) + ' to ' + fmt(lo + (i + 1) * wdt) + ': ' + c);
            });
        },
        scatter: function (box, s) {
            var pts = [];
            for (var i = 0; i < Math.min(s.x.length, s.y.length); i++) if (typeof s.x[i] === 'number' && typeof s.y[i] === 'number') pts.push([s.x[i], s.y[i]]);
            var f = frame(box, s, { kind: 'scatter', h: 330 });
            if (!pts.length) return;
            var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
            var sy = yAxis(f, Math.min.apply(null, ys), Math.max.apply(null, ys)), sx = xAxisNum(f, Math.min.apply(null, xs), Math.max.apply(null, xs));
            var g = svgEl('g', {}, f.svg);
            pts.forEach(function (p) {
                svgEl('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 4, fill: SERIES[0], 'fill-opacity': .75, stroke: '#fff', 'stroke-width': 1.5 }, g);
                svgEl('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 9, fill: 'transparent', 'data-tip': '(' + p[0] + ', ' + p[1] + ')' }, g);
            });
            if (s.line && pts.length > 2) {
                var ft = S.fit(xs, ys), a = Math.min.apply(null, xs), b = Math.max.apply(null, xs);
                svgEl('line', { x1: sx(a), y1: sy(ft.intercept + ft.slope * a), x2: sx(b), y2: sy(ft.intercept + ft.slope * b), stroke: SERIES[1], 'stroke-width': 2, 'stroke-linecap': 'round' }, f.svg);
                svgEl('text', { x: f.x1, y: f.y1 + 2, 'text-anchor': 'end', class: 'lab' }, f.svg).textContent = 'r = ' + fmt(S.r(xs, ys)) + ' · n = ' + pts.length;
            }
        },
        boxplot: function (box, s) {
            var names = Object.keys(s.groups), f = frame(box, s, { kind: 'box plot', h: 320 });
            var all = [];
            names.forEach(function (k) { all = all.concat(numbersOnly(s.groups[k])); });
            if (!all.length) return;
            var sy = yAxis(f, Math.min.apply(null, all), Math.max.apply(null, all)), band = (f.x1 - f.x0) / names.length;
            var rand = S.rnd(7);
            names.forEach(function (k, i) {
                var v = numbersOnly(s.groups[k]); if (!v.length) return;
                var c = SERIES[i % SERIES.length], cx = f.x0 + band * (i + .5), bw = Math.min(56, band * .4);
                var q1 = S.quantile(v, .25), q2 = S.quantile(v, .5), q3 = S.quantile(v, .75), iqr = q3 - q1;
                var inside = v.filter(function (x) { return x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr; });
                var wl = Math.min.apply(null, inside), wh = Math.max.apply(null, inside);
                svgEl('line', { x1: cx, x2: cx, y1: sy(wl), y2: sy(q1), stroke: c, 'stroke-width': 1.5 }, f.svg);
                svgEl('line', { x1: cx, x2: cx, y1: sy(q3), y2: sy(wh), stroke: c, 'stroke-width': 1.5 }, f.svg);
                svgEl('rect', { x: cx - bw / 2, y: sy(q3), width: bw, height: Math.max(1, sy(q1) - sy(q3)), rx: 4, fill: c, 'fill-opacity': .12, stroke: c, 'stroke-width': 1.5,
                    'data-tip': k + ': median ' + fmt(q2) + ', middle half ' + fmt(q1) + '–' + fmt(q3) + ', n = ' + v.length }, f.svg);
                svgEl('line', { x1: cx - bw / 2, x2: cx + bw / 2, y1: sy(q2), y2: sy(q2), stroke: c, 'stroke-width': 3 }, f.svg);
                v.forEach(function (x) {
                    var out = x < wl || x > wh;
                    svgEl('circle', { cx: cx + bw / 2 + 10 + rand() * Math.min(26, band * .25), cy: sy(x), r: out ? 4.5 : 3, fill: out ? '#b91c1c' : c, 'fill-opacity': out ? 1 : .55, stroke: '#fff', 'stroke-width': 1, 'data-tip': k + ': ' + x + (out ? ' (outlier)' : '') }, f.svg);
                });
                svgEl('text', { x: cx, y: f.y0 + 18, 'text-anchor': 'middle', class: 'ax' }, f.svg).textContent = k + ' (n = ' + v.length + ')';
            });
            svgEl('line', { x1: f.x0, x2: f.x1, y1: f.y0, y2: f.y0, class: 'base' }, f.svg);
        },
        line: function (box, s) {
            var names = Object.keys(s.series), f = frame(box, s, { kind: 'line' });
            var all = [];
            names.forEach(function (k) { all = all.concat(numbersOnly(s.series[k])); });
            var xnum = s.x.every(function (v) { return typeof v === 'number'; });
            if (!all.length) return;
            var sy = yAxis(f, Math.min.apply(null, all), Math.max.apply(null, all));
            var sx;
            if (xnum) sx = xAxisNum(f, Math.min.apply(null, s.x), Math.max.apply(null, s.x));
            else {
                var band = (f.x1 - f.x0) / s.x.length;
                sx = function (v) { return f.x0 + band * (s.x.indexOf(v) + .5); };
                s.x.forEach(function (v) { svgEl('text', { x: sx(v), y: f.y0 + 18, 'text-anchor': 'middle', class: 'ax' }, f.svg).textContent = v; });
                svgEl('line', { x1: f.x0, x2: f.x1, y1: f.y0, y2: f.y0, class: 'base' }, f.svg);
            }
            names.forEach(function (k, i) {
                var c = SERIES[i % SERIES.length], d = '', pen = false, last = null;
                s.series[k].forEach(function (v, j) {
                    if (typeof v !== 'number') { pen = false; return; }
                    d += (pen ? 'L' : 'M') + sx(s.x[j]) + ',' + sy(v); pen = true; last = [s.x[j], v];
                });
                svgEl('path', { d: d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, f.svg);
                s.series[k].forEach(function (v, j) {
                    if (typeof v !== 'number') return;
                    svgEl('circle', { cx: sx(s.x[j]), cy: sy(v), r: 4, fill: c, stroke: '#fff', 'stroke-width': 2 }, f.svg);
                    svgEl('circle', { cx: sx(s.x[j]), cy: sy(v), r: 9, fill: 'transparent', 'data-tip': (names.length > 1 ? k + ', ' : '') + s.x[j] + ': ' + v }, f.svg);
                });
            });
            legend(f, names);
        },
        table: function (box, s) {
            var wrap = h('div', 'scroll-x', null, box), tb = h('table', 'dt', null, wrap);
            if (s.title) { var cap = h('caption', null, null, tb); cap.textContent = s.title; cap.style.cssText = 'text-align:left;font-weight:600;padding:.3rem 0'; }
            if (s.header) {
                var tr = h('tr', null, null, h('thead', null, null, tb));
                s.header.forEach(function (c) { h('th', null, null, tr).textContent = c; });
            }
            var body = h('tbody', null, null, tb);
            s.rows.forEach(function (r) {
                var tr2 = h('tr', null, null, body);
                r.forEach(function (c) { var td = h('td', typeof c === 'number' ? 'num' : null, null, tr2); td.textContent = typeof c === 'number' && !Number.isInteger(c) ? fmt(c, 3) : (c === null ? '' : c); });
            });
        }
    };
    function chart(box, kind, spec) {
        if (!CHARTS[kind]) { h('p', 'small', 'Unknown chart type: ' + esc(kind), box); return; }
        try { CHARTS[kind](box, spec); } catch (e) { h('p', 'small', 'This chart could not be drawn: ' + esc(e.message), box); }
    }

    /* ------------------------------------------------------------ tracks */
    var TRACKS = [
        { id: 'survey', label: 'Survey', c: '#2563eb' },
        { id: 'test', label: 'Test', c: '#c26a06' },
        { id: 'experiment', label: 'Experiment', c: '#0f8f84' },
        { id: 'coding', label: 'Coding texts', c: '#7c3aed' },
        { id: 'existing', label: 'Existing data', c: '#b83280' }
    ];
    var trackListeners = [];
    var chosen = store('wsDataTrack') || 'survey';
    function setTrack(id, save) {
        chosen = id;
        if (save) store('wsDataTrack', id);
        document.querySelectorAll('.track[data-track]').forEach(function (t) { t.hidden = !(id === 'all' || t.getAttribute('data-track') === id); });
        document.querySelectorAll('.trackbar button[data-id], .tcard[data-pick]').forEach(function (b) {
            b.setAttribute('aria-pressed', (b.getAttribute('data-id') || b.getAttribute('data-pick')) === id ? 'true' : 'false');
        });
        document.querySelectorAll('[data-fits]').forEach(function (e) {
            e.classList.toggle('mine', id !== 'all' && e.getAttribute('data-fits').split(/\s+/).indexOf(id) >= 0);
        });
        trackListeners.forEach(function (fn) { fn(id); });
    }
    function initTracks() {
        document.querySelectorAll('.trackbar').forEach(function (bar) {
            h('span', 'lbl', bar.getAttribute('data-label') || 'Your data type:', bar);
            var p = h('div', 'pills', null, bar);
            TRACKS.concat([{ id: 'all', label: 'Show all', c: '#4b5563' }]).forEach(function (t) {
                var b = h('button', 'pill', null, p);
                b.type = 'button'; b.textContent = t.label; b.setAttribute('data-id', t.id); b.style.setProperty('--c', t.c);
                b.addEventListener('click', function () { setTrack(t.id, true); });
            });
        });
        document.querySelectorAll('.tcard[data-pick]').forEach(function (b) {
            b.addEventListener('click', function () { setTrack(b.getAttribute('data-pick'), true); });
        });
        setTrack(chosen, false);
    }

    /* ------------------------------------------------------------ quiz: one answer per item */
    function quiz(box, items, options, scoreEl) {
        var right = 0, done = 0;
        items.forEach(function (it) {
            var row = h('div', 'qi', null, box);
            h('div', 'qt', it.t, row);
            var btns = h('div', 'btns', null, row), fb = h('div', 'fb', null, row);
            options.forEach(function (o, j) {
                var b = h('button', 'pill', null, btns);
                b.type = 'button'; b.textContent = o.label || o; if (o.c) b.style.setProperty('--c', o.c);
                b.setAttribute('aria-pressed', 'false');
                b.addEventListener('click', function () {
                    if (row.dataset.answered) return;
                    row.dataset.answered = '1'; done++;
                    var ok = Array.isArray(it.a) ? it.a.indexOf(j) >= 0 : it.a === j;
                    if (ok) right++;
                    b.setAttribute('aria-pressed', 'true');
                    btns.querySelectorAll('button').forEach(function (x) { x.disabled = x !== b; });
                    fb.className = 'fb show ' + (ok ? 'ok' : 'no');
                    fb.innerHTML = (ok ? '<b>Yes.</b> ' : '<b>Not quite.</b> ') + it.fb;
                    if (scoreEl) scoreEl.textContent = right + ' of ' + done + ' right' + (done === items.length ? ' – all done.' : '');
                });
            });
        });
    }

    /* ------------------------------------------------------------ spot the problems */
    function spot(list, items, checkBtn, scoreEl) {
        var btns = items.map(function (it) {
            var li = h('li', null, null, list), b = h('button', null, null, li);
            b.type = 'button'; b.innerHTML = it.t + '<span class="why">' + it.why + '</span>';
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { if (!list.dataset.done) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
            return b;
        });
        checkBtn.addEventListener('click', function () {
            if (list.dataset.done) {   // reset
                delete list.dataset.done; checkBtn.textContent = 'Check';
                btns.forEach(function (b) { b.className = ''; b.setAttribute('aria-pressed', 'false'); b.parentNode.classList.remove('done'); });
                scoreEl.textContent = ''; return;
            }
            list.dataset.done = '1'; checkBtn.textContent = 'Try again';
            var hits = 0, wrong = 0, total = 0;
            btns.forEach(function (b, i) {
                var on = b.getAttribute('aria-pressed') === 'true', bad = items[i].bad;
                if (bad) total++;
                b.className = bad ? (on ? 'hit' : 'missed') : (on ? 'miss' : '');
                if (bad && on) hits++; if (!bad && on) wrong++;
                b.parentNode.classList.add('done');
            });
            scoreEl.textContent = 'You found ' + hits + ' of ' + total + ' problems' + (wrong ? ' and marked ' + wrong + ' step' + (wrong > 1 ? 's' : '') + ' that are fine.' : '.') + ' Read the notes under each step.';
        });
    }

    /* ------------------------------------------------------------ Python cells */
    var worker = null, pyState = 'off', running = null, cells = {}, uploadCb = null;
    var HINTS = [
        [/FileNotFoundError/, function () { return 'Check the file name. This cell has these files: ' + (running && running.files.length ? running.files.map(function (f) { return f.name; }).join(', ') : 'none') + '. Your own file is called my-data.csv once you load it below.'; }],
        [/KeyError: '([^']*)'/, function (m) { return 'There is no column called “' + esc(m[1]) + '”. Add print(rows[0].keys()) to see the column names.'; }],
        [/could not convert string to float: ''|invalid literal for int\(\) with base 10: ''/, function () { return 'An empty cell in the data. Skip rows where the value is "" before you convert it.'; }],
        [/could not convert string to float|invalid literal for int/, function () { return 'A value is not a number (text, a comma instead of a point?). Print the row to find it.'; }],
        [/No module named '(matplotlib|pandas|numpy|scipy|seaborn)'/, function (m) { return esc(m[1]) + ' is not available on this page – only Python’s standard library and edu (charts). On your own computer: pip install ' + esc(m[1]) + '.'; }],
        [/IndentationError|TabError/, function () { return 'Indentation: lines inside for, if or def need 4 more spaces than the line above – and the same number of spaces within one block.'; }],
        [/NameError: name '([^']*)'/, function (m) { return '“' + esc(m[1]) + '” is not defined. A typo? Each cell runs on its own, so a variable from another cell does not exist here.'; }],
        [/ZeroDivisionError/, function () { return 'Division by zero: an empty list, or values that do not vary at all.'; }],
        [/StatisticsError/, function () { return 'The statistics module needs enough values – and correlation needs values that vary.'; }],
        [/SyntaxError/, function () { return 'Check brackets, quotation marks and the colon at the end of for, if and def lines.'; }]
    ];
    function tidyError(msg) {
        var lines = String(msg).split('\n'), i = -1;
        for (var k = 0; k < lines.length; k++) if (/File "<exec>"/.test(lines[k])) { i = k; break; }
        return (i >= 0 ? ['Traceback (most recent call last):'].concat(lines.slice(i)) : lines).join('\n').trim();
    }
    function getWorker() {
        if (worker) return worker;
        worker = new Worker('py-worker.js?base=' + encodeURIComponent(PY_BASE));
        pyState = 'loading';
        worker.onmessage = onPy;
        worker.onerror = function (e) {
            if (running) finish(running, false, 'Python could not be started (' + (e.message || 'worker error') + '). Check your connection and reload the page.');
            killWorker();
        };
        return worker;
    }
    function killWorker() { if (worker) worker.terminate(); worker = null; pyState = 'off'; }
    function onPy(e) {
        var m = e.data, c = m.id ? cells[m.id] : running;
        if (m.type === 'status') { if (running) running.status.textContent = m.text; return; }
        if (m.type === 'ready') { pyState = 'ready'; if (running) running.status.textContent = ''; return; }
        if (m.type === 'file-ok') { if (uploadCb) uploadCb(); return; }
        if (!c) return;
        if (m.type === 'out') {
            var last = c.outBox.lastElementChild;
            if (!last || last.tagName !== 'PRE' || last.classList.contains('err') !== !!m.err) { last = h('pre', m.err ? 'err' : null, null, c.outBox); }
            last.textContent += m.text;
        } else if (m.type === 'plot') {
            chart(c.outBox, m.kind, m.spec);
        } else if (m.type === 'done') {
            finish(c, m.ok, m.error);
        }
    }
    function finish(c, ok, error) {
        c.status.textContent = '';
        if (!ok && error) {
            h('pre', 'err', esc(tidyError(error)), c.outBox);
            for (var i = 0; i < HINTS.length; i++) {
                var mm = String(error).match(HINTS[i][0]);
                if (mm) { h('div', 'hint', '<b>Hint:</b> ' + HINTS[i][1](mm), c.outBox); break; }
            }
        } else if (ok && !c.outBox.querySelector('pre, figure, .scroll-x')) {
            h('p', 'small', 'Done – no output. Use print(…) to show a result.', c.outBox);
        }
        running = null;
        Object.keys(cells).forEach(function (k) { cells[k].runBtn.disabled = false; cells[k].stopBtn.hidden = true; });
    }
    function runCell(c) {
        if (running) return;
        running = c;
        c.out.classList.add('show');
        c.outBox.innerHTML = '';
        c.status.textContent = pyState === 'ready' ? 'Running …' : 'Starting Python …';
        Object.keys(cells).forEach(function (k) { cells[k].runBtn.disabled = true; });
        c.stopBtn.hidden = false;
        getWorker().postMessage({ type: 'run', id: c.id, code: c.ta.value, files: c.files });
    }
    function initCells() {
        document.querySelectorAll('.py[data-py]').forEach(function (el) {
            var id = el.getAttribute('data-py'), src = el.querySelector('script[type="text/plain"]');
            var orig = (src ? src.textContent : '').replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
            var files = (el.getAttribute('data-files') || '').split(/\s+/).filter(Boolean).map(function (p) {
                return { name: p.split('/').pop(), url: new URL(p, location.href).href, path: p };
            });
            var bar = h('div', 'py-bar', null, el);
            h('span', 'ttl', esc(el.getAttribute('data-title') || 'Python'), bar);
            if (files.length) h('span', 'files', files.map(function (f) { return '<a href="' + esc(f.path) + '" download>' + esc(f.name) + '</a>'; }).join(' · '), bar);
            var edited = h('span', 'py-edited', '', bar);
            var runBtn = h('button', 'run', '▶ Run', bar); runBtn.type = 'button'; runBtn.title = 'Run (Ctrl + Enter)';
            var stopBtn = h('button', null, '■ Stop', bar); stopBtn.type = 'button'; stopBtn.hidden = true;
            var resetBtn = h('button', null, 'Reset', bar); resetBtn.type = 'button';
            var copyBtn = h('button', null, 'Copy', bar); copyBtn.type = 'button';
            var ta = h('textarea', 'py-code', null, el);
            ta.spellcheck = false; ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off');
            ta.setAttribute('aria-label', 'Python code: ' + (el.getAttribute('data-title') || id) + '. Ctrl + Enter runs it, Escape then Tab leaves the editor.');
            var saved = store('wsPy:' + id);
            ta.value = typeof saved === 'string' ? saved : orig;
            function size() { ta.rows = Math.min(34, ta.value.split('\n').length + 1); }
            function mark() { var ed = ta.value !== orig; edited.textContent = ed ? 'edited' : ''; resetBtn.disabled = !ed; }
            size(); mark();
            var out = h('div', 'py-out', null, el), status = h('div', 'status', '', out), outBox = h('div', null, null, out);
            out.setAttribute('aria-live', 'polite');
            var c = { id: id, ta: ta, files: files, out: out, outBox: outBox, status: status, runBtn: runBtn, stopBtn: stopBtn };
            cells[id] = c;
            var escaped = false;
            ta.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { escaped = true; return; }
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCell(c); return; }
                if (e.key === 'Tab' && !escaped && !e.shiftKey) {
                    e.preventDefault();
                    var s = ta.selectionStart, en = ta.selectionEnd;
                    ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
                    ta.selectionStart = ta.selectionEnd = s + 4;
                    ta.dispatchEvent(new Event('input'));
                    return;
                }
                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {   // keep the indentation of the line above
                    var p = ta.selectionStart, lineStart = ta.value.lastIndexOf('\n', p - 1) + 1;
                    var ind = ta.value.slice(lineStart, p).match(/^ */)[0];
                    if (/:\s*$/.test(ta.value.slice(lineStart, p))) ind += '    ';
                    if (ind) {
                        e.preventDefault();
                        ta.value = ta.value.slice(0, p) + '\n' + ind + ta.value.slice(ta.selectionEnd);
                        ta.selectionStart = ta.selectionEnd = p + 1 + ind.length;
                        ta.dispatchEvent(new Event('input'));
                    }
                }
                escaped = false;
            });
            ta.addEventListener('input', function () { size(); mark(); store('wsPy:' + id, ta.value === orig ? null : ta.value); });
            runBtn.addEventListener('click', function () { runCell(c); });
            stopBtn.addEventListener('click', function () {
                if (running !== c) return;
                killWorker();
                finish(c, false, null);
                h('p', 'small', 'Stopped. The next run restarts Python.', outBox);
            });
            resetBtn.addEventListener('click', function () {
                if (!confirm('Reset this cell to the original code? Your changes are lost.')) return;
                ta.value = orig; store('wsPy:' + id, null); size(); mark();
            });
            copyBtn.addEventListener('click', function () {
                var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500); };
                if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); });
                else { ta.select(); }
            });
        });
        document.querySelectorAll('.py-upload').forEach(function (box) {
            var lab = h('label', 'pill-like', null, box);
            lab.innerHTML = '<span class="small" style="display:block;margin-bottom:.35rem">Choose a CSV file (comma-separated, first row = column names). It is read in this browser only – nothing is uploaded.</span>';
            var inp = h('input', null, null, lab); inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
            var msg = h('p', 'saved', '', box); msg.style.color = 'var(--ok)'; msg.setAttribute('aria-live', 'polite');
            inp.addEventListener('change', function () {
                var f = inp.files && inp.files[0]; if (!f) return;
                if (f.size > 5 * 1024 * 1024) { msg.textContent = 'This file is larger than 5 MB – please use a smaller extract.'; return; }
                var rd = new FileReader();
                rd.onload = function () {
                    var text = String(rd.result), n = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).length - 1;
                    msg.textContent = 'Loading into Python …';
                    uploadCb = function () { msg.textContent = '“' + f.name + '” is available as my-data.csv (' + n + ' data rows). Run the cell below.'; };
                    getWorker().postMessage({ type: 'file', name: 'my-data.csv', text: text });
                };
                rd.readAsText(f);
            });
        });
    }

    window.VD = {
        $: $, h: h, svgEl: svgEl, esc: esc, fmt: fmt, store: store, stats: S, csv: loadCSV, parseCSV: parseCSV,
        chart: chart, quiz: quiz, spot: spot, SERIES: SERIES, TRACKS: TRACKS,
        onTrack: function (fn) { trackListeners.push(fn); fn(chosen); }, track: function () { return chosen; }
    };

    function init() { initTracks(); initCells(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
