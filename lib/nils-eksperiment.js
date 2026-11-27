// The experiment zone on nils.westerholt.dk: the record collection as a record shop in 3D.
// Served by functions/_middleware.js behind the password, which replaces __BASE__ with the page's
// base path. The 3D code itself is in nils-3d/ (plain files without data; the records are read
// from the same addresses as the collection page).
export default String.raw`<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0f0c0a">
<meta name="color-scheme" content="dark">
<title>Pladebutikken · Eksperimentzone</title>
<link rel="apple-touch-icon" href="/nils-ikon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/nils-ikon/ikon-192.png">
<style>
:root{--glass:rgba(26,21,17,.62);--glass-hi:rgba(40,33,27,.78);--line:rgba(255,240,220,.12);--ink:#FBF4EA;--text:rgba(251,244,234,.86);--muted:rgba(251,244,234,.58);--accent:#E3915F;--accent-deep:#AE633D;--od:#7E97C2;--ease:cubic-bezier(.22,1,.36,1);--safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
[hidden]{display:none !important}
html,body{margin:0;height:100%;overflow:hidden;background:#0f0c0a;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-.01em;overscroll-behavior:none}
button{font:inherit;color:inherit;letter-spacing:inherit;cursor:pointer}
#c{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.glass{background:var(--glass);-webkit-backdrop-filter:blur(22px) saturate(170%);backdrop-filter:blur(22px) saturate(170%);border:.5px solid var(--line);box-shadow:0 10px 40px rgba(0,0,0,.35)}
.hide{opacity:0 !important;pointer-events:none !important;transform:translateY(8px) scale(.98) !important}
/* top bar */
#top{position:fixed;z-index:5;left:12px;right:12px;top:calc(10px + var(--safe-t));display:flex;align-items:center;gap:8px;pointer-events:none}
#top>*{pointer-events:auto}
.pill{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 15px;border-radius:999px;color:var(--ink);text-decoration:none;font-size:15px;font-weight:600;border:.5px solid var(--line);background:var(--glass);-webkit-backdrop-filter:blur(22px) saturate(170%);backdrop-filter:blur(22px) saturate(170%);transition:transform .2s var(--ease),background .2s;white-space:nowrap}
.pill:hover{background:var(--glass-hi)}
.pill:active{transform:scale(.96)}
.pill svg{width:18px;height:18px;flex:none}
.icon{width:40px;padding:0;justify-content:center}
#title{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;line-height:1.1;text-shadow:0 1px 8px rgba(0,0,0,.6);pointer-events:none}
#title b{font-size:16px;color:var(--ink);font-weight:700;letter-spacing:.02em}
#title span{font-size:12px;color:var(--muted);font-weight:500;letter-spacing:.06em;text-transform:uppercase}
#bsearch{margin-left:auto}
@media (max-width:440px){#title{display:none}}
/* the record card */
#card{position:fixed;z-index:4;left:50%;bottom:calc(14px + var(--safe-b));transform:translateX(-50%);width:min(560px,calc(100% - 24px));border-radius:22px;padding:14px 16px 14px;transition:opacity .35s var(--ease),transform .45s var(--ease)}
#card.hide{transform:translateX(-50%) translateY(14px) scale(.98) !important}
.crow{display:flex;gap:12px;align-items:flex-start}
.ctext{flex:1;min-width:0}
#cartist{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#calbum{font-size:21px;font-weight:700;color:var(--ink);line-height:1.2;letter-spacing:-.02em;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#cmeta{font-size:14px;color:var(--muted);margin-top:4px}
#cmeta .od{color:var(--od);font-weight:600}
#cmeta .lent{color:var(--accent);font-weight:600}
.tag{display:inline-block;background:#FBEFB6;color:#6A4A12;font-size:15px;font-weight:800;line-height:1;padding:7px 9px 6px;border-radius:6px;transform:rotate(-3deg);box-shadow:0 1px 2px rgba(0,0,0,.35);white-space:nowrap;flex:none;margin-top:4px}
#cextra{font-size:13.5px;color:var(--muted);margin-top:8px;line-height:1.45}
#cextra a{color:var(--accent);text-decoration:none;font-weight:600}
#actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:42px;padding:0 16px;border-radius:999px;border:0;background:rgba(255,240,220,.1);color:var(--ink);font-size:15px;font-weight:600;text-decoration:none;transition:transform .2s var(--ease),background .2s}
.btn:hover{background:rgba(255,240,220,.16)}
.btn:active{transform:scale(.96)}
.btn.main{background:var(--accent-deep);color:#fff}
.btn.main:hover{background:#c1714a}
.btn svg{width:17px;height:17px}
/* where you are in a crate */
#crumb{position:fixed;z-index:4;left:50%;top:calc(62px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:4px;border-radius:999px;padding:4px;transition:opacity .3s var(--ease),transform .35s var(--ease)}
#crumb.hide{transform:translateX(-50%) translateY(-6px) !important}
#crumb button{border:0;background:none;width:34px;height:32px;border-radius:999px;color:var(--ink);display:grid;place-items:center}
#crumb button:hover{background:rgba(255,240,220,.1)}
#crumb button:disabled{opacity:.3;cursor:default}
#crumbt{font-size:14px;font-weight:600;color:var(--ink);padding:0 6px;white-space:nowrap}
#crumbt small{color:var(--muted);font-weight:500;margin-left:6px}
/* letter jump row */
#letters{position:fixed;z-index:4;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:1px;border-radius:16px;padding:6px 3px;max-height:calc(100% - 220px);overflow:auto;scrollbar-width:none;transition:opacity .3s var(--ease),transform .35s var(--ease)}
#letters.hide{transform:translateY(-50%) translateX(8px) !important}
#letters::-webkit-scrollbar{display:none}
#letters button{border:0;background:none;color:var(--muted);font-size:12px;font-weight:700;width:28px;min-height:19px;border-radius:7px;padding:1px 0}
#letters button.on{color:#1D1D1F;background:#ECE7DE}
#letters button:hover{color:var(--ink)}
/* now playing */
#now{position:fixed;z-index:4;left:12px;top:calc(62px + var(--safe-t));width:min(330px,calc(100% - 24px));border-radius:18px;padding:10px 10px 10px 12px;display:flex;align-items:center;gap:10px;transition:opacity .35s var(--ease),transform .45s var(--ease)}
#nowdisc{width:38px;height:38px;border-radius:50%;flex:none;background:radial-gradient(circle,var(--accent-deep) 0 22%,#f6efe4 22% 26%,#161616 26% 100%);box-shadow:inset 0 0 0 6px #232323,inset 0 0 0 7px #161616,inset 0 0 0 11px #232323,inset 0 0 0 12px #161616;animation:spin 1.8s linear infinite}
#now.paused #nowdisc{animation-play-state:paused}
@keyframes spin{to{transform:rotate(360deg)}}
.ntext{flex:1;min-width:0;line-height:1.25}
#nowt{font-size:14px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nowa{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nowbar{height:3px;border-radius:2px;background:rgba(255,240,220,.15);margin-top:6px;overflow:hidden}
#nowbar i{display:block;height:100%;width:0;background:var(--accent);border-radius:2px}
#now button{border:0;background:rgba(255,240,220,.1);width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:none;color:var(--ink)}
#now button:hover{background:rgba(255,240,220,.18)}
#now button svg{width:15px;height:15px}
/* hints and toasts */
#hint{position:fixed;z-index:3;left:50%;bottom:calc(18px + var(--safe-b));transform:translateX(-50%);padding:10px 16px;border-radius:999px;font-size:14px;font-weight:500;color:var(--ink);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;transition:opacity .4s var(--ease),transform .45s var(--ease)}
#hint.hide{transform:translateX(-50%) translateY(10px) !important}
#tip{position:fixed;z-index:6;pointer-events:none;padding:6px 10px;border-radius:10px;font-size:13px;font-weight:600;color:var(--ink);transform:translate(14px,14px);white-space:nowrap;transition:opacity .15s}
#tip small{display:block;font-weight:500;color:var(--muted)}
#toast{position:fixed;z-index:8;left:50%;top:calc(64px + var(--safe-t));transform:translateX(-50%);padding:10px 16px;border-radius:14px;font-size:14px;font-weight:600;color:var(--ink);transition:opacity .3s var(--ease),transform .35s var(--ease);max-width:calc(100% - 24px);text-align:center}
#toast.hide{transform:translateX(-50%) translateY(-6px) !important}
/* search */
#search{position:fixed;z-index:7;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:calc(64px + var(--safe-t)) 12px 12px;background:rgba(10,8,6,.45);transition:opacity .25s var(--ease)}
#search.hide{transform:none !important}
#sbox{width:min(560px,100%);border-radius:20px;overflow:hidden}
.sfield{display:flex;align-items:center;gap:10px;padding:0 14px;height:54px;border-bottom:.5px solid var(--line)}
.sfield svg{width:19px;height:19px;color:var(--muted);flex:none}
#sq{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:inherit;font-size:17px}
#sq::placeholder{color:var(--muted)}
#sres{max-height:min(60vh,520px);overflow:auto}
#sres button{display:flex;width:100%;text-align:left;border:0;background:none;padding:10px 14px;gap:12px;align-items:center;border-bottom:.5px solid rgba(255,240,220,.06)}
#sres button:hover,#sres button.on{background:rgba(255,240,220,.08)}
#sres .sw{width:36px;height:36px;border-radius:6px;flex:none;background:#3a302a;display:grid;place-items:center;font-size:11px;font-weight:800;color:rgba(255,255,255,.7)}
#sres .st{flex:1;min-width:0}
#sres .st b{display:block;font-size:15px;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sres .st span{display:block;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sres .none{padding:18px 14px;color:var(--muted);font-size:14px}
#sres .sk{font-size:12px;color:var(--muted);font-weight:600;flex:none}
/* loading */
#loader{position:fixed;z-index:10;inset:0;display:grid;place-items:center;background:#0f0c0a;transition:opacity 1.2s ease}
#loader.gone{opacity:0;pointer-events:none}
.lbox{text-align:center}
.ldisc{width:86px;height:86px;margin:0 auto 18px;border-radius:50%;background:radial-gradient(circle,var(--accent-deep) 0 21%,#f6efe4 21% 25%,#161616 25%);box-shadow:inset 0 0 0 12px #222,inset 0 0 0 13px #161616,inset 0 0 0 20px #222,inset 0 0 0 21px #161616,inset 0 0 0 28px #222,inset 0 0 0 29px #161616,0 14px 40px rgba(0,0,0,.5);animation:spin 1.8s linear infinite}
#lmsg{font-size:15px;color:var(--muted)}
#lsub{font-size:12px;color:rgba(251,244,234,.35);margin-top:8px;letter-spacing:.06em;text-transform:uppercase}
#fail{display:none;max-width:420px;padding:24px;text-align:center}
#fail a{color:var(--accent)}
/* help */
#help{position:fixed;z-index:7;inset:0;display:grid;place-items:center;padding:16px;background:rgba(10,8,6,.5);transition:opacity .25s var(--ease)}
#help.hide{transform:none !important}
#hbox{width:min(440px,100%);border-radius:22px;padding:20px 20px 16px}
#hbox h2{margin:0 0 4px;font-size:20px;color:var(--ink)}
#hbox p{margin:0 0 14px;color:var(--muted);font-size:14px;line-height:1.5}
#hbox ul{margin:0 0 16px;padding:0;list-style:none;display:grid;gap:9px;font-size:14.5px}
#hbox li{display:flex;gap:10px;align-items:baseline}
#hbox li b{color:var(--accent);flex:none;width:92px;font-weight:600}
/* the time journey */
#tt{position:fixed;z-index:3;left:50%;top:calc(66px + var(--safe-t));transform:translateX(-50%);text-align:center;pointer-events:none;transition:opacity .5s var(--ease),transform .5s var(--ease);white-space:nowrap}
#tt.hide{transform:translateX(-50%) translateY(-8px) !important}
#tty{--g:#ffb03b;display:block;font-size:64px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#fff;text-shadow:0 0 18px var(--g),0 0 44px var(--g),0 2px 0 rgba(0,0,0,.25);font-variant-numeric:tabular-nums;transition:text-shadow .8s}
#tts{display:block;margin-top:7px;font-size:12.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text);text-shadow:0 1px 8px rgba(0,0,0,.8)}
#ttbar{position:fixed;z-index:3;left:50%;bottom:calc(14px + var(--safe-b));transform:translateX(-50%);width:min(760px,calc(100% - 24px));border-radius:18px;padding:10px 12px 8px;transition:opacity .35s var(--ease),transform .45s var(--ease)}
#ttbar.hide{transform:translateX(-50%) translateY(12px) !important}
#tth{display:block;width:100%;height:64px;cursor:pointer;touch-action:none}
#fade{position:fixed;inset:0;z-index:9;pointer-events:none;opacity:0;background:#fff1e0}
body.time #hint{bottom:calc(112px + var(--safe-b))}
@media (max-width:600px){
  #tty{font-size:50px}
  #tth{height:54px}
  body.time #now{bottom:calc(100px + var(--safe-b))}
  body.time #hint{bottom:calc(166px + var(--safe-b))}
}
@media (max-width:600px){
  .pill .lbl{display:none}
  .pill.lblok .lbl{display:inline}
  #title b{font-size:15px}
  #calbum{font-size:19px}
  #card{border-radius:20px;padding:12px 14px}
  .btn{height:40px;padding:0 14px;font-size:14.5px}
  #now{top:auto;bottom:calc(14px + var(--safe-b));left:12px}
  #now.lift{bottom:calc(var(--cardh,0px) + 22px + var(--safe-b))}
  #letters{right:4px;max-height:calc(100% - 300px)}
  #letters button{width:24px;min-height:17px;font-size:11px}
}
@media (prefers-reduced-motion:reduce){*{transition-duration:.01ms !important;animation:none !important}}
</style>
<script type="importmap">{"imports":{"three":"/nils-3d/three-0.170.0.min.js"}}</script>
<script>window.NILS = { base: "__BASE__" };</script>
</head>
<body>
<canvas id="c" tabindex="0" aria-label="Pladebutikken i 3D"></canvas>
<div id="top">
  <a class="pill lblok" href="__BASE__/" id="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg><span class="lbl">Samlingen</span></a>
  <div id="title"><b>Westerholt Plader</b><span>Eksperimentzone</span></div>
  <button class="pill icon" id="bsearch" aria-label="Søg efter en plade"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
  <button class="pill" id="bshuffle" aria-label="Overrask mig"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg><span class="lbl">Overrask mig</span></button>
  <button class="pill icon" id="bhelp" aria-label="Sådan bruger du butikken"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg></button>
</div>
<div id="crumb" class="glass hide"><button id="cprev" aria-label="Forrige kasse"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span id="crumbt"></span><button id="cnext" aria-label="Næste kasse"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></div>
<nav id="letters" class="glass hide" aria-label="Hop til bogstav"></nav>
<div id="now" class="glass hide" role="status" aria-live="polite"><div id="nowdisc"></div><div class="ntext"><div id="nowt"></div><div id="nowa"></div><div id="nowbar"><i id="nowp"></i></div></div><button id="nownext" aria-label="Næste nummer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l9-7zM16 5h3v14h-3z"/></svg></button><button id="nowstop" aria-label="Stop musikken"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button></div>
<div id="card" class="glass hide" aria-live="polite">
  <div class="crow"><div class="ctext"><div id="cartist"></div><div id="calbum"></div><div id="cmeta"></div></div><span class="tag" id="cprice" hidden></span></div>
  <div id="cextra" hidden></div>
  <div id="actions"></div>
</div>
<div id="tt" class="hide" aria-live="polite"><b id="tty"></b><span id="tts"></span></div>
<div id="ttbar" class="glass hide"><canvas id="tth" aria-label="Tidslinje over samlingen: tryk for at hoppe til et år"></canvas></div>
<div id="hint" class="glass hide"></div>
<div id="tip" class="glass hide"></div>
<div id="toast" class="glass hide" role="status" aria-live="polite"></div>
<div id="search" class="hide" role="dialog" aria-label="Søg"><div id="sbox" class="glass"><div class="sfield"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sq" type="search" autocomplete="off" placeholder="Søg efter kunstner, album eller år" aria-label="Søg efter kunstner, album eller år"></div><div id="sres"></div></div></div>
<div id="help" class="hide" role="dialog" aria-label="Sådan bruger du butikken"><div id="hbox" class="glass">
  <h2>Velkommen i butikken</h2>
  <p>Hele samlingen står her: LP'erne i kasserne på bordene, CD'erne på væggen til venstre.</p>
  <ul>
    <li><b>Gå rundt</b><span>Træk for at kigge. Tryk på gulvet for at gå derhen.</span></li>
    <li><b>Bladre</b><span>Tryk på en kasse. Swipe eller scroll for at vippe pladerne frem.</span></li>
    <li><b>Tag en plade</b><span>Tryk på pladen forrest. Træk i den for at dreje den.</span></li>
    <li><b>Spil den</b><span>Pladen kommer på pladespilleren ved disken, og der spilles et klip.</span></li>
    <li><b>Tidsrejsen</b><span>Døren med lys i til højre: flyv gennem årtierne. Scroll eller swipe for at rejse, tryk på tidslinjen for at hoppe.</span></li>
  </ul>
  <button class="btn main" id="hclose">Forstået</button>
</div></div>
<div id="loader"><div class="lbox" id="lbox"><div class="ldisc"></div><div id="lmsg">Låser butikken op …</div><div id="lsub">Westerholt Plader</div></div><div id="fail"><p>Din browser kan ikke vise 3D-butikken.</p><p><a href="__BASE__/">Tilbage til samlingen</a></p></div></div>
<div id="fade"></div>
<script type="module" src="/nils-3d/butik.js"></script>
</body>
</html>`;
