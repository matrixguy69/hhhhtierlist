/* HHHH Tierlist — admin: Supabase auth + player add/edit/delete */

var adminUser = null;

function isAdminLoggedIn() { return !!adminUser; }

function initAdmin() {
  wireLoginForm();
  wirePlayerForm();
  wireAdminButtons();
  wireSkinPreview();
  showAdminBar(false); /* bar always visible: shows Log in until authed */

  if (window.STORE) {
    /* local preview store (js/demo.js): admin unlocked */
    adminUser = window.STORE.user;
    showAdminBar(true);
    return;
  }

  db.auth.getUser().then(function (res) {
    if (res.data && res.data.user) {
      adminUser = res.data.user;
      showAdminBar(true);
    }
  });

  db.auth.onAuthStateChange(function (_event, session) {
    adminUser = session ? session.user : null;
    showAdminBar(!!adminUser);
  });
}

function showAdminBar(show) {
  var bar = document.getElementById('admin-bar');
  if (bar) {
    bar.setAttribute('data-visible', 'true');
    bar.setAttribute('data-authed', show ? 'true' : 'false');
  }
  refreshIcons();
}

function wireAdminButtons() {
  var login = document.getElementById('btn-login');
  if (login) login.addEventListener('click', function () { openModal('login-modal'); });

  var add = document.getElementById('btn-add-player');
  if (add) add.addEventListener('click', function () { openPlayerForm(null); });

  var out = document.getElementById('btn-logout');
  if (out) out.addEventListener('click', function () {
    if (SUPABASE_READY) db.auth.signOut();
    adminUser = null;
    showAdminBar(false);
  });
}

/* ---------- login ---------- */

function wireLoginForm() {
  var form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('login-error');
    err.textContent = '';

    if (!SUPABASE_READY) {
      err.textContent = 'Supabase is not configured (see js/config.js).';
      return;
    }

    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    db.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) { err.textContent = res.error.message; return; }
        adminUser = res.data.user;
        showAdminBar(true);
        closeModal('login-modal');
        form.reset();
      })
      .catch(function (e2) { err.textContent = e2.message || String(e2); });
  });
}

/* If a non-admin hits a write action, prompt login first. */
function requireLogin() {
  if (adminUser) return true;
  openModal('login-modal');
  return false;
}

/* ---------- add / edit form ---------- */

function openPlayerForm(player) {
  if (!requireLogin()) return;

  var title = document.getElementById('player-form-title');
  var id = document.getElementById('pf-id');
  var name = document.getElementById('pf-name');
  var region = document.getElementById('pf-region');
  var account = document.getElementById('pf-account');
  var err = document.getElementById('pf-error');
  var del = document.getElementById('pf-delete');

  err.textContent = '';
  buildKitFields(player);

  if (player) {
    title.textContent = 'Edit Player';
    id.value = player.id || '';
    name.value = player.name;
    region.value = player.region;
    account.value = player.premium === false ? 'cracked' : 'premium';
    del.style.display = '';
    del.onclick = function () { deletePlayer(player); };
  } else {
    title.textContent = 'Add Player';
    id.value = '';
    name.value = '';
    region.value = 'AS/AU';
    account.value = 'premium';
    del.style.display = 'none';
    del.onclick = null;
  }

  updateSkinPreview();
  openModal('player-form-modal');
  refreshIcons();
}

/* live skin preview while typing (premium only) */
var previewTimer = null;
function updateSkinPreview() {
  var mount = document.getElementById('pf-preview');
  if (!mount) return;
  var name = document.getElementById('pf-name').value.trim();
  var account = document.getElementById('pf-account').value;
  if (!name || account !== 'premium') {
    mount.innerHTML = '<span class="pf-preview__empty">' +
      (!name ? 'Type a premium name' : 'Cracked accounts have no skin') + '</span>';
    return;
  }
  mount.innerHTML = '<img class="pf-preview__img" src="' + esc(avatarUrl(name)) +
    '" alt="" onerror="this.parentElement.innerHTML=\'<span class=&quot;pf-preview__empty&quot;>No skin found for that name</span>\'">';
}

function wireSkinPreview() {
  var name = document.getElementById('pf-name');
  var account = document.getElementById('pf-account');
  if (name) name.addEventListener('input', function () {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updateSkinPreview, 350);
  });
  if (account) account.addEventListener('change', updateSkinPreview);
}

var KIT_ORDER = ['sword', 'crystal', 'netherite', 'potion', 'mace', 'uhc', 'axe', 'smp', 'diasmp'];
var TIER_CODES = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
var RETIREABLE = { HT1: 1, LT1: 1, HT2: 1, LT2: 1 }; /* retired only for tier 1 & 2 */

