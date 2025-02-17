import { Model, InferAttributes, InferCreationAttributes } from "@sequelize/core"

export class Address extends Model<InferAttributes<Address>, InferCreationAttributes<Address>> {
  // minimal user class that needs to be extended?
}

export default Address
