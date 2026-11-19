/* KI-Sequenz (Informatik 13) – Python im Browser für die Python-Zellen (python.js).
   Pyodide (CPython als WebAssembly) liegt selbst gehostet unter /embed/pyodide/
   (Workflow .github/workflows/deploy-pyodide.yml) – kein CDN, nichts verlässt den Browser.
   Läuft in einem Web Worker: Endlosschleifen frieren die Seite nicht ein (Stopp = Worker beenden).
   Grundlage: englisch/w-seminar-time/py-worker.js, hier mit dem deutschen Modul „ki“ für Diagramme.

   ein:  {type: 'run', id, code, files: [{name, url}]}
   aus:  {type: 'status', text}  {type: 'ready'}  {type: 'out', id, text, err}
         {type: 'plot', id, kind, spec}  {type: 'done', id, ok, error} */
'use strict';

var BASE = new URLSearchParams(self.location.search).get('base') || 'https://edu-mrh.de/embed/pyodide/';
var current = null;
var loaded = {};
var pyodide = null;

/* Diagramme: Python ruft kiPlot(art, json) auf, die Seite zeichnet. */
var KI_PY = [
    '"""Diagramme für die KI-Seiten (Informatik 13).',
    '',
    'linie(x, reihen)          Liniendiagramm, reihen = {"Name": [Werte], …} oder eine Liste',
    'streu(punkte, klassen)    Streudiagramm, punkte = [(x1, x2), …], klassen = [0, 1, …]',
    'region(f, punkte, klassen, schritte=40)   Entscheidungsregion einer Funktion f(x1, x2) -> 0 … 1',
    'balken(namen, werte)      Balkendiagramm',
    'tabelle(zeilen, kopf)     Tabelle',
    'ziffern(bilder, namen)    8x8-Graubilder (Listen mit 64 Werten 0 … 16)',
    'Alle Funktionen kennen titel=, xname=, yname=.',
    'Am eigenen Rechner gibt es stattdessen matplotlib (siehe python-einrichten.html)."""',
    'import json as _json, math as _math',
    'from js import kiPlot as _plot',
    '',
    'def _sauber(v):',
    '    if isinstance(v, float) and (_math.isnan(v) or _math.isinf(v)):',
    '        return None',
    '    if isinstance(v, dict):',
    '        return {str(k): _sauber(x) for k, x in v.items()}',
    '    if isinstance(v, (list, tuple, range)):',
    '        return [_sauber(x) for x in v]',
    '    if isinstance(v, (int, float, str, bool)) or v is None:',
    '        return v',
    '    return str(v)',
    '',
    'def _senden(art, **spec):',
    '    _plot(art, _json.dumps(_sauber(spec)))',
    '',
    'def linie(x, reihen, titel="", xname="", yname=""):',
    '    if not isinstance(reihen, dict):',
    '        reihen = {yname or "Wert": list(reihen)}',
    '    _senden("linie", x=list(x), reihen={str(k): list(v) for k, v in reihen.items()}, titel=titel, xname=xname, yname=yname)',
    '',
    'def streu(punkte, klassen=None, titel="", xname="x1", yname="x2"):',
    '    punkte = [list(p)[:2] for p in punkte]',
    '    _senden("streu", punkte=punkte, klassen=list(klassen) if klassen is not None else None, titel=titel, xname=xname, yname=yname)',
    '',
    'def region(f, punkte=(), klassen=None, schritte=40, titel="", xname="x1", yname="x2", bereich=(0, 1)):',
    '    a, b = bereich',
    '    gitter = [[f(a + (b - a) * (i + 0.5) / schritte, a + (b - a) * (j + 0.5) / schritte) for i in range(schritte)] for j in range(schritte)]',
    '    _senden("region", gitter=gitter, bereich=[a, b], punkte=[list(p)[:2] for p in punkte], klassen=list(klassen) if klassen is not None else None, titel=titel, xname=xname, yname=yname)',
    '',
    'def balken(namen, werte, titel="", xname="", yname=""):',
    '    _senden("balken", namen=[str(n) for n in namen], werte=list(werte), titel=titel, xname=xname, yname=yname)',
    '',
    'def tabelle(zeilen, kopf=None, titel=""):',
    '    _senden("tabelle", zeilen=[list(z) for z in zeilen], kopf=list(kopf) if kopf else None, titel=titel)',
    '',
    'def ziffern(bilder, namen=None, titel=""):',
    '    _senden("ziffern", bilder=[list(b) for b in bilder], namen=[str(n) for n in namen] if namen else None, titel=titel)',
    ''
].join('\n');

self.kiPlot = function (art, json) {
    self.postMessage({ type: 'plot', id: current, kind: art, spec: JSON.parse(json) });
};

var ready = (async function () {
    self.postMessage({ type: 'status', text: 'Python wird geladen (etwa 12 MB, nur beim ersten Mal) …' });
    importScripts(BASE + 'pyodide.js');
    pyodide = await self.loadPyodide({ indexURL: BASE });
    pyodide.setStdout({ batched: function (s) { self.postMessage({ type: 'out', id: current, text: s + '\n' }); } });
    pyodide.setStderr({ batched: function (s) { self.postMessage({ type: 'out', id: current, text: s + '\n', err: true }); } });
    pyodide.setStdin({ stdin: function () { throw new Error('input() geht auf dieser Seite nicht – schreibe den Wert direkt in den Code.'); } });
    pyodide.FS.writeFile('ki.py', KI_PY);
    self.postMessage({ type: 'ready' });
})();

async function writeFiles(files) {
    for (var i = 0; i < (files || []).length; i++) {
        var f = files[i];
        if (loaded[f.name] === f.url) continue;
        var res = await fetch(f.url);
        if (!res.ok) throw new Error(f.name + ' konnte nicht geladen werden (' + res.status + ')');
        pyodide.FS.writeFile(f.name, await res.text());
        loaded[f.name] = f.url;
    }
}

self.onmessage = async function (e) {
    var m = e.data;
    try { await ready; } catch (err) {
        self.postMessage({ type: 'done', id: m.id, ok: false, error: 'Python konnte nicht geladen werden. ' + String(err && err.message || err) });
        return;
    }
    if (m.type !== 'run') return;
    current = m.id;
    var ns = null;
    try {
        await writeFiles(m.files);
        ns = pyodide.globals.get('dict')();
        await pyodide.runPythonAsync(m.code, { globals: ns });
        self.postMessage({ type: 'done', id: m.id, ok: true });
    } catch (err) {
        self.postMessage({ type: 'done', id: m.id, ok: false, error: String(err && err.message || err) });
    } finally {
        if (ns) ns.destroy();
        current = null;
    }
};
