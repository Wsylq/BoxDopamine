# Dopamine Box (Android / Kotlin / Compose)

Native Android project scaffold in Kotlin with Jetpack Compose, minSdk 26.

## What is included

- Full Kotlin-only app module (`android-dopamine-box/app`)
- Compose UI entry screen with infinite feed behavior
- Four mini-game composables:
  - Coin Flip
  - Higher / Lower
  - Plinko
  - Flappy Coins
- Currency + streak state in `DopamineViewModel`
- Haptics helper using `VibratorManager` / `VibrationEffect`
- Sound helper (tone-based placeholder)
- GitHub Actions workflow to run lint, tests, and build release APK artifact

## Important notes

- The exact video UI, exact assets, and exact game balancing are not included.
- SF Pro files are not committed for licensing reasons. Put licensed files in:
  - `app/src/main/assets/fonts/`
- Current typography uses `FontFamily.Default` fallback until you wire SF Pro loading.

## Open and run

1. Open Android Studio.
2. Open folder `android-dopamine-box`.
3. Let Gradle sync.
4. Run `app` on an emulator/device (API 26+).

## CLI build

From repository root:

```bash
gradle -p android-dopamine-box :app:assembleDebug
```