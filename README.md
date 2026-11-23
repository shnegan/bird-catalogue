# Bird Catalogue

A private, phone-friendly web app for uploading bird photos. Step 1 of 4:
sign in, upload photos, see them in a gallery. Original files are stored
untouched (EXIF kept), and the photo's date and GPS position are read on upload.

Coming next: (2) automatic species ID, (3) sightings map, (4) search.

## Stack

- **Next.js** (App Router) hosted on **Vercel**
- **Supabase**: email sign-in, Postgres + PostGIS for sightings, private Storage bucket for photos
- Uploads go straight from the phone to Supabase Storage (no size limit from Vercel)

## One-time setup

1. **Supabase**: create a project (region: Sydney). In *SQL Editor*, run
   `supabase/migrations/0001_init.sql`, then
   `insert into public.allowed_emails (email) values ('you@example.com');`
2. **Supabase > Authentication > URL Configuration**: set *Site URL* to the
   Vercel URL and add `https://<your-app>.vercel.app/auth/callback` to
   *Redirect URLs*.
3. **Supabase > Authentication > Sign In / Providers**: after you've signed
   in once, turn off *Allow new users to sign up*.
4. *(Optional)* **Supabase > Authentication > Emails > Magic Link**: add
   `Code: {{ .Token }}` to the template so you can type a 6-digit code
   instead of tapping the link (handy for the home-screen app on iPhone).
5. **Vercel**: import the GitHub repo and set the environment variables from
   `.env.example`.

## Local development

```bash
npm install
npx supabase start   # needs Docker; applies the migration
cp .env.example .env.local   # fill in values printed by supabase start
npm run dev
```

Login is protected twice: the app only lets addresses in `ALLOWED_EMAILS`
sign in, and the database/storage row-level security only serves rows to
addresses in `public.allowed_emails`.
