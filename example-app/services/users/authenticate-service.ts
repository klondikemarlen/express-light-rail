import { BaseApiError, BaseService } from "express-light-rail"

import { User } from "@example-app/models/user.js"

export type AuthenticationCredentials = {
  username: unknown
  password: unknown
}

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
    const candidate = user ?? User.build()
    const authenticatedUser = await candidate.authenticate(password)

    if (!user || !authenticatedUser) {
      throw new BaseApiError("unauthorized", "Invalid username or password", {}, 401)
    }

    return user
  }
}
