/* HHHH Tierlist — shared core: client, mode config, nav, helpers */

var SITE = window.SITE_CONFIG || { name: 'HHHH Tierlist' };

var SUPABASE_READY = false;
var db = null;
try {
  if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
      window.SUPABASE_URL.indexOf('YOUR_SUPABASE') === -1) {
    db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    SUPABASE_READY = true;
  }
} catch (e) {
  console.error('Supabase init failed', e);
}

/* ---------- game modes (order = tab order) ---------- */

var MODES = [
  { id: 'sword',     name: 'Sword',      displayName: 'Sword',      icon: 'sword',         color: '#A855F7', glow: 'rgba(168,85,247,.5)' },
  { id: 'crystal',   name: 'Vanilla',    displayName: 'Vanilla',    icon: 'gem',           color: '#06B6D4', glow: 'rgba(6,182,212,.5)' },
  { id: 'netherite', name: 'SpearMace',  displayName: 'SpearMace',  icon: 'shield',        color: '#EF4444', glow: 'rgba(239,68,68,.5)' },
  { id: 'potion',    name: 'CartPvP',    displayName: 'CartPvP',    icon: 'flask-conical', color: '#22C55E', glow: 'rgba(34,197,94,.5)' },
  { id: 'mace',      name: 'Mace',       displayName: 'Mace',       icon: 'hammer',        color: '#F97316', glow: 'rgba(249,115,22,.5)' },
  { id: 'uhc',       name: 'UHC',        displayName: 'UHC',        icon: 'heart',         color: '#EAB308', glow: 'rgba(234,179,8,.5)' },
  { id: 'axe',       name: 'Axe',        displayName: 'Axe',        icon: 'axe',           color: '#3B82F6', glow: 'rgba(59,130,246,.5)' },
  { id: 'smp',       name: 'SMP',        displayName: 'SMP',        icon: 'boxes',         color: '#EC4899', glow: 'rgba(236,72,153,.5)' },
  { id: 'diasmp',    name: 'Money SMP',  displayName: 'Money SMP',  icon: 'diamond',       color: '#10B981', glow: 'rgba(16,185,129,.5)' }
];

