// Disposable copy representing web/src/api/base-api.ts before adoption.
export type ModelOrder =
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]

export type WhereOptions<Model, Attributes extends keyof Model> = {
  [K in Attributes]?: Model[K] | Model[K][]
}

export type FiltersOptions<Options> = Partial<Options>

export type QueryOptions<Where, Filters> = Partial<{
  where: Where
  filters: Filters
  order: ModelOrder[]
  page: number
  perPage: number
}>

export type Policy = {
  show: boolean
  create: boolean
  update: boolean
  destroy: boolean
}

export const MAX_PER_PAGE = 1000
