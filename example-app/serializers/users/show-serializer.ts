import { BaseSerializer } from "express-light-rail"

import { type User } from "@example-app/models/index.js"

export type UserAsShow = {
  id: number
  username: string
  name: string
}

export class ShowSerializer extends BaseSerializer<User, UserAsShow> {
  perform(): UserAsShow {
    const { id, username, name } = this.record

    return {
      id,
      username,
      name,
    }
  }
}
