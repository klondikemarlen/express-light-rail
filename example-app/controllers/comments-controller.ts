import { BaseApiError } from "express-light-rail"

import { ApplicationController } from "@example-app/controllers/application-controller.js"
import { Comment, Thread } from "@example-app/models/index.js"
import { CommentPolicy } from "@example-app/policies/comment-policy.js"
import { CommentSerializer } from "@example-app/serializers/comment-serializer.js"
import { Comments } from "@example-app/services/index.js"

export class CommentsController extends ApplicationController<Comment> {
  async index(): Promise<void> {
    const thread = await this.findThread(this.params.threadId)
    const comments = await Comment.findAll({
      where: {
        threadId: thread.id,
      },
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    this.response.json({
      comments: CommentSerializer.perform(comments),
    })
  }

  async show(): Promise<void> {
    const comment = await this.findComment()
    new CommentPolicy(this.currentUser, comment).authorize("show")
    this.response.json({
      comment: CommentSerializer.perform(comment),
    })
  }

  async create(): Promise<void> {
    const thread = await this.findThread(this.params.threadId)
    const policy = new CommentPolicy(this.currentUser, Comment.build())
    policy.authorize("create")
    const attributes = policy.permitAttributesForCreate(this.request.body)
    const comment = await Comments.CreateService.perform(this.currentUser, thread, attributes)
    this.response.status(201).json({
      comment: CommentSerializer.perform(comment),
    })
  }

  async update(): Promise<void> {
    const comment = await this.findComment()
    const policy = new CommentPolicy(this.currentUser, comment)
    policy.authorize("update")
    const attributes = policy.permitAttributesForUpdate(this.request.body)
    const updatedComment = await Comments.UpdateService.perform(comment, attributes)
    this.response.json({
      comment: CommentSerializer.perform(updatedComment),
    })
  }

  async destroy(): Promise<void> {
    const comment = await this.findComment()
    new CommentPolicy(this.currentUser, comment).authorize("destroy")
    await comment.destroy()
    this.response.status(204).end()
  }

  private async findThread(value: string | undefined): Promise<Thread> {
    const id = this.recordId(value)
    const thread = await Thread.findByPk(id)
    if (!thread) throw this.notFound("Thread not found")
    return thread
  }

  private async findComment(): Promise<Comment> {
    const thread = await this.findThread(this.params.threadId)
    const commentId = this.recordId(this.params.commentId)
    const comment = await Comment.findOne({
      where: {
        id: commentId,
        threadId: thread.id,
      },
    })
    if (!comment) throw this.notFound("Comment not found")
    return comment
  }

  private recordId(value: string | undefined): number {
    if (!value || !/^[1-9]\d*$/.test(value)) throw this.notFound("Record not found")

    const id = Number(value)
    if (!Number.isSafeInteger(id)) throw this.notFound("Record not found")
    return id
  }

  private notFound(message: string): BaseApiError {
    return new BaseApiError("not_found", message, {}, 404)
  }
}
