package com.example

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun SideBySideComparator(
    viewModel: GyenViewModel,
    onVariantSelected: (Int) -> Unit, // Callback to switch sandbox to selected variant
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A)) // Dark grey page background as requested
            .padding(vertical = 24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header instructions
            Text(
                text = "Gyenbox Mobile — 4-Variant Comparison",
                color = GyenTextLight,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                text = "Scroll horizontally to see all variants. Tap any mockup to open full screen.",
                color = GyenTextMuted,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 16.dp)
            )

            // Horizontal scroll containing the mockups
            Row(
                modifier = Modifier
                    .weight(1f)
                    .horizontalScroll(scrollState)
                    .padding(start = 40.dp, end = 40.dp), // Page padding: 40px/dp
                horizontalArrangement = Arrangement.spacedBy(24.dp), // Gap: 24px/dp
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mockup A
                MockupPhoneFrame(
                    label = "Variant A — Dropbox Classic",
                    onClick = { onVariantSelected(0) }
                ) {
                    VariantDropboxClassic(viewModel = viewModel, onAddClick = onAddClick)
                }

                // Mockup B
                MockupPhoneFrame(
                    label = "Variant B — List View",
                    onClick = { onVariantSelected(1) }
                ) {
                    VariantListView(viewModel = viewModel, onAddClick = onAddClick)
                }

                // Mockup C
                MockupPhoneFrame(
                    label = "Variant C — Home Dashboard",
                    onClick = { onVariantSelected(2) }
                ) {
                    VariantHomeDashboard(viewModel = viewModel, onAddClick = onAddClick)
                }

                // Mockup D
                MockupPhoneFrame(
                    label = "Variant D — Compact Dense",
                    onClick = { onVariantSelected(3) }
                ) {
                    VariantCompactDense(viewModel = viewModel, onAddClick = onAddClick)
                }
            }
        }
    }
}

// Reusable phone frame simulator container
@Composable
fun MockupPhoneFrame(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Column(
        modifier = modifier
            .width(280.dp) // Width: 280px
            .padding(bottom = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Phone Bezel Frame
        Card(
            modifier = Modifier
                .width(280.dp)
                .height(520.dp) // Compact simulation height
                .shadow(
                    elevation = 16.dp,
                    shape = RoundedCornerShape(36.dp),
                    clip = true,
                    ambientColor = Color.Black,
                    spotColor = Color.Black
                )
                .border(2.dp, Color(0xFF2A2A3D), shape = RoundedCornerShape(36.dp)) // border: 1px/2px solid #2A2A3D
                .clickable(onClick = onClick)
                .semantics { testTag = "mockup_${label.lowercase().replace(" ", "_")}" },
            shape = RoundedCornerShape(36.dp), // border-radius: 36px
            colors = CardDefaults.cardColors(containerColor = Color(0xFF07070E)) // background: #07070E
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // Nested Variant Content
                content()

                // Notch simulator (gives it an authentic mobile phone aesthetic)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .width(110.dp)
                        .height(18.dp)
                        .background(Color(0xFF2A2A3D), shape = RoundedCornerShape(bottomStart = 14.dp, bottomEnd = 14.dp))
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Label below each mockup
        Text(
            text = label,
            fontSize = 12.sp,
            fontFamily = FontFamily.SansSerif,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF888888), // #666 / #888
            textAlign = TextAlign.Center
        )
    }
}
