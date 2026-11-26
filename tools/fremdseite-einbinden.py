#!/usr/bin/env python3
"""
fremdseite-einbinden.py – eine fertige HTML-Einzeldatei (z. B. ein Trainer
einer Kollegin/eines Kollegen) für edu-mrh.de anbinden und prüfen.

Prüfen (ändert nichts):
    python3 tools/fremdseite-einbinden.py --pruefen DATEI.html

Einbinden (prüft danach automatisch):
    python3 tools/fremdseite-einbinden.py QUELLE.html ZIEL.html \\
        --titel "Arbeit-Trainer" --fach Physik --autor "Peter Sobek" \\
        --uebersicht arbeit.html \\
        [--beschreibung "Physik 9 (Gymnasium Bayern): …"] \\
        [--nachweis "Illustrationen erstellt mit Canva"] \\
        [--icon ⚛️] [--jahr 2026]

Was das Einbinden macht (idempotent: erneutes Ausführen ersetzt die eigenen
Blöcke, die zwischen <!-- edu-mrh:… --> … <!-- /edu-mrh:… --> stehen):
  * <title> → "<titel> | <fach> – edu-mrh.de", optional meta description,
    Favicon von edu-mrh.de (falls keins da ist)
  * Kopfleiste (Startseite, Übersicht, Impressum, Datenschutz) direkt nach <body>
  * Fußzeile mit Urhebervermerk („mit freundlicher Genehmigung“), optionalem
    Nachweis und Links vor dem letzten </body>
  * <script defer src="https://edu-mrh.de/controls.js"> vor </body>
  * Kopf- und Fußzeile werden beim Drucken ausgeblendet

Was das Prüfen meldet (data:-URIs werden vorher ausgeblendet):
  FEHLER  – Laden von fremden Servern (http(s)://, //host in src/href/url(),
            @import, Skripte, iframes, bekannte CDNs/Tracker, fetch auf
            fremde URLs) → Regel 2 in CLAUDE.md, Exit-Code 1
  WARNUNG – Netzwerk-APIs (fetch, XMLHttpRequest, WebSocket, sendBeacon …),
            Speicher (localStorage, Cookies), eval, @font-face, fehlende
            Impressum-/Datenschutz-Links, fehlendes lang/viewport
  INFO    – verwendete Schriften, eingebettete Bilder (Bildnachweis prüfen!),
            gefundene Quellen-/Bildangaben

Was das Skript NICHT kann (bleibt Handarbeit bzw. Claude Code): Themenseite
schreiben, Karte auf der Fachseite, Eintrag in LICENSE.md und CLAUDE.md,
inhaltliche und urheberrechtliche Prüfung (Schulbuchtexte? Bildlizenz?).
"""

import argparse
import html
import re
import sys
from datetime import date
from pathlib import Path

ERLAUBTE_HOSTS = {"edu-mrh.de", "www.edu-mrh.de"}
# Namensräume, die nur als Kennung in SVG/XML stehen und nichts laden
NAMENSRAEUME = ("http://www.w3.org/", "https://www.w3.org/")
BEKANNTE_FREMDE = [
    "googleapis", "gstatic", "fonts.google", "cdnjs", "jsdelivr", "unpkg",
    "cloudflare", "bootstrapcdn", "fontawesome", "googletagmanager",
    "google-analytics", "doubleclick", "facebook", "youtube", "vimeo",
    "wikimedia", "wikipedia", "typekit", "matomo", "hotjar", "plausible",
]

ROT, GELB, GRAU, GRUEN, AUS = "\033[31m", "\033[33m", "\033[90m", "\033[32m", "\033[0m"
if not sys.stdout.isatty():
    ROT = GELB = GRAU = GRUEN = AUS = ""


# ----------------------------------------------------------------- Prüfen
def ohne_data_uris(text):
    return re.sub(r"data:[a-z]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+",
                  "data:…", text, flags=re.I)


def zeilennr(text, pos):
    return text.count("\n", 0, pos) + 1


def host_von(url):
    m = re.match(r"(?:https?:)?//([^/:?#\"'\s)]+)", url, re.I)
    return m.group(1).lower() if m else ""


