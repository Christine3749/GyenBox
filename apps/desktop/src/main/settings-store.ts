import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type { DesktopSettings } from "./types.js"

type SettingsInput = Partial<DesktopSettings>

export class SettingsStore {
  private current: DesktopSettings | null = null

  constructor(
    private readonly filePath: string,
    private readonly defaults: DesktopSettings,
  ) {}

  async load() {
    if (this.current) return this.current

    try {
      const raw = await readFile(this.filePath, "utf8")
      this.current = { ...this.defaults, ...JSON.parse(raw) } as DesktopSettings
    } catch {
      this.current = this.defaults
      await this.save()
    }

    return this.current
  }

  get() {
    if (!this.current) return this.defaults
    return this.current
  }

  async update(input: SettingsInput) {
    this.current = {
      ...this.get(),
      ...input,
      apiBaseUrl: normalizeBaseUrl(input.apiBaseUrl ?? this.get().apiBaseUrl),
    }
    await this.save()
    return this.current
  }

  async save() {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(this.get(), null, 2)}\n`, "utf8")
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "") || "https://gyenbox.com"
}
