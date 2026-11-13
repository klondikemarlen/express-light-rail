import { BaseSerializer } from "express-light-rail"

import { type Thread } from "@example-app/models/index.js"

export type ThreadAsShow = {
  id: number
  title: string
  body: string
  authorId: number
}

export class ShowSerializer extends BaseSerializer<Thread, ThreadAsShow> {
  perform(): ThreadAsShow {
    const { id, title, body, authorId } = this.record

    return {
      id,
      title,
      body,
      authorId,
    }
  }
}