function modeById(id) {
  for (var i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
  return null;
}

/* kit icon = real Minecraft item art (multicolor SVG, inlined data URI so file:// works) */
function kitIcon(name, sizeCls) {
  var url = (typeof KIT_ICON_DATA !== 'undefined' && KIT_ICON_DATA[name]) || 'assets/kits/' + name + '.svg';
  return '<img class="kit-icon' + (sizeCls ? ' ' + sizeCls : '') + '" src="' + url + '" alt="" loading="lazy">';
}

/* ---------- dom helpers ---------- */

function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function avatarUrl(name) { return 'https://render.crafty.gg/3d/bust/' + encodeURIComponent(name); }

/* deterministic hue from name — used for cracked accounts (no fetchable skin) */
function nameHue(name) {
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function avatarFallbackHtml(name, cls) {
  var h = nameHue(name);
  return '<div class="' + cls + ' avatar--fallback" style="background:linear-gradient(135deg,hsl(' +
    h + ',46%,36%),hsl(' + ((h + 40) % 360) + ',50%,24%))">' +
    esc(String(name).charAt(0).toUpperCase()) + '</div>';
}

/* premium = Mojang skin from render.crafty.gg; cracked = local gradient tile */
function avatarHtml(name, cls, premium) {
  if (premium === false) return avatarFallbackHtml(name, cls);
  var fb = avatarFallbackHtml(name, cls).replace(/"/g, '&quot;');
  return '<img class="' + cls + '" src="' + esc(avatarUrl(name)) + '" alt="" loading="lazy" ' +
    'onerror="this.onerror=null;this.outerHTML=\'' + fb + '\'">';
}

function tierGradient(code) {
  var st = TIER_STYLE[code];
  if (!st) return 'background:var(--obsidian-700)';
  return 'background:linear-gradient(135deg,' + st.a + ',' + st.b + ');color:' + st.text;
}

function tierBadgeHtml(code, opts) {
  opts = opts || {};
  if (!code) {
    return '<span class="tier-badge tier-badge--empty">' +
      (opts.icon ? kitIcon(opts.icon, 'tier-badge__icon tier-badge__icon--off') : '') + '</span>';
  }
  var cls = 'tier-badge' + (opts.retired ? ' tier-badge--retired' : '');
  var inner = opts.icon
    ? kitIcon(opts.icon, 'tier-badge__icon')
    : esc(code) + (opts.label ? '<span class="tier-code">' + esc(opts.label) + '</span>' : '');
  var title = opts.title ? ' title="' + esc(opts.title) + '"' : '';
  return '<span class="' + cls + '" style="' + tierGradient(code) + '"' + title + '>' + inner + '</span>';
}

function regionChipHtml(region) {
  var st = REGION_STYLE[region] || { color: '#585863', label: region };
  return '<span class="region-chip" style="background:' + st.color + '">' + esc(st.label) + '</span>';
}

function tierFillStyle(code) {
  var st = TIER_STYLE[code];
  if (!st) return '';
  return 'background:radial-gradient(circle at 30% 25%,' + st.a + ',' + st.b + ');';
}

/* ---------- top nav + mode bar ---------- */

var NAV_ITEMS = [
  { href: 'https://discord.gg/centraltl', label: 'Discord', icon: 'message-circle', external: true },
  { href: 'index.html', label: 'Rankings', icon: 'trophy', page: 'rankings' }
];

function renderNav(activePage) {
  var mount = document.getElementById('topnav');
  if (!mount) return;
  var links = NAV_ITEMS.map(function (item) {
    var active = item.page === activePage;
    var href = item.external ? item.href : item.href;
    var target = item.external ? ' target="_blank" rel="noopener"' : '';
    return '<a class="navlink' + (active ? ' navlink--active' : '') + '" href="' + href + '"' + target + '>' +
      '<i data-lucide="' + item.icon + '"></i><span class="navlink__label">' + item.label + '</span></a>';
  }).join('');

  mount.className = 'topnav';
  mount.innerHTML =
    '<div class="container container--narrow topnav__inner">' +
      '<a class="brand" href="index.html"><i data-lucide="trophy"></i>' + esc(SITE.name) + '</a>' +
      '<nav class="topnav__links">' + links + '</nav>' +
    '</div>';
}

function currentModeId() {
  var m = new URLSearchParams(location.search).get('mode');
  return m && (m === 'overall' || modeById(m)) ? m : 'overall';
}

function renderModeBar(activeId) {
  var mount = document.getElementById('modebar');
  if (!mount) return;

  var tabs = '<a class="modetab modetab--overall' + (activeId === 'overall' ? ' modetab--active' : '') +
    '" href="index.html?mode=overall" title="Overall">' +
    '<i data-lucide="trophy"></i><span class="modetab__label">OVERALL</span></a>';

  tabs += MODES.map(function (m) {
    var active = activeId === m.id;
    var style = 'color:' + m.color + (active
      ? ';border-color:' + m.color + ';background:' + hexA(m.color, .12) + ';box-shadow:0 0 15px ' + hexA(m.color, .35) + ';opacity:1'
      : ';opacity:.8');
    return '<a class="modetab' + (active ? ' modetab--active' : '') + '" href="index.html?mode=' +
      m.id + '" title="' + esc(m.displayName) + '" style="' + style + '">' +
      kitIcon(m.id, 'kit-icon--22') + '</a>';
  }).join('');

  mount.className = 'modebar';
  mount.innerHTML =
    '<div class="container container--narrow modebar__inner">' +
      '<div class="modescroll">' + tabs + '</div>' +
      '<div class="searchwrap searchwrap--collapsed">' +
        '<i data-lucide="search"></i>' +
        '<input class="search-input" id="player-search" type="search" maxlength="50" ' +
        'placeholder="Search players..." aria-label="Search players">' +
      '</div>' +
    '</div>';
}

function hexA(hex, a) {
  var h = hex.replace('#', '');
  var r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

/* ---------- modal helpers ---------- */

var openModalId = null;

function openModal(id) {
  var m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('data-open', 'true');
  openModalId = id;
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  var m = document.getElementById(id || openModalId);
  if (!m) return;
  m.setAttribute('data-open', 'false');
  if (openModalId === m.id) openModalId = null;
  if (!document.querySelector('.modal-overlay[data-open="true"]')) document.body.style.overflow = '';
}

function wireModalDismiss() {
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
    if (e.target.closest && e.target.closest('[data-close-modal]')) {
      var ov = e.target.closest('.modal-overlay');
      if (ov) closeModal(ov.id);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModalId) closeModal(openModalId);
  });
}

/* ---------- lucide ---------- */

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
  }
}

/* ---------- data access ---------- */

function fetchPlayers() {
  /* window.STORE = alternate local store (js/demo.js), only present when Supabase is off */
  if (window.STORE) return Promise.resolve({ data: window.STORE.list(), error: null });
  if (!SUPABASE_READY) return Promise.resolve({ data: [], error: { message: 'not-configured' } });
  return db.from('players').select('*').order('created_at', { ascending: true }).limit(2000);
}

/* ---------- boot ---------- */

function bootChrome(activePage) {
  renderNav(activePage);
  if (activePage === 'rankings') renderModeBar(currentModeId());
  wireModalDismiss();
  refreshIcons();
}
