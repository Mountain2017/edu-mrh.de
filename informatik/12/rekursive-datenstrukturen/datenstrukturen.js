/*
 * Rekursive Datenstrukturen (Informatik 12) – interaktive Elemente der Stationsseiten
 *
 *   Zeiger-Werkstatt (1.1)       <div data-zeigerwerkstatt>
 *     führt add(...) und poll() einer verketteten Warteschlange Zeile für Zeile aus
 *     (Code wie auf Blatt 1.1) und zeichnet nach jedem Schritt alle Verweise neu.
 *   Wartezimmer-Simulator (1.1)  <div data-wartezimmer>
 *     spielt das Hauptprogramm des Projekts Praxis für die drei Array-Varianten
 *     und die Kette ab, mit Vorhersage per Klick.
 *   Lösungsweg (alle)            <div data-loesungsweg="…"> mit <template data-stufe>
 *   Kopie-Vergleich (1.2)        <div data-kopievergleich>
 *   Vertragsprüfer (1.2)         <div data-vertragspruefer>
 *   Rekursions-Werkstatt (1.3)   <div data-rekursion="null">
 *   Kompositum-Werkstatt (1.4)   <div data-rekursion="kompositum">
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

        // Welche Codezeilen wurden schon einmal ausgeführt? (nur im Speicher, nichts wird gespeichert)
        var gesehen = {};
        function maske(text) {
            var i = text.indexOf('//');
            var code = i >= 0 ? text.slice(0, i) : text;
            var rest = i >= 0 ? text.slice(i) : '';
            return code.replace(/\S/g, '·') + rest;
        }

        function zeige(anzeigeProg) {
            zeichne(svg, z, mid);
            var p = anzeigeProg || prog;
            codeBox.textContent = '';
            p.forEach(function (zeile, i) {
                var s = document.createElement('span');
                // Ausführbare Zeilen erscheinen erst, wenn sie einmal ausgeführt wurden.
                s.textContent = zeile[1] && !gesehen[zeile[0]] ? maske(zeile[0]) : zeile[0];
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
            gesehen[prog[pc][0]] = true;
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

/* ==========================================================================
   Wartezimmer-Simulator (1.1): drei Array-Varianten und die Kette im Vergleich
     <div data-wartezimmer></div>
   Spielt das Hauptprogramm des Projekts Praxis Schritt für Schritt ab. Mit
   „Vorher tippen“ klickt man vor jedem Schritt den erwarteten Platz bzw. die
   erwartete Person an. Kleine Ankunftsnummern zeigen, wer wen überholt, ohne
   es auszusprechen. Darstellung nach den Array- und Queue-Demos der früheren
   Seite ../rekursion-queue-listen/rekursion.html.
   ========================================================================== */
