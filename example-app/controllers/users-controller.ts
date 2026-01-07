import { isNil } from "lodash"

import { User } from "@example-app/models/index.js"
import { UserPolicies } from "@example-app/policies/index.js"
import { ApplicationController } from "@example-app/controllers/index.js"
import { type BaseController } from "express-light-rail"

export class UsersController extends ApplicationController<User> {
  // Rails-style before action filters
  static beforeAction = [
    {
      method: "loadUser",
      only: ["show", "update", "destroy"] as BaseController.Actions[],
    },
  ]

  private user?: User | null

  async index() {
    try {
      const where = this.buildWhere()
      const scopes = this.buildFilterScopes()
      const order = this.buildOrder()
      const scopedUsers = UserPolicies.applyScope(scopes, this.currentUser)

      const totalCount = await scopedUsers.count({ where })
      const users = await scopedUsers.findAll({
        where,
        order,
        limit: this.pagination.limit,
        offset: this.pagination.offset,
      })
      // Use the new render() helper with implicit 'ok' status
      return this.render({
        users,
        totalCount,
      })
    } catch (error) {
      console.error(`Error fetching users: ${error}`, { error })
      // Use the new render() helper with 'bad_request' status
      return this.render(
        {
          message: `Error fetching users: ${error}`,
        },
        "bad_request"
      )
    }
  }

  async show() {
    try {
      // user is loaded via beforeAction filter
      if (isNil(this.user)) {
        // Use the new render() helper with 'not_found' status
        return this.render({ message: "User not found" }, "not_found")
      }

      const policy = this.buildPolicy(this.user)
      if (!policy.show()) {
        // Use the new render() helper with 'forbidden' status
        return this.render(
          { message: "You are not authorized to view this user" },
          "forbidden"
        )
      }

      // Use the new render() helper with implicit 'ok' status
      return this.render({
        user: this.user,
        policy,
      })
    } catch (error) {
      console.error(`Error fetching user: ${error}`, { error })
      return this.render(
        {
          message: `Error fetching user: ${error}`,
        },
        "bad_request"
      )
    }
  }

  async create() {
    try {
      const policy = this.buildPolicy()
      if (!policy.create()) {
        return this.render(
          { message: "You are not authorized to create users" },
          "forbidden"
        )
      }

      const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
      const user = await User.create(permittedAttributes)
      // Use the new render() helper with 'created' status
      return this.render({ user }, "created")
    } catch (error) {
      console.error(`Error creating user: ${error}`, { error })
      return this.render(
        {
          message: `Error creating user: ${error}`,
        },
        "unprocessable_entity"
      )
    }
  }

  async update() {
    try {
      // user is loaded via beforeAction filter
      if (isNil(this.user)) {
        return this.render({ message: "User not found" }, "not_found")
      }

      const policy = this.buildPolicy(this.user)
      if (!policy.update()) {
        return this.render(
          { message: "You are not authorized to update this user" },
          "forbidden"
        )
      }

      const permittedAttributes = policy.permitAttributes(this.request.body)
      await this.user.update(permittedAttributes)
      return this.render({ user: this.user })
    } catch (error) {
      console.error(`Error updating user: ${error}`, { error })
      return this.render(
        {
          message: `Error updating user: ${error}`,
        },
        "unprocessable_entity"
      )
    }
  }

  async destroy() {
    try {
      // user is loaded via beforeAction filter
      if (isNil(this.user)) {
        return this.render({ message: "User not found" }, "not_found")
      }

      const policy = this.buildPolicy(this.user)
      if (!policy.destroy()) {
        return this.render(
          { message: "You are not authorized to delete this user" },
          "forbidden"
        )
      }

      await this.user.destroy()
      // Use the new head() helper with 'no_content' status
      return this.head("no_content")
    } catch (error) {
      console.error(`Error deleting user: ${error}`, { error })
      return this.render(
        {
          message: `Error deleting user: ${error}`,
        },
        "unprocessable_entity"
      )
    }
  }

  // Filter methods
  // @ts-expect-error - Used dynamically in beforeAction filter
  private async loadUser(): Promise<void> {
    this.user = await User.findByPk(this.params.userId)
  }

  // Helper methods
  private buildPolicy(user: User = User.build()) {
    return new UserPolicies(this.currentUser, user)
  }
}

export default UsersController
