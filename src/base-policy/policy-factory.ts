import { type ScopeOptions } from "@sequelize/core"

// See api/node_modules/sequelize/types/model.d.ts -> Model -> scope
export type BaseScopeOptions = string | ScopeOptions
