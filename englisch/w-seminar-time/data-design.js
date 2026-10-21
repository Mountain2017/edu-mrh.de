/* W-Seminar "Time" – data-design.html (viable data 1: design).
   Uses window.VD from viable-data.js. The data plan stays in this browser (localStorage 'wsDataPlan'). */
(function () {
    'use strict';
    var VD = window.VD, $ = VD.$, h = VD.h, esc = VD.esc;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var C = { o: { label: 'Objectivity', c: '#2563eb' }, r: { label: 'Reliability', c: '#c26a06' }, v: { label: 'Validity', c: '#0f8f84' } };

    /* ------------------------------------------------------------ hero: four targets */
    var TARGETS = [
        { name: '<b>reliable</b> and <b>valid</b>', cx: 0, cy: 0, s: .11 },
        { name: '<b>reliable</b>, not valid', cx: .42, cy: -.36, s: .09 },
        { name: 'valid on average, <b>not reliable</b>', cx: 0, cy: 0, s: .38 },
        { name: 'neither', cx: -.36, cy: .3, s: .36 }
    ];
    var throwN = 0;
    function drawTargets() {
        var box = $('targets'); if (!box) return;
        box.innerHTML = '';
        var rand = VD.stats.rnd(11 + throwN * 97);
        TARGETS.forEach(function (t, k) {
            var fig = h('figure', null, null, box);
            var svg = VD.svgEl('svg', { viewBox: '-110 -110 220 220', role: 'img', 'aria-label': t.name.replace(/<[^>]+>/g, '') }, fig);
            [100, 75, 50, 25].forEach(function (r, i) { VD.svgEl('circle', { r: r, fill: i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)', stroke: 'rgba(255,255,255,.25)', 'stroke-width': 1 }, svg); });
            VD.svgEl('circle', { r: 7, fill: '#d9ab2f' }, svg);
            var pts = [], g = VD.svgEl('g', {}, svg);
            for (var i = 0; i < 9; i++) {
                var x = (t.cx + t.s * VD.stats.gauss(rand)) * 100, y = (t.cy + t.s * VD.stats.gauss(rand)) * 100;
                x = Math.max(-104, Math.min(104, x)); y = Math.max(-104, Math.min(104, y));
                pts.push([x, y]);
                var dot = VD.svgEl('circle', { cx: x, cy: y, r: 6, fill: '#7aa2ff', stroke: '#171a3f', 'stroke-width': 2 }, g);
                if (!reduceMotion) { dot.style.opacity = 0; dot.style.transition = 'opacity .25s'; (function (d, delay) { setTimeout(function () { d.style.opacity = 1; }, delay); })(dot, 120 * i + 60 * k); }
            }
            var mx = VD.stats.mean(pts.map(function (p) { return p[0]; })), my = VD.stats.mean(pts.map(function (p) { return p[1]; }));
            var cross = VD.svgEl('g', { stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
            VD.svgEl('line', { x1: mx - 8, x2: mx + 8, y1: my - 8, y2: my + 8 }, cross);
            VD.svgEl('line', { x1: mx - 8, x2: mx + 8, y1: my + 8, y2: my - 8 }, cross);
            if (!reduceMotion) { cross.style.opacity = 0; cross.style.transition = 'opacity .3s'; setTimeout(function () { cross.style.opacity = 1; }, 1200 + 60 * k); }
            h('figcaption', null, t.name, fig);
        });
    }
    drawTargets();
    if ($('throw')) $('throw').addEventListener('click', function () { throwN++; drawTargets(); });

    /* ------------------------------------------------------------ criteria quiz */
    var OPTS = [C.o, C.r, C.v];
    if ($('crit-quiz')) VD.quiz($('crit-quiz'), [
        { t: 'Two teachers mark the same short essay test: 11 and 7 points.', a: 0, fb: 'The score depends on the marker – scoring objectivity. A marking key with model answers fixes it.' },
        { t: 'You explain the task to group A in detail, to group B in one sentence.', a: 0, fb: 'The result now depends on how <em>you</em> ran it – objectivity of administration. Use one written script. (It also endangers the internal validity of the comparison.)' },
        { t: 'Students take your quiz twice, one week apart. Their scores jump around a lot.', a: 1, fb: 'Same people, different results: low test–retest reliability. More (and clearer) items help.' },
        { t: 'Your three items on time pressure hardly correlate with each other.', a: 1, fb: 'Low internal consistency: the items don’t agree. Part 2 shows how Cronbach’s α finds the weak item.' },
        { t: 'A stopwatch app sometimes lags by a second when the phone is busy.', a: 1, fb: 'Random measurement error – reliability. Use a dedicated stopwatch or log times automatically.' },
        { t: 'Your survey on “time management” mostly asks how much people like school.', a: 2, fb: 'Precise, maybe – but it measures attitude to school, not time management. Content validity.' },
        { t: 'After collecting, you decide which answers count as “mostly agree”.', a: 0, fb: 'Interpretation objectivity: the rules must be fixed before you see the data – otherwise you (unconsciously) bend them.' },
        { t: 'Only your volleyball team took part, but your paper talks about “teenagers”.', a: 2, fb: 'External validity: the result may not carry over to other teenagers. Limit the claim or widen the sample.' },
        { t: 'Fast-music group in the morning, slow-music group after lunch.', a: 2, fb: 'Time of day is a confound – it could explain the difference instead of the music. Internal validity.' }
    ], OPTS, $('crit-score'));

    /* ------------------------------------------------------------ survey: item quiz */
    var FLAWS = ['leading', 'two in one', 'vague', 'double negative', 'assumption'];
    if ($('item-quiz')) VD.quiz($('item-quiz'), [
        { t: '<i>Don’t you agree that phones waste our time?</i>', a: 0, fb: 'It pushes towards “yes”. Better: <i>How many hours do you spend on your phone on a school day?</i>' },
        { t: '<i>How often do you feel stressed and tired in the morning?</i>', a: 1, fb: 'Double-barrelled: stressed but not tired – what do you tick? Ask two items.' },
        { t: '<i>Do you sleep enough?</i>', a: 2, fb: '“Enough” means something different to everyone, and yes/no loses information. Better: <i>On school nights, how many hours do you usually sleep?</i>' },
        { t: '<i>I don’t think it isn’t hard to be on time.</i> (agree … disagree)', a: 3, fb: 'Nobody knows what “disagree” means here. Better: <i>Being on time is hard for me.</i>' },
        { t: '<i>How much has the new timetable improved your mornings?</i>', a: 4, fb: 'It assumes there was an improvement. Better: <i>How has the new timetable changed your mornings?</i> (much worse … much better)' },
        { t: '<i>Most experts say teenagers need more sleep. Should school start later?</i>', a: 0, fb: 'The intro tells people what to think. Leave it out – or give arguments for both sides.' },
        { t: '<i>Do you often play games late?</i>', a: 2, fb: '“Often” and “late” are vague. Better: <i>On how many school nights last week did you play after 10 p.m.?</i> (0–5)' }
    ], FLAWS.map(function (f) { return { label: f, c: '#2563eb' }; }), $('item-score'));

    /* ------------------------------------------------------------ experiment: spot the problems */
    if ($('exp-spot')) VD.spot($('exp-spot'), [
        { t: 'The first 15 students who arrive get fast music, the rest slow music.', bad: true, why: 'Not random: early arrivers may differ (more punctual, less stressed). Assign by lot.' },
        { t: 'Everyone waits exactly 3 minutes, timed with the same stopwatch.', bad: false, why: 'Good: same real duration, precise measure.' },
        { t: 'The fast group waits in the music room, the slow group in the library.', bad: true, why: 'Room is a confound – noise, chairs, view. Same room for everyone.' },
        { t: 'You read the same written instructions to every group.', bad: false, why: 'Good: objectivity of administration.' },
        { t: 'You tell them you expect fast music to make time fly.', bad: true, why: 'People may (unconsciously) answer what you expect. Say only “we study how people experience waiting”.' },
        { t: 'Both pieces are instrumental, equally loud and unknown to the participants.', bad: false, why: 'Good: only the tempo differs.' },
        { t: 'Fast group in the morning, slow group after lunch.', bad: true, why: 'Time of day is a confound. Mix both conditions across the day.' },
        { t: 'Each person writes the estimate in minutes on a card before talking to anyone.', bad: false, why: 'Good: clear unit, no influence from others.' },
        { t: 'Afterwards, they rate how fast the music was.', bad: false, why: 'Good: a manipulation check – did the music feel different at all?' },
        { t: 'You leave out three estimates that don’t fit your hypothesis.', bad: true, why: 'Never. Exclusions need a rule fixed in advance (e.g. “answer in seconds”), and you report them.' }
    ], $('exp-check'), $('exp-score'));

    /* ------------------------------------------------------------ sample simulator */
    (function sim() {
        var svg = $('sim-svg'); if (!svg) return;
        var slider = $('sim-n'), runs = [];
        var X = function (p) { return 20 + p / 100 * 480; };
        function draw() {
            svg.innerHTML = '';
            [0, 20, 40, 60, 80, 100].forEach(function (p) {
                VD.svgEl('line', { x1: X(p), x2: X(p), y1: 18, y2: 118, stroke: '#e8eaf2' }, svg);
                VD.svgEl('text', { x: X(p), y: 136, 'text-anchor': 'middle' }, svg).textContent = p + ' %';
            });
            VD.svgEl('line', { x1: X(62), x2: X(62), y1: 10, y2: 122, stroke: '#1c1e33', 'stroke-width': 2 }, svg);
            VD.svgEl('text', { x: X(62) + 5, y: 14 }, svg).textContent = 'true value 62 %';
            runs.forEach(function (p, i) {
                VD.svgEl('circle', { cx: X(p), cy: 26 + (i % 10) * 9.5, r: 4.5, fill: '#c26a06', stroke: '#fff', 'stroke-width': 1.5, 'data-tip': 'survey ' + (i + 1) + ': ' + p.toFixed(0) + ' % yes' }, svg);
            });
        }
        function run() {
            var n = +slider.value, pop = 900, yes = 558;
            runs = [];
            for (var k = 0; k < 20; k++) {
                var y = 0, left = pop, leftYes = yes;
                for (var i = 0; i < n; i++) { if (Math.random() < leftYes / left) { y++; leftYes--; } left--; }   // draw without replacement
                runs.push(100 * y / n);
            }
            var fpc = Math.sqrt((pop - n) / (pop - 1)), margin = 196 * Math.sqrt(.62 * .38 / n) * fpc;
            $('sim-text').textContent = 'Results from ' + Math.round(Math.min.apply(null, runs)) + ' % to ' + Math.round(Math.max.apply(null, runs)) + ' %. With n = ' + n + ', 95 % of all surveys land within about ±' + margin.toFixed(0) + ' percentage points of the truth. Four times as many people only halve the error.';
            draw();
        }
        slider.addEventListener('input', function () { $('sim-n-out').textContent = slider.value; });
        slider.addEventListener('change', run);
        $('sim-run').addEventListener('click', run);
        run();
    })();

    /* ------------------------------------------------------------ data plan + coach */
    var KEY = 'wsDataPlan';
    var FIELDS = [
        { k: 'type', label: 'Kind of data', select: true },
        { k: 'question', label: 'Research question or hypothesis', ph: 'e.g. Students who wait with fast music estimate a 3-minute wait as shorter than students with slow music.', rows: 2 },
        { k: 'construct', label: 'What exactly do you measure?', small: 'construct, variables', ph: 'IV: tempo of the music (fast / slow); DV: estimated waiting time', rows: 2 },
        { k: 'oper', label: 'How does it become a number or category?', small: 'operationalisation', ph: '“How long did you wait? Answer in minutes.” – after exactly 3 minutes', rows: 2 },
        { k: 'sample', label: 'Who, how many, how chosen?', ph: 'Year 10 and 11, 2 × 30 students, classes drawn by lot, randomly assigned', rows: 2 },
        { k: 'procedure', label: 'Procedure, step by step', ph: '1. same room … 2. read script … 3. …', rows: 3 },
        { k: 'quality', label: 'How do you secure objectivity, reliability, validity?', ph: 'script, stopwatch, random assignment, manipulation check, codebook, several items …', rows: 3 },
        { k: 'pilot', label: 'Pilot', small: 'who, when, what you check', ph: '5 students from Year 9, check time needed and whether the music feels different', rows: 2 },
        { k: 'ethics', label: 'Permission and data protection', ph: 'ask teacher and school; anonymous codes; voluntary …', rows: 2 }
    ];
    var plan = VD.store(KEY) || {};
    var form = $('plan-form');
    if (form) {
        FIELDS.forEach(function (f) {
            var wrap = h('div', 'field', null, form), id = 'plan-' + f.k;
            h('label', null, esc(f.label) + (f.small ? ' <small>(' + esc(f.small) + ')</small>' : ''), wrap).setAttribute('for', id);
            var inp;
            if (f.select) {
                inp = h('select', null, null, wrap);
                h('option', null, '– choose –', inp).value = '';
                VD.TRACKS.forEach(function (t) { var o = h('option', null, esc(t.label), inp); o.value = t.id; });
            } else {
                inp = h('textarea', null, null, wrap); inp.rows = f.rows || 2; inp.placeholder = f.ph || '';
            }
            inp.id = id;
            inp.value = plan[f.k] || '';
            inp.addEventListener('input', function () { plan[f.k] = inp.value; save(); coach(); });
        });
        if (!plan.type) { $('plan-type').value = VD.track() === 'all' ? '' : VD.track(); plan.type = $('plan-type').value; }
        VD.onTrack(function (id) { if (!plan.question && id !== 'all') { $('plan-type').value = id; plan.type = id; coach(); } });
    }
    function save() {
        VD.store(KEY, plan);
        $('plan-saved').textContent = 'Saved in this browser.';
    }
    function has(k, re) { return re.test(plan[k] || ''); }
    function coach() {
        var ul = $('plan-coach'); if (!ul) return;
        ul.innerHTML = '';
        var tips = [], t = plan.type;
        function add(ok, good, hint) { tips.push([ok, ok ? good : hint]); }
        add(!!t, 'Kind of data chosen.', 'Choose the kind of data first – it decides what the coach looks for.');
        add(has('question', /\b(than|more|less|differ|relat|correlat|change|increase|decrease|between|affect|share)/i),
            'Your question names a comparison, relationship or change.', 'Make it testable: what do you compare, relate or track over time?');
        add(has('oper', /\d|scale|minute|second|hour|point|code|categor|1\s*[–-]\s*5|percent|%/i),
            'Clear rule for numbers or categories.', 'How exactly does your idea turn into a number? Name the question, the scale or the unit.');
        var nums = (plan.sample || '').match(/\d+/g), n = nums ? Math.max.apply(null, nums.map(Number)) : 0;
        add(n > 0, 'Sample size given.', 'How many – per group, if you compare groups?');
        if (n > 0 && n < 30 && (t === 'experiment' || t === 'survey' || t === 'test'))
            tips.push([false, 'With fewer than 30 per group you will only find large effects. Part 2 shows how to estimate the number you need.']);
        add(has('sample', /random|lot|chance|class|year|course|volunteer|all |every|chart|corpus|decade|songs|texts/i),
            'You say how the sample is chosen.', 'How do you choose people (or texts)? Random, whole classes, volunteers?');
        if (t === 'experiment') add(has('procedure', /random/i) || has('quality', /random/i), 'Random assignment planned.', 'Who decides who is in which group? It should be chance.');
        if (t === 'experiment') add(has('quality', /manipulation|check|rate/i) || has('procedure', /manipulation|rate how/i), 'Manipulation check planned.', 'Add a manipulation check: did the conditions really feel different?');
        if (t === 'survey') add(has('quality', /item|scale|several|revers/i), 'Several items per construct.', 'Plan several items per construct (and reverse one).');
        if (t === 'survey') add(has('ethics', /anonym|code/i), 'Anonymous.', 'Survey anonymously: codes, no names.');
        if (t === 'test') add(has('quality', /key|marking|scoring|answer/i), 'Marking key planned.', 'Write a marking key with all accepted answers before the test.');
        if (t === 'test') add(has('quality', /blueprint|content|cover/i), 'The test covers a defined content.', 'Make a blueprint: which content, how many items each?');
        if (t === 'coding') add(has('quality', /codebook|definition/i) || has('procedure', /codebook/i), 'Codebook planned.', 'Write a codebook: definition, counts, doesn’t count, example.');
        if (t === 'coding') add(has('quality', /two|2|second|kappa|κ|agree/i) || has('procedure', /second coder|two coders|2 coders/i), 'Second coder planned.', 'Who codes a sample a second time, independently?');
        if (t === 'existing') add(has('quality', /document|definition|method|break|unit/i), 'You check definitions and method changes.', 'Read the documentation: definitions, units, method changes over time.');
        add(has('pilot', /\w{3,}/), 'Pilot planned.', 'Plan a pilot with a few people (or texts) – part 2 shows what to check.');
        if (t !== 'existing' && t !== 'coding') add(has('ethics', /permi|consent|teacher|school|parent/i), 'Permission considered.', 'Ask your teacher and the school before you collect data from people.');
        tips.forEach(function (p) { h('li', p[0] ? 'g' : 'h', esc(p[1]), ul); });
    }
    coach();
    if ($('plan-download')) $('plan-download').addEventListener('click', function () {
        var type = VD.TRACKS.filter(function (t) { return t.id === plan.type; })[0];
        var out = ['DATA PLAN – W-Seminar "Time"', 'saved ' + new Date().toLocaleDateString('en-GB'), ''];
        FIELDS.forEach(function (f) { out.push(f.label.toUpperCase()); out.push(f.select ? (type ? type.label : '') : (plan[f.k] || '')); out.push(''); });
        var blob = new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data-plan.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    if ($('plan-clear')) $('plan-clear').addEventListener('click', function () {
        if (!confirm('Delete your data plan in this browser?')) return;
        plan = {}; VD.store(KEY, null);
        FIELDS.forEach(function (f) { $('plan-' + f.k).value = ''; });
        $('plan-saved').textContent = 'Deleted.'; coach();
    });
})();