(function () {
    'use strict';

    var KAPAZITAET = 5;
    // wie im Hauptprogramm: Name = add(Name), null = poll()
    var RUNDEN = [
        { titel: 'Fünf Patienten kommen', schritte: ['Hans', 'Vroni', 'Schorsch', 'Resi', 'Bene'] },
        { titel: 'Die Ärztin ruft drei auf', schritte: [null, null, null] },
        { titel: 'Vier neue kommen', schritte: ['Gustav', 'Leonie', 'Ludwig', 'Mia'] },
        { titel: 'Die Ärztin ruft alle auf', schritte: [null, null, null, null, null, null, null] }
    ];
    var ANKUNFT = {};                 // Name -> Nummer in der Reihenfolge der Ankunft
    RUNDEN.forEach(function (r) {
        r.schritte.forEach(function (s) { if (s) ANKUNFT[s] = Object.keys(ANKUNFT).length + 1; });
    });

    function ersterFreier(z) { return z.plaetze.indexOf(null); }
    function ersterBelegter(z) {
        for (var i = 0; i < z.plaetze.length; i++) if (z.plaetze[i] !== null) return i;
        return -1;
    }
    function abweisen(z, wer) {
        z.abgewiesen.push(wer);
        return { ziel: -1, info: 'Alle ' + z.plaetze.length + ' Plätze sind belegt: add gibt false zurück, ' + wer + ' wird abgewiesen.' };
    }
    function niemand(grund) {
        return { wer: null, info: grund + ' poll gibt null zurück („Niemand wartet.“).' };
    }

    // Die Regeln entsprechen add() und poll() der Klassen im Projekt Praxis.
    var VARIANTEN = [
        { schluessel: 'suchen', titel: 'Variante 1: Suchen', art: 'array',
          regel: 'add sucht von Platz 0 an den ersten freien Platz. poll sucht von Platz 0 an den ersten belegten Platz und leert ihn.',
          add: function (z, wer) {
              var i = ersterFreier(z);
              if (i < 0) return abweisen(z, wer);
              z.plaetze[i] = wer;
              return { ziel: i, info: 'add sucht von Platz 0 an den ersten freien Platz: ' + wer + ' kommt auf Platz ' + i + '.' };
          },
          poll: function (z) {
              var i = ersterBelegter(z);
              if (i < 0) return niemand('Kein Platz ist belegt:');
              var wer = z.plaetze[i];
              z.plaetze[i] = null;
              return { wer: wer, platz: i, info: 'poll sucht von Platz 0 an den ersten belegten Platz: Platz ' + i + ', also ' + wer + '.' };
          } },
        { schluessel: 'nummer', titel: 'Variante 2: Nummer', art: 'array', marke: 'naechster',
          regel: 'add wie Variante 1. poll ruft den Platz auf, auf den naechster zeigt, und zählt naechster um 1 weiter.',
          add: function (z, wer) { return VARIANTEN[0].add(z, wer); },
          poll: function (z) {
              var k = z.naechster;
              if (k >= z.plaetze.length) {
                  return { absturz: true, info: 'naechster ist ' + k + ', aber plaetze[' + k + '] gibt es nicht: Das Array hat nur die Plätze 0 bis ' + (z.plaetze.length - 1) + '. Das Programm stürzt ab.' };
              }
              var wer = z.plaetze[k];
              if (wer === null) return niemand('Auf Platz ' + k + ' (naechster) sitzt niemand:');
              z.plaetze[k] = null;
              z.naechster = k + 1;
              return { wer: wer, platz: k, info: 'naechster ist ' + k + ': poll ruft ' + wer + ' auf Platz ' + k + ' auf und zählt naechster auf ' + (k + 1) + ' weiter.' };
          } },
        { schluessel: 'aufruecken', titel: 'Variante 3: Aufrücken', art: 'array', marke: 'anzahl',
          regel: 'add schreibt auf Platz anzahl und zählt anzahl um 1 hoch. poll ruft Platz 0 auf, danach rücken alle anderen einen Platz vor.',
          add: function (z, wer) {
              if (z.anzahl >= z.plaetze.length) return abweisen(z, wer);
              var i = z.anzahl;
              z.plaetze[i] = wer;
              z.anzahl = i + 1;
              return { ziel: i, info: 'anzahl ist ' + i + ': add schreibt ' + wer + ' auf Platz ' + i + ' und zählt anzahl auf ' + (i + 1) + ' hoch.' };
          },
          poll: function (z) {
              if (z.anzahl === 0) return niemand('anzahl ist 0:');
              var wer = z.plaetze[0], bewegt = [];
              for (var i = 0; i < z.anzahl - 1; i++) {   // alle rücken einen Platz auf
                  z.plaetze[i] = z.plaetze[i + 1];
                  bewegt.push(i);
              }
              z.anzahl--;
              z.plaetze[z.anzahl] = null;
              z.verschiebungen += bewegt.length;
              return { wer: wer, platz: 0, bewegt: bewegt, info: 'poll ruft ' + wer + ' auf Platz 0 auf. Danach rücken die anderen je einen Platz vor: ' + bewegt.length + (bewegt.length === 1 ? ' Verschiebung.' : ' Verschiebungen.') };
          } },
        { schluessel: 'kette', titel: 'Kette (Warteschlange)', art: 'kette',
          regel: 'add hängt einen neuen Knoten hinter ende an. poll nimmt den Knoten bei anfang heraus, anfang rückt auf den Nachfolger.',
          add: function (z, wer) {
              z.kette.push(wer);
              return { ziel: z.kette.length - 1, info: 'add hängt einen neuen Knoten mit ' + wer + ' hinter ende an. Eine feste Zahl von Plätzen gibt es nicht.' };
          },
          poll: function (z) {
              if (!z.kette.length) return { wer: null, info: 'anfang ist null: poll gibt null zurück.' };
              var wer = z.kette.shift();
              return { wer: wer, platz: 0, info: 'poll nimmt den Knoten bei anfang heraus (' + wer + '). anfang rückt auf den Nachfolger weiter, niemand muss aufrücken.' };
          } }
    ];

    function neuerZustand() {
        var plaetze = [];
        for (var i = 0; i < KAPAZITAET; i++) plaetze.push(null);
        return { plaetze: plaetze, naechster: 0, anzahl: 0, kette: [], aufgerufen: [], abgewiesen: [],
                 verschiebungen: 0, runde: 0, schritt: 0, fertig: false, absturz: false,
                 letzt: null, tipps: 0, treffer: 0 };
    }

    function naechsterName(z) { return RUNDEN[z.runde].schritte[z.schritt]; }

    function schritt(z, v) {
        var name = naechsterName(z), runde = z.runde, erg;
        if (name) {
            erg = v.add(z, name);
            erg.name = name;
        } else {
            erg = v.poll(z);
            if (erg.wer) z.aufgerufen.push({ name: erg.wer, runde: runde });
        }
        erg.art = name ? 'add' : 'poll';
        if (erg.absturz) {
            z.absturz = true;
            z.fertig = true;
        } else if (++z.schritt >= RUNDEN[runde].schritte.length) {
            z.schritt = 0;
            z.runde++;
            z.fertig = z.runde >= RUNDEN.length;
        }
        z.letzt = erg;
        return erg;
    }

    // Richtige Antwort für den nächsten Schritt: Platz (add, -1 = kein Platz),
    // Name (poll, null = niemand) oder 'absturz'. Dazu den Schritt auf einer Kopie ausführen.
    function erwartet(z, v) {
        var erg = schritt(JSON.parse(JSON.stringify(z)), v);
        if (erg.absturz) return 'absturz';
        return erg.art === 'add' ? erg.ziel : erg.wer;
    }

    function span(eltern, klasse, text) {
        var s = document.createElement('span');
        s.className = klasse;
        s.textContent = text;
        eltern.appendChild(s);
        return s;
    }

    function simulator(box) {
        box.classList.add('wz');
        box.innerHTML =
            '<div class="wz-kopf">' +
            '  <label>Variante <select data-wz-variante></select></label>' +
            '  <label class="wz-haken"><input type="checkbox" data-wz-tippen checked> Vorher tippen</label>' +
            '  <label class="wz-haken"><input type="checkbox" data-wz-regel> Regel zeigen</label>' +
            '</div>' +
            '<p class="wz-regel" hidden></p>' +
            '<div class="wz-knoepfe">' +
            '  <button type="button" class="knopf-klein knopf-haupt" data-wz-schritt></button>' +
            '  <button type="button" class="knopf-klein" data-wz-runde>Runde zu Ende ⏭</button>' +
            '  <button type="button" class="knopf-klein" data-wz-neu>Von vorn</button>' +
            '</div>' +
            '<div class="wz-rundentitel"></div>' +
            '<p class="wz-frage"></p>' +
            '<div class="wz-bild"></div>' +
            '<div class="wz-info" aria-live="polite"></div>' +
            '<div class="wz-zahlen"></div>' +
            '<div class="wz-vergleich" hidden></div>';
        var auswahl = box.querySelector('[data-wz-variante]');
        var tippen = box.querySelector('[data-wz-tippen]');
        var regelWahl = box.querySelector('[data-wz-regel]');
        var regel = box.querySelector('.wz-regel');
        var knopfSchritt = box.querySelector('[data-wz-schritt]');
        var knopfRunde = box.querySelector('[data-wz-runde]');
        var bild = box.querySelector('.wz-bild');
        var info = box.querySelector('.wz-info');
        var ergebnisse = {};          // abgeschlossene Läufe je Variante
        var v, z;

        VARIANTEN.forEach(function (va, i) {
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = va.titel;
            auswahl.appendChild(o);
        });

        function neu() {
            v = VARIANTEN[Number(auswahl.value)];
            z = neuerZustand();
            regel.textContent = 'Regel aus dem Code: ' + v.regel;
            zeigeInfo([{ text: 'Spiele das Hauptprogramm Schritt für Schritt ab. Mit „Vorher tippen“ klickst du vor jedem Schritt an, was du erwartest.' }]);
            zeichne();
        }

        // Beim Anhängen an die Kette gibt es nichts zu raten.
        function tippModus() {
            return tippen.checked && !z.fertig && !(v.art === 'kette' && naechsterName(z));
        }

        function tippText(tipp, art) {
            if (art === 'add') return tipp === -1 ? 'kein Platz frei' : 'Platz ' + tipp;
            return tipp === null ? 'niemand' : tipp;
        }

        function abschluss() {
            ergebnisse[v.schluessel] = {
                runde4: z.aufgerufen.filter(function (a) { return a.runde === RUNDEN.length - 1; }).map(function (a) { return a.name; }),
                abgewiesen: z.abgewiesen.slice(),
                verschiebungen: z.verschiebungen,
                absturz: z.absturz
            };
            return { text: z.absturz ? 'Ende: Das Programm ist abgestürzt. Vergleiche mit der Ausgabe im Projekt.' : 'Ende: Das Hauptprogramm ist durchgelaufen. Probiere die nächste Variante.', klasse: 'wz-ende' };
        }

        // tipp: undefined = ohne Vorhersage
        function ausfuehren(tipp) {
            if (z.fertig) return;
            var soll = tipp === undefined ? undefined : erwartet(z, v);
            var erg = schritt(z, v), zeilen = [];
            if (tipp !== undefined) {
                var richtig = tipp === soll;
                z.tipps++;
                if (richtig) z.treffer++;
                zeilen.push({
                    text: richtig ? '✓ Richtig getippt.' : soll === 'absturz' ? '✗ Weder noch: Diesmal gibt es gar kein Ergebnis.' : '✗ Dein Tipp: ' + tippText(tipp, erg.art) + '.',
                    klasse: richtig ? 'wz-ok' : 'wz-falsch'
                });
            }
            zeilen.push({ text: erg.info, klasse: erg.absturz ? 'wz-absturz' : '' });
            if (z.fertig) zeilen.push(abschluss());
            zeigeInfo(zeilen);
            zeichne();
        }

        // Kurzfassung eines Schritts für die Zusammenfassung einer Runde
        function kurz(erg) {
            if (erg.art === 'add') {
                if (erg.ziel === -1) return erg.name + ' → abgewiesen';
                return erg.name + (v.art === 'kette' ? ' → hinten angehängt' : ' → Platz ' + erg.ziel);
            }
            if (erg.absturz) return 'Absturz';
            if (!erg.wer) return 'niemand wartet';
            return erg.wer + ' aufgerufen' + (erg.bewegt ? ' (' + erg.bewegt.length + '× verschoben)' : '');
        }

        function rundeZuEnde() {
            if (z.fertig) return;
            var r = z.runde, teile = [], zeilen = [];
            while (!z.fertig && z.runde === r) {
                var erg = schritt(z, v);
                teile.push(kurz(erg));
                if (erg.absturz) zeilen.push({ text: erg.info, klasse: 'wz-absturz' });
            }
            zeilen.unshift({ text: 'Runde ' + (r + 1) + ': ' + teile.join(' · ') });
            if (z.fertig) zeilen.push(abschluss());
            zeigeInfo(zeilen);
            zeichne();
        }

        function zeigeInfo(zeilen) {
            info.textContent = '';
            zeilen.forEach(function (zl) {
                var p = document.createElement('p');
                if (zl.klasse) p.className = zl.klasse;
                p.textContent = zl.text;
                info.appendChild(p);
            });
        }

        function zeichne() {
            var tipp = tippModus();
            var name = z.fertig ? null : naechsterName(z);
            box.querySelector('.wz-rundentitel').textContent = z.fertig ? 'Hauptprogramm beendet' : 'Runde ' + (z.runde + 1) + ' von ' + RUNDEN.length + ': ' + RUNDEN[z.runde].titel;
            var frage = box.querySelector('.wz-frage');
            if (z.fertig) frage.textContent = '';
            else if (name) frage.textContent = name + ' kommt (Nr. ' + ANKUNFT[name] + ').' + (tipp ? ' Auf welchen Platz? Tippe ihn an.' : '');
            else frage.textContent = 'Die Ärztin ruft auf.' + (tipp ? ' Wer ist dran? Tippe die Person an.' : '');
            knopfSchritt.textContent = tipp ? 'Ohne Tipp weiter ▶' : 'Nächster Schritt ▶';
            knopfSchritt.disabled = z.fertig;
            knopfRunde.disabled = z.fertig;
            bild.textContent = '';
            bild.classList.toggle('wz-tippen', tipp);
            if (v.art === 'array') zeichneArray(tipp, name); else zeichneKette(tipp, name);
            if (tipp) {
                var sonder = document.createElement('button');
                sonder.type = 'button';
                sonder.className = 'wz-sonder';
                sonder.textContent = name ? 'kein Platz frei' : 'niemand';
                sonder.addEventListener('click', function () { ausfuehren(name ? -1 : null); });
                bild.appendChild(sonder);
            }
            zeichneZahlen();
            zeichneVergleich();
        }

        function zeichneArray(tipp, name) {
            var reihe = document.createElement('div');
            reihe.className = 'wz-reihe';
            var l = z.letzt, n = z.plaetze.length;
            // Variante 2: zeigt naechster hinter das Array, erscheint dort ein Platz, den es nicht gibt
            var geist = v.marke === 'naechster' && z.naechster >= n;
            for (var i = 0; i < n + (geist ? 1 : 0); i++) {
                var spalte = document.createElement('div');
                spalte.className = 'wz-spalte';
                var feld = document.createElement('button');
                feld.type = 'button';
                feld.className = 'wz-feld';
                span(feld, 'wz-index', '[' + i + ']');
                var wer = i < n ? z.plaetze[i] : null;
                if (i >= n) {
                    feld.classList.add('wz-geist');
                    if (z.absturz) feld.classList.add('wz-crash');
                    span(feld, 'wz-null', z.absturz ? 'Absturz' : 'gibt es nicht');
                    feld.disabled = true;
                    feld.setAttribute('aria-label', 'Platz ' + i + ' gibt es nicht');
                } else if (wer === null) {
                    feld.classList.add('wz-leer');
                    if (l && l.art === 'poll' && l.wer && l.platz === i && !l.bewegt) span(feld, 'wz-raus', l.wer);
                    span(feld, 'wz-null', 'null');
                    feld.disabled = !(tipp && name);          // freie Plätze nur beim Hinzufügen antippbar
                    feld.setAttribute('aria-label', 'Platz ' + i + ': frei');
                } else {
                    span(feld, 'wz-name', wer);
                    span(feld, 'wz-nr', String(ANKUNFT[wer]));
                    feld.disabled = !tipp;
                    feld.setAttribute('aria-label', 'Platz ' + i + ': ' + wer + ', als ' + ANKUNFT[wer] + '. angekommen');
                }
                if (l && l.art === 'add' && l.ziel === i) feld.classList.add('wz-neu');
                if (l && l.bewegt && l.bewegt.indexOf(i) >= 0) feld.classList.add('wz-verschoben');
                if (!feld.disabled) feld.addEventListener('click', ausfuehren.bind(null, name ? i : wer));
                spalte.appendChild(feld);
                var marke = span(spalte, 'wz-marke', '');
                // Pfeil davor setzt das CSS (▲ unter dem Platz, auf dem Handy ◀ daneben)
                if (v.marke === 'naechster' && z.naechster === i) marke.textContent = 'naechster';
                if (v.marke === 'anzahl' && z.anzahl === i) marke.textContent = 'anzahl';
                reihe.appendChild(spalte);
            }
            bild.appendChild(reihe);
        }

        function zeichneKette(tipp, name) {
            var reihe = document.createElement('div');
            reihe.className = 'wz-kette';
            var l = z.letzt;
            if (l && l.art === 'poll' && l.wer) span(reihe, 'wz-knoten wz-knoten-raus', l.wer);
            if (!z.kette.length) span(reihe, 'wz-leerkette', 'anfang = null, ende = null');
            z.kette.forEach(function (wer, i) {
                if (i > 0) span(reihe, 'wz-pfeil', '→');
                var k = document.createElement('button');
                k.type = 'button';
                k.className = 'wz-knoten';
                span(k, 'wz-name', wer);
                span(k, 'wz-nr', String(ANKUNFT[wer]));
                if (i === 0) span(k, 'wz-anker wz-oben', 'anfang');
                if (i === z.kette.length - 1) span(k, 'wz-anker wz-unten', 'ende');
                if (l && l.art === 'add' && l.ziel === i) k.classList.add('wz-neu');
                k.disabled = !(tipp && !name);                // Knoten nur beim Aufrufen antippbar
                k.setAttribute('aria-label', 'Knoten ' + (i + 1) + ': ' + wer + ', als ' + ANKUNFT[wer] + '. angekommen');
                if (!k.disabled) k.addEventListener('click', ausfuehren.bind(null, wer));
                reihe.appendChild(k);
            });
            if (z.kette.length) {
                span(reihe, 'wz-pfeil', '→');
                span(reihe, 'wz-null wz-kettenende', 'null');
            }
            bild.appendChild(reihe);
        }

        function zeichneZahlen() {
            var zahlen = box.querySelector('.wz-zahlen');
            zahlen.textContent = '';
            // Aufgerufene mit Ankunftsnummer, Runden durch | getrennt
            var aufgerufen = document.createElement('div');
            aufgerufen.className = 'wz-aufgerufen';
            span(aufgerufen, 'wz-zl', 'Aufgerufen');
            if (!z.aufgerufen.length) aufgerufen.appendChild(document.createTextNode('–'));
            z.aufgerufen.forEach(function (a, i) {
                if (i > 0) aufgerufen.appendChild(document.createTextNode(a.runde !== z.aufgerufen[i - 1].runde ? ' | ' : ', '));
                aufgerufen.appendChild(document.createTextNode(a.name + ' '));
                span(aufgerufen, 'wz-nr-text', String(ANKUNFT[a.name]));
            });
            zahlen.appendChild(aufgerufen);
            var werte = document.createElement('div');
            werte.className = 'wz-werte';
            function wert(titel, text) {
                var w = span(werte, 'wz-wert', '');
                span(w, 'wz-zl', titel);
                w.appendChild(document.createTextNode(text));
            }
            var belegt = z.plaetze.filter(function (p) { return p !== null; }).length;
            wert('Abgewiesen', z.abgewiesen.length ? z.abgewiesen.join(', ') : '–');
            wert('Verschiebungen', String(z.verschiebungen));
            wert('Speicher', v.art === 'array'
                ? z.plaetze.length + ' Plätze reserviert, davon ' + belegt + ' belegt'
                : z.kette.length + ' Knoten, einer je Wartendem');
            if (z.tipps) wert('Deine Tipps', z.treffer + ' von ' + z.tipps + ' richtig');
            zahlen.appendChild(werte);
        }

        function zeichneVergleich() {
            var ziel = box.querySelector('.wz-vergleich');
            var reihen = VARIANTEN.filter(function (va) { return ergebnisse[va.schluessel]; });
            ziel.hidden = !reihen.length;
            ziel.textContent = '';
            if (!reihen.length) return;
            span(ziel, 'wz-titel', 'Deine Läufe im Vergleich');
            var huelle = document.createElement('div');
            huelle.className = 'tab-scroll';
            var tabelle = document.createElement('table');
            function reihe(zellen, kopf) {
                var tr = document.createElement('tr');
                zellen.forEach(function (text) {
                    var c = document.createElement(kopf ? 'th' : 'td');
                    c.textContent = text;
                    tr.appendChild(c);
                });
                tabelle.appendChild(tr);
            }
            reihe(['Variante', 'Runde 4: aufgerufen (Ankunft)', 'abgewiesen', 'Verschiebungen', 'Absturz'], true);
            reihen.forEach(function (va) {
                var e = ergebnisse[va.schluessel];
                reihe([va.titel,
                       e.runde4.length ? e.runde4.map(function (n) { return n + ' (' + ANKUNFT[n] + ')'; }).join(', ') : '–',
                       e.abgewiesen.length ? e.abgewiesen.join(', ') : '–',
                       String(e.verschiebungen),
                       e.absturz ? 'ja' : 'nein']);
            });
            huelle.appendChild(tabelle);
            ziel.appendChild(huelle);
        }

        knopfSchritt.addEventListener('click', function () { ausfuehren(); });
        knopfRunde.addEventListener('click', rundeZuEnde);
        box.querySelector('[data-wz-neu]').addEventListener('click', neu);
        auswahl.addEventListener('change', neu);
        tippen.addEventListener('change', zeichne);
        regelWahl.addEventListener('change', function () { regel.hidden = !regelWahl.checked; });
        neu();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-wartezimmer]').forEach(simulator);
    });
})();

