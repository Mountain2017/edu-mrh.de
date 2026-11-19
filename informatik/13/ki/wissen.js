/*
 * KI Stationen W1 bis W3 (eA) – wissensbasierte Systeme: kleiner Interpreter in Prolog-Schreibweise (braucht ki.js)
 *
 *   <div data-wissen="id" [data-hoehe="12"]>
 *       <script type="text/plain" data-art="basis"> Fakten und Regeln </script>
 *       <script type="text/plain" data-art="anfragen"> ?- anfrage(X).  (je Zeile eine Beispielanfrage, als Knöpfe) </script>
 *   </div>
 *   Wissensbasis ist bearbeitbar (localStorage 'kiWissen:<id>'). Anfrage stellen → alle Antworten;
 *   „Ableitung zeigen“ → Protokoll der Inferenzmaschine (Ziel, Klausel, Unifikation, Fehlschlag, Backtracking), auch Schritt für Schritt.
 *
 * Sprache: Fakten  name(arg, …).   Regeln  kopf(X) :- ziel1(X), ziel2(X, Y).   Kommentar ab %
 *   Atome klein (pia, adelie, 3), Variablen groß oder mit _ (X, Kind, _). Eingebaut: X = Y, X \= Y, \+ ziel, true, fail.
 *   Suche wie Prolog: Ziele von links nach rechts, Klauseln von oben nach unten, Tiefensuche mit Backtracking.
 *   Abbruch nach 200 000 Schritten oder Tiefe 400 (endlose Rekursion).
 */
