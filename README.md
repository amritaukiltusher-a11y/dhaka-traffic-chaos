# Dhaka Traffic Chaos (ঢাকা ট্র্যাফিক কেয়স)

An original, satirical, fictional 3D browser driving game set in Dhaka. React + TypeScript + Vite,
Three.js, Tailwind CSS v4, PWA. Bengali by default, English optional. All stats and headlines are game content.

## Setup
```bash
npm install
npm run icons     # regenerates public/icons/*.png from public/favicon.svg
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build into dist/
npm run preview
```
Requires Node 18+.

## Rename the game
Edit `src/config.ts` (`GAME_NAME`), then `name`/`short_name` in `vite.config.ts` and `<title>` in `index.html`.

## Controls
W/↑ accelerate · S/↓ brake · A/← and D/→ steer · Shift boost · Space special · H horn · M sound · Esc pause.
On touch devices on-screen buttons appear (multitouch supported).

## Deploy
- **Vercel:** import the repo; `vercel.json` is already configured (build `npm run build`, output `dist`).
- **Netlify:** import the repo; `netlify.toml` is already configured.

## Leaderboard & newsletter
The leaderboard is local (browser storage). The newsletter stores locally unless `VITE_NEWSLETTER_ENDPOINT`
is set to a server endpoint accepting `POST {"email": "..."}`. For a global leaderboard, use a server API
(e.g. Supabase) with server-side validation and rate limiting; never put secret keys in frontend code.

## Notes
Bengali web font loads from Google Fonts when online; offline it falls back to system fonts.
Social links in `src/config.ts` and `CONTACT_EMAIL` are placeholders to replace.

## GitHub Pages
1. Push this project to a GitHub repo (branch `main`).
2. Repo Settings > Pages > Source: **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>/` and publishes.
Site URL: `https://<username>.github.io/<repo-name>/`

## Player vehicle
The player's auto is styled after a green auto-rickshaw (see `public/tushar-auto.jpg`, shown in the hero section).
Its name, number plate and sign are drawn on canvas textures: change `VEHICLE_NAME` / `VEHICLE_PLATE` at the top of
`src/game/engine.ts` (and the canopy text in `vehicleLabels()`), and replace `public/tushar-auto.jpg` for the photo card.

## Sound Bomb (শব্দ বোমা)
A "Sound Bomb" button (key **B**, also a big pad on touch screens) plays a cartoon effect plus a random funny Bengali
shout, and the same happens automatically on every crash. Lines live in `SOUND_BOMB` in `src/game/content.ts`;
effects are synthesised in `src/game/audio.ts` (no audio files). The spoken voice uses the browser's built-in
text-to-speech and is only heard on devices that have a Bengali (`bn`) voice installed (common on Android/Chrome and
recent Windows/macOS); otherwise you still get the cartoon sound and the text bubble. The sound toggle (M) mutes it all.

## Upgrades
- **Near-miss combo:** chained close shaves multiply the bonus (up to x5).
- **Chai power-up (☕):** 7 seconds of battery-free turbo; spawns every 20-30 s.
- **Difficulty:** Easy / Normal / Hard (battery drain, traffic, chaser speed, score) chosen in the menu and remembered.
- **Weather:** each run is night, dusk or rain (rain = streaks, rain sound, slippery steering). Testing aids: open the page with
  `?weather=rain|dusk|night` and/or `?fastchai`.
- **Badges:** nine local achievements (`src/game/achievements.ts`), stored in the browser only.
- **Share:** the results screen has a share button (Web Share API, or copies the text).
- **Haptics:** phones vibrate on crashes (when sound is on).

## Garage, taka, missions, gamepad & music

- Collect 🪙 coins in the lanes; at game over you earn taka (coins + score/250 + mission rewards), saved in `localStorage` (`dtc:wallet`).
- **Garage** (`#garage`): upgrade battery, coin magnet, shield and chai (3 levels each) and buy paint colours.
- **Daily missions**: three new missions each day (seeded by date), completed within a single run.
- **Gamepad**: stick/d-pad steer, A/RT accelerate, B/LT brake, X boost, Y shield, LB horn, RB sound bomb, Start pause.
- **Music**: 🎵 toggle in the toolbar (off by default), procedural dhol-style tune.

## 3D visuals

- Real-time sun shadows on **High** quality (cheap blob shadow on Low), soft particles (exhaust, boost flame, wheel dust, crash sparks, pickup sparkles), speed streaks, speed-based FOV, camera roll into turns, crash kick, body roll/pitch and suspension bounce on the auto. Code: `src/game/fx.ts`.

## Areas

Every 2 levels the route enters a new part of Dhaka (Mirpur → Farmgate → Motijheel → Gulshan → Banani) with a tinted sky, a toast and a HUD label. Also: speed vignette, headlight pool, twinkling stars.
