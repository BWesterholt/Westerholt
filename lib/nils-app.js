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
<link rel="apple-touch-icon" href="/nils-ikon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/nils-ikon/ikon-192.png">
<link rel="manifest" href="/nils-ikon/manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="Pladesamlingen">
<style>
:root{
  --bg:#F5F1EA;--card:#FFFFFF;--ink:#1D1D1F;--text:#3A3A3C;--muted:rgba(60,60,67,.62);--faint:rgba(60,60,67,.32);
  --sep:rgba(60,60,67,.16);--fill:rgba(118,118,128,.12);--fill2:rgba(118,118,128,.2);--press:rgba(60,40,20,.07);
  --accent:#AE633D;--accent-soft:#F3E3D9;--cd:#2F6F93;--cd-soft:#E2EEF5;--hover:rgba(60,40,20,.045);
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
/* The title as an old enamel shop sign */
.top h1.sign{flex:0 1 auto;display:inline-flex;align-items:center;gap:12px;font-size:25px;line-height:1;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#FBF3E8;padding:12px 24px 12px 12px;border-radius:12px;
  background:radial-gradient(circle at 8px 8px,#F2E3D2 0 1.8px,#8A4728 2.2px 2.8px,transparent 3.2px),radial-gradient(circle at calc(100% - 8px) 8px,#F2E3D2 0 1.8px,#8A4728 2.2px 2.8px,transparent 3.2px),radial-gradient(circle at 8px calc(100% - 8px),#F2E3D2 0 1.8px,#8A4728 2.2px 2.8px,transparent 3.2px),radial-gradient(circle at calc(100% - 8px) calc(100% - 8px),#F2E3D2 0 1.8px,#8A4728 2.2px 2.8px,transparent 3.2px),linear-gradient(160deg,#BA7049,#A2582F);
  box-shadow:inset 0 0 0 4px transparent,inset 0 0 0 5.5px rgba(251,243,232,.8),inset 0 1px 0 7px rgba(255,255,255,.06),0 1px 2px rgba(40,25,10,.25),0 10px 24px rgba(40,25,10,.16);text-shadow:0 1px 0 rgba(90,40,15,.45)}
.sign .mark{width:34px;height:34px;box-shadow:inset 0 0 0 6px #2a2a2c,inset 0 0 0 7px #1D1D1F,inset 0 0 0 10px #2a2a2c,inset 0 0 0 11px #1D1D1F,0 0 0 2px rgba(251,243,232,.8)}
.top .logout{margin-left:auto}
.logout{color:var(--accent);font-size:17px;text-decoration:none;padding:6px 2px}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;color:var(--muted);font-size:15px;padding:12px 0 16px 4px}
.meta .ver::before{content:"\00b7";margin-right:14px;color:var(--faint)}

/* Toolbar: translucent material that the list scrolls under */
.toolbar{position:sticky;top:0;z-index:5;background:var(--bar);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);padding:10px 0 12px;box-shadow:0 1px 0 transparent;transition:box-shadow .2s}
.toolbar.scrolled{box-shadow:0 1px 0 var(--sep)}
.search{position:relative}
.search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search input{width:100%;font:inherit;font-size:17px;height:40px;padding:0 40px 0 36px;border:0;border-radius:11px;background:var(--fill);color:var(--ink);outline:none;transition:box-shadow .2s var(--ease),background .2s}
.search input::placeholder{color:var(--muted)}
.search input:focus{background:#fff;box-shadow:0 0 0 3px rgba(174,99,61,.28)}
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
select:focus-visible{outline:3px solid rgba(174,99,61,.35);outline-offset:1px}
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
.row:focus-visible{outline:3px solid rgba(174,99,61,.35);outline-offset:-3px}
.fmt{position:relative;display:block;width:36px;height:36px}
.fmt::after,.fmt.x2::before{content:"";position:absolute;inset:0;border-radius:50%;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='12.5' fill='none' stroke='%23DCDCE0' stroke-width='15'/><circle cx='20' cy='20' r='12.5' fill='none' stroke='%23fff' stroke-opacity='.7' stroke-width='15' stroke-dasharray='8 31.3' transform='rotate(-70 20 20)'/><circle cx='20' cy='20' r='12.5' fill='none' stroke='%23D6E4EE' stroke-width='15' stroke-dasharray='5 34.3' transform='rotate(40 20 20)'/><circle cx='20' cy='20' r='19.7' fill='none' stroke='%23000' stroke-opacity='.16' stroke-width='.6'/><circle cx='20' cy='20' r='7' fill='%23EEEEF1' stroke='%23000' stroke-opacity='.1' stroke-width='.6'/><circle cx='20' cy='20' r='3.4' fill='%23fff' stroke='%23000' stroke-opacity='.18' stroke-width='.6'/></svg>") center/100% no-repeat}
.fmt.v::after,.fmt.v.x2::before{background-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='13.5' fill='none' stroke='%231d1d1f' stroke-width='13'/><g fill='none' stroke='%233a3a3c' stroke-width='.5'><circle cx='20' cy='20' r='17.6'/><circle cx='20' cy='20' r='15.2'/><circle cx='20' cy='20' r='12.4'/><circle cx='20' cy='20' r='9.6'/></g><circle cx='20' cy='20' r='13.5' fill='none' stroke='%23fff' stroke-opacity='.13' stroke-width='13' stroke-dasharray='7 35.4' transform='rotate(-60 20 20)'/><circle cx='20' cy='20' r='4.15' fill='none' stroke='%23AE633D' stroke-width='5.7'/></svg>")}
.fmt.x2::after{right:6px;width:32px;height:32px;top:2px;box-shadow:1px 0 2px rgba(0,0,0,.18)}
.fmt.x2::before{left:6px;top:2px;width:32px;height:32px;opacity:.8}
.artist .fx{color:var(--muted)}
.artist .fx::before{content:"\00b7";margin:0 5px}
.artist .fx.b{color:#6B4F9E}
.album{display:block;color:var(--ink);font-weight:600;font-size:17px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{display:block;color:var(--muted);font-size:15px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.year{color:var(--muted);font-size:15px;font-variant-numeric:tabular-nums;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.tag.sure{background:linear-gradient(160deg,#F6D774,#D9A92E);color:#3F2A02;box-shadow:0 1px 2px rgba(80,50,10,.3),inset 0 0 0 1px rgba(120,80,0,.35)}
.tag{display:inline-block;background:#FBEFB6;color:#6A4A12;font-size:12px;font-weight:700;line-height:1;padding:4px 6px 4px;border-radius:4px;transform:rotate(-3deg);box-shadow:0 1px 1px rgba(80,50,10,.18);white-space:nowrap;letter-spacing:-.01em}
.price{display:flex;align-items:center;gap:14px;background:var(--bg);border-radius:12px;padding:12px 14px;margin:-8px 0 22px}
.price .tag{font-size:19px;padding:7px 10px 6px;border-radius:6px}
.price .tag.none{background:var(--fill);color:var(--muted);font-size:15px;transform:none;box-shadow:none}
.price p{margin:0;font-size:13px;line-height:1.4;color:var(--muted)}
.price p b{display:block;color:var(--ink);font-size:15px;font-weight:600}
.price a{color:var(--accent);font-weight:600;text-decoration:none;white-space:nowrap}
.worth{white-space:nowrap}
.price.own{display:block}
.ptop{display:flex;align-items:center;gap:14px}
.edrow{display:flex;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--sep)}
.edrow label{display:block;font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--muted);min-width:0}
.edrow .c{flex:1.4}.edrow .y{flex:.8}.edrow .s{flex:1.4}
.edrow input,.edrow select{display:block;width:100%;margin-top:3px;font:inherit;font-size:16px;color:var(--ink);background:var(--card);border:1px solid var(--sep);border-radius:8px;padding:6px 8px;min-width:0}
.price.wp{display:block}
.price.wp .for{margin-top:10px;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--muted)}
.price.wp p+table,.price.wp table+p{margin-top:8px}
.grades{border-collapse:collapse;width:100%}
.grades td{padding:5px 0;font-size:15px;color:var(--ink);box-shadow:inset 0 -1px 0 var(--sep)}
.grades tr:last-child td{box-shadow:none}
.grades td:last-child{text-align:right}
.grades .tag{font-size:14px}
.worth::before{content:"\00b7";margin:0 5px}
@media (max-width:600px){.worth{display:block;white-space:normal}.worth::before{display:none}}
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
/* The record slides half out of its sleeve and turns slowly */
.sleeve{position:relative;margin-bottom:14px}
.sleeve .cover{position:relative;z-index:1;width:78%;margin-bottom:0}
.vinyl{position:absolute;top:2%;left:2%;width:74%;aspect-ratio:1;border-radius:50%;transform:translateX(31%);animation:vout 1s var(--ease) .3s both;filter:drop-shadow(0 6px 14px rgba(40,25,10,.25))}
.vinyl i{position:absolute;inset:0;border-radius:50%;animation:spin 3.6s linear 1.2s infinite;
  background:radial-gradient(circle,#F6F1E9 0 1.4%,transparent 1.6% 29%,#141414 29.5% 30.5%,transparent 31%),conic-gradient(from 0deg,transparent 0 4%,rgba(255,255,255,.32) 9%,transparent 15% 30%,rgba(255,255,255,.08) 34%,transparent 38% 54%,rgba(255,255,255,.28) 59%,transparent 65% 80%,rgba(255,255,255,.07) 84%,transparent 88%),repeating-radial-gradient(circle,#161616 0 1.1px,#202020 1.1px 2.4px),#161616}
.vinyl i::before{content:"";position:absolute;inset:34.5%;border-radius:50%;background:conic-gradient(var(--accent) 0 50%,#C98663 0)}
.vinyl i::after{content:"";position:absolute;inset:47.6%;border-radius:50%;background:#F6F1E9}
.vinyl.cd i{background:radial-gradient(circle,#F6F1E9 0 6%,rgba(0,0,0,.18) 6.5% 7%,rgba(255,255,255,.55) 7.5% 17%,rgba(0,0,0,.08) 17.5% 18%,transparent 18.5%),conic-gradient(#D5DAE1,#F8F8FA 12%,#C4CAD3 25%,#EEF0F4 38%,#CDD2DA 50%,#F8F8FA 62%,#C4CAD3 75%,#EEF0F4 88%,#D5DAE1)}
.vinyl.cd i::before{inset:20%;background:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.vinyl.cd i::after{display:none}
@keyframes vout{from{transform:translateX(0)}to{transform:translateX(31%)}}
.cover .msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:15px;text-align:center;padding:16px}
.cover .msg a{color:var(--accent);text-decoration:none;font-weight:600}
.disc{width:120px;height:120px;border-radius:50%;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='20' fill='%231d1d1f'/><circle cx='20' cy='20' r='16' fill='none' stroke='%233a3a3c' stroke-width='.8'/><circle cx='20' cy='20' r='12.5' fill='none' stroke='%233a3a3c' stroke-width='.8'/><path d='M20 20L20 0A20 20 0 0 1 37.32 10Z' fill='%23fff' fill-opacity='.34'/><circle cx='20' cy='20' r='8' fill='%23AE633D'/><path d='M20 12A8 8 0 0 1 20 28Z' fill='%23DDAC92'/><circle cx='20' cy='20' r='1.3' fill='%23F6F1E9'/></svg>") center/100% 100% no-repeat}
.spin{animation:spin 1.3s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.detail h2{color:var(--ink);font-size:28px;line-height:1.1;font-weight:700;margin:4px 0 4px;letter-spacing:-.022em}
.detail .by{font-size:17px;color:var(--text);margin:0 0 12px}
.by button{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-weight:600}
.chips{display:flex;flex-wrap:wrap;margin:-4px 0 22px;font-size:15px;color:var(--muted)}
.chips span+span::before{content:"\00b7";margin:0 7px;color:var(--faint)}
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
.morecr{display:inline-flex;align-items:center;gap:3px;border:0;background:var(--fill);color:var(--text);padding:2px 9px;margin-left:6px;border-radius:999px;cursor:pointer;font-size:12px;font-weight:600;vertical-align:1px}
.morecr::after{content:"";width:5px;height:5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-1px) rotate(45deg);margin-left:3px}
.morecr:active{background:var(--fill2)}
.cr-more[hidden],.morecr[hidden]{display:none}
.albumcr{margin:0 0 20px;font-size:13px;line-height:1.6;background:var(--bg);border-radius:12px;padding:10px 14px}
.albumcr h3{margin:0 0 2px}
.crwait{color:var(--muted);font-size:13px;margin:-2px 0 6px}
.backrec{border:0;background:none;color:var(--accent);font-weight:600;padding:0 0 14px;cursor:pointer;font-size:17px;display:block}
.ext{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;font-size:16px}
.wait{color:var(--muted)}
.songbtn{display:flex;align-items:center;gap:12px;width:100%;border:0;background:var(--card);border-radius:14px;padding:13px 16px;margin:6px 0 18px;text-align:left;font-size:16px;color:var(--ink);cursor:pointer;box-shadow:0 1px 2px rgba(40,25,10,.04)}
.songbtn:active{background:var(--press)}
.songbtn b,.songs b{color:var(--accent)}
.note-i{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-weight:700}
.disc.small{display:inline-block;vertical-align:-5px;width:20px;height:20px;margin-right:8px}
.fmt img{position:absolute;z-index:2;left:-2px;top:-2px;width:40px;height:40px;border-radius:5px;object-fit:cover;background:var(--card);box-shadow:0 0 0 .5px rgba(0,0,0,.1),0 1px 3px rgba(40,25,10,.16);opacity:0;transition:opacity .35s var(--ease)}
.fmt img.ok{opacity:1}
/* With a cover: the record (or CD) peeks out from behind the sleeve */
.fmt.has img{left:-6px;top:0;width:36px;height:36px;border-radius:4px}
.fmt.has::after,.fmt.has.x2::after{inset:auto;left:10px;top:2px;right:auto;width:32px;height:32px;box-shadow:none;transition:left .4s var(--ease)}
.fmt.has.x2::before{display:none}
.row:hover .fmt.has::after{left:13px}
.pick{margin:-8px 0 16px}
.pickbtn{border:0;background:none;color:var(--accent);font-weight:600;font-size:13px;padding:2px 0;cursor:pointer}
.picker{background:var(--bg);border-radius:14px;padding:12px;margin:0 0 20px}
.picker .search input{background:#fff;font-size:16px;height:36px}
.picker .wait,.picker .none{color:var(--muted);font-size:14px;padding:14px 2px 4px}
.pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 10px;margin-top:12px}
.pgrid button{border:0;background:none;padding:0;text-align:left;cursor:pointer;font-size:12px;line-height:1.3;color:var(--muted);min-width:0}
.pgrid img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--fill);box-shadow:0 1px 3px rgba(40,25,10,.18);margin-bottom:6px;transition:transform .2s var(--ease)}
.pgrid button:hover img{transform:scale(1.03)}
.pgrid button:active img{opacity:.7}
.pgrid b{display:block;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgrid span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.picker .linkbtn{display:block;margin-top:10px;font-size:14px}
.fmt.p{display:grid;place-items:center;border-radius:50%;background:var(--fill);color:var(--muted)}
.fmt.p::after{display:none}
.fmt.p svg{width:18px;height:18px}
.palbum{background:var(--bg);border-radius:12px;padding:4px 0 6px;margin:0 0 10px}
.palbum[hidden]{display:none}
.same .phead:hover{background:var(--hover)}
.same .phead{display:grid;grid-template-columns:40px minmax(0,1fr) 10px;gap:10px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:8px 12px;border-radius:12px;cursor:pointer}
.same .phead::after{content:"";width:7px;height:7px;border-right:2px solid var(--faint);border-top:2px solid var(--faint);transform:rotate(45deg)}
.same .phead:active{background:var(--press)}
.phead .album,.phead2 .album{font-size:16px;white-space:normal}
.phead .artist,.phead2 .artist{font-size:13px}
.phead2{display:flex;justify-content:space-between;gap:10px;margin:0;padding:8px 12px}
.phead2 .y{color:var(--muted);font-size:14px}
.prole{margin:0 12px 6px;font-size:13px;color:var(--accent);font-weight:600}
.psongs{list-style:none;margin:0;padding:0 12px}
.psongs li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:15px;box-shadow:inset 0 1px 0 var(--sep)}
.psongs li[hidden]{display:none}
.psongs .st{color:var(--ink)}
.psongs .st::before{content:"♪ ";color:var(--faint)}
.psongs .sr{color:var(--muted);font-size:13px;text-align:right;flex:0 1 45%}
.ptitle{margin:6px 12px 2px;font-size:13px;font-weight:600;color:var(--muted)}
.plist button[hidden]{display:none}
.pmore{border:0;background:none;color:var(--accent);font-weight:600;font-size:14px;padding:6px 0;cursor:pointer}
.plist .pmore{padding:6px 10px}
.pmore.big{display:block;width:100%;background:var(--bg);border-radius:12px;padding:12px;font-size:15px}
.pmore-wrap{box-shadow:inset 0 1px 0 var(--sep)}
/* Ønskelisten: the shared wishlist */
[hidden]{display:none !important}
.views{display:flex;max-width:440px;margin:0 0 14px 52px}
.views button{flex:1;padding:7px 12px;font-size:15px}
.vn{margin-left:6px;color:var(--muted);font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}
.vn:empty{display:none}
.wbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.addbtn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-weight:600;font-size:14px;padding:7px 14px;cursor:pointer;justify-content:center}
.addbtn:hover{background:#935434}
.addbtn:active{transform:scale(.97);transition:transform .1s ease-out}
.wbar .addbtn{margin-left:auto}
.wrow{position:relative;display:grid;grid-template-columns:56px minmax(0,1fr) 10px;gap:14px;align-items:center;width:100%;text-align:left;border:0;background:var(--card);padding:10px 14px;cursor:pointer;transition:background .25s}
.wrow::after{content:"";position:absolute;left:84px;right:0;bottom:0;height:1px;background:var(--sep);transform:scaleY(.5);transform-origin:bottom}
.wrow:last-child::after{display:none}
.wrow::before{content:"";grid-column:3;grid-row:1;justify-self:end;width:7px;height:7px;border-right:2px solid var(--faint);border-top:2px solid var(--faint);transform:rotate(45deg)}
.wrow:hover{background:#FCFAF7}
.wrow:active{background:var(--press);transition:none}
.wrow[aria-current=true]{background:var(--accent-soft)}
.wrow:focus-visible{outline:3px solid rgba(174,99,61,.35);outline-offset:-3px}
.wrow.done .wthumb,.wrow.done .wtext{opacity:.6}
.wthumb{position:relative;width:56px;height:56px;border-radius:8px;overflow:hidden;background:var(--fill);box-shadow:0 1px 3px rgba(40,25,10,.18);display:grid;place-items:center}
.wthumb img{position:absolute;inset:0;z-index:1;width:100%;height:100%;object-fit:cover;display:block}
.wthumb .disc{width:60%;height:60%}
.wtext{min-width:0}
.album .yr{font-size:13px;font-weight:500;color:var(--muted);margin-left:4px;font-variant-numeric:tabular-nums}
.wmeta{display:flex;flex-wrap:wrap;align-items:center;margin-top:3px;font-size:13px;color:var(--muted);line-height:1.4}
.wmeta>span+span::before{content:"\00b7";margin:0 6px;color:var(--faint);font-weight:400}
.who{font-weight:600;color:var(--text)}
.wmeta .who+.who::before{content:"og";margin:0 4px;color:inherit;font-weight:600}
.own{font-weight:600;color:var(--accent)}
.own.alt{color:var(--text)}
.wnote{display:block;font-size:13px;color:var(--text);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wnote::before{content:"\201C"}
.wnote::after{content:"\201D"}
.layout>div{min-width:0}
.wjump{display:flex;gap:3px;max-width:100%;margin:0 0 16px;padding:6px 6px 0;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:linear-gradient(transparent calc(100% - 9px),#D9D2C5 calc(100% - 9px));border-radius:0 0 8px 8px}
.wjump::-webkit-scrollbar{display:none}
.wjump button{flex:none;min-width:38px;height:38px;padding:0 6px 6px;border:0;border-radius:8px 8px 0 0;background:linear-gradient(#ECE7DE,#E2DCD1);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 -1px 2px rgba(40,25,10,.08);color:#1D1D1F;font-weight:800;font-size:16px;cursor:pointer;transition:transform .15s var(--ease)}
.wjump button:hover{transform:translateY(-3px)}
.wjump button:active{transform:translateY(-5px);background:linear-gradient(#F3EFE8,#E8E2D8)}
.wgroup{margin-bottom:18px}
.wdiv{position:relative;scroll-margin-top:var(--tb,120px);padding-top:30px}
.wdiv .tab{position:absolute;top:0;left:calc((100% - 72px) * var(--k,0) / 4);width:72px;height:34px;border-radius:9px 9px 0 0;background:linear-gradient(#ECE7DE,#E2DCD1);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 -1px 2px rgba(40,25,10,.08);display:grid;place-items:center;font-size:21px;font-weight:800;color:#1D1D1F;letter-spacing:0}
.wdiv .edge{height:20px;border-radius:10px 10px 0 0;background:linear-gradient(#E2DCD1,#D9D2C5);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 -1px 2px rgba(40,25,10,.06)}
.wdiv+.card{position:relative;margin-top:-6px;box-shadow:0 -2px 6px rgba(40,25,10,.10),0 1px 2px rgba(40,25,10,.04)}
.wfold{display:flex;align-items:center;gap:8px;border:0;background:none;color:var(--muted);font-weight:600;font-size:13px;letter-spacing:.02em;text-transform:uppercase;padding:8px 16px 6px;cursor:pointer}
.wfold::after{content:"";width:6px;height:6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .25s var(--ease)}
.wfold[aria-expanded=true]::after{transform:translateY(-2px) rotate(45deg)}
.wempty{background:var(--card);border-radius:14px;padding:36px 20px;text-align:center;color:var(--muted);font-size:15px;margin-bottom:22px}
.wempty .disc{width:72px;height:72px;margin:0 auto 14px}
.wempty b{display:block;color:var(--ink);font-size:17px;margin-bottom:4px}
.wempty .addbtn{margin-top:16px;font-size:15px;padding:9px 18px}
.box{background:var(--bg);border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:15px;color:var(--text);white-space:pre-line}
.box b{display:block;color:var(--ink)}
.box .boxh{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.02em;font-weight:600;margin-bottom:2px}
.box.warn{background:#FFF4D6}
.box.ok{background:#E5F3E8}
.box.ok b{color:#1F6B35}
.box .same button{padding:8px 6px;font-size:15px}
.box .same{white-space:normal;margin-top:4px}
.acts{display:grid;gap:8px;margin:18px 0 6px}
.btn1,.btn2{border:0;border-radius:12px;font-weight:600;font-size:17px;padding:13px;cursor:pointer;transition:opacity .15s,background .2s}
.btn1{background:var(--accent);color:#fff}
.btn1:hover{background:#935434}
.btn2{background:var(--fill);color:var(--accent)}
.btn1:active,.btn2:active{opacity:.7;transition:none}
.btn1:disabled{opacity:.6;cursor:default}
.btn2.danger{color:#C0392B}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.btn2.armed{background:#C0392B;color:#fff}
.shops{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.shops a{background:var(--fill);color:var(--ink);text-decoration:none;font-size:14px;font-weight:600;border-radius:999px;padding:7px 14px}
.shops a:active{background:var(--fill2)}
.wform .by{color:var(--muted);font-size:15px}
.wsearch{margin:0 0 12px}
.wsearch input{background:var(--fill)}
.wres{box-shadow:var(--shadow);margin-bottom:6px}
.flabel{display:block;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.02em;font-weight:600;margin:20px 0 8px}
.fields{background:var(--bg);border-radius:12px;overflow:hidden}
.fields input{display:block;width:100%;border:0;background:transparent;font:inherit;font-size:17px;padding:12px 14px;color:var(--ink);box-shadow:inset 0 -1px 0 var(--sep);outline:none;border-radius:0}
.fields input:last-child{box-shadow:none}
.fields input:focus{background:#fff}
.wform textarea{display:block;width:100%;min-height:84px;resize:vertical;border:0;border-radius:12px;background:var(--bg);font:inherit;font-size:17px;padding:12px 14px;color:var(--ink);outline:none}
.wform textarea:focus,.fields:focus-within{box-shadow:0 0 0 3px rgba(174,99,61,.28)}
.wform .seg{display:flex}
.wform .seg button{flex:1;padding:8px 10px;font-size:15px}
.multi{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.multi button{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:10px;background:var(--fill);color:var(--ink);font-weight:500;font-size:15px;padding:9px 10px;cursor:pointer;transition:background .2s,color .2s}
.multi button::before{content:"";width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--faint);flex:none}
.multi button[aria-pressed=true]{background:var(--accent-soft);color:var(--accent);font-weight:600}
.multi button[aria-pressed=true]::before{box-shadow:none;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.2l2.4 2.4 4.6-5' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/100% no-repeat}
.multi button:active{opacity:.7}
.fhint{margin:6px 0 0;font-size:13px;color:var(--muted)}
.fhead{display:flex;gap:14px;align-items:center;margin:8px 0 0}
.fhead .wthumb{width:88px;height:88px;flex:none;border-radius:10px}
.fhead b{display:block;color:var(--ink);font-size:17px;line-height:1.3}
.fhead span.fby{display:block;color:var(--muted);font-size:15px}
.linkbtn{border:0;background:none;color:var(--accent);font-weight:600;font-size:15px;padding:8px 0;cursor:pointer;text-align:left}
.ferr{color:#C0392B;font-size:15px;margin:10px 0 0}
.ferr:empty{display:none}
#fwarn .box{margin:14px 0 0}
.toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translate(-50%,16px);background:rgba(29,29,31,.92);color:#fff;padding:10px 18px;border-radius:999px;font-size:15px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .25s,transform .4s var(--ease);z-index:40;white-space:nowrap}
.toast.on{opacity:1;transform:translate(-50%,0)}
footer{color:var(--muted);font-size:13px;padding:0 0 36px;text-align:center}
:focus-visible{outline-color:var(--accent)}
@media (hover:none){.wrow:hover{background:var(--card)}.wrow[aria-current=true]{background:var(--accent-soft)}.row:hover{background:var(--card)}.row[aria-current=true]{background:var(--accent-soft)}.same button:hover{background:none}}
@media (max-width:1100px) and (min-width:901px){.layout{grid-template-columns:minmax(0,1fr) 360px}}
@media (max-width:900px){
  .wrap{padding:0 16px}
  .top{padding-top:20px}
  .top h1{font-size:30px}
  .top h1.sign{font-size:19px;letter-spacing:.07em;gap:10px;padding:10px 16px 10px 10px}
  .sign .mark{width:28px;height:28px}
  .meta{padding-left:0;flex-direction:column;align-items:flex-start;gap:0}
  .meta .ver::before{display:none}
  .layout{grid-template-columns:1fr}
  .detail{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:20;height:calc(100% - 44px);max-height:none;border-radius:14px 14px 0 0;padding:0 16px calc(32px + env(safe-area-inset-bottom));transform:translateY(105%);visibility:hidden;will-change:transform}
  body.open .detail,.detail.moving{visibility:visible}
  .grab{display:flex;position:sticky;top:0;z-index:2;justify-content:space-between;align-items:center;margin:0 -16px 6px;padding:14px 16px 8px;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);touch-action:none;cursor:grab}
  .grab::before{content:"";position:absolute;top:6px;left:50%;width:36px;height:5px;margin-left:-18px;border-radius:3px;background:var(--fill2)}
  .grab .done{border:0;background:none;color:var(--accent);font-weight:600;font-size:17px;padding:4px 0;cursor:pointer}
  .scrim{display:block;position:fixed;inset:0;z-index:19;background:rgba(0,0,0,.32);opacity:0;pointer-events:none;will-change:opacity}
  body.open .scrim{pointer-events:auto}
  body.open{overflow:hidden}
  .sleeve{max-width:360px;margin-left:auto;margin-right:auto}
  .hint{display:none}
  .count{margin-left:0;width:100%}
  .controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .controls .seg{grid-column:1/-1;display:flex}
  .controls .seg button{flex:1}
  .controls select{width:100%}
  .count{grid-column:1/-1}
  .seg .n{display:none}
  .views{margin-left:0;max-width:none}
  .wbar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .wbar .seg{grid-column:1/-1;display:flex}
  .wbar .seg button{flex:1}
  .wbar select{width:100%}
  .wbar .addbtn{margin-left:0;padding:7px 10px}
  .wrow{grid-template-columns:52px minmax(0,1fr) 10px;gap:12px;padding:9px 12px}
  .wthumb{width:52px;height:52px}
  .wrow::after{left:76px}
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
    <h1 class="sign"><span class="mark" aria-hidden="true"></span>Pladesamlingen</h1>
    <a class="logout" href="__BASE__/?log-ud">Log ud</a>
  </header>
  <div class="meta"><span id="stats"><span class="disc spin small"></span>Henter samlingen…</span><span class="ver" id="version" hidden></span></div>
  <div class="seg views" role="group" aria-label="Vis" id="views"><span class="thumb"></span>
    <button data-view="samling" aria-pressed="true">Samlingen</button>
    <button data-view="onsker" aria-pressed="false">Ønskelisten<span class="vn" id="wcount"></span></button>
  </div>
</div>
<div class="toolbar" id="toolbar">
  <div class="wrap">
    <div id="ctools">
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
        <option value="dyr">Pris, højeste først</option>
        <option value="billig">Pris, laveste først</option>
      </select>
      <span class="count" id="count"></span>
    </div>
    </div>
    <div id="wtools" hidden>
      <div class="wbar">
        <div class="seg" role="group" aria-label="Hvem ønsker" id="wseg"><span class="thumb"></span>
          <button data-who="" aria-pressed="true">Alle<span class="n" id="wn-all"></span></button>
          <button data-who="Benjamin" aria-pressed="false">Benjamin<span class="n" id="wn-Benjamin"></span></button>
          <button data-who="Nils" aria-pressed="false">Nils<span class="n" id="wn-Nils"></span></button>
        </div>
        <select id="wsort" aria-label="Sortér ønskelisten">
          <option value="artist">Kunstner A–Å</option>
          <option value="new">Nyeste først</option>
          <option value="album">Album A–Å</option>
          <option value="dyr">Pris, højeste først</option>
          <option value="billig">Pris, laveste først</option>
        </select>
        <button class="addbtn" id="wadd"><span aria-hidden="true">+</span> Tilføj plade</button>
      </div>
    </div>
  </div>
</div>
<div class="wrap layout">
  <div><div id="songs"></div><div id="list" role="list"></div><div id="wlist" hidden></div></div>
  <aside class="detail" id="detail" aria-live="polite">
    <div class="grab" id="grab"><span></span><button class="done" id="done">Færdig</button></div>
    <div id="dbody"><div class="hint"><div class="disc"></div>Klik på en plade for at se coveret og alle oplysninger fra Excel-arket.</div></div>
  </aside>
  <div class="scrim" id="scrim"></div>
</div>
<footer class="wrap" id="foot"></footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
/*__SEARCH__*/
(function () {
  var BASE = "__BASE__";
  Search.setup(BASE);
  var shelf = null;
  // Answers are remembered in this browser for a month, so a second search is instant.
  function remembered(key, work) {
    var k = "nils2:" + key, v = (shelf && shelf.version) || "";
    try { var hit = JSON.parse(localStorage.getItem(k)); if (hit && hit.v === v && Date.now() - hit.t < 30 * 864e5) return Promise.resolve(hit.d); } catch (e) {}
    return work().then(function (d) {
      if (d && !d.retry && !d.partial && !d.error) { try { localStorage.setItem(k, JSON.stringify({ v: v, t: Date.now(), d: d })); } catch (e) {} }
      return d;
    });
  }
  var records = [], shown = [], kind = "", ver = "", limit = 300, current = -1, pushed = false;
  var covers = {};
  var $ = function (id) { return document.getElementById(id); };
  var collator = new Intl.Collator("da", { sensitivity: "base", numeric: true });

  // Format with the number of discs, like "2×LP" for a double album.
  function format(r) { return (r.n > 1 ? r.n + "\u00d7" : "") + (r.m || r.t); }
  // A small drawing of a record or a CD (two of them for a double album).
  function glyph(r) { return '<span class="fmt' + (r.t === "Vinyl" ? " v" : "") + (r.n > 1 ? " x2" : "") + '" title="' + esc(format(r)) + '" aria-label="' + esc(format(r)) + '"></span>'; }
  // After the artist: the format only when it says more than the drawing (2×LP, Single), and Kopi or Bootleg.
  function extra(r) {
    var f = r.n > 1 || (r.m && r.m !== "LP" && r.m !== "CD") ? '<span class="fx">' + esc(format(r)) + "</span>" : "";
    return f + (r.v === "Kopi" || r.v === "Bootleg" ? '<span class="fx' + (r.v === "Bootleg" ? " b" : "") + '">' + r.v + "</span>" : "");
  }
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
      shelf = Search.openShelf({ version: data.version, records: records });
      var counts = { Vinyl: 0, CD: 0 };
      records.forEach(function (r) { counts[r.t] = (counts[r.t] || 0) + 1; });
      $("n-all").textContent = num(records.length);
      $("n-Vinyl").textContent = num(counts.Vinyl);
      $("n-CD").textContent = num(counts.CD);
      moveThumb();
      $("stats").textContent = num(records.length) + " plader: " + num(counts.Vinyl) + " vinyl og " + num(counts.CD) + " CD";
      showWorth();
      var v = $("version");
      v.hidden = false;
      v.textContent = "Excel-ark fra " + versionDate(data.version) + ", lagt ind " + dkDate(data.loaded);
      v.title = data.file;
      $("foot").textContent = "Data: " + data.file + " · lagt ind " + dkDate(data.loaded);
      render();
      renderWishes();
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
      if (s === "dyr" || s === "billig") return byPrice(s, worth(a), worth(b)) || collator.compare(a.a, b.a);
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
        glyph(r) +
        '<span><span class="album">' + highlight(r.b || "Uden titel", res.words) + '</span><span class="artist">' + highlight(r.a, res.words) + extra(r) + "</span></span>" +
        '<span class="year">' + esc(r.y) + tagFor(r) + "</span></button>";
    });
    html += "</div></div>";
    if (shown.length > limit) html += '<button class="more" id="more">Vis flere (' + num(shown.length - limit) + " tilbage)</button>";
    $("list").innerHTML = html;
    watchThumbs();
  }

  var creditCache = {}, people = {};
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
      state.credits = c || null; redraw();
    });
    var show = function (c) {
      if (c && c.url) { noteFound(r, c); sameThumb(r, c.url); }
      if (!box.isConnected || current !== r.i) return;
      var shown = box.querySelector("img");
      if (shown && c && c.url && shown.getAttribute("src") !== c.url) { shown.remove(); shown = null; }
      if (c && c.url && shown) {
        if (c.valgt) { $("src").textContent = "I har selv valgt dette cover."; if ($("pickbtn")) $("pickbtn").textContent = "Vælg et andet cover"; }
        else if (c.kilde) $("src").textContent = "Cover fra " + c.kilde + ". Det er fundet automatisk og kan i sjældne tilfælde være forkert.";
      } else if (c && c.url) {
        var img = new Image();
        img.alt = "Cover: " + r.b;
        img.onload = function () { var m = box.querySelector(".msg"); if (m) m.remove(); img.className = "ok"; };
        img.onerror = function () { noCover(r, box); };
        img.src = c.url;
        box.appendChild(img);
        if (c.valgt) { $("src").textContent = "I har selv valgt dette cover."; if ($("pickbtn")) $("pickbtn").textContent = "Vælg et andet cover"; }
        else if (c.kilde) $("src").textContent = "Cover fra " + c.kilde + ". Det er fundet automatisk og kan i sjældne tilfælde være forkert.";
      } else { noCover(r, box); if ($("pickbtn")) $("pickbtn").textContent = "Vælg et cover"; }
      state.info = c || null;
      redraw();
    };
    var mine = chosen[recKey(r)];
    if (mine && mine.t && mine.t.length) show({ url: mine.u, valgt: true, tracks: mine.t, spor: mine.k || "Apple Music" });
    else if (mine) load(covers, "/info", r).then(function (c) { show({ url: mine.u, valgt: true, tracks: (c && c.tracks) || [], spor: c && c.spor }); });
    else {
      // Found before (here or as the small cover in the list): show it at once, while the track
      // list is fetched. If the list is still looking for its small cover, use that when it comes.
      var seen = known(recKey(r));
      var showEarly = function (seen) { if (!seen || !box.isConnected || current !== r.i || box.querySelector("img")) return; var early = new Image(); early.alt = "Cover: " + r.b; early.onload = function () { var m = box.querySelector(".msg"); if (m) m.remove(); early.className = "ok"; }; early.onerror = function () { early.remove(); }; early.src = seen; box.appendChild(early); };
      if (seen) showEarly(seen);
      else if (quick[recKey(r)]) quick[recKey(r)].then(function (c) { if (c && c.url) showEarly(c.url); });
      load(covers, "/info", r).then(show);
    }
  }

  // Guide prices from Discogs for the vinyl records. They are looked up every week by a GitHub
  // Action (tools/discogs-priser.mjs), not from here: Discogs turns Cloudflare's servers away.
  var prices = {}, pricesOn = false;
  fetch(BASE + "/priser", { credentials: "same-origin" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (d) {
      if (!d || !d.priser) return;
      prices = d.priser;
      pricesOn = Object.keys(prices).length > 0;
      if (!pricesOn) return;
      if (/^(dyr|billig)$/.test($("sort").value)) render();
      paintPrices();
      showWorth();
      if (typeof renderWishes === "function" && wishes) renderWishes();
      if (!$("price") && records[current]) open(current, true);
      else if (!$("price") && wishOpen) openWish(wishOpen, true);
    })
    .catch(function () {});
  // After a lookup was started from the page: fetch the prices again when it should be done
  // (and once more a bit later, in case GitHub was slow).
  var refreshTimer = null;
  function refreshPrices(ms, again) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      fetch(BASE + "/priser", { credentials: "same-origin", cache: "no-cache" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) {
          if (!d || !d.priser) return;
          var changed = JSON.stringify(d.priser) !== JSON.stringify(prices);
          prices = d.priser;
          paintPrices();
          showWorth();
          var top = $("ptop"), r = records[current];
          if (top && r) top.outerHTML = priceTop(r, prices[recKey(r)]);
          if (!changed && !again) refreshPrices(120000, true);
          else if (changed) toast("Prisen er opdateret.");
        })
        .catch(function () {});
    }, ms);
  }
  function kr(n) { return num(n) + " kr."; }
  // Only vinyl gets a price: CDs are rarely worth much (Benjamin's wish).
  function priced(r) { return r.t ? r.t === "Vinyl" : !/^CD/i.test(r.m || ""); }
  // Discogs' grades, best first, in plain Danish. VG+ (a nice used copy) is the default.
  var GRADES = [["M", "Ny (M)"], ["NM", "Næsten ny (NM)"], ["VG+", "Pæn (VG+)"], ["VG", "God (VG)"], ["G+", "Brugt (G+)"], ["G", "Slidt (G)"], ["F", "Meget slidt (F)"], ["P", "Dårlig (P)"]];
  function gradeName(g) { for (var k = 0; k < GRADES.length; k++) if (GRADES[k][0] === g) return GRADES[k][1]; return g; }
  function gradeOf(r) { var ed = editions && editions[recKey(r)]; return (ed && ed.s) || "VG+"; }
  // The price for a grade: Discogs' suggestion for it, else the general price.
  function priceAt(p, g) { return p && p.s && p.s[g] ? p.s[g] : p && p.p; }
  function wishTag(w) {
    var p = !w.bought && w.format !== "CD" && prices[wishKey(w)];
    if (p && p.ml) return ' <span class="tag" title="Billigste til salg på Discogs, alle udgaver">fra ' + kr(p.ml) + "</span>";
    return p && p.p ? ' <span class="tag" title="Vejledende pris fra Discogs (pæn stand)">' + kr(p.p) + "</span>" : "";
  }
  // For sorting by price: what a record is worth (0 when there's no price; those go last).
  function worth(r) { return priced(r) ? priceAt(prices[recKey(r)], gradeOf(r)) || 0 : 0; }
  function wishWorth(w) { var p = !w.bought && w.format !== "CD" && prices[wishKey(w)]; return (p && (p.ml || p.p)) || 0; }
  function byPrice(s, a, b) { if (!a || !b) return (b ? 1 : 0) - (a ? 1 : 0); return s === "dyr" ? b - a : a - b; }
  // A reliable price: looked up with your own copy's catalogue number, and Discogs found a
  // pressing with exactly that number. Shown with a check mark on a deeper gold sticker.
  function plain(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function sure(r, p) {
    var ed = editions && editions[recKey(r)];
    return !!(p && p.p && p.ed && p.ed.c && ed && ed.c === p.ed.c && plain(p.d).indexOf(plain(p.ed.c)) >= 0);
  }
  function sticker(r, p, v) {
    return sure(r, p) ? '<span class="tag sure" title="Pålidelig pris: fundet ud fra jeres eget katalognummer">✓ ' + kr(v) + "</span>"
      : '<span class="tag" title="Vejledende pris fra Discogs (gættet udgave)">' + kr(v) + "</span>";
  }
  function tagFor(r) {
    if (!priced(r)) return "";
    var p = prices[recKey(r)], v = priceAt(p, gradeOf(r));
    return v ? sticker(r, p, v) : "";
  }
  function paintPrices() {
    var rows = document.querySelectorAll(".row[data-i] .year");
    for (var k = 0; k < rows.length; k++) {
      var r = records[+rows[k].parentNode.getAttribute("data-i")];
      if (!r) continue;
      var old = rows[k].querySelector(".tag"), html = tagFor(r);
      if (old && !html) old.remove();
      else if (html && (!old || old.outerHTML !== html)) { if (old) old.remove(); rows[k].insertAdjacentHTML("beforeend", html); }
    }
  }
  function showWorth() {
    if (!records.length || !$("stats")) return;
    var sum = 0, n = 0, vinyl = 0;
    records.forEach(function (r) { if (!priced(r)) return; vinyl++; var v = priceAt(prices[recKey(r)], gradeOf(r)); if (v) { sum += v; n++; } });
    var el = $("worth");
    if (!n) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("span"); el.id = "worth"; el.className = "worth"; $("stats").appendChild(el); }
    el.textContent = "Vinyl vurderet til ca. " + kr(Math.round(sum / 100) * 100) + (n < vinyl ? " (" + num(n) + " af " + num(vinyl) + " har pris)" : "");
  }
  // Wishes are kept under their own id, so editing a wish's details doesn't lose its price.
  function wishKey(w) { return "ønske:" + w.id; }
  var LINK = function (p) { return p.u ? ' <a href="' + esc(p.u) + '" target="_blank" rel="noopener">Discogs ›</a>' : ""; };
  function priceSlot(r, key) {
    if (!pricesOn || !priced(r)) return "";
    var p = prices[key || recKey(r)];
    // On the wishlist: what each grade is worth, so you know a fair price when shopping.
    if (key) {
      if (!p) return "";
      if (!p.p) return '<div class="price"><span class="tag none">–</span><p><b>Ingen pris fundet</b>' + LINK(p) + "</p></div>";
      var rows = GRADES.filter(function (g) { return p.s && p.s[g[0]] && /^(NM|VG\+|VG|G\+)$/.test(g[0]); });
      // Discogs' suggestions run far above the market for records with many copies for sale (new
      // records especially). Then the cheapest copy for sale sets the level: near mint at most 2.5
      // times that, lower grades less.
      var CAP = { NM: 2.5, "VG+": 2, VG: 1.5, "G+": 1.1 };
      var at = function (g) { var v = p.s[g]; return p.l && p.n >= 10 && v > p.l * CAP[g] ? Math.max(p.l, Math.round(p.l * CAP[g] / 10) * 10) : v; };
      return '<div class="price wp"><p><b>Hvad er en god pris?</b>' +
        (p.ml ? "Billigste vinyl, alle udgaver (også nye): " + kr(p.ml) + (p.mn ? " (" + num(p.mn) + " til salg)" : "") + (p.mu ? ' <a href="' + esc(p.mu) + '" target="_blank" rel="noopener">Se alle ›</a>' : "") : "") + "</p>" +
        (rows.length && p.d ? '<p class="for">Denne udgave' + (p.d ? " (" + esc(p.d.split(" · ").slice(-2).join(" ")) + ")" : "") + ", efter stand:</p>" : "") +
        (rows.length ? '<table class="grades">' + rows.map(function (g) { return "<tr><td>" + esc(g[1]) + '</td><td><span class="tag">' + kr(at(g[0])) + "</span></td></tr>"; }).join("") + "</table>" : "") +
        "<p>" + (p.l ? "Billigste til salg: " + kr(p.l) + (p.n ? " (" + num(p.n) + " stk.)" : "") + " ·" : "") + LINK(p) + "</p></div>";
    }
    // Your own record: the price, and your copy's details always at hand below it.
    var ed = (editions && editions[recKey(r)]) || {};
    var g = ed.s || "VG+";
    return '<div class="price own" id="edition">' + priceTop(r, p) +
      '<div class="edrow">' +
      '<label class="c">Kat.nr.<input id="ed-c" autocomplete="off" value="' + esc(ed.c || "") + '" placeholder="fx PCS 7088"></label>' +
      '<label class="y">År<input id="ed-y" inputmode="numeric" maxlength="4" autocomplete="off" value="' + esc(ed.y || "") + '" placeholder="fx 1976"></label>' +
      '<label class="s">Stand<select id="ed-s">' + GRADES.map(function (x) { return '<option value="' + x[0] + '"' + (g === x[0] ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select></label>" +
      "</div></div>";
  }
  function priceTop(r, p) {
    if (!p) return '<div class="ptop" id="ptop"><span class="tag none">–</span><p><b>Vejledende pris</b>Slås op inden for en time.</p></div>';
    if (!p.p) return '<div class="ptop" id="ptop"><span class="tag none">–</span><p><b>Ingen pris fundet</b>' + (p.id ? "Discogs har ingen pris." : "Ikke fundet på Discogs.") + LINK(p) + "</p></div>";
    var g = gradeOf(r), own = p.ed && (p.ed.c || p.ed.y);
    return '<div class="ptop" id="ptop">' + sticker(r, p, priceAt(p, g)) + "<p><b>" + (sure(r, p) ? "Pålidelig pris" : "Vejledende pris") + "</b>" +
      (p.s && p.s[g] ? "Stand " + esc(g) : p.k === "vg" ? "Stand VG+" : "Billigste til salg") + (p.l && p.k === "vg" ? " · billigste til salg " + kr(p.l) : "") + (p.d ? " · " + (own ? "" : "gæt: ") + esc(p.d) : "") + LINK(p) + "</p></div>";
  }

  // Your own copy: the catalogue number from the centre label, the year of this pressing and its
  // condition. Saved on the server as soon as a field is changed; the next price lookup (within the
  // hour) uses the number and year to find that pressing, the condition changes the price at once.
  var editions = null;
  fetch(BASE + "/udgaver", { credentials: "same-origin" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (d) { if (d && d.udgaver) { editions = d.udgaver; if (/^(dyr|billig)$/.test($("sort").value)) render(); paintPrices(); showWorth(); if (records[current] && !(document.activeElement && /^ed-/.test(document.activeElement.id || ""))) open(current, true); } })
    .catch(function () {});
  function saveEdition(r) {
    if (!$("ed-c")) return;
    var c = $("ed-c").value.trim(), y = $("ed-y").value.trim(), g = $("ed-s").value;
    var before = (editions && editions[recKey(r)]) || {};
    var moved = c !== (before.c || "") || y !== (before.y || "");
    if (!moved && (before.s || "VG+") === g) return;
    if (y && !/^(19|20)\d\d$/.test(y)) { toast("Årstallet skal være fire cifre, fx 1975."); return; }
    fetch(BASE + "/udgaver", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ r: { a: r.a, b: r.b, y: r.y, m: r.m }, c: c, y: y, s: g === "VG+" ? "" : g }) })
      .then(function (res) { return res.json().then(function (d) { if (!res.ok) throw d; return d; }); })
      .then(function (d) {
        editions = d.udgaver || editions;
        var top = $("ptop");
        if (top && current === r.i) top.outerHTML = priceTop(r, prices[recKey(r)]);
        paintPrices();
        showWorth();
        if (d.opslag) { toast("Gemt. Slår din udgave op på Discogs nu, prisen kommer om et par minutter."); refreshPrices(150000); }
        else toast(moved ? (c || y ? "Gemt. Prisen for din udgave kommer inden for en time." : "Fjernet. Udgaven gættes igen inden for en time.") : "Gemt.");
      })
      .catch(function (e) { toast((e && e.fejl) || "Kunne ikke gemme. Prøv igen."); });
  }
  $("detail").addEventListener("change", function (e) {
    if (e.target && /^ed-[cys]$/.test(e.target.id) && records[current]) saveEdition(records[current]);
  });
  $("detail").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && /^ed-[cy]$/.test(e.target.id)) e.target.blur();
  });

  // Covers chosen by hand, shared by everyone who uses the page (kept on the server).
  // Covers found automatically are remembered on the server too, so each record is only looked up
  // once, ever, and every device shows its cover at once.
  var chosen = {}, found = {}, knownReady = false, newFound = {}, foundTimer = null;
  function recKey(r) { return [r.a, r.b, r.y, r.m].join("|"); }
  function ready() { if (knownReady) return; knownReady = true; paintChosen(); pump(); }
  fetch(BASE + "/omslag", { credentials: "same-origin" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (d) { if (d) { chosen = d.omslag || {}; found = d.fundne || {}; } ready(); })
    .catch(ready);
  setTimeout(ready, 3000);
  function noteFound(r, c) {
    var key = recKey(r);
    if (!c || !c.url || c.valgt || found[key] === c.url || chosen[key]) return;
    found[key] = c.url;
    newFound[key] = c.url;
    clearTimeout(foundTimer);
    foundTimer = setTimeout(sendFound, 8000);
  }
  // Sent in batches, so a long scroll costs only a few saves.
  function sendFound() {
    var batch = newFound;
    if (!Object.keys(batch).length) return;
    newFound = {};
    fetch(BASE + "/omslag", { method: "POST", keepalive: true, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handling: "fundet", fundne: batch }) })
      .then(function (res) { if (!res.ok) throw 0; })
      .catch(function () { for (var k in batch) newFound[k] = batch[k]; });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") { clearTimeout(foundTimer); sendFound(); } });

  // The cover picker: search Apple Music and Deezer, and tap the right cover.
  function openPicker(r) {
    var box = $("picker");
    if (!box) return;
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    var name = (Search.artistNames(r.a)[0] || "");
    var q = (name + " " + String(r.b).replace(/[()\[\]]/g, " ")).replace(/\s+/g, " ").trim();
    box.innerHTML = '<div class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="pq" type="search" autocomplete="off" aria-label="Søg efter coveret" value="' + esc(q) + '"></div><div id="pres"></div>' +
      (chosen[recKey(r)] ? '<button class="linkbtn" id="preset">Brug det automatiske cover igen</button>' : "");
    var timer, last = "";
    var run = function () {
      var text = $("pq").value.trim();
      if (text.length < 2 || text === last) return;
      last = text;
      $("pres").innerHTML = '<div class="wait"><span class="disc spin small"></span>Søger…</div>';
      fetch(BASE + "/albumsog?" + new URLSearchParams({ q: text }), { credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) {
          if (!$("pres") || $("pq").value.trim() !== text) return;
          var list = ((d && d.results) || []).filter(function (x) { return x.cover && !/\/cover\/\//.test(x.cover); }).slice(0, 12);
          pickList = list;
          $("pres").innerHTML = list.length ? '<div class="pgrid">' + list.map(function (x, k) {
            return '<button data-pk="' + k + '" data-i="' + r.i + '"><img src="' + esc(small(x.cover, 300)) + '" alt="" loading="lazy"><b>' + esc(x.b) + "</b><span>" + esc([x.a, x.y].filter(Boolean).join(" · ")) + "</span></button>";
          }).join("") + "</div>" : '<div class="none">' + (d && d.retry ? "Søgningen svarer ikke lige nu. Prøv igen om lidt." : "Ingen covers fundet. Prøv at skrive titlen lidt anderledes.") + "</div>";
        })
        .catch(function () { if ($("pres")) $("pres").innerHTML = '<div class="none">Søgningen svarer ikke lige nu. Prøv igen om lidt.</div>'; });
    };
    $("pq").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 450); });
    $("pq").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); run(); } });
    run();
  }
  var pickList = [];
  function saveCover(r, body, done) {
    body.r = { a: r.a, b: r.b, y: r.y, m: r.m };
    fetch(BASE + "/omslag", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (d) { if (!res.ok) throw d; return d; }); })
      .then(function (d) {
        chosen = d.omslag || chosen;
        forget(recKey(r));
        paintChosen();
        if (!chosen[recKey(r)]) {
          var els = document.querySelectorAll('.row[data-i="' + r.i + '"] .fmt');
          for (var k = 0; k < els.length; k++) { var old = els[k].querySelector("img"); if (old) old.remove(); els[k].classList.remove("has"); els[k].removeAttribute("data-w"); }
          watchThumbs();
        }
        if (current === r.i) open(r.i, true);
        toast(done);
      })
      .catch(function (e) { toast((e && e.fejl) || "Kunne ikke gemme. Prøv igen."); });
  }

  // Small covers in the list. They are fetched only for the rows on screen, two at a time,
  // and remembered in this browser, so the list stays quick and the catalogues aren't flooded.
  var thumbs = (function () { try { return JSON.parse(localStorage.getItem("nils2:thumbs")) || {}; } catch (e) { return {}; } })();
  var thumbQueue = [], thumbBusy = 0, thumbPause = 0, thumbSave = null, thumbFails = 0, quick = {};
  function small(u, size) {
    size = size || 120;
    return String(u).replace(/\/\d+x\d+bb\./, "/" + size + "x" + size + "bb.").replace(/\/\d+x\d+-(\d)/, "/" + size + "x" + size + "-$1").replace(/\/front-500$/, "/front-" + (size > 250 ? 500 : 250));
  }
  function remember(key, url) {
    if (key) thumbs[key] = { u: url || "", t: Date.now() };
    clearTimeout(thumbSave);
    thumbSave = setTimeout(function () { try { localStorage.setItem("nils2:thumbs", JSON.stringify(thumbs)); } catch (e) {} }, 1000);
  }
  function forget(key) { delete thumbs[key]; remember(); }
  function known(key) {
    var c = chosen[key];
    if (c) return c.u;
    if (found[key]) return found[key];
    var t = thumbs[key];
    if (t && Date.now() - t.t < (t.u ? 30 : 3) * 864e5) return t.u;
    return null;
  }
  function setThumb(el, url) {
    var img = el.querySelector("img");
    if (img && img.getAttribute("data-u") === url) return;
    if (!img) { img = new Image(); img.alt = ""; el.appendChild(img); }
    img.className = "";
    img.setAttribute("data-u", url);
    img.onload = function () { img.className = "ok"; el.classList.add("has"); };
    img.onerror = function () { img.remove(); el.classList.remove("has"); };
    img.src = small(url);
  }
  // The big cover and the small one in the list are the same picture: when the big one is found,
  // the list gets it too.
  function sameThumb(r, url) {
    var key = recKey(r);
    if (!url || chosen[key]) return;
    if (!thumbs[key] || thumbs[key].u !== url) remember(key, url);
    var els = document.querySelectorAll('.row[data-i="' + r.i + '"] .fmt');
    for (var k = 0; k < els.length; k++) setThumb(els[k], url);
  }
  function paintChosen() {
    var els = document.querySelectorAll(".row[data-i] .fmt:not(.p)");
    for (var k = 0; k < els.length; k++) {
      var r = records[+els[k].parentNode.getAttribute("data-i")];
      var u = r && known(recKey(r));
      if (u) setThumb(els[k], u);
    }
  }
  var seer = "IntersectionObserver" in window ? new IntersectionObserver(function (list) {
    list.forEach(function (e) {
      var at = thumbQueue.indexOf(e.target);
      if (e.isIntersecting) { if (at < 0) thumbQueue.push(e.target); }
      else if (at >= 0) thumbQueue.splice(at, 1);
    });
    pump();
  }, { rootMargin: "600px 0px" }) : null;
  function watchThumbs() {
    var els = document.querySelectorAll(".row[data-i] .fmt:not(.p)");
    for (var k = 0; k < els.length; k++) {
      var el = els[k], r = records[+el.parentNode.getAttribute("data-i")];
      if (!r || el.getAttribute("data-w")) continue;
      el.setAttribute("data-w", "1");
      var u = known(recKey(r));
      if (u) setThumb(el, u);
      else if (u === null && seer) seer.observe(el);
    }
  }
  function pump() {
    if (!knownReady || Date.now() < thumbPause) return;
    while (thumbBusy < 3 && thumbQueue.length) {
      var el = thumbQueue.shift();
      if (seer) seer.unobserve(el);
      if (!el.isConnected) continue;
      var r = records[+el.parentNode.getAttribute("data-i")];
      if (!r) continue;
      var key = recKey(r), u = known(key);
      if (u !== null) { if (u) setThumb(el, u); continue; }
      thumbBusy++;
      (function (r, key) {
        load(quick, "/coversog", r).then(function (c) {
          thumbBusy--;
          if (!c || c.retry) {
            // This one didn't answer: try it again in a while. Only when several in a row fail
            // (the catalogues are busy) does the list take a short break.
            thumbFails++;
            if (thumbFails >= 3) { thumbPause = Date.now() + 8000; thumbFails = 0; setTimeout(pump, 8100); }
            setTimeout(function () { var again = document.querySelectorAll('.row[data-i="' + r.i + '"] .fmt'); for (var k = 0; k < again.length; k++) { again[k].removeAttribute("data-w"); } watchThumbs(); pump(); }, 20000);
            pump();
            return;
          }
          thumbFails = 0;
          remember(key, c.url || "");
          noteFound(r, c);
          if (c.url && !chosen[key]) { var els = document.querySelectorAll('.row[data-i="' + r.i + '"] .fmt'); for (var k = 0; k < els.length; k++) setThumb(els[k], c.url); }
          pump();
        });
      })(r, key);
    }
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
    // Only fold away a real handful of names; a couple more lines are fine to show.
    if (!hidden || hiddenCount < 4) return shown + hidden;
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
    var status = cr === undefined ? '<div class="crwait"><span class="disc spin small"></span>Henter medvirkende…</div>' : "";
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

  // A person's page: the records in the collection they made or played on, each with the songs
  // and what they did, then their other albums the same way. The server does the matching.
  var personShown = "";
  function showPerson(id, name) {
    personShown = id;
    name = name || people[id] || "";
    var back = records[current] && document.body.classList.contains("open") ? current : -1;
    $("dbody").innerHTML = (back >= 0 ? '<button class="backrec" data-i="' + back + '">‹ ' + esc(records[back].b) + "</button>" : "") +
      "<h2>" + esc(name) + '</h2><div id="person"><div class="wait"><span class="disc spin small"></span>Finder alt, ' + esc(name || "personen") +
      " har lavet eller medvirket på…</div></div>";
    $("detail").scrollTop = 0;
    setOpen(true);
    var v = (shelf && shelf.version) || "";
    // While it is being found, show what is known so far.
    var partly = function (p) {
      var box = $("person");
      if (!box || personShown !== id || !p || (!p.mine.length && !p.other.length)) return;
      if (!name && p.name) box.previousElementSibling.textContent = p.name;
      drawPerson(box, p, id);
      box.insertAdjacentHTML("afterbegin", '<div class="wait still"><span class="disc spin small"></span>Leder stadig efter flere…</div>');
    };
    remembered("person:" + id, function () {
      // Someone opened this person before: the server has kept the page.
      return fetch(BASE + "/person?" + new URLSearchParams({ id: id, v: v }), { credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; })
        .then(function (d) {
          if (d && d.person) return d.person;
          return Search.findPerson(id, shelf, partly).then(function (p) {
            if (p && !p.retry && !p.partial && !p.error) fetch(BASE + "/person", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, v: v, person: p }) }).catch(function () {});
            return p;
          });
        });
    })
      .catch(function () { return null; })
      .then(function (p) {
        var box = $("person");
        if (!box || personShown !== id) return;
        if (!p || p.retry || p.error) {
          box.innerHTML = '<div class="wait">Kunne ikke hente oplysninger lige nu.</div><button class="pmore big" data-again="' + esc(id) + '">Prøv igen</button>';
          return;
        }
        if (!name) box.previousElementSibling.textContent = p.name;
        drawPerson(box, p, id);
      });
  }

  function songLines(songs, max) {
    var line = function (x) { return '<li><span class="st">' + esc(x.s) + '</span><span class="sr">' + esc(x.r.join(", ")) + "</span></li>"; };
    var html = '<ul class="psongs">' + songs.slice(0, max).map(line).join("");
    if (songs.length > max) html += '<li class="pmore-wrap"><button class="pmore" data-more="li">Vis alle ' + songs.length + " sange</button></li>" +
      songs.slice(max).map(function (x) { return line(x).replace("<li>", '<li hidden class="later">'); }).join("");
    return html + "</ul>";
  }

  function drawPerson(box, p, id) {
    var credited = [], own = [];
    p.mine.forEach(function (m) {
      var r = records[m.i];
      if (!r) return;
      var roles = m.album.filter(function (x) { return x !== "Egen plade" && x.indexOf("Medlem af ") !== 0; });
      (m.songs.length || roles.length ? credited : own).push({ r: r, m: m, roles: roles });
    });
    var byYear = function (a, b) { return (+a.r.y || 9999) - (+b.r.y || 9999) || collator.compare(a.r.b, b.r.b); };
    credited.sort(byYear);
    own.sort(byYear);
    var html = p.about ? '<p class="by">' + esc(p.about) + "</p>" : "";
    html += '<div class="same"><h3>I din samling (' + (credited.length + own.length) + ")</h3>";
    if (!credited.length && !own.length) html += '<div class="wait">Ingen af dine plader fundet.</div>';
    credited.forEach(function (x) {
      var r = x.r;
      html += '<div class="palbum"><button class="phead" data-i="' + r.i + '">' + glyph(r) +
        '<span><span class="album">' + esc(r.b) + '</span><span class="artist">' + esc(r.a) + (r.y ? " · " + esc(r.y) : "") + "</span></span>" +
        "</button>" +
        (x.roles.length ? '<p class="prole">Hele albummet: ' + esc(x.roles.join(", ")) + "</p>" : "") +
        (x.m.songs.length ? songLines(x.m.songs, 5) : "") + "</div>";
    });
    if (own.length) {
      var hasOwn = own.some(function (x) { return x.m.album.indexOf("Egen plade") >= 0; });
      var bands = [];
      own.forEach(function (x) { x.m.album.forEach(function (a) { if (a.indexOf("Medlem af ") === 0 && bands.indexOf(a.slice(10)) < 0) bands.push(a.slice(10)); }); });
      var label = hasOwn && bands.length ? "Egne plader og plader med " + bands.join(", ") : hasOwn ? "Egne plader" : "Plader med " + bands.join(", ");
      html += '<div class="palbum plist"><p class="ptitle">' + esc(label) + " (" + own.length + ")</p>" + own.map(function (x, k) {
        var r = x.r;
        return '<button data-i="' + r.i + '"' + (k >= 8 ? ' hidden class="later"' : "") + "><span>" + esc(r.b) + " <small>" + esc(format(r)) + '</small></span><span class="y">' + esc(r.y) + "</span></button>";
      }).join("") + (own.length > 8 ? '<button class="pmore" data-more="button">Vis alle ' + own.length + "</button>" : "") + "</div>";
    }
    html += "</div>";
    if (p.other.length) {
      html += '<div class="same"><h3>Andre udgivelser (' + p.other.length + ")</h3>" + p.other.map(function (o, k) {
        return '<div class="palbum"' + (k >= 10 ? " hidden" : "") + '><p class="phead2"><span><span class="album">' + esc(o.t) + "</span>" +
          '<span class="artist">' + esc([o.a, o.type].filter(Boolean).join(" · ")) + '</span></span><span class="y">' + esc(o.y) + "</span></p>" +
          (o.album.length ? '<p class="prole">Hele albummet: ' + esc(o.album.join(", ")) + "</p>" : "") +
          (o.songs.length ? songLines(o.songs, 4) : "") + "</div>";
      }).join("") + (p.other.length > 10 ? '<button class="pmore big" id="moreother">Vis flere udgivelser (' + (p.other.length - 10) + ")</button>" : "") + "</div>";
    }
    if (p.songsTotal > p.songsChecked) html += '<p class="src">' + esc(p.name) + " er krediteret på " + p.songsTotal + " sange. De første " + p.songsChecked + " er tjekket.</p>";
    if (p.songsSkipped && !p.partial) html += '<p class="src">' + esc(p.name) + " har medvirket på så mange sange, at kun egne plader og hele albums er med her.</p>";
    if (p.partial) html += '<p class="src">Nogle oplysninger kunne ikke hentes lige nu. Prøv igen om lidt for at se det hele.</p>';
    html += '<p class="src" style="margin-top:14px">Fundet hos MusicBrainz. <a href="https://musicbrainz.org/artist/' + esc(id) + '" target="_blank" rel="noopener">Se alt om ' + esc(p.name) + " der</a></p>";
    box.innerHTML = html;
  }

  function noCover(r, box) {
    var q = encodeURIComponent(r.a + " " + r.b + " album cover");
    box.querySelector(".msg").innerHTML = '<div class="disc"></div>Intet cover fundet<a href="https://www.google.com/search?tbm=isch&q=' + q + '" target="_blank" rel="noopener">Søg efter coveret på Google</a>';
  }

  function open(i, fromHistory) {
    var r = records[i];
    if (!r) return;
    var bw = backWish;
    backWish = "";
    current = i;
    wishOpen = "";
    var rows = document.querySelectorAll(".row[aria-current],.wrow[aria-current]");
    for (var k = 0; k < rows.length; k++) rows[k].removeAttribute("aria-current");
    var row = document.querySelector('.row[data-i="' + i + '"]');
    if (row) row.setAttribute("aria-current", "true");

    var chips = [r.t, r.m && r.m !== r.t ? r.m : null, r.n > 1 ? r.n + (r.t === "Vinyl" ? " plader" : " diske") : null, r.y, r.v].filter(Boolean).map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("");
    var fields = r.f.map(function (f) { return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>"; }).join("");
    var same = records.filter(function (o) { return o.a === r.a && o !== r; })
      .sort(function (a, b) { return (+a.y || 9999) - (+b.y || 9999); });
    var sameHtml = same.length ? '<div class="same"><h3>Mere af ' + esc(r.a) + " (" + same.length + ")</h3>" +
      same.slice(0, 40).map(function (o) { return '<button data-i="' + o.i + '"><span>' + esc(o.b) + " <small>(" + esc(format(o)) + ')</small></span><span class="y">' + esc(o.y) + "</span></button>"; }).join("") + "</div>" : "";

    $("dbody").innerHTML = (bw ? '<button class="backrec" data-backwish="' + esc(bw) + '">‹ Ønskelisten</button>' : "") +
      '<div class="sleeve"><div class="vinyl' + (r.t === "CD" ? " cd" : "") + '" aria-hidden="true"><i></i></div><div class="cover" id="cover"><div class="msg"><div class="disc spin"></div>Finder cover…</div></div></div>' +
      '<p class="src" id="src"></p>' +
      '<p class="pick"><button class="pickbtn" id="pickbtn" data-i="' + r.i + '">Forkert cover?</button></p><div class="picker" id="picker" hidden></div>' +
      "<h2>" + esc(r.b || "Uden titel") + "</h2>" +
      '<p class="by"><button data-artist="' + esc(r.a) + '">' + esc(r.a) + "</button></p>" +
      '<div class="chips">' + chips + "</div>" +
      priceSlot(r) +
      '<div class="tracks" id="tracks"><h3>Sangliste</h3><div class="wait"><span class="disc spin small"></span>Henter sangliste…</div></div>' +
      "<dl>" + fields + "</dl>" + sameHtml;
    $("detail").scrollTop = 0;
    setOpen(true);
    infoFor(r);
    if (!fromHistory) setHash("r" + i);
  }

  // The open sheet has one history entry: moving between records inside it replaces that entry,
  // so the back button (and closing) always returns to the list.
  function setHash(h) {
    if (location.hash === "#" + h) return;
    if (pushed && location.hash) history.replaceState(null, "", "#" + h);
    else { pushed = true; location.hash = h; }
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
  function slide(seg) {
    var thumb = seg && seg.querySelector(".thumb");
    if (!thumb) return;
    var on = seg.querySelector('button[aria-pressed="true"]');
    if (!on || !on.offsetWidth) { thumb.style.width = "0"; return; }
    thumb.style.width = on.offsetWidth + "px";
    thumb.style.transform = "translateX(" + on.offsetLeft + "px)";
  }
  function moveThumb() { ["seg", "views", "wseg", "fwho", "fformat"].forEach(function (id) { slide($(id)); }); }
  window.addEventListener("resize", moveThumb);
  moveThumb();

  // A hairline under the toolbar only once the list scrolls beneath it.
  window.addEventListener("scroll", function () { $("toolbar").classList.toggle("scrolled", window.scrollY > 8); }, { passive: true });

  function fromHash() {
    var m = location.hash.match(/^#r(\d+)$/), w = location.hash.match(/^#o([\w-]+)$/);
    if (m) open(+m[1], true);
    else if (w) { if (view !== "onsker") switchView("onsker", true); openWish(w[1], true); }
    else if (location.hash === "#ny") { if (!$("dbody").querySelector(".wform")) openAdd(true); }
    else { setOpen(false); pushed = false; }
  }
  window.addEventListener("hashchange", fromHash);

  // Song and person search: the server looks for the song among all the collection's artists
  // and returns the records that have it, plus people with that name.
  var songQuery = "", songTimer, songAsked = "", songCache = {};
  function norm2(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['\u2019\u0060\u00b4]/g, "")
      .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
  }
  function songOffer() {
    var q = $("q").value.trim();
    clearTimeout(songTimer);
    if (q.length < 3) { songQuery = ""; songAsked = ""; $("songs").innerHTML = ""; return; }
    if (songCache[norm2(q)]) { drawSongs(q, songCache[norm2(q)]); return; }
    songAsked = "";
    $("songs").innerHTML = '<button class="songbtn" id="songbtn"><span class="note-i">♪</span><span>Søg efter sangen eller personen <b>' + esc(q) + "</b></span></button>";
    // Few or no records match by name: it is probably a song title or a person, so look it up right away.
    if (shown.length < 5 && q.length >= 4) songTimer = setTimeout(function () { searchSongs(); }, 900);
  }
  function searchSongs() {
    var q = $("q").value.trim();
    if (q.length < 3 || songAsked === norm2(q) || !shelf) return;
    songAsked = norm2(q);
    clearTimeout(songTimer);
    $("songs").innerHTML = '<div class="songs"><p class="note"><span class="disc spin small"></span>Leder i hele samlingen efter <b>' + esc(q) + "</b>… Det kan tage op til et halvt minut.</p></div>";
    remembered("sang:" + norm2(q), function () { return Search.findSongs(q, shelf); })
      .catch(function () { return { retry: true }; })
      .then(function (data) {
        if (!data.retry) songCache[norm2(q)] = data;
        if (norm2($("q").value) !== norm2(q)) return;
        drawSongs(q, data);
      });
  }
  function drawSongs(q, data) {
    var found = (data.songs || []).map(function (x) { return { r: records[x.i], s: x.s }; }).filter(function (f) {
      return f.r && (!kind || f.r.t === kind) && (!ver || f.r.v === ver);
    });
    songQuery = found.length ? q : "";
    var html = "";
    (data.people || []).forEach(function (p) { people[p.id] = p.n; });
    if ((data.people || []).length) {
      html += '<div class="songs"><h3>Personer</h3>' + data.people.map(function (p) {
        return '<button class="row" data-person="' + esc(p.id) + '"><span class="fmt p">' + personIcon + "</span>" +
          '<span><span class="album">' + esc(p.n) + '</span><span class="artist">' + esc(p.about || "Se alt, personen har medvirket på") + "</span></span>" +
          '<span></span></button>';
      }).join("") + "</div>";
    }
    if (found.length) {
      found.sort(function (a, b) { return collator.compare(a.r.a, b.r.a) || (+a.r.y || 9999) - (+b.r.y || 9999); });
      html += '<div class="songs"><h3>♪ <b>' + esc(q) + "</b> er på " + found.length + (found.length === 1 ? " plade" : " plader") + "</h3>" +
        found.map(function (f) {
          var r = f.r;
          return '<button class="row" data-i="' + r.i + '">' + glyph(r) +
            '<span><span class="album">' + esc(r.b) + '</span><span class="artist">' + esc(r.a) + extra(r) + '</span><span class="song">♪ ' + esc(f.s.join(" · ")) + "</span></span>" +
            '<span class="year">' + esc(r.y) + "</span></button>";
        }).join("") + "</div>";
    } else if (data.retry) {
      html += '<div class="songs"><p class="note">Sangsøgningen svarer ikke lige nu. Prøv igen om lidt.</p></div>';
    } else if (!html) {
      html += '<div class="songs"><p class="note">Ingen plader med en sang, der hedder <b>' + esc(q) + "</b>.</p></div>";
    }
    if (data.partial) html += '<p class="src">Nogle kilder svarede ikke, så der kan mangle plader. Prøv igen om lidt.</p>';
    $("songs").innerHTML = html;
    watchThumbs();
  }
  var personIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.8-4.4 4.3-7 8.5-7s7.7 2.6 8.5 7z"/></svg>';

  var timer;
  $("q").addEventListener("input", function () { clearTimeout(timer); clearTimeout(songTimer); timer = setTimeout(function () { render(); songOffer(); }, 120); });
  $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); render(); searchSongs(); this.blur(); } });
  $("clear").addEventListener("click", function () { $("q").value = ""; render(); songOffer(); $("q").focus(); });
  $("sort").addEventListener("change", function () { render(); });
  $("ver").addEventListener("change", function () { ver = this.value; render(); songOffer(); });
  $("seg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    kind = b.getAttribute("data-t");
    setTimeout(moveThumb, 0);
    var all = this.querySelectorAll("button");
    for (var k = 0; k < all.length; k++) all[k].setAttribute("aria-pressed", String(all[k] === b));
    render(); songOffer();
  });
  $("songs").addEventListener("click", function (e) {
    if (e.target.closest("#songbtn")) { searchSongs(); return; }
    var pn = e.target.closest("[data-person]");
    if (pn) { showPerson(pn.getAttribute("data-person")); return; }
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
    var pb = e.target.closest("#pickbtn");
    if (pb) { openPicker(records[+pb.getAttribute("data-i")]); return; }
    var pk = e.target.closest("[data-pk]");
    if (pk) {
      var x = pickList[+pk.getAttribute("data-pk")], pr = records[+pk.getAttribute("data-i")];
      if (x && pr) saveCover(pr, { handling: "vaelg", cover: x.cover, kilde: x.kilde, id: x.id }, "Coveret er gemt");
      return;
    }
    if (e.target.closest("#preset")) { var cr2 = records[current]; if (cr2) saveCover(cr2, { handling: "nulstil" }, "Det automatiske cover bruges igen"); return; }
    if (e.target.closest("#close") || e.target.closest("#done")) { close(); return; }
    if (wishClick(e)) return;
    if (e.target.closest(".phead2")) return;
    var pn = e.target.closest("[data-person]");
    if (pn) { showPerson(pn.getAttribute("data-person")); return; }
    var again = e.target.closest("[data-again]");
    if (again) { showPerson(again.getAttribute("data-again")); return; }
    var pm = e.target.closest(".pmore");
    if (pm) {
      if (pm.id === "moreother") { var hid = pm.parentNode.querySelectorAll(".palbum[hidden]"); for (var k = 0; k < hid.length && k < 15; k++) hid[k].hidden = false; if (hid.length <= 15) pm.remove(); else pm.textContent = "Vis flere udgivelser (" + (hid.length - 15) + ")"; return; }
      var later = pm.closest(".palbum").querySelectorAll(".later"); for (var j = 0; j < later.length; j++) later[j].hidden = false;
      (pm.closest(".pmore-wrap") || pm).remove();
      return;
    }
    var more = e.target.closest(".morecr");
    if (more) { more.previousElementSibling.hidden = false; more.hidden = true; return; }
    var a = e.target.closest("[data-artist]");
    if (a) { if (view !== "samling") switchView("samling"); $("q").value = a.getAttribute("data-artist"); $("sort").value = "old"; render(); songOffer(); if (window.innerWidth <= 900) close(); window.scrollTo(0, 0); return; }
    var b = e.target.closest("[data-i]");
    if (b) {
      if (e.target.closest("#person")) activePerson = personShown;
      open(+b.getAttribute("data-i"), b.classList.contains("backrec"));
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("open")) close();
    if (e.key === "/" && view === "samling" && document.activeElement !== $("q") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("q").focus(); }
  });

  // ---------- Ønskelisten: the shared wishlist ----------
  // Kept on the server (Cloudflare KV) so Benjamin and Nils see the same list.
  var view = "samling", wishes = null, wishErr = "", wishWho = "", wishShowBought = false;
  var wishOpen = "", pendingWish = "", backWish = "", wDraft = null, wEdit = "", wFound = [], addAsked = "", addTimer, delArmed = "", delTimer;
  var PEOPLE = ["Benjamin", "Nils"];
  var collectionHint = $("dbody").innerHTML;
  var wishHint = '<div class="hint"><div class="disc"></div>Klik på en plade på ønskelisten for at se coveret i stor størrelse og finde den hos pladeforhandlerne.</div>';
  var searchIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  function saved(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) {}
    return null;
  }
  function me() { var m = saved("nils-hvem"); return PEOPLE.indexOf(m) >= 0 ? m : ""; }

  // Is it already in the collection? Same artist ("Larsen, Kim" = "Kim Larsen") and same title,
  // ignoring things like "(Remastered)" and "Deluxe Edition".
  function artistKey(a) {
    a = String(a || "");
    var p = a.split(",");
    if (p.length === 2 && p[1].trim().split(/\s+/).length <= 3 && !/[&+]/.test(a)) a = p[1] + " " + p[0];
    return norm2(a);
  }
  // How a record shop files an artist: bands by name ("The Beatles" under B), people by
  // surname ("Kim Larsen" under L). The filing name comes from the collection, which already
  // writes people as "Larsen, Kim", or else from MusicBrainz ("sort name"), kept in this browser.
  var sortNames = {}, sortAsked = {}, sortQueue = [], sortBusy = false;
  try { sortNames = JSON.parse(localStorage.getItem("nils-sortnavne")) || {}; } catch (e) {}
  function filedAs(a) {
    var k = artistKey(a);
    if (sortNames[k]) return sortNames[k];
    for (var i = 0; i < records.length; i++) {
      if (records[i].a.indexOf(",") > 0 && artistKey(records[i].a) === k) return records[i].a;
    }
    if (k && !sortAsked[k]) { sortAsked[k] = true; sortQueue.push(a); askSortNames(); }
    return a;
  }
  function askSortNames() {
    if (sortBusy || !sortQueue.length) return;
    sortBusy = true;
    var a = sortQueue.shift(), k = artistKey(a);
    fetch(BASE + "/mb?" + new URLSearchParams({ p: "artist?fmt=json&limit=5&query=" + encodeURIComponent('artist:"' + a.replace(/["\\]/g, " ") + '"') }), { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var hit = d && (d.artists || []).filter(function (x) { return x.score >= 90 && artistKey(x.name) === k && x["sort-name"]; })[0];
        if (!hit) return;
        sortNames[k] = hit["sort-name"];
        try { localStorage.setItem("nils-sortnavne", JSON.stringify(sortNames)); } catch (e) {}
        renderLater();
      })
      .catch(function () {})
      .then(function () { setTimeout(function () { sortBusy = false; askSortNames(); }, 1100); });
  }
  var renderSoon;
  function renderLater() { clearTimeout(renderSoon); renderSoon = setTimeout(function () { if (view === "onsker" && $("wsort").value === "artist") renderWishes(); }, 400); }
  function shelfKey(a) {
    return String(a || "").trim().replace(/^the\s+(?=\S)/i, "").replace(/^[^0-9A-Za-zÀ-ÿ]+/, "");
  }
  function shelfLetter(a) {
    var c = shelfKey(a).charAt(0).toLocaleUpperCase("da");
    if (/[ÆØÅ]/.test(c)) return c;
    c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /[A-Z]/.test(c) ? c : "#";
  }
  function titleKey(b) {
    return norm2(String(b || "").replace(/\(.*?\)|\[.*?\]/g, " ").split(" - ")[0]
      .replace(/\b(\d+(th|st|nd|rd)? anniversary|remaster(ed)?|deluxe|expanded|edition|version|udgave)\b/gi, " "));
  }
  function sameArtist(x, y) {
    return x === y || (x.length >= 4 && y.length >= 4 && (x.indexOf(y + " ") === 0 || y.indexOf(x + " ") === 0));
  }
  function ownedOf(a, b) {
    if (!records.length || !a || !b) return [];
    var ak = artistKey(a), tk = titleKey(b);
    if (!tk) return [];
    return records.filter(function (r) {
      if (r.ak === undefined) { r.ak = artistKey(r.a); r.tk = titleKey(r.b); }
      return r.tk === tk && sameArtist(r.ak, ak);
    });
  }
  function onListOf(a, b, except) {
    if (!wishes || !a || !b) return [];
    var ak = artistKey(a), tk = titleKey(b);
    return wishes.filter(function (w) { return !w.bought && w.id !== except && titleKey(w.b) === tk && sameArtist(artistKey(w.a), ak); });
  }
  function kinds(list) {
    var out = [];
    list.forEach(function (r) { if (out.indexOf(r.t) < 0) out.push(r.t); });
    return out;
  }
  // "Står i samlingen" when they have it in the wanted format, "Har den på CD" when only in another.
  function ownLabel(w) {
    var owned = ownedOf(w.a, w.b);
    if (!owned.length) return null;
    var t = kinds(owned);
    if (!w.format || t.indexOf(w.format) >= 0) return { cls: "own", text: "Står i samlingen" };
    return { cls: "own alt", text: "Har den på " + t.join(" og ") };
  }

  function small(u) {
    return String(u || "").replace("600x600bb", "200x200bb").replace(/\/\d+x\d+-000000/, "/250x250-000000").replace("front-500", "front-250");
  }
  function thumb(u) {
    return '<span class="wthumb">' + (u ? '<img src="' + esc(small(u)) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + '<span class="disc"></span></span>';
  }
  function shortDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var o = { day: "numeric", month: "short" };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
    return d.toLocaleDateString("da-DK", o);
  }
  // Who wants it: a list of names (older entries had just one).
  function whoOf(w) { return [].concat(w && w.who || []).filter(function (p) { return PEOPLE.indexOf(p) >= 0; }); }
  function whoText(w) { return whoOf(w).join(" og "); }
  function findWish(id) { return (wishes || []).filter(function (w) { return w.id === id; })[0]; }

  var toastTimer;
  function toast(text) {
    var t = $("toast");
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 2800);
  }

  function loadWishes() {
    return fetch(BASE + "/onsker", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401) { location.href = BASE + "/"; return; }
          if (d.items) { wishes = d.items; wishErr = ""; }
          else if (wishes === null) wishErr = d.fejl || "net";
          afterWishes();
        });
      })
      .catch(function () { if (wishes === null) wishErr = "net"; afterWishes(); });
  }
  function afterWishes() {
    renderWishes();
    if (pendingWish) { var p = pendingWish; pendingWish = ""; openWish(p, true); return; }
    // Someone else may have changed the record that is open: show the fresh version.
    if (wishOpen && document.body.classList.contains("open") && $("dbody").querySelector(".wishd")) {
      if (findWish(wishOpen)) drawWish(findWish(wishOpen)); else close();
    }
  }

  // Sends one change; the server answers with the whole new list.
  function api(body) {
    return fetch(BASE + "/onsker", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401) { location.href = BASE + "/"; throw "Du er blevet logget ud."; }
          if (d.items) { wishes = d.items; wishErr = ""; renderWishes(); }
          if (!r.ok) throw d.fejl === "mangler-lager" ? "Ønskelisten er ikke sat op endnu." : d.fejl && d.fejl !== "ukendt" ? d.fejl : "Det lykkedes ikke. Prøv igen.";
          return d;
        });
      }, function () { throw "Ingen forbindelse. Prøv igen om lidt."; });
  }

  function updateWishCounts() {
    var active = (wishes || []).filter(function (w) { return !w.bought; });
    $("wcount").textContent = active.length ? active.length : "";
    $("wn-all").textContent = active.length || "";
    PEOPLE.forEach(function (p) { $("wn-" + p).textContent = active.filter(function (w) { return whoOf(w).indexOf(p) >= 0; }).length || ""; });
  }

  function renderWishes() {
    updateWishCounts();
    if (view !== "onsker") return;
    var box = $("wlist");
    if (wishErr === "mangler-lager") {
      box.innerHTML = '<div class="wempty"><div class="disc"></div><b>Ønskelisten er næsten klar</b>Den mangler bare et sted at gemme pladerne. Når det er sat op i Cloudflare, virker den her.</div>';
      return;
    }
    if (wishes === null) {
      box.innerHTML = wishErr
        ? '<div class="wempty"><div class="disc"></div><b>Ønskelisten kunne ikke hentes</b><button class="addbtn" id="wretry">Prøv igen</button></div>'
        : '<div class="empty"><span class="disc spin small"></span>Henter ønskelisten…</div>';
      return;
    }
    var mine = wishes.filter(function (w) { return !wishWho || whoOf(w).indexOf(wishWho) >= 0; });
    var active = mine.filter(function (w) { return !w.bought; });
    var bought = mine.filter(function (w) { return w.bought; });
    var s = $("wsort").value;
    active.sort(function (a, b) {
      if (s === "dyr" || s === "billig") return byPrice(s, wishWorth(a), wishWorth(b)) || collator.compare(a.a, b.a);
      if (s === "artist") return collator.compare(shelfKey(filedAs(a.a)), shelfKey(filedAs(b.a))) || collator.compare(a.b, b.b);
      if (s === "album") return collator.compare(a.b, b.b) || collator.compare(a.a, b.a);
      return String(b.added).localeCompare(String(a.added));
    });
    bought.sort(function (a, b) { return String(b.bought.at).localeCompare(String(a.bought.at)); });
    var html = "";
    if (!active.length) {
      html += '<div class="wempty"><div class="disc"></div><b>' + (wishWho ? wishWho + " har ingen ønsker på listen" : "Ønskelisten er tom") + "</b>" +
        "Sæt de plader på, I går og leder efter, så kan I begge se dem.<br><button class=\"addbtn\" data-add>+ Tilføj plade</button></div>";
    } else if (s === "artist") {
      // Split into big letters, like the bins in a record shop.
      var groups = [], at = {};
      active.forEach(function (w) {
        var l = shelfLetter(filedAs(w.a));
        if (!at[l]) { at[l] = { l: l, items: [] }; groups.push(at[l]); }
        at[l].items.push(w);
      });
      if (groups.length > 1) html += '<nav class="wjump" aria-label="Hop til bogstav">' + groups.map(function (g) { return '<button data-jump="' + g.l + '">' + g.l + "</button>"; }).join("") + "</nav>";
      groups.forEach(function (g, gi) {
        html += '<div class="group wgroup"><div class="wdiv" id="wl-' + g.l + '" style="--k:' + (gi % 5) + '"><div class="tab">' + g.l + '</div><div class="edge"></div></div><div class="card">' + g.items.map(wishRow).join("") + "</div></div>";
      });
    } else {
      html += '<div class="group"><div class="card">' + active.map(wishRow).join("") + "</div></div>";
    }
    if (bought.length) {
      html += '<button class="wfold" id="wfold" aria-expanded="' + wishShowBought + '">Købt (' + bought.length + ")</button>" +
        (wishShowBought ? '<div class="group"><div class="card">' + bought.map(wishRow).join("") + "</div></div>" : "");
    }
    box.innerHTML = html;
  }

  function wishRow(w) {
    var own = w.bought ? null : ownLabel(w);
    var facts = [w.format, w.bought ? "Købt " + (w.bought.by ? "af " + w.bought.by + " " : "") + shortDate(w.bought.at) : shortDate(w.added)].filter(Boolean).join(" · ");
    return '<button class="wrow' + (w.bought ? " done" : "") + '" data-wid="' + esc(w.id) + '"' + (w.id === wishOpen ? ' aria-current="true"' : "") + ">" + thumb(w.cover) +
      '<span class="wtext"><span class="album">' + esc(w.b) + (w.y ? ' <span class="yr">' + esc(w.y) + "</span>" : "") + '</span><span class="artist">' + esc(w.a) + "</span>" +
      '<span class="wmeta">' + whoOf(w).map(function (p) { return '<span class="who ' + p + '">' + p + "</span>"; }).join("") + "<span>" + esc(facts) + "</span>" +
      (own ? '<span class="' + own.cls + '">' + esc(own.text) + "</span>" : "") + wishTag(w) + "</span>" +
      (w.note ? '<span class="wnote">' + esc(w.note) + "</span>" : "") + "</span></button>";
  }

  function markOpenRow() {
    var rows = document.querySelectorAll(".row[aria-current],.wrow[aria-current]");
    for (var k = 0; k < rows.length; k++) rows[k].removeAttribute("aria-current");
    var row = wishOpen && document.querySelector('.wrow[data-wid="' + wishOpen + '"]');
    if (row) row.setAttribute("aria-current", "true");
  }

  function openWish(id, fromHistory) {
    if (wishes === null) { pendingWish = id; return; }
    var w = findWish(id);
    if (!w) { if (fromHistory) close(); return; }
    wishOpen = id;
    current = -1;
    markOpenRow();
    drawWish(w);
    $("detail").scrollTop = 0;
    setOpen(true);
    if (!fromHistory) setHash("o" + id);
  }

  function drawWish(w) {
    var owned = ownedOf(w.a, w.b), also = onListOf(w.a, w.b, w.id), q = encodeURIComponent(w.a + " " + w.b);
    var google = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(w.a + " " + w.b + " album cover");
    var chips = [whoOf(w).length ? "Ønsket af " + whoText(w) : "", w.format || "Vinyl eller CD", w.y, "Sat på listen " + shortDate(w.added)]
      .filter(Boolean).map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("");
    var html = '<div class="wishd"><div class="sleeve"><div class="vinyl' + (w.format === "CD" ? " cd" : "") + '" aria-hidden="true"><i></i></div><div class="cover" id="wcover"><div class="msg">' +
      (w.cover ? '<div class="disc spin"></div>' : '<div class="disc"></div>Intet cover fundet<a href="' + google + '" target="_blank" rel="noopener">Søg efter coveret på Google</a>') +
      "</div>" + (w.cover ? '<img alt="Cover: ' + esc(w.b) + '" src="' + esc(w.cover) + '">' : "") + "</div></div>" +
      "<h2>" + esc(w.b) + '</h2><p class="by"><button data-artist="' + esc(w.a) + '">' + esc(w.a) + "</button></p>" +
      '<div class="chips">' + chips + "</div>";
    var wr = { a: w.a, b: w.b, y: w.y || "", m: w.format || "" };
    if (!w.bought) html += priceSlot(wr, wishKey(w));
    if (w.note) html += '<div class="box"><span class="boxh">Note</span>' + esc(w.note) + "</div>";
    if (w.bought) {
      html += '<div class="box ok"><b>✓ Købt' + (w.bought.by ? " af " + esc(w.bought.by) : "") + " " + esc(shortDate(w.bought.at)) + "</b>Husk at skrive den ind i Excel-arket, så den kommer med i samlingen.</div>";
    } else if (owned.length) {
      var t = kinds(owned), match = !w.format || t.indexOf(w.format) >= 0;
      html += '<div class="box warn"><b>' + (match ? "Den står allerede i samlingen" : "I har den allerede på " + esc(t.join(" og "))) + '</b><div class="same">' +
        owned.slice(0, 6).map(function (r) { return '<button data-i="' + r.i + '"><span>' + esc(r.b) + " <small>(" + esc(format(r)) + ')</small></span><span class="y">' + esc(r.y) + "</span></button>"; }).join("") + "</div></div>";
    }
    if (also.length) {
      html += '<div class="box warn"><b>Står også på listen for ' + esc(also.map(function (o) { return whoText(o) || "en anden"; }).join(" og ")) + "</b>Måske kan I dele den.</div>";
    }
    html += '<div class="acts">' +
      (w.bought ? '<button class="btn2" data-act="ikke-kobt">Fortryd: ikke købt alligevel</button>' : '<button class="btn1" data-act="kobt">✓ Markér som købt</button>') +
      '<button class="btn2" data-act="ret">Ret oplysninger</button>' +
      '<button class="btn2 danger" data-act="slet">Fjern fra listen</button></div>' +
      '<div class="same"><h3>Find pladen</h3></div><div class="shops">' +
      '<a href="https://www.discogs.com/search/?type=release&q=' + q + (w.format ? "&format_exact=" + w.format : "") + '" target="_blank" rel="noopener">Discogs</a>' +
      '<a href="https://www.ebay.com/sch/i.html?_nkw=' + q + (w.format ? "+" + (w.format === "Vinyl" ? "vinyl" : "cd") : "") + '" target="_blank" rel="noopener">eBay</a>' +
      '<a href="https://www.google.com/search?q=' + q + (w.format ? "+" + (w.format === "Vinyl" ? "vinyl" : "cd") : "") + '" target="_blank" rel="noopener">Google</a>' +
      '<a href="https://open.spotify.com/search/' + encodeURIComponent(w.a + " " + w.b) + '" target="_blank" rel="noopener">Lyt på Spotify</a>' +
      "</div></div>";
    $("dbody").innerHTML = html;
    delArmed = "";
    var img = $("dbody").querySelector("#wcover img");
    if (img) {
      var shown = function () { var m = $("wcover") && $("wcover").querySelector(".msg"); if (m) m.remove(); img.className = "ok"; };
      img.onload = shown;
      img.onerror = function () { var m = $("wcover") && $("wcover").querySelector(".msg"); if (m) m.innerHTML = '<div class="disc"></div>Coveret kunne ikke vises<a href="' + google + '" target="_blank" rel="noopener">Søg efter det på Google</a>'; img.remove(); };
      if (img.complete && img.naturalWidth) shown();
    }
  }

  // Adding: search Apple Music and Deezer for the album, pick it, then say who wants it.
  function openAdd(fromHistory) {
    wDraft = { a: "", b: "", y: "", cover: "", who: me() ? [me()] : [], format: "", note: "" };
    wEdit = "";
    wishOpen = "";
    current = -1;
    markOpenRow();
    showSearch("");
    $("detail").scrollTop = 0;
    setOpen(true);
    if (!fromHistory) setHash("ny");
  }

  function showSearch(q) {
    $("dbody").innerHTML = '<div class="wform"><h2>' + (wEdit ? "Find albummet igen" : "Tilføj plade") + "</h2>" +
      '<p class="by">Søg efter kunstner og album. Siden finder selv coveret.</p>' +
      '<div class="search wsearch">' + searchIcon + '<input id="aq" type="search" enterkeyhint="search" placeholder="Fx Gasolin Gas 5" autocomplete="off" aria-label="Søg efter album" value="' + esc(q) + '"></div>' +
      '<div id="ares"></div>' +
      '<button class="linkbtn" id="amanual">' + (wEdit ? "‹ Tilbage" : "Kan du ikke finde den? Skriv den selv") + "</button></div>";
    addAsked = "";
    var input = $("aq");
    try { input.focus({ preventScroll: true }); } catch (e) {}
    if (q) runAlbumSearch();
  }

  function runAlbumSearch() {
    var input = $("aq");
    if (!input) return;
    var q = input.value.trim();
    clearTimeout(addTimer);
    if (q.length < 2) { $("ares").innerHTML = ""; addAsked = ""; return; }
    if (q === addAsked) return;
    addAsked = q;
    $("ares").innerHTML = '<div class="wait"><span class="disc spin small"></span>Leder efter <b>' + esc(q) + "</b>…</div>";
    fetch(BASE + "/albumsog?" + new URLSearchParams({ q: q }), { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : { retry: true }; })
      .catch(function () { return { retry: true }; })
      .then(function (d) {
        if (!$("aq") || addAsked !== q) return;
        wFound = d.results || [];
        if (!wFound.length) {
          if (d.retry) addAsked = "";
          $("ares").innerHTML = '<div class="wait">' + (d.retry ? "Søgningen svarer ikke lige nu. Prøv igen om lidt, eller skriv pladen ind selv." : "Ingen album fundet. Prøv med færre ord, eller skriv pladen ind selv.") + "</div>";
          return;
        }
        $("ares").innerHTML = '<div class="card wres">' + wFound.map(resultRow).join("") + "</div>";
      });
  }

  function resultRow(r, k) {
    var owned = ownedOf(r.a, r.b), listed = onListOf(r.a, r.b, wEdit);
    var facts = [r.y, r.n ? r.n + " numre" : ""].filter(Boolean).join(" · ");
    return '<button class="wrow" data-k="' + k + '">' + thumb(r.cover) +
      '<span class="wtext"><span class="album">' + esc(r.b) + '</span><span class="artist">' + esc(r.a) + "</span>" +
      '<span class="wmeta">' + (facts ? "<span>" + esc(facts) + "</span>" : "") +
      (owned.length ? '<span class="own">I samlingen (' + esc(kinds(owned).join(", ")) + ")</span>" : "") +
      (listed.length ? '<span class="own">På ønskelisten</span>' : "") + "</span></span></button>";
  }

  function segHtml(id, options, value) {
    return '<div class="seg" role="group" id="' + id + '"><span class="thumb"></span>' + options.map(function (o) {
      return '<button type="button" data-v="' + esc(o[0]) + '" aria-pressed="' + (o[0] === value) + '">' + esc(o[1]) + "</button>";
    }).join("") + "</div>";
  }

  function showForm() {
    var d = wDraft;
    $("dbody").innerHTML = '<div class="wform"><h2>' + (wEdit ? "Ret plade" : "Tilføj plade") + "</h2>" +
      (d.cover ? '<div class="fhead">' + thumb(d.cover) + '<div><b id="fhb">' + esc(d.b) + '</b><span class="fby" id="fha">' + esc(d.a) + '</span><button class="linkbtn" id="fsearch">Vælg et andet album</button></div></div>'
        : '<button class="linkbtn" id="fsearch">' + (wEdit ? "Søg efter albummet og coveret" : "‹ Søg efter albummet i stedet") + "</button>") +
      '<span class="flabel">Plade</span><div class="fields">' +
      '<input id="fa" placeholder="Kunstner" autocomplete="off" aria-label="Kunstner" value="' + esc(d.a) + '">' +
      '<input id="fb" placeholder="Album" autocomplete="off" aria-label="Album" value="' + esc(d.b) + '">' +
      '<input id="fy" placeholder="År (kan udelades)" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="År" value="' + esc(d.y) + '"></div>' +
      '<span class="flabel">Hvem ønsker den?</span>' + '<div class="multi" role="group" id="fwho">' + PEOPLE.map(function (p) { return '<button type="button" data-v="' + p + '" aria-pressed="' + (d.who.indexOf(p) >= 0) + '">' + p + "</button>"; }).join("") + "</div>" +
      '<p class="fhint">Tryk på begge, hvis I begge ønsker den.</p>' +
      '<span class="flabel">Format</span>' + segHtml("fformat", [["Vinyl", "Vinyl"], ["CD", "CD"], ["", "Ligegyldigt"]], d.format || "") +
      '<span class="flabel">Note</span><textarea id="fnote" rows="3" aria-label="Note" placeholder="Fx kun original presning, højst 200 kr., eller hvor I så den">' + esc(d.note) + "</textarea>" +
      '<div id="fwarn"></div><p class="ferr" id="ferr" role="alert"></p>' +
      '<div class="acts"><button class="btn1" id="fsave">' + (wEdit ? "Gem ændringer" : "Sæt på ønskelisten") + '</button><button class="btn2" id="fcancel">Annullér</button></div></div>';
    slide($("fformat"));
    formWarnings();
    if (!d.a) { try { $("fa").focus({ preventScroll: true }); } catch (e) {} }
  }

  function pressed(id) {
    var b = $(id) && $(id).querySelector('button[aria-pressed="true"]');
    return b ? b.getAttribute("data-v") : null;
  }
  function readForm() {
    if (!$("fa")) return;
    wDraft.a = $("fa").value.trim();
    wDraft.b = $("fb").value.trim();
    wDraft.y = $("fy").value.trim();
    wDraft.who = [].map.call($("fwho").querySelectorAll('button[aria-pressed="true"]'), function (b) { return b.getAttribute("data-v"); });
    wDraft.format = pressed("fformat") || "";
    wDraft.note = $("fnote").value.trim();
  }
  function formWarnings() {
    var box = $("fwarn");
    if (!box) return;
    var a = $("fa").value.trim(), b = $("fb").value.trim();
    var owned = ownedOf(a, b), listed = onListOf(a, b, wEdit), html = "";
    if (owned.length) html += '<div class="box warn"><b>Står allerede i samlingen</b>' + esc(owned.slice(0, 3).map(function (r) { return format(r) + (r.y ? ", " + r.y : ""); }).join(" · ")) + "</div>";
    if (listed.length) html += '<div class="box warn"><b>Står allerede på ønskelisten</b>Ønsket af ' + esc(listed.map(function (w) { return whoText(w) || "en anden"; }).join(" og ")) + (wEdit ? "" : ". Gemmer du, kommer dit navn på den samme plade, så den ikke står der to gange.") + "</div>";
    box.innerHTML = html;
  }

  function saveForm() {
    readForm();
    var d = wDraft, err = function (m) { $("ferr").textContent = m; };
    if (!d.a || !d.b) return err("Skriv både kunstner og album.");
    if (!d.who.length) return err("Vælg hvem der ønsker pladen.");
    if (d.y && !/^\d{4}$/.test(d.y)) return err("Året skal være fire tal, fx 1975.");
    if (d.who.length === 1) saved("nils-hvem", d.who[0]);
    var btn = $("fsave"), label = btn.textContent;
    btn.disabled = true;
    btn.textContent = d.cover ? "Gemmer…" : "Gemmer og leder efter coveret…";
    var editing = wEdit;
    api(editing ? { handling: "ret", id: editing, item: d } : { handling: "tilfoj", item: d })
      .then(function (res) {
        wEdit = "";
        toast(editing ? "Ændringerne er gemt" : "Sat på ønskelisten");
        openWish(res.id || editing);
      })
      .catch(function (m) { if (!$("fsave")) return; btn.disabled = false; btn.textContent = label; err(m); });
  }

  function act(name, w, button) {
    if (name === "ret") {
      wEdit = w.id;
      wDraft = { a: w.a, b: w.b, y: w.y || "", cover: w.cover || "", who: whoOf(w), format: w.format || "", note: w.note || "" };
      showForm();
      $("detail").scrollTop = 0;
      return;
    }
    if (name === "slet" && delArmed !== w.id) {
      delArmed = w.id;
      button.classList.add("armed");
      button.textContent = "Tryk igen for at fjerne den";
      clearTimeout(delTimer);
      delTimer = setTimeout(function () { delArmed = ""; if (button.isConnected) { button.classList.remove("armed"); button.textContent = "Fjern fra listen"; } }, 4000);
      return;
    }
    // Who bought it: two buttons instead of guessing.
    if (name === "kobt" && !button.getAttribute("data-by")) {
      var pair = document.createElement("div");
      pair.className = "pair";
      pair.innerHTML = PEOPLE.map(function (p) { return '<button class="btn1" data-act="kobt" data-by="' + p + '">' + p + " købte den</button>"; }).join("");
      button.replaceWith(pair);
      return;
    }
    button.disabled = true;
    api({ handling: name, id: w.id, by: button.getAttribute("data-by") || "" })
      .then(function () {
        if (name === "slet") { toast("Fjernet fra ønskelisten"); wishOpen = ""; close(); $("dbody").innerHTML = wishHint; return; }
        toast(name === "kobt" ? "Tillykke med pladen!" : "Den er på listen igen");
        var fresh = findWish(w.id);
        if (fresh && wishOpen === w.id) drawWish(fresh);
      })
      .catch(function (m) { button.disabled = false; toast(m); });
  }

  // Clicks inside the detail panel that belong to the wishlist. Returns true when handled.
  function wishClick(e) {
    var t = e.target;
    var back = t.closest("[data-backwish]");
    if (back) { openWish(back.getAttribute("data-backwish")); return true; }
    if (t.closest(".wishd")) {
      var w = findWish(wishOpen), a = t.closest("[data-act]");
      if (a && w) { act(a.getAttribute("data-act"), w, a); return true; }
      var rec = t.closest("[data-i]");
      if (rec) { backWish = wishOpen; open(+rec.getAttribute("data-i")); return true; }
      return false;
    }
    if (!t.closest(".wform")) return false;
    var many = t.closest(".multi button");
    if (many) {
      many.setAttribute("aria-pressed", String(many.getAttribute("aria-pressed") !== "true"));
      $("ferr").textContent = "";
      return true;
    }
    var seg = t.closest(".seg button");
    if (seg) {
      var all = seg.parentNode.querySelectorAll("button");
      for (var k = 0; k < all.length; k++) all[k].setAttribute("aria-pressed", String(all[k] === seg));
      slide(seg.parentNode);
      if (seg.parentNode.id === "fwho") $("ferr").textContent = "";
      return true;
    }
    var pick = t.closest("[data-k]");
    if (pick) {
      var r = wFound[+pick.getAttribute("data-k")];
      if (!r) return true;
      wDraft.a = r.a; wDraft.b = r.b; wDraft.y = r.y || ""; wDraft.cover = r.cover || "";
      showForm();
      $("detail").scrollTop = 0;
      return true;
    }
    if (t.closest("#amanual")) {
      if (wEdit) showForm();
      else { var typed = $("aq").value.trim(); wDraft.cover = ""; if (!wDraft.a && !wDraft.b && typed) wDraft.b = typed; showForm(); }
      return true;
    }
    if (t.closest("#fsearch")) { readForm(); showSearch((wDraft.a + " " + wDraft.b).trim()); return true; }
    if (t.closest("#fsave")) { saveForm(); return true; }
    if (t.closest("#fcancel")) {
      if (wEdit) { var id = wEdit; wEdit = ""; openWish(id); } else close();
      return true;
    }
    return false;
  }

  $("detail").addEventListener("input", function (e) {
    if (e.target.id === "aq") { clearTimeout(addTimer); addTimer = setTimeout(runAlbumSearch, 450); }
    if (e.target.id === "fa" || e.target.id === "fb") formWarnings();
  });
  $("detail").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (e.target.id === "aq") { e.preventDefault(); runAlbumSearch(); e.target.blur(); }
    else if (/^f[aby]$/.test(e.target.id)) { e.preventDefault(); saveForm(); }
  });

  $("wlist").addEventListener("click", function (e) {
    if (e.target.closest("[data-add]")) { openAdd(); return; }
    if (e.target.closest("#wretry")) { wishErr = ""; renderWishes(); loadWishes(); return; }
    if (e.target.closest("#wfold")) { wishShowBought = !wishShowBought; renderWishes(); return; }
    var j = e.target.closest("[data-jump]"), h = j && $("wl-" + j.getAttribute("data-jump"));
    if (h) { window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - $("toolbar").offsetHeight + 2, behavior: "smooth" }); return; }
    var row = e.target.closest("[data-wid]");
    if (row) openWish(row.getAttribute("data-wid"));
  });
  $("wadd").addEventListener("click", function () { openAdd(); });
  $("wsort").addEventListener("change", function () { saved("nils-wsort2", this.value); renderWishes(); });
  $("wseg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    wishWho = b.getAttribute("data-who");
    var all = this.querySelectorAll("button");
    for (var k = 0; k < all.length; k++) all[k].setAttribute("aria-pressed", String(all[k] === b));
    slide(this);
    renderWishes();
  });
  $("views").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b && b.getAttribute("data-view") !== view) switchView(b.getAttribute("data-view"));
  });

  // Switches between the collection and the wishlist. The open record (if any) is closed,
  // unless a link to a wish is being opened (keepSheet).
  function switchView(v, keepSheet) {
    view = v;
    saved("nils-visning", v);
    var bs = $("views").querySelectorAll("button");
    for (var k = 0; k < bs.length; k++) bs[k].setAttribute("aria-pressed", String(bs[k].getAttribute("data-view") === v));
    var wish = v === "onsker";
    $("ctools").hidden = wish;
    $("wtools").hidden = !wish;
    $("list").hidden = wish;
    $("songs").hidden = wish;
    $("wlist").hidden = !wish;
    if (!keepSheet) {
      if (document.body.classList.contains("open") || location.hash) close();
      current = -1;
      wishOpen = "";
      $("dbody").innerHTML = wish ? wishHint : collectionHint;
      markOpenRow();
    }
    setToolbarHeight();
    moveThumb();
    if (wish) { renderWishes(); if (wishes !== null) loadWishes(); }
    window.scrollTo(0, 0);
  }

  // Pick up changes the other person made while this page was in the background.
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadWishes(); });

  var savedSort = saved("nils-wsort2");
  if (savedSort && /^(new|artist|album|dyr|billig)$/.test(savedSort)) $("wsort").value = savedSort;
  if (saved("nils-visning") === "onsker" || /^#(o|ny)/.test(location.hash)) switchView("onsker", true);
  loadWishes();
})();
</script>
</body>
</html>`;