(function () {
    'use strict';
    var h = KI.h;

    // ---------- Terme ----------
    function atom(n) { return { t: 'a', n: n }; }
    function vari(n, id) { return { t: 'v', n: n, id: id || 0 }; }
    function str(n, a) { return { t: 's', n: n, a: a }; }

    // ---------- Zerlegen (Tokenizer und Parser) ----------
    function tokens(text) {
        var out = [], re = /\s+|%[^\n]*|(:-|\?-|\\=|\\\+|[(),.=])|([a-z][A-Za-z0-9_äöüß]*|[0-9]+)|([A-Z_][A-Za-z0-9_äöüß]*)|('[^']*')|(\S)/g, m, zeile = 1, pos = 0;
        while ((m = re.exec(text))) {
            zeile += (text.slice(pos, m.index).match(/\n/g) || []).length; pos = m.index;
            if (m[1]) out.push({ k: 'sym', v: m[1], z: zeile });
            else if (m[2]) out.push({ k: 'atom', v: m[2], z: zeile });
            else if (m[3]) out.push({ k: 'var', v: m[3], z: zeile });
            else if (m[4]) out.push({ k: 'atom', v: m[4].slice(1, -1), z: zeile });
            else if (m[5]) throw new Error('Zeile ' + zeile + ': unbekanntes Zeichen „' + m[5] + '“');
        }
        return out;
    }
    function Parser(text) { this.t = tokens(text); this.i = 0; this.vars = {}; this.anon = 0; }
    Parser.prototype.sieh = function () { return this.t[this.i]; };
    Parser.prototype.nimm = function (v) {
        var t = this.t[this.i];
        if (!t) throw new Error('Unerwartetes Ende' + (v ? ': „' + v + '“ fehlt' : '') + '. Endet jede Klausel mit einem Punkt?');
        if (v && t.v !== v) throw new Error('Zeile ' + t.z + ': „' + v + '“ erwartet, gefunden „' + t.v + '“');
        this.i++; return t;
    };
    Parser.prototype.term = function () {
        var t = this.nimm();
        if (t.k === 'var') {
            if (t.v === '_') return vari('_' + (++this.anon));
            return this.vars[t.v] || (this.vars[t.v] = vari(t.v));
        }
        if (t.k === 'atom') {
            if (this.sieh() && this.sieh().v === '(') {
                this.nimm('(');
                var args = [this.term()];
                while (this.sieh() && this.sieh().v === ',') { this.nimm(','); args.push(this.term()); }
                this.nimm(')');
                return str(t.v, args);
            }
            return atom(t.v);
        }
        throw new Error('Zeile ' + t.z + ': Hier wird ein Name oder eine Variable erwartet, gefunden „' + t.v + '“');
    };
    Parser.prototype.ziel = function () {
        var s = this.sieh();
        if (s && s.v === '\\+') { this.nimm(); return str('\\+', [this.ziel()]); }
        var a = this.term(), op = this.sieh();
        if (op && (op.v === '=' || op.v === '\\=')) { this.nimm(); return str(op.v, [a, this.term()]); }
        if (a.t === 'v') throw new Error('Zeile ' + (s ? s.z : '?') + ': Ein Ziel darf keine Variable sein.');
        return a;
    };
    Parser.prototype.ziele = function () {
        var g = [this.ziel()];
        while (this.sieh() && this.sieh().v === ',') { this.nimm(','); g.push(this.ziel()); }
        return g;
    };
    function parseBasis(text) {
        var p = new Parser(text), klauseln = [];
        while (p.sieh()) {
            p.vars = {};
            var z = p.sieh().z, kopf = p.term(), koerper = [];
            if (kopf.t === 'v') throw new Error('Zeile ' + z + ': Eine Klausel darf nicht mit einer Variablen beginnen.');
            if (p.sieh() && p.sieh().v === ':-') { p.nimm(':-'); koerper = p.ziele(); }
            p.nimm('.');
            klauseln.push({ kopf: kopf, koerper: koerper, zeile: z, nr: klauseln.length + 1 });
        }
        return klauseln;
    }
    function parseAnfrage(text) {
        var t = text.trim().replace(/^\?-\s*/, '');
        if (!/\.\s*$/.test(t)) t += '.';
        var p = new Parser(t), g = p.ziele();
        p.nimm('.');
        return { ziele: g, vars: p.vars };
    }

    // ---------- Unifikation ----------
    function auf(t, s) { while (t.t === 'v') { var k = t.n + '#' + t.id; if (!(k in s)) return t; t = s[k]; } return t; }
    function voll(t, s) { t = auf(t, s); return t.t === 's' ? str(t.n, t.a.map(function (x) { return voll(x, s); })) : t; }
    function unify(a, b, s) {
        a = auf(a, s); b = auf(b, s);
        if (a.t === 'v' && b.t === 'v' && a.n === b.n && a.id === b.id) return s;
        if (a.t === 'v') { var s1 = Object.assign({}, s); s1[a.n + '#' + a.id] = b; return s1; }
        if (b.t === 'v') { var s2 = Object.assign({}, s); s2[b.n + '#' + b.id] = a; return s2; }
        if (a.t === 'a' && b.t === 'a') return a.n === b.n ? s : null;
        if (a.t === 's' && b.t === 's' && a.n === b.n && a.a.length === b.a.length) {
            for (var i = 0; i < a.a.length; i++) { s = unify(a.a[i], b.a[i], s); if (!s) return null; }
            return s;
        }
        return null;
    }
    function umbenennen(t, id) { return t.t === 'v' ? vari(t.n, id) : t.t === 's' ? str(t.n, t.a.map(function (x) { return umbenennen(x, id); })) : t; }
    function zeig(t) {
        if (t.t === 'a') return /^[a-z0-9]/.test(t.n) || t.n === '[]' ? t.n : "'" + t.n + "'";
        if (t.t === 'v') return t.id ? t.n + '_' + t.id : t.n;
        if (t.n === '=' || t.n === '\\=') return zeig(t.a[0]) + ' ' + t.n + ' ' + zeig(t.a[1]);
        if (t.n === '\\+') return '\\+ ' + zeig(t.a[0]);
        return t.n + '(' + t.a.map(zeig).join(', ') + ')';
    }
    function klauselText(k) { return zeig(k.kopf) + (k.koerper.length ? ' :- ' + k.koerper.map(zeig).join(', ') : '') + '.'; }

    // ---------- Inferenzmaschine (Tiefensuche mit Backtracking) ----------
    function Maschine(klauseln, protokoll) { this.k = klauseln; this.prot = protokoll; this.schritte = 0; this.zaehler = 0; this.abbruch = null; }
    Maschine.prototype.log = function (e) { if (this.prot) this.prot.push(e); };
    Maschine.prototype.loese = function* (ziele, s, tiefe) {
        if (this.abbruch) return;
        if (!ziele.length) { yield s; return; }
        if (++this.schritte > 200000) { this.abbruch = 'Abbruch nach 200 000 Schritten. Läuft die Suche endlos (z. B. eine Regel, die sich zuerst selbst aufruft)?'; return; }
        if (tiefe > 400) { this.abbruch = 'Abbruch: Tiefe 400 erreicht. Wahrscheinlich ruft sich eine Regel endlos selbst auf.'; return; }
        var g = auf(ziele[0], s), rest = ziele.slice(1);
        this.log({ art: 'ziel', tiefe: tiefe, text: zeig(voll(g, s)) });
        if (g.t === 'a' && g.n === 'true') { yield* this.loese(rest, s, tiefe); return; }
        if (g.t === 'a' && g.n === 'fail') { this.log({ art: 'nein', tiefe: tiefe, text: 'fail schlägt immer fehl' }); return; }
        if (g.t === 's' && g.n === '=') {
            var u = unify(g.a[0], g.a[1], s);
            if (u) { this.log({ art: 'ja', tiefe: tiefe, text: 'gleich gemacht: ' + zeig(voll(g.a[0], u)) }); yield* this.loese(rest, u, tiefe); }
            else this.log({ art: 'nein', tiefe: tiefe, text: 'nicht gleich zu machen' });
            return;
        }
        if (g.t === 's' && g.n === '\\=') {
            if (unify(g.a[0], g.a[1], s)) { this.log({ art: 'nein', tiefe: tiefe, text: 'sind gleich, also falsch' }); return; }
            this.log({ art: 'ja', tiefe: tiefe, text: 'verschieden' }); yield* this.loese(rest, s, tiefe); return;
        }
        if (g.t === 's' && g.n === '\\+') {
            var unter = new Maschine(this.k, null), it = unter.loese([g.a[0]], s, tiefe + 1), r = it.next();
            this.schritte += unter.schritte;
            if (r.done) { this.log({ art: 'ja', tiefe: tiefe, text: 'nicht beweisbar, also ist \\+ wahr' }); yield* this.loese(rest, s, tiefe); }
            else this.log({ art: 'nein', tiefe: tiefe, text: 'beweisbar, also ist \\+ falsch' });
            return;
        }
        var name = g.t === 's' ? g.n : g.n, stellen = g.t === 's' ? g.a.length : 0, passend = 0;
        for (var i = 0; i < this.k.length; i++) {
            var kl = this.k[i], kn = kl.kopf.t === 's' ? kl.kopf.n : kl.kopf.n, ks = kl.kopf.t === 's' ? kl.kopf.a.length : 0;
            if (kn !== name || ks !== stellen) continue;
            passend++;
            var id = ++this.zaehler, kopf = umbenennen(kl.kopf, id), s2 = unify(g, kopf, s);
            if (!s2) { this.log({ art: 'nein', tiefe: tiefe, text: 'Klausel ' + kl.nr + ' passt nicht: ' + klauselText(kl) }); continue; }
            var neu = []; Object.keys(s2).forEach(function (k) { if (!(k in s)) neu.push(k.replace('#0', '').replace('#', '_') + ' = ' + zeig(voll(s2[k], s2))); });
            this.log({ art: 'klausel', tiefe: tiefe, text: 'Klausel ' + kl.nr + ': ' + klauselText(kl) + (neu.length ? '   →  ' + neu.join(', ') : '') });
            var koerper = kl.koerper.map(function (z) { return umbenennen(z, id); });
            yield* this.loese(koerper.concat(rest), s2, tiefe + 1);
            if (this.abbruch) return;
            this.log({ art: 'zurueck', tiefe: tiefe, text: 'zurück (Backtracking): nächste Möglichkeit für ' + zeig(voll(g, s)) });
        }
        if (!passend) this.log({ art: 'nein', tiefe: tiefe, text: 'keine Klausel für ' + name + '/' + stellen + ' – gilt als falsch (geschlossene Welt)' });
    };

    // ---------- Werkzeug ----------
    function werkstatt(box) {
        var id = box.getAttribute('data-wissen');
        var basisSkript = box.querySelector('script[data-art="basis"]'), anfrageSkript = box.querySelector('script[data-art="anfragen"]');
        var orig = (basisSkript ? basisSkript.textContent : '').replace(/^\s*\n/, '').replace(/\s+$/, '') + '\n';
        var beispiele = (anfrageSkript ? anfrageSkript.textContent : '').split('\n').map(function (z) { return z.trim(); }).filter(Boolean);
        box.textContent = '';
        box.classList.add('werk', 'wissen');
        box.appendChild(h('h4', { text: 'Wissensbasis' }));
        var ta = h('textarea', { cls: 'wissen-basis', spellcheck: 'false', 'aria-label': 'Wissensbasis: Fakten und Regeln' });
        var gespeichert = KI.speicher.lies('kiWissen:' + id, null);
        ta.value = typeof gespeichert === 'string' ? gespeichert : orig;
        ta.rows = Math.min(24, Math.max(+(box.getAttribute('data-hoehe') || 8), ta.value.split('\n').length + 1));
        var zurueck = h('button', { type: 'button', cls: 'mini', text: 'Wissensbasis zurücksetzen' });
        box.appendChild(ta);
        box.appendChild(h('div', { cls: 'knopfzeile' }, [zurueck]));
        var eingabe = h('input', { type: 'text', cls: 'wissen-anfrage', 'aria-label': 'Anfrage', value: beispiele[0] || '?- ' });
        var bFrage = h('button', { type: 'button', cls: 'knopf voll', text: 'Anfrage stellen' });
        var bAbl = h('button', { type: 'button', cls: 'knopf', text: 'Ableitung zeigen' });
        var bSchritt = h('button', { type: 'button', cls: 'knopf', text: 'Schritt für Schritt' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [eingabe, bFrage, bAbl, bSchritt]));
        if (beispiele.length > 1) {
            var bz = h('div', { cls: 'knopfzeile' }, [h('span', { style: 'font-size:.85rem;color:var(--gray)', text: 'Beispiele:' })]);
            beispiele.forEach(function (b) { var k = h('button', { type: 'button', cls: 'mini', text: b }); k.addEventListener('click', function () { eingabe.value = b; frage(); }); bz.appendChild(k); });
            box.appendChild(bz);
        }
        var antwort = h('div', { cls: 'anzeige', 'aria-live': 'polite' });
        var protokoll = h('ol', { cls: 'wissen-protokoll' });
        box.appendChild(antwort); box.appendChild(protokoll);
        var schrittListe = null, schrittNr = 0;
        function laden() {
            try { return parseBasis(ta.value); } catch (e) { antwort.textContent = 'Fehler in der Wissensbasis: ' + e.message; antwort.classList.add('fehler'); return null; }
        }
        function stelle(mitProtokoll) {
            antwort.classList.remove('fehler'); protokoll.textContent = ''; schrittListe = null;
            var kl = laden(); if (!kl) return null;
            var a;
            try { a = parseAnfrage(eingabe.value); } catch (e) { antwort.textContent = 'Fehler in der Anfrage: ' + e.message; antwort.classList.add('fehler'); return null; }
            var prot = mitProtokoll ? [] : null, m = new Maschine(kl, prot), loesungen = [], it = m.loese(a.ziele, {}, 0), namen = Object.keys(a.vars);
            for (var r = it.next(); !r.done; r = it.next()) {
                var s = r.value;
                loesungen.push(namen.length ? namen.map(function (n) { return n + ' = ' + zeig(voll(a.vars[n], s)); }).join(', ') : 'ja');
                if (prot) prot.push({ art: 'loesung', tiefe: 0, text: 'Antwort ' + loesungen.length + ': ' + loesungen[loesungen.length - 1] });
                if (loesungen.length >= 60) break;
            }
            var text = loesungen.length ? (namen.length ? loesungen.length + ' Antwort' + (loesungen.length > 1 ? 'en' : '') + ':\n' + loesungen.join('\n') : 'ja (wahr)') : (namen.length ? 'keine Antwort (false)' : 'nein (false)');
            if (m.abbruch) text += '\n⚠ ' + m.abbruch;
            antwort.textContent = text + '\n(' + m.schritte + ' Schritte der Inferenzmaschine)';
            return prot;
        }
        function frage() { stelle(false); }
        function zeigeProtokoll(liste, bis) {
            protokoll.textContent = '';
            liste.slice(0, bis).forEach(function (e) {
                var sym = { ziel: '?', klausel: '→', ja: '✓', nein: '✗', zurueck: '↩', loesung: '★' }[e.art];
                var li = h('li', { cls: 'wp-' + e.art, style: 'margin-left:' + Math.min(e.tiefe, 20) * 1.1 + 'rem' }, [h('span', { cls: 'wp-sym', text: sym }), document.createTextNode(' ' + e.text)]);
                protokoll.appendChild(li);
            });
            if (liste.length > 600 && bis >= 600) protokoll.appendChild(h('li', { text: '… (' + (liste.length - 600) + ' weitere Einträge)' }));
        }
        bFrage.addEventListener('click', frage);
        eingabe.addEventListener('keydown', function (e) { if (e.key === 'Enter') frage(); });
        bAbl.addEventListener('click', function () { var p = stelle(true); if (p) zeigeProtokoll(p, Math.min(p.length, 600)); });
        bSchritt.addEventListener('click', function () {
            if (!schrittListe) { var p = stelle(true); if (!p) return; schrittListe = p; schrittNr = 0; }
            schrittNr = Math.min(schrittListe.length, schrittNr + 1);
            zeigeProtokoll(schrittListe, schrittNr);
            bSchritt.textContent = schrittNr < schrittListe.length ? 'nächster Schritt (' + schrittNr + '/' + schrittListe.length + ')' : 'fertig – noch einmal';
            if (schrittNr >= schrittListe.length) { schrittListe = null; }
        });
        ta.addEventListener('input', function () { KI.speicher.schreib('kiWissen:' + id, ta.value === orig ? null : ta.value); schrittListe = null; bSchritt.textContent = 'Schritt für Schritt'; });
        eingabe.addEventListener('input', function () { schrittListe = null; bSchritt.textContent = 'Schritt für Schritt'; });
        zurueck.addEventListener('click', function () { if (confirm('Wissensbasis auf den Anfang zurücksetzen?')) { ta.value = orig; KI.speicher.schreib('kiWissen:' + id, null); } });
    }

    KI.wissen = { parseBasis: parseBasis, parseAnfrage: parseAnfrage, Maschine: Maschine, zeig: zeig, voll: voll };
    document.addEventListener('DOMContentLoaded', function () { document.querySelectorAll('[data-wissen]').forEach(werkstatt); });
})();
