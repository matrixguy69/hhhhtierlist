/* HHHH Tierlist — rankings page (overall table + mode tier view + profile modal) */

var PAGE_SIZE = 100;

var state = {
  mode: currentModeId(),
  all: [],            // prepared players (sorted, derived fields)
  shown: 0,
  searching: false,
  searchResults: [],
  animateEntrance: true   // stagger rows only on first paint / mode switch / search
};

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', function () {
  bootChrome('rankings');
  renderInfoTables();
  wireSearch();
  wireProfileModal();
  loadPlayers();
  initAdmin(); // from admin.js
});

function loadPlayers() {
  var page = document.getElementById('page');
  page.innerHTML = skeletonHtml();

  fetchPlayers().then(function (res) {
    if (res.error && res.error.message !== 'not-configured') {
      page.innerHTML = errorState('Could not load players: ' + esc(res.error.message || 'unknown error'));
      refreshIcons();
      return;
    }
    state.all = preparePlayers(res.data || []);
    state.animateEntrance = true;
    render();
  }).catch(function (e) {
    page.innerHTML = errorState('Could not load players: ' + esc(e.message || e));
    refreshIcons();
  });
}

/* skeleton matching the leaderboard layout (shape-accurate loader) */
function skeletonHtml() {
  var row = '<div class="sk-row">' +
    '<div class="sk sk-medal"></div>' +
    '<div class="sk sk-avatar"></div>' +
    '<div class="sk-lines"><div class="sk sk-line-1"></div><div class="sk sk-line-2"></div></div>' +
    '<div class="sk sk-points"></div>' +
  '</div>';
  return '<div style="display:flex;flex-direction:column;gap:.5rem">' + row + row + row + row + row + row + '</div>';
}

function errorState(msg) {
  return '<div class="empty-state"><i data-lucide="cloud-off"></i>' +
    '<h3>Something went wrong</h3><p>' + msg + '</p>' +
    '<p class="mt-1 text-muted" style="font-size:.8rem">Check js/config.js (Supabase URL + anon key) and that the schema is installed.</p></div>';
}

function notConfiguredState() {
  return '<div class="empty-state"><i data-lucide="database"></i>' +
    '<h3>No data source connected</h3>' +
    '<p>Set your Supabase URL and anon key in <code>js/config.js</code>, then reload.</p>' +
    '<p class="mt-1 text-muted" style="font-size:.8rem">See SUPABASE_SETUP.md for the SQL + steps.</p></div>';
}

/* ---------- render router ---------- */

function render() {
  var page = document.getElementById('page');
  if (!SUPABASE_READY && state.all.length === 0 && !isAdminLoggedIn()) {
    page.innerHTML = notConfiguredState();
    refreshIcons();
    return;
  }
  if (state.mode === 'overall') renderOverall(page);
  else renderTierView(page, modeById(state.mode));
  refreshIcons();
  wireRowClicks();
}

/* ---------- overall leaderboard ---------- */

