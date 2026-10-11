// nils.westerholt.dk: a password-protected record collection served by this function.
// The password is checked here on the server, so it never appears in the page source.
// Only its SHA-256 hash is stored, because this repository is public.
// To change the password: replace PASSWORD_SHA256 with the SHA-256 hex of the new one,
// and re-run tools/opdater-samling.py with the new password (the collection is encrypted with it).
import samling from "../data/samling.js";
import appPage from "../lib/nils-app.js";

const PASSWORD_SHA256 = "629ff2a8c079344a59c0a0f604cbf9ff9cf2bf6273638ec85a31171c7c784724";
const COOKIE = "nils_adgang";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  // Never serve the function source, the encrypted data or the tools as static files.
  if (/^\/(functions|data|lib|tools)(\/|$)/.test(url.pathname)) {
    return new Response("Ikke fundet", { status: 404 });
  }

  // The Nils page lives on nils.* hosts. On Cloudflare preview links (*.pages.dev)
  // it can also be reached at /nils, so it can be tried before it goes live.
  const isNilsHost = host.startsWith("nils.");
  const isPreview = host.endsWith(".pages.dev") && (url.pathname === "/nils" || url.pathname.startsWith("/nils/"));
  if (!isNilsHost && !isPreview) {
    return context.next();
  }
  const base = isNilsHost ? "/" : "/nils";
  const prefix = isNilsHost ? "" : "/nils";
  const path = url.pathname.slice(prefix.length) || "/";

  if (request.method === "POST") {
    const form = await request.formData();
    const password = String(form.get("kode") || "");
    if (await isCorrect(password)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: base,
          "Set-Cookie": `${COOKIE}=${encodeURIComponent(password)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return page(loginPage(base, true), 401);
  }

  if (url.searchParams.has("log-ud")) {
    return new Response(null, {
      status: 303,
      headers: { Location: base, "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` },
    });
  }

  const password = readCookie(request, COOKIE);
  if (!(await isCorrect(password))) {
    if (path !== "/") return json({ fejl: "Ikke logget ind" }, 401);
    return page(loginPage(base, false));
  }

  if (path === "/samling.json") {
    return new Response(await decryptCollection(password), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-cache", "X-Robots-Tag": "noindex" },
    });
  }
  if (path === "/info") {
    return json(await findInfo(context, url.searchParams.get("a") || "", url.searchParams.get("b") || ""));
  }
  if (path === "/medvirkende") {
    return json(await findCredits(context, url.searchParams.get("a") || "", url.searchParams.get("b") || ""));
  }
  if (path === "/person") {
    return json(await findPerson(context, url.searchParams.get("id") || ""));
  }
  if (path === "/sang") {
    return json(await findSong(context, url.searchParams.get("q") || ""));
  }
  if (path !== "/") {
    return Response.redirect(new URL(base, url), 302);
  }
  return page(appPage.replaceAll("__BASE__", prefix));
}

// The collection is gzipped JSON, encrypted with AES-GCM using a key made from the password.
async function decryptCollection(password) {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nils-samling:" + password));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(samling.iv) }, key, fromBase64(samling.data));
  return new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

// Finds a cover picture and the track list: first in Apple's music catalogue, then in
// MusicBrainz / Cover Art Archive. Results are kept in Cloudflare's cache for a while.
async function findInfo(context, artist, album) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "info/v2", { a: artist, b: album }, async () => {
    let failed = false;
    const apple = await fromItunes(name, title).catch(() => { failed = true; return null; });
    let result = apple || { url: null, tracks: [] };
    if (!apple || !apple.url || !apple.tracks.length) {
      const brainz = await fromMusicBrainz(name, title).catch(() => { failed = true; return null; });
      if (brainz) {
        result = {
          url: result.url || brainz.url,
          kilde: result.url ? result.kilde : brainz.url && "Cover Art Archive",
          tracks: result.tracks.length ? result.tracks : brainz.tracks,
          spor: result.tracks.length ? result.spor : brainz.tracks.length ? "MusicBrainz" : undefined,
        };
      }
    }
    if (failed && !result.url && !result.tracks.length) result.retry = true;
    return result;
  });
}

