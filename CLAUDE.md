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
  ausgewertet. Grafik/Ausgabe: `println()` ohne Argument gibt „undefined“ aus
  (`println("")`); `Text.moveTo` setzt die linke obere Ecke (Kreise, Polygone:
  die Mitte); ein offenes `Polygon(false, …)` mit transparenter Füllung zeichnet
  keine Linie (Kurven aus `Line`-Stücken bauen); Zugriff auf ein `null`-Array
  meldet „Interner Fehler … null“.

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
| M4 Quellen einbauen | Zitieren, Paraphrasieren, MLA, Quellen in die eigene Argumentation integrieren | geplant, Check 2 | offen |
| M5 Eigene Daten | Umfrage- und Experimentdesign, (Meta-)Analyse von Daten/Primärquellen | geplant, Check 3 | offen |
| M6 Statistik | Auswertung mit Python (Grundlagen-Skripte) | geplant (12/2) | offen |
| M7 Werkzeuge | LaTeX/Overleaf, Git, Kanban | geplant, wenn Ideen stehen | offen |

- Fristen: Thema/Forschungsfrage bis Ende 12/1; Präsentation 12/2; Abgabe
  2. Schultag im November (13); Prüfungsgespräch 13/1. Gewichtung
  Seminararbeit : Prüfungsgespräch = 2 : 1 (KM-Info ab Abiturjahrgang
  2025/2027), Leistungen werden einzeln im Zeugnis ausgewiesen.
- Laufend: Snapshots des Schreibstands etwa alle 4 Wochen, KI-Log,
  3-2-1-Backup; geplante betreute Schreibstunde als Sprachreferenz.
- **Leistungsnachweis 12/1 (Planung):** drei Online-Checks nach M3, M4, M5,
  die besten zwei zählen als „Test“. Im Unterricht am eigenen Gerät, die
  Lehrkraft sieht die Bildschirme. Vor Einführung mit Oberstufenkoordination
  abstimmen und vorab ankündigen.
- **Online-Checks** (alles in `checks/`, generisch für jedes Thema; der Ordner ist auf
  dem Server zusätzlich per `.htaccess` geschützt): `check-<n>-<thema>.html` ist nur eine
  Hülle (`<div id="check" data-title="Check <n>">`, Sprache über `<html lang>`) ohne Links
  außer dem Impressum; `check-engine.js` + `check.css` für Schüler:innen.
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
  Lösung und Punkte. Check- und Auswertungsseite nirgends verlinken.
- **Textblöcke** (`"block": true` im Fragen-JSON): ein Lesetext mit Zeilennummern und
  mehrere Aufgaben dazu; je Version ein Paralleltext, alle Versionen mit gleicher
  Aufgabenfolge (Typ, Punkte). Auf breiten Bildschirmen steht der Text mitlaufend neben
  den Aufgaben; im Bericht steht er vor seinen Aufgaben (dann bei Bedarf 4 statt 2 Seiten).
