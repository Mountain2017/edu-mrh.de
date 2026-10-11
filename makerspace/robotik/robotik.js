/*
 * Makerspace · Robotik-Station (LEGO SPIKE Prime) – Lernpfad mit Punkten, Akku, Abzeichen
 * ==========================================================================================
 * Alle Daten bleiben im Browser (localStorage), nichts geht an einen Server.
 *
 * Seiten-Typen (Attribut am <body>):
 *   data-mission="w1"        Missionsseite (Etappen mit Schritten)
 *   data-seite="uebersicht"  robotik.html (Team, Lernpfad, Abzeichen, Spickzettel, Lehrkräfte)
 *
 * Markup einer Missionsseite (Beispiele in starter-1-hallo-hub.html):
 *   <section class="etappe" data-etappe="w1-e2" data-titel="Verbinden" data-min="10">…</section>
 *       class="turbo" → Bonus-Etappe (sperrt nichts; data-ab="w1-e3" = offen ab dieser Etappe)
 *       Normale Etappen öffnen sich nacheinander, sobald alle Pflicht-Schritte davor
 *       (ohne Lehrkraft-Abnahmen) erledigt sind.
 *   <div class="schritt" data-id="w1-q-kabel" data-art="quiz" data-punkte="2" data-titel="…">
 *       data-bonus      → zählt als Extra (über 100 %)
 *       data-art:
 *         check        Selbst bestätigen (data-knopf, data-frage für Rückfrage)
 *         quiz         <ul class="optionen-quelle"><li data-o="a" data-tipp="…">…</li></ul>
 *                      (Antworten werden gemischt angezeigt; data-fest = Reihenfolge behalten)
 *         zahl         Eingabe einer Zahl: data-loesung (exakt) | data-bereiche='[[min,max,"Text"],…]'
 *                      | data-formel="(id1+id2)/2" data-toleranz="2"; data-einheit; data-daneben
 *         luecken      <select class="luecke"><option value="x">…</option></select> im Inhalt
 *         reihenfolge  <div class="teile"><div data-k="q">…</div>…</div>, data-start="HTML" (fester Kopf)
 *         bug          Blöcke mit data-k in .bug-programm – den fehlerhaften anklicken
 *         eingabe      Text: data-min (Zeichen), data-woerter="falls,dann" (müssen vorkommen)
 *         ports        Anschlüsse wählen: data-felder="Linker Motor|Rechter Motor", data-leer (– erlaubt)
 *         abnahme      Lehrkraft bestätigt mit PIN (oder Eintrag auf die Abnahme-Liste)
 *         plan         Planungstafel (Draufsicht), data-parcours='{…}' (siehe planTafel)
 *       <div class="erklaerung" hidden>…</div> erscheint nach der richtigen Lösung
 *   Lösungen (data-loesung): Hash von "<schritt-id>|<antwort>" (Werkzeug im Lehrkräfte-Bereich
 *   von robotik.html), mehrere gültige Antworten durch Leerzeichen getrennt. Klartext ist mit
 *   vorangestelltem "=" möglich (z. B. data-loesung="=b"), dann aber im Quelltext lesbar.
 *   <div class="hilfe" data-fuer="schritt-id"><template data-stufe="Denkanstoß">…</template>
 *       <template data-stufe="Lösung" data-halten>…</template></div>   gestufte Hilfe
 *   <div class="konzept" data-konzept="schleife" data-icon="🔁" data-titel="…">
 *       <div class="k-zeile"><b>Was?</b><p>…</p></div>…</div>   → Karte für den Spickzettel
 *   <span data-wert="w2-ports" data-teil="0">A</span>   zeigt einen gespeicherten Wert an
 */
