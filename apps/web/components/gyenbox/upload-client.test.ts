import { afterEach, describe, expect, it, vi } from "vitest"

import { uploadFileDirectToStorage } from "./upload-client"

describe("uploadFileDirectToStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("presigns, uploads directly to storage, then completes metadata", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })

      if (url === "/api/upload/presign") {
        return Response.json({
          ok: true,
          data: {
            fileId: null,
            storageProvider: "gcs",
            bucket: "gyenbox-test",
            storageKey: "users/user-1/test.txt",
            uploadUrl: "https://storage.googleapis.com/signed-upload",
            method: "PUT",
            headers: {
              "Content-Type": "text/plain",
              "x-goog-meta-owner": "user-1",
              "x-goog-meta-checksum": "from-server",
            },
            expiresIn: 900,
          },
        })
      }

      if (url === "https://storage.googleapis.com/signed-upload") {
        return new Response(null, { status: 200 })
      }

      if (url === "/api/upload/complete") {
        return Response.json({
          ok: true,
          data: {
            file: {
              id: "file-1",
              name: "test.txt",
              type: "txt",
              size: "11 B",
              sizeBytes: 11,
              modifiedAt: "2026-06-30T00:00:00.000Z",
              createdAt: "2026-06-30T00:00:00.000Z",
              starred: false,
              shared: false,
              parentFolderId: "folder-1",
              isTrash: false,
              owner: {
                name: "Ethan",
                avatar: "ET",
                email: "ethan@example.com",
              },
            },
          },
        })
      }

      return Response.json({ ok: false, error: { message: "unexpected request" } }, { status: 500 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["hello world"], "test.txt", { type: "text/plain" })
    const result = await uploadFileDirectToStorage({
      file,
      folderId: "folder-1",
      authHeaders: { Authorization: "Bearer token" },
    })

    expect(result.id).toBe("file-1")
    expect(calls.map((call) => call.url)).toEqual([
      "/api/upload/presign",
      "https://storage.googleapis.com/signed-upload",
      "/api/upload/complete",
    ])
    expect(calls.some((call) => call.url === "/api/upload")).toBe(false)

    const presignBody = JSON.parse(String(calls[0].init?.body))
    expect(presignBody).toMatchObject({
      name: "test.txt",
      size: 11,
      mimeType: "text/plain",
      folderId: "folder-1",
    })
    expect(presignBody.checksum).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9")

    const uploadHeaders = new Headers(calls[1].init?.headers)
    expect(calls[1].init?.method).toBe("PUT")
    expect(calls[1].init?.body).toBe(file)
    expect(uploadHeaders.get("x-goog-meta-owner")).toBe("user-1")

    const completeBody = JSON.parse(String(calls[2].init?.body))
    expect(completeBody).toMatchObject({
      fileId: null,
      storageKey: "users/user-1/test.txt",
      name: "test.txt",
      size: 11,
      mimeType: "text/plain",
      checksum: presignBody.checksum,
      folderId: "folder-1",
    })
  })
})