function buildKitFields(player) {
  var wrap = document.getElementById('pf-kits');
  wrap.innerHTML = KIT_ORDER.map(function (modeId) {
    var m = modeById(modeId);
    var entry = player && player.ranks && player.ranks[modeId];
    var code = entry && typeof entry === 'object' ? entry.rank : entry;
    var canRetire = !!RETIREABLE[code]; /* retired only for tier 1 & 2 */
    var retired = !!(entry && typeof entry === 'object' && entry.retired) && canRetire;
    var peak = entry && typeof entry === 'object' ? entry.peak : null;

    var opts = '<option value="">—</option>' + TIER_CODES.map(function (c) {
      return '<option value="' + c + '"' + (c === code ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    var peakOpts = '<option value="">—</option>' + TIER_CODES.map(function (c) {
      return '<option value="' + c + '"' + (c === peak ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    return '<div class="kit-field" data-mode="' + modeId + '">' +
      '<div class="kit-field__label" style="color:' + m.color + '">' + kitIcon(m.id) + esc(m.name) + '</div>' +
      '<div class="kit-field__selects">' +
        '<select class="form-input" data-kit="' + modeId + '" aria-label="' + esc(m.displayName) + ' tier">' + opts + '</select>' +
        '<select class="form-input" data-kit-peak="' + modeId + '" aria-label="' + esc(m.displayName) + ' peak tier" title="Peak (best ever)">' + peakOpts + '</select>' +
      '</div>' +
      '<label class="kit-field__retired' + (canRetire ? '' : ' kit-field__retired--hidden') + '">' +
        '<input type="checkbox" data-kit-retired="' + modeId + '"' + (retired ? ' checked' : '') + '> Retired</label>' +
    '</div>';
  }).join('');
  wireKitFieldVisibility();
}

/* retired checkbox only for tier 1 & 2 selections */
function wireKitFieldVisibility() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-kit]'), function (sel) {
    sel.addEventListener('change', function () {
      var field = sel.closest('.kit-field');
      var box = field.querySelector('[data-kit-retired]');
      var label = field.querySelector('.kit-field__retired');
      var ok = RETIREABLE[sel.value];
      label.classList.toggle('kit-field__retired--hidden', !ok);
      if (!ok) box.checked = false;
    });
  });
}

function collectRanks() {
  var ranks = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-kit]'), function (sel) {
    var modeId = sel.getAttribute('data-kit');
    var code = sel.value;
    if (!code) return;
    var box = document.querySelector('[data-kit-retired="' + modeId + '"]');
    var peakSel = document.querySelector('[data-kit-peak="' + modeId + '"]');
    var entry = { rank: code, retired: !!(box && box.checked) };
    if (peakSel && peakSel.value) entry.peak = peakSel.value;
    ranks[modeId] = entry;
  });
  return ranks;
}

function wirePlayerForm() {
  var form = document.getElementById('player-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!adminUser) { closeModal('player-form-modal'); openModal('login-modal'); return; }

    var err = document.getElementById('pf-error');
    err.textContent = '';

    var id = document.getElementById('pf-id').value;
    var name = document.getElementById('pf-name').value.trim();
    var region = document.getElementById('pf-region').value;
    var premium = document.getElementById('pf-account').value !== 'cracked';
    if (!name) { err.textContent = 'Name is required.'; return; }

    var row = { name: name, region: region, premium: premium, ranks: collectRanks() };

    if (window.STORE) {
      window.STORE.save(id || null, row,
        function () { closeModal('player-form-modal'); reloadPlayers(); },
        function (m) { err.textContent = m; });
      return;
    }

    var req = id
      ? db.from('players').update(row).eq('id', id)
      : db.from('players').insert(row);

    req.then(function (res) {
      if (res.error) { err.textContent = res.error.message; return; }
      closeModal('player-form-modal');
      reloadPlayers();
    }).catch(function (e2) { err.textContent = e2.message || String(e2); });
  });
}

function deletePlayer(player) {
  if (!adminUser) return;
  if (!confirm('Delete "' + player.name + '"? This cannot be undone.')) return;

  if (window.STORE) {
    window.STORE.remove(player, function () { closeModal('player-form-modal'); reloadPlayers(); });
    return;
  }

  var query = player.id ? db.from('players').delete().eq('id', player.id)
                        : db.from('players').delete().eq('name', player.name);
  query.then(function (res) {
    if (res.error) { document.getElementById('pf-error').textContent = res.error.message; return; }
    closeModal('player-form-modal');
    reloadPlayers();
  });
}

function reloadPlayers() {
  fetchPlayers().then(function (res) {
    state.all = preparePlayers(res.data || []);
    state.shown = 0;
    state.searching = false;
    var input = document.getElementById('player-search');
    if (input) input.value = '';
    render();
  });
}
