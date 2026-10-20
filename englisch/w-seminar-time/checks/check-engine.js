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
   answers are kept in this browser (localStorage) until hand-in.

   Text blocks (slot.block): one variant = a text (passage, numbered lines) plus
   several tasks on it. The text is shown once, next to its tasks on wide
   screens (sticky) and above them on narrow ones.

   Optional hand-in form (Microsoft Forms):
                 <div id="check" data-title="…" data-abgabe="PREFILLED-FORMS-URL">
   The URL is the form's pre-filled link with the placeholders NAME_X, RECEIPT_X
   and PRUEFUNG_X; they are replaced by name, receipt and check id. The result
   screen then shows two steps: 1. save the file, 2. open the form (enabled only
   after saving). Without data-abgabe the generic hand-in text is shown.
   Elements with [data-after-hand-in] (e.g. the Impressum footer, set `hidden`)
   are only shown after hand-in, so the page has no links during the check.

   Start screen: name, course/class and extra time (Nachteilsausgleich).
   data-kurse="10C,3e1" on #check → course as a drop-down, else free text.
   data-extra="25,50" → extra-time choices in percent (default 25 and 50).
   The timer runs for minutes × (1 + extra/100). The result file contains the
   course, extra time, allowed time and the actual duration; from rv 2 on the
   receipt also covers course, extra time and start time (same formula on the
   scoring page).

   Result file = PDF (Microsoft Forms does not accept .json): one readable page
   (name, course, time, receipt) plus the result data, all ASCII, twice:
   as a comment line "%EDUJSON:{…}" right after the header (read by the scoring
   page and the Power Automate flow) and as the attachment result.json. */
