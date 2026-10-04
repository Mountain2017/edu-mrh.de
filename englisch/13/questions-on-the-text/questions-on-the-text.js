/* ==========================================================================
   Questions on the Text (Englisch Q13) – Seitenlogik
   - Lösungsweg: Tipps stufenweise, Musterlösung nur durch Gedrückthalten
     (gleiches Muster wie informatik/12/rekursive-datenstrukturen)
   - Selbsttest „Which level?“
   - Formulare mit Speicherung im Browser (localStorage, Schlüssel qott-…)
   - Satzbaukasten für den Einleitungssatz
   - Textkarten und Writing Coach (musterbasierte Hinweise, kein Server)
   ========================================================================== */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Speicher (privater Modus / gesperrter Speicher: alles bleibt nutzbar)
       ------------------------------------------------------------------ */
    var store = {
        get: function (k, fallback) {
            try { var v = window.localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; }
        },
        set: function (k, v) {
            try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; }
        },
        del: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* egal */ } }
    };

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    /* ==================================================================
       1  Lösungsweg
       ================================================================== */
    var HALTEZEIT = 1500;

    function loesungsweg(box) {
        if (box.getAttribute('data-lw-ready')) return;
        box.setAttribute('data-lw-ready', '1');
        var titel = box.getAttribute('data-loesungsweg') || '';
        var stufen = Array.prototype.slice.call(box.querySelectorAll('template[data-stufe]'));
        if (!stufen.length) return;
        var kopf = el('div', 'lw-kopf', '💡 Help' + (titel ? ': ' + titel : ''));
        var inhalt = el('div', 'lw-inhalt');
        var knoepfe = el('div', 'lw-knoepfe');
        box.appendChild(kopf);
        box.appendChild(inhalt);
        box.appendChild(knoepfe);
        var stand = 0;

        function zeigeStufe(i) {
            var t = stufen[i];
            var teil = el('div', 'lw-stufe' + (t.hasAttribute('data-halten') ? ' lw-loesung' : ''));
            teil.appendChild(el('div', 'lw-marke', t.getAttribute('data-stufe')));
            teil.appendChild(document.importNode(t.content, true));
            inhalt.appendChild(teil);
            stand = i + 1;
            baueKnoepfe();
        }
        function zuruecksetzen() { inhalt.textContent = ''; stand = 0; baueKnoepfe(); }
        function baueKnoepfe() {
            knoepfe.textContent = '';
            if (stand < stufen.length) {
                var t = stufen[stand];
                var k = document.createElement('button');
                k.type = 'button';
                if (t.hasAttribute('data-halten')) {
                    k.className = 'lw-knopf lw-halten';
                    k.innerHTML = '<span class="lw-fortschritt"></span><span class="lw-text"></span>';
                    k.querySelector('.lw-text').textContent = t.getAttribute('data-stufe') + ': press and hold';
                    k.setAttribute('aria-label', 'Show ' + t.getAttribute('data-stufe') + ' (press and hold for ' + (HALTEZEIT / 1000) + ' seconds)');
                    haltenAktivieren(k, function () { zeigeStufe(stand); });
                } else {
                    k.className = 'lw-knopf';
                    k.textContent = 'Show ' + t.getAttribute('data-stufe');
                    k.addEventListener('click', function () { zeigeStufe(stand); });
                }
                knoepfe.appendChild(k);
            }
            if (stand > 0) {
                var weg = el('button', 'lw-knopf lw-weg', 'hide again');
                weg.type = 'button';
                weg.addEventListener('click', zuruecksetzen);
                knoepfe.appendChild(weg);
            }
        }
        baueKnoepfe();
    }

    function haltenAktivieren(knopf, fertig) {
        var timer = null, balken = knopf.querySelector('.lw-fortschritt');
        function start(e) {
            if (timer) return;
            if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            if (e && e.type === 'keydown') e.preventDefault();
            balken.style.transition = 'width ' + HALTEZEIT + 'ms linear';
            balken.style.width = '100%';
            timer = setTimeout(function () { timer = null; fertig(); }, HALTEZEIT);
        }
        function stopp() {
            if (!timer) return;
            clearTimeout(timer);
            timer = null;
            balken.style.transition = 'width .2s';
            balken.style.width = '0';
        }
        knopf.addEventListener('pointerdown', start);
        knopf.addEventListener('keydown', start);
        ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur'].forEach(function (t) { knopf.addEventListener(t, stopp); });
        knopf.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    // Lösungsweg aus Daten bauen: stufen = [{label, html, hold}]
    function lwAusDaten(box, titel, stufen) {
        box.textContent = '';
        box.removeAttribute('data-lw-ready');
        box.setAttribute('data-loesungsweg', titel);
        stufen.forEach(function (s) {
            var t = document.createElement('template');
            t.setAttribute('data-stufe', s.label);
            if (s.hold) t.setAttribute('data-halten', '');
            t.innerHTML = s.html;
            box.appendChild(t);
        });
        loesungsweg(box);
    }

    /* ==================================================================
       2  Die Texte und ihre Aufgaben
       ================================================================== */
    var TEXTS = {
        baxter: {
            short: 'Model · Baxter (book p. 230)',
            label: 'Model text',
            author: 'Sarah Baxter', authorRe: /\bbaxter\b/i, pron: 'she',
            title: 'Helsinki’s huge VR gig and the potential of virtual tourism',
            source: 'The Guardian online', sourceRe: /guardian/i, year: '2020',
            type: 'feature article', where: 'book pp. 230–231',
            about: 'Virtual tourism during the lockdown: a concert in a digital twin of Helsinki.',
            model: true,
            questions: [
                { id: 'q1', kind: 'comp', level: 'I', book: '2a',
                  text: 'Describe what Virtual Helsinki is and what it offers to its users.',
                  content: [
                      { q: 'What is it? (l. 16)', re: /twin|copy|replica|virtual (version|model|city)|digital (version|model|city)/i },
                      { q: 'How was it built? (ll. 16–18)', re: /3d|three-dimensional|open data|drawings|images|modell?ing/i },
                      { q: 'What can users do there? (ll. 18–19)', re: /landmark|sight|explore|as they (choose|wish|like)|realistic/i },
                      { q: 'What happened during the lockdown? (ll. 25–35)', re: /concert|gig|avatar|jvg|perform/i },
                      { q: 'What is planned? (ll. 44–47)', re: /exhibition|shopping|historical|multi-?user|multiplayer|sociali[sz]e/i },
                      { q: 'What is it not meant to do? (ll. 49–50)', re: /alternative|not (meant |supposed |intended )?(to )?replace|in addition to|addition to (travel|visit)/i }
                  ],
                  tips: [
                      { label: 'Tip 1', html: '<p>The information is spread over ll.&nbsp;16–24, ll.&nbsp;25–35 and ll.&nbsp;44–53.</p>' },
                      { label: 'Tip 2', html: '<p>A logical order: what it is → how it was built → what users can do now → what is planned → what it is <em>not</em> meant to do.</p>' }
                  ] },
                { id: 'q2', kind: 'analysis', level: 'II', book: '3',
                  text: 'Examine Baxter’s language. Explain where she expresses respect for Helsinki’s achievements and how she bridges the knowledge gap for technically less experienced readers. Explain the author’s use of quotations in the text.',
                  content: [
                      { q: 'Respect for Helsinki’s achievements', re: /impressive|meticulous|success|pioneer|admir|respect|apprecia|prais/i },
                      { q: 'Bridging the knowledge gap', re: /pineapple|anecdote|personal experience|explain|explanation|dash|bracket|parenthes|everyday|colloquial|switzerland|dubai|barrier reef/i },
                      { q: 'Use of quotations', re: /quot|aalto|rusama|jung|expert|official/i },
                      { q: 'Effect on the reader / purpose', re: /credib|trust|accessib|reader|vivid|relatable|authorit/i }
                  ],
                  tips: [
                      { label: 'Tip 1: where to look', html: '<ul><li><strong>Respect:</strong> ll.&nbsp;11–15, ll.&nbsp;29–32, l.&nbsp;37</li><li><strong>Knowledge gap:</strong> ll.&nbsp;4–15, l.&nbsp;16, ll.&nbsp;55–58 — look at dashes and brackets</li><li><strong>Quotations:</strong> Aalto, Rusama, Jung — who has the last word?</li></ul>' },
                      { label: 'Tip 2: questions to ask', html: '<ul><li>How does Baxter make her praise sound believable?</li><li>What does she do right after using a term a non-expert might not know?</li><li>Why does an academic end the article?</li></ul>' }
                  ] },
                { id: 'q3', kind: 'eval', level: 'III', book: '5',
                  text: 'The author quotes Dr Timothy Jung, who states that after the lockdowns “people will be more open for virtual experience as an alternative way of socialising and enjoying life” (ll. 64–66). Starting with the quote, discuss in which ways virtual reality can have a positive effect on people’s lives.',
                  content: [
                      { q: 'Access for people who cannot travel', re: /disab|illness|\bill\b|afford|cost|money|distance|elderly|older people|mobility/i },
                      { q: 'Sustainability', re: /sustainab|carbon|emission|climate|environment/i },
                      { q: 'Learning and culture', re: /learn|educat|histor|school|museum|culture/i },
                      { q: 'The other side', re: /however|on the other hand|admittedly|critic|danger|risk|isolat|addict|screen time|lonel/i }
                  ],
                  tips: [
                      { label: 'Tip: ideas to start from', html: '<ul><li>Access: illness, disability, cost, distance</li><li>Sustainability: “without racking up carbon emissions” (l.&nbsp;38)</li><li>Learning: history and far-away places made vivid (cf. ll.&nbsp;55–58)</li><li>The other side: isolation, screen time, data</li></ul>' }
                  ] }
            ]
        },
        graziano: {
            short: 'A · Graziano (book p. 234)',
            label: 'Text A',
            author: 'Michael Graziano', authorRe: /\bgraziano\b/i, pron: 'he',
            title: 'What happens if your mind lives forever on the internet?',
            source: 'The Guardian online', sourceRe: /guardian/i, year: '2019',
            type: 'opinion essay', where: 'book pp. 234–235',
            about: 'Mind uploading: a world in which our minds live on in the cloud — utopia or something else?',
            questions: [
                { id: 'q1', kind: 'comp', level: 'I', book: '8a/b',
                  text: 'Describe what is meant by “mind uploading” (l. 1) and sum up the changes which, according to the author, this technology might bring about.',
                  tips: [
                      { label: 'Tip 1', html: '<p>The definition is in ll.&nbsp;1–6. For the changes, take one section at a time: ll.&nbsp;14–20, 21–26, 27–45, 45–57, 58–72.</p>' },
                      { label: 'Tip 2', html: '<p>Group the changes instead of retelling them: private life · work · power and society.</p>' }
                  ] },
                { id: 'q2', kind: 'analysis', level: 'II', book: '9',
                  text: 'Examine how the stylistic devices used in this article strengthen its effect on the reader.',
                  tips: [
                      { label: 'Tip 1', html: '<p>Look at how the author speaks to his reader, at his questions, his images and his everyday examples. Start with ll.&nbsp;1–13 and ll.&nbsp;21–26.</p>' },
                      { label: 'Tip 2', html: '<p>For each device, ask: does it make a speculative idea feel real, close, inevitable — or threatening? And what does the last sentence do?</p>' }
                  ] },
                { id: 'q3', kind: 'eval', level: 'III', book: '11',
                  text: '“Mind uploading could transform our culture and civilisation more profoundly than anything in our past” (ll. 71–72). Discuss whether this is a realistic assessment and whether an eternal virtual existence of the mind is a positive or a threatening prospect.',
                  tips: [
                      { label: 'Tip', html: '<p>Use Worksheet&nbsp;1: utopia or dystopia? Who would gain from a “cloud world”, who would lose?</p>' }
                  ] }
            ]
        },
        reinboth: {
            short: 'B · Reinboth (Undark, 2024)',
            label: 'Text B',
            author: 'Tim Reinboth', authorRe: /\breinboth\b/i, pron: 'he',
            title: 'Do ‘Griefbots’ Help Mourners Deal With Loss?',
            source: 'Undark', sourceRe: /undark/i, year: '4 April 2024',
            type: 'opinion piece', where: 'printout from undark.org',
            url: 'https://undark.org/2024/04/04/opinion-griefbots-lack-evidence/',
            about: 'Today’s “digital afterlife”: AI chatbots that imitate people who have died. Do they help?',
            questions: [
                { id: 'q1', kind: 'comp', level: 'I',
                  text: 'Outline what griefbots are and how, according to the text, people use them.',
                  tips: [
                      { label: 'Tip 1', html: '<p>First explain what a griefbot is (beginning of the text). Then collect what the text says about how people actually use them — look for the study.</p>' },
                      { label: 'Tip 2', html: '<p>Don’t forget the two companies and their different aims.</p>' }
                  ] },
                { id: 'q2', kind: 'analysis', level: 'II',
                  text: 'Analyse how the author presents the debate about griefbots and makes his call for caution convincing. Consider the structure, the use of research and experts, and language.',
                  tips: [
                      { label: 'Tip 1', html: '<p>Map the structure first: headline question → thesis → background → products → risks → research → regulation → ending. Where does the author state his own position?</p>' },
                      { label: 'Tip 2', html: '<p>Who speaks in the text besides the author, and what does each voice add? How does the final sentence change the way you see griefbots?</p>' }
                  ] },
                { id: 'q3', kind: 'eval', level: 'III',
                  text: 'Should companies be allowed to offer griefbots without any regulation? Comment.',
                  tips: [
                      { label: 'Tip', html: '<p>Think of vulnerable users, the data of people who have died, consumer protection — and what sensible rules could look like.</p>' }
                  ] }
            ]
        },
        guterres: {
            short: 'C · Guterres (UN speech, 2023)',
            label: 'Text C',
            author: 'António Guterres', authorRe: /\bguterres\b|secretary-general/i, pron: 'he',
            title: 'Secretary-General’s remarks to the Security Council on Artificial Intelligence',
            source: 'the UN Security Council', sourceRe: /united nations|\bun\b|security council/i, year: '18 July 2023',
            type: 'speech', where: 'text sheet C (line-numbered, abridged)',
            about: 'AI between catastrophe and “a race to develop AI for good” — the UN Secretary-General’s appeal.',
            questions: [
                { id: 'q1', kind: 'comp', level: 'I',
                  text: 'Outline the opportunities and the threats of artificial intelligence that Guterres mentions.',
                  tips: [
                      { label: 'Tip 1', html: '<p>Make two lists while you read: opportunities (e.g. ll.&nbsp;12–20, 29–32, 95–99) and threats (ll.&nbsp;20–58).</p>' },
                      { label: 'Tip 2', html: '<p>Group the threats instead of listing all of them: misuse · disinformation · accidents and malfunctions · catastrophic risks.</p>' }
                  ] },
                { id: 'q2', kind: 'analysis', level: 'II',
                  text: 'Analyse how Guterres tries to convince the Security Council of the urgency of global AI governance. Consider the structure of the speech, rhetorical devices and tone.',
                  tips: [
                      { label: 'Tip 1', html: '<p>Map the structure: personal opening → speed and scale → promise and danger → why governance is hard → the UN solution → appeal. Why this order?</p>' },
                      { label: 'Tip 2', html: '<p>Look at how he addresses his audience (ll.&nbsp;25, 34, 85, 91, 95), at his comparisons (ll.&nbsp;8–11, 80–84) and at the image he ends with.</p>' }
                  ] },
                { id: 'q3', kind: 'eval', level: 'III',
                  text: '“We need a race to develop AI for good” (ll. 95–96). Discuss whether a global UN body to govern AI is a realistic and desirable solution.',
                  tips: [
                      { label: 'Tip', html: '<p>Think of national interests, the power of tech companies and existing models such as the IAEA. Is AI more like nuclear energy — or more like the internet?</p>' }
                  ] }
            ]
        }
    };
    var TEXT_ORDER = ['baxter', 'graziano', 'reinboth', 'guterres'];

    /* ==================================================================
       3  Bausteine für den Coach
       ================================================================== */
    var STEPS = {
        comp: ['Opening', 'Main points', 'Rounding off'],
        analysis: ['Thesis', 'Body: Claim – Evidence – Effect', 'Conclusion'],
        eval: ['Lead-in & position', 'Arguments', 'Conclusion']
    };

    var GUIDE = {
        comp: [
            ['Does your first sentence name text type, title (in quotation marks), source, date and author?',
             'Does it state the topic with a precise reporting verb (not “is about”)?',
             'Later questions: does your first sentence pick up the question?'],
            ['Which lines contain the information the question asks for — and only that?',
             'Have you put it into your own words?',
             'Is there a line reference after each point?',
             'Is your order logical (not just the order of the text)?'],
            ['Is a final sentence needed at all? Only if it sums up — no opinion, nothing new.']
        ],
        analysis: [
            ['Does your thesis answer the question in one or two sentences?',
             'Does it name the main techniques and what they achieve?',
             'No retelling of the content.'],
            ['Claim: what does the author do in this part?',
             'Evidence: which quote proves it? Line reference?',
             'Effect: what does it do to the reader — and how does it support the message?',
             'Does the paragraph open with a linking word or a topic sentence?'],
            ['Sum up how the style supports the message.',
             'No new quotes, no new points.',
             'Can you relate it to purpose and target group?']
        ],
        eval: [
            ['Pick up the quote or issue in your own words.', 'State your position clearly.'],
            ['One argument per paragraph — with an example.',
             'Have you considered the other side and answered it?'],
            ['Weigh up and justify — don’t just repeat your arguments.']
        ]
    };

    var PHRASES = {
        comp: [
            ['In the [text type] “[title]”, published in [source] in [date], [author] reports on ', 'The text deals with ', 'According to the author, '],
            ['According to the author, ', 'The author points out that ', 'Furthermore, ', 'In addition, ', 'However, ', 'Finally, ', ' (cf. l. )', ' (cf. ll. –)'],
            ['All in all, ', 'In short, ']
        ],
        analysis: [
            ['In order to …, the author uses ', 'The author combines … with … to ', 'By means of …, the author '],
            ['First of all, ', 'Furthermore, ', 'This is illustrated by ', 'The use of … emphasises ', 'This creates the impression that ', 'As a result, the reader ', ' (l. )', ' (ll. –)'],
            ['All in all, ', 'To sum up, ', 'Thus, the author’s style supports ']
        ],
        eval: [
            ['From my point of view, ', 'I am convinced that ', 'It could be argued that '],
            ['First and foremost, ', 'This is illustrated by ', 'Admittedly, … However, ', 'On the other hand, ', 'For instance, '],
            ['Weighing up both sides, ', 'In conclusion, ']
        ]
    };

    var LINKERS = ['furthermore', 'moreover', 'in addition', 'additionally', 'apart from that', 'however', 'nevertheless', 'nonetheless',
        'in contrast', 'whereas', 'on the other hand', 'therefore', 'thus', 'consequently', 'as a result', 'hence', 'for instance',
        'for example', 'to illustrate', 'first of all', 'firstly', 'secondly', 'finally', 'subsequently', 'all in all', 'to sum up',
        'on the whole', 'in conclusion', 'admittedly', 'although', 'while', 'similarly', 'likewise', 'besides', 'what is more', 'above all'];
    var CONCLUSION_RE = /^\s*(all in all|to sum up|in conclusion|to conclude|overall|on the whole|in short|taken together|weighing up|to summari[sz]e|in summary)\b/i;
    var EFFECT_RE = /\b(emphasi[sz]\w*|underlin\w*|highlight\w*|stress\w*|convey\w*|evok\w*|creat\w*|suggest\w*|engag\w*|involv\w*|illustrat\w*|reinforc\w*|appeal\w*|persuad\w*|convinc\w*|lend\w*|draw\w* attention|makes? (the reader|readers|the audience|it|them)|helps? (the reader|readers)|invit\w*|effect|impression|credib\w*|accessib\w*|vivid\w*)\b/i;
    var DEVICE_RE = /\b(metaphor\w*|simile|comparison|rhetorical question\w*|anaphora|repetition|enumeration|tricolon|rule of three|alliteration|hyperbole|antithesis|contrast\w*|irony|ironic\w*|anecdote|direct address|imperative|quot\w*|statistic\w*|figures|colloquial|register|tone|emotive|parallelism|climax|personification|juxtaposition|inclusive|dash(es)?|bracket\w*|parenthes\w*|device\w*|word choice|vocabulary|structure|short sentence)\b/i;
    var TEXTTYPE_RE = /\b(article|feature|essay|comment|opinion piece|column|speech|remarks|report|editorial|address)\b/i;
    var POSITION_RE = /\b(I (am convinced|believe|think|agree|disagree|would argue)|in my (view|opinion)|from my point of view|it is (clear|evident|obvious) that|personally)\b/i;
    var EXAMPLE_RE = /\b(for (example|instance)|such as|to illustrate|e\.g\.|as shown by|take \w+ as an example)\b/i;
    var COUNTER_RE = /\b(however|on the other hand|admittedly|although|critics|opponents|it could be argued|while it is true|nevertheless)\b/i;
    var CONTRACTION_RE = /\b(\w+n['’]t|I['’]m|I['’]ve|I['’]d|it['’]s|that['’]s|there['’]s|they['’]re|we['’]re|you['’]re|he['’]s|she['’]s|let['’]s|what['’]s|who['’]s)\b/gi;
    var PAST_RE = /\b(wrote|said|stated|claimed|described|explained|argued|mentioned|showed|pointed out|emphasi[sz]ed|told|criticised|criticized|warned)\b/gi;
    var FIRST_PERSON_RE = /(\bI\b|\bme\b|\bmy\b|\bmine\b)/g;
    var LINEREF_RE = /(\b(?:cf\.\s*)?ll?\.\s*\d+|\blines?\s+\d+|\bpara(?:graph)?s?\.?\s*\d+|¶\s*\d+)/gi;
    var INFORMAL = [
        [/\ba lot of\b|\blots of\b/gi, 'a lot of', 'numerous, a great deal of, considerable'],
        [/\bthings?\b/gi, 'thing', 'aspect, element, issue, factor'],
        [/\bstuff\b/gi, 'stuff', 'material, content'],
        [/\bgood\b/gi, 'good', 'effective, convincing, positive, beneficial'],
        [/\bbad\b/gi, 'bad', 'negative, harmful, detrimental'],
        [/\bbig\b/gi, 'big', 'considerable, significant, major'],
        [/\bvery\b/gi, 'very', 'highly, extremely — or a stronger adjective'],
        [/\breally\b/gi, 'really', 'particularly — or leave it out'],
        [/\b(get|gets|got|getting)\b/gi, 'get', 'obtain, receive, become, gain'],
        [/\b(kind of|sort of)\b/gi, 'kind of', 'rather, somewhat'],
        [/\b(okay|ok)\b/gi, 'okay', 'acceptable, reasonable'],
        [/\b(is|it's|it is) about\b/gi, 'is about', 'deals with, focuses on, discusses'],
        [/\bnowadays\b/gi, 'nowadays', 'today, at present'],
        [/\bguys?\b/gi, 'guy', 'person, people']
    ];
    var STOP = ('the a an and or but of to in on at for with by from as is are was were be been being this that these those it its ' +
        'he she they them his her their we our you your i me my not no so than then there here which who whom whose what when where ' +
        'how why also can could would should may might will shall do does did has have had just only even more most very about into ' +
        'over such both each other all any some many much one two text author reader readers line lines cf ll l para paragraph article ' +
        'speech speaker if because while however furthermore moreover therefore thus own uses use used makes make way ways').split(' ');

    function stripQuotes(t) {
        return t.replace(/[“"«][^”"»]*[”"»]/g, ' ').replace(/‘[^’]*\s[^’]*’/g, ' ');
    }
    function quotesIn(t) {
        var out = [], m, re = /[“"«]([^”"»]{1,400})[”"»]/g;
        while ((m = re.exec(t))) out.push(m[1]);
        return out;
    }
    function words(t) { return (t.match(/[A-Za-zÀ-ɏ'’-]+/g) || []); }
    function sentences(t) { return (t.match(/[^.!?]+[.!?]+["”’)]?|[^.!?]+$/g) || []).map(function (s) { return s.trim(); }).filter(Boolean); }
    function countRe(t, re) { var m = t.match(new RegExp(re.source, re.flags.indexOf('g') > -1 ? re.flags : re.flags + 'g')); return m ? m.length : 0; }
    function firstMatches(t, re, n) {
        var m = t.match(new RegExp(re.source, re.flags.indexOf('g') > -1 ? re.flags : re.flags + 'g')) || [];
        var seen = {}, out = [];
        m.forEach(function (x) { var k = x.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(x); } });
        return out.slice(0, n || 3);
    }

    // Absätze mit Positionen
    function paragraphsOf(text) {
        var res = [], re = /\n\s*\n/g, last = 0, m;
        while ((m = re.exec(text))) { res.push({ start: last, end: m.index, text: text.slice(last, m.index) }); last = m.index + m[0].length; }
        res.push({ start: last, end: text.length, text: text.slice(last) });
        return res.filter(function (p, i, arr) { return p.text.trim() || i === arr.length - 1; });
    }

    /* ==================================================================
       4  Prüfungen
       ================================================================== */
    function item(status, html) { return { s: status, h: html }; }

    function checkParagraph(kind, step, p, T, Q, isFirstQ, isFirstSentence) {
        var r = [], t = p.trim();
        if (!t) return [item('todo', 'Start writing — the hints will follow your text.')];
        var plain = stripQuotes(t), q = quotesIn(t), wc = words(t).length, refs = countRe(t, LINEREF_RE);
        var authorRef = T.authorRe.test(t) || /\bthe (author|speaker|journalist|writer)\b/i.test(t) || new RegExp('\\b' + T.pron + '\\b', 'i').test(plain);

        if (kind === 'comp') {
            if (step === 0 && isFirstQ) {
                var first = sentences(t)[0] || t;
                r.push(item(TEXTTYPE_RE.test(first) ? 'ok' : 'todo', 'Text type named (e.g. ' + T.type + ')'));
                r.push(item(quotesIn(first).length ? 'ok' : 'todo', 'Title in quotation marks'));
                r.push(item(T.sourceRe.test(first) ? 'ok' : 'todo', 'Source named (' + T.source + ')'));
                r.push(item(/\b(19|20)\d{2}\b/.test(first) ? 'ok' : 'todo', 'Date / year'));
                r.push(item(T.authorRe.test(first) ? 'ok' : 'todo', 'Author named (' + T.author + ')'));
                if (/\b(it is|is|it's) about\b/i.test(first)) r.push(item('warn', '“is about” → use a precise reporting verb: <em>reports on, explores, argues that …</em>'));
            } else if (step === 0) {
                r.push(item('q', 'Does your first sentence pick up the question?'));
            }
            if (step === 1 || (step === 0 && !isFirstSentence)) {
                if (wc > 25) r.push(item(refs ? 'ok' : 'todo', refs ? refs + ' line reference' + (refs > 1 ? 's' : '') : 'Add line references: (cf. l. 5) / (cf. ll. 16–18)'));
                var longQ = q.filter(function (x) { return words(x).length > 8; });
                if (longQ.length) r.push(item('warn', 'Long quote — in comprehension answers, paraphrase instead.'));
                else if (q.length > 2) r.push(item('warn', 'Many quotes — use your own words.'));
                if (DEVICE_RE.test(plain) && /\b(metaphor|rhetorical|anaphora|alliteration|hyperbole|tricolon|enumeration|irony|stylistic)\b/i.test(plain))
                    r.push(item('warn', 'Comprehension asks <em>what</em>, not <em>how</em> — save stylistic devices for the analysis.'));
            }
            if (step === 2 && q.length) r.push(item('warn', 'No new quotes when rounding off.'));
        }

        if (kind === 'analysis') {
            if (step === 0) {
                r.push(item(authorRef ? 'ok' : 'todo', 'Names the author (' + T.author.split(' ').pop() + ' / the author)'));
                r.push(item(/\b(uses?|employs?|combines?|relies on|by means of|through|language|style|tone|structure|devices?|quot\w*|register)\b/i.test(plain) ? 'ok' : 'todo', 'Names the main techniques'));
                r.push(item(/\b(in order to|to (convince|show|make|inform|entertain|persuade|emphasi[sz]e|create|engage|warn|stress|underline)|so that|which (makes|helps|allows))\b/i.test(plain) ? 'ok' : 'todo', 'Says what they achieve (purpose / effect)'));
                if (wc > 75) r.push(item('warn', 'Long for a thesis — one or two sentences are enough.'));
            } else if (step === 1) {
                var startsLinked = LINKERS.some(function (l) { return t.toLowerCase().indexOf(l) === 0; }) || /^(first|second|third|another|also|in addition|apart from|besides)\b/i.test(t);
                r.push(item(startsLinked || authorRef ? 'ok' : 'todo', 'Claim: topic sentence or linking word at the start'));
                r.push(item(q.length ? 'ok' : 'todo', q.length ? 'Evidence: ' + q.length + ' quote' + (q.length > 1 ? 's' : '') : 'Evidence: add a quote “…”'));
                r.push(item(refs ? 'ok' : 'todo', refs ? 'Line reference given' : 'Add a line reference after the quote: (l. 12)'));
                r.push(item(EFFECT_RE.test(plain) ? 'ok' : 'todo', EFFECT_RE.test(plain) ? 'Effect explained' : 'Effect: what does it do to the reader? (emphasises, creates the impression …)'));
                var qw = q.reduce(function (n, x) { return n + words(x).length; }, 0);
                if (wc > 30 && qw / wc > 0.45) r.push(item('warn', 'More quote than explanation — explain more, quote less.'));
                if (countRe(t, /\bthis shows\b/i) > 1) r.push(item('warn', '“This shows” twice — try: <em>this illustrates, underlines, conveys</em>.'));
            } else {
                r.push(item(CONCLUSION_RE.test(t) ? 'ok' : 'todo', 'Signals the conclusion (All in all, To sum up …)'));
                r.push(item(/\b(message|intention|purpose|aim|convinc\w*|inform\w*|persuad\w*|reader|audience|target group)\b/i.test(plain) ? 'ok' : 'todo', 'Links style to message, purpose or target group'));
                if (q.length) r.push(item('warn', 'No new quotes in the conclusion.'));
            }
        }

        if (kind === 'eval') {
            if (step === 0) {
                r.push(item(POSITION_RE.test(t) || /\b(agree|disagree|convinc\w*|doubt\w*|realistic|unrealistic|desirable)\b/i.test(t) ? 'ok' : 'todo', 'Your position is clear'));
            } else if (step === 1) {
                r.push(item(EXAMPLE_RE.test(t) ? 'ok' : 'todo', 'Argument backed by an example'));
                r.push(item(COUNTER_RE.test(t) ? 'ok' : 'q', 'The other side considered? (here or in another paragraph)'));
            } else {
                r.push(item(CONCLUSION_RE.test(t) ? 'ok' : 'todo', 'Signals the conclusion'));
                r.push(item(/\b(because|since|as|therefore|thus)\b/i.test(t) ? 'ok' : 'todo', 'Justified, not just repeated'));
            }
        }
        return r;
    }

    function checkWhole(kind, text, T) {
        var r = [], t = text.trim();
        if (!t) return r;
        var plain = stripQuotes(t), wc = words(t).length, low = plain.toLowerCase();
        var range = kind === 'comp' ? [120, 220] : kind === 'analysis' ? [280, 500] : [250, 450];
        r.push(item(wc >= range[0] && wc <= range[1] ? 'ok' : (wc < range[0] ? 'todo' : 'warn'),
            wc + ' words <small>usual range for this type of answer: ' + range[0] + '–' + range[1] + '</small>'));

        var refs = countRe(t, LINEREF_RE);
        r.push(item(refs ? 'ok' : 'todo', refs ? refs + ' line references in total' : 'No line references yet'));

        var con = firstMatches(plain, CONTRACTION_RE, 3);
        if (con.length) r.push(item('warn', 'Contractions: ' + con.join(', ') + ' → write them out (<em>does not, it is</em>)'));

        var past = firstMatches(plain, PAST_RE, 3);
        if (past.length) r.push(item('warn', 'Past tense? ' + past.join(', ') + ' → talk about the text in the present tense (<em>states, argues</em>) <small>Past tense is fine for events the text reports.</small>'));

        if (kind !== 'eval') {
            var fp = (plain.match(FIRST_PERSON_RE) || []).length;
            if (fp) r.push(item('warn', '<em>I / my</em> used ' + fp + '× — keep your opinion out of levels I and II.'));
        }

        var inf = [];
        INFORMAL.forEach(function (x) { if (x[0].test(plain)) inf.push('<strong>' + x[1] + '</strong> → ' + x[2]); x[0].lastIndex = 0; });
        if (inf.length) r.push(item('warn', 'More precise words:<small>' + inf.slice(0, 3).join('<br>') + '</small>'));

        var says = countRe(low, /\bsays?\b/i);
        if (says > 1) r.push(item('warn', '<em>says</em> ' + says + '× → states, claims, argues, points out, stresses'));
        var shows = countRe(low, /\bshows?\b/i);
        if (shows > 2) r.push(item('warn', '<em>shows</em> ' + shows + '× → illustrates, reveals, demonstrates, conveys'));

        var used = {}, distinct = 0;
        LINKERS.forEach(function (l) {
            var n = countRe(low, new RegExp('\\b' + l.replace(/ /g, '\\s+') + '\\b', 'i'));
            if (n) { used[l] = n; distinct++; }
        });
        if (wc > 100) r.push(item(distinct >= 3 ? 'ok' : 'todo', distinct >= 3 ? distinct + ' different linking words' : 'Use more linking words to show your line of thought'));
        Object.keys(used).forEach(function (l) { if (used[l] >= 3) r.push(item('warn', '<em>' + l + '</em> ' + used[l] + '× — vary it')); });

        if (wc > 140) {
            var freq = {}, skip = {};
            STOP.forEach(function (w) { skip[w] = 1; });
            words(T.author + ' ' + T.title).forEach(function (w) { skip[w.toLowerCase()] = 1; });
            words(plain).forEach(function (w) { w = w.toLowerCase().replace(/['’]s$/, ''); if (w.length > 3 && !skip[w]) freq[w] = (freq[w] || 0) + 1; });
            var rep = Object.keys(freq).filter(function (w) { return freq[w] >= 5; }).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 2);
            rep.forEach(function (w) { r.push(item('warn', '<em>' + w + '</em> ' + freq[w] + '× — a synonym or a pronoun?')); });
        }

        var longS = sentences(plain).filter(function (s) { return words(s).length > 45; }).length;
        if (longS) r.push(item('warn', longS + ' very long sentence' + (longS > 1 ? 's' : '') + ' (45+ words) — split for clarity.'));
        return r;
    }

    /* ==================================================================
       5  Writing Coach
       ================================================================== */
    function initCoach() {
        var selT = document.getElementById('coachText');
        var selQ = document.getElementById('coachQ');
        var ed = document.getElementById('coachEditor');
        if (!selT || !selQ || !ed) return;
        var qBox = document.getElementById('coachQuestion');
        var stats = document.getElementById('coachStats');
        var saveState = document.getElementById('coachSave');
        var nameIn = document.getElementById('coachName');
        var cur = { t: 'baxter', q: 'q1' };
        var saveTimer = null;

        TEXT_ORDER.forEach(function (k) { var o = el('option', '', TEXTS[k].short); o.value = k; selT.appendChild(o); });
        try { var last = JSON.parse(store.get('qott-coach-last', 'null')); if (last && TEXTS[last.t]) cur = last; } catch (e) { /* egal */ }
        nameIn.value = store.get('qott-name', '');
        nameIn.addEventListener('input', function () { store.set('qott-name', nameIn.value); });

        function key() { return 'qott-answer-' + cur.t + '-' + cur.q; }
        function T() { return TEXTS[cur.t]; }
        function Q() { var qs = T().questions; for (var i = 0; i < qs.length; i++) if (qs[i].id === cur.q) return qs[i]; return qs[0]; }

        function fillQuestions() {
            selQ.textContent = '';
            T().questions.forEach(function (q, i) {
                var o = el('option', '', 'Question ' + (i + 1) + ' · level ' + q.level + (q.book ? ' (book task ' + q.book + ')' : ''));
                o.value = q.id; selQ.appendChild(o);
            });
        }

        function load() {
            selT.value = cur.t; fillQuestions(); selQ.value = cur.q;
            var t = T(), q = Q();
            qBox.innerHTML = '';
            var meta = el('div', 'meta', t.label + ' · ' + t.author + ', “' + t.title + '” · ' + t.source + ', ' + t.year + ' · ' + t.where);
            qBox.appendChild(meta);
            qBox.appendChild(el('div', '', q.text));
            ed.value = store.get(key(), '');
            store.set('qott-coach-last', JSON.stringify(cur));
            // Hilfen
            document.getElementById('cpContentCard').style.display = t.model && q.content ? '' : 'none';
            var pb = document.getElementById('cpPointers');
            lwAusDaten(pb, t.model ? 'guiding tips' : 'light pointers', q.tips || []);
            document.getElementById('cpPointersCard').style.display = (q.tips && q.tips.length) ? '' : 'none';
            update();
        }

        function currentStep(kind, text, pos) {
            var paras = paragraphsOf(text), idx = 0;
            for (var i = 0; i < paras.length; i++) { if (paras[i].start <= pos) idx = i; }
            var p = paras[idx] || { text: '', start: 0 };
            var step, firstSentence = true;
            if (CONCLUSION_RE.test(p.text) && (idx > 0 || kind === 'comp')) step = 2;
            else if (idx === 0) {
                step = 0;
                if (kind === 'comp') {
                    var s1 = sentences(p.text)[0] || '';
                    var rel = pos - p.start;
                    firstSentence = rel <= s1.length + 1 || !p.text.trim();
                    if (!firstSentence) step = 1;
                }
            } else step = 1;
            return { step: step, idx: idx, total: paras.length, para: p.text, firstSentence: firstSentence };
        }

        function renderList(ul, items) {
            ul.innerHTML = '';
            items.forEach(function (it) { var li = el('li', it.s); li.innerHTML = it.h; ul.appendChild(li); });
        }

        function update() {
            var t = T(), q = Q(), text = ed.value;
            var wc = words(text).length, pc = paragraphsOf(text).filter(function (p) { return p.text.trim(); }).length;
            stats.textContent = wc + ' words · ' + pc + ' paragraph' + (pc === 1 ? '' : 's');
            var st = currentStep(q.kind, text, ed.selectionStart || 0);
            // Schritt-Leiste
            var stepsBox = document.getElementById('cpSteps'); stepsBox.innerHTML = '';
            STEPS[q.kind].forEach(function (s, i) { stepsBox.appendChild(el('span', i === st.step ? 'on' : '', s)); });
            document.getElementById('cpWhere').textContent = text.trim() ? 'You are in paragraph ' + (st.idx + 1) + ' of ' + st.total : 'Empty answer — start with your first sentence.';
            document.getElementById('cpStepTitle').textContent = 'Guiding questions · ' + STEPS[q.kind][st.step];
            var g = GUIDE[q.kind][st.step].slice();
            if (q.kind === 'comp' && st.step === 0 && q.id !== 'q1') g = ['Pick up the question in your first sentence.'].concat(GUIDE.comp[1].slice(0, 1));
            renderList(document.getElementById('cpGuide'), g.map(function (x) { return item('q', x); }));
            // Inhalt (nur Modelltext)
            if (t.model && q.content) {
                var hit = 0, its = q.content.map(function (c) { var ok = c.re.test(text); if (ok) hit++; return item(ok ? 'ok' : 'todo', c.q); });
                renderList(document.getElementById('cpContent'), its);
                document.getElementById('cpContentCount').textContent = hit + ' / ' + q.content.length;
                document.getElementById('cpMeter').style.width = Math.round(100 * hit / q.content.length) + '%';
            }
            renderList(document.getElementById('cpPara'), checkParagraph(q.kind, st.step, st.para, t, q, q.id === 'q1', st.firstSentence));
            var whole = checkWhole(q.kind, text, t);
            renderList(document.getElementById('cpWhole'), whole.length ? whole : [item('todo', 'The overall checks appear once you have written something.')]);
            // Phrasen
            var chips = document.getElementById('cpPhrases'); chips.innerHTML = '';
            PHRASES[q.kind][st.step].forEach(function (ph) {
                var b = el('button', 'chip-btn', ph.trim()); b.type = 'button';
                b.addEventListener('click', function () { insertAtCursor(ph.indexOf('[text type]') > -1 ? introFromText(t) : ph); });
                chips.appendChild(b);
            });
        }

        function introFromText(t) {
            if (t.type === 'speech') return 'In his speech “' + t.title + '”, delivered to ' + t.source + ' on ' + t.year + ', ' + t.author + ' ';
            return 'In the ' + t.type + ' “' + t.title + '”, published in ' + t.source + ' in ' + t.year.replace(/^\d+ \w+ /, '') + ', ' + t.author + ' ';
        }

        function insertAtCursor(s) {
            var a = ed.selectionStart || 0, b = ed.selectionEnd || 0, v = ed.value;
            var before = v.slice(0, a);
            if (before && !/\s$/.test(before) && !/^[\s(]/.test(s)) s = ' ' + s;
            ed.value = before + s + v.slice(b);
            ed.focus();
            var p = a + s.length; ed.setSelectionRange(p, p);
            onInput();
        }

        function onInput() {
            saveState.textContent = 'saving …';
            clearTimeout(saveTimer);
            saveTimer = setTimeout(function () {
                saveState.textContent = store.set(key(), ed.value) ? 'saved in this browser' : 'not saved (storage blocked) — download your text!';
            }, 400);
            update();
        }

        ed.addEventListener('input', onInput);
        ['click', 'keyup', 'focus'].forEach(function (ev) { ed.addEventListener(ev, update); });
        selT.addEventListener('change', function () { cur = { t: selT.value, q: 'q1' }; load(); });
        selQ.addEventListener('change', function () { cur = { t: selT.value, q: selQ.value }; load(); });

        // Löschen mit Bestätigung im Knopf selbst (zweiter Klick innerhalb von 4 s)
        var clearBtn = document.getElementById('coachClear'), clearArmed = null;
        clearBtn.addEventListener('click', function () {
            if (ed.value.trim() && !clearArmed) {
                clearBtn.textContent = 'Click again to delete';
                clearArmed = setTimeout(function () { clearArmed = null; clearBtn.textContent = 'Clear this answer'; }, 4000);
                return;
            }
            clearTimeout(clearArmed); clearArmed = null; clearBtn.textContent = 'Clear this answer';
            ed.value = ''; store.del(key()); update();
        });
        document.getElementById('coachCopy').addEventListener('click', function () {
            var b = this;
            function done() { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ed.value).then(done, function () { ed.select(); });
            else { ed.select(); try { document.execCommand('copy'); done(); } catch (e) { /* egal */ } }
        });
        document.getElementById('coachTxt').addEventListener('click', function () {
            var t = T(), q = Q();
            var content = 'Questions on the Text · English Q13\n' + (nameIn.value ? nameIn.value + '\n' : '') +
                t.author + ': “' + t.title + '” (' + t.source + ', ' + t.year + ')\n\n' + q.text + '\n\n' + ed.value + '\n';
            var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName('txt');
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
        document.getElementById('coachPdf').addEventListener('click', function () {
            if (!window.jspdf || !window.jspdf.jsPDF) { document.getElementById('coachTxt').click(); return; }
            exportPdf();
        });

        function fileName(ext) {
            var n = (nameIn.value || 'student').trim().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, '_') || 'student';
            return 'QotT_' + cur.t + '_' + cur.q + '_' + n + '.' + ext;
        }

        function exportPdf() {
            var t = T(), q = Q();
            var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
            var margin = 50, pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
            var w = pageW - 2 * margin, y = margin;
            function para(txt, size, style, color, lh, gap) {
                doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor.apply(doc, color);
                doc.splitTextToSize(String(txt || ''), w).forEach(function (line) {
                    if (y > pageH - margin) { doc.addPage(); y = margin; }
                    doc.text(line, margin, y); y += lh;
                });
                y += gap || 0;
            }
            para('Questions on the Text · English Q13', 16, 'bold', [30, 41, 59], 20, 2);
            para((nameIn.value || '') + '   ' + new Date().toLocaleDateString('en-GB'), 11, 'normal', [100, 116, 139], 14, 8);
            para(t.author + ': “' + t.title + '” — ' + t.source + ', ' + t.year, 11, 'italic', [100, 116, 139], 14, 6);
            para(q.text, 11, 'bold', [30, 41, 59], 15, 10);
            paragraphsOf(ed.value).forEach(function (p) { if (p.text.trim()) para(p.text.trim(), 12, 'normal', [30, 41, 59], 17, 9); });
            para(words(ed.value).length + ' words · written with the edu-mrh.de writing coach', 9, 'italic', [148, 163, 184], 12, 0);
            doc.save(fileName('pdf'));
        }

        // Von außen: Coach mit Text/Frage öffnen und ggf. Text einfügen
        window.qottOpenCoach = function (t, q, insert) {
            if (TEXTS[t]) { cur = { t: t, q: q || 'q1' }; load(); }
            if (window.siteManager) window.siteManager.navigateToSection('coach');
            if (insert) {
                setTimeout(function () {
                    if (ed.value.trim()) ed.value = ed.value.replace(/\s*$/, '') + '\n\n' + insert; else ed.value = insert;
                    onInput(); ed.focus();
                }, 50);
            }
        };

        load();
    }

    /* ==================================================================
       6  Textkarten
       ================================================================== */
    function initTextCards() {
        var box = document.getElementById('textCards');
        if (!box) return;
        TEXT_ORDER.forEach(function (k) {
            var t = TEXTS[k];
            var c = el('div', 'text-card' + (t.model ? ' model-t' : ''));
            c.appendChild(el('span', 'badge ' + (t.model ? 'badge-primary' : 'badge-secondary'), t.label + (t.model ? ' · round 1' : ' · round 2')));
            c.appendChild(el('h3', '', '“' + t.title + '”'));
            var src = el('div', 'src');
            src.textContent = t.author + ' · ' + t.source + ', ' + t.year + ' · ' + t.type + ' · ' + t.where;
            if (t.url) {
                src.appendChild(document.createTextNode(' · '));
                var a = el('a', '', 'original ↗'); a.href = t.url; a.target = '_blank'; a.rel = 'noopener';
                src.appendChild(a);
            }
            c.appendChild(src);
            c.appendChild(el('p', 'small', t.about));
            var ol = el('ol', 'grow');
            t.questions.forEach(function (q) {
                var li = el('li');
                li.appendChild(el('span', 'lvl', q.level));
                li.appendChild(document.createTextNode(q.text));
                ol.appendChild(li);
            });
            c.appendChild(ol);
            var row = el('div', 'row-btns');
            t.questions.forEach(function (q, i) {
                var b = el('button', 'btn btn-outline btn-sm', 'Q' + (i + 1) + ' \u2192 coach');
                b.type = 'button';
                b.addEventListener('click', function () { window.qottOpenCoach(k, q.id); });
                row.appendChild(b);
            });
            c.appendChild(row);
            box.appendChild(c);
        });
    }

    /* ==================================================================
       7  Selbsttest, Formulare, Satzbaukasten
       ================================================================== */
    function initQuiz() {
        var btn = document.getElementById('levelQuizCheck');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var items = document.querySelectorAll('#levelQuiz .quiz-item'), right = 0, answered = 0;
            items.forEach(function (it) {
                var v = it.querySelector('select').value;
                it.classList.remove('correct', 'incorrect');
                if (!v) return;
                answered++;
                if (v === it.getAttribute('data-correct')) { it.classList.add('correct'); right++; } else it.classList.add('incorrect');
            });
            var fb = document.getElementById('levelQuizFeedback');
            if (!answered) fb.textContent = 'Choose a level for each task first.';
            else if (right === items.length) fb.textContent = '✓ All correct. The operator decides — not the topic.';
            else fb.textContent = right + ' of ' + items.length + ' correct. Look at the first word of each task again.';
        });
    }

    function initStoredForms() {
        document.querySelectorAll('[data-store]').forEach(function (box) {
            var k = box.getAttribute('data-store'), data = {};
            try { data = JSON.parse(store.get(k, '{}')) || {}; } catch (e) { data = {}; }
            box.querySelectorAll('[data-key]').forEach(function (f) {
                var name = f.getAttribute('data-key');
                if (f.type === 'checkbox') f.checked = !!data[name]; else if (data[name]) f.value = data[name];
                f.addEventListener(f.type === 'checkbox' ? 'change' : 'input', function () {
                    data[name] = f.type === 'checkbox' ? f.checked : f.value;
                    store.set(k, JSON.stringify(data));
                });
            });
        });
        var reset = document.getElementById('checklistReset');
        if (reset) reset.addEventListener('click', function () {
            document.querySelectorAll('#finalChecklist input[type=checkbox]').forEach(function (c) { c.checked = false; });
            store.del('qott-checklist');
        });
    }

    function initBuilder() {
        var ids = ['ibType', 'ibTitle', 'ibSource', 'ibDate', 'ibAuthor', 'ibVerb', 'ibTopic'];
        var f = {}; ids.forEach(function (i) { f[i] = document.getElementById(i); });
        var out = document.getElementById('ibOut');
        if (!out) return;
        var saved = {};
        try { saved = JSON.parse(store.get('qott-intro', '{}')) || {}; } catch (e) { saved = {}; }
        ids.forEach(function (i) { if (saved[i]) f[i].value = saved[i]; });

        function build() {
            var v = {}; ids.forEach(function (i) { v[i] = (f[i].value || '').trim(); saved[i] = f[i].value; });
            store.set('qott-intro', JSON.stringify(saved));
            var dateWord = /^\d{4}$/.test(v.ibDate) ? 'in ' + v.ibDate : (v.ibDate ? 'on ' + v.ibDate : 'in [date]');
            var s = 'In the ' + v.ibType + ' “' + (v.ibTitle || '[title]') + '”, published in ' + (v.ibSource || '[source]') + ' ' + dateWord + ', ' +
                (v.ibAuthor || '[author]') + ' ' + v.ibVerb + ' ' + (v.ibTopic || '[topic / main intention]') + '.';
            s = s.replace(/\.\.$/, '.');
            out.textContent = s;
            return s;
        }
        ids.forEach(function (i) { f[i].addEventListener('input', build); f[i].addEventListener('change', build); });
        build();
        document.getElementById('ibCopy').addEventListener('click', function () {
            var b = this, s = build();
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); });
        });
        document.getElementById('ibToCoach').addEventListener('click', function () {
            var last = { t: 'baxter', q: 'q1' };
            try { last = JSON.parse(store.get('qott-coach-last', 'null')) || last; } catch (e) { /* egal */ }
            window.qottOpenCoach(last.t, 'q1', build());
        });
    }

    function initCoachButtons() {
        document.querySelectorAll('[data-coach-open]').forEach(function (b) {
            b.addEventListener('click', function () {
                var p = b.getAttribute('data-coach-open').split(':');
                window.qottOpenCoach(p[0], p[1]);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.lw[data-loesungsweg]').forEach(loesungsweg);
        initQuiz();
        initStoredForms();
        initCoach();
        initTextCards();
        initBuilder();
        initCoachButtons();
    });
})();
