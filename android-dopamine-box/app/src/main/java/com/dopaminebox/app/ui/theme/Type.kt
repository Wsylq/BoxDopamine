package com.dopaminebox.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Place SF Pro files in assets/fonts/ and wire a Typeface loader if licensed files are available.
val SfPro = FontFamily.Default

val DopamineTypography = Typography(
    headlineLarge = TextStyle(fontFamily = SfPro, fontWeight = FontWeight.Bold, fontSize = 34.sp),
    titleLarge = TextStyle(fontFamily = SfPro, fontWeight = FontWeight.SemiBold, fontSize = 24.sp),
    titleMedium = TextStyle(fontFamily = SfPro, fontWeight = FontWeight.Medium, fontSize = 18.sp),
    bodyMedium = TextStyle(fontFamily = SfPro, fontWeight = FontWeight.Normal, fontSize = 15.sp),
)