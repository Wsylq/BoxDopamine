package com.dopaminebox.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DopamineColorScheme = darkColorScheme(
    primary = DopamineYellow,
    secondary = DopamineOrange,
    tertiary = DopaminePink,
    background = DopamineBg,
    surface = DopamineSurface,
)

@Composable
fun DopamineTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DopamineColorScheme,
        typography = DopamineTypography,
        content = content,
    )
}