function renderOverall(page) {
  var list = state.searching ? state.searchResults : state.all;
  var headerCount = state.searching
    ? list.length + ' result' + (list.length === 1 ? '' : 's')
    : list.length.toLocaleString() + ' ranked players';

  var head =
    '<div class="pagehead">' +
      '<div class="section-rule"><span class="section-rule__text">' + esc(headerCount) + '</span></div>' +
      '<button class="info-btn" id="btn-info"><i data-lucide="info"></i> Information</button>' +
    '</div>' +
    '<div class="lb-head">' +
      '<div class="lb-head__rank">#</div>' +
      '<div class="lb-head__player">Player</div>' +
      '<div class="lb-head__points">Points</div>' +
      '<div class="lb-head__region">Region</div>' +
      '<div class="lb-head__tiers">Tiers</div>' +
    '</div>';

  if (!list.length) {
    page.innerHTML = head + emptyPlayers();
    return;
  }

  var visible;
  if (state.searching) {
    visible = list; // search results are small — show them all
  } else {
    if (state.shown === 0) state.shown = Math.min(PAGE_SIZE, list.length);
    visible = list.slice(0, state.shown);
  }
  var entrance = state.animateEntrance;
  state.animateEntrance = false;

  var rows = visible.map(function (p, i) {
    var top3 = p.rank <= 3 ? ' player-row--top3' : '';
    var glow = p.rank === 1 ? 'rgba(255,215,0,.3)' : p.rank === 2 ? 'rgba(192,192,192,.25)' : p.rank === 3 ? 'rgba(205,127,50,.25)' : '';
    var medals = p.rank <= 3 ? ' rank-medal--' + p.rank : '';
    var titleSt = TITLES.find(function (t) { return t.name === p.title; });
    var cls = 'player-row' + top3 + (entrance ? ' enter' : '');
    var attrs = '';
    if (entrance) attrs += ' style="animation-delay:' + Math.min(i, 18) * 45 + 'ms' + (glow ? ';--row-glow-color:' + glow : '') + '"';
    else if (glow) attrs += ' style="--row-glow-color:' + glow + '"';

    var entries = MODES.map(function (m) {
      var e = p.ranks && p.ranks[m.id];
      var code = e && typeof e === 'object' ? e.rank : e;
      var retired = !!(e && typeof e === 'object' && e.retired);
      var peak = e && typeof e === 'object' && e.peak ? e.peak : null;
      return { m: m, code: code, retired: retired, peak: peak, pts: entryPoints(e) };
    });
    /* best -> worst (unranked last); icon inside the bubble, tier code + points on hover */
    entries.sort(function (a, b) {
      var sa = a.code ? (TIER_STRENGTH[a.code] || 0) : -1;
      var sb = b.code ? (TIER_STRENGTH[b.code] || 0) : -1;
      return sb - sa;
    });
    var tiers = entries.map(function (en) {
      var label = tierLabel(en.code, en.retired);
      var tip = '<span class="tip" aria-hidden="true">' +
        '<span class="tip__name">' + esc(en.m.displayName) + '</span>' +
        (en.code
          ? '<span class="tip__row"><b>' + esc(label) + '</b> <i>' + en.pts + ' pts</i>' +
            (en.peak ? ' <em>(' + esc(en.peak) + ')</em>' : '') + '</span>'
          : '<span class="tip__row tip__row--none">not ranked</span>') +
        '</span>';
      return '<span class="tier-badge-wrap">' +
        tierBadgeHtml(en.code, { retired: en.retired, icon: en.m.id }) +
        (label ? '<span class="tier-code">' + esc(label) + '</span>' : '') +
        tip + '</span>';
    }).join('');

    return '<button class="' + cls + '"' + attrs +
      ' data-player="' + esc(p.name) + '"' +
      ' aria-label="View profile for ' + esc(p.name) + '">' +
      '<div class="player-row__grid">' +
        '<span class="rank-medal' + medals + '">' + p.rank + '</span>' +
        avatarHtml(p.name, 'avatar', p.premium) +
        '<div class="player-id">' +
          '<div class="player-name">' + esc(p.name) + '</div>' +
          '<div class="title-badge">' +
            '<i data-lucide="star" style="color:var(--gold-400)"></i>' +
            '<span style="background:' + (titleSt ? titleSt.gradient : 'none') + ';-webkit-background-clip:text;background-clip:text;color:' + (titleSt ? 'transparent' : 'inherit') + '">• ' + esc(p.title) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="points"><div class="points__val">' + p.points + '</div><div class="points__label">Points</div></div>' +
        regionChipHtml(p.region) +
        '<div class="player-row__meta">' +
          '<span class="points-inline">' + p.points + ' pts</span>' + regionChipHtml(p.region) +
        '</div>' +
        '<div class="tiers-cell">' + tiers + '</div>' +
      '</div>' +
    '</button>';
  }).join('');

  var endLabel = '';
  if (state.searching) endLabel = '';
  else if (state.shown >= list.length) endLabel = '<div class="lb-end">End of leaderboard</div>';
  else endLabel = '<div class="lb-end" id="sentinel"><span class="lb-end__spinner"></span>Loading more...</div>';

  page.innerHTML = head + '<div class="lb-list">' + rows + '</div>' + endLabel;
  wireSentinel(list);
}

