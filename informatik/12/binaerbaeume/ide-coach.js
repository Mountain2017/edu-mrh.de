/*
 * IDE-Coach – dynamische Hinweise zu einem eingebetteten Online-IDE-Projekt
 *
 *   <div class="coach" data-coach="i12-22-spielerverzeichnis"></div>
 *
 * Der Coach liest über die Zugriffsschnittstelle der Online-IDE
 * (data-java-online mit 'enableFileAccess': true, 'enableRunExitStatusAccess': true)
 *   - den aktuellen Code (getFiles),
 *   - Ausgabe, Exception (mit Datei und Zeile) und JUnit-Ergebnisse jedes Laufs,
 *   - die Fehlerliste des Compilers (aus dem IDE-Fenster)
 * und zeigt daraus eine Fortschrittsliste der TODOs und konkrete Hinweise.
 * Lösungen verrät er nicht. Die Regeln je Projekt stehen unten in REGELN.
 * Mit stapelGrenze in den Regeln hält er endlose Rekursion an (Stapel-Wächter, siehe unten).
 *
 * Kopie der Engine aus ../rekursive-datenstrukturen/ide-coach.js, Regeln für Kapitel 2
 * (Binärbäume 2.2 bis 2.4, Tiefensuche 2.5). Sind alle Tests grün, meldet der Coach das
 * Ereignis "coach-gruen" (detail = IDE-id), damit die Seite ein Abzeichen vergeben kann.
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

    function nullAbfragen(c, dateien) {
        var liste = [];
        dateien.forEach(function (d) {
            if (/==\s*null|null\s*==|!=\s*null/.test(ohneKommentare(c.datei(d)))) {
                liste.push({ art: 'tipp', titel: d + ': Abfrage auf null', text: 'Im Kompositum sind links und rechts nie null: Wo ein Teilbaum leer ist, steht ein Abschluss. Lass ihn den Sonderfall erledigen und streiche die Abfrage.' });
            }
        });
        return liste;
    }
    function gruen(c, text) { return c.alleTestsGruen ? [{ art: 'ok', titel: 'Alle Tests bestanden', text: text }] : []; }

    // ===== 2.2 Projekt Spielerverzeichnis =====
    REGELN['i12-22-spielerverzeichnis'] = {
        titel: 'Projekt Spielerverzeichnis',
        testdatei: 'BaumTest.java',
        stapelGrenze: 5000,
        tests: {
            abschlussEinfuegen: { titel: 'Abschluss.einfuegen() liefert neuen Knoten', hinweis: function () { return 'Der Abschluss ist der freie Platz ④: Er erzeugt einen neuen Knoten mit den Daten d und gibt ihn zurück.'; } },
            knotenLiefertSichSelbst: { titel: 'Knoten.einfuegen() liefert sich selbst', hinweis: function (c) {
                var r = methode(c.datei('Knoten.java'), 'BaumElement\\s+einfuegen\\s*\\(');
                if (r && /return\s+(links|rechts)\s*\.\s*einfuegen/.test(r)) return 'Du gibst die Antwort des Kindes zurück. Der Knoten muss sie aber EINTRAGEN (links = …) und dann sich selbst zurückgeben: return this.';
                return 'Kommt d vor meinem Namen, geht es links weiter. Danach bleibt der Knoten an seiner Stelle: Antwort ist er selbst (this).'; } },
            kleinerNachLinks: { titel: 'Kleinere Namen nach links', hinweis: function () { return 'daten.istGroesserAls(d) ist true, wenn MEIN Name später kommt als d. Dann gehört d nach links ②: links = Antwort von links.einfuegen(d).'; } },
            groesserNachRechts: { titel: 'Größere Namen nach rechts', hinweis: function () { return 'Sonst (d kommt später) ③: rechts = Antwort von rechts.einfuegen(d).'; } },
            tieferEinfuegen: { titel: 'Einfügen über mehrere Ebenen', hinweis: function (c) {
                var r = methode(c.datei('Knoten.java'), 'BaumElement\\s+einfuegen\\s*\\(');
                if (r && /^\s*(links|rechts)\s*\.\s*einfuegen\s*\(/m.test(r)) return 'Du rufst links.einfuegen(d) bzw. rechts.einfuegen(d) auf, trägst die Antwort aber nicht ein. Der neue Knoten hängt dann nirgends: links = links.einfuegen(d);';
                return 'Ein Knoten entscheidet nur, in welchen Teilbaum es geht. Den Rest erledigt das Kind, und seine Antwort wird eingetragen.'; } },
            gleicherNameNichtDoppelt: { titel: 'Gleicher Name wird nicht doppelt eingefügt', hinweis: function () { return '① Ist der Name gleich (daten.istGleich(d)), ändert sich nichts: sofort return this.'; } },
            binaerbaumEinfuegen: { titel: 'Binaerbaum.einfuegen()', hinweis: function () { return 'Im leeren Baum ist die Wurzel ein Abschluss. Zum Knoten wird sie nur, wenn das Verzeichnis die Antwort einträgt: wurzel = wurzel.einfuegen(d).'; } },
            elfAccounts: { titel: 'Elf Accounts an der richtigen Stelle', hinweis: function () { return 'Vergleiche mit dem Baum aus Station 2.1. Stimmt die Richtung? istGroesserAls(d) fragt, ob MEINE Daten größer sind.'; } },
            suchenAbschluss: { titel: 'Abschluss.suchen()', hinweis: function () { return 'Im Abschluss ist nichts gespeichert: Antwort null ④.'; } },
            suchenWurzel: { titel: 'Mika (Wurzel) wird gefunden', hinweis: function (c) {
                var r = methode(c.datei('Knoten.java'), 'DatenElement\\s+suchen\\s*\\(');
                if (r && /return\s+d\s*;/.test(r)) return 'Gib die gespeicherten Daten (daten) zurück, nicht den Suchbegriff d. Nur daten kennt das Level.';
                return '① Gleicher Name → Antwort: meine Daten (daten).'; } },
            suchenTief: { titel: 'Ruby und Dana werden gefunden', hinweis: function () { return 'Frag nur EIN Kind: ② kleiner → links.suchen(d), ③ sonst → rechts.suchen(d). Und gib seine Antwort mit return weiter.'; } },
            suchenNichtVorhanden: { titel: 'Olaf und Aaron gibt es nicht', hinweis: function () { return 'Kommt die Suche an einem Abschluss an, gibt es den Namen nicht. Der Knoten gibt dieses null einfach weiter.'; } },
            doppelterName: { titel: 'Zweiter Kai wird abgelehnt', hinweis: function () { return 'Binaerbaum.einfuegen prüft vorher mit suchen(d) != null. Das klappt erst, wenn suchen fertig ist.'; } }
        },
        schritte: [
            { titel: 'TODO 3a: Abschluss.einfuegen()', tests: ['abschlussEinfuegen'] },
            { titel: 'TODO 3b: Knoten.einfuegen()', tests: ['knotenLiefertSichSelbst', 'kleinerNachLinks', 'groesserNachRechts', 'tieferEinfuegen', 'gleicherNameNichtDoppelt'] },
            { titel: 'TODO 3c: Binaerbaum.einfuegen()', tests: ['binaerbaumEinfuegen', 'elfAccounts'] },
            { titel: 'TODO 5a: Knoten.suchen()', tests: ['suchenWurzel', 'suchenTief', 'suchenNichtVorhanden', 'doppelterName'] },
            { titel: 'TODO 5b: Abschluss.suchen() begründen', tests: ['suchenAbschluss'] }
        ],
        hinweise: function (c) {
            var liste = nullAbfragen(c, ['Knoten.java', 'Abschluss.java']);
            if (c.lauf && /Login \w+: Name unbekannt/.test(c.lauf.output) && /Login Ruby/.test(c.lauf.output)) {
                liste.push({ art: 'tipp', titel: 'Ruby wird nicht gefunden', text: 'Ruby ist im Verzeichnis. Steht in Knoten.suchen noch der Platzhalter (TODO 5a)?' });
            }
            if (c.lauf && /zweiter Kai registriert sich: true/.test(c.lauf.output)) {
                liste.push({ art: 'tipp', titel: 'Der zweite Kai wird angenommen', text: 'Das Verzeichnis prüft mit suchen, ob der Name vergeben ist. Solange suchen nicht fertig ist (TODO 5a), sagt es immer „frei“.' });
            }
            if (c.laeuftLange) {
                liste.push({ art: 'warnung', titel: 'Das Programm läuft sehr lange', text: 'Ruft ein Knoten versehentlich sich selbst (this.einfuegen) statt links oder rechts auf?' });
            }
            return liste.concat(gruen(c, 'Dein Verzeichnis wächst, findet und lehnt doppelte Namen ab – ganz ohne Abfrage auf null.'));
        }
    };

    // ===== 2.3 Projekt Traversierung =====
    REGELN['i12-23-traversierung'] = {
        titel: 'Projekt Traversierung',
        testdatei: 'TraversierungTest.java',
        stapelGrenze: 5000,
        tests: {
            inorderDrei: { titel: 'inorder() mit drei Namen', hinweis: function () { return 'Inorder: erst links.inorder(), dann der eigene Name mit Leerzeichen, dann rechts.inorder(). Alles mit + zu einem Text verketten.'; } },
            inorderElf: { titel: 'inorder() des Verzeichnisses', hinweis: function () { return 'Inorder muss alle Namen alphabetisch liefern. Rufst du links und rechts auf und nicht zweimal dieselbe Seite?'; } },
            preorderDrei: { titel: 'preorder() mit drei Namen', hinweis: function () { return 'Preorder: zuerst der eigene Name, dann links.preorder(), dann rechts.preorder().'; } },
            preorderElf: { titel: 'preorder() des Verzeichnisses', hinweis: function () { return 'Rufen die Teilbäume preorder() auf (nicht inorder())?'; } },
            postorderDrei: { titel: 'postorder() mit drei Namen', hinweis: function () { return 'Postorder: erst links.postorder(), dann rechts.postorder(), zuletzt der eigene Name.'; } },
            postorderElf: { titel: 'postorder() des Verzeichnisses', hinweis: function () { return 'Rufen die Teilbäume postorder() auf?'; } },
            anzahlLeer: { titel: 'anzahl() des leeren Baums', hinweis: function () { return 'Ein leerer Teilbaum (Abschluss) hat keine Knoten.'; } },
            anzahlElf: { titel: 'anzahl() des Verzeichnisses', hinweis: function () { return 'Ein Knoten zählt die Knoten links, die Knoten rechts und sich selbst.'; } }
        },
        schritte: [
            { titel: 'TODO 3a: inorder()', tests: ['inorderDrei', 'inorderElf'] },
            { titel: 'TODO 3b: preorder()', tests: ['preorderDrei', 'preorderElf'] },
            { titel: 'TODO 3c: postorder()', tests: ['postorderDrei', 'postorderElf'] },
            { titel: 'TODO 4: anzahl()', tests: ['anzahlLeer', 'anzahlElf'] },
            { titel: function (c) {
                  var n = ['inorder', 'preorder', 'postorder'].filter(function (m) { return c.gelaufen['backup_' + m]; }).length;
                  return 'Aufgabe 5: Backup mit allen drei Reihenfolgen gestartet (' + n + ' von 3)'; },
              erledigt: function (c) { return ['inorder', 'preorder', 'postorder'].every(function (m) { return c.gelaufen['backup_' + m]; }); } }
        ],
        nachLauf: function (c, lauf) {
            var m = /String\s+backup\s*=\s*verzeichnis\s*\.\s*(inorder|preorder|postorder)\s*\(/.exec(ohneKommentare(c.datei('Hauptprogramm.java')));
            if (m && !lauf.exception && !lauf.testlauf && /Gleicher Aufbau/.test(lauf.output) && /Inorder:\s+\S/.test(lauf.output)) c.gelaufen['backup_' + m[1]] = true;
        },
        hinweise: function (c) {
            var liste = nullAbfragen(c, ['Knoten.java', 'Abschluss.java']);
            if (/println\s*\(/.test(ohneKommentare(c.datei('Knoten.java')))) {
                liste.push({ art: 'tipp', titel: 'Knoten.java: println', text: 'Die Methoden sollen den Text zurückgeben (return), nicht ausgeben. Das Hauptprogramm gibt ihn aus.' });
            }
            var m = c.lauf && /Gleicher Aufbau wie das Original\? (true|false)/.exec(c.lauf.output);
            if (m && /Inorder:\s+\S/.test(c.lauf.output)) {
                liste.push({ art: 'tipp', titel: 'Backup: ' + (m[1] === 'true' ? 'gleicher Aufbau' : 'anderer Aufbau'), text: m[1] === 'true'
                    ? 'Notiere auf dem Blatt (Aufgabe 5), warum diese Reihenfolge funktioniert. Zeichne zum Vergleich die Kopie (Zeile mit BaumZeichner).'
                    : 'Zeichne die Kopie statt des Verzeichnisses (letzte Zeile) und vergleiche. Wo landet die Wurzel?' });
            }
            return liste.concat(gruen(c, 'Drei Reihenfolgen mit je drei Zeilen – nur die Position des eigenen Namens unterscheidet sie.'));
        }
    };

    // ===== 2.4 Projekt Bot-Alarm =====
    REGELN['i12-24-bot-alarm'] = {
        titel: 'Projekt Bot-Alarm',
        testdatei: 'HoeheTest.java',
        stapelGrenze: 5000,
        tests: {
            hoeheLeer: { titel: 'hoehe() des leeren Baums', hinweis: function () { return 'Ein Abschluss hat keine Ebene: Höhe 0.'; } },
            hoeheEinKnoten: { titel: 'hoehe() eines Knotens', hinweis: function () { return 'Ein Knoten ist eine Ebene, darunter kommt die größere der beiden Teilbaum-Höhen: 1 + Math.max(…, …).'; } },
            hoeheElf: { titel: 'hoehe() des Verzeichnisses (4)', hinweis: function (c) {
                var r = methode(c.datei('Knoten.java'), 'int\\s+hoehe\\s*\\(');
                if (r && /hoehe\s*\(\s*\)\s*\+\s*\w+\s*\.\s*hoehe/.test(r)) return 'Du addierst die Höhen der Teilbäume. Die Höhe hängt aber nur am LÄNGEREN Ast: Math.max statt +.';
                return 'Rufen beide Teilbäume hoehe() auf, und nimmst du die größere Antwort?'; } },
            hoeheEntartet: { titel: 'hoehe() einer Kette (5)', hinweis: function () { return 'In einer Kette hat jeder Knoten nur ein Kind. Die andere Seite ist ein Abschluss mit Höhe 0.'; } },
            hoeheSchief: { titel: 'hoehe() eines schiefen Baums (4)', hinweis: function () { return 'Es zählt der längste Ast, egal ob links oder rechts.'; } },
            ausgewogenSieben: { titel: 'ausgewogenEinfuegen() mit 7 Namen', hinweis: function () { return '① Leerer Bereich (von > bis): fertig. ② Sonst mitte = (von + bis) / 2 einfügen, ③ dann die linke Hälfte (von bis mitte - 1), ④ dann die rechte (mitte + 1 bis bis).'; } },
            ausgewogenZehn: { titel: 'ausgewogenEinfuegen() mit 10 Namen', hinweis: function () { return 'Fehlen Namen? Achte darauf, dass mitte selbst weder in der linken noch in der rechten Hälfte noch einmal vorkommt.'; } }
        },
        schritte: [
            { titel: 'TODO 3: hoehe()', tests: ['hoeheLeer', 'hoeheEinKnoten', 'hoeheElf', 'hoeheEntartet', 'hoeheSchief'] },
            { titel: 'Aufgaben 4 und 5: Bot-Welle und Zufall laufen lassen', erledigt: function (c) { return !!c.gelaufen.bots; } },
            { titel: 'TODO 6 (Selbst bauen): ausgewogenEinfuegen()', tests: ['ausgewogenSieben', 'ausgewogenZehn'] }
        ],
        nachLauf: function (c, lauf) {
            if (/Bot-Welle: 500 Accounts, Höhe 500/.test(lauf.output)) c.gelaufen.bots = true;
        },
        hinweise: function (c) {
            var liste = nullAbfragen(c, ['Knoten.java', 'Abschluss.java']);
            var u = c.lauf && c.lauf.ueberlauf;
            if (u) {
                var t = /hoehe/.test(u.methode) ? 'Ruft hoehe sich selbst auf (this.hoehe() oder hoehe()) statt links.hoehe() und rechts.hoehe()?'
                    : /ausgewogen/.test(u.methode) ? 'Wird der Bereich bei jedem Aufruf kleiner (mitte - 1 und mitte + 1)? Und hört die Methode bei von > bis auf?'
                    : 'Eine Methode ruft sich immer wieder auf. Kommt sie ihrem Abbruch näher?';
                liste.push({ art: 'fehler', titel: 'StackOverflowError in ' + u.methode, text: 'Zuletzt ' + u.aufruf + '. ' + t });
            }
            var m = c.lauf && /Zufällig: 500 Accounts, Höhe (\d+)/.exec(c.lauf.output);
            if (m) liste.push({ art: 'tipp', titel: 'Zufällige Reihenfolge: Höhe ' + m[1], text: 'Starte mehrmals: Die Höhe schwankt, bleibt aber weit unter 500. Notiere drei Werte auf dem Blatt (Aufgabe 5).' });
            if (c.laeuftLange) liste.push({ art: 'warnung', titel: 'Das Programm läuft lange', text: '500 Bots als Kette brauchen etwa 125 000 Aufrufe – ein paar Sekunden sind normal. Dauert es viel länger, prüfe hoehe().' });
            return liste.concat(gruen(c, 'Mit der Mitte zuerst bleibt der Baum niedrig: 500 Accounts in 9 Ebenen.'));
        }
    };

    // ===== 2.5 Finale Tiefensuche =====
    var WORT = String.fromCharCode(84, 65, 71, 69, 83, 76, 73, 67, 72, 84);
    REGELN['i12-25-tiefensuche'] = {
        titel: 'Finale: Der Ausgang',
        stapelGrenze: 2000,
        schritte: [
            { titel: 'TODO 1: ① Höhle als besucht markieren', erledigt: function (c) {
                var r = methode(c.datei('Graph.java'), 'boolean\\s+tiefensucheRekursiv\\s*\\(');
                return !!r && /besucht\s*\[\s*aktuellerKnoten\s*\]\s*=\s*true/.test(r); } },
            { titel: 'TODO 2: ② Ziel erreicht?', erledigt: function (c) {
                var r = methode(c.datei('Graph.java'), 'boolean\\s+tiefensucheRekursiv\\s*\\(');
                return !!r && /(aktuellerKnoten\s*==\s*zielKnoten|zielKnoten\s*==\s*aktuellerKnoten)/.test(r) && /return\s+true/.test(r); } },
            { titel: 'TODO 3: ③ ④ ⑤ Nachbarn durchsuchen', erledigt: function (c) {
                var r = methode(c.datei('Graph.java'), 'boolean\\s+tiefensucheRekursiv\\s*\\(');
                return !!r && /for\s*\(/.test(r) && /adja\s*\[\s*aktuellerKnoten\s*\]\s*\[\s*i\s*\]/.test(r) && /tiefensucheRekursiv\s*\(\s*i\s*,/.test(r); } },
            { titel: 'Programm starten: Lösungswort und „Ausgang gefunden!“', erledigt: function (c) { return !!c.gelaufen.frei; } }
        ],
        nachLauf: function (c, lauf) {
            var m = /Buchstaben auf dem Weg: ([A-Z]*)/.exec(lauf.output);
            if (m && m[1] === WORT && /Ausgang gefunden!/.test(lauf.output)) {
                c.gelaufen.frei = true;
                window.dispatchEvent(new CustomEvent('coach-gruen', { detail: 'i12-25-tiefensuche' }));
            }
        },
        hinweise: function (c) {
            var liste = [];
            var u = c.lauf && c.lauf.ueberlauf;
            if (u) {
                liste.push({ art: 'fehler', titel: 'Die Suche läuft im Kreis (StackOverflowError)', text: 'Zuletzt ' + u.aufruf + '. Wie Echo in Raum 3: Markierst du die Höhle als besucht, bevor du weitergehst? Und prüfst du vor dem Weitergehen !besucht[i]?' });
                return liste;
            }
            var m = c.lauf && /Buchstaben auf dem Weg: ([A-Z]*)/.exec(c.lauf.output);
            if (m) {
                var w = m[1], soll = WORT;
                if (w === soll && /Ausgang gefunden!/.test(c.lauf.output)) {
                    liste.push({ art: 'ok', titel: 'Du bist draußen!', text: 'Deine Tiefensuche hat den Ausgang gefunden. Gib das Lösungswort im Escape Room ein.' });
                } else if (w === soll) {
                    liste.push({ art: 'warnung', titel: 'Richtiger Weg, aber „Kein Weg zum Ausgang“', text: 'Alle Höhlen stimmen, doch die Methode meldet false. Gibst du true weiter, wenn der rekursive Aufruf das Ziel gefunden hat (⑤)?' });
                } else if (w.length <= 1) {
                    liste.push({ art: 'tipp', titel: 'Nur die Starthöhle', text: 'Die Suche geht noch nicht weiter. Fehlt die Schleife über alle Höhlen (③ bis ⑤)?' });
                } else if (soll.indexOf(w) === 0) {
                    liste.push({ art: 'tipp', titel: 'Die Suche hört zu früh auf', text: 'Nach „' + w + '“ ist Schluss. Steht ein return false in der Schleife? Eine Sackgasse heißt nur: zurück und den nächsten Nachbarn probieren. Erst nach der Schleife kommt return false (⑥).' });
                } else {
                    liste.push({ art: 'tipp', titel: 'Andere Reihenfolge: ' + w, text: 'Prüfe ④: Weiter geht es nur zu Höhle i, wenn adja[aktuellerKnoten][i] UND !besucht[i] gilt. Und ruft ⑤ die Suche mit i auf?' });
                }
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
        if (this.regeln.stapelGrenze) this.waechter();
    };

    // ---------- Stapel-Wächter (nur bei Regeln mit stapelGrenze) ----------
    // Die Online-IDE legt den Aufrufstapel im Speicher des Browsers an und kennt keine Grenze:
    // Endlose Rekursion läuft weiter, bis der Tab abstürzt (gemessen: fast 3 GB nach 30 s).
    // Der Wächter liest alle 100 ms die Aufruftiefe aus dem Interpreter, hält das Programm
    // oberhalb der Grenze an und meldet es wie Java. Interne Felder der IDE, daher alles in try.
    function wertText(v) {
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'string') return '"' + (v.length > 12 ? v.slice(0, 12) + '…' : v) + '"';
        if (v && typeof v.value === 'string') return wertText(v.value);
        return '…';
    }

    Coach.prototype.waechter = function () {
        var self = this, grenze = this.regeln.stapelGrenze;
        setInterval(function () {
            if (self.gestopptUm && Date.now() - self.gestopptUm < 1500) return;
            var i = self.intern();
            try {
                var threads = i.it.scheduler.runningThreads || [];
                for (var k = 0; k < threads.length; k++) {
                    var th = threads[k];
                    var tiefe = th && th.programStack ? th.programStack.length : 0;
                    if (tiefe > grenze) { self.ueberlauf(i, th, tiefe); return; }
                }
            } catch (e) { /* IDE noch nicht bereit oder andere Version */ }
        }, 100);
    };

    Coach.prototype.ueberlauf = function (i, th, tiefe) {
        var info = { tiefe: tiefe, methode: 'eine Methode', aufruf: 'unbekannt', parameter: '' };
        try {
            var ps = th.currentProgramState, p = ps.program;
            info.methode = p.methodIdentifierWithClass || info.methode;
            var start = ps.stackBase + (p.numberOfThisObjects || 0), werte = [];
            for (var j = 0; j < (p.numberOfParameters || 0); j++) werte.push(wertText(th.s[start + j]));
            info.parameter = werte.join(', ');
            info.aufruf = info.methode + '(' + info.parameter + ')';
        } catch (e) { /* Aufruf unbekannt */ }
        this.gestopptUm = Date.now();
        try {
            i.it.printManager.print('\nStackOverflowError: Mehr als ' + this.regeln.stapelGrenze.toLocaleString('de-DE') +
                ' Aufrufe warten gleichzeitig.\nZuletzt aufgerufen: ' + info.aufruf +
                '\n(Echtes Java bricht hier selbst ab. Die Online-IDE nicht, deshalb hat der Wächter der Website das Programm angehalten.)', true, '#ff5050');
        } catch (e) { /* Ausgabe nicht erreichbar */ }
        try { i.am.trigger('interpreter.stop'); } catch (e) { /* nichts */ }
        this.startZeit = null;
        this.laeuftLange = false;
        this.lauf = { output: '', exception: { message: 'StackOverflowError', file: null, line: null }, ueberlauf: info, zeit: Date.now() };
        if (this.regeln.nachLauf) this.regeln.nachLauf(this.kontext(), this.lauf);
        this.werte();
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
        if (ctx.alleTestsGruen && !this.gruenGemeldet) {
            this.gruenGemeldet = true;
            try { window.dispatchEvent(new CustomEvent('coach-gruen', { detail: this.id })); } catch (e) { /* alter Browser */ }
        }
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
            this.schritteEl.appendChild(h('li', { cls: 'coach-info', text: 'Starte die Tests (Knopf oben oder ▶ neben „@Test“ in ' + (this.regeln.testdatei || 'ListeTest.java') + '), dann zeigt der Coach, welche Teile schon funktionieren.' }));
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
        if (this.lauf && this.lauf.exception && !this.lauf.ueberlauf && !hinweise.some(function (x) { return x.art === 'fehler' && /Zeile/.test(x.titel); })) {
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
