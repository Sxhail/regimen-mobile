# Execution OS — Mobile (Expo)

Native rebuild of the Execution OS web app (github.com/Baazjameel/regimen) for iOS, with the Android emulator used for live preview during development. All data is stored offline on-device (AsyncStorage). Light and dark mode supported.

## Development (Windows + Android emulator preview)

```bash
npm install
npx expo start --android   # boots Metro and opens Expo Go on the running emulator
```

Start an emulator first (Android Studio → Device Manager → Pixel 9), or:

```bash
%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe -avd Pixel_9
```

Notes:
- Expo Go on Android cannot run `expo-notifications` (SDK 53+). Notification calls are guarded and silently skipped in the preview; they work in real builds.
- Hot reload: save a file and the app refreshes.

## iOS build (no Mac needed)

```bash
npm i -g eas-cli
eas login                      # Expo account
eas build --platform ios       # cloud build; sign in with Apple Developer account when prompted
eas submit --platform ios      # upload to TestFlight
```

Bundle id: `com.baazjameel.executionos` (change in `app.json` if needed).

## Structure

- `src/model/` — types, defaults, storage/normalization, calendar JSON import, pure timer/rollover logic (ported 1:1 from the web app)
- `src/store/` — Zustand store (all actions) + derived-data hooks
- `src/runtime/` — tick/rollover/pomodoro engine, notifications, haptics
- `src/theme/` — light/dark tokens, accent palettes, event colors
- `src/screens/` — Today, Planner, Tasks, Board, Goals, Stats, Life, Journal, History, Settings
- `app/` — expo-router routes (5 tabs + stacked screens)

Storage keys match the web app (`execution-os-state:v1`, `execution-os-day-modules:v1`).
