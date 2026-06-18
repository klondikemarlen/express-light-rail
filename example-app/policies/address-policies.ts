import { PolicyFactory } from "express-light-rail"

import { Address, User } from "@example-app/models/index.js"

const AddressPolicy = PolicyFactory<Address, User>(Address)

export class AddressPolicies extends AddressPolicy {
  // TODO
}
