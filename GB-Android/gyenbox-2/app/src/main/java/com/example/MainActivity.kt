package com.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.MyApplicationTheme

// --- DATA STRUCTURE FOR GYENBOX ---
data class GyenItem(
    val name: String,
    val type: String, // "folder", "png", "pdf", "mp4", "xlsx"
    val meta: String, // metadata text
    val size: String,
    val color: Color,
    val symbol: String
)

// The 6 items required to be shown in all 4 layouts
val gyenItems = listOf(
    GyenItem("Brand_Assets", "folder", "45 files", "4.8 GB", Color(0xFFF0A500), "📁"),
    GyenItem("Project_Nexus", "folder", "12 files", "1.2 GB", Color(0xFFF0A500), "📁"),
    GyenItem("Brand_Logo.png", "png", "2h ago", "2.1 MB", Color(0xFFFF6B9D), "🖼"),
    GyenItem("Contract_v4.pdf", "pdf", "Yesterday", "14.8 MB", Color(0xFFE8445A), "📄"),
    GyenItem("Promo_Video.mp4", "mp4", "Monday", "145 MB", Color(0xFF7C6AF7), "🎬"),
    GyenItem("Q3_Report.xlsx", "xlsx", "3d ago", "312 KB", Color(0xFF1DB877), "📊")
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF1A1A1A) // Outer workspace background as specified
                ) {
                    GyenboxWorkspaceScreen()
                }
            }
        }
    }
}

