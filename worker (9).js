/* ==========================================================================
   DHL AI — example backend (Cloudflare Worker)

   Sits between the DHL website and the AI provider (Anthropic's Claude API
   here). The secret API key is stored in Cloudflare, never in the website.

   The website sends:   POST { question, history, page }
   This worker returns: { answer, sources, refs, needsMentor }

   Instructions for the AI come from ai/dhl-ai-system-prompt.md, loaded
   from your published site (PROMPT_URL), so editing that file on GitHub
   changes how DHL AI answers. See README.md in this folder.
   ========================================================================== */

const MAX_QUESTION = 600;
const MAX_HISTORY = 6;
const PROMPT_CACHE_MS = 10 * 60 * 1000;
let promptCache = { text: "", at: 0 };

const CRISIS = /(suicid|kill myself|end my life|want to die|self[- ]?harm|hurt myself|자살|magpakamatay)/i;
const URGENT = /(abuse|abused|assault|rape|beaten|violence|traffick|passport (was )?taken|threaten|emergency)/i;

/* Added to the DHL prompt so the website can read the reply. */
function formatRules(booksAvailable, hasParkKnowledge) {
  return `

---
# RESPONSE FORMAT (for the DHL website)

Reply with ONE JSON object and nothing else (no code fences):
{
  "answer": "Your answer in Markdown. Use ### headings from section 7 when useful. Keep it under about 350 words unless the user asks for a full study.",
  "sources": [{ "title": "e.g. The Bible: John 3:1-21" }],
  "refs": ["John 3:3", "Titus 3:5"],
  "needsMentor": false
}

- "refs": Bible references you actually cite, written like "Romans 5:8".
- "sources": what the answer is based on. Label Bible sources "The Bible: ..." and
  Pastor Park sources "Pastor Ock Soo Park: <book title>". Never list a source you did not use.
- "needsMentor": true when the question is personal, pastoral, sensitive, or when you are uncertain.
- Answer in the language the user wrote in (English, Filipino, Taglish, Korean).
${booksAvailable ? "" : `
IMPORTANT: No text from Pastor Ock Soo Park's books has been provided to you in this system yet${hasParkKnowledge ? ", apart from the PASTOR OCK SOO PARK'S TEACHING entries in the DHL knowledge base below, which you may use and cite" : ""}.
If the user asks what Pastor Park teaches${hasParkKnowledge ? " and no knowledge-base entry covers it" : ""}, do not describe or quote his teaching from memory.
Say: "I don't currently have the exact text of that section in my knowledge base. If you upload the book or the relevant pages, I can analyze it accurately."
Then answer from the Bible, and suggest talking with a DHL mentor.`}`;
}

async function loadPrompt(env) {
  if (promptCache.text && Date.now() - promptCache.at < PROMPT_CACHE_MS) return promptCache.text;
  try {
    const res = await fetch(env.PROMPT_URL, { cf: { cacheTtl: 600 } });
    if (res.ok) { promptCache = { text: await res.text(), at: Date.now() }; return promptCache.text; }
  } catch (e) { /* fall through */ }
  return promptCache.text || "You are DHL AI, a careful Bible study assistant for DHL – Diaspora Hub for Leaders. Answer from Scripture first, never invent verses or quotations, and recommend a human mentor for personal questions.";
}

/* DHL-approved answers written in Pages CMS (content/ai-knowledge.json). */
let knowledgeCache = { entries: [], at: 0 };
async function loadKnowledge(env) {
  if (!env.KNOWLEDGE_URL) return [];
  if (knowledgeCache.at && Date.now() - knowledgeCache.at < PROMPT_CACHE_MS) return knowledgeCache.entries;
  try {
    const res = await fetch(env.KNOWLEDGE_URL, { cf: { cacheTtl: 600 } });
    if (res.ok) {
      const data = await res.json();
      const entries = (Array.isArray(data.entries) ? data.entries : []).filter(k => k && k.enabled !== false && k.answer);
      knowledgeCache = { entries, at: Date.now() };
      return entries;
    }
  } catch (e) { /* fall through */ }
  return knowledgeCache.entries;
}

