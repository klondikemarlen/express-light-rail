import { BaseApiError, BaseService } from "express-light-rail"
import { Buffer } from "node:buffer"

import { User } from "@example-app/models/user.js"
import { verifyPassword } from "@example-app/utils/password.js"

export type AuthenticationCredentials = {
  username: unknown
  password: unknown
}

const DUMMY_SALT = Buffer.alloc(16).toString("base64url")
const DUMMY_KEY = Buffer.alloc(64).toString("base64url")
const DUMMY_PASSWORD_HASH = `scrypt$v1$${DUMMY_SALT}$${DUMMY_KEY}`

export class AuthenticateService extends BaseService<Promise<User>> {
  constructor(private readonly credentials: AuthenticationCredentials) {
    super()
  }

  async perform(): Promise<User> {
    const { username, password } = this.credentials
    if (
      typeof username !== "string" ||
      username.trim() === "" ||
      typeof password !== "string" ||
      password === ""
    ) {
      throw new BaseApiError("invalid_input", "Username and password are required", {}, 400)
    }

    const user = await User.findOne({
      where: {
        username,
      },
    })
    const passwordHash = user?.passwordHash || DUMMY_PASSWORD_HASH
    const passwordMatches = await verifyPassword(password, passwordHash)

    if (!user || !user.passwordHash || !passwordMatches) {
      throw new BaseApiError("unauthorized", "Invalid username or password", {}, 401)
    }

    return user
  }
}
