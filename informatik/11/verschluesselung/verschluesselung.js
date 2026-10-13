/* ==========================================================================
   Verschlüsselung (Informatik 11) – Werkzeuge der Stationsseiten 5.1 bis 5.5
   Alles läuft im Browser, nichts wird gespeichert oder verschickt.

   Markup (jeweils ein leeres <div> mit data-Attribut):
     <div data-skytale></div>                 Skytale: auf- und abwickeln (Transposition)
     <div data-scheibe data-k="13"></div>     Chiffrierscheibe (Caesar/ROT13), data-zurueck: „k zurück = 26 − k vor“
     <div data-tracer></div>                  Code-Animation zu rot13/rotiere aus dem Projekt 11-5-1 (①…⑥, ⓪…④)
     <div data-vigenere></div>                Vigenère-Quadrat zum Nachschlagen (ver- und entschlüsseln)
     <div data-schluesselzaehler></div>       Wie viele Schlüssel braucht eine Klasse? (vollständiger Graph)
     <div data-schloss></div>                 Vorhängeschloss-Analogie zur asymmetrischen Verschlüsselung
     <div data-rsa></div>                     RSA-Übersicht prüfen (Buch S. 85: p = 5, q = 17, „HI“) und eigene Werte
     <div data-modrechner></div>              Rechner a^b mod n
     <div data-ablauf="verschluesseln|signatur"></div>   Ablauf der Kommunikation (mit digitaler Signatur)
     <div data-mitm></div>                    Man-in-the-Middle, wahlweise mit Zertifikat
     <div data-hash></div>                    Hash-Labor (SHA-256) und Quersumme als „Fingerabdruck“
     <div data-haeufigkeit></div>             Häufigkeitsanalyse mit Ersetzen-Werkzeug
     <div data-bruteforce></div>              Brute-Force-Maschine (Schritte ①–④ wie Blatt 5.5)
     <div data-faktor></div>                  Faktorisier-Stoppuhr (Sicherheit von RSA)
     <div class="lw" data-loesungsweg="…">    Lösungsweg mit Tipps und Lösung (Gedrückthalten)
   ========================================================================== */
