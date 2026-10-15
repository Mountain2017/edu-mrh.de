/* W-Seminar "Time" – online check engine.
   The questions in window.CHECK are encrypted (AES-256-GCM, key from the start
   code via PBKDF2). Without the start code nothing can be read. The page holds
   no answers: students hand in a result file, the teacher scores all files with
   the key file that stays on the teacher's computer (section "For teachers").
   Nothing is sent to a server; answers are kept in this browser until hand-in. */
(function () {
    'use strict';
    var C = window.CHECK, root = document.getElementById('check');
    if (!C || !root) return;
    var KEY = 'check:' + C.id;
    var PAYLOAD = null, ITEMS = {};

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
    function norm(code) { return String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
    function sha(s) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
            return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        });
    }
    function decrypt(code) {
        var enc = new TextEncoder();
        return crypto.subtle.importKey('raw', enc.encode(norm(code)), 'PBKDF2', false, ['deriveKey'])
            .then(function (base) {
                return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(C.kdf.salt), iterations: C.kdf.iter, hash: 'SHA-256' },
                    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
            })
            .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(C.iv) }, key, b64(C.data)); })
            .then(function (buf) {
                PAYLOAD = JSON.parse(new TextDecoder().decode(buf));
                ITEMS = {};
                PAYLOAD.slots.forEach(function (s) { s.variants.forEach(function (v) { ITEMS[v.id] = v; }); });
                return PAYLOAD;
            });
    }
    function rng(seed) {   // mulberry32
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function shuffle(arr, r) { arr = arr.slice(); for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
    function fmt(p) { return (Math.round(p * 2) / 2).toString().replace('.', ','); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function when(ts) { var d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function receipt(code, name, submittedAt, answers) {
        return sha([norm(code), C.id, name, submittedAt, JSON.stringify(answers)].join('|')).then(function (x) { return x.slice(0, 8).toUpperCase(); });
    }

    /* ---------------------------------------------------------------- state */
    var state = null;
    function load() { try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { state = null; } }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ } }
    function draw(seed) {
        var r = rng(seed), out = [];
        PAYLOAD.slots.forEach(function (s) {
            var v = s.variants[Math.floor(r() * s.variants.length)];
            out.push({ id: v.id, order: shuffle((v.options || v.rows).map(function (o) { return o.id; }), r) });
        });
        return out;
    }

    /* ---------------------------------------------------------------- teacher scoring (key file) */
    function scoreItem(k, ans) {
        if (!k) return 0;
        if (k.type === 'single') return ans === k.correct ? k.points : 0;
        if (k.type === 'multi') {
            ans = ans || [];
            var tp = ans.filter(function (a) { return k.correct.indexOf(a) >= 0; }).length, fp = ans.length - tp;
            return Math.round(Math.max(0, tp - fp) / k.correct.length * k.points * 2) / 2;
        }
        ans = ans || {};
        var rows = Object.keys(k.correct), right = rows.filter(function (r) { return ans[r] === k.correct[r]; }).length;
        return Math.round(right / rows.length * k.points * 2) / 2;
    }
    function np(scale, percent) { for (var i = 0; i < scale.length; i++) if (percent >= scale[i][0]) return scale[i][1]; return 0; }

    function teacherTools() {
        return '<details class="ck-teacher"><summary>For teachers: score result files</summary>' +
            '<p class="ck-small">1. Choose the key file (<code>…-key.json</code> from your computer). 2. Choose all result files your students handed in. The key never leaves your computer.</p>' +
            '<label class="ck-small" for="ck-keyfile">Key file</label><input type="file" id="ck-keyfile" accept=".json,application/json">' +
            '<label class="ck-small" for="ck-files">Result files</label><input type="file" id="ck-files" accept=".json,application/json" multiple>' +
            '<div id="ck-table"></div></details>';
    }
    function wireTeacher() {
        var kIn = document.getElementById('ck-keyfile'), fIn = document.getElementById('ck-files');
        if (!kIn) return;
        function run() {
            var box = document.getElementById('ck-table');
            if (!kIn.files[0] || !fIn.files.length) { box.innerHTML = ''; return; }
            kIn.files[0].text().then(function (kt) {
                var key; try { key = JSON.parse(kt); } catch (e) { box.textContent = 'The key file could not be read.'; return; }
                if (key.check !== C.id) { box.textContent = 'This key belongs to another check.'; return; }
                Promise.all(Array.prototype.map.call(fIn.files, function (f) {
                    return f.text().then(function (t) {
                        var r; try { r = JSON.parse(t); } catch (e) { return { file: f.name, err: 'not a result file' }; }
                        if (r.check !== C.id) return { file: f.name, err: 'belongs to another check' };
                        var per = r.draw.map(function (d) { return scoreItem(key.items[d.id], (r.answers || {})[d.id]); });
                        var pts = per.reduce(function (a, b) { return a + b; }, 0), pc = Math.round(pts / key.max * 1000) / 10;
                        return receipt(key.startCode, r.name, r.submittedAt, r.answers || {}).then(function (rc) {
                            return { r: r, per: per, pts: pts, pc: pc, np: np(key.scale, pc), ok: rc === r.receipt };
                        });
                    });
                })).then(function (rows) {
                    rows.sort(function (a, b) { return (a.r ? a.r.name : '').localeCompare(b.r ? b.r.name : ''); });
                    var html = '<table class="ck-res"><tr><th>name</th><th>points</th><th>%</th><th>NP</th><th>per task</th><th>handed in</th><th>receipt</th></tr>';
                    var csv = 'name;points;max;percent;np;per task;handed in;receipt\n';
                    rows.forEach(function (x) {
                        if (x.err) { html += '<tr><td colspan="7">' + esc(x.file) + ': ' + x.err + '</td></tr>'; return; }
                        var pc = String(x.pc).replace('.', ','), per = x.per.map(fmt).join(' · ');
                        html += '<tr><td>' + esc(x.r.name) + '</td><td>' + fmt(x.pts) + ' / ' + key.max + '</td><td>' + pc + '</td><td><b>' + x.np + '</b></td><td class="ck-small">' + per + '</td><td>' + when(x.r.submittedAt) + '</td><td>' + (x.ok ? esc(x.r.receipt) + ' ✓' : '<span class="ck-warn">changed?</span>') + '</td></tr>';
                        csv += [x.r.name, fmt(x.pts), key.max, pc, x.np, per, when(x.r.submittedAt), x.ok ? 'ok' : 'check'].join(';') + '\n';
                    });
                    html += '</table><button class="ck-btn ck-ghost" id="ck-csv">Download table (.csv)</button>';
                    box.innerHTML = html;
                    document.getElementById('ck-csv').addEventListener('click', function () {
                        var a = document.createElement('a');
                        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
                        a.download = C.id + '_results.csv'; document.body.appendChild(a); a.click(); a.remove();
                    });
                });
            });
        }
        kIn.addEventListener('change', run); fIn.addEventListener('change', run);
    }

    /* ---------------------------------------------------------------- screens */
    var tick = null;
    function render() {
        clearInterval(tick);
        load();
        if (!state) return renderStart();
        if (!PAYLOAD) {
            root.innerHTML = '<div class="ck-card"><p>Loading …</p></div>';
            return decrypt(state.code).then(render, function () { state = null; try { localStorage.removeItem(KEY); } catch (e) { } renderStart(); });
        }
        if (!state.submittedAt) return renderTest();
        return renderDone();
    }

    function renderStart() {
        root.innerHTML =
            '<div class="ck-card ck-start">' +
            '<p class="ck-kicker">' + esc(C.subtitle) + '</p><h1>' + esc(C.title) + '</h1>' +
            '<ul class="ck-facts"><li><b>' + C.minutes + '</b> minutes</li><li><b>' + C.max + '</b> points</li><li><b>' + C.tasks + '</b> tasks</li></ul>' +
            '<p>Work on your own. You may not use other pages, notes or tools. Your answers are saved in this browser as you go; the timer keeps running if you reload. At the end, save your result file and hand it in as your teacher tells you.</p>' +
            (C.unitPage ? '<p class="ck-small">What the check covers: <a href="' + esc(C.unitPage) + '#check">can-do list</a>.</p>' : '') +
            '<label for="ck-name">First and last name</label><input id="ck-name" autocomplete="name">' +
            '<label for="ck-code">Start code from your teacher</label><input id="ck-code" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX">' +
            '<p class="ck-err" id="ck-err" aria-live="polite"></p>' +
            '<button class="ck-btn" id="ck-go">Start the check</button></div>' + teacherTools();
        if (!window.crypto || !crypto.subtle) document.getElementById('ck-err').textContent = 'This page needs a secure connection (https). Please open it via edu-mrh.de.';
        document.getElementById('ck-go').addEventListener('click', function () {
            var btn = this, name = document.getElementById('ck-name').value.trim(), cd = document.getElementById('ck-code').value;
            var err = document.getElementById('ck-err');
            if (name.split(/\s+/).length < 2) { err.textContent = 'Please enter your first and last name.'; return; }
            btn.disabled = true; err.textContent = 'Checking the code …';
            decrypt(cd).then(function () {
                var seed = Math.floor(Math.random() * 2147483647);
                state = { name: name, code: norm(cd), seed: seed, draw: draw(seed), answers: {}, startedAt: Date.now(), submittedAt: null };
                save(); render(); window.scrollTo(0, 0);
            }, function () { btn.disabled = false; err.textContent = 'This start code is not correct.'; });
        });
        wireTeacher();
    }

    function itemHTML(d, n) {
        var it = ITEMS[d.id], a = state.answers[it.id];
        var html = '<fieldset class="ck-item" data-id="' + it.id + '"><legend><span class="ck-n">' + n + '</span><span class="ck-pts">' + fmt(it.points) + ' P</span></legend><div class="ck-prompt">' + it.prompt + '</div>';
        if (it.type === 'single' || it.type === 'multi') {
            var byId = {}; it.options.forEach(function (o) { byId[o.id] = o; });
            if (it.type === 'multi') html += '<p class="ck-small">Select all that apply.</p>';
            html += '<div class="ck-opts">';
            d.order.forEach(function (oid) {
                var checked = it.type === 'single' ? a === oid : (a || []).indexOf(oid) >= 0;
                html += '<label class="ck-opt"><input type="' + (it.type === 'single' ? 'radio' : 'checkbox') + '" name="q' + it.id + '" value="' + oid + '"' + (checked ? ' checked' : '') + '><span>' + byId[oid].text + '</span></label>';
            });
            html += '</div>';
        } else {
            var rows = {}; it.rows.forEach(function (r) { rows[r.id] = r; });
            html += '<div class="ck-match">';
            d.order.forEach(function (rid) {
                var val = (a || {})[rid] || '';
                html += '<div class="ck-row"><span>' + rows[rid].text + '</span><select data-row="' + rid + '" aria-label="answer"><option value="">– choose –</option>' +
                    it.categories.map(function (c) { return '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>';
            });
            html += '</div>';
        }
        return html + '</fieldset>';
    }
    function answered(d) {
        var a = state.answers[d.id], it = ITEMS[d.id];
        if (it.type === 'single') return !!a;
        if (it.type === 'multi') return !!(a && a.length);
        return !!a && Object.keys(a).filter(function (k) { return a[k]; }).length === it.rows.length;
    }
    function renderTest() {
        var html = '<div class="ck-bar" role="status"><span class="ck-who">' + esc(state.name) + '</span><span id="ck-prog"></span><span class="ck-time" id="ck-time"></span></div>';
        html += '<div class="ck-card"><p class="ck-kicker">' + esc(C.subtitle) + '</p><h1>' + esc(C.title) + '</h1></div>';
        state.draw.forEach(function (d, i) { html += itemHTML(d, i + 1); });
        html += '<div class="ck-card ck-end"><p id="ck-left"></p><button class="ck-btn" id="ck-submit">Hand in</button></div>';
        root.innerHTML = html;
        root.querySelectorAll('.ck-item').forEach(function (fs) {
            var id = fs.dataset.id, it = ITEMS[id];
            fs.addEventListener('change', function () {
                if (it.type === 'single') { var c = fs.querySelector('input:checked'); state.answers[id] = c ? c.value : null; }
                else if (it.type === 'multi') { state.answers[id] = Array.prototype.map.call(fs.querySelectorAll('input:checked'), function (x) { return x.value; }); }
                else { var m = {}; fs.querySelectorAll('select').forEach(function (s) { if (s.value) m[s.dataset.row] = s.value; }); state.answers[id] = m; }
                save(); progress();
            });
        });
        document.getElementById('ck-submit').addEventListener('click', function () {
            var open = state.draw.filter(function (d) { return !answered(d); }).length;
            if (!confirm(open ? open + ' task(s) are not complete. Hand in anyway?' : 'Hand in now? You cannot change your answers afterwards.')) return;
            submit();
        });
        progress(); clock(); tick = setInterval(clock, 1000);
    }
    function progress() {
        var done = state.draw.filter(answered).length;
        document.getElementById('ck-prog').textContent = done + ' / ' + state.draw.length + ' answered';
        var left = document.getElementById('ck-left');
        if (left) left.textContent = done === state.draw.length ? 'All tasks answered. Check your answers, then hand in.' : (state.draw.length - done) + ' task(s) still open.';
    }
    function clock() {
        var rest = Math.round(C.minutes * 60 - (Date.now() - state.startedAt) / 1000);
        var el = document.getElementById('ck-time'); if (!el) return;
        if (rest <= 0) { el.textContent = '0:00'; submit(); return; }
        el.textContent = Math.floor(rest / 60) + ':' + pad(rest % 60);
        el.classList.toggle('ck-low', rest <= 120);
    }
    function submit() {
        clearInterval(tick);
        if (state.submittedAt) return;
        state.submittedAt = Date.now();
        save(); render(); window.scrollTo(0, 0);
    }

    function renderDone() {
        receipt(state.code, state.name, state.submittedAt, state.answers).then(function (rc) {
            state.receipt = rc; save();
            var done = state.draw.filter(answered).length, mins = Math.round((state.submittedAt - state.startedAt) / 60000);
            root.innerHTML = '<div class="ck-card ck-result">' +
                '<p class="ck-kicker">' + esc(C.title) + '</p><h1>' + esc(state.name) + '</h1>' +
                '<div class="ck-score"><div><span>✓</span> handed in</div><div><span>' + done + '</span> of ' + state.draw.length + ' answered</div></div>' +
                '<p class="ck-small">' + when(state.submittedAt) + ' · ' + mins + ' min · receipt <b class="ck-code">' + rc + '</b></p>' +
                '<button class="ck-btn" id="ck-save">Save result file</button>' +
                '<p class="ck-small">Hand in the result file as your teacher tells you (e.g. Teams). Your teacher scores it – you get your result later. Keep this screen open until your teacher has seen it.</p>' +
                '<details class="ck-reset"><summary>New attempt (teacher)</summary><input id="ck-rcode" placeholder="start code" autocomplete="off"><button class="ck-btn ck-ghost" id="ck-reset">Reset this browser</button></details></div>' +
                teacherTools();
            document.getElementById('ck-save').addEventListener('click', function () {
                var file = { check: C.id, title: C.title, name: state.name, startedAt: state.startedAt, submittedAt: state.submittedAt, draw: state.draw, answers: state.answers, receipt: rc };
                var a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' }));
                a.download = C.id + '_' + state.name.replace(/[^\wäöüÄÖÜß-]+/g, '-') + '.json';
                document.body.appendChild(a); a.click(); a.remove();
            });
            document.getElementById('ck-reset').addEventListener('click', function () {
                if (norm(document.getElementById('ck-rcode').value) !== state.code) { alert('Wrong code.'); return; }
                try { localStorage.removeItem(KEY); } catch (e) { }
                state = null; PAYLOAD = null; render();
            });
            wireTeacher();
        });
    }

    render();
})();
