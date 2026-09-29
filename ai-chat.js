/* ==========================================================================
   DHL — ai-chat.js
   The "Ask DHL AI" assistant: floating button on every page, and a full
   chat on ai-assistant.html.

   DEMO MODE (AI_CONFIG.enabled = false)
     No AI is used. The assistant searches DHL content already on this
     site (topics, lessons, studies, FAQ) and shows the best-matching
     passage with its source. This is retrieval only, the first half of
     RAG, so visitors can test the interface honestly.

   LIVE MODE (AI_CONFIG.enabled = true, AI_CONFIG.endpoint set)
     Questions are POSTed to YOUR backend, which does retrieval over the
     approved DHL knowledge base and calls the AI provider with a secret
     key that never reaches the browser. See README section 13 for the
     request and response format.
   ========================================================================== */
(() => {
  "use strict";
  const { $, esc, icon, formUrl, bibleUrl } = window.DHL;
  const LIVE = Boolean(AI_CONFIG.enabled && AI_CONFIG.endpoint);
  const DISCLAIMER = "DHL AI is an educational assistant. It does not replace personal Bible study, pastoral guidance, or a human mentor.";

  /* ---------- 1. Knowledge from this site (demo retrieval) ---------- */
  /* Answers written in Pages CMS ("AI assistant: knowledge", content/ai-knowledge.json).
     sourceType keeps the sources separate, as the DHL AI rules require. */
  const SOURCE_LABEL = { dhl: "DHL answer", bible: "Bible study note", park: "Pastor Ock Soo Park's teaching" };
  function knowledgeDocs() {
    return (window.aiKnowledge || []).filter(k => k && k.enabled !== false && k.answer).map(k => {
      const type = SOURCE_LABEL[k.sourceType] ? k.sourceType : "dhl";
      const src = type === "dhl" ? (k.source || SOURCE_LABEL.dhl) : k.source ? `${SOURCE_LABEL[type]}: ${k.source}` : SOURCE_LABEL[type];
      return { title: k.question || "", summary: k.answer, keywords: (k.keywords || []).filter(Boolean), refs: (k.refs || []).filter(Boolean),
        kind: type === "park" ? "park" : type === "bible" ? "doctrine" : "practical", custom: true, sourceType: type, bookSource: k.source || "",
        source: src, href: k.link || "", needsMentor: Boolean(k.needsMentor) };
    });
  }
  const corpus = [
    ...gospelTopics.map(t => ({ ...t, kind: "doctrine", source: `Gospel & Bible: ${t.title}`, href: `gospel.html#${t.id}` })),
    ...gospelCourse.map((t, i) => ({ ...t, kind: "doctrine", source: `Beginner Gospel Course, lesson ${i + 1}`, href: "gospel.html#course" })),
    ...discipleshipTopics.map(t => ({ ...t, kind: "doctrine", source: `Discipleship: ${t.title}`, href: `discipleship.html#${t.id}` })),
    ...bibleStudies.map(t => ({ ...t, refs: [t.passage], kind: "study", source: `Bible study: ${t.title}`, href: "gospel.html#studies" })),
    ...leadershipTopics.map(t => ({ ...t, kind: "leadership", source: `Leadership: ${t.title}`, href: `leadership.html#${t.id}` })),
    ...digitalTopics.map(t => ({ ...t, kind: "practical", source: `Digital Ministry: ${t.title}`, href: "digital-ministry.html" })),
    ...mindTopics.map(t => ({ ...t, kind: "doctrine", source: `Mind Education: ${t.title}`, href: `mind-education.html#${t.id}` })),
    ...koreaGuides.map(g => { const area = (koreaAreas.find(a => a.id === g.area) || {}).title || g.area; return { title: g.title, summary: g.text + (g.tips ? " " + g.tips.join(" ") : ""), kind: "practical", source: `Live in Korea: ${area}`, href: `live-in-korea.html#${g.area}`, keywords: [area] }; }),
    ...qaItems.map(x => ({ title: x.q, summary: x.a, kind: "practical", source: `Q&A Corner: ${x.category}`, href: "live-in-korea.html#qa", keywords: [x.category] })),
    ...certificateCourses.filter(c => c.status === "open").map(c => ({ title: c.title, summary: `${c.description} This is a DHL certificate course (${c.category}, ${c.level}).`, kind: "practical", source: `Certificate Course: ${c.title}`, href: `course.html?id=${c.id}`, keywords: [c.category, "course", "certificate"] })),
    ...knowledgeDocs()
  ];

  const STOP = new Set("a an the and or but is are was were be been am i you he she it we they me my your our of to in on at for with about from as by what who whom how why when where which this that these those do does did can could should would will shall there their them his her its not no yes please tell explain mean means meaning dhl".split(" "));
  const tokens = s => String(s || "").toLowerCase().replace(/[^a-z0-9가-힣\s']/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));

  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, " ").trim();
  function retrieve(question, { includePark = false } = {}) {
    const q = tokens(question);
    if (!q.length) return [];
    return corpus.filter(doc => includePark || doc.kind !== "park").map(doc => {
      const title = tokens(doc.title), body = tokens(`${doc.summary} ${(doc.refs || []).join(" ")}`), keys = (doc.keywords || []).map(k => k.toLowerCase());
      let score = 0;
      q.forEach(w => {
        if (title.some(t => same(t, w))) score += 4;
        if (keys.some(k => k.split(" ").some(t => same(t, w)))) score += 3;
        score += Math.min(2, body.filter(t => same(t, w)).length);
      });
      if (keys.some(k => k.includes(" ") && question.toLowerCase().includes(k))) score += 4;
      if (doc.custom && score > 0) score += 3;                                   // DHL's own answers come first
      if (doc.custom && doc.title && norm(doc.title) === norm(question)) score += 50; // exact question
      return { doc, score };
    }).filter(r => r.score >= 4).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /* ---------- 2. Safety: questions that need a person, now ---------- */
  const CRISIS = /(suicid|kill myself|end my life|want to die|self[- ]?harm|hurt myself|cutting myself|자살)/i;
  const URGENT = /(abuse|abused|assault|rape|beaten|hit me|violence|traffick|passport (was )?taken|locked in|threaten|emergency|depress|panic attack|can't go on|cannot go on)/i;

  function safetyReply(q) {
    const crisis = CRISIS.test(q);
    const nums = koreaHelpNumbers.filter(n => crisis ? ["109", "119", "112"].includes(n.number) : true);
    return {
      text: crisis
        ? "Thank you for telling me. What you're feeling matters, and you deserve support from a real person right now. If you might act on these thoughts, please call 119 immediately. You can also call 109 for suicide prevention counseling, any time."
        : "This sounds serious, and it's important that a real person helps you. If you are in danger, call 112 (police) or 119. For help in your language, call 1345 or 1577-1366. A DHL mentor can also listen and help you find the right support.",
      numbers: nums, mentor: true, sources: []
    };
  }

  /* ---------- 3. Answering ---------- */
  /* Questions about Rev. Ock Soo Park's teaching. His books are not in
     the demo knowledge base, so the demo says so instead of guessing
     (DHL AI prompt, section 8). */
  const PARK = /(ock\s*soo|ok\s*soo|pastor park|pastor\s+ock|rev\.?\s*park|박옥수|옥수)/i;

  function demoAnswer(q) {
    const hits = retrieve(q);
    if (PARK.test(q)) {
      const park = retrieve(q.replace(PARK, " "), { includePark: true }).filter(h => h.doc.kind === "park");
      if (park.length) {
        const k = park[0].doc;
        return {
          text: `**Pastor Ock Soo Park's teaching**${k.bookSource ? ` (from ${k.bookSource})` : ""}:\n\n${k.summary}\n\nThis is Pastor Park's explanation, not a quotation from the Bible. Read the passages below for yourself.`,
          refs: k.refs, sources: [{ title: k.source, url: k.href }], mentor: true, demo: true, custom: true
        };
      }
      const bible = hits.filter(h => ["doctrine", "study"].includes(h.doc.kind)).slice(0, 2);
      return {
        text: "I don't currently have the exact text of Pastor Ock Soo Park's books in my knowledge base, so I can't tell you what he teaches on this without guessing." +
          (bible.length ? `\n\nIn the Bible, these passages speak to your question. DHL's study note says: ${bible[0].doc.summary}` : "") +
          "\n\nA DHL mentor can talk with you about Pastor Park's teaching directly.",
        refs: [...new Set(bible.flatMap(h => h.doc.refs || []))].slice(0, 4),
        sources: bible.map(h => ({ title: h.doc.source, url: h.doc.href })),
        mentor: true, demo: true, draft: bible.some(h => h.doc.status === "draft")
      };
    }
    if (!hits.length) {
      return { text: "I couldn't find this in DHL's resources yet. A DHL mentor would be glad to talk it through with you, or try asking with a different word.", sources: [], mentor: true, demo: true };
    }
    const top = hits[0].doc;
    if (top.custom) {
      return { text: top.summary, refs: top.refs, sources: [{ title: top.source, url: top.href }],
        mentor: top.needsMentor || top.kind === "doctrine", demo: true, custom: true };
    }
    const parts = [top.summary];
    if (hits[1] && hits[1].score >= hits[0].score - 2 && hits[1].doc.summary !== top.summary) parts.push(hits[1].doc.summary);
    const refs = [...new Set(hits.slice(0, 2).flatMap(h => h.doc.refs || []))].slice(0, 4);
    return {
      text: parts.join(" "),
      refs,
      sources: hits.map(h => ({ title: h.doc.source, url: h.doc.href })).filter((s, i, a) => a.findIndex(x => x.title === s.title) === i),
      mentor: ["doctrine", "study"].includes(top.kind),
      draft: hits.some(h => h.doc.status === "draft"),
      demo: true
    };
  }

  async function liveAnswer(q, history) {
    const res = await fetch(AI_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, history: history.slice(-6), page: location.pathname })
    });
    if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`);
    const data = await res.json();
    return { text: String(data.answer || ""), sources: Array.isArray(data.sources) ? data.sources : [], mentor: Boolean(data.needsMentor), refs: data.refs || [] };
  }

  async function answer(q, history) {
    if (CRISIS.test(q) || URGENT.test(q)) return safetyReply(q);
    if (LIVE) {
      try { return await liveAnswer(q, history); }
      catch (e) {
        console.warn("[DHL AI]", e.message);
        const d = demoAnswer(q); d.notice = "The AI service isn't available right now, so here is the closest match from DHL resources."; return d;
      }
    }
    return demoAnswer(q);
  }

  /* ---------- 4. Chat interface ---------- */
  const SUGGESTIONS = ["What is repentance?", "What does it mean to be born again?", "How can I receive forgiveness?", "What does Pastor Park teach about forgiveness?", "Where can I learn Korean?"];

  /* Safe formatting for answers: text is escaped first, then a few
     Markdown patterns from the live AI (### headings, **bold**, "- " and
     "1. " lists, "> " quotes) are turned into HTML. */
  function formatText(text) {
    const inline = t => t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    const out = []; let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    esc(text).split(/\n/).forEach(raw => {
      const line = raw.trim();
      if (!line) { close(); return; }
      let m;
      if ((m = line.match(/^#{1,4}\s+(.*)/))) { close(); out.push(`<h3 class="msg-h">${inline(m[1])}</h3>`); }
      else if ((m = line.match(/^[-*•]\s+(.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = line.match(/^\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = line.match(/^&gt;\s?(.*)/))) { close(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
      else { close(); out.push(`<p>${inline(line)}</p>`); }
    });
    close();
    return out.join("");
  }

  function createChat(root, { floating = false } = {}) {
    const id = floating ? "fchat" : "ichat";
    const mentor = formUrl("mentor");
    root.innerHTML = `
      <div class="chat-head">
        <span class="chat-avatar" aria-hidden="true">${icon("spark")}</span>
        <div><h2 id="${id}-title">${esc(AI_CONFIG.assistantName)}</h2><p>${LIVE ? "Answers from DHL-approved resources" : "Demo mode: searches DHL content on this site"}</p></div>
        ${floating ? `<button type="button" class="icon-btn chat-close" aria-label="Close chat">${icon("close")}</button>` : ""}
      </div>
      <div class="chat-log" role="log" aria-live="polite" aria-labelledby="${id}-title">
        <div class="msg msg-ai"><p>Hello! I can help you study the Bible and understand the Gospel, and answer questions about discipleship, leadership and life in Korea. ${LIVE ? "You can ask in English, Filipino, Taglish or Korean." : "This demo understands English questions."}</p></div>
      </div>
      <div class="chat-suggest" aria-label="Suggested questions">${SUGGESTIONS.map(s => `<button type="button" class="chip chip-small" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <form class="chat-form">
        <label for="${id}-input" class="sr-only">Ask a question</label>
        <textarea id="${id}-input" rows="1" maxlength="${AI_CONFIG.maxQuestionLength}" placeholder="Ask a question…" required></textarea>
        <button type="submit" class="send-btn">${icon("send")}<span class="sr-only">Send</span></button>
      </form>
      <div class="chat-foot">
        <p>${esc(DISCLAIMER)}</p>
        ${mentor ? `<a class="btn btn-quiet btn-small" href="${esc(mentor)}" target="_blank" rel="noopener">${icon("user")}Talk to a DHL Mentor</a>` : ""}
      </div>`;

    const log = $(".chat-log", root), form = $(".chat-form", root), input = $("textarea", root), send = $(".send-btn", root);
    const history = [];

    const renderAnswer = a => {
      const refs = (a.refs || []).length ? `<p class="msg-refs">${icon("book")}<span>Read: ${a.refs.map(r => `<a href="${bibleUrl(r)}" target="_blank" rel="noopener">${esc(r)}</a>`).join(", ")}</span></p>` : "";
      const nums = a.numbers ? `<ul class="msg-numbers">${a.numbers.map(n => `<li><a href="tel:${n.number.replace(/\D/g, "")}"><strong>${esc(n.number)}</strong> ${esc(n.label)}</a></li>`).join("")}</ul>` : "";
      const src = a.sources.length ? `<div class="msg-sources"><p>Sources</p><ul>${a.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("")}</ul></div>` : "";
      const notes = [a.notice, a.demo ? (a.custom ? "Demo mode: this answer was written by DHL in the AI knowledge base, not generated by an AI." : "Demo mode: this text is a DHL study note taken directly from this website, not an AI answer. Read the Bible passages yourself.") : "", a.draft ? "Some of this content is still a draft awaiting DHL approval." : ""].filter(Boolean);
      const mentorBtn = a.mentor && mentor ? `<a class="btn btn-mango btn-small" href="${esc(mentor)}" target="_blank" rel="noopener">Talk to a DHL Mentor</a>` : "";
      return `<div class="msg msg-ai">${formatText(a.text)}${nums}${refs}${src}${notes.length ? `<p class="msg-note">${notes.map(esc).join(" ")}</p>` : ""}${mentorBtn}</div>`;
    };

    async function ask(q) {
      q = q.trim().slice(0, AI_CONFIG.maxQuestionLength);
      if (!q) return;
      log.insertAdjacentHTML("beforeend", `<div class="msg msg-user"><p>${esc(q)}</p></div>`);
      const typing = document.createElement("div");
      typing.className = "msg msg-ai msg-typing"; typing.innerHTML = '<span></span><span></span><span></span><span class="sr-only">Searching</span>';
      log.appendChild(typing); log.scrollTop = log.scrollHeight;
      input.value = ""; send.disabled = true;
      const a = await answer(q, history);
      if (!LIVE) await new Promise(r => setTimeout(r, 350));
      typing.remove();
      log.insertAdjacentHTML("beforeend", renderAnswer(a));
      history.push({ role: "user", content: q }, { role: "assistant", content: a.text });
      send.disabled = false; log.scrollTop = log.scrollHeight;
    }

    form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
    input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; });
    root.addEventListener("click", e => { const s = e.target.closest("[data-q]"); if (s) ask(s.dataset.q); });
    return { ask, input };
  }

  /* ---------- 5. Mount ---------- */
  const inline = $("#ai-chat-inline");
  if (inline) {
    const chat = createChat(inline);
    const q = new URLSearchParams(location.search).get("q");
    if (q) chat.ask(q);
    return; // no floating button on the assistant page
  }

  if (document.body.dataset.page === "admin") return;
  const fab = document.createElement("button");
  fab.type = "button"; fab.className = "ai-fab";
  fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "ai-panel");
  fab.innerHTML = `${icon("chat")}<span>Ask DHL AI</span>`;
  const panel = document.createElement("section");
  panel.id = "ai-panel"; panel.className = "ai-panel"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-labelledby", "fchat-title");
  document.body.append(panel, fab);
  let chat;
  const setOpen = open => {
    if (open && !chat) chat = createChat(panel, { floating: true });
    panel.hidden = !open; fab.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("chat-open", open);
    if (open) chat.input.focus(); else fab.focus();
  };
  fab.addEventListener("click", () => setOpen(panel.hidden));
  panel.addEventListener("click", e => { if (e.target.closest(".chat-close")) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  document.addEventListener("click", e => { if (e.target.closest("[data-open-ai]")) { e.preventDefault(); setOpen(true); } });
})();
