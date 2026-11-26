// What each vinyl record is worth, from Discogs. Used by tools/discogs-priser.mjs, which a GitHub
// Action (.github/workflows/discogs-priser.yml) runs: Discogs counts all of Cloudflare's servers as
// one visitor and turned the website away, but GitHub's are fine. The values are saved encrypted in
// data/priser.js (and sent to the website while a run is going) and shown by lib/nils-app.js.
//
// The value: what a copy in nice condition (VG+) typically sells for on Discogs, i.e. the "Median"
// in the Statistics box on the release's page. Discogs' API doesn't give that number, so it is
// estimated from what the API does give, with a formula fitted on 67 of the records (2026-11-26):
//   - the cheapest copy for sale now and how many are for sale,
//   - Discogs' own price suggestion, which turned out to follow the HIGHEST price the record ever
//     sold for (about 0.7 times it), not the typical one. On its own it was 2-3 times too high
//     (Beck, Bogert & Appice: suggestion 1,500 kr., typical sale 89 kr.), but it still tells
//     a rare record from a common one,
//   - how many want the record compared with how many have it.
// Tested record by record against the real medians (leaving each one out of the fit), it lands
// within 20% for half the records and within 50% for 4 out of 5; the suggestion alone was within
// 50% for only 1 in 5.
//
// The pressing: the sheet doesn't say which one a record is, so the most likely one is picked the
// way Benjamin's old script (NILP.py) did it: Discogs' search sorted by how many own each version,
// skipping later reissues, Nordic pressings first, then German/Dutch, then the rest of Europe.
// A catalogue number typed in on the page decides it.
//
// Discogs only answers some questions with a personal token: the GitHub secret DISCOGS_TOKEN.
// It allows 60 requests a minute; the tool waits between requests to stay under it.
import { sameArtist, albumMatch } from "./nils-lookup.js";

const AGENT = "westerholt.dk-pladesamling/2.0 +https://westerholt.dk";
// Records bought in Denmark are mostly Danish, Nordic or German/Dutch pressings, which cost a
// fraction of the British first pressings collectors chase; so those come first, then the rest of Europe.
const NORDIC = /denmark|scandinavia|sweden|norway|finland/i;
const NEAR = /germany|netherlands|holland|benelux|europe|^eu$/i;
const EUROPE = /\buk\b|united kingdom|england|france|italy|spain|belgium|austria|switzerland|portugal|greece|ireland|poland|czech|hungary|yugoslavia/i;
// Rough rates to Danish kroner, for suggestions given in the seller currency of the token's owner.
const KR = { DKK: 1, EUR: 7.46, USD: 6.6, GBP: 8.6, SEK: 0.66, NOK: 0.62, CHF: 7.9, CAD: 4.7, AUD: 4.3, NZD: 3.9, JPY: 0.044, BRL: 1.2, MXN: 0.36, ZAR: 0.37 };

// How a pressing is found. Saved entries found an older way are searched again.
const VERSION = 4;
// How the value is worked out. Saved entries worked out an older way get new market figures.
const MODEL_VERSION = 1;
// Wishes looked up with an older way of finding the cheapest version are looked up again.
const WISH_VERSION = 5;

// The fitted formula (natural logarithms; kroner). Three versions, for what Discogs could answer:
//   full: 1, ln(cheapest for sale), ln(number for sale + 1), ln(suggestion VG+), ln((want+1)/(have+1))
//   none for sale: 1, ln(suggestion), ln(want/have)
//   no suggestion: 1, ln(cheapest), ln(number for sale + 1), ln(want/have)
const MODEL = {
  full: [1.267, 0.464, 0.147, 0.277, 0.252],
  noSale: [2.69, 0.496, 0.455],
  noSuggestion: [1.812, 0.618, 0.323, 0.385],
};
// The condition: what a copy in each grade fetches compared with a nice one (VG+), the same steps
// Discogs uses for its suggestions.
const GRADES = [["M", "Mint (M)", 1.5], ["NM", "Near Mint (NM or M-)", 1.33], ["VG+", "Very Good Plus (VG+)", 1], ["VG", "Very Good (VG)", 0.7],
  ["G+", "Good Plus (G+)", 0.39], ["G", "Good (G)", 0.23], ["F", "Fair (F)", 0.15], ["P", "Poor (P)", 0.08]];

