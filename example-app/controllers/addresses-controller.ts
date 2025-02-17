import { isNil } from "lodash"

import { Address } from "@example-app/models/index.js"
import { AddressPolicies } from "@example-app/policies/index.js"
import { ApplicationController } from "@example-app/controllers/index.js"

export class AddressesController extends ApplicationController<Address> {
  async index() {
    try {
      const where = this.buildWhere()
      const scopes = this.buildFilterScopes()
      const order = this.buildOrder()
      const scopedAddresses = AddressPolicies.applyScope(scopes, this.currentUser)

      const totalCount = await scopedAddresses.count({ where })
      const addresses = await scopedAddresses.findAll({
        where,
        order,
        limit: this.pagination.limit,
        offset: this.pagination.offset,
      })
      return this.response.json({
        addresses,
        totalCount,
      })
    } catch (error) {
      console.error(`Error fetching addresses: ${error}`)
      return this.response.status(400).json({
        message: `Error fetching addresses: ${error}`,
      })
    }
  }

  async show() {
    try {
      const address = await this.loadAddress()
      if (isNil(address)) {
        return this.response.status(404).json({
          message: "Address not found",
        })
      }

      const policy = this.buildPolicy(address)
      if (!policy.show()) {
        return this.response.status(403).json({
          message: "You are not authorized to view this address",
        })
      }

      return this.response.json({
        address,
        policy,
      })
    } catch (error) {
      console.error(`Error fetching address: ${error}`)
      return this.response.status(400).json({
        message: `Error fetching address: ${error}`,
      })
    }
  }

  async create() {
    try {
      const policy = this.buildPolicy()
      if (!policy.create()) {
        return this.response.status(403).json({
          message: "You are not authorized to create addresses",
        })
      }

      const permittedAttributes = policy.permitAttributesForCreate(this.request.body)
      const address = await Address.create(permittedAttributes)
      return this.response.status(201).json({
        address,
      })
    } catch (error) {
      console.error(`Error creating address: ${error}`)
      return this.response.status(422).json({
        message: `Error creating address: ${error}`,
      })
    }
  }

  async update() {
    try {
      const address = await this.loadAddress()
      if (isNil(address)) {
        return this.response.status(404).json({
          message: "Address not found",
        })
      }

      const policy = this.buildPolicy(address)
      if (!policy.update()) {
        return this.response.status(403).json({
          message: "You are not authorized to update this address",
        })
      }

      const permittedAttributes = policy.permitAttributes(this.request.body)
      await address.update(permittedAttributes)
      return this.response.json({
        address,
      })
    } catch (error) {
      console.error(`Error updating address: ${error}`)
      return this.response.status(422).json({
        message: `Error updating address: ${error}`,
      })
    }
  }

  async destroy() {
    try {
      const address = await this.loadAddress()
      if (isNil(address)) {
        return this.response.status(404).json({
          message: "Address not found",
        })
      }

      const policy = this.buildPolicy(address)
      if (!policy.destroy()) {
        return this.response.status(403).json({
          message: "You are not authorized to delete this address",
        })
      }

      await address.destroy()
      return this.response.status(204).send()
    } catch (error) {
      console.error(`Error deleting address: ${error}`)
      return this.response.status(422).json({
        message: `Error deleting address: ${error}`,
      })
    }
  }

  private async loadAddress() {
    return Address.findByPk(this.params.id)
  }

  private buildPolicy(address: Address = Address.build()) {
    return new AddressPolicies(this.currentUser, address)
  }
}

export default AddressesController
