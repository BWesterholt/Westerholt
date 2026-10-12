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
<style>
:root{
  --bg:#F5F1EA;--card:#FFFFFF;--ink:#1D1D1F;--text:#3A3A3C;--muted:rgba(60,60,67,.62);--faint:rgba(60,60,67,.32);
  --sep:rgba(60,60,67,.16);--fill:rgba(118,118,128,.12);--fill2:rgba(118,118,128,.2);--press:rgba(60,40,20,.07);
  --accent:#C2532E;--accent-soft:#F8E6DC;--cd:#2F6F93;--cd-soft:#E2EEF5;--hover:rgba(60,40,20,.045);
  --bar:rgba(245,241,234,.72);--shadow:0 1px 2px rgba(40,25,10,.06),0 8px 28px rgba(40,25,10,.08);
  --shadow-lg:0 2px 6px rgba(40,25,10,.08),0 24px 60px rgba(40,25,10,.16);
  --ease:cubic-bezier(.22,1,.36,1);
}
html{color-scheme:light;-webkit-text-size-adjust:100%}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:17px;line-height:1.47;letter-spacing:-.01em;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;letter-spacing:inherit}
.wrap{max-width:1200px;margin:0 auto;padding:0 20px}

/* Header: large title, like an iOS navigation bar */
.top{display:flex;align-items:center;gap:12px;padding:28px 0 4px}
.mark{width:40px;height:40px;flex:none;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 21%,#fff 21% 25%,#1D1D1F 25%);box-shadow:inset 0 0 0 7px #2a2a2c,inset 0 0 0 8px #1D1D1F,inset 0 0 0 12px #2a2a2c,inset 0 0 0 13px #1D1D1F;color:transparent;font-size:0}
.top h1{font-size:34px;line-height:1.05;letter-spacing:-.025em;font-weight:700;color:var(--ink);margin:0;flex:1}
.logout{color:var(--accent);font-size:17px;text-decoration:none;padding:6px 2px}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;color:var(--muted);font-size:15px;padding:4px 0 16px 52px}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:3px 10px;font-weight:600;font-size:13px;letter-spacing:0}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}

/* Toolbar: translucent material that the list scrolls under */
.toolbar{position:sticky;top:0;z-index:5;background:var(--bar);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);padding:10px 0 12px;box-shadow:0 1px 0 transparent;transition:box-shadow .2s}
.toolbar.scrolled{box-shadow:0 1px 0 var(--sep)}
.search{position:relative}
.search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search input{width:100%;font:inherit;font-size:17px;height:40px;padding:0 40px 0 36px;border:0;border-radius:11px;background:var(--fill);color:var(--ink);outline:none;transition:box-shadow .2s var(--ease),background .2s}
.search input::placeholder{color:var(--muted)}
.search input:focus{background:#fff;box-shadow:0 0 0 3px rgba(194,83,46,.28)}
.search input::-webkit-search-cancel-button{-webkit-appearance:none;display:none}
.clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;width:22px;height:22px;border-radius:50%;cursor:pointer;background:var(--faint);color:#fff;font-size:15px;line-height:22px;padding:0;display:none}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}
.seg{position:relative;display:inline-flex;background:var(--fill);border-radius:9px;padding:2px;isolation:isolate}
.seg .thumb{position:absolute;z-index:-1;top:2px;bottom:2px;left:0;border-radius:7px;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.12),0 3px 1px rgba(0,0,0,.04);transition:transform .35s var(--ease),width .35s var(--ease)}
.seg button{border:0;background:none;padding:5px 16px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:500;color:var(--ink);transition:opacity .15s}
.seg button[aria-pressed=false]:active{opacity:.55;transition:none}
.seg button[aria-pressed=true]{font-weight:600}
.seg .n{color:var(--muted);font-size:12px;margin-left:5px;font-weight:500}
select{font:inherit;font-size:14px;font-weight:500;padding:6px 30px 6px 12px;border:0;border-radius:9px;background:var(--fill) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%233C3C43' stroke-opacity='.6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 11px center;color:var(--ink);-webkit-appearance:none;appearance:none;cursor:pointer}
select:focus-visible{outline:3px solid rgba(194,83,46,.35);outline-offset:1px}
.count{margin-left:auto;font-size:14px;color:var(--muted)}

