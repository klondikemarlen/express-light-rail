import { BaseApiError } from "express-light-rail"

import { ApplicationController } from "@example-app/controllers/application-controller.js"
import { Thread } from "@example-app/models/index.js"
import { ThreadPolicy } from "@example-app/policies/thread-policy.js"
import { ThreadSerializer } from "@example-app/serializers/thread-serializer.js"
import { CreateThreadService } from "@example-app/services/create-thread-service.js"
import { DestroyThreadService } from "@example-app/services/destroy-thread-service.js"
import { UpdateThreadService } from "@example-app/services/update-thread-service.js"

export class ThreadsController extends ApplicationController<Thread> {
  async index(): Promise<void> {
    const threads = await Thread.findAll({
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    this.response.json({
      threads: ThreadSerializer.perform(threads),
    })
  }

  async show(): Promise<void> {
    const thread = await this.findThread(this.params.threadId)
    new ThreadPolicy(this.currentUser, thread).authorize("show")
    this.response.json({
      thread: ThreadSerializer.perform(thread),
    })
  }

  async create(): Promise<void> {
    const policy = new ThreadPolicy(this.currentUser, Thread.build())
    policy.authorize("create")
    const attributes = policy.permitAttributesForCreate(this.request.body)
    const thread = await CreateThreadService.perform(this.currentUser, attributes)
    this.response.status(201).json({
      thread: ThreadSerializer.perform(thread),
    })
  }

  async update(): Promise<void> {
    const thread = await this.findThread(this.params.threadId)
    const policy = new ThreadPolicy(this.currentUser, thread)
    policy.authorize("update")
    const attributes = policy.permitAttributesForUpdate(this.request.body)
    const updatedThread = await UpdateThreadService.perform(thread, attributes)
    this.response.json({
      thread: ThreadSerializer.perform(updatedThread),
    })
  }

  async destroy(): Promise<void> {
    const thread = await this.findThread(this.params.threadId)
    new ThreadPolicy(this.currentUser, thread).authorize("destroy")
    await DestroyThreadService.perform(thread)
    this.response.status(204).end()
  }

  private async findThread(value: string | undefined): Promise<Thread> {
    const id = this.recordId(value)
    const thread = await Thread.findByPk(id)
    if (!thread) throw this.notFound()
    return thread
  }

  private recordId(value: string | undefined): number {
    if (!value || !/^[1-9]\d*$/.test(value)) throw this.notFound()

    const id = Number(value)
    if (!Number.isSafeInteger(id)) throw this.notFound()
    return id
  }

  private notFound(): BaseApiError {
    return new BaseApiError("not_found", "Thread not found", {}, 404)
  }
}
