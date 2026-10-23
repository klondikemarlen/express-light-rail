import { BaseModel } from "@/base-model/index.js"

class TypedRecord extends BaseModel<{ id: number; name: string }> {
  declare id: number
  declare name: string

  static customStatic(): string {
    return "available"
  }
}

// Compiled by check-types; these consumer calls are not executed as database queries.
export async function scopedModelTypeContract(record: TypedRecord): Promise<string> {
  const scoped: typeof TypedRecord = TypedRecord.withScope("tenant", "visible")
  const fresh: TypedRecord = await record.reloadWithScope("visible")

  // @ts-expect-error Scope predicates must reference concrete model attributes.
  TypedRecord.withScope({ doesNotExist: "invalid" })
  // @ts-expect-error Reload scope predicates must reference concrete model attributes.
  await record.reloadWithScope({ doesNotExist: "invalid" })
  // @ts-expect-error A scoped reload returns a model instance, not raw attributes.
  await record.reloadWithScope(null, { raw: true })
  // @ts-expect-error A scoped reload returns one model, not an array.
  await record.reloadWithScope(null, { plain: false })

  return `${scoped.customStatic()}: ${fresh.name}`
}
