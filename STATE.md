# HHHH Tierlist — Project State (agent handoff file)

> READ THIS FIRST in any new session. Update it after every milestone.
> Rules: mark done items `[x]`, keep "Next up" exact (file names + what to do), log decisions + gotchas below.

## What this is
Rebrand/copy of https://www.centraltierlist.com (Minecraft PvP tier-list site) as **HHHH Tierlist**.
Static HTML/CSS/JS (no build step), data in **Supabase**, hosted on **GitHub + Vercel** (USER does GitHub/Vercel themselves — README documents the steps; never set up accounts for them).
Owner manages players manually via an admin login (Supabase Auth). No copied player data.

## Stack decisions
- Static site, files at repo root (Vercel = static, no build command). Only 2 pages now:
  `index.html` (the leaderboard) — **home page AND guide page are removed**, nav = Discord | Rankings
- supabase-js v2 via CDN (`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`)
- UI icons: lucide via CDN (`data-lucide` attrs + `lucide.createIcons()`)
- **Kit icons = real Minecraft item SVGs copied from centraltierlist.com/icons** (`/icons/<slug>.svg`,
  slugs: axepvp/crystal/diasmp/macepvp/nethpot/potion/smpkit/sword/uhc → our kit names) stored in
  `assets/kits/*.svg`, embedded as base64 data URIs in `js/kiticons.js`, rendered as `<img>`
  by `kitIcon(name, sizeCls)` in js/core.js (multicolor — NOT mask-tinted anymore).
  Data URIs make icons work over file:// too.
- **Skins:** `premium boolean` column. Premium = Mojang skin via `render.crafty.gg/3d/bust/{name}`
  (letter-tile fallback). Cracked = deterministic hsl gradient tile, zero network. Admin form has
  Account type select + live skin preview (350ms debounce).