@Composable
fun GyenboxWorkspaceScreen() {
    val context = LocalContext.current
    var selectedViewMode by remember { mutableStateOf("comparison") } // "comparison", "a", "b", "c", "d"
    var activeMenuFile by remember { mutableStateOf<GyenItem?>(null) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A))
    ) {
        // Workspace Top Banner
        WorkspaceHeader(
            activeMode = selectedViewMode,
            onModeChange = { selectedViewMode = it }
        )

        // Main Workspace Area
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color(0xFF1A1A1A)),
            contentAlignment = Alignment.Center
        ) {
            if (selectedViewMode == "comparison") {
                // Beautifully balanced 2x2 grid of mockups (Geometric Balance Theme)
                val workspaceScrollState = rememberScrollState()
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(workspaceScrollState)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "GYENBOX MOBILE UI · 4-VARIANT COMPARISON",
                        color = Color(0xFF666666),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 1.5.sp,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(modifier = Modifier.padding(6.dp)) {
                            PhoneMockupFrame(
                                title = "Variant A — Classic",
                                width = 175.dp,
                                height = 360.dp,
                                onZoom = { selectedViewMode = "a" }
                            ) {
                                VariantALayout(onLongPressFile = { activeMenuFile = it })
                            }
                        }
                        Box(modifier = Modifier.padding(6.dp)) {
                            PhoneMockupFrame(
                                title = "Variant B — List View",
                                width = 175.dp,
                                height = 360.dp,
                                onZoom = { selectedViewMode = "b" }
                            ) {
                                VariantBLayout(onLongPressFile = { activeMenuFile = it })
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(modifier = Modifier.padding(6.dp)) {
                            PhoneMockupFrame(
                                title = "Variant C — Home Dashboard",
                                width = 175.dp,
                                height = 360.dp,
                                onZoom = { selectedViewMode = "c" }
                            ) {
                                VariantCLayout(onLongPressFile = { activeMenuFile = it })
                            }
                        }
                        Box(modifier = Modifier.padding(6.dp)) {
                            PhoneMockupFrame(
                                title = "Variant D — Compact Dense",
                                width = 175.dp,
                                height = 360.dp,
                                onZoom = { selectedViewMode = "d" }
                            ) {
                                VariantDLayout(onLongPressFile = { activeMenuFile = it })
                            }
                        }
                    }
                }
            } else if (selectedViewMode == "comparison_row") {
                // Show 4 mockups side by side horizontally
                val workspaceScrollState = rememberScrollState()
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .horizontalScroll(workspaceScrollState)
                        .padding(horizontal = 40.dp, vertical = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // VARIANT A Mockup
                    PhoneMockupFrame(
                        title = "Variant A — Dropbox Classic",
                        onZoom = { selectedViewMode = "a" }
                    ) {
                        VariantALayout(onLongPressFile = { activeMenuFile = it })
                    }

                    // VARIANT B Mockup
                    PhoneMockupFrame(
                        title = "Variant B — List View",
                        onZoom = { selectedViewMode = "b" }
                    ) {
                        VariantBLayout(onLongPressFile = { activeMenuFile = it })
                    }

                    // VARIANT C Mockup
                    PhoneMockupFrame(
                        title = "Variant C — Home Dashboard",
                        onZoom = { selectedViewMode = "c" }
                    ) {
                        VariantCLayout(onLongPressFile = { activeMenuFile = it })
                    }

                    // VARIANT D Mockup
                    PhoneMockupFrame(
                        title = "Variant D — Compact Dense",
                        onZoom = { selectedViewMode = "d" }
                    ) {
                        VariantDLayout(onLongPressFile = { activeMenuFile = it })
                    }
                }
            } else {
                // Immersive fullscreen simulation of a single layout
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF07070E)), // Background matching phone canvas
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        modifier = Modifier
                            .widthIn(max = 480.dp)
                            .fillMaxHeight(),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Header to return
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF0F0F1A))
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                                .drawBehind {
                                    drawLine(
                                        color = Color(0xFF1E1E2E),
                                        start = androidx.compose.ui.geometry.Offset(0f, size.height),
                                        end = androidx.compose.ui.geometry.Offset(size.width, size.height),
                                        strokeWidth = 1.dp.toPx()
                                    )
                                },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = { selectedViewMode = "comparison" }) {
                                Icon(
                                    imageVector = Icons.Default.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color(0xFF7C6AF7)
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = when (selectedViewMode) {
                                    "a" -> "Variant A — Dropbox Classic (Immersive)"
                                    "b" -> "Variant B — List View (Immersive)"
                                    "c" -> "Variant C — Home Dashboard (Immersive)"
                                    "d" -> "Variant D — Compact Dense (Immersive)"
                                    else -> ""
                                },
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // Immersive Content
                        Box(modifier = Modifier.weight(1f)) {
                            when (selectedViewMode) {
                                "a" -> VariantALayout(onLongPressFile = { activeMenuFile = it })
                                "b" -> VariantBLayout(onLongPressFile = { activeMenuFile = it })
                                "c" -> VariantCLayout(onLongPressFile = { activeMenuFile = it })
                                "d" -> VariantDLayout(onLongPressFile = { activeMenuFile = it })
                            }
                        }
                    }
                }
            }
        }

        // Context Menu Pop-Up (triggered on long press of folders/files)
        activeMenuFile?.let { item ->
            ContextMenuDialog(
                item = item,
                onDismiss = { activeMenuFile = null },
                onAction = { action ->
                    Toast.makeText(context, "$action requested for ${item.name}", Toast.LENGTH_SHORT).show()
                    activeMenuFile = null
                }
            )
        }

        // Workspace footer branding
        WorkspaceFooter()
    }
}

// --- WORKSPACE COMMON COMPONENTS ---

@Composable
fun WorkspaceHeader(activeMode: String, onModeChange: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0F0F1A))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Gyenbox Mobile UI",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "4-Variant Layout Evaluation Workspace",
                    color = Color(0xFF4A4A6A),
                    fontSize = 11.sp
                )
            }
            // G Logo for Workspace Banner
            GyenboxLogo(size = 24.dp, showText = false)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Selector buttons row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ViewModeButton("comparison", "📐 Grid View", activeMode, onModeChange)
            ViewModeButton("comparison_row", "📱 Row View", activeMode, onModeChange)
            ViewModeButton("a", "Classic (A)", activeMode, onModeChange)
            ViewModeButton("b", "List View (B)", activeMode, onModeChange)
            ViewModeButton("c", "Dashboard (C)", activeMode, onModeChange)
            ViewModeButton("d", "Compact (D)", activeMode, onModeChange)
        }
    }
}

