/* ==========================================================================
   DHL — data-loader.js
   Reads the editable content in content/*.json, then starts the site.

   The JSON files are what Pages CMS edits (README section 19). This file
   turns each one into the variables the rest of the site already uses
   (ministryPosts, gospelTopics, koreaGuides, ...), then loads the site's
   scripts in order. If one file is missing or broken, that section is
   simply empty and the rest of the site still works.
   ========================================================================== */
(() => {
  "use strict";
  const list = v => (Array.isArray(v) ? v : []);
  const FILES = {
    "site-settings.json": d => {
      if (d.email != null) CONFIG.email = d.email;
      if (d.location != null) CONFIG.location = d.location;
      CONFIG.forms = d.forms || {};
      CONFIG.social = d.social || {};
    },
    "posts.json": d => { window.ministryPosts = list(d.posts); },
    "events.json": d => { window.ministryEvents = list(d.events); },
    "videos.json": d => { window.fallbackVideos = list(d.videos); },
    "gospel-topics.json": d => { window.gospelTopics = list(d.topics); },
    "gospel-course.json": d => { window.gospelCourse = list(d.lessons); },
    "bible-studies.json": d => { window.bibleStudies = list(d.studies); },
    "discipleship.json": d => { window.discipleshipPath = list(d.path); window.discipleshipTopics = list(d.topics); },
    "mind-education.json": d => { window.mindTopics = list(d.lessons); },
    "leadership-courses.json": d => { window.leadershipTopics = list(d.courses); },
    "korea-guides.json": d => { window.koreaGuides = list(d.guides); },
    "qa.json": d => { window.qaItems = list(d.questions); },
    "korean-expressions.json": d => { window.koreanExpressions = list(d.expressions); },
    "certificate-courses.json": d => { window.certificateCourses = list(d.courses); },
    "academy.json": d => { window.academyLevels = list(d.levels); window.certificates = list(d.certificates); window.recognitionSteps = list(d.recognitionSteps); },
    "community-groups.json": d => { window.communityGroups = list(d.groups); },
    "daily-verses.json": d => { window.dailyVerses = list(d.verses); window.dailyVerseVersion = d.version || "KJV"; },
    "digital-ministry.json": d => { window.digitalTopics = list(d.topics); window.digitalDownloads = list(d.downloads); },
    "ai-knowledge.json": d => { window.aiKnowledge = list(d.entries); }
  };
  const SCRIPTS = ["js/youtube.js", "js/main.js", "js/pathways.js", "js/academy.js", "js/learning.js", "js/ai-chat.js"];

  const me = document.currentScript;
  const extra = me && me.dataset.extra ? me.dataset.extra.split(",").map(s => s.trim()).filter(Boolean) : [];
  const failed = [];

  const load = ([file, apply]) =>
    fetch(`content/${file}`, { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(apply)
      .catch(err => { console.error(`[DHL] Couldn't load content/${file}:`, err.message); failed.push(file); apply({}); });

  Promise.all(Object.entries(FILES).map(load)).then(() => {
    if (location.protocol === "file:") {
      const note = document.createElement("p");
      note.className = "file-warning";
      note.textContent = "This site needs to be opened through a web server to load its content. See README section 3.";
      document.body.prepend(note);
    }
    [...SCRIPTS, ...extra].forEach(src => {
      const s = document.createElement("script");
      s.src = src; s.async = false; // keep the scripts in order
      document.body.appendChild(s);
    });
    if (failed.length) console.warn("[DHL] These content files didn't load, so their sections are empty:", failed.join(", "));
  });
})();
