# HHHH Tierlist

Static Minecraft PvP tier-list site (HTML/CSS/JS, no build step).
Data lives in Supabase, hosted on Vercel.

## Pages
- `index.html` — leaderboard. `?mode=overall|sword|crystal|netherite|potion|mace|uhc|axe|smp|diasmp` (root = overall)

## 1. Supabase (data + admin login)

Follow **`SUPABASE_SETUP.md`** exactly:
1. Create a free Supabase project.
2. Run the SQL in `supabase/schema.sql` (creates the `players` table + RLS rules).
3. Create your admin user (Authentication → Users → Add user).
4. Copy the project URL + anon key into `js/config.js`.

## 2. GitHub (you do this)

```sh
git init
git add .
git commit -m "HHHH Tierlist initial build"
git branch -M main
git remote add origin https://github.com/<you>/hhhh-tierlist.git
git push -u origin main
```

## 3. Vercel (you do this)

1. Go to https://vercel.com → **Add New → Project** → **Import** your GitHub repo.
2. Framework preset: **Other**. Build command: empty. Output directory: **/** (root).
3. Click **Deploy**. Done — every push to `main` redeploys automatically.

## Run locally

```sh
npx serve .
```

## Checks
- `node test.js` — logic tests (points, titles, tier grouping, radar values)
- `node --check js/core.js` (repeat per JS file) — syntax check

## Admin
1. Log in: leaderboard → **Add Player** button (admin bar) → Supabase email/password.
2. Add: **Add Player** → name, region, **account type** (Premium = live skin preview loads from
   the username; Cracked = colored initial tile), per-kit tiers (+ retired checkboxes) → Save.
3. Edit: open a player's profile → **Edit** (visible when logged in) → change → Save, or **Delete**.
4. Skins: premium names render via `render.crafty.gg` (auto-fallback to a letter tile if the
   name has no Mojang skin). Cracked names never hit the network.

## Credits
- Kit icon artwork sourced from [Central TierList](https://www.centraltierlist.com) (`/icons/*.svg`), used with the site rebrand at the owner's request.
- UI line icons: [lucide](https://lucide.dev).
- Avatars rendered by [Crafty](https://crafty.gg) (falls back to a letter tile).