function emptyPlayers() {
  if (state.searching) return '<div class="empty-state"><i data-lucide="search-x"></i><h3>No players found</h3><p>Try a different search term.</p></div>';
  if (!state.all.length) {
    return '<div class="empty-state"><i data-lucide="users"></i><h3>No players yet</h3>' +
      '<p>' + (isAdminLoggedIn() ? 'Press <b>Add Player</b> above to add the first one.' : 'The admin can add players once logged in.') + '</p></div>';
  }
  return '';
}

/* infinite scroll sentinel (client-side slice) */
var sentinelObserver = null;
function wireSentinel(list) {
  if (sentinelObserver) { sentinelObserver.disconnect(); sentinelObserver = null; }
  var s = document.getElementById('sentinel');
  if (!s || state.searching) return;
  sentinelObserver = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && state.shown < list.length) {
      state.shown = Math.min(state.shown + PAGE_SIZE, list.length);
      render();
    }
  }, { rootMargin: '200px', threshold: 0.1 });
  sentinelObserver.observe(s);
}

/* ---------- mode tier view ---------- */

function renderTierView(page, mode) {
  var list = state.searching ? state.searchResults : state.all;
  var groups = groupByTier(list, mode.id); // skips retired ranks
  var totalPlayers = groups.reduce(function (n, g) { return n + g.total; }, 0);
  var totalTiers = groups.length;

  var head =
    '<div class="pagehead">' +
      '<div class="pagehead__left">' +
        '<span class="mode-icon-box" style="color:' + mode.color + ';border-color:' + hexA(mode.color, .4) + ';background:' + hexA(mode.color, .12) + '">' +
          kitIcon(mode.id, 'kit-icon--32') + '</span>' +
        '<div>' +
          '<h1>' + esc(mode.displayName) + '</h1>' +
          '<div class="pagehead__sub"><i data-lucide="users" style="width:14px;height:14px"></i>' +
            esc(state.searching ? totalPlayers + ' result' + (totalPlayers === 1 ? '' : 's') : totalPlayers + ' players across ' + totalTiers + ' tiers') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pagehead__left">' +
        '<div class="legend">' +
          '<span class="legend__item"><span class="legend__dot legend__dot--ht"></span>High Tier</span>' +
          '<span class="legend__item"><span class="legend__dot legend__dot--lt"></span>Low Tier</span>' +
        '</div>' +
        '<button class="info-btn" id="btn-info"><i data-lucide="info"></i> Information</button>' +
      '</div>' +
    '</div>';

  if (!groups.length) {
    page.innerHTML = head + emptyPlayers();
    return;
  }

  var entrance = state.animateEntrance;
  state.animateEntrance = false;

  var cards = groups.map(function (g, gi) {
    var rows = g.players.map(function (pl) {
      return '<button class="tier-player' + (pl.ht ? ' tier-player--ht' : '') + (pl.retired ? ' tier-player--retired' : '') +
        '" data-player="' + esc(pl.name) + '" aria-label="View profile for ' + esc(pl.name) + '">' +
        avatarHtml(pl.name, 'tier-player__avatar', pl.premium) +
        '<span class="tier-player__name">' + esc(pl.name) + '</span>' +
        regionChipHtml(pl.region) +
      '</button>';
    }).join('');

    return '<section class="tier-card' + (entrance ? ' enter' : '') + '"' +
      (entrance ? ' style="animation-delay:' + Math.min(gi, 12) * 55 + 'ms"' : '') +
      ' data-tier="' + g.tier + '">' +
      '<header class="tier-card__head" data-toggle-tier>' +
        '<i data-lucide="trophy" class="tier-card__trophy"></i>' +
        '<span class="tier-card__title">Tier ' + g.tier + '</span>' +
        '<span class="tier-card__counts">' +
          (g.ht ? '<span class="tier-card__count tier-card__count--ht">' + g.ht + '</span>' : '') +
          '<span class="tier-card__count tier-card__count--lt">' + g.lt + '</span>' +
          '<span class="tier-card__total">' + g.total + '</span>' +
          '<span class="tier-card__chev"><i data-lucide="chevron-down"></i></span>' +
        '</span>' +
      '</header>' +
      '<div class="tier-card__body scrollbar-styled">' + rows + '</div>' +
    '</section>';
  }).join('');

  page.innerHTML = head + '<div class="tier-grid">' + cards + '</div>';
}

