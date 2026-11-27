/* Feste Bausteine – einmal geschrieben, von der Schulpsychologie geprüft,
   in allen Handreichungen identisch eingebunden (data-baustein="…").
   Gelb markierte Felder (.fill) sind schulspezifisch auszufüllen. */
window.HR = window.HR || {};

HR.bausteine = {

  /* ===================== KRISENBOX ===================== */
  krisenbox: {
    title: "Krisenbox: Wenn es akut wird",
    icon: "🚨",
    html: `
<div class="krisenbox">
  <h3>🚨 Krisenbox: Wenn es akut wird</h3>
  <p><strong>Anlass:</strong> Äußerungen oder Hinweise auf Suizidgedanken, Selbstverletzung, akute Selbst- oder Fremdgefährdung – unabhängig vom Krankheitsbild.</p>
  <h4>Mögliche Warnzeichen</h4>
  <ul>
    <li>direkte oder indirekte Äußerungen („Es wäre besser, wenn ich nicht mehr da wäre“, „Bald ist das eh egal“), auch in Texten, Zeichnungen, Chats</li>
    <li>Abschiedsverhalten: Verschenken persönlicher Dinge, Abschiedsnachrichten, Regeln „letzter Dinge“</li>
    <li>auffällige Hoffnungslosigkeit, starker Rückzug – oder eine plötzliche, unerklärliche Ruhe nach einer schweren Krise</li>
    <li>frische oder auffällig versteckte Verletzungen</li>
    <li>Drohungen gegenüber anderen</li>
  </ul>
  <h4>Was ich als Lehrkraft tue</h4>
  <ol>
    <li><strong>Ernst nehmen und ansprechen.</strong> Ruhig und direkt nachfragen, z. B. „Ich mache mir Sorgen um dich. Denkst du daran, dir etwas anzutun oder dir das Leben zu nehmen?“ Direktes Nachfragen entlastet und verstärkt Suizidgedanken nicht.</li>
    <li><strong>Keine Verschwiegenheit versprechen.</strong> „Das kann ich nicht für mich behalten. Ich hole Unterstützung und sage dir, was ich tue.“</li>
    <li><strong>Bei akuter Gefahr nicht allein lassen</strong> und Aufsicht sicherstellen. Bei Lebensgefahr sofort <strong>112</strong>.</li>
    <li><strong>Sofort informieren:</strong> Schulleitung und Schulpsychologie (<span class="fill">Name · Durchwahl</span>) – nach dem schulischen Notfallplan (<span class="fill">Fundort Notfallordner</span>). Die Schulleitung entscheidet über das weitere Vorgehen, auch über die Information der Eltern.</li>
    <li><strong>Dokumentieren:</strong> Datum, Uhrzeit, Äußerungen möglichst wörtlich, getroffene Maßnahmen.</li>
    <li><strong>Auch an sich denken:</strong> Nachgespräch mit Schulpsychologie oder Kollegium in Anspruch nehmen.</li>
  </ol>
  <div class="numbers">
    <div class="num"><strong>112</strong>Notruf bei akuter Lebensgefahr</div>
    <div class="num"><strong>0800 655 3000</strong>Krisendienste Bayern – rund um die Uhr, kostenfrei, auch für Angehörige und Fachkräfte</div>
    <div class="num"><strong>116 111</strong>Nummer gegen Kummer (Kinder und Jugendliche), Mo–Sa 14–20 Uhr</div>
    <div class="num"><strong>0800 111 0 111 · 0800 111 0 222</strong>TelefonSeelsorge, rund um die Uhr</div>
  </div>
  <p class="muted" style="margin-top:.7rem;font-size:.85rem">Schulische Ebene: Das schulische Krisenteam und bei Bedarf das Kriseninterventionsteam der bayerischen Schulpsychologinnen und -psychologen (KIBBS) werden über die Schulleitung eingebunden.</p>
</div>`,
    kurz: `
<div class="krisenbox">
  <h3>🚨 Wenn es akut wird (Suizidgedanken, Selbstverletzung, Gefährdung)</h3>
  <p style="margin:.2rem 0"><strong>Ernst nehmen · direkt ansprechen · keine Verschwiegenheit versprechen · bei akuter Gefahr nicht allein lassen · sofort Schulleitung und Schulpsychologie (<span class="fill">Name · Durchwahl</span>) informieren · dokumentieren.</strong></p>
  <div class="numbers">
    <div class="num"><strong>112</strong>bei Lebensgefahr</div>
    <div class="num"><strong>0800 655 3000</strong>Krisendienste Bayern, 24/7</div>
    <div class="num"><strong>116 111</strong>Nummer gegen Kummer</div>
  </div>
</div>`
  },

  /* ===================== ANSPRECHPERSONEN ===================== */
  ansprechpartner: {
    title: "Ansprechpersonen",
    icon: "🤝",
    html: `
<div class="card">
  <h3>🤝 An wen wende ich mich?</h3>
  <table class="simple">
    <tr><th style="width:32%">An unserer Schule</th><th>Wofür</th></tr>
    <tr><td><strong>Schulpsychologie</strong><br><span class="fill">Name · Sprechzeit · Kontakt</span></td><td>Beratung bei Sorgen um Schülerinnen und Schüler, schulpsychologische Stellungnahmen (z. B. LRS), Gesprächsbegleitung, Krisen</td></tr>
    <tr><td><strong>Beratungslehrkraft</strong><br><span class="fill">Name · Kontakt</span></td><td>Schullaufbahn, Vorrücken, Wiederholen, Ersatzprüfungen</td></tr>
    <tr><td><strong>Klassenleitung</strong></td><td>bündelt Beobachtungen, koordiniert Maßnahmen und den Kontakt zu den Eltern</td></tr>
    <tr><td><strong>Schulleitung / Oberstufenkoordination</strong><br><span class="fill">Name</span></td><td>Anträge auf Nachteilsausgleich und Notenschutz, Krisenfälle, Wiedereingliederung</td></tr>
    <tr><td><strong>Schulsozialarbeit</strong> (falls vorhanden)<br><span class="fill">Name · Kontakt</span></td><td>niedrigschwellige Gespräche, Vermittlung zur Jugendhilfe</td></tr>
  </table>
  <table class="simple">
    <tr><th style="width:32%">Außerhalb der Schule</th><th>Wofür</th></tr>
    <tr><td><a href="https://www.schulberatung.bayern.de/staatliche-schulberatungsstellen/muenchen/ansprechpersonen" target="_blank" rel="noopener">Staatliche Schulberatungsstelle München</a> (Stadt und Landkreis)</td><td>schulartübergreifende Beratung für Lehrkräfte, Eltern und Schüler</td></tr>
    <tr><td><a href="https://www.krisendienste.bayern/" target="_blank" rel="noopener">Krisendienste Bayern</a> · 0800 655 3000</td><td>psychische Krisen – rund um die Uhr, auch für Angehörige und Fachkräfte</td></tr>
    <tr><td><span class="fill">Erziehungsberatungsstelle im Landkreis</span></td><td>Beratung für Familien</td></tr>
    <tr><td>Kinder- und Jugendpsychiatrie, Kinder- und Jugendlichenpsychotherapie</td><td>Diagnostik und Behandlung – der Weg dorthin führt über die Eltern bzw. den Haus- oder Kinderarzt</td></tr>
  </table>
</div>`,
    kurz: `
<div class="kurz-block contacts">
  <h3>🤝 An wen wende ich mich?</h3>
  <p style="margin:.2rem 0"><strong>Schulpsychologie:</strong> <span class="fill">Name · Sprechzeit · Kontakt</span> &nbsp;·&nbsp; <strong>Beratungslehrkraft:</strong> <span class="fill">Name</span> &nbsp;·&nbsp; <strong>Klassenleitung</strong> bündelt Beobachtungen &nbsp;·&nbsp; <strong>Schulleitung</strong> bei Anträgen und Krisen &nbsp;·&nbsp; extern: <a href="https://www.schulberatung.bayern.de/staatliche-schulberatungsstellen/muenchen/ansprechpersonen" target="_blank" rel="noopener">Staatliche Schulberatungsstelle München</a></p>
</div>`
  },

  /* ===================== NACHTEILSAUSGLEICH ===================== */
  nta: {
    title: "Individuelle Unterstützung, Nachteilsausgleich, Notenschutz",
    icon: "⚖️",
    html: `
<div class="card">
  <h3>⚖️ Individuelle Unterstützung, Nachteilsausgleich, Notenschutz (Bayern)</h3>
  <p>Grundlage sind Art. 52 Abs. 5 BayEUG und §§ 31–36 BaySchO. Die Maßnahmen werden immer für die einzelne Schülerin bzw. den einzelnen Schüler festgelegt – nie pauschal für ein Krankheitsbild.</p>
  <table class="simple">
    <tr><th></th><th>Individuelle Unterstützung (§ 32)</th><th>Nachteilsausgleich (§ 33)</th><th>Notenschutz (§ 34)</th></tr>
    <tr><th>Was?</th><td>pädagogische, didaktisch-methodische und schulorganisatorische Maßnahmen, technische Hilfen; berührt die Leistungsfeststellung nicht</td><td>angepasste Prüfungsbedingungen; die wesentlichen Leistungsanforderungen bleiben gleich</td><td>Abweichung von den allgemeinen Bewertungsgrundsätzen – nur für die in § 34 abschließend genannten Beeinträchtigungen</td></tr>
    <tr><th>Beispiele</th><td>Sitzplatz, Pausenregelung, individuelle Erläuterung der Arbeitsanweisung, Visualisierung, differenzierte Hausaufgaben, Handzeichen</td><td>Arbeitszeitverlängerung bis zu ¼ (Ausnahme bis ½), zusätzliche Pausen, gesonderter Raum, Strukturierungshilfen, spezielle Arbeitsmittel, Austausch mündlicher und schriftlicher Leistungsfeststellungen</td><td>z. B. bei LRS Verzicht auf die Bewertung der Rechtschreibung bzw. des Vorlesens; bei Hör-, Seh- oder körperlich-motorischer Beeinträchtigung, Mutismus oder Autismus mit kommunikativer Sprachstörung</td></tr>
    <tr><th>Wer entscheidet? (Gymnasium)</th><td>die Lehrkraft</td><td colspan="2">bei LRS die Schulleitung; in allen anderen Fällen die Schulaufsicht (Antrag über die Schule)</td></tr>
    <tr><th>Voraussetzung</th><td>keine formale</td><td colspan="2">Antrag der Erziehungsberechtigten bzw. volljährigen Schüler in Textform mit fachärztlichem Zeugnis (Art, Umfang, Dauer); bei LRS genügt stets eine schulpsychologische Stellungnahme; bei offensichtlicher Beeinträchtigung Nachteilsausgleich auch ohne Antrag möglich</td></tr>
    <tr><th>Zeugnis</th><td>–</td><td>keine Bemerkung</td><td>Bemerkung zur nicht bewerteten Leistung – ohne Nennung der Beeinträchtigung</td></tr>
  </table>
  <p><strong>Gut zu wissen:</strong></p>
  <ul>
    <li>Für psychische Erkrankungen wie Depression oder ADHS sieht § 34 <strong>keinen Notenschutz</strong> vor. Möglich sind individuelle Unterstützung und – nach Prüfung im Einzelfall – Nachteilsausgleich.</li>
    <li>Bei nur <strong>vorübergehender</strong> Beeinträchtigung (z. B. akute Erkrankung) wird regelmäßig auf einen <strong>Nachtermin</strong> verwiesen.</li>
    <li>Ein Verzicht auf bewilligten Nachteilsausgleich oder Notenschutz ist in Textform möglich; der Verzicht auf Notenschutz spätestens in der ersten Woche nach Unterrichtsbeginn.</li>
    <li>Bei einem Schulwechsel prüft die aufnehmende Schule neu. Die Erziehungsberechtigten sind angemessen einzubinden.</li>
    <li>Bei Fragen zur <strong>Abiturprüfung</strong> früh Oberstufenkoordination und Schulleitung einbeziehen.</li>
  </ul>
  <p class="sources"><strong>Quellen:</strong> <a href="https://www.gesetze-bayern.de/Content/Document/BaySchO2016-32" target="_blank" rel="noopener">BaySchO §§ 32–36</a> · <a href="https://www.isb.bayern.de/fileadmin/user_upload/Grundsatzabteilung/Individuelle_Foerderung/Individuelle_Unterstuetzung/Handbuch_Individuelle_Unterstuetzung_Nachteilsausgleich_Notenschutz_2024.pdf" target="_blank" rel="noopener">ISB-Handbuch (2024)</a> · Stand ${HR.stand} – ersetzt keine Prüfung im Einzelfall.</p>
</div>`
  },

  /* ===================== DATENSCHUTZ ===================== */
  datenschutz: {
    title: "Datenschutz und Schweigepflicht",
    icon: "🔒",
    html: `
<div class="card">
  <h3>🔒 Datenschutz und Schweigepflicht</h3>
  <ul>
    <li><strong>Gesundheitsdaten sind besonders geschützt.</strong> Informationen über eine Erkrankung bekommen nur die Personen, die sie für ihre Arbeit mit der Schülerin bzw. dem Schüler brauchen – und nur in Absprache mit den Erziehungsberechtigten bzw. der volljährigen Schülerin oder dem volljährigen Schüler.</li>
    <li><strong>Nicht in offene Kanäle:</strong> keine Diagnosen in Klassenchats, im allgemeinen Teams-Kanal oder in Notizen, die andere einsehen können.</li>
    <li><strong>Schulpsychologinnen und -psychologen</strong> unterliegen einer besonderen Schweigepflicht. Was ihnen anvertraut wird, geben sie nur mit Einverständnis weiter – deshalb erfahren Lehrkräfte nicht immer alles.</li>
    <li><strong>KI-Werkzeuge:</strong> niemals Namen, Klassenbezeichnungen in Verbindung mit seltenen Merkmalen, Fotos, Atteste oder Gutachten eingeben. Fälle so verfremden, dass niemand erkennbar ist („eine Schülerin der Mittelstufe …“). Das gilt auch für staatlich bereitgestellte Tools.</li>
  </ul>
</div>`
  },

  /* ===================== ELTERN ===================== */
  eltern: {
    title: "Elterngespräche – Grundsätze",
    icon: "👪",
    html: `
<div class="card">
  <h3>👪 Elterngespräche – Grundsätze</h3>
  <ol>
    <li><strong>Vorbereiten:</strong> Beobachtungen konkret und mit Datum notieren (Situation, Verhalten, Häufigkeit). Bei Bedarf vorher mit der Schulpsychologie sprechen oder sie zum Gespräch dazuholen.</li>
    <li><strong>Mit Stärken beginnen:</strong> Was gelingt? Was schätze ich an dem Kind?</li>
    <li><strong>Beobachten statt deuten:</strong> beschreiben, was ich sehe – keine Diagnose, keine Vermutung über Ursachen.</li>
    <li><strong>Fragen und zuhören:</strong> Wie erleben die Eltern ihr Kind zu Hause? Was hat schon geholfen?</li>
    <li><strong>Gemeinsame Ziele und kleine Schritte</strong> vereinbaren, Zuständigkeiten klären, Folgetermin festlegen.</li>
    <li><strong>Unterstützung aufzeigen:</strong> Schulpsychologie, Schulberatung; für Diagnostik und Behandlung den Haus- oder Kinderarzt.</li>
  </ol>
  <ul class="phrases">
    <li>„Mir ist in den letzten Wochen aufgefallen, dass … Wie erleben Sie das zu Hause?“</li>
    <li>„Ich kann und möchte nicht beurteilen, woran das liegt. Mir ist wichtig, dass wir gemeinsam schauen, was hilft.“</li>
    <li>„Was hat Ihrem Kind in ähnlichen Situationen schon einmal geholfen?“</li>
    <li>„Unsere Schulpsychologin kennt sich mit solchen Fragen gut aus. Wäre es für Sie in Ordnung, wenn wir sie einbeziehen?“</li>
  </ul>
</div>`
  },

  /* ===================== VERANSTALTUNGEN ===================== */
  veranstaltungen: {
    title: "Klassenfahrten, Exkursionen, Praktika – allgemein",
    icon: "🚌",
    html: `
<div class="card">
  <h3>🚌 Klassenfahrten, Exkursionen, Praktika – allgemein</h3>
  <p><strong>Leitgedanke:</strong> so viel Normalität wie möglich, so wenig Einschränkung wie nötig.</p>
  <ul>
    <li><strong>Vorgespräch</strong> mit Schülerin bzw. Schüler und Eltern: Was ist bei Fahrten bisher gut gelaufen, was schwierig? Welche Absprachen helfen?</li>
    <li><strong>Notfallkontakte</strong> und Erreichbarkeit der Eltern klären, ggf. Abholregelung vereinbaren.</li>
    <li><strong>Medikamente:</strong> Lehrkräfte sind zur Medikamentengabe nicht verpflichtet. Wer sie freiwillig übernimmt, tut das nur mit schriftlicher Vereinbarung mit den Erziehungsberechtigten, genauer ärztlicher Anweisung und nach den Vorgaben der Schule (<a href="https://uebergang.klinik.schule.bayern.de/schulrechtliches-wissen/medizinische-hilfsmassnahmen-im-unterricht/" target="_blank" rel="noopener">Hinweise zu medizinischen Hilfsmaßnahmen</a>).</li>
    <li><strong>Feste Ansprechperson</strong> im Begleitteam benennen; Rückzugsmöglichkeiten und Ruhezeiten einplanen; Zimmereinteilung bedenken.</li>
    <li><strong>Begleitteam informieren</strong> – nur so viel wie nötig und mit Einverständnis.</li>
    <li><strong>Praktika:</strong> Betriebe nur mit Einverständnis der Familie bzw. der volljährigen Schülerin oder des volljährigen Schülers über Besonderheiten informieren.</li>
  </ul>
</div>`
  },

  /* ===================== WIEDEREINGLIEDERUNG ===================== */
  rueckkehr: {
    title: "Rückkehr nach Klinikaufenthalt oder langer Krankheit",
    icon: "🔁",
    html: `
<div class="card">
  <h3>🔁 Rückkehr nach Klinikaufenthalt oder langer Krankheit</h3>
  <ul>
    <li><strong>Schulpsychologie einbinden</strong> – bei psychischen Erkrankungen ist das unverzichtbar. Die Schulleitung entscheidet über Maßnahmen in Abstimmung mit Schulpsychologie und ggf. Beratungslehrkraft.</li>
    <li><strong>Übergabe mit der Klinikschule</strong> (mit Einverständnis der Eltern) nutzen.</li>
    <li>Möglich sind z. B. eine <strong>stundenweise Rückkehr</strong>, ein vorübergehend <strong>reduzierter Stunden- und Lernplan</strong>, ein <strong>Zeitplan zum Nacharbeiten</strong> zentraler Inhalte und gestaffelte Nachtermine für Leistungsnachweise.</li>
    <li>Für regelmäßige Therapietermine kann vom Unterricht befreit werden (§ 20 BaySchO).</li>
    <li>Bei langer Abwesenheit (mehr als sechs Wochen) kann Hausunterricht in Betracht kommen.</li>
    <li>Die Klasse nur informieren, wenn die Schülerin bzw. der Schüler das möchte – und dann gemeinsam abgesprochen, was gesagt wird.</li>
  </ul>
  <p class="sources"><strong>Quelle:</strong> <a href="https://uebergang.klinik.schule.bayern.de/" target="_blank" rel="noopener">ISB: Übergang Klinik – Schule</a></p>
</div>`
  }
};
