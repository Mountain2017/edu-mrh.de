/* Zentrale Daten: KI-Tools, Themenkatalog, geprüfte Quellen.
   Stand der Recherche: 27.11.2026 – vor Veröffentlichung erneut prüfen. */
window.HR = window.HR || {};

HR.stand = "27.11.2026";
HR.version = "Prototyp 0.1 – zur fachlichen Prüfung";

/* ---------- KI-Werkzeuge ----------
   assistant: Tool erlaubt dauerhaft gespeicherte Anweisungen (Assistent/Bot)
   upload:    Tool erlaubt Datei-Upload als Wissensgrundlage
   web:       Tool kann (standardmäßig) im Internet suchen
   dsgvo:     true = schulisch/staatlich bereitgestellt bzw. datenschutzkonform nutzbar; "check" = nur nach Freigabe der Schule; false = privat */
HR.tools = [
  {
    id: "aischat",
    dsgvoLabel: "staatlich bereitgestellt",
    name: "AIS.chat (ehem. telli)",
    short: "AIS.chat",
    anbieter: "FWU, für bayerische Schulen über ByCS / VIDIS",
    dsgvo: true, assistant: true, upload: true, web: false,
    info: "Seit Dezember 2025 staatlich für bayerische Schulen bereitgestellt; die Schulleitung schaltet den Zugang frei. Eigene Assistenten mit Anweisungen und Dateien sind möglich und lassen sich mit Kolleginnen und Kollegen der Schule teilen.",
    uploadHint: "Die ausführliche Wissensdatei (.md oder als Word/PDF gespeichert) hochladen.",
    steps: [
      "AIS.chat über die ByCS öffnen und anmelden.",
      "Im Bereich „Assistenten“ einen neuen Assistenten anlegen.",
      "Name und Kurzbeschreibung eintragen (Vorschlag unten).",
      "Den Anweisungstext vollständig in das Feld für Anweisungen bzw. Verhalten der KI einfügen.",
      "Die Wissensdatei hochladen, sofern das Feld angeboten wird.",
      "Speichern, mit einer Beispielfrage testen und bei Bedarf mit dem Kollegium teilen."
    ]
  },
  {
    id: "fobizz",
    dsgvoLabel: "DSGVO-konform (Schullizenz)",
    name: "fobizz KI-Assistenten",
    short: "fobizz",
    anbieter: "fobizz (Schullizenz erforderlich)",
    dsgvo: true, assistant: true, upload: true, web: false,
    info: "Eigene KI-Assistenten mit Rollenbeschreibung und hochgeladener Datei. fobizz empfiehlt, dass hochgeladene Dateien etwa 4 DIN-A4-Seiten nicht überschreiten – deshalb gibt es unten eine kompakte Wissensdatei.",
    uploadHint: "Die kompakte Wissensdatei hochladen (ca. 4 Seiten). Die ausführliche Fassung ist für fobizz zu lang.",
    compactUpload: true,
    steps: [
      "In fobizz unter „KI-Assistenten“ einen eigenen Assistenten erstellen.",
      "Namen und Beschreibung eintragen (Vorschlag unten).",
      "Den Anweisungstext als Rollenbeschreibung einfügen.",
      "Die kompakte Wissensdatei hochladen.",
      "Sprachmodell wählen, speichern und mit einer Beispielfrage testen.",
      "Optional: den Assistenten per Link mit Kolleginnen und Kollegen teilen."
    ]
  },
  {
    id: "bylki",
    dsgvoLabel: "staatlich bereitgestellt",
    name: "ByLKI (ALP Dillingen)",
    short: "ByLKI",
    anbieter: "Akademie für Lehrerfortbildung Dillingen",
    dsgvo: true, assistant: false, upload: false, web: false,
    info: "Chat mit verschiedenen Sprachmodellen für bayerische Lehrkräfte; Zugang nach Abschluss des ALP-Selbstlernkurses. Hier wird mit einem Start-Prompt gearbeitet, der in jeden neuen Chat kopiert wird.",
    steps: [
      "ByLKI öffnen und mit den FIBS-Zugangsdaten anmelden.",
      "Einen neuen Chat beginnen.",
      "Den Start-Prompt (Anweisungen + Wissensgrundlage) vollständig als erste Nachricht einfügen.",
      "Die Bestätigung der KI abwarten und dann die eigene Frage stellen."
    ]
  },
  {
    id: "bycslp",
    dsgvoLabel: "staatlich bereitgestellt",
    name: "KI in der ByCS-Lernplattform",
    short: "ByCS-Lernplattform",
    anbieter: "ISB / ByCS",
    dsgvo: true, assistant: false, upload: false, web: false,
    info: "Die KI-Funktionen der Lernplattform sind vor allem für Kursräume und den Unterricht gedacht. Für Handreichungen und den Begleiter ist AIS.chat meist geeigneter; der Start-Prompt funktioniert aber auch hier.",
    steps: [
      "Im eigenen Kursraum den KI-Chat öffnen.",
      "Den Start-Prompt als erste Nachricht einfügen.",
      "Danach die eigene Frage stellen."
    ]
  },
  {
    id: "copilot",
    dsgvoLabel: "nur nach Freigabe der Schule",
    name: "Microsoft Copilot (Schul-M365)",
    short: "Copilot",
    anbieter: "Microsoft – nur mit Schulkonto",
    dsgvo: "check", assistant: false, upload: true, web: true,
    info: "Nur nutzen, wenn die Schule Copilot für dienstliche Zwecke freigegeben hat, und nur mit dem Schulkonto. Die Websuche ist meist aktiv – Links dann trotzdem stichprobenartig prüfen.",
    uploadHint: "Die Wissensdatei kann im Chat angehängt werden.",
    steps: [
      "Copilot mit dem Schulkonto öffnen (geschützter Modus).",
      "Den Start-Prompt als erste Nachricht einfügen und ggf. die Wissensdatei anhängen.",
      "Danach die eigene Frage stellen."
    ]
  },
  {
    id: "sonstige",
    dsgvoLabel: "privat – nur anonym",
    name: "Andere Chatbots (ChatGPT, Claude, Gemini, Le Chat …)",
    short: "anderer Chatbot",
    anbieter: "private Konten",
    dsgvo: false, assistant: true, upload: true, web: true,
    info: "Nicht schulisch freigegeben: nur zur allgemeinen Information und ohne jeden Bezug zu realen Schülerinnen und Schülern. Viele dieser Tools bieten „Projekte“, „GPTs“ oder „Gems“ für dauerhafte Anweisungen.",
    uploadHint: "Die ausführliche Wissensdatei als Projekt- bzw. Wissensdatei hochladen.",
    steps: [
      "Ein Projekt / einen eigenen Bot (GPT, Gem, Projekt) anlegen.",
      "Den Anweisungstext als Anweisungen bzw. Projektanweisungen einfügen.",
      "Die Wissensdatei hochladen.",
      "Testen – und daran denken: keine echten Fälle, keine Namen."
    ]
  }
];

