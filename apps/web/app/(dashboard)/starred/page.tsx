import { FileBrowser } from "@/components/files/file-browser"
import { mockFiles } from "@/lib/mock-data"

export default function StarredPage() {
  return (
    <FileBrowser
      initialFiles={mockFiles.filter((file) => file.isStarred)}
      title="Starred"
      description="Pinned files, active contracts, and reference material."
    />
  )
}
