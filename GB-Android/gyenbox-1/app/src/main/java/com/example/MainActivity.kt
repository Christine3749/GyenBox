package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

class MainActivity : ComponentActivity() {
    private val viewModel = GyenViewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = GyenBg
                ) { innerPadding ->
                    GyenAppMainScreen(
                        viewModel = viewModel,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}

enum class MainMode {
    SANDBOX,
    COMPARATOR
}

@Composable
fun GyenAppMainScreen(
    viewModel: GyenViewModel,
    modifier: Modifier = Modifier
) {
    var mainMode by remember { mutableStateOf(MainMode.SANDBOX) }
    var activeVariant by remember { mutableStateOf(0) } // 0=A, 1=B, 2=C, 3=D
    var showCreateDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(GyenBg)
    ) {
        // Master Control Tab Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0F0F1A))
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Mode Toggles (Sandbox vs Comparator)
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(GyenBg)
                    .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                    .padding(2.dp)
            ) {
                listOf(
                    MainMode.SANDBOX to "Interactive Sandbox",
                    MainMode.COMPARATOR to "Layout Comparator"
                ).forEach { (mode, title) ->
                    val isSelected = mainMode == mode
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isSelected) GyenAccent else Color.Transparent)
                            .clickable { mainMode = mode }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                            .semantics { testTag = "main_mode_${mode.name.lowercase()}" },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = title,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isSelected) Color.White else GyenTextMuted
                        )
                    }
                }
            }

            // Quick reset button to restore default dataset
            IconButton(
                onClick = { viewModel.resetFiles() },
                modifier = Modifier
                    .size(34.dp)
                    .background(GyenCard, shape = RoundedCornerShape(6.dp))
                    .border(1.dp, GyenBorder, shape = RoundedCornerShape(6.dp))
                    .semantics { testTag = "reset_btn" }
            ) {
                Icon(
                    imageVector = Icons.Default.RestartAlt,
                    contentDescription = "Reset mock database",
                    tint = GyenTextLight,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(GyenBorder))

        // Main Contents based on Mode
        when (mainMode) {
            MainMode.SANDBOX -> {
                // Secondary Segmented bar to pick variant A, B, C, or D in Sandbox
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(GyenBg)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Variant:",
                        color = GyenTextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(end = 4.dp)
                    )

                    listOf(
                        0 to "A (Classic)",
                        1 to "B (List)",
                        2 to "C (Home)",
                        3 to "D (Dense)"
                    ).forEach { (index, title) ->
                        val isSelected = activeVariant == index
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) GyenAccent.copy(alpha = 0.15f) else GyenCard)
                                .border(
                                    width = 1.dp,
                                    color = if (isSelected) GyenAccent else GyenBorder,
                                    shape = RoundedCornerShape(16.dp)
                                )
                                .clickable { activeVariant = index }
                                .padding(vertical = 6.dp)
                                .semantics { testTag = "variant_select_$index" },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = title,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) GyenAccent else GyenTextLight
                            )
                        }
                    }
                }

                // Render Active Sandbox Screen
                Box(modifier = Modifier.weight(1f)) {
                    when (activeVariant) {
                        0 -> VariantDropboxClassic(
                            viewModel = viewModel,
                            onAddClick = { showCreateDialog = true }
                        )
                        1 -> VariantListView(
                            viewModel = viewModel,
                            onAddClick = { showCreateDialog = true }
                        )
                        2 -> VariantHomeDashboard(
                            viewModel = viewModel,
                            onAddClick = { showCreateDialog = true }
                        )
                        3 -> VariantCompactDense(
                            viewModel = viewModel,
                            onAddClick = { showCreateDialog = true }
                        )
                    }
                }
            }

            MainMode.COMPARATOR -> {
                // Render Side-By-Side Horizontal Emulator Mockups
                SideBySideComparator(
                    viewModel = viewModel,
                    onVariantSelected = { index ->
                        activeVariant = index
                        mainMode = MainMode.SANDBOX // Auto jump to full sandbox
                    },
                    onAddClick = { showCreateDialog = true },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }

    // New item dialog
    if (showCreateDialog) {
        CreateFileDialog(
            onDismiss = { showCreateDialog = false },
            onConfirm = { name, isFolder, type ->
                viewModel.addFile(name, isFolder, type)
                showCreateDialog = false
            }
        )
    }
}