// Finds records with a song of this title, in Apple's catalogue and MusicBrainz.
// Returns artist/album/track hits; the page matches them against the collection itself.
async function findSong(context, query) {
  const q = query.trim().slice(0, 80);
  if (q.length < 3) return { hits: [] };
  return cached(context, "song/v1", { q: q.toLowerCase() }, async () => {
    const wanted = normalize(q);
    const hits = [];
    const [apple, brainz] = await Promise.all([
      getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "song", attribute: "songTerm", limit: "200", country: "DK" })).catch(() => ({ failed: true })),
      getJson("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=100&query=" + encodeURIComponent(`recording:"${q.replace(/"/g, "")}"`), true).catch(() => ({ failed: true })),
    ]);
    for (const r of (apple && apple.results) || []) {
      if (normalize(r.trackName).includes(wanted)) hits.push({ a: r.artistName, b: r.collectionName, t: r.trackName });
    }
    for (const r of (brainz && brainz.recordings) || []) {
      if (!normalize(r.title).includes(wanted)) continue;
      const by = (r["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
      for (const release of r.releases || []) hits.push({ a: by, b: release.title, t: r.title });
    }
    const seen = new Set();
    if (apple.failed && brainz.failed) return { hits: [], retry: true };
    return { hits: hits.filter((h) => { const k = normalize(h.a) + "|" + normalize(h.b) + "|" + normalize(h.t); return !seen.has(k) && seen.add(k); }) };
  });
}

// Who produced and played on each song, from MusicBrainz. Credits for the whole album
// (release level) are returned separately from the per-song credits.
async function findCredits(context, artist, album) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "credits/v1", { a: artist, b: album }, async () => {
    const query = `artist:"${name.replace(/"/g, "")}" AND releasegroup:"${title.replace(/"/g, "")}"`;
    let groups;
    try {
      ({ "release-groups": groups = [] } = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=5&query=" + encodeURIComponent(query), true));
    } catch (e) {
      return { album: [], tracks: [], retry: true };
    }
    const group = groups.find((g) => g.score >= 85 && titleScore(g.title, title) > 0);
    if (!group) return { album: [], tracks: [] };
    try {
      const { releases = [] } = await getJson(`https://musicbrainz.org/ws/2/release?fmt=json&limit=25&release-group=${group.id}`, true);
      // Prefer an official release; the first one listed is usually the original.
      const pick = releases.filter((r) => r.status === "Official").concat(releases).slice(0, 2);
      let best = null;
      for (const r of pick) {
        const inc = "recordings+artist-credits+artist-rels+recording-level-rels+work-rels+work-level-rels";
        const release = await getJson(`https://musicbrainz.org/ws/2/release/${r.id}?fmt=json&inc=${inc}`, true);
        const result = creditsOf(release);
        const count = result.album.length + result.tracks.reduce((n, t) => n + t.c.length, 0);
        if (!best || count > best.count) best = { count, result };
        if (count >= 5) break;
      }
      return best ? { ...best.result, mb: group.id } : { album: [], tracks: [] };
    } catch (e) {
      return { album: [], tracks: [], retry: true };
    }
  });
}

function creditsOf(release) {
  const album = credits(release.relations);
  const tracks = [];
  for (const medium of release.media || []) {
    for (const t of medium.tracks || []) {
      const rec = t.recording || {};
      const c = credits(rec.relations);
      for (const rel of rec.relations || []) {
        if (rel.work) c.push(...credits(rel.work.relations));
      }
      tracks.push({ t: t.title, c: merge(c) });
    }
  }
  return { album: merge(album), tracks };
}

// Turns MusicBrainz relationships into [{r: role, n: name, id}] entries.
function credits(relations) {
  const out = [];
  for (const rel of relations || []) {
    if (!rel.artist) continue;
    const attrs = plainAttributes(rel);
    let role = ROLES[rel.type];
    if (!role) continue;
    if ((rel.type === "instrument" || rel.type === "vocal") && attrs.length) role = attrs.map(instrument).join(", ");
    if (rel.type === "producer" && (rel.attributes || []).includes("executive")) role = "Executive producer";
    out.push({ r: role, n: rel.artist.name, id: rel.artist.id });
  }
  return out;
}

function plainAttributes(rel) {
  return (rel.attributes || []).filter((a) => !["additional", "guest", "solo", "co", "executive", "assistant", "lead"].includes(a));
}

