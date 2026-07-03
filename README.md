# edu-mrh.de – Freies Lernportal für das Gymnasium Bayern

Eine Plattform von Lehrkräften für Lehrkräfte und Schüler:innen: Unterrichts-
begleitende Webseiten, Arbeitsblätter und interaktive Module, geordnet nach
Fach und Jahrgangsstufe, angepasst an den bayerischen Lehrplan (G9).

**Kein Framework, kein Build-Schritt, keine Datenbank.** Jede Seite ist eine
einfache HTML-Datei. Wer eine Datei in den richtigen Ordner legt und pusht,
hat veröffentlicht – der Rest passiert automatisch.

---

## Wie alles aufgebaut ist

```
/
├── index.html                  Startseite (verlinkt alle Fächer)
├── contribute.html             Mitmach-Seite + Impressum & Datenschutz
├── controls.js                 Basis-Bedienelemente für frei gestaltete Seiten
├── templates/                  ⭐ Kopiervorlagen für neue Seiten
│   ├── fachseite.html          Übersichtsseite eines Fachs
│   ├── themenseite.html        Normale Inhaltsseite (Standard-Layout)
│   └── freie-seite.html        Seite mit komplett eigenem Design
│
├── <fach>/                     z. B. informatik/, englisch/, physik/ …
│   ├── <fach>.html             Fachseite: verlinkt alle Inhalte des Fachs
│   └── <jahrgangsstufe>/       z. B. 10/, 11/, 12/
│       └── <thema>/            z. B. datenbanken/
│           ├── <thema>.html    die eigentliche Themenseite
│           └── …               PDFs, Bilder, Daten zum Thema daneben
│
└── .github/workflows/          automatisches Deployment (siehe unten)
```

Die Regel dahinter in einem Satz:
**`fach/jahrgangsstufe/thema/` – und alles, was zu einem Thema gehört, liegt
in dessen Ordner.**

## Eigene Seite erstellen – in 5 Minuten

