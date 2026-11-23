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
- **KI-Prompt** auf `contribute.html#ai-template` (`<pre id="prompt-text">`, HTML-escaped)
  beschreibt Gerüst, Bausteine und alle `/embed/`-Werkzeuge für Leute ohne Repo
  (auch Vorlage für den fobizz-Assistenten, der nur verlinkt ist, kein iframe).
  Ändern sich Vorlagen, Einbinde-Zeilen oder Regeln, den Prompt mit anpassen.
- Stilistische Referenz sind die **Informatik- und Englisch-Seiten**
  (z. B. `informatik/informatik.html`, `englisch/12/uk/uk-and-writing.html`):
  gemeinsames Grundgerüst, darauf themenspezifisches Styling im `<style>`-
  Block der Seite. Abweichende Designs sind erlaubt.

## Unverhandelbare Regeln

1. **Jede Seite braucht erreichbares Impressum, Datenschutzerklärung + Zurück-/Übersichts-Element.**
   Ziele: `https://edu-mrh.de/impressum.html` und `https://edu-mrh.de/datenschutz.html`
   (bis 2026-10 `contribute.html#impressum`, leitet weiter).
   Standard-Layout: über die Navbar (in den Vorlagen enthalten). Freies
   Design: `<script defer src="https://edu-mrh.de/controls.js"></script>`
   vor `</body>`. **Ausnahme: Online-Checks/Tests** (`checks/check-*.html`) haben
   gar keinen Link, auch kein Impressum, damit niemand versehentlich die Seite
   verlässt (so von der Lehrkraft gewünscht); einziger Link ist das Abgabeformular.
2. **Keine externen CDNs, Google Fonts oder Tracker (DSGVO).** Bibliotheken
   über `https://edu-mrh.de/embed/…` (verfügbar: style.css, script.js,
   MathJax, KaTeX, Java-Online-IDE, SQL-IDE, GeoGebra, Snap!, Pyodide – Einbinde-
   Zeilen stehen auskommentiert in `templates/themenseite.html`; Snap!-Beispiel in
   `informatik/11/algorithmik/snap-ide.html`; Python-Zellen per Pyodide siehe
   `englisch/w-seminar-time/viable-data.js` + `py-worker.js`). Schriften als lokale `.woff2`.
   Bilder lokal speichern (mit Bildnachweis), nicht von Wikimedia o. Ä. verlinken.
   Fremde iframes (z. B. fobizz) nur per 2-Klick: `data-zwei-klick="URL"` statt
   `src` + `<script defer src="/zwei-klick.js"></script>`; neuer Anbieter →
   auch in der Datenschutzerklärung (`datenschutz.html`, Abschnitt je Dienst) ergänzen.
   Auch kein `fetch` zu fremden Diensten (Zeit-/Wetter-APIs …; Uhrzeit aus dem `Date`-Header
   des eigenen Servers). **GeoGebra** nur mit
   `applet.setHTML5Codebase('https://edu-mrh.de/embed/GeoGebra/HTML5/5.0/web3d/')` (sonst lädt
   `deployggb.js` die App von geogebra.org) und ohne `material_id`: Materialien als `.ggb` in den
   Themenordner, Laden per `filename` (Beispiel `mathe/12/1_1_Exponentialfunktion.html`).
   **Lizenzen**: Eigene Inhalte stehen unter CC BY-NC-SA 4.0 (`LICENSE.md`, `impressum.html#lizenz`,
   Fußzeile der Vorlagen mit Lizenzlink). Neue Bibliothek/Schrift → Eintrag in `impressum.html#lizenzen`; Beiträge von
   Kolleg:innen und fremdes Material (Bilder, Texte) nur mit Urheber/Quelle/Lizenz auf der jeweiligen Seite;
   keine Schulbuchseiten, -grafiken oder eng umformulierte Buchtexte veröffentlichen;
   Schriften (alle SIL OFL) mit `OFL.txt` im Schriftordner; Lizenztexte ohne eigenen Ablageort in
   `lizenzen/`. Die IDE-Workflows legen GPL-Text + `QUELLE.txt` bei und brechen per „DSGVO-Wächter“
   ab, wenn ein Build von CDNs/Trackern/den Original-Servern lädt; `deploy-snap.yml` entfernt
   Bibliotheken, die von sich aus fremde Server ansprechen (Karten, SciSnap, TuneScope, MQTT).
3. **Nutzerdaten bleiben im Browser** (`localStorage`), nie zum Server.
4. **Bestehende URLs nicht brechen**: Dateien nicht umbenennen/verschieben,
   ohne dass es der Auftrag verlangt.

## Geheimnisse (PINs, Startcodes, Schlüsseldateien)

- Liegen in einem Cloud-Sync-Ordner **außerhalb des Repos**, im Repo nur als
  ignorierte Verknüpfungen: `geheim/` (Repo-Root) mit `geheim/zugaenge.md`
  (PINs, Startcodes, Passwörter) und je Thema `material/` bzw. `Material_*`
  → gleicher Pfad unter `geheim/`. Einrichten/Aktualisieren je Gerät:
  `tools/geheim-verlinken.ps1` (Windows) bzw. `.sh` (macOS); `-Uebernehmen`
  verschiebt lokale `material/`-Ordner in den Sync-Ordner.
- Neue `material/`-Ordner direkt unter `geheim/<pfad>/material/` anlegen und
  das Skript ohne Argument erneut ausführen (sonst landen sie nicht im Sync).
- Wer einen PIN, Startcode o. Ä. festlegt, trägt ihn in `geheim/zugaenge.md`
  ein. **Remote-Sessions** haben den Ordner nicht: dann den Wert in der
  Schlussnachricht ausdrücklich nennen („in zugaenge.md eintragen“). Im Repo
  steht höchstens ein Hash.