/* ---------- Themenkatalog ---------- */
HR.groups = [
  { id: "entwicklung", title: "Entwicklungs- und Lernstörungen", sub: "beginnen in der Kindheit, wirken oft bis in die Oberstufe" },
  { id: "emotional", title: "Emotionale Belastungen und Störungen", sub: "häufig unauffällig, aber folgenreich" },
  { id: "trauma", title: "Belastung, Trauma, Verlust", sub: "Reaktionen auf Ereignisse" },
  { id: "risiko", title: "Essen, Körper, Risikoverhalten", sub: "oft mit Gefährdungsaspekt – Krisenbox beachten" },
  { id: "weitere", title: "Weitere Störungsbilder", sub: "seltener, aber für Schule wichtig" }
];

HR.catalog = [
  { id: "adhs", group: "entwicklung", title: "ADHS", desc: "Aufmerksamkeit, Aktivität und Impulse steuern – Struktur hilft allen.", status: "draft", href: "adhs.html" },
  { id: "lrs", group: "entwicklung", title: "Lese-Rechtschreib-Störung (LRS)", desc: "Lesen und/oder Rechtschreiben – inkl. bayerischem Nachteilsausgleich und Notenschutz.", status: "draft", href: "lrs.html" },
  { id: "autismus", group: "entwicklung", title: "Autismus-Spektrum", desc: "Soziale Kommunikation, Wahrnehmung, Bedürfnis nach Vorhersehbarkeit.", status: "planned" },
  { id: "dyskalkulie", group: "entwicklung", title: "Rechenstörung (Dyskalkulie)", desc: "Grundlegende Schwierigkeiten im Umgang mit Zahlen und Mengen.", status: "planned" },
  { id: "tics", group: "entwicklung", title: "Tic-Störungen / Tourette", desc: "Unwillkürliche Bewegungen oder Laute – Umgang in der Klasse.", status: "planned" },
  { id: "depression", group: "emotional", title: "Depression", desc: "Gedrückte Stimmung, Antriebsmangel, Rückzug – behandelbar, oft übersehen.", status: "draft", href: "depression.html" },
  { id: "angst", group: "emotional", title: "Angststörungen", desc: "Soziale Angst, Prüfungsangst, Panik, generalisierte Angst.", status: "planned" },
  { id: "schulabsentismus", group: "emotional", title: "Schulangst & Schulabsentismus", desc: "Wenn der Schulbesuch selbst zum Problem wird.", status: "planned" },
  { id: "zwang", group: "emotional", title: "Zwangsstörungen", desc: "Zwangsgedanken und -handlungen, oft verheimlicht.", status: "planned" },
  { id: "trauma", group: "trauma", title: "Traumafolgen / PTBS", desc: "Nach belastenden Ereignissen: Sicherheit und Vorhersehbarkeit.", status: "planned" },
  { id: "trauer", group: "trauma", title: "Trauer und Verlust", desc: "Keine Erkrankung – aber ein häufiger Anlass für Unterstützung.", status: "planned" },
  { id: "essstoerungen", group: "risiko", title: "Essstörungen", desc: "Magersucht, Bulimie, Binge-Eating – früh ansprechen, nicht kommentieren.", status: "planned", krise: true },
  { id: "nssv", group: "risiko", title: "Selbstverletzendes Verhalten", desc: "Ruhig bleiben, ansprechen, Hilfe vermitteln.", status: "planned", krise: true },
  { id: "sucht", group: "risiko", title: "Substanzkonsum & Mediennutzungsstörung", desc: "Alkohol, Cannabis, Gaming, Social Media.", status: "planned" },
  { id: "psychose", group: "weitere", title: "Psychotische Störungen", desc: "Selten, Beginn oft im Jugendalter – Rückkehr in die Schule begleiten.", status: "planned" },
  { id: "mutismus", group: "weitere", title: "Selektiver Mutismus", desc: "Schweigen in bestimmten Situationen – kein Trotz.", status: "planned" },
  { id: "bipolar", group: "weitere", title: "Bipolare Störung", desc: "Phasen von Depression und gehobener Stimmung.", status: "planned" }
];

