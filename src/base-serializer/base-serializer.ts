type SerializerConstructor<TRecord, TSerialized, TRestArgs extends unknown[]> = new (
  record: TRecord,
  ...restArgs: TRestArgs
) => BaseSerializer<TRecord, TSerialized>

export abstract class BaseSerializer<TRecord, TSerialized = unknown> {
  constructor(protected readonly record: TRecord) {}

  static perform<TRecord, TSerialized, TRestArgs extends unknown[]>(
    this: SerializerConstructor<TRecord, TSerialized, TRestArgs>,
    record: TRecord,
    ...restArgs: TRestArgs
  ): TSerialized

  static perform<TRecord, TSerialized, TRestArgs extends unknown[]>(
    this: SerializerConstructor<TRecord, TSerialized, TRestArgs>,
    records: TRecord[],
    ...restArgs: TRestArgs
  ): TSerialized[]

  static perform<TRecord, TSerialized, TRestArgs extends unknown[]>(
    this: SerializerConstructor<TRecord, TSerialized, TRestArgs>,
    recordOrRecords: TRecord | TRecord[],
    ...restArgs: TRestArgs
  ): TSerialized | TSerialized[] {
    if (Array.isArray(recordOrRecords)) {
      return recordOrRecords.map((record) => new this(record, ...restArgs).perform())
    }

    return new this(recordOrRecords, ...restArgs).perform()
  }

  protected requiredAssociation<TAssociation>(
    association: TAssociation | null | undefined,
    message: string
  ): TAssociation {
    if (association === null || association === undefined) {
      throw new Error(message)
    }

    return association
  }

  abstract perform(): TSerialized
}
