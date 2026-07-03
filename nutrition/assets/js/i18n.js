/* ============================================================
   i18n.js — minimal localization helper
   Strategy:
   - Editorial pages are real static HTML per language (/de/, /en/),
     linked via <link rel="alternate" hreflang> in each page head.
   - This script only (a) remembers the user's language choice,
     (b) wires the header switcher to the counterpart page, and
     (c) exposes t() for future tool pages that use ui-strings JSON.
   No framework, no build step, progressive enhancement only.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'ews-lang'; // "ews" = edu website subdomain prefix
  var SUPPORTED = ['de', 'en'];

  function currentLang() {
    return document.documentElement.lang || 'de';
  }

  // Counterpart URLs are declared in the page head as hreflang alternates.
  function alternateFor(lang) {
    var link = document.querySelector(
      'link[rel="alternate"][hreflang="' + lang + '"]'
    );
    return link ? link.getAttribute('href') : null;
  }

  // Remember explicit choices made via the switcher.
  function rememberChoice(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
  }

  function savedChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  // Wire up the language switcher in the header.
  document.addEventListener('DOMContentLoaded', function () {
    var switcher = document.querySelector('.lang-switch');
    if (switcher) {
      SUPPORTED.forEach(function (lang) {
        var el = switcher.querySelector('[data-lang="' + lang + '"]');
        if (!el) return;
        if (lang === currentLang()) {
          el.setAttribute('aria-current', 'true');
        } else {
          var href = alternateFor(lang);
          if (href && el.tagName === 'A') {
            el.setAttribute('href', href);
            el.addEventListener('click', function () { rememberChoice(lang); });
          }
        }
      });
    }

    // Gentle first-visit hint (no auto-redirect: redirects annoy and hurt SEO).
    // If the browser prefers a supported language different from the page
    // and the user has never chosen, the switcher gets a subtle highlight.
    if (!savedChoice()) {
      var pref = (navigator.language || 'de').slice(0, 2).toLowerCase();
      if (SUPPORTED.indexOf(pref) !== -1 && pref !== currentLang() && switcher) {
        switcher.style.boxShadow = '0 0 0 2px #2E7A4D';
      }
    }
  });

  /* ---------- For future tool pages ----------
     Tool pages (food explorer, profile builder) are single HTML files
     shared across languages. They load a strings file:
       assets/i18n/ui.<lang>.json
     and call I18N.t('key') for every UI string.
  ------------------------------------------------ */
  var strings = {};

  function loadStrings(lang) {
    return fetch('/assets/i18n/ui.' + lang + '.json')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (json) { strings = json; return json; });
  }

  function t(key) {
    return Object.prototype.hasOwnProperty.call(strings, key) ? strings[key] : key;
  }

  window.I18N = {
    lang: currentLang,
    load: loadStrings,
    t: t,
    remember: rememberChoice
  };
})();
