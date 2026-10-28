import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

const SALT_LENGTH = 16
const KEY_LENGTH = 64
const SALT_ENCODING = /^[A-Za-z0-9_-]{22}$/
const KEY_ENCODING = /^[A-Za-z0-9_-]{86}$/

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error)
      } else {
        resolve(key)
      }
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await deriveKey(password, salt)

  return `scrypt$v1$${salt.toString("base64url")}$${key.toString("base64url")}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, version, saltText, keyText, extra] = hash.split("$")
  if (
    algorithm !== "scrypt" ||
    version !== "v1" ||
    extra !== undefined ||
    !SALT_ENCODING.test(saltText ?? "") ||
    !KEY_ENCODING.test(keyText ?? "")
  ) {
    return false
  }

  const salt = Buffer.from(saltText, "base64url")
  const expectedKey = Buffer.from(keyText, "base64url")
  if (
    salt.length !== SALT_LENGTH ||
    expectedKey.length !== KEY_LENGTH ||
    salt.toString("base64url") !== saltText ||
    expectedKey.toString("base64url") !== keyText
  ) {
    return false
  }

  const actualKey = await deriveKey(password, salt)
  return timingSafeEqual(actualKey, expectedKey)
}
