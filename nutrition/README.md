# Teller für Teller / Plate by Plate

Phase-1-Grundgerüst für die Ernährungsplattform auf einer Subdomain von **edu-bay.de**.
Statisch (HTML/CSS/JS), kein Build-Schritt, kein Framework, deploybar über den
bestehenden GitHub-Actions-→-FTP-Workflow.

> Arbeitstitel. „Teller für Teller" (DE) / „Plate by Plate" (EN) kodiert das
> Stufenprinzip; lässt sich zentral in Header/Footer/Titles ändern.

## Struktur

```
/
├── de/                        ← redaktionelle Inhalte, Deutsch (kanonisch)
│   ├── index.html             Startseite: Hero, Stufenleiter, Prinzipien, Werkzeuge, Ton
│   ├── stufen.html            Das Stufenmodell 0–4 im Detail
│   └── lernen/
│       ├── protein.html       Lernmodul (Format-Prototyp mit „Warum?"-Ausklappern)
│       └── etiketten.html     Lernmodul Zutatenlisten
├── en/
│   └── index.html             Englische Startseite (Muster für weitere Übersetzungen)
├── assets/
│   ├── css/style.css          Design-System (Tokens, Komponenten)
│   ├── js/i18n.js             Sprachwahl-Helfer + t()-API für spätere Tool-Seiten
│   ├── fonts/*.woff2          Fraunces + Inter, selbst gehostet (DSGVO: kein Google-CDN)
│   └── img/plates.svg         Signatur-Grafik: Stufenteller 0–4 als SVG-Sprite
└── schemas/
    ├── food.schema.json       Schema der kuratierten Lebensmittel-Datenbank
    ├── food.example.json      Zwei Beispieleinträge (Stimme + Lokalisierung)
    └── profile.schema.json    Schema des Nutzerprofils (nur localStorage!)
```

## Lokalisierungskonzept

Zweigleisig, bewusst ohne Framework:

1. **Redaktionelle Seiten** liegen als echte statische HTML-Dateien pro Sprache
   in `/de/` und `/en/`. Verknüpfung über `<link rel="alternate" hreflang>` im
   `<head>`. Deutsch ist kanonisch; englische Seiten entstehen nach und nach —
   der Sprachumschalter zeigt bis dahin auf die englische Startseite.
2. **Tool-Seiten** (Essens-Kompass, Profil, Wochenplaner — Phasen 2–4) werden
   *nicht* dupliziert: eine HTML-Datei, UI-Strings aus
   `assets/i18n/ui.<lang>.json`, geladen über `I18N.load()` / `I18N.t()` aus
   `i18n.js`. **Datenbank-Inhalte** (Lebensmittelnamen, Blurbs) tragen ihre
   Übersetzungen selbst: jedes Textfeld ist ein Objekt `{"de": "…", "en": "…"}`
   mit `de` als Pflicht und Fallback (siehe `food.schema.json`).

Kein Auto-Redirect nach Browsersprache (nervt, schadet SEO); stattdessen merkt
sich `i18n.js` die explizite Wahl und hebt den Umschalter beim ersten Besuch
dezent hervor, wenn die Browsersprache abweicht.

## Datenschutz-Architektur (Kernentscheidung)

Alle Personalisierung läuft im Browser. Das Profil (`profile.schema.json`)
liegt ausschließlich in `localStorage` (Schlüssel `ews-profile`) plus
Export/Import als JSON-Datei. Der Server liefert nur statische Seiten und die
Lebensmittel-JSON. Gesundheitsdaten (Art. 9 DSGVO) erreichen den Server nie —
das ist Produktversprechen, nicht Implementierungsdetail, und gehört später
prominent auf die Seite.

Designregel für `medical_flags`: Krankheitsangaben **entfernen** Empfehlungen
oder **ergänzen Arzt-Verweise** — sie erzeugen niemals therapeutische Ratschläge.

## Design-System (Kurzreferenz)

| Token | Wert | Rolle |
|---|---|---|
| `--paper` | `#FAFAF6` | Seitenhintergrund |
| `--ink` | `#22302B` | Text (grünstichiges Dunkel) |
| `--green` / `--green-deep` | `#2E7A4D` / `#1D5637` | Primär, Links, CTAs |
| `--beet` | `#8E3A5F` | Sparsamer Akzent (Badges, Hover) |
| `--panel` | `#F0EEE3` | Wechselflächen |

Typografie: **Fraunces 600** für Headlines, **Fraunces 400 italic** für das
Ton-Zitat, **Inter** für Fließtext/UI. Signatur-Element: die Stufenteller
(`plates.svg`), ein Teller, der sich von Stufe 0 (leer) bis Stufe 4
(komponiert) füllt — überall wiederverwendbar, wo auf Stufen verwiesen wird.

Wiederkehrende Komponenten: `.why` (Ausklapper „Warum diese Empfehlung?" —
das zentrale Format-Versprechen), `.note` (Einordnung/Abgrenzung, Beet-Kante),
`.card`, `.stage`, `.pull-quote`.

## Nächste Schritte

- [ ] Arbeitstitel bestätigen oder ersetzen; Impressum/Datenschutz verlinken
- [ ] Subdomain + Deploy-Workflow (bestehendes GitHub-Actions-FTP-Muster übernehmen)
- [ ] **Phase 2:** kuratierte Lebensmittelliste (~200 Einträge) nach
      `food.schema.json`; Python-Pipeline: Nährwerte aus USDA FDC /
      Open Food Facts, CO₂ aus Poore & Nemecek 2018, Blurbs von Hand
- [ ] Essens-Kompass-Seite (Filter, ❤️/🤔/❌, localStorage) mit `ui.<lang>.json`
- [ ] Weitere Lernmodule nach dem Protein-Muster (B12, Ballaststoffe, Meal-Prep)
- [ ] Englische Versionen von `stufen.html` und den Modulen

## Lokale Vorschau

```bash
python3 -m http.server 8000
# → http://localhost:8000/de/
```
