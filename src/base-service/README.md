# Base Service

Services own business operations that are too large or too important to live in controllers.

```ts
export class CreateUserService extends BaseService<Promise<User>> {
  constructor(private readonly attributes: UserCreationAttributes) {
    super()
  }

  perform() {
    return User.create(this.attributes)
  }
}

const user = await CreateUserService.perform(attributes)
```

## Responsibilities

Services should:

- orchestrate multi-step mutations
- call models, integrations, and jobs
- expose one obvious `.perform(...)` entry point
- return domain values, not Express responses

Services should not:

- read from Express `Request` or write to `Response`
- perform authorization checks that belong in policies
- shape API response payloads that belong in serializers

## Naming

Prefer one service per action or operation. Names should describe the outcome:

- `CreateUserService`
- `SubmitTravelAuthorizationService`
- `SyncDirectoryEntriesService`

This matches the service conventions used in WRAP and travel-authorization while keeping plain TypeScript classes.
