// The record collection page shown on nils.westerholt.dk after login.
// Served by functions/_middleware.js, which replaces __BASE__ with the page's base path.
// Note: the page is one String.raw template, so the code inside avoids backticks and "${".
export default String.raw`<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F6F1E9">
<title>Pladesamlingen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet">
<style>
:root{--bg:#F6F1E9;--card:#FFFDF9;--ink:#221B16;--text:#4A403A;--muted:#85776C;--line:#E6DCCF;--accent:#C2532E;--accent-hi:#A8441F;--accent-soft:#F8E3D7;--cd:#2E6E8E;--cd-soft:#DDEBF2;--hover:#F1E8DC;--shadow:0 10px 30px rgba(60,40,20,.10)}
html{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font-family:"Schibsted Grotesk",Helvetica,Arial,sans-serif;font-size:16px;line-height:1.45}
button{font:inherit;color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.top{display:flex;align-items:center;gap:12px;padding:18px 0 6px}
.mark{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 22%,var(--card) 22% 27%,var(--ink) 27%);color:transparent;display:flex;align-items:center;justify-content:center;font-weight:600}
.top h1{font-size:24px;color:var(--ink);margin:0;letter-spacing:-.01em;flex:1}
.logout{color:var(--muted);font-size:14px;text-decoration:none}
.logout:hover{color:var(--ink)}
.meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;color:var(--muted);font-size:14px;padding:2px 0 14px}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:4px 10px;font-weight:600;font-size:13px}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.toolbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--line)}
.search{position:relative}
.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search input{width:100%;font:inherit;font-size:17px;padding:13px 44px 13px 44px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.search input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.search input::-webkit-search-cancel-button{-webkit-appearance:none;display:none}
.clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:none;width:32px;height:32px;border-radius:50%;cursor:pointer;color:var(--muted);font-size:20px;display:none}
.clear:hover{background:var(--hover);color:var(--ink)}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}
.seg{display:inline-flex;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:3px}
.seg button{border:0;background:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:14px;color:var(--muted)}
.seg button[aria-pressed=true]{background:var(--accent);color:#fff}
.seg .n{opacity:.7;font-size:12px;margin-left:4px}
select{font:inherit;font-size:14px;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink)}
.count{margin-left:auto;font-size:14px;color:var(--muted)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;align-items:start;padding:14px 0 40px}
.letter{position:sticky;top:var(--tb,120px);background:var(--bg);color:var(--accent);font-weight:700;font-size:15px;letter-spacing:.06em;padding:12px 12px 4px;z-index:1}
.row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:9px 12px;border-radius:9px;cursor:pointer}
.row:hover{background:var(--hover)}
.row[aria-current=true]{background:var(--accent-soft)}
.row:focus-visible{outline:2px solid var(--accent)}
.badge{font-size:11px;font-weight:700;text-align:center;border-radius:6px;padding:4px 0;background:var(--cd-soft);color:var(--cd)}
.badge.v{background:var(--accent-soft);color:var(--accent)}
.album{display:block;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{display:block;color:var(--muted);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.year{color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.tag{display:inline-block;vertical-align:2px;margin-left:6px;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;background:var(--hover);color:var(--muted)}
.tag.b{background:#3A2E5C;color:#fff}
mark{background:none;color:var(--accent);font-weight:700}
.empty{padding:40px 12px;text-align:center;color:var(--muted)}
.more{display:block;margin:12px auto;border:1px solid var(--line);background:var(--card);border-radius:9px;padding:9px 16px;cursor:pointer}
.detail{position:sticky;top:calc(var(--tb,120px) + 14px);background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:20px;max-height:calc(100vh - var(--tb,120px) - 28px);overflow:auto}
.hint{color:var(--muted);text-align:center;padding:30px 10px}
.hint .disc{margin:0 auto 14px}
.close{display:none}
.cover{position:relative;aspect-ratio:1;border-radius:10px;box-shadow:var(--shadow);overflow:hidden;background:var(--hover);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.cover img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .3s}
.cover img.ok{opacity:1}
.cover .msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:14px;text-align:center;padding:16px}
.cover .msg a{color:var(--accent)}
.disc{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 14%,var(--card) 14% 16%,#1d2327 16% 100%);box-shadow:inset 0 0 0 6px #262e33,inset 0 0 0 14px #1d2327,inset 0 0 0 15px #2c353a,inset 0 0 0 26px #1d2327,inset 0 0 0 27px #2c353a}
.spin{animation:spin 1.6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.detail h2{color:var(--ink);font-size:22px;line-height:1.2;margin:0 0 4px;letter-spacing:-.01em}
.detail .by{font-size:16px;color:var(--text);margin:0 0 12px}
.by button{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.chips span{font-size:13px;background:var(--accent-soft);color:var(--accent);font-weight:600;border:0;border-radius:999px;padding:3px 10px}
dl{display:grid;grid-template-columns:auto 1fr;gap:0;margin:0;border-top:1px solid var(--line)}
dt,dd{padding:8px 0;border-bottom:1px solid var(--line);margin:0;font-size:15px}
dt{color:var(--muted);padding-right:16px}
dd{color:var(--ink);word-break:break-word}
.same h3{font-size:14px;color:var(--muted);margin:20px 0 6px;font-weight:600}
.same button{display:flex;justify-content:space-between;gap:10px;width:100%;border:0;background:none;text-align:left;padding:7px 8px;border-radius:7px;cursor:pointer}
.same button:hover{background:var(--hover)}
.same .y{color:var(--muted);font-size:14px}
.src{font-size:12px;color:var(--muted);margin:-8px 0 14px}
.songs{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 8px 8px;margin:4px 0 12px;box-shadow:var(--shadow)}
.songs h3{margin:0 8px 6px;font-size:15px;color:var(--ink)}
.songs .note{margin:0 8px 6px;color:var(--muted);font-size:14px}
.songs .song{display:block;color:var(--accent);font-size:13px;font-weight:600;margin-top:2px}
.tracks{margin:0 0 18px}
.tracks h3{font-size:14px;color:var(--muted);margin:0 0 6px;font-weight:600;display:flex;justify-content:space-between}
.tracks ol{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.tracks li{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:7px 2px;border-bottom:1px solid var(--line);font-size:15px;color:var(--ink)}
.tracks li .no{color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}
.tracks li .len{color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.tracks li.hit{background:var(--accent-soft);border-radius:6px}
.tracks .disc-h{display:block;grid-template-columns:none;color:var(--accent);font-size:13px;font-weight:700;padding-top:12px}
.tracks .src{margin:8px 0 0}
.tracks .wait{color:var(--muted);font-size:14px;padding:8px 0}
.tracks .wait a{color:var(--accent)}
.credits{display:block;font-size:13px;color:var(--muted);line-height:1.5;margin-top:2px}
.cr{display:inline}
.cr+.cr::before{content:" · "}
.role{color:var(--muted)}
.pn{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600}
.pn:hover{text-decoration:underline}
.pn.me{background:#FFE08A;color:var(--ink);border-radius:4px;padding:0 3px}
.morecr{border:0;background:none;padding:0 0 0 6px;color:var(--muted);cursor:pointer;font-size:13px;text-decoration:underline}
.cr-more[hidden],.morecr[hidden]{display:none}
.cr-more .cr::before{content:" · "}
.albumcr{margin:0 0 16px;font-size:13px;line-height:1.6}
.albumcr h3{font-size:14px;color:var(--muted);margin:0 0 4px;font-weight:600}
.crwait{color:var(--muted);font-size:13px;margin:-2px 0 6px}
.backrec{border:0;background:none;color:var(--accent);font-weight:600;padding:0 0 12px;cursor:pointer;font-size:15px;display:block}
.ext{display:flex;justify-content:space-between;gap:10px;padding:6px 8px;font-size:15px}
.same small{color:var(--muted)}
footer{color:var(--muted);font-size:13px;padding:0 0 30px;text-align:center}
@media (max-width:1100px) and (min-width:901px){.layout{grid-template-columns:minmax(0,1fr) 340px}}
@media (max-width:900px){
  .layout{grid-template-columns:1fr}
  .detail{display:none;position:fixed;inset:0;max-height:none;border-radius:0;border:0;z-index:20;padding:16px 16px 40px}
  body.open .detail{display:block}
  body.open{overflow:hidden}
  .close{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--accent);font-weight:600;padding:4px 0 14px;cursor:pointer;font-size:16px}
  .cover{max-width:420px;margin-left:auto;margin-right:auto}
  .hint{display:none}
  .count{margin-left:0;width:100%}
  .controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .controls .seg{grid-column:1/-1;display:flex}
  .controls .seg button{flex:1}
  .controls select{width:100%}
  .count{grid-column:1/-1}
  .seg button{padding:7px 10px}
  .seg .n{display:none}
  .row{padding:11px 8px}
  .detail{box-shadow:none}
}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="mark">N</div>
    <h1>Pladesamlingen</h1>
    <a class="logout" href="__BASE__/?log-ud">Log ud</a>
  </header>
  <div class="meta"><span id="stats">Henter samlingen…</span><span class="pill" id="version" hidden></span></div>
</div>
<div class="toolbar" id="toolbar">
  <div class="wrap">
    <div class="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Søg efter kunstner, album, sang, år eller note" autocomplete="off" aria-label="Søg i samlingen">
      <button class="clear" id="clear" aria-label="Ryd søgning">×</button>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="Vis">
        <button data-t="" aria-pressed="true">Alle<span class="n" id="n-all"></span></button>
        <button data-t="Vinyl" aria-pressed="false">Vinyl<span class="n" id="n-Vinyl"></span></button>
        <button data-t="CD" aria-pressed="false">CD<span class="n" id="n-CD"></span></button>
      </div>
      <select id="ver" aria-label="Version">
        <option value="">Alle versioner</option>
        <option value="Original">Original</option>
        <option value="Kopi">Kopi</option>
        <option value="Bootleg">Bootleg</option>
      </select>
      <select id="sort" aria-label="Sortér">
        <option value="artist">Kunstner A–Å</option>
        <option value="album">Album A–Å</option>
        <option value="new">År, nyeste først</option>
        <option value="old">År, ældste først</option>
      </select>
      <span class="count" id="count"></span>
    </div>
  </div>
</div>
<div class="wrap layout">
  <div><div id="songs"></div><div id="list" role="list"></div></div>
  <aside class="detail" id="detail" aria-live="polite">
    <div class="hint"><div class="disc"></div>Klik på en plade for at se coveret og alle oplysninger fra Excel-arket.</div>
  </aside>
</div>
<footer class="wrap" id="foot"></footer>
<script>
(function () {
  var BASE = "__BASE__";
  var records = [], shown = [], kind = "", ver = "", limit = 300, current = -1, pushed = false;
  var covers = {};
  var $ = function (id) { return document.getElementById(id); };
  var collator = new Intl.Collator("da", { sensitivity: "base", numeric: true });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function num(n) { return n.toLocaleString("da-DK"); }
  function dkDate(iso) { var d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }); }
  function versionDate(v) { return v && /^\d{6}$/.test(v) ? v.slice(0, 2) + "." + v.slice(2, 4) + ".20" + v.slice(4) : v; }

  function setToolbarHeight() { document.documentElement.style.setProperty("--tb", $("toolbar").offsetHeight + "px"); }
  window.addEventListener("resize", setToolbarHeight);
  setToolbarHeight();

  fetch(BASE + "/samling.json", { credentials: "same-origin" })
    .then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (data) {
      records = data.records.map(function (r, i) {
        r.i = i;
        r.text = norm([r.a, r.b, r.y, r.m, r.t].concat(r.f.map(function (f) { return f[1]; })).join(" "));
        return r;
      });
      var counts = { Vinyl: 0, CD: 0 };
      records.forEach(function (r) { counts[r.t] = (counts[r.t] || 0) + 1; });
      $("n-all").textContent = num(records.length);
      $("n-Vinyl").textContent = num(counts.Vinyl);
      $("n-CD").textContent = num(counts.CD);
      $("stats").textContent = num(records.length) + " plader: " + num(counts.Vinyl) + " vinyl og " + num(counts.CD) + " CD";
      var v = $("version");
      v.hidden = false;
      v.textContent = "Excel-ark fra " + versionDate(data.version) + ", lagt ind " + dkDate(data.loaded);
      v.title = data.file;
      $("foot").textContent = "Data: " + data.file + " · lagt ind " + dkDate(data.loaded);
      render();
      fromHash();
    })
    .catch(function (r) {
      if (r && r.status === 401) { location.href = BASE + "/"; return; }
      $("stats").textContent = "Samlingen kunne ikke hentes. Prøv at genindlæse siden.";
    });

  function filter() {
    var words = norm($("q").value).split(/\s+/).filter(Boolean);
    var list = records.filter(function (r) {
      if (kind && r.t !== kind) return false;
      if (ver && r.v !== ver) return false;
      for (var i = 0; i < words.length; i++) if (r.text.indexOf(words[i]) < 0) return false;
      return true;
    });
    var s = $("sort").value;
    list.sort(function (a, b) {
      if (s === "album") return collator.compare(a.b, b.b) || collator.compare(a.a, b.a);
      if (s === "new" || s === "old") {
        var ya = +a.y || (s === "new" ? -1 : 9999), yb = +b.y || (s === "new" ? -1 : 9999);
        return (s === "new" ? yb - ya : ya - yb) || collator.compare(a.a, b.a);
      }
      return collator.compare(a.a, b.a) || (+a.y || 9999) - (+b.y || 9999) || collator.compare(a.b, b.b);
    });
    return { list: list, words: words };
  }

  function highlight(text, words) {
    var out = esc(text);
    if (!words.length) return out;
    var n = norm(text);
    var marks = [];
    words.forEach(function (w) { var at = n.indexOf(w); if (at >= 0 && n.length === text.length) marks.push([at, at + w.length]); });
    if (!marks.length) return out;
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var html = "", pos = 0;
    marks.forEach(function (m) { if (m[0] < pos) return; html += esc(text.slice(pos, m[0])) + "<mark>" + esc(text.slice(m[0], m[1])) + "</mark>"; pos = m[1]; });
    return html + esc(text.slice(pos));
  }

  function letterOf(r, s) {
    var t = (s === "album" ? r.b : r.a).trim().toUpperCase();
    var c = t.charAt(0);
    return /[A-ZÆØÅ]/.test(c) ? c : "#";
  }

  function render(keepLimit) {
    if (!keepLimit) limit = 300;
    var res = filter(), s = $("sort").value;
    shown = res.list;
    $("count").textContent = shown.length === records.length ? "" : "Viser " + num(shown.length) + " af " + num(records.length);
    $("clear").style.display = $("q").value ? "block" : "none";
    if (!shown.length) {
      $("list").innerHTML = '<div class="empty">Ingen plader matcher søgningen.</div>';
      return;
    }
    var html = "", last = null, grouped = s === "artist" || s === "album";
    shown.slice(0, limit).forEach(function (r) {
      if (grouped) {
        var l = letterOf(r, s);
        if (l !== last) { html += '<div class="letter">' + l + "</div>"; last = l; }
      }
      html += '<button class="row" role="listitem" data-i="' + r.i + '"' + (r.i === current ? ' aria-current="true"' : "") + ">" +
        '<span class="badge' + (r.t === "Vinyl" ? " v" : "") + '">' + esc(r.m || r.t) + "</span>" +
        '<span><span class="album">' + highlight(r.b || "Uden titel", res.words) + (r.v === "Kopi" || r.v === "Bootleg" ? ' <span class="tag ' + (r.v === "Kopi" ? "k" : "b") + '">' + r.v + "</span>" : "") + '</span><span class="artist">' + highlight(r.a, res.words) + "</span></span>" +
        '<span class="year">' + esc(r.y) + "</span></button>";
    });
    if (shown.length > limit) html += '<button class="more" id="more">Vis flere (' + num(shown.length - limit) + " tilbage)</button>";
    $("list").innerHTML = html;
  }

  var creditCache = {}, creditDone = {}, people = {};
  function load(store, path, r) {
    var key = r.a + "|" + r.b + "|" + r.y + "|" + r.m;
    if (!store[key]) {
      store[key] = fetch(BASE + path + "?" + new URLSearchParams({ a: r.a, b: r.b, y: r.y, m: r.m }), { credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (c) { if (!c || c.retry) delete store[key]; return c; })
        .catch(function () { delete store[key]; return null; });
    }
    return store[key];
  }

  function infoFor(r) {
    var box = $("cover"), list = $("tracks");
    var state = { info: undefined, credits: undefined };
    var redraw = function () { if (list.isConnected && current === r.i && state.info !== undefined) showTracks(r, list, state.info, state.credits); };
    load(creditCache, "/medvirkende", r).then(function (c) {
      if (c && !c.retry) creditDone[r.a + "|" + r.b + "|" + r.y + "|" + r.m] = c;
      state.credits = c || null; redraw();
    });
    var show = function (c) {
      if (!box.isConnected || current !== r.i) return;
      if (c && c.url) {
        var img = new Image();
        img.alt = "Cover: " + r.b;
        img.onload = function () { var m = box.querySelector(".msg"); if (m) m.remove(); img.className = "ok"; };
        img.onerror = function () { noCover(r, box); };
        img.src = c.url;
        box.appendChild(img);
        if (c.kilde) $("src").textContent = "Cover fra " + c.kilde + ". Det er fundet automatisk og kan i sjældne tilfælde være forkert.";
      } else noCover(r, box);
      state.info = c || null;
      redraw();
    };
    load(covers, "/info", r).then(show);
  }

  function bareSong(t) { return norm2(String(t).replace(/\(.*?\)|\[.*?\]/g, " ").split(" - ")[0]); }

  // Credits grouped by role: "Producer: A, B · Guitar: C".
  // The person page we came from, and the search text: their names are highlighted in the credits.
  var activePerson = "";
  function isMarked(c) {
    if (c.id === activePerson) return true;
    var q = norm2($("q").value);
    return q.length >= 3 && norm2(c.n).indexOf(q) >= 0;
  }
  function rolePriority(role) {
    var order = ["Producer", "Skrevet af", "Musik", "Tekst", "Forsanger", "Vokal", "Executive producer"];
    var k = order.indexOf(role);
    if (k >= 0) return k;
    if (/Lydtekniker|Mix|Mastering|Indspilning|Programmering/.test(role)) return 30;
    if (/Arrangement|Dirigent|Orkester/.test(role)) return 20;
    return 10; // instruments
  }

  // Credits grouped by role, most important first: "Producer: A · Skrevet af: B", the rest behind "Se mere".
  function creditLine(list, maxNames) {
    var roles = [], by = {};
    list.forEach(function (c) {
      if (!by[c.r]) { by[c.r] = []; roles.push(c.r); }
      if (!by[c.r].some(function (o) { return o.id === c.id; })) by[c.r].push(c);
    });
    roles.sort(function (a, b) { return rolePriority(a) - rolePriority(b); });
    var shown = "", hidden = "", names = 0, hiddenCount = 0, open = false;
    roles.forEach(function (role, k) {
      var part = '<span class="cr"><span class="role">' + esc(role) + ":</span> " + by[role].map(function (c) {
        people[c.id] = c.n;
        return '<button class="pn' + (isMarked(c) ? " me" : "") + '" data-person="' + esc(c.id) + '">' + esc(c.n) + "</button>";
      }).join(", ") + "</span>";
      if (k === 0 || names + by[role].length <= maxNames) { shown += part; names += by[role].length; }
      else {
        hidden += part; hiddenCount += by[role].length;
        if (by[role].some(isMarked)) open = true;
      }
    });
    if (!hidden) return shown;
    return shown + '<span class="cr-more"' + (open ? "" : " hidden") + ">" + hidden + "</span>" +
      '<button class="morecr"' + (open ? " hidden" : "") + ">Se mere (" + hiddenCount + ")</button>";
  }

  function time(ms) {
    if (!ms) return "";
    var sec = Math.round(ms / 1000);
    return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
  }

  function showTracks(r, list, c, cr) {
    var tracks = (c && c.tracks) || [];
    var crTracks = (cr && cr.tracks) || [];
    if (!tracks.length && crTracks.length) {
      tracks = crTracks.map(function (t, k) { return { d: 1, n: k + 1, t: t.t, ms: 0 }; });
      c = { spor: "MusicBrainz", tracks: tracks };
    }
    var albumCredits = cr && cr.album && cr.album.length ? '<div class="albumcr"><h3>Medvirkende på hele pladen</h3>' + creditLine(cr.album, 6) + "</div>" : "";
    var status = cr === undefined ? '<div class="crwait">Henter medvirkende…</div>' : "";
    if (!tracks.length) {
      var q = encodeURIComponent(r.a + " " + r.b + " tracklist");
      list.innerHTML = albumCredits + '<h3>Sangliste</h3><div class="wait">Sanglisten blev ikke fundet. <a href="https://www.google.com/search?q=' + q + '" target="_blank" rel="noopener">Søg efter den på Google</a></div>' + status;
      return;
    }
    var byTitle = {};
    crTracks.forEach(function (t, k) { if (t.c.length) { byTitle[bareSong(t.t)] = t.c; byTitle["#" + k] = t.c; } });
    var sameOrder = crTracks.length === tracks.length;
    var discs = tracks.reduce(function (n, t) { return Math.max(n, t.d || 1); }, 1);
    var total = tracks.reduce(function (n, t) { return n + (t.ms || 0); }, 0);
    var want = songQuery ? norm2(songQuery) : "";
    var html = "", disc = 0, withCredits = 0;
    tracks.forEach(function (t, k) {
      if (discs > 1 && t.d !== disc) { disc = t.d; html += '<li class="disc-h">Disk ' + disc + "</li>"; }
      var hit = want && norm2(t.t).indexOf(want) >= 0;
      var credits = byTitle[bareSong(t.t)] || (sameOrder ? byTitle["#" + k] : null);
      if (credits) withCredits++;
      html += "<li" + (hit ? ' class="hit"' : "") + '><span class="no">' + esc(t.n || "") + "</span><span>" + esc(t.t) +
        (credits ? '<span class="credits">' + creditLine(credits, 4) + "</span>" : "") + '</span><span class="len">' + time(t.ms) + "</span></li>";
    });
    var note = cr && !albumCredits && !withCredits ? '<p class="src">Der er ikke registreret medvirkende for denne plade.</p>' : "";
    list.innerHTML = albumCredits + "<h3><span>Sangliste (" + tracks.length + " numre" + (total ? ", " + Math.round(total / 60000) + " min" : "") + ")</span></h3>" + status + "<ol>" + html + "</ol>" +
      '<p class="src">Sanglisten er fundet automatisk hos ' + esc(c.spor || "Apple Music") + (albumCredits || withCredits ? ", medvirkende hos MusicBrainz." : ".") + " Det kan afvige fra netop din udgave.</p>" + note;
  }

  // A person's page: what they made or played on, in the collection first.
  var GENERIC = /^(greatest hits|the best of|best of|live|gold|the collection|the very best of|hits|the essential|anthology|the album|singles)$/;
  var personShown = "";
  function showPerson(id) {
    personShown = id;
    var back = current;
    var name = people[id] || "";
    $("detail").innerHTML = '<button class="close" id="close">‹ Tilbage til listen</button>' +
      '<button class="backrec" data-i="' + back + '">‹ Tilbage til ' + esc(records[back] ? records[back].b : "pladen") + "</button>" +
      "<h2>" + esc(name) + '</h2><div id="person"><div class="wait">Finder alt, ' + esc(name) + " har lavet eller medvirket på…</div></div>";
    $("detail").scrollTop = 0;
    fetch(BASE + "/person?" + new URLSearchParams({ id: id }), { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; })
      .then(function (p) {
        var box = $("person");
        if (!box) return;
        if (!p || p.retry || p.error) { box.innerHTML = '<div class="wait">Kunne ikke hente oplysninger lige nu. Prøv igen om lidt.</div>'; return; }
        var me = norm2(p.name), mine = [], seen = {};
        var add = function (r, role) { if (!seen[r.i]) { seen[r.i] = true; mine.push({ r: r, role: role }); } };
        // 1. Records by the person (or band) themselves.
        records.forEach(function (r) { if (norm2(r.a) === me || norm2(personName(r.a)) === me) add(r, "Egen plade"); });
        // 2. Records whose credits were already looked up and name this person.
        records.forEach(function (r) {
          var c = creditDone[r.a + "|" + r.b + "|" + r.y + "|" + r.m];
          if (!c) return;
          var roles = c.album.concat.apply(c.album, c.tracks.map(function (t) { return t.c; }))
            .filter(function (x) { return x.id === id; }).map(function (x) { return x.r; });
          if (roles.length) add(r, roles.filter(function (x, k) { return roles.indexOf(x) === k; }).join(", "));
        });
        // 3. Albums they are credited on: the title must match and the album's own artist must match the record's.
        var byTitle = {};
        records.forEach(function (r) {
          [bare(r.b, ""), bare(r.b, r.a)].forEach(function (t, k, both) {
            if (t && !GENERIC.test(t) && (k === 0 || t !== both[0])) (byTitle[t] = byTitle[t] || []).push(r);
          });
        });
        var candidates = p.credited.filter(function (x) { return byTitle[bare(x.t, "")]; });
        var finish = function (artists) {
          var other = [];
          p.credited.forEach(function (x) {
            var owner = artists[x.id];
            var pool = owner ? (byTitle[bare(x.t, "")] || []).concat(byTitle[bare(x.t, owner)] || []) : [];
            var hits = pool.filter(function (r, k) {
              if (pool.indexOf(r) !== k) return false;
              var a = norm2(owner), ra = norm2(r.a), rp = norm2(personName(r.a));
              return a === ra || a === rp || a.indexOf(rp) >= 0 || rp.indexOf(a) >= 0;
            });
            hits.forEach(function (r) { add(r, x.r); });
            if (!hits.length) other.push(x);
          });
          p.own.forEach(function (x) {
            var t = bare(x.t, p.name);
            if (!mine.some(function (m) { return bare(m.r.b, m.r.a) === t; })) other.push(x);
          });
          drawPerson(box, p, id, mine, other, !artists.__ok);
        };
        if (!candidates.length) { finish({ __ok: true }); return; }
        box.innerHTML = '<div class="wait">Tjekker ' + candidates.length + " mulige plader i din samling…</div>";
        var rg = candidates.filter(function (x) { return x.k === "rg"; }).map(function (x) { return x.id; });
        var rel = candidates.filter(function (x) { return x.k !== "rg"; }).map(function (x) { return x.id; });
        fetch(BASE + "/kunstnere?" + new URLSearchParams({ rg: rg.join(","), rel: rel.join(",") }), { credentials: "same-origin" })
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; })
          .then(function (res) { var a = (res && res.artists) || {}; a.__ok = !!res && !res.retry; finish(a); });
      });
  }

  function drawPerson(box, p, id, mine, other, partial) {
    if (!box.isConnected) return;
    mine.sort(function (a, b) { return (+a.r.y || 9999) - (+b.r.y || 9999); });
    other.sort(function (a, b) { return (+a.y || 9999) - (+b.y || 9999); });
    var html = p.about ? '<p class="by">' + esc(p.about) + "</p>" : "";
    html += '<div class="same"><h3>I din samling (' + mine.length + ")</h3>" + (mine.length ? mine.map(function (m) {
      return '<button data-i="' + m.r.i + '"><span>' + esc(m.r.b) + " <small>" + esc(m.r.a) + " · " + esc(m.role) + '</small></span><span class="y">' + esc(m.r.y) + "</span></button>";
    }).join("") : '<div class="wait">Ingen andre plader i samlingen fundet.</div>') + "</div>";
    if (other.length) {
      html += '<div class="same"><h3>Andre udgivelser (' + other.length + ")</h3>" + other.slice(0, 80).map(function (x) {
        return '<div class="ext"><span>' + esc(x.t) + (x.r ? " <small>" + esc(x.r) + "</small>" : "") + '</span><span class="y">' + esc(x.y) + "</span></div>";
      }).join("") + "</div>";
    }
    html += '<p class="src" style="margin-top:14px"><a href="https://musicbrainz.org/artist/' + esc(id) + '" target="_blank" rel="noopener">Se alt om ' + esc(p.name) + " på MusicBrainz</a></p>";
    if (partial) html += '<p class="src">Nogle plader kunne ikke tjekkes lige nu. Prøv igen om lidt for at se det hele.</p>';
    box.innerHTML = html;
  }

  function noCover(r, box) {
    var q = encodeURIComponent(r.a + " " + r.b + " album cover");
    box.querySelector(".msg").innerHTML = '<div class="disc"></div>Intet cover fundet<a href="https://www.google.com/search?tbm=isch&q=' + q + '" target="_blank" rel="noopener">Søg efter coveret på Google</a>';
  }

  function open(i, fromHistory) {
    var r = records[i];
    if (!r) return;
    current = i;
    var rows = document.querySelectorAll(".row[aria-current]");
    for (var k = 0; k < rows.length; k++) rows[k].removeAttribute("aria-current");
    var row = document.querySelector('.row[data-i="' + i + '"]');
    if (row) row.setAttribute("aria-current", "true");

    var chips = [r.t, r.m && r.m !== r.t ? r.m : null, r.y, r.v].filter(Boolean).map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("");
    var fields = r.f.map(function (f) { return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>"; }).join("");
    var same = records.filter(function (o) { return o.a === r.a && o !== r; })
      .sort(function (a, b) { return (+a.y || 9999) - (+b.y || 9999); });
    var sameHtml = same.length ? '<div class="same"><h3>Mere af ' + esc(r.a) + " (" + same.length + ")</h3>" +
      same.slice(0, 40).map(function (o) { return '<button data-i="' + o.i + '"><span>' + esc(o.b) + " <small>(" + esc(o.m || o.t) + ')</small></span><span class="y">' + esc(o.y) + "</span></button>"; }).join("") + "</div>" : "";

    $("detail").innerHTML =
      '<button class="close" id="close">‹ Tilbage til listen</button>' +
      '<div class="cover" id="cover"><div class="msg"><div class="disc spin"></div>Finder cover…</div></div>' +
      '<p class="src" id="src"></p>' +
      "<h2>" + esc(r.b || "Uden titel") + "</h2>" +
      '<p class="by"><button data-artist="' + esc(r.a) + '">' + esc(r.a) + "</button></p>" +
      '<div class="chips">' + chips + "</div>" +
      '<div class="tracks" id="tracks"><h3>Sangliste</h3><div class="wait">Henter sangliste…</div></div>' +
      "<dl>" + fields + "</dl>" + sameHtml;
    $("detail").scrollTop = 0;
    document.body.classList.add("open");
    infoFor(r);
    if (!fromHistory) {
      if (location.hash === "#r" + i) return;
      pushed = true;
      location.hash = "r" + i;
    }
  }

  function close() {
    document.body.classList.remove("open");
    if (pushed) { pushed = false; history.back(); }
    else if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  function fromHash() {
    var m = location.hash.match(/^#r(\d+)$/);
    if (m) open(+m[1], true);
    else { document.body.classList.remove("open"); pushed = false; }
  }
  window.addEventListener("hashchange", fromHash);

  // Song search: asks the server which albums have a song with this title, then finds them in the collection.
  var songQuery = "", songTimer, songIndex = null;
  function norm2(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
  }
  function personName(a) {
    var parts = a.split(",");
    if (parts.length === 2 && parts[1].trim().split(/\s+/).length <= 3 && !/[&+]/.test(a)) return parts[1].trim() + " " + parts[0].trim();
    return a.trim();
  }
  function cleanTitle(b) { return norm2(String(b).replace(/\(.*?\)|\[.*?\]/g, " ")); }
  // Same album, ignoring edition words ("Remastered", "Deluxe Edition" …) and the artist's name in front.
  var EXTRA = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|tracks?|mono|stereo|digital|legacy|special|collectors?|\d+(th|st|nd|rd)?)\b/g;
  function bare(t, artist) {
    var x = cleanTitle(String(t).split(" - ")[0]).replace(EXTRA, " ").replace(/\s+/g, " ").trim();
    var a = norm2(artist);
    if (a && x.indexOf(a + " ") === 0 && x.length > a.length + 1) x = x.slice(a.length + 1);
    return x;
  }
  function sameTitle(found, wanted, artist) {
    var x = bare(found, artist), y = bare(wanted, artist);
    return !!x && x === y;
  }
  function buildIndex() {
    songIndex = {};
    records.forEach(function (r) {
      [norm2(r.a), norm2(personName(r.a))].forEach(function (k) {
        (songIndex[k] = songIndex[k] || []).indexOf(r) < 0 && songIndex[k].push(r);
      });
    });
  }
  function searchSongs() {
    var q = $("q").value.trim();
    clearTimeout(songTimer);
    if (q.length < 3) { songQuery = ""; $("songs").innerHTML = ""; return; }
    songTimer = setTimeout(function () {
      $("songs").innerHTML = '<div class="songs"><p class="note">Leder efter sange, der hedder "' + esc(q) + '"…</p></div>';
      fetch(BASE + "/sang?" + new URLSearchParams({ q: q }), { credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : { hits: [] }; })
        .catch(function () { return { hits: [] }; })
        .then(function (data) {
          if ($("q").value.trim() !== q) return;
          if (!songIndex) buildIndex();
          var found = [], seen = {};
          (data.hits || []).forEach(function (h) {
            (songIndex[norm2(h.a)] || []).forEach(function (r) {
              if (seen[r.i] || (kind && r.t !== kind) || (ver && r.v !== ver) || !sameTitle(h.b, r.b, h.a)) return;
              seen[r.i] = true;
              found.push({ r: r, t: h.t });
            });
          });
          songQuery = found.length ? q : "";
          if (!found.length) {
            $("songs").innerHTML = data.retry ? '<div class="songs"><p class="note">Sangsøgningen svarer ikke lige nu. Prøv igen om lidt.</p></div>' : "";
            return;
          }
          found.sort(function (a, b) { return collator.compare(a.r.a, b.r.a) || (+a.r.y || 9999) - (+b.r.y || 9999); });
          $("songs").innerHTML = '<div class="songs"><h3>♪ Sangen "' + esc(q) + '" er på ' + found.length + (found.length === 1 ? " plade" : " plader") + "</h3>" +
            found.map(function (f) {
              var r = f.r;
              return '<button class="row" data-i="' + r.i + '"><span class="badge' + (r.t === "Vinyl" ? " v" : "") + '">' + esc(r.m || r.t) + "</span>" +
                '<span><span class="album">' + esc(r.b) + '</span><span class="artist">' + esc(r.a) + '</span><span class="song">♪ ' + esc(f.t) + "</span></span>" +
                '<span class="year">' + esc(r.y) + "</span></button>";
            }).join("") + "</div>";
        });
    }, 600);
  }

  var timer;
  $("q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { render(); }, 120); searchSongs(); });
  $("clear").addEventListener("click", function () { $("q").value = ""; render(); searchSongs(); $("q").focus(); });
  $("sort").addEventListener("change", function () { render(); });
  $("ver").addEventListener("change", function () { ver = this.value; render(); searchSongs(); });
  document.querySelector(".seg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    kind = b.getAttribute("data-t");
    var all = this.querySelectorAll("button");
    for (var k = 0; k < all.length; k++) all[k].setAttribute("aria-pressed", String(all[k] === b));
    render(); searchSongs();
  });
  $("songs").addEventListener("click", function (e) {
    var row = e.target.closest(".row");
    activePerson = "";
    if (row) open(+row.getAttribute("data-i"));
  });
  $("list").addEventListener("click", function (e) {
    if (e.target.id === "more") { limit += 500; render(true); return; }
    var row = e.target.closest(".row");
    activePerson = "";
    if (row) open(+row.getAttribute("data-i"));
  });
  $("detail").addEventListener("click", function (e) {
    if (e.target.closest("#close")) { close(); return; }
    var pn = e.target.closest("[data-person]");
    if (pn) { showPerson(pn.getAttribute("data-person")); return; }
    var more = e.target.closest(".morecr");
    if (more) { more.previousElementSibling.hidden = false; more.hidden = true; return; }
    var a = e.target.closest("[data-artist]");
    if (a) { $("q").value = a.getAttribute("data-artist"); $("sort").value = "old"; render(); searchSongs(); if (window.innerWidth <= 900) close(); window.scrollTo(0, 0); return; }
    var b = e.target.closest("[data-i]");
    if (b) {
      if (e.target.closest("#person")) activePerson = personShown;
      open(+b.getAttribute("data-i"), b.classList.contains("backrec"));
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("open")) close();
    if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
  });
})();
</script>
</body>
</html>`;
