/*
 * Formale Sprachen (Informatik 13) – Grammatik-Werkzeuge der Stationen 1.3 und 1.4
 *
 *   <div data-diagramm>EBNF</div>              Syntaxdiagramme zu einer Grammatik zeichnen
 *   <div data-gleisnetz="smiley|wort">        Gleisnetz-Fahrt: Wörter durch Abfahren erzeugen,
 *                                              optional mit mitwachsendem Ableitungsbaum
 *   <div data-baukasten="rgb|kennzeichen|frei"> Diagramm-Baukasten (Klicken statt Zeichnen) mit Prüfstand
 *   <div data-ebnf-spiegel>                    EBNF und Diagramm: Teile gegenseitig hervorheben
 *   <div data-ableitung>                       Ableitungs-Spiel: ein Zielwort Schritt für Schritt ableiten
 *   <div data-werkstatt="geld|molkerei|uhrzeit|terme|frei">  Grammatik-Werkstatt: EBNF tippen, testen
 *
 * Kern: EBNF-Parser, Syntaxdiagramm-Zeichner (SVG), Erkenner (Fixpunkt über Start-/Endpositionen,
 * kommt mit Rekursion und ε zurecht), Fehlerstelle wie beim Compiler, Ableitungsbaum, Zufallswörter.
 * Keine Abhängigkeiten. Eigene Grammatiken bleiben im Browser (localStorage), nichts geht an einen Server.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';

    // ---------- Hilfsfunktionen ----------
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
    function leeren(e) { while (e.firstChild) e.removeChild(e.firstChild); }
    function zeigeZ(v) { return v.replace(/ /g, '␣'); }
    function zeigeWort(w) { return w === '' ? 'ε' : zeigeZ(w); }
    function speicherLesen(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function speicherSchreiben(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* privat */ } }
    function speicherLoeschen(k) { try { window.localStorage.removeItem(k); } catch (e) { /* privat */ } }

    // =====================================================================
    // Ausdrücke (AST)
    //   { t: 'T', v }  Terminal       { t: 'N', v }  Nichtterminal     { t: 'E' }  leeres Wort ε
    //   { t: 'seq'|'alt', k: [...] }  { t: 'opt'|'rep'|'plus', k: [x] }   (rep: {x}, plus: x {x})
    // =====================================================================
    function T(v) { return { t: 'T', v: v }; }
    function N(v) { return { t: 'N', v: v }; }
    function E() { return { t: 'E' }; }
    function K(t, k) { return { t: t, k: k }; }
    function rein(n) {   // Kopie ohne Hilfsfelder (_l, id …)
        if (n.t === 'T' || n.t === 'N') return { t: n.t, v: n.v };
        if (n.t === 'E') return E();
        return K(n.t, n.k.map(rein));
    }
    function gleich(a, b) { return JSON.stringify(rein(a)) === JSON.stringify(rein(b)); }

    // seq/alt glätten, Ein-Element-Folgen auflösen, „X {X}“ zu plus(X) zusammenfassen.
    // Arbeitet an Ort und Stelle, damit der Baukasten seine Auswahl wiederfindet.
    function normal(n) {
        if (!n.k) return n;
        n.k = n.k.map(normal);
        if (n.t === 'seq' || n.t === 'alt') {
            var flach = [];
            n.k.forEach(function (x) { if (x.t === n.t) flach = flach.concat(x.k); else flach.push(x); });
            if (n.t === 'seq') {
                flach = flach.filter(function (x) { return x.t !== 'E'; });
                var zus = [];
                flach.forEach(function (x) {
                    var vor = zus[zus.length - 1];
                    if (x.t === 'rep' && vor && gleich(vor, x.k[0])) zus[zus.length - 1] = K('plus', [vor]);
                    else zus.push(x);
                });
                flach = zus;
                if (flach.length === 0) return E();
            }
            if (flach.length === 1) return flach[0];
            n.k = flach;
        }
        return n;
    }

    // =====================================================================
    // EBNF lesen
    //   Regel = Name "=" Ausdruck "." .   Terminale in "…", '…' oder „…“; ε; (…) […] {…}
    //   "0" | … | "9" ist eine Abkürzung für alle Zeichen dazwischen. Kommentare (* … *).
    // =====================================================================
    var SCHLIESSER = { '"': '"', "'": "'", '„': '“"”', '“': '”"', '‚': '‘\'' };

    function parseEBNF(text) {
        var tok = [], i = 0, zeile = 1;
        function fehler(msg, z) { return { fehler: 'Zeile ' + (z || zeile) + ': ' + msg }; }
        while (i < text.length) {
            var c = text[i];
            if (c === '\n') { zeile++; i++; continue; }
            if (/\s/.test(c)) { i++; continue; }
            if (text.substr(i, 2) === '(*') {
                var ende = text.indexOf('*)', i + 2);
                if (ende < 0) return fehler('Der Kommentar (* … wird nicht mit *) geschlossen.');
                zeile += (text.slice(i, ende).match(/\n/g) || []).length;
                i = ende + 2; continue;
            }
            if (SCHLIESSER[c]) {
                var j = i + 1;
                while (j < text.length && SCHLIESSER[c].indexOf(text[j]) < 0 && text[j] !== '\n') j++;
                if (j >= text.length || text[j] === '\n') return fehler('Das Terminal ' + c + text.slice(i + 1, j) + ' wird nicht mit Anführungszeichen geschlossen.');
                var v = text.slice(i + 1, j);
                if (v === '') return fehler('Leeres Terminal "". Für das leere Wort schreibe ε oder benutze [ ] bzw. { }.');
                tok.push({ k: 'T', v: v, z: zeile }); i = j + 1; continue;
            }
            var m = /^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß_0-9-]*/.exec(text.slice(i));
            if (m) { tok.push({ k: 'N', v: m[0].replace(/-+$/, ''), z: zeile }); i += m[0].replace(/-+$/, '').length || 1; continue; }
            if (c === '…') { tok.push({ k: '…', z: zeile }); i++; continue; }
            if (text.substr(i, 3) === '...') { tok.push({ k: '…', z: zeile }); i += 3; continue; }
            if (c === 'ε') { tok.push({ k: 'ε', z: zeile }); i++; continue; }
            if ('=|.;()[]{}'.indexOf(c) >= 0) { tok.push({ k: c === ';' ? '.' : c, z: zeile }); i++; continue; }
            return fehler('Das Zeichen ' + c + ' gehört nicht zur EBNF. Terminale stehen in Anführungszeichen.');
        }

        var p = 0;
        function sieh(o) { return tok[p + (o || 0)]; }
        function art(o) { var t = sieh(o); return t ? t.k : null; }
        var regeln = [], err = null;
        function stop(msg, t) { if (!err) err = 'Zeile ' + (t ? t.z : (tok[tok.length - 1] || { z: 1 }).z) + ': ' + msg; return null; }

        function faktor() {
            var t = sieh();
            if (!t) return stop('Hier fehlt noch etwas.');
            if (t.k === 'T') { p++; return T(t.v); }
            if (t.k === 'ε') { p++; return E(); }
            if (t.k === 'N') {
                if (art(1) === '=') return stop('Fehlt vor „' + t.v + ' =“ der Punkt am Ende der vorherigen Regel?', t);
                p++; return N(t.v);
            }
            var zu = { '(': ')', '[': ']', '{': '}' }[t.k];
            if (zu) {
                p++;
                var innen = ausdruck();
                if (err) return null;
                if (art() !== zu) return stop('Die Klammer ' + t.k + ' wird nicht mit ' + zu + ' geschlossen.', t);
                p++;
                if (t.k === '(') return innen;
                return K(t.k === '[' ? 'opt' : 'rep', [innen]);
            }
            return stop('Unerwartet: ' + t.k, t);
        }
        function term() {
            var teile = [];
            while (sieh() && ['T', 'N', 'ε', '(', '[', '{'].indexOf(art()) >= 0) {
                var f = faktor();
                if (err) return null;
                teile.push(f);
            }
            if (!teile.length) {
                var t = sieh();
                return stop(t ? 'Hier fehlt ein Terminal oder Nichtterminal (vor „' + t.k + '“). Für das leere Wort schreibe ε.' : 'Die Grammatik hört mitten in einer Regel auf.', t);
            }
            return teile.length === 1 ? teile[0] : K('seq', teile);
        }
        function ausdruck() {
            var zweige = [term()];
            if (err) return null;
            while (art() === '|') {
                p++;
                if (art() === '…') {
                    var t0 = sieh(); p++;
                    if (art() !== '|') return stop('Schreibe Bereiche so: "0" | … | "9".', t0);
                    p++;
                    var bis = term();
                    if (err) return null;
                    var von = zweige[zweige.length - 1];
                    if (!von || von.t !== 'T' || von.v.length !== 1 || bis.t !== 'T' || bis.v.length !== 1 || bis.v.charCodeAt(0) <= von.v.charCodeAt(0))
                        return stop('Ein Bereich mit … braucht vorne und hinten je ein einzelnes Zeichen, z. B. "a" | … | "z".', t0);
                    for (var c = von.v.charCodeAt(0) + 1; c <= bis.v.charCodeAt(0); c++) zweige.push(T(String.fromCharCode(c)));
                    continue;
                }
                zweige.push(term());
                if (err) return null;
            }
            return zweige.length === 1 ? zweige[0] : K('alt', zweige);
        }

        while (p < tok.length && !err) {
            if (art() === 'N' && /^R\d+$/.test(sieh().v) && art(1) === 'N' && art(2) === '=') p++;   // Regelnummer „R1“
            var kopf = sieh();
            if (kopf.k !== 'N') { stop('Eine Regel beginnt mit ihrem Namen, z. B. Mund = … .', kopf); break; }
            if (art(1) !== '=') { stop('Nach dem Regelnamen „' + kopf.v + '“ fehlt das Gleichheitszeichen =.', kopf); break; }
            p += 2;
            var ausd = ausdruck();
            if (err) break;
            if (art() !== '.') {
                var t = sieh();
                stop(t ? 'Die Regel „' + kopf.v + '“ ist hier zu Ende? Dann fehlt der Punkt. (Gefunden: „' + (t.v || t.k) + '“)' : 'Die Regel „' + kopf.v + '“ endet nicht mit einem Punkt.', t || kopf);
                break;
            }
            p++;
            if (regeln.some(function (r) { return r.name === kopf.v; })) { stop('Die Regel „' + kopf.v + '“ gibt es zweimal.', kopf); break; }
            regeln.push({ name: kopf.v, ausdruck: normal(ausd), zeile: kopf.z });
        }
        if (err) return { fehler: err };
        if (!regeln.length) return { fehler: 'Noch keine Regel. Beispiel: Augen = ":" | ";".' };
        return { regeln: regeln };
    }

    // ---------- EBNF schreiben ----------
    function terminalText(v) { return v.indexOf('"') >= 0 ? "'" + v + "'" : '"' + v + '"'; }
    function bereiche(zweige) {   // Läufe aufeinanderfolgender Einzelzeichen (ab 5) zusammenfassen
        var aus = [], i = 0;
        while (i < zweige.length) {
            var j = i;
            while (j + 1 < zweige.length && zweige[j].t === 'T' && zweige[j + 1].t === 'T' && zweige[j].v.length === 1 && zweige[j + 1].v.length === 1 &&
                   zweige[j + 1].v.charCodeAt(0) === zweige[j].v.charCodeAt(0) + 1) j++;
            if (j - i >= 4) { aus.push({ von: zweige[i], bis: zweige[j], alle: zweige.slice(i, j + 1) }); i = j + 1; }
            else { aus.push(zweige[i]); i++; }
        }
        return aus;
    }
    function ebnf(n, inFolge) {
        switch (n.t) {
            case 'T': return terminalText(n.v);
            case 'N': return n.v;
            case 'E': return 'ε';
            case 'seq': return n.k.map(function (x) { return ebnf(x, true); }).join(' ');
            case 'alt':
                var t = bereiche(n.k).map(function (z) { return z.von ? terminalText(z.von.v) + ' | … | ' + terminalText(z.bis.v) : ebnf(z, false); }).join(' | ');
                return inFolge ? '(' + t + ')' : t;
            case 'opt': return '[' + ebnf(n.k[0], false) + ']';
            case 'rep': return '{' + ebnf(n.k[0], false) + '}';
            case 'plus': return ebnf(n.k[0], true) + ' {' + ebnf(n.k[0], false) + '}';
        }
        return '';
    }
    function ebnfText(regeln) { return regeln.map(function (r) { return r.name + ' = ' + ebnf(r.ausdruck, false) + '.'; }).join('\n'); }

    // =====================================================================
    // Grammatik vorbereiten: Knoten nummerieren, Glushkov-Mengen (für die Gleisnetz-Fahrt)
    // =====================================================================
    var idZaehler = 0;
    function Grammatik(regeln) {
        var g = this;
        g.regeln = regeln;
        g.index = {};
        g.knoten = {};
        regeln.forEach(function (r) { g.index[r.name] = r; });
        g.start = regeln.length ? regeln[0].name : null;
        regeln.forEach(function (r) {
            (function nummer(n, eltern) {
                n.id = n.id || 'k' + (++idZaehler);   // vorhandene IDs behalten (Auswahl im Baukasten)
                g.knoten[n.id] = { n: n, eltern: eltern, regel: r };
                (n.k || []).forEach(function (x) { nummer(x, n); });
            })(r.ausdruck, null);
            r.gl = glushkov(r.ausdruck);
        });
        g.fehlend = [];
        g.zeichen = {};
        regeln.forEach(function (r) {
            (function lauf(n) {
                if (n.t === 'N' && !g.index[n.v] && g.fehlend.indexOf(n.v) < 0) g.fehlend.push(n.v);
                if (n.t === 'T') Array.from(n.v).forEach(function (c) { g.zeichen[c] = true; });
                (n.k || []).forEach(lauf);
            })(r.ausdruck);
        });
        g.alphabet = Object.keys(g.zeichen).sort();
    }

    function glushkov(wurzel) {
        var folge = {};
        function vereinige(a, b) { b.forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); }
        function f(n) {
            switch (n.t) {
                case 'T': case 'N': folge[n.id] = folge[n.id] || []; return { leer: false, erste: [n.id], letzte: [n.id] };
                case 'E': return { leer: true, erste: [], letzte: [] };
                case 'seq':
                    var teile = n.k.map(f);
                    teile.forEach(function (ti, i) {
                        ti.letzte.forEach(function (x) {
                            for (var j = i + 1; j < teile.length; j++) { vereinige(folge[x], teile[j].erste); if (!teile[j].leer) break; }
                        });
                    });
                    var erste = [], letzte = [];
                    for (var a = 0; a < teile.length; a++) { vereinige(erste, teile[a].erste); if (!teile[a].leer) break; }
                    for (var b = teile.length - 1; b >= 0; b--) { vereinige(letzte, teile[b].letzte); if (!teile[b].leer) break; }
                    return { leer: teile.every(function (t) { return t.leer; }), erste: erste, letzte: letzte };
                case 'alt':
                    var zw = n.k.map(f), e2 = [], l2 = [];
                    zw.forEach(function (z) { vereinige(e2, z.erste); vereinige(l2, z.letzte); });
                    return { leer: zw.some(function (z) { return z.leer; }), erste: e2, letzte: l2 };
                case 'opt':
                    var o = f(n.k[0]);
                    return { leer: true, erste: o.erste, letzte: o.letzte };
                case 'rep': case 'plus':
                    var r = f(n.k[0]);
                    r.letzte.forEach(function (x) { vereinige(folge[x], r.erste); });
                    return { leer: n.t === 'rep' || r.leer, erste: r.erste, letzte: r.letzte };
            }
        }
        var erg = f(wurzel);
        erg.folge = folge;
        return erg;
    }

    // =====================================================================
    // Erkenner: Für jede Regel und Startposition die Menge der Endpositionen (kleinster Fixpunkt).
    // Präfix-Modus: Position n+1 heißt „Eingabe zu Ende, es dürfte noch etwas kommen“.
    // =====================================================================
    function Erkenner(g, wort, praefix) {
        this.g = g; this.w = wort; this.n = wort.length; this.praefix = !!praefix;
        this.tab = {};
        var self = this, n = this.n, max = praefix ? n + 1 : n;
        g.regeln.forEach(function (r) { self.tab[r.name] = []; for (var i = 0; i <= max; i++) self.tab[r.name][i] = []; });
        var geaendert = true, runden = 0;
        while (geaendert && runden < 400) {
            geaendert = false; runden++;
            g.regeln.forEach(function (r) {
                for (var i = 0; i <= max; i++) {
                    var alt = self.tab[r.name][i];
                    self.eval(r.ausdruck, i).forEach(function (j) { if (alt.indexOf(j) < 0) { alt.push(j); geaendert = true; } });
                }
            });
        }
    }
    Erkenner.prototype.eval = function (e, i) {
        var self = this, n = this.n;
        function plusMenge(x, starts) {
            var alle = [], rand = starts.slice();
            while (rand.length) {
                var neu = [];
                rand.forEach(function (p) { self.eval(x, p).forEach(function (q) { if (alle.indexOf(q) < 0) { alle.push(q); neu.push(q); } }); });
                rand = neu;
            }
            return alle;
        }
        switch (e.t) {
            case 'T':
                if (i > n) return [n + 1];
                if (this.w.substr(i, e.v.length) === e.v) return [i + e.v.length];
                if (this.praefix && e.v.indexOf(this.w.slice(i)) === 0) return [n + 1];   // Rest der Eingabe ist Anfang des Terminals
                return [];
            case 'E': return [i];
            case 'N': return this.tab[e.v] ? this.tab[e.v][i].slice() : [];
            case 'seq':
                var menge = [i];
                for (var a = 0; a < e.k.length && menge.length; a++) {
                    var naechste = [];
                    menge.forEach(function (p) { self.eval(e.k[a], p).forEach(function (q) { if (naechste.indexOf(q) < 0) naechste.push(q); }); });
                    menge = naechste;
                }
                return menge;
            case 'alt':
                var u = [];
                e.k.forEach(function (x) { self.eval(x, i).forEach(function (q) { if (u.indexOf(q) < 0) u.push(q); }); });
                return u;
            case 'opt':
                var o = this.eval(e.k[0], i);
                if (o.indexOf(i) < 0) o.push(i);
                return o;
            case 'plus': return plusMenge(e.k[0], [i]);
            case 'rep':
                var r = plusMenge(e.k[0], [i]);
                if (r.indexOf(i) < 0) r.push(i);
                return r;
        }
        return [];
    };
    // Ableitungsbaum für w[i..j) aus Ausdruck e (nur im genauen Modus)
    Erkenner.prototype.baue = function (e, i, j, pfad) {
        var self = this;
        function folge(items, idx, a, b) {
            if (idx === items.length) return a === b ? [] : null;
            var ends = self.eval(items[idx], a).filter(function (q) { return q <= b; }).sort(function (x, y) { return y - x; });
            for (var q = 0; q < ends.length; q++) {
                var kopf = self.baue(items[idx], a, ends[q], pfad);
                if (kopf === null) continue;
                var rest = folge(items, idx + 1, ends[q], b);
                if (rest !== null) return kopf.concat(rest);
            }
            return null;
        }
        function wdh(x, a, b, mindestens) {
            if (a === b && !mindestens) return [];
            var ends = self.eval(x, a).filter(function (q) { return q <= b && (q > a || (mindestens && a === b)); }).sort(function (u, v) { return v - u; });
            for (var q = 0; q < ends.length; q++) {
                var kopf = self.baue(x, a, ends[q], pfad);
                if (kopf === null) continue;
                var rest = ends[q] === b ? [] : wdh(x, ends[q], b, false);
                if (rest !== null) return kopf.concat(rest);
            }
            return null;
        }
        switch (e.t) {
            case 'T': return (this.w.substr(i, e.v.length) === e.v && i + e.v.length === j) ? [{ t: 'T', v: e.v }] : null;
            case 'E': return i === j ? [] : null;
            case 'N':
                var key = e.v + ':' + i + ':' + j;
                if (!this.tab[e.v] || this.tab[e.v][i].indexOf(j) < 0 || pfad.indexOf(key) >= 0) return null;
                var innen = this.baue(this.g.index[e.v].ausdruck, i, j, pfad.concat([key]));
                if (innen === null) return null;
                return [{ t: 'N', v: e.v, kinder: innen.length ? innen : [{ t: 'E' }] }];
            case 'seq': return folge(e.k, 0, i, j);
            case 'alt':
                for (var z = 0; z < e.k.length; z++) {
                    if (this.eval(e.k[z], i).indexOf(j) < 0) continue;
                    var b = this.baue(e.k[z], i, j, pfad);
                    if (b !== null) return b;
                }
                return null;
            case 'opt': return i === j ? [] : this.baue(e.k[0], i, j, pfad);
            case 'rep': return wdh(e.k[0], i, j, false);
            case 'plus': return wdh(e.k[0], i, j, true);
        }
        return null;
    };

    // Alles, was die Werkzeuge über ein Wort wissen wollen
    function pruefeWort(g, wort, startName) {
        var start = startName || g.start;
        if (!g.index[start]) return { ok: false, grund: 'keinStart' };
        var fremd = Array.from(new Set(Array.from(wort).filter(function (c) { return !g.zeichen[c]; })));
        var genau = new Erkenner(g, wort, false);
        if (genau.tab[start][0].indexOf(wort.length) >= 0) {
            var b = genau.baue(N(start), 0, wort.length, []);
            return { ok: true, baum: b ? b[0] : null };
        }
        function lebensfaehig(p) {
            var e = new Erkenner(g, p, true);
            var t = e.tab[start][0];
            return t.indexOf(p.length) >= 0 || t.indexOf(p.length + 1) >= 0;
        }
        if (lebensfaehig(wort)) return { ok: false, grund: 'zuKurz', fremd: fremd };
        var k = wort.length - 1;
        while (k > 0 && !lebensfaehig(wort.slice(0, k))) k--;
        var erlaubt = g.alphabet.filter(function (c) { return lebensfaehig(wort.slice(0, k) + c); });
        var endeMoeglich = new Erkenner(g, wort.slice(0, k), false).tab[start][0].indexOf(k) >= 0;
        return { ok: false, grund: 'stelle', stelle: k, erlaubt: erlaubt, endeMoeglich: endeMoeglich, fremd: fremd };
    }

    function befundText(g, wort, r) {
        if (r.ok) return { art: 'ok', text: '✓ ' + zeigeWort(wort) + ' gehört zur Sprache.' };
        if (r.grund === 'keinStart') return { art: 'nein', text: 'Es gibt noch keine Startregel.' };
        if (g.fehlend.length) return { art: 'nein', text: '✗ ' + zeigeWort(wort) + ' gehört (noch) nicht dazu. Achtung: Zu ' + g.fehlend.join(', ') + ' gibt es noch keine Regel.' };
        if (r.grund === 'zuKurz') return { art: 'nein', text: '✗ ' + zeigeWort(wort) + ' ist zu früh zu Ende: Bis hierhin passt alles, aber es fehlt noch etwas.' };
        var vorne = wort.slice(0, r.stelle), zeichen = wort.charAt(r.stelle);
        var t = '✗ ' + zeigeWort(wort) + ' gehört nicht dazu. ';
        t += r.stelle === 0 ? 'Schon das erste Zeichen „' + zeigeZ(zeichen) + '“ ist nicht möglich.' :
             'Bis „' + zeigeZ(vorne) + '“ passt alles, dann ist „' + zeigeZ(zeichen) + '“ nicht erlaubt.';
        if (r.fremd && r.fremd.indexOf(zeichen) >= 0) t += ' Das Zeichen kommt in keiner Regel vor.';
        if (r.erlaubt.length || r.endeMoeglich) {
            var erl = r.erlaubt.slice(0, 14).map(function (c) { return '„' + zeigeZ(c) + '“'; });
            if (r.erlaubt.length > 14) erl.push('…');
            if (r.endeMoeglich) erl.push('das Ende');
            t += ' Möglich wäre hier: ' + erl.join(', ') + '.';
        }
        return { art: 'nein', text: t };
    }

    // ---------- Zufallswörter ----------
    function minHoehe(g) {
        var hh = {};
        g.regeln.forEach(function (r) { hh[r.name] = Infinity; });
        function m(e) {
            switch (e.t) {
                case 'T': case 'E': return 0;
                case 'N': return hh[e.v] === undefined ? Infinity : hh[e.v];
                case 'seq': return e.k.reduce(function (a, x) { return Math.max(a, m(x)); }, 0);
                case 'alt': return e.k.reduce(function (a, x) { return Math.min(a, m(x)); }, Infinity);
                case 'opt': case 'rep': return 0;
                case 'plus': return m(e.k[0]);
            }
            return Infinity;
        }
        var geaendert = true;
        while (geaendert) {
            geaendert = false;
            g.regeln.forEach(function (r) { var v = 1 + m(r.ausdruck); if (v < hh[r.name]) { hh[r.name] = v; geaendert = true; } });
        }
        return { hh: hh, m: m };
    }
    function zufallsWort(g, mh) {
        function gen(e, tiefe) {
            var knapp = tiefe > 9;
            switch (e.t) {
                case 'T': return e.v;
                case 'E': return '';
                case 'N': return gen(g.index[e.v].ausdruck, tiefe + 1);
                case 'seq': return e.k.map(function (x) { return gen(x, tiefe); }).join('');
                case 'alt':
                    var moegl = e.k.filter(function (x) { return mh.m(x) < Infinity; });
                    if (knapp) { var best = Math.min.apply(null, moegl.map(mh.m)); moegl = moegl.filter(function (x) { return mh.m(x) === best; }); }
                    return gen(moegl[Math.floor(Math.random() * moegl.length)], tiefe);
                case 'opt': return (!knapp && Math.random() < 0.5) ? gen(e.k[0], tiefe) : '';
                case 'rep': case 'plus':
                    var n = e.t === 'plus' ? 1 : 0;
                    while (!knapp && n < 4 && Math.random() < 0.5) n++;
                    var w = '';
                    for (var i = 0; i < n; i++) w += gen(e.k[0], tiefe);
                    return w;
            }
            return '';
        }
        return gen(N(g.start), 0);
    }
    function beispielWoerter(g, anzahl) {
        if (!g.start || g.fehlend.length) return null;
        var mh = minHoehe(g);
        if (mh.hh[g.start] === Infinity) return [];
        var liste = [], versuche = 0;
        while (liste.length < anzahl && versuche < anzahl * 12) {
            versuche++;
            var w = zufallsWort(g, mh);
            if (w.length <= 40 && liste.indexOf(w) < 0) liste.push(w);
        }
        return liste.sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
    }

    // =====================================================================
    // Syntaxdiagramme zeichnen (SVG)
    // =====================================================================
    var BH = 26, HB = 13, GAP = 16, R = 10, VS = 12;
    var messKontext = null;
    function textBreite(t, mono) {
        if (!messKontext) messKontext = document.createElement('canvas').getContext('2d');
        messKontext.font = mono ? '700 15px ui-monospace, "Cascadia Code", Consolas, monospace' : '600 14px system-ui, -apple-system, "Segoe UI", sans-serif';
        return messKontext.measureText(t).width;
    }

    function anzeigeZweige(n) {   // Alternativen, lange Zeichenbereiche als „erstes ⋮ letztes“
        var aus = [];
        bereiche(n.k).forEach(function (z) {
            if (z.von) { aus.push(z.von); aus.push({ t: 'dots', _bereich: z.alle }); aus.push(z.bis); }
            else aus.push(z);
        });
        return aus;
    }
    function layout(n, opt) {
        var l;
        switch (n.t) {
            case 'T': l = { w: Math.max(BH, textBreite(zeigeZ(n.v), true) + 20), up: HB, down: HB }; break;
            case 'N': l = { w: textBreite(n.v, false) + 22, up: HB, down: HB }; break;
            case 'E': l = (opt && opt.platzhalter && n === opt.wurzel) ? { w: 54, up: HB, down: HB, platz: true } : { w: 0, up: 0, down: 0 }; break;
            case 'dots': l = { w: 18, up: HB, down: HB }; break;
            case 'seq':
                l = { w: 0, up: 0, down: 0 };
                n.k.forEach(function (x, i) { var a = layout(x, opt); l.w += a.w + (i ? GAP : 0); l.up = Math.max(l.up, a.up); l.down = Math.max(l.down, a.down); });
                break;
            case 'alt': case 'opt': case 'rep':
                var zweige = n.t === 'alt' ? anzeigeZweige(n) : n.t === 'opt' ? [E(), n.k[0]] : [E(), { t: 'plus', k: [n.k[0]], _virtuell: true }];
                var ls = zweige.map(function (x) { return layout(x, opt); });
                var innen = Math.max.apply(null, ls.map(function (a) { return a.w; }));
                var dy = [0];
                for (var i = 1; i < ls.length; i++) dy.push(Math.max(dy[i - 1] + ls[i - 1].down + VS + ls[i].up, i === 1 ? 2 * R : dy[i - 1] + 2 * R));
                l = { w: innen + 4 * R, up: ls[0].up, down: dy[dy.length - 1] + ls[ls.length - 1].down, zweige: zweige, dy: dy, innen: innen };
                break;
            case 'plus':
                var a = layout(n.k[0], opt);
                var dl = Math.max(a.down + VS, 2 * R);
                l = { w: a.w + 4 * R, up: a.up, down: dl, dl: dl };
                break;
        }
        n._l = l;
        return l;
    }
    function linie(g, d) { return s('path', { d: d, 'class': 'sd-linie' }, g); }
    function pfeilspitze(g, x, y, links) {
        var d = links ? 7 : -7;
        return s('polygon', { points: x + ',' + y + ' ' + (x + d) + ',' + (y - 4.5) + ' ' + (x + d) + ',' + (y + 4.5), 'class': 'sd-spitze' }, g);
    }
    function zeichne(n, x, y, g, opt) {
        var l = n._l;
        if (n.t === 'T' || n.t === 'N' || (n.t === 'E' && l.platz)) {
            var kg = s('g', { 'class': 'sd-knoten ' + (n.t === 'T' ? 'sd-t' : n.t === 'N' ? 'sd-n' : 'sd-leer'), 'data-node': n.id || '' }, g);
            pfeilspitze(kg, x, y);
            s('rect', { x: x, y: y - HB, width: l.w, height: BH, rx: n.t === 'T' ? HB : 3 }, kg);
            s('text', { x: x + l.w / 2, y: y + 5, 'text-anchor': 'middle', 'class': n.t === 'T' ? 'sd-tt' : 'sd-nt' }, kg,
              n.t === 'T' ? zeigeZ(n.v) : n.t === 'N' ? n.v : '＋ leer');
            if (n.t === 'N' && opt && opt.fehlend && opt.fehlend.indexOf(n.v) >= 0) kg.classList.add('sd-fehlt');
            return;
        }
        if (n.t === 'E') { if (l.w) linie(g, 'M' + x + ',' + y + 'h' + l.w); return; }
        if (n.t === 'dots') {
            s('text', { x: x + l.w / 2, y: y + 6, 'text-anchor': 'middle', 'class': 'sd-dots' }, g, '⋮');
            return;
        }
        var gg = s('g', { 'class': 'sd-gruppe', 'data-node': n.id || '' }, g);
        if (n.t === 'seq') {
            var xx = x;
            n.k.forEach(function (k, i) {
                if (i) { linie(gg, 'M' + xx + ',' + y + 'h' + GAP); xx += GAP; }
                zeichne(k, xx, y, gg, opt);
                xx += k._l.w;
            });
            return;
        }
        if (n.t === 'plus') {
            var w = l.w, a = n.k[0]._l;
            linie(gg, 'M' + x + ',' + y + 'h' + 2 * R);
            zeichne(n.k[0], x + 2 * R, y, gg, opt);
            linie(gg, 'M' + (x + 2 * R + a.w) + ',' + y + 'H' + (x + w));
            var dl = l.dl;
            linie(gg, 'M' + (x + w - 2 * R) + ',' + y + ' A' + R + ',' + R + ' 0 0 1 ' + (x + w - R) + ',' + (y + R) +
                  ' V' + (y + dl - R) + ' A' + R + ',' + R + ' 0 0 1 ' + (x + w - 2 * R) + ',' + (y + dl) +
                  ' H' + (x + 2 * R) + ' A' + R + ',' + R + ' 0 0 1 ' + (x + R) + ',' + (y + dl - R) +
                  ' V' + (y + R) + ' A' + R + ',' + R + ' 0 0 1 ' + (x + 2 * R) + ',' + y);
            pfeilspitze(gg, x + w / 2 - 3, y + dl, true);
            return;
        }
        // alt, opt, rep
        l.zweige.forEach(function (z, i) {
            var zw = z._l.w, xs = x + 2 * R + (l.innen - zw) / 2, yy = y + l.dy[i];
            if (i === 0) {
                linie(gg, 'M' + x + ',' + y + 'H' + xs);
                zeichne(z, xs, y, gg, opt);
                linie(gg, 'M' + (xs + zw) + ',' + y + 'H' + (x + l.w));
            } else {
                linie(gg, 'M' + x + ',' + y + ' A' + R + ',' + R + ' 0 0 1 ' + (x + R) + ',' + (y + R) + ' V' + (yy - R) +
                      ' A' + R + ',' + R + ' 0 0 0 ' + (x + 2 * R) + ',' + yy + ' H' + xs);
                zeichne(z, xs, yy, gg, opt);
                linie(gg, 'M' + (xs + zw) + ',' + yy + ' H' + (x + l.w - 2 * R) + ' A' + R + ',' + R + ' 0 0 0 ' + (x + l.w - R) + ',' + (yy - R) +
                      ' V' + (y + R) + ' A' + R + ',' + R + ' 0 0 1 ' + (x + l.w) + ',' + y);
            }
        });
    }

    // Eine Regel als SVG; opt: { platzhalter, fehlend }
    function regelSVG(r, opt) {
        var o = { platzhalter: opt && opt.platzhalter, wurzel: r.ausdruck, fehlend: opt && opt.fehlend };
        var l = layout(r.ausdruck, o);
        var oben = 24, x0 = 6;
        var y = oben + l.up + 4;
        var breite = x0 + GAP + l.w + GAP + 12, hoehe = y + l.down + 8;
        var svg = s('svg', { viewBox: '0 0 ' + breite + ' ' + hoehe, width: breite, height: hoehe, 'class': 'sd-svg', role: 'img',
                             'aria-label': 'Syntaxdiagramm ' + r.name + ': ' + ebnf(r.ausdruck, false) });
        s('text', { x: 2, y: 15, 'class': 'sd-name' }, svg, r.name);
        s('line', { x1: x0, y1: y - 9, x2: x0, y2: y + 9, 'class': 'sd-balken' }, svg);
        linie(svg, 'M' + x0 + ',' + y + 'h' + GAP);
        zeichne(r.ausdruck, x0 + GAP, y, svg, o);
        var xe = x0 + GAP + l.w;
        var ende = s('g', { 'class': 'sd-ende', 'data-ende': r.name }, svg);
        linie(ende, 'M' + xe + ',' + y + 'h' + GAP);
        pfeilspitze(ende, xe + GAP, y);
        s('line', { x1: xe + GAP + 1, y1: y - 9, x2: xe + GAP + 1, y2: y + 9, 'class': 'sd-balken' }, ende);
        s('rect', { x: xe, y: y - 12, width: GAP + 8, height: 24, 'class': 'sd-ende-ziel' }, ende);
        return svg;
    }
    // Alle Regeln einer Grammatik in einen Container
    function zeichneGrammatik(g, ziel, opt) {
        leeren(ziel);
        g.regeln.forEach(function (r) {
            if (opt && opt.nur && opt.nur.indexOf(r.name) < 0) return;
            var box = h('div', { cls: 'sd-regel', 'data-regel': r.name });
            if (r.gesperrt && opt && opt.kompakt) {
                box.classList.add('sd-gegeben');
                box.appendChild(h('span', { cls: 'sd-gegeben-text', text: '🔒 gegeben: ' + r.name + ' = ' + ebnf(r.ausdruck, false) + '.' }));
            } else {
                box.appendChild(h('div', { cls: 'sd-scroll' }, [regelSVG(r, Object.assign({ fehlend: g.fehlend }, opt || {}))]));
            }
            ziel.appendChild(box);
        });
    }
    function markiere(ziel, ids, klasse) {
        Array.prototype.forEach.call(ziel.querySelectorAll('.' + klasse), function (e) { e.classList.remove(klasse); });
        (ids || []).forEach(function (id) {
            Array.prototype.forEach.call(ziel.querySelectorAll('[data-node="' + id + '"]'), function (e) { e.classList.add(klasse); });
        });
    }

    // ---------- Ableitungsbaum (SVG) ----------
    function baumSVG(wurzel, opt) {
        var tiefe = 0;
        (function lauf(k, d) {
            k._d = d; tiefe = Math.max(tiefe, d);
            if (k.t === 'N' && k.kinder && k.kinder.length) k.kinder.forEach(function (c) { lauf(c, d + 1); });
        })(wurzel, 0);
        var breiten = [];
        (function messen(k) {
            k._b = Math.max(k.t === 'N' ? textBreite(k.v, false) * 0.88 + 18 : 30, 34);
            if (k.t === 'N' && k.kinder && k.kinder.length) k.kinder.forEach(messen);
        })(wurzel);
        // Breite jedes Teilbaums: mindestens so breit wie der Knoten selbst
        (function teilbreite(k) {
            if (k.t === 'N' && k.kinder && k.kinder.length) {
                var summe = k.kinder.reduce(function (a, c) { return a + teilbreite(c); }, 0) + 8 * (k.kinder.length - 1);
                k._w = Math.max(k._b, summe);
            } else k._w = k._b;
            return k._w;
        })(wurzel);
        (function setze(k, x0) {
            if (k.t === 'N' && k.kinder && k.kinder.length) {
                var summe = k.kinder.reduce(function (a, c) { return a + c._w; }, 0) + 8 * (k.kinder.length - 1);
                var x = x0 + (k._w - summe) / 2;
                k.kinder.forEach(function (c) { setze(c, x); x += c._w + 8; });
                k._x = (k.kinder[0]._x + k.kinder[k.kinder.length - 1]._x) / 2;
            } else k._x = x0 + k._w / 2;
            breiten.push(k._x + k._b / 2);
        })(wurzel, 8);
        var W = Math.max(wurzel._w + 16, Math.max.apply(null, breiten) + 8), Hh = tiefe * 44 + 34;
        var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: W, height: Hh, 'class': 'baum-svg', role: 'img', 'aria-label': 'Ableitungsbaum' });
        (function kanten(k) {
            if (k.t === 'N' && k.kinder) k.kinder.forEach(function (c) {
                s('line', { x1: k._x, y1: k._d * 44 + 26, x2: c._x, y2: c._d * 44 + 8, 'class': 'baum-kante' }, svg);
                kanten(c);
            });
        })(wurzel);
        (function knoten(k) {
            var y = k._d * 44 + 17;
            var g = s('g', { 'class': 'baum-knoten baum-' + k.t + (k.offen ? ' offen' : '') + (opt && opt.aktuell === k ? ' aktuell' : '') }, svg);
            if (k.t === 'E') s('text', { x: k._x, y: y + 5, 'text-anchor': 'middle', 'class': 'baum-eps' }, g, 'ε');
            else {
                s('rect', { x: k._x - k._b / 2, y: y - 11, width: k._b, height: 22, rx: k.t === 'T' ? 11 : 3 }, g);
                s('text', { x: k._x, y: y + 5, 'text-anchor': 'middle' }, g, k.t === 'T' ? zeigeZ(k.v) : k.v);
            }
            if (k.t === 'N' && k.kinder) k.kinder.forEach(knoten);
        })(wurzel);
        return svg;
    }

    // Grammatiken, die mehrere Werkzeuge benutzen
    var GRAMMATIKEN = {
        smiley: 'Smileyfolge = Smiley {Smiley}.\nSmiley = Augen Mitte Mund.\nAugen = ":" | ";".\nMitte = ["-"].\nMund = ")" | "(" | "D" | "P" | "*".',
        wort: 'Wort = ε | "a" Wort "a" | "n" Wort "n".'
    };
    function grammatikAus(text) {
        var p = parseEBNF(text);
        if (p.fehler) throw new Error(p.fehler);
        return new Grammatik(p.regeln);
    }

    // =====================================================================
    // Statische Diagramme: <div data-diagramm>EBNF</div>
    // =====================================================================
    function diagramm(box) {
        if (box._fertig) return;
        box._fertig = true;
        var text = box.getAttribute('data-ebnf') || box.textContent;
        var p = parseEBNF(text);
        leeren(box);
        box.classList.add('sd-satz');
        if (p.fehler) { box.appendChild(h('p', { cls: 'rueck nein', text: p.fehler })); return; }
        zeichneGrammatik(new Grammatik(p.regeln), box, { fehlend: [] });   // nicht gezeigte Regeln gelten als gegeben
    }

    // =====================================================================
    // Gleisnetz-Fahrt
    // =====================================================================
    var MISSIONEN = {
        smiley: [
            { text: 'die kürzeste Smileyfolge, die es gibt', test: function (w) { return w.length === 2; } },
            { text: 'ein trauriger Smiley mit Nase', test: function (w) { return w === ':-(' || w === ';-('; } },
            { text: 'eine Smileyfolge aus drei Smileys', test: function (w, f) { return f.anzahl.Smiley === 3; } },
            { text: 'eine Smileyfolge mit genau 7 Zeichen', test: function (w) { return w.length === 7; } }
        ],
        wort: [
            { text: 'das kürzeste Wort, das es gibt', test: function (w) { return w === ''; } },
            { text: 'ein Wort der Länge 6', test: function (w) { return w.length === 6; } },
            { text: 'ein Wort, in dem a und n vorkommen', test: function (w) { return /a/.test(w) && /n/.test(w); } },
            { text: 'eine Fahrt, bei der vier Diagramme „Wort“ gleichzeitig offen sind', test: function (w, f) { return f.maxTiefe >= 4; } }
        ]
    };

    function gleisnetz(box) {
        var art = box.getAttribute('data-gleisnetz') || 'smiley';
        var g = grammatikAus(GRAMMATIKEN[art]);
        var mitBaum = box.hasAttribute('data-baum');
        var diagrammeEl = h('div', { cls: 'sd-satz sd-fahrt' });
        var wortEl = h('div', { cls: 'zk', 'aria-live': 'polite' });
        var zielFeld = h('input', { type: 'text', cls: 'mono', maxlength: '20', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Zielwort' });
        var stapelEl = h('p', { cls: 'fahrt-stapel' });
        var wahlEl = h('div', { cls: 'fahrt-wahl', role: 'group', 'aria-label': 'Weiterfahren' });
        var meldung = h('p', { cls: 'fahrt-meldung', 'aria-live': 'polite' });
        var baumEl = h('div', { cls: 'baum-box' });
        var baumSchalter = h('input', { type: 'checkbox' });
        if (mitBaum) baumSchalter.checked = true;
        var zurueck = h('button', { type: 'button', cls: 'knopf', text: '↶ Schritt zurück' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Neue Fahrt' });
        var missionen = MISSIONEN[art] || [];
        var zieleEl = h('ul', { cls: 'ziele' });
        missionen.forEach(function (m) { zieleEl.appendChild(h('li', { text: m.text })); });

        box.appendChild(h('div', { cls: 'fahrt-kopf' }, [
            h('div', {}, [h('span', { cls: 'fahrt-label', text: 'Erzeugtes Wort' }), wortEl]),
            h('label', { cls: 'fahrt-ziel' }, ['Zielwort (freiwillig): ', zielFeld])
        ]));
        box.appendChild(diagrammeEl);
        box.appendChild(stapelEl);
        box.appendChild(wahlEl);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [zurueck, neu, h('label', { cls: 'fahrt-baum-schalter' }, [baumSchalter, ' Ableitungsbaum mitzeichnen'])]));
        box.appendChild(meldung);
        box.appendChild(baumEl);
        if (missionen.length) { box.appendChild(h('h4', { text: 'Fahraufträge' })); box.appendChild(zieleEl); }

        var zustand, verlauf;
        function start() {
            var wurzel = { t: 'N', v: g.start, kinder: [], offen: true };
            zustand = { stapel: [{ regel: g.start, pos: null, baum: wurzel }], wort: '', fertig: false, wurzel: wurzel, besucht: [], anzahl: {}, maxTiefe: 1 };
            zustand.anzahl[g.start] = 1;
            verlauf = [];
            meldung.textContent = ''; meldung.className = 'fahrt-meldung';
            zeige();
        }
        function sichern() { verlauf.push(JSON.stringify(zustand, function (k, v) { return k === 'aktuell' ? undefined : v; })); }
        function baumRef(z) {   // nach dem Wiederherstellen die Baum-Verweise im Stapel neu knüpfen
            var pfad = [z.wurzel];
            z.stapel.forEach(function (f, i) { if (i) { var el = pfad[i - 1]; f.baum = el.kinder[el.kinder.length - 1]; pfad.push(f.baum); } else f.baum = z.wurzel; });
        }
        function moeglich() {
            if (zustand.fertig) return { ids: [], ende: false };
            var f = zustand.stapel[zustand.stapel.length - 1], gl = g.index[f.regel].gl;
            if (f.pos === null) return { ids: gl.erste, ende: gl.leer };
            return { ids: gl.folge[f.pos] || [], ende: gl.letzte.indexOf(f.pos) >= 0 };
        }
        function waehle(id) {
            var k = g.knoten[id].n;
            sichern();
            var f = zustand.stapel[zustand.stapel.length - 1];
            f.pos = id;
            zustand.besucht.push(id);
            if (k.t === 'T') {
                zustand.wort += k.v;
                f.baum.kinder.push({ t: 'T', v: k.v });
            } else {
                var kind = { t: 'N', v: k.v, kinder: [], offen: true };
                f.baum.kinder.push(kind);
                zustand.stapel.push({ regel: k.v, pos: null, baum: kind });
                zustand.anzahl[k.v] = (zustand.anzahl[k.v] || 0) + 1;
                zustand.maxTiefe = Math.max(zustand.maxTiefe, zustand.stapel.filter(function (x) { return x.regel === k.v; }).length);
            }
            zeige();
        }
        function verlasse() {
            sichern();
            var f = zustand.stapel.pop();
            if (!f.baum.kinder.length) f.baum.kinder.push({ t: 'E' });
            f.baum.offen = false;
            if (!zustand.stapel.length) zustand.fertig = true;
            zeige();
        }
        function zeige() {
            var z = zielFeld.value;
            leeren(wortEl);
            if (!zustand.wort.length) wortEl.appendChild(h('span', { cls: 'leer', text: 'ε (noch leer)' }));
            Array.from(zustand.wort).forEach(function (c, i) {
                var sp = h('span', { text: zeigeZ(c) });
                if (z) sp.className = z.charAt(i) === c ? 'passt' : 'passt-nicht';
                wortEl.appendChild(sp);
            });
            zeichneGrammatik(g, diagrammeEl);
            var m = moeglich();
            var top = zustand.stapel[zustand.stapel.length - 1];
            // aktive Diagramme hervorheben, wartende Nichtterminale markieren
            Array.prototype.forEach.call(diagrammeEl.querySelectorAll('.sd-regel'), function (r) {
                var name = r.getAttribute('data-regel');
                r.classList.toggle('aktiv', !!top && top.regel === name);
                r.classList.toggle('offen', zustand.stapel.some(function (f) { return f.regel === name; }) && (!top || top.regel !== name));
            });
            markiere(diagrammeEl, zustand.besucht, 'besucht');
            markiere(diagrammeEl, zustand.stapel.slice(0, -1).map(function (f) { return f.pos; }).filter(Boolean), 'wartet');
            markiere(diagrammeEl, top && top.pos ? [top.pos] : [], 'zug');
            markiere(diagrammeEl, m.ids, 'kandidat');
            m.ids.forEach(function (id) {
                Array.prototype.forEach.call(diagrammeEl.querySelectorAll('.sd-knoten[data-node="' + id + '"]'), function (e) {
                    e.setAttribute('tabindex', '0'); e.setAttribute('role', 'button');
                    e.addEventListener('click', function () { waehle(id); });
                    e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); waehle(id); } });
                });
            });
            if (top && m.ende) {
                var endeEl = diagrammeEl.querySelector('.sd-regel[data-regel="' + top.regel + '"] .sd-ende');
                if (endeEl) { endeEl.classList.add('kandidat'); endeEl.addEventListener('click', verlasse); }
            }
            // Stapel als Pfad
            leeren(stapelEl);
            if (zustand.fertig) stapelEl.appendChild(h('span', { text: '🏁 Fahrt beendet: Das Wort ist fertig.' }));
            else {
                stapelEl.appendChild(h('span', { cls: 'fahrt-label', text: 'Du fährst gerade in: ' }));
                zustand.stapel.forEach(function (f, i) {
                    if (i) stapelEl.appendChild(h('span', { cls: 'fahrt-pfeil', text: ' › ' }));
                    stapelEl.appendChild(h('span', { cls: 'fahrt-ebene' + (i === zustand.stapel.length - 1 ? ' oben' : ''), text: f.regel }));
                });
            }
            // Auswahlknöpfe
            leeren(wahlEl);
            if (!zustand.fertig) {
                wahlEl.appendChild(h('span', { cls: 'fahrt-label', text: m.ids.length || m.ende ? 'Weiter mit (oder im Diagramm klicken): ' : 'Kein Weg führt weiter.' }));
                m.ids.forEach(function (id) {
                    var k = g.knoten[id].n;
                    var b = h('button', { type: 'button', cls: 'fahrt-knopf ' + (k.t === 'T' ? 'ist-t' : 'ist-n'), text: k.t === 'T' ? zeigeZ(k.v) : k.v });
                    b.addEventListener('click', function () { waehle(id); });
                    wahlEl.appendChild(b);
                });
                if (m.ende) {
                    var eb = h('button', { type: 'button', cls: 'fahrt-knopf ist-ende', text: zustand.stapel.length > 1 ? '⏎ Ausgang: zurück nach ' + zustand.stapel[zustand.stapel.length - 2].regel : '🏁 Ausgang: Wort fertig' });
                    eb.addEventListener('click', verlasse);
                    wahlEl.appendChild(eb);
                }
            }
            zurueck.disabled = !verlauf.length;
            // Rückmeldung zum Zielwort und zu den Aufträgen
            meldung.className = 'fahrt-meldung';
            meldung.textContent = '';
            if (z) {
                if (z.indexOf(zustand.wort) !== 0) { meldung.className = 'fahrt-meldung rueck nein'; meldung.textContent = 'Das erzeugte Wort passt nicht mehr zum Zielwort. Geh einen Schritt zurück und nimm einen anderen Weg.'; }
                else if (zustand.fertig && z === zustand.wort) { meldung.className = 'fahrt-meldung rueck ok'; meldung.textContent = 'Geschafft: ' + zeigeWort(z) + ' lässt sich erzeugen.'; }
                else if (zustand.fertig) { meldung.className = 'fahrt-meldung rueck nein'; meldung.textContent = 'Die Fahrt ist zu Ende, das Zielwort aber noch nicht.'; }
            } else if (zustand.fertig) {
                meldung.className = 'fahrt-meldung rueck ok';
                meldung.textContent = 'Fertig: ' + zeigeWort(zustand.wort) + ' (Länge ' + zustand.wort.length + ').';
            }
            if (zustand.fertig) {
                Array.prototype.forEach.call(zieleEl.children, function (li, i) {
                    if (!li.classList.contains('erreicht') && missionen[i].test(zustand.wort, zustand)) {
                        li.classList.add('erreicht');
                        li.appendChild(h('span', { cls: 'beleg', text: 'gefahren: ' + zeigeWort(zustand.wort) }));
                    }
                });
            }
            leeren(baumEl);
            if (baumSchalter.checked) {
                baumEl.appendChild(h('div', { cls: 'fahrt-label', text: 'Ableitungsbaum (offene Nichtterminale gestrichelt)' }));
                baumEl.appendChild(h('div', { cls: 'sd-scroll' }, [baumSVG(zustand.wurzel, { aktuell: top && top.baum })]));
            }
        }
        zurueck.addEventListener('click', function () {
            if (!verlauf.length) return;
            zustand = JSON.parse(verlauf.pop());
            baumRef(zustand);
            zeige();
        });
        neu.addEventListener('click', start);
        zielFeld.addEventListener('input', zeige);
        baumSchalter.addEventListener('change', zeige);
        start();
    }

    // =====================================================================
    // Prüfstand und Testfeld (Baukasten und Werkstatt)
    // =====================================================================
    function testfeld(eltern, holeG, opt) {
        var feld = h('input', { type: 'text', cls: 'mono', autocomplete: 'off', spellcheck: 'false', maxlength: '40', 'aria-label': 'Wort testen' });
        var aus = h('p', { cls: 'test-aus', 'aria-live': 'polite' });
        var baumKnopf = h('button', { type: 'button', cls: 'knopf', text: '🌳 Ableitungsbaum', hidden: '' });
        var baumEl = h('div', { cls: 'baum-box' });
        var bspKnopf = h('button', { type: 'button', cls: 'knopf', text: '🎲 Beispielwörter erzeugen' });
        var bspEl = h('div', { cls: 'beispiele' });
        eltern.appendChild(h('div', { cls: 'testzeile' }, [h('label', {}, ['Wort testen: ', feld]), baumKnopf, bspKnopf]));
        if (opt && opt.hinweis) eltern.appendChild(h('p', { cls: 'hinweiszeile', text: opt.hinweis }));
        eltern.appendChild(aus);
        eltern.appendChild(baumEl);
        eltern.appendChild(bspEl);
        var letzt = null, baumAn = false, benutzt = false;
        function wort() { var w = feld.value; return opt && opt.ohneLeer ? w.replace(/\s+/g, '') : w; }
        function teste() {
            leeren(baumEl);
            var g = holeG();
            if (!g) { aus.className = 'test-aus'; aus.textContent = ''; baumKnopf.hidden = true; return; }
            var w = wort();
            if (feld.value === '' && !(opt && opt.leerTesten && benutzt)) { aus.className = 'test-aus'; aus.textContent = 'Tippe ein Wort ein, das geprüft werden soll.'; baumKnopf.hidden = true; return; }
            var r = pruefeWort(g, w);
            var b = befundText(g, w, r);
            aus.className = 'test-aus rueck ' + b.art;
            aus.textContent = b.text;
            letzt = r;
            baumKnopf.hidden = !(r.ok && r.baum);
            if (baumAn && r.ok && r.baum) zeigeBaum();
        }
        function zeigeBaum() {
            leeren(baumEl);
            if (!letzt || !letzt.baum) return;
            baumEl.appendChild(h('div', { cls: 'sd-scroll' }, [baumSVG(letzt.baum)]));
        }
        feld.addEventListener('input', function () { benutzt = true; teste(); });
        baumKnopf.addEventListener('click', function () { baumAn = !baumAn; if (baumAn) zeigeBaum(); else leeren(baumEl); baumKnopf.classList.toggle('aktiv', baumAn); });
        bspKnopf.addEventListener('click', function () {
            leeren(bspEl);
            var g = holeG();
            if (!g) return;
            var l = beispielWoerter(g, 10);
            if (l === null) { bspEl.appendChild(h('span', { cls: 'hinweiszeile', text: 'Erst alle Regeln ergänzen (' + g.fehlend.join(', ') + ' fehlt).' })); return; }
            if (!l.length) { bspEl.appendChild(h('span', { cls: 'hinweiszeile', text: 'Diese Grammatik erzeugt kein einziges Wort: Jeder Weg ruft eine Regel endlos wieder auf.' })); return; }
            bspEl.appendChild(h('span', { cls: 'hinweiszeile', text: 'Zufällig erzeugt: ' }));
            l.forEach(function (w) {
                var b = h('button', { type: 'button', text: zeigeWort(w) });
                b.addEventListener('click', function () { feld.value = w; teste(); });
                bspEl.appendChild(b);
            });
        });
        return { teste: teste, setze: function (w) { feld.value = w; benutzt = true; teste(); } };
    }

    function pruefstand(eltern, tests, titel) {
        var box = h('div', { cls: 'pruefstand' });
        box.appendChild(h('h5', { text: titel || 'Prüfstand' }));
        var tab = h('table', { cls: 'pruef-tab' });
        var stand = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        box.appendChild(h('div', { cls: 'tab-scroll' }, [tab]));
        box.appendChild(stand);
        eltern.appendChild(box);
        return function aktualisiere(g, ohneLeer, beiKlick) {
            leeren(tab);
            tab.appendChild(h('tr', {}, [h('th', { text: 'Wort' }), h('th', { text: 'soll' }), h('th', { text: 'deine Grammatik' }), h('th', { text: '' })]));
            var gut = 0;
            tests.forEach(function (t) {
                var w = ohneLeer ? t[0].replace(/\s+/g, '') : t[0];
                var ist = g ? pruefeWort(g, w).ok : null;
                var passt = ist === t[1];
                if (passt) gut++;
                var wb = h('button', { type: 'button', cls: 'pruef-wort', text: zeigeWort(t[0]) });
                if (beiKlick) wb.addEventListener('click', function () { beiKlick(t[0]); });
                tab.appendChild(h('tr', { cls: ist === null ? '' : passt ? 'passt' : 'abweichung' }, [
                    h('td', {}, [wb]),
                    h('td', { text: t[1] ? 'gehört dazu' : 'gehört nicht dazu' }),
                    h('td', { text: ist === null ? '–' : ist ? 'gehört dazu' : 'gehört nicht dazu' }),
                    h('td', { text: ist === null ? '' : passt ? '✓' : '✗' })
                ]));
            });
            stand.textContent = !g ? 'Noch keine gültige Grammatik.' : gut + ' von ' + tests.length + ' Wörtern entscheidet deine Grammatik richtig.' +
                (gut === tests.length ? ' Stark! (Der Prüfstand testet nur Stichproben: Überlege selbst, ob es noch Lücken gibt.)' : '');
        };
    }

    // =====================================================================
    // Diagramm-Baukasten (1.3): Diagramme durch Klicken bauen
    // =====================================================================
    var BEREICH = function (von, bis) { var z = []; for (var c = von.charCodeAt(0); c <= bis.charCodeAt(0); c++) z.push(T(String.fromCharCode(c))); return K('alt', z); };
    var BAU_AUFTRAEGE = {
        rgb: {
            titel: 'Aufgabe 3: RGB-Farbcodes',
            regeln: function () { return [{ name: 'RGB-Code', ausdruck: E() }]; },
            tests: [['#9900BB', true], ['#F3BC0D', true], ['#000000', true], ['#9900B', false], ['9900BB', false], ['#9900BBA', false], ['#99 00BB', false], ['#GG0000', false]],
            tests2: { titel: 'Prüfstand zu c): mit Kurzform', tests: [['#F3B', true], ['#FF33BB', true], ['#F3', false], ['#F3BC', false], ['#F3BC0', false]] }
        },
        kennzeichen: {
            titel: 'Aufgabe 4: Autokennzeichen',
            regeln: function () {
                return [{ name: 'Kennzeichen', ausdruck: E() },
                        { name: 'Buchstabe', ausdruck: BEREICH('A', 'Z'), gesperrt: true },
                        { name: 'Ziffer', ausdruck: BEREICH('0', '9'), gesperrt: true },
                        { name: 'ZifferOhneNull', ausdruck: BEREICH('1', '9'), gesperrt: true }];
            },
            tests: [['M-A 1', true], ['BGL-XY 1234', true], ['WÜ-B 7', false], ['AB-CD 905', true], ['MÜNC-H 1', false], ['M-ABC 12', false], ['M- 12', false],
                    ['M-AB 12345', false], ['M-AB 0', false], ['M-AB 1000', true], ['M-AB 0815', false], ['M-AB12', false], ['-AB 12', false]]
        },
        frei: { titel: 'Freies Bauen', regeln: function () { return [{ name: 'Start', ausdruck: E() }]; }, tests: [] }
    };
    function istGesperrt(regeln, name) { return regeln.some(function (r) { return r.name === name && r.gesperrt; }); }

    function baukasten(box) {
        var art = box.getAttribute('data-baukasten') || 'frei';
        var auftrag = BAU_AUFTRAEGE[art];
        var schluessel = 'fs13-bau-' + art;
        var regeln;
        try {
            var gesp = JSON.parse(speicherLesen(schluessel) || 'null');
            regeln = gesp && gesp.length ? gesp.map(function (r) { return { name: r.name, ausdruck: normal(r.ausdruck), gesperrt: r.gesperrt }; }) : auftrag.regeln();
        } catch (e) { regeln = auftrag.regeln(); }
        var g = null, auswahl = null, verlauf = [];

        var diagrammeEl = h('div', { cls: 'sd-satz sd-bau' });
        var infoEl = h('p', { cls: 'bau-auswahl', 'aria-live': 'polite' });
        var eingabe = h('input', { type: 'text', cls: 'mono', maxlength: '24', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Zeichen oder Name' });
        var artWahl = h('div', { cls: 'bau-art', role: 'radiogroup', 'aria-label': 'Art des neuen Felds' });
        [['T', 'rund: Zeichen (Terminal)'], ['N', 'eckig: andere Regel (Nichtterminal)'], ['B', 'Zeichenbereich, z. B. 0-9 oder A-F']].forEach(function (a, i) {
            var r = h('input', { type: 'radio', name: 'bau-art-' + art, value: a[0] });
            if (!i) r.checked = true;
            artWahl.appendChild(h('label', {}, [r, ' ' + a[1]]));
        });
        function knopf(text, titel, f) { var b = h('button', { type: 'button', cls: 'knopf bau-k', text: text, title: titel }); b.addEventListener('click', f); return b; }
        var kDahinter = knopf('＋ dahinter', 'neues Feld hinter der Auswahl (Aneinanderreihung)', function () { einfuegen('nach'); });
        var kDavor = knopf('＋ davor', 'neues Feld vor der Auswahl', function () { einfuegen('vor'); });
        var kAlt = knopf('⑂ als Alternative', 'neues Feld als weiteren Zweig (Alternative)', function () { einfuegen('alt'); });
        var kErsetzen = knopf('✎ ersetzen', 'Auswahl durch das neue Feld ersetzen', function () { einfuegen('ersetzen'); });
        var kOpt = knopf('[ ] Option', 'Auswahl darf auch übersprungen werden', function () { umschliessen('opt'); });
        var kPlus = knopf('⟲ Schleife (mind. 1×)', 'Auswahl kommt einmal oder öfter', function () { umschliessen('plus'); });
        var kRep = knopf('{ } beliebig oft', 'Auswahl kommt keinmal, einmal oder öfter', function () { umschliessen('rep'); });
        var kLoesen = knopf('↺ Baustein auflösen', 'Option/Schleife entfernen, Inhalt behalten', loesen);
        var kGroesser = knopf('⬚ Auswahl erweitern', 'den umgebenden Baustein auswählen', function () { var k = g && g.knoten[auswahl]; if (k && k.eltern) { auswahl = k.eltern.id; zeige(); } });
        var kWeg = knopf('🗑 entfernen', 'Auswahl löschen', entfernen);
        var kRueck = knopf('↶ rückgängig', 'letzte Änderung zurücknehmen', function () { if (verlauf.length) { regeln = JSON.parse(verlauf.pop()).map(function (r) { return { name: r.name, ausdruck: r.ausdruck, gesperrt: r.gesperrt }; }); auswahl = null; aenderung(true); } });
        var regelName = h('input', { type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Name der neuen Regel', placeholder: 'z. B. Farbwert' });
        var kRegel = knopf('＋ neue Regel', 'neues Diagramm anlegen', neueRegel);
        var kReset = knopf('Alles zurücksetzen', 'Ausgangszustand des Auftrags', function () {
            if (!window.confirm('Alle Diagramme dieses Auftrags löschen?')) return;
            merke(); regeln = auftrag.regeln(); auswahl = null; speicherLoeschen(schluessel); aenderung(true);
        });
        var kEbnf = h('details', { cls: 'bau-ebnf' }, [h('summary', { text: 'Als Text (EBNF, kommt in 1.4)' }), h('pre', { cls: 'mono' })]);

        box.appendChild(h('div', { cls: 'bau-werkzeug' }, [
            infoEl,
            h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Neues Feld: ', eingabe]), h('span', { cls: 'hinweiszeile', text: 'Leerzeichen: ␣ oder Leertaste' })]),
            artWahl,
            h('div', { cls: 'knopfzeile' }, [kDahinter, kDavor, kAlt, kErsetzen]),
            h('div', { cls: 'knopfzeile' }, [kOpt, kPlus, kRep, kLoesen, kGroesser, kWeg, kRueck])
        ]));
        box.appendChild(diagrammeEl);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Name: ', regelName]), kRegel, kReset]));
        var testBox = h('div', { cls: 'bau-test' });
        box.appendChild(testBox);
        var tf = testfeld(testBox, function () { return g && g.regeln.length && g.regeln[0].ausdruck.t !== 'E' ? g : null; });
        var ps = auftrag.tests.length ? pruefstand(box, auftrag.tests, 'Prüfstand zu ' + auftrag.titel.split(':')[0]) : null;
        var ps2 = auftrag.tests2 ? pruefstand(box, auftrag.tests2.tests, auftrag.tests2.titel) : null;
        box.appendChild(kEbnf);

        function merke() { verlauf.push(JSON.stringify(regeln.map(function (r) { return { name: r.name, ausdruck: rein(r.ausdruck), gesperrt: r.gesperrt }; }))); if (verlauf.length > 40) verlauf.shift(); }
        function neuesFeld() {
            var v = eingabe.value;
            var a = artWahl.querySelector('input:checked').value;
            if (a === 'T' && v.length && !v.trim()) return T(' ');
            if (!v.trim()) { infoEl.textContent = 'Tippe zuerst ein, was in das neue Feld soll (oben: „Neues Feld“).'; infoEl.className = 'bau-auswahl warn'; eingabe.focus(); return null; }
            if (a === 'N') {
                var name = v.trim().replace(/\s+/g, '');
                if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß_0-9-]*$/.test(name)) { infoEl.textContent = 'Ein Regelname besteht aus Buchstaben (auch Ziffern, - und _), z. B. HexZiffer.'; infoEl.className = 'bau-auswahl warn'; return null; }
                return N(name);
            }
            if (a === 'B') {
                var teile = v.split(/[\s,]+/).filter(Boolean), zweige = [];
                for (var i = 0; i < teile.length; i++) {
                    var m = /^(.)\s*(?:-|…|\.\.\.?)\s*(.)$/.exec(teile[i]);
                    if (!m || m[2].charCodeAt(0) < m[1].charCodeAt(0)) { infoEl.textContent = 'Bereiche so eingeben: 0-9 oder A-F (mehrere mit Leerzeichen: 0-9 A-F).'; infoEl.className = 'bau-auswahl warn'; return null; }
                    zweige = zweige.concat(BEREICH(m[1], m[2]).k);
                }
                return zweige.length === 1 ? zweige[0] : K('alt', zweige);
            }
            return T(v.replace(/␣/g, ' '));
        }
        function ersetze(alt, neu) {
            var k = g.knoten[alt.id];
            if (!k.eltern) { k.regel.ausdruck = neu; return; }
            var i = k.eltern.k.indexOf(alt);
            k.eltern.k[i] = neu;
        }
        function einfuegen(wie) {
            var k = auswahl && g.knoten[auswahl];
            if (!k) { infoEl.textContent = 'Klicke zuerst im Diagramm auf das Feld, an dem du anbauen willst.'; infoEl.className = 'bau-auswahl warn'; return; }
            if (k.regel.gesperrt) return;
            var neu = neuesFeld();
            if (!neu) return;
            merke();
            var n = k.n;
            var istLeer = n.t === 'E' && !k.eltern;
            if (istLeer || wie === 'ersetzen') ersetze(n, neu);
            else if (wie === 'alt') {
                if (k.eltern && k.eltern.t === 'alt') k.eltern.k.splice(k.eltern.k.indexOf(n) + 1, 0, neu);
                else ersetze(n, K('alt', [n, neu]));
            } else {
                if (k.eltern && k.eltern.t === 'seq') k.eltern.k.splice(k.eltern.k.indexOf(n) + (wie === 'nach' ? 1 : 0), 0, neu);
                else ersetze(n, K('seq', wie === 'nach' ? [n, neu] : [neu, n]));
            }
            eingabe.value = '';
            auswahl = '__neu';
            neuMarke = neu;
            aenderung();
        }
        var neuMarke = null;
        function umschliessen(t) {
            var k = auswahl && g.knoten[auswahl];
            if (!k || k.regel.gesperrt) { infoEl.textContent = 'Wähle zuerst ein Feld oder einen Baustein aus.'; infoEl.className = 'bau-auswahl warn'; return; }
            if (k.n.t === 'E') return;
            merke();
            var neu = K(t, [k.n]);
            ersetze(k.n, neu);
            auswahl = '__neu'; neuMarke = neu;
            aenderung();
        }
        function loesen() {
            var k = auswahl && g.knoten[auswahl];
            if (!k || k.regel.gesperrt) return;
            var n = k.n;
            while (n && ['opt', 'rep', 'plus'].indexOf(n.t) < 0) { var e = g.knoten[n.id].eltern; n = e; }
            if (!n) { infoEl.textContent = 'Die Auswahl liegt in keiner Option und keiner Schleife.'; infoEl.className = 'bau-auswahl warn'; return; }
            merke();
            ersetze(n, n.k[0]);
            auswahl = null;
            aenderung();
        }
        function entfernen() {
            var k = auswahl && g.knoten[auswahl];
            if (!k || k.regel.gesperrt) return;
            merke();
            var n = k.n;
            while (true) {
                var kk = g.knoten[n.id];
                if (!kk.eltern) { kk.regel.ausdruck = E(); break; }
                var el = kk.eltern;
                if (el.t === 'seq' || el.t === 'alt') { el.k.splice(el.k.indexOf(n), 1); break; }
                n = el;   // Inhalt einer Option/Schleife weg: der ganze Baustein fällt weg
            }
            auswahl = null;
            aenderung();
        }
        function neueRegel() {
            var name = regelName.value.trim().replace(/\s+/g, '');
            if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß_0-9-]*$/.test(name)) { infoEl.textContent = 'Gib der neuen Regel einen Namen aus Buchstaben, z. B. Farbwert.'; infoEl.className = 'bau-auswahl warn'; regelName.focus(); return; }
            if (regeln.some(function (r) { return r.name === name; })) { infoEl.textContent = 'Eine Regel „' + name + '“ gibt es schon.'; infoEl.className = 'bau-auswahl warn'; return; }
            merke();
            var neu = { name: name, ausdruck: E() };
            var erstGesperrt = regeln.findIndex(function (r) { return r.gesperrt; });
            if (erstGesperrt < 0) regeln.push(neu); else regeln.splice(erstGesperrt, 0, neu);
            regelName.value = '';
            auswahl = '__neu'; neuMarke = neu.ausdruck;
            aenderung();
        }
        function regelLoeschen(name) {
            if (!window.confirm('Diagramm „' + name + '“ löschen?')) return;
            merke();
            regeln = regeln.filter(function (r) { return r.name !== name; });
            auswahl = null;
            aenderung();
        }
        function regelUmbenennen(name) {
            var neu = window.prompt('Neuer Name für „' + name + '“:', name);
            if (!neu) return;
            neu = neu.trim().replace(/\s+/g, '');
            if (!/^[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß_0-9-]*$/.test(neu) || regeln.some(function (r) { return r.name === neu; })) return;
            merke();
            regeln.forEach(function (r) {
                if (r.name === name) r.name = neu;
                (function um(n) { if (n.t === 'N' && n.v === name) n.v = neu; (n.k || []).forEach(um); })(r.ausdruck);
            });
            aenderung();
        }
        function aenderung(ohneMerken) {
            regeln.forEach(function (r) { r.ausdruck = normal(r.ausdruck); });
            if (neuMarke) {   // die neue Auswahl nach dem Normalisieren wiederfinden
                var gefunden = null;
                regeln.forEach(function (r) { (function such(n) { if (n === neuMarke) gefunden = n; (n.k || []).forEach(such); })(r.ausdruck); });
                neuMarke = gefunden;
            }
            speicherSchreiben(schluessel, JSON.stringify(regeln.map(function (r) { return { name: r.name, ausdruck: rein(r.ausdruck), gesperrt: r.gesperrt }; })));
            zeige();
        }
        function zeige() {
            g = new Grammatik(regeln);
            if (auswahl === '__neu') { auswahl = neuMarke && neuMarke.id ? neuMarke.id : null; neuMarke = null; }
            if (auswahl && !g.knoten[auswahl]) auswahl = null;
            zeichneGrammatik(g, diagrammeEl, { platzhalter: true, kompakt: true });
            Array.prototype.forEach.call(diagrammeEl.querySelectorAll('.sd-regel'), function (rb) {
                var name = rb.getAttribute('data-regel');
                if (istGesperrt(regeln, name)) return;
                var kopf = h('div', { cls: 'bau-regelkopf' }, [
                    h('span', { cls: 'hinweiszeile', text: name === regeln[0].name ? 'Startsymbol' : '' })
                ]);
                var um = h('button', { type: 'button', cls: 'mini', text: '✎ Name', title: 'Regel umbenennen' });
                um.addEventListener('click', function () { regelUmbenennen(name); });
                kopf.appendChild(um);
                if (name !== regeln[0].name) {
                    var weg = h('button', { type: 'button', cls: 'mini', text: '🗑 Diagramm', title: 'Regel löschen' });
                    weg.addEventListener('click', function () { regelLoeschen(name); });
                    kopf.appendChild(weg);
                }
                rb.insertBefore(kopf, rb.firstChild);
            });
            Array.prototype.forEach.call(diagrammeEl.querySelectorAll('[data-node]'), function (el) {
                var id = el.getAttribute('data-node');
                if (!id || (g.knoten[id] && g.knoten[id].regel.gesperrt)) return;
                if (el.classList.contains('sd-knoten')) {
                    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
                    el.addEventListener('click', function (ev) { ev.stopPropagation(); auswahl = id; zeige(); });
                    el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); auswahl = id; zeige(); } });
                }
            });
            markiere(diagrammeEl, auswahl ? [auswahl] : [], 'gewaehlt');
            var k = auswahl && g.knoten[auswahl];
            var aktiv = !!k && !k.regel.gesperrt;
            [kDahinter, kDavor, kAlt, kErsetzen, kOpt, kPlus, kRep, kLoesen, kGroesser, kWeg].forEach(function (b) { b.disabled = !aktiv; });
            if (aktiv && k.n.t === 'E') [kOpt, kPlus, kRep, kLoesen, kGroesser, kWeg, kAlt, kDavor].forEach(function (b) { b.disabled = true; });
            kRueck.disabled = !verlauf.length;
            infoEl.className = 'bau-auswahl';
            infoEl.textContent = !k ? 'Klicke im Diagramm auf ein Feld (oder auf „＋ leer“), um dort anzubauen.' :
                'Ausgewählt in „' + k.regel.name + '“: ' + beschreibe(k.n);
            var ok = g.regeln.length && g.regeln[0].ausdruck.t !== 'E';
            if (ps) ps(ok ? g : null, false, function (w) { tf.setze(w); });
            if (ps2) ps2(ok ? g : null, false, function (w) { tf.setze(w); });
            kEbnf.querySelector('pre').textContent = ebnfText(g.regeln.filter(function (r) { return !r.gesperrt; })) +
                (g.regeln.some(function (r) { return r.gesperrt; }) ? '\n(* gegeben *)\n' + ebnfText(g.regeln.filter(function (r) { return r.gesperrt; })) : '');
            tf.teste();
        }
        function beschreibe(n) {
            switch (n.t) {
                case 'T': return 'rundes Feld „' + zeigeZ(n.v) + '“';
                case 'N': return 'eckiges Feld „' + n.v + '“';
                case 'E': return 'leeres Diagramm';
                case 'seq': return 'Aneinanderreihung (' + n.k.length + ' Teile)';
                case 'alt': return 'Alternative (' + n.k.length + ' Zweige)';
                case 'opt': return 'Option';
                case 'rep': return 'Wiederholung (beliebig oft)';
                case 'plus': return 'Schleife (mindestens einmal)';
            }
            return '';
        }
        eingabe.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); einfuegen('nach'); } });
        regelName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); neueRegel(); } });
        zeige();
    }

    // =====================================================================
    // EBNF-Spiegel (1.4): Teile der EBNF und des Diagramms gegenseitig hervorheben
    // =====================================================================
    function ebnfDOM(n, inFolge, eltern) {
        function sp(cls) { var e = h('span', { cls: 'eb ' + (cls || ''), 'data-node': n.id }); eltern.appendChild(e); return e; }
        switch (n.t) {
            case 'T': sp('eb-t').textContent = terminalText(n.v); return;
            case 'N': sp('eb-n').textContent = n.v; return;
            case 'E': sp('eb-e').textContent = 'ε'; return;
            case 'seq':
                var q = sp();
                n.k.forEach(function (x, i) { if (i) q.appendChild(document.createTextNode(' ')); ebnfDOM(x, true, q); });
                return;
            case 'alt':
                var a = sp();
                if (inFolge) a.appendChild(document.createTextNode('('));
                n.k.forEach(function (x, i) { if (i) a.appendChild(h('span', { cls: 'eb-op', text: ' | ' })); ebnfDOM(x, false, a); });
                if (inFolge) a.appendChild(document.createTextNode(')'));
                return;
            case 'opt': case 'rep':
                var o = sp();
                o.appendChild(h('span', { cls: 'eb-op', text: n.t === 'opt' ? '[' : '{' }));
                ebnfDOM(n.k[0], false, o);
                o.appendChild(h('span', { cls: 'eb-op', text: n.t === 'opt' ? ']' : '}' }));
                return;
            case 'plus':
                var p = sp();
                ebnfDOM(n.k[0], true, p);
                p.appendChild(h('span', { cls: 'eb-op', text: ' {' }));
                p.appendChild(h('span', { cls: 'eb-n eb-kopie', text: ebnf(n.k[0], false) }));
                p.appendChild(h('span', { cls: 'eb-op', text: '}' }));
                return;
        }
    }
    function spiegel(box) {
        var g = grammatikAus(GRAMMATIKEN.smiley);
        var textEl = h('div', { cls: 'eb-text mono' });
        var diaEl = h('div', { cls: 'sd-satz' });
        g.regeln.forEach(function (r, i) {
            var z = h('div', { cls: 'eb-zeile' }, [h('span', { cls: 'eb-r', text: 'R' + (i + 1) }), h('span', { cls: 'eb-name', 'data-regel-name': r.name, text: r.name }), document.createTextNode(' = ')]);
            ebnfDOM(r.ausdruck, false, z);
            z.appendChild(document.createTextNode('.'));
            textEl.appendChild(z);
        });
        zeichneGrammatik(g, diaEl);
        var fest = null;
        box.appendChild(h('div', { cls: 'spiegel' }, [textEl, diaEl]));
        var info = h('p', { cls: 'hinweiszeile', text: 'Fahre mit der Maus (oder tippe) auf einen Teil der EBNF oder des Diagramms.' });
        box.appendChild(info);
        function hebe(id) {
            [textEl, diaEl].forEach(function (z) { markiere(z, id ? [id] : [], 'hl'); });
        }
        function binde(el) {
            var id = el.getAttribute('data-node');
            if (!id) return;
            el.addEventListener('mouseover', function (e) { e.stopPropagation(); if (!fest) hebe(id); });
            el.addEventListener('mouseout', function (e) { e.stopPropagation(); if (!fest) hebe(null); });
            el.addEventListener('click', function (e) { e.stopPropagation(); fest = fest === id ? null : id; hebe(fest || id); });
        }
        Array.prototype.forEach.call(box.querySelectorAll('[data-node]'), binde);
        Array.prototype.forEach.call(textEl.querySelectorAll('.eb-name'), function (el) {
            var name = el.getAttribute('data-regel-name');
            el.addEventListener('mouseover', function () { var r = diaEl.querySelector('.sd-regel[data-regel="' + name + '"]'); if (r) r.classList.add('hl-regel'); });
            el.addEventListener('mouseout', function () { var r = diaEl.querySelector('.sd-regel[data-regel="' + name + '"]'); if (r) r.classList.remove('hl-regel'); });
        });
    }

    // =====================================================================
    // Ableitungs-Spiel (1.4)
    // =====================================================================
    // alle aufgelösten rechten Seiten eines Ausdrucks (Wiederholungen bis 4-mal)
    function rechteSeiten(e, max) {
        function kreuz(a, b) { var r = []; a.forEach(function (x) { b.forEach(function (y) { if (r.length < 400) r.push(x.concat(y)); }); }); return r; }
        function f(n) {
            switch (n.t) {
                case 'T': return [[{ t: 'T', v: n.v }]];
                case 'N': return [[{ t: 'N', v: n.v }]];
                case 'E': return [[]];
                case 'seq': return n.k.reduce(function (acc, x) { return kreuz(acc, f(x)); }, [[]]);
                case 'alt': return n.k.reduce(function (acc, x) { return acc.concat(f(x)); }, []);
                case 'opt': return [[]].concat(f(n.k[0]));
                case 'rep': case 'plus':
                    var x = f(n.k[0]), aus = n.t === 'rep' ? [[]] : [], stufe = [[]];
                    for (var i = 1; i <= (n.t === 'rep' ? 3 : 4); i++) { stufe = kreuz(stufe, x); aus = aus.concat(stufe); }
                    return aus;
            }
            return [[]];
        }
        var alle = f(e), gesehen = {}, aus = [];
        alle.forEach(function (sq) { var k = formText(sq); if (!gesehen[k]) { gesehen[k] = true; aus.push(sq); } });
        return aus.slice(0, max || 30);
    }
    function formText(sq) { return sq.length ? sq.map(function (x) { return x.t === 'T' ? terminalText(x.v) : x.v; }).join(' ') : 'ε'; }

    function ableitung(box) {
        var g = grammatikAus(GRAMMATIKEN.smiley);
        var ziel = h('input', { type: 'text', cls: 'mono', value: box.getAttribute('data-ziel') || '', maxlength: '20', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Zielwort' });
        var neu = h('button', { type: 'button', cls: 'knopf', text: 'Neu beginnen' });
        var zurueck = h('button', { type: 'button', cls: 'knopf', text: '↶ Schritt zurück' });
        var liste = h('ol', { cls: 'abl-liste' });
        var wahl = h('div', { cls: 'abl-wahl', 'aria-live': 'polite' });
        var meldung = h('p', { cls: 'abl-meldung', 'aria-live': 'polite' });
        var regelnEl = h('div', { cls: 'abl-regeln mono' });
        g.regeln.forEach(function (r, i) { regelnEl.appendChild(h('div', { text: 'R' + (i + 1) + '  ' + r.name + ' = ' + ebnf(r.ausdruck, false) + '.' })); });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [h('label', {}, ['Zielwort: ', ziel]), neu, zurueck]));
        box.appendChild(regelnEl);
        box.appendChild(liste);
        box.appendChild(wahl);
        box.appendChild(meldung);
        var schritte, gewaehlt;
        function start() { schritte = [{ form: [{ t: 'N', v: g.start }], regel: null }]; gewaehlt = null; zeige(); }
        function nochMoeglich(form) {
            var z = ziel.value;
            if (!z) return true;
            var regeln = [{ name: '__form', ausdruck: form.length ? K('seq', form.map(function (x) { return x.t === 'T' ? T(x.v) : N(x.v); })) : E() }]
                .concat(g.regeln.map(function (r) { return { name: r.name, ausdruck: rein(r.ausdruck) }; }));
            regeln.forEach(function (r) { r.ausdruck = normal(r.ausdruck); });
            return pruefeWort(new Grammatik(regeln), z, '__form').ok;
        }
        function zeige() {
            leeren(liste); leeren(wahl);
            var akt = schritte[schritte.length - 1].form;
            schritte.forEach(function (st, i) {
                var li = h('li', {}, [h('span', { cls: 'abl-pfeil', text: i ? '⇒' + st.regel : '' })]);
                var zeile = h('span', { cls: 'abl-form' });
                if (!st.form.length) zeile.appendChild(h('span', { cls: 'abl-t', text: 'ε' }));
                st.form.forEach(function (x, pos) {
                    if (x.t === 'T') { zeile.appendChild(h('span', { cls: 'abl-t', text: terminalText(x.v) })); return; }
                    var b = h('button', { type: 'button', cls: 'abl-n' + (gewaehlt === pos && i === schritte.length - 1 ? ' gewaehlt' : ''), text: x.v });
                    if (i === schritte.length - 1) b.addEventListener('click', function () { gewaehlt = pos; zeige(); });
                    else b.disabled = true;
                    zeile.appendChild(b);
                });
                li.appendChild(zeile);
                liste.appendChild(li);
            });
            var hatN = akt.some(function (x) { return x.t === 'N'; });
            zurueck.disabled = schritte.length < 2;
            meldung.className = 'abl-meldung'; meldung.textContent = '';
            if (!hatN) {
                var w = akt.map(function (x) { return x.v; }).join('');
                meldung.className = 'abl-meldung rueck ' + (!ziel.value || w === ziel.value ? 'ok' : 'nein');
                meldung.textContent = 'Nur noch Terminale: Abgeleitet ist ' + zeigeWort(w) + '.' + (ziel.value ? (w === ziel.value ? ' Das ist dein Zielwort. 🎉' : ' Das ist nicht das Zielwort.') : '');
                return;
            }
            if (!nochMoeglich(akt)) {
                meldung.className = 'abl-meldung rueck nein';
                meldung.textContent = 'Aus dieser Zeile kann das Zielwort nicht mehr entstehen. Geh einen Schritt zurück.';
            }
            if (gewaehlt === null) {
                wahl.appendChild(h('p', { cls: 'hinweiszeile', text: 'Klicke in der letzten Zeile auf ein Nichtterminal, das ersetzt werden soll.' }));
                return;
            }
            var name = akt[gewaehlt].v, r = g.index[name], nr = g.regeln.indexOf(r) + 1;
            wahl.appendChild(h('p', { cls: 'hinweiszeile', text: 'Ersetze ' + name + ' nach R' + nr + ' durch:' }));
            var knoepfe = h('div', { cls: 'knopfzeile' });
            rechteSeiten(r.ausdruck).forEach(function (sq) {
                var b = h('button', { type: 'button', cls: 'abl-wahl-knopf mono', text: formText(sq) });
                b.addEventListener('click', function () {
                    var form = akt.slice(0, gewaehlt).concat(sq.map(function (x) { return { t: x.t, v: x.v }; })).concat(akt.slice(gewaehlt + 1));
                    schritte.push({ form: form, regel: 'R' + nr });
                    gewaehlt = null;
                    zeige();
                });
                knoepfe.appendChild(b);
            });
            wahl.appendChild(knoepfe);
        }
        neu.addEventListener('click', start);
        zurueck.addEventListener('click', function () { if (schritte.length > 1) { schritte.pop(); gewaehlt = null; zeige(); } });
        ziel.addEventListener('input', zeige);
        start();
    }

    // =====================================================================
    // Grammatik-Werkstatt (1.4): EBNF tippen, Diagramme sehen, Wörter testen
    // =====================================================================
    var WERK_AUFTRAEGE = {
        geld: {
            text: '(* Aufgabe 3: Übersetze die Diagramme vom Blatt in EBNF.\n   Gegeben ist nur ZifferOhneNull. *)\nGeldbetrag = .\n\nZifferOhneNull = "1" | … | "9".',
            tests: [['12€', true], ['5,15€', true], ['0,79€', true], ['0€', true], ['100€', true], ['0,00€', true], ['02,99€', false], ['5,1€', false], ['5,150€', false], [',50€', false], ['12', false], ['00,50€', false], ['1.000€', false]]
        },
        molkerei: {
            text: '(* Aufgabe 4: Molkereinummern. Leerzeichen im Testwort werden ignoriert. *)\n' +
                  'Molkereinummer = "DE" Bundesland Betriebsnummer [Europa].\n' +
                  'Bundesland = "BB" | "BE" | "BW" | "BY" | "HB" | "HE" | "HH" | "MV" | "NI" | "NW" | "RP" | "SH" | "SL" | "SN" | "ST" | "TH".\n' +
                  'Betriebsnummer = Ziffer Ziffer Ziffer | Ziffer Ziffer Ziffer Ziffer Ziffer.\n' +
                  'Europa = "EG" | "EU".\n' +
                  'Ziffer = "0" | … | "9".',
            ohneLeer: true,
            titel: 'Prüfstand zu c): Bayern nur mit Regierungsbezirk 1 bis 7',
            tests: [['DE BY 70123 EU', true], ['DE BY 512', true], ['DE BY 82123', false], ['DE BY 012', false], ['DE BY 9', false], ['DE NW 82123', true], ['DE HE 012 EG', true], ['DE BY 1234', false], ['DE BY 12345 EX', false], ['DEBY61000', true]]
        },
        uhrzeit: {
            text: '(* Aufgabe 5: Uhrzeiten hh:mm oder hh:mm:ss von 00:00 bis 23:59:59 *)\nUhrzeit = .',
            tests: [['00:00', true], ['23:59', true], ['23:59:59', true], ['09:05:00', true], ['20:15', true], ['19:09', true], ['24:30', false], ['18:61', false], ['08:15:60', false], ['7:30', false], ['12:3', false], ['12:30:', false], ['1230', false], ['30:00', false]]
        },
        terme: {
            text: '(* Aufgabe 6: Terme aus 1.1 *)\nTerm = Summand {"+" Summand}.\nSummand = "x" | Funktion "(" Term ")".\nFunktion = "sin" | "cos" | "sqrt".',
            titel: 'Prüfstand zu d): Klammern auch ohne Funktion',
            tests: [['(x+x)', true], ['x+(x)', true], ['((x))', true], ['sin((x))', true], ['x', true], ['()', false], ['(x+)', false], ['cos(x)(x)', false], ['sin x', false], ['x+x+', false]]
        },
        frei: { text: '(* Deine eigene Grammatik. Die erste Regel ist das Startsymbol. *)\nStart = "a" {"b"}.', tests: [] }
    };

    function werkstatt(box) {
        var art = box.getAttribute('data-werkstatt') || 'frei';
        var auftrag = WERK_AUFTRAEGE[art];
        var schluessel = 'fs13-werk-' + art;
        var feld = h('textarea', { cls: 'mono werk-text', rows: String(Math.max(6, auftrag.text.split('\n').length + 2)), spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Grammatik in EBNF' });
        feld.value = speicherLesen(schluessel) || auftrag.text;
        var status = h('p', { cls: 'werk-status', 'aria-live': 'polite' });
        var dia = h('div', { cls: 'sd-satz' });
        var reset = h('button', { type: 'button', cls: 'knopf', text: 'Auftrag zurücksetzen' });
        var laden = h('button', { type: 'button', cls: 'knopf', text: 'Meine Diagramme aus 1.3 laden', hidden: '' });
        var zeichenhilfe = h('div', { cls: 'werk-tasten', role: 'group', 'aria-label': 'Zeichen einfügen' });
        ['=', '|', '.', '"', '( )', '[ ]', '{ }', 'ε', '…'].forEach(function (z) {
            var b = h('button', { type: 'button', text: z });
            b.addEventListener('click', function () {
                var a = feld.selectionStart, e = feld.selectionEnd, v = feld.value;
                var ein = z.length === 3 ? z.charAt(0) + v.slice(a, e) + z.charAt(2) : (z === '"' ? '""' : z);
                feld.value = v.slice(0, a) + ein + v.slice(e);
                feld.focus();
                var pos = a + (z.length === 3 ? 1 + (e - a) : z === '"' ? 1 : ein.length);
                feld.setSelectionRange(pos, pos);
                aktualisiere();
            });
            zeichenhilfe.appendChild(b);
        });
        box.appendChild(h('div', { cls: 'werk-oben' }, [
            h('div', {}, [h('label', { cls: 'fahrt-label', text: 'Grammatik (EBNF)' }), feld, zeichenhilfe, h('div', { cls: 'knopfzeile' }, [reset, laden]), status]),
            h('div', {}, [h('span', { cls: 'fahrt-label', text: 'So sieht sie als Syntaxdiagramm aus' }), dia])
        ]));
        var g = null;
        var tf = testfeld(box, function () { return g; }, { ohneLeer: auftrag.ohneLeer, leerTesten: true,
            hinweis: auftrag.ohneLeer ? 'Leerzeichen im Testwort werden hier ignoriert (sie dienen nur der Lesbarkeit).' : 'Ein leeres Testfeld steht für das leere Wort ε.' });
        var ps = auftrag.tests.length ? pruefstand(box, auftrag.tests, auftrag.titel || 'Prüfstand') : null;
        var timer = null;
        function aktualisiere() {
            speicherSchreiben(schluessel, feld.value);
            var p = parseEBNF(feld.value);
            if (p.fehler && feld.value === auftrag.text) {
                g = null;
                status.className = 'werk-status rueck neutral';
                status.textContent = 'Hier fehlt noch deine Grammatik: Ergänze die Regeln nach dem Gleichheitszeichen.';
            } else if (p.fehler) {
                g = null;
                status.className = 'werk-status rueck nein';
                status.textContent = '✗ ' + p.fehler;
            } else {
                g = new Grammatik(p.regeln);
                var warn = [];
                if (g.fehlend.length) warn.push('Zu ' + g.fehlend.map(function (x) { return '„' + x + '“'; }).join(', ') + ' gibt es noch keine Regel (Tippfehler? Groß-/Kleinschreibung?).');
                var benutzt = {};
                g.regeln.forEach(function (r) { (function l(n) { if (n.t === 'N') benutzt[n.v] = true; (n.k || []).forEach(l); })(r.ausdruck); });
                var unbenutzt = g.regeln.slice(1).filter(function (r) { return !benutzt[r.name]; }).map(function (r) { return r.name; });
                if (unbenutzt.length) warn.push('Die Regel ' + unbenutzt.join(', ') + ' wird nirgends benutzt.');
                status.className = 'werk-status rueck ' + (warn.length ? 'neutral' : 'ok');
                status.textContent = (warn.length ? '⚠ ' + warn.join(' ') : '✓ Die Grammatik ist syntaktisch korrekt.') + ' Startsymbol: ' + g.start + '.';
                zeichneGrammatik(g, dia);
            }
            if (!g) leeren(dia);
            if (ps) ps(g && !g.fehlend.length ? g : null, auftrag.ohneLeer, function (w) { tf.setze(w); });
            tf.teste();
        }
        feld.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(aktualisiere, 250); });
        reset.addEventListener('click', function () {
            if (feld.value !== auftrag.text && !window.confirm('Deine Grammatik durch den Ausgangstext ersetzen?')) return;
            feld.value = auftrag.text; speicherLoeschen(schluessel); aktualisiere();
        });
        if (art === 'frei') {
            var vorhanden = ['rgb', 'kennzeichen'].filter(function (k) { return speicherLesen('fs13-bau-' + k); });
            if (vorhanden.length) {
                laden.hidden = false;
                laden.addEventListener('click', function () {
                    var texte = vorhanden.map(function (k) {
                        try {
                            var r = JSON.parse(speicherLesen('fs13-bau-' + k));
                            return '(* aus dem Baukasten: ' + BAU_AUFTRAEGE[k].titel + ' *)\n' + ebnfText(r.map(function (x) { return { name: x.name, ausdruck: normal(x.ausdruck) }; }).filter(function (x) { return x.ausdruck.t !== 'E'; }));
                        } catch (e) { return ''; }
                    });
                    feld.value = texte.join('\n\n');
                    aktualisiere();
                });
            }
        }
        aktualisiere();
    }

    // Diagramme in später eingeblendeten Lösungen (Lösungsweg) zeichnen
    document.addEventListener('fs-eingeblendet', function (e) {
        if (e.detail && e.detail.querySelectorAll) Array.prototype.forEach.call(e.detail.querySelectorAll('[data-diagramm]'), diagramm);
    });

    function sicher(f) { return function (el) { try { f(el); } catch (err) { el.appendChild(h('p', { cls: 'rueck nein', text: 'Werkzeug konnte nicht starten: ' + err.message })); } }; }
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-diagramm]').forEach(sicher(diagramm));
        document.querySelectorAll('[data-gleisnetz]').forEach(sicher(gleisnetz));
        document.querySelectorAll('[data-baukasten]').forEach(sicher(baukasten));
        document.querySelectorAll('[data-ebnf-spiegel]').forEach(sicher(spiegel));
        document.querySelectorAll('[data-ableitung]').forEach(sicher(ableitung));
        document.querySelectorAll('[data-werkstatt]').forEach(sicher(werkstatt));
    });

    // für Tests in der Konsole
    window.FSGrammatik = { parseEBNF: parseEBNF, Grammatik: Grammatik, pruefeWort: pruefeWort, ebnfText: ebnfText, beispielWoerter: beispielWoerter };
})();
