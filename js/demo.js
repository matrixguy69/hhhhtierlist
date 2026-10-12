/* HHHH Tierlist — LOCAL DEMO STORE
   Only active when Supabase is NOT configured (js/config.js placeholders):
   players are saved to this browser's localStorage so you can preview the
   leaderboard without a backend. Inert once Supabase keys are in.
   To go fully demo-free: delete this file and its <script> tag in index.html. */

(function () {
  if (window.SUPABASE_READY) return; /* production: real database, no demo store */

  var KEY = 'hhhh-demo-players';

  function list() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(all) { localStorage.setItem(KEY, JSON.stringify(all)); }

  window.STORE = {
    user: { email: 'local-demo' },

    list: list,

    save: function (id, row, ok, fail) {
      var all = list();
      if (id) {
        var found = false;
        all = all.map(function (p) {
          if (p.id !== id) return p;
          found = true;
          return Object.assign({}, p, row);
        });
        if (!found) { fail('Demo player not found.'); return; }
      } else {
        all.push(Object.assign({ id: 'demo-' + Date.now(), created_at: new Date().toISOString() }, row));
      }
      write(all);
      ok();
    },

    remove: function (player, ok) {
      write(list().filter(function (p) { return p.id !== player.id; }));
      ok();
    }
  };
})();
