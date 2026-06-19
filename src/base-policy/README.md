# Base Policy

Policies keep authorization and attribute allow-lists out of controllers and services.

`BasePolicy` is intentionally close to the policy style used in WRAP, travel-authorization, and ELCC apps: instantiate with the current user and record, then ask predicate methods or serialize the policy into response metadata.

## Model-scoped policies

Use `PolicyFactory(Model)` when the policy owns a Sequelize model scope.

```ts
const UserPolicy = PolicyFactory<User, CurrentUser>(User)

export class UsersPolicy extends UserPolicy {
  static policyScope(currentUser: CurrentUser) {
    return {
      where: {
        organizationId: currentUser.organizationId,
      },
    }
  }
}
```

`Policy.applyScope(scopes, currentUser)` adds the policy scope to existing Sequelize scopes.

## Permitted attributes

Define `permittedAttributes()` and use `permitAttributesForCreate` / `permitAttributesForUpdate` before passing request bodies into services.

```ts
permittedAttributes() {
  return ["name", "email", "profile.title"]
}
```

Nested paths use `deepPick`, so controllers can accept larger request bodies without handing every field to the model layer.

## Response metadata

`toJSON()` exposes action predicates for the record. This is useful for index/show serializers that need policy state beside each record.
