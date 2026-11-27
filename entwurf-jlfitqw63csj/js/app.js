/* Gemeinsame Funktionen: Layout, Tabs, Bausteine, Kopieren, Drucken, Export */
window.HR = window.HR || {};

(function () {
  const NAV = [
    { href: "index.html", label: "Bibliothek", key: "start" },
    { href: "generator.html", label: "Prompt-Generator", key: "generator" },
    { href: "bausteine.html", label: "Feste Bausteine", key: "bausteine" },
    { href: "info.html", label: "So funktioniert’s", key: "info" }
  ];

  HR.layout = function (active) {
    const banner = document.createElement("div");
    banner.className = "prototype-banner";
    banner.innerHTML = `🧪 <strong>${HR.version}</strong> · nicht öffentlich verlinkt · Stand ${HR.stand}`;
    const nav = document.createElement("nav");
    nav.className = "navbar";
    nav.innerHTML = `<div class="inner">
      <a class="brand" href="index.html"><span class="logo">ψ</span><span>Handreichungen psychische Gesundheit<small>edu-mrh.de · für Lehrkräfte an bayerischen Gymnasien</small></span></a>
      <div class="navlinks">${NAV.map(n => `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${n.label}</a>`).join("")}</div>
    </div>`;
    document.body.prepend(nav);
    document.body.prepend(banner);
    const foot = document.createElement("footer");
    foot.className = "site";
    foot.innerHTML = `<div class="inner">
      <span>Erstellt für die Fachschaft / Schulpsychologie · Inhalte ersetzen keine Diagnostik oder Therapie.</span>
      <span><a href="https://edu-mrh.de/impressum.html">Impressum</a> · <a href="https://edu-mrh.de/datenschutz.html">Datenschutz</a> · <a href="https://edu-mrh.de/impressum.html#lizenz">Lizenz: CC BY-NC-SA 4.0</a></span>
    </div>`;
    document.body.append(foot);
  };

  /* ---------- Bausteine einsetzen ---------- */
  HR.renderBausteine = function (root = document) {
    root.querySelectorAll("[data-baustein]").forEach(el => {
      const b = HR.bausteine && HR.bausteine[el.dataset.baustein];
      if (!b) return;
      const variant = el.dataset.variant === "kurz" && b.kurz ? b.kurz : b.html;
      el.innerHTML = variant;
      el.classList.add("baustein");
    });
  };

  /* ---------- Tabs ---------- */
  HR.initTabs = function () {
    const btns = [...document.querySelectorAll(".tab-btn")];
    if (!btns.length) return;
    function show(id, push) {
      btns.forEach(b => b.classList.toggle("active", b.dataset.tab === id));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === id));
      if (push) history.replaceState(null, "", "#" + id);
    }
    btns.forEach(b => b.addEventListener("click", () => show(b.dataset.tab, true)));
    const initial = (location.hash || "").slice(1);
    if (initial && document.getElementById(initial) && document.getElementById(initial).classList.contains("tab-panel")) { show(initial, false); setTimeout(() => window.scrollTo(0, 0), 0); }
    else show(btns[0].dataset.tab, false);
    HR.showTab = id => show(id, true);
  };

  /* ---------- Kopieren ---------- */
  HR.copyText = async function (text, btn) {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; }
    } catch (e) { ok = false; }
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
    }
    if (btn) {
      const old = btn.dataset.label || btn.textContent;
      btn.dataset.label = old;
      btn.textContent = ok ? "✓ Kopiert" : "Bitte manuell markieren";
      btn.classList.toggle("copied", ok);
      setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1800);
    }
    return ok;
  };

  document.addEventListener("click", e => {
    const c = e.target.closest("[data-copy-target]");
    if (c) {
      const t = document.getElementById(c.dataset.copyTarget);
      if (t) HR.copyText(t.value !== undefined && t.tagName === "TEXTAREA" ? t.value : t.textContent, c);
    }
    const p = e.target.closest("[data-print]");
    if (p) HR.print(p.dataset.print);
    const x = e.target.closest("[data-expand]");
    if (x) {
      const box = document.getElementById(x.dataset.expand);
      if (box) { box.classList.toggle("expanded"); x.textContent = box.classList.contains("expanded") ? "Einklappen" : "Ganz anzeigen"; }
    }
  });

  /* ---------- Hinweis-Toast ---------- */
  HR.toast = function (msg) {
    let t = document.getElementById("hr-toast");
    if (!t) {
      t = document.createElement("div"); t.id = "hr-toast"; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(560px,92vw);background:#1e293b;color:#fff;padding:.8rem 1.1rem;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:.92rem;z-index:100";
      document.body.append(t);
    }
    t.textContent = msg; t.style.display = "block";
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = "none"; }, 6500);
  };
  HR.inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* ---------- Drucken ---------- */
  HR.print = function (what) {
    if (HR.inFrame) {
      HR.toast("In dieser Vorschau ist Drucken gesperrt. Auf edu-mrh.de bzw. beim direkten Öffnen der Datei im Browser funktioniert der Button (Druckansicht ist vorbereitet).");
      return;
    }
    document.body.classList.remove("print-kurz", "print-lang");
    if (what) document.body.classList.add("print-" + what);
    const clean = () => { document.body.classList.remove("print-kurz", "print-lang"); window.removeEventListener("afterprint", clean); };
    window.addEventListener("afterprint", clean);
    window.print();
  };

  /* ---------- HTML → Markdown (für Wissensdateien) ---------- */
  HR.toMarkdown = function (el) {
    const out = [];
    const txt = n => (n.textContent || "").replace(/\s+/g, " ").trim();
    function walk(node, depth) {
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      if (node.classList.contains("no-print") || node.classList.contains("no-export") || tag === "script" || tag === "button" || tag === "nav") return;
      if (/^h[1-6]$/.test(tag)) { out.push("\n" + "#".repeat(Math.min(6, +tag[1])) + " " + txt(node) + "\n"); return; }
      if (tag === "p") { const t = txt(node); if (t) out.push(t + "\n"); return; }
      if (tag === "ul" || tag === "ol") {
        let i = 1;
        [...node.children].forEach(li => { if (li.tagName.toLowerCase() === "li") out.push("  ".repeat(depth) + (tag === "ol" ? (i++) + ". " : "- ") + txt(li)); });
        out.push("");
        return;
      }
      if (tag === "table") {
        [...node.querySelectorAll("tr")].forEach((tr, idx) => {
          const cells = [...tr.children].map(c => txt(c).replace(/\|/g, "/"));
          out.push("| " + cells.join(" | ") + " |");
          if (idx === 0) out.push("|" + cells.map(() => " --- ").join("|") + "|");
        });
        out.push("");
        return;
      }
      if (tag === "dl") {
        const kids = [...node.children];
        for (let i = 0; i < kids.length; i++) {
          if (kids[i].tagName.toLowerCase() === "dt") out.push("**" + txt(kids[i]) + "** " + (kids[i + 1] ? txt(kids[i + 1]) : ""));
        }
        out.push("");
        return;
      }
      [...node.children].forEach(ch => walk(ch, depth));
      if (!node.children.length && ["div", "span", "strong", "em"].includes(tag)) { const t = txt(node); if (t) out.push(t + "\n"); }
    }
    walk(el, 0);
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  };

  HR.download = async function (filename, text, type = "text/markdown") {
    if (HR.inFrame && window.claude && window.claude.use) {
      try {
        const dl = await window.claude.use("downloads");
        if (dl) { await dl.save({ filename, data: text }); return; }
      } catch (e) { /* Fallback unten */ }
      const ok = await HR.copyText(text);
      HR.toast(ok ? "Download ist hier nicht möglich – der Inhalt wurde stattdessen in die Zwischenablage kopiert. In Word oder einen Editor einfügen und als " + filename + " speichern."
                  : "Download ist in dieser Vorschau nicht möglich.");
      return;
    }
    const blob = new Blob([text], { type: type + ";charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  HR.sourceList = function (list) {
    return list.map(s => `<li><a href="${s.u}" target="_blank" rel="noopener">${s.t}</a></li>`).join("");
  };

  /* ---------- Bibliothek ---------- */
  HR.renderCatalog = function (el) {
    const statusBadge = s => s === "ok" ? `<span class="badge badge-ok">✓ geprüft</span>`
      : s === "draft" ? `<span class="badge badge-draft">Entwurf zur Prüfung</span>`
      : `<span class="badge badge-planned">angelegt</span>`;
    el.innerHTML = HR.groups.map(g => {
      const items = HR.catalog.filter(t => t.group === g.id);
      return `<div class="group-title"><h2>${g.title}</h2><span>${g.sub}</span></div>
      <div class="grid grid-3">${items.map(t => {
        const href = t.href || ("geplant.html#" + t.id);
        return `<a class="card topic-card ${t.status === "planned" ? "planned" : ""}" href="${href}">
          <div class="title">${t.title}</div>
          <div class="desc">${t.desc}</div>
          <div class="chips">${statusBadge(t.status)}${t.krise ? ` <span class="badge badge-danger">Krisenbox</span>` : ""}</div>
        </a>`;
      }).join("")}</div>`;
    }).join("");
  };

  /* ---------- Platzhalterseite ---------- */
  HR.renderPlanned = function (el) {
    const id = (location.hash || "").slice(1);
    const t = HR.catalog.find(x => x.id === id);
    if (!t) { el.innerHTML = `<div class="card"><p>Thema nicht gefunden. <a href="index.html">Zur Bibliothek</a></p></div>`; return; }
    const g = HR.groups.find(x => x.id === t.group);
    document.title = t.title + " – Handreichungen";
    el.innerHTML = `
      <p><a href="index.html">← Bibliothek</a></p>
      <div class="topic-head"><div><h1>${t.title}</h1>
        <div class="meta"><span class="badge badge-planned">angelegt – noch nicht ausgearbeitet</span><span class="badge">${g ? g.title : ""}</span>${t.krise ? `<span class="badge badge-danger">Krisenbox relevant</span>` : ""}</div></div></div>
      <p class="muted">${t.desc}</p>
      <div class="grid grid-2" style="margin-top:1.2rem">
        <div class="card">
          <h3>Diese Handreichung ist geplant</h3>
          <p>Sie wird nach demselben Muster wie <a href="adhs.html">ADHS</a>, <a href="depression.html">Depression</a> und <a href="lrs.html">LRS</a> erstellt: Kurzfassung mit Einordnungstabelle, ausführliche Fassung mit zehn Kapiteln, KI-Begleiter – und erst nach Prüfung durch die Schulpsychologie freigegeben.</p>
          <p>Bis dahin kannst du dir mit dem Prompt-Generator eine <strong>vorläufige</strong> Handreichung erstellen lassen. Sie ist nicht geprüft.</p>
          <a class="btn btn-primary" href="generator.html#thema=${encodeURIComponent(t.title)}" onclick="try{sessionStorage.setItem('hr-thema', ${JSON.stringify(t.title).replace(/"/g, "&quot;")})}catch(e){}">Mit dem Prompt-Generator erstellen →</a>
        </div>
        <div>${t.krise ? `<div data-baustein="krisenbox"></div>` : ""}<div data-baustein="ansprechpartner" data-variant="kurz"></div></div>
      </div>`;
    HR.renderBausteine(el);
  };

  document.addEventListener("DOMContentLoaded", () => {
    HR.renderBausteine();
    HR.initTabs();
  });
})();
