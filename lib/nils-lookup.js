// Looks things up about the records in other music catalogues: covers, track lists,
// who played on what, and which records have a given song. Used by functions/_middleware.js.

// Finds a cover picture and the track list: first in Apple's music catalogue, then Deezer,
// then MusicBrainz / Cover Art Archive. Results are kept in Cloudflare's cache for a while.
export async function findInfo(context, artist, album, year, medium) {
  const want = wanted(artist, album, year, medium);
  return cached(context, "info/v6", { a: artist, b: album, y: year, m: medium }, async () => {
    let failed = false;
    let result = { url: null, tracks: [] };
    const fill = (found, coverFrom, tracksFrom) => {
      if (!found) return;
      if (!result.url && found.url) { result.url = found.url; result.kilde = coverFrom; }
      if (!result.tracks.length && found.tracks.length) { result.tracks = found.tracks; result.spor = tracksFrom; }
    };
    const done = () => result.url && result.tracks.length;
    fill(await fromItunes(want).catch(() => { failed = true; return null; }), "Apple Music", "Apple Music");
    if (!done()) fill(await fromDeezer(want).catch(() => { failed = true; return null; }), "Deezer", "Deezer");
    if (!done()) fill(await fromMusicBrainz(want).catch(() => { failed = true; return null; }), "Cover Art Archive", "MusicBrainz");
    if (failed && !result.url && !result.tracks.length) result.retry = true;
    return result;
  });
}

// Only the cover, for the small pictures in the list: quick, and light on the catalogues.
// Deezer first (it allows many more searches than Apple), then Apple Music, then the Cover Art
// Archive (MusicBrainz), which has many older and Danish records; no track lists.
// The full lookup above (findInfo) is still used when a record is opened.
export async function findCover(context, artist, album, year, medium) {
  const want = wanted(artist, album, year, medium);
  return cached(context, "cover/v2", { a: artist, b: album, y: year, m: medium }, async () => {
    let failed = false;
    for (const source of [fromDeezer, fromItunes, fromMusicBrainz]) {
      // MusicBrainz is often busy (about one search a second for everyone): then it just counts as
      // not found, so the list doesn't keep asking again.
      const found = await source(want, { quick: true }).catch(() => { if (source !== fromMusicBrainz) failed = true; return null; });
      if (found && found.url) return { url: found.url, tracks: [] };
    }
    return failed ? { url: null, tracks: [], retry: true } : { url: null, tracks: [] };
  });
}

// The album on Spotify, for the record shop's Spotify player: found in Deezer or Apple Music the
// same way as the cover, then turned into the Spotify album by Odesli (song.link, no key needed).
// Gives { id } (Spotify's album id) or { id: null }.
export async function findSpotify(context, artist, album, year, medium) {
  const want = wanted(artist, album, year, medium);
  return cached(context, "spotify/v1", { a: artist, b: album, y: year, m: medium }, async () => {
    let failed = false, link = "";
    const why = [];
    for (const source of [fromDeezer, fromItunes]) {
      const name = source === fromDeezer ? "deezer" : "apple";
      let broke = false;
      const found = await source(want, { quick: true }).catch((e) => { failed = broke = true; why.push(name + ":fejl " + String(e.message).split(" ")[0]); return null; });
      if (!found || !found.link) { if (!broke) why.push(name + ":ingen"); continue; }
      link = link || found.link;
      const links = await getJson("https://api.song.link/v1-alpha.1/links?" + new URLSearchParams({ url: found.link, userCountry: "DK" })).catch((e) => { failed = true; why.push("odesli:fejl " + String(e.message).split(" ")[0]); return null; });
      const spotify = links && links.linksByPlatform && links.linksByPlatform.spotify;
      const id = spotify && /open\.spotify\.com\/album\/([A-Za-z0-9]+)/.exec(spotify.url || "");
      if (id) return { id: id[1], name: "spotify" };
      if (links) why.push("odesli:ingen");
    }
    // Odesli allows only a few lookups a minute from one address; with the album's link the
    // visitor's browser can ask it itself (and MusicBrainz).
    return failed ? { id: null, retry: true, link, why: why.join(" ") } : { id: null, link, why: why.join(" ") };
  });
}

