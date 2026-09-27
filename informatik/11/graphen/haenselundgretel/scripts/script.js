/*
 * Hänsel und Gretel – Spiellogik
 *
 * - Kein Schummeln: Eine Seite darf nur über einen Weg (Link) der vorherigen
 *   Seite betreten werden. Adresszeile oder Zurück-Knopf führen zum Start.
 * - Der gegangene Weg (Folge von Orten) wird nur im Browser gespeichert
 *   (localStorage) und am Ende als Pfad angezeigt.
 * - Die Brotkrumen macht der Browser selbst: besuchte Links (:visited) werden
 *   im Stylesheet braun gefärbt.
 * - Eingebettet (iframe auf der Stationsseite) werden die Außen-Links
 *   ausgeblendet, die die umgebende Seite ohnehin hat.
 */
(function () {
    'use strict';

    var KEY_SEITE = 'haun_spiel';     // Datei, die als Nächstes betreten werden darf
    var KEY_WEG = 'haun_spiel_weg';   // bisher gegangener Weg als Liste von Orten
    var START = ['_Spiel_starten.html', 'index.html'];

    function lesen(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function schreiben(key, wert) {
        try { localStorage.setItem(key, wert); } catch (e) { /* Speicher gesperrt */ }
    }
    function speicherVerfuegbar() {
        try {
            localStorage.setItem('haun_test', '1');
            localStorage.removeItem('haun_test');
            return true;
        } catch (e) { return false; }
    }
    function dateiname() {
        return decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
    }
    function istStart() {
        return START.indexOf(dateiname()) !== -1;
    }
    function weg() {
        try { return JSON.parse(lesen(KEY_WEG)) || []; } catch (e) { return []; }
    }

    if (window.self !== window.top) {
        document.documentElement.classList.add('eingebettet');
    }

    // Schummel-Schutz – sofort beim Laden und erneut, wenn der Browser die
    // Seite aus dem Zwischenspeicher holt (Zurück-Knopf).
    function pruefen() {
        if (istStart() || !speicherVerfuegbar()) return;
        if (lesen(KEY_SEITE) !== dateiname()) {
            location.replace('_Spiel_starten.html?geschummelt');
        }
    }
    pruefen();
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) pruefen();
    });

    function pfadHtml(orte) {
        return orte.map(function (o) {
            return '<span class="hg-ort">' + o + '</span>';
        }).join(' → ');
    }

    function bilanz(ende) {
        var box = document.getElementById('hgBilanz');
        if (!box) return;
        var orte = weg();
        if (orte.length < 2) {
            box.innerHTML = '<p>Starte am Hexenhaus, dann siehst du hier deinen Weg.</p>';
            return;
        }
        var schritte = orte.length - 1;
        var zaehler = {};
        orte.forEach(function (o) { zaehler[o] = (zaehler[o] || 0) + 1; });
        var mehrfach = Object.keys(zaehler).filter(function (o) { return zaehler[o] > 1; })
            .map(function (o) { return o + ' (' + zaehler[o] + '×)'; });

        var text = '<p><strong>Dein Weg</strong> (' + schritte + ' Schritte):</p>' +
            '<p class="hg-pfad">' + pfadHtml(orte) + '</p>';
        if (mehrfach.length) {
            text += '<p>Mehrfach besucht: ' + mehrfach.join(', ') + '.</p>';
        }
        if (ende === 'gewonnen') {
            text += schritte <= 3
                ? '<p>Kürzer geht es nicht! Aber wie könntest du beweisen, dass es keinen kürzeren Weg gibt?</p>'
                : '<p>Geht es kürzer? Wie ein Computer den kürzesten Weg systematisch findet, lernst du bei der Breitensuche.</p>';
        } else {
            text += '<p>Die Brotkrumen bleiben liegen: Beim nächsten Versuch siehst du, welche Wege du schon kennst.</p>';
        }
        text += '<p class="hg-auftrag">📝 Notiere deinen Weg auf dem Arbeitsblatt (Aufgabe 1b).</p>';
        box.innerHTML = text;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (istStart()) {
            schreiben(KEY_SEITE, dateiname());
            schreiben(KEY_WEG, JSON.stringify(['Hexenhaus']));
            if (location.search.indexOf('geschummelt') !== -1) {
                var hinweis = document.createElement('p');
                hinweis.className = 'hg-geschummelt';
                hinweis.textContent = 'Abkürzungen gibt es nicht: Mit der Adresszeile oder dem Zurück-Knopf ' +
                    'kommst du im Wald nicht weiter. Du kannst nur den Wegen folgen. Das Spiel beginnt von vorn.';
                var text = document.querySelector('.hg-text');
                text.insertBefore(hinweis, text.firstChild);
            }
        }

        var anzeige = document.getElementById('hgSchritte');
        if (anzeige && speicherVerfuegbar()) {
            anzeige.textContent = 'Schritte: ' + Math.max(weg().length - 1, 0);
        }

        var ende = document.body.getAttribute('data-ende');
        if (ende) bilanz(ende);

        document.querySelectorAll('a.weg[data-ort]').forEach(function (link) {
            link.addEventListener('click', function () {
                schreiben(KEY_SEITE, link.getAttribute('href'));
                var orte = weg();
                orte.push(link.getAttribute('data-ort'));
                schreiben(KEY_WEG, JSON.stringify(orte));
            });
        });
    });
})();
