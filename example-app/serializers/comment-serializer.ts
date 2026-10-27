import { BaseSerializer } from "express-light-rail"

import { type Comment } from "@example-app/models/index.js"

export type CommentAsShow = {
  id: number
  body: string
  authorId: number
  threadId: number
}

export class CommentSerializer extends BaseSerializer<Comment, CommentAsShow> {
  perform(): CommentAsShow {
    const { id, body, authorId, threadId } = this.record
    return {
      id,
      body,
      authorId,
      threadId,
    }
  }
}
