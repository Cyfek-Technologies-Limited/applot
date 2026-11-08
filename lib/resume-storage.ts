import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function key() {
  const secret = process.env.RESUME_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('Set a stable RESUME_ENCRYPTION_KEY or BETTER_AUTH_SECRET of at least 32 characters before storing CV attachments.')
  return createHash('sha256').update(secret).digest()
}

export function encryptResume(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  return new Uint8Array(Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]))
}

export function decryptResume(data: Uint8Array): Buffer {
  const buffer = Buffer.from(data)
  const decipher = createDecipheriv('aes-256-gcm', key(), buffer.subarray(0, 12))
  decipher.setAuthTag(buffer.subarray(-16))
  return Buffer.concat([decipher.update(buffer.subarray(12, -16)), decipher.final()])
}