// The value of a nice copy (VG+) in kroner, from the market figures; null when there are none.
// l: cheapest for sale, n: number for sale, x: Discogs' suggestion for VG+, h/w: have/want.
function estimate({ l, n, x, h, w }) {
  const demand = Math.log(((w || 0) + 1) / ((h || 0) + 1));
  const low = Math.log(Math.max(l || 0, 3)), many = Math.log((n || 0) + 1);
  let ln;
  if (l > 0 && x > 0) ln = MODEL.full[0] + MODEL.full[1] * low + MODEL.full[2] * many + MODEL.full[3] * Math.log(x) + MODEL.full[4] * demand;
  else if (x > 0) ln = MODEL.noSale[0] + MODEL.noSale[1] * Math.log(x) + MODEL.noSale[2] * demand;
  else if (l > 0) ln = MODEL.noSuggestion[0] + MODEL.noSuggestion[1] * low + MODEL.noSuggestion[2] * many + MODEL.noSuggestion[3] * demand;
  else return null;
  let v = Math.exp(ln);
  // Never above what the record has sold for at its best (the suggestion is about 0.7 times that).
  if (x > 0) v = Math.min(v, x * 1.3);
  return Math.max(5, v);
}

// The value for each grade, rounded the way prices are written.
function byGrade(v) {
  const out = {};
  for (const [short, , step] of GRADES) out[short] = roundKr(v * step);
  return out;
}

