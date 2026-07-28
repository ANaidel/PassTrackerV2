# Password recovery verification

Use this checklist after Resend SMTP is enabled in Supabase (see [`supabase/README.md`](../supabase/README.md)).

## Prerequisites

- [ ] Resend domain verified and API key saved in Supabase SMTP settings
- [ ] Supabase redirect URLs include your Vercel origin and `/?type=recovery`
- [ ] Production deploy includes latest Cloud Sync recovery UI
- [ ] Test account email is reachable in a real inbox

## End-to-end steps (Vercel)

1. Open the live app URL (not localhost).
2. Sign out if needed.
3. Cloud Sync → **Forgot password?**
4. Enter the account email → **Send reset link**.
5. Confirm the green notice: reset email sent.
6. Open the email from Resend/Supabase and click the link.
7. Confirm the app shows **Set a new password**.
8. Enter matching passwords (6+ characters) → **Save new password**.
9. Confirm success notice, then sign out and sign back in with the new password.
10. Confirm cloud data still loads for that account.

## Local smoke test (optional)

1. Add `http://localhost:5173/` and `http://localhost:5173/?type=recovery` to Supabase redirect URLs.
2. Repeat the flow against the Vite dev server.
3. If the email link opens production instead of localhost, check the `redirectTo` host used when the reset was requested.

## Failure clues

| Symptom | Likely cause |
| --- | --- |
| Reset email never arrives | SMTP not enabled, sender domain unverified, or rate limited |
| Link opens but no “Set new password” form | `PASSWORD_RECOVERY` event missed; hard refresh after opening the link |
| Redirect error from Supabase | Production URL missing from Auth redirect allow list |
| “Unable to send reset email” in UI | Inspect browser network/auth error and Supabase Auth logs |
