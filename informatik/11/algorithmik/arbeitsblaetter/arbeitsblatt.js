/* ==========================================================================
   Arbeitsblätter „Algorithmik mit Snap!“ – Ausfüllen, Speichern, Drucken
   --------------------------------------------------------------------------
   - Alle Felder mit data-feld="…" werden automatisch im Browser gespeichert
     (localStorage, Schlüssel "ab:<blatt-id>") – nichts geht zum Server.
   - Antworten können als JSON-Datei gesichert und wieder geladen werden
     (z. B. um sie an einem anderen Gerät weiterzubearbeiten oder abzugeben).
   - „Drucken / PDF“ nutzt den Druckdialog des Browsers (→ „Als PDF sichern“).
   Erwartet: <body data-blatt="ab-1-sequenz"> und eine .ab-toolbar mit
   Buttons data-aktion="drucken|sichern|laden|leeren".
   ========================================================================== */
(function () {
    'use strict';

    var blattId = document.body.getAttribute('data-blatt') || location.pathname.split('/').pop().replace(/\.html$/, '');
    var KEY = 'ab:' + blattId;
    var status = document.querySelector('.ab-status');

    function felder() { return Array.prototype.slice.call(document.querySelectorAll('[data-feld]')); }

    function wert(el) {
        if (el.type === 'checkbox') { return el.checked; }
        if (el.isContentEditable) { return el.innerText; }
        return el.value;
    }
    function setzeWert(el, v) {
        if (v === undefined || v === null) { return; }
        if (el.type === 'checkbox') { el.checked = !!v; }
        else if (el.isContentEditable) { el.innerText = v; }
        else { el.value = v; }
    }

    function sammeln() {
        var d = { _blatt: blattId, _gespeichert: new Date().toISOString() };
        felder().forEach(function (el) { d[el.getAttribute('data-feld')] = wert(el); });
        return d;
    }
    function anwenden(d) {
        felder().forEach(function (el) { setzeWert(el, d[el.getAttribute('data-feld')]); });
    }

    var timer = null;
    function speichern() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            try {
                localStorage.setItem(KEY, JSON.stringify(sammeln()));
                melde('Gespeichert im Browser · ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
            } catch (e) { melde('Speichern im Browser nicht möglich'); }
        }, 300);
    }
    function melde(t) { if (status) { status.textContent = t; } }

    function laden() {
        try {
            var raw = localStorage.getItem(KEY);
            if (raw) { anwenden(JSON.parse(raw)); melde('Deine Antworten aus diesem Browser wurden geladen.'); }
        } catch (e) { /* ignorieren */ }
    }

    function sichernAlsDatei() {
        var d = sammeln();
        var name = (document.querySelector('[data-feld="name"]') || {}).value || '';
        var datei = blattId + (name ? '-' + name.trim().replace(/[^\wäöüÄÖÜß-]+/g, '_') : '') + '.json';
        var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = datei;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        melde('Datei ' + datei + ' gesichert.');
    }

    function ladenAusDatei() {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = function () {
            var f = inp.files[0]; if (!f) { return; }
            var r = new FileReader();
            r.onload = function () {
                try {
                    var d = JSON.parse(r.result);
                    if (d._blatt && d._blatt !== blattId && !confirm('Die Datei gehört zu „' + d._blatt + '“, nicht zu diesem Blatt. Trotzdem laden?')) { return; }
                    anwenden(d); speichern(); melde('Antworten aus Datei geladen.');
                } catch (e) { alert('Die Datei konnte nicht gelesen werden.'); }
            };
            r.readAsText(f);
        };
        inp.click();
    }

    function leeren() {
        if (!confirm('Alle Eingaben auf diesem Blatt löschen?')) { return; }
        felder().forEach(function (el) { setzeWert(el, el.type === 'checkbox' ? false : ''); });
        try { localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
        melde('Blatt geleert.');
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Einzeilige contenteditable-Felder: Enter = Zeilenumbruch verhindern
        felder().forEach(function (el) {
            el.addEventListener('input', speichern);
            el.addEventListener('change', speichern);
            if (el.isContentEditable && el.classList.contains('kurz')) {
                el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); } });
            }
            if (el.isContentEditable) {
                // nur Text einfügen (keine Formatierungen aus der Zwischenablage)
                el.addEventListener('paste', function (e) {
                    e.preventDefault();
                    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
                });
            }
        });
        var datum = document.querySelector('[data-feld="datum"]');
        if (datum && !datum.value) { datum.placeholder = new Date().toLocaleDateString('de-DE'); }
        laden();

        document.querySelectorAll('[data-aktion]').forEach(function (b) {
            b.addEventListener('click', function () {
                var a = b.getAttribute('data-aktion');
                if (a === 'drucken') { window.print(); }
                else if (a === 'sichern') { sichernAlsDatei(); }
                else if (a === 'laden') { ladenAusDatei(); }
                else if (a === 'leeren') { leeren(); }
            });
        });
    });
})();
