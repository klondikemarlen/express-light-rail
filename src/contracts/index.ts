export type { ChannelPacket, ChannelServerEvents } from "@/contracts/channel-packet.js"

export type ModelOrder =
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string]

export type WhereOptions<Model, Attributes extends keyof Model> = {
  [Attribute in Attributes]?: Model[Attribute] | Model[Attribute][]
}

type EmptyOptions = Record<never, never>

export type FiltersOptions<Options = EmptyOptions> = Partial<Options>

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

export type PaginationQuery = {
  page?: number
  perPage?: number
}

export type Pagination = {
  page: number
  perPage: number
  limit: number
  offset: number
}

export const DEFAULT_PER_PAGE = 10
export const MAX_PER_PAGE = 1000
export const MAX_PER_PAGE_EQUIVALENT = -1
