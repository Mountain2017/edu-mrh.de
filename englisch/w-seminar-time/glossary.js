/* W-Seminar "Time" – glossary.html: search over all terms.
   Markup: <section data-group> … <article class="term" id="g-…" data-also="aliases"> …
   A search hides non-matching terms and every group without a match (sections with
   data-group but no terms, e.g. the results-line band, hide while a search is active).
   ?q=word in the URL pre-fills the search. Nothing is stored. */
(function () {
    'use strict';

    function norm(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[’'`´‑–—-]/g, '');   // t-test = ttest, Mann–Whitney = MannWhitney
    }

    function init() {
        var input = document.getElementById('g-search');
        var count = document.getElementById('g-count');
        var none = document.getElementById('g-none');
        if (!input) return;
        var terms = [].slice.call(document.querySelectorAll('.term'));
        var groups = [].slice.call(document.querySelectorAll('[data-group]'));
        terms.forEach(function (t) { t._txt = norm(t.textContent + ' ' + (t.getAttribute('data-also') || '')); });

        function run() {
            var q = norm(input.value).trim();
            var words = q ? q.split(/\s+/) : [];
            var n = 0;
            terms.forEach(function (t) {
                var hit = words.every(function (w) { return t._txt.indexOf(w) >= 0; });
                t.hidden = !hit;
                if (hit) n++;
            });
            groups.forEach(function (g) {
                g.classList.toggle('g-empty', words.length > 0 && !g.querySelector('.term:not([hidden])'));
            });
            count.textContent = words.length ? n + (n === 1 ? ' term found' : ' terms found') : terms.length + ' terms';
            none.hidden = !(words.length && n === 0);
        }

        input.addEventListener('input', run);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { input.value = ''; run(); }
            if (e.key === 'Enter') {
                var first = document.querySelector('.term:not([hidden])');
                if (first && input.value.trim()) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        try {
            var q = new URLSearchParams(location.search).get('q');
            if (q) input.value = q;
        } catch (e) { /* old browser: no pre-fill */ }
        run();

        // A link to a hidden term (search active) clears the search first.
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href^="#g-"]');
            if (!a) return;
            var t = document.getElementById(a.getAttribute('href').slice(1));
            if (t && t.hidden) { input.value = ''; run(); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
