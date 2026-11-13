import { BaseApiError, BaseService } from "express-light-rail"
import isNil from "lodash/isNil.js"

import { User } from "@example-app/models/user.js"

export class LoadCurrentUserService extends BaseService<Promise<User>> {
  constructor(private readonly subject: string | undefined) {
    super()
  }

  async perform(): Promise<User> {
    const userId = Number(this.subject)
    if (!Number.isSafeInteger(userId) || userId < 1 || String(userId) !== this.subject) {
      throw new BaseApiError("unauthorized", "Authentication required", {}, 401)
    }

    const user = await User.findByPk(userId)
    if (isNil(user)) throw new BaseApiError("unauthorized", "Authentication required", {}, 401)

    return user
  }
}
