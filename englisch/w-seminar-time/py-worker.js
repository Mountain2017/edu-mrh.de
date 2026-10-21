/* W-Seminar "Time" – Python in the browser for the viable-data pages.
   Pyodide (CPython compiled to WebAssembly) is self-hosted under /embed/pyodide/
   (workflow .github/workflows/deploy-pyodide.yml) – no CDN, nothing leaves the browser.
   Runs in a Web Worker, so long or endless loops never freeze the page (Stop = terminate).

   in:  {type: 'run', id, code, files: [{name, url}]}   {type: 'file', name, text}
   out: {type: 'status', text}  {type: 'ready'}  {type: 'file-ok', name}  {type: 'out', id, text, err}
        {type: 'plot', id, kind, spec}  {type: 'done', id, ok, error} */
'use strict';

var BASE = new URLSearchParams(self.location.search).get('base') || 'https://edu-mrh.de/embed/pyodide/';
var current = null;
var loaded = {};
var pyodide = null;

/* Charts: Python calls eduPlot(kind, json), the page draws them as SVG. */
var EDU_PY = [
    '"""Charts for the W-Seminar data pages.',
    '',
    'bars(labels, values), hist(values, bins=10), scatter(x, y, line=False),',
    'boxplot({"group": values, ...}), line(x, {"series": values, ...}), table(rows, header).',
    'Every function also takes title=, xlabel=, ylabel=.',
    'On your own computer, use matplotlib instead – see the page."""',
    'import json as _json, math as _math',
    'from js import eduPlot as _plot',
    '',
    'def _clean(v):',
    '    if isinstance(v, float) and (_math.isnan(v) or _math.isinf(v)):',
    '        return None',
    '    if isinstance(v, dict):',
    '        return {str(k): _clean(x) for k, x in v.items()}',
    '    if isinstance(v, (list, tuple, range)):',
    '        return [_clean(x) for x in v]',
    '    if isinstance(v, (int, float, str, bool)) or v is None:',
    '        return v',
    '    return str(v)',
    '',
    'def _send(kind, **spec):',
    '    _plot(kind, _json.dumps(_clean(spec)))',
    '',
    'def bars(labels, values, title="", xlabel="", ylabel=""):',
    '    _send("bars", labels=[str(l) for l in labels], values=list(values), title=title, xlabel=xlabel, ylabel=ylabel)',
    '',
    'def hist(values, bins=10, title="", xlabel="", ylabel="count"):',
    '    _send("hist", values=[v for v in values if v is not None], bins=bins, title=title, xlabel=xlabel, ylabel=ylabel)',
    '',
    'def scatter(x, y, title="", xlabel="", ylabel="", line=False):',
    '    _send("scatter", x=list(x), y=list(y), title=title, xlabel=xlabel, ylabel=ylabel, line=bool(line))',
    '',
    'def boxplot(groups, title="", xlabel="", ylabel=""):',
    '    _send("boxplot", groups={str(k): list(v) for k, v in groups.items()}, title=title, xlabel=xlabel, ylabel=ylabel)',
    '',
    'def line(x, series, title="", xlabel="", ylabel=""):',
    '    if not isinstance(series, dict):',
    '        series = {ylabel or "value": series}',
    '    _send("line", x=list(x), series={str(k): list(v) for k, v in series.items()}, title=title, xlabel=xlabel, ylabel=ylabel)',
    '',
    'def table(rows, header=None, title=""):',
    '    _send("table", rows=[list(r) for r in rows], header=list(header) if header else None, title=title)',
    ''
].join('\n');

self.eduPlot = function (kind, json) {
    self.postMessage({ type: 'plot', id: current, kind: kind, spec: JSON.parse(json) });
};

var ready = (async function () {
    self.postMessage({ type: 'status', text: 'Loading Python (about 12 MB, only the first time) …' });
    importScripts(BASE + 'pyodide.js');
    pyodide = await self.loadPyodide({ indexURL: BASE });
    pyodide.setStdout({ batched: function (s) { self.postMessage({ type: 'out', id: current, text: s + '\n' }); } });
    pyodide.setStderr({ batched: function (s) { self.postMessage({ type: 'out', id: current, text: s + '\n', err: true }); } });
    pyodide.setStdin({ stdin: function () { throw new Error('input() does not work on this page – write the value into the code instead.'); } });
    pyodide.FS.writeFile('edu.py', EDU_PY);
    self.postMessage({ type: 'ready' });
})();

async function writeFiles(files) {
    for (var i = 0; i < (files || []).length; i++) {
        var f = files[i];
        if (loaded[f.name] === f.url) continue;
        var res = await fetch(f.url);
        if (!res.ok) throw new Error('Could not load ' + f.name + ' (' + res.status + ')');
        pyodide.FS.writeFile(f.name, await res.text());
        loaded[f.name] = f.url;
    }
}

self.onmessage = async function (e) {
    var m = e.data;
    try { await ready; } catch (err) {
        self.postMessage({ type: 'done', id: m.id, ok: false, error: 'Python could not be loaded. ' + String(err && err.message || err) });
        return;
    }
    if (m.type === 'file') {
        pyodide.FS.writeFile(m.name, m.text);
        loaded[m.name] = 'upload';
        self.postMessage({ type: 'file-ok', name: m.name });
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
