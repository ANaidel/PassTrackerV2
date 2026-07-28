# Apple App Store submission checklist

Use this after the Capacitor iOS project builds cleanly in Xcode (`docs/IOS.md`).

## Prerequisites

- [ ] Apple Developer Program membership active
- [ ] App builds and runs on a physical iPhone from Xcode
- [ ] Production Supabase + Vercel env vars working
- [ ] Password recovery tested on the live web URL (`docs/PASSWORD_RECOVERY_TEST.md`)
- [ ] Bundle ID finalized (`com.passtracker.app` unless you change it before first upload)

## App Store Connect setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+**.
2. Create a new iOS app:
   - Name: `PassTracker`
   - Primary language: English (US) (or your preference)
   - Bundle ID: match Xcode (`com.passtracker.app`)
   - SKU: e.g. `passtracker-ios-001`
3. Fill **App Information**: category (Education / Productivity), content rights, age rating questionnaire.

## Listing assets

Prepare:

- [ ] App icon (1024×1024, no alpha) — export from `resources/icon.png` / Xcode AppIcon
- [ ] Screenshots for required device sizes (at least 6.7" and 6.1" iPhone)
- [ ] Subtitle (≤30 chars), description, keywords
- [ ] Support URL (can be a simple page or GitHub README)
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (**required** for account/cloud sync apps)

Suggested privacy policy disclosures for PassTracker:

- Account email and password (handled by Supabase Auth)
- Optional username stored in auth user metadata
- Study data (exams, lectures, tasks, resources, theme) synced to Supabase
- Local device storage for offline/cache use
- No third-party advertising trackers (unless you add any later)

## Privacy Nutrition Labels (App Privacy)

In App Store Connect, declare data collection:

- **Contact Info**: Email address (account login)
- **User Content**: Study progress / app data synced to cloud
- Purpose: App Functionality
- Linked to user: Yes
- Used for tracking: No (unless you later add analytics that track across apps)

## Archive and upload

1. In Xcode: select **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. Organizer → **Distribute App** → App Store Connect → Upload.
4. Wait for processing, then select the build on the app version page.
5. Complete Export Compliance / encryption questions (standard HTTPS-only apps usually answer that only standard encryption is used).
6. Submit for review.

## Review tips for Capacitor / web-wrapped apps

Apple sometimes rejects thin website wrappers. PassTracker is stronger if review notes emphasize:

- Offline-capable study tracking (PWA/service worker + local storage)
- Native shell with branded icon and splash
- Account sync across devices as a core feature
- Not merely a marketed website browser

In App Review notes, include a demo account email/password if you enable any gate that reviewers cannot create themselves.

## After approval

- [ ] Turn on **Automatically release** or release manually
- [ ] Monitor Crash reports in Xcode Organizer / App Store Connect
- [ ] For each web update shipped in the store binary: `npm run build:ios`, re-archive, and submit a new build (or adopt a live-update strategy later)
