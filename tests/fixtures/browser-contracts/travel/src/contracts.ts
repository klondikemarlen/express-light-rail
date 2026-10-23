import {
  MAX_PER_PAGE,
  type FiltersOptions,
  type ModelOrder,
  type Policy,
  type QueryOptions,
  type WhereOptions,
} from "express-light-rail/contracts"

interface TravelRecord {
  id: number
  status: "draft" | "approved"
  confidential: boolean
}

type TravelWhere = WhereOptions<TravelRecord, "id" | "status">
type TravelFilters = FiltersOptions<{ includeArchived: boolean }>
type TravelQuery = QueryOptions<TravelWhere, TravelFilters>
type TravelPolicy = Policy & { approve: boolean }

const order: ModelOrder[] = [["status", "asc"], ["id", "desc"]]
const where: TravelWhere = { id: [1, 2], status: "draft" }
const query: TravelQuery = { where, filters: { includeArchived: false }, order, page: 1, perPage: MAX_PER_PAGE }
const policy: TravelPolicy = { show: true, create: false, update: true, destroy: false, approve: true }

// @ts-expect-error Query where keys must exist on the host model.
const unsupportedField: TravelWhere = { missing: "value" }
// @ts-expect-error Shared policy has only the four common action keys.
const unsupportedPolicy: Policy = { show: true, create: true, update: true, destroy: false, approve: true }

void [query, policy, unsupportedField, unsupportedPolicy]
