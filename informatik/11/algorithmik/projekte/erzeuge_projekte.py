#!/usr/bin/env python3
"""
Erzeugt die Snap!-Vorlagen (XML) für die Algorithmik-Sequenz (Informatik 11,
spätbeginnend). Aufruf im Ordner projekte/:   python3 erzeuge_projekte.py

Die Dateien werden bewusst aus Python erzeugt, damit alle Vorlagen denselben
Rahmen haben und Änderungen (z. B. am Text einer Aufgabe) an einer Stelle
passieren. Das XML-Format entspricht dem von Snap! 12 gelesenen Projekt-
format (Version 1, wie die Beispielprojekte in Snap!/Examples).
"""
from xml.sax.saxutils import escape as esc
import os

# ---------------------------------------------------------------- Bausteine
def l(v):                      # Literal (Zahl oder Text)
    return f"<l>{esc(str(v))}</l>"

def opt(v):                    # Auswahl-Literal (Dropdown)
    return f"<l><option>{esc(v)}</option></l>"

def var(name):                 # Variablen-Reporter
    return f'<block var="{esc(name)}"/>'

def blk(sel, *args):           # eingebauter Block
    return f'<block s="{sel}">{"".join(args)}</block>'

def lst(*items):               # variadische Eingabe (z. B. bei + und =)
    return f"<list>{''.join(items)}</list>"

def script(*blocks):           # Skript ohne Position (für C-Slots)
    return f"<script>{''.join(blocks)}</script>"

def scr(x, y, *blocks):        # Skript mit Position im Skriptbereich
    return f'<script x="{x}" y="{y}">{"".join(blocks)}</script>'

def comment(x, y, text, w=220):
    return f'<comment x="{x}" y="{y}" w="{w}" collapsed="false">{esc(text)}</comment>'

def custom(spec, *args):       # Aufruf eines eigenen Blocks
    return f'<custom-block s="{esc(spec)}">{"".join(args)}</custom-block>'

def definition(spec, typ, category, inputs, *blocks):
    """Definition eines eigenen Blocks. spec z. B. "Quadrat mit Seite %'seite'",
    inputs z. B. ["%n"]."""
    ins = "".join(f'<input type="{t}"></input>' for t in inputs)
    return (f'<block-definition s="{esc(spec)}" type="{typ}" category="{category}">'
            f"<inputs>{ins}</inputs><script>{''.join(blocks)}</script></block-definition>")

# Kurzformen häufiger Blöcke -------------------------------------------------
flag      = lambda: blk("receiveGo")
key       = lambda k: blk("receiveKey", l(k))
move      = lambda n: blk("forward", n if n.startswith("<") else l(n))
turn      = lambda n: blk("turn", n if n.startswith("<") else l(n))
goto      = lambda x, y: blk("gotoXY", l(x), l(y))
heading   = lambda d: blk("setHeading", l(d))
pen_down  = lambda: blk("down")
pen_up    = lambda: blk("up")
clear     = lambda: blk("clear")
pen_size  = lambda n: blk("setSize", l(n))
pen_color = lambda r, g, b: blk("setColor", f"<color>{r},{g},{b},1</color>")
say_for   = lambda t, s=2: blk("doSayFor", t if t.startswith("<") else l(t), l(s))
say       = lambda t: blk("bubble", t if t.startswith("<") else l(t))
ask       = lambda t: blk("doAsk", l(t))
answer    = lambda: blk("getLastAnswer")
set_var   = lambda n, v: blk("doSetVar", l(n), v if v.startswith("<") else l(v))
change    = lambda n, v: blk("doChangeVar", l(n), v if v.startswith("<") else l(v))
wait      = lambda s: blk("doWait", l(s))
repeat    = lambda n, *b: blk("doRepeat", n if n.startswith("<") else l(n), script(*b))
until     = lambda cond, *b: blk("doUntil", cond, script(*b))
forever   = lambda *b: blk("doForever", script(*b))
if_       = lambda cond, *b: blk("doIf", cond, script(*b))
def if_else(cond, then_blocks, else_blocks):
    return blk("doIfElse", cond, script(*then_blocks), script(*else_blocks))
