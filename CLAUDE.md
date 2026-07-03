# CLAUDE.md – Konventionen für KI-Sessions in diesem Repository

Statisches Lernportal (HTML/CSS/JS) für das Gymnasium Bayern. Kein
Build-Schritt, kein Framework, keine Abhängigkeiten. Push auf `main`
deployt automatisch per FTPS auf edu-mrh.de. Details: [README.md](README.md).

## Beim Erstellen von Seiten

- **Immer von einer Vorlage in `templates/` ausgehen**, nicht von Null:
  - `templates/themenseite.html` – normale Inhaltsseite (Standardfall)
  - `templates/fachseite.html` – Übersichtsseite eines Fachs
  - `templates/freie-seite.html` – komplett eigenes Design
- Ablageort: `<fach>/<jahrgangsstufe>/<thema>/<thema>.html`. Ordner-/Datei-
  namen klein, ohne Umlaute und Leerzeichen (`verschluesselung`, nicht
  `Verschlüsselung`). Materialien (PDFs, Bilder, Daten) in denselben Ordner.
- Neue Seiten auf der Fachseite (`<fach>/<fach>.html`) als Karte verlinken;
  neue Fächer zusätzlich in `index.html` (Sidebar + info-grid-Karte).
- Stilistische Referenz sind die **Informatik- und Englisch-Seiten**
  (z. B. `informatik/informatik.html`, `englisch/12/uk/uk-and-writing.html`):
  gemeinsames Grundgerüst, darauf themenspezifisches Styling im `<style>`-
  Block der Seite. Abweichende Designs sind erlaubt.

## Unverhandelbare Regeln

1. **Jede Seite braucht erreichbares Impressum + Zurück-/Übersichts-Element.**
   Standard-Layout: über die Navbar (in den Vorlagen enthalten). Freies
   Design: `<script defer src="https://edu-mrh.de/controls.js"></script>`
   vor `</body>`.
2. **Keine externen CDNs, Google Fonts oder Tracker (DSGVO).** Bibliotheken
   über `https://edu-mrh.de/embed/…` (verfügbar: style.css, script.js,
   MathJax, KaTeX, Java-Online-IDE, SQL-IDE, GeoGebra – Einbinde-Zeilen
   stehen auskommentiert in `templates/themenseite.html`). Schriften als
   lokale `.woff2`.
3. **Nutzerdaten bleiben im Browser** (`localStorage`), nie zum Server.
4. **Bestehende URLs nicht brechen**: Dateien nicht umbenennen/verschieben,
   ohne dass es der Auftrag verlangt.

## Sprache & Inhalt

- Seitensprache Deutsch (`lang="de"`); Englisch-Fachseiten englisch
  (`lang="en"`). Zielgruppe: Schüler:innen – direkt ansprechen („du“).
- Inhaltlich am bayerischen LehrplanPLUS (G9) orientieren; Jahrgangsstufe
  und Fach gehören in Titel/Hero.
- Titelmuster: `Thema | Fach – edu-mrh.de`.

## Prüfen

`python3 -m http.server 8000` im Repo-Root und die Seite im Browser
ansehen (Desktop- und Mobilbreite). Es gibt keine Tests und keinen Linter.
