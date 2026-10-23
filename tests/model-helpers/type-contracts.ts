import { Model } from "@sequelize/core"

import { reloadWithScope, withScope } from "@/model-helpers/index.js"

interface TypedRecordAttributes {
  id: number
  name: string
}

class TypedRecord extends Model<TypedRecordAttributes> {
  declare id: number
  declare name: string

  static customStatic(): string {
    return "available"
  }
}

function assertHelperTypeContracts(model: typeof TypedRecord, record: TypedRecord): void {
  const scopedModel: typeof TypedRecord = withScope(model, "active")
  const customStaticResult: string = scopedModel.customStatic()
  const inlineWhereScope = withScope(model, {
    where: { name: "Ada" },
  })
  const readonlyScopeList = withScope(model, ["active", { method: ["named", "Ada"] }])
  const multipleScopes = withScope(model, "active", { method: "named" })
  const unscopedModel = withScope(model, null)
  const optionalScope = withScope(model, undefined)
  const reloadedRecord: Promise<TypedRecord> = reloadWithScope(record, "active", {
    attributes: ["name"],
  })
  const inlineWhereReload: Promise<TypedRecord> = reloadWithScope(record, {
    where: { name: "Ada" },
  })
  const unscopedReload: Promise<TypedRecord> = reloadWithScope(record, null)

  // @ts-expect-error Bare WhereOptions objects are not runtime withScope inputs.
  withScope(model, { name: "Ada" })

  // @ts-expect-error Inline scope predicates must use declared model attributes.
  withScope(model, { where: { unknownColumn: "Ada" } })

  // @ts-expect-error Reload predicates must use declared model attributes.
  reloadWithScope(record, { where: { unknownColumn: "Ada" } })

  // @ts-expect-error Raw queries return attributes rather than model instances.
  reloadWithScope(record, "active", { raw: true })

  // @ts-expect-error Plain-false queries return arrays rather than one model.
  reloadWithScope(record, "active", { plain: false })

  // @ts-expect-error Inline raw scopes cannot preserve model instance methods.
  withScope(model, { raw: true })

  // @ts-expect-error Inline plain scopes cannot preserve array query results.
  withScope(model, { plain: true })

  // @ts-expect-error Inline plain-false scopes would change findOne into an array.
  withScope(model, { plain: false })

  void [
    customStaticResult,
    inlineWhereScope,
    readonlyScopeList,
    multipleScopes,
    unscopedModel,
    optionalScope,
    reloadedRecord,
    inlineWhereReload,
    unscopedReload,
  ]
}

void assertHelperTypeContracts
