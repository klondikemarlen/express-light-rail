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
  BeforeSave,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  ValidateAttribute,
} from "@sequelize/core/decorators-legacy"

import { hashPassword, verifyPassword } from "@example-app/lib/password.js"

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

  @Attribute(DataTypes.STRING)
  declare passwordHash: CreationOptional<string | null>

  @Attribute(DataTypes.VIRTUAL)
  @ValidateAttribute({
    validPassword(value: unknown) {
      if (value !== undefined && (typeof value !== "string" || value === "")) {
        throw new Error("password must be a non-empty string")
      }
    },
  })
  declare password: CreationOptional<string | undefined>

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  // Hooks
  @BeforeSave
  static async hashNewPassword(user: User): Promise<void> {
    const { password } = user
    if (password === undefined) return

    if (typeof password !== "string" || password === "") {
      throw new Error("password must be a non-empty string")
    }

    user.passwordHash = await hashPassword(password)
    user.setDataValue("password", undefined)
  }

  // Helper Methods
  async authenticate(password: string): Promise<User | false> {
    const passwordMatches = await verifyPassword(password, this.passwordHash)
    if (!passwordMatches) return false

    return this
  }
}