@Composable
fun ViewModeButton(mode: String, label: String, activeMode: String, onModeChange: (String) -> Unit) {
    val isActive = activeMode == mode
    Button(
        onClick = { onModeChange(mode) },
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isActive) Color(0xFF7C6AF7) else Color(0xFF1E1E2E),
            contentColor = if (isActive) Color.White else Color(0xFFEEEEF8)
        ),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.testTag("mode_tab_$mode")
    ) {
        Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun WorkspaceFooter() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0F0F1A))
            .padding(vertical = 12.dp, horizontal = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "GSYEN Ecosystem · Your data. Your territory. In your DNA.",
                color = Color(0xFF4A4A6A),
                fontSize = 10.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun PhoneMockupFrame(
    title: String,
    onZoom: () -> Unit,
    width: Dp = 280.dp,
    height: Dp = 580.dp,
    content: @Composable () -> Unit
) {
    val isCompact = width < 200.dp
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.wrapContentSize()
    ) {
        // Zoom/Focus Button above mockup
        Button(
            onClick = onZoom,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF13131F),
                contentColor = Color(0xFF7C6AF7)
            ),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .padding(bottom = 6.dp)
                .height(if (isCompact) 26.dp else 32.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                horizontal = if (isCompact) 10.dp else 16.dp,
                vertical = 0.dp
            )
        ) {
            Text(
                text = "🔍 Immersive",
                fontSize = if (isCompact) 8.sp else 10.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        // Phone Frame
        Box(
            modifier = Modifier
                .width(width)
                .height(height)
                .border(1.dp, Color(0xFF2A2A3D), RoundedCornerShape(if (isCompact) 20.dp else 36.dp))
                .clip(RoundedCornerShape(if (isCompact) 20.dp else 36.dp))
                .background(Color(0xFF07070E)) // Phone canvas background
        ) {
            content()
            
            // Bottom home indicator bar overlay to make mockup realistic
            val indicatorWidth = if (isCompact) 60.dp else 100.dp
            val indicatorHeight = if (isCompact) 3.dp else 4.dp
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 6.dp)
                    .width(indicatorWidth)
                    .height(indicatorHeight)
                    .background(Color(0xFF1E1E2E), RoundedCornerShape(2.dp))
            )
        }

        // Label below Mockup
        Text(
            text = title,
            color = Color(0xFFA0A0B0),
            fontSize = if (isCompact) 10.sp else 12.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

// --- CONTEXT MENU OVERLAY DIALOG ---
@Composable
fun ContextMenuDialog(
    item: GyenItem,
    onDismiss: () -> Unit,
    onAction: (String) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .width(240.dp)
                .background(Color(0xFF13131F), RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFF1E1E2E), RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Column {
                // Header with file details
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(Color(0xFF1E1E2E), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = item.symbol, fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = item.name,
                            color = Color(0xFFEEEEF8),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = item.size,
                            color = Color(0xFF4A4A6A),
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Box(modifier = Modifier.height(1.dp).fillMaxWidth().background(Color(0xFF1E1E2E)))
                Spacer(modifier = Modifier.height(8.dp))

                // Menu Actions
                ContextMenuOption("📥 Download File", onAction = { onAction("Download") })
                ContextMenuOption("✏️ Rename File", onAction = { onAction("Rename") })
                ContextMenuOption("🗑️ Delete File", isDestructive = true, onAction = { onAction("Delete") })

                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E1E2E)),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Cancel", color = Color(0xFFEEEEF8), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun ContextMenuOption(
    label: String,
    isDestructive: Boolean = false,
    onAction: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onAction() }
            .padding(vertical = 10.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = if (isDestructive) Color(0xFFE8445A) else Color(0xFFEEEEF8),
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

// --- LOGO GENERATOR COMPOSABLE ---
@Composable
fun GyenboxLogo(size: Dp = 28.dp, showText: Boolean = true, textSuffix: String = "yenbox") {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(size)
                .background(Color(0xFF7C6AF7), shape = RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "G",
                color = Color.White,
                fontSize = (size.value * 0.6f).sp,
                fontWeight = FontWeight.Bold
            )
        }
        if (showText) {
            Text(
                text = textSuffix,
                color = Color(0xFFEEEEF8),
                fontSize = (size.value * 0.55f).sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// --- GADGET STATUS BAR SIMULATOR ---
@Composable
fun PhoneStatusBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(24.dp)
            .background(Color(0xFF07070E))
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("9:41", color = Color(0xFFEEEEF8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("📶", color = Color(0xFFEEEEF8), fontSize = 8.sp)
            Text("🛜", color = Color(0xFFEEEEF8), fontSize = 8.sp)
            Text("🔋", color = Color(0xFFEEEEF8), fontSize = 8.sp)
        }
    }
}

// --- VARIANT A LAYOUT — "DROPBOX CLASSIC" ---
@Composable
fun VariantALayout(onLongPressFile: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07070E))
    ) {
        PhoneStatusBar()

        // Topbar (56px)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(Color(0xFF07070E))
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Left: G logo mark
            GyenboxLogo(size = 28.dp, showText = true, textSuffix = "yenbox")

            // Center: Search bar full width (flex:1)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .background(Color(0xFF13131F), RoundedCornerShape(17.dp))
                    .border(1.dp, Color(0xFF1E1E2E), RoundedCornerShape(17.dp))
                    .padding(horizontal = 10.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF4A4A6A),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Search", color = Color(0xFF4A4A6A), fontSize = 11.sp)
                }
            }

            // Right: Upload button & Avatar
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color(0xFF7C6AF7), CircleShape)
                    .clickable { /* Upload */ },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Upload",
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
            }

            // Avatar circle
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color(0xFF13131F), CircleShape)
                    .border(1.dp, Color(0xFF7C6AF7), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("E", color = Color(0xFF7C6AF7), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Main content area scrollable
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            // Storage Bar (below topbar)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("STORAGE USED", color = Color(0xFF4A4A6A), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("74.2 GB / 128 GB", color = Color(0xFF4A4A6A), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                }
                Spacer(modifier = Modifier.height(6.dp))
                // Single purple progress bar, full width, 3px/dp height
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(Color(0xFF1E1E2E))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.58f) // 74.2 / 128
                            .fillMaxHeight()
                            .background(Color(0xFF7C6AF7))
                    )
                }
            }

            // Section label: "ALL FILES" + list-view icon right
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("ALL FILES", color = Color(0xFF4A4A6A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Icon(
                    imageVector = Icons.Default.List,
                    contentDescription = "List",
                    tint = Color(0xFF4A4A6A),
                    modifier = Modifier.size(16.dp)
                )
            }

            // File Grid (2 columns, gap 10px, padding 12px)
            FileGrid2Columns(items = gyenItems, onLongPress = onLongPressFile)
        }

        // Bottom nav: 4 tabs, Home active
        SimulatedBottomNav(activeTab = "Home")
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FileGrid2Columns(items: List<GyenItem>, onLongPress: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Render 2 items per row
        for (i in items.indices step 2) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Item 1
                Box(modifier = Modifier.weight(1f)) {
                    val item = items[i]
                    VariantACard(item = item, onLongClick = { onLongPress(item) })
                }
                // Item 2
                Box(modifier = Modifier.weight(1f)) {
                    if (i + 1 < items.size) {
                        val item = items[i + 1]
                        VariantACard(item = item, onLongClick = { onLongPress(item) })
                    } else {
                        Spacer(modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantACard(item: GyenItem, onLongClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .background(Color(0xFF13131F), shape = RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .padding(12.dp)
    ) {
        // Icon top-center
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp)
                .size(44.dp)
                .background(Color(0xFF1E1E2E), shape = RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.symbol, fontSize = 20.sp)
        }

        // Name + size bottom-left
        Column(
            modifier = Modifier.align(Alignment.BottomStart)
        ) {
            Text(
                text = item.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFEEEEF8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = item.size,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF4A4A6A)
            )
        }
    }
}

// --- VARIANT B LAYOUT — "LIST VIEW" ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantBLayout(onLongPressFile: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07070E))
    ) {
        PhoneStatusBar()

        // Topbar (56px)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(Color(0xFF07070E))
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: G logo + "Gyenbox" wordmark
            GyenboxLogo(size = 28.dp, showText = true, textSuffix = "yenbox")

            // Right: search icon, + icon button #7C6AF7, avatar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Color(0xFFEEEEF8),
                    modifier = Modifier.size(20.dp)
                )

                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(Color(0xFF7C6AF7), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(Color(0xFF13131F), CircleShape)
                        .border(1.dp, Color(0xFF7C6AF7), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("E", color = Color(0xFF7C6AF7), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Section label row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("MY FILES", color = Color(0xFF4A4A6A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text("6 items", color = Color(0xFF4A4A6A), fontSize = 11.sp)
        }

        // Scrollable list content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            gyenItems.forEach { item ->
                VariantBRow(item = item, onLongClick = { onLongPressFile(item) })
            }
        }

        // Storage Bar (BOTTOM, above nav)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("STORAGE USED", color = Color(0xFF4A4A6A), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text("5.8 GB / 10 GB", color = Color(0xFF4A4A6A), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
            }
            Spacer(modifier = Modifier.height(6.dp))

            // Multicolored color segment bar (3px height)
            // Three color segments: purple=Images / pink=Docs / blue=PDFs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.5.dp))
            ) {
                // Purple segment (e.g. Images 32%)
                Box(
                    modifier = Modifier
                        .weight(3.2f)
                        .fillMaxHeight()
                        .background(Color(0xFF7C6AF7))
                )
                // Pink segment (e.g. Docs 18%)
                Box(
                    modifier = Modifier
                        .weight(1.8f)
                        .fillMaxHeight()
                        .background(Color(0xFFFF6B9D))
                )
                // Blue segment (e.g. PDFs 8%)
                Box(
                    modifier = Modifier
                        .weight(0.8f)
                        .fillMaxHeight()
                        .background(Color(0xFF3B9EFF))
                )
                // Remainder empty space
                Box(
                    modifier = Modifier
                        .weight(4.2f)
                        .fillMaxHeight()
                        .background(Color(0xFF1E1E2E))
                )
            }
        }

        // Bottom nav: 4 tabs, Files active
        SimulatedBottomNav(activeTab = "Files")
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantBRow(item: GyenItem, onLongClick: () -> Unit) {
    val metaText = when (item.type) {
        "folder" -> "${item.meta} · Folder"
        "png" -> "Image · ${item.meta}"
        "pdf" -> "PDF · ${item.meta}"
        "mp4" -> "Video · ${item.meta}"
        "xlsx" -> "Sheet · ${item.meta}"
        else -> item.meta
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .drawBehind {
                drawLine(
                    color = Color(0xFF1E1E2E),
                    start = androidx.compose.ui.geometry.Offset(0f, size.height),
                    end = androidx.compose.ui.geometry.Offset(size.width, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Icon rounded square 36x36px, bg slightly lighter than card background (#13131F)
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Color(0xFF13131F), shape = RoundedCornerShape(8.dp))
                .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.symbol, fontSize = 18.sp)
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Name + Meta
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = item.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFEEEEF8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = metaText,
                fontSize = 11.sp,
                color = Color(0xFF4A4A6A)
            )
        }

        // Size
        Text(
            text = item.size,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = Color(0xFF4A4A6A)
        )
    }
}