def pruefen(pfad):
    roh = Path(pfad).read_text(encoding="utf-8")
    t = ohne_data_uris(roh)
    fehler, warnungen, infos = [], [], []

    def kurz(s, n=110):
        s = " ".join(s.split())
        return s if len(s) <= n else s[:n] + " …"

    # 1. absolute und protokoll-relative URLs
    gesehen = set()
    for m in re.finditer(r"""(?:https?:)?//[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s"'<>)`]*""", t):
        url = m.group(0)
        if url.startswith(NAMENSRAEUME) or url in gesehen:
            continue
        # protokoll-relativ nur, wenn es nach src/href/url( aussieht
        if url.startswith("//"):
            davor = t[max(0, m.start() - 12):m.start()]
            if not re.search(r"""(src|href|url)\s*[=(]\s*["']?$""", davor, re.I):
                continue
        gesehen.add(url)
        h = host_von(url)
        z = zeilennr(t, m.start())
        davor = t[max(0, m.start() - 40):m.start()]
        laedt = re.search(r"""(src|srcset|url\(|@import|fetch\(|data-zwei-klick)\s*=?\s*["'`(]?\s*$""", davor, re.I)
        # <link href=…> (Stylesheet, Schrift, Icon) lädt ebenfalls; <a href> nicht
        tag = t[t.rfind("<", 0, m.start()):m.start()]
        if re.match(r"<(link|script|iframe|img|source|video|audio|embed|object)\b", tag, re.I) and ">" not in tag:
            laedt = True
        if h in ERLAUBTE_HOSTS:
            continue
        if laedt:
            fehler.append(f"Z. {z}: lädt von fremdem Server: {kurz(url)}")
        elif any(b in h for b in BEKANNTE_FREMDE):
            warnungen.append(f"Z. {z}: bekannter Fremddienst (nur Link? sonst Fehler): {kurz(url)}")
        else:
            warnungen.append(f"Z. {z}: fremde URL (Link oder Text, lädt nichts?): {kurz(url)}")

    # 2. Tags, die etwas nachladen
    for muster, was in [
        (r"<script[^>]+src\s*=\s*[\"']([^\"']+)", "Skript"),
        (r"<link[^>]+href\s*=\s*[\"']([^\"']+)", "link"),
        (r"<iframe[^>]+src\s*=\s*[\"']([^\"']+)", "iframe"),
        (r"@import\s+(?:url\()?[\"']?([^\"');]+)", "@import"),
    ]:
        for m in re.finditer(muster, t, re.I):
            ziel = m.group(1)
            h = host_von(ziel)
            if h and h not in ERLAUBTE_HOSTS:
                continue  # schon unter 1. als Fehler gemeldet
            if was == "iframe" and not h:
                infos.append(f"Z. {zeilennr(t, m.start())}: iframe (lokal): {kurz(ziel)}")
            elif not h:
                infos.append(f"Z. {zeilennr(t, m.start())}: {was} lokal/relativ: {kurz(ziel)} – Datei muss mit hochgeladen werden")

    # 3. APIs und Speicher
    for muster, meldung in [
        (r"\bfetch\s*\(", "fetch() – Ziel prüfen (nur eigener Server erlaubt)"),
        (r"XMLHttpRequest", "XMLHttpRequest – Ziel prüfen"),
        (r"\bnew\s+WebSocket|\bEventSource\b", "WebSocket/EventSource"),
        (r"sendBeacon", "navigator.sendBeacon"),
        (r"navigator\.(geolocation|mediaDevices)", "Standort/Kamera/Mikrofon"),
        (r"document\.cookie", "Cookies"),
        (r"\b(localStorage|sessionStorage|indexedDB)\b", "Browserspeicher – erlaubt (Regel 3), aber im Lehrkräfte-Bereich erwähnen"),
        (r"\beval\s*\(|new\s+Function\s*\(", "eval/new Function"),
        (r"@font-face", "@font-face – Schrift muss lokal als .woff2 mit OFL.txt liegen"),
        (r"<form[^>]+action\s*=", "Formular mit action – sendet Daten?"),
    ]:
        treffer = [zeilennr(t, m.start()) for m in re.finditer(muster, t)]
        if treffer:
            warnungen.append(f"{meldung} (Z. {', '.join(map(str, treffer[:8]))}{' …' if len(treffer) > 8 else ''})")

    # 4. Schriften
    fam = sorted({" ".join(m.group(1).split()) for m in re.finditer(r"font-family\s*:\s*([^;}`<]+)", t, re.I)})
    if fam:
        infos.append("Schriften (Systemschriften sind unproblematisch):\n      " + "\n      ".join(fam))

    # 5. eingebettete Bilder und Quellenangaben
    bilder = re.findall(r"data:image/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)", roh, re.I)
    if bilder:
        kb = sum(len(b) for _, b in bilder) * 3 // 4 // 1024
        infos.append(f"{len(bilder)} eingebettete Bilder (data:-URI, zusammen ca. {kb} KiB) – Urheber/Lizenz klären, Bildnachweis auf der Seite")
    nachweise = sorted({kurz(m.group(0), 80) for m in re.finditer(
        r"(Bild|Foto|Quelle|Grafik|Illustration|Lizenz|CC[ -]BY|©|&copy;|Canva|Wikimedia|Pixabay|Unsplash|Freepik)[^<\n]{0,60}", t, re.I)})
    if nachweise:
        infos.append("Gefundene Quellen-/Lizenzangaben:\n      " + "\n      ".join(nachweise[:12]))

    # 6. Pflichtelemente
    if not re.search(r"impressum", t, re.I) and "controls.js" not in t:
        warnungen.append("kein Impressum-Link und kein controls.js (Regel 1)")
    if not re.search(r"datenschutz", t, re.I) and "controls.js" not in t:
        warnungen.append("kein Datenschutz-Link und kein controls.js (Regel 1)")
    if not re.search(r"<html[^>]+lang\s*=", t, re.I):
        warnungen.append('<html> ohne lang-Attribut (lang="de")')
    if not re.search(r"name\s*=\s*[\"']viewport", t, re.I):
        warnungen.append("kein meta viewport (Mobilansicht)")
    if not re.search(r"<meta[^>]+charset", t, re.I):
        warnungen.append("kein meta charset")

    print(f"\nPrüfbericht: {pfad}")
    for f in fehler:
        print(f"  {ROT}FEHLER{AUS}  {f}")
    for w in warnungen:
        print(f"  {GELB}WARNUNG{AUS} {w}")
    for i in infos:
        print(f"  {GRAU}INFO{AUS}    {i}")
    if not fehler and not warnungen:
        print(f"  {GRUEN}OK{AUS}      keine fremden Ladevorgänge, keine kritischen APIs")
    print("  Nicht automatisch prüfbar: Bildlizenzen, Schulbuchtexte, fachliche Richtigkeit.\n")
    return len(fehler)


