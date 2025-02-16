import { Model, InferAttributes, InferCreationAttributes } from "@sequelize/core"

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  // minimal user class that needs to be extended?
}

export default User
