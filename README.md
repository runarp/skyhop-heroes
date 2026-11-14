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

## Brain puzzles

Brain Boost (in fights) and the Brain Gym (in every city) ask probability puzzles that get harder until each player gets about 7 in 10 right.

- **How it adapts:** an Elo-style rating per player (`src/brain.js`). A right answer raises it and a wrong one lowers it, by how surprising the result was. The game picks puzzles at the level where the player should succeed 70% of the time. Grown-ups can change the target (6, 7 or 8 in 10), nudge the level and see a report under **Settings**.
- **The question database:** `src/bank.json`. It is built into the game, so it works offline. When the iPad is online the game also fetches the published `bank.json`, so new puzzles arrive without reinstalling.
- **Answers are never taken on trust:** each puzzle describes its dice, coins, spinners or marbles in a small puzzle language. The game lists every outcome and works out the answer itself, and `node tools/verify-bank.mjs` checks every puzzle before each deploy.
- **New puzzles from Claude:** the **Add new brain puzzles** workflow runs on the 1st of each month, or on demand from the Actions tab. It asks Claude (via OpenRouter) for puzzles just above the current top level, keeps only those that pass the checks, commits them and republishes. It needs an `OPENROUTER_API_KEY` repository secret (Settings → Secrets and variables → Actions); without one it does nothing. To run it yourself: `npm ci`, then `node tools/gen-bank.mjs --count 20`.
- **Check the 70%:** `node tools/brain-sim.mjs` simulates kids of different ability and prints the success rate each one settles at.

## Change it

Source is in `src/`. Rebuild and re-test with:

```bash
node build.mjs
node tools/smoke.mjs
node tools/stress.mjs
node tools/sim.mjs 1000
node tools/verify-bank.mjs
```

- `node tools/icons.mjs` redraws the Home Screen icons into `src/icons/` (needs Playwright).
- `src/engine.js` holds every rule and number: heroes, mobs, cities, items, quiz questions.
- `tools/sim.mjs` plays thousands of fights to show win rates after a balance change (`node tools/sim.mjs 1000 kid` uses a careless player).
- `tools/smoke.mjs` plays London end to end in a headless browser and checks the offline reload.
- `tools/stress.mjs` presses random buttons through all 312 hero and stage combinations.

Fredoka font: SIL Open Font License 1.1 (`src/fonts/OFL.txt`).
