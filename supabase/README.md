# Supabase setup

1. Create a new Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Copy your project URL and anon key into `.env` / `.env.local` (and into Vercel env vars for production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart the Vite dev server after changing env vars.

The app uses **email + password** auth (with optional username on signup) and stores the current study state in `public.user_app_state`.

Email confirmation can stay **off** for simpler sign-in. Password recovery still needs working SMTP so reset emails can be delivered.

## Resend SMTP (password recovery)

Use [Resend](https://resend.com) as the free SMTP provider for Supabase Auth emails.

### 1. Create Resend credentials

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Add and verify a sending domain in Resend (DNS records Resend provides).
3. Prefer a sender like `noreply@yourdomain.com` once the domain is verified.

### 2. Configure Supabase SMTP

In the Supabase dashboard go to **Authentication → SMTP** (or **Authentication → Email → SMTP Settings**):

1. Enable custom SMTP.
2. Fill in:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender name | `PassTracker` |
| Sender email | e.g. `noreply@yourdomain.com` |

3. Save.

### 3. Redirect URLs for recovery links

In **Authentication → URL Configuration**, add your deployed site URLs, for example:

- Site URL: `https://YOUR_VERCEL_DOMAIN/`
- Redirect URLs:
  - `https://YOUR_VERCEL_DOMAIN/`
  - `https://YOUR_VERCEL_DOMAIN/?type=recovery`
  - `http://localhost:5173/` (local testing)

The app calls `resetPasswordForEmail` with `redirectTo` set to `window.location.origin`, then shows a **Set new password** form when a recovery session is detected.

### 4. Rate limits

After enabling custom SMTP, Supabase may still apply a protective limit (often around 30 emails/hour). Raise it under **Authentication → Rate Limits** if you need more recovery/sign-up mail volume.

### 5. Quick recovery test checklist

1. Create or use an existing account with a real email you can open.
2. On the live Vercel URL, open Cloud Sync → **Forgot password**.
3. Submit the email and confirm the notice that a reset message was sent.
4. Open the Resend/Supabase email, click the link, and land back on the app.
5. Enter a new password in the **Set new password** form and confirm sign-in works with it.
