package com.example

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import com.example.ui.theme.*

// Data model representing storage items
data class GyenFile(
    val id: String,
    val name: String,
    val isFolder: Boolean,
    val itemCount: Int? = null,
    val size: String,
    val timeAgo: String,
    val type: String, // "Folder", "PNG", "PDF", "DOCX", "MP4", "XLSX"
    val iconColor: Color
)

// State management for Gyenbox
class GyenViewModel {
    // Initial file set as requested
    var files by mutableStateOf(
        listOf(
            GyenFile(
                id = "1",
                name = "Brand_Assets",
                isFolder = true,
                itemCount = 45,
                size = "4.8 GB",
                timeAgo = "2h ago",
                type = "Folder",
                iconColor = GyenFolder
            ),
            GyenFile(
                id = "2",
                name = "Project_Nexus",
                isFolder = true,
                itemCount = 12,
                size = "1.2 GB",
                timeAgo = "3d ago",
                type = "Folder",
                iconColor = GyenFolder
            ),
            GyenFile(
                id = "3",
                name = "Brand_Logo.png",
                isFolder = false,
                size = "2.1 MB",
                timeAgo = "2h ago",
                type = "PNG",
                iconColor = GyenPNG
            ),
            GyenFile(
                id = "4",
                name = "Contract_v4.pdf",
                isFolder = false,
                size = "14.8 MB",
                timeAgo = "Yesterday",
                type = "PDF",
                iconColor = GyenPDF
            ),
            GyenFile(
                id = "5",
                name = "Promo_Video.mp4",
                isFolder = false,
                size = "145 MB",
                timeAgo = "Monday",
                type = "MP4",
                iconColor = GyenMP4
            ),
            GyenFile(
                id = "6",
                name = "Q3_Report.xlsx",
                isFolder = false,
                size = "312 KB",
                timeAgo = "3d ago",
                type = "XLSX",
                iconColor = GyenXLSX
            )
        )
    )

    // Interactive functions
    fun deleteFile(id: String) {
        files = files.filter { it.id != id }
    }

    fun renameFile(id: String, newName: String) {
        files = files.map {
            if (it.id == id) {
                it.copy(name = newName)
            } else {
                it
            }
        }
    }

    fun addFile(name: String, isFolder: Boolean, type: String) {
        val color = when (type.uppercase()) {
            "PNG" -> GyenPNG
            "PDF" -> GyenPDF
            "MP4" -> GyenMP4
            "XLSX" -> GyenXLSX
            "DOCX" -> GyenDOCX
            else -> GyenFolder
        }
        val extension = if (isFolder) "" else ".${type.lowercase()}"
        val finalName = if (name.endsWith(extension)) name else "$name$extension"
        
        val newFile = GyenFile(
            id = System.currentTimeMillis().toString(),
            name = finalName,
            isFolder = isFolder,
            itemCount = if (isFolder) (5..50).random() else null,
            size = if (isFolder) "${(1..5).random()}.${(0..9).random()} GB" else "${(1..300).random()} MB",
            timeAgo = "Just now",
            type = if (isFolder) "Folder" else type.uppercase(),
            iconColor = color
        )
        files = listOf(newFile) + files
    }

    fun resetFiles() {
        files = listOf(
            GyenFile(
                id = "1",
                name = "Brand_Assets",
                isFolder = true,
                itemCount = 45,
                size = "4.8 GB",
                timeAgo = "2h ago",
                type = "Folder",
                iconColor = GyenFolder
            ),
            GyenFile(
                id = "2",
                name = "Project_Nexus",
                isFolder = true,
                itemCount = 12,
                size = "1.2 GB",
                timeAgo = "3d ago",
                type = "Folder",
                iconColor = GyenFolder
            ),
            GyenFile(
                id = "3",
                name = "Brand_Logo.png",
                isFolder = false,
                size = "2.1 MB",
                timeAgo = "2h ago",
                type = "PNG",
                iconColor = GyenPNG
            ),
            GyenFile(
                id = "4",
                name = "Contract_v4.pdf",
                isFolder = false,
                size = "14.8 MB",
                timeAgo = "Yesterday",
                type = "PDF",
                iconColor = GyenPDF
            ),
            GyenFile(
                id = "5",
                name = "Promo_Video.mp4",
                isFolder = false,
                size = "145 MB",
                timeAgo = "Monday",
                type = "MP4",
                iconColor = GyenMP4
            ),
            GyenFile(
                id = "6",
                name = "Q3_Report.xlsx",
                isFolder = false,
                size = "312 KB",
                timeAgo = "3d ago",
                type = "XLSX",
                iconColor = GyenXLSX
            )
        )
    }
}