- Nie `git clean -x`/`-X` ausführen (löscht durch die Verknüpfungen hindurch).

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
  ausgewertet. Grafik/Ausgabe: `println()` ohne Argument gibt „undefined“ aus
  (`println("")`); `Text.moveTo` setzt die linke obere Ecke (Kreise, Polygone:
  die Mitte); ein offenes `Polygon(false, …)` mit transparenter Füllung zeichnet
  keine Linie (Kurven aus `Line`-Stücken bauen); Zugriff auf ein `null`-Array
  meldet „Interner Fehler … null“. **Endlose Rekursion** wirft keinen `StackOverflowError`, sondern
  läuft weiter, bis der Tab abstürzt (~3 GB nach 30 s): Projekte mit Rekursions-Experimenten bekommen
  in den Coach-Regeln `stapelGrenze` (Wächter in `12/rekursive-datenstrukturen/ide-coach.js`, liest die
  Aufruftiefe aus internen IDE-Feldern und stoppt mit roter Meldung).

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
- **Antwortplatz** (Referenz-Makros: `informatik/10/java/arbeitsblaetter/ab-vorlage.tex`,
  bei anderen Vorlagen dorthin übernehmen):
  - Schreiblinien einheitlich **8 mm** Abstand, erste Linie eine volle
    Zeilenhöhe unter der Frage (`\linien{n}`), nie Linien direkt am Text.
  - **Karopapier sauber**: 5-mm-Raster nur aus ganzen Kästchen, mittig
    (`\kariert{n}` rundet auf ganze Kästchen ab, `\karobox{b}{h}` rundet);
    Beschriftung oben bündig daneben, nicht schwebend.
  - **Lückentexte**: Lücken lang genug für Handschrift, seit 2026-10 um
    **Faktor 1,5** verlängert (Fachbegriff mind. 5,25 cm, Standard 6,75 cm,
    Zahl/Zeichen 2,25 cm, längere Ausdrücke/Code `\restzeile` bis
    Zeilenende). Passt eine Lücke nicht mehr in die Zeile, neue Zeile oder
    `\lsgrest`/`\restzeile` statt die Lücke zu kürzen; Blatt bleibt bei 2 Seiten. Absätze und Kästen mit Lücken mit
    `\lueckentext` (Zeilenabstand 1,5, Flattersatz), damit über jeder Lücke
    Schreibraum ist und der Blocksatz nicht zerreißt. Code-Lücken im Listing
    `javaluecke` mit `(*\luecke[…]*)`, nie Unterstrich-Ketten.
  - Tabellenzellen zum Ausfüllen mit `\schreibzeile` (8 mm hoch); Java-Code
    schreiben im `\linienfeld{n}` (eine Linie je erwarteter Codezeile).
  - **Nur wo nötig**: kein Platz für Aufgaben, die in der IDE oder auf der
    Website erledigt werden; Skizzen/Diagramme → Karo, Text → Linien
    (Zahl der Linien = erwartete Antwortlänge), Kurzantworten → Lücke,
    Datentypen u. Ä. direkt in die Klassenkarte (eigene Spalte).
    Antwortplatz steht direkt bei der Aufgabe, nie durch Seitenumbruch
    getrennt (sonst `\newpage` vor die Aufgabe).
  - Prüfen: PDF rendern (`gs -sDEVICE=png16m -r75 …`) und ansehen; keine
    „Overfull \hbox“-Warnungen im Log.
  - Lösungsfassung: zu jedem Makro gibt es eine `\lsg…`-Variante, die genau
    denselben Platz belegt (`\lsg[Breite]{…}`, `\lsgrest{…}`, `\lsglinien{n}{…}`,
    `\lsgfeld{n}{Code}`, `\lsgkariert{n}{TikZ}`, `\lsgkarobox{b}{h}{TikZ}`,
    `\lsgtext{…}` für Tabellenzellen, `\lsgkarte`/`\lsgobjekt` für Klassen-
    und Objektkarten). Schrittnummern ①②③ mit `\nr{1}` (auch im Listing über
    `escapeinside`).
  - **Syntaxdiagramme**: Terminale rund, Nichtterminale **eckig** (Stil `nt`
    mit `sharp corners`, sonst erben Knoten auf einer `\draw[…,rounded corners]`-
    Linie die runden Ecken).
- **Rohmaterial der Lehrkraft** (`Material_*`, `material/`, Lösungen aus dem
  Unterricht) nie versionieren: steht in `.gitignore`, weil jeder Push alles
  Versionierte öffentlich deployt. Arbeitsnotizen ebenfalls nicht
  (`vorschlaege-*.md`).

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

## W-Seminar „Time“ (Englisch 12/13, `englisch/w-seminar-time/`)

Kursplan in Modulen (je Modul: Website-Seite + Arbeitsblatt `ws-w<n>-…` +
Präsentation; Folien liegen nicht im Repo). **Arbeitsblattnummer immer
vorher bei der Lehrkraft erfragen.** Seiten und Blätter englisch, Design
wie `w-seminar-time.html` (Tokens im `<style>`-Block, Fraunces/Inter lokal).
Auf `englisch/englisch.html` eigener Abschnitt `#w-seminar-time` ganz am Ende
(nach Klasse 13), je Modul eine Karte. Bis 2026-10 lag das Seminar unter
`englisch/12/w-seminar-time/`; dort liegen nur noch Weiterleitungen für alte
QR-Codes (nicht löschen).

