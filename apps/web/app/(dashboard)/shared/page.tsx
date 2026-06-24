import { FileBrowser } from "@/components/files/file-browser"
import { mockFiles } from "@/lib/mock-data"

export default function SharedPage() {
  return (
    <FileBrowser
      initialFiles={mockFiles.filter((file) => file.isShared)}
      title="Shared with me"
      description="Files and folders where another owner granted access."
    />
  )
}
