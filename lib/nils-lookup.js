// Looks things up about the records in other music catalogues: covers, track lists,
// who played on what, and which records have a given song. Used by functions/_middleware.js.

// Finds a cover picture and the track list: first in Apple's music catalogue, then in
// MusicBrainz / Cover Art Archive. Results are kept in Cloudflare's cache for a while.
export async function findInfo(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "info/v4", { a: artist, b: album, y: year, m: medium }, async () => {
    let failed = false;
    const apple = await fromItunes(name, title, year).catch(() => { failed = true; return null; });
    let result = apple || { url: null, tracks: [] };
    if (!apple || !apple.url || !apple.tracks.length) {
      const brainz = await fromMusicBrainz(name, title, year, medium).catch(() => { failed = true; return null; });
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

// Who produced and played on each song, from MusicBrainz. Credits for the whole album
// (release level) are returned separately from the per-song credits.
export async function findCredits(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "credits/v3", { a: artist, b: album, y: year, m: medium }, async () => {
    let group;
    try {
      group = await findReleaseGroup(name, title, year);
    } catch (e) {
      return { album: [], tracks: [], retry: true };
    }
    if (!group) return { album: [], tracks: [] };
    try {
      const pick = await pickReleases(group.id, year, medium);
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

// Finds the album in MusicBrainz. The title must match (ignoring edition words such as
// "Remastered"), and the album from the year in the Excel sheet wins over reissues and
// compilations with similar names.
async function findReleaseGroup(name, title, year) {
  const query = `artist:"${name.replace(/"/g, "")}" AND releasegroup:"${title.replace(/"/g, "")}"`;
  const { "release-groups": groups = [] } = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=25&query=" + encodeURIComponent(query), true);
  const candidates = groups.filter((g) => g.score >= 60 && sameAlbum(g.title, title, name) &&
    (g["artist-credit"] || []).some((c) => similar(c.name, name) || similar((c.artist || {}).name, name)));
  return best(candidates, (g) => yearGap(g["first-release-date"], year) * 10 +
    ((g["secondary-types"] || []).includes("Compilation") ? 5 : 0) + ((g["secondary-types"] || []).includes("Live") ? 1 : 0));
}

// The release (edition) closest to the record: same year and format (vinyl or CD) first.
async function pickReleases(groupId, year, medium) {
  const { releases = [] } = await getJson(`https://musicbrainz.org/ws/2/release?fmt=json&limit=50&inc=media&release-group=${groupId}`, true);
  const wantVinyl = /^(LP|MX|Vinyl)/i.test(medium), wantCd = /^CD/i.test(medium);
  const cost = (r) => {
    const formats = (r.media || []).map((m) => m.format || "").join(" ");
    const formatGap = wantVinyl ? (/vinyl/i.test(formats) ? 0 : 3) : wantCd ? (/CD/.test(formats) ? 0 : 3) : 0;
    return yearGap(r.date, year) * 2 + formatGap + (r.status === "Official" ? 0 : 4);
  };
  return releases.slice().sort((x, y) => cost(x) - cost(y)).slice(0, 2);
}

function yearGap(date, year) {
  const found = parseInt(String(date || "").slice(0, 4), 10);
  const wanted = parseInt(year, 10);
  if (!found || !wanted) return 3;
  return Math.min(Math.abs(found - wanted), 20);
}

function best(list, cost) {
  let winner = null, lowest = Infinity;
  for (const item of list) {
    const c = cost(item);
    if (c < lowest) { lowest = c; winner = item; }
  }
  return winner;
}

// Turns MusicBrainz relationships into [{r: role, n: name, id}] entries.
function credits(relations) {
  const out = [];
  for (const rel of relations || []) {
    const role = roleOf(rel);
    if (rel.artist && role) out.push({ r: role, n: rel.artist.name, id: rel.artist.id });
  }
  return out;
}

function roleOf(rel) {
  let role = ROLES[rel.type];
  if (!role) return "";
  const attrs = plainAttributes(rel);
  if ((rel.type === "instrument" || rel.type === "vocal") && attrs.length) role = attrs.map(instrument).join(", ");
  if (rel.type === "producer" && (rel.attributes || []).includes("executive")) role = "Executive producer";
  return role;
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

async function cached(context, kind, params, work) {
  const cacheKey = new Request(`https://lookup-cache.westerholt.dk/${kind}?` + new URLSearchParams(params));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const result = await work();
  if (result.retry || result.partial) return result; // a lookup failed: don't remember the incomplete answer
  const found = result.url || (result.tracks && result.tracks.length) || result.name;
  const days = found ? 30 : 2;
  context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${days * 86400}` },
  })));
  return result;
}

async function getJson(url, brainz) {
  const headers = brainz ? { "User-Agent": "westerholt.dk-pladesamling/1.0 ( https://westerholt.dk )", Accept: "application/json" } : {};
  const get = () => fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  let response = await get();
  for (let tries = 0; brainz && response.status === 503 && tries < 2; tries++) {
    // MusicBrainz allows about one request per second; wait a moment and try again.
    await sleep(1200 + tries * 800);
    response = await get();
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fromItunes(name, title, year) {
  const { results = [] } = await getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: `${name} ${title}`, entity: "album", limit: "50", country: "DK" }));
  const candidates = results.filter((r) => similar(r.artistName, name) && sameAlbum(r.collectionName, title, name));
  // Apple often dates remasters by the reissue, so the year only decides between equal titles.
  const pickR = best(candidates, (r) => yearGap(r.releaseDate, year) + (/compilation/i.test(r.collectionType || "") ? 5 : 0) + (r.collectionExplicitness === "cleaned" ? 1 : 0));
  if (!pickR) return null;
  const best_ = { r: pickR };
  const tracks = [];
  try {
    const lookup = await getJson("https://itunes.apple.com/lookup?" + new URLSearchParams({ id: best_.r.collectionId, entity: "song", country: "DK" }));
    for (const t of lookup.results || []) {
      if (t.wrapperType === "track") tracks.push({ d: t.discNumber || 1, n: t.trackNumber, t: t.trackName, ms: t.trackTimeMillis || 0 });
    }
    tracks.sort((x, y) => x.d - y.d || x.n - y.n);
  } catch (e) {}
  const url = best_.r.artworkUrl100 ? best_.r.artworkUrl100.replace("100x100bb", "600x600bb") : null;
  return { url, kilde: url ? "Apple Music" : undefined, tracks, spor: tracks.length ? "Apple Music" : undefined };
}

async function fromMusicBrainz(name, title, year, medium) {
  const group = await findReleaseGroup(name, title, year);
  if (!group) return null;
  const art = `https://coverartarchive.org/release-group/${group.id}/front-500`;
  const [check, releases] = await Promise.all([
    fetch(art, { method: "HEAD" }).catch(() => ({ ok: false })),
    pickReleases(group.id, year, medium)
      .then((list) => list.length ? getJson(`https://musicbrainz.org/ws/2/release/${list[0].id}?fmt=json&inc=recordings`, true) : null)
      .catch(() => null),
  ]);
  const tracks = [];
  const release = releases && (releases.media || []).some((m) => (m.tracks || []).length) ? releases : null;
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
  return coreTitle(album).replace(/\s+/g, " ").trim();
}

// The title without brackets and without a note after a dash, which the sheet often has
// ("Led Zeppelin II ‑ japanese version", "Listen to this, Eddie ‑ Live Bootleg").
const DASH = /\s+[-‐‑‒–—]\s+/;
const NOTE = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|mono|stereo|digital|legacy|special|collectors?|reissue|japanese|japan|bootleg|picture|import|promo|pressing|colou?red|definitive|uk|us|german|danish|dutch|french|italian|swedish|\d+(th|st|nd|rd))\b/;
function coreTitle(text) {
  let raw = String(text || "").replace(/\(.*?\)|\[.*?\]/g, " ");
  const parts = raw.split(DASH);
  if (parts.length > 1 && NOTE.test(normalize(parts[parts.length - 1])) && normalize(parts.slice(0, -1).join(" "))) {
    raw = parts.slice(0, -1).join(" - ");
  }
  return raw;
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`´]/g, "")
    .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
}

function similar(a, b) {
  const x = normalize(a), y = normalize(b);
  return x === y || x.includes(y) || y.includes(x);
}

// Same album title, ignoring brackets, edition words ("Remastered", "Deluxe Edition" …),
// a note after a dash, the artist's name in front ("Led Zeppelin IV" = "IV") and one typo.
const EDITION = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|tracks?|mono|stereo|digital|legacy|special|collectors?|super|reissue|\d+(th|st|nd|rd))\b/g;
function bareAlbum(text, artist) {
  let x = normalize(coreTitle(text));
  x = x.replace(EDITION, " ").replace(/\s+/g, " ").trim() || x;
  const a = normalize(artist);
  if (a && x.startsWith(a + " ")) x = x.slice(a.length + 1);
  return x;
}

export function sameAlbum(found, wanted, artist) {
  const x = bareAlbum(found, artist), y = bareAlbum(wanted, artist);
  return !!x && (x === y || oneTypo(x, y));
}

// "wtih the beatles" = "with the beatles", but never "led zeppelin ii" = "led zeppelin iii" or "chicago 16" = "chicago 17".
function oneTypo(x, y) {
  const a = x.split(" "), b = y.split(" ");
  if (a.length !== b.length || a.length < 2) return false;
  const diff = a.map((w, i) => [w, b[i]]).filter(([v, w]) => v !== w);
  if (diff.length !== 1) return false;
  const [v, w] = diff[0];
  if (v.length < 4 || w.length < 4 || /\d/.test(v + w) || /^[ivxlc]+$/.test(v) || /^[ivxlc]+$/.test(w)) return false;
  return editDistance(v, w) <= 1;
}

function editDistance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
