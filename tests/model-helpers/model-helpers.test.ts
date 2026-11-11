import { DataTypes, EmptyResultError, Model, Sequelize, type ModelStatic } from "@sequelize/core"
import { PostgresDialect } from "@sequelize/postgres"

import { reloadWithScope, withScope } from "@/model-helpers/index.js"

import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  NODE_ENV,
} from "@example-app/config.js"
import { initialize as ensureDatabase } from "@example-app/initializers/10-ensure-database.js"

interface ReloadRecordAttributes {
  id: number
  name: string
  visible: boolean
}

class ReloadRecord extends Model<ReloadRecordAttributes, Omit<ReloadRecordAttributes, "id">> {
  declare id: number
  declare name: string
  declare visible: boolean

  static findByName(name: string) {
    return this.findOne({ where: { name } })
  }
}

interface CompositeRecordAttributes {
  firstKey: number
  secondKey: number
  name: string
}

class CompositeRecord extends Model<CompositeRecordAttributes> {
  declare firstKey: number
  declare secondKey: number
  declare name: string
}

function createTestDatabase() {
  if (NODE_ENV !== "test" || !DATABASE_NAME.endsWith("_test")) {
    throw new Error("Model helper tests require NODE_ENV=test and a DB_NAME ending in _test")
  }

  return new Sequelize({
    dialect: PostgresDialect,
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    database: DATABASE_NAME,
    user: DATABASE_USERNAME,
    password: DATABASE_PASSWORD,
    logging: false,
  })
}

const sequelize = createTestDatabase()

ReloadRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "reload_records",
    timestamps: false,
    scopes: {
      visible: {
        where: { visible: true },
      },
      namedAda: {
        where: { name: "Ada" },
      },
      rawArray: {
        raw: true,
        plain: false,
      },
      nameOnly: {
        attributes: ["name"],
      },
    },
  }
)

CompositeRecord.init(
  {
    firstKey: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    secondKey: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "composite_records",
    timestamps: false,
  }
)