/* ---------- Geprüfte Quellen (Links am 27.11.2026 aufgerufen) ---------- */
HR.sources = {
  allgemein: [
    { t: "BaySchO §§ 31–36: Individuelle Unterstützung, Nachteilsausgleich, Notenschutz", u: "https://www.gesetze-bayern.de/Content/Document/BaySchO2016-32" },
    { t: "ISB: Handbuch Individuelle Unterstützung – Nachteilsausgleich – Notenschutz (2024)", u: "https://www.isb.bayern.de/fileadmin/user_upload/Grundsatzabteilung/Individuelle_Foerderung/Individuelle_Unterstuetzung/Handbuch_Individuelle_Unterstuetzung_Nachteilsausgleich_Notenschutz_2024.pdf" },
    { t: "Staatliche Schulberatung in Bayern", u: "https://www.schulberatung.bayern.de/" },
    { t: "Staatliche Schulberatungsstelle München (Stadt und Landkreis) – Ansprechpersonen", u: "https://www.schulberatung.bayern.de/staatliche-schulberatungsstellen/muenchen/ansprechpersonen" },
    { t: "Staatliche Schulberatung: Krisenintervention und KIBBS", u: "https://www.schulberatung.bayern.de/themen-und-anlaesse/krisenintervention" },
    { t: "ISB: Handreichung „Krisenintervention an Schulen“", u: "https://www.isb.bayern.de/grundsatzabteilung/paedagogische-grundsatzfragen/praevention/handreichung-krisenintervention/" },
    { t: "ISB: Übergang Klinik – Schule (Wiedereingliederung, Krankenpädagogik, Schulrecht)", u: "https://uebergang.klinik.schule.bayern.de/" },
    { t: "Krisendienste Bayern – 0800 655 3000 (rund um die Uhr)", u: "https://www.krisendienste.bayern/" },
    { t: "Nummer gegen Kummer – Kinder- und Jugendtelefon 116 111, Elterntelefon", u: "https://www.nummergegenkummer.de/" },
    { t: "gesundheitsinformation.de (IQWiG) – unabhängige Gesundheitsinformationen", u: "https://www.gesundheitsinformation.de/" },
    { t: "AWMF-Leitlinienregister (medizinische Leitlinien)", u: "https://register.awmf.org/" },
    { t: "KI-Systeme für bayerische Schulen (ByCS)", u: "https://www.bycs.de/ki-systeme/index.html" }
  ],
  adhs: [
    { t: "zentrales adhs-netz: ADHS in Schule und Unterricht", u: "https://www.zentrales-adhs-netz.de/fuer-paedagogen/adhs-in-schule-und-unterricht/" },
    { t: "zentrales adhs-netz: Hilfreiche Konzepte & Materialien für Pädagogen", u: "https://www.zentrales-adhs-netz.de/fuer-paedagogen/hilfreiche-konzepte-materialien/" },
    { t: "ADHS-Infoportal (zentrales adhs-netz) – für Familien und Jugendliche", u: "https://www.adhs.info/" },
    { t: "ISB Übergang Klinik–Schule: Hyperkinetische Störung (ADHS) – Unterstützung nach BaySchO", u: "https://uebergang.klinik.schule.bayern.de/fileadmin/user_upload/uebergang_klinik_schule/Kapitel_10/Hyperkinetische_Stoerung.pdf" },
    { t: "S3-Leitlinie ADHS im Kindes-, Jugend- und Erwachsenenalter (AWMF 028-045)", u: "https://register.awmf.org/de/leitlinien/detail/028-045" }
  ],
  depression: [
    { t: "ISB: Depressionen bei Schülerinnen und Schülern – Informationen für Lehrkräfte (2022)", u: "https://www.isb.bayern.de/fileadmin/user_upload/Grundsatzabteilung/Praevention/lehrer_infomaterial_depressionen_2022.pdf" },
    { t: "ISB Übergang Klinik–Schule: Depression – Unterstützung nach BaySchO", u: "https://uebergang.klinik.schule.bayern.de/fileadmin/user_upload/uebergang_klinik_schule/Kapitel_10/Depression.pdf" },
    { t: "ich bin alles @Schule (LMU Klinikum München) – für Lehrkräfte, mit kostenloser Fortbildung", u: "https://schule.ich-bin-alles.de/" },
    { t: "ich bin alles – Infoportal für Jugendliche und Eltern", u: "https://www.ich-bin-alles.de/" },
    { t: "Stiftung Deutsche Depressionshilfe und Suizidprävention (Info-Telefon 0800 33 44 533)", u: "https://www.deutsche-depressionshilfe.de/" },
    { t: "S3-Leitlinie Behandlung depressiver Störungen bei Kindern und Jugendlichen (AWMF 028-043)", u: "https://register.awmf.org/de/leitlinien/detail/028-043" }
  ],
  lrs: [
    { t: "BaySchO § 34 Notenschutz", u: "https://www.gesetze-bayern.de/Content/Document/BaySchO2016-34" },
    { t: "BaySchO § 35 Zuständigkeit", u: "https://www.gesetze-bayern.de/Content/Document/BaySchO2016-35" },
    { t: "BaySchO § 36 Verfahren", u: "https://www.gesetze-bayern.de/Content/Document/BaySchO2016-36" },
    { t: "Bayerischer Landtag, Drs. 19/2864: Antwort des KM zum Notenschutz bei LRS (2024)", u: "https://www.bayern.landtag.de/www/ElanTextAblage_WP19/Drucksachen/Basisdrucksachen/0000002500/0000002864_024.pdf" },
    { t: "Bundesverband Legasthenie & Dyskalkulie: Infos für Lehrkräfte", u: "https://www.bvl-legasthenie.de/schule/infos-f%C3%BCr-lehrkraefte.html" },
    { t: "S3-Leitlinie Lese- und/oder Rechtschreibstörung (AWMF 028-044, in Überarbeitung)", u: "https://register.awmf.org/de/leitlinien/detail/028-044" }
  ]
};

