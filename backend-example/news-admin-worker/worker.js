/* ==========================================================================
   DHL News Admin — Cloudflare Worker

   The secure half of the News Admin. admin.html (on GitHub Pages) talks to
   this Worker; this Worker talks to GitHub. No secret ever reaches the
   browser.

   Routes
     GET  /auth/login     Start "Sign in with GitHub"
     GET  /auth/callback  GitHub returns here; checks the allow-list and
                          sends the admin back to admin.html with a session
     GET  /api/me         Who is signed in (checks the session)
     POST /api/posts      Validate a post and add it to content/posts.json

   Secrets (set with `npx wrangler secret put NAME`, never in files):
     GITHUB_TOKEN          Fine-grained token: this repository only,
                           permission "Contents: Read and write"
     GITHUB_CLIENT_SECRET  From your GitHub OAuth App
     SESSION_SECRET        Any long random text (signs admin sessions)

   Settings (wrangler.toml [vars]): GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH,
   POSTS_PATH, GITHUB_CLIENT_ID, ADMIN_PAGE_URL, ADMIN_USERS
   ========================================================================== */

const SESSION_HOURS = 8;
const TYPES = ["announcement", "event", "testimony", "study", "resource", "facebook", "youtube"];
const UA = "DHL-News-Admin";

/* ---------------- small helpers ---------------- */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlToBytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

function utf8ToBase64(str) {
  const bytes = enc.encode(str); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const base64ToUtf8 = b64 => dec.decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0)));

async function hmac(secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return key;
}
async function sign(env, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmac(env.SESSION_SECRET);
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${sig}`;
}
async function verify(env, token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const key = await hmac(env.SESSION_SECRET);
  let ok = false;
  try { ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(body)); } catch (e) { return null; }
  if (!ok) return null;
  const data = JSON.parse(dec.decode(b64urlToBytes(body)));
  if (!data.exp || Date.now() > data.exp) return null;
  if (!allowed(env, data.login)) return null; // removed from the allow-list = signed out
  return data;
}
const allowed = (env, login) => String(env.ADMIN_USERS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).includes(String(login || "").toLowerCase());
const adminOrigin = env => new URL(env.ADMIN_PAGE_URL).origin;

function cors(env) {
  return {
    "Access-Control-Allow-Origin": adminOrigin(env),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}
const json = (env, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(env) } });
const backToAdmin = (env, hash, extraHeaders = {}) => new Response(null, { status: 302, headers: { Location: `${env.ADMIN_PAGE_URL}#${hash}`, "Cache-Control": "no-store", ...extraHeaders } });

function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : "";
}

/* ---------------- GitHub sign-in (identity only) ---------------- */
function login(request, env) {
  const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const redirect = `${new URL(request.url).origin}/auth/callback`;
  const url = "https://github.com/login/oauth/authorize?" + new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: redirect, scope: "read:user", state, allow_signup: "false" });
  return new Response(null, { status: 302, headers: {
    Location: url,
    "Set-Cookie": `dhl_oauth_state=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    "Cache-Control": "no-store"
  } });
}

async function callback(request, env) {
  const url = new URL(request.url);
  const clearState = { "Set-Cookie": "dhl_oauth_state=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0" };
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state || state !== getCookie(request, "dhl_oauth_state")) return backToAdmin(env, "error=login_expired", clearState);

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/auth/callback` })
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.access_token) return backToAdmin(env, "error=login_failed", clearState);

  const userRes = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github+json", "User-Agent": UA } });
  const user = await userRes.json().catch(() => ({}));
  // The visitor's GitHub token is used only to learn who they are, then discarded.
  if (!user.login) return backToAdmin(env, "error=login_failed", clearState);
  if (!allowed(env, user.login)) return backToAdmin(env, `error=not_allowed&user=${encodeURIComponent(user.login)}`, clearState);

  const session = await sign(env, { login: user.login, name: user.name || user.login, id: user.id, avatar: user.avatar_url, exp: Date.now() + SESSION_HOURS * 3600e3 });
  return backToAdmin(env, `session=${session}`, clearState);
}

async function requireSession(request, env) {
  const h = request.headers.get("Authorization") || "";
  return verify(env, h.startsWith("Bearer ") ? h.slice(7) : "");
}

/* ---------------- validation ---------------- */
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const isHttps = s => { try { return new URL(s).protocol === "https:"; } catch (e) { return false; } };
const isSitePath = s => /^[a-z0-9][a-z0-9._\/-]*$/i.test(s) && !s.includes("..") && !s.startsWith("/") ;
const clean = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

