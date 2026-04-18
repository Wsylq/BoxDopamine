# iOS Fonts & Emojis Integration

## Summary
Successfully integrated San Francisco Pro fonts and Apple Color Emoji across both the React web app and Android native app.

## Fonts Installed

### San Francisco Pro
- **SF-Pro-Text-Regular.otf** - Regular weight for body text (400)
- **SF-Pro-Text-Semibold.otf** - Semibold weight (600)
- **SF-Pro-Display-Bold.otf** - Bold weight for headings (700)
- **SF-Pro-Display-Black.otf** - Black weight for emphasis (900)

### Apple Emoji
- **AppleColorEmoji-Windows.ttf** - iOS-style emoji rendering

## Changes Made

### React Web App

#### 1. Font Files
- Copied all fonts to `public/fonts/`
- Files are served from `/fonts/` path

#### 2. CSS Updates (`src/index.css`)
- Added `@font-face` declarations for all SF Pro weights
- Added `@font-face` for Apple Color Emoji
- Updated Tailwind v4 theme with custom font families:
  - `--font-sans`: SF Pro Text (body text)
  - `--font-display`: SF Pro Display (headings)
- Updated body font-family to prioritize SF Pro fonts

#### 3. Font Stack
```css
font-family: 'SF Pro Text', 'SF Pro Display', 'Apple Color Emoji', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Android Native App

#### 1. Font Files
- Copied fonts to `android-native/app/src/main/res/font/`
- Renamed to Android naming convention (lowercase with underscores):
  - `sf_pro_text_regular.otf`
  - `sf_pro_text_semibold.otf`
  - `sf_pro_display_bold.otf`
  - `sf_pro_display_black.otf`
  - `applecoloremoji_windows.ttf`

#### 2. Font Family XML
- Created `sf_pro_font_family.xml` defining all font weights
- Maps font weights 400, 600, 700, 900 to respective font files

#### 3. Theme Updates
- **themes.xml**: Added `android:fontFamily` to app theme
- **Type.kt**: Created `SFProFontFamily` with all weights
- Updated all Typography styles to use SF Pro fonts

#### 4. Typography Styles
All Material 3 text styles now use SF Pro:
- bodyLarge, bodyMedium, bodySmall
- titleLarge, titleMedium, titleSmall
- labelLarge, labelMedium, labelSmall

## Font Weight Mapping

| Weight | Name | Usage |
|--------|------|-------|
| 400 | Regular | Body text, paragraphs |
| 600 | Semibold | Emphasized text, labels |
| 700 | Bold | Headings, buttons |
| 900 | Black | Large titles, hero text |

## Emoji Support

The Apple Color Emoji font provides iOS-style emoji rendering on Android devices, ensuring consistent emoji appearance across platforms.

## Testing

### Web App
1. Run `npm run build`
2. Check that fonts load in browser DevTools Network tab
3. Verify text renders with SF Pro font
4. Check emoji rendering

### Android App
1. Build the app: `./gradlew assembleDebug`
2. Install on device
3. Verify all text uses SF Pro font
4. Check emoji rendering matches iOS style

## Benefits

✅ Consistent iOS-like typography across all platforms
✅ Professional San Francisco Pro font family
✅ iOS-style emoji rendering on Android
✅ Proper font weight hierarchy (400, 600, 700, 900)
✅ Optimized font loading with `font-display: swap`
✅ Fallback fonts for compatibility

## Notes

- Fonts are embedded in the app (no external loading)
- Web fonts use `font-display: swap` for better performance
- Android fonts are compiled into the APK
- Emoji font works on both web and Android