| Modul | Inhalt | Material | Stand |
|---|---|---|---|
| M1 Orientierung | Seminarregeln, Bewertung, Backups; Dimensionen von Zeit | `w-seminar-time.html`, W1–W3 | fertig |
| M2 Forschungsfrage | Frage vs. These, Marker, Eingrenzung, 1–3 Optionen | `research-question.html`, W4 | fertig |
| M3 Recherche | 5 Leitfragen (refinery questions), Suchstrings, Orte, Lesen/Notieren, Quellencheck | `research-methods.html`, W5, Check 1 | fertig |
| M4 Viable data | Gütekriterien, Datentypen (Umfrage, Test, Experiment, Interview inkl. Experteninterview, Textcodierung, vorhandene Daten), theoretische Arbeiten ohne Teilnehmende (`data-design.html#theory`: Studien als Daten/Forschungssynthese, Neu-Rahmung vorhandener Werke; Beispiel „Vergeht die Zeit mit dem Alter schneller?“, `data/review-age.csv`), Studiendesign, Pilot + Verfeinern (α, Itemanalyse, κ, Power, Redeanteil im Interview, Suchregel/Extraktionsbogen, Experten-Check), Auswerten (d, Permutationstest, r, Nullbefund, Studien kombinieren, Themen in Interviews); Experten als Quelle auch in M3 (`research-methods.html#expert`) | `data-design.html`, `data-refine.html`, `data-evaluate.html`, W6 (Design your study), W7 (Refine and evaluate), Folien `material/PowerPoint/W-Seminar-Time-Session4.pptx` (29 Folien, Stand 2026-11-12 mit Interview, Studien als Daten, Frageversionen; Website-Änderungen dort nachziehen), Check 2 | fertig |
| M5 Statistik | Auswertung mit Python (Grundlagen-Skripte); erste Python-Zellen schon in M4 | geplant (12/2) | offen |
| M6 Quellen einbauen | Zitieren, Paraphrasieren, MLA, Quellen in die eigene Argumentation integrieren | geplant, Check 3 | offen |
| M7 Werkzeuge | LaTeX/Overleaf, Git, Kanban | geplant, wenn Ideen stehen | offen |

- **Fragepfad über die Blätter**: Die Frage entwickelt sich sichtbar – Funke (W2/W3, Version 0) →
  Forschungsfrage + Arbeitsthese (W4, Version 1 = „My options“) → W5 Version 2 → W6 Version 3
  (prüfbare Behauptung/Hypothese) → W7 Version 4 (nach dem Pilot, Entwurf Thesis Statement) → These
  in der Arbeit. Je Blatt eine Box „My question – version n“ mit „Changed since Wx – and why“;
  Makros `\fragepfad{k}` (ganzer Pfad, W4) und `\fragepfadklein{k}` (in Boxtiteln) in `ab-vorlage.tex`.
  Website-Gegenstück: `research-question.html#pair` („Your question grows“). Zusammenfassung als
  Leitfaden ohne Nummer: `arbeitsblaetter/guide-question-to-thesis.tex/.pdf` („From Topic to Thesis“,
  Handbuch-Layout nach Vorlage der Lehrkraft – nah an deren Text bleiben: Schritte 1–4 + Key Rules,
  sechs Marker mit FINER als zweiter Sicht, Beispiele über Facetten, Beispiel in sechs Versionen;
  verlinkt in M2 und auf der Übersicht). Lösungsbeispiel durchgehend
  das Musik-Warte-Experiment. Neue Blätter (M5–M7) setzen den Pfad fort.
- **Python-Zellen**: jede Zelle hat vor dem Code eine `<div class="py-idea">` (Idee, Schritte in
  Worten, „Look for“) – auch bei neuen Zellen.
- Fristen: Thema/Forschungsfrage bis Ende 12/1; Präsentation 12/2; Abgabe
  2. Schultag im November (13); Prüfungsgespräch 13/1. Gewichtung
  Seminararbeit : Prüfungsgespräch = 2 : 1 (KM-Info ab Abiturjahrgang
  2025/2027), Leistungen werden einzeln im Zeugnis ausgewiesen.
- **Viable-data-Sequenz (M4)**: drei Seiten mit gemeinsamem `viable-data.css`/`viable-data.js`
  (Datentyp-Auswahl `data-track`, gemerkt in `localStorage 'wsDataTrack'`; Quiz, Diagramme)
  plus je Seite `data-*.js`. Übungsdaten (erfunden, so konstruiert, dass jede Aufgabe ihr
  Problem zeigt) in `data/*.csv`; die Zahlen in den Seitentexten („Compare with our
  findings“, Musterformulierungen) passen genau zu diesen Dateien – Daten nur zusammen mit
  den Texten ändern. **Python-Zellen**: `<div class="py" data-py="<id>" data-files="data/x.csv">
  <script type="text/plain">…</script></div>`, laufen in `py-worker.js` (Pyodide, nur
  Standardbibliothek + Modul `edu` für Diagramme: bars, hist, scatter, boxplot, line, table).
  Pyodide liegt selbst gehostet unter `/embed/pyodide/` (Workflow `deploy-pyodide.yml`);
  lokal testen: `data-pyodide` am Script-Tag auf eine lokale Kopie zeigen lassen.
- Laufend: Snapshots des Schreibstands etwa alle 4 Wochen, KI-Log,
  3-2-1-Backup; geplante betreute Schreibstunde als Sprachreferenz.
- **Leistungsnachweis 12/1 (Planung):** drei Online-Checks nach M3 (Check 1), M4 (Check 2), M6 (Check 3),
  die besten zwei zählen als „Test“. Im Unterricht am eigenen Gerät, die
  Lehrkraft sieht die Bildschirme. Vor Einführung mit Oberstufenkoordination
  abstimmen und vorab ankündigen.
