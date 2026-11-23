/* ==================================================================
   Ireland: Moments That Made an Island – page logic (englisch/13/ireland/)
   Alles bleibt im Browser (localStorage, Präfix 'irl13:').

   Bausteine (Markup in ireland.html):
   - Fortschritt                  .stop[data-stop], [data-done]
   - Sammelbuch („Locker“)        .collect[data-collect][data-text], #locker-*
   - Karte                        svg[data-map="pins"|"partition"], COAST/BORDER
   - Myth or fact                 MYTHS, #mf-list
   - Ogham-Namensschrift          #ogham-name, #ogham-svg
   - Landbesitz                   LAND, [data-land]
   - Bevölkerung                  POP, #pop-guess, #pop-svg
   - Vertrag 1921                 [data-treaty]
   - Teilung                      [data-part]
   - Karfreitagsabkommen          GFA, #gfa-list
   - Grenzfahrt                   ROAD, [data-road]
   - Timer Gruppenaufgaben        [data-timer]
   - Ursachenketten               CHAINS
   - Zeitleisten-Sprint           SPRINT
   - Identitäten                  ROOTS, PERSONAS
   - Schreibwerkstatt             TASKS, CHECKS, [data-plan]

   Zahlen: Stand November 2026 (Quellen am Seitenende).
   ================================================================== */
