import isNil from "lodash/isNil.js"
import { BaseApiError } from "express-light-rail"

import { Comment, Thread } from "@example-app/models/index.js"
import { CommentsPolicy } from "@example-app/policies/index.js"
import { CreateService, UpdateService } from "@example-app/services/comments/index.js"
import { ShowSerializer } from "@example-app/serializers/comments/index.js"

import { ApplicationController } from "@example-app/controllers/application-controller.js"

export class CommentsController extends ApplicationController<Comment> {
  async index() {
    const thread = await this.loadThread()
    if (isNil(thread)) {
      throw new BaseApiError("not_found", "Thread not found", {}, 404)
    }

    const comments = await Comment.findAll({
      where: {
        threadId: thread.id,
      },
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    const serializedComments = ShowSerializer.perform(comments)
    return this.response.json({
      comments: serializedComments,
    })
  }

  async show() {
    const comment = await this.loadComment()
    if (isNil(comment)) {
      throw new BaseApiError("not_found", "Comment not found", {}, 404)
    }

    const policy = this.buildPolicy(comment)
    if (!policy.show()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const serializedComment = ShowSerializer.perform(comment)
    return this.response.json({
      comment: serializedComment,
    })
  }

  async create() {
    const thread = await this.loadThread()
    if (isNil(thread)) {
      throw new BaseApiError("not_found", "Thread not found", {}, 404)
    }

    const policy = this.buildPolicy()
    if (!policy.create()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
    const comment = await CreateService.perform(permittedAttributes, thread, this.currentUser)
    const serializedComment = ShowSerializer.perform(comment)
    return this.response.status(201).json({
      comment: serializedComment,
    })
  }

  async update() {
    const comment = await this.loadComment()
    if (isNil(comment)) {
      throw new BaseApiError("not_found", "Comment not found", {}, 404)
    }

    const policy = this.buildPolicy(comment)
    if (!policy.update()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const permittedAttributes = policy.permitAttributesForUpdate(this.request.body)
    const updatedComment = await UpdateService.perform(comment, permittedAttributes)
    const serializedComment = ShowSerializer.perform(updatedComment)
    return this.response.json({
      comment: serializedComment,
    })
  }

  async destroy() {
    const comment = await this.loadComment()
    if (isNil(comment)) {
      throw new BaseApiError("not_found", "Comment not found", {}, 404)
    }

    const policy = this.buildPolicy(comment)
    if (!policy.destroy()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    await comment.destroy()
    return this.response.status(204).send()
  }

  private loadThread() {
    const threadId = Number(this.params.threadId)
    if (
      !Number.isSafeInteger(threadId) ||
      threadId < 1 ||
      String(threadId) !== this.params.threadId
    ) {
      return null
    }

    return Thread.findByPk(threadId)
  }

  private loadComment() {
    const threadId = Number(this.params.threadId)
    if (
      !Number.isSafeInteger(threadId) ||
      threadId < 1 ||
      String(threadId) !== this.params.threadId
    ) {
      return null
    }

    const commentId = Number(this.params.commentId)
    if (
      !Number.isSafeInteger(commentId) ||
      commentId < 1 ||
      String(commentId) !== this.params.commentId
    ) {
      return null
    }

    return Comment.findOne({
      where: {
        id: commentId,
        threadId,
      },
    })
  }

  private buildPolicy(comment: Comment = Comment.build()) {
    return new CommentsPolicy(this.currentUser, comment)
  }
}