# ----------------------------------------------------------------- Einbinden
CSS = """<style>
.edumrh-nav{background:#fff;box-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);position:relative;z-index:10}
.edumrh-nav .em-in{max-width:1180px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:16px;line-height:1.2}
.edumrh-nav .em-brand{display:flex;align-items:center;gap:8px;font-size:22px;font-weight:700;color:#3b82f6}
.edumrh-nav .em-brand a{text-decoration:none;font-size:28px}
.edumrh-nav .em-links{display:flex;gap:10px;flex-wrap:wrap}
.edumrh-nav .em-links a{display:inline-flex;align-items:center;padding:7px 16px;border:2px solid #3b82f6;border-radius:8px;color:#3b82f6;background:transparent;font-weight:600;font-size:15px;text-decoration:none;transition:background .15s,color .15s}
.edumrh-nav .em-links a:hover{background:#3b82f6;color:#fff}
.edumrh-credit{max-width:1180px;margin:28px auto 16px;padding:0 16px;text-align:center;font:13px/1.8 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#5d6370}
.edumrh-credit a{color:#1864ab;white-space:nowrap}
@media (max-width:560px){.edumrh-nav .em-brand .t{display:none}.edumrh-nav .em-links{gap:6px}.edumrh-nav .em-links a{padding:6px 10px;font-size:13px}}
@media print{.edumrh-nav,.edumrh-credit{display:none !important}}
</style>"""


def block(name, inhalt):
    return f"<!-- edu-mrh:{name} -->\n{inhalt}\n<!-- /edu-mrh:{name} -->"


def entferne_bloecke(t):
    return re.sub(r"\n?<!-- edu-mrh:(\w+) -->.*?<!-- /edu-mrh:\1 -->\n?", "\n", t, flags=re.S)


