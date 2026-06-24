package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val GyenboxColorScheme = darkColorScheme(
    primary = GyenAccent,
    secondary = GyenAccent,
    tertiary = GyenFolder,
    background = GyenBg,
    surface = GyenCard,
    onBackground = GyenTextLight,
    onSurface = GyenTextLight,
    surfaceVariant = GyenCard,
    outline = GyenBorder
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Gyenbox is a gorgeous, native dark-themed app
    dynamicColor: Boolean = false, // Keep consistent branding with Gyenbox signature colors
    content: @Composable () -> Unit,
) {
    // We enforce the Gyenbox dark color palette for a premium, unified storage application vibe
    MaterialTheme(
        colorScheme = GyenboxColorScheme,
        typography = Typography,
        content = content
    )
}