- **Online-Checks** (alles in `checks/`, generisch für jedes Thema; der Ordner ist auf
  dem Server zusätzlich per `.htaccess` geschützt): `check-<n>-<thema>.html` ist nur eine
  Hülle (`<div id="check" data-title="Check <n>" data-abgabe="…">`, Sprache über `<html lang>`)
  **ohne jeden Link, auch ohne Impressum** (Ausnahme von Regel 1); `check-engine.js` +
  `check.css` für Schüler:innen. Abgabe über Microsoft Forms wie bei Englisch 13 (s. u.,
  gleiches Formular, `data-abgabe` aus der QotT-Hülle übernehmen).
  Fragen im Klartext nur in `material/check-<n>-*.json` (nicht versioniert,
  `.gitignore` – **nie pushen, das Repo ist öffentlich, auch die Historie**; Format im
  Kopf von `build_check.py`). `python3 checks/build_check.py material/check-<n>-*.json`
  erzeugt `checks/check-<n>-*.js` (alles AES-256-GCM-verschlüsselt, auch Titel, Zeit,
  Aufgabenzahl und Punkte; Schlüssel per PBKDF2 aus dem Startcode; zufällige IDs,
  gemischte Reihenfolge, auf 8 KiB aufgefüllt; **keine Lösungen**) sowie
  `material/…-key.json` (Schlüsseldatei mit Fragen, Lösungen, Notenschlüssel) und
  `…-key.md`. Jeder Build hat eine eigene ID: Ergebnisse passen nur zur Schlüsseldatei
  desselben Builds, also nie nach der Durchführung neu bauen. Startcode `"auto"` =
  zufälliger 12-stelliger Code, nur im Unterricht nennen; nach einem Leck neuen Code
  wählen (alte Builds stehen in der Historie). Bewertung erst nach der Stunde:
  Schüler:innen speichern eine **Ergebnis-PDF** (Microsoft Forms nimmt kein `.json`): eine
  lesbare Seite plus die Daten, nur ASCII, zweimal – als Zeile `%EDUJSON:{…}` direkt nach dem
  Kopf (liest Auswertung und Power-Automate-Flow) und als Anhang `result.json`
  (`resultPdf()` in `check-engine.js`; Dateiname `<kurs>_<name>_<check-id>.pdf`). Ältere
  `.json`-Ergebnisdateien liest die Auswertung weiter. Die Lehrkraft lädt Schlüssel- und
  Ergebnisdateien in **`/checks/auswertung/auswertung.html`** (Repo-Root, zentral für alle
  Checks und Fächer, Ordner auf dem Server per eigener `.htaccess` geschützt; unverlinkt,
  ohne Links, liest nur lokal): Tabelle, CSV und je Person ein 2-seitiger Bericht (Druck → PDF)
  mit Notenpunkten, Notenschlüssel und allen Aufgaben wie gesehen, eigene Antwort,
  Lösung und Punkte (Verteilung auf Seiten mit 8 % Reserve, weil der Druck Schrift breiter
  setzt als der Bildschirm; passt ein Blatt im Druck trotzdem nicht, wächst es im Druck auf die
  nächste Seite und bricht zwischen Aufgaben um, nie über den Rand. Seiten je Person auf gerade
  Zahl aufgefüllt, mit Häkchen „2 Seiten pro Blatt“ auf ein Vielfaches von 4 – dann im
  Druckdialog „Seiten pro Blatt: 2“). Bewertung Mehrfachauswahl: richtige Kreuze ÷ Zahl der richtigen Optionen,
  Abzug nur für Kreuze über diese Zahl hinaus (je Kreuz mindestens 1 Anteil, bei mehr als
  halb so vielen richtigen wie möglichen Optionen n ÷ (Optionen − n), damit „alles
  ankreuzen“ immer 0 ergibt; `build_check.py` warnt bei solchen Aufgaben). Check- und Auswertungsseite nirgends verlinken.
- **Textblöcke** (`"block": true` im Fragen-JSON): ein Lesetext mit Zeilennummern und
  mehrere Aufgaben dazu; je Version ein Paralleltext, alle Versionen mit gleicher
  Aufgabenfolge (Typ, Punkte). Auf breiten Bildschirmen steht der Text mitlaufend neben
  den Aufgaben; im Bericht steht er vor seinen Aufgaben (dann bei Bedarf 4 statt 2 Seiten).
- **Weitere Checks mit derselben Technik**: Englisch 13 Questions on the Text
  (`englisch/13/questions-on-the-text/checks/`, Fragen in `…/material/`). Dort liegen
  nur Hülle, gebautes `.js` und **Kopien** von `check-engine.js`/`check.css` (identisch
  zu den W-Seminar-Dateien halten). Läuft im Safe Exam Browser; wie alle Checks **ohne
  Link**, auch nicht zum Impressum (auch nicht nach der Abgabe). Stand 2026-10: 13 Aufgaben,
  25 Minuten (frühere Aufgabe 14 `rev-*` entfernt, zu uneindeutig). Abgabe über
  Microsoft Forms (alle Checks, gleiches Formular): `data-abgabe` am `#check` = vorausgefüllter Forms-Link mit den
  Platzhaltern `NAME_X`, `RECEIPT_X`, `PRUEFUNG_X`; der Ergebnisbildschirm zeigt dann
  „1. Datei speichern, 2. Formular öffnen“ (Formular erst nach dem Speichern aktiv).
  Die Ergebnisdatei enthält dafür zusätzlich `pruefungsId` und `receiptId` (für den
  Power-Automate-Flow); Punkte stehen nie darin, die liefert nur die Auswertungsseite.
  **Startseite** (alle Checks): Name, Kurs/Klasse (Freitext; mit `data-kurse="10C,3e1"`
  Auswahlliste) und Zeitzuschlag (Nachteilsausgleich, Auswahl `data-extra`, Standard 10/15/20/25 %);
  die Zeit läuft dann `minutes × (1 + Zuschlag)`. Die Ergebnisdatei (`rv: 2`) enthält `kurs`,
  `zeitzuschlag`, `zeitMin`, `zeitErlaubtMin`, `dauerMin`, `dauer`, `zeitAbgelaufen`; die
  Quittung deckt ab `rv 2` auch Kurs, Zuschlag und Startzeit ab (gleiche Formel in
  `auswertung.js`, ältere Dateien ohne `rv` bleiben gültig). CSV der Auswertung und Button
  „Für Excel kopieren“ (Tabulator, Zwischenablage) liefern dieselbe Tabelle (`grid()`): Spalten
  A–L fest (Kurs, Name, Quittung, Punkte, max, Prozent, NP, Zuschlag, Dauer, erlaubt, abgegeben,
  Quittung ok – die Excel-Mappe der Lehrkraft liest C, D, E, G, L), dann Hinweis, Check-ID,
  Build, begonnen, Dauer m:ss, Zeit abgelaufen, beantwortet, Datei, Versionen (Liste) – also
  A–U für jede Prüfung gleich –, ab V die Punkte je Aufgabe `A1…An`. Textfelder als `="…"`, damit Excel „3e1“ oder eine
  Ziffern-Quittung nicht in Zahlen umwandelt; CSV mit `sep=;` und Anführungszeichen.
  Das Build-Skript gibt es nur einmal im W-Seminar-Ordner (Auswertung zentral, s. o.): `python englisch/w-seminar-time/checks/build_check.py
  <thema>/material/check-<n>-*.json` schreibt das `.js` nach `<thema>/checks/`.