report    = lambda v: blk("doReport", v)
join      = lambda *p: blk("reportJoinWords", lst(*[x if x.startswith("<") else l(x) for x in p]))
plus      = lambda *p: blk("reportVariadicSum", lst(*[x if x.startswith("<") else l(x) for x in p]))
minus     = lambda a, b: blk("reportDifference", a if a.startswith("<") else l(a), b if b.startswith("<") else l(b))
times     = lambda *p: blk("reportVariadicProduct", lst(*[x if x.startswith("<") else l(x) for x in p]))
div       = lambda a, b: blk("reportQuotient", a if a.startswith("<") else l(a), b if b.startswith("<") else l(b))
mod       = lambda a, b: blk("reportModulus", a if a.startswith("<") else l(a), b if b.startswith("<") else l(b))
rnd       = lambda a, b: blk("reportRandom", l(a), l(b))
eq        = lambda a, b: blk("reportVariadicEquals", lst(a if a.startswith("<") else l(a), b if b.startswith("<") else l(b)))
lt        = lambda a, b: blk("reportVariadicLessThan", lst(a if a.startswith("<") else l(a), b if b.startswith("<") else l(b)))
gt        = lambda a, b: blk("reportVariadicGreaterThan", lst(a if a.startswith("<") else l(a), b if b.startswith("<") else l(b)))
ge        = lambda a, b: blk("reportVariadicGreaterThanOrEquals", lst(a if a.startswith("<") else l(a), b if b.startswith("<") else l(b)))
and_      = lambda a, b: blk("reportVariadicAnd", lst(a, b))
or_       = lambda a, b: blk("reportVariadicOr", lst(a, b))
not_      = lambda a: blk("reportNot", a)
true      = lambda: blk("reportBoolean", "<l><bool>true</bool></l>")
is_a      = lambda v, t: blk("reportIsA", v, opt(t))
length    = lambda t: blk("reportTextAttribute", opt("length"), t if t.startswith("<") else l(t))
declare   = lambda *names: blk("doDeclareVariables", lst(*[l(n) for n in names]))

# ---------------------------------------------------------------- Layout
import re as _re
_CMD = ("forward","turn","turnLeft","gotoXY","setHeading","down","up","clear","setSize","setColor",
        "doSayFor","bubble","doAsk","doSetVar","doChangeVar","doWait","doRepeat","doUntil","doForever",
        "doIf","doIfElse","doReport","doDeclareVariables","receiveGo","receiveKey")

