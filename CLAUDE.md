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
- Seitenleisten-Links mit `#abschnitt` brauchen direkt nach `embed/script.js`
  die Zeile `<script defer src="/sidebar-anker.js"></script>` (in den Vorlagen
  enthalten). Grund: `embed/script.js` springt nur zu `.content-section`-
  Abschnitten (Tab-Modus) und schluckt alle anderen `#`-Klicks.
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
   MathJax, KaTeX, Java-Online-IDE, SQL-IDE, GeoGebra, Snap! – Einbinde-Zeilen
   stehen auskommentiert in `templates/themenseite.html`; Snap!-Beispiel in
   `informatik/11/algorithmik/snap-ide.html`). Schriften als lokale `.woff2`.
3. **Nutzerdaten bleiben im Browser** (`localStorage`), nie zum Server.
4. **Bestehende URLs nicht brechen**: Dateien nicht umbenennen/verschieben,
   ohne dass es der Auftrag verlangt.

## Online-IDE (Java-Projekte in Seiten)

- Eingebettet über `<div class="java-online" data-java-online="{ 'id': '…', … }">`
  mit `<script type="text/plain" title="Datei.java">` je Datei (Beispiel:
  `informatik/10/java/2-5-arrays.html`). Jede Projekt-`id` nur einmal
  vergeben: Der Bearbeitungsstand liegt unter dieser ID im Browser.
- Der Code ist **Java** mit Erweiterungen der Online-IDE: Hauptprogramm
  ohne `main`, Grafikklassen (`World`, `Circle`, `Rectangle`, `Line`,
  `Text`, `Sprite`, `Turtle` …), `Color`-Konstanten (auch deutsch, z. B.
  `Color.grau`), `Vector2`, `Random`, `LinkedList` usw. `print`/`println`
  sind als globale Funktionen nutzbar.
- **Referenz: `Online-IDE API-Documentation.txt` im Repo-Root.** Jede
  verwendete Klasse, jeden Konstruktor und jede Methode dort prüfen,
  nichts aus dem Gedächtnis annehmen. Alles andere muss gültiges Java
  sein (z. B. kein `(String) zahl`, sondern `"" + zahl`).
- Code und Arbeitsblatt müssen zusammenpassen: TODO-Nummern und
  Kommentare verweisen auf die Aufgabennummern des Blatts, Methodennamen
  und Code-Ausschnitte sind auf Blatt und in der IDE identisch.
- **Workspaces als Dateien** (Vorbild `informatik/12/rekursive-datenstrukturen/`):
  je Station `Online-IDE/<jg>-<kap>-<nr> <Name>.json` (Ausgangsstand) und
  `Online-IDE/LSG <jg>-<kap>-<nr> <Name>.json` (Lösung), Format wie der Export
  der IDE. In der Einbettung `'jsonFilename': '<jg>-<kap>-<nr> <Name>.json'`
  setzen, damit „Workspace in Datei speichern“ denselben Namen liefert. Wird
  Code in der Seite geändert, auch die JSON-Dateien anpassen.
- **Coach** (dynamische Hinweise aus Fehlerliste und Testergebnissen):
  Einbettung mit `'enableFileAccess': true, 'enableRunExitStatusAccess': true`,
  darunter `<div class="coach" data-coach="<IDE-id>"></div>` und
  `ide-coach.js` im Themenordner; Regeln je IDE-id in `REGELN`. Tests als
  JUnit-Klasse (`@Test`, `Assertions.…`, Datei `readOnly`).
- Eigenheiten der Online-IDE (nicht darauf bauen, ggf. im Lehrkräfte-Bereich
  erwähnen): `==` vergleicht Strings nach Inhalt; ein falscher Rückgabetyp
  beim Implementieren einer Interface-Methode (`int` statt `String`) und
  unerreichbarer Code werden nicht gemeldet; bei `a + b` wird `b` zuerst
  ausgewertet.

## Arbeitsblätter

