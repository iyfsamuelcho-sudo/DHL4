/* ==========================================================================
   DHL — pathways.js
   Draws the ministry journey and the four pathways as metro lines, and
   remembers the visitor's chosen pathway and finished stations.
   Progress is saved in this browser only (see DHL.Progress in main.js);
   a future backend can store it in the visitor's account instead.
   ========================================================================== */
(() => {
  "use strict";
  const { $, $$, esc, icon, formUrl, Progress, announce } = window.DHL;

  const stationHref = s => (s.form ? formUrl(s.form) : s.href || (s.topic ? `#${s.topic}` : "#"));
  const extAttr = url => (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "");

  /* Generic metro line. options: { numbered, icons, doneable, horizontal } */
  function metro(stations, opts = {}) {
    return `<ol class="metro${opts.horizontal ? " metro--horizontal" : ""}" style="--n:${stations.length}">${stations.map((s, i) => {
      const url = stationHref(s), done = opts.doneable && Progress.isDone(s.id);
      const num = String(i + 1).padStart(2, "0");
      return `<li class="station${done ? " is-done" : ""}" data-id="${esc(s.id)}">
        <span class="station-dot" aria-hidden="true">${opts.icons && s.icon ? icon(s.icon) : done ? icon("check") : ""}</span>
        <div class="station-body">
          ${opts.numbered ? `<span class="station-num">${num}</span>` : ""}
          <h3><a href="${esc(url)}"${extAttr(url)}>${esc(s.title)}</a></h3>
          <p>${esc(s.text)}</p>
          ${opts.doneable ? `<button type="button" class="done-btn" data-done="${esc(s.id)}" aria-pressed="${done}">${icon("check")}<span>Done</span><span class="sr-only">: ${esc(s.title)}</span></button>` : ""}
        </div>
      </li>`;
    }).join("")}</ol>`;
  }

  function wireDone(root, onChange) {
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-done]"); if (!b || !root.contains(b)) return;
      const on = Progress.toggle(b.dataset.done);
      b.setAttribute("aria-pressed", String(on));
      const st = b.closest(".station"); st.classList.toggle("is-done", on);
      const dot = st.querySelector(".station-dot"); if (dot) dot.innerHTML = on ? icon("check") : "";
      announce(on ? "Station marked as done" : "Station marked as not done");
      onChange && onChange();
    });
  }

  window.DHL.metro = metro;
  window.DHL.wireDone = wireDone;

  const nextStation = p => p.stations.find(s => !Progress.isDone(s.id));

  /* ---------- Home: the seven-step journey ---------- */
  const journey = $("#journey-map");
  if (journey) journey.innerHTML = metro(journeySteps, { numbered: true, icons: true, horizontal: true });

  /* ---------- "You are here" indicator on inner pages ---------- */
  const here = $("[data-you-are-here]");
  const stationId = document.body.dataset.station;
  if (here && stationId) {
    const idx = journeySteps.findIndex(s => s.id === stationId);
    if (idx > -1) {
      here.innerHTML = `
        <p class="here-label">You are here: step ${idx + 1} of ${journeySteps.length}, <strong>${esc(journeySteps[idx].title)}</strong></p>
        <ol class="here-line" aria-hidden="true">${journeySteps.map((s, i) => `<li class="${i < idx ? "passed" : i === idx ? "current" : ""}"><a href="${s.href}" tabindex="-1">${esc(s.title)}</a></li>`).join("")}</ol>`;
    }
  }

  /* ---------- Pathway choosers (home + final CTA) ---------- */
  function chooser(el, { goTo = true } = {}) {
    const saved = Progress.getPathway();
    el.innerHTML = pathways.map((p, i) => {
      const next = nextStation(p);
      const isMine = saved === p.id;
      return `<li class="path-choice line-${p.line}${isMine ? " is-mine" : ""}">
        <a href="pathways.html#${p.id}" data-choose="${p.id}">
          <span class="line-badge">Line ${i + 1}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.who)}</p>
          <span class="path-stops">${p.stations.map(s => esc(s.title)).join(" / ")}</span>
          ${isMine && next ? `<span class="path-next">Your next station: ${esc(next.title)}</span>` : isMine ? '<span class="path-next">Line complete</span>' : ""}
        </a></li>`;
    }).join("");
    if (goTo) el.addEventListener("click", e => { const a = e.target.closest("[data-choose]"); if (a) Progress.setPathway(a.dataset.choose); });
  }
  $$("[data-pathway-chooser]").forEach(el => chooser(el));

  /* ---------- Pathways page ---------- */
  const lines = $("#pathway-lines");
  if (lines) {
    const draw = () => {
      const saved = Progress.getPathway();
      lines.innerHTML = pathways.map((p, i) => {
        const done = p.stations.filter(s => Progress.isDone(s.id)).length;
        const next = nextStation(p);
        const mine = saved === p.id;
        return `<section class="pathway line-${p.line}${mine ? " is-mine" : ""}" id="${p.id}" aria-labelledby="${p.id}-title">
          <header class="pathway-head">
            <span class="line-badge">Line ${i + 1}</span>
            <div><h2 id="${p.id}-title">${esc(p.name)}</h2><p>For: ${esc(p.who)}</p></div>
            <div class="pathway-status">
              <div class="progress" role="progressbar" aria-label="${esc(p.name)} progress" aria-valuemin="0" aria-valuemax="${p.stations.length}" aria-valuenow="${done}"><span class="progress-fill" style="width:${(done / p.stations.length) * 100}%"></span></div>
              <p class="progress-text">${done} of ${p.stations.length} stations${next ? `. Next: ${esc(next.title)}` : ". Line complete!"}</p>
              <button type="button" class="btn ${mine ? "btn-quiet" : "btn-primary"} btn-small" data-set-path="${p.id}" aria-pressed="${mine}">${mine ? "This is my pathway" : "Make this my pathway"}</button>
            </div>
          </header>
          ${metro(p.stations, { doneable: true, horizontal: true })}
        </section>`;
      }).join("");
      const banner = $("#my-pathway");
      const p = pathways.find(x => x.id === saved);
      if (banner) {
        if (p) {
          const n = nextStation(p);
          const url = n ? stationHref(n) : "";
          banner.hidden = false;
          banner.innerHTML = `<p>Your pathway: <strong>${esc(p.name)}</strong>. ${n ? `Next station: <strong>${esc(n.title)}</strong>.` : "You've completed every station. Talk to a mentor about what's next."}</p>
            ${n ? `<a class="btn btn-mango btn-small" href="${esc(url)}"${extAttr(url)}>Go to ${esc(n.title)}</a>` : ""}
            <button type="button" class="text-btn" data-reset>Reset my progress</button>`;
        } else banner.hidden = true;
      }
    };
    lines.addEventListener("click", e => {
      const b = e.target.closest("[data-set-path]"); if (!b) return;
      Progress.setPathway(b.dataset.setPath); draw();
      announce(`${pathways.find(p => p.id === b.dataset.setPath).name} saved as your pathway`);
      $("#my-pathway")?.focus?.();
    });
    wireDone(lines, draw);
    $("#my-pathway")?.addEventListener("click", e => {
      if (e.target.closest("[data-reset]") && confirm("Clear your pathway and all stations marked as done on this device?")) { Progress.reset(); draw(); announce("Progress cleared"); }
    });
    draw();
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  /* ---------- Discipleship path ---------- */
  const dp = $("#disciple-path");
  if (dp) {
    const bar = $("[data-path-progress]");
    const update = () => {
      const done = discipleshipPath.filter(s => Progress.isDone(s.id)).length;
      if (bar) { bar.querySelector(".progress-fill").style.width = `${(done / discipleshipPath.length) * 100}%`; bar.querySelector(".progress-text").textContent = `${done} of ${discipleshipPath.length} steps done`; }
    };
    dp.innerHTML = metro(discipleshipPath, { numbered: true, doneable: true, horizontal: true });
    wireDone(dp, update); update();
  }
})();
