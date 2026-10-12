/* HHHH Tierlist — pure logic (no browser / no supabase refs, node-testable) */

var TIER_POINTS = { HT1: 60, LT1: 45, HT2: 30, LT2: 20, HT3: 10, LT3: 6, HT4: 4, LT4: 3, HT5: 2, LT5: 1 };

var TIER_STRENGTH = { HT1: 10, LT1: 9, HT2: 8, LT2: 7, HT3: 6, LT3: 5, HT4: 4, LT4: 3, HT5: 2, LT5: 1 };

var TITLES = [
  { name: 'Combat Grandmaster', min: 400, gradient: 'linear-gradient(90deg,#FF6B6B,#FFD93D,#FF6B6B)' },
  { name: 'Combat Master',      min: 250, gradient: 'linear-gradient(90deg,#FFD700,#FFA000,#FFD700)' },
  { name: 'Combat Ace',         min: 100, gradient: 'linear-gradient(90deg,#FFD700,#FFA000,#FFD700)' },
  { name: 'Combat Specialist',  min: 50,  gradient: 'linear-gradient(90deg,#E040FB,#7C4DFF,#E040FB)' },
  { name: 'Combat Cadet',       min: 20,  gradient: 'linear-gradient(90deg,#00E5FF,#2979FF,#00E5FF)' },
  { name: 'Combat Novice',      min: 10,  gradient: 'linear-gradient(90deg,#69F0AE,#00C853,#69F0AE)' },
  { name: 'Rookie',             min: 0,   gradient: 'linear-gradient(90deg,#90A4AE,#B0BEC5,#90A4AE)' }
];

var MODE_IDS = ['sword', 'crystal', 'netherite', 'potion', 'mace', 'uhc', 'axe', 'smp', 'diasmp'];

var TIER_STYLE = {
  HT1: { a: '#FFD700', b: '#FFA000', text: '#1A1400', glow: 'rgba(255,215,0,.6)' },
  LT1: { a: '#FFC107', b: '#FF8F00', text: '#1A1400', glow: 'rgba(255,193,7,.5)' },
  HT2: { a: '#FF9800', b: '#E65100', text: '#fff',    glow: 'rgba(255,152,0,.5)' },
  LT2: { a: '#FF7043', b: '#D84315', text: '#fff',    glow: 'rgba(255,112,67,.4)' },
  HT3: { a: '#EF5350', b: '#C62828', text: '#fff',    glow: 'rgba(239,83,80,.4)' },
  LT3: { a: '#AB47BC', b: '#6A1B9A', text: '#fff',    glow: 'rgba(171,71,188,.4)' },
  HT4: { a: '#7E57C2', b: '#4527A0', text: '#fff',    glow: 'rgba(126,87,194,.35)' },
  LT4: { a: '#5C6BC0', b: '#283593', text: '#fff',    glow: 'rgba(92,107,192,.3)' },
  HT5: { a: '#42A5F5', b: '#1565C0', text: '#fff',    glow: 'rgba(66,165,245,.3)' },
  LT5: { a: '#78909C', b: '#37474F', text: '#fff',    glow: 'rgba(120,144,156,.25)' }
};

var REGION_STYLE = {
  'NA':    { color: '#DC2626', label: 'NA' },
  'EU':    { color: '#16A34A', label: 'EU' },
  'AS/AU': { color: '#2563EB', label: 'AS/AU' }
};

function pointsForRank(rank) {
  return TIER_POINTS[rank] || 0;
}

function computePoints(ranks) {
  var total = 0;
  if (!ranks) return 0;
  for (var k in ranks) {
    if (!Object.prototype.hasOwnProperty.call(ranks, k)) continue;
    var entry = ranks[k];
    var code = entry && typeof entry === 'object' ? entry.rank : entry;
    var peak = entry && typeof entry === 'object' ? entry.peak : null;
    /* points always come from the PEAK tier if one is recorded */
    total += pointsForRank(peak || code);
  }
  return total;
}

/* points a single ranks entry contributes (peak tier wins) */
function entryPoints(entry) {
  if (!entry) return 0;
  var code = entry && typeof entry === 'object' ? entry.rank : entry;
  var peak = entry && typeof entry === 'object' ? entry.peak : null;
  return pointsForRank(peak || code);
}

/* display label for a tier code: retired tiers get an R prefix (RLT2) */
function tierLabel(code, retired) {
  return code ? (retired ? 'R' + code : code) : '';
}

/* Combat Grandmaster belongs ONLY to the overall #1 player; everyone else walks the ladder. */
function titleFor(rank, points) {
  if (rank === 1) return TITLES[0];
  for (var i = 1; i < TITLES.length; i++) {
    if (points >= TITLES[i].min) return TITLES[i];
  }
  return TITLES[TITLES.length - 1];
}

