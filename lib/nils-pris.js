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
// What is typed in the "Kat.nr." field on the page decides it (lib/nils-udgavefelt.js): a Discogs
// release number (r4014443) is that exact pressing; a catalogue number, barcode or matrix code is
// looked for; a master (m123) picks among its versions; words such as "spansk udgave" or "first
// pressing" choose among the pressings found.
//
// Discogs only answers some questions with a personal token: the GitHub secret DISCOGS_TOKEN.
// It allows 60 requests a minute; the tool waits between requests to stay under it.
import { sameArtist, albumMatch, normalize } from "./nils-lookup.js";
import { readEdition } from "./nils-udgavefelt.js";

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
const MODEL_VERSION = 2;
// Wishes looked up with an older way of finding the cheapest version (or, since 6, the typical
// price across all versions) are looked up again.
const WISH_VERSION = 6;
// How the "Kat.nr." field is read. Records with something typed in it, found an older way, are
// searched again (only those, so it is quick).
const EDITION_VERSION = 1;

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
  // And not far below the cheapest copy for sale when there are a few: in the 67 records checked,
  // the typical sale was under the cheapest copy for sale only 5 times, and never under 0.87 times it.
  if (l > 0 && n >= 3) v = Math.max(v, l * 0.9);
  return Math.max(5, v);
}

