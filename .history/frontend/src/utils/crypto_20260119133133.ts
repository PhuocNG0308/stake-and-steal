/**
 * Cryptographic utilities for the game
 * NOTE: These are simplified implementations for development
 * Production should use proper crypto libraries
 */

/**
 * Generate a random 32-byte nonce
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(32)
  crypto.getRandomValues(nonce)
  return nonce
}

/**
 * Create a commitment hash for commit-reveal
 * commitment = SHA256(target || page || plot || nonce)
 */
export async function createCommitment(
  targetChain: string,
  targetPage: number,
  targetPlot: number,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const targetBytes = encoder.encode(targetChain)

  // Combine all data
  const data = new Uint8Array(targetBytes.length + 2 + nonce.length)
  data.set(targetBytes, 0)
  data[targetBytes.length] = targetPage
  data[targetBytes.length + 1] = targetPlot
  data.set(nonce, targetBytes.length + 2)

  // Hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}

/**
 * Simple XOR-based encryption (for development only!)
 * Production should use FHE or proper encryption
 */
export function encryptData(data: Uint8Array, key: Uint8Array): Uint8Array {
  const encrypted = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length]
  }
  return encrypted
}

/**
 * Simple XOR-based decryption
 */
export function decryptData(encrypted: Uint8Array, key: Uint8Array): Uint8Array {
  // XOR is symmetric, so decryption is same as encryption
  return encryptData(encrypted, key)
}

/**
 * Encrypt a balance value
 */
export function encryptBalance(balance: bigint, key: Uint8Array): Uint8Array {
  // Convert balance to bytes (big-endian)
  const balanceBytes = new Uint8Array(16)
  let val = balance
  for (let i = 15; i >= 0; i--) {
    balanceBytes[i] = Number(val & BigInt(0xff))
    val = val >> BigInt(8)
  }

  return encryptData(balanceBytes, key)
}

/**
 * Decrypt a balance value
 */
export function decryptBalance(encrypted: Uint8Array, key: Uint8Array): bigint {
  const decrypted = decryptData(encrypted, key)

  let balance = BigInt(0)
  for (let i = 0; i < decrypted.length; i++) {
    balance = (balance << BigInt(8)) | BigInt(decrypted[i])
  }

  return balance
}

/**
 * Generate a deterministic key from a seed
 */
export async function deriveKey(seed: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(seed)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}

/**
 * Convert a hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert Uint8Array to number array (for JSON serialization)
 */
export function bytesToArray(bytes: Uint8Array): number[] {
  return Array.from(bytes)
}

/**
 * Convert number array to Uint8Array
 */
export function arrayToBytes(arr: number[]): Uint8Array {
  return new Uint8Array(arr)
}

/**
 * Generate a random attack seed
 */
export function generateAttackSeed(): Uint8Array {
  return generateNonce()
}

/**
 * Create an encrypted name for registration
 */
export async function createEncryptedName(
  name: string,
  ownerKey: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const nameBytes = encoder.encode(name)

  // Pad to 32 bytes
  const padded = new Uint8Array(32)
  padded.set(nameBytes.slice(0, 32))

  return encryptData(padded, ownerKey)
}
