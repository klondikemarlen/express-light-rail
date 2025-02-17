import { isNil } from "lodash"

import { User } from "@example-app/models/index.js"
import { UserPolicies } from "@example-app/policies/index.js"
import { ApplicationController } from "@example-app/controllers/index.js"

export class UsersController extends ApplicationController<User> {
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
      return this.response.json({
        users,
        totalCount,
      })
    } catch (error) {
      console.error(`Error fetching users: ${error}`, { error })
      return this.response.status(400).json({
        message: `Error fetching users: ${error}`,
      })
    }
  }

  async show() {
    try {
      const user = await this.loadUser()
      if (isNil(user)) {
        return this.response.status(404).json({
          message: "User not found",
        })
      }

      const policy = this.buildPolicy(user)
      if (!policy.show()) {
        return this.response.status(403).json({
          message: "You are not authorized to view this user",
        })
      }

      return this.response.json({
        user,
        policy,
      })
    } catch (error) {
      console.error(`Error fetching user: ${error}`, { error })
      return this.response.status(400).json({
        message: `Error fetching user: ${error}`,
      })
    }
  }

  async create() {
    try {
      const policy = this.buildPolicy()
      if (!policy.create()) {
        return this.response.status(403).json({
          message: "You are not authorized to create users",
        })
      }

      const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
      const user = await User.create(permittedAttributes)
      return this.response.status(201).json({
        user,
      })
    } catch (error) {
      console.error(`Error creating user: ${error}`, { error })
      return this.response.status(422).json({
        message: `Error creating user: ${error}`,
      })
    }
  }

  async update() {
    try {
      const user = await this.loadUser()
      if (isNil(user)) {
        return this.response.status(404).json({
          message: "User not found",
        })
      }

      const policy = this.buildPolicy(user)
      if (!policy.update()) {
        return this.response.status(403).json({
          message: "You are not authorized to update this user",
        })
      }

      const permittedAttributes = policy.permitAttributes(this.request.body)
      await user.update(permittedAttributes)
      return this.response.json({
        user,
      })
    } catch (error) {
      console.error(`Error updating user: ${error}`, { error })
      return this.response.status(422).json({
        message: `Error updating user: ${error}`,
      })
    }
  }

  async destroy() {
    try {
      const user = await this.loadUser()
      if (isNil(user)) {
        return this.response.status(404).json({
          message: "User not found",
        })
      }

      const policy = this.buildPolicy(user)
      if (!policy.destroy()) {
        return this.response.status(403).json({
          message: "You are not authorized to delete this user",
        })
      }

      await user.destroy()
      return this.response.status(204).send()
    } catch (error) {
      console.error(`Error deleting user: ${error}`, { error })
      return this.response.status(422).json({
        message: `Error deleting user: ${error}`,
      })
    }
  }

  private async loadUser() {
    return User.findByPk(this.params.userId)
  }

  private buildPolicy(user: User = User.build()) {
    return new UserPolicies(this.currentUser, user)
  }
}

export default UsersController
