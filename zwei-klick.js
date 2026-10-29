/*
 * zwei-klick.js – externe Inhalte (z. B. fobizz-KI-Assistenten) erst nach Klick laden.
 *
 * Einbinden:  <script defer src="/zwei-klick.js"></script>
 * Markup:     <iframe data-zwei-klick="https://app.fobizz.com/…" data-anbieter="fobizz"
 *                     title="…" …></iframe>      (ohne src!)
 *
 * Solange nicht geklickt wurde, zeigt das iframe nur einen Hinweis (srcdoc) und es
 * geht keine Anfrage an den Anbieter. Der Startknopf navigiert das iframe selbst zur
 * Adresse aus data-zwei-klick. Sprache nach <html lang> (de, sonst englisch).
 * Datenschutz-Abschnitt: https://edu-mrh.de/contribute.html#impressum (Abschnitt 7).
 */
(function () {
    var DATENSCHUTZ = 'https://edu-mrh.de/contribute.html#impressum';
    var anbieterInfo = {
        fobizz: 'fobizz (101skills GmbH, Hamburg)'
    };

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function hinweis(url, anbieter, en) {
        var wer = esc(anbieterInfo[anbieter] || anbieter);
        var t = en ? {
            titel: 'External content',
            text: 'This assistant is provided by ' + wer + '. It only loads when you click the button. '
                + 'Your IP address and everything you type will then be sent to the provider. '
                + 'Please don’t enter any personal data (names, addresses, photos).',
            knopf: 'Start assistant',
            mehr: 'Privacy policy'
        } : {
            titel: 'Externer Inhalt',
            text: 'Dieser Assistent kommt von ' + wer + '. Er wird erst geladen, wenn du auf den Knopf klickst. '
                + 'Dann gehen deine IP-Adresse und alles, was du eintippst, an den Anbieter. '
                + 'Gib bitte keine persönlichen Daten ein (Namen, Adressen, Fotos).',
            knopf: 'Assistent starten',
            mehr: 'Datenschutzerklärung'
        };
        return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
            + 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;'
            + 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f8fafc;color:#1e293b;}'
            + '.box{max-width:30rem;padding:1.5rem;text-align:center;line-height:1.5;}'
            + 'h2{font-size:1.1rem;margin:0 0 .5rem;}p{margin:0 0 1rem;font-size:.95rem;}'
            + '.btn{display:inline-block;padding:.6rem 1.2rem;border-radius:.5rem;background:#2563eb;'
            + 'color:#fff;text-decoration:none;font-weight:600;}'
            + '.btn:hover{background:#1d4ed8;}small a{color:#475569;}'
            + '</style></head><body><div class="box">'
            + '<h2>' + t.titel + '</h2><p>' + t.text + '</p>'
            + '<p><a class="btn" href="' + esc(url) + '" target="_self">' + t.knopf + '</a></p>'
            + '<small><a href="' + DATENSCHUTZ + '" target="_blank" rel="noopener">' + t.mehr + '</a></small>'
            + '</div></body></html>';
    }

    function init() {
        var en = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
        var frames = document.querySelectorAll('iframe[data-zwei-klick]');
        for (var i = 0; i < frames.length; i++) {
            var f = frames[i];
            f.srcdoc = hinweis(f.getAttribute('data-zwei-klick'), f.getAttribute('data-anbieter') || '', en);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
