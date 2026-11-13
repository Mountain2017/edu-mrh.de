/*
 * Registermaschine – Simulator für Informatik 13, „Funktionsweise eines Rechners“
 *
 * Markup (beliebig oft pro Seite):
 *   <div class="rm" data-rm="<id>"                 id: Schlüssel für den gespeicherten Stand (localStorage)
 *        data-titel="…"                             Überschrift (optional)
 *        data-zellen="100-105"                      angezeigte Datenzellen (Standard 100-107; benutzte Zellen kommen dazu)
 *        data-speicher="100:7,101:5"                Startwerte der Datenzellen
 *        data-ansicht="kompakt"                     ohne Busse und Takt-Schritte (Standard: volle Ansicht)
 *        data-nurlesen                              Programm nicht veränderbar (Einstieg, Vorhersage)
 *        data-tests="100=7,101=5 -> 102=12 | 100=0 -> 102=0"   Testfälle (Eingabe -> erwartete Zellen)
 *        data-beispiele>                            Auswahlliste mit Beispielprogrammen (Simulator-Seite)
 *     <script type="text/plain">LOAD 100 …</script>   Ausgangsprogramm
 *   </div>
 *   <div data-rm-befehlssatz="LOAD,LOADI,…"></div>  Befehlstabelle (ohne Liste: alle Befehle)
 *
 * Maschinenmodell (wie auf den Arbeitsblättern 2.2 bis 2.6):
 *   Speicher: Zellen 0 bis 255, je Zelle ein Befehl oder eine ganze Zahl (16 Bit: -32768 bis 32767).
 *   Programm ab Zelle 0, ein Befehl je Zelle; Daten üblicherweise ab Zelle 100.
 *   Register: Akkumulator A, Befehlsregister BR, Befehlszähler BZ, Statusregister SR mit
 *   N (negativ), Z (null), O (Überlauf). LOAD, LOADI und alle Rechenbefehle setzen N, Z, O
 *   nach ihrem Ergebnis, CMP/CMPI setzen N und Z nach dem Vergleich (A < Wert: N = 1,
 *   A = Wert: Z = 1), STORE und Sprünge lassen das Statusregister unverändert.
 *   Befehlszyklus: ① Holen (BR ← Inhalt von Zelle BZ, BZ ← BZ + 1), ② Dekodieren, ③ Ausführen.
 *   Syntax: ein Befehl je Zeile, Kommentar ab ; oder //, Sprungmarke „name:“ am Zeilenanfang.
 *
 * Keine Abhängigkeiten. Gespeichert wird nur im Browser (localStorage), nichts geht an einen Server.
 */