/* ==========================================================================
   Lösungsweg (alle Stationen): Tipps stufenweise, Lösung nur durch Gedrückthalten
     <div class="lw" data-loesungsweg="TODO 3: add()">
       <template data-stufe="Tipp 1">…</template>
       <template data-stufe="Lösung" data-halten>…</template>
     </div>
   Der Inhalt steht in <template>: nicht sichtbar, nicht über die Suche zu finden.
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
        box.appendChild(kopf);
        box.appendChild(inhalt);
        box.appendChild(knoepfe);
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

        function zuruecksetzen() {
            inhalt.textContent = '';
            stand = 0;
            baueKnoepfe();
        }

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
            clearTimeout(timer);
            timer = null;
            balken.style.transition = 'width .2s';
            balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-loesungsweg]').forEach(loesungsweg);
    });
})();

/* ==========================================================================
   Kopie-Vergleich (1.2): Warteschlange für Patienten vs. kopierte Taxi-Fassung
     <div data-kopievergleich></div>
   ========================================================================== */
(function () {
    'use strict';

    var PATIENT = [
        'public class Knoten {',
        '   private Patient daten;',
        '   private Knoten nachfolger;',
        '',
        '   public Knoten(Patient daten) {',
        '      this.daten = daten;',
        '   }',
        '   public Patient getDaten() { return daten; }',
        '   ...',
        '}',
        '',
        'public class Warteschlange {',
        '   private Knoten anfang;',
        '   private Knoten ende;',
        '',
        '   public boolean add(Patient p) {',
        '      Knoten neu = new Knoten(p);',
        '      ...',
        '   }',
        '   public Patient poll() { ... }',
        '   public void ausgeben() {',
        '      ...',
        '      println(aktuell.getDaten().getName());',
        '      ...',
        '   }',
        '}'
    ];
    var TAXI = PATIENT.map(function (z) {
        return z.replace(/\bKnoten\b/g, 'TaxiKnoten').replace(/\bWarteschlange\b/g, 'TaxiWarteschlange')
                .replace(/\bPatient p\b/g, 'Taxi t').replace(/\(p\)/g, '(t)').replace(/\bPatient\b/g, 'Taxi')
                .replace(/getName\(\)/g, 'getNummer()');
    });

    function woerter(z) { return z.split(/(\W)/).filter(function (w) { return w !== ''; }); }

    function vergleich(box) {
        var kopf = document.createElement('div');
        kopf.className = 'kv-knoepfe';
        kopf.innerHTML = '<button type="button" class="knopf-klein" data-kv-markieren>Unterschiede markieren</button>' +
                         '<button type="button" class="knopf-klein" data-kv-fuenf>Und bei fünf Datentypen?</button>';
        var gitter = document.createElement('div');
        gitter.className = 'kv-gitter';
        var info = document.createElement('p');
        info.className = 'kv-info';
        info.setAttribute('aria-live', 'polite');
        box.appendChild(kopf);
        box.appendChild(gitter);
        box.appendChild(info);
        var spalten = [PATIENT, TAXI].map(function (zeilen, s) {
            var wrap = document.createElement('div');
            var t = document.createElement('div');
            t.className = 'kv-titel';
            t.textContent = s === 0 ? 'aus 1.1: für Patienten' : 'Kopie: für Taxis';
            var pre = document.createElement('pre');
            pre.className = 'kv-code';
            zeilen.forEach(function (z) {
                var zeile = document.createElement('span');
                zeile.className = 'kv-zeile';
                zeile.textContent = z || ' ';
                pre.appendChild(zeile);
            });
            wrap.appendChild(t);
            wrap.appendChild(pre);
            gitter.appendChild(wrap);
            return pre;
        });
        var markiert = false;
        box.querySelector('[data-kv-markieren]').addEventListener('click', function () {
            markiert = !markiert;
            var anders = 0;
            [0, 1].forEach(function (s) {
                var zeilen = s === 0 ? PATIENT : TAXI, andere = s === 0 ? TAXI : PATIENT;
                var spans = spalten[s].querySelectorAll('.kv-zeile');
                zeilen.forEach(function (z, i) {
                    var span = spans[i];
                    span.textContent = '';
                    if (!markiert || z === andere[i]) { span.textContent = z || ' '; span.classList.remove('kv-anders'); return; }
                    if (s === 0) anders++;
                    span.classList.add('kv-anders');
                    var a = woerter(z), b = woerter(andere[i]);
                    a.forEach(function (w, j) {
                        var teil = document.createElement(w === b[j] ? 'span' : 'mark');
                        teil.textContent = w;
                        span.appendChild(teil);
                    });
                });
            });
            this.textContent = markiert ? 'Markierung entfernen' : 'Unterschiede markieren';
            var echt = PATIENT.filter(function (z) { return z.trim() && z.trim() !== '...' && z.trim() !== '}'; }).length;
            info.textContent = markiert
                ? anders + ' von ' + echt + ' Codezeilen unterscheiden sich – und zwar nur in Namen und Datentypen. Die Logik von add, poll und ausgeben ist Zeichen für Zeichen dieselbe.'
                : '';
        });
        box.querySelector('[data-kv-fuenf]').addEventListener('click', function () {
            info.textContent = 'Patienten, Taxis, Pakete, Songs, Druckaufträge: fünf Kopien derselben Logik. Findest du einen Fehler in add(), musst du ihn fünfmal beheben – und vergisst bestimmt eine Kopie. Besser: eine Warteschlange, die nur verlangt, was sie wirklich braucht.';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-kopievergleich]').forEach(vergleich);
    });
})();

