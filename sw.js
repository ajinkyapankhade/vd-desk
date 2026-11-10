/* VD Enterprise Desk — keeps the app openable without internet.
   Change VERSION whenever you upload a new index.html. */
const VERSION = "vd-desk-v14";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache Google sign-in or Google API calls.
  if (/(^|\.)googleapis\.com$/.test(url.hostname) && !url.hostname.startsWith("fonts.") || url.hostname === "accounts.google.com") return;
  // The app page: network first so updates arrive, cached copy when offline.
  if (req.mode === "navigate") {
    // always ask GitHub for the newest page (ignore the browser's 10-minute copy)
    e.respondWith(fetch(req.url, {cache: "no-cache", credentials: "same-origin"}).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Everything else (icons, fonts, PDF/Excel helpers): cached copy first, refreshed in the background.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
