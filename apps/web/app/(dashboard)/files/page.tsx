import { FileBrowser } from "@/components/files/file-browser"
import { mockFiles } from "@/lib/mock-data"

export default function FilesPage() {
  return <FileBrowser initialFiles={mockFiles} title="My files" />
}
