/* ==========================================================================
   DHL — academy.js
   DHL Leadership Academy: level ladder, courses, practicum, certificates.
   Course completion is saved on this device only until accounts exist.
   ========================================================================== */
(() => {
  "use strict";
  const { $, esc, icon, Progress, announce } = window.DHL;

  const levelDone = l => l.courses.filter(c => Progress.isDone(c.id)).length;
  const currentLevel = () => (academyLevels.find(l => levelDone(l) < l.courses.length) || academyLevels[academyLevels.length - 1]).level;

  /* Ladder: five rising steps. Used on the home page and the Academy page. */
  function ladder(el) {
    const cur = currentLevel();
    el.innerHTML = academyLevels.map(l => {
      const done = levelDone(l), total = l.courses.length, complete = done === total;
      return `<li class="rung rung-${l.level}${complete ? " is-complete" : ""}${l.level === cur ? " is-current" : ""}">
        <a href="academy.html#level-${l.level}">
          <span class="rung-level">Level ${l.level}</span>
          <strong>${esc(l.title)}</strong>
          <span class="rung-goal">${esc(l.goal)}</span>
          <span class="rung-bar" aria-hidden="true"><span style="width:${(done / total) * 100}%"></span></span>
          <span class="rung-count">${complete ? "Complete" : `${done} of ${total} courses`}${l.level === cur && !complete ? ", in progress" : ""}</span>
        </a></li>`;
    }).join("");
  }
  const ladders = [...document.querySelectorAll("[data-academy-ladder]")];
  ladders.forEach(ladder);

  /* Academy page: courses per level. */
  const levelsEl = $("#academy-levels");
  if (levelsEl) {
    levelsEl.innerHTML = academyLevels.map(l => `
      <section class="level-block" id="${l.practicum ? "practicum" : `level-${l.level}`}" aria-labelledby="lv${l.level}">
        ${l.practicum ? `<span id="level-${l.level}"></span>` : ""}
        <div class="level-head">
          <span class="level-num" aria-hidden="true">${l.level}</span>
          <div><h3 id="lv${l.level}">Level ${l.level}: ${esc(l.title)}</h3><p>${esc(l.goal)}</p></div>
        </div>
        <ul class="course-list">${l.courses.map(c => `
          <li class="course${Progress.isDone(c.id) ? " is-done" : ""}">
            <div><h4>${c.href ? `<a href="${esc(c.href)}">${esc(c.title)}</a>` : esc(c.title)}</h4>
              <p>${c.lessons} ${c.lessons === 1 ? "assignment" : "lessons"}, ${esc(c.format)}</p></div>
            <button type="button" class="done-btn" data-course="${esc(c.id)}" aria-pressed="${Progress.isDone(c.id)}">${icon("check")}<span>Done</span><span class="sr-only">: ${esc(c.title)}</span></button>
          </li>`).join("")}</ul>
      </section>`).join("");
    levelsEl.addEventListener("click", e => {
      const b = e.target.closest("[data-course]"); if (!b) return;
      const on = Progress.toggle(b.dataset.course);
      b.setAttribute("aria-pressed", String(on)); b.closest(".course").classList.toggle("is-done", on);
      ladders.forEach(ladder);
      announce(on ? "Course marked as done" : "Course marked as not done");
    });
  }

  const certs = $("#certificates-list");
  if (certs) certs.innerHTML = certificates.map(c => `
    <li class="cert"><span class="cert-seal" aria-hidden="true">${icon("cap")}</span>
      <div><h3>${esc(c.title)}</h3><p class="cert-after">After ${esc(c.after)}</p><p>${esc(c.requires)}</p></div></li>`).join("");

  const rec = $("#recognition-steps");
  if (rec) rec.innerHTML = recognitionSteps.map((s, i) => `<li><span class="rec-num">${i + 1}</span><span>${esc(s)}</span></li>`).join("");
})();
