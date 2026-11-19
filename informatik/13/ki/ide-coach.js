/*
 * IDE-Coach – dynamische Hinweise zu einem eingebetteten Online-IDE-Projekt (KI-Sequenz Informatik 13)
 *
 *   <div class="coach" data-coach="i13-ki3-kmeans"></div>   (Station 3; 4: i13-ki4-perzeptron; 5: i13-ki5-netz)
 *
 * Der Coach liest über die Zugriffsschnittstelle der Online-IDE
 * (data-java-online mit 'enableFileAccess': true, 'enableRunExitStatusAccess': true)
 *   - den aktuellen Code (getFiles),
 *   - Ausgabe, Exception (mit Datei und Zeile) und JUnit-Ergebnisse jedes Laufs,
 *   - die Fehlerliste des Compilers (aus dem IDE-Fenster)
 * und zeigt daraus eine Fortschrittsliste der TODOs und konkrete Hinweise.
 * Lösungen verrät er nicht. Die Regeln je Projekt stehen unten in REGELN.
 * Engine wie formale-sprachen/ide-coach.js (Informatik 12/13), Regeln für die KI-Stationen.
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

    // ===== Station 3: k-Means =====
    REGELN['i13-ki3-kmeans'] = {
        titel: 'Projekt k-Means',
        testDatei: 'KMeansTest.java',
        tests: {
            abstandBerechnen: { titel: 'TODO 3a: Abstand zweier Punkte', hinweis: function (c) {
                var r = methode(c.datei('KMeans.java'), 'double\\s+abstand\\s*\\(');
                if (r && !/for\s*\(/.test(r)) return 'Ein Merkmalsvektor kann 2, 3 oder mehr Werte haben. Gehe mit einer Schleife über alle Positionen j von 0 bis a.length - 1.';
                if (r && !/sqrt/.test(r)) return 'Du hast die Summe der quadrierten Differenzen? Dann fehlt noch die Wurzel: Math.sqrt(summe).';
                return 'Für jedes Merkmal j: Differenz a[j] - b[j], quadrieren (mal sich selbst), aufsummieren. Zum Schluss die Wurzel.'; } },
            zuordnenNaechstesZentrum: { titel: 'TODO 3b: ① Zuordnen', hinweis: function (c) {
                var r = methode(c.datei('KMeans.java'), 'boolean\\s+zuordnen\\s*\\(');
                if (r && !/setCluster/.test(r)) return 'Das gefundene Zentrum muss im Punkt gespeichert werden: punkte[i].setCluster(bester).';
                if (r && /return\s+true\s*;/.test(r)) return 'Gibst du true schon innerhalb der Schleife zurück? Dann werden die übrigen Punkte nicht mehr zugeordnet. Merke dir die Änderung in einer Variablen und gib sie erst am Ende zurück.';
                return 'Zwei Schleifen: außen über alle Punkte, innen über alle Zentren. Merke dir den kleinsten Abstand und die Nummer des Zentrums dazu. Hat sich der Cluster des Punkts geändert, ist das Ergebnis true.'; } },
            zentrenAufMittelwert: { titel: 'TODO 3c: ② Zentren verschieben', hinweis: function () { return 'Für jedes Cluster c: alle Punkte mit getCluster() == c aufsummieren (je Merkmal) und zählen. Mittelwert = Summe / Anzahl, je Merkmal in zentren[c][j] speichern.'; } },
            leeresClusterBleibtStehen: { titel: 'Zentrum ohne Punkte', hinweis: function () { return 'Hat ein Cluster keinen einzigen Punkt, ist die Anzahl 0 und Summe / 0 ergibt NaN. Verschiebe das Zentrum nur, wenn anzahl > 0 ist.'; } },
            laufBisNichtsMehrAendert: { titel: 'TODO 3d: ③ Wiederholen', hinweis: function (c) {
                var r = methode(c.datei('KMeans.java'), 'int\\s+lauf\\s*\\(');
                if (r && !/while\s*\(/.test(r)) return 'Wie oft wiederholt werden muss, weiß man vorher nicht. Eine while-Schleife mit der Bedingung zuordnen() passt: Sie läuft, solange sich etwas ändert.';
                return 'In der Schleife: Zentren verschieben und durchgaenge erhöhen. Achtung: raum ist in den Tests null, rufe raum.faerbe(…) nur in if (raum != null) auf.'; } },
            streuungBerechnen: { titel: 'TODO 5: Streuung', hinweis: function () { return 'Für jeden Punkt den Abstand zu seinem Zentrum zentren[punkte[i].getCluster()] bestimmen, quadrieren und aufsummieren.'; } }
        },
        schritte: [
            { titel: 'TODO 3a: Abstand', tests: ['abstandBerechnen'] },
            { titel: 'TODO 3b: ① Zuordnen', tests: ['zuordnenNaechstesZentrum'] },
            { titel: 'TODO 3c: ② Zentren verschieben', tests: ['zentrenAufMittelwert', 'leeresClusterBleibtStehen'] },
            { titel: 'TODO 3d: ③ Wiederholen', tests: ['laufBisNichtsMehrAendert'] },
            { titel: 'TODO 5: Streuung (Aufgabe 5)', tests: ['streuungBerechnen'] }
        ],
        hinweise: function (c) {
            var liste = [];
            var ex = c.lauf && c.lauf.exception;
            if (ex && /null/.test(ex.message) && /raum/.test(ex.zeileText || '')) {
                liste.push({ art: 'fehler', titel: 'Zugriff auf raum, obwohl raum null ist', text: 'In den Tests wird lauf(null) aufgerufen. Schreibe die Anzeige-Befehle in if (raum != null) { … }.' });
            }
            if (ex && /index|Index|außerhalb|bounds/.test(ex.message)) {
                liste.push({ art: 'fehler', titel: (ex.file || '') + (ex.line ? ', Zeile ' + ex.line : '') + ': Index außerhalb des Arrays', text: 'Läuft eine Schleife bis <= statt < ? Oder hat ein Punkt noch den Cluster -1, weil zuordnen() noch nichts tut (z. B. in streuung)?' });
            }
            if (c.lauf && /NaN/.test(c.lauf.output || '')) {
                liste.push({ art: 'warnung', titel: 'Ausgabe NaN', text: 'NaN (not a number) entsteht bei 0 / 0: Ein Cluster hat keine Punkte. Verschiebe ein Zentrum nur, wenn es mindestens einen Punkt hat.' });
            }
            if (c.laeuftLange) {
                liste.push({ art: 'warnung', titel: 'Das Programm läuft sehr lange', text: 'Endet die while-Schleife in lauf()? Sie endet nur, wenn zuordnen() irgendwann false liefert, also wenn sich keine Zuordnung mehr ändert. (Die Anzeige wartet pro Schritt 0,7 s, ein paar Sekunden sind normal.)' });
            }
            if (c.lauf && !ex && /Streuung: 13\.5/.test(c.lauf.output || '')) {
                liste.push({ art: 'ok', titel: 'k-Means läuft', text: 'Streuung etwa 13,55 mit den Startpunkten 0, 200, 300. Drehe den Würfel mit der Maus: Findest du die drei Wolken? Vergleiche die Kreuztabelle mit den wahren Arten (Aufgabe 4).' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Starte jetzt das Hauptprogramm und beobachte die Zentren im 3D-Raum. Danach: Aufgabe 4 (andere Startpunkte) und Aufgabe 5 (Ellbogen).' });
            }
            return liste;
        }
    };

    // ===== Station 4: Perzeptron =====
    REGELN['i13-ki4-perzeptron'] = {
        titel: 'Projekt Perzeptron',
        testDatei: 'PerzeptronTest.java',
        tests: {
            nettoeingabe: { titel: 'TODO 3a: Nettoeingabe', hinweis: function (c) {
                var r = methode(c.datei('Perzeptron.java'), 'double\\s+netto\\s*\\(');
                if (r && !/gewichte\s*\[\s*0\s*\]/.test(r)) return 'Der Bias w0 = gewichte[0] gehört auch in die Summe (mit x0 = 1). Beginne mit z = gewichte[0].';
                if (r && /gewichte\s*\[\s*i\s*\]\s*\*\s*x\s*\[\s*i\s*\]/.test(r)) return 'gewichte[0] ist der Bias. Zum Merkmal x[i] gehört deshalb gewichte[i + 1], nicht gewichte[i].';
                return 'z = w0 + w1 · x[0] + w2 · x[1] + … : eine Schleife über alle Merkmale x[i], jeweils gewichte[i + 1] · x[i] addieren.'; } },
            stufenfunktion: { titel: 'TODO 3b: Stufenfunktion', hinweis: function () { return 'Bei z >= 0 ist die Ausgabe 1, sonst 0. Achtung: Auch z = 0 ergibt 1.'; } },
            ausgabeBerechnen: { titel: 'TODO 3c: Ausgabe', hinweis: function () { return 'Die Ausgabe ist die Aktivierung der Nettoeingabe: aktivierung(netto(x)).'; } },
            lerneKorrigiert: { titel: 'TODO 3d: Lernregel korrigiert', hinweis: function (c) {
                var r = methode(c.datei('Perzeptron.java'), 'boolean\\s+lerne\\s*\\(');
                if (r && !/ziel\s*-\s*ausgabe/.test(r.replace(/\s+/g, ' '))) return 'Berechne zuerst den Fehler: int fehler = ziel - ausgabe(x); Er ist +1, 0 oder -1.';
                return 'gewichte[0] ändert sich um lernrate · fehler (denn x0 = 1), jedes gewichte[i + 1] um lernrate · fehler · x[i].'; } },
            lerneOhneFehler: { titel: 'TODO 3d: richtig eingeordnet → nichts ändern', hinweis: function () { return 'Ist der Fehler 0, gibst du sofort false zurück und änderst kein Gewicht.'; } },
            trenntPinguine: { titel: 'Esels und Adélie werden getrennt', hinweis: function () { return 'Laufen die anderen Tests? Dann prüfe in lerne, ob wirklich jedes Gewicht geändert wird (Schleife über alle Merkmale) und ob true nur bei einer Korrektur zurückkommt.'; } }
        },
        schritte: [
            { titel: 'TODO 3a: Nettoeingabe', tests: ['nettoeingabe'] },
            { titel: 'TODO 3b: Stufenfunktion', tests: ['stufenfunktion'] },
            { titel: 'TODO 3c: Ausgabe', tests: ['ausgabeBerechnen'] },
            { titel: 'TODO 3d: Delta-Lernregel', tests: ['lerneKorrigiert', 'lerneOhneFehler', 'trenntPinguine'] }
        ],
        hinweise: function (c) {
            var liste = [];
            var ex = c.lauf && c.lauf.exception;
            if (ex && /index|Index|außerhalb|bounds/.test(ex.message)) {
                liste.push({ art: 'fehler', titel: (ex.file || '') + (ex.line ? ', Zeile ' + ex.line : '') + ': Index außerhalb des Arrays', text: 'Es gibt ein Gewicht mehr als Merkmale. Läuft deine Schleife über x.length (Merkmale) und greift auf gewichte[i + 1] zu?' });
            }
            if (c.lauf && /Epoche 50: [1-9]/.test(c.lauf.output || '')) {
                liste.push({ art: 'warnung', titel: 'Nach 50 Epochen noch Korrekturen', text: 'Bei Esels und Adélie sollte das Perzeptron nach 10 Epochen fehlerfrei sein. Hast du die Arten im Hauptprogramm geändert (Aufgabe 5)? Dann ist das das erwartete Ergebnis.' });
            }
            if (c.lauf && /Epoche 10: 0 Korrekturen/.test(c.lauf.output || '')) {
                liste.push({ art: 'ok', titel: 'Fehlerfrei nach 10 Epochen', text: 'Drehe den Würfel so, dass du genau auf die Kante der Ebene schaust: Die Pinguine liegen sauber auf zwei Seiten. Weiter mit Aufgabe 4 (Startgewichte, Lernrate).' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Starte das Hauptprogramm und beobachte, wie sich die Ebene dreht, bis kein Pinguin mehr schwarz ist.' });
            }
            return liste;
        }
    };

    // ===== Station 5: Raum abstecken =====
    REGELN['i13-ki5-netz'] = {
        titel: 'Projekt Raum abstecken',
        testDatei: 'NetzTest.java',
        tests: {
            vorwaertsZweiSchichten: { titel: 'TODO 4a: Forward Propagation', hinweis: function (c) {
                var r = methode(c.datei('Netz.java'), 'int\\s+vorwaerts\\s*\\(');
                if (r && !/for\s*\(/.test(r)) return '① Für jedes verdeckte Neuron i eine Ausgabe: h[i] = verdeckt[i].ausgabe(x); dafür brauchst du eine Schleife.';
                if (r && /ausgabe\.ausgabe\s*\(\s*x\s*\)/.test(r)) return '② Das Ausgabeneuron bekommt nicht den Punkt x, sondern die Antworten h der verdeckten Schicht: ausgabe.ausgabe(h).';
                return '① h[i] = verdeckt[i].ausgabe(x) für alle i, ② return ausgabe.ausgabe(h).'; } },
            undNeuron: { titel: 'TODO 4b: UND-Neuron', hinweis: function () { return 'Mit allen Gewichten 1 ist die Summe der Eingaben 0 bis n. Wähle w[0] so, dass z erst bei n Einsen >= 0 wird, bei n - 1 Einsen aber noch negativ ist: zum Beispiel -(n - 0,5).'; } },
            quaderInnenAussen: { titel: 'TODO 4c: Quader aus 6 Grenzen', hinweis: function () { return 'Jede Ungleichung wird ein Neuron: x1 <= xMax ⇔ xMax - x1 >= 0, also w0 = xMax, w1 = -1. Für x2 und x3 steht die 1 bzw. -1 an der zweiten bzw. dritten Stelle.'; } },
            oktaederSelbstGebaut: { titel: 'TODO 4d: Oktaeder (selbst bauen)', hinweis: function () { return 'Für jede Kombination a, b, c aus -1 und 1 eine Grenze a·(x1 - 0,5) + b·(x2 - 0,5) + c·(x3 - 0,5) <= r. Umgestellt: w0 = r + 0,5·(a + b + c), w1 = -a, w2 = -b, w3 = -c. Drei geschachtelte Schleifen erzeugen alle 8 Kombinationen.'; } }
        },
        schritte: [
            { titel: 'TODO 4a: Forward Propagation', tests: ['vorwaertsZweiSchichten'] },
            { titel: 'TODO 4b: UND-Neuron', tests: ['undNeuron'] },
            { titel: 'TODO 4c: Quader', tests: ['quaderInnenAussen'] },
            { titel: 'TODO 4d: Oktaeder', tests: ['oktaederSelbstGebaut'] }
        ],
        hinweise: function (c) {
            var liste = [];
            var ex = c.lauf && c.lauf.exception;
            if (ex && /null/.test(ex.message)) {
                liste.push({ art: 'fehler', titel: 'Zugriff auf null', text: 'Ein Platz im Array g ist noch leer (null). Hast du in quader bzw. oktaeder alle Grenz-Neuronen g[0] bis g[5] bzw. g[0] bis g[7] erzeugt?' });
            }
            var m = c.lauf && /Abweichungen von der Kugel: (\d+)/.exec(c.lauf.output || '');
            if (m) {
                liste.push({ art: +m[1] <= 40 ? 'ok' : 'tipp', titel: m[1] + ' Abweichungen von der Kugel', text: +m[1] <= 40 ? 'Sehr nah an der Kugel. Wie viele Grenz-Neuronen brauchst du dafür? Was wäre mit noch mehr?' : 'Versuche, näher an die Kugel zu kommen: andere Grenzen im Quader (Aufgabe 5a), der Oktaeder (5b) oder beide zusammen mit Netz.beide (5c).' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Starte das Hauptprogramm und drehe den Würfel: Die grünen Punkte zeigen den Raum, den dein Netz absteckt.' });
            }
            return liste;
        }
    };

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