const LABELS = { dhl: "DHL ANSWER", bible: "BIBLE STUDY NOTE", park: "PASTOR OCK SOO PARK'S TEACHING" };
function knowledgeSection(entries) {
  if (!entries.length) return "";
  const text = entries.slice(0, 200).map((k, i) => {
    const type = LABELS[k.sourceType] ? k.sourceType : "dhl";
    return [`[${i + 1}] ${LABELS[type]}${k.source ? ` | Source: ${k.source}` : ""}`,
      `Question: ${k.question || ""}`,
      (k.keywords || []).length ? `Keywords: ${k.keywords.join(", ")}` : "",
      (k.refs || []).length ? `Bible references: ${k.refs.join(", ")}` : "",
      k.link ? `Link: ${k.link}` : "",
      k.needsMentor ? "Also recommend a DHL mentor." : "",
      `Answer: ${String(k.answer).slice(0, 3000)}`].filter(Boolean).join("\n");
  }).join("\n\n");
  return `

---
# DHL KNOWLEDGE BASE (approved by DHL)

When a question matches an entry below, base your answer on that entry and list its source in "sources".
Keep each entry's label: a BIBLE STUDY NOTE is DHL's explanation of Scripture, not Scripture itself, and
PASTOR OCK SOO PARK'S TEACHING must always be presented as his teaching (section 3 and 15), never as the Bible.
Use Pastor Park entries only when the user asks about his teaching or it is clearly relevant.

${text}`;
}

function cors(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

function safetyReply(question) {
  return {
    answer: CRISIS.test(question)
      ? "Thank you for telling me. What you're feeling matters, and you deserve support from a real person right now. If you might act on these thoughts, please call 119 immediately. You can also call 109 for suicide prevention counseling, any time."
      : "This sounds serious, and it's important that a real person helps you. If you are in danger, call 112 (police) or 119. For help in your language, call 1345. A DHL mentor can also listen and help you find support.",
    sources: [], refs: [], needsMentor: true
  };
}

function parseModelJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  try {
    const d = JSON.parse(cleaned.slice(start, end + 1));
    return {
      answer: String(d.answer || "").trim(),
      sources: Array.isArray(d.sources) ? d.sources.slice(0, 6).map(s => ({ title: String(s.title || ""), url: String(s.url || "") })) : [],
      refs: Array.isArray(d.refs) ? d.refs.slice(0, 8).map(String) : [],
      needsMentor: Boolean(d.needsMentor)
    };
  } catch (e) {
    return { answer: cleaned, sources: [], refs: [], needsMentor: false };
  }
}

export default {
  async fetch(request, env) {
    const headers = cors(env, request.headers.get("Origin") || "");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Use POST" }, 405, headers);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "Invalid JSON" }, 400, headers); }
    const question = String(body.question || "").trim().slice(0, MAX_QUESTION);
    if (!question) return json({ error: "Question is empty" }, 400, headers);

    if (CRISIS.test(question) || URGENT.test(question)) return json(safetyReply(question), 200, headers);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "Server is missing ANTHROPIC_API_KEY" }, 500, headers);

    // Conversation history: alternating user/assistant turns, starting with the user.
    const history = (Array.isArray(body.history) ? body.history : [])
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (history.length && history[0].role !== "user") history.shift();
    const messages = [...history, { role: "user", content: question }];

    const knowledge = await loadKnowledge(env);
    const hasPark = knowledge.some(k => k.sourceType === "park");
    const system = (await loadPrompt(env)) + formatRules(env.BOOKS_AVAILABLE === "true", hasPark) + knowledgeSection(knowledge);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({ model: env.MODEL, max_tokens: Number(env.MAX_TOKENS || 1500), system, messages })
    });

    if (!res.ok) {
      console.error("AI provider error", res.status, await res.text());
      return json({ error: "The AI service is unavailable" }, 502, headers);
    }
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return json(parseModelJson(text), 200, headers);
  }
};
