/* Online check – student page (generic, works for any check built with build_check.py).

   Page markup:  <div id="check" data-title="Check 1"></div>
                 <script defer src="<name>.js"></script>      (window.CHECK, encrypted)
                 <script defer src="check-engine.js"></script>
   Language of the page texts: <html lang="en|de">.

   window.CHECK = {id, build, kdf: {salt, iter}, iv, data}. Everything else –
   title, time, tasks, points, questions – is encrypted (AES-256-GCM, key from
   the start code via PBKDF2). Without the start code nothing can be read, and
   the page holds no answers at all. Students save a result file at the end;
   the teacher scores all files on the separate scoring page with the key file,
   which never leaves the teacher's computer. Nothing is sent to a server;
   answers are kept in this browser (localStorage) until hand-in. */
(function () {
    'use strict';
    var C = window.CHECK, root = document.getElementById('check');
    if (!C || !root) return;
    var KEY = 'check:' + C.id;
    var PAYLOAD = null, META = null, ITEMS = {};

    var TXT = {
        en: {
            check: 'Online check', rules: 'Work on your own. You may not use other pages, notes or tools. The time starts when you enter the start code. Your answers are saved in this browser as you go; the timer keeps running if you reload. At the end, save your result file and hand it in as your teacher tells you.',
            name: 'First and last name', code: 'Start code from your teacher', start: 'Start the check', https: 'This page needs a secure connection (https).',
            needName: 'Please enter your first and last name.', checking: 'Checking the code …', wrong: 'This start code is not correct.', loading: 'Loading …',
            min: 'minutes', tasks: 'tasks', points: 'points', all: 'Select all that apply.', choose: '– choose –', answer: 'answer',
            answered: 'answered', handIn: 'Hand in', allDone: 'All tasks answered. Check your answers, then hand in.', open: 'task(s) still open.',
            confirmOpen: ' task(s) are not complete. Hand in anyway?', confirm: 'Hand in now? You cannot change your answers afterwards.',
            handed: 'handed in', of: 'of', receipt: 'receipt', save: 'Save result file',
            after: 'Hand in the result file as your teacher tells you (e.g. Teams). Your teacher scores it – you get your result later. Keep this screen open until your teacher has seen it.',
            reset: 'New attempt (teacher)', resetBtn: 'Reset this browser', resetCode: 'start code', wrongCode: 'Wrong code.',
            changed: 'This check has been updated since you started. Please ask your teacher.'
        },
        de: {
            check: 'Online-Check', rules: 'Arbeite allein. Andere Seiten, Notizen und Hilfsmittel sind nicht erlaubt. Die Zeit läuft ab der Eingabe des Startcodes. Deine Antworten werden laufend in diesem Browser gespeichert; beim Neuladen läuft die Zeit weiter. Speichere am Ende deine Ergebnisdatei und gib sie ab, wie es deine Lehrkraft sagt.',
            name: 'Vor- und Nachname', code: 'Startcode deiner Lehrkraft', start: 'Check starten', https: 'Diese Seite braucht eine sichere Verbindung (https).',
            needName: 'Bitte gib Vor- und Nachnamen ein.', checking: 'Code wird geprüft …', wrong: 'Dieser Startcode stimmt nicht.', loading: 'Wird geladen …',
            min: 'Minuten', tasks: 'Aufgaben', points: 'Punkte', all: 'Kreuze alle zutreffenden an.', choose: '– wählen –', answer: 'Antwort',
            answered: 'beantwortet', handIn: 'Abgeben', allDone: 'Alle Aufgaben beantwortet. Prüfe deine Antworten, dann gib ab.', open: 'Aufgabe(n) noch offen.',
            confirmOpen: ' Aufgabe(n) sind unvollständig. Trotzdem abgeben?', confirm: 'Jetzt abgeben? Danach kannst du nichts mehr ändern.',
            handed: 'abgegeben', of: 'von', receipt: 'Quittung', save: 'Ergebnisdatei speichern',
            after: 'Gib die Ergebnisdatei ab, wie es deine Lehrkraft sagt (z. B. Teams). Die Lehrkraft wertet sie aus – dein Ergebnis bekommst du später. Lass diesen Bildschirm offen, bis deine Lehrkraft ihn gesehen hat.',
            reset: 'Neuer Versuch (Lehrkraft)', resetBtn: 'Browser zurücksetzen', resetCode: 'Startcode', wrongCode: 'Falscher Code.',
            changed: 'Dieser Check wurde geändert, seit du begonnen hast. Bitte melde dich bei deiner Lehrkraft.'
        }
    };
    var T = TXT[(document.documentElement.lang || 'en').slice(0, 2)] || TXT.en;

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
                META = PAYLOAD.meta;
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
    // same formula on the scoring page: detects edited result files
    function receipt(code, name, submittedAt, answers) {
        return sha([norm(code), C.id, name, submittedAt, JSON.stringify(answers)].join('|')).then(function (x) { return x.slice(0, 8).toUpperCase(); });
    }

    /* ---------------------------------------------------------------- state */
    var state = null;
    function load() { try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { state = null; } }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ } }
    function clear() { try { localStorage.removeItem(KEY); } catch (e) { } state = null; }
    function draw(seed) {   // one variant per slot, options/rows in a random order
        var r = rng(seed), out = [];
        PAYLOAD.slots.forEach(function (s) {
            var v = s.variants[Math.floor(r() * s.variants.length)];
            out.push({ id: v.id, order: shuffle((v.options || v.rows).map(function (o) { return o.id; }), r) });
        });
        return out;
    }

    /* ---------------------------------------------------------------- screens */
    var tick = null;
    function render() {
        clearInterval(tick);
        load();
        if (!state) return renderStart();
        if (state.build && state.build !== C.build && !state.submittedAt) {
            root.innerHTML = '<div class="ck-card"><p class="ck-err">' + T.changed + '</p></div>' + resetBox(state.code);
            return wireReset(state.code);
        }
        if (!PAYLOAD) {
            root.innerHTML = '<div class="ck-card"><p>' + T.loading + '</p></div>';
            return decrypt(state.code).then(render, function () { clear(); renderStart(); });
        }
        if (!state.submittedAt) return renderTest();
        return renderDone();
    }

    function renderStart() {
        root.innerHTML =
            '<div class="ck-card ck-start">' +
            '<h1>' + esc(root.dataset.title || T.check) + '</h1>' +
            '<p>' + T.rules + '</p>' +
            '<label for="ck-name">' + T.name + '</label><input id="ck-name" autocomplete="name">' +
            '<label for="ck-code">' + T.code + '</label><input id="ck-code" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX">' +
            '<p class="ck-err" id="ck-err" aria-live="polite"></p>' +
            '<button class="ck-btn" id="ck-go">' + T.start + '</button></div>';
        if (!window.crypto || !crypto.subtle) document.getElementById('ck-err').textContent = T.https;
        document.getElementById('ck-go').addEventListener('click', function () {
            var btn = this, name = document.getElementById('ck-name').value.trim(), cd = document.getElementById('ck-code').value;
            var err = document.getElementById('ck-err');
            if (name.split(/\s+/).length < 2) { err.textContent = T.needName; return; }
            btn.disabled = true; err.textContent = T.checking;
            decrypt(cd).then(function () {
                var seed = Math.floor(Math.random() * 2147483647);
                state = { name: name, code: norm(cd), build: C.build, seed: seed, draw: draw(seed), answers: {}, startedAt: Date.now(), submittedAt: null };
                save(); render(); window.scrollTo(0, 0);
            }, function () { btn.disabled = false; err.textContent = T.wrong; });
        });
    }

    function itemHTML(d, n) {
        var it = ITEMS[d.id], a = state.answers[it.id];
        var html = '<fieldset class="ck-item" data-id="' + esc(it.id) + '"><legend><span class="ck-n">' + n + '</span><span class="ck-pts">' + fmt(it.points) + ' P</span></legend><div class="ck-prompt">' + it.prompt + '</div>';
        if (it.type === 'single' || it.type === 'multi') {
            var byId = {}; it.options.forEach(function (o) { byId[o.id] = o; });
            if (it.type === 'multi') html += '<p class="ck-small">' + T.all + '</p>';
            html += '<div class="ck-opts">';
            d.order.forEach(function (oid) {
                var checked = it.type === 'single' ? a === oid : (a || []).indexOf(oid) >= 0;
                html += '<label class="ck-opt"><input type="' + (it.type === 'single' ? 'radio' : 'checkbox') + '" name="q' + esc(it.id) + '" value="' + oid + '"' + (checked ? ' checked' : '') + '><span>' + byId[oid].text + '</span></label>';
            });
            html += '</div>';
        } else {
            var rows = {}; it.rows.forEach(function (r) { rows[r.id] = r; });
            html += '<div class="ck-match">';
            d.order.forEach(function (rid) {
                var val = (a || {})[rid] || '';
                html += '<div class="ck-row"><span>' + rows[rid].text + '</span><select data-row="' + rid + '" aria-label="' + T.answer + '"><option value="">' + T.choose + '</option>' +
                    it.categories.map(function (c) { return '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>';
            });
            html += '</div>';
        }
        return html + '</fieldset>';
    }
    function answered(d) {
        var a = state.answers[d.id], it = ITEMS[d.id];
        if (!it) return false;
        if (it.type === 'single') return !!a;
        if (it.type === 'multi') return !!(a && a.length);
        return !!a && Object.keys(a).filter(function (k) { return a[k]; }).length === it.rows.length;
    }
    function renderTest() {
        var html = '<div class="ck-bar" role="status"><span class="ck-who">' + esc(state.name) + '</span><span id="ck-prog"></span><span class="ck-time" id="ck-time"></span></div>';
        html += '<div class="ck-card"><p class="ck-kicker">' + esc(META.subtitle) + '</p><h1>' + esc(META.title) + '</h1>' +
            '<p class="ck-small">' + META.minutes + ' ' + T.min + ' · ' + META.tasks + ' ' + T.tasks + ' · ' + fmt(META.max) + ' ' + T.points + '</p></div>';
        state.draw.forEach(function (d, i) { html += itemHTML(d, i + 1); });
        html += '<div class="ck-card ck-end"><p id="ck-left"></p><button class="ck-btn" id="ck-submit">' + T.handIn + '</button></div>';
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
            if (!confirm(open ? open + T.confirmOpen : T.confirm)) return;
            submit();
        });
        progress(); clock(); tick = setInterval(clock, 1000);
    }
    function progress() {
        var done = state.draw.filter(answered).length;
        document.getElementById('ck-prog').textContent = done + ' / ' + state.draw.length + ' ' + T.answered;
        var left = document.getElementById('ck-left');
        if (left) left.textContent = done === state.draw.length ? T.allDone : (state.draw.length - done) + ' ' + T.open;
    }
    function clock() {
        var rest = Math.round(META.minutes * 60 - (Date.now() - state.startedAt) / 1000);
        var el = document.getElementById('ck-time'); if (!el) return;
        if (rest <= 0) { el.textContent = '0:00'; submit(); return; }
        el.textContent = Math.floor(rest / 60) + ':' + pad(rest % 60);
        el.classList.toggle('ck-low', rest <= 120);
    }
    function submit() {
        clearInterval(tick);
        if (state.submittedAt) return;
        state.submittedAt = Date.now();
        state.done = state.draw.filter(answered).length;
        save(); render(); window.scrollTo(0, 0);
    }

    function resetBox() {
        return '<details class="ck-reset"><summary>' + T.reset + '</summary><input id="ck-rcode" placeholder="' + T.resetCode + '" autocomplete="off"><button class="ck-btn ck-ghost" id="ck-reset">' + T.resetBtn + '</button></details>';
    }
    function wireReset(code) {
        document.getElementById('ck-reset').addEventListener('click', function () {
            if (norm(document.getElementById('ck-rcode').value) !== code) { alert(T.wrongCode); return; }
            clear(); PAYLOAD = null; render();
        });
    }

    function renderDone() {
        receipt(state.code, state.name, state.submittedAt, state.answers).then(function (rc) {
            state.receipt = rc; save();
            var done = state.done != null ? state.done : state.draw.filter(answered).length, mins = Math.round((state.submittedAt - state.startedAt) / 60000);
            root.innerHTML = '<div class="ck-card ck-result">' +
                '<p class="ck-kicker">' + esc(META.title) + '</p><h1>' + esc(state.name) + '</h1>' +
                '<div class="ck-score"><div><span>✓</span> ' + T.handed + '</div><div><span>' + done + '</span> ' + T.of + ' ' + state.draw.length + ' ' + T.answered + '</div></div>' +
                '<p class="ck-small">' + when(state.submittedAt) + ' · ' + mins + ' min · ' + T.receipt + ' <b class="ck-code">' + rc + '</b></p>' +
                '<button class="ck-btn" id="ck-save">' + T.save + '</button>' +
                '<p class="ck-small">' + T.after + '</p>' + resetBox() + '</div>';
            document.getElementById('ck-save').addEventListener('click', function () {
                var file = { check: C.id, build: state.build || C.build, title: META.title, name: state.name, startedAt: state.startedAt, submittedAt: state.submittedAt, draw: state.draw, answers: state.answers, receipt: rc };
                var a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' }));
                a.download = C.id + '_' + state.name.replace(/[^\wäöüÄÖÜß-]+/g, '-') + '.json';
                document.body.appendChild(a); a.click(); a.remove();
            });
            wireReset(state.code);
        });
    }

    render();
})();