(function () {
    'use strict';

    const KEY = 'irl13:';
    const store = {
        get(k, fallback) {
            try { const v = localStorage.getItem(KEY + k); return v === null ? fallback : JSON.parse(v); }
            catch (e) { return fallback; }
        },
        set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* privat/gesperrt */ } },
        clear() {
            try { Object.keys(localStorage).filter(k => k.indexOf(KEY) === 0).forEach(k => localStorage.removeItem(k)); }
            catch (e) { /* ignore */ }
        }
    };
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const el = (tag, attrs, html) => {
        const e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
        if (html !== undefined) e.innerHTML = html;
        return e;
    };
    const SVGNS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs, text) => {
        const e = document.createElementNS(SVGNS, tag);
        Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
        if (text !== undefined) e.textContent = text;
        return e;
    };
    const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    const shake = e => { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); };
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------- Fortschritt ---------------- */
    function initProgress() {
        const done = store.get('done', {});
        function render() {
            $$('.stop[data-stop]').forEach(s => s.classList.toggle('done', !!done[s.dataset.stop]));
            $$('[data-done]').forEach(b => {
                const on = !!done[b.dataset.done];
                b.setAttribute('aria-pressed', on);
                b.textContent = on ? '☑ Done – well done!' : '☐ Done with this stop';
            });
        }
        $$('[data-done]').forEach(b => b.addEventListener('click', () => {
            done[b.dataset.done] = !done[b.dataset.done];
            store.set('done', done);
            render();
        }));
        render();
    }

    /* ---------------- Locker (Belege sammeln) ---------------- */
    let locker = store.get('locker', []);   // [{id, text}]
    function renderLocker(bump) {
        const ids = locker.map(x => x.id);
        $$('.collect[data-collect]').forEach(b => b.setAttribute('aria-pressed', ids.indexOf(b.dataset.collect) >= 0));
        const c = $('#locker-count'); if (c) c.textContent = locker.length;
        const badge = $('#locker-badge');
        if (badge && bump) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
        const list = $('#locker-list'); if (!list) return;
        list.innerHTML = '';
        locker.forEach(item => {
            const li = el('li');
            li.appendChild(el('span', null, '')).textContent = item.text;
            const x = el('button', { type: 'button', title: 'Remove', 'aria-label': 'Remove from locker' }, '✕');
            x.addEventListener('click', () => { locker = locker.filter(i => i.id !== item.id); store.set('locker', locker); renderLocker(); });
            li.appendChild(x);
            list.appendChild(li);
        });
        const empty = $('#locker-empty'); if (empty) empty.style.display = locker.length ? 'none' : '';
    }
    function initLocker() {
        $$('.collect[data-collect]').forEach(b => b.addEventListener('click', () => {
            const id = b.dataset.collect;
            if (locker.some(i => i.id === id)) locker = locker.filter(i => i.id !== id);
            else locker.push({ id, text: b.dataset.text });
            store.set('locker', locker);
            renderLocker(true);
        }));
        renderLocker();
    }

    /* ---------------- Karte ---------------- */
    // [Breite, Länge], vereinfacht; Projektion: x ~ Länge * cos(54°), y ~ Breite
    const P = (lat, lon) => [+((lon + 10.65) * 58.8 + 5).toFixed(1), +((55.45 - lat) * 100 + 5).toFixed(1)];
    const COAST_A = [[55.38,-7.37],[55.30,-7.25],[55.23,-6.93],[55.20,-6.99],[55.17,-7.06],[55.10,-7.15]];
    const NI_COAST = [[55.06,-7.25],[55.08,-7.10],[55.15,-7.00],[55.19,-6.95],[55.17,-6.80],[55.19,-6.70],[55.21,-6.62],[55.20,-6.25],
        [55.23,-6.15],[55.08,-6.03],[54.95,-5.95],[54.86,-5.80],[54.80,-5.70],[54.72,-5.80],[54.62,-5.91],[54.66,-5.67],[54.64,-5.53],
        [54.48,-5.45],[54.37,-5.53],[54.26,-5.61],[54.24,-5.82],[54.20,-5.89],[54.11,-5.90],[54.06,-6.00],[54.03,-6.10],[54.10,-6.27]];
    const COAST_B = [[54.04,-6.19],[53.98,-6.10],[54.00,-6.37],[53.88,-6.33],[53.79,-6.22],[53.72,-6.25],[53.61,-6.18],[53.45,-6.13],
        [53.38,-6.06],[53.34,-6.21],[53.27,-6.10],[53.20,-6.10],[52.96,-6.00],[52.80,-6.14],[52.64,-6.22],[52.56,-6.19],[52.40,-6.36],
        [52.34,-6.44],[52.25,-6.33],[52.17,-6.36],[52.17,-6.59],[52.12,-6.93],[52.25,-6.97],[52.15,-7.00],[52.16,-7.15],[52.05,-7.55],
        [52.08,-7.62],[51.95,-7.72],[51.95,-7.85],[51.83,-8.01],[51.80,-8.27],[51.70,-8.52],[51.60,-8.53],[51.60,-8.88],[51.55,-9.10],
        [51.48,-9.37],[51.45,-9.82],[51.55,-9.83],[51.68,-9.47],[51.65,-9.91],[51.60,-10.20],[51.75,-10.05],[51.87,-9.59],[51.77,-10.15],
        [51.90,-10.37],[51.95,-10.22],[52.12,-9.80],[52.13,-9.98],[52.14,-10.27],[52.10,-10.46],[52.27,-10.17],[52.27,-10.02],[52.27,-9.77],
        [52.42,-9.94],[52.51,-9.67],[52.58,-9.37],[52.61,-9.10],[52.66,-8.70],[52.67,-9.10],[52.64,-9.49],[52.56,-9.93],[52.68,-9.65],
        [52.82,-9.46],[52.94,-9.40],[52.97,-9.43],[53.02,-9.40],[53.15,-9.27],[53.14,-8.93],[53.27,-9.05],[53.24,-9.30],[53.26,-9.55],
        [53.32,-9.83],[53.40,-10.18],[53.49,-10.02],[53.61,-10.00],[53.62,-9.80],[53.76,-9.81],[53.80,-9.55],[53.90,-9.78],[53.97,-10.25],
        [54.10,-10.05],[54.30,-10.00],[54.31,-9.55],[54.33,-9.35],[54.22,-9.20],[54.15,-9.15],[54.29,-8.96],[54.27,-8.48],[54.31,-8.57],
        [54.47,-8.45],[54.48,-8.28],[54.65,-8.11],[54.63,-8.45],[54.63,-8.65],[54.66,-8.79],[54.71,-8.75],[54.80,-8.55],[54.83,-8.56],
        [54.98,-8.43],[55.15,-8.28],[55.22,-7.97],[55.15,-7.85],[55.27,-7.63],[55.05,-7.60],[55.13,-7.45],[55.28,-7.52]];
    // Grenze von Lough Foyle (bei Derry) bis Carlingford Lough (Narrow Water), nur innere Punkte
    const BORDER = [[55.04,-7.40],[54.98,-7.43],[54.83,-7.47],[54.79,-7.55],[54.70,-7.75],[54.62,-7.88],[54.55,-7.83],[54.48,-8.09],
        [54.43,-8.17],[54.36,-8.03],[54.30,-7.88],[54.23,-7.80],[54.19,-7.70],[54.12,-7.55],[54.10,-7.43],[54.15,-7.30],[54.18,-7.23],
        [54.25,-7.10],[54.41,-6.97],[54.34,-6.84],[54.29,-6.85],[54.22,-6.73],[54.12,-6.58],[54.07,-6.61],[54.03,-6.48],[54.07,-6.38]];
    const PINS = [
        { n: 1, lat: 53.69, lon: -6.45, name: 'Boyne Valley', sub: 'Newgrange (c. 3200 BC) · Battle of the Boyne (1690)', to: '#ch1' },
        { n: 2, lat: 51.77, lon: -10.54, name: 'Skellig Michael', sub: 'monks on a rock in the Atlantic', to: '#ch1' },
        { n: 3, lat: 55.00, lon: -7.32, name: 'Derry / Londonderry', sub: 'siege 1689 · Bloody Sunday 1972', to: '#ch2' },
        { n: 4, lat: 51.55, lon: -9.27, name: 'Skibbereen', sub: 'the Famine, 1847', to: '#ch3' },
        { n: 5, lat: 51.85, lon: -8.30, name: 'Cobh (Queenstown)', sub: 'the emigrants\' harbour', to: '#ch3' },
        { n: 6, lat: 53.35, lon: -6.26, name: 'Dublin', sub: 'Easter Rising 1916 · Dublin Castle 2011 & 2015', to: '#ch4' },
        { n: 7, lat: 54.60, lon: -5.93, name: 'Belfast', sub: 'the Troubles · peace walls · Good Friday 1998', to: '#ch5' },
        { n: 8, lat: 54.12, lon: -6.40, name: 'The border near Newry', sub: 'checkpoint, open road, Brexit', to: '#ch6' }
    ];
    const pathOf = pts => 'M' + pts.map(p => P(p[0], p[1]).join(',')).join(' L') + ' Z';
    const lineOf = pts => 'M' + pts.map(p => P(p[0], p[1]).join(',')).join(' L');

    function drawMap(svg, withCities) {
        const island = COAST_A.concat(NI_COAST, COAST_B);
        const ni = NI_COAST.concat(BORDER.slice().reverse());
        const borderLine = [NI_COAST[0]].concat(BORDER, [NI_COAST[NI_COAST.length - 1]]);
        svg.appendChild(svgEl('path', { d: pathOf(island), class: 'land' }));
        const niPath = svgEl('path', { d: pathOf(ni), class: 'ni' });
        svg.appendChild(niPath);
        const border = svgEl('path', { d: lineOf(borderLine), class: 'border' });
        svg.appendChild(border);
        if (withCities) [['Belfast', 54.60, -5.93, -38, -5], ['Dublin', 53.35, -6.26, -38, 4], ['Cork', 51.90, -8.47, -26, -6], ['Galway', 53.27, -9.05, 4, -6], ['Derry', 55.00, -7.32, -34, 4]]
            .forEach(c => {
                const [x, y] = P(c[1], c[2]);
                svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 2.6, class: 'city' }));
                svg.appendChild(svgEl('text', { x: x + c[3], y: y + c[4] }, c[0]));
            });
        return { niPath, border };
    }

    function initMaps() {
        const pinSvg = $('svg[data-map="pins"]');
        if (pinSvg) {
            drawMap(pinSvg, false);
            const [lx, ly] = P(54.50, -6.80);
            pinSvg.appendChild(svgEl('text', { x: lx, y: ly, class: 'lbl-big', 'text-anchor': 'middle' }, 'N. IRELAND'));
            pinSvg.appendChild(svgEl('text', { x: lx, y: ly + 13, class: 'lbl-big', 'text-anchor': 'middle' }, '(UK)'));
            const [rx, ry] = P(53.10, -8.50);
            pinSvg.appendChild(svgEl('text', { x: rx - 40, y: ry, class: 'lbl-big' }, 'REPUBLIC OF'));
            pinSvg.appendChild(svgEl('text', { x: rx - 40, y: ry + 14, class: 'lbl-big' }, 'IRELAND'));
            const list = $('#pin-list');
            PINS.forEach(p => {
                const [x, y] = P(p.lat, p.lon);
                const a = svgEl('a', { href: p.to, class: 'pin', 'aria-label': p.name });
                a.appendChild(svgEl('title', {}, p.name + ' – ' + p.sub));
                a.appendChild(svgEl('circle', { cx: x, cy: y, r: 9 }));
                a.appendChild(svgEl('text', { x: x, y: y + 3.5 }, String(p.n)));
                pinSvg.appendChild(a);
                if (list) {
                    const li = el('li');
                    li.appendChild(el('a', { href: p.to }, '<b>' + p.n + '</b><span>' + p.name + '<small>' + p.sub + '</small></span>'));
                    list.appendChild(li);
                }
            });
        }

        const partSvg = $('svg[data-map="partition"]');
        if (partSvg) {
            const m = drawMap(partSvg, true);
            const [lx, ly] = P(54.50, -6.80);
            const nLbl = svgEl('g', {});
            nLbl.appendChild(svgEl('text', { x: lx, y: ly, class: 'lbl-big', 'text-anchor': 'middle' }, 'N. IRELAND'));
            nLbl.appendChild(svgEl('text', { x: lx, y: ly + 13, class: 'lbl-big', 'text-anchor': 'middle' }, '(UK)'));
            const [rx, ry] = P(52.75, -8.30);
            const sLbl1 = svgEl('text', { x: rx - 40, y: ry, class: 'lbl-big' }, '');
            const sLbl2 = svgEl('text', { x: rx - 40, y: ry + 14, class: 'lbl-big' }, '');
            [nLbl, sLbl1, sLbl2].forEach(t => partSvg.appendChild(t));
            function set(on) {
                m.niPath.classList.toggle('on', on);
                m.border.style.opacity = on ? 1 : 0;
                nLbl.style.opacity = on ? 1 : 0;
                sLbl1.textContent = on ? 'IRISH FREE STATE' : 'IRELAND';
                sLbl2.textContent = on ? '(from 1949: Republic)' : 'part of the UK since 1801';
                $$('[data-part]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.part === '1') === on));
            }
            $$('[data-part]').forEach(b => b.addEventListener('click', () => set(b.dataset.part === '1')));
            set(false);
        }
    }

    /* ---------------- Myth or fact ---------------- */
    const MYTHS = [
        { s: 'Ireland is part of the United Kingdom.', a: 'myth', e: 'Half true at best. The <b>Republic of Ireland</b> has been independent since 1922 (a republic since 1949). Only <b>Northern Ireland</b>, in the north-east of the island, belongs to the UK. → chapter 4' },
        { s: 'St Patrick, Ireland\'s national saint, was Irish.', a: 'myth', e: 'Patrick was born in Roman Britain, kidnapped by Irish raiders as a teenager, escaped – and came back as a missionary. → chapter 1' },
        { s: 'During the Great Famine, Ireland simply ran out of food.', a: 'myth', e: 'The potatoes failed, but grain, butter and cattle were still shipped to Britain. The poor could not afford them. → chapter 3' },
        { s: 'Far more people with Irish roots live outside the island than on it.', a: 'fact', e: 'About 7 million people live on the island. More than 30 million Americans alone claim Irish ancestry. → chapters 3 and 8' },
        { s: 'The conflict in Northern Ireland was a religious war about Catholic and Protestant beliefs.', a: 'myth', e: 'Religion was the label of two communities, but nobody fought about theology. The conflict was about national identity (Irish or British), power and equal rights. → chapters 2 and 5' },
        { s: 'Ireland was the first country to legalise same-sex marriage by a popular vote.', a: 'fact', e: 'In May 2015, 62 % voted Yes – in a country where the Catholic Church had once dominated almost everything. → chapter 6' },
        { s: 'Today you must show your passport when you drive from Dublin to Belfast.', a: 'myth', e: 'There are no checks at all. You notice the border only because speed signs switch from km/h to mph. Keeping it that way was one of the hardest questions of Brexit. → chapter 6' }
    ];
    function initMyths() {
        const box = $('#mf-list'); if (!box) return;
        const answers = store.get('mf', {});
        const score = $('#mf-score');
        function updScore() {
            const n = Object.keys(answers).length;
            const r = Object.keys(answers).filter(i => answers[i] === MYTHS[i].a).length;
            score.textContent = n ? `Your gut feeling: ${r} of ${n} right` + (n === MYTHS.length ? (r >= 6 ? ' – impressive!' : ' – the story will fill the gaps.') : '') : '';
        }
        MYTHS.forEach((m, i) => {
            const card = el('div', { class: 'mf-card' });
            const btns = el('div', { class: 'mf-btns' });
            const st = el('div', { class: 'st' }); st.textContent = m.s;
            const fb = el('div', { class: 'fb' });
            ['myth', 'fact'].forEach(k => {
                const b = el('button', { class: 'chip', type: 'button' }, k === 'myth' ? 'Myth' : 'Fact');
                b.addEventListener('click', () => { answers[i] = k; store.set('mf', answers); show(); updScore(); });
                btns.appendChild(b);
            });
            function show() {
                const g = answers[i]; if (!g) return;
                $$('button', btns).forEach(b => {
                    const k = b.textContent.toLowerCase();
                    b.disabled = true;
                    b.classList.toggle('good', k === m.a);
                    b.classList.toggle('bad', k === g && g !== m.a);
                });
                fb.className = 'fb ' + (g === m.a ? 'ok' : 'no');
                fb.innerHTML = (g === m.a ? '✓ ' : '✗ ') + m.e;
            }
            card.appendChild(btns); card.appendChild(st); card.appendChild(fb);
            box.appendChild(card);
            show();
        });
        updScore();
    }

    /* ---------------- Ogham ---------------- */
    const OG = {
        B: ['b', 1], L: ['b', 2], F: ['b', 3], S: ['b', 4], N: ['b', 5],
        H: ['h', 1], D: ['h', 2], T: ['h', 3], C: ['h', 4], Q: ['h', 5],
        M: ['m', 1], G: ['m', 2], NG: ['m', 3], Z: ['m', 4], R: ['m', 5],
        A: ['v', 1], O: ['v', 2], U: ['v', 3], E: ['v', 4], I: ['v', 5]
    };
    const OG_SUB = { K: 'C', P: 'B', V: 'F', W: 'F', J: 'I', Y: 'I', X: 'CS' };
    function oghamLetters(txt) {
        let s = txt.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'SS');
        s = s.replace(/[KPVWJYX]/g, c => OG_SUB[c]);
        const out = [];
        for (let i = 0; i < s.length; i++) {
            if (s[i] === 'N' && s[i + 1] === 'G') { out.push('NG'); i++; continue; }
            if (OG[s[i]]) out.push(s[i]);
            else if (out.length && out[out.length - 1] !== ' ') out.push(' ');
        }
        while (out.length && out[out.length - 1] === ' ') out.pop();
        return out;
    }
    function initOgham() {
        const inp = $('#ogham-name'), svg = $('#ogham-svg'), lat = $('#ogham-latin');
        if (!inp || !svg) return;
        function draw() {
            const letters = oghamLetters(inp.value || 'EIRE');
            svg.innerHTML = '';
            const Y = 55, gap = 7;
            let x = 24;
            const parts = [];
            letters.forEach(L => {
                if (L === ' ') { x += 18; return; }
                const [g, n] = OG[L];
                const w = (n - 1) * gap;
                const x0 = x;
                for (let k = 0; k < n; k++) {
                    const xi = x0 + k * gap;
                    if (g === 'b') parts.push(['line', xi, Y, xi, Y + 26]);
                    else if (g === 'h') parts.push(['line', xi, Y - 26, xi, Y]);
                    else if (g === 'm') parts.push(['line', xi - 7, Y + 24, xi + 7, Y - 24]);
                    else parts.push(['line', xi, Y - 8, xi, Y + 8]);
                }
                svg.appendChild(svgEl('text', { x: x0 + w / 2, y: 104, 'text-anchor': 'middle', 'font-size': 10, fill: '#64748b', 'font-family': 'system-ui, sans-serif' }, L));
                x = x0 + w + 16;
            });
            const end = x + 4;
            svg.insertBefore(svgEl('line', { x1: 4, y1: Y, x2: end, y2: Y, stroke: '#0f3d3e', 'stroke-width': 3, 'stroke-linecap': 'round' }), svg.firstChild);
            // Federzeichen am Anfang
            svg.appendChild(svgEl('path', { d: `M4 ${Y} L-4 ${Y - 8} M4 ${Y} L-4 ${Y + 8}`, stroke: '#0f3d3e', 'stroke-width': 3, fill: 'none', transform: 'translate(8 0)' }));
            parts.forEach(p => svg.appendChild(svgEl('line', { x1: p[1], y1: p[2], x2: p[3], y2: p[4], stroke: '#0f3d3e', 'stroke-width': 3, 'stroke-linecap': 'round' })));
            svg.setAttribute('viewBox', `0 0 ${Math.max(end + 10, 120)} 110`);
            svg.style.width = Math.max(end + 10, 120) + 'px';
            lat.textContent = inp.value ? 'reads: ' + letters.join('').replace(/ +/g, ' · ') : 'Example: ÉIRE (Ireland in Irish)';
            store.set('ogham', inp.value);
        }
        inp.value = store.get('ogham', '');
        inp.addEventListener('input', draw);
        draw();
    }

    /* ---------------- Landbesitz ---------------- */
    const LAND = {
        1641: { p: 59, t: '<b>1641</b>, before Cromwell: even after the Plantation of Ulster, Catholics still own more than half of the land.' },
        1688: { p: 22, t: '<b>1688</b>, after Cromwell: Catholic landowners were driven west – “to Hell or to Connacht”, the poorest province.' },
        1703: { p: 14, t: '<b>1703</b>, after the Boyne: more land is taken from those who fought for the Catholic King James.' },
        1778: { p: 5, t: '<b>1778</b>, after 75 years of Penal Laws: about 5 %. Most Irish people now rent the land they work on from Protestant landlords.' }
    };
    function initLand() {
        const grid = $('#land-grid'); if (!grid) return;
        for (let i = 0; i < 100; i++) grid.appendChild(el('i'));
        const cells = $$('i', grid);
        function set(y) {
            const d = LAND[y];
            cells.forEach((c, i) => c.classList.toggle('c', i < d.p));
            $('#land-num').textContent = d.p + ' %';
            $('#land-txt').innerHTML = d.t;
            $$('[data-land]').forEach(b => b.setAttribute('aria-pressed', b.dataset.land === String(y)));
        }
        $$('[data-land]').forEach(b => b.addEventListener('click', () => set(b.dataset.land)));
        set(1641);
    }

    /* ---------------- Bevölkerung ---------------- */
    const POP = [[1841,8.18],[1851,6.55],[1861,5.80],[1871,5.41],[1881,5.17],[1891,4.70],[1901,4.46],[1911,4.39],[1926,4.23],
        [1936,4.25],[1951,4.33],[1961,4.24],[1971,4.51],[1981,5.00],[1991,5.10],[2002,5.61],[2011,6.40],[2022,7.05]];
    function initPop() {
        const svg = $('#pop-svg'); if (!svg) return;
        const X = y => 50 + (y - 1841) / (2022 - 1841) * 530;
        const Y = v => 225 - v / 9 * 205;
        svg.appendChild(svgEl('rect', { x: X(1845), y: 20, width: X(1852) - X(1845), height: 205, class: 'famine' }));
        svg.appendChild(svgEl('text', { x: X(1845) + 2, y: 16 }, 'Famine'));
        [0, 2, 4, 6, 8].forEach(v => {
            svg.appendChild(svgEl('line', { x1: 50, x2: 580, y1: Y(v), y2: Y(v), class: 'grid' }));
            svg.appendChild(svgEl('text', { x: 44, y: Y(v) + 4, 'text-anchor': 'end' }, v + ' m'));
        });
        [1841, 1881, 1921, 1961, 2001, 2022].forEach(y => svg.appendChild(svgEl('text', { x: X(y), y: 243, 'text-anchor': 'middle' }, y)));
        svg.appendChild(svgEl('line', { x1: 50, x2: 580, y1: 225, y2: 225, class: 'axis' }));
        const line = svgEl('path', { d: 'M' + POP.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' L'), class: 'line' });
        line.style.visibility = 'hidden';
        svg.appendChild(line);
        const marks = svgEl('g', {}); marks.style.visibility = 'hidden';
        [[1841, 8.18, '8.2 m'], [1911, 4.39, '4.4 m'], [2022, 7.05, '7.0 m']].forEach(m => {
            marks.appendChild(svgEl('circle', { cx: X(m[0]), cy: Y(m[1]), r: 4.5, class: 'dot' }));
            marks.appendChild(svgEl('text', { x: X(m[0]) + (m[0] === 2022 ? -6 : 6), y: Y(m[1]) - 8, 'text-anchor': m[0] === 2022 ? 'end' : 'start', 'font-weight': 700 }, m[2]));
        });
        svg.appendChild(marks);
        const fb = $('#pop-fb');
        function reveal(guess, animate) {
            line.style.visibility = 'visible'; marks.style.visibility = 'visible';
            if (animate && !reduceMotion && line.getTotalLength) {
                const L = line.getTotalLength();
                line.style.strokeDasharray = L; line.style.strokeDashoffset = L;
                line.getBoundingClientRect();
                line.style.transition = 'stroke-dashoffset 2.2s ease';
                line.style.strokeDashoffset = 0;
            }
            $$('[data-guess]').forEach(b => {
                b.classList.toggle('good', b.dataset.guess === 'down');
                b.classList.toggle('bad', b.dataset.guess === guess && guess !== 'down');
            });
            fb.className = 'fb ' + (guess === 'down' ? 'ok' : 'no');
            fb.innerHTML = (guess === 'down' ? '✓ Right – and shocking. ' : '✗ It fell by almost half. ') +
                'While the population of almost every European country grew in the 19th century, Ireland\'s shrank from 8.2 to 4.4 million – famine first, then decades of emigration. Even today, with about 7 million people on the island, there are fewer than in 1841. No other country in Europe can say that.';
        }
        $$('[data-guess]').forEach(b => b.addEventListener('click', () => { store.set('popGuess', b.dataset.guess); reveal(b.dataset.guess, true); }));
        const g = store.get('popGuess', null); if (g) reveal(g, false);
    }

    /* ---------------- Vertrag 1921 ---------------- */
    function initTreaty() {
        const out = $('#treaty-out'); if (!out) return;
        function show(v, animate) {
            out.innerHTML = `<div class="fb">${v === 'yes'
                ? 'You side with <b>Collins</b>.'
                : 'You side with <b>de Valera</b>.'} Here is how the Dáil voted on 7 January 1922:</div>
                <div class="tally-bar" aria-label="64 for, 57 against"><div style="width:${animate ? 50 : 52.9}%;background:var(--sea)">Accept 64</div><div style="width:${animate ? 50 : 47.1}%;background:#64748b">Reject 57</div></div>
                <div class="fb">De Valera resigned as president of the Dáil and walked out with his supporters. Six months later the <b>Civil War</b> began: Free State soldiers against anti-Treaty IRA fighters, often former comrades, sometimes brothers. <br><b>Who was right?</b> Collins in part: within 30 years Ireland removed the oath and left the Empire as a republic – without another war with Britain. De Valera in part: the border stayed, and with it the problem of Northern Ireland.</div>`;
            if (animate) requestAnimationFrame(() => requestAnimationFrame(() => {
                const d = $$('.tally-bar div', out); d[0].style.width = '52.9%'; d[1].style.width = '47.1%';
            }));
        }
        $$('[data-treaty]').forEach(b => b.addEventListener('click', () => { store.set('treaty', b.dataset.treaty); show(b.dataset.treaty, true); }));
        const v = store.get('treaty', null); if (v) show(v, false);
    }

    /* ---------------- Karfreitagsabkommen ---------------- */
    const GFA = [
        { t: 'Northern Ireland stays in the UK for as long as a majority there wants it (“principle of consent”).', a: 'u', e: 'The key guarantee for unionists: no united Ireland against their will.' },
        { t: 'If a majority in Northern Ireland ever votes for a united Ireland, Britain must accept it (border poll).', a: 'n', e: 'The door to unity stays open – by vote, not by force.' },
        { t: 'The Republic of Ireland deletes its constitutional claim to the whole island.', a: 'u', e: 'Since 1937 the Irish constitution had claimed the North. Dropping the claim reassured unionists.' },
        { t: 'A North–South Ministerial Council links the governments in Belfast and Dublin.', a: 'n', e: 'An “all-Ireland” dimension that nationalists wanted – unionists accepted it only in a limited form.' },
        { t: 'Unionists and nationalists must share power in one government at Stormont.', a: 'b', e: 'Neither side can rule alone – a guarantee for nationalists, but unionists keep a strong voice too.' },
        { t: 'Everyone born in Northern Ireland may be Irish, British or both – and hold both passports.', a: 'b', e: 'Identity becomes a free choice. After Brexit, the Irish passport (EU citizenship) became very popular – on both sides.' },
        { t: 'Paramilitary prisoners from both sides are released within two years.', a: 'b', e: 'Demanded by the parties close to the IRA and to loyalist groups – and the hardest part for many victims on both sides.' },
        { t: 'Paramilitary groups must give up their weapons (decommissioning).', a: 'u', e: 'Above all a unionist demand: no government with Sinn Féin while the IRA still has guns. It took until 2005.' },
        { t: 'The police are reformed so that Catholics will join too (the RUC becomes the PSNI in 2001).', a: 'n', e: 'The old police force was over 90 % Protestant; nationalists saw it as one side of the conflict.' }
    ];
    function initGfa() {
        const box = $('#gfa-list'); if (!box) return;
        const ans = store.get('gfa', {});
        const lab = { n: 'Nationalists', u: 'Unionists', b: 'Both' };
        function score() {
            const k = Object.keys(ans);
            const r = k.filter(i => ans[i] === GFA[i].a).length;
            $('#gfa-score').textContent = k.length ? `${r} of ${k.length} as we see it.` + (k.length === GFA.length ? ' Notice the balance: each side got something big – and had to swallow something painful.' : '') : '';
        }
        GFA.forEach((g, i) => {
            const row = el('div', { class: 'sort-row' });
            const t = el('div', { class: 'txt' }); t.textContent = g.t;
            const btns = el('div');
            const fb = el('div', { class: 'fb' });
            ['n', 'u', 'b'].forEach(k => {
                const b = el('button', { class: 'chip ' + (k === 'n' ? 'n-btn' : k === 'u' ? 'u-btn' : ''), type: 'button', 'data-k': k }, lab[k]);
                b.addEventListener('click', () => { ans[i] = k; store.set('gfa', ans); show(); score(); });
                btns.appendChild(b);
            });
            function show() {
                const v = ans[i]; if (!v) return;
                $$('button', btns).forEach(b => b.setAttribute('aria-pressed', b.dataset.k === v));
                fb.className = 'fb ' + (v === g.a ? 'ok' : 'no');
                fb.innerHTML = (v === g.a ? '✓ ' : '↻ Mainly <b>' + lab[g.a].toLowerCase() + '</b>: ') + g.e;
            }
            row.appendChild(t); row.appendChild(btns); row.appendChild(fb);
            box.appendChild(row);
            show();
        });
        score();
    }

    /* ---------------- Grenzfahrt ---------------- */
    const ROAD = {
        1985: { h: '1985: the border as a front line', t: 'Watchtowers on the hills of South Armagh, a permanent army checkpoint, soldiers with rifles who search your car and ask where you are going. Customs officers check your shopping. Many small country roads have been blocked with concrete or blown up on purpose. You wait – twenty minutes, sometimes an hour.', show: ['tower', 'check', 'queue'], car: 205 },
        2008: { h: '2008: you didn\'t even notice', t: 'No hut, no soldier, no queue. The army has gone, the watchtowers have been taken down. The only clues that you are in another country: the speed signs switch from km/h to mph, and the yellow lines at the edge of the road turn white. Tens of thousands of people cross every day for work, school and shopping.', show: [], car: 470 },
        2019: { h: '2019: the nightmare everyone tried to avoid', t: 'After Brexit this would be the frontier between the UK and the EU. Goods would normally need checks – customs posts? cameras? The police warned that any new border post could become a target again. This question (the “backstop”) dominated the Brexit talks for three years and helped to bring down a British prime minister.', show: ['what'], car: 230 },
        2026: { h: '2026: an open road – and a border at sea', t: 'The land border looks exactly like 2008. The checks have moved to the ports: lorries from Great Britain to Belfast use a <b>green lane</b> (goods staying in Northern Ireland, few checks) or a <b>red lane</b> (goods that might go on into the EU, full checks). Many unionists say this “Irish Sea border” treats them differently from the rest of the UK.', show: ['port'], car: 470 }
    };
    function initRoad() {
        const svg = $('#road-svg'); if (!svg) return;
        svg.innerHTML = `
            <rect x="0" y="0" width="600" height="170" fill="#e0f2fe"/>
            <path d="M0 120 C80 70 160 95 240 80 C320 60 380 90 460 55 C520 35 570 70 600 60 L600 120 Z" fill="#bbf7d0"/>
            <rect x="0" y="118" width="600" height="40" fill="#475569"/>
            <line x1="0" y1="138" x2="600" y2="138" stroke="#fff" stroke-width="2" stroke-dasharray="14 10"/>
            <line x1="0" y1="121" x2="300" y2="121" stroke="#facc15" stroke-width="2.5"/>
            <line x1="0" y1="155" x2="300" y2="155" stroke="#facc15" stroke-width="2.5"/>
            <line x1="300" y1="121" x2="600" y2="121" stroke="#fff" stroke-width="2.5"/>
            <line x1="300" y1="155" x2="600" y2="155" stroke="#fff" stroke-width="2.5"/>
            <line x1="300" y1="20" x2="300" y2="168" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="4 4"/>
            <text x="246" y="16" font-size="11" font-family="system-ui" fill="#1e293b">Republic ◂ border ▸ UK</text>
            <g><rect x="168" y="84" width="3" height="34" fill="#334155"/><rect x="143" y="66" width="54" height="22" rx="3" fill="#fff" stroke="#b91c1c" stroke-width="2.5"/><text x="170" y="81" text-anchor="middle" font-size="10" font-weight="700" font-family="system-ui">100 km/h</text></g>
            <g><rect x="438" y="84" width="3" height="34" fill="#334155"/><circle cx="440" cy="74" r="13" fill="#fff" stroke="#b91c1c" stroke-width="2.5"/><text x="440" y="78" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui">60</text><text x="458" y="70" font-size="9" font-family="system-ui">mph</text></g>
            <g id="r-tower"><rect x="505" y="20" width="12" height="34" fill="#334155"/><rect x="499" y="12" width="24" height="12" fill="#1e293b"/><text x="527" y="22" font-size="9" font-family="system-ui">watchtower</text></g>
            <g id="r-check"><rect x="318" y="86" width="44" height="32" fill="#64748b"/><rect x="326" y="94" width="12" height="10" fill="#e0f2fe"/><text x="322" y="82" font-size="9" font-family="system-ui">army checkpoint</text>
                <rect x="296" y="114" width="8" height="44" fill="#b91c1c"/><rect x="296" y="114" width="8" height="8" fill="#fff"/><rect x="296" y="130" width="8" height="8" fill="#fff"/><rect x="296" y="146" width="8" height="8" fill="#fff"/>
                <circle cx="282" cy="96" r="5" fill="#1e293b"/><rect x="278" y="101" width="8" height="17" fill="#365314"/><line x1="287" y1="104" x2="294" y2="96" stroke="#1e293b" stroke-width="2"/></g>
            <g id="r-queue"><rect x="40" y="126" width="34" height="16" rx="4" fill="#94a3b8"/><rect x="90" y="126" width="34" height="16" rx="4" fill="#a8a29e"/><rect x="140" y="126" width="34" height="16" rx="4" fill="#94a3b8"/></g>
            <g id="r-what"><rect x="318" y="84" width="46" height="34" fill="none" stroke="#b91c1c" stroke-width="2" stroke-dasharray="5 4"/><text x="341" y="108" text-anchor="middle" font-size="20" font-weight="700" fill="#b91c1c" font-family="system-ui">?</text><text x="370" y="96" font-size="9" fill="#b91c1c" font-family="system-ui">customs post?</text><text x="370" y="108" font-size="9" fill="#b91c1c" font-family="system-ui">cameras?</text></g>
            <g id="r-port"><rect x="8" y="8" width="210" height="50" rx="6" fill="#fff" stroke="#0f3d3e"/><text x="16" y="24" font-size="10" font-weight="700" font-family="system-ui" fill="#0f3d3e">Meanwhile at Belfast port:</text>
                <rect x="16" y="32" width="12" height="12" fill="#16a34a"/><text x="32" y="42" font-size="9.5" font-family="system-ui">green lane</text><rect x="96" y="32" width="12" height="12" fill="#dc2626"/><text x="112" y="42" font-size="9.5" font-family="system-ui">red lane: checks</text></g>
            <g id="r-car" style="transition: transform 1.6s ease"><rect x="0" y="138" width="44" height="16" rx="5" fill="#0f3d3e"/><rect x="8" y="131" width="26" height="10" rx="3" fill="#0f3d3e"/><circle cx="10" cy="155" r="4" fill="#111"/><circle cx="34" cy="155" r="4" fill="#111"/></g>`;
        const groups = { tower: $('#r-tower', svg), check: $('#r-check', svg), queue: $('#r-queue', svg), what: $('#r-what', svg), port: $('#r-port', svg) };
        const car = $('#r-car', svg);
        if (reduceMotion) car.style.transition = 'none';
        function set(y, first) {
            const d = ROAD[y];
            Object.keys(groups).forEach(k => groups[k].classList.toggle('hide', d.show.indexOf(k) < 0));
            car.style.transform = 'translateX(' + (first ? 10 : d.car) + 'px)';
            $('#road-out').innerHTML = `<h5>${d.h}</h5><p style="margin:0">${d.t}</p>`;
            $$('[data-road]').forEach(b => b.setAttribute('aria-pressed', b.dataset.road === String(y)));
        }
        Object.keys(groups).forEach(k => groups[k].classList.add('hide'));
        car.style.transform = 'translateX(10px)';
        $$('[data-road]').forEach(b => b.addEventListener('click', () => {
            car.style.transition = 'none'; car.style.transform = 'translateX(10px)'; car.getBoundingClientRect();
            car.style.transition = reduceMotion ? 'none' : 'transform 1.6s ease';
            set(b.dataset.road);
        }));
    }

    /* ---------------- Timer für Gruppenaufgaben ---------------- */
    function initTimers() {
        $$('[data-timer]').forEach(box => {
            const total = +box.dataset.timer;
            const btn = $('button', box), out = $('output', box);
            let left = total, id = null;
            const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
            function stop() { clearInterval(id); id = null; btn.classList.remove('run'); }
            btn.addEventListener('click', () => {
                if (id) { stop(); btn.textContent = '▶ ' + fmt(left); return; }
                if (left <= 0) left = total;
                btn.classList.add('run'); btn.textContent = '⏸ Pause';
                id = setInterval(() => {
                    left--; out.textContent = fmt(left);
                    if (left <= 0) { stop(); btn.textContent = '↺ Again'; out.textContent = 'Time!'; }
                }, 1000);
            });
            out.textContent = fmt(total);
        });
    }

    /* ---------------- Ursachenketten ---------------- */
    const CHAINS = [
        { id: 'sea', title: 'The Irish Sea border', steps: [
            'Goods from Great Britain are checked when they arrive in Belfast – a “border in the Irish Sea” that angers many unionists.',
            'After Brexit the UK left the EU single market, but checks on the Irish land border were ruled out.',
            'An open land border is part of the peace built by the Good Friday Agreement (1998).',
            'During the Troubles the border was fortified – a front line between two identities.',
            'Partition (1921) drew a border around the six counties with a Protestant, unionist majority.',
            'The Plantation of Ulster (from 1609) settled Protestant Scots and English in the north-east.'] },
        { id: 'chicago', title: 'Chicago dyes its river green', steps: [
            'Every March, Chicago dyes its river green, and millions of Americans celebrate St Patrick\'s Day.',
            'More than 30 million Americans claim Irish roots.',
            'Over a million Irish emigrated to North America within a few years, often on “coffin ships”.',
            'The Great Famine (1845–52) killed about a million people.',
            'Millions of poor tenants lived almost only on potatoes grown on tiny plots of rented land.',
            'Catholics had lost almost all their land through conquest and the Penal Laws.'] },
        { id: 'walls', title: 'Peace walls in 2026', steps: [
            'In 2026 Belfast still has walls and gates that separate Catholic and Protestant streets.',
            'Many residents on both sides still feel safer behind them.',
            'During the Troubles (1969–98) more than 3,500 people were killed, often in attacks across these streets.',
            'Peaceful civil rights marches in 1968–69 were met with violence, and armed groups took over.',
            'Catholics in Northern Ireland faced discrimination in housing, jobs and voting.',
            'Northern Ireland was created (1921) as a state run by and for the unionist majority – “a Protestant Parliament and a Protestant State”.'] },
        { id: 'yes', title: 'Ireland votes Yes (2015/2018)', steps: [
            'Ireland legalised same-sex marriage (2015) and abortion (2018) by popular vote.',
            'The Catholic Church lost most of its moral authority, above all among young people.',
            'From the 1990s, reports revealed abuse in Church-run schools, homes and laundries – while EU membership and the Celtic Tiger opened the country up.',
            'After independence the Church had enormous power over schools, hospitals and laws (1937 Constitution).',
            'Under British rule and the Penal Laws, being Catholic had become a sign of being Irish.'] }
    ];
    function initChains() {
        const pick = $('#chain-pick'), built = $('#chain-built'), pool = $('#chain-pool'), fb = $('#chain-fb');
        if (!pick) return;
        const doneC = store.get('chains', {});
        let cur = null, pos = 0;
        function renderPick() {
            pick.innerHTML = '';
            CHAINS.forEach(c => {
                const b = el('button', { class: 'chip', type: 'button', 'aria-pressed': cur === c }, (doneC[c.id] ? '✓ ' : '') + c.title);
                b.addEventListener('click', () => start(c));
                pick.appendChild(b);
            });
        }
        function card(text, i, last) {
            const lvl = i === 0 ? 'Today' : last ? 'Root' : 'Why? Because …';
            return el('div', { class: 'link-card' + (i === 0 ? ' today' : '') + (last ? ' root' : '') }, `<span class="lvl">${lvl}</span>${text}`);
        }
        function start(c) {
            cur = c; pos = 1; fb.className = 'fb'; fb.innerHTML = '';
            renderPick();
            built.innerHTML = ''; built.appendChild(card(c.steps[0], 0, false));
            pool.innerHTML = '';
            shuffle(c.steps.slice(1).map((s, i) => ({ s, i: i + 1 }))).forEach(o => {
                const b = el('button', { type: 'button' }); b.textContent = o.s;
                b.addEventListener('click', () => {
                    if (o.i === pos) {
                        built.appendChild(el('div', { class: 'because' }, '▼ why?'));
                        built.appendChild(card(o.s, o.i, o.i === c.steps.length - 1));
                        b.remove(); pos++;
                        fb.className = 'fb'; fb.innerHTML = '';
                        if (pos === c.steps.length) {
                            doneC[c.id] = true; store.set('chains', doneC); renderPick();
                            fb.className = 'fb ok';
                            fb.innerHTML = '✓ Chain complete. Read it from the bottom up: a decision made centuries ago still shapes this headline. ' +
                                (Object.keys(doneC).length < 2 ? 'Now try a second chain.' : 'Strong evidence for your writing task!');
                        }
                    } else {
                        shake(b);
                        fb.className = 'fb no';
                        fb.innerHTML = o.i > pos ? 'Not yet – that lies further back. Which card <b>directly</b> explains the last one?' : 'Hmm – which card explains the last one?';
                    }
                });
                pool.appendChild(b);
            });
        }
        renderPick();
    }

    /* ---------------- Zeitleisten-Sprint ---------------- */
    const SPRINT = [
        ['Newgrange is built', 'c. 3200 BC', -3200], ['St Patrick\'s mission (trad.)', '432', 432], ['Plantation of Ulster begins', '1609', 1609],
        ['Battle of the Boyne', '1690', 1690], ['Great Famine begins', '1845', 1845], ['Easter Rising', '1916', 1916],
        ['Partition: Northern Ireland created', '1921', 1921], ['Bloody Sunday in Derry', '1972', 1972], ['Good Friday Agreement', '1998', 1998],
        ['Brexit referendum', '2016', 2016]
    ];
    function initSprint() {
        const startBtn = $('#sprint-start'), line = $('#sprint-line'), pool = $('#sprint-pool'), fb = $('#sprint-fb'), best = $('#sprint-best');
        if (!startBtn) return;
        let t0 = 0, pos = 0, errors = 0;
        const showBest = () => { const b = store.get('sprintBest', null); best.textContent = b ? `Your best: ${b.s.toFixed(1)} s, ${b.e} mistake${b.e === 1 ? '' : 's'}` : ''; };
        startBtn.addEventListener('click', () => {
            line.innerHTML = ''; pool.innerHTML = ''; fb.className = 'fb'; fb.innerHTML = '';
            pos = 0; errors = 0; t0 = performance.now();
            startBtn.textContent = 'Restart';
            shuffle(SPRINT.map((e, i) => ({ e, i }))).forEach(o => {
                const b = el('button', { type: 'button' }); b.textContent = o.e[0];
                b.addEventListener('click', () => {
                    if (o.i === pos) {
                        line.appendChild(el('span', null, `<b>${o.e[1]}</b>${o.e[0]}`));
                        b.remove(); pos++;
                        if (pos === SPRINT.length) {
                            const s = (performance.now() - t0) / 1000;
                            const old = store.get('sprintBest', null);
                            const better = !old || errors < old.e || (errors === old.e && s < old.s);
                            if (better) store.set('sprintBest', { s, e: errors });
                            fb.className = 'fb ok';
                            fb.innerHTML = `✓ Done in <b>${s.toFixed(1)} s</b> with ${errors} mistake${errors === 1 ? '' : 's'}.` + (better ? ' New personal best!' : '');
                            showBest();
                        }
                    } else { errors++; shake(b); }
                });
                pool.appendChild(b);
            });
        });
        showBest();
    }

    /* ---------------- Identitäten ---------------- */
    const ROOTS = {
        gaelic: 'Gaelic culture & language', plant: 'Plantation & the Boyne', penal: 'Penal Laws & lost land', famine: 'Famine & emigration',
        rising: '1916 & independence', partition: 'Partition', troubles: 'The Troubles', gfa: 'Good Friday Agreement',
        tiger: 'Celtic Tiger & EU', church: 'Church scandals & referendums', brexit: 'Brexit', immig: 'Immigration'
    };
    const PERSONAS = [
        { id: 'ruth', av: '🧑‍🌾', name: 'Ruth, 52', where: 'farmer near Ballymena, Northern Ireland',
          q: 'My family has farmed this land since the 1600s – we\'re not “settlers”, we\'re from here. I\'m British, and Ulster is my home. On the Twelfth I walk with my lodge; that\'s our heritage, not a provocation. Since Brexit, goods from England get checked when they come into Belfast. It feels like London has quietly moved us out of the UK.',
          roots: { plant: 'Her ancestors came with the Plantation; the Boyne is the victory her lodge celebrates.', partition: 'Northern Ireland was created so that people like her could stay British.', troubles: 'Unionists remember the IRA\'s bombs; “No surrender” is still a strong feeling.', brexit: 'The Irish Sea border makes her feel separated from Britain.' },
          today: 'Since the 2021 census more people have a Catholic background than a Protestant one, and a border poll suddenly seems possible. What would a united Ireland have to offer someone like Ruth?' },
        { id: 'ciaran', av: '🎤', name: 'Ciarán, 19', where: 'student, West Belfast',
          q: 'I rap in Irish. My granny was told Irish was a language for peasants – now it\'s cool, and since 2022 it\'s officially recognised here. My uncle was shot in the Troubles; I was born after the Agreement and I\'ve never seen a soldier on my street. I want a united Ireland – by a vote, not by a gun.',
          roots: { gaelic: 'The language revival is at the centre of his identity.', penal: 'Centuries of being treated as second-class shape his sense of injustice.', troubles: 'His family carries the memory of violence.', gfa: 'The Agreement gives him peace – and a legal way to unity: the border poll.' },
          today: 'Would Ciarán\'s united Ireland have room for Ruth?' },
        { id: 'chloe', av: '🎒', name: 'Chloe, 17', where: 'school student, Bangor, Northern Ireland',
          q: 'Northern Irish – that\'s what I tick. Mum\'s from a Protestant family, Dad\'s Catholic, and honestly, I couldn\'t care less. I\'ve got a British and an Irish passport; the Irish one means I can still study anywhere in the EU. My friends and I just want good jobs and to stop being asked which side we\'re on.',
          roots: { gfa: 'The Agreement lets her be Irish, British or both.', brexit: 'Her Irish passport keeps her an EU citizen after Brexit.', troubles: 'Her parents\' generation lived through the Troubles; hers is the peace generation.' },
          today: 'Most children in Northern Ireland still go to separate Catholic or Protestant schools. Should that change?' },
        { id: 'mike', av: '🚒', name: 'Mike O\'Sullivan, 58', where: 'firefighter, Boston, USA',
          q: 'My great-great-grandfather left Kerry in 1847 with nothing. I\'ve got a shamrock tattoo, I march every St Patrick\'s Day, and I cried the first time I saw the coast of Kerry. Some folks in Dublin laugh at Americans like me – “plastic Paddies”. But we never forgot where we came from.',
          roots: { famine: 'His family story begins with the Famine and the emigrant ship.', gaelic: 'St Patrick, the shamrock, the music – the symbols of Irishness abroad.' },
          today: 'Is being Irish a matter of blood, of place, or of choice? (By the way: Éamon de Valera was born in New York.)' },
        { id: 'aoife', av: '💻', name: 'Aoife, 29', where: 'software developer, Dublin',
          q: 'I work for a US tech company, I earn well – and I still live in my childhood bedroom because rents are crazy. I flew home from London to vote Yes in 2015 and campaigned in 2018. My granny never missed Mass. I\'ve never been. Ireland changed more in my lifetime than in the hundred years before.',
          roots: { tiger: 'Her job exists because of the Celtic Tiger – and so does the housing crisis.', church: 'Her generation turned away from the Church after the scandals and voted for change.' },
          today: 'Has the Celtic Tiger made Ireland a better place for young people?' },
        { id: 'tunde', av: '🩺', name: 'Tunde, 34', where: 'nurse, Cork',
          q: 'I was born in Lagos and came to Ireland as a student nurse. I became an Irish citizen in 2019. My son plays hurling and speaks better Irish than I do. Most people here are warm and welcoming – but since the riots in Dublin in 2023 I\'m more careful at night. I\'m Irish. Some people still don\'t see it.',
          roots: { immig: 'He is one of the one in five people in Ireland who were born abroad.', tiger: 'The growing economy and health service needed workers from all over the world.', gaelic: 'Hurling and the Irish language are how his son belongs.' },
          today: 'A country of emigrants has become a country of immigrants. What does “Irish” mean now?' }
    ];
    function initPersonas() {
        const grid = $('#personas'), panel = $('#persona-panel'); if (!grid) return;
        const seen = store.get('personas', {});
        PERSONAS.forEach(p => {
            const b = el('button', { type: 'button', class: 'persona-btn' + (seen[p.id] ? ' seen' : ''), 'aria-pressed': 'false', 'data-p': p.id },
                `<span class="av">${p.av}</span><b>${p.name}</b><small>${p.where}</small>`);
            b.addEventListener('click', () => open(p));
            grid.appendChild(b);
        });
        function open(p) {
            $$('.persona-btn', grid).forEach(b => b.setAttribute('aria-pressed', b.dataset.p === p.id));
            const chosen = new Set();
            panel.innerHTML = `<b>${p.name}</b>, ${p.where}<blockquote></blockquote>
                <p style="margin:.2rem 0 .3rem;font-weight:600">Which parts of the story shaped ${p.name.split(',')[0]}? Select 2–4.</p>
                <div class="root-chips"></div>
                <div class="row-btns" style="margin-top:.5rem"><button class="btn btn-primary" type="button">Compare</button></div>
                <div class="out"></div>`;
            $('blockquote', panel).textContent = '“' + p.q + '”';
            const rb = $('.root-chips', panel);
            Object.keys(ROOTS).forEach(k => {
                const c = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false' }, ROOTS[k]);
                c.addEventListener('click', () => { if (chosen.has(k)) chosen.delete(k); else chosen.add(k); c.setAttribute('aria-pressed', chosen.has(k)); });
                c.dataset.k = k;
                rb.appendChild(c);
            });
            $('.row-btns button', panel).addEventListener('click', () => {
                const sug = Object.keys(p.roots);
                $$('button', rb).forEach(c => {
                    c.disabled = true;
                    c.classList.toggle('good', chosen.has(c.dataset.k) && sug.indexOf(c.dataset.k) >= 0);
                    c.classList.toggle('miss', !chosen.has(c.dataset.k) && sug.indexOf(c.dataset.k) >= 0);
                    c.classList.toggle('bad', chosen.has(c.dataset.k) && sug.indexOf(c.dataset.k) < 0);
                });
                const hits = sug.filter(k => chosen.has(k)).length;
                $('.out', panel).innerHTML = `<div class="fb">${hits} of ${sug.length} of our suggestions were among your choices (green; dashed = our suggestion you didn't pick). ${chosen.size > hits ? 'Your other choices may still make sense – can you explain them?' : ''}
                    <ul style="margin:.4rem 0 0 1.1rem;padding:0">${sug.map(k => `<li><b>${ROOTS[k]}:</b> ${p.roots[k]}</li>`).join('')}</ul></div>
                    <div class="today-q">💬 <b>Think further:</b> ${p.today}</div>`;
                seen[p.id] = true; store.set('personas', seen);
                $(`.persona-btn[data-p="${p.id}"]`, grid).classList.add('seen');
            });
        }
    }

    /* ---------------- Schreibwerkstatt ---------------- */
    const TASKS = [
        { id: 'collins', mode: 'hist', who: 'Michael Collins · Dáil Éireann · 19 December 1921',
          q: 'Assess whether the Anglo-Irish Treaty is a victory or a betrayal of the Irish cause.',
          side: 'You argue: accept the Treaty – it is “the freedom to achieve freedom”.',
          counter: 'De Valera: the oath to the King and the partition of the island betray the Republic proclaimed in 1916.',
          speech: 'the members of the Dáil – many of them your comrades from the war, many of them angry with you',
          article: 'an open letter to the Irish people in the <i>Freeman\'s Journal</i>, a Dublin daily newspaper',
          know: 'You know nothing after December 1921: not the vote, not the Civil War, not your own death.', ev: ['#ch3', '#ch4'] },
        { id: 'markievicz', mode: 'hist', who: 'Constance Markievicz · Dáil Éireann · January 1922',
          q: 'Assess whether the Anglo-Irish Treaty is a victory or a betrayal of the Irish cause.',
          side: 'You argue: reject the Treaty – you fought in 1916, and you will never swear an oath to the British King.',
          counter: 'Collins: the Treaty is a stepping stone to full freedom, and the alternative is “immediate and terrible war”.',
          speech: 'the members of the Dáil, the day before the vote',
          article: 'a republican pamphlet handed out on the streets of Dublin',
          know: 'You know nothing after early January 1922.', ev: ['#ch2', '#ch4'] },
        { id: 'hume', mode: 'hist', who: 'John Hume · Derry · May 1998',
          q: 'Assess whether the Good Friday Agreement is a price worth paying for peace.',
          side: 'You argue: yes – vote Yes on 22 May.',
          counter: 'Victims and unionist critics: prisoners walk free after two years, and men linked to the IRA may sit in government.',
          speech: 'a crowd in Guildhall Square, Derry – Catholics and Protestants, many of whom have lost someone',
          article: 'an opinion piece in the <i>Belfast Telegraph</i>, read mostly by unionists, two days before the vote',
          know: 'You know nothing after the referendum – not the result, not the Nobel Prize.', ev: ['#ch4', '#ch5'] },
        { id: 'robinson', mode: 'hist', who: 'Mary Robinson · President of Ireland · 1995',
          q: 'Assess whether the millions of people of Irish descent abroad are part of the Irish nation.',
          side: 'You argue: yes – Irishness does not end at the coastline.',
          counter: 'Critics: people who have never lived in Ireland, never paid taxes here and know it only from St Patrick\'s Day cannot claim to be Irish.',
          speech: 'both houses of the Irish parliament (inspired by her real 1995 speech “Cherishing the Irish Diaspora”)',
          article: 'an article for <i>The Irish Times</i>',
          know: 'You know nothing after 1995: no Celtic Tiger boom yet, no Good Friday Agreement.', ev: ['#ch1', '#ch3', '#identity'] },
        { id: 'unity', mode: 'mod', who: 'You · today',
          q: 'Assess whether Ireland should be reunited within the next 20 years.',
          side: 'Choose your side.',
          counter: 'If you argue for unity: unionists like Ruth would lose the state they identify with; costs; fear of new violence. If you argue against: the census shows change, Northern Ireland voted against Brexit, and the Good Friday Agreement allows a border poll.',
          speech: 'a youth debate on the future of the island, held in Belfast and streamed north and south',
          article: 'an opinion piece for an online magazine for young Europeans', know: '', ev: ['#ch4', '#ch5', '#ch6', '#identity'] },
        { id: 'walls', mode: 'mod', who: 'You · today',
          q: 'Assess whether Belfast\'s peace walls should come down now.',
          side: 'Choose your side.',
          counter: 'If you argue they should go: many residents say the walls make them feel safe – and they should decide. If you argue they should stay: walls keep the division alive for another generation.',
          speech: 'a public meeting of residents from both sides of a wall in North Belfast',
          article: 'a feature for a German newspaper\'s English-language youth page',
          know: '', ev: ['#ch2', '#ch5', '#trace'] },
        { id: 'tiger', mode: 'mod', who: 'You · today',
          q: 'Assess whether the Celtic Tiger has made Ireland a better place for young people.',
          side: 'Choose your side.',
          counter: 'If you argue yes: housing crisis, dependence on US companies, the 2008 crash and emigration. If you argue no: jobs, openness, the end of mass emigration, a more tolerant society.',
          speech: 'a student conference in Dublin on “Ireland 2050”',
          article: 'an opinion piece for a student newspaper',
          know: '', ev: ['#ch3', '#ch6', '#identity'] },
        { id: 'diaspora', mode: 'mod', who: 'You · today',
          q: 'Assess whether people like Mike in Boston can rightly call themselves Irish.',
          side: 'Choose your side.',
          counter: 'If you argue yes: they have never lived there and know a cartoon version of Ireland. If you argue no: the Famine forced their families out; they kept the culture alive and helped to bring peace.',
          speech: 'a St Patrick\'s Day event for exchange students in Dublin',
          article: 'a column for an Irish-American website',
          know: '', ev: ['#ch3', '#identity'] }
    ];
    const EV_NAMES = { '#ch1': 'Ch. 1', '#ch2': 'Ch. 2', '#ch3': 'Ch. 3', '#ch4': 'Ch. 4', '#ch5': 'Ch. 5', '#ch6': 'Ch. 6', '#trace': 'Trace it back', '#identity': 'Identities' };
    const CHECKS = {
        speech: [
            'Greet and address your audience directly',
            'Open with a hook: a moment from the story, a striking number, a question',
            'State your verdict early and clearly',
            'Two or three arguments, each backed up with evidence (dates, numbers, moments)',
            'Take up the other side\'s strongest point – concede, then refute',
            'Use at least three rhetorical devices (rhetorical question, tricolon, anaphora, inclusive “we”, contrast)',
            'Signpost your structure (“First of all …”, “But there is more …”, “Finally …”)',
            'End with a call to action or a memorable image, and thank your audience'],
        article: [
            'Headline (and subheading) that makes people want to read on',
            'Lead paragraph with a hook and your verdict',
            'Paragraphs with clear topic sentences',
            'Arguments backed up with evidence: facts, numbers, a quote',
            'One paragraph that takes on the other side – concede, then refute',
            'Semi-formal, lively register; address the readers directly now and then',
            'Conclusion with a clear judgement and an outlook',
            'Byline: your name – or your historical person\'s']
    };
    const HIST_CHECK = 'Stay in character and in your time: no knowledge after your date';
    const PLAN_LABELS = { verdict: 'Verdict', hook: 'Hook', a1: 'Argument 1', a2: 'Argument 2', counter: 'Other side', refute: 'Refutation', ending: 'Ending' };

    function initWrite() {
        const grid = $('#task-grid'); if (!grid) return;
        let mode = store.get('mode', 'hist'), form = store.get('form', 'speech'), task = store.get('task', null);
        const checks = store.get('checks', {});
        function currentTask() { return TASKS.find(t => t.id === task) || null; }
        function renderModes() {
            $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
            $$('[data-form]').forEach(b => b.setAttribute('aria-pressed', b.dataset.form === form));
        }
        function renderTasks() {
            grid.innerHTML = '';
            TASKS.filter(t => t.mode === mode).forEach(t => {
                const b = el('button', { type: 'button', class: 'task-card ' + t.mode, 'aria-pressed': t.id === task },
                    `<span class="who">${t.who}</span><b>${t.q}</b><span>${t.side}</span>`);
                b.addEventListener('click', () => { task = t.id; store.set('task', task); renderTasks(); renderBrief(); });
                grid.appendChild(b);
            });
        }
        function renderBrief() {
            const t = currentTask(), box = $('#brief');
            if (!t || t.mode !== mode) { box.innerHTML = '<p class="muted">Choose a task above.</p>'; renderChecklist(); return; }
            box.innerHTML = `<div class="brief">
                <h4>${form === 'speech' ? '🎤 Speech' : '📰 Article'}: ${t.q}</h4>
                <p><b>Voice:</b> ${t.mode === 'hist' ? t.who.split(' · ')[0] + ' (' + t.who.split(' · ').slice(1).join(', ') + ')' : 'you, today'}</p>
                <p><b>${form === 'speech' ? 'Audience' : 'Published in'}:</b> ${form === 'speech' ? t.speech : t.article}</p>
                <p><b>Your position:</b> ${t.side}</p>
                <p><b>Take on the other side:</b> ${t.counter}</p>
                ${t.know ? `<p><b>Careful:</b> ${t.know}</p>` : ''}
                <p><b>Evidence:</b> ${t.ev.map(h => `<a href="${h}">${EV_NAMES[h]}</a>`).join(' · ')} · your ⭐ locker</p></div>`;
            renderChecklist();
        }
        function renderChecklist() {
            const t = currentTask();
            const list = CHECKS[form].concat(t && t.mode === 'hist' && t.mode === mode ? [HIST_CHECK] : []);
            $('#check-title').textContent = form;
            const ul = $('#checklist'); ul.innerHTML = '';
            list.forEach(txt => {
                const key = form + ':' + txt;
                const li = el('li');
                const lab = el('label');
                const cb = el('input', { type: 'checkbox' }); cb.checked = !!checks[key];
                cb.addEventListener('change', () => { checks[key] = cb.checked; store.set('checks', checks); });
                lab.appendChild(cb); lab.appendChild(document.createTextNode(txt));
                li.appendChild(lab); ul.appendChild(li);
            });
        }
        $$('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; store.set('mode', mode); renderModes(); renderTasks(); renderBrief(); }));
        $$('[data-form]').forEach(b => b.addEventListener('click', () => { form = b.dataset.form; store.set('form', form); renderModes(); renderBrief(); }));

        // Planungsfelder und Entwurf
        $$('[data-plan]').forEach(ta => {
            ta.value = store.get('plan:' + ta.dataset.plan, '');
            ta.addEventListener('input', () => { store.set('plan:' + ta.dataset.plan, ta.value); if (ta.id === 'draft') wc(); });
        });
        function wc() {
            const n = ($('#draft').value.match(/[A-Za-zÀ-ÿ0-9’'-]+/g) || []).length;
            $('#wc').textContent = n;
            $('#wc-hint').textContent = n === 0 ? '' : n < 300 ? '– keep going (aim for about 400)' : n <= 500 ? '– good length 👍' : '– quite long: can you cut the weakest part?';
        }
        wc();

        function exportText() {
            const t = currentTask();
            const lines = ['IRELAND – WRITING TASK', ''];
            if (t) {
                lines.push('Text type: ' + form, 'Task: ' + t.q, 'Voice: ' + (t.mode === 'hist' ? t.who : 'modern, ' + (form === 'speech' ? t.speech : t.article).replace(/<[^>]+>/g, '')), '');
            }
            lines.push('PLAN');
            Object.keys(PLAN_LABELS).forEach(k => lines.push(PLAN_LABELS[k] + ': ' + (store.get('plan:' + k, '') || '–')));
            if (locker.length) { lines.push('', 'EVIDENCE LOCKER'); locker.forEach(i => lines.push('* ' + i.text)); }
            lines.push('', 'TEXT (' + $('#wc').textContent + ' words)', '', store.get('plan:draft', ''));
            return lines.join('\n');
        }
        const msg = $('#copy-msg');
        $('#copy-all').addEventListener('click', () => {
            const txt = exportText();
            const done = () => { msg.textContent = 'Copied ✓'; setTimeout(() => { msg.textContent = ''; }, 2500); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { msg.textContent = 'Copying failed – use “Save as .txt”.'; });
            else msg.textContent = 'Copying not supported – use “Save as .txt”.';
        });
        $('#save-txt').addEventListener('click', () => {
            const blob = new Blob([exportText()], { type: 'text/plain;charset=utf-8' });
            const a = el('a', { href: URL.createObjectURL(blob), download: 'ireland-' + (form) + '.txt' });
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
        $('#clear-all').addEventListener('click', () => {
            if (!window.confirm('Delete your progress, locker, plan and text on this page? This cannot be undone.')) return;
            store.clear(); location.reload();
        });

        renderModes(); renderTasks(); renderBrief();
    }

    /* ---------------- Start ---------------- */
    function init() {
        initProgress(); initLocker(); initMaps(); initMyths(); initOgham(); initLand(); initPop(); initTreaty();
        initGfa(); initRoad(); initTimers(); initChains(); initSprint(); initPersonas(); initWrite();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
