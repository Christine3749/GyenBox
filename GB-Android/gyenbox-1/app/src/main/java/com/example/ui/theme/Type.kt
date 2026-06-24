package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// We pair a clean SansSerif display font (emulating Inter) with a clean Monospace font (emulating JetBrains Mono)
val Typography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
)

// Customized specific TextStyles as requested for files:
// - Filename: Inter 500 13px #EEEEF8 (using SansSerif)
val GyenFilenameStyle = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Medium,
    fontSize = 13.sp,
    color = GyenTextLight
)

// - Meta: Inter 400 11px #4A4A6A (using SansSerif)
val GyenMetaStyle = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Normal,
    fontSize = 11.sp,
    color = GyenTextMuted
)

// - Size: JetBrains Mono 11px #4A4A6A (using Monospace)
val GyenSizeStyle = TextStyle(
    fontFamily = FontFamily.Monospace,
    fontWeight = FontWeight.Normal,
    fontSize = 11.sp,
    color = GyenTextMuted
)

// - Dense Size: JetBrains Mono 9px #4A4A6A
val GyenDenseSizeStyle = TextStyle(
    fontFamily = FontFamily.Monospace,
    fontWeight = FontWeight.Normal,
    fontSize = 9.sp,
    color = GyenTextMuted
)

// - Dense Filename: Inter 500 10px #EEEEF8
val GyenDenseFilenameStyle = TextStyle(
    fontFamily = FontFamily.SansSerif,
    fontWeight = FontWeight.Medium,
    fontSize = 10.sp,
    color = GyenTextLight
)
