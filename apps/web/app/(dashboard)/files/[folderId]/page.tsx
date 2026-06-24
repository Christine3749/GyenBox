import { FileBrowser } from "@/components/files/file-browser"
import { mockFiles } from "@/lib/mock-data"

type FolderPageProps = {
  params: {
    folderId: string
  }
}

export default function FolderPage({ params }: FolderPageProps) {
  return <FileBrowser initialFiles={mockFiles} title={`Folder ${params.folderId}`} />
}
