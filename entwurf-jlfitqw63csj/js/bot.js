/* KI-Begleiter: erzeugt aus der geprüften Handreichung Anweisungen + Wissensdatei für das gewählte Tool */
window.HR = window.HR || {};

(function () {

  function bausteinMd(ids) {
    const tmp = document.createElement("div");
    tmp.innerHTML = ids.map(id => HR.bausteine[id] ? HR.bausteine[id].html : "").join("");
    tmp.querySelectorAll(".fill").forEach(f => { f.textContent = "[an der Schule erfragen]"; });
    return HR.toMarkdown(tmp);
  }

  function panelMd(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".no-export, .toolbar, .sidebar, .baustein").forEach(n => n.remove());
    clone.querySelectorAll(".fill").forEach(f => { f.textContent = "[an der Schule erfragen]"; });
    return HR.toMarkdown(clone);
  }

  HR.knowledge = function (topic, compact) {
    const head = `# Handreichung: ${topic.title}\nFür Lehrkräfte an bayerischen Gymnasien · Stand ${HR.stand} · ${HR.version} · Quelle: edu-mrh.de\n\n`;
    if (compact) {
      return head + "## TEIL 1: KURZFASSUNG\n\n" + panelMd("kurz-content") + "\n\n## TEIL 2: FESTE BAUSTEINE\n\n" + bausteinMd(["krisenbox", "ansprechpartner", "nta"]);
    }
    return head + "## TEIL 1: KURZFASSUNG\n\n" + panelMd("kurz-content") +
      "\n\n## TEIL 2: AUSFÜHRLICHE FASSUNG\n\n" + panelMd("lang-content") +
      "\n\n## TEIL 3: FESTE BAUSTEINE (gelten für alle Themen)\n\n" + bausteinMd(["krisenbox", "ansprechpartner", "nta", "datenschutz", "eltern", "veranstaltungen", "rueckkehr"]);
  };

  HR.botInstructions = function (topic, tool, withEmbedded) {
    const wissen = withEmbedded ? "die unten eingefügte Handreichung der Schule" : "die hochgeladene Wissensdatei (Handreichung der Schule)";
    return `# Rolle
Du bist der „Begleiter ${topic.title}“ für Lehrkräfte an einem bayerischen Gymnasium (Jahrgangsstufen 5–13). Du hilfst, Situationen im Schulalltag einzuordnen und pädagogische Handlungsmöglichkeiten zu finden. Deine Grundlage ist ${wissen}.

# Wissensgrundlage
- Stütze dich in erster Linie auf die Handreichung und verweise auf das passende Kapitel.
- Wenn du darüber hinausgehst, kennzeichne das mit „(allgemeines Fachwissen, nicht Teil der Handreichung)“.
- Schulrecht (Nachteilsausgleich, Notenschutz, Zuständigkeiten, Abitur): nur, was in der Handreichung steht. Alles Weitere: Verweis auf Schulleitung und Schulpsychologie.
- Nenne nur Links, die in der Handreichung stehen. Erfinde keine Links, Studien, Zahlen oder Ansprechpersonen.

# Grenzen
- Keine Diagnosen. Auf Fragen wie „Hat meine Schülerin ${topic.title}?“ erklärst du, dass das nur Fachleute klären können, und zeigst, was die Lehrkraft beobachten, dokumentieren und tun kann.
- Keine Empfehlungen zu Medikamenten oder Therapieformen.
- Datenschutz: Wenn Namen, Klassenbezeichnungen mit seltenen Merkmalen oder andere erkennbare Details genannt werden, bitte freundlich um Anonymisierung und arbeite nur mit den allgemeinen Angaben weiter.
- Krise: Bei jedem Hinweis auf Suizidgedanken, Selbstverletzung oder akute Selbst- oder Fremdgefährdung stellst du an den Anfang deiner Antwort die Krisenbox: ernst nehmen, direkt ansprechen, keine Verschwiegenheit versprechen, bei akuter Gefahr nicht allein lassen, sofort Schulleitung und Schulpsychologie informieren, bei Lebensgefahr 112, Krisendienste Bayern 0800 655 3000 (rund um die Uhr). Wäge nicht ab, ob es „wirklich ernst“ ist.
- Du ersetzt nicht das Gespräch mit der Schulpsychologie. Empfiehl es ausdrücklich, wenn eine Situation andauert, sich zuspitzt oder rechtliche Fragen berührt.

# Antwortformat
Bei Fallfragen („Was kann ich tun, wenn …?“):
1. **Einordnung** – 2–3 Sätze, ohne Diagnose
2. **Was ich jetzt tun kann** – 3–5 konkrete Schritte, je mit kurzer Begründung
3. **Formulierungsvorschlag** – wörtlich, für das Gespräch mit der Schülerin/dem Schüler oder den Eltern
4. **Wann ich Unterstützung hole** – wer, wann, wofür
Bei Wissensfragen: knapp und verständlich, mit Kapitelverweis.
Wenn wichtige Informationen fehlen (Jahrgangsstufe, seit wann, in welchen Situationen), stelle höchstens zwei Rückfragen.
Antworte auf Deutsch, kollegial, klar und ohne Fachjargon.

# Start
Begrüße die Lehrkraft beim ersten Kontakt mit einem Satz, erinnere kurz an den Datenschutz (keine Namen) und biete drei Beispielfragen an.`;
  };

  HR.initBot = function (topic) {
    const root = document.getElementById("bot-ui");
    const tools = HR.tools;
    root.innerHTML = `
      <p>Der Begleiter beantwortet Fragen auf Grundlage <strong>dieser Handreichung</strong> – zum Nachschlagen und vor allem zum Durchdenken konkreter, anonymisierter Situationen. Wähle dein Werkzeug; Anweisungen und Wissensdatei werden passend erzeugt.</p>
      <div class="callout warn"><strong>Datenschutz:</strong> Keine Namen, keine erkennbaren Details. Beispiel: „Ein Schüler meiner 8. Klasse …“ statt „Max aus der 8b …“.</div>
      <div class="tool-grid" id="bot-tools">${tools.map((t, i) => `
        <div class="tool-option"><input type="radio" name="bottool" id="bt-${t.id}" value="${t.id}" ${i === 0 ? "checked" : ""}>
          <label for="bt-${t.id}"><strong>${t.short}</strong><span>${t.assistant ? "eigener Assistent möglich" : "Start-Prompt pro Chat"}${t.dsgvo === false ? " · nur anonym" : t.dsgvo === "check" ? " · nach Freigabe" : ""}</span></label></div>`).join("")}
      </div>
      <div id="bot-out" style="margin-top:1rem"></div>`;

    function render() {
      const tool = tools.find(t => t.id === root.querySelector("input[name=bottool]:checked").value);
      const out = root.querySelector("#bot-out");
      const full = HR.knowledge(topic, false);
      const compact = HR.knowledge(topic, true);
      const kChars = n => "≈ " + Math.round(n / 1000) + ".000 Zeichen";
      let html = `<p class="callout violet"><strong>${tool.name}:</strong> ${tool.info}</p>`;
      html += `<div class="howto"><h4>So richtest du den Begleiter ein</h4><ol>${tool.steps.map(s => `<li>${s}</li>`).join("")}</ol>`;
      if (tool.assistant) html += `<p style="margin:.4rem 0 0"><strong>Name:</strong> Begleiter ${topic.title} · <strong>Kurzbeschreibung:</strong> Beantwortet Fragen von Lehrkräften zu ${topic.title} im Schulalltag auf Grundlage der Handreichung (edu-mrh.de). Keine Diagnosen, keine Namen eingeben.</p>`;
      html += `</div>`;

      if (tool.assistant) {
        html += box("bot-instr", "Anweisungen für den Assistenten", "in das Feld für Anweisungen / Rollenbeschreibung einfügen", HR.botInstructions(topic, tool, false));
        html += `<div class="card" style="margin:.9rem 0"><h4 style="margin-top:0">Wissensdatei</h4>
          <p class="muted">${tool.uploadHint || ""}</p>
          <div class="toolbar">
            <button class="btn ${tool.compactUpload ? "" : "btn-primary"}" id="dl-full">⬇ Ausführliche Wissensdatei (.md, ${kChars(full.length)})</button>
            <button class="btn ${tool.compactUpload ? "btn-primary" : ""}" id="dl-compact">⬇ Kompakte Wissensdatei (.md, ${kChars(compact.length)})</button>
          </div>
          <p class="muted" style="font-size:.85rem;margin-bottom:0">Falls das Tool keine .md-Dateien annimmt: Datei öffnen, Inhalt in Word einfügen und als .docx oder PDF speichern.</p></div>`;
      } else {
        html += `<div class="row" style="margin:.6rem 0"><div><label for="bot-size">Umfang der eingefügten Handreichung</label>
          <select id="bot-size"><option value="compact">kompakt: Kurzfassung + Krisenbox + Rechtsrahmen (${kChars(compact.length)})</option><option value="full">vollständig: inkl. ausführlicher Fassung (${kChars(full.length)})</option></select></div></div>`;
        html += `<div id="startbox"></div>`;
        if (tool.upload) html += `<p class="muted">Alternativ: Anweisungen als erste Nachricht und die <a href="#" id="dl-full2">ausführliche Wissensdatei</a> als Anhang.</p>`;
      }

      html += `<h4>Beispielfragen zum Ausprobieren</h4>` + topic.starters.map((s, i) =>
        `<div class="starter"><span id="st-${i}">${s}</span><button class="btn btn-sm" data-copy-target="st-${i}">Kopieren</button></div>`).join("");
      out.innerHTML = html;

      const dl = (compactFlag) => HR.download(`Wissensdatei_${topic.id}_${compactFlag ? "kompakt" : "ausfuehrlich"}.md`, compactFlag ? compact : full);
      const f = out.querySelector("#dl-full"); if (f) f.onclick = () => dl(false);
      const c = out.querySelector("#dl-compact"); if (c) c.onclick = () => dl(true);
      const f2 = out.querySelector("#dl-full2"); if (f2) f2.onclick = (e) => { e.preventDefault(); dl(false); };
      const size = out.querySelector("#bot-size");
      if (size) {
        const renderStart = () => {
          const k = size.value === "full" ? full : compact;
          out.querySelector("#startbox").innerHTML = box("bot-start", "Start-Prompt (als erste Nachricht in einen neuen Chat)", "enthält Anweisungen und Handreichung in einem", HR.botInstructions(topic, tool, true) + "\n\n# HANDREICHUNG (Wissensgrundlage)\n\n" + k + "\n\nBestätige kurz, dass du bereit bist.");
        };
        size.onchange = renderStart; renderStart();
      }
    }

    function box(id, title, hint, text) {
      const div = document.createElement("div");
      div.innerHTML = `<div class="prompt-box" id="pb-${id}"><header><div><h4>${title}</h4><p>${hint}</p></div>
        <div class="toolbar"><button class="btn btn-sm" data-expand="pb-${id}">Ganz anzeigen</button><button class="btn btn-sm btn-primary" data-copy-target="${id}">Kopieren</button></div></header><pre id="${id}"></pre></div>`;
      div.querySelector("pre").textContent = text;
      return div.innerHTML;
    }

    root.querySelectorAll("input[name=bottool]").forEach(r => r.addEventListener("change", render));
    render();
  };
})();
