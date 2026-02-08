# App icon and splash screen assets

Replace the placeholder images in this folder with your own. Paths are already set in `app.json`.

## Files to replace

| File | Purpose | Recommended size |
|------|--------|------------------|
| `assets/icon.png` | App icon (home screen, launcher) | **1024×1024 px**, PNG, no transparency for best results on all platforms |
| `assets/splash.png` | Native splash screen (shown at app launch) | **1284×2778 px** or similar; use a centered logo. Background is set in config (`#1A1A1A`) |
| `assets/favicon.png` | Web / PWA favicon | **48×48 px** (or 32×32) |

## After replacing

- **Development:** Icons/splash may be cached; restart the dev server and rebuild if needed.
- **Production / native:** Run a new build so Android/iOS pick up the new assets:
  - `npx expo prebuild --clean` then build, or
  - Build with EAS / your CI as usual.

Splash background color is set to `#1A1A1A` (dark) in `app.json` and in `android/app/src/main/res/values/colors.xml` to match the app theme.