// --- VARIANT C LAYOUT — "HOME DASHBOARD" ---
@Composable
fun VariantCLayout(onLongPressFile: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07070E))
    ) {
        PhoneStatusBar()

        // Topbar (56px) - full width search bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Search field
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(38.dp)
                    .background(Color(0xFF13131F), RoundedCornerShape(19.dp))
                    .border(1.dp, Color(0xFF1E1E2E), RoundedCornerShape(19.dp))
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left of search: G mark (small, 24px)
                GyenboxLogo(size = 24.dp, showText = false)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Search files & folders...", color = Color(0xFF4A4A6A), fontSize = 11.sp)
            }

            // Right of search: avatar circle
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color(0xFF13131F), CircleShape)
                    .border(1.dp, Color(0xFF7C6AF7), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("E", color = Color(0xFF7C6AF7), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Scrollable content
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            // Welcome row (below topbar, padding 16px)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text("Good morning, Ethan", color = Color(0xFFEEEEF8), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("5.8 GB of 10 GB used", color = Color(0xFF4A4A6A), fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    // Mini progress bar inline after text: 120px wide, 3px height
                    Box(
                        modifier = Modifier
                            .width(120.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(Color(0xFF1E1E2E))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.58f)
                                .fillMaxHeight()
                                .background(Color(0xFF7C6AF7))
                        )
                    }
                }
            }

            // SECTION 1: "RECENT" + "See all"
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("RECENT", color = Color(0xFF4A4A6A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text("See all", color = Color(0xFFA99FF8), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }

            // Recent horizontal scroll row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Recent files: Brand_Logo.png, Contract_v4.pdf, Promo_Video.mp4, and Q3_Report.xlsx (partially visible)
                val recentItems = gyenItems.drop(2) // Skip folders
                recentItems.forEach { item ->
                    RecentHorizontalCard(item = item, onLongClick = { onLongPressFile(item) })
                }
            }

            // SECTION 2: "FOLDERS" label
            Text(
                text = "FOLDERS",
                color = Color(0xFF4A4A6A),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Folders 2-Column Grid
            FoldersGrid2Columns(items = gyenItems.take(2), onLongPress = onLongPressFile)

            // SECTION 3: "ALL FILES" label
            Text(
                text = "ALL FILES",
                color = Color(0xFF4A4A6A),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Remaining 4 files in 2-Column Grid
            FilesGrid2Columns(items = gyenItems.drop(2), onLongPress = onLongPressFile)
        }

        // Bottom nav: 4 tabs, Home active
        SimulatedBottomNav(activeTab = "Home")
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun RecentHorizontalCard(item: GyenItem, onLongClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(110.dp)
            .height(110.dp)
            .background(Color(0xFF13131F), shape = RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Color(0xFF1E1E2E), shape = RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.symbol, fontSize = 18.sp)
        }

        Text(
            text = item.name,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFFEEEEF8),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun FoldersGrid2Columns(items: List<GyenItem>, onLongPress: (GyenItem) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items.forEach { item ->
            Box(modifier = Modifier.weight(1f)) {
                VariantCFolderCard(item = item, onLongClick = { onLongPress(item) })
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantCFolderCard(item: GyenItem, onLongClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(100.dp)
            .background(Color(0xFF13131F), shape = RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Icon left-aligned at 28.dp/px
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(Color(0xFF1E1E2E), shape = RoundedCornerShape(6.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.symbol, fontSize = 14.sp)
        }

        // Name + meta below
        Column {
            Text(
                text = item.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFEEEEF8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${item.meta} · ${item.size}",
                fontSize = 10.sp,
                color = Color(0xFF4A4A6A)
            )
        }
    }
}

@Composable
fun FilesGrid2Columns(items: List<GyenItem>, onLongPress: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        for (i in items.indices step 2) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    val item = items[i]
                    VariantCFileCard(item = item, onLongClick = { onLongPress(item) })
                }
                Box(modifier = Modifier.weight(1f)) {
                    if (i + 1 < items.size) {
                        val item = items[i + 1]
                        VariantCFileCard(item = item, onLongClick = { onLongPress(item) })
                    } else {
                        Spacer(modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantCFileCard(item: GyenItem, onLongClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(130.dp)
            .background(Color(0xFF13131F), shape = RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(12.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .padding(12.dp)
    ) {
        // Icon centered
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(Color(0xFF1E1E2E), shape = RoundedCornerShape(8.dp))
                .align(Alignment.Center),
            contentAlignment = Alignment.Center
        ) {
            Text(text = item.symbol, fontSize = 20.sp)
        }

        // Name + size bottom-left
        Column(
            modifier = Modifier.align(Alignment.BottomStart)
        ) {
            Text(
                text = item.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFEEEEF8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = item.size,
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF4A4A6A)
            )
        }
    }
}

// --- VARIANT D LAYOUT — "COMPACT DENSE" ---
@Composable
fun VariantDLayout(onLongPressFile: (GyenItem) -> Unit) {
    var activeFilter by remember { mutableStateOf("All") }
    
    // Filter the items list based on user choice
    val filteredItems = remember(activeFilter) {
        when (activeFilter) {
            "Folders" -> gyenItems.filter { it.type == "folder" }
            "Images" -> gyenItems.filter { it.type == "png" }
            "Documents" -> gyenItems.filter { it.type == "pdf" || it.type == "xlsx" }
            "Videos" -> gyenItems.filter { it.type == "mp4" }
            else -> gyenItems
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07070E))
    ) {
        PhoneStatusBar()

        // Topbar (48px, shorter)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .background(Color(0xFF07070E))
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: G mark (24px)
            GyenboxLogo(size = 24.dp, showText = false)

            // Center: "My Files"
            Text(
                text = "My Files",
                color = Color(0xFFEEEEF8),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )

            // Right: search, more icons (20px)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Color(0xFFEEEEF8),
                    modifier = Modifier.size(20.dp)
                )
                Icon(
                    imageVector = Icons.Default.MoreVert,
                    contentDescription = "More",
                    tint = Color(0xFFEEEEF8),
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // FILTER PILLS ROW (below topbar, horizontal scroll, padding 8px 12px)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val pills = listOf("All", "Folders", "Images", "Documents", "Videos")
            pills.forEach { label ->
                val isActive = activeFilter == label
                Box(
                    modifier = Modifier
                        .height(28.dp)
                        .background(
                            if (isActive) Color(0xFF7C6AF7) else Color.Transparent,
                            RoundedCornerShape(14.dp)
                        )
                        .border(1.dp, Color(0xFF1E1E2E), RoundedCornerShape(14.dp))
                        .clickable { activeFilter = label }
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = label,
                            color = if (isActive) Color.White else Color(0xFF4A4A6A),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                        if (label == "All") {
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "●",
                                color = if (isActive) Color.White else Color(0xFF4A4A6A),
                                fontSize = 8.sp
                            )
                        }
                    }
                }
            }
        }

        // STORAGE STRIP (2 lines, padding 8px 12px)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            // Line 1: color segments bar (3px, full width, 3 colors)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.5.dp))
            ) {
                Box(
                    modifier = Modifier
                        .weight(3.2f)
                        .fillMaxHeight()
                        .background(Color(0xFF7C6AF7))
                )
                Box(
                    modifier = Modifier
                        .weight(1.8f)
                        .fillMaxHeight()
                        .background(Color(0xFFFF6B9D))
                )
                Box(
                    modifier = Modifier
                        .weight(0.8f)
                        .fillMaxHeight()
                        .background(Color(0xFF3B9EFF))
                )
                Box(
                    modifier = Modifier
                        .weight(4.2f)
                        .fillMaxHeight()
                        .background(Color(0xFF1E1E2E))
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Line 2: Legend info
            Text(
                text = "● Images 3.2GB   ● Docs 1.8GB   ● PDFs 0.8GB",
                color = Color(0xFF4A4A6A),
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        // FILE GRID (3 COLUMNS - not 2)
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 10.dp, vertical = 6.dp)
        ) {
            FileGrid3Columns(items = filteredItems, onLongPress = onLongPressFile)
        }

        // SORT ROW (below grid)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Sort by: Modified ▾", color = Color(0xFF4A4A6A), fontSize = 11.sp)
            Text("${filteredItems.size} items", color = Color(0xFF4A4A6A), fontSize = 11.sp)
        }

        // Bottom nav: 4 tabs, Files active (purple), height 56px (shorter)
        SimulatedBottomNav(activeTab = "Files")
    }
}

@Composable
fun FileGrid3Columns(items: List<GyenItem>, onLongPress: (GyenItem) -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        for (i in items.indices step 3) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Col 1
                Box(modifier = Modifier.weight(1f)) {
                    val item = items[i]
                    VariantDCard(item = item, onLongClick = { onLongPress(item) })
                }
                // Col 2
                Box(modifier = Modifier.weight(1f)) {
                    if (i + 1 < items.size) {
                        val item = items[i + 1]
                        VariantDCard(item = item, onLongClick = { onLongPress(item) })
                    } else {
                        Spacer(modifier = Modifier.fillMaxWidth())
                    }
                }
                // Col 3
                Box(modifier = Modifier.weight(1f)) {
                    if (i + 2 < items.size) {
                        val item = items[i + 2]
                        VariantDCard(item = item, onLongClick = { onLongPress(item) })
                    } else {
                        Spacer(modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantDCard(item: GyenItem, onLongClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(110.dp)
            .background(Color(0xFF13131F), shape = RoundedCornerShape(8.dp))
            .border(1.dp, Color(0xFF1E1E2E), shape = RoundedCornerShape(8.dp))
            .combinedClickable(
                onClick = {},
                onLongClick = onLongClick
            )
            .padding(6.dp)
    ) {
        // Icon centered in top 60% of card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.6f)
                .align(Alignment.TopCenter),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color(0xFF1E1E2E), shape = RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(text = item.symbol, fontSize = 14.sp)
            }
        }

        // Name + Size bottom-left
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
        ) {
            Text(
                text = item.name,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFEEEEF8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = item.size,
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF4A4A6A)
            )
        }
    }
}

// --- SIMULATED BOTTOM NAV COMPOSABLE ---
data class TabInfo(val label: String, val icon: String)

@Composable
fun SimulatedBottomNav(activeTab: String) {
    val tabs = listOf(
        TabInfo("Home", "🏠"),
        TabInfo("Files", "📁"),
        TabInfo("Shared", "👥"),
        TabInfo("Settings", "⚙️")
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(Color(0xFF0F0F1A))
            .drawBehind {
                drawLine(
                    color = Color(0xFF1E1E2E),
                    start = androidx.compose.ui.geometry.Offset(0f, 0f),
                    end = androidx.compose.ui.geometry.Offset(size.width, 0f),
                    strokeWidth = 1.dp.toPx()
                )
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceAround
    ) {
        tabs.forEach { tab ->
            val isActive = tab.label.lowercase() == activeTab.lowercase()
            val color = if (isActive) Color(0xFF7C6AF7) else Color(0xFF4A4A6A)
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier
                    .clickable { /* Tab selector feedback */ }
                    .padding(4.dp)
            ) {
                Text(
                    text = tab.icon,
                    fontSize = 18.sp,
                    color = color
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = tab.label,
                    fontSize = 10.sp,
                    fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                    color = color
                )
            }
        }
    }
}