/* ---------- interactions ---------- */

function wireRowClicks() {
  var infoBtn = document.getElementById('btn-info');
  if (infoBtn) infoBtn.addEventListener('click', function () { openModal('info-modal'); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-player]'), function (node) {
    node.addEventListener('click', function () { openProfile(node.getAttribute('data-player')); });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-toggle-tier]'), function (node) {
    node.addEventListener('click', function () {
      node.closest('.tier-card').classList.toggle('tier-card--collapsed');
    });
  });
}

/* search: 300ms debounce, min 3 chars, filters the prepared list client-side */
function wireSearch() {
  var input = document.getElementById('player-search');
  if (!input) return;
  var t = null;
  input.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var q = input.value.trim().toLowerCase();
      state.animateEntrance = true;
      if (q.length < 3) {
        state.searching = false;
        state.searchResults = [];
        state.shown = 0;
        render();
        return;
      }
      state.searchResults = state.all.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) !== -1;
      });
      state.searching = true;
      render();
    }, 300);
  });
}

function renderInfoTables() {
  var order = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
  var labels = {
    HT1: 'High Tier 1', LT1: 'Low Tier 1', HT2: 'High Tier 2', LT2: 'Low Tier 2',
    HT3: 'High Tier 3', LT3: 'Low Tier 3', HT4: 'High Tier 4', LT4: 'Low Tier 4',
    HT5: 'High Tier 5', LT5: 'Low Tier 5'
  };
  document.getElementById('points-table').innerHTML = order.map(function (code) {
    return '<tr><td><span class="rank-chip" style="' + tierGradient(code) + '">' + code + '</span> ' +
      labels[code] + '</td><td>' + TIER_POINTS[code] + '</td></tr>';
  }).join('');

  document.getElementById('titles-table').innerHTML = TITLES.map(function (t, i) {
    var range = t.name === 'Rookie' ? '0 - 9 pts' : (t.name === 'Combat Grandmaster' ? '#1 overall' : t.min + '+ pts');
    var icons = ['👑', '🏆', '⭐', '🎖️', '🎓', '🔰', '🌱'];
    return '<div class="title-row">' +
      '<span class="title-row__name" style="background:' + t.gradient +
        ';background-clip:text;-webkit-background-clip:text;color:transparent">' + icons[i] + ' ' + t.name + '</span>' +
      '<span class="title-row__pts">' + range + '</span></div>';
  }).join('');
}

/* ---------- profile modal + radar ---------- */

function wireProfileModal() { /* dismissal handled by core.wireModalDismiss */ }

function openProfile(name) {
  var p = state.all.find(function (x) { return x.name === name; });
  var mount = document.getElementById('profile-content');
  if (!p) { mount.innerHTML = '<div class="profile__center"><div class="spinner"></div>Loading profile...</div>'; openModal('profile-modal'); return; }
  mount.innerHTML = profileHtml(p);
  openModal('profile-modal');
  refreshIcons();
  var editBtn = document.getElementById('profile-edit');
  if (editBtn) editBtn.addEventListener('click', function () {
    closeModal('profile-modal');
    openPlayerForm(p); // from admin.js
  });
}

