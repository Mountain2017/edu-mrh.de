/*
 * IDE-Coach – dynamische Hinweise zu einem eingebetteten Online-IDE-Projekt
 *
 *   <div class="coach" data-coach="i13-15-automat"></div>
 *
 * Der Coach liest über die Zugriffsschnittstelle der Online-IDE
 * (data-java-online mit 'enableFileAccess': true, 'enableRunExitStatusAccess': true)
 *   - den aktuellen Code (getFiles),
 *   - Ausgabe, Exception (mit Datei und Zeile) und JUnit-Ergebnisse jedes Laufs,
 *   - die Fehlerliste des Compilers (aus dem IDE-Fenster)
 * und zeigt daraus eine Fortschrittsliste der TODOs und konkrete Hinweise.
 * Lösungen verrät er nicht. Die Regeln je Projekt stehen unten in REGELN.
 * Engine wie in Informatik 12 (rekursive-datenstrukturen/ide-coach.js), Regeln für Informatik 13.
 *
 * Alles läuft im Browser, nichts verlässt den Rechner, nichts wird gespeichert.
 */
(function () {
    'use strict';

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

    // Kommentare entfernen (einfach: Zeichenketten mit // oder /* sind in unseren Projekten selten)
    function ohneKommentare(code) {
        return (code || '').replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); })
                           .replace(/\/\/[^\n]*/g, '');
    }

    // Rumpf einer Methode (erste Fundstelle) – für statische Prüfungen
    function methode(code, kopfMuster) {
        var c = ohneKommentare(code);
        var m = new RegExp(kopfMuster).exec(c);
        if (!m) return null;
        var i = c.indexOf('{', m.index + m[0].length - 1);
        if (i < 0) return null;
        var tiefe = 0;
        for (var j = i; j < c.length; j++) {
            if (c[j] === '{') tiefe++;
            else if (c[j] === '}') { tiefe--; if (tiefe === 0) return c.slice(i + 1, j); }
        }
        return c.slice(i + 1);
    }

    function zeileVon(code, n) {
        var z = (code || '').split('\n');
        return n >= 1 && n <= z.length ? z[n - 1] : '';
    }

    // Nur Tests, die wirklich gelaufen sind (bei normalen Programmläufen meldet die IDE
    // den Testbaum mit, aber ohne bestandene oder fehlgeschlagene Tests).
    function testsFlach(tp) {
        var erg = {};
        (function gehe(k) {
            if (!k) return;
            if (k.methodIdentifier && (k.passed + k.failed) > 0) erg[k.methodIdentifier] = k.failed === 0;
            (k.children || []).forEach(gehe);
        })(tp);
        return erg;
    }

    function idAusKonfig(div) {
        var roh = div.getAttribute('data-java-online') || '';
        var m = /'id'\s*:\s*'([^']+)'/.exec(roh);
        return m ? m[1] : null;
    }

    // ---------- Allgemeine Übersetzungen der IDE-Fehlermeldungen ----------
    // muster: RegExp auf den Meldungstext; text(m, f, ctx): Hinweis (f = Fehlerobjekt)
    var ALLGEMEIN = [
        { muster: /Erwartet wird ein Strichpunkt/, text: function () { return 'Hier fehlt vermutlich ein Semikolon ; am Ende der vorherigen Anweisung.'; } },
        { muster: /Der Datentyp (\w+) ist hier nicht definiert/, text: function (m) { return 'Eine Klasse oder ein Interface „' + m[1] + '“ gibt es nicht. Tippfehler? Groß- und Kleinschreibung beachten!'; } },
        { muster: /Der Bezeichner (\w+) ist an dieser Stelle nicht definiert/, text: function (m) { return '„' + m[1] + '“ ist hier unbekannt: Tippfehler, oder ist die Variable nur in einem anderen Block deklariert?'; } },
        { muster: /muss einen Wert vom Typ (\w+) zurückliefern/, text: function (m) { return 'Die Methode muss in jedem Zweig ein return mit einem ' + m[1] + ' haben, auch im Abbruchfall.'; } },
        { muster: /Von einer abstrakten Klasse kann man keine Objekte instanzieren/, text: function () { return 'Von einer abstrakten Klasse gibt es keine Objekte. Erzeuge ein Objekt einer Unterklasse (z. B. Knoten oder Abschluss).'; } },
        { muster: /können keine Objekte instanziiert werden/, text: function () { return 'Von einem Interface gibt es keine Objekte. Erzeuge ein Objekt einer Klasse, die das Interface implementiert.'; } },
        { muster: /Die Klasse (\w+) muss noch folgende Methoden des Interfaces\s*(\w+)\s*implementieren:\s*(.*)/, text: function (m) {
            return m[1] + ' verspricht mit „implements ' + m[2] + '“, den Vertrag zu erfüllen, hält ihn aber noch nicht ein. Es fehlt: ' + m[3] + '.'; } },
        { muster: /Die Klasse (\w+) muss noch folgende Methoden ihrer abstrakten Oberklassen implementieren:\s*(.*)/, text: function (m) {
            return 'Jede Unterklasse muss alle abstrakten Methoden überschreiben. In ' + m[1] + ' fehlt noch: ' + m[2] + '.'; } },
        { muster: /hat den Datentyp (\w+) und kann daher der Variablen auf der linken Seite \(Datentyp (\w+)\) nicht zugewiesen werden/, text: function (m) {
            return 'Rechts steht ein ' + m[1] + ', links eine Variable vom Typ ' + m[2] + '. Nicht jedes ' + m[1] + ' ist ein ' + m[2] + '. Passt der Typ der Variablen?'; } },
        { muster: /In Interfaces können nur default-Methoden einen Methodenrumpf haben/, text: function () { return 'Im Interface steht nur der Methodenkopf mit Semikolon, z. B. String gibSchluesselwert(); – ohne { }.'; } },
        { muster: /Es konnte keine passende Methode/, text: function () { return 'Eine Methode mit diesem Namen und diesen Parametertypen gibt es nicht. Prüfe Schreibweise und Typen der Parameter.'; } }
    ];

    var NULL_MELDUNG = /von null kann nicht zugegriffen werden/;

    // ---------- Regeln je Projekt ----------
    // schritte: [{ titel, erledigt(ctx) -> true/false }]
    // hinweise(ctx) -> [{ art: 'fehler'|'warnung'|'tipp'|'ok', titel, text, mehr }]
    // fehler: [{ muster, text(m, f, ctx) }]  – projektbezogene Übersetzungen, vor den allgemeinen
    // tests: { Methodenname: { titel, hinweis(ctx) } }
    var REGELN = {};

    // ===== 1.5 Projekt Automat =====
    var NULL_INTERN = /Cannot read properties of null|von null kann nicht zugegriffen werden/;
    var LACHEN_SOLL = { ha: 'true', haha: 'true', hah: 'false', aha: 'false' };
    REGELN['i13-15-automat'] = {
        titel: 'Projekt Automat',
        testDatei: 'AutomatTest.java',
        tests: {
            tabelleAnfangsLeer: { titel: 'Neue Tabelle: jedes Feld ist -1', hinweis: function (c) {
                var k = methode(c.datei('Automat.java'), 'public\\s+Automat\\s*\\(');
                if (k && !/new\s+int\s*\[/.test(k)) return 'Erzeuge im Konstruktor zuerst das zweidimensionale Array: Wie viele Zeilen (Zustände) und wie viele Spalten (Zeichen des Alphabets) braucht es?';
                return 'Java füllt ein neues int-Array mit 0. Das hieße: Jeder Übergang führt nach Z0. Mit zwei geschachtelten Schleifen setzt du jedes Feld auf -1.'; } },
            endzustandSetzen: { titel: 'Endzustände merken', hinweis: function () { return 'Erzeuge im Konstruktor auch das Array endzustand: ein boolean je Zustand.'; } },
            uebergangEintragen: { titel: 'Übergänge eintragen', hinweis: function () { return 'In welcher Spalte steht ein Zeichen? Das verrät dir seine Position im String alphabet (indexOf). Zeile ist der Zustand, aus dem der Pfeil kommt.'; } },
            fremdesZeichenEintragen: { titel: 'Fremdes Zeichen wird nicht eingetragen', hinweis: function () { return 'Was liefert indexOf für ein Zeichen, das nicht im Alphabet steht? Prüfe das, bevor du in die Tabelle schreibst.'; } },
            folgezustandLesen: { titel: 'Folgezustand aus der Tabelle lesen', hinweis: function () { return 'Wie beim Eintragen: Spalte bestimmen, dann den Inhalt des Felds zurückgeben.'; } },
            folgezustandFremdesZeichen: { titel: 'Fremdes Zeichen: -1 ohne Absturz', hinweis: function () { return 'Für ein fremdes Zeichen ist die Spalte -1, und tabelle[z][-1] gibt es nicht. Gib vorher -1 zurück.'; } },
            pruefeAkzeptiert: { titel: 'pruefe() akzeptiert ha und hahaha', hinweis: function (c) {
                var p = methode(c.datei('Automat.java'), 'boolean\\s+pruefe\\s*\\(');
                if (p && !/for\s*\(|while\s*\(/.test(p)) return 'Regel ③: Lies das Wort Zeichen für Zeichen, mit einer Schleife über alle Positionen i von 0 bis wort.length() - 1.';
                return 'Wechselst du nach jedem Zeichen wirklich in den Folgezustand (zustand = neu)? Und gibst du am Ende das Richtige zurück (Regel ④)?'; } },
            pruefeKeinEndzustand: { titel: 'hah wird abgelehnt (kein Endzustand)', hinweis: function () { return 'Regel ④: Dass die Eingabe ganz gelesen wurde, genügt nicht. Entscheidend ist, ob der aktuelle Zustand ein Endzustand ist.'; } },
            pruefeAbbruch: { titel: 'Abbruch ohne passenden Pfeil', hinweis: function () { return 'Regel ②: Liefert folgezustand -1, gibt es keinen passenden Pfeil. Dann sofort abbrechen und false zurückgeben, bevor -1 als Zustand benutzt wird.'; } },
            pruefeLeeresWort: { titel: 'Das leere Wort', hinweis: function () { return 'Beim leeren Wort läuft die Schleife kein einziges Mal. Entscheidend ist dann der Startzustand Z0: Ist er ein Endzustand?'; } },
            mehrereUebergaenge: { titel: 'TODO 5: mehrere Zeichen auf einmal', hinweis: function () { return 'Gehe alle Zeichen des Strings zeichen durch und rufe für jedes uebergangHinzufuegen auf.'; } },
            vollstaendigErkennen: { titel: 'TODO 6: vollständig?', hinweis: function () { return 'Ein einziges Feld mit -1 genügt, damit der Automat nicht vollständig ist. Erst wenn alle Felder geprüft sind, steht fest: vollständig.'; } },
            fangzustandErgaenzen: { titel: 'TODO 7: Fangzustand ergänzen', hinweis: function () { return 'Nur die Felder mit -1 bekommen den Fangzustand, auch in der Zeile des Fangzustands selbst. Vorhandene Übergänge bleiben.'; } }
        },
        schritte: [
            { titel: 'TODO 1: Tabelle anlegen (P1)', tests: ['tabelleAnfangsLeer', 'endzustandSetzen'] },
            { titel: 'TODO 2: Übergänge eintragen (P2)', tests: ['uebergangEintragen', 'fremdesZeichenEintragen'] },
            { titel: 'TODO 3: Folgezustand lesen (P3)', tests: ['folgezustandLesen', 'folgezustandFremdesZeichen'] },
            { titel: 'TODO 4: Wörter prüfen (P4)', tests: ['pruefeAkzeptiert', 'pruefeKeinEndzustand', 'pruefeAbbruch', 'pruefeLeeresWort'] },
            { titel: 'TODO 5 bis 7: Selbst bauen', tests: ['mehrereUebergaenge', 'vollstaendigErkennen', 'fangzustandErgaenzen'] }
        ],
        hinweise: function (c) {
            var liste = [];
            var ex = c.lauf && c.lauf.exception;
            if (ex && NULL_INTERN.test(ex.message)) {
                var z = ex.zeileText || '';
                if (/endzustand|tabelle/.test(z) || ex.file === 'Automatenbild.java') {
                    liste.push({ art: 'fehler', titel: (ex.file || 'Automat.java') + (ex.line ? ', Zeile ' + ex.line : '') + ': Zugriff auf null', text: 'Ein Array ist noch null: Es wurde zwar deklariert, aber noch nie mit new erzeugt. Das ist TODO 1 im Konstruktor von Automat.',
                                 mehr: 'Die IDE nennt das „Interner Fehler … null“. Gemeint ist: Hier soll ein Array benutzt werden, das es noch nicht gibt.' });
                }
            }
            if (ex && /index|Index|außerhalb|bounds/.test(ex.message)) {
                liste.push({ art: 'fehler', titel: (ex.file || '') + (ex.line ? ', Zeile ' + ex.line : '') + ': Index außerhalb des Arrays', text: 'Steht das Zeichen überhaupt im Alphabet? indexOf liefert sonst -1, und Spalte -1 gibt es nicht. Oder wird ein Folgezustand -1 als Zeile benutzt?' });
            }
            if (c.laeuftLange) {
                liste.push({ art: 'warnung', titel: 'Das Programm läuft sehr lange', text: 'Läuft eine Schleife endlos? Wird der Zähler erhöht? (Die Animation braucht pro Zeichen etwa eine Sekunde – bei langen Wortlisten dauert es also etwas.)' });
            }
            if (c.lauf && !ex) {
                var falsch = [];
                Object.keys(LACHEN_SOLL).forEach(function (w) {
                    var m = new RegExp('^' + w + ': (true|false)$', 'm').exec(c.lauf.output || '');
                    if (m && m[1] !== LACHEN_SOLL[w]) falsch.push(w + ' liefert ' + m[1]);
                });
                if (falsch.length) liste.push({ art: 'warnung', titel: 'pruefe() entscheidet beim Lach-Automaten noch falsch', text: falsch.join(', ') + '. Vergleiche mit deiner Tabelle zu Aufgabe 1a auf dem Blatt.' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Dein Automat speichert seine Regeln in einer Tabelle und prüft Wörter nach den vier Regeln. Baue jetzt eigene Automaten im Hauptprogramm, z. B. mit dem Java-Export aus dem Automaten-Baukasten.' });
            }
            return liste;
        }
    };

    // ---------- Coach-Engine ----------
    function Coach(box) {
        this.box = box;
        this.id = box.getAttribute('data-coach');
        this.regeln = REGELN[this.id] || { titel: 'Projekt', schritte: [], hinweise: function () { return []; } };
        this.ide = null;
        this.ideDiv = null;
        this.dateien = {};
        this.fehler = [];
        this.lauf = null;
        this.tests = null;
        this.gelaufen = {};
        this.startZeit = null;
        this.laeuftLange = false;
        this.mehrOffen = {};
        this.baue();
        this.suche();
    }

    Coach.prototype.baue = function () {
        var b = this.box;
        b.textContent = '';
        b.setAttribute('aria-live', 'polite');
        var kopf = h('div', { cls: 'coach-kopf' }, [
            h('span', { cls: 'coach-titel', text: '🧭 Coach: ' + this.regeln.titel }),
            this.chipCompile = h('span', { cls: 'coach-chip', text: 'warte auf die IDE …' }),
            this.chipLauf = h('span', { cls: 'coach-chip', hidden: '' }),
            this.chipTests = h('span', { cls: 'coach-chip', hidden: '' })
        ]);
        this.knopfStart = h('button', { type: 'button', cls: 'coach-knopf', text: '▶ Programm starten', hidden: '' });
        this.knopfTests = h('button', { type: 'button', cls: 'coach-knopf', text: '✓ Tests starten', hidden: '' });
        var knoepfe = h('div', { cls: 'coach-knoepfe' }, [this.knopfStart, this.knopfTests]);
        this.schritteEl = h('ol', { cls: 'coach-schritte' });
        this.hinweiseEl = h('ul', { cls: 'coach-hinweise' });
        b.appendChild(kopf);
        b.appendChild(knoepfe);
        b.appendChild(this.schritteEl);
        b.appendChild(this.hinweiseEl);
        b.appendChild(h('p', { cls: 'coach-fuss', text: 'Der Coach liest deinen Code nur hier im Browser. Er gibt Hinweise, aber keine Lösungen – und er kann sich irren. Im Zweifel gilt, was die IDE meldet.' }));
        var self = this;
        this.knopfStart.addEventListener('click', function () { self.ausloesen('interpreter.start'); });
        this.knopfTests.addEventListener('click', function () { self.ausloesen('interpreter.startTests'); });
    };

    Coach.prototype.suche = function () {
        var self = this, versuche = 0;
        var divs = document.querySelectorAll('.java-online');
        for (var i = 0; i < divs.length; i++) if (idAusKonfig(divs[i]) === this.id) this.ideDiv = divs[i];
        if (!this.ideDiv) { this.chipCompile.textContent = 'kein passendes IDE-Fenster gefunden'; return; }
        var t = setInterval(function () {
            versuche++;
            var acc = window.online_ide_access;
            var ide = acc && acc.getIDE ? acc.getIDE(self.id) : null;
            if (ide) {
                clearInterval(t);
                self.verbinde(ide);
            } else if (versuche > 240) {
                clearInterval(t);
                self.chipCompile.textContent = 'Coach nicht verfügbar (IDE ohne Zugriffsschnittstelle)';
            }
        }, 500);
    };

    Coach.prototype.verbinde = function (ide) {
        var self = this;
        this.ide = ide;
        try {
            ide.registerOnRunExitListener(function (r) { self.nachLauf(r); });
        } catch (e) { /* Laufstatus nicht freigegeben */ }
        // Interne Funktionen nur, wenn vorhanden (Startknöpfe, Laufzeit-Überwachung)
        var intern = this.intern();
        if (intern && intern.am) {
            this.knopfStart.hidden = false;
            if (this.regeln.tests) this.knopfTests.hidden = false;
        }
        if (intern && intern.it && intern.it.eventManager && intern.it.eventManager.on) {
            try {
                intern.it.eventManager.on('start', function () { self.startZeit = Date.now(); self.laeuftLange = false; });
            } catch (e) { /* ältere IDE */ }
        }
        this.leseDateien();
        setInterval(function () { self.leseDateien(); self.pruefeLaufzeit(); }, 1500);
    };

    Coach.prototype.intern = function () {
        try {
            var main = this.ide && this.ide.ide;
            if (!main) return null;
            return { am: main.getActionManager && main.getActionManager(), it: main.getInterpreter && main.getInterpreter() };
        } catch (e) { return null; }
    };

    Coach.prototype.ausloesen = function (aktion) {
        var i = this.intern();
        if (!i || !i.am) return;
        try {
            if (aktion === 'interpreter.start' && !i.am.isActive('interpreter.start')) return;   // läuft schon
            i.am.trigger(aktion);
        } catch (e) { /* nichts */ }
    };

    Coach.prototype.pruefeLaufzeit = function () {
        if (this.startZeit && !this.laeuftLange && Date.now() - this.startZeit > 6000) {
            this.laeuftLange = true;
            this.werte();
        }
    };

    Coach.prototype.leseDateien = function () {
        var neu = {}, geaendert = false;
        try {
            this.ide.getFiles().forEach(function (f) { neu[f.getName()] = f.getText(); });
        } catch (e) { return; }
        var alt = this.dateien;
        Object.keys(neu).forEach(function (k) { if (alt[k] !== neu[k]) geaendert = true; });
        Object.keys(alt).forEach(function (k) { if (!(k in neu)) geaendert = true; });
        this.dateien = neu;
        var self = this;
        if (geaendert || !this.erstesMal) {
            this.erstesMal = true;
            clearTimeout(this.timer);
            // Der Compiler der IDE arbeitet verzögert: Fehlerliste etwas später lesen.
            this.timer = setTimeout(function () { self.fehler = self.leseFehler(); self.werte(); }, 1300);
        } else {
            var f = this.leseFehler();
            if (JSON.stringify(f) !== JSON.stringify(this.fehler)) { this.fehler = f; this.werte(); }
        }
    };

    Coach.prototype.leseFehler = function () {
        var liste = [], datei = '';
        var tab = this.ideDiv && this.ideDiv.querySelector('.jo_errorsTab');
        if (!tab) return liste;
        Array.prototype.forEach.call(tab.querySelectorAll('.jo_error-filename, .jo_error-line'), function (e) {
            if (e.classList.contains('jo_error-filename')) { datei = e.textContent.replace(/ /g, ' ').trim(); return; }
            var lc = e.querySelectorAll('.jo_linecolumn');
            var cat = e.querySelector('.jo_error_category');
            var txt = e.querySelector('.jo_error-text');
            var kategorie = cat ? cat.textContent.replace(':', '').trim() : '';
            if (kategorie !== 'Fehler') return;
            liste.push({ file: datei, line: lc[0] ? +lc[0].textContent : 0,
                         text: txt ? txt.textContent.replace(cat ? cat.textContent : '', '').trim() : e.textContent.trim() });
        });
        return liste;
    };

    Coach.prototype.kontext = function () {
        var self = this;
        var tests = this.tests || {};
        var namen = Object.keys(tests);
        return {
            dateien: this.dateien,
            datei: function (n) { return self.dateien[n] || ''; },
            zeile: function (d, n) { return zeileVon(self.dateien[d], n); },
            fehler: this.fehler,
            lauf: this.lauf,
            tests: tests,
            gelaufen: this.gelaufen,
            laeuftLange: this.laeuftLange,
            alleTestsGruen: namen.length > 0 && namen.every(function (k) { return tests[k]; })
        };
    };

    Coach.prototype.nachLauf = function (r) {
        this.startZeit = null;
        this.laeuftLange = false;
        var lauf = { output: r.output || '', exception: null, zeit: Date.now() };
        if (r.exception) {
            var ex = r.exception;
            lauf.exception = { message: ex.message || String(ex), file: ex.file && ex.file.name,
                               line: ex.range && ex.range.startLineNumber };
            lauf.exception.zeileText = zeileVon(this.dateien[lauf.exception.file], lauf.exception.line);
        }
        if (r.testProgress && (r.testProgress.passed + r.testProgress.failed) > 0) {
            this.tests = testsFlach(r.testProgress);
            lauf.testlauf = true;
        }
        this.lauf = lauf;
        if (this.regeln.nachLauf) this.regeln.nachLauf(this.kontext(), lauf);
        this.werte();
    };

    Coach.prototype.uebersetzeFehler = function (f, ctx) {
        var listen = (this.regeln.fehler || []).concat(ALLGEMEIN);
        for (var i = 0; i < listen.length; i++) {
            var m = listen[i].muster.exec(f.text);
            if (m) {
                var t = listen[i].text(m, f, ctx);
                if (t) return t;
            }
        }
        return null;
    };

    Coach.prototype.werte = function () {
        var ctx = this.kontext();
        var self = this;
        // Kopfzeile
        if (this.fehler.length) {
            this.chipCompile.textContent = '✗ ' + this.fehler.length + (this.fehler.length === 1 ? ' Fehler' : ' Fehler') + ' beim Kompilieren';
            this.chipCompile.className = 'coach-chip schlecht';
        } else {
            this.chipCompile.textContent = '✓ kompiliert';
            this.chipCompile.className = 'coach-chip gut';
        }
        if (this.lauf && !this.fehler.length) {
            this.chipLauf.hidden = false;
            var ex = this.lauf.exception;
            this.chipLauf.textContent = ex ? '✗ letzter Lauf: Absturz' : (this.lauf.testlauf ? 'letzter Lauf: Tests' : '✓ letzter Lauf ohne Absturz');
            this.chipLauf.className = 'coach-chip ' + (ex ? 'schlecht' : 'gut');
        } else {
            this.chipLauf.hidden = true;
        }
        if (this.regeln.tests) {
            this.chipTests.hidden = false;
            var namen = Object.keys(ctx.tests);
            if (!namen.length) {
                this.chipTests.textContent = 'Tests: noch nicht gestartet';
                this.chipTests.className = 'coach-chip';
            } else {
                var ok = namen.filter(function (k) { return ctx.tests[k]; }).length;
                this.chipTests.textContent = 'Tests: ' + ok + ' von ' + namen.length + ' bestanden';
                this.chipTests.className = 'coach-chip ' + (ok === namen.length ? 'gut' : 'mittel');
            }
        }

        // Schritte
        this.schritteEl.textContent = '';
        var naechsterGesetzt = false;
        (this.regeln.schritte || []).forEach(function (s) {
            var status;     // true, false, null (unbekannt)
            if (s.tests) {
                var bekannt = s.tests.filter(function (t) { return t in ctx.tests; });
                status = bekannt.length === s.tests.length ? s.tests.every(function (t) { return ctx.tests[t]; }) : null;
                if (status === null && bekannt.length && bekannt.some(function (t) { return !ctx.tests[t]; })) status = false;
            } else {
                try { status = !!s.erledigt(ctx); } catch (e) { status = false; }
            }
            var li = h('li', { cls: status === true ? 'erledigt' : '' });
            li.appendChild(h('span', { cls: 'coach-haken', text: status === true ? '✓' : (status === false ? '○' : '·') }));
            li.appendChild(h('span', { text: typeof s.titel === 'function' ? s.titel(ctx) : s.titel }));
            if (status !== true && !naechsterGesetzt) {
                naechsterGesetzt = true;
                li.classList.add('naechster');
                li.appendChild(h('span', { cls: 'coach-marke', text: 'nächster Schritt' }));
            }
            if (s.tests && status === false) {
                var offene = s.tests.filter(function (t) { return t in ctx.tests && !ctx.tests[t]; });
                if (offene.length) {
                    var ul = h('ul', { cls: 'coach-testliste' });
                    offene.forEach(function (t) {
                        var info = self.regeln.tests[t] || { titel: t };
                        ul.appendChild(h('li', { text: '✗ ' + info.titel }));
                    });
                    li.appendChild(ul);
                }
            }
            self.schritteEl.appendChild(li);
        });
        if (this.regeln.tests && !Object.keys(ctx.tests).length) {
            this.schritteEl.appendChild(h('li', { cls: 'coach-info', text: 'Starte die Tests (Knopf oben oder ▶ neben „@Test“ in ' + (this.regeln.testDatei || 'der Testdatei') + '), dann zeigt der Coach, welche Teile schon funktionieren.' }));
        }

        // Hinweise sammeln: Compilerfehler, Projektregeln, fehlgeschlagene Tests
        var hinweise = [];
        var gesehen = {};
        this.fehler.slice(0, 4).forEach(function (f) {
            var t = self.uebersetzeFehler(f, ctx);
            var schluessel = f.file + f.text;
            if (gesehen[schluessel]) return;
            gesehen[schluessel] = true;
            hinweise.push({ art: 'fehler', titel: f.file + ', Zeile ' + f.line + ': ' + f.text, text: t || 'Lies die Meldung der IDE genau und schau dir die Zeile an.' });
        });
        try { hinweise = hinweise.concat(this.regeln.hinweise(ctx) || []); } catch (e) { /* Regel fehlerhaft */ }
        if (this.lauf && this.lauf.exception && !hinweise.some(function (x) { return x.art === 'fehler' && /Zeile/.test(x.titel); })) {
            var e = this.lauf.exception;
            hinweise.push({ art: 'fehler', titel: (e.file || 'Programm') + (e.line ? ', Zeile ' + e.line : '') + ': ' + e.message,
                            text: NULL_MELDUNG.test(e.message) ? 'Eine Variable verweist hier auf null. Welche ist es, und warum hat sie (noch) kein Objekt?' : 'Lies die Meldung und schau dir die markierte Zeile an.' });
        }
        if (this.regeln.tests && ctx.tests) {
            var erstOffen = null;
            (this.regeln.schritte || []).some(function (s) {
                if (!s.tests) return false;
                var t = s.tests.filter(function (x) { return x in ctx.tests && !ctx.tests[x]; })[0];
                if (t) { erstOffen = t; return true; }
                return false;
            });
            if (erstOffen && this.regeln.tests[erstOffen]) {
                var info = this.regeln.tests[erstOffen];
                hinweise.push({ art: 'tipp', titel: 'Test „' + info.titel + '“ schlägt fehl', text: info.hinweis(ctx) });
            }
        }

        this.hinweiseEl.textContent = '';
        if (!hinweise.length) {
            this.hinweiseEl.appendChild(h('li', { cls: 'coach-hinweis leer', text: this.lauf ? 'Keine Auffälligkeiten. Weiter mit dem nächsten Schritt!' : 'Starte das Programm, dann kann der Coach auch die Ausgabe auswerten.' }));
        }
        hinweise.slice(0, 5).forEach(function (x, i) {
            var li = h('li', { cls: 'coach-hinweis ' + x.art });
            li.appendChild(h('strong', { text: x.titel }));
            li.appendChild(h('span', { text: x.text }));
            if (x.mehr) {
                var key = x.titel;
                var mehr = h('p', { cls: 'coach-mehr', text: x.mehr });
                if (!self.mehrOffen[key]) mehr.hidden = true;
                var k = h('button', { type: 'button', cls: 'coach-mehr-knopf', text: self.mehrOffen[key] ? 'weniger' : 'mehr Hilfe' });
                k.addEventListener('click', function () {
                    self.mehrOffen[key] = !self.mehrOffen[key];
                    mehr.hidden = !self.mehrOffen[key];
                    k.textContent = self.mehrOffen[key] ? 'weniger' : 'mehr Hilfe';
                });
                li.appendChild(k);
                li.appendChild(mehr);
            }
            self.hinweiseEl.appendChild(li);
        });
    };

    function start() {
        document.querySelectorAll('[data-coach]').forEach(function (b) { b.coach = new Coach(b); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
