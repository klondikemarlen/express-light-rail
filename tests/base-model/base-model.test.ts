import { DataTypes, EmptyResultError, Sequelize } from "@sequelize/core"
import { SqliteDialect } from "@sequelize/sqlite3"
import { expectTypeOf } from "vitest"

import { BaseModel } from "@/base-model/index.js"

interface ReloadRecordAttributes {
  id: number
  name: string
  visible: boolean
}

class ReloadRecord extends BaseModel<
  ReloadRecordAttributes,
  Omit<ReloadRecordAttributes, "id">
> {
  declare id: number
  declare name: string
  declare visible: boolean

  static findByName(name: string) {
    return this.findOne({ where: { name } })
  }
}

type ExpectFalse<T extends false> = T
type RawOptionIsRejected = ExpectFalse<
  { raw: true } extends NonNullable<
    Parameters<ReloadRecord["reloadWithScope"]>[1]
  >
    ? true
    : false
>

interface CompositeRecordAttributes {
  firstKey: number
  secondKey: number
  name: string
}

class CompositeRecord extends BaseModel<CompositeRecordAttributes> {
  declare firstKey: number
  declare secondKey: number
  declare name: string
}

const sequelize = new Sequelize({
  dialect: SqliteDialect,
  storage: ":memory:",
  logging: false,
  pool: {
    max: 1,
    idle: Infinity,
    maxUses: Infinity,
  },
})

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
    },
  },
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
  },
)

describe("BaseModel", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  test("when applying a scope, it preserves custom statics and concrete record types", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "Ada",
      visible: true,
    })

    // Act
    const scopedModel = ReloadRecord.withScope("visible")
    const foundRecord = await scopedModel.findByName("Ada")
    const reloadedRecord: ReloadRecord = await record.reloadWithScope("visible")

    // Assert
    expectTypeOf(scopedModel.findByName).toEqualTypeOf(ReloadRecord.findByName)
    expectTypeOf<RawOptionIsRejected>().toEqualTypeOf<false>()
    expect(foundRecord?.name).toBe("Ada")
    expect(reloadedRecord).toBeInstanceOf(ReloadRecord)
    expect(reloadedRecord).not.toBe(record)
  })

  test("when applying consecutive scopes, it combines every filter", async () => {
    // Arrange
    await ReloadRecord.bulkCreate([
      { name: "Ada", visible: true },
      { name: "Grace", visible: true },
      { name: "Ada", visible: false },
    ])

    // Act
    const records = await ReloadRecord.withScope("visible", "namedAda").findAll()

    // Assert
    expect(records).toMatchObject([
      {
        name: "Ada",
        visible: true,
      },
    ])
  })

  test("when a scope requests raw arrays, it still reloads one model instance", async () => {
    // Arrange
    const record = await ReloadRecord.create({ name: "Ada", visible: true })

    // Act
    const reloaded = await record.reloadWithScope("rawArray")

    // Assert
    expect(reloaded.getDataValue("name")).toBe("Ada")
  })

  test("when reloading a single-key record, it returns fresh scoped state", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "before",
      visible: true,
    })
    await ReloadRecord.update(
      { name: "after" },
      { where: { id: record.id } },
    )

    // Act
    const reloadedRecord = await record.reloadWithScope("visible")

    // Assert
    expect(reloadedRecord).not.toBe(record)
    expect(reloadedRecord.name).toBe("after")
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
      },
    )

    // Act
    const reloadedRecord = await record.reloadWithScope(null)

    // Assert
    expect(reloadedRecord).not.toBe(record)
    expect(reloadedRecord.name).toBe("after")
    expect(record.name).toBe("before")
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
        },
      )

      const reloadedRecord = await record.reloadWithScope("visible", {
        transaction,
        attributes: ["name"],
      })

      // Assert
      expect(reloadedRecord.name).toBe("inside transaction")
      expect(reloadedRecord.getDataValue("visible")).toBeUndefined()
      expect(record.name).toBe("before")
    })
  })

  test("when the scope excludes a record, it rejects instead of returning null", async () => {
    // Arrange
    const record = await ReloadRecord.create({
      name: "hidden",
      visible: false,
    })

    // Act
    const reload = record.reloadWithScope("visible")

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
    const reload = record.reloadWithScope("visible")

    // Assert
    await expect(reload).rejects.toBeInstanceOf(EmptyResultError)
  })
})