(function () {
    'use strict';
    var C = window.CHECK, root = document.getElementById('check');
    if (!C || !root) return;
    var KEY = 'check:' + C.id;
    var PAYLOAD = null, META = null, ITEMS = {}, TEXTS = {};

    var TXT = {
        en: {
            check: 'Online check', text: 'Text', tasksOn: 'tasks', rules: 'Work on your own. You may not use other pages, notes or tools. The time starts when you enter the start code. Your answers are saved in this browser as you go; the timer keeps running if you reload. At the end, save your result file and hand it in as your teacher tells you.',
            name: 'First and last name', kurs: 'Course / class', needKurs: 'Please enter your course or class.',
            extra: 'Extra time – only if it has been granted to you (e.g. for dyslexia/LRS)', noExtra: 'No extra time', extraOpt: '% extra time',
            incl: 'incl.', duration: 'time taken', code: 'Start code from your teacher', start: 'Start the check', https: 'This page needs a secure connection (https).',
            needName: 'Please enter your first and last name.', checking: 'Checking the code …', wrong: 'This start code is not correct.', loading: 'Loading …',
            min: 'minutes', tasks: 'tasks', points: 'points', all: 'Select all that apply.', choose: '– choose –', answer: 'answer',
            answered: 'answered', handIn: 'Hand in', allDone: 'All tasks answered. Check your answers, then hand in.', open: 'task(s) still open.',
            confirmOpen: ' task(s) are not complete. Hand in anyway?', confirm: 'Hand in now? You cannot change your answers afterwards.',
            handed: 'handed in', of: 'of', receipt: 'receipt', save: 'Save result file (PDF)',
            pdfTitle: 'Result file', lCheck: 'Check', lName: 'Name', lKurs: 'Course / class', lHanded: 'Handed in', lTime: 'Time taken',
            lAns: 'Answered', lReceipt: 'Receipt', lId: 'Check ID / build',
            pdfNote: 'This PDF contains your answers as data for scoring (attachment result.json). Upload exactly this file and do not change, re-save or print it: changes are detected through the receipt.',
            after: 'Hand in the result file as your teacher tells you (e.g. Teams). Your teacher scores it – you get your result later. Keep this screen open until your teacher has seen it.',
            reset: 'New attempt (teacher)', resetBtn: 'Reset this browser', resetCode: 'start code', wrongCode: 'Wrong code.',
            changed: 'This check has been updated since you started. Please ask your teacher.',
            steps: 'Hand in: 2 steps', step1: '<b>Save your result file.</b>',
            step2: '<b>Open the hand-in form</b> (new window), sign in with your <b>school account</b>, <b>upload the saved file</b> and click <b>Submit</b>.',
            prefilled: 'Your name and receipt are already filled in: <b>do not change them.</b>',
            form: 'Open hand-in form', saveFirst: 'Do step 1 first: save the file.',
            keepOpen: '<b>Keep this screen open</b> until your teacher has seen it.'
        },
        de: {
            check: 'Online-Check', text: 'Text', tasksOn: 'Aufgaben', rules: 'Arbeite allein. Andere Seiten, Notizen und Hilfsmittel sind nicht erlaubt. Die Zeit läuft ab der Eingabe des Startcodes. Deine Antworten werden laufend in diesem Browser gespeichert; beim Neuladen läuft die Zeit weiter. Speichere am Ende deine Ergebnisdatei und gib sie ab, wie es deine Lehrkraft sagt.',
            name: 'Vor- und Nachname', kurs: 'Kurs / Klasse', needKurs: 'Bitte gib deinen Kurs oder deine Klasse an.',
            extra: 'Zeitzuschlag – nur wenn er dir gewährt wurde (z. B. bei LRS)', noExtra: 'Kein Zeitzuschlag', extraOpt: '% mehr Zeit',
            incl: 'inkl.', duration: 'Bearbeitungszeit', code: 'Startcode deiner Lehrkraft', start: 'Check starten', https: 'Diese Seite braucht eine sichere Verbindung (https).',
            needName: 'Bitte gib Vor- und Nachnamen ein.', checking: 'Code wird geprüft …', wrong: 'Dieser Startcode stimmt nicht.', loading: 'Wird geladen …',
            min: 'Minuten', tasks: 'Aufgaben', points: 'Punkte', all: 'Kreuze alle zutreffenden an.', choose: '– wählen –', answer: 'Antwort',
            answered: 'beantwortet', handIn: 'Abgeben', allDone: 'Alle Aufgaben beantwortet. Prüfe deine Antworten, dann gib ab.', open: 'Aufgabe(n) noch offen.',
            confirmOpen: ' Aufgabe(n) sind unvollständig. Trotzdem abgeben?', confirm: 'Jetzt abgeben? Danach kannst du nichts mehr ändern.',
            handed: 'abgegeben', of: 'von', receipt: 'Quittung', save: 'Ergebnisdatei speichern (PDF)',
            pdfTitle: 'Ergebnisdatei', lCheck: 'Check', lName: 'Name', lKurs: 'Kurs / Klasse', lHanded: 'Abgegeben', lTime: 'Bearbeitungszeit',
            lAns: 'Beantwortet', lReceipt: 'Quittung', lId: 'Check-ID / Build',
            pdfNote: 'Diese PDF enthält deine Antworten als Daten für die Auswertung (Anhang result.json). Lade genau diese Datei hoch und verändere, speichere oder drucke sie nicht neu: Änderungen werden über die Quittung erkannt.',
            after: 'Gib die Ergebnisdatei ab, wie es deine Lehrkraft sagt (z. B. Teams). Die Lehrkraft wertet sie aus – dein Ergebnis bekommst du später. Lass diesen Bildschirm offen, bis deine Lehrkraft ihn gesehen hat.',
            reset: 'Neuer Versuch (Lehrkraft)', resetBtn: 'Browser zurücksetzen', resetCode: 'Startcode', wrongCode: 'Falscher Code.',
            changed: 'Dieser Check wurde geändert, seit du begonnen hast. Bitte melde dich bei deiner Lehrkraft.',
            steps: 'Abgabe in 2 Schritten', step1: '<b>Speichere deine Ergebnisdatei.</b>',
            step2: '<b>Öffne das Abgabeformular</b> (neues Fenster), melde dich mit deinem <b>Schulkonto</b> an, <b>lade die gespeicherte Datei hoch</b> und klicke auf <b>Absenden</b>.',
            prefilled: 'Name und Quittung sind schon eingetragen: <b>nicht ändern.</b>',
            form: 'Abgabeformular öffnen', saveFirst: 'Erst Schritt 1: Datei speichern.',
            keepOpen: '<b>Lass diesen Bildschirm offen</b>, bis deine Lehrkraft ihn gesehen hat.'
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
                ITEMS = {}; TEXTS = {};
                PAYLOAD.slots.forEach(function (s) {
                    s.variants.forEach(function (v) {
                        if (!s.block) { ITEMS[v.id] = v; return; }
                        TEXTS[v.passage.id] = v.passage;
                        v.items.forEach(function (it) { ITEMS[it.id] = it; });
                    });
                });
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
    function receipt(s) {
        var parts = s.rv === 2 ? [norm(s.code), C.id, s.name, s.kurs, s.extra || 0, s.startedAt, s.submittedAt, JSON.stringify(s.answers)]
            : [norm(s.code), C.id, s.name, s.submittedAt, JSON.stringify(s.answers)];
        return sha(parts.join('|')).then(function (x) { return x.slice(0, 8).toUpperCase(); });
    }
    function limitSec() { return Math.round(META.minutes * 60 * (1 + (state.extra || 0) / 100)); }
    function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }

    /* ---------------------------------------------------------------- state */
    var state = null;
    function load() { try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { state = null; } }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory only */ } }
    function clear() { try { localStorage.removeItem(KEY); } catch (e) { } state = null; }
    function draw(seed) {   // one variant per slot, options/rows in a random order
        var r = rng(seed), out = [];
        PAYLOAD.slots.forEach(function (s) {
            var v = s.variants[Math.floor(r() * s.variants.length)];
            (s.block ? v.items : [v]).forEach(function (it) {
                var d = { id: it.id, order: shuffle((it.options || it.rows).map(function (o) { return o.id; }), r) };
                if (s.block) d.ps = v.passage.id;
                out.push(d);
            });
        });
        return out;
    }

    /* ---------------------------------------------------------------- screens */
    var tick = null;
    function render() {
        clearInterval(tick);
        load();
        document.querySelectorAll('[data-after-hand-in]').forEach(function (el) { el.hidden = !(state && state.submittedAt); });
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
        var kurse = (root.dataset.kurse || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var extras = (root.dataset.extra || '25,50').split(',').map(function (s) { return parseInt(s, 10); }).filter(function (n) { return n > 0; });
        var kursField = kurse.length
            ? '<select id="ck-kurs"><option value="">' + T.choose + '</option>' + kurse.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select>'
            : '<input id="ck-kurs" autocomplete="off" spellcheck="false">';
        root.innerHTML =
            '<div class="ck-card ck-start">' +
            '<h1>' + esc(root.dataset.title || T.check) + '</h1>' +
            '<p>' + T.rules + '</p>' +
            '<label for="ck-name">' + T.name + '</label><input id="ck-name" autocomplete="name">' +
            '<label for="ck-kurs">' + T.kurs + '</label>' + kursField +
            '<label for="ck-extra">' + T.extra + '</label><select id="ck-extra"><option value="0">' + T.noExtra + '</option>' +
            extras.map(function (n) { return '<option value="' + n + '">+' + n + ' ' + T.extraOpt + '</option>'; }).join('') + '</select>' +
            '<label for="ck-code">' + T.code + '</label><input id="ck-code" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX">' +
            '<p class="ck-err" id="ck-err" aria-live="polite"></p>' +
            '<button class="ck-btn" id="ck-go">' + T.start + '</button></div>';
        if (!window.crypto || !crypto.subtle) document.getElementById('ck-err').textContent = T.https;
        document.getElementById('ck-go').addEventListener('click', function () {
            var btn = this, name = document.getElementById('ck-name').value.trim().replace(/\s+/g, ' '), cd = document.getElementById('ck-code').value;
            var kurs = document.getElementById('ck-kurs').value.trim().replace(/\s+/g, ' '), extra = parseInt(document.getElementById('ck-extra').value, 10) || 0;
            var err = document.getElementById('ck-err');
            if (name.split(' ').length < 2) { err.textContent = T.needName; return; }
            if (!kurs) { err.textContent = T.needKurs; return; }
            btn.disabled = true; err.textContent = T.checking;
            decrypt(cd).then(function () {
                var seed = Math.floor(Math.random() * 2147483647);
                state = { rv: 2, name: name, kurs: kurs, extra: extra, code: norm(cd), build: C.build, seed: seed, draw: draw(seed), answers: {}, startedAt: Date.now(), submittedAt: null };
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
    function textHTML(ps, n, from, to) {
        var p = TEXTS[ps], no = 0;
        var html = '<aside class="ck-text" aria-label="' + T.text + ' ' + n + '"><p class="ck-kicker">' + T.text + ' ' + n + ' · ' + T.tasksOn + ' ' + from + '–' + to + '</p>' +
            '<h2>' + esc(p.title) + '</h2>' + (p.byline ? '<p class="ck-by">' + esc(p.byline) + '</p>' : '');
        p.paras.forEach(function (para) {
            html += '<div class="ck-para">';
            para.forEach(function (l) {
                no++;
                html += '<div class="ck-ln"><span class="ck-no' + (no % 5 ? '' : ' ck-n5') + '" aria-hidden="true">' + no + '</span><span>' + l + '</span></div>';
            });
            html += '</div>';
        });
        return html + '</aside>';
    }
    function answered(d) {
        var a = state.answers[d.id], it = ITEMS[d.id];
        if (!it) return false;
        if (it.type === 'single') return !!a;
        if (it.type === 'multi') return !!(a && a.length);
        return !!a && Object.keys(a).filter(function (k) { return a[k]; }).length === it.rows.length;
    }
    function renderTest() {
        var html = '<div class="ck-bar" role="status"><span class="ck-who">' + esc(state.name) + (state.kurs ? ' · ' + esc(state.kurs) : '') + '</span><span id="ck-prog"></span><span class="ck-time" id="ck-time"></span></div>';
        var mins = mmss(limitSec()).replace(/:00$/, '') + ' ' + T.min + (state.extra ? ' (' + T.incl + ' +' + state.extra + ' %)' : '');
        html += '<div class="ck-card"><p class="ck-kicker">' + esc(META.subtitle) + '</p><h1>' + esc(META.title) + '</h1>' +
            '<p class="ck-small">' + mins + ' · ' + META.tasks + ' ' + T.tasks + ' · ' + fmt(META.max) + ' ' + T.points + '</p></div>';
        var texts = 0;
        for (var i = 0; i < state.draw.length; i++) {
            var d = state.draw[i];
            if (!d.ps) { html += itemHTML(d, i + 1); continue; }
            var j = i; while (j + 1 < state.draw.length && state.draw[j + 1].ps === d.ps) j++;
            html += '<div class="ck-block">' + textHTML(d.ps, ++texts, i + 1, j + 1) + '<div class="ck-qs">';
            for (var k = i; k <= j; k++) html += itemHTML(state.draw[k], k + 1);
            html += '</div></div>';
            i = j;
        }
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
        var rest = Math.round(limitSec() - (Date.now() - state.startedAt) / 1000);
        var el = document.getElementById('ck-time'); if (!el) return;
        if (rest <= 0) { el.textContent = '0:00'; state.timeUp = true; submit(); return; }
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

    /* ---------------------------------------------------------------- result PDF */
    var WIN = { 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x201E: 0x84, 0x2022: 0x95, 0x2026: 0x85, 0x20AC: 0x80 };
    function pdfStr(s) {   // PDF literal string, WinAnsi, ASCII only
        return '(' + Array.from(String(s)).map(function (ch) {
            var c = ch.codePointAt(0), b = WIN[c] != null ? WIN[c] : (c < 128 || (c >= 0xA0 && c <= 0xFF)) ? c : 63;
            if (b === 40 || b === 41 || b === 92) return '\\' + String.fromCharCode(b);
            if (b < 32 || b > 126) return '\\' + ('00' + b.toString(8)).slice(-3);
            return String.fromCharCode(b);
        }).join('') + ')';
    }
    function wrap(text, max) {
        var out = [], line = '';
        text.split(' ').forEach(function (w) { if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w; });
        if (line.trim()) out.push(line.trim());
        return out;
    }
    function resultPdf(data, rows) {
        var json = JSON.stringify(data).replace(/[\u0080-\uffff]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); });
        var c = [], y = 790;
        function txt(font, size, x, yy, s) { c.push('BT /' + font + ' ' + size + ' Tf 1 0 0 1 ' + x + ' ' + yy + ' Tm ' + pdfStr(s) + ' Tj ET'); }
        txt('F2', 20, 50, y, 'edu-mrh.de \u00b7 ' + T.pdfTitle);
        txt('F1', 12, 50, y - 24, META.title);
        c.push('0.6 w 50 ' + (y - 36) + ' m 545 ' + (y - 36) + ' l S');
        y -= 66;
        rows.forEach(function (r) {
            txt('F2', 11, 50, y, r[0]);
            txt(r[2] ? 'F2' : 'F1', r[2] ? 16 : 11, 190, y, r[1]);
            y -= r[2] ? 28 : 22;
        });
        c.push('0.6 w 50 ' + (y + 6) + ' m 545 ' + (y + 6) + ' l S');
        y -= 12;
        wrap(T.pdfNote, 112).forEach(function (l) { txt('F1', 9, 50, y, l); y -= 13; });
        var content = c.join('\n');
        var objs = [null,
            '<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(result.json) 6 0 R] >> >> >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 8 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
            '<< /Type /Filespec /F (result.json) /UF (result.json) /Desc (Result data) /EF << /F 7 0 R >> >>',
            '<< /Type /EmbeddedFile /Subtype /application#2Fjson /Length ' + json.length + ' >>\nstream\n' + json + '\nendstream',
            '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'];
        var out = '%PDF-1.7\n%EDUJSON:' + json + '\n', offs = [];
        for (var i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
        var xref = out.length;
        out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
        for (i = 1; i < objs.length; i++) out += ('000000000' + offs[i]).slice(-10) + ' 00000 n \n';
        return out + 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    }

    function renderDone() {
        receipt(state).then(function (rc) {
            state.receipt = rc; save();
            var done = state.done != null ? state.done : state.draw.filter(answered).length, took = (state.submittedAt - state.startedAt) / 1000;
            var mins = T.duration + ' ' + mmss(took) + ' / ' + mmss(limitSec()) + (state.extra ? ' (+' + state.extra + ' %)' : '');
            var safe = function (s) { return String(s).replace(/[^\wäöüÄÖÜß-]+/g, '-').replace(/^-+|-+$/g, ''); };
            var fname = (state.kurs ? safe(state.kurs) + '_' : '') + safe(state.name) + '_' + C.id + '.pdf';
            var form = root.dataset.abgabe ? root.dataset.abgabe.split('NAME_X').join(encodeURIComponent(state.name))
                .split('RECEIPT_X').join(encodeURIComponent(rc)).split('PRUEFUNG_X').join(encodeURIComponent(C.id)) : '';
            var saveBtn = '<button class="ck-btn" id="ck-save">' + T.save + '</button>';
            var handIn = !form ? saveBtn + '<p class="ck-small">' + T.after + '</p>' :
                '<div class="ck-steps"><h2>' + T.steps + '</h2>' +
                '<div class="ck-step"><span class="ck-sn">1</span><div><p>' + T.step1 + '</p>' + saveBtn + '<p class="ck-small ck-code-s">' + esc(fname) + '</p></div></div>' +
                '<div class="ck-step"><span class="ck-sn">2</span><div><p>' + T.step2 + ' ' + T.prefilled + '</p>' +
                '<a class="ck-btn" id="ck-form" href="' + esc(form) + '" target="_blank" rel="noopener">' + T.form + '</a>' +
                '<p class="ck-err" id="ck-form-err" aria-live="polite"></p></div></div>' +
                '<p class="ck-keep">' + T.keepOpen + '</p></div>';
            root.innerHTML = '<div class="ck-card ck-result">' +
                '<p class="ck-kicker">' + esc(META.title) + '</p><h1>' + esc(state.name) + '</h1>' +
                '<div class="ck-score"><div><span>✓</span> ' + T.handed + '</div><div><span>' + done + '</span> ' + T.of + ' ' + state.draw.length + ' ' + T.answered + '</div></div>' +
                '<p class="ck-small">' + (state.kurs ? esc(state.kurs) + ' · ' : '') + when(state.submittedAt) + ' · ' + mins + ' · ' + T.receipt + ' <b class="ck-code">' + rc + '</b></p>' +
                handIn + resetBox() + '</div>';
            var link = document.getElementById('ck-form');
            function lock() { if (link) link.setAttribute('aria-disabled', state.saved ? 'false' : 'true'); }
            if (link) link.addEventListener('click', function (e) {
                if (state.saved) return;
                e.preventDefault(); document.getElementById('ck-form-err').textContent = T.saveFirst;
            });
            lock();
            document.getElementById('ck-save').addEventListener('click', function () {
                // pruefungsId/receiptId: field names read by the Power Automate flow (Forms hand-in)
                // kurs … zeitAbgelaufen: course, extra time (%), regular/allowed time and actual duration (minutes)
                var file = { check: C.id, build: state.build || C.build, title: META.title, name: state.name, startedAt: state.startedAt, submittedAt: state.submittedAt, draw: state.draw, answers: state.answers, receipt: rc, pruefungsId: C.id, receiptId: rc,
                    rv: state.rv || 1, kurs: state.kurs || '', zeitzuschlag: state.extra || 0, zeitMin: META.minutes, zeitErlaubtMin: Math.round(limitSec() / 6) / 10,
                    dauerMin: Math.round(took / 6) / 10, dauer: mmss(took), zeitAbgelaufen: !!state.timeUp };
                var pdf = resultPdf(file, [
                    [T.lName, state.name], [T.lKurs, state.kurs || '–'], [T.lHanded, when(state.submittedAt)],
                    [T.lTime, mmss(took) + ' / ' + mmss(limitSec()) + ' min' + (state.extra ? ' (+' + state.extra + ' %)' : '')],
                    [T.lAns, done + ' / ' + state.draw.length], [T.lReceipt, rc, true], [T.lId, C.id + ' / ' + (state.build || C.build)]]);
                var a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
                a.download = fname;
                document.body.appendChild(a); a.click(); a.remove();
                state.saved = Date.now(); save(); lock();
                var err = document.getElementById('ck-form-err'); if (err) err.textContent = '';
            });
            wireReset(state.code);
        });
    }

    render();
})();
