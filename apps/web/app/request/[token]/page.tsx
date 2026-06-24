import { DropZone } from "@/components/upload/drop-zone"

type RequestPageProps = {
  params: {
    token: string
  }
}

export default function FileRequestPage({ params }: RequestPageProps) {
  return (
    <main className="territorial-grid min-h-screen bg-background p-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center gap-6">
        <div>
          <p className="text-xs uppercase text-muted-foreground">File request</p>
          <h1 className="mt-2 text-2xl font-semibold">Upload into a protected GyenBox folder</h1>
          <p className="mt-2 text-sm text-muted-foreground">Request token: {params.token.slice(0, 10)}</p>
        </div>
        <DropZone />
      </section>
    </main>
  )
}
