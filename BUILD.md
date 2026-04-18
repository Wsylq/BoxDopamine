# Build Instructions

## GitHub Actions (Automatic)

Push to GitHub. Actions builds APK automatically. Download from Actions tab → Artifacts.

## Local Build

```bash
cd android-native
./gradlew assembleDebug  # Linux/Mac
gradlew.bat assembleDebug  # Windows
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## What You Get

- Native Android app (Kotlin + Compose)
- 5-6 MB APK (vs 20-30 MB web wrapper)
- 3-5x faster performance
- 60fps animations
- Native haptics

## Requirements

- JDK 17+
- Android SDK 34
- Or just use GitHub Actions
