# AGENTS.md — HHHH Tierlist

## Session start (mandatory)
1. Read `STATE.md` — it is the source of truth for progress, decisions, constants, and gotchas.
2. Resume exactly where "Next up" says. Do not re-do completed items.

## Session end / before context runs out (mandatory)
Update `STATE.md`:
- Check off completed items `[x]`
- Set "Next up" to the exact next action (file + what's left)
- Add any new decisions to Decisions log, gotchas to Gotchas

## Stack
Static HTML/CSS/JS, no build step. Supabase (data + auth), Vercel (hosting).
Files live at repo root. No framework, no bundler, no npm deps.

## Commands
- Test logic: `node test.js`
- Syntax check: `node --check js/*.js` (run per file)
- Local preview: `npx serve .` or `python -m http.server 8000`

## Conventions
- Plain CSS in `css/style.css`, CSS custom properties for palette (see STATE.md constants)
- One icon family: lucide (`data-lucide` + `lucide.createIcons()`)
- Vanilla JS, no frameworks. `js/logic.js` stays pure (no browser/Supabase refs) so node can test it
- Demo/local-preview code lives ONLY in `js/demo.js` (defines `window.STORE` when Supabase is
  unconfigured); main files may only check `window.STORE`, never embed demo logic
- Never hardcode player data — always from Supabase
- Points/title/rank are computed by `js/logic.js`, never stored

## User rules (from feedback — do not violate)
- Terminology is **KITS**, never "arenas" (copy, ids, classes, comments)
- **No home page, no guide page** — `index.html` IS the leaderboard; nav = Discord | Rankings
- Kit icons: real Minecraft item SVGs (copied from centraltierlist.com/icons) in
  `assets/kits/*.svg`, embedded as data URIs, rendered as `<img>` by `kitIcon()` in js/core.js.
  Never hand-draw icon art; lucide = UI chrome only
- **Tier bubbles**: kit icon INSIDE the circle, tier code as small text BELOW the circle;
  sorted best → worst (`TIER_STRENGTH`, unranked last); native `title` tooltip on every
  bubble/chip shows points (`Kit` / `HT3 60 pts (HT1)` / `not ranked` — peak in plain
  brackets, never the word "peak"; styled `.tip` element, never native `title`)
- **Retired ranks**: only for tier 1 & 2 (HT1/LT1/HT2/LT2) — admin checkbox hidden otherwise;
  display as **RLT2** (R prefix via `tierLabel`); retired ranks never appear on per-kit
  leaderboards (`groupByTier` skips them); still count toward overall points
- **Peak tiers**: `entry.peak` = best ever; points always from peak (`entryPoints`), overall
  shows CURRENT tier, peak only revealed on hover tooltip; admin has a Peak select per kit
- **Combat Grandmaster = overall #1 only** (not "400+ pts"); everyone else walks the ladder
- **Kit names (user's list, IDs unchanged)**: Sword, Vanilla (crystal), SpearMace (netherite),
  CartPvP (potion), Mace, UHC, Axe, SMP, Money SMP (diasmp) — these exact strings in
  core.js MODES name/displayName and logic.js RADAR_AXES labels; never "Crystal/Netherite/
  Potion/Dia SMP" in visible copy. Cart icon = `assets/kits/potion.png` (user's art, bg
  removed); spear icon = `assets/kits/netherite.png` (user's art, already transparent)
- Quality bar: layered background (no plain black), staggered entrance animation only on
  first paint / mode switch / search (never on load-more re-renders), skeletons match layout
- Do NOT set up GitHub/accounts for the user — README documents every step instead
