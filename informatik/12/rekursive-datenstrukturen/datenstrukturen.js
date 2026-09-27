/*
 * Rekursive Datenstrukturen (Informatik 12) – interaktive Elemente der Stationsseiten
 *
 *   Zeiger-Werkstatt (1.1)   <div data-zeigerwerkstatt>
 *     führt add(...) und poll() einer verketteten Warteschlange Zeile für Zeile aus
 *     (Code wie auf Blatt 1.1) und zeichnet nach jedem Schritt alle Verweise neu.
 *     Zusätzlich gibt es typische Fehlerversionen zum Ausprobieren.
 *
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var NAMEN = ['Gustav', 'Leonie', 'Ludwig', 'Mia', 'Hans', 'Vroni', 'Schorsch', 'Resi', 'Bene'];
    var MAX_KNOTEN = 6;                       // mehr passt nicht ins Bild
    var B = 84, H_KOPF = 18, H_RUMPF = 26;   // Knotengröße
    var SCHRITT = 104;                        // Abstand der Knoten
    var X0 = 160, Y1 = 70;                    // erster Knoten, obere Kante der Reihe
    var zaehler = 0;

    function el(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }

    function name(z, id) { return id === null ? 'null' : z.knoten[id].name; }

    function neuerKnoten(z) {
        var id = z.naechsteId++;
        z.knoten[id] = { id: id, name: z.patient, next: null };
        z.neu = id;
    }

    function npe(z, text) {
        z.fehler = 'NullPointerException';
        z.neu = null;          // die lokale Variable verschwindet mit dem Abbruch
        return { info: 'Das Programm bricht in dieser Zeile ab: ' + text + ' Der neue Knoten geht verloren.', ende: true };
    }

    // ---------- Programme: [Codezeile, Ausführung] – Ausführung liefert { info, weiter, ende } ----------
    var ZEILE_ADD_1 = ['   Knoten neu = new Knoten(p);      // ①', function (z) {
        neuerKnoten(z); z.markiert = ['neu'];
        return { info: '① Ein neuer Knoten mit den Daten von ' + z.patient + ' entsteht. Sein nachfolger ist null. Bisher verweist nur die lokale Variable neu auf ihn.' };
    }];
    var ZEILE_ADD_2 = ['      ende.setNachfolger(neu);      // ②', function (z) {
        if (z.ende === null) return npe(z, 'ende ist null, es gibt keinen letzten Knoten.');
        var alt = z.ende;
        z.knoten[alt].next = z.neu; z.markiert = ['nf-' + alt];
        if (alt === z.neu) {
            return { info: '② Aber ende ist schon der neue Knoten: ' + z.patient + ' wird sein eigener Nachfolger! Der bisher letzte Knoten zeigt weiter auf null. Die Kette ist gerissen.' };
        }
        return { info: '② Der bisher letzte Knoten (' + name(z, alt) + ') bekommt neu als Nachfolger. Die Kette ist ein Glied länger.' };
    }];
    var ZEILE_ADD_3 = ['      ende = neu;                   // ③', function (z) {
        var fertigVerkettet = z.ende === null || z.knoten[z.ende].next === z.neu;
        z.ende = z.neu; z.markiert = ['ende'];
        return { info: fertigVerkettet
            ? '③ ende rückt auf den neuen Knoten weiter.'
            : '③ Zu früh: ende verweist schon auf den neuen Knoten, bevor er an die Kette gehängt wurde. Auf den bisher letzten Knoten kommt man jetzt nur noch über die Kette.' };
    }];
    var ZEILE_ADD_RETURN = ['   return true;', function (z) {
        z.neu = null; z.markiert = [];
        z.rueck = 'add(' + z.patient + ') gibt true zurück.';
        return { info: 'Die lokale Variable neu verschwindet. Der Knoten bleibt erreichbar, solange ein Verweis auf ihn zeigt.', ende: true };
    }];

    function addProgramm(version) {
        if (version === 'ohneSonderfall') {
            return [
                ['public boolean add(Patient p) {'],
                ZEILE_ADD_1,
                [ZEILE_ADD_2[0].slice(3), ZEILE_ADD_2[1]],
                [ZEILE_ADD_3[0].slice(3), ZEILE_ADD_3[1]],
                ZEILE_ADD_RETURN,
                ['}']
            ];
        }
        var zweig = version === 'vertauscht' ? [ZEILE_ADD_3, ZEILE_ADD_2] : [ZEILE_ADD_2, ZEILE_ADD_3];
        return [
            ['public boolean add(Patient p) {'],
            ZEILE_ADD_1,
            ['   if (isEmpty()) {', function (z) {
                var leer = z.anfang === null;
                z.markiert = [];
                return { info: 'isEmpty() prüft anfang == null. ' + (leer ? 'Die Schlange ist leer: Sonderfall.' : 'Es wartet schon jemand: weiter im else-Teil.'), weiter: leer ? 3 : 6 };
            }],
            ['      anfang = neu;', function (z) {
                z.anfang = z.neu; z.markiert = ['anfang'];
                return { info: 'anfang verweist auf den neuen Knoten.' };
            }],
            ['      ende = neu;', function (z) {
                z.ende = z.neu; z.markiert = ['ende'];
                return { info: 'ende auch: Bei nur einem Knoten ist er erster und letzter zugleich.', weiter: 9 };
            }],
            ['   } else {'],
            zweig[0],
            zweig[1],
            ['   }'],
            ZEILE_ADD_RETURN,
            ['}']
        ];
    }

    function pollProgramm(version) {
        var zeilen = [
            ['public Patient poll() {'],
            ['   if (isEmpty()) {', function (z) {
                var leer = z.anfang === null;
                z.markiert = [];
                return { info: 'isEmpty() prüft anfang == null. ' + (leer ? 'Die Schlange ist leer.' : 'Es wartet jemand: weiter im else-Teil.'), weiter: leer ? 2 : 4 };
            }],
            ['      return null;', function (z) {
                z.rueck = 'poll() gibt null zurück: Niemand wartet.';
                return { info: 'Es gibt nichts herauszuholen.', ende: true };
            }],
            ['   } else {'],
            ['      Patient p = anfang.getDaten();      // ①', function (z) {
                z.p = z.anfang; z.markiert = ['p'];
                return { info: '① p merkt sich die Daten des ersten Knotens: ' + name(z, z.anfang) + '.' };
            }],
            ['      anfang = anfang.getNachfolger();    // ②', function (z) {
                var alt = z.anfang;
                z.anfang = z.knoten[alt].next; z.markiert = ['anfang'];
                var text = '② anfang rückt weiter auf ' + name(z, z.anfang) + '.';
                if (z.ende !== alt) text += ' Auf den Knoten von ' + name(z, alt) + ' verweist nichts mehr (grau): Java räumt ihn automatisch weg. p verweist weiter auf die Daten.';
                return { info: text };
            }]
        ];
        if (version !== 'ohneDrei') {
            zeilen.push(['      if (anfang == null) {               // ③', function (z) {
                var leer = z.anfang === null;
                z.markiert = [];
                return { info: '③ ' + (leer ? 'anfang ist null: Das war der letzte Knoten. Also muss auch ende geleert werden.' : 'anfang ist nicht null: ende bleibt, wie es ist.'), weiter: leer ? 7 : 9 };
            }]);
            zeilen.push(['         ende = null;', function (z) {
                var alt = z.ende;
                z.ende = null; z.markiert = ['ende'];
                var text = 'Jetzt ist auch ende null. Der letzte Knoten hat keinen Verweis mehr (grau).';
                if (alt !== null && alt !== z.p) text += ' Auch ' + name(z, alt) + ' ist damit verloren und wurde nie aufgerufen!';
                return { info: text };
            }]);
            zeilen.push(['      }']);
        }
        zeilen.push(['      return p;                           // ④', function (z) {
            var n = name(z, z.p);
            var haengt = z.anfang === null && z.ende !== null;
            z.rueck = 'poll() gibt ' + n + ' zurück.';
            z.p = null; z.markiert = [];
            return { info: haengt
                ? '④ Achtung: ende verweist noch auf den entfernten Knoten von ' + n + '. Er kann nicht gelöscht werden, obwohl er nicht mehr in der Schlange ist. (add funktioniert trotzdem, weil isEmpty() nur anfang prüft.)'
                : '④ Die Daten von ' + n + ' werden zurückgegeben.', ende: true };
        }]);
        zeilen.push(['   }']);
        zeilen.push(['}']);
        return zeilen;
    }

    // ---------- Erreichbarkeit und Anordnung ----------
    function erreichbar(z, start, besucht) {
        var id = start;
        while (id !== null && besucht.indexOf(id) < 0) {
            besucht.push(id);
            id = z.knoten[id].next;
        }
        return besucht;
    }

    // Alle Knoten in einer Reihe: der gerade entfernte erste Knoten bleibt vorne stehen,
    // dann die Kette ab anfang, dann Knoten, die nur über neu oder ende erreichbar sind.
    function anordnung(z) {
        var kette = erreichbar(z, z.anfang, []);
        var rest = Object.keys(z.knoten).map(Number).sort(function (a, b) { return a - b; })
            .filter(function (id) { return kette.indexOf(id) < 0; });
        var vor = rest.filter(function (id) { return kette.length && z.knoten[id].next === kette[0]; });
        var hinten = rest.filter(function (id) { return vor.indexOf(id) < 0 && (id === z.neu || id === z.ende); });
        var sonst = rest.filter(function (id) { return vor.indexOf(id) < 0 && hinten.indexOf(id) < 0; });
        var pos = {};
        vor.concat(kette, hinten, sonst).forEach(function (id, i) { pos[id] = { x: X0 + i * SCHRITT, y: Y1 }; });
        return pos;
    }

    function verwaiste(z) {
        var lebend = [];
        [z.anfang, z.ende, z.neu].forEach(function (w) { if (w !== null) erreichbar(z, w, lebend); });
        return Object.keys(z.knoten).map(Number).filter(function (id) { return lebend.indexOf(id) < 0; });
    }

    // ---------- Zeichnen ----------
    function zeichne(svg, z, mid) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var defs = el('defs', {}, svg);
        [['p', '#4338ca'], ['nf', '#475569'], ['lokal', '#0891b2'], ['hl', '#d97706']].forEach(function (m) {
            var mk = el('marker', { id: mid + m[0], viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 10, markerHeight: 10, orient: 'auto-start-reverse' }, defs);
            el('path', { d: 'M0,0 L10,5 L0,10 z', fill: m[1] }, mk);
        });
        var pos = anordnung(z);
        var grau = verwaiste(z);

        function pfeil(d, art, schluessel) {
            var hl = z.markiert.indexOf(schluessel) >= 0;
            el('path', { d: d, 'class': 'pfeil ' + art + (hl ? ' neu-gesetzt' : ''), 'marker-end': 'url(#' + mid + (hl ? 'hl' : art) + ')' }, svg);
        }

        // Warteschlangen-Objekt
        el('rect', { x: 12, y: Y1 - 4, width: 118, height: 18, 'class': 'ws-kopf' }, svg);
        el('text', { x: 71, y: Y1 + 5, 'class': 'klein' }, svg, 'ws : Warteschlange');
        el('rect', { x: 12, y: Y1 + 14, width: 118, height: 42, 'class': 'ws-rumpf' }, svg);
        el('text', { x: 20, y: Y1 + 26, 'class': 'klein links mono' }, svg, 'anfang');
        el('text', { x: 20, y: Y1 + 45, 'class': 'klein links mono' }, svg, 'ende');

        // anfang
        var yA = Y1 + 26, yE = Y1 + 45, yMitte = H_KOPF + H_RUMPF / 2;
        if (z.anfang === null) {
            el('text', { x: 138, y: yA, 'class': 'null links' }, svg, 'null');
        } else {
            var pa = pos[z.anfang];
            pfeil(pa.x === X0
                ? 'M130,' + yA + ' C145,' + yA + ' ' + (pa.x - 20) + ',' + (pa.y + yMitte) + ' ' + (pa.x - 2) + ',' + (pa.y + yMitte)
                : 'M130,' + yA + ' H140 V' + (Y1 - 9) + ' H' + (pa.x + 22) + ' V' + (pa.y - 3), 'p', 'anfang');   // über den entfernten Knoten hinweg
        }
        // ende: unter der Kette entlang zum Ziel
        if (z.ende === null) {
            el('text', { x: 138, y: yE, 'class': 'null links' }, svg, 'null');
        } else {
            var cx = pos[z.ende].x + B / 2 + 22;
            pfeil('M130,' + yE + ' H142 V' + (Y1 + 84) + ' H' + cx + ' V' + (Y1 + H_KOPF + H_RUMPF + 3), 'p', 'ende');
        }

        // Knoten
        Object.keys(z.knoten).map(Number).forEach(function (id) {
            var k = z.knoten[id], p = pos[id];
            var g = el('g', { 'class': (grau.indexOf(id) >= 0 ? 'verwaist' : '') + (k.next === id ? ' kaputt' : '') }, svg);
            el('rect', { x: p.x, y: p.y, width: B, height: H_KOPF, 'class': 'kopf' }, g);
            el('text', { x: p.x + B / 2, y: p.y + 9, 'class': 'klein' }, g, 'Knoten');
            el('rect', { x: p.x, y: p.y + H_KOPF, width: B, height: H_RUMPF, 'class': 'rumpf' }, g);
            el('text', { x: p.x + B / 2, y: p.y + yMitte }, g, k.name);
            if (grau.indexOf(id) >= 0) el('text', { x: p.x + B / 2, y: p.y - 20, 'class': 'gc' }, svg, 'kein Verweis');
        });

        // nachfolger
        Object.keys(z.knoten).map(Number).forEach(function (id) {
            var k = z.knoten[id], p = pos[id];
            var x1 = p.x + B, y1 = p.y + yMitte;
            if (k.next === null) {
                el('text', { x: x1 + 5, y: y1, 'class': 'null links' }, svg, 'null');
                return;
            }
            var t = pos[k.next];
            var d;
            if (k.next === id) {
                d = 'M' + (x1 - 14) + ',' + p.y + ' C' + (x1 - 14) + ',' + (p.y - 30) + ' ' + (x1 + 30) + ',' + (p.y - 8) + ' ' + (x1 + 2) + ',' + (p.y + 10);
            } else if (t.x === p.x + SCHRITT) {
                d = 'M' + x1 + ',' + y1 + ' L' + (t.x - 2) + ',' + (t.y + yMitte);
            } else {
                // nicht benachbart: im Bogen über die Reihe
                var hoch = p.y - 22 - Math.abs(t.x - p.x) / 12;
                d = 'M' + (p.x + B - 12) + ',' + p.y + ' C' + (p.x + B) + ',' + hoch + ' ' + (t.x + 12) + ',' + hoch + ' ' + (t.x + 12) + ',' + (t.y - 2);
            }
            pfeil(d, 'nf', 'nf-' + id);
        });

        // lokale Variablen unter ihrem Ziel
        [['neu', z.neu], ['p', z.p]].forEach(function (v) {
            if (v[1] === null || !pos[v[1]]) return;
            var p = pos[v[1]], unten = p.y + H_KOPF + H_RUMPF, x = p.x + B / 2 - 14;
            el('text', { x: x, y: unten + 25, 'class': 'lokal-text mono' }, svg, v[0] === 'p' ? 'p (Daten)' : 'neu');
            pfeil('M' + x + ',' + (unten + 17) + ' V' + (unten + 3), 'lokal', v[0]);
        });
    }

    // ---------- Werkstatt ----------
    function werkstatt(box) {
        var mid = 'zw' + (++zaehler) + '-';
        var svg = box.querySelector('svg');
        var codeBox = box.querySelector('.zw-code');
        var info = box.querySelector('.zw-info');
        var version = box.querySelector('[data-zw-version]');
        var eingabe = box.querySelector('[data-zw-name]');
        var kn = {
            add: box.querySelector('[data-zw-add]'), poll: box.querySelector('[data-zw-poll]'),
            schritt: box.querySelector('[data-zw-schritt]'), rest: box.querySelector('[data-zw-rest]'),
            reset: box.querySelector('[data-zw-reset]'), leer: box.querySelector('[data-zw-leer]')
        };
        var z, prog = null, pc = -1, aktiv = -1, fehlerZeile = -1, meldungen = [];

        function naechste(ab) {
            for (var i = ab; i < prog.length; i++) if (prog[i][1]) return i;
            return -1;
        }

        function start(mitDaten) {
            z = { knoten: {}, naechsteId: 1, anfang: null, ende: null, neu: null, p: null, markiert: [], patient: '', rueck: '', fehler: '' };
            if (mitDaten) {
                ['Resi', 'Bene'].forEach(function (n) {
                    z.patient = n; neuerKnoten(z);
                    if (z.ende !== null) z.knoten[z.ende].next = z.neu; else z.anfang = z.neu;
                    z.ende = z.neu; z.neu = null;
                });
            }
            prog = null; pc = -1; aktiv = -1; fehlerZeile = -1;
            meldungen = [{ text: 'Wähle add(…) oder poll(). Dann führst du den Code mit „Nächste Zeile“ Schritt für Schritt aus.' }];
            naechsterName();
            zeige(addProgramm(version.value));
        }

        function naechsterName() {
            var belegt = Object.keys(z.knoten).map(function (id) { return z.knoten[id].name; });
            var frei = NAMEN.filter(function (n) { return belegt.indexOf(n) < 0; });
            eingabe.value = frei.length ? frei[0] : 'Gast';
        }

        function zeige(anzeigeProg) {
            zeichne(svg, z, mid);
            var p = anzeigeProg || prog;
            codeBox.textContent = '';
            p.forEach(function (zeile, i) {
                var s = document.createElement('span');
                s.textContent = zeile[0];
                if (i === aktiv) s.className = i === fehlerZeile ? 'fehlerzeile' : 'aktiv';
                codeBox.appendChild(s);
            });
            info.textContent = '';
            meldungen.forEach(function (m) {
                var para = document.createElement('p');
                para.textContent = m.text;
                if (m.cls) para.className = m.cls;
                info.appendChild(para);
            });
            var laeuft = prog !== null;
            kn.add.disabled = laeuft || Object.keys(z.knoten).length >= MAX_KNOTEN;
            kn.poll.disabled = laeuft;
            kn.schritt.disabled = !laeuft;
            kn.rest.disabled = !laeuft;
            version.disabled = laeuft;
            eingabe.disabled = laeuft;
            kn.add.textContent = 'add(' + (eingabe.value.trim() || '…') + ')';
        }

        function beginne(neuesProg, text) {
            prog = neuesProg; pc = naechste(0); aktiv = -1; fehlerZeile = -1;
            z.rueck = ''; z.fehler = ''; z.markiert = [];
            meldungen = [{ text: text }];
            zeige();
        }

        function schritt() {
            if (prog === null) return false;
            var r = prog[pc][1](z);
            aktiv = pc;
            meldungen = [{ text: r.info }];
            if (z.fehler) {
                fehlerZeile = pc;
                meldungen.unshift({ text: z.fehler, cls: 'fehler' });
            }
            if (r.ende || z.fehler) {
                var weg = verwaiste(z);
                weg.forEach(function (id) { delete z.knoten[id]; });
                if (z.rueck) meldungen.push({ text: z.rueck, cls: 'rueckgabe' });
                if (weg.length) meldungen.push({ text: 'Knoten ohne Verweis wurden weggeräumt.' });
                if (version.value === 'ohneSonderfall' && !z.fehler) meldungen.push({ text: 'Klappt, solange schon jemand wartet. Probiere es mit einer leeren Schlange!' });
                var fertig = prog;
                prog = null;
                naechsterName();
                zeige(fertig);
                return false;
            }
            pc = r.weiter !== undefined ? r.weiter : naechste(pc + 1);
            zeige();
            return true;
        }

        kn.add.addEventListener('click', function () {
            z.patient = eingabe.value.trim() || 'Gast';
            beginne(addProgramm(version.value), 'add(' + z.patient + ') wird aufgerufen. Klicke auf „Nächste Zeile“.');
        });
        kn.poll.addEventListener('click', function () {
            beginne(pollProgramm(version.value), 'poll() wird aufgerufen. Klicke auf „Nächste Zeile“.');
        });
        kn.schritt.addEventListener('click', schritt);
        kn.rest.addEventListener('click', function () { while (schritt()) { /* weiter */ } });
        kn.reset.addEventListener('click', function () { start(true); });
        kn.leer.addEventListener('click', function () { start(false); });
        eingabe.addEventListener('input', function () { kn.add.textContent = 'add(' + (eingabe.value.trim() || '…') + ')'; });
        version.addEventListener('change', function () {
            meldungen = [{ text: version.options[version.selectedIndex].text + ': Rufe add(…) oder poll() auf und beobachte.' }];
            zeige(version.value === 'ohneDrei' ? pollProgramm('ohneDrei') : addProgramm(version.value));
        });

        start(true);
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-zeigerwerkstatt]').forEach(werkstatt);
    });
})();
