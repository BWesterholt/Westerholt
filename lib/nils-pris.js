// A guide price for each record, from Discogs. Used by functions/_middleware.js.
//
// The sheet doesn't say which pressing a record is, so the most likely one is picked, the way
// Benjamin's old script (NILP.py) did it: Discogs' search sorted by how many own each version,
// skipping later reissues (after 2000, or after the year in the sheet when that is later), and
// since most of the records are European pressings, those come first. The price is Discogs' own suggestion for a
// copy in good condition (VG+); when Discogs gives none, the lowest price for sale is used.
//
// Discogs only answers with a personal token: a secret DISCOGS_TOKEN set on the Cloudflare
// Pages project (Settings > Variables and Secrets). Discogs allows 60 requests a minute.
//
// Prices found are kept in Cloudflare KV (the ONSKELISTE store) under one key, so each record is
// looked up once and every device shows the prices at once. The page sends them in batches,
// like the found covers, so the free daily write limit isn't touched.
import { sameArtist, albumMatch, wanted } from "./nils-lookup.js";

const KEY = "priser-v1";
const MAX = 8000;
const AGENT = "westerholt.dk-pladesamling/1.0 +https://westerholt.dk";
const EUROPE = /europe|\buk\b|united kingdom|england|germany|denmark|netherlands|holland|france|sweden|norway|finland|scandinavia|italy|spain|belgium|benelux|austria|switzerland|portugal|greece|ireland|poland|czech|hungary|yugoslavia|^eu$/i;
// Rough rates to Danish kroner, for suggestions given in the seller currency of the token's owner.
const KR = { DKK: 1, EUR: 7.46, USD: 6.6, GBP: 8.6, SEK: 0.66, NOK: 0.62, CHF: 7.9, CAD: 4.7, AUD: 4.3, NZD: 3.9, JPY: 0.044, BRL: 1.2, MXN: 0.36, ZAR: 0.37 };

