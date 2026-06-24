import { FileBrowser } from "@/components/files/file-browser"
import { mockFiles } from "@/lib/mock-data"

export default function SearchPage() {
  return (
    <FileBrowser
      initialFiles={mockFiles}
      title="Search"
      description="Global search foundation for names, tags, contents, owners, dates, and shared status."
      searchFirst
    />
  )
}