function profileHtml(p) {
  var best = strongestDiscipline(p.ranks);
  var titleSt = TITLES.find(function (t) { return t.name === p.title; });
  var accent = '#FFC107';
  if (p.title === 'Combat Specialist') accent = '#C586FF';
  else if (p.title === 'Combat Cadet') accent = '#4FD3FF';
  else if (p.title === 'Combat Novice') accent = '#5CE08A';
  else if (p.title === 'Rookie') accent = '#9AA4B2';

  var present = radarValues(p.ranks).filter(function (v) { return v.code; }).length;

  var blurb = 'Ranked across <b>' + present + '</b> of nine combat disciplines.';
  if (best) blurb += ' Strongest in <b>' + esc(best.label) + '</b> at <b>' + esc(tierLabel(best.code, best.retired)) + '</b>.';

  var vals = radarValues(p.ranks);
  /* disciplines best -> worst (unranked last) */
  var chipData = RADAR_AXES.map(function (axis, idx) { return { axis: axis, v: vals[idx] }; });
  chipData.sort(function (a, b) {
    var sa = a.v.code ? (TIER_STRENGTH[a.v.code] || 0) : -1;
    var sb = b.v.code ? (TIER_STRENGTH[b.v.code] || 0) : -1;
    return sb - sa;
  });

  var chips = chipData.map(function (d) {
    var axis = d.axis, v = d.v;
    var m = modeById(axis.key);
    var isBest = best && best.key === axis.key;
    var codeHtml = v.code
      ? '<span class="disc-chip__tier" style="color:' + (TIER_STYLE[v.code] ? TIER_STYLE[v.code].a : '#fff') + '">' + esc(tierLabel(v.code, v.retired)) + '</span>'
      : '<span class="disc-chip__tier" style="color:var(--obsidian-500)">—</span>';
    var tip = '<span class="tip" aria-hidden="true">' +
      '<span class="tip__name">' + esc(axis.label) + '</span>' +
      (v.code
        ? '<span class="tip__row"><b>' + esc(tierLabel(v.code, v.retired)) + '</b> <i>' + v.pts + ' pts</i>' +
          (v.peak ? ' <em>(' + esc(v.peak) + ')</em>' : '') + '</span>'
        : '<span class="tip__row tip__row--none">not ranked</span>') +
      '</span>';
    return '<span class="disc-chip' + (isBest ? ' disc-chip--best' : '') + '"' +
      (v.retired ? ' style="opacity:.55"' : '') + '>' +
      '<span class="disc-chip__icon" style="background:' + (m ? hexA(m.color, .15) : 'var(--obsidian-700)') + '">' +
        (m ? kitIcon(m.id) : '<i data-lucide="circle"></i>') + '</span>' +
      '<span class="disc-chip__name">' + esc(axis.label) + '</span>' +
      codeHtml +
      (isBest ? '<span class="disc-chip__star">★</span>' : '') +
      tip +
    '</span>';
  }).join('');

  var adminActions = isAdminLoggedIn()
    ? '<button class="btn btn-ghost" id="profile-edit"><i data-lucide="pencil"></i> Edit</button>'
    : '';
  var actionsCls = adminActions ? 'profile__actions' : 'profile__actions profile__actions--single';

  return '<div class="profile">' +
    '<div class="profile__top">' +
      '<div class="profile__left">' +
        '<div class="profile__eyebrow" style="color:' + accent + '">' + esc(p.title.toUpperCase()) + '</div>' +
        '<div class="profile__avatarwrap">' +
          (p.premium === false
            ? avatarFallbackHtml(p.name, 'profile__avatar')
            : '<img class="profile__avatar" src="' + esc(avatarUrl(p.name)) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;profile__avatar avatar--fallback&quot;>' + esc(String(p.name).charAt(0).toUpperCase()) + '</div>\'">') +
          '<span class="profile__badge"><i data-lucide="trophy"></i></span>' +
        '</div>' +
        '<h2 class="profile__name">' + esc(p.name) + '</h2>' +
        '<div class="profile__meta">' +
          regionChipHtml(p.region) +
          '<span><i data-lucide="award"></i> ' + p.modeCount + ' modes</span>' +
        '</div>' +

        '<div class="profile__stats">' +
          '<div class="stat-box"><div class="stat-box__val">#' + p.rank + '</div><div class="stat-box__label">Global</div></div>' +
          '<div class="stat-box"><div class="stat-box__val stat-box__val--gold">' + p.points + '</div><div class="stat-box__label">Points</div></div>' +
          '<div class="stat-box"><div class="stat-box__val">' + p.modeCount + '</div><div class="stat-box__label">Modes</div></div>' +
        '</div>' +

        '<p class="profile__blurb">' + blurb + '</p>' +
      '</div>' +

      '<div class="profile__right">' +
        '<div class="spectrum-title">Skill Spectrum</div>' +
        radarSvg(p) +
      '</div>' +
    '</div>' +

    '<div class="disc-grid">' + chips + '</div>' +

    '<div class="' + actionsCls + '">' +
      '<a class="btn btn-ghost" href="https://namemc.com/profile/' + encodeURIComponent(p.name) + '" target="_blank" rel="noopener">NameMC <i data-lucide="arrow-up-right"></i></a>' +
      adminActions +
      '<button class="btn btn-gold" data-close-modal>Close</button>' +
    '</div>' +
  '</div>';
}

