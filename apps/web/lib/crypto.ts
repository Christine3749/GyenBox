export async function encryptFile(
  file: File,
  passphrase: string,
): Promise<{
  encryptedBlob: Blob
  iv: string
  salt: string
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buffer = await file.arrayBuffer()
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buffer)

  return {
    encryptedBlob: new Blob([encrypted]),
    iv: encodeBase64(iv),
    salt: encodeBase64(salt),
  }
}

function encodeBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
}