## Sprache & Inhalt

- Seitensprache Deutsch (`lang="de"`); Englisch-Fachseiten englisch
  (`lang="en"`). Zielgruppe: Schüler:innen – direkt ansprechen („du“).
- Inhaltlich am bayerischen LehrplanPLUS (G9) orientieren; Jahrgangsstufe
  und Fach gehören in Titel/Hero.
- Titelmuster: `Thema | Fach – edu-mrh.de`.

## Prüfen

`python3 -m http.server 8000` im Repo-Root und die Seite im Browser
ansehen (Desktop- und Mobilbreite). Es gibt keine Tests und keinen Linter.

## Inhaltsindex

Wo was liegt (Stand 2026-10). `→ AB` = LaTeX-Arbeitsblätter in `arbeitsblaetter/`.

**Gerüst**: `index.html` (Startseite), `checks/auswertung/` (Auswertung aller Online-Checks), `style.css`, `script.js`, `controls.js`,
`sidebar-anker.js`, `mobileMenu.js`, `baseScript.js`, `templates/`,
`tools/` (Geheim-Ordner verknüpfen), `geheim/` (nur lokal, s. o.),
`contribute.html`, `impressum.html`, `datenschutz.html`, `LICENSE.md`, `robots.txt` (sperrt nur KI-Trainings-Crawler,
maschinenlesbarer TDM-Vorbehalt, dazu `.well-known/tdmrep.json`), `Online-IDE API-Documentation.txt`, `.github/workflows/`
(FTPS-Deploy aller versionierten Dateien inkl. `.md`, Online-IDE, SQL-IDE, Snap!, Pyodide;
`deploy-embed-basis.yml` kopiert Root-`style.css`/`script.js` nach `/embed/`, die Quelle des
gemeinsamen Designs ist also die Root-Datei).

**Informatik** (`informatik/informatik.html`)
- 9: `9/online-ide-intro.html`
- 10 Datenbanken: `10/datenbanken/` (redundanzen_datenmodellierung, join,
  mehrere_tabellen, uebung)
- 10 Java/OOP (neues Format, → AB `ab-0` bis `ab-2-7`): `10/java/java.html`
  (Übersicht) mit Stationen 2.0 Wiederholung OOP, 2.0.1 Kontrollstrukturen,
  2.0.2 Vererbung, 2.1 Referenzen, 2.2 Typumwandlung, 2.3 Polymorphie,
  2.4 Zugriffsrechte, 2.5 Arrays, 2.6 Suchen, 2.7 Sortieren (Bubblesort);
  `ab-0-grundwissen` = Grundwissen 6–9; Lösungen `ab-…-lsg.pdf`, verlinkt im
  Lehrkräfte-Bereich von `java.html`. `Material_Java/` = Rohmaterial der
  Lehrkraft (nur lokal, `.gitignore`).
- 11 Algorithmik mit Snap!: `11/algorithmik/` (Stationen 0–7, HTML-Arbeitsblätter
  in `arbeitsblaetter/*.html`, `snap-ide.html`; Snap!-Vorlagen aus `projekte/erzeuge_projekte.py`;
  Station 6 Listen `6-listen.html` mit Listen-Labor/Durchlauf-Tafel in `listen.js`; Station 7 Projekt
  liegt weiter in `6-projekt.html`/`ab-6-projekt.html`/`6-*-start.xml`, Dateien nicht umbenennen)
- 11 Graphen (neues Format, → AB): `11/graphen/` (3.1 Grundbegriffe,
  3.2 Umsetzung, 3.3 Breitensuche, 3.4 Dijkstra; Graph-Abenteuer `haenselundgretel/`);
  Werkzeuge in `graphen.js` (u. a. Dijkstra-Vorführung/Trainer `data-dj`, Lösungsweg)
- 11 Codierung (neues Format, → AB): `11/codierung/codierung.html` (Übersicht) mit
  4.1 Zahlensysteme, 4.2 Bilder codieren, 4.3 Daten codieren (Morse, EAN-13, Prüfziffer,
  optional Zaubertrick `Online-IDE/11-4-3 Zaubertrick.json`); Trainer `zahlensysteme.html`;
  Werkzeuge in `codierung.js`; `material/` Rohmaterial, nur lokal
- 11 Verschlüsselung (neues Format, → AB außer 5.3): `11/verschluesselung/verschluesselung.html`
  mit 5.1 Grundlagen, 5.2 Symmetrisch (Projekt `11-5-1 Verschluesselung` + Coach, auch in 5.1
  eingebettet, gleiche ID), 5.3 Asymmetrisch/RSA (Arbeitsauftrag ohne Blatt), 5.4 Digitale
  Signatur, 5.5 Sicherheit (Projekt `11-5-5 BruteForce` + Coach); Werkzeuge in
  `verschluesselung.js`, Coach-Regeln in `ide-coach.js`; RSA-Labor `rsa.html` (älter: rsa2,
  rsa-old); `material/` Rohmaterial, nur lokal. IDE-Quellen für Seite und JSON stammen aus
  einem Generator: nach Codeänderungen Seite und beide JSON-Dateien anpassen
