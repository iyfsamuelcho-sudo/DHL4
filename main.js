/* ==========================================================================
   DHL — main.js
   Shared helpers (window.DHL), header, menu, footer, "next step" band,
   and the page code for content pages. Content lives in content/*.json
   (edited with Pages CMS); you shouldn't need to edit this file to add content.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u = "") => (/^\s*javascript:/i.test(u) ? "#" : u);
  const isExternal = u => /^https?:/i.test(u || "");
  const ext = u => (isExternal(u) ? ' target="_blank" rel="noopener"' : "");
  const byNewest = (a, b) => (b.date || "").localeCompare(a.date || "");
  const byPinnedThenNewest = (a, b) => (Boolean(b.pinned) - Boolean(a.pinned)) || byNewest(a, b);
  const toDate = ymd => { const [y, m, d] = String(ymd).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const fmt = (ymd, o) => toDate(ymd).toLocaleDateString("en", o);
  const longDate = ymd => fmt(ymd, { year: "numeric", month: "long", day: "numeric" });
  const fmtTime = t => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }); };
  const todayYMD = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const bibleUrl = ref => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref.replace(/–/g, "-"))}&version=${encodeURIComponent(CONFIG.bibleVersion || "NIV")}`;
  const formUrl = key => (CONFIG.forms && CONFIG.forms[key]) || "";

  const ICONS = {
    signal: '<path d="M2 9.5a14.5 14.5 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8 15.5a5.5 5.5 0 0 1 8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.9.4 5 2.8 5 5.8"/>',
    cross: '<path d="M12 3v18M6.5 8.5h11"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15Z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    hands: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    branch: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v10M12 12H5v5M12 12h7v5"/>',
    map: '<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    youtube: '<path stroke="none" fill="currentColor" d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15V9l5 3-5 3Z"/>',
    facebook: '<path stroke="none" fill="currentColor" d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.6v3.4h2.7V22H14V11.9h2.7l.4-3.4H14Z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    tiktok: '<path stroke="none" fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"/>',
    messenger: '<path d="M12 3C7 3 3 6.7 3 11.3c0 2.6 1.3 5 3.4 6.5V21l3.1-1.7c.8.2 1.6.3 2.5.3 5 0 9-3.7 9-8.3S17 3 12 3Z"/><path d="m7.5 13.5 3-3 2.5 2 3.5-3"/>',
    chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    play: '<path stroke="none" fill="currentColor" d="M8 5v14l11-7L8 5Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7-7-1Z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>'
  };
  const icon = (n, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;

  const sampleBadge = item => (CONFIG.showDemoLabels && item && item.sample ? '<span class="badge badge-sample">Sample</span>' : "");
  const statusBadge = item => (item && item.status === "draft" && CONFIG.showDemoLabels ? '<span class="badge badge-draft">Draft for review</span>' : "");
  const refLinks = refs => (refs || []).map(r => `<a href="${bibleUrl(r)}" target="_blank" rel="noopener">${esc(r)}</a>`).join(", ");

  function announce(msg) {
    let live = $("#live-region");
    if (!live) { live = document.createElement("div"); live.id = "live-region"; live.className = "sr-only"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
    live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30);
  }

  /* A "button" that goes to a page or opens a configured external form. */
  function actionLink({ label, href, form }, cls = "btn btn-primary") {
    const url = form ? formUrl(form) : href;
    if (!url) return "";
    return `<a class="${cls}" href="${esc(safeUrl(url))}"${ext(url)}>${esc(label)}</a>`;
  }

  /* ---------------- Progress (saved on this device only) ----------------
     Replace these methods with API calls when accounts exist. */
  const Progress = {
    key: "dhl_progress_v1",
    read() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
    write(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* storage unavailable */ } },
    isDone(id) { return Boolean((this.read().done || {})[id]); },
    toggle(id) {
      const d = this.read(); d.done = d.done || {};
      if (d.done[id]) delete d.done[id]; else d.done[id] = true;
      this.write(d); return Boolean(d.done[id]);
    },
    getPathway() { return this.read().pathway || ""; },
    /* Certificate courses: { score, best, passedAt, name, certificateAt } */
    getCourse(id) { return (this.read().courses || {})[id] || {}; },
    setCourse(id, patch) { const d = this.read(); d.courses = d.courses || {}; d.courses[id] = { ...(d.courses[id] || {}), ...patch }; this.write(d); return d.courses[id]; },
    allCourses() { return this.read().courses || {}; },
    setPathway(id) { const d = this.read(); d.pathway = id; this.write(d); },
    reset() { this.write({}); }
  };

  /* ---------------- Data source (local now, backend later) ---------------- */
  async function loadData(name, local) {
    if (CONFIG.backend && CONFIG.backend.enabled && CONFIG.backend.baseUrl) {
      try {
        const res = await fetch(`${CONFIG.backend.baseUrl.replace(/\/$/, "")}/${name}`);
        if (res.ok) return await res.json();
      } catch (e) { console.warn(`[DHL] Backend unavailable for ${name}; using local data.`); }
    }
    return local;
  }

  /* ---------------- Dialogs ---------------- */
  function openDialog(html, labelId, cls = "") {
    const d = document.createElement("dialog");
    d.className = `content-dialog ${cls}`;
    d.setAttribute("aria-labelledby", labelId);
    d.innerHTML = `<button type="button" class="icon-btn dialog-close" data-close>${icon("close")}<span class="sr-only">Close</span></button>${html}`;
    document.body.appendChild(d);
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
    d.addEventListener("close", () => d.remove());
    d.showModal();
    return d;
  }

  let videoDialog;
  function openVideo(id, title) {
    if (!videoDialog) {
      videoDialog = document.createElement("dialog");
      videoDialog.className = "video-dialog";
      videoDialog.setAttribute("aria-labelledby", "video-title");
      videoDialog.innerHTML = `<div class="dialog-bar"><h2 id="video-title"></h2><button type="button" class="icon-btn" data-close>${icon("close")}<span class="sr-only">Close video</span></button></div><div class="video-frame"></div><a class="video-external" target="_blank" rel="noopener">Open on YouTube</a>`;
      document.body.appendChild(videoDialog);
      videoDialog.addEventListener("click", e => { if (e.target === videoDialog || e.target.closest("[data-close]")) videoDialog.close(); });
      videoDialog.addEventListener("close", () => { $(".video-frame", videoDialog).innerHTML = ""; });
    }
    $("#video-title", videoDialog).textContent = title;
    $(".video-external", videoDialog).href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    $(".video-frame", videoDialog).innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    videoDialog.showModal();
  }
  document.addEventListener("click", e => {
    const v = e.target.closest("[data-video]");
    if (v && v.dataset.video) { e.preventDefault(); openVideo(v.dataset.video, v.dataset.title || "Video"); }
  });

  /* ---------------- Chips ---------------- */
  function renderChips(el, options, onChange) {
    if (!el) return;
    el.innerHTML = options.map(([v, l], i) => `<button type="button" class="chip" data-value="${esc(v)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("");
    el.addEventListener("click", e => {
      const c = e.target.closest(".chip"); if (!c) return;
      $$(".chip", el).forEach(x => x.setAttribute("aria-pressed", String(x === c)));
      onChange(c.dataset.value);
    });
  }

  /* ---------------- Header, menu, footer ---------------- */
  const page = document.body.dataset.page;
  const MENU = [
    { heading: "Start here", links: [["index.html", "Home", "home"], ["contents.html", "Contents Hub", "contents"], ["about.html", "About DHL", "about"], ["pathways.html", "Pathways", "pathways"], ["ai-assistant.html", "AI Assistant", "ai"]] },
    { heading: "Bible Journey", links: [["bible-journey.html", "Bible Journey overview", "bible"], ["gospel.html", "Gospel Class", "gospel"], ["discipleship.html", "Discipleship Training", "discipleship"], ["mind-education.html", "Mind Education", "mind"], ["leadership.html", "Leadership", "leadership"], ["academy.html", "Leadership Academy", "academy"]] },
    { heading: "Live in Korea", links: [["live-in-korea.html", "Live in Korea overview", "live"], ["live-in-korea.html#korean", "Korean Language Class", "x"], ["live-in-korea.html#visa", "Visa", "x"], ["live-in-korea.html#job", "Job", "x"], ["live-in-korea.html#campus", "Campus Life", "x"], ["live-in-korea.html#qa", "Q&A Corner", "x"]] },
    { heading: "Learn & connect", links: [["certificates.html", "Certificate Courses", "certs"], ["news.html", "News", "news"], ["digital-ministry.html", "Digital Ministry", "digital"], ["media.html", "Media", "media"], ["events.html", "Events", "events"], ["community.html", "Community", "community"], ["contact.html", "Contact & Prayer", "contact"]] }
  ];
  const QUICK = [["contents.html", "Contents", "contents"], ["bible-journey.html", "Bible Journey", "bible"], ["live-in-korea.html", "Live in Korea", "live"], ["certificates.html", "Certificates", "certs"], ["community.html", "Community", "community"]];
  /* Sub-pages highlight their category in the quick navigation. */
  const PARENT = { gospel: "bible", discipleship: "bible", mind: "bible", leadership: "bible", academy: "bible", course: "certs" };

  function renderHeader() {
    const h = $("#site-header"); if (!h) return;
    const cur = key => (key === page ? ' aria-current="page"' : key === PARENT[page] ? ' aria-current="true"' : "");
    h.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="index.html" aria-label="${esc(CONFIG.name)}, home">
          <img src="${esc(CONFIG.logo)}" alt="" width="40" height="40">
          <span class="brand-text"><strong>${esc(CONFIG.shortName)}</strong><span>Diaspora Hub for Leaders</span></span>
        </a>
        <nav class="quick-nav" aria-label="Main sections"><ul>${QUICK.map(([href, l, k]) => `<li><a href="${href}"${cur(k)}>${l}</a></li>`).join("")}</ul></nav>
        <div class="header-actions">
          <a class="btn btn-mango btn-small start-btn" href="pathways.html">Start Your Journey</a>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu">${icon("menu")}<span class="menu-label">Menu</span></button>
        </div>
      </div>
      <div class="site-menu" id="site-menu" hidden>
        <nav class="menu-inner" aria-label="All pages">
          ${MENU.map(g => `<div class="menu-group"><h2>${g.heading}</h2><ul>${g.links.map(([href, l, k]) => `<li><a href="${href}"${cur(k)}>${l}</a></li>`).join("")}</ul></div>`).join("")}
          <div class="menu-cta"><p>Not sure where to begin?</p><a class="btn btn-mango" href="pathways.html">Start Your Journey</a></div>
        </nav>
      </div>`;
    const btn = $(".menu-toggle", h), menu = $("#site-menu");
    const setOpen = open => {
      btn.setAttribute("aria-expanded", String(open));
      btn.innerHTML = `${icon(open ? "close" : "menu")}<span class="menu-label">${open ? "Close" : "Menu"}</span>`;
      menu.hidden = !open; document.body.classList.toggle("menu-open", open);
      if (open) $("a", menu)?.focus();
    };
    btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { setOpen(false); btn.focus(); } });
  }

  function socialList(cls = "social") {
    const s = CONFIG.social;
    const items = [["facebook", "Facebook", s.facebook], ["youtube", "YouTube", s.youtube], ["instagram", "Instagram", s.instagram], ["tiktok", "TikTok", s.tiktok], ["messenger", "Messenger", s.messenger]].filter(x => x[2]);
    return `<ul class="${cls}">${items.map(([i, l, u]) => `<li><a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" aria-label="${l}">${icon(i)}</a></li>`).join("")}</ul>`;
  }

  function renderFooter() {
    const f = $("#site-footer"); if (!f) return;
    f.innerHTML = `
      <div class="footer-inner">
        <div class="footer-about">
          <a class="brand" href="index.html"><img src="${esc(CONFIG.logo)}" alt="" width="40" height="40"><span class="brand-text"><strong>${esc(CONFIG.shortName)}</strong><span>Diaspora Hub for Leaders</span></span></a>
          <p class="footer-tagline">${esc(CONFIG.tagline)}</p>
          <p>${esc(CONFIG.description)}</p>
          ${socialList()}
        </div>
        ${MENU.map(g => `<div><h2 class="footer-heading">${g.heading}</h2><ul class="footer-links">${g.links.map(([href, l]) => `<li><a href="${href}">${l}</a></li>`).join("")}</ul></div>`).join("")}
      </div>
      <div class="footer-legal">
        <p>© ${new Date().getFullYear()} ${esc(CONFIG.name)}. ${esc(CONFIG.location)}.</p>
        <p>DHL certificates recognize completion of DHL training. They are not government-accredited qualifications.</p>
      </div>`;
  }

  /* ---------------- Config values in HTML ---------------- */
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  function applyConfig() {
    $$("[data-config]").forEach(el => { const v = getPath(CONFIG, el.dataset.config); if (v) el.textContent = v; });
    $$("[data-href]").forEach(el => {
      const key = el.dataset.href;
      const v = key === "email" ? (CONFIG.email && `mailto:${CONFIG.email}`) : getPath(CONFIG, key);
      if (v) { el.href = v; if (isExternal(v)) { el.target = "_blank"; el.rel = "noopener"; } }
      else (el.closest("[data-optional]") || el).hidden = true;
    });
    $$("[data-form]").forEach(el => {
      const v = formUrl(el.dataset.form);
      if (v) { el.href = v; el.target = "_blank"; el.rel = "noopener"; } else el.hidden = true;
    });
  }

  /* ---------------- "What's next" band on every page ---------------- */
  const NEXT = {
    about: { title: "Ready to take a step?", text: "Choose a pathway and we'll show you where to go next.", a: { label: "Choose your pathway", href: "pathways.html" }, b: { label: "Join the community", href: "community.html" } },
    gospel: { title: "What comes after the Gospel?", text: "Discipleship: growing as a follower of Jesus with others beside you.", a: { label: "Start Discipleship Training", href: "discipleship.html" }, b: { label: "Join a Bible study", form: "bibleStudy" } },
    discipleship: { title: "Next on the Bible Journey: Mind Education", text: "Develop a healthy, disciplined mind and good relationships.", a: { label: "Start Mind Education", href: "mind-education.html" }, b: { label: "Meet a mentor", form: "mentor" } },
    leadership: { title: "Ready for structured training?", text: "The Leadership Academy takes you from foundation to practicum.", a: { label: "Explore the Academy", href: "academy.html" }, b: { label: "Talk to a mentor", form: "mentor" } },
    live: { title: "Practical help is where friendships begin.", text: "Meet people who have walked the same road in Korea.", a: { label: "Join the community", href: "community.html" }, b: { label: "Explore the Bible Journey", href: "bible-journey.html" } },
    contents: { title: "Not sure where to start?", text: "Choose a pathway and we'll show you each step.", a: { label: "Start Your Journey", href: "pathways.html" }, b: { label: "Talk to a mentor", form: "mentor" } },
    bible: { title: "Want to study with someone?", text: "Join a Bible study group or meet with a mentor.", a: { label: "Join a Bible study", form: "bibleStudy" }, b: { label: "Meet a mentor", form: "mentor" } },
    mind: { title: "What comes next?", text: "Mind Education prepares you to lead and care for others.", a: { label: "Start leadership training", href: "leadership.html" }, b: { label: "Talk to a mentor", form: "mentor" } },
    certs: { title: "Ready for mentored training?", text: "The Leadership Academy adds practical ministry and mentoring.", a: { label: "Explore the Academy", href: "academy.html" }, b: { label: "Talk to a mentor", form: "mentor" } },
    digital: { title: "Use your skills in ministry.", text: "Designers, editors, translators and hosts are all needed.", a: { label: "Serve in digital ministry", form: "leadership" }, b: { label: "See the Academy", href: "academy.html" } },
    academy: { title: "Want to join the Academy?", text: "Apply online and a mentor will contact you about your starting level.", a: { label: "Apply to the Academy", form: "leadership" }, b: { label: "Talk to a mentor", form: "mentor" } },
    pathways: { title: "You don't have to walk alone.", text: "A mentor can help you with your next station.", a: { label: "Meet a mentor", form: "mentor" }, b: { label: "Join the community", href: "community.html" } },
    media: { title: "Watched something that helped?", text: "Take the next step on your journey.", a: { label: "Start your journey", href: "pathways.html" }, b: { label: "Join the community", href: "community.html" } },
    community: { title: "Want someone to walk with you?", text: "Mentors meet with people one to one, online or in person.", a: { label: "Meet a mentor", form: "mentor" }, b: { label: "Begin discipleship", href: "discipleship.html" } },
    events: { title: "Can't find a time that works?", text: "Join the community chat to hear about new events first.", a: { label: "Join the community", href: "community.html" }, b: { label: "Contact DHL", form: "contact" } },
    news: { title: "Want updates as they happen?", text: "Join the community chat to hear news and events first.", a: { label: "Join the community", href: "community.html" }, b: { label: "See events", href: "events.html" } },
    ai: { title: "Some questions need a person.", text: "Our mentors are happy to talk through anything with you.", a: { label: "Talk to a DHL Mentor", form: "mentor" }, b: { label: "Explore the Gospel", href: "gospel.html" } }
  };
  function renderNextStep() {
    const n = NEXT[page]; const main = $("main"); if (!n || !main) return;
    const s = document.createElement("section");
    s.className = "next-step"; s.setAttribute("aria-labelledby", "next-title");
    s.innerHTML = `<div class="wrap next-inner"><div><h2 id="next-title">${esc(n.title)}</h2><p>${esc(n.text)}</p></div><div class="btn-row">${actionLink(n.a, "btn btn-mango")}${actionLink(n.b, "btn btn-ghost")}</div></div>`;
    main.appendChild(s);
  }

  /* ---------------- Cards ---------------- */
  function topicCard(t, { assignment = false } = {}) {
    return `
      <li class="topic-card" id="${esc(t.id)}">
        <div class="topic-head"><h3>${esc(t.title)}</h3>${statusBadge(t)}</div>
        <p>${esc(t.summary)}</p>
        ${t.refs ? `<p class="refs">${icon("book")}<span>${refLinks(t.refs)}</span></p>` : ""}
        ${assignment && t.assignment ? `<p class="assignment"><strong>Practical assignment:</strong> ${esc(t.assignment)}</p>` : ""}
        ${t.questions ? `<button type="button" class="text-btn" data-topic="${esc(t.id)}">Study this topic<span class="sr-only">: ${esc(t.title)}</span></button>` : ""}
        ${t.tip ? `<p class="tip"><strong>Tip:</strong> ${esc(t.tip)}</p>` : ""}
      </li>`;
  }

  function openTopic(t) {
    openDialog(`
      <p class="dialog-kicker">${statusBadge(t)}</p>
      <h2 id="topic-title">${esc(t.title)}</h2>
      <p>${esc(t.summary)}</p>
      <h3>Read</h3>
      <ul class="read-list">${(t.refs || []).map(r => `<li><a href="${bibleUrl(r)}" target="_blank" rel="noopener">${esc(r)}</a></li>`).join("")}</ul>
      ${t.questions ? `<h3>Think about</h3><ul>${t.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
      ${t.steps ? `<h3>Study steps</h3><ol>${t.steps.map(q => `<li>${esc(q)}</li>`).join("")}</ol>` : ""}
      <div class="btn-row">${actionLink({ label: "Study with a mentor", form: "mentor" })}${actionLink({ label: "Ask DHL AI", href: `ai-assistant.html?q=${encodeURIComponent("What is " + t.title.toLowerCase() + "?")}` }, "btn btn-quiet")}</div>
      ${t.status === "draft" ? '<p class="fine-print">This summary is a draft and will be replaced with DHL-approved teaching. Always read the passages for yourself.</p>' : ""}`, "topic-title");
  }

  function wireTopics(container, list) {
    container.addEventListener("click", e => {
      const b = e.target.closest("[data-topic]"); if (!b) return;
      const t = list.find(x => x.id === b.dataset.topic); if (t) openTopic(t);
    });
  }

  /* ---------------- Feed ---------------- */
  const TYPES = {
    youtube: { label: "YouTube", icon: "youtube", action: "Watch" },
    facebook: { label: "Facebook", icon: "facebook", action: "View on Facebook" },
    study: { label: "Bible study", icon: "book", action: "Start studying" },
    event: { label: "Event", icon: "calendar", action: "See event" },
    announcement: { label: "News", icon: "megaphone", action: "Read more" },
    testimony: { label: "Testimony", icon: "quote", action: "Read" },
    resource: { label: "Resource", icon: "download", action: "Open resource" }
  };

  const articleUrl = p => `news.html?id=${encodeURIComponent(p.id)}`;
  function postLink(p) {
    if (p.id && p.content && p.type !== "youtube") return `href="${esc(articleUrl(p))}"`;
    if (p.type === "youtube" && p.videoId) return `href="https://www.youtube.com/watch?v=${esc(p.videoId)}" data-video="${esc(p.videoId)}" data-title="${esc(p.title)}"`;
    const url = p.url || (p.type === "youtube" ? CONFIG.social.youtube : p.type === "facebook" ? CONFIG.facebookPageUrl : "");
    return url ? `href="${esc(safeUrl(url))}"${ext(url)}` : "";
  }

  function feedCard(p, featured) {
    const t = TYPES[p.type] || TYPES.announcement;
    const link = postLink(p);
    return `
      <li class="feed-card type-${esc(p.type)}${featured ? " is-featured" : ""}">
        <div class="feed-media">
          <img src="${esc(p.image || p.thumbnail || `assets/images/thumb-${p.type}.svg`)}" data-fallback="assets/images/thumb-${esc(p.type)}.svg" alt="" loading="${featured ? "eager" : "lazy"}" width="640" height="360">
          ${p.type === "youtube" ? `<span class="play-badge">${icon("play")}</span>` : ""}
        </div>
        <div class="feed-body">
          <p class="feed-meta"><span class="type-tag">${icon(t.icon)}${t.label}</span><time datetime="${esc(p.date)}">${longDate(p.date)}</time>${p.pinned ? '<span class="badge badge-pinned">Pinned</span>' : ""}${sampleBadge(p)}</p>
          <h3>${link ? `<a ${link}>${esc(p.title)}</a>` : esc(p.title)}</h3>
          ${p.description ? `<p>${esc(p.description)}</p>` : ""}
          ${p.category ? `<p class="feed-cat">${esc(p.category)}</p>` : ""}
          ${link ? `<span class="feed-action" aria-hidden="true">${p.id && p.content && p.type !== "youtube" ? "Read article" : t.action}</span>` : ""}
        </div>
      </li>`;
  }

  async function initFeed() {
    const list = $("#feed-list"); if (!list) return;
    const more = $("#feed-more");
    let posts = [...await loadData("posts", ministryPosts)].sort(byPinnedThenNewest);
    let filter = "all", shown = 7;
    const draw = () => {
      const f = posts.filter(p => filter === "all" || p.type === filter);
      list.innerHTML = f.length ? f.slice(0, shown).map((p, i) => feedCard(p, i === 0)).join("") : `<li class="empty">Nothing here yet. Try another filter.</li>`;
      if (more) more.hidden = f.length <= shown;
    };
    const FILTERS = [["youtube", "Videos"], ["facebook", "Facebook"], ["study", "Bible studies"], ["event", "Events"], ["testimony", "Testimonies"], ["resource", "Resources"], ["announcement", "News"]];
    const present = new Set(posts.map(p => p.type));
    const shownFilters = FILTERS.filter(([t]) => present.has(t));
    // Filter buttons appear only when there are at least two kinds of posts.
    if (shownFilters.length > 1) renderChips($("#feed-filters"), [["all", "Everything"], ...shownFilters], v => { filter = v; shown = 7; draw(); });
    else if ($("#feed-filters")) $("#feed-filters").hidden = true;
    more?.addEventListener("click", () => { shown += 6; draw(); });
    draw();
    const { videos, source } = await YouTubeService.getLatestVideos();
    if (source !== "fallback") {
      const known = new Set(posts.map(p => p.videoId).filter(Boolean));
      videos.filter(v => !known.has(v.videoId)).forEach(v => posts.push({ ...v, type: "youtube", image: v.thumbnail, category: "" }));
      posts.sort(byPinnedThenNewest); draw();
    }
  }

  /* Article text: escaped first, then blank lines become paragraphs,
     "- " lines become lists, **text** becomes bold and links are clickable. */
  function articleHtml(text) {
    const inline = t => t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(https:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    const isItem = l => /^[-*•]\s+/.test(l);
    return String(text || "").split(/\n\s*\n/).map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      let out = "", para = [], items = [], quote = [];
      const flushP = () => { if (para.length) out += `<p>${para.map(l => inline(esc(l))).join("<br>")}</p>`; para = []; };
      const flushL = () => { if (items.length) out += `<ul>${items.map(l => `<li>${inline(esc(l.replace(/^[-*•]\s+/, "")))}</li>`).join("")}</ul>`; items = []; };
      const flushQ = () => { if (quote.length) out += `<blockquote class="scripture-quote"><p>${quote.map(l => inline(esc(l.replace(/^>\s?/, "")))).join("<br>")}</p></blockquote>`; quote = []; };
      lines.forEach(l => {
        if (/^>/.test(l)) { flushP(); flushL(); quote.push(l); }
        else if (isItem(l)) { flushP(); flushQ(); items.push(l); }
        else { flushL(); flushQ(); para.push(l); }
      });
      flushP(); flushL(); flushQ();
      return out;
    }).join("");
  }

  async function initNews() {
    const box = $("#news-article"); if (!box) return;
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { box.hidden = true; return; }
    const posts = await loadData("posts", ministryPosts);
    const p = posts.find(x => x.id === id);
    if (!p) {
      box.innerHTML = `<div class="wrap article-missing"><h1>This post isn't available yet</h1><p>If it was just published, the website may take a few minutes to update. Try again shortly.</p><a class="btn btn-primary" href="news.html">See all news</a></div>`;
      return;
    }
    const t = TYPES[p.type] || TYPES.announcement;
    document.title = `${p.title} | DHL – Diaspora Hub for Leaders`;
    $('meta[name="description"]')?.setAttribute("content", p.description || "");
    $('meta[property="og:title"]')?.setAttribute("content", p.title);
    $('meta[property="og:description"]')?.setAttribute("content", p.description || "");
    const crumb = $("#crumb-current"); if (crumb) crumb.textContent = p.title;
    box.innerHTML = `
      <article class="wrap article" aria-labelledby="article-title">
        <p class="feed-meta"><span class="type-tag">${icon(t.icon)}${t.label}</span><time datetime="${esc(p.date)}">${longDate(p.date)}</time>${p.category ? `<span>${esc(p.category)}</span>` : ""}${sampleBadge(p)}</p>
        <h1 id="article-title">${esc(p.title)}</h1>
        ${p.author ? `<p class="article-byline">By <strong>${esc(p.author)}</strong></p>` : ""}
        ${p.image ? `<figure class="article-image"><img src="${esc(p.image)}" data-fallback="assets/images/thumb-${esc(p.type)}.svg" alt=""></figure>` : ""}
        <div class="article-body">${articleHtml(p.content)}</div>
        ${p.scripture || p.author ? `<dl class="article-facts">
          ${p.scripture ? `<div><dt>Scripture</dt><dd><a href="${p.scriptureVersion ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(p.scripture.replace(/–/g, "-"))}&version=${encodeURIComponent(p.scriptureVersion)}` : bibleUrl(p.scripture)}" target="_blank" rel="noopener">${esc(p.scripture)}${p.scriptureVersion ? ` (${esc(p.scriptureVersion)})` : ""}</a></dd></div>` : ""}
          ${p.author ? `<div><dt>Author</dt><dd>${esc(p.author)}</dd></div>` : ""}
        </dl>` : ""}
        <div class="btn-row article-actions">
          ${p.url ? `<a class="btn btn-primary" href="${esc(safeUrl(p.url))}"${ext(p.url)}>${isExternal(p.url) ? "Open link" : "Learn more"}</a>` : ""}
          <button type="button" class="btn btn-quiet" id="article-share">Copy link to this post</button>
          <a class="text-link" href="news.html">All news</a>
        </div>
      </article>`;
    $("#article-share").addEventListener("click", async e => {
      try { await navigator.clipboard.writeText(location.href); e.target.textContent = "Link copied"; announce("Link copied"); }
      catch (err) { e.target.textContent = "Copy not available"; }
    });
    $("#news-feed-title") && ($("#news-feed-title").textContent = "More ministry content");
  }

  /* Facebook's official Page Plugin, loaded only when the visitor asks. */
  function initFacebook() {
    $$("[data-facebook-embed]").forEach(box => {
      $("button", box)?.addEventListener("click", () => {
        const w = Math.max(180, Math.min(500, Math.floor(box.clientWidth - 2)));
        const src = "https://www.facebook.com/plugins/page.php?" + new URLSearchParams({ href: CONFIG.facebookPageUrl, tabs: "timeline", width: String(w), height: "600", small_header: "true", adapt_container_width: "true", hide_cover: "false", show_facepile: "false" });
        box.innerHTML = `<iframe src="${esc(src)}" width="${w}" height="600" title="Latest posts from the DHL Facebook Page" loading="lazy" style="border:0;overflow:hidden" allow="encrypted-media"></iframe><p class="fine-print">Nothing showing? Some browsers block Facebook embeds. <a href="${esc(CONFIG.facebookPageUrl)}" target="_blank" rel="noopener">Open our Facebook Page</a>.</p>`;
      });
    });
  }

  function renderSocialHub() {
    const el = $("#social-hub"); if (!el) return;
    const s = CONFIG.social;
    const items = [["facebook", "Facebook", s.facebook, "Daily posts and prayer"], ["youtube", "YouTube", s.youtube, "Messages and lessons"], ["instagram", "Instagram", s.instagram, "Stories and verses"], ["tiktok", "TikTok", s.tiktok, "Short videos"], ["messenger", "Messenger", s.messenger, "Join our community chat"]].filter(x => x[2]);
    el.innerHTML = items.map(([i, l, u, d]) => `<li><a class="social-tile social-${i}" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${icon(i)}<span><strong>${l}</strong><span>${d}</span></span></a></li>`).join("");
  }

  /* ---------------- Daily Bible verse ----------------
     Picks one verse per calendar day (visitor's local date) from
     dailyVerses in content.js, so everyone sees the same verse that day. */
  function initDailyVerse() {
    const box = $("#verse-text");
    if (!box || typeof dailyVerses === "undefined" || !dailyVerses.length) return;
    const now = new Date();
    const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    const v = dailyVerses[dayNumber % dailyVerses.length];
    const version = typeof dailyVerseVersion !== "undefined" ? dailyVerseVersion : "KJV";
    const chapter = v.ref.replace(/:.*/, "");
    box.innerHTML = `<p>${esc(v.text)}</p><footer><cite>${esc(v.ref)}</cite> <span class="verse-version">${esc(version)}</span></footer>`;
    $("#verse-date").textContent = now.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
    $("#verse-read").href = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(chapter)}&version=${encodeURIComponent(version)}`;
    $("#verse-read").innerHTML = `Read ${esc(chapter)}`;
    const copy = $("#verse-copy");
    copy.addEventListener("click", async () => {
      const text = `“${v.text}” ${v.ref} (${version})`;
      try { await navigator.clipboard.writeText(text); copy.textContent = "Copied"; announce("Verse copied"); }
      catch (e) { copy.textContent = "Copy not available"; }
      setTimeout(() => { copy.textContent = "Copy verse"; }, 2000);
    });
  }

  /* Missing images (e.g. a photo not uploaded yet) fall back to a placeholder. */
  document.addEventListener("error", e => {
    const img = e.target;
    if (img && img.tagName === "IMG" && img.dataset.fallback && img.src.indexOf(img.dataset.fallback) === -1) img.src = img.dataset.fallback;
  }, true);

  /* Section photos (CONFIG.photos). The placeholder shows first; the real
     photo replaces it once it has loaded, so a missing photo never shows
     as a broken image. */
  function photoImg(key, cls = "") {
    const ph = (CONFIG.photos || {})[key]; if (!ph) return "";
    return `<img class="${cls}" src="assets/images/placeholder-${esc(ph.placeholder || "contents")}.svg" data-photo="${esc(ph.src)}" data-alt="${esc(ph.alt || "")}" alt="" width="1200" height="800" loading="lazy">`;
  }
  function loadPhotos(root = document) {
    $$("img[data-photo]", root).forEach(img => {
      const src = img.dataset.photo; img.removeAttribute("data-photo");
      const probe = new Image();
      probe.onload = () => { img.src = src; img.alt = img.dataset.alt || ""; img.classList.add("is-photo"); };
      probe.src = src;
    });
  }
  function initPagePhotos() {
    $$("[data-photo-key]").forEach(fig => { fig.innerHTML = photoImg(fig.dataset.photoKey, "page-photo-img"); });
    loadPhotos();
  }

  /* Community photo behind the home hero; only shown once it has loaded. */
  function initHeroPhoto() {
    const hero = $(".hero"); if (!hero || !CONFIG.heroImage) return;
    const img = new Image();
    img.className = "hero-photo";
    img.alt = CONFIG.heroImageAlt || "";
    img.decoding = "async";
    img.style.objectPosition = CONFIG.heroImagePosition || "center";
    img.onload = () => { hero.prepend(img); hero.classList.add("has-photo"); };
    img.src = CONFIG.heroImage;
  }

  /* ---------------- Home ---------------- */
  function initHome() {
    initHeroPhoto();
    initDailyVerse();
    const kp = $("#korea-preview");
    if (kp) kp.innerHTML = koreaAreas.map(a => `<li><a href="live-in-korea.html#${a.id}">${esc(a.title)}</a></li>`).join("");
    const groups = $("#home-groups");
    if (groups) groups.innerHTML = communityGroups.slice(0, 2).map(groupCard).join("");
  }

  /* ---------------- Gospel ---------------- */
  function initGospel() {
    const grid = $("#gospel-topics"), input = $("#topic-search"), count = $("#topic-count");
    const draw = () => {
      const q = (input.value || "").trim().toLowerCase();
      const f = gospelTopics.filter(t => !q || [t.title, t.summary, ...(t.refs || [])].join(" ").toLowerCase().includes(q));
      grid.innerHTML = f.length ? f.map(t => topicCard(t)).join("") : `<li class="empty">No topics match “${esc(input.value)}”. Try “faith”, “cross” or a Bible book like “Romans”, or <a href="ai-assistant.html">ask DHL AI</a>.</li>`;
      count.textContent = `${f.length} of ${gospelTopics.length} topics`;
    };
    input.addEventListener("input", draw);
    $("#topic-search-form").addEventListener("submit", e => e.preventDefault());
    wireTopics(grid, gospelTopics);
    draw();

    renderLessonList($("#gospel-course"), gospelCourse);

    const studies = $("#bible-studies");
    studies.innerHTML = bibleStudies.map(s => `
      <li class="study-card"><p class="study-level">${esc(s.level)}</p><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p>
      <p class="refs">${icon("book")}<a href="${bibleUrl(s.passage)}" target="_blank" rel="noopener">${esc(s.passage)}</a></p>
      <button type="button" class="btn btn-quiet btn-small" data-topic="${esc(s.id)}">Open study guide<span class="sr-only">: ${esc(s.title)}</span></button></li>`).join("");
    wireTopics(studies, bibleStudies.map(s => ({ ...s, refs: [s.passage] })));
  }

  /* Numbered course lessons with "mark as done" saved on this device. */
  function renderLessonList(el, lessons) {
    if (!el) return;
    const bar = $("[data-course-progress]");
    const update = () => {
      const done = lessons.filter(l => Progress.isDone(l.id)).length;
      if (bar) { bar.querySelector(".progress-fill").style.width = `${(done / lessons.length) * 100}%`; bar.querySelector(".progress-text").textContent = `${done} of ${lessons.length} lessons done`; }
    };
    el.innerHTML = lessons.map((l, i) => `
      <li class="lesson ${Progress.isDone(l.id) ? "is-done" : ""}" data-id="${esc(l.id)}">
        <span class="lesson-num" aria-hidden="true">${i + 1}</span>
        <div class="lesson-body"><h3>${esc(l.title)}</h3><p>${esc(l.summary)}</p>
          <p class="refs">${icon("book")}<span>${refLinks(l.refs)}</span>${l.minutes ? `<span class="muted">About ${l.minutes} minutes</span>` : ""}</p></div>
        <div class="lesson-actions">
          <button type="button" class="btn btn-quiet btn-small" data-topic="${esc(l.id)}">Open lesson<span class="sr-only"> ${i + 1}</span></button>
          <button type="button" class="done-btn" data-done="${esc(l.id)}" aria-pressed="${Progress.isDone(l.id)}">${icon("check")}<span>Done</span><span class="sr-only">: lesson ${i + 1}</span></button>
        </div>
      </li>`).join("");
    el.addEventListener("click", e => {
      const d = e.target.closest("[data-done]"); if (!d) return;
      const on = Progress.toggle(d.dataset.done);
      d.setAttribute("aria-pressed", String(on)); d.closest(".lesson").classList.toggle("is-done", on);
      announce(on ? "Marked as done" : "Marked as not done"); update();
    });
    wireTopics(el, lessons);
    update();
  }

  /* ---------------- Discipleship, Leadership, Digital ---------------- */
  function initDiscipleship() {
    const g = $("#disciple-topics"); g.innerHTML = discipleshipTopics.map(t => topicCard(t)).join(""); wireTopics(g, discipleshipTopics);
    $("#start-discipleship")?.addEventListener("click", () => {
      Progress.setPathway("disciple");
      $("#path")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      announce("Growing Disciple pathway saved. Start with Gospel Foundation.");
    });
  }
  function initLeadership() {
    const g = $("#leader-topics"); g.innerHTML = leadershipTopics.map(t => topicCard(t, { assignment: true })).join("");
  }
  function initDigital() {
    $("#digital-topics").innerHTML = digitalTopics.map(t => topicCard(t)).join("");
    $("#downloads").innerHTML = digitalDownloads.map(d => `
      <li><a class="download-card" href="${esc(d.file)}" download>${icon("download")}<span><strong>${esc(d.title)}</strong><span>${esc(d.text)}</span></span></a></li>`).join("");
  }

  /* ---------------- Media ---------------- */
  const VCAT = { message: "Message", study: "Bible study", testimony: "Testimony", korea: "Life in Korea", leadership: "Leadership" };
  async function initMedia() {
    const grid = $("#video-grid"), status = $("#video-status");
    const { videos } = await YouTubeService.getLatestVideos();
    let cat = "all";
    const draw = () => {
      const f = videos.filter(v => cat === "all" || v.category === cat);
      grid.innerHTML = f.length ? f.map((v, i) => {
        const link = v.videoId ? `href="https://www.youtube.com/watch?v=${esc(v.videoId)}" data-video="${esc(v.videoId)}" data-title="${esc(v.title)}"` : `href="${esc(CONFIG.social.youtube)}" target="_blank" rel="noopener"`;
        return `<li class="video-card${i === 0 && cat === "all" ? " is-featured" : ""}">
          <a class="video-thumb" ${link}><img src="${esc(v.thumbnail)}" alt="" loading="lazy" width="640" height="360"><span class="play-badge">${icon("play")}</span><span class="sr-only">Watch ${esc(v.title)}</span></a>
          <div class="video-body"><p class="feed-meta"><span class="type-tag">${icon("youtube")}${esc(VCAT[v.category] || "Video")}</span><time datetime="${esc(v.date)}">${longDate(v.date)}</time>${sampleBadge(v)}</p>
          <h3>${esc(v.title)}</h3>${v.description ? `<p>${esc(v.description)}</p>` : ""}
          <a class="btn btn-primary btn-small" ${link}>Watch<span class="sr-only"> ${esc(v.title)}</span></a></div></li>`;
      }).join("") : `<li class="empty">No videos in this category yet.</li>`;
      status.textContent = `${f.length} video${f.length === 1 ? "" : "s"}`;
    };
    renderChips($("#video-filters"), [["all", "All videos"], ...Object.entries(VCAT)], v => { cat = v; draw(); });
    draw();
  }

  /* ---------------- Events ---------------- */
  function gcal(e) {
    const d = e.date.replace(/-/g, ""), t = x => (x || "00:00").replace(":", "") + "00";
    return "https://calendar.google.com/calendar/render?" + new URLSearchParams({ action: "TEMPLATE", text: e.title, details: e.description, location: e.location, dates: `${d}T${t(e.startTime)}/${d}T${t(e.endTime || e.startTime)}` });
  }
  function eventCard(e, past) {
    const d = toDate(e.date);
    return `<li class="event-card${past ? " is-past" : ""}" id="${slug(e.title)}">
      <time class="event-date" datetime="${esc(e.date)}"><span class="m">${fmt(e.date, { month: "short" })}</span><span class="d">${d.getDate()}</span><span class="w">${fmt(e.date, { weekday: "short" })}</span></time>
      <div class="event-body">
        <p class="feed-meta"><span class="type-tag">${esc(e.category || "Event")}</span>${sampleBadge(e)}</p>
        <h3>${esc(e.title)}</h3>
        <ul class="event-facts">
          <li>${icon("clock")}<span>${longDate(e.date)}, ${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}</span></li>
          <li>${icon("pin")}<span>${esc(e.location)}</span></li>
          ${e.contact ? `<li>${icon("mail")}<span><a href="mailto:${esc(e.contact)}">${esc(e.contact)}</a></span></li>` : ""}
        </ul>
        <p>${esc(e.description)}</p>
        ${past ? "" : `<div class="btn-row">${e.registrationUrl ? `<a class="btn btn-primary btn-small" href="${esc(safeUrl(e.registrationUrl))}" target="_blank" rel="noopener">Register<span class="sr-only"> for ${esc(e.title)}</span></a>` : '<span class="muted">No registration needed</span>'}<a class="btn btn-quiet btn-small" href="${esc(gcal(e))}" target="_blank" rel="noopener">Add to Google Calendar</a></div>`}
      </div></li>`;
  }
  async function initEvents() {
    const all = await loadData("events", ministryEvents), today = todayYMD();
    const up = all.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = all.filter(e => e.date < today).sort(byNewest);
    const cats = [...new Set(up.map(e => e.category).filter(Boolean))];
    let cat = "all";
    const draw = () => {
      const f = up.filter(e => cat === "all" || e.category === cat);
      $("#events-upcoming").innerHTML = f.length ? f.map(e => eventCard(e)).join("") : `<li class="empty">No upcoming events in this category. Join the community chat to hear about new ones first.</li>`;
    };
    renderChips($("#event-filters"), [["all", "All events"], ...cats.map(c => [c, c])], v => { cat = v; draw(); });
    draw();
    const pw = $("#events-past");
    if (past.length) $("ul", pw).innerHTML = past.map(e => eventCard(e, true)).join(""); else pw.hidden = true;
    if (location.hash) $(location.hash)?.scrollIntoView();
  }
  function renderHomeEvents() {
    const el = $("#home-events"); if (!el) return;
    const up = ministryEvents.filter(e => e.date >= todayYMD()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    el.innerHTML = up.map(e => `<li><a href="events.html#${slug(e.title)}"><time datetime="${esc(e.date)}">${fmt(e.date, { month: "short", day: "numeric" })}</time><span>${esc(e.title)}</span></a></li>`).join("") || `<li class="muted">New events will appear here soon.</li>`;
  }

  /* ---------------- Community ---------------- */
  function groupCard(g) {
    return `<li class="group-card">
      <div class="topic-head"><h3>${esc(g.name)}</h3>${sampleBadge(g)}</div>
      <ul class="event-facts"><li>${icon("clock")}<span>${esc(g.when)}</span></li><li>${icon("pin")}<span>${esc(g.where)}</span></li><li>${icon("chat")}<span>${esc(g.lang)}</span></li></ul>
      <p>${esc(g.text)}</p>${actionLink({ label: "Ask to join", form: g.form }, "btn btn-primary btn-small")}
    </li>`;
  }
  function initCommunity() {
    $("#groups").innerHTML = communityGroups.map(groupCard).join("");
    const s = CONFIG.social;
    const ch = [["facebook", "Facebook group", s.facebookGroup, "Updates, prayer and conversation"], ["messenger", "Messenger community", s.messenger, "Group chat on Messenger"], ["chat", "KakaoTalk community", s.kakaoOpenChat, "Open chat for the community in Korea"], ["chat", "WhatsApp", s.whatsapp, "Community chat"]].filter(x => x[2]);
    $("#channels").innerHTML = ch.map(([i, l, u, d]) => `<li><a class="social-tile social-${i}" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${icon(i)}<span><strong>${l}</strong><span>${d}</span></span></a></li>`).join("");
  }

  /* ---------------- Start ---------------- */
  window.DHL = { $, $$, esc, icon, slug, safeUrl, ext, isExternal, formUrl, bibleUrl, refLinks, actionLink, announce, openDialog, renderChips, Progress, loadData, sampleBadge, statusBadge, longDate, renderLessonList, openTopic, wireTopics, photoImg, loadPhotos, feedCard, articleHtml };

  renderHeader(); renderFooter(); applyConfig(); initPagePhotos(); renderNextStep(); initFacebook(); renderSocialHub(); renderHomeEvents(); initFeed();
  const inits = { news: initNews, home: initHome, gospel: initGospel, discipleship: initDiscipleship, leadership: initLeadership, digital: initDigital, media: initMedia, events: initEvents, community: initCommunity };
  inits[page]?.();
  document.dispatchEvent(new CustomEvent("dhl:ready"));
})();
