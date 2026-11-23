/*
 * Binärbäume (Informatik 12, Kapitel 2) – Spiele und Werkzeuge der Stationsseiten
 *
 *   Namen raten (2.1)          <div data-raten>
 *   Baum-Safari (2.1)          <div data-safari>                 Begriffe am Verzeichnis anklicken
 *   Such-Sprint (2.1)          <div data-suchsprint>             Suchpfad klicken, auch erfolglose Suche
 *   Baumschule (2.1)           <div data-baumschule>             einfügen: freien Platz anklicken, 3 Level
 *   Aufruf-Verfolger (2.2)     <div data-verfolger>              einfuegen/suchen im Kompositum Schritt für Schritt
 *   Umrundung (2.3)            <div data-umrundung>              Pre-/In-/Postorder mit Fähnchen
 *   Reihenfolge-Rennen (2.3)   <div data-rennen>                 Knoten in Traversierungsreihenfolge anklicken
 *   Backup-Labor (2.3)         <div data-backup>                 Reihenfolge speichern, neu einlesen, vergleichen
 *   Baum-Architekt (2.4)       <div data-architekt>              Einfügereihenfolge wählen, Höhe beobachten
 *   Wachstums-Rechner (2.4)    <div data-wachstum>               Vergleiche: Liste, entartet, ausgewogen
 *   Baumbild (alle)            <div data-baumbild="Mika Emil Tara" [data-abschluesse] [data-markiert="Mika Tara"]>
 *   Quiz (alle)                <div class="bb-quiz"> mit <div class="bb-frage" data-richtig="1"> … <button> … <p class="bb-erkl">
 *   Abzeichen (alle)           <div data-abzeichen-wand>         gesammelt in localStorage 'bbAbzeichen'
 *
 * Fortlaufendes Beispiel: das Spielerverzeichnis des (erfundenen) Online-Spiels Sternenstaub.
 * Namen werden wie in Java mit compareTo verglichen (Zeichencodes, alle Namen beginnen groß).
 * Keine Abhängigkeiten, keine Daten verlassen den Browser.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var VERZEICHNIS = ['Mika', 'Emil', 'Tara', 'Bo', 'Ines', 'Pia', 'Zoe', 'Dana', 'Kai', 'Ruby', 'Vik'];
    var NEUE = ['Alex', 'Cleo', 'Finn', 'Gina', 'Hugo', 'Jan', 'Lea', 'Nino', 'Olli', 'Quin', 'Sam', 'Uwe', 'Wim', 'Xena',
                'Yuri', 'Elif', 'Lou', 'Mo', 'Noa', 'Rafi', 'Sina', 'Theo', 'Yara', 'Ivo', 'Juna', 'Kim', 'Liv', 'Ole', 'Ayla', 'Cem'];
    var CW = 62, LH = 74, R = 23;                 // Spaltenbreite, Ebenenabstand, Knotenradius

    // ---------- Hilfen ----------
    function h(tag, attrs, kinder) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') e.textContent = attrs[k];
            else if (k === 'cls') e.className = attrs[k];
            else if (k === 'html') e.innerHTML = attrs[k];
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
    function knopf(text, cls, fn) {
        var b = h('button', { type: 'button', cls: 'knopf-klein' + (cls ? ' ' + cls : ''), text: text });
        if (fn) b.addEventListener('click', fn);
        return b;
    }
    function mische(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function vor(a, b) { return a < b; }      // wie compareTo < 0
    function lese(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
    function schreibe(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* privat */ } }
    function liste(namen) { return namen.join(', '); }

    // ---------- Abzeichen ----------
    var ABZEICHEN = [
        ['halbierer', '🔎', 'Halbierer', 'Namen raten in höchstens 10 Fragen', '2.1'],
        ['safari', '🧭', 'Baumkundig', 'Baum-Safari: alle Begriffe gefunden', '2.1'],
        ['sprinter', '⚡', 'Suchprofi', 'Such-Sprint ohne Fehler', '2.1'],
        ['gaertner', '🌱', 'Baumgärtner', 'Baumschule: alle drei Level', '2.1'],
        ['wurzelwerk', '🧩', 'Wurzelwerk', 'Projekt 2.2: alle Tests grün', '2.2'],
        ['verfolger', '🧵', 'Spurenleser', 'Aufruf-Verfolger bis zur letzten Rückgabe', '2.2'],
        ['rundgang', '🔄', 'Rundgänger', 'Reihenfolge-Rennen: alle drei fehlerfrei', '2.3'],
        ['backup', '💾', 'Backup-Retter', 'Backup-Labor: alle drei Reihenfolgen getestet', '2.3'],
        ['durchlaeufer', '🧩', 'Durchläufer', 'Projekt 2.3: alle Tests grün', '2.3'],
        ['architekt', '🏗️', 'Architekt', 'Baum-Architekt: Perfekt und Profi gelöst', '2.4'],
        ['saboteur', '🪵', 'Saboteur', 'Baum-Architekt: Sabotage und Zickzack gelöst', '2.4'],
        ['hoehenmesser', '🧩', 'Höhenmesser', 'Projekt 2.4: alle Tests grün', '2.4']
    ];
    var COACH_ABZEICHEN = { 'i12-22-spielerverzeichnis': 'wurzelwerk', 'i12-23-traversierung': 'durchlaeufer', 'i12-24-bot-alarm': 'hoehenmesser' };

    function abzeichen(id) {
        var a = lese('bbAbzeichen', {});
        if (a[id]) return;
        a[id] = Date.now();
        schreibe('bbAbzeichen', a);
        var info = ABZEICHEN.filter(function (x) { return x[0] === id; })[0];
        if (info) toast(info[1] + ' Abzeichen „' + info[2] + '“ freigeschaltet!');
        document.querySelectorAll('[data-abzeichen-wand]').forEach(zeigeWand);
    }
    function toast(text) {
        var t = h('div', { cls: 'bb-toast', role: 'status', text: text });
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('weg'); }, 3200);
        setTimeout(function () { t.remove(); }, 3800);
    }
    function zeigeWand(box) {
        var a = lese('bbAbzeichen', {});
        var nur = box.getAttribute('data-abzeichen-wand');
        box.textContent = '';
        var n = 0, gesamt = 0;
        var grid = h('div', { cls: 'bb-wand' });
        ABZEICHEN.forEach(function (x) {
            if (nur && x[4] !== nur) return;
            gesamt++;
            var hat = !!a[x[0]];
            if (hat) n++;
            grid.appendChild(h('div', { cls: 'bb-abz' + (hat ? ' hat' : ''), title: x[3] }, [
                h('span', { cls: 'bb-abz-icon', text: hat ? x[1] : '🔒' }),
                h('strong', { text: x[2] }),
                h('small', { text: x[4] + ' · ' + x[3] })
            ]));
        });
        box.appendChild(h('p', { cls: 'bb-wand-kopf', text: n + ' von ' + gesamt + ' Abzeichen' + (nur ? ' dieser Station' : '') }));
        box.appendChild(grid);
        if (!nur && n > 0) {
            box.appendChild(knopf('Abzeichen zurücksetzen', '', function () {
                if (window.confirm('Alle Abzeichen auf diesem Gerät löschen?')) { schreibe('bbAbzeichen', {}); zeigeWand(box); }
            }));
        }
    }
    window.addEventListener('coach-gruen', function (e) { if (COACH_ABZEICHEN[e.detail]) abzeichen(COACH_ABZEICHEN[e.detail]); });

    // ---------- Baum-Modell ----------
    function Baum(namen) {
        this.wurzel = null;
        var self = this;
        (namen || []).forEach(function (n) { self.einfuegen(n); });
    }
    // Rückgabe: { pfad: [Knoten], knoten: neuer Knoten oder null, vorhanden: Knoten oder null }
    Baum.prototype.einfuegen = function (name) {
        var e = this.suchen(name);
        if (e.knoten) return { pfad: e.pfad, knoten: null, vorhanden: e.knoten };
        var neu = { name: name, links: null, rechts: null };
        if (!e.eltern) this.wurzel = neu;
        else e.eltern[e.seite] = neu;
        return { pfad: e.pfad, knoten: neu, vorhanden: null };
    };
    // Rückgabe: { pfad, knoten (gefunden) oder null, eltern, seite: Stelle des Abschlusses, an dem die Suche endet }
    Baum.prototype.suchen = function (name) {
        var k = this.wurzel, pfad = [], eltern = null, seite = null;
        while (k) {
            pfad.push(k);
            if (k.name === name) return { pfad: pfad, knoten: k, eltern: eltern, seite: seite };
            eltern = k; seite = vor(name, k.name) ? 'links' : 'rechts';
            k = k[seite];
        }
        return { pfad: pfad, knoten: null, eltern: eltern, seite: seite };
    };
    Baum.prototype.reihenfolge = function (art) {
        var aus = [];
        (function gehe(k) {
            if (!k) return;
            if (art === 'pre') aus.push(k.name);
            gehe(k.links);
            if (art === 'in') aus.push(k.name);
            gehe(k.rechts);
            if (art === 'post') aus.push(k.name);
        })(this.wurzel);
        if (art === 'level') {
            aus = []; var q = this.wurzel ? [this.wurzel] : [];
            while (q.length) { var k = q.shift(); aus.push(k.name); if (k.links) q.push(k.links); if (k.rechts) q.push(k.rechts); }
        }
        return aus;
    };
    Baum.prototype.knoten = function () {
        var aus = [];
        (function gehe(k) { if (!k) return; gehe(k.links); aus.push(k); gehe(k.rechts); })(this.wurzel);
        return aus;
    };
    Baum.prototype.hoehe = function () {
        return (function hh(k) { return k ? 1 + Math.max(hh(k.links), hh(k.rechts)) : 0; })(this.wurzel);
    };
    Baum.prototype.eltern = function (ziel) {
        var e = null;
        (function gehe(k) { if (!k) return; if (k.links === ziel || k.rechts === ziel) e = k; gehe(k.links); gehe(k.rechts); })(this.wurzel);
        return e;
    };
    Baum.prototype.ebene = function (ziel) {
        var t = 0;
        (function gehe(k, d) { if (!k) return; if (k === ziel) t = d; gehe(k.links, d + 1); gehe(k.rechts, d + 1); })(this.wurzel, 1);
        return t;
    };
    Baum.prototype.finde = function (name) { return this.suchen(name).knoten; };
    Baum.prototype.teilbaum = function (k) {
        var aus = [];
        (function gehe(x) { if (!x) return; aus.push(x.name); gehe(x.links); gehe(x.rechts); })(k);
        return aus;
    };
    Baum.prototype.form = function () {
        return (function f(k) { return k ? '(' + f(k.links) + k.name + f(k.rechts) + ')' : '.'; })(this.wurzel);
    };

    // Positionen: x aus der Inorder-Nummer, y aus der Ebene
    function anordnen(baum) {
        var i = 0, maxE = 0;
        (function gehe(k, ebene) {
            if (!k) return;
            gehe(k.links, ebene + 1);
            k.x = (i++ + 1) * CW;
            k.y = 36 + (ebene - 1) * LH;
            k.ebeneNr = ebene;
            maxE = Math.max(maxE, ebene);
            gehe(k.rechts, ebene + 1);
        })(baum.wurzel, 1);
        return { breite: (i + 1) * CW, ebenen: maxE };
    }

    // ---------- Zeichnung ----------
    // opts: abschluesse (true), klasse(k) -> String, kanteKlasse(k, kind) -> String, slotKlasse(eltern, seite) -> String,
    //       klick(k), slotKlick(eltern, seite), extra(svg, baum)
    function Zeichnung(eltern, opts) {
        this.opts = opts || {};
        this.wrap = h('div', { cls: 'bb-baum-wrap' });
        this.svg = s('svg', { 'class': 'bb-baum', role: 'img' });
        this.wrap.appendChild(this.svg);
        eltern.appendChild(this.wrap);
    }
    Zeichnung.prototype.zeichne = function (baum, extraOpts) {
        var o = Object.assign({}, this.opts, extraOpts || {});
        var svg = this.svg;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var m = anordnen(baum);
        var mitAb = o.abschluesse !== false;
        var breite = Math.max(m.breite, o.minBreite || 5 * CW);
        var hoehe = 36 + Math.max(m.ebenen - 1, 0) * LH + R + (mitAb ? 52 : 14);
        if (!baum.wurzel) hoehe = mitAb ? 80 : 60;
        svg.setAttribute('viewBox', '0 0 ' + breite + ' ' + hoehe);
        svg.style.minWidth = Math.min(breite, o.minPixel || 430) + 'px';
        svg.style.maxWidth = (o.maxPixel || Math.max(breite * 1.15, 460)) + 'px';
        var kanten = s('g', {}, svg), slots = s('g', {}, svg), knoten = s('g', {}, svg);
        var self = this;
        function slot(el, seite, x, y, vonX, vonY) {
            var kl = 'bb-slot' + (o.slotKlasse ? ' ' + (o.slotKlasse(el, seite) || '') : '') + (o.slotKlick ? ' klickbar' : '');
            s('line', { x1: vonX, y1: vonY, x2: x, y2: y, 'class': 'bb-slotkante' }, kanten);
            var g = s('g', { 'class': kl, transform: 'translate(' + x + ',' + y + ')' }, slots);
            s('rect', { x: -7, y: -7, width: 14, height: 14, rx: 2 }, g);
            if (o.slotKlick) {
                s('rect', { x: -15, y: -15, width: 30, height: 30, 'class': 'bb-trefferflaeche' }, g);
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.setAttribute('aria-label', 'freier Platz ' + (el ? seite + ' unter ' + el.name : 'Wurzel'));
                var f = function () { o.slotKlick(el, seite); };
                g.addEventListener('click', f);
                g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } });
            }
        }
        if (!baum.wurzel) {
            if (mitAb) slot(null, 'wurzel', breite / 2, 30, breite / 2, 30);
            else s('text', { x: breite / 2, y: 30, 'class': 'bb-leer' }, svg, '(leerer Baum)');
            return;
        }
        (function gehe(k) {
            if (!k) return;
            ['links', 'rechts'].forEach(function (seite) {
                var kind = k[seite];
                if (kind) {
                    s('line', { x1: k.x, y1: k.y, x2: kind.x, y2: kind.y, 'class': 'bb-kante ' + (o.kanteKlasse ? o.kanteKlasse(k, kind) || '' : '') }, kanten);
                    gehe(kind);
                } else if (mitAb) {
                    slot(k, seite, k.x + (seite === 'links' ? -CW / 2 : CW / 2), k.y + LH * 0.62, k.x, k.y);
                }
            });
            var kl = 'bb-k ' + (o.klasse ? o.klasse(k) || '' : '') + (o.klick ? ' klickbar' : '');
            var g = s('g', { 'class': kl, transform: 'translate(' + k.x + ',' + k.y + ')' }, knoten);
            s('circle', { r: R }, g);
            s('text', { y: 1 }, g, k.name);
            if (o.klick) {
                g.setAttribute('tabindex', '0');
                g.setAttribute('role', 'button');
                g.setAttribute('aria-label', k.name);
                var f = function () { o.klick(k); };
                g.addEventListener('click', f);
                g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } });
            }
        })(baum.wurzel);
        if (o.extra) o.extra(svg, baum, self);
    };

    function meldung(box) {
        var p = h('p', { cls: 'bb-meldung', 'aria-live': 'polite' });
        box.appendChild(p);
        return function (text, art) { p.textContent = text || ''; p.className = 'bb-meldung' + (art ? ' ' + art : ''); };
    }

    // =====================================================================
    //  Namen raten (2.1)
    // =====================================================================
    function tausendNamen() {
        var K = 'BDFGHKLMNPRSTVWZ', V = 'aeiou', alle = [];
        for (var a = 0; a < K.length; a++) for (var b = 0; b < V.length; b++) for (var c = 0; c < K.length; c++) for (var d = 0; d < V.length; d++) {
            alle.push(K[a] + V[b] + K[c].toLowerCase() + V[d]);
        }
        var seed = 7, gewaehlt = [];
        function zz() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        var pool = alle.slice();
        while (gewaehlt.length < 1000) { var i = Math.floor(zz() * pool.length); gewaehlt.push(pool.splice(i, 1)[0]); }
        return gewaehlt.sort();
    }
    function raten(box) {
        var namen = tausendNamen();
        var geheim, von, bis, fragen, fertig;
        box.classList.add('bb-spiel');
        var kopf = h('div', { cls: 'bb-spiel-kopf' }, [
            h('strong', { text: '🎮 Namen raten' }),
            h('span', { cls: 'bb-chip', text: '1000 Accounts' })
        ]);
        var status = h('p', { cls: 'bb-status' });
        var balken = h('div', { cls: 'bb-bereich' }, [h('div', { cls: 'bb-bereich-fuell' })]);
        var proben = h('div', { cls: 'bb-proben' });
        var log = h('ol', { cls: 'bb-log' });
        var msg;
        var knoepfe = h('div', { cls: 'bb-knoepfe' }, [knopf('Neues Spiel', '', neu), knopf('So sucht eine Liste', '', listeZeigen)]);
        box.appendChild(kopf);
        box.appendChild(h('p', { text: 'Der Server hat sich einen der 1000 Namen gemerkt. Frag nach einem Namen aus der Liste: Er sagt dir, ob der gesuchte Name im Alphabet früher oder später kommt. Wie wenige Fragen schaffst du?' }));
        box.appendChild(status); box.appendChild(balken); box.appendChild(proben);
        msg = meldung(box);
        box.appendChild(log); box.appendChild(knoepfe);
        function neu() { geheim = Math.floor(Math.random() * 1000); von = 0; bis = 999; fragen = 0; fertig = false; log.textContent = ''; msg(''); zeige(); }
        function zeige() {
            var anzahl = bis - von + 1;
            status.innerHTML = '';
            status.appendChild(document.createTextNode(fertig ? 'Gefunden!' : 'Noch möglich: ' + anzahl + (anzahl === 1 ? ' Name' : ' Namen') + ' (Platz ' + (von + 1) + ' bis ' + (bis + 1) + ')'));
            status.appendChild(h('span', { cls: 'bb-chip', text: 'Fragen: ' + fragen }));
            balken.firstChild.style.left = (von / 10) + '%';
            balken.firstChild.style.width = Math.max(0.4, anzahl / 10) + '%';
            proben.textContent = '';
            if (fertig) return;
            var k = Math.min(9, anzahl), idx = [];
            for (var j = 0; j < k; j++) {
                var i = k === 1 ? von : von + Math.round(j * (bis - von) / (k - 1));
                if (idx.indexOf(i) < 0) idx.push(i);
            }
            idx.forEach(function (i) {
                var b = h('button', { type: 'button', cls: 'bb-probe' }, [h('small', { text: 'Platz ' + (i + 1) }), h('span', { text: namen[i] })]);
                b.addEventListener('click', function () { frage(i); });
                proben.appendChild(b);
            });
        }
        function frage(i) {
            fragen++;
            var t;
            if (i === geheim) {
                fertig = true;
                t = namen[i] + ': Treffer!';
                msg('Gefunden nach ' + fragen + (fragen === 1 ? ' Frage' : ' Fragen') + '. ' + (fragen <= 10
                    ? 'Stark! Wer immer die Mitte fragt, braucht höchstens 10 Fragen, denn 10-mal halbieren: 1000 → 500 → 250 → … → 1.'
                    : 'Geht es mit weniger? Tipp: Frag immer nach dem Namen in der Mitte des Bereichs.'), 'gut');
                if (fragen <= 10) abzeichen('halbierer');
            } else if (i < geheim) {
                von = i + 1; t = namen[i] + ' → der gesuchte Name kommt später';
            } else {
                bis = i - 1; t = namen[i] + ' → der gesuchte Name kommt früher';
            }
            log.appendChild(h('li', { text: t }));
            zeige();
        }
        function listeZeigen() {
            msg('Eine Liste prüft von vorne: ' + namen[0] + ', ' + namen[1] + ', ' + namen[2] + ', … Der gesuchte Name steht auf Platz ' + (geheim + 1) +
                ': Das sind ' + (geheim + 1) + ' Vergleiche. Im Schnitt braucht die Liste 500, im schlimmsten Fall 1000.', 'info');
        }
        neu();
    }

    // =====================================================================
    //  Quiz (alle)
    // =====================================================================
    function quiz(frage) {
        var richtig = +frage.getAttribute('data-richtig');
        var erkl = frage.querySelector('.bb-erkl');
        if (erkl) erkl.hidden = true;
        var knoepfe = frage.querySelectorAll('.bb-optionen button');
        knoepfe.forEach(function (b, i) {
            b.type = 'button';
            b.addEventListener('click', function () {
                if (i === richtig) {
                    b.classList.add('richtig');
                    knoepfe.forEach(function (x) { x.disabled = true; });
                    if (erkl) erkl.hidden = false;
                } else {
                    b.classList.add('falsch');
                    b.disabled = true;
                }
            });
        });
    }

    // =====================================================================
    //  Baum-Safari (2.1)
    // =====================================================================
    var SAFARI = [
        ['Klicke die Wurzel an.', ['Mika'], 'Die Wurzel ist der einzige Knoten ohne Elternknoten: ganz oben.'],
        ['Markiere alle Blätter.', ['Dana', 'Kai', 'Ruby', 'Vik'], 'Blätter haben keine Kinder: Unter ihnen hängen nur Abschlüsse.'],
        ['Markiere alle inneren Knoten.', ['Mika', 'Emil', 'Tara', 'Bo', 'Ines', 'Pia', 'Zoe'], 'Innere Knoten haben mindestens ein Kind. Auch die Wurzel zählt dazu.'],
        ['Markiere alle Kinder von Tara.', ['Pia', 'Zoe'], 'Kinder hängen direkt unter einem Knoten, über genau eine Kante.'],
        ['Markiere den Elternknoten von Kai.', ['Ines'], 'Der Elternknoten hängt direkt über Kai.'],
        ['Markiere den linken Teilbaum von Emil.', ['Bo', 'Dana'], 'Der linke Teilbaum besteht aus dem linken Kind und allem, was darunter hängt.'],
        ['Markiere den rechten Teilbaum von Mika.', ['Tara', 'Pia', 'Ruby', 'Zoe', 'Vik'], 'Zum rechten Teilbaum der Wurzel gehört alles rechts unten, auch Enkel und Urenkel.'],
        ['Markiere alle Knoten auf Ebene 3.', ['Bo', 'Ines', 'Pia', 'Zoe'], 'Die Wurzel liegt auf Ebene 1, ihre Kinder auf Ebene 2, deren Kinder auf Ebene 3.'],
        ['Markiere den Pfad von der Wurzel zu Ruby.', ['Mika', 'Tara', 'Pia', 'Ruby'], 'Ein Pfad folgt den Kanten. Zu jedem Knoten führt von der Wurzel genau ein Pfad.']
    ];
    function safari(box) {
        var baum = new Baum(VERZEICHNIS);
        var nr = 0, gewaehlt = {}, ersteVersuche = 0, versucht = false, geloest = false;
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🧭 Baum-Safari' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        var auftrag = h('p', { cls: 'bb-auftrag' });
        box.appendChild(auftrag);
        var z = new Zeichnung(box, { abschluesse: true, klick: waehle, klasse: function (k) { return gewaehlt[k.name] ? 'gewaehlt' : ''; } });
        var msg = meldung(box);
        var pruefen = knopf('Prüfen', 'knopf-haupt', pruefe);
        var weiter = knopf('Nächste Aufgabe', '', naechste);
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [pruefen, weiter, knopf('Auswahl löschen', '', function () { gewaehlt = {}; zeichne(); })]));
        function zeichne() { z.zeichne(baum); }
        function waehle(k) { if (geloest) return; gewaehlt[k.name] = !gewaehlt[k.name]; zeichne(); }
        function zeige() {
            var a = SAFARI[nr];
            auftrag.textContent = 'Aufgabe ' + (nr + 1) + ' von ' + SAFARI.length + ': ' + a[0];
            box.querySelector('.bb-zaehler').textContent = ersteVersuche + ' auf Anhieb richtig';
            gewaehlt = {}; versucht = false; geloest = false; msg('');
            weiter.hidden = true; pruefen.hidden = false;
            zeichne();
        }
        function pruefe() {
            var soll = SAFARI[nr][1];
            var ist = Object.keys(gewaehlt).filter(function (n) { return gewaehlt[n]; });
            var fehlt = soll.filter(function (n) { return ist.indexOf(n) < 0; });
            var zuviel = ist.filter(function (n) { return soll.indexOf(n) < 0; });
            if (!fehlt.length && !zuviel.length) {
                if (!versucht) ersteVersuche++;
                geloest = true;
                msg('Richtig! ' + SAFARI[nr][2], 'gut');
                pruefen.hidden = true;
                if (nr < SAFARI.length - 1) weiter.hidden = false;
                else { msg('Safari geschafft: ' + ersteVersuche + ' von ' + SAFARI.length + ' auf Anhieb. ' + SAFARI[nr][2], 'gut'); abzeichen('safari'); }
                box.querySelector('.bb-zaehler').textContent = ersteVersuche + ' auf Anhieb richtig';
            } else {
                versucht = true;
                var t = [];
                if (fehlt.length) t.push(fehlt.length === 1 ? 'Ein Knoten fehlt noch.' : fehlt.length + ' Knoten fehlen noch.');
                if (zuviel.length) t.push(zuviel.length === 1 ? 'Ein markierter Knoten gehört nicht dazu.' : zuviel.length + ' markierte Knoten gehören nicht dazu.');
                msg(t.join(' ') + ' Tipp: ' + SAFARI[nr][2], 'schlecht');
            }
        }
        function naechste() { nr++; zeige(); }
        zeige();
    }

    // =====================================================================
    //  Such-Sprint (2.1)
    // =====================================================================
    function suchsprint(box) {
        var baum = new Baum(VERZEICHNIS);
        var runden, nr, schritt, fehler, gesamtFehler, start, erwartet, pfadKlicks, log;
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '⚡ Such-Sprint' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        var auftrag = h('p', { cls: 'bb-auftrag' });
        box.appendChild(auftrag);
        var z = new Zeichnung(box, {
            abschluesse: true, klick: klickKnoten, slotKlick: klickSlot,
            klasse: function (k) { return pfadKlicks.indexOf(k) >= 0 ? 'pfad' : ''; },
            slotKlasse: function (el, seite) { return erwartet && erwartet.fertig && erwartet.eltern === el && erwartet.seite === seite && !erwartet.knoten ? 'ende' : ''; }
        });
        var protokoll = h('ol', { cls: 'bb-log' });
        var msg = meldung(box);
        box.appendChild(protokoll);
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [knopf('Neuer Sprint', '', neu)]));
        function neu() {
            var da = mische(['Ruby', 'Kai', 'Dana', 'Vik', 'Ines', 'Zoe']).slice(0, 3);
            var weg = mische(['Olaf', 'Aaron', 'Lou', 'Zack', 'Nino', 'Cleo']).slice(0, 2);
            runden = mische(da.concat(weg)); nr = 0; gesamtFehler = 0; start = Date.now();
            runde();
        }
        function runde() {
            schritt = 0; fehler = 0; pfadKlicks = []; protokoll.textContent = '';
            erwartet = baum.suchen(runden[nr]);
            erwartet.fertig = false;
            auftrag.innerHTML = '';
            auftrag.appendChild(document.createTextNode('Suche ' + (nr + 1) + ' von ' + runden.length + ': '));
            auftrag.appendChild(h('strong', { text: runden[nr] }));
            auftrag.appendChild(document.createTextNode('. Klicke den Suchweg ab der Wurzel. Gibt es den Namen nicht, klicke am Ende den leeren Platz (Abschluss), an dem die Suche aufgibt.'));
            box.querySelector('.bb-zaehler').textContent = 'Fehler: ' + gesamtFehler;
            msg('');
            z.zeichne(baum);
        }
        function entscheidung(k) {
            var n = runden[nr];
            if (n === k.name) return n + ' = ' + k.name + ': gefunden ①';
            return vor(n, k.name) ? n + ' kommt vor ' + k.name + ' → links ②' : n + ' kommt nach ' + k.name + ' → rechts ③';
        }
        function klickKnoten(k) {
            if (erwartet.fertig) return;
            if (erwartet.pfad[schritt] === k) {
                pfadKlicks.push(k);
                protokoll.appendChild(h('li', { text: entscheidung(k) }));
                schritt++;
                if (erwartet.knoten === k) return fertig();
                msg('');
                z.zeichne(baum);
            } else falsch(k.name);
        }
        function klickSlot(el, seite) {
            if (erwartet.fertig) return;
            if (!erwartet.knoten && schritt === erwartet.pfad.length && erwartet.eltern === el && erwartet.seite === seite) {
                protokoll.appendChild(h('li', { text: 'leerer Teilbaum (Abschluss): ' + runden[nr] + ' gibt es nicht ④' }));
                return fertig();
            }
            falsch('dieser leere Platz');
        }
        function falsch(was) {
            fehler++; gesamtFehler++;
            box.querySelector('.bb-zaehler').textContent = 'Fehler: ' + gesamtFehler;
            var naechster = erwartet.pfad[schritt];
            var t = schritt === 0 ? 'Jede Suche beginnt an der Wurzel.' :
                'Vergleiche ' + runden[nr] + ' mit ' + erwartet.pfad[schritt - 1].name + ': ' + entscheidung(erwartet.pfad[schritt - 1]) + '.';
            msg('Nicht ' + was + '. ' + t + (naechster ? '' : ' Dort ist der Teilbaum leer.'), 'schlecht');
        }
        function fertig() {
            erwartet.fertig = true;
            z.zeichne(baum);
            var v = erwartet.pfad.length;
            var listePlatz = baum.reihenfolge('in').indexOf(runden[nr]);
            var t = (erwartet.knoten ? 'Gefunden mit ' : 'Nicht vorhanden, sicher nach ') + v + (v === 1 ? ' Vergleich' : ' Vergleichen') + '. ' +
                (erwartet.knoten ? 'In einer alphabetischen Liste wären es ' + (listePlatz + 1) + ' gewesen.' : 'Eine Liste müsste dafür alle 11 Namen prüfen.');
            if (nr < runden.length - 1) {
                msg(t, 'gut');
                var weiter = knopf('Weiter', 'knopf-haupt', function () { weiter.remove(); nr++; runde(); });
                box.querySelector('.bb-meldung').appendChild(document.createTextNode(' '));
                box.querySelector('.bb-meldung').appendChild(weiter);
                weiter.focus();
            } else {
                var sek = Math.round((Date.now() - start) / 1000);
                msg(t + ' Sprint beendet: ' + runden.length + ' Suchen in ' + sek + ' s mit ' + gesamtFehler + (gesamtFehler === 1 ? ' Fehler.' : ' Fehlern.') +
                    (gesamtFehler === 0 ? ' Perfekt!' : ' Schaffst du es fehlerfrei?'), 'gut');
                if (gesamtFehler === 0) abzeichen('sprinter');
            }
        }
        neu();
    }

    // =====================================================================
    //  Baumschule (2.1)
    // =====================================================================
    var LEVEL = [
        { titel: 'Level 1: Das Verzeichnis entsteht', start: [], namen: VERZEICHNIS.slice(), text: 'Die ersten elf Accounts registrieren sich in dieser Reihenfolge. Klicke für jeden Namen den freien Platz an, an dem er eingefügt wird.' },
        { titel: 'Level 2: Neue Accounts', start: VERZEICHNIS, namen: null, text: 'Sechs neue Spielerinnen und Spieler registrieren sich im fertigen Verzeichnis.' },
        { titel: 'Level 3: Die Bot-Welle', start: [], namen: ['Ada', 'Ben', 'Cem', 'Dio', 'Eva', 'Fin', 'Gil'], text: 'Sieben Bots registrieren sich, alphabetisch sortiert. Fällt dir etwas auf?' }
    ];
    function baumschule(box) {
        var level = 0, baum, namen, nr, fehler, geschafft = lese('bbBaumschule', {});
        box.classList.add('bb-spiel');
        var levelWahl = h('div', { cls: 'bb-knoepfe bb-tabs' });
        LEVEL.forEach(function (l, i) {
            var b = knopf('Level ' + (i + 1), '', function () { level = i; neu(); });
            b.setAttribute('data-level', i);
            levelWahl.appendChild(b);
        });
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🌱 Baumschule' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        box.appendChild(levelWahl);
        var auftrag = h('p', { cls: 'bb-auftrag' });
        var warte = h('div', { cls: 'bb-warteschlange' });
        box.appendChild(auftrag); box.appendChild(warte);
        var neuer = null, hinweisPfad = [];
        var z = new Zeichnung(box, {
            abschluesse: true, slotKlick: setze,
            klasse: function (k) { return (k === neuer ? 'neu ' : '') + (hinweisPfad.indexOf(k) >= 0 ? 'hinweis' : ''); }
        });
        var msg = meldung(box);
        function neu() {
            var L = LEVEL[level];
            baum = new Baum(L.start);
            namen = L.namen ? L.namen.slice() : mische(NEUE).slice(0, 6);
            nr = 0; fehler = 0; neuer = null; hinweisPfad = [];
            levelWahl.querySelectorAll('button').forEach(function (b) {
                var i = +b.getAttribute('data-level');
                b.setAttribute('aria-pressed', i === level ? 'true' : 'false');
                b.textContent = 'Level ' + (i + 1) + (geschafft[i] ? ' ✓' : '');
            });
            msg('');
            zeige();
        }
        function zeige() {
            var L = LEVEL[level];
            auftrag.innerHTML = '<strong>' + L.titel + '.</strong> ' + L.text;
            warte.textContent = '';
            namen.forEach(function (n, i) {
                warte.appendChild(h('span', { cls: 'bb-name' + (i < nr ? ' erledigt' : i === nr ? ' dran' : ''), text: n }));
            });
            box.querySelector('.bb-zaehler').textContent = 'Fehler: ' + fehler;
            z.zeichne(baum);
        }
        function setze(el, seite) {
            if (nr >= namen.length) return;
            var n = namen[nr];
            var e = baum.suchen(n);
            var stimmt = (!e.eltern && el === null) || (e.eltern === el && e.seite === seite);
            if (stimmt) {
                neuer = baum.einfuegen(n).knoten;
                hinweisPfad = [];
                nr++;
                if (nr === namen.length) return fertig();
                msg(n + ' sitzt. Weiter mit ' + namen[nr] + '.', 'gut');
                zeige();
            } else {
                fehler++;
                hinweisPfad = e.pfad.slice();
                var weg = e.pfad.map(function (k) { return vor(n, k.name) ? 'vor ' + k.name + ' → links' : 'nach ' + k.name + ' → rechts'; });
                msg('Nicht ganz. ' + n + ' kommt ' + weg.join(', dann ') + '. Der orange markierte Weg führt zum richtigen freien Platz.', 'schlecht');
                zeige();
            }
        }
        function fertig() {
            var t = 'Level ' + (level + 1) + ' geschafft mit ' + fehler + (fehler === 1 ? ' Fehler.' : ' Fehlern.');
            if (level === 2) t += ' Der Baum hat ' + baum.hoehe() + ' Ebenen für 7 Namen: Er ist zu einer Liste entartet. Was das für die Suche bedeutet, klärt Station 2.4.';
            if (level === 0) t += ' Das ist das Spielerverzeichnis, das dich durch alle Stationen begleitet.';
            geschafft[level] = true;
            schreibe('bbBaumschule', geschafft);
            if (geschafft[0] && geschafft[1] && geschafft[2]) abzeichen('gaertner');
            neuer = null;
            zeige();
            msg(t, 'gut');
            levelWahl.querySelectorAll('button')[level].textContent = 'Level ' + (level + 1) + ' ✓';
        }
        neu();
    }

    // =====================================================================
    //  Aufruf-Verfolger (2.2)
    // =====================================================================
    var REGELN = {
        einfuegen: {
            Binaerbaum: ['Ist der Name schon vergeben (suchen liefert nicht null)? → Antwort false.', 'Sonst: wurzel = Antwort von wurzel.einfuegen(…). Antwort true.'],
            Knoten: ['① Gleicher Name wie meiner? → Antwort: ich selbst, nichts ändert sich.', '② Kommt der neue Name vor meinem? → links = Antwort von links.einfuegen(…)', '③ Sonst (er kommt danach): rechts = Antwort von rechts.einfuegen(…)', 'Antwort: ich selbst (this).'],
            Abschluss: ['④ Erzeuge einen neuen Knoten mit den Daten (er bekommt zwei neue Abschlüsse). Antwort: der neue Knoten.']
        },
        suchen: {
            Binaerbaum: ['Gib die Antwort von wurzel.suchen(…) weiter.'],
            Knoten: ['① Gleicher Name wie meiner? → Antwort: meine Daten.', '② Kommt der gesuchte Name vor meinem? → Gib die Antwort von links.suchen(…) weiter.', '③ Sonst: Gib die Antwort von rechts.suchen(…) weiter.'],
            Abschluss: ['④ Antwort null. (Bis hierher wurde nichts gefunden.)']
        }
    };
    function verfolgerAblauf(methode, name) {
        var baum = new Baum(VERZEICHNIS);
        var schritte = [], stapel = [], neu = null, angehaengt = false;
        function snap(info, obj, regel, aktiv, extra) {
            schritte.push(Object.assign({
                info: info, obj: obj, regel: regel, aktiv: aktiv,
                stapel: stapel.map(function (f) { return Object.assign({}, f); }),
                neu: neu, angehaengt: angehaengt
            }, extra || {}));
        }
        var e = baum.suchen(name);
        stapel.push({ text: 'verzeichnis.' + methode + '(' + name + ')', obj: 'Binaerbaum' });
        if (methode === 'einfuegen') {
            if (e.knoten) {
                snap('Das Verzeichnis prüft zuerst mit suchen(…), ob ' + name + ' schon vergeben ist: Ja, ' + name + ' gibt es schon.', 'Binaerbaum', 0, null);
                stapel[0].rueck = 'false';
                snap('Antwort false: Der Name ist vergeben, der Baum ändert sich nicht. Genau das soll beim zweiten Kai passieren.', 'Binaerbaum', 0, null, { ende: true });
                return { baum: baum, schritte: schritte };
            }
            snap('Das Verzeichnis prüft zuerst mit suchen(…), ob ' + name + ' schon vergeben ist: Nein.', 'Binaerbaum', 0, null);
            snap('Also gibt es den Auftrag an die Wurzel weiter: wurzel.einfuegen(' + name + '). Das Verzeichnis wartet auf die Antwort.', 'Binaerbaum', 1, null);
            var weg = e.pfad;
            weg.forEach(function (k, i) {
                stapel.push({ text: k.name + '.einfuegen(' + name + ')', obj: 'Knoten', k: k });
                var links = vor(name, k.name);
                var seite = links ? 'links' : 'rechts';
                snap('Knoten ' + k.name + ': ' + name + ' ist nicht ' + k.name + ' ①. ' + name + (links ? ' kommt vor ' : ' kommt nach ') + k.name + ' → ' + seite + ' weiter ' + (links ? '②' : '③') + '. ' +
                    (i < weg.length - 1 ? 'Dort steht Knoten ' + weg[i + 1].name + '.' : 'Dort steht ein Abschluss.') + ' ' + k.name + ' wartet auf die Antwort.', 'Knoten', links ? 1 : 2, k);
            });
            stapel.push({ text: 'Abschluss.einfuegen(' + name + ')', obj: 'Abschluss' });
            neu = { name: name, links: null, rechts: null };
            snap('Der Abschluss ist der freie Platz ④. Er erzeugt einen neuen Knoten ' + name + ' mit zwei neuen Abschlüssen. Ändern kann er den Baum selbst nicht: Er kennt seinen Elternknoten nicht.', 'Abschluss', 0, null);
            stapel[stapel.length - 1].rueck = 'Knoten ' + name;
            snap('Antwort: der neue Knoten ' + name + '. Diese Antwort geht an den Aufrufer zurück.', 'Abschluss', 0, null);
            for (var i = weg.length - 1; i >= 0; i--) {
                var k = weg[i];
                var seite = vor(name, k.name) ? 'links' : 'rechts';
                var antwort = stapel[stapel.length - 1].rueck;
                stapel.pop();
                if (i === weg.length - 1) { angehaengt = true; e.eltern[e.seite] = neu; }
                snap('Knoten ' + k.name + ' bekommt ' + antwort + ' und trägt die Antwort ein: ' + seite + ' = ' + antwort + '.' +
                    (i === weg.length - 1 ? ' Erst jetzt hängt ' + name + ' im Baum!' : ' Das ist derselbe Knoten wie vorher: Es ändert sich nichts, und doch muss ' + k.name + ' eintragen, weil er nicht wissen kann, ob sich etwas geändert hat.'),
                    'Knoten', seite === 'links' ? 1 : 2, k);
                stapel[stapel.length - 1].rueck = 'Knoten ' + k.name;
                snap('Antwort von ' + k.name + ': ich selbst (Knoten ' + k.name + ').', 'Knoten', 3, k);
            }
            var w = stapel[stapel.length - 1].rueck;
            stapel.pop();
            snap('Das Verzeichnis trägt die Antwort ein: wurzel = ' + w + '. (Nur beim allerersten Einfügen ändert sich hier etwas.)', 'Binaerbaum', 1, null);
            stapel[0].rueck = 'true';
            snap('Antwort true: ' + name + ' ist registriert. ' + (e.pfad.length + 2) + ' Aufrufe, und jeder hat eine Antwort zurückgegeben.', 'Binaerbaum', 1, null, { ende: true });
        } else {
            snap('Das Verzeichnis gibt den Auftrag an die Wurzel weiter: wurzel.suchen(' + name + ').', 'Binaerbaum', 0, null);
            e.pfad.forEach(function (k, i) {
                stapel.push({ text: k.name + '.suchen(' + name + ')', obj: 'Knoten', k: k });
                if (k.name === name) {
                    snap('Knoten ' + k.name + ': gleicher Name ①! Gefunden.', 'Knoten', 0, k);
                } else {
                    var links = vor(name, k.name);
                    snap('Knoten ' + k.name + ': ' + name + (links ? ' kommt vor ' : ' kommt nach ') + k.name + ' → nur ' + (links ? 'links ②' : 'rechts ③') + ' weitersuchen. Der andere Teilbaum wird gar nicht angeschaut!', 'Knoten', links ? 1 : 2, k);
                }
            });
            var antwort;
            if (e.knoten) {
                antwort = 'Daten ' + name;
                stapel[stapel.length - 1].rueck = antwort;
                snap('Antwort: die gespeicherten Daten von ' + name + ' (mit Level), nicht der Suchbegriff.', 'Knoten', 0, e.knoten);
            } else {
                stapel.push({ text: 'Abschluss.suchen(' + name + ')', obj: 'Abschluss' });
                antwort = 'null';
                stapel[stapel.length - 1].rueck = 'null';
                snap('Ein Abschluss: Bis hierher wurde ' + name + ' nicht gefunden ④. Antwort null.', 'Abschluss', 0, null);
            }
            var weg2 = e.knoten ? e.pfad.slice(0, -1) : e.pfad;
            stapel.pop();
            for (var j = weg2.length - 1; j >= 0; j--) {
                stapel[stapel.length - 1].rueck = antwort;
                snap('Knoten ' + weg2[j].name + ' gibt die Antwort unverändert weiter: ' + antwort + '.', 'Knoten', vor(name, weg2[j].name) ? 1 : 2, weg2[j]);
                stapel.pop();
            }
            stapel[0].rueck = antwort;
            snap('Das Verzeichnis gibt ' + antwort + ' an das Hauptprogramm. Besuchte Knoten: ' + e.pfad.length + ' von 11.', 'Binaerbaum', 0, null, { ende: true });
        }
        return { baum: baum, schritte: schritte, neu: neu };
    }
    function verfolger(box) {
        var methode = 'einfuegen', name = 'Lou', ablauf, nr = 0;
        box.classList.add('bb-spiel', 'bb-verfolger');
        var wahl = h('select', { 'aria-label': 'Aufruf wählen' });
        [['einfuegen', 'Lou'], ['einfuegen', 'Aaron'], ['einfuegen', 'Zack'], ['einfuegen', 'Kai'],
         ['suchen', 'Ruby'], ['suchen', 'Mika'], ['suchen', 'Olaf'], ['suchen', 'Aaron']].forEach(function (x) {
            wahl.appendChild(h('option', { value: x.join(':'), text: 'verzeichnis.' + x[0] + '(' + x[1] + ')' }));
        });
        wahl.addEventListener('change', function () { var t = wahl.value.split(':'); methode = t[0]; name = t[1]; neu(); });
        var weiterK = knopf('Schritt ▶', 'knopf-haupt', function () { if (nr < ablauf.schritte.length - 1) { nr++; zeige(); } });
        var zurueckK = knopf('◀', '', function () { if (nr > 0) { nr--; zeige(); } });
        zurueckK.setAttribute('aria-label', 'Schritt zurück');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🧵 Aufruf-Verfolger' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [wahl, zurueckK, weiterK, knopf('Von vorn', '', neu)]));
        var raster = h('div', { cls: 'bb-verfolger-raster' });
        var links = h('div'), rechts = h('div');
        raster.appendChild(links); raster.appendChild(rechts);
        box.appendChild(raster);
        var aktiv = null, schritt = null;
        var z = new Zeichnung(links, {
            abschluesse: true,
            klasse: function (k) { return (k === aktiv ? 'aktiv ' : '') + (schritt && schritt.neu && k.name === schritt.neu.name ? 'neu ' : '') + (schritt && schritt.stapel.some(function (f) { return f.k === k; }) ? 'pfad' : ''); },
            kanteKlasse: function (k, kind) { return schritt && schritt.neu && kind.name === schritt.neu.name ? 'neu' : ''; }
        });
        var info = h('p', { cls: 'bb-verfolger-info', 'aria-live': 'polite' });
        links.appendChild(info);
        var regelBox = h('div', { cls: 'bb-regel' });
        var stapelBox = h('div', { cls: 'bb-stapel' });
        rechts.appendChild(regelBox);
        rechts.appendChild(h('h4', { cls: 'bb-klein-titel', text: 'Aufrufstapel (wartende Aufrufe)' }));
        rechts.appendChild(stapelBox);
        function neu() { ablauf = verfolgerAblauf(methode, name); nr = 0; zeige(); }
        function zeige() {
            schritt = ablauf.schritte[nr];
            aktiv = schritt.aktiv;
            // Baum für diesen Schritt: neuer Knoten nur, wenn angehängt; sonst schwebend daneben
            var b = new Baum(VERZEICHNIS);
            if (schritt.neu && schritt.angehaengt) b.einfuegen(schritt.neu.name);
            // Knotenobjekte des Ablaufs auf die frisch gebauten abbilden (für Markierungen)
            var map = {};
            b.knoten().forEach(function (k) { map[k.name] = k; });
            aktiv = schritt.aktiv ? map[schritt.aktiv.name] : null;
            var stapelNamen = schritt.stapel.filter(function (f) { return f.k; }).map(function (f) { return f.k.name; });
            z.zeichne(b, {
                klasse: function (k) {
                    return (k === aktiv ? 'aktiv ' : '') + (schritt.neu && k.name === schritt.neu.name ? 'neu ' : '') + (stapelNamen.indexOf(k.name) >= 0 ? 'pfad' : '');
                },
                extra: function (svg) {
                    if (schritt.neu && !schritt.angehaengt) {
                        var g = s('g', { 'class': 'bb-k neu schwebend', transform: 'translate(' + (CW * 0.75) + ',' + (36 + LH * 3.4) + ')' }, svg);
                        s('circle', { r: R }, g);
                        s('text', { y: 1 }, g, schritt.neu.name);
                        s('text', { y: R + 13, 'class': 'bb-mini' }, g, 'noch nicht im Baum');
                    }
                }
            });
            info.textContent = schritt.info;
            regelBox.textContent = '';
            regelBox.appendChild(h('div', { cls: 'bb-regel-kopf', text: 'Regel von ' + (schritt.obj === 'Knoten' && aktiv ? 'Knoten ' + aktiv.name : schritt.obj === 'Binaerbaum' ? 'verzeichnis (Binaerbaum)' : 'Abschluss') + ' für ' + methode + '(…)' }));
            var ol = h('ul', { cls: 'bb-regel-liste' });
            REGELN[methode][schritt.obj].forEach(function (r, i) { ol.appendChild(h('li', { cls: i === schritt.regel ? 'an' : '', text: r })); });
            regelBox.appendChild(ol);
            stapelBox.textContent = '';
            schritt.stapel.forEach(function (f, i) {
                var zeile = h('div', { cls: 'bb-rahmen' + (i === schritt.stapel.length - 1 ? ' oben' : '') }, [
                    h('span', { cls: 'bb-rahmen-obj ' + f.obj.toLowerCase(), text: f.obj }),
                    h('code', { text: f.text })
                ]);
                zeile.style.marginLeft = (i * 0.9) + 'rem';
                if (f.rueck) zeile.appendChild(h('span', { cls: 'bb-rueck', text: '→ ' + f.rueck }));
                else if (i < schritt.stapel.length - 1) zeile.appendChild(h('span', { cls: 'bb-wartet', text: 'wartet' }));
                stapelBox.appendChild(zeile);
            });
            box.querySelector('.bb-zaehler').textContent = 'Schritt ' + (nr + 1) + ' von ' + ablauf.schritte.length;
            weiterK.disabled = nr >= ablauf.schritte.length - 1;
            zurueckK.disabled = nr === 0;
            if (schritt.ende && methode === 'einfuegen' && name !== 'Kai') abzeichen('verfolger');
        }
        neu();
    }

    // =====================================================================
    //  Umrundung (2.3)
    // =====================================================================
    var ART_NAME = { pre: 'Preorder', 'in': 'Inorder', post: 'Postorder' };
    var ART_SEITE = { pre: 'links', 'in': 'unten', post: 'rechts' };
    function umrundungsWeg(baum) {
        var w = [];
        (function gehe(k) {
            if (!k) return;
            w.push({ k: k, art: 'pre' });
            gehe(k.links);
            w.push({ k: k, art: 'in' });
            gehe(k.rechts);
            w.push({ k: k, art: 'post' });
        })(baum.wurzel);
        return w;
    }
    function punkt(p) {
        var d = R + 9;
        if (p.art === 'pre') return { x: p.k.x - d, y: p.k.y };
        if (p.art === 'in') return { x: p.k.x, y: p.k.y + d };
        return { x: p.k.x + d, y: p.k.y };
    }
    function umrundung(box) {
        var baum = new Baum(VERZEICHNIS), art = 'pre', weg, nr, timer = null;
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🚩 Die Umrundung' })]));
        var wahl = h('div', { cls: 'bb-knoepfe bb-tabs' });
        ['pre', 'in', 'post'].forEach(function (a) {
            var b = knopf(ART_NAME[a] + ' (Fähnchen ' + ART_SEITE[a] + ')', '', function () { art = a; neu(); });
            b.setAttribute('data-art', a);
            wahl.appendChild(b);
        });
        box.appendChild(wahl);
        var z = new Zeichnung(box, { abschluesse: false, minPixel: 480 });
        var ausgabe = h('p', { cls: 'bb-ausgabe' });
        box.appendChild(ausgabe);
        var abspielen = knopf('▶ Abspielen', 'knopf-haupt', spiele);
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [knopf('Schritt', '', schritt), abspielen, knopf('Von vorn', '', neu)]));
        function neu() {
            stop();
            weg = umrundungsWeg(baum); nr = -1;
            wahl.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-art') === art ? 'true' : 'false'); });
            zeige();
        }
        function zeige() {
            var aus = [];
            for (var i = 0; i <= nr; i++) if (weg[i].art === art) aus.push(weg[i].k.name);
            z.zeichne(baum, {
                klasse: function (k) { return aus.indexOf(k.name) >= 0 ? 'besucht' : ''; },
                extra: function (svg) {
                    var pts = weg.map(punkt);
                    var d = 'M' + pts.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L');
                    s('path', { d: d, 'class': 'bb-umweg' }, svg);
                    if (nr >= 0) {
                        var bis = pts.slice(0, nr + 1);
                        s('path', { d: 'M' + bis.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L'), 'class': 'bb-umweg gegangen' }, svg);
                    }
                    weg.forEach(function (p, i) {
                        if (p.art !== art) return;
                        var q = punkt(p);
                        var g = s('g', { 'class': 'bb-flagge' + (i <= nr ? ' erreicht' : ''), transform: 'translate(' + q.x + ',' + q.y + ')' }, svg);
                        s('line', { x1: 0, y1: 0, x2: 0, y2: -15 }, g);
                        s('path', { d: 'M0 -15 L10 -11 L0 -7 Z' }, g);
                    });
                    if (nr >= 0) { var p = punkt(weg[nr]); s('circle', { cx: p.x, cy: p.y, r: 6, 'class': 'bb-wanderer' }, svg); }
                }
            });
            ausgabe.innerHTML = '';
            ausgabe.appendChild(h('strong', { text: ART_NAME[art] + ': ' }));
            ausgabe.appendChild(document.createTextNode(aus.length ? aus.join(' ') : '(noch nichts)'));
        }
        function schritt() { if (nr < weg.length - 1) { nr++; zeige(); } else stop(); }
        function spiele() {
            if (timer) return stop();
            if (nr >= weg.length - 1) nr = -1;
            abspielen.textContent = '⏸ Pause';
            timer = setInterval(schritt, 450);
        }
        function stop() { if (timer) clearInterval(timer); timer = null; abspielen.textContent = '▶ Abspielen'; }
        neu();
    }

    // =====================================================================
    //  Reihenfolge-Rennen (2.3)
    // =====================================================================
    function rennen(box) {
        var art = 'pre', baum, soll, nr, fehler, start, laeuft, geschafft = {};
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🏁 Reihenfolge-Rennen' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        var wahl = h('div', { cls: 'bb-knoepfe bb-tabs' });
        ['pre', 'in', 'post'].forEach(function (a) {
            var b = knopf(ART_NAME[a], '', function () { art = a; neu(); });
            b.setAttribute('data-art', a);
            wahl.appendChild(b);
        });
        box.appendChild(wahl);
        var auftrag = h('p', { cls: 'bb-auftrag' });
        box.appendChild(auftrag);
        var besucht = [];
        var z = new Zeichnung(box, { abschluesse: false, klick: klick, klasse: function (k) { return besucht.indexOf(k.name) >= 0 ? 'besucht' : ''; } });
        var ausgabe = h('p', { cls: 'bb-ausgabe' });
        box.appendChild(ausgabe);
        var msg = meldung(box);
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [knopf('Neuer Baum', '', neu)]));
        function neu() {
            var namen = mische(NEUE).slice(0, 8);
            baum = new Baum(namen);
            while (baum.hoehe() > 4) { namen = mische(NEUE).slice(0, 8); baum = new Baum(namen); }
            soll = baum.reihenfolge(art); nr = 0; fehler = 0; besucht = []; laeuft = true; start = null;
            wahl.querySelectorAll('button').forEach(function (b) {
                var a = b.getAttribute('data-art');
                b.setAttribute('aria-pressed', a === art ? 'true' : 'false');
                b.textContent = ART_NAME[a] + (geschafft[a] ? ' ✓' : '');
            });
            auftrag.innerHTML = 'Klicke alle Knoten in <strong>' + ART_NAME[art] + '</strong> an (' + { pre: 'ich – links – rechts', 'in': 'links – ich – rechts', post: 'links – rechts – ich' }[art] + '). Die Uhr startet mit dem ersten Klick.';
            msg('');
            zeige();
        }
        function zeige() {
            z.zeichne(baum);
            ausgabe.textContent = besucht.length ? besucht.join(' ') : ' ';
            box.querySelector('.bb-zaehler').textContent = 'Fehler: ' + fehler;
        }
        function klick(k) {
            if (!laeuft) return;
            if (!start) start = Date.now();
            if (k.name === soll[nr]) {
                besucht.push(k.name); nr++;
                msg('');
                if (nr === soll.length) {
                    laeuft = false;
                    var sek = ((Date.now() - start) / 1000).toFixed(1).replace('.', ',');
                    msg(ART_NAME[art] + ' geschafft in ' + sek + ' s mit ' + fehler + (fehler === 1 ? ' Fehler.' : ' Fehlern.') + (fehler === 0 ? ' Fehlerfrei!' : ''), 'gut');
                    if (fehler === 0) {
                        geschafft[art] = true;
                        if (geschafft.pre && geschafft['in'] && geschafft.post) abzeichen('rundgang');
                    }
                    wahl.querySelector('[data-art="' + art + '"]').textContent = ART_NAME[art] + (geschafft[art] ? ' ✓' : '');
                }
            } else if (besucht.indexOf(k.name) < 0) {
                fehler++;
                msg('Noch nicht ' + k.name + '. Denk an die Regel: ' + { pre: 'Ein Knoten kommt dran, bevor seine Teilbäume besucht werden.', 'in': 'Erst muss der ganze linke Teilbaum fertig sein.', post: 'Ein Knoten kommt erst dran, wenn beide Teilbäume fertig sind.' }[art], 'schlecht');
            }
            zeige();
        }
        neu();
    }

    // =====================================================================
    //  Backup-Labor (2.3)
    // =====================================================================
    function backup(box) {
        var original = new Baum(VERZEICHNIS), getestet = {};
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '💾 Backup-Labor' })]));
        box.appendChild(h('p', { text: 'Das Verzeichnis wird als Textliste gespeichert und nach einem Serverneustart Name für Name wieder eingefügt. Welche Reihenfolge baut denselben Baum wieder auf?' }));
        var knoepfe = h('div', { cls: 'bb-knoepfe bb-tabs' });
        [['pre', 'Preorder'], ['in', 'Inorder'], ['post', 'Postorder'], ['level', 'Ebene für Ebene']].forEach(function (x) {
            var b = knopf('Backup in ' + x[1], '', function () { teste(x[0], x[1]); });
            b.setAttribute('data-art', x[0]);
            knoepfe.appendChild(b);
        });
        box.appendChild(knoepfe);
        var paar = h('div', { cls: 'bb-paar' });
        var l = h('div', {}, [h('h4', { cls: 'bb-klein-titel', text: 'Original' })]);
        var r = h('div', {}, [h('h4', { cls: 'bb-klein-titel bb-kopie-titel', text: 'Kopie nach dem Neustart' })]);
        paar.appendChild(l); paar.appendChild(r);
        box.appendChild(paar);
        var zo = new Zeichnung(l, { abschluesse: false, minPixel: 300 });
        var zk = new Zeichnung(r, { abschluesse: false, minPixel: 300 });
        var listeP = h('p', { cls: 'bb-ausgabe' });
        box.appendChild(listeP);
        var msg = meldung(box);
        zo.zeichne(original);
        zk.zeichne(new Baum([]));
        function teste(art, titel) {
            var namen = original.reihenfolge(art);
            var kopie = new Baum(namen);
            zk.zeichne(kopie);
            knoepfe.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-art') === art ? 'true' : 'false'); });
            listeP.innerHTML = '';
            listeP.appendChild(h('strong', { text: 'Backup (' + titel + '): ' }));
            listeP.appendChild(document.createTextNode(namen.join(' ')));
            var gleich = kopie.form() === original.form();
            msg(gleich ? 'Gleicher Aufbau! Jeder Knoten wird vor seinen Teilbäumen eingefügt, also sitzt er schon an seinem Platz, wenn die Nachkommen kommen.'
                : 'Anderer Aufbau: Höhe ' + kopie.hoehe() + ' statt ' + original.hoehe() + '. ' + (art === 'in' ? 'Die alphabetische Reihenfolge baut eine Kette – der schlimmste Fall.' : 'Hier wird mindestens ein Knoten nach seinen Nachkommen eingefügt.'),
                gleich ? 'gut' : 'schlecht');
            if (art !== 'level') getestet[art] = true;
            if (getestet.pre && getestet['in'] && getestet.post) abzeichen('backup');
        }
    }

    // =====================================================================
    //  Baum-Architekt (2.4)
    // =====================================================================
    var SIEBEN = ['Ada', 'Ben', 'Cem', 'Dio', 'Eva', 'Fin', 'Gil'];
    var FUENFZEHN = ['Ada', 'Ben', 'Cem', 'Dio', 'Eva', 'Fin', 'Gil', 'Hal', 'Ida', 'Jo', 'Kim', 'Liv', 'Mo', 'Nia', 'Ole'];
    var AUFTRAEGE = [
        { id: 'perfekt', titel: 'Perfekt', namen: SIEBEN, text: 'Baue mit allen 7 Namen einen Baum der Höhe 3.', ok: function (b) { return b.hoehe() === 3; } },
        { id: 'sabotage', titel: 'Sabotage', namen: SIEBEN, text: 'Baue mit allen 7 Namen einen Baum der Höhe 7.', ok: function (b) { return b.hoehe() === 7; } },
        { id: 'zickzack', titel: 'Zickzack', namen: SIEBEN, text: 'Höhe 7 mit allen 7 Namen, aber weder alphabetisch noch rückwärts alphabetisch eingefügt.', ok: function (b, r) {
            return b.hoehe() === 7 && r.join() !== SIEBEN.join() && r.join() !== SIEBEN.slice().reverse().join(); } },
        { id: 'profi', titel: 'Profi', namen: FUENFZEHN, text: 'Baue mit allen 15 Namen einen Baum der Höhe 4.', ok: function (b) { return b.hoehe() === 4; } }
    ];
    function architekt(box) {
        var auftrag = AUFTRAEGE[0], baum, reihe, geloest = lese('bbArchitekt', {});
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '🏗️ Baum-Architekt' }), h('span', { cls: 'bb-chip bb-zaehler' })]));
        var wahl = h('div', { cls: 'bb-knoepfe bb-tabs' });
        AUFTRAEGE.forEach(function (a) {
            var b = knopf(a.titel, '', function () { auftrag = a; neu(); });
            b.setAttribute('data-id', a.id);
            wahl.appendChild(b);
        });
        box.appendChild(wahl);
        var text = h('p', { cls: 'bb-auftrag' });
        var pool = h('div', { cls: 'bb-pool' });
        box.appendChild(text);
        box.appendChild(pool);
        var reiheP = h('p', { cls: 'bb-ausgabe' });
        box.appendChild(reiheP);
        var z = new Zeichnung(box, { abschluesse: false });
        var werte = h('div', { cls: 'bb-werte' });
        box.appendChild(werte);
        var msg = meldung(box);
        box.appendChild(h('div', { cls: 'bb-knoepfe' }, [knopf('Rückgängig', '', function () { reihe.pop(); baue(); }), knopf('Neu', '', neu)]));
        function neu() { reihe = []; baue(); }
        function baue() {
            baum = new Baum(reihe);
            wahl.querySelectorAll('button').forEach(function (b) {
                var id = b.getAttribute('data-id');
                b.setAttribute('aria-pressed', id === auftrag.id ? 'true' : 'false');
                b.textContent = AUFTRAEGE.filter(function (a) { return a.id === id; })[0].titel + (geloest[id] ? ' ✓' : '');
            });
            text.innerHTML = '<strong>' + auftrag.titel + ':</strong> ' + auftrag.text + ' Klicke die Namen in der Reihenfolge an, in der sie sich registrieren.';
            pool.textContent = '';
            auftrag.namen.forEach(function (n) {
                var b = h('button', { type: 'button', cls: 'bb-name-knopf', text: n });
                b.disabled = reihe.indexOf(n) >= 0;
                b.addEventListener('click', function () { reihe.push(n); baue(); });
                pool.appendChild(b);
            });
            reiheP.textContent = reihe.length ? 'Reihenfolge: ' + reihe.join(' ') : 'Reihenfolge: (noch leer)';
            z.zeichne(baum);
            var kn = baum.knoten(), summe = 0;
            kn.forEach(function (k) { summe += baum.ebene(k); });
            werte.textContent = '';
            [['Knoten', kn.length], ['Höhe', baum.hoehe()], ['Vergleiche im schlimmsten Fall', baum.hoehe()],
             ['Vergleiche im Schnitt', kn.length ? (summe / kn.length).toFixed(1).replace('.', ',') : '–']].forEach(function (w) {
                werte.appendChild(h('div', { cls: 'bb-wert' }, [h('small', { text: w[0] }), h('strong', { text: String(w[1]) })]));
            });
            box.querySelector('.bb-zaehler').textContent = AUFTRAEGE.filter(function (a) { return geloest[a.id]; }).length + ' von 4 gelöst';
            if (reihe.length === auftrag.namen.length) {
                if (auftrag.ok(baum, reihe)) {
                    geloest[auftrag.id] = true;
                    schreibe('bbArchitekt', geloest);
                    msg('Auftrag „' + auftrag.titel + '“ gelöst! ' + (auftrag.id === 'perfekt' || auftrag.id === 'profi'
                        ? 'Dein Rezept? Wer zuerst die Mitte einfügt, teilt den Rest in zwei gleich große Hälften.'
                        : 'Entartet ist nicht nur die sortierte Reihenfolge: Es reicht, wenn jeder neue Name ganz außen landet.'), 'gut');
                    if (geloest.perfekt && geloest.profi) abzeichen('architekt');
                    if (geloest.sabotage && geloest.zickzack) abzeichen('saboteur');
                    box.querySelector('.bb-zaehler').textContent = AUFTRAEGE.filter(function (a) { return geloest[a.id]; }).length + ' von 4 gelöst';
                } else {
                    msg('Alle Namen sind drin, aber die Höhe ist ' + baum.hoehe() + '. Rückgängig oder Neu und noch einmal!', 'schlecht');
                }
            } else msg('');
        }
        neu();
    }

    // =====================================================================
    //  Wachstums-Rechner (2.4)
    // =====================================================================
    function wachstum(box) {
        box.classList.add('bb-spiel');
        box.appendChild(h('div', { cls: 'bb-spiel-kopf' }, [h('strong', { text: '📈 Wie viele Vergleiche?' })]));
        var zahl = h('input', { type: 'number', min: '1', max: '1000000000', value: '1000', 'aria-label': 'Anzahl der Accounts', cls: 'bb-zahl' });
        var regler = h('input', { type: 'range', min: '0', max: '90', value: '30', 'aria-label': 'Anzahl der Accounts (Regler)' });
        box.appendChild(h('p', { cls: 'bb-auftrag' }, [h('label', {}, ['Anzahl der Accounts n = ', zahl])]));
        box.appendChild(regler);
        var balken = h('div', { cls: 'bb-balken' });
        box.appendChild(balken);
        box.appendChild(h('p', { cls: 'bb-fuss', text: 'Gezählt werden die besuchten Knoten im schlimmsten Fall. Balkenlänge logarithmisch, sonst wäre der ausgewogene Baum unsichtbar. Tippe eine Zahl ein oder ziehe am Regler.' }));
        function zeige(N) {
            N = Math.max(1, Math.min(1e9, Math.round(N) || 1));
            var aus = Math.ceil(Math.log2(N + 1));
            balken.textContent = '';
            [['Liste', N, 'liste'], ['entarteter Baum (Kette)', N, 'kette'], ['ausgewogener Baum', aus, 'aus']].forEach(function (x) {
                var w = Math.max(2, Math.log10(x[1] + 1) / Math.log10(1e9 + 1) * 100);
                balken.appendChild(h('div', { cls: 'bb-balken-zeile' }, [
                    h('span', { cls: 'bb-balken-name', text: x[0] }),
                    h('span', { cls: 'bb-balken-spur' }, [h('span', { cls: 'bb-balken-fuell ' + x[2], style: 'width:' + w + '%' })]),
                    h('strong', { text: x[1].toLocaleString('de-DE') })
                ]));
            });
        }
        regler.addEventListener('input', function () { var N = Math.round(Math.pow(10, +regler.value / 10)); zahl.value = N; zeige(N); });
        zahl.addEventListener('input', function () { var N = +zahl.value; if (N >= 1) { regler.value = Math.round(Math.log10(N) * 10); zeige(N); } });
        zeige(1000);
    }

    // =====================================================================
    //  Baumbild (statisch, alle)
    // =====================================================================
    function baumbild(box) {
        var namen = (box.getAttribute('data-baumbild') || '').split(/\s+/).filter(Boolean);
        var mark = (box.getAttribute('data-markiert') || '').split(/\s+/);
        var z = new Zeichnung(box, { abschluesse: box.hasAttribute('data-abschluesse'), minPixel: 320, maxPixel: +(box.getAttribute('data-breite') || 0) || undefined });
        z.svg.setAttribute('aria-label', 'Binärbaum, eingefügt in der Reihenfolge ' + namen.join(', '));
        z.zeichne(new Baum(namen), { klasse: function (k) { return mark.indexOf(k.name) >= 0 ? 'pfad' : ''; } });
    }

    // ---------- Start ----------
    function start() {
        var map = {
            '[data-raten]': raten, '[data-safari]': safari, '[data-suchsprint]': suchsprint, '[data-baumschule]': baumschule,
            '[data-verfolger]': verfolger, '[data-umrundung]': umrundung, '[data-rennen]': rennen, '[data-backup]': backup,
            '[data-architekt]': architekt, '[data-wachstum]': wachstum, '.bb-frage': quiz, '[data-abzeichen-wand]': zeigeWand, '[data-baumbild]': baumbild
        };
        function init(wurzel) {
            Object.keys(map).forEach(function (sel) {
                var liste = Array.prototype.slice.call(wurzel.querySelectorAll(sel));
                if (wurzel.matches && wurzel.matches(sel)) liste.unshift(wurzel);
                liste.forEach(function (b) {
                    if (b.bbInit && sel !== '[data-abzeichen-wand]') return;
                    b.bbInit = true;
                    try { map[sel](b); } catch (e) { b.appendChild(h('p', { cls: 'bb-meldung schlecht', text: 'Dieses Element konnte nicht starten: ' + e.message })); }
                });
            });
        }
        init(document);
        // Elemente, die später erscheinen (z. B. Bäume in aufgedeckten Lösungen)
        if (window.MutationObserver) {
            new MutationObserver(function (liste) {
                liste.forEach(function (m) {
                    Array.prototype.forEach.call(m.addedNodes, function (n) {
                        if (n.nodeType === 1 && !n.closest('svg') && !n.classList.contains('bb-toast')) init(n);
                    });
                });
            }).observe(document.body, { childList: true, subtree: true });
        }
    }
    window.Baeume = { Baum: Baum, abzeichen: abzeichen };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