- 11 sonst: `11/ki/perzeptron.html`, `11/kommunikation_in_netzwerken/` (netzwerke, filius, Übungen)
- 12 Rekursive Datenstrukturen (neues Format, → AB): `12/rekursive-datenstrukturen/`
  (1.1 Queue, 1.2 Interfaces, 1.3 Listen, 1.4 Kompositum, Zusatzstation 1.5 Rekursive Algorithmen
  `1-5-algorithmen.html`: countdown, Endlos-Fassungen, ggT, quersumme, umrechnen, umdrehen, fib,
  Tresor-Kette, Fraktalbaum; Aufruf-Labor `algorithmen.js`; Blatt 1.5 nutzt den Antwortplatz-Block
  der `ab-vorlage.tex` über `\def\antwortplatzacht{}`, 1.1–1.4 bleiben beim alten; `material/` Rohmaterial, nur lokal);
  älter: `12/rekursion-queue-listen/`
- 12 Binärbäume (neues Format, → AB, Selbstlernmodul 4–6 Std., Kapitel 2): `12/binaerbaeume/binaerbaeume.html`
  (Übersicht, Abzeichen-Wand) mit 2.1 Bäume (Begriffe, Suchen/Einfügen von Hand), 2.2 Kompositum (`einfuegen`
  mit Rückgabe-Muster, `suchen` liefert Daten oder null; Projekt `12-2-2 Spielerverzeichnis`), 2.3 Traversierung
  (Pre-/In-/Postorder als String-Rückgabe, `anzahl`, Backup-Experiment; `12-2-3 Traversierung`), 2.4 Höhe und
  Effizienz (`hoehe` mit Ebenen, leerer Baum 0; Bot-Welle, `ausgewogenEinfuegen`; `12-2-4 Bot-Alarm`).
  Fortlaufendes Beispiel: Spielerverzeichnis des erfundenen Spiels „Sternenstaub“, elf Namen Mika Emil Tara Bo Ines
  Pia Zoe Dana Kai Ruby Vik (Höhe 4) auf allen Seiten, Blättern und in allen Projekten gleich. Spiele/Werkzeuge in
  `baeume.js` (Namen raten, Safari, Such-Sprint, Baumschule, Aufruf-Verfolger, Umrundung, Rennen, Backup-Labor,
  Architekt, Wachstum, Abzeichen in `localStorage 'bbAbzeichen'`), Stil `baeume.css` auf
  `../rekursive-datenstrukturen/datenstrukturen.css` (Lösungsweg aus `datenstrukturen.js`), Coach `ide-coach.js`
  (Regeln für 2.2–2.5, meldet `coach-gruen` für Abzeichen). Blätter mit eigener `ab-vorlage.tex` (Baum-Stile `baum`,
  `bk`, `\verzeichnisbaum`). **IDE-Code nur im Generator ändern:** `material/generator/gen_ide.py` (nur lokal,
  im Repo-Root aufrufen) schreibt JSON und LSG-JSON und die Blöcke zwischen `<!-- IDE-START p22..p25 -->`.
  Alte Seiten `binbaum.html`/`index.html` leiten weiter
- 12 Tiefensuche (2.5, Escape Room, kurzes Logbuch-Blatt `ab-2-5-tiefensuche` mit der Vorlage aus `../binaerbaeume/`):
  `12/tiefensuche/tiefensuche.html` „Die Tiefen von Sternenstaub“, 7 Räume in `escape.js`/`escape.css` (Regel und
  Backtracking, Aufrufstapel, besucht/Baum = Preorder, Adjazenzmatrix, Code-Schloss ①–⑥, Tiefen- vs. Breitensuche,
  Finale in Java mit Graph-Klasse aus Klasse 11, Projekt `12-2-5 Tiefensuche`). Stand in `localStorage 'tsEscape'`,
  `?offen` öffnet alle Räume. Lösungswörter nur als Zeichencodes im Code, nie im Klartext auf die Seite; Höhlen im
  Finale umnummeriert, damit die Buchstaben nach Nummer das Wort nicht verraten. Alte `index.html` und
  `Protocol_DFS_MicroSteps.html` leiten weiter
- 12 sonst: `12/nebenlaeufigkeit/`
- 13 Formale Sprachen (neues Format, → AB): `13/formale-sprachen/`
  (1.1 Syntax und Semantik, 1.2 Formale Sprachen, 1.3 Syntaxdiagramme, 1.4 EBNF,
  1.5 Endliche Automaten mit Java-Projekt `Online-IDE/13-1-5 Automat.json` + Coach (Übergangstabelle),
  1.6 Automaten programmieren: Automat als Code, abstrakte Oberklasse `DEA` mit `pruefe`, Unterklassen
  mit `switch`, Projekt `Online-IDE/13-1-6 Automaten programmieren.json` + Coach, Vergleich mit 1.5;
  Übung zur 1. Schulaufgabe `uebung-schulaufgabe-1.html` mit eigenen Kontexten, Projekt `13-1-U Parkhaus`;
  die Schulaufgabe selbst liegt nur in `13/material/`, ihre Kontexte nie auf die Website);
  Werkzeuge: `formale-sprachen.js` (1.1/1.2, Lösungsweg), `grammatik.js` (EBNF-Parser,
  Syntaxdiagramme, Gleisnetz-Fahrt, Baukasten, Werkstatt), `automaten.js` (Simulator,
  Automaten-Baukasten); `13/material/` Rohmaterial, nur lokal
