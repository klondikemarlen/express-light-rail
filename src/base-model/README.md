# Base Model

`BaseModel` extends Sequelize's `Model` with concrete-model scope typing and a scoped primary-key lookup. Adopt it for one model at a time; host applications still own model initialization, attributes, associations, scopes, validation, transactions and database configuration.

`ModelClass.withScope(...)` preserves custom static methods and concrete record types. `record.reloadWithScope(scopes, options)` returns a **new** model instance using every primary-key attribute of the original record. It does not mutate the original instance. Use Sequelize's ordinary `record.reload()` when an in-place refresh is intended.

Scoped reloads always reject with Sequelize's `EmptyResultError` when the row is missing or excluded by the requested scope. Normal model lookup options such as transactions, attributes and includes are supported; raw results, replacement primary-key conditions and disabling the not-found rejection are not part of this API.

Scope selection is not authorization by itself. Hosts remain responsible for selecting the appropriate policy scope. Text search, slug lookup, batching, database-specific mutations and domain events do not belong in this base class.
