package com.example

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

// Helper function to build a file metadata description based on file types
private fun getFileMetaText(file: GyenFile): String {
    return if (file.isFolder) {
        "${file.itemCount ?: 0} items"
    } else {
        "${file.timeAgo} · ${file.type}"
    }
}

// Dialog for renaming files
@Composable
fun RenameFileDialog(
    file: GyenFile,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var text by remember { mutableStateOf(file.name) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename File", color = GyenTextLight, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
        text = {
            TextField(
                value = text,
                onValueChange = { text = it },
                colors = TextFieldDefaults.colors(
                    focusedTextColor = GyenTextLight,
                    unfocusedTextColor = GyenTextLight,
                    focusedContainerColor = GyenCard,
                    unfocusedContainerColor = GyenCard,
                    focusedIndicatorColor = GyenAccent,
                    unfocusedIndicatorColor = GyenBorder
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth().semantics { testTag = "rename_input" }
            )
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(text) },
                colors = ButtonDefaults.buttonColors(containerColor = GyenAccent)
            ) {
                Text("Rename", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = GyenTextMuted)
            }
        },
        containerColor = GyenBg,
        modifier = Modifier.border(1.dp, GyenBorder, shape = RoundedCornerShape(28.dp))
    )
}

// Dialog for creating a new file / folder
@Composable
fun CreateFileDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, isFolder: Boolean, type: String) -> Unit
) {
    var text by remember { mutableStateOf("") }
    var isFolder by remember { mutableStateOf(false) }
    var selectedType by remember { mutableStateOf("PNG") }
    val types = listOf("PNG", "PDF", "MP4", "XLSX", "DOCX")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add New Item", color = GyenTextLight, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Name Input
                TextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("Item name...", color = GyenTextMuted) },
                    colors = TextFieldDefaults.colors(
                        focusedTextColor = GyenTextLight,
                        unfocusedTextColor = GyenTextLight,
                        focusedContainerColor = GyenCard,
                        unfocusedContainerColor = GyenCard,
                        focusedIndicatorColor = GyenAccent,
                        unfocusedIndicatorColor = GyenBorder
                    ),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().semantics { testTag = "add_input_name" }
                )

                // Folder vs File Selection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = !isFolder,
                            onClick = { isFolder = false },
                            colors = RadioButtonDefaults.colors(selectedColor = GyenAccent, unselectedColor = GyenTextMuted)
                        )
                        Text("File", color = GyenTextLight, fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = isFolder,
                            onClick = { isFolder = true },
                            colors = RadioButtonDefaults.colors(selectedColor = GyenAccent, unselectedColor = GyenTextMuted)
                        )
                        Text("Folder", color = GyenTextLight, fontSize = 13.sp)
                    }
                }

                // If File, select Type
                if (!isFolder) {
                    Text("File Type:", color = GyenTextMuted, fontSize = 11.sp)
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        types.forEach { type ->
                            val isActive = selectedType == type
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isActive) GyenAccent else GyenCard)
                                    .border(1.dp, if (isActive) GyenAccent else GyenBorder, shape = RoundedCornerShape(6.dp))
                                    .clickable { selectedType = type }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = type,
                                    fontSize = 11.sp,
                                    color = if (isActive) Color.White else GyenTextLight,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (text.isNotBlank()) {
                        onConfirm(text, isFolder, if (isFolder) "Folder" else selectedType)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = GyenAccent)
            ) {
                Text("Create", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = GyenTextMuted)
            }
        },
        containerColor = GyenBg,
        modifier = Modifier.border(1.dp, GyenBorder, shape = RoundedCornerShape(28.dp))
    )
}