// Everything the searches need to know about one record from the sheet.
function wanted(artist, album, year, medium) {
  const names = artistNames(artist);
  album = officialTitle(names[0] || artist, album);
  const title = searchTitle(album);
  const titles = [];
  const addTitle = (t) => { t = String(t || "").replace(/\s+/g, " ").trim(); if (normalize(t) && !titles.includes(t)) titles.push(t); };
  addTitle(title.replace(DASH, " "));
  addTitle(title.split(DASH)[0]);
  // A single with both sides in the title ("Det går fremad/Tiden står stille"): the A side.
  if (/\//.test(title)) addTitle(title.split("/")[0]);
  return {
    artist, album, year, medium, names, titles,
    name: names[0] || "",
    various: isVarious(artist),
    single: /^(MX|CDM|single|EP)/i.test(String(medium || "")),
    vinyl: /^(LP|MX|vinyl)/i.test(String(medium || "")),
    cd: /^CD/i.test(String(medium || "")),
  };
}

// Albums known by a nickname that is not their real title, as [artist, nickname, real title].
const NICKNAMES = [
  ["beatles", /^(white|hvide) album(met)?$/, "The Beatles"],
  ["metallica", /^(black|sorte) album(met)?$/, "Metallica"],
  ["led zeppelin", /^(iv|4|four|four symbols|zoso|untitled|runes)$/, "Led Zeppelin IV"],
  ["led zeppelin", /^(i|1|one)$/, "Led Zeppelin"],
  ["velvet underground", /^banana album$/, "The Velvet Underground & Nico"],
  ["prince", /^love symbol( album)?$/, "Love Symbol"],
  ["weezer", /^(blue|blå) album(met)?$/, "Weezer"],
];
function officialTitle(name, album) {
  const a = normalize(name), b = normalize(coreTitle(album));
  for (const [who, nick, real] of NICKNAMES) if (a === who && nick.test(b)) return real;
  return album;
}

// How well a catalogue's album fits the record: 0 = not it, 2 = same title, 1 = same main title.
function fit(want, foundArtist, foundTitle) {
  if (!sameArtist(foundArtist, want.artist) && !(want.various && variousName(foundArtist))) return 0;
  let q = Math.max(albumMatch(foundTitle, want.album, want.name), want.name !== want.artist ? albumMatch(foundTitle, want.album, want.artist) : 0);
  if (!q && want.titles.length > 1) q = want.titles.slice(1).some((t) => t.split(" ").length >= 2 && albumMatch(foundTitle, t, want.name) === 2) ? 1 : 0;
  // A compilation or soundtrack can be by anyone, so only the exact title counts.
  if (want.various && q < 2 && !variousName(foundArtist)) return 0;
  return q;
}

// Each search term once, best first: artist + title, then other ways of writing them,
// and finally the title alone (when it is long enough not to find everything).
function searchTerms(want) {
  const terms = [];
  const add = (t) => { t = t.replace(/\s+/g, " ").trim(); if (normalize(t) && !terms.some((x) => normalize(x) === normalize(t))) terms.push(t); };
  for (const t of want.titles.slice(0, 2)) add((want.name + " " + t));
  if (want.names[1] && words(want.names[1]) !== words(want.name)) add(want.names[1] + " " + want.titles[0]);
  if (want.names[2]) add(want.names[2] + " " + want.titles[0]);
  const bare = normalize(want.titles[0]);
  if (want.name && (bare.split(" ").length >= 2 || bare.length >= 7)) add(want.titles[0]);
  return terms;
}
function words(text) {
  return normalize(text).split(" ").sort().join(" ");
}

// Who produced and played on each song, from MusicBrainz. Credits for the whole album
// (release level) are returned separately from the per-song credits.
export async function findCredits(context, artist, album, year, medium) {
  const want = wanted(artist, album, year, medium);
  return cached(context, "credits/v5", { a: artist, b: album, y: year, m: medium }, async () => {
    let group;
    try {
      group = await findReleaseGroup(want);
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

// Finds the album in MusicBrainz, the one from the year in the Excel sheet before reissues
// and compilations with similar names. Tries other ways of writing the artist, then the title alone.
async function findReleaseGroup(want) {
  const t0 = want.titles[0].replace(/"/g, "");
  const queries = want.names.slice(0, 2).map((n) => `artist:"${n.replace(/"/g, "")}" AND releasegroup:"${t0}"`);
  // No luck with the name: the title alone, if it is long enough not to find everything.
  const bare = normalize(t0);
  if (bare.split(" ").length >= 2 || bare.length >= 7 || !want.names.length) queries.push(`releasegroup:"${t0}"`);
  for (const query of queries) {
    const { "release-groups": groups = [] } = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=50&query=" + encodeURIComponent(query), true);
    const scored = groups.filter((g) => g.score >= 60).map((g) => {
      const credit = g["artist-credit"] || [];
      const whole = credit.map((c) => (c.name || "") + (c.joinphrase || "")).join("");
      const names = [whole, ...credit.map((c) => c.name), ...credit.map((c) => (c.artist || {}).name)].filter(Boolean);
      const q = Math.max(0, ...names.map((n) => fit(want, n, g.title)));
      return { g, q };
    }).filter((x) => x.q > 0);
    const types = (g) => g["secondary-types"] || [];
    const pick = best(scored, ({ g, q }) => (2 - q) * 20 + yearGap(g["first-release-date"], want.year) * 10 +
      (types(g).includes("Compilation") && !want.various ? 5 : 0) + (types(g).includes("Live") ? 1 : 0) +
      ((g["primary-type"] === "Single") !== want.single ? 15 : 0));
    if (pick) return pick.g;
  }
  return null;
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

async function fromItunes(want, opts = {}) {
  for (const term of searchTerms(want).slice(0, opts.quick ? 2 : 3)) {
    const { results = [] } = await getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term, entity: "album", limit: "50", country: "DK" }));
    const scored = results.map((r) => ({ r, q: fit(want, r.artistName, r.collectionName) })).filter((x) => x.q > 0);
    // Apple often dates remasters by the reissue, so the year only decides between equal titles.
    const pick = best(scored, ({ r, q }) => {
      const isSingle = /\s-\s(single|ep)$/i.test(r.collectionName || "") || (r.trackCount > 0 && r.trackCount <= 3);
      return (2 - q) * 20 + (isSingle !== want.single ? (want.single ? 4 : 30) : 0) + yearGap(r.releaseDate, want.year) +
        (/compilation/i.test(r.collectionType || "") && !want.various ? 5 : 0) + (r.collectionExplicitness === "cleaned" ? 1 : 0);
    });
    if (!pick) continue;
    if (!want.single && (/\s-\s(single|ep)$/i.test(pick.r.collectionName || "") || (pick.r.trackCount > 0 && pick.r.trackCount <= 3))) continue;
    const tracks = [];
    if (!opts.quick) try {
      const lookup = await getJson("https://itunes.apple.com/lookup?" + new URLSearchParams({ id: pick.r.collectionId, entity: "song", country: "DK" }));
      for (const t of lookup.results || []) {
        if (t.wrapperType === "track") tracks.push({ d: t.discNumber || 1, n: t.trackNumber, t: t.trackName, ms: t.trackTimeMillis || 0 });
      }
      tracks.sort((x, y) => x.d - y.d || x.n - y.n);
    } catch (e) {}
    const url = pick.r.artworkUrl100 ? pick.r.artworkUrl100.replace("100x100bb", "600x600bb") : null;
    return { url, tracks, link: pick.r.collectionViewUrl || "" };
  }
  return null;
}

// Deezer has many Danish and older records that Apple does not.
async function fromDeezer(want, opts = {}) {
  const queries = [];
  if (want.name) queries.push(`artist:"${want.name.replace(/"/g, "")}" album:"${want.titles[0].replace(/"/g, "")}"`);
  queries.push(...searchTerms(want).slice(0, opts.quick ? 1 : 2));
  for (const q of queries) {
    const { data = [] } = await getJson("https://api.deezer.com/search/album?" + new URLSearchParams({ q, limit: "50" }));
    const scored = data.map((r) => ({ r, q: fit(want, (r.artist || {}).name, r.title) })).filter((x) => x.q > 0);
    const pick = best(scored, ({ r, q }) => {
      const isSingle = /^(single|ep)$/i.test(r.record_type || "");
      return (2 - q) * 20 + (isSingle !== want.single ? (want.single ? 4 : 30) : 0) + (r.record_type === "compile" && !want.various ? 5 : 0);
    });
    if (!pick) continue;
    if (!want.single && /^(single|ep)$/i.test(pick.r.record_type || "")) continue;
    const tracks = [];
    if (!opts.quick) try {
      const list = await getJson(`https://api.deezer.com/album/${pick.r.id}/tracks?limit=200`);
      (list.data || []).forEach((t, i) => tracks.push({ d: t.disk_number || 1, n: t.track_position || i + 1, t: t.title, ms: (t.duration || 0) * 1000 }));
      tracks.sort((x, y) => x.d - y.d || x.n - y.n);
    } catch (e) {}
    const url = pick.r.cover_xl || pick.r.cover_big || null;
    // Deezer shows a grey note when it has no cover; that is not a cover.
    return { url: url && !/\/images\/cover\/\//.test(url) ? url : null, tracks, link: pick.r.id ? "https://www.deezer.com/album/" + pick.r.id : "" };
  }
  return null;
}

async function fromMusicBrainz(want, opts = {}) {
  const group = await findReleaseGroup(want);
  if (!group) return null;
  const art = `https://coverartarchive.org/release-group/${group.id}/front-500`;
  if (opts.quick) {
    const check = await fetch(art, { method: "HEAD" }).catch(() => ({ ok: false }));
    return { url: check.ok ? art : null, tracks: [] };
  }
  const [check, releases] = await Promise.all([
    fetch(art, { method: "HEAD" }).catch(() => ({ ok: false })),
    pickReleases(group.id, want.year, want.medium)
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

function searchTitle(album) {
  return coreTitle(album).replace(/\s+/g, " ").trim();
}

// The names to search for, best first. The sheet writes names in many ways:
// "Adams, Bryan" -> "Bryan Adams", "Band, The" -> "The Band", "Lee, Alvin ‑ Ten Years Later",
// "TRB (Tom Robinson Band)", "Plant, Robert & Krauss, Alison", "Coverdale/Page", and group names
// with commas such as "Emerson, Lake & Palmer" (kept as they are too).
// Compilations ("ÅÅ …") and soundtracks ("Evita ‑ Musical") give no name.
function artistNames(artist) {
  const raw = String(artist || "").replace(/\bw\//gi, " & ").replace(/\s+/g, " ").trim().replace(/^(.*?),\s*the$/i, "The $1");
  if (!raw || isVarious(raw)) return [];
  const out = [];
  const add = (n) => { n = String(n || "").replace(/\s+/g, " ").replace(/^[\s,&+\/-]+|[\s,&+\/-]+$/g, "").trim(); if (normalize(n) && !out.includes(n)) out.push(n); };
  const bits = raw.split(DASH);
  let main = bits[0];
  const inner = /\(([^)]*)\)?/.exec(main);
  main = main.replace(/\(.*$/, "").trim();
  add(flip(main));
  add(main.replace(/,/g, ""));
  if (inner && !/^(feat|ft|with|w)\b/i.test(inner[1].trim())) add(inner[1]);
  if (bits.length > 1 && !/^(featuring|feat|ft)\b/i.test(bits[1].trim())) add(flip(bits[1]));
  if (bits.length > 1 && /^(featuring|feat|ft)\b/i.test(bits[1].trim())) add(flip(bits[1].replace(/^\S+\s*/, "")));
  return out;
}

function searchArtist(artist) {
  return artistNames(artist)[0] || "";
}

// "Adams, Bryan" -> "Bryan Adams", "Bowie, David & Mick Jagger" -> "David Bowie & Mick Jagger",
// "Plant, Robert & Krauss, Alison" -> "Robert Plant & Alison Krauss".
function flip(name) {
  const join = /\s*(&|\+|\bog\b|\band\b|\/)\s*/i;
  const parts = String(name || "").split(join);
  const flipOne = (p) => {
    const m = /^([^,]+),\s*([^,]+)$/.exec(p.trim());
    if (!m) return p.trim();
    if (/^the$/i.test(m[2].trim())) return "The " + m[1].trim();
    return m[2].trim().split(/\s+/).length <= 3 ? m[2].trim() + " " + m[1].trim() : p.trim();
  };
  // A comma list of surnames ("Crosby, Stills, Nash & Young") is a group name: leave it.
  if ((parts[0].match(/,/g) || []).length > 1) return String(name).trim();
  return parts.map((p, i) => (i % 2 ? (p.trim() === "/" ? "/" : " " + p.trim() + " ") : flipOne(p))).join("").replace(/\s+/g, " ").trim();
}

// Compilations and soundtracks: any artist will do, as long as the title matches exactly.
function isVarious(artist) {
  return /^(åå|aa\b|various|diverse|div\.)/i.test(String(artist || "").trim()) || /\b(soundtrack|musical|filmmusik)\b/i.test(String(artist || ""));
}
function variousName(name) {
  return /\b(various|diverse|blandede|v\.?a\.?|soundtrack|original|cast|orchestra|ost)\b/i.test(String(name || ""));
}

// Is the artist found in a catalogue the artist from the sheet? Whole words only, so "Queen"
// is not "Queensrÿche" and "The Band" is not "Tom Robinson Band"; but "Bruce Springsteen" is
// "Bruce Springsteen & The E Street Band" and "Plant, Robert & Krauss, Alison" is
// "Robert Plant & Alison Krauss".
const ARTIST_STOP = /^(the|and|og|with|w|med|feat|featuring|ft|his|her|their|und|et)$/;
function artistWords(text) {
  return normalize(String(text || "").replace(/^the\s+/i, "")).replace(/\bn\b/g, "and").split(" ").filter((w) => w && !ARTIST_STOP.test(w));
}
function sameWord(a, b) {
  return a === b || (a.length >= 6 && b.length >= 6 && editDistance(a, b) <= 1);
}
function within(small, big) {
  return small.length > 0 && small.every((w) => big.some((v) => sameWord(w, v)));
}
function sameArtist(found, artist) {
  const f = artistWords(found);
  if (!f.length) return false;
  if (isVarious(artist)) return true;
  const all = artistWords(String(artist || "").replace(/[(),\/]/g, " "));
  if (within(f, all)) return true;
  // "Bruce Springsteen" = "Bruce Springsteen & The E Street Band": the found name starts with it.
  return artistNames(artist).some((n) => { const w = artistWords(n); return w.length > 0 && w.length < f.length && w.every((x, i) => sameWord(x, f[i])); });
}
function similar(a, b) {
  return sameArtist(a, b) || sameArtist(b, a);
}

// The title without brackets and without a note after a dash, which the sheet often has
// ("Led Zeppelin II ‑ japanese version", "Listen to this, Eddie ‑ Live Bootleg", "Smiler (Box)").
const DASH = /\s+[-‐‑‒–—]\s+/;
const NOTE = /\b(remaster(ed)?|deluxe|edition|ed|expanded|anniversary|version|bonus|mono|stereo|digital|legacy|special|spec|collectors?|reissue|japanese|japan|bootleg|picture|import|promo|pressing|print|prt|colou?red|definitive|uk|us|german|danish|dutch|french|italian|swedish|spanish|yugosl|live|concert|recorded|soundtrack|box(ed)?|set|comp|compilation|audiophile|limited|single|ep|maxi|\d+ ?cd|\d+(th|st|nd|rd))\b/;
function coreTitle(text) {
  let raw = String(text || "").replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[(\[].*$/, " ");
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

// Same album title, ignoring brackets, edition words ("Remastered", "Deluxe Edition" …),
// a note after a dash, the artist's name in front ("Led Zeppelin IV" = "IV") and one typo.
const EDITION = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|tracks?|mono|stereo|digital|legacy|special|collectors?|super|reissue|single|ep|\d+(th|st|nd|rd))\b/g;
function bareAlbum(text, artist) {
  let x = normalize(coreTitle(text)).replace(/\bn\b/g, "and").replace(/\bvolume\b/g, "vol");
  x = x.replace(EDITION, " ").replace(/\s+/g, " ").trim() || x;
  const a = normalize(artist);
  if (a && x.startsWith(a + " ")) x = x.slice(a.length + 1);
  else if (a && x.endsWith(" " + a) && x.length > a.length + 4) x = x.slice(0, -a.length - 1).replace(/\s+(of|by)$/, " $1");
  return x;
}

// The part before a subtitle: "Chronicle ‑ The 20 greatest hits" and "Chronicle: The 20 Greatest
// Hits" both give "chronicle". Generic beginnings ("The Best of ‑ …", "Live: …") give nothing.
const GENERIC = /^(very )?(best|best of|greatest|greatest hits|hits|live|collection|gold|anthology|essential|essentials|singles|the best|vol|part)$/;
function headTitle(text, artist) {
  const raw = String(text || "").replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[(\[].*$/, " ");
  const parts = raw.split(/\s*:\s+|\s+[-‐‑‒–—]\s*|\s*[‐‑‒–—]\s+/);
  if (parts.length < 2) return "";
  const x = bareAlbum(parts[0], artist);
  return x.length >= 4 && !GENERIC.test(x) ? x : "";
}

// 2: the same title. 1: the same main title, but one of them has a subtitle (weaker). 0: different.
function albumMatch(found, wanted, artist) {
  const x = bareAlbum(found, artist), y = bareAlbum(wanted, artist);
  if (!x || !y) return 0;
  if (x === y || oneTypo(x, y)) return 2;
  const hx = headTitle(found, artist), hy = headTitle(wanted, artist);
  if ((hx && (hx === y || hx === hy)) || (hy && hy === x)) return 1;
  // "Get Yer Ya-Ya's Out! The Rolling Stones in Concert" starts with "Get Yer Ya-Ya's Out".
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  if (short.split(" ").length >= 3 && !/^(very )?(best of|greatest hits|live)/.test(short) && long.startsWith(short + " ")) return 1;
  return 0;
}
function sameAlbum(found, wanted, artist) {
  return albumMatch(found, wanted, artist) > 0;
}

// "wtih the beatles" = "with the beatles", but never "led zeppelin ii" = "led zeppelin iii" or "chicago 16" = "chicago 17".
function oneTypo(x, y) {
  const a = x.split(" "), b = y.split(" ");
  if (a.length !== b.length) return false;
  const diff = a.map((w, i) => [w, b[i]]).filter(([v, w]) => v !== w);
  if (diff.length !== 1) return false;
  const [v, w] = diff[0];
  if (v.length < (a.length < 2 ? 6 : 4) || w.length < (a.length < 2 ? 6 : 4) || /\d/.test(v + w) || /^[ivxlc]+$/.test(v) || /^[ivxlc]+$/.test(w)) return false;
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

// For tools/test-matching.mjs.
export { sameAlbum, albumMatch, sameArtist, artistNames, wanted, normalize };
