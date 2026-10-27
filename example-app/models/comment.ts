import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  type NonAttribute,
} from "@sequelize/core"

import { sequelize } from "@example-app/database.js"
import { Thread } from "@example-app/models/thread.js"
import { User } from "@example-app/models/user.js"

export class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
  declare id: CreationOptional<number>
  declare body: string
  declare authorId: number
  declare threadId: number

  declare author?: NonAttribute<User>
  declare thread?: NonAttribute<Thread>
}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    threadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Thread,
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "comments",
    timestamps: false,
  }
)
