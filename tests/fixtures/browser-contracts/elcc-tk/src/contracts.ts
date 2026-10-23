import {
  MAX_PER_PAGE,
  type FiltersOptions,
  type ModelOrder,
  type Policy,
  type QueryOptions,
  type WhereOptions,
} from "express-light-rail/contracts"

interface ProjectRow {
  id: number
  active: boolean
  category: "A" | "B"
}

type ProjectWhere = WhereOptions<ProjectRow, "id" | "active" | "category">
type ProjectFilters = FiltersOptions<{ assignedToMe: boolean }>
type ProjectQuery = QueryOptions<ProjectWhere, ProjectFilters>
type ProjectPolicy = Policy & { export: boolean }

const order: ModelOrder[] = [["category", "asc"], ["id", "desc"]]
const query: ProjectQuery = { where: { active: true }, filters: { assignedToMe: true }, order, perPage: MAX_PER_PAGE }
const policy: ProjectPolicy = { show: true, create: false, update: false, destroy: false, export: true }

// @ts-expect-error Unsupported tuple arities are not part of the common wire contract.
const unsupportedOrder: ModelOrder[] = [["a", "b", "c", "d", "e", "f", "g"]]
// @ts-expect-error Where values remain tied to the selected model fields.
const unsupportedValue: ProjectWhere = { active: "yes" }

void [query, policy, unsupportedOrder, unsupportedValue]