/* ==========================================================================
   Vertragsprüfer (1.2): Erfüllt diese Klasse den Vertrag DatenElement?
     <div data-vertragspruefer></div>
   ========================================================================== */
(function () {
    'use strict';

    var VERTRAG = 'public interface DatenElement {\n   String gibSchluesselwert();\n}';
    var FAELLE = [
        { name: 'Taxi A', ok: true,
          code: 'public class Taxi implements DatenElement {\n   private int nummer;\n   ...\n   public String gibSchluesselwert() {\n      return "Taxi " + nummer;\n   }\n}',
          meldung: 'kein Fehler',
          erklaerung: 'implements DatenElement verspricht den Vertrag, und die einzige Vertragsmethode ist da: mit genau diesem Namen, diesen Parametern (keinen) und diesem Rückgabetyp.' },
        { name: 'Taxi B', ok: false,
          code: 'public class Taxi implements DatenElement {\n   private int nummer;\n   private String fahrer;\n   ...\n   public String getFahrer() {\n      return fahrer;\n   }\n}',
          meldung: 'Die Klasse Taxi muss noch folgende Methoden des Interfaces DatenElement implementieren: String gibSchluesselwert()',
          erklaerung: 'Versprochen, aber nicht gehalten: Wer implements schreibt, muss alle Methoden des Interfaces liefern. getFahrer() ist erlaubt, ersetzt die Vertragsmethode aber nicht.' },
        { name: 'Taxi C', ok: false,
          code: 'public class Taxi {\n   private int nummer;\n   ...\n   public String gibSchluesselwert() {\n      return "Taxi " + nummer;\n   }\n}\n\n// im Hauptprogramm:\ntaxistand.add(new Taxi(1, "Ali"));',
          meldung: 'Es konnte keine passende Methode mit diesem Bezeichner/mit dieser Signatur gefunden werden.  (Zeile mit taxistand.add)',
          erklaerung: 'Die Methode passt zufällig, aber ohne implements gibt es keinen Vertrag. Java fragt nicht „Sieht die Klasse passend aus?“, sondern „Hat sie den Vertrag unterschrieben?“. Also ist Taxi kein DatenElement, und add lehnt es ab.' },
        { name: 'Taxi D', ok: false,
          code: 'public class Taxi implements DatenElement {\n   private int nummer;\n   ...\n   public String getSchluesselwert() {\n      return "Taxi " + nummer;\n   }\n}',
          meldung: 'Die Klasse Taxi muss noch folgende Methoden des Interfaces DatenElement implementieren: String gibSchluesselwert()',
          erklaerung: 'get statt gib: Für den Compiler ist das eine ganz andere Methode. Der Vertrag verlangt den Namen exakt so, wie er im Interface steht.' },
        { name: 'Taxi E', ok: true,
          code: 'public class Taxi implements DatenElement {\n   private int nummer;\n   private String fahrer;\n   ...\n   public String gibSchluesselwert() {\n      return "Taxi " + nummer;\n   }\n   public String getFahrer() {\n      return fahrer;\n   }\n   public void hupen() {\n      println("Tuuut!");\n   }\n}',
          meldung: 'kein Fehler',
          erklaerung: 'Ein Vertrag legt fest, was mindestens da sein muss. Zusätzliche Methoden sind erlaubt. Die Warteschlange benutzt sie nur nicht, denn sie kennt nur den Vertrag.' },
        { name: 'Taxi F', ok: false,
          code: 'public class Taxi implements DatenElement {\n   private int nummer;\n   ...\n   public int gibSchluesselwert() {\n      return nummer;\n   }\n}',
          meldung: 'Java: Der Rückgabetyp int passt nicht zu String gibSchluesselwert().',
          erklaerung: 'Name und Parameter stimmen, aber der Vertrag verspricht einen String. Achtung: Unsere Online-IDE meldet diesen Fehler leider nicht und gibt beim Ausführen „undefined“ aus. Echtes Java lehnt die Klasse ab.' }
    ];

    function pruefer(box) {
        var punkte = {};
        box.innerHTML =
            '<div class="vp-oben">' +
            '  <div><div class="vp-titel">Der Vertrag</div><pre class="vp-code vp-vertrag"></pre></div>' +
            '  <div><div class="vp-titel">Welche Klasse prüfst du?</div><div class="vp-auswahl" role="group" aria-label="Klasse wählen"></div>' +
            '       <p class="vp-stand" aria-live="polite"></p></div>' +
            '</div>' +
            '<div class="vp-titel vp-klassentitel"></div><pre class="vp-code vp-klasse"></pre>' +
            '<div class="vp-knoepfe"><button type="button" class="knopf-klein" data-vp="1">erfüllt den Vertrag</button>' +
            '<button type="button" class="knopf-klein" data-vp="0">der Compiler meldet einen Fehler</button></div>' +
            '<div class="vp-rueck" aria-live="polite"></div>';
        box.querySelector('.vp-vertrag').textContent = VERTRAG;
        var auswahl = box.querySelector('.vp-auswahl');
        var aktuell = 0;
        FAELLE.forEach(function (f, i) {
            var k = document.createElement('button');
            k.type = 'button';
            k.className = 'knopf-klein';
            k.textContent = f.name;
            k.addEventListener('click', function () { zeige(i); });
            auswahl.appendChild(k);
        });
        function zeige(i) {
            aktuell = i;
            var f = FAELLE[i];
            box.querySelector('.vp-klassentitel').textContent = f.name;
            box.querySelector('.vp-klasse').textContent = f.code;
            box.querySelector('.vp-rueck').textContent = '';
            Array.prototype.forEach.call(auswahl.children, function (k, j) {
                k.setAttribute('aria-pressed', j === i ? 'true' : 'false');
            });
        }
        function stand() {
            var n = Object.keys(punkte).length, r = Object.keys(punkte).filter(function (k) { return punkte[k]; }).length;
            box.querySelector('.vp-stand').textContent = n ? r + ' von ' + n + ' geprüften Klassen richtig eingeschätzt (' + FAELLE.length + ' insgesamt)' : '';
        }
        box.querySelectorAll('[data-vp]').forEach(function (k) {
            k.addEventListener('click', function () {
                var f = FAELLE[aktuell];
                var tipp = k.getAttribute('data-vp') === '1';
                var richtig = tipp === f.ok;
                if (!(aktuell in punkte)) punkte[aktuell] = richtig;
                var r = box.querySelector('.vp-rueck');
                r.textContent = '';
                var kopf = document.createElement('p');
                kopf.className = richtig ? 'vp-richtig' : 'vp-falsch';
                kopf.textContent = (richtig ? '✓ Richtig. ' : '✗ Leider nicht. ') + (f.ok ? f.name + ' erfüllt den Vertrag.' : 'Hier meldet der Compiler einen Fehler.');
                var meldung = document.createElement('p');
                meldung.className = 'vp-meldung';
                meldung.textContent = 'Meldung: ' + f.meldung;
                var erk = document.createElement('p');
                erk.textContent = f.erklaerung;
                r.appendChild(kopf);
                r.appendChild(meldung);
                r.appendChild(erk);
                stand();
            });
        });
        zeige(0);
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-vertragspruefer]').forEach(pruefer);
    });
})();

