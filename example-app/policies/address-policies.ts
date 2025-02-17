import { Address } from "@example-app/models/index.js"
import ApplicationPolicy from "@example-app/policies/application-policy.js"

export class AddressPolicies extends ApplicationPolicy<Address> {
  static modelClass = Address
  // TODO
}

export default AddressPolicies
