declare module "node:sqlite" {
  export type SupportedValueType = string | number | bigint | null | Uint8Array

  export class StatementSync {
    run(...anonymousParameters: SupportedValueType[]): { changes: number; lastInsertRowid: number | bigint }
    get(...anonymousParameters: SupportedValueType[]): Record<string, unknown> | undefined
    all(...anonymousParameters: SupportedValueType[]): Array<Record<string, unknown>>
  }

  export class DatabaseSync {
    constructor(location: string)
    exec(sql: string): void
    prepare(sql: string): StatementSync
    close(): void
  }
}
