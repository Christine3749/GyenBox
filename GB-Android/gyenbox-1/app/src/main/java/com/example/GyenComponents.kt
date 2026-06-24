package com.example

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import com.example.ui.theme.*

// Gyenbox Logo Component: Purple square (28px, #7C6AF7, radius 6px) + "G" white + "yenbox" text
@Composable
fun GyenboxLogo(modifier: Modifier = Modifier, showText: Boolean = true) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(GyenAccent, shape = RoundedCornerShape(6.dp))
                .semantics { testTag = "gyenbox_logo_mark" },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "G",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        }
        if (showText) {
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "yenbox",
                fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif,
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
                color = GyenTextLight
            )
        }
    }
}

// Flat Icon renderer for each file type with appropriate flat color
@Composable
fun GyenFileIcon(type: String, color: Color, modifier: Modifier = Modifier) {
    val iconVector: ImageVector = when (type.uppercase()) {
        "FOLDER" -> Icons.Default.Folder
        "PNG", "IMAGE", "JPG" -> Icons.Default.Image
        "PDF" -> Icons.Default.PictureAsPdf
        "MP4", "VIDEO", "AVI" -> Icons.Default.PlayCircle
        "XLSX", "SHEET", "CSV" -> Icons.Default.GridOn
        "DOCX", "DOC", "TXT" -> Icons.Default.Description
        else -> Icons.Default.InsertDriveFile
    }

    Box(
        modifier = modifier
            .background(GyenCard, shape = RoundedCornerShape(8.dp))
            .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = iconVector,
            contentDescription = "$type icon",
            modifier = Modifier.size(20.dp),
            tint = color
        )
    }
}

// Bottom Navigation Tab definitions
enum class GyenTab(val title: String, val icon: ImageVector) {
    Home("Home", Icons.Default.Home),
    Files("Files", Icons.Default.FolderOpen),
    Shared("Shared", Icons.Default.People),
    Settings("Settings", Icons.Default.Settings)
}

// Bottom Nav Component: 4 tabs, customizable active tab, background: #0F0F1A, border-top 1px #1E1E2E
@Composable
fun GyenBottomNav(
    activeTab: GyenTab,
    onTabSelected: (GyenTab) -> Unit,
    modifier: Modifier = Modifier,
    height: Int = 64
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(height.dp)
            .background(Color(0xFF0F0F1A))
            .border(width = 1.dp, color = GyenBorder, shape = RoundedCornerShape(topStart = 0.dp, topEnd = 0.dp))
            .windowInsetsPadding(WindowInsets.navigationBars),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceAround
    ) {
        GyenTab.values().forEach { tab ->
            val isActive = tab == activeTab
            val color = if (isActive) GyenAccent else GyenTextMuted

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clickable(
                        onClick = { onTabSelected(tab) },
                        indication = null, // Custom minimal design
                        interactionSource = remember { MutableInteractionSource() }
                    )
                    .semantics { testTag = "nav_tab_${tab.title.lowercase()}" },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = tab.icon,
                    contentDescription = tab.title,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = tab.title,
                    fontSize = 10.sp,
                    fontWeight = if (isActive) FontWeight.Medium else FontWeight.Normal,
                    color = color
                )
            }
        }
    }
}

// Custom storage bar with optional multi-color segments or single purple progress bar
@Composable
fun GyenStorageBar(
    used: Double,
    total: Double,
    segmented: Boolean = false,
    modifier: Modifier = Modifier
) {
    val fraction = (used / total).toFloat().coerceIn(0f, 1f)
    
    Column(modifier = modifier.fillMaxWidth()) {
        if (segmented) {
            // Three color segments: purple=Images / pink=Docs / blue=PDFs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(1.5.dp))
            ) {
                Box(
                    modifier = Modifier
                        .weight(fraction * 0.55f)
                        .fillMaxHeight()
                        .background(GyenAccent) // purple Images
                )
                Box(
                    modifier = Modifier
                        .weight(fraction * 0.30f)
                        .fillMaxHeight()
                        .background(GyenPNG) // pink Docs
                )
                Box(
                    modifier = Modifier
                        .weight(fraction * 0.15f)
                        .fillMaxHeight()
                        .background(GyenDOCX) // blue PDFs
                )
                Box(
                    modifier = Modifier
                        .weight(1f - fraction)
                        .fillMaxHeight()
                        .background(GyenBorder) // remaining empty space
                )
            }
        } else {
            // Single purple progress bar, full width, 3px height
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(GyenBorder, shape = RoundedCornerShape(1.5.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction)
                        .fillMaxHeight()
                        .background(GyenAccent, shape = RoundedCornerShape(1.5.dp))
                )
            }
        }
    }
}

// Context Menu Popup: Download / Rename / Delete
@Composable
fun GyenContextMenu(
    expanded: Boolean,
    onDismiss: () -> Unit,
    onDownload: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
    anchorPosition: IntOffset = IntOffset(0, 0)
) {
    if (expanded) {
        Popup(
            alignment = Alignment.TopStart,
            offset = anchorPosition,
            onDismissRequest = onDismiss
        ) {
            Box(
                modifier = Modifier
                    .width(140.dp)
                    .background(GyenCard, shape = RoundedCornerShape(8.dp))
                    .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                    .padding(vertical = 4.dp)
                    .semantics { testTag = "context_menu" }
            ) {
                Column {
                    ContextMenuItem(
                        text = "Download",
                        icon = Icons.Default.Download,
                        tint = GyenTextLight,
                        onClick = {
                            onDownload()
                            onDismiss()
                        }
                    )
                    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(GyenBorder))
                    ContextMenuItem(
                        text = "Rename",
                        icon = Icons.Default.Edit,
                        tint = GyenTextLight,
                        onClick = {
                            onRename()
                            onDismiss()
                        }
                    )
                    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(GyenBorder))
                    ContextMenuItem(
                        text = "Delete",
                        icon = Icons.Default.Delete,
                        tint = GyenPDF, // Highlight delete option in red/pink
                        onClick = {
                            onDelete()
                            onDismiss()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ContextMenuItem(
    text: String,
    icon: ImageVector,
    tint: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .semantics { testTag = "context_menu_item_${text.lowercase()}" },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            tint = tint,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = text,
            fontSize = 12.sp,
            color = tint,
            fontWeight = FontWeight.Medium
        )
    }
}
