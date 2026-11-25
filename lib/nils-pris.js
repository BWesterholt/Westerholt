// A guide price for each vinyl record, from Discogs. Used by tools/discogs-priser.mjs, which a
// GitHub Action (.github/workflows/discogs-priser.yml) runs every week: Discogs counts all of
// Cloudflare's servers as one visitor and turned the website away, but GitHub's are fine.
// The prices are saved encrypted in data/priser.js and shown by the page (lib/nils-app.js).
//
// The sheet doesn't say which pressing a record is, so the most likely one is picked, the way
// Benjamin's old script (NILP.py) did it: Discogs' search sorted by how many own each version,
// skipping later reissues (after 2000, or after the year in the sheet when that is later), and
// since most of the records were bought in Denmark, Nordic pressings come first, then German/Dutch, then the rest of Europe. The price is Discogs' own suggestion for a
// copy in good condition (VG+); when Discogs gives none, the lowest price for sale is used.
//
// Discogs only answers with a personal token: the GitHub secret DISCOGS_TOKEN. It allows
// 60 requests a minute; the tool waits between requests to stay under it.
import { sameArtist, albumMatch, wanted } from "./nils-lookup.js";

const AGENT = "westerholt.dk-pladesamling/1.0 +https://westerholt.dk";
// Records bought in Denmark are mostly Danish, Nordic or German/Dutch pressings, which cost a
// fraction of the British first pressings collectors chase; so those come first, then the rest of Europe.
const NORDIC = /denmark|scandinavia|sweden|norway|finland/i;
const NEAR = /germany|netherlands|holland|benelux|europe|^eu$/i;
const EUROPE = /\buk\b|united kingdom|england|france|italy|spain|belgium|austria|switzerland|portugal|greece|ireland|poland|czech|hungary|yugoslavia/i;
// Rough rates to Danish kroner, for suggestions given in the seller currency of the token's owner.
const KR = { DKK: 1, EUR: 7.46, USD: 6.6, GBP: 8.6, SEK: 0.66, NOK: 0.62, CHF: 7.9, CAD: 4.7, AUD: 4.3, NZD: 3.9, JPY: 0.044, BRL: 1.2, MXN: 0.36, ZAR: 0.37 };

// ed: the copy's own details, when typed in on the page: { c: catalogue number from the centre
// label, y: the year this pressing came out }. They decide the pressing before anything else.
// Discogs' grades, best first, as the short names the page uses.
const GRADES = [["M", "Mint (M)"], ["NM", "Near Mint (NM or M-)"], ["VG+", "Very Good Plus (VG+)"], ["VG", "Very Good (VG)"],
  ["G+", "Good Plus (G+)"], ["G", "Good (G)"], ["F", "Fair (F)"], ["P", "Poor (P)"]];
// The version of what is saved per record; older entries are looked up again.
const VERSION = 4;
// Wishes looked up with an older way of finding the cheapest version are looked up again.
const WISH_VERSION = 3;

// Result: p = price in good condition (VG+), s = Discogs' suggestion for each grade (kroner),
// l = lowest price for sale now, n = how many are for sale, plus the pressing (id, u, d).
// all: also the cheapest copy for sale of any version of the album (new reissues too), from its
// Discogs "master"; used for the wishlist, where you might as well buy a new pressing.
async function lookUp(token, want, ed = {}, all = false) {
  const pick = await findRelease(token, want, ed);
  if (!pick) return { v: VERSION, p: null, k: "", id: 0 };
  const out = { v: VERSION, p: null, k: "", id: pick.id, u: "https://www.discogs.com" + (pick.uri || "/release/" + pick.id), d: describe(pick) };
  const suggestions = await discogs(token, `/marketplace/price_suggestions/${pick.id}`).catch((e) => { if (e.denied) throw e; return null; });
  const grades = {};
  for (const [short, name] of GRADES) {
    const g = suggestions && suggestions[name];
    if (g && g.value > 0 && KR[g.currency]) grades[short] = roundKr(g.value * KR[g.currency]);
  }
  if (Object.keys(grades).length) out.s = grades;
  const stats = await discogs(token, `/marketplace/stats/${pick.id}?curr_abbr=DKK`).catch((e) => { if (e.denied) throw e; return null; });
  const low = stats && stats.lowest_price;
  if (low && low.value > 0 && KR[low.currency]) out.l = roundKr(low.value * KR[low.currency]);
  if (stats && stats.num_for_sale >= 0) out.n = stats.num_for_sale;
  if (all && pick.master_id) {
    // Discogs' "master" counts CDs and cassettes too, and in dollars; so instead the vinyl versions
    // most people own are asked one by one (in kroner), and the cheapest of them is kept.
    const list = await discogs(token, `/masters/${pick.master_id}/versions?format=Vinyl&per_page=100`).catch((e) => { if (e.denied) throw e; return null; });
    const owned = (v) => (v.stats && v.stats.community && v.stats.community.in_collection) || 0;
    const versions = ((list && list.versions) || []).filter((v) => /vinyl|lp|12"/i.test(String(v.format || "") + " " + (v.major_formats || []).join(" ")))
      .sort((a, b) => owned(b) - owned(a)).slice(0, 12);
    let low = out.l || 0, many = out.n || 0;
    for (const v of versions) {
      if (v.id === pick.id) continue;
      const st = await discogs(token, `/marketplace/stats/${v.id}?curr_abbr=DKK`).catch((e) => { if (e.denied) throw e; return null; });
      const lp = st && st.lowest_price;
      if (lp && lp.value > 0 && KR[lp.currency]) { const kr = roundKr(lp.value * KR[lp.currency]); if (!low || kr < low) low = kr; }
      if (st && st.num_for_sale > 0) many += st.num_for_sale;
    }
    if (low) { out.ml = low; out.mn = many; out.mu = "https://www.discogs.com/master/" + pick.master_id + "?format=Vinyl"; }
  }
  if (grades["VG+"] || grades.NM) { out.p = grades["VG+"] || grades.NM; out.k = "vg"; }
  else if (out.l) { out.p = out.l; out.k = "lav"; }
  return out;
}

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
  for (const t of tries) {
    const params = { type: "release", per_page: "50", sort: "have", sort_order: "desc" };
    for (const k in t) if (t[k]) params[k] = t[k];
    const data = await discogs(token, "/database/search?" + new URLSearchParams(params));
    const best = choose(data.results || [], want, ed);
    if (best) return best;
  }
  return null;
}

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
    const promo = /\b(promo|white label|test pressing)\b/i.test(formats);
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

// One request to Discogs, at most one every 1.1 seconds. When Discogs asks us to wait, we wait
// a minute and try again (a few times).
let last = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function discogs(token, path) {
  for (let tries = 0; ; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch("https://api.discogs.com" + path, {
      headers: { Authorization: `Discogs token=${token}`, "User-Agent": AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 && tries < 5) { await sleep(60000); continue; }
    if (res.status === 401) { const e = new Error("Discogs afviste tokenen (401)"); e.denied = true; throw e; }
    if (!res.ok) throw new Error(`${res.status} ${path.split("?")[0]}`);
    return res.json();
  }
}

export { lookUp, roundKr, VERSION, WISH_VERSION };
