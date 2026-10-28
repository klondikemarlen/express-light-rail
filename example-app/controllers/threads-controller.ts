import isNil from "lodash/isNil.js"
import { BaseApiError } from "express-light-rail"

import { Thread } from "@example-app/models/index.js"
import { ThreadsPolicy } from "@example-app/policies/index.js"
import { CreateService, UpdateService } from "@example-app/services/threads/index.js"
import { ShowSerializer } from "@example-app/serializers/threads/index.js"

import { ApplicationController } from "@example-app/controllers/application-controller.js"

export class ThreadsController extends ApplicationController<Thread> {
  async index() {
    const threads = await Thread.findAll({
      limit: this.pagination.limit,
      offset: this.pagination.offset,
      order: [["id", "ASC"]],
    })
    const serializedThreads = ShowSerializer.perform(threads)
    return this.response.json({
      threads: serializedThreads,
    })
  }

  async show() {
    const thread = await this.loadThread()
    if (isNil(thread)) {
      throw new BaseApiError("not_found", "Thread not found", {}, 404)
    }

    const policy = this.buildPolicy(thread)
    if (!policy.show()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const serializedThread = ShowSerializer.perform(thread)
    return this.response.json({
      thread: serializedThread,
    })
  }

  async create() {
    const policy = this.buildPolicy()
    if (!policy.create()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
    const thread = await CreateService.perform(permittedAttributes, this.currentUser)
    const serializedThread = ShowSerializer.perform(thread)
    return this.response.status(201).json({
      thread: serializedThread,
    })
  }

  async update() {
    const thread = await this.loadThread()
    if (isNil(thread)) {
      throw new BaseApiError("not_found", "Thread not found", {}, 404)
    }

    const policy = this.buildPolicy(thread)
    if (!policy.update()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    const permittedAttributes = policy.permitAttributesForUpdate(this.request.body)
    const updatedThread = await UpdateService.perform(thread, permittedAttributes)
    const serializedThread = ShowSerializer.perform(updatedThread)
    return this.response.json({
      thread: serializedThread,
    })
  }

  async destroy() {
    const thread = await this.loadThread()
    if (isNil(thread)) {
      throw new BaseApiError("not_found", "Thread not found", {}, 404)
    }

    const policy = this.buildPolicy(thread)
    if (!policy.destroy()) {
      throw new BaseApiError("forbidden", "Forbidden", {}, 403)
    }

    await thread.destroy()
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

  private buildPolicy(thread: Thread = Thread.build()) {
    return new ThreadsPolicy(this.currentUser, thread)
  }
}