1. **Vorlage wählen** aus [templates/](templates/):

   | Vorlage | Wofür |
   |---|---|
   | [themenseite.html](templates/themenseite.html) | Der Normalfall: eine lange Scroll-Seite im Standard-Layout (Navbar, Seitenleiste mit automatischer Hervorhebung, Karten, Aufgaben mit ausklappbaren Lösungen) – wie `informatik/informatik.html` oder `englisch/englisch.html`. |
   | [fachseite.html](templates/fachseite.html) | Nur für die eine Übersichtsseite eines (neuen) Fachs. |
   | [freie-seite.html](templates/freie-seite.html) | Eigenes Design **und/oder** mehrere in sich abgeschlossene Abschnitte, zwischen denen per Klick umgeschaltet wird (Tab-Navigation), statt durchgängig zu scrollen – wie `englisch/12/uk/uk-and-writing.html` oder `informatik/11/verschluesselung/rsa.html`. Enthält zusätzlich kopierbare Bausteine (Zeitstrahl, Zitat-Box, Themen-Banner, Fakt-Box). |

   Beide Vorlagen teilen denselben Kopf (Navbar mit Übersicht/Impressum,
   `style.css`/`script.js`) – der Unterschied liegt allein darin, wie der
   Inhalt darunter organisiert ist. Auch innerhalb einer Scroll-Seite darf
   das Styling einzelner Abschnitte komplett eigenständig sein (siehe
   `themenseite.html`, Abschnitt „Weitere Bausteine aus dem Bestand").

2. **Kopieren** an den richtigen Ort: `fach/jahrgangsstufe/thema/thema.html`
   (Ordner- und Dateinamen bitte **klein, ohne Umlaute, ohne Leerzeichen** –
   `verschluesselung` statt `Verschlüsselung`).

3. **Ausfüllen**: In den Vorlagen ist jede anzupassende Stelle mit `TODO:`
   markiert und kommentiert.

4. **Verlinken**: Die neue Seite auf der Fachseite (`fach/fach.html`) als
   Karte eintragen – sonst findet sie niemand. Ein neues Fach zusätzlich auf
   der Startseite (`index.html`) eintragen (Sidebar + Karte).

5. **Veröffentlichen**: Commit & Push auf `main` (siehe unten).

## Die eine Grundregel

Jede Seite darf gestalterisch eigene Wege gehen – ein Physik-Experiment
braucht anderes JavaScript als eine Englisch-Lektüreseite, ein Lernspiel ein
anderes Design als eine Grammatikübersicht. Aber:

> **Auf jeder Seite müssen Impressum und ein Zurück-/Übersichts-Element
> erreichbar sein.**

Dafür gibt es zwei Wege:

- **Standard-Layout** (Vorlagen `themenseite.html` / `fachseite.html`):
  Navbar mit „Übersicht“- und „Impressum“-Button ist schon drin. Fertig.
- **Freies Design**: eine Zeile vor `</body>` genügt –
  ```html
  <script defer src="https://edu-mrh.de/controls.js"></script>
  ```
  Das fügt dezente Buttons (← Zurück · 🎓 Startseite · Impressum) unten links
  ein, mit eigenem Styling, unabhängig vom Design der Seite. Hat die Seite
  bereits eigene Impressum-/Zurück-Links, erkennt das Skript das und fügt
  nichts doppelt hinzu. Anpassung über `data-back`, `data-home`,
  `data-impressum`, `data-position="right"` am Script-Tag.

## Gemeinsame Bausteine (embed)

Zentrale Assets liegen unter `https://edu-mrh.de/embed/` und werden per
absoluter URL eingebunden – so funktionieren Seiten unverändert lokal,
auf edu-mrh.de und später auf edu-bay.de:

| Baustein | Einbindung |
|---|---|
| Design-System (CSS) | `https://edu-mrh.de/embed/style.css` |
| Navigation/Interaktion (JS) | `https://edu-mrh.de/embed/script.js` |
| Favicon | `https://edu-mrh.de/embed/icons/favicon.png` |
| MathJax (Formeln) | `https://edu-mrh.de/embed/MathJax/es5/tex-mml-chtml.js` |
| KaTeX (Formeln, leichter) | `https://edu-mrh.de/embed/katex/…` |
| Java-Online-IDE | `https://edu-mrh.de/embed/include/online-ide-embedded.js` |
| SQL-IDE | `https://edu-mrh.de/embed/sql-IDE-embedded/includeIDE.js` |
| GeoGebra | `https://edu-mrh.de/embed/GeoGebra/deployggb.js` |

Die fertigen Einbinde-Zeilen stehen auskommentiert in
[templates/themenseite.html](templates/themenseite.html) – einfach den
benötigten Block einkommentieren.

**Datenschutz-Grundsatz (DSGVO):** Keine externen CDNs, keine Google Fonts,
keine Tracker. Bibliotheken werden über `/embed/` selbst gehostet; Schriften
liegen als `.woff2` im Repository (Beispiel: `nutrition/assets/fonts/`).
Nutzerdaten (z. B. Übungsstände) bleiben im Browser (`localStorage`) und
erreichen nie den Server.

## Lokale Vorschau

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

Einfach im Repo-Ordner starten und durchklicken. (Seiten funktionieren
größtenteils auch per Doppelklick auf die Datei, da CSS/JS absolut von
edu-mrh.de geladen werden – der lokale Server ist aber der verlässliche Weg.)

## Veröffentlichen

Jeder Push auf `main` wird durch
[.github/workflows/ftp-deploy.yml](.github/workflows/ftp-deploy.yml)
automatisch per FTPS auf den Server gespiegelt. Es gibt keinen weiteren
Schritt – **was auf `main` liegt, ist online.**

- **Mit Git:** `git add … && git commit && git push`
- **Ohne Git-Kenntnisse:** Auf GitHub im Browser → gewünschter Ordner →
  „Add file“ → „Upload files“. Auch das löst das Deployment aus.
- **Vorsichtig sein bei:** Löschen/Umbenennen von Dateien – bestehende Links
  (z. B. in Notizen von Schüler:innen) brechen dann.

## Mit KI arbeiten

Seiten lassen sich sehr gut mit KI-Unterstützung erstellen:

- Auf [contribute.html](https://edu-mrh.de/contribute.html) gibt es einen
  fertigen Prompt-Generator („KI-Generator“) zum Kopieren.
- Für Claude Code & Co. beschreibt [CLAUDE.md](CLAUDE.md) alle Konventionen
  des Repositories – ein Auftrag wie „Erstelle eine Themenseite zu X für
  Fach Y, Klasse Z“ reicht dann aus.
- Qualitätskontrolle bleibt bei der Lehrkraft: fachlich prüfen, lokal
  ansehen, dann erst pushen.

## Wohin die Reise geht

edu-mrh.de ist die Grundlagen-Plattform: fertige Beispiel-Curricula in
mehreren Fächern als Basis und Anschauungsmaterial. Die Weiterentwicklung
(edu-bay.de) führt die heute noch getrennten Teil-Repositories zusammen;
Lehrkräfte stellen sich dort eigene Curricula aus einzelnen Bausteinen für
ihre Subdomain zusammen. Alles, was hier nach den obigen Konventionen
entsteht, lässt sich dorthin unverändert übernehmen – **die Konventionen
einzuhalten ist also die beste Zukunftssicherung für eigene Inhalte.**
