import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "@sequelize/core"

import { sequelize } from "@example-app/database.js"

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>
  declare username: string
  declare name: string
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notBlank(value: string) {
          if (value.trim() === "") {
            throw new Error("username must not be blank")
          }
        },
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notBlank(value: string) {
          if (value.trim() === "") {
            throw new Error("name must not be blank")
          }
        },
      },
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  }
)
