# Rivalio Mobile

React Native (Expo SDK 57, TypeScript) app for iOS and Android. It talks to the
existing `../backend` (REST + Socket.IO); there is no mobile-specific backend.

## Run

```bash
cd mobile
npm install
cp .env.example .env.local        # optional, see Configuration
npm start                         # Metro + QR code
```

- **Android**: `npm run android` (emulator or device with Expo Go), or a native
  dev build with `npm run run:android` (needs Android Studio / SDK).
- **iOS**: `npm run ios` (simulator, macOS only) or scan the QR code with Expo Go
  on an iPhone; native dev build with `npm run run:ios` (needs Xcode).
- Cloud builds without local toolchains: `npx eas-cli@latest build --platform android|ios`.

Start the backend first for local development (`npm run dev` in the repo root, port 5000).

## Configuration

Only `EXPO_PUBLIC_*` variables reach the app, and they are bundled into the
binary — never put secrets there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_APP_ENV` | `development` | `development` / `staging` / `production` |
| `EXPO_PUBLIC_API_URL` | auto | Backend URL. In development it is derived automatically: iOS simulator → `localhost:5000`, Android emulator → `10.0.2.2:5000`, physical device → the dev machine's LAN IP (from Metro). Staging/production fall back to `https://rivalio-app.onrender.com`. |
| `EXPO_PUBLIC_DEV_API_PORT` | `5000` | Backend port used by the auto-detection |

## Checks

```bash
npm run typecheck
npm run doctor
npx expo export --platform android   # bundle check (also: --platform ios)
```

## Structure

```
src/
  api/          one module per backend domain + axios client, error mapping
  components/   UI kit (buttons, sheets, pickers, tables, match card)
  config/       environment resolution
  context/      Auth, Realtime (socket, notifications, presence), Toast
  hooks/        useQuery (cached fetch), polling/clock timers, useMyTeams
  navigation/   root stack, user/admin tabs, deep links, typed params
  screens/      feature screens (guest pages, auth, home, football, team, league,
                championship, match, profile, chat, notifications, search, admin)
  sockets/      single Socket.IO client
  storage/      SecureStore token, AsyncStorage prefs (incl. theme choice)
  theme/        palettes, fonts, tones + ThemeContext (useTheme, makeStyles)
  types/ utils/
```

## Design

The UI follows `../design/mobile-mockups.html` (players, guests) and
`../design/admin-mobile-mockups.html` (admin panel):

- Dark (`#08080E`, lime `#C5F135`) and light themes. Players and guests default
  to dark, admins to the light `#F3F4F6` panel; the choice is stored per role.
  Login and Register are always dark.
- Barlow Condensed for headlines, DM Sans for text (`@expo-google-fonts/*`).
- Styles are theme-aware: `const useStyles = makeStyles((c) => ({ ... }))` in the
  module, `const styles = useStyles()` in the component. Colours always come from
  the palette `c` (or `useTheme().c`), never from literals, so both themes work.
- Signed-out visitors get the public pages (Landing, İdmanlar, Haqqımızda, FAQ).
  Players have tabs Ana səhifə · İdmanlar · Chat · Bildirişlər · Profil; the football
  hub (`Football` screen) holds teams, player search, offers, leagues and championships.
  Admins have Liqalar · Çempionatlar · Bildirişlər · Menyu.

## Deep links

`rivalio://league/:id`, `rivalio://championship/:id`, `rivalio://match/league/:id`,
`rivalio://match/championship/:id`, `rivalio://team/:id`, `rivalio://player/:id`,
`rivalio://chat/:conversationId`, `rivalio://notifications`. Links opened while
signed out are replayed after login. Admin accounts open the management screens.
