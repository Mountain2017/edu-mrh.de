/*
 * Rekursive Algorithmen (Informatik 12, Station 1.5) – Aufruf-Labor
 *
 *   <div data-aufruflabor="countdown,fassungB,ggT,quersumme,umrechnen,fib" data-start="ggT"></div>
 *
 * Spielt einen rekursiven Algorithmus Schritt für Schritt ab und baut dabei
 *   - die Aufruftabelle (eine Zeile je Aufruf, Rückgaben auf dem Rückweg),
 *   - den Aufrufstapel (welche Aufrufe gerade warten),
 *   - bei fib den Aufrufbaum (SVG)
 * auf. Mit „Rückgaben vorhersagen“ trägt man jede Rückgabe selbst ein, bevor sie erscheint.
 * Für die Algorithmen, die im Projekt TODOs sind, steht statt Java-Code eine Regel in Worten
 * da (einblendbar), damit die Seite keine Lösung verrät. Abläufe wie in Java: Bei a + b wird
 * a zuerst ausgewertet (die Online-IDE macht es umgekehrt, siehe Lehrkräfte-Bereich).
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var STAPEL_GRENZE = 30;        // Ab hier „Stapel voll“ (je Algorithmus änderbar: grenze)
    var ZIFFERN = '0123456789ABCDEF';

    function div(a, b) { return Math.trunc(a / b); }
    function txt(v) { return typeof v === 'string' ? '"' + v + '"' : String(v); }

    // ---------- Algorithmen ----------
    // code: Zeilen; regel: true = Regel in Worten (einblendbar) statt Java
    // spalten/werte: Zusatzspalten der Tabelle, beim Aufruf berechnet
    // lauf(k, a): Ablauf eines Aufrufs; k.zeile(nr, info), k.aus(text), k.ruf(args, info) -> Rückgabe,
    //             return k.zurueck(wert, rechnung)
    var ALGOS = {
        countdown: {
            titel: 'countdown(n)', name: 'countdown', void: true,
            params: [{ n: 'n', wert: 3, min: 0, max: 8 }],
            code: ['void countdown(int n) {', '   if (n == 0) {', '      println("Start!");', '   } else {',
                   '      println("hin " + n);', '      countdown(n - 1);', '      println("zurück " + n);', '   }', '}'],
            spalten: ['n'], werte: function (a) { return [a[0]]; },
            abbruch: function (a) { return a[0] === 0; },
            lauf: function (k, a) {
                var n = a[0];
                if (n === 0) {
                    k.zeile(1, 'n == 0: Abbruchbedingung erfüllt.');
                    k.aus('Start!', 2);
                    return k.zurueck(null);
                }
                k.zeile(1, n + ' == 0? Nein, also weiter im else-Teil.');
                k.aus('hin ' + n, 4);
                k.ruf([n - 1], 5);
                k.aus('zurück ' + n, 6);
                return k.zurueck(null);
            }
        },
        fassungB: {
            titel: 'fassungB(n) aus Aufgabe 2', name: 'fassungB', void: true, grenze: 12,
            params: [{ n: 'n', wert: 3, min: 0, max: 9 }],
            code: ['void fassungB(int n) {', '   if (n == 0) {', '      println("Start!");', '   } else {',
                   '      println(n);', '      fassungB(n - 2);', '   }', '}'],
            spalten: ['n'], werte: function (a) { return [a[0]]; },
            abbruch: function (a) { return a[0] === 0; },
            lauf: function (k, a) {
                var n = a[0];
                if (n === 0) {
                    k.zeile(1, 'n == 0: Abbruchbedingung erfüllt.');
                    k.aus('Start!', 2);
                    return k.zurueck(null);
                }
                k.zeile(1, n + ' == 0? Nein.' + (n < 0 ? ' n ist schon negativ und wird nie mehr 0.' : ''));
                k.aus(String(n), 4);
                k.ruf([n - 2], 5);
                return k.zurueck(null);
            }
        },
        ggT: {
            titel: 'ggT(a, b)', name: 'ggT',
            params: [{ n: 'a', wert: 84, min: 0, max: 9999 }, { n: 'b', wert: 36, min: 0, max: 9999 }],
            code: ['int ggT(int a, int b) {', '   if (b == 0) {', '      return a;', '   }', '   return ggT(b, a % b);', '}'],
            spalten: ['a', 'b', 'a % b'], werte: function (a) { return [a[0], a[1], a[1] === 0 ? '–' : a[0] % a[1]]; },
            abbruch: function (a) { return a[1] === 0; },
            lauf: function (k, a) {
                if (a[1] === 0) {
                    k.zeile(1, 'b == 0: Abbruchbedingung erfüllt, a ist der ggT.');
                    return k.zurueck(a[0], 'a = ' + a[0], 2);
                }
                k.zeile(1, a[1] + ' == 0? Nein. Neue Parameter: b = ' + a[1] + ' und a % b = ' + a[0] + ' % ' + a[1] + ' = ' + (a[0] % a[1]) + '.');
                var r = k.ruf([a[1], a[0] % a[1]], 4);
                return k.zurueck(r, 'die Antwort von ggT(' + a[1] + ', ' + (a[0] % a[1]) + ') unverändert', 4);
            }
        },
        quersumme: {
            titel: 'quersumme(n)', name: 'quersumme', regel: true, aufgabe: 'Aufgabe 4a',
            params: [{ n: 'n', wert: 4711, min: 0, max: 999999999 }],
            code: ['quersumme(n):', '   Ist n einstellig (n < 10)?', '      Antwort: n', '   Sonst:',
                   '      frage quersumme(n / 10)      (n ohne letzte Ziffer)', '      Antwort: n % 10 + diese Antwort'],
            spalten: ['n', 'n % 10', 'n / 10'], werte: function (a) { return [a[0], a[0] % 10, div(a[0], 10)]; },
            abbruch: function (a) { return a[0] < 10; },
            lauf: function (k, a) {
                var n = a[0];
                if (n < 10) {
                    k.zeile(1, n + ' < 10: einstellig, Abbruchbedingung erfüllt.');
                    return k.zurueck(n, String(n), 2);
                }
                k.zeile(1, n + ' < 10? Nein. Letzte Ziffer: ' + n + ' % 10 = ' + (n % 10) + ', Rest: ' + n + ' / 10 = ' + div(n, 10) + '.');
                var r = k.ruf([div(n, 10)], 4);
                return k.zurueck(n % 10 + r, (n % 10) + ' + ' + r + ' = ' + (n % 10 + r), 5);
            }
        },
        umrechnen: {
            titel: 'umrechnen(n, basis)', name: 'umrechnen', regel: true, aufgabe: 'Aufgabe 4a',
            params: [{ n: 'n', wert: 22, min: 0, max: 4095 }, { n: 'basis', wert: 2, min: 2, max: 16 }],
            code: ['umrechnen(n, basis):', '   Ist n < basis?', '      Antwort: die Ziffer für n', '   Sonst:',
                   '      frage umrechnen(n / basis, basis)   (die vorderen Ziffern)', '      Antwort: diese Ziffern + Ziffer für n % basis'],
            spalten: ['n', 'basis', 'n / basis', 'n % basis'],
            werte: function (a) { return [a[0], a[1], div(a[0], a[1]), a[0] % a[1]]; },
            abbruch: function (a) { return a[0] < a[1]; },
            lauf: function (k, a) {
                var n = a[0], b = a[1];
                if (n < b) {
                    k.zeile(1, n + ' < ' + b + ': nur noch eine Ziffer, Abbruchbedingung erfüllt.');
                    return k.zurueck(ZIFFERN.charAt(n), 'Ziffer für ' + n, 2);
                }
                k.zeile(1, n + ' < ' + b + '? Nein. Letzte Ziffer: ' + n + ' % ' + b + ' = ' + (n % b) + ', vordere Ziffern aus ' + n + ' / ' + b + ' = ' + div(n, b) + '.');
                var r = k.ruf([div(n, b), b], 4);
                return k.zurueck(r + ZIFFERN.charAt(n % b), txt(r) + ' + "' + ZIFFERN.charAt(n % b) + '"', 5);
            }
        },
        fib: {
            titel: 'fib(n)', name: 'fib', regel: true, baum: true, aufgabe: 'Aufgabe 5a',
            params: [{ n: 'n', wert: 4, min: 0, max: 6 }],
            code: ['fib(n):', '   n == 0:  Antwort 0', '   n == 1:  Antwort 1', '   Sonst:',
                   '      frage zuerst fib(n − 1), dann fib(n − 2)', '      Antwort: Summe der beiden Antworten'],
            spalten: ['n'], werte: function (a) { return [a[0]]; },
            abbruch: function (a) { return a[0] === 0 || a[0] === 1; },
            lauf: function (k, a) {
                var n = a[0];
                if (n === 0) { k.zeile(1, 'n == 0: Abbruchbedingung erfüllt.'); return k.zurueck(0, '0', 1); }
                if (n === 1) { k.zeile(2, 'n == 1: Abbruchbedingung erfüllt.'); return k.zurueck(1, '1', 2); }
                k.zeile(3, 'n ist weder 0 noch 1: zwei rekursive Aufrufe. Zuerst fib(' + (n - 1) + ').');
                var x = k.ruf([n - 1], 4);
                k.zeile(4, 'fib(' + (n - 1) + ') hat ' + x + ' geliefert. Jetzt der zweite Aufruf: fib(' + (n - 2) + ').');
                var y = k.ruf([n - 2], 4);
                return k.zurueck(x + y, x + ' + ' + y + ' = ' + (x + y), 5);
            }
        }
    };

    // ---------- Ablauf vorab berechnen: Liste von Ereignissen ----------
    function simuliere(alg, args) {
        var ev = [], aufrufe = [], stapel = [];
        var VOLL = {};
        function neuerAufruf(a, zeile) {
            var id = aufrufe.length;
            var eltern = stapel.length ? stapel[stapel.length - 1] : null;
            aufrufe.push({ id: id, args: a, eltern: eltern, tiefe: stapel.length, kinder: [] });
            if (eltern !== null) aufrufe[eltern].kinder.push(id);
            stapel.push(id);
            var name = alg.name + '(' + a.map(txt).join(', ') + ')';
            aufrufe[id].name = name;
            var info = eltern === null ? name + ' wird aufgerufen.' : aufrufe[eltern].name + ' ruft ' + name + ' auf und wartet auf die Antwort.';
            ev.push({ typ: 'ruf', id: id, zeile: eltern === null ? 0 : zeile, zeileVon: eltern, info: info });
            if (stapel.length > (alg.grenze || STAPEL_GRENZE)) {
                ev.push({ typ: 'voll', id: id, info: 'Stapel voll: ' + stapel.length + ' Aufrufe liegen auf dem Stapel, und keiner ist je fertig geworden. Java bricht hier mit einem StackOverflowError ab.' });
                throw VOLL;
            }
            var erg = alg.lauf(k(id), a);
            stapel.pop();
            return erg;
        }
        function k(id) {
            return {
                zeile: function (nr, info) { ev.push({ typ: 'zeile', id: id, zeile: nr, info: aufrufe[id].name + ': ' + info }); },
                aus: function (text, nr) { ev.push({ typ: 'aus', id: id, zeile: nr, text: text, info: aufrufe[id].name + ' gibt „' + text + '“ aus.' }); },
                ruf: function (a, nr) { return neuerAufruf(a, nr); },
                zurueck: function (wert, rechnung, nr) {
                    var c = aufrufe[id];
                    c.wert = wert;
                    var gleiche = aufrufe.filter(function (x) { return x.id < id && x.name === c.name; }).length;
                    var info = alg.void
                        ? c.name + ' ist fertig.' + (c.eltern === null ? '' : ' Weiter geht es in ' + aufrufe[c.eltern].name + ' direkt nach dem Aufruf.')
                        : c.name + ' gibt ' + txt(wert) + ' zurück' + (rechnung && rechnung !== String(wert) ? ' (' + rechnung + ')' : '') + '.' +
                          (c.eltern === null ? '' : ' ' + aufrufe[c.eltern].name + ' rechnet damit weiter.') +
                          (gleiche ? ' ' + c.name + ' wurde damit schon zum ' + (gleiche + 1) + '. Mal berechnet!' : '');
                    ev.push({ typ: 'rueck', id: id, zeile: alg.void ? alg.code.length - 1 : nr, wert: wert, rechnung: rechnung, info: info });
                    return wert;
                }
            };
        }
        try { neuerAufruf(args, 0); } catch (e) { if (e !== VOLL) throw e; }
        return { ev: ev, aufrufe: aufrufe };
    }

    // ---------- DOM-Hilfen ----------
    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return e;
    }
    function s(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }
    function gleich(eingabe, wert) {
        var a = String(eingabe).trim().replace(/^["„“']|["„“']$/g, '').toUpperCase();
        return a === String(wert).toUpperCase();
    }

    // ---------- Labor ----------
    var zaehler = 0;
    function labor(box) {
        var nr = ++zaehler;
        var namen = (box.getAttribute('data-aufruflabor') || 'ggT').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return ALGOS[x]; });
        var alg = ALGOS[box.getAttribute('data-start')] || ALGOS[namen[0]];
        var lauf = null, schritt = 0, versuche = 0, regelOffen = false;

        box.classList.add('al');
        var wahl = h('select', { 'aria-label': 'Algorithmus' });
        namen.forEach(function (n) { wahl.appendChild(h('option', { value: n, text: ALGOS[n].titel })); });
        wahl.value = alg.name;
        if (namen.length < 2) wahl.hidden = true;
        var paramBox = h('span', { cls: 'al-params' });
        var knopfNeu = h('button', { type: 'button', text: '↺ Neu starten' });
        var knopfSchritt = h('button', { type: 'button', cls: 'zw-haupt', text: '▶ Nächster Schritt' });
        var knopfAlles = h('button', { type: 'button', text: '⏭ Bis zum Ende' });
        var vorher = h('input', { type: 'checkbox', id: 'al-vorher-' + nr });
        var vorherLabel = h('label', { cls: 'al-check', for: 'al-vorher-' + nr }, [vorher, ' Rückgaben selbst vorhersagen']);
        box.appendChild(h('div', { cls: 'zw-knoepfe' }, [wahl, paramBox, knopfNeu, h('span', { cls: 'zw-trenner' }), knopfSchritt, knopfAlles, vorherLabel]));

        var codeKopf = h('div', { cls: 'al-panel-kopf' });
        var regelKnopf = h('button', { type: 'button', cls: 'knopf-klein', text: 'Regel einblenden' });
        var codeEl = h('pre', { cls: 'zw-code al-code' });
        var stapelEl = h('ol', { cls: 'al-stapel', 'aria-label': 'Aufrufstapel' });
        var ausgabeEl = h('pre', { cls: 'al-ausgabe' });
        var ausgabeBox = h('div', { cls: 'al-ausgabe-box' }, [h('div', { cls: 'al-panel-kopf', text: 'Ausgabe' }), ausgabeEl]);
        box.appendChild(h('div', { cls: 'al-oben' }, [
            h('div', { cls: 'al-codebox' }, [h('div', { cls: 'al-kopfzeile' }, [codeKopf, regelKnopf]), codeEl]),
            h('div', { cls: 'al-stapelbox' }, [h('div', { cls: 'al-panel-kopf', text: 'Aufrufstapel (oben: aktiv)' }), stapelEl, ausgabeBox])
        ]));
        var infoEl = h('div', { cls: 'zw-info al-info', 'aria-live': 'polite' });
        box.appendChild(infoEl);
        var svg = s('svg', { class: 'zw-svg al-baum', role: 'img', 'aria-label': 'Aufrufbaum' });
        var baumBox = h('div', { cls: 'al-baumbox' }, [h('div', { cls: 'al-panel-kopf', text: 'Aufrufbaum: jeder Aufruf mit den Aufrufen, die er selbst macht' }), svg]);
        box.appendChild(baumBox);
        var tabelle = h('table', { cls: 'rd-tab al-tab' });
        box.appendChild(h('div', { cls: 'tab-scroll' }, [tabelle]));
        var zaehlEl = h('p', { cls: 'zw-legende' });
        box.appendChild(zaehlEl);

        function baueParams() {
            paramBox.textContent = '';
            alg.params.forEach(function (p, i) {
                var inp = h('input', { type: 'number', min: p.min, max: p.max, value: p.wert, 'aria-label': p.n, 'data-i': i });
                inp.addEventListener('change', neu);
                inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') neu(); });
                paramBox.appendChild(h('label', { cls: 'al-param' }, [p.n + ' = ', inp]));
            });
        }
        function args() {
            return alg.params.map(function (p, i) {
                var inp = paramBox.querySelector('[data-i="' + i + '"]');
                var v = Math.round(Number(inp.value));
                if (!isFinite(v)) v = p.wert;
                v = Math.max(p.min, Math.min(p.max, v));
                inp.value = v;
                return v;
            });
        }
        function neu() {
            lauf = simuliere(alg, args());
            schritt = 0; versuche = 0;
            zeige();
        }

        // Zustand nach den ersten `schritt` Ereignissen
        function zustand() {
            var st = { offen: [], fertig: {}, gesehen: {}, ausgabe: [], ausJe: {}, letztes: null, voll: false };
            for (var i = 0; i < schritt; i++) {
                var e = lauf.ev[i];
                st.letztes = e;
                if (e.typ === 'ruf') { st.offen.push(e.id); st.gesehen[e.id] = true; }
                else if (e.typ === 'rueck') { st.offen.pop(); st.fertig[e.id] = e; }
                else if (e.typ === 'aus') { st.ausgabe.push(e.text); (st.ausJe[e.id] = st.ausJe[e.id] || []).push(e.text); }
                else if (e.typ === 'voll') st.voll = true;
            }
            return st;
        }
        function naechstes() { return lauf.ev[schritt] || null; }
        function wartetAufVorhersage() {
            var e = naechstes();
            return vorher.checked && !alg.void && e && e.typ === 'rueck';
        }

        function zeige() {
            var st = zustand();
            var aktiv = st.offen.length ? st.offen[st.offen.length - 1] : null;
            var e = st.letztes;
            // Code
            codeKopf.textContent = alg.regel ? 'Regel in Worten' : 'Java';
            regelKnopf.hidden = !alg.regel;
            regelKnopf.textContent = regelOffen ? 'Regel ausblenden' : 'Regel einblenden';
            codeEl.textContent = '';
            var verdeckt = alg.regel && !regelOffen;
            alg.code.forEach(function (z, i) {
                var zeile = verdeckt && i > 0 ? (i === 1 ? '   … erst selbst überlegen (' + alg.aufgabe + ' auf dem Blatt),' : i === 2 ? '     dann mit „Regel einblenden“ vergleichen.' : ' ') : z;
                var sp = h('span', { text: zeile });
                if (e && e.zeile === i && !verdeckt && e.typ !== 'voll') sp.className = 'aktiv';
                if (e && e.typ === 'voll' && i === 0) sp.className = 'fehlerzeile';
                codeEl.appendChild(sp);
            });
            // Stapel
            stapelEl.textContent = '';
            st.offen.slice().reverse().forEach(function (id, i) {
                stapelEl.appendChild(h('li', { cls: i === 0 ? 'aktiv' : '', text: lauf.aufrufe[id].name + (i === 0 ? '' : '  wartet') }));
            });
            if (!st.offen.length) stapelEl.appendChild(h('li', { cls: 'leer', text: schritt ? 'leer: alle Aufrufe sind fertig' : 'noch leer' }));
            if (st.voll) stapelEl.classList.add('voll'); else stapelEl.classList.remove('voll');
            ausgabeEl.textContent = st.ausgabe.join('\n');
            ausgabeBox.hidden = !alg.void;
            // Info
            infoEl.textContent = '';
            if (!e) infoEl.appendChild(h('p', { text: 'Klicke auf „Nächster Schritt“. Überlege vorher jedes Mal: Was passiert als Nächstes?' }));
            else infoEl.appendChild(h('p', { cls: e.typ === 'voll' ? 'fehler' : (e.typ === 'rueck' ? 'rueckgabe' : ''), text: e.info }));
            if (wartetAufVorhersage()) {
                var c = lauf.aufrufe[naechstes().id];
                infoEl.appendChild(h('p', { text: 'Vorhersage: Was gibt ' + c.name + ' zurück? Trag es in der Tabelle ein und klicke auf „Nächster Schritt“.' + (versuche ? ' Noch nicht richtig, versuch es noch einmal.' : '') }));
            }
            if (schritt >= lauf.ev.length && !st.voll) {
                var w = lauf.aufrufe[0];
                infoEl.appendChild(h('p', { cls: 'rueckgabe', text: alg.void ? 'Fertig.' : 'Ergebnis: ' + w.name + ' = ' + txt(w.wert) }));
            }
            // Tabelle
            tabelle.textContent = '';
            var kopf = ['Nr.', 'Aufruf'].concat(alg.spalten, ['Abbruch?'], alg.void ? ['Ausgabe'] : ['Rückgabe']);
            tabelle.appendChild(h('thead', {}, [h('tr', {}, kopf.map(function (k) { return h('th', { text: k }); }))]));
            var tb = h('tbody');
            lauf.aufrufe.forEach(function (c) {
                if (!st.gesehen[c.id]) return;
                var f = st.fertig[c.id];
                var zellen = [h('td', { text: String(c.id + 1) }), h('td', { cls: 'al-aufruf', style: 'padding-left:' + (0.7 + c.tiefe * 0.9) + 'rem', text: c.name })];
                alg.werte(c.args).forEach(function (v) { zellen.push(h('td', { text: String(v) })); });
                zellen.push(h('td', { text: alg.abbruch(c.args) ? 'ja' : 'nein' }));
                var letzte;
                if (alg.void) letzte = h('td', { cls: 'al-aus', text: (st.ausJe[c.id] || []).join(' · ') });
                else if (f) letzte = h('td', { cls: 'al-wert', text: txt(f.wert) + (f.rechnung && f.rechnung !== String(f.wert) && f.rechnung.indexOf('Antwort') < 0 ? '   (' + f.rechnung + ')' : '') });
                else if (wartetAufVorhersage() && naechstes().id === c.id) {
                    var inp = h('input', { type: 'text', cls: 'al-tipp', 'aria-label': 'Rückgabe von ' + c.name, autocomplete: 'off' });
                    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') weiter(); });
                    letzte = h('td', {}, [inp]);
                } else letzte = h('td', { cls: 'al-wartet', text: c.id === aktiv ? 'aktiv' : 'wartet …' });
                zellen.push(letzte);
                var tr = h('tr', { cls: c.id === aktiv ? 'aktiv' : (f ? 'fertig' : 'wartend') }, zellen);
                if (st.voll && c.id === lauf.aufrufe.length - 1) tr.className = 'voll';
                tb.appendChild(tr);
            });
            tabelle.appendChild(tb);
            var feld = tabelle.querySelector('.al-tipp');
            if (feld && document.activeElement !== feld && box.contains(document.activeElement)) feld.focus();
            // Baum
            baumBox.hidden = !alg.baum;
            if (alg.baum) zeichneBaum(st, aktiv);
            var anzahl = Object.keys(st.gesehen).length;
            zaehlEl.textContent = 'Aufrufe bisher: ' + anzahl + (schritt >= lauf.ev.length ? ' (insgesamt)' : '') + ' · größte Tiefe des Stapels bisher: ' +
                Object.keys(st.gesehen).reduce(function (m, id) { return Math.max(m, lauf.aufrufe[id].tiefe + 1); }, 0);
            knopfSchritt.disabled = knopfAlles.disabled = schritt >= lauf.ev.length;
        }

        function zeichneBaum(st, aktiv) {
            while (svg.firstChild) svg.removeChild(svg.firstChild);
            var auf = lauf.aufrufe, x = 0, B = 64, HB = 26, DY = 52;
            (function lege(id) {
                var c = auf[id];
                if (!c.kinder.length) { c.x = x++; return; }
                c.kinder.forEach(lege);
                c.x = (auf[c.kinder[0]].x + auf[c.kinder[c.kinder.length - 1]].x) / 2;
            })(0);
            var tiefe = auf.reduce(function (m, c) { return Math.max(m, c.tiefe); }, 0);
            var breite = Math.max(x, 3) * (B + 10), hoehe = (tiefe + 1) * DY + 14;
            svg.setAttribute('viewBox', '0 0 ' + breite + ' ' + hoehe);
            svg.style.minWidth = Math.round(breite * 0.6) + 'px';
            svg.style.maxWidth = Math.round(breite * 1.1) + 'px';
            function px(c) { return 5 + c.x * (B + 10) + B / 2; }
            function py(c) { return 10 + c.tiefe * DY; }
            auf.forEach(function (c) {
                if (c.eltern !== null && st.gesehen[c.id]) {
                    var p = auf[c.eltern];
                    s('line', { x1: px(p), y1: py(p) + HB, x2: px(c), y2: py(c), class: 'al-kante' }, svg);
                }
            });
            auf.forEach(function (c) {
                var g = s('g', { class: 'al-knoten' + (!st.gesehen[c.id] ? ' verdeckt' : c.id === aktiv ? ' aktiv' : st.fertig[c.id] ? ' fertig' : ' wartet') }, svg);
                s('rect', { x: px(c) - B / 2, y: py(c), width: B, height: HB, rx: 7 }, g);
                s('text', { x: px(c), y: py(c) + HB / 2 }, g, st.gesehen[c.id] ? c.name : '?');
                if (st.fertig[c.id]) {
                    s('circle', { cx: px(c) + B / 2 - 2, cy: py(c) + HB, r: 10, class: 'al-wertkreis' }, g);
                    s('text', { x: px(c) + B / 2 - 2, y: py(c) + HB, class: 'al-wertzahl' }, g, String(st.fertig[c.id].wert));
                }
            });
        }

        function weiter() {
            if (schritt >= lauf.ev.length) return;
            if (wartetAufVorhersage()) {
                var feld = tabelle.querySelector('.al-tipp');
                var e = naechstes();
                if (!feld || !gleich(feld.value, e.wert)) {
                    versuche++;
                    if (versuche < 3) { zeige(); var f2 = tabelle.querySelector('.al-tipp'); if (f2) { f2.value = feld ? feld.value : ''; f2.focus(); } return; }
                }
            }
            versuche = 0;
            schritt++;
            zeige();
        }

        wahl.addEventListener('change', function () { alg = ALGOS[wahl.value]; regelOffen = false; baueParams(); neu(); });
        knopfNeu.addEventListener('click', neu);
        knopfSchritt.addEventListener('click', weiter);
        knopfAlles.addEventListener('click', function () { schritt = lauf.ev.length; versuche = 0; zeige(); });
        vorher.addEventListener('change', zeige);
        regelKnopf.addEventListener('click', function () { regelOffen = !regelOffen; zeige(); });
        baueParams();
        neu();
    }

    function start() { document.querySelectorAll('[data-aufruflabor]').forEach(labor); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