- 13 Funktionsweise eines Rechners (neues Format, → AB, Lernbereich 2): `13/rechner/rechner.html` (Übersicht)
  mit 2.1 Von-Neumann-Architektur (Zuordnungs-Quiz, Bus-Spiel, Speicherhierarchie), 2.2 Registermaschine
  (Register, Befehlszyklus ①②③, Rollenspiel), 2.3 Rechnen in Assembler (Zuweisungen), 2.4 Verzweigungen,
  2.5 Schleifen, 2.6 Programme analysieren; freier `simulator.html`. Simulator `registermaschine.js`
  (`<div class="rm" data-rm="id" data-speicher="100:7" data-tests="100=7 -> 101=14">`, Doku im Kopf; Befehle
  LOAD/LOADI/STORE/ADD(I)/SUB(I)/MUL(I)/DIV(I)/MOD(I)/CMP(I)/JMP/JEQ/JNE/JGT/JGE/JLT/JLE/HOLD, 16 Bit, SR mit N/Z/O;
  Beispielliste nur mit auf den Seiten vorgegebenen Programmen, keine Lösungen), Bausteine in `rechner.js`
  (Quiz, Bus-Spiel, Sortieren, Lösungsweg, Assembler-Färbung `pre.asm[data-adr]`); Blätter mit eigener
  `ab-vorlage.tex` (Listing `asm` mit Adressen als Zeilennummern, Struktogramme `\sgwenn`/`\sgschleife`).
  Assembler-Code auf Blatt und Seite identisch halten. Präsentation zur Sequenz (nur lokal):
  `13/rechner/material/Funktionsweise-eines-Rechners.pptx`, erzeugt per python-pptx aus
  `material/praesentation/folien.py` (Beispiele wie auf den Blättern; bei Änderungen nachziehen)
- 13 Exkurs „Vom Transistor zum Quantencomputer“ (interaktiv, **ohne Arbeitsblätter**, über den Lehrplan
  hinaus; verlinkt in `rechner.html`, 2.6-Ausblick, `informatik.html`): `13/hardware/hardware.html` (Übersicht,
  Turm der Ebenen) mit E.1 Transistor (Schalter-Labor, Dotierung, MOSFET, Chipfertigung, Moore), E.2 CMOS-Gatter
  (Inverter/NAND/NOR, Netze kombinieren, Schaltzeichen DIN/IEC ↔ US), E.3 Addierer (Werkstatt-Aufgaben HA, VA,
  4 Bit, MUX, Vergleicher, Mehrheit, nur NAND; Übertragswelle), E.4 ALU (Zweierkomplement, ALU-Labor mit
  Flags N/Z/C/O passend zur Registermaschine, Addier-Subtrahier-Werk, RS-Flipflop/Register, ADD 101 sortieren),
  E.5 CPU/GPU/TPU (Rennen, systolisches Array), E.6 Qubit (Zeiger mit reellen Amplituden, Weg eines
  Quantenprogramms, DiVincenzo, Plattformen), E.7 Quanten programmieren (Werkbank, Bell, Deutsch-Orakel, Grover,
  Qiskit-Code), E.8 Bauarten (Gatter/adiabatisch/Annealer, adiabatisches Labor mit echter Zeitentwicklung),
  freie `werkstatt.html`. Skripte: `logik.js` (Symbole, Werkstatt mit Aufgaben in `AUFGABEN`, Übertragswelle),
  `hardware.js` (E.1–E.5), `quanten.js` (E.6–E.8); Stil `hardware.css` auf `../rechner/rechner.css`, Quiz und
  Lösungsweg aus `../rechner/rechner.js`. Schaltzeichen-Norm in `localStorage 'hwNorm'`

- 13 Künstliche Intelligenz (neues Format, → AB, **eine Sequenz für gA (LB 4, 18 Std.) und eA (LB 2, 34 Std.)**):
  `13/ki/ki.html` (Übersicht mit Niveau-Schalter, `localStorage 'kiNiveau'`, Links `ki.html?niveau=ga|ea`; in
  `informatik.html` eigener Block). Kern 1–10 für beide: 1 Lernarten („Sei die KI“), 2 Merkmalsraum/k-NN,
  3 k-Means (Java 3D `Online-IDE/13-KI-3 k-Means.json` + Coach), 4 Perzeptron (Java 3D, Ebene), 5 Schichten
  (Zaun-Baukasten, Java 3D „Raum abstecken“), 6 Trainieren (Train/Test, Wackel-Experiment Stufe vs. Sigmoid),
  7 Neuronales Netz (Forward/Kosten/Abstieg/Backprop, Python-Zellen), 8 Experimente (Netz-Spielplatz, Ziffern),
  9 CNN/Transformer, 10 Ethik (Positionslinie, Fallkarten, KI-Verordnung, Stellungnahme). Nur eA: W1–W3
  wissensbasierte Systeme (eigener Prolog-Interpreter `wissen.js` mit Ableitungsprotokoll), P Projekt. eA-Kästen
  `.ea-box`, `.nur-ea`/`.nur-ga`. Bausteine: `ki.js` (Basis, `KI.Punktwelt`, Quiz, Vorhersage, Niveau), `lernarten.js`,
  `cluster.js`, `perzeptron.js`, `netz.js` (`KI.Netz`, Spielplatz), `architekturen.js`, `ethik.js`, `wissen.js`,
  `python.js` + `py-worker.js` (Pyodide wie W-Seminar, Modul `ki` für Diagramme), `ide-coach.js`; Notebooks in
  `notebooks/`, Anleitung `python-einrichten.html`. **Alles generiert aus `13/material/ki/generator/`** (nur lokal):
  `gen_daten.py` (Pinguine CC0, UCI-Ziffern CC BY 4.0, erfundene Sätze → `data/*.csv`, `ki-daten.js`), `gen_ide.py`
  (Java-Quellen → JSON + IDE-Block zwischen `<!-- IDE-START x -->`), `gen_notebooks.py`, `gen_projekt.py`.
  Zahlen in Seiten, Blättern, IDE und Folien hängen an diesen Daten (Liste in `13/material/ki/planung-ki-sequenz.md`);
  Code nur im Generator ändern. Folien D1–D4 (pptxgenjs) in `13/material/ki/praesentation/folien.js`