// GET /pris?a=&b=&y=&m=: { p: kroner or null, k: "vg"|"lav"|"", id, u: Discogs link, d: release text }
export async function findPrice(context, artist, album, year, medium) {
  const token = context.env && context.env.DISCOGS_TOKEN;
  if (!token) return { mangler: "token" };
  const cacheKey = new Request("https://lookup-cache.westerholt.dk/pris/v1?" + new URLSearchParams({ a: artist, b: album, y: year, m: medium }));
  const hit = await caches.default.match(cacheKey);
  if (hit) return hit.json();
  let result;
  try {
    result = await lookUp(token, wanted(artist, album, year, medium));
  } catch (e) {
    // A token Discogs doesn't accept: say so, instead of trying again and again.
    if (e && e.denied) return { mangler: "token", afvist: true };
    return { retry: true, travlt: e && e.busy ? true : undefined, fejl: String((e && e.message) || e).slice(0, 300) };
  }
  context.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${(result.id ? 30 : 7) * 86400}` },
  })));
  return result;
}

async function lookUp(token, want) {
  const pick = await findRelease(token, want);
  if (!pick) return { p: null, k: "", id: 0 };
  const out = { p: null, k: "", id: pick.id, u: "https://www.discogs.com" + (pick.uri || "/release/" + pick.id), d: describe(pick) };
  const suggestions = await discogs(token, `/marketplace/price_suggestions/${pick.id}`).catch((e) => { if (e.busy) throw e; return null; });
  const vg = suggestions && (suggestions["Very Good Plus (VG+)"] || suggestions["Near Mint (NM or M-)"]);
  if (vg && vg.value > 0 && KR[vg.currency]) {
    out.p = roundKr(vg.value * KR[vg.currency]);
    out.k = "vg";
    return out;
  }
  const stats = await discogs(token, `/marketplace/stats/${pick.id}?curr_abbr=DKK`).catch((e) => { if (e.busy) throw e; return null; });
  const low = stats && stats.lowest_price;
  if (low && low.value > 0 && KR[low.currency]) {
    out.p = roundKr(low.value * KR[low.currency]);
    out.k = "lav";
  }
  return out;
}

// The most likely pressing: the right artist, title and format; European first; most owners.
async function findRelease(token, want) {
  const format = want.vinyl ? "Vinyl" : want.cd ? "CD" : "";
  const title = want.titles[0] || want.album;
  const name = want.various ? "" : want.name;
  const tries = [];
  if (name) tries.push({ artist: name, release_title: title, format });
  tries.push({ q: [name, title].filter(Boolean).join(" "), format });
  if (format) tries.push({ q: [name, title].filter(Boolean).join(" ") });
  for (const t of tries) {
    const params = { type: "release", per_page: "50", sort: "have", sort_order: "desc" };
    for (const k in t) if (t[k]) params[k] = t[k];
    const data = await discogs(token, "/database/search?" + new URLSearchParams(params));
    const best = choose(data.results || [], want);
    if (best) return best;
  }
  return null;
}

function choose(results, want) {
  let best = null, bestScore = -Infinity;
  for (const r of results) {
    const [artistPart, ...rest] = String(r.title || "").split(" - ");
    const found = rest.join(" - ");
    const foundArtist = artistPart.replace(/\*/g, "").replace(/\s*\(\d+\)/g, "").trim();
    if (!found || !(want.various ? /various/i.test(foundArtist) || sameArtist(foundArtist, want.artist) : sameArtist(foundArtist, want.artist))) continue;
    const q = Math.max(...want.titles.map((t) => albumMatch(found, t, want.name)), albumMatch(found, want.album, want.name));
    if (!q) continue;
    const formats = (r.format || []).join(" ");
    const isSingle = /\b(single|7"|maxi|ep)\b/i.test(formats);
    if (isSingle !== want.single && !(want.single && /12"/.test(formats))) continue;
    if (want.vinyl && !/vinyl/i.test(formats)) continue;
    if (want.cd && !/\bCD\b/.test(formats)) continue;
    const have = (r.community && r.community.have) || 0;
    const y = parseInt(r.year, 10) || 0;
    const early = y > 0 && y <= Math.max(2000, (parseInt(want.year, 10) || 0) + 1);
    // Title match first, then not a later reissue, then European pressings, then most owners.
    const score = q * 1e8 + (early ? 1e7 : 0) + (EUROPE.test(r.country || "") ? 1e6 : 0) + Math.min(have, 999999);
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

function describe(r) {
  return [(r.format || []).filter((f) => !/^(vinyl|cd|album|lp)$/i.test(f)).slice(0, 2).join(", "), r.country, r.year].filter(Boolean).join(" · ");
}

function roundKr(v) {
  if (v < 100) return Math.max(5, Math.round(v / 5) * 5);
  if (v < 1000) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}

async function discogs(token, path) {
  for (let tries = 0; ; tries++) {
    const res = await fetch("https://api.discogs.com" + path, {
      headers: { Authorization: `Discogs token=${token}`, "User-Agent": AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 429) {
      if (tries < 1) { await new Promise((r) => setTimeout(r, 3000)); continue; }
      // What Discogs said about its limit, to tell our own pace from a limit shared with others.
      const h = (k) => res.headers.get(k) || "-";
      const e = new Error(`busy: limit ${h("x-discogs-ratelimit")}, brugt ${h("x-discogs-ratelimit-used")}, tilbage ${h("x-discogs-ratelimit-remaining")}, server ${h("server")}`);
      e.busy = true; throw e;
    }
    if (res.status === 401 || (res.status === 403 && path.startsWith("/database"))) { const e = new Error("denied"); e.denied = true; throw e; }
    if (!res.ok) throw new Error(`${res.status} ${path.split("?")[0]} ${(await res.text().catch(() => "")).slice(0, 160)}`);
    return res.json();
  }
}

// GET /priser: all prices found, as { "artist|album|year|format": { p, k, id, u, d, t } }.
// POST { priser: { key: price, … } }: remember a batch of found prices.
export async function handlePrices(context, request) {
  const store = context.env && context.env.ONSKELISTE;
  const token = !!(context.env && context.env.DISCOGS_TOKEN);
  if (request.method === "GET") {
    const priser = store ? await loadAll(store) : {};
    return reply({ priser, klar: token });
  }
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  const batch = body && body.priser;
  if (!batch || typeof batch !== "object") return reply({ fejl: "ukendt" }, 400);
  const all = await loadAll(store);
  let added = 0;
  const today = Math.floor(Date.now() / 864e5);
  for (const [key, v] of Object.entries(batch).slice(0, 300)) {
    if (key.length > 540 || key.split("|").length !== 4 || !v || typeof v !== "object") continue;
    const clean = {
      p: typeof v.p === "number" && v.p > 0 && v.p < 1e6 ? Math.round(v.p) : null,
      k: v.k === "vg" || v.k === "lav" ? v.k : "",
      id: Number.isInteger(v.id) && v.id >= 0 && v.id < 1e9 ? v.id : 0,
      t: today,
    };
    if (clean.id) {
      clean.u = /^https:\/\/www\.discogs\.com\/release\/[\w%.-]{1,250}$/.test(String(v.u || "")) ? v.u : "https://www.discogs.com/release/" + clean.id;
      clean.d = String(v.d || "").slice(0, 80);
    }
    const old = all[key];
    if (old && old.p === clean.p && old.id === clean.id && today - (old.t || 0) < 30) continue;
    if (!old && Object.keys(all).length >= MAX) continue;
    all[key] = clean;
    added++;
  }
  if (added) await store.put(KEY, JSON.stringify(all));
  return reply({ ok: true, added });
}

async function loadAll(store) {
  const all = await store.get(KEY, "json").catch(() => null);
  return all && typeof all === "object" && !Array.isArray(all) ? all : {};
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

export { choose, roundKr };