// VARIANT A — "Dropbox Classic"
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantDropboxClassic(
    viewModel: GyenViewModel,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var contextMenuFile by remember { mutableStateOf<GyenFile?>(null) }
    var fileToRename by remember { mutableStateOf<GyenFile?>(null) }
    var activeTab by remember { mutableStateOf(GyenTab.Home) }

    Box(modifier = modifier.fillMaxSize().background(GyenBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Topbar (56px)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: G logo mark
                GyenboxLogo(showText = false)
                
                Spacer(modifier = Modifier.width(8.dp))

                // Center: Search bar full width (flex:1)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp)
                        .background(GyenCard, shape = RoundedCornerShape(18.dp))
                        .border(1.dp, GyenBorder, shape = RoundedCornerShape(18.dp))
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = GyenTextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Search file...",
                            color = GyenTextMuted,
                            fontSize = 12.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Right: [Upload button: #7C6AF7] [Avatar circle]
                Button(
                    onClick = onAddClick,
                    modifier = Modifier.height(32.dp).semantics { testTag = "upload_btn_a" },
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GyenAccent),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Upload", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.width(8.dp))

                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(GyenAccent.copy(alpha = 0.15f), shape = CircleShape)
                        .border(1.dp, GyenAccent, shape = CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("E", color = GyenAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Storage bar (below topbar)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "STORAGE USED",
                        fontSize = 9.sp,
                        color = GyenTextMuted,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "74.2 GB / 128 GB",
                        fontSize = 10.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        color = GyenTextMuted
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                // Single progress bar, full width, 3px height (keep minimal)
                GyenStorageBar(used = 74.2, total = 128.0, segmented = false)
            }

            // Section label: "ALL FILES" (11px uppercase #4A4A6A) + list-view icon right
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ALL FILES",
                    fontSize = 11.sp,
                    color = GyenTextMuted,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Icon(
                    imageVector = Icons.Default.List,
                    contentDescription = "Switch to List View",
                    tint = GyenTextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }

            // File grid: 2 columns, gap 10px, padding 12px
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 12.dp, top = 0.dp, end = 12.dp, bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(viewModel.files) { file ->
                    // Card: square-ish, 160px (approx 160dp)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .background(GyenCard, shape = RoundedCornerShape(8.dp))
                            .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                            .combinedClickable(
                                onClick = {
                                    Toast.makeText(context, "Clicked ${file.name}", Toast.LENGTH_SHORT).show()
                                },
                                onLongClick = {
                                    contextMenuFile = file
                                }
                            )
                            .padding(12.dp)
                            .semantics { testTag = "file_card_${file.name.lowercase()}" }
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            // Icon top-center
                            Box(
                                modifier = Modifier.fillMaxWidth().weight(1f),
                                contentAlignment = Alignment.Center
                            ) {
                                GyenFileIcon(
                                    type = file.type,
                                    color = file.iconColor,
                                    modifier = Modifier.size(48.dp)
                                )
                            }

                            // Name + size bottom-left
                            Column {
                                Text(
                                    text = file.name,
                                    style = GyenFilenameStyle,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = if (file.isFolder) "${file.itemCount} items" else file.size,
                                    style = GyenSizeStyle
                                )
                            }
                        }
                    }
                }
            }
        }

        // Floating context menu
        contextMenuFile?.let { file ->
            GyenContextMenu(
                expanded = true,
                onDismiss = { contextMenuFile = null },
                onDownload = {
                    Toast.makeText(context, "Downloading ${file.name}...", Toast.LENGTH_SHORT).show()
                },
                onRename = { fileToRename = file },
                onDelete = { viewModel.deleteFile(file.id) },
                anchorPosition = IntOffset(100, 400)
            )
        }

        // Rename file dialog
        fileToRename?.let { file ->
            RenameFileDialog(
                file = file,
                onDismiss = { fileToRename = null },
                onConfirm = { newName ->
                    viewModel.renameFile(file.id, newName)
                    fileToRename = null
                }
            )
        }

        // Bottom nav: 4 tabs, Home active
        GyenBottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// VARIANT B — "List View"
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantListView(
    viewModel: GyenViewModel,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var contextMenuFile by remember { mutableStateOf<GyenFile?>(null) }
    var fileToRename by remember { mutableStateOf<GyenFile?>(null) }
    var activeTab by remember { mutableStateOf(GyenTab.Files) }

    Box(modifier = modifier.fillMaxSize().background(GyenBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Topbar (56px)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left: G logo mark + "Gyenbox" wordmark
                GyenboxLogo()

                // Right: [search icon] [+ icon button #7C6AF7] [avatar]
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = GyenTextMuted,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable {
                                Toast.makeText(context, "Search clicked", Toast.LENGTH_SHORT).show()
                            }
                    )

                    IconButton(
                        onClick = onAddClick,
                        modifier = Modifier
                            .size(28.dp)
                            .background(GyenAccent, shape = RoundedCornerShape(6.dp))
                            .semantics { testTag = "add_btn_b" }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add new file",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .background(GyenAccent.copy(alpha = 0.15f), shape = CircleShape)
                            .border(1.dp, GyenAccent, shape = CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("E", color = GyenAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Section label row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "MY FILES",
                    fontSize = 11.sp,
                    color = GyenTextMuted,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "${viewModel.files.size} items",
                    fontSize = 11.sp,
                    color = GyenTextMuted
                )
            }

            // FILE LIST (full width rows, NOT grid)
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(viewModel.files) { file ->
                    // Row height: 56px, padding: 0 16px, border-bottom
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .border(width = 0.5.dp, color = GyenBorder.copy(alpha = 0.5f), shape = RoundedCornerShape(0.dp))
                            .combinedClickable(
                                onClick = {
                                    Toast.makeText(context, "Clicked ${file.name}", Toast.LENGTH_SHORT).show()
                                },
                                onLongClick = {
                                    contextMenuFile = file
                                }
                            )
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Icon: rounded square 36x36px, bg slightly lighter than card
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(GyenCard.copy(alpha = 1.5f), shape = RoundedCornerShape(8.dp))
                                .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = when (file.type.uppercase()) {
                                    "FOLDER" -> Icons.Default.Folder
                                    "PNG" -> Icons.Default.Image
                                    "PDF" -> Icons.Default.PictureAsPdf
                                    "MP4" -> Icons.Default.PlayCircle
                                    "XLSX" -> Icons.Default.GridOn
                                    else -> Icons.Default.Description
                                },
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = file.iconColor
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        // Name + Meta flex:1
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = file.name,
                                style = GyenFilenameStyle,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (file.isFolder) "Folder · ${file.itemCount} items" else "${file.timeAgo} · ${file.type}",
                                style = GyenMetaStyle
                            )
                        }

                        // Size right-aligned
                        Text(
                            text = file.size,
                            style = GyenSizeStyle,
                            textAlign = TextAlign.End
                        )
                    }
                }
            }

            // Storage bar (BOTTOM, above nav)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "STORAGE SUMMARY",
                        fontSize = 9.sp,
                        color = GyenTextMuted,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "5.8 GB / 10 GB",
                        fontSize = 10.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        color = GyenTextMuted
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                // Three color segments: purple=Images / pink=Docs / blue=PDFs
                GyenStorageBar(used = 5.8, total = 10.0, segmented = true)
            }
        }

        // Floating context menu
        contextMenuFile?.let { file ->
            GyenContextMenu(
                expanded = true,
                onDismiss = { contextMenuFile = null },
                onDownload = {
                    Toast.makeText(context, "Downloading ${file.name}...", Toast.LENGTH_SHORT).show()
                },
                onRename = { fileToRename = file },
                onDelete = { viewModel.deleteFile(file.id) },
                anchorPosition = IntOffset(100, 300)
            )
        }

        // Rename file dialog
        fileToRename?.let { file ->
            RenameFileDialog(
                file = file,
                onDismiss = { fileToRename = null },
                onConfirm = { newName ->
                    viewModel.renameFile(file.id, newName)
                    fileToRename = null
                }
            )
        }

        // Bottom nav: 4 tabs, Files active
        GyenBottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// VARIANT C — "Home Dashboard"
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantHomeDashboard(
    viewModel: GyenViewModel,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var contextMenuFile by remember { mutableStateOf<GyenFile?>(null) }
    var fileToRename by remember { mutableStateOf<GyenFile?>(null) }
    var activeTab by remember { mutableStateOf(GyenTab.Home) }

    Box(modifier = modifier.fillMaxSize().background(GyenBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Topbar (56px) - Full width search bar (no logo in topbar)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left of search: G mark (small, 24px)
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .background(GyenAccent, shape = RoundedCornerShape(5.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("G", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.width(10.dp))

                // Search Bar Box
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp)
                        .background(GyenCard, shape = RoundedCornerShape(18.dp))
                        .border(1.dp, GyenBorder, shape = RoundedCornerShape(18.dp))
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = GyenTextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Search in Gyenbox...", color = GyenTextMuted, fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                // Right of search: avatar circle
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(GyenAccent.copy(alpha = 0.15f), shape = CircleShape)
                        .border(1.dp, GyenAccent, shape = CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("E", color = GyenAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Outer scroll for Home Sections
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                // WELCOME ROW (below topbar, padding 16px)
                item {
                    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text(
                            text = "Good morning, Ethan",
                            color = GyenTextLight,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "5.8 GB of 10 GB used",
                                color = GyenTextMuted,
                                fontSize = 12.sp
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            // Mini progress bar: 120px wide (approx 120dp), 3px
                            Box(
                                modifier = Modifier
                                    .width(120.dp)
                                    .height(3.dp)
                                    .background(GyenBorder, shape = RoundedCornerShape(1.5.dp))
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.58f)
                                        .fillMaxHeight()
                                        .background(GyenAccent, shape = RoundedCornerShape(1.5.dp))
                                )
                            }
                        }
                    }
                }

                // SECTION 1: "RECENT" label + "See all" link
                item {
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "RECENT",
                                fontSize = 11.sp,
                                color = GyenTextMuted,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "See all",
                                color = Color(0xFFA99FF8),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.clickable {
                                    Toast.makeText(context, "See all clicked", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Horizontal scroll row: single row, cards 120x120px, 3 visible, 4th partial
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Only non-folder items (Recent files)
                            val recentFiles = viewModel.files.filter { !it.isFolder }
                            recentFiles.forEach { file ->
                                Card(
                                    modifier = Modifier
                                        .width(120.dp)
                                        .height(120.dp)
                                        .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                                        .combinedClickable(
                                            onClick = {
                                                Toast.makeText(context, "Opened recent ${file.name}", Toast.LENGTH_SHORT).show()
                                            },
                                            onLongClick = {
                                                contextMenuFile = file
                                            }
                                        ),
                                    colors = CardDefaults.cardColors(containerColor = GyenCard)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize().padding(10.dp),
                                        verticalArrangement = Arrangement.SpaceBetween,
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        // Small icon top-center
                                        GyenFileIcon(type = file.type, color = file.iconColor, modifier = Modifier.size(32.dp))
                                        
                                        // Name bottom truncated
                                        Text(
                                            text = file.name,
                                            style = GyenFilenameStyle,
                                            fontSize = 11.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // SECTION 2: "FOLDERS" label
                item {
                    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text(
                            text = "FOLDERS",
                            fontSize = 11.sp,
                            color = GyenTextMuted,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // 2-column grid, 2 folders only
                        val folders = viewModel.files.filter { it.isFolder }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            folders.take(2).forEach { folder ->
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(100.dp)
                                        .background(GyenCard, shape = RoundedCornerShape(8.dp))
                                        .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                                        .combinedClickable(
                                            onClick = {
                                                Toast.makeText(context, "Opened folder ${folder.name}", Toast.LENGTH_SHORT).show()
                                            },
                                            onLongClick = {
                                                contextMenuFile = folder
                                            }
                                        )
                                        .padding(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        // Icon left-aligned at 28px
                                        GyenFileIcon(type = "Folder", color = folder.iconColor, modifier = Modifier.size(28.dp))

                                        // Name + meta below
                                        Column {
                                            Text(
                                                text = folder.name,
                                                style = GyenFilenameStyle,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = "${folder.itemCount} files · ${folder.size}",
                                                style = GyenMetaStyle,
                                                fontSize = 9.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // SECTION 3: "ALL FILES" label
                item {
                    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text(
                            text = "ALL FILES",
                            fontSize = 11.sp,
                            color = GyenTextMuted,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // 2-column grid, remaining files (we can just show the files here in rows or grid, let's do 2-column grid height 130px, icon centered)
                        val nonFolders = viewModel.files.filter { !it.isFolder }
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Lay them out in 2-column chunks
                            nonFolders.chunked(2).forEach { rowItems ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    rowItems.forEach { file ->
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(130.dp)
                                                .background(GyenCard, shape = RoundedCornerShape(8.dp))
                                                .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                                                .combinedClickable(
                                                    onClick = {
                                                        Toast.makeText(context, "Clicked ${file.name}", Toast.LENGTH_SHORT).show()
                                                    },
                                                    onLongClick = {
                                                        contextMenuFile = file
                                                    }
                                                )
                                                .padding(12.dp)
                                        ) {
                                            Column(
                                                modifier = Modifier.fillMaxSize(),
                                                verticalArrangement = Arrangement.SpaceBetween,
                                                horizontalAlignment = Alignment.CenterHorizontally
                                            ) {
                                                Box(
                                                    modifier = Modifier.weight(1f),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    GyenFileIcon(type = file.type, color = file.iconColor, modifier = Modifier.size(36.dp))
                                                }
                                                Column(modifier = Modifier.fillMaxWidth()) {
                                                    Text(
                                                        text = file.name,
                                                        style = GyenFilenameStyle,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                    Text(
                                                        text = file.size,
                                                        style = GyenSizeStyle,
                                                        fontSize = 10.sp
                                                    )
                                                }
                                            }
                                        }
                                    }
                                    // Empty spacer if odd number of items
                                    if (rowItems.size < 2) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Floating menu button for dialog creation (in home we can place a floating FAB)
        FloatingActionButton(
            onClick = onAddClick,
            containerColor = GyenAccent,
            contentColor = Color.White,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 76.dp, end = 16.dp)
                .size(48.dp)
                .semantics { testTag = "fab_c" }
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Item")
        }

        // Floating context menu
        contextMenuFile?.let { file ->
            GyenContextMenu(
                expanded = true,
                onDismiss = { contextMenuFile = null },
                onDownload = {
                    Toast.makeText(context, "Downloading ${file.name}...", Toast.LENGTH_SHORT).show()
                },
                onRename = { fileToRename = file },
                onDelete = { viewModel.deleteFile(file.id) },
                anchorPosition = IntOffset(100, 350)
            )
        }

        // Rename file dialog
        fileToRename?.let { file ->
            RenameFileDialog(
                file = file,
                onDismiss = { fileToRename = null },
                onConfirm = { newName ->
                    viewModel.renameFile(file.id, newName)
                    fileToRename = null
                }
            )
        }

        // Bottom nav: 4 tabs, Home active
        GyenBottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// VARIANT D — "Compact Dense"
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VariantCompactDense(
    viewModel: GyenViewModel,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var contextMenuFile by remember { mutableStateOf<GyenFile?>(null) }
    var fileToRename by remember { mutableStateOf<GyenFile?>(null) }
    var activeTab by remember { mutableStateOf(GyenTab.Files) }
    var activeFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Folders", "Images", "Documents", "Videos")

    Box(modifier = modifier.fillMaxSize().background(GyenBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Topbar (48px, shorter)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Left: G mark (24px)
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .background(GyenAccent, shape = RoundedCornerShape(5.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("G", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                // Center: "My Files" (Inter 600 15px #EEEEF8) — NO search bar in topbar
                Text(
                    text = "My Files",
                    color = GyenTextLight,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )

                // Right: [search icon 20px] [⋮ more icon 20px]
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = GyenTextLight,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable {
                                Toast.makeText(context, "Search click", Toast.LENGTH_SHORT).show()
                            }
                    )
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "More options",
                        tint = GyenTextLight,
                        modifier = Modifier
                            .size(20.dp)
                            .clickable {
                                onAddClick() // Map the more option to adding items as well
                            }
                    )
                }
            }

            // FILTER PILLS ROW (below topbar, horizontal scroll, padding 8px 12px)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filters.forEach { filter ->
                    val isActive = activeFilter == filter
                    val pColor = if (isActive) GyenAccent else Color.Transparent
                    val tColor = if (isActive) Color.White else GyenTextMuted

                    Row(
                        modifier = Modifier
                            .height(28.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(pColor)
                            .border(1.dp, GyenBorder, shape = RoundedCornerShape(14.dp))
                            .clickable { activeFilter = filter }
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = filter,
                            fontSize = 11.sp,
                            color = tColor,
                            fontWeight = FontWeight.Medium
                        )
                        if (filter == "All") {
                            Spacer(modifier = Modifier.width(4.dp))
                            Box(
                                modifier = Modifier
                                    .size(5.dp)
                                    .background(if (isActive) Color.White else GyenAccent, shape = CircleShape)
                            )
                        }
                    }
                }
            }

            // STORAGE STRIP (2 lines, padding 8px 12px)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp)
            ) {
                // Line 1: color segments bar (3px, full width, 3 colors)
                GyenStorageBar(used = 5.8, total = 10.0, segmented = true)
                Spacer(modifier = Modifier.height(4.dp))
                // Line 2: "● Images 3.2GB  ● Docs 1.8GB  ● PDFs 0.8GB"
                Text(
                    text = "● Images 3.2GB   ● Docs 1.8GB   ● PDFs 0.8GB",
                    fontSize = 10.sp,
                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                    color = GyenTextMuted
                )
            }

            // FILTERING DATA
            val filteredFiles = when (activeFilter) {
                "Folders" -> viewModel.files.filter { it.isFolder }
                "Images" -> viewModel.files.filter { it.type == "PNG" }
                "Documents" -> viewModel.files.filter { it.type == "PDF" || it.type == "DOCX" || it.type == "XLSX" }
                "Videos" -> viewModel.files.filter { it.type == "MP4" }
                else -> viewModel.files
            }

            // SORT ROW (below grid but styled before)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Sort by: Modified ▾",
                    fontSize = 11.sp,
                    color = GyenTextMuted
                )
                Text(
                    text = "${filteredFiles.size} items",
                    fontSize = 11.sp,
                    color = GyenTextMuted
                )
            }

            // FILE GRID (3 COLUMNS — not 2)
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(start = 10.dp, top = 0.dp, end = 10.dp, bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(filteredFiles) { file ->
                    // Card height: 110px, solid card bg #13131F
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(110.dp)
                            .background(GyenCard, shape = RoundedCornerShape(8.dp))
                            .border(1.dp, GyenBorder, shape = RoundedCornerShape(8.dp))
                            .combinedClickable(
                                onClick = {
                                    Toast.makeText(context, "Clicked ${file.name}", Toast.LENGTH_SHORT).show()
                                },
                                onLongClick = {
                                    contextMenuFile = file
                                }
                            )
                            .padding(8.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Icon: 28px centered in top 60% of card
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(0.6f),
                                contentAlignment = Alignment.Center
                            ) {
                                GyenFileIcon(type = file.type, color = file.iconColor, modifier = Modifier.size(28.dp))
                            }

                            // Name + Size
                            Column(
                                modifier = Modifier.fillMaxWidth().weight(0.4f),
                                horizontalAlignment = Alignment.Start,
                                verticalArrangement = Arrangement.Bottom
                            ) {
                                // Name: 10px Inter 500 #EEEEF8, max 1 line truncated
                                Text(
                                    text = file.name,
                                    style = GyenDenseFilenameStyle,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(1.dp))
                                // Size: 9px JetBrains Mono #4A4A6A
                                Text(
                                    text = if (file.isFolder) "${file.itemCount} items" else file.size,
                                    style = GyenDenseSizeStyle,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }

        // Floating context menu
        contextMenuFile?.let { file ->
            GyenContextMenu(
                expanded = true,
                onDismiss = { contextMenuFile = null },
                onDownload = {
                    Toast.makeText(context, "Downloading ${file.name}...", Toast.LENGTH_SHORT).show()
                },
                onRename = { fileToRename = file },
                onDelete = { viewModel.deleteFile(file.id) },
                anchorPosition = IntOffset(100, 250)
            )
        }

        // Rename file dialog
        fileToRename?.let { file ->
            RenameFileDialog(
                file = file,
                onDismiss = { fileToRename = null },
                onConfirm = { newName ->
                    viewModel.renameFile(file.id, newName)
                    fileToRename = null
                }
            )
        }

        // Bottom nav: 4 tabs, Files active, height 56px (shorter)
        GyenBottomNav(
            activeTab = activeTab,
            onTabSelected = { activeTab = it },
            modifier = Modifier.align(Alignment.BottomCenter),
            height = 56
        )
    }
}