- **Neues Format** (Vorbild Jahrgangsstufe 10 Java: `informatik/10/java/`,
  ebenso `informatik/11/graphen/`, `informatik/12/rekursive-datenstrukturen/`):
  Stationsseite `<nr>-<thema>.html` mit Phasen (Einstieg, Festhalten, Üben,
  Verändern, Selbst bauen, Ausblick, Lehrkräfte-Bereich) plus Arbeitsblatt in
  `arbeitsblaetter/` als `ab-<nr>-<thema>.tex/.pdf` und Lösung `…-lsg.pdf`.
  Wird ein Thema „nach dem neuen Format überarbeitet“, ist genau das gemeint.
- LaTeX-Quelle + PDF nebeneinander, gemeinsame `ab-vorlage.tex` je Themenordner
  (Lösungsschalter `\mitloesung`, Befehle `\lsg`, `\lsglinien`, `\lsgoder`;
  Übersetzen siehe Kopf der Vorlage, z. B. mit `xelatex`). Die Lösungsfassung
  ist eine Einzeiler-Datei `ab-<nr>-<thema>-lsg.tex` mit
  `\def\mitloesung{}\input{ab-<nr>-<thema>}`.
- **Immer höchstens 2 Seiten** pro Blatt, auch die Lösungsfassung. Nach dem
  Übersetzen die Seitenzahl beider PDFs prüfen. Lösungseinträge dürfen das
  Layout nicht verschieben (Platz im Blatt gleich groß reservieren).
- Kein Ausblick auf Folgethemen auf dem Blatt (der gehört auf die Website).
  Gedrängte Aufgaben/Grafiken sind ok.

## Didaktik bei Programmierthemen

- Methodennamen, Parameter und Rückgabetypen so wählen, dass sie in den
  Folgestationen weiter tragen (z. B. Datenstrukturen 12: `add(daten): boolean`,
  `poll()`/`peek()` liefern die Daten oder `null`, Knoten mit `getDaten()`,
  `getNachfolger()`, `setNachfolger(…)`, wie `java.util.Queue`/`LinkedList`,
  bis hin zu Liste und Kompositum). Vor dem Ändern die Materialien der
  Folgestationen ansehen.
- Logik → Code sichtbar machen: jeden Schritt als Bild und als genau eine
  Codezeile mit gleicher Nummer (①②③) auf Blatt, Website und in der IDE.
- Gibt es mehrere sinnvolle Implementierungen, kurz darauf hinweisen und als
  **mündlichen** Impuls stellen (warum könnte man es so machen?), ohne
  Schreibplatz auf dem Blatt; Hinweise zum Nachlesen gehören auf die Website.
- Website und Blatt bilden ein Tandem: Die Seite erklärt und stellt Werkzeuge
  bereit, ersetzt aber weder Blatt noch Unterricht. **Lösungen nie offen
  lesbar** auf die Seite: gestuft über `<div class="lw" data-loesungsweg="…">`
  mit `<template data-stufe="Tipp 1">…` und zuletzt
  `<template data-stufe="Lösung" data-halten>` (erscheint erst nach 1,5 s
  Gedrückthalten; `datenstrukturen.js`). Volle Lösungen für Lehrkräfte als
  LSG-PDF/-JSON im Lehrkräfte-Bereich.

## Sprache & Inhalt

- Seitensprache Deutsch (`lang="de"`); Englisch-Fachseiten englisch
  (`lang="en"`). Zielgruppe: Schüler:innen – direkt ansprechen („du“).
- Inhaltlich am bayerischen LehrplanPLUS (G9) orientieren; Jahrgangsstufe
  und Fach gehören in Titel/Hero.
- Titelmuster: `Thema | Fach – edu-mrh.de`.

## Prüfen

`python3 -m http.server 8000` im Repo-Root und die Seite im Browser
ansehen (Desktop- und Mobilbreite). Es gibt keine Tests und keinen Linter.
