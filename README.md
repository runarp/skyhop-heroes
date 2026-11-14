# Skyhop Heroes

A dice-and-brains fighter RPG for iPad Safari. One self-contained page, no network needed after the first visit.

## Where it lives

Every push to `main` rebuilds the game and publishes it to GitHub Pages (see `.github/workflows/pages.yml`).
The page asks search engines not to list it (`noindex` and `robots.txt`); remove both lines in `build.mjs` to change that.
The game makes no network requests: no ads, no tracking, and players' names and saves stay on the iPad.

## Play it offline on an iPad

1. Open the GitHub Pages address in Safari on the iPad, tap **Share**, then **Add to Home Screen**.
2. Open the new Home Screen icon once while still online. After that it runs with no connection.

Start your game from the Home Screen icon, not the Safari tab: the two keep separate saves.
Offline caching needs HTTPS (or `localhost`); a plain `http://192.168…` address on the home network will play but will not install for offline use.

## Change it

Source is in `src/`. Rebuild and re-test with:

```bash
node build.mjs
node tools/smoke.mjs
node tools/stress.mjs
node tools/sim.mjs 1000
```

- `node tools/icons.mjs` redraws the Home Screen icons into `src/icons/` (needs Playwright).
- `src/engine.js` holds every rule and number: heroes, mobs, cities, items, quiz questions.
- `tools/sim.mjs` plays thousands of fights to show win rates after a balance change (`node tools/sim.mjs 1000 kid` uses a careless player).
- `tools/smoke.mjs` plays London end to end in a headless browser and checks the offline reload.
- `tools/stress.mjs` presses random buttons through all 312 hero and stage combinations.

Fredoka font: SIL Open Font License 1.1 (`src/fonts/OFL.txt`).
