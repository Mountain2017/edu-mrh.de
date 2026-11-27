/* Prompt-Generator für beliebige Themen – überarbeitete Fassung des Prompts der Schulpsychologie */
window.HR = window.HR || {};

(function () {

  const FOKUS = {
    beide: "5–13 (Unter-, Mittel- und Oberstufe)",
    sek1: "5–11 (Unter- und Mittelstufe)",
    sek2: "12–13 (Oberstufe / Qualifikationsphase)"
  };

  /* ---------- Bausteine des Prompts ---------- */
  function quellenRegel(web) {
    return web
      ? "Du kannst im Internet suchen. Nenne am Ende jedes Kapitels 2–4 Quellen mit direktem Link – aber ausschließlich Seiten, die du in diesem Gespräch tatsächlich aufgerufen hast. Bevorzuge die Quellenliste unten sowie Ministerien, ISB, Staatliche Schulberatung, KMK, Universitäten und Universitätskliniken, medizinische Fachgesellschaften (AWMF-Leitlinien) und staatlich geförderte Einrichtungen. Keine Foren, Blogs, Ratgeberportale mit Werbung oder kommerziellen Anbieter."
      : "Du hast keinen Internetzugang. Erfinde keine Links und keine Dokumenttitel. Links dürfen ausschließlich aus der Quellenliste unten stammen. Weitere seriöse Einrichtungen darfst du nur mit ihrem Namen nennen und kennzeichnest sie mit „(Link bitte selbst prüfen)“. Nenne am Ende jedes Kapitels 1–3 passende Quellen nach dieser Regel.";
  }

  function quellenPool() {
    return "GEPRÜFTE QUELLENLISTE (Links am " + HR.stand + " aufgerufen):\n" +
      HR.sources.allgemein.map(s => "- " + s.t + ": " + s.u).join("\n");
  }

  function regeln(o) {
    return `# Verbindliche Regeln
1. Schulisches Handeln steht im Mittelpunkt. Praxisnähe hat Vorrang vor wissenschaftlicher Detailtiefe.
2. Keine Diagnostik und keine Therapie: keine Diagnose-Checklisten, keine Selbsttests, keine Empfehlungen zu Medikamenten oder Therapieformen. Beschreibe Beobachtungen statt Etiketten („zeigt …“ statt „ist …“).
3. Sprache: sachlich, verständlich, wertschätzend, ressourcenorientiert und handlungsorientiert. Personenzentriert („Schülerinnen und Schüler mit …“), keine abwertenden, pathologisierenden oder dramatisierenden Begriffe.
4. Fakten: Nenne Zahlen nur, wenn sie wissenschaftlich gut gesichert sind – gerundet und mit „etwa“. Wenn Fachleute uneinig sind oder du unsicher bist, schreibe das ausdrücklich. Erfinde keine Studien, Programme, Zitate, Paragraphen, Institutionen oder Ansprechpersonen.
5. Schulrecht: Verwende ausschließlich den geprüften Rechtsrahmen unten. Mache keine weiteren Aussagen zu Paragraphen, Fristen, Zuständigkeiten oder Einzelfallentscheidungen, sondern setze an diesen Stellen den Verweis [→ Baustein „Nachteilsausgleich & Notenschutz“].
6. Krisen: Schreibe keine eigenen Notfallabläufe. Wenn das Thema mit Selbst- oder Fremdgefährdung verbunden sein kann, nenne nur die themenspezifischen Warnzeichen und setze den Verweis [→ Baustein „Krisenbox“].
7. Ansprechpersonen: Nenne Rollen (Schulpsychologie, Beratungslehrkraft, Klassenleitung, Schulleitung, Staatliche Schulberatung), keine Namen oder Telefonnummern, und setze [→ Baustein „Ansprechpersonen“].
8. Form: überwiegend Fließtext; Aufzählungen nur, wo sie der Übersicht dienen. Gib konkrete Beispiele aus dem Schulalltag (Unterricht, Pause, Gruppenarbeit, Schulaufgabe/Stegreifaufgabe, Referat, Exkursion) für die Jahrgangsstufen ${FOKUS[o.fokus]}. Begründe jede Handlungsempfehlung in einem Satz. Gliedere mit Markdown-Überschriften genau wie vorgegeben.
9. Quellen: ${quellenRegel(o.web)}
10. Wenn ein Abschnitt für dieses Thema nicht sinnvoll ist, sage das kurz und begründe es, statt Inhalte zu erfinden.`;
  }

  function auftrag(o, generic) {
    const thema = generic ? "das Thema, das die Lehrkraft nennt" : `»${o.thema}«`;
    return `# Auftrag
Du erstellst eine praxisorientierte, fachlich fundierte Handreichung für Lehrkräfte an bayerischen Gymnasien zum Thema ${thema}.
Zielgruppe sind Lehrkräfte ohne medizinische, psychologische oder therapeutische Ausbildung (Jahrgangsstufen ${FOKUS[o.fokus]}).
Die Handreichung soll Lehrkräften helfen, das Thema grundlegend zu verstehen, schulische Auswirkungen einzuordnen, Unterstützungsbedarf zu erkennen, angemessen zu kommunizieren, Unterricht unterstützend zu gestalten, faire Leistungsanforderungen zu ermöglichen und die schulischen Unterstützungsangebote zu kennen.${o.anlass === "konkret" ? "\nAnlass ist eine konkrete (anonymisierte) Situation in einer Klasse. Bleibe trotzdem allgemein und stelle keine Vermutungen über einzelne Personen an." : ""}`;
  }

  const KAPITEL = [
    null,
    "## 1. Die Thematik verstehen\nDefinition (mit Fachbegriff und – nur wenn sicher bekannt – ICD-11-Bezeichnung), typische Merkmale, mögliche Ursachen und Einflussfaktoren (Zusammenspiel mehrerer Faktoren; verbreitete Irrtümer kurz richtigstellen), Verlauf und Prognose, häufige Begleiterkrankungen, Auswirkungen auf Aufmerksamkeit, Konzentration, Lernen, Motivation, Leistungsfähigkeit und soziale Teilhabe.",
    "## 2. Beobachtbare Hinweise im Schulalltag\nWas Lehrkräfte im Unterricht, in Pausen und Übergängen, bei Gruppenarbeiten und bei Leistungsnachweisen wahrnehmen können; Unterschiede zwischen Mittel- und Oberstufe. Beobachtungen statt Diagnosen, keine pathologisierenden Aussagen. Ergänze: Einzelne Merkmale beweisen nichts – entscheidend sind Muster über Zeit und Situationen. Füge 3–4 Sätze an, wie Beobachtungen sachlich dokumentiert werden (Datum, Situation, Verhalten, Häufigkeit).",
    "## 3. Stärken und Ressourcen\nMögliche Stärken, Potenziale, Schutzfaktoren und Ressourcen sowie konkrete Möglichkeiten, diese im Schulalltag zu fördern.",
    "## 4. Kommunikation mit Schülerinnen und Schülern\nGrundhaltung, hilfreiche Kommunikationsstrategien, typische Herausforderungen. Gib 6–8 wörtliche Gesprächsformulierungen, darunter mindestens zwei für ein erstes Gespräch.",
    "## 5. Unterrichtsgestaltung und Klassenführung\nKonkrete pädagogische Unterstützungsmaßnahmen, jeweils mit kurzer Begründung, warum sie helfen können. Danach ein Praxiskasten:\n### Praxiskasten: 15 sofort umsetzbare Maßnahmen für den Unterricht\n(nummeriert 1–15, je ein Satz, ohne Wiederholungen)",
    "## 6. Typische Stolpersteine im Schulalltag\n4–6 Stolpersteine. Für jeden als Unterüberschrift: Warum kann dies problematisch sein? Woran könnten Schwierigkeiten erkennbar werden? Welche pädagogischen Handlungsmöglichkeiten gibt es?",
    "## 7. Schulische Veranstaltungen\nKlassenfahrten, Exkursionen, Wandertage, Projektwochen und Praktika: themenspezifische Vorbereitung, Unterstützungsmöglichkeiten, Kommunikation und Notfallplanung. Allgemeine Punkte (Medikamente, Notfallkontakte, Abholregelung) nur als Verweis [→ Baustein „Schulveranstaltungen“].",
    "## 8. Zusammenarbeit mit Eltern\nMöglichkeiten der Zusammenarbeit, typische Hindernisse, 4–6 wörtliche Formulierungen für Elterngespräche. Verweis [→ Baustein „Elterngespräche“].",
    "## 9. Leistungsnachweise und Prüfungen\nTypische Herausforderungen, individuelle Unterstützung, ob und unter welchen Voraussetzungen Nachteilsausgleich oder Notenschutz überhaupt in Betracht kommen – ausschließlich im Rahmen des geprüften Rechtsrahmens –, Hinweise auf schulische Beratungsangebote. Verweis [→ Baustein „Nachteilsausgleich & Notenschutz“].",
    "## 10. Weiterführende Informationen\n5–8 seriöse, fachlich anerkannte Informationsquellen nach der Quellenregel, jeweils mit einem Satz, wofür sie nützlich sind (für Lehrkräfte, für Eltern, für Jugendliche)."
  ];

  function kurzForm(thema) {
    return `# ${thema} – Kurzfassung
## Einordnung auf einen Blick
Tabelle mit zwei Spalten (Merkmal | Einordnung) und genau diesen Zeilen: Fachbezeichnung (ggf. ICD-11) · Art der Störung · Häufigkeit (etwa) · Kernmerkmale · Typischer Beginn und Verlauf · Häufige Begleitprobleme · Diagnose und Behandlung durch · Schulrechtlicher Rahmen in Bayern · Erste Ansprechperson an der Schule
## Was ist das?
3–4 Sätze in einfacher Sprache.
## Woran merke ich es vielleicht?
5–7 beobachtbare Hinweise als Liste, danach ein Satz: Einzelne Merkmale beweisen nichts.
## 5 Dinge, die helfen
nummeriert, je: Maßnahme – kurze Begründung
## 3 Dinge, die ich vermeiden sollte
nummeriert, je mit kurzer Begründung
## So kann ich ein Gespräch beginnen
2 wörtliche Formulierungen
## Leistungsnachweise – was ist möglich?
2–4 Sätze, nur im Rahmen des geprüften Rechtsrahmens
## An wen wende ich mich?
[→ Baustein „Ansprechpersonen“]
## Wenn es akut wird
Nur wenn Selbst- oder Fremdgefährdung möglich ist: 2–3 themenspezifische Warnzeichen und [→ Baustein „Krisenbox“]. Sonst diesen Abschnitt weglassen.

Umfang: höchstens etwa 900 Wörter (2–3 Druckseiten).`;
  }

  const SELBSTPRUEFUNG = `Prüfe jetzt deinen gesamten bisherigen Text kritisch anhand dieser Fragen:
1. Gibt es diagnostische Formulierungen oder Etiketten über Personen?
2. Gibt es Empfehlungen zu Medikamenten oder Therapieformen?
3. Gibt es Zahlen ohne „etwa“ oder Zahlen, bei denen du nicht sicher bist?
4. Gibt es Aussagen zu Schulrecht, Fristen oder Zuständigkeiten, die über den geprüften Rechtsrahmen hinausgehen?
5. Gibt es Links, die nicht aus der Quellenliste stammen oder die du nicht tatsächlich aufgerufen hast?
6. Gibt es abwertende, dramatisierende oder pathologisierende Sprache?
7. Fehlt ein Verweis auf die Krisenbox, obwohl Gefährdung möglich ist?
Liste jede Fundstelle kurz auf (Kapitel, Problem) und gib danach nur die korrigierten Absätze aus. Wenn du nichts findest, schreibe „Keine Auffälligkeiten gefunden“ und nenne die zwei Aussagen, bei denen du dir am wenigsten sicher bist.`;

  function header(o, generic) {
    return [auftrag(o, generic), regeln(o), HR.rechtsrahmenPrompt, quellenPool()].join("\n\n");
  }

  /* ---------- Schrittfolgen ---------- */
  HR.buildSteps = function (o) {
    const h = header(o, false);
    const steps = [];
    if (o.mode === "komplett") {
      steps.push({ title: "Teil A der ausführlichen Fassung (Kapitel 1–4)", hint: "Kompletten Text als erste Nachricht einfügen.",
        text: `${h}\n\n# Gliederung der ausführlichen Fassung (Kapitel 1–10)\n${KAPITEL.slice(1).map(k => k.split("\n")[0]).join("\n")}\n\n# Schritt 1 von 5\nWir arbeiten in mehreren Schritten. Schreibe jetzt NUR die Überschrift „# ${o.thema} – ausführliche Fassung“ und Teil A: Kapitel 1 bis 4.\n\n${KAPITEL.slice(1, 5).join("\n\n")}\n\nHöre nach Kapitel 4 auf. Keine Zusammenfassung am Ende.` });
      steps.push({ title: "Teil B (Kapitel 5–7)", hint: "Nach der Antwort auf Schritt 1 einfügen.",
        text: `# Schritt 2 von 5\nSchreibe jetzt Teil B: Kapitel 5 bis 7. Halte dich weiter an alle Regeln aus Schritt 1 und wiederhole nichts aus Teil A.\n\n${KAPITEL.slice(5, 8).join("\n\n")}\n\nHöre nach Kapitel 7 auf.` });
      steps.push({ title: "Teil C (Kapitel 8–10)", hint: "Nach der Antwort auf Schritt 2 einfügen.",
        text: `# Schritt 3 von 5\nSchreibe jetzt Teil C: Kapitel 8 bis 10. Halte dich weiter an alle Regeln aus Schritt 1.\n\n${KAPITEL.slice(8).join("\n\n")}` });
      steps.push({ title: "Kurzfassung verdichten", hint: "Die Kurzfassung entsteht aus der ausführlichen Fassung – so widersprechen sich beide nicht.",
        text: `# Schritt 4 von 5\nVerdichte die ausführliche Fassung jetzt zu einer Kurzfassung zum schnellen Nachschlagen. Verwende ausschließlich Inhalte, die bereits in der ausführlichen Fassung stehen – keine neuen Fakten. Halte dich exakt an diese Form:\n\n${kurzForm(o.thema)}` });
      steps.push({ title: "Selbstprüfung", hint: "Lässt die KI ihre eigenen Schwachstellen markieren.", text: "# Schritt 5 von 5\n" + SELBSTPRUEFUNG });
    } else if (o.mode === "kurz") {
      steps.push({ title: "Faktengerüst", hint: "Kompletten Text als erste Nachricht einfügen.",
        text: `${h}\n\n# Schritt 1 von 3\nSammle als Grundlage für eine Kurzfassung zunächst stichpunktartig die Kerninformationen – je 3–6 Stichpunkte zu:\n${KAPITEL.slice(1, 10).map(k => "- " + k.split("\n")[0].replace(/^## \d+\. /, "")).join("\n")}\nNoch keine Kurzfassung schreiben. Markiere unsichere Punkte mit (unsicher).` });
      steps.push({ title: "Kurzfassung", hint: "Nach der Antwort auf Schritt 1 einfügen.",
        text: `# Schritt 2 von 3\nErstelle jetzt aus dem Faktengerüst die Kurzfassung. Lass mit (unsicher) markierte Punkte weg. Halte dich weiter an alle Regeln aus Schritt 1 und exakt an diese Form:\n\n${kurzForm(o.thema)}` });
      steps.push({ title: "Selbstprüfung", hint: "Lässt die KI ihre eigenen Schwachstellen markieren.", text: "# Schritt 3 von 3\n" + SELBSTPRUEFUNG });
    } else {
      const k = Math.max(1, Math.min(10, +o.kapitel || 1));
      steps.push({ title: "Kapitel " + k, hint: "Kompletten Text als erste Nachricht einfügen.",
        text: `${h}\n\n# Aufgabe\nSchreibe NUR das folgende Kapitel der ausführlichen Fassung (Überschrift: „# ${o.thema}“):\n\n${KAPITEL[k]}` });
      steps.push({ title: "Selbstprüfung", hint: "Lässt die KI ihre eigenen Schwachstellen markieren.", text: SELBSTPRUEFUNG });
    }
    return steps;
  };

  /* ---------- Einmal einrichten: Handreichungs-Assistent ---------- */
  HR.buildAssistant = function (o) {
    const h = header(o, true);
    return `${h}

# Ablauf
Wenn eine Lehrkraft ein Thema nennt:
1. Stelle höchstens zwei kurze Rückfragen: Kurzfassung oder ausführliche Fassung? Schwerpunkt Mittelstufe, Oberstufe oder beides?
2. Ausführliche Fassung: Schreibe in drei Teilen – Teil A (Kapitel 1–4), Teil B (Kapitel 5–7), Teil C (Kapitel 8–10). Frage nach jedem Teil: „Soll ich mit dem nächsten Teil weitermachen?“ Biete danach an, die Kurzfassung daraus zu verdichten.
3. Kurzfassung: Sammle zuerst intern die Kerninformationen und schreibe dann die Kurzfassung in der festen Form.
4. Biete am Ende immer die Selbstprüfung an.
5. Wenn die Lehrkraft Namen oder erkennbare Details zu Schülerinnen und Schülern nennt, weise freundlich auf den Datenschutz hin und arbeite nur mit verallgemeinerten Angaben weiter.

# Gliederung der ausführlichen Fassung
${KAPITEL.slice(1).join("\n\n")}

# Feste Form der Kurzfassung
${kurzForm("[Thema]")}

# Selbstprüfung (auf Wunsch)
${SELBSTPRUEFUNG}`;
  };

  /* ---------- UI ---------- */
  HR.initGenerator = function () {
    const $ = id => document.getElementById(id);
    const toolWrap = $("tools");
    toolWrap.innerHTML = HR.tools.map((t, i) => `
      <div class="tool-option">
        <input type="radio" name="tool" id="tool-${t.id}" value="${t.id}" ${i === 0 ? "checked" : ""}>
        <label for="tool-${t.id}"><strong>${t.name}</strong><span>${t.anbieter}</span>
          <div class="chips">
            <span class="chip ${t.dsgvo === true ? "dsgvo" : ""}">${t.dsgvoLabel}</span>
            <span class="chip ${t.assistant ? "yes" : "no"}">Assistent</span>
            <span class="chip ${t.upload ? "yes" : "no"}">Datei-Upload</span>
            <span class="chip ${t.web ? "yes" : "no"}">Websuche</span>
          </div></label>
      </div>`).join("");

    const m = /thema=([^&]+)/.exec(location.hash);
    if (m) $("thema").value = decodeURIComponent(m[1]);
    else { try { const st = sessionStorage.getItem("hr-thema"); if (st) { $("thema").value = st; sessionStorage.removeItem("hr-thema"); } } catch (e) {} }

    function opts() {
      const tool = HR.tools.find(t => t.id === document.querySelector("input[name=tool]:checked").value);
      return {
        thema: ($("thema").value || "").trim() || "[Thema]",
        tool,
        web: $("web").checked,
        mode: document.querySelector("input[name=mode]:checked").value,
        kapitel: $("kapitel").value,
        fokus: $("fokus").value,
        anlass: $("anlass").value
      };
    }

    let lastTool = null;
    function render() {
      const o = opts();
      if (lastTool !== o.tool.id) { $("web").checked = !!o.tool.web; o.web = !!o.tool.web; lastTool = o.tool.id; }
      $("kapitel-wrap").classList.toggle("hidden", o.mode !== "kapitel");
      $("tool-info").innerHTML = `<strong>${o.tool.name}:</strong> ${o.tool.info}${o.tool.dsgvo === false ? ` <br><strong>Wichtig:</strong> keine Angaben zu realen Schülerinnen und Schülern.` : ""}`;

      const LIB_KEYS = { adhs: ["adhs", "ads ", "aufmerksamkeitsdefizit", "hyperaktiv"], depression: ["depress"], lrs: ["lrs", "legasthen", "lese", "rechtschreib"] };
      const q = " " + o.thema.toLowerCase() + " ";
      const inLib = HR.catalog.find(t => t.status !== "planned" && (LIB_KEYS[t.id] || []).some(k => q.includes(k)));
      $("lib-hint").innerHTML = inLib ? `💡 Zu <a href="${inLib.href}">${inLib.title}</a> gibt es bereits eine ausgearbeitete Handreichung in der Bibliothek – sie ist verlässlicher als ein neu erzeugter Text.` : "";
      $("lib-hint").classList.toggle("hidden", !inLib);

      // Variante A: Assistent
      const a = $("variant-assistant");
      if (o.tool.assistant) {
        a.classList.remove("hidden");
        $("assistant-text").textContent = HR.buildAssistant(o);
        $("assistant-steps").innerHTML = o.tool.steps.map(s => `<li>${s}</li>`).join("");
        $("assistant-name").textContent = "Handreichungs-Assistent: psychische Gesundheit (Gymnasium Bayern)";
      } else a.classList.add("hidden");

      // Variante B: Schritte
      const steps = HR.buildSteps(o);
      $("steps-out").innerHTML = steps.map((s, i) => `
        <div class="prompt-box" id="pb-${i}">
          <header><div><h4>Schritt ${i + 1}: ${s.title}</h4><p>${s.hint}</p></div>
            <div class="toolbar"><button class="btn btn-sm" data-expand="pb-${i}">Ganz anzeigen</button><button class="btn btn-sm btn-primary" data-copy-target="p-${i}">Kopieren</button></div></header>
          <pre id="p-${i}"></pre>
        </div>`).join("");
      steps.forEach((s, i) => { $("p-" + i).textContent = s.text; });
      $("variant-b-title").textContent = o.tool.assistant ? "Variante B: Ohne Assistent – Prompts nacheinander einfügen" : "Prompts nacheinander einfügen";
    }

    document.querySelectorAll("#gen-form input, #gen-form select").forEach(el => el.addEventListener("input", render));
    document.querySelectorAll("#gen-form input[type=radio]").forEach(el => el.addEventListener("change", render));
    render();
  };
})();
