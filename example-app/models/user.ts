import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from "@sequelize/core"
import {
  Attribute,
  AutoIncrement,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  ValidateAttribute,
} from "@sequelize/core/decorators-legacy"

@Table({
  tableName: "users",
})
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  @NotNull
  @Unique
  @ValidateAttribute({
    notBlank(value: string) {
      if (value.trim() === "") {
        throw new Error("username must not be blank")
      }
    },
  })
  declare username: string

  @Attribute(DataTypes.STRING)
  @NotNull
  @ValidateAttribute({
    notBlank(value: string) {
      if (value.trim() === "") {
        throw new Error("name must not be blank")
      }
    },
  })
  declare name: string
}
