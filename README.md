# Deep Catch 3.0 — Sunlit Reef alpha

A new Phaser 3 + TypeScript prototype. The legacy game is retained in www/ for reference; Vite builds the new root index.html.

## Run
- Node 22: npm install, npm run dev
- npm test: economy unit tests
- npm run build: type check and bundle
- Android: open Actions, choose the deepcatch-v3 build, download deep-catch-v3-apk after it succeeds.

Drag to steer. Avoid jellyfish, reel up whenever ready, catch fish on ascent and return safely. Buy gear and discover ten species. A second press of reel activates a single speed boost.

This is a vertical slice, not a finished replacement. Procedural textures are placeholders; other regions, bosses, music, legacy save migration, release signing and device playtesting are pending. V3 uses its own save key to protect old progress. Do not merge until verified.