/* hand-rolled radar chart (SVG), fixed 9 axes */
function radarSvg(p) {
  var vals = radarValues(p.ranks);
  var n = vals.length;
  var cx = 150, cy = 150, R = 100;
  var pt = function (i, r) {
    var a = -Math.PI / 2 + 2 * i * Math.PI / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  var grid = '';
  [0.25, 0.5, 0.75, 1].forEach(function (f) {
    var pts = '';
    for (var i = 0; i < n; i++) pts += pt(i, R * f).join(',') + ' ';
    grid += '<polygon class="radar__grid" points="' + pts.trim() + '"/>';
  });

  var axes = '', labels = '';
  for (var i = 0; i < n; i++) {
    var e = pt(i, R);
    axes += '<line class="radar__axis" x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '"/>';
    var lp = pt(i, R + 16);
    var anchor = lp[0] < cx - 4 ? 'end' : lp[0] > cx + 4 ? 'start' : 'middle';
    var best = strongestDiscipline(p.ranks);
    var isTop = best && best.key === vals[i].key;
    labels += '<text class="radar__label' + (isTop ? ' radar__label--top' : '') + '" x="' + lp[0] + '" y="' + (lp[1] + 3) + '" text-anchor="' + anchor + '">' + esc(vals[i].label.toUpperCase()) + '</text>';
  }

  var dataPts = '', dots = '';
  for (var j = 0; j < n; j++) {
    var r = (vals[j].strength / 10) * R;
    var d = pt(j, r);
    dataPts += d.join(',') + ' ';
    var best2 = strongestDiscipline(p.ranks);
    var isTop2 = best2 && best2.key === vals[j].key;
    var fill = vals[j].retired ? 'rgba(255,255,255,.5)' : (TIER_STYLE[vals[j].code] ? TIER_STYLE[vals[j].code].a : '#FFC107');
    dots += '<circle class="radar__dot" cx="' + d[0] + '" cy="' + d[1] + '" r="' + (isTop2 ? 4 : 3) + '" fill="' + fill + '"/>';
  }

  var topStyle = strongestDiscipline(p.ranks);
  var shapeFill = topStyle && TIER_STYLE[topStyle.code] ? TIER_STYLE[topStyle.code].a : '#FFC107';
  var glow = topStyle && TIER_STYLE[topStyle.code] ? TIER_STYLE[topStyle.code].glow : 'rgba(255,193,7,.5)';

  return '<svg class="radar" viewBox="0 0 300 300" style="--radar-glow:' + glow + '" role="img" aria-label="Skill spectrum radar chart">' +
    grid + axes +
    '<polygon class="radar__shape" points="' + dataPts.trim() + '" fill="' + hexA(shapeFill, 1) + '" stroke="' + shapeFill + '"/>' +
    dots + labels +
  '</svg>';
}
