// The "Kat.nr." field of a record (under "Din plade" in the price box) takes anything that tells
// which pressing your copy is, and this works out what was typed:
//   - a Discogs release: r4014443, [r4014443], or the link copied from Discogs' address bar. It is
//     the exact pressing, so it decides everything else,
//   - a Discogs master (all versions of an album): m123456 or its link. The pressing is then
//     picked among its versions,
//   - a catalogue number from the label or sleeve (PCS 7088, VO 6, 6360 011),
//   - a barcode (12-13 digits) or a matrix / runout code ("matrix VO 6 A//1"),
//   - words: a country ("spanish pressing", "tysk udgave"), "first pressing" / "original",
//     a year, or anything else Discogs writes about the pressing (a label name, "club", "mono").
// Several at once are fine: "Hispavox HHS 11-245 spansk".
//
// Used in three places: the price run (tools/discogs-priser.mjs via lib/nils-pris.js), the server
// when the field is saved (lib/nils-udgaver.js: a link becomes r4014443) and the page, which shows
// what it understood while you type. The page gets this very function as text
// (functions/_middleware.js), so everything it needs is inside it.
//
// Result: { text, release, master, codes, barcode, ident, country, year, first, words }
//   text: what to save (links become r4014443), release/master: Discogs numbers (0: none),
//   codes: catalogue numbers or other printed codes, barcode: digits only, ident: the codes are
//   matrix/runout or other identifiers rather than catalogue numbers, country:
//   { name: Discogs' name, da: Danish name, re: what Discogs may write } or null, year: "1972" or "",
//   first: the first pressing is wanted, promo: a promo, white label or test pressing is wanted,
//   words: other words to look for (lower case).
export function readEdition(input) {
  // [Discogs' name, Danish name, words for it (English and Danish), what Discogs writes for it]
  var COUNTRIES = [
    ["Denmark", "Danmark", "denmark danmark danish dansk danske dk", /denmark|scandinavia/i],
    ["Sweden", "Sverige", "sweden sverige swedish svensk svenske", /sweden|scandinavia/i],
    ["Norway", "Norge", "norway norge norwegian norsk norske", /norway|scandinavia/i],
    ["Finland", "Finland", "finland finnish finsk finske", /finland/i],
    ["Scandinavia", "Skandinavien", "scandinavia skandinavien scandinavian skandinavisk skandinaviske nordic nordisk nordiske norden", /scandinavia|denmark|sweden|norway|finland/i],
    ["Germany", "Tyskland", "germany tyskland german tysk tyske vesttysk vesttyske vesttyskland", /germany/i],
    ["German Democratic Republic (GDR)", "Østtyskland", "østtysk østtyske østtyskland ddr gdr", /gdr|german democratic/i],
    ["Netherlands", "Holland", "netherlands holland dutch hollandsk hollandske nederlandsk nederlandske nederlandene", /netherlands|holland|benelux/i],
    ["Belgium", "Belgien", "belgium belgien belgian belgisk belgiske", /belgium|benelux/i],
    ["UK", "England", "uk england english engelsk engelske britain british britisk britiske storbritannien gb", /\buk\b|united kingdom|england/i],
    ["US", "USA", "us usa american amerikansk amerikanske america amerika", /\bus\b|\busa\b|united states/i],
    ["France", "Frankrig", "france frankrig french fransk franske", /france/i],
    ["Italy", "Italien", "italy italien italian italiensk italienske", /italy/i],
    ["Spain", "Spanien", "spain spanien spanish spansk spanske españa espana", /spain/i],
    ["Portugal", "Portugal", "portugal portuguese portugisisk portugisiske", /portugal/i],
    ["Greece", "Grækenland", "greece grækenland greek græsk græske", /greece/i],
    ["Yugoslavia", "Jugoslavien", "yugoslavia jugoslavien yugoslavian jugoslavisk jugoslaviske", /yugoslavia/i],
    ["Europe", "Europa", "europe europa european europæisk europæiske eu", /europe|^eu$/i],
    ["Austria", "Østrig", "austria østrig austrian østrigsk østrigske", /austria/i],
    ["Switzerland", "Schweiz", "switzerland schweiz swiss schweizisk schweiziske", /switzerland/i],
    ["Ireland", "Irland", "ireland irland irish irsk irske", /ireland/i],
    ["Poland", "Polen", "poland polen polish polsk polske", /poland/i],
    ["Czechoslovakia", "Tjekkoslovakiet", "czechoslovakia tjekkoslovakiet czech tjekkisk tjekkiske", /czech/i],
    ["Hungary", "Ungarn", "hungary ungarn hungarian ungarsk ungarske", /hungary/i],
    ["USSR", "Sovjetunionen", "ussr soviet sovjet sovjetisk sovjetunionen russia rusland russian russisk russiske", /ussr|russia/i],
    ["Japan", "Japan", "japan japanese japansk japanske", /japan/i],
    ["Canada", "Canada", "canada canadian canadisk canadiske", /canada/i],
    ["Australia", "Australien", "australia australien australian australsk australske", /australia/i],
    ["New Zealand", "New Zealand", "newzealand", /new zealand/i],
    ["Brazil", "Brasilien", "brazil brasilien brazilian brasiliansk brasilianske", /brazil/i],
    ["Argentina", "Argentina", "argentina argentine argentinian argentinsk argentinske", /argentina/i],
    ["Mexico", "Mexico", "mexico mexican mexicansk mexicanske", /mexico/i],
    ["South Africa", "Sydafrika", "southafrica sydafrika sydafrikansk sydafrikanske", /south africa/i],
    ["Israel", "Israel", "israel israeli israelsk israelske", /israel/i],
    ["Turkey", "Tyrkiet", "turkey tyrkiet turkish tyrkisk tyrkiske", /turkey/i],
    ["India", "Indien", "india indien indian indisk indiske", /india/i],
  ];
  // Two words that belong together, read as one.
  var PHRASES = { "new zealand": "newzealand", "south africa": "southafrica", "united kingdom": "uk", "great britain": "uk", "united states": "us",
    "west germany": "germany", "east germany": "gdr", "first press": "first", "first pressing": "first", "1st press": "first", "1st pressing": "first",
    "første udgave": "first", "første presning": "first", "første oplag": "first", "test pressing": "test pressing", "white label": "white label",
    "club edition": "club", "180 g": "180", "180 gram": "180", "180 gr": "180", "run out": "runout" };
  var FIRST = /^(original|originalen|originale|orig|org|first|1st|første|foerste|forste|førstepresning|førsteudgave|førsteoplag|originaludgave|originaludgaven|originalpresning)$/;
  // Danish words for what Discogs writes in English.
  var SAME = { genudgivelse: "reissue", genudgave: "reissue", genoptryk: "reissue", nyoptryk: "reissue", reissued: "reissue", "re-issue": "reissue",
    remastret: "remastered", remaster: "remastered", klub: "club", bogklub: "club", musikklub: "club", pladeklub: "club",
    "180g": "180", "180gr": "180", "180gram": "180", farvet: "coloured", colored: "coloured", gatefoldcover: "gatefold", foldecover: "gatefold" };
  // Codes printed in the run-out groove or under the barcode, not the catalogue number.
  var IDENT = /^(matrix|matrice|matrixnummer|runout|run-out|stregkode|barcode|ean|upc|identifier)$/;
  // Words that say nothing about the pressing. ALWAYS: also when a number follows ("nr. 123").
  var ALWAYS = /^(kat|katnr|kat\.nr|kat\.nr\.|katno|catno|cat|nr|no|nummer|number|label|fx|evt|#)$/;
  var STOP = /^(pressing|pressings|press|pressed|presning|pressning|persning|presset|pres|udgave|udgaven|udgivelse|udgivelsen|version|versionen|edition|copy|kopi|vinyl|vinylen|lp|plade|pladen|album|record|the|a|an|of|i|in|from|fra|made|lavet|trykt|printed|er|is|it|min|mit|my|og|and|med|with|en|et|den|det|udgivet|released|måske|maybe|nok|sikkert|probably|af|by|på|on)$/;
  var out = { text: "", release: 0, master: 0, codes: [], barcode: "", ident: false, country: null, year: "", first: false, promo: false, words: [] };
  var text = String(input == null ? "" : input).replace(/\s+/g, " ").trim();
  // A link from Discogs' address bar: the release or master number is all that is needed.
  text = text.replace(/(?:https?:\/\/)?(?:www\.)?discogs\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:sell\/)?(release|master)s?\/(\d+)[^\s]*/gi, function (all, kind, id) {
    return (kind.toLowerCase() === "release" ? " r" : " m") + id + " ";
  }).replace(/\s+/g, " ").trim();
  out.text = text;
  if (!text) return out;

  var rest = text
    // "release 4014443", "Discogs-nr. 4014443", "master 123": the same as r4014443 / m123.
    .replace(/(^|\s)(release|udgivelse|discogs|discogs-nr\.?|discogsnr\.?)\s*(?:nr\.?|no\.?|#|:)?\s*(\d{3,9})(?=$|[\s,;.)])/gi, function (all, pre, w, id) { out.release = out.release || +id; return pre + " "; })
    .replace(/(^|\s)(master)\s*(?:nr\.?|no\.?|#|:)?\s*(\d{3,9})(?=$|[\s,;.)])/gi, function (all, pre, w, id) { out.master = out.master || +id; return pre + " "; })
    // r4014443 or [r4014443]: written together, the way Discogs writes it.
    .replace(/(^|[\s,;(])\[?([rm])(\d{1,9})\]?(?=$|[\s,;.)])/gi, function (all, pre, kind, id) {
      if (kind.toLowerCase() === "r") out.release = out.release || +id;
      else out.master = out.master || +id;
      return pre + " ";
    });

  var tokens = rest.split(/\s+/).filter(Boolean).map(function (t) {
    return { t: t, w: t.toLowerCase().replace(/^[.,;:!?()"'«»\[\]]+|[.,;:!?()"'«»\[\]]+$/g, ""), used: false, kind: "" };
  });
  var words = [];
  function addWord(w) { if (w && words.indexOf(w) < 0) words.push(w); }
  function countryOf(w) {
    for (var k = 0; k < COUNTRIES.length; k++) if ((" " + COUNTRIES[k][2] + " ").indexOf(" " + w + " ") >= 0) return COUNTRIES[k];
    return null;
  }
  var hasDigit = function (tok) { return !!tok && !tok.used && /\d/.test(tok.t); };
  function take(w, tok, next) {
    if (!w || ALWAYS.test(w)) { tok.used = true; return true; }
    var c = /\d/.test(w) ? null : countryOf(w);
    if (c) { if (!out.country) out.country = { name: c[0], da: c[1], re: c[3] }; tok.used = true; return true; }
    if (FIRST.test(w)) { out.first = true; tok.used = true; return true; }
    if (IDENT.test(w)) { out.ident = true; tok.used = true; return true; }
    if (SAME[w]) { addWord(SAME[w]); tok.used = true; return true; }
    if (/^(test pressing|white label|club|180|runout)$/.test(w)) { if (w === "runout") out.ident = true; else addWord(w); tok.used = true; return true; }
    // "LP 503" in capitals before a number is a catalogue number, not the word "LP".
    if (STOP.test(w) && !(hasDigit(next) && tok.t.length >= 2 && tok.t === tok.t.toUpperCase())) { tok.used = true; return true; }
    return false;
  }
  // Two words that belong together first, then one at a time.
  for (var i = 0; i + 1 < tokens.length; i++) {
    var two = PHRASES[tokens[i].w + " " + tokens[i + 1].w];
    if (two && !tokens[i].used && !tokens[i + 1].used) { take(two, tokens[i]); tokens[i + 1].used = true; }
  }
  for (var j = 0; j < tokens.length; j++) if (!tokens[j].used) take(tokens[j].w, tokens[j], tokens[j + 1]);

  // What is left: catalogue numbers and other codes (anything with a digit, with the letters in
  // front of it: "VO 6", "HHS 11-245"), a year, and words (a label name, "mono").
  var codes = [], run = [];
  function endRun() {
    if (!run.length) return;
    var t = run.map(function (x) { return x.t; }).join(" ").replace(/^[,;(«"]+|[,;)»".]+$/g, "").trim();
    if (t) codes.push(t);
    run = [];
  }
  var runHasDigit = function () { return run.some(function (x) { return /\d/.test(x.t); }); };
  var prefix = function (tok) {
    if (!tok || tok.used) return false;
    var bare = tok.t.replace(/^[(«"]+/, "");
    return /^[A-Za-zÆØÅæøå]+[-.]?$/.test(bare) && (bare.length <= 4 || (bare === bare.toUpperCase() && bare.length <= 6));
  };
  for (var n = 0; n < tokens.length; n++) {
    var tok = tokens[n], next = tokens[n + 1], after = tokens[n + 2];
    if (tok.used || /^[\/,;|&+]+$/.test(tok.t)) { endRun(); continue; }
    // A year on its own (not right after letters such as "SHVL"): the year the pressing came out.
    if (/^(19[4-9]\d|20[0-3]\d)[,;.]?$/.test(tok.t) && (!run.length || runHasDigit())) {
      endRun();
      if (!out.year) out.year = tok.t.slice(0, 4);
      continue;
    }
    if (/\d/.test(tok.t)) { run.push(tok); if (/[,;]$/.test(tok.t)) endRun(); continue; }
    // Letters just before a number belong to it (up to two: "SR LPS 4321"); others are words.
    if (prefix(tok) && (hasDigit(next) || (prefix(next) && hasDigit(after)))) {
      if (runHasDigit()) endRun();
      run.push(tok);
      continue;
    }
    // A single letter after a number: the side ("VO 6 A").
    if (runHasDigit() && /^[A-Za-z]$/.test(tok.t)) { run.push(tok); continue; }
    endRun();
    if (tok.w.length >= 2) addWord(tok.w);
  }
  endRun();

  for (var m = 0; m < codes.length; m++) {
    var code = codes[m], digits = code.replace(/[\s-]/g, "");
    // 12-13 digits: the barcode under the stripes (EAN / UPC).
    if (/^\d{12,13}$/.test(digits) && !out.barcode) { out.barcode = digits; continue; }
    if (out.codes.indexOf(code) < 0) out.codes.push(code);
  }
  out.words = words;
  out.promo = words.some(function (w) { return /^(promo|test pressing|white label)$/.test(w); });
  return out;
}
