# iOS (Capacitor) workflow

PassTracker is wrapped for the Apple App Store with Capacitor.

## One-time setup

1. Install Xcode from the Mac App Store and open it once to finish tooling setup.
2. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year).
3. From the project root:

```bash
npm install
npm run build:ios
npm run open:ios
```

4. In Xcode, select your Team under **Signing & Capabilities** for the `App` target.
5. Bundle ID is `com.passtracker.app` (change in `capacitor.config.json` / Xcode if needed before first release).

## Icons and splash

Source artwork lives in:

- `resources/icon.png` (from `public/icons/icon-512.png`)
- `resources/splash.png` (from `public/apple-touch-icon.png`)

Regenerate native assets after changing those files:

```bash
npm run assets:ios
npm run build:ios
```

## Everyday native rebuild

```bash
npm run build:ios   # vite build + cap sync
npm run open:ios    # opens Xcode
```

Then run on a simulator or device from Xcode.

## Auth redirects for the iOS shell

Password recovery still uses your HTTPS production URL (Vercel). Keep those URLs in Supabase Auth redirect allow lists. The iOS app loads the bundled web build from `dist` via Capacitor; cloud auth/API calls go to Supabase over HTTPS.

## Local task reminders

Daily overdue / due-today reminders use `@capacitor/local-notifications`.

1. After pulling reminder changes, run `npm run build:ios` so the plugin is synced.
2. On first enable in the To Do tab, iOS will prompt for notification permission.
3. Scheduled daily reminders can fire while the app is closed; browser/PWA reminders mainly fire while PassTracker is open.

See also [`docs/APP_STORE.md`](APP_STORE.md) for App Store Connect submission steps.
