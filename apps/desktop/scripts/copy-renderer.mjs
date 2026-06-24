import { copyFile, mkdir, readdir, rm } from "node:fs/promises"
import { join } from "node:path"

const source = join(process.cwd(), "src", "renderer")
const target = join(process.cwd(), "dist", "renderer")

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  await copyFile(join(source, entry.name), join(target, entry.name))
}
