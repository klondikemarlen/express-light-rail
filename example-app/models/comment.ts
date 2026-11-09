import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
  type NonAttribute,
} from "@sequelize/core"
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  NotNull,
  PrimaryKey,
  Table,
  ValidateAttribute,
} from "@sequelize/core/decorators-legacy"

import { Thread } from "@example-app/models/thread.js"
import { User } from "@example-app/models/user.js"

@Table({
  tableName: "comments",
})
export class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>

  @Attribute(DataTypes.TEXT)
  @NotNull
  @ValidateAttribute({
    notBlank(value: string) {
      if (value.trim() === "") {
        throw new Error("body must not be blank")
      }
    },
  })
  declare body: string

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare authorId: number

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare threadId: number

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  @BelongsTo(() => User, {
    foreignKey: {
      name: "authorId",
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
    },
    inverse: {
      type: "hasMany",
      as: "comments",
    },
  })
  declare author?: NonAttribute<User>

  @BelongsTo(() => Thread, {
    foreignKey: {
      name: "threadId",
      onDelete: "CASCADE",
      onUpdate: "NO ACTION",
    },
    inverse: {
      type: "hasMany",
      as: "comments",
    },
  })
  declare thread?: NonAttribute<Thread>
}
