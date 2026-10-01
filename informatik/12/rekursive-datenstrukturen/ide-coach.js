/*
 * IDE-Coach – dynamische Hinweise zu einem eingebetteten Online-IDE-Projekt
 *
 *   <div class="coach" data-coach="i12-13-taxizentrale"></div>
 *
 * Der Coach liest über die Zugriffsschnittstelle der Online-IDE
 * (data-java-online mit 'enableFileAccess': true, 'enableRunExitStatusAccess': true)
 *   - den aktuellen Code (getFiles),
 *   - Ausgabe, Exception (mit Datei und Zeile) und JUnit-Ergebnisse jedes Laufs,
 *   - die Fehlerliste des Compilers (aus dem IDE-Fenster)
 * und zeigt daraus eine Fortschrittsliste der TODOs und konkrete Hinweise.
 * Lösungen verrät er nicht. Die Regeln je Projekt stehen unten in REGELN.
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

    // ===== 1.1 Projekt Praxis =====
    var PRAXIS_SOLL = ['Hans', 'Vroni', 'Schorsch', 'Resi', 'Bene', 'Gustav', 'Leonie', 'Ludwig', 'Mia'];
    function aktiveVariante(ctx) {
        var m = /^\s*Wartezimmer\s+wartezimmer\s*=\s*new\s+(\w+)/m.exec(ohneKommentare(ctx.datei('Hauptprogramm.java')));
        return m ? m[1] : null;
    }
    function aufgerufen(out) {
        var r = [], re = /Aufgerufen: (\w+)/g, m;
        while ((m = re.exec(out || ''))) r.push(m[1]);
        return r;
    }
    REGELN['i12-11-praxis'] = {
        titel: 'Projekt Praxis',
        schritte: [
            { titel: function (c) {
                  var n = ['WartezimmerSuchen', 'WartezimmerNummer', 'WartezimmerAufruecken'].filter(function (v) { return c.gelaufen[v]; }).length;
                  return 'Aufgabe 1: Varianten 1 bis 3 ausprobieren (' + n + ' von 3 gestartet)'; },
              erledigt: function (c) {
                return ['WartezimmerSuchen', 'WartezimmerNummer', 'WartezimmerAufruecken'].every(function (v) { return c.gelaufen[v]; }); } },
            { titel: 'TODO 3: add() übertragen', erledigt: function (c) {
                var add = methode(c.datei('Warteschlange.java'), 'boolean\\s+add\\s*\\(');
                return !!add && /setNachfolger/.test(add) && !/^\s*return\s+false\s*;\s*$/m.test(add); } },
            { titel: 'TODO 4: poll() übertragen', erledigt: function (c) {
                var poll = methode(c.datei('Warteschlange.java'), 'Patient\\s+poll\\s*\\(');
                return !!poll && /getNachfolger/.test(poll); } },
            { titel: 'Aufgabe 5: Hauptprogramm mit new Warteschlange()', erledigt: function (c) {
                return c.gelaufen.Warteschlange === 'richtig'; } }
        ],
        hinweise: function (c) {
            var liste = [];
            var v = c.lauf && c.lauf.variante;
            if (c.lauf && v === 'WartezimmerNummer' && c.lauf.exception && /Index/.test(c.lauf.exception.message)) {
                liste.push({ art: 'tipp', titel: 'Absturz in Variante 2 – das ist Absicht', text: 'Lies die Meldung genau: Welcher Index wird angesprochen, und welche Plätze hat das Array? Notiere das Problem auf dem Blatt (Aufgabe 1).' });
            }
            if (c.lauf && v === 'Warteschlange' && !c.lauf.exception) {
                var ist = aufgerufen(c.lauf.output);
                var addStub = /^\s*return\s+false\s*;/m.test(methode(c.datei('Warteschlange.java'), 'boolean\\s+add\\s*\\(') || '');
                var pollStub = /^\s*return\s+null\s*;\s*$/m.test(methode(c.datei('Warteschlange.java'), 'Patient\\s+poll\\s*\\(') || '') &&
                               !/getNachfolger/.test(methode(c.datei('Warteschlange.java'), 'Patient\\s+poll\\s*\\(') || '');
                if (ist.length === 0 && addStub) {
                    liste.push({ art: 'warnung', titel: 'Niemand wird aufgerufen', text: 'In add() steht noch der Platzhalter return false;. Die Schlange bleibt leer. Übertrage add() vom Blatt (TODO 3).' });
                } else if (ist.length === 0 && pollStub) {
                    liste.push({ art: 'warnung', titel: 'Niemand wird aufgerufen', text: 'poll() liefert noch immer null (Platzhalter). Übertrage poll() vom Blatt (TODO 4).' });
                } else if (ist.length && ist.join() !== PRAXIS_SOLL.join()) {
                    var fehlt = PRAXIS_SOLL.filter(function (n) { return ist.indexOf(n) < 0; });
                    liste.push({ art: 'warnung', titel: 'Die Reihenfolge stimmt noch nicht',
                        text: 'Erwartet: ' + PRAXIS_SOLL.join(', ') + '. Aufgerufen wurden: ' + ist.join(', ') + (fehlt.length ? '. Es fehlen: ' + fehlt.join(', ') : '') + '.',
                        mehr: 'Prüfe die Reihenfolge von Schritt ② und ③ in add(): Erst bekommt der alte letzte Knoten den Nachfolger, dann rückt ende weiter. In der Zeiger-Werkstatt kannst du die Fehlerversion „② und ③ vertauscht“ ansehen.' });
                } else if (ist.join() === PRAXIS_SOLL.join()) {
                    liste.push({ art: 'ok', titel: 'Die Warteschlange arbeitet richtig', text: 'Alle neun werden in der Reihenfolge ihrer Ankunft aufgerufen, auch Mia. Vergleiche jetzt mit Variante 3 (Aufgabe 5).' });
                }
            }
            if (c.lauf && c.lauf.exception && NULL_MELDUNG.test(c.lauf.exception.message) && c.lauf.exception.file === 'Warteschlange.java') {
                var z = c.lauf.exception.zeileText;
                if (/ende\s*\.\s*setNachfolger/.test(z)) {
                    liste.push({ art: 'fehler', titel: 'Zugriff auf null in add()', text: 'ende ist null, wenn die Schlange leer ist. Fehlt der Sonderfall „if (isEmpty())“ vor Schritt ②?' });
                } else if (/anfang\s*\.\s*get/.test(z)) {
                    liste.push({ art: 'fehler', titel: 'Zugriff auf null in poll()', text: 'anfang ist null, wenn niemand wartet. Prüfst du zuerst mit isEmpty(), ob die Schlange leer ist?' });
                }
            }
            return liste;
        },
        nachLauf: function (c, lauf) {
            lauf.variante = aktiveVariante(c);
            if (lauf.variante === 'Warteschlange') {
                c.gelaufen.Warteschlange = (!lauf.exception && aufgerufen(lauf.output).join() === PRAXIS_SOLL.join()) ? 'richtig' : (c.gelaufen.Warteschlange || 'falsch');
            } else if (lauf.variante) {
                c.gelaufen[lauf.variante] = true;
            }
        }
    };

    // ===== 1.2 Projekt Taxistand =====
    function implementiert(code, klasse) {
        return new RegExp('class\\s+' + klasse + '\\s+implements\\s+([\\w\\s,]*\\b)?DatenElement\\b').test(ohneKommentare(code));
    }
    function nutztPatient(code) { return /\bPatient\b/.test(ohneKommentare(code)); }
    function hatMethode(code, kopf) { return new RegExp(kopf).test(ohneKommentare(code)); }
    REGELN['i12-12-taxistand'] = {
        titel: 'Projekt Taxistand',
        schritte: [
            { titel: 'TODO 3a: Vertrag DatenElement festlegen', erledigt: function (c) {
                return hatMethode(c.datei('DatenElement.java'), 'String\\s+gibSchluesselwert\\s*\\(\\s*\\)\\s*;'); } },
            { titel: 'TODO 3b: Patient implementiert DatenElement', erledigt: function (c) {
                return implementiert(c.datei('Patient.java'), 'Patient') && hatMethode(c.datei('Patient.java'), 'String\\s+gibSchluesselwert\\s*\\(\\s*\\)\\s*\\{'); } },
            { titel: 'TODO 3c: Knoten trägt DatenElemente', erledigt: function (c) {
                return !nutztPatient(c.datei('Knoten.java')) && /DatenElement/.test(ohneKommentare(c.datei('Knoten.java'))); } },
            { titel: 'TODO 3d: Warteschlange verwaltet DatenElemente', erledigt: function (c) {
                var w = c.datei('Warteschlange.java');
                return !nutztPatient(w) && /gibSchluesselwert/.test(ohneKommentare(w)); } },
            { titel: 'TODO 4: Taxis stehen am Taxistand', erledigt: function (c) {
                return !!c.lauf && !c.lauf.exception && /--- Taxistand ---\n\s+1\. Taxi 12/.test(c.lauf.output || ''); } }
        ],
        fehler: [
            { muster: /Es konnte keine passende Methode/, text: function (m, f, c) {
                var z = c.zeile(f.file, f.line);
                if (f.file === 'Warteschlange.java' && /getName/.test(z)) {
                    return 'Ein DatenElement kennt nur, was im Vertrag steht: gibSchluesselwert(). getName() gibt es nur bei Patient. Passe ausgeben() an (TODO 3d).';
                }
                if (/new\s+Patient/.test(z) && !implementiert(c.datei('Patient.java'), 'Patient')) {
                    return 'Die Warteschlange erwartet jetzt ein DatenElement. Patient ist aber noch keins: Ergänze „implements DatenElement“ (TODO 3b).';
                }
                if (/new\s+Taxi/.test(z) && !implementiert(c.datei('Taxi.java'), 'Taxi')) {
                    return 'Die Warteschlange erwartet ein DatenElement. Taxi ist noch keins: Ergänze „implements DatenElement“ und die Vertragsmethode (TODO 4). Auch eine Methode gibSchluesselwert() allein genügt nicht – erst implements schließt den Vertrag.';
                }
                if (/\.\s*add\s*\(/.test(z) && nutztPatient(c.datei('Warteschlange.java'))) {
                    return 'add erwartet noch einen Patient. Ändere in der Warteschlange den Parametertyp in DatenElement (TODO 3d).';
                }
                return null;
            } }
        ],
        hinweise: function (c) {
            var liste = [];
            var de = c.datei('DatenElement.java');
            if (/gibSchluesselwert\s*\([^)]*\)\s*\{/.test(ohneKommentare(de))) {
                liste.push({ art: 'warnung', titel: 'Methode mit Rumpf im Interface', text: 'Im Interface steht nur der Methodenkopf mit Semikolon. Den Rumpf schreibt jede Klasse selbst.' });
            }
            ['Taxi', 'Patient'].forEach(function (k) {
                if (/\bint\s+gibSchluesselwert\s*\(/.test(ohneKommentare(c.datei(k + '.java')))) {
                    liste.push({ art: 'fehler', titel: k + ': falscher Rückgabetyp', text: 'Der Vertrag verlangt String gibSchluesselwert(). Echtes Java würde int hier ablehnen; unsere Online-IDE meldet es leider nicht und gibt dann „undefined“ aus.' });
                }
            });
            if (c.lauf && /undefined/.test(c.lauf.output || '')) {
                liste.push({ art: 'warnung', titel: '„undefined“ in der Ausgabe', text: 'Eine Methode liefert keinen gültigen String. Gibt gibSchluesselwert() wirklich einen String zurück, z. B. "Taxi " + nummer?' });
            }
            var knotenFertig = !nutztPatient(c.datei('Knoten.java'));
            var wsFertig = !nutztPatient(c.datei('Warteschlange.java'));
            if (knotenFertig !== wsFertig && c.fehler.length) {
                liste.push({ art: 'tipp', titel: 'Halb umgebaut', text: 'Knoten und Warteschlange gehören zusammen: Beide müssen von Patient auf DatenElement umgestellt werden, sonst passen die Typen nicht zueinander.' });
            }
            if (/\/\/\s*taxistand\.add/.test(c.datei('Hauptprogramm.java')) && implementiert(c.datei('Taxi.java'), 'Taxi') && !c.fehler.length) {
                liste.push({ art: 'tipp', titel: 'Bereit für die Taxis', text: 'Taxi erfüllt den Vertrag. Kommentiere im Hauptprogramm die Taxi-Zeilen ein (TODO 4).' });
            }
            if (c.lauf && !c.lauf.exception && /Fahrgast steigt ein bei: Taxi 12/.test(c.lauf.output || '')) {
                liste.push({ art: 'ok', titel: 'Eine Warteschlange für alles', text: 'Patienten und Taxis stehen in derselben Klasse Warteschlange, ohne dass sie Patient oder Taxi kennt. Probiere Aufgabe 5 direkt im Hauptprogramm aus.' });
            }
            return liste;
        }
    };

    // ===== 1.3 Projekt Taxizentrale =====
    REGELN['i12-13-taxizentrale'] = {
        titel: 'Projekt Taxizentrale',
        tests: {
            laengeKnotenkette: { titel: 'Knoten.laenge() zählt die Kette', hinweis: function () { return 'Jeder Knoten fragt seinen Nachfolger nach dessen Länge und zählt sich selbst dazu (+ 1).'; } },
            laengeLetzterKnoten: { titel: 'Der letzte Knoten antwortet 1', hinweis: function () { return 'Abbruchbedingung: Hat ein Knoten keinen Nachfolger, ist er allein – Länge 1.'; } },
            laengeLeereListe: { titel: 'Leere Liste hat Länge 0', hinweis: function () { return 'Liste.laenge(): Ist anfang null, gibt es keinen Knoten, den man fragen könnte.'; } },
            addInLeereListe: { titel: 'add() in eine leere Liste', hinweis: function () { return 'Liste.add(): Sonderfall leere Liste – dann wird der neue Knoten zum anfang. Und denk an return true.'; } },
            addHaengtHintenAn: { titel: 'add() hängt hinten an', hinweis: function () { return 'Knoten.add(): Nur der letzte Knoten (nachfolger == null) hängt den neuen Knoten an. Alle anderen geben den Auftrag an ihren Nachfolger weiter.'; } },
            laengeNachAdd: { titel: 'laenge() nach drei add()', hinweis: function () { return 'Erst laenge() und add() fertigstellen, dann klappt das hier von selbst.'; } },
            enthaeltGleichesTaxi: { titel: 'enthaelt() findet ein gleiches Taxi', hinweis: function (c) {
                var k = ohneKommentare(c.datei('Knoten.java'));
                if (/daten\s*==\s*d\b|d\s*==\s*daten/.test(k)) return 'Gleich oder dasselbe? == prüft, ob es dasselbe Objekt ist. Gesucht wird ein neues Taxi mit gleichem Inhalt: Verwende daten.istGleich(d).';
                return 'Prüft jeder Knoten zuerst seine eigenen Daten mit istGleich und fragt erst dann den Nachfolger?'; } },
            enthaeltNichtVorhanden: { titel: 'enthaelt() findet nichts Falsches', hinweis: function () { return 'Am Ende der Liste (nachfolger == null) war die Suche erfolglos: false.'; } },
            enthaeltLeereListe: { titel: 'enthaelt() in leerer Liste', hinweis: function () { return 'Liste.enthaelt(): In der leeren Liste (anfang == null) ist nichts enthalten.'; } },
            entfernenMitte: { titel: 'entfernen() in der Mitte', hinweis: function (c) {
                var k = ohneKommentare(c.datei('Knoten.java'));
                if (/getDaten\(\)\s*==\s*d/.test(k)) return 'Gleich oder dasselbe? Vergleiche mit istGleich statt mit ==.';
                return 'Vorausschau: Ein Knoten prüft die Daten seines Nachfolgers. Passen sie, überspringt er ihn: nachfolger = nachfolger.getNachfolger();'; } },
            entfernenErstes: { titel: 'entfernen() des ersten Taxis', hinweis: function () { return 'Den ersten Knoten kann kein Vorgänger aushängen. Das muss die Liste selbst tun (Sonderfall mit anfang).'; } },
            entfernenLetztes: { titel: 'entfernen() des letzten Taxis', hinweis: function () { return 'Auch der letzte Knoten wird von seinem Vorgänger ausgehängt. Prüfst du die Daten des Nachfolgers mit istGleich?'; } },
            entfernenNichtVorhanden: { titel: 'entfernen() ohne Treffer', hinweis: function () { return 'Kommt die Suche am Ende an (nachfolger == null), gibt es nichts zu entfernen: false, und die Liste bleibt unverändert.'; } }
        },
        schritte: [
            { titel: 'TODO 2: laenge()', tests: ['laengeKnotenkette', 'laengeLetzterKnoten', 'laengeLeereListe'] },
            { titel: 'TODO 3: add()', tests: ['addInLeereListe', 'addHaengtHintenAn', 'laengeNachAdd'] },
            { titel: 'TODO 4: istGleich und enthaelt()', tests: ['enthaeltGleichesTaxi', 'enthaeltNichtVorhanden', 'enthaeltLeereListe'] },
            { titel: 'TODO 5: entfernen()', tests: ['entfernenMitte', 'entfernenErstes', 'entfernenLetztes', 'entfernenNichtVorhanden'] }
        ],
        fehler: [
            { muster: /muss noch folgende Methoden des Interfaces\s*DatenElement\s*implementieren:\s*boolean istGleich/, text: function () {
                return 'Du hast den Vertrag um istGleich erweitert (TODO 4a). Jetzt muss jede Klasse, die DatenElement implementiert, die neue Methode haben: Ergänze istGleich in Taxi (TODO 4b).'; } }
        ],
        hinweise: function (c) {
            var liste = [];
            var ex = c.lauf && c.lauf.exception;
            if (ex && NULL_MELDUNG.test(ex.message)) {
                if (ex.file === 'Knoten.java' && /nachfolger\s*\./.test(ex.zeileText)) {
                    liste.push({ art: 'fehler', titel: 'Knoten.java, Zeile ' + ex.line + ': Zugriff auf null', text: 'Beim letzten Knoten ist nachfolger null. Fehlt vor dem rekursiven Aufruf die Abbruchbedingung „if (nachfolger == null)“?', mehr: 'Ohne Abbruchbedingung gibt jeder Knoten den Auftrag weiter – auch der letzte, an „niemanden“. Probiere es in der Rekursions-Werkstatt mit „ohne Abbruchbedingung“ aus.' });
                } else if (ex.file === 'Liste.java' && /anfang\s*\./.test(ex.zeileText)) {
                    liste.push({ art: 'fehler', titel: 'Liste.java, Zeile ' + ex.line + ': Zugriff auf null', text: 'In der leeren Liste ist anfang null. Fehlt der Sonderfall „if (anfang == null)“?' });
                } else if (/getDaten\(\)\s*\./.test(ex.zeileText) || /nachfolger\.getDaten/.test(ex.zeileText)) {
                    liste.push({ art: 'fehler', titel: ex.file + ', Zeile ' + ex.line + ': Zugriff auf null', text: 'Vorausschau ohne Prüfung: Gibt es den Nachfolger überhaupt, bevor du seine Daten liest?' });
                }
            }
            var de = ohneKommentare(c.datei('DatenElement.java'));
            if (!/istGleich/.test(de) && /istGleich/.test(ohneKommentare(c.datei('Knoten.java')))) {
                liste.push({ art: 'tipp', titel: 'istGleich steht noch nicht im Vertrag', text: 'Knoten benutzt istGleich, aber DatenElement verlangt die Methode noch nicht. Ergänze den Methodenkopf im Interface (TODO 4a).' });
            }
            if (c.laeuftLange) {
                liste.push({ art: 'warnung', titel: 'Das Programm läuft sehr lange', text: 'Ruft sich eine Methode endlos selbst auf? Jede rekursive Methode braucht eine Abbruchbedingung, und der rekursive Aufruf muss dem Ende näherkommen (nachfolger statt this).' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Deine Liste kann zählen, anhängen, suchen und entfernen. Zähle einmal, wie viele Abfragen auf null in deinem Code stehen – darum geht es in 1.4.' });
            }
            return liste;
        }
    };

    // ===== 1.4 Projekt Kompositum =====
    REGELN['i12-14-kompositum'] = {
        titel: 'Projekt Kompositum',
        tests: {
            laengeAbschluss: { titel: 'Abschluss.laenge()', hinweis: function () { return 'Ab dem Abschluss gibt es keine Knoten mehr. Was ist also die Länge?'; } },
            laengeKnotenkette: { titel: 'Knoten.laenge()', hinweis: function () { return 'Ohne if: Frage den Nachfolger und zähle dich dazu. Den Abbruch erledigt der Abschluss.'; } },
            enthaeltAbschluss: { titel: 'Abschluss.enthaelt()', hinweis: function () { return 'Im Abschluss ist nichts gespeichert. Kommt die Suche hier an, war sie erfolglos.'; } },
            enthaeltKnotenkette: { titel: 'Knoten.enthaelt()', hinweis: function () { return 'Eigene Daten prüfen (istGleich), sonst den Nachfolger fragen. Eine Abfrage auf null brauchst du nicht.'; } },
            addAbschlussLiefertNeuenKnoten: { titel: 'Abschluss.add() liefert neuen Knoten', hinweis: function () { return 'Der Abschluss erzeugt den neuen Knoten, trägt sich selbst (this) als dessen Nachfolger ein und gibt den neuen Knoten zurück.'; } },
            addKnotenLiefertSichSelbst: { titel: 'Knoten.add() liefert sich selbst', hinweis: function (c) {
                var add = methode(c.datei('Knoten.java'), 'ListenElement\\s+add\\s*\\(');
                if (add && /return\s+nachfolger\s*\.\s*add/.test(add)) return 'Du gibst den Rest der Liste zurück statt dich selbst. Trage die Rückgabe als nachfolger ein und gib this zurück.';
                return 'Rest erweitern: nachfolger = nachfolger.add(d); danach steht an deiner Stelle weiterhin du – also return this.'; } },
            addListe: { titel: 'Liste.add()', hinweis: function (c) {
                var add = methode(c.datei('Liste.java'), 'boolean\\s+add\\s*\\(');
                if (add && /anfang\s*\.\s*add/.test(add) && !/anfang\s*=\s*anfang\s*\.\s*add/.test(add)) return 'Du rufst anfang.add(d) auf, speicherst die Rückgabe aber nicht. In der leeren Liste muss anfang danach auf den neuen Knoten zeigen.';
                return 'Liste.add(): anfang.add(d) aufrufen und die Rückgabe in anfang speichern.'; } },
            entfernenMitte: { titel: 'entfernen() in der Mitte', hinweis: function () { return 'Hat ein Knoten die gesuchten Daten, gibt er seinen Nachfolger zurück – so wird er übersprungen. Sonst: nachfolger = nachfolger.entfernen(d); return this;'; } },
            entfernenErstes: { titel: 'entfernen() des ersten Taxis', hinweis: function () { return 'Liste.entfernen speichert die Rückgabe in anfang. Gibt der erste Knoten bei einem Treffer seinen Nachfolger zurück?'; } },
            entfernenLetztes: { titel: 'entfernen() des letzten Taxis', hinweis: function () { return 'Der letzte Knoten gibt bei einem Treffer seinen Nachfolger zurück – den Abschluss.'; } },
            entfernenNichtVorhanden: { titel: 'entfernen() ohne Treffer', hinweis: function () { return 'Kommt die Suche beim Abschluss an, gab es nichts: Der Abschluss gibt sich selbst zurück, alle Knoten geben this zurück.'; } }
        },
        schritte: [
            { titel: 'TODO 3: laenge() und enthaelt()', tests: ['laengeAbschluss', 'laengeKnotenkette', 'enthaeltAbschluss', 'enthaeltKnotenkette'] },
            { titel: 'TODO 4: add() mit Rückgabe', tests: ['addAbschlussLiefertNeuenKnoten', 'addKnotenLiefertSichSelbst', 'addListe'] },
            { titel: 'TODO 5: entfernen()', tests: ['entfernenMitte', 'entfernenErstes', 'entfernenLetztes', 'entfernenNichtVorhanden'] }
        ],
        hinweise: function (c) {
            var liste = [];
            ['Knoten.java', 'Abschluss.java', 'Liste.java'].forEach(function (d) {
                if (/==\s*null|null\s*==|!=\s*null/.test(ohneKommentare(c.datei(d)))) {
                    liste.push({ art: 'tipp', titel: d + ': Abfrage auf null', text: 'Im Kompositum ist nachfolger nie null – am Ende steht immer der Abschluss. Lass ihn den Sonderfall erledigen und streiche die Abfrage.' });
                }
            });
            var ex = c.lauf && c.lauf.exception;
            if (ex && NULL_MELDUNG.test(ex.message)) {
                var abAdd = methode(c.datei('Abschluss.java'), 'ListenElement\\s+add\\s*\\(');
                if (abAdd && !/setNachfolger\s*\(\s*this\s*\)/.test(abAdd)) {
                    liste.push({ art: 'fehler', titel: ex.file + ', Zeile ' + ex.line + ': Zugriff auf null', text: 'Der neue Knoten hat noch keinen Nachfolger. Abschluss.add muss sich selbst als Nachfolger des neuen Knotens eintragen: neu.setNachfolger(this).' });
                } else {
                    liste.push({ art: 'fehler', titel: ex.file + ', Zeile ' + ex.line + ': Zugriff auf null', text: 'Irgendwo ist ein nachfolger noch null. Bekommt jeder neue Knoten einen Nachfolger?' });
                }
            }
            if (c.laeuftLange) {
                liste.push({ art: 'warnung', titel: 'Das Programm läuft sehr lange', text: 'Gibt der Abschluss in allen Methoden ein Ergebnis zurück, ohne weiter zu fragen? Ruft ein Knoten versehentlich sich selbst (this) statt seinen Nachfolger auf?' });
            }
            if (c.alleTestsGruen) {
                liste.push({ art: 'ok', titel: 'Alle Tests bestanden', text: 'Keine einzige Abfrage auf null mehr nötig: Knoten und Abschluss teilen sich die Fälle. Genau so funktionieren später auch Binärbäume.' });
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
            this.schritteEl.appendChild(h('li', { cls: 'coach-info', text: 'Starte die Tests (Knopf oben oder ▶ neben „@Test“ in ListeTest.java), dann zeigt der Coach, welche Teile schon funktionieren.' }));
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
