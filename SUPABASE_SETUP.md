# Supabase setup (5 minutes, free)

## 1. Create the project
1. Go to https://supabase.com → **Start your project** → create a free account.
2. **New project** — pick any name (e.g. `hhhh-tierlist`), set a database password (save it).
3. Region: pick the one closest to you. Wait ~2 minutes for provisioning.

## 2. Install the schema
1. Left sidebar → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql`.
3. Click **Run**. You should see `Success. No rows returned`.

## 3. Create the admin login
1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email + a password, check **Auto confirm user**, → **Create user**.
   (This is the email/password you'll type into the site's lock/login form.)

## 4. Get your keys
1. Left sidebar → **Project Settings** → **API**.
2. Copy:
   - **Project URL** → `window.SUPABASE_URL`
   - **Project API keys → publishable / anon key** → `window.SUPABASE_ANON_KEY`
3. Paste both into `js/config.js`.

## 5. Test
Run a local server in the project folder:

```
npx serve .
```

Open the site → Rankings → click the lock is not needed yet: use **Add Player**
only appears after login. Log in with your Supabase email/password, add a player
with a few kit tiers, and check the overall leaderboard + mode views.

## Notes
- The anon key is safe to publish — RLS (in the schema) blocks writes from anyone
  who isn't logged in.
- To rotate the admin password: Authentication → Users → your user → Reset password.
