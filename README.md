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
