// Disposable copy representing the common web/src/api/base-api.ts definitions.
export type ModelOrder =
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]

export type Policy = {
  show: boolean
  create: boolean
  update: boolean
  destroy: boolean
}

export type WhereOptions<Model, Attributes extends keyof Model> = {
  [K in Attributes]?: Model[K] | Model[K][]
}

export type FiltersOptions<Options = Record<never, never>> = Partial<Options>

export type QueryOptions<Where, Filters> = Partial<{
  where: Where
  filters: Filters
  order: ModelOrder[]
  page: number
  perPage: number
}>

export const MAX_PER_PAGE = 1000
