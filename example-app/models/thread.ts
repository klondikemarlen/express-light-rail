import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "@sequelize/core"

import { sequelize } from "@example-app/database.js"
import { User } from "@example-app/models/user.js"

export class Thread extends Model<InferAttributes<Thread>, InferCreationAttributes<Thread>> {
  declare id: CreationOptional<number>
  declare title: string
  declare body: string
  declare authorId: number
}

Thread.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notBlank(value: string) {
          if (value.trim() === "") {
            throw new Error("title must not be blank")
          }
        },
      },
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notBlank(value: string) {
          if (value.trim() === "") {
            throw new Error("body must not be blank")
          }
        },
      },
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "threads",
    timestamps: false,
  }
)