- Background: static warm charcoal gradient (#14151d→#0e0f15, NEVER pure black) + one FIXED
  overlay layer carrying soft gold/violet/amber glows + fine grain. No looping background anims
  (medal pulse, retired glint, rank shimmer, blob drift all removed).
- Glass: topnav + modebar are sticky frosted glass (backdrop blur + saturate, hairline borders).
- Fonts: Google Fonts — Outfit (sans), JetBrains Mono (mono), Fraunces (display)
- One `GET` of all players, sort/filter/group client-side (list is small, owner-entered)
- Pure logic (points/title/tier grouping) isolated in `js/logic.js`, tested by `test.js` (run `node test.js`)
- Credentials in `js/config.js` (Supabase anon key is public-safe; RLS protects writes)

## Data model (Supabase table `players`)
`id uuid pk, name text unique, region text ('NA'|'EU'|'AS/AU'), premium bool default true, retired bool, ranks jsonb, created_at`
`ranks` shape: `{"sword":{"rank":"LT2","retired":false,"peak":"HT1"}, "crystal":{"rank":"HT3","retired":true}, ...}`
- `peak` (optional) = best tier the player ever held. **Points always come from peak if set**
  (entryPoints/computePoints in js/logic.js). Overall shows CURRENT tier; peak reveals on hover.
- `retired` allowed ONLY for HT1/LT1/HT2/LT2 (tier 1 & 2). Retired ranks are hidden from
  per-kit leaderboards (groupByTier skips them) and labeled with R prefix (e.g. `RLT2`).
Mode keys: `sword, crystal, netherite, potion, mace, uhc, axe, smp, diasmp`
RLS: public SELECT; INSERT/UPDATE/DELETE only for authenticated (admin).
If table predates the premium column: `alter table public.players add column if not exists premium boolean not null default true;`

## Key constants (from original site)
- Points: HT1 60, LT1 45, HT2 30, LT2 20, HT3 10, LT3 6, HT4 4, LT4 3, HT5 2, LT5 1 (peak tier's points win)
- Titles: **Combat Grandmaster = overall #1 ONLY** (not 400+). Ladder for everyone else:
  Master 250+, Ace 100+, Specialist 50+, Cadet 20+, Novice 10+, Rookie 0-9 (titleFor(rank, pts) in logic.js)
- Tier gradients: HT1 #FFD700→#FFA000, LT1 #FFC107→#FF8F00, HT2 #FF9800→#E65100, LT2 #FF7043→#D84315,
  HT3 #EF5350→#C62828, LT3 #AB47BC→#6A1B9A, HT4 #7E57C2→#4527A0, LT4 #5C6BC0→#283593,
  HT5 #42A5F5→#1565C0, LT5 #78909C→#37474F
- Regions: NA #DC2626, EU #16A34A, AS/AU #2563EB
- Palette: obsidian-950 #050507, 900 #09090d, 800 #111118, 700 #1c1c26, 600 #2a2a35,
  500 #3a3a47, 400 #585863, 300 #76767f; gold-400 #ffc107, gold-300 #ffd040
- Radar: 9 axes (Sword, Crystal, Axe, Netherite, UHC, Potion, Mace, SMP, DiaSMP),
  300x300 viewBox, r=100, strength = {HT1:10,LT1:9,HT2:8,LT2:7,HT3:6,LT3:5,HT4:4,LT4:3,HT5:2,LT5:1}
- Mode colors: sword #A855F7, crystal #06B6D4, netherite #EF4444, potion #22C55E, mace #F97316,
  uhc #EAB308, axe #3B82F6, smp #EC4899, diasmp #10B981

## Build progress
- [x] Scaffold + STATE.md + AGENTS.md (AGENTS.md has "User rules" section — read it)
- [x] css/style.css — quality pass: static warm charcoal bg + fixed glow/grain overlay, glass
      topnav + sticky glass modebar, card inner highlights, spring modal, skeleton loader,
      `.enter` stagger (first paint/mode switch/search only), hover motion gated to fine pointers,
      `transition:all` removed, all looping decor anims removed (medal pulse/glint/shimmer/blobs),
      home+guide CSS deleted
- [x] js/logic.js + test.js — pure compute incl. premium passthrough in groupByTier, tests pass
- [x] js/config.js + js/core.js — supabase client (guarded), nav (Discord | Rankings only),
      kitIcon() using KIT_ICON_DATA data URIs, avatarHtml(name, cls, premium) w/ cracked
      gradient tiles, modal helpers
- [x] js/kiticons.js — 9 kit icons as base64 data URIs (file:// safe). assets/kits/*.svg kept as source
- [x] index.html — IS the leaderboard; kiticons.js script tag; admin form has Account type
      (premium/cracked) select + live skin preview; modals: info, profile, login, player-form
- [x] js/rankings.js — skeleton, entrance stagger, kit icon tabs/pagehead/chips, premium-aware
      avatars in rows/tier cards/profile (cracked = gradient tile, no fetch)
- [x] js/admin.js — Supabase auth, add/edit/delete with premium + tiers + region + retired,
      live skin preview (350ms debounce, premium only)
- [x] guide.html DELETED (user request) + all guide CSS + nav item
- [x] supabase/schema.sql (premium column) + SUPABASE_SETUP.md + README (Supabase+GitHub+Vercel+credits)
- [x] Local demo mode isolated in **js/demo.js**: when Supabase unconfigured it defines
      `window.STORE` (localStorage-backed list/save/remove + fake admin user). Main files only
      check `window.STORE` (fetchPlayers in core.js; initAdmin/save/delete in admin.js) — zero
      demo logic in main files. Inert once Supabase keys are set. Optional: delete demo.js +
      its `<script>` tag for a pure-production repo (then unconfigured state shows
      "No data source connected" again)
- [x] **Kit icons fixed** (they rendered as solid blocks before): game-icons SVGs contain a
      full-canvas opaque square `<path d="M0 0h512v512H0z"/>` which breaks alpha masking —
      regenerated js/kiticons.js from assets/kits/*.svg with that path stripped; shapes are
      fill=#fff (opaque) so mask works. Also kitIcon() now quotes the mask url with `url('...')`
- [x] **Premium avatar fallback fixed** (avatarHtml onerror used `\\"` which terminates the HTML
      attribute early → garbage text in rows). Now reuses avatarFallbackHtml() with `"`→`&quot;`
      and `\'` pattern. Verified via headless Chrome screenshots: rows, tiles, tier bubbles,
      modebar kit icons all render
- [x] Verified: `node --check` all JS OK, `node test.js` passes, demo STORE smoke-tested
      (insert/partial-update/remove + inert-when-Supabase-ready), headless Chrome screenshots
      of empty state + seeded 2-player leaderboard; earlier serve smoke: 200 for pages/JS/CSS/
      icons + kiticons.js, 404 for guide.html/rankings.html/icons.js, zero stale arena refs
- [x] D2026-10-11 USER ROUND 2: (a) kit icons = actual Minecraft item art (copied
      centraltierlist.com/icons SVGs into assets/kits/, kitIcon() now emits `<img>`, CSS .kit-icon
      = object-fit contain, no mask/bg-color); (b) Information modal titles fixed (inline
      `background:` shorthand was resetting `background-clip` from the class → clip+color now set
      inline); (c) overall rows: tier bubbles sorted best→worst via TIER_STRENGTH (unranked last,
      dimmed), kit icon under each bubble (replaces duplicate code label, `.tier-kit-icon`);
      (d) profile modal disciplines sorted the same way; disc-chip icon bg softened to
      hexA(mode,.15). Verified via headless screenshots (row/info/profile)
- [x] git add . done earlier (NOT committed — user handles GitHub themselves)

- [x] D2026-10-11 USER ROUND 3 (COMPLETE — peak tiers, R-labels, icon-in-circle bubbles,
      GM=#1, retired filtering; verified end-to-end):
      LOGIC (logic.js): (a) computePoints/entryPoints use PEAK tier points when entry.peak set;
      (b) titleFor(rank, pts): Combat Grandmaster = overall #1 ONLY, others walk ladder
      (titleForPoints REMOVED); preparePlayers assigns titles AFTER rank; (c) tierLabel(code,
      retired) → R prefix (RLT2); (d) groupByTier SKIPS retired entries (per-kit boards);
      (e) radarValues also returns peak + pts per axis (chart strength still current-tier).
      RENDERING: (f) tierBadgeHtml accepts opts.icon → kit icon INSIDE circle (dimmed on empty
      badge); (g) renderOverall: badge+icon, `.tier-code` label below via tierLabel, native
      title tooltip `Kit: HT3 (peak HT1) — 60 pts` / `not ranked`, best→worst sort;
      (h) renderTierView counts = sum of groupByTier totals (retired excluded), search count
      too; (i) profile disc chips: tierLabel R prefix + same tooltip format (v.pts/v.peak);
      (j) info modal Grandmaster range → `'#1 overall'`.
      ADMIN: (k) dual selects per kit (tier + Peak, —/HT1..LT5), collectRanks writes peak only
      when set; (l) Retired checkbox visible only when tier ∈ {HT1,LT1,HT2,LT2} (canRetire),
      hidden+unchecked on change otherwise (RETIREABLE map + wireKitFieldVisibility).
      CSS: (m) `.tier-badge__icon` 16px + `--off`; `.kit-field__selects` 2-col grid; retired
      rules re-prefixed `.kit-field .kit-field__retired` (see Gotchas).
      TESTS: (n) test.js rewritten — peak points, entryPoints, tierLabel, titleFor GM=#1,
      groupByTier retired exclusion, radarValues peak/pts. `node test.js` ALL PASS,
      `node --check` clean. VERIFIED via headless Chrome: overall (icon-in-circle, RLT2,
      165 pts peak, GM #1 only), ?mode=crystal (retired ABSENT + counts), info (#1 overall),
      profile (RLT2 chip + tooltips via --dump-dom), admin (peak selects, retired shown for
      HT1/LT1 only, hidden for HT3/empty). schema.sql ranks-shape comment added; AGENTS.md
      user rules updated; probe files deleted.
- [x] D2026-10-12 USER ROUND 3 addendum (hover tooltip redesign + strongest-line fix):
      (a) native `title` tooltips on overall tier bubbles replaced with styled `.tip` element
      (dark glass card, uppercase kit name, white tier label, gold points, blue `peak HT1`,
      muted `not ranked`) — shows on hover via CSS transition, gated to `hover:hover`, first/last
      badge anchored to stay in viewport; (b) `strongestDiscipline` now INCLUDES retired ranks
      (was excluding them) and profile line renders `tierLabel(code, retired)` →
      "Strongest in Sword at **RLT2**", never peak (strength stays current-tier; assert in
      test.js: `{rank:'HT3',peak:'HT1'}` → code HT3). Verified: `node test.js` pass,
      --dump-dom shows forced `.tip` markup (36 spans) + "Strongest in Sword at RLT2" /
      "Strongest in Crystal at HT1"; probes deleted after screenshots.

- [x] D2026-10-12 USER ROUND 4 (part 1 — renames + cart icon + chip tooltips DONE; spear icon
      BLOCKED on user file; visual verification NOT yet run):
      (a) **Kit renames** (IDs UNCHANGED — ranks data keeps sword/crystal/netherite/potion/...):
        sword→`Sword`, crystal→`Vanilla`, netherite→`SpearMace`, potion→`CartPvP`,
        mace→`Mace`, uhc→`UHC`, axe→`Axe`, smp→`SMP`, diasmp→`Money SMP`.
        Applied to BOTH `name` and `displayName` in core.js MODES (lines 20-28) and to
        RADAR_AXES labels in logic.js (~line 145). Tooltips/admin/tier-view headers all read
        these fields, so they update everywhere automatically.
      (b) **Cart icon**: source was `C:\Users\blouc\Downloads\images (1).png` (480x640,
        black bg). Flood-filled bg to transparent via PIL (corners seeded, thresh=40 — keeps
        the white art lines) → saved `assets/kits/potion.png` (verified visually), embedded as
        `data:image/png;base64,...` REPLACING the `potion:` entry in `js/kiticons.js`
        (file now ~137KB), deleted `assets/kits/potion.svg`. Embed pattern: see
        `C:\Users\blouc\AppData\Local\Temp\opencode\embed_cart.py` (copy/adapt for spear).
      (c) **Profile disc-chip tooltips**: native `title` attr removed, replaced with the same
        styled `.tip` span used on overall bubbles (tip__name = kit label, tierLabel + pts +
        peak, `not ranked`); `.disc-chip` CSS got `position: relative`.
      (d) `node --check` clean + `node test.js` ALL PASS after (a)-(c).
      (e) **Spear icon DONE**: source `Downloads\Netherite_Spear_JE1_BE2.png` (160x160,
        corners already transparent — no bg removal needed) → `assets/kits/netherite.png`,
        `netherite.svg` deleted, `data:image/png;base64` replaced `netherite:` entry in
        kiticons.js (~135KB), `node --check` clean. Embed pattern:
        `Temp\opencode\embed_spear.py` (same shape as embed_cart.py).
      (f) **USER FEEDBACK 3 fixes (all verified via headless-Chrome probes, probes deleted)**:
        - Removed `Disciplines` title from profile (`rankings.js` line ~447) + orphaned
          `.disciplines-title` CSS rule
        - Profile disc-chip tips DIDN'T show on hover: the `@media (hover:hover)` rule only
          covered `.tier-badge-wrap:hover .tip` — added `.disc-chip:hover .tip` (style.css:428)
        - Peak format in tooltips: `peak HT1` → `(HT1)` (both tip builders in rankings.js,
          lines ~148 and ~397); no visible "peak " text remains in tooltips
      (g) Final verification: profile DOM `Disciplines:0 / peak :0 / (HT1):3`; overall DOM
        `peak :0 / (HT1):2`; screenshots confirmed new kit names, spear+cart icons in
        modetabs, chip tips rendering, `SWORD HT3 60 pts (HT1)` format.
        `node test.js` ALL PASS; probes `_probe.html`/`_seed.html` deleted.

## Next up (ROUND 5 — user-flow setup; GitHub + Supabase DONE, Vercel pending)
0. **ROUND 5 UX fixes DONE** (commit eb91066, verified via probe + screenshot):
   - **Kit switching was a FULL PAGE RELOAD** (tabs = plain `<a href>` w/o interception).
     Fixed: `wireModeSwitch()`/`switchMode(mode, push)` in rankings.js — delegated click on
     `#modebar` (element persists, innerHTML swapped), `history.pushState`, popstate handler,
     resets shown/search + `animateEntrance`. No reload; data stays in memory.
   - **Tab hover flash**: `.modetab:hover{color:var(--fg)}` (0-2-0) beat `.modetab--active`
     (0-1-0) → active tab flipped gold→white + neon glow `0 0 15px`. Fixed: stable
     `.modetab--active:hover` gold, glow → subtle dark lift `0 6px 16px rgba(0,0,0,.35)`,
     added `:active{scale(.96)}` press feedback.
   - **No way to log in** (admin bar was hidden when logged out → login-modal unreachable).
     Fixed: bar always visible; `data-authed` toggles `.admin-authed` group (dot/Add/Out)
     vs `.admin-anon` **Log in** button → opens login-modal. Wire in `wireAdminButtons`.
1. **Supabase DONE** (2026-10-12): project `nvdqkmucqqjleacukabs.supabase.co`, anon key in
   `js/config.js` (commit f13c73d), schema installed + verified via REST (`players` table
   readable, 0 rows), admin user created by user.
2. **GitHub DONE**: repo `https://github.com/matrixguy69/hhhhtierlist` (no hyphen!), branch
   `main`. Remote had user's manual web uploads (10 junk commits + 5 stray `.ignore` files) —
   rebased local on top with `-X theirs`, junk removed (7f0f6b4). `git diff origin/main` empty
   = synced. Config: branch `main`, remote `origin`.
3. **Vercel PENDING (user does browser steps)**: vercel.com → Add New → Project → import
   `matrixguy69/hhhhtierlist` → Framework: **Other**, build command empty, output dir `/`
   → Deploy. Then custom domain optional.
4. **Admin flow test** once live: login via Add Player → Supabase email/pass, add a player,
   check overall + mode views + profile.

## Decisions log
- Dropped Testers page (user request — needs their Discord bot data, no equivalent)
- Dropped local Express/data.json server in favor of Supabase + Vercel (user request)
- Admin auth = Supabase Auth email/password (single admin user), RLS gates writes
- Guide page: structure copied, wording rewritten to be site-agnostic
- D2026-10-10 USER FEEDBACK (quality bar, MUST follow — also in AGENTS.md):
  * Terminology = **KITS** not "arenas" — everywhere (copy, ids, classes, comments)
  * **Home page removed AND guide page removed** — index.html IS the leaderboard,
    nav = Discord | Rankings (two items only)
  * Icons = **downloaded assets only** embedded as data URIs (originally game-icons.net CC BY;
    replaced 2026-10-11 with centraltierlist.com item SVGs at user request — multicolor `<img>`)
  * Background = warm charcoal, NOT pure black, fully static (glows/grain in one fixed overlay,
    no looping anims). Glass navbar + sticky glass modebar
  * Motion: staggered entrance ONLY on first paint/mode switch/search (never load-more),
    springy modal, layout-shaped skeletons, hover motion gated off on touch
  * Skins: premium = Crafty render by username (live preview in admin form); cracked = gradient tile
  * Admin interface: name, region, premium/cracked, all 9 kit tiers + retired, edit + delete
  * **User does GitHub/Vercel setup themselves** — README must document everything instead
  * Auto-compaction continuation: keep THIS file updated at every pause/checkpoint

## Gotchas
- Original site is Next.js/RSC; we rebuild as static — data fetch is one supabase select, not their API
- `lucide.createIcons()` must be re-run after injecting new `data-lucide` markup
- supabase-js CDN global is `window.supabase` (object with `.createClient`)
- game-icons SVGs (OLD icons, replaced 2026-10-11) include a full-canvas opaque square path — if
  ever reused as a CSS mask, MUST strip it first. Current item SVGs are rendered as `<img>`, not masks
- Inline `style="background: <gradient>"` SHORTHAND resets `background-clip` to border-box and
  overrides a class's `background-clip:text` — always put `background-clip:text;-webkit-background-clip:
  text;color:transparent` in the SAME inline style (titles info table had exactly this bug)
- Injecting HTML via an `onerror="..."` attribute: embed the replacement markup with `\'` for
  the JS string and `&quot;` for inner quotes. NEVER `\\"` — HTML doesn't escape backslashes,
  the raw `"` terminates the attribute and shreds the row layout
- js/demo.js must load AFTER core.js (reads SUPABASE_READY) and BEFORE admin/rankings run;
  main files only reference `window.STORE` so deleting demo.js + its script tag stays safe
- Visual verify recipe: copy index.html → `_probe.html` + injected `openModal('info-modal')` /
  `openProfile('name')` on load; `_seed.html` sets localStorage 'hhhh-demo-players' then
  `location.replace('_probe.html'+location.search)`; headless Chrome `--headless=new
  --user-data-dir=<tmp> --virtual-time-budget=8000 --screenshot=... file://...` (delete probes after)
- PowerShell + node server testing: `Start-Process node -ArgumentList '"<serve.js>" . 8099'
  -WorkingDirectory <project>` (paths with spaces need embedded quotes), curl `-o NUL`
- Modetab kit icons are real item images now (`<img>`); inactive tabs dim via opacity .8, the
  inline `color:` on tabs only affects border/glow
- **CSS specificity trap**: `#pf-kits` sits inside `.form-row` in index.html, so `.form-row label`
  (0-1-1) beats any bare `.kit-field__*` (0-1-0) rule on the retired checkbox/labels → kit-field
  retired rules MUST be prefixed `.kit-field .kit-field__retired` (0-2-0). Symptom: computed
  display:block instead of none/flex; debug via getComputedStyle + document.styleSheets probe
- Headless Chrome gotchas: chrome.exe returns before writing `--screenshot` (add Start-Sleep 3
  before Get-Item); reuse of the same `--user-data-dir` for a 2nd shot silently writes nothing
  (fresh dir per shot); `--dump-dom` + `--virtual-time-budget=9000` captures injected probe DOM
- Probe scripts must inject styles at PARSE time (in `<head>`) and open modals on DOMContentLoaded
  — the `load` event may never fire under `--virtual-time-budget` (CDN scripts pending), which
  silently skips `window.onload` handlers
- Static preview server: `python -m http.server 8099` via
  `Start-Process -FilePath <python.exe> -ArgumentList '-m','http.server','8099'
  -WorkingDirectory <project> -WindowStyle Hidden` (it DIED once mid-session — if
  ERR_CONNECTION_REFUSED, just restart it)