(function () {
    'use strict';

    // ---------- Hilfsfunktionen ----------
    function el(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            var v = attrs[k];
            if (v === null || v === undefined || v === false) return;
            if (k === 'text') e.textContent = v;
            else if (k === 'html') e.innerHTML = v;
            else if (k === 'cls') e.className = v;
            else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v === true ? '' : v);
        });
        (kinder || []).forEach(function (c) { if (c !== null && c !== undefined) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    var SVGNS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs, kinder) {
        var e = document.createElementNS(SVGNS, tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.setAttribute('class', attrs[k]);
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(c); });
        return e;
    }
    function knopf(text, fn, cls) { return el('button', { type: 'button', cls: 'vs-knopf' + (cls ? ' ' + cls : ''), text: text, onclick: fn }); }
    function meldung(box, text, art) { box.textContent = text; box.className = 'vs-meldung' + (art ? ' ' + art : ''); }
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function verschiebe(c, k) { var i = ABC.indexOf(c); return i < 0 ? c : ABC[((i + k) % 26 + 26) % 26]; }
    function caesar(t, k) { return t.toUpperCase().split('').map(function (c) { return verschiebe(c, k); }).join(''); }
    function zufall(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    function werkzeug(box) { box.classList.add('vs-werkzeug'); }

    // =====================================================================
    // 1) Skytale (5.1, Aufgabe 1)
    // =====================================================================
    function skytale(box) {
        werkzeug(box);
        var modus = 'ent';
        var mEnt = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'true', text: '📜 Streifen aufwickeln (entschlüsseln)' });
        var mVer = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'false', text: '✍️ Nachricht schreiben (verschlüsseln)' });
        var eingabe = el('input', { cls: 'vs-input breit', value: 'TKLHEIEIECSXAAX', 'aria-label': 'Text' });
        var umfang = el('input', { type: 'range', min: '2', max: '6', value: '2', 'aria-label': 'Umfang des Stabs in Buchstaben' });
        var umfangText = el('b', { text: '2' });
        var buehne = el('div', { cls: 'vs-skytale', 'aria-live': 'polite' });
        var stab = el('div', { cls: 'vs-stab', 'aria-hidden': 'true' });
        buehne.appendChild(stab);
        var lesen = el('div', { cls: 'vs-ausgabe' });
        var animiert = false;
        box.appendChild(el('div', { cls: 'vs-modi' }, [mEnt, mVer]));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Text:' }), eingabe]));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Um den Stab passen' }), umfang, umfangText, el('span', { text: 'Buchstaben' }),
            knopf('▶ Wickeln', function () { zeichne(true); })]));
        box.appendChild(buehne);
        box.appendChild(lesen);
        function setzeModus(m) {
            modus = m;
            mEnt.setAttribute('aria-pressed', m === 'ent'); mVer.setAttribute('aria-pressed', m === 'ver');
            eingabe.value = m === 'ent' ? 'TKLHEIEIECSXAAX' : 'GEHEIMES TREFFEN UM MITTERNACHT';
            zeichne(false);
        }
        mEnt.addEventListener('click', function () { setzeModus('ent'); });
        mVer.addEventListener('click', function () { setzeModus('ver'); });
        umfang.addEventListener('input', function () { umfangText.textContent = umfang.value; zeichne(false); });
        eingabe.addEventListener('input', function () { zeichne(false); });
        function zeichne(animieren) {
            var u = +umfang.value;
            var roh = eingabe.value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, '');
            if (!roh) { lesen.textContent = 'Bitte einen Text eingeben.'; return; }
            var L = Math.ceil(roh.length / u);
            var n = u * L;
            var buchst;   // Buchstaben in Streifen-Reihenfolge
            if (modus === 'ver') {
                var voll = (roh + 'XXXXXX').slice(0, n);
                buchst = [];
                for (var c = 0; c < L; c++) for (var r = 0; r < u; r++) buchst.push(voll[r * L + c]);
            } else buchst = (roh + 'XXXXXX').slice(0, n).split('');
            var breite = buehne.clientWidth || 600;
            var zelle = Math.max(16, Math.min(34, Math.floor((breite - 20) / Math.max(n, 1)), Math.floor((breite - 20) / L)));
            var zelleS = Math.max(14, Math.min(34, Math.floor((breite - 20) / n)));
            var stabY = 10, streifenY = stabY + u * zelle + 46;
            buehne.style.height = (streifenY + zelleS + 20) + 'px';
            stab.style.width = (L * zelle + 24) + 'px'; stab.style.height = (u * zelle + 12) + 'px'; stab.style.top = (stabY - 6) + 'px';
            buehne.querySelectorAll('.vs-sbuch').forEach(function (s) { s.remove(); });
            var spans = buchst.map(function (b, k) {
                var s = el('span', { cls: 'vs-sbuch', text: b });
                s.style.width = s.style.height = (modus === 'ver' ? zelle : zelleS) + 'px';
                s.style.fontSize = Math.round(Math.min(zelle, zelleS) * 0.55) + 'px';
                buehne.appendChild(s);
                return s;
            });
            function aufStab() { spans.forEach(function (s, k) { var r = k % u, c = Math.floor(k / u); s.style.left = (12 + c * zelle) + 'px'; s.style.top = (stabY + r * zelle) + 'px'; s.style.width = s.style.height = zelle + 'px'; s.classList.add('auf'); }); }
            function aufStreifen() { spans.forEach(function (s, k) { s.style.left = (10 + k * zelleS) + 'px'; s.style.top = streifenY + 'px'; s.style.width = s.style.height = zelleS + 'px'; s.classList.remove('auf'); }); }
            var zeilen = [];
            for (var r2 = 0; r2 < u; r2++) { var z = ''; for (var c2 = 0; c2 < L; c2++) z += buchst[c2 * u + r2]; zeilen.push(z); }
            if (modus === 'ent') {
                aufStreifen();
                if (animieren) {
                    spans.forEach(function (s, k) { setTimeout(function () { var r = k % u, c = Math.floor(k / u); s.style.left = (12 + c * zelle) + 'px'; s.style.top = (stabY + r * zelle) + 'px'; s.style.width = s.style.height = zelle + 'px'; s.classList.add('auf'); }, 120 * k); });
                    setTimeout(function () { lesen.innerHTML = 'Zeile für Zeile gelesen: <b>' + zeilen.join(' ') + '</b>'; }, 120 * n + 400);
                    lesen.textContent = 'Der Streifen wird um den Stab gewickelt …';
                } else lesen.textContent = 'Abgewickelter Streifen. Klicke auf „Wickeln“.';
            } else {
                aufStab();
                if (animieren) {
                    spans.forEach(function (s, k) { setTimeout(function () { s.style.left = (10 + k * zelleS) + 'px'; s.style.top = streifenY + 'px'; s.style.width = s.style.height = zelleS + 'px'; s.classList.remove('auf'); }, 120 * k); });
                    setTimeout(function () { lesen.innerHTML = 'Abgewickelter Streifen (Geheimtext): <b>' + buchst.join('') + '</b>'; }, 120 * n + 400);
                    lesen.textContent = 'Der Streifen wird abgewickelt …';
                } else lesen.innerHTML = 'Die Nachricht steht zeilenweise auf dem Stab' + (roh.length < n ? ' (aufgefüllt mit X)' : '') + '. Klicke auf „Wickeln“.';
            }
        }
        var letzteBreite = 0;
        setTimeout(function () { letzteBreite = buehne.clientWidth; zeichne(false); }, 50);
        window.addEventListener('resize', function () {
            if (Math.abs(buehne.clientWidth - letzteBreite) < 30) return;   // z. B. Adressleiste auf dem Handy
            letzteBreite = buehne.clientWidth; zeichne(false);
        });
    }

    // =====================================================================
    // 2) Chiffrierscheibe (5.1, 5.2)
    // =====================================================================
    function scheibe(box) {
        werkzeug(box);
        var k = +(box.getAttribute('data-k') || 3);
        var mitZurueck = box.hasAttribute('data-zurueck');
        var R1 = 150, R2 = 112, C = 175;
        var s = svg('svg', { viewBox: '0 0 350 350', cls: 'vs-scheibe-svg', role: 'img', 'aria-label': 'Chiffrierscheibe' });
        s.appendChild(svg('circle', { cx: C, cy: C, r: 170, cls: 'vs-ring-aussen' }));
        s.appendChild(svg('circle', { cx: C, cy: C, r: 130, cls: 'vs-ring-innen' }));
        var aussen = [], innen = [];
        for (var i = 0; i < 26; i++) {
            var w = (i * 360 / 26 - 90) * Math.PI / 180;
            var t = svg('text', { x: C + R1 * Math.cos(w), y: C + R1 * Math.sin(w), cls: 'vs-sb-a', text: ABC[i].toLowerCase() });
            s.appendChild(t); aussen.push(t);
        }
        var gruppe = svg('g', { cls: 'vs-sb-innen' });
        for (i = 0; i < 26; i++) {
            w = (i * 360 / 26 - 90) * Math.PI / 180;
            var t2 = svg('text', { x: C + R2 * Math.cos(w), y: C + R2 * Math.sin(w), cls: 'vs-sb-i', text: ABC[i] });
            gruppe.appendChild(t2); innen.push(t2);
        }
        s.appendChild(gruppe);
        s.appendChild(svg('circle', { cx: C, cy: C, r: 88, cls: 'vs-ring-mitte' }));
        var mitte = svg('text', { x: C, y: C - 8, cls: 'vs-sb-k', text: 'k = ' + k });
        var mitte2 = svg('text', { x: C, y: C + 18, cls: 'vs-sb-k2', text: '' });
        s.appendChild(mitte); s.appendChild(mitte2);
        var zeiger = svg('path', { d: 'M ' + C + ' 6 L ' + (C - 9) + ' -8 L ' + (C + 9) + ' -8 Z', cls: 'vs-sb-zeiger', transform: '' });
        s.appendChild(zeiger);
        var winkel = 0;
        var regler = el('input', { type: 'range', min: '0', max: '25', value: k, 'aria-label': 'Schlüssel k' });
        var kAnz = el('b', { text: String(k) });
        var text = el('input', { cls: 'vs-input breit', value: box.getAttribute('data-text') || 'HALLO', 'aria-label': 'Klartext' });
        var aus = el('div', { cls: 'vs-ausgabe' });
        var pos = -1;
        var info = el('p', { cls: 'vs-klein' });
        function drehe(neuK, schritte) {
            winkel += (schritte !== undefined ? schritte : (neuK - k)) * 360 / 26;
            k = ((neuK % 26) + 26) % 26;
            gruppe.style.transform = 'rotate(' + (-winkel) + 'deg)';
            innen.forEach(function (t) { t.style.transform = 'rotate(' + winkel + 'deg)'; });   // Buchstaben bleiben aufrecht
            regler.value = k; kAnz.textContent = k; mitte.textContent = 'k = ' + k;
            zeigeText();
        }
        function markiere(i) {
            aussen.forEach(function (t) { t.classList.remove('hl'); });
            innen.forEach(function (t) { t.classList.remove('hl'); });
            if (i < 0) { zeiger.setAttribute('transform', 'rotate(0 ' + C + ' ' + C + ')'); zeiger.style.opacity = 0; mitte2.textContent = ''; return; }
            aussen[i].classList.add('hl'); innen[(i + k) % 26].classList.add('hl');
            zeiger.style.opacity = 1;
            zeiger.setAttribute('transform', 'rotate(' + (i * 360 / 26) + ' ' + C + ' ' + C + ')');
            mitte2.textContent = ABC[i].toLowerCase() + ' → ' + ABC[(i + k) % 26];
        }
        function zeigeText() {
            var t = text.value.toUpperCase();
            var html = t.split('').map(function (c, j) { return '<span class="' + (j === pos ? 'jetzt' : '') + '">' + esc(c) + '</span>'; }).join('');
            var g = caesar(t, k).split('').map(function (c, j) { return '<span class="' + (j === pos ? 'jetzt' : '') + '">' + esc(c) + '</span>'; }).join('');
            aus.innerHTML = '<div><small>Klartext</small><code>' + html + '</code></div><div><small>Geheimtext (k = ' + k + ')</small><code>' + g + '</code></div>';
            markiere(pos >= 0 && ABC.indexOf(t[pos]) >= 0 ? ABC.indexOf(t[pos]) : -1);
        }
        regler.addEventListener('input', function () { drehe(+regler.value); });
        text.addEventListener('input', function () { pos = -1; zeigeText(); });
        var steuer = el('div', { cls: 'vs-steuer' }, [
            knopf('◀', function () { if (pos > 0) pos--; else pos = text.value.length - 1; zeigeText(); }, 'leise'),
            knopf('Buchstabe für Buchstabe ▶', function () { pos = (pos + 1) % Math.max(1, text.value.length); zeigeText(); }),
        ]);
        box.appendChild(el('div', { cls: 'vs-scheibe' }, [s, el('div', { cls: 'vs-scheibe-rechts' }, [
            el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Schlüssel k:' }), regler, kAnz]),
            el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Text:' }), text]),
            steuer, aus, info])]));
        info.textContent = 'Außen: Klartext (klein). Innen: Geheimtext (groß). Die innere Scheibe ist um k Stellen verdreht.';
        if (mitZurueck) {
            var z = el('div', { cls: 'vs-zurueck' });
            var zText = el('p', { cls: 'vs-klein' });
            z.appendChild(el('strong', { text: 'Entschlüsseln: zurück- oder weiterdrehen?' }));
            z.appendChild(el('div', { cls: 'vs-steuer' }, [
                knopf('k = 3 einstellen', function () { drehe(3); zText.textContent = 'Die innere Scheibe steht auf k = 3 (verschlüsseln).'; }, 'leise'),
                knopf('↺ 3 Schritte zurück', function () { drehe(k - 3, -3); zText.textContent = 'Zurückgedreht: k = ' + k + '.'; }, 'leise'),
                knopf('↻ 23 Schritte vor', function () { drehe(k + 23, 23); zText.textContent = 'Vorgedreht um 23: k = ' + k + '. Gleiche Stellung wie nach 3 Schritten zurück!'; }, 'leise')
            ]));
            z.appendChild(zText);
            box.appendChild(z);
        }
        var startK = k;
        k = 0;
        drehe(startK, startK);
    }

    // =====================================================================
    // 3) Code-Animation rot13/rotiere (5.1, Projekt 11-5-1)
    // =====================================================================
    var CODE_ROT13 = [
        ['', 'public String rot13(String klartext) {'],
        ['L1', '   klartext = klartext.toUpperCase();                 // ① alles in Großbuchstaben'],
        ['L2', '   String geheimtext = "";                            // ② der Geheimtext ist zuerst leer'],
        ['L3', '   for (int i = 0; i < klartext.length(); i++) {      // ③ Zeichen für Zeichen'],
        ['L4', '      char zeichen = klartext.charAt(i);              // ④ das Zeichen an Position i holen'],
        ['L5', '      geheimtext = geheimtext + rotiere(zeichen, 13); // ⑤ verschieben und hinten anhängen'],
        ['', '   }'],
        ['L6', '   return geheimtext;                                 // ⑥ fertigen Geheimtext zurückgeben'],
        ['', '}']
    ];
    var CODE_ROTIERE = [
        ['', 'public char rotiere(char buchstabe, int rotationUm) {'],
        ['R0', '   if (buchstabe < \'A\' || buchstabe > \'Z\') {   // ⓪ kein Großbuchstabe?'],
        ['R0b', '      return buchstabe;                         //    dann unverändert zurück'],
        ['', '   }'],
        ['R1', '   rotationUm = rotationUm % 26;               // ① 26 Schritte sind einmal ganz herum'],
        ['R2', '   int code = (int) buchstabe + rotationUm;    // ② ASCII-Code + Verschiebung'],
        ['R3', '   if (code > 90) {                            // ③ hinter \'Z\' (Code 90) gelandet?'],
        ['R3b', '      code = code - 26;                        //    dann vorne weiterzählen'],
        ['', '   }'],
        ['R4', '   return (char) code;                         // ④ Zahl wieder als Zeichen zurückgeben'],
        ['', '}']
    ];
    function tracerSchritte(text, k) {
        var s = [], t = text.toUpperCase(), g = '';
        s.push({ z: 'L1', v: { klartext: '"' + t + '"' }, txt: '① <code>toUpperCase()</code> macht aus allen Buchstaben Großbuchstaben: „' + esc(t) + '“.' });
        s.push({ z: 'L2', v: { klartext: '"' + t + '"', geheimtext: '""' }, txt: '② Der Geheimtext beginnt als leerer String.' });
        for (var i = 0; i < t.length; i++) {
            var c = t[i];
            var basis = { i: i, klartext: '"' + t + '"', geheimtext: '"' + g + '"' };
            s.push({ z: 'L3', v: basis, i: i, txt: '③ Ist i = ' + i + ' kleiner als die Länge ' + t.length + '? Ja, die Schleife läuft weiter.' });
            var v2 = Object.assign({}, basis, { zeichen: "'" + c + "'" });
            s.push({ z: 'L4', v: v2, i: i, txt: '④ <code>charAt(' + i + ')</code> liefert das Zeichen „' + esc(c) + '“.' });
            var rv = { buchstabe: "'" + c + "'", rotationUm: k };
            if (c < 'A' || c > 'Z') {
                s.push({ z: 'R0', v: rv, i: i, r: true, txt: '⓪ „' + esc(c) + '“ ist kein Großbuchstabe (z. B. ein Leerzeichen) …' });
                s.push({ z: 'R0b', v: rv, i: i, r: true, txt: '… also kommt es unverändert zurück.', erg: c });
                g += c;
            } else {
                s.push({ z: 'R0', v: rv, i: i, r: true, txt: '⓪ „' + c + '“ ist ein Großbuchstabe. Es geht weiter.' });
                var rot = k % 26;
                s.push({ z: 'R1', v: Object.assign({}, rv, { rotationUm: rot }), i: i, r: true, txt: '① ' + k + ' % 26 = ' + rot + '. (Bei mehr als 26 Schritten würde das ganze Runden abziehen.)' });
                var code = c.charCodeAt(0) + rot;
                var rv2 = Object.assign({}, rv, { rotationUm: rot, code: code });
                s.push({ z: 'R2', v: rv2, i: i, r: true, code: code, txt: '② „' + c + '“ hat den ASCII-Code ' + c.charCodeAt(0) + '. ' + c.charCodeAt(0) + ' + ' + rot + ' = ' + code + '.' });
                if (code > 90) {
                    s.push({ z: 'R3', v: rv2, i: i, r: true, code: code, txt: '③ ' + code + ' > 90: Wir sind hinter „Z“ gelandet (Code ' + code + ' wäre „' + esc(String.fromCharCode(code)) + '“).' });
                    code -= 26;
                    rv2 = Object.assign({}, rv2, { code: code });
                    s.push({ z: 'R3b', v: rv2, i: i, r: true, code: code, txt: '   Also 26 abziehen: ' + (code + 26) + ' − 26 = ' + code + '. Es geht vorne im Alphabet weiter.' });
                } else s.push({ z: 'R3', v: rv2, i: i, r: true, code: code, txt: '③ ' + code + ' ist nicht größer als 90, wir sind noch im Alphabet.' });
                var e = String.fromCharCode(code);
                s.push({ z: 'R4', v: rv2, i: i, r: true, code: code, txt: '④ Der Code ' + code + ' wird wieder zum Zeichen „' + e + '“ und zurückgegeben.', erg: e });
                g += e;
            }
            s.push({ z: 'L5', v: Object.assign({}, v2, { geheimtext: '"' + g + '"' }), i: i, txt: '⑤ Das Ergebnis wird hinten an den Geheimtext gehängt: „' + esc(g) + '“.' });
        }
        s.push({ z: 'L3', v: { i: t.length, klartext: '"' + t + '"', geheimtext: '"' + g + '"' }, txt: '③ i = ' + t.length + ' ist nicht mehr kleiner als die Länge. Die Schleife endet.' });
        s.push({ z: 'L6', v: { geheimtext: '"' + g + '"' }, txt: '⑥ Zurückgegeben wird „' + esc(g) + '“.', fertig: true });
        return s;
    }
    function tracer(box) {
        werkzeug(box);
        var text = el('input', { cls: 'vs-input breit', value: box.getAttribute('data-text') || 'HALLO ZEBRA', maxlength: '24', 'aria-label': 'Text für rot13' });
        var codeA = el('pre', { cls: 'vs-code' }), codeB = el('pre', { cls: 'vs-code' });
        var zeilen = {};
        function baue(pre, liste) { liste.forEach(function (z) { var span = el('span', { cls: 'vs-codezeile', text: z[1] + '\n' }); if (z[0]) zeilen[z[0]] = span; pre.appendChild(span); }); }
        baue(codeA, CODE_ROT13); baue(codeB, CODE_ROTIERE);
        var vars = el('table', { cls: 'vs-vars' });
        var textBild = el('div', { cls: 'vs-tr-text' });
        var alphabet = el('div', { cls: 'vs-tr-abc' });
        var erkl = el('p', { cls: 'vs-tr-erkl' });
        var zaehler = el('span', { cls: 'vs-klein' });
        var schritte = [], n = 0, timer = null;
        var tempo = el('input', { type: 'range', min: '1', max: '5', value: '3', 'aria-label': 'Tempo' });
        var play = knopf('▶▶ Abspielen', function () {
            if (timer) { stopp(); return; }
            play.textContent = '⏸ Anhalten';
            timer = setInterval(function () { if (n >= schritte.length - 1) { stopp(); return; } n++; zeichne(); }, 1400 / +tempo.value);
        });
        function stopp() { clearInterval(timer); timer = null; play.textContent = '▶▶ Abspielen'; }
        function neu() { stopp(); schritte = tracerSchritte(text.value || 'A', 13); n = 0; zeichne(); }
        text.addEventListener('input', neu);
        ABC.split('').forEach(function (c) { alphabet.appendChild(el('span', { text: c })); });
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Text:' }), text]));
        box.appendChild(el('div', { cls: 'vs-tracer' }, [el('div', { cls: 'vs-tr-code' }, [el('div', { cls: 'vs-klein', text: 'Symverschluesselung.java (Projekt 11-5-1)' }), codeA, codeB]),
            el('div', { cls: 'vs-tr-rechts' }, [textBild, alphabet, erkl, el('div', { cls: 'vs-klein', text: 'Variablen' }), vars])]));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [knopf('⟲', function () { stopp(); n = 0; zeichne(); }, 'leise'), knopf('◀ Schritt', function () { stopp(); if (n > 0) n--; zeichne(); }, 'leise'),
            knopf('Schritt ▶', function () { stopp(); if (n < schritte.length - 1) n++; zeichne(); }), play, el('label', { cls: 'vs-klein', text: 'Tempo' }), tempo, zaehler]));
        function zeichne() {
            var s = schritte[n];
            Object.keys(zeilen).forEach(function (k) { zeilen[k].classList.toggle('jetzt', k === s.z); });
            codeB.classList.toggle('aktiv', !!s.r);
            codeA.classList.toggle('aktiv', !s.r);
            erkl.innerHTML = s.txt;
            vars.textContent = '';
            Object.keys(s.v).forEach(function (k) { vars.appendChild(el('tr', {}, [el('th', { text: k }), el('td', { text: String(s.v[k]) })])); });
            var t = (text.value || 'A').toUpperCase();
            textBild.innerHTML = t.split('').map(function (c, j) { return '<span class="' + (j === s.i ? 'jetzt' : (s.i !== undefined && j < s.i ? 'fertig' : '')) + '">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>'; }).join('');
            var spans = alphabet.children;
            for (var j = 0; j < 26; j++) spans[j].className = '';
            if (s.i !== undefined && s.i < t.length && ABC.indexOf(t[s.i]) >= 0) {
                var a = ABC.indexOf(t[s.i]);
                spans[a].className = 'start';
                if (s.code) {
                    var ziel = s.code - 65;
                    if (ziel <= 25) spans[ziel].className = s.z === 'R4' ? 'ziel' : 'unterwegs';
                }
            }
            zaehler.textContent = 'Schritt ' + (n + 1) + ' von ' + schritte.length;
        }
        neu();
    }

    // =====================================================================
    // 4) Vigenère-Quadrat (5.2, Aufgabe 2)
    // =====================================================================
    function vigenere(box) {
        werkzeug(box);
        var tab = el('table', { cls: 'vs-vq', role: 'grid' });
        var kopf = el('tr', {}, [el('th', { cls: 'ecke', text: '' })]);
        ABC.split('').forEach(function (c, i) { kopf.appendChild(el('th', { cls: 'kt', 'data-s': i, text: c.toLowerCase() })); });
        tab.appendChild(kopf);
        var zellen = [];
        for (var r = 0; r < 26; r++) {
            var tr = el('tr', {}, [el('th', { cls: 'sl', 'data-r': r, text: ABC[r] })]);
            zellen.push([]);
            for (var c = 0; c < 26; c++) { var td = el('td', { text: ABC[(r + c) % 26], 'data-r': r, 'data-s': c }); zellen[r].push(td); tr.appendChild(td); }
            tab.appendChild(tr);
        }
        var modus = 'ver', wahlS = -1, wahlR = -1;
        var mVer = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'true', text: '🔒 Verschlüsseln' });
        var mEnt = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'false', text: '🔓 Entschlüsseln' });
        var info = el('p', { cls: 'vs-meldung' });
        box.appendChild(el('div', { cls: 'vs-modi' }, [mVer, mEnt]));
        box.appendChild(info);
        box.appendChild(el('div', { cls: 'tab-scroll vs-vq-rahmen' }, [tab]));
        function setze(m) { modus = m; wahlS = wahlR = -1; mVer.setAttribute('aria-pressed', m === 'ver'); mEnt.setAttribute('aria-pressed', m === 'ent'); zeichne(); }
        mVer.addEventListener('click', function () { setze('ver'); });
        mEnt.addEventListener('click', function () { setze('ent'); });
        tab.addEventListener('click', function (e) {
            var z = e.target.closest('th, td'); if (!z) return;
            if (z.classList.contains('sl')) { wahlR = +z.getAttribute('data-r'); if (modus === 'ent') wahlS = -1; }
            else if (z.classList.contains('kt')) { if (modus === 'ver') wahlS = +z.getAttribute('data-s'); }
            else if (z.tagName === 'TD') {
                if (modus === 'ver') { wahlS = +z.getAttribute('data-s'); wahlR = +z.getAttribute('data-r'); }
                else if (wahlR >= 0 && +z.getAttribute('data-r') === wahlR) wahlS = +z.getAttribute('data-s');
                else { wahlR = +z.getAttribute('data-r'); wahlS = -1; }
            }
            zeichne();
        });
        function zeichne() {
            tab.querySelectorAll('.pfad, .treffer, .gewaehlt').forEach(function (x) { x.classList.remove('pfad', 'treffer', 'gewaehlt'); });
            if (wahlR >= 0) { tab.querySelector('th.sl[data-r="' + wahlR + '"]').classList.add('gewaehlt'); zellen[wahlR].forEach(function (td, s) { if (wahlS < 0 || s <= wahlS) td.classList.add('pfad'); }); }
            if (wahlS >= 0) { tab.querySelector('th.kt[data-s="' + wahlS + '"]').classList.add('gewaehlt'); for (var r = 0; r <= (wahlR >= 0 ? wahlR : 25); r++) zellen[r][wahlS].classList.add('pfad'); }
            if (wahlR >= 0 && wahlS >= 0) zellen[wahlR][wahlS].classList.add('treffer');
            if (modus === 'ver') {
                if (wahlR >= 0 && wahlS >= 0) meldung(info, 'Klartext ' + ABC[wahlS].toLowerCase() + ' mit Schlüssel ' + ABC[wahlR] + ' wird zu ' + ABC[(wahlR + wahlS) % 26] + '.', 'ok');
                else meldung(info, 'Wähle oben einen Klartextbuchstaben und links einen Schlüsselbuchstaben (oder klicke direkt in die Tabelle).', '');
            } else {
                if (wahlR < 0) meldung(info, '1. Wähle links den Schlüsselbuchstaben (oder eine Zelle in seiner Zeile).', '');
                else if (wahlS < 0) meldung(info, '2. Suche in der markierten Zeile ' + ABC[wahlR] + ' den Geheimtextbuchstaben und klicke ihn an.', '');
                else meldung(info, 'Geheimtext ' + ABC[(wahlR + wahlS) % 26] + ' mit Schlüssel ' + ABC[wahlR] + ': Ganz oben in dieser Spalte steht der Klartext ' + ABC[wahlS].toLowerCase() + '.', 'ok');
            }
        }
        zeichne();
    }

    // =====================================================================
    // 5) Schlüsselzähler (5.2, Aufgabe 3)
    // =====================================================================
    function schluesselzaehler(box) {
        werkzeug(box);
        var regler = el('input', { type: 'range', min: '2', max: '12', value: '4', 'aria-label': 'Anzahl Personen' });
        var nText = el('b', { text: '4' });
        var bild = el('div', { cls: 'vs-graph' });
        var info = el('p', { cls: 'vs-ausgabe' });
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Personen:' }), regler, nText]));
        box.appendChild(bild); box.appendChild(info);
        function zeichne() {
            var n = +regler.value; nText.textContent = n;
            var s = svg('svg', { viewBox: '0 0 300 300', cls: 'vs-graph-svg', role: 'img', 'aria-label': n + ' Personen, jede mit jeder verbunden' });
            var p = [];
            for (var i = 0; i < n; i++) { var w = 2 * Math.PI * i / n - Math.PI / 2; p.push([150 + 115 * Math.cos(w), 150 + 115 * Math.sin(w)]); }
            var kanten = 0;
            for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) { s.appendChild(svg('line', { x1: p[i][0], y1: p[i][1], x2: p[j][0], y2: p[j][1], cls: 'vs-kante' })); kanten++; }
            p.forEach(function (q, i) { s.appendChild(svg('circle', { cx: q[0], cy: q[1], r: 15, cls: 'vs-person' })); s.appendChild(svg('text', { x: q[0], y: q[1] + 5, cls: 'vs-person-t', text: String(i + 1) })); });
            bild.textContent = ''; bild.appendChild(s);
            info.innerHTML = 'Jede Linie ist ein eigener geheimer Schlüssel. ' + (n <= 8 ? 'Zähle die Linien: <b>' + kanten + ' Schlüssel</b>.' : 'Ab hier wird Zählen mühsam. Finde eine Formel! Wie viele Linien gehen von jeder Person aus?');
        }
        regler.addEventListener('input', zeichne);
        zeichne();
    }

    // =====================================================================
    // 6) Bildfolgen: Vorhängeschloss, Ablauf mit Signatur, Man-in-the-Middle
    // =====================================================================
    // Eine Szene: { a: [Inhalte bei A], m: [Kanal/Mitte], b: [bei B], text: '…', art: 'ok'|'warn' }
    function buehne(box, szenen, titel) {
        werkzeug(box);
        var n = 0;
        var spalten = titel.map(function (t) { return el('div', { cls: 'vs-bspalte' }, [el('div', { cls: 'vs-bkopf', html: t }), el('div', { cls: 'vs-binhalt' })]); });
        var feld = el('div', { cls: 'vs-buehne vs-b' + titel.length }, spalten);
        var text = el('div', { cls: 'vs-btext', 'aria-live': 'polite' });
        var zaehler = el('span', { cls: 'vs-klein' });
        var zurueck = knopf('◀ Zurück', function () { if (n > 0) { n--; zeichne(); } }, 'leise');
        var weiter = knopf('Weiter ▶', function () { if (n < szenen().length - 1) { n++; zeichne(); } });
        box.appendChild(feld); box.appendChild(text);
        box.appendChild(el('div', { cls: 'vs-steuer' }, [knopf('⟲ Von vorn', function () { n = 0; zeichne(); }, 'leise'), zurueck, weiter, zaehler]));
        function zeichne() {
            var liste = szenen();
            if (n >= liste.length) n = liste.length - 1;
            var s = liste[n];
            ['a', 'm', 'b', 'c'].slice(0, titel.length).forEach(function (k, i) {
                var inh = spalten[i].querySelector('.vs-binhalt');
                inh.innerHTML = (s[k] || []).map(function (x) { return '<div class="vs-bding' + (x.neu ? ' neu' : '') + (x.cls ? ' ' + x.cls : '') + '">' + x.h + '</div>'; }).join('');
            });
            text.innerHTML = s.text;
            text.className = 'vs-btext' + (s.art ? ' ' + s.art : '');
            zurueck.disabled = n === 0; weiter.disabled = n === liste.length - 1;
            zaehler.textContent = 'Schritt ' + (n + 1) + ' von ' + liste.length;
        }
        return { zeichne: function () { zeichne(); }, reset: function () { n = 0; zeichne(); } };
    }
    function chip(art, text) { return '<span class="vs-key ' + art + '">🔑 ' + text + '</span>'; }
    function d(h, neu, cls) { return { h: h, neu: neu, cls: cls }; }

    function schloss(box) {
        var szenen = [
            { a: [d('👩 Alice')], m: [], b: [d('👨 Bob'), d('🔑 privater Schlüssel', true)], text: 'Bob besorgt sich ein Vorhängeschloss mit passendem Schlüssel. Den <b>Schlüssel</b> behält er immer für sich: sein <b>privater Schlüssel</b>.' },
            { a: [d('👩 Alice'), d('🔓 offenes Bob-Schloss', true)], m: [d('🦹 Mallory'), d('🔓 offenes Bob-Schloss', true)], b: [d('👨 Bob'), d('🔑 privater Schlüssel'), d('🔓🔓🔓 viele offene Schlösser')], text: 'Bob verteilt <b>offene</b> Schlösser an alle, die ihm schreiben wollen. Jeder darf eins haben, auch Mallory. Das offene Schloss ist sein <b>öffentlicher Schlüssel</b>.' },
            { a: [d('👩 Alice'), d('📦 „Treffen 17 Uhr“'), d('🔒 mit Bobs Schloss zu', true)], m: [d('🦹 Mallory'), d('🔓 offenes Bob-Schloss')], b: [d('👨 Bob'), d('🔑 privater Schlüssel')], text: 'Alice legt ihre Nachricht in eine Kiste und lässt Bobs Schloss zuschnappen. Zum <b>Zuschließen</b> braucht man keinen Schlüssel. Ab jetzt kann aber auch Alice die Kiste nicht mehr öffnen.' },
            { a: [d('👩 Alice')], m: [d('🦹 Mallory'), d('📦🔒 Kiste unterwegs', true), d('❌ kein passender Schlüssel', true, 'warn')], b: [d('👨 Bob'), d('🔑 privater Schlüssel')], text: 'Die Kiste reist durchs Internet. Mallory fängt sie ab. Ein offenes Bob-Schloss hat er zwar auch, aber damit kann er nur zuschließen, nicht öffnen.', art: 'warn' },
            { a: [d('👩 Alice')], m: [d('🦹 Mallory')], b: [d('👨 Bob'), d('🔑 privater Schlüssel'), d('📦🔓 „Treffen 17 Uhr“', true, 'ok')], text: 'Nur Bob öffnet die Kiste mit seinem privaten Schlüssel. <b>Es musste vorher kein geheimer Schlüssel ausgetauscht werden!</b>', art: 'ok' },
            { a: [d('🔓 = öffentlicher Schlüssel')], m: [d('jeder darf damit <b>ver</b>schlüsseln')], b: [d('🔑 = privater Schlüssel'), d('nur Bob kann <b>ent</b>schlüsseln')], text: 'So funktioniert <b>asymmetrische Verschlüsselung</b>: Ein Schlüsselpaar aus öffentlichem und privatem Schlüssel. Mathematisch steckt dahinter eine <b>Falltürfunktion</b>: leicht in die eine Richtung, ohne Zusatzwissen praktisch unmöglich zurück. Beim RSA-Verfahren ist das die Primfaktorzerlegung.' }
        ];
        buehne(box, function () { return szenen; }, ['👩 Alice', '🌐 Internet', '👨 Bob']).zeichne();
    }

    function sha256(text) {
        if (!window.crypto || !crypto.subtle) return Promise.resolve('(nicht verfügbar)');
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (b) {
            return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        });
    }

    function ablauf(box) {
        var mitSignatur = box.getAttribute('data-ablauf') === 'signatur';
        var nachricht = 'Hallo', faelschung = 'Zahle 100 €', hA = '…', hF = '…';
        var manipuliert = false;
        var bu;
        if (mitSignatur) {
            var cb = el('input', { type: 'checkbox' });
            box.appendChild(el('label', { cls: 'vs-check' }, [cb, ' 🦹 Mallory tauscht unterwegs die Nachricht aus (er verschlüsselt eine eigene mit PubB)']));
            cb.addEventListener('change', function () { manipuliert = cb.checked; bu.zeichne(); });
        }
        var keysA = chip('prA', 'PrA') + chip('pubA', 'PubA') + chip('pubB', 'PubB');
        var keysB = chip('pubA', 'PubA') + chip('pubB', 'PubB') + chip('prB', 'PrB');
        function szenen() {
            var empf = manipuliert ? faelschung : nachricht;
            var hB = manipuliert ? hF : hA;
            var s = [
                { a: [d('👩 A'), d(keysA), d('📝 „' + nachricht + '“', true)], m: [], b: [d('👨 B'), d(keysB)], text: 'A möchte B die Nachricht „' + nachricht + '“ schicken. Beide haben ihr eigenes Schlüsselpaar und kennen den öffentlichen Schlüssel des anderen.' },
                { a: [d('👩 A'), d(keysA), d('📝 „' + nachricht + '“'), d('🔒 mit ' + chip('pubB', 'PubB') + ' → <code>x34ycf</code>', true)], m: [], b: [d('👨 B'), d(keysB)], text: '<b>Verschlüsseln:</b> A verschlüsselt mit dem <b>öffentlichen Schlüssel von B</b>. Lesen kann das nur, wer PrB hat. Das sichert die <b>Vertraulichkeit</b>.' }
            ];
            if (mitSignatur) {
                s.push({ a: [d('👩 A'), d('📝 „' + nachricht + '“'), d('#️⃣ Hashfunktion → <code>' + hA.slice(0, 12) + '…</code>', true)], m: [], b: [d('👨 B'), d(keysB)], text: '<b>Hashwert:</b> A berechnet den „Fingerabdruck“ der Nachricht mit einer Hashfunktion (hier echt: SHA-256).' });
                s.push({ a: [d('👩 A'), d('#️⃣ <code>' + hA.slice(0, 12) + '…</code>'), d('✍️ mit ' + chip('prA', 'PrA') + ' verschlüsselt = <b>Signatur</b>', true)], m: [], b: [d('👨 B'), d(keysB)], text: '<b>Signieren:</b> A verschlüsselt den Hashwert mit dem eigenen <b>privaten</b> Schlüssel. Das kann nur A. Das Ergebnis ist die digitale Signatur.' });
            }
            var unterwegs = [d('📨 <code>x34ycf</code>', true)];
            if (mitSignatur) unterwegs.push(d('✍️ Signatur', true));
            if (manipuliert) unterwegs = [d('🦹 Mallory fängt ab'), d('📨 <code>x34ycf</code> ✂️ weg'), d('📨 neu: „' + faelschung + '“ mit ' + chip('pubB', 'PubB'), true, 'warn')].concat(mitSignatur ? [d('✍️ Signatur von A (unverändert)')] : []);
            s.push({ a: [d('👩 A')], m: unterwegs, b: [d('👨 B'), d(keysB)], text: manipuliert ? 'Mallory kann <code>x34ycf</code> nicht lesen. Aber PubB ist öffentlich: Er ersetzt die Nachricht durch eine eigene, verschlüsselt mit PubB. Die Signatur von A lässt er dran, eine eigene kann er ohne PrA nicht erzeugen.' : 'A schickt ' + (mitSignatur ? 'Geheimtext und Signatur' : 'den Geheimtext') + ' über das Internet. Wer mitliest, sieht nur Zeichensalat.', art: manipuliert ? 'warn' : '' });
            s.push({ a: [d('👩 A')], m: [], b: [d('👨 B'), d(keysB), d('🔓 mit ' + chip('prB', 'PrB') + ' → 📝 „' + empf + '“', true)], text: '<b>Entschlüsseln:</b> B entschlüsselt mit dem eigenen <b>privaten</b> Schlüssel PrB.' + (mitSignatur ? '' : '') });
            if (!mitSignatur) {
                s.push({ a: [d('👩 A')], m: [d('❓')], b: [d('👨 B'), d('📝 „' + nachricht + '“'), d('🤔 Ist sie wirklich von A?', false, 'warn')], text: 'Vertraulich war das. Aber: PubB ist öffentlich. <b>Jeder</b> könnte B so eine Nachricht schicken und behaupten, er sei A. Woher weiß B, dass die Nachricht wirklich von A kommt und unterwegs nicht ausgetauscht wurde? Das klärt die <b>digitale Signatur</b> in 5.4.', art: 'warn' });
            } else {
                s.push({ a: [d('👩 A')], m: [], b: [d('👨 B'), d('📝 „' + empf + '“'), d('#️⃣ selbst berechnet: <code>' + hB.slice(0, 12) + '…</code>', true)], text: '<b>Prüfen, Teil 1:</b> B berechnet selbst den Hashwert der empfangenen Nachricht.' });
                s.push({ a: [d('👩 A')], m: [], b: [d('👨 B'), d('#️⃣ selbst berechnet: <code>' + hB.slice(0, 12) + '…</code>'), d('✍️ Signatur mit ' + chip('pubA', 'PubA') + ' entschlüsselt: <code>' + hA.slice(0, 12) + '…</code>', true)], text: '<b>Prüfen, Teil 2:</b> B entschlüsselt die Signatur mit dem <b>öffentlichen Schlüssel von A</b>. Heraus kommt der Hashwert, den A berechnet hat.' });
                var gleich = hA === hB;
                s.push({ a: [d('👩 A')], m: [], b: [d('👨 B'), d('<code>' + hB.slice(0, 12) + '…</code> ' + (gleich ? '=' : '≠') + ' <code>' + hA.slice(0, 12) + '…</code>'), d(gleich ? '✅ unverändert und von A' : '❌ Nachricht verändert oder nicht von A!', true, gleich ? 'ok' : 'warn')],
                    text: gleich ? '<b>Vergleich:</b> Beide Hashwerte sind gleich. Also wurde die Nachricht nicht verändert (<b>Integrität</b>), und nur A kann die Signatur erzeugt haben (<b>Authentizität</b>).' : '<b>Vergleich:</b> Die Hashwerte sind verschieden. B weiß: Diese Nachricht stammt nicht so von A. Ohne PrA kann Mallory keine passende Signatur bauen.', art: gleich ? 'ok' : 'warn' });
            }
            return s;
        }
        bu = buehne(box, szenen, ['👩 A (Absender)', '🌐 Internet', '👨 B (Empfänger)']);
        Promise.all([sha256(nachricht), sha256(faelschung)]).then(function (h) { hA = h[0]; hF = h[1]; bu.zeichne(); });
        bu.zeichne();
    }

    function mitm(box) {
        var mitCA = false;
        var cb = el('input', { type: 'checkbox' });
        box.appendChild(el('label', { cls: 'vs-check' }, [cb, ' 🏛️ Mit Zertifikat: Alice prüft den Schlüssel mit dem öffentlichen Schlüssel der Zertifizierungsstelle (CA)']));
        var bu;
        cb.addEventListener('change', function () { mitCA = cb.checked; bu.reset(); });
        function szenen() {
            var s = [
                { a: [d('👩 Alice'), d('„Bob, schick mir deinen öffentlichen Schlüssel!“', true)], m: [d('🦹 Mallory hört mit')], b: [d('👨 Bob')], text: 'Alice will Bob eine geheime Nachricht schicken. Dafür braucht sie seinen öffentlichen Schlüssel.' },
                { a: [d('👩 Alice')], m: [d('🦹 Mallory'), d('fängt ' + chip('pubB', 'PubB') + ' ab', true, 'warn')], b: [d('👨 Bob'), d('schickt ' + chip('pubB', 'PubB') + (mitCA ? ' mit Zertifikat' : ''))], text: 'Bob schickt seinen öffentlichen Schlüssel. Mallory sitzt „in der Mitte“ und fängt ihn ab.' },
                { a: [d('👩 Alice'), d('erhält ' + chip('pubM', 'PubM') + ' „von Bob“', true)], m: [d('🦹 Mallory'), d('schickt eigenen ' + chip('pubM', 'PubM'), true, 'warn')], b: [d('👨 Bob')], text: 'Mallory schickt Alice stattdessen seinen <b>eigenen</b> öffentlichen Schlüssel und behauptet: „Das ist Bobs Schlüssel.“', art: 'warn' }
            ];
            if (mitCA) {
                s.push({ a: [d('👩 Alice'), d('🏛️ prüft das Zertifikat mit dem CA-Schlüssel, der in ihrem Gerät gespeichert ist'), d('❌ Zertifikat ungültig: Der Schlüssel gehört nicht zu Bob!', true, 'warn')], m: [d('🦹 Mallory')], b: [d('👨 Bob')], text: 'Ein gültiges Zertifikat „Dieser Schlüssel gehört Bob“ kann nur die Zertifizierungsstelle ausstellen (signieren mit ihrem privaten Schlüssel). Mallory hat für PubM keines auf Bobs Namen. Alice bricht ab.', art: 'ok' });
                s.push({ a: [d('👩 Alice'), d('nutzt nur ' + chip('pubB', 'PubB') + ' mit gültigem Zertifikat', true, 'ok')], m: [d('🦹 Mallory'), d('liest nur Zeichensalat')], b: [d('👨 Bob')], text: 'Mit dem echten, zertifizierten PubB kann nur Bob die Nachricht lesen. Der Angriff ist gescheitert. Genau so prüft dein Browser bei <code>https://</code> die Zertifikate von Webseiten.', art: 'ok' });
            } else {
                s.push({ a: [d('👩 Alice'), d('🔒 „Treffen 17 Uhr“ mit ' + chip('pubM', 'PubM'), true)], m: [d('🦹 Mallory')], b: [d('👨 Bob')], text: 'Alice verschlüsselt ihre Nachricht ahnungslos mit PubM.' });
                s.push({ a: [d('👩 Alice')], m: [d('🦹 Mallory'), d('🔓 mit ' + chip('pubM', 'PrM') + ': „Treffen 17 Uhr“', true, 'warn'), d('✏️ ändert: „Treffen 18 Uhr“', true, 'warn'), d('🔒 neu mit ' + chip('pubB', 'PubB'), true)], b: [d('👨 Bob')], text: 'Mallory entschlüsselt mit seinem privaten Schlüssel, liest mit, ändert sogar etwas und verschlüsselt neu mit dem echten PubB.', art: 'warn' });
                s.push({ a: [d('👩 Alice'), d('🙂 alles gut?')], m: [d('🦹 Mallory 😈')], b: [d('👨 Bob'), d('🔓 mit ' + chip('prB', 'PrB') + ': „Treffen 18 Uhr“', true), d('🙂 alles gut?')], text: 'Bob entschlüsselt problemlos. Keiner der beiden merkt etwas. Das ist ein <b>Man-in-the-Middle-Angriff</b>. Schalte oben das Zertifikat ein und spiele noch einmal.', art: 'warn' });
            }
            return s;
        }
        bu = buehne(box, szenen, ['👩 Alice', '🦹 Mitte', '👨 Bob']);
        bu.zeichne();
    }

    // =====================================================================
    // 7) RSA: Übersicht prüfen und Modulo-Rechner (5.3)
    // =====================================================================
    function powmod(a, b, n) { a = BigInt(a); b = BigInt(b); n = BigInt(n); var r = 1n; a %= n; while (b > 0n) { if (b & 1n) r = r * a % n; a = a * a % n; b >>= 1n; } return Number(r); }
    function ggT(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
    function istPrim(p) { if (p < 2) return false; for (var i = 2; i * i <= p; i++) if (p % i === 0) return false; return true; }
    function inverses(e, f) { for (var dd = 1; dd < f; dd++) if (dd * e % f === 1) return dd; return null; }
    function modrechner(box) {
        werkzeug(box);
        var a = el('input', { type: 'number', cls: 'vs-input kurz', value: '72', 'aria-label': 'Basis a' });
        var b = el('input', { type: 'number', cls: 'vs-input kurz', value: '3', 'aria-label': 'Exponent b' });
        var n = el('input', { type: 'number', cls: 'vs-input kurz', value: '85', 'aria-label': 'Modul n' });
        var aus = el('b', { cls: 'vs-gross' });
        function r() { try { aus.textContent = '= ' + powmod(Math.floor(+a.value), Math.floor(+b.value), Math.max(1, Math.floor(+n.value))); } catch (e) { aus.textContent = '?'; } }
        [a, b, n].forEach(function (x) { x.addEventListener('input', r); });
        box.appendChild(el('div', { cls: 'vs-steuer vs-mod' }, [a, el('sup', {}, [b]), el('span', { text: ' mod ' }), n, aus]));
        box.appendChild(el('p', { cls: 'vs-klein', text: 'Rechnet a hoch b, aber zwischendurch immer mod n. So bleiben die Zahlen klein, auch bei 13⁴³. (Der Taschenrechner käme hier schnell an seine Grenzen.)' }));
        r();
    }
    function rsa(box) {
        werkzeug(box);
        var cfg = { p: 5, q: 17, e: 3, text: 'HI' };
        var mBuch = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'true', text: '📘 Buchbeispiel: p = 5, q = 17, „HI“' });
        var mEigen = el('button', { type: 'button', cls: 'vs-tab', 'aria-pressed': 'false', text: '🧪 Eigene Werte' });
        var eigen = el('div', { cls: 'vs-steuer', hidden: true });
        var ip = el('input', { type: 'number', cls: 'vs-input kurz', value: '7', 'aria-label': 'p' });
        var iq = el('input', { type: 'number', cls: 'vs-input kurz', value: '13', 'aria-label': 'q' });
        var ie = el('input', { type: 'number', cls: 'vs-input kurz', value: '5', 'aria-label': 'e' });
        var it = el('input', { cls: 'vs-input kurz', value: 'DU', maxlength: '3', 'aria-label': 'Nachricht' });
        var eigenInfo = el('div', { cls: 'vs-meldung' });
        eigen.appendChild(el('span', { text: 'p =' })); eigen.appendChild(ip); eigen.appendChild(el('span', { text: 'q =' })); eigen.appendChild(iq);
        eigen.appendChild(el('span', { text: 'e =' })); eigen.appendChild(ie); eigen.appendChild(el('span', { text: 'Nachricht:' })); eigen.appendChild(it);
        eigen.appendChild(knopf('Übernehmen', function () {
            var p = +ip.value, q = +iq.value, e = +ie.value, t = it.value.toUpperCase();
            var f = (p - 1) * (q - 1);
            if (!istPrim(p) || !istPrim(q) || p === q) { meldung(eigenInfo, 'p und q müssen zwei verschiedene Primzahlen sein.', 'falsch'); return; }
            if (p * q > 4000) { meldung(eigenInfo, 'Bitte kleine Zahlen (p · q höchstens 4000), damit man von Hand rechnen kann.', 'falsch'); return; }
            if (ggT(e, f) !== 1 || e < 2 || e >= f) { meldung(eigenInfo, 'e muss zwischen 2 und f = ' + f + ' liegen und teilerfremd zu f sein (ggT(' + e + ', ' + f + ') = ' + ggT(e, f) + ').', 'falsch'); return; }
            if (!t || t.split('').some(function (c) { return c.charCodeAt(0) >= p * q; })) { meldung(eigenInfo, 'Jeder ASCII-Wert muss kleiner als n = ' + p * q + ' sein. Wähle größere Primzahlen.', 'falsch'); return; }
            cfg = { p: p, q: q, e: e, text: t }; meldung(eigenInfo, 'Übernommen. Fülle die Übersicht aus.', 'ok'); baue();
        }));
        var tabelle = el('div', {});
        box.appendChild(el('div', { cls: 'vs-modi' }, [mBuch, mEigen]));
        box.appendChild(eigen); box.appendChild(eigenInfo);
        box.appendChild(tabelle);
        mBuch.addEventListener('click', function () { mBuch.setAttribute('aria-pressed', 'true'); mEigen.setAttribute('aria-pressed', 'false'); eigen.hidden = true; meldung(eigenInfo, '', ''); cfg = { p: 5, q: 17, e: 3, text: 'HI' }; baue(); });
        mEigen.addEventListener('click', function () { mEigen.setAttribute('aria-pressed', 'true'); mBuch.setAttribute('aria-pressed', 'false'); eigen.hidden = false; });
        function feld(soll, label, pruef) {
            var inp = el('input', { cls: 'vs-input kurz', 'aria-label': label, autocomplete: 'off' });
            inp.addEventListener('change', function () {
                var v = inp.value.trim();
                var ok = pruef ? pruef(v) : (v !== '' && +v === soll);
                inp.className = 'vs-input kurz ' + (v === '' ? '' : ok ? 'ok' : 'falsch');
            });
            return inp;
        }
        function baue() {
            var p = cfg.p, q = cfg.q, e = cfg.e, n = p * q, f = (p - 1) * (q - 1), dd = inverses(e, f);
            var ms = cfg.text.split('').map(function (c) { return c.charCodeAt(0); });
            var cs = ms.map(function (m) { return powmod(m, e, n); });
            tabelle.textContent = '';
            var t = el('table', { cls: 'vs-rsa' });
            function kopf(txt) { t.appendChild(el('tr', {}, [el('th', { colspan: '2', cls: 'vs-rsa-kopf', text: txt })])); }
            function zeile(links, inhalt) { t.appendChild(el('tr', {}, [el('td', { html: links }), el('td', {}, inhalt)])); }
            kopf('Schlüsselerzeugung');
            zeile('Eingabe: zwei Primzahlen p und q', [el('span', { text: 'p = ' + p + ', q = ' + q })]);
            zeile('n = p · q', ['n = ', feld(n, 'n')]);
            zeile('f = (p − 1) · (q − 1)', ['f = ', feld(f, 'f')]);
            zeile('e teilerfremd zu f', ['e = ' + e + ' · ggT(' + e + ', f) = ', feld(1, 'ggT')]);
            zeile('d mit d · e mod f = 1 (d &lt; f)', ['d = ', feld(dd, 'd')]);
            zeile('Ausgabe: privater Schlüssel (n, d), öffentlicher Schlüssel (n, e)', ['(', feld(n, 'n im privaten Schlüssel'), ', ', feld(dd, 'd im privaten Schlüssel'), ') und (', feld(n, 'n im öffentlichen Schlüssel'), ', ', feld(e, 'e im öffentlichen Schlüssel'), ')']);
            kopf('Verschlüsselung');
            zeile('Klartext als Zahlen (ASCII), jedes m<sub>i</sub> &lt; n', ms.map(function (m, i) { return el('span', { cls: 'vs-paar' }, ['„' + cfg.text[i] + '“: m' + (i + 1) + ' = ', feld(m, 'm' + (i + 1))]); }));
            zeile('c<sub>i</sub> = m<sub>i</sub><sup>e</sup> mod n', cs.map(function (c, i) { return el('span', { cls: 'vs-paar' }, ['c' + (i + 1) + ' = ', feld(c, 'c' + (i + 1))]); }));
            kopf('Entschlüsselung');
            zeile('m<sub>i</sub> = c<sub>i</sub><sup>d</sup> mod n', ms.map(function (m, i) { return el('span', { cls: 'vs-paar' }, ['m' + (i + 1) + ' = ', feld(m, 'entschlüsselt m' + (i + 1))]); }));
            zeile('Ausgabe: Klartext', [feld(0, 'Klartext', function (v) { return v.toUpperCase() === cfg.text; })]);
            tabelle.appendChild(el('div', { cls: 'tab-scroll' }, [t]));
            tabelle.appendChild(el('p', { cls: 'vs-klein', text: 'Nach jeder Eingabe (Enter oder Feld verlassen) wird das Feld grün (richtig) oder rot. Die Werte selbst verrät das Werkzeug nicht.' }));
        }
        baue();
    }

    // =====================================================================
    // 8) Hash-Labor (5.4)
    // =====================================================================
    function hashlabor(box) {
        werkzeug(box);
        var eingabe = el('input', { cls: 'vs-input breit', value: 'Hallo Welt!', 'aria-label': 'Text' });
        var aus = el('div', { cls: 'vs-hash' });
        var vgl = el('p', { cls: 'vs-klein' });
        var alt = null;
        function bits(h) { return h.split('').map(function (c) { return ('0000' + parseInt(c, 16).toString(2)).slice(-4); }).join(''); }
        function rechne() {
            var t = eingabe.value;
            sha256(t).then(function (h) {
                aus.innerHTML = '<small>SHA-256 von „' + esc(t) + '“</small><code>' + h.replace(/(.{8})/g, '$1 ') + '</code>';
                if (alt && alt.t !== t && h.length === 64) {
                    var b1 = bits(alt.h), b2 = bits(h), u = 0;
                    for (var i = 0; i < 256; i++) if (b1[i] !== b2[i]) u++;
                    vgl.innerHTML = 'Im Vergleich zu „' + esc(alt.t) + '“ haben sich <b>' + u + ' von 256 Bit</b> geändert (' + Math.round(u / 2.56) + ' %).';
                }
                alt = { t: t, h: h };
            });
        }
        eingabe.addEventListener('input', rechne);
        box.appendChild(el('h4', { text: 'Hashfunktion SHA-256' }));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [eingabe]));
        box.appendChild(aus); box.appendChild(vgl);
        box.appendChild(el('p', { cls: 'vs-klein', text: 'Ändere nur ein Zeichen (z. B. das Ausrufezeichen weglassen) und vergleiche.' }));
        // Quersumme
        var pin = el('input', { cls: 'vs-input kurz', value: '4242', maxlength: '4', inputmode: 'numeric', 'aria-label': 'PIN' });
        var qs = el('b', {});
        var andere = el('input', { cls: 'vs-input kurz', maxlength: '4', inputmode: 'numeric', 'aria-label': 'andere PIN mit gleicher Quersumme' });
        var qinfo = el('div', { cls: 'vs-meldung' });
        function quersumme(t) { return t.split('').reduce(function (s, c) { return s + (+c || 0); }, 0); }
        function zeigeQ() { qs.textContent = /^\d{4}$/.test(pin.value) ? String(quersumme(pin.value)) : '?'; }
        pin.addEventListener('input', zeigeQ);
        box.appendChild(el('h4', { text: 'Ist die Quersumme ein guter Fingerabdruck?' }));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('span', { text: 'PIN' }), pin, el('span', { text: '→ Quersumme' }), qs]));
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('span', { text: 'Finde eine andere PIN mit derselben Quersumme:' }), andere, knopf('Prüfen', function () {
            var a = andere.value;
            if (!/^\d{4}$/.test(a) || !/^\d{4}$/.test(pin.value)) { meldung(qinfo, 'Bitte zwei vierstellige PINs eingeben.', 'falsch'); return; }
            if (a === pin.value) { meldung(qinfo, 'Das ist dieselbe PIN. Finde eine andere!', 'falsch'); return; }
            var z = quersumme(pin.value), anzahl = 0;
            for (var i = 0; i < 10000; i++) if (quersumme(('000' + i).slice(-4)) === z) anzahl++;
            if (quersumme(a) === z) meldung(qinfo, '✓ Gefunden: ' + a + ' hat auch die Quersumme ' + z + '. Insgesamt haben ' + anzahl + ' der 10 000 PINs diese Quersumme. Ein Dieb mit der Karte hätte leichtes Spiel.', 'ok');
            else meldung(qinfo, '✗ ' + a + ' hat die Quersumme ' + quersumme(a) + '.', 'falsch');
        })]));
        box.appendChild(qinfo);
        zeigeQ(); rechne();
    }

    // =====================================================================
    // 9) Häufigkeitsanalyse mit Ersetzen (5.5, Aufgabe 1)
    // =====================================================================
    var DEUTSCH = { E: 17.4, N: 9.8, I: 7.6, S: 7.3, R: 7.0, A: 6.5, T: 6.2, D: 5.1, H: 4.8, U: 4.4, L: 3.4, C: 3.1, G: 3.0, M: 2.5, O: 2.5, B: 1.9, W: 1.9, F: 1.7, K: 1.2, Z: 1.1, P: 0.8, V: 0.7, J: 0.3, Y: 0.04, X: 0.03, Q: 0.02 };
    function haeufigkeit(box) {
        werkzeug(box);
        var text = el('textarea', { cls: 'vs-input breit', rows: '3', 'aria-label': 'Geheimtext' });
        text.value = box.getAttribute('data-text') || 'WBX TGMPHKM TNY WBX YKTZX GTVA WXF EXUXG WXF NGBOXKLNF NGW WXF ZTGSXG KXLM ETNMXM SPXBNGWOBXKSBZ';
        var sortiert = el('input', { type: 'checkbox' });
        var balken = el('div', { cls: 'vs-balken' });
        var tabelle = el('div', { cls: 'vs-ersetzen' });
        var vorschau = el('div', { cls: 'vs-vorschau' });
        var ersatz = {};
        var eingaben = {};
        ABC.split('').forEach(function (c) {
            var i = el('input', { cls: 'vs-input mini', maxlength: '1', 'aria-label': 'Geheimtextbuchstabe ' + c + ' steht für' });
            i.addEventListener('input', function () { var v = i.value.toUpperCase().replace(/[^A-Z]/g, ''); i.value = v; if (v) ersatz[c] = v; else delete ersatz[c]; zeichneVorschau(); markiereDoppelt(); });
            eingaben[c] = i;
            tabelle.appendChild(el('label', { cls: 'vs-ers' }, [el('b', { text: c }), el('span', { text: '→' }), i]));
        });
        box.appendChild(el('label', { cls: 'vs-label', text: 'Geheimtext' }));
        box.appendChild(text);
        box.appendChild(el('h4', { text: 'Wie oft kommt jeder Buchstabe vor?' }));
        box.appendChild(el('label', { cls: 'vs-check' }, [sortiert, ' nach Häufigkeit sortieren']));
        box.appendChild(balken);
        box.appendChild(el('p', { cls: 'vs-klein', html: '<span class="vs-leg geheim"></span> im Geheimtext · <span class="vs-leg deutsch"></span> in deutschen Texten (Anteil in %)' }));
        box.appendChild(el('h4', { text: 'Ersetzen: Welcher Klartextbuchstabe steckt dahinter?' }));
        box.appendChild(tabelle);
        box.appendChild(el('div', { cls: 'vs-steuer' }, [knopf('Alle Ersetzungen löschen', function () { ersatz = {}; Object.keys(eingaben).forEach(function (k) { eingaben[k].value = ''; }); zeichneVorschau(); markiereDoppelt(); }, 'leise')]));
        box.appendChild(el('p', { cls: 'vs-klein', html: 'Vorschau: <span class="vs-ersetzt">ersetzte Buchstaben klein</span>, noch nicht ersetzte groß.' }));
        box.appendChild(vorschau);
        text.addEventListener('input', function () { zeichneBalken(); zeichneVorschau(); });
        sortiert.addEventListener('change', zeichneBalken);
        function zeichneBalken() {
            var t = text.value.toUpperCase(), z = {}, gesamt = 0;
            ABC.split('').forEach(function (c) { z[c] = 0; });
            t.split('').forEach(function (c) { if (z[c] !== undefined) { z[c]++; gesamt++; } });
            var reihe = ABC.split('');
            if (sortiert.checked) reihe.sort(function (a, b) { return z[b] - z[a]; });
            var deutsch = Object.keys(DEUTSCH).sort(function (a, b) { return DEUTSCH[b] - DEUTSCH[a]; });
            var max = Math.max(18, Math.max.apply(null, reihe.map(function (c) { return gesamt ? z[c] / gesamt * 100 : 0; })));
            balken.textContent = '';
            reihe.forEach(function (c, i) {
                var p = gesamt ? z[c] / gesamt * 100 : 0;
                var ref = sortiert.checked ? deutsch[i] : c;
                balken.appendChild(el('div', { cls: 'vs-bsp', title: c + ': ' + z[c] + '-mal' }, [
                    el('span', { cls: 'vs-bzahl', text: z[c] || '' }),
                    el('div', { cls: 'vs-bpaar' }, [el('span', { cls: 'vs-bb geheim', style: 'height:' + (p / max * 100) + '%' }), el('span', { cls: 'vs-bb deutsch', style: 'height:' + (DEUTSCH[ref] / max * 100) + '%' })]),
                    el('b', { text: c }), sortiert.checked ? el('small', { text: ref }) : null]));
            });
        }
        function zeichneVorschau() {
            vorschau.innerHTML = text.value.toUpperCase().split('').map(function (c) {
                if (ersatz[c]) return '<span class="vs-ersetzt">' + ersatz[c].toLowerCase() + '</span>';
                return esc(c);
            }).join('');
        }
        function markiereDoppelt() {
            var gezaehlt = {};
            Object.keys(ersatz).forEach(function (k) { gezaehlt[ersatz[k]] = (gezaehlt[ersatz[k]] || 0) + 1; });
            Object.keys(eingaben).forEach(function (k) { eingaben[k].classList.toggle('falsch', !!ersatz[k] && gezaehlt[ersatz[k]] > 1); });
        }
        zeichneBalken(); zeichneVorschau();
    }

    // =====================================================================
    // 10) Brute-Force-Maschine (5.5, Aufgabe 2) – eigenes Beispiel, nicht der Text aus der IDE
    // =====================================================================
    function bruteforce(box) {
        werkzeug(box);
        var text = el('input', { cls: 'vs-input breit', value: caesar('DIEDREIFRAGEZEICHENLOESENDENFALL', 9), 'aria-label': 'Geheimtext (Caesar)' });
        var schritte = [
            ['B1', '① Nimm den nächsten Schlüssel (1 bis 25).'],
            ['B2', '② Entschlüssle den Geheimtext mit diesem Schlüssel.'],
            ['B3', '③ Prüfe: Kommt DER, DIE oder DAS vor?'],
            ['B4', '④ Wenn ja: Schlüssel und Versuch ausgeben.']
        ];
        var liste = el('ol', { cls: 'vs-bf-schritte' });
        var li = {};
        schritte.forEach(function (s) { li[s[0]] = el('li', { text: s[1] }); liste.appendChild(li[s[0]]); });
        var rad = el('div', { cls: 'vs-bf-rad', text: '–' });
        var versuch = el('div', { cls: 'vs-bf-versuch' });
        var protokoll = el('div', { cls: 'vs-bf-protokoll' });
        var treffer = el('div', { cls: 'vs-bf-treffer' });
        var tempo = el('input', { type: 'range', min: '1', max: '10', value: '4', 'aria-label': 'Tempo' });
        var timer = null, k = 0, phase = 0;
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'Geheimtext:' }), text]));
        box.appendChild(el('div', { cls: 'vs-bf' }, [el('div', { cls: 'vs-bf-links' }, [el('div', { cls: 'vs-klein', text: 'Schlüssel' }), rad, liste]), el('div', { cls: 'vs-bf-rechts' }, [versuch, el('div', { cls: 'vs-klein', text: 'Alle Versuche' }), protokoll])]));
        box.appendChild(el('div', { cls: 'vs-klein', text: 'Ausgabe (④):' }));
        box.appendChild(treffer);
        var start = knopf('▶ Start', function () { if (timer) { halt(); return; } if (k >= 25 && phase === 0) reset(); start.textContent = '⏸ Anhalten'; timer = setInterval(schritt, 900 / +tempo.value); });
        box.appendChild(el('div', { cls: 'vs-steuer' }, [start, knopf('Ein Schritt', function () { halt(); schritt(); }, 'leise'), knopf('⟲', reset, 'leise'), el('label', { cls: 'vs-klein', text: 'Tempo' }), tempo]));
        function halt() { clearInterval(timer); timer = null; start.textContent = '▶ Start'; }
        function reset() { halt(); k = 0; phase = 0; protokoll.textContent = ''; treffer.textContent = ''; versuch.textContent = ''; rad.textContent = '–'; markiere(null); }
        function markiere(z) { Object.keys(li).forEach(function (x) { li[x].classList.toggle('jetzt', x === z); }); }
        text.addEventListener('input', reset);
        var aktuell = '';
        function schritt() {
            var g = text.value.toUpperCase().replace(/[^A-Z]/g, '');
            if (phase === 0) {
                if (k >= 25) { halt(); markiere(null); versuch.innerHTML = 'Fertig: Alle 25 Schlüssel ausprobiert.'; return; }
                k++; rad.textContent = k; markiere('B1'); versuch.innerHTML = 'Schlüssel <b>' + k + '</b>'; phase = 1;
            } else if (phase === 1) {
                aktuell = caesar(g, 26 - k); markiere('B2'); versuch.innerHTML = 'Schlüssel ' + k + ': <code>' + aktuell + '</code>'; phase = 2;
            } else if (phase === 2) {
                markiere('B3');
                var m = aktuell.replace(/(DER|DIE|DAS)/g, '<mark>$1</mark>');
                var gefunden = m !== aktuell;
                versuch.innerHTML = 'Schlüssel ' + k + ': <code>' + m + '</code> ' + (gefunden ? '✅' : '✗');
                protokoll.appendChild(el('div', { cls: gefunden ? 'ja' : '', html: '<b>' + k + '</b> ' + m }));
                protokoll.scrollTop = protokoll.scrollHeight;
                phase = gefunden ? 3 : 0;
            } else {
                markiere('B4');
                treffer.appendChild(el('div', { html: 'Schlüssel ' + k + ': <code>' + aktuell + '</code>' }));
                phase = 0;
            }
        }
    }

    // =====================================================================
    // 11) Faktorisier-Stoppuhr (5.5, Aufgabe 4)
    // =====================================================================
    function zufallsPrim(stellen) { var lo = Math.pow(10, stellen - 1), hi = Math.pow(10, stellen) - 1; for (var v = 0; v < 1000; v++) { var p = zufall(Math.max(2, lo), hi); if (istPrim(p)) return p; } return 2; }
    function faktor(box) {
        werkzeug(box);
        var eingabe = el('input', { cls: 'vs-input', value: '65', inputmode: 'numeric', 'aria-label': 'Zahl n' });
        var info = el('div', { cls: 'vs-meldung' });
        var tab = el('table', { cls: 'vs-faktor' }, [el('tr', {}, [el('th', { text: 'n' }), el('th', { text: 'Stellen' }), el('th', { text: 'Faktoren' }), el('th', { text: 'Versuche' }), el('th', { text: 'Zeit' })])]);
        var laeuft = false;
        function zerlege(n) {
            if (laeuft) return;
            if (!(n >= 4) || n > 9e15 || Math.floor(n) !== n) { meldung(info, 'Bitte eine ganze Zahl zwischen 4 und 9 000 000 000 000 000.', 'falsch'); return; }
            laeuft = true;
            var t0 = performance.now(), tt = 2, wurzel = Math.floor(Math.sqrt(n)), gefunden = 0;
            if (n % 2 === 0) gefunden = 2;
            meldung(info, 'Probiere Teiler aus …', '');
            (function runde() {
                var ende = Math.min(wurzel, tt + 2e6);
                if (!gefunden) { for (var t = tt === 2 ? 3 : tt; t <= ende; t += 2) { if (n % t === 0) { gefunden = t; break; } } tt = t; }
                if (!gefunden && tt <= wurzel) { setTimeout(runde, 0); return; }
                var zeit = performance.now() - t0;
                var f = gefunden ? gefunden + ' · ' + (n / gefunden) : 'Primzahl';
                tab.insertBefore(el('tr', {}, [el('td', { text: String(n) }), el('td', { text: String(String(n).length) }), el('td', { text: f }), el('td', { text: (gefunden ? Math.ceil(gefunden / 2) : Math.ceil(wurzel / 2)).toLocaleString('de-DE') }), el('td', { text: zeit < 1000 ? zeit.toFixed(1) + ' ms' : (zeit / 1000).toFixed(2) + ' s' })]), tab.children[1] || null);
                var versuche = gefunden ? Math.ceil(gefunden / 2) : Math.ceil(wurzel / 2);
                var proSek = versuche / Math.max(zeit, 0.05) * 1000;
                // Hochrechnung: n mit 617 Stellen (RSA-2048) braucht bis zu ca. 10^308 / 2 Versuche
                var exp = Math.round(308 - Math.log10(2) - Math.log10(proSek) - Math.log10(3.15e7));
                meldung(info, (gefunden ? '✓ ' + n + ' = ' + f : n + ' ist eine Primzahl.') + ' Hochgerechnet mit diesem Tempo (ca. ' + Math.round(proSek).toLocaleString('de-DE') + ' Versuche pro Sekunde) bräuchte ein RSA-Modul mit 617 Stellen etwa 10^' + exp + ' Jahre.', 'ok');
                laeuft = false;
            })();
        }
        box.appendChild(el('div', { cls: 'vs-steuer' }, [el('label', { cls: 'vs-label', text: 'n =' }), eingabe, knopf('Zerlegen', function () { zerlege(+eingabe.value); })]));
        var zufallKn = el('div', { cls: 'vs-steuer' }, [el('span', { cls: 'vs-klein', text: 'n aus zwei zufälligen Primzahlen mit je … Stellen:' })]);
        [1, 2, 3, 4, 5, 6, 7].forEach(function (s) { zufallKn.appendChild(knopf(String(s), function () { var n = zufallsPrim(s) * zufallsPrim(s); eingabe.value = n; zerlege(n); }, 'leise')); });
        box.appendChild(zufallKn);
        box.appendChild(info);
        box.appendChild(el('div', { cls: 'tab-scroll' }, [tab]));
        box.appendChild(el('p', { cls: 'vs-klein', text: 'Beobachte: Zwei Stellen mehr pro Primzahl bedeuten etwa 100-mal so viele Versuche. Ein echter RSA-Schlüssel hat ein n mit über 600 Dezimalstellen.' }));
    }

    // ---------- Start ----------
    function start() {
        var tabelle = { 'data-skytale': skytale, 'data-scheibe': scheibe, 'data-tracer': tracer, 'data-vigenere': vigenere, 'data-schluesselzaehler': schluesselzaehler,
            'data-schloss': schloss, 'data-rsa': rsa, 'data-modrechner': modrechner, 'data-ablauf': ablauf, 'data-mitm': mitm, 'data-hash': hashlabor,
            'data-haeufigkeit': haeufigkeit, 'data-bruteforce': bruteforce, 'data-faktor': faktor };
        Object.keys(tabelle).forEach(function (a) { document.querySelectorAll('[' + a + ']').forEach(function (b) { tabelle[a](b); }); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    window.Verschluesselung = { caesar: caesar, powmod: powmod, tracerSchritte: tracerSchritte };
})();

/* ==========================================================================
   Lösungsweg (wie in informatik/11/graphen/graphen.js)
   ========================================================================== */
(function () {
    'use strict';
    var HALTEZEIT = 1500;
    function loesungsweg(box) {
        var titel = box.getAttribute('data-loesungsweg') || '';
        var stufen = Array.prototype.slice.call(box.querySelectorAll('template[data-stufe]'));
        if (!stufen.length) return;
        var kopf = document.createElement('div');
        kopf.className = 'lw-kopf';
        kopf.textContent = '💡 Hilfe' + (titel ? ': ' + titel : '');
        var inhalt = document.createElement('div');
        inhalt.className = 'lw-inhalt';
        var knoepfe = document.createElement('div');
        knoepfe.className = 'lw-knoepfe';
        box.appendChild(kopf); box.appendChild(inhalt); box.appendChild(knoepfe);
        var stand = 0;
        function zeigeStufe(i) {
            var t = stufen[i];
            var teil = document.createElement('div');
            teil.className = 'lw-stufe' + (t.hasAttribute('data-halten') ? ' lw-loesung' : '');
            var marke = document.createElement('div');
            marke.className = 'lw-marke';
            marke.textContent = t.getAttribute('data-stufe');
            teil.appendChild(marke);
            teil.appendChild(document.importNode(t.content, true));
            inhalt.appendChild(teil);
            stand = i + 1;
            baueKnoepfe();
        }
        function zuruecksetzen() { inhalt.textContent = ''; stand = 0; baueKnoepfe(); }
        function baueKnoepfe() {
            knoepfe.textContent = '';
            if (stand < stufen.length) {
                var t = stufen[stand];
                var k = document.createElement('button');
                k.type = 'button';
                if (t.hasAttribute('data-halten')) {
                    k.className = 'lw-knopf lw-halten';
                    k.innerHTML = '<span class="lw-fortschritt"></span><span class="lw-text"></span>';
                    k.querySelector('.lw-text').textContent = t.getAttribute('data-stufe') + ' zeigen: gedrückt halten';
                    k.setAttribute('aria-label', t.getAttribute('data-stufe') + ' zeigen (Taste oder Maus ' + (HALTEZEIT / 1000) + ' Sekunden gedrückt halten)');
                    haltenAktivieren(k, function () { zeigeStufe(stand); });
                } else {
                    k.className = 'lw-knopf';
                    k.textContent = t.getAttribute('data-stufe') + ' zeigen';
                    k.addEventListener('click', function () { zeigeStufe(stand); });
                }
                knoepfe.appendChild(k);
            }
            if (stand > 0) {
                var weg = document.createElement('button');
                weg.type = 'button';
                weg.className = 'lw-knopf lw-weg';
                weg.textContent = 'wieder ausblenden';
                weg.addEventListener('click', zuruecksetzen);
                knoepfe.appendChild(weg);
            }
        }
        baueKnoepfe();
    }
    function haltenAktivieren(knopf, fertig) {
        var timer = null, balken = knopf.querySelector('.lw-fortschritt');
        function start(e) {
            if (timer) return;
            if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (e && e.type === 'keydown') e.preventDefault();
            balken.style.transition = 'width ' + HALTEZEIT + 'ms linear';
            balken.style.width = '100%';
            timer = setTimeout(function () { timer = null; fertig(); }, HALTEZEIT);
        }
        function stopp() {
            if (!timer) return;
            clearTimeout(timer); timer = null;
            balken.style.transition = 'width .2s'; balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    function start() { document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
