/* W-Seminar "Time" – research-question.html
   Plain JS, no libraries. Option builder data stays in this browser (localStorage). */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (id) { return document.getElementById(id); };
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
        return { pick: pick, btns: btns };
    }

    /* ------------------------------------------------------------ hero lens */
    var lensDt = document.querySelectorAll('#lens dt'), lensDd = document.querySelectorAll('#lens dd');
    var lensTimer = null;
    function lensShow(k) {
        for (var i = 0; i < lensDd.length; i++) {
            lensDd[i].className = i === k ? 'on' : (i < k ? 'done' : '');
            lensDt[i].className = i === k ? 'on' : '';
        }
    }
    function lensPlay() {
        clearInterval(lensTimer);
        if (reduceMotion) { lensShow(lensDd.length - 1); return; }
        var k = 0; lensShow(0);
        lensTimer = setInterval(function () {
            k++;
            if (k >= lensDd.length) { clearInterval(lensTimer); return; }
            lensShow(k);
        }, 1800);
    }
    $('lens-replay').addEventListener('click', lensPlay);
    lensPlay();

    /* ------------------------------------------------------------ worked examples */
    var TRACKS = [
        { label: 'Psychology: an experiment', color: '#c26a06', steps: [
            ['Topic', 'Time perception', 'A topic is a field, not a question – you could fill a library with it. You need a way in.'],
            ['Focus', 'How long waiting feels – and what influences it', 'Pick one everyday situation. Waiting is something everyone knows, it can be measured, and there is research on music and perceived waiting time to build on.'],
            ['First draft', 'Does music make waiting feel shorter?', 'A start. But it is closed (yes/no), and it hides the important choices: which music? Whose waiting? Shorter compared with what?'],
            ['Sharpened question', 'How does the tempo of background music influence how long Year 12 students think a wait lasted?', 'Now there is one thing that changes (tempo), one group (Year 12) and one outcome (the estimated duration). “How does … influence” keeps it open.'],
            ['Delimitation', 'One 3-minute wait · fast vs slow instrumental music · about 40 students at our school', 'Lyrics, volume and other age groups are out – on purpose. Write this down: it is a choice, not a gap.'],
            ['Working thesis', 'Students who wait with fast music judge a three-minute wait as shorter than students who wait with slow music.', 'A clear direction. If the fast-music group estimates the same or longer, the thesis is wrong – that is exactly what makes it testable.'],
            ['Own data', 'Experiment: two random groups, same room and instructions; everyone estimates the wait in seconds; compare the means.', 'The question already told you what to measure. That is the sign of a good question.']
        ]},
        { label: 'Literature: a text analysis', color: '#b83280', steps: [
            ['Topic', 'Time travel in fiction', 'Hundreds of novels, films and series – far too much for 15 pages.'],
            ['Focus', 'Time loops in young adult novels', 'Narrow it down by genre and audience. YA novels can be read and re-read within the seminar.'],
            ['First draft', 'Why are time loops so popular?', 'Interesting – but you would need sales figures and readers’ views from all over the world. Keep it as a hook for your introduction.'],
            ['Sharpened question', 'How do two YA time-loop novels use repeated scenes to show their protagonists’ development?', 'Material and aspect are named. “How … use” asks about technique – and technique can be analysed.'],
            ['Delimitation', 'Before I Fall (Oliver, 2010) and Opposite of Always (Reynolds, 2019) · first and last loop · changes in events, dialogue and perspective', 'Film adaptations and the physics of time loops are out. Two books are enough to compare.'],
            ['Working thesis', 'In both novels, repeated scenes change mainly in the protagonist’s perspective rather than in the events: the loop works as a tool for moral growth, not for suspense.', 'Arguable and testable: if most changes are in the events, the thesis is wrong.'],
            ['Own data', 'Systematic text analysis: list all repeated scenes, code each change as event, dialogue or perspective, count and compare.', 'Coding and counting turns close reading into data you can show in a table – and discuss.']
        ]},
        { label: 'Language: an error analysis', color: '#7c3aed', steps: [
            ['Topic', 'Tense and time in English', 'Grammar books are full of it – you need a question no grammar book has answered for your case.'],
            ['Focus', 'Present perfect vs simple past – a classic problem for German learners', 'A problem everyone in our school knows, with real texts to look at.'],
            ['First draft', 'Why is the present perfect difficult?', 'Very general – and partly answered by any grammar book. What exactly goes wrong, and when?'],
            ['Sharpened question', 'Which time expressions lead German Year 10 students to use the present perfect where English needs the simple past?', 'A specific group, a specific error and a specific trigger you can look for.'],
            ['Delimitation', '40 anonymised Year 10 essays (with permission) · only present perfect vs simple past · time expressions such as yesterday, last week, in 2019', 'Other tenses and spoken English are out.'],
            ['Working thesis', 'Most of these errors occur with time expressions that German combines with the Perfekt, such as gestern or letzte Woche – a sign of transfer from German.', 'If errors are spread evenly across all contexts, the thesis is wrong.'],
            ['Own data', 'Error analysis: mark every past-tense verb, note its time expression, count errors per expression.', 'A small corpus and a careful count – that is real linguistic research.']
        ]},
        { label: 'Computer science: a measurement', color: '#0f8f84', steps: [
            ['Topic', 'Time in computer systems', 'From atomic clocks to databases – where do you start?'],
            ['Focus', 'How accurate are the clocks we use every day?', 'Close to everyday life, and you can measure it yourself.'],
            ['First draft', 'Are clocks accurate?', 'Closed and vague: which clocks? Accurate compared with what? Over what time?'],
            ['Sharpened question', 'How far do the clocks of everyday devices at our school drift from official time within three weeks – and which kinds drift most?', 'Devices, place, time span and a reference are all there.'],
            ['Delimitation', '30 devices: phones, laptops, watches, wall and oven clocks · three weeks · reference: official German time (PTB, e.g. a radio-controlled clock)', 'How the clocks work inside is only background – the measurement is the core.'],
            ['Working thesis', 'Devices that synchronise via the internet stay within one second of official time, while offline clocks drift by several seconds per week.', 'If offline clocks keep perfect time, the thesis is wrong – and that would be a result, too.'],
            ['Own data', 'Measurement series: compare each device with the reference twice a week and record the difference in seconds.', 'A table, a chart per device type – and a clear answer to your question.']
        ]}
    ];

    /* pair section */
    var pq = $('pair-q'), pth = $('pair-th'), pdata = $('pair-data');
    function showPair(i) {
        var s = TRACKS[i].steps;
        [pq, pth, pdata].forEach(function (e) { e.classList.add('fade'); });
        setTimeout(function () {
            pq.textContent = s[3][1];
            pth.textContent = s[5][1];
            pdata.innerHTML = '<b>Own data:</b> ' + esc(s[6][1]);
            [pq, pth, pdata].forEach(function (e) { e.classList.remove('fade'); });
        }, reduceMotion ? 0 : 250);
    }
    pills($('pair-tabs'), TRACKS.map(function (t) { return t.label; }), showPair, 0);

    /* ladder */
    var rungs = $('rungs'), cur = 0, track = 0;
    function buildLadder(t) {
        track = t; cur = 0;
        var sec = $('ladder');
        sec.style.setProperty('--c', TRACKS[t].color);
        rungs.innerHTML = '';
        TRACKS[t].steps.forEach(function (st) {
            var li = document.createElement('li'); li.className = 'rung';
            li.innerHTML = '<span class="dot"></span><div class="lab">' + esc(st[0]) + '</div><div class="txt">' + esc(st[1]) + '</div>';
            rungs.appendChild(li);
        });
        showRung(0);
    }
    function showRung(k) {
        cur = k;
        var items = rungs.children, st = TRACKS[track].steps[k];
        for (var i = 0; i < items.length; i++) items[i].className = 'rung' + (i === k ? ' cur' : (i < k ? ' seen' : ''));
        $('why-h').textContent = (k + 1) + ' / ' + items.length + ' · ' + st[0];
        $('why-p').textContent = st[2];
        $('rung-prev').disabled = k === 0;
        $('rung-next').disabled = k === items.length - 1;
    }
    $('rung-prev').addEventListener('click', function () { if (cur > 0) showRung(cur - 1); });
    $('rung-next').addEventListener('click', function () { if (cur < TRACKS[track].steps.length - 1) showRung(cur + 1); });
    rungs.addEventListener('click', function (e) {
        var li = e.target.closest('.rung'); if (!li) return;
        showRung(Array.prototype.indexOf.call(rungs.children, li));
    });
    pills($('tracks'), TRACKS.map(function (t) { return t.label; }), buildLadder, 0);

    /* ------------------------------------------------------------ quiz */
    var MARKERS = ['Focused', 'Open', 'Researchable', 'Testable', 'Feasible', 'Relevant', 'Looks good'];
    var QUIZ = [
        { q: 'What is time dilation?', a: 'Open', fb: 'One search answers it – that is an encyclopedia entry, not a research question.', better: 'How accurately do popular time-travel films show time dilation – and what do viewers believe afterwards?' },
        { q: 'How has time been represented in literature?', a: 'Focused', fb: 'Which literature? Which aspect? That is a library, not a paper.', better: 'How do two time-loop novels use repeated scenes to show character development?' },
        { q: 'Is time travel to the past possible?', a: 'Testable', fb: 'You cannot collect any data on it – and physicists cannot settle it either.', better: 'Which kinds of time travel do Year 12 students find believable – and why?' },
        { q: 'Which streaming service do students use most?', a: 'Relevant', fb: 'Easy to survey – but what does it have to do with time? So what?', better: 'How well do Year 12 students estimate the time they spend streaming, compared with their screen-time data?' },
        { q: 'How does the time of day of a test (8 a.m. vs 11 a.m.) affect Year 12 students’ scores in a short concentration task?', a: 'Looks good', fb: 'Focused, open, built on chronotype research and testable with a small experiment.', better: 'Next step: check ethics and permission before you test anyone.' },
        { q: 'How do all English novels since 1900 use flashbacks?', a: 'Feasible', fb: 'Thousands of novels – you would need several lifetimes, not 15 pages.', better: 'How do Slaughterhouse-Five (1969) and one recent novel use flashbacks to show trauma?' },
        { q: 'Why is Interstellar the most accurate time-travel film ever made?', a: 'Open', fb: 'It already assumes the answer – and “most accurate ever” cannot be shown.', better: 'How accurately does Interstellar show time dilation – and do viewers understand it correctly afterwards?' },
        { q: 'How do people feel about time?', a: 'Focused', fb: 'Who? Which feeling? In which situation? Everything and nothing.', better: 'How long does a school year feel to Year 5 and to Year 12 students – and why?' },
        { q: 'What did Einstein write about time travel in his private letters?', a: 'Researchable', fb: 'You would need archive access most of us do not have – and you could not add your own data.', better: 'How do popular-science videos explain Einstein’s idea of time – and which explanation do students understand best?' }
    ];
    var qi = 0, results = [];
    var qOpts = $('quiz-opts'), qFb = $('quiz-fb'), qNext = $('quiz-next'), qProg = $('quiz-progress');
    QUIZ.forEach(function () { qProg.appendChild(document.createElement('i')); });
    function showQuiz() {
        var item = QUIZ[qi];
        $('quiz-q').textContent = '“' + item.q + '”';
        qFb.className = 'quiz-fb'; qFb.innerHTML = '';
        qNext.disabled = true;
        qOpts.innerHTML = '';
        MARKERS.forEach(function (m) {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = m;
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { answer(m, b); });
            qOpts.appendChild(b);
        });
        Array.prototype.forEach.call(qProg.children, function (el, i) {
            el.className = results[i] === true ? 'right' : results[i] === false ? 'wrong' : (i === qi ? 'cur' : '');
        });
    }
    function answer(m, btn) {
        if (!qNext.disabled) return;   // already answered
        var item = QUIZ[qi], ok = m === item.a;
        results[qi] = ok;
        Array.prototype.forEach.call(qOpts.children, function (b) { b.disabled = true; });
        btn.disabled = false; btn.setAttribute('aria-pressed', 'true');
        qFb.className = 'quiz-fb show ' + (ok ? 'ok' : 'no');
        qFb.innerHTML = '<b>' + (ok ? 'Yes – ' : 'Not quite. It’s mainly “' + esc(item.a) + '”: ') + '</b>' + esc(item.fb) +
            '<div class="better">' + (item.a === 'Looks good' ? esc(item.better) : '<b>Better:</b> ' + esc(item.better)) + '</div>';
        qNext.disabled = false;
        qNext.textContent = qi === QUIZ.length - 1 ? 'Start again' : 'Next question';
        qProg.children[qi].className = ok ? 'right' : 'wrong';
    }
    qNext.addEventListener('click', function () {
        if (qi === QUIZ.length - 1) { qi = 0; results = []; } else qi++;
        showQuiz();
    });
    showQuiz();

    /* ------------------------------------------------------------ thesis grows */
    var levels = document.querySelectorAll('#strength .st'), lv = 0;
    $('grow').addEventListener('click', function () {
        lv++;
        if (lv < levels.length) levels[lv].classList.remove('hidden');
        if (lv >= levels.length - 1) { this.textContent = 'Start again'; }
        if (lv >= levels.length) {
            lv = 0;
            for (var i = 1; i < levels.length; i++) levels[i].classList.add('hidden');
            this.textContent = 'Make it stronger';
        }
    });

    /* ------------------------------------------------------------ scope zoom */
    var ZOOM = [
        ['Time in literature', 3, 'Far too broad: a whole library.', '#b91c1c'],
        ['Time travel in novels', 18, 'Still too broad: hundreds of novels, dozens of techniques.', '#b91c1c'],
        ['Time loops in young adult novels', 38, 'Getting closer – but which novels, and which aspect?', '#b45309'],
        ['Repeated scenes and character growth in two YA time-loop novels', 64, 'Just right: two books, one aspect, and data you can collect by coding scenes.', '#059669'],
        ['The second breakfast scene in Before I Fall', 95, 'Too narrow: two pages – and nothing to compare.', '#b45309']
    ];
    function showZoom() {
        var z = ZOOM[+$('zoom').value];
        $('zoom-topic').textContent = z[0];
        $('needle').style.left = 'calc(' + z[1] + '% - 2px)';
        $('zoom-verdict').textContent = z[2];
        $('zoom-verdict').style.color = z[3];
    }
    $('zoom').addEventListener('input', showZoom);
    showZoom();

    /* ------------------------------------------------------------ timer */
    var clockEl = $('clock'), left = 600, tick = null;
    function drawClock() {
        var m = Math.floor(left / 60), s = left % 60;
        clockEl.textContent = m + ':' + String(s).padStart(2, '0');
        clockEl.style.color = left === 0 ? '#b91c1c' : '';
    }
    document.querySelectorAll('.timer [data-min]').forEach(function (b) {
        b.addEventListener('click', function () { clearInterval(tick); tick = null; left = +b.dataset.min * 60; $('clock-go').textContent = 'Start'; drawClock(); });
    });
    $('clock-go').addEventListener('click', function () {
        if (tick) { clearInterval(tick); tick = null; this.textContent = 'Start'; return; }
        if (left === 0) left = 600;
        this.textContent = 'Pause';
        var btn = this;
        tick = setInterval(function () {
            left = Math.max(0, left - 1); drawClock();
            if (left === 0) { clearInterval(tick); tick = null; btn.textContent = 'Start'; }
        }, 1000);
    });
    drawClock();

    /* ------------------------------------------------------------ builder */
    var KEY = 'wsRqOptions';
    var FIELDS = ['topic', 'q', 'th', 'data', 'in', 'out', 'src'];
    var store = { cur: 0, opts: [{}, {}, {}] };
    try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.opts && p.opts.length === 3) store = p; } } catch (e) { /* storage blocked */ }
    var saveNote = $('saved'), saveT = null;
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(store)); saveNote.textContent = 'Saved in this browser.'; }
        catch (e) { saveNote.textContent = 'Could not save in this browser – download a copy.'; }
        clearTimeout(saveT); saveT = setTimeout(function () { saveNote.textContent = ''; }, 1800);
    }
    var tabs = pills($('opt-tabs'), ['Option 1', 'Option 2', 'Option 3'], function (i) {
        store.cur = i;
        FIELDS.forEach(function (f) { $('f-' + f).value = store.opts[i][f] || ''; });
        coach();
    });
    FIELDS.forEach(function (f) {
        $('f-' + f).addEventListener('input', function () {
            store.opts[store.cur][f] = this.value;
            coach(); save();
        });
    });
    $('b-clear').addEventListener('click', function () {
        if (!confirm('Clear everything in option ' + (store.cur + 1) + '?')) return;
        store.opts[store.cur] = {}; tabs.pick(store.cur); save();
    });
    $('b-download').addEventListener('click', function () {
        var names = { topic: 'Topic and focus', q: 'Research question', th: 'Working thesis', data: 'My own data', in: 'In', out: 'Out', src: 'First sources' };
        var d = new Date(), out = 'W-Seminar "Time" – my research question options (' + d.toISOString().slice(0, 10) + ')\n';
        store.opts.forEach(function (o, i) {
            out += '\n=== Option ' + (i + 1) + ' ===\n';
            FIELDS.forEach(function (f) { out += names[f] + ':\n' + (o[f] ? o[f].trim() : '–') + '\n\n'; });
        });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain;charset=utf-8' }));
        a.download = d.toISOString().slice(0, 10) + '_research-question-options.txt';
        document.body.appendChild(a); a.click(); a.remove();
    });

    var VAGUE = /\b(people|society|humans|everyone|everything|always|never|nowadays|the world|today's youth|in general|things)\b/i;
    function coach() {
        var o = store.opts[store.cur], q = (o.q || '').trim(), th = (o.th || '').trim(), hints = [];
        function g(t) { hints.push('<li class="g">' + t + '</li>'); }
        function h(t) { hints.push('<li class="h">' + t + '</li>'); }
        if (!q) h('Start with your research question. Drafts are welcome – nobody sees them but you.');
        else {
            var words = q.split(/\s+/).length;
            if (!/\?\s*$/.test(q)) h('A research question ends with a question mark.');
            if (/^(what|who) (is|are|was|were)\b/i.test(q)) h('“What is …” sounds like an encyclopedia entry. Could you look it up? Try “How …” or “To what extent …”.');
            else if (/^(is|are|do|does|did|can|could|will|would|has|have)\b/i.test(q)) h('This is a yes/no question. Fine for an experiment – but would “To what extent …” or “How …” show what you really want to know?');
            else if (/^(how|to what extent|in what ways?|why|which|under what)\b/i.test(q)) g('Good opening – your question is open.');
            if (VAGUE.test(q)) h('“' + q.match(VAGUE)[0] + '” is very wide. Who or what exactly?');
            if (words < 7) h('Very short. Have you said who or what, where and when?');
            if (words > 40 || (q.match(/\?/g) || []).length > 1) h('This may be two questions. Pick one – the other can become a sub-question.');
            if (/\b(year \d+|students|novels?|films?|devices|essays|lyrics|[A-Z][a-z]+ [A-Z][a-z]+)\b/.test(q)) g('You name a group or material – that keeps it focused.');
        }
        if (q && !th) h('Now write a working thesis: “I expect that … because …”, then cut “I expect that”.');
        if (th) {
            if (/\?\s*$/.test(th)) h('Your thesis ends with a question mark – a thesis is a claim, not a question.');
            if (/\b(I think|in my opinion|I believe|I expect that)\b/i.test(th)) h('Cut “' + th.match(/\b(I think|in my opinion|I believe|I expect that)\b/i)[0] + '” – state the claim directly.');
            if (/\b(interesting|important|fascinating)\b/i.test(th)) h('“Interesting” or “important” isn’t a claim anyone can test. What exactly happens?');
            if (/\b(more|less|than|shorter|longer|higher|lower|most|mainly|rather than|because)\b/i.test(th)) g('Your thesis has a direction – good. Which result would prove it wrong?');
            else h('Add a direction: more or less than what? Mainly what – rather than what?');
        }
        if ((o.data || '').trim()) g('You know what data to collect. Next session: how to make it reliable.');
        else if (q) h('What will you measure, count, compare or ask – and from whom?');
        if ((o.out || '').trim()) g('You drew a line – that keeps the paper to 10–15 pages.');
        else if (q) h('List what is out on purpose. It saves you pages later.');
        $('coach').innerHTML = hints.join('');
        $('preview').innerHTML = q || th
            ? (q ? esc(q) : '') + (th ? '<span>Working thesis</span>' + esc(th) : '')
            : '<span>Your question and thesis will appear here.</span>';
    }
    tabs.pick(store.cur || 0);
})();
