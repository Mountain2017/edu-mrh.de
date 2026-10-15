/* W-Seminar "Time" – research-methods.html
   Plain JS, no libraries. The research plan stays in this browser (localStorage). */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (id) { return document.getElementById(id); };
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function pills(container, labels, onPick, start) {
        var btns = labels.map(function (label, i) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'pill'; b.textContent = label;
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { pick(i); });
            container.appendChild(b);
            return b;
        });
        function pick(i) {
            btns.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); });
            onPick(i);
        }
        if (start !== undefined) pick(start);
        return pick;
    }

    var JOBS = [
        { name: 'Define', color: '#2563eb', chapter: '2 Background' },
        { name: 'Explain', color: '#7c3aed', chapter: '2 Background' },
        { name: 'Context', color: '#b83280', chapter: '1 Introduction' },
        { name: 'Test', color: '#0f8f84', chapter: '3 Method · 4 Results' },
        { name: 'Evaluate', color: '#c26a06', chapter: '5 Discussion · 6 Conclusion' }
    ];

    /* ------------------------------------------------------------ hero map */
    (function heroMap() {
        var svg = $('qmap'), cx = 260, cy = 212, R = 148;
        var SHORT = ['What is “perceived duration”?', 'Why can time feel shorter?', 'Where does waiting matter?', 'What will my groups show?', 'How far can I generalise?'];
        var CH = ['→ chapter 2', '→ chapter 2', '→ chapter 1', '→ chapters 3 + 4', '→ chapters 5 + 6'];
        var LIGHT = ['#7aa2ff', '#b48cff', '#e879b5', '#3fd1c2', '#f6a54a'];
        var edges = el('g', {}, svg), nodes = el('g', {}, svg);
        JOBS.forEach(function (j, i) {
            var a = (-90 + i * 72) * Math.PI / 180, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
            var delay = 0.5 + i * 0.35;
            var e = el('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: j.color, 'stroke-width': 2, class: 'edge' }, edges);
            e.style.animationDelay = delay + 's';
            var g = el('g', { class: 'node' }, nodes);
            g.style.animationDelay = (delay + 0.3) + 's';
            el('circle', { cx: x, cy: y, r: 9, fill: j.color }, g);
            var below = y > cy + 40;
            var y1 = below ? y + 27 : y - 50;
            var t1 = el('text', { x: x, y: y1, 'text-anchor': 'middle', class: 'j', fill: LIGHT[i] }, g);
            t1.textContent = (i + 1) + ' ' + j.name;
            var t2 = el('text', { x: x, y: y1 + 17, 'text-anchor': 'middle', class: 'q' }, g);
            t2.textContent = SHORT[i];
            var t3 = el('text', { x: x, y: y1 + 33, 'text-anchor': 'middle', class: 'chap' }, svg);
            t3.textContent = CH[i];
            t3.style.animationDelay = (2.6 + i * 0.12) + 's';
        });
        var core = el('g', { class: 'core' }, svg);
        el('rect', { x: cx - 88, y: cy - 28, width: 176, height: 56, rx: 12 }, core);
        var tt = el('text', { x: cx, y: cy - 5, 'text-anchor': 'middle' }, core); tt.textContent = 'working thesis';
        var ts = el('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', style: 'font: italic 400 12px var(--serif); fill: #4a4e69' }, core);
        ts.textContent = 'fast music → shorter wait';
    })();

    /* ------------------------------------------------------------ worked examples */
    var EXAMPLES = [
        { label: 'Psychology: music and waiting', thesis: 'Students who wait with fast music judge a three-minute wait as shorter than students who wait with slow music.', qs: [
            'How do psychologists define “perceived duration”, and how does it differ from clock time?',
            'Which models explain why the same duration can feel shorter or longer – and what role do attention and arousal play?',
            'In which everyday situations does waiting matter, and how do shops, hospitals or transport companies try to make it feel shorter?',
            'How large is the difference between the fast-music and the slow-music group in my experiment, and how reliable is it?',
            'To what extent can the results of one school experiment be generalised, and which other factors could explain them?' ] },
        { label: 'Literature: time-loop novels', thesis: 'In two YA time-loop novels, repeated scenes change mainly in the protagonist’s perspective rather than in the events.', qs: [
            'What is a time loop as a narrative device, and how does narratology describe repetition (“frequency”)?',
            'How have critics interpreted time loops in fiction and film so far?',
            'Why have time-loop stories become so popular in young adult fiction since the 2010s?',
            'Which changes occur from the first to the last loop in each novel – in events, dialogue or perspective – and how often?',
            'What do these patterns reveal about the function of the loop, and how far can two novels stand for the genre?' ] },
        { label: 'Computer science: clock drift', thesis: 'Devices that synchronise via the internet stay within one second of official time, while offline clocks drift by several seconds per week.', qs: [
            'What do “clock drift”, “official time” and “synchronisation” mean?',
            'How do quartz clocks, radio-controlled clocks and the Network Time Protocol keep – or lose – time?',
            'Where does exact time matter in everyday life and in computer systems?',
            'How far do 30 devices drift from official time within three weeks, and how do online and offline devices compare?',
            'Which measurement errors could affect my results, and what do they mean for everyday users?' ] }
    ];
    pills($('ex-tabs'), EXAMPLES.map(function (e) { return e.label; }), function (i) {
        var ex = EXAMPLES[i];
        $('ex-thesis').innerHTML = '<span>Working thesis</span>' + esc(ex.thesis);
        $('ex-list').innerHTML = ex.qs.map(function (q, k) {
            return '<li><span class="tag" style="color:' + JOBS[k].color + '">' + (k + 1) + ' ' + JOBS[k].name + '</span><span class="qq">' + esc(q) + '</span></li>';
        }).join('');
    }, 0);

    /* ------------------------------------------------------------ keyword grid */
    var EXAMPLE_GRID = [['perceived duration', 'time perception', 'time estimation'], ['music', 'tempo', ''], ['waiting', 'waiting time', 'queue']];
    var gridBody = document.querySelector('#kgrid tbody'), gridInputs = [];
    ['concept 1', 'concept 2', 'concept 3'].forEach(function (lab, r) {
        var tr = document.createElement('tr');
        var td0 = document.createElement('td'); td0.className = 'lab'; td0.textContent = lab; tr.appendChild(td0);
        gridInputs[r] = [];
        for (var c = 0; c < 3; c++) {
            var td = document.createElement('td'), inp = document.createElement('input');
            inp.type = 'text'; inp.setAttribute('aria-label', lab + ', ' + (c === 0 ? 'term' : 'synonym ' + c));
            inp.addEventListener('input', buildString);
            td.appendChild(inp); tr.appendChild(td); gridInputs[r].push(inp);
        }
        gridBody.appendChild(tr);
    });
    $('k-not').addEventListener('input', buildString);
    function q(term) {
        term = term.trim();
        if (!term) return '';
        if (/^".*"$/.test(term)) return term;
        return /\s/.test(term) ? '"' + term + '"' : term;
    }
    var currentString = '';
    function buildString() {
        var parts = [], html = [];
        gridInputs.forEach(function (row) {
            var terms = row.map(function (i) { return q(i.value); }).filter(Boolean);
            if (!terms.length) return;
            if (terms.length === 1) { parts.push(terms[0]); html.push(esc(terms[0])); }
            else {
                parts.push('(' + terms.join(' OR ') + ')');
                html.push('(' + terms.map(esc).join(' <span class="op">OR</span> ') + ')');
            }
        });
        var s = parts.join(' AND '), h = html.join(' <span class="op">AND</span> ');
        var not = q($('k-not').value);
        if (not && s) { s += ' -' + not; h += ' <span class="op">-</span>' + esc(not); }
        currentString = s;
        $('kstring').innerHTML = s ? h : '<span style="color:#8f94c7">Fill in at least one concept.</span>';
    }
    function fillExample() {
        EXAMPLE_GRID.forEach(function (row, r) { row.forEach(function (t, c) { gridInputs[r][c].value = t; }); });
        $('k-not').value = '';
        buildString();
    }
    fillExample();
    $('k-reset').addEventListener('click', fillExample);
    $('k-copy').addEventListener('click', function () {
        var btn = this;
        if (!currentString) return;
        (navigator.clipboard ? navigator.clipboard.writeText(currentString) : Promise.reject()).then(function () {
            btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        }, function () { window.prompt('Copy the search string:', currentString); });
    });
    $('k-scholar').addEventListener('click', function () {
        if (currentString) window.open('https://scholar.google.com/scholar?q=' + encodeURIComponent(currentString), '_blank', 'noopener');
    });
    $('k-base').addEventListener('click', function () {
        if (currentString) window.open('https://www.base-search.net/Search/Results?lookfor=' + encodeURIComponent(currentString), '_blank', 'noopener');
    });

    /* ------------------------------------------------------------ triage */
    var TRIAGE = [
        { t: 'Study in a marketing journal (2015)', d: 'Bank customers estimated their waiting time with slow vs fast background music.', a: 'use', fb: 'It answers question 2 (Explain) and gives ideas for your own method (question 4).' },
        { t: 'Handbook chapter: “Models of time perception”', d: 'Explains the attentional-gate model and other models of how we judge durations.', a: 'use', fb: 'Definitions and theory for questions 1 and 2. A handbook is tertiary: follow its references, too.' },
        { t: 'Magazine feature: “The strange history of elevator music”', d: 'A long, entertaining story about background music since the 1930s.', a: 'park', fb: 'Fun, maybe a hook for your introduction, but it answers none of your five questions.' },
        { t: 'Blog post: “10 songs that make your workday fly by”', d: 'No author, many ads, no references.', a: 'drop', fb: 'No author, no evidence, and the purpose is clicks.' },
        { t: 'Study: classroom noise and reading scores', d: 'How noise affects the reading results of primary school children.', a: 'drop', fb: 'Different outcome (reading, not time) and a different age group. Similar words, different question.' },
        { t: 'Federal statistics: waiting times at doctors’ practices', d: 'Average waiting times in Germany, by region.', a: 'use', fb: 'Context for question 3: where waiting matters in everyday life.' }
    ];
    var triAns = {}, triBox = $('triage');
    var TRI_LABEL = { use: 'Use it', park: 'Park it', drop: 'Drop it' };
    TRIAGE.forEach(function (it, i) {
        var div = document.createElement('div'); div.className = 'tri-item';
        div.innerHTML = '<div><div class="ti">' + esc(it.t) + '</div><div class="td">' + esc(it.d) + '</div></div><div class="btns"></div><div class="fb"></div>';
        var btns = div.querySelector('.btns'), fb = div.querySelector('.fb');
        ['use', 'park', 'drop'].forEach(function (k) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = TRI_LABEL[k];
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
                if (triAns[i]) return;
                triAns[i] = k;
                b.setAttribute('aria-pressed', 'true');
                btns.querySelectorAll('button').forEach(function (o) { o.disabled = o !== b; });
                var ok = k === it.a;
                fb.className = 'fb show ' + (ok ? 'ok' : 'no');
                fb.innerHTML = (ok ? '<b>Agreed.</b> ' : '<b>Suggested: ' + TRI_LABEL[it.a].toLowerCase() + '.</b> ') + esc(it.fb);
                score(triAns, TRIAGE, 'a', $('tri-score'));
            });
            btns.appendChild(b);
        });
        triBox.appendChild(div);
    });
    function score(ans, list, key, out) {
        var n = Object.keys(ans).length, r = 0;
        Object.keys(ans).forEach(function (i) { if (ans[i] === list[i][key]) r++; });
        out.textContent = n === list.length ? r + ' of ' + list.length + ' as suggested.' + (r < list.length ? ' Where you disagree: can you justify your choice?' : '') : '';
    }

    /* ------------------------------------------------------------ source cards */
    var CARDS = [
        { t: 'Journal article, 2019', d: 'Peer-reviewed psychology journal; authors at two universities; method, data and 60 references.', a: 'solid', fb: 'Who, Where, What all check out. A secondary source you can build on.' },
        { t: 'Newspaper science page', d: 'Summary of a new study on music and waiting; links the original study.', a: 'care', fb: 'Fine for context. Find the original study and cite that.' },
        { t: 'YouTube video “Time slows down for teens – science proves it!”', d: 'Anonymous channel, no sources given.', a: 'avoid', fb: 'Unknown author, no evidence, purpose: clicks.' },
        { t: 'Meditation app website', d: '“Our users feel 40 % less time pressure.”', a: 'avoid', fb: 'The purpose is selling and there is no method. It could be primary material if you analyse advertising.' },
        { t: 'Cognitive psychology textbook, 2012 edition', d: 'University textbook by two professors.', a: 'solid', fb: 'Good for definitions (tertiary). Check whether there is a newer edition.' },
        { t: 'Wikipedia: “Time perception”', d: 'Long article with many references.', a: 'care', fb: 'For orientation and its references. Don’t cite it as evidence.' }
    ];
    var cAns = {}, cBox = $('scards');
    var C_LABEL = { solid: 'Solid', care: 'Use with care', avoid: 'Avoid' };
    CARDS.forEach(function (it, i) {
        var div = document.createElement('div'); div.className = 'scard';
        div.innerHTML = '<div class="st">' + esc(it.t) + '</div><div class="sd">' + esc(it.d) + '</div><div class="pills" style="margin:0"></div><div class="fb"></div>';
        var btns = div.querySelector('.pills'), fb = div.querySelector('.fb');
        ['solid', 'care', 'avoid'].forEach(function (k) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = C_LABEL[k];
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
                if (cAns[i]) return;
                cAns[i] = k;
                b.setAttribute('aria-pressed', 'true');
                btns.querySelectorAll('button').forEach(function (o) { o.disabled = o !== b; });
                var ok = k === it.a;
                fb.className = 'fb show ' + (ok ? 'ok' : 'no');
                fb.innerHTML = (ok ? '<b>Agreed.</b> ' : '<b>Suggested: ' + C_LABEL[it.a].toLowerCase() + '.</b> ') + esc(it.fb);
                score(cAns, CARDS, 'a', $('sc-score'));
            });
            btns.appendChild(b);
        });
        cBox.appendChild(div);
    });

    /* ------------------------------------------------------------ planner */
    var KEY = 'wsResearchPlan';
    var plan = { thesis: '', park: '', qs: [0, 1, 2, 3, 4].map(function (i) { return { job: i, q: '' }; }) };
    try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.qs && p.qs.length === 5) plan = p; } } catch (e) { /* storage blocked */ }
    var qBox = $('p-qs'), saveT = null;
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(plan)); $('p-saved').textContent = 'Saved in this browser.'; }
        catch (e) { $('p-saved').textContent = 'Could not save in this browser – download a copy.'; }
        clearTimeout(saveT); saveT = setTimeout(function () { $('p-saved').textContent = ''; }, 1800);
    }
    plan.qs.forEach(function (item, i) {
        var row = document.createElement('div'); row.className = 'qrow';
        var sel = document.createElement('select'); sel.setAttribute('aria-label', 'Job of question ' + (i + 1));
        JOBS.forEach(function (j, k) { var o = document.createElement('option'); o.value = k; o.textContent = (i + 1) + ' · ' + j.name; sel.appendChild(o); });
        sel.value = item.job;
        var ta = document.createElement('textarea'); ta.rows = 2; ta.placeholder = 'How / Why / To what extent / Which …?'; ta.value = item.q;
        ta.setAttribute('aria-label', 'Refinery question ' + (i + 1));
        var f1 = document.createElement('div'); f1.className = 'field'; f1.style.margin = '0'; f1.appendChild(sel);
        var f2 = document.createElement('div'); f2.className = 'field'; f2.style.margin = '0'; f2.appendChild(ta);
        row.appendChild(f1); row.appendChild(f2);
        sel.addEventListener('change', function () { item.job = +sel.value; coach(); save(); });
        ta.addEventListener('input', function () { item.q = ta.value; coach(); save(); });
        qBox.appendChild(row);
    });
    $('p-thesis').value = plan.thesis || '';
    $('p-park').value = plan.park || '';
    $('p-thesis').addEventListener('input', function () { plan.thesis = this.value; coach(); save(); });
    $('p-park').addEventListener('input', function () { plan.park = this.value; save(); });
    $('p-import').addEventListener('click', function () {
        var found = [];
        try {
            var r = JSON.parse(localStorage.getItem('wsRqOptions') || 'null');
            if (r && r.opts) r.opts.forEach(function (o) { if (o.th && o.th.trim()) found.push(o.th.trim()); });
        } catch (e) { /* ignore */ }
        if (!found.length) { $('p-saved').textContent = 'No working thesis found in this browser – type it in.'; return; }
        var idx = found.indexOf(plan.thesis.trim());
        plan.thesis = found[(idx + 1) % found.length];
        $('p-thesis').value = plan.thesis; coach(); save();
        if (found.length > 1) $('p-saved').textContent = 'Option ' + ((idx + 1) % found.length + 1) + ' of ' + found.length + ' – click again for the next one.';
    });
    $('p-clear').addEventListener('click', function () {
        if (!confirm('Clear your research plan?')) return;
        plan = { thesis: '', park: '', qs: [0, 1, 2, 3, 4].map(function (i) { return { job: i, q: '' }; }) };
        try { localStorage.removeItem(KEY); } catch (e) { }
        location.reload();
    });
    $('p-download').addEventListener('click', function () {
        var d = new Date().toISOString().slice(0, 10);
        var out = 'W-Seminar "Time" – my research plan (' + d + ')\n\nWorking thesis:\n' + (plan.thesis || '–') + '\n\nRefinery questions:\n';
        plan.qs.forEach(function (it, i) { out += (i + 1) + ' [' + JOBS[it.job].name + '] ' + (it.q.trim() || '–') + '\n'; });
        out += '\nOutline:\n' + outlineText().join('\n') + '\n\nParking lot:\n' + (plan.park || '–') + '\n';
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain;charset=utf-8' }));
        a.download = d + '_research-plan.txt';
        document.body.appendChild(a); a.click(); a.remove();
    });

    var STOP = /^(the|and|that|than|with|from|this|their|there|which|what|when|where|while|about|into|other|these|those|students|student|people|more|less|have|been|does|will|would|could|should|between|within|mainly|rather)$/i;
    function words(s) { return (s.toLowerCase().match(/[a-zäöüß-]{5,}/g) || []).filter(function (w) { return !STOP.test(w); }); }
    function outlineText() {
        var rows = [['1 Introduction', [2]], ['2 Background', [0, 1]], ['3 Method · 4 Results', [3]], ['5 Discussion · 6 Conclusion', [4]]];
        return rows.map(function (r) {
            var qs = [];
            plan.qs.forEach(function (it, i) { if (r[1].indexOf(it.job) >= 0 && it.q.trim()) qs.push('Q' + (i + 1)); });
            return r[0] + ': ' + (qs.length ? qs.join(', ') : '–');
        });
    }
    function coach() {
        var hints = [];
        function g(t) { hints.push('<li class="g">' + t + '</li>'); }
        function h(t) { hints.push('<li class="h">' + t + '</li>'); }
        if (!(plan.thesis || '').trim()) h('Start with your working thesis – the questions refine it.');
        var filled = 0, open = 0;
        plan.qs.forEach(function (it, i) {
            var q = it.q.trim(), n = 'Q' + (i + 1);
            if (!q) return;
            filled++;
            var issue = false;
            if (/^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b/i.test(q)) { h(n + ' is a yes/no question. Try “How …”, “Why …” or “To what extent …”.'); issue = true; }
            if (/\bor\b/i.test(q) && (/^(which|what|is|are|do|does|did|can|will|should)\b/i.test(q) || /\b(better|worse|more important)\b/i.test(q))) { h(n + ' may be an either/or question. Can you ask about both sides openly?'); issue = true; }
            if (!/\?\s*$/.test(q)) h(n + ' needs a question mark.');
            if (q.split(/\s+/).length < 6) { h(n + ' is very short – who, what, where exactly?'); issue = true; }
            if (!issue) open++;
        });
        var jobs = plan.qs.filter(function (it) { return it.q.trim(); }).map(function (it) { return it.job; });
        var dup = jobs.filter(function (j, i) { return jobs.indexOf(j) !== i; });
        if (dup.length) h('Two questions share the job “' + JOBS[dup[0]].name + '”. Is another job missing?');
        if (filled && jobs.indexOf(3) < 0) h('No question has the job “Test”. What will your own data show?');
        if (filled === 5 && !dup.length) g('Five questions, five jobs – your research plan is complete.');
        else if (filled) g(filled + ' of 5 questions written.');
        if (open && open === filled && filled > 1) g('All your questions look open.');
        if (filled >= 3) h('Necessary? For each question: if you left it out, would your argument have a gap? If not – parking lot.');
        $('p-coach').innerHTML = hints.join('') || '<li class="h">Write your first refinery question.</li>';
        $('p-outline').innerHTML = '<b>Your outline</b>' + outlineText().map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('');
    }
    coach();
})();