**Makerspace** (`makerspace/makerspace.html`, Wahlkurs Unterstufe, Stationen je 3 Wochen;
nur Robotik online): `makerspace/robotik/` LEGO SPIKE Prime – `robotik.html` (Team,
Lernpfad, Akku, Abzeichen, Spickzettel, Lehrkräfte-Werkzeuge mit PIN – Klartext in
`geheim/zugaenge.md`, im Repo nur `pinHash`), Starter
`starter-1-hallo-hub`, `starter-2-fahrschule`, `starter-3-sensoren`, Maker `maker-tresor`,
`maker-roboter-show`, `maker-linienfolger`, `innovator`; Logik `robotik.js` (Markup-Doku im
Kopf, Lösungen als Hash in `data-loesung`, Hash-Werkzeug im Lehrkräfte-Bereich), `robotik.css`

**Englisch** (`englisch/englisch.html`): 5 `wordcraft`; 12 `uk/`
(uk-and-writing, north-south-divide), `media/narrative_lens`,
`immigration-social-structures-identity/`, `global issues/`,
13 `questions-on-the-text/` (→ AB, eigene Vorlage; verschlüsselter Online-Check
`checks/check-1-questions-on-the-text.html`, unverlinkt), 13 `us-midterms/` (Selbstlernseite
US-System + Midterms 2026, Stand der Zahlen 9.11.2026 in `us-midterms.js`: `SEATS`, `HISTORY`, `QSEATS`;
Spiele-Station `#play`: Branch Blitz, Who's who, Nachfolge, Bill Quest, Rollenspiel Gridlock), 13 `ireland/` (Selbstlernsequenz ca. 90 min, ohne Arbeitsblatt: Geschichte Irlands in „Moments“ (Kap. 1–6), Ursachenketten „Trace it back“, Identitäten (6 Personas), Schreibwerkstatt Speech/Article mit „assess“, historische oder moderne Stimme; Bilder nur als Links auf Wikipedia (Stand 11/2026 geprüft); Logik `ireland.js`, Speicher `localStorage 'irl13:'`); W-Seminar „Time“ (12/13) in
`englisch/w-seminar-time/` (Kursplan siehe eigener Abschnitt: `w-seminar-time.html`,
`research-question.html`, `research-methods.html`, Viable data `data-design.html`,
`data-refine.html`, `data-evaluate.html` (Python im Browser, Daten in `data/`),
`checks/check-1-research-methods.html` (verschlüsselt), Auswertung zentral in
`/checks/auswertung/`; → AB `ws-w1` bis `ws-w7`, eigene Vorlage; Modulübersicht ganz unten
auf `w-seminar-time.html#materials`)

**Weitere Fächer**: `mathe/` (12: Exponential-/ln-Funktion, Umkehrfunktion),
`physik/` (9 Energie-Trainer `9/energie/` (Rahmenseite `energie.html` + `energie-trainer.html`), 10 Berlinfahrt-Lernpfad, 11 Federpendel + Protokoll, 11 Spezielle Relativitätstheorie (siehe unten), 11 Gravitations-Trainer `11/gravitation/` (Rahmenseite `gravitation.html` + `gravitation-trainer.html`), 12 Lorentzkraft; beide Trainer sind von Peter Sobek, als Einzeldateien übernommen – Urheberangabe in Kopf, Fußzeile und PDF-Zusammenfassung erhalten; Veröffentlichung mit seiner Genehmigung (Stand 2026-11), Vermerk in den Fußzeilen),
`franzoesisch/` (8 Québec), `Latein/` (nur Fachseite, im Aufbau), `psychologie/` (Grawe),
`Stadtrallye/` (Triest), `lernen-lernen/` (Modulreihe „Fit für die Qualifikationsphase“: `lerntest/index.html` = Lerntest Modul I, `methodenkoffer/methodenkoffer.html` = Methodenkoffer Modul III; nur über QR-Codes im Schülerheft erreichbar, URLs nicht ändern; Schrift lokal in `lernen-lernen/fonts/`).

**Physik 11 Spezielle Relativitätstheorie** (neues Format, → AB, Ph11 3.2, EVA, ca. 10 Std.):
`physik/11/relativitaet/relativitaet.html` (Übersicht) mit 1 Bezugssysteme, 2 Licht (Michelson-Morley, Postulate),
3 Gleichzeitigkeit, 4 Zeitdilatation (Lichtuhr), 5 Längenkontraktion (Myonen), 6 Alltag (GPS), 7 Grenzen
(„Deutsche Physik“), `produkt.html` (Erklärkarte), `quanten.html` (Zusatz). Feste Bezugsrahmen, nicht ändern:
Bea = System S = blau, Zoe = System S′ = orange; Plan-Karte (zwei Grundregeln, Schritte ①②③, γ-Dreieck,
`data-plan="n"` wächst von Station 1 bis 5); Annahmen-Tafel A1–A4 (`data-annahmen`); Eigenzeit über „beide
Ereignisse am selben Ort“, Eigenlänge über „ruht im System“. Vorhersage vor Beobachtung (`data-vorhersage` sperrt
`data-nach`, `?offen` öffnet alles), ⭐ = Vertiefung, nie Voraussetzung. Bausteine `relativitaet.js`, Simulationen
`simulationen.js` (`data-sim`: zug, rennen, aether, lampe, lichtuhr, gamma, myonen, gps). Zahlen auf Seite, Blatt
und in der Simulation identisch halten (Myonen: 563/h, 1917 m, 0,995 c, 1,52 µs; GPS: 3,87 km/s, −7,2/+45,7 µs).
Blätter `ab-0-logbuch`, `ab-1` bis `ab-7`, `ab-p-erklaerkarte` mit eigener `ab-vorlage.tex`.
