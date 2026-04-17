package com.dopaminebox.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val DopamineBackground = Color(0xFF0D0D1A)
val DopamineGlassSurface = Color(0x0DFFFFFF)
val DopaminePrimary = Color(0xFFFFD700)
val DopamineSecondary = Color(0xFF7C3AED)
val DopamineWin = Color(0xFF22C55E)
val DopamineLose = Color(0xFFEF4444)
val DopamineStreak = Color(0xFFF97316)
val DopamineTextPrimary = Color(0xFFFFFFFF)
val DopamineTextSecondary = Color(0x99FFFFFF)
val DopamineBorder = Color(0x1AFFFFFF)

private val DopamineColorScheme = darkColorScheme(
    background = DopamineBackground,
    surface = DopamineGlassSurface,
    primary = DopaminePrimary,
    secondary = DopamineSecondary,
    tertiary = DopamineStreak,
    onBackground = DopamineTextPrimary,
    onSurface = DopamineTextPrimary,
    onPrimary = Color(0xFF111111),
)

// Inter is not bundled in this repository yet, so SansSerif is used as runtime fallback.
private val DopamineTypography = Typography(
    displayLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 44.sp),
    headlineLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 32.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 28.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Medium, fontSize = 18.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 16.sp),
    bodySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 14.sp),
)

private val DopamineShapes = Shapes(
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(24.dp),
)

@Composable
fun DopamineTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DopamineColorScheme,
        typography = DopamineTypography,
        shapes = DopamineShapes,
        content = content,
    )
}