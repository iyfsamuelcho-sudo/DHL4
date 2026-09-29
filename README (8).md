# DHL AI backend (example)

This small program makes the "Ask DHL AI" assistant give real AI answers
that follow `ai/dhl-ai-system-prompt.md`. It runs on Cloudflare Workers, which
has a free plan. The website itself stays free on GitHub Pages.

**Costs:** Cloudflare Workers has a free plan (check current limits). The
Claude API is **paid per use**. Set a monthly spending limit in the Claude
Console before going live.

## Why a backend is needed

An AI API key works like a credit card. If it were placed in the website's
JavaScript, anyone could copy it. This worker keeps the key secret on
Cloudflare. The website only knows the worker's address.

## Setup (about 20 minutes)

1. **Get an API key.** Create an account in the Claude Console
   (console.anthropic.com), add billing, set a spending limit, and create an
   API key. API documentation: https://docs.claude.com
2. **Install Node.js** (LTS version) from nodejs.org.
3. **Create a free Cloudflare account** at cloudflare.com.
4. Open a terminal in this folder (`backend-example/cloudflare-worker`) and run:
   ```
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
   Paste your key when asked. It is stored encrypted by Cloudflare.
5. **Edit `wrangler.toml`:**
   - `ALLOWED_ORIGINS`: your site, e.g. `https://your-username.github.io`
   - `PROMPT_URL`: the published address of `ai/dhl-ai-system-prompt.md`
   - `MODEL`: a current Claude model name from the documentation
6. **Deploy:**
   ```
   npx wrangler deploy
   ```
   Wrangler prints an address like `https://dhl-ai.your-account.workers.dev`.
7. **Connect the website.** In `js/content.js`:
   ```js
   const AI_CONFIG = {
     enabled: true,
     endpoint: "https://dhl-ai.your-account.workers.dev",
     ...
   };
   ```
   Commit the change. The assistant now gives live answers. If the worker is
   ever unavailable, the site falls back to demo search automatically.

## Adding DHL's own answers

In Pages CMS, open **AI assistant: knowledge** and add questions with the answers DHL AI should give. The worker reads them from `KNOWLEDGE_URL` (set in `wrangler.toml`) and reloads them within about 10 minutes. No redeploy is needed. Each answer keeps its label (DHL answer, Bible study note, or Pastor Ock Soo Park's teaching), and the AI is told to cite it.

## Changing how DHL AI answers

Edit `ai/dhl-ai-system-prompt.md` in the GitHub repository. The worker
reloads it within about 10 minutes. No redeploy is needed.

## Pastor Ock Soo Park's books

Until the books are connected, `BOOKS_AVAILABLE = "false"` tells the AI not
to describe Pastor Park's teaching from memory. It says it doesn't have the
text and answers from the Bible instead, as your prompt requires.

To connect the books properly (retrieval-augmented generation):

1. Get written permission from the rights holder.
2. Store the text privately, not in the public repository (see
   `knowledge/ock-soo-park/README.md`).
3. Split it into short passages tagged with book, chapter and page, and index
   them (for example with Cloudflare Vectorize or another vector database).
4. In `worker.js`, before calling the AI, search the index for the question
   and add the top passages to the `system` text, labelled with their source.
5. Then set `BOOKS_AVAILABLE = "true"`.

## Protecting against abuse

- Only sites in `ALLOWED_ORIGINS` are accepted by browsers.
- Questions are limited to 600 characters and 6 previous messages.
- In the Cloudflare dashboard, add a rate-limiting rule for the worker
  (for example 20 requests per minute per visitor).
- Keep the spending limit in the Claude Console.