/* ---------- Geprüfter Rechtsrahmen für Prompts (Kurzinfo) ---------- */
HR.rechtsrahmenPrompt = `GEPRÜFTER RECHTSRAHMEN BAYERN (Stand ${HR.stand}) – nur diese Angaben verwenden:
- Grundlage: Art. 52 Abs. 5 BayEUG und §§ 31–36 BaySchO. Drei Stufen: individuelle Unterstützung (§ 32), Nachteilsausgleich (§ 33), Notenschutz (§ 34).
- Individuelle Unterstützung: pädagogische, didaktisch-methodische, schulorganisatorische Maßnahmen und technische Hilfen, die die Leistungsfeststellung nicht berühren (z. B. Sitzplatz, Pausenregelung, individuelle Erläuterung von Arbeitsanweisungen, Visualisierung, differenzierte Hausaufgaben). Gewährt die Lehrkraft.
- Nachteilsausgleich: passt Prüfungsbedingungen an, die wesentlichen Leistungsanforderungen bleiben gleich (z. B. Arbeitszeitverlängerung bis zu einem Viertel, in Ausnahmefällen bis zur Hälfte; zusätzliche Pausen; gesonderter Raum; Strukturierungshilfen; spezielle Arbeitsmittel). Erscheint nicht im Zeugnis. Bei nur vorübergehender Erkrankung wird regelmäßig auf einen Nachtermin verwiesen.
- Notenschutz: nur für die in § 34 abschließend genannten Beeinträchtigungen (z. B. Lese-Rechtschreib-Störung, Hörschädigung, Sehschädigung, körperlich-motorische Beeinträchtigung, Mutismus/Autismus mit kommunikativer Sprachstörung); führt zu einer Zeugnisbemerkung. Für psychische Erkrankungen wie Depression oder ADHS ist kein Notenschutz vorgesehen.
- Verfahren: Antrag der Erziehungsberechtigten bzw. volljährigen Schüler in Textform, in der Regel mit fachärztlichem Zeugnis; bei LRS genügt stets eine schulpsychologische Stellungnahme. Zuständig an Gymnasien: bei LRS die Schulleitung, sonst die Schulaufsicht (Antrag über die Schule).
- Alles, was darüber hinausgeht (Einzelfälle, Abiturprüfung, Fristen), NICHT selbst ausführen, sondern auf Schulleitung, Schulpsychologie und den Baustein „Nachteilsausgleich & Notenschutz“ verweisen.`;