/* List: inset grouped sections */
.layout{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:28px;align-items:start;padding:8px 0 48px}
.group{margin-bottom:22px}
.letter{position:sticky;top:var(--tb,120px);z-index:1;color:var(--muted);font-weight:600;font-size:13px;letter-spacing:.02em;text-transform:uppercase;padding:8px 16px 6px;background:linear-gradient(var(--bg) 70%,rgba(245,241,234,0))}
.card{background:var(--card);border-radius:14px;box-shadow:0 1px 2px rgba(40,25,10,.04);overflow:hidden}
.row{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) auto 10px;gap:12px;align-items:center;width:100%;min-height:60px;text-align:left;border:0;background:var(--card);padding:9px 14px 9px 14px;cursor:pointer;transition:background .25s}
.row::after{content:"";position:absolute;left:68px;right:0;bottom:0;height:1px;background:var(--sep);transform:scaleY(.5);transform-origin:bottom}
.row:last-child::after{display:none}
.row::before{content:"";grid-column:4;grid-row:1;justify-self:end;width:7px;height:7px;border-right:2px solid var(--faint);border-top:2px solid var(--faint);transform:rotate(45deg);order:9}
.row:hover{background:#FCFAF7}
.row:active{background:var(--press);transition:none}
.row[aria-current=true]{background:var(--accent-soft)}
.row:focus-visible{outline:3px solid rgba(194,83,46,.35);outline-offset:-3px}
.badge{font-size:11px;font-weight:700;letter-spacing:.02em;text-align:center;border-radius:7px;padding:5px 0;background:var(--cd-soft);color:var(--cd)}
.badge.v{background:var(--accent-soft);color:var(--accent)}
.album{display:block;color:var(--ink);font-weight:600;font-size:17px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{display:block;color:var(--muted);font-size:15px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.year{color:var(--muted);font-size:15px;font-variant-numeric:tabular-nums}
.tag{display:inline-block;vertical-align:2px;margin-left:6px;font-size:11px;font-weight:600;letter-spacing:0;border-radius:999px;padding:1px 8px;background:var(--fill);color:var(--muted)}
.tag.b{background:#3A2E5C;color:#fff}
mark{background:none;color:var(--accent);font-weight:700}
.empty{padding:48px 16px;text-align:center;color:var(--muted)}
.more{display:block;margin:4px auto 0;border:0;background:var(--fill);color:var(--accent);font-weight:600;border-radius:999px;padding:9px 18px;cursor:pointer;font-size:15px}
.more:active{transform:scale(.97);transition:transform .1s ease-out}

/* Detail: a floating card on large screens, a sheet on phones */
.detail{position:sticky;top:calc(var(--tb,120px) + 8px);background:var(--card);border-radius:20px;box-shadow:var(--shadow-lg);padding:22px;max-height:calc(100vh - var(--tb,120px) - 24px);overflow:auto;overscroll-behavior:contain}
.grab,.scrim{display:none}
.hint{color:var(--muted);text-align:center;padding:36px 12px;font-size:15px}
.hint .disc{margin:0 auto 16px}
.close{display:none}
.cover{position:relative;aspect-ratio:1;border-radius:12px;box-shadow:var(--shadow-lg);overflow:hidden;background:var(--fill);display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.cover img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transform:scale(1.02);transition:opacity .4s var(--ease),transform .6s var(--ease)}
.cover img.ok{opacity:1;transform:none}
.cover .msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:15px;text-align:center;padding:16px}
.cover .msg a{color:var(--accent);text-decoration:none;font-weight:600}
.disc{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 14%,#fff 14% 16%,#1d1d1f 16% 100%);box-shadow:inset 0 0 0 6px #2a2a2c,inset 0 0 0 14px #1d1d1f,inset 0 0 0 15px #303032,inset 0 0 0 26px #1d1d1f,inset 0 0 0 27px #303032}
.spin{animation:spin 1.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.detail h2{color:var(--ink);font-size:28px;line-height:1.1;font-weight:700;margin:4px 0 4px;letter-spacing:-.022em}
.detail .by{font-size:17px;color:var(--text);margin:0 0 12px}
.by button{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px}
.chips span{font-size:13px;background:var(--fill);color:var(--text);font-weight:600;letter-spacing:0;border-radius:999px;padding:4px 11px}
.chips span:first-child{background:var(--accent-soft);color:var(--accent)}
h3{letter-spacing:0}
dl{display:grid;grid-template-columns:auto 1fr;margin:0;background:var(--bg);border-radius:12px;padding:2px 14px}
dt,dd{padding:10px 0;margin:0;font-size:15px;box-shadow:inset 0 -1px 0 var(--sep)}
dt:last-of-type,dd:last-of-type{box-shadow:none}
dt{color:var(--muted);padding-right:16px}
dd{color:var(--ink);word-break:break-word;text-align:right}
.same h3,.tracks h3,.albumcr h3{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.02em;margin:24px 0 8px;font-weight:600}
.tracks h3{margin-top:4px;display:flex;justify-content:space-between}
.same button{display:flex;justify-content:space-between;gap:10px;width:100%;border:0;background:none;text-align:left;padding:9px 10px;border-radius:10px;cursor:pointer;font-size:16px}
.same button:hover{background:var(--hover)}
.same button:active{background:var(--press);transition:none}
.same .y{color:var(--muted);font-size:15px}
.same small{color:var(--muted);font-size:13px}
.src{font-size:12px;color:var(--muted);margin:-4px 0 16px;line-height:1.45;letter-spacing:0}
.songs{background:var(--card);border-radius:14px;padding:12px 0 0;margin:6px 0 22px;box-shadow:var(--shadow);overflow:hidden}
.songs h3{margin:0 16px 8px;font-size:15px;color:var(--ink)}
.songs .note{margin:0 16px 12px;color:var(--muted);font-size:15px}
.songs .song{display:block;color:var(--accent);font-size:13px;font-weight:600;margin-top:2px}
.tracks{margin:0 0 8px}
.tracks ol{list-style:none;margin:0;padding:0}
.tracks li{display:grid;grid-template-columns:24px 1fr auto;gap:10px;padding:10px 4px;font-size:16px;line-height:1.35;color:var(--ink);box-shadow:inset 0 -1px 0 var(--sep)}
.tracks li:last-child{box-shadow:none}
.tracks li .no{color:var(--muted);font-variant-numeric:tabular-nums;text-align:right;font-size:15px}
.tracks li .len{color:var(--muted);font-size:15px;font-variant-numeric:tabular-nums}
.tracks li.hit{background:var(--accent-soft);border-radius:10px;box-shadow:none}
.tracks .disc-h{display:block;color:var(--accent);font-size:13px;font-weight:700;padding:14px 4px 6px;box-shadow:inset 0 -1px 0 var(--sep)}
.tracks .src{margin:10px 0 0}
.tracks .wait{color:var(--muted);font-size:15px;padding:8px 0}
.tracks .wait a{color:var(--accent);font-weight:600;text-decoration:none}
.credits{display:block;font-size:13px;color:var(--muted);line-height:1.5;margin-top:3px;letter-spacing:0}
.cr{display:inline}
.cr+.cr::before,.cr-more .cr::before{content:" · "}
.role{color:var(--muted)}
.pn{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600;border-radius:4px}
.pn:active{opacity:.5}
.pn.me{background:#FFE48F;color:var(--ink);padding:0 4px}
.morecr{border:0;background:none;padding:0 0 0 6px;color:var(--accent);cursor:pointer;font-size:13px;font-weight:600}
.cr-more[hidden],.morecr[hidden]{display:none}
.albumcr{margin:0 0 20px;font-size:13px;line-height:1.6;background:var(--bg);border-radius:12px;padding:10px 14px}
.albumcr h3{margin:0 0 2px}
.crwait{color:var(--muted);font-size:13px;margin:-2px 0 6px}
.backrec{border:0;background:none;color:var(--accent);font-weight:600;padding:0 0 14px;cursor:pointer;font-size:17px;display:block}
.ext{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;font-size:16px}
.wait{color:var(--muted)}
footer{color:var(--muted);font-size:13px;padding:0 0 36px;text-align:center}
:focus-visible{outline-color:var(--accent)}
@media (hover:none){.row:hover{background:var(--card)}.row[aria-current=true]{background:var(--accent-soft)}.same button:hover{background:none}}
@media (max-width:1100px) and (min-width:901px){.layout{grid-template-columns:minmax(0,1fr) 360px}}
@media (max-width:900px){
  .wrap{padding:0 16px}
  .top{padding-top:20px}
  .top h1{font-size:30px}
  .meta{padding-left:0}
  .layout{grid-template-columns:1fr}
  .detail{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:20;height:calc(100% - 44px);max-height:none;border-radius:14px 14px 0 0;padding:0 16px calc(32px + env(safe-area-inset-bottom));transform:translateY(105%);visibility:hidden;will-change:transform}
  body.open .detail,.detail.moving{visibility:visible}
  .grab{display:flex;position:sticky;top:0;z-index:2;justify-content:space-between;align-items:center;margin:0 -16px 6px;padding:14px 16px 8px;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);touch-action:none;cursor:grab}
  .grab::before{content:"";position:absolute;top:6px;left:50%;width:36px;height:5px;margin-left:-18px;border-radius:3px;background:var(--fill2)}
  .grab .done{border:0;background:none;color:var(--accent);font-weight:600;font-size:17px;padding:4px 0;cursor:pointer}
  .scrim{display:block;position:fixed;inset:0;z-index:19;background:rgba(0,0,0,.32);opacity:0;pointer-events:none;will-change:opacity}
  body.open .scrim{pointer-events:auto}
  body.open{overflow:hidden}
  .cover{max-width:360px;margin-left:auto;margin-right:auto}
  .hint{display:none}
  .count{margin-left:0;width:100%}
  .controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .controls .seg{grid-column:1/-1;display:flex}
  .controls .seg button{flex:1}
  .controls select{width:100%}
  .count{grid-column:1/-1}
  .seg .n{display:none}
  .row{grid-template-columns:40px minmax(0,1fr) auto 10px;gap:10px;padding:9px 12px}
  .row::after{left:62px}
  .card{border-radius:12px}
}
@media (prefers-reduced-transparency:reduce){.toolbar,.grab{background:var(--bg);-webkit-backdrop-filter:none;backdrop-filter:none}.grab{background:#fff}}
@media (prefers-contrast:more){:root{--sep:rgba(60,60,67,.45);--muted:rgba(60,60,67,.85)}.toolbar{background:var(--bg)}}
@media (prefers-reduced-motion:reduce){*{transition-duration:.01ms !important;animation:none !important}}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="mark" aria-hidden="true"></div>
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
      <div class="seg" role="group" aria-label="Vis" id="seg"><span class="thumb" id="thumb"></span>
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
    <div class="grab" id="grab"><span></span><button class="done" id="done">Færdig</button></div>
    <div id="dbody"><div class="hint"><div class="disc"></div>Klik på en plade for at se coveret og alle oplysninger fra Excel-arket.</div></div>
  </aside>
  <div class="scrim" id="scrim"></div>
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
      moveThumb();
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
    if (!grouped) html += '<div class="group"><div class="card">';
    shown.slice(0, limit).forEach(function (r) {
      if (grouped) {
        var l = letterOf(r, s);
        if (l !== last) { html += (last === null ? "" : "</div></div>") + '<div class="group"><div class="letter">' + l + '</div><div class="card">'; last = l; }
      }
      html += '<button class="row" role="listitem" data-i="' + r.i + '"' + (r.i === current ? ' aria-current="true"' : "") + ">" +
        '<span class="badge' + (r.t === "Vinyl" ? " v" : "") + '">' + esc(r.m || r.t) + "</span>" +
        '<span><span class="album">' + highlight(r.b || "Uden titel", res.words) + (r.v === "Kopi" || r.v === "Bootleg" ? ' <span class="tag ' + (r.v === "Kopi" ? "k" : "b") + '">' + r.v + "</span>" : "") + '</span><span class="artist">' + highlight(r.a, res.words) + "</span></span>" +
        '<span class="year">' + esc(r.y) + "</span></button>";
    });
    html += "</div></div>";
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
    $("dbody").innerHTML = '<button class="backrec" data-i="' + back + '">‹ Tilbage til ' + esc(records[back] ? records[back].b : "pladen") + "</button>" +
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

    $("dbody").innerHTML =
      '<div class="cover" id="cover"><div class="msg"><div class="disc spin"></div>Finder cover…</div></div>' +
      '<p class="src" id="src"></p>' +
      "<h2>" + esc(r.b || "Uden titel") + "</h2>" +
      '<p class="by"><button data-artist="' + esc(r.a) + '">' + esc(r.a) + "</button></p>" +
      '<div class="chips">' + chips + "</div>" +
      '<div class="tracks" id="tracks"><h3>Sangliste</h3><div class="wait">Henter sangliste…</div></div>' +
      "<dl>" + fields + "</dl>" + sameHtml;
    $("detail").scrollTop = 0;
    setOpen(true);
    infoFor(r);
    if (!fromHistory) {
      if (location.hash === "#r" + i) return;
      pushed = true;
      location.hash = "r" + i;
    }
  }

  function close() {
    setOpen(false);
    if (pushed) { pushed = false; history.back(); }
    else if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  // Phones: the record opens as a sheet that follows the finger and settles with a spring
  // (critically damped, 0.3 s response), starting from wherever it is, so it can be interrupted.
  var sheetY = null, sheetV = 0, sheetTarget = 0, sheetFrame = 0, drag = null;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function isPhone() { return window.innerWidth <= 900; }
  function sheetHeight() { return $("detail").offsetHeight || window.innerHeight; }
  function paintSheet() {
    var h = sheetHeight();
    $("detail").style.transform = "translateY(" + sheetY + "px)";
    $("scrim").style.opacity = String(Math.max(0, Math.min(1, 1 - sheetY / h)));
  }
  function settleSheet(target, velocity) {
    sheetTarget = target;
    if (typeof velocity === "number") sheetV = velocity;
    if (sheetY === null) sheetY = sheetHeight() * 1.05;
    if (reduceMotion.matches) {
      sheetY = target; sheetV = 0; paintSheet();
      $("detail").classList.toggle("moving", target < sheetHeight());
      return;
    }
    $("detail").classList.add("moving");
    cancelAnimationFrame(sheetFrame);
    var omega = 2 * Math.PI / 0.3, last = performance.now();
    var step = function (now) {
      var dt = Math.min(0.032, (now - last) / 1000); last = now;
      var a = -omega * omega * (sheetY - sheetTarget) - 2 * omega * sheetV;
      sheetV += a * dt; sheetY += sheetV * dt;
      if (Math.abs(sheetY - sheetTarget) < 0.5 && Math.abs(sheetV) < 20) {
        sheetY = sheetTarget; sheetV = 0; paintSheet();
        if (sheetTarget > 0) $("detail").classList.remove("moving");
        return;
      }
      paintSheet();
      sheetFrame = requestAnimationFrame(step);
    };
    sheetFrame = requestAnimationFrame(step);
  }
  function setOpen(on) {
    document.body.classList.toggle("open", on);
    if (!isPhone()) { $("detail").style.transform = ""; $("scrim").style.opacity = ""; return; }
    settleSheet(on ? 0 : sheetHeight() * 1.05);
  }
  window.addEventListener("resize", function () { if (!isPhone()) { $("detail").style.transform = ""; $("scrim").style.opacity = ""; sheetY = null; } });
  $("scrim").addEventListener("click", function () { close(); });
  // Drag the sheet by its top bar: 1:1 with the finger, rubber-banding upwards,
  // and on release it closes if the projected end point is past a third of the height.
  $("grab").addEventListener("pointerdown", function (e) {
    if (e.target.closest("#done") || !isPhone()) return;
    cancelAnimationFrame(sheetFrame);
    drag = { start: e.clientY, from: sheetY || 0, hist: [[e.timeStamp, e.clientY]] };
    $("grab").setPointerCapture(e.pointerId);
  });
  $("grab").addEventListener("pointermove", function (e) {
    if (!drag) return;
    var d = e.clientY - drag.start + drag.from;
    if (d < 0) { var c = 0.55, h = sheetHeight(); d = -(-d * h * c / (h + c * -d)) * 0.25; }
    sheetY = d; paintSheet();
    drag.hist.push([e.timeStamp, e.clientY]);
    if (drag.hist.length > 6) drag.hist.shift();
  });
  var endDrag = function () {
    if (!drag) return;
    var h = drag.hist, first = h[0], lastP = h[h.length - 1];
    var v = lastP[0] > first[0] ? (lastP[1] - first[1]) / ((lastP[0] - first[0]) / 1000) : 0;
    drag = null;
    var projected = sheetY + (v / 1000) * 0.99 / (1 - 0.99);
    if (projected > sheetHeight() / 3) { sheetV = v; close(); }
    else settleSheet(0, v);
  };
  $("grab").addEventListener("pointerup", endDrag);
  $("grab").addEventListener("pointercancel", endDrag);

  // Segmented control: the white thumb slides to the chosen option.
  function moveThumb() {
    var on = document.querySelector('#seg button[aria-pressed="true"]');
    if (!on) return;
    $("thumb").style.width = on.offsetWidth + "px";
    $("thumb").style.transform = "translateX(" + on.offsetLeft + "px)";
  }
  window.addEventListener("resize", moveThumb);
  moveThumb();

  // A hairline under the toolbar only once the list scrolls beneath it.
  window.addEventListener("scroll", function () { $("toolbar").classList.toggle("scrolled", window.scrollY > 8); }, { passive: true });

  function fromHash() {
    var m = location.hash.match(/^#r(\d+)$/);
    if (m) open(+m[1], true);
    else { setOpen(false); pushed = false; }
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
    setTimeout(moveThumb, 0);
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
    if (e.target.closest("#close") || e.target.closest("#done")) { close(); return; }
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