(function () {
    'use strict';

    var GROESSE = 256, MINW = -32768, MAXW = 32767;
    var LIMIT_LAUF = 5000, LIMIT_SOFORT = 100000;

    // art: adr = Speicheradresse, zahl = Zahl im Befehl, ziel = Sprungziel, keiner = ohne Operand
    var BEFEHLE = {
        LOAD:  { art: 'adr',  kurz: 'A ← (x)',      text: 'lädt den Inhalt von Zelle x in den Akkumulator' },
        LOADI: { art: 'zahl', kurz: 'A ← n',        text: 'lädt die Zahl n in den Akkumulator' },
        STORE: { art: 'adr',  kurz: '(x) ← A',      text: 'speichert den Inhalt des Akkumulators in Zelle x' },
        ADD:   { art: 'adr',  kurz: 'A ← A + (x)',  text: 'addiert den Inhalt von Zelle x zum Akkumulator' },
        ADDI:  { art: 'zahl', kurz: 'A ← A + n',    text: 'addiert die Zahl n zum Akkumulator' },
        SUB:   { art: 'adr',  kurz: 'A ← A − (x)',  text: 'subtrahiert den Inhalt von Zelle x vom Akkumulator' },
        SUBI:  { art: 'zahl', kurz: 'A ← A − n',    text: 'subtrahiert die Zahl n vom Akkumulator' },
        MUL:   { art: 'adr',  kurz: 'A ← A · (x)',  text: 'multipliziert den Akkumulator mit dem Inhalt von Zelle x' },
        MULI:  { art: 'zahl', kurz: 'A ← A · n',    text: 'multipliziert den Akkumulator mit der Zahl n' },
        DIV:   { art: 'adr',  kurz: 'A ← A : (x)',  text: 'dividiert den Akkumulator ganzzahlig durch den Inhalt von Zelle x (Rest fällt weg)' },
        DIVI:  { art: 'zahl', kurz: 'A ← A : n',    text: 'dividiert den Akkumulator ganzzahlig durch n (Rest fällt weg)' },
        MOD:   { art: 'adr',  kurz: 'A ← A mod (x)', text: 'ersetzt den Akkumulator durch den Rest der Division durch den Inhalt von Zelle x' },
        MODI:  { art: 'zahl', kurz: 'A ← A mod n',  text: 'ersetzt den Akkumulator durch den Rest der Division durch n' },
        CMP:   { art: 'adr',  kurz: 'A ? (x)',      text: 'vergleicht den Akkumulator mit dem Inhalt von Zelle x und setzt das Statusregister (A bleibt gleich)' },
        CMPI:  { art: 'zahl', kurz: 'A ? n',        text: 'vergleicht den Akkumulator mit der Zahl n und setzt das Statusregister (A bleibt gleich)' },
        JMP:   { art: 'ziel', kurz: 'BZ ← z',       text: 'springt immer zu Zelle z (jump)' },
        JEQ:   { art: 'ziel', kurz: 'wenn Z = 1',   text: 'springt zu z, wenn Z = 1: gleich bzw. Ergebnis 0 (jump if equal)' },
        JNE:   { art: 'ziel', kurz: 'wenn Z = 0',   text: 'springt zu z, wenn Z = 0: ungleich (jump if not equal)' },
        JGT:   { art: 'ziel', kurz: 'wenn N = 0 und Z = 0', text: 'springt zu z, wenn größer (jump if greater than)' },
        JGE:   { art: 'ziel', kurz: 'wenn N = 0',   text: 'springt zu z, wenn größer oder gleich (jump if greater or equal)' },
        JLT:   { art: 'ziel', kurz: 'wenn N = 1',   text: 'springt zu z, wenn kleiner (jump if less than)' },
        JLE:   { art: 'ziel', kurz: 'wenn N = 1 oder Z = 1', text: 'springt zu z, wenn kleiner oder gleich (jump if less or equal)' },
        HOLD:  { art: 'keiner', kurz: 'Ende',       text: 'hält die Maschine an (Programmende)' }
    };
    var REIHENFOLGE = ['LOAD', 'LOADI', 'STORE', 'ADD', 'ADDI', 'SUB', 'SUBI', 'MUL', 'MULI', 'DIV', 'DIVI', 'MOD', 'MODI',
        'CMP', 'CMPI', 'JMP', 'JEQ', 'JNE', 'JGT', 'JGE', 'JLT', 'JLE', 'HOLD'];

    // ------------------------------------------------------------------
    // Assembler: Text -> Programm (ein Befehl je Zelle ab 0)
    // ------------------------------------------------------------------
    function assembliere(quelltext) {
        var zeilen = String(quelltext).replace(/\r/g, '').split('\n');
        var programm = [], marken = {}, fehler = [], zeilenAdresse = [], offeneMarken = [];
        zeilen.forEach(function (roh, i) {
            zeilenAdresse.push(null);
            var z = roh;
            var k = z.search(/;|\/\//);
            if (k >= 0) z = z.slice(0, k);
            z = z.trim();
            if (!z) return;
            var m = /^([A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*)\s*:\s*(.*)$/.exec(z);
            if (m) {
                var name = m[1].toLowerCase();
                if (BEFEHLE[m[1].toUpperCase()]) { fehler.push({ zeile: i, text: '„' + m[1] + '“ ist ein Befehlsname und kann keine Sprungmarke sein.' }); return; }
                if (marken.hasOwnProperty(name) || offeneMarken.indexOf(name) >= 0) fehler.push({ zeile: i, text: 'Die Sprungmarke „' + m[1] + '“ gibt es schon.' });
                else offeneMarken.push(name);
                z = m[2].trim();
                if (!z) return;
            }
            if (/^\d+\s*[:.]?\s+[A-Za-z]/.test(z)) {
                fehler.push({ zeile: i, text: 'Die Zeile beginnt mit einer Zahl. Schreibe nur den Befehl: Die Adresse zählt der Simulator selbst mit.' });
                return;
            }
            var teile = z.split(/[\s,]+/).filter(Boolean);
            var bef = teile[0].toUpperCase();
            var def = BEFEHLE[bef];
            if (!def) { fehler.push({ zeile: i, text: 'Unbekannter Befehl „' + teile[0] + '“.' + vorschlag(bef) }); return; }
            if (teile.length > 2) { fehler.push({ zeile: i, text: bef + ' hat höchstens einen Operanden.' }); return; }
            var op = teile[1], operand = null;
            if (def.art === 'keiner') {
                if (op !== undefined) { fehler.push({ zeile: i, text: bef + ' hat keinen Operanden.' }); return; }
            } else if (op === undefined) {
                fehler.push({ zeile: i, text: bef + ' braucht ' + (def.art === 'adr' ? 'eine Adresse.' : def.art === 'zahl' ? 'eine Zahl.' : 'ein Sprungziel (Adresse oder Sprungmarke).') });
                return;
            } else if (def.art === 'adr') {
                if (!/^\d+$/.test(op) || +op >= GROESSE) { fehler.push({ zeile: i, text: bef + ' braucht eine Adresse von 0 bis ' + (GROESSE - 1) + ', nicht „' + op + '“.' + (/I$/.test(bef) ? '' : (/^-?\d+$/.test(op) ? ' Meinst du ' + bef + 'I (mit Zahl)?' : '')) }); return; }
                operand = +op;
            } else if (def.art === 'zahl') {
                if (!/^[-+]?\d+$/.test(op) || +op < MINW || +op > MAXW) { fehler.push({ zeile: i, text: bef + ' braucht eine ganze Zahl von ' + MINW + ' bis ' + MAXW + ', nicht „' + op + '“.' }); return; }
                operand = +op;
            } else {
                if (/^\d+$/.test(op)) {
                    if (+op >= GROESSE) { fehler.push({ zeile: i, text: 'Sprungziel ' + op + ' gibt es nicht.' }); return; }
                    operand = +op;
                } else if (/^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*$/.test(op)) {
                    operand = op.toLowerCase();
                } else { fehler.push({ zeile: i, text: 'Ungültiges Sprungziel „' + op + '“.' }); return; }
            }
            var adresse = programm.length;
            offeneMarken.forEach(function (n) { marken[n] = adresse; });
            var markenHier = offeneMarken.slice();
            offeneMarken = [];
            zeilenAdresse[i] = adresse;
            programm.push({ befehl: bef, operand: operand, zeile: i, marken: markenHier, markeZiel: typeof operand === 'string' ? op : null });
        });
        offeneMarken.forEach(function (n) { marken[n] = programm.length; });
        programm.forEach(function (b) {
            if (typeof b.operand === 'string') {
                if (marken.hasOwnProperty(b.operand)) b.operand = marken[b.operand];
                else { fehler.push({ zeile: b.zeile, text: 'Die Sprungmarke „' + b.markeZiel + '“ gibt es nicht.' }); b.operand = 0; }
            }
        });
        if (programm.length > GROESSE) fehler.push({ zeile: 0, text: 'Das Programm ist zu lang.' });
        fehler.sort(function (a, b) { return a.zeile - b.zeile; });
        return { programm: programm, marken: marken, fehler: fehler, zeilenAdresse: zeilenAdresse };
    }

    function vorschlag(bef) {
        var best = null, d = 9;
        REIHENFOLGE.forEach(function (b) { var x = abstand(bef, b); if (x < d) { d = x; best = b; } });
        if (bef === 'JUMP' || bef === 'GOTO') return ' Meinst du JMP?';
        if (bef === 'HALT' || bef === 'END' || bef === 'STOP') return ' Meinst du HOLD?';
        return best && d <= 2 ? ' Meinst du ' + best + '?' : '';
    }
    function abstand(a, b) {
        var dp = [], i, j;
        for (i = 0; i <= a.length; i++) { dp[i] = [i]; }
        for (j = 1; j <= b.length; j++) dp[0][j] = j;
        for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return dp[a.length][b.length];
    }

    function befehlText(b) {
        if (typeof b === 'number') return String(b);
        if (!b) return '';
        return b.befehl + (b.operand === null ? '' : ' ' + b.operand);
    }

    // ------------------------------------------------------------------
    // Die Maschine
    // ------------------------------------------------------------------
    function Maschine(programm, daten) {
        this.programm = programm;
        this.daten = daten || {};
        this.reset();
    }
    Maschine.prototype.reset = function () {
        var mem = [], i;
        for (i = 0; i < GROESSE; i++) mem.push(0);
        this.programm.forEach(function (b, a) { mem[a] = { befehl: b.befehl, operand: b.operand }; });
        var d = this.daten;
        Object.keys(d).forEach(function (a) { mem[+a] = d[a]; });
        this.mem = mem;
        this.A = 0; this.BZ = 0; this.BR = null; this.N = 0; this.Z = 0; this.O = 0;
        this.phase = 0;            // nächste Phase: 0 Holen, 1 Dekodieren, 2 Ausführen
        this.letztePhase = -1;
        this.status = 'bereit';    // bereit | fertig | fehler
        this.schritte = 0;         // vollständig ausgeführte Befehle
        this.takte = 0;
        this.meldung = 'Bereit. Der Befehlszähler steht auf 0: Als Erstes wird der Befehl aus Zelle 0 geholt.';
        this.bus = null; this.alu = ''; this.zugriff = null; this.neu = {}; this.geaendert = {};
        this.protokoll = [];
        this.befehlsAdresse = null;
    };
    Maschine.prototype.klon = function () {
        var k = Object.create(Maschine.prototype), self = this;
        Object.keys(this).forEach(function (key) { k[key] = self[key]; });
        k.mem = this.mem.slice();
        k.protokoll = [];
        k.neu = {}; k.geaendert = {};
        return k;
    };
    Maschine.prototype.fehler = function (text) { this.status = 'fehler'; this.meldung = text; };
    Maschine.prototype.setze = function (r, ueberlauf) {
        this.N = r < 0 ? 1 : 0; this.Z = r === 0 ? 1 : 0; this.O = ueberlauf ? 1 : 0;
        this.neu.SR = true;
    };
    function begrenze(r) {
        if (r >= MINW && r <= MAXW) return { r: r, o: false };
        return { r: (((r - MINW) % 65536) + 65536) % 65536 + MINW, o: true };
    }
    Maschine.prototype.leseDaten = function (x) {
        var v = this.mem[x];
        if (typeof v !== 'number') {
            this.fehler('In Zelle ' + x + ' steht der Befehl „' + befehlText(v) + '“, keine Zahl. (Von Neumann: Befehle und Daten liegen im selben Speicher. Eine echte Maschine würde das Bitmuster des Befehls einfach als Zahl lesen.)');
            return null;
        }
        return v;
    };

    Maschine.prototype.takt = function () {
        if (this.status !== 'bereit') return;
        this.bus = null; this.alu = ''; this.zugriff = null; this.neu = {};
        this.takte++;
        if (this.phase === 0) this.holen();
        else if (this.phase === 1) this.dekodieren();
        else this.ausfuehren();
    };
    Maschine.prototype.holen = function () {
        this.letztePhase = 0;
        if (this.BZ < 0 || this.BZ >= GROESSE) { this.fehler('Der Befehlszähler zeigt auf Zelle ' + this.BZ + '. Die gibt es nicht.'); return; }
        var inh = this.mem[this.BZ];
        this.befehlsAdresse = this.BZ;
        this.bus = { adr: this.BZ, steuer: 'lesen', daten: befehlText(inh), richtung: 'cpu' };
        this.zugriff = this.BZ;
        this.BR = inh;
        this.neu.BR = true;
        if (typeof inh === 'number') {
            this.fehler('① Holen: In Zelle ' + this.BZ + ' steht die Zahl ' + inh + ', kein Befehl. Fehlt ein HOLD am Ende, oder springt das Programm an die falsche Stelle? (Von Neumann: Der Speicher unterscheidet nicht zwischen Befehlen und Daten.)');
            return;
        }
        var alt = this.BZ;
        this.BZ = alt + 1;
        this.neu.BZ = true;
        this.meldung = '① Holen: Das Steuerwerk legt den Befehlszähler (' + alt + ') auf den Adressbus und sendet „lesen“ über den Steuerbus. Über den Datenbus kommt „' + befehlText(inh) + '“ ins Befehlsregister. Der Befehlszähler wird um 1 erhöht: ' + this.BZ + '.';
        this.phase = 1;
    };
    Maschine.prototype.dekodieren = function () {
        this.letztePhase = 1;
        var b = this.BR, def = BEFEHLE[b.befehl];
        var t = def.text.replace(/\bx\b/g, String(b.operand)).replace(/\bn\b/g, String(b.operand)).replace(/\bz\b/g, String(b.operand));
        this.meldung = '② Dekodieren: Das Steuerwerk entschlüsselt „' + befehlText(b) + '“: Der Befehl ' + t + '.';
        this.phase = 2;
    };
    Maschine.prototype.ausfuehren = function () {
        this.letztePhase = 2;
        var b = this.BR, x = b.operand, v, e, alt = this.A, eintrag = { aenderung: '', sprung: false };
        var name = b.befehl, basis = name.replace(/I$/, '');
        var self = this;
        function wert() {   // Operand: Zahl im Befehl oder Inhalt einer Zelle (dann über die Busse)
            if (/I$/.test(name)) return x;
            var w = self.leseDaten(x);
            if (w === null) return null;
            self.bus = { adr: x, steuer: 'lesen', daten: String(w), richtung: 'cpu' };
            self.zugriff = x;
            return w;
        }
        var direkt = /I$/.test(name);
        var herkunft = direkt ? 'die Zahl ' + x + ' aus dem Befehl' : 'der Inhalt von Zelle ' + x;
        var herkunftDat = direkt ? 'der Zahl ' + x + ' aus dem Befehl' : 'dem Inhalt von Zelle ' + x;
        switch (basis) {
            case 'LOAD':
                v = wert(); if (v === null) return;
                this.A = v; this.setze(v, false); this.neu.A = true;
                this.meldung = '③ Ausführen: ' + cap(herkunft) + (direkt ? '' : ' (' + v + ')') + ' kommt in den Akkumulator.' + (direkt ? ' Der Speicher wird dafür nicht gebraucht.' : ' Adressbus: ' + x + ', Steuerbus: lesen, Datenbus: ' + v + '.');
                break;
            case 'STORE':
                this.mem[x] = this.A; this.geaendert[x] = true;
                this.bus = { adr: x, steuer: 'schreiben', daten: String(this.A), richtung: 'mem' };
                this.zugriff = x;
                eintrag.aenderung = '(' + x + ') ← ' + this.A;
                this.meldung = '③ Ausführen: Das Steuerwerk legt ' + x + ' auf den Adressbus und sendet „schreiben“. Der Akkumulator (' + this.A + ') geht über den Datenbus in Zelle ' + x + '.';
                if (x < this.programm.length) this.meldung += ' Achtung: Zelle ' + x + ' gehört zum Programm. Der Befehl dort ist jetzt überschrieben!';
                break;
            case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD':
                v = wert(); if (v === null) return;
                if ((basis === 'DIV' || basis === 'MOD') && v === 0) { this.fehler('③ Ausführen: Division durch 0. Die Maschine hält mit einem Fehler an.'); return; }
                var roh = basis === 'ADD' ? alt + v : basis === 'SUB' ? alt - v : basis === 'MUL' ? alt * v : basis === 'DIV' ? Math.trunc(alt / v) : alt % v;
                e = begrenze(roh);
                this.A = e.r; this.setze(e.r, e.o); this.neu.A = true;
                var zeichen = { ADD: '+', SUB: '−', MUL: '·', DIV: ':', MOD: 'mod' }[basis];
                this.alu = alt + ' ' + zeichen + ' ' + v + ' = ' + (e.o ? roh + ' → ' + e.r : e.r);
                this.meldung = '③ Ausführen: Das Rechenwerk rechnet mit dem Akkumulator und ' + herkunftDat + ': ' + this.alu + '. Das Ergebnis steht im Akkumulator, das Statusregister zeigt N = ' + this.N + ', Z = ' + this.Z + ', O = ' + this.O + '.';
                if (e.o) this.meldung += ' Überlauf: Das Ergebnis passt nicht in 16 Bit (−32768 bis 32767), deshalb O = 1 und ein falscher Wert im Akkumulator.';
                break;
            case 'CMP':
                v = wert(); if (v === null) return;
                this.N = alt < v ? 1 : 0; this.Z = alt === v ? 1 : 0; this.O = 0; this.neu.SR = true;
                this.alu = alt + ' ' + (alt < v ? '<' : alt === v ? '=' : '>') + ' ' + v;
                this.meldung = '③ Ausführen: Das Rechenwerk vergleicht den Akkumulator mit ' + herkunftDat + ': ' + this.alu + '. Statusregister: N = ' + this.N + ', Z = ' + this.Z + '. Der Akkumulator bleibt ' + alt + '.';
                break;
            case 'JMP': case 'JEQ': case 'JNE': case 'JGT': case 'JGE': case 'JLT': case 'JLE':
                var ok = sprungBedingung(name, this.N, this.Z);
                var bed = { JMP: 'immer', JEQ: 'Z = 1', JNE: 'Z = 0', JGT: 'N = 0 und Z = 0', JGE: 'N = 0', JLT: 'N = 1', JLE: 'N = 1 oder Z = 1' }[name];
                if (ok) {
                    this.BZ = x; this.neu.BZ = true; eintrag.sprung = true;
                    this.meldung = '③ Ausführen: ' + (name === 'JMP' ? 'Unbedingter Sprung' : 'Bedingung (' + bed + ') erfüllt') + ': Der Befehlszähler wird auf ' + x + ' gesetzt. Als Nächstes wird Zelle ' + x + ' geholt.';
                } else {
                    this.meldung = '③ Ausführen: Bedingung (' + bed + ') nicht erfüllt, denn N = ' + this.N + ', Z = ' + this.Z + '. Kein Sprung: Der Befehlszähler bleibt ' + this.BZ + '.';
                }
                break;
            case 'HOLD':
                this.status = 'fertig';
                this.meldung = '③ Ausführen: HOLD. Die Maschine hält an. Ergebnis: siehe Speicher.';
                break;
        }
        if (this.status === 'fehler') return;
        this.schritte++;
        this.phase = 0;
        eintrag.nr = this.schritte; eintrag.adr = this.befehlsAdresse; eintrag.text = befehlText(b);
        eintrag.A = this.A; eintrag.N = this.N; eintrag.Z = this.Z; eintrag.O = this.O; eintrag.BZ = this.BZ;
        if (this.protokoll.length < 2000) this.protokoll.push(eintrag);
    };
    function sprungBedingung(name, N, Z) {
        switch (name) {
            case 'JMP': return true;
            case 'JEQ': return Z === 1;
            case 'JNE': return Z === 0;
            case 'JGT': return N === 0 && Z === 0;
            case 'JGE': return N === 0;
            case 'JLT': return N === 1;
            case 'JLE': return N === 1 || Z === 1;
        }
        return false;
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    Maschine.prototype.befehl = function () {
        if (this.status !== 'bereit') return;
        var start = this.schritte;
        do { this.takt(); } while (this.status === 'bereit' && this.phase !== 0);
        return this.schritte > start;
    };
    Maschine.prototype.lauf = function (max) {
        var n = 0;
        while (this.status === 'bereit' && n < max) { this.befehl(); n++; }
        return n;
    };

    // Testfälle: "100=7,101=5 -> 102=12 | …"
    function leseTests(s) {
        if (!s) return [];
        return s.split('|').map(function (fall) {
            var t = fall.split(/->|→/);
            return { ein: zellwerte(t[0] || ''), aus: zellwerte(t[1] || '') };
        }).filter(function (f) { return Object.keys(f.aus).length; });
    }
    function zellwerte(s) {
        var o = {};
        s.split(',').forEach(function (p) {
            var m = /^\s*(\d+)\s*[=:]\s*(-?\d+)\s*$/.exec(p);
            if (m) o[+m[1]] = +m[2];
        });
        return o;
    }
    function zellText(o) {
        var k = Object.keys(o);
        return k.length ? k.map(function (a) { return '(' + a + ') = ' + o[a]; }).join(', ') : '–';
    }

    // ------------------------------------------------------------------
    // Beispielprogramme (Simulator-Seite): nur Programme, die auf den Stationsseiten
    // ohnehin vorgegeben sind, keine Lösungen von Aufgaben
    // ------------------------------------------------------------------
    var BEISPIELE = [
        { name: '2.2 Zwei Zahlen addieren', daten: { 100: 7, 101: 5 }, zellen: '100-102', text:
            '; Summe: (102) = (100) + (101)\nLOAD 100\nADD 101\nSTORE 102\nHOLD' },
        { name: '2.3 Umfang eines Rechtecks', daten: { 100: 4, 101: 3 }, zellen: '100-102', text:
            '; umfang = 2 * (laenge + breite)\n; laenge: 100, breite: 101, umfang: 102\nLOAD 100    ; ① A = laenge\nADD 101     ; ② A = A + breite\nMULI 2      ; ③ A = A * 2\nSTORE 102   ; ④ umfang = A\nHOLD' },
        { name: '2.4 Eintrittspreis', daten: { 100: 10 }, zellen: '100-101', text:
            '; alter: 100, preis: 101\n; Unter 14 Jahren 5 Euro, sonst 9 Euro.\n        LOAD 100\n        CMPI 14\n        JGE sonst     ; Bedingung umgekehrt: alter >= 14 -> sonst-Teil\n        LOADI 5       ; dann-Teil\n        STORE 101\n        JMP ende      ; sonst-Teil überspringen\nsonst:  LOADI 9\n        STORE 101\nende:   HOLD' },
        { name: '2.5 Summe 1 bis n', daten: { 100: 4 }, zellen: '100-102', text:
            '; n: 100, i: 101, summe: 102\n        LOADI 0\n        STORE 102     ; summe = 0\n        LOADI 1\n        STORE 101     ; i = 1\nkopf:   LOAD 101      ; ① Bedingung i <= n prüfen\n        CMP 100\n        JGT ende      ;    umgekehrt: i > n -> Schleife verlassen\n        LOAD 102      ; ② Rumpf: summe = summe + i\n        ADD 101\n        STORE 102\n        LOAD 101      ; ③ i = i + 1\n        ADDI 1\n        STORE 101\n        JMP kopf      ; ④ zurück zum Kopf\nende:   HOLD' },
        { name: '2.6 Rätselprogramm A', daten: { 100: 352 }, zellen: '100-101', text:
            'LOADI 0\nSTORE 101\nLOAD 100\nCMPI 0\nJEQ 12\nMODI 10\nADD 101\nSTORE 101\nLOAD 100\nDIVI 10\nSTORE 100\nJMP 2\nHOLD' },
        { name: 'Überlauf: 32767 + 1', daten: {}, zellen: '100', text:
            '; Was zeigt das Statusregister? Was steht danach im Akkumulator?\nLOADI 32767\nADDI 1\nSTORE 100\nHOLD' },
        { name: 'Von Neumann: Programm überschreibt sich selbst', daten: { 100: 5 }, zellen: '100-101', text:
            '; Was passiert hier? Schau auf Zelle 4 im Speicher.\nLOAD 100\nADDI 1\nSTORE 101\nSTORE 4     ; schreibt in Zelle 4 ... dort steht doch HOLD!\nHOLD' },
        { name: 'Leeres Programm', daten: {}, zellen: '100-107', text: '; Dein Programm\n\nHOLD' }
    ];

    // ------------------------------------------------------------------
    // Oberfläche
    // ------------------------------------------------------------------
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
    function leseBereich(s) {
        var r = [];
        String(s || '').split(',').forEach(function (t) {
            var m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(t);
            if (!m) return;
            var a = +m[1], b = m[2] ? +m[2] : a;
            for (var i = a; i <= b && i < GROESSE; i++) r.push(i);
        });
        return r;
    }
    function speichern(id, wert) { try { localStorage.setItem('rm13-' + id, JSON.stringify(wert)); } catch (e) { /* privat */ } }
    function laden(id) { try { return JSON.parse(localStorage.getItem('rm13-' + id) || 'null'); } catch (e) { return null; } }
    function loeschen(id) { try { localStorage.removeItem('rm13-' + id); } catch (e) { /* privat */ } }

    var TEMPI = [
        { label: 'langsam (1 Takt/s)', takt: true, ms: 1000 },
        { label: 'mittel (3 Takte/s)', takt: true, ms: 330 },
        { label: 'schnell (10 Befehle/s)', ms: 100 },
        { label: 'sofort bis zum Ende', sofort: true }
    ];

    function simulator(box) {
        var id = box.getAttribute('data-rm') || 'rm';
        var kompakt = box.getAttribute('data-ansicht') === 'kompakt';
        var nurLesen = box.hasAttribute('data-nurlesen');
        var skript = box.querySelector('script[type="text/plain"]');
        var original = { text: skript ? skript.textContent.replace(/^\n/, '').replace(/\s+$/, '') : 'HOLD', daten: zellwerte(box.getAttribute('data-speicher') || '') };
        var zellenStandard = box.getAttribute('data-zellen') || '100-107';
        var tests = leseTests(box.getAttribute('data-tests'));
        var gespeichert = nurLesen ? null : laden(id);
        var stand = gespeichert && typeof gespeichert.text === 'string' ? gespeichert : { text: original.text, daten: Object.assign({}, original.daten) };
        var zellenAnzeige = gespeichert && gespeichert.zellen ? gespeichert.zellen : zellenStandard;
        var asm = null, m = null, laeuft = false, timer = null, startSchritte = 0;
        var vorher = { an: false, richtig: 0, gesamt: 0 };
        if (kompakt) box.classList.add('kompakt');
        box.textContent = '';

        // --- Aufbau ---
        var titel = h('h4', { text: box.getAttribute('data-titel') || 'Registermaschine' });
        var kopf = h('div', { cls: 'rm-kopf' }, [titel]);
        var beispielWahl = null;
        if (box.hasAttribute('data-beispiele')) {
            beispielWahl = h('select', { 'aria-label': 'Beispielprogramm laden' }, [h('option', { value: '', text: 'Beispiel laden …' })]);
            BEISPIELE.forEach(function (b, i) { beispielWahl.appendChild(h('option', { value: String(i), text: b.name })); });
            kopf.appendChild(beispielWahl);
        }
        var rinne = h('pre', { cls: 'rm-rinne', 'aria-hidden': 'true' });
        var text = h('textarea', { cls: 'rm-text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Assemblerprogramm' });
        if (nurLesen) text.setAttribute('readonly', '');
        text.value = stand.text;
        var fehlerBox = h('div', { cls: 'rm-fehler', 'aria-live': 'polite' });
        var fuss = h('div', { cls: 'rm-editor-fuss' });
        var zurueckOriginal = h('button', { type: 'button', cls: 'mini', text: '↺ Ausgangsprogramm' });
        if (!nurLesen) fuss.appendChild(zurueckOriginal);
        var editorSpalte = h('div', {}, [h('div', { cls: 'rm-editor' }, [rinne, text]), fehlerBox, fuss]);

        function reg(name, erkl, cls) {
            var w = h('span', { cls: 'rm-wert' + (cls ? ' ' + cls : '') });
            var zeile = h('div', { cls: 'rm-reg' }, [h('label', {}, [h('b', { text: name }), erkl ? h('span', { text: erkl }) : null]), w]);
            return { zeile: zeile, wert: w };
        }
        var rBZ = reg('Befehlszähler', 'BZ'), rBR = reg('Befehlsregister', 'BR', 'br'), rA = reg('Akkumulator', 'A');
        var flags = {};
        var flagBox = h('span', { cls: 'rm-flags' });
        [['N', 'negativ'], ['Z', 'null'], ['O', 'Überlauf']].forEach(function (f) {
            var s = h('span', { text: '0' });
            var el = h('span', { cls: 'rm-flag', title: f[0] + ': ' + f[1] }, [h('small', { text: f[0] }), s]);
            flags[f[0]] = { el: el, wert: s };
            flagBox.appendChild(el);
        });
        var rSR = { zeile: h('div', { cls: 'rm-reg' }, [h('label', {}, [h('b', { text: 'Statusregister' }), h('span', { text: 'SR' })]), flagBox]) };
        var alu = h('div', { cls: 'rm-alu', 'aria-live': 'polite' });
        var cpu = h('div', { cls: 'rm-cpu' }, [
            h('div', { cls: 'rm-titel', text: 'Prozessor' }),
            h('div', { cls: 'rm-werk rm-sw' }, [h('div', { cls: 'rm-titel', text: 'Steuerwerk' }), rBZ.zeile, rBR.zeile]),
            h('div', { cls: 'rm-werk rm-rw' }, [h('div', { cls: 'rm-titel', text: 'Rechenwerk' }), rA.zeile, rSR.zeile, alu])
        ]);
        function bus(cls, name) {
            var last = h('span', { cls: 'rm-last' }), pfeil = h('span', { cls: 'rm-pfeil', text: '⟷' });
            var el = h('div', { cls: 'rm-bus ' + cls }, [h('b', { text: name }), last, pfeil]);
            return { el: el, last: last, pfeil: pfeil };
        }
        var bAdr = bus('adr', 'Adressbus'), bSteuer = bus('steuer', 'Steuerbus'), bDaten = bus('daten', 'Datenbus');
        var busse = h('div', { cls: 'rm-busse' }, [bAdr.el, bSteuer.el, bDaten.el]);
        var zellen = h('div', { cls: 'rm-zellen' });
        var speicher = h('div', { cls: 'rm-speicher' }, [h('div', { cls: 'rm-titel', text: 'Speicher' }), zellen]);
        var maschine = h('div', { cls: 'rm-maschine' }, [cpu, busse, speicher]);
        var zyklus = h('div', { cls: 'rm-zyklus', 'aria-hidden': 'true' }, [h('span', { text: '① Holen' }), h('span', { text: '② Dekodieren' }), h('span', { text: '③ Ausführen' })]);
        var erkl = h('div', { cls: 'rm-erklaerung', 'aria-live': 'polite' });
        var vorherBox = h('div', { cls: 'rm-vorher' });

        var kTakt = h('button', { type: 'button', cls: 'knopf', text: '▶ Takt', title: 'eine Phase des Befehlszyklus' });
        var kBefehl = h('button', { type: 'button', cls: 'knopf', text: '▶▶ Befehl', title: 'einen ganzen Befehl ausführen' });
        var kStart = h('button', { type: 'button', cls: 'knopf voll', text: '⏵ Start' });
        var kReset = h('button', { type: 'button', cls: 'knopf', text: '⟲ Zurücksetzen' });
        var tempo = h('select', { 'aria-label': 'Tempo' });
        TEMPI.forEach(function (t, i) { tempo.appendChild(h('option', { value: String(i), text: t.label })); });
        tempo.value = kompakt ? '2' : '1';
        var cbVorher = h('input', { type: 'checkbox' }), cbProt = h('input', { type: 'checkbox' });
        var zaehler = h('span', { cls: 'rm-zaehler' });
        var leiste = h('div', { cls: 'rm-leiste' }, [kompakt ? null : kTakt, kBefehl, kStart, kReset,
            h('label', {}, ['Tempo ', tempo]),
            h('label', { title: 'Vor jedem Befehl Akkumulator und Befehlszähler vorhersagen' }, [cbVorher, '🔮 Vorhersagen']),
            h('label', {}, [cbProt, 'Protokoll']), zaehler]);
        var kTest = null, testBox = h('div', { cls: 'rm-tests', 'aria-live': 'polite' });
        if (tests.length) {
            kTest = h('button', { type: 'button', cls: 'knopf', text: '✔ Testen (' + tests.length + ' Fälle)' });
            leiste.insertBefore(kTest, zaehler);
        }
        var protBox = h('div', { cls: 'rm-protokoll' });
        var maschinenSpalte = h('div', {}, [maschine, zyklus, erkl, vorherBox, leiste, testBox, protBox]);
        box.appendChild(kopf);
        box.appendChild(h('div', { cls: 'rm-raster' }, [editorSpalte, maschinenSpalte]));

        // --- Logik ---
        function sichern() {
            if (nurLesen) return;
            speichern(id, { text: text.value, daten: stand.daten, zellen: zellenAnzeige });
        }
        function stopp() { laeuft = false; clearTimeout(timer); kStart.textContent = '⏵ Start'; }
        function uebersetzen() {
            stopp();
            asm = assembliere(text.value);
            m = new Maschine(asm.programm, stand.daten);
            vorherBox.textContent = '';
            fehlerBox.textContent = '';
            if (asm.fehler.length) {
                asm.fehler.slice(0, 4).forEach(function (f) { fehlerBox.appendChild(h('div', { text: 'Zeile ' + (f.zeile + 1) + ': ' + f.text })); });
                if (asm.fehler.length > 4) fehlerBox.appendChild(h('div', { text: '… und ' + (asm.fehler.length - 4) + ' weitere Fehler.' }));
            } else {
                var belegt = Object.keys(stand.daten).map(Number).filter(function (a) { return a < asm.programm.length; });
                if (belegt.length) fehlerBox.appendChild(h('div', { text: 'Achtung: Das Programm reicht bis Zelle ' + (asm.programm.length - 1) + ' und überschreibt die Datenzelle ' + belegt[0] + '.' }));
                if (!asm.programm.length) fehlerBox.appendChild(h('div', { text: 'Noch kein Befehl im Programm.' }));
            }
            testBox.textContent = '';
            zeichne();
        }
        function bereit() { return asm && !asm.fehler.length && asm.programm.length; }

        function datenAdressen() {
            var s = {};
            leseBereich(zellenAnzeige).forEach(function (a) { s[a] = 1; });
            Object.keys(stand.daten).forEach(function (a) { s[a] = 1; });
            if (asm) asm.programm.forEach(function (b) { if (BEFEHLE[b.befehl].art === 'adr' && b.operand >= asm.programm.length) s[b.operand] = 1; });
            tests.forEach(function (t) { Object.keys(t.ein).concat(Object.keys(t.aus)).forEach(function (a) { s[a] = 1; }); });
            return Object.keys(s).map(Number).filter(function (a) { return !asm || a >= asm.programm.length; }).sort(function (a, b) { return a - b; });
        }

        function zeichneRinne() {
            var zeilen = text.value.split('\n');
            text.rows = Math.max(8, Math.min(60, zeilen.length + 1));
            var fehlerZeilen = {};
            (asm ? asm.fehler : []).forEach(function (f) { fehlerZeilen[f.zeile] = 1; });
            rinne.textContent = zeilen.map(function (z, i) {
                if (fehlerZeilen[i]) return '⚠';
                var a = asm && asm.zeilenAdresse[i];
                if (a === null || a === undefined) return '';
                var zeiger = m && m.status === 'bereit' && m.BZ === a ? '▶' : '';
                return zeiger + a;
            }).join('\n');
        }

        function zeichneSpeicher() {
            zellen.textContent = '';
            var tab = h('table'), tb = h('tbody');
            tab.appendChild(tb);
            var frei = m.status === 'bereit' && m.schritte === 0 && m.phase === 0 && !laeuft;
            tb.appendChild(h('tr', { cls: 'trenner' }, [h('td', { colspan: '3', text: 'Programm' })]));
            var n = asm.programm.length;
            for (var a = 0; a < Math.max(n, 1); a++) {
                var inh = m.mem[a];
                var tr = h('tr', {}, [h('td', { cls: 'adr', text: String(a) }), h('td', { cls: 'inh', text: n ? befehlText(inh) : '–' }),
                    h('td', { cls: 'marke', text: asm.programm[a] && asm.programm[a].marken.length ? asm.programm[a].marken.join(', ') : '' })]);
                if (m.status === 'bereit' && m.BZ === a && n) tr.classList.add('bz');
                if (m.zugriff === a) tr.classList.add('zugriff');
                if (m.geaendert[a]) tr.classList.add('geaendert');
                tb.appendChild(tr);
            }
            tb.appendChild(h('tr', { cls: 'trenner' }, [h('td', { colspan: '3', text: 'Daten' })]));
            datenAdressen().forEach(function (a) {
                var inh = m.mem[a], zelle;
                if (typeof inh === 'number') {
                    zelle = h('input', { type: 'text', inputmode: 'numeric', value: String(inh), 'aria-label': 'Inhalt von Zelle ' + a });
                    if (!frei) zelle.disabled = true;
                    zelle.addEventListener('change', function () {
                        var v = parseInt(zelle.value, 10);
                        if (isNaN(v)) v = 0;
                        v = Math.max(MINW, Math.min(MAXW, v));
                        zelle.value = String(v);
                        stand.daten[a] = v;
                        m.mem[a] = v;
                        sichern();
                    });
                } else zelle = document.createTextNode(befehlText(inh));
                var tr = h('tr', {}, [h('td', { cls: 'adr', text: String(a) }), h('td', { cls: 'inh' }, [zelle]), h('td', { cls: 'marke' })]);
                if (m.zugriff === a) tr.classList.add('zugriff');
                if (m.geaendert[a]) tr.classList.add('geaendert');
                tb.appendChild(tr);
            });
            zellen.appendChild(tab);
            var z = zellen.querySelector('tr.bz');
            if (z && laeuft) { var o = z.offsetTop - zellen.clientHeight / 2; if (Math.abs(zellen.scrollTop - o) > zellen.clientHeight / 3) zellen.scrollTop = o; }
        }

        function setzeWert(el, wert, neu) {
            el.textContent = wert;
            el.classList.toggle('neu', !!neu);
        }

        function zeichne() {
            zeichneRinne();
            var ok = bereit();
            [kTakt, kBefehl, kStart].forEach(function (k) { k.disabled = !ok || m.status !== 'bereit'; });
            if (laeuft) kStart.disabled = false;
            kReset.disabled = !ok;
            if (kTest) kTest.disabled = !ok || laeuft;
            if (!ok) {
                zellen.textContent = '';
                erkl.className = 'rm-erklaerung fehler';
                erkl.textContent = asm && asm.fehler.length ? 'Das Programm enthält Fehler (links). Erst wenn alle behoben sind, kommt es in den Speicher.' : 'Schreibe links ein Programm.';
                setzeWert(rBZ.wert, '–'); setzeWert(rBR.wert, '–'); setzeWert(rA.wert, '–');
                ['N', 'Z', 'O'].forEach(function (f) { flags[f].wert.textContent = '–'; flags[f].el.classList.remove('an'); });
                [bAdr, bSteuer, bDaten].forEach(function (b) { b.el.classList.remove('an'); b.last.textContent = ''; });
                zaehler.textContent = '';
                protBox.textContent = '';
                return;
            }
            setzeWert(rBZ.wert, String(m.BZ), m.neu.BZ);
            setzeWert(rBR.wert, m.BR === null ? '–' : befehlText(m.BR), m.neu.BR);
            setzeWert(rA.wert, String(m.A), m.neu.A);
            ['N', 'Z', 'O'].forEach(function (f) {
                flags[f].wert.textContent = String(m[f]);
                flags[f].el.classList.toggle('an', m[f] === 1);
            });
            alu.textContent = m.alu;
            var b = m.bus;
            bAdr.el.classList.toggle('an', !!b);
            bSteuer.el.classList.toggle('an', !!b);
            bDaten.el.classList.toggle('an', !!b);
            bAdr.last.textContent = b ? String(b.adr) : '';
            bAdr.pfeil.textContent = b ? '→' : '';
            bSteuer.last.textContent = b ? b.steuer : '';
            bSteuer.pfeil.textContent = b ? '→' : '';
            bDaten.last.textContent = b ? b.daten : '';
            bDaten.pfeil.textContent = b ? (b.richtung === 'cpu' ? '←' : '→') : '';
            Array.prototype.forEach.call(zyklus.children, function (s, i) { s.classList.toggle('an', m.letztePhase === i && m.status !== 'fehler'); });
            erkl.className = 'rm-erklaerung' + (m.status === 'fehler' ? ' fehler' : m.status === 'fertig' ? ' fertig' : '');
            erkl.textContent = m.meldung;
            zeichneSpeicher();
            zaehler.textContent = 'Befehle: ' + m.schritte + (kompakt ? '' : ' · Takte: ' + m.takte) + (vorher.gesamt ? ' · Vorhersagen: ' + vorher.richtig + '/' + vorher.gesamt : '');
            zeichneProtokoll();
        }

        function zeichneProtokoll() {
            protBox.textContent = '';
            if (!cbProt.checked) return;
            var tab = h('table', {}, [h('thead', {}, [h('tr', {}, ['Nr.', 'Zelle', 'Befehl', 'A', 'N', 'Z', 'O', 'BZ danach', 'Speicher'].map(function (t) { return h('th', { text: t }); }))])]);
            var tb = h('tbody');
            m.protokoll.forEach(function (p) {
                tb.appendChild(h('tr', {}, [p.nr, p.adr, p.text, p.A, p.N, p.Z, p.O, p.BZ, p.aenderung].map(function (t, i) {
                    return h('td', { text: String(t), cls: i === 7 && p.sprung ? 'sprung' : '' });
                })));
            });
            tab.appendChild(tb);
            protBox.appendChild(tab);
            protBox.scrollTop = protBox.scrollHeight;
        }

        function schritt(nurTakt) {
            if (vorher.an && m.phase === 0 && m.status === 'bereit' && !laeuft) { frageVorher(); return; }
            if (nurTakt) m.takt(); else m.befehl();
            zeichne();
        }

        function frageVorher() {
            vorherBox.textContent = '';
            var naechste = m.mem[m.BZ];
            var eA = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Akkumulator danach' });
            var eBZ = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'Befehlszähler danach' });
            var pruef = h('button', { type: 'button', cls: 'knopf', text: 'Prüfen und ausführen' });
            vorherBox.appendChild(h('div', {}, [h('strong', { text: '🔮 Nächster Befehl: ' }), 'Zelle ' + m.BZ + ': ' + befehlText(naechste) + '. Was steht danach im Akkumulator und im Befehlszähler?']));
            vorherBox.appendChild(h('div', { cls: 'zeile' }, [h('label', {}, ['A = ', eA]), h('label', {}, ['BZ = ', eBZ]), pruef]));
            eA.focus();
            function los() {
                var k = m.klon();
                k.befehl();
                var okA = parseInt(eA.value, 10) === k.A, okBZ = parseInt(eBZ.value, 10) === k.BZ;
                if (k.status === 'fehler') { okA = okBZ = true; }
                vorher.gesamt++;
                if (okA && okBZ) vorher.richtig++;
                m.befehl();
                zeichne();
                vorherBox.textContent = '';
                var r = h('div', { cls: 'rueck ' + (okA && okBZ ? 'ok' : 'nein') });
                r.textContent = (okA && okBZ ? '✓ Richtig vorhergesagt: ' : '✗ Nicht ganz: ') + 'A = ' + m.A + (okA ? ' ✓' : ' (du: ' + (eA.value || '–') + ')') + ', BZ = ' + m.BZ + (okBZ ? ' ✓' : ' (du: ' + (eBZ.value || '–') + ')') + '.';
                vorherBox.appendChild(r);
            }
            pruef.addEventListener('click', los);
            [eA, eBZ].forEach(function (e) { e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); los(); } }); });
        }

        function tick() {
            if (!laeuft) return;
            var t = TEMPI[+tempo.value];
            if (t.sofort) {
                m.lauf(LIMIT_SOFORT);
                stopp();
                if (m.status === 'bereit') m.meldung = 'Nach ' + LIMIT_SOFORT.toLocaleString('de-DE') + ' Befehlen angehalten. Läuft das Programm in einer Endlosschleife?';
                zeichne();
                return;
            }
            if (t.takt) m.takt(); else m.befehl();
            if (m.status !== 'bereit') { stopp(); zeichne(); return; }
            if (m.schritte - startSchritte >= LIMIT_LAUF) {
                stopp();
                m.meldung = 'Schon ' + LIMIT_LAUF.toLocaleString('de-DE') + ' Befehle ausgeführt: angehalten. Endlosschleife? Mit „Start“ geht es weiter.';
                zeichne();
                return;
            }
            zeichne();
            timer = setTimeout(tick, t.ms);
        }

        function testen() {
            stopp();
            testBox.textContent = '';
            var tab = h('table', {}, [h('thead', {}, [h('tr', {}, ['Eingabe', 'erwartet', 'erhalten', ''].map(function (t) { return h('th', { text: t }); }))])]);
            var tb = h('tbody'), alle = 0;
            tests.forEach(function (t) {
                var d = Object.assign({}, stand.daten, t.ein);
                var k = new Maschine(asm.programm, d);
                k.lauf(LIMIT_SOFORT);
                var erhalten = {}, ok = k.status === 'fertig';
                Object.keys(t.aus).forEach(function (a) {
                    erhalten[a] = k.mem[a];
                    if (k.mem[a] !== t.aus[a]) ok = false;
                });
                if (ok) alle++;
                var meldung = k.status === 'fehler' ? 'Fehler: ' + k.meldung.replace(/^[①②③] \w+: /, '') : k.status === 'bereit' ? 'kein HOLD erreicht (Endlosschleife?)' : zellText(erhalten);
                tb.appendChild(h('tr', { cls: ok ? 'ok' : 'nein' }, [h('td', { text: zellText(t.ein) }), h('td', { text: zellText(t.aus) }), h('td', { text: meldung }), h('td', { text: ok ? '✓' : '✗' })]));
            });
            tab.appendChild(tb);
            testBox.appendChild(h('div', { cls: 'rueck ' + (alle === tests.length ? 'ok' : 'nein'), text: alle === tests.length ? '✓ Alle ' + tests.length + ' Testfälle bestanden.' : alle + ' von ' + tests.length + ' Testfällen bestanden.' }));
            testBox.appendChild(h('div', { cls: 'tab-scroll' }, [tab]));
        }

        // --- Ereignisse ---
        var verzoegerung = null;
        text.addEventListener('input', function () {
            stopp();
            zeichneRinne();
            clearTimeout(verzoegerung);
            verzoegerung = setTimeout(function () { uebersetzen(); sichern(); }, 350);
        });
        text.addEventListener('keydown', function (e) {
            if (e.key === 'Tab' && !e.shiftKey && !nurLesen) {
                e.preventDefault();
                var s = text.selectionStart;
                text.setRangeText('\t', s, text.selectionEnd, 'end');
                text.dispatchEvent(new Event('input'));
            }
        });
        kTakt.addEventListener('click', function () { stopp(); schritt(true); });
        kBefehl.addEventListener('click', function () { stopp(); schritt(false); });
        kStart.addEventListener('click', function () {
            if (laeuft) { stopp(); zeichne(); return; }
            vorherBox.textContent = '';
            laeuft = true; startSchritte = m.schritte; kStart.textContent = '⏸ Stopp';
            tick();
        });
        kReset.addEventListener('click', function () { stopp(); m.reset(); vorherBox.textContent = ''; zeichne(); });
        tempo.addEventListener('change', function () { if (laeuft) { clearTimeout(timer); tick(); } });
        cbVorher.addEventListener('change', function () { vorher.an = cbVorher.checked; vorherBox.textContent = ''; if (vorher.an) { stopp(); if (m && m.status === 'bereit') { if (m.phase !== 0) { m.befehl(); zeichne(); } frageVorher(); } } });
        cbProt.addEventListener('change', zeichneProtokoll);
        if (kTest) kTest.addEventListener('click', testen);
        zurueckOriginal.addEventListener('click', function () {
            if (text.value !== original.text && !window.confirm('Dein Programm wird durch das Ausgangsprogramm ersetzt. Fortfahren?')) return;
            text.value = original.text;
            stand = { text: original.text, daten: Object.assign({}, original.daten) };
            zellenAnzeige = zellenStandard;
            loeschen(id);
            uebersetzen();
        });
        if (beispielWahl) beispielWahl.addEventListener('change', function () {
            var b = BEISPIELE[+beispielWahl.value];
            beispielWahl.value = '';
            if (!b) return;
            if (text.value.trim() && text.value !== original.text && !window.confirm('Dein Programm wird durch das Beispiel „' + b.name + '“ ersetzt. Fortfahren?')) return;
            text.value = b.text;
            stand = { text: b.text, daten: Object.assign({}, b.daten) };
            zellenAnzeige = b.zellen;
            uebersetzen();
            sichern();
        });

        uebersetzen();
    }

    // Befehlstabelle
    function befehlssatz(el) {
        var liste = (el.getAttribute('data-rm-befehlssatz') || '').split(',').map(function (s) { return s.trim().toUpperCase(); }).filter(Boolean);
        if (!liste.length) liste = REIHENFOLGE;
        var tab = h('table', { cls: 'rm-tab befehlstab' }, [h('thead', {}, [h('tr', {}, [h('th', { text: 'Befehl' }), h('th', { text: 'Kurz' }), h('th', { text: 'Bedeutung' })])])]);
        var tb = h('tbody');
        liste.forEach(function (b) {
            var d = BEFEHLE[b];
            if (!d) return;
            var op = { adr: ' x', zahl: ' n', ziel: ' z', keiner: '' }[d.art];
            tb.appendChild(h('tr', {}, [h('td', { text: b + op }), h('td', { text: d.kurz }), h('td', { text: d.text })]));
        });
        tab.appendChild(tb);
        el.appendChild(h('div', { cls: 'tab-scroll' }, [tab]));
    }

    // für Tests (test-registermaschine.html) erreichbar
    window.Registermaschine = { assembliere: assembliere, Maschine: Maschine, befehlText: befehlText, leseTests: leseTests, BEFEHLE: BEFEHLE };

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-rm]').forEach(simulator);
        document.querySelectorAll('[data-rm-befehlssatz]').forEach(befehlssatz);
    });
})();
