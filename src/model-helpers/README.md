# Model Helpers

Use `withScope(ModelClass, ...scopes)` and `reloadWithScope(record, scopes, options)` with an existing initialized Sequelize model. They do not require a new superclass or own model initialization, attributes, associations, validation, transactions or database configuration.

For an initialized host `User` model and an existing `user` record:

```ts
import { reloadWithScope, withScope } from "express-light-rail"

const visibleUsers = withScope(User, "tenant", "visible")
const users = await visibleUsers.findAll()
const refreshedUser = await reloadWithScope(user, {
  where: { active: true },
})
```

`withScope` retains custom static methods and concrete model types while forwarding native named scopes, method scopes, arrays and consecutive scope arguments. Inline scopes use Sequelize options such as `{ where: { active: true } }`, not bare predicates such as `{ active: true }`.

`reloadWithScope` queries every primary-key attribute of its input and returns a **new** model instance. It leaves the supplied record unchanged. Use Sequelize's ordinary `record.reload()` when an in-place refresh is intended. Missing or scope-excluded rows reject with Sequelize's `EmptyResultError`.

Transactions, attribute projections and includes remain native lookup options. The helper always requests one model instance: raw/array results, replacement primary-key conditions and disabling the not-found rejection are excluded from its typed options. Host query hooks remain enabled; a hook that changes the result into raw attributes or an array causes a descriptive `TypeError`, rather than a misleading model result.

Inline scopes exclude result-shaping `raw: true` and `plain: true` options. Named scopes remain host-owned Sequelize definitions. Reload projections always retain primary-key attributes so the helper can reject a different record returned by a query hook.

Scope selection is not authorization by itself. Hosts choose the appropriate policy scope; client filters must only narrow it. Text search, slug lookup, batching, database-specific mutations and domain events remain separate concerns.
