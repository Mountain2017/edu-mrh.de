/* W-Seminar "Time" – interactive parts of w-seminar-time.html
   Plain JS, no libraries. All data stays in the browser. */
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
    function fmt(n, d) { return n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function pills(container, items, onPick, start) {
        var btns = items.map(function (it, i) {
            var b = document.createElement('button');
            b.className = 'pill';
            b.type = 'button';
            b.textContent = it.label;
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () { pick(i); });
            container.appendChild(b);
            return b;
        });
        function pick(i) {
            btns.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); });
            onPick(items[i], i);
        }
        if (start !== undefined) pick(start);
        return pick;
    }

    /* ---------------------------------------------------------- reveal */
    var rises = document.querySelectorAll('.rise');
    if ('IntersectionObserver' in window && !reduceMotion) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { threshold: 0.3 });
        rises.forEach(function (r) { io.observe(r); });
    } else {
        rises.forEach(function (r) { r.classList.add('in'); });
    }

    /* ---------------------------------------------------------- hero meter */
    var opened = Date.now();
    var VOYAGER_LIGHTDAY = Date.UTC(2026, 10, 18, 12, 0, 0);   // ≈ 18 Nov 2026
    var VOYAGER_RATE = 4.9;                                     // light-seconds further away per day (≈17 km/s)
    function voyagerLightSeconds(now) {
        return 86400 - (VOYAGER_LIGHTDAY - now) / 86400000 * VOYAGER_RATE;
    }
    function hms(sec) {
        sec = Math.max(0, Math.round(sec));
        var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
        return h + ' h ' + String(m).padStart(2, '0') + ' min ' + String(s).padStart(2, '0') + ' s';
    }
    function tickMeter() {
        var now = Date.now(), t = (now - opened) / 1000;
        $('m-open').textContent = t < 60 ? Math.floor(t) + ' s ago' : Math.floor(t / 60) + ' min ' + Math.floor(t % 60) + ' s ago';
        $('m-gps').textContent = fmt(t * 0.447, 1) + ' ns';   // +38.6 µs per day
        $('m-iss').textContent = fmt(t * 0.29, 1) + ' ns';    // ≈ −25 µs per day
        $('m-voy').textContent = hms(voyagerLightSeconds(now));
    }
    tickMeter();
    setInterval(tickMeter, 250);

    /* ---------------------------------------------------------- orrery */
    var RINGS = [
        { id: 'literature',       label: 'Literature',       color: '#e879b5', r: 228, mode: 'jump'   },
        { id: 'physics',          label: 'Physics',          color: '#7aa2ff', r: 196, mode: 'bend'   },
        { id: 'computer-science', label: 'Computer science', color: '#3fd1c2', r: 164, mode: 'tick'   },
        { id: 'psychology',       label: 'Psychology',       color: '#f6a54a', r: 132, mode: 'mood'   },
        { id: 'language',         label: 'Language',         color: '#b48cff', r: 100, mode: 'back'   },
        { id: 'beyond',           label: 'And beyond',       color: '#c7cad6', r: 68,  mode: 'steady' }
    ];
    var ringsG = $('rings');
    RINGS.forEach(function (R, i) {
        var a = el('a', { href: '#' + R.id }, ringsG);
        a.setAttribute('aria-label', R.label);
        var pathId = 'rp' + i;
        el('path', { id: pathId, d: 'M ' + (-R.r) + ' 0 A ' + R.r + ' ' + R.r + ' 0 1 1 ' + R.r + ' 0 A ' + R.r + ' ' + R.r + ' 0 1 1 ' + (-R.r) + ' 0', fill: 'none' }, a);
        var ring = el('circle', { r: R.r, class: 'ring', stroke: R.color }, a);
        var circ = 2 * Math.PI * R.r;
        if (!reduceMotion) {
            ring.style.strokeDasharray = circ;
            ring.style.strokeDashoffset = circ;
            ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.6,.05,.25,1) ' + (0.15 * i) + 's';
            requestAnimationFrame(function () { requestAnimationFrame(function () { ring.style.strokeDashoffset = 0; }); });
        }
        // wide invisible hit area so the thin ring is easy to click
        el('circle', { r: R.r, fill: 'none', stroke: 'transparent', 'stroke-width': 18 }, a);
        var t = el('text', { class: 'lbl', dy: -6 }, a);
        var tp = el('textPath', { href: '#' + pathId, startOffset: (6 + i * 3) + '%' }, t);
        tp.textContent = R.label;
        R.dot = el('circle', { r: i === 5 ? 5 : 6, fill: R.color }, a);
        R.phase = Math.random() * Math.PI * 2;
    });

    var handH = $('hand-h'), handS = $('hand-s');
    var last = performance.now();
    function placeDots(now) {
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        var tsec = now / 1000;
        RINGS.forEach(function (R, i) {
            var base = 0.55 - i * 0.04;           // rad/s
            switch (R.mode) {
                case 'bend':  R.phase += dt * base * (0.35 + 0.65 * Math.abs(Math.cos(R.phase))); break; // slows near the "mass"
                case 'tick':  R.phase = Math.floor(tsec * 2) * 0.18; break;                            // digital steps
                case 'mood':  R.phase += dt * base * (1 + 0.9 * Math.sin(tsec * 0.7)); break;          // drags and flies
                case 'back':  R.phase -= dt * base * 0.8; break;                                       // future behind you
                case 'jump':  R.phase += dt * base * 0.6; if (Math.random() < dt * 0.25) R.phase += 2.1; break; // flash-forwards
                default:      R.phase += dt * base * 0.5;
            }
            R.dot.setAttribute('cx', Math.cos(R.phase) * R.r);
            R.dot.setAttribute('cy', Math.sin(R.phase) * R.r);
        });
        var d = new Date();
        var hAngle = ((d.getHours() % 12) + d.getMinutes() / 60) * 30;
        var sAngle = (d.getSeconds() + d.getMilliseconds() / 1000) * 6;
        handH.setAttribute('transform', 'rotate(' + hAngle + ')');
        handS.setAttribute('transform', 'rotate(' + sAngle + ')');
        if (!reduceMotion) requestAnimationFrame(placeDots);
    }
    requestAnimationFrame(placeDots);
    if (reduceMotion) setInterval(function () { placeDots(performance.now()); }, 1000);

    /* ---------------------------------------------------------- literature */
    var MODES = [
        { label: 'The machine', told: ['*', 0, 1, 2, 3, 4, 5, '*'],
          text: 'The traveller builds a machine, chooses where to go and comes back to tell his dinner guests. The story is a report from a safe "now": framed, linear, past tense. Technology turns time into a place you can visit – and the far future becomes a mirror for Victorian class society.',
          works: 'H. G. Wells, The Time Machine (1895); also: Back to the Future (film, 1985)' },
        { label: 'Pulled back', told: [5, 0, 1, 2, 3, 4],
          text: 'Dana is dragged into slavery-era Maryland whenever her ancestor\'s life is in danger – she has no control at all. Butler opens with the ending (Dana has lost an arm) and then goes back: a flash-forward that turns every trip into a threat. The past refuses to stay in the past.',
          works: 'Octavia E. Butler, Kindred (1979); also: Diana Gabaldon, Outlander (1991)' },
        { label: 'Unstuck in time', told: [3, 0, 5, 1, 4, 2],
          text: 'Billy Pilgrim lives the moments of his life in random order. Vonnegut cuts the novel into fragments and keeps circling the firebombing of Dresden. The structure works like trauma itself: the past keeps breaking into the present.',
          works: 'Kurt Vonnegut, Slaughterhouse-Five (1969); also: Audrey Niffenegger, The Time Traveler\'s Wife (2003)' },
        { label: 'The loop', told: [0, 1, 2, 0, 1, 0, 1, 2, 3, 4],
          text: 'The same day restarts until the hero changes. Scenes are told again and again with small variations, and summary takes over ("for the hundredth time…"). Only the character\'s knowledge moves forward – so a loop story is really a story about learning.',
          works: 'Groundhog Day (film, 1993); Lauren Oliver, Before I Fall (2010); Edge of Tomorrow (film, 2014)' },
        { label: 'The vision', told: [2, 0, 1, 3, 4, 5],
          text: 'Three ghosts show Scrooge his past, his present and a possible future. He can watch but not touch – the time traveller becomes a spectator, and so does the reader. Because the future shown is only a possibility, the story turns into a moral choice.',
          works: 'Charles Dickens, A Christmas Carol (1843)' },
        { label: 'Knowing the future', told: [0, 4, 1, 5, 2, 3],
          text: 'Louise learns an alien language and begins to experience her whole life at once. She tells her daughter\'s life in the future tense – including how it ends – while also narrating the past. Grammar becomes the time machine. If you know what will happen, does choosing still matter?',
          works: 'Ted Chiang, "Story of Your Life" (1998); film: Arrival (2016)' },
        { label: 'The paradox', told: [4, 1, 3, 0, 2, 5],
          text: 'A time-travelling agent recruits a young man – who turns out to be his younger self, and his own mother and father. Cause and effect form a closed circle, the bootstrap paradox. The story works like a puzzle: the final reveal makes you re-read everything before it.',
          works: 'Robert A. Heinlein, "—All You Zombies—" (1959); Dark (TV, 2017–2020)' }
    ];
    var LET = 'ABCDEF';
    var storyX = function (i) { return 110 + i * 78; };
    var orderEvs = $('order-evs'), orderLinks = $('order-links');
    // story row – fixed
    var storyRow = el('g', {}, orderEvs);
    for (var s = 0; s < 6; s++) {
        var g = el('g', { transform: 'translate(' + storyX(s) + ',30)' }, storyRow);
        el('circle', { r: 12, fill: '#e7c6d9' }, g);
        var tx = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 12, 'font-weight': 600, fill: '#7a1f53' }, g); tx.textContent = LET[s];
    }
    var toldRow = el('g', {}, orderEvs);
    function showMode(m) {
        $('mode-text').textContent = m.text;
        $('mode-works').textContent = m.works;
        while (toldRow.firstChild) toldRow.removeChild(toldRow.firstChild);
        while (orderLinks.firstChild) orderLinks.removeChild(orderLinks.firstChild);
        var n = m.told.length, gap = Math.min(78, 430 / (n - 1 || 1)), start = 110;
        var seen = {};
        m.told.forEach(function (ev, k) {
            var x = start + k * gap;
            var isFrame = ev === '*';
            var again = !isFrame && seen[ev]; if (!isFrame) seen[ev] = true;
            var fromX = isFrame ? x : storyX(ev);
            var g = el('g', { class: 'ev' }, toldRow);
            el('circle', { r: isFrame ? 8 : 12, fill: isFrame ? '#9aa0b8' : '#b83280', opacity: again ? 0.55 : 1 }, g);
            var t = el('text', {}, g); t.textContent = isFrame ? '' : LET[ev] + (again ? '\u2032' : '');
            if (!isFrame) el('line', { x1: fromX, y1: 42, x2: x, y2: 92, stroke: '#b83280', 'stroke-opacity': 0.18, 'stroke-width': 1.5 }, orderLinks);
            if (reduceMotion) { g.style.transform = 'translate(' + x + 'px,104px)'; return; }
            g.style.transition = 'none';
            g.style.transform = 'translate(' + fromX + 'px,30px)';
            g.getBoundingClientRect();
            g.style.transition = '';
            setTimeout(function () { g.style.transform = 'translate(' + x + 'px,104px)'; }, 40 + k * 70);
        });
    }
    pills($('modes'), MODES, showMode, 0);

    /* ---------------------------------------------------------- light clocks */
    var cv = $('lightclock'), cx = cv.getContext('2d');
    var beta = 0.6, gamma = 1.25, t0 = performance.now();
    var shipX = 0, lastLC = performance.now(), ticksRest = 0, ticksMove = 0;
    var PERIOD = 1.4;       // seconds per tick of the clock at rest (one round trip)
    function updBeta() {
        beta = parseFloat($('beta').value);
        gamma = 1 / Math.sqrt(1 - beta * beta);
        $('beta-out').textContent = fmt(beta, 3).replace(/0$/, '') + ' c';
        $('gamma').textContent = gamma < 10 ? fmt(gamma, 2) : fmt(gamma, 1);
        var onboard = 10 / gamma;
        $('ship').textContent = (onboard >= 1 ? fmt(onboard, 1) + ' years' : fmt(onboard * 12, 1) + ' months');
        ticksRest = 0; ticksMove = 0; t0 = performance.now();
    }
    $('beta').addEventListener('input', updBeta);
    updBeta();
    function drawClock(x, top, h, phase, color) {
        cx.fillStyle = '#e8eefc';
        cx.fillRect(x - 22, top - 6, 44, 6); cx.fillRect(x - 22, top + h, 44, 6);
        var y = phase < 0.5 ? top + h - phase * 2 * h : top + (phase - 0.5) * 2 * h;
        cx.beginPath(); cx.arc(x, y, 6, 0, Math.PI * 2); cx.fillStyle = color; cx.fill();
        return y;
    }
    var trail = [];
    function frameLC(now) {
        var W = cv.width, H = cv.height, dt = Math.min(0.05, (now - lastLC) / 1000); lastLC = now;
        var el_s = (now - t0) / 1000;
        cx.clearRect(0, 0, W, H);
        cx.fillStyle = '#0f1433'; cx.fillRect(0, 0, W, H);
        cx.font = '600 13px Inter, sans-serif';
        var top = 60, h = 150;
        // clock at rest
        var pr = (el_s / PERIOD) % 1;
        drawClock(70, top, h, pr, '#d9ab2f');
        ticksRest = Math.floor(el_s / PERIOD);
        cx.fillStyle = '#cfd2f5';
        cx.fillText('At rest', 40, 30);
        cx.fillText('ticks: ' + ticksRest, 40, 248);
        // moving clock
        var speedPx = beta * 260;
        shipX += speedPx * dt;
        var span = W - 220;
        if (shipX > span) { shipX = 0; trail = []; }
        var mx = 180 + shipX;
        var pm = (el_s / (PERIOD * gamma)) % 1;
        var y = drawClock(mx, top, h, pm, '#7aa2ff');
        trail.push([mx, y]); if (trail.length > 160) trail.shift();
        cx.strokeStyle = 'rgba(122,162,255,.45)'; cx.lineWidth = 2; cx.beginPath();
        trail.forEach(function (p, i) { if (i === 0) cx.moveTo(p[0], p[1]); else cx.lineTo(p[0], p[1]); });
        cx.stroke();
        ticksMove = Math.floor(el_s / (PERIOD * gamma));
        cx.fillStyle = '#cfd2f5';
        cx.fillText('Moving at ' + fmt(beta, 2) + ' c', 180, 30);
        cx.fillText('ticks: ' + ticksMove, 180, 248);
        if (!reduceMotion) requestAnimationFrame(frameLC);
    }
    requestAnimationFrame(frameLC);
    if (reduceMotion) setInterval(function () { frameLC(performance.now()); }, 200);

    /* ---------------------------------------------------------- cosmic calendar */
    var AGE = 13.8e9;
    var CAL = [
        { label: 'Big Bang', ago: 13.8e9, note: 'Space, time and energy begin – as far as we can tell.' },
        { label: 'First stars', ago: 13.6e9, note: 'The first stars light up the young universe.' },
        { label: 'Sun and Earth', ago: 4.6e9, note: 'Our solar system forms from a collapsing cloud of gas and dust.' },
        { label: 'First life', ago: 3.8e9, note: 'Simple single-celled life appears in the oceans (date still debated).' },
        { label: 'Dinosaurs die out', ago: 66e6, note: 'An asteroid ends the age of the dinosaurs.' },
        { label: 'Homo sapiens', ago: 300e3, note: 'Our species appears in Africa.' },
        { label: 'Writing', ago: 5.2e3, note: 'All of written history fits into the last seconds of the year.' },
        { label: 'Einstein, 1905', ago: 121, note: 'Special relativity: time is no longer absolute.' },
        { label: 'You', ago: 17, note: 'Your whole life so far: a fraction of a second.' }
    ];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function calDate(ago) {
        var secs = (1 - ago / AGE) * 365 * 86400;
        var d = new Date(Date.UTC(2025, 0, 1) + secs * 1000);   // 2025: not a leap year
        var day = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
        if (d.getUTCMonth() === 11 && d.getUTCDate() === 31) {
            var rest = secs - 364 * 86400;
            var hh = Math.floor(rest / 3600), mm = Math.floor(rest % 3600 / 60), ss = rest % 60;
            return day + ', ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + (ss < 10 ? '0' : '') + fmt(ss, ss > 59 ? 3 : 1);
        }
        return day;
    }
    pills($('cal-events'), CAL, function (e) {
        $('cal-pin').style.left = ((1 - e.ago / AGE) * 100) + '%';
        $('cal-date').textContent = calDate(e.ago);
        $('cal-text').textContent = e.note;
    }, 0);

    /* ---------------------------------------------------------- signal delay */
    var TARGETS = [
        { label: 'Moon', sec: 1.28, color: '#cbd5e1', r: 7, speed: 1 },
        { label: 'Mars (closest)', sec: 182, color: '#c26a06', r: 9, speed: 60 },
        { label: 'Mars (farthest)', sec: 1340, color: '#c26a06', r: 9, speed: 300 },
        { label: 'Jupiter', sec: 2600, color: '#d6a46b', r: 14, speed: 600 },
        { label: 'Voyager 1', sec: null, color: '#94a3b8', r: 4, speed: 15000 }
    ];
    function durText(sec) {
        if (sec < 60) return fmt(sec, 2) + ' s';
        if (sec < 3600) return Math.round(sec / 60) + ' min';
        var h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60);
        if (m === 60) { h++; m = 0; }
        return h + ' h ' + m + ' min';
    }
    var pulse = $('sp-pulse'), spAnim = null;
    pills($('targets'), TARGETS, function (T) {
        var sec = T.sec === null ? voyagerLightSeconds(Date.now()) : T.sec;
        $('sp-name').textContent = T.label.replace(/ \(.*\)/, '');
        $('sp-target').setAttribute('fill', T.color);
        $('sp-target').setAttribute('r', T.r);
        $('sp-oneway').textContent = durText(sec);
        $('sp-round').textContent = durText(2 * sec);
        var anim = sec / T.speed;
        $('sp-note').textContent = T.speed === 1 ? 'Shown in real time.' : 'Animation ' + T.speed.toLocaleString('en-GB') + '× faster than reality.';
        if (spAnim) cancelAnimationFrame(spAnim);
        var t0 = performance.now();
        pulse.setAttribute('opacity', 1);
        (function step(now) {
            var p = Math.min(1, (now - t0) / 1000 / anim);
            pulse.setAttribute('cx', 58 + p * (548 - T.r - 58));
            if (p < 1 && !reduceMotion) spAnim = requestAnimationFrame(step);
            else pulse.setAttribute('cx', 548 - T.r);
        })(t0);
    });

    /* ---------------------------------------------------------- distributed clocks */
    // true times (s); server offsets: A 0, B −0.6, C −0.5
    var MSGS = [
        { who: 'Anna', node: 0, t: 1.00, text: '"Pizza at 8?"', to: [1, 2], lam: 1 },
        { who: 'Ben', node: 1, t: 1.40, text: '"Yes, 8 is perfect!"', to: [0, 2], lam: 3 },
        { who: 'Cleo', node: 2, t: 1.80, text: '"Then I\'ll bring dessert."', to: [0, 1], lam: 5 }
    ];
    var OFFSET = [0, -0.6, -0.5], NODE_Y = [30, 80, 130], LAT = 0.12;
    var xOf = function (t) { return 40 + (t - 0.85) / 1.25 * 540; };
    var dsG = $('ds-msgs'), lamport = false;
    function renderLogs() {
        var phys = MSGS.map(function (m) { return { m: m, ts: m.t + OFFSET[m.node] }; }).sort(function (a, b) { return a.ts - b.ts; });
        $('ds-phys').innerHTML = '';
        phys.forEach(function (p, i) {
            var li = document.createElement('li');
            li.textContent = fmt(p.ts, 2) + ' s · ' + p.m.who + ': ' + p.m.text;
            if (MSGS.indexOf(p.m) !== i) li.className = 'bad';
            $('ds-phys').appendChild(li);
        });
        $('ds-logic').innerHTML = '';
        if (!lamport) {
            var li = document.createElement('li'); li.className = 'small'; li.style.listStyle = 'none';
            li.textContent = 'Switch on "Use logical clocks" to see Lamport\'s fix.';
            $('ds-logic').appendChild(li);
            return;
        }
        MSGS.forEach(function (m) {
            var li = document.createElement('li');
            li.textContent = 'L=' + m.lam + ' · ' + m.who + ': ' + m.text;
            $('ds-logic').appendChild(li);
        });
    }
    function runDS() {
        while (dsG.firstChild) dsG.removeChild(dsG.firstChild);
        MSGS.forEach(function (m, i) {
            var x0 = xOf(m.t), y0 = NODE_Y[m.node];
            var delay = reduceMotion ? 0 : i * 700;
            setTimeout(function () {
                var c = el('circle', { cx: x0, cy: y0, r: 6, fill: '#0f8f84' }, dsG);
                var lb = el('text', { x: x0, y: y0 - 10, 'text-anchor': 'middle', 'font-size': 11, fill: '#0f8f84', 'font-weight': 600 }, dsG);
                lb.textContent = lamport ? 'L=' + m.lam : fmt(m.t + OFFSET[m.node], 2);
                m.to.forEach(function (n) {
                    var x1 = xOf(m.t + LAT), y1 = NODE_Y[n];
                    var ln = el('line', { x1: x0, y1: y0, x2: x0, y2: y0, stroke: '#0f8f84', 'stroke-width': 1.5, 'stroke-opacity': 0.6 }, dsG);
                    var t0 = performance.now();
                    (function grow(now) {
                        var p = reduceMotion ? 1 : Math.min(1, (now - t0) / 500);
                        ln.setAttribute('x2', x0 + (x1 - x0) * p); ln.setAttribute('y2', y0 + (y1 - y0) * p);
                        if (p < 1) requestAnimationFrame(grow);
                    })(t0);
                });
                if (i === MSGS.length - 1) setTimeout(renderLogs, reduceMotion ? 0 : 600);
            }, delay);
        });
    }
    $('ds-run').addEventListener('click', runDS);
    $('ds-lamport').addEventListener('click', function () {
        lamport = !lamport;
        this.setAttribute('aria-pressed', lamport ? 'true' : 'false');
        runDS();
    });
    renderLogs();

    /* ---------------------------------------------------------- clocks elsewhere */
    var Y2038 = Date.UTC(2038, 0, 19, 3, 14, 7);
    function tickElsewhere() {
        var now = Date.now();
        var jdUT = now / 86400000 + 2440587.5;
        var jdTT = jdUT + (37 + 32.184) / 86400;
        var msd = (jdTT - 2405522.0028779) / 1.0274912517;
        var mtc = ((msd % 1) + 1) % 1 * 24;
        var h = Math.floor(mtc), m = Math.floor(mtc % 1 * 60), s = Math.floor(mtc * 3600 % 60);
        $('mtc').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        $('msd').textContent = 'Mars Sol Date ' + Math.floor(msd).toLocaleString('en-GB');
        $('unix').textContent = String(Math.floor(now / 1000));
        var left = (Y2038 - now) / 1000;
        var y = Math.floor(left / (365.25 * 86400)), d = Math.floor(left % (365.25 * 86400) / 86400);
        $('y2038').textContent = y + ' y ' + d + ' d';
    }
    tickElsewhere();
    setInterval(tickElsewhere, 1000);

    /* ---------------------------------------------------------- ten seconds */
    var KEY = 'wsTimeGuesses';
    var data = { quiet: [], busy: [] };
    try { var raw = localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); } catch (e) { /* storage blocked: keep in memory */ }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } }
    var cond = 'quiet', running = false, startT = 0;
    document.querySelectorAll('#cond .pill').forEach(function (b) {
        b.addEventListener('click', function () {
            if (running) return;
            cond = b.dataset.cond;
            document.querySelectorAll('#cond .pill').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
            $('guess-msg').textContent = cond === 'busy'
                ? 'Press start, then count backwards out loud: 100, 93, 86 … Stop when you think ten seconds have passed.'
                : 'Press start, then stop when you think ten seconds have passed. No counting in the "just wait" condition.';
        });
    });
    $('guess-btn').addEventListener('click', function () {
        if (!running) {
            running = true; startT = performance.now();
            this.textContent = 'Stop';
            $('guess-stage').classList.add('running');
            $('guess-msg').textContent = cond === 'busy' ? 'Count backwards: 100, 93, 86 …' : 'Waiting …';
        } else {
            running = false;
            var sec = (performance.now() - startT) / 1000;
            this.textContent = 'Start';
            $('guess-stage').classList.remove('running');
            data[cond].push(Math.round(sec * 100) / 100);
            save();
            var diff = sec - 10;
            $('guess-msg').textContent = 'You stopped after ' + fmt(sec, 1) + ' s – ' + fmt(Math.abs(diff), 1) + ' s ' + (diff < 0 ? 'early.' : 'late.') + ' Try ' + (data[cond].length < 5 ? (5 - data[cond].length) + ' more.' : 'the other condition.');
            drawDots();
        }
    });
    $('guess-reset').addEventListener('click', function () {
        data = { quiet: [], busy: [] }; save(); drawDots();
        $('guess-msg').textContent = 'Data deleted. Start again whenever you like.';
    });
    function drawDots() {
        var svg = $('dots');
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var X = function (s) { return 120 + Math.min(20, s) / 20 * 420; };
        el('line', { x1: X(10), y1: 8, x2: X(10), y2: 100, stroke: '#1c1e33', 'stroke-dasharray': '3 4' }, svg);
        [0, 5, 10, 15, 20].forEach(function (s) { var t = el('text', { x: X(s), y: 116, 'text-anchor': 'middle' }, svg); t.textContent = s + ' s'; });
        [['quiet', 'Just wait', 35], ['busy', 'Counting', 78]].forEach(function (row) {
            var vals = data[row[0]] || [];
            var lab = el('text', { x: 0, y: row[2] + 4 }, svg); lab.textContent = row[1] + ' (' + vals.length + ')';
            el('line', { x1: X(0), y1: row[2], x2: X(20), y2: row[2], stroke: '#efe4d4' }, svg);
            vals.forEach(function (v) { el('circle', { cx: X(v), cy: row[2], r: 5, fill: '#c26a06', 'fill-opacity': 0.55 }, svg); });
            if (vals.length) {
                var mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
                el('rect', { x: X(mean) - 1.5, y: row[2] - 12, width: 3, height: 24, fill: '#1c1e33' }, svg);
                var mt = el('text', { x: X(mean), y: row[2] - 15, 'text-anchor': 'middle', fill: '#1c1e33' }, svg);
                mt.textContent = 'mean ' + fmt(mean, 1);
            }
        });
    }
    drawDots();

    /* ---------------------------------------------------------- age */
    function updAge() {
        var a = parseInt($('age').value, 10);
        var pct = 100 / a;
        $('age-out').textContent = a;
        $('age-pct').textContent = fmt(pct, pct < 10 ? 1 : 0) + ' %';
        $('age-arc').setAttribute('stroke-dasharray', (pct / 100 * 301.6) + ' 302');
        var weeks = 6 * a / 8;
        $('age-text').textContent = a > 8
            ? 'If Janet\'s "proportional theory" (1877) were right, six weeks of summer holiday at age 8 would feel as long as ' + fmt(weeks, 0) + ' weeks feel at ' + a + '. Most researchers today look for other causes: routine, fewer new experiences – and so fewer memories.'
            : 'Move the slider to see how the share of one year shrinks as you get older.';
    }
    $('age').addEventListener('input', updAge);
    updAge();

    /* ---------------------------------------------------------- Reichenbach */
    var TENSES = [
        { label: 'Simple present', E: 260, R: 260, S: 260, ex: 'She reads the letter.' },
        { label: 'Simple past', E: 150, R: 150, S: 350, ex: 'She read the letter yesterday.' },
        { label: 'Present perfect', E: 150, R: 350, S: 350, ex: 'She has read the letter. (German: "Sie hat ihn gestern gelesen" – English can\'t add "yesterday" here.)' },
        { label: 'Past perfect', E: 90, R: 220, S: 380, ex: 'She had read the letter before he arrived.' },
        { label: 'will-future', E: 350, R: 350, S: 150, ex: 'She will read the letter tomorrow.' },
        { label: 'going to', E: 350, R: 150, S: 150, ex: 'She\'s going to read it – the plan exists now.' },
        { label: 'Future perfect', E: 260, R: 400, S: 120, ex: 'By Friday she will have read the letter.' }
    ];
    var ptE = $('pt-E'), ptR = $('pt-R'), ptS = $('pt-S');
    [ptE, ptR, ptS].forEach(function (p) { p.style.transform = 'translateX(260px)'; });
    pills($('tenses'), TENSES, function (T) {
        ptE.style.transform = 'translateX(' + T.E + 'px)';
        ptR.style.transform = 'translateX(' + T.R + 'px)';
        ptS.style.transform = 'translateX(' + T.S + 'px)';
        $('rb-ex').textContent = T.ex;
    }, 1);

    /* ---------------------------------------------------------- dial */
    var DIAL = [
        { label: 'Philosophy', h: 'Philosophy: does the past still exist?', p: 'Around 400 AD Augustine admitted that he knew what time was – until someone asked him to explain it. In 1908 J. M. E. McTaggart argued that time is unreal. Many physicists today picture a "block universe" in which past, present and future all exist equally. So what makes "now" special?', q: 'Possible project: compare students\' intuitions about "now" with the physics view – survey plus argument analysis.' },
        { label: 'Biology', h: 'Biology: clocks in every cell', p: 'Almost every cell runs on a roughly 24-hour rhythm. The 2017 Nobel Prize in Medicine went to the researchers who found its molecular gears. In puberty the clock shifts later – teenagers are not lazy, they are out of sync.', q: 'Possible project: a one-week sleep diary in your year group – do later starts change how alert people feel?' },
        { label: 'History', h: 'History: who owns the time?', p: 'Until the 1840s every British town kept its own local time. Railways forced one standard time on the country, and in 1884 an international conference made Greenwich the zero line for the world. In 1582 the Gregorian calendar simply deleted ten days: 4 October was followed by 15 October.', q: 'Possible project: how did "railway time" change everyday life in Victorian Britain? Work with digitised newspapers.' },
        { label: 'Economics', h: 'Economics: a sweet now or two later?', p: 'People value the present more than the future – economists call it time preference. The famous marshmallow test (Walter Mischel, from the 1960s) linked waiting to later success. A large replication in 2018 found the effect much smaller once family background was taken into account.', q: 'Possible project: run a delay choice ("1 € now or 2 € next week?") across age groups – and think hard about ethics.' },
        { label: 'Media', h: 'Film and media: cutting time', p: 'Film can squeeze years into a montage or stretch one second into slow motion. Christopher Nolan\'s Dunkirk (2017) weaves a week, a day and an hour into one story. Films and trailers have been cut faster and faster for decades.', q: 'Possible project: measure shot lengths in film trailers from 1990 and today and test how viewers react.' },
        { label: 'Deep time', h: 'Earth: thinking in millions of years', p: 'In 1788 the geologist James Hutton found "no vestige of a beginning, no prospect of an end" in the rocks of Scotland. Today scientists argue whether humans have started a new epoch, the Anthropocene – in 2024 geologists voted not to make it official, at least for now.', q: 'Possible project: how do museums and textbooks visualise deep time – and which version do people actually understand?' }
    ];
    var numsG = $('dial-nums'), ticksG = $('ticks'), hand = $('dial-hand');
    for (var k = 0; k < 60; k++) {
        var a = k * 6 * Math.PI / 180, r1 = k % 5 === 0 ? 124 : 130;
        el('line', { x1: 150 + Math.sin(a) * r1, y1: 150 - Math.cos(a) * r1, x2: 150 + Math.sin(a) * 136, y2: 150 - Math.cos(a) * 136, stroke: '#c5c9d6', 'stroke-width': k % 5 === 0 ? 2 : 1 }, ticksG);
    }
    var dialBtns = DIAL.map(function (D, i) {
        var ang = i * 60, rad = ang * Math.PI / 180;
        var x = 150 + Math.sin(rad) * 98, y = 150 - Math.cos(rad) * 98;
        var g = el('g', { class: 'num', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': D.label }, numsG);
        el('circle', { cx: x, cy: y, r: 38 }, g);
        var t = el('text', { x: x, y: y }, g); t.textContent = D.label;
        function pick() {
            dialBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); });
            hand.style.transform = 'rotate(' + ang + 'deg)';
            $('dial-h').textContent = D.h; $('dial-p').textContent = D.p; $('dial-q').textContent = D.q;
        }
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        g.pick = pick;
        return g;
    });
    dialBtns[0].pick();

    /* ---------------------------------------------------------- generator */
    var REELS = [
        ['time perception', 'narrative order', 'time loops', 'clock synchronisation', 'the present perfect', 'chronotypes', 'time dilation', 'waiting time', 'the future tense', 'deep time', 'daylight saving time', 'time pressure'],
        ['Year 5 and Year 12 students', 'YA novels', 'film adaptations', 'smartphones and laptops', 'German learners\' essays', 'song lyrics since 1960', 'news articles', 'film trailers', 'grandparents and teenagers', 'museum exhibits', 'online gamers', 'our school'],
        ['a controlled experiment', 'a survey', 'a corpus count', 'close reading and comparison', 'a measurement series', 'interviews', 'a pre-test and post-test', 'a content analysis']
    ];
    var CELL = function () { return document.querySelector('.reel').clientHeight; };
    var strips = [0, 1, 2].map(function (i) { return $('reel' + i); });
    var current = [0, 0, 0];
    function fill(i, seq) {
        strips[i].innerHTML = '';
        seq.forEach(function (w) { var c = document.createElement('div'); c.className = 'cell'; c.textContent = w; strips[i].appendChild(c); });
    }
    strips.forEach(function (s, i) { fill(i, [REELS[i][0]]); });
    $('spin').addEventListener('click', function () {
        var btn = this; btn.disabled = true;
        var picks = REELS.map(function (r) { return Math.floor(Math.random() * r.length); });
        var done = 0;
        strips.forEach(function (s, i) {
            var R = REELS[i], seq = [R[current[i]]];
            var n = 10 + i * 5;
            for (var k = 1; k < n; k++) seq.push(R[Math.floor(Math.random() * R.length)]);
            seq.push(R[picks[i]]);
            fill(i, seq);
            var h = CELL();
            s.style.transition = 'none'; s.style.transform = 'translateY(0)';
            s.getBoundingClientRect();
            var dur = reduceMotion ? 0 : 1.1 + i * 0.45;
            s.style.transition = 'transform ' + dur + 's cubic-bezier(.15,.7,.2,1)';
            s.style.transform = 'translateY(' + (-(seq.length - 1) * h) + 'px)';
            setTimeout(function () {
                fill(i, [R[picks[i]]]); s.style.transition = 'none'; s.style.transform = 'translateY(0)';
                current[i] = picks[i];
                if (++done === 3) {
                    btn.disabled = false;
                    $('gen-out').innerHTML = 'What can <em>' + REELS[2][picks[2]] + '</em> reveal about <em>' + REELS[0][picks[0]] + '</em> – looking at <em>' + REELS[1][picks[1]] + '</em>?';
                }
            }, dur * 1000 + 30);
        });
    });
})();