// One record. Result: p = value of a nice copy (VG+), s = value for each grade, l = cheapest for
// sale now, n = how many are for sale, h/w = how many have/want it, x = Discogs' suggestion (VG+),
// plus the pressing (id, u, d, mid). prev: the saved entry, when its pressing can be kept; then only
// the market figures are asked again (1 request), and the slow-changing ones every 90 days.
// all: also the cheapest copy for sale of any vinyl version of the album, from its Discogs
// "master"; used for the wishlist, where you might as well buy a new pressing.
async function lookUp(token, want, ed = {}, all = false, prev = null, today = Math.floor(Date.now() / 864e5)) {
  let pick;
  if (prev && prev.id) pick = { id: prev.id, u: prev.u, d: prev.d, mid: prev.mid || 0 };
  else {
    const r = await findRelease(token, want, ed);
    if (!r) return { v: VERSION, mv: MODEL_VERSION, p: null, k: "", id: 0 };
    pick = { id: r.id, u: "https://www.discogs.com" + (r.uri || "/release/" + r.id), d: describe(r), mid: r.master_id || 0,
      h: r.community && r.community.have, w: r.community && r.community.want };
  }
  const out = { v: VERSION, mv: MODEL_VERSION, p: null, k: "", id: pick.id, u: pick.u, d: pick.d };
  if (pick.mid) out.mid = pick.mid;
  // Have, want and the suggestion change slowly: kept for 90 days. An entry from before the new
  // formula has the suggestion (in s) but not have/want.
  const slowFresh = prev && today - (prev.tx || prev.t || 0) < 90;
  let h = pick.h, w = pick.w, x = null, tx = today, askSuggestion = true;
  if (slowFresh) {
    if (prev.h != null) { h = prev.h; w = prev.w; }
    if (prev.mv) { x = prev.x || null; askSuggestion = false; }
    else if (prev.s && prev.s["VG+"]) { x = prev.s["VG+"]; askSuggestion = false; }
    if (prev.h != null && !askSuggestion) tx = prev.tx || prev.t;
  }
  if (h == null) {
    const rel = await discogs(token, `/releases/${pick.id}`).catch(passDenied);
    if (rel && rel.community) { h = rel.community.have || 0; w = rel.community.want || 0; }
    if (rel && rel.master_id && !out.mid) out.mid = rel.master_id;
  }
  if (askSuggestion) {
    const sug = await discogs(token, `/marketplace/price_suggestions/${pick.id}`).catch(passDenied);
    const g = sug && (sug["Very Good Plus (VG+)"] || null);
    if (g && g.value > 0 && KR[g.currency]) x = roundKr(g.value * KR[g.currency]);
  }
  const stats = await discogs(token, `/marketplace/stats/${pick.id}?curr_abbr=DKK`).catch(passDenied);
  const low = stats && stats.lowest_price;
  if (low && low.value > 0 && KR[low.currency]) out.l = roundKr(low.value * KR[low.currency]);
  out.n = stats && stats.num_for_sale >= 0 ? stats.num_for_sale : 0;
  if (h != null) { out.h = h; out.w = w || 0; }
  if (x) out.x = x;
  out.tx = tx;
  const v = estimate({ l: out.l, n: out.n, x, h, w });
  if (v) { out.p = roundKr(v); out.s = byGrade(v); out.k = "v"; }
  if (all && out.mid) {
    // Discogs' "master" counts CDs and cassettes too, and in dollars; so instead the vinyl versions
    // most people own are asked one by one (in kroner), and the cheapest of them is kept.
    const list = await discogs(token, `/masters/${out.mid}/versions?format=Vinyl&per_page=100`).catch(passDenied);
    const owned = (v) => (v.stats && v.stats.community && v.stats.community.in_collection) || 0;
    const versions = ((list && list.versions) || []).filter((v) => /vinyl|lp|12"/i.test(String(v.format || "") + " " + (v.major_formats || []).join(" ")))
      .sort((a, b) => owned(b) - owned(a)).slice(0, 12);
    let cheapest = out.l || 0, many = out.n || 0;
    for (const v of versions) {
      if (v.id === pick.id) continue;
      const st = await discogs(token, `/marketplace/stats/${v.id}?curr_abbr=DKK`).catch(passDenied);
      const lp = st && st.lowest_price;
      if (lp && lp.value > 0 && KR[lp.currency]) { const kr = roundKr(lp.value * KR[lp.currency]); if (!cheapest || kr < cheapest) cheapest = kr; }
      if (st && st.num_for_sale > 0) many += st.num_for_sale;
    }
    if (cheapest) { out.ml = cheapest; out.mn = many; out.mu = "https://www.discogs.com/master/" + out.mid + "?format=Vinyl"; }
  }
  return out;
}
const passDenied = (e) => { if (e.denied) throw e; return null; };

// The most likely pressing: the right artist, title and format; European first; most owners.
async function findRelease(token, want, ed) {
  const format = want.vinyl ? "Vinyl" : want.cd ? "CD" : "";
  const title = want.titles[0] || want.album;
  const name = want.various ? "" : want.name;
  const tries = [];
  if (ed.c) {
    tries.push({ catno: ed.c, artist: name, format });
    tries.push({ catno: ed.c, format });
  }
  if (name) tries.push({ artist: name, release_title: title, format });
  tries.push({ q: [name, title].filter(Boolean).join(" "), format });
  if (format) tries.push({ q: [name, title].filter(Boolean).join(" ") });
  let fallback = null;
  for (const t of tries) {
    const params = { type: "release", per_page: "50", sort: "have", sort_order: "desc" };
    for (const k in t) if (t[k]) params[k] = t[k];
    const data = await discogs(token, "/database/search?" + new URLSearchParams(params));
    const best = choose(data.results || [], want, ed);
    // A promo or white label is only kept if no other search finds a real release.
    if (best && isPromo(best) && !(ed.c && catKey(best.catno) === catKey(ed.c))) { fallback = fallback || best; continue; }
    if (best) return best;
  }
  return fallback;
}

const isPromo = (r) => /\b(promo|white label|test pressing)\b/i.test((r.format || []).join(" "));
// Catalogue numbers are written in many ways ("PCS 7088", "PCS-7088", "pcs7088").
const catKey = (c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function choose(results, want, ed = {}) {
  let best = null, bestScore = -Infinity;
  for (const r of results) {
    const [artistPart, ...rest] = String(r.title || "").split(" - ");
    const found = rest.join(" - ");
    const foundArtist = artistPart.replace(/\*/g, "").replace(/\s*\(\d+\)/g, "").trim();
    if (!found || !(want.various ? /various/i.test(foundArtist) || sameArtist(foundArtist, want.artist) : sameArtist(foundArtist, want.artist))) continue;
    const cat = ed.c && catKey(r.catno) && catKey(r.catno) === catKey(ed.c);
    // The right catalogue number may carry a slightly different title; then the artist is enough.
    const q = Math.max(...want.titles.map((t) => albumMatch(found, t, want.name)), albumMatch(found, want.album, want.name)) || (cat ? 1 : 0);
    if (!q) continue;
    const formats = (r.format || []).join(" ");
    const isSingle = /\b(single|7"|maxi|ep)\b/i.test(formats);
    if (isSingle !== want.single && !(want.single && /12"/.test(formats))) continue;
    if (want.vinyl && !/vinyl/i.test(formats)) continue;
    if (want.cd && !/\bCD\b/.test(formats)) continue;
    const have = (r.community && r.community.have) || 0;
    // Promos, white labels and test pressings were never in the shops and hardly ever for sale.
    const promo = isPromo(r);
    const y = parseInt(r.year, 10) || 0;
    const ownYear = parseInt(ed.y, 10) || 0;
    const early = y > 0 && y <= Math.max(2000, (ownYear || parseInt(want.year, 10) || 0) + 1);
    // A soundtrack or compilation can be by anyone, so a much later one with the same title
    // (Tron 1982 vs. Tron: Legacy 2011) is another record.
    if (want.various && !cat && y && parseInt(want.year, 10) && y > parseInt(want.year, 10) + 5) continue;
    // The catalogue number first, then the title, then the copy's own year, then not a later
    // reissue, then European pressings, then the version most people own.
    const score = (cat ? 1e10 : 0) + q * 1e9 - (promo && !cat ? 5e8 : 0) + (ownYear && y === ownYear ? 1e8 : 0) + (early ? 1e7 : 0) +
      (NORDIC.test(r.country || "") ? 3e6 : NEAR.test(r.country || "") ? 2e6 : EUROPE.test(r.country || "") ? 1e6 : 0) + Math.min(have, 999999);
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

function describe(r) {
  const label = Array.isArray(r.label) && r.label[0] ? r.label[0] : "";
  return [label && r.catno ? label + " " + r.catno : r.catno, (r.format || []).filter((f) => !/^(vinyl|cd|album|lp)$/i.test(f)).slice(0, 2).join(", "), r.country, r.year].filter(Boolean).join(" · ");
}

function roundKr(v) {
  if (v < 100) return Math.max(5, Math.round(v / 5) * 5);
  if (v < 1000) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}

// One request to Discogs, at most one every 1.05 seconds (Discogs allows 60 a minute). When
// Discogs asks us to wait, we wait a minute and try again (a few times).
let last = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function discogs(token, path) {
  for (let tries = 0; ; tries++) {
    const wait = last + 1050 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch("https://api.discogs.com" + path, {
      headers: { Authorization: `Discogs token=${token}`, "User-Agent": AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    }).catch((e) => ({ ok: false, status: 0, error: e }));
    if ((res.status === 429 || res.status >= 500 || res.status === 0) && tries < 5) { await sleep(res.status === 429 ? 60000 : 5000); continue; }
    if (res.status === 401) { const e = new Error("Discogs afviste tokenen (401)"); e.denied = true; throw e; }
    if (!res.ok) throw new Error(`${res.status} ${path.split("?")[0]}`);
    return res.json();
  }
}

export { lookUp, estimate, byGrade, roundKr, VERSION, MODEL_VERSION, WISH_VERSION };