function validate(input) {
  const p = {
    type: clean(input.type, 20), title: clean(input.title, 150), date: clean(input.date, 10),
    description: clean(input.description, 400).replace(/\n+/g, " "), content: clean(input.content, 20000),
    image: clean(input.image, 500), url: clean(input.url, 500), category: clean(input.category, 40).replace(/\n+/g, " "),
    videoId: clean(input.videoId, 20), pinned: input.pinned === true,
    author: clean(input.author, 80).replace(/\n+/g, " "), scripture: clean(input.scripture, 80).replace(/\n+/g, " ")
  };
  const errors = {};
  if (!TYPES.includes(p.type)) errors.type = "Choose a post type.";
  if (p.title.length < 3) errors.title = "Enter a title of at least 3 characters.";
  if (!isDate(p.date)) errors.date = "Enter a real date as YYYY-MM-DD.";
  if (!p.category) errors.category = "Choose a category.";
  if (p.description.length < 10) errors.description = "Write a short description of at least 10 characters.";
  if (p.image && !isHttps(p.image) && !(isSitePath(p.image) && /\.(jpe?g|png|webp|gif|svg)$/i.test(p.image))) errors.image = "Use an https:// image link or a site path like assets/images/photo.jpg.";
  if (p.url && !isHttps(p.url) && !isSitePath(p.url)) errors.url = "Use an https:// link or a page on this site like events.html.";
  if (p.type === "youtube" && !/^[A-Za-z0-9_-]{11}$/.test(p.videoId)) errors.videoId = "Paste a valid YouTube video link.";
  if (p.type !== "youtube" && !p.content && !p.url) errors.content = "Write the full article, or add an external link for readers to open.";
  if (p.type !== "youtube") p.videoId = "";
  return { post: p, errors };
}

/* ---------------- editing content/posts.json ---------------- */
const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "post";

/* Same fields and order as the existing posts; empty optional fields are left out. */
function postObject(p) {
  const o = {};
  if (p.pinned) o.pinned = true;
  Object.assign(o, { type: p.type, title: p.title, date: p.date, description: p.description });
  if (p.videoId) o.videoId = p.videoId;
  Object.assign(o, { url: p.url, image: p.image, category: p.category, id: p.id });
  if (p.author) o.author = p.author;
  if (p.scripture) o.scripture = p.scripture;
  o.content = p.content;
  return o;
}

function insertPost(fileText, p) {
  let data;
  try { data = JSON.parse(fileText); } catch (e) { throw Object.assign(new Error("The posts file isn't valid JSON, so nothing was changed. Fix content/posts.json on GitHub first."), { status: 500 }); }
  if (!data || !Array.isArray(data.posts)) throw Object.assign(new Error('The posts file must contain a "posts" list.'), { status: 500 });
  const ids = new Set(data.posts.map(x => x && x.id).filter(Boolean));
  const base = `${p.date}-${slugify(p.title)}`; let id = base, n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  p.id = id;
  data.posts.unshift(postObject(p));   // newest at the top; the site sorts by date anyway
  return { text: JSON.stringify(data, null, 2) + "\n", id };
}

async function gh(env, path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": UA, ...(init.body ? { "Content-Type": "application/json" } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function publish(request, env, admin) {
  let input;
  try { input = await request.json(); } catch (e) { return json(env, { error: "The request wasn't valid JSON." }, 400); }
  const { post, errors } = validate(input || {});
  if (Object.keys(errors).length) return json(env, { error: "Please fix the highlighted fields.", fields: errors }, 422);

  const filePath = env.POSTS_PATH || "content/posts.json";
  const branch = env.GITHUB_BRANCH || "main";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { res: getRes, data: file } = await gh(env, `/contents/${filePath}?ref=${encodeURIComponent(branch)}`);
    if (getRes.status === 401 || getRes.status === 403) return json(env, { error: "The Worker's GitHub token was refused. Check that GITHUB_TOKEN is valid, not expired, and has Contents: Read and write on this repository." }, 502);
    if (getRes.status === 404) return json(env, { error: `GitHub couldn't find ${filePath} on branch ${branch}. Check GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH and POSTS_PATH.` }, 502);
    if (!getRes.ok || !file.content) return json(env, { error: `GitHub returned an error while reading the posts file (${getRes.status}).` }, 502);

    let updated, id;
    try { ({ text: updated, id } = insertPost(base64ToUtf8(file.content), { ...post })); } catch (e) { return json(env, { error: e.message }, e.status || 500); }

    const { res: putRes, data: result } = await gh(env, `/contents/${filePath}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `News: ${post.title}`,
        content: utf8ToBase64(updated),
        sha: file.sha,
        branch,
        author: { name: admin.name || admin.login, email: `${admin.id}+${admin.login}@users.noreply.github.com` }
      })
    });
    if (putRes.ok) return json(env, { ok: true, id, commitUrl: result.commit && result.commit.html_url, message: "Post published." });
    if (putRes.status === 409 || putRes.status === 422) continue; // the file changed meanwhile; read it again and retry
    return json(env, { error: `GitHub refused the change (${putRes.status}). ${result.message || ""}`.trim() }, 502);
  }
  return json(env, { error: "The posts file kept changing while publishing. Please try again." }, 409);
}

/* ---------------- router ---------------- */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
      if (pathname === "/auth/login" && request.method === "GET") return login(request, env);
      if (pathname === "/auth/callback" && request.method === "GET") return await callback(request, env);
      if (pathname === "/api/me" && request.method === "GET") {
        const admin = await requireSession(request, env);
        return admin ? json(env, { login: admin.login, name: admin.name, avatar: admin.avatar, expires: admin.exp }) : json(env, { error: "Please sign in." }, 401);
      }
      if (pathname === "/api/posts" && request.method === "POST") {
        const admin = await requireSession(request, env);
        if (!admin) return json(env, { error: "Your session has expired. Please sign in again." }, 401);
        return await publish(request, env, admin);
      }
      return json(env, { error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json(env, { error: "Something went wrong in the News Admin service." }, 500);
    }
  }
};

/* Exported for automated tests only. */
export const _test = { validate, insertPost, postObject, sign, verify, utf8ToBase64, base64ToUtf8 };
