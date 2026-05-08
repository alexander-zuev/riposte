import { CredentialEncryptionError } from '@riposte/core'
import { Result } from 'better-result'

const AES_GCM_ALGORITHM = 'AES-GCM'
const AES_GCM_IV_BYTES = 12

export type EncryptedCredential = {
  ciphertext: string
  iv: string
  keyVersion: string
}

export type CredentialEncryptionConfig = {
  currentKeyVersion: string
  keys: Record<string, string | undefined>
}

export interface ICredentialEncryptionService {
  encrypt: (plaintext: unknown) => Promise<Result<EncryptedCredential, CredentialEncryptionError>>
  decrypt: <T>(encrypted: EncryptedCredential) => Promise<Result<T, CredentialEncryptionError>>
}

export class CredentialEncryptionService implements ICredentialEncryptionService {
  constructor(private readonly config: CredentialEncryptionConfig) {}

  async encrypt(
    plaintext: unknown,
  ): Promise<Result<EncryptedCredential, CredentialEncryptionError>> {
    return Result.tryPromise({
      try: async () => {
        const keyVersion = this.normalizeKeyVersion(this.config.currentKeyVersion)
        const key = await this.importCredentialKey(this.resolveKey(keyVersion))
        const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES))
        const encoded = new TextEncoder().encode(JSON.stringify(plaintext))
        const ciphertext = await crypto.subtle.encrypt(
          { name: AES_GCM_ALGORITHM, iv },
          key,
          encoded,
        )

        return {
          ciphertext: this.bytesToBase64(new Uint8Array(ciphertext)),
          iv: this.bytesToBase64(iv),
          keyVersion,
        }
      },
      catch: (cause) => new CredentialEncryptionError({ operation: 'encrypt', cause }),
    })
  }

  async decrypt<T>(encrypted: EncryptedCredential): Promise<Result<T, CredentialEncryptionError>> {
    return Result.tryPromise({
      try: async () => {
        const keyVersion = this.normalizeKeyVersion(encrypted.keyVersion)
        const key = await this.importCredentialKey(this.resolveKey(keyVersion))
        const plaintext = await crypto.subtle.decrypt(
          { name: AES_GCM_ALGORITHM, iv: this.base64ToBytes(encrypted.iv) },
          key,
          this.base64ToBytes(encrypted.ciphertext),
        )

        return JSON.parse(new TextDecoder().decode(plaintext)) as T
      },
      catch: (cause) => new CredentialEncryptionError({ operation: 'decrypt', cause }),
    })
  }

  private resolveKey(keyVersion: string): string {
    const key = this.config.keys[keyVersion]
    if (!key) throw new Error(`Missing credential encryption key for version ${keyVersion}`)
    return key
  }

  private async importCredentialKey(base64Key: string): Promise<CryptoKey> {
    const raw = this.base64ToBytes(base64Key)
    if (raw.byteLength !== 32) {
      throw new Error('Credential encryption key must be 32 bytes encoded as base64')
    }

    return await crypto.subtle.importKey('raw', raw, AES_GCM_ALGORITHM, false, [
      'encrypt',
      'decrypt',
    ])
  }

  private normalizeKeyVersion(keyVersion: string): string {
    const normalized = keyVersion.trim().toLowerCase()
    if (!/^v\d+$/.test(normalized)) {
      throw new Error(`Invalid credential encryption key version: ${keyVersion}`)
    }
    return normalized
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  }

  private base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64)
    const bytes = new Uint8Array(new ArrayBuffer(binary.length))
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  }
}