// The value in the middle when each value counts as many times as its weight: [[value, weight]].
function middle(values) {
  const list = values.filter(([v]) => v > 0).sort((a, b) => a[0] - b[0]);
  const total = list.reduce((sum, [, w]) => sum + w, 0);
  let seen = 0;
  for (const [v, w] of list) { seen += w; if (seen >= total / 2) return v; }
  return null;
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
// "master" (ml, mn: how many are for sale), and the typical price of the album across its versions
// (ma, ms: for each grade); used for the wishlist, where any pressing will do.
async function lookUp(token, want, ed = {}, all = false, prev = null, today = Math.floor(Date.now() / 864e5)) {
  let pick;
  const typed = ed.c ? { ev: EDITION_VERSION } : {};
  if (prev && prev.id) pick = { id: prev.id, u: prev.u, d: prev.d, mid: prev.mid || 0, by: prev.by, ot: prev.ot };
  else {
    pick = await findPressing(token, want, ed);
    if (!pick) return { v: VERSION, mv: MODEL_VERSION, p: null, k: "", id: 0, ...typed };
  }
  const out = { v: VERSION, mv: MODEL_VERSION, p: null, k: "", id: pick.id, u: pick.u, d: pick.d, ...typed };
  if (pick.mid) out.mid = pick.mid;
  // How the pressing was found (r: the Discogs number typed in, c: the catalogue number, b: the
  // barcode or another printed code, m: among the master's versions, h: the words typed in);
  // none: guessed. ot: the Discogs number typed in belongs to another record (artist - title).
  if (pick.by) out.by = pick.by;
  if (pick.ot) out.ot = pick.ot;
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
    // most people own are asked one by one (in kroner): the cheapest copy for sale of any of them,
    // and what a copy of each typically sells for, worked out the same way as for one pressing.
    const list = await discogs(token, `/masters/${out.mid}/versions?format=Vinyl&per_page=100`).catch(passDenied);
    const community = (v) => (v.stats && v.stats.community) || {};
    const versions = ((list && list.versions) || []).filter((v) => /vinyl|lp|12"/i.test(String(v.format || "") + " " + (v.major_formats || []).join(" ")))
      .sort((a, b) => (community(b).in_collection || 0) - (community(a).in_collection || 0)).slice(0, 12);
    let cheapest = out.l || 0, many = out.n || 0;
    // [value of a nice copy, how many own that version]: the typical price of the album is the
    // one in the middle when counted by owners, so a rare first pressing doesn't decide it.
    const values = [];
    if (out.p) values.push([estimate({ l: out.l, n: out.n, x: out.x, h: out.h, w: out.w }), (out.h || 0) + 1]);
    // Discogs' suggestion for each version changes slowly: kept for 90 days.
    const keptX = prev && prev.vx && today - (prev.vtx || 0) < 90 ? prev.vx : null;
    const vx = {};
    for (const v of versions) {
      if (v.id === pick.id) continue;
      const st = await discogs(token, `/marketplace/stats/${v.id}?curr_abbr=DKK`).catch(passDenied);
      const lp = st && st.lowest_price;
      let l = 0;
      if (lp && lp.value > 0 && KR[lp.currency]) { l = roundKr(lp.value * KR[lp.currency]); if (!cheapest || l < cheapest) cheapest = l; }
      const n = st && st.num_for_sale > 0 ? st.num_for_sale : 0;
      many += n;
      let x = keptX && v.id in keptX ? keptX[v.id] : null;
      if (x == null) {
        const sug = await discogs(token, `/marketplace/price_suggestions/${v.id}`).catch(passDenied);
        const g = sug && sug["Very Good Plus (VG+)"];
        x = g && g.value > 0 && KR[g.currency] ? roundKr(g.value * KR[g.currency]) : 0;
      }
      vx[v.id] = x;
      const h = community(v).in_collection || 0, w = community(v).in_wantlist || 0;
      const e = estimate({ l, n, x, h, w });
      if (e) values.push([e, h + 1]);
    }
    if (cheapest) { out.ml = cheapest; out.mn = many; out.mu = "https://www.discogs.com/master/" + out.mid + "?format=Vinyl"; }
    out.vx = vx;
    out.vtx = keptX ? prev.vtx : today;
    const typical = middle(values);
    if (typical) { out.ma = roundKr(typical); out.ms = byGrade(typical); }
  }
  return out;
}
const passDenied = (e) => { if (e.denied) throw e; return null; };

// The pressing of your copy, from what is typed in the "Kat.nr." field (and the year), else the
// most likely one. Gives { id, u, d, mid, h, w, by, ot } or null.
async function findPressing(token, want, ed) {
  const hint = readEdition(ed.c);
  // Words that are only the artist or the title say nothing about the pressing.
  const known = " " + normalize(want.artist + " " + want.album) + " ";
  hint.words = hint.words.filter((w) => !known.includes(" " + normalize(w) + " "));
  const look = { ...hint, year: String(ed.y || hint.year || "") };
  // A Discogs release number: exactly that pressing, whatever else is typed.
  if (hint.release) {
    const rel = await discogs(token, `/releases/${hint.release}`).catch(passDenied);
    if (rel && rel.id) {
      const pick = fromRelease(rel, want);
      // "R 6290"-like catalogue numbers: if the number is another record, it may be one.
      if (!(pick.ot && String(hint.release).length <= 5)) return pick;
      const other = await findRelease(token, want, { ...look, codes: ["R" + hint.release] });
      return other && other.by === "c" ? asPick(other) : pick;
    }
  }
  // A Discogs master: the best fitting of its vinyl versions.
  if (hint.master) {
    const found = await fromMaster(token, want, hint.master, look);
    if (found) return found;
  }
  const r = await findRelease(token, want, look);
  return r ? asPick(r) : null;
}

function asPick(r) {
  return { id: r.id, u: "https://www.discogs.com" + (r.uri || "/release/" + r.id), d: describe(r), mid: r.master_id || 0,
    h: r.community && r.community.have, w: r.community && r.community.want, by: r.by || "" };
}

// A release looked up by its number (the full answer, not a search result).
function fromRelease(rel, want) {
  const artist = (rel.artists || []).map((a) => String(a.anv || a.name || "").replace(/\*/g, "").replace(/\s*\(\d+\)/g, "").trim() + (a.join ? " " + a.join : "")).join(" ").replace(/\s+/g, " ").trim();
  const name = String(rel.artists_sort || artist).replace(/\s*\(\d+\)/g, "");
  const sameOne = (want.various ? /various/i.test(name) || sameArtist(name, want.artist) : sameArtist(name, want.artist) || sameArtist(artist, want.artist)) &&
    Math.max(...want.titles.map((t) => albumMatch(rel.title || "", t, want.name)), albumMatch(rel.title || "", want.album, want.name)) > 0;
  const lab = (rel.labels || [])[0] || {};
  const catno = lab.catno && !/^none$/i.test(lab.catno) ? lab.catno : "";
  const f = (rel.formats || [])[0] || {};
  const pick = {
    id: rel.id, u: rel.uri || "https://www.discogs.com/release/" + rel.id, mid: rel.master_id || 0,
    d: describe({ label: [String(lab.name || "").replace(/\s*\(\d+\)$/, "")], catno, format: [f.name || ""].concat(f.descriptions || []), country: rel.country, year: rel.year }),
    h: rel.community && rel.community.have, w: rel.community && rel.community.want, by: "r",
  };
  if (!sameOne) pick.ot = (name ? name + " – " : "") + (rel.title || "");
  return pick;
}

// The versions of a master, chosen among the way search results are.
async function fromMaster(token, want, id, look) {
  const list = await discogs(token, `/masters/${id}/versions?format=Vinyl&per_page=100`).catch(passDenied);
  const versions = ((list && list.versions) || []).map((v) => ({
    id: v.id, title: v.title, label: [String(v.label || "").replace(/\s*\(\d+\)$/, "")], catno: v.catno || "",
    format: String(v.format || "").split(/,\s*/).concat(v.major_formats || []), country: v.country || "", year: String(v.released || "").slice(0, 4),
    community: { have: (v.stats && v.stats.community && v.stats.community.in_collection) || 0, want: (v.stats && v.stats.community && v.stats.community.in_wantlist) || 0 },
    uri: "/release/" + v.id, master_id: id,
  }));
  const best = choose(versions, want, look, true);
  if (!best) return null;
  const pick = asPick(Object.assign(best.r, { by: best.level >= 3 ? best.code : "m" }));
  // Whose album it is: a number typed wrong is shown on the page.
  const master = await discogs(token, `/masters/${id}`).catch(passDenied);
  if (master && master.title) {
    const name = (master.artists || []).map((a) => String(a.name || "").replace(/\s*\(\d+\)/g, "")).join(" & ");
    const ok = (want.various || sameArtist(name, want.artist)) && Math.max(...want.titles.map((t) => albumMatch(master.title, t, want.name)), albumMatch(master.title, want.album, want.name)) > 0;
    if (!ok) pick.ot = (name ? name + " – " : "") + master.title;
  }
  return pick;
}

// The most likely pressing: the right artist, title and format; then what was typed in the field;
// European first; most owners. Searches until one fits everything typed in, else the best found.
async function findRelease(token, want, look) {
  const format = want.vinyl ? "Vinyl" : want.cd ? "CD" : "";
  const title = want.titles[0] || want.album;
  const name = want.various ? "" : want.name;
  const both = [name, title].filter(Boolean).join(" ");
  const tries = [];
  if (look.barcode) tries.push({ barcode: look.barcode });
  for (const c of look.codes.slice(0, 2)) {
    const cat = [{ catno: c, artist: name, format }, { catno: c, format }];
    // A matrix / runout code or another printed number is in Discogs' "barcode and other identifiers".
    if (look.ident) tries.push({ barcode: c, format }, cat[0]);
    else tries.push(...cat, { barcode: c, format });
  }
  if (look.country) {
    if (name) tries.push({ artist: name, release_title: title, format, country: look.country.name });
    tries.push({ q: both, format, country: look.country.name });
  }
  if (look.words.length) tries.push({ q: [both, ...look.words].join(" "), format });
  if (name) tries.push({ artist: name, release_title: title, format });
  tries.push({ q: both, format });
  if (format) tries.push({ q: both });
  // What a pressing has to fit: 3 = the code typed in, 2 = the country and words typed in, 1 = only the record.
  const goal = look.codes.length || look.barcode ? 3 : look.country || look.words.length ? 2 : 1;
  let best = null, fallback = null;
  const seen = new Set();
  for (const t of tries) {
    const params = { type: "release", per_page: "50", sort: "have", sort_order: "desc" };
    for (const k in t) if (t[k]) params[k] = t[k];
    const query = new URLSearchParams(params).toString();
    if (seen.has(query)) continue;
    seen.add(query);
    const data = await discogs(token, "/database/search?" + query);
    const found = choose(data.results || [], want, look);
    if (!found) continue;
    // A promo or white label is only kept if no other search finds a real release.
    if (isPromo(found.r) && found.level < 3 && !look.promo) { fallback = fallback || found; continue; }
    if (!best || found.level > best.level) best = found;
    if (best.level >= goal) break;
  }
  const pickd = best || fallback;
  if (!pickd) return null;
  pickd.r.by = pickd.level >= 3 ? pickd.code : pickd.level >= 2 ? "h" : "";
  return pickd.r;
}

const isPromo = (r) => /\b(promo|white label|test pressing)\b/i.test((r.format || []).join(" "));
// Catalogue numbers are written in many ways ("PCS 7088", "PCS-7088", "pcs7088").
const catKey = (c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");
// Does a release have the code typed in, as its catalogue number (c) or among its barcodes and
// other printed codes (b)?
function codeOf(r, look) {
  const cats = String(r.catno || "").split(/\s*[,;/]\s*|\s+\/\s+/).concat([r.catno]).map(catKey).filter(Boolean);
  const ids = (Array.isArray(r.barcode) ? r.barcode : []).map(catKey).filter(Boolean);
  for (const c of look.codes) {
    const k = catKey(c);
    if (!k) continue;
    if (cats.includes(k)) return "c";
    if (ids.some((b) => b === k || (k.length >= 4 && b.includes(k)))) return "b";
  }
  if (look.barcode && ids.some((b) => b.replace(/\D/g, "") === look.barcode || b.endsWith(look.barcode))) return "b";
  return "";
}
// The words typed in, found in what Discogs writes about the pressing (label, format, country).
function wordsOf(r, look) {
  if (!look.words.length) return 0;
  const text = " " + normalize([].concat(r.label || [], r.format || [], (r.formats || []).map((f) => f.text || ""), r.country || "").join(" ")) + " ";
  return look.words.filter((w) => text.includes(" " + normalize(w))).length;
}

// The best fitting result, as { r, level, code }: level 3 = has the code typed in, 2 = fits the
// country and words typed in, 1.5 = fits some of them, 1 = only the record. versions: the results
// are versions of one master, so the artist and title are already right.
function choose(results, want, look = { codes: [], words: [] }, versions = false) {
  const fits = [];
  for (const r of results) {
    const [artistPart, ...rest] = String(r.title || "").split(" - ");
    const found = versions ? String(r.title || "") : rest.join(" - ");
    const foundArtist = artistPart.replace(/\*/g, "").replace(/\s*\(\d+\)/g, "").trim();
    if (!versions && (!found || !(want.various ? /various/i.test(foundArtist) || sameArtist(foundArtist, want.artist) : sameArtist(foundArtist, want.artist)))) continue;
    const code = codeOf(r, look);
    // The right catalogue number may carry a slightly different title; then the artist is enough.
    const q = versions ? 2 : Math.max(...want.titles.map((t) => albumMatch(found, t, want.name)), albumMatch(found, want.album, want.name)) || (code ? 1 : 0);
    if (!q) continue;
    const formats = (r.format || []).join(" ");
    const isSingle = /\b(single|7"|maxi|ep)\b/i.test(formats);
    if (isSingle !== want.single && !(want.single && /12"/.test(formats))) continue;
    if (want.vinyl && !/vinyl/i.test(formats)) continue;
    if (want.cd && !/\bCD\b/.test(formats)) continue;
    const y = parseInt(r.year, 10) || 0;
    // A soundtrack or compilation can be by anyone, so a much later one with the same title
    // (Tron 1982 vs. Tron: Legacy 2011) is another record.
    if (want.various && !code && y && parseInt(want.year, 10) && y > parseInt(want.year, 10) + 5) continue;
    fits.push({ r, q, code, y });
  }
  if (!fits.length) return null;
  const ownYear = parseInt(look.year, 10) || 0;
  // "First pressing": the earliest year found.
  const firstYear = look.first ? Math.min(...fits.map((f) => f.y || 9999)) : 0;
  let best = null, bestScore = -Infinity;
  for (const { r, q, code, y } of fits) {
    const have = (r.community && r.community.have) || 0;
    // Promos, white labels and test pressings were never in the shops and hardly ever for sale.
    const promo = isPromo(r) && !look.promo;
    const early = y > 0 && y <= Math.max(2000, (ownYear || parseInt(want.year, 10) || 0) + 1);
    const land = look.country ? look.country.re.test(r.country || "") : false;
    const words = wordsOf(r, look);
    const oldest = !!firstYear && y === firstYear;
    const asked = (look.country ? 1 : 0) + (look.first ? 1 : 0) + look.words.length, got = (land ? 1 : 0) + (oldest ? 1 : 0) + Math.min(words, look.words.length);
    const level = code ? 3 : asked && got === asked ? 2 : got ? 1.5 : 1;
    // The code typed in first, then the country and words typed in, then the title, then the copy's
    // own year, then the first pressing (if asked for), then not a later reissue, then European
    // pressings, then the version most people own.
    const score = (code ? 1e10 : 0) + (land ? 4e9 : 0) + Math.min(words, 2) * 1.5e9 + q * 1e9 - (promo && !code ? 5e8 : 0) + (ownYear && y === ownYear ? 1e8 : 0) +
      (firstYear && y ? (y === firstYear ? 9e7 : y === firstYear + 1 ? 5e7 : 0) : 0) + (early ? 1e7 : 0) +
      (look.first ? 0 : NORDIC.test(r.country || "") ? 3e6 : NEAR.test(r.country || "") ? 2e6 : EUROPE.test(r.country || "") ? 1e6 : 0) + Math.min(have, 999999);
    if (score > bestScore) { best = { r, level, code }; bestScore = score; }
  }
  return best;
}

function describe(r) {
  const label = Array.isArray(r.label) && r.label[0] ? r.label[0] : "";
  return [label && r.catno ? label + " " + r.catno : r.catno || label, (r.format || []).filter((f) => f && !/^(vinyl|cd|album|lp)$/i.test(f)).slice(0, 2).join(", "), r.country, r.year].filter(Boolean).join(" · ");
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

export { lookUp, estimate, byGrade, roundKr, choose, readEdition, VERSION, MODEL_VERSION, WISH_VERSION, EDITION_VERSION };
