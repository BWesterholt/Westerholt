// Spotify's own player, built into the page (Spotify's "iFrame API"). It plays whole songs when
// the visitor is logged in to Spotify in the same browser, otherwise 30 seconds of each song.
// Nothing to set up: no app, no key and no login on this site.
const API = "https://open.spotify.com/embed/iframe-api/v1";

let loading = null, controller = null, making = null;
const listeners = new Set();
export const state = { paused: true, buffering: false, position: 0, duration: 0, started: false };

function loadApi() {
  if (loading) return loading;
  loading = new Promise((ok, fail) => {
    const timer = setTimeout(() => { loading = null; fail(new Error("Spotify svarer ikke")); }, 15000);
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(timer); ok(api); };
    const s = document.createElement("script");
    s.src = API; s.async = true;
    s.onerror = () => { clearTimeout(timer); loading = null; s.remove(); fail(new Error("Spotify kunne ikke hentes")); };
    document.head.appendChild(s);
  });
  return loading;
}

// Plays an album in the player inside `box` (made the first time, then reused).
export async function playAlbum(box, id, height) {
  const uri = "spotify:album:" + id;
  state.paused = true; state.position = 0; state.duration = 0; state.started = false;
  if (controller) { controller.loadUri(uri); controller.play(); return; }
  if (!making) {
    making = loadApi().then((api) => new Promise((ok) => {
      const el = document.createElement("div");
      box.innerHTML = ""; box.appendChild(el);
      api.createController(el, { uri, width: "100%", height }, (c) => {
        let done = false;
        const go = () => { if (done) return; done = true; controller = c; ok(c); c.play(); };
        c.addListener("ready", go);
        setTimeout(go, 6000); // in case "ready" came before anyone listened
        c.addListener("playback_update", (e) => {
          const d = (e && e.data) || {};
          state.paused = !!d.isPaused; state.buffering = !!d.isBuffering;
          state.position = d.position || 0; state.duration = d.duration || 0;
          if (!state.paused && state.position > 0) state.started = true;
          listeners.forEach((f) => f(state));
        });
      });
    })).catch((e) => { making = null; throw e; });
    return making.then(() => {});
  }
  const c = await making;
  c.loadUri(uri); c.play();
}

export function pause() { if (controller) try { controller.pause(); } catch (e) {} }
export function onUpdate(f) { listeners.add(f); }
