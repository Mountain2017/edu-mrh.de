/* ==================================================================
   US Midterms 2026 – page logic (englisch/13/us-midterms/)
   Alles bleibt im Browser (localStorage, Präfix 'usMid26:').

   Bausteine:
   - Fortschritt (Stationen abhaken)        [data-done], .stop[data-stop]
   - Zähler „night in numbers“               [data-count]
   - Halbkreis-Sitzverteilung                 SEATS, #hemi-house/#hemi-senate
   - Checks & Balances                        CHECKS, #cb-svg
   - Wahl-Uhr                                 CLOCK, #clock-grid
   - Myth or fact / Who said it / Who decides MYTHS, QUOTES, SORT
   - Midterm-Geschichte                       HISTORY (American Presidency Project)
   - Umfragebalken                            POLL (AP Voter Poll)
   - Erklärungen ranken                       EXPLAIN
   - Headline-Labor                           HEADLINES
   - Notizen                                  [data-note]

   Stand der Zahlen: 9.11.2026. Bei späteren Aktualisierungen SEATS
   (after) und die letzte Zeile von HISTORY anpassen.
   ================================================================== */
(function () {
    'use strict';

    const KEY = 'usMid26:';
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
    const svgEl = (tag, attrs) => {
        const e = document.createElementNS(SVGNS, tag);
        Object.keys(attrs || {}).forEach(k => e.setAttribute(k, attrs[k]));
        return e;
    };
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COL = { D: '#2563eb', R: '#dc2626', O: '#9ca3af' };

    /* ---------------- Fortschritt ---------------- */
    function initProgress() {
        const done = store.get('done', {});
        function render() {
            $$('.stop[data-stop]').forEach(s => s.classList.toggle('done', !!done[s.dataset.stop]));
            $$('[data-done]').forEach(b => {
                const on = !!done[b.dataset.done];
                b.setAttribute('aria-pressed', on);
                b.textContent = (on ? '☑ ' : '☐ ') + b.textContent.replace(/^[☐☑]\s*/, '');
            });
        }
        $$('[data-done]').forEach(b => b.addEventListener('click', () => {
            done[b.dataset.done] = !done[b.dataset.done];
            store.set('done', done);
            render();
        }));
        render();
    }

    /* ---------------- Zähler ---------------- */
    function initCounters() {
        const nums = $$('[data-count]');
        if (reduceMotion || !('IntersectionObserver' in window)) return;
        nums.forEach(n => { n.textContent = '0' + (n.dataset.suffix || ''); });
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                io.unobserve(en.target);
                const t = en.target, end = +t.dataset.count, suf = t.dataset.suffix || '';
                const t0 = performance.now(), dur = 1200;
                (function step(now) {
                    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
                    t.textContent = Math.round(end * e) + suf;
                    if (p < 1) requestAnimationFrame(step);
                })(t0);
            });
        }, { threshold: 0.4 });
        nums.forEach(n => io.observe(n));
    }

    /* ---------------- Halbkreise ---------------- */
    // before = 119. Kongress zu Beginn (AP: House 220–215, Senate 53–47 inkl. 2 Unabhängige bei den Demokraten)
    // after  = Projektion CBS News 9.11.2026: House ≈256 D; Senate ≥54 D, Alaska + Mississippi offen
    const SEATS = {
        before: { house: { D: 215, O: 0, R: 220 }, senate: { D: 47, O: 0, R: 53 } },
        after:  { house: { D: 256, O: 0, R: 179 }, senate: { D: 54, O: 2, R: 44 } }
    };
    const VERDICT = {
        before: '<strong>2025–26: Republican trifecta.</strong> President, House and Senate are all Republican. Bills Trump wants can pass, provided the narrow House majority holds together.',
        after: '<strong>From 3 January 2027: divided government.</strong> Democrats control both chambers, while Trump stays President until January 2029. Expect vetoes, investigations, budget fights, and compromise or gridlock.'
    };

    function hemicycle(svg, n, rows, rIn, rOut) {
        const cx = 100, cy = 100, radii = [];
        for (let i = 0; i < rows; i++) radii.push(rIn + (rOut - rIn) * i / (rows - 1));
        const sum = radii.reduce((a, b) => a + b, 0);
        const per = radii.map(r => Math.round(n * r / sum));
        per[rows - 1] += n - per.reduce((a, b) => a + b, 0);
        const seats = [];
        radii.forEach((r, i) => {
            const k = per[i];
            for (let j = 0; j < k; j++) {
                const a = Math.PI - Math.PI * (k === 1 ? 0.5 : j / (k - 1));
                seats.push({ a, r, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
            }
        });
        seats.sort((p, q) => (q.a - p.a) || (p.r - q.r));
        const dot = n > 200 ? 1.75 : 3.6;
        return seats.map((s, i) => {
            const c = svgEl('circle', { cx: s.x.toFixed(2), cy: s.y.toFixed(2), r: dot, fill: '#e2e8f0' });
            c.style.transitionDelay = reduceMotion ? '0s' : (i / n * 0.9).toFixed(3) + 's';
            svg.appendChild(c);
            return c;
        });
    }
    function paint(dots, s) {
        dots.forEach((d, i) => d.setAttribute('fill', i < s.D ? COL.D : (i < s.D + s.O ? COL.O : COL.R)));
    }
    function tally(box, s, est) {
        const pre = est ? '≈ ' : '';
        box.innerHTML = '<span class="party-d">D ' + pre + s.D + '</span>' +
            (s.O ? '<span class="o">' + s.O + ' not yet called</span>' : '') +
            '<span class="party-r">R ' + pre + s.R + '</span>';
    }
    function initHemicycles() {
        const hs = $('#hemi-house'), ss = $('#hemi-senate');
        if (!hs || !ss) return;
        const hd = hemicycle(hs, 435, 10, 38, 96);
        const sd = hemicycle(ss, 100, 5, 48, 94);
        [hs, ss].forEach(svg => svg.appendChild(svgEl('line', { x1: 100, y1: 2, x2: 100, y2: 104, stroke: '#1f2a44', 'stroke-width': .6, 'stroke-dasharray': '2 2' })));
        function show(which) {
            const s = SEATS[which];
            paint(hd, s.house); paint(sd, s.senate);
            tally($('#tally-house'), s.house, which === 'after');
            tally($('#tally-senate'), s.senate, false);
            $('#verdict').innerHTML = VERDICT[which];
            $$('[data-congress]').forEach(b => b.setAttribute('aria-pressed', b.dataset.congress === which));
        }
        $$('[data-congress]').forEach(b => b.addEventListener('click', () => show(b.dataset.congress)));
        show('before');
    }

    /* ---------------- Checks & Balances ---------------- */
    const PATHS = {
        p2c: { d: 'M350,48 Q300,2 252,48', lx: 300, ly: 14, label: 'veto' },
        c2p: { d: 'M252,108 Q300,156 348,108', lx: 300, ly: 150, label: 'override · purse · oversight · impeach' },
        p2j: { d: 'M470,130 Q478,222 418,284', lx: 488, ly: 212, label: 'nominate' },
        c2j: { d: 'M130,130 Q122,222 182,284', lx: 96, ly: 212, label: 'confirm' },
        j2c: { d: 'M184,336 Q40,350 60,132', lx: 40, ly: 300, label: 'review' },
        j2p: { d: 'M416,336 Q560,350 540,132', lx: 560, ly: 300, label: 'review' }
    };
    const CHECKS = [
        { id: 'veto', label: 'Veto', path: 'p2c', who: 'President → Congress',
          text: 'The President can <strong>veto</strong> (reject) a bill passed by Congress.',
          before: 'Hardly needed: a Republican Congress sent Trump the bills he wanted.',
          after: 'Trump has said he will use his veto to block the Democrats\' agenda.' },
        { id: 'override', label: 'Override', path: 'c2p', who: 'Congress → President',
          text: 'Congress can <strong>override a veto</strong> with a two-thirds majority in <em>both</em> chambers (290 of 435, 67 of 100).',
          before: 'Not relevant: no vetoes against his own party.',
          after: 'Democrats have a majority, but nowhere near two thirds. Bills Trump opposes will die unless some Republicans join. Expect gridlock or compromise.' },
        { id: 'purse', label: 'Power of the purse', path: 'c2p', who: 'Congress → President',
          text: 'All federal spending must be approved by Congress. Budget bills start in the House.',
          before: 'A Republican Congress passed Trump\'s big tax-and-spending law.',
          after: 'Democrats now write the budget. Fights over spending and the debt ceiling are expected, with possible government shutdowns.' },
        { id: 'oversight', label: 'Oversight', path: 'c2p', who: 'Congress → President',
          text: 'Committees can hold <strong>hearings</strong> and <strong>subpoena</strong> (legally demand) documents and witnesses.',
          before: 'Republican committee chairs rarely investigated their own President.',
          after: 'Chairs come from the majority. The incoming Oversight chair Robert Garcia has announced investigations; Senator Elizabeth Warren: "you better get ready for some investigations, serious ones."' },
        { id: 'impeach', label: 'Impeachment', path: 'c2p', who: 'House + Senate → President',
          text: 'The House can <strong>impeach</strong> (formally charge) the President by simple majority. The Senate holds the trial; <strong>removal needs two thirds</strong> of senators.',
          before: 'Impossible with a Republican House.',
          after: 'Possible in the House, but removal would need 67 senators. Trump was impeached twice in his first term (2019, 2021) and acquitted both times. Centrist Democrats warn against "going too far".' },
        { id: 'nominate', label: 'Nominate judges', path: 'p2j', who: 'President → Court',
          text: 'The President <strong>nominates</strong> Supreme Court justices and federal judges, as well as cabinet members and ambassadors.',
          before: 'Nominees sailed through a Republican Senate.',
          after: 'He still nominates, but now needs a Democratic Senate to agree.' },
        { id: 'confirm', label: 'Confirm', path: 'c2j', who: 'Senate → Court / Executive',
          text: 'The <strong>Senate</strong> (not the House!) must <strong>confirm</strong> those nominees by simple majority.',
          before: 'A Republican majority confirmed Trump\'s picks.',
          after: 'A Democratic Senate can slow down or block judges, cabinet members and ambassadors.' },
        { id: 'review', label: 'Judicial review (laws)', path: 'j2c', who: 'Court → Congress',
          text: 'The Supreme Court can declare laws <strong>unconstitutional</strong>. This power goes back to <em>Marbury v. Madison</em> (1803).',
          before: 'Same in both periods: the Court is independent. Six of the nine justices were appointed by Republican presidents.',
          after: 'Unchanged: midterms do not touch the Court directly.' },
        { id: 'review2', label: 'Judicial review (President)', path: 'j2p', who: 'Court → President',
          text: 'The Court can rule that actions of the President are <strong>unlawful</strong>.',
          before: 'Real example: in February 2026 the Supreme Court struck down Trump\'s emergency tariffs. The administration re-imposed many of them under other laws.',
          after: 'Unchanged: the Court remains a check whatever Congress looks like.' }
    ];
    function initChecks() {
        const g = $('#cb-paths'); if (!g) return;
        const pathEls = {};
        Object.keys(PATHS).forEach(k => {
            const p = PATHS[k];
            const pe = svgEl('path', { d: p.d, class: 'path', 'marker-end': 'url(#arr-off)' });
            g.appendChild(pe);
            const t = svgEl('text', { x: p.lx, y: p.ly, 'text-anchor': 'middle', 'font-size': 12, fill: '#64748b', 'font-weight': 600 });
            t.textContent = p.label;
            g.appendChild(t);
            pathEls[k] = { pe, t };
        });
        let era = 'before', cur = null;
        const btns = $('#cb-btns');
        CHECKS.forEach(c => {
            const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false' }, c.label);
            b.addEventListener('click', () => { cur = c; render(); });
            c.btn = b; btns.appendChild(b);
        });
        function render() {
            const after = era === 'after';
            ['house', 'senate'].forEach(ch => {
                $('#cb-' + ch).setAttribute('fill', after ? COL.D : COL.R);
                $('#cb-' + ch + '-t').textContent = (after ? 'D' : 'R') + ' majority';
            });
            Object.keys(pathEls).forEach(k => {
                const on = cur && cur.path === k;
                pathEls[k].pe.classList.toggle('on', !!on);
                pathEls[k].pe.setAttribute('marker-end', on ? 'url(#arr)' : 'url(#arr-off)');
                pathEls[k].t.setAttribute('fill', on ? '#a16207' : '#64748b');
            });
            CHECKS.forEach(c => c.btn.setAttribute('aria-pressed', c === cur));
            $$('[data-cbera]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cbera === era));
            if (!cur) return;
            $('#cb-panel').innerHTML = '<div class="who">' + cur.who + '</div><h4>' + cur.label + '</h4><p>' + cur.text + '</p>' +
                '<div class="now"><b>' + (after ? 'From 2027 (divided government): ' : '2025–26 (trifecta): ') + '</b>' + (after ? cur.after : cur.before) + '</div>';
        }
        $$('[data-cbera]').forEach(b => b.addEventListener('click', () => { era = b.dataset.cbera; render(); }));
        render();
    }

    /* ---------------- Wahl-Uhr ---------------- */
    const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const CLOCK = [
        { lbl: 'President', sub: '4-year term', terms: [[2024, 2028, 'Trump'], [2028, 2032, 'open race']] },
        { lbl: 'House', sub: 'all 435 · 2 yrs', terms: [[2024, 2026, ''], [2026, 2028, ''], [2028, 2030, ''], [2030, 2032, '']] },
        { lbl: 'Senate I', sub: '⅓ · 6 yrs', terms: [[2024, 2030, 'elected 2024'], [2030, 2036, '']] },
        { lbl: 'Senate II', sub: '⅓ · 6 yrs', terms: [[2020, 2026, 'elected 2020'], [2026, 2032, 'elected 2026']] },
        { lbl: 'Senate III', sub: '⅓ · 6 yrs', terms: [[2022, 2028, 'elected 2022'], [2028, 2034, '']] },
        { lbl: 'Governors', sub: '36 states', terms: [[2022, 2026, ''], [2026, 2030, ''], [2030, 2034, '']] }
    ];
    const CLOCK_TXT = {
        2024: '<h4>2024 · Presidential election</h4>President, all 435 House seats and 34 Senate seats. <strong>Result:</strong> Trump returns to the White House, and Republicans win both chambers: a trifecta.',
        2026: '<h4>2026 · Midterm election</h4>All 435 House seats, 35 Senate seats (class II plus two special elections in Ohio and Florida) and 36 governors, but <strong>no President</strong>. <strong>Result:</strong> Democrats win both chambers. Trump stays in office.',
        2028: '<h4>2028 · Presidential election</h4>An open race: Trump cannot run again, because the 22nd Amendment allows only two terms. Also on the ballot: all House seats and Senate class III.',
        2030: '<h4>2030 · Next midterm</h4>House, Senate class I and 36 governors. The pattern from stop 2 suggests the new President\'s party should be worried.'
    };
    function initClock() {
        const grid = $('#clock-grid'); if (!grid) return;
        grid.appendChild(el('div'));
        const yrCells = YEARS.map(y => { const c = el('div', { class: 'yr' }, String(y)); grid.appendChild(c); return c; });
        const bars = [];
        CLOCK.forEach((row, ri) => {
            const lbl = el('div', { class: 'lbl' }, row.lbl + '<small>' + row.sub + '</small>');
            lbl.style.gridRow = String(ri + 2); lbl.style.gridColumn = '1';
            grid.appendChild(lbl);
            row.terms.forEach(t => {
                const from = Math.max(t[0], 2024), to = Math.min(t[1], 2031);
                if (from > 2030) return;
                const b = el('div', { class: 'tbar' }, t[2]);
                b.style.gridRow = String(ri + 2);
                b.style.gridColumn = (from - 2024 + 2) + ' / ' + (to - 2024 + 2);
                if (t[0] < 2024) b.style.borderRadius = '0 13px 13px 0';
                if (t[1] > 2031) b.style.borderRadius = '13px 0 0 13px';
                grid.appendChild(b);
                bars.push({ b, start: t[0] });
            });
        });
        let timer = null;
        function sel(y) {
            yrCells.forEach((c, i) => c.classList.toggle('sel', YEARS[i] === y));
            bars.forEach(o => o.b.classList.toggle('up', o.start === y));
            $$('[data-year]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.year === y));
            $('#clock-out').innerHTML = CLOCK_TXT[y];
        }
        $$('[data-year]').forEach(b => b.addEventListener('click', () => { stop(); sel(+b.dataset.year); }));
        function stop() { if (timer) { clearInterval(timer); timer = null; $('#clock-play').textContent = '▶ play'; } }
        $('#clock-play').addEventListener('click', () => {
            if (timer) { stop(); return; }
            const seq = [2024, 2026, 2028, 2030]; let i = 0;
            sel(seq[0]); $('#clock-play').textContent = '⏸ stop';
            timer = setInterval(() => { i++; if (i >= seq.length) { stop(); return; } sel(seq[i]); }, 2600);
        });
        sel(2026);
    }

    /* ---------------- Quiz-Karten (generisch) ---------------- */
    function quiz(containerSel, items, scoreSel, storeKey, render) {
        const box = $(containerSel); if (!box) return;
        const saved = store.get(storeKey, {});
        function score() {
            const answered = items.filter(it => saved[it.id] !== undefined);
            const right = answered.filter(it => saved[it.id] === it.answer).length;
            $(scoreSel).textContent = answered.length ? '· ' + right + ' / ' + items.length + ' right' : '';
        }
        items.forEach(it => {
            const card = el('div', { class: 'qcard' });
            card.innerHTML = render(it) + '<div class="qbtns"></div><div class="qfb">' + it.fb + '</div>';
            const bb = $('.qbtns', card);
            it.options.forEach(opt => {
                const b = el('button', { type: 'button' }, opt);
                b.addEventListener('click', () => { saved[it.id] = opt; store.set(storeKey, saved); show(); score(); });
                bb.appendChild(b);
            });
            function show() {
                const a = saved[it.id];
                if (a === undefined) return;
                card.classList.add('answered');
                $$('button', bb).forEach(b => {
                    b.classList.toggle('right', b.textContent === it.answer);
                    b.classList.toggle('wrong', b.textContent === a && a !== it.answer);
                });
            }
            show();
            box.appendChild(card);
        });
        score();
    }

    const MYTHS = [
        { id: 'm1', q: 'In the midterms, Americans vote for or against the President.', answer: 'Myth',
          fb: 'The President is not on the ballot. Many voters <em>use</em> the midterms as a verdict on him, though. Trump himself said: "I was not on the ballot."' },
        { id: 'm2', q: 'The whole Senate is elected again in the midterms.', answer: 'Myth',
          fb: 'Senators serve 6 years, and only about a third of them are elected every two years. In 2026: 35 of 100 seats.' },
        { id: 'm3', q: 'Every state has two senators, no matter how many people live there.', answer: 'Fact',
          fb: 'Wyoming (about 0.6 million people) and California (about 39 million) both have two senators. In the House, seats depend on population.' },
        { id: 'm4', q: 'The candidate with the most votes nationwide always becomes President.', answer: 'Myth',
          fb: 'The Electoral College decides. In 2000 and 2016 the winner lost the national popular vote.' },
        { id: 'm5', q: 'The President can dissolve Congress and call early elections, like a Prime Minister in the UK.', answer: 'Myth',
          fb: 'US election dates are fixed: the Tuesday after the first Monday in November. Nobody can call an early election.' },
        { id: 'm6', q: 'Now that Democrats control Congress, they can pass any law they want.', answer: 'Myth',
          fb: 'Trump can veto bills, and an override needs two thirds in both chambers. In the Senate, most bills also need 60 votes to get past a filibuster.' },
        { id: 'm7', q: 'If the House impeaches the President, he loses his job.', answer: 'Myth',
          fb: 'Impeachment is only the charge. The Senate holds the trial, and removal needs two thirds. Trump was impeached twice (2019, 2021) and stayed in office.' },
        { id: 'm8', q: 'Members of the House are elected every two years, so they are practically always campaigning.', answer: 'Fact',
          fb: 'A two-year term means the next campaign starts almost as soon as you arrive in Washington.' },
        { id: 'm9', q: 'Supreme Court justices are elected by the people.', answer: 'Myth',
          fb: 'They are nominated by the President, confirmed by the Senate, and serve for life.' },
        { id: 'm10', q: 'Midterms are only about Congress.', answer: 'Myth',
          fb: 'In 2026, 36 states also elected governors, plus state parliaments, judges, mayors and many referendums.' }
    ];

    const QUOTES = [
        { id: 'q1', q: '"I was not on the ballot."', options: ['Donald Trump', 'JD Vance', 'Mike Johnson'], answer: 'Donald Trump',
          fb: 'Trump on <em>60 Minutes</em> (8 Nov), explaining the losses. A classic midterm argument: blame the absence of the leader, not the leader.' },
        { id: 'q2', q: '"The reason we lost is the war."', options: ['Hakeem Jeffries', 'JD Vance', 'Ron DeSantis'], answer: 'JD Vance',
          fb: 'The Vice President on X, about the Iran war. Trump replied that the war was necessary. A rift inside the government.' },
        { id: 'q3', q: '"This was a rejection of Republicans in Washington, and Democrats just happened to be the beneficiary."', options: ['Chuck Schumer', 'Ron DeSantis', 'Friedrich Merz'], answer: 'Ron DeSantis',
          fb: 'Florida\'s Republican governor: the voters were against Washington Republicans, not for Democrats. Compare with the "thermostat" idea from stop 2.' },
        { id: 'q4', q: '"The country clearly has had enough, and we\'ve got to fight for an affordable America."', options: ['Donald Trump', 'Hakeem Jeffries', 'Dan Eberhart'], answer: 'Hakeem Jeffries',
          fb: 'The Democratic House leader, who is running to become Speaker (ABC, 8 Nov). Note the frame: "affordable", i.e. prices.' },
        { id: 'q5', q: '"Look, first and foremost, this is a Trump loss."', options: ['Ken Martin, Democratic Party chair', 'Dan Eberhart, Republican donor', 'Christel Schaldemose, EU Parliament'], answer: 'Dan Eberhart, Republican donor',
          fb: 'An oil CEO and Republican donor, speaking to Fox News. Criticism from your own side often carries more weight.' },
        { id: 'q6', q: '"Trump has, for the past two years, largely governed without consulting Congress. Why should things be any different now?"', options: ['Boris Pistorius', 'Friedrich Merz', 'Jonas Gahr Støre'], answer: 'Friedrich Merz',
          fb: 'The German Chancellor doubts that a new Congress changes much. Check this against stop 1: which checks really bind the President?' },
        { id: 'q7', q: 'Warned of a "one-and-done kind of blue wave" if Democrats don\'t focus on helping people.', options: ['Adam Hamilton, Democratic senator-elect', 'Erick Erickson, conservative commentator', 'Donald Trump'], answer: 'Adam Hamilton, Democratic senator-elect',
          fb: 'Kansas\'s new Democratic senator, warning his <em>own</em> party not to overreach.' }
    ];

    const SORT = [
        { id: 's1', q: 'Approve the money for US aid to Ukraine in the budget', answer: 'Congress',
          fb: 'Power of the purse. But the President can delay paying out, as the White House did with money already approved.' },
        { id: 's2', q: 'Put new tariffs on EU goods under existing trade laws', answer: 'President',
          fb: 'Older laws gave the President these powers. To take them back, Congress needs a law, and Trump can veto it.' },
        { id: 's3', q: 'Ratify a treaty with another country', answer: 'Congress',
          fb: 'The Senate must approve treaties with a two-thirds majority.' },
        { id: 's4', q: 'Declare the President\'s emergency tariffs unlawful', answer: 'Supreme Court',
          fb: 'This happened in February 2026. The administration then re-imposed many tariffs under other laws.' },
        { id: 's5', q: 'Confirm a new US ambassador to Ireland', answer: 'Congress',
          fb: 'The President nominates, the Senate confirms. From 2027 a Democratic Senate can slow down or block nominees.' },
        { id: 's6', q: 'Order a military strike abroad', answer: 'President',
          fb: 'As commander in chief the President can act first. Formally only Congress can declare war, and it can vote to bring troops home, but the President can veto that.' },
        { id: 's7', q: 'Hold public hearings on US troops in Europe', answer: 'Congress',
          fb: 'Oversight: committees (now with Democratic chairs) decide what gets investigated.' },
        { id: 's8', q: 'Negotiate a trade deal with the EU', answer: 'President',
          fb: 'The President\'s trade representative negotiates. Congress only has to act if US law must change.' }
    ];
    SORT.forEach(s => { s.options = ['Congress', 'President', 'Supreme Court']; });
    MYTHS.forEach(m => { m.options = ['Myth', 'Fact']; });

    /* ---------------- Geschichte ---------------- */
    // House-Sitzveränderung der Präsidentenpartei, American Presidency Project (UCSB), Stand 13.7.2026
    const HISTORY = [
        [1934, 'Roosevelt', 'D', 9, 'The New Deal pays off', 'In the middle of the Great Depression voters reward Roosevelt\'s New Deal programmes. It is the first of only three midterm gains since.'],
        [1938, 'Roosevelt', 'D', -72, 'Even FDR gets punished', 'A new recession and Roosevelt\'s plan to "pack" the Supreme Court with extra judges cost his party dearly.'],
        [1942, 'Roosevelt', 'D', -45, 'Wartime vote', 'The first midterm after Pearl Harbor. Millions of young men are away at war, and turnout collapses.'],
        [1946, 'Truman', 'D', -56, '"Had enough?"', 'Post-war inflation and strikes. The Republican slogan "Had enough?" works: both chambers flip.'],
        [1950, 'Truman', 'D', -28, 'Korea and the Red Scare', 'The Korean War goes badly, and fear of communism dominates the campaign.'],
        [1954, 'Eisenhower', 'R', -18, 'Start of an era', 'Democrats win the House and keep it for the next 40 years.'],
        [1958, 'Eisenhower', 'R', -48, 'Recession', 'An economic downturn produces a big Democratic win.'],
        [1962, 'Kennedy', 'D', -4, 'Cuban Missile Crisis', 'Weeks before election day, Kennedy\'s handling of the crisis softens the usual losses.'],
        [1966, 'Johnson', 'D', -47, 'Vietnam', 'The escalating Vietnam War and unrest in American cities hurt Johnson\'s party.'],
        [1970, 'Nixon', 'R', -12, 'The "silent majority"', 'Despite Vietnam protests, Nixon\'s appeal to the "silent majority" keeps losses small.'],
        [1974, 'Ford', 'R', -48, 'Watergate', 'Nixon resigned in August. Voters elect the "Watergate babies", a wave of young reform Democrats. 2026 is often compared to this year.'],
        [1978, 'Carter', 'D', -15, 'Inflation', 'Rising prices make Carter\'s party lose ground.'],
        [1982, 'Reagan', 'R', -26, 'Recession', 'Unemployment above 10% costs Reagan\'s Republicans 26 seats.'],
        [1986, 'Reagan', 'R', -5, 'Small House loss, big Senate loss', 'Only 5 House seats lost, but the Democrats win back the Senate.'],
        [1990, 'Bush Sr.', 'R', -8, '"Read my lips"', 'Bush had promised "no new taxes", then agreed to a tax increase.'],
        [1994, 'Clinton', 'D', -54, 'The Republican Revolution', 'Newt Gingrich\'s "Contract with America" wins Republicans the House for the first time in 40 years. Both chambers flip.'],
        [1998, 'Clinton', 'D', 4, 'The impeachment backfire', 'Republicans campaign on the Clinton–Lewinsky scandal and push impeachment. Voters punish them, and Speaker Gingrich resigns days later.'],
        [2002, 'Bush Jr.', 'R', 8, 'After 9/11', 'One year after the attacks the country rallies around the President, and his party gains seats.'],
        [2006, 'Bush Jr.', 'R', -30, 'Iraq', 'The unpopular Iraq War flips both chambers. Nancy Pelosi becomes the first woman Speaker of the House.'],
        [2010, 'Obama', 'D', -63, 'The "shellacking"', 'The Tea Party movement fights Obamacare and government spending. It is the biggest loss since 1938; Obama himself calls it a "shellacking".'],
        [2014, 'Obama', 'D', -13, 'Senate lost too', 'Republicans add the Senate to the House.'],
        [2018, 'Trump', 'R', -41, 'Blue wave I', 'The highest midterm turnout in a century and a record number of women elected. The new Democratic House impeaches Trump a year later.'],
        [2022, 'Biden', 'D', -9, 'The red wave that never came', 'Everyone predicted a Republican landslide. But after the Supreme Court ended the constitutional right to abortion (Dobbs, June 2022), many voters mobilised, and several Trump-backed candidates lost. Republicans win the House only narrowly.'],
        [2026, 'Trump', 'R', -40, 'Blue wave II', 'Prices, tariffs and the Iran war: Democrats win both chambers, even in Texas, Kansas and South Carolina. <em>Preliminary: about 40 seats, as some races are still being counted.</em>', true]
    ];
    function initHistory() {
        const box = $('#hist-rows'); if (!box) return;
        const MIN = -75, MAX = 12, span = MAX - MIN;
        const pct = v => ((v - MIN) / span * 100);
        const done = HISTORY.filter(h => !h[6]);
        const avg = done.reduce((a, h) => a + h[3], 0) / done.length;
        $('#avg-loss').textContent = Math.round(-avg);
        HISTORY.forEach(h => {
            const [y, p, party, v, title, story, prelim] = h;
            const row = el('button', { type: 'button', class: 'hrow', role: 'listitem',
                'aria-label': y + ', ' + p + ' (' + party + '): ' + (v > 0 ? '+' : '') + v + ' seats' + (prelim ? ', preliminary' : '') });
            const z = pct(0), w = Math.abs(pct(v) - z);
            row.innerHTML = '<span class="who"><b>' + y + '</b> ' + p + '</span>' +
                '<span class="htrack"><span class="zero" style="left:' + z + '%"></span>' +
                '<span class="avg" style="left:' + pct(avg) + '%"></span>' +
                '<span class="hbar ' + party + ' ' + (v < 0 ? 'neg' : 'pos') + (prelim ? ' prelim' : '') + '" style="left:' +
                (v < 0 ? pct(v) : z) + '%;width:' + w + '%"></span></span>' +
                '<span class="val">' + (prelim ? '≈' : '') + (v > 0 ? '+' : '') + v + '</span>';
            row.addEventListener('click', () => {
                $$('.hrow', box).forEach(r => r.classList.remove('sel'));
                row.classList.add('sel');
                $('#hstory').innerHTML = '<h4>' + y + ' · ' + title + '</h4><p class="muted" style="margin:0 0 .3rem">' + p +
                    ' (<span class="party-' + party.toLowerCase() + '">' + party + '</span>) · ' + (prelim ? 'about ' : '') +
                    (v > 0 ? '+' : '') + v + ' House seats</p><p style="margin:0">' + story + '</p>';
            });
            box.appendChild(row);
        });
    }

    /* ---------------- Umfrage ---------------- */
    const POLL = [
        ['felt "severe" or "moderate" hardship from inflation', 80, 'about 8 in 10'],
        ['say the economy is "not so good" or "poor"', 75, 'about 3 in 4'],
        ['want Congress to do more to check the President (incl. about 4 in 10 Republicans)', 70, 'about 7 in 10'],
        ['say Trump\'s policies made the economy worse', 67, 'about 2 in 3'],
        ['say tariffs hurt the national economy', 67, 'about 2 in 3'],
        ['disapprove of Trump\'s job performance', 60, 'about 6 in 10'],
        ['named the economy as the most important issue', 40, 'about 4 in 10'],
        ['voted to express opposition to Trump', 40, 'about 4 in 10'],
        ['named "the state of democracy" as the most important issue', 30, 'about 3 in 10'],
        ['voted to express support for Trump', 20, 'about 2 in 10']
    ];
    function initPoll() {
        const box = $('#poll'); if (!box) return;
        const bars = [];
        POLL.forEach(p => {
            const r = el('div', { class: 'prow' });
            r.innerHTML = '<span>' + p[0] + '</span><span class="ptrack"><i></i></span><b title="' + p[2] + '">' + p[2].replace('about ', '≈ ') + '</b>';
            box.appendChild(r);
            bars.push([$('i', r), p[1]]);
        });
        const fill = () => bars.forEach(([i, v]) => { i.style.width = v + '%'; });
        if (reduceMotion || !('IntersectionObserver' in window)) { fill(); return; }
        const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { fill(); io.disconnect(); } }, { threshold: .3 });
        io.observe(box);
    }

    /* ---------------- Erklärungen ranken ---------------- */
    const EXPLAIN = {
        econ: ['Prices, prices, prices', 'About 8 in 10 felt hardship from inflation; the economy was the no. 1 issue. Trump had promised to bring prices down.'],
        tariffs: ['Tariffs backfired', 'About 2 in 3 said tariffs hurt the economy. A conservative radio host summed it up: "High prices."'],
        war: ['The Iran war and gas prices', 'VP JD Vance: "The reason we lost is the war." But a conservative analyst points out that only about a third of voters called the war "crucial".'],
        corrupt: ['Corruption and democracy', 'More than half called government corruption "crucial"; about 3 in 10 named the state of democracy as their top issue.'],
        trump: ['Trump himself and his candidates', 'A GOP donor: "this is a Trump loss". About two thirds of Texas voters said Trump\'s Senate pick Ken Paxton lacked the right character.'],
        thermo: ['Just the normal midterm effect', 'The President\'s party loses about 27 House seats on average (stop 2). DeSantis: Democrats "just happened to be the beneficiary".'],
        young: ['Young and Latino voters swung', 'About 7 in 10 under-30s and 6 in 10 Latino voters backed Democrats for the House, a big shift from 2024.'],
        maps: ['Redistricting backfired', 'Republicans redrew district maps mid-decade to gain about nine seats on paper. But spreading their voters thinly made more districts winnable for Democrats in a wave.']
    };
    function initRank() {
        const box = $('#rank'); if (!box) return;
        let order = store.get('rank', Object.keys(EXPLAIN));
        if (order.length !== Object.keys(EXPLAIN).length || order.some(k => !EXPLAIN[k])) order = Object.keys(EXPLAIN);
        function render(focusKey, dir) {
            box.innerHTML = '';
            order.forEach((k, i) => {
                const li = el('li');
                li.innerHTML = '<div><h5>' + EXPLAIN[k][0] + '</h5><p>' + EXPLAIN[k][1] + '</p></div>' +
                    '<div class="mv"><button type="button" aria-label="Move up: ' + EXPLAIN[k][0] + '"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
                    '<button type="button" aria-label="Move down: ' + EXPLAIN[k][0] + '"' + (i === order.length - 1 ? ' disabled' : '') + '>▼</button></div>';
                const [up, down] = $$('button', li);
                up.addEventListener('click', () => move(i, -1, k));
                down.addEventListener('click', () => move(i, 1, k));
                box.appendChild(li);
                if (k === focusKey) { const b = dir < 0 ? up : down; (b.disabled ? (dir < 0 ? down : up) : b).focus(); }
            });
        }
        function move(i, d, k) {
            const j = i + d; if (j < 0 || j >= order.length) return;
            [order[i], order[j]] = [order[j], order[i]];
            store.set('rank', order); render(k, d);
        }
        render();
    }

    /* ---------------- Headline-Labor ---------------- */
    const HEADLINES = [
        ['Fox News', 'Conservatives stunned by \'catastrophic\' midterm blue tsunami, blame Trump\'s Iran war, high gas prices', ['stunned', 'catastrophic', 'tsunami', 'blame']],
        ['Fox News', 'Republicans turn on Trump after devastating midterm losses hand Democrats control of Congress', ['turn', 'on', 'devastating']],
        ['MS NOW', 'Democrats win House and Senate in 2026 midterms, a blow to Trump', ['blow']],
        ['Associated Press', 'How Trump and Republicans lost the 2026 midterm elections, according to AP Voter Poll', []],
        ['Al Jazeera', '\'Seismic shift\': World reacts to US midterm election results', ['seismic', 'shift']],
        ['The American Mind', 'What Happened in the Midterms: A historic defeat for Republicans.', ['historic']],
        ['Rutgers University', 'What Drove the Historic Blue Wave in the 2026 Midterms?', ['historic', 'wave']]
    ];
    function initHeadlines() {
        const box = $('#headlines'); if (!box) return;
        const marks = store.get('marks', {});
        const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
        HEADLINES.forEach((h, hi) => {
            const card = el('div', { class: 'hl' });
            card.innerHTML = '<div class="src">' + h[0] + '</div>';
            const words = el('div', { class: 'words' });
            h[1].split(' ').forEach((w, wi) => {
                const id = hi + '-' + wi;
                const s = el('span', { class: 'w', role: 'button', tabindex: '0', 'aria-pressed': String(!!marks[id]) });
                s.textContent = w;
                if (h[2].indexOf(norm(w)) >= 0) s.dataset.sugg = '1';
                if (marks[id]) s.classList.add('mark');
                const toggle = () => {
                    marks[id] = !marks[id]; store.set('marks', marks);
                    s.classList.toggle('mark', marks[id]); s.setAttribute('aria-pressed', String(marks[id]));
                };
                s.addEventListener('click', toggle);
                s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
                words.appendChild(s); words.appendChild(document.createTextNode(' '));
            });
            card.appendChild(words);
            if (!h[2].length) card.appendChild(el('div', { class: 'muted', hidden: '' }, 'Our suggestion: nothing loaded here. A plain, factual news headline.'));
            box.appendChild(card);
        });
        const btn = $('#hl-compare');
        btn.addEventListener('click', () => {
            const on = btn.dataset.on !== '1';
            btn.dataset.on = on ? '1' : '';
            $$('.hl .w[data-sugg]').forEach(s => s.classList.toggle('sugg', on));
            $$('.hl .muted').forEach(m => { m.hidden = !on; });
            btn.textContent = on ? 'Hide our suggestions' : 'Compare with our suggestions';
        });
    }

    /* ================= PLAY THE MACHINE ================= */
    const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

    /* ---------------- Branch Blitz ---------------- */
    // trap: true = beliebte Falle, wird in der Auswertung hervorgehoben
    const BLITZ = [
        ['Writes and passes federal laws', 'L', 'The core job of Congress (Article I).'],
        ['Approves the federal budget', 'L', 'The "power of the purse": no money without Congress.'],
        ['Declares war', 'L', 'Formally only Congress can do it. The last time was in 1942. Presidents have often used force without a declaration.', true],
        ['Impeaches the President', 'L', 'The House impeaches (charges), the Senate holds the trial.'],
        ['Confirms Supreme Court justices', 'L', 'The Senate confirms by simple majority.'],
        ['Ratifies treaties', 'L', 'The Senate, with two thirds. The President only negotiates and signs.', true],
        ['Sets up the lower federal courts', 'L', 'Article III: Congress creates all courts below the Supreme Court.', true],
        ['Overrides a presidential veto', 'L', 'Two thirds in both chambers.'],
        ['Subpoenas witnesses for an investigation', 'L', 'Congressional committees can legally force people to testify.'],
        ['Commands the armed forces', 'E', 'The President is commander in chief.'],
        ['Vetoes bills', 'E', 'The President\'s main weapon against Congress.'],
        ['Nominates Supreme Court justices', 'E', 'The President nominates, the Senate confirms.', true],
        ['Issues executive orders', 'E', 'Instructions to the government; they must stay within the law.'],
        ['Pardons people convicted of federal crimes', 'E', 'A power of the President alone.'],
        ['Runs agencies such as the FBI and the Pentagon', 'E', 'The executive branch carries out ("executes") the laws.'],
        ['Negotiates treaties with other countries', 'E', 'Negotiating is executive, ratifying is the Senate\'s job.'],
        ['Casts the tie-breaking vote in the Senate', 'E', 'Trap! The Vice President is part of the executive but is also "President of the Senate" and votes when it is 50–50.', true],
        ['Puts tariffs on imports under existing trade laws', 'E', 'Congress passed laws that hand this power to the President.', true],
        ['Declares laws unconstitutional', 'J', 'Judicial review (Marbury v. Madison, 1803).'],
        ['Decides whether an executive order is lawful', 'J', 'Courts check the President, too.'],
        ['Its members serve for life', 'J', 'Federal judges have no term limit: they serve "during good behaviour".'],
        ['Settles legal disputes between two states', 'J', 'One of the few kinds of case that go straight to the Supreme Court.'],
        ['Presides over the Senate trial of an impeached President', 'J', 'Trap! The Chief Justice chairs the trial, but the senators decide.', true],
        ['Interprets what the Constitution means', 'J', 'The Supreme Court has the final word.']
    ];
    const BRANCH = { L: 'Legislative', E: 'Executive', J: 'Judicial' };
    function initBlitz() {
        const card = $('#bz-card'); if (!card) return;
        const btns = $$('.bz'), start = $('#bz-start');
        let deck = [], cur = null, score = 0, streak = 0, left = 60, timer = null, wrong = [];
        const best = store.get('blitzBest', null);
        $('#bz-best').textContent = best === null ? '–' : best;
        function next() {
            if (!deck.length) deck = shuffle(BLITZ);
            cur = deck.pop();
            card.textContent = cur[0];
        }
        function flash(cls) { card.classList.remove('flash-ok', 'flash-no'); void card.offsetWidth; card.classList.add(cls); }
        function answer(b) {
            if (!timer || !cur) return;
            if (b === cur[1]) { score++; streak++; flash('flash-ok'); }
            else { streak = 0; flash('flash-no'); wrong.push(cur); }
            $('#bz-score').textContent = score; $('#bz-streak').textContent = streak;
            next();
        }
        function end() {
            clearInterval(timer); timer = null; cur = null;
            btns.forEach(b => { b.disabled = true; });
            start.disabled = false; start.textContent = '↻ Play again';
            const prev = store.get('blitzBest', null);
            if (prev === null || score > prev) { store.set('blitzBest', score); $('#bz-best').textContent = score; }
            card.innerHTML = '<span>⏱ Time! ' + score + ' correct' + (prev !== null && score > prev ? ' · new best! 🏆' : '') + '</span>';
            const traps = BLITZ.filter(b => b[3]);
            let html = '';
            if (wrong.length) {
                html += '<h4>Your mistakes</h4>' + wrong.map(w => '<div class="rv">' + w[0] + ' → <b>' + BRANCH[w[1]] + '</b>. ' + w[2] + '</div>').join('');
            }
            html += '<h4>The traps in this game</h4>' + traps.map(w => '<div class="rv">' + w[0] + ' → <b>' + BRANCH[w[1]] + '</b>. ' + w[2] + '</div>').join('');
            $('#bz-review').innerHTML = html;
        }
        start.addEventListener('click', () => {
            score = 0; streak = 0; left = 60; wrong = []; deck = shuffle(BLITZ);
            $('#bz-score').textContent = 0; $('#bz-streak').textContent = 0; $('#bz-time').textContent = 60; $('#bz-review').innerHTML = '';
            btns.forEach(b => { b.disabled = false; });
            start.disabled = true;
            timer = setInterval(() => { left--; $('#bz-time').textContent = left; if (left <= 0) end(); }, 1000);
            next();
        });
        btns.forEach(b => b.addEventListener('click', () => answer(b.dataset.branch)));
        document.addEventListener('keydown', e => {
            if (!timer || /input|textarea|select/i.test(e.target.tagName)) return;
            const m = { '1': 'L', '2': 'E', '3': 'J' }[e.key];
            if (m) { e.preventDefault(); answer(m); }
        });
    }

    /* ---------------- Who's who ---------------- */
    const PEOPLE = [
        { id: 'trump', name: 'Donald Trump', ini: 'DT', p: 'R', job: 'President: head of state, head of government and commander in chief',
          fact: 'Trump is only the second President to serve two non-consecutive terms, after Grover Cleveland (1885–89, 1893–97). The 22nd Amendment bars a third term.' },
        { id: 'vance', name: 'JD Vance', ini: 'JV', p: 'R', job: 'Vice President, and also "President of the Senate"',
          fact: 'He only votes in the Senate when it is 50–50. From 2027, with a clear Democratic majority, his tie-breaker will hardly matter.' },
        { id: 'johnson', name: 'Mike Johnson', ini: 'MJ', p: 'R', job: 'Speaker of the House until January 2027',
          fact: 'The Speaker is second in line to the presidency. Because Republicans lost the House, the new House will elect a new Speaker on 3 January 2027.' },
        { id: 'jeffries', name: 'Hakeem Jeffries', ini: 'HJ', p: 'D', job: 'Democratic leader in the House, running to become Speaker',
          fact: 'The Speaker is elected by the whole House on the first day of the new Congress. With about 256 seats, the Democrats can choose.' },
        { id: 'thune', name: 'John Thune', ini: 'JT', p: 'R', job: 'Senate Majority Leader until January 2027',
          fact: 'The Majority Leader decides which bills the Senate votes on. From 2027 that job goes to a Democrat.' },
        { id: 'schumer', name: 'Chuck Schumer', ini: 'CS', p: 'D', job: 'Democratic leader in the Senate, for now',
          fact: 'Party leaders are chosen by their party\'s senators, not by voters. After the midterms several new Democratic senators said they want new leadership.' },
        { id: 'roberts', name: 'John Roberts', ini: 'JR', p: 'N', job: 'Chief Justice of the United States',
          fact: 'Chief Justice since 2005, nominated by George W. Bush. He presided over Trump\'s first impeachment trial in the Senate (2020).' }
    ];
    function initWho() {
        const pc = $('#ww-people'), rc = $('#ww-roles'); if (!pc) return;
        let selP = null, selR = null, done = {};
        function render() {
            pc.innerHTML = ''; rc.innerHTML = ''; selP = selR = null; done = {};
            $('#ww-score').textContent = '';
            $('#ww-fact').innerHTML = '<span class="muted">Match all seven. Each correct match unlocks a fact.</span>';
            shuffle(PEOPLE).forEach(p => {
                const b = el('button', { type: 'button', class: 'ww-item', 'data-id': p.id },
                    '<span class="ava ' + p.p + '">' + p.ini + '</span><span>' + p.name + '<small>' +
                    (p.p === 'N' ? 'no party label' : (p.p === 'R' ? 'Republican' : 'Democrat')) + '</small></span>');
                b.addEventListener('click', () => pick('p', p.id, b));
                pc.appendChild(b);
            });
            shuffle(PEOPLE).forEach(p => {
                const b = el('button', { type: 'button', class: 'ww-item', 'data-id': p.id }, '<span>' + p.job + '</span>');
                b.addEventListener('click', () => pick('r', p.id, b));
                rc.appendChild(b);
            });
        }
        function pick(kind, id, b) {
            if (done[id] && b.classList.contains('done')) return;
            const col = kind === 'p' ? pc : rc;
            $$('.ww-item', col).forEach(x => x.classList.remove('sel'));
            b.classList.add('sel');
            if (kind === 'p') selP = { id, b }; else selR = { id, b };
            if (selP && selR) {
                const P = selP, R = selR; selP = selR = null;
                if (P.id === R.id) {
                    [P.b, R.b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); x.disabled = true; });
                    done[P.id] = true;
                    const person = PEOPLE.find(x => x.id === P.id);
                    $('#ww-fact').innerHTML = '<strong>✓ ' + person.name + '.</strong> ' + person.fact;
                    const n = Object.keys(done).length;
                    $('#ww-score').textContent = '· ' + n + ' / ' + PEOPLE.length;
                    if (n === PEOPLE.length) $('#ww-fact').innerHTML += '<br><strong>🎉 All matched!</strong> Quick quiz for your neighbour: who of them will lose their job in January 2027, and why?';
                } else {
                    [P.b, R.b].forEach(x => { x.classList.remove('sel'); x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 400); });
                }
            }
        }
        $('#ww-reset').addEventListener('click', render);
        render();
    }

    /* ---------------- Nachfolge ---------------- */
    const SUCC = ['Vice President', 'Speaker of the House', 'President pro tempore of the Senate', 'Secretary of State', 'Secretary of the Treasury'];
    function initSuccession() {
        const box = $('#succ'); if (!box) return;
        let order = shuffle(SUCC);
        if (order.every((x, i) => x === SUCC[i])) order.reverse();
        function render(focusIdx, dir) {
            box.innerHTML = '';
            order.forEach((k, i) => {
                const li = el('li');
                li.innerHTML = '<div><h5>' + k + '</h5></div><div class="mv"><button type="button" aria-label="Move up: ' + k + '"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
                    '<button type="button" aria-label="Move down: ' + k + '"' + (i === order.length - 1 ? ' disabled' : '') + '>▼</button></div>';
                const [up, down] = $$('button', li);
                up.addEventListener('click', () => move(i, -1));
                down.addEventListener('click', () => move(i, 1));
                box.appendChild(li);
                if (i === focusIdx) { const b = dir < 0 ? up : down; (b.disabled ? (dir < 0 ? down : up) : b).focus(); }
            });
        }
        function move(i, d) {
            const j = i + d; if (j < 0 || j >= order.length) return;
            [order[i], order[j]] = [order[j], order[i]];
            $('#succ-out').hidden = true;
            render(j, d);
        }
        $('#succ-check').addEventListener('click', () => {
            const lis = $$('li', box); let right = 0;
            order.forEach((k, i) => { const ok = k === SUCC[i]; if (ok) right++; lis[i].classList.toggle('ok', ok); lis[i].classList.toggle('wrongpos', !ok); });
            const out = $('#succ-out'); out.hidden = false;
            out.innerHTML = right === SUCC.length
                ? '<strong>✓ Perfect!</strong> Vice President → Speaker → President pro tempore (traditionally the longest-serving senator of the majority party) → Secretary of State → Secretary of the Treasury … (Presidential Succession Act, 1947). Nine Vice Presidents have taken over in mid-term, most recently Gerald Ford in 1974 after Nixon resigned.<br><strong>The 2027 twist:</strong> from 3 January, numbers 2 and 3 in line will be <span class="party-d">Democrats</span>, because the majority party chooses both. The midterms changed the line of succession!'
                : '<strong>' + right + ' of 5 in the right place.</strong> Hint: the two leaders of Congress come right after the Vice President, the House before the Senate. Then the cabinet, oldest department first.';
        });
        render();
    }

    /* ---------------- Bill Quest ---------------- */
    // 2027 Senat: D 54, R 46 (beide offenen Rennen als R angenommen)
    const QSEATS = {
        before: { house: { R: 220, D: 215 }, senate: { R: 53, D: 47 }, pres: 'R' },
        after:  { house: { D: 256, R: 179 }, senate: { D: 54, R: 46 }, pres: 'R' }
    };
    const QBILL = { R: 'e.g. "Make the tariffs permanent and cut taxes"', D: 'e.g. "Lower health-care costs and end the tariffs on Canada"' };
    const PNAME = { R: 'Republican', D: 'Democratic' };
    function initQuest() {
        const path = $('#q-path'); if (!path) return;
        let era = 'before', party = 'R', running = null;
        const xh = $('#q-xh'), xs = $('#q-xs');
        function sync() {
            $$('[data-qera]').forEach(b => b.setAttribute('aria-pressed', b.dataset.qera === era));
            $$('[data-qparty]').forEach(b => b.setAttribute('aria-pressed', b.dataset.qparty === party));
            $('#q-billname').textContent = QBILL[party];
            $('#q-xh-v').textContent = xh.value; $('#q-xs-v').textContent = xs.value;
            path.innerHTML = ''; $('#q-end').textContent = ''; $('#q-end').className = 'quest-end';
            if (running) { clearTimeout(running); running = null; }
        }
        $$('[data-qera]').forEach(b => b.addEventListener('click', () => { era = b.dataset.qera; sync(); }));
        $$('[data-qparty]').forEach(b => b.addEventListener('click', () => { party = b.dataset.qparty; sync(); }));
        [xh, xs, $('#q-recon')].forEach(i => i.addEventListener('input', sync));

        function steps() {
            const S = QSEATS[era], P = party, O = P === 'R' ? 'D' : 'R';
            const hYes = S.house[P] + (+xh.value), sYes = S.senate[P] + (+xs.value);
            const hMaj = S.house.R > S.house.D ? 'R' : 'D', sMaj = S.senate.R > S.senate.D ? 'R' : 'D';
            const recon = $('#q-recon').checked;
            const st = [];
            if (hMaj === P) st.push({ ic: '🗂️', t: 'House committee', ok: true, v: 'chair: your party', d: 'Your party chairs the committees, so the bill gets a hearing and a vote.' });
            else st.push({ ic: '🗂️', t: 'House committee', ok: hYes >= 218, v: hYes + ' / 218 signatures',
                d: hYes >= 218 ? 'The chair (other party) blocks it, but a discharge petition signed by a majority forces it to the floor. This really happened in November 2025, when a petition on the Epstein files reached 218.'
                               : 'The chair (other party) never schedules it. A discharge petition needs 218 signatures. Most minority bills die here, quietly.' });
            st.push({ ic: '🏛️', t: 'House vote', ok: hYes >= 218, v: hYes + ' yes / 218 needed', d: 'Simple majority of the 435 members.' });
            if (sMaj === P) st.push({ ic: '🗓️', t: 'Senate scheduling', ok: true, v: 'leader: your party', d: 'Your party\'s Majority Leader brings it to the floor.' });
            else st.push({ ic: '🗓️', t: 'Senate scheduling', ok: sYes >= 51, v: sYes + ' supporters',
                d: sYes >= 51 ? 'Enough senators push the Majority Leader (other party) to allow a vote.' : 'The Majority Leader (other party) refuses to bring it to the floor.' });
            if (recon) st.push({ ic: '🗣️', t: 'Filibuster', skip: true, ok: true, v: 'not allowed', d: 'Budget bill ("reconciliation"): debate is limited, so no filibuster. 51 votes are enough.' });
            else st.push({ ic: '🗣️', t: 'Filibuster (cloture vote)', ok: sYes >= 60, v: sYes + ' / 60 needed', d: sYes >= 60 ? 'Debate ends; the bill gets its final vote.' : 'The other party talks it to death: without 60 votes the debate never ends.' });
            const tie = sYes === 50 && P === 'R';
            st.push({ ic: '🏛️', t: 'Senate vote', ok: sYes >= 51 || tie, v: sYes + ' yes / 51 needed', d: tie ? '50–50! Vice President Vance (R) casts the tie-breaking vote.' : 'Simple majority of the 100 senators.' });
            if (S.pres === P) st.push({ ic: '✍️', t: 'President', ok: true, v: 'signs', d: 'Trump signs his own party\'s bill.' });
            else {
                st.push({ ic: '✍️', t: 'President', ok: false, veto: true, v: 'VETO', d: 'Trump vetoes the bill. Last chance: an override.' });
                const ok = hYes >= 290 && sYes >= 67;
                st.push({ ic: '⚔️', t: 'Veto override', ok, v: hYes + '/290 · ' + sYes + '/67', d: ok ? 'Two thirds in both chambers: Congress beats the veto!' : 'Two thirds in both chambers needed: ' + Math.max(0, 290 - S.house[P]) + ' House and ' + Math.max(0, 67 - S.senate[P]) + ' Senate members of the ' + PNAME[O] + ' party would have to rebel.' });
            }
            return st;
        }
        $('#q-go').addEventListener('click', () => {
            sync();
            const st = steps();
            const lis = st.map(s => {
                const li = el('li', {}, '<span class="ic">' + s.ic + '</span><span><strong>' + s.t + '</strong><small>' + s.d + '</small></span><span class="vote">' + s.v + '</span>');
                path.appendChild(li); return li;
            });
            let i = 0;
            const end = $('#q-end');
            (function step() {
                const s = st[i], li = lis[i];
                li.classList.add('on', s.skip ? 'skip' : (s.ok ? 'pass' : 'fail'));
                const fatal = !s.ok && !s.veto;
                if (fatal || i === st.length - 1) {
                    const law = !fatal && s.ok;
                    end.className = 'quest-end ' + (law ? 'law' : 'dead');
                    end.innerHTML = law ? '🎉 It\'s the law!' : '💀 The bill died at: ' + s.t;
                    running = null; return;
                }
                i++;
                running = setTimeout(step, reduceMotion ? 0 : 650);
            })();
        });
        sync();
    }

    /* ---------------- Gridlock ---------------- */
    const ROLES = [
        { id: 'pres', p: 'R', t: 'The President', h: 'Donald Trump (R)',
          pow: ['Signs or vetoes bills', 'Commander in chief of the armed forces', 'Nominates judges, ambassadors and cabinet members', 'Executive orders, treaty talks, pardons'],
          lim: ['Cannot pass laws or spend money Congress hasn\'t approved', 'Needs the Senate for appointments and treaties'] },
        { id: 'house', p: 'D', t: 'Speaker of the House', h: 'from 2027: a Democrat (Hakeem Jeffries is running)',
          pow: ['Decides which bills reach the House floor', 'Budget bills start in the House', 'Committees investigate and subpoena', 'The House alone can impeach (simple majority)'],
          lim: ['Every law also needs the Senate and the President', 'Impeaching is not removing'] },
        { id: 'sen', p: 'D', t: 'Senate Majority Leader', h: 'from 2027: a Democrat',
          pow: ['Decides what the Senate votes on', 'The Senate confirms nominees (51 votes)', 'The Senate ratifies treaties (two thirds)', 'The Senate holds impeachment trials'],
          lim: ['Most bills need 60 votes (filibuster)', 'Removal or veto override needs 67'] },
        { id: 'min', p: 'R', t: 'Senate Republicans', h: 'the minority from 2027 (at least 44 seats)',
          pow: ['41 senators can block most bills with a filibuster', 'Their votes are needed to reach 60 or 67'],
          lim: ['Cannot decide what gets a vote', 'Cannot block nominees or budget bills that need only 51'] },
        { id: 'court', p: 'N', t: 'The Supreme Court', h: 'Chief Justice John Roberts + 8 justices',
          pow: ['Strikes down laws and executive actions that break the Constitution or the law', 'The Chief Justice presides over a President\'s impeachment trial'],
          lim: ['Can only decide cases that are brought to it', 'No army, no money: others must enforce its rulings'] },
        { id: 'press', p: 'N', t: 'Press & public', h: 'journalists, voters, interest groups',
          pow: ['Freedom of the press (First Amendment)', 'Investigate, report and frame the story', 'Voters decide in 2028'],
          lim: ['No formal power at all', 'Credible only with facts'] }
    ];
    const SCENES = [
        { t: 'Shutdown countdown', s: 'It is 25 September 2027. Unless Congress passes the budget by 1 October, the money for most federal agencies runs out.', who: ['house', 'sen', 'min', 'pres'],
          real: 'Spending bills must pass the House and the Senate, where they usually need 60 votes, and be signed by the President. No deal means a <strong>government shutdown</strong>: national parks close, and hundreds of thousands of federal employees stay home or work without pay.',
          ex: 'From 1 October to 12 November 2025 the US had its longest shutdown ever: 43 days. Even with a Republican trifecta, the Senate needed Democratic votes to reach 60.' },
        { t: 'Car tariff shock', s: 'The President announces a 50% tariff on European cars.', who: ['pres', 'house', 'sen', 'court'],
          real: 'Under existing trade laws the President can act alone. Congress can pass a bill to cancel the tariffs, but he can veto it, and an override needs two thirds. Companies or states can sue: the courts decide whether the law really allows it.',
          ex: 'In February 2026 the Supreme Court struck down tariffs that Trump had based on an emergency law. Many came back under other laws.' },
        { t: 'A seat on the Court', s: 'A Supreme Court justice announces their retirement.', who: ['pres', 'sen', 'min'],
          real: 'The President nominates; the Senate Judiciary Committee holds hearings; the full Senate confirms with a <strong>simple majority</strong>. Since 2017 nominees cannot be filibustered, so the minority alone cannot block them. A hostile majority can.',
          ex: 'In 2016 the Republican Senate refused even to hold a hearing for President Obama\'s nominee Merrick Garland. The seat went to Neil Gorsuch, nominated by Trump in 2017.' },
        { t: 'The subpoena', s: 'A House committee orders a cabinet member to testify about how tariff money was spent. The cabinet member refuses.', who: ['house', 'pres', 'court'],
          real: 'The House can vote to hold the official in <strong>contempt of Congress</strong>. But prosecuting is the job of the Justice Department, which belongs to the executive branch. The dispute often ends up in court, which can take years.',
          ex: 'In 2019 the Democratic House held Attorney General William Barr in contempt of Congress. He was never prosecuted.' },
        { t: 'Impeachment!', s: 'The House votes to impeach the President.', who: ['house', 'sen', 'min', 'court'],
          real: 'Impeachment is the <strong>charge</strong>, by simple majority in the House. The <strong>trial</strong> takes place in the Senate, with the Chief Justice presiding. Removal needs <strong>67</strong> senators. Without many votes from his own party, the President stays.',
          ex: 'In February 2021, 57 senators voted "guilty" against Trump, including seven Republicans: a clear majority, but 10 short of 67.' },
        { t: 'Strike first, ask later', s: 'The President orders air strikes abroad without asking Congress.', who: ['pres', 'house', 'sen'],
          real: 'As commander in chief the President can act at once. Under the <strong>War Powers Resolution</strong> (1973) he must inform Congress within 48 hours and end the operation after 60 days unless Congress approves. Congress can vote to stop it, but the President can veto that. Its strongest weapon is cutting the money.',
          ex: 'In 2020 Congress passed a resolution to limit military action against Iran. Trump vetoed it, and the Senate failed to override the veto.' },
        { t: 'The big treaty', s: 'The President signs a new treaty with the EU and wants it to become binding for the US.', who: ['pres', 'sen', 'min'],
          real: 'Treaties need the approval of <strong>two thirds of the Senate</strong>. That is why Presidents often choose "executive agreements" that need no ratification. The next President can cancel those easily.',
          ex: 'In 1919–20 the Senate rejected the Treaty of Versailles, so the US never joined the League of Nations, although its own President, Woodrow Wilson, had championed it.' }
    ];
    function initGridlock() {
        const rb = $('#roles'); if (!rb) return;
        ROLES.forEach(r => {
            rb.appendChild(el('div', { class: 'role ' + r.p, 'data-role': r.id },
                '<h4>' + r.t + '</h4><div class="holder">' + r.h + '</div><div class="k">Powers</div><ul>' + r.pow.map(x => '<li>' + x + '</li>').join('') +
                '</ul><div class="k">Limits</div><ul>' + r.lim.map(x => '<li>' + x + '</li>').join('') + '</ul>'));
        });
        let deck = [], timer = null, left = 0;
        const tb = $('#sc-timer'), out = $('#sc-left');
        function stopTimer() { if (timer) clearInterval(timer); timer = null; tb.classList.remove('run'); tb.textContent = '⏱ 60 s'; }
        tb.addEventListener('click', () => {
            if (timer) { stopTimer(); out.textContent = ''; return; }
            left = 60; tb.classList.add('run'); tb.textContent = '⏹ stop'; out.textContent = '60 s left';
            timer = setInterval(() => { left--; out.textContent = left > 0 ? left + ' s left' : '⏰ Time! Announce your moves.'; if (left <= 0) stopTimer(); }, 1000);
        });
        $('#sc-draw').addEventListener('click', () => {
            if (!deck.length) deck = shuffle(SCENES);
            const s = deck.pop();
            stopTimer(); out.textContent = deck.length + ' scenario' + (deck.length === 1 ? '' : 's') + ' left in the deck';
            $$('.role').forEach(r => r.classList.remove('hot'));
            const names = s.who.map(id => '<span class="tag">' + ROLES.find(r => r.id === id).t + '</span>').join('');
            $('#scene').innerHTML = '<div class="card"><h4>🃏 ' + s.t + '</h4><p>' + s.s + '</p><p class="muted" style="margin:0">Every group: what do you do? Which power on your card do you use? Or are you powerless here?</p>' +
                '<details><summary>Reality check</summary><div class="real"><div>' + names + '</div><p>' + s.real + '</p><div class="ex"><strong>Last time:</strong> ' + s.ex + '</div></div></details></div>';
            $('#scene details').addEventListener('toggle', e => {
                const open = e.target.open;
                $$('.role').forEach(r => r.classList.toggle('hot', open && s.who.indexOf(r.dataset.role) >= 0));
            });
        });
    }

    /* ---------------- Notizen ---------------- */
    function initNotes() {
        const notes = store.get('notes', {});
        let t = null;
        $$('[data-note]').forEach(f => {
            if (notes[f.dataset.note]) f.value = notes[f.dataset.note];
            f.addEventListener('input', () => {
                notes[f.dataset.note] = f.value;
                clearTimeout(t);
                t = setTimeout(() => {
                    store.set('notes', notes);
                    const s = $('#saved-ind'); if (s) { s.classList.add('show'); setTimeout(() => s.classList.remove('show'), 1200); }
                }, 400);
            });
        });
        const msg = $('#copy-msg');
        $('#copy-all').addEventListener('click', () => {
            const out = ['US Midterms 2026 – my notes', ''];
            $$('[data-note]').forEach(f => {
                if (!f.value.trim()) return;
                const lab = $('label[for="' + f.id + '"]');
                out.push('## ' + (lab ? lab.textContent.trim() : f.dataset.note));
                out.push(f.value.trim(), '');
            });
            const rank = store.get('rank', null);
            if (rank) { out.push('## My ranking of explanations'); rank.slice(0, 3).forEach((k, i) => out.push((i + 1) + '. ' + EXPLAIN[k][0])); }
            const text = out.join('\n');
            const ok = () => { msg.textContent = '✓ Copied – paste it into your notes.'; };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(ok, () => fallback(text, ok));
            } else fallback(text, ok);
        });
        function fallback(text, ok) {
            const ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); ok(); } catch (e) { msg.textContent = 'Copying failed – please select the text by hand.'; }
            ta.remove();
        }
        $('#clear-all').addEventListener('click', () => {
            if (!confirm('Delete all your notes, answers and progress on this page?')) return;
            store.clear(); location.reload();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initProgress();
        initCounters();
        initHemicycles();
        initChecks();
        initClock();
        quiz('#myths', MYTHS, '#myth-score', 'myths', it => '<div class="q">' + it.q + '</div>');
        initBlitz();
        initWho();
        initSuccession();
        initQuest();
        initGridlock();
        initHistory();
        initPoll();
        initRank();
        initHeadlines();
        quiz('#whosaid', QUOTES, '#who-score', 'quotes', it => '<blockquote>' + it.q + '</blockquote>');
        quiz('#sorter', SORT, '#sort-score', 'sort', it => '<div class="q">' + it.q + '</div>');
        initNotes();
    });
})();