- **Weitere Checks mit derselben Technik**: Englisch 13 Questions on the Text
  (`englisch/13/questions-on-the-text/checks/`, Fragen in `…/material/`). Dort liegen
  nur Hülle, gebautes `.js` und **Kopien** von `check-engine.js`/`check.css` (identisch
  zu den W-Seminar-Dateien halten). Läuft im Safe Exam Browser: während des Checks
  **kein Link** auf der Seite, auch nicht zum Impressum (Footer mit `data-after-hand-in
  hidden`, erscheint erst nach der Abgabe; so von der Lehrkraft gewünscht). Abgabe über
  Microsoft Forms: `data-abgabe` am `#check` = vorausgefüllter Forms-Link mit den
  Platzhaltern `NAME_X`, `RECEIPT_X`, `PRUEFUNG_X`; der Ergebnisbildschirm zeigt dann
  „1. Datei speichern, 2. Formular öffnen“ (Formular erst nach dem Speichern aktiv).
  Die Ergebnisdatei enthält dafür zusätzlich `pruefungsId` und `receiptId` (für den
  Power-Automate-Flow); Punkte stehen nie darin, die liefert nur die Auswertungsseite.
  **Startseite** (alle Checks): Name, Kurs/Klasse (Freitext; mit `data-kurse="10C,3e1"`
  Auswahlliste) und Zeitzuschlag (Nachteilsausgleich, Auswahl `data-extra`, Standard 10/15/20/25 %);
  die Zeit läuft dann `minutes × (1 + Zuschlag)`. Die Ergebnisdatei (`rv: 2`) enthält `kurs`,
  `zeitzuschlag`, `zeitMin`, `zeitErlaubtMin`, `dauerMin`, `dauer`, `zeitAbgelaufen`; die
  Quittung deckt ab `rv 2` auch Kurs, Zuschlag und Startzeit ab (gleiche Formel in
  `auswertung.js`, ältere Dateien ohne `rv` bleiben gültig). CSV der Auswertung: feste Spalten
  zuerst (Kurs, Name, Quittung, Punkte, max, Prozent, NP, …), Aufgaben am Ende – die
  Excel-Mappe der Lehrkraft liest diese Reihenfolge.
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
`contribute.html`, `Online-IDE API-Documentation.txt`, `.github/workflows/`
(FTPS-Deploy aller versionierten Dateien inkl. `.md`, Online-IDE, SQL-IDE, Snap!).

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
- 11 Algorithmik mit Snap!: `11/algorithmik/` (Stationen 0–6, HTML-Arbeitsblätter
  in `arbeitsblaetter/*.html`, `snap-ide.html`)
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
  (1.1 Queue, 1.2 Interfaces, 1.3 Listen, 1.4 Kompositum; `material/` Rohmaterial, nur lokal);
  älter: `12/rekursion-queue-listen/`
- 12 sonst: `12/binaerbaeume/`, `12/tiefensuche/`, `12/nebenlaeufigkeit/`
- 13 Formale Sprachen (neues Format, → AB): `13/formale-sprachen/`
  (1.1 Syntax und Semantik, 1.2 Formale Sprachen, 1.3 Syntaxdiagramme, 1.4 EBNF,
  1.5 Endliche Automaten mit Java-Projekt `Online-IDE/13-1-5 Automat.json` + Coach);
  Werkzeuge: `formale-sprachen.js` (1.1/1.2, Lösungsweg), `grammatik.js` (EBNF-Parser,
  Syntaxdiagramme, Gleisnetz-Fahrt, Baukasten, Werkstatt), `automaten.js` (Simulator,
  Automaten-Baukasten); `13/material/` Rohmaterial, nur lokal

**Makerspace** (`makerspace/makerspace.html`, Wahlkurs Unterstufe, Stationen je 3 Wochen;
nur Robotik online): `makerspace/robotik/` LEGO SPIKE Prime – `robotik.html` (Team,
Lernpfad, Akku, Abzeichen, Spickzettel, Lehrkräfte-Werkzeuge mit PIN), Starter
`starter-1-hallo-hub`, `starter-2-fahrschule`, `starter-3-sensoren`, Maker `maker-tresor`,
`maker-roboter-show`, `maker-linienfolger`, `innovator`; Logik `robotik.js` (Markup-Doku im
Kopf, Lösungen als Hash in `data-loesung`, Hash-Werkzeug im Lehrkräfte-Bereich), `robotik.css`

**Englisch** (`englisch/englisch.html`): 5 `wordcraft`; 12 `uk/`
(uk-and-writing, north-south-divide), `media/narrative_lens`,
`immigration-social-structures-identity/`, `global issues/`,
13 `questions-on-the-text/` (→ AB, eigene Vorlage; verschlüsselter Online-Check
`checks/check-1-questions-on-the-text.html`, unverlinkt); W-Seminar „Time“ (12/13) in
`englisch/w-seminar-time/` (Kursplan siehe eigener Abschnitt: `w-seminar-time.html`,
`research-question.html`, `research-methods.html`, `checks/check-1-research-methods.html`
(verschlüsselt), Auswertung zentral in `/checks/auswertung/`; → AB `ws-w1` bis `ws-w5`, eigene Vorlage)

**Weitere Fächer**: `mathe/` (12: Exponential-/ln-Funktion, Umkehrfunktion),
`physik/` (10 Berlinfahrt-Lernpfad, 11 Federpendel + Protokoll, 12 Lorentzkraft),
`franzoesisch/` (8 Québec), `Latein/` (Cicero), `psychologie/` (Grawe),
`Stadtrallye/` (Triest). Von keiner Seite verlinkt: `nutrition/` (de/en),
`finanzen/` (Pflegevorsorge-Rechner), `dnd/`
