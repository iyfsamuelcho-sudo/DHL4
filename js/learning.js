/* ==========================================================================
   DHL — learning.js
   The learning hub: Contents Hub, Bible Journey and Live in Korea landing
   pages, the Certificate Course catalog, and the course player (lessons,
   quiz, certificate).

   Progress, quiz scores and certificates are saved in this browser only
   (DHL.Progress in main.js) until DHL accounts exist.
   ========================================================================== */
(() => {
  "use strict";
  const D = window.DHL;
  const { $, $$, esc, icon, Progress, announce, formUrl, safeUrl, ext, isExternal, refLinks, renderChips, longDate } = D;
  const page = document.body.dataset.page;

  const LEVELS = ["Beginner", "Intermediate", "Advanced"];
  const levelRank = l => { const i = LEVELS.findIndex(x => String(l).startsWith(x)); return i < 0 ? 0 : i; };
  const levelBadge = l => `<span class="level level-${esc(String(l).split(" ")[0].toLowerCase())}">${esc(l)}</span>`;
  const fmtMinutes = m => { m = Math.round(m); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };
  const hoursText = h => `About ${h} ${h === 1 ? "hour" : "hours"}`;
  const openCourses = () => certificateCourses.filter(c => c.status === "open");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Course progress ---------- */
  const lessonKey = (c, l) => `course:${c.id}:${l.id}`;
  const lessonsOf = c => (c.modules || []).flatMap(m => m.lessons);
  function courseState(c) {
    if (c.status !== "open") return { status: "planned", pct: 0, done: 0, total: 0 };
    const ls = lessonsOf(c), done = ls.filter(l => Progress.isDone(lessonKey(c, l))).length;
    const rec = Progress.getCourse(c.id);
    const passed = (rec.best || 0) >= c.passMark;
    const complete = done === ls.length && passed;
    const pct = Math.round(((done + (passed ? 1 : 0)) / (ls.length + 1)) * 100);
    return { status: complete ? "complete" : done || rec.best != null ? "progress" : "new", pct, done, total: ls.length, passed, rec, complete };
  }

  /* ---------- Shared: category cards (home + hub) ---------- */
  function categoryStats(cat) {
    if (cat.id === "bible") {
      const lessons = gospelCourse.length + discipleshipPath.length + mindTopics.length;
      const done = [...gospelCourse, ...discipleshipPath, ...mindTopics].filter(x => Progress.isDone(x.id)).length;
      return { line: `3 programs, ${lessons} core lessons`, pct: Math.round((done / lessons) * 100) };
    }
    if (cat.id === "korea") {
      const read = koreaGuides.filter(g => Progress.isDone(g.id)).length;
      return { line: `6 areas, ${koreaGuides.length} guides, ${qaItems.length} Q&As`, pct: Math.round((read / koreaGuides.length) * 100) };
    }
    const done = openCourses().filter(c => courseState(c).complete).length;
    return { line: `${openCourses().length} courses, ${certificateCategories.length} categories`, pct: Math.round((done / openCourses().length) * 100), extra: done ? `${done} completed` : "" };
  }
  function renderCategories(el) {
    el.innerHTML = contentCategories.map(c => {
      const st = categoryStats(c);
      return `<li class="cat-card cat-${c.color}"><a href="${c.href}">
        ${c.photo ? `<span class="card-photo">${D.photoImg(c.photo)}</span>` : ""}
        <span class="cat-icon">${icon(c.icon)}</span>
        <h3>${esc(c.title)}</h3>
        <p class="cat-tagline">${esc(c.tagline)}</p>
        <p class="cat-text">${esc(c.text)}</p>
        <span class="cat-meta">${esc(st.line)}</span>
        <span class="mini-progress" aria-hidden="true"><span style="width:${st.pct}%"></span></span>
        <span class="cat-meta">${st.pct ? `${st.pct}% done on this device` : "Not started yet"}</span>
        <span class="btn btn-primary btn-small cat-go">${st.pct ? "Continue" : "Start Learning"}</span>
      </a></li>`;
    }).join("");
  }
  $$("[data-categories]").forEach(el => { renderCategories(el); D.loadPhotos(el); });

  /* ---------- Learning items for search ---------- */
  function bibleItems() {
    return [
      ...gospelCourse.map(l => ({ id: l.id, program: "gospel", kind: "Lesson", title: l.title, level: "Beginner", minutes: l.minutes, text: l.summary, href: "gospel.html#course", doneId: l.id })),
      ...gospelTopics.map(t => ({ id: t.id, program: "gospel", kind: "Topic", title: t.title, level: "Beginner", minutes: 10, text: t.summary, href: `gospel.html#${t.id}` })),
      ...bibleStudies.map(s => ({ id: s.id, program: "gospel", kind: "Bible study", title: s.title, level: s.level, minutes: 30, text: `${s.passage}. ${s.summary}`, href: "gospel.html#studies" })),
      ...discipleshipTopics.map((t, i) => ({ id: t.id, program: "discipleship", kind: "Topic", title: t.title, level: i < 5 ? "Beginner" : "Intermediate", minutes: 15, text: t.summary, href: `discipleship.html#${t.id}` })),
      ...mindTopics.map(t => ({ id: t.id, program: "mind", kind: "Lesson", title: t.title, level: t.level, minutes: t.minutes, text: t.summary, href: `mind-education.html#${t.id}`, doneId: t.id })),
      ...leadershipTopics.map(t => ({ id: t.id, program: "leadership", kind: "Course", title: t.title, level: "Advanced", minutes: 30, text: t.summary, href: `leadership.html#${t.id}` }))
    ];
  }
  const PROGRAM_NAMES = { gospel: "Gospel Class", discipleship: "Discipleship Training", mind: "Mind Education", leadership: "Leadership" };

  function itemCard(it, { showProgram = true } = {}) {
    const done = it.doneId && Progress.isDone(it.doneId);
    return `<li class="learn-card${done ? " is-done" : ""}">
      <p class="learn-meta">${showProgram && it.program ? `<span class="learn-prog prog-${esc(it.program)}">${esc(PROGRAM_NAMES[it.program] || it.program)}</span>` : ""}<span>${esc(it.kind)}</span></p>
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.text)}</p>
      <p class="learn-foot">${levelBadge(it.level)}${it.minutes > 0 ? `<span class="learn-time">${icon("clock", "icon icon-sm")}${fmtMinutes(it.minutes)}</span>` : ""}${done ? `<span class="learn-done">${icon("check", "icon icon-sm")}Done</span>` : ""}</p>
      <a class="btn btn-quiet btn-small" href="${esc(it.href)}">${done ? "Review" : "Start Learning"}<span class="sr-only">: ${esc(it.title)}</span></a>
    </li>`;
  }

  /* Search + program chips + level chips over a list of items. */
  function browser({ list, grid, search, programChips, levelChips, count, programs, sortByLevel = true }) {
    let prog = "all", lvl = "all";
    const draw = () => {
      const q = (search?.value || "").trim().toLowerCase();
      let f = list.filter(it => (prog === "all" || it.program === prog) && (lvl === "all" || String(it.level).startsWith(lvl)) &&
        (!q || `${it.title} ${it.text} ${it.kind}`.toLowerCase().includes(q)));
      if (sortByLevel) f = f.slice().sort((a, b) => levelRank(a.level) - levelRank(b.level));
      grid.innerHTML = f.length ? f.map(it => itemCard(it)).join("") : `<li class="empty">Nothing matches that search. Try another word, or <a href="ai-assistant.html">ask DHL AI</a>.</li>`;
      if (count) count.textContent = `${f.length} of ${list.length} resources`;
    };
    if (programChips) renderChips(programChips, [["all", "All programs"], ...programs], v => { prog = v; draw(); });
    if (levelChips) renderChips(levelChips, [["all", "All levels"], ...LEVELS.map(l => [l, l])], v => { lvl = v; draw(); });
    search?.addEventListener("input", draw);
    search?.closest("form")?.addEventListener("submit", e => e.preventDefault());
    draw();
    return draw;
  }

  function courseMini(c) {
    const st = courseState(c);
    const label = st.status === "planned" ? "Coming later" : st.complete ? "Completed" : st.status === "progress" ? `${st.pct}% done` : "Not started";
    return `<li class="course-card${st.status === "planned" ? " is-planned" : ""}${st.complete ? " is-complete" : ""}">
      <p class="learn-meta"><span class="course-cat">${esc(c.category)}</span>${st.complete ? `<span class="learn-done">${icon("check", "icon icon-sm")}Certificate earned</span>` : ""}</p>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.description)}</p>
      <p class="learn-foot">${levelBadge(c.level)}<span class="learn-time">${icon("clock", "icon icon-sm")}${hoursText(c.hours)}</span>${c.modules ? `<span class="learn-time">${c.modules.length} modules, ${lessonsOf(c).length} lessons</span>` : ""}</p>
      ${st.status === "planned" ? "" : `<div class="progress" role="progressbar" aria-label="${esc(c.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}"><span class="progress-fill" style="width:${st.pct}%"></span></div>`}
      ${st.status === "planned" ? "" : `<p class="course-status">${label}</p>`}
      ${st.status === "planned" ? '<span class="btn btn-quiet btn-small" aria-disabled="true">Coming later</span>' : `<a class="btn ${st.complete ? "btn-quiet" : "btn-primary"} btn-small" href="course.html?id=${esc(c.id)}">${st.complete ? "View certificate" : st.status === "progress" ? "Continue" : "Start Learning"}<span class="sr-only">: ${esc(c.title)}</span></a>`}
    </li>`;
  }

  /* ======================= Contents Hub ======================= */
  if (page === "contents") {
    const eco = $("#hub-ecosystem");
    if (eco) eco.innerHTML = D.metro(journeySteps, { numbered: true, icons: true, horizontal: true });

    const cont = $("#hub-continue");
    const inProgress = openCourses().filter(c => courseState(c).status === "progress");
    const pw = pathways.find(p => p.id === Progress.getPathway());
    const next = pw && pw.stations.find(s => !Progress.isDone(s.id));
    const rows = [
      ...inProgress.map(c => `<li><a href="course.html?id=${esc(c.id)}"><span class="cont-kind">Certificate course</span><strong>${esc(c.title)}</strong><span class="mini-progress"><span style="width:${courseState(c).pct}%"></span></span><span class="cont-meta">${courseState(c).pct}% done</span></a></li>`),
      ...(next ? [`<li><a href="pathways.html#${pw.id}"><span class="cont-kind">Your pathway: ${esc(pw.name)}</span><strong>Next station: ${esc(next.title)}</strong><span class="cont-meta">${esc(next.text)}</span></a></li>`] : [])
    ];
    cont.innerHTML = rows.length ? rows.join("") : `<li class="empty">Nothing in progress yet. A good first step is <a href="course.html?id=gospel-foundations">Gospel Foundations</a> or <a href="course.html?id=korean-survival-1">Survival Korean 1</a>.</li>`;

    const all = [
      ...bibleItems().map(i => ({ ...i, cat: "Bible Journey" })),
      ...koreaGuides.map(g => ({ id: g.id, cat: "Live in Korea", kind: areaName(g.area), title: g.title, text: g.text, level: g.level, minutes: g.minutes, href: `live-in-korea.html#${g.area}` })),
      ...qaItems.map((x, i) => ({ id: `qa${i}`, cat: "Live in Korea", kind: "Q&A", title: x.q, text: x.a, level: "Beginner", minutes: 2, href: "live-in-korea.html#qa" })),
      ...openCourses().map(c => ({ id: c.id, cat: "Certificate Course", kind: c.category, title: c.title, text: c.description, level: c.level, minutes: c.hours * 60, href: `course.html?id=${c.id}` }))
    ];
    const input = $("#hub-search"), out = $("#hub-results"), cnt = $("#hub-count");
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { out.innerHTML = ""; cnt.textContent = ""; return; }
      const f = all.filter(i => `${i.title} ${i.text} ${i.kind}`.toLowerCase().includes(q)).slice(0, 24);
      cnt.textContent = f.length ? `${f.length} result${f.length === 1 ? "" : "s"}` : "";
      out.innerHTML = f.length ? f.map(i => `<li><a href="${esc(i.href)}"><span class="cont-kind">${esc(i.cat)}: ${esc(i.kind)}</span><strong>${esc(i.title)}</strong><span class="cont-meta">${esc(i.text.slice(0, 140))}${i.text.length > 140 ? "…" : ""}</span></a></li>`).join("")
        : `<li class="empty">No results for “${esc(input.value)}”. Try a simpler word, or <a href="ai-assistant.html?q=${encodeURIComponent(input.value)}">ask DHL AI</a>.</li>`;
    };
    input.addEventListener("input", draw);
    input.closest("form").addEventListener("submit", e => e.preventDefault());
  }

  /* ======================= Bible Journey ======================= */
  if (page === "bible") {
    $("#bj-path").innerHTML = D.metro(bibleJourneyPath, { numbered: true, horizontal: true });
    const prog = {
      gospel: { list: gospelCourse, minutes: gospelCourse.reduce((a, l) => a + (l.minutes || 15), 0), course: "gospel-foundations" },
      discipleship: { list: discipleshipPath, minutes: discipleshipPath.length * 20, course: "discipleship-first-steps" },
      mind: { list: mindTopics, minutes: mindTopics.reduce((a, l) => a + l.minutes, 0), course: "mind-understanding-heart" }
    };
    $("#bj-programs").innerHTML = bibleJourneyPrograms.map((p, i) => {
      const g = prog[p.id], done = g.list.filter(x => Progress.isDone(x.id)).length, pct = Math.round((done / g.list.length) * 100);
      const course = certificateCourses.find(c => c.id === g.course);
      return `<li class="program-card prog-card-${p.color}">
        ${p.photo ? `<span class="card-photo">${D.photoImg(p.photo)}</span>` : ""}
        <span class="program-step">Step ${i + 1}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        <p class="learn-foot">${levelBadge(p.level)}<span class="learn-time">${icon("clock", "icon icon-sm")}About ${fmtMinutes(g.minutes)}</span><span class="learn-time">${g.list.length} lessons</span></p>
        <div class="progress" role="progressbar" aria-label="${esc(p.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="progress-fill" style="width:${pct}%"></span></div>
        <p class="course-status">${done ? `${done} of ${g.list.length} lessons done` : "Not started"}</p>
        <div class="btn-row"><a class="btn btn-primary btn-small" href="${p.href}">${done ? "Continue" : "Start Learning"}<span class="sr-only">: ${esc(p.title)}</span></a>${course ? `<a class="text-link" href="course.html?id=${course.id}">Certificate course</a>` : ""}</div>
      </li>`;
    }).join("");
    D.loadPhotos($("#bj-programs"));
    $("#bj-featured").innerHTML = certificateCourses.filter(c => ["Bible & Gospel", "Discipleship", "Mind Education", "Leadership"].includes(c.category)).sort((a, b) => (a.status === "planned") - (b.status === "planned") || levelRank(a.level) - levelRank(b.level)).slice(0, 6).map(courseMini).join("");
    browser({ list: bibleItems(), grid: $("#bj-grid"), search: $("#bj-search"), programChips: $("#bj-programs-filter"), levelChips: $("#bj-levels"), count: $("#bj-count"),
      programs: Object.entries(PROGRAM_NAMES) });
  }

  /* ======================= Mind Education ======================= */
  if (page === "mind") {
    D.renderLessonList($("#mind-lessons"), mindTopics);
  }

  /* ======================= Live in Korea ======================= */
  function areaName(id) { return (koreaAreas.find(a => a.id === id) || {}).title || id; }
  if (page === "live") {
    $("#k-path").innerHTML = D.metro(koreaPath, { numbered: true, horizontal: true });
    const areaCards = () => {
      $("#k-areas").innerHTML = koreaAreas.map(a => {
        if (a.id === "qa") return `<li class="area-tile"><a href="#qa"><span class="area-icon">${icon(a.icon)}</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p><span class="cat-meta">${qaItems.length} questions answered</span></a></li>`;
        const gs = koreaGuides.filter(g => g.area === a.id), read = gs.filter(g => Progress.isDone(g.id)).length;
        const mins = gs.reduce((s, g) => s + g.minutes, 0);
        return `<li class="area-tile"><a href="#${a.id}"><span class="area-icon">${icon(a.icon)}</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>
          <span class="cat-meta">${gs.length} guides, about ${fmtMinutes(mins)}</span>
          <span class="mini-progress" aria-hidden="true"><span style="width:${(read / gs.length) * 100}%"></span></span>
          <span class="cat-meta">${read} of ${gs.length} read</span></a></li>`;
      }).join("");
    };
    areaCards();
    $("#k-featured").innerHTML = certificateCourses.filter(c => ["Korean Language", "Living in Korea"].includes(c.category)).sort((a, b) => (a.status === "planned") - (b.status === "planned") || levelRank(a.level) - levelRank(b.level)).map(courseMini).join("");

    const guideCard = g => {
      const read = Progress.isDone(g.id);
      let link = "";
      if (g.url) link = `<a class="text-link" href="${esc(safeUrl(g.url))}" target="_blank" rel="noopener">${esc(g.linkLabel || `Visit ${new URL(g.url).hostname.replace(/^www\./, "")}`)}${icon("external", "icon icon-sm")}<span class="sr-only"> (opens in a new tab)</span></a>`;
      else if (g.course) link = `<a class="text-link" href="course.html?id=${esc(g.course)}">Start the course</a>`;
      else if (g.form && formUrl(g.form)) link = `<a class="text-link" href="${esc(formUrl(g.form))}" target="_blank" rel="noopener">Talk to a mentor</a>`;
      else if (g.href) link = `<a class="text-link" href="${esc(g.href)}">Open</a>`;
      return `<li class="learn-card guide-card${read ? " is-done" : ""}${g.recommended ? " is-recommended" : ""}" data-guide="${esc(g.id)}">
        ${g.recommended ? `<p class="learn-meta"><span class="rec-badge">${icon("check", "icon icon-sm")}Recommended by DHL</span></p>` : ""}
        <h4>${esc(g.title)}</h4>
        <p>${esc(g.text)}</p>
        ${g.tips ? `<ul class="tips">${g.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        <p class="learn-foot">${levelBadge(g.level)}${g.minutes > 0 ? `<span class="learn-time">${icon("clock", "icon icon-sm")}${fmtMinutes(g.minutes)}</span>` : ""}</p>
        <div class="guide-actions">${link}<button type="button" class="done-btn" data-read="${esc(g.id)}" aria-pressed="${read}">${icon("check")}<span>Read</span><span class="sr-only">: ${esc(g.title)}</span></button></div>
      </li>`;
    };
    const groups = $("#k-groups"), input = $("#k-search"), cnt = $("#k-count");
    let area = "all", lvl = "all";
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      let total = 0;
      groups.innerHTML = koreaAreas.filter(a => a.id !== "qa").map(a => {
        if (area !== "all" && area !== a.id) return "";
        const f = koreaGuides.filter(g => g.area === a.id && (lvl === "all" || g.level === lvl) && (!q || `${g.title} ${g.text} ${(g.tips || []).join(" ")}`.toLowerCase().includes(q)))
          .sort((x, y) => levelRank(x.level) - levelRank(y.level));
        total += f.length;
        if (!f.length && (q || lvl !== "all")) return "";
        return `<section class="guide-group" id="${a.id}" aria-labelledby="h-${a.id}">
          <h3 id="h-${a.id}">${icon(a.icon)}${esc(a.title)}</h3>
          ${a.id === "visa" ? '<p class="notice">General information only, not legal advice. Rules change. Check Hi Korea or call 1345 for your own situation.</p>' : ""}
          <ul class="card-grid">${f.map(guideCard).join("")}</ul>
          ${a.id === "korean" ? '<p><a class="text-link" href="#expressions">Useful Korean expressions</a></p>' : ""}
        </section>`;
      }).join("") || `<p class="empty">No guides match. Try another word, or ask in the <a href="#qa">Q&amp;A Corner</a>.</p>`;
      cnt.textContent = `${total} of ${koreaGuides.length} guides`;
    };
    const recBox = $("#k-recommended");
    const drawRec = () => { if (recBox) recBox.innerHTML = koreaGuides.filter(g => g.recommended).map(guideCard).join(""); };
    drawRec();
    recBox?.addEventListener("click", e => {
      const b = e.target.closest("[data-read]"); if (!b) return;
      const on = Progress.toggle(b.dataset.read); announce(on ? "Marked as read" : "Marked as not read"); drawRec(); draw(); areaCards();
    });
    renderChips($("#k-area-filter"), [["all", "All areas"], ...koreaAreas.filter(a => a.id !== "qa").map(a => [a.id, a.title])], v => { area = v; draw(); });
    renderChips($("#k-level-filter"), [["all", "All levels"], ...LEVELS.map(l => [l, l])], v => { lvl = v; draw(); });
    input.addEventListener("input", draw);
    input.closest("form").addEventListener("submit", e => e.preventDefault());
    groups.addEventListener("click", e => {
      const b = e.target.closest("[data-read]"); if (!b) return;
      const on = Progress.toggle(b.dataset.read);
      b.setAttribute("aria-pressed", String(on)); b.closest(".guide-card").classList.toggle("is-done", on);
      announce(on ? "Marked as read" : "Marked as not read"); areaCards(); drawRec();
    });
    draw();

    $("#expressions").innerHTML = koreanExpressions.map(x => `<tr><td lang="ko" class="ko">${esc(x.ko)}</td><td class="rom">${esc(x.rom)}</td><td>${esc(x.en)}</td></tr>`).join("");
    $("#help-numbers").innerHTML = koreaHelpNumbers.map(n => `<li><a href="tel:${n.number.replace(/\D/g, "")}"><strong>${esc(n.number)}</strong><span>${esc(n.label)}</span></a></li>`).join("");

    /* Q&A Corner */
    const qaList = $("#qa-list"), qaInput = $("#qa-search");
    let qaCat = "all";
    const drawQa = () => {
      const q = qaInput.value.trim().toLowerCase();
      const f = qaItems.filter(x => (qaCat === "all" || x.category === qaCat) && (!q || `${x.q} ${x.a}`.toLowerCase().includes(q)));
      qaList.innerHTML = f.length ? f.map(x => `<details class="qa-item"><summary><span class="qa-cat">${esc(x.category)}</span>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")
        : `<p class="empty">No answer yet for that. Ask your question below.</p>`;
    };
    renderChips($("#qa-filter"), [["all", "All questions"], ...[...new Set(qaItems.map(x => x.category))].map(c => [c, c])], v => { qaCat = v; drawQa(); });
    qaInput.addEventListener("input", drawQa);
    qaInput.closest("form").addEventListener("submit", e => e.preventDefault());
    drawQa();
    const qf = formUrl("question");
    const askForm = $("#qa-form-link"); if (qf) askForm.href = qf; else askForm.hidden = true;
    $("#qa-ask-ai").addEventListener("click", () => { location.href = `ai-assistant.html?q=${encodeURIComponent(qaInput.value || "")}`; });

    if (location.hash) {
      const id = location.hash.slice(1);
      document.getElementById(id)?.scrollIntoView();
    }
  }

  /* ======================= Certificate catalog ======================= */
  if (page === "certs") {
    const grid = $("#cert-grid"), input = $("#cert-search"), cnt = $("#cert-count");
    let cat = "all", lvl = "all";
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      const f = certificateCourses.filter(c => (cat === "all" || c.category === cat) && (lvl === "all" || c.level === lvl) && (!q || `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(q)))
        .sort((a, b) => (a.status === "planned") - (b.status === "planned") || certificateCategories.indexOf(a.category) - certificateCategories.indexOf(b.category) || levelRank(a.level) - levelRank(b.level));
      grid.innerHTML = f.length ? f.map(courseMini).join("") : `<li class="empty">No courses match. Try another category or level.</li>`;
      cnt.textContent = `${f.filter(c => c.status === "open").length} available, ${f.filter(c => c.status === "planned").length} coming later`;
    };
    renderChips($("#cert-cats"), [["all", "All categories"], ...certificateCategories.map(c => [c, c])], v => { cat = v; draw(); });
    renderChips($("#cert-levels"), [["all", "All levels"], ...LEVELS.map(l => [l, l])], v => { lvl = v; draw(); });
    input.addEventListener("input", draw);
    input.closest("form").addEventListener("submit", e => e.preventDefault());
    draw();

    const hist = $("#cert-history");
    const done = openCourses().map(c => ({ c, st: courseState(c) })).filter(x => x.st.complete);
    hist.innerHTML = done.length ? `<div class="table-wrap"><table class="history"><caption class="sr-only">Completed courses</caption>
      <thead><tr><th scope="col">Course</th><th scope="col">Category</th><th scope="col">Completed</th><th scope="col">Best score</th><th scope="col"><span class="sr-only">Certificate</span></th></tr></thead>
      <tbody>${done.map(({ c, st }) => `<tr><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td>${st.rec.passedAt ? longDate(st.rec.passedAt) : ""}</td><td>${st.rec.best}%</td><td><a href="course.html?id=${esc(c.id)}#certificate">View certificate</a></td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">No completed courses yet. Finish every lesson and pass the quiz to earn your first certificate.</p>`;
  }

  /* ======================= Course player ======================= */
  if (page === "course") {
    const root = $("#course-root");
    const id = new URLSearchParams(location.search).get("id");
    const c = certificateCourses.find(x => x.id === id);
    if (!c || c.status !== "open") {
      root.innerHTML = `<div class="wrap section"><h1>${c ? "This course is coming later" : "Course not found"}</h1><p>${c ? esc(c.description) : "The link may be old or mistyped."}</p><a class="btn btn-primary" href="certificates.html">See all certificate courses</a></div>`;
      return;
    }
    document.title = `${c.title} | DHL Certificate Course`;
    $("#crumb-current").textContent = c.title;
    const lessons = lessonsOf(c);
    let n = 0;
    root.innerHTML = `
      <section class="page-hero course-hero">
        <div class="wrap">
          <p class="learn-meta"><span class="course-cat on-dark">${esc(c.category)}</span></p>
          <h1>${esc(c.title)}</h1>
          <p class="lede">${esc(c.description)}</p>
          <p class="course-facts">${levelBadge(c.level)}<span>${icon("clock", "icon icon-sm")}${hoursText(c.hours)}</span><span>${c.modules.length} modules, ${lessons.length} lessons, 1 quiz</span></p>
          <div class="course-progress-box">
            <div class="progress" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100"><span class="progress-fill"></span></div>
            <p class="progress-text" id="course-progress-text"></p>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="wrap course-layout">
          <div class="course-main">
            <h2>Lessons</h2>
            ${c.modules.map((m, mi) => `
              <section class="module" aria-labelledby="mod-${mi}">
                <h3 id="mod-${mi}"><span class="module-num">Module ${mi + 1}</span>${esc(m.title)}</h3>
                ${m.lessons.map(l => { n++; const k = lessonKey(c, l); return `
                  <details class="lesson-item" id="lesson-${esc(l.id)}" data-key="${esc(k)}">
                    <summary><span class="li-num" aria-hidden="true">${n}</span><span class="li-title">${esc(l.title)}</span><span class="li-time">${fmtMinutes(l.minutes || 15)}</span><span class="li-state" aria-hidden="true">${icon("check")}</span><span class="sr-only li-sr"></span></summary>
                    <div class="lesson-content">
                      ${(l.body || []).map(p => `<p>${esc(p)}</p>`).join("")}
                      ${l.refs && l.refs.length ? `<p class="refs">${icon("book")}<span>Read: ${refLinks(l.refs)}</span></p>` : ""}
                      ${l.questions && l.questions.length ? `<h4>Think about</h4><ul>${l.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
                      ${l.draft ? '<p class="fine-print">This lesson is a draft awaiting DHL approval. Always read the passages for yourself.</p>' : ""}
                      <button type="button" class="btn btn-primary btn-small" data-complete="${esc(k)}"></button>
                    </div>
                  </details>`; }).join("")}
              </section>`).join("")}

            <section class="quiz-block" id="quiz" aria-labelledby="quiz-title">
              <h2 id="quiz-title">Quiz</h2>
              <p>Answer ${c.quiz.length} questions. You need ${c.passMark}% to pass, and you can try as many times as you like.</p>
              <form id="quiz-form" novalidate>
                ${c.quiz.map((q, qi) => `
                  <fieldset class="quiz-q" data-q="${qi}">
                    <legend><span class="quiz-n">${qi + 1}.</span> ${esc(q.q)}</legend>
                    ${q.options.map((o, oi) => `<label class="quiz-opt"><input type="radio" name="q${qi}" value="${oi}"> <span>${esc(o)}</span></label>`).join("")}
                    <p class="quiz-feedback" hidden></p>
                  </fieldset>`).join("")}
                <p class="quiz-error" id="quiz-error" role="alert" hidden>Please answer every question.</p>
                <div class="btn-row"><button type="submit" class="btn btn-mango">Check my answers</button><button type="button" class="btn btn-quiet" id="quiz-reset" hidden>Try again</button></div>
                <p class="quiz-result" id="quiz-result" role="status"></p>
              </form>
            </section>

            <section class="cert-block" id="certificate" aria-labelledby="cert-title">
              <h2 id="cert-title">Certificate of completion</h2>
              <div id="cert-area"></div>
            </section>
          </div>

          <aside class="course-side" aria-label="Course overview">
            <div class="side-box">
              <h2>What you'll learn</h2>
              <ul class="check-list">${c.objectives.map(o => `<li>${esc(o)}</li>`).join("")}</ul>
            </div>
            <div class="side-box">
              <h2>To earn your certificate</h2>
              <ul class="req-list" id="req-list"></ul>
            </div>
            <p><a class="text-link" href="certificates.html">All certificate courses</a></p>
            <p><a class="text-link" href="contents.html">Back to the Contents Hub</a></p>
          </aside>
        </div>
      </section>`;

    const refresh = () => {
      const st = courseState(c);
      $(".course-hero .progress-fill").style.width = `${st.pct}%`;
      $(".course-hero .progress").setAttribute("aria-valuenow", st.pct);
      $("#course-progress-text").textContent = `${st.done} of ${st.total} lessons done${st.passed ? ", quiz passed" : st.rec.best != null ? `, best quiz score ${st.rec.best}%` : ""}`;
      $$(".lesson-item").forEach(d => {
        const done = Progress.isDone(d.dataset.key);
        d.classList.toggle("is-done", done);
        d.querySelector(".li-sr").textContent = done ? "(completed)" : "";
        const b = d.querySelector("[data-complete]");
        b.textContent = done ? "Completed. Mark as not done" : "Mark lesson complete";
        b.className = `btn ${done ? "btn-quiet" : "btn-primary"} btn-small`;
      });
      $("#req-list").innerHTML = `
        <li class="${st.done === st.total ? "met" : ""}">${icon("check")}<span>Complete all ${st.total} lessons (${st.done} done)</span></li>
        <li class="${st.passed ? "met" : ""}">${icon("check")}<span>Pass the quiz with ${c.passMark}% or more${st.rec.best != null ? ` (best: ${st.rec.best}%)` : ""}</span></li>`;
      renderCertificate(st);
    };

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-complete]"); if (!b) return;
      const on = Progress.toggle(b.dataset.complete);
      announce(on ? "Lesson completed" : "Lesson marked as not done");
      refresh();
      if (on) { // open the next unfinished lesson
        const cur = b.closest(".lesson-item"); cur.open = false;
        const nextL = $$(".lesson-item").find(d => !Progress.isDone(d.dataset.key));
        if (nextL) { nextL.open = true; nextL.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }
        else $("#quiz").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
      }
    });

    /* Quiz */
    const form = $("#quiz-form");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const answers = c.quiz.map((_, i) => form.querySelector(`input[name="q${i}"]:checked`));
      if (answers.some(a => !a)) { $("#quiz-error").hidden = false; answers.findIndex(a => !a) >= 0 && form.querySelector(`[data-q="${answers.findIndex(a => !a)}"] input`).focus(); return; }
      $("#quiz-error").hidden = true;
      let right = 0;
      c.quiz.forEach((q, i) => {
        const ok = Number(answers[i].value) === q.answer; if (ok) right++;
        const fs = form.querySelector(`[data-q="${i}"]`), fb = fs.querySelector(".quiz-feedback");
        fs.classList.toggle("is-right", ok); fs.classList.toggle("is-wrong", !ok);
        fb.hidden = false;
        fb.innerHTML = `<strong>${ok ? "Correct." : `Not quite. The answer is: ${esc(q.options[q.answer])}.`}</strong> ${esc(q.explain || "")}`;
        fs.querySelectorAll("input").forEach(inp => { inp.disabled = true; });
      });
      const score = Math.round((right / c.quiz.length) * 100);
      const rec = Progress.getCourse(c.id);
      const best = Math.max(score, rec.best || 0);
      const patch = { score, best };
      if (score >= c.passMark && !rec.passedAt) patch.passedAt = new Date().toISOString().slice(0, 10);
      Progress.setCourse(c.id, patch);
      $("#quiz-result").innerHTML = score >= c.passMark
        ? `<strong>You scored ${score}% (${right} of ${c.quiz.length}). You passed!</strong>`
        : `<strong>You scored ${score}% (${right} of ${c.quiz.length}).</strong> You need ${c.passMark}% to pass. Review the lessons and try again.`;
      $("#quiz-reset").hidden = false;
      form.querySelector("button[type=submit]").hidden = true;
      refresh();
      $("#quiz-result").focus?.();
    });
    $("#quiz-reset").addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".quiz-q").forEach(fs => { fs.classList.remove("is-right", "is-wrong"); fs.querySelector(".quiz-feedback").hidden = true; fs.querySelectorAll("input").forEach(i => { i.disabled = false; }); });
      $("#quiz-result").textContent = ""; $("#quiz-reset").hidden = true; form.querySelector("button[type=submit]").hidden = false;
      form.querySelector("input").focus();
    });

    /* Certificate */
    function reference(name, date) {
      let h = 0; for (const ch of `${c.id}|${name}|${date}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return `DHL-${c.id.split("-").map(w => w[0]).join("").toUpperCase()}-${date.replace(/-/g, "")}-${h.toString(36).toUpperCase().slice(0, 5)}`;
    }
    function certificateHtml(name, rec) {
      const date = rec.passedAt || new Date().toISOString().slice(0, 10);
      return `<div class="certificate">
        <div class="cert-top"><img src="${esc(CONFIG.logo)}" alt="" width="56" height="56"><p class="cert-org">DHL – Diaspora Hub for Leaders</p></div>
        <p class="cert-label">Certificate of Completion</p>
        <p class="cert-small">This certifies that</p>
        <p class="cert-name">${esc(name)}</p>
        <p class="cert-small">has completed the DHL course</p>
        <p class="cert-course">${esc(c.title)}</p>
        <p class="cert-small">${esc(c.category)}, ${esc(c.level)} level, ${hoursText(c.hours).toLowerCase()} of study</p>
        <div class="cert-foot">
          <div><span>Completed</span><strong>${longDate(date)}</strong></div>
          <div><span>Quiz score</span><strong>${rec.best}%</strong></div>
          <div><span>Reference</span><strong>${reference(name, date)}</strong></div>
        </div>
        <p class="cert-disclaimer">This certificate recognizes completion of a self-paced DHL online course. It is not an accredited academic qualification.</p>
      </div>`;
    }
    function renderCertificate(st) {
      const area = $("#cert-area");
      if (!st.complete) {
        area.innerHTML = `<div class="cert-locked">${icon("cap")}<div><p><strong>Your certificate unlocks when you finish the course.</strong></p>
          <p>${st.done < st.total ? `${st.total - st.done} lesson${st.total - st.done === 1 ? "" : "s"} left. ` : ""}${st.passed ? "Quiz passed." : "Then pass the quiz."}</p></div></div>`;
        return;
      }
      const rec = st.rec;
      area.innerHTML = `
        <p>Congratulations! Enter your name as you want it on your certificate.</p>
        <form class="cert-form" id="cert-form">
          <label for="cert-name">Full name</label>
          <div class="cert-form-row"><input id="cert-name" type="text" autocomplete="name" maxlength="60" required value="${esc(rec.name || "")}"><button type="submit" class="btn btn-mango">Create my certificate</button></div>
        </form>
        <div id="cert-preview">${rec.name ? certificateHtml(rec.name, rec) : ""}</div>
        <div class="btn-row cert-actions" ${rec.name ? "" : "hidden"}><button type="button" class="btn btn-primary" id="cert-print">Print or save as PDF</button></div>
        <p class="fine-print">Your certificate is created on this device. DHL can't verify certificates online yet. When DHL accounts are available, certificates will be recorded to your profile.</p>`;
      $("#cert-form").addEventListener("submit", e => {
        e.preventDefault();
        const name = $("#cert-name").value.trim().replace(/\s+/g, " ");
        if (!name) { $("#cert-name").focus(); return; }
        const r = Progress.setCourse(c.id, { name, certificateAt: new Date().toISOString().slice(0, 10) });
        $("#cert-preview").innerHTML = certificateHtml(name, r);
        $(".cert-actions").hidden = false;
        announce("Certificate created");
      });
      $("#cert-print").addEventListener("click", () => {
        let pa = $("#print-area");
        if (!pa) { pa = document.createElement("div"); pa.id = "print-area"; document.body.appendChild(pa); }
        pa.innerHTML = $("#cert-preview").innerHTML;
        document.body.classList.add("printing-cert");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-cert"), 500);
      });
    }

    refresh();
    const firstOpen = $$(".lesson-item").find(d => !Progress.isDone(d.dataset.key));
    if (location.hash === "#certificate" || location.hash === "#quiz") $(location.hash).scrollIntoView();
    else if (firstOpen) firstOpen.open = true;
  }
})();