/* ==========================================================================
   Rekursions-Werkstatt (1.3) und Kompositum-Werkstatt (1.4)
     <div data-rekursion="null"></div>        Liste mit null am Ende (1.3)
     <div data-rekursion="kompositum"></div>  Liste mit Abschluss (1.4)
   Zeigt jeden Aufruf und jede Rückgabe als wachsendes Sequenzdiagramm,
   dazu die Regel (in Worten, nicht als Code) des gerade arbeitenden Objekts.
   ========================================================================== */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var TAXIS = ['Taxi 12', 'Taxi 7', 'Taxi 3', 'Taxi 21'];

    function el(name, attrs, eltern, text) {
        var e = document.createElementNS(SVG_NS, name);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (text !== undefined) e.textContent = text;
        if (eltern) eltern.appendChild(e);
        return e;
    }

    // ---------- Regeln in Worten ----------
    var REGELN = {
        'null': {
            laenge: {
                Liste: ['Ist die Liste leer (anfang ist null)? → Antwort 0.', 'Sonst: frage den ersten Knoten und gib seine Antwort weiter.'],
                Knoten: ['Habe ich keinen Nachfolger? → Antwort 1. (Abbruchbedingung)', 'Sonst: frage meinen Nachfolger. Antwort: seine Antwort + 1.']
            },
            ohneAbbruch: {
                Liste: ['Ist die Liste leer (anfang ist null)? → Antwort 0.', 'Sonst: frage den ersten Knoten und gib seine Antwort weiter.'],
                Knoten: ['(Hier fehlt die Abbruchbedingung!)', 'Frage meinen Nachfolger. Antwort: seine Antwort + 1.']
            },
            enthaelt: {
                Liste: ['Ist die Liste leer? → Antwort false.', 'Sonst: frage den ersten Knoten und gib seine Antwort weiter.'],
                Knoten: ['Sind meine Daten gleich den gesuchten? → Antwort true. (Abbruch 1)', 'Habe ich keinen Nachfolger? → Antwort false. (Abbruch 2)', 'Sonst: frage meinen Nachfolger und gib seine Antwort weiter.']
            },
            add: {
                Liste: ['Ist die Liste leer? → Der neue Knoten wird anfang. Antwort true.', 'Sonst: gib den Auftrag an den ersten Knoten weiter.'],
                Knoten: ['Habe ich keinen Nachfolger? → Der neue Knoten wird mein Nachfolger. Antwort true.', 'Sonst: gib den Auftrag an meinen Nachfolger weiter.']
            },
            entfernen: {
                Liste: ['Ist die Liste leer? → Antwort false.', 'Hat der erste Knoten die gesuchten Daten? → anfang rückt auf dessen Nachfolger. Antwort true.', 'Sonst: frage den ersten Knoten.'],
                Knoten: ['Habe ich keinen Nachfolger? → Antwort false.', 'Hat mein Nachfolger die gesuchten Daten? → Ich überspringe ihn. Antwort true.', 'Sonst: frage meinen Nachfolger.']
            }
        },
        kompositum: {
            laenge: {
                Liste: ['Frage anfang (Knoten oder Abschluss) und gib die Antwort weiter.'],
                Knoten: ['Frage meinen Nachfolger. Antwort: seine Antwort + 1.'],
                Abschluss: ['Antwort 0. (Hier endet die Rekursion.)']
            },
            enthaelt: {
                Liste: ['Frage anfang und gib die Antwort weiter.'],
                Knoten: ['Sind meine Daten gleich den gesuchten? → Antwort true.', 'Sonst: frage meinen Nachfolger und gib seine Antwort weiter.'],
                Abschluss: ['Antwort false. (Bis hierher wurde nichts gefunden.)']
            },
            add: {
                Liste: ['anfang = Antwort von anfang.add(…)'],
                Knoten: ['nachfolger = Antwort von nachfolger.add(…)', 'Antwort: ich selbst (this).'],
                Abschluss: ['Erzeuge einen neuen Knoten und trage mich als seinen Nachfolger ein.', 'Antwort: der neue Knoten.']
            },
            entfernen: {
                Liste: ['anfang = Antwort von anfang.entfernen(…)'],
                Knoten: ['Sind meine Daten gleich den gesuchten? → Antwort: mein Nachfolger (ich werde übersprungen).', 'Sonst: nachfolger = Antwort von nachfolger.entfernen(…). Antwort: ich selbst (this).'],
                Abschluss: ['Antwort: ich selbst (this). (Nichts gefunden, nichts ändert sich.)']
            }
        }
    };

    var METHODEN = {
        'null': [
            ['laenge', 'laenge()'], ['enthaelt3', 'enthaelt(Taxi 3)'], ['enthaelt99', 'enthaelt(Taxi 99)'],
            ['add', 'add(Taxi 5)'], ['entfernen', 'entfernen(Taxi 7)'], ['ohneAbbruch', 'laenge() ohne Abbruchbedingung']
        ],
        kompositum: [
            ['laenge', 'laenge()'], ['enthaelt3', 'enthaelt(Taxi 3)'], ['enthaelt99', 'enthaelt(Taxi 99)'],
            ['add', 'add(Taxi 5)'], ['entfernen', 'entfernen(Taxi 7)'], ['entfernen12', 'entfernen(Taxi 12)']
        ]
    };

    // ---------- Ablauf erzeugen ----------
    // Zustand: { anfang, next: {id: id}, daten: {id: name} }; Schritte bekommen eine Kopie des Zustands
    function kopie(z) { return { anfang: z.anfang, next: Object.assign({}, z.next), daten: Object.assign({}, z.daten) }; }

    function ablauf(modus, methode) {
        var ENDE = modus === 'kompositum' ? 'ab' : null;
        var z = { anfang: 'k1', next: { k1: 'k2', k2: 'k3', k3: 'k4', k4: ENDE }, daten: { k1: TAXIS[0], k2: TAXIS[1], k3: TAXIS[2], k4: TAXIS[3] } };
        var schritte = [];
        var regelname = methode.replace(/\d+$/, '');
        var gesucht = methode === 'enthaelt3' ? 'Taxi 3' : methode === 'enthaelt99' ? 'Taxi 99' : methode === 'entfernen12' ? 'Taxi 12' : methode === 'entfernen' ? 'Taxi 7' : 'Taxi 5';
        var aufrufText = methode === 'laenge' || methode === 'ohneAbbruch' ? 'laenge()' : regelname + '(' + gesucht + ')';
        var stapel = [];

        function typ(id) { return id === 'liste' ? 'Liste' : id === 'ab' ? 'Abschluss' : id === 'null' ? 'null' : 'Knoten'; }
        function name(id) { return id === 'ab' ? 'Abschluss' : id === 'liste' ? 'liste' : id === 'hp' ? 'Hauptprogramm' : id === null || id === 'null' ? 'null' : id; }
        function s(art, von, zu, beschriftung, text, regelObj, regelZeile, extra) {
            var x = { art: art, von: von, zu: zu, beschriftung: beschriftung, text: text, regelObj: regelObj, regelZeile: regelZeile, zustand: kopie(z), stapel: stapel.slice() };
            Object.keys(extra || {}).forEach(function (k) { x[k] = extra[k]; });
            schritte.push(x);
        }
        function ruf(von, zu, text) {
            s('aufruf', von, zu, aufrufText, text, typ(zu), null);
            stapel.push(name(zu));
        }
        function zurueck(von, zu, wert, text, zeile) {
            stapel.pop();
            s('rueckgabe', von, zu, String(wert), text, typ(von), zeile);
        }

        // --- Knoten-Methoden (Modus null) ---
        function laengeK(id, ruf_von, ohne) {
            var n = z.next[id];
            if (!ohne && n === null) {
                zurueck(id, ruf_von, 1, id + ' hat keinen Nachfolger: Er ist der letzte und antwortet 1.', 0);
                return 1;
            }
            if (ohne && n === null) {
                s('aufruf', id, 'null', 'laenge()', id + ' fragt seinen Nachfolger – aber da ist niemand: nachfolger ist null.', 'Knoten', 1);
                s('absturz', id, 'null', 'NullPointerException', 'Absturz! Ohne Abbruchbedingung ruft auch der letzte Knoten nachfolger.laenge() auf. Auf null kann man keine Methode aufrufen.', 'Knoten', 0);
                return null;
            }
            ruf(id, n, id + ' hat einen Nachfolger und fragt ' + n + ': „Wie lang ist die Liste ab dir?“ Dann wartet ' + id + '.');
            var v = laengeK(n, id, ohne);
            if (v === null) return null;
            zurueck(id, ruf_von, v + 1, id + ' bekommt ' + v + ' zurück, zählt sich selbst dazu und antwortet ' + (v + 1) + '.', ohne ? 1 : 1);
            return v + 1;
        }
        function enthaeltK(id, ruf_von) {
            if (z.daten[id] === gesucht) {
                zurueck(id, ruf_von, 'true', id + ' trägt ' + z.daten[id] + ' – gefunden! Er antwortet true und fragt niemanden mehr.', 0);
                return true;
            }
            var n = z.next[id];
            if (n === null) {
                zurueck(id, ruf_von, 'false', id + ' trägt ' + z.daten[id] + ' und hat keinen Nachfolger: Die Suche war erfolglos, Antwort false.', 1);
                return false;
            }
            ruf(id, n, id + ' trägt ' + z.daten[id] + ', nicht ' + gesucht + '. Er gibt die Frage an ' + n + ' weiter.');
            var v = enthaeltK(n, id);
            zurueck(id, ruf_von, String(v), id + ' gibt die Antwort ' + v + ' unverändert weiter.', 2);
            return v;
        }
        function addK(id, ruf_von) {
            var n = z.next[id];
            if (n === null) {
                z.next[id] = 'k5'; z.next.k5 = null; z.daten.k5 = gesucht;
                s('neu', id, 'k5', 'new Knoten', id + ' hat keinen Nachfolger: Er erzeugt einen neuen Knoten mit ' + gesucht + ' und trägt ihn als Nachfolger ein.', 'Knoten', 0);
                zurueck(id, ruf_von, 'true', id + ' meldet Erfolg: true.', 0);
                return true;
            }
            ruf(id, n, id + ' ist nicht der letzte und gibt den Auftrag an ' + n + ' weiter.');
            addK(n, id);
            zurueck(id, ruf_von, 'true', id + ' reicht true zurück.', 1);
            return true;
        }
        function entfernenK(id, ruf_von) {
            var n = z.next[id];
            if (n === null) {
                zurueck(id, ruf_von, 'false', id + ' hat keinen Nachfolger mehr: ' + gesucht + ' gibt es nicht. Antwort false.', 0);
                return false;
            }
            if (z.daten[n] === gesucht) {
                z.next[id] = z.next[n];
                s('aendern', id, id, 'nachfolger = ' + name(z.next[id]), id + ' schaut voraus: Sein Nachfolger ' + n + ' trägt ' + gesucht + '. ' + id + ' überspringt ihn und verweist jetzt auf ' + name(z.next[id]) + '.', 'Knoten', 1);
                zurueck(id, ruf_von, 'true', id + ' meldet Erfolg: true.', 1);
                return true;
            }
            ruf(id, n, id + ' schaut voraus: ' + n + ' trägt ' + z.daten[n] + ', nicht ' + gesucht + '. Er gibt den Auftrag an ' + n + ' weiter.');
            var v = entfernenK(n, id);
            zurueck(id, ruf_von, String(v), id + ' reicht ' + v + ' zurück.', 2);
            return v;
        }

        // --- Kompositum ---
        function laengeC(id, ruf_von) {
            if (id === 'ab') { zurueck('ab', ruf_von, 0, 'Der Abschluss antwortet 0. Er fragt niemanden – hier endet die Rekursion.', 0); return 0; }
            var n = z.next[id];
            ruf(id, n, id + ' fragt seinen Nachfolger ' + name(n) + '. Ob das ein Knoten oder der Abschluss ist, muss ' + id + ' nicht wissen.');
            var v = laengeC(n, id);
            zurueck(id, ruf_von, v + 1, id + ' antwortet ' + v + ' + 1 = ' + (v + 1) + '.', 0);
            return v + 1;
        }
        function enthaeltC(id, ruf_von) {
            if (id === 'ab') { zurueck('ab', ruf_von, 'false', 'Der Abschluss antwortet false: Bis hierher wurde nichts gefunden.', 0); return false; }
            if (z.daten[id] === gesucht) { zurueck(id, ruf_von, 'true', id + ' trägt ' + gesucht + ': Antwort true.', 0); return true; }
            var n = z.next[id];
            ruf(id, n, id + ' trägt ' + z.daten[id] + ' und fragt seinen Nachfolger ' + name(n) + '.');
            var v = enthaeltC(n, id);
            zurueck(id, ruf_von, String(v), id + ' gibt ' + v + ' weiter.', 1);
            return v;
        }
        function addC(id, ruf_von) {
            if (id === 'ab') {
                z.next.k5 = 'ab'; z.daten.k5 = gesucht;
                s('neu', 'ab', 'k5', 'new Knoten', 'Der Abschluss erzeugt einen neuen Knoten k5 mit ' + gesucht + ' und trägt sich selbst als dessen Nachfolger ein.', 'Abschluss', 0);
                zurueck('ab', ruf_von, 'k5', 'Der Abschluss antwortet: k5. „An meiner bisherigen Stelle steht jetzt k5.“', 1);
                return 'k5';
            }
            var n = z.next[id];
            ruf(id, n, id + ' gibt den Auftrag an ' + name(n) + ' weiter.');
            var r = addC(n, id);
            var alt = z.next[id];
            z.next[id] = r;
            s('aendern', id, id, 'nachfolger = ' + name(r), id + ' trägt die Antwort als Nachfolger ein: ' + (alt === r ? name(r) + ' (wie vorher).' : name(r) + ' statt ' + name(alt) + '. Jetzt ist k5 verkettet!'), 'Knoten', 0);
            zurueck(id, ruf_von, id, id + ' antwortet: ich selbst (' + id + ').', 1);
            return id;
        }
        function entfernenC(id, ruf_von) {
            if (id === 'ab') { zurueck('ab', ruf_von, 'Abschluss', 'Der Abschluss: ' + gesucht + ' gab es nicht. Er antwortet mit sich selbst – nichts ändert sich.', 0); return 'ab'; }
            if (z.daten[id] === gesucht) {
                var n0 = z.next[id];
                zurueck(id, ruf_von, name(n0), id + ' trägt ' + gesucht + ' und antwortet mit seinem Nachfolger ' + name(n0) + ': „Überspringt mich!“', 0);
                return n0;
            }
            var n = z.next[id];
            ruf(id, n, id + ' trägt ' + z.daten[id] + ' und gibt den Auftrag an ' + name(n) + ' weiter.');
            var r = entfernenC(n, id);
            var alt = z.next[id];
            z.next[id] = r;
            s('aendern', id, id, 'nachfolger = ' + name(r), id + ' trägt die Antwort als Nachfolger ein: ' + (alt === r ? name(r) + ' (wie vorher).' : name(r) + ' statt ' + name(alt) + '. Damit ist ' + name(alt) + ' ausgehängt.'), 'Knoten', 1);
            zurueck(id, ruf_von, id, id + ' antwortet: ich selbst (' + id + ').', 1);
            return id;
        }

        // --- Start beim Hauptprogramm ---
        s('aufruf', 'hp', 'liste', aufrufText, 'Das Hauptprogramm ruft liste.' + aufrufText + ' auf.', 'Liste', null);
        stapel.push('liste');
        if (modus === 'kompositum') {
            var a = z.anfang;
            if (regelname === 'laenge') {
                ruf('liste', a, 'Die Liste fragt ihren anfang ' + name(a) + '. Eine Abfrage „ist anfang null?“ braucht sie nicht.');
                var v1 = laengeC(a, 'liste');
                zurueck('liste', 'hp', v1, 'Die Liste gibt ' + v1 + ' zurück.', 0);
            } else if (regelname === 'enthaelt') {
                ruf('liste', a, 'Die Liste fragt ihren anfang ' + name(a) + '.');
                var v2 = enthaeltC(a, 'liste');
                zurueck('liste', 'hp', String(v2), 'Die Liste gibt ' + v2 + ' zurück.', 0);
            } else if (regelname === 'add') {
                ruf('liste', a, 'Die Liste gibt den Auftrag an ihren anfang ' + name(a) + '.');
                var r1 = addC(a, 'liste');
                z.anfang = r1;
                s('aendern', 'liste', 'liste', 'anfang = ' + name(r1), 'Die Liste trägt die Antwort als anfang ein: ' + name(r1) + '. (In einer leeren Liste wäre das der neue Knoten!)', 'Liste', 0);
                zurueck('liste', 'hp', 'true', 'Die Liste meldet true.', 0);
            } else {
                ruf('liste', a, 'Die Liste gibt den Auftrag an ihren anfang ' + name(a) + '.');
                var r2 = entfernenC(a, 'liste');
                var alt2 = z.anfang;
                z.anfang = r2;
                s('aendern', 'liste', 'liste', 'anfang = ' + name(r2), 'Die Liste trägt die Antwort als anfang ein: ' + name(r2) + (alt2 !== r2 ? '. Damit ist ' + name(alt2) + ' ausgehängt – ohne jeden Sonderfall!' : ' (wie vorher).'), 'Liste', 0);
                zurueck('liste', 'hp', 'true', 'Die Liste meldet true.', 0);
            }
        } else {
            if (regelname === 'laenge' || regelname === 'ohneAbbruch') {
                ruf('liste', 'k1', 'Die Liste ist nicht leer. Sie fragt ihren ersten Knoten k1.');
                var v3 = laengeK('k1', 'liste', regelname === 'ohneAbbruch');
                if (v3 !== null) zurueck('liste', 'hp', v3, 'Die Liste gibt ' + v3 + ' an das Hauptprogramm zurück.', 1);
            } else if (regelname === 'enthaelt') {
                ruf('liste', 'k1', 'Die Liste ist nicht leer. Sie fragt k1.');
                var v4 = enthaeltK('k1', 'liste');
                zurueck('liste', 'hp', String(v4), 'Die Liste gibt ' + v4 + ' zurück.', 1);
            } else if (regelname === 'add') {
                ruf('liste', 'k1', 'Die Liste ist nicht leer. Sie gibt den Auftrag an k1.');
                addK('k1', 'liste');
                zurueck('liste', 'hp', 'true', 'Die Liste meldet true.', 1);
            } else {
                if (z.daten.k1 === gesucht) {
                    z.anfang = z.next.k1;
                    s('aendern', 'liste', 'liste', 'anfang = ' + name(z.anfang), 'Sonderfall: Der erste Knoten trägt ' + gesucht + '. Ihn kann kein Vorgänger aushängen – das macht die Liste selbst.', 'Liste', 1);
                    zurueck('liste', 'hp', 'true', 'Die Liste meldet true.', 1);
                } else {
                    ruf('liste', 'k1', 'k1 trägt nicht ' + gesucht + '. Die Liste fragt k1.');
                    var v5 = entfernenK('k1', 'liste');
                    zurueck('liste', 'hp', String(v5), 'Die Liste gibt ' + v5 + ' zurück.', 2);
                }
            }
        }
        return { schritte: schritte, regelname: regelname };
    }

    // ---------- Zeichnen ----------
    function spalten(modus, methode) {
        var s = ['hp', 'liste', 'k1', 'k2', 'k3', 'k4'];
        if (methode === 'add') s.push('k5');
        if (modus === 'kompositum') s.push('ab');
        if (methode === 'ohneAbbruch') s.push('null');
        return s;
    }

    function titel(id) { return id === 'hp' ? 'Hauptprogramm' : id === 'liste' ? 'liste : Liste' : id === 'ab' ? ': Abschluss' : id === 'null' ? 'null' : id + ' : Knoten'; }

    function zeichneStruktur(svg, zustand, modus) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var defs = el('defs', {}, svg);
        var mk = el('marker', { id: svg.__mid + 'p', viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 9, markerHeight: 9, orient: 'auto' }, defs);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#475569' }, mk);
        var x = 8, y = 18, w = 70, hh = 34;
        el('rect', { x: x, y: y, width: w, height: hh, rx: 4, 'class': 'rw-liste' }, svg);
        el('text', { x: x + w / 2, y: y + 12, 'class': 'rw-klein' }, svg, 'liste');
        el('text', { x: x + w / 2, y: y + 26, 'class': 'rw-klein rw-mono' }, svg, 'anfang');
        var vorher = { x: x + w, y: y + hh / 2 };
        var id = zustand.anfang, n = 0;
        var besucht = {};
        x += w + 26;
        while (id && id !== 'ab' && !besucht[id] && n < 7) {
            besucht[id] = true;
            el('path', { d: 'M' + vorher.x + ',' + vorher.y + ' L' + (x - 3) + ',' + (y + hh / 2), 'class': 'rw-pfeil', 'marker-end': 'url(#' + svg.__mid + 'p)' }, svg);
            el('rect', { x: x, y: y, width: 84, height: hh, rx: 4, 'class': 'rw-knoten' + (id === 'k5' ? ' rw-neu' : '') }, svg);
            el('text', { x: x + 42, y: y + 12, 'class': 'rw-klein' }, svg, id);
            el('text', { x: x + 42, y: y + 26 }, svg, zustand.daten[id]);
            vorher = { x: x + 84, y: y + hh / 2 };
            x += 84 + 22;
            id = zustand.next[id];
            n++;
        }
        if (modus === 'kompositum') {
            el('path', { d: 'M' + vorher.x + ',' + vorher.y + ' L' + (x - 3) + ',' + (y + hh / 2), 'class': 'rw-pfeil', 'marker-end': 'url(#' + svg.__mid + 'p)' }, svg);
            el('rect', { x: x, y: y, width: 84, height: hh, rx: 4, 'class': 'rw-abschluss' }, svg);
            el('text', { x: x + 42, y: y + hh / 2 + 1 }, svg, 'Abschluss');
        } else {
            el('text', { x: vorher.x + 6, y: vorher.y + 1, 'class': 'rw-null rw-links' }, svg, 'null');
        }
    }

    function werkstatt(box) {
        var modus = box.getAttribute('data-rekursion') === 'kompositum' ? 'kompositum' : 'null';
        var mid = 'rw' + Math.random().toString(36).slice(2, 7);
        box.innerHTML =
            '<div class="rw-knoepfe">' +
            '  <label>Aufruf: <select data-rw-methode></select></label>' +
            '  <button type="button" class="knopf-klein knopf-haupt" data-rw-schritt>Nächster Schritt ▶</button>' +
            '  <button type="button" class="knopf-klein" data-rw-alles>Bis zum Ende</button>' +
            '  <button type="button" class="knopf-klein" data-rw-neu>Von vorn</button>' +
            '  <label class="rw-regelwahl"><input type="checkbox" data-rw-regel> Regeln zeigen</label>' +
            '</div>' +
            '<svg class="rw-struktur" viewBox="0 0 820 70" role="img" aria-label="Aktueller Aufbau der Liste"></svg>' +
            '<div class="rw-haupt">' +
            '  <div class="rw-seq-rahmen"><svg class="rw-seq" role="img" aria-label="Sequenzdiagramm der Aufrufe"></svg></div>' +
            '  <div class="rw-seite">' +
            '    <div class="rw-text" aria-live="polite"></div>' +
            '    <div class="rw-stapel"><div class="rw-titel">Wartende Aufrufe</div><ol></ol></div>' +
            '    <div class="rw-regel" hidden><div class="rw-titel"></div><ol></ol></div>' +
            '  </div>' +
            '</div>';
        var auswahl = box.querySelector('[data-rw-methode]');
        METHODEN[modus].forEach(function (m) {
            var o = document.createElement('option');
            o.value = m[0];
            o.textContent = m[1];
            auswahl.appendChild(o);
        });
        var struktur = box.querySelector('.rw-struktur');
        struktur.__mid = mid;
        var seq = box.querySelector('.rw-seq');
        var text = box.querySelector('.rw-text');
        var stapelOl = box.querySelector('.rw-stapel ol');
        var regelBox = box.querySelector('.rw-regel');
        var regelWahl = box.querySelector('[data-rw-regel]');
        var daten, pos, sp;

        function neu() {
            daten = ablauf(modus, auswahl.value);
            sp = spalten(modus, auswahl.value);
            pos = 0;
            zeige();
        }

        function zeige() {
            var aktueller = pos > 0 ? daten.schritte[pos - 1] : null;
            var zustand = aktueller ? aktueller.zustand : daten.schritte[0].zustand;
            zeichneStruktur(struktur, aktueller ? aktueller.zustand : (function () {
                var z0 = JSON.parse(JSON.stringify(daten.schritte[0].zustand)); return z0;
            })(), modus);
            zeichneSeq();
            text.textContent = aktueller ? aktueller.text : 'Wähle einen Aufruf und gehe mit „Nächster Schritt“ durch den Ablauf. Überlege vor jedem Schritt: Wer ist dran, und was antwortet er?';
            if (aktueller && aktueller.art === 'absturz') text.classList.add('rw-fehler'); else text.classList.remove('rw-fehler');
            stapelOl.textContent = '';
            var st = aktueller ? aktueller.stapel : [];
            if (!st.length) stapelOl.appendChild(Object.assign(document.createElement('li'), { textContent: pos >= daten.schritte.length ? 'keine – alles erledigt' : '–' }));
            st.slice().reverse().forEach(function (n, i) {
                var li = document.createElement('li');
                li.textContent = n + (i === 0 ? ' arbeitet gerade' : ' wartet auf eine Antwort');
                stapelOl.appendChild(li);
            });
            // Regel des gerade arbeitenden Objekts
            var regeln = REGELN[modus][daten.regelname] || {};
            var objTyp = aktueller ? aktueller.regelObj : 'Liste';
            var zeilen = regeln[objTyp] || [];
            regelBox.hidden = !regelWahl.checked;
            regelBox.querySelector('.rw-titel').textContent = 'Regel: ' + (objTyp === 'null' ? '–' : objTyp) + '.' + (daten.regelname === 'ohneAbbruch' ? 'laenge' : daten.regelname) + '()';
            var ol = regelBox.querySelector('ol');
            ol.textContent = '';
            zeilen.forEach(function (z, i) {
                var li = document.createElement('li');
                li.textContent = z;
                if (aktueller && aktueller.regelZeile === i && aktueller.art !== 'aufruf') li.className = 'rw-aktiv';
                ol.appendChild(li);
            });
            box.querySelector('[data-rw-schritt]').disabled = pos >= daten.schritte.length;
            box.querySelector('[data-rw-alles]').disabled = pos >= daten.schritte.length;
            void zustand;
        }

        function x(id) {
            var i = sp.indexOf(id);
            var abstand = Math.min(118, (820 - 56 - 50) / (sp.length - 1));
            return 56 + i * abstand;
        }

        function zeichneSeq() {
            while (seq.firstChild) seq.removeChild(seq.firstChild);
            var zeilenH = 30, kopfY = 6, start = 52;
            var gezeigt = daten.schritte.slice(0, pos);
            var hoehe = start + Math.max(gezeigt.length, 4) * zeilenH + 16;
            seq.setAttribute('viewBox', '0 0 820 ' + hoehe);
            var defs = el('defs', {}, seq);
            [['a', '#1e293b', 'z'], ['r', '#0f766e', ''], ['n', '#7c3aed', 'z']].forEach(function (m) {
                var mk = el('marker', { id: mid + m[0], viewBox: '0 0 10 10', refX: 9, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 9, markerHeight: 9, orient: 'auto' }, defs);
                el('path', { d: m[2] ? 'M0,0 L10,5 L0,10 z' : 'M0,0 L10,5 L0,10', fill: m[2] ? m[1] : 'none', stroke: m[1], 'stroke-width': 1.5 }, mk);
            });
            // Erzeugungszeitpunkt von k5
            var k5Zeile = -1;
            gezeigt.forEach(function (st, i) { if (st.art === 'neu' && k5Zeile < 0) k5Zeile = i; });
            sp.forEach(function (id) {
                if (id === 'k5' && k5Zeile < 0) return;
                var y0 = id === 'k5' ? start + k5Zeile * zeilenH - 12 : kopfY;
                var bw = id === 'hp' ? 104 : 86;
                el('rect', { x: x(id) - bw / 2, y: y0, width: bw, height: 24, rx: 4, 'class': 'rw-kopf' + (id === 'ab' ? ' rw-kopf-ab' : '') + (id === 'null' ? ' rw-kopf-null' : '') }, seq);
                el('text', { x: x(id), y: y0 + 13, 'class': 'rw-klein' }, seq, titel(id));
                el('line', { x1: x(id), y1: y0 + 24, x2: x(id), y2: hoehe - 4, 'class': 'rw-leben' }, seq);
            });
            gezeigt.forEach(function (st, i) {
                var y = start + i * zeilenH;
                var letzt = i === gezeigt.length - 1;
                var x1 = x(st.von), x2 = x(st.zu);
                if (st.art === 'aufruf' || st.art === 'neu') {
                    var istNeu = st.art === 'neu';
                    // Beim Erzeugen endet der Pfeil am Kopf des neuen Objekts
                    var ziel = istNeu ? x2 + (x2 > x1 ? -45 : 45) : x2 + (x2 > x1 ? -4 : 4);
                    el('path', { d: 'M' + x1 + ',' + y + ' L' + ziel + ',' + y, 'class': 'rw-ruf' + (istNeu ? ' rw-ruf-neu' : '') + (letzt ? ' rw-letzt' : ''), 'marker-end': 'url(#' + mid + (istNeu ? 'n' : 'a') + ')' }, seq);
                    el('text', { x: (x1 + ziel) / 2, y: y - 9, 'class': 'rw-klein rw-mono rw-label' }, seq, istNeu ? 'new' : st.beschriftung);
                } else if (st.art === 'rueckgabe') {
                    el('path', { d: 'M' + x1 + ',' + y + ' L' + (x2 + (x2 > x1 ? -4 : 4)) + ',' + y, 'class': 'rw-rueck' + (letzt ? ' rw-letzt' : ''), 'marker-end': 'url(#' + mid + 'r)' }, seq);
                    el('text', { x: (x1 + x2) / 2, y: y - 10, 'class': 'rw-wert rw-mono rw-label' }, seq, st.beschriftung);
                } else if (st.art === 'aendern') {
                    el('rect', { x: x1 + 6, y: y - 11, width: 8 + st.beschriftung.length * 6.6, height: 20, rx: 3, 'class': 'rw-aendern' + (letzt ? ' rw-letzt-box' : '') }, seq);
                    el('text', { x: x1 + 10, y: y, 'class': 'rw-klein rw-mono rw-links' }, seq, st.beschriftung);
                } else if (st.art === 'absturz') {
                    el('path', { d: 'M' + (x2 - 9) + ',' + (y - 9) + ' L' + (x2 + 9) + ',' + (y + 9) + ' M' + (x2 + 9) + ',' + (y - 9) + ' L' + (x2 - 9) + ',' + (y + 9), 'class': 'rw-x' }, seq);
                    el('text', { x: x2 - 14, y: y, 'class': 'rw-fehlertext rw-rechts' }, seq, 'NullPointerException');
                }
            });
        }

        box.querySelector('[data-rw-schritt]').addEventListener('click', function () { if (pos < daten.schritte.length) { pos++; zeige(); } });
        box.querySelector('[data-rw-alles]').addEventListener('click', function () { pos = daten.schritte.length; zeige(); });
        box.querySelector('[data-rw-neu]').addEventListener('click', neu);
        auswahl.addEventListener('change', neu);
        regelWahl.addEventListener('change', zeige);
        neu();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-rekursion]').forEach(werkstatt);
    });
})();
