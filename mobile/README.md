# WISE AI — Mobile (React Native / Expo)

Native iOS + Android client for the Agent Analytics Suite. Same Supabase accounts
and roles as the web dashboard: sign in, then see Overview, Call logs (with
recordings and transcripts), Lead pipeline, Analytics, Campaigns and — for
admins — Subaccounts and Billing.

## How it talks to the backend

- **Auth**: Supabase directly (`src/lib/supabase.ts`). The session is stored in the
  device keychain/keystore via `expo-secure-store`.
- **Data**: REST endpoints at `<EXPO_PUBLIC_API_URL>/api/mobile/*`, served by the web
  app (`src/routes/api.mobile.$.ts` → `src/lib/mobile-api.server.ts`). They reuse the
  web app's authorization logic: roles come from `user_roles`, subaccount agent access
  from `agent_assignments`, and pricing is stripped from subaccount responses. The
  Retell key never leaves the server.
- **All data access goes through `src/lib/api.ts`** — the app's single boundary.

> The `/api/mobile/*` routes must be deployed with the web app before the mobile
> app can load data.

## Run it

```sh
cd mobile
cp .env.example .env      # fill in Supabase URL / publishable key / API URL
npm install
npx expo start            # scan with Expo Go, or press i / a for a simulator
```

`expo-audio` and `expo-secure-store` work in Expo Go on SDK 57; for store builds use
`npx eas-cli@latest build`.

## iOS has its own native UI

Android/web keep the branded, card-based design (floating tab bar, Inter font,
in-content title block). iOS gets genuine platform chrome instead — same screens
and data, different navigation feel:

- **Native headers**: each tab is a one-screen `Stack` (`(tabs)/<tab>/_layout.tsx`
  + `index.tsx`) so it gets a real collapsing large title; pushed screens (call
  detail, settings, campaigns, admin) get a compact title with the automatic
  native back button. Both are wired from `components/ui.tsx`'s `Screen` —
  pass `title`/`back`/`search` and it renders the right one per platform.
- **Native search**: the Calls tab's search box becomes a real nav-bar search
  field (`headerSearchBarOptions`) instead of an in-content `TextInput`.
- **Native tab bar**: the system bottom tab bar with SF Symbols that swap to
  their filled variant when active (`components/platform-icon.tsx`), instead
  of the floating pill.
- **Native sheets**: `Sheet` (agent picker, date range, move-stage) opens as a
  real page sheet (`presentationStyle="pageSheet"`) with the system drag
  handle, instead of our drawn bottom sheet.
- **System font**: body text uses San Francisco at the matching weight instead
  of Inter (`bodyFont()` in `components/ui.tsx`).

This is all `Platform.OS` branching inside the existing shared files — there's
no `.ios.tsx` fork of the UI kit, so Android/web are byte-for-byte unaffected.

## Layout

```
src/app          expo-router screens: (auth), (tabs), call/[id], campaigns, admin, settings
src/components   ui kit, charts (react-native-svg), filter bar, call row, audio player
src/lib          api, auth, filters, theme, hooks + pure analytics/format shared with web
```

`src/lib/analytics.ts`, `format.ts` and `types.ts` are copies of the web app's modules
(minus browser-only code) — keep them in sync when KPI logic changes.

## Speed & caching

- List requests are **slim** (`slim: true`): no transcripts or recordings, ~15× smaller. The
  full call (transcript, recording) loads only when a call is opened, and its header paints
  instantly from the cached list.
- React Query keeps data fresh for 5 minutes, retains it for 24 hours and **persists list
  data to the device**, so a cold start paints last-known data immediately and refreshes in
  the background. Stale data also refreshes when the app returns to the foreground.
- The Overview, Analytics and agent queries are warmed once when the tabs mount, so switching
  tabs doesn't wait on the network.
- The server keeps a 45-second per-instance cache of Retell call pages (keyed by the
  already-authorised agent list, so access never leaks between users).
- The cache is wiped on sign-out.

## Browser preview (optional)

```sh
npm run dev          # in the project root: the web backend on :5173
API_TARGET=http://localhost:5173 npm run preview   # → http://localhost:4173/frame
```
Uses real accounts and live Retell data — there is no demo/mock mode.