/* Derive display fields for one raw player row, then sort + assign global rank. */
function preparePlayers(rawPlayers) {
  var list = (rawPlayers || []).map(function (p) {
    var points = computePoints(p.ranks);
    var modeCount = 0;
    if (p.ranks) {
      for (var k in p.ranks) {
        if (Object.prototype.hasOwnProperty.call(p.ranks, k)) modeCount++;
      }
    }
    return Object.assign({}, p, { points: points, modeCount: modeCount });
  });
  list.sort(function (a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return String(a.name).localeCompare(String(b.name));
  });
  list.forEach(function (p, i) {
    p.rank = i + 1;
    var t = titleFor(p.rank, p.points);
    p.title = t.name;
    p.titleGradient = t.gradient;
  });
  return list;
}

/* Group players into tier buckets (1..5) for one mode.
   Returns [{tier:2, ht:13, lt:75, total:88, players:[{name,region,rank,retired,ht}]}]
   sorted by tier asc, players ranked best-first inside each bucket. */
function groupByTier(preparedPlayers, modeId) {
  var buckets = {};
  for (var t = 1; t <= 5; t++) buckets[t] = [];

  (preparedPlayers || []).forEach(function (p) {
    var entry = p.ranks && p.ranks[modeId];
    if (!entry) return;
    /* retired ranks never appear on per-kit leaderboards */
    if (typeof entry === 'object' && entry.retired) return;
    var code = typeof entry === 'object' ? entry.rank : entry;
    if (!code) return;
    var tierNum = parseInt(String(code).replace(/^[HL]T/, ''), 10);
    if (!tierNum || tierNum < 1 || tierNum > 5) return;
    var isHT = String(code).indexOf('HT') === 0;
    buckets[tierNum].push({
      name: p.name,
      region: p.region,
      premium: p.premium !== false,
      rank: code,
      retired: !!(typeof entry === 'object' && entry.retired),
      ht: isHT
    });
  });

  var out = [];
  for (var t2 = 1; t2 <= 5; t2++) {
    var arr = buckets[t2];
    if (!arr.length) continue;
    arr.sort(function (a, b) {
      if (a.ht !== b.ht) return a.ht ? -1 : 1;
      return (TIER_STRENGTH[b.rank] || 0) - (TIER_STRENGTH[a.rank] || 0);
    });
    var ht = arr.filter(function (x) { return x.ht; }).length;
    out.push({ tier: t2, ht: ht, lt: arr.length - ht, total: arr.length, players: arr });
  }
  return out;
}

/* Radar values for a player: fixed 9-axis order matching RADAR_AXES. */
var RADAR_AXES = [
  { key: 'sword',    label: 'Sword' },
  { key: 'crystal',  label: 'Vanilla' },
  { key: 'axe',      label: 'Axe' },
  { key: 'netherite',label: 'SpearMace' },
  { key: 'uhc',      label: 'UHC' },
  { key: 'potion',   label: 'CartPvP' },
  { key: 'mace',     label: 'Mace' },
  { key: 'smp',      label: 'SMP' },
  { key: 'diasmp',   label: 'Money SMP' }
];

function radarValues(ranks) {
  return RADAR_AXES.map(function (axis) {
    var entry = ranks && ranks[axis.key];
    if (!entry) return { key: axis.key, label: axis.label, code: null, strength: 0, retired: false, peak: null, pts: 0 };
    var obj = typeof entry === 'object' ? entry : null;
    var code = obj ? obj.rank : entry;
    var peak = obj ? (obj.peak || null) : null;
    return {
      key: axis.key,
      label: axis.label,
      code: code || null,
      strength: (code && TIER_STRENGTH[code]) || 0,
      retired: !!(obj && obj.retired),
      peak: peak,
      pts: pointsForRank(peak || code)
    };
  });
}

/* Best discipline for a player — current or retired placement, NEVER peak. */
function strongestDiscipline(ranks) {
  var vals = radarValues(ranks).filter(function (v) { return v.code; });
  if (!vals.length) return null;
  return vals.reduce(function (best, v) { return v.strength > best.strength ? v : best; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TIER_POINTS: TIER_POINTS, TIER_STRENGTH: TIER_STRENGTH, TITLES: TITLES,
    MODE_IDS: MODE_IDS, TIER_STYLE: TIER_STYLE, REGION_STYLE: REGION_STYLE,
    RADAR_AXES: RADAR_AXES,
    pointsForRank: pointsForRank, computePoints: computePoints, titleFor: titleFor,
    entryPoints: entryPoints, tierLabel: tierLabel,
    preparePlayers: preparePlayers, groupByTier: groupByTier,
    radarValues: radarValues, strongestDiscipline: strongestDiscipline
  };
}
