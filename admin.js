/* ==========================================================================
   DHL — admin.js (News Admin, admin.html)

   This page holds NO secrets. It signs in through the News Admin Worker
   (GitHub sign-in, allow-listed usernames only) and sends new posts to the
   Worker, which commits them to content/posts.json using a token that
   exists only on the server. See README section 18.
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, esc, icon, announce } = window.DHL;
  const ENDPOINT = String((CONFIG.admin && CONFIG.admin.endpoint) || "").replace(/\/+$/, "");
  const SESSION_KEY = "dhl_admin_session";   // sessionStorage: cleared when the tab closes
  const DRAFT_KEY = "dhl_admin_draft";       // localStorage: unsent text only, never credentials
  const views = ["setup", "signin", "editor", "done"];
  const show = v => views.forEach(x => { $(`#view-${x}`).hidden = x !== v; });
  const setNotice = (el, kind, html) => { el.className = `admin-notice notice-${kind}`; el.innerHTML = html; el.hidden = !html; };

  const TYPE_OPTIONS = [["announcement", "News"], ["event", "Event"], ["testimony", "Testimony"], ["study", "Bible study"], ["resource", "Resource"], ["facebook", "Facebook post"], ["youtube", "YouTube video"]];
  const CATEGORIES = ["Announcement", "Gospel & Bible", "Prayer", "Fellowship", "Gospel", "Discipleship", "Mind Education", "Academy", "Live in Korea", "Digital Ministry", "Testimony", "Message", "Event"];

  /* ---------- session ---------- */
  const getSession = () => { try { return sessionStorage.getItem(SESSION_KEY) || ""; } catch (e) { return ""; } };
  const setSession = v => { try { v ? sessionStorage.setItem(SESSION_KEY, v) : sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } };

  function readHash() {
    if (!location.hash) return;
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("session")) setSession(h.get("session"));
    const err = h.get("error");
    history.replaceState(null, "", location.pathname + location.search); // remove the session from the address bar
    if (err) {
      const msg = {
        not_allowed: `The GitHub account <strong>@${esc(h.get("user") || "")}</strong> isn't on the News Admin list. Ask the site owner to add your username to ADMIN_USERS.`,
        login_expired: "The sign-in took too long or was interrupted. Please try again.",
        login_failed: "GitHub sign-in didn't complete. Please try again."
      }[err] || "Sign-in failed. Please try again.";
      setNotice($("#signin-notice"), "error", msg);
    }
  }

  async function api(path, options = {}) {
    let res;
    try {
      res = await fetch(ENDPOINT + path, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getSession()}`, ...(options.headers || {}) } });
    } catch (e) {
      throw Object.assign(new Error("Couldn't reach the News Admin service. Check your internet connection, and that CONFIG.admin.endpoint in js/content.js is the Worker's address."), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `The News Admin service returned an error (${res.status}).`), { status: res.status, fields: data.fields });
    return data;
  }

  /* ---------- form ---------- */
  const form = $("#post-form");
  const f = name => form.elements[name];
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  function youTubeId(s) {
    s = String(s || "").trim();
    const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/) || s.match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : "";
  }

  function buildForm() {
    f("type").innerHTML = TYPE_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    f("categorySelect").innerHTML = `<option value="">Choose a category</option>${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}<option value="__other">Other…</option>`;
  }

  function values() {
    const cat = f("categorySelect").value === "__other" ? f("categoryOther").value.trim() : f("categorySelect").value;
    return {
      title: f("title").value.trim(), date: f("date").value, category: cat, type: f("type").value,
      description: f("description").value.trim().replace(/\s*\n+\s*/g, " "), content: f("content").value.trim(),
      image: f("image").value.trim(), url: f("url").value.trim(), pinned: f("pinned").checked,
      author: f("author").value.trim(), scripture: f("scripture").value.trim(),
      videoId: f("type").value === "youtube" ? youTubeId(f("youtube").value) : ""
    };
  }

  const isHttps = s => { try { return new URL(s).protocol === "https:"; } catch (e) { return false; } };
  const isSitePath = s => /^[a-z0-9][a-z0-9._\/-]*$/i.test(s) && !s.includes("..");
  function validate(p) {
    const e = {};
    if (p.title.length < 3) e.title = "Enter a title of at least 3 characters.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) e.date = "Choose a date.";
    if (!p.category) e.categorySelect = f("categorySelect").value === "__other" ? null : "Choose a category.";
    if (f("categorySelect").value === "__other" && !p.category) e.categoryOther = "Type the category name.";
    if (p.description.length < 10) e.description = "Write a short description of at least 10 characters.";
    if (p.type === "youtube" && !p.videoId) e.youtube = "Paste a YouTube video link, like https://www.youtube.com/watch?v=…";
    if (p.type !== "youtube" && !p.content && !p.url) e.content = "Write the full article, or add an external link for readers to open.";
    if (p.image && !isHttps(p.image) && !(isSitePath(p.image) && /\.(jpe?g|png|webp|gif|svg)$/i.test(p.image))) e.image = "Use an https:// image link or a site path like assets/images/photo.jpg.";
    if (p.url && !isHttps(p.url) && !isSitePath(p.url)) e.url = "Use an https:// link or a page on this site like events.html.";
    Object.keys(e).forEach(k => { if (!e[k]) delete e[k]; });
    return e;
  }

  const FIELD_OF = { videoId: "youtube", category: "categorySelect" };
  function showErrors(errors) {
    $$(".field-error", form).forEach(el => { el.textContent = ""; el.hidden = true; });
    $$("[aria-invalid]", form).forEach(el => el.removeAttribute("aria-invalid"));
    const keys = Object.keys(errors);
    keys.forEach(k => {
      const name = FIELD_OF[k] || k, input = f(name), msg = $(`#err-${name}`);
      if (input) input.setAttribute("aria-invalid", "true");
      if (msg) { msg.textContent = errors[k]; msg.hidden = false; }
    });
    if (keys.length) {
      const first = f(FIELD_OF[keys[0]] || keys[0]); first && first.focus();
      setNotice($("#form-notice"), "error", `Please fix ${keys.length === 1 ? "the highlighted field" : `the ${keys.length} highlighted fields`} before publishing.`);
    } else setNotice($("#form-notice"), "error", "");
  }

  /* ---------- live preview (uses the site's own feed card) ---------- */
  function preview() {
    const p = values();
    const post = { ...p, id: p.content ? "preview" : "", title: p.title || "Your post title", description: p.description || "Your short description appears here.",
      date: p.date || todayLocal(), image: p.image || `assets/images/thumb-${p.type}.svg`, category: p.category };
    $("#preview-card").innerHTML = window.DHL.feedCard(post, false);
    $$("#preview-card a").forEach(a => { a.removeAttribute("href"); a.removeAttribute("data-video"); a.setAttribute("tabindex", "-1"); });
    $("#preview-article").innerHTML = p.content ? window.DHL.articleHtml(p.content) : '<p class="muted">The full article will appear here as you type.</p>';
    $("#count-description").textContent = `${f("description").value.length} / 400`;
  }

  function toggleFields() {
    const yt = f("type").value === "youtube";
    $("#field-youtube").hidden = !yt;
    $("#field-categoryOther").hidden = f("categorySelect").value !== "__other";
  }

  /* ---------- drafts (so text isn't lost if the session expires) ---------- */
  const DRAFT_FIELDS = ["title", "date", "categorySelect", "categoryOther", "type", "youtube", "description", "content", "image", "url", "author", "scripture"];
  function saveDraft() {
    const d = {}; DRAFT_FIELDS.forEach(k => { d[k] = f(k).value; }); d.pinned = f("pinned").checked;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  }
  function loadDraft() {
    let d = null; try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { d = null; }
    if (d) { DRAFT_FIELDS.forEach(k => { if (d[k] != null) f(k).value = d[k]; }); f("pinned").checked = !!d.pinned; }
    if (!f("date").value) f("date").value = todayLocal();
    return Boolean(d && (d.title || d.content));
  }
  function clearForm() {
    form.reset(); try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    f("date").value = todayLocal(); toggleFields(); showErrors({}); preview();
  }

  /* ---------- publish ---------- */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const p = values();
    const errors = validate(p);
    showErrors(errors);
    if (Object.keys(errors).length) return;
    const btn = $("#publish-btn");
    btn.disabled = true; btn.innerHTML = `${icon("clock")}Publishing…`;
    setNotice($("#form-notice"), "info", "Publishing your post to the DHL website…");
    try {
      const r = await api("/api/posts", { method: "POST", body: JSON.stringify(p) });
      try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
      $("#done-title").textContent = p.title;
      $("#done-view").href = p.content ? `news.html?id=${encodeURIComponent(r.id)}` : "index.html#feed-title";
      const c = $("#done-commit"); if (r.commitUrl) { c.href = r.commitUrl; c.hidden = false; } else c.hidden = true;
      show("done"); $("#done-heading").focus(); announce("Post published successfully");
    } catch (err) {
      if (err.status === 401) {
        setSession("");
        setNotice($("#signin-notice"), "error", "Your session expired, so the post wasn't published. Your draft is saved. Sign in again, then press Publish post.");
        show("signin"); return;
      }
      if (err.fields) showErrors(err.fields);
      setNotice($("#form-notice"), "error", `<strong>The post wasn't published.</strong> ${esc(err.message)}`);
      $("#form-notice").focus();
    } finally {
      btn.disabled = false; btn.innerHTML = `${icon("send")}Publish post`;
    }
  });

  /* ---------- start ---------- */
  async function start() {
    buildForm();
    const hadDraft = loadDraft(); toggleFields(); preview();
    if (hadDraft) setNotice($("#form-notice"), "info", "Your unfinished draft was restored.");
    form.addEventListener("input", e => {
      const el = e.target; // clear a field's error as soon as it's edited
      if (el.getAttribute && el.getAttribute("aria-invalid")) { el.removeAttribute("aria-invalid"); const m = $(`#err-${el.name}`); if (m) { m.hidden = true; m.textContent = ""; } }
      toggleFields(); preview(); saveDraft();
    });
    form.addEventListener("change", () => { toggleFields(); preview(); saveDraft(); });
    $("#clear-btn").addEventListener("click", () => { if (confirm("Clear the form? Your draft will be deleted.")) clearForm(); });
    $("#another-btn").addEventListener("click", () => { clearForm(); setNotice($("#form-notice"), "info", ""); show("editor"); f("title").focus(); });
    $("#signout-btn").addEventListener("click", () => { setSession(""); setNotice($("#signin-notice"), "info", "You're signed out."); show("signin"); });

    if (!ENDPOINT) { show("setup"); return; }
    $("#signin-btn").href = `${ENDPOINT}/auth/login`;
    readHash();
    if (!getSession()) { show("signin"); return; }
    try {
      const me = await api("/api/me");
      $("#admin-user").innerHTML = `${me.avatar ? `<img src="${esc(me.avatar)}" alt="" width="32" height="32">` : icon("user")}<span>Signed in as <strong>${esc(me.name || me.login)}</strong> (@${esc(me.login)})</span>`;
      show("editor");
    } catch (err) {
      setSession("");
      setNotice($("#signin-notice"), "error", err.status === 401 ? "Your session has expired. Please sign in again." : esc(err.message));
      show("signin");
    }
  }
  start();
})();