(function () {
    'use strict';

    // ===================================================================== 1 Konfiguration
    var KONFIG = {
        schluessel: 'edu-mrh-makerspace-robotik',
        // Lehrkraft-PIN als Hash. Neuen Hash erzeugen: robotik.html → Für Lehrkräfte → Werkzeuge.
        pinHash: '19l3aarfmfd',
        salz: 'mrh-robotik-v1',
        sperreSek: 15,           // Wartezeit nach falscher Antwort (wächst mit jedem Fehlversuch)
        stundeMin: 75,           // Arbeitszeit einer Doppelstunde
        aufraeumenMin: 65        // Hinweis "Aufräumen" nach … Minuten
    };

    var MISSIONEN = [
        { id: 'w1', kurs: 'starter', titel: 'Woche 1: Hallo, Hub!', kurz: 'Hallo, Hub!', icon: '👋', seite: 'starter-1-hallo-hub.html',
          voraus: [], lego: 'Erste Schritte + Erfinderteam „Hüpfer-Rennen“',
          text: 'Hub verbinden, Lichtmatrix, Töne, Motoren – und ein Hüpfer-Rennen ohne Räder.' },
        { id: 'w2', kurs: 'starter', titel: 'Woche 2: Fahrschule', kurz: 'Fahrschule', icon: '🚗', seite: 'starter-2-fahrschule.html',
          voraus: ['w1'], lego: 'Wettbewerbsvorbereitung „Trainingslager 1: Herumfahren“',
          text: 'Fahrbasis bauen, genau fahren und drehen, mit der Schleife Formen fahren, Parcours meistern.' },
        { id: 'w3', kurs: 'starter', titel: 'Woche 3: Roboter mit Sinnen', kurz: 'Roboter mit Sinnen', icon: '👀', seite: 'starter-3-sensoren.html',
          voraus: ['w2'], lego: 'Wettbewerbsvorbereitung „Trainingslager 2: Mit Gegenständen spielen“',
          text: 'Sensoren lesen, warten bis …, falls – dann – sonst: ein Roboter, der selbst ausweicht.' },
        { id: 'tresor', kurs: 'tresor', titel: 'Maker: Tresor-Tüftler', kurz: 'Tresor-Tüftler', icon: '🔐', seite: 'maker-tresor.html',
          voraus: ['w1'], lego: 'Unternehmensgründung „Keep It Safe“ / „Keep It Really Safe!“',
          text: 'Ein Tresor mit Geheimcode: Ereignisse, Variablen und und/oder-Bedingungen.' },
        { id: 'show', kurs: 'show', titel: 'Maker: Roboter-Show', kurz: 'Roboter-Show', icon: '🕺', seite: 'maker-roboter-show.html',
          voraus: ['w2'], lego: 'Alltagshelfer „Break Dance“',
          text: 'Ein tanzender Roboter: Takt, mehrere Abläufe gleichzeitig, Nachrichten und eigene Blöcke.' },
        { id: 'linie', kurs: 'linie', titel: 'Maker: Linien-Pilot', kurz: 'Linien-Pilot', icon: '🛤️', seite: 'maker-linienfolger.html',
          voraus: ['w3'], lego: 'Wettbewerbsvorbereitung „Trainingslager 3“ (Reacting to Lines)',
          text: 'Linien erkennen und zählen, einer Linie folgen – bis zum Profi-Regler.' },
        { id: 'innovator', kurs: 'innovator', titel: 'Innovator: Eigenes Projekt', kurz: 'Eigenes Projekt', icon: '💡', seite: 'innovator.html',
          voraus: ['maker2'], lego: 'freie Idee – Lerneinheiten als Ideen-Quelle',
          text: 'Ihr erfindet selbst: Problem finden, planen, bauen, testen, verbessern, präsentieren.' }
    ];

    var KURSE = {
        starter:   { name: 'Starter-Kurs', rang: 'starter', missionen: ['w1', 'w2', 'w3'] },
        tresor:    { name: 'Tresor-Tüftler', rang: 'maker', missionen: ['tresor'] },
        show:      { name: 'Roboter-Show', rang: 'maker', missionen: ['show'] },
        linie:     { name: 'Linien-Pilot', rang: 'maker', missionen: ['linie'] },
        innovator: { name: 'Eigenes Projekt', rang: 'innovator', missionen: ['innovator'] }
    };

    // Abzeichen: gibt es für eine fertige Mission bzw. einen fertigen Kurs (inkl. Abnahmen).
    // Sterne: 100 % = ★, ab 125 % = ★★, 150 % = ★★★
    var ABZEICHEN = [
        { id: 'w1', name: 'Hub-Starter', mission: 'w1', form: 'kreis', farbe: ['#38bdf8', '#0369a1'], symbol: '👋', text: 'Woche 1 komplett' },
        { id: 'w2', name: 'Fahrschul-Profi', mission: 'w2', form: 'kreis', farbe: ['#34d399', '#047857'], symbol: '🚗', text: 'Woche 2 komplett' },
        { id: 'w3', name: 'Sensor-Scout', mission: 'w3', form: 'kreis', farbe: ['#a78bfa', '#6d28d9'], symbol: '👀', text: 'Woche 3 komplett' },
        { id: 'starter', name: 'Robotik-Starter', kurs: 'starter', form: 'schild', farbe: ['#0ea5e9', '#0c4a6e'], symbol: '🤖', text: 'Starter-Kurs geschafft – Rang „Starter“' },
        { id: 'tresor', name: 'Tresor-Meister', mission: 'tresor', form: 'sechseck', farbe: ['#fb923c', '#9a3412'], symbol: '🔐', text: 'Maker-Projekt Tresor' },
        { id: 'show', name: 'Show-Master', mission: 'show', form: 'sechseck', farbe: ['#f472b6', '#9d174d'], symbol: '🕺', text: 'Maker-Projekt Roboter-Show' },
        { id: 'linie', name: 'Linien-Pilot', mission: 'linie', form: 'sechseck', farbe: ['#facc15', '#a16207'], symbol: '🛤️', text: 'Maker-Projekt Linienfolger' },
        { id: 'maker', name: 'Robotik-Maker', makerAnzahl: 2, form: 'schild', farbe: ['#f97316', '#7c2d12'], symbol: '🛠️', text: 'Zwei Maker-Projekte geschafft – Rang „Maker“' },
        { id: 'innovator', name: 'Robotik-Innovator', mission: 'innovator', form: 'stern', farbe: ['#c084fc', '#581c87'], symbol: '💡', text: 'Eigenes Projekt präsentiert – Rang „Innovator“' }
    ];

    // Erfolge (Achievements): kleine Extras, die den Akku „überladen“ (Punkte für den Kurs).
    var ERFOLGE = [
        { id: 'eingestoepselt', icon: '🔌', name: 'Eingestöpselt', text: 'Den Hub zum ersten Mal verbunden', kurs: 'starter', punkte: 1,
          test: function (t) { return erl(t, 'w1-verbunden'); } },
        { id: 'volltreffer', icon: '🎯', name: 'Volltreffer-Serie', text: '5 Aufgaben hintereinander beim ersten Versuch gelöst', kurs: 'starter', punkte: 3,
          test: function (t) { return (t.serieMax || 0) >= 5; } },
        { id: 'fehlerjaeger', icon: '🐞', name: 'Fehlerjäger:in', text: '3 Fehler-Detektiv-Aufgaben gelöst', kurs: 'starter', punkte: 3,
          test: function (t) { return zaehleArt(t, 'bug') >= 3; } },
        { id: 'rollen', icon: '🔄', name: 'Rollen-Wechsler', text: 'In allen drei Starter-Wochen die Rollen getauscht', kurs: 'starter', punkte: 3,
          test: function (t) { return erl(t, 'w1-rollen') && erl(t, 'w2-rollen') && erl(t, 'w3-rollen'); } },
        { id: 'aufraeumen', icon: '🧹', name: 'Aufräum-Held:in', text: 'Jede Starter-Woche ordentlich aufgeräumt', kurs: 'starter', punkte: 3,
          test: function (t) { return erl(t, 'w1-aufraeumen') && erl(t, 'w2-aufraeumen') && erl(t, 'w3-aufraeumen'); } },
        { id: 'ohnespicken', icon: '🙈', name: 'Ohne Spicken', text: 'Den Starter-Kurs geschafft, ohne eine Lösung aufzudecken', kurs: 'starter', punkte: 4,
          test: function (t) { return !!(t.durch && t.durch.w1 && t.durch.w2 && t.durch.w3) && !(t.spick && (t.spick.w1 || t.spick.w2 || t.spick.w3)); } },
        { id: 'komponist', icon: '🎵', name: 'Komponist:in', text: 'Eine eigene Melodie komponiert', kurs: 'starter', punkte: 0,
          test: function (t) { return erl(t, 'w1-t-melodie'); } },
        { id: 'sternfahrer', icon: '⭐', name: 'Sternfahrer:in', text: 'Den Roboter einen Stern fahren lassen', kurs: 'starter', punkte: 0,
          test: function (t) { return erl(t, 'w2-t-stern'); } },
        { id: 'ueberflieger', icon: '🚀', name: 'Überflieger', text: 'Schon während des Starter-Kurses ein Maker-Projekt begonnen', kurs: 'starter', punkte: 3,
          test: function (t) { return !!t.ueberflieger; } },
        { id: 'unknackbar', icon: '🛡️', name: 'Unknackbar', text: 'Der Tresor hat dem Knack-Versuch standgehalten', kurs: 'tresor', punkte: 4,
          test: function (t) { return erl(t, 't-abnahme'); } },
        { id: 'regler', icon: '🎛️', name: 'Regel-Profi', text: 'Einen Proportional-Regler gebaut', kurs: 'linie', punkte: 4,
          test: function (t) { return erl(t, 'l-s3-fertig'); } },
        { id: 'dirigent', icon: '🎼', name: 'Dirigent:in', text: 'Mehrere Abläufe mit Nachrichten synchronisiert', kurs: 'show', punkte: 4,
          test: function (t) { return erl(t, 's-s2-fertig'); } },
        { id: 'erfinder', icon: '💡', name: 'Erfinder:in', text: 'Eine eigene Erweiterung von der Lehrkraft abnehmen lassen', kurs: null, punkte: 0,
          test: function (t) { return erl(t, 't-erf-abnahme') || erl(t, 'l-erf-abnahme') || erl(t, 's-erf-abnahme'); } },
        { id: 'ueberladen', icon: '⚡', name: 'Überladen!', text: 'Einen Akku auf über 125 % geladen', kurs: null, punkte: 0,
          test: function (t) { var p = t.prozent || {}; return Object.keys(p).some(function (k) { return p[k] > 125; }); } }
    ];

    var ICONS = { check: '✔️', quiz: '❓', zahl: '🔢', luecken: '🧩', reihenfolge: '🧩', bug: '🐞', eingabe: '✏️', ports: '🔌', abnahme: '🎓', plan: '🗺️' };
    var VOLLTREFFER_ARTEN = ['quiz', 'luecken', 'reihenfolge', 'bug'];

    // ===================================================================== 2 Hilfsfunktionen
    function hash(str, seed) {           // cyrb53 (gemeinfreie Hash-Funktion), Ergebnis Basis 36
        seed = seed || 0;
        var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (var i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }
    function norm(a) {
        a = String(a == null ? '' : a).trim().toLowerCase().replace(/\s+/g, ' ');
        var z = a.replace(',', '.');
        if (/^[-+]?\d+(\.\d+)?$/.test(z)) return String(parseFloat(z));
        return a;
    }
    function zahlAus(a) {
        var z = String(a == null ? '' : a).trim().replace(',', '.');
        if (!/^[-+]?\d+(\.\d+)?$/.test(z)) return NaN;
        return parseFloat(z);
    }
    function pruefe(id, loesung, antwort) {
        if (!loesung) return false;
        var a = norm(antwort);
        return loesung.trim().split(/\s+/).some(function (l) {
            if (l.charAt(0) === '=') return norm(l.slice(1)) === a;
            return hash(id + '|' + a) === l;
        });
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function el(tag, attrs, html) {
        var e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            if (k === 'class') e.className = attrs[k];
            else if (k === 'text') e.textContent = attrs[k];
            else e.setAttribute(k, attrs[k]);
        });
        if (html != null) e.innerHTML = html;
        return e;
    }
    function mischen(arr) {
        for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
        return arr;
    }
    function mission(id) { return MISSIONEN.filter(function (m) { return m.id === id; })[0]; }
    function erl(t, id) { return !!(t && t.s && t.s[id]); }
    function zaehleArt(t, art) {
        if (!t || !t.s) return 0;
        return Object.keys(t.s).filter(function (k) { return t.s[k].a === art; }).length;
    }
    function datei(name, inhalt, typ) {
        var blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ || 'text/plain' });
        var a = el('a', { href: URL.createObjectURL(blob), download: name });
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
    function dateiname(s) {
        return String(s || 'team').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'team';
    }
    function heute() { return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

    // ===================================================================== 3 Speicher & Teams
    function lese() {
        var d = null;
        try { d = JSON.parse(localStorage.getItem(KONFIG.schluessel) || 'null'); } catch (e) { d = null; }
        if (!d || typeof d !== 'object') d = {};
        if (!d.teams || typeof d.teams !== 'object') d.teams = {};
        return d;
    }
    var speicherWarnung = false;
    function schreibe(d) {
        try { localStorage.setItem(KONFIG.schluessel, JSON.stringify(d)); return true; }
        catch (e) {
            if (!speicherWarnung) { speicherWarnung = true; toast('⚠️', 'Speichern klappt nicht', 'Der Browser blockiert den Speicher (privates Fenster?). Bitte Lehrkraft fragen.'); }
            return false;
        }
    }
    function signatur(team) {
        var kopie = {};
        Object.keys(team).forEach(function (k) { if (k !== 'sig') kopie[k] = team[k]; });
        return hash(KONFIG.salz + JSON.stringify(kopie), 7);
    }
    function gueltig(team) { return !!team && team.sig === signatur(team); }
    function aktivesTeam() {
        var d = lese();
        var t = d.aktiv ? d.teams[d.aktiv] : null;
        return t || null;
    }
    function neuesTeam(name, mitglieder) {
        var d = lese();
        var id = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        var t = { id: id, name: name, mitglieder: mitglieder, erstellt: Date.now(), geaendert: Date.now(),
                  s: {}, werte: {}, versuche: {}, sperre: {}, spick: {}, gespickt: {}, erfolge: {}, durch: {}, fertig: {},
                  prozent: {}, frei: {}, liste: {}, serie: 0, serieMax: 0 };
        t.sig = signatur(t);
        d.teams[id] = t; d.aktiv = id;
        schreibe(d);
        return t;
    }
    function waehleTeam(id) { var d = lese(); if (d.teams[id]) { d.aktiv = id; schreibe(d); } }
    // Ändert das aktive Team: frisch laden, ändern, signieren, speichern (mehrere Tabs bleiben konsistent)
    function aendere(fn, teamId) {
        var d = lese();
        var id = teamId || d.aktiv;
        var t = id ? d.teams[id] : null;
        if (!t) return null;
        if (!gueltig(t)) { zeigeManipuliert(); return null; }
        ['s', 'werte', 'versuche', 'sperre', 'spick', 'gespickt', 'erfolge', 'durch', 'fertig', 'prozent', 'frei', 'liste'].forEach(function (k) {
            if (!t[k] || typeof t[k] !== 'object') t[k] = {};
        });
        fn(t);
        t.geaendert = Date.now();
        t.sig = signatur(t);
        schreibe(d);
        return t;
    }
    function zeigeManipuliert() {
        if ($('.rb-warnung.manipuliert')) return;
        var w = el('div', { class: 'rb-warnung manipuliert' },
            '<strong>⚠️ Dieser Spielstand wurde von außen verändert.</strong> Punkte werden nicht mehr gespeichert. ' +
            'Eure Lehrkraft kann ihn im Lehrkräfte-Bereich von <a href="robotik.html#lehrkraefte">robotik.html</a> wieder freigeben.');
        var c = $('.main-content .container');
        if (c) c.insertBefore(w, c.firstChild.nextSibling);
    }

    // ===================================================================== 4 Katalog (Schritte aller Missionen)
    function katalogAusDokument(doc, missionId) {
        var schritte = [], konzepte = [];
        $$('.etappe', doc).forEach(function (et) {
            var turbo = et.classList.contains('turbo');
            $$('.schritt[data-id]', et).forEach(function (s) {
                schritte.push({ id: s.getAttribute('data-id'), punkte: +s.getAttribute('data-punkte') || 0,
                    bonus: turbo || s.hasAttribute('data-bonus'), art: s.getAttribute('data-art') || 'check',
                    etappe: et.getAttribute('data-etappe'), titel: s.getAttribute('data-titel') || '',
                    volltreffer: VOLLTREFFER_ARTEN.indexOf(s.getAttribute('data-art')) >= 0 || (s.getAttribute('data-art') === 'zahl' && s.hasAttribute('data-loesung')) });
            });
        });
        $$('.konzept[data-konzept]', doc).forEach(function (k) {
            var inhalt = k.querySelector('.k-inhalt');
            konzepte.push({ id: k.getAttribute('data-konzept'), titel: k.getAttribute('data-titel') || '', icon: k.getAttribute('data-icon') || '💡',
                html: inhalt ? inhalt.innerHTML : k.innerHTML, maker: k.classList.contains('maker') });
        });
        var kernMax = 0, bonusMax = 0;
        schritte.forEach(function (s) {
            if (!s.bonus) kernMax += s.punkte; else bonusMax += s.punkte;
            if (s.volltreffer) bonusMax += 1;
        });
        return { mission: missionId, schritte: schritte, konzepte: konzepte, kernMax: kernMax, bonusMax: bonusMax };
    }
    var katalogCache = {};
    function ladeKatalog() {
        if (katalogCache.alle) return katalogCache.alle;
        katalogCache.alle = Promise.all(MISSIONEN.map(function (m) {
            if (katalogCache[m.id]) return Promise.resolve(katalogCache[m.id]);
            return fetch(m.seite, { cache: 'no-cache' }).then(function (r) {
                if (!r.ok) throw new Error(r.status);
                return r.text();
            }).then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                katalogCache[m.id] = katalogAusDokument(doc, m.id);
                return katalogCache[m.id];
            }).catch(function () { return null; });
        })).then(function (liste) {
            var k = {};
            liste.forEach(function (x, i) { k[MISSIONEN[i].id] = x; });
            return k;
        });
        return katalogCache.alle;
    }

    // ===================================================================== 5 Punkte, Prozent, Freischaltung
    // Akku: 100 % = alle Pflicht-Aufgaben; die Extras (Turbo, Volltreffer, Erfolge) füllen die letzten 50 % bis 150 %
    function prozentAus(kern, kernMax, bonus, bonusMax) {
        if (!kernMax) return 0;
        return Math.min(150, Math.floor(100 * kern / kernMax + (bonusMax ? 50 * Math.min(1, bonus / bonusMax) : 0) + 1e-9));
    }
    function missionStand(t, kat) {
        var r = { kern: 0, kernMax: 0, bonus: 0, bonusMax: kat ? kat.bonusMax : 0, offenKern: 0, offenOhneAbnahme: 0, prozent: 0, durch: false, fertig: false, gestartet: false };
        if (!kat) return r;
        kat.schritte.forEach(function (s) {
            var e = t && t.s ? t.s[s.id] : null;
            if (e) r.gestartet = true;
            if (!s.bonus) {
                r.kernMax += s.punkte;
                if (e) r.kern += e.p;
                else { r.offenKern++; if (s.art !== 'abnahme') r.offenOhneAbnahme++; }
            } else if (e) r.bonus += e.p;
            if (e && e.b) r.bonus += e.b;
        });
        r.durch = r.offenOhneAbnahme === 0 && r.kernMax > 0;
        r.fertig = r.offenKern === 0 && r.kernMax > 0;
        r.prozent = prozentAus(r.kern, r.kernMax, r.bonus, r.bonusMax);
        return r;
    }
    function erfolgsPunkte(t, kurs, alle) {
        var p = 0;
        ERFOLGE.forEach(function (e) { if (e.kurs === kurs && (alle || (t && t.erfolge && t.erfolge[e.id]))) p += e.punkte; });
        return p;
    }
    function kursStand(t, kursId, katalog) {
        var r = { kern: 0, kernMax: 0, bonus: 0, bonusMax: 0, prozent: 0, durch: true, fertig: true, vollstaendig: true };
        KURSE[kursId].missionen.forEach(function (mid) {
            var kat = katalog[mid];
            if (!kat) { r.vollstaendig = false; r.durch = r.fertig = false; return; }
            var st = missionStand(t, kat);
            r.kern += st.kern; r.kernMax += st.kernMax; r.bonus += st.bonus; r.bonusMax += st.bonusMax;
            r.durch = r.durch && st.durch; r.fertig = r.fertig && st.fertig;
        });
        r.bonus += erfolgsPunkte(t, kursId);
        r.bonusMax += erfolgsPunkte(t, kursId, true);
        r.prozent = prozentAus(r.kern, r.kernMax, r.bonus, r.bonusMax);
        return r;
    }
    function makerDurch(t) {
        return ['tresor', 'show', 'linie'].filter(function (m) { return t && t.durch && t.durch[m]; }).length;
    }
    function makerFertig(t) {
        return ['tresor', 'show', 'linie'].filter(function (m) { return t && t.fertig && t.fertig[m]; }).length;
    }
    function missionFrei(t, m) {
        if (!t) return false;
        if (t.frei && t.frei[m.id]) return true;
        return m.voraus.every(function (v) {
            if (v === 'maker2') return makerDurch(t) >= 2;
            return !!(t.durch && t.durch[v]);
        });
    }
    function vorausText(m) {
        if (!m.voraus.length) return '';
        return m.voraus.map(function (v) {
            if (v === 'maker2') return 'zwei Maker-Projekten';
            var mm = mission(v); return mm ? mm.titel.split(':')[0] : v;
        }).join(', ');
    }
    // Speichert berechnete Zustände (durch/fertig/Prozent) im Team, damit Erfolge und Freischaltungen sie kennen
    function merkeStaende(katalog) {
        var t = aktivesTeam();
        if (!t || !gueltig(t)) return;
        var neu = { durch: {}, fertig: {}, prozent: {} };
        MISSIONEN.forEach(function (m) {
            if (!katalog[m.id]) return;
            var st = missionStand(t, katalog[m.id]);
            neu.durch[m.id] = st.durch; neu.fertig[m.id] = st.fertig;
        });
        Object.keys(KURSE).forEach(function (k) {
            var ks = kursStand(t, k, katalog);
            if (ks.vollstaendig) neu.prozent[k] = ks.prozent;
        });
        var aenderung = false;
        ['durch', 'fertig', 'prozent'].forEach(function (f) {
            Object.keys(neu[f]).forEach(function (k) { if ((t[f] || {})[k] !== neu[f][k]) aenderung = true; });
        });
        if (aenderung) aendere(function (tt) {
            ['durch', 'fertig', 'prozent'].forEach(function (f) { Object.keys(neu[f]).forEach(function (k) { tt[f][k] = neu[f][k]; }); });
        });
        pruefeErfolge();
    }
    function pruefeErfolge() {
        var t = aktivesTeam();
        if (!t || !gueltig(t)) return;
        var neue = ERFOLGE.filter(function (e) { return !(t.erfolge && t.erfolge[e.id]) && e.test(t); });
        if (!neue.length) return;
        aendere(function (tt) { neue.forEach(function (e) { tt.erfolge[e.id] = Date.now(); }); });
        neue.forEach(function (e, i) {
            setTimeout(function () {
                toast(e.icon, 'Erfolg: ' + e.name, e.text + (e.punkte ? ' · +' + e.punkte + ' Bonus' : ''), 'gold');
            }, 600 + i * 900);
        });
        if (typeof window.__rbNachErfolg === 'function') window.__rbNachErfolg();
    }

    // ===================================================================== 6 Rückmeldungen (Toast, Konfetti, Dialoge)
    function toast(icon, titel, text, art) {
        var box = $('.rb-toast-box');
        if (!box) { box = el('div', { class: 'rb-toast-box', 'aria-live': 'polite' }); document.body.appendChild(box); }
        var t = el('div', { class: 'rb-toast' + (art ? ' ' + art : '') },
            '<span class="t-icon">' + icon + '</span><div><strong>' + esc(titel) + '</strong><small>' + esc(text || '') + '</small></div>');
        box.appendChild(t);
        while (box.children.length > 3) box.firstChild.remove();
        setTimeout(function () { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 600); }, 5200);
    }
    function konfetti() {
        var farben = ['#facc15', '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ef4444'];
        for (var i = 0; i < 70; i++) {
            (function (i) {
                setTimeout(function () {
                    var k = el('div', { class: 'konfetti' });
                    k.style.left = (Math.random() * 100) + 'vw';
                    k.style.background = farben[i % farben.length];
                    document.body.appendChild(k);
                    var dauer = 1800 + Math.random() * 1400;
                    k.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 },
                        { transform: 'translateY(' + (window.innerHeight + 30) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: .8 }],
                        { duration: dauer, easing: 'cubic-bezier(.3,.6,.6,1)' });
                    setTimeout(function () { k.remove(); }, dauer);
                }, i * 18);
            })(i);
        }
    }
    function punkteFlug(ziel, text) {
        var r = ziel.getBoundingClientRect();
        var f = el('div', { class: 'punkte-flug', text: text });
        f.style.left = (r.left + r.width / 2 - 20) + 'px';
        f.style.top = (r.top + 4) + 'px';
        document.body.appendChild(f);
        setTimeout(function () { f.remove(); }, 1400);
    }
    function dialog(titel, html, knoepfe) {
        return new Promise(function (fertig) {
            var hg = el('div', { class: 'rb-dialog-hg' });
            var d = el('div', { class: 'rb-dialog', role: 'dialog', 'aria-modal': 'true' }, '<h3>' + titel + '</h3>' + html + '<div class="d-knoepfe"></div>');
            hg.appendChild(d); document.body.appendChild(hg);
            var leiste = d.querySelector('.d-knoepfe');
            (knoepfe || [{ text: 'OK', wert: true }]).forEach(function (k) {
                var b = el('button', { type: 'button', class: 'rb-knopf' + (k.leise ? ' leise' : '') + (k.klasse ? ' ' + k.klasse : ''), text: k.text });
                b.addEventListener('click', function () {
                    if (k.pruefe && !k.pruefe(d)) return;
                    var w = typeof k.wert === 'function' ? k.wert(d) : k.wert;
                    hg.remove(); fertig(w);
                });
                leiste.appendChild(b);
            });
            hg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hg.remove(); fertig(null); } });
            var f = d.querySelector('input, textarea, select') || leiste.lastChild;
            setTimeout(function () { f.focus(); }, 30);
        });
    }
    var PIN_SPERRE = 'edu-mrh-robotik-pinsperre';
    function pinAbfrage(titel, text) {
        return new Promise(function (fertig) {
            var bis = +(localStorage.getItem(PIN_SPERRE) || 0);
            if (bis > Date.now()) {
                dialog('🔒 Kurz gesperrt', '<p>Zu viele falsche Eingaben. Bitte in ' + Math.ceil((bis - Date.now()) / 1000) + ' Sekunden noch einmal.</p>');
                return fertig(false);
            }
            var hg = el('div', { class: 'rb-dialog-hg' });
            var d = el('div', { class: 'rb-dialog', role: 'dialog', 'aria-modal': 'true' },
                '<h3>🎓 ' + esc(titel || 'Lehrkraft-Bestätigung') + '</h3><p>' + (text || 'Die Lehrkraft gibt hier ihren PIN ein.') + '</p>' +
                '<input type="password" autocomplete="new-password" aria-label="PIN der Lehrkraft" placeholder="PIN">' +
                '<div class="d-fehler"></div><div class="d-knoepfe"></div>');
            hg.appendChild(d); document.body.appendChild(hg);
            var inp = d.querySelector('input'), fehler = d.querySelector('.d-fehler'), versuche = 0;
            var ab = el('button', { type: 'button', class: 'rb-knopf leise', text: 'Abbrechen' });
            var ok = el('button', { type: 'button', class: 'rb-knopf lehrkraft', text: 'Bestätigen' });
            d.querySelector('.d-knoepfe').append(ab, ok);
            function zu(w) { hg.remove(); fertig(w); }
            function check() {
                if (hash('pin|' + inp.value.trim()) === KONFIG.pinHash) return zu(true);
                versuche++;
                inp.value = '';
                fehler.textContent = 'Falscher PIN.';
                d.classList.remove('wackeln'); void d.offsetWidth; d.classList.add('wackeln');
                if (versuche >= 3) {
                    localStorage.setItem(PIN_SPERRE, String(Date.now() + 60000));
                    fehler.textContent = 'Zu viele Versuche – 1 Minute gesperrt.';
                    setTimeout(function () { zu(false); }, 1500);
                }
            }
            ab.addEventListener('click', function () { zu(false); });
            ok.addEventListener('click', check);
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); if (e.key === 'Escape') zu(false); });
            setTimeout(function () { inp.focus(); }, 30);
        });
    }

    // ===================================================================== 7 Akku-Anzeige
    function akkuHtml(prozent, gross) {
        var breite = Math.min(150, prozent) / 150 * 100;
        return '<div class="akku' + (gross ? ' gross' : '') + '"><div class="akku-wrap"><div class="akku-koerper">' +
            '<div class="akku-turbo-zone"></div><div class="akku-fuellung' + (prozent > 100 ? ' ueber' : '') + '" style="width:' + breite + '%"></div>' +
            '<div class="akku-hundert"></div></div></div><span class="akku-zahl' + (prozent > 100 ? ' ueber' : '') + '">' + prozent + ' %</span></div>';
    }
    function setzeAkku(box, prozent) {
        var f = box.querySelector('.akku-fuellung'), z = box.querySelector('.akku-zahl');
        if (!f) { box.innerHTML = akkuHtml(prozent); return; }
        f.style.width = (Math.min(150, prozent) / 150 * 100) + '%';
        f.classList.toggle('ueber', prozent > 100);
        z.textContent = prozent + ' %';
        z.classList.toggle('ueber', prozent > 100);
    }

    // ===================================================================== 8 Abzeichen (SVG)
    function abzeichenSvg(a, sterne, gesperrt) {
        var c1 = gesperrt ? '#cbd5e1' : a.farbe[0], c2 = gesperrt ? '#64748b' : a.farbe[1];
        var gid = 'g' + a.id + (gesperrt ? 'x' : '') + Math.floor(Math.random() * 1e6);
        var form;
        if (a.form === 'sechseck') form = '<polygon points="60,8 103,32 103,80 60,104 17,80 17,32" fill="url(#' + gid + ')" stroke="#fff" stroke-width="4"/>' +
            '<polygon points="60,20 92,38 92,74 60,92 28,74 28,38" fill="rgba(255,255,255,.22)"/>';
        else if (a.form === 'schild') form = '<path d="M60 6 L104 20 L100 66 Q94 92 60 108 Q26 92 20 66 L16 20 Z" fill="url(#' + gid + ')" stroke="#fff" stroke-width="4"/>' +
            '<path d="M60 18 L92 28 L89 64 Q84 84 60 96 Q36 84 31 64 L28 28 Z" fill="rgba(255,255,255,.22)"/>';
        else if (a.form === 'stern') form = '<polygon points="60,4 74,36 108,38 82,60 92,94 60,76 28,94 38,60 12,38 46,36" fill="url(#' + gid + ')" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' +
            '<circle cx="60" cy="56" r="24" fill="rgba(255,255,255,.25)"/>';
        else form = '<circle cx="60" cy="56" r="48" fill="url(#' + gid + ')" stroke="#fff" stroke-width="4"/><circle cx="60" cy="56" r="36" fill="rgba(255,255,255,.22)"/>';
        var sternSvg = '';
        for (var i = 0; i < 3; i++) {
            var x = 36 + i * 24, voll = i < sterne;
            sternSvg += '<polygon transform="translate(' + x + ',8)" points="0,-9 2.6,-2.8 9,-2.6 4,1.6 5.6,8 0,4.4 -5.6,8 -4,1.6 -9,-2.6 -2.6,-2.8" fill="' +
                (voll ? '#facc15' : 'rgba(255,255,255,.0)') + '" stroke="' + (voll ? '#a16207' : 'rgba(100,116,139,.35)') + '" stroke-width="1.2"/>';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 120 148" width="240" height="296" role="img" aria-label="Abzeichen ' + esc(a.name) + '">' +
            '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
            '<path d="M38 96 L28 136 L44 128 L52 140 L58 100 Z" fill="' + c2 + '" opacity=".9"/><path d="M82 96 L92 136 L76 128 L68 140 L62 100 Z" fill="' + c2 + '" opacity=".9"/>' +
            '<g transform="translate(0,6)">' + form + '</g>' +
            '<text x="60" y="' + (a.form === 'stern' ? 76 : 74) + '" text-anchor="middle" font-size="34" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">' + (gesperrt ? '❔' : a.symbol) + '</text>' +
            '<rect x="14" y="106" width="92" height="18" rx="9" fill="#fff" stroke="' + c2 + '" stroke-width="2"/>' +
            '<text x="60" y="119" text-anchor="middle" font-size="9.5" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="' + c2 + '">' + esc(a.name) + '</text>' +
            '<g transform="translate(0,-2)">' + sternSvg + '</g></svg>';
    }
    function sterneFuer(p) { return p >= 150 ? 3 : p >= 125 ? 2 : p >= 100 ? 1 : 0; }
    function abzeichenStatus(t, a, katalog) {
        if (!t) return { verdient: false, prozent: 0 };
        if (a.mission) {
            var st = missionStand(t, katalog[a.mission]);
            return { verdient: st.fertig, prozent: st.prozent };
        }
        if (a.kurs) {
            var ks = kursStand(t, a.kurs, katalog);
            return { verdient: ks.fertig, prozent: ks.prozent };
        }
        if (a.makerAnzahl) {
            var n = makerFertig(t);
            var p = 0;
            ['tresor', 'show', 'linie'].forEach(function (k) { if (t.fertig && t.fertig[k]) p = Math.max(p, (t.prozent || {})[k] || 0); });
            return { verdient: n >= a.makerAnzahl, prozent: n >= 3 ? 150 : n >= a.makerAnzahl ? Math.max(100, Math.min(p, 125)) : 0 };
        }
        return { verdient: false, prozent: 0 };
    }
    function svgAlsPng(svg, name) {
        var img = new Image();
        var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        img.onload = function () {
            var c = document.createElement('canvas'); c.width = 480; c.height = 592;
            var ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 480, 592);
            URL.revokeObjectURL(url);
            c.toBlob(function (b) { if (b) datei(name, b); else datei(name.replace(/png$/, 'svg'), svg, 'image/svg+xml'); });
        };
        img.onerror = function () { datei(name.replace(/png$/, 'svg'), svg, 'image/svg+xml'); };
        img.src = url;
    }

    // ===================================================================== 9 Missionsseite: Schritte
    var SEITE = { mission: null, katalog: null, etappen: [] };

    // Gespeicherter Wert für ein [data-wert]-Element: Text, null (keiner) oder false (Teil fehlt → ausblenden)
    function wertFuer(t, e) {
        var w = t && t.werte ? t.werte[e.getAttribute('data-wert')] : null;
        if (w == null || w === '') return null;
        if (e.hasAttribute('data-teil')) {
            w = String(w).split('+')[+e.getAttribute('data-teil')];
            if (w == null) return false;      // z. B. nur ein Motor: zweiten Anschluss ausblenden
        }
        return typeof w === 'number' ? String(w).replace('.', ',') : String(w);
    }
    function werteAnzeigen() {
        var t = aktivesTeam();
        $$('[data-wert]').forEach(function (e) {
            if (!e.hasAttribute('data-standard')) e.setAttribute('data-standard', e.textContent);
            var w = wertFuer(t, e);
            e.hidden = w === false;
            e.textContent = w ? w : e.getAttribute('data-standard');
            e.classList.toggle('eigener-wert', !!w);
        });
    }

    function schrittKopf(s) {
        var art = s.getAttribute('data-art') || 'check';
        var bonus = s.hasAttribute('data-bonus') || !!s.closest('.etappe.turbo');
        if (bonus) s.classList.add('bonus');
        var p = +s.getAttribute('data-punkte') || 0;
        var kopf = el('div', { class: 's-kopf schritt-kopf' },
            '<span class="s-icon">' + (s.getAttribute('data-icon') || ICONS[art] || '✔️') + '</span>' +
            '<span class="s-titel">' + (s.getAttribute('data-titel') || '') + '</span>' +
            '<span class="s-punkte" title="' + (bonus ? 'Extra-Punkte (über 100 %)' : 'Punkte') + '">' + (bonus ? '⚡ Bonus +' : '+') + p + '</span>');
        var text = el('div', { class: 's-text' });
        while (s.firstChild) text.appendChild(s.firstChild);
        s.appendChild(kopf); s.appendChild(text);
        var erkl = text.querySelector('.erklaerung');
        if (erkl) { erkl.hidden = true; erkl.classList.add('rueckmeldung', 'richtig'); s.appendChild(erkl); }
        var aktion = el('div', { class: 's-aktion' });
        var rueck = el('div', { class: 'rueckmeldung s-rueck', 'aria-live': 'polite' });
        s.appendChild(aktion); s.appendChild(rueck);
        return { art: art, text: text, aktion: aktion, rueck: rueck, erkl: erkl, bonus: bonus, punkte: p };
    }

    function rueckmeldung(s, art, html) {
        var r = s.querySelector(':scope > .s-rueck');
        r.className = 'rueckmeldung s-rueck ' + art;
        r.innerHTML = html;
    }
    function gesperrtBis(s) {
        var t = aktivesTeam();
        return t && t.sperre ? (t.sperre[s.getAttribute('data-id')] || 0) : 0;
    }
    var uhren = {};
    function sperreAnzeigen(s) {
        var id = s.getAttribute('data-id');
        clearInterval(uhren[id]);
        function tick() {
            var rest = Math.ceil((gesperrtBis(s) - Date.now()) / 1000);
            var aus = rest > 0;
            $$(':scope > .s-aktion button, :scope > .s-aktion input, .optionen button, select.luecke, .bug-programm', s).forEach(function (b) {
                if (b.classList.contains('bug-programm')) b.style.pointerEvents = aus ? 'none' : '';
                else if (!s.classList.contains('erledigt')) b.disabled = aus;
            });
            var w = s.querySelector('.s-warte');
            if (aus) {
                if (!w) { w = el('div', { class: 'rueckmeldung warte s-warte' }); s.appendChild(w); }
                w.innerHTML = '⏳ Kurz nachdenken: In <strong>' + rest + ' s</strong> könnt ihr es wieder versuchen. Lest die Frage nochmal – oder nutzt die Hilfe.';
            } else {
                if (w) w.remove();
                clearInterval(uhren[id]);
            }
        }
        tick();
        if (gesperrtBis(s) > Date.now()) uhren[id] = setInterval(tick, 500);
    }
    function fehlversuch(s, tipp) {
        var id = s.getAttribute('data-id');
        var t = aendere(function (tt) {
            tt.versuche[id] = (tt.versuche[id] || 0) + 1;
            tt.sperre[id] = Date.now() + KONFIG.sperreSek * 1000 * Math.min(4, tt.versuche[id]);
            tt.serie = 0;
        });
        if (!t) return;
        rueckmeldung(s, 'falsch', '❌ Noch nicht. ' + (tipp || s.getAttribute('data-tipp') || 'Überlegt nochmal gemeinsam – die Hilfe darunter kann euch weiterbringen.'));
        sperreAnzeigen(s);
    }

    // Vergibt Punkte für einen Schritt (einmalig) und aktualisiert alles
    function vergebe(s, wert, ohneVolltreffer) {
        var id = s.getAttribute('data-id');
        var art = s.getAttribute('data-art') || 'check';
        var p = +s.getAttribute('data-punkte') || 0;
        var mid = SEITE.mission;
        var vorher = aktivesTeam();
        if (!vorher || erl(vorher, id)) return;
        var auto = VOLLTREFFER_ARTEN.indexOf(art) >= 0 || (art === 'zahl' && s.hasAttribute('data-loesung'));
        var b = 0;
        var t = aendere(function (tt) {
            var erster = !tt.versuche[id] && !tt.gespickt[id];
            if (auto && erster && !ohneVolltreffer) b = 1;
            tt.s[id] = { p: p, b: b, a: art, m: mid, t: Date.now() };
            if (wert != null) { tt.s[id].w = wert; tt.werte[id] = wert; }
            delete tt.sperre[id]; delete tt.liste[id];
            if (auto) {
                if (erster) { tt.serie = (tt.serie || 0) + 1; tt.serieMax = Math.max(tt.serieMax || 0, tt.serie); }
                else tt.serie = 0;
            }
            var m = mission(mid);
            if (m && m.kurs !== 'starter' && m.kurs !== 'innovator' && !(tt.durch && tt.durch.w3)) tt.ueberflieger = true;
        });
        if (!t) return;
        punkteFlug(s.querySelector('.s-punkte'), '+' + (p + b) + (b ? ' 🎯' : ''));
        schrittZustand(s);
        nachAenderung(true);
    }

    function schrittZustand(s) {
        var t = aktivesTeam();
        var id = s.getAttribute('data-id');
        var e = t && t.s ? t.s[id] : null;
        var art = s.getAttribute('data-art') || 'check';
        s.classList.toggle('erledigt', !!e);
        s.classList.toggle('wartet', !e && !!(t && t.liste && t.liste[id]));
        var status = s.querySelector('.s-status');
        if (!status) { status = el('span', { class: 's-status' }); s.querySelector(':scope > .s-aktion').appendChild(status); }
        status.textContent = '';
        if (e) {
            status.textContent = '✔ Geschafft! +' + e.p + (e.b ? ' (+' + e.b + ' Volltreffer)' : '');
            $$(':scope > .s-aktion button, :scope > .s-aktion input, :scope > .s-aktion select, :scope > .s-aktion textarea, .optionen button, select.luecke, .s-text input, .s-text textarea, .s-text select, .eingabe-feld textarea, .eingabe-feld input, .plan-neu button, .plan-neu select, .plan-neu input', s).forEach(function (b) {
                if (!b.classList.contains('immer')) b.disabled = true;
            });
            var erkl = s.querySelector(':scope > .erklaerung');
            if (erkl) erkl.hidden = false;
            var rueck = s.querySelector(':scope > .s-rueck');
            if (rueck && (rueck.classList.contains('falsch') || rueck.classList.contains('info'))) { rueck.className = 'rueckmeldung s-rueck'; rueck.innerHTML = ''; }
            if (typeof s.__wiederherstellen === 'function') s.__wiederherstellen(e);
        } else if (art === 'abnahme' && t && t.liste && t.liste[id]) {
            status.textContent = '📋 Steht auf der Abnahme-Liste';
        }
    }

    // ---------- Schritt-Typen
    var TYPEN = {};

    TYPEN.check = function (s, k) {
        var b = el('button', { type: 'button', class: 'rb-knopf', text: s.getAttribute('data-knopf') || '✔ Erledigt' });
        b.addEventListener('click', function () {
            var frage = s.getAttribute('data-frage');
            if (!frage) return vergebe(s);
            dialog('Ehrlich?', '<p>' + frage + '</p>', [{ text: 'Noch nicht', wert: false, leise: true }, { text: 'Ja, wirklich!', wert: true }])
                .then(function (ok) { if (ok) vergebe(s); });
        });
        k.aktion.appendChild(b);
    };

    TYPEN.quiz = function (s, k) {
        var quelle = k.text.querySelector('.optionen-quelle');
        if (!quelle) return;
        var box = el('div', { class: 'optionen' });
        var lis = $$(':scope > li', quelle);
        lis.forEach(function (li, i) { if (!li.getAttribute('data-o')) li.setAttribute('data-o', String.fromCharCode(97 + i)); });
        if (!s.hasAttribute('data-fest')) mischen(lis);      // Reihenfolge mischen: keine „immer b“-Muster
        lis.forEach(function (li, i) {
            var o = li.getAttribute('data-o');
            var b = el('button', { type: 'button', 'data-o': o }, '<span class="o-buchst">' + String.fromCharCode(65 + i) + '</span><span>' + li.innerHTML + '</span>');
            b.addEventListener('click', function () {
                if (gesperrtBis(s) > Date.now() || s.classList.contains('erledigt')) return;
                if (pruefe(s.getAttribute('data-id'), s.getAttribute('data-loesung'), o)) {
                    b.classList.add('richtig');
                    vergebe(s, o);
                    rueckmeldung(s, '', '');
                } else {
                    b.classList.add('falsch');
                    fehlversuch(s, li.getAttribute('data-tipp'));
                }
            });
            box.appendChild(b);
        });
        quelle.replaceWith(box);
        s.__wiederherstellen = function (e) {
            $$('button', box).forEach(function (b) { b.disabled = true; if (b.getAttribute('data-o') === e.w) b.classList.add('richtig'); });
        };
    };

    TYPEN.zahl = function (s, k) {
        var inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Antwort' });
        var b = el('button', { type: 'button', class: 'rb-knopf', text: 'Prüfen' });
        var wrap = el('div', { class: 'zahl-eingabe' });
        wrap.appendChild(inp);
        if (s.getAttribute('data-einheit')) wrap.appendChild(el('span', { text: s.getAttribute('data-einheit') }));
        wrap.appendChild(b);
        k.aktion.appendChild(wrap);
        function los() {
            if (gesperrtBis(s) > Date.now()) return;
            var roh = inp.value, z = zahlAus(roh), id = s.getAttribute('data-id');
            if (isNaN(z)) { rueckmeldung(s, 'info', 'Bitte eine Zahl eingeben (z. B. 12 oder 0,5).'); return; }
            if (s.hasAttribute('data-loesung')) {
                if (pruefe(id, s.getAttribute('data-loesung'), roh)) vergebe(s, z);
                else fehlversuch(s);
                return;
            }
            if (s.hasAttribute('data-formel')) {
                var t = aktivesTeam(), formel = s.getAttribute('data-formel'), fehlt = null;
                var ausdruck = formel.replace(/[a-z][a-z0-9-]*[a-z0-9]/gi, function (name) {
                    var w = t && t.werte ? t.werte[name] : null;
                    if (w == null || isNaN(+w)) fehlt = name;
                    return '(' + (+w) + ')';
                });
                if (fehlt) { rueckmeldung(s, 'info', 'Dafür braucht ihr zuerst eure Messwerte von weiter oben.'); return; }
                if (!/^[\d\s.+\-*/()]+$/.test(ausdruck)) return;
                var soll = Function('"use strict";return (' + ausdruck + ')')();
                var tol = +(s.getAttribute('data-toleranz') || 0.5);
                if (Math.abs(z - soll) <= tol) vergebe(s, z);
                else fehlversuch(s, s.getAttribute('data-daneben'));
                return;
            }
            var bereiche = [];
            try { bereiche = JSON.parse(s.getAttribute('data-bereiche') || '[]'); } catch (e) { bereiche = []; }
            if (!bereiche.length && s.hasAttribute('data-min')) bereiche = [[+s.getAttribute('data-min'), +s.getAttribute('data-max'), '']];
            var treffer = bereiche.filter(function (r) { return z >= r[0] && z <= r[1]; })[0];
            if (treffer) {
                vergebe(s, z);
                if (treffer[2]) rueckmeldung(s, 'richtig', '✅ ' + treffer[2]);
            } else {
                var id2 = s.getAttribute('data-id');
                aendere(function (tt) { tt.sperre[id2] = Date.now() + 5000; });
                rueckmeldung(s, 'falsch', '🤔 ' + (s.getAttribute('data-daneben') || 'Das kann nicht ganz stimmen. Messt bzw. rechnet nochmal nach.'));
                sperreAnzeigen(s);
            }
        }
        b.addEventListener('click', los);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') los(); });
        s.__wiederherstellen = function (e) { inp.value = e.w != null ? String(e.w).replace('.', ',') : ''; };
    };

    TYPEN.luecken = function (s, k) {
        var luecken = $$('select.luecke', s);
        luecken.forEach(function (sel) {
            var leer = el('option', { value: '' }, '?');
            sel.insertBefore(leer, sel.firstChild);
            sel.value = '';
        });
        var b = el('button', { type: 'button', class: 'rb-knopf', text: 'Prüfen' });
        k.aktion.appendChild(b);
        b.addEventListener('click', function () {
            if (gesperrtBis(s) > Date.now()) return;
            var werte = luecken.map(function (x) { return x.value; });
            if (werte.some(function (w) { return !w; })) { rueckmeldung(s, 'info', 'Füllt zuerst alle Lücken (?) aus.'); return; }
            var antwort = werte.join(',');
            if (pruefe(s.getAttribute('data-id'), s.getAttribute('data-loesung'), antwort)) vergebe(s, antwort);
            else fehlversuch(s);
        });
        s.__wiederherstellen = function (e) {
            if (!e.w) return;
            String(e.w).split(',').forEach(function (w, i) { if (luecken[i]) luecken[i].value = w; });
        };
    };

    TYPEN.reihenfolge = function (s, k) {
        var quelle = k.text.querySelector('.teile');
        if (!quelle) return;
        var teile = $$(':scope > [data-k]', quelle);
        var puzzle = el('div', { class: 'puzzle' },
            '<div class="puzzle-feld vorrat"><h5>Bausteine – anklicken</h5></div><div class="puzzle-feld ziel"><h5>Euer Programm</h5></div>');
        var vorrat = puzzle.querySelector('.vorrat'), ziel = puzzle.querySelector('.ziel');
        if (s.getAttribute('data-start')) ziel.appendChild(el('div', { class: 'p-start' }, s.getAttribute('data-start')));
        function wrap(t) {
            var w = el('div', { class: 'p-teil', 'data-k': t.getAttribute('data-k') });
            w.appendChild(el('span', { class: 'p-nr' }));
            t.removeAttribute('data-k');
            w.appendChild(t);
            w.addEventListener('click', function () {
                if (s.classList.contains('erledigt') || gesperrtBis(s) > Date.now()) return;
                (w.parentNode === vorrat ? ziel : vorrat).appendChild(w);
                nummern();
            });
            return w;
        }
        var verpackt = teile.map(wrap);
        mischen(verpackt.slice()).forEach(function (w) { vorrat.appendChild(w); });
        function nummern() {
            $$('.p-teil', ziel).forEach(function (w, i) { w.querySelector('.p-nr').textContent = (i + 1) + '.'; });
            $$('.p-teil', vorrat).forEach(function (w) { w.querySelector('.p-nr').textContent = ''; });
        }
        quelle.replaceWith(puzzle);
        var b = el('button', { type: 'button', class: 'rb-knopf', text: 'Prüfen' });
        var neu = el('button', { type: 'button', class: 'rb-knopf leise', text: '↺ Alles zurück' });
        k.aktion.append(b, neu);
        neu.addEventListener('click', function () { if (s.classList.contains('erledigt')) return; mischen($$('.p-teil', puzzle)).forEach(function (w) { vorrat.appendChild(w); }); nummern(); });
        b.addEventListener('click', function () {
            if (gesperrtBis(s) > Date.now()) return;
            var antwort = $$('.p-teil', ziel).map(function (w) { return w.getAttribute('data-k'); }).join(',');
            if (!antwort) { rueckmeldung(s, 'info', 'Klickt die Bausteine in der richtigen Reihenfolge an.'); return; }
            if (pruefe(s.getAttribute('data-id'), s.getAttribute('data-loesung'), antwort)) vergebe(s, antwort);
            else fehlversuch(s);
        });
        s.__wiederherstellen = function (e) {
            if (!e.w) return;
            String(e.w).split(',').forEach(function (key) {
                var w = verpackt.filter(function (x) { return x.getAttribute('data-k') === key; })[0];
                if (w) ziel.appendChild(w);
            });
            nummern();
        };
    };

    TYPEN.bug = function (s) {
        var prog = s.querySelector('.bug-programm');
        if (!prog) return;
        $$('[data-k]', prog).forEach(function (blk) {
            blk.setAttribute('title', 'Ist das der Fehler? Anklicken!');
            blk.addEventListener('click', function (ev) {
                ev.stopPropagation();
                if (s.classList.contains('erledigt') || gesperrtBis(s) > Date.now()) return;
                $$('.gewaehlt', prog).forEach(function (x) { x.classList.remove('gewaehlt'); });
                blk.classList.add('gewaehlt');
                if (pruefe(s.getAttribute('data-id'), s.getAttribute('data-loesung'), blk.getAttribute('data-k'))) vergebe(s, blk.getAttribute('data-k'));
                else fehlversuch(s, 'Dieser Block macht genau, was er soll. Spielt das Programm Block für Block im Kopf durch.');
            });
        });
        s.__wiederherstellen = function (e) {
            $$('.gewaehlt', prog).forEach(function (x) { x.classList.remove('gewaehlt'); });
            var blk = prog.querySelector('[data-k="' + e.w + '"]');
            if (blk) blk.classList.add('ist-bug');
        };
    };

    TYPEN.eingabe = function (s, k) {
        var min = +(s.getAttribute('data-min') || 10);
        var mehrzeilig = !s.hasAttribute('data-einzeilig');
        var feld = mehrzeilig ? el('textarea', { placeholder: s.getAttribute('data-platzhalter') || '' })
                              : el('input', { type: 'text', placeholder: s.getAttribute('data-platzhalter') || '' });
        feld.style.width = mehrzeilig ? '' : 'min(100%, 28rem)';
        var zeichen = el('span', { class: 'zeichen' });
        var box = el('div', { class: 'eingabe-feld' });
        box.append(feld, zeichen);
        k.aktion.parentNode.insertBefore(box, k.aktion);
        var b = el('button', { type: 'button', class: 'rb-knopf', text: s.getAttribute('data-knopf') || 'Speichern' });
        k.aktion.appendChild(b);
        function zaehle() { zeichen.textContent = feld.value.trim().length + ' / mind. ' + min + ' Zeichen'; }
        feld.addEventListener('input', zaehle); zaehle();
        b.addEventListener('click', function () {
            var txt = feld.value.trim();
            if (txt.length < min) { rueckmeldung(s, 'info', 'Etwas ausführlicher bitte (mindestens ' + min + ' Zeichen).'); return; }
            var woerter = (s.getAttribute('data-woerter') || '').split(',').filter(Boolean);
            var fehlt = woerter.filter(function (w) { return txt.toLowerCase().indexOf(w.toLowerCase()) < 0; });
            if (fehlt.length) { rueckmeldung(s, 'info', 'Benutzt in eurem Text diese Wörter: ' + fehlt.map(function (w) { return '<strong>' + esc(w) + '</strong>'; }).join(', ')); return; }
            vergebe(s, txt);
        });
        s.__wiederherstellen = function (e) { feld.value = e.w || ''; zaehle(); };
    };

    TYPEN.ports = function (s, k) {
        var felder = (s.getAttribute('data-felder') || 'Anschluss').split('|');
        var box = el('div', { class: 'ports-wahl' });
        var sels = felder.map(function (f, i) {
            var l = el('label', null, esc(f) + ' ');
            var sel = el('select', { 'aria-label': f });
            var opts = '<option value="">?</option>' + 'ABCDEF'.split('').map(function (b) { return '<option>' + b + '</option>'; }).join('');
            if (i > 0 && s.hasAttribute('data-leer')) opts += '<option value="-">– (keiner)</option>';
            sel.innerHTML = opts;
            l.appendChild(sel); box.appendChild(l);
            return sel;
        });
        k.aktion.appendChild(box);
        var b = el('button', { type: 'button', class: 'rb-knopf', text: 'Merken' });
        k.aktion.appendChild(b);
        b.addEventListener('click', function () {
            var w = sels.map(function (x) { return x.value; });
            if (w.some(function (x) { return !x; })) { rueckmeldung(s, 'info', 'Wählt für jedes Feld einen Buchstaben – schaut am Hub nach.'); return; }
            var echt = w.filter(function (x) { return x !== '-'; });
            if (echt.length !== new Set(echt).size) { rueckmeldung(s, 'falsch', 'Zwei Geräte können nicht im selben Anschluss stecken. Schaut nochmal genau hin.'); return; }
            vergebe(s, echt.join('+'));
        });
        s.__wiederherstellen = function (e) {
            String(e.w || '').split('+').forEach(function (x, i) { if (sels[i]) sels[i].value = x; });
        };
    };

    TYPEN.abnahme = function (s, k) {
        var b = el('button', { type: 'button', class: 'rb-knopf lehrkraft', text: '🎓 Lehrkraft bestätigt' });
        var l = el('button', { type: 'button', class: 'rb-knopf leise', text: '📋 Auf die Abnahme-Liste' });
        k.aktion.append(b, l);
        b.addEventListener('click', function () {
            pinAbfrage('Abnahme: ' + (s.getAttribute('data-titel') || ''), 'Hat das Team die Aufgabe vorgeführt? Dann PIN eingeben.')
                .then(function (ok) { if (ok) vergebe(s); });
        });
        l.addEventListener('click', function () {
            var id = s.getAttribute('data-id');
            aendere(function (tt) { tt.liste[id] = { m: SEITE.mission, t: Date.now() }; });
            rueckmeldung(s, 'info', '📋 Steht auf eurer Abnahme-Liste (Übersicht). Arbeitet weiter – die Lehrkraft bestätigt später.');
            schrittZustand(s);
        });
    };

    TYPEN.plan = function (s, k) { planTafel(s, k); };

    // ---------- Planungstafel: Weg in der Draufsicht planen und automatisch testen
    function planTafel(s, k) {
        var P;
        try { P = JSON.parse(s.getAttribute('data-parcours')); } catch (e) { return; }
        var befehle = [];
        var box = el('div', { class: 'plantafel' },
            '<canvas width="680" height="680" aria-label="Draufsicht auf den Parcours"></canvas>' +
            '<div class="plan-befehle"><div class="plan-neu">' +
            '<select aria-label="Befehl"><option value="vor">⬆ vorwärts</option><option value="zurueck">⬇ rückwärts</option><option value="rechts">↻ rechts drehen</option><option value="links">↺ links drehen</option></select>' +
            '<input type="number" min="1" max="200" value="20" aria-label="Wert"><span class="p-einheit">cm</span>' +
            '<button type="button" class="rb-knopf leise">+ Hinzufügen</button></div>' +
            '<ol class="plan-liste"></ol><div class="plan-knoepfe" style="display:flex;gap:.4rem;flex-wrap:wrap"></div></div>');
        k.aktion.parentNode.insertBefore(box, k.aktion);
        var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
        var art = box.querySelector('select'), wert = box.querySelector('input'), einheit = box.querySelector('.p-einheit');
        var liste = box.querySelector('.plan-liste');
        art.addEventListener('change', function () {
            var dreh = art.value === 'rechts' || art.value === 'links';
            einheit.textContent = dreh ? 'Grad (am Roboter)' : 'cm';
            wert.value = dreh ? 90 : 20;
        });
        box.querySelector('.plan-neu button').addEventListener('click', function () {
            if (s.classList.contains('erledigt')) return;
            var w = Math.round(+wert.value);
            if (!w || w < 1 || w > 360) return;
            if (befehle.length >= 14) { rueckmeldung(s, 'info', 'Höchstens 14 Befehle – geht es auch kürzer?'); return; }
            befehle.push([art.value, w]); zeichne();
        });
        var testen = el('button', { type: 'button', class: 'rb-knopf', text: '▶ Plan testen' });
        var leeren = el('button', { type: 'button', class: 'rb-knopf leise', text: 'Neu anfangen' });
        k.aktion.append(testen, leeren);
        leeren.addEventListener('click', function () { if (!s.classList.contains('erledigt')) { befehle = []; zeichne(); rueckmeldung(s, '', ''); } });
        var M = 680 / Math.max(P.breite, P.hoehe);
        function px(x, y) { return [x * M, (P.hoehe - y) * M]; }
        function weg() {
            var x = P.start[0], y = P.start[1], r = (P.start[2] || 0) * Math.PI / 180, pkt = [[x, y]];
            befehle.forEach(function (b) {
                if (b[0] === 'rechts') r += b[1] * Math.PI / 180;
                else if (b[0] === 'links') r -= b[1] * Math.PI / 180;
                else { var d = b[0] === 'vor' ? b[1] : -b[1]; x += Math.sin(r) * d; y += Math.cos(r) * d; pkt.push([x, y]); }
            });
            return { pkt: pkt, x: x, y: y, r: r };
        }
        function zeichne(fehlerPkt) {
            ctx.clearRect(0, 0, 680, 680);
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
            for (var g = 0; g <= Math.max(P.breite, P.hoehe); g += 10) {
                ctx.beginPath(); ctx.moveTo(g * M, 0); ctx.lineTo(g * M, 680); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, g * M); ctx.lineTo(680, g * M); ctx.stroke();
            }
            var z = P.ziel, a = px(z[0], z[1] + z[3]);
            ctx.fillStyle = 'rgba(34,197,94,.18)'; ctx.fillRect(a[0], a[1], z[2] * M, z[3] * M);
            ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.strokeRect(a[0], a[1], z[2] * M, z[3] * M); ctx.setLineDash([]);
            ctx.fillStyle = '#166534'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('🏁 ' + (P.ziellabel || 'Ziel'), a[0] + 8, a[1] + 32);
            (P.hindernisse || []).forEach(function (h) {
                var q = px(h[0], h[1] + h[3]);
                ctx.fillStyle = '#b45309'; ctx.fillRect(q[0], q[1], h[2] * M, h[3] * M);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(h[4] || 'Kiste', q[0] + 8, q[1] + 30);
            });
            var w = weg();
            ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
            ctx.beginPath();
            w.pkt.forEach(function (p, i) { var q = px(p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
            ctx.stroke();
            var st = px(P.start[0], P.start[1]);
            ctx.fillStyle = '#0f172a'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('Start', st[0] - 26, st[1] + 36);
            // Roboter als Pfeil
            var e = px(w.x, w.y);
            ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(w.r);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(18, 16); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
            if (fehlerPkt) { var f = px(fehlerPkt[0], fehlerPkt[1]); ctx.fillStyle = '#dc2626'; ctx.font = 'bold 40px sans-serif'; ctx.fillText('💥', f[0] - 20, f[1] + 14); }
            liste.innerHTML = '';
            befehle.forEach(function (b, i) {
                var txt = { vor: '⬆ vorwärts ' + b[1] + ' cm', zurueck: '⬇ rückwärts ' + b[1] + ' cm', rechts: '↻ rechts ' + b[1] + '°', links: '↺ links ' + b[1] + '°' }[b[0]];
                var li = el('li', null, '<span class="p-karte">' + txt + '</span>');
                var x = el('button', { type: 'button', title: 'Befehl löschen', text: '✖' });
                x.addEventListener('click', function () { if (!s.classList.contains('erledigt')) { befehle.splice(i, 1); zeichne(); } });
                li.appendChild(x); liste.appendChild(li);
            });
        }
        function schneidet(p, q, h) {   // Strecke p–q trifft Rechteck h (mit Rand für die Robotergröße)
            var rand = P.rand || 4, x1 = h[0] - rand, y1 = h[1] - rand, x2 = h[0] + h[2] + rand, y2 = h[1] + h[3] + rand;
            for (var i = 0; i <= 60; i++) {
                var x = p[0] + (q[0] - p[0]) * i / 60, y = p[1] + (q[1] - p[1]) * i / 60;
                if (x > x1 && x < x2 && y > y1 && y < y2) return [x, y];
            }
            return null;
        }
        testen.addEventListener('click', function () {
            if (s.classList.contains('erledigt')) return;
            if (!befehle.length) { rueckmeldung(s, 'info', 'Fügt zuerst Befehle hinzu.'); return; }
            var w = weg(), i, j;
            for (i = 1; i < w.pkt.length; i++) {
                var p = w.pkt[i];
                if (p[0] < 0 || p[1] < 0 || p[0] > P.breite || p[1] > P.hoehe) { zeichne(p); rueckmeldung(s, 'falsch', '💥 Der Roboter fährt aus dem Spielfeld (Befehl ' + i + '). Ändert die Strecke.'); return; }
                for (j = 0; j < (P.hindernisse || []).length; j++) {
                    var hit = schneidet(w.pkt[i - 1], p, P.hindernisse[j]);
                    if (hit) { zeichne(hit); rueckmeldung(s, 'falsch', '💥 Zusammenstoß mit der Kiste! Plant einen Umweg.'); return; }
                }
            }
            var z = P.ziel;
            if (w.x >= z[0] && w.x <= z[0] + z[2] && w.y >= z[1] && w.y <= z[1] + z[3]) {
                zeichne();
                vergebe(s, JSON.stringify(befehle));
                rueckmeldung(s, 'richtig', '✅ Plan geht auf! Jetzt programmiert genau diese Befehle in der SPIKE-App. Für jede Drehung nehmt euren Vierteldrehungs-Wert.');
            } else { zeichne(); rueckmeldung(s, 'falsch', 'Der Roboter kommt nicht in der ' + (P.ziellabel || 'Ziel') + ' an. Schaut auf das Bild: Wo endet der Pfeil?'); }
        });
        s.__wiederherstellen = function (e) {
            try { befehle = JSON.parse(e.w) || []; } catch (x) { befehle = []; }
            zeichne();
        };
        zeichne();
    }

    // ---------- Hilfen (gestuft, Lösung erst nach Gedrückthalten)
    function hilfe(box) {
        var stufen = $$(':scope > template[data-stufe]', box);
        if (!stufen.length) return;
        var knoepfe = el('div', { class: 'hilfe-knoepfe' }), inhalt = el('div', { class: 'hilfe-inhalt' });
        box.append(inhalt, knoepfe);
        var n = 0;
        function zeige(i) {
            var t = stufen[i], halten = t.hasAttribute('data-halten');
            var teil = el('div', { class: 'hilfe-stufe' + (halten ? ' loesung' : '') });
            teil.appendChild(el('span', { class: 'h-marke', text: t.getAttribute('data-stufe') }));
            teil.appendChild(t.content.cloneNode(true));
            inhalt.appendChild(teil);
            if (halten) {
                var fuer = box.getAttribute('data-fuer');
                aendere(function (tt) {
                    tt.spick[SEITE.mission || 'x'] = true;
                    if (fuer) tt.gespickt[fuer] = true;
                });
            }
        }
        function knopf() {
            knoepfe.innerHTML = '';
            if (n >= stufen.length) return;
            var t = stufen[n], halten = t.hasAttribute('data-halten');
            var b = el('button', { type: 'button', class: 'hilfe-knopf' + (halten ? ' halten' : '') });
            if (!halten) {
                b.innerHTML = '<span>💡 ' + esc(t.getAttribute('data-stufe')) + ' zeigen</span>';
                b.addEventListener('click', function () { zeige(n); n++; knopf(); });
            } else {
                b.innerHTML = '<span class="h-balken"></span><span>🔓 ' + esc(t.getAttribute('data-stufe')) + ': 1,5 s gedrückt halten</span>';
                var timer = null, start = 0, balken = b.querySelector('.h-balken');
                var los = function (e) { e.preventDefault(); start = Date.now(); timer = setInterval(function () {
                    var anteil = Math.min(1, (Date.now() - start) / 1500); balken.style.width = (anteil * 100) + '%';
                    if (anteil >= 1) { clearInterval(timer); zeige(n); n++; knopf(); }
                }, 40); };
                var stopp = function () { clearInterval(timer); balken.style.width = '0'; };
                b.addEventListener('pointerdown', los);
                ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stopp); });
                b.title = 'Erst selbst probieren! Wer die Lösung aufdeckt, verliert den Volltreffer-Bonus dieser Aufgabe.';
            }
            knoepfe.appendChild(b);
        }
        knopf();
    }

    function konzeptKarte(k) {
        var inhalt = el('div', { class: 'k-inhalt' });
        while (k.firstChild) inhalt.appendChild(k.firstChild);
        var kopf = el('div', { class: 'k-kopf' }, '<span class="k-icon">' + (k.getAttribute('data-icon') || '💡') + '</span><div><span class="k-label">' +
            (k.classList.contains('maker') ? 'Maker-Werkzeug' : 'Neues Werkzeug für euren Kopf') + ' · kommt auf den Spickzettel</span><h3>' + esc(k.getAttribute('data-titel')) + '</h3></div>');
        k.append(kopf, inhalt);
    }

    // ---------- Etappen sperren/öffnen, Fahrplan, Akku
    function etappenAktualisieren() {
        var t = aktivesTeam(), m = mission(SEITE.mission);
        var frei = !!t && missionFrei(t, m);
        var vorherDurch = true, durchListe = {};
        SEITE.etappen.forEach(function (et) {
            var kern = $$('.schritt[data-id]', et).filter(function (s) { return !s.classList.contains('bonus'); });
            var durch = kern.filter(function (s) { return s.getAttribute('data-art') !== 'abnahme'; }).every(function (s) { return erl(t, s.getAttribute('data-id')); });
            var fertig = kern.every(function (s) { return erl(t, s.getAttribute('data-id')); }) && (kern.length > 0 || $$('.schritt[data-id]', et).every(function (s) { return erl(t, s.getAttribute('data-id')); }));
            durchListe[et.getAttribute('data-etappe')] = durch;
            var turbo = et.classList.contains('turbo');
            var gesperrt = !frei || (turbo ? (et.getAttribute('data-ab') ? !durchListe[et.getAttribute('data-ab')] : false) : !vorherDurch);
            et.classList.toggle('gesperrt', gesperrt);
            et.classList.toggle('fertig', fertig && !gesperrt);
            var stat = et.querySelector('.e-status');
            if (stat) stat.textContent = gesperrt ? '🔒' : fertig ? '✅' : '';
            var hinweis = et.querySelector('.sperr-hinweis');
            if (hinweis) hinweis.textContent = !t ? '👆 Legt oben zuerst euer Team an.' : !frei ? '🔒 Diese Mission ist noch gesperrt (erst nach ' + vorausText(m) + ').' :
                turbo ? '🔒 Turbo-Aufgaben öffnen sich nach Etappe ' + (et.getAttribute('data-ab-nr') || '') + '.' : '🔒 Schafft zuerst die Etappe davor.';
            var chip = $('.fahrplan a[href="#' + et.id + '"]');
            if (chip) {
                var li = chip.parentNode;
                li.classList.toggle('fertig', fertig && !gesperrt);
                li.classList.toggle('gesperrt', gesperrt);
                li.classList.remove('aktuell');
            }
            if (!turbo) vorherDurch = vorherDurch && durch;
        });
        var erstesOffen = SEITE.etappen.filter(function (et) { return !et.classList.contains('turbo') && !et.classList.contains('gesperrt') && !et.classList.contains('fertig'); })[0];
        if (erstesOffen) { var c = $('.fahrplan a[href="#' + erstesOffen.id + '"]'); if (c) c.parentNode.classList.add('aktuell'); }
    }

    function nachAenderung(animiert) {
        werteAnzeigen();
        etappenAktualisieren();
        var t = aktivesTeam();
        var st = missionStand(t, SEITE.katalog);
        var akku = $('.teamleiste .tl-akku');
        if (akku) {
            setzeAkku(akku, st.prozent);
            if (animiert) { var a = akku.querySelector('.akku'); a.classList.remove('puls'); void a.offsetWidth; a.classList.add('puls'); }
        }
        // Zustände für die Übersicht merken; Gesamtkatalog im Hintergrund für Kurs-Prozente
        ladeKatalog().then(function (kat) {
            kat[SEITE.mission] = SEITE.katalog;
            var vorher = aktivesTeam(), warDurch = vorher && vorher.durch && vorher.durch[SEITE.mission], warFertig = vorher && vorher.fertig && vorher.fertig[SEITE.mission];
            merkeStaende(kat);
            var nachher = aktivesTeam();
            if (nachher && nachher.fertig && nachher.fertig[SEITE.mission] && !warFertig && animiert) { konfetti(); toast('🏅', 'Mission komplett!', 'Euer Abzeichen wartet in der Übersicht.', 'gold'); }
            else if (nachher && nachher.durch && nachher.durch[SEITE.mission] && !warDurch && animiert) { konfetti(); toast('🎉', 'Alle Aufgaben geschafft!', 'Fehlt nur noch die Abnahme durch die Lehrkraft.', 'gold'); }
            etappenAktualisieren();
            sperrBanner();
            geschafftBox();
            teamleisteRest();
        });
    }

    function sperrBanner() {
        var t = aktivesTeam(), m = mission(SEITE.mission), alt = $('.rb-warnung.sperre');
        var gesperrt = t && !missionFrei(t, m);
        if (!gesperrt) { if (alt) alt.remove(); return; }
        if (alt) return;
        var w = el('div', { class: 'rb-warnung sperre' }, '<strong>🔒 Noch gesperrt:</strong> Diese Mission öffnet sich nach ' + esc(vorausText(m)) +
            '. Ihr könnt euch schon umsehen. (Eure Lehrkraft kann sie früher freischalten.)');
        $('#teamleiste').after(w);
    }

    function geschafftBox() {
        var box = $('#geschafft');
        if (!box) return;
        var t = aktivesTeam(), m = mission(SEITE.mission), st = missionStand(t, SEITE.katalog);
        var a = ABZEICHEN.filter(function (x) { return x.mission === SEITE.mission; })[0];
        if (!t || !st.durch) {
            box.className = 'rb-panel';
            box.innerHTML = '<h2>🏁 Ziel der Mission</h2><p>Wenn alle Pflicht-Aufgaben erledigt sind (und die Lehrkraft eure Vorführung bestätigt hat), bekommt ihr das Abzeichen <strong>' +
                esc(a ? a.name : m.kurz) + '</strong> und neue Karten für euren Spickzettel. Euer Akku: <strong>' + st.prozent + ' %</strong>.</p>' +
                '<div class="abzeichen gesperrt" style="max-width:170px">' + (a ? abzeichenSvg(a, 0, true) : '') + '</div>';
            return;
        }
        var naechste = MISSIONEN.filter(function (x) { return x.id !== SEITE.mission && missionFrei(t, x) && !(t.durch && t.durch[x.id]); });
        box.className = 'rb-geschafft';
        box.innerHTML = (a ? abzeichenSvg(a, st.fertig ? sterneFuer(st.prozent) : 0, !st.fertig) : '') +
            '<h2>' + (st.fertig ? '🏅 Mission komplett!' : '🎉 Alle Aufgaben geschafft!') + '</h2>' +
            '<p>' + (st.fertig ? 'Das Abzeichen <strong>' + esc(a ? a.name : '') + '</strong> gehört euch. ' : 'Lasst jetzt noch die offenen Abnahmen von der Lehrkraft bestätigen – dann gehört euch das Abzeichen. ') +
            'Akku: <strong>' + st.prozent + ' %</strong>' + (st.prozent < 150 ? ' – mit Turbo-Aufgaben geht noch mehr ⚡' : ' – voll überladen! ⚡⚡⚡') + '</p>' +
            '<div class="rb-actions" style="justify-content:center"><a class="btn btn-primary" href="robotik.html#abzeichen">Zu Abzeichen & Spickzettel</a>' +
            (naechste[0] ? '<a class="btn btn-outline" href="' + naechste[0].seite + '">Weiter: ' + esc(naechste[0].kurz) + ' →</a>' : '') + '</div>';
    }

    // ---------- Team-Leiste (oben, klebt beim Scrollen)
    function teamleiste() {
        var box = $('#teamleiste');
        if (!box) {
            box = el('div', { id: 'teamleiste' });
            var hero = $('.main-content .hero');
            hero.parentNode.insertBefore(box, hero.nextSibling);
        }
        var t = aktivesTeam();
        if (!t) {
            box.className = 'rb-panel';
            box.innerHTML = '<h2>👋 Wer seid ihr?</h2><p>Legt euer Team an (oder wählt es aus), damit eure Punkte gespeichert werden. Alles bleibt nur auf diesem Computer.</p><div class="team-auswahl"></div>';
            teamAuswahl(box.querySelector('.team-auswahl'), function () { location.reload(); });
            return;
        }
        if (!gueltig(t)) zeigeManipuliert();
        box.className = 'teamleiste';
        box.innerHTML = '<span class="tl-team">🤖 ' + esc(t.name) + (t.mitglieder && t.mitglieder.length ? ' <small>(' + esc(t.mitglieder.join(', ')) + ')</small>' : '') + '</span>' +
            '<div class="tl-akku" title="Akku dieser Mission: 100 % = alle Pflicht-Aufgaben, bis 150 % mit Extras">' + akkuHtml(0) + '</div>' +
            '<span class="tl-rest"></span>';
        teamleisteRest();
    }
    function teamleisteRest() {
        var rest = $('.teamleiste .tl-rest');
        if (!rest) return;
        var t = aktivesTeam();
        var n = t && t.erfolge ? Object.keys(t.erfolge).length : 0;
        var m = mission(SEITE.mission), kp = t && t.prozent ? t.prozent[m.kurs] : null;
        rest.innerHTML = (m.kurs === 'starter' && kp != null ? '<span title="Akku des ganzen Starter-Kurses (Woche 1–3)">🔋 Kurs: <strong>' + kp + ' %</strong></span>' : '') +
            '<span title="Erfolge">🏆 ' + n + '</span><button type="button" class="tl-knopf tl-uhr-knopf">⏱ <span class="tl-uhr">Stunde starten</span></button>' +
            '<button type="button" class="tl-knopf tl-sichern" title="Spielstand als Datei sichern">💾</button><a href="robotik.html">Übersicht</a>';
        rest.querySelector('.tl-sichern').addEventListener('click', function () { exportiere(aktivesTeam()); });
        rest.querySelector('.tl-uhr-knopf').addEventListener('click', function () {
            var u = uhrStart();
            if (u && !confirm('Die Stunden-Uhr läuft schon. Neu starten?')) return;
            localStorage.setItem(UHR, String(Date.now()));
            erinnert = false; uhr();
        });
        uhr();
    }
    var UHR = 'edu-mrh-robotik-uhr', erinnert = false, uhrTimer = null;
    function uhrStart() { var u = +(localStorage.getItem(UHR) || 0); return (u && Date.now() - u < 3 * 3600 * 1000) ? u : 0; }
    function uhr() {
        clearInterval(uhrTimer);
        var anzeige = $('.tl-uhr');
        if (!anzeige) return;
        function tick() {
            var u = uhrStart();
            if (!u) { anzeige.textContent = 'Stunde starten'; return; }
            var min = (Date.now() - u) / 60000, rest = Math.max(0, Math.ceil(KONFIG.stundeMin - min));
            anzeige.textContent = rest > 0 ? 'noch ' + rest + ' min' : 'Zeit um!';
            anzeige.classList.toggle('knapp', min >= KONFIG.aufraeumenMin);
            if (min >= KONFIG.aufraeumenMin && min < KONFIG.aufraeumenMin + 1 && !erinnert) {
                erinnert = true;
                toast('🧹', 'Noch 10 Minuten!', 'Speichert euer Programm, räumt auf und macht den Aufräum-Schritt.');
            }
        }
        tick(); uhrTimer = setInterval(tick, 15000);
    }

    // Team anlegen / auswählen (Formular, wird auf Missionsseiten und in der Übersicht benutzt)
    function teamAuswahl(box, nachher) {
        var d = lese(), ids = Object.keys(d.teams);
        var html = '';
        if (ids.length) {
            html += '<div class="team-form" style="margin-bottom:.8rem"><label>Vorhandenes Team<select class="ta-wahl">' +
                ids.map(function (id) { return '<option value="' + id + '"' + (id === d.aktiv ? ' selected' : '') + '>' + esc(d.teams[id].name) + '</option>'; }).join('') +
                '</select></label><button type="button" class="rb-knopf ta-nehmen">Dieses Team</button></div>';
        }
        html += '<div class="team-form"><label>Teamname<input class="ta-name" maxlength="30" placeholder="z. B. Die Robo-Ritter"></label>' +
            '<label>Vornamen (mit Komma)<input class="ta-mitglieder" maxlength="80" placeholder="z. B. Lena, Ali, Mo"></label>' +
            '<button type="button" class="rb-knopf gelb ta-neu">＋ Neues Team</button></div>' +
            '<p style="font-size:.85rem;color:#64748b;margin:.6rem 0 0">Nur Vornamen – alles bleibt auf diesem Computer. Wechselt ihr den Rechner? Mit 💾 sichern und dort laden.</p>';
        box.innerHTML = html;
        var nehmen = box.querySelector('.ta-nehmen');
        if (nehmen) nehmen.addEventListener('click', function () { waehleTeam(box.querySelector('.ta-wahl').value); nachher(); });
        box.querySelector('.ta-neu').addEventListener('click', function () {
            var name = box.querySelector('.ta-name').value.trim();
            if (name.length < 2) { box.querySelector('.ta-name').focus(); box.querySelector('.ta-name').placeholder = 'Bitte einen Teamnamen eingeben'; return; }
            var m = box.querySelector('.ta-mitglieder').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5);
            neuesTeam(name, m);
            nachher();
        });
    }

    // ---------- Export / Import
    function exportiere(t, alle) {
        if (!t && !alle) return;
        var inhalt = alle ? { format: 'edu-mrh-robotik', version: 1, teams: alle } : { format: 'edu-mrh-robotik', version: 1, team: t };
        datei(alle ? 'robotik-alle-teams-' + heute().replace(/\./g, '-') + '.json' : 'robotik-' + dateiname(t.name) + '.json', JSON.stringify(inhalt), 'application/json');
        if (!alle) toast('💾', 'Spielstand gesichert', 'Datei „robotik-' + dateiname(t.name) + '.json“ – im Schulordner aufbewahren.');
    }
    function importiere(datei, nachher) {
        var r = new FileReader();
        r.onload = function () {
            var inh;
            try { inh = JSON.parse(r.result); } catch (e) { inh = null; }
            if (!inh || inh.format !== 'edu-mrh-robotik') { dialog('Hm …', '<p>Das ist keine Spielstand-Datei der Robotik-Station.</p>'); return; }
            var teams = inh.teams ? Object.keys(inh.teams).map(function (k) { return inh.teams[k]; }) : [inh.team];
            var d = lese(), ok = 0, kaputt = 0;
            teams.forEach(function (t) {
                if (!t || !t.id) return;
                if (!gueltig(t)) { kaputt++; return; }
                d.teams[t.id] = t; ok++;
                if (teams.length === 1) d.aktiv = t.id;
            });
            schreibe(d);
            dialog(ok ? '📂 Geladen' : '⚠️ Nicht geladen', '<p>' + ok + ' Team(s) geladen.' + (kaputt ? ' ' + kaputt + ' Spielstand/Spielstände wurden verändert und deshalb nicht übernommen.' : '') + '</p>')
                .then(nachher);
        };
        r.readAsText(datei);
    }

    // ---------- Missionsseite aufbauen
    function missionsseite(mid) {
        SEITE.mission = mid;
        SEITE.katalog = katalogAusDokument(document, mid);
        katalogCache[mid] = SEITE.katalog;
        SEITE.etappen = $$('.etappe');
        SEITE.etappen.forEach(function (et) { if (!et.id) et.id = et.getAttribute('data-etappe'); });
        // Fahrplan aus den Etappen
        var fp = $('.fahrplan');
        if (fp) {
            fp.innerHTML = '';
            SEITE.etappen.forEach(function (et, i) {
                var turbo = et.classList.contains('turbo');
                var marke = turbo ? '⚡' : (et.getAttribute('data-nr') || ((i + 1) + '.'));
                var li = el('li', { class: turbo ? 'turbo' : '' }, '<a href="#' + et.id + '">' + marke + ' ' + esc(et.getAttribute('data-titel') || '') +
                    (et.getAttribute('data-min') ? ' <small>' + et.getAttribute('data-min') + ' min</small>' : '') + '</a>');
                fp.appendChild(li);
            });
        }
        // Etappen-Köpfe
        var nr = 0;
        SEITE.etappen.forEach(function (et) {
            var turbo = et.classList.contains('turbo');
            if (!turbo) nr++;
            if (turbo && et.getAttribute('data-ab')) {
                var ab = SEITE.etappen.filter(function (x) { return x.getAttribute('data-etappe') === et.getAttribute('data-ab'); })[0];
                if (ab) et.setAttribute('data-ab-nr', SEITE.etappen.filter(function (x) { return !x.classList.contains('turbo'); }).indexOf(ab) + 1);
            }
            var inhalt = el('div', { class: 'etappe-inhalt' });
            while (et.firstChild) inhalt.appendChild(et.firstChild);
            var kopf = el('div', { class: 'etappe-kopf' }, '<span class="e-nr">' + (turbo ? '⚡' : (et.getAttribute('data-nr') || nr)) + '</span><h2>' + esc(et.getAttribute('data-titel') || '') +
                (et.getAttribute('data-untertitel') ? '<small>' + esc(et.getAttribute('data-untertitel')) + '</small>' : '') + '</h2>' +
                (et.getAttribute('data-min') ? '<span class="e-zeit">⏱ ca. ' + et.getAttribute('data-min') + ' min</span>' : '') + '<span class="e-status"></span>');
            et.append(kopf, inhalt, el('div', { class: 'sperr-hinweis' }));
        });
        $$('.konzept[data-konzept]').forEach(konzeptKarte);
        $$('.schritt[data-id]').forEach(function (s) {
            var k = schrittKopf(s);
            var typ = TYPEN[k.art] || TYPEN.check;
            typ(s, k);
        });
        $$('.hilfe').forEach(hilfe);
        teamleiste();
        $$('.schritt[data-id]').forEach(function (s) { schrittZustand(s); if (gesperrtBis(s) > Date.now()) sperreAnzeigen(s); });
        nachAenderung(false);
        // Sprungmarken (#w1-e4) erst jetzt anspringbar – die ids entstehen oben
        if (location.hash) { var ziel = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (ziel) setTimeout(function () { ziel.scrollIntoView(); }, 60); }
        window.addEventListener('storage', function (e) { if (e.key === KONFIG.schluessel) { $$('.schritt[data-id]').forEach(schrittZustand); nachAenderung(false); } });
    }

    // ===================================================================== 10 Übersicht (robotik.html)
    function uebersicht() {
        var katalog = null;
        function alles() {
            if (!katalog) return;
            merkeStaende(katalog);
            teamPanel(); lernpfad(); akkus(); abzeichenGitter(); erfolgeGitter(); spickzettelPanel(); abnahmeListe(); lehrkraftPanel();
        }
        window.__rbNachErfolg = function () { if (katalog) { erfolgeGitter(); akkus(); } };

        function teamPanel() {
            var box = $('#team-panel');
            if (!box) return;
            var t = aktivesTeam();
            if (!t) {
                box.innerHTML = '<h2>👋 Euer Team</h2><p>Legt zuerst euer Team an. Danach sammelt ihr Punkte, ladet euren Akku und verdient Abzeichen.</p><div class="ta"></div>' +
                    '<div class="team-werkzeuge"><label class="rb-knopf leise" style="cursor:pointer">📂 Spielstand laden<input type="file" accept=".json,application/json" hidden></label></div>';
                teamAuswahl(box.querySelector('.ta'), alles);
            } else {
                var rang = t.fertig && t.fertig.innovator ? ['innovator', 'Innovator'] : makerFertig(t) >= 2 ? ['maker', 'Maker'] : (t.fertig && t.fertig.w1 && t.fertig.w2 && t.fertig.w3) ? ['starter', 'Starter ✓'] : ['starter', 'Starter in Ausbildung'];
                var weiter = MISSIONEN.filter(function (m) { return missionFrei(t, m) && !(t.durch && t.durch[m.id]); })[0];
                box.innerHTML = '<div class="team-karte"><div><div class="tk-name">🤖 ' + esc(t.name) + '</div><div class="tk-mitglieder">' + esc((t.mitglieder || []).join(', ') || 'ohne Namen') +
                    ' · Rang: <span class="rang ' + rang[0] + '" style="padding:.1rem .6rem;border-radius:999px;color:#fff;font-size:.85rem">' + rang[1] + '</span></div></div>' +
                    (weiter ? '<a class="btn btn-primary" href="' + weiter.seite + '">▶ Weiter: ' + esc(weiter.kurz) + '</a>' : '') + '</div>' +
                    '<div class="team-werkzeuge"><button type="button" class="rb-knopf leise tw-wechsel">👥 Team wechseln / neu</button>' +
                    '<button type="button" class="rb-knopf leise tw-sichern">💾 Spielstand sichern</button>' +
                    '<label class="rb-knopf leise" style="cursor:pointer">📂 Spielstand laden<input type="file" accept=".json,application/json" hidden></label></div><div class="ta" hidden style="margin-top:.8rem"></div>';
                box.querySelector('.tw-sichern').addEventListener('click', function () { exportiere(aktivesTeam()); });
                box.querySelector('.tw-wechsel').addEventListener('click', function () {
                    var ta = box.querySelector('.ta'); ta.hidden = !ta.hidden; if (!ta.hidden) teamAuswahl(ta, alles);
                });
            }
            var f = box.querySelector('input[type=file]');
            if (f) f.addEventListener('change', function () { if (f.files[0]) importiere(f.files[0], alles); });
        }

        function knoten(t, m) {
            var st = missionStand(t, katalog[m.id]), frei = missionFrei(t, m);
            var kl = 'lp-knoten ' + KURSE[m.kurs].rang + (frei ? '' : ' gesperrt') + (st.fertig ? ' fertig' : '');
            var status = !frei ? '🔒' : st.fertig ? '🏅' : st.durch ? '🎓' : st.gestartet ? '▶️' : '';
            return '<div class="' + kl + '"><span class="lp-status" title="' + (!frei ? 'gesperrt' : st.fertig ? 'komplett' : st.durch ? 'nur noch Abnahme' : '') + '">' + status + '</span>' +
                '<div class="lp-kopf"><span class="lp-icon">' + m.icon + '</span><div><h3>' + esc(m.kurz) + '</h3><div class="lp-sub">' + esc(m.titel.split(':')[0]) + '</div></div></div>' +
                '<p>' + esc(m.text) + '</p><div class="lp-sub">🧱 LEGO: ' + esc(m.lego) + '</div>' +
                (t ? akkuHtml(st.prozent) : '') +
                (!frei && m.voraus.length ? '<div class="lp-voraus">🔒 offen nach ' + esc(vorausText(m)) + '</div>' : '') +
                '<a class="btn btn-primary btn-sm" href="' + m.seite + '">' + (!frei ? 'Ansehen' : st.gestartet ? 'Weiter' : 'Los geht\'s') + '</a></div>';
        }
        function lernpfad() {
            var box = $('#lernpfad-karte');
            if (!box) return;
            var t = aktivesTeam();
            var reihe = function (ids) { return '<div class="lp-reihe">' + ids.map(function (id) { return knoten(t, mission(id)); }).join('') + '</div>'; };
            box.innerHTML = '<div class="lp-titel"><span class="rang starter">1 · Starter</span> Basiskurs – für alle gleich, 3 Doppelstunden</div>' + reihe(['w1', 'w2', 'w3']) +
                '<div class="lp-titel"><span class="rang maker">2 · Maker</span> Wählt euer Projekt – jedes in Stufen 🥉🥈🥇💡</div>' + reihe(['tresor', 'show', 'linie']) +
                '<div class="lp-titel"><span class="rang innovator">3 · Innovator</span> Freie Projekte – ihr erfindet selbst</div>' + reihe(['innovator']);
        }
        function akkus() {
            var box = $('#akkus');
            if (!box) return;
            var t = aktivesTeam();
            if (!t) { box.innerHTML = '<p>Sobald ihr ein Team habt, seht ihr hier eure Akkus.</p>'; return; }
            box.innerHTML = '<div class="kurs-akkus">' + Object.keys(KURSE).map(function (k) {
                var ks = kursStand(t, k, katalog);
                return '<div class="kurs-akku"><div class="ka-name">' + esc(KURSE[k].name) + '<small>Pflicht ' + ks.kern + ' / ' + ks.kernMax + ' · Extras ' + ks.bonus + ' / ' + ks.bonusMax + '</small></div>' + akkuHtml(ks.prozent, true) + '</div>';
            }).join('') + '</div>';
        }
        function abzeichenGitter() {
            var box = $('#abzeichen-gitter');
            if (!box) return;
            var t = aktivesTeam();
            box.innerHTML = '';
            ABZEICHEN.forEach(function (a) {
                var st = abzeichenStatus(t, a, katalog);
                var svg = abzeichenSvg(a, st.verdient ? sterneFuer(st.prozent) : 0, !st.verdient);
                var karte = el('div', { class: 'abzeichen' + (st.verdient ? '' : ' gesperrt') }, svg + '<strong>' + esc(a.name) + '</strong><small>' + esc(a.text) + '</small>');
                if (st.verdient) {
                    var b = el('button', { type: 'button', class: 'ab-laden', text: '⬇ als Bild speichern' });
                    b.addEventListener('click', function () { svgAlsPng(abzeichenSvg(a, sterneFuer(st.prozent), false), 'abzeichen-' + a.id + '-' + dateiname(t.name) + '.png'); });
                    karte.appendChild(b);
                }
                box.appendChild(karte);
            });
        }
        function erfolgeGitter() {
            var box = $('#erfolge-gitter');
            if (!box) return;
            var t = aktivesTeam();
            box.innerHTML = ERFOLGE.map(function (e) {
                var hat = t && t.erfolge && t.erfolge[e.id];
                return '<div class="erfolg' + (hat ? ' offen' : ' gesperrt') + '"><span class="e-icon">' + e.icon + '</span><div><strong>' + esc(e.name) + (e.punkte ? ' <span style="color:#b45309">+' + e.punkte + '</span>' : '') +
                    '</strong><small>' + esc(e.text) + '</small></div></div>';
            }).join('');
        }
        function freieKonzepte(t) {
            var frei = [], zu = [];
            MISSIONEN.forEach(function (m) {
                var kat = katalog[m.id];
                if (!kat) return;
                var ok = t && missionStand(t, kat).durch;
                kat.konzepte.forEach(function (k) { (ok ? frei : zu).push({ k: k, m: m }); });
            });
            return { frei: frei, zu: zu };
        }
        function spickzettelPanel() {
            var box = $('#spickzettel-panel');
            if (!box) return;
            var t = aktivesTeam(), fk = freieKonzepte(t);
            var starterDurch = t && t.durch && t.durch.w1 && t.durch.w2 && t.durch.w3;
            box.innerHTML = '<p>Jede geschaffte Mission schaltet Karten frei: <strong>' + fk.frei.length + ' von ' + (fk.frei.length + fk.zu.length) + '</strong>. ' +
                (starterDurch ? 'Euer Spickzettel ist bereit!' : 'Herunterladen könnt ihr ihn, sobald der Starter-Kurs (Woche 1–3) geschafft ist.') + '</p>' +
                '<div class="spick-karten">' + fk.frei.map(function (x) { return '<div class="spick-karte frei">' + x.k.icon + ' ' + esc(x.k.titel) + '</div>'; }).join('') +
                fk.zu.map(function (x) { return '<div class="spick-karte zu" title="frei nach ' + esc(x.m.kurz) + '">🔒 ' + esc(x.k.titel) + '</div>'; }).join('') + '</div>' +
                '<div class="rb-actions"><button type="button" class="rb-knopf sp-drucken"' + (starterDurch ? '' : ' disabled') + '>🖨 Robotik-Pass & Spickzettel drucken / als PDF</button>' +
                '<button type="button" class="rb-knopf leise sp-laden"' + (starterDurch ? '' : ' disabled') + '>⬇ Als Datei herunterladen</button></div>';
            box.querySelector('.sp-drucken').addEventListener('click', function () { passErzeugen(true); });
            box.querySelector('.sp-laden').addEventListener('click', function () { passErzeugen(false); });
        }
        function passErzeugen(drucken) {
            var t = aktivesTeam();
            if (!t) return;
            fetch('robotik.css').then(function (r) { return r.text(); }).catch(function () { return ''; }).then(function (css) {
                var html = passHtml(t, katalog, css);
                if (drucken) {
                    var w = window.open('', '_blank');
                    if (!w) { datei('robotik-pass-' + dateiname(t.name) + '.html', html, 'text/html'); return; }
                    w.document.open(); w.document.write(html); w.document.close();
                    setTimeout(function () { w.focus(); w.print(); }, 600);
                } else datei('robotik-pass-' + dateiname(t.name) + '.html', html, 'text/html');
            });
        }
        function abnahmeListe() {
            var box = $('#abnahme-panel');
            if (!box) return;
            var t = aktivesTeam();
            var offen = [];
            if (t) MISSIONEN.forEach(function (m) {
                var kat = katalog[m.id];
                if (!kat) return;
                kat.schritte.forEach(function (s) { if (s.art === 'abnahme' && !erl(t, s.id) && t.liste && t.liste[s.id]) offen.push({ s: s, m: m }); });
            });
            if (!offen.length) { box.innerHTML = '<p>Keine offenen Abnahmen. (Auf den Missionsseiten könnt ihr Vorführungen mit „📋 Auf die Abnahme-Liste“ vormerken.)</p>'; return; }
            box.innerHTML = '<ul class="abnahme-liste">' + offen.map(function (o) {
                return '<li><input type="checkbox" checked data-id="' + o.s.id + '" data-m="' + o.m.id + '" data-p="' + o.s.punkte + '" aria-label="auswählen"> ' + o.m.icon + ' <strong>' + esc(o.m.kurz) + ':</strong> ' + o.s.titel + '</li>';
            }).join('') + '</ul><button type="button" class="rb-knopf lehrkraft">🎓 Ausgewählte mit PIN bestätigen</button>';
            box.querySelector('button').addEventListener('click', function () {
                var gewaehlt = $$('input[type=checkbox]:checked', box);
                if (!gewaehlt.length) return;
                pinAbfrage('Abnahmen bestätigen', gewaehlt.length + ' Vorführung(en) bestätigen?').then(function (ok) {
                    if (!ok) return;
                    aendere(function (tt) {
                        gewaehlt.forEach(function (c) {
                            var id = c.getAttribute('data-id');
                            tt.s[id] = { p: +c.getAttribute('data-p'), b: 0, a: 'abnahme', m: c.getAttribute('data-m'), t: Date.now() };
                            delete tt.liste[id];
                        });
                    });
                    toast('🎓', 'Bestätigt!', gewaehlt.length + ' Abnahme(n) eingetragen.');
                    alles();
                });
            });
        }
        // ---------- Lehrkräfte-Werkzeuge (PIN)
        var lkOffen = false;
        function lehrkraftPanel() {
            var box = $('#lk-werkzeuge');
            if (!box) return;
            if (!lkOffen) {
                box.innerHTML = '<div class="lk-gesperrt"><p><strong>🔒 Lehrkraft-Werkzeuge</strong> – Überblick über alle Teams auf diesem Computer, Missionen freischalten, Spielstände sichern, PIN und Antwort-Hashes erzeugen.</p>' +
                    '<button type="button" class="rb-knopf lehrkraft">Mit PIN öffnen</button></div>';
                box.querySelector('button').addEventListener('click', function () {
                    pinAbfrage('Lehrkraft-Werkzeuge', 'PIN eingeben.').then(function (ok) { if (ok) { lkOffen = true; lehrkraftPanel(); } });
                });
                return;
            }
            var d = lese(), ids = Object.keys(d.teams);
            var zeilen = ids.map(function (id) {
                var t = d.teams[id], ok = gueltig(t);
                var ks = kursStand(t, 'starter', katalog);
                var maker = ['tresor', 'show', 'linie', 'innovator'].map(function (k) { var p = kursStand(t, k, katalog).prozent; return p ? mission(k).icon + ' ' + p + '%' : ''; }).filter(Boolean).join(' · ');
                var liste = Object.keys(t.liste || {}).filter(function (k) { return !erl(t, k); }).length;
                return '<tr><td><strong>' + esc(t.name) + '</strong>' + (id === d.aktiv ? ' (aktiv)' : '') + '<br><small>' + esc((t.mitglieder || []).join(', ')) + '</small>' + (ok ? '' : '<br><span style="color:#dc2626">⚠️ verändert</span>') + '</td>' +
                    '<td>' + ks.prozent + ' %' + (ks.fertig ? ' 🏅' : ks.durch ? ' 🎓' : '') + '</td><td>' + (maker || '–') + '</td><td>' + (liste || '–') + '</td>' +
                    '<td>' + new Date(t.geaendert || t.erstellt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td>' +
                    '<td style="white-space:nowrap"><button class="rb-knopf leise lk-akt" data-id="' + id + '" title="aktiv setzen">👆</button> ' +
                    '<button class="rb-knopf leise lk-frei" data-id="' + id + '" title="Mission freischalten">🔓</button> ' +
                    (ok ? '' : '<button class="rb-knopf leise lk-reparieren" data-id="' + id + '" title="Spielstand wieder freigeben">🩹</button> ') +
                    '<button class="rb-knopf leise lk-export" data-id="' + id + '" title="sichern">💾</button> ' +
                    '<button class="rb-knopf leise lk-loeschen" data-id="' + id + '" title="löschen">🗑</button></td></tr>';
            }).join('');
            box.innerHTML = '<h3>Teams auf diesem Computer (' + ids.length + ')</h3>' +
                '<div style="overflow-x:auto"><table class="lk-tabelle"><tr><th>Team</th><th>Starter</th><th>Maker/Innovator</th><th>Abnahme-Liste</th><th>zuletzt</th><th>Aktionen</th></tr>' + (zeilen || '<tr><td colspan="6">Noch keine Teams.</td></tr>') + '</table></div>' +
                '<div class="rb-actions"><button class="rb-knopf leise lk-alle">💾 Alle Teams sichern</button><label class="rb-knopf leise" style="cursor:pointer">📂 Teams laden<input type="file" accept=".json" hidden class="lk-import"></label>' +
                '<button class="rb-knopf leise lk-zu">🔒 Werkzeuge schließen</button></div>' +
                '<h3 style="margin-top:1.4rem">PIN ändern</h3><p>Neuen PIN eingeben, Hash erzeugen und in <code>robotik.js</code> bei <code>pinHash</code> eintragen (dann committen).</p>' +
                '<div class="rb-actions"><input class="rb-feld lk-pin" type="text" style="width:14rem" placeholder="neuer PIN"><button class="rb-knopf leise lk-pin-hash">Hash erzeugen</button><code class="lk-pin-aus"></code></div>' +
                '<h3 style="margin-top:1.4rem">Antwort-Hash für eigene Aufgaben</h3><p>Für <code>data-loesung</code>: Schritt-ID und Antwort (Quiz: Buchstabe <code>a</code>/<code>b</code>/…, Zahl, Lücken/Reihenfolge: Werte mit Komma).</p>' +
                '<div class="rb-actions"><input class="rb-feld lk-id" style="width:12rem" placeholder="Schritt-ID"><input class="rb-feld lk-antw" style="width:12rem" placeholder="Antwort"><button class="rb-knopf leise lk-hash">Hash</button><code class="lk-hash-aus"></code></div>';
            function teamVon(b) { return b.getAttribute('data-id'); }
            $$('.lk-akt', box).forEach(function (b) { b.addEventListener('click', function () { waehleTeam(teamVon(b)); alles(); }); });
            $$('.lk-export', box).forEach(function (b) { b.addEventListener('click', function () { exportiere(lese().teams[teamVon(b)]); }); });
            $$('.lk-loeschen', box).forEach(function (b) {
                b.addEventListener('click', function () {
                    var d2 = lese(), id = teamVon(b);
                    if (!confirm('Team „' + d2.teams[id].name + '“ wirklich löschen? (Vorher sichern!)')) return;
                    delete d2.teams[id]; if (d2.aktiv === id) d2.aktiv = null; schreibe(d2); alles();
                });
            });
            $$('.lk-reparieren', box).forEach(function (b) {
                b.addEventListener('click', function () {
                    var d2 = lese(), t = d2.teams[teamVon(b)];
                    t.sig = signatur(t); schreibe(d2); location.reload();
                });
            });
            $$('.lk-frei', box).forEach(function (b) {
                b.addEventListener('click', function () {
                    var id = teamVon(b);
                    dialog('Mission freischalten', '<p>Welche Mission soll für dieses Team sofort offen sein (z. B. für schnelle Starter oder nach Fehlzeiten)?</p><select class="rb-feld" style="width:100%">' +
                        MISSIONEN.map(function (m) { return '<option value="' + m.id + '">' + m.icon + ' ' + esc(m.titel) + '</option>'; }).join('') + '</select>',
                        [{ text: 'Abbrechen', wert: null, leise: true }, { text: 'Freischalten', wert: function (dlg) { return dlg.querySelector('select').value; } }]).then(function (mid) {
                        if (!mid) return;
                        aendere(function (tt) { tt.frei[mid] = true; }, id);
                        toast('🔓', 'Freigeschaltet', mission(mid).titel);
                        alles();
                    });
                });
            });
            box.querySelector('.lk-alle').addEventListener('click', function () { exportiere(null, lese().teams); });
            box.querySelector('.lk-import').addEventListener('change', function (e) { if (e.target.files[0]) importiere(e.target.files[0], alles); });
            box.querySelector('.lk-zu').addEventListener('click', function () { lkOffen = false; lehrkraftPanel(); });
            box.querySelector('.lk-pin-hash').addEventListener('click', function () {
                var p = box.querySelector('.lk-pin').value.trim();
                box.querySelector('.lk-pin-aus').textContent = p.length < 6 ? 'mind. 6 Zeichen' : "pinHash: '" + hash('pin|' + p) + "',";
            });
            box.querySelector('.lk-hash').addEventListener('click', function () {
                box.querySelector('.lk-hash-aus').textContent = hash(box.querySelector('.lk-id').value.trim() + '|' + norm(box.querySelector('.lk-antw').value));
            });
        }

        ladeKatalog().then(function (k) {
            katalog = k;
            var fehlt = MISSIONEN.filter(function (m) { return !k[m.id]; });
            if (fehlt.length === MISSIONEN.length) {
                var w = el('div', { class: 'rb-warnung' }, '<strong>Hinweis:</strong> Die Missionsseiten konnten nicht geladen werden. Bitte die Seite über den Webserver öffnen (https://edu-mrh.de/… oder lokal mit <code>python3 -m http.server</code>), nicht als Datei.');
                var c = $('.main-content .container'); c.insertBefore(w, c.children[1]);
            }
            alles();
        });
        window.addEventListener('storage', function (e) { if (e.key === KONFIG.schluessel) alles(); });
    }

    // ---------- Robotik-Pass & Spickzettel (eigenständige HTML-Datei)
    function passHtml(t, katalog, css) {
        var gesamt = [];
        MISSIONEN.forEach(function (m) {
            var kat = katalog[m.id];
            if (kat && missionStand(t, kat).durch) kat.konzepte.forEach(function (k) { gesamt.push({ k: k, m: m }); });
        });
        var abz = ABZEICHEN.map(function (a) { var st = abzeichenStatus(t, a, katalog); return st.verdient ? '<div class="p-abz">' + abzeichenSvg(a, sterneFuer(st.prozent), false) + '</div>' : ''; }).join('');
        var akkusHtml = Object.keys(KURSE).map(function (k) {
            var ks = kursStand(t, k, katalog);
            return ks.kern || ks.bonus ? '<div class="p-akku"><span>' + esc(KURSE[k].name) + '</span>' + akkuHtml(ks.prozent) + '</div>' : '';
        }).join('');
        var erfolge = ERFOLGE.filter(function (e) { return t.erfolge && t.erfolge[e.id]; }).map(function (e) { return '<span class="p-erfolg">' + e.icon + ' ' + esc(e.name) + '</span>'; }).join(' ');
        var verbinden = '<div class="konzept p-karte"><div class="k-kopf"><span class="k-icon">🔌</span><div><span class="k-label">Spickzettel</span><h3>Hub verbinden</h3></div></div><div class="k-inhalt">' +
            '<ol class="p-liste"><li>Chrome/Edge: <b>spike.legoeducation.com</b> (oder SPIKE-App) → <b>SPIKE Prime</b></li><li><b>Neues Projekt</b> → <b>Textblöcke</b> → Name mit Teamname</li>' +
            '<li>Kabel: groß in den Rechner, klein in den Hub · Hub einschalten (Mitteltaste)</li><li>Hub-Symbol oben links → <b>USB</b> → „LEGO Hub“ wählen → <b>Verbinden</b></li>' +
            '<li>▶ Start · ■ Stopp · Ausschalten: Mitteltaste gedrückt halten</li></ol></div></div>';
        var farben = '<div class="konzept p-karte"><div class="k-kopf"><span class="k-icon">🎨</span><div><span class="k-label">Spickzettel</span><h3>Blockfarben</h3></div></div><div class="k-inhalt"><div class="sb-legende">' +
            '<span class="sb ev">Ereignisse</span><span class="sb mot">Motoren</span><span class="sb mov">Bewegung</span><span class="sb lig">Licht</span><span class="sb snd">Klang</span>' +
            '<span class="sb ctl">Steuerung</span><span class="sb sen">Sensoren</span><span class="sb op">Operatoren</span><span class="sb var">Variablen</span><span class="sb my">Meine Blöcke</span></div></div></div>';
        var karten = gesamt.map(function (x) {
            return '<div class="konzept p-karte' + (x.k.maker ? ' maker' : '') + '"><div class="k-kopf"><span class="k-icon">' + x.k.icon + '</span><div><span class="k-label">' + esc(x.m.kurz) + '</span><h3>' + esc(x.k.titel) + '</h3></div></div><div class="k-inhalt">' + x.k.html + '</div></div>';
        }).join('');
        // Eigene Messwerte des Teams (z. B. Vierteldrehungs-Wert) in die Karten eintragen
        var tmp = document.createElement('div');
        tmp.innerHTML = karten;
        $$('[data-wert]', tmp).forEach(function (e) { var w = wertFuer(t, e); if (w === false) e.remove(); else if (w != null) e.textContent = w; });
        karten = tmp.innerHTML;
        var extra = 'body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1e293b;margin:0;padding:18px;background:#fff}' +
            '.p-kopf{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0e7490;padding-bottom:8px;margin-bottom:10px}' +
            '.p-kopf h1{margin:0;font-size:26px;color:#155e75}.p-kopf small{color:#64748b}.p-abzeichen{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
            '.p-abz svg{width:92px;height:108px}.p-akku{display:grid;grid-template-columns:130px 1fr;gap:8px;align-items:center;font-weight:700;font-size:13px;margin:4px 0}' +
            '.p-erfolg{display:inline-block;background:#fffbeb;border:1px solid #fcd34d;border-radius:999px;padding:2px 8px;margin:2px;font-size:12px}' +
            '.p-gitter{columns:2;column-gap:12px;margin-top:12px}.p-karte{break-inside:avoid;margin:0 0 10px;font-size:12.5px}.p-karte .k-zeile{grid-template-columns:5.4rem 1fr}.p-karte .k-zeile>b{font-size:10px;overflow-wrap:anywhere;hyphens:auto}' +
            '.p-karte h3{font-size:15px}.p-liste{margin:0;padding-left:18px}.p-liste li{margin:2px 0}h2.p-h{font-size:18px;margin:14px 0 4px;color:#155e75}' +
            '.p-fuss{margin-top:10px;font-size:11px;color:#64748b;text-align:center}@media print{body{padding:0}.p-seite2{break-before:page}}@page{size:A4;margin:12mm}' +
            '@media (max-width:700px){.p-gitter{columns:1}}';
        return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Robotik-Pass ' + esc(t.name) + '</title><style>' + css + extra + '</style></head><body>' +
            '<div class="p-kopf"><div><h1>🤖 Robotik-Pass: ' + esc(t.name) + '</h1><small>' + ((t.mitglieder || []).length ? esc(t.mitglieder.join(', ')) + ' · ' : '') + 'Makerspace · Robotik-Station (LEGO SPIKE Prime) · edu-mrh.de</small></div><small>Stand ' + heute() + '</small></div>' +
            '<div class="p-abzeichen">' + (abz || '<em>Noch keine Abzeichen – weiter geht\'s!</em>') + '</div>' + akkusHtml +
            (erfolge ? '<div style="margin-top:6px">' + erfolge + '</div>' : '') +
            '<h2 class="p-h p-seite2">📄 Spickzettel – eure Werkzeuge</h2><div class="p-gitter">' + verbinden + farben + karten + '</div>' +
            '<div class="p-fuss">Erstellt auf edu-mrh.de/makerspace/robotik · Blöcke in der App können leicht anders heißen – Farbe und Symbol helfen beim Finden.</div></body></html>';
    }

    // ===================================================================== 11 Start
    function start() {
        var b = document.body;
        if (b.getAttribute('data-mission')) missionsseite(b.getAttribute('data-mission'));
        else if (b.getAttribute('data-seite') === 'uebersicht') uebersicht();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

    // Für Tests und eigene Erweiterungen
    window.RobotikStation = { hash: hash, norm: norm, MISSIONEN: MISSIONEN, ABZEICHEN: ABZEICHEN, ERFOLGE: ERFOLGE, abzeichenSvg: abzeichenSvg };
})();
