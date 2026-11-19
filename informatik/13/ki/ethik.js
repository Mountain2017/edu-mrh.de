/*
 * KI Station 10 – Ethik (braucht ki.js)
 *
 *   <div data-positionslinie="id" data-these="…"></div>   Positionslinie: eigene Haltung vorher und nachher (Regler 0 bis 10),
 *                                                          zeigt die Verschiebung; gespeichert im localStorage ('kiPos:<id>')
 *   <div data-fall="id"><h4>…</h4><p>Situation</p>…</div>   Fallkarte: darunter Felder für Chancen, Risiken, Verantwortung,
 *                                                          eigenes Urteil (localStorage 'kiFall:<id>')
 *   <div data-stellungnahme></div>                         Gerüst für die schriftliche Stellungnahme mit Wortzähler und Druckansicht
 *
 * Nichts verlässt den Browser. „Alles löschen“ entfernt die Einträge dieser Seite.
 */
(function () {
    'use strict';
    var h = KI.h, sp = KI.speicher;

    function positionslinie(box) {
        var id = box.getAttribute('data-positionslinie'), these = box.getAttribute('data-these');
        var stand = sp.lies('kiPos:' + id, { vorher: null, nachher: null });
        box.classList.add('werk', 'positionslinie');
        box.appendChild(h('h4', { text: 'Positionslinie' }));
        box.appendChild(h('p', { cls: 'pos-these', text: '„' + these + '“' }));
        function zeile(name, schluessel) {
            var id2 = 'p' + Math.random().toString(36).slice(2);
            var inp = h('input', { type: 'range', min: '0', max: '10', step: '1', id: id2, value: stand[schluessel] === null ? 5 : stand[schluessel] });
            var out = h('output', { text: stand[schluessel] === null ? '–' : String(stand[schluessel]) });
            inp.addEventListener('input', function () { stand[schluessel] = +inp.value; out.textContent = inp.value; sp.schreib('kiPos:' + id, stand); zeige(); });
            return h('div', { cls: 'regler pos-regler' }, [h('label', { for: id2, text: name }), inp, out]);
        }
        box.appendChild(h('div', { cls: 'pos-skala' }, [h('span', { text: 'stimme gar nicht zu' }), h('span', { text: 'stimme voll zu' })]));
        box.appendChild(zeile('vor dem Gespräch', 'vorher'));
        box.appendChild(zeile('nach dem Gespräch', 'nachher'));
        var rueck = h('div', { cls: 'rueck', 'aria-live': 'polite' });
        box.appendChild(rueck);
        function zeige() {
            if (stand.vorher === null || stand.nachher === null) { rueck.className = 'rueck'; rueck.textContent = ''; return; }
            var d = stand.nachher - stand.vorher;
            rueck.className = 'rueck neutral';
            rueck.textContent = d === 0 ? 'Deine Haltung ist gleich geblieben. Welches Gegenargument war das stärkste, das dich trotzdem nicht überzeugt hat?' :
                'Du hast dich um ' + Math.abs(d) + ' Stufe' + (Math.abs(d) === 1 ? '' : 'n') + ' in Richtung ' + (d > 0 ? 'Zustimmung' : 'Ablehnung') + ' bewegt. Welches Argument hat dich bewegt?';
        }
        zeige();
    }

    function fall(box) {
        var id = box.getAttribute('data-fall'), stand = sp.lies('kiFall:' + id, {});
        box.classList.add('fallkarte');
        var felder = h('div', { cls: 'fall-felder' });
        [['chancen', 'Chancen: Wem nützt es?'], ['risiken', 'Risiken: Wem kann es schaden? Was kann schiefgehen?'], ['verantwortung', 'Verantwortung: Wer muss was tun (Entwickler, Betreiber, Nutzer, Staat)?'], ['urteil', 'Mein Urteil: unter welchen Bedingungen ja, nein?']].forEach(function (f) {
            var ta = h('textarea', { rows: '2', 'aria-label': f[1] });
            ta.value = stand[f[0]] || '';
            ta.addEventListener('input', function () { stand[f[0]] = ta.value; sp.schreib('kiFall:' + id, stand); });
            felder.appendChild(h('label', { cls: 'fall-feld' }, [h('span', { text: f[1] }), ta]));
        });
        box.appendChild(felder);
    }

    function stellungnahme(box) {
        var stand = sp.lies('kiStellung', {});
        box.classList.add('werk', 'stellungnahme');
        box.appendChild(h('h4', { text: 'Meine Stellungnahme' }));
        var teile = [['frage', 'Frage', 'Soll …?', 1], ['these', 'These: meine Position in einem Satz', 'Ich bin der Meinung, dass …', 2], ['pro', 'Argument dafür (mit Beispiel)', 'Dafür spricht, dass … Zum Beispiel …', 3], ['contra', 'Gegenargument (ernst nehmen!)', 'Dagegen spricht, dass …', 3], ['abwaegung', 'Abwägung', 'Wichtiger ist mir …, weil … Unter der Bedingung, dass …', 3], ['fazit', 'Fazit', 'Deshalb …', 2]];
        var tas = {};
        teile.forEach(function (t) {
            var ta = h('textarea', { rows: String(t[3]), placeholder: t[2], 'aria-label': t[1] });
            ta.value = stand[t[0]] || '';
            ta.addEventListener('input', function () { stand[t[0]] = ta.value; sp.schreib('kiStellung', stand); zaehle(); });
            tas[t[0]] = ta;
            box.appendChild(h('label', { cls: 'fall-feld' }, [h('span', { text: t[1] }), ta]));
        });
        var zahlEl = h('p', { cls: 'punkte', 'aria-live': 'polite' });
        var druck = h('button', { type: 'button', cls: 'knopf', text: '🖨️ Drucken / als PDF speichern' });
        var loeschen = h('button', { type: 'button', cls: 'knopf', text: 'Alles auf dieser Seite löschen' });
        box.appendChild(h('div', { cls: 'knopfzeile' }, [zahlEl, druck, loeschen]));
        function zaehle() {
            var n = 0; Object.keys(tas).forEach(function (k) { n += (tas[k].value.match(/\S+/g) || []).length; });
            zahlEl.textContent = n + ' Wörter' + (n < 120 ? ' (Ziel: etwa 150)' : n > 220 ? ' (etwas kürzer fassen?)' : ' ✓');
        }
        druck.addEventListener('click', function () {
            var w = window.open('', '_blank');
            if (!w) return;
            var html = '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Stellungnahme</title><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;line-height:1.5}h1{font-size:1.3rem}h2{font-size:1rem;margin:1rem 0 .2rem}</style></head><body><h1>Stellungnahme zu Einsatzmöglichkeiten von KI</h1>';
            teile.forEach(function (t) { html += '<h2>' + t[1] + '</h2><p>' + (tas[t[0]].value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>'; });
            w.document.write(html + '</body></html>'); w.document.close(); w.focus(); w.print();
        });
        loeschen.addEventListener('click', function () {
            if (!confirm('Alle Einträge dieser Seite (Positionslinien, Fallkarten, Stellungnahme) in diesem Browser löschen?')) return;
            try { Object.keys(localStorage).forEach(function (k) { if (/^kiPos:|^kiFall:|^kiStellung/.test(k)) localStorage.removeItem(k); }); } catch (e) { /* gesperrt */ }
            location.reload();
        });
        zaehle();
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-positionslinie]').forEach(positionslinie);
        document.querySelectorAll('[data-fall]').forEach(fall);
        document.querySelectorAll('[data-stellungnahme]').forEach(stellungnahme);
    });
})();
