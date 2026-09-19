# F1 setup and first deploy

This guide takes the F1 code from zero to a live site. Do the parts in order. Commands are for PowerShell in VS Code on Windows.

What F1 gives you:
- Sign in with Google, email and password, or an emailed sign-in link
- New accounts start as `pending` and see only a waiting screen
- When you add a student with an email, the account with that email becomes `student` (whether they signed up before or after you added them)
- You (admin) get a Students page to add and remove students
- Row Level Security on every table, tested for admin, student, and stranger
- A GitHub Action that keeps the free Supabase project awake
- Live on Cloudflare Pages, auto deployed on every push to `main`

---

## Part 1. Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
   - Name: `tuition-portal`
   - Region: **Southeast Asia (Singapore)**, the closest to Dhaka
   - Save the database password in your password manager.
2. When the project is ready, open **SQL Editor**, click **New query**, paste the whole file `supabase/migrations/20260919000001_f1_auth_profiles_students.sql`, and click **Run**. You should see "Success. No rows returned".
3. Check it worked: **Table Editor** should show `profiles` and `students`, both without the red "RLS disabled" warning.
4. Open **Project Settings > API Keys** and copy:
   - the **Project URL** (looks like `https://abcdxyz.supabase.co`, also under **Project Settings > Data API**)
   - the **Publishable key** (`sb_publishable_...`). If your project only shows the legacy **anon** key, use that. Both work the same here.

   Never put the **secret** or **service_role** key in the frontend or in GitHub.

## Part 2. Run it on your PC

```powershell
cd tuition-portal
copy .env.example .env
```

Open `.env` and fill in the two values from Part 1, step 4:

```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

Then:

```powershell
npm install
npm run dev
```

Open http://localhost:5173. You should see the sign-in page. Do not sign in yet; finish Part 3 first.

## Part 3. Auth settings in Supabase

### 3a. URLs

**Authentication > URL Configuration**
- Site URL: `http://localhost:5173` (you change this to the live URL in Part 6)
- Redirect URLs, add both:
  - `http://localhost:5173/**`
  - `https://tuition-portal.pages.dev/**` (use your real Pages URL if the name is taken)

### 3b. Email

**Authentication > Sign In / Providers > Email**: keep **Enable Email provider** and **Confirm email** turned on. Confirm email is what stops someone from claiming a student's email address that they do not own.

Important limit: Supabase's built-in email sender only delivers to members of your Supabase team, and only a few emails per hour. That is fine for testing with your own address, but students and guardians who sign up with email will not get their confirmation link until you add your own SMTP. Two options:

- **Easiest now:** ask students and guardians to use **Continue with Google**. It needs no email at all.
- **Before you invite people who use email:** set up SMTP with Gmail.
  1. Turn on 2-Step Verification for the Gmail account you want to send from.
  2. Create an app password at https://myaccount.google.com/apppasswords
  3. In Supabase, **Authentication > Emails > SMTP Settings**, turn on custom SMTP:
     - Sender email: your Gmail address
     - Sender name: `Tuition Portal`
     - Host: `smtp.gmail.com`, Port: `587`
     - Username: your Gmail address, Password: the app password
  4. In **Authentication > Rate Limits**, raise "emails per hour" to about 30.

### 3c. Google sign-in

1. Go to https://console.cloud.google.com and create a project called `tuition-portal`.
2. Open **Google Auth Platform** (search "OAuth consent" if you cannot find it).
   - **Branding:** App name `Tuition Portal`, your email as support and developer contact.
   - **Audience:** User type **External**. Click **Publish app** so that anyone can sign in, not only test users. With only the basic email and profile scopes, Google does not require a review.
3. **Clients > Create client**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://tuition-portal.pages.dev`
   - Authorized redirect URIs:
     - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
       (Supabase shows this exact URL on the Google provider page, with a copy button)
4. Copy the **Client ID** and **Client secret**.
5. In Supabase, **Authentication > Sign In / Providers > Google**: turn it on, paste the Client ID and Client secret, and save.

## Part 4. Make yourself the admin

1. On http://localhost:5173, sign in with the Google account (or email) you will use as the teacher.
2. You land on the **waiting** screen. That is expected.
3. In Supabase **SQL Editor**, run (with your real email, in lower case):

   ```sql
   update public.profiles set role = 'admin' where email = 'your.email@gmail.com';
   select email, role from public.profiles;
   ```

4. Back in the app, click **Check again**. You move to **/admin** and see the Students page.

Only the SQL editor or an existing admin can change a role. A signed-in user who tries to change their own role gets an error.

## Part 5. Push to GitHub

Create an empty **private** repository named `tuition-portal` at https://github.com/new (no README, no .gitignore). Then:

