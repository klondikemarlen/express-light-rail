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
      const Users = await scopedUsers.findAll({
        where,
        order,
        limit: this.pagination.limit,
        offset: this.pagination.offset,
      })
      return this.response.json({
        Users,
        totalCount,
      })
    } catch (error) {
      console.error("Error fetching position actions" + error)
      return this.response.status(400).json({
        message: `Error fetching position actions: ${error}`,
      })
    }
  }

  async show() {
    try {
      const User = await this.loadUser()
      if (isNil(User)) {
        return this.response.status(404).json({
          message: "Position action not found",
        })
      }

      const policy = this.buildPolicy(User)
      if (!policy.show()) {
        return this.response.status(403).json({
          message: "You are not authorized to view this position action",
        })
      }

      return this.response.json({ User, policy })
    } catch (error) {
      console.error("Error fetching position action" + error)
      return this.response.status(400).json({
        message: `Error fetching position action: ${error}`,
      })
    }
  }

  async create() {
    try {
      const policy = this.buildPolicy()
      if (!policy.create()) {
        return this.response.status(403).json({
          message: "You are not authorized to create position actions",
        })
      }

      const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
      const User = await CreateService.perform(permittedAttributes)
      return this.response.status(201).json({ User })
    } catch (error) {
      console.error("Error creating position action" + error)
      return this.response.status(422).json({
        message: `Error creating position action: ${error}`,
      })
    }
  }

  async update() {
    try {
      const User = await this.loadUser()
      if (isNil(User)) {
        return this.response.status(404).json({
          message: "Position action not found",
        })
      }

      const policy = this.buildPolicy(User)
      if (!policy.update()) {
        return this.response.status(403).json({
          message: "You are not authorized to update this position action",
        })
      }

      const permittedAttributes = policy.permitAttributes(this.request.body)
      await User.update(permittedAttributes)
      return this.response.json({ User })
    } catch (error) {
      console.error("Error updating position action" + error)
      return this.response.status(422).json({
        message: `Error updating position action: ${error}`,
      })
    }
  }

  async destroy() {
    try {
      const User = await this.loadUser()
      if (isNil(User)) {
        return this.response.status(404).json({
          message: "User not found",
        })
      }

      const policy = this.buildPolicy(User)
      if (!policy.destroy()) {
        return this.response.status(403).json({
          message: "You are not authorized to delete this position action",
        })
      }

      await User.destroy()
      return this.response.status(204).send()
    } catch (error) {
      console.error("Error deleting position action" + error)
      return this.response.status(422).json({
        message: `Error deleting position action: ${error}`,
      })
    }
  }

  private async loadUser() {
    return User.findByPk(this.params.id)
  }

  private buildPolicy(User: User = User.build()) {
    return new UserPolicies(this.currentUser, User)
  }
}

export default UsersController
