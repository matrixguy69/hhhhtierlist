/* Runnable check for js/logic.js — run: node test.js */
var L = require('./js/logic.js');
var assert = require('assert');

// points per rank table
assert.strictEqual(L.pointsForRank('HT1'), 60);
assert.strictEqual(L.pointsForRank('LT1'), 45);
assert.strictEqual(L.pointsForRank('LT5'), 1);
assert.strictEqual(L.pointsForRank('NOPE'), 0);

// computePoints accepts both object entries and plain code strings; PEAK tier wins for points
assert.strictEqual(L.computePoints({ sword: { rank: 'HT1', retired: false }, uhc: 'LT5' }), 61);
assert.strictEqual(L.computePoints({ sword: { rank: 'HT3', peak: 'HT1' } }), 60);   // peak 60 > current 10
assert.strictEqual(L.computePoints({}), 0);
assert.strictEqual(L.computePoints(null), 0);

// entryPoints (single entry, peak wins)
assert.strictEqual(L.entryPoints({ rank: 'LT2', retired: false }), 20);
assert.strictEqual(L.entryPoints({ rank: 'LT2', peak: 'HT1' }), 60);
assert.strictEqual(L.entryPoints(null), 0);

// tierLabel: retired gets R prefix
assert.strictEqual(L.tierLabel('LT2', true), 'RLT2');
assert.strictEqual(L.tierLabel('LT2', false), 'LT2');
assert.strictEqual(L.tierLabel(null, true), '');

// titleFor: rank 1 = Grandmaster ALWAYS; others walk ladder (never Grandmaster)
assert.strictEqual(L.titleFor(1, 3).name, 'Combat Grandmaster');
assert.strictEqual(L.titleFor(1, 400).name, 'Combat Grandmaster');
assert.strictEqual(L.titleFor(2, 9999).name, 'Combat Master');   // 400+ but not #1 -> Master
assert.strictEqual(L.titleFor(5, 0).name, 'Rookie');
assert.strictEqual(L.titleFor(5, 9).name, 'Rookie');
assert.strictEqual(L.titleFor(5, 10).name, 'Combat Novice');
assert.strictEqual(L.titleFor(5, 49).name, 'Combat Cadet');
assert.strictEqual(L.titleFor(5, 50).name, 'Combat Specialist');
assert.strictEqual(L.titleFor(5, 100).name, 'Combat Ace');
assert.strictEqual(L.titleFor(5, 250).name, 'Combat Master');

// preparePlayers: sorts by points desc, assigns global rank, GM title for #1 only
var prepared = L.preparePlayers([
  { name: 'Low',  region: 'EU', ranks: { sword: { rank: 'LT5', retired: false } } },
  { name: 'High', region: 'NA', ranks: { sword: { rank: 'HT1', retired: false }, uhc: { rank: 'LT1', retired: false } } },
  { name: 'Mid',  region: 'AS/AU', ranks: { axe: { rank: 'LT3', retired: false } } }
]);
assert.strictEqual(prepared[0].name, 'High');
assert.strictEqual(prepared[0].rank, 1);
assert.strictEqual(prepared[0].points, 105);
assert.strictEqual(prepared[0].title, 'Combat Grandmaster'); // #1 gets GM regardless of points
assert.strictEqual(prepared[1].title, 'Rookie');             // 6 pts, rank 2 -> ladder
assert.strictEqual(prepared[1].points, 6);
assert.strictEqual(prepared[2].rank, 3);
assert.strictEqual(prepared[1].modeCount, 1);

// groupByTier: buckets by tier number, splits HT/LT, skips players without that mode
var groups = L.groupByTier(prepared, 'sword');
assert.strictEqual(groups.length, 2); // tier1 (High) and tier5 (Low)
assert.strictEqual(groups[0].tier, 1);
assert.strictEqual(groups[0].ht, 1);
assert.strictEqual(groups[0].lt, 0);
assert.strictEqual(groups[0].players[0].name, 'High');
assert.strictEqual(groups[1].tier, 5);
assert.strictEqual(groups[1].ht, 0);
assert.strictEqual(groups[1].lt, 1);
// Mid has no sword rank -> not in any group
assert.ok(!groups.some(function (g) { return g.players.some(function (p) { return p.name === 'Mid'; }); }));

// HT ranks sort above LT inside a bucket
var mixed = L.preparePlayers([
  { name: 'LowOne',  region: 'EU', ranks: { mace: { rank: 'LT3', retired: false } } },
  { name: 'HighOne', region: 'EU', ranks: { mace: { rank: 'HT3', retired: false } } }
]);
var mg = L.groupByTier(mixed, 'mace');
assert.strictEqual(mg[0].ht, 1);
assert.strictEqual(mg[0].lt, 1);
assert.strictEqual(mg[0].players[0].name, 'HighOne');

// RETIRED ranks never appear on per-kit leaderboards
var retiredTest = L.preparePlayers([
  { name: 'RetiredOne', region: 'EU', ranks: { uhc: { rank: 'LT2', retired: true } } },
  { name: 'ActiveOne',  region: 'EU', ranks: { uhc: { rank: 'LT2', retired: false } } }
]);
var rg = L.groupByTier(retiredTest, 'uhc');
assert.strictEqual(rg.length, 1);
assert.strictEqual(rg[0].total, 1);                       // only ActiveOne counted
assert.strictEqual(rg[0].players[0].name, 'ActiveOne');

// premium flag passes through to tier groups (false stays false, missing defaults true)
var sk = L.preparePlayers([
  { name: 'CrackedOne', region: 'EU', premium: false, ranks: { axe: { rank: 'LT2', retired: false } } },
  { name: 'PremiumOne', region: 'NA', ranks: { axe: { rank: 'HT2', retired: false } } }
]);
var skg = L.groupByTier(sk, 'axe');
assert.strictEqual(skg.length, 1); // both in tier 2
assert.strictEqual(skg[0].players[0].premium, true);   // HT2 PremiumOne first
assert.strictEqual(skg[0].players[1].premium, false);  // LT2 CrackedOne second

// radarValues: fixed 9 axes, missing modes = strength 0; peak/pts exposed for tooltips
var rv = L.radarValues({ sword: { rank: 'HT3', peak: 'HT1' }, potion: { rank: 'LT3', retired: true } });
assert.strictEqual(rv.length, 9);
assert.strictEqual(rv[0].strength, 6);  // sword CURRENT tier drives chart strength
assert.strictEqual(rv[0].peak, 'HT1');
assert.strictEqual(rv[0].pts, 60);      // but points come from peak
assert.strictEqual(rv[5].strength, 5);  // potion axis
assert.strictEqual(rv[5].retired, true);
assert.strictEqual(rv[1].strength, 0);  // crystal missing

// strongestDiscipline: current OR retired placement counts, NEVER peak; missing ignored
var best = L.strongestDiscipline({
  sword: { rank: 'HT3', retired: false },
  crystal: { rank: 'HT1', retired: true },
  mace: { rank: 'LT1', retired: false }
});
assert.strictEqual(best.key, 'crystal');      // retired HT1 still counts (strength 10)
assert.strictEqual(best.code, 'HT1');         // shows CURRENT code, not peak
assert.strictEqual(L.tierLabel(best.code, best.retired), 'RHT1');
assert.strictEqual(L.strongestDiscipline({ sword: { rank: 'HT3', peak: 'HT1' } }).code, 'HT3'); // never peak
assert.strictEqual(L.strongestDiscipline({}), null);

console.log('All logic tests passed.');
