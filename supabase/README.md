# Supabase setup

1. Create a new Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Copy your project URL and anon key into `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart the Vite dev server.

The app uses email magic-link sign in and stores the current study state in `public.user_app_state`.
