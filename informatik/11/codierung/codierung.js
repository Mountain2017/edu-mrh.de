/* ==========================================================================
   Codierung (Informatik 11) – Werkzeuge der Stationsseiten 4.1 bis 4.3
   Alles läuft im Browser, nichts wird gespeichert oder verschickt.

   Markup (jeweils ein leeres <div> mit data-Attribut):
     <div data-stellenwert data-basis="2" data-stellen="5" data-ziele="5,18,31"></div>
          Bit-Schalter bzw. Hex-Schalter mit Stellenwerttabelle wie auf Blatt 4.1
          (data-hex: zusätzlich Vierergruppen und Hex-Ziffern anzeigen)
     <div data-umrechnen data-beispiele="700:16,29:2"></div>
          Umrechnung Dezimal → Basis nach dem Verfahren ①②③ von Blatt 4.1:
          „Vorführen“ (nur Beispiele) und „Selbst rechnen“ (jede Zahl, Prüfung je Durchgang)
     <div data-rgb></div>            RGB-Mischer (dezimal, hexadezimal, binär)
     <div data-lupe></div>           Pixel-Lupe: Farbwerte einzelner Pixel
     <div data-pixeleditor></div>    8 × 8-Raster codieren und decodieren (Blatt 4.2, Aufgabe 4)
     <div data-morse></div>          Morse-Funkgerät: Tabelle, Abspielen, Codierung/Decodierung prüfen
     <div data-ean></div>            Barcode-Werkzeug EAN-13 (Zeichensätze A/B/C, Prüfziffer prüfen)
     <div data-gtin-raten></div>     Prüfziffer-Detektiv: Welche von drei GTINs ist falsch?
     <div data-zaubertrick></div>    Zaubertrick mit Paritätsbits zum Selbstspielen
     <div class="lw" data-loesungsweg="…"> Lösungsweg mit Tipps und Lösung (Gedrückthalten)
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
    function knopf(text, fn, cls) { return el('button', { type: 'button', cls: 'cd-knopf' + (cls ? ' ' + cls : ''), text: text, onclick: fn }); }
    function meldung(box, text, art) { box.textContent = text; box.className = 'cd-meldung' + (art ? ' ' + art : ''); }
    var ZIFFERN = '0123456789ABCDEF';
    function hoch(b, k) { return b + '<sup>' + k + '</sup>'; }
    function zufall(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

    // =====================================================================
    // 1) Stellenwert-Schalter (Bit-Schalter / Hex-Schalter), Blatt 4.1
    // =====================================================================
    function stellenwert(box) {
        var basis = +(box.getAttribute('data-basis') || 2);
        var n = +(box.getAttribute('data-stellen') || 5);
        var ziele = (box.getAttribute('data-ziele') || '').split(',').filter(Boolean).map(Number);
        var zeigeHex = box.hasAttribute('data-hex');
        var ziffern = [];
        for (var i = 0; i < n; i++) ziffern.push(0);
        box.classList.add('cd-werkzeug');

        var tab = el('table', { cls: 'cd-stellen' });
        var zWert = el('tr', {}, [el('th', { scope: 'row', text: 'Stellenwert' })]);
        var zZiffer = el('tr', { cls: 'cd-zifferzeile' }, [el('th', { scope: 'row', text: basis === 2 ? 'Bit' : 'Ziffer' })]);
        var zProdukt = el('tr', {}, [el('th', { scope: 'row', text: 'Produkt' })]);
        var zHex = zeigeHex ? el('tr', { cls: 'cd-hexzeile' }, [el('th', { scope: 'row', text: 'Hex' })]) : null;
        var knoepfe = [], produkte = [];
        for (var p = 0; p < n; p++) {
            var k = n - 1 - p;   // Exponent: links groß, rechts 0
            zWert.appendChild(el('td', { html: hoch(basis, k) + '<br><b>' + Math.pow(basis, k) + '</b>' }));
            (function (pos) {
                var b = el('button', { type: 'button', cls: 'cd-ziffer', 'aria-label': 'Stelle ' + basis + ' hoch ' + (n - 1 - pos) + ', Ziffer ändern' , text: '0' });
                b.addEventListener('click', function () { ziffern[pos] = (ziffern[pos] + 1) % basis; zeichne(); });
                b.addEventListener('contextmenu', function (e) { e.preventDefault(); ziffern[pos] = (ziffern[pos] + basis - 1) % basis; zeichne(); });
                knoepfe.push(b);
                var td = el('td', {}, [b]);
                if (basis > 2) {
                    td.appendChild(el('div', { cls: 'cd-pfeile' }, [
                        el('button', { type: 'button', cls: 'cd-mini', 'aria-label': 'kleiner', text: '−', onclick: function () { ziffern[pos] = (ziffern[pos] + basis - 1) % basis; zeichne(); } }),
                        el('button', { type: 'button', cls: 'cd-mini', 'aria-label': 'größer', text: '+', onclick: function () { ziffern[pos] = (ziffern[pos] + 1) % basis; zeichne(); } })
                    ]));
                }
                zZiffer.appendChild(td);
            })(p);
            var pr = el('td', { text: '0' });
            produkte.push(pr);
            zProdukt.appendChild(pr);
        }
        if (zHex) {
            var erste = n % 4 || 4;   // Vierergruppen von rechts
            for (var g = 0; g < n; g += (g === 0 ? erste : 4)) {
                zHex.appendChild(el('td', { colspan: g === 0 ? erste : 4, cls: 'cd-hexgruppe' }));
            }
        }
        tab.appendChild(zWert); tab.appendChild(zZiffer); tab.appendChild(zProdukt);
        if (zHex) tab.appendChild(zHex);
        var summe = el('div', { cls: 'cd-summe' });
        var zielBox = el('div', { cls: 'cd-ziele' });
        var zielStand = 0;
        box.appendChild(el('div', { cls: 'tab-scroll' }, [tab]));
        box.appendChild(summe);
        if (ziele.length) box.appendChild(zielBox);
        var steuer = el('div', { cls: 'cd-steuer' }, [
            knopf('Alle auf 0', function () { for (var i = 0; i < n; i++) ziffern[i] = 0; zeichne(); }, 'leise'),
            knopf('Größte Zahl', function () { for (var i = 0; i < n; i++) ziffern[i] = basis - 1; zeichne(); }, 'leise')
        ]);
        box.appendChild(steuer);
        if (basis > 2) box.appendChild(el('p', { cls: 'cd-klein', text: 'Klick auf eine Ziffer oder + erhöht, − (oder Rechtsklick) verringert.' }));

        function wert() { var w = 0; for (var i = 0; i < n; i++) w = w * basis + ziffern[i]; return w; }
        function zeichne() {
            var teile = [];
            for (var i = 0; i < n; i++) {
                var sw = Math.pow(basis, n - 1 - i);
                knoepfe[i].textContent = ZIFFERN[ziffern[i]];
                knoepfe[i].classList.toggle('an', ziffern[i] > 0);
                produkte[i].innerHTML = ZIFFERN[ziffern[i]] + (basis > 10 && ziffern[i] > 9 ? '<small> (' + ziffern[i] + ')</small>' : '') + ' · ' + sw + ' = <b>' + ziffern[i] * sw + '</b>';
                if (ziffern[i]) teile.push(ziffern[i] * sw);
            }
            var w = wert();
            var zahlText = ziffern.map(function (z) { return ZIFFERN[z]; }).join('');
            summe.innerHTML = '<span class="cd-zahl">' + zahlText + '<sub>' + basis + '</sub></span> = ' + (teile.length > 1 ? teile.join(' + ') + ' = ' : '') + '<b class="cd-zahl">' + w + '<sub>10</sub></b>';
            if (zHex) {
                var zellen = zHex.querySelectorAll('.cd-hexgruppe');
                var start = 0;
                zellen.forEach(function (z) {
                    var br = +z.getAttribute('colspan');
                    var v = 0;
                    for (var j = start; j < start + br; j++) v = v * 2 + ziffern[j];
                    z.innerHTML = ziffern.slice(start, start + br).join('') + ' → <b>' + ZIFFERN[v] + '</b>';
                    start += br;
                });
            }
            if (ziele.length) {
                if (zielStand < ziele.length && w === ziele[zielStand]) zielStand++;
                zielBox.innerHTML = '';
                ziele.forEach(function (z, i) {
                    zielBox.appendChild(el('span', { cls: 'cd-ziel' + (i < zielStand ? ' ok' : (i === zielStand ? ' jetzt' : '')), text: (i < zielStand ? '✓ ' : '') + 'Stelle ' + z + ' ein' }));
                });
                if (zielStand === ziele.length) zielBox.appendChild(el('span', { cls: 'cd-ziel ok', text: '🎉 Geschafft! Was ist die größte Zahl mit ' + n + ' Stellen?' }));
            }
        }
        zeichne();
    }

    // =====================================================================
    // 2) Umrechnen Dezimal → Basis b mit dem Verfahren ①②③ (Blatt 4.1)
    // =====================================================================
    function durchgaenge(x, b) {
        var S = 1, k = 0;
        while (S * b <= x) { S *= b; k++; }
        var liste = [], rest = x;
        for (; k >= 0; k--) {
            var sw = Math.pow(b, k);
            var z = Math.floor(rest / sw);
            liste.push({ k: k, S: sw, x: rest, ziffer: z, rest: rest - z * sw });
            rest = rest - z * sw;
        }
        return liste;
    }
    function umrechnen(box) {
        var beispiele = (box.getAttribute('data-beispiele') || '700:16,29:2').split(',').map(function (s) { var t = s.split(':'); return { x: +t[0], b: +t[1] }; });
        box.classList.add('cd-werkzeug');
        var modus = 'zeigen', aktuell = beispiele[0], schritt = 0;
        var wahl = el('select', { cls: 'cd-select', 'aria-label': 'Beispiel wählen' });
        beispiele.forEach(function (bsp, i) { wahl.appendChild(el('option', { value: i, text: bsp.x + ' → ' + (bsp.b === 16 ? 'Hexadezimal' : 'Binär') })); });
        var mZeigen = el('button', { type: 'button', cls: 'cd-tab', 'aria-pressed': 'true', text: '▶ Vorführen' });
        var mRechnen = el('button', { type: 'button', cls: 'cd-tab', 'aria-pressed': 'false', text: '✍️ Selbst rechnen' });
        var eingabeZahl = el('input', { type: 'number', min: '1', max: '999999', value: '1337', cls: 'cd-input', 'aria-label': 'Dezimalzahl' });
        var eingabeBasis = el('select', { cls: 'cd-select', 'aria-label': 'Zielsystem' }, [el('option', { value: '16', text: 'Hexadezimal (16)' }), el('option', { value: '2', text: 'Binär (2)' }), el('option', { value: '8', text: 'Oktal (8)' })]);
        var startRechnen = knopf('Los', function () { var x = Math.floor(+eingabeZahl.value); if (!(x >= 1 && x <= 999999)) { meldung(info, 'Bitte eine ganze Zahl von 1 bis 999 999 eingeben.', 'falsch'); return; } aktuell = { x: x, b: +eingabeBasis.value }; schritt = 0; baueRechnen(); });
        var zufallKnopf = knopf('🎲 Zufallszahl', function () { eingabeZahl.value = zufall(100, 4000); startRechnen.click(); }, 'leise');
        var leisteZeigen = el('div', { cls: 'cd-steuer' }, [wahl]);
        var leisteRechnen = el('div', { cls: 'cd-steuer', hidden: true }, [eingabeZahl, el('span', { text: '→' }), eingabeBasis, startRechnen, zufallKnopf]);
        var bild = el('div', { cls: 'cd-um-bild' });
        var tabelle = el('div', { cls: 'cd-um-schritte' });
        var info = el('p', { cls: 'cd-meldung' });
        var steuer = el('div', { cls: 'cd-steuer' });
        var weiter = knopf('Weiter ▶', function () { schritt++; zeichneZeigen(); });
        var zurueck = knopf('◀ Zurück', function () { if (schritt > 0) schritt--; zeichneZeigen(); }, 'leise');
        steuer.appendChild(zurueck); steuer.appendChild(weiter);
        box.appendChild(el('div', { cls: 'cd-modi' }, [mZeigen, mRechnen]));
        box.appendChild(leisteZeigen); box.appendChild(leisteRechnen);
        box.appendChild(el('div', { cls: 'cd-um-haupt' }, [bild, tabelle]));
        box.appendChild(info); box.appendChild(steuer);

        function setzeModus(m) {
            modus = m;
            mZeigen.setAttribute('aria-pressed', m === 'zeigen'); mRechnen.setAttribute('aria-pressed', m === 'rechnen');
            leisteZeigen.hidden = m !== 'zeigen'; leisteRechnen.hidden = m !== 'rechnen'; steuer.hidden = m !== 'zeigen';
            schritt = 0;
            if (m === 'zeigen') { aktuell = beispiele[+wahl.value]; zeichneZeigen(); } else baueRechnen();
        }
        mZeigen.addEventListener('click', function () { setzeModus('zeigen'); });
        mRechnen.addEventListener('click', function () { setzeModus('rechnen'); });
        wahl.addEventListener('change', function () { aktuell = beispiele[+wahl.value]; schritt = 0; zeichneZeigen(); });

        // Stellenwerttabelle mit bisher bekannten Ziffern
        function zeichneTabelle(liste, bekannt) {
            var t = el('table', { cls: 'cd-stellen klein' });
            var r1 = el('tr', {}, [el('th', { scope: 'row', text: 'Stellenwert' })]);
            var r2 = el('tr', {}, [el('th', { scope: 'row', text: 'Ziffer' })]);
            liste.forEach(function (d, i) {
                r1.appendChild(el('td', { html: hoch(aktuell.b, d.k) + '<br><b>' + d.S + '</b>', cls: i === bekannt - 1 ? 'jetzt' : '' }));
                r2.appendChild(el('td', { cls: 'cd-gross' + (i === bekannt - 1 ? ' jetzt' : ''), text: i < bekannt ? ZIFFERN[d.ziffer] : '?' }));
            });
            t.appendChild(r1); t.appendChild(r2);
            bild.textContent = '';
            bild.appendChild(el('div', { cls: 'tab-scroll' }, [t]));
        }
        function zeichneZeigen() {
            var liste = durchgaenge(aktuell.x, aktuell.b);
            var max = liste.length + 1;
            if (schritt > max) schritt = max;
            zeichneTabelle(liste, Math.min(schritt, liste.length));
            tabelle.textContent = '';
            var ol = el('ol', { cls: 'cd-durchgaenge' });
            if (schritt === 0) {
                var potenzen = [];
                for (var k = 0, S = 1; S <= aktuell.x * aktuell.b && k < 25; k++, S *= aktuell.b) potenzen.push(S);
                info.innerHTML = '<b>①</b> Stellenwerte im ' + (aktuell.b === 16 ? 'Hexadezimal' : aktuell.b === 2 ? 'Binär' : 'Oktal') + 'system: ' + potenzen.join(', ') + ' … Der größte, der nicht größer als ' + aktuell.x + ' ist: <b>' + liste[0].S + '</b>. Dort beginnt die Zahl.';
            } else {
                liste.slice(0, Math.min(schritt, liste.length)).forEach(function (d, i) {
                    ol.appendChild(el('li', { cls: i === schritt - 1 ? 'jetzt' : '', html: '<b>' + (i + 1) + '. Durchgang:</b> S = ' + d.S + ': &nbsp;' + d.x + ' : ' + d.S + ' = <b>' + d.ziffer + (d.ziffer > 9 ? ' (' + ZIFFERN[d.ziffer] + ')' : '') + '</b> R ' + d.rest }));
                });
                tabelle.appendChild(ol);
                if (schritt <= liste.length) {
                    var d = liste[schritt - 1];
                    info.innerHTML = '<b>②</b> ' + d.x + ' : ' + d.S + ' = ' + d.ziffer + ' Rest ' + d.rest + '. Die Ziffer ' + ZIFFERN[d.ziffer] + ' kommt an die Stelle ' + hoch(aktuell.b, d.k) + '. ' + (d.k > 0 ? '<b>③</b> Weiter mit dem Rest ' + d.rest + ' beim nächstkleineren Stellenwert ' + d.S / aktuell.b + '.' : 'Das war die Stelle mit S = 1: fertig!');
                } else {
                    info.innerHTML = '✅ Ergebnis: ' + aktuell.x + ' = <b>' + liste.map(function (d) { return ZIFFERN[d.ziffer]; }).join('') + '<sub>' + aktuell.b + '</sub></b>. Probe: Rechne mit der Stellenwerttabelle zurück.';
                }
            }
            zurueck.disabled = schritt === 0;
            weiter.disabled = schritt >= max;
        }
        function baueRechnen() {
            var liste = durchgaenge(aktuell.x, aktuell.b);
            var fertig = 0;
            zeichneTabelle(liste, 0);
            tabelle.textContent = '';
            var ol = el('ol', { cls: 'cd-durchgaenge' });
            var startText = el('p', { cls: 'cd-klein', html: 'Zahl: <b>' + aktuell.x + '</b>, Ziel: Basis ' + aktuell.b + '. Trage in jeder Zeile die Ziffer (ganzzahliges Ergebnis) und den Rest ein. Ziffern über 9 als Zahl oder Buchstabe.' });
            tabelle.appendChild(startText);
            liste.forEach(function (d, i) {
                var zIn = el('input', { cls: 'cd-input kurz', 'aria-label': (i + 1) + '. Durchgang: Ziffer', inputmode: 'text', autocomplete: 'off' });
                var rIn = el('input', { cls: 'cd-input kurz', 'aria-label': (i + 1) + '. Durchgang: Rest', inputmode: 'numeric', autocomplete: 'off' });
                var sIn = el('input', { cls: 'cd-input kurz', 'aria-label': (i + 1) + '. Durchgang: Stellenwert S', inputmode: 'numeric', autocomplete: 'off' });
                var x = el('span', { cls: 'cd-x', text: i === 0 ? String(d.x) : '…' });
                var li = el('li', { cls: i === 0 ? 'jetzt' : 'gesperrt' }, [el('b', { text: (i + 1) + '. Durchgang: ' }), 'S = ', sIn, ' ', x, ' : S = ', zIn, ' R ', rIn,
                    knopf('Prüfen', function () {
                        if (li.classList.contains('gesperrt')) return;
                        var zv = zIn.value.trim().toUpperCase(), zahl = /^[0-9]+$/.test(zv) ? +zv : ZIFFERN.indexOf(zv);
                        var okS = +sIn.value === d.S, okZ = zahl === d.ziffer, okR = rIn.value.trim() !== '' && +rIn.value === d.rest;
                        sIn.className = 'cd-input kurz ' + (okS ? 'ok' : 'falsch'); zIn.className = 'cd-input kurz ' + (okZ ? 'ok' : 'falsch'); rIn.className = 'cd-input kurz ' + (okR ? 'ok' : 'falsch');
                        if (okS && okZ && okR) {
                            fertig = i + 1;
                            li.classList.remove('jetzt'); li.classList.add('erledigt');
                            zeichneTabelle(liste, fertig);
                            var naechste = ol.children[i + 1];
                            if (naechste) { naechste.classList.remove('gesperrt'); naechste.classList.add('jetzt'); naechste.querySelector('.cd-x').textContent = String(d.rest); naechste.querySelector('input').focus(); meldung(info, 'Richtig! Weiter mit dem Rest ' + d.rest + '.', 'ok'); }
                            else meldung(info, '✅ Fertig: ' + aktuell.x + ' = ' + liste.map(function (q) { return ZIFFERN[q.ziffer]; }).join('') + ' (Basis ' + aktuell.b + ').', 'ok');
                        } else {
                            var tipps = [];
                            if (!okS) tipps.push(i === 0 ? 'S ist der größte Stellenwert (Potenz von ' + aktuell.b + '), der nicht größer als ' + d.x + ' ist.' : 'S ist der nächstkleinere Stellenwert.');
                            else if (!okZ) tipps.push('Wie oft passt ' + d.S + ' ganz in ' + d.x + '?');
                            else if (!okR) tipps.push('Rest = Zahl − Ziffer · S.');
                            meldung(info, 'Noch nicht. ' + tipps.join(' '), 'falsch');
                        }
                    })]);
                ol.appendChild(li);
            });
            tabelle.appendChild(ol);
            meldung(info, '', '');
        }
        setzeModus('zeigen');
    }

    // =====================================================================
    // 3) RGB-Mischer (Blatt 4.2)
    // =====================================================================
    function hex2(v) { return ('0' + v.toString(16).toUpperCase()).slice(-2); }
    function bin8(v) { return ('00000000' + v.toString(2)).slice(-8); }
    function rgb(box) {
        box.classList.add('cd-werkzeug');
        var werte = [255, 127, 76];
        var namen = ['Rot', 'Grün', 'Blau'], farben = ['#dc2626', '#16a34a', '#2563eb'];
        var regler = [], zahlen = [], binaer = [];
        var swatch = el('div', { cls: 'cd-swatch', role: 'img', 'aria-label': 'Farbvorschau' });
        var codes = el('div', { cls: 'cd-codes' });
        var eingabe = el('input', { cls: 'cd-input', placeholder: '#FF7F4C oder 255 127 76', 'aria-label': 'Farbcode eingeben' });
        var info = el('p', { cls: 'cd-meldung' });
        var reglerBox = el('div', { cls: 'cd-regler' });
        namen.forEach(function (n, i) {
            var r = el('input', { type: 'range', min: '0', max: '255', value: werte[i], 'aria-label': n + ' (0 bis 255)', style: 'accent-color:' + farben[i] });
            var z = el('input', { type: 'number', min: '0', max: '255', value: werte[i], cls: 'cd-input kurz', 'aria-label': n + ' als Zahl' });
            var b = el('code', { cls: 'cd-bin' });
            r.addEventListener('input', function () { werte[i] = +r.value; zeichne(); });
            z.addEventListener('input', function () { var v = Math.max(0, Math.min(255, Math.floor(+z.value || 0))); werte[i] = v; zeichne(true); });
            regler.push(r); zahlen.push(z); binaer.push(b);
            reglerBox.appendChild(el('div', { cls: 'cd-reglerzeile' }, [el('span', { cls: 'cd-kanal', style: 'color:' + farben[i], text: n }), r, z, b]));
        });
        eingabe.addEventListener('change', function () {
            var t = eingabe.value.trim();
            var m = /^#?([0-9a-f]{6})$/i.exec(t), m3 = /^#?([0-9a-f]{3})$/i.exec(t), d = t.split(/[\s,;]+/).map(Number);
            if (m) { werte = [0, 2, 4].map(function (i) { return parseInt(m[1].substr(i, 2), 16); }); meldung(info, '', ''); }
            else if (m3) { werte = [0, 1, 2].map(function (i) { return parseInt(m3[1][i] + m3[1][i], 16); }); meldung(info, 'Kurzform: #RGB bedeutet #RRGGBB, jede Ziffer doppelt.', 'ok'); }
            else if (d.length === 3 && d.every(function (v) { return v >= 0 && v <= 255 && Math.floor(v) === v; })) { werte = d; meldung(info, '', ''); }
            else { meldung(info, 'Das verstehe ich nicht. Ein Hex-Farbcode hat 6 Ziffern (#RRGGBB) oder abgekürzt 3 (#RGB). Dezimal: drei Zahlen von 0 bis 255.', 'falsch'); return; }
            zeichne();
        });
        function zeichne(vonZahl) {
            werte.forEach(function (v, i) { regler[i].value = v; if (!vonZahl) zahlen[i].value = v; binaer[i].textContent = bin8(v); });
            var hx = '#' + werte.map(hex2).join('');
            swatch.style.background = hx;
            codes.innerHTML = '<div><span>dezimal</span><b>' + werte.join(', ') + '</b></div><div><span>hexadezimal</span><b>' + hx + '</b></div><div><span>binär (3 Byte = 24 Bit)</span><b>' + werte.map(bin8).join(' ') + '</b></div>';
        }
        box.appendChild(el('div', { cls: 'cd-rgb' }, [swatch, el('div', {}, [reglerBox, codes])]));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [el('label', { cls: 'cd-label', text: 'Farbcode eingeben:' }), eingabe]));
        box.appendChild(info);
        var vorlagen = el('div', { cls: 'cd-steuer' }, [el('span', { cls: 'cd-klein', text: 'Ausprobieren:' })]);
        [['Schwarz', [0, 0, 0]], ['Weiß', [255, 255, 255]], ['Rot', [255, 0, 0]], ['Rot + Grün', [255, 255, 0]], ['Grün + Blau', [0, 255, 255]], ['Rot + Blau', [255, 0, 255]], ['halbe Kraft', [128, 128, 128]]].forEach(function (v) {
            vorlagen.appendChild(knopf(v[0], function () { werte = v[1].slice(); zeichne(); }, 'leise'));
        });
        box.appendChild(vorlagen);
        zeichne();
    }

    // =====================================================================
    // 4) Pixel-Lupe (Blatt 4.2)
    // =====================================================================
    var SMILEY = ['00222200', '02222220', '22122122', '22222222', '21222212', '22111122', '02233220', '00222200'];
    var PIXFARBE = { 0: [255, 255, 255], 1: [30, 30, 30], 2: [250, 204, 21], 3: [239, 68, 68] };
    function lupe(box) {
        box.classList.add('cd-werkzeug');
        var groesse = 8;
        var klein = el('div', { cls: 'cd-lupe-klein', 'aria-hidden': 'true' });
        var gross = el('div', { cls: 'cd-lupe-gross', role: 'grid', 'aria-label': 'Pixel des Bildes, zum Anklicken' });
        var info = el('div', { cls: 'cd-lupe-info', html: 'Tippe oder klicke auf ein Pixel.' });
        SMILEY.forEach(function (zeile, y) {
            zeile.split('').forEach(function (c, x) {
                var f = PIXFARBE[c], css = 'rgb(' + f.join(',') + ')';
                klein.appendChild(el('span', { style: 'background:' + css }));
                var b = el('button', { type: 'button', cls: 'cd-pixel', style: 'background:' + css, 'aria-label': 'Pixel Zeile ' + (y + 1) + ', Spalte ' + (x + 1) });
                b.addEventListener('click', function () {
                    gross.querySelectorAll('.cd-pixel.gewaehlt').forEach(function (p) { p.classList.remove('gewaehlt'); });
                    b.classList.add('gewaehlt');
                    info.innerHTML = '<b>Zeile ' + (y + 1) + ', Spalte ' + (x + 1) + '</b><br>R ' + f[0] + ' · G ' + f[1] + ' · B ' + f[2] + '<br><code>#' + f.map(hex2).join('') + '</code><br><code>' + f.map(bin8).join(' ') + '</code><br>= 3 Byte';
                });
                gross.appendChild(b);
            });
        });
        box.appendChild(el('div', { cls: 'cd-lupe' }, [el('div', { cls: 'cd-lupe-spalte' }, [el('span', { cls: 'cd-klein', text: 'Originalgröße (wirkt wie ein Bild)' }), klein]), el('span', { cls: 'cd-lupe-pfeil', text: '🔍 →' }), gross, info]));
        box.appendChild(el('p', { cls: 'cd-klein', text: 'Dieses Bild hat ' + groesse + ' × ' + groesse + ' = ' + groesse * groesse + ' Pixel. Wie viele Byte braucht es mit RGB? Ein Handyfoto hat Millionen solcher Pixel.' }));
    }

    // =====================================================================
    // 5) Pixel-Editor 8 × 8 (Blatt 4.2, Aufgabe 4)
    // =====================================================================
    function pixeleditor(box) {
        box.classList.add('cd-werkzeug');
        var bits = [];
        for (var i = 0; i < 64; i++) bits.push(0);
        var modusCodieren = el('button', { type: 'button', cls: 'cd-tab', 'aria-pressed': 'true', text: '✏️ Zeichnen und codieren' });
        var modusDecodieren = el('button', { type: 'button', cls: 'cd-tab', 'aria-pressed': 'false', text: '🔎 Decodieren' });
        var raster = el('div', { cls: 'cd-raster', role: 'grid', 'aria-label': '8 mal 8 Raster' });
        var codes = el('table', { cls: 'cd-rastercodes' });
        var knoepfe = [], binZellen = [], dezZellen = [], dezEingaben = [];
        codes.appendChild(el('tr', {}, [el('th', { text: 'Zeile' }), el('th', { text: 'binär' }), el('th', { text: 'dezimal' })]));
        for (var y = 0; y < 8; y++) {
            for (var x = 0; x < 8; x++) {
                (function (idx) {
                    var b = el('button', { type: 'button', cls: 'cd-rasterzelle', 'aria-label': 'Zeile ' + (Math.floor(idx / 8) + 1) + ', Spalte ' + (idx % 8 + 1) + ': weiß', 'aria-pressed': 'false' });
                    b.addEventListener('click', function () { if (decodieren) return; bits[idx] = 1 - bits[idx]; zeichne(); });
                    knoepfe.push(b); raster.appendChild(b);
                })(y * 8 + x);
            }
            var bz = el('td', { cls: 'cd-mono' }), dz = el('td', {});
            var dIn = el('input', { type: 'number', min: '0', max: '255', cls: 'cd-input kurz', 'aria-label': 'Zeile ' + (y + 1) + ' dezimal', hidden: true });
            (function (zeile, eing) { eing.addEventListener('input', function () { var v = Math.max(0, Math.min(255, Math.floor(+eing.value || 0))); for (var s = 0; s < 8; s++) bits[zeile * 8 + s] = (v >> (7 - s)) & 1; zeichne(true); }); })(y, dIn);
            dz.appendChild(el('span', { cls: 'cd-dez' })); dz.appendChild(dIn);
            binZellen.push(bz); dezZellen.push(dz); dezEingaben.push(dIn);
            codes.appendChild(el('tr', {}, [el('td', { text: String(y + 1) }), bz, dz]));
        }
        var decodieren = false;
        var kopie = el('p', { cls: 'cd-klein' });
        box.appendChild(el('div', { cls: 'cd-modi' }, [modusCodieren, modusDecodieren]));
        var hinweis = el('p', { cls: 'cd-klein', text: 'Klicke Felder an: schwarz = 1, weiß = 0. Rechts siehst du jede Zeile als Binär- und Dezimalzahl.' });
        box.appendChild(hinweis);
        box.appendChild(el('div', { cls: 'cd-editor' }, [raster, codes]));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [knopf('Leeren', function () { bits = bits.map(function () { return 0; }); dezEingaben.forEach(function (e) { e.value = ''; }); zeichne(); }, 'leise'), knopf('Beispiel: Herz', function () { setzeDez([0, 102, 255, 255, 255, 126, 60, 24]); }, 'leise')]));
        box.appendChild(kopie);
        function setzeDez(liste) { liste.forEach(function (v, z) { for (var s = 0; s < 8; s++) bits[z * 8 + s] = (v >> (7 - s)) & 1; dezEingaben[z].value = v; }); zeichne(true); }
        function setzeModus(dec) {
            decodieren = dec;
            modusCodieren.setAttribute('aria-pressed', !dec); modusDecodieren.setAttribute('aria-pressed', dec);
            dezEingaben.forEach(function (e) { e.hidden = !dec; });
            dezZellen.forEach(function (d) { d.querySelector('.cd-dez').hidden = dec; });
            raster.classList.toggle('gesperrt', dec);
            hinweis.textContent = dec ? 'Trage die Dezimalzahlen deines Partners ein. Das Bild entsteht von selbst. Stimmt es mit dem Original überein?' : 'Klicke Felder an: schwarz = 1, weiß = 0. Rechts siehst du jede Zeile als Binär- und Dezimalzahl.';
            if (dec) { bits = bits.map(function () { return 0; }); dezEingaben.forEach(function (e) { e.value = ''; }); }
            zeichne(true);
        }
        modusCodieren.addEventListener('click', function () { setzeModus(false); });
        modusDecodieren.addEventListener('click', function () { setzeModus(true); });
        function zeichne() {
            var liste = [];
            for (var z = 0; z < 8; z++) {
                var w = 0, s = '';
                for (var sp = 0; sp < 8; sp++) { var b = bits[z * 8 + sp]; w = w * 2 + b; s += b; var k = knoepfe[z * 8 + sp]; k.classList.toggle('an', !!b); k.setAttribute('aria-pressed', b ? 'true' : 'false'); k.setAttribute('aria-label', 'Zeile ' + (z + 1) + ', Spalte ' + (sp + 1) + ': ' + (b ? 'schwarz' : 'weiß')); }
                binZellen[z].textContent = s;
                dezZellen[z].querySelector('.cd-dez').textContent = w;
                liste.push(w);
            }
            kopie.textContent = decodieren ? '' : 'Code zum Verschicken (nur die Dezimalzahlen): ' + liste.join(', ');
        }
        zeichne();
    }

    // =====================================================================
    // 6) Morse-Funkgerät (Blatt 4.3, Aufgabe 1)
    // =====================================================================
    var MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..' };
    var MORSE_RUECK = {};
    Object.keys(MORSE).forEach(function (k) { MORSE_RUECK[MORSE[k]] = k; });
    function normMorse(t) { return t.replace(/[·•]/g, '.').replace(/[–—−_]/g, '-').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim(); }
    function textZuMorse(t) {
        return t.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').trim().split(/\s+/).map(function (w) {
            return w.split('').filter(function (c) { return MORSE[c]; }).map(function (c) { return MORSE[c]; }).join(' ');
        }).join(' / ');
    }
    function morseZuText(m) { return normMorse(m).split(' / ').map(function (w) { return w.split(' ').map(function (c) { return MORSE_RUECK[c] || (c ? '¿' : ''); }).join(''); }).join(' '); }
    var audio = null;
    function spiele(morse, punktMs, beiZeichen) {
        try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return 0; }
        var t = audio.currentTime + 0.1, dit = punktMs / 1000, zeit = 0;
        normMorse(morse).split('').forEach(function (c, i) {
            var dauer = c === '.' ? dit : (c === '-' ? 3 * dit : 0);
            if (dauer) {
                var o = audio.createOscillator(), g = audio.createGain();
                o.frequency.value = 650; o.connect(g); g.connect(audio.destination);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.005); g.gain.setValueAtTime(0.25, t + dauer - 0.005); g.gain.linearRampToValueAtTime(0, t + dauer);
                o.start(t); o.stop(t + dauer + 0.01);
                if (beiZeichen) setTimeout(function () { beiZeichen(i); }, (t - audio.currentTime) * 1000);
                t += dauer + dit;
            } else if (c === ' ') t += 2 * dit;
            else if (c === '/') t += 2 * dit;
        });
        return (t - audio.currentTime) * 1000;
    }
    function morse(box) {
        box.classList.add('cd-werkzeug');
        var ziel = normMorse(box.getAttribute('data-decodieren') || '-- .- -.-- / - .... . / ..-. --- .-. -.-. . / -... . / .-- .. - .... / -.-- --- ..-');
        // Tabelle
        var tab = el('div', { cls: 'cd-morsetabelle' });
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').forEach(function (c) {
            var b = el('button', { type: 'button', cls: 'cd-morsetaste', 'aria-label': c + ': ' + MORSE[c].replace(/\./g, 'kurz ').replace(/-/g, 'lang '), html: '<b>' + c + '</b><span>' + MORSE[c].replace(/\./g, '·').replace(/-/g, '–') + '</span>' });
            b.addEventListener('click', function () { spiele(MORSE[c], 90); });
            tab.appendChild(b);
        });
        // Abspielen
        var spielIn = el('input', { cls: 'cd-input breit', value: '... --- ...', 'aria-label': 'Morsecode zum Abspielen (Punkt, Strich, Leerzeichen, / für Wortgrenze)' });
        var lampe = el('span', { cls: 'cd-lampe', 'aria-hidden': 'true' });
        var spielen = knopf('🔊 Abspielen', function () {
            var m = normMorse(spielIn.value);
            spiele(m, 90, function (i) { lampe.classList.add('an'); setTimeout(function () { lampe.classList.remove('an'); }, m[i] === '-' ? 260 : 90); });
        });
        // Codierung prüfen (Aufgabe 1b)
        var kText = el('input', { cls: 'cd-input breit', value: 'Live long and prosper', 'aria-label': 'Klartext' });
        var kMorse = el('textarea', { cls: 'cd-input breit', rows: '2', placeholder: 'Deine Codierung, z. B. .-.. .. ...- . / …', 'aria-label': 'Deine Morse-Codierung' });
        var kInfo = el('div', { cls: 'cd-meldung' });
        var kPruefen = knopf('Codierung prüfen', function () {
            var soll = textZuMorse(kText.value).split(' / '), ist = normMorse(kMorse.value).split(' / ');
            var woerter = kText.value.trim().toUpperCase().split(/\s+/);
            if (!kMorse.value.trim()) { meldung(kInfo, 'Trage zuerst deine Codierung ein. Trenne Buchstaben mit einem Leerzeichen und Wörter mit /.', 'falsch'); return; }
            var fehler = [];
            soll.forEach(function (w, i) {
                var sb = w.split(' '), ib = (ist[i] || '').split(' ');
                sb.forEach(function (c, j) { if (ib[j] !== c) fehler.push('Wort ' + (i + 1) + ' („' + (woerter[i] || '') + '“), Buchstabe ' + (j + 1)); });
                if (ib.length > sb.length) fehler.push('Wort ' + (i + 1) + ': zu viele Zeichen');
            });
            if (ist.length !== soll.length) fehler.push('Anzahl der Wörter: ' + ist.length + ' statt ' + soll.length + ' (Wortgrenze mit / markieren)');
            if (!fehler.length) meldung(kInfo, '✅ Alles richtig codiert!', 'ok');
            else meldung(kInfo, '✗ Noch ' + fehler.length + ' Stelle(n) falsch, z. B.: ' + fehler.slice(0, 3).join('; ') + '.', 'falsch');
        });
        // Decodierung prüfen (Aufgabe 1c)
        var dText = el('input', { cls: 'cd-input breit', placeholder: 'Dein decodierter Text', 'aria-label': 'Dein decodierter Text' });
        var dInfo = el('div', { cls: 'cd-meldung' });
        var dPruefen = knopf('Decodierung prüfen', function () {
            var ist = textZuMorse(dText.value);
            if (!dText.value.trim()) { meldung(dInfo, 'Trage zuerst deinen Text ein.', 'falsch'); return; }
            var sw = ziel.split(' / '), iw = ist.split(' / ');
            var ok = 0;
            sw.forEach(function (w, i) { if (iw[i] === w) ok++; });
            if (ok === sw.length && iw.length === sw.length) meldung(dInfo, '✅ Richtig decodiert! (Satzzeichen zählen hier nicht.)', 'ok');
            else meldung(dInfo, '✗ ' + ok + ' von ' + sw.length + ' Wörtern stimmen schon.', 'falsch');
        });
        box.appendChild(el('h4', { text: 'Morsetabelle (antippen zum Anhören)' }));
        box.appendChild(tab);
        box.appendChild(el('h4', { text: 'Abspielen' }));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [spielIn, spielen, lampe]));
        box.appendChild(el('h4', { text: 'Aufgabe 1b: Codierung prüfen' }));
        box.appendChild(el('div', { cls: 'cd-formular' }, [el('label', { text: 'Klartext' }), kText, el('label', { text: 'Deine Codierung' }), kMorse]));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [kPruefen]));
        box.appendChild(kInfo);
        box.appendChild(el('h4', { text: 'Aufgabe 1c: Decodierung prüfen' }));
        box.appendChild(el('p', { cls: 'cd-mono cd-klein', text: ziel.replace(/\./g, '·').replace(/-/g, '–') }));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [dText, dPruefen]));
        box.appendChild(dInfo);
    }

    // =====================================================================
    // 7) EAN-13: Barcode-Werkzeug und Prüfziffer-Detektiv (Blatt 4.3)
    // =====================================================================
    var EAN_A = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    var EAN_B = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
    var EAN_C = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
    var EAN_MUSTER = ['AAAAAA', 'AABABB', 'AABBAB', 'AABBBA', 'ABAABB', 'ABBAAB', 'ABBBAA', 'ABABAB', 'ABABBA', 'ABBABA'];
    function pruefsumme(z) { var s = 0; for (var i = 0; i < 12; i++) s += (+z[i]) * (i % 2 ? 3 : 1); return s; }
    function pruefziffer(z12) { return (10 - pruefsumme(z12) % 10) % 10; }
    function zufallsGtin() { var z = '4'; for (var i = 1; i < 12; i++) z += zufall(0, 9); return z + pruefziffer(z); }
    function eanSvg(code, opt) {
        opt = opt || {};
        var w = 3, h = 90, x0 = 22, muster = EAN_MUSTER[+code[0]];
        var s = svg('svg', { viewBox: '0 0 ' + (x0 * 2 + 95 * w) + ' ' + (h + 46), cls: 'cd-barcode', role: 'img', 'aria-label': 'Barcode ' + code });
        var x = x0;
        function balken(mod, farbe, lang) {
            for (var i = 0; i < mod.length; i++) {
                if (mod[i] === '1') s.appendChild(svg('rect', { x: x + i * w, y: 4, width: w, height: h + (lang ? 10 : 0), fill: farbe }));
            }
            x += mod.length * w;
        }
        var farbe = { A: '#1d4ed8', B: '#c2410c', C: '#15803d' };
        balken('101', '#111', true);
        for (var i = 1; i <= 6; i++) {
            var satz = muster[i - 1], start = x;
            if (opt.farbig) s.appendChild(svg('rect', { x: start, y: 4, width: 7 * w, height: h, fill: satz === 'A' ? '#dbeafe' : '#ffedd5' }));
            balken((satz === 'A' ? EAN_A : EAN_B)[+code[i]], opt.farbig ? farbe[satz] : '#111');
            s.appendChild(svg('text', { x: start + 3.5 * w, y: h + 22, 'text-anchor': 'middle', cls: 'cd-bc-ziffer', text: code[i] }));
            if (opt.farbig) s.appendChild(svg('text', { x: start + 3.5 * w, y: h + 40, 'text-anchor': 'middle', cls: 'cd-bc-satz', fill: farbe[satz], text: satz }));
        }
        balken('01010', '#111', true);
        for (i = 7; i <= 12; i++) {
            start = x;
            if (opt.farbig) s.appendChild(svg('rect', { x: start, y: 4, width: 7 * w, height: h, fill: '#dcfce7' }));
            balken(EAN_C[+code[i]], opt.farbig ? farbe.C : '#111');
            s.appendChild(svg('text', { x: start + 3.5 * w, y: h + 22, 'text-anchor': 'middle', cls: 'cd-bc-ziffer', text: code[i] }));
            if (opt.farbig) s.appendChild(svg('text', { x: start + 3.5 * w, y: h + 40, 'text-anchor': 'middle', cls: 'cd-bc-satz', fill: farbe.C, text: 'C' }));
        }
        balken('101', '#111', true);
        s.appendChild(svg('text', { x: 10, y: h + 22, 'text-anchor': 'middle', cls: 'cd-bc-ziffer erste', text: code[0] }));
        return s;
    }
    function ean(box) {
        box.classList.add('cd-werkzeug');
        var eingabe = el('input', { cls: 'cd-input breit', value: '9783661380117', inputmode: 'numeric', maxlength: '13', 'aria-label': 'GTIN mit 13 Ziffern' });
        var farbig = el('input', { type: 'checkbox', checked: true, id: 'ean-farbe-' + Math.random().toString(36).slice(2) });
        var bild = el('div', { cls: 'cd-barcode-box' });
        var info = el('div', { cls: 'cd-ean-info' });
        var pruef = el('div', { cls: 'cd-meldung' });
        box.appendChild(el('div', { cls: 'cd-steuer' }, [el('label', { cls: 'cd-label', text: 'GTIN (13 Ziffern):' }), eingabe,
            el('label', { cls: 'cd-check' }, [farbig, ' Zeichensätze einfärben'])]));
        box.appendChild(el('div', { cls: 'cd-steuer' }, [
            knopf('Erste Ziffer +1', function () { var z = eingabe.value.replace(/\D/g, ''); if (z.length === 13) { eingabe.value = ((+z[0] + 1) % 10) + z.slice(1); zeichne(); } }, 'leise'),
            knopf('🎲 Gültige GTIN', function () { eingabe.value = zufallsGtin(); zeichne(); }, 'leise'),
            knopf('⚡ Eine Ziffer verfälschen', function () { var z = eingabe.value.replace(/\D/g, ''); if (z.length !== 13) return; var p = zufall(1, 11), alt = +z[p], neu = (alt + zufall(1, 9)) % 10; eingabe.value = z.slice(0, p) + neu + z.slice(p + 1); zeichne(); }, 'leise')
        ]));
        box.appendChild(bild); box.appendChild(info); box.appendChild(pruef);
        eingabe.addEventListener('input', zeichne);
        farbig.addEventListener('change', zeichne);
        function zeichne() {
            var z = eingabe.value.replace(/\D/g, '');
            bild.textContent = ''; info.textContent = '';
            if (z.length !== 13) { meldung(pruef, 'Bitte genau 13 Ziffern eingeben (noch ' + (13 - z.length) + ').', z.length > 13 ? 'falsch' : ''); return; }
            bild.appendChild(eanSvg(z, { farbig: farbig.checked }));
            if (farbig.checked) info.innerHTML = 'Erste Ziffer <b>' + z[0] + '</b> (ohne eigene Striche) → Block 1 in <b>' + EAN_MUSTER[+z[0]].split('').join(' ') + '</b> · Block 2 immer <b>C</b>.';
            var s = pruefsumme(z) + (+z[12]);
            var teile = [];
            for (var i = 0; i < 13; i++) teile.push(z[i] + '·' + (i % 2 ? 3 : 1));
            if (s % 10 === 0) meldung(pruef, '✓ Prüfziffer stimmt: ' + teile.join(' + ') + ' = ' + s + ' (durch 10 teilbar).', 'ok');
            else meldung(pruef, '✗ Prüfziffer stimmt nicht: Die gewichtete Summe aller 13 Ziffern ist nicht durch 10 teilbar. Hier wurde falsch gelesen oder getippt.', 'falsch');
        }
        zeichne();
    }
    function gtinRaten(box) {
        box.classList.add('cd-werkzeug');
        var liste = el('div', { cls: 'cd-gtin-liste' });
        var info = el('div', { cls: 'cd-meldung' });
        var stand = el('span', { cls: 'cd-klein' });
        var serie = 0;
        box.appendChild(el('p', { text: 'Eine der drei GTINs ist falsch (eine Ziffer verändert). Rechne von Hand nach und tippe auf die falsche.' }));
        box.appendChild(liste); box.appendChild(info);
        box.appendChild(el('div', { cls: 'cd-steuer' }, [knopf('Neue Runde', runde), stand]));
        function runde() {
            liste.textContent = ''; meldung(info, '', '');
            var falsch = zufall(0, 2), codes = [];
            for (var i = 0; i < 3; i++) {
                var c = zufallsGtin();
                if (i === falsch) { var p = zufall(1, 12); c = c.slice(0, p) + ((+c[p] + zufall(1, 9)) % 10) + c.slice(p + 1); }
                codes.push(c);
            }
            codes.forEach(function (c, i) {
                var b = el('button', { type: 'button', cls: 'cd-gtin', text: c.slice(0, 1) + ' ' + c.slice(1, 7) + ' ' + c.slice(7) });
                b.addEventListener('click', function () {
                    if (liste.classList.contains('fertig')) return;
                    liste.classList.add('fertig');
                    if (i === falsch) { serie++; b.classList.add('ok'); meldung(info, '✓ Richtig! Gewichtete Summe: ' + (pruefsumme(c) + +c[12]) + ', nicht durch 10 teilbar.', 'ok'); }
                    else { serie = 0; b.classList.add('falsch'); liste.children[falsch].classList.add('ok'); meldung(info, '✗ Diese ist gültig (Summe ' + (pruefsumme(c) + +c[12]) + '). Falsch war die markierte.', 'falsch'); }
                    stand.textContent = 'Richtig in Folge: ' + serie;
                });
                liste.appendChild(b);
            });
            liste.classList.remove('fertig');
        }
        runde();
    }

    // =====================================================================
    // 8) Zaubertrick mit Paritätsbits (Blatt 4.3, optional)
    // =====================================================================
    function zaubertrick(box) {
        box.classList.add('cd-werkzeug');
        var N = 6; // 5 Datenzeilen/-spalten + Prüfbits
        var bits = [], phase = 0, verdeckt = null, versuche = 0;
        for (var i = 0; i < N * N; i++) bits.push(0);
        var raster = el('div', { cls: 'cd-zauber', role: 'grid', 'aria-label': 'Zauberraster' });
        var zellen = [];
        for (var z = 0; z < N; z++) for (var s = 0; s < N; s++) {
            (function (zz, ss) {
                var b = el('button', { type: 'button', cls: 'cd-zfeld' + (ss === 5 ? ' pruefspalte' : '') + (zz === 5 ? ' pruefzeile' : ''), 'aria-label': 'Zeile ' + (zz + 1) + ', Spalte ' + (ss + 1) });
                b.addEventListener('click', function () { klick(zz, ss); });
                zellen.push(b); raster.appendChild(b);
            })(z, s);
        }
        var anzeige = el('div', { cls: 'cd-paritaet' });
        var text = el('div', { cls: 'cd-zauber-text' });
        var info = el('div', { cls: 'cd-meldung' });
        var hilfe = el('input', { type: 'checkbox' });
        var steuer = el('div', { cls: 'cd-steuer' });
        box.appendChild(el('div', { cls: 'cd-zauber-haupt' }, [raster, text]));
        box.appendChild(info);
        box.appendChild(steuer);
        box.appendChild(el('label', { cls: 'cd-check' }, [hilfe, ' Anzahl roter Felder je Zeile und Spalte anzeigen (Spickzettel)']));
        box.appendChild(anzeige);
        hilfe.addEventListener('change', zeichne);
        function idx(z, s) { return z * N + s; }
        function anzahlZeile(z) { var a = 0; for (var s = 0; s < N; s++) a += bits[idx(z, s)]; return a; }
        function anzahlSpalte(s) { var a = 0; for (var z = 0; z < N; z++) a += bits[idx(z, s)]; return a; }
        function klick(z, s) {
            if (phase === 0 && z < 5 && s < 5) bits[idx(z, s)] ^= 1;
            else if (phase === 1 && (z === 5 || s === 5)) bits[idx(z, s)] ^= 1;
            else if (phase === 3) {
                versuche++;
                if (z * N + s === verdeckt) { meldung(info, '🎩 Richtig! Du hast das veränderte Feld gefunden. Zeile ' + (z + 1) + ' und Spalte ' + (s + 1) + ' hatten eine ungerade Anzahl roter Felder.', 'ok'); phase = 4; }
                else meldung(info, '✗ Nicht dieses Feld. Suche die Zeile und die Spalte mit ungerader Anzahl.', 'falsch');
            }
            zeichne();
        }
        function setzePhase(p) {
            phase = p; steuer.textContent = '';
            if (p === 0) {
                text.innerHTML = '<b>1. Daten</b><br>Lege im 5 × 5-Feld ein beliebiges Muster an (oder Zufall). Rot = 1, blau = 0.';
                steuer.appendChild(knopf('🎲 Zufallsmuster', function () { for (var z = 0; z < 5; z++) for (var s = 0; s < 5; s++) bits[idx(z, s)] = Math.random() < 0.5 ? 1 : 0; zeichne(); }, 'leise'));
                steuer.appendChild(knopf('Weiter: Prüfbits anfügen', function () { setzePhase(1); }));
                meldung(info, '', '');
            } else if (p === 1) {
                text.innerHTML = '<b>2. Prüfbits</b><br>Färbe die abgesetzte Spalte und Zeile so, dass <b>jede</b> Zeile und <b>jede</b> Spalte eine <b>gerade</b> Anzahl roter Felder hat (auch die Prüfzeile selbst).';
                steuer.appendChild(knopf('Prüfbits kontrollieren', function () {
                    var falsch = [];
                    for (var i = 0; i < N; i++) { if (anzahlZeile(i) % 2) falsch.push('Zeile ' + (i + 1)); if (anzahlSpalte(i) % 2) falsch.push('Spalte ' + (i + 1)); }
                    if (!falsch.length) { meldung(info, '✓ Alle Zeilen und Spalten sind gerade. Jetzt kommt der Zaubertrick!', 'ok'); setzePhase(2); }
                    else meldung(info, '✗ Noch ungerade: ' + falsch.join(', ') + '.', 'falsch');
                }));
            } else if (p === 2) {
                text.innerHTML = '<b>3. Augen zu!</b><br>Der Computer spielt deinen Nachbarn: Er dreht heimlich <b>genau ein</b> Feld um (auch ein Prüfbit ist möglich).';
                steuer.appendChild(knopf('🙈 Ein Feld heimlich umdrehen', function () {
                    raster.classList.add('verdeckt');
                    setTimeout(function () { verdeckt = zufall(0, N * N - 1); bits[verdeckt] ^= 1; versuche = 0; raster.classList.remove('verdeckt'); setzePhase(3); zeichne(); }, 900);
                }));
            } else if (p === 3) {
                text.innerHTML = '<b>4. Zaubern</b><br>Ein Feld wurde verändert. Tippe es an!';
                meldung(info, '', '');
            }
            if (p >= 1) steuer.appendChild(knopf('Neues Spiel', function () { bits = bits.map(function () { return 0; }); setzePhase(0); zeichne(); }, 'leise'));
            raster.classList.toggle('mit-pruef', p >= 1);
            zeichne();
        }
        function zeichne() {
            zellen.forEach(function (b, i) {
                var z = Math.floor(i / N), s = i % N;
                var istPruef = z === 5 || s === 5;
                b.hidden = istPruef && phase === 0;
                b.classList.toggle('rot', !!bits[i]);
                b.classList.toggle('aktiv', (phase === 0 && !istPruef) || (phase === 1 && istPruef) || phase === 3);
                b.setAttribute('aria-label', 'Zeile ' + (z + 1) + ', Spalte ' + (s + 1) + ': ' + (bits[i] ? 'rot' : 'blau'));
            });
            anzeige.hidden = !hilfe.checked;
            if (hilfe.checked) {
                var zs = [], ss = [];
                var max = phase === 0 ? 5 : N;
                for (var i = 0; i < max; i++) { zs.push(anzahlZeile(i)); ss.push(anzahlSpalte(i)); }
                anzeige.innerHTML = 'Rote Felder je Zeile: ' + zs.map(function (a) { return '<span class="' + (a % 2 ? 'ungerade' : 'gerade') + '">' + a + '</span>'; }).join(' ') +
                    '<br>Rote Felder je Spalte: ' + ss.map(function (a) { return '<span class="' + (a % 2 ? 'ungerade' : 'gerade') + '">' + a + '</span>'; }).join(' ');
            }
        }
        setzePhase(0);
    }

    // ---------- Start ----------
    function start() {
        document.querySelectorAll('[data-stellenwert]').forEach(stellenwert);
        document.querySelectorAll('[data-umrechnen]').forEach(umrechnen);
        document.querySelectorAll('[data-rgb]').forEach(rgb);
        document.querySelectorAll('[data-lupe]').forEach(lupe);
        document.querySelectorAll('[data-pixeleditor]').forEach(pixeleditor);
        document.querySelectorAll('[data-morse]').forEach(morse);
        document.querySelectorAll('[data-ean]').forEach(ean);
        document.querySelectorAll('[data-gtin-raten]').forEach(gtinRaten);
        document.querySelectorAll('[data-zaubertrick]').forEach(zaubertrick);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    window.Codierung = { durchgaenge: durchgaenge, textZuMorse: textZuMorse, morseZuText: morseZuText, pruefziffer: pruefziffer };
})();

/* ==========================================================================
   Lösungsweg (wie in informatik/11/graphen/graphen.js):
   Tipps stufenweise, Lösung nur durch Gedrückthalten
     <div class="lw" data-loesungsweg="Aufgabe 2">
       <template data-stufe="Tipp 1">…</template>
       <template data-stufe="Lösung" data-halten>…</template>
     </div>
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
