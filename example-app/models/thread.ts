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

import { User } from "@example-app/models/user.js"

@Table({
  tableName: "threads",
})
export class Thread extends Model<InferAttributes<Thread>, InferCreationAttributes<Thread>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  @NotNull
  @ValidateAttribute({
    notBlank(value: string) {
      if (value.trim() === "") {
        throw new Error("title must not be blank")
      }
    },
  })
  declare title: string

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

  @BelongsTo(() => User, {
    foreignKey: {
      name: "authorId",
      onDelete: "RESTRICT",
    },
    inverse: {
      type: "hasMany",
      as: "threads",
    },
  })
  declare author?: NonAttribute<User>
}