describe("model helpers", () => {
  beforeAll(ensureDatabase)

  beforeEach(async () => {
    await ReloadRecord.sync({ force: true })
    await CompositeRecord.sync({ force: true })
  })

  afterAll(async () => {
    await CompositeRecord.drop()
    await ReloadRecord.drop()
    await sequelize.close()
  })

  test("when applying a scope, it preserves custom statics", async () => {
    // Arrange
    await ReloadRecord.create({
      name: "Ada",
      visible: true,
    })

    // Act
    const scopedModel = withScope(ReloadRecord, "visible")
    const foundRecord = await scopedModel.findByName("Ada")

    // Assert
    expect(foundRecord?.name).toBe("Ada")
  })

  test("when applying consecutive scopes, it combines every filter", async () => {
    // Arrange
    await ReloadRecord.bulkCreate([
      { name: "Ada", visible: true },
      { name: "Grace", visible: true },
      { name: "Ada", visible: false },
    ])

    // Act
    const records = await withScope(ReloadRecord, "visible", "namedAda").findAll()

    // Assert
    expect(records).toMatchObject([
      {
        name: "Ada",
        visible: true,
      },
    ])
  })

  test("when a model customizes scopes, it preserves host-owned filtering", async () => {
    // Arrange
    const database = createTestDatabase()

    try {
      class HostScopedRecord extends Model<{ identifier: number; visible: boolean }> {
        declare identifier: number
        declare visible: boolean

        static withScope<TModel extends Model>(
          this: ModelStatic<TModel>,
          ...scopes: Parameters<typeof Model.withScope>
        ): ModelStatic<TModel> {
          return Reflect.apply(Model.withScope, this, ["visible", ...scopes]) as ModelStatic<TModel>
        }
      }

      HostScopedRecord.init(
        {
          identifier: { type: DataTypes.INTEGER, primaryKey: true },
          visible: { type: DataTypes.BOOLEAN, allowNull: false },
        },
        {
          sequelize: database,
          timestamps: false,
          scopes: { visible: { where: { visible: true } } },
        }
      )
      await database.sync()
      await HostScopedRecord.bulkCreate([
        { identifier: 1, visible: false },
        { identifier: 2, visible: true },
      ])

      // Act
      const records = await withScope(HostScopedRecord, null).findAll()

      // Assert
      expect(records).toMatchObject([
        {
          identifier: 2,
          visible: true,
        },
      ])
    } finally {
      await database.drop()
      await database.close()
    }
  })

  test("when passing an inline where scope, it applies the predicate", async () => {
    // Arrange
    await ReloadRecord.bulkCreate([
      { name: "visible", visible: true },
      { name: "hidden", visible: false },
    ])

    // Act
    const records = await withScope(ReloadRecord, {
      where: { visible: true },
    }).findAll()

    // Assert
    expect(records).toMatchObject([
      {
        name: "visible",
        visible: true,
      },
    ])
  })

  test("when a scope requests raw arrays, it still reloads one model instance", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "Ada", visible: true })

    // Act
    const reloaded = await reloadWithScope(record, "rawArray")

    // Assert
    expect(reloaded.getDataValue("name")).toBe("Ada")
  })

  test("when an init-configured query hook returns raw arrays, reload rejects the result shape", async () => {
    // Arrange
    const hookSequelize = createTestDatabase()

    try {
      class HookedRecord extends Model<ReloadRecordAttributes, Omit<ReloadRecordAttributes, "id">> {
        declare id: number
        declare name: string
        declare visible: boolean
      }

      HookedRecord.init(
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          name: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          visible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
          },
        },
        {
          sequelize: hookSequelize,
          tableName: "hooked_records",
          timestamps: false,
          hooks: {
            beforeFindAfterOptions(options) {
              options.raw = true
              Object.assign(options, { plain: false })
            },
          },
        }
      )
      await HookedRecord.sync()
      const record = await HookedRecord.create({
        name: "Ada",
        visible: true,
      })

      // Act
      const reload = reloadWithScope(record, null)

      // Assert
      await expect(reload).rejects.toThrow(
        "reloadWithScope expected a model instance, but a model hook changed the find result shape."
      )
    } finally {
      await hookSequelize.drop()
      await hookSequelize.close()
    }
  })

  test("when reloading a single-key record, it returns fresh scoped state", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "before",
      visible: true,
    })
    await ReloadRecord.update({ name: "after" }, { where: { id: record.id } })

    // Act
    const reloadedRecord = await reloadWithScope(record, "visible")

    // Assert
    expect(reloadedRecord.get()).toEqual({ id: record.id, name: "after", visible: true })
  })

  test("when reloading a record, it returns a distinct model instance", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "Ada", visible: true })

    // Act
    const reloadedRecord = await reloadWithScope(record, "visible")

    // Assert
    expect(reloadedRecord).not.toBe(record)
  })

  test("when reloading changed persisted state, it leaves the original instance unchanged", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "before", visible: true })
    await ReloadRecord.update({ name: "after" }, { where: { id: record.id } })

    // Act
    await reloadWithScope(record, "visible")

    // Assert
    expect(record.name).toBe("before")
  })

  test("when reloading a composite-key record, it matches every primary-key column", async () => {
    // Arrange
    await CompositeRecord.create({
      firstKey: 10,
      secondKey: 21,
      name: "decoy",
    })
    const record = await CompositeRecord.create({
      firstKey: 10,
      secondKey: 20,
      name: "before",
    })
    await CompositeRecord.update(
      { name: "after" },
      {
        where: {
          firstKey: 10,
          secondKey: 20,
        },
      }
    )

    // Act
    const reloadedRecord = await reloadWithScope(record, null)

    // Assert
    expect(reloadedRecord.get()).toEqual({ firstKey: 10, secondKey: 20, name: "after" })
  })

  test("when passing lookup options, it preserves transaction and attribute selection", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "before",
      visible: true,
    })

    // Act
    await sequelize.transaction(async (transaction) => {
      await ReloadRecord.update(
        { name: "inside transaction" },
        {
          where: { id: record.id },
          transaction,
        }
      )

      const reloadedRecord = await reloadWithScope(record, "visible", {
        transaction,
        attributes: ["name"],
      })

      // Assert
      expect(reloadedRecord.get()).toEqual({ id: record.id, name: "inside transaction" })
    })
  })

  test("when a named scope selects attributes, reload retains its projection and identity", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "Ada", visible: true })

    // Act
    const reloaded = await reloadWithScope(record, "nameOnly")

    // Assert
    expect(reloaded.get()).toEqual({ id: record.id, name: "Ada" })
  })

  test("when an inline scope excludes attributes, reload retains only its projection and identity", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "Ada", visible: true })

    // Act
    const reloaded = await reloadWithScope(record, { attributes: { exclude: ["id", "visible"] } })

    // Assert
    expect(reloaded.get()).toEqual({ id: record.id, name: "Ada" })
  })

  test("when the scope excludes a record, it rejects instead of returning null", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "hidden",
      visible: false,
    })

    // Act
    const reload = reloadWithScope(record, "visible")

    // Assert
    await expect(reload).rejects.toBeInstanceOf(EmptyResultError)
  })

  test("when the row has been deleted, it rejects instead of returning null", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "deleted",
      visible: true,
    })
    await record.destroy()

    // Act
    const reload = reloadWithScope(record, "visible")

    // Assert
    await expect(reload).rejects.toBeInstanceOf(EmptyResultError)
  })

  test("when a host query hook replaces identity, reload rejects the different record", async () => {
    // Arrange
    const database = createTestDatabase()
    try {
      class HookedRecord extends Model<ReloadRecordAttributes> {}
      HookedRecord.init(
        {
          id: { type: DataTypes.INTEGER, primaryKey: true },
          name: { type: DataTypes.STRING },
          visible: { type: DataTypes.BOOLEAN },
        },
        {
          sequelize: database,
          timestamps: false,
          hooks: {
            beforeFindAfterOptions(options) {
              options.where = { id: 2 }
            },
          },
        }
      )
      await database.sync()
      const record = await HookedRecord.create({ id: 1, name: "original", visible: true })
      await HookedRecord.create({ id: 2, name: "different", visible: true })

      // Act
      const reload = reloadWithScope(record, null)

      // Assert
      await expect(reload).rejects.toThrow("reloadWithScope expected the original primary key")
    } finally {
      await database.drop()
      await database.close()
    }
  })
})