```powershell
git init
git add .
git commit -m "F1: scaffold, auth, role linking, keep-alive"
git branch -M main
git remote add origin https://github.com/gitsifat091/tuition-portal.git
git push -u origin main
```

Check that `.env` is **not** in the repository on GitHub. `.gitignore` already excludes it.

## Part 6. Deploy on Cloudflare Pages

1. Go to https://dash.cloudflare.com > **Workers & Pages** > **Create** > **Pages** tab > **Import an existing Git repository**. (Pick the Pages tab, not Workers.)
2. Connect GitHub, allow access to `tuition-portal`, and select it.
3. Build settings:
   - Production branch: `main`
   - Framework preset: **React (Vite)**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables** (Production), add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your publishable (or anon) key
   - `NODE_VERSION` = `22`
5. Click **Save and Deploy**. After about a minute you get a URL like `https://tuition-portal.pages.dev`.
6. If the URL is different from `tuition-portal.pages.dev`, update it in Supabase Redirect URLs (Part 3a) and in Google Authorized JavaScript origins (Part 3c).
7. In Supabase **Authentication > URL Configuration**, change **Site URL** to your live URL. Keep the localhost redirect URL so local development still works.

About page refreshes: Cloudflare Pages treats a project with no `404.html` as a single-page app, so refreshing `/admin` or `/dashboard` serves the app correctly. No `_redirects` file is needed. (A `/* /index.html 200` rule is flagged by Cloudflare as an infinite loop, so do not add one.)

From now on, every `git push` to `main` deploys automatically.

## Part 7. Keep-alive

Free Supabase projects pause after 7 days with no activity. The workflow in `.github/workflows/keepalive.yml` calls the database every Monday and Thursday.

1. On GitHub, open the repository > **Settings > Secrets and variables > Actions > New repository secret**. Add:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_ANON_KEY` = your publishable (or anon) key
2. Go to **Actions > Supabase keep-alive > Run workflow**. It should finish green with `Response: "ok"` in the log.

Note: GitHub switches off scheduled workflows in a repository that has had no commits for 60 days. If you stop pushing for two months, open the Actions tab and re-enable it.

---

## Test steps for F1

Use your admin account plus two other accounts (for example a second Gmail and an email address you can open).

| # | Do this | Expected |
|---|---|---|
| 1 | Open the live URL while signed out | Sign-in page |
| 2 | Open `/admin` directly while signed out | Sent to the sign-in page |
| 3 | Sign in as a **stranger** account whose email you have not added | Waiting screen showing that email |
| 4 | As admin, add a student named "Test Student" with the stranger's email | Green message: "already had an account and is now linked". Badge shows **Signed up** |
| 5 | Back in the stranger's browser, click **Check again** | Moves to `/dashboard`, shows "Welcome" and a card with "Test Student" |
| 6 | As admin, add a student with a brand new email, then sign up with that email (email and password) | "Check your email" message. After you open the link, you land straight on the dashboard, not the waiting screen |
| 7 | Refresh the page on `/dashboard` and on `/admin` | Page reloads normally, no 404 |
| 8 | As the student, open `/admin` | Sent back to `/dashboard` |
| 9 | As admin, **Remove** Test Student, then as that account click refresh | Back on the waiting screen |
| 10 | Try to add two students with the same email | Error: "A student with this email already exists." |
| 11 | Sign up with an email that nobody added, but do not open the confirmation link. Then add that email as a student | The student shows **Not signed up** until the link is opened. Unconfirmed accounts are never linked |
| 12 | GitHub **Actions > Supabase keep-alive > Run workflow** | Green run, log shows `"ok"` |

### Optional RLS check in the SQL editor

This pretends to be a signed-in user and shows what they can see. Replace the id with a real one from `select id, email, role from profiles;`.

```sql
begin;
select set_config('request.jwt.claims', '{"sub":"PUT-A-USER-ID-HERE","role":"authenticated"}', true);
set local role authenticated;
select count(*) as profiles_visible from public.profiles;   -- 1 for a student or pending user
select full_name from public.students;                      -- only their own row, or none
rollback;
```

## Troubleshooting

- **"Supabase is not configured" page:** the two `VITE_` variables are missing. Locally, check `.env` and restart `npm run dev`. On Cloudflare, add them and then **Retry deployment** (Vite reads them at build time).
- **Google says `redirect_uri_mismatch`:** the redirect URI in Google must be the Supabase callback URL, not your site URL.
- **After Google sign-in you land on localhost instead of the live site:** add the live URL to Supabase Redirect URLs and update the Site URL.
- **Email sign-up never receives a link:** see Part 3b. The built-in sender only mails your own team.
- **Student stays on the waiting screen:** the email in the student record must match the sign-in email exactly (case does not matter). Check with `select email, role from profiles;` and `select email, profile_id from students;`.