function merge(list) {
  const seen = new Set();
  return list.filter((c) => { const k = c.r + "|" + c.id; return !seen.has(k) && seen.add(k); });
}

const ROLES = {
  producer: "Producer", instrument: "Spiller", vocal: "Vokal", performer: "Medvirkende", "performing orchestra": "Orkester",
  conductor: "Dirigent", engineer: "Lydtekniker", "recording": "Indspilning", mix: "Mix", mastering: "Mastering",
  arranger: "Arrangement", "instrument arranger": "Arrangement", "vocal arranger": "Arrangement", programming: "Programmering",
  composer: "Musik", lyricist: "Tekst", writer: "Skrevet af",
};

const INSTRUMENTS = {
  guitar: "Guitar", "electric guitar": "El-guitar", "acoustic guitar": "Akustisk guitar", "bass guitar": "Bas", bass: "Bas",
  "drums (drum set)": "Trommer", drums: "Trommer", "drum set": "Trommer", piano: "Klaver", keyboard: "Keyboard", organ: "Orgel",
  "lead vocals": "Forsanger", "background vocals": "Kor", "backing vocals": "Kor", vocals: "Vokal", percussion: "Percussion",
  harmonica: "Mundharmonika", saxophone: "Saxofon", trumpet: "Trompet", violin: "Violin", strings: "Strygere", synthesizer: "Synthesizer",
};