def _hoehe(xml):
    """Grobe Höhe eines Skripts/Kommentars in Snap!-Pixeln (Skalierung 1)."""
    if xml.startswith("<comment"):
        w = int(_re.search(r' w="(\d+)"', xml).group(1))
        text = _re.sub(r"<[^>]+>", "", xml)
        zeilen = max(1, -(-len(text) // max(20, w // 6)))
        return 14 + 15 * zeilen
    n = sum(len(_re.findall(f'<block s="{sel}"', xml)) for sel in _CMD) + xml.count("<custom-block")
    return 24 + 23 * n + 14 * xml.count("<script>")

def auto_layout(items, abstand=18):
    """Setzt die y-Koordinaten so, dass sich Skripte einer Spalte (gleiches x)
    nicht überlappen; die Reihenfolge innerhalb einer Spalte bleibt erhalten."""
    spalten = {}
    out = []
    for it in items:
        m = _re.match(r'<(script|comment) x="(\d+)" y="(\d+)"', it)
        x = int(m.group(2))
        y = spalten.get(x, 20)
        it = _re.sub(r'y="\d+"', f'y="{y}"', it, count=1)
        spalten[x] = y + _hoehe(it) + abstand
        out.append(it)
    return out

# ---------------------------------------------------------------- Projekt
def project(name, notes, scripts, variables=(), blocks="", watchers=()):
    scripts = auto_layout(scripts)
    """variables: Liste von (name, startwert); watchers: Variablennamen, die
    auf der Bühne angezeigt werden."""
    vars_xml = "".join(f'<variable name="{esc(n)}">{l(v)}</variable>' for n, v in variables)
    watch_xml = "".join(
        f'<watcher var="{esc(n)}" style="normal" x="{10}" y="{10 + 28 * i}" color="243,118,29"/>'
        for i, n in enumerate(watchers))
    return (
        '<project name="' + esc(name) + '" app="Snap! 12, https://snap.berkeley.edu" version="1">'
        f"<notes>{esc(notes)}</notes><thumbnail></thumbnail>"
        '<stage name="Bühne" width="480" height="360" costume="0" tempo="60" threadsafe="false" '
        'penlog="false" volume="100" pan="0" lines="round" ternary="false" hyperops="true" '
        'codify="false" inheritance="true" sublistIDs="false" scheduled="false" id="1">'
        "<pentrails></pentrails>"
        '<costumes><list id="2"></list></costumes><sounds><list id="3"></list></sounds>'
        "<variables></variables><blocks></blocks><scripts></scripts>"
        '<sprites select="1">'
        '<sprite name="Figur" idx="1" x="0" y="0" heading="90" scale="1" volume="100" pan="0" '
        'rotation="1" draggable="true" costume="0" color="80,80,80,1" pen="tip" id="8">'
        '<costumes><list id="9"></list></costumes><sounds><list id="10"></list></sounds>'
        "<blocks></blocks><variables></variables>"
        f"<scripts>{''.join(scripts)}</scripts>"
        "</sprite>"
        f"{watch_xml}"
        "</sprites></stage>"
        "<hidden></hidden><headers></headers><code></code>"
        f"<blocks>{blocks}</blocks>"
        f"<variables>{vars_xml}</variables>"
        "</project>"
    )

def write(filename, xml):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
    print("geschrieben:", filename, f"({len(xml.encode())} Bytes)")

# ================================================================ 0 – Start
write("0-start.xml", project(
    "0 Hallo Snap!",
    "Station 0: Snap! kennenlernen.\n1. Klicke auf die grüne Flagge.\n2. Drücke die Leertaste.\n"
    "3. Ändere den Text in der Sprechblase.\n4. Hänge weitere Blöcke an.",
    [
        comment(20, 20, "Klicke auf die grüne Flagge ▶ oben rechts. Was passiert?", 260),
        scr(20, 70,
            flag(),
            say_for("Hallo! Ich bin deine Figur.", 2),
            move("100"),
            turn("90"),
            say_for("Ich kann mich bewegen ...", 2),
            move("100"),
            say("Fertig!")),
        comment(20, 260, "Drücke die Leertaste. Welcher Block reagiert?", 260),
        scr(20, 300,
            key("space"),
            say_for("Leertaste gedrückt!", 1),
            goto(0, 0),
            heading(90)),
    ]))

# ================================================================ 1 – Sequenz
write("1-sequenz.xml", project(
    "1 Sequenz",
    "Station 1: Sequenz.\nZwei Skripte, gleiche Blöcke – andere Reihenfolge.\n"
    "Sage vorher, was gezeichnet wird. Dann: grüne Flagge bzw. Taste b.",
    [
        comment(20, 20, "Skript A: Vorhersage – welche Figur entsteht?", 240),
        scr(20, 60,
            flag(), clear(), goto(-50, -50), heading(90), pen_size(3), pen_color(30, 90, 200),
            pen_down(),
            move("100"), turn("90"), move("100"), turn("90"), move("100"), turn("90"), move("100"),
            pen_up()),
        comment(320, 20, "Skript B: dieselben Blöcke, andere Reihenfolge. Was entsteht jetzt?", 240),
        scr(320, 60,
            key("b"), clear(), goto(-50, -50), heading(90), pen_size(3), pen_color(200, 60, 60),
            move("100"),
            pen_down(),
            turn("90"), move("100"), turn("90"), move("100"),
            pen_up(),
            turn("90"), move("100")),
        comment(20, 420, "Skript C (Taste c): Fehlt ein Block? Repariere das Dreieck.", 240),
        scr(20, 460,
            key("c"), clear(), goto(-50, -50), heading(90), pen_size(3), pen_color(40, 160, 90),
            pen_down(),
            move("120"), turn("120"), move("120"), turn("120"),
            pen_up()),
    ]))

write("1-sequenz-loesung.xml", project(
    "1 Sequenz – Lösung",
    "Lösung Station 1: Haus aus Quadrat und Dach.",
    [
        scr(20, 20,
            flag(), clear(), goto(-50, -80), heading(90), pen_size(3), pen_color(30, 90, 200),
            pen_down(),
            move("100"), turn("90"), move("100"), turn("90"), move("100"), turn("90"), move("100"),
            # Dach: Figur steht unten links, Richtung 90 -> zur oberen linken Ecke
            turn("90"), move("100"), turn("-90"), move("100"), turn("90"),
            pen_color(200, 60, 60),
            heading(30), move("100"), turn("120"), move("100"),
            pen_up()),
        scr(320, 20,
            key("c"), clear(), goto(-50, -50), heading(90), pen_size(3), pen_color(40, 160, 90),
            pen_down(),
            move("120"), turn("120"), move("120"), turn("120"), move("120"),
            pen_up()),
    ]))

# ================================================================ 2 – Variablen
write("2-variablen.xml", project(
    "2 Variablen",
    "Station 2: Variablen und Datentypen.\nGrüne Flagge: Punkte zählen.\n"
    "Taste n: Name. Taste z: Zahl oder Text? Taste w: Wahrheitswert.",
    [
        comment(20, 20, "Skript A (Flagge): Wie viele Punkte stehen am Ende in der Variable?", 250),
        scr(20, 60,
            flag(),
            set_var("punkte", "0"),
            say_for("Los geht's!", 1),
            change("punkte", "1"),
            change("punkte", "1"),
            change("punkte", "5"),
            say_for(join("Du hast ", var("punkte"), " Punkte."), 3)),
        comment(320, 20, "Skript B (Taste n): Eine Zeichenkette in einer Variable.", 250),
        scr(320, 60,
            key("n"),
            ask("Wie heißt du?"),
            set_var("name", answer()),
            say_for(join("Hallo ", var("name"), "!"), 2)),
        comment(320, 200, "Skript C (Taste z): Zweimal 'zahl' und 10 – zwei verschiedene Ergebnisse. Warum?", 250),
        scr(320, 250,
            key("z"),
            ask("Nenne eine Zahl:"),
            set_var("zahl", answer()),
            say_for(plus(var("zahl"), "10"), 2),
            say_for(join(var("zahl"), "10"), 2)),
        comment(20, 300, "Skript D (Taste w): Was speichert die Variable 'ist gross'?", 250),
        scr(20, 340,
            key("w"),
            set_var("ist gross", gt(var("punkte"), "5")),
            say_for(var("ist gross"), 2),
            say_for(is_a(var("ist gross"), "Boolean"), 2)),
    ],
    variables=[("punkte", 0), ("name", ""), ("zahl", 0), ("ist gross", "")],
    watchers=["punkte", "name", "zahl", "ist gross"]))

write("2-variablen-loesung.xml", project(
    "2 Variablen – Lösung",
    "Lösung Station 2: Steckbrief (Flagge) und Alter in Tagen (Taste t).",
    [
        scr(20, 20,
            flag(),
            ask("Wie heißt du?"), set_var("name", answer()),
            ask("Wo wohnst du?"), set_var("ort", answer()),
            ask("Was ist dein Lieblingsfach?"), set_var("fach", answer()),
            say_for(join(var("name"), " aus ", var("ort"), " mag ", var("fach"), "."), 4)),
        scr(320, 20,
            key("t"),
            ask("Wie alt bist du (Jahre)?"),
            set_var("alter", answer()),
            set_var("tage", times(var("alter"), "365")),
            say_for(join("Das sind ungefähr ", var("tage"), " Tage."), 3)),
    ],
    variables=[("name", ""), ("ort", ""), ("fach", ""), ("alter", 0), ("tage", 0)],
    watchers=["alter", "tage"]))

# ================================================================ 3 – Bedingungen
write("3-bedingungen.xml", project(
    "3 Bedingungen",
    "Station 3: Bedingte Anweisung.\nFlagge: Türsteher. Taste a: Ampel. Taste q: Quiz. Taste u: und.",
    [
        comment(20, 20, "Skript A (Flagge): Was sagt die Figur bei 17? Bei 18? Bei 40?", 250),
        scr(20, 60,
            flag(),
            ask("Wie alt bist du?"),
            set_var("alter", answer()),
            if_else(ge(var("alter"), "18"),
                    [say_for("Willkommen im Club!", 2)],
                    [say_for("Sorry, erst ab 18.", 2)])),
        comment(320, 20, "Skript B (Taste a): Was passiert bei 'gelb'?", 250),
        scr(320, 60,
            key("a"),
            ask("Ampel: rot, gelb oder grün?"),
            set_var("farbe", answer()),
            if_(eq(var("farbe"), "grün"), say_for("Fahren!", 2)),
            if_(eq(var("farbe"), "rot"), say_for("Stopp!", 2))),
        comment(20, 260, "Skript C (Taste q): Quiz mit Punkten.", 250),
        scr(20, 300,
            key("q"),
            ask("Hauptstadt von Bayern?"),
            if_else(eq(answer(), "München"),
                    [change("punkte", "1"), say_for("Richtig!", 2)],
                    [say_for("Leider nein.", 2)])),
        comment(320, 260, "Skript D (Taste u): Wann ist die Bedingung wahr?", 250),
        scr(320, 300,
            key("u"),
            ask("Nenne eine Zahl:"),
            set_var("zahl", answer()),
            if_else(and_(gt(var("zahl"), "0"), lt(var("zahl"), "10")),
                    [say_for("einstellig und positiv", 2)],
                    [say_for("nicht einstellig oder nicht positiv", 2)])),
    ],
    variables=[("alter", 0), ("farbe", ""), ("punkte", 0), ("zahl", 0)],
    watchers=["punkte"]))

write("3-bedingungen-loesung.xml", project(
    "3 Bedingungen – Lösung",
    "Lösung Station 3: Zahl raten (ein Versuch, Flagge) und Notenrechner (Taste n).",
    [
        scr(20, 20,
            flag(),
            set_var("geheim", rnd(1, 10)),
            ask("Ich denke an eine Zahl von 1 bis 10. Dein Tipp?"),
            set_var("tipp", answer()),
            if_else(eq(var("tipp"), var("geheim")),
                    [say_for("Treffer!", 2)],
                    [if_else(lt(var("tipp"), var("geheim")),
                             [say_for(join("Zu klein – es war ", var("geheim"), "."), 2)],
                             [say_for(join("Zu groß – es war ", var("geheim"), "."), 2)])])),
        scr(320, 20,
            key("n"),
            ask("Wie viele Punkte (0–15)?"),
            set_var("punkte", answer()),
            if_else(ge(var("punkte"), "13"),
                    [say_for("sehr gut", 2)],
                    [if_else(ge(var("punkte"), "10"),
                             [say_for("gut", 2)],
                             [if_else(ge(var("punkte"), "7"),
                                      [say_for("befriedigend", 2)],
                                      [say_for("noch üben", 2)])])])),
    ],
    variables=[("geheim", 0), ("tipp", 0), ("punkte", 0)]))

# ================================================================ 4 – Wiederholung
write("4-wiederholung.xml", project(
    "4 Wiederholung",
    "Station 4: Wiederholungen.\nFlagge, Taste 5, Taste k: feste Anzahl.\n"
    "Taste s: Summe. Taste r: Zahlenraten mit 'wiederhole bis'.",
    [
        comment(20, 20, "Skript A (Flagge), B (Taste 5), C (Taste k): Welche Figur entsteht?", 260),
        scr(20, 60,
            flag(), clear(), goto(-100, -40), heading(90), pen_size(3), pen_color(30, 90, 200),
            pen_down(),
            repeat("4", move("80"), turn("90")),
            pen_up()),
        scr(20, 230,
            key("5"), clear(), goto(-100, -40), heading(90), pen_size(3), pen_color(200, 60, 60),
            pen_down(),
            repeat("5", move("80"), turn("72")),
            pen_up()),
        scr(20, 400,
            key("k"), clear(), goto(-100, -40), heading(90), pen_size(3), pen_color(40, 160, 90),
            pen_down(),
            repeat("36", move("10"), turn("10")),
            pen_up()),
        comment(340, 20, "Skript D (Taste s): Welche Zahl sagt die Figur am Ende?", 260),
        scr(340, 60,
            key("s"),
            set_var("summe", "0"),
            set_var("i", "0"),
            repeat("10", change("i", "1"), change("summe", var("i"))),
            say_for(join("Summe: ", var("summe")), 3)),
        comment(340, 260, "Skript E (Taste r): Wann hört die Schleife auf?", 260),
        scr(340, 300,
            key("r"),
            set_var("geheim", rnd(1, 20)),
            set_var("tipp", "0"),
            set_var("versuche", "0"),
            until(eq(var("tipp"), var("geheim")),
                  ask("Rate die Zahl (1–20):"),
                  set_var("tipp", answer()),
                  change("versuche", "1"),
                  if_(lt(var("tipp"), var("geheim")), say_for("zu klein", 1)),
                  if_(gt(var("tipp"), var("geheim")), say_for("zu groß", 1))),
            say_for(join("Treffer nach ", var("versuche"), " Versuchen!"), 3)),
    ],
    variables=[("summe", 0), ("i", 0), ("geheim", 0), ("tipp", 0), ("versuche", 0)],
    watchers=["summe", "i", "versuche"]))

write("4-wiederholung-loesung.xml", project(
    "4 Wiederholung – Lösung",
    "Lösung Station 4: Countdown (Flagge), n-Eck (Taste n), Einmaleins-Trainer (Taste e).",
    [
        scr(20, 20,
            flag(),
            set_var("zahl", "10"),
            until(eq(var("zahl"), "0"),
                  say_for(var("zahl"), 0.5),
                  change("zahl", "-1")),
            say_for("Start!", 2)),
        scr(20, 240,
            key("n"),
            ask("Wie viele Ecken?"),
            set_var("ecken", answer()),
            clear(), goto(-60, -60), heading(90), pen_down(),
            repeat(var("ecken"), move("80"), turn(div("360", var("ecken")))),
            pen_up()),
        scr(340, 20,
            key("e"),
            set_var("richtig", "0"),
            repeat("5",
                   set_var("a", rnd(2, 9)),
                   set_var("b", rnd(2, 9)),
                   ask(join(var("a"), " mal ", var("b"), " = ?")),
                   if_else(eq(answer(), times(var("a"), var("b"))),
                           [change("richtig", "1"), say_for("Richtig!", 1)],
                           [say_for(join("Falsch, es wäre ", times(var("a"), var("b"))), 2)])),
            say_for(join(var("richtig"), " von 5 richtig."), 3)),
    ],
    variables=[("zahl", 10), ("ecken", 5), ("richtig", 0), ("a", 0), ("b", 0)],
    watchers=["richtig"]))

# ================================================================ 5 – Funktionen
BLOCKS_5 = (
    definition("Quadrat mit Seite %'seite'", "command", "pen", ["%n"],
               repeat("4", move(var("seite")), turn("90")))
    + definition("Vieleck mit %'ecken' Ecken und Seite %'seite'", "command", "pen", ["%n", "%n"],
                 repeat(var("ecken"), move(var("seite")), turn(div("360", var("ecken")))))
    + definition("Mittelwert von %'a' und %'b'", "reporter", "operators", ["%n", "%n"],
                 report(div(plus(var("a"), var("b")), "2")))
    + definition("ist %'zahl' gerade?", "predicate", "operators", ["%n"],
                 report(eq(mod(var("zahl"), "2"), "0")))
)

write("5-funktionen.xml", project(
    "5 Funktionen",
    "Station 5: Eigene Blöcke mit Parametern und Rückgabewert.\n"
    "Flagge: drei Quadrate. Taste m: Mittelwert. Taste g: gerade?\n"
    "Rechtsklick auf einen eigenen Block → 'bearbeiten…' zeigt die Definition.",
    [
        comment(20, 20, "Skript A (Flagge): Der Block 'Quadrat mit Seite' wird dreimal aufgerufen – mit verschiedenen Werten. Was entsteht?", 280),
        scr(20, 80,
            flag(), clear(), goto(-80, -80), heading(90), pen_size(3), pen_color(30, 90, 200),
            pen_down(),
            custom("Quadrat mit Seite %n", l(50)),
            custom("Quadrat mit Seite %n", l(100)),
            custom("Quadrat mit Seite %n", l(150)),
            pen_up()),
        comment(20, 300, "Skript B (Taste v): Zwei Parameter.", 280),
        scr(20, 340,
            key("v"), clear(), goto(-80, -80), heading(90), pen_size(3), pen_color(200, 60, 60),
            pen_down(),
            custom("Vieleck mit %n Ecken und Seite %n", l(6), l(70)),
            pen_up()),
        comment(340, 20, "Skript C (Taste m): Ein Block, der etwas ZURÜCKGIBT. Welche Zahl?", 280),
        scr(340, 60,
            key("m"),
            say_for(custom("Mittelwert von %n und %n", l(4), l(10)), 2),
            say_for(custom("Mittelwert von %n und %n", l(7), l(8)), 2)),
        comment(340, 200, "Skript D (Taste g): Ein Block, der WAHR oder FALSCH zurückgibt.", 280),
        scr(340, 240,
            key("g"),
            ask("Nenne eine Zahl:"),
            if_else(custom("ist %n gerade?", answer()),
                    [say_for("gerade", 2)],
                    [say_for("ungerade", 2)])),
    ],
    blocks=BLOCKS_5))

BLOCKS_5_LSG = (
    BLOCKS_5
    + definition("Dreieck mit Seite %'seite'", "command", "pen", ["%n"],
                 repeat("3", move(var("seite")), turn("120")))
    + definition("Haus mit Größe %'g'", "command", "pen", ["%n"],
                 custom("Quadrat mit Seite %n", var("g")),
                 turn("90"), move(var("g")), turn("-90"), move(var("g")), turn("90"),
                 heading(30), custom("Dreieck mit Seite %n", var("g")), heading(90))
    + definition("verdopple %'x'", "reporter", "operators", ["%n"],
                 report(times("2", var("x"))))
    + definition("ist %'jahr' ein Schaltjahr?", "predicate", "operators", ["%n"],
                 report(or_(
                     and_(eq(mod(var("jahr"), "4"), "0"), not_(eq(mod(var("jahr"), "100"), "0"))),
                     eq(mod(var("jahr"), "400"), "0"))))
)

write("5-funktionen-loesung.xml", project(
    "5 Funktionen – Lösung",
    "Lösung Station 5: Haus aus Quadrat + Dreieck (Flagge), verdopple (Taste d), Schaltjahr (Taste j).",
    [
        scr(20, 20,
            flag(), clear(), goto(-120, -80), heading(90), pen_size(3), pen_color(30, 90, 200),
            pen_down(),
            custom("Haus mit Größe %n", l(60)),
            pen_up(), move("100"), pen_down(),
            custom("Haus mit Größe %n", l(120)),
            pen_up()),
        scr(340, 20,
            key("d"),
            ask("Zahl?"),
            say_for(custom("verdopple %n", answer()), 2)),
        scr(340, 160,
            key("j"),
            ask("Welches Jahr?"),
            if_else(custom("ist %n ein Schaltjahr?", answer()),
                    [say_for("Schaltjahr!", 2)],
                    [say_for("kein Schaltjahr", 2)])),
    ],
    blocks=BLOCKS_5_LSG))

# ================================================================ 6 – Projekt-Starter
write("6-quiz-start.xml", project(
    "6 Projekt: Quiz",
    "Projekt-Starter: Quiz.\nDer Block 'Frage … richtige Antwort …' stellt eine Frage und zählt Punkte.\n"
    "Erweitere: mehr Fragen, Endauswertung, Wiederholung bei Fehlern, Highscore …",
    [
        comment(20, 20, "Starter: Ein eigener Block für eine Frage. Ergänze weitere Fragen und eine Auswertung.", 280),
        scr(20, 70,
            flag(),
            set_var("punkte", "0"),
            custom("Frage %s richtige Antwort %s", l("Hauptstadt von Bayern?"), l("München")),
            custom("Frage %s richtige Antwort %s", l("Wie viel ist 7 mal 8?"), l("56")),
            say_for(join("Du hast ", var("punkte"), " von 2 Punkten."), 3)),
    ],
    variables=[("punkte", 0)],
    watchers=["punkte"],
    blocks=definition("Frage %'frage' richtige Antwort %'richtig'", "command", "sensing", ["%s", "%s"],
                      ask(var("frage")),
                      if_else(eq(answer(), var("richtig")),
                              [change("punkte", "1"), say_for("Richtig!", 1)],
                              [say_for(join("Leider falsch. Richtig wäre: ", var("richtig")), 2)]))))

write("6-zeichenroboter-start.xml", project(
    "6 Projekt: Zeichenroboter",
    "Projekt-Starter: Zeichenroboter.\nBausteine: Quadrat, Vieleck, Dreieck. "
    "Baue daraus ein Bild, ein Muster oder eine Animation – mit Schleifen und eigenen Blöcken.",
    [
        comment(20, 20, "Starter: Ein Muster aus 12 gedrehten Quadraten. Verändere Anzahl, Größe, Farbe – oder baue etwas ganz Neues.", 280),
        scr(20, 70,
            flag(), clear(), goto(0, 0), heading(90), pen_size(2), pen_color(120, 40, 200),
            pen_down(),
            repeat("12", custom("Quadrat mit Seite %n", l(80)), turn("30")),
            pen_up()),
    ],
    blocks=(definition("Quadrat mit Seite %'seite'", "command", "pen", ["%n"],
                       repeat("4", move(var("seite")), turn("90")))
            + definition("Vieleck mit %'ecken' Ecken und Seite %'seite'", "command", "pen", ["%n", "%n"],
                         repeat(var("ecken"), move(var("seite")), turn(div("360", var("ecken")))))
            + definition("Dreieck mit Seite %'seite'", "command", "pen", ["%n"],
                         repeat("3", move(var("seite")), turn("120"))))))

write("6-textabenteuer-start.xml", project(
    "6 Projekt: Textabenteuer",
    "Projekt-Starter: Textabenteuer.\nJede Entscheidung ist eine bedingte Anweisung. "
    "Erweitere die Geschichte, führe Variablen (Leben, Gold) und Schleifen (Kampf) ein.",
    [
        comment(20, 20, "Starter: Eine Entscheidung. Baue die Geschichte weiter aus.", 280),
        scr(20, 60,
            flag(),
            set_var("leben", "3"),
            say_for("Du stehst vor einer alten Burg.", 2),
            ask("Gehst du durch das Tor (t) oder über die Mauer (m)?"),
            if_else(eq(answer(), "t"),
                    [say_for("Das Tor knarrt. Ein Wächter schläft.", 2),
                     custom("Entscheidung %s ja %s nein %s",
                            l("Schleichst du vorbei? (j/n)"),
                            l("Geschafft! Du bist im Hof."),
                            l("Der Wächter wacht auf. Du verlierst ein Leben."))],
                    [say_for("Die Mauer ist glatt und hoch.", 2),
                     change("leben", "-1"),
                     say_for("Du rutschst ab und verlierst ein Leben.", 2)]),
            say_for(join("Du hast noch ", var("leben"), " Leben."), 3)),
    ],
    variables=[("leben", 3)],
    watchers=["leben"],
    blocks=definition("Entscheidung %'frage' ja %'textJa' nein %'textNein'", "command", "control",
                      ["%s", "%s", "%s"],
                      ask(var("frage")),
                      if_else(eq(answer(), "j"),
                              [say_for(var("textJa"), 2)],
                              [say_for(var("textNein"), 2), change("leben", "-1")]))))