def einbinden(a):
    t = Path(a.quelle).read_text(encoding="utf-8")
    t = entferne_bloecke(t)
    e = html.escape
    fach_kurz = a.fach

    # Titel
    titel = f"{a.titel} | {a.fach} – edu-mrh.de"
    if re.search(r"<title>.*?</title>", t, re.S | re.I):
        t = re.sub(r"<title>.*?</title>", lambda m: f"<title>{e(titel)}</title>", t, count=1, flags=re.S | re.I)
    else:
        t = re.sub(r"</head>", f"<title>{e(titel)}</title>\n</head>", t, count=1, flags=re.I)

    kopf = [CSS]
    if a.beschreibung:
        t = re.sub(r"\s*<meta[^>]+name\s*=\s*[\"']description[\"'][^>]*>", "", t, count=1, flags=re.I)
        kopf.insert(0, f'<meta name="description" content="{e(a.beschreibung)}">')
    if not re.search(r"<link[^>]+rel\s*=\s*[\"'][^\"']*icon", t, re.I):
        kopf.insert(0, '<link rel="icon" type="image/png" href="https://edu-mrh.de/embed/icons/favicon.png">')
    if "</head>" not in t.lower():
        sys.exit("Keine </head> gefunden – Datei sieht nicht wie eine vollständige HTML-Seite aus.")
    i = t.lower().index("</head>")
    t = t[:i] + block("kopf", "\n".join(kopf)) + "\n" + t[i:]

    # Kopfleiste nach dem ersten <body …>
    nav = f'''<nav class="edumrh-nav" aria-label="edu-mrh Navigation"><div class="em-in">
  <div class="em-brand"><a href="https://edu-mrh.de/" title="Startseite edu-mrh.de">{a.icon}</a><span class="t">edu-mrh {e(fach_kurz)}</span></div>
  <div class="em-links">
    <a href="{e(a.uebersicht)}">Übersicht</a>
    <a href="https://edu-mrh.de/impressum.html">Impressum</a>
    <a href="https://edu-mrh.de/datenschutz.html">Datenschutz</a>
  </div>
</div></nav>'''
    m = re.search(r"<body[^>]*>", t, re.I)
    if not m:
        sys.exit("Kein <body> gefunden.")
    t = t[:m.end()] + "\n" + block("nav", nav) + t[m.end():]

    # Fußzeile + controls.js vor dem LETZTEN </body> (frühere stehen oft in JS-Vorlagen)
    zusatz = f" · {e(a.nachweis)}" if a.nachweis else ""
    fuss = f'''<footer class="edumrh-credit">{e(a.titel)} · gebaut von <b>{e(a.autor)}</b> (&copy; {a.jahr}), veröffentlicht mit freundlicher Genehmigung{zusatz}<br>
  <a href="{e(a.uebersicht)}">← Zurück zur Themenseite</a> · <a href="https://edu-mrh.de/impressum.html">Impressum</a> · <a href="https://edu-mrh.de/datenschutz.html">Datenschutz</a></footer>'''
    if "edu-mrh.de/controls.js" not in t:
        fuss += '\n<script defer src="https://edu-mrh.de/controls.js"></script>'
    i = t.lower().rfind("</body>")
    if i < 0:
        sys.exit("Kein </body> gefunden.")
    t = t[:i] + block("fuss", fuss) + "\n" + t[i:]

    ziel = Path(a.ziel)
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(t, encoding="utf-8")
    print(f"{GRUEN}Geschrieben:{AUS} {ziel}")
    print("Noch von Hand / mit Claude Code: Themenseite, Karte auf der Fachseite, "
          "LICENSE.md (Beiträge von Kolleg:innen), Inhaltsindex in CLAUDE.md.")
    return pruefen(ziel)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("quelle", nargs="?", help="Originaldatei")
    p.add_argument("ziel", nargs="?", help="Zieldatei im Repo, z. B. physik/9/arbeit/arbeit-trainer.html")
    p.add_argument("--pruefen", metavar="DATEI", nargs="+", help="nur prüfen, nichts ändern")
    p.add_argument("--titel", help='z. B. "Arbeit-Trainer"')
    p.add_argument("--fach", default="Physik")
    p.add_argument("--autor", help='z. B. "Peter Sobek"')
    p.add_argument("--uebersicht", help="Ziel des Übersicht-/Zurück-Links, z. B. arbeit.html")
    p.add_argument("--beschreibung", help="meta description")
    p.add_argument("--nachweis", help='Bild-/Quellennachweis für die Fußzeile, z. B. "Illustrationen erstellt mit Canva"')
    p.add_argument("--icon", default="⚛️")
    p.add_argument("--jahr", default=str(date.today().year))
    a = p.parse_args()

    if a.pruefen:
        sys.exit(1 if sum(pruefen(d) for d in a.pruefen) else 0)
    if not (a.quelle and a.ziel and a.titel and a.autor and a.uebersicht):
        p.error("zum Einbinden: QUELLE ZIEL --titel --autor --uebersicht (oder --pruefen DATEI)")
    if Path(a.quelle).resolve() == Path(a.ziel).resolve():
        p.error("QUELLE und ZIEL müssen verschieden sein (Original bleibt unverändert)")
    sys.exit(1 if einbinden(a) else 0)


if __name__ == "__main__":
    main()