function instrument(name) {
  return INSTRUMENTS[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

// Everything a person has released or is credited on, from MusicBrainz.
async function findPerson(context, id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "ukendt" };
  return cached(context, "person/v1", { id }, async () => {
    try {
      const [artist, own] = await Promise.all([
        getJson(`https://musicbrainz.org/ws/2/artist/${id}?fmt=json&inc=release-group-rels+release-rels`, true),
        getJson(`https://musicbrainz.org/ws/2/release-group?fmt=json&limit=100&artist=${id}&type=album|ep`, true),
      ]);
      const credited = [];
      for (const rel of artist.relations || []) {
        const target = rel["release-group"] || rel.release;
        if (!target || !ROLES[rel.type]) continue;
        const role = rel.type === "instrument" || rel.type === "vocal" ? plainAttributes(rel).map(instrument).join(", ") || ROLES[rel.type] : ROLES[rel.type];
        credited.push({ t: target.title, y: (target["first-release-date"] || target.date || "").slice(0, 4), r: role });
      }
      return {
        name: artist.name,
        about: artist.disambiguation || "",
        own: (own["release-groups"] || []).map((g) => ({ t: g.title, y: (g["first-release-date"] || "").slice(0, 4) })),
        credited: credited.filter((c, i) => credited.findIndex((o) => o.t === c.t && o.r === c.r) === i),
      };
    } catch (e) {
      return { retry: true };
    }
  });
}

async function cached(context, kind, params, work) {
  const cacheKey = new Request(`https://lookup-cache.westerholt.dk/${kind}?` + new URLSearchParams(params));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const result = await work();
  if (result.retry) return result; // a lookup failed: don't remember the empty answer
  const found = result.url || (result.tracks && result.tracks.length) || (result.hits && result.hits.length) || result.name;
  const days = found ? 30 : 2;
  context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${days * 86400}` },
  })));
  return result;
}

async function getJson(url, brainz) {
  const headers = brainz ? { "User-Agent": "westerholt.dk-pladesamling/1.0 ( https://westerholt.dk )", Accept: "application/json" } : {};
  let response = await fetch(url, { headers });
  if (brainz && response.status === 503) {
    // MusicBrainz allows about one request per second; wait a moment and try once more.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function fromItunes(name, title) {
  const { results = [] } = await getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: `${name} ${title}`, entity: "album", limit: "15", country: "DK" }));
  let best = null;
  for (const r of results) {
    if (!similar(r.artistName, name)) continue;
    const score = titleScore(r.collectionName, title);
    if (score > 0 && (!best || score > best.score)) best = { score, r };
  }
  if (!best) return null;
  const tracks = [];
  try {
    const lookup = await getJson("https://itunes.apple.com/lookup?" + new URLSearchParams({ id: best.r.collectionId, entity: "song", country: "DK" }));
    for (const t of lookup.results || []) {
      if (t.wrapperType === "track") tracks.push({ d: t.discNumber || 1, n: t.trackNumber, t: t.trackName, ms: t.trackTimeMillis || 0 });
    }
    tracks.sort((x, y) => x.d - y.d || x.n - y.n);
  } catch (e) {}
  const url = best.r.artworkUrl100 ? best.r.artworkUrl100.replace("100x100bb", "600x600bb") : null;
  return { url, kilde: url ? "Apple Music" : undefined, tracks, spor: tracks.length ? "Apple Music" : undefined };
}

async function fromMusicBrainz(name, title) {
  const query = `artist:"${name.replace(/"/g, "")}" AND releasegroup:"${title.replace(/"/g, "")}"`;
  const { "release-groups": groups = [] } = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=5&query=" + encodeURIComponent(query), true);
  const group = groups.find((g) => g.score >= 85 && titleScore(g.title, title) > 0);
  if (!group) return null;
  const art = `https://coverartarchive.org/release-group/${group.id}/front-500`;
  const [check, releases] = await Promise.all([
    fetch(art, { method: "HEAD" }).catch(() => ({ ok: false })),
    getJson(`https://musicbrainz.org/ws/2/release?fmt=json&limit=10&inc=recordings&release-group=${group.id}`, true).catch(() => null),
  ]);
  const tracks = [];
  const release = ((releases && releases.releases) || []).find((r) => (r.media || []).some((m) => (m.tracks || []).length));
  if (release) {
    release.media.forEach((m, i) => (m.tracks || []).forEach((t) => tracks.push({ d: m.position || i + 1, n: t.position, t: t.title, ms: t.length || 0 })));
  }
  return { url: check.ok ? art : null, tracks };
}

// "Adams, Bryan" -> "Bryan Adams" (but leave names like "Crosby, Stills & Nash" alone).
function searchArtist(artist) {
  const parts = artist.split(",");
  if (parts.length === 2 && parts[1].trim().split(/\s+/).length <= 3 && !/[&+]/.test(artist)) {
    return `${parts[1].trim()} ${parts[0].trim()}`;
  }
  return artist.trim();
}

function searchTitle(album) {
  return album.replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
}

function similar(a, b) {
  const x = normalize(a), y = normalize(b);
  return x === y || x.includes(y) || y.includes(x);
}

// 3 = same title, 2 = one contains the other (e.g. "Remastered" editions), 1 = most words shared, 0 = no match.
function titleScore(found, wanted) {
  const x = normalize(found.replace(/\(.*?\)|\[.*?\]/g, " ")), y = normalize(wanted);
  if (!x || !y) return 0;
  if (x === y) return 3;
  if (x.includes(y) || y.includes(x)) return 2;
  const words = y.split(" ");
  const shared = words.filter((w) => x.split(" ").includes(w)).length;
  return shared / words.length >= 0.75 ? 1 : 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

async function isCorrect(password) {
  if (!password) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === PASSWORD_SHA256;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function page(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

const STYLE = `
:root{--bg:#F6F1E9;--card:#FFFDF9;--ink:#221B16;--text:#4A403A;--muted:#85776C;--line:#E6DCCF;--accent:#C2532E;--accent-hi:#A8441F;--error:#A33A2E}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font-family:"Schibsted Grotesk",Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:16px}
.card{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:32px 28px;text-align:center}
.mark{width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 22%,var(--card) 22% 27%,var(--ink) 27%);color:transparent;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px}
h1{color:var(--ink);font-size:22px;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 22px;color:var(--muted);line-height:1.5}
input{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);margin-bottom:12px}
input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
button,.btn{display:block;width:100%;font:inherit;font-weight:600;font-size:16px;padding:12px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer;text-decoration:none}
button:hover,.btn:hover{background:var(--accent-hi)}
.error{color:var(--error);font-size:14px;margin:-4px 0 12px}
`;

function shell(title, inner) {
  return `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
<main class="card">
${inner}
</main>
</body>
</html>`;
}

function loginPage(base, wrong) {
  return shell("Nils", `
<div class="mark"></div>
<h1>Pladesamlingen</h1>
<p>Skriv koden for at komme ind.</p>
<form method="post" action="${base}">
  <input type="password" name="kode" placeholder="Kode" autocomplete="current-password" autofocus required aria-label="Kode">
  ${wrong ? '<div class="error">Forkert kode. Prøv igen.</div>' : ""}
  <button type="submit">Log ind</button>
</form>`);
}
